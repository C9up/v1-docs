# Alert

An inline message about the content around it — a notice above a form, a warning at the top of a settings page, an error where something failed. It stays in the page, unlike a [toast](/en/nebula/components/toaster).

Only the destructive variant is a live region. `role="alert"` interrupts a screen reader the moment the element appears: right for an error, wrong for the informational variant, which would talk over whatever the user was reading to announce something they did not ask about. The default variant is a `note` instead. The layout is a grid, which lets an optional leading icon line up with the title while the description wraps under both, without either part knowing whether the other is there.

```sh
ream nebula:add alert
```

Molecule · `molecules/Alert.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { Alert, AlertDescription, AlertTitle } from '@c9up/nebula'

Alert({
  children: html`
    ${AlertTitle({ children: 'Heads up' })}
    ${AlertDescription({ children: 'Invoices are now sent on the first of the month.' })}
  `,
})
```

## Examples

### With an icon

An `<svg>` placed directly in the alert takes the first column, at 16 px and in the text's colour; the title and description move to the second.

```ts
import { html } from '@c9up/aurora'
import { Alert, AlertDescription, AlertTitle, CheckIcon } from '@c9up/nebula'

Alert({
  children: html`
    ${CheckIcon()}
    ${AlertTitle({ children: 'Domain verified' })}
    ${AlertDescription({ children: 'Mail from example.com is now signed.' })}
  `,
})
```

### Destructive

```ts
Alert({
  variant: 'destructive',
  children: html`
    ${AlertTitle({ children: 'Payment failed' })}
    ${AlertDescription({ children: html`<p>Your card was declined.</p><p>Update it to keep your plan.</p>` })}
  `,
})
```

The description is a grid of its own: several paragraphs stack with a small gap and relaxed line height.

### Shown on a condition

An alert that appears in response to something is built when it appears — that is what a live region announces:

```ts
import { html, signal } from '@c9up/aurora'

const error = signal<string | null>(null)

html`${() =>
  error() === null
    ? null
    : Alert({
        variant: 'destructive',
        children: html`
          ${AlertTitle({ children: 'Could not save' })}
          ${AlertDescription({ children: error() })}
        `,
      })}`
```

## API

### Alert

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The icon, `AlertTitle` and `AlertDescription`. |
| `variant` | `Reactive<'default' \| 'destructive'>` | `'default'` | The look, and the role: `destructive` is `alert`, `default` is `note`. |
| `class` | `Reactive<string>` | — | Merged last, so a conflicting utility wins. |

### AlertTitle, AlertDescription

The title (medium weight, one line) and the description (muted, wrapping). Each is a `<div>` with its `data-slot`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The content. |
| `class` | `Reactive<string>` | — | Merged last. |
| `id` | `string` | — | The element's `id`. |

### alertVariants

`alertVariants({ variant?, class? }): string` — the class list an `Alert` carries.

## Accessibility

`variant: 'destructive'` gives `role="alert"`, an assertive live region: its content is announced as soon as the alert is inserted. The default variant is `role="note"`, read in place and never announced on its own. Since the role follows `variant`, an alert switched to `destructive` while already on screen changes role, but most screen readers announce an alert only when it is inserted — build it when the error occurs, as above. An alert holds no control of its own and handles no key.
