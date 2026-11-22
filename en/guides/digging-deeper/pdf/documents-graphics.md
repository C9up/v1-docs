# Images, graphics and tables

This guide covers images, vector graphics, SVG and tables:

- Images
- Vector graphics
- SVG
- Tables

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

## SVG

```ts
doc.svg(
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#004085"/></svg>',
  72,
  72,
  { width: 120 },
)
```

`svg(src, x?, y?, options?)` draws an SVG as vectors: its markup or a `data:`
URL as a string, a file as a `URL`, or its bytes, sized with `width`,
`height`, or `fit` placed by `align` and `valign`. Its text is drawn with the
fonts the document loaded. An SVG is often someone else's file: it reads no
file and no network, whatever it names, a nested SVG is not followed, and an
image inlined in it is bounded as a page image is. A string is never read as a
path, since markup often comes from a user: pass a file as
`new URL('file:///…')` or as its bytes.

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
