# Atlas - Advanced ModelQuery

This page focuses on production-oriented query patterns.

## Prefer `whereExpr` over `whereRaw`

```ts
const q = repo.query()
  .whereExpr('total', '>=', 100)
  .whereExpr('total', '+ tax', '>=', 100)
```

The optional `extraExpression` (2nd arg of the 4-arg form) is an **arithmetic**
fragment only — columns, numbers, `+ - * / ,`, parentheses and functions. Bare
SQL keywords (`OR`, `AND`, `IS`, `NOT`, `SELECT`, …) are rejected so the fragment
can't alter the predicate's logic; the compared value is always bound. Reach for
`whereRaw` (with bindings) for anything beyond arithmetic.

Use `whereRaw` only for truly dialect-specific SQL fragments and always with bindings.

## Strict mode for hardening

```ts
import { setAtlasStrictMode } from '@c9up/atlas'

setAtlasStrictMode(true)
```

In strict mode, `whereRaw()` and `joinRaw()` throw to prevent unsafe patterns.

## Relation filtering patterns

```ts
const users = repo.query()
  .whereHas('posts', (q) => q.where('published', true))
  .orWhereDoesntHave('posts')
  .exec()
```

Also available:

- `has('posts')`
- `has('posts', '>=', 3)`
- `orHas(...)`
- `doesntHave('posts')`

## Joins

```ts
const rows = repo.query()
  .leftJoin('profiles', (j) => j.on('users.id', 'profiles.user_id').andOnVal('profiles.is_public', true))
  .select(['users.id', 'profiles.avatar'])
  .exec()
```

Inside the callback: `on` / `andOn` / `orOn` join two **columns**; `onVal` /
`andOnVal` / `orOnVal` join a column to a **bound value** (AdonisJS/Knex parity) —
the value is parameterised (never inlined) and threaded through the compiler ahead
of the `WHERE` params. `joinRaw(fragment, bindings?)` accepts its own `?` bindings.
Use `joinOn(table, left, right)` for simple join-on-column cases.

With a join and the **default** `SELECT *`, the projection is scoped to the model's
own columns (`<table>.col…`) so a joined table can't clobber the model's fields on
hydration — pass an explicit `select()` to widen it. Join identifiers must be a
strict `[table.]column` (letters/digits/underscore); anything else throws (use
`joinRaw` for expressions).

## Cursor pagination

```ts
const page = await repo.query()
  .orderBy('id', 'asc')
  .cursorPaginate({
    perPage: 20,
    orderBy: ['id'],
    cursor: null,
  })
```

Recommendations:

- Always provide deterministic ordering columns.
- Keep ordering columns immutable when possible.
- Treat malformed cursor errors as `400` at HTTP layer.

## Query-level mutations

```ts
repo.query().where('status', 'pending').update({ status: 'processed' })
repo.query().where('expired', true).delete()
repo.query().where('id', 10).increment('attempts', 1)
```

For complex SQL criteria unsupported by safe clauses, use explicit raw SQL with parameter bindings.

## Transactions

Atlas mirrors Lucid's transaction API. Either way the transaction is **pinned to
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

// Same thing as a method (Lucid parity):
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
rollback). Hand the active `trx` to a repository with `repo.useTransaction(trx)`.

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

// Postgres-only weaker locks (mirror AdonisJS/Knex):
repo.query().where('id', id).forNoKeyUpdate().first()
repo.query().where('id', id).forKeyShare().first()

// Modifiers — compose onto any base lock:
repo.query().forUpdate().skipLocked().all() // skip rows already locked
repo.query().forUpdate().noWait().all()      // error instead of waiting
```

`forNoKeyUpdate`/`forKeyShare` are Postgres-only (ignored elsewhere with a
warning). Locks are silently dropped on SQLite. Only use row locks inside a
transaction boundary.

## Plain-object reads with `pojo()`

Skip model hydration entirely — no `BaseEntity` instances, no dirty-tracking, no
`@column({ consume })`, no preloads. Returns the raw snake_case DB rows. A fast
read path for reports and exports (AdonisJS Lucid `pojo()`):

```ts
const rows = await User.query().where('active', true).pojo()
// rows: Array<{ id: number; full_name: string; ... }>
```

A partial `select()` of plain columns **auto-includes the primary key**, so the
hydrated entity is still saveable (a later `save()` UPDATEs rather than INSERTs). For
aggregate/alias projections (`select('COUNT(*) as n')`) the PK can't be inferred —
use `pojo()`; calling `save()` on such an entity throws `E_MISSING_PRIMARY_KEY`.

## Sideloaded context

Thread arbitrary context onto every instance a query hydrates (AdonisJS Lucid
`sideload`) — e.g. the current tenant/user, readable from hooks or computed
properties via `entity.$sideloaded`:

```ts
const posts = await Post.query().sideload({ tenantId }).exec()
posts[0].$sideloaded // { tenantId }
```
