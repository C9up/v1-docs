# Calendar

A month grid for picking one day or a span of days. It stands on `Date` and `Intl` alone: month lengths and leap years come from `Date`, month and weekday names from `Intl.DateTimeFormat` in the `locale` you give it, so a French page shows French names with no translation table to maintain.

Every date it hands back is local midnight. A cell means "this day", not "this instant", and mixing the two is how a date picker ends up off by one west of UTC: `new Date("2026-03-14")` parses as UTC midnight, which is already the 13th in New York. Build dates with `new Date(2026, 2, 14)`, or pass them through `startOfDay`.

The grid always has six weeks — 42 cells, even when five would do. A grid that changes height between months makes the popover around it jump as you page through.

```sh
ream nebula:add calendar
```

Organism · `organisms/Calendar.ts` · [Button](/en/nebula/components/button)

## Usage

```ts
import { signal } from '@c9up/aurora'
import { Calendar } from '@c9up/nebula'

const day = signal<Date | undefined>(undefined)

Calendar({ value: day, onValueChange: day })
```

In single mode the calendar draws the `value` it is given and reports a click through `onValueChange`; it does not keep the clicked day by itself. A signal passed both ways is the smallest calendar that shows what was picked.

## Examples

### A range

`mode: 'range'` picks a span in two clicks, and the calendar holds the span itself:

```ts
Calendar({
  mode: 'range',
  onRangeChange: (range) => {
    if (range.to !== undefined) book(range.from, range.to)
  },
})
```

`onRangeChange` fires on both clicks — after the first, `to` is absent. While only one end is fixed, the band follows the pointer, so the user sees the span before closing it. A second click *before* the first one starts the span again rather than turning it inside out: someone who clicks the 3rd after the 10th almost always meant to start over. Clicking the same day twice makes a one-day span, and a click after a complete span starts a new one.

### Holding the span yourself

```ts
import { signal } from '@c9up/aurora'
import { type DateRange } from '@c9up/nebula'

const stay = signal<DateRange | undefined>(undefined)

Calendar({ mode: 'range', range: stay, onRangeChange: stay })
```

`DateRange` is `{ from, to? }`: the half-open state is part of the type, because it is what the preview draws against. A `range` that reads `undefined` hands the drawing back to the calendar's own span.

### Ruling days out

```ts
import { addMonths, isSameDay } from '@c9up/nebula'

Calendar({
  value: day,
  onValueChange: day,
  min: new Date(),
  max: addMonths(new Date(), 3),
  disabled: (date) =>
    date.getDay() === 0 || date.getDay() === 6 || holidays.some((holiday) => isSameDay(holiday, date)),
})
```

`min` and `max` compare days, not instants — `new Date()` at 3 pm still allows today. A ruled-out day is dimmed and can be neither clicked nor chosen from the keyboard.

### Where it opens

The first month shown is the one holding `defaultValue`, then `defaultRange.from`, then `defaultMonth`, then today. `value` is not consulted, so a calendar driven by `value` alone opens on the current month; give it `defaultMonth` when the value lies elsewhere:

```ts
Calendar({ value: day, onValueChange: day, defaultMonth: new Date(2026, 11, 1) })
```

### Language and the first day of the week

```ts
Calendar({
  value: day,
  onValueChange: day,
  locale: 'fr-CH',
  labels: { previousMonth: 'Mois précédent', nextMonth: 'Mois suivant' },
})
```

`locale` names the months and weekdays and picks the first day of the week, read from `Intl.Locale` where the engine exposes it and Monday otherwise — on the server with no `locale` too. `weekStartsOn` overrides it: `0` is Sunday, `1` Monday.

```ts
Calendar({ value: day, onValueChange: day, weekStartsOn: 0 })
```

## API

### Calendar

