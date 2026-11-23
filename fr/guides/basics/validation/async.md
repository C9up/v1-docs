# Validation asynchrone

Ce guide couvre les règles qui attendent une entrée-sortie :

- `validateResultAsync` / `validateOrThrowAsync`
- Règles adossées à la base : `unique` / `exists`
- Règles asynchrones personnalisées : `createAsyncRule` / `useAsync`

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
// retourne le T validé, ou lève errors.E_VALIDATION_ERROR (HTTP 422)
```

`validateResultAsync` exécute d'abord les règles synchrones, puis attend les règles
asynchrones de chaque champ. Une règle asynchrone ne s'exécute que lorsque le
champ **a passé ses règles synchrones** et possède une valeur présente et non
nulle — une requête en base est ignorée pour un champ déjà invalide ou absent.

> Le `validateResult()` synchrone **lève une erreur** sur un schéma qui contient
> des règles asynchrones plutôt que de les ignorer silencieusement :
> `rune: this schema has async rules (unique/exists/useAsync) — call validateResultAsync() (result-based) or validate() (throwing) instead of validateResult().`
> Il en va de même pour `validateOrThrow()`, qui appelle `validateResult()` en interne.

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

Un validateur déclaré `async` est détecté tout seul. Quand il n'est **pas**
déclaré `async` mais renvoie quand même une promesse, dites-le — les deux
écritures fonctionnent :

```ts
const unique = createRule(
  (value, table, field) => db.exists(table, value).then((taken) => {
    if (taken) field.report('déjà pris', 'unique')
  }),
  { async: true },   // `{ isAsync: true }` est la même chose
)
```

Sans cela la règle est construite synchrone, et son verdict tomberait après la
fin de la validation. rune refuse net plutôt que d'annoncer un succès que
personne n'a attendu : `E_RUNE_ASYNC_RULE_NOT_AWAITED`.

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
