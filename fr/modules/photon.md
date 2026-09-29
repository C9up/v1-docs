# Photon — Rendu Frontend

Photon est le moteur de rendu serveur (SSR) de Ream avec hydratation cote client. Il supporte React, Vue et Svelte nativement, avec le HMR Vite en developpement et des builds optimises pour la production.

## Installation

```bash
pnpm add @c9up/photon
```

## Configuration

Enregistrez le middleware Photon dans votre application avec une `PhotonConfig` :

```typescript
import { PhotonMiddleware } from '@c9up/photon'

const photon = new PhotonMiddleware({
  framework: 'react',                    // 'react' | 'vue' | 'svelte'
  entryClient: 'resources/app.tsx',      // Point d'entree d'hydratation client
  ssr: {
    enabled: true,                       // Désactivé par défaut
    entrypoint: 'resources/ssr.tsx',     // Point d'entrée SSR
  },
  buildDir: 'public/build',              // Où le build client est écrit
  assetsUrl: '/build',                   // L'URL que le serveur statique lui donne
  ssrBuildDir: 'build/ssr',              // Le bundle SSR — jamais sous public/
  viteDevUrl: 'http://localhost:5173',   // URL du serveur de dev Vite (developpement uniquement)
})

// Enregistrement du middleware via .middleware()
router.use([photon.middleware()])
```

`buildDir` est un chemin sur disque et `assetsUrl` l'URL à laquelle il est
servi : le serveur statique retire `public/`, donc `public/build/app.js` devient
`/build/app.js`. Réglez les deux quand le build change de place, ou pointez
`assetsUrl` vers un CDN.

Le bundle SSR est du code serveur et va dans `ssrBuildDir`, que le boot refuse
à l'intérieur de `buildDir` ou de `public/` — partout où le serveur statique le
distribuerait. AdonisJS écrit ses points d'entrée serveur sous le dossier de
build public ; Photon s'en écarte volontairement.

`buildDir` est résolu depuis la **racine de l'application**, que le provider
obtient via `app.makePath()` — et non depuis le répertoire où le processus a
démarré. Une application lancée par systemd, ou depuis la racine d'un monorepo,
trouve donc son build là où il est réellement. Posez `appRoot` explicitement
quand un déploiement range le build ailleurs : il prime sur ce que l'hôte
annonce.

## Rendu des pages

Dans les handlers de route, utilisez `photon.render()` pour ecrire la reponse directement :

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

Photon effectue le rendu serveur du composant, injecte les props serialisees et envoie une page HTML complete. Cote client, le framework hydrate la page en une application interactive.

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

## Support des frameworks

### React (.tsx)

```tsx
// resources/views/Dashboard.tsx
interface DashboardProps {
  user: { id: string; name: string }
  stats: { orders: number; revenue: number }
}

export default function Dashboard({ user, stats }: DashboardProps) {
  return (
    <div>
      <h1>Bienvenue, {user.name}</h1>
      <p>Commandes : {stats.orders}</p>
      <p>Revenus : ${stats.revenue}</p>
    </div>
  )
}
```

### Vue (.vue)

```vue
<!-- resources/views/Dashboard.vue -->
<script setup lang="ts">
defineProps<{
  user: { id: string; name: string }
  stats: { orders: number; revenue: number }
}>()
</script>

<template>
  <div>
    <h1>Bienvenue, {{ user.name }}</h1>
    <p>Commandes : {{ stats.orders }}</p>
    <p>Revenus : ${{ stats.revenue }}</p>
  </div>
</template>
```

### Svelte

```svelte
<!-- resources/views/Dashboard.svelte -->
<script lang="ts">
  export let user: { id: string; name: string }
  export let stats: { orders: number; revenue: number }
</script>

<div>
  <h1>Bienvenue, {user.name}</h1>
  <p>Commandes : {stats.orders}</p>
  <p>Revenus : ${stats.revenue}</p>
</div>
```

## Configuration du projet Vite

Photon rend vos composants, mais c'est **Vite** qui les bundle. Au-delà de `config/photon.ts`, une app Photon a besoin d'un `vite.config.ts`, d'une entrée client, d'une entrée SSR et de vos pages. L'app [`kitchen-sink`](https://github.com/C9up/kitchen-sink) est la référence vérifiée pour React, Vue et Svelte.

### `vite.config.ts`

```typescript
import react from '@vitejs/plugin-react' // ou @vitejs/plugin-vue / @sveltejs/vite-plugin-svelte
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: true,
    outDir: 'public/build',   // doit être égal au `buildDir` de config/photon.ts
    emptyOutDir: false,       // les builds client + SSR partagent ce dossier
    copyPublicDir: false,     // OBLIGATOIRE — voir l'encadré ci-dessous
    rollupOptions: { input: 'resources/app.tsx' },
  },
})
```

