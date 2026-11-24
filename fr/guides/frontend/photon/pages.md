# Pages et props

Ce guide couvre le rendu des pages et le passage des props :

- Rendu des pages
- Props partagées
- Helpers de props
- Champs au niveau réponse
- Erreurs de validation

## Rendu des pages

Dans les handlers de route, utilisez `photon.render()` pour écrire la réponse directement :

```typescript
router.get('/dashboard', async ({ auth, photon, response }) => {
  const user = auth.user
  const stats = await DashboardService.getStats(user.id)

  const result = await photon.render('Dashboard', { user, stats })
  response.status(result.status)
  for (const [k, v] of Object.entries(result.headers)) response.header(k, v)
  response.send(result.html)
})
```

Photon effectue le rendu serveur du composant, injecte les props serialisees et envoie une page HTML complète. Cote client, le framework hydrate la page en une application interactive.

### L'objet page — `ctx.photon.page()`

`ctx.photon.page(component, props)` construit l'objet page que `render()` enverrait — props résolues selon la requête (rechargement partiel compris), `deferredProps`, étiquettes de fusion, `sharedProps`, drapeaux d'historique, version — sans écrire de réponse. `render()` repose dessus : ce qu'un test vérifie est ce que reçoit le client :

```typescript
const page = await ctx.photon.page('Dashboard', { stats: defer(() => getStats()) })
// page.deferredProps → { default: ['stats'] }, page.props n'a pas de `stats`
```

### Le protocole pour un autre moteur de rendu

Un moteur de rendu qui écrit son propre document — aurora le fait, avec son
importmap et sans étape de build — parle le même protocole avec les pièces de
photon ; le protocole garde ainsi une seule implémentation :

- serveur : `readRequestInfo(ctx)` lit les en-têtes du protocole,
  `buildPageObject(component, props, { url, version, framework, partial })`
  construit l'objet page comme `render()`, et `finishVisit(ctx, res, info,
  { url, version })` répond ce qu'une visite reçoit à la place d'une page (409
  sur une version périmée, 303 après une mutation redirigée, 302 pour le
  `location()` d'un chargement simple) ; `varyOnPhoton(res)` ajoute le `Vary` ;
- client : `bootPage({ target, resolveComponent, mount })` de
  `@c9up/photon/client` démarre le routeur avec l'adaptateur du moteur de rendu
  — `mount` affiche la première page et renvoie `{ update, unmount }`, que
  chaque visite met à jour. Le `framework` de l'objet page nomme cet adaptateur
  (celui d'aurora est `aurora`) ; `hydrate()` reste l'entrée des adaptateurs
  React, Vue et Svelte fournis.

Hors du navigateur, le routeur tourne sur un hôte : `bootPage({ host, url, … })`
prend un `PhotonHost` — l'adresse courante de la plateforme, son historique,
ses requêtes, ses chargements complets et ses événements — et va chercher la
première page à `url` comme le ferait une visite, faute de document rendu par
le serveur où la lire. Les [pages pilotées par le serveur](/fr/guides/mobile/server-driven#pages-pilotees-par-le-serveur)
d'orbit sont un tel hôte. `@c9up/photon/client/core` est le routeur, `bootPage`
et les aides de routes sans `hydrate()` ni ses adaptateurs fournis, pour un
bundler qui suit chaque `import()` (Metro).

### Le document HTML — `rootView`

Une première visite reçoit un document HTML. Sans configuration, Photon en écrit un minimal ; `rootView` le rend à l'application — le `<html lang>`, une favicon, des polices, une classe sur le body :

```typescript
export default defineConfig({
  framework: 'react',
  entryClient: 'resources/app.tsx',
  // un template que le moteur de vues rend par ctx.view.render('app', data) :
  rootView: 'app',
  // ou choisi par requête :
  // rootView: (ctx) => (ctx.auth?.user ? 'app' : 'guest'),
})
```

Le template reçoit `page` (l'objet page, plus `ssrHead` / `ssrBody` quand la page est rendue côté serveur), `photon.head` et `photon.body` (le balisage de Photon, prêt à placer sans échappement : balises meta, feuilles de style, les données de page, le point de montage `<div id="app">` et les scripts d'entrée, chacun avec le nonce CSP de la requête) et les props de vue passées en quatrième argument de `render()` :

```typescript
await ctx.photon.render('Dashboard', { user }, undefined, { lang: 'fr', theme: 'dark' })
```

Un hôte sans moteur de vues renvoie une fonction qui écrit le document elle-même :

```typescript
rootView: (ctx) => ({ photon, lang }) =>
  `<!DOCTYPE html><html lang="${lang}"><head>${photon.head}</head><body>${photon.body}</body></html>`,
