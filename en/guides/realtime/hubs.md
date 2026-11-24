# Hubs

This guide covers SignalR hubs:

- Guarding a hub
- Ending a connection
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

A connection's messages run one after another, in the order the client sent
them. A client that sends faster than your methods answer builds a backlog on
the server, and that backlog is bounded: past `maxQueuedMessages` messages
waiting (default 256), a socket is closed with code `1013` and an upstream
POST is refused with `429 E_RELAY_MAX_QUEUED`. What was waiting is dropped.

Every message counts, including the ones packed into a single WebSocket
message or a single POST. The SignalR client packs together the calls made
while a send is in flight, so a client that fires more than 256 invocations
without awaiting any of them is closed. Raise `maxQueuedMessages` for such a
client, or have it await.

### Guarding a hub

`useGuards` states what it takes to **connect** to the hub:

```ts
class AdminHub extends Hub {
  constructor() {
    super()
    this.useGuards({ guards: ['session'], roles: ['admin', 'owner'], permissions: ['chat.moderate'] })
  }
}
```

The hub's own routes ask the guards. You mount nothing else for them to
apply, and the order of your declarations does not matter.

| Where the guards are asked | What a refused client gets |
|---|---|
| `POST <path>/negotiate` | `401` or `403`, and no connection token |
| The stream (`GET <path>`) and the WebSocket handshake | `401` or `403`, and no stream or socket |
| Every invocation | an `error` event and an error Completion, then the connection is closed |

`401 E_RELAY_UNAUTHORIZED` answers a request that is not authenticated, or not
through one of `guards`. `403 E_RELAY_FORBIDDEN` answers an authenticated user
without the role or the permissions.

A refused client is never registered on the hub. `onConnect` does not run for
it, and it receives no `ctx.broadcast()` and no group send.

The guards read `ctx.auth`, so a middleware must fill it before the hub's
routes run: a global one that authenticates without refusing, such as Warden's
`silentAuth`. When nothing fills `ctx.auth`, every request is anonymous and a
guarded hub refuses everyone.

`guards` names the guards the request may have authenticated through — what
Warden reports as `auth.authenticatedViaGuard`. `roles` is satisfied by **any**
of the names, `permissions` by **all** of them.
The asymmetry is deliberate and is the same split the HTTP pipeline, the RPC
router and the GraphQL engine use: a role names who someone is — an admin *or*
an owner may act — while a permission names what an action needs, and it needs
all of them.

A `permissions` guard asks the auth layer, as `.permission()` does on a route:

- When `ctx.auth` has `hasAllPermissions` (Warden's does, and asks the rights
  resolver), that answer decides. The permission list of the user payload is
  not read: a permission still written in a token's claims after it was
  revoked is refused.
- Otherwise the list is read from `ctx.auth.permissions`, or from
  `ctx.auth.user.permissions`.
- When the request was authenticated with an access token, the token must
  allow each permission too. A token limited to `profile` does not pass a
  `chat.moderate` guard, even for a moderator.

To restrict one method of a hub that anyone may connect to, leave the hub
without guards and check `ctx.auth` in the method.

#### What is checked again, and when

The guards are asked again on **every invocation**. An invocation they refuse
ends the connection: the client no longer meets what it takes to be connected.

- Over Server-Sent Events, each invocation arrives on its own POST,
  authenticated afresh. A role or a permission removed since the stream opened
  is refused on the next call. `ctx.auth` in the method is that request's.
- Over WebSockets, a connection has one request, its handshake. The role is
  the one the handshake carried. A permission is asked of the auth layer again
  on every call, so a permission removed mid-connection is refused on the
  next call.

Nothing is asked while a connection only listens. A user who logs out, or
loses a role, keeps receiving until its next invocation, unless you end the
connection yourself (see [Ending a connection](#ending-a-connection)).

A POST must come from the user the stream was opened by, and a stream opened
anonymously takes anonymous POSTs only (`403 E_RELAY_NOT_OWNER`). A token's
first use — the stream or the socket — is held to whoever negotiated it: a
token read in a log before its owner connects opens nothing. A POST for a
connection that has no open stream is refused with `400 E_RELAY_NOT_CONNECTED`.

### Ending a connection

The server can end a connection. The client is taken off the hub at once, so
it receives nothing more, then it is sent a SignalR Close and its stream or
socket is closed.

```ts
// In the logout handler, or where a role is removed:
adminHub.disconnectUser(user.id)

// One connection, by its id:
adminHub.disconnect(clientId)

// From a hub method, the calling connection:
async onLeave(ctx: HubContext) {
  ctx.disconnect()
}
```

`disconnectUser()` returns how many connections it ended. Both methods reach
the connections held by the instance that runs them: a connection lives on the
instance that negotiated it. Behind several instances, call them on each one.

Two connections end by themselves:

- A connection opened with an access token that expires
  (`ctx.auth.user.currentAccessToken.expiresAt`) is closed when the token
  expires.
- A connection whose `onConnect` throws is closed. The handshake POST answers
  `500`, a socket closes with `1011`.

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

Arguments are parsed without `__proto__` keys, and without a `constructor`
object that carries `prototype`, at any depth. You can merge an argument into
another object (`Object.assign(settings, patch)`) without the client changing
that object's prototype.

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

The route customizer passed to `registerRoutes()` applies to the routes of
every hub mounted after it, the WebSocket one included. Use it for middleware
all the realtime routes need. It is not what guards a hub:

- It is one customizer for every hub, so it cannot say "this hub needs
  `admin`".
- A hub declared before `registerRoutes()` does not receive it.
- Warden's `auth` middleware refuses nothing there. It enforces the `@Guard`,
  `@Role` and `@Permission` decorators of a controller action. A hub route has
  none, so the request goes through. `route.guard('web')` does refuse an
  anonymous request, on every route the customizer reaches.

To decide who connects to a hub, use [`useGuards()`](#guarding-a-hub).
