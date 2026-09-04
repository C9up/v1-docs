# Nova — Web Push notifications

Status: **Active** — subscription endpoint, push delivery, four subscription stores, Service Worker scaffold and the `helix.nova.fake` test integration.

`@c9up/nova` is Ream's Web Push package. It owns three things:

1. **VAPID identity** — generates and persists the P-256 ECDH key pair every push service requires.
2. **Subscription endpoint** — a built-in `POST /api/nova/subscribe` route, gated by Warden, that persists `PushSubscription` JSON into a pluggable `SubscriptionStore`.
3. **Browser helpers** — a tiny `subscribe()` client that wires `navigator.serviceWorker.register()` and `pushManager.subscribe()` together.

Nova is **not** a multi-channel orchestrator. Mail goes through Rover, realtime through Relay, queues through Bay, persistence through Atlas. Nova does Web Push only. (See ADR-002.)

## Install

```bash
pnpm add @c9up/nova
ream configure @c9up/nova
```

`ream configure` registers the provider in `reamrc.ts`, writes a `config/nova.ts` stub, and seeds three placeholders into `.env`: `NOVA_VAPID_PUBLIC_KEY`, `NOVA_VAPID_PRIVATE_KEY`, `NOVA_VAPID_SUBJECT`.

## Generate VAPID keys

```bash
ream nova:vapid:generate
```

Mints a P-256 key pair using Node's `crypto.generateKeyPairSync('ec')` (no `web-push` dependency) and upserts the three `NOVA_VAPID_*` env vars into `.env`. Edit `NOVA_VAPID_SUBJECT` to a real `mailto:` address before deploying — push services use it to contact you about subscription issues.

If `NOVA_VAPID_PRIVATE_KEY` is already set, the command refuses to overwrite. Pass `--force` to rotate.

The private key signs every push the application will ever send, so whoever can read it can send notifications as the application to every one of its subscribers. When the command creates `.env` it creates it `0600` — owner only — rather than letting the umask make it world-readable. When `.env` already exists its permissions are the deployment's decision: the command leaves them alone and says so if the file can be read beyond its owner.

## Configure

```ts
// config/nova.ts
import { defineConfig, stores } from '@c9up/nova'
import env from '#start/env'

export default defineConfig({
  routePrefix: '/api/nova', // POST /api/nova/subscribe
  guard: 'jwt',             // any Warden strategy name, or null for test-only

  // Which store keeps the subscriptions. Named in the environment, so a
  // deployment picks its backend without editing this file.
  default: env.get('NOVA_STORE', 'memory'),
  stores: {
    memory: stores.memory(),
    file:   stores.file({ path: 'storage/push_subscriptions.json' }),
    sql:    stores.sql({ connection: () => app.container.resolve('db') }),
    redis:  stores.redis({ connection: 'main' }),
  },

  vapid: {
    publicKey: env.get('NOVA_VAPID_PUBLIC_KEY'),
    privateKey: env.get('NOVA_VAPID_PRIVATE_KEY'),
    subject: env.get('NOVA_VAPID_SUBJECT'),
  },
})
```

Factories are lazy: only the store `default` names is built, so declaring a Redis store in a config that runs on the file store costs nothing.

A `default` naming a store that is not in `stores` is refused at boot — and so is a `default` with no `stores` block to pick from. Neither falls back to the in-memory driver: an application that meant to persist its subscriptions and silently got memory only finds out when a restart has lost them all.

The provider also respects a pre-existing container binding for `'SubscriptionStore'`, which wins over the config. `store: <instance>` is the single-store form, kept for configs written against it.

Only `guard` decides whether `POST /api/nova/subscribe` is authenticated. Dropping it is not the same as leaving it out — omitting the key keeps the `'jwt'` default, `guard: null` removes the check entirely and is for tests.

## Client subscription

```ts
import { registerServiceWorker, subscribe } from '@c9up/nova/client'

await registerServiceWorker('/sw.js')
const pushSubscription = await subscribe(import.meta.env.VITE_NOVA_VAPID_PUBLIC_KEY)
console.log('subscribed:', pushSubscription.endpoint)
```

