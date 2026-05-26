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
  buildDir: 'public/build',              // Output directory for production assets
  viteDevUrl: 'http://localhost:5173',   // Vite dev server URL (dev only)
})

// Register the middleware via .middleware()
router.use([photon.middleware()])
```

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
| `PHOTON_HYDRATION_NO_DATA` | The `<script id="photon-data">` block is missing — the page wasn't rendered through `PhotonRenderer`. |
| `PHOTON_HYDRATION_BAD_DATA` | The page-data JSON is malformed or has the wrong shape (missing `framework`, empty `component`, etc.). |
| `PHOTON_HYDRATION_NO_TARGET` | The mount selector (`#app` by default) didn't match any DOM node. |
| `PHOTON_HYDRATION_UNSUPPORTED_FRAMEWORK` | `framework` is set to a value other than `react` / `vue` / `svelte`. |
| `PHOTON_HYDRATION_ADAPTER_LOAD_FAILED` | The framework runtime (`react-dom/client`, `vue`, `svelte`) couldn't be imported — usually a missing `pnpm add` step. |

### Sub-path apps & custom mount targets

Hosting Photon under a sub-path? Override the target selector:

```typescript
hydrate({
  resolveComponent,
  target: '#admin-app',
})
```

The SSR side currently always emits `<div id="app">`; if you pass a custom `target`, override the SSR template to match (e.g. `#admin-app`). When the renderer can't find your target at hydrate time it throws `PHOTON_HYDRATION_NO_TARGET` — see the [error catalog](../errors/#photon-hydration-no-target).

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

Build optimized assets for production:

```bash
pnpm photon build
```

This runs Vite in build mode, producing:
- Server bundle for SSR (used by the Ream process)
- Client bundle with code splitting and asset hashing
- A manifest file mapping component names to their chunks

In production, Photon serves pre-built assets from `buildDir` with no Vite overhead.

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

### Limitation: no SPA-nav `<head>` updates yet

The 44.1 SPA-nav router swaps `<div id="app">` content but does NOT update `<head>` on client-side navigation. The initial SSR render carries the right tags; subsequent in-browser navigation keeps the head from the first page until a full reload. SPA `<head>` synchronization is a follow-up story (read each `pageData` payload's meta and patch the document head).

## PhotonConfig Reference

| Property | Type | Default | Description |
|---|---|---|---|
| `framework` | `'react' \| 'vue' \| 'svelte'` | — | Frontend framework to use |
| `entryClient` | `string` | — | Path to the client hydration entry (e.g. `'resources/app.tsx'`) |
| `entryServer` | `string` | — | Path to the SSR render entry (e.g. `'resources/ssr.tsx'`) |
| `buildDir` | `string` | `'public/build'` | Output directory for production assets |
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
