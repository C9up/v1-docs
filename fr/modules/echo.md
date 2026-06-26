# Echo — Cache

Echo est la couche cache de l'ecosysteme Ream (`@c9up/echo`).

> Statut: en evolution active. Le module converge vers une semantique plus stricte et une observabilite etendue.

## Capacites

- get/set/delete
- getOrSet (récupère-ou-calcule)
- clear
- namespaces
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
await cache.clear()
```

`clear()` vide tout le cache.

### `getOrSet()` (récupère-ou-calcule, single-flight)

`getOrSet` retourne la valeur en cache, ou la calcule via la factory en cas de miss puis la stocke. Les miss concurrents sur la même clé partagent une seule promesse in-flight (pas de travail dupliqué).

```ts
const profile = await cache.getOrSet('profile:42', 60, async () => {
  return await fetchProfileFromDb(42)
})
```

### Namespaces

`namespace(ns)` retourne une vue du cache scopée sous un préfixe de clé supplémentaire. Chaque opération sur la vue est préfixée de façon transparente :

```ts
const users = cache.namespace('users')
await users.set('42', { id: 42 })
await users.get('42') // lit la clé sous-jacente `users:42`
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
