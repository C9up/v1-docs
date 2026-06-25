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
