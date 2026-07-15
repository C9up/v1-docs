# Atlas - Security

## Security defaults

Atlas already enforces several guardrails:

- identifier validation for columns/tables
- parameterized values in compiled SQL
- Rust-native SQL compilation path
- optional strict mode to disable unsafe raw methods

## Unsafe surfaces to control

- `whereRaw(sql, bindings)`
- `joinRaw(fragment, bindings?)`
- `havingRaw(sql, bindings)`
- dynamic column selection/order from HTTP inputs

Strict mode (`setAtlasStrictMode(true)` / `ATLAS_STRICT=1`) disables all three raw
methods (`whereRaw`, `joinRaw`, `havingRaw`).

## Recommended hardening

```ts
import { setAtlasStrictMode } from '@c9up/atlas'

setAtlasStrictMode(process.env.NODE_ENV === 'production')
```

And validate runtime-driven columns:

```ts
const sortable = new Set(['id', 'email', 'createdAt'])
const sortBy = sortable.has(input.sortBy) ? input.sortBy : 'id'
const dir = input.sortDir === 'asc' ? 'asc' : 'desc'

return repo.query().orderBy(sortBy, dir).exec()
```

## Raw SQL rules

- Never inject user strings into SQL fragments.
- Always use bindings for values.
- Prefer `whereExpr` and structured query methods first.

## Error handling

- map malformed cursors / invalid query inputs to `400`
- map `findOrFail`/entity-not-found to `404`
- avoid leaking full SQL text in production error responses
