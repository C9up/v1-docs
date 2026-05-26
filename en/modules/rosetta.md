# Rosetta — I18n

Status: **Present (Adonis-like manager architecture, still evolving)**.

- Package: `@c9up/rosetta`
- Role: single i18n source for the ecosystem (`ream`, `rune`, etc.)
- Runtime: TypeScript manager + **required** Rust N-API engine for translation (`t()` and `has()` throw if the binary is not loaded)

## Implemented Architecture

Rosetta now behaves as an i18n manager, not a simple key/value helper:

- locale-aware manager (`Rosetta`)
- locale-scoped instances (`RosettaLocale`)
- locale negotiation from `Accept-Language`
- explicit and implicit fallback chains
- async loaders for message catalogs
- `Intl`-based formatters
- required Rust ICU engine for `t()` and `has()` — no JS/TS fallback

## Manager API

```ts
import { Rosetta } from '@c9up/rosetta'

const i18n = new Rosetta({
  defaultLocale: 'en',
  supportedLocales: ['en', 'fr', 'de'],
  fallbackLocale: 'en',
  fallbackLocales: {
    'fr-ch': 'fr',
  },
})
```

Main methods:

- `loadMessages(locale, catalog)`
- `loadLocale(locale)` and `boot()` (async loaders)
- `setLocale()` / `getLocale()`
- `setDefaultLocale()` / `getDefaultLocale()`
- `setSupportedLocales()` / `getSupportedLocales()`
- `setFallbackLocale()` / `getFallbackLocale()`
- `setFallbackLocales()` / `getFallbackLocales()`
- `resolveLocale(headerOrInput)`
- `t(key, params?, options?)`
- `has(key, locale?)`

## Fallback Resolution

Translation lookup uses a chain, in this order:

1. requested locale (`fr-ch`)
2. base locale (`fr`)
3. explicit mapped fallback (`fallbackLocales['fr-ch']`)
4. base of mapped fallback
5. global fallback locale
6. base of global fallback
7. default locale
8. base of default locale

Example:

```ts
const i18n = new Rosetta({
  defaultLocale: 'en',
  fallbackLocale: 'en',
  fallbackLocales: { 'fr-ch': 'fr' },
})
```

## Locale Negotiation (Accept-Language)

```ts
const i18n = new Rosetta({
  defaultLocale: 'en',
  supportedLocales: ['en', 'fr', 'de'],
})

const locale = i18n.resolveLocale('de-CH,de;q=0.9,fr;q=0.8,en;q=0.7')
// => 'de'
```

Or with structured input:

```ts
const locale = i18n.resolveLocale({
  header: request.headers['accept-language'],
})
```

## Nested Catalogs and Interpolation

Nested objects are flattened using dot keys:

```ts
i18n.loadMessages('en', {
  auth: { login: { success: 'Welcome {name}' } },
})

i18n.t('auth.login.success', { name: 'Kaen' })
// Welcome Kaen
```

Rosetta supports:

- simple placeholders: `{name}`
- ICU-style select:
  - `{gender, select, male {Mr {name}} female {Ms {name}} other {Hello {name}}}`
- ICU-style plural with CLDR categories via `Intl.PluralRules`:
  - `{count, plural, =0 {No items} one {# item} other {# items}}`
- ICU `plural` offset:
  - `{count, plural, offset:1 =0 {...} one {...} other {...}}`
- ICU `selectordinal`:
  - `{place, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}`
- ICU `number`, `date`, `time`:
  - `{amount, number, currency/USD}`
  - `{when, date, short}`
  - `{when, time, short}`

## ICU Examples

```ts
const i18n = new Rosetta({ defaultLocale: 'en' }).loadMessages('en', {
  gendered: '{gender, select, male {Mr {name}} female {Ms {name}} other {Hello {name}}}',
  items: '{count, plural, =0 {No items} one {# item} other {# items}}',
  invites: '{count, plural, offset:1 =0 {Nobody joined} =1 {You joined} one {You and # other joined} other {You and # others joined}}',
  rank: '{place, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} place',
  money: '{amount, number, currency/USD}',
  day: '{when, date, short}',
  hour: '{when, time, short}',
})

i18n.t('gendered', { gender: 'female', name: 'Kaen' }) // Ms Kaen
i18n.t('items', { count: 3 }) // 3 items
i18n.t('invites', { count: 5 }) // You and 4 others joined
i18n.t('rank', { place: 2 }) // 2nd place
i18n.t('money', { amount: 12.5 }) // $12.50 (locale-dependent)
i18n.t('day', { when: new Date('2026-01-01T12:00:00Z') })
i18n.t('hour', { when: new Date('2026-01-01T12:00:00Z') })
```

Russian plural example (`one` / `few` / `many` / `other`):

```ts
const ru = new Rosetta({ defaultLocale: 'ru' }).loadMessages('ru', {
  products: '{count, plural, one {# товар} few {# товара} many {# товаров} other {# товара}}',
})

ru.t('products', { count: 1 })  // 1 товар
ru.t('products', { count: 2 })  // 2 товара
ru.t('products', { count: 5 })  // 5 товаров
ru.t('products', { count: 21 }) // 21 товар
```

## Locale-Scoped Instances

```ts
const fr = i18n.locale('fr')
fr.t('greeting')
fr.formatNumber(12345.67)
fr.formatCurrency(1234.5, 'EUR')
fr.formatDate(new Date())
fr.formatRelativeTime(-1, 'day')
```

## Async Loaders

```ts
const i18n = new Rosetta({
  supportedLocales: ['en'],
  loaders: [
    {
      async load(locale) {
        if (locale === 'en') return { greeting: 'Loaded hello' }
        return null
      },
    },
  ],
})

await i18n.boot()
```

Official filesystem loader is now available:

```ts
import { FileSystemLoader } from '@c9up/rosetta'

const i18n = new Rosetta({
  supportedLocales: ['en', 'fr'],
  loaders: [new FileSystemLoader({ rootDir: './resources/lang' })],
})
```

Supported files:

- `resources/lang/en.json`
- `resources/lang/en.yaml`
- `resources/lang/en.yml`

## Native Runtime (Rust N-API)

Rosetta includes native packaging and verification:

```bash
cd packages/rosetta
pnpm run build:napi   # cargo build --release + copy index.<platform>.node
pnpm run test:napi    # smoke test for native exports and runtime behavior
```

Current Linux artifact example:

- `packages/rosetta/index.linux-x64-gnu.node`

Runtime behavior:

- The Rust ICU engine is **required** — there is no JS/TS fallback.
- `t()` and `has()` throw `ROSETTA_NAPI_REQUIRED` if the binary is not loaded.
- Build the NAPI binary: `cd packages/rosetta && pnpm build:napi`.
- Full ICU MessageFormat support: plural/select/selectordinal (CLDR rules for 30+ languages), date/number formatting, nested message patterns.

## Rune Integration

Rune can consume Rosetta directly (single i18n source):

```ts
import { bindRosetta } from '@c9up/rune'
import { Rosetta } from '@c9up/rosetta'

const i18n = new Rosetta({ defaultLocale: 'fr', fallbackLocale: 'en' })
bindRosetta(i18n)
```

## ICU Support

Rosetta now supports:

- `select`
- `plural` (including exact matches and `offset`)
- `selectordinal`
- inline `number`, `date`, `time` formatting
