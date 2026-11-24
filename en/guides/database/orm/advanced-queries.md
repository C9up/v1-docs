# Advanced queries

This guide covers advanced ModelQuery features:

- Prefer `whereExpr` over `whereRaw`
- Strict mode for hardening
- Relation filtering patterns
- Joins
- Outer joins and `ON` constraints
- JSON predicates
- Pivot filters (`@ManyToMany`)
- GROUP BY / HAVING
- Set operations
- Common Table Expressions (CTE)
- More query helpers

This page focuses on production-oriented query patterns.

## Prefer `whereExpr` over `whereRaw`

```ts
const q = repo.query()
  .whereExpr('total', '>=', 100)
  .whereExpr('total', '+ tax', '>=', 100)
```

The optional `extraExpression` (2nd arg of the 4-arg form) is a tail of
**arithmetic**, appended to the quoted column. It is one or more
`operator operand` pairs:

- the operators are `+ - * /`;
- an operand is a number, a column, a parenthesised operand, or a call to one
  of `abs`, `ceil`, `floor`, `round`, `coalesce`, `nullif`, `length`, `lower`,
  `upper`, `trim`, `replace`, `substring`, `now`.

The compiler splits the whole fragment into tokens and refuses whatever it
cannot place. So these are refused:

- any other call (`pg_sleep()`, `version()`, `current_setting()`, a
  user-defined function), however it is spelled;
- a comment (`--`, `/*`, `*/`): `pg_sleep/**/(2)` is a call for the server;
- a quote, a string literal, a qualified name (`orders.tax`), any other
  operator;
- a SQL keyword (`OR`, `AND`, `IS`, `NOT`, `SELECT`, …) and the words a server
  evaluates without parentheses (`current_user`, `session_user`,
  `current_date`, …);
- a fragment that does not start with an operator, such as `(tax)`.

The compared value is always bound. The 4-arg form stays available in strict
mode, which is why it is an allow-list. Reach for `whereRaw` (with bindings)
for anything beyond it.

Use `whereRaw` only for truly dialect-specific SQL fragments and always with bindings.

## Strict mode for hardening

```ts
import { setAtlasStrictMode } from '@c9up/atlas'

setAtlasStrictMode(true)
```

In strict mode, `whereRaw()`, `joinRaw()`, `havingRaw()` **and** the repository's
`raw()` throw — hardening every raw-SQL surface of the typed layer. A `db.raw()`
fragment passed to `select()`, `orderBy()`, `update()`, as a `where()` value or
as a value a model writes (`create()`, `createMany()`, `save()`) is refused the
same way; `db.ref()`, a validated and quoted column reference, stays
allowed. The
connection-level `db.query()` / `db.execute()` stay available as the explicit,
always-parameterised break-glass — a greppable escape hatch, never a silent
bypass of strict mode.

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
`andOnVal` / `orOnVal` join a column to a **bound value** —
the value is parameterised (never inlined) and threaded through the compiler ahead
of the `WHERE` params. `joinRaw(fragment, bindings?)` accepts its own `?` bindings.
Use `joinOn(table, left, right)` for simple join-on-column cases.

With a join and the **default** `SELECT *`, the projection is scoped to the model's
own columns (`<table>.col…`) so a joined table can't clobber the model's fields on
hydration — pass an explicit `select()` to widen it. Join identifiers must be a
strict `[table.]column` (letters/digits/underscore); anything else throws (use
`joinRaw` for expressions).

## Outer joins and `ON` constraints

Beyond `innerJoin` / `leftJoin` / `rightJoin`, Atlas exposes the outer spellings and
`fullOuterJoin`:

```ts
repo.query().leftOuterJoin('profiles', 'users.id', 'profiles.user_id')
repo.query().rightOuterJoin('teams', 'users.team_id', 'teams.id')
repo.query().fullOuterJoin('audits', 'users.id', 'audits.user_id') // Postgres
```

`leftOuterJoin` / `rightOuterJoin` are aliases of `leftJoin` / `rightJoin`.
`fullOuterJoin` is Postgres — MySQL and SQLite lack `FULL OUTER JOIN`.

The callback `ON` builder carries the full constraint set alongside
`on` / `andOn` / `orOn` and `onVal` / `andOnVal` / `orOnVal`:

```ts
repo.query().leftJoin('orders', (j) =>
  j.on('users.id', 'orders.user_id')
   .onIn('orders.status', ['paid', 'shipped'])
   .onNotNull('orders.confirmed_at')
   .onBetween('orders.total', [10, 1000])
   .onExists((s) => s.select('1').from('refunds').whereColumn('refunds.order_id', '=', 'orders.id')))
```

