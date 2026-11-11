# Spectrum — Logging

Spectrum is Ream's structured logging module. It supports multiple log levels, output channels, per-module level overrides, child loggers for scoped context, and a Rust log bridge for surfacing native log output alongside application logs.

## Basic Usage

```typescript
import { Logger, ConsoleChannel } from '@c9up/spectrum'

const logger = new Logger({
  level: 'info',
  channels: [new ConsoleChannel('pretty')],
})

logger.info('Server started', { port: 3000 })
logger.warn('Slow query detected', { duration: 2500 })
logger.error('Connection failed', { host: 'db.example.com' })
logger.fatal('Out of memory')
```

The signature is **message-first**: the message string comes first, the structured data object second — `logger.info('user logged in', { userId })`. A call reads left to right.

### Error Serialization

An `Error` passed as the first argument, or placed under `err` (or `error`) in
the data object, is serialized automatically: its constructor name as `type`,
`message`, `stack`, every property it carries (`code`, …), its `cause` and the
errors of an `AggregateError`. A reference back to an error already being
written is cut as `"[Circular]"`:

```typescript
try {
  await order.save()
} catch (err) {
  logger.error(err, 'save failed')
  // err → { type: 'Error', message: '...', stack: '...', code: '...', cause: {...} }
}
```

## Log Levels

From least to most severe:

| Level | Use Case |
|-------|----------|
| `trace` | Fine-grained debugging — hot paths, internal state |
| `debug` | Development diagnostics |
| `info` | Normal operations and milestones |
| `warn` | Unexpected but recoverable conditions |
| `error` | Failures that require attention |
| `fatal` | Application cannot continue |

Messages below the configured level are silently dropped:

```typescript
const logger = new Logger({ level: 'warn', channels: [new ConsoleChannel()] })

logger.debug('ignored')  // Dropped — debug < warn
logger.info('ignored')   // Dropped — info < warn
logger.warn('logged')    // Output
logger.error('logged')   // Output
```

## Channels

A channel determines where log entries are written.

### ConsoleChannel

```typescript
import { ConsoleChannel } from '@c9up/spectrum'

// Pretty format — for development
new ConsoleChannel('pretty')
// Output: i 14:32:05 INFO  [app] Server started {"port":3000}

// JSON format — for production log aggregators
new ConsoleChannel('json')
// Output: {"level":30,"time":1731000000000,"pid":4242,"hostname":"web-1","module":"app","port":3000,"msg":"Server started"}
```

`error` and `fatal` entries write to `stderr`, all other levels to `stdout` —
unless the channel is given one stream for every level:
`new ConsoleChannel('json', { stream: 'stdout' })`.

The pretty format escapes every control character a terminal acts on (CR/LF,
backspace, ESC, the 8-bit C1 controls, U+2028/U+2029) in the message, the
module, the correlation id and the data, so a value from a request cannot forge
a line or drive the terminal.

### JSON lines

A JSON line carries a numeric `level`, `time` in epoch milliseconds, `pid` and
`hostname`, the bindings and merged fields at the root, and the message under
`msg`. Each part can be changed on the logger:

```typescript
new Logger({
  messageKey: 'message',              // default 'msg'
  timestamp: 'iso',                   // 'epoch' (default), 'iso', 'unix', false, or a function
  base: { service: 'api' },           // default { pid, hostname }; null for none
  formatters: {
    level: (label) => ({ level: label }),         // {"level":"info"} instead of 30
    log: (fields) => ({ ...fields, region: 'eu' }),
  },
})
```

A payload JSON cannot write — a circular reference, a BigInt — never costs the
line: the field is written again with cycles as `"[Circular]"`, BigInts as
numbers, anything deeper than `depthLimit` (5) as `"[Object]"` and no more than
`edgeLimit` (100) entries per object or array. A merged field named like the
level, the time or the message key is left out, so a payload cannot forge them.

### FileChannel

```typescript
import { FileChannel } from '@c9up/spectrum'

new FileChannel({
  path: './storage/logs/app.log',
  maxSizeBytes: 10 * 1024 * 1024, // rotate before the file grows past this
  maxFiles: 5,                    // files kept, the live one included
  maxBufferBytes: 16 * 1024 * 1024,
  append: true,                   // false starts the file over
})
```

`write()` never waits on the disk: lines are queued and written in order by one
asynchronous writer. Lines still queued when the process exits — a `fatal()`
right before `process.exit()` — are written synchronously on `exit`. If the
destination stops keeping up, the queue stops at `maxBufferBytes`: further lines
are dropped and counted, and a `FileChannel dropped N line(s)` line is written
once it drains. `{ fd }` instead of `path` writes to an open file descriptor,
never rotated and left open on close. Invalid sizes throw
`E_SPECTRUM_INVALID_FILE_OPTIONS`.

### Custom Channels

Implement the `LogChannel` interface to send logs anywhere — a file, a remote service, a database:

```typescript
import type { LogChannel, LogEntry } from '@c9up/spectrum'
import * as fs from 'node:fs'

class FileChannel implements LogChannel {
  name = 'file'

  write(entry: LogEntry): void {
    fs.appendFileSync('./logs/app.log', JSON.stringify(entry) + '\n')
  }
}

const logger = new Logger({
  level: 'info',
  channels: [new ConsoleChannel('pretty'), new FileChannel()],
})
```

