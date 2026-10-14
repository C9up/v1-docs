# Vellum — Générer des documents

`PdfDocument` écrit un PDF à partir de rien : pages, texte mis en lignes et en
pages, polices, images, graphismes vectoriels, tableaux, liens et sommaire,
structure balisée, PDF/A et PDF/UA, fichiers joints, annotations, champs de
formulaire, chiffrement et SVG.

La mise en page se fait en Rust derrière N-API. Chaque mesure est synchrone :
`text()` met ses lignes en page tout de suite et déplace le curseur, si bien que
l'appel suivant sait où il en est.

```ts
import { PdfDocument, toBytes } from '@c9up/vellum'

const doc = new PdfDocument({ size: 'A4' })
const bytes = toBytes(doc)
doc.font('Helvetica-Bold').fontSize(18).text('Devis 2026-041')
doc.font('Helvetica').fontSize(10).text('Lausanne, le 14 octobre 2026')
doc.end()

const pdf = await bytes // Uint8Array
```

Chaque exemple de cette page est exécuté par les tests de vellum
(`tests/unit/guide.test.ts`).

[[toc]]

## Le document et ses pages

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

// Un pied sur chaque page, une fois qu'elles existent toutes.
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

- **Formats** : un nom (`A0`…`A10`, `B0`…`B10`, `C0`…`C10`, `RA0`…`RA4`,
  `SRA0`…`SRA4`, `EXECUTIVE`, `FOLIO`, `LEGAL`, `LETTER`, `TABLOID`), ou
  `[largeur, hauteur]` en points. `layout: 'landscape'` le met à l'italienne.
- **Marges** : `margin` pour les quatre côtés, ou `margins` côté par côté.
  Les longueurs sont en points, ou des chaînes avec une unité : `'2cm'`,
  `'1in'`, `'10mm'`. Une chaîne qui n'est pas une longueur est une erreur.
- **Pages** : `addPage(options)` ouvre une page ; ses options sont fusionnées
  avec celles du document. `autoFirstPage: false` commence sans page.
  L'événement `pageAdded` est émis pour chaque page, y compris celles où le
  texte se poursuit, et peut y dessiner.
- **Revenir en arrière** : avec `bufferPages: true`, les pages restent ouvertes
  jusqu'à `end()` ; `switchToPage(index)` (à partir de zéro) dessine sur une
  page précédente, ce qui permet d'écrire un pied « page X / Y ».
  `doc.page.margins` se modifie sur place.
- **Métadonnées** : `info` prend `Title`, `Author`, `Subject`, `Keywords`,
  `Creator`, `Producer`, `CreationDate`, `ModDate` ; `lang` et
  `displayTitle` décrivent le document aux lecteurs.
- **Version** : `pdfVersion` de `'1.4'` à `'2.0'`, `'1.7'` par défaut.

## Texte

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

// Mesuré sans rien dessiner.
const width = doc.widthOfString('3 178,14 CHF')
const height = doc.heightOfString('Un paragraphe à mesurer', {
  width: 200,
})
```

`text(chaîne, x?, y?, options?)` dessine au curseur, ou en `x`, `y`, et place le
curseur sous ce qu'il a dessiné. Un paragraphe revient à la ligne à la marge
droite de la page, ou à `width` ; il passe à une nouvelle page quand il atteint
la marge du bas, et s'arrête à `height` quand elle est donnée (avec
`ellipsis: true` ou une chaîne, sa dernière ligne se termine par des points de
suspension).

| Option | Effet |
| --- | --- |
| `align` | `left`, `center`, `right`, `justify`. Par défaut, un paragraphe écrit de droite à gauche est aligné à droite |
| `width`, `height` | La boîte que remplit le texte |
| `columns`, `columnGap` | Des colonnes, remplies l'une après l'autre |
| `indent`, `indentAllLines` | Retrait de la première ligne, ou de toutes |
| `paragraphGap`, `lineGap` | Espace après chaque paragraphe, entre les lignes |
| `characterSpacing`, `wordSpacing`, `horizontalScaling` | Espacement et chasse |
| `continued` | Le `text()` suivant continue sur la même ligne, dans une autre police ou couleur |
| `lineBreak: false` | Dessine tel quel, sans revenir à la ligne |
| `baseline` | `alphabetic`, `top`, `middle`, `bottom`, `hanging`, `ideographic`, `mathematical`, `svg-middle`, `svg-central`, ou un nombre |
| `underline`, `strike`, `oblique` | Soulignement, barré et inclinaison |
| `fill`, `stroke` | Remplit les glyphes, les contourne, ou les deux |
| `link`, `goTo`, `destination` | Voir [Navigation](#navigation) |
| `features` | Fonctionnalités OpenType : `['liga', 'smcp']`… |
| `rotation` | En degrés, autour de la position du texte |

Les lignes se coupent là où Unicode le permet (UAX #14). Un trait d'union
conditionnel (`U+00AD`) n'apparaît que là où la ligne se coupe ; un mot plus
large que la ligne est coupé entre deux graphèmes, jamais à l'intérieur d'un
seul. L'arabe et l'hébreu s'écrivent de droite à gauche, mêlés au texte de
gauche à droite dans l'ordre que donne l'algorithme bidirectionnel d'Unicode,
et se relisent du PDF dans l'ordre logique.

`list(éléments, options)` dessine des puces, des numéros (`numbered`) ou des
lettres (`lettered`) ; un tableau imbriqué est une sous-liste. `moveDown(lignes)`
et `moveUp(lignes)` déplacent le curseur d'autant de lignes de la police
courante.

`widthOfString`, `heightOfString` et `boundsOfString` mettent le texte en page
sans le dessiner, avec les mêmes options que `text()`.

## Polices

```ts
doc.registerFont('Corps', fontPath)
doc
  .font('Corps')
  .fontSize(11)
  .text('Une police embarquée, réduite aux glyphes utilisés.')
