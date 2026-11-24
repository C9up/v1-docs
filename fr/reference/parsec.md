# parsec

`@c9up/parsec` : les métriques : compteurs, jauges et histogrammes derrière un même contrat de driver, avec un driver Prometheus sans dépendance, un driver OpenTelemetry, un middleware HTTP et un point de collecte protégé. Guide : [Métriques](/fr/guides/digging-deeper/metrics).

## Installation

```bash
pnpm add @c9up/parsec
```

`ream configure @c9up/parsec` enregistre le provider et le middleware HTTP (niveau serveur), écrit `config/metrics.ts` et `start/metrics.ts` (la route `/__metrics`), et ajoute `METRICS_EXPORTER` et un `METRICS_TOKEN` aléatoire au `.env`. Le driver OpenTelemetry demande `@opentelemetry/api` (pair facultatif) et un meter issu du SDK de l'application.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/parsec` | `MetricsManager`, `defineConfig`, `drivers`, les trois drivers, `metricsHandler`, `collectDefaultMetrics`, `instrumentHealthChecks`, les erreurs, les types |
| `@c9up/parsec/provider` | `ParsecProvider` (export par défaut) |
| `@c9up/parsec/services/main` | Le `MetricsManager` démarré (export par défaut), `setMetrics`, `getMetrics`, `clearMetrics` |
| `@c9up/parsec/http` | Le middleware HTTP (export par défaut `ParsecHttpMiddleware`, et `parsecHttpMiddleware`) et ses aides de labels |
| `@c9up/parsec/endpoint` | `metricsHandler` et ses types |
| `@c9up/parsec/prometheus` | `PrometheusDriver`, `PROMETHEUS_CONTENT_TYPE` |
| `@c9up/parsec/otel` | `OtelDriver`, `OtelDriverOptions`, `OtelMeter` |
| `@c9up/parsec/diagnostics` | `instrumentHealthChecks`, `HEALTH_CHANNEL` |
| `@c9up/parsec/testing` | `fakeMetrics` |
| `@c9up/parsec/configure` | `configure(codemods)`, lancé par `ream configure` |

## Exports

### `@c9up/parsec`

