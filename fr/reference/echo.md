# echo

`@c9up/echo` : un cache à stores nommés, sur une ou deux couches (mémoire, Redis), avec périodes de grâce, délais, factories à vol unique et tags. Guide : [Cache](/fr/guides/digging-deeper/cache).

## Installation

```bash
pnpm add @c9up/echo
ream configure @c9up/echo
```

`ream configure @c9up/echo` ajoute `CACHE_STORE=memory` à l'environnement, enregistre le provider et le module `@c9up/echo/commands`, et écrit `config/cache.ts`. Un store Redis demande `@c9up/quasar`, dépendance pair optionnelle.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/echo` | `CacheManager`, le constructeur de store, les drivers, `defineConfig`, les fonctions de durée, les erreurs et les types. |
| `@c9up/echo/provider` | `EchoProvider` (export par défaut). |
| `@c9up/echo/services/main` | Le `CacheManager` démarré (export par défaut), plus `setCache`, `getCache`, `clearCache`. Le lire avant le boot lève `E_ECHO_NOT_BOOTED`. |
| `@c9up/echo/configure` | `configure(codemods)`, exécuté par `ream configure @c9up/echo`. |
| `@c9up/echo/commands` | Les commandes `cache:clear`, `cache:delete` et `cache:prune` (`getMetaData`, `getCommand`). |
| `@c9up/echo/testing` | `createTestCache` pour les tests unitaires. |

## Exports

### `@c9up/echo`

