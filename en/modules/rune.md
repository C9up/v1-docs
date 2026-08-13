# Rune — Validation

Rune is Ream's validation engine. Define schemas with fluent rule chains, validate input, and receive structured errors. When the Rust native module is available and only standard rules are used, validation is executed by the Rust engine via NAPI for maximum throughput. Custom rules or custom messages fall back to the TypeScript implementation transparently.

## Basic Usage

```typescript
import { rules, schema } from '@c9up/rune'

const CreateOrderSchema = schema({
  total:        rules.number().positive(),
  customerName: rules.string().min(3).max(100).trim(),
  email:        rules.string().email(),
})

const result = CreateOrderSchema.validateResult({
  total:        42.50,
  customerName: '  Alice  ',
  email:        'alice@example.com',
})

// result.valid          === true
// result.data.total     === 42.50
// result.data.customerName === 'Alice'   (trimmed)
// result.errors         === []
```

> **Which method?** `validateResult()` is synchronous and never throws — the one
> used above. `validate()` is the VineJS contract: **async**, resolves to the
> validated data, and throws `errors.E_VALIDATION_ERROR` (HTTP 422) on failure.
> `validateResultAsync()` is the async result-based form, and the only one that
> can run `unique` / `exists` — `validateResult()` throws outright on a schema
> carrying them.

## Rules

### Starting a Chain

```typescript
rules.string()   // Value must be a string
rules.number()   // Value must be a number (NaN and Infinity rejected)
rules.boolean()  // Value must be a boolean
rules.any()      // No type check — open chain for custom logic only
```

### String Rules

```typescript
rules.string()
  .min(3)       // Minimum length (inclusive)
  .max(100)     // Maximum length (inclusive)
  .email()      // Must match email pattern (no whitespace, @ required)
  .trim()       // Trim whitespace before validation (transform)
  .optional()   // Accept undefined or null
```

### Number Rules

```typescript
rules.number()
  .min(0)       // Must be >= 0
  .max(1000)    // Must be <= 1000
  .positive()   // Must be > 0 and finite
  .optional()   // Accept undefined or null
```

### Boolean Rules

```typescript
rules.boolean()
  .optional()   // Accept undefined or null
```

### Optional Fields

By default, every field is required. Mark a field optional to allow `undefined` or `null` without an error:

```typescript
const s = schema({
  name:     rules.string().min(1),
  nickname: rules.string().optional(),
})

s.validateResult({ name: 'Alice' })
// valid: true — nickname is absent but optional
```

## Custom Rules

Add a named predicate to the chain with `.custom()`:

```typescript
rules.string().custom(
  'slug',
  (v) => typeof v === 'string' && /^[a-z0-9-]+$/.test(v),
  'Must be a valid slug (lowercase letters, numbers, hyphens only)',
)
```

The three arguments are: rule name (used in the error `rule` field), predicate, and optional message.

## Custom Error Messages

Override the message of the last rule added with `.message()`:

```typescript
rules.string()
  .min(8).message('Password must be at least 8 characters')
  .max(128).message('Password must be 128 characters or fewer')
  .email().message('Enter a valid email address')
```

`.message()` applies to the **immediately preceding** rule call.

## Transforms

Transforms run before validation rules. They modify the value in place so subsequent rules see the transformed result:

```typescript
const s = schema({
  username: rules.string().trim().min(3),
})

s.validateResult({ username: '  Al  ' })
// Transforms 'Al' (trimmed), then min(3) fails
// errors: [{ field: 'username', rule: 'min', message: 'Minimum 3' }]
```

Available transforms: `.trim()`

## Validation Result

```typescript
interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  data?: Record<string, unknown>  // Present only when valid === true
}

interface ValidationError {
  field: string   // Field name in the schema
  rule: string    // Rule that failed: 'required', 'min', 'email', 'slug', ...
  message: string // Human-readable description
}
```

When `valid` is `false`, `data` is `undefined`. When `valid` is `true`, `data` contains the validated and transformed values.

## In Route Handlers

```typescript
import { rules, schema } from '@c9up/rune'

const CreateOrderSchema = schema({
  total:    rules.number().positive(),
  name:     rules.string().min(1).max(100).trim(),
  email:    rules.string().email(),
  coupon:   rules.string().optional(),
})

router.post('/orders', async (ctx) => {
  const body = JSON.parse(ctx.request!.body)
  const result = CreateOrderSchema.validateResult(body)

  if (!result.valid) {
    ctx.response!.status = 422
    ctx.response!.body = JSON.stringify({ errors: result.errors })
    return
  }

  // result.data is fully typed and transformed
  const order = await OrderService.create(result.data)

  ctx.response!.status = 201
  ctx.response!.body = JSON.stringify({ order })
})
```

## Internationalization (i18n)

Rune no longer ships an internal i18n engine.

Use Rosetta as the single i18n module across the ecosystem.

### Bridge Rosetta into Rune

```typescript
import { Rosetta } from '@c9up/rosetta'
import { bindRosetta } from '@c9up/rune'

const i18n = new Rosetta({ defaultLocale: 'fr', fallbackLocale: 'en' })
  .loadMessages('fr', { 'validation.required': '{field} est requis' })

bindRosetta(i18n)
```

```typescript
import { Rosetta } from '@c9up/rosetta'

const i18n = new Rosetta({ defaultLocale: 'en', fallbackLocale: 'en' })

i18n.loadMessages('fr', {
  'validation.required': 'Le champ :field est requis',
  'validation.min':      'Le champ :field doit avoir au moins :min caractères',
  'validation.email':    'Le champ :field doit être une adresse email valide',
})

i18n.loadMessages('es', {
  'validation.required': 'El campo :field es obligatorio',
  'validation.min':      'El campo :field debe tener al menos :min caracteres',
})
```

### Translating Messages

```typescript
i18n.setLocale('fr')

i18n.t('validation.required', { field: 'nom' })
// 'Le champ nom est requis'

i18n.t('validation.min', { field: 'mot de passe', min: '8' })
// 'Le champ mot de passe doit avoir au moins 8 caractères'
```

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
// returns the validated T, or throws RuneValidationError (E_VALIDATION_ERROR, HTTP 422)
```

`validateResultAsync` runs the sync rules first, then awaits the async rules for each
field. An async rule only runs when the field **passed its sync rules** and has a
present, non-null value — a DB lookup is skipped for an already-invalid or absent
field (Lucid parity).

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

## Next Steps

- [Atlas (ORM)](/en/modules/atlas) — Validate before saving entities
- [Warden (Auth)](/en/modules/warden) — Authenticate and authorize users