| Export | Nature | Description |
|---|---|---|
| `MetricsManager` | classe | Les exportateurs configurés, construits au premier usage ; déclare les instruments sur celui par défaut. |
| `defineConfig` | fonction | `defineConfig(config: MetricsConfig): MetricsConfig`. |
| `drivers` | constante | Fabriques d'exportateurs : `prometheus(options?: DriverOptions)`, `otel(options: OtelDriverOptions)`, `noop()`. |
| `PrometheusDriver` | classe | Garde les séries en mémoire et rend le format texte Prometheus sur `scrape()`. `new PrometheusDriver(options?: DriverOptions)`. |
| `OtelDriver` | classe | Enregistre via un meter OpenTelemetry ; `scrape()` répond `null`. `new OtelDriver(options: OtelDriverOptions)`. |
| `NoopDriver` | classe | Ne mesure rien. L'exportateur d'un gestionnaire construit sans configuration. |
| `PROMETHEUS_CONTENT_TYPE` | constante | `'text/plain; version=0.0.4; charset=utf-8'`. |
| `metricsHandler` | fonction | `metricsHandler(metrics: MetricsManager, options?: MetricsEndpointOptions)` : un handler de route qui sert le corps de collecte. |
| `collectDefaultMetrics` | fonction | `collectDefaultMetrics(metrics: InstrumentFactory, options?: DefaultMetricsOptions): () => void` : déclare la base processus et Node.js et lance ses moniteurs ; renvoie l'arrêt. |
| `instrumentHealthChecks` | fonction | `instrumentHealthChecks(metrics: MetricsManager): () => void` : chronomètre chaque contrôle de santé via le canal de traçage de ream ; renvoie le désabonnement. |
| `HEALTH_CHANNEL` | constante | `'ream.health.check'`. |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs) |
| `MetricsRecorder` | type | Ce que renvoie `use(name?)` : `counter`, `gauge`, `histogram`, `scrape(): Promise<string \| null>`, `shutdown()` et `getDriver()` d'un exportateur. Type seul : c'est le gestionnaire qui le construit. |
| `MetricsConfig` | interface | `{ default: string; exporters: Record<string, () => MetricsDriver> }`. |
| `MetricsDriver` | interface | Le contrat d'un driver : `createCounter`, `createGauge`, `createHistogram`, `scrape()` et `shutdown()` facultatifs. |
| `DriverOptions` | interface | `{ maxSeries?: number; collectTimeout?: number }`. |
| `OtelDriverOptions` | interface | `DriverOptions & { meter: OtelMeter }`. |
| `OtelMeter` | interface | Les méthodes du meter qu'appelle le driver OpenTelemetry (`createCounter`, `createGauge`, `createHistogram`, variantes observables facultatives). |
| `Counter` | interface | `increment(value?: number, labels?: Labels): void`, plus `remove` et `reset`. |
| `Gauge` | interface | `set`, `increment`, `decrement`, `startTimer(labels?): EndTimer`, plus `remove` et `reset`. |
| `Histogram` | interface | `observe(value, labels?)`, `time<T>(work: () => Promise<T>, labels?): Promise<T>`, `startTimer(labels?)`, plus `remove` et `reset`. |
| `SeriesLifecycle` | interface | `{ remove(labels?: Labels): void; reset(): void }`. |
| `EndTimer` | type | `(labels?: Labels) => number` : enregistre et renvoie les secondes écoulées. |
| `Labels` | type | `Readonly<Record<string, string \| number>>`. |
| `InstrumentOptions` | interface | `{ name: string; help: string; labelNames?: readonly string[]; unit?: string }`. |
| `CounterOptions` | interface | `InstrumentOptions & { collect?: Collect<Counter> }`. |
| `GaugeOptions` | interface | `InstrumentOptions & { collect?: Collect<Gauge> }`. |
| `HistogramOptions` | interface | `InstrumentOptions & { buckets?: readonly number[] }`. |
| `Collect` | type | `(instrument: T) => void \| Promise<void>` : calcule les valeurs au moment de la lecture. |
| `InstrumentFactory` | interface | `{ counter; gauge; histogram }` : un `MetricsManager` ou l'un de ses enregistreurs. |
| `DefaultMetricsOptions` | interface | `{ prefix?: string; eventLoopMonitoringPrecision?: number; gcDurationBuckets?: readonly number[] }`. |
| `MetricsEndpointOptions` | interface | `{ token?: string \| ReleasableSecret; public?: boolean }`. |
| `MetricsEndpointContext` | interface | La partie du contexte HTTP que lit et écrit le handler. |
| `ReleasableSecret` | interface | `{ release(): string }`. |

### `@c9up/parsec/provider`

| Export | Nature | Description |
|---|---|---|
| `default` (`ParsecProvider`) | provider | `register()` lie le `MetricsManager` (un gestionnaire inerte sans `config/metrics.ts`) ; `boot()` l'installe sur `services/main` ; `ready()` appelle `instrumentHealthChecks` ; `shutdown()` se désabonne et arrête les exportateurs. |
| `ParsecAppContext` | interface | `{ container; config }` : l'hôte dont le provider a besoin. |

### `@c9up/parsec/services/main`

| Export | Nature | Description |
|---|---|---|
| `default` | constante | Le `MetricsManager` démarré ; lire un membre avant le démarrage lève une erreur. |
| `setMetrics` | fonction | `setMetrics(value: MetricsManager): void`. |
| `getMetrics` | fonction | `getMetrics(): MetricsManager \| undefined`. |
| `clearMetrics` | fonction | `clearMetrics(): void`. |

### `@c9up/parsec/http`

