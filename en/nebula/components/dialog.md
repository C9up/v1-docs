# Dialog

A modal window over the page. Opening it does everything a hand-built modal tends to forget: a backdrop, focus trapped inside and handed back to the trigger on close, page scroll locked without the sideways jump when the scrollbar disappears, <kbd>Escape</kbd> and a backdrop click to close — and the rest of the page hidden from assistive technology, so a screen reader cannot wander out of a dialog a sighted user cannot leave.

`DialogContent` renders nothing where it is written: the dialog portals its overlay to `<body>` when it opens. Its parts are built during `Dialog`'s setup, so `DialogTitle` and `DialogDescription` have registered before the panel is wired, and the panel points `aria-labelledby` and `aria-describedby` at them. A dialog with no `DialogTitle` would be announced only as "dialog", so it logs a warning.

```sh
ream nebula:add dialog
```

Organism · `organisms/Dialog.ts` · [Button](/en/nebula/components/button)

## Usage

```ts
import { html } from '@c9up/aurora'
import {
  Button, buttonVariants,
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@c9up/nebula'

Dialog({
  children: () => html`
    ${DialogTrigger({ class: buttonVariants({ variant: 'outline' }), children: 'Edit profile' })}
    ${DialogContent({
      children: () => html`
        ${DialogHeader({ children: html`
          ${DialogTitle({ children: 'Edit profile' })}
          ${DialogDescription({ children: 'Change your name and email.' })}
        ` })}
        ${DialogFooter({ children: Button({ children: 'Save', onClick: () => save() }) })}
      `,
    })}
  `,
})
```

`DialogTrigger` and `DialogClose` are `<button>`s themselves, with no look of their own: give them `buttonVariants(…)` rather than a `Button` inside, which would nest a button in a button.

## Examples

### The title is a value

`Dialog` and `DialogContent` take their parts in a thunk. `DialogHeader` does not: it takes a `Slot`, which the renderer calls after the panel has looked for a title, so a `DialogTitle` built in a `() =>` there renders but leaves the panel unnamed. Pass the header a value, and put what changes *inside* the title:

```ts
DialogHeader({ children: DialogTitle({ children: 'Edit profile' }) })              // ✓ a value
DialogHeader({ children: () => html`${DialogTitle({ children: 'Edit profile' })}` }) // ✗ too late
```

