# bay

`@c9up/bay`: background jobs: job classes dispatched onto named queues and run by a worker, with memory and Redis drivers behind one driver contract. Guide: [Queues](/en/guides/digging-deeper/queues).

## Installation

```bash
pnpm add @c9up/bay
```

`ream configure @c9up/bay` registers the provider and the `@c9up/bay/commands` commands, writes `config/queue.ts` and adds `QUEUE_DRIVER=memory` to `.env` with its validation rule. The Redis driver needs `@c9up/quasar` (an optional peer) when it names a connection.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/bay` | `Job`, `QueueManager`, dispatchers, `defineConfig`, `drivers`, the two drivers, backoff helpers, types |
| `@c9up/bay/provider` | `BayProvider` (default export) |
| `@c9up/bay/services/main` | The booted `QueueManager` (default export), `setQueue`, `getQueue`, `clearQueue` |
| `@c9up/bay/testing` | `FakeQueue` |
| `@c9up/bay/commands` | The `queue:work` and `make:job` commands |
| `@c9up/bay/configure` | `configure(codemods)`, run by `ream configure` |

## Exports

### `@c9up/bay`

| Export | Kind | Description |
|---|---|---|
| `Job` | class | Abstract base of a job class: `execute()`, optional `failed(error)`, static `options`, static `dispatch()` / `dispatchMany()`. |
| `QueueManager` | class | Dispatches jobs, runs the worker loop, answers lookups and sizes. |
| `JobDispatcher` | class | Fluent builder returned by `Job.dispatch()`; awaiting it sends the job. |
| `JobBatchDispatcher` | class | Fluent builder returned by `Job.dispatchMany()`. |
| `defineConfig` | function | `defineConfig<T extends BayProviderConfig>(config: T): T`: types `config/queue.ts`. |
| `drivers` | const | Adapter factories: `memory()`, `redis(options)`. |
| `stores` | const | The same object as `drivers`, under its older name. |
| `MemoryDriver` | class | In-process driver; jobs do not survive a restart. `new MemoryDriver(options?: { maxFailedJobs?: number })`, 1000 failed jobs kept by default. |
| `RedisDriver` | class | Redis driver with visibility leases and stalled-job recovery. `new RedisDriver(source: RedisClientSource, options?: RedisDriverOptions)`. |
| `quasarConnection` | function | `quasarConnection(name?: string): () => Promise<RedisClient>`: a client source that loads a `@c9up/quasar` connection on first use. |
| `BackoffStrategy` | class | Computes retry delays: `calculateDelay(attempt)`, `getNextRetryAt(attempt)`, `getConfig()`. |
| `exponentialBackoff` | function | `exponentialBackoff(config?): BackoffFactory`; defaults `baseDelay: '1s'`, `maxDelay: '5m'`, `multiplier: 2`, `jitter: true`. |
| `linearBackoff` | function | `linearBackoff(config?): BackoffFactory`; defaults `baseDelay: '5s'`, `maxDelay: '2m'`. |
| `fixedBackoff` | function | `fixedBackoff(delay?: Duration): BackoffFactory`; default `'10s'`. |
| `customBackoff` | function | `customBackoff(config: BackoffConfig): BackoffFactory`. |
| `JobTimeoutError` | error | An attempt ran past its `timeout`; what `failOnTimeout` looks for. |
| `jobNameOf` | function | `jobNameOf(job: JobClass): string`: `options.name`, else the class name. |
| `isJobClass` | function | `isJobClass(value: unknown): value is JobClass`. |
| `queueOf` | function | `queueOf(job: JobRecord): string`: the record's queue, `'default'` when it has none. |
| `DEFAULT_QUEUE` | const | `'default'`. |
| `DEFAULT_PRIORITY` | const | `5`. |
| `Duration` | type | `number \| string`: milliseconds, or `'500ms'`, `'10s'`, `'1m'`, `'2h'`, `'1d'`. |
| `JobOptions` | interface | The static `options` of a job class (see below). |
| `JobRetention` | type | `boolean \| { age?: Duration; count?: number }`. |
| `JobContext` | interface | `{ jobId; name; attempt; queue; priority; acquiredAt: Date; stalledCount }`, all `readonly`. |
| `JobClass` | interface | A constructor of `Job<Payload>` with `name` and optional `options`. |
| `DispatchResult` | interface | `{ jobId: string }`. |
| `DispatchManyResult` | interface | `{ jobIds: string[] }`. |
| `DispatchOptions` | interface | `JobOptions` without `name`, plus `dedup?: { id: string; ttl?: Duration; extend?: boolean }` and `maxAttempts?: number`. |
| `WorkerOptions` | interface | `{ idleDelay?; stalledInterval?; concurrency?; queues?; unknownJobRetries? }`. |
| `QueueDriver` | interface | The driver contract: `push`, `pop`, `fail`, `complete`, `retry`, `failed`, `size`; optional `sizeOf`, `getJob`, `recoverStale`, `renew`, `renewIntervalMs`. |
| `JobRecord` | interface | A job as stored: `id`, `name`, `payload`, `attempts`, `maxAttempts`, `status`, `createdAt`, `queue?`, `runAt?`, `priority?`… |
| `JobStatus` | type | `'pending' \| 'active' \| 'delayed' \| 'completed' \| 'failed'`. |
| `JobLookup` | interface | `{ status: JobStatus; data: JobRecord; finishedAt?: number; error?: string }`. |
| `JobHandler` | interface | `{ handle(payload: unknown, signal: AbortSignal, context?: JobContext): Promise<void> }`. |
| `HandlerRegistration` | type | `JobHandler \| Constructor<JobHandler>`. |
| `JobFactory` | type | `(jobClass: Constructor) => unknown`: builds job and handler classes. |
| `Constructor` | type | `new (...args: never[]) => T`. |
| `QueueManagerOptions` | interface | `{ jobFactory?: JobFactory }`. |
| `AdapterFactory` | type | `() => QueueDriver`. |
| `QueueStoreFactory` | type | Same as `AdapterFactory`. |
| `BackoffConfig` | interface | `{ strategy: 'exponential' \| 'linear' \| 'fixed'; baseDelay: Duration; maxDelay?: Duration; multiplier?: number; jitter?: boolean }`. |
| `ResolvedBackoff` | interface | `BackoffConfig` with the delays in milliseconds. |
| `BackoffFactory` | type | `() => BackoffStrategy`. |
| `RedisClient` | interface | The commands the Redis driver sends (`evalsha`, `script`, `rpush`, `zadd`, `lrange`…). |
| `RedisClientSource` | type | `RedisClient \| (() => RedisClient \| Promise<RedisClient>)`. |
| `RedisDriverOptions` | interface | `{ prefix?: string; visibilityTimeoutMs?: number; maxStalledCount?: number; maxFailedJobs?: number }`. |
| `BayProviderConfig` | interface | The shape of `config/queue.ts` (see Configuration). |
| `BayAppContext` / `BayContainer` / `BayConfigStore` | interface | The host the provider needs. |

### `@c9up/bay/provider`

| Export | Kind | Description |
|---|---|---|
| `default` (`BayProvider`) | provider | `register()` binds the `QueueManager` built from the `queue` config, with the container's `make` as job factory; `boot()` seats it on `services/main`; `ready()` imports every job class under `locations` and registers it; `shutdown()` stops the worker. |

### `@c9up/bay/services/main`

| Export | Kind | Description |
|---|---|---|
| `default` | const | The booted `QueueManager`; a member read before boot throws. `Job.dispatch()` sends through it. |
| `setQueue` | function | `setQueue(value: QueueManager): void`. |
| `getQueue` | function | `getQueue(): QueueManager \| undefined`. |
| `clearQueue` | function | `clearQueue(): void`. |

### `@c9up/bay/testing`

| Export | Kind | Description |
|---|---|---|
| `FakeQueue` | class | A `QueueDriver` that records pushes and never runs them. |
| `FakeQueuePredicate` | interface | `{ payloadMatches?: (payload: unknown) => boolean }`. |
| `FakeQueuePredicateArg` | type | `FakeQueuePredicate \| ((job: JobRecord) => boolean)`. |

### `@c9up/bay/commands`

| Command | Arguments and flags | Description |
|---|---|---|
| `queue:work` | `--queue <names>` (comma-separated, in order), `--concurrency <n>` | Boots the app and processes jobs until the process is stopped. |
| `make:job` | `<name>` (may hold a subdirectory) | Writes a job class in the first configured location. |

The module also exports `getMetaData()`, `getCommand(metadata)` (the command loader contract) and the `BayCommandClass` type.

### `Job`

```ts
export default class SendEmail extends Job<{ to: string }> {
  static options = { queue: 'emails', maxRetries: 5 }
  async execute() { /* this.payload, this.signal, this.context */ }
}
```

| Member | Signature | Description |
|---|---|---|
| `options` | `static options: JobOptions` | Defaults of every dispatch of this class. |
| `dispatch` | `static dispatch<Payload>(payload: Payload): JobDispatcher<Payload>` | Queue one job. |
| `dispatchMany` | `static dispatchMany<Payload>(payloads: readonly Payload[]): JobBatchDispatcher<Payload>` | Queue one job per payload. |
| `payload` | `readonly payload: Payload` | The dispatched payload. |
| `signal` | `readonly signal: AbortSignal` | Aborts when the attempt's `timeout` passes. |
| `context` | `readonly context: JobContext` | Id, attempt, queue, priority of this attempt. |
| `execute` | `abstract execute(): Promise<void> \| void` | The work. |
| `failed` | `failed?(error: Error): Promise<void> \| void` | Called once the last attempt failed. |

### `JobOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | class name | The name a worker resolves the record by. |
| `queue` | `string` | `'default'` | Queue the job waits in. |
| `priority` | `number` | `5` | 1 to 10, lower runs first. |
| `maxRetries` | `number` | `3` | How many times the handler may run. |
| `delay` | `Duration` | none | Hold the job back before a worker may take it. |
| `retry` | `{ maxRetries?: number; backoff?: BackoffFactory }` | none | Retry count and delay between attempts. |
| `timeout` | `Duration` | none | Per-attempt limit; `0` means none; at most about 24.8 days. |
| `failOnTimeout` | `boolean` | `false` | Fail at once on a timeout instead of retrying. |
| `removeOnComplete` | `JobRetention` | removed | Keep completed jobs: `false` keeps all, `{ age, count }` bounds them. |
| `removeOnFail` | `JobRetention` | removed | Same for failed jobs. |

