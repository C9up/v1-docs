# Aurora — Reactive UI Runtime

Aurora is Ream's lightweight UI runtime (`@c9up/aurora`): tagged-template DOM, signal-based state, isomorphic SSR and client-side hydration. No JSX, no bundler in the app, no virtual DOM.

Aurora is the **same code on the server and in the browser**. The package ships TypeScript source for Node (transpiled on the fly by `@swc-node/register`) **and** a pre-built `dist/` of plain ES2022 modules that the browser can load directly through an importmap.

## Installation

```bash
pnpm add @c9up/aurora
```

The package's `dist/` is built once at the framework level (`pnpm -w build` at the workspace root) — apps that consume `@c9up/aurora` don't need a bundler.

## Templates — `html`

The `html` tag returns a `TemplateResult`. It does not touch the DOM by itself; the renderer (`render`, `renderToString`, `hydrate`) is what attaches the result somewhere.

```ts
import { html } from '@c9up/aurora'

const greeting = (name: string) => html`<p>Hello, ${name}!</p>`
```

Slots inside templates are typed positions:

- **Text slot** — `<p>${value}</p>` interpolates a string, number, or signal as a text node.
- **Attribute slot** — `<a href="${url}">` sets an attribute; if the value is a signal, the attribute re-renders on change.
- **Property slot** — `<input .value="${signal}">` (dotted prefix) writes a DOM property.
- **Boolean attribute** — `<button ?disabled="${signal}">` toggles the attribute presence.
- **Event slot** — `<button @click="${handler}">` adds a listener.
- **Nested template** — see the example below.

  ```ts
  html`<ul>${items.map((i) => html`<li>${i}</li>`)}</ul>`
  ```

Templates are cached by their static string array, so re-rendering the same template is cheap.

## Signals — `signal`, `effect`, `memo`

```ts
import { signal, effect, memo } from '@c9up/aurora'

const count = signal(0)

// Read
console.log(count())        // 0

// Write
count(1)
count((prev) => prev + 1)   // 2

// React
effect(() => {
  console.log('count is now', count())
})

// Derive
const doubled = memo(() => count() * 2)
```

`signal()` returns a function. Call it with no args to read, with one arg to write. Signals are tracked automatically inside `effect()` and `memo()` callbacks.

### Component lifecycle

```ts
import { component, html, onMount, onUnmount, signal } from '@c9up/aurora'

const Counter = component(() => {
  const count = signal(0)
  onMount(() => console.log('mounted'))
  onUnmount(() => console.log('removed from DOM'))
  return html`<button @click=${() => count(count() + 1)}>${count}</button>`
})
```

State is plain `signal()` from the reactive layer — there's no separate "hooks" API. Signals work both inside and outside a component setup, so the same primitive serves module-level state, derived values (`memo`), and side effects (`effect`). `onMount` / `onUnmount` are the only component-scoped helpers; they exist because they need access to the per-instance cleanup queue.

## SSR — `renderToString`

```ts
import { renderToString } from '@c9up/aurora'

const html = renderToString(html`<p>Hello, World!</p>`)
// "<p>Hello, World!</p>"
```

The SSR walker is synchronous, allocates one string, and never touches a DOM. It runs unchanged in Node, Workers, and Deno.

## Shared pages — `aurora.render()`

The Adonis-Inertia shape, adapted to aurora. One file per page, **same source on the server and in the browser** (plain ESM JS, no compile step).

### Wire it up

```ts
// reamrc.ts
providers: [
  () => import('@c9up/aurora/provider'),
]
```

