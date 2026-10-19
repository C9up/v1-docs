# Atlas - Connections

Atlas exposes a `db` singleton — AdonisJS Lucid's `Database` service — plus a
`ConnectionManager` (`db.manager`) that owns the map of named connections. The
singleton is populated by `AtlasProvider.boot()` from your
`config/database.ts` connections.

```ts
import db from '@c9up/atlas/services/db'

const rows = await db.rawQuery('SELECT * FROM users WHERE id = ?', [id])
```

> The `db` singleton throws if accessed before `AtlasProvider.boot()` has run —
> check that `@c9up/atlas/provider` is in your `reamrc.ts` providers and that
> `config/database.ts` defines at least one connection.

## Encrypted connections (TLS)

A connection is in plaintext unless its URL asks for TLS. For PostgreSQL, ask
with `sslmode`, and give the files with `sslrootcert`, `sslcert` and `sslkey`:

```ts
url: 'postgres://app@db.internal:5432/app?sslmode=verify-full'
  + '&sslrootcert=/run/secrets/ca.crt'
  + '&sslcert=/run/secrets/app.crt&sslkey=/run/secrets/app.key'
```

`verify-full` encrypts, checks the server's certificate against `sslrootcert`
and its name against the host, and presents the client certificate when the
server asks for one. Each mode does this:

| `sslmode` | Result |
|---|---|
| absent (and no `PGSSLMODE`) | plaintext, no TLS attempt |
| `disable` | plaintext |
| `verify-full` | TLS, server certificate and name checked |
| `require`, `verify-ca` | TLS, server name not checked: accepted with a warning |
| `prefer`, `allow` | refused with `E_ATLAS_INSECURE_SSLMODE`: they fall back to plaintext without saying so |

The `PGSSLMODE`, `PGSSLROOTCERT`, `PGSSLCERT` and `PGSSLKEY` variables apply
when the URL does not name the value. The files are checked before the first
connection, and an error names the one that cannot be read. They are read
again for each new connection, so a renewed certificate is picked up without
a restart. The client key must be a decrypted PEM file: an encrypted key is
refused, with the `openssl pkey` command that decrypts it.

MySQL follows the same default: plaintext unless the URL names an `ssl-mode`
(`REQUIRED`, `VERIFY_CA`, `VERIFY_IDENTITY`, with `ssl-ca`, `ssl-cert`,
`ssl-key`).

## Query-builder entry points

```ts
db.query()                    // a connection-level query builder
db.from('users')              // builder with the table pre-selected
db.table('users')             // insert/write builder on a table
db.insertQuery()              // an insert builder
db.modelQuery(User)           // builder for a model resolved at runtime
```

- `query(options?)` returns a `DatabaseQueryBuilder`. Pass `{ client: trx }` to
  route it through a transaction, or `{ mode: 'read' }` to reject writes on that
  builder.
- `from(table)` pre-selects the table. It also accepts a derived-table source —
  a builder or a callback that builds one — with an optional alias:
  `db.from(subquery, 'recent')`.
- `table(table)` is the write/insert counterpart with the table pre-selected.
- `insertQuery(options?)` mirrors `query` for the insert path (accepts the same
  `{ client }` / `{ mode }` options).
- `modelQuery(Model)` builds a query for a model class resolved at runtime
  (Lucid `db.modelQuery`). For static code prefer `Model.query()` directly.

## Raw SQL and references

```ts
await db.rawQuery('SELECT * FROM users WHERE id = :id', { id })

t.uuid('id').defaultTo(db.raw('gen_random_uuid()'))

db.query().orderBy(db.ref('posts.created_at'), 'desc')

const { rowsAffected } = await db.execute('DELETE FROM sessions WHERE expired = ?', [1])
```

- `rawQuery(sql, bindings?)` returns a chainable, thenable raw query. Bindings
  may be positional (`?` / `??`) or named (`:name` / `:name:`).
- `raw(sql, params?)` builds a `RawSql` fragment for query fragments and column
  defaults that are SQL expressions.
- `ref(column)` produces a validated, dialect-quoted column reference — use it
  where a value position must be read as a column. It is never a value binding.
- `execute(sql, params?)` runs a statement for effect and resolves
  `{ rowsAffected }`.

On PostgreSQL a binding needs no `::type` cast: atlas asks Postgres which type
it infers for each placeholder and converts the value into it, so
`rawQuery('SELECT * FROM users WHERE company_id = ?', [uuid])` works against a
`uuid` column from a plain JS string. A value that does not fit is reported by
position — `parameter $1: 'abc' is not a valid uuid` — rather than as an
operator error. Where Postgres cannot infer a type (a bare `SELECT ?`), the
binding falls back to text, as before.

A temporal binding accepts every shape Postgres itself accepts, so a full
instant (`2026-03-10T00:00:00.000Z`) is valid for a `date` column and keeps its
date part. atlas is never stricter than the database it drives.

## Health and lifecycle

```ts
await db.ping()   // liveness check against the bound connection
await db.close()  // close the bound connection's pool
```

`db.dialect` exposes the bound connection's dialect (`'sqlite'` | `'postgres'`
| `'mysql'`).

## Truncation

```ts
await db.truncate('sessions')          // empty one table
await db.truncate('posts', true)       // Postgres CASCADE
await db.truncateAllTables()           // empty every user table
await db.truncateAllTables(['audit_log'])
```

- `truncate(table, cascade?)` issues `TRUNCATE TABLE` on Postgres/MySQL (with
  `CASCADE` when `cascade` is set, Postgres only) and `DELETE FROM` on SQLite,
  which has no `TRUNCATE`.
