# Photon — Frontend Rendering

Photon is Ream's server-side rendering (SSR) engine with client-side hydration. It supports React, Vue, and Svelte out of the box, with Vite-powered HMR in development and optimized builds for production.

## Installation

```bash
pnpm add @c9up/photon
```

## Setup

Register the Photon middleware in your application with a `PhotonConfig`:

```typescript
import { PhotonMiddleware } from '@c9up/photon'

const photon = new PhotonMiddleware({
  framework: 'react',                    // 'react' | 'vue' | 'svelte'
  entryClient: 'resources/app.tsx',      // Client hydration entry
  entryServer: 'resources/ssr.tsx',      // SSR render entry
  buildDir: 'public/build',              // Where the client build is written
  assetsUrl: '/build',                   // The URL the static server gives it
  ssrBuildDir: 'build/ssr',              // The SSR bundle — never under public/
  viteDevUrl: 'http://localhost:5173',   // Vite dev server URL (dev only)
})

// Register the middleware via .middleware()
router.use([photon.middleware()])
```

`buildDir` is resolved against the **application root**, which the provider
takes from `app.makePath()` — not against the directory the process started in.
An application launched by systemd, or from the root of a monorepo, therefore
finds its build where it actually is. Set `appRoot` explicitly when a deployment
lays the build out somewhere else; it wins over what the host reports.

`buildDir` is a path on disk and `assetsUrl` the URL it is served at: the static
server strips `public/`, so `public/build/app.js` is `/build/app.js`. Set both
when the build moves, or point `assetsUrl` at a CDN.

The SSR bundle is server code and goes in `ssrBuildDir`, which boot refuses
inside `buildDir` or `public/` — anywhere the static server would hand it out.
AdonisJS writes its server entry points under the public build directory; Photon
deliberately does not.

## Rendering Pages

Inside route handlers, use `ctx.photon.render()` to write the response directly:

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

Photon will server-render the component, inject the serialized props, and send a full HTML page. On the client, the framework hydrates the page into an interactive application.

## Shared Props

`ctx.photon.share({ ... })` registers per-request props that are merged into **every** `ctx.photon.render(...)` of the same request. Use it for cross-cutting props you'd otherwise repeat in every handler — the authenticated user, flash messages, the active locale.

Share from a middleware, then read the prop for free in any downstream controller:

```typescript
// middleware: make the auth user available to every page
router.use([
  async (ctx, next) => {
    ctx.photon.share({ authUser: ctx.auth.user })
    return next()
  },
])

// controller: no need to pass authUser again
router.get('/dashboard', async ({ photon, response }) => {
  const stats = await DashboardService.getStats()
  const result = await photon.render('Dashboard', { stats }) // authUser is included automatically
  response.status(result.status)
  for (const [k, v] of Object.entries(result.headers)) response.header(k, v)
  response.send(result.html)
})
```

Multiple `share()` calls shallow-merge (last call wins per key). A key passed directly to `render(props)` overrides the shared value of the same key for that render.

## Framework Support

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
      <h1>Welcome, {user.name}</h1>
      <p>Orders: {stats.orders}</p>
      <p>Revenue: ${stats.revenue}</p>
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
    <h1>Welcome, {{ user.name }}</h1>
    <p>Orders: {{ stats.orders }}</p>
    <p>Revenue: ${{ stats.revenue }}</p>
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
  <h1>Welcome, {user.name}</h1>
  <p>Orders: {stats.orders}</p>
  <p>Revenue: ${stats.revenue}</p>
</div>
```

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

One call to Photon's `hydrate()`. The lazy `import.meta.glob` code-splits each page.

```tsx
import './app.css' // your CSS / Tailwind entry (optional)
import { hydrate } from '@c9up/photon/client'

const pages = import.meta.glob<{ default: unknown }>('./pages/*.tsx')

