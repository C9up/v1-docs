# Spinner

An indeterminate activity indicator: something is happening, with no measurable end. It is a `role="status"` with a visually hidden label, so a screen reader announces that something is loading — a bare spinning glyph is invisible to a reader, and leaves silence where a sighted user sees motion.

The rotation stops for users who asked their system to reduce motion (`motion-reduce:animate-none`). The glyph stays, so the indicator does not vanish with it.

```sh
ream nebula:add spinner
```

Atom · `atoms/Spinner.ts` · no dependencies

## Usage

```ts
import { Spinner } from '@c9up/nebula'

Spinner()
```

## Examples

### Saying what is loading

```ts
Spinner({ label: 'Loading invoices' })
```

"Loading" says little when three things on the page load at once. The label is never shown; it is what a screen reader hears.

### Size and colour

```ts
Spinner({ class: 'size-8 text-muted-foreground' })
```

`class` goes on the glyph, not the wrapper: it is a 16 px icon in the text's colour, and a `size-*` or `text-*` utility replaces either. It is read once, at setup.

### In a button

```ts
import { html, signal } from '@c9up/aurora'
import { Button, Spinner } from '@c9up/nebula'

const saving = signal(false)

Button({
  disabled: saving,
  children: () => (saving() ? html`${Spinner({ label: 'Saving' })} Save` : 'Save'),
  onClick: async () => {
    saving(true)
    try { await save() } finally { saving(false) }
  },
})
```

The spinner gives a screen reader the word "Saving", and the disabled button keeps its visible one. A live region inserted with its text already inside is not announced by every screen reader, so do not rely on the spinner alone to report the change.

### While a region loads

```ts
import { html } from '@c9up/aurora'

html`<section aria-busy="${() => (loading() ? 'true' : 'false')}">
  ${() => (loading() ? Spinner({ label: 'Loading the report' }) : report())}
</section>`
```

## API

### Spinner

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `Reactive<string>` | `'Loading'` | Announced to assistive technology, never shown. |
| `class` | `Reactive<string>` | — | Merged into the glyph's classes. Read at setup. |

## Accessibility

A `<span role="status">` — a polite live region — holding the glyph, which is `aria-hidden`, and the label in an `sr-only` span. It is not focusable and handles no key.

The label is built in: `label` replaces `"Loading"` — see [languages](/en/nebula/languages).
