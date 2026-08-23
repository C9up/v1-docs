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

Every ioredis command is callable straight on a connection **and on the manager**, where it runs on the default connection:

```ts
await quasar.set('user:42', payload, 'EX', 60)   // default connection
```

The raw client stays reachable as `connection.ioConnection` for anything not wrapped here — named after Adonis' `ioConnection` rather than `client`, because `CLIENT` is itself a Redis command.

A connection also reports its state the way Adonis does: `connectionName`, `status`, `subscriberStatus`, `autoPipelineQueueSize`, `lastError`, and `isConnecting()` / `isReady()` / `isClosed()`.

### LUA scripts

```ts
quasar.defineCommand('incrementBy', { lua: 'return redis.call("incrby", KEYS[1], ARGV[1])', numberOfKeys: 1 })
await quasar.runCommand('incrementBy', 'visits', 5)
```

A script defined on the manager is applied to every open connection **and remembered**, so a connection opened later gets it too.

## Pub/sub

```ts
await quasar.subscribe('orders', (message, channel) => { /* … */ })
await quasar.psubscribe('user:*', (message, channel, pattern) => { /* … */ })
await quasar.publish('orders', JSON.stringify(order))
```

Redis puts a subscribed client into a mode where it accepts nothing but subscribe/unsubscribe, so a connection that both publishes and listens needs two sockets. The second one opens **lazily**, on the first subscribe, and never at all for a connection that only runs commands — meanwhile ordinary commands keep working on the first.

Subscribing twice to one channel **stacks** the handlers — both are called, as in Adonis. Two modules listening to the same channel both receive; replacing would make the second subscribe silently stop the first. Pass the handler back to drop just that one:

```ts
await quasar.unsubscribe('orders', handler)   // others keep receiving
await quasar.unsubscribe('orders')            // drops all, leaves the channel
```

`subscribe` / `psubscribe` accept Adonis' `{ onSubscription, onError }`. **Named deviation:** ours also rejects on failure, so `await quasar.subscribe(...)` surfaces the error even when no `onError` was passed — Adonis reports it only through that callback, so an app that never opts in can end up silently unsubscribed. `onError` still fires, so Adonis code keeps working unchanged.

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

## Closing connections

Following Adonis exactly: `quit()` and `disconnect()` act on **one** connection — the default one when no name is given — and the `*All` variants act on every open one.

```ts
await quasar.quit()            // the DEFAULT connection only
await quasar.quit('cache')     // that one
await quasar.quitAll()         // every open connection
await quasar.disconnectAll()   // same, without waiting for in-flight commands
```

`quit` closes gracefully, letting in-flight commands finish; `disconnect` drops the socket now.

## Shutdown

`QuasarProvider.shutdown()` calls `quitAll()`. Without it a stopped process keeps its sockets, and ioredis' reconnection timer keeps the event loop alive: the server looks hung instead of exiting.

## Subscriber events

The pub/sub socket is opened lazily and kept internal, so nothing outside could
attach a listener to it before the first `subscribe()`. Its lifecycle is
re-emitted on the connection under Adonis' names:

```ts
quasar.connection().on('subscriber:ready', () => { /* … */ })
quasar.connection().on('subscriber:error', (error) => { /* … */ })
// also: subscriber:connect, subscriber:close, subscriber:reconnecting, subscriber:end
```

Without this a pub/sub connection that drops is invisible. The last failure is
also readable as `connection.lastSubscriberError`.

Subscriptions report themselves the same way:

```ts
quasar.connection().on('subscription:ready', ({ count }) => { /* … */ })
quasar.connection().on('subscription:error', ({ error }) => { /* … */ })
// and psubscription:ready / psubscription:error for patterns
```

A failed subscription **does not reject**. Adonis' `subscribe` returns void, so
code written against it never awaits the call, and a rejection nobody handles
would take the process down. Failure arrives through `onError`, the
`subscription:error` event, and — unlike Adonis — the connection logger, so an
app that wires neither still sees it.

## Errors

Connection errors are reported through an optional structural logger — quasar is a leaf and must not import a framework logger, so unlike Adonis' required `Logger` this one is optional and falls back to the console:

```ts
new QuasarManager(config, logger)   // logger?: { error(payload, message): void }
quasar.doNotLogErrors()             // you handle them: connection().on('error', …)
```
