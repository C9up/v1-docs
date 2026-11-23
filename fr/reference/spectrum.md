# spectrum

`@c9up/spectrum` : journalisation structurée, avec loggers nommés, loggers enfants, masquage, sérialiseurs et canaux console ou fichier. Guide : [Logger](/fr/guides/digging-deeper/logger/).

## Installation

```bash
pnpm add @c9up/spectrum
```

`ream configure @c9up/spectrum` enregistre le provider et écrit `config/logger.ts`.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/spectrum` | `Logger`, `LoggerManager`, les canaux, `defineConfig`, `targets`, `onLog`, les sérialiseurs et les types |
| `@c9up/spectrum/provider` | `SpectrumProvider` (export par défaut) |
| `@c9up/spectrum/services/main` | Le logger de l'application (export par défaut) |
| `@c9up/spectrum/configure` | `configure()`, exécuté par `ream configure @c9up/spectrum` |
| `@c9up/spectrum/testing` | `FakeLogger`, un canal qui enregistre les entrées pour les assertions |

## Exports

### `@c9up/spectrum`

| Export | Nature | Description |
|---|---|---|
| `Logger` | classe | Un logger : méthodes par niveau, loggers enfants, liaisons |
| `LoggerManager` | classe | Un `Logger` pour le logger par défaut qui détient aussi les loggers nommés (`use()`) |
| `ConsoleChannel` | classe | Écrit sur stdout et stderr, en format lisible ou JSON |
| `FileChannel` | classe | Ajoute des lignes JSON à un fichier ou à un descripteur, avec rotation |
| `defineConfig` | fonction | Type `config/logger.ts` et renvoie un `LoggerManagerConfig` |
| `configure` | fonction | Identique à `@c9up/spectrum/configure` |
| `targets` | fonction | `targets()` commence une liste `Targets` ; `targets.file(options?, level?)` et `targets.pretty(options?, level?)` construisent les entrées |
| `Targets` | classe | Liste conditionnelle de cibles de transport : `push`, `pushIf`, `pushUnless`, `toArray` |
| `channelsFromTargets` | fonction | `channelsFromTargets(list: readonly TransportTargetOptions[], inheritedLevel?): LogChannel[]` |
| `onLog` | fonction | `onLog(listener: LogListener): () => void`, observe chaque entrée écrite ; renvoie la fonction de désabonnement |
| `clearLogListeners` | fonction | `clearLogListeners(): void`, retire tous les écouteurs `onLog` |
| `createRustLogBridge` | fonction | `createRustLogBridge(logger: Logger, options?: RustLogBridgeOptions): { start(): void; stop(): void }`, fait passer les lignes stderr du moteur Rust par `logger` |
| `parseRustLog` | fonction | `parseRustLog(line: string): LogEntry \| null`, lit une ligne `[LEVEL module] message` |
| `stdSerializers` | const | `{ err, req, res }`, les sérialiseurs standard |
| `stdTimeFunctions` | const | `{ epochTime, unixTime, isoTime, nullTime }`, valeurs pour l'option `timestamp` |
| `logLevel` | fonction | `logLevel(raw: unknown, fallback?: LogLevelWithSilent): LogLevelWithSilent` ; absent ou vide donne `fallback` (`'info'`), une valeur qui n'est pas un niveau lève une erreur |
| `isLogLevelWithSilent` | fonction | `isLogLevelWithSilent(value: unknown): value is LogLevelWithSilent` |
| `logEntryExtras` | fonction | `logEntryExtras(entry: LogEntry): Record<string, unknown>`, les champs fusionnés d'une entrée |
| `errors` | espace de noms | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs). Chacune est une `Exception` de flare avec un `code` chaîne. |
| `LogLevel` | type | `'trace' \| 'debug' \| 'info' \| 'warn' \| 'error' \| 'fatal'` |
| `LogLevelWithSilent` | type | `LogLevel \| 'silent'` |
| `LogEntry` | interface | `{ level, message, module, correlationId?, timestamp, [key: string]: unknown }`, champs fusionnés à la racine |
| `LogChannel` | interface | `{ name: string; write(entry: LogEntry): void; close?(): void \| Promise<void> }` |
| `LogConfig` | interface | La configuration d'un logger (voir Configuration) |
| `LoggerManagerConfig` | interface | `{ default: string; loggers: Record<string, LogConfig> }` |
| `ChildOptions` | interface | `{ level?, redact?, serializers?, msgPrefix? }` pour `child()` |
| `RedactOptions` | interface | `{ paths: string[]; censor?: string \| ((value, path) => unknown); remove?: boolean }` |
| `LogSerializer` | type | `(value: unknown) => unknown` |
| `LogMixin` | type | `(mergeObject, level: number, logger) => Record<string, unknown>` |
| `LogMethodHook` | type | `(this, args: unknown[], method, level: number) => void` |
| `LineWritable` | interface | `{ write(line: string): unknown }`, une destination JSON |
| `LogListener` | type | `(entry: LogEntry) => void` |
| `TimestampOption` | type | `'epoch' \| 'iso' \| 'unix' \| boolean \| (() => string)` |
| `LineFormatters` | interface | `{ level?(label, number): Record<string, unknown>; log?(object): Record<string, unknown> }` |
| `ConsoleChannelOptions` | interface | `{ stream?: 'stdout' \| 'stderr' }` |
| `FileChannelConfig` | interface | Options de `FileChannel` |
| `TransportTargetOptions` | interface | `{ target: string \| LogChannel; options?: Record<string, unknown>; level?: string }` |
| `FileTargetOptions` | interface | Options de `targets.file()` |
| `PrettyTargetOptions` | interface | Options de `targets.pretty()` |
| `RustLogBridgeOptions` | interface | `{ modules?: RegExp }`, les modules que le pont prend en charge (par défaut `/^ream-/`) |

### `Logger`

`new Logger(config: LogConfig, module?: string, correlationId?: string, bindings?: Record<string, unknown>)`. `module` vaut `'app'` par défaut.

| Membre | Signature | Description |
|---|---|---|
| `trace` … `fatal` | `info(mergingObject: unknown, message?: string, ...values: unknown[]): void`<br>`info(message: string, ...values: unknown[]): void` | Écrit à ce niveau. Un objet est fusionné à la racine de l'entrée, une `Error` va sous `err`, `values` remplissent les jetons printf ; un message suivi d'un seul objet sans jeton fusionne l'objet |
| `silent` | comme `info` | N'écrit rien |
| `log` | `log(level: LogLevel, message: string, ...values: unknown[]): void` | Écrit à un niveau choisi à l'exécution ; accepte aussi un objet à fusionner en premier |
| `child` | `child(bindings?: Record<string, unknown>, options?: ChildOptions): Logger` | Un logger dont les entrées portent `bindings` ; `module` et `correlationId` dans `bindings` fixent ces champs |
| `bindings` | `bindings(): Record<string, unknown>` | Nom, liaisons de l'enfant, `module` et `correlationId` |
| `setCorrelationId` | `setCorrelationId(id: string): void` | Fixe l'identifiant de corrélation sur cette instance ; préférez `child()` par requête |
| `level` | `level: LogLevelWithSilent` (lecture/écriture) | Le niveau de cette instance ; le modifier ne change ni le parent ni les frères |
| `levelNumber` | `readonly levelNumber: number` | Valeur numérique de `level` (`info` vaut 30, `silent` vaut `Infinity`) |
| `levels` | `readonly levels: { values: Record<string, number>; labels: Record<number, string> }` | Libellés et valeurs des niveaux |
| `isEnabled` | `readonly isEnabled: boolean` | `false` quand la configuration fixe `enabled: false` |
| `isLevelEnabled` | `isLevelEnabled(level: LogLevel): boolean` | Indique si une ligne à `level` serait écrite pour ce module |
| `ifLevelEnabled` | `ifLevelEnabled(level: LogLevel, callback: (logger: this) => void): void` | Exécute `callback` seulement si `level` est actif ; la promesse d'un callback asynchrone est renvoyée |

### `LoggerManager`

`new LoggerManager(config: LoggerManagerConfig)` étend `Logger` : ses propres méthodes écrivent via le logger par défaut.

| Membre | Signature | Description |
|---|---|---|
| `use` | `use(name?: string): Logger` | Le logger nommé (celui par défaut sans nom), créé une fois et mis en cache ; un nom inconnu lève une erreur |
| `createLogger` | `createLogger(name: string, config: LogConfig): Logger` | Construit un logger nommé `name`, non mis en cache |
| `create` | `create(config: LogConfig): Logger` | Construit un logger non géré depuis une configuration |

### Canaux

| Classe | Constructeur | Description |
|---|---|---|
| `ConsoleChannel` | `new ConsoleChannel(format?: 'pretty' \| 'json', options?: ConsoleChannelOptions)` | `format` vaut `'pretty'` par défaut. Sans `stream`, `error` et `fatal` vont sur stderr et le reste sur stdout. Les caractères de contrôle sont échappés en sortie lisible |
| `FileChannel` | `new FileChannel(config: FileChannelConfig)` | `close(): Promise<void>` vide le tampon et ferme le fichier |

`FileChannelConfig` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `path` | `string` | — | Fichier où ajouter les lignes ; le fichier et son dossier sont créés |
| `fd` | `number` | — | Un descripteur ouvert où écrire à la place ; jamais tourné ni fermé |
| `append` | `boolean` | `true` | `false` recommence le fichier à la première ouverture |
| `maxSizeBytes` | `number` | 10 Mio | Rotation avant que le fichier dépasse cette taille |
| `maxFiles` | `number` | `5` | Fichiers conservés, le fichier courant compris |
| `maxBufferBytes` | `number` | 16 Mio | Octets retenus pendant que le disque rattrape ; au-delà, les lignes sont abandonnées et une ligne `warn` les compte |

### `@c9up/spectrum/provider`

| Export | Nature | Description |
|---|---|---|
| `default` | provider | `SpectrumProvider` : construit un `LoggerManager` depuis la configuration `logger`, remplit `@c9up/spectrum/services/main`, transmet chaque entrée à l'émetteur `events` sous `log:line` et ferme les canaux à l'arrêt |
| `SpectrumAppContext` | interface | `{ container, config }`, ce dont le provider a besoin de l'application |

### `@c9up/spectrum/services/main`

| Export | Nature | Description |
|---|---|---|
| `default` | const | `logger: Logger`, le `LoggerManager` de l'application une fois `SpectrumProvider` démarré ; lire un membre avant lève une erreur |

### `@c9up/spectrum/configure`

| Export | Nature | Description |
|---|---|---|
| `configure` | fonction | `configure(codemods): Promise<void>` : enregistre `@c9up/spectrum/provider` et écrit `config/logger.ts` |

### `@c9up/spectrum/testing`

| Export | Nature | Description |
|---|---|---|
| `FakeLogger` | classe | Un `LogChannel` qui garde chaque entrée |
| `FakeLoggerPredicate` | interface | `{ containing?: string; dataMatches?(data): boolean }` |
| `FakeLoggerPredicateArg` | type | `FakeLoggerPredicate \| ((entry: LogEntry) => boolean)` |

| Membre | Signature | Description |
|---|---|---|
| `write` | `write(entry: LogEntry): void` | Enregistre une copie profonde de `entry` |
| `getLogged` | `getLogged(): LogEntry[]` | Copies des entrées enregistrées |
| `reset` | `reset(): void` | Oublie toutes les entrées |
| `assertLogged` | `assertLogged(level: LogLevel, predicate?: FakeLoggerPredicateArg): void` | Lève une erreur sauf si une entrée à `level` correspond |
| `assertNotLogged` | `assertNotLogged(level: LogLevel, predicate?: FakeLoggerPredicateArg): void` | Lève une erreur si une entrée à `level` correspond |

```ts
import { Logger } from '@c9up/spectrum'
import { FakeLogger } from '@c9up/spectrum/testing'

