# Relay — Realtime

Relay is Ream's realtime module (`@c9up/relay`): server-sent events for broadcasting, and SignalR Hubs for the bidirectional half. Supersedes the earlier `@c9up/raytrace` package.

## Capabilities

- server → client broadcasting through SSE
- bidirectional Hubs speaking the SignalR JSON protocol over SSE
- channel subscriptions
- channel authorization
- Event relay
- multi-instance broadcast over a Redis bus

## Main API

```ts
import { Relay } from '@c9up/relay'

const rt = new Relay()
rt.authorize('user:*', async (ctx, userId) => ctx.auth.user?.id === userId)
rt.relay('task.*')
```

## Configuration

Define your Relay settings in `config/relay.ts` with the `defineConfig` helper:

```ts
import { defineConfig, transports } from '@c9up/relay'

export default defineConfig({
  // Let a client subscribe to a channel no authorizer covers. Default false.
  allowUnauthorizedChannels: false,
  // Concurrent SSE clients this instance accepts. Past it, connects are 503'd.
  maxClients: 10_000,
  // Channels one client may hold. Client-supplied names are indexed, so an
  // unbounded cap lets a single socket pin memory.
  maxChannelsPerClient: 100,
  // The bus that carries a broadcast between instances. See below.
  transport: transports.redis({ connection: 'main' }),
})
```

### Running more than one instance

A broadcast reaches the SSE clients attached to the instance that made it.
Behind a load balancer with two replicas, that is about half of your users —
each one is connected to whichever instance the balancer picked.

`transport` is the bus that closes the gap: every broadcast is mirrored onto
it, and each instance re-delivers what arrives to its own clients. The
re-delivery is local only, so a message never bounces back onto the bus.

```ts
import { defineConfig, transports } from '@c9up/relay'

export default defineConfig({
  transport: transports.redis({ connection: 'main' }),
})
```

`connection` takes the name of a [`@c9up/quasar`](/en/modules/quasar)
connection — resolved when the first broadcast goes out, not while the config
file is read — or a client of your own answering `publish`, `subscribe` and
`unsubscribe`.

A shared client stacks listeners, so `unsubscribe(channel, handler)` has to
honour the handler it is given and remove only that one. Dropping every
listener on the channel would silence whatever else the application listens to
on the same connection.

`transportChannel` renames the channel the bus publishes on (default
`relay::broadcast`); every instance has to agree on it.

**Shutdown only releases what relay owns.** A named quasar connection belongs to
the application — the cache, the sessions and the queues may share it — so
`relay.shutdown()` removes its own listener from the channel and leaves the
connection open. Only a client opened for relay and used by nothing else should
be closed with it:

```ts
transports.redis({ connection: myOwnClient, owned: true })
```

A name is a lookup into someone else's connection manager, so it is borrowed by
construction and `owned` cannot override that.

**A bus that cannot be reached stops the boot.** An instance that fails to
subscribe keeps serving its own clients and misses every broadcast published
elsewhere — a split-brain the application would otherwise report as healthy. The
provider waits for the subscription in `ready()`, so a Redis that is down at
start-up is a failed boot rather than a silent half-working deployment.

Leave `transport` out and relay is single-instance.

## Typical endpoints

- `GET /__relay/events` SSE connection (optional `?uid=<id>` hint)
- `POST /__relay/subscribe` channel subscribe
- `POST /__relay/unsubscribe` channel unsubscribe

None of them exists until the application asks for it — `registerRoutes()`
builds them, from a preload:

```ts
// start/services.ts
import relay from '@c9up/relay/services/main'

relay.registerRoutes()
// or, to put the endpoints behind auth:
relay.registerRoutes((route) => route.middleware('auth'))
```

Mounting where the declaration is written is what keeps the routes ahead of the
socket. Building them in a later phase left a window, after the server was
listening, in which a request for a route the application had already asked for
answered 404.

### uid hint security

When an authenticated client connects to `/__relay/events?uid=<id>`,
the server pre-flights the hint against `ctx.auth.user.id` BEFORE
upgrading the connection to SSE. If they don't match, a buffered
`403 E_UID_HIJACK` is returned and the stream is never opened. The
hint is therefore informational only — the canonical uid always
comes from `ctx.auth`, never from the query string.

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
  // after `on`, first letter lowercased.
  async onSendMessage(ctx: HubContext, data: unknown) {
    ctx.group('room-1').send('message', data)
  }
}

relay.hub('/hubs/chat', new ChatHub())
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

`roles` is satisfied by **any** of the names, `permissions` by **all** of them.
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
    ctx.send('result', a + b + c)
  }
}

// client: connection.invoke('Sum', 1, 2, 3)
```

A method declaring one parameter is unaffected — the extras are simply ignored,
as in any JavaScript call. Only the first argument used to be passed, and the
rest went nowhere without anything reporting it.

### What is not supported

Streaming is not implemented. A `StreamInvocation` gets an **error Completion**
naming the reason, rather than being dropped: the invocation id is the handle
the client's observable waits on, and the protocol promises a Completion, so a
dropped one leaves the observable pending for the lifetime of the connection.

`StreamItem` and `CancelInvocation` are ignored, which is the correct response
for both — an item belongs to a stream whose opening invocation was already
refused, and a cancel targets a stream that was never started.

### The wire

The transport is **Server-Sent Events** — what relay already serves, what
AdonisJS's own realtime package uses, and a first-class SignalR transport. A
stock `@microsoft/signalr` client configured with
`HttpTransportType.ServerSentEvents` speaks it unchanged:

| Route | Role |
|---|---|
| `POST <path>/negotiate` | issues a `connectionId` + `connectionToken` |
| `GET <path>?id=<token>` | the stream, server → client |
| `POST <path>?id=<token>` | framed messages, client → server |

`negotiate` announces only the transports the server can actually serve.
Advertising WebSockets while nothing can upgrade sends every client down a road
that dead-ends, so the default is `ServerSentEvents` alone.

The route customizer passed to `registerRoutes()` applies to a hub's three
routes too — a hub needs `auth` middleware as much as the event stream does.

## Best practices

- always protect sensitive channels
- cap channels per client
- track subscriptions to detect leaks
