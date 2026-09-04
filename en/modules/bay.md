# Bay — Queue / Jobs

Bay is the job queue module in the Ream ecosystem (`@c9up/bay`).

## Use cases

- async background processing
- retries, delays and per-job timeouts
- named queues, so a slow one cannot starve a fast one
- pluggable drivers (`Memory`, `Redis`)

## A job is a class

```bash
ream make:job SendEmail            # app/jobs/send_email.ts
ream make:job emails/SendInvoice   # app/jobs/emails/send_invoice.ts
```

```ts
import { Job } from '@c9up/bay'
import type { JobOptions } from '@c9up/bay'

export default class SendEmail extends Job<{ to: string }> {
  static options: JobOptions = {
    queue: 'emails',   // which queue it waits in       (default: 'default')
    maxRetries: 5,     // how many times the handler may run  (default: 3)
    delay: '10s',      // hold it before any worker takes it
    timeout: '1m',     // how long the handler gets
  }

  async execute() {
    await mail.send(this.payload.to)
  }

  async failed(error: Error) {
    // Once the LAST attempt has failed — the alert or the cleanup, not the retry.
  }
}
```

```ts
import queue from '@c9up/bay/services/main'

await queue.dispatch(SendEmail, { to: 'user@example.com' })
await queue.dispatch(SendEmail, { to: '…' }, { queue: 'critical' })  // override
```

`execute()` takes no argument: the payload is on the instance, typed by the
class's own parameter, so a field the handler reads cannot be one the
dispatcher never sent.

Registering by name still works, and is what a job whose name is computed at
runtime needs:

```ts
queue.register('mail.send', {
  async handle(payload) { /* … */ },
})
await queue.dispatch('mail.send', { to: '…' }, { maxAttempts: 5 })
```

## Workers

```bash
ream queue:work                             # the default queue, one at a time
ream queue:work --queue=critical,default    # in that order of preference
ream queue:work --concurrency=10            # ten in flight
```

```ts
await queue.work({ queues: ['emails'], concurrency: 4 })
await queue.stop()   // graceful: the job in flight finishes
```

Naming the queues is what keeps a slow one from starving a fast one — a worker
for `emails` and another for `default`, rather than one taking whatever comes.
`concurrency` is `1` by default: safe, and a poor default for anything that
waits on the network.

A `timeout` fails the attempt; it does **not** kill the handler, because nothing
in Node can interrupt a running promise. What it buys is that the *worker* stops
waiting — otherwise one stuck job costs the whole worker, which never picks
anything up again.

## Config

```ts
// config/queue.ts
import { defineConfig, drivers } from '@c9up/bay'
import env from '#start/env'

export default defineConfig({
  default: env.get('QUEUE_DRIVER', 'memory'),

  adapters: {
    memory: drivers.memory(),
    redis: drivers.redis({ connection: 'main' }),
  },

  worker: {
    idleDelay: 2_000,
    stalledInterval: 30_000,
    concurrency: 1,
    // queues: ['critical', 'default'],
  },

  // Where the job classes live.
  locations: ['app/jobs'],
})
```

`locations` is what lets a **worker** process resolve a record queued by an
**HTTP** one: every module under it is imported at boot and a default export
that is a job class is registered under its own name. Without it the
registration list is a directory kept in step by hand, and the job nobody added
to it fails as "no handler registered".

## Drivers

- `MemoryDriver`: dev/tests
- `RedisDriver`: distributed environments

## The queued record

What a driver stores, as `JobRecord`:

- `id`, `name`, `payload`
- `attempts`, `maxAttempts`
- `status` (`pending`, `processing`, `completed`, `failed`)
- `error?`, `createdAt`, `processedAt?`
- `queue` — the named queue it waits in; absent on a record written before
  named queues, and read as `default`
- `runAt?` — the moment a `delay` allows it to be taken
- `timeout?` — what the handler gets

The class is `Job`; the record is `JobRecord`. They used to share the name.

## Current retry behavior

- if `handle()` fails and `attempts < maxAttempts`, job goes back to `pending`
- otherwise job is marked `failed` and stored as failed
- read failures through `failedJobs()`

```ts
const failed = await queue.failedJobs()
```

## Current limitations

- no native scheduler/cron in Bay yet — a recurring job is a scheduled task that
  dispatches one
- no backoff between attempts: a retry is taken as soon as a worker reaches it
- no cross-process durability with `MemoryDriver`
- delayed jobs on Redis need a client with sorted-set commands (ioredis has
  them). Without `ZADD`, `push` refuses a job carrying a `delay` rather than
  running it immediately, which is the one thing a delay exists to prevent.

## Production checklist

- use `RedisDriver` in production
- make handlers idempotent
- monitor `failedJobs()` and define replay policy
- set `maxAttempts` per job type

## Best practices

- make handlers idempotent
- separate business errors from technical errors
- monitor retries and failed jobs

## Redis through Quasar

A queue can name a [Quasar](/en/modules/quasar) connection instead of being handed a client:

```ts
import { RedisDriver, quasarConnection } from '@c9up/bay'

new RedisDriver(quasarConnection('jobs'), { visibilityTimeoutMs: 30_000 })
```

The client resolves on the first command, so declaring a redis queue never dials on its own. Passing a client directly still works: `@c9up/quasar` is an **optional** peer.

The LMOVE guard still applies — it warns when the server predates Redis 6.2 and `pop()` degrades from at-least-once to at-most-once delivery.
