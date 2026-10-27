# InputGroup

An input with something attached to it: a currency before it, a `.com` after it, a search icon, a clear button. It reads as one box, and it is drawn as one.

The border, the focus ring and the invalid state live on the **group**, not on the control. An input with its own border inside a bordered group draws two rectangles, and a ring around the input alone leaves the addons outside it. So the control inside gives all of that up — that is the whole of `inputGroupControlClasses` — and `focus-within` moves the ring onto the group: focusing the input lights up the whole control, addons included.

```sh
ream nebula:add input-group
```

Molecule · `molecules/InputGroup.ts` · [button](/en/nebula/components/button), [input](/en/nebula/components/input), [textarea](/en/nebula/components/textarea)

## Usage

```ts
import { html } from '@c9up/aurora'
import { InputGroup, InputGroupAddon, InputGroupInput, SearchIcon } from '@c9up/nebula'

InputGroup({
  children: html`
    ${InputGroupAddon({ children: SearchIcon() })}
    ${InputGroupInput({ name: 'q', type: 'search', label: 'Search', placeholder: 'Search…' })}
  `,
})
```

`InputGroup` provides no context, so its children are a plain value. `InputGroupInput` is an [Input](/en/nebula/components/input) with the stripped-down classes; it takes every `Input` prop.

## Examples

### Before and after

```ts
import { InputGroupText } from '@c9up/nebula'

InputGroup({
  children: html`
    ${InputGroupAddon({ children: InputGroupText({ children: 'https://' }) })}
    ${InputGroupInput({ name: 'domain', label: 'Domain', placeholder: 'example' })}
    ${InputGroupAddon({ align: 'inline-end', children: InputGroupText({ children: '.com' }) })}
  `,
})
```

An addon sits where it comes in `children`: put an end addon after the control. `align` is written to the addon's `data-align` for your own CSS to key off; the group's classes do not read it.

### A button inside

`InputGroupButton` is a [Button](/en/nebula/components/button) that defaults to `ghost` and `sm`: a filled button the height of the field would turn the group into two controls side by side, which is what the group exists to avoid.

```ts
import { signal } from '@c9up/aurora'
import { InputGroupButton } from '@c9up/nebula'

const query = signal('')

InputGroup({
  children: html`
    ${InputGroupAddon({ children: SearchIcon() })}
    ${InputGroupInput({ label: 'Search', value: query, onInput: (value) => query(value) })}
    ${InputGroupAddon({ align: 'inline-end', children: InputGroupButton({
      children: 'Clear',
      disabled: () => query() === '',
      onClick: () => query(''),
    }) })}
  `,
})
```

### Invalid and disabled

The group's `invalid` and `disabled` draw the state; the control's own say it. Pass them to both:

```ts
const invalid = () => errors().has('price')

InputGroup({
  invalid,
  disabled: sending,
  children: html`
    ${InputGroupAddon({ children: InputGroupText({ children: 'CHF' }) })}
    ${InputGroupInput({ name: 'price', type: 'number', label: 'Price', invalid, disabled: sending })}
  `,
})
```

The group's `invalid` turns the border and the ring destructive; the input's sets `aria-invalid` on the field a screen reader is in. The group's `disabled` dims the group and stops the pointer; the input's is what takes it out of the tab order and out of the form.

### A textarea

The group is one line tall. Give it `h-auto` for a textarea, and stack the addon under it:

```ts
import { InputGroupTextarea } from '@c9up/nebula'

html`
  <label for="message" class="sr-only">Message</label>
  ${InputGroup({
    class: 'h-auto flex-col items-stretch',
    children: html`
      ${InputGroupTextarea({ id: 'message', name: 'message', placeholder: 'Write a message…' })}
      ${InputGroupAddon({ align: 'block-end', class: 'justify-end pb-2', children: InputGroupButton({
        variant: 'default',
        children: 'Send',
        onClick: () => send(),
      }) })}
    `,
  })}
`
```

`InputGroupTextarea` takes no `label`: a `<label>` pointing at its `id` names it, here kept for screen readers with `sr-only`. A placeholder is not a name.

## API

### InputGroup

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The control and its addons, in the order they are drawn. |
| `invalid` | `Reactive<boolean>` | `false` | Draws the group in the destructive colour (`aria-invalid` on the group). |
| `disabled` | `Reactive<boolean>` | `false` | Dims the group and blocks the pointer (`data-disabled`). Does not disable the control. |
| `class` | `Reactive<string>` | — | Merged last into the group's classes. |