> **`copyPublicDir: false` est obligatoire.** Le `buildDir` par défaut de Photon
> (`public/build`) est *à l'intérieur* du `publicDir` Vite par défaut (`public/`).
> Sans ce flag, Vite recopie `public/` dans la sortie de build de façon récursive
> et le build échoue avec `ENAMETOOLONG`. Photon sert les assets statiques
> lui-même : Vite ne doit pas copier le dossier public.

### Entrée client — `resources/app.tsx`

`createPhotonApp`, depuis le sous-chemin de ton framework, lit la page envoyée
par le serveur, la monte et démarre le routeur. `resolvePageComponent` découpe
chaque page en chunk via un `import.meta.glob` paresseux.

```tsx
import './app.css' // ton entrée CSS / Tailwind (optionnel)
import { createPhotonApp } from '@c9up/photon/react'
import { resolvePageComponent } from '@c9up/photon/client'

createPhotonApp({
  resolve: (name) =>
    resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
})
```

Sans `setup`, `App` est hydraté quand le serveur a rendu la page, et monté
sinon (SSR désactivé). Donne un `setup` pour envelopper `App` dans tes propres
providers, ou pour le monter toi-même :

```tsx
import { hydrateRoot } from 'react-dom/client'

createPhotonApp({
  resolve,
  setup({ el, App, props }) {
    hydrateRoot(el, <ThemeProvider><App {...props} /></ThemeProvider>)
  },
})
```

Vue et Svelte prennent les mêmes options. Le `setup` de Vue reçoit aussi
`plugin`, qui installe `$photon` (le routeur) et `$page` pour les templates :

```ts
// Vue — resources/app.ts
import { createSSRApp, h } from 'vue'
import { createPhotonApp } from '@c9up/photon/vue'

createPhotonApp({
  resolve: (name) => resolvePageComponent(`./pages/${name}.vue`, import.meta.glob('./pages/**/*.vue')),
  setup({ el, App, props, plugin }) {
    createSSRApp({ render: () => h(App, props) }).use(plugin).mount(el)
  },
})

// Svelte 5 — resources/app.ts
import { createPhotonApp } from '@c9up/photon/svelte'

createPhotonApp({
  resolve: (name) => resolvePageComponent(`./pages/${name}.svelte`, import.meta.glob('./pages/**/*.svelte')),
})
```

`App` rend la page affichée, puis celle que le routeur visite ensuite : une page
garde son propre état quand seules ses props changent — un groupe différé, un
rechargement partiel. Pour Svelte, `App` est `PhotonRoot`.

### Entrée SSR — `resources/ssr.tsx`

L'export par défaut de l'entrée SSR rend une page. `createPhotonApp`, à qui l'on
donne la `page`, renvoie `{ head, body }` : Photon écrit `body` dans
`<div id="app" data-server-rendered="true">`, à côté des données de la page et
des balises d'assets, et `head` dans `<head>`. L'`import.meta.glob` eager
embarque toutes les pages, si bien qu'un seul build SSR résout n'importe quelle
page par son nom.

```tsx
import { renderToString } from 'react-dom/server'
import { createPhotonApp } from '@c9up/photon/react'
import type { PhotonPageData } from '@c9up/photon/client'

const pages = import.meta.glob('./pages/**/*.tsx', { eager: true })

export default function render(page: PhotonPageData) {
  return createPhotonApp({
    page,
    render: renderToString,
    resolve: (name) => pages[`./pages/${name}.tsx`],
  })
}
```

Vue et Svelte ne diffèrent que par la façon de rendre l'app :

```ts
// Vue — resources/ssr.ts
import { renderToString } from 'vue/server-renderer'
import { createPhotonApp } from '@c9up/photon/vue'

export default function render(page) {
  return createPhotonApp({ page, render: renderToString, resolve: (name) => pages[`./pages/${name}.vue`] })
}

// Svelte 5 — resources/ssr.ts
import { render as renderSvelte } from 'svelte/server'
import { createPhotonApp } from '@c9up/photon/svelte'

export default function render(page) {
  return createPhotonApp({
    page,
    resolve: (name) => pages[`./pages/${name}.svelte`],
    setup: ({ App, props }) => renderSvelte(App, { props }),
  })
}
```

Le `setup` de Svelte est obligatoire côté serveur : importer `svelte/server`
dans Photon mettrait le rendu serveur dans chaque bundle client.

Une entrée peut aussi renvoyer une simple chaîne HTML, et exporter sa fonction
sous le nom `render` plutôt que par défaut.

