# GraphQL

Ce guide couvre l'endpoint GraphQL :

- Ce que reçoit un resolver
- Limites

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
sélection-set du client, donc un resolver peut sans risque renvoyer un objet riche
(p. ex. une entité ORM).

### Ce que reçoit un resolver

Le document est vérifié contre le schéma avant qu'aucun resolver ne tourne : une
mutation ne s'exécute jamais à moitié.

- `args` ne contient que les arguments que le schéma déclare pour ce champ. Un
  argument non déclaré est refusé (`Unknown argument "rôle" on field
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
l'appel, comme sur les routes — voir [Routage](/fr/guides/basics/routing#builder-de-route-fluide).
