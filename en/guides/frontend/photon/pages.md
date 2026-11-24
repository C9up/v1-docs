# Pages and props

This guide covers rendering pages and passing props:

- Rendering Pages
- Shared Props
- Prop helpers
- Response-level fields
- Validation errors

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

### The page object — `ctx.photon.page()`

`ctx.photon.page(component, props)` builds the page object `render()` would send — props resolved against the request (a partial reload included), `deferredProps`, merge labels, `sharedProps`, the history flags, the version — without writing a response. `render()` is built on it, so what a test asserts on is what the client gets:

```typescript
const page = await ctx.photon.page('Dashboard', { stats: defer(() => getStats()) })
// page.deferredProps → { default: ['stats'] }, page.props has no `stats`
```

### The protocol for another renderer

A renderer that writes its own document — aurora does, with its importmap and no
build step — speaks the same protocol through photon's pieces, so the protocol
keeps one implementation:

- server: `readRequestInfo(ctx)` reads a request's protocol headers,
  `buildPageObject(component, props, { url, version, framework, partial })`
  builds the page object as `render()` would, and `finishVisit(ctx, res, info,
  { url, version })` answers what a visit gets instead of a page (409 on a stale
  version, 303 after a redirected mutation, 302 for a plain load's
  `location()`); `varyOnPhoton(res)` adds the `Vary`;
- client: `bootPage({ target, resolveComponent, mount })` from
  `@c9up/photon/client` boots the router with the renderer's own adapter —
  `mount` puts the first page on screen and returns `{ update, unmount }`, which
  every visit updates. The page object's `framework` names that adapter
  (aurora's is `aurora`); `hydrate()` stays the entry for the bundled React,
  Vue and Svelte ones.

Off the browser, the router runs on a host: `bootPage({ host, url, … })` takes
a `PhotonHost` — the platform's current address, history, requests, full
loads and events — and fetches the first page from `url` as a visit would,
where there is no server-rendered document to read it from. orbit's
[server-driven pages](/en/guides/mobile/server-driven#server-driven-pages) are such a host.
`@c9up/photon/client/core` is the router, `bootPage` and the routes helpers
without `hydrate()` and its bundled adapters, for a bundler that follows every
`import()` (Metro).

### The HTML document — `rootView`

A first visit is answered with an HTML document. Without configuration Photon writes a minimal one; `rootView` makes it the application's — the `<html lang>`, a favicon, fonts, a body class:

```typescript
export default defineConfig({
  framework: 'react',
  entryClient: 'resources/app.tsx',
  // a template the view engine renders as ctx.view.render('app', data):
  rootView: 'app',
  // or chosen per request:
  // rootView: (ctx) => (ctx.auth?.user ? 'app' : 'guest'),
})
```

The template receives `page` (the page object, plus `ssrHead` / `ssrBody` when the page is server-rendered), `photon.head` and `photon.body` (Photon's markup, ready to place unescaped: meta tags, stylesheets, the page data, the `<div id="app">` mount and the entry scripts, each with the request's CSP nonce) and the view props given as `render()`'s fourth argument:

```typescript
await ctx.photon.render('Dashboard', { user }, undefined, { lang: 'fr', theme: 'dark' })
```

A host with no view engine returns a function that writes the document itself:

```typescript
rootView: (ctx) => ({ photon, lang }) =>
  `<!DOCTYPE html><html lang="${lang}"><head>${photon.head}</head><body>${photon.body}</body></html>`,
```

A template name on a request without `ctx.view` throws `E_PHOTON_INVALID_CONFIG`. The fourth position for view props is a named deviation: upstream's third argument is the view props, Photon's is the per-call `<head>` metadata.

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

## Prop helpers

A controller shapes the props it sends with these helpers:

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
  fail without taking the whole reload with it: the prop is left out and named
  in `rescuedProps`, and the error is still reported — to the request's
  `logger.error({ err }, 'Rescued deferred prop "stats"')` by default
  (`console.error` without a logger). `onRescue((error, { prop, ctx }) => …)`
  replaces that listener process-wide; `onRescue()` restores it.
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

Each deferred prop is asked for once per visit. When the answer does not carry
it (and the server did not rescue it), the router does not ask again: it
reports `E_PHOTON_DEFERRED_PROPS_MISSING` on `router.on('exception', cb)` and
as `photon:exception` on `document`, and the `<Deferred>` keeps its fallback.

On a partial reload — a deferred group, `router.reload({ only })` — the props
labelled `merge`, `merge().prepend()` or `deepMerge` are combined with what the
page holds, following `matchOn`; a full visit replaces them.

A `once` value is kept by the page that received it: every request announces
the keys still held and not expired (`x-photon-except-once-props`), the server
skips resolving them, and the router puts its copy back with its first expiry.

A `scroll` prop is paginated from the page with `useInfiniteScrollData`, the data
half of infinite scroll:

```ts
import { useInfiniteScrollData } from '@c9up/photon/client'

const users = useInfiniteScrollData({ getPropName: () => 'users' })
if (users.hasNext()) await users.fetchNext()   // ?page=N, rows appended
if (users.hasPrevious()) await users.fetchPrevious() // rows prepended
```

Each call is a partial reload of the scroll prop; the address bar does not move,
and a `null` page on either side stops the requests. A reload with
`reset: ['users']` starts the cursor over.

`useInfiniteScroll` wires it to the page: it loads a side
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

## Response-level fields

```ts
ctx.photon.clearHistory()        // call it on logout
ctx.photon.encryptHistory()         // or for every page: encryptHistory: true in the config
ctx.photon.flash(() => ctx.session.flashMessages.all())
```

`clearHistory` matters at logout: without it the back button replays pages built
from the previous session's data, straight out of the client's own cache.
A logout usually redirects, and a redirect carries no page: when the request has
a session, the instruction is stored there and the next page built — after the
redirect — carries it, once.

The router keeps each page in `history.state`. With `encryptHistory` that copy is
AES-GCM ciphertext under a key kept in `sessionStorage`; `clearHistory` deletes
the key, so every earlier entry becomes unreadable and the back button — or a
page restored from the back-forward cache — loads the URL from the server
instead. Every entry gets its own random IV, and without Web Crypto (a page not
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

## Validation errors

`props.errors` is shared with every page, so a form component can read
`errors.email` unconditionally. The `x-photon-error-bag` header scopes them,
which is how two forms on one page keep their messages apart. With no errors
there is no bag either: `errors` stays `{}`, because any key in it reads as a
failed submission.
