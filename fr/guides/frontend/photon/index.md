# Introduction

Ce guide couvre les pages pilotées par le serveur avec photon :

- Installation
- Configuration

Photon est le moteur de rendu serveur (SSR) de Ream avec hydratation cote client. Il supporte React, Vue et Svelte nativement, avec le HMR Vite en développement et des builds optimises pour la production.

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
distribuerait.

`buildDir` est résolu depuis la **racine de l'application**, que le provider
obtient via `app.makePath()` — et non depuis le répertoire où le processus a
démarré. Une application lancée par systemd, ou depuis la racine d'un monorepo,
trouve donc son build là où il est réellement. Posez `appRoot` explicitement
quand un déploiement range le build ailleurs : il prime sur ce que l'hôte
annonce.

## Étapes suivantes
- [Routing](/fr/guides/basics/routing) — Définir les routes qui rendent des pages Photon
- [Middleware](/fr/guides/basics/middleware) — Ajouter l'authentification avant le rendu
- [Warden (Auth)](/fr/guides/auth/introduction) — Protéger les pages avec des guards
