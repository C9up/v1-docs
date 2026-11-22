# Navigation, tagging and forms

This guide covers navigation, tagged documents, attachments, annotations, forms and encryption:

- Navigation
- Tagged, PDF/A and PDF/UA documents
- Attached files
- Annotations
- Forms and encryption

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
  (PDF 2.0); what `permissions` does not allow is denied. With only an
  `ownerPassword`, anyone opens the document and the permissions hold; with
  only a `userPassword`, it guards both.
