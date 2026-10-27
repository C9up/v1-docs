# Picture

The same image in several formats, and the browser takes the first it can read. [Image](/en/nebula/components/image) asks for one format and trusts it to be supported — fine for WebP, which every current browser reads. AVIF is smaller again and still not universal, so it can only be offered *alongside* a fallback, which is what `<picture>` is for.

The `<img>` underneath is `Image` itself with every prop forwarded. That is deliberate: the `srcset` arithmetic, the `sizes`, the loading attributes and the layout classes have one implementation, so a `<source>` can never end up offering a different ladder than the image beneath it.

```sh
ream nebula:add picture
```

Molecule · `molecules/Picture.ts` · [Image](/en/nebula/components/image)

## Usage

```ts
import { Picture } from '@c9up/nebula'

Picture({ src: '/photos/hero.jpg', alt: 'The workshop at dawn', width: 1200, height: 800 })
```

```html
<picture data-slot="picture">
  <source data-slot="picture-source" type="image/avif" srcset="…" sizes="…">
  <source data-slot="picture-source" type="image/webp" srcset="…" sizes="…">
  <img data-slot="image" src="…&f=jpeg" srcset="…" sizes="…" width="1200" height="800"
       loading="lazy" decoding="async" alt="The workshop at dawn">
</picture>
```

The browser takes the first `type` it understands; one that understands none takes the `<img>`, which is also what a crawler reads.

## Examples

### The order of formats

The order of `formats` is the whole contract — a browser takes the first `type` it supports without comparing sizes, so listing WebP before AVIF means nothing ever receives the smaller file.

```ts
Picture({ src: '/photos/hero.jpg', alt: '…', width: 1200, height: 800, formats: ['webp'] })
```

`formats: ['webp']` drops AVIF — for an endpoint that does not encode it, or a source where AVIF is not worth the encoding time.

### The fallback

The `<img>`'s format follows the source's extension: a `.png` source falls back to PNG, anything else to JPEG. A transparent PNG flattened to JPEG arrives with a black background, on exactly the path taken by the browsers least likely to be checked.

```ts
Picture({ src: '/logo.png', alt: 'Acme', width: 200, layout: 'fixed' })
// <source type="image/avif">, <source type="image/webp">, <img src="…&f=png">
```

Left to itself, the fallback is never AVIF or WebP — a `.webp` or `.avif` source falls back to JPEG, since a browser that reads neither would otherwise be handed one of them. `fallbackFormat` decides it outright:

```ts
Picture({ src: '/photos/hero.jpg', alt: '…', width: 1200, fallbackFormat: 'png' })
```

### Everything Image does

Every [Image](/en/nebula/components/image) prop works here. The ones that shape the ladder — `layout`, `width`, `widths`, `densities`, `sizes`, `breakpoints`, `originalWidth`, `quality` — reach every `<source>` as well as the `<img>`; the rest — `priority`, `fit`, `position`, `class` — land on the `<img>`, the one element that is drawn.

```ts
Picture({
  src: '/photos/hero.jpg',
  alt: 'The workshop at dawn',
  layout: 'full-width',
  priority: true,
  quality: 70,
})
```

A layout that produces no ladder — `none`, or a `constrained`/`fixed` image without a `width` — renders no `<source>` at all, only the `<img>`. An empty `srcset` would be worse than none: the browser would pick that source and render nothing.

## API

### Picture

Every [Image prop](/en/nebula/components/image#api), plus:

| Prop | Type | Default | Description |
|---|---|---|---|
| `formats` | `Reactive<readonly ImageFormat[]>` | `['avif', 'webp']` | One `<source>` per format, in this order. Best first. |
| `fallbackFormat` | `Reactive<ImageFormat \| undefined>` | `'png'` for a `.png` source, otherwise `'jpeg'` | The format of the `<img>` underneath. |

`format`, inherited from `Image`, has no effect here: `formats` and `fallbackFormat` replace it.

### formatFromSource

`formatFromSource(src: string): ImageFormat | undefined` — the format a source's extension claims (`.jpg` and `.jpeg` are `'jpeg'`), ignoring a query string or a fragment. A claim, not proof: only the server knows what the bytes are, and it re-reads them.

### mimeType

`mimeType(format: ImageFormat): string` — `'image/avif'`, `'image/webp'`…, the `type` a `<source>` carries.

## Accessibility

The `<picture>` and its `<source>` elements are not exposed to assistive technology; the `<img>` is, with the `alt` given to `Picture`. Everything said about `alt` on [Image](/en/nebula/components/image#accessibility) applies: required, and `''` for a decorative image.
