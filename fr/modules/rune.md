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
> celle utilisée ci-dessus. `validate()` est le contrat qui lève : **async**,
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
  .uuid()         // N'importe quelle version — .uuid({ version: 4 }) en fixe une
  .url()          // Doit être une URL
  .regex(/…/)     // Doit correspondre au motif
  .in(['a'])      // Doit faire partie de ces valeurs
  .trim()         // Supprimer les espaces (transformation)
```

`uuid()` accepte une version, ou une liste : `uuid({ version: [4, 7] })`. Sans
précision, toutes les versions passent.

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

## Formats liés à un pays ou à une locale

Quatre règles valident une valeur contre une table par pays ou par locale :
codes postaux (71 pays), plans de numérotation mobile (169 locales), numéros de
passeport (61 pays) et numéros de TVA (69 pays).

```typescript
schema({
  zip:      rules.string().postalCode({ countryCode: 'CH' }),
  phone:    rules.string().mobile({ locale: ['fr-CH', 'de-CH'] }),
  passport: rules.string().passport({ countryCode: ['CH', 'FR'] }),
  vat:      rules.string().vat({ countryCode: 'CH' }),
})
```

Chaque option accepte aussi un rappel recevant le champ : une liste qui dépend
de la requête — les pays avec lesquels ce locataire commerce — se calcule à
chaque validation plutôt que d'être figée à l'import.

**Un pays ou une locale sans table lève une erreur, il ne passe pas.** Une
valeur qui se déclare « valide » parce que rien ne l'a vérifiée est exactement
la défaillance que ce paquet existe pour empêcher : la règle refuse d'être
construite.

```typescript
rules.string().postalCode({ countryCode: 'ZZ' })
// RuneError: postalCode(): no pattern for country 'ZZ'.
```

`mobile()` sans `locale` accepte un numéro correspondant à **n'importe quel**
plan connu, ou un numéro E.164 bien formé pour un pays qu'aucun plan ne couvre.
`mobile({ strictMode: true })` exige en plus le `+` et l'indicatif.

`vat()` vérifie le FORMAT pour tous les pays de la table, et vérifie en plus la
clé de contrôle pour les pays qui en définissent une courte et bien établie —
Belgique, Allemagne, Pays-Bas, Italie, Portugal, Luxembourg, Suisse et
Australie. Un numéro bien formé mais impossible est refusé.

## Normaliser une valeur

Deux transformations réécrivent une valeur sous la forme que son destinataire
utilise vraiment, pour que deux écritures de la même adresse se comparent.

### `normalizeEmail()`

Les règles par fournisseur sont **actives par défaut** — normaliser est ce que
vous avez demandé, et une option sert à en désactiver une.

```typescript
rules.string().email().normalizeEmail()
// 'A.D.A+news@GMail.com'  ->  'ada@gmail.com'
// 'A.B@googlemail.com'    ->  'ab@gmail.com'
// 'Ada-Lovelace-news@yahoo.com' -> 'ada-lovelace@yahoo.com'

rules.string().email().normalizeEmail({ gmail_remove_dots: false })
// 'a.d.a+news@gmail.com'  ->  'a.d.a@gmail.com'
```

Gmail, Outlook.com, Yahoo, Yandex et iCloud ont chacun leurs règles :
`all_lowercase`, `gmail_lowercase`, `gmail_remove_dots`,
`gmail_remove_subaddress`, `gmail_convert_googlemaildotcom`,
`outlookdotcom_lowercase`, `outlookdotcom_remove_subaddress`, `yahoo_lowercase`,
`yahoo_remove_subaddress`, `yandex_lowercase`, `yandex_convert_yandexru`,
`icloud_lowercase`, `icloud_remove_subaddress`. Un point doublé est conservé :
pour Gmail, `a..b` est une autre boîte.

### `normalizeUrl()`

Par défaut : `www.` retiré, paramètres `utm_*` supprimés, requête triée, slashes
répétés fusionnés et slash final retiré.

```typescript
rules.string().url().normalizeUrl()
// 'www.acme.test/?utm_source=x&b=2&a=1'  ->  'http://acme.test/?a=1&b=2'

