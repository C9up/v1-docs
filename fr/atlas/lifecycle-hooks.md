# Atlas - Hooks de cycle de vie

Atlas déclenche des **hooks de cycle de vie** à chaque étape du pipeline CRUD,
sur le modèle de la surface de hooks d'AdonisJS Lucid. Décorez une méthode
**statique** de votre entité et Atlas l'invoque au moment correspondant — avant
ou après un save, un create, un update, un delete, un find, un fetch ou une
pagination.

```ts
import { BaseEntity, beforeSave } from '@c9up/atlas'
import { hash } from 'node:crypto' // ou votre helper de hachage

class User extends BaseEntity {
  declare password: string

  @beforeSave()
  static async hashPassword(user: User) {
    if (user.isDirty('password')) {
      user.password = await hash(user.password)
    }
  }
}
```

Comme le hook s'exécute avant chaque persistance et ne réhache que si `password`
est modifié (« dirty »), le même handler couvre à la fois l'INSERT initial et les
changements ultérieurs de mot de passe, sans jamais hacher deux fois.

## Les décorateurs

Chaque décorateur enregistre la méthode statique qu'il enveloppe comme handler
d'un type de hook. Les quatorze sont exportés depuis `@c9up/atlas` :

| Décorateur | Se déclenche | Le handler reçoit |
| --- | --- | --- |
| `@beforeSave()` / `@afterSave()` | autour de chaque INSERT **et** UPDATE | l'entité |
| `@beforeCreate()` / `@afterCreate()` | autour d'un INSERT uniquement | l'entité |
| `@beforeUpdate()` / `@afterUpdate()` | autour d'un UPDATE uniquement | l'entité |
| `@beforeDelete()` / `@afterDelete()` | autour d'une suppression | l'entité |
| `@beforeFind()` / `@afterFind()` | autour d'une lecture d'une seule ligne (`first()`) | la requête, puis l'entité ou `null` |
| `@beforeFetch()` / `@afterFetch()` | autour d'une lecture multi-lignes | la requête, puis le tableau d'entités |
| `@beforePaginate()` / `@afterPaginate()` | autour d'une lecture paginée | le tuple `[countQuery, query]`, puis le paginateur |

Le décorateur **doit** envelopper une méthode `static` — décorer une méthode
d'instance lève une erreur au moment de la définition de la classe.

## Signatures des handlers

L'argument est fixe pour chaque type de hook (à ne jamais inventer) :

- Les hooks de **persistance** (`save`/`create`/`update`/`delete`) reçoivent
  l'instance `BaseEntity` en cours d'écriture. Mutez-la sur place — un hook
  `beforeSave` peut normaliser ou hacher des champs, et c'est cette mutation qui
  est persistée.
- **`beforeFind`** et **`beforeFetch`** reçoivent le `ModelQuery` vivant, ce qui
  vous permet d'ajouter des scopes ou des contraintes avant son exécution.
- **`afterFind`** reçoit l'entité hydratée **ou `null`** (aucune correspondance) ;
  **`afterFetch`** reçoit le tableau `BaseEntity[]` hydraté.
- **`beforePaginate`** reçoit le tuple `[countQuery, query]` — mutez les **deux**
  pour garder le comptage et la page de résultats synchronisés.
  **`afterPaginate`** reçoit le `Paginator`.

Un handler renvoie `void` ou une `Promise<void>`. Les handlers sont **attendus
séquentiellement**, si bien qu'un hook peut terminer de muter l'entité avant que
le hook suivant (ou l'écriture en base) ne l'observe. Si un hook lève une erreur,
l'opération entière est abandonnée et l'erreur est propagée à l'appelant.

## Ordre

Le hook **spécifique** s'exécute avant le hook **général** `beforeSave`, et le
`afterSave` général s'exécute après le after-hook spécifique (ordre Lucid) :

```
create()  →  beforeCreate → beforeSave → INSERT → afterCreate → afterSave
update()  →  beforeUpdate → beforeSave → UPDATE → afterUpdate → afterSave
delete()  →  beforeDelete → DELETE → afterDelete
first()   →  beforeFind  → SELECT → afterFind
fetch     →  beforeFetch → SELECT → afterFetch
```

`save()` choisit la branche create ou update selon que la ligne existe déjà ou
non, puis déclenche toujours les hooks généraux `beforeSave` / `afterSave` autour
d'elle.

La pagination compose les hooks de fetch : `beforePaginate` se déclenche en
premier (avec le tuple), puis `beforeFetch` sur la requête de données ; une fois
la page construite, `afterPaginate` se déclenche avec le paginateur, puis
`afterFetch` avec les éléments.

### Héritage

Les hooks sont hérités via la chaîne de prototypes : un hook déclaré sur une
entité de base se déclenche aussi pour ses sous-classes. Lorsqu'un parent et un
enfant enregistrent tous deux des handlers pour le même type, **les hooks du
parent se déclenchent en premier** — ainsi une entité de base peut mettre en
place un scoping ou des valeurs par défaut que l'enfant affine ensuite.

## Museler les hooks : les variantes `Quietly`

Chaque méthode de dépôt (« repository ») mutante possède une jumelle `…Quietly`
qui effectue l'écriture identique **sans déclencher aucun hook** (parité AdonisJS
Lucid). Utilisez-les dans les seeders, les back-fills ou les migrations où les
effets de bord seraient erronés ou redondants :

```ts
await repo.createQuietly({ email, password })   // aucun beforeCreate/beforeSave/after*
await repo.saveQuietly(user)                     // aucun before/after save|create|update
await repo.createManyQuietly(rows)               // aucun hook par ligne
await repo.deleteQuietly(user)                    // aucun beforeDelete/afterDelete
```

Les méthodes `Quietly` sont le **seul** moyen de sauter les hooks — un `create()`,
`save()`, `createMany()` ou `delete()` normal déclenche toujours l'ensemble
complet.

> Gardez les hooks idempotents autant que possible. Lors de la course
> create/update concurrente de `save()`, un perdant de la course peut déclencher
> `beforeCreate` avant de retomber sur la branche UPDATE — placez donc les effets
> de bord non rejouables derrière un contrôle `isDirty(...)` (comme dans l'exemple
> du mot de passe) ou déplacez-les dans `afterCreate`/`afterUpdate`.
