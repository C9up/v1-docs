# Input

A single-line text field. The value is bound as the element's `value` *property*, not its attribute: the attribute only seeds the field, and once the user has typed the two disagree. Binding the property is what keeps a signal and the field in step in both directions.

There is no controlled/uncontrolled split. Pass a `value` and the field follows it; pass nothing and the browser owns what is typed — the right default for a form posted the classic way.

```sh
ream nebula:add input
```

Atom · `atoms/Input.ts` · no dependencies

## Usage

```ts
import { Input } from '@c9up/nebula'

Input({ name: 'email', type: 'email', autocomplete: 'email' })
```

## Examples

### Following a signal

`onInput` hands over the text as a string, already read from the event:

```ts
import { signal } from '@c9up/aurora'
import { Input } from '@c9up/nebula'

const query = signal('')

Input({
  type: 'search',
  label: 'Search members',
  value: query,
  onInput: (value) => query(value),
})
```

Writing to `query` from anywhere else — a "clear" button, a URL parameter — updates the field.

### With a label

A `<label for>` names the field and focuses it on click:

```ts
import { html } from '@c9up/aurora'
import { Input, Label } from '@c9up/nebula'

html`
  ${Label({ for: 'display-name', children: 'Display name' })}
  ${Input({ id: 'display-name', name: 'display_name' })}
`
```

Inside a form, a [Field](/en/nebula/components/field) mints the matching ids and adds the help text and the error.

### No visible label

A search box in a toolbar has no `<label>` beside it. `label` gives it a name; a `placeholder` is not one, since it disappears as soon as the user types:

```ts
Input({ type: 'search', label: 'Search', placeholder: 'Search…' })
```

### In error

`invalid` sets `aria-invalid`, which draws the border and the focus ring in the destructive colour. `describedBy` points at the message, so a screen reader reads it with the field:

```ts
import { html, signal } from '@c9up/aurora'
import { Field, FieldError, FieldLabel, Input, fieldIds } from '@c9up/nebula'

const ids = fieldIds()
const error = signal<string | undefined>(undefined)

Field({
  ids,
  children: () => html`
    ${FieldLabel({ children: 'Email' })}
    ${Input({
      id: ids.control,
      type: 'email',
      invalid: () => error() !== undefined,
      describedBy: ids.describedBy,
    })}
    ${FieldError({ children: error })}
  `,
})
```

### A key handler

```ts
Input({
  label: 'New task',
  onKeyDown: (event) => {
    if (event.key === 'Enter') addTask()
  },
})
```

### Files

`type: 'file'` keeps the same frame, and the browser's "Choose file" button is restyled to match:

```ts
Input({ type: 'file', name: 'avatar' })
```

## API

### Input

| Prop | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | — | The element's `id` — what a `<label for>` points at. |
| `name` | `string` | — | The name the value is posted under. |
| `type` | `Reactive<string>` | `'text'` | The native `type`: `email`, `password`, `search`, `file`… |
| `value` | `Reactive<string>` | `''` | Bound to the `value` property. Left out, the browser owns the text. |
| `placeholder` | `Reactive<string>` | — | Hint shown while the field is empty. Not a label. |
| `autocomplete` | `string` | — | The native `autocomplete` token. |
| `disabled` | `Reactive<boolean>` | `false` | Sets the native `disabled`. |
| `readonly` | `Reactive<boolean>` | `false` | Sets the native `readonly`. |
| `required` | `Reactive<boolean>` | `false` | Sets the native `required`. |
| `invalid` | `Reactive<boolean>` | — | Sets `aria-invalid="true"`, which the border and the focus ring key off. |
| `describedBy` | `Reactive<string \| undefined>` | — | Sets `aria-describedby`: the id of the help text or the error. |
| `label` | `Reactive<string \| undefined>` | — | Sets `aria-label`, for a field no `<label>` names. |
| `class` | `Reactive<string>` | — | Merged last, so a conflicting utility wins. |
| `onInput` | `(value: string, event: Event) => void` | — | Every keystroke, with the current text. |
| `onChange` | `(value: string, event: Event) => void` | — | The native `change`: on commit, usually when the field loses focus. |
| `onBlur` | `(event: FocusEvent) => void` | — | The field lost focus. |
| `onKeyDown` | `(event: KeyboardEvent) => void` | — | Raw key handler. |

### inputClasses

`inputClasses: string` — the field's class list, for a native `<input>` you write yourself.

## Accessibility

A native `<input>`: everything the browser gives a text field — editing keys, autofill, the on-screen keyboard picked from `type` — is kept. `invalid` sets `aria-invalid="true"` and nothing when false, `describedBy` sets `aria-describedby`, and `label` sets `aria-label`. The focus ring is drawn on `:focus-visible`.
