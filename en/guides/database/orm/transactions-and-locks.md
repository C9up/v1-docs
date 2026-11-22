# Transactions and locks

This guide covers transactions, locks, timeouts and writes:

- Transactions
- Locks
- The builder is a whole promise
- Query timeouts
- Query-level mutations
- Connection-level writes and upserts

## Transactions

Either way the transaction is **pinned to
a single connection**, so a read-then-decide-then-write is genuinely atomic, and
the connection is only returned to the pool on commit/rollback.

**Managed** — auto commit on success, rollback on a thrown error:

```ts
import { transaction } from '@c9up/atlas'

const next = await transaction(db, async (trx) => {
  const [row] = await trx.query<{ counter: number }>(
    'SELECT counter FROM counters WHERE id = ?', [id],
  )
  const value = row.counter + 1
  await trx.execute('UPDATE counters SET counter = ? WHERE id = ?', [value, id])
  return value // committed; throw to roll the whole thing back
})

// Same thing as a method:
await db.transaction(async (trx) => { /* … */ })
```

**Manual** — you drive `commit()` / `rollback()`:

```ts
const trx = await db.transaction()
try {
  await trx.execute('UPDATE …')
  await trx.commit()
} catch (err) {
  await trx.rollback()
  throw err
}
```

**Isolation level** (`read uncommitted` | `read committed` | `repeatable read` |
`serializable`; applied on Postgres / MySQL, ignored on SQLite):

```ts
await db.transaction(async (trx) => { /* … */ }, { isolationLevel: 'serializable' })
const trx = await db.transaction({ isolationLevel: 'repeatable read' })
```

Nested `transaction()` calls reuse the same connection via `SAVEPOINT` (partial
rollback). Hand the active `trx` to a repository with `repo.useTransaction(trx)`,
or to a query built before the transaction existed with `query.useTransaction(trx)`:

```ts
const query = User.query().where('id', 1)
await db.transaction(async (trx) => {
  await query.useTransaction(trx).update({ active: false })
  await db.from('audit').useTransaction(trx).insert({ note: 'deactivated' })
})
```

A model query bound this way hydrates rows bound to the transaction (their
`save()` / `delete()` stay inside it) and defers its domain events to the commit,
like `Model.query({ client: trx })`. The connection-level builder, its write
builders (`insert`, `update`, `delete`) and `db.rawQuery()` take
`useTransaction(trx)` too. A transaction on a connection of another dialect is
refused (`E_ATLAS_DIALECT_MISMATCH`): the query was built for its own.

**After-commit hooks.** `trx.after('commit', cb)` / `trx.after('rollback', cb)`
register side effects that run only once the transaction is durable;
hook errors are swallowed so a post-commit side effect can't
surface a failure on a transaction the caller already saw succeed. Inside a
nested (SAVEPOINT) transaction a `commit` hook is forwarded to the parent, so it
fires only when the ROOT commits — and is discarded if the outer transaction
later rolls back. Atlas uses this internally to flush domain events: a repo bound
to an external transaction (`repo.useTransaction(trx)`) emits its events only
after that outer transaction commits, never on the inner savepoint release.

One observable consequence: on a **transactional** path (anything routed through a
managed transaction — `firstOrCreate`, `updateOrCreateMany`, `related().create`,
…) a failure in your `onDomainEvents` sink is **swallowed** — the write already
committed, so it can't be undone by a late side-effect error. On a plain
non-transactional `create()` / `save()` the dispatch runs inline and a sink
failure **propagates** to the caller (the row is still written — dispatch runs
after the INSERT). If you need dispatch failures observed, do it inside the sink.

> Never emulate a transaction by issuing `BEGIN`/`COMMIT` through `db.execute()`
> on a pooled connection: each call may land on a different connection, so the
> statements scatter — nothing is atomic and a row lock can be stranded on an
> idle pooled connection. Always go through `transaction()` / `db.transaction()`.

For a fixed list of statements you don't need to read between, use
`runInTransaction(batch)` — atomic but non-interactive (what migrations use).

## Locks

```ts
repo.query().where('id', id).forUpdate().first()
repo.query().where('id', id).forShare().first()

// Postgres-only weaker locks:
repo.query().where('id', id).forNoKeyUpdate().first()
repo.query().where('id', id).forKeyShare().first()

// Modifiers — compose onto any base lock:
repo.query().forUpdate().skipLocked().all() // skip rows already locked
repo.query().forUpdate().noWait().all()      // error instead of waiting
```

