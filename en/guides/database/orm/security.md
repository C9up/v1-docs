# SQL security

This guide covers SQL security:

- Security defaults
- Unsafe surfaces to control
- Recommended hardening
- Raw SQL rules
- Error handling

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

`select()` and `having()` accept expressions as well as columns:
`count(*)`, `coalesce(sum(total), 0)`. A string with a parenthesis is an
expression. It is compiled as written, so it is first split into tokens and
parsed against a grammar. What the grammar has no place for is refused with
`E_UNSAFE_EXPRESSION`.

An expression may hold:

- column references, bare or quoted, with up to two qualifiers;
- numbers and string literals;
- the operators `+ - * / %`, `||`, `->`, `->>`, the comparisons, `AND`, `OR`,
  `NOT`, `IS [NOT] NULL`, `[NOT] LIKE`, `[NOT] IN (…)`, `[NOT] BETWEEN`;
- `CASE … WHEN … THEN … ELSE … END`, `CAST(x AS type)` and `x::type` for a
  fixed list of types, `INTERVAL '…'`, `CURRENT_DATE`, `CURRENT_TIME`,
  `CURRENT_TIMESTAMP`;
- calls to the listed functions: the aggregates (`count`, `sum`, `avg`, `min`,
  `max`, `array_agg`, `string_agg`, `json_agg`), the window functions
  (`row_number`, `rank`, `dense_rank`, `ntile`, `lag`, `lead`, `first_value`,
  `last_value`) and `coalesce`, `nullif`, `extract`, `date_trunc`, `now`,
  `length`, `lower`, `upper`, `trim`, `replace`, `substring`, `round`, `ceil`,
  `floor`, `abs`;
- inside a call only, the keywords that call owns: `DISTINCT`, `ORDER BY`,
  `FILTER (WHERE …)`, `OVER (PARTITION BY … ORDER BY …)`, `EXTRACT(x FROM y)`;
- in `select()`, one alias after the expression (`AS name`).

Everything else is refused. In particular:

- a statement keyword at any depth: `SELECT`, `FROM`, `WHERE`, `JOIN`, `ON`,
  `TABLE`, `UNION`, `VALUES`, `LIMIT`, `INTO`. `(table api_keys limit 1)` is a
  sub-select without the word, and it is refused;
- a row constructor `(a, b)` and a second expression after a comma;
- a word a server evaluates without parentheses (`current_user`,
  `session_user`, `current_schema`, …). Write it quoted (`"current_user"`) for
  a column of that name;
- a comment (`--`, `/*`, `*/`) and any `#`, inside a literal included: `#`
  opens a comment on MySQL;
- a backslash inside a string literal: MySQL and Postgres `E'…'` strings read
  `\'` as an escaped quote, the SQL standard as a backslash followed by the
  closing quote. Where the two disagree on where a literal ends, what the check
  skipped as "inside the string" would run as SQL;
- a function that is not listed, however it is spelled: a double-quoted or
  backticked name (`"pg_sleep"(30)`, `` `sleep`(5) ``) and a schema-qualified
  one (`pg_catalog.pg_sleep(1)`, `public.count(id)`) are calls the server runs.
  An allowed function is always written bare;
- any character the tokenizer has no token for: `;`, `$`, `@`, `?`, a lone `:`
  or `|`, a control character.

The grammar keeps an expression inside the tables of its own query. It does
not choose the columns for you: a field list taken from the request can still
name any column of those tables. Check it against a list of your own, as for
`orderBy` below.

An aggregate of the `db.from()` builder (`count`, `sum`, `avg`, `min`, `max`
and their `Distinct` forms) takes a column or `*`, never an expression.
`groupBy()` takes column names: an object such as `{ raw: '…' }`, which a
JSON body or `?groupBy[raw]=…` can produce, is refused with
`E_UNSAFE_IDENTIFIER`. A fragment goes through `groupByRaw()` or `db.raw()`.

`whereExpr()`'s extra expression (`whereExpr('total', '+ tax', '>=', 100)`)
stays available in strict mode. It is read by the same tokenizer and holds
arithmetic only: `+ - * /`, numbers, columns and an allow-listed set of scalar
functions (`abs`, `round`, `coalesce`, `length`, `lower`, …). `pg_sleep()`,
`version()` or `current_setting()` there are refused, with or without a
comment before the parenthesis. See
[Advanced ModelQuery](/en/guides/database/orm/advanced-queries).

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
[Encrypted connections](/en/guides/database/orm/connections#encrypted-connections-tls)).
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