## Child Loggers

`child()` creates a new logger instance that inherits the parent's channels and level, with additional bound context applied to every entry:

```typescript
const requestLogger = logger.child({
  module: 'http',
  correlationId: ctx.id,
})

requestLogger.info('Request received', { method: 'GET', path: '/orders' })
// Output includes module: 'http' and correlationId on every line
```

Child loggers are immutable — calling `child()` always returns a new instance. Use them to scope logs to a request, a job, or any bounded operation.

## Per-Module Level Overrides

Set different minimum levels for different parts of your application:

```typescript
const logger = new Logger({
  level: 'info',
  channels: [new ConsoleChannel('pretty')],
  modules: {
    db:        'debug',   // Verbose SQL logging
    http:      'warn',    // Only warnings from the HTTP layer
    scheduler: 'trace',   // Maximum verbosity for the scheduler
  },
})

const dbLogger = logger.child({ module: 'db' })
dbLogger.debug('Query executed', { sql: '...' })
// Output — 'db' module level is 'debug'

const httpLogger = logger.child({ module: 'http' })
httpLogger.info('Request received')
// Dropped — 'http' module level is 'warn'
```

## Correlation IDs

Attach a correlation ID to trace a request across services and log entries:

```typescript
// Preferred: create an immutable child (safe for concurrent requests)
const reqLogger = logger.child({ correlationId: 'req-abc-123' })
reqLogger.info('Processing order', { orderId: '42' })
// i 14:32:05 INFO  [app] Processing order cid=req-abc-123 {"orderId":"42"}

// Alternative: mutate the instance (use only when concurrency is not a concern)
logger.setCorrelationId('req-abc-123')
```

## SpectrumProvider

`SpectrumProvider` builds the loggers from `config/logger.ts` and binds them in
the container. `ream configure @c9up/spectrum` registers it and writes
`config/logger.ts`; by hand, the provider goes in `reamrc.ts`:

```typescript
// reamrc.ts
providers: [
  () => import('@c9up/spectrum/provider'),
]
```

```typescript
// config/logger.ts
import { defineConfig, logLevel, targets } from '@c9up/spectrum'

const inProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  default: 'app',
  loggers: {
    app: {
      enabled: true,
      name: 'app',
      // LOG_LEVEL comes from outside the program, so it is checked rather than
      // asserted: unset reads as 'info', and a value that is no level throws.
      level: logLevel(process.env.LOG_LEVEL),
      modules: {
        db: 'debug',
      },
      transport: {
        targets: targets()
          .pushIf(!inProduction, targets.pretty())
          .pushIf(inProduction, targets.file({ destination: 1 }))
          .toArray(),
      },
    },
  },
})
```

`defineConfig` also accepts a single flat logger (`{ level, channels, modules }`),
which it wraps under the name `app`.

A level that is not one of the six (or `silent`) — `ERROR`, `warning`,
`verbose` — throws `E_SPECTRUM_UNKNOWN_LEVEL`, in the config, in a `modules`
entry and in the `level` setter alike.

Once registered, resolve the logger from the container:

```typescript
const logger = await app.container.make('logger')
logger.info('App booted')
```

## Rust Log Bridge

The Rust log bridge forwards log lines emitted by Ream's native crates on
stderr into the Spectrum pipeline, so Rust-side events appear in the same log
stream as your application code.

```typescript
import { ConsoleChannel, createRustLogBridge, Logger, parseRustLog } from '@c9up/spectrum'

const logger = new Logger({ level: 'info', channels: [new ConsoleChannel('pretty')] })

const bridge = createRustLogBridge(logger)
bridge.start()
// ... the native crates emit to stderr
bridge.stop()

// Parse a raw Rust log line into a LogEntry
const entry = parseRustLog('[INFO ream_query] compiled query in 0.3ms')
// { level: 'info', module: 'ream-query', message: 'compiled query in 0.3ms' }
```

A line is claimed only when it has the `[LEVEL module] message` shape AND its
module (with `_` read as `-`) matches the allow-list — `/^ream-/` by default,
widened with `createRustLogBridge(logger, { modules: /^(ream|atlas)-/ })`. It
is then written through the logger, so its level, `enabled` flag and redaction
apply, and it carries `source: 'rust'`. Anything else — including a
`[FATAL auth] …` line some other code echoed to stderr — passes through as
text, in its original order. The bridge replaces `process.stderr.write` for the
whole process and only one can be active at a time, so it is started
explicitly — `SpectrumProvider` does not attach it.

## Types Reference