Each `on*` value is parameterised: `onIn` / `onNotIn` (bound `IN` list), `onNull` /
`onNotNull`, `onBetween` / `onNotBetween` (inclusive), and `onExists` / `onNotExists`
(a builder or a callback). Identifiers are dialect-quoted; the operator is
allowlisted.

## JSON predicates

Filter on a JSON/JSONB column by path or by containment. Every value — the path
**and** the compared value — crosses the boundary as a bound param; only the
column is a quoted identifier.

```ts
// Compare a value at a JSONPath ($.a.b, $.items[0]); the operator defaults to `=`.
repo.query().whereJsonPath('data', '$.address.city', 'Paris')
repo.query().whereJsonPath('data', '$.total', '>', 1000)

// Structural equality — the column's JSON must match `value`.
repo.query().whereJson('prefs', { theme: 'dark', compact: true })

// Containment (Postgres/MySQL): `@>` superset / `<@` subset.
repo.query().whereJsonSupersetOf('tags', ['urgent'])
repo.query().whereJsonSubsetOf('scopes', ['read', 'write', 'admin'])
```

Each has the full `and*` / `or*` / `whereNot*` family: `andWhereJsonPath`,
`orWhereJsonPath`; `whereJson` / `andWhereJson` / `orWhereJson` / `whereNotJson` /
`andWhereNotJson` / `orWhereNotJson`; and for containment both the `*Of` spelling
and the bare spelling — `whereJsonSuperset` / `whereJsonSubset` and their
`and*` / `or*` / `whereNot*` / `orWhereNot*` variants.

> Containment is Postgres/MySQL only — SQLite has no JSON containment operator, so
> the compiler raises `E_UNSUPPORTED` there rather than emitting broken SQL. A
> JSONPath must start at the document root (`$`).

## Pivot filters (`@ManyToMany`)

Inside an m2m `preload` callback, filter loaded relations by a column on the
**pivot** table (not the related table). These are recorded separately and applied
to the pivot lookup by the m2m resolver — inert on non-m2m relations.

```ts
userRepo.query()
  .preload('roles', (q) =>
    q.wherePivot('active', true)
     .whereInPivot('scope', ['admin', 'owner'])
     .pivotColumns(['notes']),
  )
```

The full family:

- `wherePivot(col, [op,] value)` + `andWherePivot` / `orWherePivot`
- `whereInPivot(col, values)` / `whereNotInPivot(col, values)` + `and*` / `or*`
  (plus the earlier alias `wherePivotIn`)
- `whereNotPivot(col, [op,] value)` — negates the comparison — + `and*` / `or*`
- `whereNullPivot(col)` / `whereNotNullPivot(col)` + `and*` / `or*`

Extra pivot columns requested with `pivotColumns([...])` are read off each loaded
relation as `$extras.pivot_<col>`. An `or*` pivot filter is compiled inside a
parenthesised group, so it can never escape the `pivot_fk IN (parents)` scoping
that keeps the preload correct.

## GROUP BY / HAVING

```ts
const rows = await repo.query()
  .select({ status: 'status', n: 'COUNT(*)' })
  .groupBy('status')
  .having('COUNT(*)', '>', 5)
  .havingBetween('COUNT(*)', [5, 100])
  .orderByRaw('COUNT(*) DESC')
  .pojo()
```

- `having(col, op, value)` / `orHaving(col, op, value)`
- `having((q) => …)` / `orHaving((q) => …)`: the callback's clauses, parenthesised
  as one group (`HAVING (count(*) > ? OR sum(total) < ?)`)
- `having(db.raw(sql, bindings))` / `orHaving(db.raw(…))`
- `havingIn(col, values)` / `havingNotIn(col, values)`
- `havingBetween(col, [lo, hi])` / `havingNotBetween(col, [lo, hi])`
- `havingNull(col)` / `havingNotNull(col)`
- `havingExists(sub)` / `havingNotExists(sub)`: `sub` is another model query or a
  callback building one on this model
- `havingRaw(sql, bindings?)`, `groupByRaw(sql, bindings?)`, `orderByRaw(sql, bindings?)`
- `groupBy(...columns)`: column names only. On `db.from()`, a `db.raw()` fragment
  is accepted too; any other value (an object from a request body) is refused
  with `E_UNSAFE_IDENTIFIER`

