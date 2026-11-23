# Hydratation et navigation

Ce guide couvre l’hydratation côté client et la navigation :

- Hydratation client
- Navigation SPA (détection côté serveur)

## Hydratation client

`createPhotonApp` (plus haut) est l'entrée client d'une app. En dessous,
`hydrate()` de `@c9up/photon/client` fait la même chose sans sous-chemin de
framework : il choisit l'adapteur du framework d'après les données de la page
et monte lui-même le composant de page. Utilisez-le quand vous n'avez pas besoin de
`setup` :

```typescript
// resources/app.tsx (React)
import { hydrate } from '@c9up/photon/client'

const pages = import.meta.glob<{ default: unknown }>('./pages/*.tsx')

hydrate({
  resolveComponent: async (name) => {
    const loader = pages[`./pages/${name}.tsx`]
    if (!loader) throw new Error(`Page inconnue : ${name}`)
    return loader()
  },
})
```

La même forme fonctionne pour Vue (`./pages/*.vue`) et Svelte (`./pages/*.svelte`) — Photon dispatche vers le bon adapteur en se basant sur le champ `framework` embarqué dans le bloc page-data SSR, donc les apps React-only ne chargent jamais le runtime Vue ou Svelte.

### Ce que fait `hydrate()`

1. Lit le bloc `<script id="photon-data" type="application/json">` émis par le serveur.
2. Valide la forme du payload (`component`, `props`, `url`, `framework`).
3. Appelle `resolveComponent(name)` pour charger le module de la page.
4. Dispatche vers l'adapteur correspondant, qui hydrate la cible quand le
   serveur l'a rendue (`data-server-rendered`) et la monte sinon :
   - **React** — `hydrateRoot(target, createElement(Component, props))`, ou `createRoot(target).render(…)`.
   - **Vue** — `createSSRApp(…).mount(target)`, ou `createApp(…).mount(target)`.
   - **Svelte** — `hydrate(Component, { target, props })`, ou `mount(…)` (Svelte 5+). Passez `svelteRoot: PhotonRoot` pour qu'une page garde son état quand ses props changent.
5. Installe un listener `click` + `popstate` au niveau du document (le router SPA-nav ci-dessous).
6. Appelle `onHydrated()` si vous en fournissez un.

### `HydrateOptions`

| Propriété | Type | Défaut | Description |
|---|---|---|---|
| `resolveComponent` | `(name: string) => Promise<{ default: unknown }>` | — | Associe un nom de composant à son module. Habituellement adossé à `import.meta.glob`. |
| `target` | `string` | `'#app'` | Sélecteur CSS du nœud racine SSR. |
| `onHydrated` | `() => void` | — | Se déclenche une fois après que la primitive `hydrate` du framework a résolu. |
| `svelteRoot` | `unknown` | — | Svelte uniquement : `PhotonRoot` de `@c9up/photon/svelte`. |

### Passer une entrée à `createPhotonApp`

Une app écrite avec `hydrate()` et un export nommé `render` continue de
fonctionner. Pour la passer à `createPhotonApp` :

1. Entrée client : remplacez `hydrate({ resolveComponent })` par
   `createPhotonApp({ resolve })` depuis le sous-chemin de votre framework.
   `resolve` peut renvoyer le composant ou son module, directement ou en
   promesse.
2. Entrée SSR : exportez `render(page)` par défaut et renvoyez
   `createPhotonApp({ page, render, resolve })` (Svelte : `setup` au lieu de
   `render`). L'enveloppe `PhotonPage` / `PhotonRoot` écrite à la main
   disparaît : `App` fournit la page à `usePage()` côté serveur.
3. Config : `ssr: { enabled: true, entrypoint: 'resources/ssr.tsx' }` remplace
   `entryServer` — le rendu serveur est désactivé tant qu'il n'est pas activé.

### Navigation SPA

