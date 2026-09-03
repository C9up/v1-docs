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

The signature is **message-first**: the message string comes first, the structured data object second — `logger.info('user logged in', { userId })`. This deviates from pino's object-first convention (`logger.info({ userId }, 'user logged in')`); Spectrum reads left-to-right for ergonomics.

### Error Serialization

An `Error` placed under `err` (or `error`) in the data object is serialized automatically to `{ name, message, stack }`:

```typescript
try {
  await order.save()
} catch (err) {
  logger.error('save failed', { err })
  // data.err → { name: 'Error', message: '...', stack: '...' }
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
// Output: {"timestamp":"...","level":"info","module":"app","message":"Server started","data":{"port":3000}}
```

`error` and `fatal` entries write to `stderr`. All other levels write to `stdout`.

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

Register `SpectrumProvider` to auto-wire a logger from `config/logger.ts` and bind it in the container:

```typescript
// config/app.ts
import SpectrumProvider from '@c9up/spectrum/SpectrumProvider'

export default {
  providers: [SpectrumProvider],
}
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
      // asserted: anything that is not a level reads as 'info'.
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

Once registered, resolve the logger from the container:

```typescript
const logger = await app.container.make('logger')
logger.info('App booted')
```

## Rust Log Bridge

The Rust log bridge forwards structured log records emitted by Ream's native crates into the Spectrum pipeline. This means Rust-side events (query compilation, bus operations, security filters) appear in the same log stream as your application code.

```typescript
import { ConsoleChannel, createRustLogBridge, Logger, parseRustLog } from '@c9up/spectrum'

// The bridge writes to CHANNELS, not to a Logger — pass it the same array the
// logger was built with, since a Logger's config is private.
const channels = [new ConsoleChannel('pretty')]
const logger = new Logger({ level: 'info', channels })

const bridge = createRustLogBridge(channels)
bridge.start()
// ... the native crates emit to stderr
bridge.stop()

// Parse a raw Rust log line into a LogEntry
const entry = parseRustLog('[INFO ream_query] compiled query in 0.3ms')
// { level: 'info', module: 'ream-query', message: 'compiled query in 0.3ms' }
```

The line has to be in the `[LEVEL module] message` shape; anything else is
passed through to stderr untouched. The bridge replaces `process.stderr.write`
for the whole process and only one can be active at a time, so it is started
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
  transport?: { targets?: TransportTargetOptions[] }
  modules?: Record<string, LogLevel | 'silent'>
  redact?: string[] | { paths: string[]; censor?: string }
  serializers?: Record<string, (value: unknown) => unknown>
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
mutated: the objects along a censored path are copied, the ones the caller
passed in are not.

## Transport targets

A migrated `config/logger.ts` declares its output the AdonisJS way:

```ts
transport: {
  targets: targets()
    .pushIf(!app.inProduction, targets.pretty())
    .pushIf(app.inProduction, targets.file({ destination: 1 }))
    .toArray(),
}
```

Named deviation: upstream targets name pino transports running in worker
threads. Spectrum writes through its own `LogChannel`s, so a target is a
**description** that is realised at construction — `pino-pretty` becomes the
human console, `pino/file` with a path becomes a file, and with a descriptor
(`destination: 1`) becomes JSON on the process output, which is what a
containerised app ships to its collector. An explicit `channels` list still wins.

## Next Steps

- [Blackhole (Security)](/en/modules/blackhole) — Rust-side request filtering
- [Event Bus](/en/ream/events) — Event-driven architecture
