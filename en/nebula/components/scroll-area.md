# ScrollArea

A scroll container with a thin scrollbar in the theme's border colour. The scrolling stays native: the browser draws the bar from `scrollbar-width` and `scrollbar-color`, with the WebKit pseudo-elements where those are missing, so momentum on touch, overscroll and the platform's own accessibility behaviour are all kept — for a handful of classes and no JavaScript.

This is a deliberate difference from shadcn, whose scroll area hides the native bar and draws its own out of elements kept in sync on every scroll. If you need a scrollbar drawn to a pixel-exact design, reach for a dedicated library; this component will not grow one.

A container only scrolls once something bounds it: give it a height — or a width, for a horizontal one.

```sh
ream nebula:add scroll-area
```

Atom · `atoms/ScrollArea.ts` · no dependencies

## Usage

```ts
import { ScrollArea } from '@c9up/nebula'

ScrollArea({ class: 'h-72 rounded-md border p-4', children: terms })
```

## Examples

### A list

```ts
import { html } from '@c9up/aurora'
import { ScrollArea, Separator } from '@c9up/nebula'

const tags = Array.from({ length: 50 }, (_, index) => `v1.2.0-beta.${50 - index}`)

ScrollArea({
  class: 'h-72 w-48 rounded-md border',
  children: html`<div class="p-4">
    <h4 class="mb-4 text-sm leading-none font-medium">Tags</h4>
    ${tags.map((tag) => html`<div class="text-sm">${tag}</div>${Separator({ class: 'my-2' })}`)}
  </div>`,
})
```

### Horizontal

`orientation: 'horizontal'` scrolls sideways and clips vertically. The row inside must be wider than the area — `w-max` — or there is nothing to scroll:

```ts
ScrollArea({
  orientation: 'horizontal',
  class: 'w-96 rounded-md border whitespace-nowrap',
  children: html`<div class="flex w-max gap-4 p-4">
    ${photos.map((photo) => html`<figure class="shrink-0">
      <img src="${photo.src}" alt="${photo.alt}" class="h-48 w-36 rounded-md object-cover">
      <figcaption class="text-muted-foreground pt-2 text-xs">${photo.author}</figcaption>
    </figure>`)}
  </div>`,
})
```

### Both axes

For a table wider and taller than its place:

```ts
ScrollArea({ orientation: 'both', class: 'max-h-96 rounded-md border', children: wideTable })
```

### Content that changes

`children` takes an accessor:

```ts
ScrollArea({ class: 'h-64', children: () => messages().map((message) => html`<p>${message}</p>`) })
```

### The classes alone

An element that already scrolls — a `<pre>`, a dialog body — takes the same scrollbar from `scrollAreaClasses`:

```ts
import { cn, scrollAreaClasses } from '@c9up/nebula'

html`<pre class="${cn(scrollAreaClasses, 'max-h-96 rounded-md bg-muted p-4 text-sm')}">${source}</pre>`
```

## API

### ScrollArea

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | What scrolls. |
| `orientation` | `Reactive<'vertical' \| 'horizontal' \| 'both'>` | `'vertical'` | Which axis may scroll; the other is clipped. |
| `class` | `Reactive<string>` | — | Merged last, so a conflicting utility wins. Where the height or width that bounds it goes. |

### scrollAreaClasses

`scrollAreaClasses: string` — the scrollbar's classes, with `relative overflow-auto`, for an element that should scroll like a `ScrollArea` without being one.

## Accessibility

Scrolling is the browser's own: the wheel, touch, and the scroll keys — arrows, <kbd>Page Up</kbd>, <kbd>Page Down</kbd>, <kbd>Space</kbd>, <kbd>Home</kbd>, <kbd>End</kbd> — once focus is inside the area. The component handles no key itself, adds no role and no `tabindex`: an area holding links or fields is reached through them, and one holding only text is reached by the keyboard only in browsers that make scroll containers focusable on their own.
