# Rosetta — I18n

Status: **Present (Adonis-like manager architecture, still evolving)**.

- Package: `@c9up/rosetta`
- Role: single i18n source for the ecosystem (`ream`, `rune`, etc.)
- Runtime: pure TypeScript, no native binary and no build toolchain

## Implemented Architecture

Rosetta now behaves as an i18n manager, not a simple key/value helper:

- locale-aware manager (`Rosetta`)
- locale-scoped instances (`RosettaLocale`)
- locale negotiation from `Accept-Language`
- explicit and implicit fallback chains
- async loaders for message catalogs
- `Intl`-based formatters
- dependency-free ICU parser with a per-process AST cache

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

## Config

Author the i18n config with the `defineConfig` helper in `config/i18n.ts` (AdonisJS config-helper parity):

```ts
import { defineConfig } from '@c9up/rosetta'

export default defineConfig({
  defaultLocale: 'en',
  supportedLocales: ['en', 'fr', 'de'],
  fallbackLocale: 'en',
  fallbackLocales: {
    'fr-ch': 'fr',
  },
})
```

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

## Runtime

Rosetta is pure TypeScript. There is no native binary to build, no platform
matrix, and no install step beyond `pnpm add @c9up/rosetta` — the same code
runs on glibc, on musl/Alpine and in the browser.

- Parsing: each ICU message is parsed to an AST once per process, then cached,
  so repeated `t()` calls on the same message never re-parse.
- Rendering: `Intl` does the locale-sensitive work, so CLDR plural rules and
  number/date formatting come from the runtime's own ICU data and stay current
  with it. Every locale the runtime knows is supported, not a fixed list.
- Full ICU MessageFormat support: plural/select/selectordinal, number
  skeletons, date/time styles, nested patterns, offsets and apostrophe
  escaping.

### Removed in 0.2.0: the Rust N-API engine

Earlier versions shipped a Rust N-API engine and required its binary. It was
removed after being measured against the TypeScript path: parsing in Rust was
slower end to end, because the resulting AST has to cross the N-API boundary as
JSON and `JSON.parse` on the JavaScript side costs about as much as parsing the
message in TypeScript outright. Rendering could not move to Rust either — it
needs ECMA-402, which lives in the runtime; the Rust engine's hand-written CLDR
tables disagreed with `Intl` on half of a differential corpus.

Migration: delete any `pnpm build:napi` step from your build. The public
`isNativeAvailable()` export is gone; it reported whether the binary had
loaded, and there is no binary. No other API changed, and no message renders
differently.

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
