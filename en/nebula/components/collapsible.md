# Collapsible

A trigger that shows and hides one panel: "show more", an advanced-settings block, a list that folds away. An [Accordion](/en/nebula/components/accordion) is several of these that know about each other; a collapsible is one, on its own.

The panel animates with a CSS grid whose single row goes from `0fr` to `1fr`, which animates the open and close with no measured height, no resize observer, and no stale height when the content changes while closed. That needs the closed panel to stay in the DOM, so it is made `inert`: otherwise it would keep its tab stops and its place in the accessibility tree, and a keyboard user would tab into content that is not on screen.

The trigger is deliberately bare — a flex row with no border, padding or focus ring — because what it looks like depends entirely on where it sits. Style it with `class`.

```sh
ream nebula:add collapsible
```

Molecule · `molecules/Collapsible.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@c9up/nebula'

Collapsible({
  children: () => html`
    ${CollapsibleTrigger({ children: 'Show the delivery address' })}
    ${CollapsibleContent({ children: '12 Rue du Lac, 1003 Lausanne' })}
  `,
})
```

The parts go in `() =>`: they read the open state from `Collapsible`'s context — see [composition](/en/nebula/composition).

## Examples

### Open at first render

```ts
Collapsible({
  defaultOpen: true,
  children: () => html`
    ${CollapsibleTrigger({ children: 'Order details' })}
    ${CollapsibleContent({ children: 'Three items, shipped together.' })}
  `,
})
```

### Controlled

Pass `open` and the app owns the state; the trigger asks for a change through `onOpenChange`. A signal is both, so the panel can be opened from anywhere else in the page:

```ts
import { signal } from '@c9up/aurora'
import { Button } from '@c9up/nebula'

const open = signal(false)

Collapsible({
  open,
  onOpenChange: open,
  children: () => html`
    ${CollapsibleTrigger({ children: 'Advanced settings' })}
    ${CollapsibleContent({ children: 'Proxy, timeouts, retries.' })}
  `,
})

Button({ variant: 'link', children: 'Show advanced settings', onClick: () => open(true) })
```

`open` wins on every read as long as it reads as something other than `undefined`, so a value that only arrives after a load still takes over. `onOpenChange` is called either way, controlled or not.

### A styled trigger

The trigger takes any classes; `buttonVariants` gives it a button's look and its focus ring:

```ts
import { ChevronsUpDownIcon, buttonVariants } from '@c9up/nebula'

Collapsible({
  class: 'gap-2',
  children: () => html`
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-semibold">3 starred repositories</h4>
      ${CollapsibleTrigger({
        class: buttonVariants({ variant: 'ghost', size: 'icon', class: 'size-8' }),
        children: html`${ChevronsUpDownIcon()}<span class="sr-only">Toggle</span>`,
      })}
    </div>
    ${CollapsibleContent({ class: 'flex flex-col gap-2', children: html`
      <div class="rounded-md border px-4 py-2 text-sm">c9up/aurora</div>
      <div class="rounded-md border px-4 py-2 text-sm">c9up/nebula</div>
    ` })}
  `,
})
```

`class` on `CollapsibleContent` lands on the box that holds the content, inside the animated grid, so a layout like `flex flex-col gap-2` applies to the children themselves.

### Disabled

```ts
Collapsible({
  disabled: () => !user.canSeeBilling(),
  children: () => html`
    ${CollapsibleTrigger({ children: 'Billing history' })}
    ${CollapsibleContent({ children: 'Twelve invoices.' })}
  `,
})
```

A disabled collapsible keeps whatever state it is in: the trigger is disabled and a click changes nothing.

## API

### Collapsible

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `Reactive<boolean>` | — | Controlled state. When it reads as a boolean, it wins over the internal one. |
| `defaultOpen` | `boolean` | `false` | Starting state when uncontrolled. |
| `disabled` | `Reactive<boolean>` | `false` | Disables the trigger and refuses every toggle. |
| `onOpenChange` | `(open: boolean) => void` | — | Called on every toggle, controlled or not. |
| `class` | `Reactive<string>` | — | Merged into the root's classes (`flex flex-col`). |
| `children` | `Parts` | — | The trigger and the content, built in `() =>`. |

### CollapsibleTrigger

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The trigger's content. |
| `class` | `Reactive<string>` | — | Merged into the button's classes. |

### CollapsibleContent

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The panel's content. |
| `class` | `Reactive<string>` | — | Merged into the inner box (`overflow-hidden`), not the animated grid. |

## Accessibility

The trigger is a native `<button>` with `aria-expanded` and `aria-controls` pointing at the panel; the panel is `role="region"`, with `aria-labelledby` pointing back at the trigger. A closed panel is `inert`: out of the tab order and the accessibility tree. The transition is dropped under `prefers-reduced-motion`. `data-state="open"` or `"closed"` is set on the root, the trigger and the panel.

The trigger draws no focus ring of its own, and its `outline-none` also removes the browser's outline: left unstyled, it shows no focus at all. Give it a ring through `class`, as `buttonVariants` does in the example above.

| Key | Action |
|---|---|
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Opens or closes the panel (the native button's click). |
