# Text and fonts

This guide covers text and fonts in a generated document:

- Text
- Fonts

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
| `link`, `goTo`, `destination` | See [Navigation](/en/guides/digging-deeper/pdf/documents-structure#navigation) |
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
