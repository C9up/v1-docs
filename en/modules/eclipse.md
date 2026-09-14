# Eclipse — Distributed locks

Eclipse is the distributed-lock layer in the Ream ecosystem (`@c9up/eclipse`).

One name, one holder. Everything else is a store detail.

## Why

Without a shared lock, every instance of an application does everything: a nightly invoice run goes out N times, a cache miss recomputes N times, a job is processed N times. Nothing in the logs says so.

## Capabilities

- take a lease, immediately or by waiting for the current holder
- run a callback under a lease and release it automatically
- extend a lease that outlives its original window
- hand a held lease to another process (`serialize` / `restoreLock`)
- owner-checked release, so one holder cannot free another's lease
- pluggable stores (`Memory`, `Redis`)

## Configure

```ts
// config/lock.ts
import { defineConfig, stores } from '@c9up/eclipse'
import env from '#start/env'

export default defineConfig({
  default: env.get('LOCK_STORE', 'memory'),

  stores: {
    memory: stores.memory(),
    redis: stores.redis({ connection: 'main' }),
  },
})
```

```ts
// reamrc.ts
providers: [() => import('@c9up/eclipse/provider')]
```

`ream configure @c9up/eclipse` writes both files and declares `LOCK_STORE`.

## Main API

```ts
import locks from '@c9up/eclipse/services/main'
```

### Run once across every replica

`runImmediately` reports instead of waiting: the instance that loses the race does nothing at all.

```ts
const [ran, invoices] = await locks
  .createLock('invoices:nightly', '5m')
  .runImmediately(async () => generateInvoices())
```

### Wait for the holder, then proceed

`run` blocks while someone else holds the lease. This is the shape a cache stampede needs — the caller that loses the race wants to wait for the winner and then read what it wrote, not to fail.

```ts
const [, user] = await locks
  .createLock(`user:${id}`, '30s')
  .run(async () => loadAndCacheUser(id))
```

Both return `[true, result]` or `[false, null]`, so "ran and returned `undefined`" stays distinguishable from "never ran".

### Manual control

```ts
const lock = locks.createLock('import', '30s')

if (await lock.acquireImmediately()) {
  try {
    for (const batch of batches) {
      await process(batch)
      await lock.extend('30s')
    }
  } finally {
    await lock.release()
  }
}
```

Prefer a short lease plus `extend()` over a long one. A lease sized for the worst case is also how long the key stays stuck after a crash.

### Bounded waiting

```ts
const taken = await lock.acquire({
  retry: { attempts: 10, delay: '100ms', timeout: '2s' },
})
```

`acquire()` without options waits indefinitely. `timeout: 0` means "do not wait".

### Across a process boundary

```ts
const payload = lock.serialize()          // taken by the request
const restored = locks.restoreLock(payload) // released by the worker
await restored.release()
```

### Named stores

```ts
await locks.use('redis').createLock('k', '1m').acquireImmediately()
```

## Durations

A bare number is **milliseconds**. Strings take the usual units: `'500ms'`, `'30s'`, `'5m'`, `'2h'`. `null` never expires — and a lease that never expires needs `forceRelease()` to recover from a crash.

Milliseconds because a lease is measured against wall-clock time and Redis takes `PX` in milliseconds. `@c9up/echo` is seconds-native for the same reason in reverse: its drivers are. Each is native to its own layer.

## Stores

- `MemoryStore` — correct while the application runs in **one** process. Two replicas each keep their own map and will both take the same key. It is not a distributed lock.
- `RedisStore` — what a second replica needs.

### Redis through Quasar

A store can name a [Quasar](/en/modules/quasar) connection instead of being handed a client:

```ts
stores: {
  redis: stores.redis({ connection: 'main' }),
}
```

The client is resolved on the first lock, not while the config is read. `stores.redis({ client })` still works: `@c9up/quasar` is an **optional** peer, and eclipse runs without it.

## Safety

Every lease carries a random owner token, and release and extend compare it **inside** the store — on Redis, in a Lua script, so the check and the delete are one atomic step.

Without that, work that outlives its own TTL deletes the lease a *different* instance has since taken, freeing the name while work is still running under it.

Losing a lease is reported as `E_LOCK_NOT_OWNED`, uniformly across stores — whether the key is gone or held by someone else, the caller no longer owns what it thought it owned. `Lock.run` absorbs it on the way out so it cannot replace whatever your callback was throwing; a direct `release()` reports it.

## With the scheduler

```ts
// config/scheduler.ts
import { defineConfig } from '@c9up/ream/scheduler/config'
import locks from '@c9up/eclipse/services/main'
import { schedulerBackend } from '@c9up/eclipse/scheduler'

export default defineConfig({ lock: schedulerBackend(() => locks) })
```

`@c9up/ream` does not depend on eclipse. The scheduler declares a narrow two-method contract and eclipse satisfies it, so the core works with no lock package installed. This is for the application that wants **one** lock layer behind both its schedule and its own code, rather than two that expire independently.

## Errors

| Code | Raised when |
|---|---|
| `E_LOCK_NOT_OWNED` | release or extend by something that no longer holds the lease |
| `E_LOCK_STORAGE_ERROR` | the store failed while saving, reading or deleting |
| `E_ECLIPSE_INVALID_TTL` | a TTL that is not a finite positive number of milliseconds |
| `E_ECLIPSE_UNKNOWN_STORE` | a config naming a store that is not declared |

## Testing

```ts
import { fakeLocks } from '@c9up/eclipse/testing'

const restore = fakeLocks()
afterEach(restore)
```

## Production checklist

- name the Redis store in any environment that runs more than one replica — a memory store there silently locks nothing
- size TTLs by crash-recovery time, not by how long the work takes; use `extend()` for the rest
- bound `acquire()` with `retry.timeout` anywhere a request is waiting on it
- reserve `forceRelease()` for operations, not for normal flow
