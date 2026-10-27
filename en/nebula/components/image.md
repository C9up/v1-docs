# Image

One `<img>`, with the attributes that make it fast already written: a `srcset` of a dozen widths, a `sizes` that matches, `width`/`height` so the page does not jump when the bytes arrive, and `loading`/`decoding`. A bare `<img src>` costs a page twice — it ships desktop pixels to a phone, and it reserves no space until it arrives, so everything under it moves.

The component only decides *which* variants to ask for. Where the bytes come from is a resolver the app installs once; the default one points at `/__image`, the endpoint [Prism](/en/modules/prism) registers. To offer AVIF alongside a fallback, use [Picture](/en/nebula/components/picture), which renders this component as its `<img>`.

```sh
ream nebula:add image
```

Atom · `atoms/Image.ts` · no dependencies

## Usage

```ts
import { Image } from '@c9up/nebula'

Image({ src: '/photos/hero.jpg', alt: 'The workshop at dawn', width: 1200, height: 800 })
```

```html
<img data-slot="image" data-layout="constrained"
     src="/__image?src=%2Fphotos%2Fhero.jpg&w=1280&f=webp"
     srcset="/__image?src=…&w=640&f=webp 640w, … /__image?src=…&w=2560&f=webp 2560w"
     sizes="(min-width: 1200px) 1200px, 100vw"
     alt="The workshop at dawn" width="1200" height="800"
     loading="lazy" decoding="async" class="h-auto max-w-full">
```

`alt` is required by the type, and that is not a gesture: an `<img>` without one is read out to a screen reader as its file name. A decorative image passes `alt: ''` — the empty string is the markup that says "skip me", so it has to be written rather than forgotten.

## Examples

### Layouts

`layout` is the one prop worth choosing deliberately. It decides which widths are offered and what `sizes` says about them.

| Layout | Behaviour | Offers |
|---|---|---|
| `constrained` *(default)* | scales down to fit, never past `width` | 1x, 2x, and every device width below the 2x one |
| `full-width` | always the width of its container | the whole device ladder |
| `fixed` | the declared size, whatever the viewport | 1x and 2x |
| `none` | no `srcset`, no `sizes` | nothing |

```ts
import { Image } from '@c9up/nebula'

Image({ src: '/logo.png', alt: 'Acme', width: 48, height: 48, layout: 'fixed' })
Image({ src: '/banner.jpg', alt: '', layout: 'full-width' })
```

`full-width` is the only layout that works without a `width`. A `constrained` or `fixed` image with no `width` gets no `srcset` at all — only its `src`. Without a `width`, that `src` is the source exactly as given, not a URL from the resolver.

Every width offered comes off a fixed list — a small ladder for elements that are not the width of a screen (avatars, icons, thumbnails) and a device ladder above it. **The declared width is never emitted literally.** `width: 1200` asking for 1200 and 2400 would be two widths no allow-list contains, and allow-listing whatever an author happens to type is not an allow-list. It rounds *up* to the rungs that cover them — 1280 and 2560 — because rounding down is how a dense screen is handed fewer pixels than it can show. The `src` is snapped the same way: `width: 1200` fetches 1280 in a browser that ignores `srcset`.

That list and [Prism](/en/modules/prism)'s `widths` are the same list, and it is the one thing that cannot be changed on one side alone. A width the endpoint does not serve is a `srcset` entry that 400s, and a page that silently falls back to its single `src`.

The device ladder is real device widths, not round numbers — 828 is an iPhone XR, 1668 an iPad. Density is what makes rounding up cheap: the rung above 2400 is 2560, six percent over.

### Above the fold

`priority` sets `loading="eager"`, `decoding="sync"` and `fetchpriority="high"` together. Setting one without the others is the usual reason a hero image is still not the first thing painted.

```ts
import { Image } from '@c9up/nebula'

Image({ src: '/photos/hero.jpg', alt: 'The workshop at dawn', layout: 'full-width', priority: true })
```

An explicit `loading`, `decoding` or `fetchPriority` wins over what `priority` would set, one attribute at a time:

```ts
Image({ src: '/photos/hero.jpg', alt: '…', width: 800, priority: true, loading: 'lazy' })
// loading="lazy" decoding="sync" fetchpriority="high"
```

### Cropping

The image is never cropped server-side. `fit` and `position` are `object-fit` and `object-position`, applied as classes on the element, where a crop costs nothing:

```ts
Image({
  src: '/photos/team.jpg',
  alt: 'The team',
  width: 400,
  height: 400,
  fit: 'cover',
  position: 'top',
  class: 'aspect-square',
})
```

### By pixel ratio

`densities` serves `x` descriptors instead of widths — `1x`, `2x` — for an element whose size never changes with the viewport. It needs a `width`, and the image then carries no `sizes`: a density `srcset` describes itself.

```ts
Image({ src: '/icons/badge.png', alt: 'Verified', width: 100, densities: [1, 2] })
// srcset="…&w=128… 1x, …&w=256… 2x"
```

`densities` and `widths` cannot share a `srcset` — one mixing `w` and `x` descriptors is invalid, and a browser that sees one ignores the attribute entirely. If both are given, `widths` wins.

### Your own ladder

`breakpoints` replaces the device ladder the widths are drawn from. `LIMITED_RESOLUTIONS` is a shorter one that stops at 2560 — seven fewer variants to store and warm for a full-width image:

```ts
import { Image, LIMITED_RESOLUTIONS } from '@c9up/nebula'

Image({ src: '/banner.jpg', alt: '', layout: 'full-width', breakpoints: LIMITED_RESOLUTIONS })
```

`widths` overrides the computed list outright. Pair it with a `sizes` that says how wide the image is drawn, or the browser assumes the whole viewport:

```ts
Image({
  src: '/photos/card.jpg',
  alt: 'Product shot',
  width: 320,
  widths: [384, 640, 750],
  sizes: '(min-width: 768px) 320px, 100vw',
})
```

A `widths` list you write must still be widths the endpoint serves.

Pass `originalWidth` when the source's own width is known. It is only a refinement — the endpoint refuses to enlarge anything, so leaving it out costs a duplicate URL serving the same bytes, never a blurry enlargement.

### Following a signal

Every attribute is bound through an accessor, so a gallery that swaps its photo re-points `src` and `srcset`, and a width that changes recomputes the ladder:

```ts
import { signal } from '@c9up/aurora'
import { Image } from '@c9up/nebula'

const photo = signal({ src: '/photos/1.jpg', alt: 'The bench by the lake' })

Image({ src: () => photo().src, alt: () => photo().alt, width: 800, height: 600 })
```

### Where the bytes come from

The component does not know. It asks a resolver for a URL, and the default one points at `/__image` — the endpoint [Prism](/en/modules/prism) registers. Pointing it at a CDN is one call:

```ts
import { setImageResolver } from '@c9up/nebula'

setImageResolver((src, { width, format, quality }) => {
  const url = new URL(src, 'https://cdn.example.com')
  url.searchParams.set('w', String(width))
  if (format !== undefined) url.searchParams.set('fm', format)
  if (quality !== undefined) url.searchParams.set('q', String(quality))
  return url.toString()
})
```

Install it once at startup, from a module both the server and the browser run. They have to agree: an `src` that differs between the two makes the browser discard the image the server already started fetching and request another. `setImageResolver(null)` puts the default back.

A resolver is asked for a width, a format and a quality, and never for a height or a crop. Those are the two axes an endpoint cannot bound, and neither is needed — cropping is `fit` and `position`, on the element.

To keep the default resolver and only move its route, `setImageEndpoint('/media/image')`.

## API

