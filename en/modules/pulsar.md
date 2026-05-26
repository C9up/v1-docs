# Pulsar — Event Bus

Pulsar is Ream's Rust-powered event bus. Services communicate through named events — decoupled, observable, and executed at native speed. The bus lives inside a NAPI binary; each `PulsarBus` instance is independent, which enables parallel test isolation without mocking.

## Basic Usage

```typescript
import { PulsarBus } from '@c9up/pulsar'

const bus = new PulsarBus()

// Subscribe to an event
const subId = bus.subscribe('order.created', (eventJson) => {
  const event = JSON.parse(eventJson)
  console.log(`New order: ${event.data.orderId}`)
})

// Emit an event (payload is JSON string)
bus.emit('order.created', JSON.stringify({ orderId: '123', total: 42.50 }))

// Unsubscribe when done
bus.unsubscribe(subId)
```

## Glob Pattern Subscriptions

Use `*` to match any single segment and `**` to match multiple:

```typescript
// Match all order events
bus.subscribe('order.*', (eventJson) => {
  const event = JSON.parse(eventJson)
  console.log(`Order event: ${event.name}`)
})

bus.emit('order.created',  '{}')    // matches
bus.emit('order.paid',     '{}')    // matches
bus.emit('order.refunded', '{}')    // matches
bus.emit('payment.charged','{}')    // does NOT match
```

This makes it practical to wire wildcard collectors for logging or audit trails:

```typescript
// Collect every event for development introspection
bus.subscribe('**', (eventJson) => {
  logger.debug('bus event', JSON.parse(eventJson))
})
```

## Event Structure

Every event payload delivered to a subscriber is a JSON string. Parse it to access the structured fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique UUID for this event |
| `name` | `string` | Event name (e.g., `order.paid`) |
| `data` | `string` | JSON-encoded application payload |
| `correlationId` | `string` | Chain tracing ID (propagated across related events) |
| `causationId` | `string?` | Parent event ID that caused this one |
| `timestamp` | `string` | ISO 8601 emission timestamp |
| `nodeId` | `string` | Node identifier (reserved for future distribution) |

```typescript
bus.subscribe('order.paid', (eventJson) => {
  const event = JSON.parse(eventJson)
  // event.id            — 'a3f7...'
  // event.name          — 'order.paid'
  // event.correlationId — 'req-abc-123'
  // event.data          — '{"orderId":"42","total":99.00}'
  const payload = JSON.parse(event.data)
})
```

## Integration with Atlas Domain Events

After saving an entity with domain events, flush them and emit each one to the bus:

```typescript
import { OrderRepository } from './repositories/OrderRepository.js'
import { PulsarBus } from '@c9up/pulsar'

const bus = new PulsarBus()
const repo = new OrderRepository()

repo.onDomainEvents = async (events) => {
  for (const event of events) {
    bus.emit(event.name, JSON.stringify({
      name: event.name,
      data: JSON.stringify(event.data),
      correlationId: ctx.id,
    }))
  }
}

const order = new Order()
order.id = crypto.randomUUID()
order.markAsPaid()
await repo.save(order)
// 'order.paid' emitted to bus after save
```

## Retry with Exponential Backoff

Subscribe with automatic retry on handler failure:

```typescript
bus.subscribe_with_retry('payment.process', (eventJson) => {
  const event = JSON.parse(eventJson)
  processPayment(JSON.parse(event.data))
  // If this throws, the handler is retried automatically
}, {
  max_retries:  3,     // Default: 3
  base_delay_ms: 100,  // Default: 100 — doubles each attempt
  max_delay_ms: 5000,  // Default: 5000 — caps the backoff
})
```

Retry behavior:
- Delay doubles after each attempt: 100 ms, 200 ms, 400 ms, ...
- Delay is capped at `max_delay_ms`
- After all retries are exhausted, a `service.error` event is emitted with the original payload and error details, and the event is placed in the dead letter queue

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `max_retries` | number | 3 | Maximum retry attempts |
| `base_delay_ms` | number | 100 | Initial backoff in milliseconds |
| `max_delay_ms` | number | 5000 | Maximum backoff cap in milliseconds |

## Request / Reply

Register a handler that produces a return value, then call it synchronously:

```typescript
// Register a request handler
bus.onRequest('order.validate', (eventJson) => {
  const event = JSON.parse(eventJson)
  const valid = Number(JSON.parse(event.data).amount) > 0
  return JSON.stringify({ valid })
})

// Send a request and receive the response
const responseJson = bus.request('order.validate', JSON.stringify({ amount: 42 }))
const response = JSON.parse(responseJson)
// response.valid === true
```

## waitForChain

Wait for a correlated sequence of events to complete — useful for testing multi-step workflows:

```typescript
import { PulsarBus, waitForChain } from '@c9up/pulsar'

const bus = new PulsarBus()
const { events } = collect(bus, '**')

// Trigger a flow that produces multiple correlated events
bus.emit('order.created', JSON.stringify({ correlationId: 'flow-1', ... }))

// Wait until all three events appear with the same correlationId
const chain = await waitForChain(
  events,
  'flow-1',
  ['order.created', 'payment.charged', 'order.fulfilled'],
  { timeout: 5000 },
)

// chain contains all three matched events
```

Throws `HELIX_CHAIN_TIMEOUT` if the chain does not complete within `timeout` milliseconds.

## Bus Independence

Each `PulsarBus` instance is fully independent — not a singleton or a shared registry. This means test suites can create isolated buses per test without any teardown:

```typescript
const bus1 = new PulsarBus()
const bus2 = new PulsarBus()

bus1.subscribe('test', () => console.log('bus1 fired'))
bus2.emit('test', '{}')
// bus1 subscriber does NOT fire — different instance
```

## Testing Helpers (Helix)

The `@c9up/pulsar` package ships a set of testing helpers for asserting bus behavior without external infrastructure:

```typescript
import { collect, fake, assertEmitted, assertNotEmitted, waitForEvent } from '@c9up/pulsar/tests/helix/helpers'

const bus = new PulsarBus()

// Collect all events matching a pattern into an array
const { events, subId } = collect(bus, 'order.*')

bus.emit('order.created', JSON.stringify({ name: 'order.created', data: '{"orderId":"1"}' }))

// Assert an event was emitted (optionally match partial payload)
assertEmitted(events, 'order.created', { orderId: '1' })

// Assert an event was NOT emitted
assertNotEmitted(events, 'order.deleted')

// Wait for an event asynchronously (returns the matching event)
const event = await waitForEvent(events, 'order.created', { timeout: 1000 })
```

```typescript
// fake() works like collect() — captures events for assertions
// Other subscribers still receive the event
const faked = fake(bus, 'mail.send')
bus.emit('mail.send', JSON.stringify({ name: 'mail.send', data: '{}' }))
// faked.events[0] captured
```

---

## Emitter — Typed Event System

The `Emitter` provides an AdonisJS-compatible typed event system backed by PulsarBus. Where PulsarBus works with raw JSON strings and named channels, the Emitter works with typed event classes and listener classes — giving you IDE autocompletion, compile-time safety, and dependency injection support throughout the event pipeline.

### Event Classes

An event class is a plain TypeScript class that extends `BaseEvent`. Its constructor parameters become the event's payload.

```typescript
// app/modules/task/events/TaskDeclared.ts
import { BaseEvent } from '@c9up/pulsar/events'

export default class TaskDeclared extends BaseEvent {
  constructor(
    public taskId: string,
    public residenceId: string,
    public declarantId: string,
  ) {
    super()
  }
}
```

### Listener Classes

A listener is a class with a `handle()` method. The `@inject()` decorator enables full dependency injection — the container resolves the listener and injects any constructor dependencies automatically.

```typescript
// app/modules/task/listeners/LogTaskEvent.ts
import { inject, Inject } from '@c9up/ream'
import { Logger } from '@c9up/spectrum'
import type TaskDeclared from '../events/TaskDeclared.js'

@inject()
export default class LogTaskEvent {
  constructor(@Inject('logger') private logger: Logger) {}

  async handle(event: TaskDeclared) {
    this.logger.child({ module: 'task' }).info(
      `Task ${event.taskId} declared in residence ${event.residenceId}`,
    )
  }
}
```

### Wiring Events to Listeners

Each module has an `events.ts` file that maps event classes to their listener classes. The framework auto-loads this file during the start phase — listing it in `reamrc.ts` under `autoload` is enough.

```typescript
// app/modules/task/events.ts
import app from '@c9up/ream/services/app'
import { Emitter } from '@c9up/pulsar/events'
import TaskDeclared from './events/TaskDeclared.js'
import LogTaskEvent from './listeners/LogTaskEvent.js'

const emitter = app.container.make(Emitter)
emitter.on(TaskDeclared, LogTaskEvent)
```

One event can have multiple listeners. Call `emitter.on()` once per listener:

```typescript
emitter.on(TaskDeclared, LogTaskEvent)
emitter.on(TaskDeclared, NotifyResidentsListener)
```

### Dispatching Events

From any controller or service, use the static `dispatch()` method on the event class. Arguments mirror the constructor signature — TypeScript enforces them.

```typescript
import TaskDeclared from '../events/TaskDeclared.js'

// Class-based dispatch — fully typed
TaskDeclared.dispatch(taskId, residenceId, declarantId)
```

For cases where a class-based event is unnecessary, you can use string-based events with the `Emitter` directly:

```typescript
import app from '@c9up/ream/services/app'
import { Emitter } from '@c9up/pulsar/events'

const emitter = app.container.make(Emitter)

emitter.emit('user:registered', { email: user.email })
emitter.on('user:registered', (data) => { console.log(data.email) })
```

### Module Structure

A module using the event system gains two new directories alongside the existing ones:

```
app/modules/task/
  controllers/
  entities/
  events/
    TaskDeclared.ts       ← event payload class
    TaskTransitioned.ts
  listeners/
    LogTaskEvent.ts       ← handles TaskDeclared
    LogTaskTransition.ts
  services/
  validators/
  events.ts               ← auto-loaded by framework — wires events to listeners
  routes.ts               ← auto-loaded by framework — registers routes
```

Both `events.ts` and `routes.ts` are discovered automatically. To enable this, list `'events'` alongside `'routes'` in `reamrc.ts`:

```typescript
// reamrc.ts
modules: {
  path: './app/modules',
  autoload: ['routes', 'events'],
}
```

### PulsarProvider

Register the provider in `reamrc.ts` to enable the full event system. The provider registers `PulsarBus`, `Emitter`, and calls `BaseEvent.useEmitter()` to wire class-based dispatch.

```typescript
// reamrc.ts
providers: [
  () => import('@c9up/pulsar/provider'),
  () => import('#providers/AppProvider.js'),
]
```

---

## Next Steps

- [Atlas (ORM)](/en/modules/atlas) — Emit domain events after entity save
- [Spectrum (Logging)](/en/modules/spectrum) — Log events for observability