rules.string().url().normalizeUrl({ stripWWW: false, sortQueryParameters: false })
```

`defaultProtocol`, `normalizeProtocol`, `forceHttp`, `forceHttps`,
`stripAuthentication`, `stripHash`, `stripTextFragment`, `stripWWW`,
`stripProtocol`, `removeQueryParameters`, `keepQueryParameters`,
`removeTrailingSlash`, `removeSingleSlash`, `removeDirectoryIndex`,
`removeExplicitPort`, `sortQueryParameters`, `removePath`, `transformPath`,
`emptyQueryValue` et `customProtocols` sont tous acceptés. Une URL non
analysable est rendue telle quelle, pour que `url()` la signale plutôt que la
transformation ne lève.

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

#### D'où vient un fournisseur de messages

Un fournisseur fournit les messages de classes entières de règles d'un coup, au
lieu d'un `.message()` à la fois. rune lit trois portées, de la plus étroite à la
plus large :

```ts
import rune, { SimpleMessagesProvider, schema, rules } from '@c9up/rune'

rune.messagesProvider = new SimpleMessagesProvider({ required: '{{ field }} est absent' })

const CreateUser = schema({ name: rules.string() })
CreateUser.messagesProvider = new SimpleMessagesProvider({
  required: '{{ field }} est obligatoire',
})

CreateUser.validateResult({})
// -> 'name est obligatoire'      (le fournisseur du validateur)

CreateUser.validateResult({}, {
  messagesProvider: new SimpleMessagesProvider({ required: 'il nous faut un {{ field }}' }),
})
// -> 'il nous faut un name'      (le fournisseur de l'appel gagne)
```

Mettez `validator.messagesProvider = null` pour retomber sur celui du processus.
Les trois mêmes portées valent pour `errorReporter`.

#### Les messages par défaut, et la clé à laquelle chaque règle répond

Chaque message par défaut vit dans un seul catalogue, indexé par le nom que la
règle rapporte. Ce nom est aussi la clé que consulte un fournisseur : lire le
catalogue dit donc exactement contre quoi écrire.

```ts
import { messages } from '@c9up/rune/defaults'

messages.minLength
// -> 'The {{ field }} field must have at least {{ min }} characters'
messages['array.minLength']
// -> 'The {{ field }} field must have at least {{ min }} items'
```

Une règle partagée entre plusieurs types est préfixée par le type qui la
possède — `array.minLength`, `record.maxLength`, `date.after`,
`nativeFile.minSize` — parce qu'une liste se mesure en éléments et une chaîne
en caractères :

```ts
const Signup = schema({
  tags: rules.array(rules.string()).minLength(2),
  password: rules.string(),
  passwordConfirmation: rules.string().sameAs('password'),
})

Signup.validateResult({ tags: ['a'], password: 'x', passwordConfirmation: 'x' }).errors[0]
// { field: 'tags',
//   rule: 'array.minLength',
//   message: 'The tags field must have at least 2 items',
//   meta: { min: 2 } }
```

`{{ field }}` rend le DERNIER segment du chemin du champ fautif — un `a.b`
imbriqué se lit donc « The b field … » ; tous les autres jetons viennent du
`meta` de la règle. Un fournisseur atteint **toutes** les règles, y compris
celles qui comparent deux champs et celles que vous avez écrites vous-même :

```ts
Signup.messagesProvider = new SimpleMessagesProvider({
  'array.minLength': 'Pick at least {{ min }} tags',
  sameAs: '{{ field }} must repeat {{ otherField }}',
})
// -> 'Pick at least 2 tags'
// -> 'passwordConfirmation must repeat password'
```

Un `.message()` explicite l'emporte toujours sur n'importe quel fournisseur.

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
// errors: [{ field: 'name', rule: 'min',
//            message: 'The name field must be at least 3', meta: { min: 3 } }]
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

Rune n'embarque aucun moteur i18n : Rosetta est le module i18n de l'écosystème.
Deux façons de l'atteindre — un traducteur pour le processus, ou un fournisseur
par requête.

### Un traducteur pour tout le processus

`bindRosetta` installe un traducteur que chaque validation consulte. La clé est
`validation.<règle>`, où `<règle>` est le nom que la règle **rapporte** : une
règle préfixée par le type qui la possède se référence donc ainsi.

```typescript
import { Rosetta } from '@c9up/rosetta'
import rune, { bindRosetta } from '@c9up/rune'

