# Signaux

Ce guide couvre les signaux, les effets et les mémos :

- Ce qui se ré-exécute, et quand
- Compter les re-rendus — `countRerenders`
- Listes — `each`
- Cycle de vie d'un composant
- Des ids qui survivent à l'hydratation — `uid`, `resetIds`, `byId`
- Contexte — `createContext`, `provide`, `inject`
- Valeurs animées — `MotionValue`, `motion`, `scroll-y`

## Signaux — `signal`, `effect`, `memo`

```ts
import { signal, effect, memo } from '@c9up/aurora'

const count = signal(0)

// Lire
console.log(count())        // 0

// Écrire
count(1)
count((prev) => prev + 1)   // 2

// Réagir
effect(() => {
  console.log('count vaut maintenant', count())
})

// Dériver
const doubled = memo(() => count() * 2)
```

`signal()` retourne une fonction. On l'appelle sans arg pour lire, avec un arg pour écrire. Les signaux sont trackés automatiquement à l'intérieur de `effect()` et `memo()`.

### Ce qui se ré-exécute, et quand

Rien ne se ré-exécute sans qu'une valeur lue ait changé, et alors une seule fois :

- Une écriture marque ce qui a lu le signal, puis exécute une fois chaque effet marqué, après l'écriture. Un effet qui lit un signal et un `memo` de ce signal s'exécute une fois par écriture, jamais avec l'ancienne valeur du memo. Les écritures faites dans `batch(() => …)`, ou pendant qu'un effet s'exécute, s'appliquent ensemble à la fin.
- Un `memo` se recalcule quand on le lit après un changement. S'il rend une valeur égale (`Object.is`), rien de ce qui le lit ne se ré-exécute. Un memo qui construit un nouveau tableau ou objet à chaque fois prend `equals` pour rester muet quand le contenu n'a pas changé : `memo(() => rows().filter(isOpen), { equals: sameIds })`.
- Un effet ou un memo créé dans un effet, un accesseur ou un `onMount` prend fin quand cette exécution est remplacée ou quand le composant est démonté. Une racine créée par `render()` ou `hydrate()` ne prend fin que par son disposer.
- Un slot laisse ses nœuds en place quand son accesseur rend ce qu'il affiche déjà : le même texte, encore rien, ou un template du même appel `html` avec les mêmes valeurs. Un scalaire qui change met à jour son nœud texte sur place. Les attributs, booléens compris, ne sont écrits que si leur valeur diffère de celle de l'élément. Une `.prop` n'est écrite que si la valeur liée diffère de la dernière écrite : un champ où l'utilisateur a tapé garde son texte quand une autre dépendance ré-exécute la liaison.

Ce qui se reconstruit encore, c'est ce qui a changé : un accesseur qui rend un template aux valeurs différentes, ou un composant (son setup s'exécute de nouveau). Lisez la partie qui change dans un accesseur à elle, à l'intérieur d'un template stable, et utilisez `each` pour les listes. Une simple fonction utilitaire appelée depuis un accesseur est suivie par lui comme toute autre lecture : seul le setup d'un `component()` s'exécute sans suivi.

### Compter les re-rendus — `countRerenders`

En développement, activez le compteur pour voir ce qui se ré-exécute :

```ts
import { countRerenders } from '@c9up/aurora'

if (import.meta.env.DEV) {
  const rerenders = countRerenders({ highlight: true })
  // plus tard, dans la console :
  rerenders.counts()   // { effect, memo, slot, list, attribute, property, setup }
  rerenders.top(5)     // les éléments les plus re-rendus, avec leur nombre
  rerenders.setups(5)  // les setups de composants les plus exécutés, par nom de fonction
}
```

`highlight` entoure brièvement chaque élément re-rendu. `log` affiche chaque ré-exécution avec `console.debug`. `onRerender(event)` les reçoit une à une (`kind`, `target`, `name`, `hint`). Un slot qui a reconstruit un tableau entier porte un indice qui renvoie vers `each`. `reset()` remet les compteurs à zéro, `stop()` arrête le comptage. Tant qu'aucun compteur ne tourne, le runtime ne construit aucun événement : chaque point qui pourrait signaler coûte une lecture de propriété. Donnez aux composants une fonction de setup nommée (`component(function UserCard(props) { … })`) pour que `setups()` puisse les nommer.

`E_AURORA_REACTIVE_CYCLE` est levée quand des effets se relancent sans fin au cours d'une même mise à jour (un effet écrit ce que lui-même, ou un effet qu'il déclenche, lit). Quand un effet lève une erreur pendant une mise à jour, les autres effets s'exécutent quand même, et la première erreur est relancée ensuite.

