# Safety and testing

This guide covers the safety limits, errors and testing:

- Safety
- Errors
- The engine
- Testing

## Safety

Every byte reaching this package came from an upload, and the guards run before
anything is allocated.

**The format comes from the content**, never from a filename or a
`Content-Type` — both are supplied by whoever supplied the bytes.

**Three decoders, on an allowlist.** Every decoder compiled in is parser
surface facing hostile input. A format nobody asked for is a liability, not a
feature — a GIF is a perfectly valid image and still refused.

**A pixel ceiling, checked against the header.** A 40 KB PNG can declare
50000x50000, and decoding it asks for ten gigabytes before anything objects.
The product is computed in 64 bits: in 32 it overflows to a small number for
exactly the largest image expressible, and the check would pass. For AVIF the
header is the AV1 sequence header, read without decoding — `inspect` stays a
header read — and the AV1 decoder is given the same ceiling as a frame-size
limit, because a frame may declare a size of its own.

**Every frame, not only the canvas.** A GIF states a screen size and then a
size per frame; an extended WebP states a canvas and then a size in each
bitstream. The decoder allocates from the frame, so the ceiling is checked
against every GIF frame, and a WebP bitstream whose size is not its frame's is
refused with `E_PRISM_UNREADABLE` before it is decoded.

**Headers that expand are bounded.** A PNG's ICC profile is compressed; the
header read inflates at most 4 MiB of it, plus a few times the file for the
text chunks, and drops a profile larger than that — no output carries one. An
AVIF item spread over more bytes than the file holds (its index listing the
same data thousands of times) is refused before it is assembled.

**A memory ceiling, in bytes.** Pixels do not say what a pipeline costs: a
16-bit RGBA pixel is 8 bytes decoded, and a resize holds a 16-byte float
intermediate of source width x target height beside the source and the
output. `limits.maxMemory` (512 MiB) bounds one pipeline: each step adds what
it keeps to what it allocates and is refused with `E_PRISM_MEMORY_LIMIT` before
allocating when the sum is over. A 16-bit source is narrowed to 8 bits right
after decoding when the output is 8-bit. `concurrency` (2) pipelines run at
once per `Prism`, so one instance holds at most 1 GiB. The
[reference](/en/reference/prism#memory) gives what each step counts.

**The same ceiling on what an operation builds.** A resize target, the side a
resize derives from the aspect ratio, the scaled intermediate of a `cover`, a
watermark layer: each is refused with `E_PRISM_TOO_MANY_PIXELS` before it is
allocated. An allocation that fails aborts the process rather than raising, so
a size that came from a request has to be bounded before it is asked for.
Watermark text is limited to 1024 characters, and a width, height or quality
that is not an integer in range is refused, not wrapped.

**A panic net on every boundary.** A panic crossing NAPI takes the Node process
down; on a libuv worker it aborts outright.

**Overlays are guarded exactly like the input** — a per-tenant watermark is an
upload too.

**Metadata never survives a pass through the engine.** Re-encoding from decoded
pixels carries no EXIF, GPS, XMP or colour profile forward. A holiday photo
carries the house's coordinates, so dropping that is the right default rather
than something to opt into.

## Errors

| Code | Raised when |
|---|---|
| `E_PRISM_EMPTY_INPUT` | nothing was passed |
| `E_PRISM_INPUT_TOO_LARGE` | over the byte ceiling |
| `E_PRISM_TOO_MANY_PIXELS` | the header or a frame declares, or an operation would build, more pixels than allowed |
| `E_PRISM_MEMORY_LIMIT` | a step of the pipeline would hold more bytes than `maxMemory` |
| `E_PRISM_UNKNOWN_FORMAT` | the bytes are not an image |
| `E_PRISM_FORMAT_NOT_ALLOWED` | a real image, in a format not on `allowedFormats` |
| `E_PRISM_UNSUPPORTED_FORMAT` | an output format the engine does not write (`dds`) |
| `E_PRISM_INVALID_GEOMETRY` | a crop outside the image, a rotation off the right angles, a watermark text over 1024 characters |
| `E_PRISM_INVALID_FONT` | the watermark font could not be read |
| `E_PRISM_INVALID_OPERATION` | an operation missing a field it needs, or a size, quality or effort that is not an integer in range |
| `E_PRISM_QR_TOO_LONG` | more text than a QR code holds at the chosen level and version |
| `E_PRISM_INVALID_QR_OPTION` | a QR option out of range, a colour that is not strict hex, or a style that would not scan |
| `E_PRISM_NATIVE_REQUIRED` | the Rust engine is not installed for this platform |

## The engine

Rust, loaded as a prebuilt `.node`. It is **not** optional and there is no
JavaScript fallback: a missing binary raises with build instructions rather
than degrading silently, so one deployment cannot behave differently from
another. Build it locally with `pnpm build:napi`.

## Testing

```ts
import { fakeImages } from '@c9up/prism/testing'

const { images, restore } = fakeImages()
afterEach(restore)
```

The real engine, not a stub — an assertion about a thumbnail's dimensions is
only worth making against the code that produces it.