```

Un nom de template sur une requête sans `ctx.view` lève `E_PHOTON_INVALID_CONFIG`. La quatrième position des props de vue est une déviation nommée : le troisième argument amont est celui des props de vue, celui de Photon porte les métadonnées `<head>` de l'appel.

## Props partagées

`ctx.photon.share({ ... })` enregistre des props par requête qui sont fusionnées dans **chaque** `ctx.photon.render(...)` de la même requête. Utilisez-le pour les props transversales que vous répéteriez sinon dans chaque handler — l'utilisateur authentifié, les messages flash, la locale active.

Partagez depuis un middleware, puis lisez la prop gratuitement dans n'importe quel contrôleur en aval :

```typescript
// middleware : rend l'utilisateur auth disponible pour chaque page
router.use([
  async (ctx, next) => {
    ctx.photon.share({ authUser: ctx.auth.user })
    return next()
  },
])

// contrôleur : pas besoin de repasser authUser
router.get('/dashboard', async ({ photon, response }) => {
  const stats = await DashboardService.getStats()
  const result = await photon.render('Dashboard', { stats }) // authUser est inclus automatiquement
  response.status(result.status)
  for (const [k, v] of Object.entries(result.headers)) response.header(k, v)
  response.send(result.html)
})
```

Les appels multiples à `share()` se fusionnent en surface (le dernier appel gagne par clé). Une clé passée directement à `render(props)` écrase la valeur partagée de la même clé pour ce rendu.

## Helpers de props

Un contrôleur façonne les props qu'il envoie avec ces helpers :

```ts
ctx.photon.render('Dashboard', {
  user,                                              // envoyé à chaque visite
  permissions: always(perms),                        // survit à un rechargement partiel
  auditLogs: optional(() => Audit.all()),            // seulement si demandé
  stats: defer(() => Stats.heavy(), 'panels'),       // récupéré ensuite
  rows: merge(nextPage).matchOn('id'),               // ajouté, dédupliqué
  countries: once(() => Country.all()),              // mis en cache par le client
  users: scroll(() => User.query().paginate(p, 20)), // défilement infini
})
```

- **`defer`** annonce le nom sans exécuter le résolveur ; le client demande
  chaque groupe dans une requête suivante. `{ rescue: true }` laisse un panneau
  lent échouer sans emporter tout le rechargement : la prop est omise et nommée
  dans `rescuedProps`, et l'erreur est quand même signalée — par défaut au
  `logger.error({ err }, 'Rescued deferred prop "stats"')` de la requête
  (`console.error` sans logger). `onRescue((error, { prop, ctx }) => …)`
  remplace cet écouteur pour tout le processus ; `onRescue()` le rétablit.
- **`merge` / `deepMerge`** étiquettent la prop pour que le client combine au
  lieu de remplacer. `matchOn('id')` empêche une ligne renvoyée entre deux pages
  d'apparaître en double.
- **`once`** énonce toujours les conditions de cache, et n'exécute pas du tout le
  résolveur pour une clé que le client détient encore.
- **`scroll`** étiquette le **tableau** `data` de la valeur, pas la prop — le
  curseur à côté doit être remplacé à chaque fois, jamais accumulé.
  `nextPage: null` est ainsi que le client cesse de demander.

Un rappel nu est une prop paresseuse, invoquée à chaque rendu, et une promesse
est attendue : `{ total: () => compterCommandes() }` envoie le nombre.

Le routeur navigateur demande chaque groupe `defer` une fois la page affichée —
une requête par groupe, pour qu'un groupe lent ne retienne pas les autres — et
fusionne le résultat dans la page sans la remonter (React et Vue gardent l'état
du composant ; Svelte remonte encore). Les `errors` d'un formulaire restent
telles quelles.

Chaque prop différée est demandée une seule fois par visite. Si la réponse ne
la contient pas (et que le serveur ne l'a pas rattrapée), le routeur ne la
redemande pas : il signale `E_PHOTON_DEFERRED_PROPS_MISSING` par
`router.on('exception', cb)` et par `photon:exception` sur `document`, et le
`<Deferred>` garde son fallback.

Lors d'un rechargement partiel — un groupe différé, `router.reload({ only })` —
les props étiquetés `merge`, `merge().prepend()` ou `deepMerge` sont combinés
avec ce que la page tient, en suivant `matchOn` ; une visite complète les
remplace.

Une valeur `once` est gardée par la page qui l'a reçue : chaque requête annonce
les clés encore tenues et non expirées (`x-photon-except-once-props`), le serveur
ne les résout pas, et le routeur remet sa copie avec sa première échéance.

Un prop `scroll` se pagine depuis la page avec `useInfiniteScrollData`, la
moitié « données » du défilement infini :

```ts
import { useInfiniteScrollData } from '@c9up/photon/client'

