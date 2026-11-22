# Query builder

This guide covers the query builder:

- Goal
- Main example
- Common API
- Security
- Recommended convention
- Query Builder

## Goal

Build readable and safe queries without string-concatenated SQL.

## Main example

```ts
import { QueryBuilder } from '@c9up/atlas'

const { sql, params } = new QueryBuilder('orders')
  .where('status', 'active')
  .orderBy('createdAt', 'desc')
  .paginate(1, 20)
  .toSQL()
```

## Common API

```ts
qb.select('id', 'status')
qb.where('total', '>', 100)
qb.orWhere('status', 'pending')
qb.whereIn('status', ['active', 'pending'])
qb.whereNull('deletedAt')
qb.orderBy('createdAt', 'desc')
qb.limit(20)
qb.offset(40)
qb.paginate(3, 20)
```

## Security

- Identifiers (table/column) are validated.
- Values are parameterized (`params`) instead of interpolated.
- Placeholders are dialect-aware (`?` or `$N`).

## Recommended convention

- For app code: prefer `ModelQuery` through `repo.query()`.
- Use `QueryBuilder` for advanced/cross-cutting query construction.

## Query Builder

The `QueryBuilder` provides a fluent API. When you call `toSQL()`, the builder serializes to JSON and delegates SQL compilation to the Rust `ream-query` crate via NAPI. Table names, column identifiers, and operators are validated and quoted at the Rust layer — not through string manipulation — which rejects malformed identifiers before a query string is produced.

Placeholders are dialect-aware: `?` for SQLite/MySQL, `$N` for PostgreSQL. Identifier quoting follows the same rule (`"col"` for SQLite/PostgreSQL, `` `col` `` for MySQL).

```typescript
import { QueryBuilder } from '@c9up/atlas'

const { sql, params } = new QueryBuilder('orders')
  .where('status', 'active')
  .orderBy('createdAt', 'desc')
  .paginate(1, 20)
  .toSQL()

// On SQLite (default):
// sql:    SELECT * FROM "orders" WHERE "status" = ? ORDER BY "createdAt" DESC LIMIT 20 OFFSET 0
// params: ['active']
//
// On PostgreSQL:
// sql:    SELECT * FROM "orders" WHERE "status" = $1 ORDER BY "createdAt" DESC LIMIT 20 OFFSET 0
```

### Full API Reference

```typescript
const qb = new QueryBuilder('orders')

// Projection
qb.select('id', 'status', 'total')        // SELECT id, status, total
qb.distinct()                              // SELECT DISTINCT

// Filtering
qb.where('status', 'active')              // WHERE status = $1
qb.where('total', '>', 100)               // WHERE total > $1
qb.orWhere('status', 'pending')           // OR status = $1
qb.whereIn('status', ['a', 'b', 'c'])    // WHERE status IN ($1, $2, $3)
qb.whereNull('deletedAt')                 // WHERE deletedAt IS NULL
qb.whereNotNull('createdAt')              // WHERE createdAt IS NOT NULL
qb.whereExists(subquery)                  // WHERE EXISTS (subquery)

// Grouping and aggregation
qb.groupBy('status', 'userId')            // GROUP BY status, userId
qb.having('total', '>', 500)              // HAVING total > $1

// Ordering and pagination
qb.orderBy('createdAt', 'desc')           // ORDER BY createdAt DESC
qb.limit(10)                              // LIMIT 10
qb.offset(20)                             // OFFSET 20
qb.paginate(2, 20)                        // LIMIT 20 OFFSET 20

// Relations
qb.preload('items')                       // Eager-load a relation

// Set operations
qb.union(otherQuery)                      // UNION
qb.unionAll(otherQuery)                   // UNION ALL

// CTEs
qb.with('recent', subquery)               // WITH recent AS (...)

// Compile
const { sql, params } = qb.toSQL()
```

### Raw SQL

For cases that fall outside the builder, use tagged `RawSql`:

```typescript
import { RawSql, QueryBuilder } from '@c9up/atlas'

const { sql } = new QueryBuilder('orders')
  .where('status', 'active')
  .with('totals', RawSql.sql`SELECT user_id, SUM(total) AS sum FROM orders GROUP BY user_id`)
  .toSQL()
```

#### Strict mode

Strict mode turns raw-SQL splicing off for the whole process. It is off by default.
Once on, these throw instead of running:

- every `*Raw` method of the model query and of the `db.from()` / `db.table()`
  builder (`whereRaw` and its `and`/`or`/`Not` variants, `joinRaw`, `havingRaw`,
  `orderByRaw`, `groupByRaw`);
- a `db.raw()` fragment handed to any other builder method, or written as a column
  value by a repository (`E_STRICT_MODE`);
- the repository's `raw()` (`E_STRICT_MODE`).

A `db.ref()` identifier is validated, not raw SQL, and still passes. `db.rawQuery()`
and the connection's `query()` / `execute()`, with bound parameters, stay available
as the explicit break-glass.

```typescript
import { setAtlasStrictMode } from '@c9up/atlas'

setAtlasStrictMode(true)   // at bootstrap
```

`ATLAS_STRICT=1` (or `true`) in the environment turns it on as well; the variable is
read once, on the first check. `setAtlasStrictMode(false)` turns it off.

### Clearing clauses

A builder handed to a helper that added a filter, an order or a slice can be
reset clause by clause instead of rebuilt — which is what a shared scope or a
reusable base query needs.

```ts
query.clearSelect().clearWhere().clearOrder().clearHaving().clearLimit().clearOffset()
```

### HAVING EXISTS

A correlated subquery in `HAVING` filters **groups** by something outside the
aggregate — "the groups that still have an open order" — which no combination of
`having(count)` expresses.

```ts
db.from('users')
  .groupBy('role')
  .havingExists((sub) => sub.from('orders').whereRaw('orders.role = users.role'))
```

`andHavingExists`, `orHavingExists`, `havingNotExists`, `andHavingNotExists` and
`orHavingNotExists` complete the family. A model query has them too; its
subquery is another model query, or a callback building one on the same model.

### Cursor pagination

```ts
const page = await Post.query().cursorPaginate({
  limit: 20,
  orderBy: 'id',
  direction: 'desc',       // a newest-first feed — the usual reason for a cursor
  cursor: previousCursor,
})
```

`direction` drives both the `ORDER BY` and the comparison operator. `nextCursor`
is `null` on the last page — that is how the client stops asking.

### Transactions

`trx.isCompleted` says whether a transaction has already committed or rolled
back. A helper handed one cannot otherwise tell whether it is still usable, and
a statement on a finished transaction fails at the driver with an error that
says nothing about the transaction.

```ts
if (!trx.isCompleted) await trx.rollback()
```

A savepoint tracks its own state: releasing it does not mark its parent complete.
