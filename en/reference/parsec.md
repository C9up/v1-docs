# parsec

`@c9up/parsec`: metrics: counters, gauges and histograms behind one driver contract, with a zero-dependency Prometheus driver, an OpenTelemetry driver, an HTTP middleware and a protected scrape endpoint. Guide: [Metrics](/en/guides/digging-deeper/metrics).

## Installation

```bash
pnpm add @c9up/parsec
```

`ream configure @c9up/parsec` registers the provider and the HTTP middleware (server tier), writes `config/metrics.ts` and `start/metrics.ts` (the `/__metrics` route), and adds `METRICS_EXPORTER` and a random `METRICS_TOKEN` to `.env`. The OpenTelemetry driver needs `@opentelemetry/api` (an optional peer) and a meter from the application's SDK.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/parsec` | `MetricsManager`, `defineConfig`, `drivers`, the three drivers, `metricsHandler`, `collectDefaultMetrics`, `instrumentHealthChecks`, errors, types |
| `@c9up/parsec/provider` | `ParsecProvider` (default export) |
| `@c9up/parsec/services/main` | The booted `MetricsManager` (default export), `setMetrics`, `getMetrics`, `clearMetrics` |
| `@c9up/parsec/http` | The HTTP middleware (default export `ParsecHttpMiddleware`, and `parsecHttpMiddleware`) and its label helpers |
| `@c9up/parsec/endpoint` | `metricsHandler` and its types |
| `@c9up/parsec/prometheus` | `PrometheusDriver`, `PROMETHEUS_CONTENT_TYPE` |
| `@c9up/parsec/otel` | `OtelDriver`, `OtelDriverOptions`, `OtelMeter` |
| `@c9up/parsec/diagnostics` | `instrumentHealthChecks`, `HEALTH_CHANNEL` |
| `@c9up/parsec/testing` | `fakeMetrics` |
| `@c9up/parsec/configure` | `configure(codemods)`, run by `ream configure` |

## Exports

### `@c9up/parsec`

| Export | Kind | Description |
|---|---|---|
| `MetricsManager` | class | The configured exporters, built on first use; declares instruments on the default one. |
| `defineConfig` | function | `defineConfig(config: MetricsConfig): MetricsConfig`. |
| `drivers` | const | Exporter factories: `prometheus(options?: DriverOptions)`, `otel(options: OtelDriverOptions)`, `noop()`. |
| `PrometheusDriver` | class | Holds series in memory and renders the Prometheus text format on `scrape()`. `new PrometheusDriver(options?: DriverOptions)`. |
| `OtelDriver` | class | Records through an OpenTelemetry meter; `scrape()` answers `null`. `new OtelDriver(options: OtelDriverOptions)`. |
| `NoopDriver` | class | Measures nothing. The exporter of a manager built without config. |
| `PROMETHEUS_CONTENT_TYPE` | const | `'text/plain; version=0.0.4; charset=utf-8'`. |
| `metricsHandler` | function | `metricsHandler(metrics: MetricsManager, options?: MetricsEndpointOptions)`: a route handler serving the scrape body. |
| `collectDefaultMetrics` | function | `collectDefaultMetrics(metrics: InstrumentFactory, options?: DefaultMetricsOptions): () => void`: declares the process and Node.js baseline and starts its monitors; returns the stop. |
| `instrumentHealthChecks` | function | `instrumentHealthChecks(metrics: MetricsManager): () => void`: times each health check run from ream's tracing channel; returns the unsubscribe. |
| `HEALTH_CHANNEL` | const | `'ream.health.check'`. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors) |
| `MetricsRecorder` | type | What `use(name?)` returns: one exporter's `counter`, `gauge`, `histogram`, `scrape(): Promise<string \| null>`, `shutdown()` and `getDriver()`. Type only: the manager builds it. |
| `MetricsConfig` | interface | `{ default: string; exporters: Record<string, () => MetricsDriver> }`. |
| `MetricsDriver` | interface | The driver contract: `createCounter`, `createGauge`, `createHistogram`, optional `scrape()` and `shutdown()`. |
| `DriverOptions` | interface | `{ maxSeries?: number; collectTimeout?: number }`. |
| `OtelDriverOptions` | interface | `DriverOptions & { meter: OtelMeter }`. |
| `OtelMeter` | interface | The meter methods the OpenTelemetry driver calls (`createCounter`, `createGauge`, `createHistogram`, optional observable variants). |
| `Counter` | interface | `increment(value?: number, labels?: Labels): void`, plus `remove` and `reset`. |
| `Gauge` | interface | `set`, `increment`, `decrement`, `startTimer(labels?): EndTimer`, plus `remove` and `reset`. |
| `Histogram` | interface | `observe(value, labels?)`, `time<T>(work: () => Promise<T>, labels?): Promise<T>`, `startTimer(labels?)`, plus `remove` and `reset`. |
| `SeriesLifecycle` | interface | `{ remove(labels?: Labels): void; reset(): void }`. |
| `EndTimer` | type | `(labels?: Labels) => number`: records and returns the elapsed seconds. |
| `Labels` | type | `Readonly<Record<string, string \| number>>`. |
| `InstrumentOptions` | interface | `{ name: string; help: string; labelNames?: readonly string[]; unit?: string }`. |
| `CounterOptions` | interface | `InstrumentOptions & { collect?: Collect<Counter> }`. |
| `GaugeOptions` | interface | `InstrumentOptions & { collect?: Collect<Gauge> }`. |
| `HistogramOptions` | interface | `InstrumentOptions & { buckets?: readonly number[] }`. |
| `Collect` | type | `(instrument: T) => void \| Promise<void>`: computes values when they are read. |
| `InstrumentFactory` | interface | `{ counter; gauge; histogram }`: a `MetricsManager` or one of its recorders. |
| `DefaultMetricsOptions` | interface | `{ prefix?: string; eventLoopMonitoringPrecision?: number; gcDurationBuckets?: readonly number[] }`. |
| `MetricsEndpointOptions` | interface | `{ token?: string \| ReleasableSecret; public?: boolean }`. |
| `MetricsEndpointContext` | interface | The slice of the HTTP context the handler reads and writes. |
| `ReleasableSecret` | interface | `{ release(): string }`. |

