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
unaffected. When a `parse` threw, what it threw is on `error.data`.

### In the browser — use aurora

In a Ream page, prefer aurora's `createRpcClient`: it wires aurora's `HttpClient`
(base URL, auth headers, timeouts) as the transport and pairs with `command()`.
It re-exports comet's surface, so `RpcError` / `isRpcError` / the types come from
`@c9up/aurora` unchanged.

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

This mirrors the model of `@c9up/quasar` (binary/protobuf wire): an agnostic core
with thin, opt-in integration seams.
