# ButtonGroup

Buttons welded into one control: a set of alignments, a pager, a save button with its options beside it. The group is `role="group"` with a label, so a screen reader announces the set before its members rather than three unrelated buttons in a row.

The rounding and the shared borders are set by `:first-child` and `:last-child` selectors on the group, not by props on each button. That is what lets the members stay ordinary [Button](/en/nebula/components/button) calls: adding one does not mean deciding again which button is now at the end.

```sh
ream nebula:add button-group
```

Molecule · `molecules/ButtonGroup.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { Button, ButtonGroup } from '@c9up/nebula'

ButtonGroup({
  label: 'Text alignment',
  children: html`
    ${Button({ variant: 'outline', children: 'Left' })}
    ${Button({ variant: 'outline', children: 'Center' })}
    ${Button({ variant: 'outline', children: 'Right' })}
  `,
})
```

`ButtonGroup` provides no context, so its children are a plain value. The `outline` variant is the usual choice: each member's border is pulled one pixel over its neighbour's, so two borders meet as one.

## Examples

### Vertical

```ts
ButtonGroup({
  label: 'Zoom',
  orientation: 'vertical',
  children: html`
    ${Button({ variant: 'outline', size: 'icon', label: 'Zoom in', children: '+' })}
    ${Button({ variant: 'outline', size: 'icon', label: 'Zoom out', children: '−' })}
  `,
})
```

### Text between buttons

`ButtonGroupText` is a box styled to sit in the row — a page number, a unit, a count:

```ts
import { ButtonGroupText, ChevronLeftIcon, ChevronRightIcon } from '@c9up/nebula'

ButtonGroup({
  label: 'Pages',
  children: html`
    ${Button({ variant: 'outline', size: 'icon', label: 'Previous page', children: ChevronLeftIcon(), onClick: () => previous() })}
    ${ButtonGroupText({ children: () => `Page ${page()}` })}
    ${Button({ variant: 'outline', size: 'icon', label: 'Next page', children: ChevronRightIcon(), onClick: () => next() })}
  `,
})
```

### A split button

Buttons without a border of their own — `secondary`, `default` — run together. `ButtonGroupSeparator` draws the line between them:

```ts
import { ButtonGroupSeparator, ChevronDownIcon } from '@c9up/nebula'

ButtonGroup({
  label: 'Save',
  children: html`
    ${Button({ variant: 'secondary', children: 'Save' })}
    ${ButtonGroupSeparator()}
    ${Button({ variant: 'secondary', size: 'icon', label: 'More save options', children: ChevronDownIcon() })}
  `,
})
```

The separator is a vertical line, drawn for a horizontal group.

## API

### ButtonGroup

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The buttons, and any `ButtonGroupText` or `ButtonGroupSeparator`. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Lays the members out in a row or a column. Read once, at setup. |
| `label` | `string` | — | Sets `aria-label`, announced before the group's contents. |
| `class` | `Reactive<string>` | — | Merged into the group's classes. |

### ButtonGroupText

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The text, an icon, or both. |
| `class` | `Reactive<string>` | — | Merged into the box's classes. |
| `id` | `string` | — | The element's `id`. |

### ButtonGroupSeparator

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | Rendered inside the line; normally left empty. |
| `class` | `Reactive<string>` | — | Merged into the line's classes. |
| `id` | `string` | — | The element's `id`. |

## Accessibility

The group is `role="group"` with `label` as its `aria-label`. Give it one whenever the buttons do not explain themselves together: "Left, Center, Right" means little until it is "Text alignment". `ButtonGroupSeparator` is a plain `<div>` with no role — a drawn line, not announced.

The focused member is raised above its neighbours, so its focus ring is not hidden under the next button's edge. The group adds no key handling: each button is its own tab stop, activated by <kbd>Enter</kbd> and <kbd>Space</kbd> as any button is. For a row that should be a single tab stop with arrow keys inside, use a [Toolbar](/en/nebula/components/toolbar).
