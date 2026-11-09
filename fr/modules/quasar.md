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

`defineConfig` refuse une connexion par défaut non déclarée, ainsi qu'une liste vide : sans cela, une faute de frappe se traduirait par une connexion vers un localhost par défaut, qui semble vivante jusqu'à la première commande envoyée au mauvais serveur. `quasar.connection(nom)` refuse de la même façon un nom non déclaré, y compris les noms que seul `Object.prototype` porte (`constructor`, `__proto__`) : un nom calculé à l'exécution ne peut pas ouvrir une connexion que personne n'a configurée.

### Secrets et ports venus de l'environnement

Un mot de passe peut être un `Secret` — ce que renvoie `env.get()` pour une variable déclarée `Env.schema.secret()` — et un port peut être la chaîne que contient un fichier d'environnement :

```ts
main: {
  host: env.get('REDIS_HOST'),
  port: env.get('REDIS_PORT'),          // nombre ou chaîne
  password: env.get('REDIS_PASSWORD'),  // Secret<string> ou chaîne
}
```

Les deux sont convertis sur une copie au moment de construire le client : la config garde le Secret enveloppé. Un port qui n'est pas un numéro de port entier (`'63 79'`, `'redis'`, `70000`) est refusé au lieu d'être passé à ioredis, qui composerait 6379 sans rien dire. Le `clusterOptions.redisOptions.password` d'un cluster accepte aussi un Secret.

Afficher le manager — `JSON.stringify(quasar)`, `console.log(quasar)`, une ligne de log — montre où pointe chaque connexion, mais aucun identifiant : mots de passe, noms d'utilisateur, clés TLS et partie `user:mot-de-passe@` d'une `url` sortent en `[redacted]`. `quasar.managerConfig` lit toujours la vraie config.

### La config générée

`ream add @c9up/quasar` écrit un `config/redis.ts` dont la reconnexion est bornée :

```ts
retryStrategy(times) {
  return times > 10 ? null : times * 50
},
```

Après dix tentatives, ioredis abandonne, le manager oublie la connexion, et l'appel suivant en ouvre une neuve. Une commande lancée pendant une panne échoue alors en trois secondes environ ; avec les valeurs par défaut d'ioredis, elle attend environ soixante-quatorze secondes, et chaque requête qui la porte attend avec elle. Le hook déclare aussi les validations d'environnement — `REDIS_HOST` un hôte, `REDIS_PORT` un nombre, `REDIS_PASSWORD` un secret optionnel — quand le ream de l'application sait les écrire.

La clé de config et le token du conteneur restent `redis` — le **rôle**, de la même façon qu'Echo enregistre `cache` et Bay `queue`.

## Enregistrer le provider

```ts
import QuasarProvider from '@c9up/quasar/provider'
```

Il enregistre le manager sous `'quasar.redis'` et `'redis'` et l'installe sur l'accesseur de service. `register` n'ouvre **aucun socket** : les connexions sont construites à la première utilisation, si bien qu'un provider qui réclame `'redis'` pendant son propre `boot` trouve le manager déjà en place.

## Utilisation

```ts
import quasar from '@c9up/quasar/services/main'

await quasar.connection().set('user:42', payload, 'EX', 60)
await quasar.connection('cache').get('user:42')
```

Les commandes Redis s'appellent directement sur une connexion **et sur le manager**, où elles s'exécutent sur la connexion par défaut :

```ts
await quasar.set('user:42', payload, 'EX', 60)   // connexion par défaut
```

C'est une liste fixe de commandes, pas tout ce que porte le client ioredis. Le pub/sub shardé (`ssubscribe`) en est exclu — sur le socket de commandes, il ferait passer ce socket en mode abonné — tout comme l'EventEmitter d'ioredis : une connexion a ses propres événements (voir [Événements](#événements)). Le client brut reste accessible via `connection.ioConnection` pour ce qui n'est pas enveloppé ici — nommé `ioConnection` plutôt que `client` parce que `CLIENT` est elle-même une commande Redis.

