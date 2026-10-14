# Vellum — Coming from pdfkit

`PdfDocument` takes pdfkit 0.20's methods and options, and lays text out the
way pdfkit does, line for line. A document written for pdfkit runs on vellum
once its import changes:

```diff
- import PDFDocument from 'pdfkit'
+ import { PdfDocument as PDFDocument } from '@c9up/vellum'
```

vellum's tests hold three such documents — a quote, an invoice carrying a Swiss
QR-bill drawn by `@c9up/prism/swissqrbill/pdf`, and a three-page contract
(`examples/documents.ts`) — and render them with both libraries: the same
words on the same lines of the same pages, and under 1 % of the pixels apart.
What differs is the glyphs' drawing: pdfkit leaves Helvetica to the PDF reader,
vellum embeds Liberation Sans in its place, at Helvetica's widths and kerning.

The rest of this page lists every place where vellum behaves differently, each
with its reason.

## Not provided

| pdfkit | Why |
| --- | --- |
| `pattern()` | It takes a string of raw PDF operators, which would be written into the page unchecked |
| `Symbol` and `ZapfDingbats` | No free font carries their glyphs at their code points; a font that has the characters draws them |
| `pdfVersion: '1.3'`, `'1.7ext3'` | The engine writes 1.4 to 2.0; the default is 1.7 |
| RC4 and AES-128 encryption | Only AES-256 is offered (PDF 2.0): RC4 is broken, and PDF 2.0 deprecates both |
| Writing pages as they are made | The document is kept until `end()`, which writes it at once; `flushPages()` closes pages to `switchToPage` and frees nothing |
| A default export | vellum has named exports only: `import { PdfDocument } from '@c9up/vellum'` |

## Refused where pdfkit writes anything

| What | vellum | Why |
| --- | --- | --- |
| Link URLs | `http`, `https`, `mailto` and `tel` only | A `javascript:` or `file:` link runs code or reads the reader's disk |
| `addContent` | Path operators (`m l c v y h re`) only | Any other operator bypasses the checks on text, images and state |
| `annotate` | `Text`, `Highlight`, `Underline`, `StrikeOut`, `Square`, `Circle`, `FreeText` | pdfkit writes any key it is given, JavaScript actions included |
| Form `format` | Parameters checked, raw `AA` not taken | pdfkit writes the parameters into the field's script as given |
| A colour it cannot read | An error | pdfkit ignores it and keeps drawing in the previous colour |
| A length it cannot read (`'12 pt'`) | An error, and a sign is honoured | pdfkit reads it as 0 |
| `restore()` without `save()` | An error | pdfkit writes an unbalanced restore into the page |
| Images, fonts, SVG | Bounded before they are read; an SVG reads no file and no network | A file someone sent can claim gigabytes, or name a file on the server |
| Under PDF/A and PDF/UA | Annotations without an appearance and form fields refused; the document checked against its standard at `end()` | pdfkit declares the standard and checks nothing |

## Different output

| What | vellum | pdfkit |
| --- | --- | --- |
| Standard fonts | Embedded (Liberation Sans, Serif and Mono at the standard metrics) | Referenced, drawn by the reader |
| Text WinAnsi cannot encode, in a standard font | Drawn with the embedded font | Drawn as missing glyphs |
| `Ÿ` (`U+0178`) in a standard font | Measured as `Ÿ` | Measured as `ÿ` |
| Right-to-left text | Laid out right to left, mixed text in Unicode bidirectional order, read back in logical order | Drawn in the order given |
| Default `align` | Right for a right-to-left paragraph | Always left |
| A word wider than the line | Cut between graphemes | Cut between UTF-16 units, which can split a character |
| `boundsOfString` | Never adds a page; a justified paragraph measures what it fills | Can add pages while measuring |
| `quadraticCurveTo` | A quadratic curve | PDF's `v` operator, a cubic that bends differently |
| `image` with `cover` | What overflows the box is cut off | Drawn past the box |
| Graphics state over a page break | Colours, opacities and stroke style carry over | Each page restarts from the PDF defaults while pdfkit's state says otherwise |
| `addPage(options)` | Merged with the document's options | Replaces them: `addPage({ margin: 10 })` drops the size |
| Outline items | Open at `left`, `top` on their page | Open the whole page; `left` measured from the right edge |
| `addNamedDestination(name, 'XYZ', left, top, zoom)` | The zoom is not written: the reader keeps its own | Written |
| `lineAnnotation` | Its rectangle is the line's box | The end point taken as a width and a height |
| `file()` name | A path's base name | The path as given, the server's directories with it |
| `file()` options | Left as they are | Written into: the name and relationship are added |
| Table `borderColor: [255, 0, 0]` | One colour | Three sides |
| Table border colours per side | Kept | One rectangle in the top colour when the four widths agree |
| `rowStyles: 30` | Every row's height | Ignored |
| Form fields | Written with their appearance; `fillForm` draws the field's background and border under the value | `NeedAppearances`, left to the reader |
| Marked content | Does not nest; the last paragraph's structure ends with `text()` | Nests; the last paragraph's stays open |
| Content marked and never attached to a structure element | Drawn untagged | Written with an identifier the structure does not hold |
| Heading elements (`H1`…`H6`) from `structType` | Take their title from the text | No title |
