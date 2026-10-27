# Empty

The placeholder for a list, a table or a panel with nothing in it. An empty state is where an app most often falls back to a bare "No results" and leaves the user without a next step; the parts push towards the useful shape instead — an icon, a title, a sentence saying why it is empty, and something to do about it.

Every part is a styled `<div>` with its own `data-slot` and no behaviour, so the whole of it is layout you can read and edit in one screen of source.

```sh
ream nebula:add empty
```

Molecule · `molecules/Empty.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@c9up/nebula'

Empty({
  children: EmptyHeader({
    children: html`
      ${EmptyTitle({ children: 'No invoices yet' })}
      ${EmptyDescription({ children: 'Invoices you send appear here.' })}
    `,
  }),
})
```

## Examples

### Icon, explanation and a next step

```ts
import { html } from '@c9up/aurora'
import {
  Button,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  SearchIcon,
} from '@c9up/nebula'

Empty({
  class: 'border',
  children: html`
    ${EmptyHeader({
      children: html`
        ${EmptyMedia({ children: SearchIcon() })}
        ${EmptyTitle({ children: 'No results' })}
        ${EmptyDescription({ children: 'Nothing matches “invoices 2019”. Try another word, or clear the filters.' })}
      `,
    })}
    ${EmptyContent({
      children: Button({ variant: 'outline', children: 'Clear filters', onClick: () => clearFilters() }),
    })}
  `,
})
```

`EmptyMedia` is a muted 40 px tile with the icon at 20 px, unless the icon carries its own `size-*` class. The root draws a dashed border only once it is given one: `class: 'border'` turns it on, and the empty state stays borderless inside a card that already has its own.

A link in `EmptyDescription` is underlined:

```ts
EmptyDescription({ children: html`No API keys. <a href="/docs/keys">How keys work</a>.` })
```

### In place of a list

The empty state is one branch of the accessor that draws the list:

```ts
import { html } from '@c9up/aurora'

html`${() =>
  projects().length === 0
    ? Empty({
        children: html`
          ${EmptyHeader({ children: EmptyTitle({ children: 'No projects' }) })}
          ${EmptyContent({ children: Button({ children: 'New project', onClick: () => createProject() }) })}
        `,
      })
    : html`<ul>${projects().map((project) => html`<li>${project.name}</li>`)}</ul>`}`
```

## API

### Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent

All six take the same props, `EmptyProps`:

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The content. |
| `class` | `Reactive<string>` | — | Merged last, so a conflicting utility wins. |
| `id` | `string` | — | The element's `id`. |

| Part | `data-slot` | What it is |
|---|---|---|
| `Empty` | `empty` | The centred frame, padded more from `md` up. |
| `EmptyHeader` | `empty-header` | A column for the media, title and description, at most `max-w-sm`. |
| `EmptyMedia` | `empty-media` | A muted square tile for an icon. |
| `EmptyTitle` | `empty-title` | The title, large and medium weight. |
| `EmptyDescription` | `empty-description` | The muted explanation; links in it are underlined. |
| `EmptyContent` | `empty-content` | The next step — a button, a form, a link. |

## Accessibility

The parts add no role: they are `<div>`s, and the title is not a heading. Where the empty state is a section of its own in the page outline, give the title a heading inside it — `EmptyTitle({ children: html\`<h2>No results</h2>\` })` — so it shows up when a screen reader lists headings. Whatever goes in `EmptyContent` brings its own keyboard behaviour; the parts handle no key.
