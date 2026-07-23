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
- auto-mounts `GET /__assets/aurora/*` (the runtime's pre-built `dist/`);
- auto-mounts `GET /__assets/pages/*` (your pages directory).

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

1. Resolves `resources/pages/${name}.js` (dynamic import — picks up edits to the page file on the next request; see [Dev live-reload](#dev-live-reload-hmr) for its transitive imports)
2. Calls the factory with `props`, runs SSR via `renderToString`
3. Wraps the markup in a full HTML document with:
   - the importmap that aliases `@c9up/aurora` → `/__assets/aurora/index.js`
   - a `<script id="aurora-page-data" type="application/json">` blob carrying `{ name, props, url, rootId }`
   - an inline `<script type="module">` that imports aurora + the same page module and calls `hydrate(root, () => Page(data.props))`

Browser-side, aurora adopts the SSR DOM in place, attaches signals + event listeners + lifecycle hooks. The `onMount` callback you wrote fires once the tree is live.

### Context-bound — `ctx.aurora.render(name, props)`

`ctx.aurora.render(name, props)` is the ctx-bound sugar — Ream's analog of AdonisJS's `ctx.view` / `ctx.inertia`. The `ctx` is already captured, so a controller renders a page without threading it through:

```ts
async show({ aurora }) {
  return aurora.render('Dashboard', { user })
}
```

Register the `auroraContext` middleware globally to attach `ctx.aurora` to every request:

```ts
// reamrc.ts (or your global middleware list)
import { auroraContext } from '@c9up/aurora/server'

middleware: [auroraContext()]
```

The module-level `aurora.render(ctx, name, props)` (the agnostic core) still works exactly as shown above — `ctx.aurora.render(name, props)` is just the ctx-bound shorthand over it.

### Options

| Option | Default | What it does |
|---|---|---|
| `lang` | `'en'` | `<html lang="…">` value |
| `rootId` | `'aurora-root'` | id of the `<div>` that wraps the SSR body — must match what your client side expects |
| `headExtra` | `''` | Raw HTML spliced into `<head>` after the importmap. Use for `<title>`, meta tags, stylesheets |
| `importmap` | `{ "@c9up/aurora": "/__assets/aurora/index.js" }` | Extra entries to merge into the page's importmap |

### Why plain JS (and not TS)?

Because **the same module must load in Node AND in the browser**, without a build step on the app side. Aurora's package itself ships JS in `dist/` and is loaded via the importmap. Your pages live in `resources/pages/*.js` and are loaded the same way. If you want types on a page, write a `.d.ts` next to it — your editor will pick it up; the runtime stays JS.

### Dev live-reload (HMR)

Pages are dynamic-imported per request, so aurora dev-busts the **page module** by mtime — a direct edit to `resources/pages/Foo.js` shows up on the next request with no restart. But a page's **transitive** imports (the components, layouts and services it pulls from `resources/pages/**` subfolders) resolve to stable URLs that Node's ESM loader caches for the whole process lifetime. Edit one of those and the SSR HTML stays stale (with a hydration warning) until you restart.

This is the same gap AdonisJS closes with [`hot-hook`](https://github.com/Julien-R44/hot-hook) — a Node loader-hook that tracks the ESM graph and invalidates a boundary's **entire subtree** on change. Wire it into your app; aurora itself needs no change (its computed `import()` is already graph-aware compatible, and its dev `?v=` mtime bust coexists with hot-hook's own versioning):

```bash
pnpm add -D hot-hook @hot-hook/runner
```

```jsonc
// package.json
{
  "scripts": {
    "dev": "hot-runner --node-args=--import=tsx --node-args=--import=hot-hook/register bin/server.ts"
  },
  "hotHook": {
    "boundaries": ["./resources/pages/*.js"]
  }
}
```

Now editing a page **or** any component/layout/service it imports hot-reloads the SSR with no restart. Edits outside the pages tree (`app/`, `config/`, `start/`, `providers/`) trigger a full restart via `hot-runner`, exactly as before.

> **Point `boundaries` at page _entries_ only** — `./resources/pages/*.js` (direct children), **not** `**/*.js`. hot-hook requires every file matching `boundaries` to be dynamically imported; a component that is statically imported but happens to match the glob is flagged "wrongly imported" and forces a full reload. Keep pages as direct children of `resources/pages/` and components in subfolders (`atoms/`, `molecules/`, …) — they become hot-reloadable as downstream deps of a page boundary. Mirrors Adonis's `["./app/controllers/**/*.ts"]` (entrypoints only).

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

**Clipboard / share** — `clipboard.copy/read` and `share(data)` (Web Share API).

## Isomorphic cookies

`cookie.get/set/remove` is an SSR-safe accessor over `document.cookie`. On its own
it can't help SSR, though: during a server render there is no `document`, so a page
that decides its layout from a cookie (a collapsed sidebar, a theme, a locale)
renders the **default** — then the browser reads the real cookie on hydration and
repaints, e.g. a sidebar that animates open→collapsed on every navigation.

The fix is **`cookieSignal`** — a signal backed by a cookie, seeded from the cookie
on **both** sides (the SSR request seed on the server, `document.cookie` in the
browser) and persisting every write back. Same value server- and client-side ⇒ the
SSR markup matches hydration ⇒ no flash, no mismatch.

```js
import { cookieSignal, cookieState, booleanCookie, jsonCookie } from '@c9up/aurora'

// String state:
const locale = cookieSignal('locale', 'en')
locale('fr')                        // persisted to the cookie

// Typed state via a codec (boolean / enum / JSON):
const collapsed = cookieState('sidebar', false, booleanCookie)   // "1" / "0"
const prefs = cookieState('prefs', { dense: false }, jsonCookie({ dense: false }))
```

Use it in a page, read at the top (before any `await`):

```js
export default function Sidebar() {
  const collapsed = cookieState('sidebar', false, booleanCookie)
  return html`<aside class="${() => (collapsed() ? 'w-16' : 'w-60')} transition-all">…</aside>`
}
```

For the **server** to seed the cookie, list it in `render()` / `renderPage()` via the
`cookies` allowlist — aurora reads only those names from the request and seeds them
before rendering (they are NOT serialized into the page; the browser reads
`document.cookie`):

```js
await aurora.render(ctx, 'Sidebar', props, {
  cookies: ['sidebar', 'theme'],   // plain, JS-readable UI cookies only
})
```

> ⚠️ Never list a session / signed / encrypted / `httpOnly` cookie in `cookies` —
> those must stay server-only. The allowlist is for plain UI-state cookies.
>
> `cookieSignal` is the cookie twin of `persistedSignal` (which mirrors to web
> storage, client-only). Reach for `cookieSignal` when the **server** must read the
> value too; `persistedSignal` when it's purely client-side.

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

## JSON-RPC client — `createRpcClient`

A typed JSON-RPC 2.0 client for Ream's RPC endpoint (`@c9up/ream`'s `RpcProvider`
mounts `POST /rpc`). It builds on `HttpClient`, so it inherits the base URL, auth
headers, and timeouts.

> Under the hood this is a thin binding over the agnostic
> [`@c9up/comet`](/en/modules/comet) client — aurora wires `HttpClient` as comet's
> transport and re-exports its surface (`RpcError`, `isRpcError`, the types).
> Because RPC is opt-in, it lives on the **`@c9up/aurora/rpc`** subpath (not the
> main barrel) and `@c9up/comet` is an **optional peer dependency** — install it
> only when you use RPC; projects that don't never pull it.
>
> No browser wiring needed: when comet is installed, `AuroraProvider` auto-serves
> its runtime at `<assetsPrefix>/comet/*` and `render()` adds `@c9up/comet` to the
> importmap, so the RPC client's bare `import '@c9up/comet'` resolves in the
> no-bundler browser with zero app-side importmap or mount. (To serve any other
> package the same way, `@c9up/aurora/server` exports `packageAssetDir(specifier)`,
> which uses `import.meta.resolve` — correct for ESM-only packages where
> `require.resolve` throws.)

```ts
import { createRpcClient } from '@c9up/aurora/rpc'

const rpc = createRpcClient()                  // POST /rpc, same-origin
// or: createRpcClient({ url: '/api/rpc', http: existingHttpClient })

// Single call — typed via call<T>(); throws RpcError on a JSON-RPC error.
const result = await rpc.call<{ valid: boolean }>('task.validate', { id: 7 })
```

### CSRF — automatic `X-XSRF-TOKEN`

When `/rpc` is cookie/session-authed it's CSRF-protected (blackhole's signed
double-submit). `createRpcClient()` handles this: on every call it reads the
`XSRF-TOKEN` cookie and echoes it as the `X-XSRF-TOKEN` header (the axios/Angular
convention). It's a no-op outside the browser and when the cookie is absent — so
a Bearer-authed `/rpc` (CSRF-immune) is unaffected.

```ts
createRpcClient()                    // xsrf on by default
createRpcClient({ xsrf: false })     // opt out
// override the names (defaults shown):
createRpcClient({ xsrfCookieName: 'XSRF-TOKEN', xsrfHeaderName: 'X-XSRF-TOKEN' })
```

The third argument is a per-call **options** object. Pass `parse` to validate the
result at runtime instead of the unchecked `T` assertion (same pattern as
`HttpClient`'s `parse`), and `signal` to make the call abortable:

```ts
const user = await rpc.call('user.find', { id }, {
  parse: (data) => {
    if (!isUser(data)) throw new Error('bad shape')
    return data
  },
})

const ac = new AbortController()
await rpc.call('slow.op', params, { signal: ac.signal })   // ac.abort() cancels
```

Errors surface as `RpcError` (carries `code`, `message`, `data`):

```ts
import { isRpcError } from '@c9up/aurora/rpc'

try {
  await rpc.call('task.validate', { id })
} catch (err) {
  if (isRpcError(err)) console.error(err.code, err.message, err.data)
}
```

Send several calls in one round-trip with `batch()` — it returns one settled
entry per call, in request order (responses are matched back by id):

```ts
const [a, b] = await rpc.batch([
  { method: 'task.validate', params: { id: 1 } },
  { method: 'user.find', params: { id: 2 } },
])
if (a.ok) console.log(a.value)
if (!b.ok) console.error(b.error.message)
```

Pairs naturally with [`command`](#async-actions-command) for reactive calls:

```ts
const validate = command((p) => rpc.call('task.validate', p))
```

## URL builder — `urlFor`

Build URLs from **named routes** (defined server-side with `.as()`) instead of
hard-coding paths — the client half of Ream's `router.urlFor`, isomorphic so the
same call works during SSR and after hydration.

```ts
import { urlFor } from '@c9up/aurora'

urlFor('users.show', { id: 42 })           // → '/users/42'
urlFor('auth.login')                       // → '/login'
urlFor('search', {}, { q: 'ream', p: 2 })  // → '/search?q=ream&p=2'
```

It resolves against a `name → pattern` manifest. Hand it to the renderer from the
server — build it with `router.namedManifest()`:

```ts
await aurora.render(ctx, 'Users', { users }, {
  routes: router.namedManifest(), // only NAMED routes are exposed to the client
})
```

`renderPage` installs the manifest before SSR and serializes it into the page, so
the hydrate bootstrap re-installs it via `setRouteManifest` — `urlFor` then
resolves identically on the server and in the browser. (`setRouteManifest(routes)`
is exported too, if you need to install it by hand.) See
[Routing → Named Routes](../guide/routing.md#named-routes).

## Tailwind classes — `cn`

Compose class names and resolve Tailwind conflicts — a **zero-dependency**
reimplementation of `clsx` + `tailwind-merge` (no external deps). Dedup is the
whole point: within a variant scope, the **last** class of each conflicting group
wins.

```ts
import { cn } from '@c9up/aurora'

cn('px-2 py-1', isActive && 'bg-indigo-600', props.class)
cn('px-2', 'px-4')             // → 'px-4'    (later wins within a group)
cn('mr-4', 'mr-8')             // → 'mr-8'    (no accumulation)
cn('text-red-500', 'text-sm')  // → 'text-red-500 text-sm' (different groups)
cn('hover:p-2', 'hover:p-4')   // → 'hover:p-4' (variant-scoped)
```

Targets the standard Tailwind **v4** utility set (variants, important `!`,
arbitrary `[…]` values/properties, `/opacity`, negatives); unknown classes are
kept untouched. `clsx` and `twMerge` are exported too if you want the pieces. See
also [Tailwind](./tailwind.md).

## Async actions — `command`

`command()` wraps an async task (typically an `HttpClient` call) with reactive
`loading` / `data` / `error` signals plus chainable `onSuccess` / `onFail` /
`onSettled` handlers and a `run(...args)` launcher — so call sites never write
`then`/`catch` and the template binds the in-flight state directly.

```js
import { command, HttpClient, isHttpError } from '@c9up/aurora'
const api = new HttpClient()

const login = command((creds) => api.post('/auth/login', creds))
  .onSuccess((u) => redirect('/app'))
  .onFail((e) => formError(isHttpError(e) ? e.data : 'Network error'))

login.run(creds)            // launch — no try/catch
login.loading()             // reactive: bind to a spinner / disabled button
login.data(); login.error() // latest result / error
```

- `run(...args)` is **re-runnable** with different args each time; the signals
  reflect the LATEST run. A superseded (slower) run that resolves after a newer
  one is silently dropped — safe for search-as-you-type / retry.
- `run()` always resolves (never throws): success → `data` + `onSuccess`, failure
  → `error` + `onFail`, always `onSettled`.
- `reset()` clears `data`/`error`/`loading`.
- It is **not** a Promise — it's a *re-runnable* factory of promises plus
  reactive state. For a one-shot call with no UI state, `attempt()` is enough.
- The task is any `Promise`, so a "multi" call is just `Promise.all` inside it:
  `command(() => Promise.all([api.get('/a'), api.get('/b')]))`.

## Forms — `form`

`form()` is a minimal reactive form controller: per-field `value` / `error` /
`touched` signals, optional validation, and a submit driven by `command` (so
`submitting` / `submitError` are reactive). It composes the pieces above —
fields are signals, the submit is a `command`.

```js
import { form, HttpClient, isHttpError } from '@c9up/aurora'
const api = new HttpClient()

const f = form({
  initial: { email: '', password: '' },
  submit: (values) => api.post('/auth/login', values),
})
  .onSuccess(() => redirect('/app'))
  .onFail((e) => { if (isHttpError(e)) f.setErrors(e.data?.errors ?? {}) })

const email = f.field('email')   // { value, error, touched, set, markTouched }
```

```js
// in a template
html`
  <form @submit=${(e) => f.handleSubmit(e)}>
    <input value=${email.value}
           @input=${(e) => email.set(e.target.value)}
           @blur=${email.markTouched} />
    ${() => email.touched() && email.error()
      ? html`<span class="err">${email.error()}</span>`
      : null}

    <button ?disabled=${f.submitting}>
      ${() => f.submitting() ? 'Signing in…' : 'Sign in'}
    </button>
  </form>
`
```

`handleSubmit()` calls `preventDefault()`, marks every field touched, validates,
and submits only when valid. `setErrors()` injects server-side field errors (e.g.
from `HttpError.data`). `reset()` restores `initial` and clears errors/touched.

### Validation with rune (optional)

Validation is **agnostic and optional**. Pass a `validate` function returning a
`{ field: message }` map, OR any object with a `.validate(values)` method — a
[rune](/en/modules/rune) schema satisfies that shape, so it drops in with **no
hard dependency** (aurora never imports a validator):

```js
import { rules, schema } from '@c9up/rune'

const f = form({
  initial: { email: '', password: '' },
  validate: schema({
    email: rules.string().email(),
    password: rules.string().min(8),
  }),
  submit: (values) => api.post('/auth/login', values),
})
```

A rune schema returns `{ valid, errors: [{ field, message }] }`; the form maps
those onto each field's `error` signal. With no `validate`, the form simply never
reports field errors.

### Localized messages with rosetta (optional)

rune routes its messages through [rosetta](/en/modules/rosetta) via
`bindRosetta` — call it once at boot and every validation message (and therefore
every `field.error()`) is translated in the active locale:

```js
import { bindRosetta } from '@c9up/rune'
import { rosetta } from '../config/rosetta.js'

bindRosetta(rosetta)   // rune messages now go through rosetta.t(key, params)
```

aurora stays unaware of both — `form` only reads the `{ field, message }` rune
produces, already localized. Pick your own validator or translator freely.

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

## Live Components (server-resident state)

**Live components** keep state **on the server** (ordinary aurora signals) and send the browser only **precise per-slot patches** — never a full HTML re-render. Because each signal already knows which slot it feeds, a patch is `{slot, value}` for ONLY the changed slots (O(changed data), not O(component size)). That precision beats HTML-diffing live-view libraries — and, with state living server-side, it gives native **real-time multiplayer**.

### Define + mount (server)

```typescript
import { mountLiveSession, createLiveRegistry, html, signal } from '@c9up/aurora'

const registry = createLiveRegistry()
registry.define('Counter', () => {
  const count = signal(0)
  return {
    view: html`<button data-live-click="increment">Count: <span>${count}</span></button>`,
    handlers: { increment: () => count(count() + 1) },
  }
})
```

> **Authoring rule**: a reactive text slot must be the SOLE content of its element (`<span>${count}</span>`, not `Count: ${count}`) — SSR merges adjacent static+dynamic text and hydration can't re-split it.

### Wiring (provider/app)

```typescript
import { createLiveRouter, wireLiveEvents } from '@c9up/aurora'
// HTTP router + relay resolved from the container (agnostic idiom)
const live = createLiveRouter(registry, relay)
wireLiveEvents(httpRouter, live)              // POST /__live/event route
// rendering a page: const { id, channel, html } = live.mount('Counter', uid)
// on relay disconnect: live.disconnect(uid)
```

### Client side

```typescript
import { liveClient, buildLiveTransport, HttpClient } from '@c9up/aurora'
import { relay } from '@c9up/aurora/relay'

liveClient({
  container: document.querySelector('#app')!,
  factory: () => html`<button data-live-click="increment">Count: <span>${count}</span></button>`,
  mount,                                       // { id, channel } injected into the page
  transport: buildLiveTransport(relay(), new HttpClient()),
})
```

`liveClient` **hydrates** the SSR HTML, applies inbound patches by setting the mirror signal (aurora patches the exact node), and forwards `data-live-click` via the transport.

### Shared / multiplayer state

A `liveStore` is ONE server-side instance whose state is shared by every client on a channel: one `dispatch` mutates once → one patch computed once → `relay.broadcast` fans it out to all (O(1) compute, O(N) network).

```typescript
import { liveStore } from '@c9up/aurora'
const presence = liveStore(() => {
  const online = signal(0)
  return { view: html`<span><b>${online}</b> online</span>`, handlers: { join: () => online(online() + 1) } }
}, relay, 'room/lobby')
```

Gate the channel with `relay.authorize('room/*', …)`. **Caveat**: `relay.broadcast` is in-process; scaling across nodes needs a backplane (Redis) — the same constraint as Phoenix LiveView. Single-process: nothing to do.

## Next Steps

- [Photon](/en/modules/photon) — When you need React / Vue / Svelte + Vite
- [Relay](/en/modules/relay) — Realtime channels that pair with aurora's reactive surface
- [Quick Start](/en/guide/quick-start) — Bootstrap a full app
