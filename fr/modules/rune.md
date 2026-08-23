# Rune — Validation

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
> celle utilisée ci-dessus. `validate()` est le contrat VineJS : **async**,
> résout les données validées, et lève `errors.E_VALIDATION_ERROR` (HTTP 422) en
> cas d'échec. `validateResultAsync()` est la forme asynchrone à résultat, la
> seule capable d'exécuter `unique` / `exists` — `validateResult()` lève
> immédiatement sur un schéma qui en porte.

## Règles

### Règles de type

```typescript
rules.string()    // Doit être une string
rules.number()    // Doit être un nombre (NaN rejeté)
rules.boolean()   // Doit être un booléen
rules.any()       // Pas de vérification de type — chaîne vide
```

### Règles string

```typescript
rules.string()
  .min(3)         // Longueur minimale
  .max(100)       // Longueur maximale
  .email()        // Doit être un email valide
  .trim()         // Supprimer les espaces (transformation)
```

### Règles number

```typescript
rules.number()
  .min(0)         // Valeur minimale
  .max(1000)      // Valeur maximale
  .positive()     // Doit être > 0
```

### Champs optionnels

```typescript
const s = schema({
  name: rules.string().min(1),
  nickname: rules.string().optional(),  // undefined/null accepté
})

s.validateResult({ name: 'Alice' })  // valid — nickname est optionnel
```

### Règles custom

```typescript
rules.string().custom(
  'slug',
  (v) => typeof v === 'string' && /^[a-z0-9-]+$/.test(v),
  'Doit être un slug valide (lettres minuscules, chiffres, tirets)',
)
```

### Messages d'erreur personnalisés

```typescript
rules.string()
  .min(3)
  .message('Le nom doit faire au moins 3 caractères')
  .email()
  .message('Veuillez entrer une adresse email valide')
```

La méthode `.message()` remplace le message de la **dernière** règle ajoutée.

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

## Transformations

Les transformations modifient la valeur **avant** l'exécution des règles de validation :

```typescript
const s = schema({
  name: rules.string().trim().min(3),
})

s.validateResult({ name: '  Al  ' })
// Trim vers 'Al', puis min(3) échoue
// errors: [{ field: 'name', rule: 'min', message: 'Minimum 3' }]
```

## Dans les handlers de route

```typescript
router.post('/orders', async (ctx) => {
  const result = CreateOrderSchema.validateResult(JSON.parse(ctx.request!.body))

  if (!result.valid) {
    ctx.response!.status = 400
    ctx.response!.body = JSON.stringify({ errors: result.errors })
    return
  }

  // result.data contient les données validées + transformées
  ctx.response!.status = 201
  ctx.response!.body = JSON.stringify({ order: result.data })
})
```

## Internationalisation (i18n)

Rune n'embarque plus de moteur i18n interne.

Utilisez Rosetta comme module i18n unique de l'ecosysteme.

### Brancher Rosetta dans Rune

```typescript
import { Rosetta } from '@c9up/rosetta'
import { bindRosetta } from '@c9up/rune'

const i18n = new Rosetta({ defaultLocale: 'fr', fallbackLocale: 'en' })
  .loadMessages('fr', { 'validation.required': '{field} est requis' })

bindRosetta(i18n)
```

```typescript
import { Rosetta } from '@c9up/rosetta'

const i18n = new Rosetta({ defaultLocale: 'en', fallbackLocale: 'en' })

// Enregistrer les traductions d'une locale
i18n.loadMessages('fr', {
  'validation.required': 'Le champ :field est requis',
  'validation.min': 'Le champ :field doit avoir au moins :min caractères',
  'validation.email': 'Le champ :field doit être un email valide',
})

i18n.loadMessages('es', {
  'validation.required': 'El campo :field es obligatorio',
  'validation.min': 'El campo :field debe tener al menos :min caracteres',
})
```

### Traduire des messages

```typescript
// Définir la locale active
i18n.setLocale('fr')

// Traduire une clé avec des paramètres
i18n.t('validation.required', { field: 'nom' })
// 'Le champ nom est requis'

i18n.t('validation.min', { field: 'mot de passe', min: '8' })
// 'Le champ mot de passe doit avoir au moins 8 caractères'
```

## Validation asynchrone

Certaines règles ne peuvent pas répondre de façon synchrone — une vérification
d'unicité ou une vérification d'existence de clé étrangère doit interroger la base
de données. Rune garde ces règles hors du chemin synchrone et les exécute via les
validateurs asynchrones.

### `validateResultAsync` / `validateOrThrowAsync`

Un schéma qui porte une règle asynchrone (`unique`, `exists`, ou une règle
`useAsync`) **doit** être exécuté de façon asynchrone :

```ts
const result = await UserSchema.validateResultAsync(body)
// result : ValidationResult<T> — même forme que validate(), ne lève jamais

const data = await UserSchema.validateOrThrowAsync(body)
// retourne le T validé, ou lève RuneValidationError (E_VALIDATION_ERROR, HTTP 422)
```

