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
| `@c9up/bay` | `Job`, `QueueManager`, les dispatchers, `defineConfig`, `drivers`, les deux drivers, les aides de backoff, `errors`, les types |
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
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs) |
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
| `QueueDriver` | interface | Le contrat d'un driver : `push`, `pop`, `fail`, `complete`, `retry`, `failed`, `size` ; `sizeOf`, `getJob`, `recoverStale`, `renew`, `renewIntervalMs` facultatifs. `recoverStale()` renvoie un `StaleRecovery`, ou seulement le nombre de jobs repris pour un driver qui ne met jamais un job en échec pour blocage. |
| `StaleRecovery` | interface | `{ recovered: number; failed: Array<{ job: JobRecord; error: Error }> }` : ce qu'a fait un balayage des jobs bloqués. `failed` liste les jobs qu'il a mis en échec parce qu'ils se sont trop souvent bloqués, chacun avec l'erreur que reçoit leur hook `failed()`. |
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
| `failed` | `failed?(error: Error): Promise<void> \| void` | Appelée une fois la dernière tentative échouée : avec `E_JOB_MAX_ATTEMPTS_REACHED` (l'erreur de la tentative en `cause`) une fois les relances épuisées, avec l'erreur de la tentative quand `maxAttempts` vaut 1 ou que `failOnTimeout` y a mis fin, avec `E_JOB_STALLED` quand le job s'est bloqué plus de `maxStalledCount` fois. |

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
| `assertPushed` | `assertPushed(name: string, predicate?: FakeQueuePredicateArg): void` | Lève une `AssertionError` si aucun job enregistré ne correspond. |
| `assertNotPushed` | `assertNotPushed(name: string, predicate?: FakeQueuePredicateArg): void` | Lève une `AssertionError` si l'un correspond. |

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

`drivers.redis({ connection, prefix, visibilityTimeoutMs, maxStalledCount, maxFailedJobs })` : `connection` est une source de client ou un nom de connexion quasar ; `prefix` vaut `'queue:'` par défaut, `visibilityTimeoutMs` `30000`, `maxStalledCount` `1`, `maxFailedJobs` `1000` (`0` les garde tous). Le driver respecte le `keyPrefix` de la connexion : toutes les clés qu'il écrit le portent, baux et identifiants de déduplication compris. Deux applications peuvent donc partager une même base Redis.

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `QueueManager` (classe) | Le `QueueManager` construit depuis `config/queue.ts` |
| `'bay.queue'` | Le même gestionnaire |
| `'queue'` | Le même gestionnaire |

Les deux jetons texte sont typés sur `ContainerBindings` dès que `@c9up/bay` est importé.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_CONFIGURATION_ERROR`](/fr/reference/errors#e-configuration-error) | `config.queue` n'est pas ce que renvoie `defineConfig`, déclare des adaptateurs sans `default`, son `default` nomme un adaptateur qu'il ne déclare pas, un backoff nomme une stratégie inconnue, ou une option de `RedisDriver` (`visibilityTimeoutMs`, `maxStalledCount`, `maxFailedJobs`) est hors limites. |
| [`E_ADAPTER_INIT_ERROR`](/fr/reference/errors#e-adapter-init-error) | La fabrique de l'adaptateur choisi a levé une erreur en construisant son driver ; cette erreur est la `cause`. |
| [`E_BAY_INVALID_ADAPTER`](/fr/reference/errors#e-bay-invalid-adapter) | Une fabrique d'adaptateur n'a pas construit de driver de file. |
| [`E_BAY_UNSUPPORTED_DRIVER`](/fr/reference/errors#e-bay-unsupported-driver) | La clé `driver` nomme un driver ; déclarez-le plutôt sous `adapters`. |
| [`E_BAY_INVALID_BINDING`](/fr/reference/errors#e-bay-invalid-binding) | Le conteneur répond autre chose qu'un `QueueManager` pour le jeton `QueueManager`. |
| [`E_QUEUE_NOT_INITIALIZED`](/fr/reference/errors#e-queue-not-initialized) | La file sert avant le boot de `BayProvider` ou l'appel à `setQueue()` (accesseur du service, `Job.dispatch()`, `queue:work`), ou `ready()` passe avant `boot()`. |
| [`E_BAY_QUASAR_MISSING`](/fr/reference/errors#e-bay-quasar-missing) | Un adaptateur Redis nomme une connexion quasar et `@c9up/quasar` n'est pas installé, ou son gestionnaire n'est pas encore disponible. |
| [`E_BAY_INCOMPLETE_CONNECTION`](/fr/reference/errors#e-bay-incomplete-connection) | La connexion Redis n'a pas une commande qu'émet le driver (EVALSHA, SCRIPT LOAD, …). |
| [`E_BAY_UNEXPECTED_REPLY`](/fr/reference/errors#e-bay-unexpected-reply) | Un script Redis a répondu quelque chose que le driver ne sait pas lire. |
| [`E_BAY_INVALID_JOB_OPTIONS`](/fr/reference/errors#e-bay-invalid-job-options) | Une classe de job déclare une option avec laquelle elle ne peut pas tourner ; le refus précis est dans `cause`. |
| [`E_BAY_INVALID_JOB_NAME`](/fr/reference/errors#e-bay-invalid-job-name) | Le `options.name` d'un job est vide, ou `make:job` reçoit un nom qui ne peut devenir ni un fichier ni une classe. |
| [`E_BAY_DUPLICATE_JOB`](/fr/reference/errors#e-bay-duplicate-job) | Deux classes de job répondent au même nom. |
| [`E_BAY_INVALID_ATTEMPTS`](/fr/reference/errors#e-bay-invalid-attempts) | `maxAttempts` / `maxRetries` n'est pas un entier >= 1, ou un backoff est demandé pour une tentative inférieure à 1. |
| [`E_BAY_INVALID_PRIORITY`](/fr/reference/errors#e-bay-invalid-priority) | Une priorité n'est pas un entier de 1 à 10. |
| [`E_INVALID_TIMEOUT`](/fr/reference/errors#e-invalid-timeout) | Le `timeout` d'un job n'est ni `0` ni un nombre entier de millisecondes que `setTimeout` peut tenir (1 à 2147483647). |
| [`E_INVALID_DURATION_EXPRESSION`](/fr/reference/errors#e-invalid-duration-expression) | Une durée n'est ni un nombre positif ou nul de millisecondes ni une chaîne comme `'10s'`. Le message nomme la valeur ; `help` nomme l'option qui la portait. |
| [`E_BAY_INVALID_RETENTION`](/fr/reference/errors#e-bay-invalid-retention) | `removeOnComplete` / `removeOnFail` n'est ni un booléen ni un `{ age?, count? }` valide. |
| [`E_INVALID_BASE_DELAY`](/fr/reference/errors#e-invalid-base-delay) | Le `baseDelay` d'un backoff n'est pas supérieur à zéro. |
| [`E_INVALID_MAX_DELAY`](/fr/reference/errors#e-invalid-max-delay) | Le `maxDelay` d'un backoff n'est pas supérieur à zéro, ou pas supérieur à `baseDelay`. |
| [`E_INVALID_MULTIPLIER`](/fr/reference/errors#e-invalid-multiplier) | Le `multiplier` d'un backoff n'est pas supérieur à zéro, ou est inférieur à 1 pour la stratégie exponentielle. |
| [`E_BAY_INVALID_DEDUP`](/fr/reference/errors#e-bay-invalid-dedup) | Un `dedup` a un id vide, un ttl qui n'est pas un entier à partir de 1, ou `extend` sans ttl. |
| [`E_BAY_INVALID_WORKER_OPTIONS`](/fr/reference/errors#e-bay-invalid-worker-options) | Une option du worker est hors limites : `idleDelay`, `stalledInterval`, `concurrency`, `unknownJobRetries` ou `queues`. |
| [`E_WORKER_ALREADY_RUNNING`](/fr/reference/errors#e-worker-already-running) | `work()` est appelée alors que le worker du gestionnaire tourne déjà. |
| [`E_BAY_UNSUPPORTED_OPERATION`](/fr/reference/errors#e-bay-unsupported-operation) | Le driver de file n'a pas de `getJob()` ou de `sizeOf()` pour la recherche demandée. |
| [`E_BAY_INVALID_JOB_FACTORY`](/fr/reference/errors#e-bay-invalid-job-factory) | La fabrique de jobs a construit autre chose que la classe de job, ou un handler sans `handle()` ; la tentative échoue avec cette erreur. |
| [`E_JOB_TIMEOUT`](/fr/reference/errors#e-job-timeout) | Une tentative a dépassé son `timeout` ; porte `job` (son nom) et `timeout` (ms). Ce que `failOnTimeout` reconnaît. |
| [`E_JOB_MAX_ATTEMPTS_REACHED`](/fr/reference/errors#e-job-max-attempts-reached) | Remise au hook `failed()` d'un job une fois ses relances épuisées ; l'erreur de la dernière tentative est la `cause`. |
| [`E_JOB_NOT_FOUND`](/fr/reference/errors#e-job-not-found) | Un job auquel aucun handler ni aucune classe ne répond reste inconnu au-delà de `unknownJobRetries` ; l'enregistrement en échec garde son message. |
| [`E_JOB_STALLED`](/fr/reference/errors#e-job-stalled) | Le driver Redis classe en échec un job repris à un worker mort plus de `maxStalledCount` fois ; l'enregistrement en échec garde son message, et le hook `failed()` du job reçoit l'erreur. |
| [`E_BAY_UNSERIALIZABLE_JOB`](/fr/reference/errors#e-bay-unserializable-job) | Un enregistrement de job ne peut pas être stocké en JSON comme Redis le transporterait. |
| [`E_BAY_JOBS_DIRECTORY_UNREADABLE`](/fr/reference/errors#e-bay-jobs-directory-unreadable) | Un répertoire de jobs déclaré existe mais ne peut pas être lu. |
| [`E_BAY_NO_JOBS_FOUND`](/fr/reference/errors#e-bay-no-jobs-found) | Des fichiers de jobs ont été parcourus et aucun n'a fourni de sous-classe de `Job`. |
| [`E_BAY_DUPLICATE_JOB_ID`](/fr/reference/errors#e-bay-duplicate-job-id) | `FakeQueue.push()` reçoit un id de job qu'elle détient déjà. |
| [`E_BAY_FAKE_JOB_NOT_FOUND`](/fr/reference/errors#e-bay-fake-job-not-found) | On demande à `FakeQueue` de terminer, d'échouer ou de relancer un job qu'elle ne détient pas. |

Chacune est une classe du namespace `errors` et une `Exception` de `@c9up/flare` de statut 500 : testez `error.code` ou `error instanceof errors.E_*`. Un échec que la bibliothèque de files connaît aussi garde le code et le message de cette bibliothèque (`E_JOB_TIMEOUT`, `E_CONFIGURATION_ERROR`, …) ; ce que bay ajoute porte `E_BAY_`. `FakeQueue.assertPushed()` / `assertNotPushed()` lèvent l'`AssertionError` de `node:assert`.

## Migration

- `BayError` disparaît : testez `error.code`, ou `error instanceof errors.E_BAY_*` avec `import { errors } from '@c9up/bay'`.
- `JobTimeoutError` devient `errors.E_JOB_TIMEOUT` ; elle porte `job` et `timeout`, et se construit avec `new errors.E_JOB_TIMEOUT([name, ms])`.
- Les codes que la bibliothèque de files connaît aussi portent désormais son nom : `E_BAY_JOB_TIMEOUT` devient `E_JOB_TIMEOUT`, `E_BAY_ALREADY_RUNNING` devient `E_WORKER_ALREADY_RUNNING`, `E_BAY_INVALID_TIMEOUT` devient `E_INVALID_TIMEOUT`, `E_BAY_INVALID_CONFIG` devient `E_CONFIGURATION_ERROR`, `E_BAY_NOT_BOOTED` devient `E_QUEUE_NOT_INITIALIZED`, `E_BAY_INVALID_DURATION` devient `E_INVALID_DURATION_EXPRESSION`.
- `E_BAY_UNKNOWN_ADAPTER` devient `E_CONFIGURATION_ERROR`.
- `E_BAY_INVALID_BACKOFF` se divise en `E_INVALID_BASE_DELAY`, `E_INVALID_MAX_DELAY` et `E_INVALID_MULTIPLIER` ; une stratégie inconnue lève `E_CONFIGURATION_ERROR`.
- `E_BAY_JOB_NOT_FOUND` (la recherche de `FakeQueue`) devient `E_BAY_FAKE_JOB_NOT_FOUND` ; `E_JOB_NOT_FOUND` désigne désormais un nom de job sous lequel rien n'est enregistré.
- `E_BAY_ASSERTION_FAILED` disparaît : les assertions de `FakeQueue` lèvent l'`AssertionError` de `node:assert`.
- Une fabrique d'adaptateur qui lève une erreur lève désormais `E_ADAPTER_INIT_ERROR`, avec l'erreur de la fabrique en `cause` (`E_BAY_QUASAR_MISSING` compris).
- Le hook `failed()` d'un job reçoit désormais `E_JOB_MAX_ATTEMPTS_REACHED`, avec l'erreur de la dernière tentative en `cause`, une fois les relances épuisées ; il reçoit toujours l'erreur de la tentative quand `maxAttempts` vaut 1 ou que `failOnTimeout` a mis fin au job.

## Voir aussi

- [Files d'attente](/fr/guides/digging-deeper/queues)
- [Tests](/fr/guides/testing/introduction)
- [Référence quasar](/fr/reference/quasar)
