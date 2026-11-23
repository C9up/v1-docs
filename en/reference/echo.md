# echo

`@c9up/echo`: a cache with named stores, one or two layers (memory, Redis), grace periods, timeouts, single-flight factories and tags. Guide: [Cache](/en/guides/digging-deeper/cache).

## Installation

```bash
pnpm add @c9up/echo
ream configure @c9up/echo
```

`ream configure @c9up/echo` adds `CACHE_STORE=memory` to the environment, registers the provider and the `@c9up/echo/commands` module, and writes `config/cache.ts`. A Redis store needs `@c9up/quasar`, an optional peer dependency.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/echo` | `CacheManager`, the store builder, the drivers, `defineConfig`, the duration helpers, the errors and the types. |
| `@c9up/echo/provider` | `EchoProvider` (default export). |
| `@c9up/echo/services/main` | The booted `CacheManager` (default export), plus `setCache`, `getCache`, `clearCache`. Reading it before boot throws `E_ECHO_NOT_BOOTED`. |
| `@c9up/echo/configure` | `configure(codemods)`, run by `ream configure @c9up/echo`. |
| `@c9up/echo/commands` | The `cache:clear`, `cache:delete` and `cache:prune` commands (`getMetaData`, `getCommand`). |
| `@c9up/echo/testing` | `createTestCache` for unit tests. |

## Exports

### `@c9up/echo`

| Export | Kind | Description |
|---|---|---|
| `defineConfig` | function | `defineConfig<T extends EchoProviderConfig \| MultiStoreConfig>(config: T): T`. Returns the config unchanged. |
| `store` | function | `store(options?: Omit<StoreConfig, 'driver'>): Store`: starts describing a store. |
| `Store` | class | Store builder: `useL1Layer`, `useL2Layer`, `useBus`. |
| `drivers` | const | Driver factories: `memory`, `redis`, `redisBus`, `tiered`. |
| `CacheManager` | class | One store: reads, writes, `getOrSet`, tags, namespaces, events. |
| `CacheStoreManager` | class | Every store of a `{ default, stores }` config, built on first use. |
| `MemoryDriver` | class | In-process driver with TTL, grace, tags and LRU bounds. |
| `RedisDriver` | class | Redis driver with tags. |
| `TieredDriver` | class | L1 in front of L2, with an optional bus. |
| `isBusMessage` | function | `isBusMessage(value: unknown): value is BusMessage`. |
| `parseDuration` | function | `parseDuration(value: string): number`: `'5m'`, `'300s'`, `'500ms'` to seconds; a bare number is seconds. |
| `resolveTtlSeconds` | function | `resolveTtlSeconds(ttl: Duration \| undefined, defaultSeconds: number): number`. `null`, `0` and `Infinity` mean no expiry (`0`); a negative TTL stays negative (already expired). |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors). Upstream's `errors.E_FACTORY_ERROR`, `E_FACTORY_SOFT_TIMEOUT`, `E_FACTORY_HARD_TIMEOUT`, `E_UNDEFINED_VALUE`, `E_L2_CACHE_ERROR` keep their names and messages. `E_FACTORY_ERROR` carries `key` and `isBackgroundFactory`, `E_FACTORY_SOFT_TIMEOUT`, `E_FACTORY_HARD_TIMEOUT` and `E_ECHO_LOCK_TIMEOUT` carry `key`, `E_L2_CACHE_ERROR` carries `operation`. |
| `CacheConfig` | interface | Options of one `CacheManager`; see [Configuration](#configuration). |
| `EchoProviderConfig` | interface | `CacheConfig` plus `driver?: 'memory'`: the single-store form of `config/cache.ts`. |
| `MultiStoreConfig` | interface | `{ default: string; ttl?: Duration; stores: Record<string, StoreConfig \| Store>; emitter?: CacheEmitter }`. |
| `StoreConfig` | interface | `{ driver: DriverFactory }` plus the store options. |
| `DriverFactory` | type | `(context?: DriverContext) => CacheDriver`. |
| `DriverContext` | interface | `{ store: string }`, the store's key in the config. |
| `CacheDriver` | interface | The driver contract: `get`, `set`, `delete`, `flush(prefix?)`, `has`, and optional `getEntry`, `setEntry`, `connect`, `prune`, `disconnect`. |
| `TaggableDriver` | interface | `CacheDriver` plus `setWithTags`, `deleteByTag`, `flushTags`. |
| `CacheEntry` | interface | `{ value: T; stale: boolean; expiresAt?: number; tags?: string[] }`. |
| `MemoryDriverOptions` | interface | See [Drivers](#drivers). |
| `RedisClient` | interface | The Redis commands the driver calls (`get`, `set`, `del`, `exists`, `keys`, `sadd`, `srem`, `smembers`, `expire`, `persist`, `ttl`, optional `scan`). |
| `TieredDriverOptions` | interface | `{ l1: CacheDriver; l2: CacheDriver; bus?: CacheBus; suppressL2Errors?: boolean; l2CircuitBreakerDuration?: Duration; store?: string }`. |
| `CacheBus` | interface | `publish(message)`, `subscribe(handler)`, optional `unsubscribe(handler)`. |
| `BusMessage` | interface | `{ type: 'delete' \| 'clear'; keys: string[]; … }`. |
| `Duration` | type | `number \| string \| null`: seconds, or `'30s'`, `'10m'`, `'1h'`, `'2d'`, `'1w'`. |
| `Factory` | type | `() => T \| Promise<T>`. |
| `DefaultValue` | type | `T \| (() => T)`. |
| `GetOptions` | interface | `{ key: string; defaultValue?: DefaultValue<T>; grace?: Duration }`. |
| `SetOptions` | interface | `{ key: string; value: unknown; ttl?: Duration; grace?: Duration; tags?: string[] }`. |
| `GetOrSetOptions` | interface | See [`getOrSet`](#getorset). |
| `GetOrSetForeverOptions` | type | `Omit<GetOrSetOptions<T>, 'ttl'>`. |
| `DeleteOptions`, `HasOptions`, `ExpireOptions` | interface | `{ key: string }`. |
| `DeleteManyOptions` | interface | `{ keys: string[] }`. |
| `DeleteByTagOptions` | interface | `{ tags: string[] }`. |
| `CacheEventMap` | interface | Payload of each event; see [Events](#events). |
| `CacheEmitter` | interface | `{ emit(event: string, payload: unknown): unknown }`: any emitter fits. |

### `CacheManager`

| Member | Signature | Description |
|---|---|---|
| constructor | `new CacheManager(driver: CacheDriver, config?: CacheConfig)` | |
| `name` | `get name(): string` | The store name events report. |
| `get` | `get<T = unknown>(key: string): Promise<T \| undefined>` | Also `get(options: GetOptions<T>)`. `defaultValue` answers a miss; `grace` lets a stale value answer. |
| `set` | `set(key: string, value: unknown, ttlSeconds?: number): Promise<void>` | Also `set(options: SetOptions)`. `null` and `undefined` are refused. |
| `setForever` | `setForever(options: Omit<SetOptions, 'ttl'>): Promise<void>` | Never expires. |
| `getOrSet` | `getOrSet<T>(key: string, ttlSeconds: number, factory: Factory<T>): Promise<T>` | Also `getOrSet(options: GetOrSetOptions<T>)`. One factory runs per key; concurrent callers wait for it. |
| `getOrSetForever` | `getOrSetForever<T>(options: GetOrSetForeverOptions<T>): Promise<T>` | |
| `has` / `missing` | `has(key: string): Promise<boolean>` | Also take `HasOptions`. |
| `pull` | `pull<T = unknown>(key: string): Promise<T \| undefined>` | Reads and deletes. |
| `delete` | `delete(key: string): Promise<boolean>` | Also `delete(options: DeleteOptions)`. |
| `deleteMany` | `deleteMany(keysOrOptions: string[] \| DeleteManyOptions): Promise<boolean>` | |
| `expire` | `expire(keyOrOptions: string \| ExpireOptions): Promise<boolean>` | Marks the key stale now and keeps it for its grace period; without grace, deletes it. |
| `clear` | `clear(): Promise<void>` | Clears the store, or only this namespace. |
| `setWithTags` | `setWithTags(key: string, value: unknown, tags: string[], ttlSeconds?: number): Promise<void>` | |
| `deleteByTag` | `deleteByTag(tags: string[]): Promise<void>` | Also `deleteByTag(options: DeleteByTagOptions)`. `flushTags(tags)` is a deprecated alias. |
| `namespace` | `namespace(ns: string): CacheManager` | A view under an extra key prefix; shares the driver, the defaults and the single-flight state. |
| `use` | `use(name?: string): CacheManager` | A named store of the config. Throws when the manager owns a single store and a name is given. |
| `on` / `once` | `on<E extends keyof CacheEventMap>(event: E, listener: (payload: CacheEventMap[E]) => void): this` | A listener that throws is ignored. |
| `off` | `off<E extends keyof CacheEventMap>(event: E, listener?: (payload: CacheEventMap[E]) => void): this` | Without a listener, drops them all. |
| `prune` | `prune(): Promise<void>` | Drops expired entries, for drivers that do not evict on their own. |
| `connect` / `connectAll` | `connect(): Promise<void>` | Opens what the driver needs outside the process (a bus subscription); `connectAll` covers every store. |
| `disconnect` / `disconnectAll` | `disconnect(): Promise<void>` | Releases what the driver owns. An injected Redis client is not closed. |

#### `getOrSet`

| `GetOrSetOptions` | Type | Description |
|---|---|---|
| `key` | `string` | |
| `factory` | `Factory<T>` | Computes the value on a miss. |
| `ttl` | `Duration` | Freshness of the value. |
| `grace` | `Duration` | How long a stale value is kept to answer when the factory fails or is slow. |
| `graceBackoff` | `Duration` | After a failed factory, how long the stale value counts as fresh. `'10s'` by default; `0` or `null` retries on the next call. |
| `timeout` | `Duration` | Soft timeout: on a stale hit, answer the stale value if the factory is slower, and refresh in the background. |
| `hardTimeout` | `Duration` | Reject with `E_FACTORY_HARD_TIMEOUT` past it. |
| `lockTimeout` | `Duration` | How long to wait for another caller's factory of the same key; then the stale value, or `E_ECHO_LOCK_TIMEOUT`. |
| `tags` | `string[]` | |
| `onFactoryError` | `(error: errors.E_FACTORY_ERROR) => void` | Told of every factory failure, foreground and background. |

### `CacheStoreManager`

| Member | Signature | Description |
|---|---|---|
| constructor | `new CacheStoreManager(config: MultiStoreConfig)` | |
| `defaultStoreName` | `get defaultStoreName(): string` | |
| `use` | `use(name?: string): CacheManager` | A store by name, or the default; built once. |
| `on` / `once` / `off` | as on `CacheManager` | Across every store, including ones not built yet. |
| `clearAll` | `clearAll(): Promise<void>` | Clears every configured store. |
| `prune` | `prune(): Promise<void>` | Prunes every configured store. |
| `connectAll` / `disconnectAll` | `connectAll(): Promise<void>` | Every built store. |

### `Store`

| Member | Signature | Description |
|---|---|---|
| constructor | `new Store(options?: Omit<StoreConfig, 'driver'>)` | |
| `useL1Layer` | `useL1Layer(driver: DriverFactory): this` | The fast layer, usually memory. |
| `useL2Layer` | `useL2Layer(driver: DriverFactory): this` | The shared layer, usually Redis. |
| `useBus` | `useBus(bus: CacheBus): this` | Keeps every instance's L1 in step after a write; needs two layers. |
| `entry` | `entry(): StoreConfig` | The `{ driver, …options }` the manager reads. Throws `E_ECHO_INVALID_CONFIG` without a layer, or with a bus on one layer. |

### Drivers

| Factory | Signature | Description |
|---|---|---|
| `drivers.memory` | `memory(options?: MemoryDriverOptions): DriverFactory` | |
| `drivers.redis` | `redis(options: { client: RedisClient; prefix?: string } \| { connection?: string; prefix?: string }): DriverFactory` | A client, or a quasar connection name, loaded on the first command. |
| `drivers.redisBus` | `redisBus(options?: { connection?: string; channel?: string }): CacheBus` | Redis pub/sub as the bus. |
| `drivers.tiered` | `tiered(options: { l1: DriverFactory; l2: DriverFactory } & Omit<TieredDriverOptions, 'l1' \| 'l2'>): DriverFactory` | What `Store` builds from two layers. |

| `MemoryDriverOptions` | Type | Default | Description |
|---|---|---|---|
| `sweepIntervalMs` | `number` | `60000` | How often expired entries are swept. |
| `maxItems` | `number` | `1000` | Entries held before the least recently used goes; `0` or `Infinity` for no ceiling. |
| `maxSize` | `number \| string` | none | Total size of the values (bytes or `'10mb'`); needs `serialize`. |
| `maxEntrySize` | `number \| string` | `maxSize` | Largest single value; a bigger one is not stored and the key's old value goes. |
| `serialize` | `boolean` | `true` | Store JSON and return copies; `false` keeps references. |

`new MemoryDriver(options?)`, `new RedisDriver(source: RedisClient \| (() => RedisClient \| Promise<RedisClient>), prefix?: string)` and `new TieredDriver(options: TieredDriverOptions)` build a driver directly. `MemoryDriver#destroy()` stops the sweep timer. In a two-layer store, `suppressL2Errors` (default `true`) turns a failed L2 read into a miss and a failed L2 write into a skip; invalidations report a failed L2 either way. `l2CircuitBreakerDuration` skips a failing L2 for that long.