Every `having*` method has an `or*` form (`orHavingIn`, `orHavingNull`,
`orHavingBetween`, `orHavingExists`, `orHavingRaw`, …) and an `and*` alias
(`andHaving`, `andHavingIn`, …), on the model query and on `db.from()` alike.

A bare `having` column resolves through the entity column map (honouring
`@Column({ columnName })`); an aggregate expression or a `withCount` / `withAggregate`
alias is left verbatim so `having` can reference it. `havingRaw`, `groupByRaw` and
`orderByRaw` are raw-SQL surfaces — they throw under `setAtlasStrictMode(true)` /
`ATLAS_STRICT`, exactly like `whereRaw`; so do `orHavingRaw`, `andHavingRaw` and
`having(db.raw(…))`.

## Set operations

Combine the query with another whole query — a `ModelQuery` on the same model, or a
callback that builds one.

```ts
const ids = await repo.query().select('id').where('region', 'eu')
  .union((q) => q.select('id').where('vip', true))
  .exec()

repo.query().intersect((q) => q.where('active', true))
repo.query().except((q) => q.where('banned', true))
```

Available: `union` / `unionAll`, `intersect` / `intersectAll`, `except` / `exceptAll`.
The other query's bindings are re-indexed into the outer parameter list.

> `intersectAll` / `exceptAll` are Postgres/MySQL only — SQLite's compound grammar
> has no `INTERSECT ALL` / `EXCEPT ALL`, so the compiler raises `E_UNSUPPORTED`
> there instead of emitting a syntax error.

## Common Table Expressions (CTE)

```ts
// Recursive walk of an adjacency tree.
const tree = await repo.query()
  .withRecursive('subtree', (q) =>
    q.select('id', 'parent_id').where('id', rootId)
     .unionAll((r) => r.select('c.id', 'c.parent_id')
       .from('categories as c')
       .innerJoin('subtree', 's.id', 'c.parent_id')),
    ['id', 'parent_id'],
  )
  .exec()
```

- `with(name, query)` — a plain `WITH name AS (…)`
- `withRecursive(name, query, columns?)` — a self-referencing CTE (the recursive
  term is a `union` / `unionAll` inside `query`); one recursive entry makes the
  whole `WITH` clause recursive
- `withMaterialized(name, query)` / `withNotMaterialized(name, query)` — the
  Postgres 12+ / SQLite 3.35+ planner hint (MySQL raises `E_UNSUPPORTED`)

The CTE name is validated as an identifier; the sub-query's bindings are re-indexed
into the outer list.

## More query helpers

```ts
// Exactly one row, or throw — a second match is a bug first() would hide.
const user = await repo.query().where('email', email).sole()

// Top-N-per-parent in a has-many preload (windowed, not a global LIMIT).
authorRepo.query().preload('posts', (q) =>
  q.groupLimit(3).groupOrderBy('created_at', 'desc'))

// Postgres DISTINCT ON — first row per distinct set.
repo.query().distinctOn('user_id').orderBy('user_id').orderBy('created_at', 'desc')

// Distinct aggregates.
const uniqueTotal = await repo.query().sumDistinct('amount')
const uniqueAvg = await repo.query().avgDistinct('score')

// Dialect-conditional clauses.
repo.query()
  .ifDialect('postgres', (q) => q.distinctOn('user_id'))
  .unlessDialect('sqlite', (q) => q.forUpdate())

// First matching [guard, callback]; a trailing bare callback is the default.
repo.query().match(
  [sort === 'new', (q) => q.orderBy('created_at', 'desc')],
  [sort === 'top', (q) => q.orderBy('score', 'desc')],
  (q) => q.orderBy('id'),
)

// A leading SQL comment on the compiled statement (for pg_stat_statements etc).
repo.query().comment('dashboard:active-users').exec()
```

`groupLimit` compiles to a `ROW_NUMBER() OVER (PARTITION BY <fk> …)` window and is
meaningful only in a has-many preload callback; a plain `.limit()` caps the whole
result set across parents. `distinctOn` is Postgres-only (the compiler refuses it
elsewhere rather than return a silently different result set). `comment()` rejects a
`*/` terminator so a comment can never break out of the `/* … */` wrapper.

> The plain conditional helpers `if(condition, cb, elseCb?)` / `unless(...)` live on
> the connection-level `db.query()` builder; on a model query use `match` or the
> dialect-scoped `ifDialect` / `unlessDialect`.
