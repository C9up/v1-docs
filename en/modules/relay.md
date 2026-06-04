# Relay — Realtime

Relay is Ream's realtime client-transport module (`@c9up/relay`) with SSE + WebSocket Hub + SignalR. Supersedes the earlier `@c9up/raytrace` package.

## Capabilities

- server → client broadcasting through SSE
- bidirectional WebSocket Hubs
- SignalR protocol support
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

## Best practices

- always protect sensitive channels
- cap channels per client
- track subscriptions to detect leaks
