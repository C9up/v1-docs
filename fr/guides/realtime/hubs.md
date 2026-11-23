# Hubs

Ce guide couvre les hubs SignalR :

- Garder un hub
- Arguments d'invocation
- Ce qui n'est pas supporté
- Le fil

![Les hubs sur plusieurs instances. Quatre clients SignalR, deux en WebSocket et deux en Server-Sent Events, joignent l'instance A ou l'instance B à travers un répartiteur de charge avec sessions collantes sur les chemins des hubs. Un ChatHub de l'instance A exécute ctx.group('room-1').send('message', data) : l'instance A le livre aux clients qu'elle tient et le publie sur le bus Redis (transports.redis({ connection: 'main' })) ; l'instance B le reçoit du bus et le livre à ses propres clients, si bien que les membres du groupe sur les deux instances reçoivent le message. ctx.send() répond au client appelant, toujours local.](/images/hubs-en.webp){width=640 height=640 loading=lazy}

## Hubs (SignalR)

Un `Hub` est la moitié bidirectionnelle : le client invoque des méthodes côté
serveur, le serveur pousse vers un client, un groupe, ou tout le monde. On le
monte depuis un preload (`start/services.ts`), là même où `registerRoutes()`
est appelé — chaque déclaration pose sa route **au moment où elle est écrite**,
donc avant que le serveur écoute :

```ts
import relay from '@c9up/relay/services/main'
import { Hub, type HubContext } from '@c9up/relay'

class ChatHub extends Hub {
  // `onSendMessage` traite l'invocation `sendMessage` : le nom de méthode
  // après `on`, comparé sans tenir compte de la casse.
  async onSendMessage(ctx: HubContext, data: unknown) {
    ctx.group('room-1').send('message', data)
  }
}

relay.hub('/hubs/chat', new ChatHub())
```

`onConnect` s'exécute une fois le handshake du client acquitté — une trame
envoyée avant la réponse au handshake fait refuser la connexion par le client
SignalR. La valeur renvoyée par une méthode est ce que résout le `invoke()` du
client.

Un flux qui n'a pas terminé le handshake après `handshakeTimeoutMs` (15 s par
défaut, celui du client) est fermé, et au-delà de `maxConnections` flux ouverts
(10 000 par défaut) un nouveau est refusé en 503. Un même propriétaire — un
utilisateur, ou l'adresse du client d'une requête anonyme — peut tenir
`maxConnectionsPerOwner` flux (20 par défaut) et `maxPendingTokensPerOwner`
tokens négociés pas encore rattachés (20 par défaut) ; une table de tokens
pleine refuse une nouvelle négociation en 503 plutôt que de supprimer le token
d'un autre. Ce sont des options de l'adaptateur passé en troisième argument :

```ts
import { SignalRAdapter } from '@c9up/relay'

const hub = new ChatHub()
relay.hub('/hubs/chat', hub, new SignalRAdapter(hub, { handshakeTimeoutMs: 10_000, maxConnections: 2_000 }))
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

Chaque invocation est vérifiée contre la requête qui la porte — chacune arrive
dans son propre POST — et non contre celle qui a ouvert le flux : un rôle retiré
depuis cesse de fonctionner à l'appel suivant, et un rôle accordé fonctionne
sans reconnexion. `ctx.auth` dans la méthode est celui de cette même requête.
Un POST doit venir de l'utilisateur qui a ouvert le flux, et un flux ouvert
anonymement n'accepte que des POST anonymes (`403 E_RELAY_NOT_OWNER`). Le
premier usage d'un jeton — le flux, le socket ou un POST — est réservé à qui
l'a négocié : un jeton lu dans un journal avant que son titulaire se connecte
n'ouvre rien.

Sur WebSocket, une connexion n'a qu'une requête, sa poignée de main : chaque
invocation reçue sur le socket est donc vérifiée contre l'authentification de
la poignée de main. Un rôle retiré en cours de connexion prend effet à la
connexion suivante, comme avec le transport WebSocket d'ASP.NET Core SignalR.

`guards` nomme les gardes par lesquels la requête a pu s'authentifier — ce que
Warden expose comme `auth.authenticatedViaGuard`. `roles` est satisfait par
**n'importe lequel** des noms, `permissions` par
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
    return a + b + c
  }
}

// client : await connection.invoke('Sum', 1, 2, 3)   // → 6
```

Une méthode qui déclare un seul paramètre n'est pas affectée — les arguments en
trop sont simplement ignorés, comme dans tout appel JavaScript. Seul le premier
argument passait jusqu'ici, et les autres disparaissaient sans que rien ne le
signale.

Le nom est comparé sans tenir compte de la casse, comme l'attendent les clients
SignalR : `invoke('Sum')`, `invoke('sum')` et `invoke('SUM')` atteignent tous
`onSum`. Deux méthodes dont les noms ne diffèrent que par la casse répondraient à
la même invocation : le hub refuse alors de se construire.

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

Deux transports SignalR de première classe : un client `@microsoft/signalr`
standard parle à un hub sans modification, quel que soit celui qu'il choisit.

| Route | Rôle |
|---|---|
| `POST <path>/negotiate` | émet un `connectionId` + `connectionToken`, et les transports proposés |
| `WS <path>?id=<token>` | **WebSockets** : un seul socket, les trames dans les deux sens |
| `GET <path>?id=<token>` | **Server-Sent Events** : le flux, serveur → client |
| `POST <path>?id=<token>` | le sens montant du SSE : messages encadrés, client → serveur |

`negotiate` n'annonce que les transports que le serveur sait réellement servir :
WebSockets en premier — SignalR les essaie dans l'ordre — quand le serveur sous
l'application peut faire l'upgrade (`server.supportsWebSockets()`, vrai dès que
le serveur natif de ream écoute), Server-Sent Events toujours. Annoncer
WebSockets alors que rien ne peut faire l'upgrade enverrait chaque client dans
une impasse. Le socket et le flux SSE partagent le chemin du hub : ream confie
une poignée de main WebSocket à la route WebSocket et un GET ordinaire au flux.

Le socket transporte les trames texte du protocole JSON ; un message binaire est
refusé avec le code de fermeture `1003`. Les limites de ream s'y appliquent
(`config/app.ts` → `http.webSocket`, voir [WebSockets](/fr/guides/realtime/websockets#limites)), et celle de SignalR (`maxFrameSize`,
64 Kio) à l'intérieur. À l'arrêt, chaque socket est fermé avec `1001`.

Le customizer passé à `registerRoutes()` s'applique à toutes les routes d'un
hub, celle du WebSocket comprise : un middleware `auth` refuse la poignée de
main avant qu'un socket s'ouvre.
