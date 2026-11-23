# chronos

`@c9up/chronos`: dates, durations, intervals, recurrence rules and public holidays, on a Rust engine that handles time zones, parsing and formatting. Guide: [Dates](/en/guides/digging-deeper/dates).

## Installation

```bash
pnpm add @c9up/chronos
```

chronos has no provider and no configuration. The native engine ships prebuilt in the package.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/chronos` | `DateTime`, `Duration`, `Interval`, range helpers, recurrence rules, holidays, `Chronos`, `at` |
| `@c9up/chronos/atlas` | `dateTimeAtlasAdapter`, the column adapter for atlas |

## Exports

### `@c9up/chronos`

| Export | Kind | Description |
|---|---|---|
| `DateTime` | class | An immutable instant with a zone and a locale. |
| `Duration` | class | An immutable amount of time in calendar units. |
| `Interval` | class | A half-open span between two `DateTime`s. |
| `inRange` | function | `inRange(input: DateInput, range: DateRange, options?: RangeCompareOptions): boolean`. |
| `containsRange` | function | `containsRange(outer: DateRange, inner: DateRange, options?: RangeCompareOptions): boolean`. |
| `overlapsRange` | function | `overlapsRange(a: DateRange, b: DateRange, options?: RangeCompareOptions): boolean`. |
| `analyzeRange` | function | `analyzeRange(a: DateRange, b: DateRange, options?: RangeCompareOptions): RangeRelation`. |
| `expandRRule` | function | `expandRRule(start: DateInput, rrule: string \| RRuleBuild, options?: number \| ExpandRRuleOptions): string[]`, or `expandRRule(rule: string, options?)` with `DTSTART` in the text. Occurrences as UTC ISO strings. |
| `toRRuleString` | function | `toRRuleString(rule: RRuleBuild): string`: an `RRULE:` line from fields, each checked. |
| `holidays` | function | `holidays(year: number, options: HolidayOptions): Holiday[]`: the public holidays of a country (and Swiss canton) for a year. |
| `isHoliday` | function | `isHoliday(date: string \| DateTime, options: HolidayOptions): boolean`. |
| `easterDate` | function | `easterDate(year: number): string`: Gregorian Easter Sunday as `YYYY-MM-DD`, years 1583 to 9999. |
| `SWISS_CANTONS` | const | The 26 two-letter canton codes. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors). Each is a flare `Exception` with a string `code`. |
| `at` | function | `at(input?: string \| Date): DateTime`. |
| `Chronos` | const | Shortcuts: `at`, `now`, `parse`, `add`, `subtract`, `diff`, `inRange`, `rangeContains`, `rangesOverlap`, `rangeRelation`, `rrule`, `buildRRule`. |
| `DateInput` | type | `string \| Date \| DateTime`. |
| `DateUnit` | type | `'second' \| 'minute' \| 'hour' \| 'day' \| 'week' \| 'month' \| 'year'`. |
| `BoundUnit` | type | The same units, for `startOf`, `endOf`, `hasSame`. |
| `DateRange` | interface | `{ start: DateInput; end: DateInput }`. |
| `RangeCompareOptions` | interface | `{ inclusiveStart?: boolean; inclusiveEnd?: boolean }`. |
| `RangeRelation` | interface | `{ overlaps; aContainsB; bContainsA; aStartInB; aEndInB; bStartInA; bEndInA }`, all booleans. |
| `CalendarParts` | interface | `{ year; month; day; hour; minute; second; millisecond; weekday; weekNumber; weekYear }`. |
| `RelativeUnit` | type | `'years' \| 'months' \| 'weeks' \| 'days' \| 'hours' \| 'minutes' \| 'seconds'`. |
| `RelativeUnitLike` | type | A `RelativeUnit`, plural or singular. |
| `RelativeRounding` | type | `'trunc' \| 'expand' \| 'round' \| 'floor' \| 'ceil'`. |
| `ToRelativeOptions` | interface | `{ base?; locale?; style?; numberingSystem?; unit?; round?; rounding?; padding? }`. |
| `ToRelativeCalendarOptions` | interface | `{ base?; locale?; style?; numberingSystem?; unit? }`. |
| `DurationObject` | interface | `{ years?; months?; weeks?; days?; hours?; minutes?; seconds?; milliseconds? }`, all numbers. |
| `DurationUnit` | type | `keyof DurationObject`. |
| `DurationUnitLike` | type | A `DurationUnit`, plural or singular. |
| `RRuleBuild` | interface | `{ freq; interval?; wkst?; byDay?; byMonthDay?; byMonth?; byWeekNo?; byYearDay?; bySetPos?; byHour?; byMinute?; bySecond?; count?; until? }`. |
| `ExpandRRuleOptions` | interface | `{ limit?: number; tzid?: string }`: `limit` 1 to 10 000, default 100; `tzid` the zone whose wall clock the rule runs on. |
| `Holiday` | interface | `{ date: string; key: HolidayKey }`. |
| `HolidayKey` | type | A stable holiday identifier (`'new_year'`, `'easter_monday'`, `'national_day'`…). |
| `HolidayCountry` | type | `'CH' \| 'FR'`. |
| `HolidayOptions` | type | `{ country: 'CH'; region?: SwissCanton } \| { country: 'FR'; region?: undefined }`. |
| `SwissCanton` | type | One of `SWISS_CANTONS`. |

### `@c9up/chronos/atlas`

| Export | Kind | Description |
|---|---|---|
| `dateTimeAtlasAdapter` | const | `{ consume(raw: unknown): DateTime \| null; prepare(value: unknown): string \| null }`. Reads a string, `Date`, number or bigint into a `DateTime`; writes a `DateTime` as a UTC ISO string. |

### `DateTime`

`new DateTime(input?: string | Date, zone = 'UTC')`. Every method returns a new value.

| Member | Signature | Description |
|---|---|---|
| `from` | `static from(input: DateInput): DateTime` | From any input. |
| `now` | `static now(zone?: string): DateTime` | The current instant. |
| `local` | `static local(year?: number, month = 1, day = 1, hour = 0, minute = 0, second = 0, millisecond = 0): DateTime` | Now, or a wall clock, in the host's zone. |
| `utc` | `static utc(year?: number, month = 1, …): DateTime` | Same, in UTC. |
| `fromMillis` / `fromSeconds` / `fromUnix` | `static fromMillis(ms: number): DateTime` | From an epoch value. |
| `fromJSDate` | `static fromJSDate(date: Date): DateTime` | From a `Date`. |
| `fromISO` | `static fromISO(text: string, options?: { zone?: string }): DateTime` | Strict ISO 8601. |
| `fromObject` | `static fromObject(obj: { year; month; day; hour?; minute?; second?; millisecond? }, options?: { zone?: string }): DateTime` | From calendar fields, each range-checked. |
| `fromSQL` | `static fromSQL(input: string, options?: { zone?: string }): DateTime` | From a SQL date or timestamp. |
| `fromHTTP` | `static fromHTTP(input: string): DateTime` | From an HTTP date. |
| `fromFormat` | `static fromFormat(text: string, format: string, options?: { zone?: string; locale?: string }): DateTime` | Parse with a format. |
| `zoneName` / `offset` / `locale` | getters | Zone name, UTC offset in minutes, locale. |
| `setZone` | `setZone(zone: string, options?: { keepLocalTime?: boolean }): DateTime` | Same instant in another zone, or the same wall clock with `keepLocalTime`. |
| `toUTC` | `toUTC(): DateTime` | |
| `setLocale` | `setLocale(locale: string): DateTime` | |
| `isValid` | `get isValid(): boolean` | |
| `set` | `set(values: { year?; month?; day?; hour?; minute?; second?; millisecond? }): DateTime` | Replace calendar fields. |
| `plus` / `minus` | `plus(amount: number, unit: DateUnit): DateTime` or `plus(duration: Duration \| DurationObject): DateTime` | Calendar arithmetic. |
| `diff` | `diff(other: DateInput, unit?: DateUnit \| DurationUnit \| 'millisecond' \| ReadonlyArray<…>): Duration` | Difference, in milliseconds by default. |
| `equals` / `isBefore` / `isAfter` | `equals(other: DateInput): boolean` | |
| `hasSame` | `hasSame(other: DateInput, unit: BoundUnit): boolean` | Same calendar unit. |
| `isSameDay` | `isSameDay(other: DateInput): boolean` | |
| `startOf` / `endOf` | `startOf(unit: BoundUnit): DateTime` | |
| `isWithin` | `isWithin(range: DateRange, options?: RangeCompareOptions): boolean` | |
| `format` | `format(pattern = 'YYYY-MM-DD HH:mm:ss'): string` | `YYYY`-style tokens. |
| `toFormat` | `toFormat(pattern: string): string` | `yyyy`-style tokens (`yyyy-MM-dd HH:mm`, `dd LLL yyyy`, `EEEE`, `ZZ`); `'quoted'` text is literal. |
| `toISO` / `toISOTime` | `toISO(options?: { suppressMilliseconds?: boolean; includeOffset?: boolean }): string` | |
| `toISODate` / `toZonedISO` | `toISODate(): string` | |
| `toSQL` / `toSQLDate` / `toSQLTime` | `toSQL(options?: { includeOffset?: boolean }): string` | |
| `toDate` / `toMillis` / `toSeconds` / `valueOf` | `toMillis(): number` | |
| `toString` / `toJSON` | `toJSON(): string` | ISO string. |
| `toLocaleString` | `toLocaleString(locale?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions): string` | |
| `toRelative` | `toRelative(options?: ToRelativeOptions): string` | "in 3 days", "2 hours ago". |
| `toRelativeCalendar` | `toRelativeCalendar(options?: ToRelativeCalendarOptions): string` | "tomorrow", "last week". |
| `calendar` | `get calendar(): CalendarParts` | Every field at once. |
| `year` … `millisecond`, `weekday`, `weekNumber`, `weekYear`, `ordinal`, `quarter`, `daysInMonth`, `daysInYear`, `isInLeapYear` | getters | Calendar fields on the value's wall clock. |

### `Duration`

| Member | Signature | Description |
|---|---|---|
| `fromObject` | `static fromObject(obj: DurationObject): Duration` | |
| `fromMillis` | `static fromMillis(ms: number): Duration` | |
| `fromISO` | `static fromISO(iso: string): Duration` | `P1DT2H`. |
| `years` … `milliseconds` | getters | Each unit. |
| `get` | `get(unit: DurationUnitLike): number` | |
| `toObject` | `toObject(): Required<DurationObject>` | |
| `plus` / `minus` | `plus(other: Duration \| DurationObject \| number): Duration` | |
| `negate` | `negate(): Duration` | |
| `mapUnits` | `mapUnits(fn: (value: number, unit: DurationUnit) => number): Duration` | |
| `normalize` | `normalize(): Duration` | Carry overflow upward and balance mixed signs; years, months and weeks are kept. |
| `shiftTo` | `shiftTo(...requested: DurationUnitLike[]): Duration` | Express in the given units. |
| `shiftToAll` | `shiftToAll(): Duration` | Spread over every unit. |
| `rescale` | `rescale(): Duration` | The largest units that fit. |
| `as` | `as(unit: DurationUnitLike): number` | The whole duration in one unit. |
| `toMillis` / `valueOf` | `toMillis(): number` | |
| `toISO` / `toString` / `toJSON` | `toISO(): string` | |
| `toFormat` | `toFormat(pattern: string): string` | `[bracketed]` text is literal. |
| `toHuman` | `toHuman(): string` | "2 hours, 15 minutes", in English. |

### `Interval`

| Member | Signature | Description |
|---|---|---|
| `fromDateTimes` | `static fromDateTimes(start: DateInput, end: DateInput): Interval` | |
| `after` / `before` | `static after(start: DateInput, duration: Duration \| DurationObject \| { amount: number; unit: DateUnit }): Interval` | |
| `fromISO` | `static fromISO(text: string, options?: { zone?: string }): Interval` | `start/end`. |
| `merge` | `static merge(intervals: readonly Interval[]): Interval[]` | Join overlapping and abutting intervals. |
| `xor` | `static xor(intervals: readonly Interval[]): Interval[]` | Time covered by exactly one. |
| `start` / `end` | getters | |
| `length` | `length(unit?: DurationUnit \| DateUnit): number` | In milliseconds by default. |
| `count` | `count(unit: DateUnit): number` | Units touched, partial ones included. |
| `toDuration` | `toDuration(): Duration` | |
| `contains` / `isBefore` / `isAfter` | `contains(dt: DateInput): boolean` | |
| `isEmpty` | `isEmpty(): boolean` | Zero length. |
| `overlaps` / `engulfs` / `abutsStart` / `abutsEnd` | `overlaps(other: Interval): boolean` | |
| `intersection` | `intersection(other: Interval): Interval \| null` | |
| `union` | `union(other: Interval): Interval` | |
| `difference` | `difference(...intervals: Interval[]): Interval[]` | Parts none of them covers. |
| `splitBy` | `splitBy(duration: Duration \| DurationObject \| { amount: number; unit: DateUnit }): Interval[]` | |
| `splitAt` | `splitAt(...dts: DateInput[]): Interval[]` | |
| `toString` / `toJSON` | `toJSON(): { start: string; end: string }` | |

## Errors

| Code | Raised when |
|---|---|
| [`E_CHRONOS_INVALID_YEAR`](/en/reference/errors#e-chronos-invalid-year) | `easterDate` or `holidays` got a year that is not an integer from 1583 to 9999. |
| [`E_CHRONOS_UNKNOWN_COUNTRY`](/en/reference/errors#e-chronos-unknown-country) | `holidays` or `isHoliday` got a country without a holiday calendar. |
| [`E_CHRONOS_UNKNOWN_REGION`](/en/reference/errors#e-chronos-unknown-region) | The region is not a Swiss canton code, or a region was given for `FR`. |
| [`E_CHRONOS_INVALID_DATE`](/en/reference/errors#e-chronos-invalid-date) | A date that does not exist or does not parse: `2026-02-30`, a field out of range, a string `fromFormat` cannot match, an `Invalid Date`, a `NaN` instant; or `isHoliday` got a string that is not `YYYY-MM-DD`. |
| [`E_CHRONOS_ENGINE_REQUIRED`](/en/reference/errors#e-chronos-engine-required) | The Chronos engine (the NAPI binary in Node, the WASM build in a browser) did not load. |
| [`E_CHRONOS_INVALID_ARGUMENT`](/en/reference/errors#e-chronos-invalid-argument) | An argument has the wrong type (`fromMillis("12")`, `fromFormat` without a string, `expandRRule(rule, options)` without the rule text), or `toRelative` got an unknown `rounding`. |
| [`E_CHRONOS_OUT_OF_RANGE`](/en/reference/errors#e-chronos-out-of-range) | A value or a `plus`/`minus` result falls outside years 0000-9999. |
| [`E_CHRONOS_CONFLICTING_FIELDS`](/en/reference/errors#e-chronos-conflicting-fields) | A format mixes fields that contradict each other: a meridiem with a 24-hour hour, week fields with year/month/day, an ordinal with month/day. |
| [`E_CHRONOS_UNSUPPORTED_UNIT`](/en/reference/errors#e-chronos-unsupported-unit) | A unit chronos does not know (`fortnight`) was given to `plus`, `diff`, `toRelative`, `Duration` or an `Interval` method. |
| [`E_CHRONOS_MISSING_UNIT`](/en/reference/errors#e-chronos-missing-unit) | `plus(amount)` / `minus(amount)` without a unit, or `diff` / `toRelative` with an empty unit list. |
| [`E_CHRONOS_INVALID_UNIT_VALUE`](/en/reference/errors#e-chronos-invalid-unit-value) | A unit amount is not a finite number (`NaN`, `Infinity`, a string). |
| [`E_CHRONOS_INVALID_DURATION`](/en/reference/errors#e-chronos-invalid-duration) | A duration that cannot be read or used: an ISO 8601 duration that does not parse, a value that is not an object of units, a non-positive `splitBy` step. |
| [`E_CHRONOS_INVALID_INTERVAL`](/en/reference/errors#e-chronos-invalid-interval) | An `Interval` whose start is after its end, or an ISO 8601 interval that does not parse. |
| [`E_CHRONOS_INVALID_RANGE`](/en/reference/errors#e-chronos-invalid-range) | A `DateRange` given to `inRange`, `containsRange`, `overlapsRange` or `analyzeRange` starts after it ends. |
| [`E_CHRONOS_INVALID_LOCALE`](/en/reference/errors#e-chronos-invalid-locale) | `setLocale` got a tag `Intl` does not accept. |
| [`E_CHRONOS_INVALID_RRULE`](/en/reference/errors#e-chronos-invalid-rrule) | `toRRuleString` (or `expandRRule` with a structured rule) got a field it cannot write into the rule text. |
| [`E_CHRONOS_INVALID_RRULE_LIMIT`](/en/reference/errors#e-chronos-invalid-rrule-limit) | The `expandRRule` limit is not a positive integer. |
| [`E_CHRONOS_RRULE_LIMIT_EXCEEDED`](/en/reference/errors#e-chronos-rrule-limit-exceeded) | The `expandRRule` limit is above the 10,000 cap. |
| [`E_CHRONOS_INVALID_COLUMN_VALUE`](/en/reference/errors#e-chronos-invalid-column-value) | The atlas `DateTime` column adapter read a database value of an unexpected type, or was asked to store something other than a `DateTime`. |
| [`E_CHRONOS_UNKNOWN_ZONE`](/en/reference/errors#e-chronos-unknown-zone) | A zone the tz database does not know: `new DateTime(input, zone)`, `DateTime.now(zone)`, `setZone`, `fromSQL`, the `tzid` of `expandRRule` or a `TZID` in its text. |
| [`E_CHRONOS_UNREADABLE_RRULE`](/en/reference/errors#e-chronos-unreadable-rrule) | `expandRRule` got rule text the engine cannot read or expand: an unknown or repeated property, a value out of range, no start, a rule over the size limit. |
| [`E_CHRONOS_INTERNAL`](/en/reference/errors#e-chronos-internal) | The engine answered something chronos does not expect (a bug in chronos, not in your code). |

Every code is on `error.code`, and each code is a class of the `errors` namespace: `error instanceof errors.E_CHRONOS_INVALID_DATE`, with `import { errors } from '@c9up/chronos'`. Each is a flare `Exception`.

The Rust engine's refusals reach you with the same codes: chronos reads the engine's message back into the matching error, the engine's own failure kept as `cause`.

## Migration

- `ChronosError`, `ChronosTypeError` and `ChronosRangeError` are gone. Replace `instanceof ChronosError` (or one of the other two) with a test on `error.code`, or with `instanceof errors.E_CHRONOS_...`, `errors` coming from `@c9up/chronos`.
- A refusal is no longer a `TypeError` or a `RangeError`: `catch (e) { if (e instanceof RangeError) ... }` must test the code instead.
- The engine's refusals no longer carry `code: 'GenericFailure'` with the code at the start of the message: an unknown zone is `E_CHRONOS_UNKNOWN_ZONE`, unreadable rule text `E_CHRONOS_UNREADABLE_RRULE`, a date-arithmetic result outside 0000-9999 `E_CHRONOS_OUT_OF_RANGE`, and `E_CHRONOS_UNKNOWN_COUNTRY`, `E_CHRONOS_UNKNOWN_REGION`, `E_CHRONOS_INVALID_YEAR`, `E_CHRONOS_INVALID_DATE` are on `error.code`, no longer in the message.

## See also

- [Dates](/en/guides/digging-deeper/dates)
- [Entities: date columns](/en/guides/database/orm/entities)
