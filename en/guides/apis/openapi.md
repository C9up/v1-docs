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
