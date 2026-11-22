# Introduction

Ce guide couvre le Web Push avec nova :

- Installation
- Génération des clés VAPID
- Configuration
- Références

Statut : **Actif** — endpoint d'abonnement, livraison des pushs, quatre stores d'abonnements, scaffold du Service Worker et le double de test `FakeNova`.

`@c9up/nova` est le package Web Push de Ream. Il prend en charge trois choses :

1. **Identité VAPID** — génère et persiste la paire de clés ECDH P-256 exigée par tous les services push.
2. **Endpoint d'abonnement** — une route intégrée `POST /api/nova/subscribe`, gardée par Warden, qui persiste le JSON `PushSubscription` dans un `SubscriptionStore` enfichable.
3. **Helpers navigateur** — un petit client `subscribe()` qui orchestre `navigator.serviceWorker.register()` puis `pushManager.subscribe()`.

Nova **n'est pas** un orchestrateur multi-canal. Le mail passe par Rover, le temps réel par Relay, les files par Bay, la persistance par Atlas. Nova ne fait que du Web Push. (Voir ADR-002.)

## Installation

```bash
pnpm add @c9up/nova
ream configure @c9up/nova
```

`ream configure` enregistre le provider dans `reamrc.ts`, écrit un stub `config/nova.ts` et sème trois placeholders dans `.env` : `NOVA_VAPID_PUBLIC_KEY`, `NOVA_VAPID_PRIVATE_KEY`, `NOVA_VAPID_SUBJECT`.

## Génération des clés VAPID

```bash
ream nova:vapid:generate
```

Frappe une paire P-256 via `crypto.generateKeyPairSync('ec')` de Node et upserte les trois variables `NOVA_VAPID_*` dans `.env`. Remplace `NOVA_VAPID_SUBJECT` par une vraie adresse `mailto:` avant déploiement — les services push s'en servent pour te contacter en cas de souci d'abonnement.