doc.text('Office, ligatures comprises', { features: ['liga'] })
doc.font('Times-Italic').text('Une des douze polices standard.')
```

- **Vos polices** : TrueType, OpenType (contours CFF compris) et collections
  (`.ttc`, une face choisie par son nom PostScript : `font(chemin,
  'Nom-Bold')`). Un chemin, un `Buffer` ou un `Uint8Array`. Chaque police est
  embarquée en sous-ensemble, avec ce qu'il faut au lecteur pour copier et
  rechercher le texte.
- **Les noms standard** : `Helvetica`, `Times-Roman`, `Courier`, en romain,
  gras, italique ou oblique, et gras italique. Ils sont dessinés avec
  Liberation Sans, Serif et Mono, livrées avec le paquet et embarquées comme
  toute autre police, aux chasses, au crénage et à l'interligne des polices
  standard. Helvetica est la police par défaut.
- **Bornes** : un fichier de police est vérifié par chaque analyseur qui le
  lira avant d'être utilisé, et refusé (`E_VELLUM_INVALID_FONT`) si l'un d'eux
  échouerait ou s'il dépasse 64 Mio.

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

JPEG (gris, RVB et CMJN), PNG (transparence, palettes, 16 bits, entrelacement),
GIF et WebP, depuis un chemin, un `Buffer` ou une URL `data:`.

- Un pixel vaut un point par défaut ; `width` ou `height` seul garde les
  proportions, les deux étirent ; `scale` multiplie ; `fit` loge l'image dans
  une boîte et `cover` la remplit en coupant ce qui dépasse, l'une et l'autre
  placées par `align` et `valign`.
- Un JPEG est tourné selon son orientation EXIF, sauf avec
  `ignoreOrientation`.
- `openImage` lit une image une fois pour la dessiner plusieurs fois.
- Sans `x`, `y`, l'image est dessinée au curseur, qui passe sous elle.
- Une image est un fichier envoyé par quelqu'un : son en-tête est lu avant
  tout décodage, et une image annonçant plus de 64 millions de pixels est
  refusée.

## Graphismes vectoriels

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

- **Tracés** : `moveTo`, `lineTo`, `bezierCurveTo`, `quadraticCurveTo`,
  `closePath`, `rect`, `roundedRect`, `ellipse`, `circle`, `arc`, `polygon`,
  et `path(donnéesDeTracéSvg)`. `addContent` prend les opérateurs de tracé
  (`m l c v y h re`) et refuse tout autre.
- **Peinture** : `fill`, `stroke`, `fillAndStroke`, `clip`, avec la règle
  `nonzero` ou `evenodd` (`non-zero`, `even-odd`).
- **Traits** : `lineWidth`, `lineCap`, `lineJoin`, `miterLimit`, `dash`,
  `undash`.
- **Couleurs** : `#rgb`, `#rrggbb`, les 147 noms de couleurs CSS,
  `[r, g, b]`, `[c, m, j, n]`, les tons directs déclarés par
  `addSpotColor(nom, c, m, j, n)`, et les dégradés linéaires et radiaux. Une
  couleur illisible est une erreur.
- **Opacité** : `opacity`, `fillOpacity`, `strokeOpacity`, ou un second
  argument à `fillColor` et `strokeColor`.
