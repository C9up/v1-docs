# AspectRatio

A box that keeps its width-to-height ratio as its width changes: a photo in a grid, a video frame, a map. No JavaScript measures it: the height comes from an empty SVG whose `viewBox` carries the ratio, and an SVG at full width is exactly as tall as its viewBox says. The ratio is any number, so it cannot be a utility class, and it is not a `style` attribute either — a Content-Security-Policy without `'unsafe-inline'` blocks those, and a style set by script only lands once the page hydrates. A `viewBox` is in the server's markup and no policy touches it, so the box has its height from the first paint.

The box is `relative w-full`: its width comes from its container and its height from the ratio. The content sits in a layer laid `absolute inset-0` over it; it fills that layer with `h-full w-full`, or positions itself `absolute inset-0` too.

```sh
ream nebula:add aspect-ratio
```

Atom · `atoms/AspectRatio.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { AspectRatio } from '@c9up/nebula'

AspectRatio({
  ratio: 16 / 9,
  children: html`<img src="/harbour.jpg" alt="The harbour at dawn" class="h-full w-full rounded-lg object-cover">`,
})
```

## Examples

### Squares in a grid

`ratio` defaults to `1`. With `object-cover`, photos of any shape line up as a grid of squares:

```ts
html`<div class="grid grid-cols-3 gap-2">
  ${photos.map((photo) => AspectRatio({
    class: 'bg-muted overflow-hidden rounded-md',
    children: html`<img src="${photo.src}" alt="${photo.alt}" class="h-full w-full object-cover">`,
  }))}
</div>`
```

### An embedded frame

An `<iframe>` has an intrinsic size of its own; positioned `absolute inset-0`, it fills the box instead:

```ts
AspectRatio({
  ratio: 16 / 9,
  class: 'bg-muted rounded-lg',
  children: html`<iframe src="/embed/tour" title="Product tour" class="absolute inset-0 h-full w-full rounded-lg"></iframe>`,
})
```

### Following a choice

`ratio` takes an accessor, so a preview can switch between portrait and landscape:

```ts
import { signal } from '@c9up/aurora'

const portrait = signal(false)

AspectRatio({
  ratio: () => (portrait() ? 3 / 4 : 4 / 3),
  class: 'bg-muted rounded-lg',
  children: preview,
})
```

## API

### AspectRatio

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | What the box holds. |
| `ratio` | `Reactive<number>` | `1` | Width divided by height: `16 / 9` for widescreen, `1` for a square. |
| `class` | `Reactive<string>` | — | Merged last, so a conflicting utility wins. |

## Accessibility

The box has no role and says nothing: what it holds carries the meaning. An `<img>` inside needs its `alt`, an `<iframe>` its `title`.
