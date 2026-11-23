# Hydration and navigation

This guide covers client hydration and navigation:

- Client Hydration
- SPA Navigation (server-side detection)

## Client Hydration

`createPhotonApp` (above) is the client entry of an app. Beneath it,
`hydrate()` from `@c9up/photon/client` does the same without a framework
subpath: it picks the framework's adapter from the page data and mounts the
page component itself. Use it when you need no `setup`:

```typescript
// resources/app.tsx (React)
import { hydrate } from '@c9up/photon/client'

const pages = import.meta.glob<{ default: unknown }>('./pages/*.tsx')

hydrate({
  resolveComponent: async (name) => {
    const loader = pages[`./pages/${name}.tsx`]
    if (!loader) throw new Error(`Unknown page: ${name}`)
    return loader()
  },
})
```

The same shape works for Vue (`./pages/*.vue`) and Svelte (`./pages/*.svelte`) — Photon dispatches to the right adapter based on the `framework` field embedded in the SSR page-data block, so React-only apps never load the Vue or Svelte runtime.

### What `hydrate()` does

1. Reads the `<script id="photon-data" type="application/json">` block emitted by the server.
2. Validates the payload shape (`component`, `props`, `url`, `framework`).
3. Calls `resolveComponent(name)` to load the page module.
4. Dispatches to the matching adapter, which hydrates the target when the
   server rendered it (`data-server-rendered`) and mounts it otherwise:
   - **React** — `hydrateRoot(target, createElement(Component, props))`, or `createRoot(target).render(…)`.
   - **Vue** — `createSSRApp(…).mount(target)`, or `createApp(…).mount(target)`.
   - **Svelte** — `hydrate(Component, { target, props })`, or `mount(…)` (Svelte 5+). Pass `svelteRoot: PhotonRoot` so a page keeps its state when its props change.
5. Installs a document-level click + popstate listener (the SPA-nav router below).
6. Calls `onHydrated()` if you supplied one.

### `HydrateOptions`

| Property | Type | Default | Description |
|---|---|---|---|
| `resolveComponent` | `(name: string) => Promise<{ default: unknown }>` | — | Maps a component name to its module. Typically backed by `import.meta.glob`. |
| `target` | `string` | `'#app'` | CSS selector for the SSR root node. |
| `onHydrated` | `() => void` | — | Fires once after the framework's hydrate primitive resolves. |
| `svelteRoot` | `unknown` | — | Svelte only: `PhotonRoot` from `@c9up/photon/svelte`. |

### Moving an entry to `createPhotonApp`

An app written against `hydrate()` and a named `render` export keeps working.
To move it:

1. Client entry: replace `hydrate({ resolveComponent })` with
   `createPhotonApp({ resolve })` from your framework's subpath. `resolve` may
   return the component or its module, eagerly or as a promise.
2. SSR entry: export `render(page)` as the default export and return
   `createPhotonApp({ page, render, resolve })` (Svelte: `setup` instead of
   `render`). The `PhotonPage` / `PhotonRoot` wrapping you wrote by hand goes:
   `App` provides the page to `usePage()` on the server.
3. Config: `ssr: { enabled: true, entrypoint: 'resources/ssr.tsx' }` replaces
   `entryServer` — server rendering is off unless enabled.

### SPA navigation

The framework `Link` components navigate without a page load. A plain `<a>` is left to the browser unless it opts in with `data-photon`: then Photon intercepts the left-click, fetches the destination with the `X-Photon: true` header, parses the props-only JSON response, and swaps the mounted root. The browser back/forward buttons restore previous pages from `history.state`.

A click is intercepted only when ALL of these hold:

- Left mouse button (no middle / right click).
- No modifier keys (Ctrl, Cmd, Shift, Alt) — otherwise the browser's default new-tab / save-link behavior wins.
- The anchor has an `href`, no `download` attribute, and no `target` other than `_self` / `''`.
- The resolved URL is **same-origin** with a `http:` / `https:` protocol (no `mailto:`, `tel:`, `javascript:`, `blob:`, `data:`).
- The anchor carries `data-photon` (any value but `external`).

Opt in per-link:

```html
<a href="/orders" data-photon>Orders</a>
```

Anchors are opt-in because a plain one may lead anywhere — a single-use magic link, an export, a page that is not Photon's. Fetching it first and then reloading it when the answer is not a page would request the same URL twice; only mark the anchors that lead to Photon pages.

If the SPA-nav fetch of an opted-in anchor fails (non-2xx response, wrong `Content-Type`, malformed JSON, server-supplied URL is cross-origin, adapter render throws), Photon falls back to `location.href = url` — the user always gets to the page they clicked, even when interactivity is broken. That fallback requests the URL a second time, which is why only anchors to Photon pages opt in.

