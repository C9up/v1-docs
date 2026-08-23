# Quasar — connexions Redis

`@c9up/quasar` possède la **connexion** Redis, et rien d'autre.

Un quasar est alimenté par un trou noir qui accrète la matière autour de lui : celui-ci alimente l'application en données. Comme tous les paquets d'ici, il porte le nom de ce qu'il est, pas de la technologie qu'il parle.

Les paquets qui *stockent* dans Redis — [Echo](/fr/modules/echo) (cache), [Bay](/fr/modules/bay) (queue), [Warden](/fr/modules/warden) (blacklist de jetons) — reçoivent chacun un client par contrat structurel. Ils ne dépendent pas de Quasar : ils restent agnostiques et ce paquet reste optionnel. Avant lui, chaque application reconstruisait à la main la couche de connexion pour partager un client entre les trois.

## Installation

```sh
pnpm add @c9up/quasar
```

## Configuration

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

`defineConfig` refuse une connexion par défaut non déclarée, ainsi qu'une liste vide : sans cela, une faute de frappe se traduirait par une connexion vers un localhost par défaut, qui semble vivante jusqu'à la première commande envoyée au mauvais serveur.

La clé de config et le token du conteneur restent `redis` — le **rôle**, de la même façon qu'Echo enregistre `cache` et Bay `queue`.

## Enregistrer le provider

```ts
import QuasarProvider from '@c9up/quasar/provider'
```

Il enregistre le manager sous `'redis'` et l'installe sur l'accesseur de service. `register` n'ouvre **aucun socket** : les connexions sont construites à la première utilisation, si bien qu'un provider qui réclame `'redis'` pendant son propre `boot` trouve le manager déjà en place.

## Utilisation

```ts
import quasar from '@c9up/quasar/services/main'

await quasar.connection().set('user:42', payload, 'EX', 60)
await quasar.connection('cache').get('user:42')
```

Toutes les commandes ioredis s'appellent directement sur une connexion **et sur le manager**, où elles s'exécutent sur la connexion par défaut :

```ts
await quasar.set('user:42', payload, 'EX', 60)   // connexion par défaut
```

Le client brut reste accessible via `connection.ioConnection` pour ce qui n'est pas enveloppé ici — nommé d'après l'`ioConnection` d'Adonis plutôt que `client`, parce que `CLIENT` est elle-même une commande Redis.

Une connexion expose aussi son état comme chez Adonis : `connectionName`, `status`, `subscriberStatus`, `autoPipelineQueueSize`, `lastError`, et `isConnecting()` / `isReady()` / `isClosed()`.

### Scripts LUA

```ts
quasar.defineCommand('incrementBy', { lua: 'return redis.call("incrby", KEYS[1], ARGV[1])', numberOfKeys: 1 })
await quasar.runCommand('incrementBy', 'visits', 5)
```

Un script défini sur le manager est appliqué à toutes les connexions ouvertes **et mémorisé**, pour qu'une connexion ouverte plus tard l'obtienne aussi.

## Pub/sub

```ts
await quasar.subscribe('orders', (message, channel) => { /* … */ })
await quasar.psubscribe('user:*', (message, channel, pattern) => { /* … */ })
await quasar.publish('orders', JSON.stringify(order))
```

Redis place un client abonné dans un mode où il n'accepte plus que subscribe/unsubscribe : une connexion qui publie *et* écoute a donc besoin de deux sockets. Le second s'ouvre **paresseusement**, à la première souscription, et jamais pour une connexion qui ne fait que des commandes — pendant ce temps, les commandes ordinaires continuent de passer sur le premier.

S'abonner deux fois à un canal **empile** les handlers — les deux sont appelés, comme chez Adonis. Deux modules qui écoutent le même canal reçoivent tous les deux ; remplacer ferait taire silencieusement le premier. Repassez le handler pour ne retirer que celui-là :

```ts
await quasar.unsubscribe('orders', handler)   // les autres continuent de recevoir
await quasar.unsubscribe('orders')            // retire tout et quitte le canal
```

`subscribe` / `psubscribe` acceptent les `{ onSubscription, onError }` d'Adonis. **Déviation nommée :** chez nous la promesse rejette aussi en cas d'échec, donc `await quasar.subscribe(...)` fait remonter l'erreur même sans `onError` — Adonis ne la signale que par ce callback, si bien qu'une app qui ne l'utilise pas peut se retrouver silencieusement désabonnée. `onError` est toujours appelé, le code Adonis fonctionne donc tel quel.

## Santé

```ts
import { QuasarCheck, QuasarMemoryUsageCheck } from '@c9up/quasar'

const ping = await new QuasarCheck(quasar.connection()).run()
const memory = await new QuasarMemoryUsageCheck(quasar.connection())
  .warnWhenExceeds(400_000_000)
  .failWhenExceeds(800_000_000)
  .run()
```

Les deux renvoient `{ status: 'ok' | 'warning' | 'error', message }` au lieu de lever : un endpoint de santé rapporte, il ne plante pas.

## Fermer les connexions

Exactement comme Adonis : `quit()` et `disconnect()` agissent sur **une** connexion — celle par défaut si aucun nom n'est donné — et les variantes `*All` sur toutes les connexions ouvertes.

```ts
await quasar.quit()            // la connexion PAR DÉFAUT uniquement
await quasar.quit('cache')     // celle-là
await quasar.quitAll()         // toutes les connexions ouvertes
await quasar.disconnectAll()   // pareil, sans attendre les commandes en vol
```

`quit` ferme proprement en laissant finir les commandes en vol ; `disconnect` coupe le socket immédiatement.

## Arrêt

`QuasarProvider.shutdown()` appelle `quitAll()`. Sans cela, un process arrêté conserve ses sockets et le timer de reconnexion d'ioredis maintient la boucle d'événements en vie : le serveur paraît bloqué au lieu de sortir.

## Erreurs

Les erreurs de connexion passent par un logger structurel optionnel — quasar est une feuille et ne doit pas importer le logger d'un framework, donc contrairement au `Logger` obligatoire d'Adonis celui-ci est optionnel et retombe sur la console :

```ts
new QuasarManager(config, logger)   // logger?: { error(payload, message): void }
quasar.doNotLogErrors()             // vous les gérez : connection().on('error', …)
```
