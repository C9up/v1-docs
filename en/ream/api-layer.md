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
const rpc = app.container.make('rpc')

// Closure handler:
rpc.method('task.validate', (ctx, params) => validate(params)).guard('jwt')

// Or a whole controller — every public method, DI-resolved per call:
rpc.namespace('user', UserController) // → user.find, user.create, …

// Shared guards/middleware for a group:
rpc.group({ guard: 'jwt' }, (r) => {
  r.method('admin.purge', purgeHandler)
})
```

Clients `POST /rpc` with a JSON-RPC 2.0 body (single or batch, max 50):

```json
{ "jsonrpc": "2.0", "method": "task.validate", "params": { "id": 1 }, "id": 1 }
```

Config: `config.rpc.path` overrides the mount path (default `/rpc`).

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

```ts
// config/graphql.ts
export default { schemaPath: './app/graphql/schema.graphql' }
```

```ts
// Register resolvers via the container-bound engine.
const gql = app.container.make('graphql')

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
