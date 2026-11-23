# nova

`@c9up/nova`: Web Push notifications for ream: VAPID signing, encrypted delivery to the browsers' push services, a subscription endpoint and a service worker scaffold. Guide: [Push notifications](/en/guides/digging-deeper/push/).

## Installation

```bash
pnpm add @c9up/nova
ream configure @c9up/nova
```

`ream configure @c9up/nova` adds the provider and the `nova:vapid:generate` command, the `NOVA_STORE` and `NOVA_VAPID_*` variables to `.env`, and writes `config/nova.ts`, the `push_subscriptions` migration and `public/sw.js`. Optional peers: `@c9up/ream` (provider and routes), `@c9up/atlas` (the SQL store's connection), `@c9up/quasar` (a Redis store named by connection).

## Entry points

| Import | Contents |
|---|---|
| `@c9up/nova` | The `Nova` sender, `defineConfig`, the `stores` factories and the store classes, the subscribe controller, VAPID key generation, the provider class and the error class. |
| `@c9up/nova/provider` | `NovaProvider` (default export). |
| `@c9up/nova/services/main` | The application's `Nova` (default export), usable once the provider booted. |
| `@c9up/nova/client` | Browser helpers: register the service worker, subscribe, unsubscribe. |
| `@c9up/nova/configure` | `configure(codemods)`, run by `ream configure @c9up/nova`. |
| `@c9up/nova/commands` | The command loader (`getMetaData`, `getCommand`) for `nova:vapid:generate`. |
| `@c9up/nova/testing` | `FakeNova`, a test double that records pushes. |

## Exports

### `@c9up/nova`

| Export | Kind | Description |
|---|---|---|
| `Nova` | class | Encrypts and sends pushes to one subscription or to every subscription of a user. |
| `PushPayload` | interface | The notification sent. |
| `PushOptions` | interface | Per-push `ttl`, `urgency`, `topic`. |
| `PushUrgency` | type | `'very-low' \| 'low' \| 'normal' \| 'high'`. |
| `PushResult` | type | The outcome of one push. |
| `PushFailureReason` | type | Why a push was not delivered. |
| `NovaDeliveryOptions` | interface | How pushes leave the server. |
| `PushTargetPolicy` | interface | Which hosts a push may go to. |
| `PushHttpClient` | interface | The client pushes go through. |
| `DEFAULT_PUSH_SERVICES` | const | The push services allowed by default. |
| `defineConfig` | function | Types the `nova` config. |
| `NovaConfig` | interface | The `nova` config. |
| `NovaVapidConfig` | interface | The VAPID identity. |
| `NovaRouteMiddleware` | type | A middleware for the subscription routes. |
| `stores` | const | Factories for the configured stores: `memory`, `file`, `sql`, `redis`. |
| `SubscriptionStoreFactory` | type | `() => SubscriptionStore`. |
| `SubscriptionStore` | interface | Where subscriptions are kept. |
| `PushSubscription` | interface | A browser's subscription. |
| `SaveSubscriptionOptions` | interface | `{ maxPerUser?: number }`. |
| `MemorySubscriptionDriver` | class | An in-memory store. |
| `FileSubscriptionStore` | class | A store in one JSON file. |
| `SqlSubscriptionStore` | class | A store in the `push_subscriptions` table. |
| `SqlSubscriptionStoreOptions`, `SubscriptionDatabase`, `SubscriptionDatabaseResolver` | type | The SQL store's options and connection. |
| `RedisSubscriptionStore` | class | A store in Redis. |
| `RedisSubscriptionStoreOptions`, `SubscriptionRedisClient`, `SubscriptionRedisResolver` | type | The Redis store's options and client. |
| `quasarConnection` | function | A `@c9up/quasar` connection by name, checked for the commands the Redis store issues. |
| `SubscribeController` | class | The handler behind the subscription routes. |
| `generateVapidKeys` | function | Mints a VAPID key pair. |
| `VapidKeyPair` | interface | `{ publicKey: string; privateKey: string }`, base64url. |
| `NovaProvider` | provider | Also the default export of `@c9up/nova/provider`. |
| `NovaAppContext` | interface | What the provider reads of the application. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors) |

### `Nova`

