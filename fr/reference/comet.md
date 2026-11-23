# comet

`@c9up/comet` : le protocole JSON-RPC 2.0 (enveloppes, analyse, codes d'erreur) et un client qui tourne dans le navigateur comme dans Node, sur un transport que vous injectez. Guide : [Clients JSON-RPC](/fr/guides/apis/json-rpc-clients).

## Installation

```bash
pnpm add @c9up/comet
```

Aucune dépendance ni dépendance pair. Le transport WebSocket utilise le `WebSocket` de la plateforme (navigateur, Node 24 et suivants), sauf si vous passez `createSocket`.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/comet` | Tout ce qui suit, et le namespace `errors`. |
| `@c9up/comet/protocol` | Types d'enveloppe, constructeurs, `parseRequest`, `RpcError`, `RpcRemoteError`, `RpcErrorCode`. |
| `@c9up/comet/client` | `createRpcClient` et ses types. |
| `@c9up/comet/websocket` | `createWebSocketTransport` et ses types. |

## Exports

### `@c9up/comet`

| Export | Nature | Description |
|---|---|---|
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs). Chacune est une `Exception` de flare au `code` textuel. |

### `@c9up/comet/client`

| Export | Nature | Description |
|---|---|---|
| `createRpcClient` | fonction | `createRpcClient(options: RpcClientOptions): RpcClient`. |
| `RpcClient` | interface | `call`, `notify`, `batch`. |
| `RpcClientOptions` | interface | `{ transport: RpcTransport; url?: string }`. `url` vaut `/rpc` par défaut. |
| `RpcTransport` | type | `(url: string, body: unknown, options: { signal?: AbortSignal }) => Promise<unknown>`. Envoie le corps JSON en `application/json` et résout la réponse analysée, ou rien pour une réponse vide (un 204). |
| `RpcCallOptions` | interface | `{ parse?: (data: unknown) => T; signal?: AbortSignal }`. |
| `RpcParsedCallOptions` | type | `RpcCallOptions<T>` avec `parse` obligatoire. |
| `RpcCall` | interface | Un appel d'un lot : `{ method: string; params?: unknown; parse?: (data: unknown) => T; notify?: boolean }`. |
| `RpcResult` | type | `{ ok: true; value: T } \| { ok: false; error: RpcError }`. |

### `RpcClient`

| Membre | Signature | Description |
|---|---|---|
| `call` | `call<T>(method: string, params: unknown, options: RpcParsedCallOptions<T>): Promise<T>` | Le résultat, validé et typé par `parse`. |
| `call` | `call(method: string, params?: unknown, options?: RpcCallOptions): Promise<unknown>` | Sans `parse`, le résultat est `unknown`. Lève une `RpcRemoteError` sur une erreur JSON-RPC. |
| `notify` | `notify(method: string, params?: unknown, options?: { signal?: AbortSignal }): Promise<void>` | Une notification : pas d'id, pas de réponse. Rejette quand le transport rejette, ou quand le serveur a refusé l'enveloppe. |
| `batch` | `batch(calls: RpcCall[], options?: { signal?: AbortSignal }): Promise<RpcResult[]>` | Une entrée réglée par appel, dans l'ordre de la requête. L'entrée d'une notification est `{ ok: true, value: undefined }`. Le signal annule tout le lot. |

### `@c9up/comet/protocol`

| Export | Nature | Description |
|---|---|---|
| `parseRequest` | fonction | `parseRequest(request: unknown): ParsedRpcRequest` : valide une enveloppe entrante (version, méthode, un id chaîne, nombre ou null, `params` tableau ou objet). |
| `isNotification` | fonction | `isNotification(request: unknown): boolean` : l'enveloppe n'a pas d'`id`. |
| `isReservedMethodName` | fonction | `isReservedMethodName(name: string): boolean` : le nom commence par `rpc.`, que le protocole réserve. |
| `buildRequest` | fonction | `buildRequest(method: string, params: unknown, id: JsonRpcId): JsonRpcRequest`. Un `params` absent est omis. |
| `buildNotification` | fonction | `buildNotification(method: string, params: unknown): JsonRpcNotification`. |
| `buildSuccess` | fonction | `buildSuccess(result: unknown, id: JsonRpcId): JsonRpcSuccessResponse`. |
| `buildError` | fonction | `buildError(code: number, message: string, id: JsonRpcId, data?: unknown): JsonRpcErrorResponse`. Un `data` absent est omis. |
| `RpcError` | classe | Une erreur JSON-RPC. Levez-la dans un handler pour répondre à l'appelant avec son code et son message. |
| `RpcRemoteError` | classe | Étend `RpcError` : toute erreur que lève le client, réponse du serveur ou réponse qu'il n'a pas pu accepter. |
| `RpcErrorCode` | const | `ParseError: -32700`, `InvalidRequest: -32600`, `MethodNotFound: -32601`, `InvalidParams: -32602`, `InternalError: -32603`. |
| `toRpcError` | fonction | `toRpcError(error: unknown): RpcError` : lit un membre `error` reçu ; un membre malformé devient une erreur interne. |
| `isRpcError` | fonction | `isRpcError(value: unknown): value is RpcError`. |
| `isRpcShapedError` | fonction | `isRpcShapedError(err: unknown): err is { code: number; message?: unknown; data?: unknown }` : une valeur levée par laquelle un serveur peut répondre à l'appelant. |
| `isObject` | fonction | `isObject(value: unknown): value is Record<string, unknown>` : non nul et pas un tableau. |
| `JsonRpcId` | type | `string \| number \| null`. |
| `JsonRpcRequest` | interface | `{ jsonrpc: '2.0'; method: string; params?: unknown; id: JsonRpcId }`. |
| `JsonRpcNotification` | interface | `{ jsonrpc: '2.0'; method: string; params?: unknown }`. |
| `JsonRpcSuccessResponse` | interface | `{ jsonrpc: '2.0'; result: unknown; id: JsonRpcId }`. |
| `JsonRpcErrorResponse` | interface | `{ jsonrpc: '2.0'; error: JsonRpcErrorObject; id: JsonRpcId }`. |
| `JsonRpcErrorObject` | interface | `{ code: number; message: string; data?: unknown }`. |
| `JsonRpcResponse` | type | `JsonRpcSuccessResponse \| JsonRpcErrorResponse`. |
| `ParsedRpcRequest` | type | `{ ok: true; method: string; params: unknown; id: JsonRpcId; notification: boolean } \| { ok: false; response: JsonRpcErrorResponse }`. |

### `RpcError`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new RpcError(code: number, message: string, data?: unknown, options?: ErrorOptions)` | `code` est un entier. |
| `code` | `readonly code: number` | |
| `data` | `readonly data?: unknown` | |

`isRpcShapedError` accepte une `RpcError` et un objet simple dont le `code` est un entier négatif. Il refuse une `RpcRemoteError` : une erreur d'un autre serveur JSON-RPC n'est pas transmise à votre appelant par mégarde. Pour la transmettre, levez `new RpcError(e.code, e.message)`.

### `@c9up/comet/websocket`

| Export | Nature | Description |
|---|---|---|
| `createWebSocketTransport` | fonction | `createWebSocketTransport(options?: WebSocketTransportOptions): RpcWebSocketTransport`. |
| `RpcWebSocketTransport` | type | `RpcTransport & { close(): void }`. `close()` ferme toutes les sockets et fait échouer ce qui attend encore avec `E_COMET_TRANSPORT_CLOSED`. |
| `WebSocketTransportOptions` | interface | Voir ci-dessous. |
| `RpcSocket` | interface | Ce dont le transport a besoin d'une socket : `readyState`, `bufferedAmount`, `send`, `close`, `addEventListener` pour `open`, `message`, `close`. Le `WebSocket` standard convient. |
| `RpcTransportErrorCode` | type | Les codes `E_COMET_*` d'un échec du transport, ci-dessous. |

Le transport ouvre une socket par URL, au premier appel, et rattache les réponses aux appelants par ses propres ids.

| `WebSocketTransportOptions` | Type | Défaut | Description |
|---|---|---|---|
| `createSocket` | `(url: string) => RpcSocket` | le `WebSocket` de la plateforme | Ouvre une socket ; remplacez-la pour passer des en-têtes dans Node. |
| `protocols` | `string \| string[]` | aucun | Sous-protocoles proposés par le `createSocket` par défaut. |
| `timeout` | `number` | `30000` | Millisecondes qu'un appel attend sa réponse, connexion comprise. `Infinity` attend tant que la socket est ouverte. |
| `maxMessageBytes` | `number` | `1048576` (1 Mio) | Plus grand message envoyé ou accepté, en octets UTF-8. |
| `maxBufferedBytes` | `number` | `4194304` (4 Mio) | Octets non envoyés admis avant qu'un envoi soit refusé. |
| `reconnect` | `boolean` | `true` | Ouvrir une nouvelle socket à l'appel suivant après une fermeture. |

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_COMET_CONNECTION_FAILED`](/fr/reference/errors#e-comet-connection-failed) | La socket n'a pas pu s'ouvrir : poignée de main refusée, URL invalide ou réseau. |
| [`E_COMET_CONNECTION_CLOSED`](/fr/reference/errors#e-comet-connection-closed) | La socket s'est fermée pendant l'attente de l'appel, ou reste fermée (`reconnect: false`). |
| [`E_COMET_TRANSPORT_CLOSED`](/fr/reference/errors#e-comet-transport-closed) | `close()` a été appelé sur le transport. |
| [`E_COMET_TIMEOUT`](/fr/reference/errors#e-comet-timeout) | Aucune réponse dans le délai. |
| [`E_COMET_MESSAGE_TOO_LARGE`](/fr/reference/errors#e-comet-message-too-large) | Un message au-delà de `maxMessageBytes`, envoyé ou reçu. |
| [`E_COMET_BACKPRESSURE`](/fr/reference/errors#e-comet-backpressure) | Plus de `maxBufferedBytes` attendent déjà d'être envoyés. |
| [`E_COMET_PROTOCOL_ERROR`](/fr/reference/errors#e-comet-protocol-error) | Le pair a envoyé ce à quoi aucun serveur JSON-RPC ne répond ; la socket a été fermée. |
| [`E_COMET_INVALID_MESSAGE`](/fr/reference/errors#e-comet-invalid-message) | Le client a reçu de l'appelant autre chose qu'un message JSON-RPC, ou autre chose que du JSON. |
| [`E_COMET_INVALID_OPTION`](/fr/reference/errors#e-comet-invalid-option) | `createWebSocketTransport()` a reçu un `timeout`, un `maxMessageBytes` ou un `maxBufferedBytes` qui n'est pas un nombre positif, ou un `timeout` au-delà de ce qu'un minuteur peut attendre. |

Un échec du transport est une instance de `errors.E_COMET_*`, pas une réponse du serveur. Une erreur JSON-RPC renvoyée par le serveur est une `RpcRemoteError` qui porte le code numérique du serveur.

## Migration

- `RpcTransportError` disparaît : chaque code a sa propre classe. Remplacez `error instanceof RpcTransportError` par un test sur `error.code` (`error.code === 'E_COMET_TIMEOUT'`) ou par `error instanceof errors.E_COMET_TIMEOUT`, `errors` venant de `@c9up/comet`.
- Une option invalide de `createWebSocketTransport()` lève `errors.E_COMET_INVALID_OPTION`, plus une `RangeError` : interceptez-la par son code.

## Voir aussi

- [Clients JSON-RPC](/fr/guides/apis/json-rpc-clients)
- [JSON-RPC](/fr/guides/apis/json-rpc)
- [aurora](/fr/reference/aurora) : `createRpcClient` de `@c9up/aurora/rpc` branche comet sur le client HTTP d'aurora.
