# Vellum — Generating documents

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

## Text

```ts
doc.font('Helvetica-Bold').fontSize(16).text('Conditions générales')
doc.moveDown(0.5)
doc
  .font('Helvetica')
  .fontSize(10)
  .text(
    'Les devis sont valables trente jours. Passé ce délai, les prix peuvent être révisés.',
    {
      align: 'justify',
      columns: 2,
      columnGap: 18,
      paragraphGap: 6,
    },
  )
doc
  .text('Total : ', { continued: true })
  .font('Helvetica-Bold')
  .text('3 178,14 CHF')
doc
  .font('Helvetica')
  .list(['Paiement à 30 jours', ['Escompte de 2 %', "Retard : 5 % l'an"]], {
    listType: 'numbered',
  })

// Measured without drawing.
const width = doc.widthOfString('3 178,14 CHF')
const height = doc.heightOfString('Un paragraphe à mesurer', {
  width: 200,
})
```

`text(string, x?, y?, options?)` draws at the cursor, or at `x`, `y`, and moves
the cursor below what it drew. A paragraph wraps at the page's right margin, or
at `width`; it breaks onto a new page when it reaches the bottom margin, and
stops at `height` when one is given (with `ellipsis: true` or a string, its
last line ends in one).

| Option | What it does |
| --- | --- |
| `align` | `left`, `center`, `right`, `justify`. By default a right-to-left paragraph is aligned right |
| `width`, `height` | The box the text fills |
| `columns`, `columnGap` | Columns, filled one after the other |
| `indent`, `indentAllLines` | First-line indent, or every line's |
| `paragraphGap`, `lineGap` | Space after each paragraph, between lines |
| `characterSpacing`, `wordSpacing`, `horizontalScaling` | Spacing and width |
| `continued` | The next `text()` carries on the same line, in another font or colour |
| `lineBreak: false` | Draw as given, without wrapping |
| `baseline` | `alphabetic`, `top`, `middle`, `bottom`, `hanging`, `ideographic`, `mathematical`, `svg-middle`, `svg-central`, or a number |
| `underline`, `strike`, `oblique` | Decoration and slant |
| `fill`, `stroke` | Fill the glyphs, outline them, or both |
| `link`, `goTo`, `destination` | See [Navigation](#navigation) |
| `features` | OpenType features: `['liga', 'smcp']`… |
| `rotation` | Degrees, about the text's position |

Lines break at the places Unicode allows (UAX #14). A soft hyphen (`U+00AD`)
shows as a hyphen only where the line breaks; a word wider than the line is cut
between graphemes, never inside one. Arabic and Hebrew are laid out right to
left, mixed with left-to-right text in the order the Unicode bidirectional
algorithm gives, and read back from the PDF in logical order.

`list(items, options)` draws bullets, numbers (`numbered`) or letters
(`lettered`); a nested array is a sub-list. `moveDown(lines)` and
`moveUp(lines)` move the cursor by lines of the current font.

`widthOfString`, `heightOfString` and `boundsOfString` lay the text out
without drawing it, with the same options as `text()`.

## Fonts

```ts
doc.registerFont('Corps', fontPath)
doc
  .font('Corps')
  .fontSize(11)
  .text('Une police embarquée, réduite aux glyphes utilisés.')
doc.text('Office, ligatures comprises', { features: ['liga'] })
doc.font('Times-Italic').text('Une des douze polices standard.')
```

- **Your fonts**: TrueType, OpenType (CFF outlines included) and collections
  (`.ttc`, a face picked by its PostScript name: `font(path, 'Name-Bold')`).
  A path, a `Buffer` or a `Uint8Array`. Every font is embedded as a subset,
  with what a reader needs to copy and search the text.
- **The standard names**: `Helvetica`, `Times-Roman`, `Courier`, in regular,
  bold, italic or oblique, and bold italic. They are drawn with Liberation
  Sans, Serif and Mono, shipped with the package and embedded like any other
  font, at the standard fonts' widths, kerning and line height. Helvetica is
  the default.
- **Bounds**: a font file is checked by every parser that will read it before
  it is used, and refused (`E_VELLUM_INVALID_FONT`) if one of them would fail
  or if it is over 64 MiB.

## Images

```ts
doc.image(logo, 72, 40, { width: 120 })
doc.image(photo, 72, 120, {
  fit: [250, 150],
  align: 'center',
  valign: 'center',
})
doc.image(photo, 340, 120, { cover: [180, 150] })
const image = doc.openImage(photo)
doc.image(image, 72, 300, { scale: 2 })
```

JPEG (grey, RGB and CMYK), PNG (transparency, palettes, 16 bits, interlacing),
GIF and WebP, from a path, a `Buffer` or a `data:` URL.

- One pixel is one point by default; `width` or `height` alone keeps the
  proportions, both stretch; `scale` multiplies; `fit` fits inside a box and
  `cover` fills it, what overflows cut off, both placed by `align` and
  `valign`.
- A JPEG is turned by its EXIF orientation unless `ignoreOrientation`.
- `openImage` reads an image once to draw it several times.
- Without `x`, `y`, the image is drawn at the cursor, which moves below it.
- An image is a file someone sent: its header is read before anything is
  decoded, and one claiming more than 64 million pixels is refused.

## Vector graphics

```ts
doc.roundedRect(72, 72, 220, 80, 8).fill('#f4f6f8')
doc
  .moveTo(72, 170)
  .lineTo(523, 170)
  .lineWidth(0.5)
  .dash(3, { space: 2 })
  .stroke('#999999')
  .undash()
doc.circle(100, 220, 20).fillAndStroke('#cce5ff', '#004085')
const gradient = doc
  .linearGradient(72, 260, 292, 260)
  .stop(0, '#004085')
  .stop(1, '#cce5ff')
doc.rect(72, 250, 220, 20).fill(gradient)
doc.path('M 320 200 L 360 240 L 400 200 Z').fill('darkorange')
doc
  .save()
  .rotate(-10, { origin: [450, 300] })
  .fontSize(24)
  .fillColor('red', 0.4)
  .text('PAYÉ', 400, 290)
  .restore()
```

- **Paths**: `moveTo`, `lineTo`, `bezierCurveTo`, `quadraticCurveTo`,
  `closePath`, `rect`, `roundedRect`, `ellipse`, `circle`, `arc`, `polygon`,
  and `path(svgPathData)`. `addContent` takes path operators (`m l c v y h
  re`) and refuses any other.
- **Painting**: `fill`, `stroke`, `fillAndStroke`, `clip`, with the
  `nonzero` or `evenodd` rule (`non-zero`, `even-odd`).
- **Strokes**: `lineWidth`, `lineCap`, `lineJoin`, `miterLimit`, `dash`,
  `undash`.
- **Colours**: `#rgb`, `#rrggbb`, the 147 CSS colour names, `[r, g, b]`,
  `[c, m, y, k]`, spot colours declared with `addSpotColor(name, c, m, y, k)`,
  and linear and radial gradients. An unreadable colour is an error.
- **Opacity**: `opacity`, `fillOpacity`, `strokeOpacity`, or a second
  argument to `fillColor` and `strokeColor`.
- **Transformations**: `translate`, `rotate`, `scale` (both about an `origin`),
  `transform`, between `save()` and `restore()`. A `restore()` with no
  `save()` is an error.

## Tables

```ts
doc.fontSize(9).table({
  columnStyles: [80, '*', 70],
  rowStyles: (row) =>
    row === 0 ? { backgroundColor: '#eeeeee' } : undefined,
  headerRows: 1,
  data: [
    ['Poste', 'Description', { text: 'Montant', align: { x: 'right' } }],
    [
      'Peinture',
      'Murs et plafonds, deux couches',
      { text: '1 190,00', align: { x: 'right' } },
    ],
    [
      'Boiseries',
      'Laquage des portes',
      { text: '460,00', align: { x: 'right' } },
    ],
  ],
})

// Row by row, for rows that come from a query.
const table = doc.table({ columnStyles: ['*', 70], headerRows: 1 })
table.row(['Poste', 'Montant'])
for (const [label, amount] of [
  ['Fournitures', '640,00'],
  ['Nettoyage', '140,00'],
]) {
  table.row([label ?? '', amount ?? ''])
}
table.end()
```

- **Columns**: a width in points, `'*'` for a share of what is left, or a
  style (`{ width, minWidth, maxWidth, … }`); `columnStyles` as an array, a
  function of the index, or one style for all.
- **Rows**: `rowStyles` the same way (`{ height, minHeight, maxHeight, … }`);
  a number is every row's height.
- **Cells**: a string, or `{ text, colSpan, rowSpan, align, padding, border,
  borderColor, backgroundColor, font, textColor, textStroke,
  textStrokeColor, textOptions, type, scope }`; `defaultStyle` applies to
  every cell. Borders and their colours are per side.
- **Pages**: a table breaks across pages between rows; the first `headerRows`
  rows are drawn again at the top of each new page.
- With `data`, the whole table is drawn at once; without it, `table()` answers
  a `PdfTable` that takes rows with `row()` until `end()`.

## Navigation

```ts
doc.text('Voir les conditions en ligne', {
  link: 'https://example.ch/conditions',
  underline: true,
})
doc.text("Aller à l'annexe", { goTo: 'annexe' })
doc.outline.addItem('Devis')
doc.addPage()
doc.addNamedDestination('annexe')
doc.text('Annexe : plan du séjour')
doc.outline.addItem('Annexe', { pageNumber: 1 })
```

- **Links**: `link` on text or an image, or `link(x, y, width, height,
  target)` over a rectangle. A target is a page of the document (a number,
  from zero) or a URL; only `http`, `https`, `mailto` and `tel` URLs are
  written, so a `javascript:` or `file:` link is an error.
- **Destinations**: `addNamedDestination(name, fit?, …)` names a place, with
  a view (`XYZ`, `Fit`, `FitH`, `FitV`, `FitR`, `FitB`, `FitBH`, `FitBV`);
  `goTo` on text or `goTo(x, y, width, height, name)` leads to it, and
  `destination` on text names the place where the text is.
- **Outline**: `doc.outline.addItem(title, options)` answers the item, which
  takes children with its own `addItem`. `pageNumber` (from zero, the current
  page by default), `top` and `left` say where it opens, `expanded` unfolds it.

## Tagged, PDF/A and PDF/UA documents

```ts
const doc = new PdfDocument({
  subset: 'PDF/UA',
  tagged: true,
  lang: 'fr-CH',
  displayTitle: true,
  info: { Title: 'Facture 2026-117' },
})
const bytes = toBytes(doc)

const body = doc.struct('Document')
doc.addStructure(body)
doc.outline.addItem('Facture 2026-117')
doc
  .fontSize(18)
  .text('Facture 2026-117', { structParent: body, structType: 'H1' })
body.add(
  doc.struct('P', () => doc.fontSize(10).text('Merci de votre confiance.')),
)
body.add(
  doc.struct('Figure', { alt: "Logo de l'atelier" }, () =>
    doc.image(logo, { width: 80 }),
  ),
)
body.end()
doc.end()
```

- **Structure**: `struct(type, options?, children?)` makes an element of the
  logical structure (`Document`, `Sect`, `H1`…`H6`, `P`, `L`, `LI`, `Table`,
  `TR`, `TH`, `TD`, `Figure`, `Formula`, `Link`, `Span`…), with `alt`, `lang`,
  `title`, `expanded`, `actual`. A function as a child is content drawn
  inside the element. `addStructure` attaches an element to the document.
- **Text, lists and tables** take `structParent` (and `structType` for text):
  each paragraph, item or cell becomes an element of its own.
- **Marked content**: `markContent(tag)` and `endMarkedContent()` mark
  content by hand; `markContent('Artifact', { type: 'Pagination' })` marks
  what is not content, such as a page number. Marked sequences do not nest.
- **Standards**: `subset` is `'PDF/A-1b'`, `'PDF/A-2b'`, `'PDF/A-2u'`,
  `'PDF/A-3b'`, `'PDF/A-3u'`, the accessible `'PDF/A-1a'`, `'PDF/A-2a'`,
  `'PDF/A-3a'`, or `'PDF/UA'` (`'PDF/A-1'`, `'PDF/A-2'`, `'PDF/A-3'` are
  their `b` level). The document is checked against it as it is
  written, and `end()` fails with what is missing (PDF/UA, for one, wants an
  outline and a title for each heading). Documents written for PDF/A-1b,
  PDF/A-2a, PDF/A-2b, PDF/A-3b and PDF/UA are checked with veraPDF in
  vellum's CI.
- Under PDF/A and PDF/UA, annotations that cannot carry an appearance and
  form fields are refused when they are added.

## Attached files

```ts
const xml = Buffer.from('<?xml version="1.0"?><Invoice/>')
const doc = new PdfDocument({ subset: 'PDF/A-3b' })
const bytes = toBytes(doc)

doc.text('Facture 2026-117')
doc.file(xml, {
  name: 'factur-x.xml',
  type: 'text/xml',
  relationship: 'Alternative',
  description: 'Factur-X',
  modifiedDate: new Date(),
})
doc.end()
```

`file(src, options)` embeds a file in the document: a path, a `Buffer` or a
`data:` URL. Its name is a path's base name unless `name` is given; `type`,
`description`, `creationDate`, `modifiedDate`, `hidden` and, for PDF/A-3,
`relationship` (`Alternative`, `Data`, `Source`, `Supplement`,
`Unspecified`) describe it. A
PDF/A-3 document carrying its invoice data as XML is how Factur-X and ZUGFeRD
invoices are made. Files are bounded by `maxFileBytes` (64 MiB by default).

`fileAnnotation(x, y, width, height, { src, … })` attaches a file to a spot on
the page instead.

## Annotations

```ts
doc.text('Montant à confirmer', 72, 72)
doc.highlight(72, 72, 110, 12, { color: 'yellow' })
doc.note(190, 70, 14, 14, 'Vérifier avec le client', { color: 'orange' })
```

`note`, `highlight`, `underline`, `strike`, `lineAnnotation`,
`rectAnnotation`, `ellipseAnnotation`, `textAnnotation` and `fileAnnotation`.
`annotate(x, y, width, height, { Subtype, … })` takes `Text`, `Highlight`,
`Underline`, `StrikeOut`, `Square`, `Circle` and `FreeText`; an annotation
that runs an action is not among them.

## Forms and encryption

```ts
const doc = new PdfDocument({
  ownerPassword: 'propriétaire',
  permissions: { printing: 'highResolution', fillingForms: true },
})
const bytes = toBytes(doc)

doc.initForm()
doc.text('Nom', 72, 100)
doc.formText('nom', 140, 96, 200, 18)
doc.text('Montant', 72, 130)
doc.formText('montant', 140, 126, 100, 18, {
  format: { type: 'number', nDec: 2, sepComma: false },
})
doc.formCombo('pays', 140, 156, 120, 18, {
  select: ['CH', 'FR', 'DE'],
  value: 'CH',
})
doc.formCheckbox('accord', 140, 186, 12, 12)
doc.end()
```

- **Fields**: `initForm()`, then `formText`, `formPushButton`, `formCombo`,
  `formList`, `formRadioButton`, `formCheckbox`, or `formAnnotation(name,
  type, …)`. `formField(name)` makes a parent that groups fields under one
  name (`parent`). Options: `value`, `defaultValue`, `label`, `required`,
  `readOnly`, `noExport`, `multiline`, `password`, `align`, `fontSize`,
  `select`, `sort`, `multiSelect`, `edit`, `noSpell`, `backgroundColor`,
  `borderColor`, `format`, `onState`…
- **Appearance**: every field is written with its appearance, so it shows
  as created in any reader; a field filled later with `vellum.fillForm()` is
  drawn again with its value.
- **Formats**: `format` is a number, percentage, date, time, zip code, phone
  or social security number format, checked when the document is written. A
  field's actions (`AA`) are not taken.
- **Encryption**: `userPassword` (to open it), `ownerPassword` (to change
  what is allowed) and `permissions`. The document is encrypted with AES-256
  (PDF 2.0); what `permissions` does not allow is denied.

## SVG

```ts
doc.svg(
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#004085"/></svg>',
  72,
  72,
  { width: 120 },
)
```

`svg(src, x?, y?, options?)` draws an SVG as vectors: its markup, a path, a
`data:` URL or its bytes, sized with `width`, `height`, or `fit` placed by
`align` and `valign`. Its
text is drawn with the fonts the document loaded. An SVG is often someone
else's file: it reads no file and no network, whatever it names, a nested SVG
is not followed, and an image inlined in it is bounded as a page image is.

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

Every refusal is a `VellumError` with a code: `E_VELLUM_INVALID_OPTIONS`,
`E_VELLUM_INVALID_FONT`, `E_VELLUM_INVALID_IMAGE`, `E_VELLUM_INVALID_SVG`,
`E_VELLUM_INVALID_LINK`, `E_VELLUM_INVALID_OUTLINE`,
`E_VELLUM_INVALID_STRUCTURE`, and `E_VELLUM_VALIDATION` when the document does
not meet its `subset`.

## Coming from pdfkit

The API has pdfkit's shape: porting a document is changing its import.
[Coming from pdfkit](./vellum-from-pdfkit) shows the change and lists where
vellum behaves differently.
