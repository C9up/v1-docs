# Atlas - Domain Events

Atlas permet d'accumuler des événements de domaine sur les entités, puis de les dispatcher après `save()`.

## API entité

```ts
entity.addDomainEvent('order.paid', { orderId: entity.id })
entity.hasDomainEvents()
entity.getDomainEvents()
entity.flushDomainEvents()
entity.clearDomainEvents()
```

## Dispatch après persistance

```ts
repo.onDomainEvents = async (events) => {
  for (const event of events) {
    await bus.emit(event.name, JSON.stringify(event.data))
  }
}

await repo.save(order)
```

## Garantie pratique

- les événements sont vidés après `save()` réussi
- si le dispatch échoue, Atlas restaure les événements dans l'entité

## Recommandations

- garder les payloads d'événements compacts
- inclure `correlationId` quand disponible
- ne pas mettre de logique réseau longue dans les hooks entité