`subscribe()` waits for the active Service Worker, calls `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, then POSTs the result to `/api/nova/subscribe` with `credentials: 'include'` so the JWT cookie/header is carried automatically.

The `@c9up/nova/client` sub-path is browser-only — its source has zero `node:` imports — so it bundles cleanly with Vite/Rollup without polyfills.

## Service Worker

`ream configure @c9up/nova` writes `public/sw.js` alongside `config/nova.ts` and the migration template. The scaffold is the working push handler the maintainer would otherwise write by hand; `registerServiceWorker('/sw.js')` then resolves against a real file from the very first run.

The shipped template is byte-for-byte equivalent to the inlined `SW_TEMPLATE` constant in `packages/nova/src/configure.ts`:

```js
// Service Worker scaffolded by `ream configure @c9up/nova`.
//
// Lifecycle: `skipWaiting` + `clients.claim` so the first push that arrives
// after subscription is delivered through this SW (not dropped in the
// install→activate race window).
//
// Push handler: parse the JSON payload sent by
// `nova.push(sub, { title, body, icon, url, tag, data })` and display a
// notification. `userVisibleOnly: true` (set by @c9up/nova/client
// `subscribe()`) means we MUST call `showNotification` on every push or
// the browser revokes the subscription — every parse/error path falls back
// to a generic notification rather than throwing out of the listener.
//
// Notificationclick: close the notification, then focus an existing tab
// whose URL matches `data.url` (preferring visible/focused tabs), falling
// back to opening a new window. URL comparison normalises the inbound
// path against the SW origin.
//
// Registered from the app via `registerServiceWorker('/sw.js')` from
// `@c9up/nova/client`. Edit freely — re-running `ream configure @c9up/nova`
// will NOT overwrite this file.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload = {}
  try {
    const parsed = event.data.json()
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      payload = parsed
    }
  } catch {
    try {
      payload = { title: event.data.text() }
    } catch {
      payload = {}
    }
  }
  const { title = 'Notification', body, icon, url, tag, data } = payload
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      tag,
      data: { ...(data ?? {}), ...(url !== undefined ? { url } : {}) },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url
  if (!target) return
  const targetURL = new URL(target, self.location.origin).href
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const matches = clients
          .filter((client) => client.url === targetURL)
          .sort((a, b) => {
            const aVisible = a.visibilityState === 'visible' ? 0 : 1
            const bVisible = b.visibilityState === 'visible' ? 0 : 1
            if (aVisible !== bVisible) return aVisible - bVisible
            return (b.focused === true ? 1 : 0) - (a.focused === true ? 1 : 0)
          })
        if (matches.length > 0) {
          return matches[0]
            .focus()
            .catch(() => self.clients.openWindow(targetURL).catch(() => {}))
        }
        return self.clients.openWindow(targetURL).catch(() => {})
      }),
  )
})
```

### Customising the SW

Edit `public/sw.js` directly. Re-running `ream configure @c9up/nova` will NOT overwrite it (the codemods `writeFile` skips existing files unless `force: true` — same idempotency contract as `config/nova.ts` and the migration template).

### Sub-path apps

The default registration is root-scope (`registerServiceWorker('/sw.js', { scope: '/' })`). If the app is mounted at `/admin`, **move** (not copy) the SW after scaffold and update the registration:

```bash
git mv public/sw.js public/admin/sw.js
```

```ts
await registerServiceWorker('/admin/sw.js', { scope: '/admin/' })
```

`git mv` (rather than `cp`) avoids leaving an orphan `public/sw.js` that would still be served at `/sw.js` and could re-register a root-scope SW behind your back if a stale browser tab hits the old URL.

**Scope rule.** A Service Worker file's URL determines the maximum scope the browser will accept. Serving `/sw.js` cannot scope to `/admin/` without sending the `Service-Worker-Allowed: /admin/` HTTP response header from the SW's URL — the simpler workaround (and what this section recommends) is to put the SW file at the deepest URL its scope needs.

The codemods context has no signal about app scope, so the scaffold writes the documented root-scope default; sub-path apps relocate the file the same way they would override any other default.

### `notificationclick` URL convention

The SW reads `event.notification.data.url`. Whatever `url` field you pass to `nova.push(sub, { url: '/inbox/42' })` is what the SW opens on click — focus an existing tab matching that URL, else open a new window. Apps with a different routing convention (e.g. a `data.deeplink` field, or `actions[0].action`) edit the SW template directly.

### Why `'Notification'` as a default title

`userVisibleOnly: true` (set by `subscribe()`) forces the SW to call `showNotification` on every push or the browser revokes the subscription. The `title = 'Notification'` fallback in the destructuring pattern guarantees that a malformed payload still produces a notification (some browsers reject `showNotification(undefined, …)`); the template's `try/catch` around `event.data.json()` handles non-JSON pushes the same way.

## Service Worker hardening checklist

The default `SW_TEMPLATE` in `packages/nova/src/configure.ts` ships with eight hardening invariants. Plugin authors customising the SW (or shipping their own template) MUST preserve all eight — every one of them maps to a real production-bug class caught during the Epic 48 code review. A thrown error inside a push listener tells the browser to revoke the subscription as a "broken endpoint", so the bar for defensiveness is unusually high.

1. **`event.data.json()` result guarded as `typeof === 'object' && !Array.isArray(...)`.** A `null`/array/scalar payload would crash destructuring; the guard falls back to an empty object.
2. **`event.data.text()` wrapped in `try/catch` with a default fallback string.** Non-JSON pushes (or malformed buffers) still surface a notification instead of revoking the subscription.
3. **Every URL comparison uses `new URL(target, self.location.origin).href`.** `client.url` is always absolute; caller-provided `target` may be relative. Direct `===` between possibly-different shapes is dead code.
4. **Sender `data` fields preserved via conditional spreads (don't clobber with defaults).** Use `...(url !== undefined ? { url } : {})` patterns so a real `data.url` from the payload survives the merge.
5. **`install` listener calls `skipWaiting()`.** Without it, the first push can land before the SW is in control of the page.
6. **`activate` listener calls `clients.claim()`.** Pairs with `skipWaiting()` to give the SW immediate control of in-flight clients.
7. **`showNotification`'s title has a fallback (`'Notification'`).** A malformed payload still satisfies `userVisibleOnly: true` instead of triggering revocation.
8. **`notificationclick` handler wraps `clients.openWindow(url)` and `client.focus()` in `.catch(() => {})`.** Both can reject (popup-blocked, closed window) and you don't want that to bubble out of the listener.

The reference template lives in `packages/nova/src/configure.ts::SW_TEMPLATE`. Byte-for-byte parity tests keep this checklist and the live template in sync.

## Sending a push

Resolve the `Nova` instance from the container (or import it directly) and call `push(subscription, payload, options?)`:

```ts
import { Nova } from '@c9up/nova'

