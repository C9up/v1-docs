# Switch

An on/off setting that takes effect the moment it is flipped. It is a native checkbox like [Checkbox](/en/nebula/components/checkbox), with `role="switch"` so assistive technology announces "on" and "off" rather than "checked". The difference is not cosmetic: a checkbox is a choice confirmed by submitting a form, a switch is a setting already applied.

The thumb is a sibling moved by `peer-checked:`, not a pseudo-element, so its travel stays in utility classes and the size can be changed without leaving the class string.

```sh
ream nebula:add switch
```

Atom · `atoms/Switch.ts` · no dependencies

## Usage

```ts
import { Switch } from '@c9up/nebula'

Switch({ label: 'Airplane mode', onCheckedChange: (on) => setAirplaneMode(on) })
```

## Examples

### Following a signal

```ts
import { signal } from '@c9up/aurora'
import { Switch } from '@c9up/nebula'

const dark = signal(false)

Switch({ label: 'Dark mode', checked: dark, onCheckedChange: (on) => dark(on) })
```

### A settings row

A label and a line of help on one side, the switch on the other — a horizontal [Field](/en/nebula/components/field):

```ts
import { html, signal } from '@c9up/aurora'
import { Field, FieldContent, FieldDescription, FieldLabel, Switch, fieldIds } from '@c9up/nebula'

const ids = fieldIds()
const marketing = signal(false)

Field({
  ids,
  orientation: 'horizontal',
  children: () => html`
    ${FieldContent({
      children: html`
        ${FieldLabel({ children: 'Marketing emails' })}
        ${FieldDescription({ children: 'News about products and features.' })}
      `,
    })}
    ${Switch({ id: ids.control, checked: marketing, onCheckedChange: (on) => marketing(on) })}
  `,
})
```

The `FieldLabel` points at the switch's `id`, so clicking the caption flips it.

### Disabled while saving

```ts
import { signal } from '@c9up/aurora'

const saving = signal(false)
const publicProfile = signal(true)

Switch({
  label: 'Public profile',
  checked: publicProfile,
  disabled: saving,
  onCheckedChange: async (on) => {
    publicProfile(on)
    saving(true)
    try {
      await savePreference('public', on)
    } catch {
      publicProfile(!on)
    } finally {
      saving(false)
    }
  },
})
```

The browser has already moved the thumb when `onCheckedChange` runs. Writing the signal keeps it in step, and writing it back on failure is what moves the thumb back — leaving the signal untouched would leave the switch showing a setting that was never saved.

## API

### Switch

| Prop | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | — | The input's `id` — what a `<label for>` points at. |
| `name` | `string` | — | The name the switch is posted under: `"on"` when on, nothing when off. |
| `checked` | `Reactive<boolean>` | `false` | Bound to the `checked` property. |
| `disabled` | `Reactive<boolean>` | `false` | Sets the native `disabled`. |
| `label` | `Reactive<string \| undefined>` | — | Sets `aria-label`, for a switch no `<label>` names. |
| `class` | `Reactive<string>` | — | Merged into the wrapper's classes — the box that sets the switch's size. |
| `onCheckedChange` | `(checked: boolean, event: Event) => void` | — | The switch was flipped, with its new state. |

### switchTrackClasses

`switchTrackClasses: string` — the track's class list. It carries `peer`, which the thumb keys off.

## Accessibility

A native checkbox with `role="switch"`: focusable, flipped by <kbd>Space</kbd>, announced as on or off. `label` sets `aria-label`. There is no `describedBy`: in a settings row, the description beside the switch is not read with it. The focus ring is drawn on `:focus-visible`.
