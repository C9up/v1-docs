# Atom — Decimal

Statut: **Present (TS + Rust N-API)**.

- Package: `@c9up/atom`
- Objectif: arithmetique decimale exacte pour finance/compta.

## Exemples Rapides

Setup de base:

```ts
import { Atom, Decimal, decimal, isNativeAvailable } from '@c9up/atom'

isNativeAvailable() // boolean
const price = decimal('19.99')
const qty = new Decimal(3)
price.times(qty).toString() // "59.97"
```

Agregations et stats:

```ts
Atom.sum('1.2', '2.3', '3.5').toString() // "7"
Atom.avg('1', '2', '3').toString() // "2"
Atom.median('1', '3', '2').toString() // "2"
Atom.mode('1', '2', '2').map((x) => x.toString()) // ["2"]
Atom.stddev('2', '4', '4', '4', '5', '5', '7', '9').toString() // "2"
```

Operations instance:

```ts
const a = new Decimal('19.99')
a.plus('0.01').toString() // "20"
a.div('3', { precision: 4 }).toString() // "6.6633"
a.quantize('0.05').toString() // "20"
a.percent('15').toString() // "2.9985"
```

Conversion et locale:

```ts
const amount = Decimal.fromMinorUnits(12345, 2) // "123.45"
amount.toMinorUnits(2) // 12345n
Decimal.parseLocale('1 234,56', 'fr-FR').toString() // "1234.56"
amount.toLocale('fr-FR') // "123,45"
```

## Reference Complete

Methodes namespace `Atom`:
- `Atom.decimal(value)`
- `Atom.sum(...values)` et `Atom.sum(iterable)`
- `Atom.avg(...values)` et `Atom.avg(iterable)`
- `Atom.median(...values)` et `Atom.median(iterable, options?)`
- `Atom.mode(...values)` et `Atom.mode(iterable)`
- `Atom.stddev(...values)` et `Atom.stddev(iterable, options?)`
- `Atom.min(...values)` et `Atom.min(iterable)`
- `Atom.max(...values)` et `Atom.max(iterable)`
- `Atom.parseLocale(value, locales?)`

Exports nommes root:
- `decimal`
- `sum`, `avg`, `median`, `mode`, `stddev`, `min`, `max`
- `Decimal`
- `isNativeAvailable`

Methodes statiques `Decimal`:
- `Decimal.from(value)`
- `Decimal.zero()`
- `Decimal.one()`
- `Decimal.fromMinorUnits(value, scale)`
- `Decimal.parseLocale(value, locales?)`

Methodes instance `Decimal`:
- Arithmetique: `plus`, `minus`, `times`, `div`, `mod`, `pow`, `sqrt`
- Comparaison: `cmp`, `eq`, `lt`, `lte`, `gt`, `gte`, `between`
- Bornes: `min`, `max`, `clamp`
- Signe: `abs`, `neg`, `isZero`, `isPositive`, `isNegative`, `isInteger`
- Echelle/arrondi: `trunc`, `floor`, `ceil`, `round`, `quantize`, `toScale`, `toFixed`
- Finance: `toMinorUnits`, `percent`, `applyPercent`, `percentageOf`, `allocate`
- Serialization: `toParts`, `toString`, `toJSON`, `toNumber`, `toLocale`

## Passage D Objets Atom Entre APIs Atom

Toutes les APIs acceptent `DecimalInput` (`string | number | bigint | Decimal`), donc tu peux passer un `Decimal` directement dans une autre API `Atom`.

```ts
import { Atom, Decimal } from '@c9up/atom'

const subtotal = new Decimal('19.99')
const tax = new Decimal('4.00')

const total = subtotal.plus(tax) // Decimal + Decimal
const cloned = Decimal.from(total) // cree a partir d un Decimal existant
const max = Atom.max(subtotal, tax, total) // mix d inputs Decimal
```

## Precision

Atom utilise des operations exactes sur representation decimale (pas de flottants IEEE):

```ts
new Decimal('0.1').plus('0.2').toString() // "0.3"
```

## Runtime Natif (Rust N-API)

```bash
cd packages/atom
pnpm run build:napi
pnpm run test:napi
```

Comportement runtime:

- Le moteur Rust est **requis** — pas de fallback JS/TS.
- Les operations decimales levent `ATOM_ENGINE_NOT_FOUND` si le binaire n'est pas charge.
- Construisez le binaire NAPI: `cd packages/atom && pnpm build:napi`.
- Usage navigateur: construisez la cible WASM avec `cd packages/atom && pnpm build:wasm`.
