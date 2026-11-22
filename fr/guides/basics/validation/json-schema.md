# JSON Schema

Ce guide couvre l’export d’un schéma en JSON Schema.

## JSON Schema

Un validateur compilé décrit la forme qu'il accepte :

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

`additionalProperties: false` n'est pas décoratif : le validateur jette les clés
non déclarées sauf si la forme appelle `allowUnknownProperties()`, et le schéma
doit le dire — sinon un formulaire généré à partir de lui proposerait des champs
qui seront écartés.

Le même schéma est accessible via le contrat Standard Schema :
`validator['~standard'].jsonSchema.input()`. **`output()` refuse** : `parse()` et
`transform()` acceptent des rappels arbitraires, donc un schéma prétendant
décrire le résultat serait une supposition déguisée en réponse.

`input()` accepte le `target` de Standard JSON Schema. rune émet du
**`draft-2020-12`** — c'est ce que vous obtenez en l'omettant — et refuse tout
autre dialecte plutôt que de rendre une forme que l'appelant lira selon d'autres
règles :

```ts
validator['~standard'].jsonSchema.input({ target: 'draft-2020-12' })  // ok
validator['~standard'].jsonSchema.input({ target: 'openapi-3.0' })    // lève
// E_RUNE_UNSUPPORTED_JSON_SCHEMA_TARGET
```

Le refus est délibéré : `openapi-3.0` écrit la nullabilité `nullable: true` et
non un tableau de `type`, et les tuples passent par `prefixItems`, qui n'existe
qu'en `draft-2020-12`. Un rendu approximatif silencieux produirait un document
qui valide autrement que le validateur qu'il prétend décrire.
