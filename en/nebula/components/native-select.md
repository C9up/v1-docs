# NativeSelect

A real `<select>`, styled — and the one to reach for first. [Select](/en/nebula/components/select) builds a listbox out of `div`s because the popup of a native select is drawn by the operating system and cannot be styled at all; that freedom costs everything the native control does for free, and Select has to put it all back by hand.

When the options are plain text, none of that is worth paying for. A native select brings the platform's own picker — the wheel on a phone, search-as-you-type on a desktop — takes part in its form, and runs no script. `appearance-none` and a chevron make it match the rest of the library everywhere except the open popup. Use Select when an option needs an icon, a description or a swatch; use this one otherwise.

```sh
ream nebula:add native-select
```

Atom · `atoms/NativeSelect.ts` · no dependencies

## Usage

```ts
import { NativeSelect } from '@c9up/nebula'

NativeSelect({
  name: 'country',
  placeholder: 'Choose a country',
  options: [
    { value: 'ch', label: 'Switzerland' },
    { value: 'fr', label: 'France' },
    { value: 'de', label: 'Germany' },
  ],
})
```

## Examples

### Pre-filled, and following a signal

The value it is given is the value it shows:

```ts
import { signal } from '@c9up/aurora'
import { NativeSelect } from '@c9up/nebula'

const envelope = signal('fr.cto')

NativeSelect({
  name: 'envelope',
  value: envelope,
  onValueChange: (value) => envelope(value),
  options: [
    { value: 'fr.cto', label: 'Securities account' },
    { value: 'fr.pea', label: 'Equity savings plan' },
    { value: 'fr.av', label: 'Life insurance' },
  ],
})
```

The choice is marked with `selected` on the option itself, not only with the select's `value` property. A property assigned before the options exist is silently dropped, and the control would show its first option while holding another value — the value on screen would not be the value saved. Marking the option is also what makes the choice right in server-rendered HTML, before any script runs.

### Groups

Consecutive options sharing a `group` go into one `<optgroup>`, in the order given. A group that comes back later in the list becomes a second `<optgroup>`; the list is never re-sorted.

```ts
NativeSelect({
  name: 'timezone',
  options: [
    { value: 'Europe/Zurich', label: 'Zurich', group: 'Europe' },
    { value: 'Europe/Paris', label: 'Paris', group: 'Europe' },
    { value: 'America/New_York', label: 'New York', group: 'America' },
    { value: 'America/Los_Angeles', label: 'Los Angeles', group: 'America' },
  ],
})
```

### Disabled options

```ts
NativeSelect({
  name: 'seats',
  options: [
    { value: '5', label: '5 seats' },
    { value: '10', label: '10 seats' },
    { value: '50', label: '50 seats — contact sales', disabled: true },
  ],
})
```

### Options that change

`options` is read once, at setup. For a list that follows a signal, build the select in an accessor, so a new list builds a new control:

```ts
import { html, signal } from '@c9up/aurora'
import { NativeSelect } from '@c9up/nebula'

const teams = signal<readonly { id: string; name: string }[]>([])
const team = signal<string | undefined>(undefined)

html`${() =>
  NativeSelect({
    name: 'team',
    placeholder: 'No team',
    value: team,
    onValueChange: (value) => team(value),
    options: teams().map((entry) => ({ value: entry.id, label: entry.name })),
  })}`
```

### In a Field

```ts
import { html } from '@c9up/aurora'
import { Field, FieldError, FieldLabel, NativeSelect, fieldIds } from '@c9up/nebula'

const ids = fieldIds()

Field({
  ids,
  children: () => html`
    ${FieldLabel({ children: 'Currency' })}
    ${NativeSelect({
      id: ids.control,
      name: 'currency',
      describedBy: ids.describedBy,
      invalid: true,
      options: [
        { value: 'CHF', label: 'Swiss franc' },
        { value: 'EUR', label: 'Euro' },
      ],
    })}
    ${FieldError({ children: 'Choose the currency the account is held in.' })}
  `,
})
```

## API

### NativeSelect

| Prop | Type | Default | Description |
|---|---|---|---|
| `options` | `readonly NativeSelectOption[]` | — | Required. The entries, in order. Read once, at setup. |
| `id` | `string` | — | The `<select>`'s `id` — what a `<label for>` points at. |
| `name` | `string` | — | The name the value is posted under. |
| `value` | `Reactive<string \| undefined>` | — | The chosen value. Left out, the browser owns the choice. |
| `placeholder` | `string` | — | A disabled first entry with an empty value, shown while nothing is chosen. |
| `disabled` | `Reactive<boolean>` | `false` | Sets the native `disabled`. |
| `required` | `Reactive<boolean>` | `false` | Sets the native `required`. |
| `invalid` | `Reactive<boolean>` | — | Sets `aria-invalid="true"`, which draws the border in the destructive colour. |
| `describedBy` | `Reactive<string \| undefined>` | — | Sets `aria-describedby`. |
| `class` | `Reactive<string>` | — | Merged into the `<select>`'s classes, last. |
| `onValueChange` | `(value: string, event: Event) => void` | — | The native `change`, with the chosen value. |

`NativeSelectOption` is `{ value: string; label: string; disabled?: boolean; group?: string }` — `group` puts the option under an `<optgroup>` of that label.

### nativeSelectClasses

`nativeSelectClasses: string` — the `<select>`'s class list. It keeps room for the chevron, which is drawn beside the `<select>`, not by it.

## Accessibility

A native `<select>`: the keyboard, the picker and the announcements are the platform's own. The chevron is decorative and hidden from assistive technology. `invalid` sets `aria-invalid="true"` and `describedBy` sets `aria-describedby`. There is no `label` prop: name the select with a `<label for>` or a [Field](/en/nebula/components/field).