That's it. Aurora's provider:
- defaults `pages.root` to `<projectRoot>/resources/pages` — drop your pages there and they're picked up;
- auto-mounts `GET /_assets/aurora/*` (the runtime's pre-built `dist/`);
- auto-mounts `GET /_assets/pages/*` (your pages directory).

To use a different folder, create `config/aurora.ts`:

```ts
export default {
  pages: { root: './app/views' },
}
```

`pages.root` is resolved against the project root (same convention `modules.path` uses in `reamrc.ts`). Absolute paths pass through unchanged.

### Author a page

```js
// resources/pages/Dashboard.js
import { component, html, onMount, signal } from '@c9up/aurora'
import { relay } from '@c9up/aurora/relay'

export default component((props) => {
  const status = signal('idle')

  onMount(() => {
    return relay().subscribe(props.channel, (ev) => {
      status(`last: ${ev.event}`)
    })
  })

  return html`<main>
    <h1>${props.title}</h1>
    <aside data-status=${() => status()}>${() => status()}</aside>
  </main>`
})
```

### Render it from a controller

```ts
import aurora from '@c9up/aurora/services/main'

router.get('/dashboard', async (ctx) => {
  await aurora.render(ctx, 'Dashboard', {
    title: 'Hello',
    channel: 'user/123/notifications',
  })
})
```

That's it. `aurora.render(ctx, name, props)`:

1. Resolves `resources/pages/${name}.js` (dynamic import — picks up file changes on every request)
2. Calls the factory with `props`, runs SSR via `renderToString`
3. Wraps the markup in a full HTML document with:
   - the importmap that aliases `@c9up/aurora` → `/_assets/aurora/index.js`
   - a `<script id="aurora-page-data" type="application/json">` blob carrying `{ name, props, url, rootId }`
   - an inline `<script type="module">` that imports aurora + the same page module and calls `hydrate(root, () => Page(data.props))`

Browser-side, aurora adopts the SSR DOM in place, attaches signals + event listeners + lifecycle hooks. The `onMount` callback you wrote fires once the tree is live.

### Options

| Option | Default | What it does |
|---|---|---|
| `lang` | `'en'` | `<html lang="…">` value |
| `rootId` | `'aurora-root'` | id of the `<div>` that wraps the SSR body — must match what your client side expects |
| `headExtra` | `''` | Raw HTML spliced into `<head>` after the importmap. Use for `<title>`, meta tags, stylesheets |
| `importmap` | `{ "@c9up/aurora": "/_assets/aurora/index.js" }` | Extra entries to merge into the page's importmap |

### Why plain JS (and not TS)?

Because **the same module must load in Node AND in the browser**, without a build step on the app side. Aurora's package itself ships JS in `dist/` and is loaded via the importmap. Your pages live in `resources/pages/*.js` and are loaded the same way. If you want types on a page, write a `.d.ts` next to it — your editor will pick it up; the runtime stays JS.

## Low-level — direct hydration

If you don't want the `aurora.render()` helper (you're rolling a custom shell), the same primitives are still exposed:

```js
import { hydrate, html, signal } from '@c9up/aurora'

hydrate(
  document.getElementById('aurora-root'),
  () => Dashboard({ status }),
)
```

The factory **must produce the same `TemplateResult` shape** the server rendered — same slots, same order. Aurora walks the SSR tree along the parsed template path; a mismatch falls back to a console warning but the page stays functional.

The pre-`aurora.render()` `auroraRoute()` helper is still exported for backwards compatibility; new apps should prefer the Inertia-shape API.

## Browser & storage helpers

The client barrel ships SSR-safe DX helpers (node-free — they no-op or return sensible defaults during SSR, so the same page code runs on both sides).

**Navigation** — `redirect(url)`, `replace(url)`, `reload()` (full page loads), plus SPA history without a reload: `navigate(url)`, `back()`, `forward()`.

**Storage** — `WebStorage` is a typed, prefix-namespaced wrapper over `localStorage` / `sessionStorage`:

```js
import { storage, session, WebStorage } from '@c9up/aurora'

storage.set('user', { id: 1 })          // JSON-serialised
storage.get('user')                     // { id: 1 } | null
storage.has('user'); storage.keys()
storage.getOrSet('seed', () => compute())

const prefs = new WebStorage({ prefix: 'prefs:', area: 'local' })
prefs.clear()                           // prefix-scoped — won't touch other keys
```

**`persistedSignal`** — a signal mirrored to storage, with cross-tab sync:

```js
import { persistedSignal } from '@c9up/aurora'

const theme = persistedSignal('theme', 'light')   // restored on reload
theme('dark')                                      // persisted + broadcast to other tabs
```

**Reactive browser state** — signals that track the environment (create once at module scope and share):

```js
import { prefersDark, online, windowSize, visibility, hash } from '@c9up/aurora'

const dark = prefersDark()    // Signal<boolean>, updates on OS theme change
const live = online()         // navigator.onLine
const size = windowSize()     // { width, height } on resize
```

**URL query** — `queryParam(key)` is a signal bound to a query param (reads reflect the URL, writes `pushState` without a reload).

**Cookies / clipboard / share** — `cookie.get/set/remove` (SSR-safe), `clipboard.copy/read`, and `share(data)` (Web Share API).

## HTTP client

`HttpClient` wraps `fetch` so call sites read `await http.get('/auth/me')` instead of hand-rolling headers, `res.json()`, and status checks. Isomorphic (uses the global `fetch`).