### Events

| Event | Payload |
|---|---|
| `cache:hit` | `{ key, value, store, graced: boolean, duration }` |
| `cache:miss` | `{ key, store, duration }` |
| `cache:written` | `{ key, value, store, ttl: number \| null, duration }` |
| `cache:deleted` | `{ key, store, duration }` |
| `cache:cleared` | `{ store, duration }` |
| `cache:expire` | `{ key, store, duration }` |

`duration` is in milliseconds. The provider sends the events through the container's `emitter` binding when there is one.

### `@c9up/echo/testing`

| Export | Kind | Description |
|---|---|---|
| `createTestCache` | function | `createTestCache(options?: CreateTestCacheOptions): TestCache`: an isolated memory cache that records its events. |
| `CreateTestCacheOptions` | interface | `{ prefix?: string; ttl?: number; grace?: Duration; name?: string }`; `name` is `'test'` by default. |
| `TestCache` | interface | `{ cache: CacheManager; driver: MemoryDriver; events: RecordedEvent[]; dispose(): void }`. Call `dispose()` after each test. |
| `RecordedEvent` | interface | `{ event: string; payload: unknown }`. |

### Commands

| Command | Arguments and flags | Description |
|---|---|---|
| `cache:clear` | `[store]`, `--namespace` (`-n`), `--tags` (`-t`), `--force` | Clears a store, a namespace or tags. Asks for confirmation in production unless `--force`. |
| `cache:delete` | `<key> [store]` | Deletes one entry. Asks for confirmation in production. |
| `cache:prune` | `[store]` | Removes expired entries, for stores without native TTL. |