const i18n = new Rosetta({ defaultLocale: 'fr', fallbackLocale: 'en' })
i18n.loadMessages('fr', {
  'validation.required': 'Le champ {field} est obligatoire',
  'validation.minLength': 'Le champ {field} fait au moins {min} caracteres',
  'validation.array.minLength': 'Choisissez au moins {min} elements',
})

bindRosetta(i18n)

const CreateUser = rune.compile(
  rune.object({
    name: rune.string().minLength(4),
    tags: rune.array(rune.string()).minLength(2),
  }),
)

await CreateUser.validate({ name: 'ab', tags: ['a'] })
// 'Le champ name fait au moins 4 caracteres'
// 'Choisissez au moins 2 elements'
```

Les placeholders s'écrivent `{nom}`, et tous les arguments portés par la règle
sont disponibles à côté de `{field}` : `{min}`, `{max}`, `{size}`,
`{otherField}`.

### Un fournisseur par requête

Un traducteur global ne peut pas répondre à deux requêtes simultanées dans deux
langues. En HTTP, installez le hook une fois et chaque
`request.validateUsing(...)` récupère un fournisseur pour la locale de cette
requête :

```typescript
import { RequestValidator } from '@c9up/ream'

RequestValidator.messagesProvider = (ctx) => ctx.i18n.createMessagesProvider()
```

Ses clés sont `validator.shared.messages.<règle>`, et le libellé humain d'un
champ vit sous `validator.shared.fields.<champ>` :

```typescript
rosetta.loadMessages('fr', {
  'validator.shared.messages.minLength':
    'Le champ {field} fait au moins {min} caracteres',
  'validator.shared.fields.name': 'nom',
})
// -> 'Le champ nom fait au moins 4 caracteres'
```

Une règle sans traduction retombe sur le catalogue par défaut, rendu — pas sur
un gabarit brut.

### Lire une traduction directement

```typescript
i18n.setLocale('fr')

i18n.t('validation.required', { field: 'nom' })
// 'Le champ nom est obligatoire'
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

## Les clés que la forme ne déclare pas

Une clé non déclarée est **retirée**, et la charge est valide :

```ts
schema({ user: rules.object({ email: rules.string().email() }) })
  .validateResult({ user: { email: 'a@b.co', extra: 1 } })
// valide, data.user === { email: 'a@b.co' }
```

C'est ce qui rend une charge validée sûre à passer directement à une
affectation en masse, et c'est ce que fait l'écosystème dont rune reprend la
forme.

Deux options explicites changent ça :

| | |
| --- | --- |
| `.allowUnknownProperties()` | garder la clé dans la sortie |
| `.denyUnknownProperties()` | faire échouer la charge, en nommant la clé |

`denyUnknownProperties()` est pour une API dont le contrat est de refuser ce
qu'elle ne comprend pas. Un client qui envoie `emial` se le voit dire, au lieu
d'être ignoré en silence et de se demander pourquoi l'adresse n'a jamais
changé :

```
unknown field `emial`, expected one of email, password
```

Toutes les clés non déclarées sont rapportées, pas seulement la première, et
les clés déclarées sont validées par ailleurs.

## Les helpers qu'une règle personnalisée peut réutiliser

`rune.helpers` porte les prédicats qu'utilisent les règles de la chaîne — les
coercitions booléennes, les vérifications de format, les listes de pays. Une
règle personnalisée s'en sert plutôt que de réimplémenter une vérification qui
finirait par diverger de `rules.string().email()`.

