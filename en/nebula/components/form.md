# Form

The join between Aurora's `form()` controller and nebula's field markup. Aurora already ships the controller — values, an error per field, touched state, submit in flight, optional validation — so nebula does not ship a second one. This is a deliberate difference from shadcn, whose Form is a set of adapters over `react-hook-form`: here there is only the binding.

What the binding takes care of are the three things that otherwise get forgotten: `aria-invalid` when a field shows an error, `aria-describedby` pointing at that error, and marking a field touched when it is left, so that before a submit an error shows only on a field the user has already left.

```sh
ream nebula:add form
```

Organism · `organisms/Form.ts` · [Button](/en/nebula/components/button), [Field](/en/nebula/components/field), [Input](/en/nebula/components/input), [Spinner](/en/nebula/components/spinner), [Textarea](/en/nebula/components/textarea)

## Usage

```ts
import { form } from '@c9up/aurora'
import { Form, SubmitButton, TextField, bind } from '@c9up/nebula'

const login = form({
  initial: { email: '', password: '' },
  validate: (values) => (values.email === '' ? { email: 'Email is required' } : {}),
  submit: (values) => signIn(values),
})

Form({
  form: login,
  children: [
    TextField({ bind: bind(login, 'email'), label: 'Email', type: 'email', autocomplete: 'email' }),
    TextField({ bind: bind(login, 'password'), label: 'Password', type: 'password' }),
    SubmitButton({ form: login, label: 'Sign in' }),
  ],
})
```

## Examples

### When errors appear

The order is Aurora's, and worth knowing. Validation runs on submit: `handleSubmit` validates, marks every field touched, and submits only if nothing failed. A field's error is cleared as soon as it is written to. So the user submits, sees every problem at once, and watches each one go as it is fixed.

A field shows its error only once it has been touched. Typing into a fresh field raises nothing, and leaving it does not validate — it only lifts the gate for an error validation has already found. That is what stops a pristine form from opening with "Required" under every empty box.

### Help text, a multi-line field and a pending label

```ts
import { form } from '@c9up/aurora'
import { Form, SubmitButton, TextAreaField, TextField, bind } from '@c9up/nebula'

const ticket = form({
  initial: { subject: '', body: '' },
  validate: (values) => (values.body.length < 20 ? { body: 'Describe the problem in a few sentences.' } : {}),
  submit: (values) => openTicket(values),
})

Form({
  form: ticket,
  children: [
    TextField({ bind: bind(ticket, 'subject'), label: 'Subject', required: true }),
    TextAreaField({
      bind: bind(ticket, 'body'),
      label: 'What happened?',
      description: 'Steps, what you expected, what you saw instead.',
      rows: 6,
    }),
    SubmitButton({ form: ticket, label: 'Send', pendingLabel: 'Sending…' }),
  ],
})
```

`SubmitButton` is disabled while the submit is in flight, with a spinner before its label — and only then. It is never disabled because the form is invalid: a button that stays dead until the form is right gives the user nothing to press and no reason why, whereas pressing it and seeing every error is how a form says what is wrong.

### Errors from the server

A rejected submit goes to Aurora's `onFail`. `setErrors` puts the server's messages on their fields, where `TextField` shows them like its own:

```ts
import { form, isHttpError } from '@c9up/aurora'

const signup = form({
  initial: { email: '' },
  submit: (values) => register(values),
})

signup.onFail((error) => {
  if (isHttpError(error) && error.status === 409) signup.setErrors({ email: 'An account already uses this address.' })
})
```

### A field the binding does not ship

`TextField` and `TextAreaField` cover text. Any other control takes the same three wires by hand, with `bind()` and a [Field](/en/nebula/components/field):

```ts
import { form, html } from '@c9up/aurora'
import { Field, FieldError, FieldLabel, NativeSelect, bind, fieldIds } from '@c9up/nebula'

const invite = form({
  initial: { email: '', role: '' },
  validate: (values) => (values.role === '' ? { role: 'Choose a role.' } : {}),
  submit: (values) => sendInvite(values),
})

const role = bind(invite, 'role')
const ids = fieldIds()
const visibleError = () => (role.field.touched() ? (role.field.error() ?? undefined) : undefined)

Field({
  ids,
  children: () => html`
    ${FieldLabel({ children: 'Role' })}
    ${NativeSelect({
      id: ids.control,
      name: role.name,
      placeholder: 'Choose…',
      options: [
        { value: 'reader', label: 'Reader' },
        { value: 'editor', label: 'Editor' },
      ],
      value: () => role.field.value(),
      onValueChange: (value) => role.set(value),
      invalid: () => visibleError() !== undefined,
      describedBy: ids.describedBy,
    })}
    ${FieldError({ children: visibleError })}
  `,
})
```

