# Atlas - Domain Events

Atlas can accumulate domain events on entities, then dispatch them after `save()`.

## Entity API

```ts
entity.addDomainEvent('order.paid', { orderId: entity.id })
entity.hasDomainEvents()
entity.getDomainEvents()
entity.flushDomainEvents()
entity.clearDomainEvents()
```

## Dispatch after persistence

```ts
repo.onDomainEvents = async (events) => {
  for (const event of events) {
    await bus.emit(event.name, JSON.stringify(event.data))
  }
}

await repo.save(order)
```

## Practical guarantee

- events are flushed after successful `save()`
- if dispatch fails, Atlas restores events back to the entity

## Recommendations

- keep event payloads compact
- include `correlationId` where available
- avoid long network work inside entity hooks