```ts
import rune, { createRule } from '@c9up/rune'

const { isSlug, isVAT, getNestedValue, isDistinct, asDate } = rune.helpers

const handle = createRule((value, _options, field) => {
  if (typeof value !== 'string' || !isSlug(value)) {
    field.report('Doit être un slug', 'handle', field)
  }
})
```

Trois d'entre eux méritent une précision :

- **`getNestedValue(key, field)`** lit le **parent** immédiat pour un nom nu, et
  parcourt toute la charge utile pour un chemin pointé. Une règle qui tourne
  dans un item de tableau voit donc ses propres frères avec
  `getNestedValue('price', field)`.
- **`isDistinct(items)`** compare par **identité** — deux objets structurellement
  égaux sont deux items différents. Passez un ou plusieurs noms de champs
  (`isDistinct(rows, 'sku')`) pour comparer là-dessus ; une ligne à laquelle la
  clé manque ne participe pas, mais une ligne dont la clé vaut `null` participe.
- **`isPostalCode` / `isPassportNumber` / `isVAT`** répondent `null` quand rune
  n'a pas de table pour ce pays, au lieu de lever. `null` n'est pas `true` : les
  règles de la chaîne le traitent comme un refus.

`asDate(value, formats?)` analyse avec le même code que `date()` et renvoie une
`Date` native, ou `null`.

## Ce qu'acceptent un booléen, un nombre et une case à cocher

Les listes sont courtes et exactes — ni trim, ni normalisation de casse :

```ts
rules.boolean()   // "true" "on" "1" 1 true  →  true
                  // "false" "0" 0 false     →  false
                  // "TRUE", " true ", "off", "yes"  →  refusés

rules.accepted()  // "on" "1" "yes" "true" true 1  →  true
                  // "YES", "On", "off"            →  refusés
```

Élargir l'une de ces listes reviendrait à laisser une case de consentement
accepter en silence une écriture que personne n'a voulu envoyer.

`rules.number()` refuse une chaîne vide ou blanche au lieu de la lire comme
`0` — un champ texte laissé intact ne doit pas devenir une quantité de zéro.
Utilisez `.optional()` pour un champ qui peut être omis.

`rules.enum()` accepte une liste, un callback, ou un **enum TypeScript natif** :

```ts
enum Role { Admin = 'admin', User = 'user' }
schema({ role: rules.enum(Role) })
```

Un enum numérique accepte aussi les noms de ses membres, parce que c'est ce que
le mapping inverse de TypeScript met dans l'objet.

## Tester une règle personnalisée

Une règle construite avec `createRule` est un objet simple portant un
`run(value, field)` : la tester revient donc à construire le contexte de champ
qu'elle aurait reçu. Se tromper là-dessus revient à tester la règle contre une
forme qu'aucune validation réelle ne produit — les helpers construisent la
vraie.

```typescript
import { createRule } from '@c9up/rune'
import { runRule, runRuleAsync, fieldContext } from '@c9up/rune/testing'

const isEven = createRule((value, _options, field) => {
  if (typeof value !== 'number' || value % 2 !== 0) {
    field.report('Must be even', 'isEven', field)
  }
})

const result = runRule(isEven(), 3)
// { valid: false, errors: [{ field: 'field', rule: 'isEven', … }], value: 3 }
```

`runRule` rend `{ valid, errors, value }` — `value` porte ce que
`field.mutate()` a laissé. Les options façonnent le contexte : `path` (qui
détermine `name` et `wildCardPath`), `data` et `parent` pour une règle qui lit
ses voisines, `meta`, `isValid`.

```typescript
runRule(probe(), 'x', { path: 'tags.0', parent: ['x'] })
// la règle voit name === 0, wildCardPath === 'tags.*'
```

`runRule` refuse une règle asynchrone plutôt que d'annoncer un succès qu'elle
n'a pas attendu — `runRuleAsync` est la forme qui attend, et elle accepte aussi
une règle synchrone. `fieldContext(value, options)` construit un contexte seul,
pour une forme que les options de `runRule` n'expriment pas.

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