`validateResultAsync` exécute d'abord les règles synchrones, puis attend les règles
asynchrones de chaque champ. Une règle asynchrone ne s'exécute que lorsque le
champ **a passé ses règles synchrones** et possède une valeur présente et non
nulle — une requête en base est ignorée pour un champ déjà invalide ou absent
(parité Lucid).

> Le `validate()` synchrone **lève une erreur** sur un schéma qui contient des
> règles asynchrones plutôt que de les ignorer silencieusement :
> `rune: this schema has async rules (unique/exists/useAsync) — call validateResultAsync() instead of validate().`
> Il en va de même pour `validateOrThrow()`, qui appelle `validate()` en interne.

### Règles adossées à la base : `unique` / `exists`

Rune reste agnostique du framework — la règle porte votre callback `check` et
effectue la requête elle-même (par exemple sur Atlas). Les deux acceptent un
message personnalisé optionnel.

- `.unique(check, message?)` — `check(value, field)` résout `true` lorsque la
  valeur est **unique** (valide). En cas d'échec, la règle rapportée est
  `database.unique`, message par défaut `The <field> has already been taken`.
- `.exists(check, message?)` — `check(value, field)` résout `true` lorsqu'une
  ligne correspondante **existe** (valide). En cas d'échec, la règle rapportée est
  `database.exists`, message par défaut `The selected <field> is invalid`.

```ts
import { rules, schema } from '@c9up/rune'
import db from '@c9up/atlas'

const RegisterSchema = schema({
  email: rules.string().email().unique(async (value) => {
    const row = await db.from('users').where('email', value).first()
    return !row // unique lorsqu'aucune ligne ne correspond
  }, 'This email is already registered'),

  countryId: rules.number().exists(async (value) => {
    const row = await db.from('countries').where('id', value).first()
    return Boolean(row) // valide lorsque le pays existe
  }),
})

const result = await RegisterSchema.validateResultAsync({
  email: 'alice@example.com',
  countryId: 42,
})

if (!result.valid) {
  // ex. [{ field: 'email', rule: 'database.unique', message: 'This email is already registered' }]
}
```

### Règles asynchrones personnalisées : `createAsyncRule` / `useAsync`

Pour des règles asynchrones réutilisables, construisez-en une avec
`createAsyncRule` (l'équivalent asynchrone de `createRule`) et attachez-la avec
`.useAsync()`. Le validateur reçoit le `FieldContext` et rapporte les échecs via
`field.report(message, rule)` :

```ts
import { createAsyncRule, rules, schema } from '@c9up/rune'

const availableHandle = createAsyncRule<string>(async (value, table, field) => {
  const taken = await db.from(table).where('handle', value).first()
  if (taken) {
    field.report(`The ${field.field} is not available`, 'handle.taken')
  }
})

const ProfileSchema = schema({
  handle: rules.string().minLength(3).useAsync(availableHandle('profiles')),
})

const data = await ProfileSchema.validateOrThrowAsync({ handle: 'alice' })
```

`useAsync()` lève une erreur à la construction si on lui passe autre chose qu'une
règle asynchrone compilée (appelez d'abord la factory : `useAsync(rule())`, et
non `useAsync(rule)`).

## Étapes suivantes

- [Atlas (ORM)](/fr/modules/atlas) — Valider avant de sauvegarder les entités
- [Warden (Auth)](/fr/modules/warden) — Authentifier les utilisateurs

## Le moteur Rust est requis

Un schéma ne portant rien que le moteur ne sache exécuter **est exécuté par le
moteur** — `RuneNativeRequiredError` (`RUNE_NAPI_REQUIRED`) est levée si le
binaire est absent, plutôt qu'un repli.

Il existe un validateur TypeScript, et il prenait le relais avec un
avertissement unique. Le verdict d'un schéma dépendait alors du chargement d'un
binaire préconstruit : deux déploiements du même code pouvaient diverger sur la
validité d'un payload, et celui qui repliait perdait la raison d'avoir du Rust.

Le chemin TypeScript reste pour ce que le moteur ne sait vraiment pas faire —
une règle custom, un traducteur, un fournisseur de messages. Là, il est la seule
implémentation, pas une seconde libre de diverger.

## Rappels recevant le champ

`in`, `notIn` et `enum` acceptent un rappel qui reçoit le champ, de sorte qu'une
liste dépendant de la requête est calculée par validation :

```ts
rune.enum((field) => field.meta.admin ? ['member', 'owner'] : ['member'])
rune.string().in((field) => allowedFor(field.meta.tenant))
```

`enum().getChoices()` relit la liste, pour qu'un formulaire affiche exactement
les options que le validateur acceptera — depuis une seule déclaration.

Également : `union().otherwise(cb)` rapporte quand aucune branche n'a matché, et
`record().validateKeys(cb)` contrôle l'ENSEMBLE des clés plutôt que les valeurs.
