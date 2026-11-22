# API Layer — JSON-RPC, GraphQL, OpenAPI

Ream ships three alternative ways to expose your services alongside REST, plus a
serializer base for shaping responses. Each is wired by a **provider** and is
**opt-in** — add the provider to your app's providers list to enable it.

| Provider | Mounts | Purpose |
|---|---|---|
| `RpcProvider` | `POST /rpc` (and a WebSocket on it, opt-in) | JSON-RPC 2.0 method dispatch |
| `GraphQLProvider` | `GET`/`POST /graphql` | GraphQL gateway (Rust query parsing, TS resolvers) |
| `OpenApiProvider` | `GET /docs`, `GET /api-docs` | Swagger UI + auto-generated OpenAPI 3.1 spec |
| `ApiResource` | — | Entity → response serializer base class |

All three resolve their handlers/resolvers through the **IoC container**, exactly
like controllers — so handlers get full dependency injection.

## JSON-RPC

Add `RpcProvider`, then register methods on the container-bound `rpc` router.

```ts
import { RpcProvider } from '@c9up/ream/rpc/provider'

// 1. Register the provider (in your providers list).

// 2. Register methods — anywhere after boot, via the container.
const rpc = await app.container.make('rpc')

// Closure handler:
rpc.method('task.validate', (ctx, params) => validate(params)).guard('jwt')

// Or a controller's methods — listed explicitly, DI-resolved per call:
rpc.namespace('user', UserController, ['find', 'create']) // → user.find, user.create

// Shared guards/middleware for a group:
rpc.group({ guard: 'jwt' }, (r) => {
  r.method('admin.purge', purgeHandler)
})
```

Clients `POST /rpc` with a JSON-RPC 2.0 body (single or batch, max 50):

```json
{ "jsonrpc": "2.0", "method": "task.validate", "params": { "id": 1 }, "id": 1 }
```

The body must be sent as `application/json` (or `application/json-rpc`,
`application/jsonrequest`); any other Content-Type, or none, is answered
`415 Unsupported Media Type` before the body is read. A form post or a
`text/plain` body is a request any page can send with the visitor's cookies
without a CORS preflight; a JSON Content-Type cannot be sent that way. A body
that is not valid JSON is answered with `-32700 Parse error`.

`namespace()` publishes only the methods it is given. TypeScript `private` and
`protected` do not exist at runtime, so a controller method is reachable over
RPC exactly when it is in that list. The type only accepts the controller's
public method names; an unknown name, a getter or `constructor` throws
`E_RPC_UNKNOWN_CONTROLLER_METHOD`.

Names starting with `rpc.` are reserved by JSON-RPC 2.0 for the protocol:
registering one throws `E_RPC_RESERVED_METHOD_NAME`, and an empty name throws
`E_RPC_INVALID_METHOD_NAME`.

In production, an internal failure (a handler or a validator that throws
something other than a JSON-RPC error, a validator that is not registered) is
answered `-32603 Internal error` without its message.

The server keeps what the caller does not see: every such failure is logged
through `ctx.logger`, so with the request's correlation id, with its message,
its stack, the RPC method and the call's `id`, at `error` level (`warn` for a
refusal a middleware threw with a 4xx status, as a route's would be). It is
also emitted as the `exception` event, with an extra `rpcMethod` field. A
JSON-RPC error the handler threw on purpose (one with a numeric `code`) is an
answer, not a failure, and is not logged.

Config: `config.rpc.path` overrides the mount path (default `/rpc`);
`config.rpc.contentTypes` replaces the accepted media types;
`config.rpc.webSocket` also serves the methods over a WebSocket (below).

### Over a WebSocket

The same methods answer over one WebSocket per client, which saves a request
per call and keeps the connection open for what the server pushes:

```ts
// config/rpc.ts — on the POST path, behind the same `guards`
export default { guards: ['web'], webSocket: true }

// or by hand, on any route
router.ws('/rpc', rpc.webSocket({ maxInFlight: 16, maxQueued: 256 })).use(middleware.auth())
```

Each text message is one JSON-RPC message, single or batch, and takes the path
a POST body takes: the same parse, batch limit, guards, roles, permissions,
middleware, validators and error codes. A notification, or a batch of nothing
but notifications, gets no reply; a binary message gets `-32700 Parse error`.

- **Auth is the handshake's.** The route's middleware and guards run on the
  upgrade request; a refused client gets plain HTTP (401) and never a socket.
  Every call on the socket then runs with that request's `ctx`, so `ctx.auth`
  is the user who connected. A role removed while the socket is open counts
  from the next connection; a `.permission()` gate asks the auth layer on
  every call. Close a user's sockets yourself when they sign out.
- **Calls share that `ctx`**, as the calls of a batch do: keep per-call state
  in the handler, not on `ctx`. The session is the one the handshake read.
