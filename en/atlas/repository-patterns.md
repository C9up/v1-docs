# Atlas - Repository Patterns

## Goal

Encapsulate data access logic inside explicit repositories.

## Example business repository

```ts
import { BaseRepository } from '@c9up/atlas'
import type { DatabaseConnection } from '@c9up/atlas'

export class UserRepository {
  private repo: BaseRepository<User>

  constructor(db: DatabaseConnection) {
    this.repo = new BaseRepository(User, db)
  }

  findActiveByEmail(email: string) {
    return this.repo.query()
      .where('email', email)
      .where('status', 'active')
      .first()
  }

  listRecent(limit = 20) {
    return this.repo.query()
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .exec()
  }
}
```

## Scoping every query — `scope`

A repository can carry a constraint that every one of its queries receives —
the place for a tenant filter:

```ts
import { BaseRepository } from '@c9up/atlas'

const TENANT_TABLES = new Set(['invoices', 'invoice_lines', 'customers'])

const invoices = new BaseRepository(Invoice, db, {
  scope: (q, table) => {
    if (TENANT_TABLES.has(table)) q.where('company_id', currentCompanyId())
  },
})
```

The scope applies to the repository's finders, `query()`, and its writes by id or
by column — `updateById`, `updateWhere`, `increment`, `decrement`. It is carried
to every query its relations run:

- preloads, nested ones included;
- the pivot table of a many-to-many and the intermediate table of a through
  relation;
- the subqueries of `whereHas` / `withCount`;
- `load()` / `related()` on the entities the repository hydrated;
- the copy `useTransaction(trx)` returns.

The function receives each query with the table it reads, and adds `WHERE`
constraints to it; anything else it sets is ignored. A table it does not concern
is let through by adding nothing. Its constraints are ANDed, in their own
parentheses, with the query's, so an `orWhere` the caller chains cannot reach
past them. It runs each time a query compiles, so it reads the state of that
moment (a tenant held in async context), and it may throw to refuse a query
outright.

Writes on an entity (`save`, `delete`) are not filtered: the entity came from a
scoped read.

## Best practices

- expose business-level methods, not only generic CRUD
- avoid composing complex SQL/query logic in HTTP layer
- centralize dynamic columns behind explicit whitelists

## Soft delete

Atlas supports soft-delete scopes depending on entity configuration:

- default: excludes soft-deleted rows
- `withTrashed()` includes all
- `onlyTrashed()` returns only soft-deleted rows