### Listes — `each`

Un slot qui rend un tableau, `${() => rows().map(renderRow)}`, reconstruit toutes ses lignes à chaque nouveau tableau. Une ligne qui porte un gestionnaire d'événement ou un composant est neuve à chaque exécution : un nouveau tableau des mêmes lignes les reconstruit donc aussi. Une liste relue toutes les quelques secondes perd alors à chaque fois ses menus ouverts, son focus et son survol. `each` garde une ligne par clé :

```ts
import { each, html } from '@c9up/aurora'

html`<ul>${each(
  rows,                       // un tableau, ou un signal ou un accesseur qui en rend un
  (row) => row.id,            // la clé : un identifiant, jamais l'index
  (row, index) => html`<li>${() => `${index() + 1}. ${row().name}`}</li>`,
)}</ul>`
```

`render` est appelé une fois par clé. Il reçoit des accesseurs : `row()` est l'élément actuel de la ligne et `index()` sa position actuelle. Quand le tableau change, une ligne dont la clé reste garde ses nœuds, ses effets et ses composants. Elle est déplacée si sa position a changé, et ce qui lit `row()` dans un accesseur se met à jour sur place. Une nouvelle clé construit une ligne ; une clé disparue dispose la sienne et lance son `onUnmount`. Ce qui est construit à partir de `row()` hors d'un accesseur garde la valeur qu'il avait à la construction de la ligne.

Un accesseur peut rendre une liste, pour afficher autre chose quand elle est vide. Il ne doit alors se relancer que quand ce choix change, d'où la condition lue par un `memo` : un accesseur qui lit `rows()` lui-même construit une nouvelle liste, et de nouvelles lignes, à chaque changement.

```ts
const empty = memo(() => rows().length === 0)
html`<ul>${() => (empty() ? html`<li>Rien pour l'instant</li>` : each(rows, (row) => row.id, renderRow))}</ul>`
```

Deux éléments de même clé lèvent `E_AURORA_DUPLICATE_KEY`. Côté serveur, `each` se rend comme le tableau de ses lignes ; l'hydratation adopte ces lignes, puis les garde par clé.

#### Listes paresseuses

Une liste de milliers de lignes, une conversation ou un fil, doit coûter ce que l'écran montre. `{ lazy }` ne construit que les lignes qui croisent la zone visible du défilement, plus une marge de chaque côté :

```ts
html`<div class="h-full overflow-y-auto">
  <div class="flex flex-col gap-2">${each(
    messages,
    (message) => message.id,
    (message) => html`<p>${() => message().text}</p>`,
    { lazy: { estimate: 64, overscan: 600, from: 'end' } },
  )}</div>
</div>`
```

- `estimate` (48 par défaut) est la hauteur supposée d'une ligne pas encore affichée, en pixels CSS. Une ligne est mesurée dès qu'elle s'affiche, et peut avoir n'importe quelle hauteur.
- `overscan` (600 par défaut) est la marge construite au-delà de la zone visible, pour qu'un lancer rapide n'affiche pas de vide.
- `from: 'end'` démarre sur les dernières lignes et reste en bas quand des lignes arrivent, sauf si le lecteur est remonté.

Les autres lignes sont remplacées par deux espaceurs vides, dimensionnés d'après les hauteurs mesurées : la barre de défilement garde la taille de toute la liste. Quand une mesure corrige une estimation au-dessus de la zone visible, la liste défile de la différence : ce qui est à l'écran ne bouge pas. Une ligne qui sort de la fenêtre est disposée et son `onUnmount` est lancé ; elle est reconstruite, depuis son élément, quand elle revient. Un état qui doit survivre au défilement vit donc dans l'élément ou dans un signal, pas dans la ligne.

La liste défile avec son plus proche ancêtre défilant, ou avec la page. Elle se pose dans un conteneur bloc ou flex, pas dans un tableau : ses espaceurs sont des `div`. Côté serveur, elle rend les lignes d'une première zone visible (depuis le début, ou depuis la fin) entre ses espaceurs ; l'hydratation adopte ces lignes, puis recalcule la fenêtre dès qu'elle peut mesurer. La hauteur d'un espaceur est un `style` en ligne, qu'une Content-Security-Policy sans `'unsafe-inline'` pour les styles ignore jusqu'à ce que le client la pose. Un `estimate` ou un `overscan` qui n'est pas une longueur utilisable lève `E_AURORA_INVALID_LAZY`.

