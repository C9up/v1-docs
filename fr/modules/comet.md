# Comet — JSON-RPC 2.0

`@c9up/comet` est la couche JSON-RPC 2.0 **agnostique** de l'univers Ream : les
primitives du protocole (enveloppe, codes d'erreur réservés, parseur, règle de
notification) plus un **client isomorphe à transport injectable**. Zéro
framework, zéro transport, zéro dépendance.

Il existe pour que le JSON-RPC ne soit pas soudé à des packages qui n'en ont pas
besoin. Le binding navigateur (`@c9up/aurora`) et le binding serveur (le
`RpcRouter` de `@c9up/ream`) s'appuient tous deux sur ce cœur unique au lieu de
hand-roller chacun l'enveloppe et les codes `-32xxx`.

## Installation

```bash
pnpm add @c9up/comet
```

Dans une app Ream tu l'installes rarement directement — tu obtiens le client via
`@c9up/aurora` (navigateur) et le serveur via `@c9up/ream`. Utilise `comet`
directement quand tu as besoin d'un client JSON-RPC **hors** navigateur/aurora
(un service Node appelant l'API JSON-RPC d'un autre service).

## Client

Le client possède la logique JSON-RPC — construction de l'enveloppe, `id`
auto-incrémenté, appel simple vs batch, ré-appariement des réponses de batch par
id, mapping des erreurs vers `RpcError` — et délègue les octets à un **transport
injecté**. C'est cette couture qui le rend isomorphe : passe un transport
navigateur ou Node.

```ts
import { createRpcClient } from "@c9up/comet";

const rpc = createRpcClient({
  url: "/rpc",
  transport: (url, body, { signal }) =>
    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    }).then((r) => r.json()),
});

const out = await rpc.call("task.validate", { id: 7 });            // typé via call<T>()
const user = await rpc.call("user.find", { id }, { parse: isUser }); // validé au runtime
await rpc.call("slow.op", params, { signal: ac.signal });          // annulable
```

Le 3ᵉ argument de `call` est un objet d'options par appel — `parse` (validation
runtime, l'échappatoire cast-free face à l'assertion `T` non vérifiée) et `signal`
(annulation).

### Batch

`batch()` envoie plusieurs appels en un aller-retour et renvoie **une entrée
résolue par appel**, dans l'ordre de la requête (les réponses sont ré-appariées
par id même si le serveur les réordonne) :

```ts
const [a, b] = await rpc.batch([
  { method: "task.validate", params: { id: 1 } },
  { method: "user.find", params: { id: 2 } },
]);
if (a.ok) console.log(a.value);
if (!b.ok) console.error(b.error.message);
```

Chaque entrée se résout pour elle-même. Une erreur JSON-RPC, une réponse absente
ou dupliquée, **et un `parse` qui refuse le résultat** reviennent en
`{ ok: false, error }` pour ce seul appel — les autres de l'aller-retour ne sont
pas touchés. Quand c'est un `parse` qui a levé, ce qu'il a levé est sur
`error.cause` (pas sur `error.data`, qui est ce qu'un serveur écrit sur le fil).

### Sur un WebSocket

`createWebSocketTransport()` (depuis `@c9up/comet` ou `@c9up/comet/websocket`)
est un transport qui garde **un socket par URL d'endpoint** et y envoie chaque
requête, notification et batch du client. Il s'appuie sur le `WebSocket` de la
plateforme : celui du navigateur, ou celui que Node fournit en global (Node 24 et
plus).

```ts
import { createRpcClient, createWebSocketTransport } from "@c9up/comet";

const socket = createWebSocketTransport();
const rpc = createRpcClient({ url: "wss://app.example/rpc", transport: socket });

await rpc.call("task.validate", { id: 7 });
await rpc.notify("audit.log", { event: "login" });
socket.close(); // ferme tous les sockets qu'il a ouverts
```

Le socket s'ouvre au premier appel et sert à tous les suivants. Ce qui change par
rapport à HTTP :

- **Les réponses sont appariées par id.** Elles arrivent toutes sur le même
  socket : le transport met son propre id sur chaque requête et rend celui de
  l'appelant sur la réponse. Deux clients qui partagent un transport ne se
  marchent jamais dessus.
- **Rien n'attend indéfiniment.** Chaque appel a un délai, connexion comprise
  (`timeout`, 30 s par défaut). Un socket qui se ferme fait échouer tous les
  appels qui l'attendaient, et l'appel suivant en ouvre un nouveau
  (`reconnect: false` le laisse fermé).
- **Un pair qui enfreint le protocole perd le socket.** Une trame binaire, un
  texte qui n'est pas du JSON, un message au-delà de `maxMessageBytes` (1 Mio par
  défaut), ou une réponse d'une forme qu'aucune requête n'a demandée ferme le
  socket et fait échouer ce qui l'attendait. Une réponse arrivée après
  l'expiration de son appel est ignorée.
