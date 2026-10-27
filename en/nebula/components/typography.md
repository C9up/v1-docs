# Typography

Prose styles for the content nebula does not otherwise own: headings, paragraphs, a quote, inline code, a list, and four text sizes. They are shipped as components rather than left as snippets to copy, because they are what keeps a marketing page, a changelog and an empty state reading as one product.

`text-balance` on `H1` and `text-pretty` on `P` and `Lead` do most of the work: they keep a title from ending on a stranded word or two, and a paragraph from ending on a single word.

```sh
ream nebula:add typography
```

Molecule · `molecules/Typography.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { H1, Lead, P } from '@c9up/nebula'

html`
  ${H1({ children: 'Release notes' })}
  ${Lead({ children: 'What changed in 2.4, and what to do about it.' })}
  ${P({ children: 'Imports are now resolved at build time.' })}
`
```

## Examples

### Headings

```ts
import { H1, H2, H3, H4 } from '@c9up/nebula'

H1({ children: 'Release notes' })
H2({ id: 'breaking-changes', children: 'Breaking changes' })
H3({ children: 'Imports' })
H4({ children: 'Resolved at build time' })
```

Every heading carries `scroll-m-20`, so a heading reached through its `id` — `#breaking-changes` — does not land under a sticky header. `H2` draws a rule beneath itself and drops its top margin when it is the first child.

### Body copy

```ts
import { html } from '@c9up/aurora'
import { Blockquote, InlineCode, List, P } from '@c9up/nebula'

html`
  ${P({ children: 'Imports are now resolved when the app is built.' })}
  ${P({ children: html`Run ${InlineCode({ children: 'ream nebula:diff' })} before upgrading.` })}
  ${Blockquote({ children: 'Fewer surprises at runtime, more at build time.' })}
  ${List({ children: html`<li>Faster cold start</li><li>Errors reported at build time</li>` })}
`
```

A `P` that follows something else gets a top margin; the first one does not, so a stack of paragraphs is spaced without a wrapper. `List` is a `<ul>` — its children are your `<li>` elements.

### Sizes of text

```ts
import { Large, Lead, Muted, Small } from '@c9up/nebula'

Lead({ children: 'Everything that changed since 2.3.' })
Large({ children: 'Upgrade required' })
Small({ children: 'Last updated today' })
Muted({ children: 'Applies to every app on 2.x.' })
```

### Following a signal

`children` takes an accessor, like every slot:

```ts
import { html } from '@c9up/aurora'
import { H2, P } from '@c9up/nebula'

html`${() => releases().map((release) => html`
  ${H2({ children: release.version })}
  ${P({ children: release.notes })}
`)}`
```

## API

Every part takes the same props, `TypographyProps`:

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The content. |
| `class` | `Reactive<string>` | — | Merged into the element's classes. |
| `id` | `string` | — | The element's `id`. Not rendered by `InlineCode` and `List`. |

### The parts

| Part | Element | Style |
|---|---|---|
| `H1` | `<h1>` | 4xl, extra-bold, balanced |
| `H2` | `<h2>` | 3xl, semibold, rule beneath |
| `H3` | `<h3>` | 2xl, semibold |
| `H4` | `<h4>` | xl, semibold |
| `P` | `<p>` | relaxed leading, pretty wrapping, spaced from what precedes it |
| `Blockquote` | `<blockquote>` | italic, rule on the left |
| `InlineCode` | `<code>` | monospace on a muted ground |
| `List` | `<ul>` | discs, spaced items |
| `Lead` | `<div data-slot="lead">` | xl, muted, pretty wrapping |
| `Large` | `<div data-slot="large">` | lg, semibold |
| `Small` | `<div data-slot="small">` | sm, medium, tight leading |
| `Muted` | `<div data-slot="muted">` | sm, muted |

### styledDiv, styledSpan

`styledDiv(name: string, base: string)` and `styledSpan(name, base)` return a component taking `{ children?, class?, id? }` that renders a `<div>` (or `<span>`) with `data-slot={name}` and the `base` classes, `class` merged after them. `Lead`, `Large`, `Small` and `Muted` are made this way; so can your own purely presentational parts:

```ts
import { styledDiv } from '@c9up/nebula'

const Eyebrow = styledDiv('eyebrow', 'text-primary text-xs font-semibold uppercase tracking-wide')

Eyebrow({ children: 'Changelog' })
```

The moment a part needs an event, a piece of state or an ARIA relationship, write it out in full instead.

## Accessibility

The headings are real `<h1>`–`<h4>`, so they make the outline a screen reader navigates by: choose the level by the structure, not the size, and restyle with `class` if the two disagree. `Lead`, `Large`, `Small` and `Muted` are `<div>`s with no meaning of their own — `Small` is not a `<small>`, `Muted` is not a hint tied to a field. For a field's description, use the [Field](/en/nebula/components/field) parts, which link it to the control.