```js
import { HttpClient } from '@c9up/aurora'

const api = new HttpClient({
  baseURL: 'https://api.example.com',
  token: () => authToken(),     // bearer, read fresh per request (string or getter)
})

const me = await api.get('/auth/me')              // parsed JSON, Authorization auto-set
await api.post('/posts', { title: 'Hi' })         // plain object → JSON body + content-type
await api.get('/search', { query: { q: 'ream' } })// query params

api.setHeader('Accept-Language', 'fr')            // manage default headers (chainable)
   .setHeaders({ 'X-App': 'web' })
   .removeHeader('x-trace')
```

- Methods: `get` / `post` / `put` / `patch` / `delete`, plus `raw(method, url, body?)` for the untouched `Response`.
- A non-2xx response throws `HttpError` (`status`, `response`, parsed `data`). `isHttpError(e)` is a type guard for clean `catch` narrowing.
- `extend(options)` derives a child client with merged defaults.
- Pass a `parse` option for a runtime-validated, fully-typed result; without it, the generic type is an unchecked assertion of the response shape (the usual HTTP boundary).
- A default same-origin `http` instance is exported for quick same-origin calls.

**Error handling without try/catch** — `attempt()` turns a throw into a discriminated result, so a form submit branches instead of wrapping every call:

```js
import { HttpClient } from '@c9up/aurora'
const api = new HttpClient()

const r = await api.attempt(api.post('/auth/login', creds))
if (r.ok) user(r.data)
else fieldErrors(r.error.data)   // r.error is the HttpError; .data is the parsed 4xx body
```

`attempt` resolves `{ ok: false, error }` on an `HttpError` (non-2xx); genuine transport failures (offline, DNS) still reject — they're exceptional.

**Cancellation & timeout** — pass a `signal` to cancel (on unmount, or a superseded search-as-you-type), or a `timeout` (ms) to auto-abort; both combine, first to fire wins. `isAbortError(e)` recognizes an aborted or timed-out request so you can ignore it:

```js
const api = new HttpClient({ timeout: 8000 })          // default per-request timeout
const controller = new AbortController()
api.get('/search', { query: { q }, signal: controller.signal })
controller.abort()                                      // cancel in-flight
```

## Embedding aurora in inker templates

Aurora islands work inside a server-rendered [Inker](/en/modules/inker) template — no glue code lives in either package, you wire it with one helper. Inker emits a helper's `SafeString` return verbatim, and aurora's `renderToString` produces a component's HTML on the server:

```ts
// boot — register the helper via the Templates helpers Map (or the InkerProvider's
// merged helper map). Helper args cross NAPI as JSON, so pass plain data.
import { renderToString } from '@c9up/aurora'
import { SafeString, Templates } from '@c9up/inker'
import { Counter } from '../islands/Counter.js'

const islands = { Counter }   // name → aurora component factory

const templates = new Templates({
  root: 'resources/templates',
  helpers: new Map([
    ['aurora', (name, data) =>
      new SafeString(
        `<div data-aurora="${name}">${renderToString(islands[name](data))}</div>`,
      ),
    ],
  ]),
})
```

```inker
<!-- inker server template — a SafeString is emitted raw, even in double braces -->
<section>{{ aurora("Counter", page.counter) }}</section>
```

```ts
// client — hydrate the island to attach reactivity
import { hydrate } from '@c9up/aurora'
import { Counter } from './islands/Counter.js'

for (const el of document.querySelectorAll('[data-aurora=Counter]')) hydrate(el, Counter)
```

The client factory must reproduce the same `TemplateResult` shape the server rendered (same constraint as `aurora.render()` hydration). Only return a `SafeString` from author-controlled markup — aurora escapes `${}` interpolations, but the surrounding wrapper string is your responsibility.

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

The kitchen-sink demo wires the full stack with the Inertia-shape API:

- `reamrc.ts` — registers `@c9up/aurora/provider`
- `config/aurora.ts` — points the provider at `resources/pages/`
- `resources/pages/ProjectPage.js` — shared SSR + hydrate page using `component()` + `signal()` + `onMount()` + `relay()`
- `app/modules/site/controllers/SiteController.ts` — `showProjectLive` is one `aurora.render(ctx, 'ProjectPage', props)` call

No `AssetController`, no client-side bootstrap script, no manual importmap: the provider handles all of it.

## Next Steps

- [Photon](/en/modules/photon) — When you need React / Vue / Svelte + Vite
- [Relay](/en/modules/relay) — Realtime channels that pair with aurora's reactive surface
- [Quick Start](/en/guide/quick-start) — Bootstrap a full app
