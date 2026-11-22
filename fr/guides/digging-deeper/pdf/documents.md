# Générer des documents

Ce guide couvre la génération d'un document :

- Le document et ses pages
- L'écrire
- Erreurs
- Venir de pdfkit

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

Ce qu'un appel peut mettre en page est borné, puisque textes et dessins viennent
souvent d'un utilisateur : un appel à `text()`, `heightOfString` ou
`boundsOfString` prend au plus 1 Mio de texte, un tracé au plus 1 000 000 de
segments, une cellule de tableau s'étend sur au plus 1000 lignes et 64 colonnes
d'un tableau d'au plus 1000 colonnes, et un SVG qui utilise des filtres est
refusé — un filtre se dessine en pixels, pour un coût que fixe son balisage. Une
transformation dont le produit avec la courante déborde est refusée, et une
forme qui tomberait au-delà des nombres finis est laissée hors de la page.

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
import. [Venir de pdfkit](/fr/guides/digging-deeper/pdf/from-pdfkit) montre ce changement et liste
où vellum se comporte autrement.
