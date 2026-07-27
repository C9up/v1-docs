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

**Atomic writes (Adonis Lucid parity).** `related('skills').create/save/createMany/saveMany`
run the whole chain — persist an unsaved parent, write the related row(s), insert
the pivot row(s) — inside ONE transaction. Any failure rolls the whole thing back:
no orphan related row, no pivot pointing at a missing parent. Domain events are
flushed only after the transaction commits.

**`sync()` semantics (Adonis Lucid parity).** `sync(target)` reconciles the pivot to exactly `target`: missing rows are attached, rows absent from the target are detached, and **already-attached rows whose pivot attributes changed are UPDATED in place** (only the changed rows, only `updated_at` bumped — a no-op `sync` writes nothing). Pass `sync(target, true)` for an additive sync (attach + update, never detach). The read and all three writes run inside a **single managed transaction** — atomic, rolled back on any failure, so a concurrent writer can't wedge the pivot into a half-synced state. Object-form keys (`sync({ 1: {...} })`) arrive as strings from JS; a canonical integer is coerced back to a number before binding and the diff compares by string identity, so an integer related PK never gets a `text` bind (which Postgres rejects) and never churns.

## `@HasOne` — single related row

`@HasOne` (alias `hasOne`) is the one-to-one counterpart of `@HasMany`: the FK
lives on the RELATED table and exactly one row is expected. Options are the same
`{ localKey, foreignKey, onQuery, serializeAs }` shape as `@HasMany`.

```ts
import { BaseEntity, Entity, PrimaryKey, Column, HasOne } from '@c9up/atlas'

@Entity('users')
class User extends BaseEntity {
  @PrimaryKey() declare id: string

  @HasOne(() => Profile)
  declare profile: Profile
}

@Entity('profiles')
class Profile extends BaseEntity {
  @PrimaryKey() declare id: string
  @Column() declare userId: string
  @Column() declare bio: string
}
```

Preload and lazy-load it like any relation:

```ts
const user = await repo.query().preload('profile').first()
await user.load('profile') // lazy, after the fact
```

The `related('profile')` proxy exposes `create` / `save` (auto-setting the FK)
plus the upsert helpers `firstOrCreate` / `updateOrCreate`, scoped to the
parent's FK. `createMany` / `saveMany` are intentionally absent on a single-row
relation — calling them throws (and is typed `Promise<never>`).

```ts
await user.related('profile').create({ bio: 'Hello' })

await user.related('profile').firstOrCreate(
  { userId: user.id },      // search
  { bio: 'Default bio' },   // defaults applied only on insert
)

await user.related('profile').updateOrCreate(
  { userId: user.id },
  { bio: 'Fresh bio' },
)
```

## `@BelongsTo` assignment — `associate` / `dissociate`

On a `@BelongsTo` relation the FK lives on **this** model, so the only writes are
linking and unlinking an owner. `related(rel).associate(owner)` sets
`this.<fk> = owner.<ownerKey>` and saves this model; `dissociate()` clears the FK
and saves. `create` / `save` / `createMany` / `saveMany` are NOT valid on a
belongsTo proxy (they throw and are typed `Promise<never>`) — mirroring Adonis
Lucid, whose belongsTo client exposes only `associate` / `dissociate`.

```ts
const post = await postRepo.query().where('id', 10).first()
const author = await userRepo.query().where('id', 1).first()

await post.related('user').associate(author) // post.userId = author.id, saved
await post.related('user').dissociate()       // post.userId = null, saved
```

`associate` rejects a `null` / `undefined` owner.

## Through relations — `@HasOneThrough` / `@HasManyThrough`

Two-hop relations traverse an intermediate ("through") table to reach the related
rows. `@HasManyThrough` (alias `hasManyThrough`) returns an array; `@HasOneThrough`
(alias `hasOneThrough`) returns a single row. Both take the related target, the
through target, and a `{ firstKey, secondKey, localKey, secondLocalKey, onQuery }`
options object:

- `firstKey` — FK on the intermediate table pointing at the parent (default `${parent}_id`).
- `secondKey` — FK on the related table pointing at the intermediate (default `${intermediate}_id`).
- `localKey` — parent-side local join column (default parent PK).
- `secondLocalKey` — intermediate-side local join column matched by `secondKey` (default intermediate PK).

```ts
import { BaseEntity, Entity, PrimaryKey, Column, HasManyThrough, HasOneThrough } from '@c9up/atlas'

@Entity('countries')
class Country extends BaseEntity {
  @PrimaryKey() declare id: string

  // country → users → posts
  @HasManyThrough(() => Post, () => User)
  declare posts: Post[]

  // most-recent-style single row through the same two hops
  @HasOneThrough(() => Post, () => User)
  declare latestPost: Post
}

@Entity('users')
class User extends BaseEntity {
  @PrimaryKey() declare id: string
  @Column() declare countryId: string
}

@Entity('posts')
class Post extends BaseEntity {
  @PrimaryKey() declare id: string
  @Column() declare userId: string
}
```

Preload or lazy-load them the same way:

```ts
const countries = await repo.query().preload('posts').exec()
await country.load('latestPost')
```

> Through relations are **read-only**. Lucid does not expose persistence on a
> through relation — you write through the intermediate model instead.
> `related(rel).query()` traverses the two hops; `create` / `save` / `createMany`
> / `saveMany` throw at runtime and are typed `Promise<never>`. `@HasManyThrough`
> is Lucid parity; `@HasOneThrough` is an atlas addition (Lucid has no such
> relation) — the identical two-hop traversal returning one row instead of an array.

## `loadOnce` — idempotent lazy load

`entity.loadOnce(relationName, callback?)` is like `load()` but a no-op when the
relation is already populated on the instance (AdonisJS Lucid `loadOnce`). Useful
in shared code paths where you can't be sure whether a caller already preloaded
the relation. Chainable.

```ts
await user.loadOnce('profile')   // loads only if user.profile is undefined
await user.loadOnce('profile')   // second call does nothing
```

## `pivotQuery` — direct pivot-table access

Beyond `attach` / `detach` / `sync`, a `@ManyToMany` proxy exposes `pivotQuery()`
— a connection-level query builder on the **pivot table itself**, already scoped
to this parent (AdonisJS Lucid `pivotQuery`). Use it to read or update pivot rows
directly.

```ts
// read pivot rows for this user
const rows = await user.related('roles').pivotQuery().select('*')

// update a pivot extra directly
await user.related('roles').pivotQuery()
  .where('role_id', roleId)
  .update({ amount: '2.0' })
```

## Best practices

- Always name pivot tables explicitly for many-to-many.
- Keep FK naming consistent (`user_id`, `role_id`).
- Avoid deep eager loading in performance-sensitive endpoints.
- Prefer `loadOnce` over `load` in reusable code that may run after a preload.
- Treat through relations as read paths — persist via the intermediate model.
