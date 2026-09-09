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
> used above. `validate()` is the throwing contract: **async**, resolves to the
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
  .uuid()       // Any UUID version — .uuid({ version: 4 }) pins one
  .url()        // Must parse as a URL
  .regex(/…/)   // Must match the pattern
  .in(['a'])    // Must be one of these
  .trim()       // Trim whitespace before validation (transform)
  .optional()   // Accept undefined or null
```

`uuid()` takes a version, or a list of them: `uuid({ version: [4, 7] })`.
Without one, any version passes.

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

## Formats tied to a country or a locale

Four rules validate a value against a per-country or per-locale table: postal
codes (71 countries), mobile numbering plans (169 locales), passport numbers
(61 countries) and VAT numbers (69 countries).

```typescript
schema({
  zip:      rules.string().postalCode({ countryCode: 'CH' }),
  phone:    rules.string().mobile({ locale: ['fr-CH', 'de-CH'] }),
  passport: rules.string().passport({ countryCode: ['CH', 'FR'] }),
  vat:      rules.string().vat({ countryCode: 'CH' }),
})
```

Each option also accepts a callback receiving the field, so a list that depends
on the request — the countries this tenant trades with — is computed per
validation instead of frozen at import.

**A country or locale rune has no table for is a thrown error, not a pass.** A
value that reports "valid" because nothing checked it is the failure this
package exists to prevent, so the rule refuses to be built at all:

```typescript
rules.string().postalCode({ countryCode: 'ZZ' })
// RuneError: postalCode(): no pattern for country 'ZZ'.
```

`mobile()` with no `locale` accepts a number matching **any** known plan, or a
well-formed E.164 number for a country no plan covers. `mobile({ strictMode:
true })` additionally demands the leading `+` and country prefix.

`vat()` checks the FORMAT of every country in the table, and additionally runs
the check digits for the countries that define short, well-defined ones —
Belgium, Germany, the Netherlands, Italy, Portugal, Luxembourg, Switzerland and
Australia. A well-shaped but impossible number is refused.

## Normalising a value

Two transforms rewrite a value to the form its recipient actually uses, so two
spellings of the same address compare equal.

### `normalizeEmail()`

Provider rules are **on by default** — normalising is what you asked for, and an
option is how you turn one off.

```typescript
rules.string().email().normalizeEmail()
// 'A.D.A+news@GMail.com'  ->  'ada@gmail.com'
// 'A.B@googlemail.com'    ->  'ab@gmail.com'
// 'Ada-Lovelace-news@yahoo.com' -> 'ada-lovelace@yahoo.com'

rules.string().email().normalizeEmail({ gmail_remove_dots: false })
// 'a.d.a+news@gmail.com'  ->  'a.d.a@gmail.com'
```

Gmail, Outlook.com, Yahoo, Yandex and iCloud each have their own rules —
`all_lowercase`, `gmail_lowercase`, `gmail_remove_dots`,
`gmail_remove_subaddress`, `gmail_convert_googlemaildotcom`,
`outlookdotcom_lowercase`, `outlookdotcom_remove_subaddress`, `yahoo_lowercase`,
`yahoo_remove_subaddress`, `yandex_lowercase`, `yandex_convert_yandexru`,
`icloud_lowercase`, `icloud_remove_subaddress`. A doubled dot is kept: Gmail
treats `a..b` as a different mailbox.

### `normalizeUrl()`

Defaults strip `www.`, drop `utm_*` parameters, sort the query, collapse
repeated slashes and remove the trailing slash.

```typescript
rules.string().url().normalizeUrl()
// 'www.acme.test/?utm_source=x&b=2&a=1'  ->  'http://acme.test/?a=1&b=2'

rules.string().url().normalizeUrl({ stripWWW: false, sortQueryParameters: false })
```

`defaultProtocol`, `normalizeProtocol`, `forceHttp`, `forceHttps`,
`stripAuthentication`, `stripHash`, `stripTextFragment`, `stripWWW`,
`stripProtocol`, `removeQueryParameters`, `keepQueryParameters`,
`removeTrailingSlash`, `removeSingleSlash`, `removeDirectoryIndex`,
`removeExplicitPort`, `sortQueryParameters`, `removePath`, `transformPath`,
`emptyQueryValue` and `customProtocols` are all accepted. A URL that cannot be
parsed is handed back untouched, so `url()` reports it instead of the transform
throwing.

## JSON Schema

A compiled validator describes the shape it accepts:

```typescript
const users = create({
  name: rules.string().minLength(2),
  tags: rules.array(rules.string()).notEmpty(),
})

