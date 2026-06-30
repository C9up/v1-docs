# Atlas - Advanced ModelQuery

This page focuses on production-oriented query patterns.

## Prefer `whereExpr` over `whereRaw`

```ts
const q = repo.query()
  .whereExpr('total', '>=', 100)
  .whereExpr('total', '+ tax', '>=', 100)
```

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

Use `joinOn(table, left, right)` for simple join-on-column cases.

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

`transaction(db, callback)` runs the callback inside a database transaction —
commit on success, rollback on a thrown error. It is **pinned to a single
connection** (`db.begin()` under the hood): every `query`/`execute` on the `trx`
handle runs on that one connection, so a read-then-decide-then-write is
genuinely atomic, and the connection is only returned to the pool on
commit/rollback.

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
```

Nested `transaction()` calls reuse the same connection via `SAVEPOINT` (partial
rollback). Hand the active `trx` to a repository with `repo.useTransaction(trx)`.

> Never emulate a transaction by issuing `BEGIN`/`COMMIT` through `db.execute()`
> on a pooled connection: each call may land on a different connection, so the
> statements scatter — nothing is atomic and a row lock can be stranded on an
> idle pooled connection. Always go through `transaction()` / `db.begin()`.

For a fixed list of statements you don't need to read between, use
`runInTransaction(batch)` — atomic but non-interactive (what migrations use).

## Locks

```ts
repo.query().where('id', id).forUpdate().first()
repo.query().where('id', id).forShare().first()
```

Only use row locks inside a transaction boundary.
