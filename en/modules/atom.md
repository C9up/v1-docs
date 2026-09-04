# Atom — Decimal And Money

Status: **Present (TS + Rust N-API/WASM + BigInt fallback)**.

- Package: `@c9up/atom`
- Goal: exact decimal arithmetic for finance, accounting, statistics, and reports.

## Quick Examples

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

isNativeAvailable() // true when NAPI/WASM loaded, false when using TS fallback

decimal('0.1').plus('0.2').toString() // "0.3"
new Decimal('19.99').times(3).toString() // "59.97"
Atom.sum('1.2', '2.3', '3.5').toString() // "7"
```

Prefer string or bigint inputs for exact business data. Unsafe JS integer
numbers are rejected instead of being rounded silently.

```ts
new Decimal('9007199254740993') // exact
new Decimal(Number.MAX_SAFE_INTEGER + 1) // throws
new Decimal(1e-7).toString() // "0.0000001"
```

## Decimal API

Static helpers:

- `Decimal.from(value)` / `Decimal.parse(value)`
- `Decimal.tryParse(value)` / `Decimal.safeParse(value)`
- `Decimal.isDecimal(value)`
- `Decimal.zero()` / `Decimal.one()`
- `Decimal.fromMinorUnits(value, scale)`
- `Decimal.parseLocale(value, localeOrRosetta?)`

Instance helpers:

- Arithmetic: `plus`, `minus`, `times`, `div`, `mod`, `pow`, `sqrt`
- Comparison: `cmp`, `eq`, `lt`, `lte`, `gt`, `gte`, `between`
- Bounds/sign: `min`, `max`, `clamp`, `abs`, `neg`, sign checks
- Rounding: `trunc`, `floor`, `ceil`, `round`, `toScale`, `toFixed`, `quantize`
- Finance: `toMinorUnits`, `percent`, `applyPercent`, `percentageOf`, `allocate`
- Serialization: `toParts`, `toString`, `toJSON`, `toNumber`, `toLocale`

Aggregates take either one iterable or a list of values, and nothing else — an
argument that is not a decimal is named at the call instead of failing inside
`Decimal`.

```ts
Atom.avg('1', '2', '3').toString() // "2"
Atom.median(['1', '3', '2']).toString() // "2"
Atom.mode('1', '2', '2').map(String) // ["2"]
Atom.mode([]) // []
Atom.stddev('2', '4', '4', '4', '5', '5', '7', '9').toString() // "2"
```

## Money API

`Money` binds an amount to a currency and a scale. It rejects
currency-mismatched operations, and takes its scale from ISO 4217.

```ts
import { Money, money } from '@c9up/atom'

money('19.99', 'EUR').toString() // "19.99 EUR"
Money.fromMinorUnits(1999n, 'USD').toString() // "19.99 USD"

const parts = money('10.00', 'USD').allocate([1, 1, 1])
parts.map((part) => part.toString()) // ["3.34 USD", "3.33 USD", "3.33 USD"]

money('19.99', 'USD').format({ locale: 'en-US' }) // "$19.99"
```

### The scale a currency gets

Two decimals is the answer for most currencies and the fallback for anything
unlisted, but it is not the answer for all of them. Every ISO 4217 exception is
listed, so a currency with no subunit stays whole and a currency with three
keeps all three:

```ts
money('1234', 'ISK').toMinorUnits() // 1234n — the króna has no subunit
money('1234', 'ISK').toString() // "1234 ISK"
money('10.505', 'JOD').toMinorUnits() // 10505n — the dinar has 1000 fils
```

`toMinorUnits()` is what goes into an integer column, so a wrong scale there is
a factor of a hundred, not a rounding difference. Pass `{ scale }` when your
column disagrees with ISO — a fixed-point column with four decimals on a
two-decimal currency, for instance:

```ts
money('19.99', 'EUR', { scale: 4 }).toMinorUnits() // 199900n
```

One entry follows ISO rather than the platform: ISO gives IQD three minor
units, CLDR gives it none. `format()` passes the scale to `Intl` explicitly, so
the value keeps the fils ISO says it has.

Use `{ exact: false, mode }` when a multiplication or division must round back
to the currency scale.

```ts
money('10.00', 'USD').times('1.075').toString() // "10.75 USD"
```

## Context Defaults

Atom has process-local defaults for precision and rounding. Explicit per-call
options always win.

```ts
configureAtomContext({ precision: 8, roundMode: 'trunc', quantizeMode: 'half-up' })

decimal('1').div('3').toString() // "0.33333333"

withAtomContext({ precision: 2 }, () => decimal('1').div('8').toString()) // "0.12"
```

## Locale

A locale can be named two ways — a tag `Intl` understands, or a Rosetta — and
both answer the same for the same locale. Either one supplies the separators,
the locale's own digits, and how wide its groups are.

```ts
Decimal.parseLocale('1 234,56', 'fr-FR').toString() // "1234.56"
Decimal.parseLocale('١٬٢٣٤٫٥٦', 'ar-EG').toString() // "1234.56"
Decimal.parseLocale('12,34,567', 'hi-IN').toString() // "1234567" — grouped 3-2
Decimal.parseLocale('12,34,567', i18n).toString() // "1234567" — same, via Rosetta

new Decimal('1234.56').toLocale('fr-FR') // "1 234,56" depending on locale spaces
```

Malformed grouping is rejected instead of being stripped silently, against the
grouping of the locale being read — `1,234,567` is well-formed in `en-US` and
malformed in `hi-IN`.

Atom never imports `@c9up/rosetta`: the integration is structural, so anything
exposing `getNumberFormatData()` and `formatNumberString()` works.

## Atlas

`@c9up/atom/atlas` supplies the `prepare` / `consume` callbacks an Atlas column
takes. Atlas stays agnostic; Atom owns the bridge.

```ts
import { Column } from '@c9up/atlas'
import { Decimal } from '@c9up/atom'
import { decimalColumn } from '@c9up/atom/atlas'

class Invoice {
  @Column(decimalColumn({ scale: 2, nullable: false }))
  total!: Decimal
}
```

For low-level use, `decimalAtlasAdapter` remains available.

## Runtime

Runtime order:

1. Node loads the prebuilt NAPI binary when available.
2. Browser builds load the WASM glue when available.
3. Unsupported platforms transparently use the TypeScript BigInt fallback.

Every path answers the same: the fallback is a second implementation of the
same contract, held to it by a parity suite that runs both on the same inputs.

Useful package commands:

```bash
pnpm test
pnpm test:napi
pnpm test:coverage
pnpm bench
pnpm build:wasm && node scripts/verify-wasm.mjs
```