users.toJSONSchema()
// {
//   type: 'object',
//   properties: {
//     name: { type: 'string', minLength: 2 },
//     tags: { type: 'array', minItems: 1, items: { type: 'string' } },
//   },
//   required: ['name', 'tags'],
//   additionalProperties: false,
// }
```

`additionalProperties: false` is not decoration: the validator drops undeclared
keys unless the shape calls `allowUnknownProperties()`, and the schema has to
say so or a form generated from it would offer fields that get discarded.

The same schema is reachable through the Standard Schema contract as
`validator['~standard'].jsonSchema.input()`. **`output()` refuses**: `parse()`
and `transform()` take arbitrary callbacks, so a schema claiming to describe the
result would be a guess dressed as an answer.

`input()` takes the Standard JSON Schema `target`. rune emits **`draft-2020-12`**
— that is what you get when you omit it — and refuses any other dialect rather
than hand back a shape the caller will read under different rules:

```ts
validator['~standard'].jsonSchema.input({ target: 'draft-2020-12' })  // fine
validator['~standard'].jsonSchema.input({ target: 'openapi-3.0' })    // throws
// E_RUNE_UNSUPPORTED_JSON_SCHEMA_TARGET
```

The refusal is deliberate: `openapi-3.0` spells nullability `nullable: true`
rather than a `type` array, and tuples use `prefixItems`, which is
`draft-2020-12` only. A silent best-effort would produce a document that
validates differently from the validator it claims to describe.

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

### Where a messages provider is read from

A provider supplies messages for whole classes of rule at once, instead of
one `.message()` at a time. rune reads three scopes, narrowest first:

```ts
import rune, { SimpleMessagesProvider, schema, rules } from '@c9up/rune'

rune.messagesProvider = new SimpleMessagesProvider({ required: '{{ field }} is missing' })

const CreateUser = schema({ name: rules.string() })
CreateUser.messagesProvider = new SimpleMessagesProvider({
  required: '{{ field }} is required',
})

CreateUser.validateResult({})
// -> 'name is required'          (the validator's own provider)

CreateUser.validateResult({}, {
  messagesProvider: new SimpleMessagesProvider({ required: 'we need a {{ field }}' }),
})
// -> 'we need a name'            (the per-call provider wins)
```

Set `validator.messagesProvider = null` to fall back to the process-wide one.
The same three scopes apply to `errorReporter`.

### The default messages, and the key each rule answers to

Every default message lives in one catalogue, keyed by the name the rule
reports. That name is also the key a provider looks up, so reading the
catalogue tells you exactly what to write against:

```ts
import { messages } from '@c9up/rune/defaults'

messages.minLength
// -> 'The {{ field }} field must have at least {{ min }} characters'
messages['array.minLength']
// -> 'The {{ field }} field must have at least {{ min }} items'
```

A rule shared between types is prefixed by the type that owns it —
`array.minLength`, `record.maxLength`, `date.after`, `nativeFile.minSize` —
because a list is measured in items and a string in characters:

```ts
const Signup = schema({
  tags: rules.array(rules.string()).minLength(2),
  password: rules.string(),
  passwordConfirmation: rules.string().sameAs('password'),
})

Signup.validateResult({ tags: ['a'], password: 'x', passwordConfirmation: 'x' }).errors[0]
// { field: 'tags',
//   rule: 'array.minLength',
//   message: 'The tags field must have at least 2 items',
//   meta: { min: 2 } }
```

`{{ field }}` renders the failing field's LAST path segment, so a nested
`a.b` reads "The b field ..."; every other token comes from the rule's own
`meta`. A provider reaches **every** rule — the cross-field ones and any rule
you wrote yourself included:

```ts
Signup.messagesProvider = new SimpleMessagesProvider({
  'array.minLength': 'Pick at least {{ min }} tags',
  sameAs: '{{ field }} must repeat {{ otherField }}',
})
// -> 'Pick at least 2 tags'
// -> 'passwordConfirmation must repeat password'
```

An explicit `.message()` still wins over any provider.

## Transforms

Transforms run before validation rules. They modify the value in place so subsequent rules see the transformed result:

```typescript
const s = schema({
  username: rules.string().trim().min(3),
})

s.validateResult({ username: '  Al  ' })
// Transforms 'Al' (trimmed), then min(3) fails
// errors: [{ field: 'username', rule: 'min',
//            message: 'The username field must be at least 3', meta: { min: 3 } }]
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

## Keys the shape does not declare

An undeclared key is **dropped**, and the payload is valid:

```ts
schema({ user: rules.object({ email: rules.string().email() }) })
  .validateResult({ user: { email: 'a@b.co', extra: 1 } })
// valid, data.user === { email: 'a@b.co' }
```

That is what makes a validated payload safe to hand straight to a mass
assignment, and it is what the ecosystem this follows does.

Two opt-ins change it:

| | |
| --- | --- |
| `.allowUnknownProperties()` | keep the key in the output |
| `.denyUnknownProperties()` | fail the payload, naming the key |

`denyUnknownProperties()` is for an API whose contract is that it refuses what
it does not understand. A client sending `emial` is told so, instead of being
silently ignored and left wondering why the address never changed:

```
unknown field `emial`, expected one of email, password
```

Every undeclared key is reported, not just the first, and the declared keys are
still validated alongside.

## Helpers a custom rule can reuse