- `truncateAllTables(ignoreTables?)` empties every user table. Framework tables
  (`ream_*`) and dialect internals are left alone; foreign keys are suspended so
  delete order doesn't matter. Primarily a test-suite helper.

## Advisory locks

Session-level advisory locks let cooperating processes serialise around a shared
key without a table lock — Atlas mirrors Lucid's `getAdvisoryLock` /
`releaseAdvisoryLock`.

```ts
const key = 'nightly-report'

if (await db.getAdvisoryLock(key)) {
  try {
    // exclusive section — only one holder at a time
  } finally {
    await db.releaseAdvisoryLock(key)
  }
}
```

- Both calls are **non-blocking**: `getAdvisoryLock` returns whether the lock was
  acquired (Postgres `pg_try_advisory_lock`, MySQL `GET_LOCK(key, 0)`), and
  `releaseAdvisoryLock` returns whether it was released.
- The key may be a `string` or a `number`. A string key is hashed deterministically
  to the integer Postgres requires, so lock and unlock agree within a process.
- **Both throw on SQLite** — SQLite has no advisory locks (Lucid parity). Guard by
  dialect if your code runs on SQLite too.

## The connection manager

`db.manager` is the single owner of named connections. `AtlasProvider` registers
the connections it opens at boot, and your code can add, open, patch, or release
connections at runtime.

### Registering and using a second connection

```ts
// Register a config without opening it yet.
db.manager.add('analytics', {
  url: 'postgres://user:pass@analytics-db:5432/reports',
  pool: { min: 1, max: 5 },
})

// Open it (idempotent — returns the live handle if already open).
await db.manager.connect('analytics')

// Scope the db service to that connection.
const rows = await db.connection('analytics').rawQuery('SELECT count(*) AS n FROM events')
```

`db.connection(name, options?)` returns a `DbService` scoped to the named
connection. Called with no name it returns the default connection's service; pass
`{ mode: 'read' }` to reject writes on the returned service. It throws if no
connection is registered under `name`.

A model can also bind to a non-default connection from a plain import via
`static connection = 'analytics'`, which resolves through the same manager.

### Config and opening

```ts
db.manager.add('reports', config)          // register config, do NOT open
await db.manager.connect('reports')        // open (or return the live handle)
await db.manager.connect('reports', config) // open with an inline config
db.manager.patch('reports', newConfig)     // replace config; live pool drains in the background
```

- `add(name, config)` registers a connection config without opening it. It is a
  no-op if the name is already registered — use `patch` to replace an existing
  config.
- `connect(name, config?)` opens the connection and is idempotent. The connection
  must have been `add`ed first, or you pass its config inline.
- `patch(name, config)` replaces a connection's config. If it is currently open,
  the live pool is disconnected in the background (in-flight queries drain) and the
  node returns to `registered`, so the next `connect` opens a fresh pool.

### Resolving and inspecting

```ts
db.manager.has('analytics')          // is a connection registered?
db.manager.isConnected('analytics')  // is the pool active (open or migrating)?
db.manager.connection('analytics')   // the live handle, or undefined if inactive
db.manager.connections               // ReadonlyMap<string, ConnectionNode>
db.manager.get('analytics')          // the ConnectionNode, or undefined
```

- `has(name)` reports whether a connection is registered (in any state).
- `isConnected(name)` is `true` only when the pool is active — `open` or
  `migrating`.
- `connection(name)` returns the live `AsyncDatabaseConnection` handle, or
  `undefined` when the pool isn't active.

Each managed connection is a `ConnectionNode` — `{ name, config, connection?, state }`
— whose `state` is one of `registered` | `open` | `migrating` | `closing` |
`closed`.

### Closing and releasing

```ts
await db.manager.close('analytics')        // close the pool, keep the node (state → closed)
await db.manager.close('analytics', true)  // close AND remove the node
await db.manager.release('analytics')      // close and remove the node entirely
await db.manager.closeAll()                // close every pool, keep the nodes
await db.manager.closeAll(true)            // close every pool AND remove every node
```

- `close(name, release?)` closes the connection's pool and keeps the node (state
  → `closed`) so it can be reopened. Pass `release: true` to also remove the node.
- `closeAll(release?)` closes every connection's pool; `release: true` also removes
  every node.
- `release(name)` closes and removes a single node entirely (equivalent to
  `close(name, true)`).

### Migration state

```ts
db.manager.markMigrating('analytics')  // open → migrating (pool stays active)
db.manager.endMigrating('analytics')   // migrating → open
```

`markMigrating` moves an open connection into the `migrating` state — the pool
stays active, so `isConnected` and `connection` still resolve. `endMigrating`
restores it to `open`. The migration runner drives these.

### Lifecycle events

The manager is a Node `EventEmitter`. Subscribe with `on` / `once` and unsubscribe
with `off`:

```ts
db.manager.on('connect', (node) => log.info(`opened ${node.name}`))
db.manager.on('disconnect', (node) => log.info(`closed ${node.name}`))
db.manager.on('error', (node, err) => log.error(`connect failed for ${node.name}`, err))
```

- `connect` fires when a pool opens; `disconnect` when one closes; both call the
  listener with the `ConnectionNode`.
- `error` fires when opening a connection fails and calls the listener with
  `(node, error)`.

### Internal registration

`register(name, config, connection)` and `deregister(name, connection?)` register
and remove an already-open connection without opening or closing it — these back
`AtlasProvider`, which opens the boot pools itself with its own retry/rollback
logic. Prefer `add` + `connect` (and `close` / `release`) in application code.
