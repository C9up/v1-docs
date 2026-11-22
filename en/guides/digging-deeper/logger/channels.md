# Channels and transports

This guide covers channels, transport targets and the Rust bridge:

- Channels
- Transport targets
- Rust Log Bridge

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
