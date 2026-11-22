# Messages d’erreur et i18n

Ce guide couvre les messages d’erreur et leur traduction :

- Messages d'erreur personnalisés
- Internationalisation (i18n)

## Messages d'erreur personnalisés

```typescript
rules.string()
  .min(3)
  .message('Le nom doit faire au moins 3 caractères')
  .email()
  .message('Veuillez entrer une adresse email valide')
```

La méthode `.message()` remplace le message de la **dernière** règle ajoutée.

### D'où vient un fournisseur de messages

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

### Les messages par défaut, et la clé à laquelle chaque règle répond

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
