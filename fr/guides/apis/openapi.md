# OpenAPI

Ce guide couvre le document OpenAPI et Swagger UI.

## OpenAPI + Swagger UI

`OpenApiProvider` sert une doc interactive **de tes routes REST**. La spec est
générée **paresseusement à la première requête** sur `/api-docs`, donc toute route
enregistrée pendant le boot est incluse.

```ts
// config/openapi.ts
export default {
  title: 'My API',
  version: '1.0.0',
  // docsPath: '/docs',      // Swagger UI (défaut)
  // specPath: '/api-docs',  // spec JSON brute (défaut)
  // enabled: false,         // opt-out
}
```

- `GET /docs` → Swagger UI (HTML)
- `GET /api-docs` → la spec JSON OpenAPI 3.1

La spec est dérivée des routes enregistrées + des validateurs Rune + des métadonnées
de guard (les réponses `401`/`403` sont inférées depuis `@Guard`/`@Role`/`@Permission`).
Le versioning de route (`route.version()`, `route.deprecates()`) est reflété dans la spec.

> OpenAPI est de la **documentation**, pas un style d'API. Il décrit tes routes
> REST ; JSON-RPC et GraphQL sont des styles d'appel alternatifs.

La spec est générée une fois puis **cachée** après la première requête. Les routes
ajoutées **après** ce premier hit (p. ex. hot-reload en dev) n'apparaîtront qu'au
redémarrage.
