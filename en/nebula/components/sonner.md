# Sonner

Transient notifications, the way shadcn ships them: a region mounted once near the root of the app, and a `toast` function callable from anywhere — an event handler, a form's error branch, a service — with no handle threaded down to it. The API is sonner's: the same `toast` methods, the same options, the same Toaster props and the same defaults — four seconds on screen, three toasts visible, a 14 px gap, 356 px wide, <kbd>Alt</kbd>+<kbd>T</kbd> to reach the region. The look is shadcn's: the popover surface and the lucide icons.

Toasts pile up behind the newest one, scaled down, and fan out while the pointer is over them — which also holds every timer, so a toast being read does not vanish. The stack is computed into style properties rather than driven by an injected stylesheet, so it works under every adapter. They are written through the CSSOM, never as a `style` attribute, so a strict Content-Security-Policy — no `'unsafe-inline'`, as blackhole sends by default — leaves them alone. The server writes no properties: until the page hydrates, the list is already `fixed` through a class, and it is empty anyway, since toasts are raised on the client.

```sh
ream nebula:add sonner
```

Organism · `organisms/Sonner.ts` · no dependencies

## Usage

```ts
import { Sonner, sonnerToast } from '@c9up/nebula'

// Once, in the app's layout.
Sonner({ richColors: true, closeButton: true })

// Anywhere.
sonnerToast('Event created', { description: 'Sunday, 9:00' })
```

The file exports `Toaster` and `toast`, as sonner does. The package barrel renames them `Sonner` and `sonnerToast`, because the deprecated [Toaster](/en/nebula/components/toaster) still owns those names; a copy added with `ream nebula:add sonner` keeps the original names:

```ts
import { Toaster, toast } from './components/organisms/Sonner.js'
```

The examples below use the file's names.

## Examples

### Types

```ts
toast('Invitation sent')                                  // plain: no icon
toast.success('Changes saved', { description: 'They are live for everyone.' })
toast.info('A new version is available')
toast.warning('Storage almost full')
toast.error('Could not save')
toast.loading('Uploading report.pdf…')                     // stays until replaced
```

Each type but the plain one carries shadcn's icon. A `loading` toast has no timer: it waits for an outcome. `duration: Infinity` keeps any other toast until it is dismissed.

### Rich colours

```ts
Toaster({ richColors: true })
toast.error('Payment declined')   // a red surface instead of the popover one
```