| Member | Signature | Description |
|---|---|---|
| constructor | `new Nova(store: SubscriptionStore, vapidConfig: NovaVapidConfig \| undefined, delivery?: NovaDeliveryOptions)` | |
| `push` | `push(subscription: PushSubscription, payload: PushPayload, options?: PushOptions): Promise<PushResult>` | Sends one push. An endpoint outside the allowed push services is `refused`; keys nothing can be encrypted for are deleted from the store; a payload over 3993 bytes once serialised is not sent (`too-large`). A subscription the push service reports gone is deleted (`cleaned: true`). |
| `pushToUser` | `pushToUser(userId: string \| number \| bigint, payload: PushPayload, options?: PushOptions): Promise<PushResult[]>` | Pushes to every subscription of `userId` (a number or bigint is looked up as its decimal text), at most `concurrency` at once; one result per subscription, and one failing device never stops the others. |

| `PushPayload` field | Type | Description |
|---|---|---|
| `title` | `string` | Required. |
| `body`, `icon`, `url`, `tag` | `string` | Optional. |
| `data` | `Record<string, unknown>` | Optional. |

| `PushOptions` field | Type | Default | Description |
|---|---|---|---|
| `ttl` | `number` | `60` | Time to live, in seconds. |
| `urgency` | `PushUrgency` | `'normal'` | The push service's urgency hint. |
| `topic` | `string` | | Replaces an undelivered notification with the same topic; at most 32 base64url characters. |

```ts
type PushFailureReason = 'refused' | 'gone' | 'rate-limited' | 'too-large' | 'rejected' | 'server-error'

type PushResult =
  | { ok: true; status: number; endpoint: string }
  | { ok: false; status: number; endpoint: string; reason: PushFailureReason; cleaned: boolean; retryAfter?: number }
```

`retryAfter` is the push service's `Retry-After` on a 429 or 503, in seconds, capped at a day.

### `SubscriptionStore`

| Member | Signature | Description |
|---|---|---|
| `save` | `save(userId: string, subscription: PushSubscription, options?: SaveSubscriptionOptions): Promise<void>` | Stores the subscription for `userId`, then evicts that user's oldest past `maxPerUser` (default 20). |
| `listByUser` | `listByUser(userId: string): Promise<PushSubscription[]>` | The user's subscriptions. |
| `delete` | `delete(endpoint: string): Promise<void>` | Forgets `endpoint`, whoever holds it. |
| `deleteForUser` | `deleteForUser(userId: string, endpoint: string): Promise<boolean>` | Forgets `endpoint` only if `userId` holds it, in one step; answers whether it did. |

`PushSubscription` is `{ endpoint: string; expirationTime: number | null; keys: { p256dh: string; auth: string } }`.

| Store | Constructor | Notes |
|---|---|---|
| `MemorySubscriptionDriver` | `new MemorySubscriptionDriver()` | Forgets everything on restart. |
| `FileSubscriptionStore` | `new FileSubscriptionStore(path: string)` | One JSON file, absolute or relative to the process; single process. |
| `SqlSubscriptionStore` | `new SqlSubscriptionStore(db: SubscriptionDatabaseResolver, options?: { table?: string })` | `table` defaults to `'push_subscriptions'` and must be a plain identifier. `db` is a connection with `execute` and `query` (and `dialect: 'postgres'` for `$1` placeholders), or a function answering one. |
| `RedisSubscriptionStore` | `new RedisSubscriptionStore(redis: SubscriptionRedisResolver, options?: { prefix?: string })` | `prefix` defaults to `'nova:push'` and may not contain a space. The client needs `get`, `evalsha` and `script`. |

### `stores`

| Factory | Signature |
|---|---|
| `stores.memory` | `memory(): SubscriptionStoreFactory` |
| `stores.file` | `file(options: { path: string }): SubscriptionStoreFactory` |
| `stores.sql` | `sql(options: { connection: SubscriptionDatabaseResolver; table?: string }): SubscriptionStoreFactory` |
| `stores.redis` | `redis(options: { connection: SubscriptionRedisResolver \| string; prefix?: string }): SubscriptionStoreFactory` |

Factories are lazy: only the selected store is built. A string `connection` for `redis` names a `@c9up/quasar` connection.

| Function | Signature | Description |
|---|---|---|
| `quasarConnection` | `quasarConnection(name?: string): Promise<SubscriptionRedisClient>` | The named connection, once it carries `get`, `evalsha` and `script`. |
| `generateVapidKeys` | `generateVapidKeys(): VapidKeyPair` | A P-256 key pair: the public key as an uncompressed point, the private key as the raw 32-byte scalar, both base64url. |
| `defineConfig` | `defineConfig(config: NovaConfig): NovaConfig` | Returns the config, typed. |

### `SubscribeController`

