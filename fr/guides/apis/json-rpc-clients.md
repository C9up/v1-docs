# Clients JSON-RPC

Ce guide couvre l’appel de méthodes JSON-RPC depuis un client :

- Installation
- Client
- Protocole
- Pourquoi un package séparé
- Client JSON-RPC — `createRpcClient`

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

Dans une app Ream vous l'installez rarement directement — vous obtenez le client via
`@c9up/aurora` (navigateur) et le serveur via `@c9up/ream`. Utilisez `comet`
directement quand vous avez besoin d'un client JSON-RPC **hors** navigateur/aurora
(un service Node appelant l'API JSON-RPC d'un autre service).

## Client

Le client possède la logique JSON-RPC — construction de l'enveloppe, `id`
auto-incrémenté, appel simple vs batch, ré-appariement des réponses de batch par
id, mapping des erreurs vers `RpcError` — et délègue les octets à un **transport
injecté**. C'est cette couture qui le rend isomorphe : passez un transport
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
plus). Côté serveur, c'est une [route WebSocket](/fr/guides/realtime/websockets) de ream.

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
fournissez vous-même le socket au transport :

```ts
createWebSocketTransport({
  createSocket: (url) => new WebSocket(url, { headers: { authorization: `Bearer ${token}` } }),
});
```

Dans le navigateur, un socket emporte les cookies de la page : une route gardée
par session marche comme en HTTP. Ream n'accepte une poignée de main que depuis
l'origine de la page, sauf si l'app en autorise d'autres : c'est ce qui empêche
un autre site d'ouvrir un socket avec ces cookies.

### Côté navigateur — utilisez aurora

Dans une page Ream, préférez le `createRpcClient` d'aurora : il branche le
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

## Client JSON-RPC — `createRpcClient`

Un client JSON-RPC 2.0 typé pour le endpoint RPC de Ream (le `RpcProvider` de
`@c9up/ream` monte `POST /rpc`). Il s'appuie sur `HttpClient` et hérite donc de
son URL de base, ses en-têtes d'auth et ses timeouts.

> Sous le capot, c'est un binding fin au-dessus du client agnostique
> [`@c9up/comet`](/fr/guides/apis/json-rpc-clients) — aurora branche `HttpClient` comme transport
> de comet et re-exporte sa surface (`RpcError`, `isRpcError`, les types). Comme le
> RPC est opt-in, il vit sur le sous-chemin **`@c9up/aurora/rpc`** (pas le barrel
> principal) et `@c9up/comet` est une **dépendance peer optionnelle** — installez-la
> seulement si vous utilisez le RPC ; les projets qui ne l'utilisent pas ne la tirent
> jamais.
>
> Aucun câblage navigateur : quand comet est installé, `AuroraProvider` sert
> automatiquement son runtime sur `<assetsPrefix>/comet/*` et `render()` ajoute
> `@c9up/comet` à l'importmap — le `import '@c9up/comet'` du client RPC se résout
> donc dans le navigateur no-bundler sans aucun importmap ni mount côté app. (Pour
> servir un autre package pareil, `@c9up/aurora/server` exporte
> `packageAssetDir(specifier)`, basé sur `import.meta.resolve` — correct pour les
> packages ESM-only où `require.resolve` plante.)

```ts
import { createRpcClient } from '@c9up/aurora/rpc'

const rpc = createRpcClient()                  // POST /rpc, même origine
// ou : createRpcClient({ url: '/api/rpc', http: httpClientExistant })

// Appel simple — lève RpcError sur une erreur JSON-RPC. Le résultat est
// `unknown`, sauf si un validateur `parse` le vérifie et lui donne son type.
const result = await rpc.call('task.validate', { id: 7 }, {
  parse: (data) => {
    if (typeof data !== 'object' || data === null || !('valid' in data)) {
      throw new TypeError('not a validation result')
    }
    return { valid: data.valid === true }
  },
})

// Notification — sans id, aucune réponse attendue.
await rpc.notify('audit.log', { event: 'login' })
```

