# Styles et écrans

Ce guide couvre les styles, les écrans, les listes et les images :

- Styles
- Écrans
- Longues listes
- Images et dessins vectoriels

## Styles

Les classes de l'app sont ses classes Tailwind, stylées par son propre build
Tailwind. `ream android:*` lance Tailwind sur l'app (son `mobile.css`) et
compile la sortie en table de styles : chaque règle avec ses valeurs résolues
d'après le thème — longueurs en px, couleurs claires et sombres — et seul ce
que les classes composent à l'exécution reste ouvert (`--tw-shadow`,
`--tw-leading`…). La table voyage dans le bundle JS.

Orbit l'applique comme un navigateur applique la feuille : règles retenues
par classe, en cascade par spécificité puis par ordre, règles d'élément de la
couche de base comprises (le `* { border-color }` d'un jeu de composants,
`body { background; color }` sur la racine), propriétés personnalisées
résolues. Les variantes sont des conditions sur l'arbre d'orbit, suivies quand
elles changent :

- un attribut de l'élément : `data-[state=open]:`, `aria-invalid:`,
  `disabled:` (le `?disabled` d'aurora), `[class*=…]` ;
- `dark:` et les valeurs sombres du thème, avec `colorScheme('dark')` ;
- un ancêtre (`group-data-[…]:`), un frère précédent (`peer-checked:`), les
  enfants et descendants de l'élément (`*:`, `space-y-*`, `[&_svg]:size-4`) ;
- la largeur de l'écran (`sm:`, `md:`).

```ts
import { colorScheme, unknownClasses } from '@c9up/orbit'

colorScheme('dark')          // variantes dark: et valeurs sombres du thème
console.log(unknownClasses)  // classes absentes de la feuille de l'app
```

Le texte reçoit sa hauteur de ligne (`leading-*`, et celle de sa taille) comme
la boîte de ligne de CSS — chaque ligne exactement de cette hauteur, glyphes
centrés — et sa graisse exacte.

## Écrans

Une pile d'écrans, chacun un composant aurora :

```ts
import { createStack, useScreen } from '@c9up/orbit'

export const App = component(() => html`${createStack(Home)}`)

const Home = component(() => {
  const screen = useScreen()
  return html`<div @click=${() => screen.push(Detail, { id: 3 })}>…</div>`
})
```

- `push(Écran, props)` affiche un écran par-dessus, `pop()` termine celui du
  dessus, `replace(Écran, props)` le remplace. Le bouton et le geste retour
  d'Android ferment la pile la plus intérieure affichée ; quand il n'y a plus
  rien à fermer, l'app revient en arrière comme toute app Android.
- Un écran couvert reste construit — ses vues mises en page (une vue de
  défilement garde sa position), ses signaux et effets actifs — et il est caché
  une fois couvert. `screen.focused()` vaut vrai tant que l'écran est celui
  affiché ; un effet qui doit se mettre en pause le lit.
- Un écran fermé ou remplacé se termine aussitôt : ses effets s'arrêtent et
  son `onUnmount` s'exécute ; ses vues partent à la fin de sa transition.
- Les transitions se jouent sur le fil d'affichage : le nouvel écran glisse
  depuis la droite pendant que l'écran couvert se décale à gauche
  (`transition: 'none'` bascule d'un coup ; `duration`, 300 ms par défaut).
- Un écran voit ce qui est fourni autour de sa pile (`provide` / `inject`),
  même s'il est empilé bien plus tard ; une pile peut se trouver dans un écran
  (un onglet avec son propre historique).

## Longues listes

`each(items, key, render, { lazy: { estimate, overscan, from } })` ne construit
que les lignes qui croisent la zone visible de sa vue de défilement, plus
`overscan` dp de chaque côté, entre deux espaceurs qui tiennent la place des
autres à leur hauteur mesurée (`estimate` pour une ligne pas encore affichée).
Elle choisit ses lignes avec le calcul de fenêtre d'aurora, et se comporte donc
comme sur le web ; `from: 'end'` commence en bas et suit les nouvelles lignes
tant que le lecteur y est — une conversation.

## Images et dessins vectoriels

`<img src>` accepte des URL `https://`, des chemins `file:` et `content://`, des
fichiers `asset:` embarqués dans l'app et des octets transmis par le JS ;
l'image est décodée hors du fil d'affichage à la taille affichée, et `object-*`
règle son ajustement. Une adresse écrite dans le template qu'orbit ne charge
pas (`http:`, `data:`, `//hote/…`) lève une erreur. Une adresse venue des
données, comme l'avatar d'un utilisateur, n'affiche rien pour cette image et va
à `onError` de `mount` ; le reste de l'écran s'affiche.

`<svg>` devient une vue vectorielle. orbit-host lit le dessin — données de
chemin avec toutes leurs commandes, `rect` (arrondi), `circle`, `ellipse`,
`line`, `polyline`, `polygon`, `g`, `transform`, `fill` / `stroke` et leurs
opacités — et la plateforme rejoue de simples chemins à l'échelle de la boîte.
`currentColor` peint avec la couleur du texte autour : une icône prend la
couleur du texte où elle se trouve ; `shape-rendering="crispEdges"` garde les
modules d'un QR code purement noirs et blancs. Une valeur que l'hôte ne sait
pas lire n'arrête pas l'écran. Un nombre non fini (`NaN` venu de `0 / 0`) compte
comme absent. Un chemin et `points` sont dessinés jusqu'à leur première erreur.
Une forme dont le `transform` ou la peinture est illisible est laissée de côté.
Chaque cas va à `onError` sous le code `E_ORBIT_SVG_VALUE`.