Les composants `Link` des frameworks naviguent sans rechargement de page. Un `<a>` simple est laissé au navigateur, sauf s'il s'inscrit avec `data-photon` : Photon intercepte alors le clic gauche, fetch la destination avec le header `X-Photon: true`, parse la réponse JSON props-only et permute la racine montée. Les boutons précédent/suivant du navigateur restaurent les pages précédentes depuis `history.state`.

Un clic est intercepté **uniquement** quand TOUTES ces conditions tiennent :

- Bouton gauche de la souris (pas clic milieu / droit).
- Aucune touche modificatrice (Ctrl, Cmd, Shift, Alt) — sinon le comportement par défaut du navigateur (nouvel onglet / sauvegarder le lien) gagne.
- L'ancre a un `href`, pas d'attribut `download`, et pas de `target` autre que `_self` / `''`.
- L'URL résolue est **same-origin** avec un protocole `http:` / `https:` (pas `mailto:`, `tel:`, `javascript:`, `blob:`, `data:`).
- L'ancre porte `data-photon` (toute valeur sauf `external`).

Inscription par lien :

```html
<a href="/orders" data-photon>Commandes</a>
```

Les ancres sont à inscrire parce qu'un lien simple peut mener n'importe où — un lien magique à usage unique, un export, une page qui n'est pas une page Photon. Le fetcher d'abord puis le recharger quand la réponse n'est pas une page demanderait deux fois la même URL ; n'inscrivez que les ancres qui mènent à des pages Photon.

Si le fetch SPA-nav d'une ancre inscrite échoue (réponse non-2xx, mauvais `Content-Type`, JSON malformé, URL cross-origin retournée par le serveur, adapteur qui throw), Photon retombe sur `location.href = url` — l'utilisateur arrive toujours sur la page cliquée, même si l'interactivité est cassée. Ce repli demande l'URL une deuxième fois : c'est pourquoi seules les ancres vers des pages Photon s'inscrivent.

**Navigation concurrente :** les double-clics rapides (lien A puis lien B avant que la réponse de A arrive) sont dédupliqués — seule la dernière navigation gagne ; les réponses obsolètes sont jetées.

**Clics sur la même URL** utilisent `history.replaceState` plutôt que `pushState`, donc les clics répétés sur le même lien ne gonflent pas l'historique de retour.

**Les `<a>` SVG ne sont PAS interceptés** — `SVGAElement` a une forme `href` différente (`SVGAnimatedString`), donc les ancres SVG retombent sur le comportement par défaut du navigateur. Si vous voulez du SPA-nav depuis un lien d'icône SVG, enveloppez-le dans un `<a>` HTML.

**Apps en sous-chemin** avec un élément `<base href="/admin/">` dans le document sont gérées correctement : les ancres relatives sont résolues contre `document.baseURI` plutôt que `location.href`.

### Naviguer depuis le code — `router`

`@c9up/photon/client` exporte un `router` pour les visites lancées depuis le
code :

```ts
import { router } from '@c9up/photon/client'

router.visit('/orders')                          // comme un clic sur un lien
router.visit('/orders?page=2', { replace: true }) // remplace l'entrée d'historique
router.reload({ only: ['stats'] })               // partiel : seulement ces props
router.reload({ except: ['auditLogs'] })
router.reload({ only: ['rows'], reset: ['rows'] }) // remplacer, pas combiner
router.visit('/login', { errorBag: 'login' })    // cibler les erreurs de validation
```

