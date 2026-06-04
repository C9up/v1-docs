# Bay — Queue / Jobs

Bay is the job queue module in the Ream ecosystem (`@c9up/bay`).

> Status: actively evolving. The API is being hardened (retry/backoff/reliability) toward a stronger reference DX.

## Use cases

- async background processing
- retries with configurable strategy
- pluggable drivers (`Memory`, `Redis`)

## Main API

```ts
import { QueueManager, MemoryDriver } from '@c9up/bay'

const queue = new QueueManager(new MemoryDriver())
```

### Register a handler and dispatch

```ts
queue.register('mail.send', {
  async handle(payload) {
    const { to } = payload as { to: string }
    // send email
  },
})

const jobId = await queue.dispatch('mail.send', { to: 'user@example.com' }, { maxAttempts: 5 })
```

### Start a worker

```ts
// continuous processing loop
queue.work(500) // poll every 500ms

// graceful stop
queue.stop()
```

## Drivers

- `MemoryDriver`: dev/tests
- `RedisDriver`: distributed environments

## Job model

Each job includes:

- `id`, `name`, `payload`
- `attempts`, `maxAttempts`
- `status` (`pending`, `processing`, `completed`, `failed`)
- `error?`, `createdAt`, `processedAt?`

## Current retry behavior

- if `handle()` fails and `attempts < maxAttempts`, job goes back to `pending`
- otherwise job is marked `failed` and stored as failed
- read failures through `failedJobs()`

```ts
const failed = await queue.failedJobs()
```

## Current limitations

- no native scheduler/cron in Bay yet
- no built-in configurable backoff/jitter in `QueueManager` yet
- no cross-process durability with `MemoryDriver`

## Production checklist

- use `RedisDriver` in production
- make handlers idempotent
- monitor `failedJobs()` and define replay policy
- set `maxAttempts` per job type

## Best practices

- make handlers idempotent
- separate business errors from technical errors
- monitor retries and failed jobs
