# spectrum

`@c9up/spectrum`: structured logging, with named loggers, child loggers, redaction, serializers and console or file channels. Guide: [Logger](/en/guides/digging-deeper/logger/).

## Installation

```bash
pnpm add @c9up/spectrum
```

`ream configure @c9up/spectrum` registers the provider and writes `config/logger.ts`.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/spectrum` | `Logger`, `LoggerManager`, channels, `defineConfig`, `targets`, `onLog`, serializers and types |
| `@c9up/spectrum/provider` | `SpectrumProvider` (default export) |
| `@c9up/spectrum/services/main` | The application's logger (default export) |
| `@c9up/spectrum/configure` | `configure()`, run by `ream configure @c9up/spectrum` |
| `@c9up/spectrum/testing` | `FakeLogger`, a channel that records entries for assertions |

## Exports

### `@c9up/spectrum`

| Export | Kind | Description |
|---|---|---|
| `Logger` | class | A logger: level methods, child loggers, bindings |
| `LoggerManager` | class | A `Logger` for the default logger that also holds the named ones (`use()`) |
| `ConsoleChannel` | class | Writes to stdout and stderr, pretty or JSON |
| `FileChannel` | class | Appends JSON lines to a file or a file descriptor, with rotation |
| `defineConfig` | function | Types `config/logger.ts` and returns a `LoggerManagerConfig` |
| `configure` | function | Same as `@c9up/spectrum/configure` |
| `targets` | function | `targets()` starts a `Targets` list; `targets.file(options?, level?)` and `targets.pretty(options?, level?)` build entries |
| `Targets` | class | Conditional list of transport targets: `push`, `pushIf`, `pushUnless`, `toArray` |
| `channelsFromTargets` | function | `channelsFromTargets(list: readonly TransportTargetOptions[], inheritedLevel?): LogChannel[]` |
| `onLog` | function | `onLog(listener: LogListener): () => void`, observes every written entry; returns the unsubscribe function |
| `clearLogListeners` | function | `clearLogListeners(): void`, removes every `onLog` listener |
| `createRustLogBridge` | function | `createRustLogBridge(logger: Logger, options?: RustLogBridgeOptions): { start(): void; stop(): void }`, routes the Rust engine's stderr lines through `logger` |
| `parseRustLog` | function | `parseRustLog(line: string): LogEntry \| null`, reads a `[LEVEL module] message` line |
| `stdSerializers` | const | `{ err, req, res }`, the standard serializers |
| `stdTimeFunctions` | const | `{ epochTime, unixTime, isoTime, nullTime }`, values for the `timestamp` option |
| `logLevel` | function | `logLevel(raw: unknown, fallback?: LogLevelWithSilent): LogLevelWithSilent`; unset or empty gives `fallback` (`'info'`), a value that is no level throws |
| `isLogLevelWithSilent` | function | `isLogLevelWithSilent(value: unknown): value is LogLevelWithSilent` |
| `logEntryExtras` | function | `logEntryExtras(entry: LogEntry): Record<string, unknown>`, the merged fields of an entry |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors). Each is a flare `Exception` with a string `code`. |
| `LogLevel` | type | `'trace' \| 'debug' \| 'info' \| 'warn' \| 'error' \| 'fatal'` |
| `LogLevelWithSilent` | type | `LogLevel \| 'silent'` |
| `LogEntry` | interface | `{ level, message, module, correlationId?, timestamp, [key: string]: unknown }`, merged fields at the root |
| `LogChannel` | interface | `{ name: string; write(entry: LogEntry): void; close?(): void \| Promise<void> }` |
| `LogConfig` | interface | One logger's configuration (see Configuration) |
| `LoggerManagerConfig` | interface | `{ default: string; loggers: Record<string, LogConfig> }` |
| `ChildOptions` | interface | `{ level?, redact?, serializers?, msgPrefix? }` for `child()` |
| `RedactOptions` | interface | `{ paths: string[]; censor?: string \| ((value, path) => unknown); remove?: boolean }` |
| `LogSerializer` | type | `(value: unknown) => unknown` |
| `LogMixin` | type | `(mergeObject, level: number, logger) => Record<string, unknown>` |
| `LogMethodHook` | type | `(this, args: unknown[], method, level: number) => void` |
| `LineWritable` | interface | `{ write(line: string): unknown }`, a JSON destination |
| `LogListener` | type | `(entry: LogEntry) => void` |
| `TimestampOption` | type | `'epoch' \| 'iso' \| 'unix' \| boolean \| (() => string)` |
| `LineFormatters` | interface | `{ level?(label, number): Record<string, unknown>; log?(object): Record<string, unknown> }` |
| `ConsoleChannelOptions` | interface | `{ stream?: 'stdout' \| 'stderr' }` |
| `FileChannelConfig` | interface | Options of `FileChannel` |
| `TransportTargetOptions` | interface | `{ target: string \| LogChannel; options?: Record<string, unknown>; level?: string }` |
| `FileTargetOptions` | interface | Options of `targets.file()` |
| `PrettyTargetOptions` | interface | Options of `targets.pretty()` |
| `RustLogBridgeOptions` | interface | `{ modules?: RegExp }`, the modules the bridge claims (default `/^ream-/`) |

### `Logger`

`new Logger(config: LogConfig, module?: string, correlationId?: string, bindings?: Record<string, unknown>)`. `module` defaults to `'app'`.

| Member | Signature | Description |
|---|---|---|
| `trace` … `fatal` | `info(mergingObject: unknown, message?: string, ...values: unknown[]): void`<br>`info(message: string, ...values: unknown[]): void` | Write at that level. An object is merged at the root of the entry, an `Error` goes under `err`, `values` fill printf tokens; a message followed by one object without a token merges the object |
| `silent` | same as `info` | Writes nothing |
| `log` | `log(level: LogLevel, message: string, ...values: unknown[]): void` | Write at a level given at run time; also takes a merging object first |
| `child` | `child(bindings?: Record<string, unknown>, options?: ChildOptions): Logger` | A logger whose entries carry `bindings`; `module` and `correlationId` in `bindings` set those fields |
| `bindings` | `bindings(): Record<string, unknown>` | Name, child bindings, `module` and `correlationId` |
| `setCorrelationId` | `setCorrelationId(id: string): void` | Set the correlation id on this instance; prefer `child()` per request |
| `level` | `level: LogLevelWithSilent` (get/set) | This instance's level; setting it does not change the parent or siblings |
| `levelNumber` | `readonly levelNumber: number` | Numeric value of `level` (`info` is 30, `silent` is `Infinity`) |
| `levels` | `readonly levels: { values: Record<string, number>; labels: Record<number, string> }` | Level labels and values |
| `isEnabled` | `readonly isEnabled: boolean` | `false` when the config sets `enabled: false` |
| `isLevelEnabled` | `isLevelEnabled(level: LogLevel): boolean` | Whether a line at `level` would be written for this module |
| `ifLevelEnabled` | `ifLevelEnabled(level: LogLevel, callback: (logger: this) => void): void` | Run `callback` only when `level` is enabled; an async callback's promise is returned |

### `LoggerManager`

`new LoggerManager(config: LoggerManagerConfig)` extends `Logger`: its own methods write through the default logger.

| Member | Signature | Description |
|---|---|---|
| `use` | `use(name?: string): Logger` | The named logger (default one without a name), created once and cached; an unknown name throws |
| `createLogger` | `createLogger(name: string, config: LogConfig): Logger` | Build a logger named `name`, not cached |
| `create` | `create(config: LogConfig): Logger` | Build an unmanaged logger from a config |

### Channels

| Class | Constructor | Description |
|---|---|---|
| `ConsoleChannel` | `new ConsoleChannel(format?: 'pretty' \| 'json', options?: ConsoleChannelOptions)` | `format` defaults to `'pretty'`. Without `stream`, `error` and `fatal` go to stderr and the rest to stdout. Control characters are escaped in pretty output |
| `FileChannel` | `new FileChannel(config: FileChannelConfig)` | `close(): Promise<void>` flushes and closes the file |

`FileChannelConfig`:

| Option | Type | Default | Description |
|---|---|---|---|
| `path` | `string` | — | File to append to; the file and its directory are created |
| `fd` | `number` | — | An open descriptor to write to instead; never rotated nor closed |
| `append` | `boolean` | `true` | `false` starts the file over on first open |
| `maxSizeBytes` | `number` | 10 MiB | Rotate before the file grows past this |
| `maxFiles` | `number` | `5` | Files kept, the live one included |
| `maxBufferBytes` | `number` | 16 MiB | Bytes held while the disk catches up; past it, lines are dropped and a `warn` line counts them |

### `@c9up/spectrum/provider`

| Export | Kind | Description |
|---|---|---|
| `default` | provider | `SpectrumProvider`: builds a `LoggerManager` from the `logger` config, fills `@c9up/spectrum/services/main`, forwards every entry to the `events` emitter as `log:line`, and closes the channels on shutdown |
| `SpectrumAppContext` | interface | `{ container, config }`, what the provider needs from the application |

### `@c9up/spectrum/services/main`

| Export | Kind | Description |
|---|---|---|
| `default` | const | `logger: Logger`, the application's `LoggerManager` once `SpectrumProvider` booted; a member read before throws |

### `@c9up/spectrum/configure`

| Export | Kind | Description |
|---|---|---|
| `configure` | function | `configure(codemods): Promise<void>`: registers `@c9up/spectrum/provider` and writes `config/logger.ts` |

### `@c9up/spectrum/testing`

| Export | Kind | Description |
|---|---|---|
| `FakeLogger` | class | A `LogChannel` that keeps every entry |
| `FakeLoggerPredicate` | interface | `{ containing?: string; dataMatches?(data): boolean }` |
| `FakeLoggerPredicateArg` | type | `FakeLoggerPredicate \| ((entry: LogEntry) => boolean)` |

| Member | Signature | Description |
|---|---|---|
| `write` | `write(entry: LogEntry): void` | Record a deep copy of `entry` |
| `getLogged` | `getLogged(): LogEntry[]` | Copies of the recorded entries |
| `reset` | `reset(): void` | Forget every entry |
| `assertLogged` | `assertLogged(level: LogLevel, predicate?: FakeLoggerPredicateArg): void` | Throws unless an entry at `level` matches |
| `assertNotLogged` | `assertNotLogged(level: LogLevel, predicate?: FakeLoggerPredicateArg): void` | Throws if an entry at `level` matches |

```ts
import { Logger } from '@c9up/spectrum'
import { FakeLogger } from '@c9up/spectrum/testing'

