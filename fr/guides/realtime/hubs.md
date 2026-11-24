# Hubs

Ce guide couvre les hubs SignalR :

- Garder un hub
- Fermer une connexion
- Arguments d'invocation
- Ce qui n'est pas supporté
- Le fil

![Les hubs sur plusieurs instances. Quatre clients SignalR, deux en WebSocket et deux en Server-Sent Events, joignent l'instance A ou l'instance B à travers un répartiteur de charge avec sessions collantes sur les chemins des hubs. Un ChatHub de l'instance A exécute ctx.group('room-1').send('message', data) : l'instance A le livre aux clients qu'elle tient et le publie sur le bus Redis (transports.redis({ connection: 'main' })) ; l'instance B le reçoit du bus et le livre à ses propres clients, si bien que les membres du groupe sur les deux instances reçoivent le message. ctx.send() répond au client appelant, toujours local.](/images/hubs-fr.webp){width=640 height=640 loading=lazy}

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

Les messages d'une connexion s'exécutent l'un après l'autre, dans l'ordre où
le client les a envoyés. Un client qui envoie plus vite que vos méthodes ne
répondent crée une file d'attente sur le serveur, et cette file est bornée :
au-delà de `maxQueuedMessages` messages en attente (256 par défaut), un socket
est fermé avec le code `1013` et un POST montant est refusé en
`429 E_RELAY_MAX_QUEUED`. Ce qui attendait est abandonné.

Chaque message compte, y compris ceux regroupés dans un seul message WebSocket
ou un seul POST. Le client SignalR regroupe les appels faits pendant qu'un
envoi est en cours : un client qui lance plus de 256 invocations sans en
attendre aucune est donc fermé. Pour un tel client, augmentez
`maxQueuedMessages`, ou faites-lui attendre ses appels.

### Garder un hub

`useGuards` dit ce qu'il faut pour **se connecter** au hub :

```ts
class AdminHub extends Hub {
  constructor() {
    super()
    this.useGuards({ guards: ['session'], roles: ['admin', 'owner'], permissions: ['chat.moderate'] })
  }
}
```

Ce sont les routes du hub qui interrogent les gardes. Vous n'avez rien d'autre
à monter pour qu'ils s'appliquent, et l'ordre de vos déclarations ne compte
pas.

| Où les gardes sont interrogés | Ce que reçoit un client refusé |
|---|---|
| `POST <path>/negotiate` | `401` ou `403`, et aucun jeton de connexion |
| Le flux (`GET <path>`) et la poignée de main WebSocket | `401` ou `403`, et ni flux ni socket |
| Chaque invocation | un événement `error` et une Completion d'erreur, puis la connexion est fermée |

`401 E_RELAY_UNAUTHORIZED` répond à une requête qui n'est pas authentifiée, ou
pas par l'un des `guards`. `403 E_RELAY_FORBIDDEN` répond à un utilisateur
authentifié qui n'a pas le rôle ou les permissions.

Un client refusé n'est jamais enregistré sur le hub. `onConnect` ne s'exécute
pas pour lui, et il ne reçoit ni `ctx.broadcast()` ni envoi à un groupe.

Les gardes lisent `ctx.auth` : un middleware doit donc le remplir avant les
routes du hub. Utilisez un middleware global qui authentifie sans refuser,
comme le `silentAuth` de Warden. Si rien ne remplit `ctx.auth`, toutes les
requêtes sont anonymes et un hub gardé refuse tout le monde.

`guards` nomme les gardes par lesquels la requête a pu s'authentifier — ce que
Warden expose comme `auth.authenticatedViaGuard`. `roles` est satisfait par
**n'importe lequel** des noms, `permissions` par
**tous**. L'asymétrie est voulue, et c'est le même partage que le pipeline HTTP,
le routeur RPC et le moteur GraphQL : un rôle dit qui on est — un admin *ou* un
propriétaire peut agir — tandis qu'une permission dit ce qu'une action exige, et
elle les exige toutes.

Un garde `permissions` interroge la couche d'authentification, comme
`.permission()` sur une route :

- Quand `ctx.auth` a `hasAllPermissions` (celui de Warden l'a, et interroge le
  résolveur de droits), c'est cette réponse qui décide. La liste de
  permissions de l'utilisateur n'est pas lue : une permission encore écrite
  dans un jeton après son retrait est refusée.
