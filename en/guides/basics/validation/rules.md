# Rules

This guide covers the rules a schema is built from:

- Rules
- Formats tied to a country or a locale
- Normalising a value
- What a boolean, a number and a checkbox accept
- Keys the shape does not declare
- Transforms

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

### Array and Record Rules

```typescript
rules.array(rules.string())
  .minLength(1) // At least one item
  .maxLength(5) // At most five items
  .notEmpty()   // Same as minLength(1)

rules.record(rules.number())
  .minLength(1) // At least one key
```

On an array or a record, `min()` and `max()` are `minLength()` and `maxLength()`:
the size they bound is the number of items, or of keys. The error names the
rule that ran — `array.minLength`, `record.maxLength`.

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

### Files

```typescript
const s = schema({
  avatar: rules.file({ size: '2mb', extnames: ['jpg', 'png'] }),
  report: rules.nativeFile({ maxSize: '10mb', mimeTypes: ['application/pdf'] }),
})

const form = await request.formData() // a web Request
const result = await s.validateResultAsync({
  avatar: ctx.request.file('avatar'),
  report: form.get('report'),
})
```

- `rules.file({ size, extnames, verifyContent })` accepts any object with a
  `size` and a name or extension — the body parser's upload, or any other
  representation. `extnames` are compared lowercase, without the dot.
- `rules.nativeFile({ minSize, maxSize, mimeTypes })` is for the platform
  `File` (what `formData()` returns): anything else, a JSON object shaped like
  a file included, fails with `nativeFile`. It adds a lower bound and a
  MIME-type list; `.minSize()`, `.maxSize()` and `.mimeTypes()` chain the same
  checks.
- Sizes are a byte count or a spelling such as `'512kb'`, `'2mb'`, `'1gb'`
  (`b`, `kb`, `mb`, `gb`, `tb`, powers of 1024). A spelling rune cannot read
  throws `E_RUNE_INVALID_SIZE` when the schema is built, rather than leaving
  the field uncapped.

The name, the extension and the reported type all come from the uploader: a
`.exe` renamed `.png` satisfies every one of them. So declaring `extnames` or
`mimeTypes` also reads the file's leading bytes and refuses content that does
not match the declaration (rule `verifyContent`). `.verifyContent()` arms the
same check on a chain that declares neither. The check is asynchronous: a
schema carrying it runs through `validate()` / `validateResultAsync()`.

The bytes come from the upload's in-memory `content` / `buffer`, a `Blob`, or
the reader a host binds with `rune.bindFileReader()`. A path on the value is
never opened — a JSON body can build a file-shaped object, and a path in it
would be a read of any file the process can open. With no byte source, the
check fails rather than passing.

`rules.file({ extnames, verifyContent: false })` turns the content check off.
The extension list is then the uploader's word alone; keep the opt-out for
files whose bytes are checked elsewhere.

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
// E_RUNE_UNSUPPORTED_COUNTRY: postalCode(): no pattern for country 'ZZ'.
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

`rules.number()` and `rules.boolean()` coerce the text a form or a query
string carries (`"32"` → `32`, the lists above → a boolean).
`rules.number({ strict: true })` and `rules.boolean({ strict: true })` refuse
anything that is not already a number or a boolean — the choice for a JSON API
where `"1"` is a client bug.

`rune.convertEmptyStringsToNull = true` reads every `""` as `null` before the
rules run, for every schema in the process. An empty input then counts as
absent: `.optional()` accepts it, a required field refuses it as missing, and a
string rule never sees `""`. It is off by default; turn it on once, at boot,
not per request.

`rules.enum()` takes a list, a callback, or a **native TypeScript enum**:

```ts
enum Role { Admin = 'admin', User = 'user' }
schema({ role: rules.enum(Role) })
```

A numeric enum also accepts its member names, because that is what
TypeScript's reverse mapping puts in the object.

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
| `.allowUnknownProperties()` | keep the key in the output, unchanged |
| `.denyUnknownProperties()` | fail the payload, naming the key |

`allowUnknownProperties()` only keeps keys the shape does not declare, as they
were sent: `toCamelCase()` renames the declared ones, not these. A declared
field appears once, under its output name, with its validated value — never
its raw input beside it, and an unknown key spelled like a declared field's
output name (`userBio` next to a declared `user_bio`) does not replace it.

`denyUnknownProperties()` is for an API whose contract is that it refuses what
it does not understand. A client sending `emial` is told so, instead of being
silently ignored and left wondering why the address never changed:

```
unknown field `emial`, expected one of email, password
```

Every undeclared key is reported, not just the first, and the declared keys are
still validated alongside.

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
