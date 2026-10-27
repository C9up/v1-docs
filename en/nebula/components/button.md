# Button

A `<button>` with the library's look: six variants, four sizes, an icon slot that sizes itself. It is the reference component — every other one follows the shape set here.

```sh
ream nebula:add button
```

Atom · `atoms/Button.ts` · no dependencies

## Usage

```ts
import { Button } from '@c9up/nebula'

Button({ children: 'Save', onClick: () => save() })
```

## Examples

### Variants

```ts
Button({ children: 'Save' })                              // default
Button({ variant: 'secondary', children: 'Cancel' })
Button({ variant: 'outline', children: 'Export' })
Button({ variant: 'ghost', children: 'More' })
Button({ variant: 'destructive', children: 'Delete' })
Button({ variant: 'link', children: 'Read the guide' })
```

### Sizes and icons

An SVG inside the button is sized to 16 px unless it carries its own `size-*` class, and the padding tightens around it.

```ts
import { html } from '@c9up/aurora'
import { ArrowRightIcon, SearchIcon } from '@c9up/nebula'

Button({ size: 'sm', children: html`Next ${ArrowRightIcon()}` })
Button({ size: 'lg', children: 'Continue' })
Button({ size: 'icon', label: 'Search', children: SearchIcon() })
```

`size: 'icon'` leaves the button with no visible text, so it needs `label` — that is what a screen reader announces.

### Following state

Every prop that can change takes an accessor. A button disabled while a request runs:

```ts
import { signal } from '@c9up/aurora'

const saving = signal(false)

Button({
  disabled: saving,
  children: () => (saving() ? 'Saving…' : 'Save'),
  onClick: async () => {
    saving(true)
    try { await save() } finally { saving(false) }
  },
})
```

`disabled: saving()` would read the signal once, at setup, and the button would never be disabled again — see [reactive props](/en/nebula/composition#reactive-props).

### A link that looks like a button

There is no `asChild`. Put the variants on the element yourself:

```ts
import { html } from '@c9up/aurora'
import { buttonVariants } from '@c9up/nebula'

html`<a href="/pricing" class="${buttonVariants({ variant: 'outline', size: 'sm' })}">Pricing</a>`
```

### In a form

```ts
Button({ type: 'submit', children: 'Create account' })
```

`type` defaults to `"button"`, never to HTML's `"submit"` — the cause of most accidental form submissions. A submit button says so.

## API

### Button

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The content: text, an icon, or both. |
| `variant` | `Reactive<'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link'>` | `'default'` | The look. |
| `size` | `Reactive<'default' \| 'sm' \| 'lg' \| 'icon'>` | `'default'` | `icon` is a square sized for one glyph. |
| `type` | `Reactive<'button' \| 'submit' \| 'reset'>` | `'button'` | The native `type`. |
| `disabled` | `Reactive<boolean>` | `false` | Sets the native `disabled`. |
| `label` | `Reactive<string \| undefined>` | — | Sets `aria-label`. Required in practice for `size: 'icon'`. |
| `id` | `string` | — | The element's `id`. |
| `class` | `Reactive<string>` | — | Merged last, so a conflicting utility wins. |
| `onClick` | `(event: MouseEvent) => void` | — | Click handler. |

### buttonVariants

`buttonVariants({ variant?, size?, class? }): string` — the class list a `Button` would carry, for an element that should look like one without being one.

## Accessibility

A native `<button>`: focusable, activated by <kbd>Enter</kbd> and <kbd>Space</kbd>, announced as a button, removed from the tab order when `disabled`. The focus ring is drawn on `:focus-visible`, so it shows for the keyboard and not for a mouse click. `aria-invalid` on the button draws it in the destructive colour, which is how a [Field](/en/nebula/components/field) marks a control in error.
