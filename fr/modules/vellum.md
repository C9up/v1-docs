# Vellum — PDF

Statut : **Présent (TS + Rust N-API)**.

- Paquet : `@c9up/vellum`
- Objectif : convertir les pages d'un PDF en images, lire ce que contient un
  document et le remanier — fusionner, découper, pivoter, tamponner.

Le travail se fait en Rust derrière N-API, parce que le PDF n'a pas
d'implémentation JavaScript satisfaisante. C'est une capacité qui manque à la
plateforme, pas l'optimisation d'une capacité existante.

## Exemples rapides

```ts
import vellum from '@c9up/vellum/services/main'

// Un aperçu de la première page, large de 1200px
const apercu = await vellum.render(pdf, { page: 1, width: 1200 })

// Toutes les pages en JPEG
const pages = await vellum.renderAll(pdf, { format: 'jpeg', quality: 82 })

// Ce que contient le document
const { pageCount, encrypted } = await vellum.inspect(pdf)
const { title, author, createdAt } = await vellum.metadata(pdf)
const texte = await vellum.extractText(pdf, { page: 1 })

// Le remanier
const dossier = await vellum.merge([contrat, annexe])
const extrait = await vellum.selectPages(pdf, [1, 3, 4])
const parts = await vellum.split(pdf)
const droit = await vellum.rotate(scan, 90, { pages: [1] })

// Le tamponner
const signe = await vellum.stamp(bonDeTravail, signature, {
  page: 1, x: 380, y: 690, width: 140,
})
const marque = await vellum.stampText(facture, 'PAYÉ', {
  x: 400, y: 80, size: 24, color: '#c00', opacity: 0.6,
})
```

Toutes les méthodes sont asynchrones. Rasteriser une page A4 représente environ
30 ms de calcul pur : le travail part sur le pool de threads libuv plutôt que de
bloquer le thread qui sert les requêtes.

**Les pages sont numérotées à partir de 1** — le numéro imprimé sur la page, pas
un index de tableau.

## Installation

```bash
ream configure @c9up/vellum
```

La commande enregistre le provider et écrit `config/vellum.ts` :

```ts
import { defineConfig } from '@c9up/vellum'
import env from '#start/env'

export default defineConfig({
  format: env.get('VELLUM_FORMAT', 'png'),
  scale: 1,
  quality: 82,
  background: '#ffffff',
})
```

Chaque option est une valeur par défaut que n'importe quel appel peut remplacer.

Le service est aussi une classe, utilisable sans hôte :

```ts
import { Vellum } from '@c9up/vellum'

const vellum = new Vellum({ format: 'jpeg', quality: 82 })
```

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

`stampText` utilise les 14 polices standard — `Helvetica`, `Helvetica-Bold`,
`Helvetica-Oblique`, `Times-Roman`, `Times-Bold`, `Times-Italic`, `Courier`,
`Courier-Bold` — qu'un PDF peut référencer sans les embarquer. Rien n'est ajouté
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


## Erreurs

Les échecs lèvent une `VellumError`, porteuse d'un `code` :

| Code | Levée quand |
| --- | --- |
| `E_VELLUM_NAPI_REQUIRED` | Le moteur natif n'est pas chargeable sur cette plateforme |
| `E_VELLUM_INVALID_PDF` | Les octets ne forment pas un PDF lisible |
| `E_VELLUM_INVALID_PAGE` | Un numéro de page inférieur à 1 |
| `E_VELLUM_INVALID_ROTATION` | Un angle qui n'est pas un multiple entier de 90 |
| `E_VELLUM_RENDER_FAILED` | La rasterisation a échoué |
| `E_VELLUM_EXTRACT_FAILED` | L'extraction de texte a échoué |
| `E_VELLUM_MERGE_FAILED` · `E_VELLUM_SELECT_FAILED` · `E_VELLUM_SPLIT_FAILED` · `E_VELLUM_ROTATE_FAILED` | L'opération a échoué |
| `E_VELLUM_STAMP_FAILED` · `E_VELLUM_STAMP_TEXT_FAILED` | Le tamponnage a échoué |

Le moteur n'est **pas optionnel** : il n'existe aucun repli JavaScript, donc un
binaire absent est un échec franc avec un message actionnable, plutôt qu'une
dégradation silencieuse qui ferait diverger deux déploiements du même code.

## Garde-fous

Toute entrée est traitée comme hostile, parce que ces documents viennent
d'envois utilisateurs :

- Le travail du moteur tourne derrière un filet anti-panique — une panique sur un
  thread de travail abattrait tout le processus.
- La taille rendue est bornée ; un `scale` non borné est un vecteur d'épuisement
  mémoire.
- Une couleur malformée est refusée plutôt que ramenée au blanc, ce qui donnerait
  un rendu faux que personne ne signale.
