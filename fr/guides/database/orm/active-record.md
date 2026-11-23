# Active record

Ce guide couvre BaseModel, le style active record :

- État du modèle
- Protection contre l'assignation de masse
- `fill()` / `merge()` et `$extras`
- Sérialiser `$extras`
- Visibilité de sérialisation
- Clés primaires auto-assignées
- Sérialiser un sous-ensemble
- Clés pivot du many-to-many

## BaseModel — Active Record

Étendez `BaseModel` (au lieu de `BaseEntity`) pour l'API Active Record : finders/créateurs statiques et `instance.save()` / `instance.delete()` qui délèguent à un dépôt lié à la connexion. `@Entity('table')` est **optionnel** — le nom de table est inféré du nom de classe (`User` → `users`) ; surchargez via `static table`.

```typescript
import { BaseModel, Column, PrimaryKey } from '@c9up/atlas'

class User extends BaseModel {
  @PrimaryKey() declare id: number
  @Column() declare email: string
  @Column() declare role: string

  static table = 'app_users'      // optionnel — inféré sinon
  static connection = 'analytics' // connexion nommée optionnelle
}

// Finders statiques
const user  = await User.find(1)
const admin = await User.findBy({ role: 'admin' })   // clause objet
const users = await User.findManyBy({ role: 'user' })
const first = await User.first()
const rows  = await User.query().where('role', 'admin').exec()

// Créateurs statiques
const u = await User.create({ email: 'a@b.co', role: 'user' })
await User.updateOrCreate({ email: 'a@b.co' }, { role: 'admin' })
await User.updateOrCreateMany('email', batch)   // en lot, keyé, transactionnel

// Persistance d'instance
if (user) {
  user.email = 'new@b.co'
  await user.save()    // UPDATE des colonnes dirty (INSERT si nouveau)
  await user.delete()  // DELETE de la ligne ; met $isDeleted
}
```

### État du modèle

```typescript
user.$isPersisted     // true dès que la ligne est en base (après save/fetch)
user.$isNew           // jamais persisté
user.$isLocal         // créé en mémoire (vs récupéré de la base)
user.$isDeleted       // mis à true après delete()
user.$primaryKeyValue // la valeur de la colonne PK
user.isDirty('email')
```

### Protection contre l'assignation de masse

`static fillable` / `static guarded` sont appliqués sur `create`, `createMany` et `updateOrCreate` — pas seulement sur `fill()` — donc une colonne `guarded` ne peut pas être posée depuis un payload brut :

```typescript
class User extends BaseModel {
  static guarded = ['role'] // jamais assignable en masse
}
await User.create({ email: 'a@b.co', role: 'admin' }) // lève E_MASS_ASSIGNMENT
```

Le filtre s'applique à la clé telle que fournie **et** à la propriété qu'elle
résout, pour qu'un nom de colonne ne passe pas devant une garde écrite contre
l'attribut :

```typescript
await User.create({ role: 'admin' })   // E_MASS_ASSIGNMENT
await User.create({ is_admin: true })  // E_MASS_ASSIGNMENT — résout vers isAdmin
```

### `fill()` / `merge()` et `$extras`

Une clé de charge utile est résolue dans cet ordre : propriété déclarée,
puis nom de colonne DB correspondant, puis relation (ignorée — celles-là se
posent par leur propre API), puis état interne du framework (ignoré). Ce qui
reste est un extra :

```typescript
// Le nom de colonne résout vers sa propriété — une charge utile venant
// directement d'une API ou d'une row brute est clé par `created_at`.
user.merge({ created_at: '2026-01-01' })   // pose user.createdAt

// Une clé inconnue lève par défaut…
user.merge({ comments_count: 3 })          // E_EXTRA_PROPERTIES

// …et est CONSERVÉE dans $extras quand on l'autorise, au lieu d'être jetée.
user.merge({ comments_count: 3 }, true)
user.$extras.comments_count                // 3
```

`$extras` n'est jamais une colonne, il ne peut donc jamais atteindre un INSERT.
`create()` prend le même `{ allowExtraProperties: true }` et se comporte pareil.

### Sérialiser `$extras`

