# Atom — Decimal Et Money

Statut: **Present (TS + Rust N-API/WASM + fallback BigInt)**.

- Package: `@c9up/atom`
- Objectif: arithmetique decimale exacte pour finance, compta, statistiques et rapports.

## Exemples Rapides

```ts
import {
  Atom,
  Decimal,
  configureAtomContext,
  decimal,
  isNativeAvailable,
  money,
  withAtomContext,
} from '@c9up/atom'

isNativeAvailable() // true si NAPI/WASM est charge, false avec fallback TS

decimal('0.1').plus('0.2').toString() // "0.3"
new Decimal('19.99').times(3).toString() // "59.97"
Atom.sum('1.2', '2.3', '3.5').toString() // "7"
```

Prefere les strings ou bigint pour les donnees metier exactes. Les entiers JS
non surs sont rejetes au lieu d'etre arrondis silencieusement.

```ts
new Decimal('9007199254740993') // exact
new Decimal(9007199254740993) // throw
new Decimal(1e-7).toString() // "0.0000001"
```

## API Decimal

Helpers statiques:

- `Decimal.from(value)` / `Decimal.parse(value)`
- `Decimal.tryParse(value)` / `Decimal.safeParse(value)`
- `Decimal.isDecimal(value)`
- `Decimal.zero()` / `Decimal.one()`
- `Decimal.fromMinorUnits(value, scale)`
- `Decimal.parseLocale(value, localesOrRosetta?)`

Helpers instance:

- Arithmetique: `plus`, `minus`, `times`, `div`, `mod`, `pow`, `sqrt`
- Comparaison: `cmp`, `eq`, `lt`, `lte`, `gt`, `gte`, `between`
- Bornes/signe: `min`, `max`, `clamp`, `abs`, `neg`, checks de signe
- Arrondi: `trunc`, `floor`, `ceil`, `round`, `toScale`, `toFixed`, `quantize`
- Finance: `toMinorUnits`, `percent`, `applyPercent`, `percentageOf`, `allocate`
- Serialization: `toParts`, `toString`, `toJSON`, `toNumber`, `toLocale`

Agregations:

```ts
Atom.avg('1', '2', '3').toString() // "2"
Atom.median('1', '3', '2').toString() // "2"
Atom.mode('1', '2', '2').map(String) // ["2"]
Atom.mode([]) // []
Atom.stddev('2', '4', '4', '4', '5', '5', '7', '9').toString() // "2"
```

## API Money

`Money` lie un montant a une devise et une echelle. Les operations entre devises
differentes sont rejetees. Les echelles ISO courantes sont appliquees par defaut.

```ts
import { Money, money } from '@c9up/atom'

money('19.99', 'EUR').toString() // "19.99 EUR"
Money.fromMinorUnits(1999n, 'USD').toString() // "19.99 USD"

const parts = money('10.00', 'USD').allocate([1, 1, 1])
parts.map((part) => part.toString()) // ["3.34 USD", "3.33 USD", "3.33 USD"]

money('19.99', 'USD').format({ locale: 'en-US' }) // "$19.99"
```

Utilise `{ exact: false, mode }` quand une multiplication ou division doit
arrondir vers l'echelle de la devise.

```ts
money('10.00', 'USD').times('1.075').toString() // "10.75 USD"
```

## Defaults De Contexte

Atom expose des defaults process-local pour precision et arrondi. Les options
explicites par appel gagnent toujours.

```ts
configureAtomContext({ precision: 8, roundMode: 'trunc', quantizeMode: 'half-up' })

decimal('1').div('3').toString() // "0.33333333"

withAtomContext({ precision: 2 }, () => decimal('1').div('8').toString()) // "0.12"
```

## Locale

```ts
Decimal.parseLocale('1 234,56', 'fr-FR').toString() // "1234.56"
Decimal.parseLocale('١٬٢٣٤٫٥٦', 'ar-EG').toString() // "1234.56"
new Decimal('1234.56').toLocale('fr-FR') // "1 234,56" selon les espaces locale
```

Les groupements invalides sont rejetes au lieu d'etre supprimes silencieusement.

## Atlas

`@c9up/atom/atlas` reprend le pattern Adonis Lucid `prepare` / `consume`.
Atlas reste agnostique; Atom porte le bridge.

```ts
import { Column } from '@c9up/atlas'
import { Decimal } from '@c9up/atom'
import { decimalColumn } from '@c9up/atom/atlas'

class Invoice {
  @Column(decimalColumn({ scale: 2, nullable: false }))
  total!: Decimal
}
```

Pour les usages bas niveau, `decimalAtlasAdapter` reste disponible.

## Runtime

Ordre runtime:

1. Node charge le binaire NAPI prebuild si disponible.
2. Le navigateur charge le glue WASM si disponible.
3. Les plateformes non supportees utilisent automatiquement le fallback BigInt TypeScript.

Commandes utiles:

```bash
pnpm test
pnpm test:napi
pnpm test:coverage
pnpm bench
pnpm build:wasm && node scripts/verify-wasm.mjs
```