- **Transformations** : `translate`, `rotate`, `scale` (autour d'un `origin`),
  `transform`, entre `save()` et `restore()`. Un `restore()` sans `save()` est
  une erreur.

## Tableaux

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

// Ligne par ligne, pour des lignes qui viennent d'une requête.
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

- **Colonnes** : une largeur en points, `'*'` pour une part de ce qui reste, ou
  un style (`{ width, minWidth, maxWidth, … }`) ; `columnStyles` en tableau,
  en fonction de l'index, ou un seul style pour toutes.
- **Lignes** : `rowStyles` de la même façon (`{ height, minHeight, maxHeight,
  … }`) ; un nombre est la hauteur de chaque ligne.
- **Cellules** : une chaîne, ou `{ text, colSpan, rowSpan, align, padding,
  border, borderColor, backgroundColor, font, textColor, textStroke,
  textStrokeColor, textOptions, type, scope }` ; `defaultStyle` s'applique à
  toutes les cellules. Les bordures et leurs couleurs se règlent côté par côté.
- **Pages** : un tableau passe d'une page à l'autre entre deux lignes ; les
  `headerRows` premières lignes sont redessinées en haut de chaque nouvelle
  page.
- Avec `data`, tout le tableau est dessiné d'un coup ; sans, `table()` rend un
  `PdfTable` qui prend les lignes par `row()` jusqu'à `end()`.

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

- **Liens** : `link` sur un texte ou une image, ou `link(x, y, largeur,
  hauteur, cible)` sur un rectangle. Une cible est une page du document (un
  nombre, à partir de zéro) ou une URL ; seules les URL `http`, `https`,
  `mailto` et `tel` sont écrites, un lien `javascript:` ou `file:` est donc une
  erreur.
- **Destinations** : `addNamedDestination(nom, vue?, …)` nomme un endroit,
  avec une vue (`XYZ`, `Fit`, `FitH`, `FitV`, `FitR`, `FitB`, `FitBH`,
  `FitBV`) ; `goTo` sur un texte ou `goTo(x, y, largeur, hauteur, nom)` y
  mène, et `destination` sur un texte nomme l'endroit où il se trouve.
- **Sommaire** : `doc.outline.addItem(titre, options)` rend l'entrée, qui
  prend des enfants par son propre `addItem`. `pageNumber` (à partir de zéro,
  la page courante par défaut), `top` et `left` disent où elle ouvre,
  `expanded` la déplie.

## Documents balisés, PDF/A et PDF/UA

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

- **Structure** : `struct(type, options?, enfants?)` crée un élément de la
  structure logique (`Document`, `Sect`, `H1`…`H6`, `P`, `L`, `LI`, `Table`,
  `TR`, `TH`, `TD`, `Figure`, `Formula`, `Link`, `Span`…), avec `alt`,
  `lang`, `title`, `expanded`, `actual`. Une fonction donnée comme enfant est
  un contenu dessiné dans l'élément. `addStructure` rattache un élément au
  document.
- **Texte, listes et tableaux** prennent `structParent` (et `structType` pour
  le texte) : chaque paragraphe, élément ou cellule devient un élément à part
  entière.
- **Contenu marqué** : `markContent(étiquette)` et `endMarkedContent()`
  marquent du contenu à la main ; `markContent('Artifact', { type:
  'Pagination' })` marque ce qui n'est pas du contenu, comme un numéro de
  page. Les séquences marquées ne s'imbriquent pas.
- **Normes** : `subset` vaut `'PDF/A-1b'`, `'PDF/A-2b'`, `'PDF/A-2u'`,
  `'PDF/A-3b'`, `'PDF/A-3u'`, les niveaux accessibles `'PDF/A-1a'`,
  `'PDF/A-2a'`, `'PDF/A-3a'`, ou `'PDF/UA'` (`'PDF/A-1'`, `'PDF/A-2'`,
  `'PDF/A-3'` désignent leur niveau `b`). Le document est vérifié à l'écriture,
  et `end()` échoue en disant ce qui manque (PDF/UA, par exemple, demande un
  sommaire et un titre pour chaque intitulé). Des documents écrits pour
  PDF/A-1b, PDF/A-2a, PDF/A-2b, PDF/A-3b et PDF/UA sont contrôlés par veraPDF
  dans la CI de vellum.
- Sous PDF/A et PDF/UA, les annotations qui ne peuvent pas porter d'apparence
  et les champs de formulaire sont refusés dès leur ajout.

## Fichiers joints

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

`file(source, options)` incorpore un fichier au document : un chemin, un
`Buffer` ou une URL `data:`. Son nom est le nom de base du chemin, sauf si
`name` est donné ; `type`, `description`, `creationDate`, `modifiedDate`,
`hidden` et, pour PDF/A-3, `relationship` (`Alternative`, `Data`, `Source`,
`Supplement`, `Unspecified`) le décrivent. Un document PDF/A-3 portant les
données de sa facture en XML, c'est ainsi que se font les factures Factur-X et
ZUGFeRD. Les fichiers sont bornés par `maxFileBytes` (64 Mio par défaut).

`fileAnnotation(x, y, largeur, hauteur, { src, … })` joint plutôt un fichier à
un endroit de la page.

## Annotations

```ts
doc.text('Montant à confirmer', 72, 72)
doc.highlight(72, 72, 110, 12, { color: 'yellow' })
doc.note(190, 70, 14, 14, 'Vérifier avec le client', { color: 'orange' })
```

`note`, `highlight`, `underline`, `strike`, `lineAnnotation`,
`rectAnnotation`, `ellipseAnnotation`, `textAnnotation` et `fileAnnotation`.
`annotate(x, y, largeur, hauteur, { Subtype, … })` prend `Text`, `Highlight`,
`Underline`, `StrikeOut`, `Square`, `Circle` et `FreeText` ; une annotation
qui déclenche une action n'en fait pas partie.

## Formulaires et chiffrement

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

- **Champs** : `initForm()`, puis `formText`, `formPushButton`, `formCombo`,
  `formList`, `formRadioButton`, `formCheckbox`, ou `formAnnotation(nom,
  type, …)`. `formField(nom)` crée un parent qui regroupe des champs sous un
  même nom (`parent`). Options : `value`, `defaultValue`, `label`,
  `required`, `readOnly`, `noExport`, `multiline`, `password`, `align`,
  `fontSize`, `select`, `sort`, `multiSelect`, `edit`, `noSpell`,
  `backgroundColor`, `borderColor`, `format`, `onState`…
- **Apparence** : chaque champ est écrit avec son apparence, si bien qu'il
  s'affiche tel que créé dans n'importe quel lecteur ; un champ rempli plus
  tard par `vellum.fillForm()` est redessiné avec sa valeur.
- **Formats** : `format` est un format de nombre, de pourcentage, de date,
  d'heure, de code postal, de téléphone ou de numéro de sécurité sociale,
  vérifié à l'écriture du document. Les actions d'un champ (`AA`) ne sont pas
  acceptées.
- **Chiffrement** : `userPassword` (pour l'ouvrir), `ownerPassword` (pour
  changer ce qui est permis) et `permissions`. Le document est chiffré en
  AES-256 (PDF 2.0) ; ce que `permissions` n'autorise pas est refusé.

## SVG

```ts
doc.svg(
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#004085"/></svg>',
  72,
  72,
  { width: 120 },
)
```

`svg(source, x?, y?, options?)` dessine un SVG en vectoriel : son balisage, un
chemin, une URL `data:` ou ses octets, dimensionné par `width`, `height`, ou
`fit` placé par `align` et `valign`. Son texte est dessiné avec les polices
chargées par le document. Un SVG est souvent le fichier de quelqu'un d'autre :
il ne lit aucun fichier ni le réseau, quoi qu'il nomme, un SVG imbriqué n'est
pas suivi, et une image incorporée est bornée comme une image de page.

## L'écrire

```ts
const doc = new PdfDocument()
const file = createWriteStream(path)
doc.pipe(file)
doc.text('Devis 2026-041')
doc.end()
await finished(file)
```

`PdfDocument` est un flux lisible : `pipe` vers un fichier ou une réponse HTTP,
ou recueilli par `toBytes(doc)`, appelé avant `end()`. Le document est écrit à
l'appel de `end()`.

## Erreurs

Chaque refus est une `VellumError` avec un code : `E_VELLUM_INVALID_OPTIONS`,
`E_VELLUM_INVALID_FONT`, `E_VELLUM_INVALID_IMAGE`, `E_VELLUM_INVALID_SVG`,
`E_VELLUM_INVALID_LINK`, `E_VELLUM_INVALID_OUTLINE`,
`E_VELLUM_INVALID_STRUCTURE`, et `E_VELLUM_VALIDATION` quand le document ne
satisfait pas son `subset`.

## Venir de pdfkit

L'API a la forme de celle de pdfkit : porter un document, c'est changer son
import. [Venir de pdfkit](./vellum-from-pdfkit) montre ce changement et liste
où vellum se comporte autrement.
