# Subscribing and sending

This guide covers subscribing a browser and sending a push:

- Client subscription
- Sending a push

## Client subscription

```ts
import { registerServiceWorker, subscribe } from '@c9up/nova/client'

await registerServiceWorker('/sw.js')
const pushSubscription = await subscribe(import.meta.env.VITE_NOVA_VAPID_PUBLIC_KEY)
console.log('subscribed:', pushSubscription.endpoint)
```

`subscribe()` waits for the active Service Worker, calls `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, then POSTs the result to `/api/nova/subscribe` with `credentials: 'include'` so the JWT cookie/header is carried automatically.

On logout, call `unsubscribe()` (it takes the same options) before the session ends. It sends `DELETE /api/nova/subscribe` with the browser's endpoint, then calls `PushSubscription.unsubscribe()` — even when the server refused, since a dead endpoint is answered `410` and its row deleted at the next push. It resolves `false` when the browser held no subscription.

```ts
import { unsubscribe } from '@c9up/nova/client'

await unsubscribe()
await logout()
```

The `@c9up/nova/client` sub-path is browser-only — its source has zero `node:` imports — so it bundles cleanly with Vite/Rollup without polyfills.

## Sending a push

Resolve the `Nova` instance from the container (or import it directly) and call `push(subscription, payload, options?)`:

```ts
const nova = await app.container.resolve('nova.push') // typed Nova; 'nova' is a compatibility alias

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
      reason: 'refused' | 'gone' | 'rate-limited' | 'too-large' | 'rejected' | 'server-error'
      cleaned: boolean // true iff the subscription was deleted from the store
      retryAfter?: number // seconds, from Retry-After on a 429 or 503 (capped at a day)
    }
```

| `reason` | `status` | When |
|---|---|---|
| `refused` | `0` | Not sent: the endpoint is not one of `delivery.pushServices`, or resolves to an address that is not public. |
| `gone` | `404` / `410` | The push service dropped the subscription; it is deleted from the store. |
| `gone` | `0` | Not sent: the stored keys are not a P-256 point and a 16-byte secret, so nothing can ever be encrypted for them; it is deleted from the store. |
| `too-large` | `413` / `0` | The push service refused the size, or the payload's JSON exceeds 3993 bytes and was not sent. |
| `rate-limited` | `429` | Wait `retryAfter` seconds, when present, before pushing to this endpoint again. |
| `rejected` | `400` / `401` / `403` | The push service refused the request (often a VAPID key mismatch). |
| `server-error` | `5xx`, other, or `0` | The push service failed, or did not answer in time, or answered with more than 16 KiB. |

A payload is encrypted as a single record (RFC 8291 §4), which holds at most 3993 bytes of plaintext: keep its JSON under that, and send an identifier the service worker can fetch the rest with.

`nova.push()` never throws on what the endpoint does — an HTTP status, no answer in time, a connection that fails — it returns `ok: false` so callers can handle each subscription independently. It DOES throw `NovaError('E_NOVA_VAPID_NOT_CONFIGURED', ...)` if the VAPID config is missing or malformed on the first call (lazy validation), and throws on misuse: an invalid `ttl` or `topic`, a payload that will not serialise. `pushToUser()` turns a throw on one subscription into a `server-error` result, so one device cannot stop the others.

### Auto-cleanup on 404 / 410

RFC 8030 §7.3 mandates that endpoints returning 404 or 410 are gone. Nova removes them from the configured `SubscriptionStore` automatically (via `store.delete(endpoint)`) before returning the `gone` result. The `cleaned: true` flag confirms the cleanup ran. Cleanup failures (e.g. database temporarily down) set `cleaned: false` and log the underlying error — the next push attempt will retry.