See [composition](/en/nebula/composition#compound-components-take-their-parts-in-a-thunk).

### One dialog, two contents

A dialog switched between creating and editing. The title follows the signal because its `children` is an accessor; the body follows it because it is one too — a value would be captured once, at setup, and the first form would stay:

```ts
import { html, signal } from '@c9up/aurora'

const mode = signal<'create' | 'edit'>('create')

Dialog({
  children: () => html`
    ${DialogTrigger({ children: 'Open' })}
    ${DialogContent({
      children: () => html`
        ${DialogHeader({
          children: DialogTitle({ children: () => (mode() === 'create' ? 'New project' : 'Edit project') }),
        })}
        ${() => (mode() === 'create' ? createForm() : editForm())}
      `,
    })}
  `,
})
```

### A form that closes on save

Focus lands on the first focusable element in the panel — here the name field. The dialog is controlled, so the submit handler closes it once the save has gone through:

```ts
import { html, signal } from '@c9up/aurora'
import { Input, Label, DialogClose } from '@c9up/nebula'

const open = signal(false)

Dialog({
  open,
  onOpenChange: open,
  children: () => html`
    ${DialogTrigger({ class: buttonVariants(), children: 'New project' })}
    ${DialogContent({
      children: () => html`
        <form
          class="grid gap-4"
          @submit="${async (event: SubmitEvent) => {
            event.preventDefault()
            await save()
            open(false)
          }}"
        >
          ${DialogHeader({ children: DialogTitle({ children: 'New project' }) })}
          ${Label({ for: 'project-name', children: 'Name' })}
          ${Input({ id: 'project-name', name: 'name', required: true })}
          ${DialogFooter({ children: html`
            ${DialogClose({ class: buttonVariants({ variant: 'outline' }), children: 'Cancel' })}
            ${Button({ type: 'submit', children: 'Create' })}
          ` })}
        </form>
      `,
    })}
  `,
})
```

### Opened from elsewhere

With no `DialogTrigger`, the dialog opens from a signal — a row action, a keyboard shortcut, a server event:

```ts
const expired = signal(false)

Dialog({
  open: expired,
  onOpenChange: expired,
  children: () => DialogContent({
    children: () => html`
      ${DialogHeader({ children: DialogTitle({ children: 'Session expired' }) })}
      <p>Sign in again to continue.</p>
    `,
  }),
})

expired(true)
```

`onOpenChange` has to write back. A controlled `open` wins on every read, and <kbd>Escape</kbd>, the corner cross and the backdrop all close by calling `onOpenChange(false)` — a dialog whose `onOpenChange` ignores it stays open.

`useDialog()` packages the same signal with `show` and `hide`:

```ts
import { useDialog } from '@c9up/nebula'

const editor = useDialog()

Button({ children: 'Edit', onClick: editor.show })

Dialog({
  open: editor.open,
  onOpenChange: (next) => (next ? editor.show() : editor.hide()),
  children: () => DialogContent({
    children: () => DialogTitle({ children: 'Edit' }),
  }),
})
```

### Closing from inside

`DialogClose` closes the dialog from anywhere in the content. Hide the corner cross when a footer button already says the same thing:

```ts
Dialog({
  children: () => html`
    ${DialogTrigger({ children: 'Details' })}
    ${DialogContent({
      showCloseButton: false,
      children: () => html`
        ${DialogHeader({ children: DialogTitle({ children: 'Order #1042' }) })}
        ${DialogFooter({ children: DialogClose({ class: buttonVariants(), children: 'Done' }) })}
      `,
    })}
  `,
})
```

`DialogFooter({ showCloseButton: true })` appends an outline "Close" button after the footer's own children.

### A title only screen readers hear

A dialog whose content already says what it is — an image preview — still needs a name:

```ts
DialogTitle({ srOnly: true, children: 'Image preview' })
```

### A decision that must be made

`dismissOnOutside: false` stops a backdrop click from closing the dialog, and `dismissOnEscape: false` stops <kbd>Escape</kbd>. For a yes/no confirmation, [AlertDialog](/en/nebula/components/alert-dialog) already does this and focuses the safe answer.

```ts
DialogContent({
  dismissOnOutside: false,
  showCloseButton: false,
  children: () => html`
    ${DialogHeader({ children: DialogTitle({ children: 'Accept the new terms' }) })}
    ${DialogFooter({ children: DialogClose({ class: buttonVariants(), children: 'Accept' }) })}
  `,
})
```

## API

### Dialog

The state every part reads. Renders no element of its own.

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `Reactive<boolean>` | — | Controlled state. While it reads as anything but `undefined`, it wins over the dialog's own. |
| `defaultOpen` | `boolean` | `false` | Starting state when uncontrolled. |
| `onOpenChange` | `(open: boolean) => void` | — | Told of every change, controlled or not. |
| `children` | `Parts` | — | The trigger and the content, in a `() =>`. |

### DialogTrigger

A `<button>` that opens the dialog.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The button's content. |
| `class` | `Reactive<string>` | — | The button's classes — it has none of its own. |

### DialogContent

The panel. Registers what to render and returns nothing in place.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The panel's content, in a `() =>`. |
| `showCloseButton` | `boolean` | `true` | The cross in the top-right corner. |
| `closeLabel` | `string` | `'Close'` | The cross's accessible name. |
| `dismissOnOutside` | `boolean` | `true` | A click outside the panel closes it. |
| `dismissOnEscape` | `boolean` | `true` | <kbd>Escape</kbd> closes it. |
| `class` | `Reactive<string>` | — | Merged into the panel's classes. Read each time the panel opens. |

### DialogHeader

`DialogSectionProps`: a column for the title and the description, centred on narrow screens.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | Pass a value when it holds the `DialogTitle`. |
| `class` | `Reactive<string>` | — | Merged into the header's classes. |

### DialogFooter

The actions, stacked on narrow screens and right-aligned from `sm`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The buttons. |
| `showCloseButton` | `boolean` | `false` | Append an outline close button after the children. |
| `closeLabel` | `string` | `'Close'` | That button's text. |
| `class` | `Reactive<string>` | — | Merged into the footer's classes. |

### DialogTitle

An `<h2>` that names the panel.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The title. An accessor follows a signal. |
| `srOnly` | `boolean` | `false` | Kept for screen readers, out of the layout. |
| `class` | `Reactive<string>` | — | Merged into the title's classes. |

### DialogDescription

A `<p>` that describes the panel. Takes `DialogSectionProps`: `children: Slot`, `class: Reactive<string>`.

### DialogClose

A `<button>` that closes the dialog, from anywhere inside it.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The button's content. |
| `class` | `Reactive<string>` | — | The button's classes — it has none of its own. |

### DialogOverlay

The backdrop, for composing a surface of your own. `DialogContent` already renders one.

| Prop | Type | Default | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Merged into `dialogBackdropClasses`. |

### DialogPortal

Mounts its children at the end of `container`, outside the component's own position. `DialogContent` does not need it.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | What to mount. |
| `container` | `() => Element \| null` | `document.body` | Where to mount. |

### useDialog

`useDialog(initial = false): { open: () => boolean; show(): void; hide(): void }` — a signal for a dialog driven from outside, with no trigger of its own.

### dialogBackdropClasses, dialogPanelClasses

The backdrop's and the centred panel's class strings, for a surface that should look like a dialog.

## Accessibility

The panel is `role="dialog"` with `aria-modal="true"`, named by its `DialogTitle` (`aria-labelledby`) and described by its `DialogDescription` (`aria-describedby`); with no description the attribute is left off rather than pointed at nothing. While it is open, every sibling of the overlay gets `aria-hidden="true"` — what was already hidden stays hidden on close, and a toast's live region is left alone. The trigger carries `aria-haspopup="dialog"`, `aria-expanded` and `data-state`.

On open, focus moves to the first focusable element in the panel (the corner cross when nothing else is). On close it returns to the trigger, or to whatever had it before when the dialog has none. Dialogs opened over one another stack: <kbd>Escape</kbd> and the focus trap belong to the topmost one.

| Key | Action |
|---|---|
| <kbd>Enter</kbd> / <kbd>Space</kbd> | On the trigger, opens the dialog. |
| <kbd>Tab</kbd> | Next focusable element in the panel; wraps from the last to the first. |
| <kbd>Shift</kbd> + <kbd>Tab</kbd> | Previous one; wraps from the first to the last. |
| <kbd>Escape</kbd> | Closes the dialog, unless `dismissOnEscape` is `false`. |

The corner cross reads "Close": `closeLabel` on `DialogContent` replaces it, and `closeLabel` on `DialogFooter` the footer button's text — see [languages](/en/nebula/languages).
