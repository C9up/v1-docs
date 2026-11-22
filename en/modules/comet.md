# Comet — JSON-RPC 2.0

`@c9up/comet` is the **agnostic** JSON-RPC 2.0 layer of the Ream universe: the
protocol primitives (envelope, reserved error codes, parser, notification rule)
plus an **isomorphic, transport-injectable client**. Zero framework, zero
transport, zero dependency.

It exists so JSON-RPC isn't welded into packages that don't need it. The browser
binding (`@c9up/aurora`) and the server binding (`@c9up/ream`'s `RpcRouter`) both
build on this one core instead of each hand-rolling the envelope and the
`-32xxx` codes.

## Install

```bash
pnpm add @c9up/comet
```

In a Ream app you rarely install it directly — you get the client through
`@c9up/aurora` (browser) and the server through `@c9up/ream`. Reach for `comet`
directly when you need a JSON-RPC client **outside** the browser/aurora (a Node
service calling another service's JSON-RPC API).

## Client

The client owns the JSON-RPC logic — building the envelope, the auto-incrementing
`id`, single vs batch, matching batch responses back by id, mapping errors to
`RpcError` — and delegates the actual bytes to an **injected transport**. That
seam is what makes it isomorphic: pass a browser transport or a Node one.

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

const out = await rpc.call("task.validate", { id: 7 });            // typed via call<T>()
const user = await rpc.call("user.find", { id }, { parse: isUser }); // runtime-validated
await rpc.call("slow.op", params, { signal: ac.signal });          // abortable
```

The third argument to `call` is a per-call options object — `parse` (runtime
validation, the cast-free escape hatch over the unchecked `T`) and `signal`
(abort).

### Batch

`batch()` sends several calls in one round-trip and returns **one settled entry
per call**, in request order (responses are matched back by id even if the server
reorders them):

```ts
const [a, b] = await rpc.batch([
  { method: "task.validate", params: { id: 1 } },
  { method: "user.find", params: { id: 2 } },
]);
if (a.ok) console.log(a.value);
if (!b.ok) console.error(b.error.message);
```

Each entry settles on its own. A JSON-RPC error, a missing or duplicated
response, **and a `parse` that rejects the result** all come back as
`{ ok: false, error }` for that call only — the others in the round trip are
unaffected. When a `parse` threw, what it threw is on `error.cause` (not on
`error.data`, which is what a server writes on the wire).

### Over a WebSocket

`createWebSocketTransport()` (from `@c9up/comet` or `@c9up/comet/websocket`) is
a transport that keeps **one socket per endpoint URL** and sends every request,
notification and batch the client makes there over it. It runs on the platform
`WebSocket`: the browser's, or Node's global one (Node 24 and later). The
server side is a ream [WebSocket route](/en/guide/websockets).

```ts
import { createRpcClient, createWebSocketTransport } from "@c9up/comet";

const socket = createWebSocketTransport();
const rpc = createRpcClient({ url: "wss://app.example/rpc", transport: socket });

await rpc.call("task.validate", { id: 7 });
await rpc.notify("audit.log", { event: "login" });
socket.close(); // closes every socket it opened
```

The socket opens on the first call and is reused by every call after it. What
changes from HTTP:

- **Responses are matched by id.** All of them arrive on the same socket, so the
  transport puts its own id on each request and gives the caller's back on the
  answer. Two clients sharing one transport never collide.
- **Nothing waits forever.** Each call has a timeout, connecting included
  (`timeout`, 30 s by default). A socket that closes fails every call still
  waiting on it, and the next call opens a new one (`reconnect: false` keeps it
  closed instead).
- **A peer that breaks the protocol loses the socket.** A binary frame, text
  that is not JSON, a message over `maxMessageBytes` (1 MiB by default), or an
  answer in a shape nothing asked for closes the socket and fails what was
  waiting on it. An answer that comes after its call timed out is dropped.
- **Sizes are bounded.** A message over `maxMessageBytes` is refused before it
  is sent; a send is refused while more than `maxBufferedBytes` (4 MiB) wait in
  the socket's buffer.
- **An error with a null id** names no request. It is a request's answer only
  when that request is the one waiting, with no notification sent within the
  timeout before. Otherwise every call waiting keeps it, and the one it was for
  reports it when it times out.

A failure of the transport itself is an `RpcTransportError` with a string
`code`:

| Code | Meaning |
|---|---|
| `E_COMET_CONNECTION_FAILED` | The socket could not be opened: bad URL, network, or a handshake the server refused (an auth guard answering 401). |
| `E_COMET_CONNECTION_CLOSED` | The socket closed while the call waited (the close code is in the message), or stays closed with `reconnect: false`. |
| `E_COMET_TRANSPORT_CLOSED` | `close()` was called. |
| `E_COMET_TIMEOUT` | No answer within `timeout`. |
| `E_COMET_MESSAGE_TOO_LARGE` | A message over `maxMessageBytes`, sent or received. |
| `E_COMET_BACKPRESSURE` | More than `maxBufferedBytes` already wait to be sent. |
| `E_COMET_PROTOCOL_ERROR` | The peer sent what no JSON-RPC server answers; the socket was closed. |
| `E_COMET_INVALID_MESSAGE` | The message is not JSON-RPC, or cannot be written as JSON (a `BigInt`). |

An aborted `signal` rejects the call with the signal's reason, as `fetch` does.

The standard `WebSocket` constructor takes a URL and subprotocols only. To pass
anything else — Node's `headers`, a proxy — give the transport the socket
yourself:

```ts
createWebSocketTransport({
  createSocket: (url) => new WebSocket(url, { headers: { authorization: `Bearer ${token}` } }),
});
```

In the browser a socket carries the page's cookies, so a session-guarded route
works as it does over HTTP. Ream accepts a handshake only from the page's own
origin unless the app allows others, which is what stops another site from
opening a socket with those cookies.

### In the browser — use aurora

In a Ream page, prefer aurora's `createRpcClient`: it wires aurora's `HttpClient`
(base URL, auth headers, timeouts) as the transport and pairs with `command()`.
It re-exports comet's surface, so `RpcError` / `isRpcError` / the types come from
`@c9up/aurora` unchanged.

It also reads the `XSRF-TOKEN` cookie and echoes it as `X-XSRF-TOKEN` on every
call. A page authenticated by a session cookie needs that header: the server
checks it against the cookie, and a POST without it is refused. Comet's own
client sends what its transport sends, so a hand-written `fetch` transport would
have to add the header itself. Without the cookie — outside the browser, or
behind a bearer token — nothing is added.

```ts
import { createRpcClient, isRpcError } from "@c9up/aurora/rpc";

const rpc = createRpcClient(); // POST /rpc, same-origin, auth headers from HttpClient
```

## Protocol

The `@c9up/comet/protocol` surface is what a **server binding** consumes:

| Export | Purpose |
|---|---|
| `parseRequest(value)` | Validate an incoming envelope → `{ ok, method, params, id }` or an error response |
| `isNotification(value)` | Spec §4.1 — a request with no `id` (server must not reply) |
| `buildRequest / buildSuccess / buildError` | Envelope builders |
| `RpcError`, `toRpcError`, `isRpcShapedError`, `isRpcError` | Error type + mappers/guards |
| `RpcErrorCode` | The reserved `-327xx`/`-326xx` codes |

### What the parser refuses

`parseRequest` answers `InvalidRequest` — echoing the id when the envelope
carried a usable one — for anything the spec writes as a MUST:

- `jsonrpc` that is not `"2.0"`, or a missing/non-string `method`;
- an `id` that is present but is not a String, Number or Null (§4) — a boolean
  or an object is refused, never coerced to null;
- `params` that is present and is not a Structured value (§4.2): by-position
  through an Array, or by-name through an Object. A string, a number or a
  `null` is none of those.

`buildRequest` leaves `params` out when there is none, so a transport that does
not pass through `JSON.stringify` — a worker, an in-process bus — carries no
member holding `undefined`.

### Domain errors

A handler tells the binding "answer the caller with this" by throwing an
`RpcError`, whatever code it carries:

```ts
throw new RpcError(-32004, "Task not found", { id });
```

`isRpcShapedError` also recognises a plain object carrying a **negative integer**
`code`, so code that does not import comet can still raise a domain error.
Negative because that is the space the spec gives errors (§5.1 reserves
-32768..-32000) — and because the numbers other things carry are not codes: a
`DOMException` from an aborted or timed-out `fetch` has `code: 20` / `code: 23`,
a gRPC status is 0..16. Read as domain errors, those answered the caller with
their own message, past the production guard that keeps internal failures off
the wire.

Ream's `RpcRouter` is exactly this: it keeps its own routing DSL
(`method`/`group`/`namespace`/`guard`/`validate`) and pipeline (DI, middleware,
warden auth), and delegates the envelope/parse/error work to comet — so the spec
logic lives once.

## Why a separate package

JSON-RPC is not useful to every project. Keeping the protocol + client agnostic
and standalone means:

- a project that doesn't use RPC pays nothing;
- the client can run in Node (no UI dependency) for server→server calls;
- the envelope and error codes are defined and tested **once**, not duplicated in
  the client and the server.

This mirrors the model of `@c9up/neutrino` (Protocol Buffers and gRPC): an agnostic core
with thin, opt-in integration seams.
