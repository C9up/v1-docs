# Pagination

Page links for a long list: a `<nav>` holding a list of links, a previous and a next step, and an ellipsis for the pages that do not fit.

Which pages to show is decided by `pageWindow`. Rendering every page breaks at a few hundred; the usual fix — a fixed run around the current page — narrows near either end, so the row reflows while you click through it and the buttons move under the pointer. `pageWindow` keeps the number of slots constant instead: the first page, the last, a run around the current one and one or two gaps, the same width from page 1 to page 500.

```sh
ream nebula:add pagination
```

Molecule · `molecules/Pagination.ts` · [Button](/en/nebula/components/button)

## Usage

```ts
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@c9up/nebula'

Pagination({
  children: PaginationContent({
    children: [
      PaginationItem({ children: PaginationPrevious({ href: '?page=1' }) }),
      PaginationItem({ children: PaginationLink({ href: '?page=1', children: '1' }) }),
      PaginationItem({ children: PaginationLink({ href: '?page=2', isActive: true, children: '2' }) }),
      PaginationItem({ children: PaginationLink({ href: '?page=3', children: '3' }) }),
      PaginationItem({ children: PaginationEllipsis({}) }),
      PaginationItem({ children: PaginationNext({ href: '?page=3' }) }),
    ],
  }),
})
```

The parts share no state and take their content as plain values. Every link is an `<a>`: with an `href` and no handler it navigates like any link, so a server-rendered pagination works with JavaScript off.

## Examples

### Pages from pageWindow

On the server, the current page and the page count are known when the page is built:

```ts
import { pageWindow } from '@c9up/nebula'

Pagination({
  children: PaginationContent({
    children: [
      PaginationItem({
        children: PaginationPrevious({ href: `?page=${current - 1}`, disabled: current <= 1 }),
      }),
      ...pageWindow(current, pageCount).map((entry) =>
        PaginationItem({
          children:
            entry === null
              ? PaginationEllipsis({})
              : PaginationLink({ href: `?page=${entry}`, isActive: entry === current, children: String(entry) }),
        }),
      ),
      PaginationItem({
        children: PaginationNext({ href: `?page=${current + 1}`, disabled: current >= pageCount }),
      }),
    ],
  }),
})
```

`null` in the window is a gap. A `disabled` step keeps its place in the row — dimmed, `aria-disabled`, and a click on it is cancelled.

### Paging in place

`onSelect` takes over the click: the default navigation is cancelled and the handler runs. Which pages show depends on the current one, so the list is an accessor and is rebuilt when the page changes. Keep the `href`s — they are what puts the links in the tab order:

```ts
import { signal } from '@c9up/aurora'

const page = signal(1)

Pagination({
  children: () =>
    PaginationContent({
      children: [
        PaginationItem({
          children: PaginationPrevious({
            href: `?page=${page() - 1}`,
            disabled: page() <= 1,
            onSelect: () => page(page() - 1),
          }),
        }),
        ...pageWindow(page(), pageCount).map((entry) =>
          PaginationItem({
            children:
              entry === null
                ? PaginationEllipsis({})
                : PaginationLink({
                    href: `?page=${entry}`,
                    isActive: entry === page(),
                    onSelect: () => page(entry),
                    children: String(entry),
                  }),
          }),
        ),
        PaginationItem({
          children: PaginationNext({
            href: `?page=${page() + 1}`,
            disabled: page() >= pageCount,
            onSelect: () => page(page() + 1),
          }),
        }),
      ],
    }),
})
```

### Another window size

`pageWindow` returns seven slots by default. A third argument changes the width; five is the smallest it builds — the first page, a gap, the current page, a gap, the last:

```ts
pageWindow(25, 50)    // [1, null, 24, 25, 26, null, 50]
pageWindow(25, 50, 9) // [1, null, 23, 24, 25, 26, 27, null, 50]
pageWindow(2, 50)     // [1, 2, 3, 4, 5, null, 50]
```

### In another language

`aria-label` replaces each accessible name, and `children` replaces the visible word of a step while keeping its arrow:

```ts
Pagination({
  'aria-label': 'Pages des résultats',
  children: PaginationContent({
    children: [
      PaginationItem({ children: PaginationPrevious({ href: '?page=1', 'aria-label': 'Page précédente', children: 'Précédent' }) }),
      PaginationItem({ children: PaginationEllipsis({ label: 'Autres pages' }) }),
      PaginationItem({ children: PaginationNext({ href: '?page=3', 'aria-label': 'Page suivante', children: 'Suivant' }) }),
    ],
  }),
})
```

