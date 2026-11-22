# Introduction

This guide covers logging with spectrum:

- Basic Usage
- Log Levels
- Child Loggers
- Correlation IDs

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

## Next Steps
- [Blackhole (Security)](/en/guides/security/securing-ssr) — Rust-side request filtering
- [Event Bus](/en/guides/digging-deeper/emitter) — Event-driven architecture
