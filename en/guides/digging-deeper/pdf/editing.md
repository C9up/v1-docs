# Reading and editing

This guide covers rendering, reading, reshaping and stamping a PDF:

- Rendering
- Reading
- Reshaping
- Stamping

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

Each operation costs what the document weighs, once, however many pages it
has: `selectPages` and every part of `split` copy only what their pages reach —
the page, its resources and annotations, and the catalog's outline, form and
names, with every reference to another page removed. A page tree that lists the
same page object twice is refused, by these and by stamping and `inspect`,
rather than counted as several pages.

What an edit copies once per page is bounded as well. Pages may share one large
resource group, annotation list, inherited `/Resources` or catalog, and each
part of a `split`, each stamped or flattened page, carries its own copy of it.
One call copies at most 4 million values (array elements and dictionary
entries) and 256 MiB of strings, names and stream data, 1 GiB across the parts
of a `split`, and is refused past that. For a `split`, select the pages you need
instead. Writing the result costs time in proportion to what is written, and
one document written by an edit or a signature weighs at most 1 GiB.

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

`stampText` uses eight of the standard fonts — `Helvetica`, `Helvetica-Bold`,
`Helvetica-Oblique`, `Times-Roman`, `Times-Bold`, `Times-Italic`, `Courier`,
`Courier-Bold` — which a PDF may reference without embedding. Any other name,
`Times-BoldItalic` or `Symbol` included, is refused with
`E_VELLUM_STAMP_TEXT_FAILED`. Nothing is added to
the file and no font has to be supplied. The trade-off is the WinAnsi character
set: Western European text is covered, accents and typographic punctuation
included, and anything outside it is **refused rather than mangled** — silently
dropping a character from a contract is worse than failing.

### Supplying your own

Declare it in `config/vellum.ts` and ask for it by name:

```ts
export default defineConfig({
  fonts: { body: app.makePath('resources/fonts/Inter-Regular.ttf') },
})

await vellum.stampText(pdf, 'Uměl Řehoř', { font: 'body' })
```

That lifts the WinAnsi limit, at the cost of carrying the glyphs. The font is
**subsetted to the characters actually written** — embedding a family whole
would put megabytes into every stamped document — and a `/ToUnicode` table goes
in with it, without which the text would be drawn correctly and still be
impossible to select, copy or search.

A configured name is looked up **before** the standard fonts, so calling one
`Helvetica` shadows the standard one. A name that is not configured falls
through, which is what keeps `font: 'Times-Roman'` working with no
configuration at all. A character the supplied font has no glyph for is refused
by name.