| Export | Nature | Description |
|---|---|---|
| `defineConfig` | fonction | `defineConfig<T extends EchoProviderConfig \| MultiStoreConfig>(config: T): T`. Renvoie la config telle quelle. |
| `store` | fonction | `store(options?: Omit<StoreConfig, 'driver'>): Store` : commence la description d'un store. |
| `Store` | classe | Constructeur de store : `useL1Layer`, `useL2Layer`, `useBus`. |
| `drivers` | const | Factories de drivers : `memory`, `redis`, `redisBus`, `tiered`. |
| `CacheManager` | classe | Un store : lectures, écritures, `getOrSet`, tags, espaces de noms, événements. |
| `CacheStoreManager` | classe | Tous les stores d'une config `{ default, stores }`, construits au premier usage. |
| `MemoryDriver` | classe | Driver en mémoire du processus, avec TTL, grâce, tags et bornes LRU. |
| `RedisDriver` | classe | Driver Redis avec tags. |
| `TieredDriver` | classe | L1 devant L2, avec un bus optionnel. |
| `isBusMessage` | fonction | `isBusMessage(value: unknown): value is BusMessage`. |
| `parseDuration` | fonction | `parseDuration(value: string): number` : `'5m'`, `'300s'`, `'500ms'` en secondes ; un nombre nu vaut des secondes. |
| `resolveTtlSeconds` | fonction | `resolveTtlSeconds(ttl: Duration \| undefined, defaultSeconds: number): number`. `null`, `0` et `Infinity` signifient sans expiration (`0`) ; un TTL négatif reste négatif (déjà expiré). |
| `EchoError` | erreur | Classe de base avec `readonly code: string`. |
| `FactoryError` | erreur | `E_FACTORY_ERROR` : `key`, `cause`, `isBackground`. |
| `TimeoutError` | erreur | `E_FACTORY_HARD_TIMEOUT`. |
| `LockTimeoutError` | erreur | `E_ECHO_LOCK_TIMEOUT`, avec `key`. |
| `L2CacheError` | erreur | `E_L2_CACHE_ERROR` ; `cause` est l'erreur de la L2. |
| `UndefinedValueError` | erreur | `E_UNDEFINED_VALUE` ; étend `TypeError`. |
| `InvalidArgumentError` | erreur | `E_ECHO_INVALID_ARGUMENT` ; étend `TypeError`. |
| `InvalidDurationError` | erreur | `E_ECHO_INVALID_DURATION` ; étend `TypeError`. |
| `errors` | const | `{ E_FACTORY_ERROR, E_FACTORY_HARD_TIMEOUT, E_UNDEFINED_VALUE, E_L2_CACHE_ERROR }`, les classes d'erreur par code. |
| `CacheConfig` | interface | Options d'un `CacheManager` ; voir [Configuration](#configuration). |
| `EchoProviderConfig` | interface | `CacheConfig` plus `driver?: 'memory'` : la forme à un seul store de `config/cache.ts`. |
| `MultiStoreConfig` | interface | `{ default: string; ttl?: Duration; stores: Record<string, StoreConfig \| Store>; emitter?: CacheEmitter }`. |
| `StoreConfig` | interface | `{ driver: DriverFactory }` plus les options du store. |
| `DriverFactory` | type | `(context?: DriverContext) => CacheDriver`. |
| `DriverContext` | interface | `{ store: string }`, la clé du store dans la config. |
| `CacheDriver` | interface | Le contrat de driver : `get`, `set`, `delete`, `flush(prefix?)`, `has`, et en option `getEntry`, `setEntry`, `connect`, `prune`, `disconnect`. |
| `TaggableDriver` | interface | `CacheDriver` plus `setWithTags`, `deleteByTag`, `flushTags`. |
| `CacheEntry` | interface | `{ value: T; stale: boolean; expiresAt?: number; tags?: string[] }`. |
| `MemoryDriverOptions` | interface | Voir [Drivers](#drivers). |
| `RedisClient` | interface | Les commandes Redis qu'appelle le driver (`get`, `set`, `del`, `exists`, `keys`, `sadd`, `srem`, `smembers`, `expire`, `persist`, `ttl`, `scan` en option). |
| `TieredDriverOptions` | interface | `{ l1: CacheDriver; l2: CacheDriver; bus?: CacheBus; suppressL2Errors?: boolean; l2CircuitBreakerDuration?: Duration; store?: string }`. |
| `CacheBus` | interface | `publish(message)`, `subscribe(handler)`, `unsubscribe(handler)` en option. |
| `BusMessage` | interface | `{ type: 'delete' \| 'clear'; keys: string[]; … }`. |
| `Duration` | type | `number \| string \| null` : des secondes, ou `'30s'`, `'10m'`, `'1h'`, `'2d'`, `'1w'`. |
| `Factory` | type | `() => T \| Promise<T>`. |
| `DefaultValue` | type | `T \| (() => T)`. |
| `GetOptions` | interface | `{ key: string; defaultValue?: DefaultValue<T>; grace?: Duration }`. |
| `SetOptions` | interface | `{ key: string; value: unknown; ttl?: Duration; grace?: Duration; tags?: string[] }`. |
| `GetOrSetOptions` | interface | Voir [`getOrSet`](#getorset). |
| `GetOrSetForeverOptions` | type | `Omit<GetOrSetOptions<T>, 'ttl'>`. |
| `DeleteOptions`, `HasOptions`, `ExpireOptions` | interface | `{ key: string }`. |
| `DeleteManyOptions` | interface | `{ keys: string[] }`. |
| `DeleteByTagOptions` | interface | `{ tags: string[] }`. |
| `CacheEventMap` | interface | Contenu de chaque événement ; voir [Événements](#evenements). |
| `CacheEmitter` | interface | `{ emit(event: string, payload: unknown): unknown }` : tout émetteur convient. |

### `CacheManager`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new CacheManager(driver: CacheDriver, config?: CacheConfig)` | |
| `name` | `get name(): string` | Le nom du store que rapportent les événements. |
| `get` | `get<T = unknown>(key: string): Promise<T \| undefined>` | Aussi `get(options: GetOptions<T>)`. `defaultValue` répond à un échec ; `grace` laisse répondre une valeur périmée. |
| `set` | `set(key: string, value: unknown, ttlSeconds?: number): Promise<void>` | Aussi `set(options: SetOptions)`. `null` et `undefined` sont refusés. |
| `setForever` | `setForever(options: Omit<SetOptions, 'ttl'>): Promise<void>` | N'expire jamais. |
| `getOrSet` | `getOrSet<T>(key: string, ttlSeconds: number, factory: Factory<T>): Promise<T>` | Aussi `getOrSet(options: GetOrSetOptions<T>)`. Une seule factory tourne par clé ; les appelants simultanés l'attendent. |
| `getOrSetForever` | `getOrSetForever<T>(options: GetOrSetForeverOptions<T>): Promise<T>` | |
| `has` / `missing` | `has(key: string): Promise<boolean>` | Prennent aussi des `HasOptions`. |
| `pull` | `pull<T = unknown>(key: string): Promise<T \| undefined>` | Lit et supprime. |
| `delete` | `delete(key: string): Promise<boolean>` | Aussi `delete(options: DeleteOptions)`. |
| `deleteMany` | `deleteMany(keysOrOptions: string[] \| DeleteManyOptions): Promise<boolean>` | |
| `expire` | `expire(keyOrOptions: string \| ExpireOptions): Promise<boolean>` | Rend la clé périmée tout de suite et la garde pendant sa période de grâce ; sans grâce, la supprime. |
| `clear` | `clear(): Promise<void>` | Vide le store, ou seulement cet espace de noms. |
| `setWithTags` | `setWithTags(key: string, value: unknown, tags: string[], ttlSeconds?: number): Promise<void>` | |
| `deleteByTag` | `deleteByTag(tags: string[]): Promise<void>` | Aussi `deleteByTag(options: DeleteByTagOptions)`. `flushTags(tags)` est un alias déprécié. |
| `namespace` | `namespace(ns: string): CacheManager` | Une vue sous un préfixe de clé supplémentaire ; partage le driver, les défauts et l'état de vol unique. |
| `use` | `use(name?: string): CacheManager` | Un store nommé de la config. Lève une erreur quand le gestionnaire n'a qu'un store et qu'un nom est donné. |
| `on` / `once` | `on<E extends keyof CacheEventMap>(event: E, listener: (payload: CacheEventMap[E]) => void): this` | Un écouteur qui lève une erreur est ignoré. |
| `off` | `off<E extends keyof CacheEventMap>(event: E, listener?: (payload: CacheEventMap[E]) => void): this` | Sans écouteur, les retire tous. |
| `prune` | `prune(): Promise<void>` | Retire les entrées expirées, pour les drivers qui n'évincent pas d'eux-mêmes. |
| `connect` / `connectAll` | `connect(): Promise<void>` | Ouvre ce dont le driver a besoin hors du processus (un abonnement au bus) ; `connectAll` couvre tous les stores. |
| `disconnect` / `disconnectAll` | `disconnect(): Promise<void>` | Libère ce que possède le driver. Un client Redis injecté n'est pas fermé. |

#### `getOrSet`

| `GetOrSetOptions` | Type | Description |
|---|---|---|
| `key` | `string` | |
| `factory` | `Factory<T>` | Calcule la valeur en cas d'échec. |
| `ttl` | `Duration` | Fraîcheur de la valeur. |
| `grace` | `Duration` | Combien de temps une valeur périmée est gardée pour répondre quand la factory échoue ou tarde. |
| `graceBackoff` | `Duration` | Après une factory en échec, combien de temps la valeur périmée compte comme fraîche. `'10s'` par défaut ; `0` ou `null` réessaie à l'appel suivant. |
| `timeout` | `Duration` | Délai souple : sur une valeur périmée, répondre celle-ci si la factory est plus lente, et rafraîchir en arrière-plan. |
| `hardTimeout` | `Duration` | Rejeter avec `TimeoutError` au-delà. |
| `lockTimeout` | `Duration` | Attente maximale de la factory d'un autre appelant pour la même clé ; ensuite la valeur périmée, ou `LockTimeoutError`. |
| `tags` | `string[]` | |
| `onFactoryError` | `(error: FactoryError) => void` | Informé de chaque échec de factory, au premier plan comme en arrière-plan. |

### `CacheStoreManager`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new CacheStoreManager(config: MultiStoreConfig)` | |
| `defaultStoreName` | `get defaultStoreName(): string` | |
| `use` | `use(name?: string): CacheManager` | Un store par nom, ou celui par défaut ; construit une fois. |
| `on` / `once` / `off` | comme sur `CacheManager` | Sur tous les stores, y compris ceux pas encore construits. |
| `clearAll` | `clearAll(): Promise<void>` | Vide tous les stores configurés. |
| `prune` | `prune(): Promise<void>` | Élague tous les stores configurés. |
| `connectAll` / `disconnectAll` | `connectAll(): Promise<void>` | Tous les stores construits. |

### `Store`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Store(options?: Omit<StoreConfig, 'driver'>)` | |
| `useL1Layer` | `useL1Layer(driver: DriverFactory): this` | La couche rapide, en général la mémoire. |
| `useL2Layer` | `useL2Layer(driver: DriverFactory): this` | La couche partagée, en général Redis. |
| `useBus` | `useBus(bus: CacheBus): this` | Garde la L1 de chaque instance à jour après une écriture ; demande deux couches. |
| `entry` | `entry(): StoreConfig` | Le `{ driver, …options }` que lit le gestionnaire. Lève `E_ECHO_INVALID_CONFIG` sans couche, ou avec un bus sur une seule couche. |

### Drivers

| Factory | Signature | Description |
|---|---|---|
| `drivers.memory` | `memory(options?: MemoryDriverOptions): DriverFactory` | |
| `drivers.redis` | `redis(options: { client: RedisClient; prefix?: string } \| { connection?: string; prefix?: string }): DriverFactory` | Un client, ou le nom d'une connexion quasar, chargée à la première commande. |
| `drivers.redisBus` | `redisBus(options?: { connection?: string; channel?: string }): CacheBus` | Le pub/sub Redis comme bus. |
| `drivers.tiered` | `tiered(options: { l1: DriverFactory; l2: DriverFactory } & Omit<TieredDriverOptions, 'l1' \| 'l2'>): DriverFactory` | Ce que `Store` construit à partir de deux couches. |

| `MemoryDriverOptions` | Type | Défaut | Description |
|---|---|---|---|
| `sweepIntervalMs` | `number` | `60000` | Fréquence du balayage des entrées expirées. |
| `maxItems` | `number` | `1000` | Entrées tenues avant que la moins récemment utilisée parte ; `0` ou `Infinity` pour aucun plafond. |
| `maxSize` | `number \| string` | aucun | Taille totale des valeurs (octets ou `'10mb'`) ; demande `serialize`. |
| `maxEntrySize` | `number \| string` | `maxSize` | Plus grande valeur unique ; une valeur plus grande n'est pas stockée et l'ancienne valeur de la clé part. |
| `serialize` | `boolean` | `true` | Stocker du JSON et renvoyer des copies ; `false` garde les références. |

`new MemoryDriver(options?)`, `new RedisDriver(source: RedisClient \| (() => RedisClient \| Promise<RedisClient>), prefix?: string)` et `new TieredDriver(options: TieredDriverOptions)` construisent un driver directement. `MemoryDriver#destroy()` arrête le minuteur de balayage. Dans un store à deux couches, `suppressL2Errors` (`true` par défaut) fait d'une lecture L2 en échec un échec de cache et d'une écriture L2 en échec une écriture sautée ; les invalidations signalent une L2 en échec dans tous les cas. `l2CircuitBreakerDuration` saute une L2 défaillante pendant cette durée.

### Événements

| Événement | Contenu |
|---|---|
| `cache:hit` | `{ key, value, store, graced: boolean, duration }` |
| `cache:miss` | `{ key, store, duration }` |
| `cache:written` | `{ key, value, store, ttl: number \| null, duration }` |
| `cache:deleted` | `{ key, store, duration }` |
| `cache:cleared` | `{ store, duration }` |
| `cache:expire` | `{ key, store, duration }` |

`duration` est en millisecondes. Le provider envoie les événements par la liaison `emitter` du conteneur quand elle existe.

### `@c9up/echo/testing`

| Export | Nature | Description |
|---|---|---|
| `createTestCache` | fonction | `createTestCache(options?: CreateTestCacheOptions): TestCache` : un cache mémoire isolé qui enregistre ses événements. |
| `CreateTestCacheOptions` | interface | `{ prefix?: string; ttl?: number; grace?: Duration; name?: string }` ; `name` vaut `'test'` par défaut. |
| `TestCache` | interface | `{ cache: CacheManager; driver: MemoryDriver; events: RecordedEvent[]; dispose(): void }`. Appelez `dispose()` après chaque test. |
| `RecordedEvent` | interface | `{ event: string; payload: unknown }`. |

### Commandes

| Commande | Arguments et options | Description |
|---|---|---|
| `cache:clear` | `[store]`, `--namespace` (`-n`), `--tags` (`-t`), `--force` | Vide un store, un espace de noms ou des tags. Demande confirmation en production, sauf avec `--force`. |
| `cache:delete` | `<key> [store]` | Supprime une entrée. Demande confirmation en production. |
| `cache:prune` | `[store]` | Retire les entrées expirées, pour les stores sans TTL natif. |

## Configuration

`config/cache.ts` exporte `defineConfig({ default, stores })` ; la forme à un seul store `{ prefix, ttl, … }` construit un store mémoire. Les stores se construisent au premier usage : un store Redis jamais utilisé n'ouvre aucune connexion.

| Option | Type | Défaut | Description |
|---|---|---|---|
| `default` | `string` | (obligatoire) | Le store vers lequel résout `cache`. |
| `stores` | `Record<string, StoreConfig \| Store>` | (obligatoire) | Des constructeurs `store()`, ou `{ driver: drivers.memory(), … }`. |
| `ttl` | `Duration` | `3600` (secondes) | TTL dont hérite chaque store. |
| `emitter` | `CacheEmitter` | l'`emitter` du conteneur | Émetteur partagé pour les événements de tous les stores. |

Options d'un store (`store(options)`) et d'une `CacheConfig` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `prefix` | `string` | `''` | Préfixe de chaque clé. |
| `ttl` | `Duration` | `3600` (secondes) | Fraîcheur d'une entrée. |
| `grace` | `Duration` | aucun | Période de grâce par défaut. |
| `graceBackoff` | `Duration` | `'10s'` | Voir `getOrSet`. |
| `timeout` | `Duration` | aucun | Délai souple par défaut de `getOrSet`. |
| `hardTimeout` | `Duration` | aucun | Délai strict par défaut de `getOrSet`. |
| `lockTimeout` | `Duration` | aucun | Attente de vol unique par défaut. |
| `suppressL2Errors` | `boolean` | `true` | Stores à deux couches seulement. |
| `l2CircuitBreakerDuration` | `Duration` | désactivé | Stores à deux couches seulement. |
| `name` | `string` | `'default'` | `CacheConfig` seulement : le nom du store que rapportent les événements. |

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `CacheManager` (classe), `'echo.cache'`, `'cache'` | Le `CacheManager` du store par défaut ; `use(name)` atteint les autres. |

Les jetons chaîne sont déclarés sur `ContainerBindings`. Le provider publie le cache sur `services/main` au boot et ouvre les connexions des drivers (un abonnement au bus) quand l'application est prête.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_FACTORY_ERROR`](/fr/reference/errors#e-factory-error) | La factory de `getOrSet()` a levé une erreur ; `cause` la contient. |
| [`E_FACTORY_HARD_TIMEOUT`](/fr/reference/errors#e-factory-hard-timeout) | La factory n'a pas fini dans son délai strict. |
| [`E_UNDEFINED_VALUE`](/fr/reference/errors#e-undefined-value) | Une valeur `null` ou `undefined` a été écrite. |
| [`E_L2_CACHE_ERROR`](/fr/reference/errors#e-l2-cache-error) | La L2 d'un store à deux couches a échoué et l'échec n'est pas masqué. |
| [`E_ECHO_LOCK_TIMEOUT`](/fr/reference/errors#e-echo-lock-timeout) | Un appelant a trop attendu la factory d'un autre pour la même clé, sans valeur périmée. |
| [`E_ECHO_INVALID_ARGUMENT`](/fr/reference/errors#e-echo-invalid-argument) | Une méthode a reçu un argument dont elle ne peut rien faire. |
| [`E_ECHO_INVALID_DURATION`](/fr/reference/errors#e-echo-invalid-duration) | Une durée n'est ni un nombre ni une chaîne lisible. |
| [`E_ECHO_INVALID_CONFIG`](/fr/reference/errors#e-echo-invalid-config) | Une valeur de config est illisible, ou un store n'a pas de couche. |
| [`E_ECHO_UNKNOWN_STORE`](/fr/reference/errors#e-echo-unknown-store) | Un nom de store, ou le store par défaut, n'est pas déclaré dans `stores`. |
| [`E_ECHO_UNSUPPORTED_DRIVER`](/fr/reference/errors#e-echo-unsupported-driver) | La config à un seul store nomme un autre driver que `memory`. |
| [`E_ECHO_NOT_TAGGABLE`](/fr/reference/errors#e-echo-not-taggable) | Invalidation par tag sur un driver sans tags. |
| [`E_ECHO_SCAN_UNSUPPORTED`](/fr/reference/errors#e-echo-scan-unsupported) | `flush()` sur un client Redis sans `scan()`. |
| [`E_ECHO_UNSERIALIZABLE_VALUE`](/fr/reference/errors#e-echo-unserializable-value) | Le driver mémoire stocke du JSON et la valeur n'en a pas ; passez `serialize: false`. |
| [`E_ECHO_QUASAR_MISSING`](/fr/reference/errors#e-echo-quasar-missing) | Un store Redis est configuré et `@c9up/quasar` n'est pas installé. |
| [`E_ECHO_INCOMPLETE_CONNECTION`](/fr/reference/errors#e-echo-incomplete-connection) | La connexion quasar n'a pas `publish()` ou `subscribe()`. |
| [`E_ECHO_NOT_BOOTED`](/fr/reference/errors#e-echo-not-booted) | `services/main` a servi avant `EchoProvider.boot()` ou `setCache()`. |

## Voir aussi

- [Cache](/fr/guides/digging-deeper/cache)
- [Redis](/fr/guides/database/redis)
- [quasar](/fr/reference/quasar)