- **Bounded.** Up to `maxInFlight` messages of a socket run at once (16 by
  default) and answer as they finish, so replies can come out of order —
  JSON-RPC matches them by `id`. The calls of one batch run in order and come
  back as one reply. A client that keeps more than `maxQueued` messages (256)
  waiting is closed with `1013`. The size of one message is the server's
  `http.webSocket.maxMessageSize` (1 MiB by default; see
  [WebSockets](/en/guide/websockets#limits)).

A client: [`@c9up/comet`](/en/modules/comet)'s `createWebSocketTransport`.

> `RpcRouter` keeps its routing DSL (`method`/`group`/`namespace`/`guard`/`validate`)
> and pipeline (DI, middleware, warden auth), but the JSON-RPC envelope, parsing,
> notification rule, and error codes come from the agnostic
> [`@c9up/comet`](/en/modules/comet) protocol core — the same core aurora's client
> uses, so the spec logic is defined once. `@c9up/comet` is an optional peer —
> register RPC from the `@c9up/ream/rpc/provider` subpath. The browser client is
> `createRpcClient` from `@c9up/aurora/rpc`.

## GraphQL

`GraphQLProvider` is opt-in: it does nothing unless `config.graphql.schemaPath`
points at a `.graphql` schema. When set, it builds a `GraphQLEngine`, gives it the
container for resolver DI, and mounts `GET` (playground) + `POST` (queries).

A `POST` must be sent as `application/json`: any other Content-Type, or none, is
answered `415` (`{ errors: [{ message: 'Unsupported Media Type' }] }`) before the
body is read. A form post or a `text/plain` body is a request any page can send
with the visitor's cookies and no CORS preflight, so a mutation would otherwise
run cross-site. The endpoint reads its own body: it works whether or not the
body parser runs in front of it.

```ts
// config/graphql.ts
export default { schemaPath: './app/graphql/schema.graphql' }
```

```ts
// Register resolvers via the container-bound engine.
const gql = await app.container.make('graphql')

gql.resolver('Query', 'tasks', TaskResolver, 'tasks')
gql.resolver('Mutation', 'createTask', TaskResolver, 'createTask', {
  guard: 'jwt',
  role: 'cs_member',
})
```

Resolver classes are instantiated through `container.make()` per request, so they
receive injected dependencies. The response is pruned to the client's selection
set, so a resolver may safely return a rich object (e.g. an ORM entity).

### What a resolver receives

The document is checked against the schema before any resolver runs, so a
mutation never runs half-way:

- `args` holds only the arguments the schema declares for that field. An
  undeclared one is refused (`Unknown argument "role" on field
  "Mutation.updateProfile".`), so a resolver that spreads `args` into a model
  cannot be handed `role` or `isAdmin`. A missing required argument is refused,
  and a declared default is applied.
- Request variables reach `args` only through the `$name` references of the
  operation, and only the variables it declares (`query Q($id: ID!)`). A
  variable it does not declare is an error; one the request sends that the
  operation does not declare is ignored. A string literal such as `"$role"` is
  a string.
- A document with several operations runs the one `operationName` names, and
  is refused without it.
- A field the root type does not declare is refused.

The request body is parsed without `__proto__` keys, as the body parser does.

### Limits

`maxDepth` (default 12) and `maxComplexity` (default 1000 fields, aliases
included) are applied by the native parser **while it expands fragments**: a
few hundred bytes of fragments spreading each other twice would otherwise
expand to millions of fields. The same budget caps how many fragments are
expanded. Fragments that spread themselves, unknown fragments and duplicate
fragment names are refused, as graphql-js validation does. `maxQueryBytes`
(default 100 000) caps the query before parsing.

```ts
export default {
  schemaPath: './app/graphql/schema.graphql',
  maxDepth: 12,
  maxComplexity: 1000,
}
```

A guard option (`guard: 'jwt'`) restricts which guards may authenticate the
call, as on routes — see [Routing](/en/guide/routing#fluent-route-builder).

## OpenAPI + Swagger UI

`OpenApiProvider` serves interactive docs **of your REST routes**. The spec is
generated **lazily on the first request** to `/api-docs`, so every route
registered during boot is included.

```ts
// config/openapi.ts
export default {
  title: 'My API',
  version: '1.0.0',
  // docsPath: '/docs',      // Swagger UI (default)
  // specPath: '/api-docs',  // raw JSON spec (default)
  // enabled: false,         // opt-out
}
```

- `GET /docs` → Swagger UI (HTML)
- `GET /api-docs` → the OpenAPI 3.1 JSON spec

The spec is derived from registered routes + Rune validators + guard metadata
(`401`/`403` responses are inferred from `@Guard`/`@Role`/`@Permission`). Route
versioning (`route.version()`, `route.deprecates()`) is reflected in the spec.

> OpenAPI is **documentation**, not an API style. It describes your REST routes;
> JSON-RPC and GraphQL are alternative call styles.

The spec is generated once and **cached** after the first request. Routes added
**after** that first hit (e.g. dev hot-reload) won't appear until restart.

## API Resources (serializers)

`ApiResource<T>` is a base class for transforming entities into API responses
with explicit field selection — shared across REST, JSON-RPC, and GraphQL.

```ts
import { ApiResource } from '@c9up/ream'

class UserResource extends ApiResource<User> {
  serialize(user: User): Record<string, unknown> {
    return { id: user.id, name: user.name } // never leak password, etc.
  }
}
```

## Notes

- All providers are **lean**: `register()` binds, `boot()` mounts. They don't
  guard token ownership — register one of each.
- JSON-RPC and GraphQL run the same guard/middleware pipeline as REST routes.
