# Generating documents

This guide covers generating a document:

- The document and its pages
- Writing it out
- Errors
- Coming from pdfkit

`PdfDocument` writes a PDF from nothing: pages, text laid out in lines and
pages, fonts, images, vector graphics, tables, links and the outline, tagged
structure, PDF/A and PDF/UA, attached files, annotations, form fields,
encryption and SVG.

The layout runs in Rust behind N-API. Every measurement is synchronous: `text()`
lays its lines out at once and moves the cursor, so the next call knows where it
stands.

```ts
import { PdfDocument, toBytes } from '@c9up/vellum'

const doc = new PdfDocument({ size: 'A4' })
const bytes = toBytes(doc)
doc.font('Helvetica-Bold').fontSize(18).text('Devis 2026-041')
doc.font('Helvetica').fontSize(10).text('Lausanne, le 14 octobre 2026')
doc.end()

const pdf = await bytes // Uint8Array
```

Every example on this page is run by vellum's test suite
(`tests/unit/guide.test.ts`).

What one call may lay out is bounded, since text and drawings are often a
user's: one `text()`, `heightOfString` or `boundsOfString` call takes at most
1 MiB of text, a path at most 1 000 000 segments, a table cell spans at most
1000 rows and 64 columns of a table of at most 1000 columns, and an SVG that
uses filters is refused — a filter is drawn as pixels, at a cost its markup sets. A
transform whose product with the current one overflows is refused, and a shape
that would land past finite numbers is left out of the page.

[[toc]]

## The document and its pages

```ts
const doc = new PdfDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 72, right: 72 },
  bufferPages: true,
  info: { Title: 'Devis 2026-041', Author: 'Atelier Dubois Sàrl' },
})
const bytes = toBytes(doc)

doc.text('Première page')
doc.addPage({ size: 'A5', layout: 'landscape' })
doc.text("Deuxième page, en A5 à l'italienne")

// A footer on every page, once they all exist.
const { start, count } = doc.bufferedPageRange()
for (let page = start; page < start + count; page++) {
  doc.switchToPage(page)
  doc.page.margins.bottom = 0
  doc
    .fontSize(8)
    .text(`page ${page + 1} / ${count}`, 0, doc.page.height - 30, {
      width: doc.page.width,
      align: 'center',
    })
}
doc.end()
const pdf = await bytes
```

- **Sizes**: a name (`A0`…`A10`, `B0`…`B10`, `C0`…`C10`, `RA0`…`RA4`,
  `SRA0`…`SRA4`, `EXECUTIVE`, `FOLIO`, `LEGAL`, `LETTER`, `TABLOID`), or
  `[width, height]` in points. `layout: 'landscape'` turns it.
- **Margins**: `margin` for all four sides, or `margins` side by side.
  Lengths are points, or strings with a unit: `'2cm'`, `'1in'`, `'10mm'`.
  A string that is not a length is an error.
- **Pages**: `addPage(options)` opens a page; its options are merged with the
  document's. `autoFirstPage: false` starts with none. The `pageAdded` event
  fires for every page, the ones text breaks onto included, and may draw on it.
- **Going back**: with `bufferPages: true`, pages stay open until `end()`;
  `switchToPage(index)` (from zero) draws on an earlier one, which is how a
  "page X / Y" footer is written. `doc.page.margins` can be changed in place.
- **Metadata**: `info` takes `Title`, `Author`, `Subject`, `Keywords`,
  `Creator`, `Producer`, `CreationDate`, `ModDate`; `lang` and
  `displayTitle` describe the document to readers.
- **Version**: `pdfVersion` from `'1.4'` to `'2.0'`, `'1.7'` by default.

## Writing it out

```ts
const doc = new PdfDocument()
const file = createWriteStream(path)
doc.pipe(file)
doc.text('Devis 2026-041')
doc.end()
await finished(file)
```

`PdfDocument` is a readable stream: `pipe` it to a file or an HTTP response,
or collect it with `toBytes(doc)`, called before `end()`. The document is
written when `end()` is called.

## Errors

Every refusal is a class of the `errors` namespace of `@c9up/vellum`, with a
code: `E_VELLUM_INVALID_OPTIONS`,
`E_VELLUM_INVALID_FONT`, `E_VELLUM_INVALID_IMAGE`, `E_VELLUM_INVALID_SVG`,
`E_VELLUM_INVALID_LINK`, `E_VELLUM_INVALID_OUTLINE`,
`E_VELLUM_INVALID_STRUCTURE`, and `E_VELLUM_VALIDATION` when the document does
not meet its `subset`.

## Coming from pdfkit

The API has pdfkit's shape: porting a document is changing its import.
[Coming from pdfkit](/en/guides/digging-deeper/pdf/from-pdfkit) shows the change and lists where
vellum behaves differently.
