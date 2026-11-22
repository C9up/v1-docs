# Vite

Ce guide couvre la configuration de Vite, le mode dev et le build de production :

- Configuration du projet Vite
- Mode dev — Vite HMR
- Build de production

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

Ajoutez `@tailwindcss/vite` aux `plugins[]` et `@import "tailwindcss";` à votre entrée CSS (importée depuis l'entrée client ci-dessus). Photon émet le `<link rel="stylesheet">` depuis le manifest automatiquement. Voir [Tailwind CSS](/fr/guides/frontend/tailwind).

## Mode dev — Vite HMR

En développement, Photon proxifie les assets via le serveur de dev Vite pour un hot module replacement instantané. Aucun redémarrage manuel nécessaire lors de la modification des composants.

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

En développement, Photon :
- Charge les assets depuis le serveur de dev Vite à `viteDevUrl`
- Injecte le client HMR Vite dans les réponses SSR

Le développement n'est jamais supposé. Il s'applique sous `ream dev` (qui pose
`REAM_DEV=true`), quand `NODE_ENV` désigne le développement ou les tests
(`development`, `dev`, `develop`, `test`, `testing`, quelle que soit la casse),
ou quand la config dit `dev: true`. Tout le reste — `NODE_ENV` absent, `prod`,
`staging` — sert les assets construits depuis le manifest : un déploiement qui
n'a jamais posé `NODE_ENV` ne charge pas ses scripts depuis `localhost`.
`dev: false` force le build.

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

## Build de production

Lancez les deux builds Vite de [Commandes de build](/fr/guides/frontend/vite#commandes-de-build), puis démarrez l'app avec `NODE_ENV=production` :

```bash
pnpm build:front   # vite build  +  vite build --ssr … --outDir build/ssr
NODE_ENV=production pnpm start
```

Cela produit :
- Le module SSR à `build/ssr/ssr.js` (importé par le processus Ream, jamais servi)
- Le bundle client avec code splitting + assets hachés
- `public/build/.vite/manifest.json` associant l'entrée à ses chunks

En production (`viteDevUrl` ignoré), Photon sert les assets pré-construits depuis `buildDir` sans surcharge Vite — il lit le manifest et injecte les balises `<script type="module">` / `<link rel="stylesheet">` correspondantes.