```typescript
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  level: LogLevel
  message: string
  module: string
  correlationId?: string
  timestamp: string
  data?: Record<string, unknown>
}

interface LogChannel {
  name: string
  write(entry: LogEntry): void
}

interface LogConfig {
  enabled?: boolean          // default true
  name?: string              // emitted on every entry
  level?: LogLevel | 'silent'
  channels?: LogChannel[]
  destination?: string | number | { write(line: string): unknown }
  transport?: { targets?: TransportTargetOptions[] } | TransportTargetOptions
  modules?: Record<string, LogLevel | 'silent'>
  redact?: string[] | { paths: string[]; censor?: string | ((value, path) => unknown); remove?: boolean }
  serializers?: Record<string, (value: unknown) => unknown>
  messageKey?: string        // default 'msg'
  errorKey?: string          // default 'err'
  timestamp?: 'epoch' | 'iso' | 'unix' | boolean | (() => string)
  base?: Record<string, unknown> | null
  formatters?: { level?: (label, number) => object; log?: (fields) => object }
  msgPrefix?: string
  mixin?: (mergeObject, level, logger) => Record<string, unknown>
  mixinMergeStrategy?: (mergeObject, mixinObject) => Record<string, unknown>
  hooks?: { logMethod?: (args, method, level) => void }
  onChild?: (child) => void
  depthLimit?: number        // default 5
  edgeLimit?: number         // default 100
}

interface LoggerManagerConfig {
  default: string
  loggers: Record<string, LogConfig>
}
```

## Redaction

`redact` censors fields on their way out, in the paths syntax the ecosystem is
written in:

```typescript
const logger = new Logger({
  level: 'info',
  channels: [new ConsoleChannel('json')],
  redact: {
    paths: [
      'req.headers.authorization',   // a literal path
      '*.password',                  // wherever it turns up, one level down
      'users[*].token',              // every element of a list
      'headers["set-cookie"]',       // a key a dot cannot name
      'creds.*',                     // every value under a key
    ],
    censor: '[Redacted]',
  },
})
```

A path that names nothing leaves the entry exactly as it was, and nothing is
mutated: the objects along a censored path are copied — keeping their
prototype, so a model's `toJSON` still decides what it shows — and the ones
the caller passed in are not. A path runs through getters too.

`censor` may be a function, called with the value and the path it was found at
(`['users', '0', 'card']`); `remove: true` drops matched keys instead. A
malformed path (`'password,token'`, `''`, `'a..b'`, unbalanced brackets) throws
`E_SPECTRUM_INVALID_REDACT_PATH` when the logger is built.

## Transport targets

A `config/logger.ts` can declare its output as transport targets:

```ts
transport: {
  targets: targets()
    .pushIf(!app.inProduction, targets.pretty())
    .pushIf(app.inProduction, targets.file({ destination: 1 }))
    .toArray(),
}
```

A target is a **description** realised as a channel at construction:

- `pino-pretty` is the human console (`destination: 1` or `2` sends every level
  to that stream);
- `pino/file` with a path is a `FileChannel` (`append`, `maxSizeBytes`,
  `maxFiles`, `maxBufferBytes`); with a file descriptor it is JSON to that
  descriptor at every level — `destination: 1` is stdout, what a containerised
  app ships to its collector, and no destination means 1;
- a `LogChannel` as the `target` plugs in any other destination, with the
  target's own level.

Any other target name throws `E_SPECTRUM_UNSUPPORTED_TARGET` rather than
silently writing somewhere else. The single `transport: { target, options }`
form is accepted too, and `destination` on the logger (a path, a descriptor or
anything with a `write(line)` method) wins over `transport`. An explicit
`channels` list wins over both.

## Observing every line

`onLog` hands you each entry as a channel would see it — after the serializers
and after redaction, never the raw bag:

```ts
import { onLog } from '@c9up/spectrum'

const off = onLog((entry) => {
  if (entry.level === 'error') report(entry)
})
```

It returns an unsubscribe function. A listener that throws is swallowed:
observing a log must never change whether the log is written.

`SpectrumProvider` subscribes for you when the container exposes an `events`
emitter, forwarding each entry as `log:line`:

```ts
emitter.on('log:line', (entry) => { /* … */ })
```

That is what feeds the log panel of the framework's debug toolbar, and it is
the same arrangement atlas uses for `db:query` — a package that cannot import
the framework's emitter owns a small registry, and the provider bridges it.

## More options

```ts
const logger = new Logger({
  level: 'info',
  mixin: () => ({ requestId: als.getStore()?.id }),  // fields on every line
  msgPrefix: '[api] ',
  errorKey: 'error',
  serializers: { req: stdSerializers.req, res: stdSerializers.res },
  hooks: {
    logMethod(args, method, level) {
      method(...args)  // inspect or rewrite the call's arguments
    },
  },
})

// A child with its own level, redaction, serializers and prefix
const audit = logger.child({ module: 'audit' }, { level: 'warn', msgPrefix: '[audit] ' })
```

`stdSerializers` (`err`, `req`, `res`) and `stdTimeFunctions` (`epochTime`,
`isoTime`, `unixTime`, `nullTime`, for `timestamp`) are exported. Options that
cannot be honoured — `customLevels`, `useOnlyCustomLevels`, `levelComparison`,
`nestedKey`, `crlf`, `hooks.streamWrite`, `transport.pipeline` — throw instead
of being ignored.

## Next Steps

- [Blackhole (Security)](/en/modules/blackhole) — Rust-side request filtering
- [Event Bus](/en/ream/events) — Event-driven architecture