### InputGroupInput

An [Input](/en/nebula/components/input) with `inputGroupControlClasses` merged before your `class`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | — | The field's `id`. |
| `name` | `string` | — | The field's `name`. |
| `type` | `Reactive<string>` | `'text'` | The native `type`. |
| `value` | `Reactive<string>` | `''` | Bound to the `value` property, so a signal and the field stay in step. |
| `placeholder` | `Reactive<string>` | — | The native placeholder. Not a name. |
| `autocomplete` | `string` | — | The native `autocomplete`. |
| `disabled` | `Reactive<boolean>` | `false` | Sets the native `disabled`. |
| `readonly` | `Reactive<boolean>` | `false` | Sets the native `readonly`. |
| `required` | `Reactive<boolean>` | `false` | Sets the native `required`. |
| `invalid` | `Reactive<boolean>` | `false` | Sets `aria-invalid` on the field. |
| `describedBy` | `Reactive<string \| undefined>` | — | Sets `aria-describedby`: the id of the element describing the error. |
| `label` | `Reactive<string \| undefined>` | — | Sets `aria-label`, for a field no `<label>` names. |
| `class` | `Reactive<string>` | — | Merged last. |
| `onInput` | `(value: string, event: Event) => void` | — | Every keystroke, with the field's text. |
| `onChange` | `(value: string, event: Event) => void` | — | On commit, with the field's text. |
| `onBlur` | `(event: FocusEvent) => void` | — | Focus left the field. |
| `onKeyDown` | `(event: KeyboardEvent) => void` | — | Key handler. |

### InputGroupTextarea

A [Textarea](/en/nebula/components/textarea) with `inputGroupControlClasses`, `resize-none` and `py-3` merged before your `class`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | — | The field's `id`. |
| `name` | `string` | — | The field's `name`. |
| `value` | `Reactive<string>` | `''` | Bound to the `value` property. |
| `placeholder` | `Reactive<string>` | — | The native placeholder. |
| `rows` | `Reactive<number>` | — | The native `rows`. |
| `disabled` | `Reactive<boolean>` | `false` | Sets the native `disabled`. |
| `readonly` | `Reactive<boolean>` | `false` | Sets the native `readonly`. |
| `required` | `Reactive<boolean>` | `false` | Sets the native `required`. |
| `invalid` | `Reactive<boolean>` | `false` | Sets `aria-invalid` on the field. |
| `describedBy` | `Reactive<string \| undefined>` | — | Sets `aria-describedby`. |
| `class` | `Reactive<string>` | — | Merged last. |
| `onInput` | `(value: string, event: Event) => void` | — | Every keystroke, with the field's text. |
| `onChange` | `(value: string, event: Event) => void` | — | On commit, with the field's text. |
| `onBlur` | `(event: FocusEvent) => void` | — | Focus left the field. |

### InputGroupAddon

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | An icon, a unit, a button. An SVG inside is sized to 16 px. |
| `align` | `'inline-start' \| 'inline-end' \| 'block-start' \| 'block-end'` | `'inline-start'` | Written to `data-align`. The position comes from the order in `children`. |
| `class` | `Reactive<string>` | — | Merged into the addon's classes. |

### InputGroupButton

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The button's content. |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | The native `type`. |
| `variant` | `'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link'` | `'ghost'` | The look. |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | `'sm'` | The size. |
| `disabled` | `Reactive<boolean>` | `false` | Sets the native `disabled`. |
| `onClick` | `(event: MouseEvent) => void` | — | Click handler. |
| `class` | `Reactive<string>` | — | Merged after `shadow-none`. |

### InputGroupText

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | Static text: a currency, a domain suffix. |
| `class` | `Reactive<string>` | — | Merged into the span's classes. |

### inputGroupControlClasses

`inputGroupControlClasses: string` — what a control gives up to sit in a group: its border, background, shadow, padding and focus ring. Put it on a control of your own — a native `<select>`, say — to place it in an `InputGroup`.

## Accessibility

The group is a plain `<div>`; the control inside keeps its own semantics and needs its own name — `label`, or a `<label>` pointing at its `id`. An addon's text is not part of that name: "CHF" before a price field is seen, not announced with the field, so put it in the label when it matters ("Price in CHF"). The focus ring is drawn on the group through `focus-within`, so it surrounds the addons as well.

`InputGroupButton` takes no `label`: give it visible text, as the examples do, rather than an icon alone.

The group adds no key handling; every control in it keeps its native keyboard behaviour and its own tab stop.