const nova = app.container.resolve<Nova>('nova')

const result = await nova.push(subscription, {
  title: 'New message',
  body: 'You have one unread thread',
  icon: '/icons/notification.png',
  url: '/inbox/42',
})

if (result.ok) {
  console.log('delivered:', result.status, result.endpoint)
} else if (result.reason === 'gone') {
  // The subscription was already cleaned from the store.
  console.log('subscription was stale:', result.endpoint)
} else {
  console.warn(`push failed: ${result.status} ${result.reason}`)
}
```

For multi-device users, fan out via `pushToUser`:

```ts
const results = await nova.pushToUser(userId, {
  title: 'Welcome back',
  body: 'Last sync: 5 min ago',
})
const delivered = results.filter((r) => r.ok).length
const cleaned = results.filter((r) => !r.ok && r.reason === 'gone').length
console.log(`${delivered} delivered, ${cleaned} stale subscriptions cleaned`)
```

### Options

| Option | Type | Default | Notes |
|---|---|---|---|
| `ttl` | `number` (seconds) | `60` | How long the push service keeps the message if the device is offline. |
| `urgency` | `'very-low' \| 'low' \| 'normal' \| 'high'` | `'normal'` | RFC 8030 §5.3. `high` for time-sensitive alerts. |
| `topic` | `string` (≤ 32 base64url chars) | — | Replaces undelivered notifications with the same topic (RFC 8030 §5.4). |

### `PushResult` shape

```ts
type PushResult =
  | { ok: true; status: number; endpoint: string }
  | {
      ok: false
      status: number
      endpoint: string
      reason: 'gone' | 'rate-limited' | 'too-large' | 'rejected' | 'server-error'
      cleaned: boolean // true iff the store was called (404/410 only)
    }
