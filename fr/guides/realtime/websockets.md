# WebSockets

Ce guide couvre les routes WebSocket :

- Déclarer une route WebSocket
- La poignée de main décide
- Le socket
- Limites
- Tester une route WebSocket
- Erreurs
- WebSockets

Le serveur natif de ream accepte des connexions WebSocket sur des routes que tu
déclares comme les autres, derrière les mêmes middlewares et les mêmes gardes.
Par-dessus, trois paquets parlent un protocole sur le socket à ta place :

| Tu veux | Utilise |
|---|---|
| Tes propres messages, ton propre format | [`router.ws()`](/fr/guides/realtime/websockets#declarer-une-route-websocket), ci-dessous |
| Des appels requête / réponse vers des méthodes du serveur | [JSON-RPC sur un WebSocket](/fr/guides/apis/json-rpc#sur-un-websocket) avec le `RpcRouter`, et [le transport WebSocket de comet](/fr/guides/apis/json-rpc-clients#sur-un-websocket) comme client |
| Des hubs, des groupes et des diffusions, avec un client SignalR standard | [les hubs de relay](/fr/guides/realtime/hubs#le-fil), qui choisissent WebSockets quand le serveur sait faire l'upgrade |

## Déclarer une route WebSocket

`router.ws()` déclare une route qui accepte des connexions WebSocket. C'est une
route GET comme une autre — elle prend `.as()`, `.use()`, `.middleware()`, les
groupes et les préfixes — et son handler reçoit le contexte avec un `socket` :

```typescript
// start/routes.ts
import router from '@c9up/ream/services/router'

router.ws('/chat/:room', ({ socket, params, auth }) => {
  socket.send(JSON.stringify({ joined: params.room, user: auth.user?.id }))

  socket.on('message', (data, isBinary) => {
    // data : une chaîne pour un message texte, un Uint8Array pour un binaire
    socket.send(data)
  })

  socket.on('close', (code, reason) => {
    // le client est parti, la connexion a coupé (1006), ou le serveur l'a fermée
  })
}).use(middleware.auth())
```

Branche les écouteurs dans le handler : des messages peuvent arriver dès que la
poignée de main est finie, et un message sans écouteur `message` est perdu.

Un chemin peut porter à la fois une route GET et une route WebSocket : la
poignée de main va à `router.ws()`, un GET ordinaire à `router.get()`, quel que
soit l'ordre de déclaration. Un hub SignalR s'en sert : son flux Server-Sent
Events et son socket partagent l'URL. Deux routes WebSocket sur un même chemin
sont refusées (`E_DUPLICATE_ROUTE`), comme deux routes GET.

## La poignée de main décide

Une connexion WebSocket commence par une requête HTTP, la poignée de main. Tout
ce qu'une route fait d'une requête lui arrive, **avant qu'aucun socket
n'existe** :

1. Le serveur refuse de lui-même, avant le routage, une poignée de main mal
   formée (`400 E_WEBSOCKET_BAD_HANDSHAKE`), une version de WebSocket autre que
   13 (`426 E_WEBSOCKET_VERSION`) et un `Origin` de navigateur qu'il n'autorise
   pas (`403 E_WEBSOCKET_ORIGIN`, voir [Origines](/fr/guides/realtime/websockets#origines)).
2. La route est trouvée, puis ses middlewares et ses gardes s'exécutent. Un
   client que le middleware d'auth refuse reçoit son `401` en HTTP ordinaire et
   n'obtient jamais de connexion ouverte.
3. C'est seulement quand le handler est atteint que la requête reçoit `101
   Switching Protocols`. Un handler qui lève une erreur répond comme toute
   autre route, et aucun socket ne s'ouvre.

Un GET ordinaire sur une route WebSocket reçoit `426
E_WEBSOCKET_UPGRADE_REQUIRED` avec `Upgrade: websocket`. Une route WebSocket
atteinte sur un serveur qui ne sait pas tenir de WebSocket reçoit `501
E_WEBSOCKET_UNSUPPORTED`.

### L'auth vaut pour toute la connexion

Un socket n'a qu'une requête : sa poignée de main. Le `ctx` que reçoit le
handler — `ctx.auth`, la session, `ctx.params` — est celui de cette requête tant
que le socket reste ouvert : un rôle retiré pendant que l'utilisateur est
connecté ne compte qu'à sa connexion suivante. Quand un utilisateur se
déconnecte ou perd ses droits, ferme ses sockets toi-même :

```typescript
import type { ServerWebSocket } from '@c9up/ream'

const sockets = new Map<string, Set<ServerWebSocket>>()

router.ws('/notifications', ({ socket, auth }) => {
  const id = String(auth.user?.id)
  const mine = sockets.get(id) ?? new Set()
  mine.add(socket)
  sockets.set(id, mine)
  socket.on('close', () => mine.delete(socket))
}).use(middleware.auth())

// à la déconnexion
for (const socket of sockets.get(userId) ?? []) socket.close(1008, 'signed out')
```

## Le socket

| Sur `socket` | |
|---|---|
| `send(data)` | Une chaîne part en texte, un `Uint8Array` en binaire. `false` quand le socket se ferme, ou quand le message ferait passer l'arriéré du client au-delà de `maxBufferedBytes` — la connexion est alors fermée avec `1013` plutôt que de mettre en mémoire pour un client qui ne lit pas. |
| `close(code?, reason?)` | Ferme une fois écrit ce qui est en file. `code` vaut `1000` (défaut), `1001`–`1014` ou `3000`–`4999` ; `reason` fait au plus 123 octets (sinon `E_WEBSOCKET_CLOSE_CODE`, `E_WEBSOCKET_CLOSE_REASON`). |
| `on('message' \| 'close', listener)`, `off(...)` | Un écouteur qui lève une erreur est signalé, jamais autorisé à faire tomber le process. |
| `closed` | Une promesse de `{ code, reason }` : le code de fermeture du client, celui du serveur, ou `1006` quand la connexion a coupé. |
| `bufferedAmount`, `readyState` | Octets en attente pour le client ; `open`, `closing` ou `closed`. |
| `acceptProtocol(name)`, `protocol`, `offeredProtocols` | Choisir, dans le handler, un des sous-protocoles proposés par le client (`Sec-WebSocket-Protocol`). En nommer un qu'il n'a pas proposé donne `E_WEBSOCKET_PROTOCOL`. |

`server.supportsWebSockets()` (depuis `@c9up/ream/services/server`) dit si le
serveur sous l'application accepte des connexions WebSocket : `true` dès que le
serveur natif de ream écoute, `false` avant son démarrage, après son arrêt, et
sur un hôte sans les primitives WebSocket. Un paquet le demande avant de
proposer un transport WebSocket, comme le fait relay.

## Limites

Chaque connexion est bornée avant que ton code ne voie un octet. Les limites se
trouvent dans le bloc `http.webSocket` de `config/app.ts` ; les valeurs
ci-dessous sont celles par défaut :

```typescript
// config/app.ts
export const http = {
  webSocket: {
    maxMessageSize: '1mb',     // plus gros message reçu
    maxFrameSize: '1mb',       // plus grosse trame reçue
    idleTimeout: 60_000,       // ms de silence avant la fermeture ; 0 jamais
    maxBufferedBytes: '4mb',   // ce qui peut attendre un client qui lit lentement
    allowedOrigins: [],        // origines de navigateur en plus de celle de la requête ; ['*'] pour toutes
  },
}
```

| Ce qui arrive | Le serveur |
|---|---|
| Un message ou une trame au-delà de sa limite | ferme la connexion avec `1009` |
| Aucun échange pendant `idleTimeout` | envoie un ping à mi-parcours, ferme avec `1001` à la fin |
| Un client qui ne lit plus | ferme avec `1013` dès que `maxBufferedBytes` serait dépassé — rien au-delà n'est jamais gardé en mémoire |
| Tes handlers prennent du retard | arrête de lire le socket jusqu'à ce qu'ils rattrapent, si bien qu'un client rapide ne peut pas remplir la mémoire du serveur |
| L'application s'arrête | ferme chaque socket avec `1001` et attend jusqu'à 5 secondes qu'ils se terminent |

Un WebSocket compte dans `http.maxConnections` tant qu'il est ouvert (voir
[Configuration](/fr/start/configuration)). Une limite de taille à `0` octet est
refusée au démarrage du serveur (`E_INVALID_WEBSOCKET_CONFIG`).

### Origines

Un navigateur envoie les cookies du site avec une poignée de main WebSocket
depuis n'importe quelle page, et les WebSockets ne sont pas couverts par la
politique de même origine : sans contrôle, n'importe quel site visité par un
utilisateur connecté pourrait ouvrir un socket en son nom (détournement de
WebSocket entre sites). Par défaut, seule l'origine de la requête elle-même est
donc acceptée. Liste les autres dans `allowedOrigins` :

```typescript
webSocket: {
  allowedOrigins: ['https://app.example.com', 'https://admin.example.com'],
}
```

Un client qui n'est pas un navigateur n'envoie pas d'`Origin` et n'est pas
concerné ; son accès, c'est ce que décident les middlewares et les gardes de la
route.

### Non proposé

Le WebSocket sur HTTP/2 (RFC 8441) n'est pas proposé : les navigateurs ouvrent
leurs WebSockets en HTTP/1.1. La compression `permessage-deflate` n'est pas
négociée. Le serveur passe la suite de conformité
[Autobahn](https://github.com/crossbario/autobahn-testsuite) sans compression.

## Tester une route WebSocket

`TestClient.ws()` ouvre un socket sur l'application démarrée, avec les en-têtes
par défaut du client. Les messages attendent qu'un test les lise ; une poignée
de main refusée rejette avec `WebSocketRefused`, qui porte le statut.

```typescript
import { WebSocketRefused } from '@c9up/ream/testing'

const socket = await client.ws('/chat/general', { headers: { cookie } })
socket.send('hi')
expect(await socket.next()).toBe('hi')
socket.close()

await expect(client.ws('/chat/general')).rejects.toBeInstanceOf(WebSocketRefused)
```

## Erreurs

Chaque code d'erreur WebSocket, avec son statut, se trouve dans
[l'index des erreurs](/fr/reference/errors#erreurs-websocket).

## WebSockets

`router.ws()` déclare une route qui accepte des connexions WebSocket. C'est une
route GET comme une autre — groupes, préfixes, noms et middlewares s'appliquent
— et les middlewares et les gardes s'exécutent sur la poignée de main, avant
qu'aucun socket ne s'ouvre :

```typescript
router.ws('/chat/:room', ({ socket, params }) => {
  socket.on('message', (data) => socket.send(data))
}).use(middleware.auth())
```

Le socket, ses limites, les origines et les tests sont dans
[WebSockets](/fr/guides/realtime/websockets).

## Étapes suivantes
- [JSON-RPC sur un WebSocket](/fr/guides/apis/json-rpc#sur-un-websocket) — les méthodes du `RpcRouter` sur un socket
- [comet](/fr/guides/apis/json-rpc-clients#sur-un-websocket) — le transport WebSocket du client JSON-RPC, navigateur et Node
- [relay](/fr/guides/realtime/broadcasting) — hubs, groupes et diffusions entre instances
- [Routing](/fr/guides/basics/routing) — groupes, préfixes et routes nommées, que les routes WebSocket partagent
