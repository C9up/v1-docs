# Tooltip

A short label that appears when the pointer rests on a control or the keyboard lands on it. Four parts: a `TooltipProvider` that owns the timing for a group, a `Tooltip` that owns one tooltip's state, a `TooltipTrigger` around the control and a `TooltipContent` with the text.

What separates a usable tooltip from an irritating one is time, not looks. A **close delay** of 150 ms lets the pointer travel from the trigger into the tooltip — to read a long one — without dismissing it halfway. **No delay between neighbours**: once one tooltip has closed, the next in the same group opens instantly for `skipDelayDuration`, because a user moving along a toolbar has decided to browse it. And **focus opens it at once**: a keyboard user landing on a control has already committed to it. The open delay on hover is 0 ms unless a provider or the tooltip sets `delayDuration`.

A tooltip *describes* its control; it never names it. The trigger points `aria-describedby` at it, and a button labelled only by its tooltip is unlabelled to anything that does not hover — give an icon button its own `label`.

```sh
ream nebula:add tooltip
```

Organism · `organisms/Tooltip.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { Button, SearchIcon, Tooltip, TooltipContent, TooltipTrigger } from '@c9up/nebula'

Tooltip({
  children: () => html`
    ${TooltipTrigger({ children: Button({ size: 'icon', label: 'Search', children: SearchIcon() }) })}
    ${TooltipContent({ children: 'Search the archive' })}
  `,
})
```

`TooltipTrigger` wraps the control in an inline-flex `<span>`; the control inside is what takes focus, so wrap something focusable — plain text would be out of reach of the keyboard.

## Examples

### A toolbar

A provider gives a group its own timing. Here the first tooltip waits 500 ms, and its neighbours open at once for 300 ms after one closes:

```ts
import { ChevronLeftIcon, ChevronRightIcon, TooltipProvider } from '@c9up/nebula'

TooltipProvider({
  delayDuration: 500,
  children: () => html`
    ${Tooltip({ children: () => html`
      ${TooltipTrigger({ children: Button({ size: 'icon', label: 'Previous', children: ChevronLeftIcon() }) })}
      ${TooltipContent({ children: 'Previous page' })}
    ` })}
    ${Tooltip({ children: () => html`
      ${TooltipTrigger({ children: Button({ size: 'icon', label: 'Next', children: ChevronRightIcon() }) })}
      ${TooltipContent({ children: 'Next page' })}
    ` })}
  `,
})
```

Without a provider, every tooltip on the page shares one default group.

### Placement

`TooltipContent` sits above the trigger by default and flips when there is no room. Its arrow is kept centred on the trigger, even when the tooltip slides along its edge to stay on screen:

```ts
TooltipContent({ side: 'right', sideOffset: 4, children: 'Pinned to the sidebar' })
```

### Text that changes

`TooltipContent`'s `children` is a value, not an accessor: what changes goes inside a template.

```ts
TooltipContent({ children: html`${() => `${unread()} unread`}` })
```

### Opened by the app

```ts
import { signal } from '@c9up/aurora'

const hint = signal(false)

Tooltip({
  open: hint,
  children: () => html`
    ${TooltipTrigger({ children: Button({ children: 'Export' }) })}
    ${TooltipContent({ children: 'New: export to PDF' })}
  `,
})

hint(true)
```

While `open` reads as a boolean, it decides. Without an `onOpenChange` that writes back, hover and focus change nothing.

### Content the pointer cannot enter

`disableHoverableContent` closes the tooltip 150 ms after the pointer leaves the trigger, even on its way into the tooltip — for a tooltip that sits over something the user is aiming at:

```ts
Tooltip({
  disableHoverableContent: true,
  children: () => html`
    ${TooltipTrigger({ children: Button({ variant: 'ghost', children: 'Info' }) })}
    ${TooltipContent({ children: 'Last synced 2 minutes ago' })}
  `,
})
```

## API

### TooltipProvider

Timing shared by every tooltip inside it. Renders no element of its own.

| Prop | Type | Default | Description |
|---|---|---|---|
| `delayDuration` | `number` | `0` | Hover delay before opening, in ms. |
| `skipDelayDuration` | `number` | `300` | How long after one closes that the next in the group opens instantly, in ms. |
| `disableHoverableContent` | `boolean` | `false` | Close when the pointer leaves the trigger, even towards the tooltip. |
| `children` | `Parts` | — | The tooltips, in a `() =>`. |

### Tooltip

One tooltip's state. Renders no element of its own.

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `Reactive<boolean>` | — | Controlled state. While it reads as anything but `undefined`, it wins. |
| `defaultOpen` | `boolean` | `false` | Starting state when uncontrolled. |
| `onOpenChange` | `(open: boolean) => void` | — | Told of every change, controlled or not. |
| `delayDuration` | `number` | the provider's | Overrides the provider's delay for this tooltip only. |
| `disableHoverableContent` | `boolean` | the provider's | Overrides the provider's setting for this tooltip only. |
| `children` | `Parts` | — | The trigger and the content, in a `() =>`. |

### TooltipTrigger

The control being described, wrapped in an inline-flex `<span>`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The control. |
| `class` | `Reactive<string>` | — | The wrapper's classes. |

### TooltipContent

The label, with its arrow. Registers what to render and returns nothing in place.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Child` | — | The text. A value; put what changes in an accessor inside a template. |
| `side` | `Side` | `'top'` | `'top' \| 'right' \| 'bottom' \| 'left'`. Flips when there is no room. |
| `align` | `Align` | `'center'` | `'start' \| 'center' \| 'end'` along that side. |
| `sideOffset` | `number` | `0` | The gap between the trigger and the tooltip, in px. |
| `class` | `Reactive<string>` | — | Merged into the tooltip's classes. Read each time it opens. |

## Accessibility

The content is `role="tooltip"`. While it is open, the trigger wrapper carries `aria-describedby` pointing at it — a description, never `aria-labelledby` — and `data-state`. The tooltip never takes focus and is not a layer a click dismisses: it closes because the pointer or the focus left, after 150 ms.

| Key | Action |
|---|---|
| <kbd>Tab</kbd> | Focusing the control opens its tooltip at once; leaving it closes the tooltip. |
| <kbd>Escape</kbd> | Closes the tooltip. |
