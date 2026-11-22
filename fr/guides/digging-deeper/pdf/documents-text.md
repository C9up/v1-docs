# Texte et polices

Ce guide couvre le texte et les polices d'un document généré :

- Texte
- Polices

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
| `link`, `goTo`, `destination` | Voir [Navigation](/fr/guides/digging-deeper/pdf/documents-structure#navigation) |
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
