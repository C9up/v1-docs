# Atlas - Factories de modèles

Les factories génèrent des données de test — compatibles Lucid. Elles
construisent des instances de modèle à partir d'un callback de valeurs par
défaut, superposent des états nommés, surchargent des champs à la volée et (sur
le chemin de persistance) créent des lignes liées. `faker` est câblé pour les
fausses données.

## Définir une factory

Deux points d'entrée équivalents. Le raccourci en un appel
`factory(Model, defaults)`, ou la forme `Factory.define(Model, defaults).build()`
(parité AdonisJS Lucid) :

```ts
import { factory, Factory } from '@c9up/atlas'
import { User } from '#models/user'

// Raccourci — retourne directement le builder.
const UserFactory = factory(User, ({ faker }) => ({
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: 'member',
}))

// Forme Lucid `define().build()` — résultat identique.
const UserFactory2 = Factory.define(User, ({ faker }) => ({
  email: faker.internet.email(),
})).build()
```

Le callback de valeurs par défaut reçoit un `FactoryContext` —
`{ faker, isStubbed, $trx }` — et retourne la forme de la ligne. Il est
réévalué par ligne sur `makeMany`/`createMany`, si bien que `faker` produit des
valeurs distinctes à chaque fois.

## `make` vs `create` vs `makeStubbed`

| Méthode | Persiste ? | Clé primaire | `$isPersisted` |
| --- | --- | --- | --- |
| `make()` | Non | aucune | `false` |
| `makeStubbed()` | Non | stub id (unique au processus) | `true` |
| `create()` | Oui (INSERT) | vrai id BDD | `true` |

- `make()` construit une instance simple non persistée — aucun aller-retour BDD,
  pas de clé primaire. À utiliser pour exercer la logique du modèle (propriétés
  calculées, validation).
- `makeStubbed()` construit une instance non persistée qui *ressemble* à une
  ligne enregistrée : elle est marquée persistée et reçoit un **stub id** unique
  au processus (sauf si la construction a déjà défini la clé primaire), de sorte
  que les relations et la sérialisation fonctionnent sans toucher la BDD.
- `create()` persiste via le repository, en déclenchant les hooks de cycle de vie
  du modèle, et retourne la ligne avec son vrai id de base de données.

Chacune a une variante `*Many` : `makeMany(n)`, `makeStubbedMany(n)`,
`createMany(n, db)`.

## define + create + createMany + state

```ts
const UserFactory = factory(User, ({ faker }) => ({
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: 'member',
}))
  .state('admin', (user) => { user.role = 'admin' })
  .state('suspended', (user) => { user.suspendedAt = new Date() })

// Une ligne persistée.
const user = await UserFactory.create(db)

// Dix lignes, valeurs faker distinctes par ligne.
const members = await UserFactory.createMany(10, db)

// Activer un état nommé pour la prochaine construction.
const admin = await UserFactory.apply('admin').create(db)

// Les états se composent — plusieurs apply s'exécutent tous, dans l'ordre.
const banned = await UserFactory.apply('admin', 'suspended').create(db)
```

## États

`state(name, fn)` déclare une variation nommée ; le callback reçoit l'**instance**
construite et le contexte. `apply(...names)` active un ou plusieurs états pour la
**prochaine** construction uniquement (l'ensemble en attente est réinitialisé
après chaque make/create). Un nom d'état non défini lève une erreur.

```ts
const factory = UserFactory
  .state('verified', (user, { faker }) => {
    user.verifiedAt = faker.date.past()
  })

const u = factory.apply('verified').makeStubbed()
```

## Surcharger des champs — `merge` / `mergeRecursive`

`merge()` surcharge des champs pour le prochain appel uniquement (réinitialisé
après consommation). Il accepte trois formes :

```ts
// Objet — fusion superficielle sur les attributs résolus.
UserFactory.merge({ name: 'Alice' }).create(db)

// Callback — muter l'instance construite de façon impérative (Lucid `merge`).
UserFactory.merge((user, attributes) => { user.name = attributes.name }).make()

// Tableau — surcharge par ligne sur makeMany/createMany (index i → ligne i).
UserFactory.merge([{ role: 'admin' }, { role: 'member' }]).createMany(2, db)
```

`mergeRecursive()` fusionne en profondeur les objets simples imbriqués clé par
clé au lieu de les remplacer entièrement (Lucid `mergeRecursive`) ; les tableaux
et les valeurs non simples remplacent toujours. Sur un graphe `.with()`, un merge
récursif se propage en cascade sur chaque factory liée.

## Stub ids

Chaque construction `makeStubbed*` sans clé primaire explicite reçoit la valeur
suivante d'un compteur global au processus — des identifiants stables, distincts
et sans BDD. Pour les modèles à clé primaire non entière (uuid, etc.), surcharger
le générateur globalement :

