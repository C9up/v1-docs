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

// Ou les méthodes d'un contrôleur — listées explicitement, résolues par DI à chaque appel :
rpc.namespace('user', UserController, ['find', 'create']) // → user.find, user.create

// Guards/middleware partagés pour un groupe :
rpc.group({ guard: 'jwt' }, (r) => {
  r.method('admin.purge', purgeHandler)
})
```

Les clients font `POST /rpc` avec un corps JSON-RPC 2.0 (simple ou batch, max 50) :

```json
{ "jsonrpc": "2.0", "method": "task.validate", "params": { "id": 1 }, "id": 1 }
```

Le corps doit être envoyé en `application/json` (ou `application/json-rpc`,
`application/jsonrequest`) ; tout autre Content-Type, ou aucun, reçoit
`415 Unsupported Media Type` avant que le corps soit lu. Un formulaire ou un
corps `text/plain` est une requête que n'importe quelle page peut envoyer avec
les cookies du visiteur sans preflight CORS ; un Content-Type JSON ne peut pas
partir ainsi. Un corps qui n'est pas du JSON valide reçoit `-32700 Parse error`.

`namespace()` ne publie que les méthodes qu'on lui donne. `private` et
`protected` de TypeScript n'existent pas à l'exécution : une méthode de
contrôleur est joignable en RPC exactement quand elle figure dans cette liste.
Le type n'accepte que les noms des méthodes publiques du contrôleur ; un nom
inconnu, un getter ou `constructor` lève `E_RPC_UNKNOWN_CONTROLLER_METHOD`.

Les noms qui commencent par `rpc.` sont réservés au protocole par JSON-RPC 2.0 :
en enregistrer un lève `E_RPC_RESERVED_METHOD_NAME`, et un nom vide lève
`E_RPC_INVALID_METHOD_NAME`.

En production, une panne interne (un handler ou un validateur qui lève autre
chose qu'une erreur JSON-RPC, un validateur non enregistré) reçoit
`-32603 Internal error` sans son message.

Le serveur garde ce que l'appelant ne voit pas : chacune de ces pannes est
journalisée par `ctx.logger`, donc avec l'identifiant de corrélation de la
requête, avec son message, sa pile, la méthode RPC et l'`id` de l'appel, au
niveau `error` (`warn` pour un refus qu'un middleware a levé avec un statut
4xx, comme pour une route). Elle est aussi émise comme événement `exception`,
avec un champ `rpcMethod` en plus. Une erreur JSON-RPC que le handler lève
exprès (avec un `code` numérique) est une réponse, pas une panne : elle n'est
pas journalisée.

Config : `config.rpc.path` change le chemin de montage (défaut `/rpc`) ;
`config.rpc.contentTypes` remplace les types de média acceptés.

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

Un `POST` doit être envoyé en `application/json` : tout autre Content-Type, ou
son absence, reçoit `415` (`{ errors: [{ message: 'Unsupported Media Type' }] }`)
avant que le corps ne soit lu. Un formulaire ou un corps `text/plain` est une
requête que n'importe quelle page peut envoyer avec les cookies du visiteur et
sans preflight CORS : une mutation s'exécuterait sinon depuis un autre site.
L'endpoint lit lui-même son corps : il fonctionne que le body parser tourne
devant lui ou non.

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

### Ce que reçoit un resolver

Le document est vérifié contre le schéma avant qu'aucun resolver ne tourne : une
mutation ne s'exécute jamais à moitié.

- `args` ne contient que les arguments que le schéma déclare pour ce champ. Un
  argument non déclaré est refusé (`Unknown argument "role" on field
  "Mutation.updateProfile".`) : un resolver qui étale `args` dans un modèle ne
  peut pas recevoir `role` ou `isAdmin`. Un argument obligatoire absent est
  refusé, et la valeur par défaut déclarée est appliquée.
- Les variables de la requête n'atteignent `args` qu'à travers les références
  `$nom` de l'opération, et seulement celles qu'elle déclare
  (`query Q($id: ID!)`). Une variable non déclarée utilisée est une erreur ; une
  variable envoyée que l'opération ne déclare pas est ignorée. Un littéral
  chaîne comme `"$role"` reste une chaîne.
- Un document à plusieurs opérations exécute celle que nomme `operationName`, et
  il est refusé sans.
- Un champ que le type racine ne déclare pas est refusé.

Le corps de la requête est lu sans clés `__proto__`, comme le fait le body
parser.

### Limites

`maxDepth` (12 par défaut) et `maxComplexity` (1000 champs par défaut, alias
compris) sont appliqués par le parseur natif **pendant qu'il déplie les
fragments** : quelques centaines d'octets de fragments qui s'étalent chacun deux
fois se déplieraient sinon en millions de champs. Le même budget plafonne le
nombre de fragments dépliés. Les fragments qui s'étalent eux-mêmes, les
fragments inconnus et les noms de fragment en double sont refusés, comme dans la
validation de graphql-js. `maxQueryBytes` (100 000 par défaut) plafonne la
requête avant le parsing.

```ts
export default {
  schemaPath: './app/graphql/schema.graphql',
  maxDepth: 12,
  maxComplexity: 1000,
}
```

L'option de guard (`guard: 'jwt'`) restreint les guards qui peuvent authentifier
l'appel, comme sur les routes — voir [Routage](/fr/guide/routing#builder-de-route-fluide).

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
