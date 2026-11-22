# Serving images

This guide covers serving images to a page:

- Nothing is mounted unless you ask
- Every axis is allow-listed
- What comes back
- What producing a variant costs

## Serving images to a page

A page that offers a dozen widths of every image needs those widths to exist. The `serve` block mounts one route that produces them on demand:

```ts
// config/images.ts
export default defineConfig({
  quality: 82,
  serve: {
    roots: [app.publicPath('photos')],
    cacheDir: app.tmpPath('images'),
  },
})
```

That is all [Nebula's `Image`](/en/nebula/components/image) needs — its default resolver already points at `/__image`, and the width ladder the two use is the same one.

A request names a source, a width, and optionally a format and a quality:

```
/__image?src=hero.jpg&w=1280&f=webp&q=82
```

`src` is a path under the roots. One leading slash is accepted, so the path a page already uses for a public file works as is: `src=/photos/hero.jpg` and `src=photos/hero.jpg` name the same file. Never two — `//host/a.png` is a protocol-relative URL and is refused as one.

The answer is resized, re-encoded, tagged with an `ETag` and marked `immutable` for a year. The tag covers the source's size and modification time, so replacing a file on disk invalidates every variant of it without anyone clearing a cache — which matters, because the URL carries no version and nothing else could.

### Nothing is mounted unless you ask

There is no `serve` block by default. A route that reads files off disk and spends CPU on demand is not something a package should add to an application because the package happened to be installed. Declaring one with no `roots` fails the boot rather than starting: it would answer every image with a 404, and that is a mistake better found at startup than in production.

Outside Ream there is no `router` in the container and nothing is mounted either. Wire it yourself:

```ts
import { registerImageRoute } from '@c9up/prism'

registerImageRoute(router, images, { roots: [publicDir] })
```

### Every axis is allow-listed

An open transformation endpoint is a cache bomb before it is a feature. Anything a caller can vary is a dimension of a cache nobody bounded — ten thousand requests for ten thousand widths is ten thousand decodes and ten thousand files, from one `curl` loop.

So nothing here is validated for plausibility; each axis is checked against a list:

| Parameter | Bounded by | Default |
|---|---|---|
| `src` | resolves inside `roots` | nothing is reachable |
| `w` | `widths` | the 23 widths Nebula generates from |
| `f` | `formats` | AVIF, WebP, JPEG, PNG |
| `q` | `qualities` | the single configured `quality` |

That leaves the number of distinct answers at (files × widths × formats × qualities), which is a number you chose. Anything outside the lists is a 400 and is never decoded — refusing before the work is the whole point. The parameters are read as plain decimal digits, so `0x190` and `4e2` are refused rather than quietly becoming 400.

Height and crop are absent on purpose. They are the two axes that cannot be allow-listed without making the component unusable, and neither is needed: a responsive image crops with `object-fit`, in the browser, for free.

A `src` that reaches outside its root and a `src` that names nothing get the same 404. Telling them apart is how a caller maps the disk. The check holds on the file's real path too: a symbolic link inside a root that points outside it — left by an archive extracted into an upload directory, a shared volume — is a 404, while a link that stays inside the root, or a root that is itself a link, works.

### What comes back

Never larger than the source. The component offers a 2x variant without knowing how big the original is, and answering that with an enlargement would be worse than answering it with the original — more bytes, no more detail. A 2560px request against an 800px source returns 800px.

Never carrying EXIF. The engine re-encodes from decoded pixels and metadata does not survive that, so GPS coordinates, serial numbers and timestamps do not reach the page. A holiday photo carries the house's coordinates, and a public thumbnail is exactly where that surfaces.

Never anything but what the engine wrote. A file that is not an image — an SVG, a `.env` that happens to sit in a root — answers the same 404 as a missing file. An image the engine refuses — over the pixel ceiling, corrupt, in a format the application does not accept — answers 422 `E_PRISM_IMAGE_UNPROCESSABLE`. Neither is ever sent as it stands: the original of a file that failed to render is exactly the file nobody vetted, the SVG with a script in it, the photo still carrying its GPS block. Refusals are `Cache-Control: no-store`.

The content type is the format the engine wrote, never the file's extension, and every answer carries `Content-Security-Policy: default-src 'none'; sandbox` and `X-Content-Type-Options: nosniff`.

### What producing a variant costs

The allow-lists bound how many answers exist, not what producing one costs nor how often it is produced. An AVIF encode is seconds of CPU on libuv's thread pool — the four threads that also serve the application's file, DNS and crypto calls. So:

- **A variant is rendered once.** It is keyed by the width it will really have: 3200, 3840 and 5120 of a 3000px source are the same image and one render. The same variant asked for several times at once is decoded once.
- **There is always a cache.** With `cacheDir`, variants are kept on disk, one directory per source; replacing a source deletes its previous version's variants when the new ones are written, so an avatar re-uploaded at the same path does not pile up. Without `cacheDir`, they are kept in memory up to `memoryCacheBytes` (32 MiB), least recently used dropped first.
- **Renders run a few at a time.** `concurrency` (2) renders run at once, `queueLimit` (64) wait; past that the answer is 503 `E_PRISM_IMAGE_BUSY` with `Retry-After`, rather than a longer wait for everyone.
- **Identifying a source is bounded too.** Its first 64 KiB are read to tell an image from anything else; a video or archive sitting in a root costs that read, once per version of the file — the answer, a refusal included, is remembered. A larger image is read whole only inside the render gate above, so `concurrency` x `limits.maxBytes` is the most that source reads hold at once, and the same source asked for many times at once is read once.
- **AVIF is encoded at `effort` 1** (0 fastest, 9 slowest): the image is encoded while a visitor waits, and effort 4 takes about four times as long for bytes within a percent.

| Option | Default | |
|---|---|---|
| `cacheDir` | — | variants on disk |
| `memoryCacheBytes` | 32 MiB | in-memory cache when there is no `cacheDir`; 0 turns it off |
| `concurrency` | 2 | renders at once; keep it below `UV_THREADPOOL_SIZE` |
| `queueLimit` | 64 | renders waiting before a 503 |
| `effort` | 1 | AVIF encoding effort, 0–9 |
