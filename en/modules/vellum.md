# Vellum — PDF

Status: **Present (TS + Rust N-API)**.

- Package: `@c9up/vellum`
- Goal: convert PDF pages to images, read what a document holds, and reshape it
  — merge, split, rotate, stamp.

The work happens in Rust behind N-API, because PDF has no adequate JavaScript
implementation. This is a capability the platform lacks, not an optimisation of
one it has.

## Quick Examples

```ts
import vellum from '@c9up/vellum/services/main'

// A preview of the first page, 1200px wide
const preview = await vellum.render(pdf, { page: 1, width: 1200 })

// Every page as JPEG
const pages = await vellum.renderAll(pdf, { format: 'jpeg', quality: 82 })

// What the document holds
const { pageCount, encrypted } = await vellum.inspect(pdf)
const { title, author, createdAt } = await vellum.metadata(pdf)
const text = await vellum.extractText(pdf, { page: 1 })

// Reshaping it
const dossier = await vellum.merge([contract, annexe])
const extract = await vellum.selectPages(pdf, [1, 3, 4])
const parts = await vellum.split(pdf)
const upright = await vellum.rotate(scan, 90, { pages: [1] })

// Stamping it
const signed = await vellum.stamp(workOrder, signature, {
  page: 1, x: 380, y: 690, width: 140,
})
const marked = await vellum.stampText(invoice, 'PAID', {
  x: 400, y: 80, size: 24, color: '#c00', opacity: 0.6,
})
```

Every method is asynchronous. Rasterising an A4 page is around 30ms of pure
computation, so it runs on the libuv thread pool rather than on the thread
serving requests.

**Pages are numbered from 1** — the number printed on the page, not an array
index.

## Installation

```bash
ream configure @c9up/vellum
```

That registers the provider and writes `config/vellum.ts`:

```ts
import { defineConfig } from '@c9up/vellum'
import env from '#start/env'

export default defineConfig({
  format: env.get('VELLUM_FORMAT', 'png'),
  scale: 1,
  quality: 82,
  background: '#ffffff',
})
```

Every option is a default that any call can override.

The service is also a class, usable without a host:

```ts
import { Vellum } from '@c9up/vellum'

const vellum = new Vellum({ format: 'jpeg', quality: 82 })
```

## Rendering

| Option | Meaning |
| --- | --- |
| `page` | Which page to render, from 1. `render` only. |
| `scale` | Multiplier over natural size; 1 is 72 DPI. |
| `width` | Target width in pixels. Takes precedence over `scale`. |
| `format` | `"png"` (default) or `"jpeg"`. |
| `quality` | JPEG quality 1-100. Refused without `format: 'jpeg'`. |
| `background` | `#rgb`, `#rrggbb`, `#rrggbbaa` or `"transparent"`. Default opaque white. |

A PDF paints no background of its own, so the default is opaque white: rendering
it transparent makes black text invisible over a dark viewer.

`quality` without `format: 'jpeg'` is refused rather than ignored — a caller
passing a quality wants a lossy image, and answering with a multi-megabyte PNG
is a surprise nobody notices until previews crawl.

```ts
const sizes = await vellum.dimensions(pdf) // natural size, in points
```

## Reading

`inspect` reports the page count, the format version and whether the document is
encrypted. `metadata` reads the `/Info` dictionary — title, author, subject,
keywords, the applications involved, and the dates. Every field is optional,
because a PDF is valid with no `/Info` at all.

Dates come back as ISO 8601 when the producer wrote a conforming one, and as the
raw string it did write otherwise — reporting nothing would discard information.

`extractText` returns the text of one page, `extractTextAll` one entry per page.
Glyphs come back in the order the page draws them, with a line break where the
baseline moves. That order is the reading order in practice; no reordering by
coordinates is attempted, because doing it well needs column detection and doing
it badly makes multi-column pages worse. No spaces are invented either — a PDF
encodes its own.

A scanned document with no text layer yields an empty string rather than an
error: it has no text to give.

## Reshaping

`merge`, `selectPages`, `split` and `rotate` all move pages between page trees,
which is where PDF hides a trap: `Resources`, `MediaBox`, `CropBox` and `Rotate`
may live on a parent node and be *inherited* by the page. Re-parent such a page
naively and it loses its size — readers then fall back to Letter, quietly
resizing an A4 document. Every operation materialises the inherited attributes
onto the page first.

