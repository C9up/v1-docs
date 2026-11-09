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

`clear()` empties the whole cache. On a namespace view it empties only that namespace.

### `getOrSet()` (fetch-or-compute, single-flight)

`getOrSet` returns the cached value or computes it via the factory on a miss, storing the result. Concurrent misses for the same key share a single in-flight promise (no duplicate work).

```ts
const profile = await cache.getOrSet('profile:42', 60, async () => {
  return await fetchProfileFromDb(42)
})
```

`lockTimeout` bounds how long a caller waits on another caller's factory for the same key. Past it, the stale value is returned when there is one (grace), and a `LockTimeoutError` (`E_ECHO_LOCK_TIMEOUT`) is thrown when there is not. `hardTimeout` bounds the factory itself. A timeout of `Infinity` means none; a longer one than 24.8 days is clamped to that; `NaN` or a negative one is refused.

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

A TTL is a number of seconds or a duration string (`'500ms'`, `'10m'`):

| TTL | Meaning |
| --- | --- |
| omitted | the store's default |
| `null`, `0`, `Infinity` | never expires |
| positive | expires after that long |
| negative | already expired: nothing is stored, and the key's previous value is dropped (with a grace period, a stale copy is kept for the grace window) |
| `NaN` | refused with `E_ECHO_INVALID_DURATION` |

Entries past their TTL read back as `undefined` — a miss — and are swept by
the driver's background reaper.

## Drivers

- `MemoryDriver`: fast, local
- `RedisDriver`: shared across instances

### Memory driver

```ts
drivers.memory({ maxItems: 1000, maxSize: '50mb', maxEntrySize: '1mb' })
```

- **Bounded by default**: 1000 entries unless `maxItems` says otherwise (`0` or `Infinity` for no ceiling). Past it, the least recently **used** entry goes — a read counts as a use.
- `maxSize` bounds the total size of the stored values and `maxEntrySize` a single one, in bytes or as `'10mb'`. A value over `maxEntrySize` is not stored, and the key's previous value is dropped.
- **Values are copies**: they are stored as JSON, the way the Redis driver stores them, so mutating a value you read never changes what the next reader gets, and a value reads back the same in development and in production. `serialize: false` keeps references instead — faster, and class instances survive, but a reader that mutates its value changes it for everyone. The byte bounds need serialization.

### Redis driver

Values live under `<prefix>v:<key>`, tag sets under `<prefix>t:<tag>` and per-key tag indexes under `<prefix>m:<key>`, so no cache key can reach the bookkeeping. An empty `prefix` falls back to the default `cache:`. TTLs are written in milliseconds, so `'500ms'` works. A value under the prefix that echo did not write reads as a miss.

### Two layers, and an L2 outage

A store with an L1 and an L2 keeps serving from L1 and the factory when the L2 fails: a failed L2 read is a miss, a failed L2 write is skipped (and no peer is told to drop its copy).

```ts
store({ suppressL2Errors: true, l2CircuitBreakerDuration: '10s' })
  .useL1Layer(drivers.memory())
  .useL2Layer(drivers.redis({ connection: 'main' }))
```

- `suppressL2Errors` (default `true`): `false` surfaces each L2 failure as an `L2CacheError` (`E_L2_CACHE_ERROR`, the original error as `cause`).
- `l2CircuitBreakerDuration`: after a failure, skip the L2 for that long instead of waiting on a dead server for every call.
- `delete`, `clear` and `deleteByTag` always report a failed L2, breaker or not: a removal that did not reach the shared layer leaves the value served to every other instance, and the caller has to know.

Bus messages carry the store's name, so stores sharing a channel leave each other's L1 alone; a message that is not a well-formed invalidation is ignored.

## Tags

Drivers expose `setWithTags/flushTags` capabilities:

```ts
await cache.setWithTags('product:10', { id: 10 }, ['products', 'shop'], 120)
await cache.flushTags(['products'])
```

Both methods throw if the configured driver does not implement tag-based invalidation.