const users = useInfiniteScrollData({ getPropName: () => 'users' })
if (users.hasNext()) await users.fetchNext()   // ?page=N, lignes ajoutées après
if (users.hasPrevious()) await users.fetchPrevious() // lignes ajoutées avant
```

Chaque appel est un rechargement partiel du prop ; la barre d'adresse ne bouge
pas, et une page `null` d'un côté arrête les requêtes. Un rechargement avec
`reset: ['users']` remet le curseur à zéro.

`useInfiniteScroll` le branche sur la page : il charge un
côté quand son élément déclencheur entre à l'écran, étiquette chaque ligne avec
sa page, fait suivre l'URL à la page la plus visible, et garde la ligne du
lecteur en place quand des lignes arrivent au-dessus. Le curseur et les plages
de lignes sont gardés avec `router.remember` : le bouton retour — ou un
rechargement de l'onglet — ramène la liste telle qu'elle était.

```ts
import { useInfiniteScroll } from '@c9up/photon/client'

const { dataManager, elementManager, flush } = useInfiniteScroll({
  getPropName: () => 'users',
  getItemsElement: () => list,          // l'élément dont les enfants sont les lignes
  getStartElement: () => topSentinel,
  getEndElement: () => bottomSentinel,
  getScrollableParent: () => null,      // null : c'est la fenêtre qui défile
  getTriggerMargin: () => 200,
  inReverseMode: () => false,
  shouldFetchNext: () => true,
  shouldFetchPrevious: () => true,
  shouldPreserveUrl: () => false,
  onBeforeNextRequest() {}, onBeforePreviousRequest() {},
  onCompleteNextRequest() {}, onCompletePreviousRequest() {},
})
elementManager.setupObservers()
elementManager.processServerLoadedElements(dataManager.getLastLoadedPage())
elementManager.enableTriggers()
// …et `flush()` quand la liste quitte la page.
```

La plupart des pages l'utilisent plutôt à travers le composant du framework.

## Champs au niveau réponse

```ts
ctx.photon.clearHistory()        // à appeler au logout
ctx.photon.encryptHistory()         // ou pour chaque page : encryptHistory: true dans la config
ctx.photon.flash(() => ctx.session.flashMessages.all())
```

`clearHistory` compte au logout : sans lui, le bouton retour rejoue des pages
construites avec les données de la session précédente, depuis le cache du client.
Un logout redirige en général, et une redirection ne porte aucune page : quand la
requête a une session, l'instruction y est rangée et la page suivante — après la
redirection — la porte, une seule fois.

Le routeur garde chaque page dans `history.state`. Avec `encryptHistory`, cette
copie est chiffrée en AES-GCM sous une clé gardée dans `sessionStorage` ;
`clearHistory` supprime la clé, donc toute entrée antérieure devient illisible et
le bouton retour — ou une page restaurée depuis le cache avant-arrière — recharge
l'URL depuis le serveur. Chaque entrée reçoit son propre IV aléatoire, et sans
Web Crypto (page non servie en HTTPS) rien n'est rangé plutôt que la page en
clair.

Le sac flash arrive à la page comme un événement `photon:flash` sur `document` —
une fois par page, jamais pour un groupe différé, et jamais rejoué par le bouton
retour :

```ts
document.addEventListener('photon:flash', (event) => {
  if (!(event instanceof CustomEvent)) return
  const { flash } = event.detail
  if (flash.success) toast.success(String(flash.success))
})
```

## Erreurs de validation

`props.errors` est partagé avec chaque page, pour qu'un composant de formulaire
lise `errors.email` sans garde. L'en-tête `x-photon-error-bag` les cadre, ce qui
permet à deux formulaires d'une même page de garder leurs messages séparés. Sans
erreur, pas de sac non plus : `errors` reste `{}`, car toute clé y est lue comme
un envoi échoué.
