# Quasar — Redis connections

`@c9up/quasar` owns the Redis **connection**, and nothing else.

A quasar is powered by a black hole feeding on the matter around it: this one feeds the app its data. Like every package here it is named for what it is, not for the technology it speaks.

The packages that *store* things in Redis — [Echo](/en/modules/echo) (cache), [Bay](/en/modules/bay) (queue), [Warden](/en/modules/warden) (token blacklist) — each take a client through a structural contract. They do not depend on Quasar, so they stay agnostic and this package stays optional. Before it existed, every app rebuilt the connection layer by hand to share one client between the three.

## Install

```sh
pnpm add @c9up/quasar
```

## Configure

```ts
// config/redis.ts
import { defineConfig } from '@c9up/quasar'
import env from '#start/env'

export default defineConfig({
  connection: 'main',
  connections: {
    main: { url: env.get('REDIS_URL') },
    cache: { host: env.get('REDIS_HOST'), port: 6379, db: 1 },
    cluster: { clusters: [{ host: 'node-1', port: 7000 }, { host: 'node-2', port: 7001 }] },
  },
})
```

`defineConfig` refuses a default connection that is not declared, and an empty connection list — a typo there would otherwise surface as a connection to some default localhost that looks alive until the first command hits the wrong server.

The config key and the container token stay `redis` — the **role**, the same way Echo binds `cache` and Bay binds `queue`.

## Register the provider

```ts
import QuasarProvider from '@c9up/quasar/provider'
```

It binds the manager as `'redis'` and seats it on the service accessor. `register` opens **no socket**: connections are built on first use, so a provider reaching for `'redis'` during its own `boot` finds the manager already there.

## Use

```ts
import quasar from '@c9up/quasar/services/main'

await quasar.connection().set('user:42', payload, 'EX', 60)
await quasar.connection('cache').get('user:42')
```

Every ioredis command is callable straight on a connection. The raw client stays reachable as `connection.ioConnection` for anything not wrapped here — named after Adonis' `ioConnection` rather than `client`, because `CLIENT` is itself a Redis command.

## Pub/sub

```ts
await quasar.subscribe('orders', (message, channel) => { /* … */ })
await quasar.psubscribe('user:*', (message, channel, pattern) => { /* … */ })
await quasar.publish('orders', JSON.stringify(order))
```

Redis puts a subscribed client into a mode where it accepts nothing but subscribe/unsubscribe, so a connection that both publishes and listens needs two sockets. The second one opens **lazily**, on the first subscribe, and never at all for a connection that only runs commands — meanwhile ordinary commands keep working on the first.

Re-subscribing to a channel replaces its handler instead of stacking a second one: a reload must not double-deliver.

## Health

```ts
import { QuasarCheck, QuasarMemoryUsageCheck } from '@c9up/quasar'

const ping = await new QuasarCheck(quasar.connection()).run()
const memory = await new QuasarMemoryUsageCheck(quasar.connection())
  .warnWhenExceeds(400_000_000)
  .failWhenExceeds(800_000_000)
  .run()
```

Both return `{ status: 'ok' | 'warning' | 'error', message }` rather than throwing — a health endpoint reports, it does not crash.

## Shutdown

`QuasarProvider.shutdown()` QUITs every open connection. Without it a stopped process keeps its sockets, and ioredis' reconnection timer keeps the event loop alive: the server looks hung instead of exiting.
