# Atlas - Error Handling

Atlas raises a small, structured error hierarchy so callers can branch on **type**
(`instanceof`) rather than string-matching on messages. Every error carries a
stable `code` and an optional `hint`.

## The `AtlasError` base

All Atlas errors extend `AtlasError`, which itself extends the native `Error`:

```ts
import { AtlasError } from '@c9up/atlas'

class AtlasError extends Error {
  readonly code: string    // stable, always starts with `E_`
  readonly hint?: string   // optional actionable suggestion
}
```

The `code` is normalised: a code that already starts with `E_` is kept as it is
(`E_ROW_NOT_FOUND`, `E_MASS_ASSIGNMENT`), and any other gets the `E_ATLAS_`
prefix (`EMPTY_SELECT` becomes `E_ATLAS_EMPTY_SELECT`). Catch the base to handle
any Atlas failure uniformly, or a subclass to handle one kind:

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
code rather than a dedicated subclass — for example `E_EXTRA_PROPERTIES`
(filling an undeclared column), `E_MODEL_NOT_PERSISTED`, `E_MISSING_PRIMARY_KEY`,
`E_STRICT_MODE` (raw SQL refused in strict mode),
`E_ROLLBACK_DISABLED_IN_PRODUCTION` and `E_ATLAS_MIGRATION_INVALID_TABLE_NAME`.
Branch on `err.code` for those.

## `EntityNotFoundError`

Thrown when a query that must return a row finds none: the repository's
`findOrFail`, `findByOrFail`, `refresh` and `fresh`, and `firstOrFail()` /
`sole()` on the model query and on the `db.from()` builder. Its code is
`E_ROW_NOT_FOUND` and it carries `status = 404`, so an exception handler that
does not catch it answers `404` with that code.

```ts
import { EntityNotFoundError } from '@c9up/atlas'

try {
  const user = await users.findOrFail(42)
} catch (err) {
  if (err instanceof EntityNotFoundError) {
    err.code        // 'E_ROW_NOT_FOUND'
    err.status      // 404
    err.entityClass // 'User'
    err.criteria    // { id: 42 }
    return response.notFound()
  }
  throw err
}
```

| Field | Type | Description |
| --- | --- | --- |
| `status` | `404` | The HTTP status an exception handler answers with. |
| `entityClass` | `string \| undefined` | The model class name that was queried; `undefined` for a `db.from()` query. |
| `criteria` | `unknown` | The lookup criteria (e.g. `{ id: 42 }` or `{ email: 'a@b.c' }`), when the finder had any. |

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
    err.code      // 'E_MASS_ASSIGNMENT'
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

Its code is `E_RELATION_NOT_LOADED`. The `hint` points at the fix: `.preload('<relation>')` on the query, or
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

Its code is `E_OPTIMISTIC_LOCK`. The `hint` describes the recovery: reload the
entity, reapply your changes, and retry.

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
  if (err instanceof AtlasError && err.code === 'E_MASS_ASSIGNMENT') {
    return response.forbidden()
  }
  throw err
}
```
