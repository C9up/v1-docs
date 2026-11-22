# Introduction

Ce guide couvre aurora, le modèle de composants réactifs :

- Installation
- Aurora vs Photon
- Référence bout en bout

Aurora est le runtime UI léger de Ream (`@c9up/aurora`) : DOM via tagged-templates, état basé sur des signaux, SSR isomorphe et hydration côté navigateur. Pas de JSX, pas de bundler dans l'app, pas de virtual DOM.

Aurora est **le même code côté serveur et navigateur**. Le package livre les sources TypeScript pour Node (transpilées à la volée par `@swc-node/register`) **et** un `dist/` pré-compilé en modules ES2022 que le navigateur charge directement via un importmap.

## Installation

```bash
pnpm add @c9up/aurora
ream configure @c9up/aurora
```

`ream configure @c9up/aurora` enregistre le provider, place en tête des
middlewares de routeur celui qui pose `ctx.aurora`, et écrit
`config/aurora.ts` — voir [Câblage](/fr/guides/frontend/aurora/shared-pages#cablage) pour l'équivalent à la main.

Le `dist/` du package est construit une fois au niveau framework (`pnpm -w build` à la racine de l'espace de travail) — les apps qui consomment `@c9up/aurora` n'ont pas besoin de bundler.

## Aurora vs Photon

| | Aurora | Photon |
|---|---|---|
| Authoring | Tagged-template literals | Composants React / Vue / Svelte |
| Build step (app) | Aucun | Vite |
| Taille runtime client | ~6 Ko | dépend du framework (~40 Ko+ React+ReactDOM) |
| État | Signaux (fine-grained) | Natif framework (hooks, refs, stores) |
| Hydration | Marche les chemins de templates parsés | Primitive hydrate du framework |
| Cas d'usage | Pages server-driven, dashboards, admin UIs | Apps SPA avec interaction riche |

Les deux coexistent — aurora pour tout ce qui n'a pas besoin de l'écosystème React, photon quand on en a besoin.

## Référence bout en bout

La démo kitchen-sink câble toute la stack avec `aurora.render()` :

- `reamrc.ts` — enregistre `@c9up/aurora/provider`
- `config/aurora.ts` — pointe le provider sur `resources/pages/`
- `resources/pages/ProjectPage.js` — page SSR + hydrate partagée utilisant `component()` + `signal()` + `onMount()` + `relay()`
- `app/modules/site/controllers/SiteController.ts` — `showProjectLive` se résume à un seul appel `aurora.render(ctx, 'ProjectPage', props)`

Pas d'`AssetController`, pas de script bootstrap client, pas d'importmap manuelle : le provider gère tout.

## Étapes suivantes
- [Photon](/fr/guides/frontend/photon/) — Quand il vous faut React / Vue / Svelte + Vite
- [Relay](/fr/guides/realtime/broadcasting) — Canaux realtime qui se marient à la surface réactive d'aurora
- [Démarrage rapide](/fr/start/tutorial) — Bootstrapper une app complète