### Choisir quelles pages sont rendues côté serveur

Le rendu serveur est désactivé tant que `ssr.enabled` ne vaut pas `true` ;
ensuite toutes les pages sont rendues côté serveur, sauf si `ssr.pages` restreint
le SSR à une liste de composants ou à un prédicat. Ce prédicat reçoit le contexte
HTTP, puis le nom du composant, si bien que la décision peut dépendre de la
requête (le contexte ne vaut `undefined` que pour un rendu hors du pipeline
HTTP) :

```ts
// config/photon.ts
export default defineConfig({
  ssr: {
    enabled: true,
    pages: (ctx, page) => {
      // Rendu serveur pour les robots, hydratation client pour les autres.
      const ua = ctx?.request.header('user-agent') ?? ''
      return /bot|crawler|spider/i.test(ua)
    },
  },
})
```

Le renderer reste une instance unique partagée entre les requêtes : le contexte
est un argument par appel, jamais stocké dessus, donc deux requêtes simultanées
ne peuvent pas voir celui de l'autre.

### Commandes de build

Deux builds Vite — le bundle client (avec le manifest) et le module SSR :

```json
{
  "scripts": {
    "build:client": "vite build",
    "build:ssr": "vite build --ssr resources/ssr.tsx --outDir build/ssr",
    "build:front": "pnpm build:client && pnpm build:ssr"
  }
}
```

Le build client écrit `public/build/.vite/manifest.json` (Vite 5+) — Photon le trouve automatiquement. Le build SSR écrit `build/ssr/ssr.js`, hors de tout dossier servi, que le renderer de Photon importe en production.

### Tailwind

