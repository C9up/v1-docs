# Select

One option from a list, in a listbox the library draws itself. This is the one place nebula gives up a native control: the popup of a `<select>` is drawn by the operating system, its font, colours and checkmarks cannot be styled, and its options hold nothing but text. When plain text is all the options need, [NativeSelect](/en/nebula/components/native-select) is the better choice.

Everything a native select did for free is put back by hand: `role="combobox"` on the trigger and `role="listbox"` on the panel, type-ahead, the arrows, <kbd>Home</kbd>/<kbd>End</kbd>, <kbd>Enter</kbd> and <kbd>Escape</kbd>, and a hidden input so the choice still posts with a plain HTML form. Focus stays on the trigger while the list is open; only `aria-activedescendant` moves, which lets a screen reader announce each option without the focus ring jumping.

The items register themselves as they are built — their label, whether they are disabled — and which options exist, in which order, is read from the list as it is mounted. Closed, the list stays mounted outside the document, so the trigger can show the chosen option's label before the panel has ever opened, and the keyboard finds the options the moment it opens it.

```sh
ream nebula:add select
```

Organism · `organisms/Select.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@c9up/nebula'

Select({
  name: 'fruit',
  children: () => html`
    ${SelectTrigger({ label: 'Fruit', children: SelectValue({ placeholder: 'Pick a fruit' }) })}
    ${SelectContent({
      children: () => html`
        ${SelectItem({ value: 'apple', children: 'Apple' })}
        ${SelectItem({ value: 'banana', children: 'Banana' })}
        ${SelectItem({ value: 'cherry', children: 'Cherry' })}
      `,
    })}
  `,
})
```

`Select` and `SelectContent` take their parts in a thunk — their `children` are typed `Parts`, see [composition](/en/nebula/composition). The other parts take plain values.

## Examples

### Groups, labels and separators

```ts
import { html } from '@c9up/aurora'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
} from '@c9up/nebula'

Select({
  name: 'timezone',
  children: () => html`
    ${SelectTrigger({ label: 'Time zone', class: 'w-[220px]', children: SelectValue({ placeholder: 'Select a time zone' }) })}
    ${SelectContent({
      children: () => html`
        ${SelectGroup({
          children: html`
            ${SelectLabel({ children: 'Europe' })}
            ${SelectItem({ value: 'Europe/Zurich', children: 'Zurich' })}
            ${SelectItem({ value: 'Europe/Paris', children: 'Paris' })}
          `,
        })}
        ${SelectSeparator({})}
        ${SelectGroup({
          children: html`
            ${SelectLabel({ children: 'America' })}
            ${SelectItem({ value: 'America/New_York', children: 'New York' })}
          `,
        })}
      `,
    })}
  `,
})
```

### Controlled

`value` with `onValueChange` puts the choice in your signal. Without `value`, the select holds the choice itself, starting from `defaultValue`:

```ts
import { html, signal } from '@c9up/aurora'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@c9up/nebula'

const status = signal<string | undefined>('open')

Select({
  value: status,
  onValueChange: (value) => status(value),
  children: () => html`
    ${SelectTrigger({ label: 'Status', size: 'sm', children: SelectValue({}) })}
    ${SelectContent({
      children: () => html`
        ${SelectItem({ value: 'open', children: 'Open' })}
        ${SelectItem({ value: 'closed', children: 'Closed' })}
      `,
    })}
  `,
})
```

While `value` reads `undefined`, the select falls back to its own state, so a value that arrives after an async load takes over when it lands.

### Options that follow a signal

Build the items in an accessor inside the thunk. An option added to the signal shows up in the list, a removed one leaves the list and the keyboard, and the trigger keeps showing the chosen option's current name:

```ts
import { html, signal } from '@c9up/aurora'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@c9up/nebula'

const roles = signal<readonly { id: string; name: string }[]>([{ id: 'reader', name: 'Reader' }])

Select({
  name: 'role',
  defaultValue: 'owner',
  children: () => html`
    ${SelectTrigger({ label: 'Role', children: SelectValue({ placeholder: 'Pick a role' }) })}
    ${SelectContent({
      children: () => html`
        ${SelectItem({ value: 'owner', children: 'Owner' })}
        ${() => roles().map((role) => SelectItem({ value: role.id, children: role.name }))}
      `,
    })}
  `,
})
```

When the signal drops the chosen option, the value is kept — it is yours to change — but the trigger shows the placeholder until an option of that value comes back.

### Options with markup

An item can hold an icon, a swatch, two lines. Type-ahead matches the children when they are a plain string; built from markup, an item says what it is called with `textValue`. Inside a `SelectContent`:

```ts
import { html } from '@c9up/aurora'
import { SelectItem } from '@c9up/nebula'

SelectItem({
  value: 'red',
  textValue: 'Red',
  children: html`<span class="size-3 rounded-full bg-red-500"></span>Red`,
})
```

The trigger shows the chosen option's `textValue`, not its markup. Without `textValue`, such an item is matched and shown by its `value`.

### Disabled

```ts
import { html } from '@c9up/aurora'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@c9up/nebula'

Select({
  disabled: () => !canEdit(),
  children: () => html`
    ${SelectTrigger({ label: 'Plan', children: SelectValue({}) })}
    ${SelectContent({
      children: () => html`
        ${SelectItem({ value: 'free', children: 'Free' })}
        ${SelectItem({ value: 'team', children: 'Team' })}
        ${SelectItem({ value: 'enterprise', children: 'Enterprise', disabled: true })}
      `,
    })}
  `,
})
```

A disabled item is skipped by the arrows and by type-ahead, and ignores clicks.

