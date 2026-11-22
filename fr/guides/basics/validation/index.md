# Valider les entrées

Ce guide couvre la validation des données d'une requête avec rune :

- Utilisation basique
- Dans les handlers de route
- Résultat de validation
- Le moteur Rust est requis
- Valider une requête

Rune est le moteur de validation de Ream. Définissez des schémas avec des règles fluent, validez les données d'entrée, et recevez des messages d'erreur structurés.

## Utilisation basique

```typescript
import { rules, schema } from '@c9up/rune'

const CreateOrderSchema = schema({
  total: rules.number().positive(),
  customerName: rules.string().min(3).max(100).trim(),
  email: rules.string().email(),
})

const result = CreateOrderSchema.validateResult({
  total: 42.50,
  customerName: '  Alice  ',
  email: 'alice@example.com',
})

// result.valid === true
// result.data === { total: 42.50, customerName: 'Alice', email: 'alice@example.com' }
```

> **Quelle méthode ?** `validateResult()` est synchrone et ne lève jamais — c'est
> celle utilisée ci-dessus. `validate()` est le contrat qui lève : **async**,
> résout les données validées, et lève `errors.E_VALIDATION_ERROR` (HTTP 422) en
> cas d'échec. `validateResultAsync()` est la forme asynchrone à résultat, la
> seule capable d'exécuter `unique` / `exists` — `validateResult()` lève
> immédiatement sur un schéma qui en porte.

## Dans les handlers de route

```typescript
import { rules, schema } from '@c9up/rune'

const CreateOrderSchema = schema({
  total:    rules.number().positive(),
  name:     rules.string().min(1).max(100).trim(),
  email:    rules.string().email(),
  coupon:   rules.string().optional(),
})

router.post('/orders', async (ctx) => {
  const result = CreateOrderSchema.validateResult(ctx.request.body())

  if (!result.valid) {
    ctx.response.status(422).json({ errors: result.errors })
    return
  }

  // result.data est entièrement typé et transformé
  const order = await OrderService.create(result.data)

  ctx.response.status(201).json({ order })
})
```

`ctx.request.body()` renvoie le corps lu par le body parser : la route a donc
besoin du middleware body parser devant elle (sans lui, le corps vaut `{}`).
`await ctx.request.validateUsing(CreateOrderSchema)` est la forme qui lève du
même contrôle : elle renvoie les données validées, ou lève
`E_VALIDATION_ERROR`, auquel le serveur répond par un 422 avec les erreurs.

## Résultat de validation

```typescript
interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  data?: Record<string, unknown>  // Présent uniquement quand valid
}

interface ValidationError {
  field: string    // Nom du champ
  rule: string     // Règle qui a échoué (ex: 'min', 'email', 'required')
  message: string  // Message lisible
}
```

## Le moteur Rust est requis

Un schéma ne portant rien que le moteur ne sache exécuter **est exécuté par le
moteur** — `RuneNativeRequiredError` (`E_RUNE_NAPI_REQUIRED`) est levée si le
binaire est absent, plutôt qu'un repli.

Il existe un validateur TypeScript, et il prenait le relais avec un
avertissement unique. Le verdict d'un schéma dépendait alors du chargement d'un
binaire préconstruit : deux déploiements du même code pouvaient diverger sur la
validité d'un payload, et celui qui repliait perdait la raison d'avoir du Rust.

Le chemin TypeScript reste pour ce que le moteur ne sait vraiment pas faire —
une règle custom, un traducteur, un fournisseur de messages. Là, il est la seule
implémentation, pas une seconde libre de diverger.

## Valider une requête

`request.validateUsing(validator)` passe un validateur sur la requête — corps et
query fusionnés, avec `params`, `headers` et `cookies` imbriqués sous leurs
propres clés, pour qu'un champ de formulaire ne puisse jamais renommer un
paramètre de route.

```typescript
const data = await request.validateUsing(CreateUser)
```

Il lève `E_VALIDATION_ERROR` en cas d'échec ; `tryValidateUsing` répond plutôt
`[erreur, null]` / `[null, data]`, pour un handler qui réaffiche lui-même le
formulaire.

Deux hooks rendent un validateur conscient de la requête sans que le schéma en
sache quoi que ce soit. Un paquet les installe une fois, au boot :

```typescript
import { RequestValidator } from '@c9up/ream'

RequestValidator.messagesProvider = (ctx) => ctx.i18n.createMessagesProvider()
RequestValidator.errorReporter = (ctx) => ctx.myReporter
```

Une option passée à l'appel l'emporte sur le hook, et rien d'autre dans le
framework ne les lit : un validateur appelé directement garde ce avec quoi il a
été construit.

## Étapes suivantes
- [Atlas (ORM)](/fr/guides/database/orm/) — Valider avant de sauvegarder les entités
- [Warden (Auth)](/fr/guides/auth/introduction) — Authentifier les utilisateurs