| Member | Signature | Description |
|---|---|---|
| constructor | `new SubscribeController(store: SubscriptionStore, options?: SubscribeOptions)` | `options` takes the `PushTargetPolicy` fields and `maxSubscriptionsPerUser` (default 20). |
| `handle` | `handle(ctx: SubscribeContext): Promise<void>` | Validates the `PushSubscription` body and saves it for `ctx.auth.user.id`; answers 201. |
| `unsubscribe` | `unsubscribe(ctx: SubscribeContext): Promise<void>` | Removes the caller's own subscription named by `{ endpoint }`; answers 200, or 404 when the user has no such subscription. |

### `@c9up/nova/provider`

| Export | Kind | Description |
|---|---|---|
| `NovaProvider` | provider (default) | `register()` binds the store (an existing binding wins, then the configured store, then the in-memory one) and the `Nova` sender; `boot()` publishes the service; `start()` mounts `POST` and `DELETE {routePrefix}/subscribe`, with the configured guard and middleware. |

### `@c9up/nova/services/main`

| Export | Kind | Description |
|---|---|---|
| `default` | const | The application's `Nova`. Any property access before the provider booted throws. |

```ts
import push from '@c9up/nova/services/main'

await push.pushToUser(user.id, { title: 'New task', body: task.title })
```

### `@c9up/nova/client`

| Export | Kind | Description |
|---|---|---|
| `registerServiceWorker` | function | Registers the service worker. |
| `subscribe` | function | Subscribes the browser and posts the subscription to the server. |
| `unsubscribe` | function | Detaches the browser from the signed-in account. |
| `urlBase64ToUint8Array` | function | A base64url VAPID public key as the `Uint8Array` `applicationServerKey` takes. |
| `SubscribeOptions` | interface | Options of `subscribe` and `unsubscribe`. |
| `RegisterServiceWorkerOptions` | interface | `{ scope?: string }`, default `'/'`. |
| `errors` | namespace | The client's errors, one class per code, see [Errors](#errors) |

| Function | Signature | Description |
|---|---|---|
| `registerServiceWorker` | `registerServiceWorker(path?: string, options?: RegisterServiceWorkerOptions): Promise<ServiceWorkerRegistration>` | `path` defaults to `'/sw.js'`. |
| `subscribe` | `subscribe(vapidPublicKey: string, options?: SubscribeOptions): Promise<PushSubscription>` | Waits for the active service worker, subscribes with `userVisibleOnly`, and POSTs the subscription; throws `E_NOVA_ENDPOINT_REJECTED` on a non-2xx answer. |
| `unsubscribe` | `unsubscribe(options?: SubscribeOptions): Promise<boolean>` | DELETEs the subscription on the server, then drops it in the browser even when the server failed; `false` when the browser held none. Call it on logout. |
| `urlBase64ToUint8Array` | `urlBase64ToUint8Array(base64url: string): Uint8Array` | |

| `SubscribeOptions` field | Type | Default | Description |
|---|---|---|---|
| `endpoint` | `string` | `'/api/nova/subscribe'` | The subscription route. |
| `credentials` | `RequestCredentials` | `'include'` | Fetch credentials. |
| `headers` | `HeadersInit` | | Extra headers, merged over `content-type: application/json`. |
| `accessToken` | `string` | | Shorthand for `Authorization: Bearer <accessToken>`; ignored when `headers` has an `authorization`. |

`E_NOVA_ENDPOINT_REJECTED` carries the route's answer in `status` and `responseBody`.

### `@c9up/nova/configure`

| Export | Kind | Description |
|---|---|---|
| `configure` | function | `configure(codemods): Promise<void>`: what `ream configure @c9up/nova` runs. |

### `@c9up/nova/commands`

| Command | Description |
|---|---|
| `nova:vapid:generate` | Generates a VAPID key pair and writes the `NOVA_VAPID_*` variables into `.env`. Refuses to replace an existing private key without `--force`; a `.env` it creates is readable by its owner only. |

### `@c9up/nova/testing`

| Export | Kind | Description |
|---|---|---|
| `FakeNova` | class | Records `push` and `pushToUser` calls; sends, encrypts and stores nothing. |
| `CapturedPush` | type | One recorded call: `kind: 'single'` (with `subscription`) or `kind: 'fan-out'` (with `userId`), plus `payload`, `options`, `timestamp`. |
| `FakeNovaPredicate` | interface | Matches on `userId`, `endpoint`, `title`, `body`, `urgency`, `topic`, or `containing` (a substring of the JSON payload). |
| `FakeNovaPredicateArg` | type | A `FakeNovaPredicate` or `(captured: CapturedPush) => boolean`. |

