# Images, graphiques et tableaux

Ce guide couvre les images, les graphiques vectoriels, le SVG et les tableaux :

- Images
- Graphismes vectoriels
- SVG
- Tableaux

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

## SVG

```ts
doc.svg(
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#004085"/></svg>',
  72,
  72,
  { width: 120 },
)
```

`svg(source, x?, y?, options?)` dessine un SVG en vectoriel : son balisage ou
une URL `data:` en chaîne, un fichier en `URL`, ou ses octets, dimensionné par
`width`, `height`, ou `fit` placé par `align` et `valign`. Son texte est dessiné
avec les polices chargées par le document. Un SVG est souvent le fichier de
quelqu'un d'autre : il ne lit aucun fichier ni le réseau, quoi qu'il nomme, un
SVG imbriqué n'est pas suivi, et une image incorporée est bornée comme une image
de page. Une chaîne n'est jamais lue comme un chemin, car le balisage vient
souvent d'un utilisateur : un fichier se passe en `new URL('file:///…')` ou en
octets.

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