- Sinon, la liste est lue dans `ctx.auth.permissions`, ou dans
  `ctx.auth.user.permissions`.
- Quand la requête s'est authentifiée avec un jeton d'accès, le jeton doit
  aussi autoriser chaque permission. Un jeton limité à `profile` ne passe pas
  un garde `chat.moderate`, même pour un modérateur.

Pour restreindre une seule méthode d'un hub ouvert à tous, laissez le hub sans
gardes et vérifiez `ctx.auth` dans la méthode.

#### Ce qui est revérifié, et quand

Les gardes sont interrogés de nouveau à **chaque invocation**. Une invocation
qu'ils refusent ferme la connexion : le client ne remplit plus ce qu'il faut
pour être connecté.

- En Server-Sent Events, chaque invocation arrive dans son propre POST,
  authentifié à neuf. Un rôle ou une permission retirés depuis l'ouverture du
  flux sont refusés à l'appel suivant. `ctx.auth` dans la méthode est celui de
  cette requête.
- En WebSocket, une connexion n'a qu'une requête, sa poignée de main. Le rôle
  est celui que portait la poignée de main. Une permission est redemandée à la
  couche d'authentification à chaque appel : une permission retirée en cours
  de connexion est refusée à l'appel suivant.

Rien n'est vérifié tant qu'une connexion ne fait qu'écouter. Un utilisateur
qui se déconnecte de l'application, ou qui perd un rôle, continue de recevoir
jusqu'à sa prochaine invocation, sauf si vous fermez sa connexion (voir
[Fermer une connexion](#fermer-une-connexion)).

Un POST doit venir de l'utilisateur qui a ouvert le flux, et un flux ouvert
anonymement n'accepte que des POST anonymes (`403 E_RELAY_NOT_OWNER`). Le
premier usage d'un jeton — le flux ou le socket — est réservé à qui l'a
négocié : un jeton lu dans un journal avant que son titulaire se connecte
n'ouvre rien. Un POST pour une connexion qui n'a pas de flux ouvert est refusé
en `400 E_RELAY_NOT_CONNECTED`.

### Fermer une connexion

Le serveur peut fermer une connexion. Le client est retiré du hub tout de
suite : il ne reçoit plus rien. Il reçoit ensuite un Close SignalR, puis son
flux ou son socket est fermé.

```ts
// Dans le handler de déconnexion, ou là où un rôle est retiré :
adminHub.disconnectUser(user.id)

// Une connexion, par son identifiant :
adminHub.disconnect(clientId)

// Depuis une méthode du hub, la connexion appelante :
async onLeave(ctx: HubContext) {
  ctx.disconnect()
}
```

`disconnectUser()` renvoie le nombre de connexions fermées. Les deux méthodes
atteignent les connexions tenues par l'instance qui les exécute : une
connexion vit sur l'instance qui l'a négociée. Avec plusieurs instances,
appelez-les sur chacune.

Deux connexions se ferment d'elles-mêmes :

- Une connexion ouverte avec un jeton d'accès qui expire
  (`ctx.auth.user.currentAccessToken.expiresAt`) est fermée à l'expiration du
  jeton.
- Une connexion dont `onConnect` lève une erreur est fermée. Le POST de la
  poignée de main répond `500`, un socket se ferme avec `1011`.

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

Les arguments sont lus sans clé `__proto__`, et sans objet `constructor` qui
porte `prototype`, à toute profondeur. Vous pouvez fusionner un argument dans
un autre objet (`Object.assign(settings, patch)`) sans que le client change le
prototype de cet objet.

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

Le customizer passé à `registerRoutes()` s'applique aux routes de chaque hub
monté après lui, celle du WebSocket comprise. Utilisez-le pour un middleware
dont toutes les routes temps réel ont besoin. Ce n'est pas lui qui garde un
hub :

- C'est un seul customizer pour tous les hubs : il ne peut pas dire « ce hub
  exige `admin` ».
- Un hub déclaré avant `registerRoutes()` ne le reçoit pas.
- Le middleware `auth` de Warden n'y refuse rien. Il applique les décorateurs
  `@Guard`, `@Role` et `@Permission` d'une action de contrôleur. Une route de
  hub n'en a pas : la requête passe. `route.guard('web')`, lui, refuse une
  requête anonyme, sur toutes les routes que le customizer atteint.

Pour décider qui se connecte à un hub, utilisez
[`useGuards()`](#garder-un-hub).
