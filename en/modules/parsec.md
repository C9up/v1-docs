# Parsec — Metrics

Parsec is the metrics layer in the Ream ecosystem (`@c9up/parsec`).

Throughput, latency and error rate — the three numbers an application is blind without.

## Why

[Spectrum](/en/modules/spectrum) gives you logs. Logs tell you what happened to one request; they do not tell you that p99 latency tripled an hour ago. Without metrics, a deployment with no APM has no answer to "is it slow?" other than opening it.

## Capabilities

- counters, gauges and histograms — the instruments both Prometheus and OpenTelemetry express
- a zero-dependency Prometheus exporter, text exposition format written from scratch
- an OpenTelemetry exporter that takes your own meter
- HTTP middleware recording throughput, latency and error rate per route
- a guarded scrape endpoint
- automatic health-check instrumentation, with no wiring

## Configure

```ts
// config/metrics.ts
import { defineConfig, drivers } from '@c9up/parsec'
import env from '#start/env'

export default defineConfig({
  default: env.get('METRICS_EXPORTER', 'prometheus'),

  exporters: {
    prometheus: drivers.prometheus({ maxSeries: 1000 }),
    noop: drivers.noop(),
  },
})
```

```ts
// reamrc.ts
providers: [() => import('@c9up/parsec/provider')]

// start/kernel.ts — throughput, latency and error rate for every request
//
// `server.use`, NOT `router.use`: router middleware runs only for MATCHED
// routes, so an unmatched request never reaches it — and a 404 sweep, the one
// thing an error-rate chart most needs to show, would be invisible.
import { parsecHttpMiddleware } from '@c9up/parsec/http'
server.use([parsecHttpMiddleware])
```

`ream configure @c9up/parsec` writes all of it, including the scrape route.

An application with **no** config file gets the noop exporter: instrumentation can be written unconditionally and costs one empty call.

## Record

```ts
import metrics from '@c9up/parsec/services/main'

metrics.counter({ name: 'orders_total', help: 'Orders placed.' }).increment()

const duration = metrics.histogram({
  name: 'checkout_duration_seconds',
  help: 'Time to complete a checkout.',
  labelNames: ['outcome'],
})

await duration.time(() => checkout(cart), { outcome: 'paid' })
```

`time()` records on the way out either way — a handler that throws still took time, and dropping those observations is how a latency chart comes out looking healthy during an incident.

### Named exporters

```ts
metrics.use('otel').counter({ name: 'orders_total', help: 'Orders placed.' })
```

Scrape **and** push, if that is what the deployment wants.

## Durations

Durations are **seconds**, the Prometheus convention, and histogram buckets default to a ladder that straddles a web request. ([Eclipse](/en/modules/eclipse) is milliseconds, because Redis takes milliseconds. Each is native to its own layer.)

## Expose

Deliberately **not** mounted by the provider. A metrics body names every route the application has, its traffic shape and its error rate; publishing it is a decision, not a default.

```ts
// start/metrics.ts
import router from '@c9up/ream/services/router'
import metrics from '@c9up/parsec/services/main'
import { metricsHandler } from '@c9up/parsec/endpoint'
import env from '#start/env'

router.get(
  '/__metrics',
  metricsHandler(metrics, { token: env.get('METRICS_TOKEN') }),
)
```

A wrong token gets a **404, not a 401** — a 401 confirms the endpoint is there and invites the next request. The comparison is constant-time.

An exporter that pushes rather than being scraped answers 404 as well: an empty 200 would read to a scraper as a healthy target with no metrics, which is the one answer that actively misleads.

## Cardinality

The failure mode of a metrics system is not a wrong number. It is a process that runs out of memory because one label was fed from a request. Parsec makes that hard on purpose.

**Labels are declared up front.** An undeclared label raises instead of being silently recorded — it is almost always the request-derived value that would have made the instrument unbounded.

```ts
metrics.counter({
  name: 'orders_total',
  help: 'Orders placed.',
  labelNames: ['region'],          // 'userId' would now raise
})
```

**Each instrument has a series cap.** Past `maxSeries` (default 1000) new label combinations are refused and counted:

```
parsec_series_dropped_total{metric="orders_total"} 42
```

Visible on the dashboard rather than invisible until the container dies. The counter is labelled by metric *name* — labelling it by the offending *value* would recreate the unbounded set it exists to report.

**The HTTP middleware labels by matched route pattern**, never the URL, so `/users/1` and `/users/2` are one series and a 404 sweep cannot inflate anything. A request that matched no route gets the constant `<unmatched>`. Unknown HTTP methods fold into `OTHER`.

The middleware records:

| Metric | Type | Labels |
|---|---|---|
| `http_server_requests_total` | counter | `method`, `route`, `status` |
| `http_server_request_duration_seconds` | histogram | `method`, `route`, `status` |
| `http_server_requests_in_flight` | gauge | `method` |

A request whose handler threw is still recorded, with whatever status the error handler set.

## OpenTelemetry

```ts
import { metrics as otel } from '@opentelemetry/api'

drivers.otel({ meter: otel.getMeter('my-app') })
```

Parsec never imports `@opentelemetry/api` — pass your own meter, already configured with whatever exporter and resource attributes you have set up. An application that only wants a scrape endpoint installs nothing extra, which is why the package has no OTel dependency at all.

## Health checks, for free

Ream's health module publishes every check run on the `ream.health.check` diagnostics channel. `ParsecProvider.ready()` subscribes, so these appear with no wiring:

- `health_check_duration_seconds{check="..."}`
- `health_check_failures_total{check="..."}`

Neither package imports the other.

## Errors

| Code | Raised when |
|---|---|
| `E_PARSEC_INVALID_NAME` | a metric or label name the exposition format cannot carry |
| `E_PARSEC_INVALID_MEASUREMENT` | a non-finite value, or a negative counter increment |
| `E_PARSEC_UNDECLARED_LABEL` | a label the instrument never declared |
| `E_PARSEC_INSTRUMENT_CONFLICT` | one name declared twice with a different type or label set |
| `E_PARSEC_UNKNOWN_EXPORTER` | a config naming an exporter that is not declared |

Names are validated at **declaration** time. One invalid name accepted would produce a scrape body the scraper rejects wholesale, taking every other metric in the process down with it.

## Testing

```ts
import { fakeMetrics } from '@c9up/parsec/testing'

const { metrics, restore } = fakeMetrics()
afterEach(restore)

expect(await metrics.scrape()).toContain('orders_total 1')
```

## Production checklist

- keep `/__metrics` behind a token, or behind the network — leaving it open publishes your route table
- never label with a value that comes from a request: no user ids, no raw paths, no user agents
- alert on `parsec_series_dropped_total` — it is the early warning for a label that should not be there
- set `maxSeries` from what the route table can actually produce, not from a round number
