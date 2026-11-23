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
| [`E_CHRONOS_INVALID_DATE`](/en/reference/errors#e-chronos-invalid-date) | `isHoliday` got a string that is not `YYYY-MM-DD`. |

The other refusals carry no code: a `RangeError` for a field out of range, an unknown zone or a string that does not parse; a `TypeError` for an input of the wrong type; an `Error` for an interval whose start is after its end. A missing native engine throws an `Error` whose message starts with `[CHRONOS_ENGINE_REQUIRED]`.

## See also

- [Dates](/en/guides/digging-deeper/dates)
- [Entities: date columns](/en/guides/database/orm/entities)
