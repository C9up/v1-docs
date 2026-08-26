# Relay — Realtime

Relay is Ream's realtime module (`@c9up/relay`): server-sent events for broadcasting, and SignalR Hubs for the bidirectional half. Supersedes the earlier `@c9up/raytrace` package.

## Capabilities

- server → client broadcasting through SSE
- bidirectional Hubs speaking the SignalR JSON protocol over SSE
- channel subscriptions
- channel authorization
- Event relay

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
import { defineConfig } from '@c9up/relay'

export default defineConfig({
  // Relay options
})
```

## Typical endpoints

- `GET /__relay/events` SSE connection (optional `?uid=<id>` hint)
- `POST /__relay/subscribe` channel subscribe
- `POST /__relay/unsubscribe` channel unsubscribe

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
(`start/services.ts`), the same place `registerRoutes()` is called — the
provider registers the routes in `start()`, after preloads have run:

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

`onConnect` / `onDisconnect` are lifecycle hooks and are not invocable.
Mounting the same path twice throws rather than replacing the first hub.

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
