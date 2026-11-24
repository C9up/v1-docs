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
  claimTimeoutMs: 60_000,      // unclaimed (no subscription, no handled event) → disposed
  idleTimeoutMs: 10 * 60_000,  // claimed, then no event and no keep-alive → disposed
  maxPerOwner: 32,             // past it, the owner's oldest session is disposed
  maxSessions: 10_000,         // past it, mount makes room or throws E_AURORA_LIVE_SESSION_LIMIT
})
```

The values shown are the defaults, and they are the production settings: you
do not have to set anything. A session is claimed when its owner subscribes to
its channel or sends it an event the component handles; a POST naming an event
the component does not have (answered 400) claims nothing.

A claimed session stays while its client is there. Each handled event restarts
its idle clock, and so does the keep-alive `liveClient` sends every two minutes
(`keepAliveMs`) through `buildLiveTransport`. A client that only watches keeps
its session; a closed tab stops sending, and its session ends ten minutes later.
If you write your own transport, give it a `keepAlive(id)` that posts
`{ id, keepAlive: true }` to the event route, or set `idleTimeoutMs` to the
longest time your users may watch without clicking. Keep `idleTimeoutMs` well
above the client's `keepAliveMs`.

When the registry is full, `mount` makes room before it refuses: the oldest
session nobody claimed goes first, then the least recently used one that has
been silent for half of `idleTimeoutMs`. A session in use is never evicted.
Only when every session is in use does `mount` throw
`E_AURORA_LIVE_SESSION_LIMIT`; answer it with a 503.

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

`liveClient` **hydrates** the SSR HTML, applies inbound patches by setting the mirror signal (aurora patches the exact node), forwards `data-live-click` via the transport, and keeps the session alive every `keepAliveMs` (two minutes by default) while it is mounted.

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
