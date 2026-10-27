# DatePicker

A [Calendar](/en/nebula/components/calendar) in a popover, behind a button. The composition looks trivial and has three details that are easy to get wrong, so nebula ships it rather than leaving each project to rediscover them.

The popover closes on a choice — a picker that stays open after one leaves the user hunting for the way out — and focus goes back to the trigger, so the tab order does not restart at the top of the page. The trigger shows the date through `Intl.DateTimeFormat` in `locale`, not in an American order everyone else has to decode. And a hidden input carries the value as ISO `YYYY-MM-DD`, which is what a server wants — never the localised text on the button.

```sh
ream nebula:add date-picker
```

Organism · `organisms/DatePicker.ts` · [Button](/en/nebula/components/button), [Calendar](/en/nebula/components/calendar)

## Usage

```ts
import { DatePicker } from '@c9up/nebula'

DatePicker({ name: 'due' })
```

Inside a `<form>`, this posts `due=2026-03-14`, or `due=` while nothing is picked.

## Examples

### Following a signal

```ts
import { signal } from '@c9up/aurora'

const due = signal<Date | undefined>(undefined)

DatePicker({ value: due, onValueChange: due })
```

Without `value` the picker keeps the date itself, starting from `defaultValue`. `onValueChange` receives local midnight of the chosen day. A `value` that reads `undefined` hands the display back to the picker's own state, so it shows the last day picked rather than the placeholder.

### Bounds and placeholder

```ts
import { addMonths } from '@c9up/nebula'

DatePicker({
  name: 'due',
  min: new Date(),
  max: addMonths(new Date(), 6),
  placeholder: 'No due date',
})
```

`min` and `max` go to the calendar. A rule over individual days (`disabled(date)`) or a fixed first day of the week are not forwarded: for those, put a [Calendar](/en/nebula/components/calendar) in a [Popover](/en/nebula/components/popover) yourself.

### Marking an error

```ts
DatePicker({ name: 'due', invalid: () => errors().due !== undefined })
```

`invalid` sets `aria-invalid` on the trigger, which draws it in the destructive colour.

### Sending the date elsewhere

`toISODate` gives the same `YYYY-MM-DD` the hidden input carries, from the local date, without the timezone round-trip `toISOString()` would make:

```ts
import { toISODate } from '@c9up/nebula'

DatePicker({ onValueChange: (date) => reschedule(toISODate(date)) })
```

### In another language

```ts
DatePicker({
  name: 'due',
  locale: 'fr-CH',
  placeholder: 'Choisir une date',
  labels: { dialog: 'Choisir une date', previousMonth: 'Mois précédent', nextMonth: 'Mois suivant' },
})
```

## API

### DatePicker

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | — | The hidden input's `name`. Its value is `YYYY-MM-DD`, or empty. |
| `value` | `Reactive<Date \| undefined>` | — | The chosen day, when you hold it. |
| `defaultValue` | `Date` | — | The starting day, when the picker holds it. |
| `placeholder` | `string` | `'Pick a date'` | The trigger's text while nothing is chosen. |
| `min` | `Date` | — | Earliest day that can be chosen. |
| `max` | `Date` | — | Latest day that can be chosen. |
| `disabled` | `Reactive<boolean>` | `false` | Disables the trigger. |
| `invalid` | `Reactive<boolean>` | `false` | Sets `aria-invalid` on the trigger. |
| `locale` | `string` | the browser's | The trigger's date format and the calendar's names. |
| `labels` | `Partial<DatePickerLabels>` | `{ dialog: 'Choose a date', previousMonth: 'Previous month', nextMonth: 'Next month' }` | The popup's accessible name and the calendar's arrows. |
| `class` | `Reactive<string>` | — | Merged into the root's classes. |
| `onValueChange` | `(date: Date) => void` | — | A day was chosen. Local midnight. |

`DatePickerLabels` is `CalendarLabels` plus `dialog: string`, the popup's name.

### toISODate

`toISODate(date: Date): string` — `YYYY-MM-DD` from the local date.

## Accessibility

The trigger is a `<button>` with `aria-haspopup="dialog"`, `aria-expanded`, and `aria-controls` pointing at the popup while it is open. The popup is `role="dialog"` named by `labels.dialog`. Opening it puts focus on the selected day — or today — rather than on the previous-month arrow, where the first arrow key would page the calendar instead of moving a day. Focus stays inside the popup until it closes. Closing it by a choice or <kbd>Escape</kbd> returns focus to the trigger; a click outside closes it and leaves focus wherever that click puts it.

| Key | Action |
|---|---|
| <kbd>Enter</kbd> / <kbd>Space</kbd> on the trigger | Opens or closes the popup. |
| <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | Moves between the month arrows and the grid, wrapping inside the popup. |
| <kbd>Escape</kbd> | Closes the popup. |
| Arrows, <kbd>Page Up</kbd>/<kbd>Page Down</kbd>, <kbd>Home</kbd>/<kbd>End</kbd>, <kbd>Enter</kbd> | As in the [Calendar](/en/nebula/components/calendar#accessibility); <kbd>Enter</kbd> chooses and closes. |

The placeholder, the popup's name and the two arrow names are built-in English: `placeholder` and `labels` replace them — see [languages](/en/nebula/languages).
