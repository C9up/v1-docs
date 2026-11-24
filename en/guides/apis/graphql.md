# GraphQL

This guide covers the GraphQL endpoint:

- What a resolver receives
- What goes out
- Limits
- Rate limiting a resolver

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
receive injected dependencies.

The schema is the contract. A client can read a field only if the schema
declares it on the type of the value, at any depth. See
[What goes out](#what-goes-out).

### What a resolver receives

The document is checked against the schema before any resolver runs, so a
mutation never runs half-way:

- `args` holds only the arguments the schema declares for that field. An
  undeclared one is refused (`Unknown argument "role" on field
  "Mutation.updateProfile".`), so a resolver that spreads `args` into a model
  cannot be handed `role` or `isAdmin`. A missing required argument is refused,
  and a declared default is applied.
- Request variables reach `args` only through the `$name` references of the
  operation, and only the variables it declares (`query Q($id: ID!)`). A
  variable it does not declare is an error; one the request sends that the
  operation does not declare is ignored. A string literal such as `"$role"` is
  a string.
- A document with several operations runs the one `operationName` names, and
  is refused without it.
- A field its type does not declare is refused, at every depth:
  `Cannot query field "passwordHash" on type "User".`
- A field whose type has fields must select some: `{ tasks }` is refused
  (`Field "tasks" of type "[Task!]!" must have a selection of subfields.`). A
  field whose type has none must not: `{ tasks { id { x } } }` is refused.
- A fragment must name a type of the schema that the value can be:
  `... on Admin` on a `User` is refused.

The request body is parsed without `__proto__` keys, as the body parser does.

### What goes out

Only root fields have resolvers. The engine reads everything below from what
the resolver returned, by the schema:

```graphql
type Query { tasks: [Task!]! }
type Task { id: ID! title: String owner: User }
type User { id: ID! name: String }
```

```ts
class TaskResolver {
  // An ORM entity holds every column, `passwordHash` included.
  tasks() {
    return Task.query().preload('owner')
  }
}
```

`{ tasks { id owner { name } } }` answers `id` and `owner.name`. Nothing else
can be asked for: `owner { passwordHash }` is refused before the resolver
runs, because `User` does not declare `passwordHash`.

The rules:

- A field is copied when the client selected it, the type of the value
  declares it, and it is an **own property** of the value. A getter on a class
  prototype is not read: return it as a property.
- The read does not go through `toJSON()` or a model serializer. What you
  declare in the schema is public to everyone who may call the resolver.
  Declare only what a client may read.
- A list type (`[Task!]`) takes an array, an object type takes an object.
- `Int`, `Float`, `String`, `Boolean`, `ID` and enums take a string, a number
  or a boolean, or an object whose `toJSON()` gives one (a `Date`). An object
  under a `String` is refused, not sent whole.
- A scalar you declare (`scalar JSON`) is sent as it is. Its content is yours
  to check.
- A value that does not fit its type fails that field with
  `E_GRAPHQL_INVALID_RESULT`. The client reads `Internal server error`; the
  reason is in the logs (and in the reply when `debug` is on).

The schema must declare every type it names. A field of type `Usr` with no
`type Usr` makes every query fail with `GraphQL schema could not be read`, and
the log names the type.

#### Interfaces and unions

A field of an interface or union type needs to know which object type each
value is. The engine reads the value's own `__typename`, or asks a resolver
you register:

```ts
gql.resolveType('SearchResult', (value) => (value instanceof User ? 'User' : 'Task'))
```

```graphql
{ search { __typename ... on User { name } ... on Task { title } } }
```

Each fragment applies to the values of its type only. A value whose type is
unknown, or is not a member of the union, fails the field.

### Limits

`maxDepth` (default 12) and `maxComplexity` (default 1000 fields, aliases
included) are applied by the native parser **while it expands fragments**: a
few hundred bytes of fragments spreading each other twice would otherwise
expand to millions of fields. The same budget caps how many fragments are
expanded. Fragments that spread themselves, unknown fragments and duplicate
fragment names are refused, as graphql-js validation does. `maxQueryBytes`
(default 100 000) caps the query before parsing.

`maxErrors` (default 100) caps the validation errors of one request. After
that many, validation stops and the last message says so: `Too many validation
errors, error limit reached. Validation aborted.` Each message is reported
once.

`maxFieldRepeats` (default 10) is the most times one root field may be
selected in a request, aliases included. `maxMutationRepeats` (default 1) is
the same bound for a mutation. A request over the bound is refused before any
resolver runs:

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

`maxRepeats` on a resolver replaces the bound for that field:

```ts
gql.resolver('Mutation', 'archiveTask', TaskResolver, 'archive', { guard: 'jwt', maxRepeats: 20 })
```

### Rate limiting a resolver

A rate limit on the `/graphql` route counts HTTP requests. One request can
call a resolver several times, once per alias, so that limit does not count
attempts. Put the limit on the resolver:

```ts
// The named middleware runs before EACH call of the resolver.
const registry = await app.container.make('middleware')
registry.register('loginThrottle', loginThrottle) // from limiter.define()

gql.resolver('Mutation', 'login', AuthResolver, 'login', { middleware: ['loginThrottle'] })
```

A resolver middleware refuses by throwing. It runs after the resolver's
guards. It must not write the response, which every field of the request
shares. An unknown name fails the field, and the resolver does not run.

To count failures only, call the limiter inside the resolver — see
[Rate limiting](/en/guides/security/rate-limiting#batch-endpoints-graphql-and-json-rpc).

A guard option (`guard: 'jwt'`) restricts which guards may authenticate the
call, as on routes — see [Routing](/en/guides/basics/routing#fluent-route-builder).
An empty list (`guards: []`, `roles: []`, `permissions: []`) would protect
nothing: `resolver()` throws `E_EMPTY_GATE_REQUIREMENT`. Leave the key out for
no requirement.
