# Navigation, balisage et formulaires

Ce guide couvre la navigation, le balisage, les pièces jointes, les annotations, les formulaires et le chiffrement :

- Navigation
- Documents balisés, PDF/A et PDF/UA
- Fichiers joints
- Annotations
- Formulaires et chiffrement

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
  AES-256 (PDF 2.0) ; ce que `permissions` n'autorise pas est refusé. Avec un
  `ownerPassword` seul, tout le monde ouvre le document et les permissions
  tiennent ; avec un `userPassword` seul, il garde les deux.
