# Entities

This guide covers defining entities and their columns:

- Defining Entities
- BaseEntity

## Defining Entities

```typescript
import { Entity, Column, PrimaryKey, HasMany, BelongsTo, ManyToMany, BaseEntity } from '@c9up/atlas'

@Entity('orders')
class Order extends BaseEntity {
  @PrimaryKey() declare id: string
  @Column() declare status: string
  @Column({ type: 'decimal' }) declare total: number
  @Column() declare userId: string

  @HasMany(() => OrderItem) declare items: OrderItem[]
  @BelongsTo(() => User)   declare user: User

  markAsPaid() {
    this.status = 'paid'
    this.addDomainEvent('order.paid', { orderId: this.id, total: this.total })
  }
}

@Entity('order_items')
class OrderItem extends BaseEntity {
  @PrimaryKey() declare id: string
  @Column() declare orderId: string
  @Column() declare productName: string
  @Column() declare quantity: number
}
```

### Decorators

| Decorator | Purpose |
|-----------|---------|
| `@Entity('table')` | Marks a class as a mapped entity for the given table |
| `@PrimaryKey()` | Marks the primary key column (also registers as `@Column`) |
| `@Column(options?)` | Maps a property to a database column |
| `@HasMany(() => Related)` | One-to-many relation |
| `@BelongsTo(() => Related)` | Many-to-one relation |
| `@ManyToMany(() => Related, { pivotTable, foreignKey?, otherKey? })` | Many-to-many relation through a pivot table |

`@Column` accepts an optional options object:

```typescript
@Column({ type: 'decimal', nullable: true, default: 0 })
declare total: number
```

By default a property maps to its `snake_case` column (`userId` → `user_id`).
Override that per-column for legacy/non-conventional schemas with `columnName`
— reads, writes, `where`/`orderBy` and hydration all
honor it:

```typescript
@Column({ columnName: 'USR_MAIL' }) declare email: string
```

### Date columns

`@column.date()` / `@column.dateTime()` hydrate to a **`@c9up/chronos` `DateTime`** — the Ream date engine. Reads return a `DateTime`, writes lower it back to an ISO 8601 string, and `autoCreate` / `autoUpdate` stamp `DateTime.now()`:

```typescript
import { DateTime } from '@c9up/chronos'

class Meeting extends BaseModel {
  @column.dateTime() declare startsAt: DateTime | null
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime | null
}

const m = await Meeting.create({ startsAt: new DateTime('2026-06-09T12:34:56Z') })
m.startsAt.toISO()          // '2026-06-09T12:34:56Z'
```

`@ManyToMany` requires explicit pivot configuration. The pivot table name is mandatory; foreign keys default to `${singular_table}_id` when omitted:

```typescript
@Entity('users')
class User extends BaseEntity {
  @PrimaryKey() declare id: string
  @ManyToMany(() => Role, {
    pivotTable: 'user_roles',
    foreignKey: 'user_id',    // optional, defaults to "${thisTable}_id"
    otherKey: 'role_id',      // optional, defaults to "${relatedTable}_id"
  })
  declare roles: Role[]
}
```

## BaseEntity

All entity classes extend `BaseEntity`, which provides domain event accumulation:

```typescript
// Accumulate a domain event — dispatched after save()
this.addDomainEvent('order.paid', { orderId: this.id })

// Read pending events without clearing
const events = entity.getDomainEvents()   // readonly DomainEvent[]

// Get and clear atomically (used internally by save)
const events = entity.flushDomainEvents() // DomainEvent[]

// Check if events are pending
entity.hasDomainEvents() // boolean

// Clear without reading
entity.clearDomainEvents()
```