Ajoutez `@tailwindcss/vite` aux `plugins[]` et `@import "tailwindcss";` à votre entrée CSS (importée depuis l'entrée client ci-dessus). Photon émet le `<link rel="stylesheet">` depuis le manifest automatiquement. Voir [Tailwind CSS](./tailwind.md).

## Mode dev — Vite HMR

En developpement, Photon proxifie les assets via le serveur de dev Vite pour un hot module replacement instantane. Aucun redemarrage manuel necessaire lors de la modification des composants.

```typescript
// config/photon.ts
import { defineConfig } from '@c9up/photon'

export default defineConfig({
  framework: 'react',
  entryClient: 'resources/app.tsx',
  ssr: { enabled: true, entrypoint: 'resources/ssr.tsx' },
  buildDir: 'public/build',
  viteDevUrl: 'http://localhost:5173',
})
```

Quand `viteDevUrl` est defini (developpement), Photon :
- Charge les assets depuis le serveur Vite en cours d'execution
- Injecte le client HMR Vite dans les reponses SSR
- Retombe sur le manifest de production hors developpement

### Rendu serveur en développement

Le développement rend aussi côté serveur. La production charge le bundle SSR
produit par un build ; il n'y en a pas en dev, donc Photon compile
`ssr.entrypoint` via Vite à chaque rendu — une modification d'un composant de page
apparaît sans redémarrer le processus.

Vite est un **peer optionnel** : installez-le pour en bénéficier, et sans lui le
dev retombe sur la coque client seule. Photon ne démarre le compilateur que si
`ssr.enabled` vaut `true`, donc un projet qui rend uniquement côté client ne paie
rien pour cela. Activé sans fichier à `ssr.entrypoint`, chaque rendu serveur
échoue avec `E_PHOTON_SSR_LOAD_FAILED` au lieu de servir la coque en silence.

```bash
npm install -D vite
```

## Hydratation client

`createPhotonApp` (plus haut) est l'entrée client d'une app. En dessous,
`hydrate()` de `@c9up/photon/client` fait la même chose sans sous-chemin de
framework : il choisit l'adapteur du framework d'après les données de la page
et monte lui-même le composant de page. Utilise-le quand tu n'as pas besoin de
`setup` :

```typescript
// resources/app.tsx (React)
import { hydrate } from '@c9up/photon/client'

const pages = import.meta.glob('./pages/*.tsx')

hydrate({
  resolveComponent: async (name) => {
    const loader = pages[`./pages/${name}.tsx`]
    if (!loader) throw new Error(`Page inconnue : ${name}`)
    return (await loader()) as { default: unknown }
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
   - **Svelte** — `hydrate(Component, { target, props })`, ou `mount(…)` (Svelte 5+). Passe `svelteRoot: PhotonRoot` pour qu'une page garde son état quand ses props changent.
5. Installe un listener `click` + `popstate` au niveau du document (le router SPA-nav ci-dessous).
6. Appelle `onHydrated()` si tu en fournis un.

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

1. Entrée client : remplace `hydrate({ resolveComponent })` par
   `createPhotonApp({ resolve })` depuis le sous-chemin de ton framework.
   `resolve` peut renvoyer le composant ou son module, directement ou en
   promesse.
2. Entrée SSR : exporte `render(page)` par défaut et renvoie
   `createPhotonApp({ page, render, resolve })` (Svelte : `setup` au lieu de
   `render`). L'enveloppe `PhotonPage` / `PhotonRoot` écrite à la main
   disparaît : `App` fournit la page à `usePage()` côté serveur.
3. Config : `ssr: { enabled: true, entrypoint: 'resources/ssr.tsx' }` remplace
   `entryServer` — le rendu serveur est désactivé tant qu'il n'est pas activé.

### Navigation SPA

Photon intercepte les clics gauches sur les `<a>` internes, fetch la destination avec le header `X-Photon: true`, parse la réponse JSON props-only et permute la racine montée. Les boutons précédent/suivant du navigateur restaurent les pages précédentes depuis `history.state`.

Un clic est intercepté **uniquement** quand TOUTES ces conditions tiennent :

- Bouton gauche de la souris (pas clic milieu / droit).
- Aucune touche modificatrice (Ctrl, Cmd, Shift, Alt) — sinon le comportement par défaut du navigateur (nouvel onglet / sauvegarder le lien) gagne.
- L'ancre a un `href`, pas d'attribut `download`, et pas de `target` autre que `_self` / `''`.
- L'URL résolue est **same-origin** avec un protocole `http:` / `https:` (pas `mailto:`, `tel:`, `javascript:`, `blob:`, `data:`).
- L'ancre n'est PAS opt-out via `data-photon="external"`.

Opt-out par lien :

```html
<a href="/une-page-interne" data-photon="external">Forcer un rechargement complet</a>
```

Si le fetch SPA-nav échoue (réponse non-2xx, mauvais `Content-Type`, JSON malformé, URL cross-origin retournée par le serveur, adapteur qui throw), Photon retombe sur `location.href = url` — l'utilisateur arrive toujours sur la page cliquée, même si l'interactivité est cassée.

**Navigation concurrente :** les double-clics rapides (lien A puis lien B avant que la réponse de A arrive) sont dédupliqués — seule la dernière navigation gagne ; les réponses obsolètes sont jetées.

**Clics sur la même URL** utilisent `history.replaceState` plutôt que `pushState`, donc les clics répétés sur le même lien ne gonflent pas l'historique de retour.

**Les `<a>` SVG ne sont PAS interceptés** — `SVGAElement` a une forme `href` différente (`SVGAnimatedString`), donc les ancres SVG retombent sur le comportement par défaut du navigateur. Si tu veux du SPA-nav depuis un lien d'icône SVG, enveloppe-le dans un `<a>` HTML.

**Apps en sous-chemin** avec un élément `<base href="/admin/">` dans le document sont gérées correctement : les ancres relatives sont résolues contre `document.baseURI` plutôt que `location.href`.

### Naviguer depuis le code — `router`

`@c9up/photon/client` exporte un `router` qui a la forme de celui d'Inertia : du
code écrit pour `@inertiajs/core` se lit de la même façon.

```ts
import { router } from '@c9up/photon/client'

router.visit('/orders')                          // comme un clic sur un lien
router.visit('/orders?page=2', { replace: true }) // remplace l'entrée d'historique
router.reload({ only: ['stats'] })               // partiel : seulement ces props
router.reload({ except: ['auditLogs'] })
router.reload({ only: ['rows'], reset: ['rows'] }) // remplacer, pas combiner
router.visit('/login', { errorBag: 'login' })    // cibler les erreurs de validation
```

Les visites prennent les callbacks d'Inertia — `onBefore` (renvoyer `false`
annule), `onBeforeUpdate`, `onSuccess`, `onFinish` — ainsi que `data` (paramètres
de query), `preserveUrl` et `preserveErrors`. Le routeur a aussi
`router.on('success', cb)` (renvoie la fonction qui arrête l'écoute),
`router.remember(data, key)` / `router.restore(key)` pour un état gardé dans
l'entrée d'historique de la page, et `router.replace({ url })` pour changer
l'adresse sans requête.

Un rechargement partiel (`only`, `except` ou `reset`) fusionne la réponse dans la
page affichée sans la remonter ; les props non demandés gardent leur valeur, et
il prend les `errors` du serveur. `reload()` envoie `Cache-Control: no-cache`.
Une URL d'une autre origine est une navigation complète. Un écart avec Inertia :
les deux méthodes renvoient une promesse, résolue une fois la page appliquée,
qu'on peut donc attendre ; l'ignorer, comme le fait le code Inertia, marche aussi.

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

Le point d'entrée `hydrate()` lance `PhotonClientError` (re-exporté depuis `@c9up/photon/client`). Attrape-le via `instanceof` et inspecte le `code` :

| Code | Quand |
|---|---|
| `E_PHOTON_HYDRATION_NO_DATA` | Le bloc `<script id="photon-data">` est absent — la page n'a pas été rendue via `PhotonRenderer`. |
| `E_PHOTON_HYDRATION_BAD_DATA` | Le JSON page-data est malformé ou de mauvaise forme (manque `framework`, `component` vide, etc.). |
| `E_PHOTON_HYDRATION_NO_TARGET` | Le sélecteur de mount (`#app` par défaut) n'a matché aucun nœud DOM. |
| `E_PHOTON_HYDRATION_UNSUPPORTED_FRAMEWORK` | `framework` vaut autre chose que `react` / `vue` / `svelte`. |
| `E_PHOTON_HYDRATION_ADAPTER_LOAD_FAILED` | Le runtime du framework (`react-dom/client`, `vue`, `svelte`) n'a pas pu être importé — généralement une étape `pnpm add` manquante. |
| `E_PHOTON_UNKNOWN_PAGE` | Le `resolve` de `createPhotonApp` n'a rien renvoyé pour un nom de page. |

### Apps en sous-chemin et cible de mount personnalisée

Tu héberges Photon sous un sous-chemin ? Override le sélecteur de cible :

```typescript
hydrate({
  resolveComponent,
  target: '#admin-app',
})
```

Le côté SSR émet actuellement toujours `<div id="app">` ; si tu passes un `target` custom, override le template SSR pour matcher (par ex. `#admin-app`). Quand le renderer ne trouve pas la cible au moment de l'hydratation, il lève `E_PHOTON_HYDRATION_NO_TARGET` — voir le [catalogue d'erreurs](../errors/#photon-hydration-no-target).

### Ce qui livre par story

| Capacité | Story | Statut |
|---|---|---|
| `hydrate({ resolveComponent })` + router de clics | 44.1 | Actif |
| Mises a jour du `<head>` + decorateur `@Meta` | 44.2 | Actif |
| Catalogue d'erreurs + `docsUrl` sur chaque `PhotonError` / `PhotonClientError` | 44.4 | Actif |

## Navigation SPA (détection côté serveur)

La convention de header `X-Photon: true` est détectée par `PhotonMiddleware` et convertit la réponse SSR en payload JSON props-only — voir la section [Hydratation client](#hydratation-client) ci-dessus pour le router côté navigateur qui émet ce header.

Aucune configuration supplementaire n'est necessaire. Photon gere la detection du header `X-Photon` et le changement de format de reponse de maniere transparente.

## Build de production

Lancez les deux builds Vite de [Commandes de build](#commandes-de-build), puis démarrez l'app avec `NODE_ENV=production` :

```bash
pnpm build:front   # vite build  +  vite build --ssr … --outDir build/ssr
NODE_ENV=production pnpm start
```

Cela produit :
- Le module SSR à `build/ssr/ssr.js` (importé par le processus Ream, jamais servi)
- Le bundle client avec code splitting + assets hachés
- `public/build/.vite/manifest.json` associant l'entrée à ses chunks

En production (`viteDevUrl` ignoré), Photon sert les assets pré-construits depuis `buildDir` sans surcharge Vite — il lit le manifest et injecte les balises `<script type="module">` / `<link rel="stylesheet">` correspondantes.

## SEO et gestion du `<head>`

Photon offre un controle par route sur `<title>`, `<meta>` description, Open Graph, Twitter Cards, URLs canoniques et tags arbitraires personnalises. Les tags se composent en quatre couches (la plus a droite gagne par champ feuille) : `defaultMeta` → decorateur `@Meta` → `ctx.photon.meta()` → argument explicite `render(comp, props, meta)`.

### API imperative — `ctx.photon.meta()`

Dans un handler de route, accumulez les tags avant le rendu :

```ts
router.get('/articles/:slug', async ({ params, photon }) => {
  const article = await loadArticle(params.slug)
  photon.meta({
    title: article.title,
    description: article.summary,
    canonical: `https://example.com/articles/${article.slug}`,
    og: {
      title: article.title,
      description: article.summary,
      image: article.coverUrl,
      type: 'article',
    },
    twitter: { card: 'summary_large_image' },
  })
  return photon.render('ArticleShow', { article })
})
```

Les appels multiples a `meta()` se fusionnent en profondeur. Les sous-objets `og` et `twitter` se fusionnent champ par champ (PAS de remplacement d'objet).

### Decorateur — `@Meta()`

`@Meta()` attache des metadonnees declarativement a une methode de controleur. Le middleware les lit depuis `ctx.route` (prototype du controleur + nom d'action) et amorce l'accumulateur avant l'execution du handler.

```ts
import { Meta } from '@c9up/photon'

