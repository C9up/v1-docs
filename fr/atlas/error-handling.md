# Atlas - Gestion des erreurs

Atlas lève une petite hiérarchie d'erreurs structurée afin que l'appelant puisse
brancher sur le **type** (`instanceof`) plutôt que de faire une comparaison de
chaînes sur les messages. Chaque erreur porte un `code` stable et un `hint`
optionnel.

## La classe de base `AtlasError`

Toutes les erreurs d'Atlas étendent `AtlasError`, qui étend elle-même l'`Error`
natif :

```ts
import { AtlasError } from '@c9up/atlas'

class AtlasError extends Error {
  readonly code: string    // stable, préfixé par `ATLAS_`
  readonly hint?: string   // suggestion optionnelle et actionnable
}
```

Le `code` est normalisé : un code passé sous la forme `E_ENTITY_NOT_FOUND` est
stocké comme `ATLAS_E_ENTITY_NOT_FOUND` (le préfixe `ATLAS_` est ajouté s'il est
absent). Attrapez la classe de base pour traiter uniformément n'importe quel
échec d'Atlas, ou une sous-classe pour traiter un cas précis :

```ts
try {
  await users.findOrFail(id)
} catch (err) {
  if (err instanceof AtlasError) {
    console.error(err.code, err.message, err.hint)
  }
  throw err
}
```

De nombreux échecs opérationnels sont levés comme un simple `AtlasError` avec un
code spécifique plutôt que comme une sous-classe dédiée — par exemple
`ATLAS_E_EXTRA_PROPERTIES` (remplir une colonne non déclarée),
`ATLAS_E_MODEL_NOT_PERSISTED` et `ATLAS_E_MISSING_PRIMARY_KEY`. Branchez sur
`err.code` pour ceux-là.

## `EntityNotFoundError`

Levée par les méthodes de recherche « fail-fast » du repository lorsqu'aucune
ligne ne correspond : `findOrFail` et `findByOrFail`.

```ts
import { EntityNotFoundError } from '@c9up/atlas'

try {
  const user = await users.findOrFail(42)
} catch (err) {
  if (err instanceof EntityNotFoundError) {
    err.code        // 'ATLAS_E_ENTITY_NOT_FOUND'
    err.entityClass // 'User'
    err.criteria    // { id: 42 }
    return response.notFound()
  }
  throw err
}
```

| Champ | Type | Description |
| --- | --- | --- |
| `entityClass` | `string` | Le nom de la classe du modèle interrogé. |
| `criteria` | `unknown` | Le critère de recherche (p. ex. `{ id: 42 }` ou `{ email: 'a@b.c' }`). |

Les variantes sans `OrFail` (`find`, `findBy`, `first`) renvoient `null` au lieu
de lever une erreur — utilisez-les lorsqu'une ligne absente est un résultat
attendu.

## `MassAssignmentError`

Levée lorsque `fill()` / `merge()` (et les chemins du repository qui passent par
eux — `create`, `createMany`, `updateOrCreate`) tentent d'affecter un champ qui
n'est **pas** dans l'allowlist `static fillable` du modèle, ou qui **est** dans sa
denylist `static guarded`. C'est le garde-fou qui empêche une charge utile de
requête d'écrire une colonne sensible comme `role` ou `isAdmin`.

```ts
import { MassAssignmentError } from '@c9up/atlas'

class User extends BaseEntity {
  static guarded = ['role']
}

try {
  user.merge({ role: 'admin' }) // bloqué
} catch (err) {
  if (err instanceof MassAssignmentError) {
    err.code      // 'ATLAS_E_MASS_ASSIGNMENT'
    err.entityClass // 'User'
    err.attribute // 'role'
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

## `RelationNotLoadedError`

Signale l'accès à une relation qui n'a été ni préchargée ni rendue disponible via
un chargeur paresseux, forçant l'appelant à être explicite sur le chargement.

```ts
import { RelationNotLoadedError } from '@c9up/atlas'
```

| Champ | Type | Description |
| --- | --- | --- |
| `entityClass` | `string` | Le nom de la classe du modèle. |
| `relationName` | `string` | La relation qui a été accédée. |

Le `hint` pointe vers la correction : `.preload('<relation>')` sur la requête, ou
`.load('<relation>')` sur l'instance.

> Statut : la classe d'erreur est exportée et stable, mais le runtime actuel ne
> la lève pas lors de l'accès à une relation — considérez-la comme un contrat
> réservé contre lequel se prémunir, pas comme un chemin de code que vous pouvez
> déclencher aujourd'hui.

## `OptimisticLockError`

Représente un conflit de verrou optimiste à la sauvegarde : la ligne a été
modifiée par une autre transaction depuis sa lecture.

```ts
import { OptimisticLockError } from '@c9up/atlas'
```

| Champ | Type | Description |
| --- | --- | --- |
| `entityClass` | `string` | Le nom de la classe du modèle. |
| `primaryKey` | `unknown` | La clé primaire de la ligne en conflit. |
| `expectedVersion` | `number` | La version que la sauvegarde s'attendait à écraser. |

Le `hint` décrit la récupération : recharger l'entité, réappliquer vos
modifications, puis réessayer.

> Statut : il ne s'agit que de la classe d'erreur. Atlas ne fournit **pas** encore
> de mécanisme de colonne de version (il n'existe aucun décorateur `@Version()`,
> et rien dans l'ORM ne lève cette erreur aujourd'hui). La classe est exportée
> pour que le contrat soit stable en amont de la fonctionnalité — ne comptez pas
> encore sur l'application du verrouillage optimiste.

## Attraper par code plutôt que par type

Préférez `instanceof` pour les quatre sous-classes typées — cela survit aux
changements de message et vous donne les champs typés. Repliez-vous sur
`err.code` pour les nombreux codes `AtlasError` simples qui n'ont pas de classe
dédiée :

```ts
import { AtlasError, EntityNotFoundError } from '@c9up/atlas'

try {
  await users.create(payload)
} catch (err) {
  if (err instanceof EntityNotFoundError) return response.notFound()
  if (err instanceof AtlasError && err.code === 'ATLAS_E_MASS_ASSIGNMENT') {
    return response.forbidden()
  }
  throw err
}
```