Les visites prennent des callbacks — `onBefore` (renvoyer `false`
annule), `onBeforeUpdate`, `onSuccess`, `onFinish` — ainsi que `data` (paramètres
de query), `preserveUrl` et `preserveErrors`. Le routeur a aussi
`router.on('success', cb)` (renvoie la fonction qui arrête l'écoute),
`router.remember(data, key)` / `router.restore(key)` pour un état gardé dans
l'entrée d'historique de la page, et `router.replace({ url })` pour changer
l'adresse sans requête.

Un rechargement partiel (`only`, `except` ou `reset`) fusionne la réponse dans la
page affichée sans la remonter ; les props non demandés gardent leur valeur, et
il prend les `errors` du serveur. `reload()` envoie `Cache-Control: no-cache`.
Une URL d'une autre origine est une navigation complète. Les deux méthodes
renvoient une promesse, résolue une fois la page appliquée, qu'on peut donc
attendre ; l'ignorer marche aussi.

### Contrat côté serveur

Le `PhotonMiddleware` détecte déjà le header de requête `X-Photon` et renvoie une réponse JSON (component, props, url, framework) au lieu d'un document HTML complet. Aucun câblage supplémentaire requis :

```typescript
router.get('/orders', async ({ photon, response }) => {
  const orders = await OrderService.list()

  const result = await photon.render('Orders', { orders })
  response.status(result.status)
  for (const [k, v] of Object.entries(result.headers)) response.header(k, v)
  response.send(result.html)
})
```

### Codes d'erreur

Le point d'entrée `hydrate()` lance les erreurs que `@c9up/photon/client` exporte sous `errors`. Testez `error.code`, ou `instanceof` l'une d'elles (`error instanceof errors.E_PHOTON_HYDRATION_NO_TARGET`) :

| Code | Quand |
|---|---|
| `E_PHOTON_HYDRATION_NO_DATA` | Le bloc `<script id="photon-data">` est absent — la page n'a pas été rendue via `PhotonRenderer`. |
| `E_PHOTON_HYDRATION_BAD_DATA` | Le JSON page-data est malformé ou de mauvaise forme (manque `framework`, `component` vide, etc.). |
| `E_PHOTON_HYDRATION_NO_TARGET` | Le sélecteur de mount (`#app` par défaut) n'a matché aucun nœud DOM. |
| `E_PHOTON_HYDRATION_UNSUPPORTED_FRAMEWORK` | `framework` vaut autre chose que `react` / `vue` / `svelte`. |
| `E_PHOTON_HYDRATION_ADAPTER_LOAD_FAILED` | Le runtime du framework (`react-dom/client`, `vue`, `svelte`) n'a pas pu être importé — généralement une étape `pnpm add` manquante. |
| `E_PHOTON_UNKNOWN_PAGE` | Le `resolve` de `createPhotonApp` n'a rien renvoyé pour un nom de page. |

### Apps en sous-chemin et cible de mount personnalisée

Vous hébergez Photon sous un sous-chemin ? Surchargez le sélecteur de cible :

```typescript
hydrate({
  resolveComponent,
  target: '#admin-app',
})
```

Le côté SSR émet actuellement toujours `<div id="app">` ; si vous passez un `target` custom, surchargez le template SSR pour matcher (par ex. `#admin-app`). Quand le renderer ne trouve pas la cible au moment de l'hydratation, il lève `E_PHOTON_HYDRATION_NO_TARGET` — voir le [catalogue d'erreurs](/fr/reference/errors#e-photon-hydration-no-target).

### Ce qui livre par story

| Capacité | Story | Statut |
|---|---|---|
| `hydrate({ resolveComponent })` + router de clics | 44.1 | Actif |
| Mises a jour du `<head>` + décorateur `@Meta` | 44.2 | Actif |
| Catalogue d'erreurs + `docsUrl` sur chaque erreur Photon | 44.4 | Actif |

## Navigation SPA (détection côté serveur)

La convention de header `X-Photon: true` est détectée par `PhotonMiddleware`, et `photon.render()` répond directement à une telle requête par le payload JSON props-only — voir la section [Hydratation client](/fr/guides/frontend/photon/hydration#hydratation-client) ci-dessus pour le router côté navigateur qui émet ce header. Les props sont résolues une seule fois, selon le rechargement partiel demandé par le client : une prop qu'il n'a pas nommée ne voit jamais son resolver appelé, et ni le bundle SSR ni le document HTML ne sont construits pour une requête de props.

Aucune configuration supplémentaire n'est nécessaire. Photon gère la détection du header `X-Photon` et le changement de format de réponse de manière transparente.