class HomeController {
  @Meta({ title: 'Accueil', description: 'Bienvenue' })
  async index({ photon }) {
    return photon.render('Home', {})
  }

  // Forme factory — recoit le contexte de la requete.
  @Meta((ctx) => ({ title: `Profil — ${ctx.params.user}` }))
  async show({ photon }) {
    return photon.render('Profile', {})
  }
}
```

Les appels imperatifs `ctx.photon.meta()` dans le handler conservent la priorite sur les valeurs du decorateur.

### Defauts a l'echelle de l'app — `defaultMeta`

Dans `config/photon.ts` :

```ts
import { defineConfig } from '@c9up/photon'

export default defineConfig({
  framework: 'react',
  entryClient: 'resources/app.tsx',
  defaultMeta: {
    og: { siteName: 'Example', locale: 'fr_FR' },
    twitter: { site: '@example' },
    robots: 'index,follow',
  },
})
```

Les valeurs par route fusionnent par-dessus ces defauts.

### Precedence

Couches, de la plus basse a la plus haute :

| Couche | Source | Quand |
|---|---|---|
| 1 | `config.defaultMeta` | Defauts globaux de l'app |
| 2 | Decorateur `@Meta(...)` | Par methode de controleur |
| 3 | `ctx.photon.meta(...)` | Imperatif, plusieurs appels fusionnent en profondeur |
| 4 | `render(comp, props, meta)` | Override explicite a l'appel render |

Les sous-objets `og` / `twitter` fusionnent champ par champ ; les tableaux `keywords` et `custom` concatenent puis dedoublonnent.

### Securite XSS

Chaque valeur textuelle (`title`, `description`, og:*, twitter:*, `content` custom) passe par un echappeur d'attribut HTML qui remplace `&`, `<`, `>`, `"`, `'`. Un titre controle par l'utilisateur contenant `<script>...</script>` est rendu en toute securite comme `&lt;script&gt;...&lt;/script&gt;`. **Jamais** desactive — il n'y a pas d'opt-out, par design.

