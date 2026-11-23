# Async validation

This guide covers rules that wait on I/O:

- `validateResultAsync` / `validateOrThrowAsync`
- DB-backed rules: `unique` / `exists`
- Custom async rules: `createAsyncRule` / `useAsync`

## Async validation

Some rules can't answer synchronously — a uniqueness check or a foreign-key
existence check has to hit the database. Rune keeps these off the sync path and
runs them through the async validators.

### `validateResultAsync` / `validateOrThrowAsync`

A schema that carries any async rule (`unique`, `exists`, or a `useAsync` rule)
**must** be run asynchronously:

```ts
const result = await UserSchema.validateResultAsync(body)
// result: ValidationResult<T> — same shape as validateResult(), never throws

const data = await UserSchema.validateOrThrowAsync(body)
// returns the validated T, or throws errors.E_VALIDATION_ERROR (HTTP 422)
```

`validateResultAsync` runs the sync rules first, then awaits the async rules for each
field. An async rule only runs when the field **passed its sync rules** and has a
present, non-null value — a DB lookup is skipped for an already-invalid or absent
field.

> The synchronous `validateResult()` **throws** on a schema that has async
> rules rather than silently skipping them:
> `rune: this schema has async rules (unique/exists/useAsync) — call validateResultAsync() (result-based) or validate() (throwing) instead of validateResult().`
> The same applies to `validateOrThrow()`, which calls `validateResult()` internally.

### DB-backed rules: `unique` / `exists`

Rune stays framework-agnostic — the rule holds your `check` callback and does the
query itself (e.g. against Atlas). Both take an optional custom message.

- `.unique(check, message?)` — `check(value, field)` resolves `true` when the
  value is **unique** (valid). On failure it reports rule `database.unique`,
  default message `The <field> has already been taken`.
- `.exists(check, message?)` — `check(value, field)` resolves `true` when a
  matching row **exists** (valid). On failure it reports rule `database.exists`,
  default message `The selected <field> is invalid`.

```ts
import { rules, schema } from '@c9up/rune'
import db from '@c9up/atlas'

const RegisterSchema = schema({
  email: rules.string().email().unique(async (value) => {
    const row = await db.from('users').where('email', value).first()
    return !row // unique when no row matches
  }, 'This email is already registered'),

  countryId: rules.number().exists(async (value) => {
    const row = await db.from('countries').where('id', value).first()
    return Boolean(row) // valid when the country exists
  }),
})

const result = await RegisterSchema.validateResultAsync({
  email: 'alice@example.com',
  countryId: 42,
})

if (!result.valid) {
  // e.g. [{ field: 'email', rule: 'database.unique', message: 'This email is already registered' }]
}
```

### Custom async rules: `createAsyncRule` / `useAsync`

For reusable async rules, build one with `createAsyncRule` (the async counterpart
of `createRule`) and attach it with `.useAsync()`. The validator receives the
`FieldContext` and reports failures via `field.report(message, rule)`:

A validator declared `async` is detected on its own. When it is **not** declared
`async` but still returns a Promise, say so — either spelling works:

```ts
const unique = createRule(
  (value, table, field) => db.exists(table, value).then((taken) => {
    if (taken) field.report('already taken', 'unique')
  }),
  { async: true },   // `{ isAsync: true }` is the same thing
)
```

Without it the rule is built synchronous, and its verdict would land after
validation ended. rune refuses that outright rather than report a pass nobody
waited for: `E_RUNE_ASYNC_RULE_NOT_AWAITED`.

```ts
import { createAsyncRule, rules, schema } from '@c9up/rune'

const availableHandle = createAsyncRule<string>(async (value, table, field) => {
  const taken = await db.from(table).where('handle', value).first()
  if (taken) {
    field.report(`The ${field.field} is not available`, 'handle.taken')
  }
})

const ProfileSchema = schema({
  handle: rules.string().minLength(3).useAsync(availableHandle('profiles')),
})

const data = await ProfileSchema.validateOrThrowAsync({ handle: 'alice' })
```

`useAsync()` throws at build time if handed anything but a compiled async rule
(call the factory first: `useAsync(rule())`, not `useAsync(rule)`).