| `FakeNova` member | Signature | Description |
|---|---|---|
| `push` | `push(subscription, payload, options?): Promise<PushResult>` | Records the call; answers `{ ok: true, status: 201 }`. |
| `pushToUser` | `pushToUser(userId, payload, options?): Promise<PushResult[]>` | Records the call; answers `[]`. Refuses an id `Nova` refuses. |
| `getPushed` | `getPushed(): CapturedPush[]` | A copy of what was recorded. |
| `reset` | `reset(): void` | Forgets what was recorded. |
| `assertPushed` | `assertPushed(predicate: FakeNovaPredicateArg): void` | Throws when no recorded push matches. |
| `assertNotPushed` | `assertNotPushed(predicate: FakeNovaPredicateArg): void` | Throws when a recorded push matches. |

## Configuration

`config/nova.ts`, written by `ream configure @c9up/nova`:

| Option | Type | Default | Description |
|---|---|---|---|
| `routePrefix` | `string` | `'/api/nova'` | Prefix of the subscription routes. |
| `guard` | `string \| null` | `'jwt'` | The warden guard on the routes; `null` mounts them unguarded (tests only). |
| `default` | `string` | | The name of the store to use, a key of `stores`. The generated config reads `NOVA_STORE` (default `memory`). |
| `stores` | `Record<string, SubscriptionStoreFactory>` | | The stores the app can use, by name. |
| `store` | `SubscriptionStore` | in-memory | A ready-made store; used when `stores` does not name the selected one. |
| `vapid` | `NovaVapidConfig` | | `publicKey`, `privateKey` (base64url) and `subject` (`mailto:` or `https://`). Required for sending; the routes work without it. |
| `delivery.timeout` | `number` | `10000` | Deadline for one push request, in ms; past it the result is `server-error` with status 0. |
| `delivery.concurrency` | `number` | `10` | Requests `pushToUser` keeps in flight at once. |
| `delivery.http` | `PushHttpClient` | `HttpClient` from `@c9up/ream/http-client` | The client pushes go through; the default refuses non-public addresses. |
| `delivery.pushServices` | `readonly string[]` | `DEFAULT_PUSH_SERVICES` | Hosts a push may go to, each with its subdomains. Checked when a subscription arrives and before each send. |
| `delivery.allowHosts` | `readonly string[]` | `[]` | Exact `host` or `host:port` exemptions, for a push service next to the app in development. |
| `maxSubscriptionsPerUser` | `number` | `20` | Subscriptions one user may hold; the oldest go past it. |
| `middleware` | `NovaRouteMiddleware[]` | `[]` | Middleware run before the subscription routes' handler, such as a rate limit. |

`DEFAULT_PUSH_SERVICES` is `fcm.googleapis.com`, `push.services.mozilla.com`, `notify.windows.com`, `push.apple.com`.

## Container bindings

| Token | Resolves to |
|---|---|
| `'nova.push'` | The `Nova` sender. |
| `'nova.subscriptions'` | The `SubscriptionStore`. |
| `'nova'` | The same `Nova` (earlier name, still bound). |
| `'SubscriptionStore'` | The same store (earlier name, still bound). |

The tokens are declared on `ContainerBindings`, so `container.resolve('nova.push')` is typed.

## Errors