- Le texte écrit sur une page est échappé, pour qu'un titre de document ne puisse
  pas injecter d'opérateurs de flux de contenu.

## Formulaires interactifs

`formFields` liste les champs AcroForm d'un document dans l'ordre où le
formulaire les déclare ; `name` est le nom qualifié — les noms partiels de tous
les ancêtres joints par des points — et c'est ce nom qui sert à remplir le
champ.

```ts
const champs = await vellum.formFields(mandat)

const rempli = await vellum.fillForm(mandat, {
  'assure.nom': 'Amélie Durand',
  accepted: 'Yes',
  country: 'CH',
})

// Le fermer : les réponses deviennent de l'encre, les champs disparaissent
const ferme = await vellum.flattenForm(rempli)
```

Trois subtilités de §12.7.3 que la lecture résout pour l'appelant :

- Le type, les drapeaux et la valeur d'un champ sont **hérités** via
  `/Parent` : un champ n'en déclare souvent aucun lui-même.
- L'état « coché » d'une case ou d'un bouton radio est choisi par le
  **document** (`/Yes`, `/On`, `/1`…), pas fixé par la spécification. Ces états
  acceptés sont rapportés dans `options` ; écrire autre chose laisse le contrôle
  inchangé.
- Pour une liste, `options` rapporte les valeurs **d'export** et non les
  libellés, puisque c'est l'export qui est réécrit.

`fillForm` régénère le **flux d'apparence** de chaque champ rempli. C'est cette
moitié-là qui compte : la plupart des visionneuses peignent un champ d'après son
apparence et non d'après sa valeur, si bien qu'un document rempli sans elle
s'ouvre en paraissant vide tout en contenant toutes les réponses.

Les refus sont bruyants plutôt que silencieux, parce qu'un document rempli à qui
il manque discrètement une réponse est pire qu'un échec. Un nom de champ inconnu
(le message liste les noms existants), un champ en lecture seule, une valeur
au-delà de la longueur maximale déclarée, un choix que le formulaire n'offre pas
et un état de case que le document n'accepte pas sont autant d'erreurs.

### Comment le texte est mis en page

Une police standard est référencée sans être embarquée : c'est donc avec les
**largeurs publiées** que la visionneuse compose le texte. Le remplissage
mesure avec ces mêmes largeurs, ce qui lui permet de poser le texte là où la
visionneuse le posera :

- Le `/Q` du champ est respecté — à gauche, centré ou à droite.
- Un champ **multiligne** revient à la ligne à la largeur de sa boîte, en plus
  des sauts de ligne que vous écrivez vous-même.
- Un `/DA` qui demande la taille **0** — « ce qui rentre » — obtient une taille
  choisie en descendant jusqu'à ce que la réponse tienne. La spécification ne
  dit pas ce que « automatique » signifie : c'est donc une heuristique.
- Un mot trop long pour sa ligne est **coupé sur plusieurs lignes** plutôt que
  laissé à déborder, là où la boîte englobante de l'apparence l'effacerait.

Les largeurs sont générées depuis les métriques URW base-35 et recoupées avec
les valeurs Adobe publiées dans les tests : une table qui aurait dérivé
n'atteindrait pas une version publiée.

## Aplatissement

Un formulaire rempli reste un formulaire : qui l'ouvre peut revenir sur les
réponses. `flattenForm` le ferme. L'apparence de chaque widget devient du
contenu de page ordinaire, les annotations de widget sont retirées et le
formulaire lui-même disparaît. Ce qui revient a la même allure et n'est plus
interactif.

L'endroit où atterrit chaque apparence suit le §12.5.5 : sa `/BBox` est
transformée par sa `/Matrix`, et la boîte qui en résulte est projetée sur le
`/Rect` de l'annotation. Peindre au coin du rectangle déplacerait toute
apparence dont la matrice de forme n'est pas l'identité — c'est-à-dire la
plupart de celles qu'embarque un vrai formulaire. Le contenu propre de la page
est d'abord encadré par `q`/`Q`, car un `cm` hors de toute paire est légal et
jamais restauré : sans cela, le contenu ajouté hériterait d'une transformation
qu'il n'a pas demandée.

Trois choses qu'il ne fait délibérément pas :

- Les annotations qui ne sont **pas des widgets de formulaire** — liens, notes
  — restent où elles sont. L'aplatissement retire le formulaire, pas le reste
  du mobilier du document.
- Un widget **masqué** est retiré sans être peint. Rendre visible ce qu'un
  document cachait n'est pas de la préservation.
- Un champ qui porte une valeur mais **aucune apparence à peindre** est une
  erreur, pas un effacement silencieux : la réponse disparaîtrait d'un document
  qui aurait toujours l'air complet.

## Pas encore

L'embarquement de polices personnalisées et la signature PAdES.
