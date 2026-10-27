# AlertDialog

A modal that interrupts to ask a question. It is a [Dialog](/en/nebula/components/dialog) — same backdrop, focus trap, scroll lock and hidden page behind — with everything that would let the question be dismissed by accident taken away: a click on the backdrop does nothing, there is no corner cross, and focus lands on **Cancel**, not on the confirming action, so a hurried <kbd>Enter</kbd> takes the safe way out.

<kbd>Escape</kbd> still closes it, and it cancels rather than confirms: it is the keyboard spelling of the same safe way out. The answer reaches you through `onConfirm` and `onCancel`; both close the dialog after calling you.

```sh
ream nebula:add alert-dialog
```

Organism · `organisms/AlertDialog.ts` · [Button](/en/nebula/components/button), [Dialog](/en/nebula/components/dialog)

## Usage

```ts
import { html } from '@c9up/aurora'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, buttonVariants,
} from '@c9up/nebula'

AlertDialog({
  onConfirm: () => remove(),
  children: () => html`
    ${AlertDialogTrigger({ class: buttonVariants({ variant: 'destructive' }), children: 'Delete' })}
    ${AlertDialogContent({
      children: () => html`
        ${AlertDialogHeader({ children: html`
          ${AlertDialogTitle({ children: 'Delete this project?' })}
          ${AlertDialogDescription({ children: 'Its files and history go with it. This cannot be undone.' })}
        ` })}
        ${AlertDialogFooter({ children: html`
          ${AlertDialogCancel({ children: 'Cancel' })}
          ${AlertDialogAction({ variant: 'destructive', children: 'Delete' })}
        ` })}
      `,
    })}
  `,
})
```

