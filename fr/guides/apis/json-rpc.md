# JSON-RPC

Ce guide couvre JSON-RPC côté serveur.

Ream fournit trois façons alternatives d'exposer vos services à côté de REST, plus
une base de sérialisation pour façonner les réponses. Chacune est câblée par un
**provider** et est **opt-in** — ajoutez le provider à la liste des providers de votre
app pour l'activer.

| Provider | Monte | Rôle |
|---|---|---|
| `RpcProvider` | `POST /rpc` (et un WebSocket dessus, sur demande) | dispatch de méthodes JSON-RPC 2.0 |
| `GraphQLProvider` | `GET`/`POST /graphql` | passerelle GraphQL (parsing Rust, resolvers TS) |
| `OpenApiProvider` | `GET /docs`, `GET /api-docs` | Swagger UI + spec OpenAPI 3.1 auto-générée |
| `ApiResource` | — | classe de base sérialiseur entité → réponse |

Les trois résolvent leurs handlers/resolvers via le **container IoC**, exactement
comme les contrôleurs — donc les handlers bénéficient de l'injection de dépendances.

## JSON-RPC

Ajoutez `RpcProvider`, puis enregistrez des méthodes sur le routeur `rpc` lié au
container.

```ts
import { RpcProvider } from '@c9up/ream/rpc/provider'

// 1. Enregistrer le provider (dans votre liste de providers).

// 2. Enregistrer les méthodes — n'importe quand après boot, via le container.
const rpc = await app.container.make('rpc')

// Handler closure :
rpc.method('task.validate', (ctx, params) => validate(params)).guard('jwt')

// Ou les méthodes d'un contrôleur — listées explicitement, résolues par DI à chaque appel :
rpc.namespace('user', UserController, ['find', 'create']) // → user.find, user.create

// Guards/middleware partagés pour un groupe :
rpc.group({ guard: 'jwt' }, (r) => {
  r.method('admin.purge', purgeHandler)
})
```

Les clients font `POST /rpc` avec un corps JSON-RPC 2.0 (simple ou batch, max 50) :

```json
{ "jsonrpc": "2.0", "method": "task.validate", "params": { "id": 1 }, "id": 1 }
```

Le corps doit être envoyé en `application/json` (ou `application/json-rpc`,
`application/jsonrequest`) ; tout autre Content-Type, ou aucun, reçoit
`415 Unsupported Media Type` avant que le corps soit lu. Un formulaire ou un
corps `text/plain` est une requête que n'importe quelle page peut envoyer avec
les cookies du visiteur sans preflight CORS ; un Content-Type JSON ne peut pas
partir ainsi. Un corps qui n'est pas du JSON valide reçoit `-32700 Parse error`.

`namespace()` ne publie que les méthodes qu'on lui donne. `private` et
`protected` de TypeScript n'existent pas à l'exécution : une méthode de
contrôleur est joignable en RPC exactement quand elle figure dans cette liste.
Le type n'accepte que les noms des méthodes publiques du contrôleur ; un nom
inconnu, un getter ou `constructor` lève `E_RPC_UNKNOWN_CONTROLLER_METHOD`.

Les noms qui commencent par `rpc.` sont réservés au protocole par JSON-RPC 2.0 :
en enregistrer un lève `E_RPC_RESERVED_METHOD_NAME`, et un nom vide lève
`E_RPC_INVALID_METHOD_NAME`.

En production, une panne interne (un handler ou un validateur qui lève autre
chose qu'une erreur JSON-RPC, un validateur non enregistré) reçoit
`-32603 Internal error` sans son message.

Le serveur garde ce que l'appelant ne voit pas : chacune de ces pannes est
journalisée par `ctx.logger`, donc avec l'identifiant de corrélation de la
requête, avec son message, sa pile, la méthode RPC et l'`id` de l'appel, au
niveau `error` (`warn` pour un refus qu'un middleware a levé avec un statut
4xx, comme pour une route). Elle est aussi émise comme événement `exception`,
avec un champ `rpcMethod` en plus. Une erreur JSON-RPC que le handler lève
exprès (avec un `code` numérique) est une réponse, pas une panne : elle n'est
pas journalisée.

Config : `config.rpc.path` change le chemin de montage (défaut `/rpc`) ;
`config.rpc.contentTypes` remplace les types de média acceptés ;
`config.rpc.webSocket` sert aussi les méthodes sur un WebSocket (ci-dessous).

### Sur un WebSocket

Les mêmes méthodes répondent sur un WebSocket par client, ce qui économise une
requête par appel et garde la connexion ouverte pour ce que le serveur pousse :

```ts
// config/rpc.ts — sur le chemin du POST, derrière les mêmes `guards`
export default { guards: ['web'], webSocket: true }

// ou à la main, sur n'importe quelle route
router.ws('/rpc', rpc.webSocket({ maxInFlight: 16, maxQueued: 256 })).use(middleware.auth())
```

Chaque message texte est un message JSON-RPC, simple ou batch, et suit le
chemin d'un corps de POST : même parsing, même limite de batch, mêmes guards,
rôles, permissions, middleware, validateurs et codes d'erreur. Une
notification, ou un batch qui n'en contient que, ne reçoit pas de réponse ; un
message binaire reçoit `-32700 Parse error`.

- **L'auth est celle de la poignée de main.** Les middleware et guards de la
  route tournent sur la requête d'upgrade ; un client refusé reçoit du HTTP
  ordinaire (401) et jamais de socket. Chaque appel sur le socket tourne
  ensuite avec le `ctx` de cette requête : `ctx.auth` est l'utilisateur qui
  s'est connecté. Un rôle retiré pendant que le socket est ouvert compte à la
  connexion suivante ; un garde `.permission()` interroge la couche d'auth à
  chaque appel. Fermez vous-même les sockets d'un utilisateur qui se déconnecte.
- **Les appels partagent ce `ctx`**, comme les appels d'un batch : gardez l'état
  propre à un appel dans le handler, pas sur `ctx`. La session est celle que la
  poignée de main a lue.
- **Borné.** Au plus `maxInFlight` messages d'un socket tournent en même temps
  (16 par défaut) et répondent dans l'ordre où ils finissent, donc les réponses
  peuvent arriver dans le désordre — JSON-RPC les apparie par `id`. Les appels
  d'un batch tournent dans l'ordre et reviennent en une seule réponse. Un
  client qui laisse plus de `maxQueued` messages (256) en attente est fermé
  avec `1013`. La taille d'un message est la limite `http.webSocket.maxMessageSize`
  du serveur (1 Mio par défaut ; voir
  [WebSockets](/fr/guides/realtime/websockets#limites)).

Un client : `createWebSocketTransport` de [`@c9up/comet`](/fr/guides/apis/json-rpc-clients).

> Le `RpcRouter` garde son DSL de routage (`method`/`group`/`namespace`/`guard`/`validate`)
> et son pipeline (DI, middleware, auth warden), mais l'enveloppe JSON-RPC, le
> parsing, la règle de notification et les codes d'erreur viennent du cœur de
> protocole agnostique [`@c9up/comet`](/fr/guides/apis/json-rpc-clients) — le même cœur que le
> client d'aurora, donc la logique de la spec est définie une seule fois. Le
> `@c9up/comet` est un peer optionnel — enregistrez le RPC depuis le sous-chemin
> `@c9up/ream/rpc/provider`. Le client navigateur est `createRpcClient` de
> `@c9up/aurora/rpc`.