Rotation adds to whatever a page already carries, because a scan can arrive
already turned. The angle must be a multiple of 90.

## Stamping

`stamp` draws an image; `stampText` writes a line of text.

```ts
await vellum.stamp(pdf, signature, { page: 1, x: 380, y: 690, width: 140 })
await vellum.stampText(pdf, 'DRAFT', { size: 48, opacity: 0.15 })
```

Coordinates count from the **top-left** corner, the way a screen layout is
written. For `stampText`, `y` is the text's baseline. Naming no page stamps every
page, which is what a watermark wants.

Images are PNG or JPEG, chosen by file signature rather than by name. Giving
`width` alone keeps the aspect ratio.

`stampText` uses the 14 standard fonts — `Helvetica`, `Helvetica-Bold`,
`Helvetica-Oblique`, `Times-Roman`, `Times-Bold`, `Times-Italic`, `Courier`,
`Courier-Bold` — which a PDF may reference without embedding. Nothing is added to
the file and no font has to be supplied. The trade-off is the WinAnsi character
set: Western European text is covered, accents and typographic punctuation
included, and anything outside it is **refused rather than mangled** — silently
dropping a character from a contract is worse than failing.

## Errors

Failures raise `VellumError`, carrying a `code`:

| Code | Raised when |
| --- | --- |
| `E_VELLUM_NAPI_REQUIRED` | The native engine is not loadable on this platform |
| `E_VELLUM_INVALID_PDF` | The bytes are not a readable PDF |
| `E_VELLUM_INVALID_PAGE` | A page number below 1 |
| `E_VELLUM_INVALID_ROTATION` | An angle that is not a whole multiple of 90 |
| `E_VELLUM_RENDER_FAILED` | Rasterising failed |
| `E_VELLUM_EXTRACT_FAILED` | Text extraction failed |
| `E_VELLUM_MERGE_FAILED` · `E_VELLUM_SELECT_FAILED` · `E_VELLUM_SPLIT_FAILED` · `E_VELLUM_ROTATE_FAILED` | The operation failed |
| `E_VELLUM_STAMP_FAILED` · `E_VELLUM_STAMP_TEXT_FAILED` | Stamping failed |

The engine is **not optional**: there is no JavaScript fallback, so a missing
binary is a hard failure with an actionable message rather than a silent
degradation that lets one deployment behave differently from another.

## Guardrails

Every input is treated as hostile, because these documents come from uploads:

- Engine work runs behind a panic net — a panic on a worker thread would abort
  the whole process.
- The rendered size is bounded; an unbounded `scale` is a memory-exhaustion
  vector.
- A malformed colour is refused rather than falling back to white, which would
  be a wrong render nobody reports.
- Text written onto a page is escaped, so a document title cannot inject content
  stream operators.

## Interactive forms

`formFields` lists a document's AcroForm fields in declaration order; `name` is
the fully qualified name — every ancestor's partial name joined with dots —
which is the name a field is filled in by.

```ts
const fields = await vellum.formFields(mandate)

const filled = await vellum.fillForm(mandate, {
  'insured.name': 'Amélie Durand',
  accepted: 'Yes',
  country: 'CH',
})
```

Three details of PDF 32000-1 §12.7.3 this resolves for the caller:

- A field's type, flags and value are **inherited** down `/Parent`, so a field
  commonly declares none of them itself.
- A checkbox or radio's "on" state is chosen by the **document** (`/Yes`,
  `/On`, `/1`, …), not fixed by the spec. Those accepted states are reported in
  `options`; writing anything else leaves the control untouched.
- For a choice field, `options` reports the **exported** values rather than the
  labels, since the export value is what gets written back.

`fillForm` regenerates each filled field's **appearance stream**. That half is
the one that matters: most readers paint a field from its appearance, not from
its value, so a document filled without it opens looking empty while holding
every answer.

Refusals are loud rather than silent, because a filled document quietly missing
an answer is worse than a failure. An unknown field name (the error lists the
names that do exist), a read-only field, a value over the declared maximum
length, a choice the form does not offer and a checkbox state the document does
not accept are all errors.

## Not yet

Flattening a filled form, and embedding custom fonts. Two current limits of
form filling, both from having no glyph metrics: text is left-aligned whatever
the field's `/Q` says, and a multiline field honours the line breaks you write
but does not wrap.
