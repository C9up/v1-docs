# Atlas - Security

## Security defaults

Atlas already enforces several guardrails:

- identifier validation for columns/tables
- parameterized values in compiled SQL
- Rust-native SQL compilation path
- optional strict mode to disable unsafe raw methods
- no TLS mode that falls back to plaintext silently: `sslmode=prefer` and
  `allow` are refused

## Unsafe surfaces to control

- `whereRaw(sql, bindings)`
- `joinRaw(fragment, bindings?)`
- `havingRaw(sql, bindings)`
- dynamic column selection/order from HTTP inputs

`select()` and `having()` accept expressions as well as columns —
`count(*)`, `coalesce(sum(total), 0)` — and validate them before they are
compiled. Besides refusing sub-selects and statement keywords, they refuse:

- a backslash inside a string literal: MySQL and Postgres `E'…'` strings read
  `\'` as an escaped quote, the SQL standard as a backslash followed by the
  closing quote. Where the two disagree on where a literal ends, what the check
  skipped as "inside the string" would run as SQL. No aggregate needs one.
- any `#`, inside a literal included: it opens a comment on MySQL. No column,
  alias or aggregate these methods accept needs it.

A quote doubled inside a literal (`'it''s'`) stays accepted. Anything these
checks refuse belongs in a raw surface with bindings.

Strict mode (`setAtlasStrictMode(true)` / `ATLAS_STRICT=1`) disables every raw
surface of the typed layer — `whereRaw`, `joinRaw`, `havingRaw` and the
repository's `raw()`. The connection-level `db.query()` / `db.execute()` remain
the explicit, always-parameterised break-glass.

## Recommended hardening

```ts
import { setAtlasStrictMode } from '@c9up/atlas'

setAtlasStrictMode(process.env.NODE_ENV === 'production')
```

When the database is reached over a network you do not control, encrypt the
connection and check the server's name with `sslmode=verify-full` (see
[Encrypted connections](./connections.md#encrypted-connections-tls)).
`require` and `verify-ca` encrypt without checking the name, so any
certificate from the same authority passes: atlas accepts them with a warning.

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
