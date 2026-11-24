# Health checks

This guide covers health checks.

## Health checks

```ts
import {
  HealthChecks, DiskSpaceCheck, MemoryHeapCheck, MemoryRSSCheck,
} from '@c9up/ream/health'
import { safeEqual } from '@c9up/ream/helpers'

const healthChecks = new HealthChecks().register([
  new DiskSpaceCheck().warnWhenExceeds(70).failWhenExceeds(85).cacheFor('1 minute'),
  new MemoryHeapCheck().warnWhenExceedsPercentage(80),
  new MemoryRSSCheck().failWhenExceeds('512 mb'),
])

// Liveness: the process answers. Public, and says nothing else.
router.get('/health/live', ({ response }) => response.status(200).send(''))

// Readiness: the full report, for your monitoring only.
router.get('/health/ready', async ({ request, response }) => {
  if (!safeEqual(request.header('x-monitoring-secret') ?? '', env.get('MONITORING_SECRET'))) {
    return response.status(401).send('')
  }
  const report = await healthChecks.run()
  return response.status(report.isHealthy ? 200 : 503).json(report)
})
```

The report is not for the public. It contains the process details (`pid`,
`ppid`, platform, uptime, Node.js version) and, for each failed check, the
error it failed with — for a database that is down, its private address and
port. Serve it behind a secret header, as above, or a guard; give the load
balancer the liveness route. Declare `MONITORING_SECRET` in your env schema so
the app does not start without it.

A **warning does not make the app unhealthy** — `isHealthy` only goes false on
`error`, so a disk at 72% tells an operator to act without a readiness probe
pulling the pod out of rotation. `status` still reports `warning`.

Write your own check by extending `BaseCheck` and returning a `Result`:

```ts
class DatabaseCheck extends BaseCheck {
  name = 'database'

  async run() {
    try {
      await db.rawQuery('select 1')
      return Result.ok('Database is reachable')
    } catch (error) {
      return Result.failed('Database is unreachable', error)
    }
  }
}
```

`cacheFor('1 minute')` reuses the last result for that long, and the report says
`isCached` per check — a probe every second must not open a database connection
every second. Each run is published on the `ream.health.check` diagnostics
channel, so an APM can time checks without the app wiring anything.

`DiskSpaceCheck` reads Node's `fs.statfs` directly — no dependency, no
subprocess.

::: warning `HealthCheck` (singular) is the older, separate API
`HealthCheck` on the root export predates this module and covers the same
ground with a home-grown shape — `register(name, fn)`, a per-check timeout, and
a ready-made `handler()`. It still works and nothing was removed, but new code
should use `HealthChecks` from `@c9up/ream/health`.

A check that throws is reported as `Health check failed`, never with what it
threw; the error goes to the `onError` option (stderr by default). A check that
returns `{ status: 'error', message }` keeps its own message.
:::