Le paquet n'a aucune dépendance à l'exécution : la paire de clés, le chiffrement du contenu (RFC 8291 `aes128gcm`, un seul enregistrement) et le jeton VAPID (RFC 8292, ES256, valable 12 heures, pour audience l'origine du point de terminaison) sont tous construits avec `node:crypto`. `nova.push()` envoie ensuite la requête par le `HttpClient` de ream (`@c9up/ream/http-client`), qui refuse les adresses non publiques.

Si `NOVA_VAPID_PRIVATE_KEY` est déjà défini, la commande refuse d'écraser. Passe `--force` pour faire tourner la clé.

La clé privée signe chaque push que l'application enverra : qui peut la lire peut envoyer des notifications au nom de l'application, à chacun de ses abonnés. Quand la commande crée `.env`, elle le crée en `0600` — propriétaire seul — au lieu de laisser l'umask le rendre lisible par tout le monde. Quand `.env` existe déjà, ses permissions sont la décision du déploiement : la commande n'y touche pas et le signale si le fichier est lisible au-delà de son propriétaire.

## Configuration

```ts
// config/nova.ts
import { defineConfig, stores } from '@c9up/nova'
import env from '#start/env'

export default defineConfig({
  routePrefix: '/api/nova', // POST /api/nova/subscribe
  guard: 'jwt',             // n'importe quelle stratégie Warden, ou null pour les tests uniquement

  // Quel store garde les abonnements. Nommé dans l'environnement, pour qu'un
  // déploiement choisisse son backend sans éditer ce fichier.
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

Les factories sont paresseuses : seul le store que `default` nomme est construit, donc déclarer un store Redis dans une config qui tourne sur le store fichier ne coûte rien.

Un `default` qui nomme un store absent de `stores` est refusé au boot — et un `default` sans bloc `stores` du tout l'est aussi. Ni l'un ni l'autre ne retombe sur le driver en mémoire : une application qui voulait persister ses abonnements et a obtenu la mémoire en silence ne l'apprend qu'au redémarrage qui les a tous perdus.

Le provider respecte aussi une liaison `'SubscriptionStore'` préexistante dans le container, qui l'emporte sur la config. `store: <instance>` est la forme mono-store, gardée pour les configs écrites avec elle.

Seul `guard` décide si `POST /api/nova/subscribe` est authentifié. L'enlever n'est pas la même chose que ne pas l'écrire : omettre la clé garde le défaut `'jwt'`, `guard: null` retire le contrôle et sert aux tests.

`DELETE /api/nova/subscribe` avec `{ endpoint }` est enregistrée à côté, sous la même garde : elle retire cet endpoint à l'utilisateur connecté seulement — l'endpoint d'un autre utilisateur répond `404`, comme un endpoint qui n'existe pas. L'id de l'utilisateur authentifié peut être une chaîne, un nombre ou un bigint (une clé auto-incrémentée) ; il est stocké sous sa forme décimale, et `pushToUser(42)` le retrouve.

### Limites et envoi

L'endpoint d'abonnement est une URL que le navigateur fournit : chaque compte choisit donc où le serveur envoie une requête à chaque notification. Ces clés bornent cela :

```ts
import { DEFAULT_PUSH_SERVICES, defineConfig } from '@c9up/nova'
import { throttle } from '#start/limiter' // limiter.define(...) de @c9up/blackhole/limiter

export default defineConfig({
  // ...
  maxSubscriptionsPerUser: 20,   // au-delà, l'abonnement le plus ancien de l'utilisateur part
  middleware: [throttle],        // posé sur les deux routes d'abonnement
  delivery: {
    timeout: 10_000,             // ms pour une requête push, de la connexion à la réponse
    concurrency: 10,             // requêtes que pushToUser garde en vol à la fois
    pushServices: [...DEFAULT_PUSH_SERVICES, 'push.example.net'],
    allowHosts: ['localhost:4399'], // développement uniquement
  },
})
```

| Clé | Défaut | Ce qu'elle fait |
|---|---|---|
| `maxSubscriptionsPerUser` | `20` | Abonnements qu'un utilisateur garde. Un nouveau au-delà du plafond retire le plus ancien de cet utilisateur. |
| `middleware` | `[]` | Middleware posés sur `POST` et `DELETE {routePrefix}/subscribe` — une limite de débit, pour qu'un compte ne puisse pas écrire des abonnements aussi vite qu'il poste. |
| `delivery.timeout` | `10000` | Délai en ms pour une requête push. Un endpoint qui ne répond pas à temps donne `reason: 'server-error'`, `status: 0`. |
| `delivery.concurrency` | `10` | Requêtes que `pushToUser` garde en vol à la fois ; chaque abonnement reçoit quand même son push. |
| `delivery.pushServices` | `DEFAULT_PUSH_SERVICES` | Hôtes vers lesquels un endpoint peut pointer, chacun avec ses sous-domaines : `fcm.googleapis.com`, `push.services.mozilla.com`, `notify.windows.com`, `push.apple.com`. Remplace la liste. |
| `delivery.allowHosts` | `[]` | `host` ou `host:port` exacts vers lesquels un push peut partir bien qu'ils ne soient pas publics — un service push qui tourne sur la machine de développement. À garder hors de la production. |
| `delivery.http` | le client gardé | Le client par lequel passent les pushs — `fakeHttp()` de `@c9up/ream/http-client` dans les tests. |

La route d'abonnement répond `400 E_NOVA_INVALID_SUBSCRIPTION` à un endpoint hors de `pushServices`, à une adresse IP, ou à un endpoint qui porte des identifiants. Les requêtes sortent par `HttpClient` de `@c9up/ream/http-client` : une adresse non publique est refusée au moment où la socket se connecte (une réponse DNS ne peut donc pas changer entre la vérification et la connexion), les redirections ne sont pas suivies, et au plus 16 Kio de la réponse sont lus.

## Références

- [RFC 8030 — Web Push protocol](https://www.rfc-editor.org/rfc/rfc8030)
- [RFC 8188 — Encrypted Content-Encoding for HTTP](https://www.rfc-editor.org/rfc/rfc8188)
- [RFC 8291 — Message Encryption for Web Push](https://www.rfc-editor.org/rfc/rfc8291)
- [RFC 8292 — VAPID](https://www.rfc-editor.org/rfc/rfc8292)
- [MDN — Push API](https://developer.mozilla.org/fr/docs/Web/API/Push_API)
- [MDN — PushSubscription](https://developer.mozilla.org/fr/docs/Web/API/PushSubscription)
