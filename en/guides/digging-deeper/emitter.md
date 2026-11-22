# Emitter

This guide covers the event emitter:

- The Emitter
- Wiring
- In a request handler — `ctx.events`
- Core lifecycle events
- Registering subscribers
- Configuration
- Testing
- Notes

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
await emitter.emit('user:registered', { id: 1 })

// Class-based events (typed)
class TaskDeclared extends BaseEvent {
  constructor(public task: Task) { super() }
}
emitter.on(TaskDeclared, [SendNotification])  // listener class (DI-resolved)
await new TaskDeclared(task).emit()

// Wildcard subscriptions (Rust pattern engine)
const unsubscribe = await emitter.onAny('order.*', (name, data) => audit(name, data))

// Request / reply
const user = await emitter.request('query:user.find', { id: 1 })
```

### `emit` resolves once the listeners are done

`emit()` returns a promise and resolves after every listener has finished —
awaiting it is how a handler makes sure the work it triggered actually happened
before it answers. Listeners run in **parallel**; `emitSerial()` runs them one
after another, for when a listener seeds what the next one reads.

```ts
await emitter.emit('order:placed', order)        // in parallel
await emitter.emitSerial('order:placed', order)  // one at a time
```

Not awaiting it keeps the fire-and-forget shape. A listener that throws is
reported through the error channel and does **not** cancel the others: one
failing subscriber must not silently cancel the reaction to an event it does not
own.

### Managing listeners

```ts
emitter.once('boot:ready', run)         // the next occurrence only
emitter.off('boot:ready', run)          // remove one
emitter.listenIf(config.audit, 'x', fn) // register only when the flag holds; returns the unsubscribe
emitter.listenerCount('x')              // how many, or all of them with no arg
emitter.clearListeners('x')             // drop one event's listeners
emitter.clearAllListeners()             // drop everything, wildcard listeners included
emitter.onError((event, error) => report(event, error))
```

Every one of them takes a string event or an event class
(`emitter.off(UserRegistered, listener)`, `emitter.listenerCount(UserRegistered)`).
The same listener registered twice for one event runs once.

### Listener forms

Both kinds of event accept the same listeners:

```ts
const SendVerificationEmail = () => import('#listeners/send_verification_email')

emitter.on(UserRegistered, (event) => audit(event))          // a function
emitter.on(UserRegistered, [SendWelcome])                      // a class, method `handle`
emitter.on('user:registered', [SendWelcome, 'onRegistered'])   // a class and a method
emitter.on(UserRegistered, [SendVerificationEmail])            // lazy: imported on first emit
emitter.on('user:registered', SendWelcome)                     // shorthand for [SendWelcome]

emitter.listen(UserRegistered, [SendVerificationEmail, AuditLog]) // several, each as [listener, 'handle']
emitter.off(UserRegistered, [SendWelcome, 'onRegistered'])      // a tuple is found by class and method
```

Listener **classes** are built through the IoC container, so they get full
dependency injection; without a container they are built with `new`. A lazy
listener's module — and what it imports, a mailer or a queue — is loaded on the
first emit, not at boot, and kept for the next ones; its default export is the
listener class. A method the instance does not have is reported as an error.
Inline function listeners always work, even without a container.

The AdonisJS `'#listeners/x.method'` string form is not accepted: it needs the
application's module importer, which the emitter does not hold. A lazy tuple
says the same thing.

### Wildcard subscriptions

`onAny()` hands back an unsubscribe function; `offAny()` takes the listener:

```ts
const unsubscribe = await emitter.onAny(audit)              // every event
const scoped = await emitter.onAny('order.*', audit)        // one pattern

await unsubscribe()
await emitter.offAny(audit)                                 // or by listener
```

A wildcard listener receives the event's name and the emitted value, once per
matching event, and runs with the correlation id that was active where the
event was emitted (`emitter.getCorrelationId()`). The id travels on the native
event's envelope, not inside the payload. A listener that throws or rejects is
reported through `onError` like any other listener; it cannot crash the
process.

The value crosses the native bus as JSON, so a wildcard listener gets a copy: a
class event arrives as a plain object under its `eventName`, a `Date` as its ISO
string. Listeners registered with `on()` get the value itself.

::: tip Why they are promises
Both are promises, and the unsubscribe function is `() => Promise<void>` rather
than `() => void`. Subscribing and unsubscribing cross the NAPI boundary into
the Rust bus, and returning before the call lands would drop events. It is
assignable wherever a `() => void` is expected — await it when the
next assertion depends on the subscription actually being gone.
:::

## Wiring

`EventsProvider` binds the bus into the container. Register it (it ships in the
recommended provider set), then resolve the emitter via the `events` token.

```ts
// reamrc.ts providers
() => import('@c9up/ream/events/provider')
```

```ts
const emitter = await app.container.make('events')   // or 'emitter'
```

The provider binds three tokens to the same emitter — `events` (primary),
`emitter` (an alias), and `bus` (the low-level native `EventBus`).

A listener does not keep the process alive: a console command ends when its
work does, even with `onAny` or `onRequest` registered at preload. A server stays
up because of its socket. On shutdown the provider drops every listener,
wildcard subscription and request handler the bus holds.

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
const SendWelcome = () => import('#listeners/send_welcome')

emitter.on('user:created', [SendWelcome])   // imported on the first 'user:created'
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
  store: 'memory',   // the default, and the only store this build has
})
```

The store is in-memory. The native crate has a durable Redis store behind the
`redis-store` cargo feature and a delivery-retry loop, but neither is reachable
from JavaScript yet, so the provider refuses them at boot rather than ignoring
them: `store` other than `'memory'` fails with `E_EVENTS_UNSUPPORTED_STORE`, any
other option (`retries` included) with `E_EVENTS_UNSUPPORTED_OPTION`.

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

### Faking events

`fake()` stops the named events reaching their listeners **and** the bus, and
collects them instead — so a test asserts what an action announced without also
running every reaction to it:

```ts
const events = emitter.fake(['user:registered'])

await register(payload)

events.assertEmitted('user:registered')
events.assertEmittedCount('user:registered', 1)
events.assertNotEmitted('user:deleted')

emitter.restore()
```

With no argument every event is faked. Calling `fake()` again drops the previous
buffer and starts a fresh one.

The buffer restores the emitter when it leaves a `using` block, so a test that
throws mid-way cannot leave events faked for the next one:

```ts
{
  using events = emitter.fake()
  await register(payload)
  events.assertEmitted('user:registered')
}
// delivery is live again here, however the block ended
```

Class-based events are faked by their class:

```ts
const events = emitter.fake([TaskDeclared])
await new TaskDeclared(task).emit()
events.assertEmitted(TaskDeclared)
```

The full buffer surface: `all()`, `size()`, `exists()`, `find()`,
`assertEmitted()`, `assertEmittedCount()`, `assertNotEmitted()`,
`assertNoneEmitted()`, `flush()`. `exists()`, `find()`, `assertEmitted()` and
`assertNotEmitted()` take an optional finder to narrow to one emission among
several of the same event:

```ts
events.assertEmitted<{ total: number }>('order:placed', ({ data }) => data.total === 99)
```

## Notes

- `import '@c9up/ream'` exposes `Emitter` and `BaseEvent` **without** loading the
  native binary (they reference it via `import type`). The eager-loading
  `EventsProvider` and `EventBus` live on the `@c9up/ream/events` subpath.
- String and class listeners that throw are isolated; failures surface on the
  `emitter:error` channel (or stderr if none is wired). The cross-service
  `bus.emit` still fires — the domain event already happened.