### `@c9up/parsec/provider`

| Export | Kind | Description |
|---|---|---|
| `default` (`ParsecProvider`) | provider | `register()` binds the `MetricsManager` (a no-op one without `config/metrics.ts`); `boot()` seats it on `services/main`; `ready()` calls `instrumentHealthChecks`; `shutdown()` unsubscribes and shuts the exporters down. |
| `ParsecAppContext` | interface | `{ container; config }`: the host the provider needs. |

### `@c9up/parsec/services/main`

| Export | Kind | Description |
|---|---|---|
| `default` | const | The booted `MetricsManager`; a member read before boot throws. |
| `setMetrics` | function | `setMetrics(value: MetricsManager): void`. |
| `getMetrics` | function | `getMetrics(): MetricsManager \| undefined`. |
| `clearMetrics` | function | `clearMetrics(): void`. |

### `@c9up/parsec/http`

| Export | Kind | Description |
|---|---|---|
| `default` (`ParsecHttpMiddleware`) | class | Middleware class, `handle(ctx, next)`. Register it with `server.use`, so unmatched requests are counted. |
| `parsecHttpMiddleware` | function | `parsecHttpMiddleware(ctx: ReamContext, next: () => Promise<void> \| void): Promise<void>`. Records `http_server_requests_total`, `http_server_request_duration_seconds` (labels `method`, `route`, `status`) and `http_server_requests_in_flight` (label `method`). |
| `PARSEC_KEY` | const | `'parsec.metrics'`: the token the middleware resolves through `ctx.containerResolver`. |
| `methodLabel` | function | `methodLabel(method: string): string`: the HTTP method, or `OTHER` for one outside the standard list. |
| `routeLabel` | function | `routeLabel(ctx: ReamContext): string`: the matched route pattern, or `<unmatched>`; never the URL. |
| `instrumentsFor` | function | `instrumentsFor(metrics: MetricsManager)`: the three HTTP instruments, declared once per manager. |
| `statusOfError` | function | `statusOfError(error: unknown): number`: the error's HTTP status, else 500. |
| `ReamContext` | interface | The slice of the HTTP context the middleware reads. |

### `@c9up/parsec/testing`

| Export | Kind | Description |
|---|---|---|
| `fakeMetrics` | function | `fakeMetrics(): { metrics: MetricsManager; restore: () => void }`. Seats a Prometheus-backed manager on `services/main`; `restore()` puts the previous one back. |

### `MetricsManager`

`new MetricsManager(config?: MetricsConfig)`; without a config, a single `noop` exporter. Throws `E_PARSEC_UNKNOWN_EXPORTER` when `default` is not declared.

| Member | Signature | Description |
|---|---|---|
| `use` | `use(name?: string): MetricsRecorder` | The recorder of an exporter (default one without a name), built once. It has the same `counter`, `gauge`, `histogram`, `scrape`, `shutdown` and `getDriver()`. |
| `counter` | `counter(options: CounterOptions): Counter` | Declare or fetch a counter on the default exporter. The same name returns the same instrument. |
| `gauge` | `gauge(options: GaugeOptions): Gauge` | Declare or fetch a gauge. |
| `histogram` | `histogram(options: HistogramOptions): Histogram` | Declare or fetch a histogram. |
| `scrape` | `scrape(): Promise<string \| null>` | The default exporter's body; `null` for a pushing driver. |
| `shutdown` | `shutdown(): Promise<void>` | Shut down every built exporter. |

### Instrument options

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | — | `[a-zA-Z_:][a-zA-Z0-9_:]*`. |
| `help` | `string` | — | One line, rendered as HELP. |
| `labelNames` | `readonly string[]` | `[]` | The only labels a measurement may carry. |
| `unit` | `string` | none; `s` for a histogram on the default buckets | OpenTelemetry-style unit (`s`, `By`, `1`). |
| `buckets` | `readonly number[]` | `0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10` | Histogram bucket bounds, ascending. |
| `collect` | `Collect<T>` | none | Counter or gauge computed when read. |

