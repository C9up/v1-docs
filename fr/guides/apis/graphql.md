# GraphQL

Ce guide couvre l'endpoint GraphQL :

- Ce que reçoit un resolver
- Ce qui sort
- Limites
- Limiter le débit d'un resolver

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
donc elles reçoivent leurs dépendances injectées.

Le schéma est le contrat. Un client ne lit un champ que si le schéma le déclare
sur le type de la valeur, à toute profondeur. Voir [Ce qui sort](#ce-qui-sort).

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
- Un champ que son type ne déclare pas est refusé, à toute profondeur :
  `Cannot query field "passwordHash" on type "User".`
- Un champ dont le type a des champs doit en sélectionner : `{ tasks }` est
  refusé (`Field "tasks" of type "[Task!]!" must have a selection of
  subfields.`). Un champ dont le type n'en a pas ne doit pas en sélectionner :
  `{ tasks { id { x } } }` est refusé.
- Un fragment doit nommer un type du schéma que la valeur peut être :
  `... on Admin` sur un `User` est refusé.

Le corps de la requête est lu sans clés `__proto__`, comme le fait le body
parser.

### Ce qui sort

Seuls les champs racine ont un resolver. Le moteur lit tout le reste dans ce
que le resolver a renvoyé, d'après le schéma :

```graphql
type Query { tasks: [Task!]! }
type Task { id: ID! title: String owner: User }
type User { id: ID! name: String }
```

```ts
class TaskResolver {
  // Une entité ORM porte toutes les colonnes, `passwordHash` compris.
  tasks() {
    return Task.query().preload('owner')
  }
}
```

`{ tasks { id owner { name } } }` répond `id` et `owner.name`. Rien d'autre ne
peut être demandé : `owner { passwordHash }` est refusé avant que le resolver
ne tourne, parce que `User` ne déclare pas `passwordHash`.

Les règles :

- Un champ est copié quand le client l'a sélectionné, que le type de la valeur
  le déclare, et que c'est une **propriété propre** de la valeur. Un getter du
  prototype d'une classe n'est pas lu : renvoyez-le comme propriété.
- La lecture ne passe pas par `toJSON()` ni par le sérialiseur d'un modèle. Ce
  que vous déclarez dans le schéma est public pour tous ceux qui peuvent
  appeler le resolver. Ne déclarez que ce qu'un client peut lire.
- Un type liste (`[Task!]`) prend un tableau, un type objet prend un objet.
- `Int`, `Float`, `String`, `Boolean`, `ID` et les enums prennent une chaîne, un
  nombre ou un booléen, ou un objet dont `toJSON()` en donne un (une `Date`).
  Un objet sous un `String` est refusé, il n'est pas envoyé entier.
- Un scalaire que vous déclarez (`scalar JSON`) est envoyé tel quel. Son
  contenu est à vous de vérifier.
- Une valeur qui ne correspond pas à son type fait échouer ce champ avec
  `E_GRAPHQL_INVALID_RESULT`. Le client lit `Internal server error` ; la raison
  est dans les logs (et dans la réponse quand `debug` est actif).

Le schéma doit déclarer chaque type qu'il nomme. Un champ de type `Usr` sans
`type Usr` fait échouer toutes les requêtes avec `GraphQL schema could not be
read`, et le log nomme le type.

#### Interfaces et unions

Un champ de type interface ou union doit savoir quel type objet est chaque
valeur. Le moteur lit le `__typename` propre de la valeur, ou interroge un
resolver que vous enregistrez :

```ts
gql.resolveType('SearchResult', (value) => (value instanceof User ? 'User' : 'Task'))
```

```graphql
{ search { __typename ... on User { name } ... on Task { title } } }
```

Chaque fragment ne s'applique qu'aux valeurs de son type. Une valeur dont le
type est inconnu, ou n'est pas membre de l'union, fait échouer le champ.

### Limites

`maxDepth` (12 par défaut) et `maxComplexity` (1000 champs par défaut, alias
compris) sont appliqués par le parseur natif **pendant qu'il déplie les
fragments** : quelques centaines d'octets de fragments qui s'étalent chacun deux
fois se déplieraient sinon en millions de champs. Le même budget plafonne le
nombre de fragments dépliés. Les fragments qui s'étalent eux-mêmes, les
fragments inconnus et les noms de fragment en double sont refusés, comme dans la
validation de graphql-js. `maxQueryBytes` (100 000 par défaut) plafonne la
requête avant le parsing.

`maxErrors` (100 par défaut) plafonne les erreurs de validation d'une requête.
Passé ce nombre, la validation s'arrête et le dernier message le dit : `Too many
validation errors, error limit reached. Validation aborted.` Chaque message
n'est rapporté qu'une fois.

`maxFieldRepeats` (10 par défaut) est le nombre maximal de sélections d'un même
champ racine dans une requête, alias compris. `maxMutationRepeats` (1 par
défaut) est la même borne pour une mutation. Une requête au-delà est refusée
avant qu'aucun resolver ne tourne :

```
Field "Mutation.login" is selected 3 times in this request; at most 1 allowed.
```

```ts
export default {
  schemaPath: './app/graphql/schema.graphql',
  maxDepth: 12,
  maxComplexity: 1000,
  maxErrors: 100,
  maxFieldRepeats: 10,
  maxMutationRepeats: 1,
}
```

`maxRepeats` sur un resolver remplace la borne pour ce champ :

```ts
gql.resolver('Mutation', 'archiveTask', TaskResolver, 'archive', { guard: 'jwt', maxRepeats: 20 })
```

### Limiter le débit d'un resolver

Une limite de débit posée sur la route `/graphql` compte les requêtes HTTP. Une
requête peut appeler un resolver plusieurs fois, une fois par alias : cette
limite ne compte donc pas les essais. Posez la limite sur le resolver :

```ts
// Le middleware nommé s'exécute avant CHAQUE appel du resolver.
const registry = await app.container.make('middleware')
registry.register('loginThrottle', loginThrottle) // issu de limiter.define()

gql.resolver('Mutation', 'login', AuthResolver, 'login', { middleware: ['loginThrottle'] })
```

Un middleware de resolver refuse en levant une erreur. Il s'exécute après les
guards du resolver. Il ne doit pas écrire la réponse, que tous les champs de la
requête partagent. Un nom inconnu fait échouer le champ, et le resolver ne
tourne pas.

Pour ne compter que les échecs, appelez le limiteur dans le resolver — voir
[Limitation de débit](/fr/guides/security/rate-limiting#endpoints-par-lot-graphql-et-json-rpc).

L'option de guard (`guard: 'jwt'`) restreint les guards qui peuvent authentifier
l'appel, comme sur les routes — voir [Routage](/fr/guides/basics/routing#builder-de-route-fluide).
Une liste vide (`guards: []`, `roles: []`, `permissions: []`) ne protégerait
rien : `resolver()` lève `E_EMPTY_GATE_REQUIREMENT`. Pour ne rien exiger, omettez
la clé.
