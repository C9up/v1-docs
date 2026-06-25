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

### Côté navigateur — utilise aurora

Dans une page Ream, préfère le `createRpcClient` d'aurora : il branche le
`HttpClient` d'aurora (base URL, en-têtes d'auth, timeouts) comme transport et
s'associe à `command()`. Il re-exporte la surface de comet, donc `RpcError` /
`isRpcError` / les types viennent de `@c9up/aurora` sans changement.

```ts
import { createRpcClient, isRpcError } from "@c9up/aurora";

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

Ça reflète le modèle de `@c9up/quasar` (fil binaire/protobuf) : un cœur agnostique
avec des coutures d'intégration fines et opt-in.