Une connexion expose aussi son état : `connectionName`, `status`, `subscriberStatus`, `autoPipelineQueueSize`, `lastError`, et `isConnecting()` (en train de composer, ou entre deux tentatives de reconnexion), `isReady()` (`connect` ou `ready`) et `isClosed()` (`close` ou `end`).

### Scripts LUA

```ts
quasar.defineCommand('incrementBy', { lua: 'return redis.call("incrby", KEYS[1], ARGV[1])', numberOfKeys: 1 })
await quasar.runCommand('incrementBy', 'visits', 5)
```

Un script défini sur le manager est appliqué à toutes les connexions ouvertes **et mémorisé**, pour qu'une connexion ouverte plus tard l'obtienne aussi.

## Pub/sub

```ts
await quasar.subscribe('orders', (message, channel) => { /* … */ })
await quasar.psubscribe('user:*', (channel, message, pattern) => { /* … */ })
await quasar.publish('orders', JSON.stringify(order))
```

Redis place un client abonné dans un mode où il n'accepte plus que subscribe/unsubscribe : une connexion qui publie *et* écoute a donc besoin de deux sockets. Le second s'ouvre **paresseusement**, à la première souscription, et jamais pour une connexion qui ne fait que des commandes — pendant ce temps, les commandes ordinaires continuent de passer sur le premier.

S'abonner deux fois à un canal **empile** les handlers — les deux sont appelés. Deux modules qui écoutent le même canal reçoivent tous les deux ; remplacer ferait taire silencieusement le premier. Repassez le handler pour ne retirer que celui-là :

```ts
await quasar.unsubscribe('orders', handler)   // les autres continuent de recevoir
await quasar.unsubscribe('orders')            // retire tout et quitte le canal
```

