# eclipse

`@c9up/eclipse` : des verrous distribués : une clé, un détenteur, avec des magasins mémoire, Redis et base SQL derrière un même contrat. Guide : [Verrous](/fr/guides/digging-deeper/locks).

## Installation

```bash
pnpm add @c9up/eclipse
```

`ream configure @c9up/eclipse` enregistre le provider, écrit `config/lock.ts` et ajoute `LOCK_STORE=redis` au `.env` avec sa règle de validation. Le magasin Redis demande `@c9up/quasar` (pair facultatif) lorsqu'il nomme une connexion ; le magasin base de données demande `@c9up/atlas` lorsqu'on ne lui passe pas de client.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/eclipse` | `LockManager`, `LockFactory`, `Lock`, `defineConfig`, `stores`, les trois magasins, les durées, les erreurs, les types |
| `@c9up/eclipse/provider` | `EclipseProvider` (export par défaut) |
| `@c9up/eclipse/services/main` | Le `LockManager` démarré (export par défaut), `setLocks`, `getLocks`, `clearLocks` |
| `@c9up/eclipse/scheduler` | `schedulerBackend`, le backend de verrou du planificateur de ream |
| `@c9up/eclipse/testing` | `fakeLocks` |
| `@c9up/eclipse/configure` | `configure(codemods)`, lancé par `ream configure` |

## Exports

### `@c9up/eclipse`

| Export | Nature | Description |
|---|---|---|
| `LockManager` | classe | Les magasins configurés, construits au premier usage ; crée et restaure les verrous. |
| `LockFactory` | classe | Un magasin, avec les défauts dont héritent ses verrous. |
| `Lock` | classe | Un bail sur une clé, non acquis tant qu'on ne le demande pas. |
| `defineConfig` | fonction | Vérifie `config/lock.ts` là où il est écrit : `stores` présent, `default` un magasin déclaré. |
| `stores` | constante | Fabriques de magasins pour la configuration : `memory()`, `redis(options)`, `database(options?)`. |
| `MemoryStore` | classe | Magasin en mémoire du processus. Ne verrouille rien entre processus ; pour les tests et un processus unique. |
| `RedisStore` | classe | `SET NX PX` pour prendre un bail, scripts Lua pour ne libérer et prolonger que le sien. |
| `DatabaseStore` | classe | Une table sur PostgreSQL, MySQL ou SQLite, partagée par chaque réplique qui atteint la base. |
| `parseDuration` | fonction | `parseDuration(value: string): number` : `'30s'`, `'5m'`, `'500ms'` en millisecondes ; un nombre seul est en millisecondes. |
| `resolveMs` | fonction | `resolveMs(value: Duration \| undefined, fallback: number \| null): number \| null`. |
| `assertValidTtl` | fonction | `assertValidTtl(ttl: number \| null): void` : lève `E_ECLIPSE_INVALID_TTL` sauf pour un nombre fini positif ou `null`. |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs). |
| `Duration` | type | `number \| string \| null` : des millisecondes, une durée en texte, ou `null` pour « n'expire jamais ». |
| `LockConfig` | interface | `{ default: string; stores: Record<string, StoreFactory>; retry?: RetryConfig; ttl?: Duration }`. |
| `StoreFactory` | type | `() => LockStore`. |
| `LockStore` | interface | Le contrat d'un magasin : `save`, `delete`, `forceDelete`, `exists`, `extend`, `disconnect` facultatif. |
| `RetryConfig` | interface | `{ attempts?: number; delay?: Duration; timeout?: Duration }`. |
| `LockAcquireOptions` | interface | `{ retry?: RetryConfig }`. |
| `LockFactoryOptions` | interface | `{ retry?: RetryConfig; ttl?: Duration }`. |
| `ResolvedLockConfig` | interface | `LockFactoryOptions` dont chaque valeur est résolue en millisecondes. |
| `SerializedLock` | interface | `{ key: string; owner: string; ttl: number \| null; expirationTime: number \| null }`. |
| `RedisStoreOptions` | interface | `{ prefix?: string }`, `'eclipse:lock:'` par défaut. |
| `LockRedisClient` | interface | Les commandes qu'envoie le magasin Redis : `set`, `evalsha`, `script`, `del`, `exists`. |
| `LockRedisResolver` | type | `LockRedisClient \| (() => LockRedisClient \| Promise<LockRedisClient>)`. |
| `DatabaseStoreOptions` | interface | `{ tableName?: string; sweepIntervalMs?: number }`. |
| `LockDatabase` | interface | `{ readonly dialect: string; rawQuery(sql: string, bindings: unknown[]): PromiseLike<readonly LockRow[]> }`. |
| `LockDatabaseSource` | type | `LockDatabase \| (() => LockDatabase \| Promise<LockDatabase>)`. |
| `LockRow` | type | `Record<string, unknown>`. |

### `@c9up/eclipse/provider`

| Export | Nature | Description |
|---|---|---|
| `default` (`EclipseProvider`) | provider | `register()` lie le `LockManager` construit depuis la configuration `lock` ; `boot()` l'installe sur `services/main` ; `shutdown()` appelle `disconnectAll()`. |
| `EclipseAppContext` | interface | `{ container; config }` : l'hôte dont le provider a besoin. |

### `@c9up/eclipse/services/main`

| Export | Nature | Description |
|---|---|---|
| `default` | constante | Le `LockManager` démarré ; lire un membre avant le démarrage lève une erreur. |
| `setLocks` | fonction | `setLocks(value: LockManager): void`. |
| `getLocks` | fonction | `getLocks(): LockManager \| undefined`. |
| `clearLocks` | fonction | `clearLocks(): void`. |

### `@c9up/eclipse/scheduler`

| Export | Nature | Description |
|---|---|---|
| `schedulerBackend` | fonction | `schedulerBackend(manager: LockManager \| (() => LockManager), options?: SchedulerBackendOptions): SchedulerLockBackend`. Prend le bail de chaque tâche avec `acquireImmediately()` et le renouvelle tous les tiers de son TTL pendant que la tâche tourne. |
| `SchedulerBackendOptions` | interface | `{ store?: string; prefix?: string; ttl?: Duration; onLeaseLost?: (name: string, error: Exception) => void }`. `prefix` vaut `'schedule:'` par défaut ; `ttl` remplace celui du planificateur ; `onLeaseLost` émet par défaut un avertissement du processus. |
| `SchedulerLockBackend` | interface | `{ acquire(name: string, ttlMs: number): Promise<boolean>; release(name: string): Promise<void> }`. |

### `@c9up/eclipse/testing`

| Export | Nature | Description |
|---|---|---|
| `fakeLocks` | fonction | `fakeLocks(container?: FakeableContainer): () => void`. Installe un `LockManager` à magasin mémoire sur `services/main` et, si un conteneur est fourni, remplace les trois jetons ; la fonction renvoyée restaure les deux. |
| `FakeableContainer` | interface | `{ swap(token: unknown, factory: () => unknown): void; restore(token: unknown): void }`. |

### `LockManager`

`new LockManager(config: LockConfig)` ; lève une erreur si la configuration est invalide.

| Membre | Signature | Description |
|---|---|---|
| `use` | `use(name?: string): LockFactory` | Le magasin nommé (celui par défaut sans nom), construit une fois. Lève `E_ECLIPSE_UNKNOWN_STORE`. |
| `createLock` | `createLock(key: string, ttl?: Duration): Lock` | Un verrou sur le magasin par défaut. |
| `restoreLock` | `restoreLock(serialized: SerializedLock): Lock` | Reconstruit un verrou sérialisé par un autre processus. |
| `disconnectAll` | `disconnectAll(): Promise<void>` | Libère ce que chaque magasin construit a ouvert lui-même ; un client fourni reste ouvert. |

### `LockFactory`

`new LockFactory(store: LockStore, options?: LockFactoryOptions)`.

| Membre | Signature | Description |
|---|---|---|
| `getStore` | `getStore(): LockStore` | Le magasin de cette fabrique. |
| `createLock` | `createLock(key: string, ttl?: Duration): Lock` | Un verrou sur `key`, pas encore acquis. `ttl` borne le temps pendant lequel un détenteur tombé garde la clé. |
| `restoreLock` | `restoreLock(serialized: SerializedLock): Lock` | Reconstruit un verrou depuis `Lock.serialize()`. |

### `Lock`

| Membre | Signature | Description |
|---|---|---|
| `getKey` | `getKey(): string` | La clé louée. |
| `getOwner` | `getOwner(): string` | Le jeton du détenteur, aléatoire par verrou sauf restauration. |
| `serialize` | `serialize(): SerializedLock` | Aplatit le verrou en données pour un autre processus. |
| `isExpired` | `isExpired(): boolean` | Expiré ; un verrou sans TTL ne l'est jamais. |
| `getRemainingTime` | `getRemainingTime(): number \| null` | Millisecondes restantes, au moins 0 ; `null` sans TTL. |
| `isLocked` | `isLocked(): Promise<boolean>` | Indique si quelqu'un détient la clé. |
| `acquire` | `acquire(options?: LockAcquireOptions): Promise<boolean>` | Prend le verrou en réessayant tant qu'il est détenu ; `false` une fois le budget épuisé. |
| `acquireImmediately` | `acquireImmediately(): Promise<boolean>` | Le prend s'il est libre maintenant, sans attendre. |
| `run` | `run<T>(callback: () => Promise<T>): Promise<[true, T] \| [false, null]>` | Acquiert, exécute, libère. Lève `E_LOCK_NOT_OWNED` quand le travail a réussi mais que le bail a expiré. |
| `runImmediately` | `runImmediately<T>(callback: () => Promise<T>): Promise<[true, T] \| [false, null]>` | `run` sans attente. |
| `release` | `release(): Promise<void>` | Libère ; lève `E_LOCK_NOT_OWNED` si ce détenteur ne le possède plus. |
| `forceRelease` | `forceRelease(): Promise<void>` | Libère quel que soit le détenteur. |
| `extend` | `extend(duration?: Duration): Promise<void>` | Repousse l'expiration à partir de maintenant (le TTL du verrou sans argument) ; lève `E_LOCK_NOT_OWNED`. |

### Magasins

| Membre | Signature | Description |
|---|---|---|
| `stores.memory` | `memory(): StoreFactory` | Un `MemoryStore`. |
| `stores.redis` | `redis(options: ({ client: LockRedisClient } \| { connection?: string }) & RedisStoreOptions): StoreFactory` | Un `RedisStore` sur un client, ou sur une connexion `@c9up/quasar` chargée au premier verrou. |
| `stores.database` | `database(options?: { connection?: LockDatabaseSource \| string; tableName?: string }): StoreFactory` | Un `DatabaseStore` sur un client, un nom de connexion atlas, ou la connexion par défaut d'atlas. |
| `new RedisStore` | `new RedisStore(client: LockRedisResolver, options?: RedisStoreOptions)` | |
| `new DatabaseStore` | `new DatabaseStore(source: LockDatabaseSource, options?: DatabaseStoreOptions)` | Table `locks` par défaut, qualifiable par un schéma ; les lignes expirées sont balayées au plus une fois par minute par défaut. |
| `new MemoryStore` | `new MemoryStore()` | |

La table du magasin base de données a `key` (clé primaire), `owner` et `expiration` (millisecondes epoch, `NULL` n'expire jamais). Le paquet fournit la migration dans `stubs/database/migrations/9200_create_locks.stub`.

## Configuration

`config/lock.ts`, lu sous la clé `lock`.

| Option | Type | Défaut | Description |
|---|---|---|---|
| `default` | `string` | — | Le magasin qu'utilise `createLock()`. La configuration générée lit `LOCK_STORE`. |
| `stores` | `Record<string, StoreFactory>` | — | Magasins nommés, construits au premier usage. |
| `ttl` | `Duration` | `30s` | Durée du bail quand `createLock` n'en donne pas ; `null` n'expire jamais. |
| `retry.attempts` | `number` | `Infinity` | Tentatives d'un `acquire()` bloquant. |
| `retry.delay` | `Duration` | `250ms` | Attente entre deux tentatives. |
| `retry.timeout` | `Duration` | aucun | Budget total d'`acquire()` ; `0` signifie ne pas attendre. |

La configuration générée déclare `memory: stores.memory()` et `redis: stores.redis({ connection: 'main' })`.

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `LockManager` (classe) | Le `LockManager` construit depuis `config/lock.ts` |
| `'eclipse.lock'` | Le même gestionnaire |
| `'lock'` | Le même gestionnaire |

Les deux jetons texte sont typés sur `ContainerBindings` dès que `@c9up/eclipse` est importé.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_LOCK_NOT_OWNED`](/fr/reference/errors#e-lock-not-owned) | `release()` ou `extend()` par un détenteur qui ne possède plus le verrou, ou `run()` dont le travail a survécu au bail. |
| [`E_LOCK_STORAGE_ERROR`](/fr/reference/errors#e-lock-storage-error) | Le magasin a échoué en écrivant, lisant ou supprimant. |
| [`E_ECLIPSE_INVALID_TTL`](/fr/reference/errors#e-eclipse-invalid-ttl) | Un TTL n'est ni un nombre fini positif de millisecondes, ni `null`. |
| [`E_ECLIPSE_INVALID_DURATION`](/fr/reference/errors#e-eclipse-invalid-duration) | Une durée en texte ne se lit pas. |
| [`E_ECLIPSE_INVALID_RETRY`](/fr/reference/errors#e-eclipse-invalid-retry) | Une option `retry` est hors bornes. |
| [`E_ECLIPSE_INVALID_CONFIG`](/fr/reference/errors#e-eclipse-invalid-config) | La configuration n'a pas de `stores` ou de `default`, ou n'est pas une configuration de verrous. |
| [`E_ECLIPSE_MISSING_CONFIG`](/fr/reference/errors#e-eclipse-missing-config) | `config/lock.ts` est absent. |
| [`E_ECLIPSE_UNKNOWN_STORE`](/fr/reference/errors#e-eclipse-unknown-store) | `default` ou `use(name)` nomme un magasin non déclaré. |
| [`E_ECLIPSE_QUASAR_MISSING`](/fr/reference/errors#e-eclipse-quasar-missing) | Un magasin Redis nomme une connexion et `@c9up/quasar` n'est pas installé. |
| [`E_ECLIPSE_INCOMPLETE_CONNECTION`](/fr/reference/errors#e-eclipse-incomplete-connection) | La connexion quasar n'a pas une commande qu'envoie le magasin Redis. |
| [`E_ECLIPSE_DATABASE_UNAVAILABLE`](/fr/reference/errors#e-eclipse-database-unavailable) | Un magasin base de données demande atlas, qui n'est pas installé ou n'a pas démarré. |
| [`E_ECLIPSE_UNSUPPORTED_DATABASE`](/fr/reference/errors#e-eclipse-unsupported-database) | Un magasin base de données a reçu un dialecte autre que PostgreSQL, MySQL ou SQLite. |
| [`E_ECLIPSE_NOT_BOOTED`](/fr/reference/errors#e-eclipse-not-booted) | `services/main` a servi avant `EclipseProvider.boot()` ou `setLocks()`. |
| [`E_ECLIPSE_INVALID_BINDING`](/fr/reference/errors#e-eclipse-invalid-binding) | Le conteneur a résolu le jeton `LockManager` en autre chose qu'un `LockManager`. |

Chacune est une classe d'`errors`, une `Exception` de flare : lisez `error.code`, ou testez `error instanceof errors.E_LOCK_NOT_OWNED`.

## Migration

- `EclipseError` disparaît : testez `error.code`, ou `instanceof` une classe d'`errors`.
- Les classes portent le nom de leur code : `LockNotOwnedError` devient `errors.E_LOCK_NOT_OWNED`, `LockStorageError` devient `errors.E_LOCK_STORAGE_ERROR`, `InvalidTtlError` devient `errors.E_ECLIPSE_INVALID_TTL`, `InvalidRetryError` devient `errors.E_ECLIPSE_INVALID_RETRY`, `InvalidDurationError` devient `errors.E_ECLIPSE_INVALID_DURATION`, `MissingConfigError` devient `errors.E_ECLIPSE_MISSING_CONFIG`, `InvalidConfigError` devient `errors.E_ECLIPSE_INVALID_CONFIG`, `UnknownStoreError` devient `errors.E_ECLIPSE_UNKNOWN_STORE`.
- `E_LOCK_NOT_OWNED` et `E_LOCK_STORAGE_ERROR` portent désormais les messages du module de verrous dont ils viennent : « Looks like you are trying to update or release a lock that is not acquired by you » et « Lock storage error: `<raison>` ». Le nom du verrou est sur `error.key`, l'opération du store qui a échoué sur `error.operation` ; construisez-les avec `new errors.E_LOCK_NOT_OWNED(undefined, { key })` et `new errors.E_LOCK_STORAGE_ERROR([raison], { operation })`.

## Voir aussi

- [Verrous](/fr/guides/digging-deeper/locks)
- [Planification](/fr/guides/digging-deeper/scheduling)
- [Référence quasar](/fr/reference/quasar)
