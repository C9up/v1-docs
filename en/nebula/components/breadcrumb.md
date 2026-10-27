# Breadcrumb

The trail back up the hierarchy: a labelled `<nav>`, an ordered list of crumbs, a chevron between them, and the last crumb marked as the page you are on. Every part is presentational — there is no context to be inside of — so none of them takes `Parts`, and a trail built from a signal needs nothing special.

```sh
ream nebula:add breadcrumb
```

Molecule · `molecules/Breadcrumb.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@c9up/nebula'

Breadcrumb({
  children: BreadcrumbList({
    children: html`
      ${BreadcrumbItem({ children: BreadcrumbLink({ href: '/', children: 'Home' }) })}
      ${BreadcrumbSeparator()}
      ${BreadcrumbItem({ children: BreadcrumbLink({ href: '/settings', children: 'Settings' }) })}
      ${BreadcrumbSeparator()}
      ${BreadcrumbItem({ children: BreadcrumbPage({ children: 'Profile' }) })}
    `,
  }),
})
```

A separator is a list item of its own, so it goes between the `BreadcrumbItem`s, not inside one.

## Examples

### A collapsed trail

`BreadcrumbEllipsis` stands in for the ancestors that did not fit:

```ts
import { html } from '@c9up/aurora'
import { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@c9up/nebula'

Breadcrumb({
  children: BreadcrumbList({
    children: html`
      ${BreadcrumbItem({ children: BreadcrumbLink({ href: '/', children: 'Home' }) })}
      ${BreadcrumbSeparator()}
      ${BreadcrumbItem({ children: BreadcrumbEllipsis() })}
      ${BreadcrumbSeparator()}
      ${BreadcrumbItem({ children: BreadcrumbPage({ children: 'Invoice 2024-118' }) })}
    `,
  }),
})
```

### Your own separator

`children` replaces the chevron:

```ts
BreadcrumbSeparator({ children: '/' })
```

### A trail that follows the route

The parts are plain markup, so the whole list can come from an accessor:

```ts
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@c9up/nebula'

Breadcrumb({
  children: BreadcrumbList({
    children: () =>
      trail().flatMap((crumb, index, all) =>
        index === all.length - 1
          ? [BreadcrumbItem({ children: BreadcrumbPage({ children: crumb.label }) })]
          : [BreadcrumbItem({ children: BreadcrumbLink({ href: crumb.href, children: crumb.label }) }), BreadcrumbSeparator()],
      ),
  }),
})
```

`href` is read once, when the link is built; a crumb whose target changes is a new crumb, which is what rebuilding the list from `trail()` gives you.

### In another language

```ts
Breadcrumb({
  'aria-label': 'Fil d’Ariane',
  children: BreadcrumbList({ children: BreadcrumbItem({ children: BreadcrumbEllipsis({ label: 'Plus' }) }) }),
})
```

## API

### Breadcrumb

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | A `BreadcrumbList`. |
| `aria-label` | `string` | `'breadcrumb'` | The `<nav>`'s accessible name. |
| `class` | `Reactive<string>` | — | Merged into the `<nav>`'s classes. |

### BreadcrumbList

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | Items and separators, in order. |
| `class` | `Reactive<string>` | — | Merged into the `<ol>`'s classes. |

### BreadcrumbItem

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | A `BreadcrumbLink`, a `BreadcrumbPage` or a `BreadcrumbEllipsis`. |
| `class` | `Reactive<string>` | — | Merged into the `<li>`'s classes. |

### BreadcrumbLink

| Prop | Type | Default | Description |
|---|---|---|---|
| `href` | `string` | — | Where the crumb leads. |
| `children` | `Slot` | — | The crumb's text. |
| `class` | `Reactive<string>` | — | Merged into the `<a>`'s classes. |

### BreadcrumbPage

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The current page's name. |
| `class` | `Reactive<string>` | — | Merged into the crumb's classes. |

### BreadcrumbSeparator

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | a chevron | Replaces the chevron. |
| `class` | `Reactive<string>` | — | Merged into the separator's classes. |

### BreadcrumbEllipsis

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'More'` | The hidden text it carries. |
| `class` | `Reactive<string>` | — | Merged into the ellipsis' classes. |

## Accessibility

`Breadcrumb` is a `<nav>` named by `aria-label`: that name is how a screen reader tells this navigation from the other landmarks on the page. The last crumb, `BreadcrumbPage`, carries `aria-current="page"` — the change of colour does not tell anyone where they are, the attribute does. It is a `<span role="link" aria-disabled="true">` rather than an `<a>` with no `href`, which keeps it in the same role as its siblings so the list is announced consistently.

The separators are `aria-hidden` and `role="presentation"`: read aloud, a chevron between every crumb is noise, and the list already conveys the order. `BreadcrumbEllipsis` is hidden the same way, and so is the `label` inside it — a screen reader skips it. If the ellipsis opens the collapsed crumbs, put it inside a button or menu trigger that has its own name.

Both built-in texts, `aria-label` and the ellipsis' `label`, are props: see [languages](/en/nebula/languages).
