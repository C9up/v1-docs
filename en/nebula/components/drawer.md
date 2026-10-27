# Drawer

A bottom sheet you can swipe away. It is a [Sheet](/en/nebula/components/sheet) from the bottom edge — modal, with a backdrop, focus trapped and returned, page scroll locked, the page behind hidden from assistive technology — plus the one gesture that makes it feel native on a phone: drag the panel down to dismiss it.

The drag follows rules that separate it from a panel that merely tracks the finger. It goes downward only, since dragging up would peel the panel off its edge. Released more than 120 px down it closes, and so does a quick flick faster than 0.5 px/ms however short — distance alone would ignore the gesture a flick means; anything less springs back. The transition is off while the finger moves, so the panel does not lag it, and back on for the release. The grab handle is decoration: <kbd>Escape</kbd>, the backdrop and a `DrawerClose` do everything the drag does, because a gesture must never be the only way out of a modal surface.

```sh
ream nebula:add drawer
```

Organism · `organisms/Drawer.ts` · [Dialog](/en/nebula/components/dialog)

## Usage

```ts
import { html } from '@c9up/aurora'
import {
  buttonVariants, Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader,
  DrawerTitle, DrawerTrigger,
} from '@c9up/nebula'

Drawer({
  children: () => html`
    ${DrawerTrigger({ class: buttonVariants({ variant: 'outline' }), children: 'Share' })}
    ${DrawerContent({
      children: () => html`
        ${DrawerHeader({ children: html`
          ${DrawerTitle({ children: 'Share this page' })}
          ${DrawerDescription({ children: 'Anyone with the link can view it.' })}
        ` })}
        ${DrawerFooter({ children: DrawerClose({ class: buttonVariants({ variant: 'outline' }), children: 'Cancel' }) })}
      `,
    })}
  `,
})
```

`DrawerHeader` gets a value, not a `() =>`: the title has to be registered when the panel looks for it — see [Dialog](/en/nebula/components/dialog#the-title-is-a-value). There is no corner cross; put a `DrawerClose` in the content.

## Examples

### A scrolling list

A drag that starts on a list would fight the list's own scroll. `disableDrag` turns the gesture off; <kbd>Escape</kbd>, the backdrop and `DrawerClose` still close the drawer. The panel is at most 80% of the viewport high, so a long list scrolls inside it:

```ts
DrawerContent({
  disableDrag: true,
  children: () => html`
    ${DrawerHeader({ children: DrawerTitle({ children: 'Choose a country' }) })}
    <ul class="flex-1 overflow-y-auto px-4">${() => countries().map((country) => html`<li>${country}</li>`)}</ul>
    ${DrawerFooter({ children: DrawerClose({ class: buttonVariants(), children: 'Done' }) })}
  `,
})
```

### Without the handle

```ts
DrawerContent({ showHandle: false, children: () => DrawerTitle({ children: 'Filters' }) })
```

The drag still works without the handle: it starts anywhere on the panel.

### Opened from elsewhere

```ts
import { signal } from '@c9up/aurora'

const actions = signal(false)

Drawer({
  open: actions,
  onOpenChange: actions,
  children: () => DrawerContent({ children: () => DrawerTitle({ children: 'Actions' }) }),
})

actions(true)
```

`onOpenChange` has to write back: the drag, <kbd>Escape</kbd> and the backdrop all close through it.

## API

### Drawer

The state every part reads. Renders no element of its own.

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `Reactive<boolean>` | — | Controlled state. While it reads as anything but `undefined`, it wins. |
| `defaultOpen` | `boolean` | `false` | Starting state when uncontrolled. |
| `onOpenChange` | `(open: boolean) => void` | — | Told of every change, controlled or not. |
| `children` | `Parts` | — | The trigger and the content, in a `() =>`. |

### DrawerTrigger

A `<button>` that opens the drawer.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The button's content. |
| `class` | `Reactive<string>` | — | The button's classes — it has none of its own. |

### DrawerContent

The panel, pinned to the bottom edge. Registers what to render and returns nothing in place.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The panel's content, in a `() =>`. |
| `showHandle` | `boolean` | `true` | The grab bar at the top. Decorative. |
| `disableDrag` | `boolean` | `false` | Turn off drag-to-dismiss — for a drawer holding a scrollable list. |
| `class` | `Reactive<string>` | — | Merged into the panel's classes. Read each time the panel opens. |

### DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription

`DrawerSectionProps`:

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The content. Pass `DrawerHeader` a value when it holds the title. |
| `class` | `Reactive<string>` | — | Merged into the part's classes. |

`DrawerTitle` is an `<h2>` that names the panel, `DrawerDescription` a `<p>` that describes it. `DrawerHeader` and `DrawerFooter` are padded columns, the footer pushed to the bottom.

### DrawerClose

A `<button>` that closes the drawer, from anywhere inside it.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The button's content. |
| `class` | `Reactive<string>` | — | The button's classes — it has none of its own. |

### DrawerOverlay

The backdrop, for composing a surface of your own; `DrawerContent` already renders one.

| Prop | Type | Default | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Merged into the backdrop's classes. |

## Accessibility

The panel is `role="dialog"` with `aria-modal="true"`, named by `DrawerTitle` and described by `DrawerDescription`; a missing title logs a warning. The handle is `aria-hidden`. While the drawer is open, the rest of the page is `aria-hidden`, focus is trapped inside, and page scroll is locked. Focus starts on the first focusable element in the panel and returns to the trigger on close, or to whatever had it before when the drawer has no trigger. The trigger carries `aria-haspopup="dialog"`, `aria-expanded` and `data-state`.

| Key | Action |
|---|---|
| <kbd>Enter</kbd> / <kbd>Space</kbd> | On the trigger, opens the drawer. |
| <kbd>Tab</kbd> | Next focusable element in the panel; wraps from the last to the first. |
| <kbd>Shift</kbd> + <kbd>Tab</kbd> | Previous one; wraps from the first to the last. |
| <kbd>Escape</kbd> | Closes the drawer. |
