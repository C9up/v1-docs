# Hubs

This guide covers SignalR hubs:

- Guarding a hub
- Invocation arguments
- What is not supported
- The wire

![Hubs across several instances. Four SignalR clients, two over WebSocket and two over Server-Sent Events, reach Instance A or Instance B through a load balancer with sticky sessions on the hub paths. A ChatHub on Instance A runs ctx.group('room-1').send('message', data): Instance A delivers it to the clients it holds and publishes it on the Redis bus (transports.redis({ connection: 'main' })); Instance B receives it from the bus and delivers it to its own clients, so the group's members on both instances get the message. ctx.send() answers the calling client, which is always local.](/images/hubs-en.webp){width=640 height=640 loading=lazy}

## Hubs (SignalR)

A `Hub` is the bidirectional half: the client invokes methods on the server, the
server pushes to one client, a group, or everyone. Mount it from a preload
(`start/services.ts`), the same place `registerRoutes()` is called — each
declaration mounts its route **at the moment it is written**, so before the
server starts listening:

```ts
import relay from '@c9up/relay/services/main'
import { Hub, type HubContext } from '@c9up/relay'

class ChatHub extends Hub {
  // `onSendMessage` handles the `sendMessage` invocation: the method name
  // after `on`, matched without regard to case.
  async onSendMessage(ctx: HubContext, data: unknown) {
    ctx.group('room-1').send('message', data)
  }
}

relay.hub('/hubs/chat', new ChatHub())
```

`onConnect` runs once the client's handshake has been answered — a frame sent
before the handshake reply makes the SignalR client refuse the connection. A
method's return value is what the client's `invoke()` resolves with.

A stream that has not completed the handshake within `handshakeTimeoutMs`
(default 15 s, the client's own) is closed, and past `maxConnections` open
streams (default 10 000) a new one is refused with 503. One owner — a user, or
the client address of an anonymous request — may hold `maxConnectionsPerOwner`
streams (default 20) and `maxPendingTokensPerOwner` negotiated tokens not yet
attached (default 20); a full token table refuses a new negotiate with 503
rather than dropping somebody else's token. All are options of the adapter
passed as the third argument:

```ts
import { SignalRAdapter } from '@c9up/relay'

const hub = new ChatHub()
relay.hub('/hubs/chat', hub, new SignalRAdapter(hub, { handshakeTimeoutMs: 10_000, maxConnections: 2_000 }))
```

### Guarding a hub

`useGuards` applies to every invocation on the hub:

```ts
class AdminHub extends Hub {
  constructor() {
    super()
    this.useGuards({ guards: ['session'], roles: ['admin', 'owner'], permissions: ['chat.moderate'] })
  }
}
```

Each invocation is checked against the request that carries it — every one
arrives on its own POST — not against the request that opened the stream: a
role revoked since then stops working on the next call, and one granted works
without reconnecting. `ctx.auth` in the method is that same request's. A POST
must come from the user the stream was opened by, and a stream opened
anonymously takes anonymous POSTs only (`403 E_RELAY_NOT_OWNER`). A token's
first use — the stream, the socket or a POST — is held to whoever negotiated
it: a token read in a log before its owner connects opens nothing.

Over WebSockets a connection has one request, its handshake, so every
invocation on the socket is checked against the handshake's auth: a role
revoked mid-connection takes effect on the next connection, as with ASP.NET
Core SignalR's WebSocket transport.

`guards` names the guards the request may have authenticated through — what
Warden reports as `auth.authenticatedViaGuard`. `roles` is satisfied by **any**
of the names, `permissions` by **all** of them.
The asymmetry is deliberate and is the same split the HTTP pipeline, the RPC
router and the GraphQL engine use: a role names who someone is — an admin *or*
an owner may act — while a permission names what an action needs, and it needs
all of them.

`onConnect` / `onDisconnect` are lifecycle hooks and are not invocable.
Mounting the same path twice throws rather than replacing the first hub.

### Invocation arguments

A hub method receives **every** argument the client sent:

```ts
class MathHub extends Hub {
  async onSum(ctx: HubContext, a: number, b: number, c: number) {
    return a + b + c
  }
}

// client: await connection.invoke('Sum', 1, 2, 3)   // → 6
```

A method declaring one parameter is unaffected — the extras are simply ignored,
as in any JavaScript call. Only the first argument used to be passed, and the
rest went nowhere without anything reporting it.

The name is matched without regard to case, as SignalR clients expect:
`invoke('Sum')`, `invoke('sum')` and `invoke('SUM')` all reach `onSum`. Two
methods whose names differ only by case answer the same invocation, so the hub
refuses to construct.

### What is not supported

Streaming is not implemented. A `StreamInvocation` gets an **error Completion**
naming the reason, rather than being dropped: the invocation id is the handle
the client's observable waits on, and the protocol promises a Completion, so a
dropped one leaves the observable pending for the lifetime of the connection.

`StreamItem` and `CancelInvocation` are ignored, which is the correct response
for both — an item belongs to a stream whose opening invocation was already
refused, and a cancel targets a stream that was never started.

### The wire

Two first-class SignalR transports, so a stock `@microsoft/signalr` client
speaks to a hub unchanged, whichever it picks:

| Route | Role |
|---|---|
| `POST <path>/negotiate` | issues a `connectionId` + `connectionToken`, and the transports on offer |
| `WS <path>?id=<token>` | **WebSockets**: one socket, frames both ways |
| `GET <path>?id=<token>` | **Server-Sent Events**: the stream, server → client |
| `POST <path>?id=<token>` | SSE's upstream: framed messages, client → server |

`negotiate` announces only the transports the server can actually serve:
WebSockets first — SignalR tries them in order — when the server under the
application can upgrade (`server.supportsWebSockets()`, true once ream's
native server is listening), Server-Sent Events always. Advertising
WebSockets while nothing can upgrade would send every client down a road that
dead-ends. The socket and the SSE stream share the hub's path: ream hands a
WebSocket handshake to the WebSocket route and a plain GET to the stream.

The socket carries the JSON protocol's text frames; a binary message is
refused with close code `1003`. ream's limits apply to it (`config/app.ts` →
`http.webSocket`, see [WebSockets](/en/guides/realtime/websockets#limits)), and SignalR's own frame limit (`maxFrameSize`, 64 KiB)
inside them. On shutdown every socket is closed with `1001`.

The route customizer passed to `registerRoutes()` applies to every hub route,
the WebSocket one included — an `auth` middleware refuses the handshake before
any socket opens.