## Reference PhotonConfig

| Propriete | Type | Defaut | Description |
|---|---|---|---|
| `framework` | `'react' \| 'vue' \| 'svelte'` | — | Framework frontend a utiliser |
| `entryClient` | `string` | — | Chemin vers le point d'entree d'hydratation client (ex. `'resources/app.tsx'`) |
| `buildDir` | `string` | `'public/build'` | Où le build client est écrit, sur disque |
| `assetsUrl` | `string` | `'/build'` | URL d'où le build client est servi (chemin depuis la racine ou URL http(s)) |
| `ssrBuildDir` | `string` | `'build/ssr'` | Où le bundle SSR est écrit ; refusé dans `buildDir` ou `public/` |
| `viteDevUrl` | `string` | `'http://localhost:5173'` | URL du serveur de dev Vite (developpement uniquement) |
| `defaultMeta` | `MetaTags` | — | Tags `<head>` par defaut a l'echelle de l'app (44.2) |
| `ssr.enabled` | `boolean` | `false` | Rendre les pages côté serveur |
| `ssr.entrypoint` | `string` | `'resources/ssr.tsx'` | Chemin vers le point d'entrée SSR |
| `ssr.pages` | `string[] \| (ctx, page) => boolean \| Promise<boolean>` | toutes les pages | Les pages rendues côté serveur |
| `encryptHistory` | `boolean` | `false` | Chiffrer l'historique de chaque page ; `ctx.photon.encryptHistory(false)` le désactive pour une réponse |
| `assetsVersion` | `string \| number` | empreinte du manifest | Une version d'assets fixe, envoyée avec chaque page |

## Erreurs

