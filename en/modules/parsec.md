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
- values computed at scrape time, series removal, and an opt-in process baseline
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

`ream configure @c9up/parsec` writes all of it: the config, the provider, the middleware on the server tier, the scrape route in `start/metrics.ts` registered as a preload, a random `METRICS_TOKEN` in `.env`, and the validation of both variables in `start/env.ts` (the token as a secret).

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

Label values are strings or finite numbers — `{ status: 200 }` and `{ status: '200' }` are one series. Anything else (`undefined`, an object) raises at the call, so one bad value can never break a later scrape.

### Values read at scrape time

A queue depth or a pool size is read, not pushed. Give the instrument a `collect` callback: it runs before each scrape (and on each collection under OpenTelemetry) and records through the instrument as usual.

```ts
metrics.gauge({
  name: 'queue_depth',
  help: 'Jobs waiting.',
  labelNames: ['queue'],
  collect: async (gauge) => gauge.set(await mailQueue.size(), { queue: 'mail' }),
})
```

A callback that throws, or takes longer than `collectTimeout` (5000 ms by default, set on `drivers.prometheus()`), keeps its previous values and is counted in `parsec_collect_failures_total{metric="..."}`; every other metric is served as usual. `collect` exists on counters and gauges.

### Removing series

```ts
jobs.remove({ job: 'nightly-import' })   // one label set
jobs.reset()                             // all of them
```

A series nothing will update again — a finished job, a gone tenant — otherwise holds one of the instrument's `maxSeries` slots until the process restarts.

### Timers

```ts
const end = importDuration.startTimer({ job: 'import' })
// ...
end({ outcome: 'ok' })   // observes the elapsed seconds, labels merged
```

On a gauge, `startTimer()` sets the gauge to the elapsed seconds instead.

### Process baseline

```ts
import { collectDefaultMetrics } from '@c9up/parsec'

const stop = collectDefaultMetrics(metrics)   // { prefix: 'app_' } to prefix every name
```

CPU time, resident memory, heap, event-loop lag (current and min/max/mean/stddev/p50/p90/p99), active resources, open and maximum file descriptors (Linux), GC duration by kind and the Node version, under the names Prometheus dashboards for Node already use (`process_cpu_seconds_total`, `nodejs_heap_size_used_bytes`, `nodejs_eventloop_lag_p99_seconds`, ...). Opt-in, zero-dependency, read at scrape time. `stop()` releases the event-loop monitor and the GC observer.

### Named exporters

```ts
metrics.use('otel').counter({ name: 'orders_total', help: 'Orders placed.' })
```

Scrape **and** push, if that is what the deployment wants.

## Durations

Durations are **seconds**, the Prometheus convention, and histogram buckets default to a ladder that straddles a web request. Bucket bounds must be finite numbers; a `+Infinity` bound is the `+Inf` bucket every histogram already has. `le` is reserved for buckets and cannot be a histogram label. Histogram observations, like counter increments, must be non-negative.

An instrument can state its `unit` (`'s'`, `'By'`, `'1'`), which the OpenTelemetry exporter carries. A histogram on the default buckets is `'s'`; one with its own buckets states its own unit or has none. The Prometheus text format has no unit line — put the unit in the name there (`_seconds`, `_bytes`). ([Eclipse](/en/modules/eclipse) is milliseconds, because Redis takes milliseconds. Each is native to its own layer.)

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

A wrong token gets a **404, not a 401** — a 401 confirms the endpoint is there and invites the next request. The comparison is constant-time, and the `Bearer` scheme is matched case-insensitively.

The handler refuses to be built without a token, and with an empty or blank one: an unset `METRICS_TOKEN` stops the boot instead of opening the endpoint. The token may be a plain string or the secret `Env.schema.secret()` returns. A route that only your own network can reach says so explicitly:

```ts
router.get('/__metrics', metricsHandler(metrics, { public: true }))
```

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

