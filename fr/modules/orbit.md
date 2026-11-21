# Orbit — Vues natives

Orbit rend les composants [aurora](/fr/modules/aurora) en vues natives sur un
téléphone. Un composant écrit avec `html`, `component`, des signaux et des
classes Tailwind tourne sans changement sur Android : orbit garde un arbre de
nœuds natifs que les signaux d'aurora modifient, le transmet à un hôte Rust
(orbit-host) qui le met en page avec taffy, calcule les différences et confie
les opérations de montage aux vues de la plateforme. Gestes, animations et
valeurs pilotées par le défilement tournent sur le fil d'affichage : un fil JS
occupé ne fige pas l'écran.

React Native fournit le moteur JS (Hermes), le registre des modules et
l'activité ; React lui-même n'est pas utilisé.

## Installation

```bash
pnpm add @c9up/orbit @c9up/aurora react-native
pnpm add -D tailwindcss @tailwindcss/cli @react-native-community/cli @react-native/metro-config
```

L'app est construite par `ream android:*` à partir du bloc `mobile` de
`reamrc.ts` — voir [Applications mobiles](/fr/cli/ream#applications-mobiles)
dans la référence de la CLI.

## Brancher une app

```ts
// mobile/index.ts — mobile.entry dans reamrc.ts
import { run } from '@c9up/orbit/react-native'
import { App } from './App.js'

run(App)
```

```ts
// mobile/App.ts
import { component, html, signal } from '@c9up/aurora/core'

export const App = component(() => {
  const count = signal(0)
  return html`<div class="flex-1 items-center justify-center gap-4 bg-background">
    <p class="text-2xl font-semibold">${() => count()}</p>
    <button class="rounded-md bg-primary px-4 py-2 text-primary-foreground" @click=${() => count(count() + 1)}>
      Ajouter un
    </button>
  </div>`
})
```

`run` enregistre l'app sous le nom que l'activité générée démarre, donne à
orbit son hôte natif et la table de styles de l'app, branche le bouton retour
d'Android, puis monte le composant racine avec les props de lancement (les
extras de l'intent). Hors d'une app construite par ream, `useHost(host)` et
`mount(App(), { viewport })` font la même chose à la main.

## Correspondances

| Template | Natif |
|---|---|
| éléments bloc (`div`, `section`, `button`, …) | une vue |
| `p`, `h1`–`h6`, `label` | un texte |
| éléments en ligne (`span`, `strong`, `em`, …) | un passage dans le texte qui l'entoure |
| texte posé dans une vue | enveloppé dans un texte anonyme, comme le fait CSS |
| `class="…"` | le build Tailwind de l'app (voir Styles) ; les styles de texte se transmettent |
| un conteneur `flex` | chaque enfant est un élément ; `flex` est une ligne, comme sur le web |
| `overflow-y-auto` | une vue de défilement native autour d'une vue de contenu |
| `overflow-hidden` | enfants découpés à la boîte et à ses coins arrondis |
| `shadow-*` | une ombre portée, dessinée par le parent hors de la boîte (Android 8+) |
| `backdrop-blur-*` | ce qui est derrière la vue, flouté (Android 12+) |
| `@click`, `@longpress`, `@pan`, `@swipe` | des gestes reconnus nativement (voir Gestes) |
| `motion=${{ opacity, translateX, translateY, scale, visible }}` | animation sur le fil d'affichage (voir Animation) |
| `scroll-y=${value}` | le défilement alimente une `MotionValue` |
| `input`, `textarea` | le champ de texte de la plateforme : la saisie n'attend jamais le JS |
| `@input`, `@change`, `@focus`, `@blur`, Entrée en `@keydown` | les événements du champ, avec le texte dans `event.target.value` |
| `img` | une vue d'image, décodée hors du fil d'affichage à la taille affichée |
| `svg` | une vue vectorielle : chemins, formes simples et `g` (voir Dessins vectoriels) |
| `each(items, key, render)` | une ligne par clé : une ligne gardée garde ses vues et se déplace |
| `each(…, { lazy })` | seules les lignes dans la zone visible de la vue de défilement existent |

La racine se met en page dans la zone sûre : barre d'état, barre de navigation,
encoche et, quand il est ouvert, clavier.

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

## Pages pilotées par le serveur

```ts
import { serverPages } from '@c9up/orbit/pages'
import Home from './pages/Home.js'
import Orders from './pages/Orders.js'

run(() => html`${serverPages({ server: 'https://app.example', pages: { Home, Orders } })}`)
```

Le serveur ream reste le routeur. L'app lui demande l'objet de la première
page, puis chaque lien ou `router.visit()` demande le suivant par le protocole
de [photon](/fr/modules/photon) — celui que parle le navigateur avec
[`visits: true`](/fr/modules/aurora) d'aurora. Le même contrôleur répond au
navigateur et au téléphone ; le téléphone affiche la page nommée, un composant
aurora livré avec l'app. Une page qui importe depuis `@c9up/aurora` et
`@c9up/photon/client/core` est le module même que charge le navigateur.

- Chaque page est un écran d'une pile : une visite vers une nouvelle adresse
  en fait glisser un ; un rechargement partiel, une prop différée ou une
  redirection vers la même adresse le remplace sur place.
- Le bouton retour passe par l'historique de photon : la page couverte
  revient telle qu'on l'a laissée, sans requête.
- Une version périmée (le serveur a été redéployé) repart de la page demandée,
  comme le chargement complet d'un navigateur.
- Les requêtes portent le cookie de session et renvoient le `XSRF-TOKEN` posé
  par le serveur. Un lien hors du serveur part vers `open(url)`.
- Un `<a href>` dans une vue est une cible tactile à part entière (dans un
  bloc, chaque lien prend sa ligne) ; un lien au milieu d'une phrase
  (`<p>… <a>…</a> …</p>`) n'est pas encore pressable.
- `server` (une origine, ou la connexion ci-dessous) doit être en https. Le http simple n'atteint que cette machine
  (`localhost`, via `adb reverse`) ou l'hôte de l'émulateur (`10.0.2.2`), et
  l'app doit alors autoriser le trafic en clair.
- `loading` remplace l'écran vide affiché jusqu'à la première page ;
  `failed(error, retry)` remplace l'écran d'échec par défaut.

Le `URL` de React Native résout une référence relative en l'ajoutant au bout
de sa base ; l'entrée de l'app en installe un standard (`installStandardUrl()`
pour une app câblée à la main).

## Comet et relay

Le serveur de l'app est une seule connexion, par laquelle passent les pages,
les appels comet et les abonnements relay :

```ts
import { connectServer } from '@c9up/orbit'
import { serverPages } from '@c9up/orbit/pages'
import { createRpcClient } from '@c9up/comet/client'
import { configureRelay, relay } from '@c9up/aurora/relay'

const server = connectServer('https://app.example')

const rpc = createRpcClient({ url: server.url('/rpc'), transport: server.json })
configureRelay({
  sseUrl: server.url('/__relay/events'),
  subscribeUrl: server.url('/__relay/subscribe'),
  unsubscribeUrl: server.url('/__relay/unsubscribe'),
  stream: server.stream,
  fetch: server.fetch,
})

run(() => html`${serverPages({ server, pages })}`)
```

- `server.fetch` n'atteint que l'origine du serveur, envoie le cookie de
  session et renvoie sur chaque mutation le `XSRF-TOKEN` posé par le serveur —
  ce qu'un navigateur fait pour une page, et qu'il faut donner à une app.
- `server.json` est le transport de comet : un POST JSON, sa réponse JSON.
- `server.stream` lit les événements envoyés par le serveur dans le XHR en flux
  de React Native, comme les lit `EventSource` (événements nommés, `retry:`,
  `Last-Event-ID` à la reconnexion) ; une réponse qui n'est pas un flux
  d'événements l'arrête pour de bon.
- `server.authorize(token)` envoie `Authorization: Bearer <token>` avec chaque
  requête et chaque flux à partir de là — le jeton d'une API, que le
  téléphone, contrairement à l'`EventSource` d'un navigateur, peut aussi
  envoyer sur le flux d'événements.

## Gestes

Chaque toucher passe par le reconnaisseur d'orbit-host avant toute vue : le
retour visuel d'un appui démarre même quand le fil JS est occupé, et le JS
reçoit le résultat dès qu'il peut.

- `@click` : sur le relâchement, si le doigt est resté à moins de 10 dp et que
  rien n'a pris le relais. Une ondulation, limitée à la boîte arrondie, part de
  l'endroit du doigt — tout de suite, ou après 100 ms dans une vue de
  défilement, pour qu'un défilement commencé sur une ligne ne la fasse pas
  clignoter.
- `@longpress` : après 500 ms d'appui ; le relâchement ne déclenche alors pas
  de clic.
- `@pan` : dès que le doigt dépasse le seuil, `{ phase, dx, dy, vx, vy }` (dp,
  dp/s) au `start`, à chaque `move`, puis `end` ou `cancel`.
- `@swipe` : un relâchement plus rapide que 500 dp/s, `{ direction, vx, vy }`.

## Animation

Une `MotionValue` — celle d'aurora, la même dans le navigateur (voir
[valeurs animées](/fr/modules/aurora#valeurs-animees-—-motionvalue-motion-scroll-y)) —
vit dans l'hôte et s'anime sur le fil d'affichage : le JS déclare valeurs,
courbes et liaisons une fois, et un fil JS bloqué n'en arrête aucune.

```ts
import { MotionValue } from '@c9up/aurora/core'

const x = new MotionValue(0)
const fade = x.interpolate([0, 200], [1, 0.2])

html`<div motion=${{ translateX: x, opacity: fade }}>…</div>`

x.timing(200, { duration: 300 })               // interpolation adoucie
x.spring(0, { stiffness: 180, damping: 12 })   // ressort physique
x.set(40)                                      // immédiat
```

`scroll-y=${value}` alimente une valeur avec la position d'une vue de
défilement (un en-tête qui rétrécit quand la liste défile). `visible` cache
une vue à 0,5 ou moins : toujours mise en page, mais ni dessinée ni touchable —
contrairement à `opacity: 0`, dessinée transparente et qui reçoit les
touchers, comme sur le web. `dispose()` libère une valeur créée pour une vue
qui disparaît pour de bon.

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
règle son ajustement.

`<svg>` devient une vue vectorielle. orbit-host lit le dessin — données de
chemin avec toutes leurs commandes, `rect` (arrondi), `circle`, `ellipse`,
`line`, `polyline`, `polygon`, `g`, `transform`, `fill` / `stroke` et leurs
opacités — et la plateforme rejoue de simples chemins à l'échelle de la boîte.
`currentColor` peint avec la couleur du texte autour : une icône prend la
couleur du texte où elle se trouve ; `shape-rendering="crispEdges"` garde les
modules d'un QR code purement noirs et blancs.

## Limites

- Pas encore pris en charge : `select`, `canvas` ; dans un `svg`, `text`,
  `use`, dégradés et masques.
- Connus de la feuille mais sans effet : `:has()`, pseudo-classes de position
  (`first:`, `last:`), `::before` / `::after`, transformations, transitions,
  dégradés, `line-clamp` ; `grid` se pose en colonne ; une seule ombre est
  dessinée (la première visible) et les coins partagent un même rayon.
- L'accessibilité et iOS restent à venir.

## Erreurs

| Code | Cause |
|---|---|
| `E_ORBIT_NO_HOST` | `mount` a tourné avant que `useHost` donne à orbit un hôte natif, ou le module n'est pas celui d'orbit. |
| `E_ORBIT_COMMIT_FAILED` | L'hôte natif a refusé une transmission ; le message porte son rapport. |
| `E_ORBIT_UNSUPPORTED_ELEMENT` | Un élément sans correspondance native (`select`, `canvas`, ou `text` / un dégradé dans un `svg`). |
| `E_ORBIT_BLOCK_IN_TEXT` | Un élément bloc dans du texte : un texte natif ne contient que des passages en ligne. |
| `E_ORBIT_INVALID_MOTION` | `motion=${…}` n'était pas un objet de valeurs animées. |
| `E_ORBIT_INVALID_SCROLL_BINDING` | `scroll-y=${…}` n'était pas une valeur animée. |
| `E_ORBIT_INVALID_COLOR` | Une couleur qu'orbit ne sait pas lire. |
| `E_ORBIT_INSECURE_IMAGE_URL` | `<img src>` en http simple : les images ne se chargent qu'en https. |
| `E_ORBIT_IMAGE_SOURCE` | `<img src>` avec un schéma qui n'est pas une source d'image (`data:`, `javascript:`…). |
| `E_ORBIT_DUPLICATE_KEY` | Deux éléments d'une liste `each` partagent une clé. |
| `E_ORBIT_NO_SCREEN` | `useScreen()` dans un composant qu'aucun écran d'une pile n'a construit. |
| `E_ORBIT_STACK_SHOWN` | Une même pile placée à deux endroits : une pile s'affiche une fois. |
| `E_ORBIT_STYLE_TABLE` | `useStyles` a reçu autre chose qu'une table écrite par `ream css:compile`. |
| `E_ORBIT_INSECURE_SERVER` | `serverPages({ server })` en http simple vers un hôte qui n'est ni cette machine ni celui de l'émulateur. |
| `E_ORBIT_UNKNOWN_PAGE` | Le serveur a nommé une page absente des `pages` de l'app. |
