# comet

`@c9up/comet`: the JSON-RPC 2.0 protocol (envelopes, parsing, error codes) and a client that runs in the browser and in Node over a transport you inject. Guide: [JSON-RPC clients](/en/guides/apis/json-rpc-clients).

## Installation

```bash
pnpm add @c9up/comet
```

No dependencies and no peer dependencies. The WebSocket transport uses the platform `WebSocket` (browser, Node 24 and later) unless you pass `createSocket`.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/comet` | Everything below. |
| `@c9up/comet/protocol` | Envelope types, builders, `parseRequest`, `RpcError`, `RpcRemoteError`, `RpcErrorCode`. |
| `@c9up/comet/client` | `createRpcClient` and its types. |
| `@c9up/comet/websocket` | `createWebSocketTransport`, `RpcTransportError` and their types. |

## Exports

### `@c9up/comet/client`

| Export | Kind | Description |
|---|---|---|
| `createRpcClient` | function | `createRpcClient(options: RpcClientOptions): RpcClient`. |
| `RpcClient` | interface | `call`, `notify`, `batch`. |
| `RpcClientOptions` | interface | `{ transport: RpcTransport; url?: string }`. `url` defaults to `/rpc`. |
| `RpcTransport` | type | `(url: string, body: unknown, options: { signal?: AbortSignal }) => Promise<unknown>`. Sends the JSON body as `application/json` and resolves the parsed reply, or nothing for an empty one (a 204). |
| `RpcCallOptions` | interface | `{ parse?: (data: unknown) => T; signal?: AbortSignal }`. |
| `RpcParsedCallOptions` | type | `RpcCallOptions<T>` with `parse` required. |
| `RpcCall` | interface | One call of a batch: `{ method: string; params?: unknown; parse?: (data: unknown) => T; notify?: boolean }`. |
| `RpcResult` | type | `{ ok: true; value: T } \| { ok: false; error: RpcError }`. |

### `RpcClient`

| Member | Signature | Description |
|---|---|---|
| `call` | `call<T>(method: string, params: unknown, options: RpcParsedCallOptions<T>): Promise<T>` | The result, validated and typed by `parse`. |
| `call` | `call(method: string, params?: unknown, options?: RpcCallOptions): Promise<unknown>` | Without `parse`, the result is `unknown`. Throws `RpcRemoteError` on a JSON-RPC error. |
| `notify` | `notify(method: string, params?: unknown, options?: { signal?: AbortSignal }): Promise<void>` | A notification: no id, no answer. Rejects when the transport does, or when the server refused the envelope. |
| `batch` | `batch(calls: RpcCall[], options?: { signal?: AbortSignal }): Promise<RpcResult[]>` | One settled entry per call, in request order. A notification's entry is `{ ok: true, value: undefined }`. The signal aborts the whole batch. |

### `@c9up/comet/protocol`

| Export | Kind | Description |
|---|---|---|
| `parseRequest` | function | `parseRequest(request: unknown): ParsedRpcRequest`: validates an incoming envelope (version, method, an id that is a string, number or null, `params` an array or an object). |
| `isNotification` | function | `isNotification(request: unknown): boolean`: the envelope has no `id`. |
| `isReservedMethodName` | function | `isReservedMethodName(name: string): boolean`: the name starts with `rpc.`, which the protocol reserves. |
| `buildRequest` | function | `buildRequest(method: string, params: unknown, id: JsonRpcId): JsonRpcRequest`. An absent `params` is left out. |
| `buildNotification` | function | `buildNotification(method: string, params: unknown): JsonRpcNotification`. |
| `buildSuccess` | function | `buildSuccess(result: unknown, id: JsonRpcId): JsonRpcSuccessResponse`. |
| `buildError` | function | `buildError(code: number, message: string, id: JsonRpcId, data?: unknown): JsonRpcErrorResponse`. An absent `data` is left out. |
| `RpcError` | class | A JSON-RPC error. Throw it from a handler to answer the caller with its code and message. |
| `RpcRemoteError` | class | Extends `RpcError`: every error the client raises, the server's answer or a reply it could not accept. |
| `RpcErrorCode` | const | `ParseError: -32700`, `InvalidRequest: -32600`, `MethodNotFound: -32601`, `InvalidParams: -32602`, `InternalError: -32603`. |
| `toRpcError` | function | `toRpcError(error: unknown): RpcError`: reads an `error` member off the wire; a malformed one becomes an internal error. |
| `isRpcError` | function | `isRpcError(value: unknown): value is RpcError`. |
| `isRpcShapedError` | function | `isRpcShapedError(err: unknown): err is { code: number; message?: unknown; data?: unknown }`: a thrown value a server may answer the caller with. |
| `isObject` | function | `isObject(value: unknown): value is Record<string, unknown>`: non-null and not an array. |
| `JsonRpcId` | type | `string \| number \| null`. |
| `JsonRpcRequest` | interface | `{ jsonrpc: '2.0'; method: string; params?: unknown; id: JsonRpcId }`. |
| `JsonRpcNotification` | interface | `{ jsonrpc: '2.0'; method: string; params?: unknown }`. |
| `JsonRpcSuccessResponse` | interface | `{ jsonrpc: '2.0'; result: unknown; id: JsonRpcId }`. |
| `JsonRpcErrorResponse` | interface | `{ jsonrpc: '2.0'; error: JsonRpcErrorObject; id: JsonRpcId }`. |
| `JsonRpcErrorObject` | interface | `{ code: number; message: string; data?: unknown }`. |
| `JsonRpcResponse` | type | `JsonRpcSuccessResponse \| JsonRpcErrorResponse`. |
| `ParsedRpcRequest` | type | `{ ok: true; method: string; params: unknown; id: JsonRpcId; notification: boolean } \| { ok: false; response: JsonRpcErrorResponse }`. |

### `RpcError`

| Member | Signature | Description |
|---|---|---|
| constructor | `new RpcError(code: number, message: string, data?: unknown, options?: ErrorOptions)` | `code` is an integer. |
| `code` | `readonly code: number` | |
| `data` | `readonly data?: unknown` | |

`isRpcShapedError` accepts an `RpcError` and a plain object whose `code` is a negative integer. It refuses an `RpcRemoteError`, so an error from another JSON-RPC server is not forwarded to your caller by accident; to forward one, throw `new RpcError(e.code, e.message)`.

### `@c9up/comet/websocket`

| Export | Kind | Description |
|---|---|---|
| `createWebSocketTransport` | function | `createWebSocketTransport(options?: WebSocketTransportOptions): RpcWebSocketTransport`. |
| `RpcWebSocketTransport` | type | `RpcTransport & { close(): void }`. `close()` closes every socket and fails what still waits with `E_COMET_TRANSPORT_CLOSED`. |
| `WebSocketTransportOptions` | interface | See below. |
| `RpcSocket` | interface | What the transport needs of a socket: `readyState`, `bufferedAmount`, `send`, `close`, `addEventListener` for `open`, `message`, `close`. The standard `WebSocket` fits. |
| `RpcTransportError` | error | A failure of the transport, not an answer from the server: `readonly code: RpcTransportErrorCode`. |
| `RpcTransportErrorCode` | type | The `E_COMET_*` codes below. |

The transport opens one socket per URL, on the first call, and matches answers to callers by its own ids.

| `WebSocketTransportOptions` | Type | Default | Description |
|---|---|---|---|
| `createSocket` | `(url: string) => RpcSocket` | the platform `WebSocket` | Opens a socket; replace it to pass headers in Node. |
| `protocols` | `string \| string[]` | none | Subprotocols offered by the default `createSocket`. |
| `timeout` | `number` | `30000` | Milliseconds a call waits for its answer, connecting included. `Infinity` waits while the socket is open. |
| `maxMessageBytes` | `number` | `1048576` (1 MiB) | Largest message sent or accepted, in UTF-8 bytes. |
| `maxBufferedBytes` | `number` | `4194304` (4 MiB) | Unsent bytes allowed before a send is refused. |
| `reconnect` | `boolean` | `true` | Open a new socket on the next call after one closed. |

## Errors

| Code | Raised when |
|---|---|
| [`E_COMET_CONNECTION_FAILED`](/en/reference/errors#e-comet-connection-failed) | The socket could not be opened: refused handshake, bad URL or network. |
| [`E_COMET_CONNECTION_CLOSED`](/en/reference/errors#e-comet-connection-closed) | The socket closed while the call waited, or stays closed (`reconnect: false`). |
| [`E_COMET_TRANSPORT_CLOSED`](/en/reference/errors#e-comet-transport-closed) | `close()` was called on the transport. |
| [`E_COMET_TIMEOUT`](/en/reference/errors#e-comet-timeout) | No answer within the timeout. |
| [`E_COMET_MESSAGE_TOO_LARGE`](/en/reference/errors#e-comet-message-too-large) | A message over `maxMessageBytes`, sent or received. |
| [`E_COMET_BACKPRESSURE`](/en/reference/errors#e-comet-backpressure) | More than `maxBufferedBytes` already wait to be sent. |
| [`E_COMET_PROTOCOL_ERROR`](/en/reference/errors#e-comet-protocol-error) | The peer sent what no JSON-RPC server answers; the socket was closed. |
| [`E_COMET_INVALID_MESSAGE`](/en/reference/errors#e-comet-invalid-message) | The client handed over something that is not a JSON-RPC message, or not JSON. |

A JSON-RPC error the server answered is an `RpcRemoteError` carrying the server's numeric code.

## See also

- [JSON-RPC clients](/en/guides/apis/json-rpc-clients)
- [JSON-RPC](/en/guides/apis/json-rpc)
- [aurora](/en/reference/aurora): `createRpcClient` from `@c9up/aurora/rpc` wires comet to aurora's HTTP client.
