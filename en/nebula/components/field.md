# Field

A labelled control with its help text and its error. The ids are the point of the component: shadcn leaves them to the caller — a `FieldLabel` with `htmlFor="x"` beside an `Input` with `id="x"` — which works until the two drift apart. `fieldIds()` mints a matching set, and `Field` shares it with its parts, so the label, the description and the error point at the right element without anyone repeating a string.

The control is the one part `Field` does not build, so it still needs the set: call `fieldIds()` yourself, pass it to `Field`, and put `ids.control` and `ids.describedBy` on the control. `describedBy` names the description *and* the error, always: a screen reader skips an id that resolves to nothing, whereas recomputing the attribute when an error appears would mean building the control again, which Aurora does not do.

```sh
ream nebula:add field
```

Molecule · `molecules/Field.ts` · no dependencies

## Usage

```ts
import { html, signal } from '@c9up/aurora'
import { Field, FieldDescription, FieldError, FieldLabel, Input, fieldIds } from '@c9up/nebula'

const ids = fieldIds()
const error = signal<string | undefined>(undefined)

Field({
  ids,
  children: () => html`
    ${FieldLabel({ children: 'Email' })}
    ${Input({ id: ids.control, type: 'email', describedBy: ids.describedBy, invalid: () => error() !== undefined })}
    ${FieldDescription({ children: 'We never share it.' })}
    ${FieldError({ children: error })}
  `,
})
```

`children` is typed `Parts`: `FieldLabel`, `FieldDescription` and `FieldError` read the ids from the field, so they are built in the thunk — see [composition](/en/nebula/composition).

## Examples

### Several errors

`errors` takes a list. One message renders as text, several as a bulleted list:

```ts
import { html, signal } from '@c9up/aurora'
import { Field, FieldError, FieldLabel, Input, fieldIds } from '@c9up/nebula'

const ids = fieldIds()
const problems = signal<readonly string[]>([])

Field({
  ids,
  children: () => html`
    ${FieldLabel({ children: 'Password' })}
    ${Input({ id: ids.control, type: 'password', describedBy: ids.describedBy, invalid: () => problems().length > 0 })}
    ${FieldError({ errors: problems })}
  `,
})
```

`FieldError` stays in the DOM while empty and is hidden by `empty:hidden`: the id `describedBy` names has to resolve the moment an error appears, and a node added later is announced late or not at all.

### Required and disabled

```ts
import { html, signal } from '@c9up/aurora'
import { Field, FieldLabel, Input, fieldIds } from '@c9up/nebula'

const ids = fieldIds()
const locked = signal(false)

Field({
  ids,
  required: true,
  disabled: locked,
  children: () => html`
    ${FieldLabel({ children: 'Company' })}
    ${Input({ id: ids.control, required: true, disabled: locked })}
  `,
})
```

Both props are for the field's *look*: `required` adds an asterisk to the label, `disabled` dims the label. Neither reaches the control — give it its own `required` and `disabled`.

### A horizontal field

`orientation: 'horizontal'` puts the text on one side and the control on the other. `FieldContent` holds the text half:

```ts
import { html } from '@c9up/aurora'
import { Checkbox, Field, FieldContent, FieldDescription, FieldLabel, fieldIds } from '@c9up/nebula'

const ids = fieldIds()

Field({
  ids,
  orientation: 'horizontal',
  children: () => html`
    ${Checkbox({ id: ids.control, name: 'sync' })}
    ${FieldContent({
      children: html`
        ${FieldLabel({ children: 'Sync across devices' })}
        ${FieldDescription({ children: 'Your settings follow you to every device you sign in on.' })}
      `,
    })}
  `,
})
```

### Naming a Select

A [Select](/en/nebula/components/select)'s trigger takes the field's ids like any control, so the label names the combobox:

```ts
import { html } from '@c9up/aurora'
import { Field, FieldDescription, FieldLabel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, fieldIds } from '@c9up/nebula'

const ids = fieldIds()

Field({
  ids,
  children: () => html`
    ${FieldLabel({ children: 'Role' })}
    ${Select({
      defaultValue: 'reader',
      children: () => html`
        ${SelectTrigger({ id: ids.control, describedBy: ids.describedBy, children: SelectValue({}) })}
        ${SelectContent({
          children: () => html`
            ${SelectItem({ value: 'reader', children: 'Reader' })}
            ${SelectItem({ value: 'owner', children: 'Owner' })}
          `,
        })}
      `,
    })}
    ${FieldDescription({ children: 'What the member may do.' })}
  `,
})
```

### A form section

`FieldSet` and `FieldLegend` group fields that answer one question; `FieldGroup` stacks fields with the form's spacing:

```ts
import { html } from '@c9up/aurora'
import {
  Field, FieldGroup, FieldLabel, FieldLegend, FieldSet, Input, fieldIds,
} from '@c9up/nebula'

const street = fieldIds()
const city = fieldIds()

FieldSet({
  children: html`
    ${FieldLegend({ children: 'Billing address' })}
    <p class="text-muted-foreground text-sm">Printed on every invoice.</p>
    ${FieldGroup({
      children: html`
        ${Field({ ids: street, children: () => html`${FieldLabel({ children: 'Street' })}${Input({ id: street.control })}` })}
        ${Field({ ids: city, children: () => html`${FieldLabel({ children: 'City' })}${Input({ id: city.control })}` })}
      `,
    })}
  `,
})
```

The help text under the legend is a plain paragraph: `FieldLabel`, `FieldDescription` and `FieldError` read a field's ids, and outside a `Field` they throw for want of one.

### A rule between alternatives

```ts
import { html } from '@c9up/aurora'
import { Button, FieldGroup, FieldSeparator } from '@c9up/nebula'

FieldGroup({
  children: html`
    ${Button({ variant: 'outline', children: 'Continue with a passkey' })}
    ${FieldSeparator({ children: 'or' })}
    ${Button({ type: 'submit', children: 'Email me a sign-in link' })}
  `,
})
```

Without `children`, the separator is a bare rule.

### A title that is not a label

`FieldTitle` looks like a label but is a `<div>` with no `for` — the heading of a field whose control has its own label, such as a group of choices.

## API

### Field

| Prop | Type | Default | Description |
|---|---|---|---|
| `ids` | `FieldIds` | a fresh `fieldIds()` | The set the parts point at. Pass the one you put on the control. |
| `required` | `boolean` | `false` | Adds an asterisk to `FieldLabel`. Does not set `required` on the control. |
| `disabled` | `Reactive<boolean>` | — | Sets `data-disabled`, which dims the label. Does not disable the control. |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Label above the control, or text and control side by side. |
| `class` | `Reactive<string>` | — | Merged into the field's classes. |
| `children` | `Parts` | — | The label, the control, the description and the error, in a thunk. |

### FieldLabel

A `<label>` whose `for` is `ids.control` and whose `id` is `ids.label`. A `<label>`, not a `<div>`: clicking it focuses the control, which `aria-labelledby` would not give.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The caption. |
| `class` | `Reactive<string>` | — | Merged into the label's classes. |

### FieldDescription

A `<p>` whose `id` is `ids.description`. Same props as `FieldLabel`.

### FieldError

A `<p role="alert">` whose `id` is `ids.error`. Stays in the DOM while it has nothing to say, empty and hidden by `empty:hidden`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Reactive<string \| undefined>` | — | One message. |
| `errors` | `Reactive<readonly string[] \| undefined>` | — | Several messages. Wins over `children` when not empty; a list of one renders as text. |
| `class` | `Reactive<string>` | — | Merged into the error's classes. |

### FieldTitle, FieldSet

`FieldTitle` is a `<div>` styled like a label; `FieldSet` is a `<fieldset>`. Both take `children: Slot` and `class: Reactive<string>`, and neither reads the field's ids.

### FieldLegend

A `<legend>`, for the first child of a `FieldSet`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'legend' \| 'label'` | `'legend'` | `legend` is set at the base size, `label` at the label's smaller size. |
| `children` | `Slot` | — | The question the set answers. |
| `class` | `Reactive<string>` | — | Merged into the legend's classes. |

### FieldGroup, FieldContent

Plain `<div>`s with a `data-slot` and a class list: `FieldGroup` stacks fields, `FieldContent` is the text half of a horizontal field. Both take `children?: Slot`, `class?: Reactive<string>` and `id?: string`.

### FieldSeparator

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | A word set in the middle of the rule — "or". |
| `class` | `Reactive<string>` | — | Merged into the separator's classes. |

### fieldIds

`fieldIds(): FieldIds` — a fresh, matching set of ids.

| Field | Description |
|---|---|
| `control` | Put on the control. `FieldLabel`'s `for` points here. |
| `label` | `FieldLabel`'s own `id`. |
| `description` | `FieldDescription`'s `id`. |
| `error` | `FieldError`'s `id`. |
| `describedBy` | `"<description> <error>"` — ready for the control's `describedBy`. |

## Accessibility

`FieldLabel` names the control through `for`, and `describedBy` makes a screen reader read the help text and the error with the control. `FieldError` is `role="alert"` and always present, so a message that appears is announced as it appears. The asterisk of a required field is `aria-hidden`: the control's own `required` is what assistive technology reports. The ids come from Aurora's counter, which is reset for each server render and each hydration, so the ids a page was rendered with are the ids its script finds.