Photon lève `PhotonError` (côté serveur, depuis `@c9up/photon`) et `PhotonClientError` (côté navigateur, depuis `@c9up/photon/client`). Les deux portent un `code`, un `hint` optionnel, un `context: Record<string, unknown>` optionnel, et un `docsUrl` qui résout l'ancre matchante dans le [catalogue d'erreurs Photon](../errors/#erreurs-photon). Le `docsUrl` est énumérable sur l'instance d'erreur, donc les pipelines de log-shipping (Sentry, Datadog, vanilla `JSON.stringify`) l'embarquent sans configuration supplémentaire.

```ts
try {
  await renderer.boot()
} catch (err) {
  if (err instanceof PhotonError) {
    console.error(`[${err.code}] ${err.message}`)
    console.error(`Docs: ${err.docsUrl}`)
  }
  throw err
}
```

Voir le [catalogue complet](../errors/#erreurs-photon) pour cause + fix par code.

## Etapes suivantes

- [Routing](/fr/guide/routing) — Definir les routes qui rendent des pages Photon
- [Middleware](/fr/guide/middleware) — Ajouter l'authentification avant le rendu
- [Warden (Auth)](/fr/modules/warden) — Proteger les pages avec des guards

## Helpers de props

Un contrôleur Inertia migré appelle les mêmes helpers — l'implémentation est la
nôtre, la surface est la leur.

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
  lent échouer sans emporter tout le rechargement.
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

Lors d'un rechargement partiel — un groupe différé, `router.reload({ only })` —
les props étiquetés `merge`, `merge().prepend()` ou `deepMerge` sont combinés
avec ce que la page tient, en suivant `matchOn` ; une visite complète les
remplace, comme dans Inertia.

Une valeur `once` est gardée par la page qui l'a reçue : chaque requête annonce
les clés encore tenues et non expirées (`x-photon-except-once-props`), le serveur
ne les résout pas, et le routeur remet sa copie avec sa première échéance.

Un prop `scroll` se pagine depuis la page avec `useInfiniteScrollData`, la
moitié « données » du défilement infini d'Inertia, sous les mêmes noms :

```ts
import { useInfiniteScrollData } from '@c9up/photon/client'

const users = useInfiniteScrollData({ getPropName: () => 'users' })
if (users.hasNext()) await users.fetchNext()   // ?page=N, lignes ajoutées après
if (users.hasPrevious()) await users.fetchPrevious() // lignes ajoutées avant
```

Chaque appel est un rechargement partiel du prop ; la barre d'adresse ne bouge
pas, et une page `null` d'un côté arrête les requêtes. Un rechargement avec
`reset: ['users']` remet le curseur à zéro.

`useInfiniteScroll` le branche sur la page, comme celui d'Inertia : il charge un
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

## Composants par framework

`@c9up/photon/react`, `@c9up/photon/vue` et `@c9up/photon/svelte` exportent les
composants de `@inertiajs/react`, `@inertiajs/vue3` et `@inertiajs/svelte`,
avec les mêmes props et slots : `usePage`, `Deferred`, `WhenVisible` et
`InfiniteScroll`. Chaque sous-chemin n'est importé que par une app de ce
framework.

```tsx
import { Deferred, InfiniteScroll, WhenVisible } from '@c9up/photon/react'

<Deferred data="stats" fallback={<Spinner />}>
  {({ reloading }) => <Stats stats={stats} dimmed={reloading} />}
</Deferred>

<WhenVisible data="comments" fallback={<p>Chargement des commentaires…</p>}>
  <Comments comments={comments} />
</WhenVisible>

<InfiniteScroll data="users" loading={<Spinner />}>
  {users.data.map((user) => <UserRow key={user.id} user={user} />)}
</InfiniteScroll>
```

```vue
<Deferred data="stats">
  <template #fallback><Spinner /></template>
  <template #default="{ reloading }"><Stats :stats="stats" :dimmed="reloading" /></template>
</Deferred>
```

`usePage()` lit le routeur dans le navigateur. Côté serveur il n'y a pas de
routeur : l'`App` de `createPhotonApp` fournit la page. Une entrée SSR qui rend
le composant de page à la main la transmet elle-même :

```tsx
// React — resources/ssr.tsx
import { PhotonPage } from '@c9up/photon/react'
return renderToString(
  createElement(PhotonPage, { page: pageData }, createElement(mod.default, pageData.props)),
)

// Vue — resources/ssr.ts
import { PhotonPage } from '@c9up/photon/vue'
const app = createSSRApp({ render: () => h(PhotonPage, { page: pageData }, () => h(Page, pageData.props)) })

// Svelte — PhotonRoot prend aussi la page entière
svelteRender(PhotonRoot, { props: { component, props: pageData.props, page: pageData } })
```

`Link` est aussi là dans les trois frameworks, avec les props d'Inertia
(`href`, `method`, `data`, `replace`, `only`, `except`, `headers`,
`preserveState`, …) : une ancre que le routeur suit, ou — pour toute méthode
autre que GET — un bouton, comme en amont. Le préchargement n'est pas pris en
charge (Photon ne garde pas de cache de visites).

```tsx
<Link href="/orders" data={{ status: 'open' }}>Commandes ouvertes</Link>
<Link href={`/orders/${id}`} method="delete" onSuccess={() => toast('Supprimée')}>Supprimer</Link>
```

Comme dans `@adonisjs/inertia`, `Link`, `Form` et le routeur prennent aussi une
**route nommée** : `route`, `routeParams`, `qs`, et la méthode de la route sauf
si `method` est donné. Les routes sont celles de Ream, transmises une fois au
navigateur :

```ts
import { setRoutes, router } from '@c9up/photon/client'
setRoutes(routes) // router.namedRoutes() côté serveur (chemins + méthodes)

<Link route="users.show" routeParams={{ id: user.id }}>Profil</Link>
<Form route="users.update" routeParams={{ id: user.id }}>…</Form>   // PUT
router.visit({ route: 'users.update', routeParams: { id } }, { data })
```

`router.namedManifest()` marche aussi, chaque route étant alors un GET. `Form`
prend aussi `action={{ url, method }}`. Augmentez `PhotonRoutes` avec la table
qu'écrit `router.generateTypes()` et les noms comme les params sont vérifiés :

```ts
declare module '@c9up/photon/client' {
  interface PhotonRoutes extends RouteParams {}
}
```

Adonis transmet ses routes par un `TuyauProvider` ; Photon les fixe une fois
pour le module — ce sont celles de l'application, les mêmes sur chaque page.
L'entrée client peut résoudre ses pages avec
`resolvePageComponent(name, import.meta.glob('./pages/**/*.tsx'))`, le helper
d'Adonis.

Les visites autres que GET passent aussi par le routeur — `router.post(url, data)`,
`put`, `patch`, `delete`, ou `visit(url, { method, data })`. Les données partent
en JSON, ou en multipart dès qu'elles contiennent un fichier (`forceFormData`
pour l'imposer), avec le cookie `XSRF-TOKEN` renvoyé en `X-XSRF-TOKEN`. Une page
qui revient avec des erreurs de validation (ciblées par `errorBag`) appelle
`onError` au lieu de `onSuccess`. Une mutation en échec laisse la page telle
quelle plutôt que de recharger son URL en GET.

Les formulaires fonctionnent comme dans Inertia. `useForm` tient les données,
les erreurs et l'état de soumission d'un formulaire — `form.data` et
`form.setData` en React, les champs au premier niveau en Vue et Svelte
(`v-model="form.email"`, `bind:value={form.email}`) :

```ts
const form = useForm({ email: '', password: '' })
form.post('/login', { onSuccess: () => form.reset('password') })
// form.errors.email · form.processing · form.isDirty · form.wasSuccessful
// form.recentlySuccessful · form.transform(fn) · form.cancel() · useForm('Login', {...})
```

`<Form>` lit ses données dans ses propres champs à la soumission et donne le
même état à ses enfants :

```tsx
<Form action="/login" method="post" resetOnSuccess={['password']}>
  {({ errors, processing }) => (
    <>
      <input name="email" />
      {errors.email && <p>{errors.email}</p>}
      <button disabled={processing}>Se connecter</button>
    </>
  )}
</Form>
```

Deux parties des formulaires d'Inertia ne sont pas portées : Laravel
Precognition (validation en direct contre un endpoint Laravel), et la
`progress` d'envoi, qui reste `null` parce que le routeur envoie avec `fetch`.

## Erreurs de validation

`props.errors` est partagé avec chaque page, pour qu'un composant de formulaire
lise `errors.email` sans garde. L'en-tête `x-photon-error-bag` les cadre, ce qui
permet à deux formulaires d'une même page de garder leurs messages séparés.

## Champs au niveau réponse

```ts
ctx.photon.clearHistory()        // à appeler au logout
ctx.photon.encryptHistory()         // ou pour chaque page : encryptHistory: true dans la config
ctx.photon.flash(() => ctx.session.flashMessages.all())
```

`clearHistory` compte au logout : sans lui, le bouton retour rejoue des pages
construites avec les données de la session précédente, depuis le cache du client.

Le routeur garde chaque page dans `history.state`. Avec `encryptHistory`, cette
copie est chiffrée en AES-GCM sous une clé gardée dans `sessionStorage` ;
`clearHistory` supprime la clé, donc toute entrée antérieure devient illisible et
le bouton retour — ou une page restaurée depuis le cache avant-arrière — recharge
l'URL depuis le serveur. Deux écarts volontaires avec le client d'Inertia : un IV
aléatoire par entrée (Inertia en réutilise un par clé), et sans Web Crypto (page
non servie en HTTPS) rien n'est rangé plutôt que la page en clair.

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
