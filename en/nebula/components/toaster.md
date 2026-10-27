# Toaster

Transient notifications: one region mounted once near the root of the app, and a `toast` object callable from anywhere — an event handler, a form's error branch, a service — with no handle threaded down to it. The queue lives in module state and the region subscribes to it; that decoupling is the whole design.

The accessibility rules are stricter than they look, and the region is static so they can be met. A live region inserted with content already in it is not announced by most screen readers, so the region mounts empty and stays. There are two of them: errors go to an assertive one that interrupts, everything else to a polite one that waits — everything interrupting is the fastest way to make a screen reader unusable. Hovering the region pauses every countdown, because a toast that vanishes while being read is the most common complaint about the pattern.

```sh
ream nebula:add toaster
```

Organism · `organisms/Toaster.ts` · no dependencies

## Usage

```ts
import { Toaster, toast } from '@c9up/nebula'

// Once, in the app's layout.
Toaster()

// Anywhere.
toast.success('Changes saved')
```

## Examples

### Variants

```ts
toast.show({ title: 'Invitation sent' })                       // default
toast.success('Changes saved', 'They are live for everyone.')
toast.warning('Storage almost full', 'You have used 92 % of your plan.')
toast.error('Could not save', 'The server did not answer.')
toast.loading('Uploading report.pdf…')
```

Each variant has its own time on screen unless `duration` says otherwise: 5 seconds, twice that for an `error` — the user has to read it and often act on it — and a `loading` toast does not leave on its own at all: it is waiting for an outcome.

### An action

```ts
toast.show({
  title: 'Conversation archived',
  action: { label: 'Undo', onClick: () => unarchive(conversationId) },
  duration: 10_000,
})
```

The action runs its `onClick`, then dismisses the toast that offered it. The countdown pauses for the pointer only: a keyboard user tabbing to the action has the clock still running, so a toast whose action matters gets a longer `duration`, or `0` to stay until dismissed.

### One toast per problem

A toast shown under an `id` that is already on screen updates it instead of stacking another, so "you are offline", raised on every failed request, is one toast rather than nine:

```ts
toast.show({ id: 'offline', variant: 'warning', title: 'You are offline', duration: 0 })
toast.show({ id: 'offline', variant: 'warning', title: 'Still offline — retrying', duration: 0 })

// Back online.
toast.dismiss('offline')
```

### Changing a toast on screen

`toast.update` patches a toast that is still there and does nothing to one that has gone. It also restarts the countdown, which is the part a caller would not think to ask for: a `loading` toast has no timer, and turned into a success without one it would stay on screen for good.

```ts
const id = toast.loading('Uploading report.pdf…')

upload(file).then(
  () => toast.update(id, { variant: 'success', title: 'report.pdf uploaded' }),
  () => toast.update(id, { variant: 'error', title: 'Upload failed' }),
)
```

Changing the variant to or from `error` moves the toast between the two live regions.

### Following a promise

`toast.promise` does the same in one call: one toast for the whole life of an async call, loading first, then the outcome. Each stage is a title, a whole set of options, or a function of the result:

```ts
const saved = await toast.promise(saveDocument(form), {
  loading: 'Saving…',
  success: (doc) => `Saved ${doc.name}`,
  error: (reason) => ({ title: 'Could not save', description: String(reason) }),
})
```

It returns the same promise it was given, rejection included. It reports, it does not handle: the caller's own error path still runs, and a failed call is not reduced to a red toast and nothing else.

### Reacting to a toast leaving

```ts
toast.show({
  title: 'Draft discarded',
  onClose: () => analytics.track('draft-discarded-toast-closed'),
})

// On navigation, say.
toast.clear()
```

`onClose` runs once, however the toast left: its timer, its cross, its action, `dismiss` or `clear`. One that throws is logged and does not break the dismissal that called it.

### Position and labels

