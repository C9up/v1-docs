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

`defineConfig` refuses a default connection that is not declared, and an empty connection list — a typo there would otherwise surface as a connection to some default localhost that looks alive until the first command hits the wrong server. `quasar.connection(name)` refuses an undeclared name the same way, including the names only `Object.prototype` carries (`constructor`, `__proto__`), so a name computed at runtime cannot open a connection nobody configured.

### Secrets and ports from the environment

A password may be a `Secret` — what `env.get()` returns for a variable declared `Env.schema.secret()` — and a port may be the string an env file holds:

```ts
main: {
  host: env.get('REDIS_HOST'),
  port: env.get('REDIS_PORT'),          // number or string
  password: env.get('REDIS_PASSWORD'),  // Secret<string> or string
}
```

Both are converted on a copy as the client is built, so the config keeps the Secret wrapped. A port that is not a whole port number (`'63 79'`, `'redis'`, `70000`) is refused instead of being handed to ioredis, which would quietly dial 6379. A cluster's `clusterOptions.redisOptions.password` accepts a Secret too.

Printing the manager — `JSON.stringify(quasar)`, `console.log(quasar)`, a log line — shows where each connection points but no credential: passwords, usernames, TLS keys and the userinfo of a `url` come out as `[redacted]`. `quasar.managerConfig` still reads the real config.

### The generated config

`ream add @c9up/quasar` writes `config/redis.ts` with a bounded reconnect:

```ts
retryStrategy(times) {
  return times > 10 ? null : times * 50
},
```

After ten attempts ioredis gives up, the manager drops the connection, and the next call opens a fresh one. A command issued during an outage then fails in about three seconds; with ioredis' defaults it waits about seventy-four, and every request holding one waits with it. The hook also declares the env validations — `REDIS_HOST` a host, `REDIS_PORT` a number, `REDIS_PASSWORD` an optional secret — when the application's ream can write them.

The config key and the container token stay `redis` — the **role**, the same way Echo binds `cache` and Bay binds `queue`.

## Register the provider

```ts
import QuasarProvider from '@c9up/quasar/provider'
```

It binds the manager as `'quasar.redis'` and `'redis'` and seats it on the service accessor. `register` opens **no socket**: connections are built on first use, so a provider reaching for `'redis'` during its own `boot` finds the manager already there.

## Use

```ts
import quasar from '@c9up/quasar/services/main'

await quasar.connection().set('user:42', payload, 'EX', 60)
await quasar.connection('cache').get('user:42')
```

The Redis commands are callable straight on a connection **and on the manager**, where they run on the default connection:

```ts
await quasar.set('user:42', payload, 'EX', 60)   // default connection
```

They are a fixed list of commands, not everything the ioredis client carries. Sharded pub/sub (`ssubscribe`) is left out — on the command socket it would switch that socket into subscriber mode — and so is ioredis' EventEmitter: a connection has its own events (see [Events](#events)). The raw client stays reachable as `connection.ioConnection` for anything not wrapped here — named `ioConnection` rather than `client` because `CLIENT` is itself a Redis command.

A connection also reports its state: `connectionName`, `status`, `subscriberStatus`, `autoPipelineQueueSize`, `lastError`, and `isConnecting()` (dialling or between two reconnect attempts), `isReady()` (`connect` or `ready`) and `isClosed()` (`close` or `end`).

### LUA scripts

```ts
quasar.defineCommand('incrementBy', { lua: 'return redis.call("incrby", KEYS[1], ARGV[1])', numberOfKeys: 1 })
await quasar.runCommand('incrementBy', 'visits', 5)
```

A script defined on the manager is applied to every open connection **and remembered**, so a connection opened later gets it too.

## Pub/sub

```ts
await quasar.subscribe('orders', (message, channel) => { /* … */ })
await quasar.psubscribe('user:*', (channel, message, pattern) => { /* … */ })
await quasar.publish('orders', JSON.stringify(order))
```

Redis puts a subscribed client into a mode where it accepts nothing but subscribe/unsubscribe, so a connection that both publishes and listens needs two sockets. The second one opens **lazily**, on the first subscribe, and never at all for a connection that only runs commands — meanwhile ordinary commands keep working on the first.

Subscribing twice to one channel **stacks** the handlers — both are called. Two modules listening to the same channel both receive; replacing would make the second subscribe silently stop the first. Pass the handler back to drop just that one:

```ts
await quasar.unsubscribe('orders', handler)   // others keep receiving
await quasar.unsubscribe('orders')            // drops all, leaves the channel
```

