# Server-driven pages

This guide covers pages driven by the server, comet and relay on the phone:

- Server-driven pages
- Comet and relay

## Server-driven pages

```ts
import { serverPages } from '@c9up/orbit/pages'
import Home from './pages/Home.js'
import Orders from './pages/Orders.js'

run(() => html`${serverPages({ server: 'https://app.example', pages: { Home, Orders } })}`)
```

The ream server stays the router. The app asks it for the first page object,
then each link or `router.visit()` asks for the next one through
[photon](/en/guides/frontend/photon/)'s protocol — the one the browser speaks after
aurora's [`visits: true`](/en/guides/frontend/aurora/). The same controller answers the
browser and the phone; the phone shows the page it names, an aurora component
bundled with the app. A page that imports from `@c9up/aurora` and
`@c9up/photon/client/core` is the very module the browser loads.

- Each page is a screen of a stack: a visit to a new address slides one in;
  a partial reload, a deferred prop or a redirect to the same address
  replaces it in place.
- The back button goes through photon's history: the covered page comes back
  as it was left, without a request.
- A stale version (the server was deployed again) starts over from the page
  asked for, as a browser's full load does.
- Requests carry the session cookie and echo the `XSRF-TOKEN` the server set.
  A link off the server goes to `open(url)`.
- An `<a href>` in a view is a touch target of its own (in a block, each link
  takes its line); one inside a sentence (`<p>… <a>…</a> …</p>`) is not
  pressable yet.
- `server` (an origin, or the connection below) must be https. Plain http only reaches this machine (`localhost`,
  through `adb reverse`) or the emulator's host (`10.0.2.2`), and the app must
  allow cleartext traffic for it.
- `loading` replaces the blank screen shown until the first page arrives;
  `failed(error, retry)` replaces the default failure screen.

React Native's `URL` resolves a relative reference by appending it to its
base; the app entry installs a standard one (`installStandardUrl()` for an app
wired by hand).

## Comet and relay

The app's server is one connection, which pages, comet calls and relay
subscriptions all go through:

```ts
import { connectServer } from '@c9up/orbit'
import { serverPages } from '@c9up/orbit/pages'
import { createRpcClient } from '@c9up/comet/client'
import { configureRelay, relay } from '@c9up/aurora/relay'

const server = connectServer('https://app.example')

const rpc = createRpcClient({ url: server.url('/rpc'), transport: server.json })
configureRelay({
  sseUrl: server.url('/__relay/events'),
  subscribeUrl: server.url('/__relay/subscribe'),
  unsubscribeUrl: server.url('/__relay/unsubscribe'),
  stream: server.stream,
  fetch: server.fetch,
})

run(() => html`${serverPages({ server, pages })}`)
```

- `server.fetch` reaches the server's origin only, sends the session cookie,
  and echoes the `XSRF-TOKEN` the server set on every mutation — what a
  browser does for a page, which an app has to be given.
- `server.json` is comet's transport: a JSON POST, its JSON answer.
- `server.stream` is server-sent events read from React Native's streaming
  XHR, as `EventSource` reads them (named events, `retry:`, `Last-Event-ID`
  on reconnect); an answer that is not an event stream fails it for good.
- `server.authorize(token)` sends `Authorization: Bearer <token>` with every
  request and stream from then on; with a `tokenStore` (below) the token is
  kept, and `server.restore()` signs in again at the next launch — an API's token, which, unlike a browser's
  `EventSource`, the phone can send on the event stream too.