```ts
import { Factory } from '@c9up/atlas'
import { randomUUID } from 'node:crypto'

Factory.stubId((counter, model) => randomUUID())

// Restaurer l'entier incrémental par défaut.
Factory.stubId(null)
```

Le callback reçoit le compteur courant et l'instance et retourne l'id à assigner.

## Construire des relations — `relation` + `with`

Déclarer quelle factory construit une relation, puis mettre en file les lignes
liées avec `with()`. `with()` s'exécute sur le **chemin de persistance
uniquement** — `make`/`makeStubbed` l'ignorent.

```ts
const PostFactory = factory(Post, ({ faker }) => ({
  title: faker.lorem.sentence(),
}))

const UserFactory = factory(User, ({ faker }) => ({
  email: faker.internet.email(),
}))
  .relation('posts', () => PostFactory)

// Créer un utilisateur avec 3 posts (atomique — voir ci-dessous).
const user = await UserFactory.with('posts', 3).create(db)
```

`relation(name, resolver)` — `name` doit correspondre à une propriété de relation
déclarée avec `@HasMany` / `@HasOne` / `@BelongsTo` / `@ManyToMany`.
`with(name, count?, callback?)` met en file `count` (par défaut 1) lignes liées ;
le callback reçoit la factory liée pour la personnaliser — `merge` / `apply`,
`.pivotAttributes()`, et son propre `.with()` imbriqué (arbitrairement profond) :

```ts
const user = await UserFactory
  .with('posts', 3, (post) => {
    post.merge({ published: true }).with('comments', 5)
  })
  .create(db)
```

Lorsqu'un graphe `.with()` est présent, tout le graphe s'exécute dans une
transaction gérée : si une écriture liée échoue, l'INSERT du parent est aussi
annulé. Un nom de relation sans factory enregistrée, ou une relation non
déclarée, lève une erreur.

### Attributs de pivot (plusieurs-à-plusieurs)

À l'intérieur d'un callback `.with()` sur une relation plusieurs-à-plusieurs,
`pivotAttributes()` définit des colonnes écrites sur la ligne de pivot à côté du
lien. Un objet unique s'applique à chaque ligne liée ; un tableau définit des
valeurs par ligne (sa longueur doit correspondre au nombre de lignes liées, sinon
il lève une erreur) :

```ts
const user = await UserFactory
  .with('roles', 2, (role) => {
    role.pivotAttributes([{ scope: 'read' }, { scope: 'write' }])
  })
  .create(db)
```

## Hooks de cycle de vie — `before` / `after` / `tap`

`before(event, cb)` et `after(event, cb)` enregistrent des hooks **persistants**
(déclarés une fois, se déclenchent à chaque construction). Le callback reçoit la
factory, l'instance du modèle et le contexte.

```ts
const UserFactory = factory(User, ({ faker }) => ({ email: faker.internet.email() }))
  .before('create', (_factory, user) => { user.slug = user.email.split('@')[0] })
  .after('create', (_factory, user) => { /* la ligne est insérée ici */ })
```

- `before` : `'create'` se déclenche avant l'INSERT ; `'makeStubbed'` se déclenche
  avant que le stub id ne soit finalisé (pour qu'un hook puisse assigner la clé
  primaire).
- `after` : `'create'` se déclenche après l'INSERT ; `'makeStubbed'` après la
  construction du stub ; `'make'` après la construction d'une instance non
  persistée `make`/`makeMany`.

`tap(fn)` est **transient** (réinitialisé après consommation) et s'exécute sur
l'instance construite sur chaque chemin produisant une instance
(`make`/`makeMany`/`create`/`createMany`/`makeStubbed*`). Il reçoit le modèle, le
contexte et le builder :

```ts
UserFactory.tap((user, { faker }) => { user.token = faker.string.uuid() }).make()
```

## Instanciation personnalisée — `newUp`

Remplacer le `new Model()` par défaut et l'assignation de propriétés (Lucid
`.newUp`). Le callback reçoit les attributs résolus et le contexte et retourne
l'instance à utiliser pour chaque construction suivante :

```ts
UserFactory.newUp((attributes) => {
  const user = new User()
  user.merge(attributes)
  return user
})
```

## Lier une connexion

`create`/`createMany` prennent un argument `db` explicite, ou vous pouvez en lier
un pour que les appels qui l'omettent utilisent la liaison (idéal pour l'isolation
des tests avec une transaction) :

```ts
// Lier directement une transaction/connexion (Lucid `.client`).
UserFactory.client(trx).create()

// Résoudre une connexion enregistrée par son nom (Lucid `.connection`).
UserFactory.connection('primary').create()

// Sucre syntaxique via objet d'options (Lucid `.query({ client }) / .query({ connection })`) ;
// `client` l'emporte sur `connection`.
UserFactory.query({ client: trx }).createMany(5)
```

Le `db` explicite passé à `create()`/`createMany()` l'emporte toujours sur la
connexion liée. Sans aucune connexion, `create`/`createMany` lèvent une erreur.
