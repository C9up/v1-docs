# Error handling

This guide covers atlas errors:

- The `errors` namespace
- `E_ROW_NOT_FOUND`
- `E_MASS_ASSIGNMENT`
- `E_RELATION_NOT_LOADED`
- `E_OPTIMISTIC_LOCK`
- Errors from the Rust compiler and driver
- Catching by code vs. class

Every atlas error has a stable `code`, so a caller branches on the code or on
the class rather than string-matching on messages.

## The `errors` namespace

Atlas declares one error class per code, named exactly like the code, and
exports them together as `errors`:

```ts
import { errors } from '@c9up/atlas'

try {
  await users.findOrFail(id)
} catch (err) {
  if (err instanceof errors.E_ROW_NOT_FOUND) {
    return response.notFound()
  }
  throw err
}
```

Each class is a `@c9up/flare` `Exception`, so every atlas error carries:

| Field | Type | Description |
| --- | --- | --- |
| `code` | `string` | The stable code, e.g. `E_ATLAS_EMPTY_SELECT` or `E_ROW_NOT_FOUND`. |
| `status` | `number` | The HTTP status an exception handler answers with: 404 for `E_ROW_NOT_FOUND`, 500 for every other code. |
| `help` | `string \| undefined` | When set, an actionable suggestion to fix the cause. |
| `cause` | `unknown` | The underlying error, when atlas wraps one (a column adapter that threw, a driver that failed to load, a native refusal). |

Most codes have no field of their own: for those, the code and the message say
everything — for example `E_EXTRA_PROPERTIES` (filling an undeclared column),
`E_MODEL_NOT_PERSISTED`, `E_MISSING_PRIMARY_KEY`, `E_STRICT_MODE` (raw SQL
refused in strict mode), `E_ROLLBACK_DISABLED_IN_PRODUCTION` and
`E_ATLAS_MIGRATION_INVALID_TABLE_NAME`. The four classes below also carry data.
The [error reference](/en/reference/errors#atlas-errors) lists every code.

## `E_ROW_NOT_FOUND`

Thrown when a query that must return a row finds none: the repository's
`findOrFail`, `findByOrFail`, `refresh` and `fresh`, and `firstOrFail()` /
`sole()` on the model query and on the `db.from()` builder. Its status is
`404`, so an exception handler that does not catch it answers `404` with that
code. Its message is always `Row not found`: what was searched for stays on
`criteria`, out of the message the client receives.

```ts
import { errors } from '@c9up/atlas'

try {
  const user = await users.findOrFail(42)
} catch (err) {
  if (err instanceof errors.E_ROW_NOT_FOUND) {
    err.code        // 'E_ROW_NOT_FOUND'
    err.status      // 404
    err.model       // the User class
    err.criteria    // { id: 42 }
    return response.notFound()
  }
  throw err
}
```

| Field | Type | Description |
| --- | --- | --- |
| `status` | `404` | The HTTP status an exception handler answers with. |
| `model` | model class \| `undefined` | The model class that was queried; `undefined` for a `db.from()` query. |
| `criteria` | `unknown` | The lookup criteria (e.g. `{ id: 42 }` or `{ email: 'a@b.c' }`), when the finder had any. |

The non-`OrFail` variants (`find`, `findBy`, `first`) return `null` instead of
throwing — reach for them when a missing row is an expected outcome.

## `E_MASS_ASSIGNMENT`

Thrown when `fill()` / `merge()` (and the repository paths that go through them —
`create`, `createMany`, `updateOrCreate`) try to set a field that is **not** in
the model's `static fillable` allowlist, or that **is** in its `static guarded`
denylist. This is the guard that stops a plain request payload from writing a
sensitive column such as `role` or `isAdmin`.

```ts
import { errors } from '@c9up/atlas'

class User extends BaseEntity {
  static guarded = ['role']
}

try {
  user.merge({ role: 'admin' }) // blocked
} catch (err) {
  if (err instanceof errors.E_MASS_ASSIGNMENT) {
    err.code        // 'E_MASS_ASSIGNMENT'
    err.entityClass // 'User'
    err.attribute   // 'role'
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

## `E_RELATION_NOT_LOADED`

Signals accessing a relation that was neither eager-loaded nor is available via a
lazy loader, forcing callers to be explicit about loading.

| Field | Type | Description |
| --- | --- | --- |
| `entityClass` | `string` | The model class name. |
| `relationName` | `string` | The relation that was accessed. |

Its `help` points at the fix: `.preload('<relation>')` on the query, or
`.load('<relation>')` on the instance.

> Status: the error class is exported and stable, but the current runtime does
> not throw it on relation access — treat it as a reserved contract to catch
> against, not a code path you can trigger today.

## `E_OPTIMISTIC_LOCK`

Represents an optimistic-lock conflict on save: the row was modified by another
transaction since it was read.

| Field | Type | Description |
| --- | --- | --- |
| `entityClass` | `string` | The model class name. |
| `primaryKey` | `unknown` | The primary key of the conflicting row. |
| `expectedVersion` | `number` | The version the save expected to overwrite. |

Its `help` describes the recovery: reload the entity, reapply your changes, and
retry.

> Status: this is the error class only. Atlas does **not** yet ship a version-column
> mechanism (there is no `@Version()` decorator, and nothing in the ORM raises this
> error today). The class is exported so the contract is stable ahead of the
> feature — do not rely on optimistic locking being enforced yet.

## Errors from the Rust compiler and driver

The query compiler and the database driver are written in Rust, and refuse
some statements and connections themselves: an unsafe identifier
(`E_UNSAFE_IDENTIFIER`), an expression outside the allowed shape
(`E_UNSAFE_EXPRESSION`), a feature the dialect lacks (`E_UNSUPPORTED`), a
PostgreSQL `sslmode` that falls back to plaintext (`E_ATLAS_INSECURE_SSLMODE`)…
Atlas rethrows each as the class of its code, with the native error as
`cause`, so they are caught like any other atlas error:

```ts
try {
  await User.query().select(userInput)
} catch (err) {
  if (err instanceof errors.E_UNSAFE_EXPRESSION) return response.badRequest()
  throw err
}
```

## Catching by code vs. class

`instanceof errors.E_…` and `err.code` are equivalent; the class also types the
fields of the four classes that carry data:

```ts
import { errors } from '@c9up/atlas'

try {
  await users.create(payload)
} catch (err) {
  if (err instanceof errors.E_ROW_NOT_FOUND) return response.notFound()
  if (err instanceof errors.E_MASS_ASSIGNMENT) return response.forbidden()
  throw err
}
```
