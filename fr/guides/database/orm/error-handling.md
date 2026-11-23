# Gestion des erreurs

Ce guide couvre les erreurs d'atlas :

- L'espace de noms `errors`
- `E_ROW_NOT_FOUND`
- `E_MASS_ASSIGNMENT`
- `E_RELATION_NOT_LOADED`
- `E_OPTIMISTIC_LOCK`
- Les erreurs du compilateur et du pilote Rust
- Attraper par code ou par classe

Chaque erreur d'atlas porte un `code` stable : l'appelant branche sur le code
ou sur la classe plutôt que de comparer des chaînes sur les messages.

## L'espace de noms `errors`

Atlas déclare une classe d'erreur par code, nommée exactement comme le code, et
les exporte ensemble sous `errors` :

```ts
import { errors } from '@c9up/atlas'

try {
  await users.findOrFail(id)
} catch (err) {
  if (err instanceof errors.E_ROW_NOT_FOUND) {
    return response.notFound()
  }
  throw err
}
```

Chaque classe est une `Exception` de `@c9up/flare` ; toute erreur d'atlas porte
donc :

| Champ | Type | Description |
| --- | --- | --- |
| `code` | `string` | Le code stable, p. ex. `E_ATLAS_EMPTY_SELECT` ou `E_ROW_NOT_FOUND`. |
| `status` | `number` | Le statut HTTP par lequel répond un gestionnaire d'exceptions : 404 pour `E_ROW_NOT_FOUND`, 500 pour tous les autres codes. |
| `help` | `string \| undefined` | Quand il est présent, une suggestion actionnable pour corriger la cause. |
| `cause` | `unknown` | L'erreur d'origine, quand atlas en enveloppe une (un adaptateur de colonne qui a levé, un pilote qui ne s'est pas chargé, un refus natif). |

La plupart des codes n'ont aucun champ propre : le code et le message disent
tout — par exemple `E_EXTRA_PROPERTIES` (remplir une colonne non déclarée),
`E_MODEL_NOT_PERSISTED`, `E_MISSING_PRIMARY_KEY`, `E_STRICT_MODE` (SQL brut
refusé en mode strict), `E_ROLLBACK_DISABLED_IN_PRODUCTION` et
`E_ATLAS_MIGRATION_INVALID_TABLE_NAME`. Les quatre classes ci-dessous portent
aussi des données. La [référence des erreurs](/fr/reference/errors#erreurs-atlas)
liste tous les codes.

## `E_ROW_NOT_FOUND`

Levée quand une requête qui doit rendre une ligne n'en trouve aucune : les
`findOrFail`, `findByOrFail`, `refresh` et `fresh` du repository, et
`firstOrFail()` / `sole()` sur la requête de modèle et sur le builder
`db.from()`. Son statut est `404` : un gestionnaire d'exceptions qui ne
l'attrape pas répond `404` avec ce code. Son message est toujours
`Row not found` : ce qui était cherché reste dans `criteria`, hors du message
que reçoit le client.

```ts
import { errors } from '@c9up/atlas'

try {
  const user = await users.findOrFail(42)
} catch (err) {
  if (err instanceof errors.E_ROW_NOT_FOUND) {
    err.code        // 'E_ROW_NOT_FOUND'
    err.status      // 404
    err.model       // la classe User
    err.criteria    // { id: 42 }
    return response.notFound()
  }
  throw err
}
```

| Champ | Type | Description |
| --- | --- | --- |
| `status` | `404` | Le statut HTTP par lequel répond un gestionnaire d'exceptions. |
| `model` | classe de modèle \| `undefined` | La classe du modèle interrogé ; `undefined` pour une requête `db.from()`. |
| `criteria` | `unknown` | Le critère de recherche (p. ex. `{ id: 42 }` ou `{ email: 'a@b.c' }`), quand la recherche en avait un. |

Les variantes sans `OrFail` (`find`, `findBy`, `first`) renvoient `null` au lieu
de lever une erreur — utilisez-les lorsqu'une ligne absente est un résultat
attendu.

## `E_MASS_ASSIGNMENT`

Levée lorsque `fill()` / `merge()` (et les chemins du repository qui passent par
eux — `create`, `createMany`, `updateOrCreate`) tentent d'affecter un champ qui
n'est **pas** dans l'allowlist `static fillable` du modèle, ou qui **est** dans sa
denylist `static guarded`. C'est le garde-fou qui empêche une charge utile de
requête d'écrire une colonne sensible comme `role` ou `isAdmin`.

```ts
import { errors } from '@c9up/atlas'

class User extends BaseEntity {
  static guarded = ['role']
}

try {
  user.merge({ role: 'admin' }) // bloqué
} catch (err) {
  if (err instanceof errors.E_MASS_ASSIGNMENT) {
    err.code        // 'E_MASS_ASSIGNMENT'
    err.entityClass // 'User'
    err.attribute   // 'role'
  }
  throw err
}
```

| Champ | Type | Description |
| --- | --- | --- |
| `entityClass` | `string` | Le nom de la classe du modèle. |
| `attribute` | `string` | Le nom de l'attribut bloqué. |

Déclarez **soit** `fillable` (allowlist), **soit** `guarded` (denylist), jamais
les deux — déclarer les deux lève une erreur au moment du remplissage. Sans aucun
des deux, toute colonne déclarée est assignable en masse.

## `E_RELATION_NOT_LOADED`

Signale l'accès à une relation qui n'a été ni préchargée ni rendue disponible via
un chargeur paresseux, forçant l'appelant à être explicite sur le chargement.

| Champ | Type | Description |
| --- | --- | --- |
| `entityClass` | `string` | Le nom de la classe du modèle. |
| `relationName` | `string` | La relation qui a été accédée. |

Son `help` pointe vers la correction : `.preload('<relation>')` sur la requête,
ou `.load('<relation>')` sur l'instance.

> Statut : la classe d'erreur est exportée et stable, mais le runtime actuel ne
> la lève pas lors de l'accès à une relation — considérez-la comme un contrat
> réservé contre lequel vous prémunir, pas comme un chemin de code que vous
> pouvez déclencher aujourd'hui.

## `E_OPTIMISTIC_LOCK`

Représente un conflit de verrou optimiste à la sauvegarde : la ligne a été
modifiée par une autre transaction depuis sa lecture.

| Champ | Type | Description |
| --- | --- | --- |
| `entityClass` | `string` | Le nom de la classe du modèle. |
| `primaryKey` | `unknown` | La clé primaire de la ligne en conflit. |
| `expectedVersion` | `number` | La version que la sauvegarde s'attendait à écraser. |

Son `help` décrit la récupération : recharger l'entité, réappliquer vos
modifications, puis réessayer.

> Statut : il ne s'agit que de la classe d'erreur. Atlas ne fournit **pas** encore
> de mécanisme de colonne de version (il n'existe aucun décorateur `@Version()`,
> et rien dans l'ORM ne lève cette erreur aujourd'hui). La classe est exportée
> pour que le contrat soit stable en amont de la fonctionnalité — ne comptez pas
> encore sur l'application du verrouillage optimiste.

## Les erreurs du compilateur et du pilote Rust

Le compilateur de requêtes et le pilote de base de données sont écrits en Rust
et refusent eux-mêmes certaines instructions et connexions : un identifiant
dangereux (`E_UNSAFE_IDENTIFIER`), une expression hors de la forme admise
(`E_UNSAFE_EXPRESSION`), une fonctionnalité absente du dialecte
(`E_UNSUPPORTED`), un `sslmode` PostgreSQL qui retombe en clair
(`E_ATLAS_INSECURE_SSLMODE`)… Atlas relance chacun en la classe de son code,
l'erreur native en `cause` : vous les attrapez comme toute autre erreur d'atlas.

```ts
try {
  await User.query().select(userInput)
} catch (err) {
  if (err instanceof errors.E_UNSAFE_EXPRESSION) return response.badRequest()
  throw err
}
```

## Attraper par code ou par classe

`instanceof errors.E_…` et `err.code` sont équivalents ; la classe type en plus
les champs des quatre classes qui portent des données :

```ts
import { errors } from '@c9up/atlas'

try {
  await users.create(payload)
} catch (err) {
  if (err instanceof errors.E_ROW_NOT_FOUND) return response.notFound()
  if (err instanceof errors.E_MASS_ASSIGNMENT) return response.forbidden()
  throw err
}
```
