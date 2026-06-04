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

## Locks

```ts
repo.query().where('id', id).forUpdate().first()
repo.query().where('id', id).forShare().first()
```

Only use row locks inside a transaction boundary.
