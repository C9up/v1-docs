# Atlas - Query Builder

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
