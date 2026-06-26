# Echo — Cache

Echo is the cache layer in the Ream ecosystem (`@c9up/echo`).

> Status: actively evolving. The module is converging toward stricter semantics and richer observability.

## Capabilities

- get/set/delete
- getOrSet (fetch-or-compute)
- clear
- namespaces
- tags
- pluggable drivers (`Memory`, `Redis`)

## Main API

```ts
import { CacheManager, MemoryDriver } from '@c9up/echo'

const cache = new CacheManager(new MemoryDriver())
```

### Basic operations

```ts
await cache.set('user:1', { id: 1, name: 'Ada' }, 300)

const user = await cache.get<{ id: number; name: string }>('user:1')
const hasUser = await cache.has('user:1')

await cache.delete('user:1')
await cache.clear()
```

`clear()` empties the whole cache.

### `getOrSet()` (fetch-or-compute, single-flight)

`getOrSet` returns the cached value or computes it via the factory on a miss, storing the result. Concurrent misses for the same key share a single in-flight promise (no duplicate work).

```ts
const profile = await cache.getOrSet('profile:42', 60, async () => {
  return await fetchProfileFromDb(42)
})
```

### Namespaces

`namespace(ns)` returns a cache view scoped under an extra key prefix. Every operation on the view is transparently prefixed:

```ts
const users = cache.namespace('users')
await users.set('42', { id: 42 })
await users.get('42') // reads the underlying key `users:42`
```

### Prefix and default TTL

```ts
const cache = new CacheManager(driver, {
  prefix: 'app',
  ttl: 3600,
})
```

`ttlSeconds` of `undefined`, `0`, or any negative number means "no expiration"
— `set()` and `setWithTags()` agree on this. Positive values stamp an
absolute deadline; entries past it are returned as `null` and swept by
the driver's background reaper.

## Drivers

- `MemoryDriver`: fast, local
- `RedisDriver`: shared across instances

## Tags

Drivers expose `setWithTags/flushTags` capabilities:

```ts
await cache.setWithTags('product:10', { id: 10 }, ['products', 'shop'], 120)
await cache.flushTags(['products'])
```

Both methods throw if the configured driver does not implement tag-based invalidation.

## Current limitations

- Redis `flush()` uses prefix pattern scanning (`keys`) and should be used carefully on very large datasets
- tag behavior depends on concrete driver capabilities

## Production checklist

- define key naming conventions (`domain:entity:id`)
- enforce explicit TTLs on hot keys
- use tag invalidation for domain consistency
- monitor hit/miss and driver latency

## Best practices

- define an explicit TTL policy
- avoid caching very large objects without compression
- use tag-based invalidation for critical domains