### Cycle de vie d'un composant

```ts
import { component, html, onMount, onUnmount, signal } from '@c9up/aurora'

const Counter = component(() => {
  const count = signal(0)
  onMount(() => console.log('monté'))
  onUnmount(() => console.log('retiré du DOM'))
  return html`<button @click=${() => count(count() + 1)}>${count}</button>`
})
```

L'état c'est `signal()` du layer réactif — pas d'API "hooks" séparée. Les signaux fonctionnent à l'intérieur ET en dehors d'un setup de composant, donc la même primitive sert pour l'état au niveau module, les valeurs dérivées (`memo`), et les effets de bord (`effect`). Les helpers liés à l'instance sont `onMount` / `onUnmount` et la paire de contexte ci-dessous ; ils existent parce qu'ils ont besoin des files propres à l'instance.

`onMount` suit le composant, pas le template. Un composant dont le corps EST un
autre composant — `const TextField = component((props) => Field({ ... }))`, la
forme dont on construit un ensemble composé — garde les deux cycles de vie :
l'extérieur d'abord, puis l'intérieur.

Le setup tourne une fois, et il n'abonne rien. Un composant est construit dans
l'accesseur du slot qui l'affiche — `${() => (open() ? Panel() : '')}` — et ce
slot suit ce que l'accesseur lit lui-même (`open`), jamais ce que lisent le
setup de `Panel` ou son `onMount`. Un composant qui met à jour son propre état
met à jour ses propres liaisons ; il ne reconstruit pas le slot qui l'entoure.
Une valeur que le setup lit directement est donc lue une fois : pour la suivre,
la mettre dans un accesseur.

```ts
const Price = component((props) => {
  const once = props.amount()                    // lu une fois, au setup
  return html`<b>${() => props.amount()}</b>`    // suit le signal
})
```

### Des ids qui survivent à l'hydratation — `uid`, `resetIds`, `byId`

Les templates n'ont pas de directive `ref` : un composant qui doit mesurer,
focaliser ou ancrer un nœud le retrouve par son id — et le câblage ARIA en a
besoin de toute façon, puisque l'`aria-controls` d'un déclencheur doit nommer
l'id que son contenu porte réellement.

```ts
import { byId, component, html, onMount, uid } from '@c9up/aurora'

const Anchored = component(() => {
  const id = uid('trigger')
  onMount(() => position(byId(id)))
  return html`<span id="${id}">?</span>`
})
```

Le compteur est monotone : la séquence ne dépend que de l'ordre de construction
des composants — identique sur le serveur et dans le navigateur pour le même
arbre. Ça ne tient que si les deux passes partent du même endroit, et c'est
toute la subtilité : un process serveur est long, donc sans remise à zéro son
compteur grimpe d'une requête à l'autre et la deuxième page servie livre
`trigger-14` alors que le navigateur, qui repart de zéro, cherche `trigger-1`.
Chaque recherche répond alors `null`, silencieusement — un tooltip qui n'ouvre
jamais sur une page où tout le reste fonctionne.

`renderPage` et `hydrate` prennent chacun un compteur neuf avant de construire :
une application qui passe par l'un ou l'autre a des séquences alignées sans rien
faire.

Un compteur ne suffit plus dès qu'une page a plus d'une racine d'hydratation, et
une page avec un composant live en a deux : `renderPage` construit la racine de
la page et `liveClient` hydrate son propre conteneur. Les ids sont donc aussi
**cloisonnés par racine**. `renderPage` utilise l'id de l'élément racine, la
même chaîne que son amorce relit sur le conteneur — `id="aurora-root-trigger-1"`.
Un composant live utilise son id de session, que la réponse de montage porte
déjà des deux côtés. Rien à câbler dans un cas comme dans l'autre.

Une application qui rend une racine elle-même enveloppe les deux passes dans
`withIdScope`, avec la même portée de chaque côté :

```ts
import { withIdScope } from '@c9up/aurora'

// serveur
const markup = withIdScope('sidebar', () => renderToString(Sidebar()))
// navigateur — `hydrate` prend la portée sur l'id du conteneur par défaut
hydrate(document.getElementById('sidebar'), Sidebar)
```

### Contexte — `createContext`, `provide`, `inject`

Un composant composé possède un état que toutes ses parties lisent. Un `Select`
détient l'indicateur d'ouverture, l'élément actif et les identifiants ; son
déclencheur, sa liste et chacun de ses éléments en ont besoin. Le contexte
transmet la valeur vers le bas sans faire passer une prop par chaque niveau
intermédiaire.

