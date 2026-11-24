# quasar

`@c9up/quasar` : les connexions Redis d'une application ream : connexions nommées ouvertes à la première utilisation, pub/sub sur une socket à part, contrôles de santé et arrêt propre. Guide : [Redis](/fr/guides/database/redis).

## Installation

```bash
pnpm add @c9up/quasar
```

`ream configure @c9up/quasar` enregistre le provider, écrit `config/redis.ts`, ajoute `REDIS_HOST`, `REDIS_PORT` et `REDIS_PASSWORD` au `.env` et déclare leurs règles de validation.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/quasar` | `defineConfig`, `QuasarManager`, `QuasarConnection`, contrôles de santé, canaux de traçage, `errors`, types |
| `@c9up/quasar/provider` | `QuasarProvider` (export par défaut) |
| `@c9up/quasar/services/main` | Le gestionnaire par défaut (export par défaut), `setQuasar`, `getQuasar`, `clearQuasar` |
| `@c9up/quasar/configure` | `configure(codemods)`, lancé par `ream configure` |

## Exports

### `@c9up/quasar`

| Export | Nature | Description |
|---|---|---|
| `defineConfig` | fonction | Type `config/redis.ts` ; lève une erreur si aucune connexion n'est déclarée ou si celle par défaut ne l'est pas. |
| `isClusterConfig` | fonction | `true` quand une configuration de connexion décrit un cluster (`clusters` renseigné). |
| `QuasarManager` | classe | Les connexions déclarées, ouvertes à la demande. Les commandes Redis appelées dessus passent par la connexion par défaut. |
| `QuasarConnection` | classe | Une connexion : les commandes ioredis, le pub/sub, l'état et les événements. |
| `QuasarCheck` | classe | Contrôle de santé qui envoie PING à une connexion. |
| `QuasarMemoryUsageCheck` | classe | Contrôle de santé qui compare la mémoire du serveur à un seuil d'alerte et à un seuil d'échec. |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs) |
| `tracingChannels` | constante | Espace de noms qui contient `redisCommand`, le canal de traçage `quasar.redis.command`. |
| `QuasarConfig` | type | `{ connection: keyof Connections & string; connections: Connections }`. |
| `ConnectionConfig` | type | `StandaloneConnectionConfig \| ClusterConnectionConfig`. |
| `StandaloneConnectionConfig` | interface | `RedisOptions` d'ioredis, plus `url?`, `port?: string \| number`, `password?` et `sentinelPassword?` sous forme de `Credential`. |
| `ClusterConnectionConfig` | interface | `{ clusters: ClusterNode[]; clusterOptions?: QuasarClusterOptions }`. |
| `QuasarClusterOptions` | interface | `ClusterOptions` d'ioredis, dont les mots de passe de `redisOptions` acceptent un `Credential`. |
| `Credential` | type | `string \| SecretValue`. |
| `SecretValue` | interface | `{ release(): string }` : un secret tel que `env.get()` le rend pour `Env.schema.secret()`. |
| `RedisClient` | type | `Redis \| Cluster` (ioredis). |
| `QuasarService` | interface | Le gestionnaire vu structurellement ; le type de l'accesseur de service. |
| `QuasarManagerEvents` | interface | `{ connection: QuasarConnection }`. |
| `QuasarConnectionEvents` | interface | Chaque événement d'une connexion, avec sa charge utile. |
| `ChannelHandler` | type | `(message: string, channel: string) => void \| Promise<void>`. |
| `PatternHandler` | type | `(channel: string, message: string, pattern: string) => void \| Promise<void>`. |
| `PubSubOptions` | interface | `{ onError?(error: unknown): void; onSubscription?(count: number): void }`. |
| `ScriptDefinition` | interface | `{ lua: string; numberOfKeys?: number; readOnly?: boolean }`. |
| `QuasarLogger` | interface | `{ error(message: string, data?: Record<string, unknown>): void }`. |
| `HealthResult` | interface | `{ message: string; status: HealthStatus; finishedAt: Date; meta?: Record<string, unknown> }`. |
| `HealthStatus` | type | `'ok' \| 'warning' \| 'error'`. |
| `CheckedConnection` | interface | Ce qu'un contrôle de santé lit sur une connexion ; une `QuasarConnection` le satisfait. |
| `RedisCommandTracingData` | interface | `{ command: string; connection: string }` : le nom de la commande, jamais ses arguments. |

### `@c9up/quasar/provider`

| Export | Nature | Description |
|---|---|---|
| `default` (`QuasarProvider`) | provider | `register()` construit le gestionnaire depuis la configuration `redis` et le lie ; `boot()` lui passe le `logger` du conteneur ; `shutdown()` appelle `quitAll()`. |
| `QuasarAppContext` | interface | `{ container; config }` : l'hôte dont le provider a besoin. |

### `@c9up/quasar/services/main`

| Export | Nature | Description |
|---|---|---|
| `default` | constante | Le `QuasarService` installé. L'importer n'ouvre rien ; lire un membre avant qu'un gestionnaire soit installé lève une erreur. |
| `setQuasar` | fonction | `setQuasar(manager: QuasarService): void` : installe un gestionnaire (le provider l'appelle). |
| `getQuasar` | fonction | `getQuasar(): QuasarService \| undefined`. |
| `clearQuasar` | fonction | `clearQuasar(manager: QuasarService): void` : retire le gestionnaire installé s'il s'agit de celui-ci. |

### `QuasarManager`

`new QuasarManager(config: QuasarConfig<Connections>, logger?: QuasarLogger)`. Chaque commande ioredis de la liste relayée est aussi une méthode du gestionnaire et s'exécute sur la connexion par défaut (`redis.get('key')`).

| Membre | Signature | Description |
|---|---|---|
| `connection` | `connection(name?: keyof Connections & string): QuasarConnection` | La connexion nommée (celle par défaut sans nom), ouverte à la première utilisation puis conservée. Lève une erreur pour un nom non déclaré. |
| `defaultConnectionName` | `get defaultConnectionName(): keyof Connections & string` | La clé `connection` de la configuration. |
| `activeConnectionNames` | `get activeConnectionNames(): string[]` | Noms des connexions ouvertes. |
| `activeConnections` | `get activeConnections(): Record<string, QuasarConnection>` | Les connexions ouvertes. |
| `activeConnectionsCount` | `get activeConnectionsCount(): number` | Leur nombre. |
| `managerConfig` | `readonly managerConfig: QuasarConfig<Connections>` | La configuration ; non énumérable, et `toJSON()` / `util.inspect` l'affichent identifiants masqués. |
| `subscribe` | `subscribe(channel: string, handler: ChannelHandler, options?: PubSubOptions): void` | Abonnement sur la connexion par défaut. Un échec part vers `onError`, jamais vers un rejet. |
| `subscribed` | `subscribed(channel: string, handler: ChannelHandler, options?: PubSubOptions): Promise<void>` | Idem, résolu une fois le canal actif ; rejette en cas d'échec. |
| `unsubscribe` | `unsubscribe(channel: string, handler?: ChannelHandler): Promise<void>` | Retire un gestionnaire, ou tous ceux du canal. |
| `psubscribe` | `psubscribe(pattern: string, handler: PatternHandler, options?: PubSubOptions): void` | Abonnement par motif sur la connexion par défaut. |
| `psubscribed` | `psubscribed(pattern: string, handler: PatternHandler, options?: PubSubOptions): Promise<void>` | Forme attendable ; rejette en cas d'échec. |
| `punsubscribe` | `punsubscribe(pattern: string, handler?: PatternHandler): Promise<void>` | Retire un gestionnaire de motif. |
| `publish` | `publish(channel: string, message: string): Promise<number>` | Publie sur la connexion par défaut ; renvoie le nombre de destinataires. |
| `defineCommand` | `defineCommand(name: string, definition: ScriptDefinition): this` | Enregistre un script LUA sur chaque connexion ouverte et sur celles ouvertes ensuite. |
| `runCommand` | `runCommand(command: string, ...args: unknown[]): unknown` | Lance un script enregistré par `defineCommand` sur la connexion par défaut. |
| `useLogger` | `useLogger(logger: QuasarLogger): this` | Signale les pannes de connexion par ce logger. |
| `doNotLogErrors` | `doNotLogErrors(): this` | Cesse de journaliser les erreurs de connexion ; l'application gère l'événement `error`. |
| `quit` | `quit(name?: keyof Connections & string): Promise<void>` | QUIT sur une connexion, celle par défaut sans nom. |
| `disconnect` | `disconnect(name?: keyof Connections & string): Promise<void>` | Coupe une connexion sans attendre les commandes en cours. |
| `quitAll` | `quitAll(): Promise<void>` | QUIT sur toutes les connexions ouvertes. |
| `disconnectAll` | `disconnectAll(): Promise<void>` | Coupe toutes les connexions ouvertes. |
| `on` / `off` / `once` | `on('connection', listener): () => void` | Écoute chaque connexion ouverte par le gestionnaire ; `on` renvoie la fonction qui arrête l'écoute. |

### `QuasarConnection`

Chaque commande ioredis de la liste relayée est une méthode de la connexion (`connection.set(...)`).

| Membre | Signature | Description |
|---|---|---|
| `name` / `connectionName` | `readonly name: string` | Le nom déclaré de la connexion. |
| `status` | `get status(): RedisClient['status']` | Le statut ioredis de la socket de commandes. |
| `subscriberStatus` | `get subscriberStatus(): RedisClient['status'] \| undefined` | Le statut de la socket pub/sub, `undefined` avant le premier abonnement. |
| `lastError` / `lastSubscriberError` | `get lastError(): unknown` | Dernière erreur de chaque socket ; son `command` garde le nom, pas les arguments. |
| `isConnecting` / `isReady` / `isClosed` | `isReady(): boolean` | État de la socket de commandes. |
| `autoPipelineQueueSize` | `get autoPipelineQueueSize(): number` | Commandes en attente dans l'auto-pipeline. |
| `ioConnection` | `get ioConnection(): RedisClient` | Le client ioredis brut. |
| `ioSubscriberConnection` | `get ioSubscriberConnection(): RedisClient \| undefined` | Le client pub/sub brut, une fois ouvert. |
| `mode` / `subscribeMode` | `get mode(): Redis['mode'] \| undefined` | Mode ioredis de chaque socket. |
| `slots` | `get slots(): Cluster['slots'] \| undefined` | Carte des slots du cluster ; `undefined` hors cluster. |
| `nodes` | `nodes(role?: NodeRole): Redis[]` | Les nœuds d'un cluster, ou ceux d'un rôle ; lève une erreur hors cluster. |
| `subscribe` / `subscribed` | comme sur le gestionnaire | Ouvre la socket pub/sub au premier usage. S'abonner deux fois cumule les gestionnaires. |
| `psubscribe` / `psubscribed` | comme sur le gestionnaire | Abonnements par motif. |
| `unsubscribe` / `punsubscribe` | comme sur le gestionnaire | Retire un gestionnaire, ou tous ceux d'un canal. |
| `publish` | `publish(channel: string, message: string): Promise<number>` | Publie sur la socket de commandes. |
| `defineCommand` / `runCommand` | comme sur le gestionnaire | Scripts LUA sur cette connexion. |
| `useLogger` / `doNotLogErrors` | comme sur le gestionnaire | Signalement des erreurs de cette connexion. |
| `quit` / `disconnect` | `quit(): Promise<void>` | Ferme les deux sockets ; les gestionnaires sont retirés. |
| `on` / `off` / `once` / `clearListeners` / `listenerCount` | `on(event, listener): () => void` | Événements de `QuasarConnectionEvents` : `connect`, `wait`, `ready`, `error`, `close`, `reconnecting`, `end`, les événements `subscriber:*` et `node:*`, `subscription:ready` / `subscription:error` et leurs jumeaux `psubscription:`. |

### Contrôles de santé

| Membre | Signature | Description |
|---|---|---|
| `new QuasarCheck` | `new QuasarCheck(connection: CheckedConnection)` | Nommé `Redis health check (<connexion>)`. |
| `new QuasarMemoryUsageCheck` | `new QuasarMemoryUsageCheck(connection: Connection)` | Nommé `Redis memory consumption health check (<connexion>)`. |
| `warnWhenExceeds` | `warnWhenExceeds(value: string \| number): this` | Seuil d'alerte en octets ou en taille (`'100 mb'`). 100 Mo par défaut. |
| `failWhenExceeds` | `failWhenExceeds(value: string \| number): this` | Seuil d'échec. 120 Mo par défaut. |
| `compute` | `compute(callback: (connection: Connection) => Promise<number \| null>): this` | Mesure la mémoire autrement ; `null` signifie illisible. |
| `as` | `as(name: string): this` | Renomme le contrôle. |
| `cacheFor` | `cacheFor(duration: string \| number): this` | Réutilise un résultat pendant des secondes ou une durée (`'1 minute'`). |
| `run` | `run(): Promise<HealthResult>` | Ne lève jamais d'erreur ; aucune commande n'est envoyée à une connexion qui n'est pas prête. |

## Configuration

`config/redis.ts`, lu sous la clé `redis`.

| Option | Type | Défaut | Description |
|---|---|---|---|
| `connection` | `keyof Connections & string` | — | La connexion que rend `redis.connection()` sans nom. Doit être déclarée. |
| `connections` | `Record<string, ConnectionConfig>` | — | Au moins une connexion. |
| `connections.<nom>.url` | `string` | — | URL `redis://` ou `rediss://` ; prime sur l'hôte et le port. |
| `connections.<nom>.port` | `string \| number` | — | Une chaîne est convertie ; une valeur qui n'est pas un numéro de port est refusée. |
| `connections.<nom>.password` | `Credential` | — | Une chaîne ou un `Secret`, libéré à la construction du client. |
| `connections.<nom>.<option>` | `RedisOptions` d'ioredis | défauts d'ioredis | Toute autre option ioredis (`host`, `db`, `keyPrefix`, `retryStrategy`…). |
| `connections.<nom>.clusters` | `ClusterNode[]` | — | Nœuds d'amorce ; fait de la connexion un cluster. |
| `connections.<nom>.clusterOptions` | `QuasarClusterOptions` | — | Options de cluster d'ioredis. |