`richColors` can also be set on one toast. `theme` (`'light'`, `'dark'`, or `'system'`, the default, which follows the app's `dark` variant) and `invert` change the surface.

### An action, and a cancel

```ts
toast('Conversation archived', {
  action: { label: 'Undo', onClick: () => unarchive(conversationId) },
})

toast('Delete this draft?', {
  cancel: { label: 'Keep it', onClick: () => {} },
  action: { label: 'Delete', onClick: () => remove(draftId) },
})
```

The action runs its `onClick`, then closes the toast — unless the handler called `event.preventDefault()`, which keeps it. The cancel button runs its `onClick` and closes the toast without calling `onDismiss`. Both take `{ label, onClick }`; for content of your own, use `toast.custom`.

### One toast per problem

A toast raised under an `id` already on screen updates it instead of stacking another, so "you are offline", raised on every failed request, stays one toast:

```ts
toast.warning('You are offline', { id: 'offline', duration: Infinity })
toast.warning('Still offline — retrying', { id: 'offline', duration: Infinity })

// Back online.
toast.dismiss('offline')
```

The same mechanism turns a loading toast into its outcome:

```ts
const id = toast.loading('Saving…')
// later
toast.success('Saved', { id })
```

`toast.dismiss()` with no id dismisses every toast, and `toast.getToasts()` lists those on screen, newest first.

### Following a promise

```ts
const { id, unwrap } = toast.promise(save(form), {
  loading: 'Saving…',
  success: (saved) => `Saved ${saved.name}`,
  error: 'Could not save',
})

const saved = await unwrap()   // the value, or the rejection handed back
```

One toast goes from `loading` to `success` or `error`. A stage is a message, a function of the outcome (which may be async), or `{ message, ...options }`. An HTTP response whose `ok` is `false` is reported through `error`, with `HTTP error! status: <code>`. When no stage says what happened, the loading toast is dismissed. `finally` runs once the promise settles. `work` may also be a function returning the promise.

`toast.promise` returns `{ id, unwrap }` rather than the id with `unwrap` attached: a rejection is reported in the toast, and `unwrap()` hands it back to the caller's own error path.

### Your own content

```ts
toast.custom((id) => html`<div class="rounded-md border p-4">
  Uploaded. ${Button({ size: 'sm', onClick: () => toast.dismiss(id), children: 'OK' })}
</div>`)
```

`render` receives the toast's id. The result is shown in place of the title, unstyled.

### Position, several regions

```ts
Toaster({ position: 'top-center', expand: true, visibleToasts: 5 })

toast('Copied', { position: 'bottom-center' })   // a corner of its own
```

There are six positions — `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, `bottom-right` (the default). A toast with its own `position` gets a list of its own in that corner. `expand` keeps the stack fanned out. A second region takes an `id`, and shows only the toasts raised with that `toasterId`:

```ts
Toaster({ id: 'editor', position: 'top-right' })
toast('Draft saved', { toasterId: 'editor' })
```

## API

### Toaster

The region. Mount it once near the root; it shows the toasts addressed to its `id`, or those with no `toasterId` when it has none.

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `Position` | `'bottom-right'` | The corner. |
| `richColors` | `boolean` | `false` | Coloured surfaces per type. |
| `closeButton` | `boolean` | `false` | A close cross on every toast. |
| `expand` | `boolean` | `false` | Keep the stack fanned out instead of piled up. |
| `duration` | `number` | `4000` | Milliseconds on screen. |
| `visibleToasts` | `number` | `3` | How many show at once; the rest are kept, hidden. |
| `gap` | `number` | `14` | Space between fanned-out toasts, in px. |
| `theme` | `'light' \| 'dark' \| 'system'` | `'system'` | `system` follows the app's `dark` variant. |
| `invert` | `boolean` | `false` | Swap the light and dark surfaces. |
| `hotkey` | `string[]` | `['altKey', 'KeyT']` | `KeyboardEvent` keys and codes that reach the region. |
| `offset` | `Offset` | `'24px'` | From the viewport's edges: a value, or `{ top, right, bottom, left }`. |
| `mobileOffset` | `Offset` | `'16px'` | The same, at 600 px wide and under. |
| `dir` | `'rtl' \| 'ltr' \| 'auto'` | — | Writing direction of the region. |
| `icons` | `ToastIcons` | shadcn's | Replace the icon of `success`, `info`, `warning`, `error`, `loading`, or the close cross; `null` shows none. |
| `toastOptions` | `ToastOptions` | — | Defaults for every toast: `class`, `descriptionClass`, `classNames`, `closeButton`, `duration`, `unstyled`, `closeButtonAriaLabel` (default `'Close toast'`). |
| `containerAriaLabel` | `string` | `'Notifications'` | The region's name, before the hotkey. |
| `customAriaLabel` | `string` | — | Replaces the region's whole accessible name. |
| `id` | `string` | — | Show only the toasts raised with this `toasterId`. |
| `class` | `Reactive<string>` | — | Merged into the region's classes. |

### toast

| Method | Returns | Description |
|---|---|---|
| `toast(message, options?)` | `ToastId` | A plain toast. `toast.message` is the same. |
| `toast.success` / `info` / `warning` / `error` `(message, options?)` | `ToastId` | A toast of that type, with its icon. |
| `toast.loading(message, options?)` | `ToastId` | A spinner and no timer. |
| `toast.custom(render: (id) => Child, options?)` | `ToastId` | Your own content, unstyled. |
| `toast.promise(work, data?)` | `{ id, unwrap }` | One toast for the life of an async call. |
| `toast.dismiss(id?)` | `ToastId \| undefined` | Dismiss one toast, or every toast with no id. |
| `toast.getToasts()` | `ToastT[]` | The toasts on screen, newest first. |

### Toast options

What every `toast` call takes after its message (`ExternalToast`).

| Option | Type | Description |
|---|---|---|
| `id` | `number \| string` | A stable id. A toast raised under an id already on screen updates it. |
| `description` | `Slot` | A second, muted line. |
| `duration` | `number` | Milliseconds on screen. `Infinity` keeps it until dismissed. |
| `action` / `cancel` | `{ label, onClick }` | The two buttons. |
| `onDismiss` | `(toast) => void` | Called when the close cross or `toast.dismiss` removes it — not on `cancel`. |
| `onAutoClose` | `(toast) => void` | Called when its time runs out. |
| `dismissible` | `boolean` | `false` keeps the close cross and the cancel button from removing it; its timer still runs, so pair it with `duration: Infinity` to pin it. |
| `closeButton`, `richColors`, `invert` | `boolean` | Per-toast overrides of the Toaster's. |
| `icon` | `Child` | Replaces the type's icon; `null` shows none. |
| `position` | `Position` | A corner of its own. |
| `toasterId` | `string` | Shown only by the Toaster with this `id`. |
| `class`, `descriptionClass`, `classNames` | `string`, `string`, `ToastClassnames` | Extra classes, merged after nebula's own. |
| `unstyled` | `boolean` | Drops nebula's look, keeping only the layout. |
| `testId` | `string` | Written as `data-testid`. |

## Accessibility

The region is a `<section>` named after the hotkey (`"Notifications alt+T"`), and it holds two hidden live regions, mounted empty before any toast exists: a polite one (`role="status"`) for every toast, and an assertive one (`role="alert"`) for errors — an error does not wait behind whatever is being read. An update is announced too, so a promise reaching its outcome is heard. The region carries `data-nebula-live`, which exempts it from the `aria-hidden` a modal [Dialog](/en/nebula/components/dialog) puts on its siblings.

| Key | Action |
|---|---|
| <kbd>Alt</kbd>+<kbd>T</kbd> | Fans the stack out and moves focus into the region. `hotkey` changes it. |
| <kbd>Escape</kbd> | With focus in the region, piles the stack back up. |
| <kbd>Tab</kbd> | Reaches the close cross and the buttons, native `<button>`s. |

Hovering the stack, pressing on it, and a hidden tab hold every timer; each resumes with the time it had left. There is no swipe to dismiss and no `getHistory`. The close cross — never shown on a `loading` or a custom toast — is named `"Close toast"`, which `toastOptions.closeButtonAriaLabel` replaces.
