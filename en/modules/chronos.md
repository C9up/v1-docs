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