**Concurrent navigation:** rapid double-clicks (link A then link B before A's response arrives) are deduped — only the latest navigation wins; stale responses are dropped.

**Same-URL clicks** use `history.replaceState` instead of `pushState`, so repeated clicks on the same link don't inflate the back-button history.

**SVG `<a>` elements are NOT intercepted** — `SVGAElement` has a different `href` shape (`SVGAnimatedString`), so SVG anchors fall through to the browser's default behavior. If you want SPA-nav from an SVG icon link, wrap it in an HTML `<a>`.

**Sub-path apps** with a `<base href="/admin/">` element in the document are handled correctly: relative anchors resolve against `document.baseURI` rather than the raw `location.href`.

### Navigating from code — `router`

`@c9up/photon/client` exports a `router` for visits made from code:

```ts
import { router } from '@c9up/photon/client'

router.visit('/orders')                          // like clicking a link
router.visit('/orders?page=2', { replace: true }) // swap the history entry
router.reload({ only: ['stats'] })               // partial: only these props
router.reload({ except: ['auditLogs'] })
router.reload({ only: ['rows'], reset: ['rows'] }) // replace, not combine
router.visit('/login', { errorBag: 'login' })    // scope validation errors
```

Visits take callbacks — `onBefore` (return `false` to cancel),
`onBeforeUpdate`, `onSuccess`, `onFinish` — and `data` (query parameters),
`preserveUrl` and `preserveErrors`. The router also has `router.on('success', cb)`
(returns the function that stops listening), `router.remember(data, key)` /
`router.restore(key)` for state kept in the page's history entry, and
`router.replace({ url })` to change the address without a request.

A partial reload (`only`, `except` or `reset`) merges the answer into the page
on screen without remounting it; the props it did not ask for keep their value,
and it takes the server's `errors`. `reload()` sends `Cache-Control: no-cache`.
A URL on another origin is a full navigation. Both methods return a promise that
settles once the page is applied, so they can be awaited; ignoring it works too.

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

The `hydrate()` entrypoint throws the errors `@c9up/photon/client` exports as `errors`. Test `error.code`, or `instanceof` one of them (`error instanceof errors.E_PHOTON_HYDRATION_NO_TARGET`):

| Code | When |
|---|---|
| `E_PHOTON_HYDRATION_NO_DATA` | The `<script id="photon-data">` block is missing — the page wasn't rendered through `PhotonRenderer`. |
| `E_PHOTON_HYDRATION_BAD_DATA` | The page-data JSON is malformed or has the wrong shape (missing `framework`, empty `component`, etc.). |
| `E_PHOTON_HYDRATION_NO_TARGET` | The mount selector (`#app` by default) didn't match any DOM node. |
| `E_PHOTON_HYDRATION_UNSUPPORTED_FRAMEWORK` | `framework` is set to a value other than `react` / `vue` / `svelte`. |
| `E_PHOTON_HYDRATION_ADAPTER_LOAD_FAILED` | The framework runtime (`react-dom/client`, `vue`, `svelte`) couldn't be imported — usually a missing `pnpm add` step. |
| `E_PHOTON_UNKNOWN_PAGE` | `createPhotonApp`'s `resolve` returned nothing for a page name. |

### Sub-path apps & custom mount targets

Hosting Photon under a sub-path? Override the target selector:

```typescript
hydrate({
  resolveComponent,
  target: '#admin-app',
})
```

The SSR side currently always emits `<div id="app">`; if you pass a custom `target`, override the SSR template to match (e.g. `#admin-app`). When the renderer can't find your target at hydrate time it throws `E_PHOTON_HYDRATION_NO_TARGET` — see the [error catalog](/en/reference/errors#e-photon-hydration-no-target).

### What ships per story

| Capability | Story | Status |
|---|---|---|
| `hydrate({ resolveComponent })` + click router | 44.1 | Active |
| `<head>` updates + `@Meta` decorator | 44.2 | Active |
| Error catalog + `docsUrl` on every Photon error | 44.4 | Active |

## SPA Navigation (server-side detection)

The `X-Photon: true` header convention is detected by `PhotonMiddleware`, and `photon.render()` answers such a request with the props-only JSON payload directly — see the [Client Hydration](/en/guides/frontend/photon/hydration#client-hydration) section above for the browser-side router that emits this header. The props are resolved once, against the partial reload the client asked for: a prop it did not name never has its resolver called, and neither the SSR bundle nor the HTML document is built for a props request.

No extra configuration is needed. Photon handles the `X-Photon` header detection and response format switching transparently.
