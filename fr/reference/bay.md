# bay

`@c9up/bay` : les tâches de fond : des classes de job envoyées sur des files nommées et exécutées par un worker, avec des drivers mémoire et Redis derrière un même contrat. Guide : [Files d'attente](/fr/guides/digging-deeper/queues).

## Installation

```bash
pnpm add @c9up/bay
```

`ream configure @c9up/bay` enregistre le provider et les commandes de `@c9up/bay/commands`, écrit `config/queue.ts` et ajoute `QUEUE_DRIVER=memory` au `.env` avec sa règle de validation. Le driver Redis demande `@c9up/quasar` (pair facultatif) lorsqu'il nomme une connexion.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/bay` | `Job`, `QueueManager`, les dispatchers, `defineConfig`, `drivers`, les deux drivers, les aides de backoff, les types |
| `@c9up/bay/provider` | `BayProvider` (export par défaut) |
| `@c9up/bay/services/main` | Le `QueueManager` démarré (export par défaut), `setQueue`, `getQueue`, `clearQueue` |
| `@c9up/bay/testing` | `FakeQueue` |
| `@c9up/bay/commands` | Les commandes `queue:work` et `make:job` |
| `@c9up/bay/configure` | `configure(codemods)`, lancé par `ream configure` |

## Exports

### `@c9up/bay`

| Export | Nature | Description |
|---|---|---|
| `Job` | classe | Base abstraite d'une classe de job : `execute()`, `failed(error)` facultatif, `options` statique, `dispatch()` / `dispatchMany()` statiques. |
| `QueueManager` | classe | Envoie les jobs, fait tourner la boucle du worker, répond aux recherches et aux tailles. |
| `JobDispatcher` | classe | Constructeur fluide rendu par `Job.dispatch()` ; l'attendre envoie le job. |
| `JobBatchDispatcher` | classe | Constructeur fluide rendu par `Job.dispatchMany()`. |
| `defineConfig` | fonction | `defineConfig<T extends BayProviderConfig>(config: T): T` : type `config/queue.ts`. |
| `drivers` | constante | Fabriques d'adaptateurs : `memory()`, `redis(options)`. |
| `stores` | constante | Le même objet que `drivers`, sous son ancien nom. |
| `MemoryDriver` | classe | Driver en mémoire du processus ; les jobs ne survivent pas à un redémarrage. `new MemoryDriver(options?: { maxFailedJobs?: number })`, 1000 jobs échoués conservés par défaut. |
| `RedisDriver` | classe | Driver Redis avec baux de visibilité et récupération des jobs bloqués. `new RedisDriver(source: RedisClientSource, options?: RedisDriverOptions)`. |
| `quasarConnection` | fonction | `quasarConnection(name?: string): () => Promise<RedisClient>` : une source de client qui charge une connexion `@c9up/quasar` au premier usage. |
| `BackoffStrategy` | classe | Calcule les délais entre tentatives : `calculateDelay(attempt)`, `getNextRetryAt(attempt)`, `getConfig()`. |
| `exponentialBackoff` | fonction | `exponentialBackoff(config?): BackoffFactory` ; par défaut `baseDelay: '1s'`, `maxDelay: '5m'`, `multiplier: 2`, `jitter: true`. |
| `linearBackoff` | fonction | `linearBackoff(config?): BackoffFactory` ; par défaut `baseDelay: '5s'`, `maxDelay: '2m'`. |
| `fixedBackoff` | fonction | `fixedBackoff(delay?: Duration): BackoffFactory` ; `'10s'` par défaut. |
| `customBackoff` | fonction | `customBackoff(config: BackoffConfig): BackoffFactory`. |
| `JobTimeoutError` | erreur | Une tentative a dépassé son `timeout` ; ce que `failOnTimeout` reconnaît. |
| `jobNameOf` | fonction | `jobNameOf(job: JobClass): string` : `options.name`, sinon le nom de la classe. |
| `isJobClass` | fonction | `isJobClass(value: unknown): value is JobClass`. |
| `queueOf` | fonction | `queueOf(job: JobRecord): string` : la file de l'enregistrement, `'default'` s'il n'en a pas. |
| `DEFAULT_QUEUE` | constante | `'default'`. |
| `DEFAULT_PRIORITY` | constante | `5`. |
| `Duration` | type | `number \| string` : des millisecondes, ou `'500ms'`, `'10s'`, `'1m'`, `'2h'`, `'1d'`. |
| `JobOptions` | interface | Les `options` statiques d'une classe de job (voir plus bas). |
| `JobRetention` | type | `boolean \| { age?: Duration; count?: number }`. |
| `JobContext` | interface | `{ jobId; name; attempt; queue; priority; acquiredAt: Date; stalledCount }`, tous `readonly`. |
| `JobClass` | interface | Un constructeur de `Job<Payload>` avec `name` et `options` facultatif. |
| `DispatchResult` | interface | `{ jobId: string }`. |
| `DispatchManyResult` | interface | `{ jobIds: string[] }`. |
| `DispatchOptions` | interface | `JobOptions` sans `name`, plus `dedup?: { id: string; ttl?: Duration; extend?: boolean }` et `maxAttempts?: number`. |
| `WorkerOptions` | interface | `{ idleDelay?; stalledInterval?; concurrency?; queues?; unknownJobRetries? }`. |
| `QueueDriver` | interface | Le contrat d'un driver : `push`, `pop`, `fail`, `complete`, `retry`, `failed`, `size` ; `sizeOf`, `getJob`, `recoverStale`, `renew`, `renewIntervalMs` facultatifs. |
| `JobRecord` | interface | Un job tel qu'il est stocké : `id`, `name`, `payload`, `attempts`, `maxAttempts`, `status`, `createdAt`, `queue?`, `runAt?`, `priority?`… |
| `JobStatus` | type | `'pending' \| 'active' \| 'delayed' \| 'completed' \| 'failed'`. |
| `JobLookup` | interface | `{ status: JobStatus; data: JobRecord; finishedAt?: number; error?: string }`. |
| `JobHandler` | interface | `{ handle(payload: unknown, signal: AbortSignal, context?: JobContext): Promise<void> }`. |
| `HandlerRegistration` | type | `JobHandler \| Constructor<JobHandler>`. |
| `JobFactory` | type | `(jobClass: Constructor) => unknown` : construit les classes de job et de handler. |
| `Constructor` | type | `new (...args: never[]) => T`. |
| `QueueManagerOptions` | interface | `{ jobFactory?: JobFactory }`. |
| `AdapterFactory` | type | `() => QueueDriver`. |
| `QueueStoreFactory` | type | Identique à `AdapterFactory`. |
| `BackoffConfig` | interface | `{ strategy: 'exponential' \| 'linear' \| 'fixed'; baseDelay: Duration; maxDelay?: Duration; multiplier?: number; jitter?: boolean }`. |
| `ResolvedBackoff` | interface | `BackoffConfig` avec les délais en millisecondes. |
| `BackoffFactory` | type | `() => BackoffStrategy`. |
| `RedisClient` | interface | Les commandes qu'envoie le driver Redis (`evalsha`, `script`, `rpush`, `zadd`, `lrange`…). |
| `RedisClientSource` | type | `RedisClient \| (() => RedisClient \| Promise<RedisClient>)`. |
| `RedisDriverOptions` | interface | `{ prefix?: string; visibilityTimeoutMs?: number; maxStalledCount?: number; maxFailedJobs?: number }`. |
| `BayProviderConfig` | interface | La forme de `config/queue.ts` (voir Configuration). |
| `BayAppContext` / `BayContainer` / `BayConfigStore` | interface | L'hôte dont le provider a besoin. |

### `@c9up/bay/provider`

| Export | Nature | Description |
|---|---|---|
| `default` (`BayProvider`) | provider | `register()` lie le `QueueManager` construit depuis la configuration `queue`, avec le `make` du conteneur comme fabrique de jobs ; `boot()` l'installe sur `services/main` ; `ready()` importe chaque classe de job sous `locations` et l'enregistre ; `shutdown()` arrête le worker. |

### `@c9up/bay/services/main`

| Export | Nature | Description |
|---|---|---|
| `default` | constante | Le `QueueManager` démarré ; lire un membre avant le démarrage lève une erreur. `Job.dispatch()` passe par lui. |
| `setQueue` | fonction | `setQueue(value: QueueManager): void`. |
| `getQueue` | fonction | `getQueue(): QueueManager \| undefined`. |
| `clearQueue` | fonction | `clearQueue(): void`. |

### `@c9up/bay/testing`

| Export | Nature | Description |
|---|---|---|
| `FakeQueue` | classe | Un `QueueDriver` qui enregistre les envois sans jamais les exécuter. |
| `FakeQueuePredicate` | interface | `{ payloadMatches?: (payload: unknown) => boolean }`. |
| `FakeQueuePredicateArg` | type | `FakeQueuePredicate \| ((job: JobRecord) => boolean)`. |

### `@c9up/bay/commands`

| Commande | Arguments et options | Description |
|---|---|---|
| `queue:work` | `--queue <noms>` (séparés par des virgules, dans l'ordre), `--concurrency <n>` | Démarre l'application et traite les jobs jusqu'à l'arrêt du processus. |
| `make:job` | `<name>` (peut contenir un sous-répertoire) | Écrit une classe de job dans le premier emplacement configuré. |

Le module exporte aussi `getMetaData()`, `getCommand(metadata)` (le contrat du chargeur de commandes) et le type `BayCommandClass`.

### `Job`

```ts
export default class SendEmail extends Job<{ to: string }> {
  static options = { queue: 'emails', maxRetries: 5 }
  async execute() { /* this.payload, this.signal, this.context */ }
}
```

| Membre | Signature | Description |
|---|---|---|
| `options` | `static options: JobOptions` | Défauts de chaque envoi de cette classe. |
| `dispatch` | `static dispatch<Payload>(payload: Payload): JobDispatcher<Payload>` | Met un job en file. |
| `dispatchMany` | `static dispatchMany<Payload>(payloads: readonly Payload[]): JobBatchDispatcher<Payload>` | Un job par payload. |
| `payload` | `readonly payload: Payload` | Le payload envoyé. |
| `signal` | `readonly signal: AbortSignal` | Annulé quand le `timeout` de la tentative est dépassé. |
| `context` | `readonly context: JobContext` | Identifiant, tentative, file et priorité de cette tentative. |
| `execute` | `abstract execute(): Promise<void> \| void` | Le travail. |
| `failed` | `failed?(error: Error): Promise<void> \| void` | Appelée une fois la dernière tentative échouée. |

### `JobOptions`

| Option | Type | Défaut | Description |
|---|---|---|---|
| `name` | `string` | nom de la classe | Le nom par lequel un worker retrouve l'enregistrement. |
| `queue` | `string` | `'default'` | File où le job attend. |
| `priority` | `number` | `5` | De 1 à 10, la plus basse passe d'abord. |
| `maxRetries` | `number` | `3` | Nombre d'exécutions permises du handler. |
| `delay` | `Duration` | aucun | Retient le job avant qu'un worker puisse le prendre. |
| `retry` | `{ maxRetries?: number; backoff?: BackoffFactory }` | aucun | Nombre de tentatives et délai entre elles. |
| `timeout` | `Duration` | aucun | Limite par tentative ; `0` signifie aucune ; 24,8 jours au plus environ. |
| `failOnTimeout` | `boolean` | `false` | Échoue tout de suite sur un dépassement au lieu de réessayer. |
| `removeOnComplete` | `JobRetention` | retiré | Conserve les jobs terminés : `false` les garde tous, `{ age, count }` les borne. |
| `removeOnFail` | `JobRetention` | retiré | Idem pour les jobs échoués. |

### `JobDispatcher` et `JobBatchDispatcher`

Les deux sont des `PromiseLike` : `await` envoie.

| Membre | Signature | Description |
|---|---|---|
| `toQueue` | `toQueue(queue: string): this` | Envoie dans cette file au lieu de celle de la classe. |
| `in` | `in(delay: Duration): this` | Retarde le job (`JobDispatcher` seulement). |
| `priority` | `priority(priority: number): this` | De 1 à 10, la plus basse passe d'abord. |
| `dedup` | `dedup(options: { id: string; ttl?: Duration; extend?: boolean }): this` | N'envoie que si aucun job de la même classe ne détient cet identifiant (`JobDispatcher` seulement). |
| `run` | `run(): Promise<DispatchResult>` / `Promise<DispatchManyResult>` | Envoie explicitement. |

### `QueueManager`

`new QueueManager(driver: QueueDriver, workerDefaults?: WorkerOptions, options?: QueueManagerOptions)`.

| Membre | Signature | Description |
|---|---|---|
| `register` | `register(name: string, handler: HandlerRegistration): void` | Enregistre un handler sous un nom. |
| `registerJob` | `registerJob(job: JobClass): void` | Enregistre une classe de job sous son nom pour qu'un worker la retrouve. Vérifie ses options. |
| `registeredJobs` | `registeredJobs(): ReadonlyMap<string, JobClass>` | Toutes les classes de job connues. |
| `dispatch` | `dispatch<Payload>(job: JobClass<Payload>, payload: Payload, options?: DispatchOptions): Promise<string>` | Met un job en file ; renvoie son identifiant, ou celui du job qui détient son identifiant de dédoublonnage. Accepte aussi un nom enregistré. |
| `dispatchMany` | `dispatchMany<Payload>(job: JobClass<Payload>, payloads: readonly Payload[], options?: DispatchOptions): Promise<string[]>` | Chaque enregistrement est vérifié avant le premier envoi. |
| `getJob` | `getJob(jobId: string, queue?: string): Promise<JobLookup \| null>` | Où en est un job ; `null` une fois disparu. Demande un driver doté de `getJob`. |
| `processOne` | `processOne(queues?: readonly string[]): Promise<boolean>` | Exécute le job suivant ; `false` s'il n'y en avait pas. |
| `work` | `work(options?: WorkerOptions \| number, stalledIntervalArg?: number): Promise<void>` | Lance la boucle du worker ; récupère les jobs bloqués au départ puis tous les `stalledInterval`. |
| `recoverStale` | `recoverStale(): Promise<number>` | Remet en attente les jobs laissés par un worker tombé. |
| `drain` | `drain(): Promise<void>` | Attend les tentatives en cours. |
| `stop` | `stop(): Promise<void>` | Arrête la boucle et attend sa fin et celle des jobs en cours. |
| `failedJobs` | `failedJobs(): Promise<JobRecord[]>` | Les jobs échoués que garde le driver. |
| `size` | `size(): Promise<number>` | Jobs en attente sur la file par défaut, retardés compris. |
| `sizeOf` | `sizeOf(queue: string): Promise<number>` | Jobs en attente sur une file nommée. |

### `FakeQueue`

`new FakeQueue()`, passé à un `QueueManager` à la place d'un driver.

| Membre | Signature | Description |
|---|---|---|
| `getPushed` | `getPushed(): JobRecord[]` | Copies des jobs enregistrés. |
| `reset` | `reset(): void` | Les oublie. |
| `assertPushed` | `assertPushed(name: string, predicate?: FakeQueuePredicateArg): void` | Lève une erreur si aucun job enregistré ne correspond. |
| `assertNotPushed` | `assertNotPushed(name: string, predicate?: FakeQueuePredicateArg): void` | Lève une erreur si l'un correspond. |

## Configuration

`config/queue.ts`, lu sous la clé `queue`.

| Option | Type | Défaut | Description |
|---|---|---|---|
| `default` | `string` | — | L'adaptateur utilisé. La configuration générée lit `QUEUE_DRIVER`. |
| `adapters` | `Record<string, AdapterFactory>` | — | Adaptateurs nommés (`stores` est accepté sous son ancien nom). Sans eux, un driver mémoire est utilisé. |
| `worker.idleDelay` | `Duration` | `2000` | Attente après n'avoir trouvé aucun job. |
| `worker.stalledInterval` | `Duration` | `30000` | Intervalle entre deux balayages des jobs bloqués. |
| `worker.concurrency` | `number` | `1` | Jobs exécutés en même temps. |
| `worker.queues` | `readonly string[]` | `['default']` | Files servies, dans l'ordre. |
| `worker.unknownJobRetries` | `number` | `10` | Nombre de remises en file (30 s plus tard) d'un job sans handler avant son échec. |
| `locations` | `readonly string[]` | `['app/jobs']` | Répertoires dont les classes de job sont importées au démarrage. |
| `jobFactory` | `JobFactory` | `make` du conteneur | Comment les classes de job sont construites. |

`drivers.redis({ connection, prefix, visibilityTimeoutMs, maxStalledCount, maxFailedJobs })` : `connection` est une source de client ou un nom de connexion quasar ; `prefix` vaut `'queue:'` par défaut, `visibilityTimeoutMs` `30000`, `maxStalledCount` `1`, `maxFailedJobs` `1000` (`0` les garde tous).

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `QueueManager` (classe) | Le `QueueManager` construit depuis `config/queue.ts` |
| `'bay.queue'` | Le même gestionnaire |
| `'queue'` | Le même gestionnaire |

Les deux jetons texte sont typés sur `ContainerBindings` dès que `@c9up/bay` est importé.

## Erreurs

bay ne lève aucun code `E_`. Ses refus sont des `Error` simples dont le message commence par `[bay]` (configuration invalide, adaptateur non déclaré, classe de job aux options invalides, service lu avant le démarrage), et une tentative qui dépasse son délai échoue avec `JobTimeoutError`.

## Voir aussi

- [Files d'attente](/fr/guides/digging-deeper/queues)
- [Tests](/fr/guides/testing/introduction)
- [Référence quasar](/fr/reference/quasar)
