# Atlas - Lifecycle Hooks

Atlas fires **model lifecycle hooks** at each point of the CRUD pipeline, mirroring
AdonisJS Lucid's hook surface. Decorate a **static** method on your entity and
Atlas invokes it at the matching moment — before/after a save, create, update,
delete, find, fetch or paginate.

```ts
import { BaseEntity, beforeSave } from '@c9up/atlas'
import { hash } from 'node:crypto' // or your hashing helper

class User extends BaseEntity {
  declare password: string

  @beforeSave()
  static async hashPassword(user: User) {
    if (user.isDirty('password')) {
      user.password = await hash(user.password)
    }
  }
}
```

Because the hook runs before every persist and only rehashes when `password` is
dirty, the same handler covers both the initial INSERT and later password
changes without ever double-hashing.

## The decorators

Each decorator registers the static method it wraps as a handler for one hook
kind. All fourteen are exported from `@c9up/atlas`:

| Decorator | Fires | Handler receives |
| --- | --- | --- |
| `@beforeSave()` / `@afterSave()` | around every INSERT **and** UPDATE | the entity |
| `@beforeCreate()` / `@afterCreate()` | around an INSERT only | the entity |
| `@beforeUpdate()` / `@afterUpdate()` | around an UPDATE only | the entity |
| `@beforeDelete()` / `@afterDelete()` | around a delete | the entity |
| `@beforeFind()` / `@afterFind()` | around a single-row read (`first()`) | the query, then the entity or `null` |
| `@beforeFetch()` / `@afterFetch()` | around a multi-row read | the query, then the entity array |
| `@beforePaginate()` / `@afterPaginate()` | around a paginated read | the `[countQuery, query]` tuple, then the paginator |

The decorator **must** wrap a `static` method — decorating an instance method
throws at class-definition time.

## Handler signatures

The argument is fixed per hook kind (never invent one):

- **Persistence** hooks (`save`/`create`/`update`/`delete`) receive the
  `BaseEntity` instance being written. Mutate it in place — a `beforeSave` hook
  can normalise or hash fields and the mutation is what gets persisted.
- **`beforeFind`** and **`beforeFetch`** receive the live `ModelQuery`, so you
  can add scopes/constraints before it runs.
- **`afterFind`** receives the hydrated entity **or `null`** (no match);
  **`afterFetch`** receives the hydrated `BaseEntity[]`.
- **`beforePaginate`** receives the `[countQuery, query]` tuple — mutate **both**
  to keep the count and the result page in sync. **`afterPaginate`** receives the
  `Paginator`.

A handler returns `void` or a `Promise<void>`. Handlers are **awaited
sequentially**, so a hook can finish mutating the entity before the next hook (or
the DB write) observes it. If any hook throws, the whole operation aborts and the
error propagates to the caller.

## Ordering

The **specific** hook runs before the **general** `beforeSave`, and the general
`afterSave` runs after the specific after-hook (Lucid order):

```
create()  →  beforeCreate → beforeSave → INSERT → afterCreate → afterSave
update()  →  beforeUpdate → beforeSave → UPDATE → afterUpdate → afterSave
delete()  →  beforeDelete → DELETE → afterDelete
first()   →  beforeFind  → SELECT → afterFind
fetch     →  beforeFetch → SELECT → afterFetch
```

`save()` picks the create or update branch depending on whether the row already
exists, then always fires the general `beforeSave` / `afterSave` around it.

Pagination composes the fetch hooks: `beforePaginate` fires first (with the tuple),
then `beforeFetch` on the data query; after the page is built, `afterPaginate`
fires with the paginator, then `afterFetch` with the items.

### Inheritance

Hooks are inherited through the prototype chain: a hook declared on a base entity
also fires for its subclasses. When both a parent and a child register handlers
for the same kind, **parent hooks fire first** — so a base entity can set up
scoping or defaults that the child then refines.

## Muting hooks: the `Quietly` variants

Every mutating repository method has a `…Quietly` twin that performs the identical
write **without firing any hook** (AdonisJS Lucid parity). Reach for these in
seeders, back-fills or migrations where the side effects would be wrong or
redundant:

```ts
await repo.createQuietly({ email, password })   // no beforeCreate/beforeSave/after*
await repo.saveQuietly(user)                     // no before/after save|create|update
await repo.createManyQuietly(rows)               // no per-row hooks
await repo.deleteQuietly(user)                    // no beforeDelete/afterDelete
```

The `Quietly` methods are the **only** way to skip hooks — a normal `create()`,
`save()`, `createMany()` or `delete()` always fires the full set.

> Keep hooks idempotent where you can. On `save()`'s concurrent create/update
> race, a race-loser can fire `beforeCreate` before falling back to the UPDATE
> path — so put non-repeatable side effects behind an `isDirty(...)` check (as in
> the password example) or move them into `afterCreate`/`afterUpdate`.
