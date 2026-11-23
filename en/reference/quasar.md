# quasar

`@c9up/quasar`: Redis connections for a ream application: named connections opened on first use, pub/sub on a separate socket, health checks and a clean shutdown. Guide: [Redis](/en/guides/database/redis).

## Installation

```bash
pnpm add @c9up/quasar
```

`ream configure @c9up/quasar` registers the provider, writes `config/redis.ts`, adds `REDIS_HOST`, `REDIS_PORT` and `REDIS_PASSWORD` to `.env` and declares their validation rules.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/quasar` | `defineConfig`, `QuasarManager`, `QuasarConnection`, health checks, tracing channels, `errors`, types |
| `@c9up/quasar/provider` | `QuasarProvider` (default export) |
| `@c9up/quasar/services/main` | The default manager (default export), `setQuasar`, `getQuasar`, `clearQuasar` |
| `@c9up/quasar/configure` | `configure(codemods)`, run by `ream configure` |

## Exports

### `@c9up/quasar`

| Export | Kind | Description |
|---|---|---|
| `defineConfig` | function | Types `config/redis.ts`; throws when no connection is declared or the default one is not declared. |
| `isClusterConfig` | function | `true` when a connection config is a cluster (`clusters` set). |
| `QuasarManager` | class | The declared connections, opened on demand. Redis commands called on it run on the default connection. |
| `QuasarConnection` | class | One connection: the ioredis commands, pub/sub, state and events. |
| `QuasarCheck` | class | Health check that PINGs a connection. |
| `QuasarMemoryUsageCheck` | class | Health check comparing the server's memory use with a warning and a failure threshold. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors) |
| `tracingChannels` | const | Namespace holding `redisCommand`, the `quasar.redis.command` tracing channel. |
| `QuasarConfig` | type | `{ connection: keyof Connections & string; connections: Connections }`. |
| `ConnectionConfig` | type | `StandaloneConnectionConfig \| ClusterConnectionConfig`. |
| `StandaloneConnectionConfig` | interface | ioredis `RedisOptions`, plus `url?`, `port?: string \| number`, `password?` and `sentinelPassword?` as a `Credential`. |
| `ClusterConnectionConfig` | interface | `{ clusters: ClusterNode[]; clusterOptions?: QuasarClusterOptions }`. |
| `QuasarClusterOptions` | interface | ioredis `ClusterOptions` whose `redisOptions` passwords accept a `Credential`. |
| `Credential` | type | `string \| SecretValue`. |
| `SecretValue` | interface | `{ release(): string }`: a secret as `env.get()` returns it for `Env.schema.secret()`. |
| `RedisClient` | type | `Redis \| Cluster` (ioredis). |
| `QuasarService` | interface | The manager seen structurally; the type of the service accessor. |
| `QuasarManagerEvents` | interface | `{ connection: QuasarConnection }`. |
| `QuasarConnectionEvents` | interface | Every event a connection emits, with its payload. |
| `ChannelHandler` | type | `(message: string, channel: string) => void \| Promise<void>`. |
| `PatternHandler` | type | `(channel: string, message: string, pattern: string) => void \| Promise<void>`. |
| `PubSubOptions` | interface | `{ onError?(error: unknown): void; onSubscription?(count: number): void }`. |
| `ScriptDefinition` | interface | `{ lua: string; numberOfKeys?: number; readOnly?: boolean }`. |
| `QuasarLogger` | interface | `{ error(message: string, data?: Record<string, unknown>): void }`. |
| `HealthResult` | interface | `{ message: string; status: HealthStatus; finishedAt: Date; meta?: Record<string, unknown> }`. |
| `HealthStatus` | type | `'ok' \| 'warning' \| 'error'`. |
| `CheckedConnection` | interface | What a health check reads off a connection; a `QuasarConnection` satisfies it. |
| `RedisCommandTracingData` | interface | `{ command: string; connection: string }`: the command name, never its arguments. |

### `@c9up/quasar/provider`

| Export | Kind | Description |
|---|---|---|
| `default` (`QuasarProvider`) | provider | `register()` builds the manager from the `redis` config and binds it; `boot()` hands it the container's `logger`; `shutdown()` calls `quitAll()`. |
| `QuasarAppContext` | interface | `{ container; config }`: the host the provider needs. |

### `@c9up/quasar/services/main`

| Export | Kind | Description |
|---|---|---|
| `default` | const | The seated `QuasarService`. Importing it opens nothing; a member read before a manager is seated throws. |
| `setQuasar` | function | `setQuasar(manager: QuasarService): void`: seats a manager (the provider calls it). |
| `getQuasar` | function | `getQuasar(): QuasarService \| undefined`. |
| `clearQuasar` | function | `clearQuasar(manager: QuasarService): void`: drops the seated manager if it is this one. |

### `QuasarManager`

`new QuasarManager(config: QuasarConfig<Connections>, logger?: QuasarLogger)`. Every ioredis command of the forwarded list is also a method of the manager and runs on the default connection (`redis.get('key')`).

| Member | Signature | Description |
|---|---|---|
| `connection` | `connection(name?: keyof Connections & string): QuasarConnection` | The named connection (default one without a name), opened on first use and kept. Throws for an undeclared name. |
| `defaultConnectionName` | `get defaultConnectionName(): keyof Connections & string` | The `connection` key of the config. |
| `activeConnectionNames` | `get activeConnectionNames(): string[]` | Names of the open connections. |
| `activeConnections` | `get activeConnections(): Record<string, QuasarConnection>` | The open connections. |
| `activeConnectionsCount` | `get activeConnectionsCount(): number` | How many are open. |
| `managerConfig` | `readonly managerConfig: QuasarConfig<Connections>` | The config; not enumerable, and `toJSON()` / `util.inspect` print it with credentials redacted. |
| `subscribe` | `subscribe(channel: string, handler: ChannelHandler, options?: PubSubOptions): void` | Subscribe on the default connection. Failure goes to `onError`, never to a rejection. |
| `subscribed` | `subscribed(channel: string, handler: ChannelHandler, options?: PubSubOptions): Promise<void>` | Same, resolved once the channel is live; rejects on failure. |
| `unsubscribe` | `unsubscribe(channel: string, handler?: ChannelHandler): Promise<void>` | Drop one handler, or every handler of the channel. |
| `psubscribe` | `psubscribe(pattern: string, handler: PatternHandler, options?: PubSubOptions): void` | Pattern subscription on the default connection. |
| `psubscribed` | `psubscribed(pattern: string, handler: PatternHandler, options?: PubSubOptions): Promise<void>` | Awaitable form; rejects on failure. |
| `punsubscribe` | `punsubscribe(pattern: string, handler?: PatternHandler): Promise<void>` | Drop a pattern handler. |
| `publish` | `publish(channel: string, message: string): Promise<number>` | Publish on the default connection; resolves to the receiver count. |
| `defineCommand` | `defineCommand(name: string, definition: ScriptDefinition): this` | Register a LUA script on every open connection and on those opened later. |
| `runCommand` | `runCommand(command: string, ...args: unknown[]): unknown` | Run a script registered with `defineCommand` on the default connection. |
| `useLogger` | `useLogger(logger: QuasarLogger): this` | Report connection failures through this logger. |
| `doNotLogErrors` | `doNotLogErrors(): this` | Stop logging connection errors; the application handles the `error` event. |
| `quit` | `quit(name?: keyof Connections & string): Promise<void>` | QUIT one connection, the default one without a name. |
| `disconnect` | `disconnect(name?: keyof Connections & string): Promise<void>` | Drop one connection without waiting for pending commands. |
| `quitAll` | `quitAll(): Promise<void>` | QUIT every open connection. |
| `disconnectAll` | `disconnectAll(): Promise<void>` | Drop every open connection. |
| `on` / `off` / `once` | `on('connection', listener): () => void` | Listen to each connection the manager opens; `on` returns the function that stops listening. |

### `QuasarConnection`

Every ioredis command of the forwarded list is a method of the connection (`connection.set(...)`).

| Member | Signature | Description |
|---|---|---|
| `name` / `connectionName` | `readonly name: string` | The declared connection name. |
| `status` | `get status(): RedisClient['status']` | The command socket's ioredis status. |
| `subscriberStatus` | `get subscriberStatus(): RedisClient['status'] \| undefined` | The pub/sub socket's status, `undefined` until the first subscription. |
| `lastError` / `lastSubscriberError` | `get lastError(): unknown` | Last error of each socket. |
| `isConnecting` / `isReady` / `isClosed` | `isReady(): boolean` | State of the command socket. |
| `autoPipelineQueueSize` | `get autoPipelineQueueSize(): number` | Commands waiting in the auto-pipeline. |
| `ioConnection` | `get ioConnection(): RedisClient` | The raw ioredis client. |
| `ioSubscriberConnection` | `get ioSubscriberConnection(): RedisClient \| undefined` | The raw pub/sub client, once opened. |
| `mode` / `subscribeMode` | `get mode(): Redis['mode'] \| undefined` | ioredis mode of each socket. |
| `slots` | `get slots(): Cluster['slots'] \| undefined` | Cluster slot map; `undefined` on a standalone connection. |
| `nodes` | `nodes(role?: NodeRole): Redis[]` | A cluster's nodes, or one role's; throws on a standalone connection. |
| `subscribe` / `subscribed` | as on the manager | Opens the pub/sub socket on first use. Subscribing twice stacks the handlers. |
| `psubscribe` / `psubscribed` | as on the manager | Pattern subscriptions. |
| `unsubscribe` / `punsubscribe` | as on the manager | Drop one handler, or all of a channel. |
| `publish` | `publish(channel: string, message: string): Promise<number>` | Publish on the command socket. |
| `defineCommand` / `runCommand` | as on the manager | LUA scripts on this connection. |
| `useLogger` / `doNotLogErrors` | as on the manager | Error reporting for this connection. |
| `quit` / `disconnect` | `quit(): Promise<void>` | Close both sockets; handlers are dropped. |
| `on` / `off` / `once` / `clearListeners` / `listenerCount` | `on(event, listener): () => void` | Events of `QuasarConnectionEvents`: `connect`, `wait`, `ready`, `error`, `close`, `reconnecting`, `end`, the `subscriber:*` and `node:*` events, `subscription:ready` / `subscription:error` and their `psubscription:` twins. |

### Health checks

| Member | Signature | Description |
|---|---|---|
| `new QuasarCheck` | `new QuasarCheck(connection: CheckedConnection)` | Named `Redis health check (<connection>)`. |
| `new QuasarMemoryUsageCheck` | `new QuasarMemoryUsageCheck(connection: Connection)` | Named `Redis memory consumption health check (<connection>)`. |
| `warnWhenExceeds` | `warnWhenExceeds(value: string \| number): this` | Warning threshold in bytes or as a size (`'100 mb'`). Default 100 MB. |
| `failWhenExceeds` | `failWhenExceeds(value: string \| number): this` | Failure threshold. Default 120 MB. |
| `compute` | `compute(callback: (connection: Connection) => Promise<number \| null>): this` | Measure memory another way; `null` means unreadable. |
| `as` | `as(name: string): this` | Rename the check. |
| `cacheFor` | `cacheFor(duration: string \| number): this` | Reuse a result for seconds or a duration (`'1 minute'`). |
| `run` | `run(): Promise<HealthResult>` | Never throws; a connection that is not ready is not sent a command. |

## Configuration

`config/redis.ts`, read under the `redis` key.

| Option | Type | Default | Description |
|---|---|---|---|
| `connection` | `keyof Connections & string` | — | The connection `redis.connection()` returns without a name. Must be declared. |
| `connections` | `Record<string, ConnectionConfig>` | — | At least one connection. |
| `connections.<name>.url` | `string` | — | `redis://` or `rediss://` URL; takes precedence over host and port. |
| `connections.<name>.port` | `string \| number` | — | A string is converted; a value that is not a port number is refused. |
| `connections.<name>.password` | `Credential` | — | A plain string or a `Secret`, released as the client is built. |
| `connections.<name>.<option>` | ioredis `RedisOptions` | ioredis defaults | Any other ioredis option (`host`, `db`, `keyPrefix`, `retryStrategy`…). |
| `connections.<name>.clusters` | `ClusterNode[]` | — | Seed nodes; makes the connection a cluster. |
| `connections.<name>.clusterOptions` | `QuasarClusterOptions` | — | ioredis cluster options. |