### `JobDispatcher` and `JobBatchDispatcher`

Both are `PromiseLike`: `await` sends.

| Member | Signature | Description |
|---|---|---|
| `toQueue` | `toQueue(queue: string): this` | Send to this queue instead of the class's. |
| `in` | `in(delay: Duration): this` | Delay the job (`JobDispatcher` only). |
| `priority` | `priority(priority: number): this` | 1 to 10, lower runs first. |
| `dedup` | `dedup(options: { id: string; ttl?: Duration; extend?: boolean }): this` | Queue only if no job of the same class holds this id (`JobDispatcher` only). |
| `run` | `run(): Promise<DispatchResult>` / `Promise<DispatchManyResult>` | Send explicitly. |

### `QueueManager`

`new QueueManager(driver: QueueDriver, workerDefaults?: WorkerOptions, options?: QueueManagerOptions)`.

| Member | Signature | Description |
|---|---|---|
| `register` | `register(name: string, handler: HandlerRegistration): void` | Register a handler under a name. |
| `registerJob` | `registerJob(job: JobClass): void` | Register a job class under its name, so a worker can find it. Checks its options. |
| `registeredJobs` | `registeredJobs(): ReadonlyMap<string, JobClass>` | Every known job class. |
| `dispatch` | `dispatch<Payload>(job: JobClass<Payload>, payload: Payload, options?: DispatchOptions): Promise<string>` | Queue a job; resolves to its id, or the id of the job holding its dedup id. Also takes a registered name. |
| `dispatchMany` | `dispatchMany<Payload>(job: JobClass<Payload>, payloads: readonly Payload[], options?: DispatchOptions): Promise<string[]>` | Every record is checked before the first push. |
| `getJob` | `getJob(jobId: string, queue?: string): Promise<JobLookup \| null>` | Where a job is; `null` once gone. Needs a driver with `getJob`. |
| `processOne` | `processOne(queues?: readonly string[]): Promise<boolean>` | Run the next job; `false` when there was none. |
| `work` | `work(options?: WorkerOptions \| number, stalledIntervalArg?: number): Promise<void>` | Start the worker loop; recovers stalled jobs at start and every `stalledInterval`. |
| `recoverStale` | `recoverStale(): Promise<number>` | Move jobs left by a crashed worker back to pending. |
| `drain` | `drain(): Promise<void>` | Wait for the attempts in flight. |
| `stop` | `stop(): Promise<void>` | Stop the loop and wait for it and the jobs in flight. |
| `failedJobs` | `failedJobs(): Promise<JobRecord[]>` | The failed jobs the driver keeps. |
| `size` | `size(): Promise<number>` | Jobs waiting on the default queue, delayed ones included. |
| `sizeOf` | `sizeOf(queue: string): Promise<number>` | Jobs waiting on a named queue. |

