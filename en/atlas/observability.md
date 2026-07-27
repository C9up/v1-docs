# Atlas - Observability

Atlas exposes every executed statement through a small query-observability layer —
its equivalent of Lucid's `db:query` event. Use it to log slow queries, trace what
a request actually ran, or bridge atlas into your app's telemetry.

Emission is **opt-in and free when unused**. A statement is only timed when its
connection is configured with `debug: true` *or* the individual query asks via
`.debug()` — and even then, nothing is emitted unless someone is listening.

## Subscribing to queries

`onDbQuery(listener)` registers a listener and returns an unsubscribe function.

```ts
import { onDbQuery } from '@c9up/atlas'

const off = onDbQuery((event) => {
  console.log(event.duration, event.sql, event.bindings)
})

// later, to stop listening:
off()
```

A listener that throws is swallowed — observability must never change the
behaviour of the query it reports on.

`clearDbQueryListeners()` removes every listener at once. It is intended for test
teardown:

```ts
import { clearDbQueryListeners } from '@c9up/atlas'

afterEach(() => clearDbQueryListeners())
```

## The `DbQueryEvent` shape

Each listener receives one `DbQueryEvent`, mirroring Lucid's `db:query` payload:

```ts
interface DbQueryEvent {
  sql: string                    // the SQL as sent to the driver, placeholders included
  bindings: readonly unknown[]   // bound parameters — never interpolated into `sql`
  duration: number               // wall-clock milliseconds, including the NAPI round-trip
  connection?: string            // connection name, when the app named it
  model?: string                 // entity class name, when the query came from a repository/model
  method?: string                // the call that produced it (`exec`, `first`, `paginate`, …)
  ddl?: boolean                  // true for schema statements (migrations)
  inTransaction?: boolean        // true when the statement ran inside an interactive transaction
  error?: Error                  // set when the statement threw — the event is emitted either way
  reporterData?: Record<string, unknown> // metadata attached via `query.reporterData({...})`
}
```

`bindings` are kept separate from `sql` on purpose — the parameters are never
interpolated into the statement, so a listener can log the exact string the driver
saw alongside its escaped, safe values.

The event fires even on failure: when a statement throws, `error` is set and the
event is still emitted, so slow-and-failed queries show up in your logs.

## Pretty-printing

`prettyPrintQuery(event)` renders an event as a single log line (Lucid's
`prettyPrint`):

```ts
import { onDbQuery, prettyPrintQuery } from '@c9up/atlas'

onDbQuery((event) => {
  console.log(prettyPrintQuery(event))
})
// [atlas] 1.42ms primary User first SELECT * FROM users WHERE id = ? LIMIT 1 -- [10]
```

The bindings are appended as JSON after `--`, **not** interpolated into the SQL.
An interpolated line reads like runnable SQL while having none of the escaping
that made the real statement safe — and it is exactly the string someone would
later copy into a console.

## Turning emission on

### Per query — `.debug()`

Call `.debug()` on a query to force a `db:query` event for that statement alone,
even when the connection has `debug: false`:

```ts
const user = await User.query()
  .where('id', id)
  .debug()
  .first()
```

`.reporterData({...})` attaches arbitrary metadata to the event (request id, user
id, feature flag, …), readable off `event.reporterData`. Setting it also forces
emission, so the data actually reaches a listener; repeated calls merge:

```ts
await User.query()
  .where('active', true)
  .reporterData({ requestId, userId })
  .exec()
```

### Per connection — `debug: true`

Set `debug: true` on a connection to emit an event for **every** statement it runs.
Off by default:

```ts
// config/database.ts
export default {
  connections: {
    primary: {
      client: 'postgres',
      connection: env.get('DATABASE_URL'),
      debug: true,
    },
  },
}
```

With no subscriber, nothing is emitted either way — so `debug: true` on a
connection with no `onDbQuery` listener costs nothing.

## Bridging to your app's emitter

Atlas is a standalone package and cannot import your framework's event emitter, so
it owns this tiny listener registry instead. To surface queries on whatever emitter
your app already uses, forward them in one line at boot:

```ts
onDbQuery((event) => emitter.emit('db:query', event))
```
