# Active record

This guide covers BaseModel, the active-record style:

- Model state
- Mass-assignment protection
- `fill()` / `merge()` and `$extras`
- Serializing `$extras`
- Serialization visibility
- Self-assigned primary keys
- Serializing a subset
- Many-to-many pivot keys

## BaseModel — Active Record

Extend `BaseModel` (instead of `BaseEntity`) for the Active Record API: static finders/creators and `instance.save()` / `instance.delete()` that delegate to a per-connection repository. `@Entity('table')` is **optional** — the table name is inferred from the class name (`User` → `users`); override with `static table`.

```typescript
import { BaseModel, Column, PrimaryKey } from '@c9up/atlas'

class User extends BaseModel {
  @PrimaryKey() declare id: number
  @Column() declare email: string
  @Column() declare role: string

  static table = 'app_users'      // optional — inferred otherwise
  static connection = 'analytics' // optional named connection
}

// Static finders
const user  = await User.find(1)
const admin = await User.findBy({ role: 'admin' })   // object clause
const users = await User.findManyBy({ role: 'user' })
const first = await User.first()
const rows  = await User.query().where('role', 'admin').exec()

// Static creators
const u = await User.create({ email: 'a@b.co', role: 'user' })
await User.updateOrCreate({ email: 'a@b.co' }, { role: 'admin' })
await User.updateOrCreateMany('email', batch)   // bulk, keyed, transactional

// Instance persistence
if (user) {
  user.email = 'new@b.co'
  await user.save()    // UPDATE the dirty columns (INSERT if new)
  await user.delete()  // DELETE the row; sets $isDeleted
}
```

### Model state

```typescript
user.$isPersisted     // true once the row is in the DB (after save/fetch)
user.$isNew           // never persisted
user.$isLocal         // created in memory (vs fetched from the DB)
user.$isDeleted       // set after delete()
user.$primaryKeyValue // the PK column's value
user.isDirty('email')
```

### Mass-assignment protection

`static fillable` / `static guarded` are enforced on `create`, `createMany` and `updateOrCreate` — not only on `fill()` — so a `guarded` column can't be set from a plain payload:

```typescript
class User extends BaseModel {
  static guarded = ['role'] // never mass-assignable
}
await User.create({ email: 'a@b.co', role: 'admin' }) // throws E_MASS_ASSIGNMENT
```

The gate runs on the key as given **and** on the property it resolves to, so a
column name cannot walk past a guard written against the attribute:

```typescript
await User.create({ role: 'admin' })   // E_MASS_ASSIGNMENT
await User.create({ is_admin: true })  // E_MASS_ASSIGNMENT — resolves to isAdmin
```

### `fill()` / `merge()` and `$extras`

A payload key is resolved in this order: a declared property, then the DB
column name it maps to, then a relation (ignored — set those through their own
API), then framework state (ignored). Anything left is an extra:

```typescript
// The DB column name resolves to its property — a payload straight off an API
// or a raw row keys by `created_at`.
user.merge({ created_at: '2026-01-01' })   // sets user.createdAt

// An unknown key throws by default…
user.merge({ comments_count: 3 })          // E_EXTRA_PROPERTIES

// …and is KEPT in $extras when you allow it, rather than dropped.
user.merge({ comments_count: 3 }, true)
user.$extras.comments_count                // 3
```

`$extras` is never a column, so it can never reach an INSERT. `create()` takes
the same `{ allowExtraProperties: true }` and behaves the same way.

### Serializing `$extras`

Opt in per model. `true` nests the bag under `meta` — spread at
the top level, an aggregate could collide with a real column of the same name:

```typescript
class User extends BaseModel {
  serializeExtras = true
}

user.toJSON()   // { id: 1, email: 'a@b.co', meta: { posts_count: 5 } }
```

A function chooses the shape instead, and receives the bag:

```typescript
class User extends BaseModel {
  static serializeExtras = (extras: Record<string, unknown>) => ({
    total: extras.posts_count,
  })
}
```

`serializeExtras` can also be set on the instance; both forms work and the
instance wins.

### Serialization visibility

Hide a column permanently at its declaration, and trim one response at the call
site:

```typescript
class User extends BaseModel {
  @column({ serializeAs: null }) declare password: string // never serialized
}

user.serialize({ fields: { omit: ['email'] } })      // trim this response
user.serialize({ fields: ['id', 'email'] })          // or keep only these
user.serialize({                                     // relations too
  fields: ['id'],
  relations: { posts: { fields: ['id', 'title'] } },
})
```

`toJSON()` delegates to three overridable hooks — override just the layer you
need (`serializeAttributes` / `serializeRelations` / `serializeComputed`):

```typescript
class Account extends BaseModel {
  @Column() declare balance: number
  // Customize only the attribute layer; relations/computed keep default behavior.
  protected override serializeAttributes() {
    return { ...super.serializeAttributes(), balance: Math.round(this.balance) }
  }
}
```

The full static surface: `find`, `findOrFail`, `findBy`, `findByOrFail`, `findMany`, `findManyBy`, `all`, `first`, `firstOrFail`, `query`, `create`, `createMany`, `firstOrCreate`, `firstOrNew`, `updateOrCreate`, `updateOrCreateMany`, `fetchOrCreateMany`, `fetchOrNewUpMany`, `truncate`, plus the hook-muting `createQuietly` / `createManyQuietly`.

Instances add `saveQuietly()` / `deleteQuietly()` — persist/remove without firing lifecycle hooks (handy for seeders/backfills). `save()` throws once the instance is deleted (`$isDeleted`), and `$isDirty` reports unsaved changes.

### Self-assigned primary keys

Set `selfAssignPrimaryKey` when the app produces the id — a UUID from a
`beforeCreate` hook, an id chosen by the caller — so the insert does not ask the
database for one back.

```ts
class Invoice extends BaseModel {
  static selfAssignPrimaryKey = true
  @PrimaryKey() declare id: string
}
```

Without it, the value the database returns overwrites the id the app just chose,
and every reference already handed out points at the wrong row.

### Serializing a subset

`serialize()` trims the parent **and** its relations in one pass. Doing it
afterwards means the excluded columns were already serialized — including the
ones deliberately left out.

```ts
post.serialize({ fields: ['id', 'title'] })
post.serialize({ fields: { omit: ['password'] } })
post.serialize({
  fields: ['id', 'title'],
  relations: { author: { fields: ['id', 'name'] } },
})
```

`pick` wins over `omit` when both are given — the narrower statement of intent.

`fields` trims the columns and computed values. Each relation is serialized by
its own model with the options given under `relations`, so a column that model
hides with `serializeAs: null` cannot be picked back by name, and omitting a
field never exposes one.

### Many-to-many pivot keys

Both spellings are accepted; each row names the same key:

| Short | Long |
|---|---|
| `foreignKey` | `pivotForeignKey` |
| `otherKey` | `pivotRelatedForeignKey` |
