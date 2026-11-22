# Introduction

This guide covers aurora, the reactive component model:

- Installation
- Why aurora vs photon
- Reference end-to-end

Aurora is Ream's lightweight UI runtime (`@c9up/aurora`): tagged-template DOM, signal-based state, isomorphic SSR and client-side hydration. No JSX, no bundler in the app, no virtual DOM.

Aurora is the **same code on the server and in the browser**. The package ships TypeScript source for Node (transpiled on the fly by `@swc-node/register`) **and** a pre-built `dist/` of plain ES2022 modules that the browser can load directly through an importmap.

## Installation

```bash
pnpm add @c9up/aurora
ream configure @c9up/aurora
```

`ream configure @c9up/aurora` registers the provider, puts the middleware that
binds `ctx.aurora` first in the router middleware, and writes
`config/aurora.ts` — see [Wire it up](/en/guides/frontend/aurora/shared-pages#wire-it-up) for what that is by hand.

The package's `dist/` is built once at the framework level (`pnpm -w build` at the workspace root) — apps that consume `@c9up/aurora` don't need a bundler.

## Why aurora vs photon

| | Aurora | Photon |
|---|---|---|
| Authoring | Tagged-template literals | React / Vue / Svelte components |
| Build step (app) | None | Vite |
| Client runtime size | ~6 KB | framework-dependent (~40 KB+ React+ReactDOM) |
| State | Signals (fine-grained) | Framework-native (hooks, refs, stores) |
| Hydration | Walks parsed template paths | Framework hydrate primitive |
| Use case | Server-driven pages, dashboards, admin UIs | SPA-style apps with rich interaction |

The two coexist — aurora for everything that doesn't need React's ecosystem, photon when you do.

## Reference end-to-end

The kitchen-sink demo wires the full stack with `aurora.render()`:

- `reamrc.ts` — registers `@c9up/aurora/provider`
- `config/aurora.ts` — points the provider at `resources/pages/`
- `resources/pages/ProjectPage.js` — shared SSR + hydrate page using `component()` + `signal()` + `onMount()` + `relay()`
- `app/modules/site/controllers/SiteController.ts` — `showProjectLive` is one `aurora.render(ctx, 'ProjectPage', props)` call

No `AssetController`, no client-side bootstrap script, no manual importmap: the provider handles all of it.

## Next Steps
- [Photon](/en/guides/frontend/photon/) — When you need React / Vue / Svelte + Vite
- [Relay](/en/guides/realtime/broadcasting) — Realtime channels that pair with aurora's reactive surface
- [Quick Start](/en/start/tutorial) — Bootstrap a full app