const fake = new FakeLogger()
const logger = new Logger({ channels: [fake] })
logger.info({ userId: 1 }, 'signed in')
fake.assertLogged('info', { containing: 'signed in' })
```

## Configuration

`config/logger.ts`, lu sous la clé `logger`. `defineConfig` accepte `{ default, loggers }`, ou un seul `LogConfig` qui devient un logger nommé `app`. Sans configuration, le provider construit un logger `app` au niveau `LOG_LEVEL` (ou `info`) qui écrit sur une console lisible.

```ts
import { defineConfig, logLevel, targets } from '@c9up/spectrum'

export default defineConfig({
  default: 'app',
  loggers: {
    app: {
      level: logLevel(process.env.LOG_LEVEL),
      redact: { paths: ['req.headers.authorization', 'req.headers.cookie'] },
      transport: {
        targets: targets()
          .pushIf(process.env.NODE_ENV !== 'production', targets.pretty())
          .pushIf(process.env.NODE_ENV === 'production', targets.file({ destination: 1 }))
          .toArray(),
      },
    },
  },
})
```

`LogConfig` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | `false` garde l'API appelable et n'écrit rien |
| `name` | `string` | la clé du logger | Écrit sur chaque entrée |
| `level` | `LogLevelWithSilent` | `LOG_LEVEL`, sinon `'info'` | Niveau le plus bas écrit ; un niveau inconnu lève une erreur |
| `channels` | `LogChannel[]` | une `ConsoleChannel` lisible | Où vont les entrées ; `[]` rend le logger muet ; l'emporte sur `destination` et `transport` |
| `destination` | `string \| number \| LineWritable` | — | Lignes JSON vers un chemin de fichier, un descripteur ou un objet inscriptible ; l'emporte sur `transport` |
| `transport` | `{ targets?: TransportTargetOptions[] } \| TransportTargetOptions` | — | Cibles converties en canaux ; chaque cible peut porter son propre `level` |
| `modules` | `Record<string, LogLevelWithSilent>` | — | Niveau par liaison `module` |
| `redact` | `string[] \| RedactOptions` | — | Chemins remplacés par `[Redacted]` (ou par `censor`), ou retirés |
| `serializers` | `Record<string, LogSerializer>` | `err` et `error` sérialisés | Transforment la valeur d'un champ avant écriture |
| `depthLimit` | `number` | `5` | Profondeur parcourue dans une valeur que JSON ne sait pas écrire (un cycle, un BigInt) |
| `edgeLimit` | `number` | `100` | Entrées écrites d'un tel objet ou tableau |
| `messageKey` | `string` | `'msg'` | Clé du message dans une ligne JSON |
| `timestamp` | `TimestampOption` | `'epoch'` | Comment une ligne JSON écrit `time` |
| `base` | `Record<string, unknown> \| null` | `{ pid, hostname }` | Champs sur chaque ligne JSON ; `null` pour aucun |
| `formatters` | `LineFormatters` | — | Remodèlent la partie niveau et les champs fusionnés d'une ligne JSON |
| `errorKey` | `string` | `'err'` | Clé sous laquelle s'écrit une `Error` passée à un appel |
| `msgPrefix` | `string` | — | Écrit avant chaque message |
| `mixin` | `LogMixin` | — | Champs ajoutés à chaque ligne, calculés à chaque appel |
| `mixinMergeStrategy` | `(mergeObject, mixinObject) => Record<string, unknown>` | l'objet fusionné l'emporte | Comment se combinent les champs du mixin et l'objet fusionné |
| `hooks.logMethod` | `LogMethodHook` | — | Appelé avec les arguments de chaque appel |
| `onChild` | `(child) => void` | — | Appelé avec chaque logger enfant créé |

`targets.file(options, level?)` accepte `destination` (un chemin, ou un descripteur comme `1`), `append`, `maxSizeBytes`, `maxFiles` et `maxBufferBytes`, comme `FileChannel`. `targets.pretty(options, level?)` accepte `destination` (`1` ou `2`) pour envoyer tous les niveaux vers un seul flux. Un `target` peut aussi être un `LogChannel`.

Les options `customLevels`, `useOnlyCustomLevels`, `levelComparison`, `nestedKey`, `crlf` et `hooks.streamWrite` sont refusées avec `E_SPECTRUM_UNSUPPORTED_OPTION`.

## Liaisons du conteneur

| Token | Résout vers |
|---|---|
| `Logger` (classe) | Le `LoggerManager` construit depuis la configuration `logger` |
| `'spectrum.logger'` | Le même `LoggerManager` |
| `'logger'` | Le même `LoggerManager` |

`'spectrum.logger'` et `'logger'` sont déclarés dans `ContainerBindings`. Quand le conteneur a une liaison `events`, le provider y émet chaque entrée écrite sous `log:line`, après sérialiseurs et masquage.

## Erreurs

Chaque code est une classe de l'espace de noms `errors` (`import { errors } from '@c9up/spectrum'`) : une `Exception` de flare avec `code` et `status` (500 pour toutes).

| Code | Levée quand |
|---|---|
| [`E_SPECTRUM_UNKNOWN_LEVEL`](/fr/reference/errors#e-spectrum-unknown-level) | Un niveau configuré, un niveau de `modules`, un niveau de cible ou l'entrée de `logLevel()` n'est pas un niveau |
| [`E_SPECTRUM_UNSUPPORTED_TARGET`](/fr/reference/errors#e-spectrum-unsupported-target) | Une cible de transport n'est ni `targets.pretty()`, ni `targets.file()`, ni un `LogChannel` |
| [`E_SPECTRUM_INVALID_FILE_OPTIONS`](/fr/reference/errors#e-spectrum-invalid-file-options) | Une destination de fichier n'est ni un chemin ni un descripteur |
| [`E_SPECTRUM_INVALID_LINE_OPTIONS`](/fr/reference/errors#e-spectrum-invalid-line-options) | `messageKey`, `timestamp`, `base` ou `formatters` est invalide |
| [`E_SPECTRUM_INVALID_REDACT_PATH`](/fr/reference/errors#e-spectrum-invalid-redact-path) | Un chemin de `redact` ne se lit pas |
| [`E_SPECTRUM_INVALID_STRINGIFY_LIMIT`](/fr/reference/errors#e-spectrum-invalid-stringify-limit) | `depthLimit` ou `edgeLimit` n'est pas un entier positif |
| [`E_SPECTRUM_UNSUPPORTED_OPTION`](/fr/reference/errors#e-spectrum-unsupported-option) | La configuration fixe une option que spectrum ne prend pas en charge |
| [`E_SPECTRUM_LOGGER_NOT_BOUND`](/fr/reference/errors#e-spectrum-logger-not-bound) | Au boot, le conteneur résout autre chose qu'un `Logger` pour le token `Logger` |
| [`E_SPECTRUM_MISSING_DEFAULT_LOGGER`](/fr/reference/errors#e-spectrum-missing-default-logger) | Une configuration multi-loggers (`{ default, loggers }`) ne nomme aucun logger `default`. |
| [`E_SPECTRUM_UNKNOWN_DEFAULT_LOGGER`](/fr/reference/errors#e-spectrum-unknown-default-logger) | Le logger `default` n'est pas déclaré dans `loggers`. |
| [`E_SPECTRUM_UNKNOWN_LOGGER`](/fr/reference/errors#e-spectrum-unknown-logger) | `logger.use(name)` nomme un logger absent de `loggers`. |
| [`E_SPECTRUM_NOT_BOOTED`](/fr/reference/errors#e-spectrum-not-booted) | Le logger de `services/main` a servi avant le boot de `SpectrumProvider`. |
| [`E_SPECTRUM_ASSERTION_FAILED`](/fr/reference/errors#e-spectrum-assertion-failed) | `FakeLogger.assertLogged` / `assertNotLogged` a échoué : les entrées capturées ne correspondent pas. |
| [`E_SPECTRUM_INVALID_PREDICATE`](/fr/reference/errors#e-spectrum-invalid-predicate) | Une assertion de `FakeLogger` a reçu un `containing` vide, qui correspondrait à toutes les entrées. |

## Migration

- `SpectrumError` disparaît : testez `error.code`, ou `error instanceof errors.E_SPECTRUM_*` avec `import { errors } from '@c9up/spectrum'`.
- Le `name` d'une erreur ne vaut plus `"SpectrumError"`.

## Voir aussi

- [Logger](/fr/guides/digging-deeper/logger/)
- [Configuration du logger](/fr/guides/digging-deeper/logger/configuration)
- [Canaux et transports](/fr/guides/digging-deeper/logger/channels)
