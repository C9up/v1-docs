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

Both write into the document that already exists rather than re-authoring it,
which is what lets the document survive being stamped on: its **interactive
form, its annotations and its links are all still there** afterwards. A
signature is stamped onto exactly the kind of document that has all three.

A JPEG goes in untouched, so a photograph stays the size it arrived at — a
photo report does not become something nobody can email. A PNG's alpha channel
becomes a soft mask, which is what makes a signature drawn on a tablet
transparent everywhere but the stroke. A CMYK JPEG is refused rather than
silently inverted.

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

// Close it: the answers become ink, the fields go away
const closed = await vellum.flattenForm(filled)
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

### How the text is laid out

A standard font is referenced without being embedded, so the reader lays the
text out with the **published widths**. Filling measures with those same
widths, which is what lets it place text where the reader will:

- The field's `/Q` is honoured — left, centred or right.
- A **multiline** field wraps at the width of its box, on top of any line
  breaks you write yourself.
- A `/DA` asking for size **0** — "whatever fits" — gets a size chosen by
  stepping down until the answer fits the box. The specification does not
  define what auto means, so this is a heuristic.
- A word too long for its line is **broken across lines** rather than left to
  run past the edge, where the appearance's bounding box would clip it away.

The widths are generated from the URW base-35 metrics and cross-checked against
published Adobe values in the tests, so a table that had drifted could not
reach a release.

## Flattening

A filled form is still a form: anyone who opens it can edit the answers back.
`flattenForm` closes it. Every widget's appearance becomes ordinary page
content, the widget annotations are removed, and the form itself is dropped.
What comes back looks the same and is no longer interactive.

Where each appearance lands follows §12.5.5: its `/BBox` is transformed by its
`/Matrix`, and the box that results is mapped onto the annotation's `/Rect`.
Painting at the rectangle's corner instead would misplace every appearance
whose form matrix is not the identity — which is most of the ones a real form
ships. The page's own content is wrapped in `q`/`Q` first, because a `cm`
outside any such pair is legal and never restored, and appended content would
otherwise inherit a transform it never asked for.

Three things it deliberately does not do:

- Annotations that are **not form widgets** — links, notes — are left where
  they are. Flattening removes the form, not the document's other furniture.
- A **hidden** widget is dropped without being painted. Making visible what a
  document hid is not preservation.
- A field holding a value that ships **no appearance to paint** is an error,
  not a silent erasure: the answer would vanish from a document that still
  looks complete.

## Not yet

Embedding custom fonts, and PAdES signing.
