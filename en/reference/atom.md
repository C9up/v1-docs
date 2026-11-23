# atom

`@c9up/atom`: exact decimal arithmetic, statistics and currency-bound money values, on a Rust engine with a TypeScript fallback. Guide: [Decimals and money](/en/guides/digging-deeper/decimals).

## Installation

```bash
pnpm add @c9up/atom
```

The Rust engine loads through N-API in Node, WebAssembly in the browser and a JSI module on a phone (declared in `reamNative`, linked by `ream android:*`). Where none loads, the TypeScript engine answers with the same digits.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/atom` | `Decimal`, `Money`, the aggregates, the `Atom` namespace, the context functions and `Atom.bulk` plans. |
| `@c9up/atom/atlas` | The column adapters for `@c9up/atlas`: `decimalColumn` and `decimalAtlasAdapter`. |

## Exports

### `@c9up/atom`

| Export | Kind | Description |
|---|---|---|
| `Decimal` | class | An exact decimal value. Immutable: every operation returns a new one. |
| `decimal` | function | `decimal(value: DecimalInput): Decimal`, the same as `Decimal.from`. |
| `Money` | class | An amount bound to a currency and held at that currency's scale. |
| `money` | function | `money(amount: DecimalInput, currency: string, options?: MoneyOptions): Money`. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors) |
| `sum` | function | Exact sum. An empty input is `0`. |
| `avg` | function | Arithmetic mean. Throws on an empty input. |
| `median` | function | Middle value; the mean of the two middle values for an even count. |
| `mode` | function | The values that appear most often, sorted. `[]` when no value repeats. |
| `stddev` | function | Standard deviation, population by default. |
| `min` | function | Smallest value. Throws on an empty input. |
| `max` | function | Largest value. Throws on an empty input. |
| `Atom` | const | Namespace: `decimal`, `bulk`, `sum`, `avg`, `median`, `mode`, `stddev`, `min`, `max`, `parseLocale`, `money`. |
| `bulk` | function | Plans a computation over columns and runs it in one call into the engine. |
| `Bulk` | class | A plan: the `b` a `bulk` callback receives. |
| `BulkColumn` | class | A planned column of values. |
| `BulkScalar` | class | A planned single value. |
| `configureAtomContext` | function | Changes the default precision and rounding modes. |
| `getAtomContext` | function | A copy of the context in force. |
| `resetAtomContext` | function | Restores the defaults. |
| `withAtomContext` | function | Runs a callback under other defaults. |
| `isNativeAvailable` | function | `isNativeAvailable(): boolean`: whether the Rust engine (N-API or WASM) loaded. |
| `DecimalInput` | type | `string \| number \| bigint \| Decimal`. |
| `RoundMode` | type | `'trunc' \| 'floor' \| 'ceil' \| 'half-up' \| 'half-even'`. |
| `DecimalScaled` | interface | `{ value: bigint; scale: number }`, as `toParts()` returns it. |
| `DecimalSafeParseResult` | type | `{ success: true; value: Decimal } \| { success: false; error: Error }`. |
| `DivOptions`, `PowOptions`, `SqrtOptions` | interface | `{ precision?: number; mode?: RoundMode }`. |
| `MedianOptions` | interface | `{ precision?: number; mode?: RoundMode }`. |
| `StddevOptions` | interface | `{ sample?: boolean; precision?: number; mode?: RoundMode }`. |
| `QuantizeOptions` | interface | `{ mode?: RoundMode }`. |
| `BetweenOptions` | interface | `{ inclusive?: boolean }`, `true` by default. |
| `ToMinorUnitsOptions` | interface | `{ exact?: boolean; mode?: RoundMode }`. |
| `MoneyOptions` | interface | `{ scale?: number; exact?: boolean; mode?: RoundMode }`. |
| `MoneyRoundingOptions` | interface | `{ mode?: RoundMode }`. |
| `MoneyFormatOptions` | interface | `Intl.NumberFormatOptions` without `style` and `currency`, plus `locale?: Intl.LocalesArgument`. |
| `AtomContext` | interface | `{ precision: number; roundMode: RoundMode; quantizeMode: RoundMode; maxDigits: number }`. |
| `AtomContextOptions` | type | `Partial<AtomContext>`. |
| `BulkDivOptions` | interface | `{ precision?: number; mode?: RoundMode }`. |
| `BulkStddevOptions` | interface | `BulkDivOptions` plus `sample?: boolean`. |

Pass strings or bigints for business data: a `number` that is not a safe integer is refused.

### Aggregates

Each aggregate takes either one iterable or the values as arguments.

| Function | Signature | Description |
|---|---|---|
| `sum` | `sum(...args: [Iterable<DecimalInput>] \| DecimalInput[]): Decimal` | Exact sum, through the engine's batch entry. |
| `avg` | `avg(...args: [Iterable<DecimalInput>] \| DecimalInput[]): Decimal` | Sum divided by the count, at the context precision. |
| `median` | `median(...args: [Iterable<DecimalInput>, MedianOptions?] \| DecimalInput[]): Decimal` | Options apply only with the iterable form. |
| `mode` | `mode(...args: [Iterable<DecimalInput>] \| DecimalInput[]): Decimal[]` | Every most frequent value. |
| `stddev` | `stddev(...args: [Iterable<DecimalInput>, StddevOptions?] \| DecimalInput[]): Decimal` | `sample: true` divides by N-1 and needs two values. The mean and the variance carry eight digits more than `precision`. |
| `min` / `max` | `min(...args: [Iterable<DecimalInput>] \| DecimalInput[]): Decimal` | |

### `Decimal`

| Member | Signature | Description |
|---|---|---|
| constructor | `new Decimal(value: DecimalInput, scaleHint?: number)` | Parses the value. `scaleHint` is the scale `toParts()` reports. |
| `from` / `parse` | `static from(value: DecimalInput): Decimal` | Same as the constructor. |
| `tryParse` | `static tryParse(value: unknown): Decimal \| null` | `null` instead of throwing. |
| `safeParse` | `static safeParse(value: unknown): DecimalSafeParseResult` | A result object instead of throwing. |
| `isDecimal` | `static isDecimal(value: unknown): value is Decimal` | |
| `sum` | `static sum(values: Iterable<DecimalInput>): Decimal` | The whole batch in one call into the engine; equal to folding `plus`. |
| `dot` | `static dot(a: Iterable<DecimalInput>, b: Iterable<DecimalInput>): Decimal` | `Σ aᵢ·bᵢ` in one call. Throws when the lengths differ. |
| `zero` / `one` | `static zero(): Decimal` | |
| `fromMinorUnits` | `static fromMinorUnits(value: string \| number \| bigint, scale: number): Decimal` | `fromMinorUnits(1999n, 2)` is `19.99`. |
| `parseLocale` | `static parseLocale(value: string, localesOrRosetta?: Intl.LocalesArgument \| RosettaLike): Decimal` | Parses `'1.234,56'` in the locale's separators. A rosetta instance can stand for the locale. |
| `plus` / `minus` / `times` | `plus(other: DecimalInput): Decimal` | Exact. |
| `div` | `div(other: DecimalInput, options?: DivOptions): Decimal` | Rounded once, from the exact quotient, to `precision` digits in `mode`. |
| `mod` | `mod(other: DecimalInput): Decimal` | |
| `pow` | `pow(exp: number, options?: PowOptions): Decimal` | Integer exponent up to `MAX_EXPONENT_ABS` (100 000) either sign; a negative one divides. |
| `sqrt` | `sqrt(options?: SqrtOptions): Decimal` | |
| `cmp` | `cmp(other: DecimalInput): -1 \| 0 \| 1` | |
| `eq` / `lt` / `lte` / `gt` / `gte` | `eq(other: DecimalInput): boolean` | |
| `min` / `max` | `min(other: DecimalInput): Decimal` | |
| `clamp` | `clamp(min: DecimalInput, max: DecimalInput): Decimal` | Throws when `min > max`. |
| `between` | `between(min: DecimalInput, max: DecimalInput, options?: BetweenOptions): boolean` | Inclusive by default. |
| `abs` / `neg` | `abs(): Decimal` | |
| `isZero` / `isPositive` / `isNegative` / `isInteger` | `isZero(): boolean` | `isPositive()` is false for zero. |
| `trunc` / `floor` / `ceil` | `trunc(scale = 0): Decimal` | Rounds to `scale` digits in that mode. |
| `round` / `toScale` | `toScale(scale = 0, mode?: RoundMode): Decimal` | Rounds to `scale` digits, in the context's `roundMode` by default. |
| `quantize` | `quantize(step: DecimalInput, options?: QuantizeOptions): Decimal` | Nearest multiple of `step` (`'0.05'`), in the context's `quantizeMode` by default. |
| `toFixed` | `toFixed(scale: number, mode?: RoundMode): string` | Exactly `scale` fractional digits. |
| `toMinorUnits` | `toMinorUnits(scale: number, options?: ToMinorUnitsOptions): bigint` | Throws on a loss of digits unless `exact: false`, which rounds in `mode` (`'trunc'` by default). |
| `percent` | `percent(rate: DecimalInput, options?: DivOptions): Decimal` | `this × rate / 100`. |
| `applyPercent` | `applyPercent(rate: DecimalInput, options?: DivOptions): Decimal` | `this + this × rate / 100`. |
| `percentageOf` | `percentageOf(total: DecimalInput, options?: DivOptions): Decimal` | `this / total × 100`. |
| `allocate` | `allocate(ratios: Array<string \| number \| bigint>): Decimal[]` | Splits by integer ratios; the shares add up to the value exactly, the remainder going to the largest remainders first. |
| `toParts` | `toParts(): DecimalScaled` | Integer value and scale. |
| `toString` / `toJSON` | `toString(): string` | Canonical form, trailing zeros trimmed (`'1.2300'` prints `'1.23'`). |
| `toNumber` | `toNumber(): number` | Lossy past 15 to 16 significant digits. |
| `toLocale` | `toLocale(localesOrRosetta?: Intl.LocalesArgument \| RosettaLike, options?: Intl.NumberFormatOptions): string` | Exact localized formatting. |

The scale of a value is not kept through arithmetic: to store or to allocate, pass the scale your column declares (`toFixed(2)`, `toScale(2)`).

### `Money`

The scale comes from ISO 4217 (`JPY` and `ISK` 0, `JOD` and `KWD` 3, 2 for any currency not listed); `scale` overrides it. Operations across two currencies, or two scales, throw.

| Member | Signature | Description |
|---|---|---|
| constructor | `new Money(amount: DecimalInput, currency: string, options?: MoneyOptions)` | `currency` is a three-letter code. With `exact` (the default), an amount with more digits than the scale throws; `exact: false` rounds in `mode`. |
| `fromMajor` | `static fromMajor(amount: DecimalInput, currency: string, options?: MoneyOptions): Money` | Same as the constructor. |
| `fromMinorUnits` | `static fromMinorUnits(minorUnits: string \| number \| bigint, currency: string, options?: Omit<MoneyOptions, 'exact'>): Money` | `fromMinorUnits(1999n, 'EUR')` is `19.99 EUR`. |
| `amount` | `get amount(): Decimal` | |
| `currency` | `get currency(): string` | Upper-case code. |
| `scale` | `get scale(): number` | |
| `plus` / `minus` | `plus(other: Money): Money` | |
| `times` | `times(multiplier: DecimalInput, options?: MoneyRoundingOptions): Money` | Rounded to the currency's scale. |
| `div` | `div(divisor: DecimalInput, options?: MoneyRoundingOptions): Money` | Rounded once to the currency's scale. |
| `allocate` | `allocate(ratios: Array<string \| number \| bigint>): Money[]` | No cent lost: `10.00` by `[1, 1, 1]` is `3.34`, `3.33`, `3.33`. |
| `toMinorUnits` | `toMinorUnits(): bigint` | The integer to store. |
| `format` | `format(options?: MoneyFormatOptions): string` | `Intl` currency formatting at the currency's scale. |
| `toString` | `toString(): string` | `'19.99 EUR'`. |
| `toJSON` | `toJSON(): { amount: string; currency: string }` | |

### `bulk`

```ts
function bulk<T extends Readonly<Record<string, BulkScalar>>>(build: (b: Bulk) => T): { [K in keyof T]: Decimal }
function bulk(): Bulk
```

The callback form plans and runs once. Without a callback, it returns the plan, to run more than once. Planned values refuse `toString()`, `valueOf()` and `toJSON()` until the plan has run. The plan runs on the Rust engine within a 128-bit width and re-runs on the BigInt executor when a value is wider.

| `Bulk` member | Signature | Description |
|---|---|---|
| `column` | `column(values: Iterable<DecimalInput>): BulkColumn` | Every column of one plan has the same length. |
| `minorUnits` | `minorUnits(values: Iterable<string \| number \| bigint>, scale: number): BulkColumn` | A column held as minor units; the fastest way in. |
| `of` | `of(value: DecimalInput): BulkScalar` | A single value. |
| `run` | `run<T>(outputs: T): { [K in keyof T]: Decimal }` | Computes the named outputs. |
| `runAsync` | `runAsync<T>(outputs: T): Promise<{ [K in keyof T]: Decimal }>` | Off the JS thread where the engine can (the JSI module on a phone); otherwise `run`. |

| `BulkColumn` member | Description |
|---|---|
| `plus`, `minus`, `times` | Element-wise, with a column or a scalar. |
| `neg`, `abs`, `sorted` | A new column. |
| `sum`, `min`, `max` | A scalar. |
| `dot(other: BulkColumn)` | `Σ aᵢ·bᵢ` in one pass. |
| `at(index: number)` | One element; throws outside the column. |
| `avg(options?)`, `median(options?)` | Take `BulkDivOptions`. |
| `percentile(fraction: number)` | Nearest rank, `fraction` in `[0, 1]`. |
| `stddev(options?: BulkStddevOptions)` | Same definition as `stddev`. |

`BulkScalar` has `plus`, `minus`, `times`, `div(other, options?)`, `neg`, `abs`, `min`, `max`, `pow(exp, options?)` and `sqrt(options?)`.

### `@c9up/atom/atlas`

| Export | Kind | Description |
|---|---|---|
| `decimalColumn` | function | `decimalColumn(options?: DecimalColumnOptions): DecimalAtlasColumn`: the argument of `@Column(...)` for a decimal column. |
| `decimalAtlasAdapter` | const | `{ consume, prepare }` without scale or nullability; frozen. |
| `DecimalColumnOptions` | interface | See below. |
| `DecimalAtlasAdapter` | interface | `{ consume(raw: unknown): Decimal \| null; prepare(value: unknown): string \| null }`. |
| `DecimalAtlasColumn` | interface | `DecimalAtlasAdapter` plus `type: 'decimal' \| 'numeric'` and `nullable: boolean`. |

`prepare` refuses anything that is not a `Decimal`, so a plain number never reaches the column. Configure the database driver to return decimal columns as strings: a value that arrives as a JS `number` has lost its digits already.

| `DecimalColumnOptions` | Type | Default | Description |
|---|---|---|---|
| `scale` | `number` | none | Scale the value is held at, read and written. |
| `exact` | `boolean` | `true` | Throw on a value with more digits than `scale`; `false` rounds. |
| `mode` | `RoundMode` | `'half-up'` | Rounding when `exact` is `false`. |
| `nullable` | `boolean` | `true` | `false` throws on a `null` either way. |
| `columnType` | `'decimal' \| 'numeric'` | `'decimal'` | The column type the binds cast to. |

## Configuration

The context sets the defaults of `div`, `pow`, `sqrt`, `quantize` and the aggregates. `configureAtomContext` changes them for the process, or for the current `withAtomContext` scope only; on Node an async callback keeps its scope across `await`.

```ts
configureAtomContext(options: AtomContextOptions): AtomContext
withAtomContext<T>(options: AtomContextOptions, callback: () => T): T
getAtomContext(): AtomContext
resetAtomContext(): AtomContext
```

| Option | Type | Default | Description |
|---|---|---|---|
| `precision` | `number` | `18` | Fractional digits of a quotient, a root or a negative power. |
| `roundMode` | `RoundMode` | `'half-up'` | Rounding of those results and of `toScale`, `toFixed`. |
| `quantizeMode` | `RoundMode` | `'half-up'` | Rounding of `quantize` and of `Money`. |
| `maxDigits` | `number` | `20000` | Most significant digits an input may carry; longer input is refused (ceiling 1 000 000). |

## Errors

| Code | Raised when |
|---|---|
| [`E_ATOM_INVALID_INPUT`](/en/reference/errors#e-atom-invalid-input) | A value given as a decimal is not a string, number, bigint or `Decimal` |
| [`E_ATOM_INVALID_DECIMAL`](/en/reference/errors#e-atom-invalid-decimal) | A string or number does not read as a decimal (`parseLocale` included) |
| [`E_ATOM_UNSAFE_INTEGER`](/en/reference/errors#e-atom-unsafe-integer) | A JavaScript number is an integer past `Number.MAX_SAFE_INTEGER`; pass a string or a bigint |
| [`E_ATOM_INVALID_INTEGER`](/en/reference/errors#e-atom-invalid-integer) | Minor units are not a whole number |
| [`E_ATOM_DECIMAL_TOO_LARGE`](/en/reference/errors#e-atom-decimal-too-large) | A value or a result is past the `maxDigits` significant-digit bound |
| [`E_ATOM_INVALID_SCALE`](/en/reference/errors#e-atom-invalid-scale) | A scale or a precision is not a whole number from 0 to 10 000 |
| [`E_ATOM_INVALID_EXPONENT`](/en/reference/errors#e-atom-invalid-exponent) | A `pow` exponent is not a whole number in range |
| [`E_ATOM_INVALID_ROUNDING_MODE`](/en/reference/errors#e-atom-invalid-rounding-mode) | A rounding mode is not one atom knows |
| [`E_ATOM_INVALID_RANGE`](/en/reference/errors#e-atom-invalid-range) | `clamp` / `between` got a minimum greater than the maximum |
| [`E_ATOM_INVALID_STEP`](/en/reference/errors#e-atom-invalid-step) | A `quantize` step is not greater than zero |
| [`E_ATOM_INVALID_RATIOS`](/en/reference/errors#e-atom-invalid-ratios) | `allocate` got no ratio, a negative one, or none positive |
| [`E_ATOM_PRECISION_LOSS`](/en/reference/errors#e-atom-precision-loss) | `toMinorUnits` (and an exact `Money`) would lose digits at that scale |
| [`E_ATOM_LENGTH_MISMATCH`](/en/reference/errors#e-atom-length-mismatch) | `Decimal.dot` got two lists of different lengths |
| [`E_ATOM_DIVISION_BY_ZERO`](/en/reference/errors#e-atom-division-by-zero) | A division or a modulo by zero |
| [`E_ATOM_NEGATIVE_SQRT`](/en/reference/errors#e-atom-negative-sqrt) | `sqrt` of a negative value |
| [`E_ATOM_EMPTY_INPUT`](/en/reference/errors#e-atom-empty-input) | `avg`, `min`, `max`, `median` or `stddev` got no value |
| [`E_ATOM_TOO_FEW_VALUES`](/en/reference/errors#e-atom-too-few-values) | A sample `stddev` got fewer than two values |
| [`E_ATOM_INVALID_CONTEXT`](/en/reference/errors#e-atom-invalid-context) | `configureAtomContext` / `withAtomContext` got a setting that is not valid |
| [`E_ATOM_INVALID_CURRENCY`](/en/reference/errors#e-atom-invalid-currency) | A currency code is not three letters |
| [`E_ATOM_CURRENCY_MISMATCH`](/en/reference/errors#e-atom-currency-mismatch) | Two `Money` values of different currencies or scales were combined |
| [`E_ATOM_INVALID_COLUMN_VALUE`](/en/reference/errors#e-atom-invalid-column-value) | The Atlas adapter got a column value of the wrong type |
| [`E_ATOM_NULL_COLUMN_VALUE`](/en/reference/errors#e-atom-null-column-value) | A non-nullable `decimalColumn` got `null` |
| [`E_ATOM_ENGINE_NOT_FOUND`](/en/reference/errors#e-atom-engine-not-found) | `nativeAtom()` found no native engine (N-API, WASM or the phone's JSI module) |
| [`E_ATOM_NAPI_DISABLED`](/en/reference/errors#e-atom-napi-disabled) | `nativeAtom()` ran while a test disabled the native engine |
| [`E_ATOM_INTERNAL`](/en/reference/errors#e-atom-internal) | An internal invariant broke, or the native engine panicked (a bug in atom) |
| [`E_ATOM_BULK_NOT_RUN`](/en/reference/errors#e-atom-bulk-not-run) | A planned value was read before `run()` |
| [`E_ATOM_BULK_NO_OUTPUT`](/en/reference/errors#e-atom-bulk-no-output) | `run()` got no value to compute |
| [`E_ATOM_BULK_BAD_OUTPUT`](/en/reference/errors#e-atom-bulk-bad-output) | `run()` got something that is not a planned value |
| [`E_ATOM_BULK_LENGTH_MISMATCH`](/en/reference/errors#e-atom-bulk-length-mismatch) | A plan's columns have different lengths |
| [`E_ATOM_BULK_EMPTY_COLUMN`](/en/reference/errors#e-atom-bulk-empty-column) | A column has no value |
| [`E_ATOM_BULK_BAD_INDEX`](/en/reference/errors#e-atom-bulk-bad-index) | `at()` is outside the column |
| [`E_ATOM_BULK_BAD_PERCENTILE`](/en/reference/errors#e-atom-bulk-bad-percentile) | A percentile is not a fraction between 0 and 1 |
| [`E_ATOM_BULK_BAD_EXPONENT`](/en/reference/errors#e-atom-bulk-bad-exponent) | A planned `pow` exponent is not a whole number in range |
| [`E_ATOM_BULK_BAD_PRECISION`](/en/reference/errors#e-atom-bulk-bad-precision) | A planned precision is not a whole number from 0 to 10 000 |
| [`E_ATOM_BULK_BAD_SCALE`](/en/reference/errors#e-atom-bulk-bad-scale) | `minorUnits()` got a scale that is not one |
| [`E_ATOM_BULK_NOT_MINOR_UNITS`](/en/reference/errors#e-atom-bulk-not-minor-units) | `minorUnits()` got a value that is not a whole number of minor units |
| [`E_ATOM_BULK_TOO_SHORT`](/en/reference/errors#e-atom-bulk-too-short) | A planned sample standard deviation has fewer than two values |
| [`E_ATOM_BULK_NO_LENGTH`](/en/reference/errors#e-atom-bulk-no-length) | A column was built with no source (a bug in atom) |
| [`E_ATOM_BULK_BAD_PROGRAM`](/en/reference/errors#e-atom-bulk-bad-program) | The TypeScript evaluator or the native engine met a malformed plan (a bug in atom) |
| [`E_ATOM_BULK_LOST_OUTPUT`](/en/reference/errors#e-atom-bulk-lost-output) | A run returned fewer values than it was asked for (a bug in atom) |

Each one is a class of the `errors` namespace and a `@c9up/flare` `Exception` with status 500: branch on `error.code` or on `error instanceof errors.E_ATOM_*`. The Rust engine and the TypeScript engine raise the same errors; a refusal of the Rust engine keeps its original error as `cause`.

## Migration

- `AtomError` is gone: test `error.code`, or `error instanceof errors.E_ATOM_*` with `import { errors } from '@c9up/atom'`.
- `AtomTypeError` is gone, and the Atlas adapter's refusals are no longer a `TypeError`: replace `instanceof TypeError` with `error.code === 'E_ATOM_INVALID_COLUMN_VALUE'` (or `E_ATOM_NULL_COLUMN_VALUE`).
- A refusal of the Rust engine (division by zero, negative root...) now carries its `E_ATOM_*` code instead of none: code that matched its message can test the code.

## See also

- [Decimals and money](/en/guides/digging-deeper/decimals)
- [Relations](/en/guides/database/orm/relations)
