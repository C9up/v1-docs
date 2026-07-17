# Rosetta — I18n

Statut: **Present (architecture de manager type Adonis, encore en evolution)**.

- Package: `@c9up/rosetta`
- Role: source i18n unique pour l'ecosysteme (`ream`, `rune`, etc.)
- Runtime: TypeScript pur, aucun binaire natif ni toolchain de build

## Architecture Implantee

Rosetta se comporte maintenant comme un vrai manager i18n:

- manager multi-locale (`Rosetta`)
- instances scopees par locale (`RosettaLocale`)
- negotiation de locale via `Accept-Language`
- chaines de fallback explicites et implicites
- loaders asynchrones pour les catalogues
- formatters `Intl`
- parser ICU sans dépendance, avec cache d'AST par processus

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

## Config

Declarez la config i18n avec le helper `defineConfig` dans `config/i18n.ts` (parite avec le config-helper AdonisJS):

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

## Runtime

Rosetta est du TypeScript pur. Aucun binaire natif à construire, aucune matrice
de plateformes, aucune étape d'installation au-delà de `pnpm add @c9up/rosetta` —
le même code tourne sur glibc, sur musl/Alpine et dans le navigateur.

- Parsing: chaque message ICU est parsé en AST une seule fois par processus,
  puis mis en cache; les `t()` répétés sur le même message ne reparsent jamais.
- Rendu: `Intl` fait le travail sensible à la locale, donc les règles de pluriel
  CLDR et le formatage des nombres et des dates viennent des données ICU du
  runtime et restent à jour avec lui. Toutes les locales connues du runtime sont
  supportées, pas une liste figée.
- Support ICU MessageFormat complet: plural/select/selectordinal, skeletons de
  nombres, styles de date/heure, motifs imbriqués, offsets et échappement par
  apostrophe.

### Supprimé en 0.2.0: le moteur Rust N-API

Les versions précédentes embarquaient un moteur Rust N-API et exigeaient son
binaire. Il a été supprimé après mesure face au chemin TypeScript: parser en
Rust était plus lent de bout en bout, parce que l'AST produit doit traverser la
frontière N-API en JSON et que le `JSON.parse` côté JavaScript coûte à peu près
le prix du parsing complet du message en TypeScript. Le rendu ne pouvait pas
migrer vers Rust non plus: il exige ECMA-402, qui vit dans le runtime; les
tables CLDR écrites à la main du moteur Rust divergeaient d'`Intl` sur la moitié
d'un corpus différentiel.

Migration: retirez toute étape `pnpm build:napi` de votre build. L'export public
`isNativeAvailable()` disparaît; il indiquait si le binaire était chargé, et il
n'y a plus de binaire. Aucune autre API ne change, et aucun message ne s'affiche
différemment.

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
