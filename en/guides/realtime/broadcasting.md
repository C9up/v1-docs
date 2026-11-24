# Broadcasting

This guide covers broadcasting to clients with relay:

- Capabilities
- Main API
- Configuration
- Broadcasting application events
- Typical endpoints
- Best practices

Relay is Ream's realtime module (`@c9up/relay`): server-sent events for broadcasting, and SignalR Hubs for the bidirectional half. Supersedes the earlier `@c9up/raytrace` package.

## Capabilities

- server → client broadcasting through SSE
- bidirectional Hubs speaking the SignalR JSON protocol, over WebSockets or SSE
- channel subscriptions
- channel authorization
- multi-instance broadcast over a Redis bus

## Main API

```ts
// start/services.ts
import relay from '@c9up/relay/services/main'

relay.registerRoutes()
// The authorizer gets the subscribe request's context and the params its
// pattern captured.
relay.authorize<{ id: string }>('users/:id', (ctx, { id }) => ctx.auth?.user?.id === id)
relay.authorize('reports/*', (ctx) => ctx.bouncer?.allows('reports.read') ?? false)

// anywhere in the app
relay.broadcast('users/42', { unread: 3 })
```

The authorizer is handed the whole context of the subscribe request, as for a
controller: `ctx.bouncer`, the tenant, anything a middleware put there. `auth`
and `bouncer` are typed; the rest is there at run time.

### Channel patterns

| Segment | Matches | Param |
|---|---|---|
| `users` | that exact segment | — |
| `:id` | any one segment | `id` |
| `:name.csv` | a segment ending in `.csv` | `name`, without the suffix |
| `:id?` | one segment, or nothing — trailing only | `id` when present |
| `*` | one or more segments — last only | `'*'`, the rest joined with `/` |

`orgs/:org/*` covers `orgs/acme/projects/42` with `{ org: 'acme', '*': 'projects/42' }`;
`posts/:id?` covers both `posts` and `posts/42`. A registration with no param
and no wildcard wins over every pattern; patterns are tried in the order they
were registered. A pattern that could never match — a `*` that is not last, an
empty param name, a required segment after an optional one — throws at
`authorize()`.

### What a broadcast carries

The payload is sent as JSON, whatever it is: `broadcast(ch, 'hello')` reaches
the client as the string `hello`, and `broadcast(ch, '{"a":1}')` as that string,
not as an object. A string is never written raw onto the stream, so no line
break or carriage return in it can end its event and forge another. A payload
JSON cannot carry — a cycle, a `BigInt` — throws from `broadcast()` before
anything is sent; `undefined` is sent as `null`.

`broadcastExcept(channel, payload, uid)` skips the given uid(s), on this
instance and, through the bus, on every other.

## Configuration

Define your Relay settings in `config/relay.ts` with the `defineConfig` helper:

```ts
import { defineConfig, transports } from '@c9up/relay'

export default defineConfig({
  // Let a client subscribe to a channel no authorizer covers. Default false.
  allowUnauthorizedChannels: false,
  // Concurrent SSE clients this instance accepts. Past it, connects are 503'd.
  maxClients: 10_000,
  // Concurrent SSE clients one owner may hold — a user, or the client address
  // of an anonymous connection — so one client cannot take every slot.
  // Default 20; false for none. Behind a proxy, configure the trusted proxies,
  // or every anonymous visitor counts as the proxy.
  maxClientsPerOwner: 20,
  // Channels one client may hold. Client-supplied names are indexed, so an
  // unbounded cap lets a single socket pin memory.
  maxChannelsPerClient: 100,
  // The bus that carries a broadcast between instances. See below.
  transport: transports.redis({ connection: 'main' }),
  // A keep-alive frame to every client, so proxies do not close idle
  // streams: milliseconds or a duration. Default false.
  pingInterval: '30s',
})
```

### Running more than one instance

A broadcast reaches the SSE clients attached to the instance that made it.
Behind a load balancer with two replicas, that is about half of your users —
each one is connected to whichever instance the balancer picked.

`transport` is the bus that closes the gap: every broadcast is mirrored onto
it, and each instance re-delivers what arrives to its own clients. The
re-delivery is local only, so a message never bounces back onto the bus, and
each publication carries the id of the relay that sent it, which ignores its own
— the bus hands a message back to its publisher too, and the local clients
already had it.