`AlertDialogHeader` gets a value, not a `() =>`: the title has to be registered when the panel looks for it — see [Dialog](/en/nebula/components/dialog#the-title-is-a-value). `AlertDialogAction` and `AlertDialogCancel` are already styled buttons; `AlertDialogTrigger` is a bare `<button>` that takes `buttonVariants(…)`.

## Examples

### Small, with an icon

`size: 'sm'` narrows the panel, centres the header and puts the two buttons side by side. `AlertDialogMedia` is the block above the title for a warning glyph or a product mark; an SVG in it is sized to 32 px unless it carries its own `size-*` class.

```ts
import { AlertDialogMedia, CircleIcon } from '@c9up/nebula'

AlertDialogContent({
  size: 'sm',
  children: () => html`
    ${AlertDialogHeader({ children: html`
      ${AlertDialogMedia({ children: CircleIcon() })}
      ${AlertDialogTitle({ children: 'Leave without saving?' })}
    ` })}
    ${AlertDialogFooter({ children: html`
      ${AlertDialogCancel({ children: 'Stay' })}
      ${AlertDialogAction({ children: 'Leave' })}
    ` })}
  `,
})
```

### Asked from elsewhere

A confirmation opened by a row's menu rather than by a trigger of its own:

```ts
import { signal } from '@c9up/aurora'

const confirming = signal(false)

AlertDialog({
  open: confirming,
  onOpenChange: confirming,
  onConfirm: () => archive(),
  children: () => AlertDialogContent({
    children: () => html`
      ${AlertDialogHeader({ children: AlertDialogTitle({ children: 'Archive 12 invoices?' }) })}
      ${AlertDialogFooter({ children: html`
        ${AlertDialogCancel({ children: 'Cancel' })}
        ${AlertDialogAction({ children: 'Archive' })}
      ` })}
    `,
  }),
})

confirming(true)
```

### Staying open while the request runs

`onConfirm` is called and the dialog asks to close at once. A controlled dialog can refuse: `onOpenChange` is only a request, and one that ignores the `false` leaves the dialog up — Escape included — until the work is done:

```ts
const open = signal(false)
const deleting = signal(false)

AlertDialog({
  open,
  onOpenChange: (next) => { if (!deleting()) open(next) },
  onConfirm: async () => {
    if (deleting()) return
    deleting(true)
    try { await remove() } finally { deleting(false) }
    open(false)
  },
  children: () => html`
    ${AlertDialogTrigger({ class: buttonVariants({ variant: 'destructive' }), children: 'Delete' })}
    ${AlertDialogContent({
      children: () => html`
        ${AlertDialogHeader({ children: AlertDialogTitle({ children: 'Delete this project?' }) })}
        ${AlertDialogFooter({ children: html`
          ${AlertDialogCancel({ children: 'Cancel' })}
          ${AlertDialogAction({ variant: 'destructive', children: () => (deleting() ? 'Deleting…' : 'Delete') })}
        ` })}
      `,
    })}
  `,
})
```

## API

### AlertDialog

The state every part reads. Renders no element of its own.

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `Reactive<boolean>` | — | Controlled state. While it reads as anything but `undefined`, it wins. |
| `defaultOpen` | `boolean` | `false` | Starting state when uncontrolled. |
| `onOpenChange` | `(open: boolean) => void` | — | Told of every change, controlled or not. |
| `onConfirm` | `() => void` | — | The action was pressed. Called before the dialog closes. |
| `onCancel` | `() => void` | — | Cancel was pressed, or <kbd>Escape</kbd>. Called before the dialog closes. |
| `children` | `Parts` | — | The trigger and the content, in a `() =>`. |

### AlertDialogTrigger

A `<button>` that opens the dialog.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The button's content. |
| `class` | `Reactive<string>` | — | The button's classes — it has none of its own. |

### AlertDialogContent

The panel. Registers what to render and returns nothing in place.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The panel's content, in a `() =>`. |
| `size` | `'default' \| 'sm'` | `'default'` | `sm` is a narrow panel with a centred header and two equal buttons. |
| `class` | `Reactive<string>` | — | Merged into the panel's classes. Read each time the panel opens. |

### AlertDialogHeader, AlertDialogFooter, AlertDialogMedia, AlertDialogTitle, AlertDialogDescription

All take `AlertDialogSectionProps`:

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The content. Pass `AlertDialogHeader` a value when it holds the title. |
| `class` | `Reactive<string>` | — | Merged into the part's classes. |

`AlertDialogTitle` is an `<h2>` that names the panel, `AlertDialogDescription` a `<p>` that describes it. `AlertDialogMedia` is a 64 px block that sits beside the title and description in a default-size panel from the `sm` breakpoint, above them otherwise.

### AlertDialogAction, AlertDialogCancel

`AlertDialogButtonProps` — buttons that answer, styled by [buttonVariants](/en/nebula/components/button#buttonvariants).

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The button's text. |
| `variant` | `ButtonVariants['variant']` | `'default'` (action), `'outline'` (cancel) | A [Button](/en/nebula/components/button) variant. |
| `size` | `ButtonVariants['size']` | `'default'` | A Button size. |
| `class` | `Reactive<string>` | — | Merged last. |

The action calls `onConfirm` then closes; the cancel calls `onCancel` then closes, and is where focus lands on open.

### AlertDialogOverlay

The backdrop, for composing a surface of your own; `AlertDialogContent` already renders one. Takes `AlertDialogSectionProps`; only `class` is used.

### AlertDialogPortal

Mounts its children at the end of `container`. `AlertDialogContent` does not need it.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | What to mount. |
| `container` | `() => Element \| null` | `document.body` | Where to mount. |

## Accessibility

The panel is `role="alertdialog"` with `aria-modal="true"`, which tells a screen reader it interrupts. It is named by `AlertDialogTitle` (`aria-labelledby`) and described by `AlertDialogDescription` (`aria-describedby`); a missing title logs a warning. While it is open, the rest of the page is `aria-hidden`, focus is trapped inside, and page scroll is locked. Focus starts on `AlertDialogCancel` — or on the first focusable element when there is none — and returns to the trigger on close, or to whatever had it before when the dialog has no trigger. The trigger carries `aria-haspopup="dialog"`, `aria-expanded` and `data-state`.

| Key | Action |
|---|---|
| <kbd>Enter</kbd> / <kbd>Space</kbd> | On the trigger, opens the dialog; on a focused button, presses it. |
| <kbd>Tab</kbd> | Next focusable element in the panel; wraps from the last to the first. |
| <kbd>Shift</kbd> + <kbd>Tab</kbd> | Previous one; wraps from the first to the last. |
| <kbd>Escape</kbd> | Cancels: calls `onCancel` and closes. |

A click outside the panel never closes it.