| Prop | Type | Default | Description |
|---|---|---|---|
| `mode` | `'single' \| 'range'` | `'single'` | One day, or a span in two clicks. Read once, at setup. |
| `value` | `Reactive<Date \| undefined>` | — | The selected day, in `'single'` mode. |
| `defaultValue` | `Date` | — | The day highlighted when `value` reads `undefined`; also places the first month and the keyboard cursor. |
| `range` | `Reactive<DateRange \| undefined>` | — | The selected span, in `'range'` mode. |
| `defaultRange` | `DateRange` | — | The span the calendar starts with when it holds the span itself. |
| `defaultMonth` | `Date` | the current month | The month shown first, and the day the keyboard cursor starts on, when there is no `defaultValue` or `defaultRange` — those two take precedence. |
| `min` | `Date` | — | Days before this one are ruled out. |
| `max` | `Date` | — | Days after this one are ruled out. |
| `disabled` | `(date: Date) => boolean` | — | Rules out individual days — weekends, holidays, taken slots. |
| `weekStartsOn` | `number` | the locale's first day, Monday where it cannot be read | `0` Sunday … `6` Saturday. |
| `locale` | `string` | the browser's | Month and weekday names, the full date each day announces, the first day of the week. |
| `labels` | `Partial<CalendarLabels>` | `{ previousMonth: 'Previous month', nextMonth: 'Next month' }` | The month arrows' accessible names. |
| `class` | `Reactive<string>` | — | Merged into the root's classes. |
| `onValueChange` | `(date: Date) => void` | — | A day was chosen, in `'single'` mode. Local midnight. |
| `onRangeChange` | `(range: DateRange) => void` | — | A click in `'range'` mode — on both clicks, `to` absent after the first. |

`DateRange` is `{ readonly from: Date; readonly to?: Date }`. `CalendarLabels` is `{ previousMonth: string; nextMonth: string }`.

### Date helpers

The date maths the calendar uses, exported for code that has to agree with it:

| Function | Returns |
|---|---|
| `startOfDay(date: Date): Date` | Local midnight of that day — the form every calendar date takes. |
| `isSameDay(a: Date, b: Date): boolean` | Whether two dates fall on the same day, whatever their time. |
| `addDays(date: Date, days: number): Date` | Through the `Date` constructor, so the 32nd of March is the 1st of April and a daylight-saving day still counts as one. |
| `addMonths(date: Date, months: number): Date` | Clamped to the target month: 31 January plus one month is 28 February, not 3 March. |
| `monthGrid(month: Date, weekStartsOn: number): Date[]` | The 42 days of the six-week grid covering `month`. |

The span rules live in the same file as pure functions — `nextRange(current, date)`, the span after a click, and `rangePosition(date, range, end)`, where a day sits in a span (a `RangePosition`: `'single' | 'start' | 'end' | 'middle' | 'none'`). `organisms/Calendar.ts` exports them; the package does not.

## Accessibility

The days form a `role="grid"` labelled by the month heading, and that heading is `aria-live="polite"`, so paging announces the new month. Weekday headers are `role="columnheader"`. Each day is a `<button role="gridcell">` named by its full date in `locale` ("Saturday, 14 March 2026"), with `aria-selected` on the chosen days and `aria-current="date"` on today; a ruled-out day is a disabled button. The month arrows carry their `labels`.

At most one day is in the tab order — the keyboard cursor — so <kbd>Tab</kbd> leaves the grid instead of walking through thirty-one buttons. The cursor starts where the first month does: on `defaultValue`, `defaultRange.from` or `defaultMonth`, else today; a `value` alone does not move it. Arrowing across a month boundary pages the grid, and focus follows the cursor. The month arrows page the view without moving the cursor.

| Key | Action |
|---|---|
| <kbd>←</kbd> / <kbd>→</kbd> | Previous / next day. |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Same weekday, previous / next week. |
| <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | Same day, previous / next month, clamped to the month's length. |
| <kbd>Home</kbd> / <kbd>End</kbd> | First / last day of the week. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Chooses the focused day. |

In range mode the keyboard gets no preview: the span appears on <kbd>Enter</kbd>, since a band following the cursor would announce a selection that has not happened.

The month and weekday names follow `locale`; the two arrow names do not, and `labels` replaces them — see [languages](/en/nebula/languages).