Tags belong to the namespace that wrote them: `tenantA.deleteByTag(['user:1'])` leaves `tenantB`'s entries tagged `user:1` alone, and a root-level `deleteByTag` does not reach into namespaces.

## Current limitations

- Redis `flush()` walks a `SCAN` cursor over the prefix — never `KEYS`, which blocks the server. It still touches every prefixed key, so it stays a heavy operation on a large dataset; it throws on a client without `scan` rather than falling back to `KEYS`
- tag behavior depends on concrete driver capabilities

## Errors

Every error carries a `code`:

| Code | Raised when |
| --- | --- |
| `E_FACTORY_ERROR` | a `getOrSet` factory threw (`FactoryError`, passed to `onFactoryError`) |
| `E_FACTORY_HARD_TIMEOUT` | a factory exceeded `hardTimeout` (`TimeoutError`) |
| `E_UNDEFINED_VALUE` | caching `null` or `undefined` |
| `E_L2_CACHE_ERROR` | an L2 failure that is not suppressed |
| `E_ECHO_LOCK_TIMEOUT` | `lockTimeout` passed with no stale value |
| `E_ECHO_INVALID_DURATION` | a duration that means nothing (`NaN`, `'5 fortnights'`) |
| `E_ECHO_INVALID_CONFIG` | a store or driver option that cannot work |
| `E_ECHO_UNKNOWN_STORE` | `use()` names a store that is not configured |
| `E_ECHO_NOT_TAGGABLE` | tags on a driver without tag support |
| `E_ECHO_UNSERIALIZABLE_VALUE` | a value with no JSON form on a serializing memory driver |
| `E_ECHO_SCAN_UNSUPPORTED` | clearing Redis through a client without `SCAN` |
| `E_ECHO_NOT_BOOTED` | `services/main` read before the provider booted |
| `E_ECHO_QUASAR_MISSING`, `E_ECHO_INCOMPLETE_CONNECTION` | a named Redis connection that cannot be used |

`errors` maps `E_FACTORY_ERROR`, `E_FACTORY_HARD_TIMEOUT`, `E_UNDEFINED_VALUE` and `E_L2_CACHE_ERROR` to their classes.

## Commands

`ream configure @c9up/echo` registers `@c9up/echo/commands`:

```sh
ream cache:clear                       # the default store
ream cache:clear redis --namespace=users
ream cache:clear --tags=products --tags=shop
ream cache:delete user:42 [store]
ream cache:prune [store]
```

`--namespace` and `--tags` cannot be combined. In production each command asks before it runs; `cache:clear --force` skips the question.

## Production checklist

- define key naming conventions (`domain:entity:id`)
- enforce explicit TTLs on hot keys
- use tag invalidation for domain consistency
- monitor hit/miss and driver latency

## Best practices

- define an explicit TTL policy
- avoid caching very large objects without compression
- use tag-based invalidation for critical domains

## Redis through Quasar

A store can name a [Quasar](/en/modules/quasar) connection instead of being handed a client. The Redis module then owns the socket:

```ts
stores: {
  redis: { driver: drivers.redis({ connection: 'cache' }) },
}
```

The client is resolved on the first command, not while the config is read, so declaring a store never dials on its own. `drivers.redis({ client })` still works: `@c9up/quasar` is an **optional** peer, and echo runs without it.

## Listening to the cache

```ts
cache.on('cache:miss', ({ key, store }) => metrics.miss(store, key))
cache.once('cache:hit', logFirstHit)
cache.off('cache:miss', handler)
```

Registered on the store manager, a listener also reaches stores built **later** —
stores are lazy, so one registered at boot would otherwise miss every store not
yet touched. A listener that throws is swallowed: it observes the operation, it
does not get to fail it.

## Pruning and disconnecting

```ts
await cache.prune()          // drop known-expired entries now
await cache.disconnectAll()  // from a shutdown hook
```

A driver built on an **injected** client deliberately does not disconnect it:
echo did not open that connection, and quasar owns it.