### CSRF — `X-XSRF-TOKEN` automatique

Un point d'entrée authentifié par cookie/session est protégé par le double-submit
signé : le serveur compare le cookie `XSRF-TOKEN` à un en-tête `X-XSRF-TOKEN`. Le
cookie part tout seul ; l'en-tête est ce qui atteste que la requête vient de votre
propre page, puisqu'un appelant tiers peut faire partir le cookie mais ne peut
pas le lire.

**C'est `HttpClient` qui le pose, donc tout ce qui est bâti dessus en hérite** —
`form()`, `command()`, `createRpcClient()` et les poignées de main du relais. À
chaque requête vers votre propre origine, il lit le cookie et le renvoie. C'est un
no-op hors navigateur, quand le cookie est absent (une API authentifiée par
Bearer est immunisée au CSRF et n'en pose aucun) et — délibérément — quand la
cible est une autre origine : le jeton authentifie votre session, et un client dont
le `baseURL` pointe une API tierce le lui livrerait.

```ts
new HttpClient()                     // activé par défaut
new HttpClient({ xsrf: false })      // désactiver pour le client
http.post('/a', body, { xsrf: false })  // …ou pour une requête
// renommer (valeurs par défaut affichées) :
new HttpClient({ xsrfCookieName: 'XSRF-TOKEN', xsrfHeaderName: 'X-XSRF-TOKEN' })
createRpcClient({ xsrf: false })     // mêmes interrupteurs, transmis à son client
```

> **« Une autre origine » est tranché par le parseur d'URL, pas par un motif.**
> L'ancienne vérification demandait si l'URL commençait par un schéma — ce qu'une
> URL protocol-relative ne fait pas. Donc `//evil.example/x` passait pour
> relative et le client lui envoyait le token, le Bearer par défaut et tout
> en-tête `Authorization` par défaut. `\\evil.example/x`, `/\evil.example/x` et
> `\/evil.example/x` faisaient pareil, un navigateur traitant un antislash en
> position d'autorité comme un slash. L'URL est désormais résolue et son origine
> comparée ; une URL irrésoluble compte comme étrangère.


Un en-tête que vous posez vous-même l'emporte toujours. La valeur du cookie est
renvoyée **telle quelle**, jamais décodée : le serveur la lit brute dans l'en-tête
`Cookie` et compare octet par octet — décoder enverrait un jeton qu'il n'a jamais
stocké.

Le 3ᵉ argument est un objet d'**options** par appel. Passez `parse` pour valider le
résultat au runtime au lieu de l'assertion `T` non vérifiée (même principe que le
`parse` de `HttpClient`), et `signal` pour rendre l'appel annulable :

```ts
const user = await rpc.call('user.find', { id }, {
  parse: (data) => {
    if (!isUser(data)) throw new Error('forme invalide')
    return data
  },
})

const ac = new AbortController()
await rpc.call('slow.op', params, { signal: ac.signal })   // ac.abort() annule
```

Les erreurs remontent en `RpcError` (porte `code`, `message`, `data`) :

```ts
import { isRpcError } from '@c9up/aurora/rpc'

try {
  await rpc.call('task.validate', { id })
} catch (err) {
  if (isRpcError(err)) console.error(err.code, err.message, err.data)
}
```

Envoyez plusieurs appels en un aller-retour avec `batch()` — il renvoie une
entrée résolue par appel, dans l'ordre des requêtes (les réponses sont réappariées
par id) :

```ts
const [a, b] = await rpc.batch([
  { method: 'task.validate', params: { id: 1 } },
  { method: 'user.find', params: { id: 2 } },
])
if (a.ok) console.log(a.value)
if (!b.ok) console.error(b.error.message)
```

Se marie naturellement avec [`command`](/fr/guides/frontend/aurora/forms#actions-async-—-command) pour des appels
réactifs :

```ts
const validate = command((p) => rpc.call('task.validate', p))
```