## Configuration

`config/cache.ts` exports `defineConfig({ default, stores })`; the single-store form `{ prefix, ttl, … }` builds one memory store. Stores are built on first use, so a Redis store that is never used opens no connection.

| Option | Type | Default | Description |
|---|---|---|---|
| `default` | `string` | (required) | The store `cache` resolves to. |
| `stores` | `Record<string, StoreConfig \| Store>` | (required) | `store()` builders, or `{ driver: drivers.memory(), … }`. |
| `ttl` | `Duration` | `3600` (seconds) | TTL every store inherits. |
| `emitter` | `CacheEmitter` | the container's `emitter` | Shared emitter for every store's events. |

Options of a store (`store(options)`) and of a `CacheConfig`:

| Option | Type | Default | Description |
|---|---|---|---|
| `prefix` | `string` | `''` | Prefix of every key. |
| `ttl` | `Duration` | `3600` (seconds) | Freshness of an entry. |
| `grace` | `Duration` | none | Default grace period. |
| `graceBackoff` | `Duration` | `'10s'` | See `getOrSet`. |
| `timeout` | `Duration` | none | Default soft timeout of `getOrSet`. |
| `hardTimeout` | `Duration` | none | Default hard timeout of `getOrSet`. |
| `lockTimeout` | `Duration` | none | Default single-flight wait. |
| `suppressL2Errors` | `boolean` | `true` | Two-layer stores only. |
| `l2CircuitBreakerDuration` | `Duration` | off | Two-layer stores only. |
| `name` | `string` | `'default'` | `CacheConfig` only: the store name events report. |