The generated `config/redis.ts` reads `REDIS_HOST`, `REDIS_PORT` and `REDIS_PASSWORD`, uses `db: 0`, and gives up reconnecting after ten attempts.

## Container bindings

| Token | Resolves to |
|---|---|
| `'quasar.redis'` | `QuasarManager<Record<string, ConnectionConfig>>` |
| `'redis'` | The same manager |

Both tokens are typed on `ContainerBindings` once `@c9up/quasar` is imported.

## Errors

| Code | Raised when |
|---|---|
| [`E_INVALID_BYTES_VALUE`](/en/reference/errors#e-invalid-bytes-value) | A memory threshold of `QuasarMemoryUsageCheck` cannot be read as a size. |
| [`E_QUASAR_MISSING_CONFIG`](/en/reference/errors#e-quasar-missing-config) | `QuasarProvider` registers and `config/redis.ts` does not exist. |
| [`E_QUASAR_INVALID_CONFIG`](/en/reference/errors#e-quasar-invalid-config) | `defineConfig` declares no connection, or names a default connection it does not declare. |
| [`E_QUASAR_INVALID_PORT`](/en/reference/errors#e-quasar-invalid-port) | A connection's `port` is not a whole number between 0 and 65535. |
| [`E_QUASAR_UNKNOWN_CONNECTION`](/en/reference/errors#e-quasar-unknown-connection) | `connection(name)` names a connection the config does not declare. |
| [`E_QUASAR_UNKNOWN_COMMAND`](/en/reference/errors#e-quasar-unknown-command) | `runCommand()` names a command never defined with `defineCommand()`, or the connection lacks a forwarded command. |
| [`E_QUASAR_NOT_A_CLUSTER`](/en/reference/errors#e-quasar-not-a-cluster) | `nodes()` is called on a standalone connection. |
| [`E_QUASAR_INVALID_DURATION`](/en/reference/errors#e-quasar-invalid-duration) | `cacheFor()` on a health check is given a duration it cannot read. |
| [`E_QUASAR_NOT_BOOTED`](/en/reference/errors#e-quasar-not-booted) | A member of `services/main` is read before `QuasarProvider` seated a manager, or before `setQuasar()`. |

Each one is a class of the `errors` namespace and a `@c9up/flare` `Exception` with status 500: branch on `error.code` or on `error instanceof errors.E_*`. The messages of the `E_QUASAR_` refusals start with `[redis]`.

## Migration

- `QuasarError` is gone: test `error.code`, or `error instanceof errors.E_QUASAR_*` with `import { errors } from '@c9up/quasar'`.
- `InvalidBytesValueError` is no longer exported: use `errors.E_INVALID_BYTES_VALUE`, which was already its alias.

## See also

- [Redis](/en/guides/database/redis)
- [Health checks](/en/guides/digging-deeper/health-checks)
