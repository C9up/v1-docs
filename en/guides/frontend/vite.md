# Vite

This guide covers the Vite setup, dev mode and the production build:

- Vite Project Setup
- Dev Mode — Vite HMR
- Production Build

## Vite Project Setup

Photon renders your framework components, but **Vite** bundles them. Beyond `config/photon.ts` a Photon app needs a `vite.config.ts`, a client entry, an SSR entry, and your pages. The [`kitchen-sink`](https://github.com/C9up/kitchen-sink) app is the verified reference for React, Vue, and Svelte.

### `vite.config.ts`

```typescript
import react from '@vitejs/plugin-react' // or @vitejs/plugin-vue / @sveltejs/vite-plugin-svelte
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: true,
    outDir: 'public/build',   // must equal config/photon.ts `buildDir`
    emptyOutDir: false,       // the client + SSR builds share this dir
    copyPublicDir: false,     // REQUIRED — see the callout below
    rollupOptions: { input: 'resources/app.tsx' },
  },
})
```

> **`copyPublicDir: false` is required.** Photon's default `buildDir`
> (`public/build`) lives *inside* Vite's default `publicDir` (`public/`).
> Without this flag Vite copies `public/` into the build output recursively and
> the build fails with `ENAMETOOLONG`. Photon serves static assets itself, so
> Vite must not copy the public dir.

### Client entry — `resources/app.tsx`

`createPhotonApp` from your framework's subpath reads the page the server sent,
mounts it, and starts the router. `resolvePageComponent` code-splits each page
through a lazy `import.meta.glob`.

```tsx
import './app.css' // your CSS / Tailwind entry (optional)
import { createPhotonApp } from '@c9up/photon/react'
import { resolvePageComponent } from '@c9up/photon/client'

createPhotonApp({
  resolve: (name) =>
    resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
})
```

Without `setup`, `App` is hydrated when the server rendered the page and
mounted when it did not (SSR off). Give `setup` to wrap `App` in your own
providers, or to mount it yourself:

```tsx
import { hydrateRoot } from 'react-dom/client'

createPhotonApp({
  resolve,
  setup({ el, App, props }) {
    hydrateRoot(el, <ThemeProvider><App {...props} /></ThemeProvider>)
  },
})
```

Vue and Svelte take the same options. Vue's `setup` also receives `plugin`,
which installs `$photon` (the router) and `$page` for templates:

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

`App` renders the page on screen and the next one the router visits, so a page
keeps its own state when only its props change — a deferred group, a partial
reload. For Svelte, `App` is `PhotonRoot`.

### SSR entry — `resources/ssr.tsx`

The SSR entry's default export renders a page. `createPhotonApp` given the
`page` returns `{ head, body }`: Photon writes `body` inside
`<div id="app" data-server-rendered="true">`, next to the page data and the
asset tags, and `head` into `<head>`. The eager `import.meta.glob` bundles
every page, so one SSR build resolves any page by name.

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

Vue and Svelte differ only in how the app is rendered:

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

Svelte's `setup` is required on the server: importing `svelte/server` inside
Photon would put the server renderer in every client bundle.

An entry may also return a plain HTML string, and export its function as a
named `render` instead of the default.

### Choosing which pages server-render

Server rendering is off until `ssr.enabled` is `true`; then every page is
server-rendered, unless `ssr.pages` narrows it to a list of components or to a
predicate. The predicate receives the HTTP context, then the component name, so
the decision can turn on the request (the context is `undefined` only for a
render outside the HTTP pipeline):

```ts
// config/photon.ts
export default defineConfig({
  ssr: {
    enabled: true,
    pages: (ctx, page) => {
      // Server-render for crawlers, hydrate on the client for everyone else.
      const ua = ctx?.request.header('user-agent') ?? ''
      return /bot|crawler|spider/i.test(ua)
    },
  },
})
```

The renderer stays a single instance shared across requests — the context is a
per-call argument and is never stored on it, so two concurrent requests cannot
see each other's.

### Build commands

Two Vite builds — the client bundle (with the manifest) and the SSR module:

```json
{
  "scripts": {
    "build:client": "vite build",
    "build:ssr": "vite build --ssr resources/ssr.tsx --outDir build/ssr",
    "build:front": "pnpm build:client && pnpm build:ssr"
  }
}
```

The client build writes `public/build/.vite/manifest.json` (Vite 5+) — Photon finds it automatically. The SSR build writes `build/ssr/ssr.js`, outside anything served, which Photon's renderer imports in production.

### Tailwind

Add `@tailwindcss/vite` to the `plugins[]` and `@import "tailwindcss";` to your CSS entry (imported from the client entry above). Photon emits the `<link rel="stylesheet">` from the manifest automatically. See [Tailwind CSS](/en/guides/frontend/tailwind).

## Dev Mode — Vite HMR

In development, Photon proxies assets through the Vite dev server for instant hot module replacement. No manual restart required when you edit components.

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

In development, Photon:
- Loads assets from the Vite dev server at `viteDevUrl`
- Injects the Vite HMR client into SSR responses

Development is never assumed. It applies under `ream dev` (which sets
`REAM_DEV=true`), when `NODE_ENV` names development or test (`development`,
`dev`, `develop`, `test`, `testing`, in any case), or when the config says
`dev: true`. Anything else — `NODE_ENV` unset, `prod`, `staging` — serves the
built assets from the manifest, so a deployment that never set `NODE_ENV` does
not load its scripts from `localhost`. `dev: false` forces the build.

### Server rendering in development

Development server-renders too. Production loads the SSR bundle a build
produced; there is none in dev, so Photon compiles `ssr.entrypoint` through
Vite on every render — an edit to a page component shows without restarting the
process.

Vite is an **optional peer**: install it to get this, and without it dev falls
back to the client-only shell. Photon starts the compiler only when
`ssr.enabled` is `true`, so a project that renders purely on the client pays
nothing for it. Enabled with no file at `ssr.entrypoint`, every server render
fails with `E_PHOTON_SSR_LOAD_FAILED` rather than quietly serving the shell.

```bash
npm install -D vite
```

## Production Build

Run the two Vite builds from [Build commands](/en/guides/frontend/vite#build-commands), then start the app with `NODE_ENV=production`:

```bash
pnpm build:front   # vite build  +  vite build --ssr … --outDir build/ssr
NODE_ENV=production pnpm start
```

This produces:
- The SSR module at `build/ssr/ssr.js` (imported by the Ream process, never served)
- The client bundle with code splitting + hashed assets
- `public/build/.vite/manifest.json` mapping the entry to its chunks

In production (`viteDevUrl` ignored), Photon serves the pre-built assets from `buildDir` with no Vite overhead — it reads the manifest and injects the matching `<script type="module">` / `<link rel="stylesheet">` tags.