| Export | Nature | Description |
|---|---|---|
| `default` (`ParsecHttpMiddleware`) | classe | Classe de middleware, `handle(ctx, next)`. Enregistrez-la avec `server.use` pour compter aussi les requêtes sans route. |
| `parsecHttpMiddleware` | fonction | `parsecHttpMiddleware(ctx: ReamContext, next: () => Promise<void> \| void): Promise<void>`. Enregistre `http_server_requests_total`, `http_server_request_duration_seconds` (labels `method`, `route`, `status`) et `http_server_requests_in_flight` (label `method`). |
| `PARSEC_KEY` | constante | `'parsec.metrics'` : le jeton que le middleware résout via `ctx.containerResolver`. |
| `methodLabel` | fonction | `methodLabel(method: string): string` : la méthode HTTP, ou `OTHER` hors de la liste standard. |
| `routeLabel` | fonction | `routeLabel(ctx: ReamContext): string` : le motif de la route trouvée, ou `<unmatched>` ; jamais l'URL. |
| `instrumentsFor` | fonction | `instrumentsFor(metrics: MetricsManager)` : les trois instruments HTTP, déclarés une fois par gestionnaire. |
| `statusOfError` | fonction | `statusOfError(error: unknown): number` : le statut HTTP de l'erreur, sinon 500. |
| `ReamContext` | interface | La partie du contexte HTTP que lit le middleware. |

### `@c9up/parsec/testing`

| Export | Nature | Description |
|---|---|---|
| `fakeMetrics` | fonction | `fakeMetrics(): { metrics: MetricsManager; restore: () => void }`. Installe un gestionnaire Prometheus sur `services/main` ; `restore()` remet le précédent. |

### `MetricsManager`

`new MetricsManager(config?: MetricsConfig)` ; sans configuration, un seul exportateur `noop`. Lève `E_PARSEC_UNKNOWN_EXPORTER` si `default` n'est pas déclaré.

| Membre | Signature | Description |
|---|---|---|
| `use` | `use(name?: string): MetricsRecorder` | L'enregistreur d'un exportateur (celui par défaut sans nom), construit une fois. Il a les mêmes `counter`, `gauge`, `histogram`, `scrape`, `shutdown` et `getDriver()`. |
| `counter` | `counter(options: CounterOptions): Counter` | Déclare ou retrouve un compteur sur l'exportateur par défaut. Le même nom rend le même instrument. |
| `gauge` | `gauge(options: GaugeOptions): Gauge` | Déclare ou retrouve une jauge. |
| `histogram` | `histogram(options: HistogramOptions): Histogram` | Déclare ou retrouve un histogramme. |
| `scrape` | `scrape(): Promise<string \| null>` | Le corps de l'exportateur par défaut ; `null` pour un driver qui pousse. |
| `shutdown` | `shutdown(): Promise<void>` | Arrête chaque exportateur construit. |

### Options d'un instrument

| Option | Type | Défaut | Description |
|---|---|---|---|
| `name` | `string` | — | `[a-zA-Z_:][a-zA-Z0-9_:]*`. |
| `help` | `string` | — | Une ligne, rendue en HELP. |
| `labelNames` | `readonly string[]` | `[]` | Les seuls labels qu'une mesure peut porter. |
| `unit` | `string` | aucune ; `s` pour un histogramme aux buckets par défaut | Unité à la manière d'OpenTelemetry (`s`, `By`, `1`). |
| `buckets` | `readonly number[]` | `0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10` | Bornes des buckets d'un histogramme, croissantes. |
| `collect` | `Collect<T>` | aucun | Compteur ou jauge calculé à la lecture. |

## Configuration

`config/metrics.ts`, lu sous la clé `metrics`.

| Option | Type | Défaut | Description |
|---|---|---|---|
| `default` | `string` | `'noop'` sans configuration | L'exportateur où sont déclarés les instruments. La configuration générée lit `METRICS_EXPORTER` (`prometheus` s'il est absent). |
| `exporters` | `Record<string, () => MetricsDriver>` | `{ noop }` sans configuration | Exportateurs nommés, construits au premier usage. |
| `drivers.prometheus({ maxSeries })` | `number` | `1000` | Combinaisons de labels qu'un instrument peut tenir ; au-delà, les séries sont écartées et comptées. |
| `drivers.prometheus({ collectTimeout })` | `number` (ms) | `5000` | Durée permise à un callback `collect` pendant une collecte. |

Options de `metricsHandler` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `token` | `string \| ReleasableSecret` | — | Jeton `Authorization: Bearer` exigé ; un jeton faux ou absent reçoit un 404. |
| `public` | `boolean` | `false` | Sert sans jeton. N'indiquer ni l'un ni l'autre est une erreur. |

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `MetricsManager` (classe) | Le `MetricsManager` construit depuis `config/metrics.ts` |
| `'parsec.metrics'` | Le même gestionnaire |
| `'metrics'` | Le même gestionnaire |

