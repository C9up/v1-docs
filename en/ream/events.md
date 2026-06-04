# Event Bus

Ream ships an event bus as a **core primitive** — like the router, the HTTP
layer, and the scheduler, it is part of `@c9up/ream` itself (backed by a native
Rust crate). A basic in-process emitter works with **zero external
infrastructure**; a durable Redis-backed store is an opt-in build feature for
production.

## The Emitter

`Emitter` supports both string-named and class-based events, plus wildcard
subscriptions and request/reply — all through the same instance.

```ts
import { Emitter } from '@c9up/ream'

// String events
emitter.on('user:registered', (user) => sendWelcome(user))
emitter.emit('user:registered', { id: 1 })

// Class-based events (typed)
class TaskDeclared extends BaseEvent {
  constructor(public task: Task) { super() }
}
emitter.on(TaskDeclared, SendNotification)   // listener class (DI-resolved)
await new TaskDeclared(task).emit()

// Wildcard subscriptions (Rust pattern engine)
await emitter.onAny('order.*', (name, data) => audit(name, data))

// Request / reply
const user = await emitter.request('query:user.find', { id: 1 })
```

Listener **classes** are resolved through the IoC container, so they get full
dependency injection. Inline function listeners always work, even without a
container.

## Wiring

`EventsProvider` binds the bus into the container. Register it (it ships in the
recommended provider set), then resolve the emitter via the `events` token.

```ts
// reamrc.ts providers
() => import('@c9up/ream/events/provider')
```

```ts
const emitter = app.container.make('events')   // or 'emitter'
```

The provider binds three tokens to the same emitter — `events` (primary),
`emitter` (AdonisJS-style), and `bus` (the low-level native `EventBus`).

## In a request handler — `ctx.events`

When `EventsProvider` is registered, the emitter is attached to every
`HttpContext`, so a handler can emit without resolving from the container:

```ts
router.post('/users', async (ctx) => {
  const user = await createUser(ctx.request.body())
  ctx.events?.emit('user:created', user)   // undefined when events aren't wired
  ctx.response.json(user)
})
```

`ctx.events` is `undefined` when no `EventsProvider` is registered — apps that
don't use events pay nothing (the native bus is never even loaded).

## Core lifecycle events

ream core emits a few domain events through the bus itself (only when events are
wired). Subscribe to them like any other event:

| Event | When | Payload |
|---|---|---|
| `app:ready` | once, after every provider's `ready()` | `{ environment }` |
| `exception` | a request handler threw (error path only) | `{ id, method, path, error }` |

Per-request `http:request` / `http:response` events are intentionally **not**
emitted by default (they would tax the hot path); they may become an opt-in.

## Registering subscribers

Subscribers are just code that calls `emitter.on(...)`. Wire them at boot by
**preloading** a file from `reamrc.ts` (the same mechanism as routes):

```ts
// start/events.ts
import emitter from '@c9up/ream/events/services/main'
import { SendWelcome } from '#listeners/send_welcome'

emitter.on('user:created', SendWelcome)
emitter.on('app:ready', () => console.log('booted'))
```

```ts
// reamrc.ts
export default defineConfig({
  providers: [() => import('@c9up/ream/events/provider')],
  preloads: [() => import('./start/events.js')],
})
```

## Configuration

```ts
// config/events.ts
import { defineConfig } from '@c9up/ream/events/config'

export default defineConfig({
  store: 'memory',   // default — zero external infra
  retries: 3,
})
```

The default store is in-memory (`MemoryStore`). A durable, distributed Redis
store is available when the native crate is built with the `redis-store` cargo
feature — opt-in, so a plain app never pulls a Redis dependency.

## Testing

`FakeBus` is a drop-in in-memory bus for tests — no native binding required:

```ts
import { FakeBus } from '@c9up/ream/events/testing'

const bus = new FakeBus()
const emitter = new Emitter(bus)
emitter.emit('order.created', { id: 42 })
expect(bus.getEmitted()[0].name).toBe('order.created')
```

For assertions against the real Rust-backed bus, `@c9up/helix` exposes observer
helpers (`collect`, `waitForEvent`, `assertEmitted`) via `@c9up/ream/events/helix`.

## Notes

- `import '@c9up/ream'` exposes `Emitter` and `BaseEvent` **without** loading the
  native binary (they reference it via `import type`). The eager-loading
  `EventsProvider` and `EventBus` live on the `@c9up/ream/events` subpath.
- String and class listeners that throw are isolated; failures surface on the
  `emitter:error` channel (or stderr if none is wired). The cross-service
  `bus.emit` still fires — the domain event already happened.
