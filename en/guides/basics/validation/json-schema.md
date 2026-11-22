# JSON Schema

This guide covers exporting a schema as JSON Schema.

## JSON Schema

A compiled validator describes the shape it accepts:

```typescript
const users = create({
  name: rules.string().minLength(2),
  tags: rules.array(rules.string()).notEmpty(),
})

users.toJSONSchema()
// {
//   type: 'object',
//   properties: {
//     name: { type: 'string', minLength: 2 },
//     tags: { type: 'array', minItems: 1, items: { type: 'string' } },
//   },
//   required: ['name', 'tags'],
//   additionalProperties: false,
// }
```

`additionalProperties: false` is not decoration: the validator drops undeclared
keys unless the shape calls `allowUnknownProperties()`, and the schema has to
say so or a form generated from it would offer fields that get discarded.

The same schema is reachable through the Standard Schema contract as
`validator['~standard'].jsonSchema.input()`. **`output()` refuses**: `parse()`
and `transform()` take arbitrary callbacks, so a schema claiming to describe the
result would be a guess dressed as an answer.

`input()` takes the Standard JSON Schema `target`. rune emits **`draft-2020-12`**
— that is what you get when you omit it — and refuses any other dialect rather
than hand back a shape the caller will read under different rules:

```ts
validator['~standard'].jsonSchema.input({ target: 'draft-2020-12' })  // fine
validator['~standard'].jsonSchema.input({ target: 'openapi-3.0' })    // throws
// E_RUNE_UNSUPPORTED_JSON_SCHEMA_TARGET
```

The refusal is deliberate: `openapi-3.0` spells nullability `nullable: true`
rather than a `type` array, and tuples use `prefixItems`, which is
`draft-2020-12` only. A silent best-effort would produce a document that
validates differently from the validator it claims to describe.
