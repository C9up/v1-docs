# Checkbox

A native `<input type="checkbox">` styled with `appearance-none`, where shadcn renders a `<button role="checkbox">` beside a hidden input. Keeping the input is simpler and better behaved: the box is posted and reset with its form on its own, `:checked` and `:indeterminate` drive the look with no state to keep in step, and a `<label for>` toggles it without a click forwarder.

The tick and the dash are sibling icons shown by `peer-checked:` and `peer-indeterminate:`, so no script runs when the box is toggled. `indeterminate` is bound as a property: there is no attribute for it, it exists only in the DOM.

```sh
ream nebula:add checkbox
```

Atom · `atoms/Checkbox.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { Checkbox, Label } from '@c9up/nebula'

html`
  <div class="flex items-center gap-2">
    ${Checkbox({ id: 'terms', name: 'terms', required: true })}
    ${Label({ for: 'terms', children: 'I accept the terms' })}
  </div>
`
```

## Examples

### Following a signal

```ts
import { signal } from '@c9up/aurora'
import { Checkbox } from '@c9up/nebula'

const notify = signal(true)

Checkbox({
  label: 'Email me when someone replies',
  checked: notify,
  onCheckedChange: (checked) => notify(checked),
})
```

Left without `checked`, the box starts unchecked and the browser owns its state; `onCheckedChange` still reports each change.

### A parent box over a selection

The mixed state is for a box that stands for several others — "select all" over rows of which some are chosen:

```ts
import { signal } from '@c9up/aurora'
import { Checkbox } from '@c9up/nebula'

const rows = ['invoice-1042', 'invoice-1043', 'invoice-1044']
const selected = signal<readonly string[]>([])

Checkbox({
  label: 'Select all invoices',
  checked: () => selected().length === rows.length,
  indeterminate: () => selected().length > 0 && selected().length < rows.length,
  onCheckedChange: (checked) => selected(checked ? rows : []),
})

rows.map((row) =>
  Checkbox({
    label: `Select ${row}`,
    checked: () => selected().includes(row),
    onCheckedChange: (checked) =>
      selected(checked ? [...selected(), row] : selected().filter((id) => id !== row)),
  }),
)
```

A box in a table row has no caption beside it that a screen reader can see — it would announce "checkbox, not checked" and nothing else. `label` names it.

### Posted with a form

A checked box posts `name=value`; an unchecked one posts nothing. `value` defaults to the browser's `"on"`:

```ts
Checkbox({ id: 'plan-annual', name: 'billing', value: 'annual' })
```

### In error

```ts
Checkbox({ id: 'consent', name: 'consent', invalid: true })
```

`invalid` sets `aria-invalid`, which draws the border in the destructive colour.

## API

### Checkbox

| Prop | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | — | The input's `id` — what a `<label for>` points at. |
| `name` | `string` | — | The name the box is posted under. |
| `value` | `string` | — | What a checked box posts. The browser posts `"on"` without one. |
| `checked` | `Reactive<boolean>` | `false` | Bound to the `checked` property. |
| `indeterminate` | `Reactive<boolean>` | `false` | The mixed state, bound to the `indeterminate` property. |
| `disabled` | `Reactive<boolean>` | `false` | Sets the native `disabled`. |
| `required` | `Reactive<boolean>` | `false` | Sets the native `required`. |
| `invalid` | `Reactive<boolean>` | — | Sets `aria-invalid="true"`. |
| `label` | `Reactive<string \| undefined>` | — | Sets `aria-label`, for a box no `<label>` names. |
| `class` | `Reactive<string>` | — | Merged into the input's classes, last. |
| `onCheckedChange` | `(checked: boolean, event: Event) => void` | — | The box was toggled, with its new state. |

### checkboxClasses

`checkboxClasses: string` — the input's class list. It carries `peer`, which is what the tick and the dash key off.

## Accessibility

A native checkbox: focusable, toggled by <kbd>Space</kbd>, announced as checked, not checked or — with `indeterminate` — mixed. The icons are decorative and hidden from assistive technology. `invalid` sets `aria-invalid="true"` and `label` sets `aria-label`. The focus ring is drawn on `:focus-visible`.