- **Les tailles sont bornées.** Un message au-delà de `maxMessageBytes` est
  refusé avant l'envoi ; un envoi est refusé tant que plus de `maxBufferedBytes`
  (4 Mio) attendent dans le tampon du socket.
- **Une erreur à id nul** ne désigne aucune requête. Elle n'est la réponse d'une
  requête que si celle-ci est la seule en attente, sans notification envoyée
  dans le délai qui précède. Sinon, chaque appel en attente la garde, et celui
  qu'elle concernait la rapporte à son expiration.

Un échec du transport lui-même est une `RpcTransportError` dont le `code` est une
chaîne :

| Code | Signification |
|---|---|
| `E_COMET_CONNECTION_FAILED` | Le socket n'a pas pu s'ouvrir : URL invalide, réseau, ou poignée de main refusée par le serveur (une garde d'auth qui répond 401). |
| `E_COMET_CONNECTION_CLOSED` | Le socket s'est fermé pendant l'attente (le code de fermeture est dans le message), ou reste fermé avec `reconnect: false`. |
| `E_COMET_TRANSPORT_CLOSED` | `close()` a été appelé. |
| `E_COMET_TIMEOUT` | Pas de réponse dans le délai `timeout`. |
| `E_COMET_MESSAGE_TOO_LARGE` | Un message au-delà de `maxMessageBytes`, envoyé ou reçu. |
| `E_COMET_BACKPRESSURE` | Plus de `maxBufferedBytes` attendent déjà l'envoi. |
| `E_COMET_PROTOCOL_ERROR` | Le pair a envoyé ce qu'aucun serveur JSON-RPC ne répond ; le socket a été fermé. |
| `E_COMET_INVALID_MESSAGE` | Le message n'est pas du JSON-RPC, ou ne s'écrit pas en JSON (un `BigInt`). |

Un `signal` interrompu rejette l'appel avec la raison du signal, comme `fetch`.

Le constructeur standard de `WebSocket` ne prend qu'une URL et des
sous-protocoles. Pour passer autre chose — les `headers` de Node, un proxy —,
fournis toi-même le socket au transport :

```ts
createWebSocketTransport({
  createSocket: (url) => new WebSocket(url, { headers: { authorization: `Bearer ${token}` } }),
});
```

Dans le navigateur, un socket emporte les cookies de la page : une route gardée
par session marche comme en HTTP. Ream n'accepte une poignée de main que depuis
l'origine de la page, sauf si l'app en autorise d'autres : c'est ce qui empêche
un autre site d'ouvrir un socket avec ces cookies.

### Côté navigateur — utilise aurora

Dans une page Ream, préfère le `createRpcClient` d'aurora : il branche le
`HttpClient` d'aurora (base URL, en-têtes d'auth, timeouts) comme transport et
s'associe à `command()`. Il re-exporte la surface de comet, donc `RpcError` /
`isRpcError` / les types viennent de `@c9up/aurora` sans changement.

