# spectrum

This guide covers the spectrum types and observing every line:

- Types Reference
- Observing every line

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
