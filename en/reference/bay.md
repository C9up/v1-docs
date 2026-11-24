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
| `@c9up/bay` | `Job`, `QueueManager`, dispatchers, `defineConfig`, `drivers`, the two drivers, backoff helpers, `errors`, types |
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
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors) |
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
| `QueueDriver` | interface | The driver contract: `push`, `pop`, `fail`, `complete`, `retry`, `failed`, `size`; optional `sizeOf`, `getJob`, `recoverStale`, `renew`, `renewIntervalMs`. `recoverStale()` answers a `StaleRecovery`, or the recovered count alone for a driver that never fails a job for stalling. |
| `StaleRecovery` | interface | `{ recovered: number; failed: Array<{ job: JobRecord; error: Error }> }`: what one stall sweep did. `failed` lists the jobs it filed as failed for stalling too often, each with the error their `failed()` hook receives. |
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
| `failed` | `failed?(error: Error): Promise<void> \| void` | Called once the last attempt failed: with `E_JOB_MAX_ATTEMPTS_REACHED` (the attempt's error as `cause`) once retries ran out, with the attempt's own error when `maxAttempts` is 1 or `failOnTimeout` ended it, with `E_JOB_STALLED` when the job stalled more than `maxStalledCount` times. |

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
| `assertPushed` | `assertPushed(name: string, predicate?: FakeQueuePredicateArg): void` | Throws an `AssertionError` unless a recorded job matches. |
| `assertNotPushed` | `assertNotPushed(name: string, predicate?: FakeQueuePredicateArg): void` | Throws an `AssertionError` if one matches. |

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

`drivers.redis({ connection, prefix, visibilityTimeoutMs, maxStalledCount, maxFailedJobs })`: `connection` is a client source or a quasar connection name; `prefix` defaults to `'queue:'`, `visibilityTimeoutMs` to `30000`, `maxStalledCount` to `1`, `maxFailedJobs` to `1000` (`0` keeps all). The driver honours the connection's `keyPrefix`: every key it writes, leases and dedup ids included, carries it, so two applications can share one Redis database.

## Container bindings

| Token | Resolves to |
|---|---|
| `QueueManager` (class) | The `QueueManager` built from `config/queue.ts` |
| `'bay.queue'` | The same manager |
| `'queue'` | The same manager |

The two string tokens are typed on `ContainerBindings` once `@c9up/bay` is imported.

## Errors

| Code | Raised when |
|---|---|
| [`E_CONFIGURATION_ERROR`](/en/reference/errors#e-configuration-error) | `config.queue` is not what `defineConfig` returns, declares adapters without a `default`, its `default` names an adapter it does not declare, a backoff names an unknown strategy, or a `RedisDriver` option (`visibilityTimeoutMs`, `maxStalledCount`, `maxFailedJobs`) is out of range. |
| [`E_ADAPTER_INIT_ERROR`](/en/reference/errors#e-adapter-init-error) | The selected adapter's factory threw while building its driver; its error is the `cause`. |
| [`E_BAY_INVALID_ADAPTER`](/en/reference/errors#e-bay-invalid-adapter) | An adapter factory did not build a queue driver. |
| [`E_BAY_UNSUPPORTED_DRIVER`](/en/reference/errors#e-bay-unsupported-driver) | The `driver` key names a driver; declare it under `adapters` instead. |
| [`E_BAY_INVALID_BINDING`](/en/reference/errors#e-bay-invalid-binding) | The container answers something other than a `QueueManager` for the `QueueManager` token. |
| [`E_QUEUE_NOT_INITIALIZED`](/en/reference/errors#e-queue-not-initialized) | The queue is used before `BayProvider` booted or `setQueue()` was called (service accessor, `Job.dispatch()`, `queue:work`), or `ready()` ran before `boot()`. |
| [`E_BAY_QUASAR_MISSING`](/en/reference/errors#e-bay-quasar-missing) | A Redis adapter names a quasar connection and `@c9up/quasar` is not installed, or its manager is not available yet. |
| [`E_BAY_INCOMPLETE_CONNECTION`](/en/reference/errors#e-bay-incomplete-connection) | The Redis connection lacks a command the driver issues (EVALSHA, SCRIPT LOAD, …). |
| [`E_BAY_UNEXPECTED_REPLY`](/en/reference/errors#e-bay-unexpected-reply) | A Redis script answered with a reply the driver cannot read. |
| [`E_BAY_INVALID_JOB_OPTIONS`](/en/reference/errors#e-bay-invalid-job-options) | A job class declares an option it cannot run with; the specific refusal is in `cause`. |
| [`E_BAY_INVALID_JOB_NAME`](/en/reference/errors#e-bay-invalid-job-name) | A job's `options.name` is empty, or `make:job` is given a name that cannot become a file and a class. |
| [`E_BAY_DUPLICATE_JOB`](/en/reference/errors#e-bay-duplicate-job) | Two job classes answer to the same name. |
| [`E_BAY_INVALID_ATTEMPTS`](/en/reference/errors#e-bay-invalid-attempts) | `maxAttempts` / `maxRetries` is not a whole number >= 1, or a backoff is asked for an attempt below 1. |
| [`E_BAY_INVALID_PRIORITY`](/en/reference/errors#e-bay-invalid-priority) | A priority is not a whole number from 1 to 10. |
| [`E_INVALID_TIMEOUT`](/en/reference/errors#e-invalid-timeout) | A job `timeout` is not `0` or a whole number of milliseconds `setTimeout` can hold (1 to 2147483647). |
| [`E_INVALID_DURATION_EXPRESSION`](/en/reference/errors#e-invalid-duration-expression) | A duration is neither a non-negative number of milliseconds nor a string like `'10s'`. The message names the value; `help` names the option that held it. |
| [`E_BAY_INVALID_RETENTION`](/en/reference/errors#e-bay-invalid-retention) | `removeOnComplete` / `removeOnFail` is not a boolean or a valid `{ age?, count? }`. |
| [`E_INVALID_BASE_DELAY`](/en/reference/errors#e-invalid-base-delay) | A backoff `baseDelay` is not above zero. |
| [`E_INVALID_MAX_DELAY`](/en/reference/errors#e-invalid-max-delay) | A backoff `maxDelay` is not above zero, or not above `baseDelay`. |
| [`E_INVALID_MULTIPLIER`](/en/reference/errors#e-invalid-multiplier) | A backoff `multiplier` is not above zero, or is below 1 for the exponential strategy. |
| [`E_BAY_INVALID_DEDUP`](/en/reference/errors#e-bay-invalid-dedup) | A `dedup` has an empty id, a ttl that is not a whole number from 1, or `extend` without a ttl. |
| [`E_BAY_INVALID_WORKER_OPTIONS`](/en/reference/errors#e-bay-invalid-worker-options) | A worker option is out of range: `idleDelay`, `stalledInterval`, `concurrency`, `unknownJobRetries` or `queues`. |
| [`E_WORKER_ALREADY_RUNNING`](/en/reference/errors#e-worker-already-running) | `work()` is called while the manager's worker is already running. |
| [`E_BAY_UNSUPPORTED_OPERATION`](/en/reference/errors#e-bay-unsupported-operation) | The queue driver has no `getJob()` or `sizeOf()` for the lookup asked. |
| [`E_BAY_INVALID_JOB_FACTORY`](/en/reference/errors#e-bay-invalid-job-factory) | The job factory built something that is not the job class, or a handler without `handle()`; the attempt fails with it. |
| [`E_JOB_TIMEOUT`](/en/reference/errors#e-job-timeout) | An attempt ran past its `timeout`; carries `job` (its name) and `timeout` (ms). What `failOnTimeout` looks for. |
| [`E_JOB_MAX_ATTEMPTS_REACHED`](/en/reference/errors#e-job-max-attempts-reached) | Handed to a job's `failed()` hook once its retries ran out; the last attempt's error is the `cause`. |
| [`E_JOB_NOT_FOUND`](/en/reference/errors#e-job-not-found) | A job no handler or job class answers to stays unknown past `unknownJobRetries`; the failed record keeps its message. |
| [`E_JOB_STALLED`](/en/reference/errors#e-job-stalled) | The Redis driver files a job reclaimed from a dead worker more than `maxStalledCount` times as failed; the failed record keeps its message, and the job's `failed()` hook receives the error. |
| [`E_BAY_UNSERIALIZABLE_JOB`](/en/reference/errors#e-bay-unserializable-job) | A job record cannot be stored as JSON the way Redis would carry it. |
| [`E_BAY_JOBS_DIRECTORY_UNREADABLE`](/en/reference/errors#e-bay-jobs-directory-unreadable) | A declared jobs directory exists but cannot be read. |
| [`E_BAY_NO_JOBS_FOUND`](/en/reference/errors#e-bay-no-jobs-found) | Job files were scanned and none yielded a `Job` subclass. |
| [`E_BAY_DUPLICATE_JOB_ID`](/en/reference/errors#e-bay-duplicate-job-id) | `FakeQueue.push()` is given a job id it already holds. |
| [`E_BAY_FAKE_JOB_NOT_FOUND`](/en/reference/errors#e-bay-fake-job-not-found) | `FakeQueue` is asked to complete, fail or retry a job it does not hold. |

Each one is a class of the `errors` namespace and a `@c9up/flare` `Exception` with status 500: branch on `error.code` or on `error instanceof errors.E_*`. A failure the queue library has too keeps that library's code and message (`E_JOB_TIMEOUT`, `E_CONFIGURATION_ERROR`, …); what bay adds carries `E_BAY_`. `FakeQueue.assertPushed()` / `assertNotPushed()` throw `node:assert`'s `AssertionError`.

## Migration

- `BayError` is gone: test `error.code`, or `error instanceof errors.E_BAY_*` with `import { errors } from '@c9up/bay'`.
- `JobTimeoutError` becomes `errors.E_JOB_TIMEOUT`; it carries `job` and `timeout`, and is built as `new errors.E_JOB_TIMEOUT([name, ms])`.
- Codes the queue library also has now carry its name: `E_BAY_JOB_TIMEOUT` is now `E_JOB_TIMEOUT`, `E_BAY_ALREADY_RUNNING` is now `E_WORKER_ALREADY_RUNNING`, `E_BAY_INVALID_TIMEOUT` is now `E_INVALID_TIMEOUT`, `E_BAY_INVALID_CONFIG` is now `E_CONFIGURATION_ERROR`, `E_BAY_NOT_BOOTED` is now `E_QUEUE_NOT_INITIALIZED`, `E_BAY_INVALID_DURATION` is now `E_INVALID_DURATION_EXPRESSION`.
- `E_BAY_UNKNOWN_ADAPTER` is now `E_CONFIGURATION_ERROR`.
- `E_BAY_INVALID_BACKOFF` is split: `E_INVALID_BASE_DELAY`, `E_INVALID_MAX_DELAY`, `E_INVALID_MULTIPLIER`; an unknown strategy is `E_CONFIGURATION_ERROR`.
- `E_BAY_JOB_NOT_FOUND` (the `FakeQueue` lookup) is now `E_BAY_FAKE_JOB_NOT_FOUND`; `E_JOB_NOT_FOUND` now means a job name nothing is registered under.
- `E_BAY_ASSERTION_FAILED` is gone: `FakeQueue` assertions throw `AssertionError` from `node:assert`.
- An adapter factory that throws now raises `E_ADAPTER_INIT_ERROR`, with the factory's error as `cause` (`E_BAY_QUASAR_MISSING` included).
- A job's `failed()` hook now receives `E_JOB_MAX_ATTEMPTS_REACHED`, with the last attempt's error as `cause`, once retries ran out; it still receives the attempt's own error when `maxAttempts` is 1 or `failOnTimeout` ended the job.

## See also

- [Queues](/en/guides/digging-deeper/queues)
- [Testing](/en/guides/testing/introduction)
- [quasar reference](/en/reference/quasar)