```

`nova.push()` never throws on a per-push HTTP failure — it returns `ok: false` so callers can handle each subscription independently. It DOES throw `NovaError('E_NOVA_VAPID_NOT_CONFIGURED', ...)` if the VAPID config is missing or malformed on the first call (lazy validation), and re-throws anything outside the Web Push protocol surface — a network failure, an invalid `ttl` or `topic`, a payload that will not serialise.

### Auto-cleanup on 404 / 410

RFC 8030 §7.3 mandates that endpoints returning 404 or 410 are gone. Nova removes them from the configured `SubscriptionStore` automatically (via `store.delete(endpoint)`) before returning the `gone` result. The `cleaned: true` flag confirms the cleanup ran. Cleanup failures (e.g. database temporarily down) set `cleaned: false` and log the underlying error — the next push attempt will retry.

## Stores

`stores.memory()` forgets everything on restart and partitions by node — it is what tests and local work use. The other three are durable and take the same interface, so moving between them is an environment variable.

Whichever one is selected, a subscription is checked against the same rules on the way in and on the way out: an `https` endpoint within the 768-character storage cap, an `expirationTime` that is `null` or a number, and `p256dh` / `auth` that are base64url of the lengths a browser produces. A store never writes a record it would later refuse to read, and never hands the push layer one that would fail at encryption time — where the failure names neither the record nor the endpoint.

### `stores.file({ path })`

One JSON file, rewritten atomically, `0600`. It holds push endpoints and the `auth` secret each browser issued, which is enough to send notifications as the application to every subscriber.

**One process.** Writes are serialised within the instance, so a burst of subscribes cannot interleave — but nothing takes a lock the operating system enforces, so two processes writing the same file overwrite each other. Behind a cluster, `pm2 -i`, or several containers, use the SQL or Redis store.

### `stores.sql({ connection, table })`

The `push_subscriptions` table the migration below creates. The connection is taken structurally — `execute`, `query`, and the dialect it reports — so it works against an Atlas connection without Nova depending on Atlas.

`connection` takes the connection itself, or a function answering with one. The function form is what a config file needs: `config/nova.ts` is loaded before the application boots, so the connection does not exist yet and cannot be awaited there.

`table` defaults to `push_subscriptions`. It reaches the SQL as an identifier, where a parameter cannot go, so anything but a plain identifier is refused at construction.

### `stores.redis({ connection, prefix })`

A key per subscription and a set per user. `connection` takes a client, a function answering with one, or the **name** of a `@c9up/quasar` connection — resolved at runtime, so quasar stays an optional peer and never enters Nova's build graph. A connection missing one of the six commands the store issues is refused by name, rather than failing on the first subscribe.

`prefix` defaults to `nova:push`; change it to run two applications against one Redis database.

Durability is the server's, not the store's: a Redis with no persistence loses every subscription on restart. Browsers re-subscribe on their next visit, so the cost is a missed notification rather than a broken account — but if that matters, use a persistent Redis or the SQL store.

### Writing your own

`SubscriptionStore` is three methods. Endpoint URLs are globally unique per push service, so `delete(endpoint)` removes the subscription whoever owns it, and `save()` re-owns an endpoint rather than leaving it attached to two accounts — a browser reused across a logout/login pair would otherwise keep delivering the old account's notifications to the new user.

```ts
import type { PushSubscription, SubscriptionStore } from '@c9up/nova'

export class MySubscriptionStore implements SubscriptionStore {
  async save(userId: string, subscription: PushSubscription): Promise<void> {}
  async listByUser(userId: string): Promise<PushSubscription[]> { return [] }
  async delete(endpoint: string): Promise<void> {}
}
```

Pass an instance as `store`, or wrap it in a factory under `stores`.

### Migration

`ream configure @c9up/nova` writes `database/migrations/0048_create_push_subscriptions.ts` (idempotent — skipped if it already exists). The shipped template is also browsable at `node_modules/@c9up/nova/migrations/create_push_subscriptions.ts`. Run your usual migration workflow (`ream migrations:run`) afterwards.

```ts
import { Migration } from '@c9up/atlas'

