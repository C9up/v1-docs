# Validating input

This guide covers validating request data with rune:

- Basic Usage
- In Route Handlers
- Validation Result
- The Rust engine is required
- Validating a request

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
> used above. `validate()` is the throwing contract: **async**, resolves to the
> validated data, and throws `errors.E_VALIDATION_ERROR` (HTTP 422) on failure.
> `validateResultAsync()` is the async result-based form, and the only one that
> can run `unique` / `exists` — `validateResult()` throws outright on a schema
> carrying them.

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
  const result = CreateOrderSchema.validateResult(ctx.request.body())

  if (!result.valid) {
    ctx.response.status(422).json({ errors: result.errors })
    return
  }

  // result.data is fully typed and transformed
  const order = await OrderService.create(result.data)

  ctx.response.status(201).json({ order })
})
```

`ctx.request.body()` returns the body the body parser read, so the route needs
the body-parser middleware in front of it (without it the body is `{}`).
`await ctx.request.validateUsing(CreateOrderSchema)` is the throwing form of
the same check: it returns the validated data, or throws `E_VALIDATION_ERROR`,
which the server answers with 422 and the errors.

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

## The Rust engine is required

A schema carrying nothing the engine cannot run **is run by the engine** —
`RuneNativeRequiredError` (`E_RUNE_NAPI_REQUIRED`) is thrown when the binary is
absent, rather than falling back.

There is a TypeScript validator, and it used to take over with a one-time
warning. That made a schema's verdict depend on whether a prebuilt binary
happened to load: two deployments of the same code could disagree on whether a
payload is valid, and the one that fell back lost the reason to have Rust at all.

The TypeScript path stays for what the engine genuinely cannot do — a custom
rule, a translator, a messages provider. There it is the only implementation,
not a second one free to diverge.

## Validating a request

`request.validateUsing(validator)` runs a validator over the request — body and
query merged, with `params`, `headers` and `cookies` nested under their own
keys so a form field can never rename a route parameter.

```typescript
const data = await request.validateUsing(CreateUser)
```

It throws `E_VALIDATION_ERROR` on failure; `tryValidateUsing` answers
`[error, null]` / `[null, data]` instead, for a handler that re-renders the
form itself.

Two hooks make a validator request-aware without the schema knowing anything
about it. A package installs them once, at boot:

```typescript
import { RequestValidator } from '@c9up/ream'

RequestValidator.messagesProvider = (ctx) => ctx.i18n.createMessagesProvider()
RequestValidator.errorReporter = (ctx) => ctx.myReporter
```

An option passed at the call site outranks either hook, and nothing else in the
framework reads them — a validator called directly keeps whatever it was built
with.

## Next Steps
- [Atlas (ORM)](/en/guides/database/orm/) — Validate before saving entities
- [Warden (Auth)](/en/guides/auth/introduction) — Authenticate and authorize users
