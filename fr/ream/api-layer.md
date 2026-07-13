# Couche API — JSON-RPC, GraphQL, OpenAPI

Ream fournit trois façons alternatives d'exposer tes services à côté de REST, plus
une base de sérialisation pour façonner les réponses. Chacune est câblée par un
**provider** et est **opt-in** — ajoute le provider à la liste des providers de ton
app pour l'activer.

| Provider | Monte | Rôle |
|---|---|---|
| `RpcProvider` | `POST /rpc` | dispatch de méthodes JSON-RPC 2.0 |
| `GraphQLProvider` | `GET`/`POST /graphql` | passerelle GraphQL (parsing Rust, resolvers TS) |
| `OpenApiProvider` | `GET /docs`, `GET /api-docs` | Swagger UI + spec OpenAPI 3.1 auto-générée |
| `ApiResource` | — | classe de base sérialiseur entité → réponse |

Les trois résolvent leurs handlers/resolvers via le **container IoC**, exactement
comme les contrôleurs — donc les handlers bénéficient de l'injection de dépendances.

## JSON-RPC

Ajoute `RpcProvider`, puis enregistre des méthodes sur le routeur `rpc` lié au
container.

```ts
import { RpcProvider } from '@c9up/ream/rpc/provider'

// 1. Enregistrer le provider (dans ta liste de providers).

// 2. Enregistrer les méthodes — n'importe quand après boot, via le container.
const rpc = await app.container.make('rpc')

// Handler closure :
rpc.method('task.validate', (ctx, params) => validate(params)).guard('jwt')

// Ou un contrôleur entier — chaque méthode publique, résolue par DI à chaque appel :
rpc.namespace('user', UserController) // → user.find, user.create, …

// Guards/middleware partagés pour un groupe :
rpc.group({ guard: 'jwt' }, (r) => {
  r.method('admin.purge', purgeHandler)
})
```

Les clients font `POST /rpc` avec un corps JSON-RPC 2.0 (simple ou batch, max 50) :

```json
{ "jsonrpc": "2.0", "method": "task.validate", "params": { "id": 1 }, "id": 1 }
```

Config : `config.rpc.path` change le chemin de montage (défaut `/rpc`).

> Le `RpcRouter` garde son DSL de routage (`method`/`group`/`namespace`/`guard`/`validate`)
> et son pipeline (DI, middleware, auth warden), mais l'enveloppe JSON-RPC, le
> parsing, la règle de notification et les codes d'erreur viennent du cœur de
> protocole agnostique [`@c9up/comet`](/fr/modules/comet) — le même cœur que le
> client d'aurora, donc la logique de la spec est définie une seule fois. Le
> `@c9up/comet` est un peer optionnel — enregistre le RPC depuis le sous-chemin
> `@c9up/ream/rpc/provider`. Le client navigateur est `createRpcClient` de
> `@c9up/aurora/rpc`.

## GraphQL

`GraphQLProvider` est opt-in : il ne fait rien tant que `config.graphql.schemaPath`
ne pointe pas vers un schéma `.graphql`. Quand il est défini, il construit un
`GraphQLEngine`, lui donne le container pour la DI des resolvers, et monte `GET`
(playground) + `POST` (requêtes).

```ts
// config/graphql.ts
export default { schemaPath: './app/graphql/schema.graphql' }
```

```ts
// Enregistre les resolvers via l'engine lié au container.
const gql = await app.container.make('graphql')

gql.resolver('Query', 'tasks', TaskResolver, 'tasks')
gql.resolver('Mutation', 'createTask', TaskResolver, 'createTask', {
  guard: 'jwt',
  role: 'cs_member',
})
```

Les classes resolver sont instanciées via `container.make()` à chaque requête,
donc elles reçoivent leurs dépendances injectées. La réponse est élaguée au
selection-set du client, donc un resolver peut sans risque renvoyer un objet riche
(p. ex. une entité ORM).

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

## API Resources (sérialiseurs)

`ApiResource<T>` est une classe de base pour transformer des entités en réponses API
avec sélection de champs explicite — partagée entre REST, JSON-RPC et GraphQL.

```ts
import { ApiResource } from '@c9up/ream'

class UserResource extends ApiResource<User> {
  serialize(user: User): Record<string, unknown> {
    return { id: user.id, name: user.name } // ne jamais fuiter password, etc.
  }
}
```

## Notes

- Tous les providers sont **lean** : `register()` binde, `boot()` monte. Ils ne
  gardent pas la propriété du token — enregistre-en un seul de chaque.
- JSON-RPC et GraphQL passent par le même pipeline guard/middleware que les routes REST.
