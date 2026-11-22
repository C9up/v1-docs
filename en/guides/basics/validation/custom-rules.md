# Custom rules

This guide covers writing and testing your own rules:

- Custom Rules
- Helpers a custom rule can reuse
- Field-aware callbacks
- Testing a custom rule

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
