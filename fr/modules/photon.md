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
  entryServer: 'resources/ssr.tsx',      // Point d'entree SSR
  buildDir: 'public/build',              // Repertoire de sortie pour les assets de production
  viteDevUrl: 'http://localhost:5173',   // URL du serveur de dev Vite (developpement uniquement)
})

// Enregistrement du middleware via .middleware()
router.use([photon.middleware()])
```

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

Un seul appel au `hydrate()` de Photon. Le `import.meta.glob` paresseux code-split chaque page.

```tsx
import './app.css' // votre entrée CSS / Tailwind (optionnel)
import { hydrate } from '@c9up/photon/client'

const pages = import.meta.glob<{ default: unknown }>('./pages/*.tsx')

hydrate({
  resolveComponent: async (name) => {
    const loader = pages[`./pages/${name}.tsx`]
    if (!loader) throw new Error(`Page inconnue : ${name}`)
    return await loader()
  },
})
```

### Entrée SSR — `resources/ssr.tsx`

**C'est vous** qui écrivez le rendu serveur : il exporte `render(pageData)` qui renvoie le HTML interne, que Photon enveloppe dans `<div id="app">…</div>` et associe au bloc page-data + aux balises d'assets. `import.meta.glob(..., { eager: true })` bundle chaque page pour qu'un seul build SSR résolve n'importe quel composant par son nom.

```tsx
import { type ComponentType, createElement } from 'react'
import { renderToString } from 'react-dom/server'

const pages = import.meta.glob<{ default: ComponentType }>('./pages/*.tsx', { eager: true })

interface PageData { component: string; props: Record<string, unknown> }

export function render(pageData: PageData): string {
  const mod = pages[`./pages/${pageData.component}.tsx`]
  if (!mod) throw new Error(`Page inconnue : ${pageData.component}`)
  return renderToString(createElement(mod.default, pageData.props))
}
```

Vue et Svelte ne diffèrent que par cette entrée :

```ts
// Vue — resources/ssr.ts
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
export async function render(pageData) {
  const app = createSSRApp(pages[`./pages/${pageData.component}.vue`].default, pageData.props)
  return await renderToString(app)
}

// Svelte 5 — resources/ssr.ts
import { render as svelteRender } from 'svelte/server'
export function render(pageData) {
  return svelteRender(pages[`./pages/${pageData.component}.svelte`].default, { props: pageData.props }).body
}
```

### Commandes de build

Deux builds Vite — le bundle client (avec le manifest) et le module SSR :

```json
{
  "scripts": {
    "build:client": "vite build",
    "build:ssr": "vite build --ssr resources/ssr.tsx --outDir public/build/ssr",
    "build:front": "pnpm build:client && pnpm build:ssr"
  }
}
```

Le build client écrit `public/build/.vite/manifest.json` (Vite 5+) — Photon le trouve automatiquement. Le build SSR écrit `public/build/ssr/ssr.js`, que le renderer de Photon importe en production.

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
  entryServer: 'resources/ssr.tsx',
  buildDir: 'public/build',
  viteDevUrl: 'http://localhost:5173',
})
```

Quand `viteDevUrl` est defini (developpement), Photon :
- Charge les assets depuis le serveur Vite en cours d'execution
- Injecte le client HMR Vite dans les reponses SSR
- Retombe sur le manifest de production hors developpement

## Hydratation client

Photon livre un point d'entrée navigateur en un seul appel qui reprend le DOM rendu côté serveur et démarre un router SPA-nav minimal. Importe-le une fois depuis ton entrée client, Photon possède le reste :

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
4. Dispatche vers l'adapteur correspondant :
   - **React** — `react-dom/client.hydrateRoot(target, createElement(Component, props))`.
   - **Vue** — `createSSRApp(Component, props).mount(target)` (PAS `createApp` — `createSSRApp` réutilise le markup SSR au lieu de l'écraser).
   - **Svelte** — `hydrate(Component, { target, props })` (Svelte 5+).
5. Installe un listener `click` + `popstate` au niveau du document (le router SPA-nav ci-dessous).
6. Appelle `onHydrated()` si tu en fournis un.

### `HydrateOptions`

| Propriété | Type | Défaut | Description |
|---|---|---|---|
| `resolveComponent` | `(name: string) => Promise<{ default: unknown }>` | — | Associe un nom de composant à son module. Habituellement adossé à `import.meta.glob`. |
| `target` | `string` | `'#app'` | Sélecteur CSS du nœud racine SSR. |
| `onHydrated` | `() => void` | — | Se déclenche une fois après que la primitive `hydrate` du framework a résolu. |

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
| `PHOTON_HYDRATION_NO_DATA` | Le bloc `<script id="photon-data">` est absent — la page n'a pas été rendue via `PhotonRenderer`. |
| `PHOTON_HYDRATION_BAD_DATA` | Le JSON page-data est malformé ou de mauvaise forme (manque `framework`, `component` vide, etc.). |
| `PHOTON_HYDRATION_NO_TARGET` | Le sélecteur de mount (`#app` par défaut) n'a matché aucun nœud DOM. |
| `PHOTON_HYDRATION_UNSUPPORTED_FRAMEWORK` | `framework` vaut autre chose que `react` / `vue` / `svelte`. |
| `PHOTON_HYDRATION_ADAPTER_LOAD_FAILED` | Le runtime du framework (`react-dom/client`, `vue`, `svelte`) n'a pas pu être importé — généralement une étape `pnpm add` manquante. |

### Apps en sous-chemin et cible de mount personnalisée

Tu héberges Photon sous un sous-chemin ? Override le sélecteur de cible :

```typescript
hydrate({
  resolveComponent,
  target: '#admin-app',
})
```

Le côté SSR émet actuellement toujours `<div id="app">` ; si tu passes un `target` custom, override le template SSR pour matcher (par ex. `#admin-app`). Quand le renderer ne trouve pas la cible au moment de l'hydratation, il lève `PHOTON_HYDRATION_NO_TARGET` — voir le [catalogue d'erreurs](../errors/#photon-hydration-no-target).

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
pnpm build:front   # vite build  +  vite build --ssr … --outDir public/build/ssr
NODE_ENV=production pnpm start
```

Cela produit :
- Le module SSR à `public/build/ssr/ssr.js` (importé par le processus Ream)
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
  entryServer: 'resources/ssr.tsx',
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

### Limitation : pas de mise a jour du `<head>` en SPA-nav pour l'instant

Le router SPA-nav de 44.1 echange le contenu de `<div id="app">` mais ne met PAS a jour `<head>` lors de la navigation cote client. Le rendu SSR initial porte les bons tags ; la navigation in-browser suivante conserve le head de la premiere page jusqu'a un rechargement complet. La synchronisation `<head>` en SPA est une story de suivi (lire le payload `pageData.meta` et patcher le head du document).

## Reference PhotonConfig

| Propriete | Type | Defaut | Description |
|---|---|---|---|
| `framework` | `'react' \| 'vue' \| 'svelte'` | — | Framework frontend a utiliser |
| `entryClient` | `string` | — | Chemin vers le point d'entree d'hydratation client (ex. `'resources/app.tsx'`) |
| `entryServer` | `string` | — | Chemin vers le point d'entree SSR (ex. `'resources/ssr.tsx'`) |
| `buildDir` | `string` | `'public/build'` | Repertoire de sortie pour les assets de production |
| `viteDevUrl` | `string` | `'http://localhost:5173'` | URL du serveur de dev Vite (developpement uniquement) |
| `defaultMeta` | `MetaTags` | — | Tags `<head>` par defaut a l'echelle de l'app (44.2) |

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