## Configuration

`config/metrics.ts`, read under the `metrics` key.

| Option | Type | Default | Description |
|---|---|---|---|
| `default` | `string` | `'noop'` without config | The exporter instruments are declared on. The generated config reads `METRICS_EXPORTER` (`prometheus` when unset). |
| `exporters` | `Record<string, () => MetricsDriver>` | `{ noop }` without config | Named exporters, built on first use. |
| `drivers.prometheus({ maxSeries })` | `number` | `1000` | Label combinations one instrument may hold; past it, series are dropped and counted. |
| `drivers.prometheus({ collectTimeout })` | `number` (ms) | `5000` | Time one `collect` callback may take during a scrape. |

`metricsHandler` options:

| Option | Type | Default | Description |
|---|---|---|---|
| `token` | `string \| ReleasableSecret` | — | Required `Authorization: Bearer` token; a wrong or missing one gets 404. |
| `public` | `boolean` | `false` | Serve without a token. Neither option set is an error. |

## Container bindings

| Token | Resolves to |
|---|---|
| `MetricsManager` (class) | The `MetricsManager` built from `config/metrics.ts` |
| `'parsec.metrics'` | The same manager |
| `'metrics'` | The same manager |

The two string tokens are typed on `ContainerBindings` once `@c9up/parsec` is imported.

## Errors

| Code | Raised when |
|---|---|
| [`E_PARSEC_INVALID_NAME`](/en/reference/errors#e-parsec-invalid-name) | A metric or label name is not valid. |
| [`E_PARSEC_INVALID_INSTRUMENT`](/en/reference/errors#e-parsec-invalid-instrument) | An instrument is declared with options it cannot have. |
| [`E_PARSEC_INSTRUMENT_CONFLICT`](/en/reference/errors#e-parsec-instrument-conflict) | A name is already declared with another type, help or label set. |
| [`E_PARSEC_INVALID_MEASUREMENT`](/en/reference/errors#e-parsec-invalid-measurement) | A measurement is not a finite number, or is negative where it must not be. |
| [`E_PARSEC_INVALID_LABEL_VALUE`](/en/reference/errors#e-parsec-invalid-label-value) | A label value is neither a string nor a finite number. |
| [`E_PARSEC_UNDECLARED_LABEL`](/en/reference/errors#e-parsec-undeclared-label) | A measurement carries a label the instrument does not declare. |
| [`E_PARSEC_UNKNOWN_EXPORTER`](/en/reference/errors#e-parsec-unknown-exporter) | `default` or `use(name)` names an exporter that is not declared. |
| [`E_PARSEC_UNPROTECTED_ENDPOINT`](/en/reference/errors#e-parsec-unprotected-endpoint) | `metricsHandler` has no token and no `public: true`, or both. |
| [`E_PARSEC_EMPTY_TOKEN`](/en/reference/errors#e-parsec-empty-token) | The endpoint token is empty or blank. |
| [`E_PARSEC_INVALID_CONFIG`](/en/reference/errors#e-parsec-invalid-config) | `config/metrics.ts` does not export `defineConfig({ default, exporters })`. |
| [`E_PARSEC_INVALID_BINDING`](/en/reference/errors#e-parsec-invalid-binding) | The container answers something other than a `MetricsManager` for the `MetricsManager` token. |
| [`E_PARSEC_NOT_BOOTED`](/en/reference/errors#e-parsec-not-booted) | The `metrics` service or the HTTP middleware is used before `ParsecProvider` bound the manager, or before `setMetrics()`. |

Each one is a class of the `errors` namespace and a `@c9up/flare` `Exception` with status 500: branch on `error.code` or on `error instanceof errors.E_PARSEC_*`.

## Migration

- `ParsecError` is gone: test `error.code`, or `error instanceof errors.E_PARSEC_*` with `import { errors } from '@c9up/parsec'`.
- The error classes are renamed after their code and live in the `errors` namespace: `InvalidMetricNameError` becomes `errors.E_PARSEC_INVALID_NAME`, `InvalidInstrumentError` `errors.E_PARSEC_INVALID_INSTRUMENT`, `InstrumentConflictError` `errors.E_PARSEC_INSTRUMENT_CONFLICT`, `InvalidMeasurementError` `errors.E_PARSEC_INVALID_MEASUREMENT`, `InvalidLabelValueError` `errors.E_PARSEC_INVALID_LABEL_VALUE`, `UndeclaredLabelError` `errors.E_PARSEC_UNDECLARED_LABEL`, `UnknownExporterError` `errors.E_PARSEC_UNKNOWN_EXPORTER`, `UnprotectedEndpointError` `errors.E_PARSEC_UNPROTECTED_ENDPOINT`, `EmptyTokenError` `errors.E_PARSEC_EMPTY_TOKEN`.

## See also

- [Metrics](/en/guides/digging-deeper/metrics)
- [Health checks](/en/guides/digging-deeper/health-checks)