Le `config/redis.ts` généré lit `REDIS_HOST`, `REDIS_PORT` et `REDIS_PASSWORD`, utilise `db: 0` et renonce à se reconnecter après dix tentatives.

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `'quasar.redis'` | `QuasarManager<Record<string, ConnectionConfig>>` |
| `'redis'` | Le même gestionnaire |

Les deux jetons sont typés sur `ContainerBindings` dès que `@c9up/quasar` est importé.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_INVALID_BYTES_VALUE`](/fr/reference/errors#e-invalid-bytes-value) | Un seuil mémoire de `QuasarMemoryUsageCheck` ne se lit pas comme une taille. |
| [`E_QUASAR_MISSING_CONFIG`](/fr/reference/errors#e-quasar-missing-config) | `QuasarProvider` s'enregistre et `config/redis.ts` n'existe pas. |
| [`E_QUASAR_INVALID_CONFIG`](/fr/reference/errors#e-quasar-invalid-config) | `defineConfig` ne déclare aucune connexion, ou nomme une connexion par défaut qu'il ne déclare pas. |
| [`E_QUASAR_INVALID_PORT`](/fr/reference/errors#e-quasar-invalid-port) | Le `port` d'une connexion n'est pas un entier entre 0 et 65535. |
| [`E_QUASAR_UNKNOWN_CONNECTION`](/fr/reference/errors#e-quasar-unknown-connection) | `connection(name)` nomme une connexion que la configuration ne déclare pas. |
| [`E_QUASAR_UNKNOWN_COMMAND`](/fr/reference/errors#e-quasar-unknown-command) | `runCommand()` nomme une commande jamais définie avec `defineCommand()`, ou la connexion n'a pas une commande relayée. |
| [`E_QUASAR_NOT_A_CLUSTER`](/fr/reference/errors#e-quasar-not-a-cluster) | `nodes()` est appelée sur une connexion autonome. |
| [`E_QUASAR_INVALID_DURATION`](/fr/reference/errors#e-quasar-invalid-duration) | `cacheFor()` d'un contrôle de santé reçoit une durée illisible. |
| [`E_QUASAR_NOT_BOOTED`](/fr/reference/errors#e-quasar-not-booted) | Un membre de `services/main` est lu avant que `QuasarProvider` ait installé un gestionnaire, ou avant `setQuasar()`. |

Chacune est une classe du namespace `errors` et une `Exception` de `@c9up/flare` de statut 500 : testez `error.code` ou `error instanceof errors.E_*`. Les messages des refus `E_QUASAR_` commencent par `[redis]`.

## Migration

- `QuasarError` disparaît : testez `error.code`, ou `error instanceof errors.E_QUASAR_*` avec `import { errors } from '@c9up/quasar'`.
- `InvalidBytesValueError` n'est plus exportée : utilisez `errors.E_INVALID_BYTES_VALUE`, qui en était déjà l'alias.
- Une erreur d'une connexion ou d'une commande rejetée ne porte plus `error.command.args` ; `error.command.name` reste. Journalisez vous-même les arguments là où vous en avez besoin et où vous les savez sans danger.
- Une vérification de santé qui échoue rapporte maintenant un `message` fixe et `meta.error: { name, code }` au lieu du message de l'erreur et de l'objet erreur. Lisez le journal de la connexion pour l'erreur complète.

## Voir aussi

- [Redis](/fr/guides/database/redis)
- [Contrôles de santé](/fr/guides/digging-deeper/health-checks)