```ts
Toaster({ position: 'top-right', closeButtonAriaLabel: 'Close notification' })
```

The default corner is `bottom-right`. Both are read once, at setup.

## API

### Toaster

The region. Mount it once: the queue is module state, so every mounted `Toaster` shows every toast.

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'` | `'bottom-right'` | The corner. Read at setup. |
| `closeButtonAriaLabel` | `string` | `'Dismiss notification'` | The accessible name of each toast's dismiss cross. |
| `class` | `Reactive<string>` | — | Merged into the region's classes. |

### toast

| Method | Returns | Description |
|---|---|---|
| `toast.show(options: ToastOptions)` | `ToastId` | Raise a toast. An `id` already on screen updates that toast instead. |
| `toast.success(title: Child, description?: Child)` | `ToastId` | `show` with `variant: 'success'`. |
| `toast.error(title: Child, description?: Child)` | `ToastId` | `show` with `variant: 'error'`, in the assertive region. |
| `toast.warning(title: Child, description?: Child)` | `ToastId` | `show` with `variant: 'warning'`. |
| `toast.loading(title: Child, description?: Child)` | `ToastId` | `show` with `variant: 'loading'`: a spinning glyph and no timer. |
| `toast.update(id: ToastId, patch: Partial<ToastOptions>)` | `void` | Patch a toast on screen and restart its countdown. No-op if it has gone. |
| `toast.dismiss(id: ToastId)` | `void` | Remove one toast and run its `onClose`. |
| `toast.promise<T>(work: Promise<T>, messages)` | `Promise<T>` | One toast from `loading` to `success` or `error`. `messages` is `{ loading: ToastMessage; success: ToastMessage \| ((value: T) => ToastMessage); error: ToastMessage \| ((reason: unknown) => ToastMessage) }`. Returns `work`. |
| `toast.clear()` | `void` | Remove every toast, then run their `onClose`s. |

### ToastOptions

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `Child` | — | Required. The first line. |
| `description` | `Child` | — | A second, muted line. |
| `variant` | `ToastVariant` | `'default'` | The look, the live region (`error` is assertive) and the default `duration`. |
| `duration` | `number` | `5000`; `10000` for `error`; `0` for `loading` | Milliseconds on screen. `0` keeps it until dismissed. |
| `action` | `{ label: string; onClick: () => void }` | — | A button that runs `onClick`, then dismisses the toast. |
| `id` | `string` | a number, minted by `show` | A stable id. Showing a toast under an id already on screen updates it. |
| `onClose` | `() => void` | — | Called once the toast leaves, however it left. |

`ToastVariant` is `'default' | 'success' | 'error' | 'warning' | 'loading'`. `ToastId` is `number | string` — a number when `show` minted it, a string when you gave one. `ToastMessage`, what a `promise` stage says, is `Child | Omit<ToastOptions, 'id' | 'variant'>`: a plain object with a `title` is read as options, anything else as the title itself.

## Accessibility

The region holds two live regions, mounted empty before any toast exists: `role="status"` with `aria-live="polite"` for every variant but `error`, and `role="alert"` with `aria-live="assertive"` for errors. The region carries `data-nebula-live`, which exempts it from the `aria-hidden` a modal [Dialog](/en/nebula/components/dialog) puts on its siblings — a toast raised while a dialog is open is still announced.

The toaster handles no key of its own and never takes focus: a toast is announced, not focused. The dismiss cross and the action are native `<button>`s, reached with <kbd>Tab</kbd> and activated by <kbd>Enter</kbd> and <kbd>Space</kbd>. Hovering the region pauses every countdown; leaving it resumes them with at least one second left, so a toast the pointer rested on until its time ran out does not vanish the instant the pointer moves away. Focus does not pause them.

The dismiss cross is named `"Dismiss notification"`; `closeButtonAriaLabel` replaces it — see [languages](/en/nebula/languages). The spinning glyph of a `loading` toast is decorative.
