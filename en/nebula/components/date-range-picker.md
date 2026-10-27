# DateRangePicker

A [Calendar](/en/nebula/components/calendar) in range mode, behind a button. It is the same shell as [DatePicker](/en/nebula/components/date-picker), and deliberately so: the two differ in what they collect, not in how they behave. Both close on completion, both return focus to the trigger, both format through `Intl`, both post ISO dates.

The one difference is when to close. A single date is done in one click; a range is not done until the second, so the popover stays open between them — closing on the first click and reopening for the second makes the control feel broken. The trigger reads `Mar 14, 2026 — …` while the second end is missing.

Two hidden inputs rather than one comma-joined field: a server reading `from` and `to` separately never has to split a string, and an empty `to` is unambiguous.

```sh
ream nebula:add date-range-picker
```

Organism · `organisms/DateRangePicker.ts` · [Button](/en/nebula/components/button), [Calendar](/en/nebula/components/calendar), [DatePicker](/en/nebula/components/date-picker)

## Usage

```ts
import { DateRangePicker } from '@c9up/nebula'

DateRangePicker({ name: 'stay' })
```

Inside a `<form>`, this posts `stay_from=2026-07-04` and `stay_to=2026-07-11`, each empty until its end is picked.

## Examples

### Following a signal

```ts
import { signal } from '@c9up/aurora'
import { type DateRange } from '@c9up/nebula'

const stay = signal<DateRange | undefined>(undefined)

DateRangePicker({ value: stay, onValueChange: stay })
```

Without `value` the picker keeps the span itself, starting from `defaultValue`. A `value` that reads `undefined` hands the display back to that own state, so it shows the last span picked rather than the placeholder.

### Acting on a complete span

`onValueChange` fires on both clicks — `to` is absent after the first, which is what lets a bound signal show the half-picked span. Code that needs both ends waits for `to`:

```ts
DateRangePicker({
  name: 'stay',
  min: new Date(),
  onValueChange: (range) => {
    if (range.to !== undefined) quote(range.from, range.to)
  },
})
```

The span follows the [Calendar](/en/nebula/components/calendar#a-range)'s rules: a second click before the first starts again, and a click after a complete span starts a new one.

### In another language

```ts
DateRangePicker({
  name: 'stay',
  locale: 'fr-CH',
  placeholder: 'Choisir les dates',
  labels: { dialog: 'Choisir une période', previousMonth: 'Mois précédent', nextMonth: 'Mois suivant' },
})
```

## API

### DateRangePicker

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | — | Base name of the hidden inputs — `'stay'` posts `stay_from` and `stay_to`. |
| `value` | `Reactive<DateRange \| undefined>` | — | The chosen span, when you hold it. |
| `defaultValue` | `DateRange` | — | The starting span, when the picker holds it. |
| `placeholder` | `string` | `'Pick a date range'` | The trigger's text while nothing is chosen. |
| `min` | `Date` | — | Earliest day that can be chosen. |
| `max` | `Date` | — | Latest day that can be chosen. |
| `disabled` | `Reactive<boolean>` | `false` | Disables the trigger. |
| `invalid` | `Reactive<boolean>` | `false` | Sets `aria-invalid` on the trigger. |
| `locale` | `string` | the browser's | The trigger's date format and the calendar's names. |
| `labels` | `Partial<DatePickerLabels>` | `{ dialog: 'Choose a date range', previousMonth: 'Previous month', nextMonth: 'Next month' }` | The popup's accessible name and the calendar's arrows. |
| `class` | `Reactive<string>` | — | Merged into the root's classes. |
| `onValueChange` | `(range: DateRange) => void` | — | On both clicks — `to` is absent after the first. Local midnight. |

`DateRange` is `{ readonly from: Date; readonly to?: Date }`; `DatePickerLabels` is described on [DatePicker](/en/nebula/components/date-picker#api).

## Accessibility

As [DatePicker](/en/nebula/components/date-picker#accessibility): the trigger is a `<button>` with `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls`; the popup is `role="dialog"` named by `labels.dialog`; it opens on the selected start — or today — rather than on the month arrow, keeps focus inside while open, and returns it to the trigger when a complete span or <kbd>Escape</kbd> closes it — a click outside leaves focus where that click puts it.

| Key | Action |
|---|---|
| <kbd>Enter</kbd> / <kbd>Space</kbd> on the trigger | Opens or closes the popup. |
| <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | Moves between the month arrows and the grid, wrapping inside the popup. |
| <kbd>Escape</kbd> | Closes the popup, keeping a half-picked span. |
| Arrows, <kbd>Page Up</kbd>/<kbd>Page Down</kbd>, <kbd>Home</kbd>/<kbd>End</kbd> | As in the [Calendar](/en/nebula/components/calendar#accessibility). |
| <kbd>Enter</kbd> / <kbd>Space</kbd> on a day | Fixes one end; the second closes the popup. |

The placeholder, the popup's name and the two arrow names are built-in English: `placeholder` and `labels` replace them — see [languages](/en/nebula/languages).