### `FakeQueue`

`new FakeQueue()`, handed to a `QueueManager` in place of a driver.

| Member | Signature | Description |
|---|---|---|
| `getPushed` | `getPushed(): JobRecord[]` | Copies of the recorded jobs. |
| `reset` | `reset(): void` | Forget them. |
| `assertPushed` | `assertPushed(name: string, predicate?: FakeQueuePredicateArg): void` | Throws unless a recorded job matches. |
| `assertNotPushed` | `assertNotPushed(name: string, predicate?: FakeQueuePredicateArg): void` | Throws if one matches. |

## Configuration

`config/queue.ts`, read under the `queue` key.

| Option | Type | Default | Description |
|---|---|---|---|
| `default` | `string` | — | The adapter to run on. The generated config reads `QUEUE_DRIVER`. |
| `adapters` | `Record<string, AdapterFactory>` | — | Named adapters (`stores` is accepted under its older name). Without them, a memory driver is used. |
| `worker.idleDelay` | `Duration` | `2000` | Wait after finding no job. |
| `worker.stalledInterval` | `Duration` | `30000` | Time between stalled-job sweeps. |
| `worker.concurrency` | `number` | `1` | Jobs run at once. |
| `worker.queues` | `readonly string[]` | `['default']` | Queues served, in order. |
| `worker.unknownJobRetries` | `number` | `10` | Times a job no handler answers is put back (30 s later) before it fails. |
| `locations` | `readonly string[]` | `['app/jobs']` | Directories whose job classes are imported at boot. |
| `jobFactory` | `JobFactory` | container `make` | How job classes are built. |

`drivers.redis({ connection, prefix, visibilityTimeoutMs, maxStalledCount, maxFailedJobs })`: `connection` is a client source or a quasar connection name; `prefix` defaults to `'queue:'`, `visibilityTimeoutMs` to `30000`, `maxStalledCount` to `1`, `maxFailedJobs` to `1000` (`0` keeps all).

## Container bindings

| Token | Resolves to |
|---|---|
| `QueueManager` (class) | The `QueueManager` built from `config/queue.ts` |
| `'bay.queue'` | The same manager |
| `'queue'` | The same manager |

The two string tokens are typed on `ContainerBindings` once `@c9up/bay` is imported.

## Errors

bay raises no `E_` code. Its refusals are plain `Error`s whose message starts with `[bay]` (an invalid config, an adapter that is not declared, a job class with invalid options, a service read before boot), and an attempt past its timeout fails with `JobTimeoutError`.

## See also

- [Queues](/en/guides/digging-deeper/queues)
- [Testing](/en/guides/testing/introduction)
- [quasar reference](/en/reference/quasar)
