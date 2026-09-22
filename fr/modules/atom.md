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

`times` et `div` arrondissent d'eux-mêmes à l'échelle de la devise — un montant
multiplié reste de l'argent. Ils prennent une seule option, le mode d'arrondi :

```ts
money('10.00', 'USD').times('1.075').toString()                    // "10.75 USD"
money('10.00', 'USD').times('1.075', { mode: 'half-even' }).toString()
```

Ils déclaraient auparavant tout `MoneyOptions` en n'en transmettant que `mode` :
`{ scale }` et `{ exact }` étaient acceptés puis écrasés. Ni l'un ni l'autre
n'est plus dans le type — ces deux méthodes prennent `MoneyRoundingOptions`.

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

## Bulk

`Atom.bulk` planifie un calcul en JavaScript et exécute l'ensemble en une seule
traversée vers le moteur.

Ce qui justifie ce mode, c'est la frontière, pas l'arithmétique. Un appel vers le
moteur natif coûte environ 200 ns quoi qu'il transporte, et une liste de chaînes
décimales coûte à peu près autant pour chacun de ses éléments. Une boucle qui
déroule un échéancier opération par opération passe donc presque tout son temps à
traverser. Un programme bulk traverse une fois : les valeurs passent en tableau
typé — un pointeur, pas un parcours — et les opérations passent à côté sous forme
de bytecode.

```ts
import { Atom } from '@c9up/atom'

const { net, biggest } = Atom.bulk((b) => {
  const gross = b.column(quantities).times(b.column(prices))
  const total = gross.sum()
  return {
    net: total.minus(total.times(b.of('0.0025'))),
    biggest: gross.max(),
  }
})
// → { net: Decimal, biggest: Decimal }
```

Les valeurs planifiées portent les noms de méthodes de `Decimal` : basculer un
chemin chaud en bulk change d'où viennent les valeurs, et rien d'autre.

### Ce à quoi ça sert, et ce à quoi ça ne sert pas

Mesuré sur le banc du paquet (`pnpm bench:bulk`) :

| Travail | Bulk | Le même travail autrement |
| --- | --- | --- |
| 2 160 opérations dépendantes (échéancier de 360 lignes) | 0,30 ms | 0,81 ms en un appel par opération · 2,23 ms via `Decimal` |
| `dot` sur 200 000 valeurs | 97 ms | 176 ms via `Decimal.dot` |
| `dot` sur 200 000 valeurs déjà tenues en entiers | — | **0,8 ms dans une simple boucle `for`** |

C'est la dernière ligne qu'il faut lire deux fois. En dessous d'environ trois
opérations par élément, une boucle sur un `BigInt64Array` bat tout ce qui
traverse, et aucune planification n'y change rien. Bulk est fait pour les
**chaînes d'opérations dépendantes** — un échéancier, un solveur de taux, une
statistique sur une colonne — pas pour une somme isolée.

### Colonnes et valeurs

```ts
const plan = Atom.bulk()              // garder le plan et le rejouer
const quantities = plan.column(rows.map((row) => row.quantity))
const rate = plan.of('0.0725')

plan.run({ total: quantities.sum() })
plan.run({ charged: quantities.sum().times(rate) })
```

Un plan reçoit ses valeurs par `column` (valeurs décimales), `minorUnits`
(unités mineures entières, voir plus bas) et `of` (une valeur seule).

Toutes les colonnes d'un même plan ont la même longueur. Un programme sur des
colonnes de longueurs différentes est un bug de l'appelant, et valoriser les
premières lignes rendrait un chiffre plausible pour des données que personne ne
détient.

Les colonnes portent les agrégats : `sum`, `avg`, `min`, `max`, `median`,
`percentile`, `stddev`, `dot`, `at`, `sorted`, et les opérations élément par
élément `plus`, `minus`, `times`, `neg`, `abs`. Les valeurs portent `plus`,
`minus`, `times`, `div`, `pow`, `sqrt`, `neg`, `abs`, `min`, `max`.

`dot` et `stddev` sont fusionnés : les produits et les écarts ne sont jamais
matérialisés, ce qui s'est mesuré environ quatre fois plus rapide que d'allouer
la colonne intermédiaire.

### Colonnes déjà tenues en unités mineures

`minorUnits(values, scale)` est le pendant de `Decimal.fromMinorUnits` :
`minorUnits([1234n, 99n], 2)` vaut 12,34 et 0,99.

```ts
const { revenue } = Atom.bulk((b) => ({
  revenue: b.minorUnits(invoices.map((invoice) => invoice.totalCents), 2).sum(),
}))
```

La raison d'être : un entier n'a ni à être analysé ni à être normalisé. Mesuré
sur 200 000 valeurs, une colonne prise ainsi coûte 3,5 ms contre 50 ms pour les
mêmes chiffres écrits en chaînes décimales — quatorze fois moins. La monnaie est de toute
façon stockée en entier d'unités mineures — `Money.toMinorUnits()` est ce qui
part dans cette colonne — donc c'est la forme que la donnée a déjà.

Seuls les entiers sont acceptés, en `bigint`, `number` ou `string`. Une valeur à
partie fractionnaire est refusée plutôt qu'arrondie : `minorUnits(['12.34'], 2)`
vient d'un appelant qui voulait `column(['12.34'])`, et la lire en silence comme
12,34 unités mineures serait faux d'un facteur cent.

Les colonnes d'échelles différentes se mélangent librement — le moteur les élève
à une échelle commune au lieu d'en arrondir une.

### Lire une valeur planifiée

Une valeur planifiée n'a pas de forme textuelle tant que le plan n'a pas tourné :

```ts
const total = plan.column(amounts).sum()
`${total}`          // lève ATOM_BULK_NOT_RUN
plan.run({ total }) // → { total: Decimal }
```

C'est volontaire. Sans ça, un gabarit de chaîne rendrait silencieusement
`[object Object]` et `total + 1` une chaîne, au milieu d'un calcul où se tromper
en silence est le pire résultat possible.

### Exactitude

Bulk travaille sur des registres de 128 bits : assez large pour le produit de
deux colonnes de 64 bits, assez étroit pour rester une instruction machine. Ce
n'est pas assez large pour tout.

Chaque étape est vérifiée. Une valeur trop large pour être disposée, ou un
débordement en cours d'exécution, fait rejouer le même plan sur l'exécuteur
BigInt, qui n'a pas de plafond — le même graphe, évalué avec les mêmes fonctions
que `Decimal` utilise. Le chemin rapide a le droit d'être trop étroit. Il n'a
jamais le droit d'être faux, et la suite de tests rejoue chaque cas sur les deux
exécuteurs et compare.

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
