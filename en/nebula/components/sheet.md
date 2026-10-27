# Sheet

A panel that slides in from an edge of the screen — filters, a cart, a navigation menu on a phone. Structurally it is a [Dialog](/en/nebula/components/dialog) pinned to a side rather than centred, so it is just as modal: backdrop, focus trapped and returned to the trigger, page scroll locked, the page behind hidden from assistive technology, <kbd>Escape</kbd> and a backdrop click to close.

What differs is the motion and the shape. The panel slides rather than scaling, entering in 500 ms and leaving in 300 — a surface appearing wants to be noticed, one dismissed wants to be out of the way. A side sheet spans the full height and takes three quarters of the width, capped at `max-w-sm` from the `sm` breakpoint; a top or bottom sheet spans the full width and is as tall as its content.

```sh
ream nebula:add sheet
```

Organism · `organisms/Sheet.ts` · [Dialog](/en/nebula/components/dialog)

## Usage

```ts
import { html } from '@c9up/aurora'
import {
  buttonVariants, Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader,
  SheetTitle, SheetTrigger,
} from '@c9up/nebula'

Sheet({
  children: () => html`
    ${SheetTrigger({ class: buttonVariants({ variant: 'outline' }), children: 'Filters' })}
    ${SheetContent({
      children: () => html`
        ${SheetHeader({ children: html`
          ${SheetTitle({ children: 'Filters' })}
          ${SheetDescription({ children: 'Narrow the list.' })}
        ` })}
        ${SheetFooter({ children: SheetClose({ class: buttonVariants(), children: 'Done' }) })}
      `,
    })}
  `,
})
```

`SheetHeader` gets a value, not a `() =>`: the title has to be registered when the panel looks for it — see [Dialog](/en/nebula/components/dialog#the-title-is-a-value). `SheetTrigger` and `SheetClose` are bare `<button>`s that take `buttonVariants(…)`.

## Examples

### From another side

```ts
SheetContent({ side: 'left', children: () => SheetTitle({ children: 'Menu' }) })
SheetContent({ side: 'top', children: () => SheetTitle({ children: 'Search' }) })
SheetContent({ side: 'bottom', children: () => SheetTitle({ children: 'Share' }) })
```

The side is physical: `left` is the left edge in a right-to-left page too, because which edge a panel enters from is a layout choice, not a reading direction.

### A long middle

The header and the footer carry their own padding; the space between them is yours. A middle that can outgrow the screen scrolls by taking the remaining height:

```ts
SheetContent({
  children: () => html`
    ${SheetHeader({ children: SheetTitle({ children: 'Cart' }) })}
    <div class="flex-1 overflow-y-auto px-4">${() => items().map((item) => html`<p>${item.name}</p>`)}</div>
    ${SheetFooter({ children: SheetClose({ class: buttonVariants(), children: 'Checkout' }) })}
  `,
})
```

`SheetFooter` carries `mt-auto`, so it stays at the bottom of a side sheet whatever the middle holds.

### Closing from the footer only

```ts
SheetContent({
  showCloseButton: false,
  children: () => html`
    ${SheetTitle({ children: 'Filters' })}
    ${SheetFooter({ children: SheetClose({ class: buttonVariants(), children: 'Done' }) })}
  `,
})
```

Without the corner cross, <kbd>Escape</kbd> and the backdrop still close it.

### Opened from elsewhere

```ts
import { signal } from '@c9up/aurora'

const cart = signal(false)

Sheet({
  open: cart,
  onOpenChange: cart,
  children: () => SheetContent({ children: () => SheetTitle({ children: 'Cart' }) }),
})

cart(true)
```

`onOpenChange` has to write back: <kbd>Escape</kbd>, the cross and the backdrop all close through it.

## API

### Sheet

The state every part reads. Renders no element of its own.

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `Reactive<boolean>` | — | Controlled state. While it reads as anything but `undefined`, it wins. |
| `defaultOpen` | `boolean` | `false` | Starting state when uncontrolled. |
| `onOpenChange` | `(open: boolean) => void` | — | Told of every change, controlled or not. |
| `children` | `Parts` | — | The trigger and the content, in a `() =>`. |

### SheetTrigger

A `<button>` that opens the sheet.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The button's content. |
| `class` | `Reactive<string>` | — | The button's classes — it has none of its own. |

### SheetContent

The panel. Registers what to render and returns nothing in place.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The panel's content, in a `() =>`. |
| `side` | `Side` | `'right'` | The edge it comes from: `'top' \| 'right' \| 'bottom' \| 'left'`. |
| `showCloseButton` | `boolean` | `true` | The cross in the top-right corner. |
| `closeLabel` | `string` | `'Close'` | The cross's accessible name. |
| `class` | `Reactive<string>` | — | Merged into the panel's classes. Read each time the panel opens. |

### SheetHeader, SheetFooter, SheetDescription

`SheetSectionProps`:

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The content. Pass `SheetHeader` a value when it holds the title. |
| `class` | `Reactive<string>` | — | Merged into the part's classes. |

`SheetHeader` and `SheetFooter` are padded columns, the footer pushed to the bottom. `SheetDescription` is a `<p>` that describes the panel.

### SheetTitle

An `<h2>` that names the panel.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The title. |
| `srOnly` | `boolean` | `false` | Kept for screen readers, out of the layout. |
| `class` | `Reactive<string>` | — | Merged into the title's classes. |

### SheetClose

A `<button>` that closes the sheet, from anywhere inside it.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The button's content. |
| `class` | `Reactive<string>` | — | The button's classes — it has none of its own. |

### SheetOverlay

The backdrop, for composing a surface of your own; `SheetContent` already renders one.

| Prop | Type | Default | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Merged into the backdrop's classes. |

## Accessibility

The panel is `role="dialog"` with `aria-modal="true"`, named by `SheetTitle` and described by `SheetDescription`; a missing title logs a warning. While it is open, the rest of the page is `aria-hidden`, focus is trapped inside, and page scroll is locked. Focus starts on the first focusable element in the panel and returns to the trigger on close, or to whatever had it before when the sheet has no trigger. The trigger carries `aria-haspopup="dialog"`, `aria-expanded` and `data-state`.

| Key | Action |
|---|---|
| <kbd>Enter</kbd> / <kbd>Space</kbd> | On the trigger, opens the sheet. |
| <kbd>Tab</kbd> | Next focusable element in the panel; wraps from the last to the first. |
| <kbd>Shift</kbd> + <kbd>Tab</kbd> | Previous one; wraps from the first to the last. |
| <kbd>Escape</kbd> | Closes the sheet. |

The corner cross reads "Close": `closeLabel` on `SheetContent` replaces it — see [languages](/en/nebula/languages).
