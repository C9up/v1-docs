# Health checks

This guide covers health checks.

## Health checks

```ts
import {
  HealthChecks, DiskSpaceCheck, MemoryHeapCheck, MemoryRSSCheck,
} from '@c9up/ream/health'

const healthChecks = new HealthChecks().register([
  new DiskSpaceCheck().warnWhenExceeds(70).failWhenExceeds(85).cacheFor('1 minute'),
  new MemoryHeapCheck().warnWhenExceedsPercentage(80),
  new MemoryRSSCheck().failWhenExceeds('512 mb'),
])

router.get('/health', async ({ response }) => {
  const report = await healthChecks.run()
  return response.status(report.isHealthy ? 200 : 503).json(report)
})
```

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
:::