| Code | Raised when |
|---|---|
| [`E_NOVA_INVALID_SUBSCRIPTION`](/en/reference/errors#e-nova-invalid-subscription) | The subscribe or unsubscribe body is not a valid `PushSubscription` (HTTP 400). |
| [`E_NOVA_SUBSCRIPTION_CONFLICT`](/en/reference/errors#e-nova-subscription-conflict) | Another request was writing the same endpoint at the same time (HTTP 409). |
| [`E_NOVA_SUBSCRIPTION_NOT_FOUND`](/en/reference/errors#e-nova-subscription-not-found) | The user has no such subscription (HTTP 404). |
| [`E_NOVA_MISSING_USER`](/en/reference/errors#e-nova-missing-user) | The subscription handler ran without an authenticated user. |
| [`E_NOVA_INVALID_USER_ID`](/en/reference/errors#e-nova-invalid-user-id) | The user has no usable id (a non-empty string or an integer), or `pushToUser` received one that is not. |
| [`E_NOVA_VAPID_NOT_CONFIGURED`](/en/reference/errors#e-nova-vapid-not-configured) | A push is sent without a VAPID key or subject. |
| [`E_NOVA_HTTP_CLIENT_MISSING`](/en/reference/errors#e-nova-http-client-missing) | Sending needs the outbound HTTP client of `@c9up/ream` and none is given. |
| [`E_NOVA_UNKNOWN_STORE`](/en/reference/errors#e-nova-unknown-store) | `default` names a store `stores` does not declare, or `stores` has no `default`. |
| [`E_NOVA_INVALID_TABLE`](/en/reference/errors#e-nova-invalid-table) | The SQL store's table name is not a plain identifier. |
| [`E_NOVA_INVALID_PREFIX`](/en/reference/errors#e-nova-invalid-prefix) | The Redis store's key prefix contains a space. |
| [`E_NOVA_STORE_BUSY`](/en/reference/errors#e-nova-store-busy) | A subscription changed under every attempt to write it. |
| [`E_NOVA_STORE_FILE_UNREADABLE`](/en/reference/errors#e-nova-store-file-unreadable) | The file store's file is not valid JSON. |
| [`E_NOVA_QUASAR_MISSING`](/en/reference/errors#e-nova-quasar-missing) | A Redis store names a connection and `@c9up/quasar` is not installed. |
| [`E_NOVA_REDIS_INCOMPLETE`](/en/reference/errors#e-nova-redis-incomplete) | The quasar connection lacks a command the store issues. |
| [`E_NOVA_NOT_BOOTED`](/en/reference/errors#e-nova-not-booted) | `@c9up/nova/services/main` was used before `NovaProvider.boot()` ran. |
| [`E_NOVA_INVALID_OPTION`](/en/reference/errors#e-nova-invalid-option) | A delivery or store option is out of range: `concurrency`, `timeout`, a `pushServices` or `allowHosts` entry, `maxSubscriptionsPerUser`, `maxPerUser`, or a push's `ttl` or `topic`. |
| [`E_NOVA_ASSERTION_FAILED`](/en/reference/errors#e-nova-assertion-failed) | `FakeNova.assertPushed()` or `assertNotPushed()` does not hold. |
| [`E_NOVA_INVALID_PREDICATE`](/en/reference/errors#e-nova-invalid-predicate) | A `FakeNova` assertion was given an empty `containing`, which would match every push. |
| [`E_NOVA_INTERNAL`](/en/reference/errors#e-nova-internal) | An invariant of nova broke (the VAPID key pair Node generated has an unexpected shape). A bug: report it. |

Raised by `@c9up/nova/client`, exported from its own `errors`:

| Code | Raised when |
|---|---|
| [`E_NOVA_SERVICE_WORKER_UNSUPPORTED`](/en/reference/errors#e-nova-service-worker-unsupported) | The environment has no `navigator.serviceWorker`. |
| [`E_NOVA_PUSH_SUBSCRIBE_FAILED`](/en/reference/errors#e-nova-push-subscribe-failed) | The browser refused `pushManager.subscribe()`; the browser's error is the `cause`. |
| [`E_NOVA_ENDPOINT_REJECTED`](/en/reference/errors#e-nova-endpoint-rejected) | The subscription route answered `subscribe()` with other than 201, or `unsubscribe()` with an error other than 404. `status` and `responseBody` hold the answer. |

## Migration

- Nova now needs `@c9up/ream` 0.2.32 or later: it recognises the HTTP client's failures by their `E_HTTP_CLIENT_*` code. Update both packages together.
- `NovaError` and `NovaTypeError` are gone: test `error.code`, or `error instanceof errors.E_NOVA_*` with `import { errors } from '@c9up/nova'`. `E_NOVA_INVALID_OPTION` and `E_NOVA_INVALID_USER_ID` are no longer a `TypeError`.
- `error.hint` is now `error.help`.
- `NovaClientError` is gone: `import { errors } from '@c9up/nova/client'` and test `E_NOVA_SERVICE_WORKER_UNSUPPORTED`, `E_NOVA_PUSH_SUBSCRIBE_FAILED` or `E_NOVA_ENDPOINT_REJECTED`; the last keeps `status` and `responseBody`.

## See also

- [Introduction](/en/guides/digging-deeper/push/)
- [Subscribing and sending](/en/guides/digging-deeper/push/sending)
- [Service worker](/en/guides/digging-deeper/push/service-worker)
- [Stores and testing](/en/guides/digging-deeper/push/stores-and-testing)
