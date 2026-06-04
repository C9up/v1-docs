# Atlas - Relations

## Supported relation types

- `@HasMany`
- `@BelongsTo`
- `@ManyToMany`

## Example

```ts
import { BaseEntity, Entity, PrimaryKey, Column, HasMany, BelongsTo, ManyToMany } from '@c9up/atlas'

@Entity('users')
class User extends BaseEntity {
  @PrimaryKey() declare id: string
  @Column() declare email: string

  @HasMany(() => Post)
  declare posts: Post[]

  @ManyToMany(() => Role, {
    pivotTable: 'user_roles',
    foreignKey: 'user_id',
    otherKey: 'role_id',
  })
  declare roles: Role[]
}

@Entity('posts')
class Post extends BaseEntity {
  @PrimaryKey() declare id: string
  @Column() declare userId: string

  @BelongsTo(() => User)
  declare user: User
}
```

## Loading

Relations are not loaded automatically. Use `preload`:

```ts
const users = repo.query()
  .preload('posts')
  .preload('roles')
  .exec()
```

## N+1

`preload` issues batched subqueries (`IN (...)`) to prevent N+1 patterns.

## Typed pivot extras

Pivot tables can carry extra columns beyond the two foreign keys (e.g., an `amount` Decimal on a `users_orders` join). Declare a per-extra-column adapter in `pivotColumnAdapters` to route the value through `prepare` on `attach()` / `sync()` — same `{ prepare?, consume? }` shape as `@Column()`. Without an adapter, raw values are bound as-is (postgres' `pg` driver coerces unknown objects via `.toString()`, often yielding `[object Object]` for plain objects; mysql2 may reject the bind).

```ts
import { BaseEntity, Entity, PrimaryKey, ManyToMany } from '@c9up/atlas'
import { Decimal, decimalAtlasAdapter } from '@c9up/atom/atlas'

@Entity('users')
class User extends BaseEntity {
  @PrimaryKey() declare id: number

  @ManyToMany(() => Order, {
    pivotTable: 'users_orders',
    pivotColumns: ['amount'],
    pivotColumnAdapters: { amount: decimalAtlasAdapter },
  })
  declare orders: Order[]
}

await user.related('orders').attach({
  [orderId]: { amount: new Decimal('1.5') }, // encoded to '1.5' via decimalAtlasAdapter.prepare
})
```

**Null-safety.** Adapters must handle `null` and `undefined` themselves. When `attach()` is called with heterogeneous entries — the same extra key present on some entries and absent on others — atlas back-fills the missing rows with `null` BEFORE calling `prepare`, so your adapter must be null-safe even when no caller wrote null explicitly.

**Load-side dormancy.** The adapter's `consume` callback is parsed and stored on the relation metadata, but the `$extras.pivot_<col>` projection mechanism has not yet landed — `consume` is currently inert and will activate when the projection lands in a future story.

**Reserved keys.** Pivot extras MUST NOT use the FK column names (`foreignKey`/`otherKey`) or the timestamp column names from `pivotTimestamps`. atlas throws at `attach()` time when a caller passes one of those keys in extras (silent FK override / duplicate timestamp column would otherwise corrupt the row).

## Best practices

- Always name pivot tables explicitly for many-to-many.
- Keep FK naming consistent (`user_id`, `role_id`).
- Avoid deep eager loading in performance-sensitive endpoints.
