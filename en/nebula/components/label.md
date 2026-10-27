# Label

The caption of a form control: a native `<label>` with the library's type and `select-none`, so a double click on it does not select its text. The click forwarding a label is for — click the caption, focus or toggle the control — comes from `for`, which the browser already handles; nothing in the component runs on click.

The dimmed state is not passed in. It comes from the surroundings: `peer-disabled:` dims the label after a disabled element carrying the `peer` class, and `group-data-[disabled=true]:` dims it inside an element carrying `group` and `data-disabled="true"`.

```sh
ream nebula:add label
```

Atom · `atoms/Label.ts` · no dependencies

## Usage

```ts
import { Label } from '@c9up/nebula'

Label({ for: 'email', children: 'Email' })
```

## Examples

### Beside a control

```ts
import { html } from '@c9up/aurora'
import { Checkbox, Input, Label } from '@c9up/nebula'

html`
  <div class="grid gap-2">
    ${Label({ for: 'company', children: 'Company' })}
    ${Input({ id: 'company', name: 'company' })}
  </div>
  <div class="flex items-center gap-2">
    ${Checkbox({ id: 'newsletter', name: 'newsletter' })}
    ${Label({ for: 'newsletter', children: 'Send me the newsletter' })}
  </div>
`
```

The label is `flex items-center gap-2`, so an icon or a badge inside it lines up with the text.

### Inside a Field

In a [Field](/en/nebula/components/field), use `FieldLabel` instead: it points its `for` at the field's control without being told the id, marks a required field, and dims with the field's `disabled`.

## API

### Label

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The caption. |
| `for` | `string` | — | The `id` of the control it labels. |
| `id` | `string` | — | The label's own `id`, for an `aria-labelledby` elsewhere. |
| `class` | `Reactive<string>` | — | Merged last, so a conflicting utility wins. |

### labelClasses

`labelClasses: string` — the label's class list, for a `<label>` you write yourself.

## Accessibility

A native `<label>`: `for` gives the control its accessible name, and clicking the caption focuses the control or toggles a checkbox, a switch or a radio. A label without `for` names nothing — wrap the control in it, or point its `for` at the control's `id`.