`subscribe` / `psubscribe` accept `{ onSubscription, onError }`, and a failure is reported, never thrown. What a failed subscription actually does is described under [Events](#events) below. `subscribed()` / `psubscribed()` are the awaitable forms: they resolve once the channel is live and reject when it could not be subscribed.

A handler is registered before Redis acknowledges the subscription, so a message the server sends in the same packet as the acknowledgement reaches it; a subscription that fails takes its handler back out. Closing a connection with `quit()` or `disconnect()` drops all its handlers — a later subscribe on the same connection starts clean, and a handler torn down with the old socket never hears its successor's messages.

## Health

```ts
import { HealthChecks } from '@c9up/ream/health'
import { QuasarCheck, QuasarMemoryUsageCheck } from '@c9up/quasar'

export const healthChecks = new HealthChecks().register([
  new QuasarCheck(quasar.connection()),
  new QuasarMemoryUsageCheck(quasar.connection('cache'))
    .warnWhenExceeds('400 mb')
    .failWhenExceeds('800 mb')
    .cacheFor('1 minute'),
])
```

Both register with ream's `HealthChecks` as they are. Each is named after its connection — `Redis health check (main)`, `Redis memory consumption health check (cache)` — so two connections make two entries; `as(name)` renames one, `cacheFor(duration)` reuses a result. Thresholds take bytes or a size (`'100 mb'`) and default to 100 MB and 120 MB, so a check left unconfigured can still fail; an unreadable one throws `E_INVALID_BYTES_VALUE`. `compute(async (connection) => bytes)` replaces how memory use is measured.

Both return `{ status, message, finishedAt, meta }` rather than throwing — a health endpoint reports, it does not crash. `meta.connection` gives the connection's name and status; the memory check adds `meta.memoryInBytes: { used, warningThreshold, failureThreshold }`.

Neither sends a command to a connection that is not ready: ioredis would queue it, and a probe that hangs is the outage it exists to report. A connection still dialling gets three seconds, one that already failed gets none, and one ioredis ended on its own is dialled once. A connection that was quit, or that the manager dropped, is reported as closed and never dialled again — a socket the check reopened would be tracked by nothing, outlive `quitAll()` and keep the process from exiting.

## Closing connections

`quit()` and `disconnect()` act on **one** connection — the default one when no name is given — and the `*All` variants act on every open one.

```ts
await quasar.quit()            // the DEFAULT connection only
await quasar.quit('cache')     // that one
await quasar.quitAll()         // every open connection
await quasar.disconnectAll()   // same, without waiting for in-flight commands
```

`quit` closes gracefully, letting in-flight commands finish; `disconnect` drops the socket now.

## Shutdown

`QuasarProvider.shutdown()` calls `quitAll()`. Without it a stopped process keeps its sockets, and ioredis' reconnection timer keeps the event loop alive: the server looks hung instead of exiting.

## Events

A connection emits its lifecycle, each event with one payload object:

```ts
quasar.connection().on('error', ({ error, connection }) => { /* … */ })
quasar.connection().on('reconnecting', ({ connection, waitTime }) => { /* … */ })
quasar.connection().on('ready', ({ connection }) => { /* … */ })
// also: connect, wait, close, end — and, for a cluster, node:added, node:removed, node:error
```

The pub/sub socket is opened lazily and kept internal, so nothing outside could attach a listener to it before the first `subscribe()`. Its lifecycle is re-emitted on the connection with the same payloads:

```ts
quasar.connection().on('subscriber:error', ({ error, connection }) => { /* … */ })
// also: subscriber:connect, subscriber:ready, subscriber:close, subscriber:reconnecting, subscriber:end
```

Without this a pub/sub connection that drops is invisible. The last failure is also readable as `connection.lastSubscriberError`.

Subscriptions report themselves the same way:

```ts
quasar.connection().on('subscription:ready', ({ count, connection }) => { /* … */ })
quasar.connection().on('subscription:error', ({ error, connection }) => { /* … */ })
// and psubscription:ready / psubscription:error for patterns
```

A failed subscription **does not reject**: `subscribe` returns void, so nothing awaits it, and a rejection nobody handles would take the process down. Failure arrives through `onError`, the `subscription:error` event and the connection logger, so an app that wires none of them still sees it.

The manager announces each connection it opens — once, not on every `connection()` call that returns a cached one:

```ts
quasar.on('connection', (connection) => { /* … */ })
```

`on()` returns a function that stops listening, `once(event)` a promise of the next payload, and `clearListeners()` drops what the application attached. A listener that throws is reported through the logger rather than escaping. Quasar's own listeners sit on the ioredis client, out of reach of all three, so error recording and the manager's bookkeeping keep working whatever a teardown does.

## Tracing

Every command — on the command socket and on the pub/sub socket — is published on the `quasar.redis.command` tracing channel:

```ts
import { tracingChannels } from '@c9up/quasar'

tracingChannels.redisCommand.subscribe({
  start: ({ command, connection }) => { /* … */ },
  asyncEnd: ({ command, connection }) => { /* … */ },
  error: ({ command, error }) => { /* … */ },
})
```

The context carries the command's name (`get`, `hset`) and the connection's, never the arguments: those are keys and values, which is where secrets and personal data live. With no subscriber, commands run untouched.

## Errors

Connection errors are reported through an optional structural logger — quasar is a leaf and must not import a framework logger, so it falls back to the console when none is given. The provider hands it the application's logger once the container has one:

```ts
new QuasarManager(config, logger)   // logger?: { error(message, data): void }
quasar.doNotLogErrors()             // you handle them: connection().on('error', …)
```