## Container bindings

| Token | Resolves to |
|---|---|
| `CacheManager` (class), `'echo.cache'`, `'cache'` | The default store's `CacheManager`; `use(name)` reaches the others. |

The string tokens are declared on `ContainerBindings`. The provider publishes the cache on `services/main` at boot and opens the drivers' connections (a bus subscription) when the application is ready.

## Errors

| Code | Raised when |
|---|---|
| [`E_FACTORY_ERROR`](/en/reference/errors#e-factory-error) | The factory of `getOrSet()` threw; `cause` holds its error. |
| [`E_FACTORY_SOFT_TIMEOUT`](/en/reference/errors#e-factory-soft-timeout) | Not raised: at the soft timeout echo serves the stale value. Exported for code that tests it. |
| [`E_FACTORY_HARD_TIMEOUT`](/en/reference/errors#e-factory-hard-timeout) | The factory did not finish within its hard timeout. |
| [`E_UNDEFINED_VALUE`](/en/reference/errors#e-undefined-value) | A `null` or `undefined` value was written (`null` is refused too, on purpose). |
| [`E_L2_CACHE_ERROR`](/en/reference/errors#e-l2-cache-error) | A two-layer store's L2 failed and the failure is not suppressed. |
| [`E_ECHO_LOCK_TIMEOUT`](/en/reference/errors#e-echo-lock-timeout) | A caller waited too long for another caller's factory of the same key, with no stale value. |
| [`E_ECHO_INVALID_ARGUMENT`](/en/reference/errors#e-echo-invalid-argument) | A method was given an argument it cannot work with. |
| [`E_ECHO_INVALID_DURATION`](/en/reference/errors#e-echo-invalid-duration) | A duration is neither a number nor a readable string. |
| [`E_ECHO_INVALID_CONFIG`](/en/reference/errors#e-echo-invalid-config) | A config value cannot be read, or a store has no layer. |
| [`E_ECHO_UNKNOWN_STORE`](/en/reference/errors#e-echo-unknown-store) | A store name, or the default store, is not declared in `stores`. |
| [`E_ECHO_UNSUPPORTED_DRIVER`](/en/reference/errors#e-echo-unsupported-driver) | The single-store config names a driver other than `memory`. |
| [`E_ECHO_NOT_TAGGABLE`](/en/reference/errors#e-echo-not-taggable) | Tag invalidation on a driver without tags. |
| [`E_ECHO_SCAN_UNSUPPORTED`](/en/reference/errors#e-echo-scan-unsupported) | `flush()` on a Redis client without `scan()`. |
| [`E_ECHO_UNSERIALIZABLE_VALUE`](/en/reference/errors#e-echo-unserializable-value) | The memory driver stores JSON and the value has none; pass `serialize: false`. |
| [`E_ECHO_QUASAR_MISSING`](/en/reference/errors#e-echo-quasar-missing) | A Redis store was configured and `@c9up/quasar` is not installed. |
| [`E_ECHO_INCOMPLETE_CONNECTION`](/en/reference/errors#e-echo-incomplete-connection) | The quasar connection lacks `publish()` or `subscribe()`. |
| [`E_ECHO_NOT_BOOTED`](/en/reference/errors#e-echo-not-booted) | `services/main` was used before `EchoProvider.boot()` or `setCache()`. |
| [`E_ECHO_BUS_SUBSCRIBE_FAILED`](/en/reference/errors#e-echo-bus-subscribe-failed) | The quasar cache bus reported a subscribe failure that is not an `Error`; `cause` holds what it reported. |

Each one is a class of `errors`, a flare `Exception`: read `error.code`, or test `error instanceof errors.E_ECHO_LOCK_TIMEOUT`.

## Migration

- `EchoError` is gone: test `error.code`, or `instanceof` a class of `errors`.
- The classes are named by their code: `FactoryError` is `errors.E_FACTORY_ERROR`, `TimeoutError` is `errors.E_FACTORY_HARD_TIMEOUT`, `LockTimeoutError` is `errors.E_ECHO_LOCK_TIMEOUT`, `L2CacheError` is `errors.E_L2_CACHE_ERROR`, `UndefinedValueError` is `errors.E_UNDEFINED_VALUE`, `InvalidArgumentError` is `errors.E_ECHO_INVALID_ARGUMENT`, `InvalidDurationError` is `errors.E_ECHO_INVALID_DURATION`.
- None of them extends `TypeError` any more: replace `instanceof TypeError` with the code.
- `E_FACTORY_ERROR`, `E_FACTORY_HARD_TIMEOUT`, `E_UNDEFINED_VALUE` and `E_L2_CACHE_ERROR` now carry the cache module's messages ("Factory has thrown an error", "Factory has timed out after waiting for hard timeout", "Cannot set undefined value in the cache, key: `<key>`", "An error occurred while interacting with the L2 cache"): read `cause`, `key` and `operation` instead of parsing the message. Their constructors are `(key, cause, isBackground?)`, `(key)`, `(key)` and `(cause, { operation }?)`.
- `errors.E_FACTORY_SOFT_TIMEOUT` is new.

## See also

- [Cache](/en/guides/digging-deeper/cache)
- [Redis](/en/guides/database/redis)
- [quasar](/en/reference/quasar)
