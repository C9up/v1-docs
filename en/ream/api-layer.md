# API Layer — JSON-RPC, GraphQL, OpenAPI

Ream ships three alternative ways to expose your services alongside REST, plus a
serializer base for shaping responses. Each is wired by a **provider** and is
**opt-in** — add the provider to your app's providers list to enable it.

| Provider | Mounts | Purpose |
|---|---|---|
| `RpcProvider` | `POST /rpc` | JSON-RPC 2.0 method dispatch |
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

Config: `config.rpc.path` overrides the mount path (default `/rpc`);
`config.rpc.contentTypes` replaces the accepted media types.

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
