# Carousel

A horizontally scrolling strip of slides, built on CSS scroll-snap and `scrollBy` rather than on a script that animates a transform. Native scrolling brings touch momentum, trackpad gestures, the platform's own overscroll and keyboard scrolling — everything a transform-based carousel has to rebuild and usually gets partly wrong. The browser's smooth scrolling does the animation.

The root is a `region` that announces itself as a carousel, and each slide a `group` labelled "3 of 7": a screen reader user otherwise has no way to tell how much is off-screen, since the strip running off the edge says nothing to them.

```sh
ream nebula:add carousel
```

Organism · `organisms/Carousel.ts` · [Button](/en/nebula/components/button)

## Usage

```ts
import { html } from '@c9up/aurora'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@c9up/nebula'

Carousel({
  label: 'Featured products',
  class: 'mx-12',
  children: () => html`
    ${CarouselContent({
      children: html`
        ${CarouselItem({ children: 'One' })}
        ${CarouselItem({ children: 'Two' })}
        ${CarouselItem({ children: 'Three' })}
      `,
    })}
    ${CarouselPrevious()}
    ${CarouselNext()}
  `,
})
```

`Carousel`'s `children` is typed `Parts`: the `() =>` is what lets the slides and the arrows find it — see [composition](/en/nebula/composition). The arrows sit outside the strip, three rem to each side, hence the `mx-12` that leaves them room.

## Examples

### Slides from data

Each slide claims its position as it is built, and the count is read when the labels are written, so a list mapped once is numbered "1 of 5" to "5 of 5":

```ts
import { html } from '@c9up/aurora'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, Image } from '@c9up/nebula'

Carousel({
  label: 'Gallery',
  class: 'mx-12',
  children: () => html`
    ${CarouselContent({
      children: photos.map((photo) =>
        CarouselItem({ children: Image({ src: photo.src, alt: photo.alt, layout: 'full-width' }) }),
      ),
    })}
    ${CarouselPrevious()}
    ${CarouselNext()}
  `,
})
```

Build the slides as a value, as here. Positions are only ever handed out, never taken back: slides rebuilt by an accessor would claim new positions after the old ones, and their labels would stop matching.

### Several slides per view

A slide is the full width of the strip. Give it a smaller basis to show more than one; the strip spaces slides with `gap-4`, so take the gaps out of the fraction:

```ts
CarouselItem({ class: 'basis-[calc((100%_-_2rem)/3)]', children: 'One' })
```

Next and Previous scroll by the visible width, so with three per view each press moves on by a whole view, and scroll-snap settles the strip on a slide's edge.

### Vertical

```ts
Carousel({
  orientation: 'vertical',
  class: 'my-12',
  children: () => html`
    ${CarouselContent({ class: 'h-72', children: html`${CarouselItem({ children: 'One' })}${CarouselItem({ children: 'Two' })}` })}
    ${CarouselPrevious()}
    ${CarouselNext()}
  `,
})
```

The strip becomes a column capped at `max-h-96`, the arrows move above and below it and turn to point up and down, and the arrow keys become <kbd>↑</kbd> and <kbd>↓</kbd>. `orientation` is read once.

### No index to set

There is no current slide to read or set: the position is the scroll position, and a drag, a wheel, a swipe and the arrows all move it. The arrows only read it, to disable themselves at either end.

## API

### Carousel

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | A `CarouselContent`, then the arrows. |
| `label` | `string` | `'Carousel'` | The region's accessible name. |
| `roleDescription` | `string` | `'carousel'` | What a screen reader calls the region. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | The scroll axis, and which arrow keys move it. |
| `class` | `Reactive<string>` | — | Merged into the region's classes. |

### CarouselContent

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The `CarouselItem`s. |
| `class` | `Reactive<string>` | — | Merged into the scroll container's classes. |

### CarouselItem

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The slide's content. |
| `roleDescription` | `string` | `'slide'` | What a screen reader calls one slide. |
| `label` | `(position: number, count: number) => string` | `` `${position} of ${count}` `` | The slide's name from its position. |
| `class` | `Reactive<string>` | — | Merged into the slide's classes; `basis-*` sets how much of the strip it takes. |

### CarouselPrevious, CarouselNext

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'Previous slide'` / `'Next slide'` | The arrow's accessible name. |
| `class` | `Reactive<string>` | — | Merged after the outline icon-button classes and the placement. |

## Accessibility

The root is `role="region"` with `aria-roledescription="carousel"` and `aria-label` from `label`. Each slide is `role="group"` with `aria-roledescription="slide"` and an `aria-label` like "3 of 7". The arrows are native `<button>`s named by `label`, and disabled at the start and at the end of the strip, read from the scroll position.

The scroll container is focusable (`tabindex="0"`), so the strip can be reached and scrolled from the keyboard even without the arrows.

| Key | Action |
|---|---|
| <kbd>←</kbd> / <kbd>→</kbd> | Scroll back / forward by one visible width (horizontal). |
| <kbd>↑</kbd> / <kbd>↓</kbd> | The same, when `orientation` is `vertical`. |

The keys are handled on the whole region, so they work with focus on the strip, on an arrow, or on anything inside a slide — a text field in a slide included, whose caret the arrows then no longer move.

Every built-in text is a prop — `label` and `roleDescription` on `Carousel`, `roleDescription` and `label(position, count)` on `CarouselItem`, `label` on each arrow: see [languages](/en/nebula/languages).
