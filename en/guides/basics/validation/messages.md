# Error messages and i18n

This guide covers error messages and their translation:

- Custom Error Messages
- Internationalization (i18n)

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

## Internationalization (i18n)

Rune ships no i18n engine of its own — Rosetta is the i18n module across the
ecosystem. There are two ways to reach it: one translator for the process, or
one provider per request.

### A translator for the whole process

`bindRosetta` installs a translator every validation consults. The key is
`validation.<rule>`, where `<rule>` is the name the rule **reports** — so a
rule namespaced by the type that owns it is keyed that way too:

```typescript
import { Rosetta } from '@c9up/rosetta'
import rune, { bindRosetta } from '@c9up/rune'

const i18n = new Rosetta({ defaultLocale: 'fr', fallbackLocale: 'en' })
i18n.loadMessages('fr', {
  'validation.required': 'Le champ {field} est obligatoire',
  'validation.minLength': 'Le champ {field} fait au moins {min} caracteres',
  'validation.array.minLength': 'Choisissez au moins {min} elements',
})

bindRosetta(i18n)

const CreateUser = rune.compile(
  rune.object({
    name: rune.string().minLength(4),
    tags: rune.array(rune.string()).minLength(2),
  }),
)

await CreateUser.validate({ name: 'ab', tags: ['a'] })
// 'Le champ name fait au moins 4 caracteres'
// 'Choisissez au moins 2 elements'
```

Placeholders are `{name}`, and every argument the rule carries is available
next to `{field}` — `{min}`, `{max}`, `{size}`, `{otherField}`.

### A provider per request

A process-wide translator cannot answer two simultaneous requests in two
languages. Over HTTP, install the hook once and every
`request.validateUsing(...)` picks up a provider for that request's locale:

```typescript
import { RequestValidator } from '@c9up/ream'

RequestValidator.messagesProvider = (ctx) => ctx.i18n.createMessagesProvider()
```

Its keys are `validator.shared.messages.<rule>`, and the human label for a
field lives under `validator.shared.fields.<field>`:

```typescript
rosetta.loadMessages('fr', {
  'validator.shared.messages.minLength':
    'Le champ {field} fait au moins {min} caracteres',
  'validator.shared.fields.name': 'nom',
})
// -> 'Le champ nom fait au moins 4 caracteres'
```

A rule with no translation falls back to the default catalogue, rendered — not
to a raw template.

### Reading a translation directly

```typescript
i18n.setLocale('fr')

i18n.t('validation.required', { field: 'nom' })
// 'Le champ nom est obligatoire'
```
