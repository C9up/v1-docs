# AccessibleIcon

An icon with a name only a screen reader hears. An icon on its own is a picture of a word: sighted users read the picture, and a screen reader reads nothing at all, because an `<svg>` with no label is announced as nothing — which is how a delete button becomes an unlabelled button in a row of unlabelled buttons.

Two halves, and both matter. The icon is marked `aria-hidden`, so its own internals — a `<title>`, a stray `<text>` — are not announced on top of the label; the label is [visually hidden](/en/nebula/components/visually-hidden) text beside it. Real text rather than an `aria-label` on the parent, because text survives translation tooling that skips attributes.

```sh
ream nebula:add accessible-icon
```

Atom · `atoms/AccessibleIcon.ts` · [VisuallyHidden](/en/nebula/components/visually-hidden)

## Usage

```ts
import { AccessibleIcon, XIcon } from '@c9up/nebula'

AccessibleIcon({ label: 'Close', children: XIcon() })
```

## Examples

### In an icon button

```ts
import { html } from '@c9up/aurora'
import { AccessibleIcon, XIcon } from '@c9up/nebula'

html`<button type="button" @click="${() => remove()}">
  ${AccessibleIcon({ label: 'Remove', children: XIcon() })}
</button>`
```

The button is announced as "Remove, button". The wrapper is `display: contents`, so it adds no box: the icon is laid out as if it were the button's direct child.

### With a Button

[Button](/en/nebula/components/button) sizes any SVG inside it, so the icon is sized through the wrapper as well:

```ts
import { AccessibleIcon, Button, SearchIcon } from '@c9up/nebula'

Button({ size: 'icon', children: AccessibleIcon({ label: 'Search', children: SearchIcon() }) })
```

`Button`'s own `label` is the shorter way to the same announcement; `AccessibleIcon` is for when the name should be text in the page — for a translation tool, a find-in-page, a copy.

### A label that follows state

`label` takes an accessor:

```ts
import { signal } from '@c9up/aurora'
import { AccessibleIcon, ChevronDownIcon } from '@c9up/nebula'

const open = signal(false)

AccessibleIcon({ label: () => (open() ? 'Collapse' : 'Expand'), children: ChevronDownIcon() })
```

## API

### AccessibleIcon

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `Reactive<string>` | — | Required. What the icon means, in words. |
| `children` | `Slot` | — | The icon. Hidden from the accessibility tree. |
| `class` | `Reactive<string>` | — | Merged into the wrapper's classes. |

## Accessibility

The icon sits in a `<span aria-hidden="true">`, the label in a `VisuallyHidden` span beside it, both inside a `display: contents` wrapper. A screen reader reads the label where the icon stands and nothing of the icon itself. The component adds no focus and no role: put it inside the control it names, and the control is announced by that name.