export default class CreatePushSubscriptions extends Migration {
  async up() {
    this.schema.createTable('push_subscriptions', (t) => {
      t.string('endpoint', 768).primary()            // 768 x 4 bytes = the InnoDB utf8mb4 index limit
      t.string('user_id', 255).notNullable()         // app-defined (UUID / bigint-as-string)
      t.index('user_id')
      t.string('p256dh', 100).notNullable()          // base64url(uncompressed P-256), 87 chars
      t.string('auth', 50).notNullable()             // base64url(16 bytes), 22 chars
      t.bigInteger('expiration_time').nullable()     // ms epoch; null = no expiry (typical)
      t.timestamp('created_at').notNullable()        // written explicitly on every insert
      t.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('push_subscriptions')
  }
}
```

The 768 cap is not decoration: it is exactly the MySQL InnoDB utf8mb4 primary-key index budget, and the subscribe endpoint refuses a longer endpoint with a 400 rather than letting it fail as a dialect-specific length error on insert. Real endpoints from FCM, Mozilla autopush and Apple are all under 200 characters. The timestamp columns carry no DDL default because `DEFAULT (NOW())` is not a SQLite function; the stores write both columns explicitly.

## Testing with `helix.nova.fake`

Replace the real `Nova` instance with an in-memory collector for the duration of a test. The fake captures every `push` / `pushToUser` call and exposes assertion helpers — no `web-push`, no network, no `SubscriptionStore` consultation.

```ts
import { FakeNova } from '@c9up/nova/testing'
import { nova, useContainer } from '@c9up/helix'
import { test } from '@c9up/helix'

test('subscribe + welcome push', async () => {
  useContainer(container)        // your app's container
  nova.fake(FakeNova)            // overrides the 'nova' container token

  await runYourSubscribeFlow()   // code under test calls nova.pushToUser(...)

  nova.assertPushed({ userId: 'user-A', title: 'Welcome' })
})
```

The fake is auto-cleared at end-of-test via Helix's per-test cleanup queue (same lifecycle as `helix.mail.fake`).

### Predicate forms

`nova.assertPushed(predicate)` accepts two shapes:

**Object predicate** — every present field must match (AND-combined):

| Field | Matches | Notes |
|---|---|---|
| `userId` | `pushToUser` calls only | `kind === 'fan-out'` |
| `endpoint` | `push` (single) calls only | `kind === 'single'` |
| `title` / `body` | `payload.title` / `payload.body` exact | |
| `urgency` / `topic` | `options.urgency` / `options.topic` | |
| `containing` | `JSON.stringify(payload).includes(needle)` | Empty string is rejected (would match every push) |

**Function predicate** — `(captured: CapturedPush) => boolean`. Invoked once per captured call; first `true` → match.

`nova.assertNotPushed(predicate)` is the inverse.

### Forwarders

| Helper | Behaviour without an active fake |
|---|---|
| `nova.fake(FakeNova)` | Throws if called outside a test frame |
| `nova.assertPushed` / `nova.assertNotPushed` | Throws "no active fake" |
| `nova.getPushed` | Throws "no active fake" |
| `nova.current()` | Returns `null` |
| `nova.reset()` | No-op (safe to call from teardown blocks) |

### Why `pushToUser` returns `[]` under the fake

`FakeNova.pushToUser` does NOT consult the `SubscriptionStore`; it captures the call (userId + payload + options) and returns `[]`. The assertion is on call **intent**, not per-device delivery. If your test needs per-device fan-out behaviour (multiple `PushResult` entries, 410 cleanup against a real store), construct a real `Nova` with a `MemorySubscriptionDriver` pre-loaded with fixtures — that path runs the actual delivery logic.

## References

- [RFC 8030 — Web Push protocol](https://www.rfc-editor.org/rfc/rfc8030)
- [RFC 8188 — Encrypted Content-Encoding for HTTP](https://www.rfc-editor.org/rfc/rfc8188)
- [RFC 8291 — Message Encryption for Web Push](https://www.rfc-editor.org/rfc/rfc8291)
- [RFC 8292 — VAPID](https://www.rfc-editor.org/rfc/rfc8292)
- [MDN — Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [MDN — PushSubscription](https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription)
- [`web-push` npm package](https://github.com/web-push-libs/web-push)