## API

### Pagination

A `<nav>` (`PaginationNavProps`).

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The `PaginationContent`. |
| `aria-label` | `string` | `'pagination'` | The landmark's name. |
| `class` | `Reactive<string>` | — | Merged into the `<nav>`'s classes. |

### PaginationContent, PaginationItem

The `<ul>` and its `<li>`s (`PaginationProps`).

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The items; an item's link. |
| `class` | `Reactive<string>` | — | Merged into the `<ul>`'s classes. `PaginationItem` does not render it. |

### PaginationLink

An `<a>`, drawn with [Button](/en/nebula/components/button)'s variants: `outline` when active, `ghost` otherwise.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The page number. |
| `href` | `string` | — | The destination. Without it the `<a>` has no link role and is out of the tab order. |
| `isActive` | `Reactive<boolean>` | `false` | The page the user is on. Sets `aria-current="page"`. |
| `size` | `'default' \| 'icon'` | `'icon'` | `icon` is a square for a number. |
| `disabled` | `Reactive<boolean>` | `false` | Sets `aria-disabled`, dims the link and cancels its clicks. |
| `onSelect` | `(event: MouseEvent) => void` | — | Cancels the navigation and runs instead. Without it, an `href` navigates. |
| `aria-label` | `string` | — | The accessible name. |
| `class` | `Reactive<string>` | — | Merged last. |

### PaginationPrevious, PaginationNext

A `PaginationLink` of size `default` with an arrow. Their props are `PaginationStepProps` — `PaginationLink`'s without `size` and `isActive`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | `'Previous'` / `'Next'` | The visible word beside the arrow, hidden below the `sm` breakpoint. |
| `aria-label` | `string` | `'Go to previous page'` / `'Go to next page'` | The accessible name. |
| `href` | `string` | — | The destination. |
| `disabled` | `Reactive<boolean>` | `false` | As on `PaginationLink`. |
| `onSelect` | `(event: MouseEvent) => void` | — | As on `PaginationLink`. |
| `class` | `Reactive<string>` | — | Merged into the step's classes. |

### PaginationEllipsis

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'More pages'` | The visually hidden text inside it. The ellipsis is `aria-hidden`, so a screen reader skips this text too. |
| `class` | `Reactive<string>` | — | Merged into its classes. |

### pageWindow

`pageWindow(page: number, pageCount: number, size = 7): readonly PageSlot[]` — the pages to show. Every page when `pageCount <= size`; otherwise exactly `size` slots (at least five): the first page, the last, a run around `page` and `null` for each gap. Near an end there is one gap, so the run is one slot wider to make up for it. `page` is clamped into `1 … pageCount`. `PageSlot` is `number | null`.

### PaginationLabels

The type of [DataTable](/en/nebula/components/data-table)'s `paginationLabels` — every text a pager writes:

| Key | Default | Where |
|---|---|---|
| `navigation` | `'pagination'` | The `<nav>`'s name. |
| `previous` | `'Previous'` | The visible word beside the previous arrow. |
| `previousPage` | `'Go to previous page'` | The previous link's name. |
| `next` | `'Next'` | The visible word beside the next arrow. |
| `nextPage` | `'Go to next page'` | The next link's name. |
| `morePages` | `'More pages'` | The ellipsis's hidden text. |

These defaults are the frozen `paginationLabels` object, exported from `molecules/Pagination.ts` but not from the package.

## Accessibility

The root is a `<nav role="navigation">` named by `aria-label`. The current page carries `aria-current="page"` — without it the only signal is the highlight, which a screen-reader user does not get. A disabled step is `aria-disabled="true"`. The ellipsis is `aria-hidden="true"`, its hidden text included: a screen reader skips the gap and reads the numbers on either side.

| Key | Action |
|---|---|
| <kbd>Tab</kbd> | Moves through the links that have an `href`. |
| <kbd>Enter</kbd> | Follows the link, or runs its `onSelect`. |

The landmark's name, the two steps' words and names and the ellipsis's text are built-in English; the props above replace them — see [languages](/en/nebula/languages).
