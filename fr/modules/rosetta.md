# Rosetta — I18n

Statut: **Present (architecture de manager type Adonis, encore en evolution)**.

- Package: `@c9up/rosetta`
- Role: source i18n unique pour l'ecosysteme (`ream`, `rune`, etc.)
- Runtime: manager TypeScript + moteur Rust N-API **requis** pour la traduction (`t()` et `has()` levent une erreur si le binaire n'est pas charge)

## Architecture Implantee

Rosetta se comporte maintenant comme un vrai manager i18n:

- manager multi-locale (`Rosetta`)
- instances scopees par locale (`RosettaLocale`)
- negotiation de locale via `Accept-Language`
- chaines de fallback explicites et implicites
- loaders asynchrones pour les catalogues
- formatters `Intl`
- moteur ICU Rust requis pour `t()` et `has()` — pas de fallback JS/TS

## API Manager

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

Methodes principales:

- `loadMessages(locale, catalog)`
- `loadLocale(locale)` et `boot()` (loaders async)
- `setLocale()` / `getLocale()`
- `setDefaultLocale()` / `getDefaultLocale()`
- `setSupportedLocales()` / `getSupportedLocales()`
- `setFallbackLocale()` / `getFallbackLocale()`
- `setFallbackLocales()` / `getFallbackLocales()`
- `resolveLocale(headerOrInput)`
- `t(key, params?, options?)`
- `has(key, locale?)`

## Resolution des Fallbacks

L'ordre de recherche des traductions est:

1. locale demandee (`fr-ch`)
2. locale base (`fr`)
3. fallback explicite (`fallbackLocales['fr-ch']`)
4. base du fallback explicite
5. fallback global
6. base du fallback global
7. locale par defaut
8. base de la locale par defaut

Exemple:

```ts
const i18n = new Rosetta({
  defaultLocale: 'en',
  fallbackLocale: 'en',
  fallbackLocales: { 'fr-ch': 'fr' },
})
```

## Negotiation de Locale (Accept-Language)

```ts
const i18n = new Rosetta({
  defaultLocale: 'en',
  supportedLocales: ['en', 'fr', 'de'],
})

const locale = i18n.resolveLocale('de-CH,de;q=0.9,fr;q=0.8,en;q=0.7')
// => 'de'
```

Version input structure:

```ts
const locale = i18n.resolveLocale({
  header: request.headers['accept-language'],
})
```

## Catalogues Imbriques et Interpolation

Les objets imbriques sont flatten avec des cles `dot`:

```ts
i18n.loadMessages('en', {
  auth: { login: { success: 'Welcome {name}' } },
})

i18n.t('auth.login.success', { name: 'Kaen' })
// Welcome Kaen
```

Rosetta supporte:

- placeholders simples: `{name}`
- syntaxe ICU type `select`:
  - `{gender, select, male {Mr {name}} female {Ms {name}} other {Hello {name}}}`
- syntaxe ICU type `plural` avec categories CLDR via `Intl.PluralRules`:
  - `{count, plural, =0 {No items} one {# item} other {# items}}`
- `plural` avec `offset`:
  - `{count, plural, offset:1 =0 {...} one {...} other {...}}`
- `selectordinal`:
  - `{place, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}`
- format inline `number`, `date`, `time`:
  - `{amount, number, currency/USD}`
  - `{when, date, short}`
  - `{when, time, short}`

## Exemples ICU

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
i18n.t('money', { amount: 12.5 }) // $12.50 (selon locale)
i18n.t('day', { when: new Date('2026-01-01T12:00:00Z') })
i18n.t('hour', { when: new Date('2026-01-01T12:00:00Z') })
```

Exemple pluriels russes (`one` / `few` / `many` / `other`) :

```ts
const ru = new Rosetta({ defaultLocale: 'ru' }).loadMessages('ru', {
  products: '{count, plural, one {# товар} few {# товара} many {# товаров} other {# товара}}',
})

ru.t('products', { count: 1 })  // 1 товар
ru.t('products', { count: 2 })  // 2 товара
ru.t('products', { count: 5 })  // 5 товаров
ru.t('products', { count: 21 }) // 21 товар
```

## Instances Scopees Locale

```ts
const fr = i18n.locale('fr')
fr.t('greeting')
fr.formatNumber(12345.67)
fr.formatCurrency(1234.5, 'EUR')
fr.formatDate(new Date())
fr.formatRelativeTime(-1, 'day')
```

## Loaders Asynchrones

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

Le loader filesystem officiel est maintenant disponible:

```ts
import { FileSystemLoader } from '@c9up/rosetta'

const i18n = new Rosetta({
  supportedLocales: ['en', 'fr'],
  loaders: [new FileSystemLoader({ rootDir: './resources/lang' })],
})
```

Fichiers supportes:

- `resources/lang/en.json`
- `resources/lang/en.yaml`
- `resources/lang/en.yml`

## Runtime Natif (Rust N-API)

Rosetta embarque une chaine complete de packaging natif:

```bash
cd packages/rosetta
pnpm run build:napi   # cargo build --release + copie index.<platform>.node
pnpm run test:napi    # smoke test exports + comportement runtime natif
```

Exemple artefact Linux:

- `packages/rosetta/index.linux-x64-gnu.node`

Comportement runtime:

- Le moteur ICU Rust est **requis** — pas de fallback JS/TS.
- `t()` et `has()` levent `ROSETTA_NAPI_REQUIRED` si le binaire n'est pas charge.
- Construisez le binaire NAPI: `cd packages/rosetta && pnpm build:napi`.
- Support ICU MessageFormat complet: plural/select/selectordinal (regles CLDR pour 30+ langues), formatage date/nombre, patterns de messages imbriques.

## Integration Rune

Rune peut consommer Rosetta directement (source i18n unique):

```ts
import { bindRosetta } from '@c9up/rune'
import { Rosetta } from '@c9up/rosetta'

const i18n = new Rosetta({ defaultLocale: 'fr', fallbackLocale: 'en' })
bindRosetta(i18n)
```

## Support ICU

Rosetta supporte maintenant:

- `select`
- `plural` (y compris exact match et `offset`)
- `selectordinal`
- format inline `number`, `date`, `time`
