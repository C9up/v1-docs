# Stores and testing

This guide covers subscription stores and testing:

- Stores
- Testing with `FakeNova`

## Stores

`stores.memory()` forgets everything on restart and partitions by node — it is what tests and local work use. The other three are durable and take the same interface, so moving between them is an environment variable.

Whichever one is selected, a subscription is checked against the same rules on the way in and on the way out: an `https` endpoint within the 768-character storage cap, an `expirationTime` that is `null` or a number, a `p256dh` that is a point on P-256 (65 bytes) and an `auth` that is a 16-byte secret, both base64url. A store never writes a record it would later refuse to read, and never hands the push layer one that would fail at encryption time — where the failure names neither the record nor the endpoint.

### `stores.file({ path })`

One JSON file, rewritten atomically, `0600`. It holds push endpoints and the `auth` secret each browser issued, which is enough to send notifications as the application to every subscriber.

**One process.** Writes are serialised within the instance, so a burst of subscribes cannot interleave — but nothing takes a lock the operating system enforces, so two processes writing the same file overwrite each other. Behind a cluster, `pm2 -i`, or several containers, use the SQL or Redis store.

### `stores.sql({ connection, table })`

The `push_subscriptions` table the migration below creates. The connection is taken structurally — `execute`, `query`, and the dialect it reports — so it works against an Atlas connection without Nova depending on Atlas.

`connection` takes the connection itself, or a function answering with one. The function form is what a config file needs: `config/nova.ts` is loaded before the application boots, so the connection does not exist yet and cannot be awaited there.

`table` defaults to `push_subscriptions`. It reaches the SQL as an identifier, where a parameter cannot go, so anything but a plain identifier is refused at construction.

### `stores.redis({ connection, prefix })`

A key per subscription and a set per user. `connection` takes a client, a function answering with one, or the **name** of a `@c9up/quasar` connection — resolved at runtime, so quasar stays an optional peer and never enters Nova's build graph. The store issues three commands, `get`, `evalsha` and `script`; a connection missing one is refused by name, rather than failing on the first subscribe. A client must answer EVALSHA and SCRIPT LOAD (EVAL alone is no longer enough): each script runs by its SHA1 and is loaded the first time the server answers NOSCRIPT, because supply-chain scanners report a method call named after EVAL as dynamic code execution, and EVALSHA avoids resending the script. A connection quasar retires once its retry strategy gives up (status `end`) is not used again: the next call asks for the connection again, so Web Push recovers by itself once Redis is back. A client passed directly is kept as it is.

`prefix` defaults to `nova:push`; change it to run two applications against one Redis database.

Durability is the server's, not the store's: a Redis with no persistence loses every subscription on restart. Browsers re-subscribe on their next visit, so the cost is a missed notification rather than a broken account — but if that matters, use a persistent Redis or the SQL store.

### Writing your own

`SubscriptionStore` is three methods. Endpoint URLs are globally unique per push service, so `delete(endpoint)` removes the subscription whoever owns it, and `save()` re-owns an endpoint rather than leaving it attached to two accounts — a browser reused across a logout/login pair would otherwise keep delivering the old account's notifications to the new user. It re-owns it only when the new owner posts the same `p256dh` and `auth` as the stored ones: the browser holding the subscription does, anyone who merely learned the endpoint does not. Otherwise `save()` throws `E_NOVA_SUBSCRIPTION_CONFLICT`, which the subscribe route answers with `409`. `listByUser()` lists oldest first: the per-user cap drops from the front.

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

The 768 cap is not decoration: it is exactly the MySQL InnoDB utf8mb4 primary-key index budget, and the subscribe endpoint refuses a longer endpoint with a 400 rather than letting it fail as a dialect-specific length error on insert. Real endpoints from FCM, Mozilla autopush and Apple are all under 200 characters. The timestamp columns carry no DDL default: the stores write both columns explicitly.

## Testing with `FakeNova`

Replace the real `Nova` instance with an in-memory collector for the duration of a test. `FakeNova` (from `@c9up/nova/testing`) captures every `push` / `pushToUser` call and carries the assertions itself — no encryption, no network, no `SubscriptionStore` consultation.

```ts
import { FakeNova } from '@c9up/nova/testing'
import { override, test, useContainer } from '@c9up/helix'

test('subscribe + welcome push', async () => {
  useContainer(container)        // your app's container
  const fake = new FakeNova()
  override('nova.push', fake)    // the token the nova provider binds

  await runYourSubscribeFlow()   // code under test calls pushToUser(...) on it

  fake.assertPushed({ userId: 'user-A', title: 'Welcome' })
})
```

The provider binds the same instance under `'nova.push'` and `'nova'`: override the name the code under test resolves (both, if it uses both). helix's `override` throws outside a test and undoes itself at the end of the test, through helix's per-test cleanup queue.

### Predicate forms

`fake.assertPushed(predicate)` accepts two shapes:

**Object predicate** — every present field must match (AND-combined):

| Field | Matches | Notes |
|---|---|---|
| `userId` | `pushToUser` calls only | `kind === 'fan-out'` |
| `endpoint` | `push` (single) calls only | `kind === 'single'` |
| `title` / `body` | `payload.title` / `payload.body` exact | |
| `urgency` / `topic` | `options.urgency` / `options.topic` | |
| `containing` | `JSON.stringify(payload).includes(needle)` | Empty string is rejected (would match every push) |

**Function predicate** — `(captured: CapturedPush) => boolean`. Invoked once per captured call; first `true` → match.

`fake.assertNotPushed(predicate)` is the inverse.

### The fake's methods

| Method | Does |
|---|---|
| `assertPushed(predicate)` | Throws, listing what was captured, when no captured call matches |
| `assertNotPushed(predicate)` | Throws when a captured call matches |
| `getPushed()` | Returns a copy of every captured call |
| `reset()` | Forgets the captured calls |

### Why `pushToUser` returns `[]` under the fake

`FakeNova.pushToUser` does NOT consult the `SubscriptionStore`; it captures the call (userId + payload + options) and returns `[]`. The assertion is on call **intent**, not per-device delivery. If your test needs per-device fan-out behaviour (multiple `PushResult` entries, 410 cleanup against a real store), construct a real `Nova` with a `MemorySubscriptionDriver` pre-loaded with fixtures — that path runs the actual delivery logic.