Il lit aussi le cookie `XSRF-TOKEN` et le renvoie dans l'en-tête `X-XSRF-TOKEN`
à chaque appel. Une page authentifiée par un cookie de session en a besoin : le
serveur compare cet en-tête au cookie, et un POST qui ne le porte pas est
refusé. Le client de comet envoie ce que son transport envoie : un transport
`fetch` écrit à la main devrait donc ajouter l'en-tête lui-même. Sans le cookie
— hors du navigateur, ou derrière un jeton bearer —, rien n'est ajouté.

```ts
import { createRpcClient, isRpcError } from "@c9up/aurora/rpc";

const rpc = createRpcClient(); // POST /rpc, same-origin, en-têtes d'auth depuis HttpClient
```

## Protocole

La surface `@c9up/comet/protocol` est ce qu'un **binding serveur** consomme :

| Export | Rôle |
|---|---|
| `parseRequest(value)` | Valide une enveloppe entrante → `{ ok, method, params, id }` ou une réponse d'erreur |
| `isNotification(value)` | Spec §4.1 — requête sans `id` (le serveur ne doit pas répondre) |
| `buildRequest / buildSuccess / buildError` | Constructeurs d'enveloppe |
| `RpcError`, `toRpcError`, `isRpcShapedError`, `isRpcError` | Type d'erreur + mappers/guards |
| `RpcErrorCode` | Les codes réservés `-327xx`/`-326xx` |

### Ce que le parseur refuse

`parseRequest` répond `InvalidRequest` — en renvoyant l'id quand l'enveloppe en
portait un utilisable — pour tout ce que la spec écrit comme un MUST :

- un `jsonrpc` qui n'est pas `"2.0"`, ou un `method` absent ou non-string ;
- un `id` présent mais qui n'est ni String, ni Number, ni Null (§4) — un booléen
  ou un objet est refusé, jamais ramené à null ;
- un `params` présent qui n'est pas une valeur structurée (§4.2) : par position
  via un Array, ou par nom via un Object. Une chaîne, un nombre ou `null` n'en
  sont pas.

`buildRequest` omet `params` quand il n'y en a pas, pour qu'un transport qui ne
passe pas par `JSON.stringify` — un worker, un bus en mémoire — ne transporte
pas un membre valant `undefined`.

### Erreurs métier

Un handler dit au binding « réponds ça à l'appelant » en levant une `RpcError`,
quel que soit son code :

```ts
throw new RpcError(-32004, "Task not found", { id });
```

`isRpcShapedError` reconnaît aussi un objet simple portant un `code` **entier
négatif**, pour que du code qui n'importe pas comet puisse lever une erreur
métier. Négatif parce que c'est l'espace que la spec donne aux erreurs (§5.1
réserve -32768..-32000) — et parce que les nombres que d'autres choses portent
ne sont pas des codes : une `DOMException` issue d'un `fetch` annulé ou expiré a
`code: 20` / `code: 23`, un statut gRPC vaut 0..16. Lues comme des erreurs
métier, elles répondaient à l'appelant avec leur propre message, en passant à
côté du garde de production qui garde les échecs internes hors du fil.

Le `RpcRouter` de ream est exactement ça : il garde son propre DSL de routage
(`method`/`group`/`namespace`/`guard`/`validate`) et son pipeline (DI, middleware,
auth warden), et délègue le travail enveloppe/parse/erreur à comet — pour que la
logique de la spec vive une seule fois.

## Pourquoi un package séparé

Le JSON-RPC n'est pas utile à tous les projets. Garder le protocole + client
agnostique et autonome veut dire :

- un projet qui n'utilise pas le RPC ne paie rien ;
- le client peut tourner en Node (sans dépendance UI) pour des appels
  server→server ;
- l'enveloppe et les codes d'erreur sont définis et testés **une seule fois**, pas
  dupliqués dans le client et le serveur.

Ça reflète le modèle de `@c9up/neutrino` (Protocol Buffers et gRPC) : un cœur agnostique
avec des coutures d'intégration fines et opt-in.
