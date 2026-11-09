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
dt.startOf('day').toISO() // 2026-01-15T00:00:00.000Z
dt.endOf('day').toISO()   // 2026-01-15T23:59:59.999Z
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

Strings are read as ISO 8601 and nothing else: `YYYY-MM-DD`, optionally with a
time (`T` or, as SQL writes it, a space), fractional seconds and an offset
(`Z`, `+02`, `+0200`, `+02:00`). `"1"`, `"foo 2026"` or `"March 7"` are
refused instead of being guessed into a date.

A time without an offset is read in the zone you give, and in UTC otherwise —
never in the zone of the machine running the code:

```ts
new DateTime('2026-08-10T12:00:00').toISO()                 // 2026-08-10T12:00:00.000Z
new DateTime('2026-08-10T12:00:00', 'Europe/Paris').toISO() // 2026-08-10T12:00:00.000+02:00
DateTime.fromISO('2026-08-10T12:00', { zone: 'America/New_York' })
DateTime.fromObject({ year: 2026, month: 8, day: 10, hour: 9 }, { zone: 'Europe/Paris' })
DateTime.fromSQL('2026-08-10 12:00:00+00')                  // PostgreSQL timestamptz text
```

Values outside years 0000-9999 are refused when they are built, and
`fromObject` checks every field (`minute: 90` and `hour: 1.5` are errors; year
50 is year 0050).

`toISO()` writes the value on its own wall clock — `Z` in UTC, the local offset
in any other zone; `toUTC().toISO()` gives the UTC form.

A calendar date that does not exist is refused, rather than resolved to the
next one that does.

```ts
DateTime.from('2026-02-30')
// Invalid date '2026-02-30': February 2026 has 28 days, so there is no day 30.
```

So is a zone the tz database does not know — at every entry that takes one,
`DateTime.now(zone)`, `new DateTime(input, zone)` and `setZone(zone)` alike:

```ts
DateTime.now('Mars/Olympus')
// Unknown IANA timezone: 'Mars/Olympus'. Check https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
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

`a.diff(b, unit)` is `a - b`, as a `Duration`: positive when `a` is the later
of the two, negative when it is the earlier one. The lowest unit keeps its
fraction; `.as(unit)` reads it as a number.

```ts
const d = DateTime.from('2026-06-05T14:30:00Z')

d.diff('2026-01-01T00:00:00Z', 'day').as('day')    // 155.60416666666666
d.diff('2026-01-01T00:00:00Z', 'hour').as('hour')  // 3734.5
d.diff('2026-08-01T00:00:00Z', 'day').as('day')    // -56.395833333333336
d.diff('2026-01-01T00:00:00Z', ['months', 'days']).toObject()
// { months: 5, days: 4.604166666666667, ... }
```

Days and weeks are counted on the value's calendar: in Europe/Paris, noon to
noon across the spring change is one day, not 23/24 of one.

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
- `Chronos.diff(a, b, unit)` — a number
- `Chronos.rrule(start, rrule, limit | { limit, tzid })`
- `Chronos.buildRRule(rule)`

`DateTime`:
- Building: `from`, `now`, `local`, `utc`, `fromISO`, `fromObject`, `fromSQL`, `fromMillis`, `fromJSDate`, `fromRFC2822`, `fromHTTP`
- Arithmetic: `plus`, `minus` (an amount and a unit, or a `Duration`), `diff` (a `Duration`), `set`
- Boundaries: `startOf`, `endOf`
- Zone and locale: `setZone` (with `keepLocalTime`), `toUTC`, `setLocale`
- Output: `toFormat` (`yyyy-MM-dd`, `dd LLL yyyy`, `EEEE` tokens), `format` (`YYYY-MM-DD` tokens), `toISO`, `toISODate`, `toISOTime`, `toSQL`, `toSQLDate`, `toSQLTime`, `toLocaleString`, `toDate`, `toMillis`, `valueOf`, `toJSON`

Native mode:
- The Rust NAPI binary is required — there is no JavaScript fallback. Build it with `cd packages/chronos && pnpm build:napi`.

RRULE keys supported by the native engine (any other key is an error):
- `FREQ`: `SECONDLY | MINUTELY | HOURLY | DAILY | WEEKLY | MONTHLY | YEARLY`
- `INTERVAL`, `COUNT`, `WKST`
- `UNTIL` as `YYYYMMDD` (that whole day included), `YYYYMMDDTHHMMSS` (wall clock) or `YYYYMMDDTHHMMSSZ`
- `BYDAY` (plain + ordinal, e.g. `MO`, `-1SU`, `1MO`)
- `BYMONTHDAY`, `BYMONTH`, `BYWEEKNO`, `BYYEARDAY`, `BYSETPOS`
- `BYHOUR`, `BYMINUTE`, `BYSECOND` (multi-values)

## Recurrence on a wall clock

With a zone, a recurrence runs on that zone's wall clock, so a weekly 09:00
meeting stays at 09:00 across DST. The zone comes from `tzid`, from a zoned
`DateTime` start, or from a `DTSTART;TZID=…` line in the rule text.

```ts
expandRRule('2026-03-23T08:00:00Z', 'FREQ=WEEKLY;COUNT=2', { tzid: 'Europe/Paris' })
// ['2026-03-23T08:00:00.000Z', '2026-03-30T07:00:00.000Z']  — 09:00 local both times

expandRRule('DTSTART;TZID=Europe/Paris:20260323T090000\nRRULE:FREQ=WEEKLY;COUNT=2')
```

A local time that does not exist (02:30 on the spring-forward night) is read
with the offset in force before the gap, so it lands at 03:30; a time that
exists twice takes the first.

What the rule leaves out comes from the start: `FREQ=MONTHLY` repeats on the
start's day of the month, `FREQ=WEEKLY` on its weekday.

A rule taken from user input or an imported .ics is safe to expand: the text is
capped at 8 KB, every BY* list is a set, at most 10 000 occurrences come back,
and iteration ends at year 9999 — an unsatisfiable rule answers `[]` in
milliseconds instead of holding the thread.
