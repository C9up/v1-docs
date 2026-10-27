# Separator

A one-pixel rule between two pieces of content, horizontal or vertical. It is decorative by default: most lines on a screen are drawing, not structure, and a screen reader that announced each line between two toolbar buttons as a boundary would be announcing noise. Pass `decorative: false` when the line really does split the page into sections.

```sh
ream nebula:add separator
```

Atom · `atoms/Separator.ts` · no dependencies

## Usage

```ts
import { Separator } from '@c9up/nebula'

Separator()
```

## Examples

### Vertical

A vertical separator is `h-full`: it takes the height of its row, so the row needs one.

```ts
import { html } from '@c9up/aurora'
import { Separator } from '@c9up/nebula'

html`<div class="flex h-5 items-center gap-4 text-sm">
  <a href="/blog">Blog</a>
  ${Separator({ orientation: 'vertical' })}
  <a href="/docs">Docs</a>
  ${Separator({ orientation: 'vertical' })}
  <a href="/source">Source</a>
</div>`
```

The rule's height and width are set under `data-[orientation=…]:`, which outranks a plain utility: `class: 'h-4'` loses to the `h-full`. Size it under the same variant — `class: 'data-[orientation=vertical]:h-4'`.

### A real boundary

Between two parts of a page a reader should know apart — the settings that shape the account, then the ones that delete it:

```ts
html`<section>${accountSettings}</section>
${Separator({ decorative: false, class: 'my-6' })}
<section>${dangerZone}</section>`
```

The separator draws a line and nothing else: the space around it comes from `class` or from the parent's `gap`.

### Following the layout

`orientation` takes an accessor, for a rule that turns with its row:

```ts
Separator({ orientation: () => (wide() ? 'vertical' : 'horizontal') })
```

## API

### Separator

| Prop | Type | Default | Description |
|---|---|---|---|
| `orientation` | `Reactive<'horizontal' \| 'vertical'>` | `'horizontal'` | Horizontal is 1 px tall and full width; vertical is 1 px wide and full height. Also written to `data-orientation`. |
| `decorative` | `Reactive<boolean>` | `true` | `false` exposes it to assistive technology as a real boundary. |
| `class` | `Reactive<string>` | — | Merged last, so a conflicting utility wins. A height or a width goes under `data-[orientation=…]:` to beat the rule's own. |

## Accessibility

Decorative, the separator is `role="none"` and nothing is announced. With `decorative: false` it is `role="separator"` with `aria-orientation`, which a screen reader reports as a boundary between the content before and after it. It is never focusable and handles no key.
