# Repositories

This guide covers repositories and their patterns:

- Repository
- Goal
- Example business repository
- Scoping every query — `scope`
- Best practices
- Soft delete

## Repository

`BaseRepository` provides typed CRUD operations backed by a database connection. The connection is resolved from the IoC container via `@Inject('db')`. It is the same surface `BaseModel` delegates to — use it directly when you prefer Data Mapper separation.

```typescript
import { inject, Inject } from '@c9up/ream'
import { BaseRepository } from '@c9up/atlas'
import type { DatabaseConnection } from '@c9up/atlas'
import { Order } from '../entities/Order.js'

@inject()
export class OrderService {
  private orders: BaseRepository<Order>

  constructor(@Inject('db') db: DatabaseConnection) {
    this.orders = new BaseRepository(Order, db)
  }
}
```

### Finders

```typescript
// Find by primary key
const order = this.orders.find('abc-123')         // Order | null
const order = this.orders.findOrFail('abc-123')   // Order (throws if not found)

// Find by any column
const user = this.users.findBy('email', 'a@b.com')  // User | null

// Get all
const all = this.orders.all()                     // Order[]

// Simple where
const active = this.orders.where('status', 'active')  // Order[]
```

### Create / Update / Delete

```typescript
// Create from data
const order = this.orders.create({
  id: crypto.randomUUID(),
  status: 'pending',
  total: 42.50,
  createdAt: new Date().toISOString(),
})

// Update specific columns by ID
this.orders.updateById(order.id, { status: 'paid', updatedAt: new Date().toISOString() })

// Update columns matching a condition
this.orders.updateWhere('status', 'expired', { archivedAt: new Date().toISOString() })

// Save (insert or update)
await this.orders.save(order)

// Delete
this.orders.delete(order)
```

### ModelQuery — Fluent Executable Queries

`repo.query()` returns a `ModelQuery` that serializes to an AST and delegates SQL compilation to the Rust `ream-query` crate. Column names accept either `camelCase` or `snake_case` — they are validated against the entity's `@Column` metadata and resolved to the actual DB column before the AST is built:

```typescript
// Multiple where + ordering + pagination
// (both `residenceId` and `residence_id` work — they resolve to the same column)
const tasks = this.tasks.query()
  .where('residenceId', residenceId)
  .where('status', 'declared')
  .orderBy('createdAt', 'desc')
  .limit(20)
  .exec()                                  // Task[]

// First match
const user = this.users.query()
  .where('email', email)
  .first()                                 // User | null

// First or throw
const user = this.users.query()
  .where('email', email)
  .firstOrFail()                           // User (throws if not found)

// Operators
this.orders.query().where('total', '>', 100).exec()
this.orders.query().whereNull('deletedAt').exec()
this.orders.query().whereNotNull('shippedAt').exec()
```

Passing an unknown column name throws `E_INVALID_COLUMN` before the query is sent to Rust, so injection through column names is structurally impossible.

#### Eager relation loading with `.preload()`

Relations are **never loaded automatically**. Call `.preload(relationName)` to load them with a single batched subquery (no N+1). `@HasMany`, `@BelongsTo`, and `@ManyToMany` are all supported:

```typescript
// hasMany + belongsTo
const users = this.users.query()
  .preload('posts')          // @HasMany — adds "posts" array to each user
  .preload('profile')        // @BelongsTo — sets "profile" on each user
  .exec()

// ManyToMany (via pivot table)
const users = this.users.query()
  .preload('roles')          // @ManyToMany — resolves through the pivot table
  .exec()

// Nested preload — the callback receives a sub-ModelQuery on the related entity
const users = this.users.query()
  .preload('posts', (q) => q.preload('comments'))
  .exec()
```

Internally, each preload issues at most one `SELECT ... WHERE fk IN (...)` per relation level. `@ManyToMany` issues two (pivot lookup + related load).

### Domain Events After Save

```typescript
repo.onDomainEvents = async (events) => {
  for (const event of events) {
    bus.emit(event.name, JSON.stringify(event))
  }
}

const order = new Order()
order.id = crypto.randomUUID()
order.markAsPaid()

await repo.save(order)
// Domain events dispatched, then cleared from entity
```

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
by column — `updateById`, `updateWhere`, `increment`, `decrement`, `upsert`. On
PostgreSQL and SQLite, `upsert` leaves a conflicting row outside the scope as it
is (`DO UPDATE … WHERE <scope>`). MySQL's `ON DUPLICATE KEY UPDATE` takes no
condition, so an `upsert` that updates columns is refused there with
`E_UNSUPPORTED`; one with no `updateColumns` (`INSERT IGNORE`) still runs. It is carried
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

The filter is ANDed with the query's clauses taken as one group, like the scope:
`where('email', login).orWhere('username', login)` does not find a deleted
account. It reaches reads, `paginate()` (count and page), bulk writes, preloads
and the sub-queries of `whereHas` / `withCount`.
