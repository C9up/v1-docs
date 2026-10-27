# VisuallyHidden

Text for a screen reader and nothing else. Not `display: none`, which removes it from the accessibility tree as well, and not `opacity: 0`, which keeps it taking space: the clip rectangle — Tailwind's `sr-only` — is the one technique that leaves a node announced and unrendered.

Its main job is the label a sighted user does not need: a dialog whose title is a logo, an icon button, a table caption. `aria-label` covers some of those, but not the ones where the content is real markup — a heading an `aria-labelledby` has to point at, for instance. With `focusable`, it stays hidden until it is tabbed into, which is what a skip link needs.

```sh
ream nebula:add visually-hidden
```

Atom · `atoms/VisuallyHidden.ts` · no dependencies

## Usage

```ts
import { VisuallyHidden } from '@c9up/nebula'

VisuallyHidden({ children: 'Delete' })
```

## Examples

### A hidden heading

It is always a `<span>`, never the element it labels. To hide a heading's text, put it *inside* the heading:

```ts
import { html } from '@c9up/aurora'
import { VisuallyHidden } from '@c9up/nebula'

html`<h2 id="filters-heading">${VisuallyHidden({ children: 'Filters' })}</h2>`
```

The `<h2>` stays in the outline a screen reader walks, and `aria-labelledby="filters-heading"` can name a region after it.

### A skip link

```ts
import { html } from '@c9up/aurora'
import { VisuallyHidden } from '@c9up/nebula'

VisuallyHidden({
  focusable: true,
  children: html`<a href="#main">Skip to content</a>`,
})
```

`focusable` reveals it the moment something inside it has focus — here, the link, tabbed into first on the page — and hides it again on blur. Revealed, it takes its place in the flow where it was written, so put it first in the `<body>`.

### Text that changes

`children` takes an accessor:

```ts
import { signal } from '@c9up/aurora'
import { VisuallyHidden } from '@c9up/nebula'

const count = signal(3)

VisuallyHidden({ children: () => `${count()} items in your cart` })
```

### An icon's name

For the icon-plus-word case, [AccessibleIcon](/en/nebula/components/accessible-icon) wraps this component and hides the icon from the accessibility tree as well.

## API

### VisuallyHidden

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | What a screen reader announces. |
| `focusable` | `boolean` | `false` | Reveal it while it, or something inside it, has focus — for a skip link. Set once. |
| `class` | `Reactive<string>` | — | Merged after `sr-only`. |

## Accessibility

The text stays in the accessibility tree and is read where it stands in the document, with no role of its own. It is escaped like any slot: a label built from a record's name is text, not markup, even though no one sees it. A visually hidden element that can be focused must become visible when it is — that is what `focusable` does, and a link or a button inside a `VisuallyHidden` without it would be a focus stop nobody can see.