`rune.helpers` carries the predicates the chain rules use — the boolean
coercions, the format checks, the country lists. A custom rule reaches for
them instead of reimplementing a check that would then disagree with
`rules.string().email()`.

```ts
import rune, { createRule } from '@c9up/rune'

const { isSlug, isVAT, getNestedValue, isDistinct, asDate } = rune.helpers

const handle = createRule((value, _options, field) => {
  if (typeof value !== 'string' || !isSlug(value)) {
    field.report('Must be a slug', 'handle', field)
  }
})
```

Three of them behave in a way worth knowing:

- **`getNestedValue(key, field)`** reads the immediate **parent** for a bare
  name and walks the whole payload for a dotted path. A rule running inside an
  array item therefore sees its own siblings with `getNestedValue('price', field)`.
- **`isDistinct(items)`** compares by **identity** — two structurally equal
  objects are two different items. Pass one or more field names
  (`isDistinct(rows, 'sku')`) to compare on those instead; a row that lacks the
  key sits the comparison out, but a row whose key is `null` takes part.
- **`isPostalCode` / `isPassportNumber` / `isVAT`** answer `null` when rune has
  no table for that country, rather than throwing. `null` is not `true`: the
  chain rules treat it as a refusal.

`asDate(value, formats?)` parses with the same code `date()` uses and returns a
native `Date`, or `null`.

## What a boolean, a number and a checkbox accept

The lists are short and exact — no trimming, no case folding:

```ts
rules.boolean()   // "true" "on" "1" 1 true  →  true
                  // "false" "0" 0 false     →  false
                  // "TRUE", " true ", "off", "yes"  →  refused

rules.accepted()  // "on" "1" "yes" "true" true 1  →  true
                  // "YES", "On", "off"            →  refused
```

Widening any of these would mean a consent checkbox quietly accepting a
spelling nobody meant to send.

`rules.number()` refuses an empty or blank string rather than reading it as
`0` — an untouched text input must not become a quantity of zero. Use
`.optional()` for a field that may be left out.

`rules.enum()` takes a list, a callback, or a **native TypeScript enum**:

```ts
enum Role { Admin = 'admin', User = 'user' }
schema({ role: rules.enum(Role) })
```

A numeric enum also accepts its member names, because that is what
TypeScript's reverse mapping puts in the object.

## Testing a custom rule

A rule built with `createRule` is a plain object with a `run(value, field)`, so
testing one means building the field context it would have received. Getting
that wrong tests the rule against a shape no real run produces, so the helpers
build the real thing.

```typescript
import { createRule } from '@c9up/rune'
import { runRule, runRuleAsync, fieldContext } from '@c9up/rune/testing'

const isEven = createRule((value, _options, field) => {
  if (typeof value !== 'number' || value % 2 !== 0) {
    field.report('Must be even', 'isEven', field)
  }
})

const result = runRule(isEven(), 3)
// { valid: false, errors: [{ field: 'field', rule: 'isEven', … }], value: 3 }
```

`runRule` returns `{ valid, errors, value }` — `value` carries whatever
`field.mutate()` left behind. Options shape the context: `path` (which drives
`name` and `wildCardPath`), `data` and `parent` for a rule that reads its
siblings, `meta`, `isValid`.

```typescript
runRule(probe(), 'x', { path: 'tags.0', parent: ['x'] })
// the rule sees name === 0, wildCardPath === 'tags.*'
```

`runRule` refuses an async rule rather than reporting a pass it never waited
for — `runRuleAsync` is the awaiting form, and it takes a sync rule too.
`fieldContext(value, options)` builds a context on its own, for a shape
`runRule`'s options cannot express.

## Next Steps

- [Atlas (ORM)](/en/modules/atlas) — Validate before saving entities
- [Warden (Auth)](/en/modules/warden) — Authenticate and authorize users

## The Rust engine is required

A schema carrying nothing the engine cannot run **is run by the engine** —
`RuneNativeRequiredError` (`RUNE_NAPI_REQUIRED`) is thrown when the binary is
absent, rather than falling back.

There is a TypeScript validator, and it used to take over with a one-time
warning. That made a schema's verdict depend on whether a prebuilt binary
happened to load: two deployments of the same code could disagree on whether a
payload is valid, and the one that fell back lost the reason to have Rust at all.

The TypeScript path stays for what the engine genuinely cannot do — a custom
rule, a translator, a messages provider. There it is the only implementation,
not a second one free to diverge.

## Field-aware callbacks

`in`, `notIn` and `enum` accept a callback receiving the field, so a list that
depends on the request is computed per validation:

```ts
rune.enum((field) => field.meta.admin ? ['member', 'owner'] : ['member'])
rune.string().in((field) => allowedFor(field.meta.tenant))
```

`enum().getChoices()` reads the list back, so a form renders the same options the
validator will accept — from one declaration instead of two.

Also: `union().otherwise(cb)` reports when no branch matched, and
`record().validateKeys(cb)` checks the key SET rather than the values.