`NativeSelect` has no blur callback to mark the field touched, so its error first shows when the form is submitted — which marks every field touched.

### Typed bindings

`bind()` is called where the field is used, with a literal key, so its type is the field's own: `bind(invite, 'email')` is a `FieldBinding<string>`. `TextField` takes only a `FieldBinding<string>`, so a number field handed to a text input is caught by the compiler:

```ts
import { form } from '@c9up/aurora'
import { TextField, bind } from '@c9up/nebula'

const order = form({ initial: { reference: '', quantity: 1 }, submit: (values) => placeOrder(values) })

TextField({ bind: bind(order, 'reference'), label: 'Reference' })
// @ts-expect-error — quantity is a number
TextField({ bind: bind(order, 'quantity'), label: 'Quantity' })
```

## API

### Form

`Form<T>(props)` — the `<form>` element, generic over the controller's values.

| Prop | Type | Default | Description |
|---|---|---|---|
| `form` | `AuroraForm<T>` | — | Required. The controller from Aurora's `form()`. Its `handleSubmit` runs on submit. |
| `children` | `Slot` | — | The fields and the submit button. |
| `class` | `Reactive<string>` | — | Merged into the form's classes. |

The form is `novalidate`: the browser's own bubbles cannot be styled, appear one at a time, and would fire before the controller's validation, giving the same error two presentations. A validator that throws is reported on the console as `[nebula] Form submit failed:` rather than lost in an unhandled promise.

### TextField

A `Field` holding a `FieldLabel`, an `Input`, an optional `FieldDescription` and a `FieldError`, bound to one key.

| Prop | Type | Default | Description |
|---|---|---|---|
| `bind` | `FieldBinding<string>` | — | Required. From `bind(form, key)`. |
| `label` | `Child` | — | Required. The caption. |
| `description` | `Child` | — | Help text under the control. |
| `placeholder` | `string` | — | The input's placeholder. |
| `required` | `boolean` | — | Sets the input's `required` and adds an asterisk to the label. |
| `disabled` | `Reactive<boolean>` | — | Disables the input and dims the label. |
| `type` | `string` | `'text'` | The input's `type`. |
| `autocomplete` | `string` | — | The input's `autocomplete`. |

### TextAreaField

The same with a `Textarea`. It takes every `TextField` prop except `type` and `autocomplete`, plus:

| Prop | Type | Default | Description |
|---|---|---|---|
| `rows` | `number` | — | The textarea's `rows`. |

### SubmitButton

`SubmitButton<T>(props)` — a `Button` with `type="submit"`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `form` | `AuroraForm<T>` | — | Required. The controller whose `submitting` disables the button. |
| `label` | `Child` | — | Required. The button's text. |
| `pendingLabel` | `Child` | `label` | Replaces the label while the submit is in flight. |
| `class` | `Reactive<string>` | — | Merged into the button's classes. |

### bind

`bind<T, K extends keyof T & string>(form: AuroraForm<T>, name: K): FieldBinding<T[K]>` — one key of a form, with a setter that already knows which key it writes.

`FieldBinding<V>` is `{ readonly name: string; readonly field: FormField<V>; set(value: V): void }`. `field` is Aurora's handle on the key — `value()`, `error()`, `touched()`, `markTouched()`.

`AuroraForm<T>` is Aurora's `Form<T>`, renamed on import so it does not collide with this component.

## Accessibility

Each `TextField` names its input with a `<label for>`, sets `aria-describedby` to its description and its error, and sets `aria-invalid="true"` while an error shows. The error is a `role="alert"` element present from the start, so a message is announced as it appears. `required` sets the native `required`; the asterisk beside the label is hidden from assistive technology. <kbd>Enter</kbd> in a text field submits the form, as in any HTML form.

While the submit is in flight, `SubmitButton` shows a [Spinner](/en/nebula/components/spinner), which announces "Loading". `SubmitButton` has no prop for that text: to change it, edit the call in your copy of `organisms/Form.ts` — see [owning the source](/en/nebula/owning-the-source) and [languages](/en/nebula/languages).