**A subscription may land on any instance.** A connection's uid and its
channels live on the instance that opened the stream, but the balancer sends
`POST /__relay/subscribe` and `/__relay/unsubscribe` anywhere. The instance a
`subscribe` lands on runs the channel's authorizer with that request, then
relays the subscription on the bus; the instance holding the uid applies it
after checking that the requester is the user and session that opened the
stream, and that the stream is under `maxChannelsPerClient`. An `unsubscribe`
is relayed the same way. The answer is `204` once the bus has the message — a
refusal on the holder (another user, the channel cap) is applied there and not
reported back — and the `subscribe` / `unsubscribe` events fire on the holder,
once applied, with the stream's context. A bus that refuses the relay answers
`503 E_RELAY_BUS_UNAVAILABLE`.

A hub connection lives on the instance that negotiated it — its token, and the
groups it joined — so route a client's hub requests to one instance: sticky
sessions on the hub paths, for the negotiate and then the socket (or the stream
and its posts). What a hub sends crosses the bus: `ctx.group(name).send()` and
`ctx.broadcast()` reach the members connected to every instance, each instance
delivering to the ones it holds, as SignalR's Redis backplane does.
`ctx.send()` answers the calling client, which is always local.

```ts
import { defineConfig, transports } from '@c9up/relay'

export default defineConfig({
  transport: transports.redis({ connection: 'main' }),
})
```

`connection` takes the name of a [`@c9up/quasar`](/en/guides/database/redis)
connection — resolved when the first broadcast goes out, not while the config
file is read — or a client of your own answering `publish`, `subscribe` and
`unsubscribe`. A named connection quasar retires once its retry strategy gives
up (status `end`) is not used again: the next broadcast asks for the connection
again and subscribes the bus channel on it, since the old subscription died with
its subscriber socket — so the bus heals by itself once Redis is back.

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

## Broadcasting application events

Relay has no event-to-channel mapping of its own: the application listens to
its events and broadcasts, in a listener it writes and reads like any other.

```ts
// start/services.ts
import emitter from '@c9up/ream/events/services/main'
import relay from '@c9up/relay/services/main'
import { TaskAssigned } from '#events/task_assigned'

emitter.on(TaskAssigned, (event) => {
  relay.broadcast(`project/${event.projectId}`, { type: 'task.assigned', taskId: event.taskId })
})
```

Who may listen on `project/:id` is decided once, by the channel's authorizer;
what each event carries, and to which channel, stays in the listener.

## Typical endpoints

- `GET /__relay/events` SSE connection
- `POST /__relay/subscribe` channel subscribe
- `POST /__relay/unsubscribe` channel unsubscribe

None of them exists until the application asks for it — `registerRoutes()`
builds them, from a preload:

```ts
// start/services.ts
import relay from '@c9up/relay/services/main'

relay.registerRoutes()
// or, to require an authenticated request on the endpoints:
relay.registerRoutes((route) => route.guard('web'))
```

`.guard()`, `.role()` and `.permission()` on the route refuse a request that
does not meet them. Warden's `auth` middleware would refuse nothing here: it
enforces the decorators of a controller action, and these routes have none.

Mounting where the declaration is written is what keeps the routes ahead of the
socket. Building them in a later phase left a window, after the server was
listening, in which a request for a route the application had already asked for
answered 404.

### Connections

Every stream gets a uid from the server — never from the client — sent in its
first frame, `connected { uid }`, and echoed back in `subscribe` / `unsubscribe`.
Each connection has its own, so two tabs of one account stay open side by side.
Who opened it is recorded beside it — the user, and the session the request came
in with — and a `subscribe` or `unsubscribe` must carry the same, in both
directions (`403 E_RELAY_NOT_OWNER` otherwise): a stream opened as a user takes
requests from that user only, and one opened anonymously, or with no session,
takes requests carrying neither. Otherwise a request with someone's credentials
— a forged frame replayed by their own client, a cross-site form — could have
the authorizer approve, with those credentials, a channel that streams to a
connection somebody else holds. A client that logs in, or receives a session
cookie, reconnects to get a stream bound to it.

Lifecycle listeners receive the request's context beside the uid:

```ts
relay.on('subscribe', ({ uid, channel, context }) => {
  audit.log(context.auth?.user?.id, 'subscribed', channel)
})
```

`connect` and `disconnect` carry the context of the request that opened the
stream; `subscribe` and `unsubscribe` that of their own request.

`relay.shutdown()` stops the keep-alive timer, ends every open stream — the
event streams and those of the mounted hubs — and refuses new ones, then
releases the bus. A stream opened afterwards is ended at once, so the client
reconnects, to another instance if there is one. The next `startTransport()`
(the provider's `ready()`) accepts connections again.

## Best practices

- always protect sensitive channels
- cap channels per client
- track subscriptions to detect leaks
