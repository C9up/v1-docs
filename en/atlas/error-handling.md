# Atlas - Error Handling

Atlas raises a small, structured error hierarchy so callers can branch on **type**
(`instanceof`) rather than string-matching on messages. Every error carries a
stable `code` and an optional `hint`.

## The `AtlasError` base

All Atlas errors extend `AtlasError`, which itself extends the native `Error`:

```ts
import { AtlasError } from '@c9up/atlas'

class AtlasError extends Error {
  readonly code: string    // stable, prefixed with `ATLAS_`
  readonly hint?: string   // optional actionable suggestion
}
```

The `code` is normalised: a code passed as `E_ENTITY_NOT_FOUND` is stored as
`ATLAS_E_ENTITY_NOT_FOUND` (the `ATLAS_` prefix is added if absent). Catch the
base to handle any Atlas failure uniformly, or a subclass to handle one kind:

```ts
try {
  await users.findOrFail(id)
} catch (err) {
  if (err instanceof AtlasError) {
    console.error(err.code, err.message, err.hint)
  }
  throw err
}
```

Many operational failures are raised as a plain `AtlasError` with a specific
code rather than a dedicated subclass — for example `ATLAS_E_EXTRA_PROPERTIES`
(filling an undeclared column), `ATLAS_E_MODEL_NOT_PERSISTED`, and
`ATLAS_E_MISSING_PRIMARY_KEY`. Branch on `err.code` for those.

## `EntityNotFoundError`

Thrown by the repository's fail-fast finders when no row matches:
`findOrFail` and `findByOrFail`.

```ts
import { EntityNotFoundError } from '@c9up/atlas'

try {
  const user = await users.findOrFail(42)
} catch (err) {
  if (err instanceof EntityNotFoundError) {
    err.code        // 'ATLAS_E_ENTITY_NOT_FOUND'
    err.entityClass // 'User'
    err.criteria    // { id: 42 }
    return response.notFound()
  }
  throw err
}
```

| Field | Type | Description |
| --- | --- | --- |
| `entityClass` | `string` | The model class name that was queried. |
| `criteria` | `unknown` | The lookup criteria (e.g. `{ id: 42 }` or `{ email: 'a@b.c' }`). |

The non-`OrFail` variants (`find`, `findBy`, `first`) return `null` instead of
throwing — reach for them when a missing row is an expected outcome.

## `MassAssignmentError`

Thrown when `fill()` / `merge()` (and the repository paths that go through them —
`create`, `createMany`, `updateOrCreate`) try to set a field that is **not** in
the model's `static fillable` allowlist, or that **is** in its `static guarded`
denylist. This is the guard that stops a plain request payload from writing a
sensitive column such as `role` or `isAdmin`.

```ts
import { MassAssignmentError } from '@c9up/atlas'

class User extends BaseEntity {
  static guarded = ['role']
}

try {
  user.merge({ role: 'admin' }) // blocked
} catch (err) {
  if (err instanceof MassAssignmentError) {
    err.code      // 'ATLAS_E_MASS_ASSIGNMENT'
    err.entityClass // 'User'
    err.attribute // 'role'
  }
  throw err
}
```

| Field | Type | Description |
| --- | --- | --- |
| `entityClass` | `string` | The model class name. |
| `attribute` | `string` | The blocked attribute name. |

Declare **either** `fillable` (allowlist) **or** `guarded` (denylist), never both
— declaring both throws at fill time. With neither declared, every declared
column is mass-assignable.

## `RelationNotLoadedError`

Signals accessing a relation that was neither eager-loaded nor is available via a
lazy loader, forcing callers to be explicit about loading.

```ts
import { RelationNotLoadedError } from '@c9up/atlas'
```

| Field | Type | Description |
| --- | --- | --- |
| `entityClass` | `string` | The model class name. |
| `relationName` | `string` | The relation that was accessed. |

The `hint` points at the fix: `.preload('<relation>')` on the query, or
`.load('<relation>')` on the instance.

> Status: the error class is exported and stable, but the current runtime does
> not throw it on relation access — treat it as a reserved contract to catch
> against, not a code path you can trigger today.

## `OptimisticLockError`

Represents an optimistic-lock conflict on save: the row was modified by another
transaction since it was read.

```ts
import { OptimisticLockError } from '@c9up/atlas'
```

| Field | Type | Description |
| --- | --- | --- |
| `entityClass` | `string` | The model class name. |
| `primaryKey` | `unknown` | The primary key of the conflicting row. |
| `expectedVersion` | `number` | The version the save expected to overwrite. |

The `hint` describes the recovery: reload the entity, reapply your changes, and
retry.

> Status: this is the error class only. Atlas does **not** yet ship a version-column
> mechanism (there is no `@Version()` decorator, and nothing in the ORM raises this
> error today). The class is exported so the contract is stable ahead of the
> feature — do not rely on optimistic locking being enforced yet.

## Catching by code vs. type

Prefer `instanceof` for the four typed subclasses — it survives message changes
and gives you the typed fields. Fall back to `err.code` for the many plain
`AtlasError` codes that don't have a dedicated class:

```ts
import { AtlasError, EntityNotFoundError } from '@c9up/atlas'

try {
  await users.create(payload)
} catch (err) {
  if (err instanceof EntityNotFoundError) return response.notFound()
  if (err instanceof AtlasError && err.code === 'ATLAS_E_MASS_ASSIGNMENT') {
    return response.forbidden()
  }
  throw err
}
```
