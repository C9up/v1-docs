# Popover

A floating panel anchored to a trigger: a few settings, a date, a short form, a paragraph of help. It is portalled to `<body>` and positioned with fixed coordinates, so no `overflow: hidden` or `transform` between the trigger and the root can clip it; it flips to the opposite side when there is no room, slides along its edge to stay on screen, and follows the trigger as the page scrolls or resizes.

`modal` decides whether focus is trapped. A popover holding a form should trap — tabbing out of a half-filled form into the page behind loses the user's place. A popover holding help should not, because trapping focus in something the user can only read is a dead end. Either way it is not modal in the dialog sense: the page stays live, and a click outside closes it.

```sh
ream nebula:add popover
```

Organism · `organisms/Popover.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { buttonVariants, Popover, PopoverContent, PopoverTrigger } from '@c9up/nebula'

Popover({
  children: () => html`
    ${PopoverTrigger({ class: buttonVariants({ variant: 'outline' }), children: 'Shipping' })}
    ${PopoverContent({ children: 'Orders placed before 2 pm ship the same day.' })}
  `,
})
```

`PopoverTrigger` is a `<button>` with no look of its own; give it `buttonVariants(…)`. `PopoverContent` renders nothing where it is written: the popover builds its panel each time it opens.

## Examples

### Header, title and description

```ts
import { PopoverDescription, PopoverHeader, PopoverTitle } from '@c9up/nebula'

Popover({
  children: () => html`
    ${PopoverTrigger({ children: 'Open' })}
    ${PopoverContent({
      children: () => html`
        ${PopoverHeader({ children: html`
          ${PopoverTitle({ children: 'Dimensions' })}
          ${PopoverDescription({ children: 'Set the box size.' })}
        ` })}
      `,
    })}
  `,
})
```

`PopoverTitle` is a `<div>`, not a heading: inside a `role="dialog"` a heading would change how a screen reader announces the panel, which is already named by its trigger.

### A form that keeps focus

`modal: true` traps <kbd>Tab</kbd> inside the panel. The popover is controlled, so saving closes it:

```ts
import { signal } from '@c9up/aurora'
import { Button, Input, Label } from '@c9up/nebula'

const open = signal(false)
const name = signal(board.name)

Popover({
  open,
  onOpenChange: open,
  children: () => html`
    ${PopoverTrigger({ class: buttonVariants({ variant: 'outline' }), children: 'Rename' })}
    ${PopoverContent({
      modal: true,
      children: html`
        <div class="grid gap-2">
          ${Label({ for: 'board-name', children: 'Name' })}
          ${Input({ id: 'board-name', value: name, onInput: name })}
          ${Button({ children: 'Save', onClick: () => { rename(name()); open(false) } })}
        </div>
      `,
    })}
  `,
})
```

### Placement

`side` picks the edge of the trigger, `align` the alignment along it, `sideOffset` the gap in pixels:

```ts
PopoverContent({ side: 'right', align: 'start', sideOffset: 8, children: 'Panel' })
```

The panel flips to the opposite side when the chosen one has no room. In a right-to-left page, `left` and `right` swap, and so do `start` and `end` on a top or bottom panel. `data-side` on the panel says where it ended up, and the entrance animation slides in from that side.

### Against another element

`PopoverAnchor` positions the panel against something other than the trigger — a whole table cell whose menu button sits in its corner, a caret marker in an editor:

```ts
import { PopoverAnchor } from '@c9up/nebula'

Popover({
  children: () => html`
    ${PopoverAnchor({ class: 'block w-full', children: cell })}
    ${PopoverTrigger({ children: '⋯' })}
    ${PopoverContent({ children: 'Panel' })}
  `,
})
```

## API

### Popover

The state its trigger and its content read. Renders no element of its own.

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `Reactive<boolean>` | — | Controlled state. While it reads as anything but `undefined`, it wins. |
| `defaultOpen` | `boolean` | `false` | Starting state when uncontrolled. |
| `onOpenChange` | `(open: boolean) => void` | — | Told of every change, controlled or not. |
| `children` | `Parts` | — | The trigger, the content and an optional anchor, in a `() =>`. |

### PopoverTrigger

A `<button>` that toggles the popover.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The button's content. |
| `class` | `Reactive<string>` | — | The button's classes — it has none of its own. |

### PopoverAnchor

A `<span>` the panel is positioned against instead of the trigger.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | What it wraps. |
| `class` | `Reactive<string>` | — | The span's classes. |

### PopoverContent

The panel, 288 px wide by default. Registers what to render and returns nothing in place.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The panel's content, rendered each time the panel opens; an accessor is called again then. |
| `side` | `Side` | `'bottom'` | `'top' \| 'right' \| 'bottom' \| 'left'`. Flips when there is no room. |
| `align` | `Align` | `'center'` | `'start' \| 'center' \| 'end'` along that side. |
| `sideOffset` | `number` | `4` | The gap between the anchor and the panel, in px. |
| `modal` | `boolean` | `false` | Trap focus inside. For panels holding form controls. |
| `class` | `Reactive<string>` | — | Merged into the panel's classes. Read each time the panel opens. |

### PopoverHeader, PopoverTitle, PopoverDescription

`PopoverSectionProps`:

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The content. |
| `class` | `Reactive<string>` | — | Merged into the part's classes. |

`PopoverHeader` is a small-text column, `PopoverTitle` a medium-weight `<div>`, `PopoverDescription` a muted `<p>`.

### popoverContentClasses

The panel's class string, for a surface that should look like a popover.

## Accessibility

The panel is `role="dialog"`, named by the trigger (`aria-labelledby`). The trigger carries `aria-haspopup="dialog"`, `aria-expanded`, `data-state`, and `aria-controls` pointing at the panel while it is open.

On open, focus moves to the first focusable element in the panel. With nothing focusable, a `modal` panel takes the focus itself and a non-modal one leaves it where it was. When the panel closes while it holds focus, focus goes back: with `modal`, to whatever had it before the panel opened; without, to the trigger — or, with a `PopoverAnchor`, to that anchor, which as a plain `<span>` cannot take it. A click elsewhere closes the panel without taking focus back. Popovers inside a dialog or another popover stack: <kbd>Escape</kbd> closes the innermost first.

| Key | Action |
|---|---|
| <kbd>Enter</kbd> / <kbd>Space</kbd> | On the trigger, opens or closes the panel. |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | With `modal`, moves through the panel and wraps at either end. |
| <kbd>Escape</kbd> | Closes the panel. |
