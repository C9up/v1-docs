# Introduction

This guide covers images with prism:

- Capabilities
- Configure
- Main API
- Production checklist

Prism is the image-processing layer in the Ream ecosystem (`@c9up/prism`).
Resize, convert, crop, composite and watermark, on a Rust engine.

## Capabilities

- resize with four fit modes, deriving the missing dimension
- convert between JPEG, PNG and WebP, with quality
- crop, rotate by right angles, flip
- composite another image, with opacity
- text watermark from a caller-supplied font
- read an image's header without decoding it
- EXIF auto-orientation, and metadata stripped on the way out
- QR codes as SVG, PNG, WebP or AVIF, styled or plain, with a logo

## Configure

```ts
// config/images.ts
import { defineConfig } from '@c9up/prism'
import env from '#start/env'

export default defineConfig({
  limits: {
    maxPixels: Number(env.get('IMAGE_MAX_PIXELS', '50000000')),
    maxBytes: 64 * 1024 * 1024,
  },
  quality: 82,
  autoOrient: true,
})
```

```ts
// reamrc.ts
providers: [() => import('@c9up/prism/provider')]
```

`ream configure @c9up/prism` writes both and declares `IMAGE_MAX_PIXELS`.

The configuration is flat — no `default`, no `use()`. There is one engine, and
the multi-driver shape belongs to a module that genuinely has more than one
backend. [Vellum](/en/guides/digging-deeper/pdf/) takes the same shape for the same reason.

## Main API

```ts
import images from '@c9up/prism/services/main'
```

### A pipeline

```ts
const thumb = await images
  .edit(upload)
  .resize({ width: 300, height: 300, fit: 'cover' })
  .toFormat('webp')
```

A pipeline is inert until it is asked for bytes. Everything queued then crosses
into Rust **once**: a resize followed by a watermark decodes and encodes a
single time, on a worker thread, so the event loop never waits on the
resampling.

### Inspecting before accepting

```ts
const meta = images.inspect(upload)
```

| Field | Meaning |
|---|---|
| `width` / `height` | as the header declares them |
| `orientedWidth` / `orientedHeight` | after the EXIF rotation is applied |
| `format` | the format read from the CONTENT, one of the fifteen names under [Formats](/en/guides/digging-deeper/images/formats#formats); an image outside `allowedFormats` (by default `jpeg`, `png`, `webp`) throws `E_PRISM_FORMAT_NOT_ALLOWED` instead |
| `orientation` | EXIF orientation 1-8; `1` when there is none |
| `hasAlpha` | whether the format carries transparency |

It reads the header only and never allocates a pixel buffer, so it is cheap
enough to run on every upload. The two pairs of dimensions matter: a portrait
phone photo reports landscape dimensions plus a tag saying to turn it, and a
gallery laid out from the header alone gets every phone photo's aspect ratio
wrong.

### Fit

| `fit` | Result |
|---|---|
| `cover` (default) | fills the box, crops the overflow, centred |
| `contain` | largest size fitting inside the box |
| `fill` | exactly the requested size — distorts |
| `inside` | like `contain`, but never enlarges |

Give one dimension and the other follows the aspect ratio.

### Geometry

```ts
await images.edit(photo)
  .crop({ x: 10, y: 10, width: 200, height: 200 })
  .rotate(90)          // multiples of 90; -270 and 450 normalise
  .flip('horizontal')
  .toFormat('png')
```

A crop falling outside the image is **refused**, not clamped. Clamping returns
a smaller picture than asked for with nothing to say so — a thumbnail quietly
missing its subject.

### Composite and watermark

```ts
await images.edit(photo)
  .composite({ image: logo, x: 20, y: 20, opacity: 0.6 })
  .watermarkText({ text: 'ACME', font, size: 28, x: 20, y: 60 })
  .toFormat('png')
```

No font is bundled — pass the bytes. Shipping one would bind every consumer to
its licence and add megabytes for the majority who never draw text.

**Text is not shaped.** Glyphs are looked up per character, kerned and advanced
left to right. That is correct for Latin, Cyrillic and Greek, and wrong for any
script needing shaping or reordering: Arabic renders unjoined, Devanagari and
Thai misplace their marks, right-to-left comes out reversed. A watermark is
short and chosen by the operator, so the trade is deliberate — stamping
user-supplied text in an arbitrary language needs a shaping engine this package
does not carry.

### Filters

```ts
await images.edit(photo)
  .grayscale()
  .blur(2)                              // gaussian, accurate and slow
  .fastBlur(2)                          // box-approximated, far cheaper
  .sharpen({ sigma: 2, threshold: 5 })  // unsharp mask
  .brighten(20)                         // -255 to 255
  .contrast(15)                         // -255 to 255
  .hueRotate(90)                        // degrees, wraps
  .invert()
  .filter3x3([0, -1, 0, -1, 5, -1, 0, -1, 0])
  .toFormat('png')
```

`sharpen`'s `threshold` suppresses sharpening below a contrast step — it is
what stops an unsharp mask amplifying sensor noise in flat areas, a clear sky
being the usual casualty.

Every numeric knob is bounded, because each arrives from a request: a sigma of
1000 on a 4000x3000 image is minutes of CPU on a worker thread, so blur radius
is capped, brightness and contrast are range-checked, and a 3x3 kernel must
carry exactly nine finite values. Hue is the exception — it is circular, so
400 degrees means 40 rather than an error.

No knob is coerced on its way to the engine: NaN, an infinity, a value that
overflows the engine's 32-bit float, or a fraction where a whole number is
expected (`brighten`, `hueRotate`, `rotate`, `sharpen`'s `threshold`) is
refused with `E_PRISM_INVALID_OPERATION`, and a composite's `opacity` must lie
in 0-1. A sigma is 0 or a normal number — a subnormal one such as `1e-40` is
refused rather than handed to the blur — and `sharpen` needs a sigma above 0.

### Thumbnails

```ts
await images.edit(photo).thumbnail({ width: 32, height: 32 }).toFormat('webp')
```

A box filter rather than Lanczos: several times cheaper and visibly softer,
which is the right trade for a 32px avatar and the wrong one for a 1200px
hero. `exact: true` ignores the aspect ratio, as `fit: 'fill'` does.

## Production checklist

- set `maxPixels` from what your storage and memory can actually take, not from
  the default
- call `inspect()` before accepting an upload, and reject on its errors
- never derive a stored filename from the client's — the format the engine
  reports is the one to trust
- prefer a published binary: it carries dav1d, a from-source build does not
