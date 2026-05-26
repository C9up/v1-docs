# Echo — Cache

Echo est la couche cache de l'ecosysteme Ream (`@c9up/echo`).

> Statut: en evolution active. Le module converge vers une semantique plus stricte et une observabilite etendue.

## Capacites

- get/set/delete
- flush
- tags
- drivers interchangeables (`Memory`, `Redis`)

## API principale

```ts
import { CacheManager, MemoryDriver } from '@c9up/echo'

const cache = new CacheManager(new MemoryDriver())
```

### Operations de base

```ts
await cache.set('user:1', { id: 1, name: 'Ada' }, 300)

const user = await cache.get<{ id: number; name: string }>('user:1')
const hasUser = await cache.has('user:1')

await cache.delete('user:1')
await cache.flush()
```

### `remember()` (anti stampede)

`remember` evite les appels concurrents dupliques en partageant une promesse in-flight.

```ts
const profile = await cache.remember('profile:42', 60, async () => {
  return await fetchProfileFromDb(42)
})
```

### Prefix et TTL par defaut

```ts
const cache = new CacheManager(driver, {
  prefix: 'app',
  ttl: 3600,
})
```

Un `ttlSeconds` `undefined`, `0` ou négatif signifie « pas d'expiration »
— `set()` et `setWithTags()` se comportent identiquement. Une valeur
positive stampe une deadline absolue ; les entrées passées sont
retournées `null` et purgées par le balayeur du driver.

## Drivers

- `MemoryDriver`: rapide, local
- `RedisDriver`: partage multi-instance

## Tags

Les drivers exposent `setWithTags/flushTags` (via capacites driver):

```ts
await cache.setWithTags('product:10', { id: 10 }, ['products', 'shop'], 120)
await cache.flushTags(['products'])
```

Les deux methodes levent une erreur si le driver configure ne supporte pas l'invalidation par tags.

## Limites actuelles

- `flush()` Redis utilise un pattern par prefix (`keys`) et doit etre utilise avec prudence sur tres gros volumes
- les capacites tags dependent du driver concret

## Checklist prod

- definir conventions de cles (`domain:entity:id`)
- imposer des TTL explicites sur les cles chaudes
- utiliser invalidation par tags pour coherence metier
- monitorer hit/miss et latence driver

## Bonnes pratiques

- definir une politique TTL explicite
- eviter de mettre en cache des objets tres volumineux sans compression
- invalider par tags sur les domaines critiques
