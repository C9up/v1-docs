# OpenAPI

Ce guide couvre le document OpenAPI et Swagger UI.

## OpenAPI + Swagger UI

`OpenApiProvider` sert une doc interactive **de vos routes REST**. La spec est
générée **paresseusement à la première requête** sur `/api-docs`, donc toute route
enregistrée pendant le boot est incluse.

```ts
// config/openapi.ts
export default {
  title: 'My API',
  version: '1.0.0',
  // docsPath: '/docs',      // Swagger UI (défaut)
  // specPath: '/api-docs',  // spec JSON brute (défaut)
  // enabled: true,          // défaut : actif, sauf en production
  // guards: ['web'],        // qui peut la lire
  // middleware: ['admin'],  // middleware nommés, ou fonctions
}
```

- `GET /docs` → Swagger UI (HTML)
- `GET /api-docs` → la spec JSON OpenAPI 3.1

La spec est dérivée des routes enregistrées + des validateurs Rune + des métadonnées
de guard (les réponses `401`/`403` sont inférées depuis `@Guard`/`@Role`/`@Permission`).
Le versioning de route (`route.version()`, `route.deprecates()`) est reflété dans la spec.

> OpenAPI est de la **documentation**, pas un style d'API. Il décrit vos routes
> REST ; JSON-RPC et GraphQL sont des styles d'appel alternatifs.

La spec est générée une fois puis **cachée** après la première requête. Les routes
ajoutées **après** ce premier hit (p. ex. hot-reload en dev) n'apparaîtront qu'au
redémarrage.

## Qui peut la lire

Le document est un inventaire de votre API. Il liste toutes les routes, y
compris les routes internes et d'administration, les guards que chacune
demande, la classe et la méthode du contrôleur derrière, et le schéma champ par
champ de chaque corps validé. Ne le servez pas à tout le monde, sauf si votre
API est publique.

- **Production.** Les deux routes ne sont pas montées quand `NODE_ENV` vaut
  `production`. Mettez `enabled: true` pour les servir quand même, et
  protégez-les.
- **Guards et middleware.** `/api-docs` et `/docs` sont des routes ordinaires.
  Vos middleware serveur (`start/kernel.ts`) passent avant elles, comme pour
  toute route. `guards` pose `.guard(...)` sur les deux routes ; `middleware`
  ajoute des middleware nommés (`'admin'`) ou des fonctions middleware.
- **Les couper.** `enabled: false` ne monte rien.

```ts
// config/openapi.ts
export default {
  enabled: true,
  guards: ['web'],
  middleware: ['admin'],
}
```

`guards: []` est refusé avec `E_EMPTY_GATE_REQUIREMENT` : retirez la clé pour
ne demander aucun guard.
