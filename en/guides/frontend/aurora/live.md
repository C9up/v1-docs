# Live components

This guide covers components whose state lives on the server:

- Define + mount (server)
- Wiring (provider/app)
- Client side
- Shared / multiplayer state

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
import { authorizeLiveChannel, createLiveRouter, wireLiveEvents } from '@c9up/aurora'
// HTTP router + relay resolved from the container (agnostic idiom)
const live = createLiveRouter(registry, relay)

// Who is asking: the same principal the page mounts the session for — the user
// id, the session id. undefined (or a throw) means nobody, and is a 403.
const identify = (ctx) => ctx.auth?.user?.id

// POST /__live/event — only the session's owner reaches it.
wireLiveEvents(httpRouter, live, identify)
// Its channel — only the session's owner subscribes.
relay.authorize('live/:id', authorizeLiveChannel(live, identify))

// rendering a page: const { id, channel, html } = live.mount('Counter', userId)
// on logout: live.disconnect(userId)
```

**A session belongs to the principal it was mounted for.** A session id is a
`randomUUID`, but an unguessable identifier is a secret, not an authorisation
check: it leaks through a referrer, a log line, a shared screenshot. So the
event route and the channel compare the caller `identify` returns with the
session's owner, and answer 403 to anyone else — the app does not write that
check. The route answers 404 for an unknown session, 400 for an event the
component has no handler of its own for (`constructor`, `toString` and the rest
of the prototype are not handlers), and 500 without details when a handler
throws.

**Sessions are bounded.** `mount` runs while the page renders, before the
client has opened anything, so a client that never comes back — curl, a crawler,
a tab closed early — must not keep its session forever:

```typescript
const registry = createLiveRegistry({
  claimTimeoutMs: 60_000,   // unclaimed (no subscription, no event) → disposed
  idleTimeoutMs: undefined, // claimed and silent → kept (default); set it if
                            // relay's disconnect is not wired to live.disconnect
  maxPerOwner: 32,          // past it, the owner's oldest session is disposed
  maxSessions: 10_000,      // past it, mount throws E_AURORA_LIVE_SESSION_LIMIT
})
```

The values shown are the defaults. A session is claimed by its owner
subscribing to its channel or sending it an event. Answer
`E_AURORA_LIVE_SESSION_LIMIT` with a 503: evicting another visitor's session to
make room would hand the limit to whoever mounts fastest.

### Client side

```typescript
import { liveClient, buildLiveTransport, HttpClient } from '@c9up/aurora'
import { relay } from '@c9up/aurora/relay'

const container = document.querySelector('#app')
if (container === null) throw new Error('the page has no #app element')

liveClient({
  container,
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

Gate the channel with `relay.authorize('room/*', …)`. **Caveat**: `relay.broadcast` is in-process; scaling across nodes needs a backplane (Redis). Single-process: nothing to do.