const fake = new FakeLogger()
const logger = new Logger({ channels: [fake] })
logger.info({ userId: 1 }, 'signed in')
fake.assertLogged('info', { containing: 'signed in' })
```

## Configuration

`config/logger.ts`, read under the `logger` key. `defineConfig` takes `{ default, loggers }`, or one `LogConfig` that becomes a logger named `app`. Without a config, the provider builds one `app` logger at `LOG_LEVEL` (or `info`) writing to a pretty console.

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

`LogConfig`:

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | `false` keeps the API callable and writes nothing |
| `name` | `string` | the logger's key | Written on every entry |
| `level` | `LogLevelWithSilent` | `LOG_LEVEL`, else `'info'` | Lowest level written; an unknown level throws |
| `channels` | `LogChannel[]` | a pretty `ConsoleChannel` | Where entries go; `[]` silences the logger; wins over `destination` and `transport` |
| `destination` | `string \| number \| LineWritable` | — | JSON lines to a file path, a descriptor or a writable; wins over `transport` |
| `transport` | `{ targets?: TransportTargetOptions[] } \| TransportTargetOptions` | — | Targets turned into channels; each target can carry its own `level` |
| `modules` | `Record<string, LogLevelWithSilent>` | — | Level per `module` binding |
| `redact` | `string[] \| RedactOptions` | — | Paths replaced by `[Redacted]` (or the `censor`), or removed |
| `serializers` | `Record<string, LogSerializer>` | `err` and `error` serialized | Transform a field's value before writing |
| `depthLimit` | `number` | `5` | Depth walked in a value JSON cannot write (a cycle, a BigInt) |
| `edgeLimit` | `number` | `100` | Entries written of such an object or array |
| `messageKey` | `string` | `'msg'` | Key of the message in a JSON line |
| `timestamp` | `TimestampOption` | `'epoch'` | How a JSON line writes `time` |
| `base` | `Record<string, unknown> \| null` | `{ pid, hostname }` | Fields on every JSON line; `null` for none |
| `formatters` | `LineFormatters` | — | Reshape the level part and the merged fields of a JSON line |
| `errorKey` | `string` | `'err'` | Key an `Error` passed to a log call is written under |
| `msgPrefix` | `string` | — | Written before every message |
| `mixin` | `LogMixin` | — | Fields added to every line, computed per call |
| `mixinMergeStrategy` | `(mergeObject, mixinObject) => Record<string, unknown>` | merging object wins | How mixin fields and the merging object combine |
| `hooks.logMethod` | `LogMethodHook` | — | Called with each log call's arguments |
| `onChild` | `(child) => void` | — | Called with every child logger created |

`targets.file(options, level?)` takes `destination` (a path, or a descriptor such as `1`), `append`, `maxSizeBytes`, `maxFiles` and `maxBufferBytes`, as `FileChannel`. `targets.pretty(options, level?)` takes `destination` (`1` or `2`) to send every level to one stream. A `target` may also be a `LogChannel`.

The options `customLevels`, `useOnlyCustomLevels`, `levelComparison`, `nestedKey`, `crlf` and `hooks.streamWrite` are refused with `E_SPECTRUM_UNSUPPORTED_OPTION`.

## Container bindings

| Token | Resolves to |
|---|---|
| `Logger` (class) | The `LoggerManager` built from the `logger` config |
| `'spectrum.logger'` | The same `LoggerManager` |
| `'logger'` | The same `LoggerManager` |

`'spectrum.logger'` and `'logger'` are declared in `ContainerBindings`. When the container has an `events` binding, the provider emits each written entry on it as `log:line`, after serializers and redaction.

## Errors

Each code is a class of the `errors` namespace (`import { errors } from '@c9up/spectrum'`): a flare `Exception` with `code` and `status` (500 for all of them).

| Code | Raised when |
|---|---|
| [`E_SPECTRUM_UNKNOWN_LEVEL`](/en/reference/errors#e-spectrum-unknown-level) | A configured level, a `modules` level, a target level or `logLevel()` input is not a level |
| [`E_SPECTRUM_UNSUPPORTED_TARGET`](/en/reference/errors#e-spectrum-unsupported-target) | A transport target is neither `targets.pretty()`, `targets.file()` nor a `LogChannel` |
| [`E_SPECTRUM_INVALID_FILE_OPTIONS`](/en/reference/errors#e-spectrum-invalid-file-options) | A file destination is neither a path nor a descriptor |
| [`E_SPECTRUM_INVALID_LINE_OPTIONS`](/en/reference/errors#e-spectrum-invalid-line-options) | `messageKey`, `timestamp`, `base` or `formatters` is invalid |
| [`E_SPECTRUM_INVALID_REDACT_PATH`](/en/reference/errors#e-spectrum-invalid-redact-path) | A `redact` path cannot be parsed |
| [`E_SPECTRUM_INVALID_STRINGIFY_LIMIT`](/en/reference/errors#e-spectrum-invalid-stringify-limit) | `depthLimit` or `edgeLimit` is not a positive integer |
| [`E_SPECTRUM_UNSUPPORTED_OPTION`](/en/reference/errors#e-spectrum-unsupported-option) | The config sets an option spectrum does not support |
| [`E_SPECTRUM_LOGGER_NOT_BOUND`](/en/reference/errors#e-spectrum-logger-not-bound) | At boot, the container resolves something other than a `Logger` for the `Logger` token |
| [`E_SPECTRUM_MISSING_DEFAULT_LOGGER`](/en/reference/errors#e-spectrum-missing-default-logger) | A multi-logger config (`{ default, loggers }`) names no `default` logger. |
| [`E_SPECTRUM_UNKNOWN_DEFAULT_LOGGER`](/en/reference/errors#e-spectrum-unknown-default-logger) | The `default` logger is not declared in `loggers`. |
| [`E_SPECTRUM_UNKNOWN_LOGGER`](/en/reference/errors#e-spectrum-unknown-logger) | `logger.use(name)` names a logger that is not in `loggers`. |
| [`E_SPECTRUM_NOT_BOOTED`](/en/reference/errors#e-spectrum-not-booted) | The `services/main` logger was used before `SpectrumProvider` booted. |
| [`E_SPECTRUM_ASSERTION_FAILED`](/en/reference/errors#e-spectrum-assertion-failed) | `FakeLogger.assertLogged` / `assertNotLogged` failed: the captured entries do not match. |
| [`E_SPECTRUM_INVALID_PREDICATE`](/en/reference/errors#e-spectrum-invalid-predicate) | A `FakeLogger` assertion was given an empty `containing`, which would match every entry. |

## Migration

- `SpectrumError` is gone: test `error.code`, or `error instanceof errors.E_SPECTRUM_*` with `import { errors } from '@c9up/spectrum'`.
- The `name` of an error is no longer `"SpectrumError"`.

## See also

- [Logger](/en/guides/digging-deeper/logger/)
- [Logger configuration](/en/guides/digging-deeper/logger/configuration)
- [Channels and transports](/en/guides/digging-deeper/logger/channels)
