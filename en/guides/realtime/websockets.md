# WebSockets

This guide covers WebSocket routes:

- Declaring a WebSocket route
- The handshake decides
- The socket
- Limits
- Testing a WebSocket route
- Errors
- WebSockets

ream's native server accepts WebSocket connections on routes you declare like
any other, behind the same middleware and guards. On top of that, three
packages speak a protocol over the socket for you:

| You want | Use |
|---|---|
| Your own messages, your own format | [`router.ws()`](/en/guides/realtime/websockets#declaring-a-websocket-route), below |
| Request / response calls to server methods | [JSON-RPC over a WebSocket](/en/guides/apis/json-rpc#over-a-websocket) with the `RpcRouter`, and [comet's WebSocket transport](/en/guides/apis/json-rpc-clients#over-a-websocket) as the client |
| Hubs, groups and broadcasts, with a stock SignalR client | [relay hubs](/en/guides/realtime/hubs#the-wire), which pick WebSockets when the server can upgrade |

![The life of a WebSocket connection. Handshake: the client sends a GET with Upgrade: websocket; the native server refuses a malformed handshake with 400, a version other than 13 with 426 and an origin it does not allow with 403; then the route, its middleware and guards run (router.ws, .use(middleware.auth()) answering 401 as plain HTTP); a refusal is a plain HTTP answer and no socket opens; once the handler is reached the request is answered 101 Switching Protocols and the handler gets ctx.socket and the handshake's ctx.auth. Open: socket.send(data) and socket.on('message'); a message over maxMessageSize closes with 1009, a client too slow for maxBufferedBytes with 1013, silence for idleTimeout with 1001. Close: socket.close(code, reason); on shutdown every socket is closed with 1001 and has 5 seconds to finish.](/images/websocket-en.webp){width=640 height=640 loading=lazy}

## Declaring a WebSocket route

`router.ws()` declares a route that accepts WebSocket connections. It is a GET
route like any other — it takes `.as()`, `.use()`, `.middleware()`, groups and
prefixes — and its handler receives the context with a `socket` on it:

```typescript
// start/routes.ts
import router from '@c9up/ream/services/router'

router.ws('/chat/:room', ({ socket, params, auth }) => {
  socket.send(JSON.stringify({ joined: params.room, user: auth.user?.id }))

  socket.on('message', (data, isBinary) => {
    // data: a string for a text message, a Uint8Array for a binary one
    socket.send(data)
  })

  socket.on('close', (code, reason) => {
    // the client left, the connection dropped (1006), or the server closed it
  })
}).use(middleware.auth())
```

Attach the listeners in the handler: messages can arrive as soon as the
handshake completes, and one with no `message` listener is dropped.

A path can carry a GET route and a WebSocket route at once: the handshake goes
to `router.ws()`, a plain GET to `router.get()`, whatever the order they were
declared in. A SignalR hub does it — its Server-Sent Events stream and its
socket share the URL. Two WebSocket routes on one path are refused
(`E_DUPLICATE_ROUTE`), as two GET routes are.

## The handshake decides

A WebSocket connection starts as an HTTP request, the handshake. Everything a
route does with a request happens to it, **before any socket exists**:

1. The server itself refuses, before routing, a malformed handshake (`400
   E_WEBSOCKET_BAD_HANDSHAKE`), a WebSocket version other than 13 (`426
   E_WEBSOCKET_VERSION`), and a browser `Origin` it does not allow (`403
   E_WEBSOCKET_ORIGIN`, see [Origins](/en/guides/realtime/websockets#origins)).
2. The route is matched, then its middleware and guards run. A client the auth
   middleware refuses gets its `401` as a plain HTTP answer and never an open
   connection.
3. Only once the handler is reached is the request answered `101 Switching
   Protocols`. A handler that throws answers like any other route, and no
   socket opens.

A plain GET to a WebSocket route is answered `426 E_WEBSOCKET_UPGRADE_REQUIRED`
with `Upgrade: websocket`. A WebSocket route reached on a server that cannot
hold WebSockets is answered `501 E_WEBSOCKET_UNSUPPORTED`.

### Auth lasts for the connection

A socket has one request: its handshake. The `ctx` the handler receives —
`ctx.auth`, the session, `ctx.params` — is that request's for as long as the
socket stays open, so a role removed while the user is connected only counts
from their next connection. When a user signs out or loses access, close their
sockets yourself:

```typescript
import type { ServerWebSocket } from '@c9up/ream'

const sockets = new Map<string, Set<ServerWebSocket>>()

router.ws('/notifications', ({ socket, auth }) => {
  const id = String(auth.user?.id)
  const mine = sockets.get(id) ?? new Set()
  mine.add(socket)
  sockets.set(id, mine)
  socket.on('close', () => mine.delete(socket))
}).use(middleware.auth())

// on sign-out
for (const socket of sockets.get(userId) ?? []) socket.close(1008, 'signed out')
```

## The socket

| On `socket` | |
|---|---|
| `send(data)` | A string goes as text, a `Uint8Array` as binary. `false` when the socket is closing, or when the message would take the client's backlog past `maxBufferedBytes` — the connection is then closed with `1013` instead of buffering for a client that does not read. |
| `close(code?, reason?)` | Closes once what is queued has been written. `code` is `1000` (default), `1001`–`1014`, or `3000`–`4999`; `reason` at most 123 bytes (otherwise `E_WEBSOCKET_CLOSE_CODE`, `E_WEBSOCKET_CLOSE_REASON`). |
| `on('message' \| 'close', listener)`, `off(...)` | A listener that throws is reported, never allowed to take the process down. |
| `closed` | A promise of `{ code, reason }`: the client's close code, the server's, or `1006` when the connection dropped. |
| `bufferedAmount`, `readyState` | Bytes waiting for the client; `open`, `closing` or `closed`. |
| `acceptProtocol(name)`, `protocol`, `offeredProtocols` | Choose, in the handler, one of the subprotocols the client offered (`Sec-WebSocket-Protocol`). Naming one it did not offer is `E_WEBSOCKET_PROTOCOL`. |

`server.supportsWebSockets()` (from `@c9up/ream/services/server`) says whether
the server under the application accepts WebSocket connections: `true` once
ream's native server is listening, `false` before it starts, after it stops,
and on a host without the WebSocket primitives. A package asks it before it
offers a WebSocket transport, as relay does.

## Limits

Every connection is bounded before your code sees a byte. The limits live in
the `http.webSocket` block of `config/app.ts`; the values below are the
defaults:

```typescript
// config/app.ts
export const http = {
  webSocket: {
    maxMessageSize: '1mb',     // largest incoming message
    maxFrameSize: '1mb',       // largest incoming frame
    idleTimeout: 60_000,       // ms of silence before the connection is closed; 0 never
    maxBufferedBytes: '4mb',   // what may wait for a client that reads slowly
    allowedOrigins: [],        // browser origins besides the request's own; ['*'] for any
  },
}
```

| What happens | The server |
|---|---|
| A message or a frame over its limit | closes the connection with `1009` |
| No traffic for `idleTimeout` | pings at half the timeout, closes with `1001` at the end |
| A client that stops reading | closes with `1013` once `maxBufferedBytes` would be passed — nothing past it is ever held in memory |
| Your handlers fall behind | stops reading the socket until they catch up, so a fast client cannot fill the server's memory |
| The application shuts down | closes every socket with `1001` and waits up to 5 seconds for them to finish |

A WebSocket counts toward `http.maxConnections` for as long as it is open (see
[Configuration](/en/start/configuration)). A size limit of `0` bytes is refused
when the server starts (`E_INVALID_WEBSOCKET_CONFIG`).

### Origins

A browser sends the site's cookies with a WebSocket handshake from any page,
and WebSockets are not covered by the same-origin policy: without a check, any
site a signed-in user visits could open a socket in their name (cross-site
WebSocket hijacking). So by default only the request's own origin is accepted.
List the others in `allowedOrigins`:

```typescript
webSocket: {
  allowedOrigins: ['https://app.example.com', 'https://admin.example.com'],
}
```

A client that is not a browser sends no `Origin` and is not affected; its
access is what the route's middleware and guards decide.

### Not offered

WebSocket over HTTP/2 (RFC 8441) is not offered: browsers open WebSockets over
HTTP/1.1. `permessage-deflate` compression is not negotiated. The server passes
the [Autobahn](https://github.com/crossbario/autobahn-testsuite) conformance
suite without compression.

## Testing a WebSocket route

`TestClient.ws()` opens a socket on the booted application, with the client's
default headers. Messages queue until a test reads them; a refused handshake
rejects with `errors.E_TEST_CLIENT_WEBSOCKET_REFUSED`, which carries the status.

```typescript
import { errors } from '@c9up/ream'

const socket = await client.ws('/chat/general', { headers: { cookie } })
socket.send('hi')
expect(await socket.next()).toBe('hi')
socket.close()

await expect(client.ws('/chat/general')).rejects.toBeInstanceOf(errors.E_TEST_CLIENT_WEBSOCKET_REFUSED)
```

## Errors

Every WebSocket error code, with its status, is in the
[error index](/en/reference/errors#websocket-errors).

## WebSockets

`router.ws()` declares a route that accepts WebSocket connections. It is a GET
route like any other — groups, prefixes, names and middleware apply — and the
middleware and guards run on the handshake, before any socket opens:

```typescript
router.ws('/chat/:room', ({ socket, params }) => {
  socket.on('message', (data) => socket.send(data))
}).use(middleware.auth())
```

The socket, its limits, origins and testing are in
[WebSockets](/en/guides/realtime/websockets).

## Next Steps
- [JSON-RPC over a WebSocket](/en/guides/apis/json-rpc#over-a-websocket) — the `RpcRouter`'s methods on a socket
- [comet](/en/guides/apis/json-rpc-clients#over-a-websocket) — the JSON-RPC client's WebSocket transport, browser and Node
- [relay](/en/guides/realtime/broadcasting) — hubs, groups and broadcasts across instances
- [Routing](/en/guides/basics/routing) — groups, prefixes and named routes, which WebSocket routes share