`subscribe` / `psubscribe` acceptent `{ onSubscription, onError }`, et un échec est signalé, jamais levé. Ce que fait réellement un abonnement en échec est décrit plus bas, dans [Événements](#événements). `subscribed()` / `psubscribed()` en sont les formes attendables : elles se résolvent une fois le canal actif et rejettent quand l'abonnement a échoué.

Un handler est enregistré avant que Redis n'accuse réception de l'abonnement : un message que le serveur envoie dans le même paquet que l'accusé lui parvient, et un abonnement qui échoue retire son handler. Fermer une connexion avec `quit()` ou `disconnect()` retire tous ses handlers — un abonnement ultérieur sur la même connexion repart de zéro, et un handler abandonné avec l'ancien socket n'entend jamais les messages de son successeur.

## Santé

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

Les deux s'enregistrent tels quels dans le `HealthChecks` de ream. Chacun porte le nom de sa connexion — `Redis health check (main)`, `Redis memory consumption health check (cache)` — si bien que deux connexions font deux entrées ; `as(nom)` en renomme un, `cacheFor(durée)` réutilise un résultat. Les seuils prennent des octets ou une taille (`'100 mb'`) et valent par défaut 100 Mo et 120 Mo, pour qu'une vérification laissée sans réglage puisse quand même échouer ; un seuil illisible lève `E_INVALID_BYTES_VALUE`. `compute(async (connection) => octets)` remplace la façon de mesurer la mémoire.

Les deux renvoient `{ status, message, finishedAt, meta }` au lieu de lever : un endpoint de santé rapporte, il ne plante pas. `meta.connection` donne le nom et l'état de la connexion ; la vérification mémoire ajoute `meta.memoryInBytes: { used, warningThreshold, failureThreshold }`.

Aucune n'envoie de commande à une connexion qui n'est pas prête : ioredis la mettrait en file d'attente, et une sonde qui reste bloquée est la panne même qu'elle doit signaler. Une connexion encore en train de composer a droit à trois secondes, une connexion déjà en échec à aucune, et une connexion qu'ioredis a terminée d'elle-même est recomposée une fois. Une connexion fermée par `quit()`, ou que le manager a oubliée, est signalée fermée et n'est jamais recomposée : un socket rouvert par la vérification ne serait suivi par personne, survivrait à `quitAll()` et empêcherait le process de sortir.

## Fermer les connexions

`quit()` et `disconnect()` agissent sur **une** connexion — celle par défaut si aucun nom n'est donné — et les variantes `*All` sur toutes les connexions ouvertes.

```ts
await quasar.quit()            // la connexion PAR DÉFAUT uniquement
await quasar.quit('cache')     // celle-là
await quasar.quitAll()         // toutes les connexions ouvertes
await quasar.disconnectAll()   // pareil, sans attendre les commandes en vol
```

`quit` ferme proprement en laissant finir les commandes en vol ; `disconnect` coupe le socket immédiatement.

## Arrêt

`QuasarProvider.shutdown()` appelle `quitAll()`. Sans cela, un process arrêté conserve ses sockets et le timer de reconnexion d'ioredis maintient la boucle d'événements en vie : le serveur paraît bloqué au lieu de sortir.

## Événements

Une connexion émet son cycle de vie, chaque événement avec un unique objet :

```ts
quasar.connection().on('error', ({ error, connection }) => { /* … */ })
quasar.connection().on('reconnecting', ({ connection, waitTime }) => { /* … */ })
quasar.connection().on('ready', ({ connection }) => { /* … */ })
// également : connect, wait, close, end — et, pour un cluster, node:added, node:removed, node:error
```

Le socket pub/sub est ouvert paresseusement et reste interne : rien à l'extérieur ne pouvait y attacher un écouteur avant le premier `subscribe()`. Son cycle de vie est réémis sur la connexion, avec les mêmes objets :

```ts
quasar.connection().on('subscriber:error', ({ error, connection }) => { /* … */ })
// également : subscriber:connect, subscriber:ready, subscriber:close, subscriber:reconnecting, subscriber:end
```

Sans cela, une connexion pub/sub qui tombe est invisible. La dernière erreur est aussi lisible via `connection.lastSubscriberError`.

Les abonnements se signalent de la même façon :

```ts
quasar.connection().on('subscription:ready', ({ count, connection }) => { /* … */ })
quasar.connection().on('subscription:error', ({ error, connection }) => { /* … */ })
// et psubscription:ready / psubscription:error pour les motifs
```

Un abonnement en échec **ne rejette pas** : `subscribe` renvoie `void`, personne ne l'attend, et un rejet que personne ne gère ferait tomber le process. L'échec passe par `onError`, par l'événement `subscription:error` et par le logger de la connexion, pour qu'une app qui ne branche rien de tout cela le voie quand même.

Le manager annonce chaque connexion qu'il ouvre — une fois, pas à chaque appel de `connection()` qui renvoie une connexion déjà ouverte :

```ts
quasar.on('connection', (connection) => { /* … */ })
```

`on()` renvoie une fonction qui arrête l'écoute, `once(événement)` une promesse du prochain objet, et `clearListeners()` retire ce que l'application a attaché. Un écouteur qui lève est signalé par le logger au lieu de s'échapper. Les écouteurs propres à quasar sont posés sur le client ioredis, hors de portée de ces trois méthodes : l'enregistrement des erreurs et le suivi des connexions par le manager continuent de fonctionner, quel que soit le nettoyage fait par l'application.

## Traçage

Chaque commande — sur le socket de commandes comme sur le socket pub/sub — est publiée sur le canal de traçage `quasar.redis.command` :

```ts
import { tracingChannels } from '@c9up/quasar'

tracingChannels.redisCommand.subscribe({
  start: ({ command, connection }) => { /* … */ },
  asyncEnd: ({ command, connection }) => { /* … */ },
  error: ({ command, error }) => { /* … */ },
})
```

Le contexte porte le nom de la commande (`get`, `hset`) et celui de la connexion, jamais les arguments : ce sont des clés et des valeurs, là où vivent les secrets et les données personnelles. Sans abonné, les commandes passent telles quelles.

## Erreurs

Les erreurs de connexion passent par un logger structurel optionnel — quasar est une feuille et ne doit pas importer le logger d'un framework, il retombe donc sur la console quand on ne lui en donne pas. Le provider lui passe le logger de l'application dès que le conteneur en a un :

```ts
new QuasarManager(config, logger)   // logger?: { error(message, data): void }
quasar.doNotLogErrors()             // vous les gérez : connection().on('error', …)
```
