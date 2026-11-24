# OpenAPI

This guide covers the OpenAPI document and Swagger UI.

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
  // enabled: true,          // default: on, except in production
  // guards: ['web'],        // who may read it
  // middleware: ['admin'],  // named middleware, or functions
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

## Who can read it

The document is an inventory of your API. It lists every route, internal and
admin ones included, the guards each one needs, the controller class and method
behind it, and the field-by-field schema of every validated body. Do not serve
it to everybody unless your API is public.

- **Production.** The two routes are not mounted when `NODE_ENV` is
  `production`. Set `enabled: true` to serve them there, and protect them.
- **Guards and middleware.** `/api-docs` and `/docs` are ordinary routes. Your
  server middleware (`start/kernel.ts`) runs before them, like for any route.
  `guards` puts `.guard(...)` on both routes; `middleware` adds named
  middleware (`'admin'`) or middleware functions.
- **Turn it off.** `enabled: false` mounts nothing.

```ts
// config/openapi.ts
export default {
  enabled: true,
  guards: ['web'],
  middleware: ['admin'],
}
```

`guards: []` is refused with `E_EMPTY_GATE_REQUIREMENT`: leave the key out for
no guard.
