# eclipse

`@c9up/eclipse`: distributed locks: one key, one holder, with memory, Redis and SQL database stores behind one store contract. Guide: [Locks](/en/guides/digging-deeper/locks).

## Installation

```bash
pnpm add @c9up/eclipse
```

`ream configure @c9up/eclipse` registers the provider, writes `config/lock.ts` and adds `LOCK_STORE=redis` to `.env` with its validation rule. The Redis store needs `@c9up/quasar` (an optional peer) when it names a connection; the database store needs `@c9up/atlas` when it is not handed a client.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/eclipse` | `LockManager`, `LockFactory`, `Lock`, `defineConfig`, `stores`, the three stores, durations, errors, types |
| `@c9up/eclipse/provider` | `EclipseProvider` (default export) |
| `@c9up/eclipse/services/main` | The booted `LockManager` (default export), `setLocks`, `getLocks`, `clearLocks` |
| `@c9up/eclipse/scheduler` | `schedulerBackend`, the lock backend of ream's scheduler |
| `@c9up/eclipse/testing` | `fakeLocks` |
| `@c9up/eclipse/configure` | `configure(codemods)`, run by `ream configure` |

## Exports

### `@c9up/eclipse`

| Export | Kind | Description |
|---|---|---|
| `LockManager` | class | The configured stores, built on first use; creates and restores locks. |
| `LockFactory` | class | One store with the defaults its locks inherit. |
| `Lock` | class | A lease on one key, not acquired until asked. |
| `defineConfig` | function | Checks `config/lock.ts` where it is written: `stores` present, `default` a declared store. |
| `stores` | const | Store factories for a config: `memory()`, `redis(options)`, `database(options?)`. |
| `MemoryStore` | class | In-process store. Locks nothing across processes; for tests and a single process. |
| `RedisStore` | class | `SET NX PX` to take a lease, Lua scripts to release and extend only the holder's own. |
| `DatabaseStore` | class | One table on PostgreSQL, MySQL or SQLite, shared by every replica reaching the database. |
| `parseDuration` | function | `parseDuration(value: string): number`: `'30s'`, `'5m'`, `'500ms'` to milliseconds; a bare number string is milliseconds. |
| `resolveMs` | function | `resolveMs(value: Duration \| undefined, fallback: number \| null): number \| null`. |
| `assertValidTtl` | function | `assertValidTtl(ttl: number \| null): void`: throws `E_ECLIPSE_INVALID_TTL` unless finite and positive, or `null`. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors). |
| `Duration` | type | `number \| string \| null`: milliseconds, a duration string, or `null` for never expires. |
| `LockConfig` | interface | `{ default: string; stores: Record<string, StoreFactory>; retry?: RetryConfig; ttl?: Duration }`. |
| `StoreFactory` | type | `() => LockStore`. |
| `LockStore` | interface | The store contract: `save`, `delete`, `forceDelete`, `exists`, `extend`, optional `disconnect`. |
| `RetryConfig` | interface | `{ attempts?: number; delay?: Duration; timeout?: Duration }`. |
| `LockAcquireOptions` | interface | `{ retry?: RetryConfig }`. |
| `LockFactoryOptions` | interface | `{ retry?: RetryConfig; ttl?: Duration }`. |
| `ResolvedLockConfig` | interface | `LockFactoryOptions` with every value resolved to milliseconds. |
| `SerializedLock` | interface | `{ key: string; owner: string; ttl: number \| null; expirationTime: number \| null }`. |
| `RedisStoreOptions` | interface | `{ prefix?: string }`, default `'eclipse:lock:'`. |
| `LockRedisClient` | interface | The commands the Redis store sends: `set`, `evalsha`, `script`, `del`, `exists`. |
| `LockRedisResolver` | type | `LockRedisClient \| (() => LockRedisClient \| Promise<LockRedisClient>)`. |
| `DatabaseStoreOptions` | interface | `{ tableName?: string; sweepIntervalMs?: number }`. |
| `LockDatabase` | interface | `{ readonly dialect: string; rawQuery(sql: string, bindings: unknown[]): PromiseLike<readonly LockRow[]> }`. |
| `LockDatabaseSource` | type | `LockDatabase \| (() => LockDatabase \| Promise<LockDatabase>)`. |
| `LockRow` | type | `Record<string, unknown>`. |

### `@c9up/eclipse/provider`

| Export | Kind | Description |
|---|---|---|
| `default` (`EclipseProvider`) | provider | `register()` binds the `LockManager` built from the `lock` config; `boot()` seats it on `services/main`; `shutdown()` calls `disconnectAll()`. |
| `EclipseAppContext` | interface | `{ container; config }`: the host the provider needs. |

### `@c9up/eclipse/services/main`

| Export | Kind | Description |
|---|---|---|
| `default` | const | The booted `LockManager`; a member read before boot throws. |
| `setLocks` | function | `setLocks(value: LockManager): void`. |
| `getLocks` | function | `getLocks(): LockManager \| undefined`. |
| `clearLocks` | function | `clearLocks(): void`. |

### `@c9up/eclipse/scheduler`

| Export | Kind | Description |
|---|---|---|
| `schedulerBackend` | function | `schedulerBackend(manager: LockManager \| (() => LockManager), options?: SchedulerBackendOptions): SchedulerLockBackend`. Takes each task's lease with `acquireImmediately()` and renews it every third of its TTL while the task runs. |
| `SchedulerBackendOptions` | interface | `{ store?: string; prefix?: string; ttl?: Duration; onLeaseLost?: (name: string, error: Exception) => void }`. `prefix` defaults to `'schedule:'`; `ttl` overrides the scheduler's; `onLeaseLost` defaults to a process warning. |
| `SchedulerLockBackend` | interface | `{ acquire(name: string, ttlMs: number): Promise<boolean>; release(name: string): Promise<void> }`. |

### `@c9up/eclipse/testing`

| Export | Kind | Description |
|---|---|---|
| `fakeLocks` | function | `fakeLocks(container?: FakeableContainer): () => void`. Seats a memory-store `LockManager` on `services/main` and, given a container, swaps the three tokens; the returned function restores both. |
| `FakeableContainer` | interface | `{ swap(token: unknown, factory: () => unknown): void; restore(token: unknown): void }`. |

### `LockManager`

`new LockManager(config: LockConfig)`; throws on an invalid config.

| Member | Signature | Description |
|---|---|---|
| `use` | `use(name?: string): LockFactory` | The named store (default one without a name), built once. Throws `E_ECLIPSE_UNKNOWN_STORE`. |
| `createLock` | `createLock(key: string, ttl?: Duration): Lock` | A lock on the default store. |
| `restoreLock` | `restoreLock(serialized: SerializedLock): Lock` | Rebuild a lock serialized by another process. |
| `disconnectAll` | `disconnectAll(): Promise<void>` | Release what each built store opened itself; a client passed in is left open. |

### `LockFactory`

`new LockFactory(store: LockStore, options?: LockFactoryOptions)`.

| Member | Signature | Description |
|---|---|---|
| `getStore` | `getStore(): LockStore` | The store this factory leases from. |
| `createLock` | `createLock(key: string, ttl?: Duration): Lock` | A lock on `key`, not yet acquired. `ttl` bounds how long a crashed holder keeps the key. |
| `restoreLock` | `restoreLock(serialized: SerializedLock): Lock` | Rebuild a lock from `Lock.serialize()`. |

### `Lock`

| Member | Signature | Description |
|---|---|---|
| `getKey` | `getKey(): string` | The key leased. |
| `getOwner` | `getOwner(): string` | The owner token, random per lock unless restored. |
| `serialize` | `serialize(): SerializedLock` | Flatten to data for another process. |
| `isExpired` | `isExpired(): boolean` | Past its expiry; a lock without TTL never is. |
| `getRemainingTime` | `getRemainingTime(): number \| null` | Milliseconds left, at least 0; `null` without TTL. |
| `isLocked` | `isLocked(): Promise<boolean>` | Whether anyone holds the key. |
| `acquire` | `acquire(options?: LockAcquireOptions): Promise<boolean>` | Take the lock, retrying while it is held; `false` once the retry budget is spent. |
| `acquireImmediately` | `acquireImmediately(): Promise<boolean>` | Take it if free now, never wait. |
| `run` | `run<T>(callback: () => Promise<T>): Promise<[true, T] \| [false, null]>` | Acquire, run, release. Throws `E_LOCK_NOT_OWNED` when the work succeeded but the lease lapsed. |
| `runImmediately` | `runImmediately<T>(callback: () => Promise<T>): Promise<[true, T] \| [false, null]>` | `run` without waiting. |
| `release` | `release(): Promise<void>` | Release; throws `E_LOCK_NOT_OWNED` when this holder no longer owns it. |
| `forceRelease` | `forceRelease(): Promise<void>` | Release whoever holds it. |
| `extend` | `extend(duration?: Duration): Promise<void>` | Push the expiry out from now (the lock's TTL without an argument); throws `E_LOCK_NOT_OWNED`. |

### Stores

| Member | Signature | Description |
|---|---|---|
| `stores.memory` | `memory(): StoreFactory` | A `MemoryStore`. |
| `stores.redis` | `redis(options: ({ client: LockRedisClient } \| { connection?: string }) & RedisStoreOptions): StoreFactory` | A `RedisStore` on a client, or on a `@c9up/quasar` connection loaded on the first lock. |
| `stores.database` | `database(options?: { connection?: LockDatabaseSource \| string; tableName?: string }): StoreFactory` | A `DatabaseStore` on a client, an atlas connection name, or atlas' default connection. |
| `new RedisStore` | `new RedisStore(client: LockRedisResolver, options?: RedisStoreOptions)` | |
| `new DatabaseStore` | `new DatabaseStore(source: LockDatabaseSource, options?: DatabaseStoreOptions)` | Table `locks` by default, may be schema-qualified; lapsed rows are swept at most once a minute by default. |
| `new MemoryStore` | `new MemoryStore()` | |

The database store's table has `key` (primary), `owner` and `expiration` (epoch milliseconds, `NULL` never expires). The package ships the migration as `stubs/database/migrations/9200_create_locks.stub`.

## Configuration

`config/lock.ts`, read under the `lock` key.

| Option | Type | Default | Description |
|---|---|---|---|
| `default` | `string` | — | The store `createLock()` uses. The generated config reads `LOCK_STORE`. |
| `stores` | `Record<string, StoreFactory>` | — | Named stores, built on first use. |
| `ttl` | `Duration` | `30s` | Lease length when `createLock` names none; `null` never expires. |
| `retry.attempts` | `number` | `Infinity` | Attempts of a blocking `acquire()`. |
| `retry.delay` | `Duration` | `250ms` | Wait between attempts. |
| `retry.timeout` | `Duration` | none | Total time budget of `acquire()`; `0` means do not wait. |

The generated config declares `memory: stores.memory()` and `redis: stores.redis({ connection: 'main' })`.

## Container bindings

| Token | Resolves to |
|---|---|
| `LockManager` (class) | The `LockManager` built from `config/lock.ts` |
| `'eclipse.lock'` | The same manager |
| `'lock'` | The same manager |

The two string tokens are typed on `ContainerBindings` once `@c9up/eclipse` is imported.

## Errors

| Code | Raised when |
|---|---|
| [`E_LOCK_NOT_OWNED`](/en/reference/errors#e-lock-not-owned) | `release()` or `extend()` by a holder that no longer owns the lock, or `run()` whose work outlived the lease. |
| [`E_LOCK_STORAGE_ERROR`](/en/reference/errors#e-lock-storage-error) | The store failed while saving, reading or deleting. |
| [`E_ECLIPSE_INVALID_TTL`](/en/reference/errors#e-eclipse-invalid-ttl) | A TTL is not a finite positive number of milliseconds, or `null`. |
| [`E_ECLIPSE_INVALID_DURATION`](/en/reference/errors#e-eclipse-invalid-duration) | A duration string cannot be read. |
| [`E_ECLIPSE_INVALID_RETRY`](/en/reference/errors#e-eclipse-invalid-retry) | A `retry` option is out of range. |
| [`E_ECLIPSE_INVALID_CONFIG`](/en/reference/errors#e-eclipse-invalid-config) | The config lacks `stores` or `default`, or is not a lock config. |
| [`E_ECLIPSE_MISSING_CONFIG`](/en/reference/errors#e-eclipse-missing-config) | `config/lock.ts` is missing. |
| [`E_ECLIPSE_UNKNOWN_STORE`](/en/reference/errors#e-eclipse-unknown-store) | `default` or `use(name)` names a store that is not declared. |
| [`E_ECLIPSE_QUASAR_MISSING`](/en/reference/errors#e-eclipse-quasar-missing) | A Redis store names a connection and `@c9up/quasar` is not installed. |
| [`E_ECLIPSE_INCOMPLETE_CONNECTION`](/en/reference/errors#e-eclipse-incomplete-connection) | The quasar connection lacks a command the Redis store sends. |
| [`E_ECLIPSE_DATABASE_UNAVAILABLE`](/en/reference/errors#e-eclipse-database-unavailable) | A database store asks for atlas, which is not installed or has not booted. |
| [`E_ECLIPSE_UNSUPPORTED_DATABASE`](/en/reference/errors#e-eclipse-unsupported-database) | A database store was given a dialect other than PostgreSQL, MySQL or SQLite. |
| [`E_ECLIPSE_NOT_BOOTED`](/en/reference/errors#e-eclipse-not-booted) | `services/main` was used before `EclipseProvider.boot()` or `setLocks()`. |
| [`E_ECLIPSE_INVALID_BINDING`](/en/reference/errors#e-eclipse-invalid-binding) | The container resolved the `LockManager` token to something that is not a `LockManager`. |

Each one is a class of `errors`, a flare `Exception`: read `error.code`, or test `error instanceof errors.E_LOCK_NOT_OWNED`.

## Migration

- `EclipseError` is gone: test `error.code`, or `instanceof` a class of `errors`.
- The classes are named by their code: `LockNotOwnedError` is `errors.E_LOCK_NOT_OWNED`, `LockStorageError` is `errors.E_LOCK_STORAGE_ERROR`, `InvalidTtlError` is `errors.E_ECLIPSE_INVALID_TTL`, `InvalidRetryError` is `errors.E_ECLIPSE_INVALID_RETRY`, `InvalidDurationError` is `errors.E_ECLIPSE_INVALID_DURATION`, `MissingConfigError` is `errors.E_ECLIPSE_MISSING_CONFIG`, `InvalidConfigError` is `errors.E_ECLIPSE_INVALID_CONFIG`, `UnknownStoreError` is `errors.E_ECLIPSE_UNKNOWN_STORE`.
- `E_LOCK_NOT_OWNED` and `E_LOCK_STORAGE_ERROR` now carry the messages of the lock module they come from: "Looks like you are trying to update or release a lock that is not acquired by you" and "Lock storage error: `<reason>`". The lock's name is on `error.key`, and the failed store operation on `error.operation`; build them as `new errors.E_LOCK_NOT_OWNED(undefined, { key })` and `new errors.E_LOCK_STORAGE_ERROR([reason], { operation })`.

## See also

- [Locks](/en/guides/digging-deeper/locks)
- [Scheduling](/en/guides/digging-deeper/scheduling)
- [quasar reference](/en/reference/quasar)