The cap and the counter are the same on every exporter, OpenTelemetry included. Visible on the dashboard rather than invisible until the container dies. The counter is labelled by metric *name* — labelling it by the offending *value* would recreate the unbounded set it exists to report.

**The HTTP middleware labels by matched route pattern**, never the URL, so `/users/1` and `/users/2` are one series and a 404 sweep cannot inflate anything. A request that matched no route gets the constant `<unmatched>`. Unknown HTTP methods fold into `OTHER`.

The middleware records:

| Metric | Type | Labels |
|---|---|---|
| `http_server_requests_total` | counter | `method`, `route`, `status` |
| `http_server_request_duration_seconds` | histogram | `method`, `route`, `status` |
| `http_server_requests_in_flight` | gauge | `method` |

A request whose handler threw is still recorded, with the status the client actually received: the recording happens once the response is final, after the exception handler has run. A 500, a 403 or a 404 is counted as such, never as the 200 the response held before the error was handled.

## OpenTelemetry

```ts
import { metrics as otel } from '@opentelemetry/api'

drivers.otel({ meter: otel.getMeter('my-app') })
```

Parsec never imports `@opentelemetry/api` — pass your own meter, already configured with whatever exporter and resource attributes you have set up. An application that only wants a scrape endpoint installs nothing extra, which is why the package has no OTel dependency at all.

The instrument contract is the same as with Prometheus: names, declared labels, label values, finite and non-negative measurements, type conflicts and the `maxSeries` cap are all checked before the meter sees anything, so switching `METRICS_EXPORTER` never changes what your code is allowed to record. An instrument with `collect` becomes an observable instrument, read on each collection. `remove()` and `reset()` release parsec's own state (the cap slot, a gauge's last value); a stream the SDK has already aggregated stays the SDK's.

Parsec covers metrics only. It does not start the OpenTelemetry SDK or export traces.

## Health checks, for free

Ream's health module publishes every check run on the `ream.health.check` diagnostics channel. `ParsecProvider.ready()` subscribes, so these appear with no wiring:

- `health_check_duration_seconds{check="..."}`
- `health_check_failures_total{check="..."}`

Neither package imports the other.

## Errors

| Code | Raised when |
|---|---|
| `E_PARSEC_INVALID_NAME` | a metric or label name the exposition format cannot carry, a label declared twice, or `le` on a histogram |
| `E_PARSEC_INVALID_INSTRUMENT` | a missing help, a bucket bound that is not a finite number, an invalid unit, a `collect` that is not a function |
| `E_PARSEC_INVALID_MEASUREMENT` | a non-finite value, or a negative counter increment or histogram observation |
| `E_PARSEC_INVALID_LABEL_VALUE` | a label value that is neither a string nor a finite number |
| `E_PARSEC_UNDECLARED_LABEL` | a label the instrument never declared |
| `E_PARSEC_INSTRUMENT_CONFLICT` | one name declared twice with a different type or label set |
| `E_PARSEC_UNKNOWN_EXPORTER` | a config naming an exporter that is not declared |
| `E_PARSEC_UNPROTECTED_ENDPOINT` | a scrape endpoint built with neither a token nor `public: true` |
| `E_PARSEC_EMPTY_TOKEN` | a scrape endpoint given an empty or blank token |

Names are validated at **declaration** time. One invalid name accepted would produce a scrape body the scraper rejects wholesale, taking every other metric in the process down with it.

## Testing

```ts
import { fakeMetrics } from '@c9up/parsec/testing'

const { metrics, restore } = fakeMetrics()
afterEach(restore)

expect(await metrics.scrape()).toContain('orders_total 1')
```

## Production checklist

- keep `/__metrics` behind a token, or behind the network with an explicit `public: true` — leaving it open publishes your route table
- never label with a value that comes from a request: no user ids, no raw paths, no user agents
- alert on `parsec_series_dropped_total` — it is the early warning for a label that should not be there
- alert on `parsec_collect_failures_total` — a gauge read at scrape time that keeps failing shows a stale value
- set `maxSeries` from what the route table can actually produce, not from a round number