```ts
import { component, createContext, html, inject, provide, signal } from '@c9up/aurora'

const MenuContext = createContext('Menu')

const MenuTrigger = component(() => {
  const menu = inject(MenuContext)
  return html`<button @click=${() => menu.toggle()}>Ouvrir</button>`
})

const MenuContent = component(() => {
  const menu = inject(MenuContext)
  return html`<div ?hidden=${() => !menu.open()}>…</div>`
})

const Menu = component(() => {
  const open = signal(false)
  provide(MenuContext, { open: () => open(), toggle: () => open((v) => !v) })
  // Construits ICI, dans le setup — voir la règle ci-dessous.
  return html`<div>${MenuTrigger()}${MenuContent()}</div>`
})
```

`inject` remonte jusqu'au `provide` le plus proche : imbriquer le même contexte
le masque donc pour ce sous-arbre. Un second argument à `createContext` donne
une valeur par défaut ; sans elle, `inject` lève `E_AURORA_MISSING_CONTEXT` en
nommant le contexte — ce qu'on veut quand le composant n'a aucun sens seul.

#### La seule règle

Un descendant voit la valeur uniquement s'il est **créé dans le setup du
fournisseur**. Aurora évalue tout de suite — aucun compilateur ne diffère quoi
que ce soit — donc des enfants passés déjà construits ont tourné avant que le
fournisseur n'existe :

```ts
Parent({ children: MenuItem() })       // ✗ MenuItem() est passé avant — lève
Parent({ children: () => MenuItem() }) // ✓ le setup l'appelle
```

Un composant qui fournit quelque chose prend donc ses enfants sous forme de
fonction et l'appelle lui-même, dans son setup. Tout le reste en découle.

Un slot réactif écrit dans ce setup garde les fournisseurs sous lesquels il a
été écrit. Le rendu l'appelle plus tard (au montage, puis chaque fois que ce
qu'il lit change), et les parties construites dedans trouvent encore leur
fournisseur, côté client, côté serveur et à l'hydratation :

```ts
Menu({ children: () => html`${() => items().map((item) => MenuItem(item))}` })
```

Seul `inject` les voit : `provide`, `onMount` et `onUnmount` restent réservés au
setup d'un composant.

### Valeurs animées — `MotionValue`, `motion`, `scroll-y`

```ts
import { html, MotionValue } from '@c9up/aurora/core'

const x = new MotionValue(0)
const fade = x.interpolate([0, 200], [1, 0.2])

html`<div motion=${{ translateX: x, opacity: fade }}>…</div>`

x.timing(200, { duration: 300 })               // transition adoucie
x.timing(300, { duration: 1200, loop: true, yoyo: true })
x.spring(0, { stiffness: 180, damping: 12 })   // ressort physique
x.set(40)                                      // d'un coup
x.stop()                                       // là où elle est
```

Une valeur animée est un nombre qui s'anime là où l'hôte anime le mieux, liée
à un élément par `motion=${{ opacity, translateX, translateY, scale, visible }}` ;
`scroll-y=${value}` sur un conteneur défilant alimente `value` avec son
décalage, si bien qu'un en-tête peut s'estomper quand une liste défile. Le même
fichier de composant tourne dans le navigateur et sur un téléphone
([orbit](/fr/guides/mobile/gestures-and-motion#animation)).

- Dans le navigateur, chaque propriété liée est une Web Animation construite
  à partir de la courbe de la valeur : l'opacité et les propriétés
  `translate` / `scale` tournent sur le compositeur, si bien qu'un thread
  principal occupé ne les arrête pas. Une valeur alimentée par le défilement
  pilote ses liaisons par une `ScrollTimeline` quand le navigateur en a une
  (aucun script par défilement), sinon à chaque événement de défilement. Sans
  l'API Web Animations, les valeurs sont écrites en ligne à chaque image.
- Une classe `translate-*` ou `scale-*` sur un élément lié est remplacée tant
  qu'il est lié (la liaison possède `translate` et `scale`) ; un `transform`
  (`rotate-*`) se compose avec elle.
- `visible` masque à 0,5 ou moins : toujours mis en page, ni dessiné ni
  touchable.
- La rotation et la couleur ne sont pas prises en charge, sur aucun hôte.
- Côté serveur, rien de `motion` ni de `scroll-y` n'est écrit ; le client les
  lie à l'hydratation.