### Image

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | `Reactive<string>` | — | The source, as the resolver receives it. |
| `alt` | `Reactive<string>` | — | Required. `''` marks a decorative image. |
| `width` | `Reactive<number \| undefined>` | — | Displayed width in pixels, and the `width` attribute. With `height`, what reserves the space. Needed by every layout but `full-width`. |
| `height` | `Reactive<number \| undefined>` | — | The `height` attribute. |
| `layout` | `Reactive<ImageLayout>` | `'constrained'` | `'constrained' \| 'full-width' \| 'fixed' \| 'none'` — see [Layouts](#layouts). |
| `fit` | `Reactive<ImageFit \| undefined>` | — | `object-fit`: `'cover' \| 'contain' \| 'fill' \| 'none' \| 'scale-down'`. |
| `position` | `Reactive<ImagePosition \| undefined>` | — | `object-position`, for when `fit` crops: `'center'`, `'top'`, `'bottom left'`… |
| `format` | `Reactive<ImageFormat \| undefined>` | `'webp'` | The format to request: `'avif' \| 'webp' \| 'jpeg' \| 'png'`. |
| `quality` | `Reactive<number \| undefined>` | — | 1–100. The endpoint decides which values it accepts. |
| `widths` | `Reactive<readonly number[] \| undefined>` | — | Replaces the computed width list. Pair it with `sizes`. |
| `densities` | `Reactive<readonly number[] \| undefined>` | — | Serve by pixel ratio (`[1, 2]`) instead of width. Ignored when `widths` is given. |
| `sizes` | `Reactive<string \| undefined>` | from `layout` and `width` | Replaces the computed `sizes`. |
| `breakpoints` | `Reactive<readonly number[] \| undefined>` | `DEFAULT_RESOLUTIONS` | The device ladder widths are drawn from. |
| `originalWidth` | `Reactive<number \| undefined>` | — | The source's own width. Drops the variants it cannot fill. |
| `priority` | `Reactive<boolean>` | `false` | Above the fold: `loading="eager"`, `decoding="sync"`, `fetchpriority="high"`. |
| `loading` | `Reactive<'lazy' \| 'eager' \| undefined>` | `'lazy'` (`'eager'` with `priority`) | Wins over `priority`. |
| `decoding` | `Reactive<'async' \| 'sync' \| 'auto' \| undefined>` | `'async'` (`'sync'` with `priority`) | Wins over `priority`. |
| `fetchPriority` | `Reactive<'high' \| 'low' \| 'auto' \| undefined>` | — (`'high'` with `priority`) | Wins over `priority`. |
| `class` | `Reactive<string>` | — | Merged after the layout, fit and position classes. |

### The resolver

| Function | Description |
|---|---|
| `setImageResolver(next: ImageUrlResolver \| null): void` | Installs the resolver every image uses. `null` restores the default. |
| `setImageEndpoint(path: string): void` | Moves the default resolver off `/__image`. |
| `getImageResolver(): ImageUrlResolver` | The resolver currently installed. |
| `imageUrl(src: string, transform: ImageTransform): string` | One URL through the installed resolver — for a `background-image`, an `og:image`. |
| `defaultImageResolver` | `/__image?src=…&w=…&f=…&q=…`, one-letter parameters because they repeat in every `srcset` entry. `f` and `q` are left out when not asked for; `w` is rounded. |

`ImageUrlResolver` is `(src: string, transform: ImageTransform) => string`, and `ImageTransform` is `{ width: number; format?: ImageFormat; quality?: number }`.

### Ladders

| Export | Description |
|---|---|
| `DEFAULT_RESOLUTIONS` | The device ladder: 640, 750, 828, 960, 1080, 1280, 1668, 1920, 2048, 2560, 3200, 3840, 4480, 5120, 6016. |
| `LIMITED_RESOLUTIONS` | 640, 750, 828, 1080, 1280, 1668, 2048, 2560 — the default ladder without 960, 1920 and everything above 2560. |
| `allSizes(breakpoints): number[]` | Every width a component may ask for: the small ladder (16 to 384) and `breakpoints`, ascending. The list an endpoint has to allow. |

### Building blocks

The arithmetic is pure — widths in, strings out — and exported for markup the components do not write.

| Function | Description |
|---|---|
| `imageWidths({ width?, layout, breakpoints?, originalWidth? }): number[]` | The widths to offer, ascending. |
| `imageSizes({ width?, layout }): string \| undefined` | The `sizes` for a layout. |
| `imageSrcSet({ src, widths, format?, quality?, resolve? }): string \| undefined` | A `srcset` with `w` descriptors. |
| `densitySrcSet({ src, width, densities, format?, quality?, originalWidth?, breakpoints?, resolve? }): string \| undefined` | A `srcset` with `x` descriptors, one entry per distinct width. |
| `layoutClasses(layout)`, `fitClass(fit)`, `positionClass(position)` | The Tailwind classes for each. |
| `resolvedWidths(props)`, `resolvedSrcSet(props, format)`, `resolvedSizes(props)`, `resolvedSrc(props, format)`, `imageClasses(props)`, `loadingAttributes(props)` | What `Image` computes from its props — what `Picture` reuses so its `<source>` elements offer exactly the `<img>`'s ladder. |

## Accessibility

A native `<img>`. `alt` is required by the type and always rendered, including when empty: `alt=""` keeps a decorative image out of the accessibility tree, where a missing `alt` would have it read out as its file name. `width` and `height` reserve the space before the image loads, so nothing under it moves while someone is reading.
