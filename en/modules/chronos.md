# Chronos — DateTime & Recurrence

Status: **Present (TS + Rust N-API)**.

- Package: `@c9up/chronos`
- Goal: advanced calendar operations (date math + RRULE recurrence), not a basic Date wrapper.

## Quick Examples

Date math:

```ts
import { Chronos } from '@c9up/chronos'

const invoiceDate = Chronos.parse('2026-01-15T10:00:00Z')
invoiceDate.plus(30, 'day').toISO() // payment due date
invoiceDate.minus(1, 'month').toISO()
```

Calendar boundaries:

```ts
const dt = Chronos.parse('2026-01-15T10:34:55Z')
dt.startOf('day').toISO() // 2026-01-15T00:00:00Z
dt.endOf('day').toISO()   // 2026-01-15T23:59:59Z
```

RRULE-style recurrence:

```ts
// Every month on the 15th
Chronos.rrule('2026-01-15T15:00:00Z', 'FREQ=MONTHLY;BYMONTHDAY=15;COUNT=3')

// Every Tuesday at 15:00
Chronos.rrule('2026-01-06T15:00:00Z', {
  freq: 'WEEKLY',
  byDay: ['TU'],
  byHour: [15],
  byMinute: [0],
  bySecond: [0],
  count: 3,
})
```

Advanced recurrence examples:

```ts
// Last Sunday of every month
Chronos.rrule('2026-01-01T12:00:00Z', {
  freq: 'MONTHLY',
  byDay: ['-1SU'],
  count: 3,
})

// Hourly, keep only the last generated time in each hour
Chronos.rrule('2026-01-01T10:00:00Z', {
  freq: 'HOURLY',
  byMinute: [0, 30],
  bySecond: [0],
  bySetPos: [-1],
  count: 3,
})

// Result:
// [
//   '2026-01-01T10:30:00Z',
//   '2026-01-01T11:30:00Z',
//   '2026-01-01T12:30:00Z',
// ]
//
// Why:
// - HOURLY => each hour
// - byMinute [0, 30] => candidates at :00 and :30
// - bySetPos [-1] => keep only the last candidate in each hour => :30
// - count 3 => return the next 3 occurrences
```

Formatting:

```ts
Chronos.parse('2026-01-15T10:34:55Z').format('YYYY-MM-DD HH:mm:ss')
```

Range checks:

```ts
const outer = { start: '2026-01-01T00:00:00Z', end: '2026-01-31T23:59:59Z' }
const inner = { start: '2026-01-10T00:00:00Z', end: '2026-01-20T23:59:59Z' }

Chronos.rangeContains(outer, inner) // true
Chronos.rangesOverlap(outer, { start: '2026-01-31T23:59:59Z', end: '2026-02-05T00:00:00Z' }) // true
Chronos.inRange('2026-01-15T12:00:00Z', outer) // true

Chronos.rangeRelation(
  { start: '2026-01-05T00:00:00Z', end: '2026-01-12T00:00:00Z' },
  { start: '2026-01-10T00:00:00Z', end: '2026-01-20T00:00:00Z' },
)
// {
//   overlaps: true,
//   aStartInB: false,
//   aEndInB: true,
//   bStartInA: true,
//   bEndInA: false,
//   aContainsB: false,
//   bContainsA: false
// }
```

## Reading a date

A calendar date that does not exist is refused, rather than resolved to the
next one that does.

```ts
DateTime.from('2026-02-30')
// Invalid date '2026-02-30': February 2026 has 28 days, so there is no day 30.
```

Only the *written* date is checked, never the instant it resolves to, so an
offset that legitimately moves the UTC day is untouched:

```ts
DateTime.from('2026-08-10T23:00:00-05:00').toISO()  // 2026-08-11T04:00:00.000Z
```

Arithmetic still moves to the nearest date that exists, because there that is
the intended behaviour — and it clamps to the end of the month rather than
spilling past it:

```ts
DateTime.from('2026-01-31').plus(1, 'month').toISO()  // 2026-02-28T00:00:00.000Z
```

## Measuring between two instants

`a.diff(b, unit)` is `a - b`: positive when `a` is the later of the two,
negative when it is the earlier one. The result keeps its fraction.

```ts
const d = DateTime.from('2026-06-05T14:30:00Z')

d.diff('2026-01-01T00:00:00Z', 'day')    // 155.60416666666666
d.diff('2026-01-01T00:00:00Z', 'hour')   // 3734.5
d.diff('2026-08-01T00:00:00Z', 'day')    // -56.395833333333336
```

Months and years are counted on the calendar, not on an average length: the
remainder is measured against the month it actually falls in, so 15 days into
February is 15/28 of a month, not 15/30.

```ts
DateTime.from('2026-03-15T10:00:00Z').diff('2026-02-28T00:00:00Z', 'month')
// 0.5505952380952381
```

## Interval units

`Interval` accepts a unit spelled either way — `'day'` as `DateTime` spells it,
`'days'` as durations do — and refuses one it does not recognise instead of
falling back to milliseconds.

```ts
june.length('days')   // 30
june.length('day')    // 30
june.length('week')   // 4.285714285714286
```

## Reference

`Chronos`:
- `Chronos.now()`
- `Chronos.at(input?)`
- `Chronos.parse(input)`
- `Chronos.add(input, amount, unit)`
- `Chronos.subtract(input, amount, unit)`
- `Chronos.diff(a, b, unit)`
- `Chronos.rrule(startIso, rrule, limit?)`
- `Chronos.buildRRule(rule)`

`DateTime`:
- Arithmetic: `plus`, `minus`, `diff`
- Boundaries: `startOf`, `endOf`
- Output: `format`, `toISO`, `toDate`, `toString`, `toJSON`

Native mode:
- The Rust NAPI binary is required — there is no JavaScript fallback. Build it with `cd packages/chronos && pnpm build:napi`.

RRULE keys currently supported by the native engine:
- `FREQ`: `SECONDLY | MINUTELY | HOURLY | DAILY | WEEKLY | MONTHLY | YEARLY`
- `INTERVAL`, `COUNT`, `UNTIL`, `WKST`
- `BYDAY` (plain + ordinal, e.g. `MO`, `-1SU`, `1MO`)
- `BYMONTHDAY`, `BYMONTH`, `BYWEEKNO`, `BYYEARDAY`, `BYSETPOS`
- `BYHOUR`, `BYMINUTE`, `BYSECOND` (multi-values)
