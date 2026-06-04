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

const result = CreateOrderSchema.validate({
  total:        42.50,
  customerName: '  Alice  ',
  email:        'alice@example.com',
})

// result.valid          === true
// result.data.total     === 42.50
// result.data.customerName === 'Alice'   (trimmed)
// result.errors         === []
```

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

s.validate({ name: 'Alice' })
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

s.validate({ username: '  Al  ' })
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
  const result = CreateOrderSchema.validate(body)

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

## Next Steps

- [Atlas (ORM)](/en/modules/atlas) — Validate before saving entities
- [Warden (Auth)](/en/modules/warden) — Authenticate and authorize users
