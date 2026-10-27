# AuthLayout

The page for signing in, signing up and resetting a password: a brand above, a card holding a title, a description and the form, and a line under the card. The card is centred by flex in a `min-h-svh` column, not by absolute positioning and a translate — a sign-up form with an error under each of four fields grows taller than the viewport, and a card centred by a transform would push its top above the fold with nothing to scroll to.

```sh
ream nebula:add auth-layout
```

Template · `templates/AuthLayout.ts` · no dependencies

## Usage

```ts
import { AuthLayout } from '@c9up/nebula'

AuthLayout({ title: 'Sign in', children: signInForm })
```

## Examples

### Brand, description and footer

```ts
import { html } from '@c9up/aurora'
import { AuthLayout, Button, Input, Label } from '@c9up/nebula'

AuthLayout({
  brand: html`<a href="/" class="text-lg font-semibold">Acme</a>`,
  title: 'Create an account',
  description: 'Enter your email to get started.',
  children: html`<form method="post" action="/register" class="flex flex-col gap-4">
    <div class="grid gap-2">
      ${Label({ for: 'email', children: 'Email' })}
      ${Input({ id: 'email', name: 'email', type: 'email', autocomplete: 'email', required: true })}
    </div>
    ${Button({ type: 'submit', class: 'w-full', children: 'Continue' })}
  </form>`,
  footer: html`Already have an account? <a href="/login" class="underline underline-offset-4">Sign in</a>`,
})
```

The card is at most 24rem wide (`max-w-sm`) and already padded: the form inside needs no wrapper of its own.

### A page landmark

The layout renders no `<main>`. On a page where it is the whole content, wrap it in one:

```ts
html`<main>${AuthLayout({ title: 'Reset your password', children: resetForm })}</main>`
```

## API

### AuthLayout

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `Child` | — | Required. The card's heading — what the page does. |
| `description` | `Child` | — | A muted line under the title. |
| `children` | `Slot` | — | The form. |
| `brand` | `Slot` | — | Product name or logo, above the card. |
| `footer` | `Slot` | — | Under the card — "Already have an account?" and the like. |
| `class` | `Reactive<string>` | — | Merged into the page's classes; the background is `bg-muted/40`. |

`title` and `description` are plain values, read once: an authentication page says what it is when it renders. `brand`, `footer` and `description` are left out of the markup when not given.

## Accessibility

The title is the page's `<h1>`, so a brand above it should not be a heading of its own — a link or an image with its `alt`. The layout handles no key and moves no focus: the form's own fields, labels and errors carry the accessibility of the page.
