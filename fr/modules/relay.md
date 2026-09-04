# Relay — Realtime

Relay est le module de transport realtime client de Ream (`@c9up/relay`) avec SSE + WebSocket Hub + SignalR. Remplace l'ancien package `@c9up/raytrace`.

## Capacites

- diffusion server → clients via SSE
- Hubs bidirectionnels parlant le protocole JSON SignalR sur SSE
- canaux subscribables
- autorisation de canaux
- relai d'événements
- diffusion multi-instances via un bus Redis

## API principale

```ts
import { Relay } from '@c9up/relay'

const rt = new Relay()
rt.authorize('user:*', async (ctx, userId) => ctx.auth.user?.id === userId)
rt.relay('task.*')
```

## Configuration

Définissez vos réglages Relay dans `config/relay.ts` avec le helper `defineConfig` :

```ts
import { defineConfig, transports } from '@c9up/relay'

export default defineConfig({
  // Autoriser l'abonnement à un canal qu'aucun autorisateur ne couvre.
  // Par défaut false.
  allowUnauthorizedChannels: false,
  // Clients SSE simultanés acceptés par cette instance. Au-delà, 503.
  maxClients: 10_000,
  // Canaux qu'un client peut détenir. Les noms viennent du client et sont
  // indexés : sans borne, une seule socket peut immobiliser la mémoire.
  maxChannelsPerClient: 100,
  // Le bus qui transporte un broadcast d'une instance à l'autre. Voir plus bas.
  transport: transports.redis({ connection: 'main' }),
})
```

### Plusieurs instances

Un broadcast atteint les clients SSE rattachés à l'instance qui l'a émis.
Derrière un répartiteur de charge avec deux répliques, cela représente environ
la moitié de vos utilisateurs : chacun est connecté à l'instance que le
répartiteur a choisie pour lui.

`transport` comble ce trou : chaque broadcast est recopié sur le bus, et chaque
instance redistribue ce qui arrive à ses propres clients. La redistribution est
purement locale, donc un message ne repart jamais sur le bus.

```ts
import { defineConfig, transports } from '@c9up/relay'

export default defineConfig({
  transport: transports.redis({ connection: 'main' }),
})
```

`connection` accepte le nom d'une connexion [`@c9up/quasar`](/fr/modules/quasar)
— résolue au premier broadcast, pas à la lecture du fichier de config — ou
votre propre client répondant à `publish`, `subscribe` et `unsubscribe`.

`transportChannel` renomme le canal sur lequel le bus publie (par défaut
`relay::broadcast`) ; toutes les instances doivent s'accorder dessus.
`relay.shutdown()` se désabonne et ferme la connexion.

Sans `transport`, relay reste mono-instance.

## Endpoints typiques

- `GET /__relay/events` connexion SSE (hint optionnel `?uid=<id>`)
- `POST /__relay/subscribe` abonnement canal
- `POST /__relay/unsubscribe` desabonnement

### Sécurité du uid hint

Quand un client authentifié se connecte à `/__relay/events?uid=<id>`,
le serveur pré-flight le hint contre `ctx.auth.user.id` AVANT
d'upgrade la réponse en SSE. Si les deux ne matchent pas, une
réponse bufferisée `403 E_UID_HIJACK` est renvoyée et le stream
n'est jamais ouvert. Le hint est donc purement informationnel —
le uid canonique vient toujours de `ctx.auth`, jamais du query string.

## Hubs (SignalR)

Un `Hub` est la moitié bidirectionnelle : le client invoque des méthodes côté
serveur, le serveur pousse vers un client, un groupe, ou tout le monde. On le
monte depuis un preload (`start/services.ts`), là même où `registerRoutes()`
est appelé — le provider pose les routes en `start()`, après les preloads :

```ts
import relay from '@c9up/relay/services/main'
import { Hub, type HubContext } from '@c9up/relay'

class ChatHub extends Hub {
  // `onSendMessage` traite l'invocation `sendMessage` : le nom de méthode
  // après `on`, première lettre en minuscule.
  async onSendMessage(ctx: HubContext, data: unknown) {
    ctx.group('room-1').send('message', data)
  }
}

relay.hub('/hubs/chat', new ChatHub())
```

### Garder un hub

`useGuards` s'applique à chaque invocation du hub :

```ts
class AdminHub extends Hub {
  constructor() {
    super()
    this.useGuards({ guards: ['session'], roles: ['admin', 'owner'], permissions: ['chat.moderate'] })
  }
}
```

`roles` est satisfait par **n'importe lequel** des noms, `permissions` par
**tous**. L'asymétrie est voulue, et c'est le même partage que le pipeline HTTP,
le routeur RPC et le moteur GraphQL : un rôle dit qui on est — un admin *ou* un
propriétaire peut agir — tandis qu'une permission dit ce qu'une action exige, et
elle les exige toutes.

`onConnect` / `onDisconnect` sont des hooks de cycle de vie, non invocables.
Monter deux fois le même chemin lève une erreur au lieu de remplacer le premier
hub.

### Arguments d'invocation

Une méthode de hub reçoit **tous** les arguments envoyés par le client :

```ts
class MathHub extends Hub {
  async onSum(ctx: HubContext, a: number, b: number, c: number) {
    ctx.send('result', a + b + c)
  }
}

// client : connection.invoke('Sum', 1, 2, 3)
```

Une méthode qui déclare un seul paramètre n'est pas affectée — les arguments en
trop sont simplement ignorés, comme dans tout appel JavaScript. Seul le premier
argument passait jusqu'ici, et les autres disparaissaient sans que rien ne le
signale.

### Ce qui n'est pas supporté

Le streaming n'est pas implémenté. Une `StreamInvocation` reçoit une
**Completion d'erreur** qui en nomme la raison, au lieu d'être jetée :
l'identifiant d'invocation est la poignée qu'attend l'observable du client, et
le protocole promet une Completion — en jeter une laisse donc l'observable
suspendu pour toute la durée de la connexion.

`StreamItem` et `CancelInvocation` sont ignorés, ce qui est la réponse correcte
pour les deux — un item appartient à un flux dont l'invocation d'ouverture a
déjà été refusée, et une annulation vise un flux qui n'a jamais démarré.

### Le fil

Le transport est le **Server-Sent Events** — ce que relay sert déjà, ce
qu'utilise le paquet temps réel d'AdonisJS, et un transport SignalR de première
classe. Un client `@microsoft/signalr` standard configuré en
`HttpTransportType.ServerSentEvents` le parle sans modification :

| Route | Rôle |
|---|---|
| `POST <path>/negotiate` | émet un `connectionId` + `connectionToken` |
| `GET <path>?id=<token>` | le flux, serveur → client |
| `POST <path>?id=<token>` | messages encadrés, client → serveur |

`negotiate` n'annonce que les transports que le serveur sait réellement servir.
Annoncer WebSockets alors que rien ne peut faire l'upgrade envoie chaque client
dans une impasse : le défaut est donc `ServerSentEvents` seul.

Le customizer passé à `registerRoutes()` s'applique aussi aux trois routes d'un
hub — un hub a autant besoin du middleware `auth` que le flux d'événements.

## Bonnes pratiques

- toujours proteger les canaux sensibles
- limiter le nombre de canaux par client
- tracer les abonnements pour detecter les fuites
