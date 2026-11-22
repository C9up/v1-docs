# GraphQL

This guide covers the GraphQL endpoint:

- What a resolver receives
- Limits

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
receive injected dependencies. The response is pruned to the client's selection
set, so a resolver may safely return a rich object (e.g. an ORM entity).

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
- A field the root type does not declare is refused.

The request body is parsed without `__proto__` keys, as the body parser does.

### Limits

`maxDepth` (default 12) and `maxComplexity` (default 1000 fields, aliases
included) are applied by the native parser **while it expands fragments**: a
few hundred bytes of fragments spreading each other twice would otherwise
expand to millions of fields. The same budget caps how many fragments are
expanded. Fragments that spread themselves, unknown fragments and duplicate
fragment names are refused, as graphql-js validation does. `maxQueryBytes`
(default 100 000) caps the query before parsing.

```ts
export default {
  schemaPath: './app/graphql/schema.graphql',
  maxDepth: 12,
  maxComplexity: 1000,
}
```

A guard option (`guard: 'jwt'`) restricts which guards may authenticate the
call, as on routes — see [Routing](/en/guides/basics/routing#fluent-route-builder).
