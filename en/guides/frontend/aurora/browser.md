# Browser helpers

This guide covers storage, cookies, HTTP and URLs in the browser:

- Browser & storage helpers
- Isomorphic cookies
- HTTP client
- URL builder — `urlFor`
- Tailwind classes — `cn`

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
- `extend(options)` derives a child client with merged defaults, the XSRF settings included. When its `baseURL` is on another origin, the inherited credentials — the token, an `Authorization` or XSRF header — stay behind: pass them in `options`, or set `allowCrossOriginAuth: true`, to send them there on purpose. `token: null` means no token.
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
[Routing → Named Routes](/en/guides/basics/url-builder#named-routes).

**The serialized manifest is public** — every visitor of the page can read it, so
`router.namedManifest()` as is hands an anonymous visitor of `/login` the names
and paths of your admin and internal routes. Expose only the routes the browser
calls `urlFor` on, with `clientRoutes` — per call, or once in `config/aurora.ts`:

```ts
// config/aurora.ts
import { defineConfig } from '@c9up/aurora/server'

export default defineConfig({
  clientRoutes: { only: ['auth.*', 'users.*'] },  // or { except: ['admin.*'] }
})                                                 // or (name, pattern) => boolean
```

`*` matches any run of characters. The server still resolves against the whole
`routes` map; only the copy in the page is filtered. Without `clientRoutes`,
every route is serialized. In development, a route the page resolved on the
server but left out of the client is warned about: a `urlFor` of it would throw
once the page hydrates.

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
also [Tailwind](/en/guides/frontend/tailwind).