`forNoKeyUpdate`/`forKeyShare` are Postgres-only (ignored elsewhere with a
warning). Locks are silently dropped on SQLite. Only use row locks inside a
transaction boundary.

### A builder is a whole promise

`await query` runs it, and so do the other two halves of the promise protocol:

```ts
const rows = await User.query().where('active', true)

await User.query().where('active', true).finally(() => span.end())
const safe = await User.query().whereRaw(untrusted).catch(() => [])
```

`catch` and `finally` used to throw "not a function" — a value that answers to
`then` and nothing else surprises anyone who treats it as the promise it looks
like.

## The builder is a whole promise

Awaiting a builder runs it — and so do the other two halves of the promise
protocol:

```ts
const users = await User.query().where('active', true)

await User.query().where('active', true).finally(() => span.end())

const rows = await User.query().whereRaw(suspect).catch(() => [])
```

`await query` worked while `query.catch(fn)` and `query.finally(fn)` threw "not
a function". A value that answers to `then` and nothing else surprises anyone
treating it as the promise it looks like, so the builder carries all three.

`exec()` memoizes, so awaiting the same builder twice shares one round-trip.
Call `clone()` for a fresh one.

## Query timeouts

```ts
// Client-side race only: the awaiter rejects after 2s; the driver still finishes
// the query server-side (the default).
await repo.query().where('active', true).timeout(2000).exec()

// { cancel: true } ALSO aborts the query server-side.
await repo.query().where('active', true).timeout(2000, { cancel: true }).exec()
```

With `{ cancel: true }` Atlas applies an in-session **statement** timeout on the same
connection — Postgres `statement_timeout`, MySQL `MAX_EXECUTION_TIME` (SELECT only) —
so the server aborts the running query rather than leaving it to complete after the
client has already given up. SQLite has no server-side statement timeout, so only the
client race applies there. There is no separate KILL-by-PID cancellation path (that
route is unavailable under the driver); cancellation is always the in-session
statement timeout. Calling `timeout()` with no argument clears it.

The pooled connection gets back the timeout it had before the query, a role or
database default (`ALTER ROLE app SET statement_timeout = '5s'`) or a startup
`options` value included. A connection whose value cannot be restored is closed
rather than returned to the pool.

## Query-level mutations

```ts
repo.query().where('status', 'pending').update({ status: 'processed' })
repo.query().where('expired', true).delete()
repo.query().where('id', 10).increment('attempts', 1)
```

For complex SQL criteria unsupported by safe clauses, use explicit raw SQL with parameter bindings.

On a `@SoftDeletes` model, bulk DML honours the soft-delete scope just like reads:
`update`/`increment`/`decrement` **skip** already-deleted rows (default scope), and
`delete()` **soft-deletes** (stamps `deleted_at`) rather than issuing a hard
`DELETE` — consistent with the instance-level `delete()`. For a real `DELETE` use
`forceDelete()`; `restore()` clears `deleted_at` in bulk. `withTrashed()` /
`onlyTrashed()` widen / restrict the scope before the mutation.

## Connection-level writes and upserts

`db.table()` / `db.from()` (the connection-level builder, not a model query) exposes
an insert / upsert surface. The builders are lazy and chainable — the statement
runs on `await` / `.exec()`, so the clauses read in SQL order:

```ts
// Insert one row, upsert on a conflict target.
await db.table('users')
  .insert({ email, name })
  .onConflict('email')
  .merge()                      // UPDATE the row on conflict …
  .returning(['id'])

await db.table('users').insert({ email, name }).onConflict('email').ignore() // … or do nothing

// Insert many in one statement — missing keys are filled with NULL.
await db.table('audit_logs').multiInsert([
  { user_id: 1, action: 'login' },
  { user_id: 2, action: 'logout' },
])

// Update / delete on the current WHERE, optionally RETURNING.
await db.from('users').where('id', 1).update({ is_active: false }).returning(['id'])
```

`insert(row)` resolves to the RETURNING rows (or `[insertId]` on MySQL/SQLite, `[]`
otherwise). `merge(...)` may name columns or pass `{ col: value | db.raw(...) }`
custom assignments; `ignore()` is `DO NOTHING` / `INSERT IGNORE`; `returning(...)`
names the columns to return. On a model query, `update()` / `delete()` /
`forceDelete()` / `restore()` return the same lazy `DmlBuilder` and take an optional
`returning` list.
