# Introduction

This guide covers Web Push with nova:

- Install
- Generate VAPID keys
- Configure
- References

Status: **Active** — subscription endpoint, push delivery, four subscription stores, Service Worker scaffold and the `FakeNova` test double.

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

Mints a P-256 key pair with Node's `crypto.generateKeyPairSync('ec')` and upserts the three `NOVA_VAPID_*` env vars into `.env`. Edit `NOVA_VAPID_SUBJECT` to a real `mailto:` address before deploying — push services use it to contact you about subscription issues.

The package has no runtime dependency: the key pair, the payload encryption (RFC 8291 `aes128gcm`, one record) and the VAPID token (RFC 8292, ES256, valid 12 hours, its audience the endpoint's origin) are all built with `node:crypto`. `nova.push()` then sends the request through ream's `HttpClient` (`@c9up/ream/http-client`), which refuses non-public addresses.

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

`DELETE /api/nova/subscribe` with `{ endpoint }` is registered beside it, under the same guard: it removes that endpoint from the signed-in user only — another user's endpoint answers `404`, like one that does not exist. The authenticated user's id may be a string, a number or a bigint (an auto-increment key); it is stored as its decimal text, and `pushToUser(42)` finds it.

### Limits and delivery

The subscription endpoint is a URL the browser hands over, which means every account chooses where the server sends a request on each notification. These keys bound that:

```ts
import { DEFAULT_PUSH_SERVICES, defineConfig } from '@c9up/nova'
import { throttle } from '#start/limiter' // limiter.define(...) from @c9up/blackhole/limiter

export default defineConfig({
  // ...
  maxSubscriptionsPerUser: 20,   // past it, the user's oldest subscription is dropped
  middleware: [throttle],        // run on both subscribe routes
  delivery: {
    timeout: 10_000,             // ms for one push request, connection to answer
    concurrency: 10,             // requests pushToUser keeps in flight at once
    pushServices: [...DEFAULT_PUSH_SERVICES, 'push.example.net'],
    allowHosts: ['localhost:4399'], // development only
  },
})
```

| Key | Default | What it does |
|---|---|---|
| `maxSubscriptionsPerUser` | `20` | Subscriptions one user keeps. A new one past the cap drops that user's oldest. |
| `middleware` | `[]` | Middleware put on `POST` and `DELETE {routePrefix}/subscribe` — a rate limit, so one account cannot write subscriptions as fast as it can post. |
| `delivery.timeout` | `10000` | Deadline in ms for one push request. An endpoint that does not answer in time gets `reason: 'server-error'`, `status: 0`. |
| `delivery.concurrency` | `10` | Requests `pushToUser` keeps in flight at once; every subscription is still pushed to. |
| `delivery.pushServices` | `DEFAULT_PUSH_SERVICES` | Hosts an endpoint may point at, each with its subdomains: `fcm.googleapis.com`, `push.services.mozilla.com`, `notify.windows.com`, `push.apple.com`. Replaces the list. |
| `delivery.allowHosts` | `[]` | Exact `host` or `host:port` a push may go to although it is not public — a push service running on the developer's machine. Keep it out of production. |
| `delivery.http` | the guarded client | The client pushes go through — `fakeHttp()` from `@c9up/ream/http-client` in tests. |

The subscribe route answers `400 E_NOVA_INVALID_SUBSCRIPTION` to an endpoint outside `pushServices`, an IP address, or one carrying credentials. Requests leave through `HttpClient` from `@c9up/ream/http-client`: an address that is not public is refused when the socket connects (so a DNS answer cannot change between the check and the connection), redirects are not followed, and at most 16 KiB of the answer is read.

## References

- [RFC 8030 — Web Push protocol](https://www.rfc-editor.org/rfc/rfc8030)
- [RFC 8188 — Encrypted Content-Encoding for HTTP](https://www.rfc-editor.org/rfc/rfc8188)
- [RFC 8291 — Message Encryption for Web Push](https://www.rfc-editor.org/rfc/rfc8291)
- [RFC 8292 — VAPID](https://www.rfc-editor.org/rfc/rfc8292)
- [MDN — Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [MDN — PushSubscription](https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription)
