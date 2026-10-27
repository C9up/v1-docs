# RadioGroup

One choice from a set. Each item is a real `<input type="radio">`, and the items share a `name` — which is what makes the browser treat them as one group: the arrow keys move between them, exactly one can be checked, and the choice posts with a plain HTML form. A `div` with `role="radio"` gets none of that without rewriting it.

This is a deliberate difference from shadcn, which renders a `<button role="radio">` because Radix needs an element it fully controls. nebula keeps the native input and styles it with `appearance-none`; the `data-slot` names and the dot indicator are shadcn's.

```sh
ream nebula:add radio-group
```

Molecule · `molecules/RadioGroup.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { RadioGroup, RadioGroupItem } from '@c9up/nebula'

RadioGroup({
  name: 'plan',
  defaultValue: 'free',
  children: () => html`
    ${RadioGroupItem({ value: 'free', children: 'Free' })}
    ${RadioGroupItem({ value: 'pro', children: 'Pro' })}
  `,
})
```

`children` is typed `Parts`: the `() =>` lets the items reach their group — see [composition](/en/nebula/composition).

## Examples

### With descriptions

`description` is a line of help under the item's label, linked to its radio with `aria-describedby`:

```ts
RadioGroup({
  name: 'delivery',
  defaultValue: 'standard',
  children: () => html`
    ${RadioGroupItem({ value: 'standard', children: 'Standard', description: '4–6 business days, free.' })}
    ${RadioGroupItem({ value: 'express', children: 'Express', description: 'Next business day, 12.00.' })}
  `,
})
```

### Following a signal

```ts
import { html, signal } from '@c9up/aurora'
import { RadioGroup, RadioGroupItem } from '@c9up/nebula'

const density = signal('comfortable')

RadioGroup({
  name: 'density',
  value: density,
  onValueChange: (value) => density(value),
  children: () => html`
    ${RadioGroupItem({ value: 'comfortable', children: 'Comfortable' })}
    ${RadioGroupItem({ value: 'compact', children: 'Compact' })}
  `,
})
```

Writing `density` from elsewhere moves the check. Without `value`, the group starts on `defaultValue` and the browser owns the choice; `onValueChange` reports it either way.

### Side by side

```ts
RadioGroup({
  name: 'size',
  orientation: 'horizontal',
  children: () => html`
    ${RadioGroupItem({ value: 's', children: 'S' })}
    ${RadioGroupItem({ value: 'm', children: 'M' })}
    ${RadioGroupItem({ value: 'l', children: 'L' })}
  `,
})
```

`orientation` lays the items out in a row and sets `aria-orientation`; the arrow keys work in both directions either way, as the browser handles them.

### Disabled

```ts
import { signal } from '@c9up/aurora'

const locked = signal(false)

RadioGroup({
  name: 'billing',
  disabled: locked,
  children: () => html`
    ${RadioGroupItem({ value: 'monthly', children: 'Monthly' })}
    ${RadioGroupItem({ value: 'yearly', children: 'Yearly' })}
    ${RadioGroupItem({ value: 'lifetime', children: 'Lifetime', disabled: true })}
  `,
})
```

`disabled` on the group follows its accessor; on an item it is a plain boolean, fixed at setup.

### With a question

A radio group answers one question, and a `<fieldset>` with its `<legend>` is what says which. [FieldSet](/en/nebula/components/field) and `FieldLegend` give it the library's look:

```ts
import { html } from '@c9up/aurora'
import { FieldLegend, FieldSet, RadioGroup, RadioGroupItem } from '@c9up/nebula'

FieldSet({
  children: html`
    ${FieldLegend({ variant: 'label', children: 'Notify me about' })}
    ${RadioGroup({
      name: 'notify',
      defaultValue: 'mentions',
      children: () => html`
        ${RadioGroupItem({ value: 'all', children: 'All new messages' })}
        ${RadioGroupItem({ value: 'mentions', children: 'Direct messages and mentions' })}
        ${RadioGroupItem({ value: 'none', children: 'Nothing' })}
      `,
    })}
  `,
})
```

## API

### RadioGroup

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | — | Required. Shared by every item: what makes them one group, and what the choice posts under. |
| `value` | `Reactive<string \| undefined>` | — | The chosen value. While it reads `undefined`, `defaultValue` is checked. |
| `defaultValue` | `string` | — | The value checked at first when `value` is absent. |
| `disabled` | `Reactive<boolean>` | `false` | Disables every item. |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | The layout, and `aria-orientation`. |
| `onValueChange` | `(value: string) => void` | — | An item was chosen. |
| `class` | `Reactive<string>` | — | Merged into the group's classes. |
| `children` | `Parts` | — | The items, in a thunk. |

### RadioGroupItem

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | Required. What the group posts when this item is chosen. |
| `children` | `Slot` | — | The item's label, rendered in a `<label for>` bound to its radio. |
| `description` | `Slot` | — | A line of help under the label, linked with `aria-describedby`. |
| `disabled` | `boolean` | `false` | Disables this item alone. |
| `class` | `Reactive<string>` | — | Merged into the radio input's classes. |

## Accessibility

The group is `role="radiogroup"`, each item a native radio with its label bound by `for`, so clicking the text chooses it. The browser provides the keyboard: <kbd>Tab</kbd> enters the group on the checked item and leaves it in one step, the arrow keys move and choose, and <kbd>Space</kbd> checks the focused item. A description is linked to its radio with `aria-describedby`.

The group itself takes no `label`: name the question with a `FieldSet` and `FieldLegend` around it, as above.
