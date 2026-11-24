# Lire et modifier

Ce guide couvre le rendu, la lecture, le remaniement et le tamponnage d'un PDF :

- Rendu
- Lecture
- Remaniement
- Tamponnage

## Rendu

| Option | Signification |
| --- | --- |
| `page` | La page à rendre, à partir de 1. `render` seulement. |
| `scale` | Multiplicateur de la taille naturelle ; 1 vaut 72 DPI. |
| `width` | Largeur cible en pixels. Prime sur `scale`. |
| `format` | `"png"` (défaut) ou `"jpeg"`. |
| `quality` | Qualité JPEG 1-100. Refusée sans `format: 'jpeg'`. |
| `background` | `#rgb`, `#rrggbb`, `#rrggbbaa` ou `"transparent"`. Blanc opaque par défaut. |

Un PDF ne peint pas son propre fond : le défaut est donc le blanc opaque, sinon
un texte noir devient invisible dans une visionneuse sombre.

`quality` sans `format: 'jpeg'` est refusée plutôt qu'ignorée — qui passe une
qualité veut une image compressée, et lui rendre un PNG de plusieurs mégaoctets
est une surprise qu'on ne découvre que quand les aperçus rament.

```ts
const tailles = await vellum.dimensions(pdf) // taille naturelle, en points
```

## Lecture

`inspect` donne le nombre de pages, la version du format et si le document est
chiffré. `metadata` lit le dictionnaire `/Info` — titre, auteur, sujet,
mots-clés, applications impliquées et dates. Tous les champs sont facultatifs :
un PDF reste valide sans aucun `/Info`.

Les dates reviennent en ISO 8601 quand le producteur en a écrit une conforme, et
telles quelles sinon — ne rien renvoyer perdrait de l'information.

`extractText` rend le texte d'une page, `extractTextAll` une entrée par page. Les
glyphes reviennent dans l'ordre où la page les dessine, avec un saut de ligne au
changement de ligne de base. Cet ordre est celui de la lecture en pratique ;
aucun réordonnancement par coordonnées n'est tenté, parce que bien le faire exige
une détection de colonnes et que mal le faire dégrade les pages multi-colonnes.
Aucun espace n'est inventé non plus — un PDF encode les siens.

Un document scanné sans couche de texte rend une chaîne vide plutôt qu'une
erreur : il n'a pas de texte à donner.

## Remaniement

`merge`, `selectPages`, `split` et `rotate` déplacent tous des pages d'un arbre
de pages à un autre, et c'est là que le PDF cache un piège : `Resources`,
`MediaBox`, `CropBox` et `Rotate` peuvent vivre sur un nœud parent et être
*hérités* par la page. Re-parenter naïvement une telle page lui fait perdre sa
taille — les visionneuses retombent alors sur le format Letter, redimensionnant
en silence un document A4. Chaque opération matérialise d'abord les attributs
hérités sur la page.

La rotation s'ajoute à ce que la page porte déjà, parce qu'un scan peut arriver
déjà tourné. L'angle doit être un multiple de 90.

Chaque opération coûte ce que pèse le document, une fois, quel que soit son
nombre de pages : `selectPages` et chaque partie de `split` ne copient que ce
que leurs pages atteignent — la page, ses ressources et ses annotations, et le
plan, le formulaire et les noms du catalogue, privés de toute référence à une
autre page. Un arbre de pages qui liste deux fois le même objet page est refusé,
par ces opérations comme par le tamponnage et `inspect`, plutôt que compté comme
plusieurs pages.

Ce qu'une édition copie une fois par page est borné aussi. Des pages peuvent
partager un gros groupe de ressources, une liste d'annotations, des `/Resources`
héritées ou un catalogue, et chaque partie d'un `split`, chaque page tamponnée
ou aplatie, en emporte sa propre copie. Un appel copie au plus 4 millions de
valeurs (éléments de tableau et entrées de dictionnaire) et 256 Mio de chaînes,
de noms et de données de flux, 1 Gio sur les parties d'un `split`, et il est
refusé au-delà. Pour un `split`, sélectionner plutôt les pages utiles. Écrire
le résultat prend un temps proportionnel à ce qui est écrit, et un document
écrit par une modification ou une signature pèse au plus 1 Gio.

## Tamponnage

`stamp` dessine une image, `stampText` écrit une ligne de texte.

```ts
await vellum.stamp(pdf, signature, { page: 1, x: 380, y: 690, width: 140 })
await vellum.stampText(pdf, 'BROUILLON', { size: 48, opacity: 0.15 })
```

Les coordonnées partent du coin **haut-gauche**, comme une mise en page à
l'écran. Pour `stampText`, `y` est la ligne de base du texte. Ne nommer aucune
page tamponne toutes les pages, ce que veut un filigrane.

Les images sont en PNG ou JPEG, reconnues par leur signature et non par leur nom.
Ne donner que `width` conserve les proportions.

Les deux écrivent dans le document existant plutôt que de le réauthorer, et
c'est ce qui permet au document de survivre au tampon : son **formulaire
interactif, ses annotations et ses liens sont toujours là** ensuite. Une
signature s'appose justement sur le genre de document qui a les trois.

Un JPEG entre tel quel : une photographie garde la taille à laquelle elle est
arrivée — un rapport photo ne devient pas impossible à envoyer par courriel. Le
canal alpha d'un PNG devient un masque doux, ce qui rend une signature tracée
sur tablette transparente hors du trait. Un JPEG CMJN est refusé plutôt
qu'inversé en silence.

`stampText` utilise huit des polices standard — `Helvetica`, `Helvetica-Bold`,
`Helvetica-Oblique`, `Times-Roman`, `Times-Bold`, `Times-Italic`, `Courier`,
`Courier-Bold` — qu'un PDF peut référencer sans les embarquer. Tout autre nom,
`Times-BoldItalic` ou `Symbol` compris, est refusé avec
`E_VELLUM_STAMP_TEXT_FAILED`. Rien n'est ajouté
au fichier et aucune police n'est à fournir. La contrepartie est le jeu de
caractères WinAnsi : le texte d'Europe occidentale est couvert, accents et
ponctuation typographique compris, et tout ce qui en sort est **refusé plutôt que
déformé** — perdre un caractère dans un contrat est pire qu'échouer.

### Fournir la sienne

Déclarez-la dans `config/vellum.ts` et demandez-la par son nom :

```ts
export default defineConfig({
  fonts: { body: app.makePath('resources/fonts/Inter-Regular.ttf') },
})

await vellum.stampText(pdf, 'Uměl Řehoř', { font: 'body' })
```

Cela lève la limite WinAnsi, au prix du transport des glyphes. La police est
**réduite aux caractères réellement écrits** — embarquer une famille entière
mettrait des mégaoctets dans chaque document tamponné — et une table
`/ToUnicode` l'accompagne, sans laquelle le texte serait correctement dessiné
et pourtant impossible à sélectionner, copier ou chercher.

Un nom configuré est cherché **avant** les polices standard : en appeler un
`Helvetica` masque donc la standard. Un nom non configuré passe outre, ce qui
permet à `font: 'Times-Roman'` de fonctionner sans aucune configuration. Un
caractère dont la police fournie n'a pas le glyphe est refusé, nommément.