À activer par modèle. `true` niche le sac sous `meta` — étalé au
premier niveau, un agrégat pourrait entrer en collision avec une vraie colonne
du même nom :

```typescript
class User extends BaseModel {
  serializeExtras = true
}

user.toJSON()   // { id: 1, email: 'a@b.co', meta: { posts_count: 5 } }
```

Une fonction choisit la forme à la place, et reçoit le sac :

```typescript
class User extends BaseModel {
  static serializeExtras = (extras: Record<string, unknown>) => ({
    total: extras.posts_count,
  })
}
```

`serializeExtras` peut aussi se poser sur l'instance ; les deux formes marchent
et l'instance gagne.

### Visibilité de sérialisation

Cacher une colonne définitivement à sa déclaration, et rogner une réponse au
point d'appel :

```typescript
class User extends BaseModel {
  @column({ serializeAs: null }) declare password: string // jamais sérialisée
}

user.serialize({ fields: { omit: ['email'] } })      // rogner cette réponse
user.serialize({ fields: ['id', 'email'] })          // ou ne garder que celles-ci
user.serialize({                                     // les relations aussi
  fields: ['id'],
  relations: { posts: { fields: ['id', 'title'] } },
})
```

`toJSON()` délègue à trois hooks surchargeables — surcharge uniquement la couche
voulue (`serializeAttributes` / `serializeRelations` / `serializeComputed`) :

```typescript
class Account extends BaseModel {
  @Column() declare balance: number
  // Personnalise seulement la couche attributs ; relations/computed inchangés.
  protected override serializeAttributes() {
    return { ...super.serializeAttributes(), balance: Math.round(this.balance) }
  }
}
```

Surface statique complète : `find`, `findOrFail`, `findBy`, `findByOrFail`, `findMany`, `findManyBy`, `all`, `first`, `firstOrFail`, `query`, `create`, `createMany`, `firstOrCreate`, `firstOrNew`, `updateOrCreate`, `updateOrCreateMany`, `fetchOrCreateMany`, `fetchOrNewUpMany`, `truncate`, plus `createQuietly` / `createManyQuietly` (sans hooks).

Les instances ajoutent `saveQuietly()` / `deleteQuietly()` — persister/supprimer sans déclencher les hooks de cycle de vie (pratique pour seeders/backfills). `save()` lève une erreur dès que l'instance est supprimée (`$isDeleted`), et `$isDirty` indique les changements non sauvegardés.

### Clés primaires auto-assignées

Posez `selfAssignPrimaryKey` quand l'app produit l'id — un UUID dans un hook
`beforeCreate`, un id choisi par l'appelant — pour que l'insert ne le redemande
pas à la base.

```ts
class Invoice extends BaseModel {
  static selfAssignPrimaryKey = true
  @PrimaryKey() declare id: string
}
```

Sans lui, la valeur renvoyée par la base écrase l'id que l'app venait de choisir,
et toutes les références déjà distribuées pointent sur la mauvaise ligne.

### Sérialiser un sous-ensemble

`serialize()` taille le parent **et** ses relations en une passe. Le faire après
coup signifie que les colonnes exclues ont déjà été sérialisées — y compris
celles qu'on voulait justement écarter.

```ts
post.serialize({ fields: ['id', 'title'] })
post.serialize({ fields: { omit: ['password'] } })
post.serialize({
  fields: ['id', 'title'],
  relations: { author: { fields: ['id', 'name'] } },
})
```

`pick` l'emporte sur `omit` quand les deux sont donnés — l'expression d'intention
la plus étroite.

`fields` réduit les colonnes et les valeurs calculées. Chaque relation est
sérialisée par son propre modèle avec les options données sous `relations` : une
colonne que ce modèle masque avec `serializeAs: null` ne peut pas être récupérée
en la nommant, et omettre un champ n'en expose jamais.

### Clés pivot du many-to-many

Les deux orthographes sont acceptées ; chaque ligne nomme la même clé :

| Courte | Longue |
|---|---|
| `foreignKey` | `pivotForeignKey` |
| `otherKey` | `pivotRelatedForeignKey` |