hydrate({
  resolveComponent: async (name) => {
    const loader = pages[`./pages/${name}.tsx`]
    if (!loader) throw new Error(`Unknown page: ${name}`)
    return await loader()
  },
})
```

### SSR entry — `resources/ssr.tsx`

**You** write the server render: it exports `render(pageData)` returning the inner HTML, which Photon wraps in `<div id="app">…</div>` and pairs with the page-data + asset tags. `import.meta.glob(..., { eager: true })` bundles every page so one SSR build resolves any component by name.

```tsx
import { type ComponentType, createElement } from 'react'
import { renderToString } from 'react-dom/server'

const pages = import.meta.glob<{ default: ComponentType }>('./pages/*.tsx', { eager: true })

interface PageData { component: string; props: Record<string, unknown> }

export function render(pageData: PageData): string {
  const mod = pages[`./pages/${pageData.component}.tsx`]
  if (!mod) throw new Error(`Unknown page: ${pageData.component}`)
  return renderToString(createElement(mod.default, pageData.props))
}
```

Vue and Svelte differ only in this entry:

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
import PhotonRoot from '@c9up/photon/svelte'
export function render(pageData) {
  const component = pages[`./pages/${pageData.component}.svelte`].default
  return svelteRender(PhotonRoot, { props: { component, props: pageData.props, page: pageData } }).body
}
```

For Svelte, the client entry passes the same root to `hydrate`:

```ts
import PhotonRoot from '@c9up/photon/svelte'
hydrate({ resolveComponent, svelteRoot: PhotonRoot })
```

`PhotonRoot` holds the page in its state, the way `App.svelte` does in
`@inertiajs/svelte`, so a page keeps its own state when its props change — a
deferred group, a partial reload. Svelte 5 cannot update a mounted component's
props from outside a `.svelte` file, so without the root the page is remounted
each time. It is passed in rather than built in because Photon is one
TypeScript package for three frameworks: a `.svelte` import in its sources would
break the typecheck of every React and Vue app.

### Choosing which pages server-render

`ssr.pages` narrows SSR to a list of components, or to a predicate. The
predicate receives the HTTP context alongside the component name, so the
decision can turn on the request:

```ts
// config/photon.ts
export default defineConfig({
  ssr: {
    pages: (component, ctx) => {
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

Add `@tailwindcss/vite` to the `plugins[]` and `@import "tailwindcss";` to your CSS entry (imported from the client entry above). Photon emits the `<link rel="stylesheet">` from the manifest automatically. See [Tailwind CSS](./tailwind.md).

## Dev Mode — Vite HMR

In development, Photon proxies assets through the Vite dev server for instant hot module replacement. No manual restart required when you edit components.

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

When `viteDevUrl` is set (development), Photon:
- Loads assets from the running Vite dev server URL
- Injects the Vite HMR client into SSR responses
- Falls back to the production manifest when not in dev

### Server rendering in development

Development server-renders too. Production loads the SSR bundle a build
produced; there is none in dev, so Photon compiles `entryServer` through Vite
on every render — an edit to a page component shows without restarting the
process.

Vite is an **optional peer**: install it to get this, and without it dev falls
back to the client-only shell. Photon starts the compiler only when
`entryServer` actually exists, so a project that renders purely on the client
pays nothing for it.

```bash
npm install -D vite
```

## Client Hydration

Photon ships a one-call browser entrypoint that takes over the SSR-rendered DOM and boots a basic SPA-nav router. Import it once from your client entry, and Photon owns the rest:

```typescript
// resources/app.tsx (React)
import { hydrate } from '@c9up/photon/client'

const pages = import.meta.glob('./pages/*.tsx')

