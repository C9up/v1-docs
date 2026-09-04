# Atom — Décimal et monnaie

Statut : **Présent (TS + Rust N-API/WASM + repli BigInt)**.

- Paquet : `@c9up/atom`
- Objectif : arithmétique décimale exacte pour la finance, la comptabilité, les
  statistiques et les rapports.

## Exemples rapides

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

isNativeAvailable() // true quand NAPI/WASM est chargé, false sur le repli TS

decimal('0.1').plus('0.2').toString() // "0.3"
new Decimal('19.99').times(3).toString() // "59.97"
Atom.sum('1.2', '2.3', '3.5').toString() // "7"
```

Préfère les entrées string ou bigint pour des données métier exactes. Les
entiers JS non sûrs sont refusés au lieu d'être arrondis en silence.

```ts
new Decimal('9007199254740993') // exact
new Decimal(Number.MAX_SAFE_INTEGER + 1) // lève
new Decimal(1e-7).toString() // "0.0000001"
```

## API Decimal

Helpers statiques :

- `Decimal.from(value)` / `Decimal.parse(value)`
- `Decimal.tryParse(value)` / `Decimal.safeParse(value)`
- `Decimal.isDecimal(value)`
- `Decimal.zero()` / `Decimal.one()`
- `Decimal.fromMinorUnits(value, scale)`
- `Decimal.parseLocale(value, localeOrRosetta?)`

Helpers d'instance :

- Arithmétique : `plus`, `minus`, `times`, `div`, `mod`, `pow`, `sqrt`
- Comparaison : `cmp`, `eq`, `lt`, `lte`, `gt`, `gte`, `between`
- Bornes et signe : `min`, `max`, `clamp`, `abs`, `neg`, tests de signe
- Arrondi : `trunc`, `floor`, `ceil`, `round`, `toScale`, `toFixed`, `quantize`
- Finance : `toMinorUnits`, `percent`, `applyPercent`, `percentageOf`, `allocate`
- Sérialisation : `toParts`, `toString`, `toJSON`, `toNumber`, `toLocale`

Les agrégats prennent soit un itérable, soit une liste de valeurs, et rien
d'autre — un argument qui n'est pas un décimal est nommé à l'appel au lieu
d'échouer à l'intérieur de `Decimal`.

```ts
Atom.avg('1', '2', '3').toString() // "2"
Atom.median(['1', '3', '2']).toString() // "2"
Atom.mode('1', '2', '2').map(String) // ["2"]
Atom.mode([]) // []
Atom.stddev('2', '4', '4', '4', '5', '5', '7', '9').toString() // "2"
```

## API Money

`Money` lie un montant à une devise et à une échelle. Les opérations entre
devises différentes sont refusées, et l'échelle vient d'ISO 4217.

```ts
import { Money, money } from '@c9up/atom'

money('19.99', 'EUR').toString() // "19.99 EUR"
Money.fromMinorUnits(1999n, 'USD').toString() // "19.99 USD"

const parts = money('10.00', 'USD').allocate([1, 1, 1])
parts.map((part) => part.toString()) // ["3.34 USD", "3.33 USD", "3.33 USD"]

money('19.99', 'USD').format({ locale: 'en-US' }) // "$19.99"
```

### L'échelle qu'une devise reçoit

Deux décimales, c'est la réponse pour la plupart des devises et le repli pour
toute devise non listée, mais ce n'est pas la réponse pour toutes. Chaque
exception ISO 4217 est listée, donc une devise sans subdivision reste entière
et une devise à trois décimales les garde toutes les trois :

```ts
money('1234', 'ISK').toMinorUnits() // 1234n — la couronne n'a pas de subdivision
money('1234', 'ISK').toString() // "1234 ISK"
money('10.505', 'JOD').toMinorUnits() // 10505n — le dinar vaut 1000 fils
```

`toMinorUnits()` est ce qui part dans une colonne entière : une échelle fausse
là, c'est un facteur cent, pas une différence d'arrondi. Passe `{ scale }`
quand ta colonne diverge d'ISO — une colonne à virgule fixe à quatre décimales
sur une devise à deux, par exemple :

```ts
money('19.99', 'EUR', { scale: 4 }).toMinorUnits() // 199900n
```

Une entrée suit ISO plutôt que la plateforme : ISO donne trois décimales à
l'IQD, CLDR n'en donne aucune. `format()` passe l'échelle à `Intl`
explicitement, donc la valeur garde les fils qu'ISO lui reconnaît.

Utilise `{ exact: false, mode }` quand une multiplication ou une division doit
arrondir vers l'échelle de la devise.

```ts
money('10.00', 'USD').times('1.075').toString() // "10.75 USD"
```

## Valeurs par défaut du contexte

Atom expose des valeurs par défaut process-local pour la précision et
l'arrondi. Les options explicites par appel gagnent toujours.

```ts
configureAtomContext({ precision: 8, roundMode: 'trunc', quantizeMode: 'half-up' })

decimal('1').div('3').toString() // "0.33333333"

withAtomContext({ precision: 2 }, () => decimal('1').div('8').toString()) // "0.12"
```

## Locale

Une locale se nomme de deux façons — un tag qu'`Intl` comprend, ou une Rosetta
— et les deux répondent pareil pour la même locale. L'une comme l'autre fournit
les séparateurs, les chiffres propres à la locale, et la largeur de ses
groupes.

```ts
Decimal.parseLocale('1 234,56', 'fr-FR').toString() // "1234.56"
Decimal.parseLocale('١٬٢٣٤٫٥٦', 'ar-EG').toString() // "1234.56"
Decimal.parseLocale('12,34,567', 'hi-IN').toString() // "1234567" — groupé 3-2
Decimal.parseLocale('12,34,567', i18n).toString() // "1234567" — pareil, via Rosetta

new Decimal('1234.56').toLocale('fr-FR') // "1 234,56" selon les espaces de la locale
```

Un groupement invalide est refusé au lieu d'être supprimé en silence, contre le
groupement de la locale lue — `1,234,567` est bien formé en `en-US` et malformé
en `hi-IN`.

Atom n'importe jamais `@c9up/rosetta` : l'intégration est structurelle, donc
tout objet exposant `getNumberFormatData()` et `formatNumberString()` convient.

## Atlas

`@c9up/atom/atlas` fournit les callbacks `prepare` / `consume` qu'une colonne
Atlas accepte. Atlas reste agnostique ; Atom porte le pont.

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

Ordre de résolution :

1. Node charge le binaire NAPI préconstruit quand il est disponible.
2. Les builds navigateur chargent la glue WASM quand elle est disponible.
3. Les plateformes non supportées passent au repli TypeScript BigInt de façon
   transparente.

Tous les chemins répondent pareil : le repli est une seconde implémentation du
même contrat, tenue à ce contrat par une suite de parité qui fait tourner les
deux sur les mêmes entrées.

Commandes utiles du paquet :

```bash
pnpm test
pnpm test:napi
pnpm test:coverage
pnpm bench
pnpm build:wasm && node scripts/verify-wasm.mjs
```
