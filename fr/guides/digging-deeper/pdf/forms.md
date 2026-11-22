# Formulaires

Ce guide couvre les formulaires interactifs et leur aplatissement :

- Formulaires interactifs
- Aplatissement

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
au-delà de la longueur maximale déclarée — ou de 64 Kio quand le formulaire n'en
déclare aucune —, un choix que le formulaire n'offre pas et un état de case que
le document n'accepte pas sont autant d'erreurs.

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