hydrate({
  resolveComponent: async (name) => {
    const loader = pages[`./pages/${name}.tsx`]
    if (!loader) throw new Error(`Unknown page: ${name}`)
    return (await loader()) as { default: unknown }
  },
})
```

The same shape works for Vue (`./pages/*.vue`) and Svelte (`./pages/*.svelte`) — Photon dispatches to the right adapter based on the `framework` field embedded in the SSR page-data block, so React-only apps never load the Vue or Svelte runtime.

### What `hydrate()` does

1. Reads the `<script id="photon-data" type="application/json">` block emitted by the server.
2. Validates the payload shape (`component`, `props`, `url`, `framework`).
3. Calls `resolveComponent(name)` to load the page module.
4. Dispatches to the matching adapter:
   - **React** — `react-dom/client.hydrateRoot(target, createElement(Component, props))`.
   - **Vue** — `createSSRApp(Component, props).mount(target)` (NOT `createApp` — `createSSRApp` reuses SSR markup instead of overwriting it).
   - **Svelte** — `hydrate(Component, { target, props })` (Svelte 5+).
5. Installs a document-level click + popstate listener (the SPA-nav router below).
6. Calls `onHydrated()` if you supplied one.

### `HydrateOptions`

| Property | Type | Default | Description |
|---|---|---|---|
| `resolveComponent` | `(name: string) => Promise<{ default: unknown }>` | — | Maps a component name to its module. Typically backed by `import.meta.glob`. |
| `target` | `string` | `'#app'` | CSS selector for the SSR root node. |
| `onHydrated` | `() => void` | — | Fires once after the framework's hydrate primitive resolves. |

### SPA navigation

Photon intercepts left-clicks on internal `<a>` elements, fetches the destination with the `X-Photon: true` header, parses the props-only JSON response, and swaps the mounted root. The browser back/forward buttons restore previous pages from `history.state`.

A click is intercepted only when ALL of these hold:

- Left mouse button (no middle / right click).
- No modifier keys (Ctrl, Cmd, Shift, Alt) — otherwise the browser's default new-tab / save-link behavior wins.
- The anchor has an `href`, no `download` attribute, and no `target` other than `_self` / `''`.
- The resolved URL is **same-origin** with a `http:` / `https:` protocol (no `mailto:`, `tel:`, `javascript:`, `blob:`, `data:`).
- The anchor is NOT opted out via `data-photon="external"`.

Opt out per-link:

```html
<a href="/some-internal-page" data-photon="external">Force a full page reload</a>
```

If the SPA-nav fetch fails (non-2xx response, wrong `Content-Type`, malformed JSON, server-supplied URL is cross-origin, adapter render throws), Photon falls back to `location.href = url` — the user always gets to the page they clicked, even when interactivity is broken.

**Concurrent navigation:** rapid double-clicks (link A then link B before A's response arrives) are deduped — only the latest navigation wins; stale responses are dropped.

**Same-URL clicks** use `history.replaceState` instead of `pushState`, so repeated clicks on the same link don't inflate the back-button history.

**SVG `<a>` elements are NOT intercepted** — `SVGAElement` has a different `href` shape (`SVGAnimatedString`), so SVG anchors fall through to the browser's default behavior. If you want SPA-nav from an SVG icon link, wrap it in an HTML `<a>`.

**Sub-path apps** with a `<base href="/admin/">` element in the document are handled correctly: relative anchors resolve against `document.baseURI` rather than the raw `location.href`.

### Navigating from code — `router`

`@c9up/photon/client` exports a `router` with the shape of Inertia's, so code
written against `@inertiajs/core` reads the same:

```ts
import { router } from '@c9up/photon/client'

router.visit('/orders')                          // like clicking a link
router.visit('/orders?page=2', { replace: true }) // swap the history entry
router.reload({ only: ['stats'] })               // partial: only these props
router.reload({ except: ['auditLogs'] })
router.reload({ only: ['rows'], reset: ['rows'] }) // replace, not combine
router.visit('/login', { errorBag: 'login' })    // scope validation errors
```

Visits take Inertia's callbacks — `onBefore` (return `false` to cancel),
`onBeforeUpdate`, `onSuccess`, `onFinish` — and `data` (query parameters),
`preserveUrl` and `preserveErrors`. The router also has `router.on('success', cb)`
(returns the function that stops listening), `router.remember(data, key)` /
`router.restore(key)` for state kept in the page's history entry, and
`router.replace({ url })` to change the address without a request.

A partial reload (`only`, `except` or `reset`) merges the answer into the page
on screen without remounting it; the props it did not ask for keep their value,
and it takes the server's `errors`. `reload()` sends `Cache-Control: no-cache`.
A URL on another origin is a full navigation. One difference from Inertia: both
methods return a promise that settles once the page is applied, so they can be
awaited; ignoring it, as Inertia code does, works too.

### Server-side contract

Photon's `PhotonMiddleware` already detects the `X-Photon` request header and returns a JSON response (component, props, URL, framework) instead of a full HTML document. No extra wiring needed:

```typescript
router.get('/orders', async ({ photon, response }) => {
  const orders = await OrderService.list()

  const result = await photon.render('Orders', { orders })
  response.status(result.status)
  for (const [k, v] of Object.entries(result.headers)) response.header(k, v)
  response.send(result.html)
})
```

### Error codes

The `hydrate()` entrypoint throws `PhotonClientError` (re-exported from `@c9up/photon/client`). Catch it via `instanceof` and inspect the `code`:

| Code | When |
|---|---|
| `E_PHOTON_HYDRATION_NO_DATA` | The `<script id="photon-data">` block is missing — the page wasn't rendered through `PhotonRenderer`. |
| `E_PHOTON_HYDRATION_BAD_DATA` | The page-data JSON is malformed or has the wrong shape (missing `framework`, empty `component`, etc.). |
| `E_PHOTON_HYDRATION_NO_TARGET` | The mount selector (`#app` by default) didn't match any DOM node. |
| `E_PHOTON_HYDRATION_UNSUPPORTED_FRAMEWORK` | `framework` is set to a value other than `react` / `vue` / `svelte`. |
| `E_PHOTON_HYDRATION_ADAPTER_LOAD_FAILED` | The framework runtime (`react-dom/client`, `vue`, `svelte`) couldn't be imported — usually a missing `pnpm add` step. |

### Sub-path apps & custom mount targets

Hosting Photon under a sub-path? Override the target selector:

```typescript
hydrate({
  resolveComponent,
  target: '#admin-app',
})
```

The SSR side currently always emits `<div id="app">`; if you pass a custom `target`, override the SSR template to match (e.g. `#admin-app`). When the renderer can't find your target at hydrate time it throws `E_PHOTON_HYDRATION_NO_TARGET` — see the [error catalog](../errors/#photon-hydration-no-target).

### What ships per story

| Capability | Story | Status |
|---|---|---|
| `hydrate({ resolveComponent })` + click router | 44.1 | Active |
| `<head>` updates + `@Meta` decorator | 44.2 | Active |
| Error catalog + `docsUrl` on every `PhotonError` / `PhotonClientError` | 44.4 | Active |

## SPA Navigation (server-side detection)

The `X-Photon: true` header convention is detected by `PhotonMiddleware` and converts the SSR response into a props-only JSON payload — see the [Client Hydration](#client-hydration) section above for the browser-side router that emits this header.

No extra configuration is needed. Photon handles the `X-Photon` header detection and response format switching transparently.

## Production Build

Run the two Vite builds from [Build commands](#build-commands), then start the app with `NODE_ENV=production`:

```bash
pnpm build:front   # vite build  +  vite build --ssr … --outDir build/ssr
NODE_ENV=production pnpm start
```

This produces:
- The SSR module at `build/ssr/ssr.js` (imported by the Ream process, never served)
- The client bundle with code splitting + hashed assets
- `public/build/.vite/manifest.json` mapping the entry to its chunks

In production (`viteDevUrl` ignored), Photon serves the pre-built assets from `buildDir` with no Vite overhead — it reads the manifest and injects the matching `<script type="module">` / `<link rel="stylesheet">` tags.

## SEO & Head Management

Photon ships per-route control over `<title>`, `<meta>` description, Open Graph, Twitter Cards, canonical URLs and arbitrary custom tags. Tags are merged from four layers (right-most wins per leaf field): `defaultMeta` → `@Meta` decorator → `ctx.photon.meta()` → explicit `render(comp, props, meta)` argument.

### Imperative API — `ctx.photon.meta()`

Inside a route handler, accumulate tags before rendering:

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

Multiple `meta()` calls deep-merge. `og` and `twitter` sub-objects are merged field-by-field (NOT object-replace).

### Decorator — `@Meta()`

`@Meta()` attaches metadata declaratively to a controller method. The middleware reads it from `ctx.route` (controller prototype + action name) and seeds the accumulator before the handler runs.

```ts
import { Meta } from '@c9up/photon'

class HomeController {
  @Meta({ title: 'Home', description: 'Welcome' })
  async index({ photon }) {
    return photon.render('Home', {})
  }

  // Factory form — receives the request context.
  @Meta((ctx) => ({ title: `Profile — ${ctx.params.user}` }))
  async show({ photon }) {
    return photon.render('Profile', {})
  }
}
```

Imperative `ctx.photon.meta()` calls inside the handler still take precedence over decorator values.

### Application-wide defaults — `defaultMeta`

In `config/photon.ts`:

```ts
import { defineConfig } from '@c9up/photon'

export default defineConfig({
  framework: 'react',
  entryClient: 'resources/app.tsx',
  entryServer: 'resources/ssr.tsx',
  defaultMeta: {
    og: { siteName: 'Example', locale: 'en_US' },
    twitter: { site: '@example' },
    robots: 'index,follow',
  },
})
```

Per-route values merge on top of these defaults.

### Precedence

Layers, lowest to highest:

| Layer | Source | When |
|---|---|---|
| 1 | `config.defaultMeta` | App-wide defaults |
| 2 | `@Meta(...)` decorator | Per-controller-method |
| 3 | `ctx.photon.meta(...)` | Imperative, multiple calls deep-merge |
| 4 | `render(comp, props, meta)` | Explicit override on the render call |

`og` / `twitter` sub-objects merge field-by-field; `keywords` and `custom` arrays concatenate then de-dup.

### XSS safety

Every text value (`title`, `description`, og:*, twitter:*, custom `content`) passes through an HTML-attribute escaper that replaces `&`, `<`, `>`, `"`, `'`. A user-controlled title containing `<script>...</script>` is rendered safely as `&lt;script&gt;...&lt;/script&gt;`. **Never** disable this — there is no opt-out, by design.

## PhotonConfig Reference

| Property | Type | Default | Description |
|---|---|---|---|
| `framework` | `'react' \| 'vue' \| 'svelte'` | — | Frontend framework to use |
| `entryClient` | `string` | — | Path to the client hydration entry (e.g. `'resources/app.tsx'`) |
| `entryServer` | `string` | — | Path to the SSR render entry (e.g. `'resources/ssr.tsx'`) |
| `buildDir` | `string` | `'public/build'` | Where the client build is written, on disk |
| `assetsUrl` | `string` | `'/build'` | URL the client build is served from (a root-relative path or an http(s) URL) |
| `ssrBuildDir` | `string` | `'build/ssr'` | Where the SSR bundle is written; refused inside `buildDir` or `public/` |
| `viteDevUrl` | `string` | `'http://localhost:5173'` | Vite dev server URL (dev only) |
| `defaultMeta` | `MetaTags` | — | Application-wide default `<head>` tags (44.2) |

## Errors

Photon throws `PhotonError` (server, from `@c9up/photon`) and `PhotonClientError` (browser, from `@c9up/photon/client`). Both carry a `code`, an optional `hint`, an optional `context: Record<string, unknown>`, and a `docsUrl` that resolves to the matching anchor in the [Photon error catalog](../errors/#photon-errors). The `docsUrl` is enumerable on the error instance, so log-shipping pipelines (Sentry, Datadog, vanilla `JSON.stringify`) ship it without extra wiring.

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

See the [full catalog](../errors/#photon-errors) for cause + fix per code.

## Next Steps

- [Routing](/en/guide/routing) — Define routes that render Photon pages
- [Middleware](/en/guide/middleware) — Add authentication before rendering
- [Warden (Auth)](/en/modules/warden) — Protect pages with guards

## Prop helpers

A migrated Inertia controller calls the same helpers — the implementation is
ours, the surface is theirs.

```ts
ctx.photon.render('Dashboard', {
  user,                                              // sent every visit
  permissions: always(perms),                        // survives a partial reload
  auditLogs: optional(() => Audit.all()),            // only when asked for
  stats: defer(() => Stats.heavy(), 'panels'),       // fetched afterwards
  rows: merge(nextPage).matchOn('id'),               // appended, deduped
  countries: once(() => Country.all()),              // cached by the client
  users: scroll(() => User.query().paginate(p, 20)), // infinite scroll
})
```

- **`defer`** announces the name and does not run the resolver; the client asks
  for each group in a follow-up request. `{ rescue: true }` lets one slow panel
  fail without taking the whole reload with it.
- **`merge` / `deepMerge`** label the prop so the client combines instead of
  replacing. `matchOn('id')` is what stops a row re-sent between two pages from
  appearing twice.
- **`once`** states the caching terms always, and does not run the resolver at
  all for a key the client still holds.
- **`scroll`** labels the value's `data` **array**, not the prop — the cursor
  beside it must be replaced each time, never accumulated. `nextPage: null` is
  how the client stops asking.

A bare callback is a lazy prop, invoked on every render, and a promise is
awaited: `{ total: () => countOrders() }` sends the number.

The browser router asks for every `defer` group once the page is up — one
request per group, so a slow one does not hold the others back — and merges the
result into the page without remounting it (React and Vue keep the component's
state; Svelte still remounts). A form's `errors` stay as they were.

On a partial reload — a deferred group, `router.reload({ only })` — the props
labelled `merge`, `merge().prepend()` or `deepMerge` are combined with what the
page holds, following `matchOn`; a full visit replaces them, as in Inertia.

A `once` value is kept by the page that received it: every request announces
the keys still held and not expired (`x-photon-except-once-props`), the server
skips resolving them, and the router puts its copy back with its first expiry.

A `scroll` prop is paginated from the page with `useInfiniteScrollData`, the data
half of Inertia's infinite scroll under the same names:

```ts
import { useInfiniteScrollData } from '@c9up/photon/client'

const users = useInfiniteScrollData({ getPropName: () => 'users' })
if (users.hasNext()) await users.fetchNext()   // ?page=N, rows appended
if (users.hasPrevious()) await users.fetchPrevious() // rows prepended
```

Each call is a partial reload of the scroll prop; the address bar does not move,
and a `null` page on either side stops the requests. A reload with
`reset: ['users']` starts the cursor over.

`useInfiniteScroll` wires it to the page, as Inertia's does: it loads a side
when its trigger element scrolls into view, tags each row with the page it came
with, moves the URL to the page most visible on screen, and keeps the reader's
row in place when rows arrive above it. The cursor and the row ranges are kept
with `router.remember`, so the back button — or a reload of the tab — returns to
the list as it was.

```ts
import { useInfiniteScroll } from '@c9up/photon/client'

const { dataManager, elementManager, flush } = useInfiniteScroll({
  getPropName: () => 'users',
  getItemsElement: () => list,          // the element whose children are rows
  getStartElement: () => topSentinel,
  getEndElement: () => bottomSentinel,
  getScrollableParent: () => null,      // null: the window scrolls
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
// …and `flush()` when the list leaves the page.
```

Most pages use it through the framework component instead.

## Framework components

`@c9up/photon/react`, `@c9up/photon/vue` and `@c9up/photon/svelte` export the
components of `@inertiajs/react`, `@inertiajs/vue3` and `@inertiajs/svelte`,
with the same props and slots: `usePage`, `Deferred`, `WhenVisible` and
`InfiniteScroll`. Each subpath is imported only by an app of that framework.

```tsx
import { Deferred, InfiniteScroll, WhenVisible } from '@c9up/photon/react'

<Deferred data="stats" fallback={<Spinner />}>
  {({ reloading }) => <Stats stats={stats} dimmed={reloading} />}
</Deferred>

<WhenVisible data="comments" fallback={<p>Loading comments…</p>}>
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

`usePage()` reads the router in the browser. On the server there is no router,
so the SSR entry hands the page over, the way Inertia's `App` does:

```tsx
// React — resources/ssr.tsx
import { PhotonPage } from '@c9up/photon/react'
return renderToString(
  createElement(PhotonPage, { page: pageData }, createElement(mod.default, pageData.props)),
)

// Vue — resources/ssr.ts
import { PhotonPage } from '@c9up/photon/vue'
const app = createSSRApp({ render: () => h(PhotonPage, { page: pageData }, () => h(Page, pageData.props)) })

// Svelte — PhotonRoot takes the whole page too
svelteRender(PhotonRoot, { props: { component, props: pageData.props, page: pageData } })
```

`Link` is there in the three frameworks too, with Inertia's props (`href`,
`method`, `data`, `replace`, `only`, `except`, `headers`, `preserveState`, …):
an anchor the router follows, or — for any method but GET — a button, as
upstream renders it. Prefetching is not supported (Photon keeps no visit cache).

```tsx
<Link href="/orders" data={{ status: 'open' }}>Open orders</Link>
<Link href={`/orders/${id}`} method="delete" onSuccess={() => toast('Deleted')}>Delete</Link>
```

Visits other than GET go through the router too — `router.post(url, data)`,
`put`, `patch`, `delete`, or `visit(url, { method, data })`. The data is sent as
JSON, or as multipart as soon as it holds a file (`forceFormData` to insist), with
the `XSRF-TOKEN` cookie echoed as `X-XSRF-TOKEN`. A page that comes back with
validation errors (scoped by `errorBag`) calls `onError` instead of `onSuccess`.
A mutation that fails leaves the page as it is rather than reloading its URL as
a GET.

Forms work as in Inertia. `useForm` holds a form's data, errors and submission
state — `form.data` and `form.setData` in React, the fields at the top level in
Vue and Svelte (`v-model="form.email"`, `bind:value={form.email}`):

```ts
const form = useForm({ email: '', password: '' })
form.post('/login', { onSuccess: () => form.reset('password') })
// form.errors.email · form.processing · form.isDirty · form.wasSuccessful
// form.recentlySuccessful · form.transform(fn) · form.cancel() · useForm('Login', {...})
```

`<Form>` reads its data from its own fields at submit and gives its children
the same state:

```tsx
<Form action="/login" method="post" resetOnSuccess={['password']}>
  {({ errors, processing }) => (
    <>
      <input name="email" />
      {errors.email && <p>{errors.email}</p>}
      <button disabled={processing}>Log in</button>
    </>
  )}
</Form>
```

Two parts of Inertia's forms are not ported: Laravel Precognition (live
validation against a Laravel endpoint), and upload `progress`, which stays
`null` because the router sends with `fetch`.

## Validation errors

`props.errors` is shared with every page, so a form component can read
`errors.email` unconditionally. The `x-photon-error-bag` header scopes them,
which is how two forms on one page keep their messages apart.

## Response-level fields

```ts
ctx.photon.clearHistory()        // call it on logout
ctx.photon.encryptHistory()
ctx.photon.flash(() => ctx.session.flashMessages.all())
```

`clearHistory` matters at logout: without it the back button replays pages built
from the previous session's data, straight out of the client's own cache.

The router keeps each page in `history.state`. With `encryptHistory` that copy is
AES-GCM ciphertext under a key kept in `sessionStorage`; `clearHistory` deletes
the key, so every earlier entry becomes unreadable and the back button — or a
page restored from the back-forward cache — loads the URL from the server
instead. Two deliberate differences from Inertia's client: every entry gets its
own random IV (Inertia reuses one per key), and without Web Crypto (a page not
served over HTTPS) nothing is stored rather than the page in the clear.

The flash bag reaches the page as a `photon:flash` event on `document` — once per
page, never for a deferred group, and never replayed by the back button:

```ts
document.addEventListener('photon:flash', (event) => {
  if (!(event instanceof CustomEvent)) return
  const { flash } = event.detail
  if (flash.success) toast.success(String(flash.success))
})
```
