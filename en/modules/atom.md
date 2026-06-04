# Atom — Decimal

Status: **Present (TS + Rust N-API)**.

- Package: `@c9up/atom`
- Goal: exact decimal arithmetic for finance/accounting use cases.

## Quick Examples

Basic setup:

```ts
import { Atom, Decimal, decimal, isNativeAvailable } from '@c9up/atom'

isNativeAvailable() // boolean
const price = decimal('19.99')
const qty = new Decimal(3)
price.times(qty).toString() // "59.97"
```

Aggregates and stats:

```ts
Atom.sum('1.2', '2.3', '3.5').toString() // "7"
Atom.avg('1', '2', '3').toString() // "2"
Atom.median('1', '3', '2').toString() // "2"
Atom.mode('1', '2', '2').map((x) => x.toString()) // ["2"]
Atom.stddev('2', '4', '4', '4', '5', '5', '7', '9').toString() // "2"
```

Instance operations:

```ts
const a = new Decimal('19.99')
a.plus('0.01').toString() // "20"
a.div('3', { precision: 4 }).toString() // "6.6633"
a.quantize('0.05').toString() // "20"
a.percent('15').toString() // "2.9985"
```

Conversion and locale:

```ts
const amount = Decimal.fromMinorUnits(12345, 2) // "123.45"
amount.toMinorUnits(2) // 12345n
Decimal.parseLocale('1 234,56', 'fr-FR').toString() // "1234.56"
amount.toLocale('fr-FR') // "123,45"
```

## Complete Reference

`Atom` namespace methods:
- `Atom.decimal(value)`
- `Atom.sum(...values)` and `Atom.sum(iterable)`
- `Atom.avg(...values)` and `Atom.avg(iterable)`
- `Atom.median(...values)` and `Atom.median(iterable, options?)`
- `Atom.mode(...values)` and `Atom.mode(iterable)`
- `Atom.stddev(...values)` and `Atom.stddev(iterable, options?)`
- `Atom.min(...values)` and `Atom.min(iterable)`
- `Atom.max(...values)` and `Atom.max(iterable)`
- `Atom.parseLocale(value, locales?)`

Root named exports:
- `decimal`
- `sum`, `avg`, `median`, `mode`, `stddev`, `min`, `max`
- `Decimal`
- `isNativeAvailable`

`Decimal` static methods:
- `Decimal.from(value)`
- `Decimal.zero()`
- `Decimal.one()`
- `Decimal.fromMinorUnits(value, scale)`
- `Decimal.parseLocale(value, locales?)`

`Decimal` instance methods:
- Arithmetic: `plus`, `minus`, `times`, `div`, `mod`, `pow`, `sqrt`
- Comparison: `cmp`, `eq`, `lt`, `lte`, `gt`, `gte`, `between`
- Bounds: `min`, `max`, `clamp`
- Sign checks: `abs`, `neg`, `isZero`, `isPositive`, `isNegative`, `isInteger`
- Scale/rounding: `trunc`, `floor`, `ceil`, `round`, `quantize`, `toScale`, `toFixed`
- Finance: `toMinorUnits`, `percent`, `applyPercent`, `percentageOf`, `allocate`
- Serialization: `toParts`, `toString`, `toJSON`, `toNumber`, `toLocale`

## Passing Atom Objects To Atom APIs

All APIs accept `DecimalInput` (`string | number | bigint | Decimal`), so you can pass one `Decimal` into another API directly.

```ts
import { Atom, Decimal } from '@c9up/atom'

const subtotal = new Decimal('19.99')
const tax = new Decimal('4.00')

const total = subtotal.plus(tax) // Decimal + Decimal
const cloned = Decimal.from(total) // create from existing Decimal
const max = Atom.max(subtotal, tax, total) // mixed Decimal inputs
```

## Exactness

Atom uses decimal-string arithmetic (not floating IEEE operations), so:

```ts
new Decimal('0.1').plus('0.2').toString() // "0.3"
```

## Native Runtime (Rust N-API)

```bash
cd packages/atom
pnpm run build:napi
pnpm run test:napi
```

Runtime behavior:

- The Rust engine is **required** — there is no JS/TS fallback.
- Decimal ops throw `ATOM_ENGINE_NOT_FOUND` if the binary is not loaded.
- Build the NAPI binary: `cd packages/atom && pnpm build:napi`.
- Browser usage: build the WASM target with `cd packages/atom && pnpm build:wasm`.
