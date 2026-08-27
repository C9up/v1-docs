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

In strict mode, `whereRaw()`, `joinRaw()`, `havingRaw()` **and** the repository's
`raw()` throw — hardening every raw-SQL surface of the typed layer. The
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
    limit: 20,
    orderBy: ['id'],
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

On a `@SoftDeletes` model, bulk DML honours the soft-delete scope just like reads:
`update`/`increment`/`decrement` **skip** already-deleted rows (default scope), and
`delete()` **soft-deletes** (stamps `deleted_at`) rather than issuing a hard
`DELETE` — consistent with the instance-level `delete()`. For a real `DELETE` use
`forceDelete()`; `restore()` clears `deleted_at` in bulk. `withTrashed()` /
`onlyTrashed()` widen / restrict the scope before the mutation.

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

**After-commit hooks.** `trx.after('commit', cb)` / `trx.after('rollback', cb)`
register side effects that run only once the transaction is durable (AdonisJS
Lucid parity); hook errors are swallowed so a post-commit side effect can't
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

## Plain-object reads with `pojo()`

Skip model hydration entirely — no `BaseEntity` instances, no dirty-tracking, no
`@column({ consume })`, no preloads. Returns the raw snake_case DB rows. A fast
read path for reports and exports (AdonisJS Lucid `pojo()`):

```ts
const rows = await User.query().where('active', true).pojo()
// rows: Array<{ id: number; full_name: string; ... }>
```

`pojo()` is chainable into `first()`, which is how Lucid's own code uses it:

```ts
const row = await User.query().where('email', email).pojo().first()
// row: { id: number; full_name: string; ... } | null
```

::: tip Named deviation
Lucid's `pojo()` is a flag on the builder, so the whole builder surface stays
available after it. `ModelQuery<T>` is constrained to `T extends BaseEntity` and
cannot be re-parametrised to a plain record, so ours is a terminal view: it is
awaitable for the rows and chainable into `first()`.
:::

For a single column, `pluck()` skips hydration the same way and returns the
values rather than the rows. It rejects object and relation columns, which
Knex's does not:

```ts
const emails = await User.query().where('active', true).pluck<string>('email')
// ['ada@acme.test', 'grace@acme.test']
```

A partial `select()` of plain columns **auto-includes the primary key**, so the
hydrated entity is still saveable (a later `save()` UPDATEs rather than INSERTs). For
aggregate/alias projections (`select('COUNT(*) as n')`) the PK can't be inferred —
use `pojo()`. Operations premised on an existing row (`delete()`, `forceDelete()`,
`restore()`, `refresh()`, `fresh()`, `load*()`) require a **persisted** entity:
they throw `E_MODEL_NOT_PERSISTED` on a local instance (even with a hand-set PK —
it isn't a row) and `E_MISSING_PRIMARY_KEY` on a persisted projection with no PK.
`save()` also throws `E_MISSING_PRIMARY_KEY` on such a projection. `related().create/save`
**persists the parent first** inside a managed transaction (AdonisJS/Lucid parity),
sets the child FK, then writes the child — atomic, rolled back on failure; a parent
from a projection with no PK is rejected (`E_MISSING_PRIMARY_KEY`).

## Sideloaded context

Thread arbitrary context onto every instance a query hydrates (AdonisJS Lucid
`sideload`) — e.g. the current tenant/user, readable from hooks or computed
properties via `entity.$sideloaded`:

```ts
const posts = await Post.query().sideload({ tenantId }).exec()
posts[0].$sideloaded // { tenantId }
```

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
and Lucid's bare spelling — `whereJsonSuperset` / `whereJsonSubset` and their
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
- `havingIn(col, values)` / `havingNotIn(col, values)`
- `havingBetween(col, [lo, hi])` / `havingNotBetween(col, [lo, hi])`
- `havingNull(col)` / `havingNotNull(col)`
- `havingRaw(sql, bindings?)`, `groupByRaw(sql)`, `orderByRaw(sql)`

A bare `having` column resolves through the entity column map (honouring
`@Column({ columnName })`); an aggregate expression or a `withCount` / `withAggregate`
alias is left verbatim so `having` can reference it. `havingRaw`, `groupByRaw` and
`orderByRaw` are raw-SQL surfaces — they throw under `setAtlasStrictMode(true)` /
`ATLAS_STRICT`, exactly like `whereRaw`.

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

The callback `ON` builder carries the full Lucid/Knex constraint set alongside
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
treating it as the promise it looks like, and Lucid's builder carries all three.

`exec()` memoizes, so awaiting the same builder twice shares one round-trip.
Call `clone()` for a fresh one.

## Lucid-parity helpers

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

## Query timeouts

```ts
// Client-side race only: the awaiter rejects after 2s; the driver still finishes
// the query server-side (Lucid's default timeout semantics).
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

## Connection-level writes and upserts

`db.table()` / `db.from()` (the connection-level builder, not a model query) exposes
Lucid's insert / upsert surface. The builders are lazy and chainable — the statement
runs on `await` / `.exec()`, so the Lucid clause order works:

```ts
// Insert one row, upsert on a conflict target.
await db.table('users')
  .insert({ email, name })
  .onConflict('email')
  .merge()                      // UPDATE the row on conflict …
  .returning(['id'])

await db.table('users').insert({ email, name }).onConflict('email').ignore() // … or do nothing

// Insert many in one statement — missing keys are filled with NULL (Lucid semantics).
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

## The paginator result

`repo.query().paginate(page, perPage)` resolves to a `Paginator<T>` — the items plus
Lucid-parity metadata and page-URL helpers.

```ts
const page = await repo.query().orderBy('id').paginate(2, 20)

page.all()            // T[] — the rows on this page
page.total            // total rows across all pages
page.perPage          // 20
page.currentPage      // 2
page.lastPage         // ceil(total / perPage)
page.firstPage        // 1
page.hasPages         // more than one page?
page.hasMorePages     // is there a page after this one?

// Page URLs — set a base + carried query string first.
page.baseUrl('/users').queryString({ sort: 'name' })
page.getUrl(3)                 // '/users?sort=name&page=3'
page.getNextPageUrl()          // next page URL, or null on the last page
page.getPreviousPageUrl()      // previous page URL, or null on the first page
page.getUrlsForRange(1, 5)     // [{ page, url, isActive }, …], clamped to [1, lastPage]

// Serialize for an API response (snake_case meta via the naming strategy).
page.serialize({ fields: ['id', 'name'] })
page.toJSON()                  // { data, meta }
```

`getUrl` returns `''` until a `baseUrl` is set. `serialize` / `toJSON` emit
`{ data, meta }`; the `meta` keys are remapped through the naming strategy's
`paginationMetaKeys` (snake_case by default) and include the page URLs once a
`baseUrl` is present.