### A long list

The panel is as wide as the trigger at least, and no taller than the space left beside it, so a long list scrolls. `SelectScrollUpButton` and `SelectScrollDownButton` add arrows that scroll while the pointer rests on them — an affordance on top of the panel's own scrolling, which is why they need no keyboard equivalent. Inside a `Select`:

```ts
import { html } from '@c9up/aurora'
import { SelectContent, SelectItem, SelectScrollDownButton, SelectScrollUpButton } from '@c9up/nebula'

SelectContent({
  side: 'bottom',
  align: 'start',
  children: () => html`
    ${SelectScrollUpButton({})}
    ${countries.map((country) => SelectItem({ value: country.code, children: country.name }))}
    ${SelectScrollDownButton({})}
  `,
})
```

When the panel opens, the chosen option is scrolled into view.

### In a form

The select keeps a hidden input carrying the chosen value; with a `name`, it is posted like any field. In a [Field](/en/nebula/components/field), give the trigger the field's ids — see [naming a Select](/en/nebula/components/field#naming-a-select).

## API

### Select

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | — | The name the hidden input posts the value under. |
| `value` | `Reactive<string \| undefined>` | — | The chosen value. While it reads `undefined`, the select's own state is used. |
| `defaultValue` | `string` | — | The value chosen at first when `value` is absent. |
| `disabled` | `Reactive<boolean>` | `false` | Disables the trigger and its keyboard. |
| `invalid` | `Reactive<boolean>` | — | Sets `aria-invalid="true"` on the trigger. |
| `required` | `boolean` | `false` | Sets `aria-required="true"` on the trigger. |
| `onValueChange` | `(value: string) => void` | — | An option was chosen. |
| `class` | `Reactive<string>` | — | Merged into the wrapper's classes. |
| `children` | `Parts` | — | The trigger and the content, in a thunk. |

### SelectTrigger

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | What the closed select shows — usually a `SelectValue`. |
| `size` | `'default' \| 'sm'` | `'default'` | 36 or 32 px high. |
| `id` | `string` | a minted id | The trigger's `id` — what a `FieldLabel` or `<label for>` points at. |
| `label` | `Reactive<string \| undefined>` | — | Sets `aria-label`, for a select no `<label>` names. |
| `describedBy` | `Reactive<string \| undefined>` | — | Sets `aria-describedby`. |
| `class` | `Reactive<string>` | — | Merged last, so a conflicting utility wins. |

### SelectValue

| Prop | Type | Default | Description |
|---|---|---|---|
| `placeholder` | `string` | `'Select…'` | Shown while no option is chosen. |
| `class` | `Reactive<string>` | — | Merged into the value's classes. |

### SelectContent

Renders nothing where it is written: the select moves it into a portal when it opens.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The items, groups and separators, in a thunk. |
| `side` | `Side` | `'bottom'` | Which side of the trigger the panel opens on: `'top'`, `'right'`, `'bottom'` or `'left'`. |
| `align` | `Align` | `'start'` | How the panel lines up along that side: `'start'`, `'center'` or `'end'`. |
| `sideOffset` | `number` | `4` | The gap to the trigger, in pixels. |
| `class` | `Reactive<string>` | — | Merged into the panel's classes, read each time it opens. |

### SelectItem

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | Required. What choosing this option sets. |
| `children` | `Slot` | — | The option's content. |
| `textValue` | `string` | the children when a string, else `value` | What type-ahead and the trigger's label use. |
| `disabled` | `boolean` | `false` | Skipped by the keyboard, ignores clicks. |
| `class` | `Reactive<string>` | — | Merged into the option's classes. |

### SelectGroup, SelectLabel

`SelectGroup` is a `role="group"` box around related items; `SelectLabel` is the small heading inside it. Both take `children: Slot` and `class: Reactive<string>`.

### SelectSeparator, SelectScrollUpButton, SelectScrollDownButton

A rule between groups, and the two scroll arrows. Each takes only `class: Reactive<string>`.

### selectTriggerClasses, selectContentClasses

`selectTriggerClasses: string` and `selectContentClasses: string` — the trigger's and the panel's class lists, for a control that should look like a select. [Combobox](/en/nebula/components/combobox) uses the first.

## Accessibility

The trigger is a `<button role="combobox">` with `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` naming the list while it is open, and `aria-activedescendant` naming the highlighted option. The panel is `role="listbox"`, labelled by the trigger; each item is `role="option"`, with `aria-selected="true"` on the chosen one and `"false"` on the others. Focus never enters the panel. After a choice it is put back on the trigger.

| Key | Action |
|---|---|
| <kbd>ArrowDown</kbd>, <kbd>Enter</kbd>, <kbd>Space</kbd> | On the closed trigger: open, highlighting the chosen option or else the first enabled one. |
| <kbd>ArrowDown</kbd> / <kbd>ArrowUp</kbd> | Open list: highlight the next / previous enabled option. Stops at either end. |
| <kbd>Home</kbd> / <kbd>End</kbd> | Open list: highlight the first / last enabled option. |
| <kbd>Enter</kbd>, <kbd>Space</kbd> | Open list: choose the highlighted option and close. |
| A character | Open list: type-ahead, highlighting the next enabled option whose text starts with the letters typed. A one-second pause starts a new search. |
| <kbd>Escape</kbd> | Open list: close without choosing. |

A press outside the panel and the trigger also closes it.

One text is built in: `SelectValue` shows `'Select…'` until `placeholder` replaces it. The trigger has no name of its own — give it `label`, or an `id` a `FieldLabel` points at; see [languages](/en/nebula/languages).