Les deux jetons texte sont typés sur `ContainerBindings` dès que `@c9up/parsec` est importé.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_PARSEC_INVALID_NAME`](/fr/reference/errors#e-parsec-invalid-name) | Un nom de métrique ou de label n'est pas valide. |
| [`E_PARSEC_INVALID_INSTRUMENT`](/fr/reference/errors#e-parsec-invalid-instrument) | Un instrument est déclaré avec des options qu'il ne peut pas avoir. |
| [`E_PARSEC_INSTRUMENT_CONFLICT`](/fr/reference/errors#e-parsec-instrument-conflict) | Un nom est déjà déclaré avec un autre type, une autre aide ou d'autres labels. |
| [`E_PARSEC_INVALID_MEASUREMENT`](/fr/reference/errors#e-parsec-invalid-measurement) | Une mesure n'est pas un nombre fini, ou est négative là où elle ne doit pas l'être. |
| [`E_PARSEC_INVALID_LABEL_VALUE`](/fr/reference/errors#e-parsec-invalid-label-value) | Une valeur de label n'est ni une chaîne ni un nombre fini. |
| [`E_PARSEC_UNDECLARED_LABEL`](/fr/reference/errors#e-parsec-undeclared-label) | Une mesure porte un label que l'instrument ne déclare pas. |
| [`E_PARSEC_UNKNOWN_EXPORTER`](/fr/reference/errors#e-parsec-unknown-exporter) | `default` ou `use(name)` nomme un exportateur non déclaré. |
| [`E_PARSEC_UNPROTECTED_ENDPOINT`](/fr/reference/errors#e-parsec-unprotected-endpoint) | `metricsHandler` n'a ni jeton ni `public: true`, ou les deux. |
| [`E_PARSEC_EMPTY_TOKEN`](/fr/reference/errors#e-parsec-empty-token) | Le jeton du point de collecte est vide. |
| [`E_PARSEC_INVALID_CONFIG`](/fr/reference/errors#e-parsec-invalid-config) | `config/metrics.ts` n'exporte pas `defineConfig({ default, exporters })`. |
| [`E_PARSEC_INVALID_BINDING`](/fr/reference/errors#e-parsec-invalid-binding) | Le conteneur répond autre chose qu'un `MetricsManager` pour le jeton `MetricsManager`. |
| [`E_PARSEC_NOT_BOOTED`](/fr/reference/errors#e-parsec-not-booted) | Le service `metrics` ou le middleware HTTP sert avant que `ParsecProvider` ait lié le gestionnaire, ou avant `setMetrics()`. |

Chacune est une classe du namespace `errors` et une `Exception` de `@c9up/flare` de statut 500 : testez `error.code` ou `error instanceof errors.E_PARSEC_*`.

## Migration

- `ParsecError` disparaît : testez `error.code`, ou `error instanceof errors.E_PARSEC_*` avec `import { errors } from '@c9up/parsec'`.
- Les classes d'erreur portent le nom de leur code et vivent dans le namespace `errors` : `InvalidMetricNameError` devient `errors.E_PARSEC_INVALID_NAME`, `InvalidInstrumentError` `errors.E_PARSEC_INVALID_INSTRUMENT`, `InstrumentConflictError` `errors.E_PARSEC_INSTRUMENT_CONFLICT`, `InvalidMeasurementError` `errors.E_PARSEC_INVALID_MEASUREMENT`, `InvalidLabelValueError` `errors.E_PARSEC_INVALID_LABEL_VALUE`, `UndeclaredLabelError` `errors.E_PARSEC_UNDECLARED_LABEL`, `UnknownExporterError` `errors.E_PARSEC_UNKNOWN_EXPORTER`, `UnprotectedEndpointError` `errors.E_PARSEC_UNPROTECTED_ENDPOINT`, `EmptyTokenError` `errors.E_PARSEC_EMPTY_TOKEN`.

## Voir aussi

- [Métriques](/fr/guides/digging-deeper/metrics)
- [Contrôles de santé](/fr/guides/digging-deeper/health-checks)
