# Atlas - Relations

## Types supportés

- `@HasMany`
- `@BelongsTo`
- `@ManyToMany`

## Exemple

```ts
import { BaseEntity, Entity, PrimaryKey, Column, HasMany, BelongsTo, ManyToMany } from '@c9up/atlas'

@Entity('users')
class User extends BaseEntity {
  @PrimaryKey() id!: string
  @Column() email!: string

  @HasMany(() => Post)
  posts!: Post[]

  @ManyToMany(() => Role, {
    pivotTable: 'user_roles',
    foreignKey: 'user_id',
    otherKey: 'role_id',
  })
  roles!: Role[]
}

@Entity('posts')
class Post extends BaseEntity {
  @PrimaryKey() id!: string
  @Column() userId!: string

  @BelongsTo(() => User)
  user!: User
}
```

## Chargement

Les relations ne sont pas chargées automatiquement. Utiliser `preload`:

```ts
const users = repo.query()
  .preload('posts')
  .preload('roles')
  .exec()
```

## N+1

`preload` déclenche des requêtes batchées (`IN (...)`) pour éviter le N+1.

## Extras typés sur table pivot

Les tables pivot peuvent porter des colonnes au-delà des deux clés étrangères (par ex. un `amount` Decimal sur une jointure `users_orders`). Déclarer un adapter par colonne dans `pivotColumnAdapters` route la valeur via `prepare` sur `attach()` / `sync()` — même forme `{ prepare?, consume? }` que `@Column()`. Sans adapter, les valeurs brutes sont bindées telles quelles (le pilote `pg` Postgres coerce les objets inconnus via `.toString()`, ce qui donne souvent `[object Object]` pour les objets plats ; mysql2 peut rejeter le bind).

```ts
import { BaseEntity, Entity, PrimaryKey, ManyToMany } from '@c9up/atlas'
import { Decimal, decimalAtlasAdapter } from '@c9up/atom/atlas'

@Entity('users')
class User extends BaseEntity {
  @PrimaryKey() id!: number

  @ManyToMany(() => Order, {
    pivotTable: 'users_orders',
    pivotColumns: ['amount'],
    pivotColumnAdapters: { amount: decimalAtlasAdapter },
  })
  orders!: Order[]
}

await user.related('orders').attach({
  [orderId]: { amount: new Decimal('1.5') }, // encoded to '1.5' via decimalAtlasAdapter.prepare
})
```

**Null-safety.** Les adapters doivent gérer `null` et `undefined` eux-mêmes. Quand `attach()` est appelé avec des entrées hétérogènes — la même clé extra présente sur certaines entrées et absente sur d'autres — atlas back-fill les lignes manquantes avec `null` AVANT d'appeler `prepare`, donc votre adapter doit être null-safe même si aucun appelant n'a écrit null explicitement.

**Dormance côté load.** Le callback `consume` de l'adapter est parsé et stocké sur les métadonnées de relation, mais le mécanisme de projection `$extras.pivot_<col>` n'a pas encore atterri — `consume` est actuellement inerte et s'activera quand la projection sera livrée dans une future story.

**Clés réservées.** Les extras pivot NE DOIVENT PAS utiliser les noms de colonnes FK (`foreignKey`/`otherKey`) ni les noms de colonnes timestamp de `pivotTimestamps`. atlas throw à l'appel de `attach()` quand un appelant passe l'une de ces clés en extra (un override silencieux de FK / une colonne timestamp dupliquée corromprait la ligne).

**Écritures atomiques (parité Adonis Lucid).** `related('skills').create/save/createMany/saveMany`
exécutent toute la chaîne — persister un parent non sauvegardé, écrire la/les
ligne(s) liée(s), insérer la/les ligne(s) pivot — dans UNE transaction. Tout
échec annule l'ensemble : pas de ligne liée orpheline, pas de pivot pointant vers
un parent inexistant. Les domain events ne sont flushés qu'après le commit.

**Sémantique de `sync()` (parité Adonis Lucid).** `sync(target)` réconcilie le pivot pour qu'il corresponde exactement à `target` : les lignes manquantes sont attachées, les lignes absentes de la cible sont détachées, et **les lignes déjà attachées dont les attributs pivot ont changé sont MISES À JOUR sur place** (seules les lignes modifiées, seul `updated_at` est bump — un `sync` sans changement n'écrit rien). Passer `sync(target, true)` pour un sync additif (attach + update, jamais de detach). La lecture et les trois écritures s'exécutent dans **une seule transaction managée** — atomique, annulée en cas d'échec, pour qu'un writer concurrent ne puisse pas figer le pivot dans un état à demi synchronisé. Les clés en forme objet (`sync({ 1: {...} })`) arrivent en `string` depuis JS ; un entier canonique est recoercé en nombre avant le bind et le diff compare par identité de chaîne, si bien qu'une PK liée entière ne reçoit jamais un bind `text` (rejeté par Postgres) et ne subit aucun churn.

## `@HasOne` — ligne liée unique

`@HasOne` (alias `hasOne`) est le pendant un-à-un de `@HasMany` : la FK vit sur la
table LIÉE et exactement une ligne est attendue. Les options sont la même forme
`{ localKey, foreignKey, onQuery, serializeAs }` que `@HasMany`.

```ts
import { BaseEntity, Entity, PrimaryKey, Column, HasOne } from '@c9up/atlas'

@Entity('users')
class User extends BaseEntity {
  @PrimaryKey() declare id: string

  @HasOne(() => Profile)
  declare profile: Profile
}

@Entity('profiles')
class Profile extends BaseEntity {
  @PrimaryKey() declare id: string
  @Column() declare userId: string
  @Column() declare bio: string
}
```

Preload et lazy-load comme n'importe quelle relation :

```ts
const user = await repo.query().preload('profile').first()
await user.load('profile') // lazy, après coup
```

Le proxy `related('profile')` expose `create` / `save` (qui posent la FK
automatiquement) plus les helpers d'upsert `firstOrCreate` / `updateOrCreate`,
scopés sur la FK du parent. `createMany` / `saveMany` sont volontairement absents
sur une relation à ligne unique — les appeler throw (et est typé `Promise<never>`).

```ts
await user.related('profile').create({ bio: 'Hello' })

await user.related('profile').firstOrCreate(
  { userId: user.id },      // search
  { bio: 'Default bio' },   // defaults appliqués uniquement à l'insert
)

await user.related('profile').updateOrCreate(
  { userId: user.id },
  { bio: 'Fresh bio' },
)
```

## Affectation `@BelongsTo` — `associate` / `dissociate`

Sur une relation `@BelongsTo`, la FK vit sur **ce** modèle, donc les seules
écritures sont lier et délier un propriétaire. `related(rel).associate(owner)`
pose `this.<fk> = owner.<ownerKey>` et sauvegarde ce modèle ; `dissociate()` vide
la FK et sauvegarde. `create` / `save` / `createMany` / `saveMany` NE sont PAS
valides sur un proxy belongsTo (ils throw et sont typés `Promise<never>`) — à
l'image d'Adonis Lucid, dont le client belongsTo n'expose que `associate` /
`dissociate`.

```ts
const post = await postRepo.query().where('id', 10).first()
const author = await userRepo.query().where('id', 1).first()

await post.related('user').associate(author) // post.userId = author.id, sauvegardé
await post.related('user').dissociate()       // post.userId = null, sauvegardé
```

`associate` rejette un propriétaire `null` / `undefined`.

## Relations « through » — `@HasOneThrough` / `@HasManyThrough`

Les relations à deux sauts traversent une table intermédiaire (« through ») pour
atteindre les lignes liées. `@HasManyThrough` (alias `hasManyThrough`) renvoie un
tableau ; `@HasOneThrough` (alias `hasOneThrough`) renvoie une seule ligne. Les
deux prennent la cible liée, la cible intermédiaire, et un objet d'options
`{ firstKey, secondKey, localKey, secondLocalKey, onQuery }` :

- `firstKey` — FK sur la table intermédiaire pointant vers le parent (défaut `${parent}_${parentPk}`).
- `secondKey` — FK sur la table liée pointant vers l'intermédiaire (défaut `${intermediate}_${intermediatePk}`).
- `localKey` — colonne de jointure locale côté parent (défaut PK du parent).
- `secondLocalKey` — colonne de jointure locale côté intermédiaire matchée par `secondKey` (défaut PK de l'intermédiaire).

## Clés étrangères par défaut

Toute relation dont tu ne nommes pas la clé étrangère la dérive de la stratégie
de nommage du modèle et de sa **vraie clé primaire**, en snake_case — c'est le
`relationForeignKey` / `relationPivotForeignKey` de Lucid :

```ts
@Entity('users')
class User extends BaseEntity {
  @PrimaryKey() declare id: number
}
// clé étrangère par défaut -> user_id

@Entity('accounts')
class Account extends BaseEntity {
  @PrimaryKey() declare uuid: string
}
// clé étrangère par défaut -> account_uuid, et non account_id
```

Pour un `id` classique, c'est exactement ce que c'était déjà. Un modèle clé par
autre chose recevait jusqu'ici une colonne qui n'existe pas.

Pour changer la règle sur tout un modèle, `static namingStrategy` :

```ts
class Prefixed extends CamelCaseNamingStrategy {
  override relationForeignKey(_kind, parentClass, parentPk) {
    return `fk_${camelToSnake(parentClass)}_${parentPk}`
  }
}
```

::: warning Écart nommé
Ici, `relationForeignKey` rend un nom de **colonne**. La méthode du même nom
chez Lucid rend l'attribut du modèle en camelCase, qu'elle passe ensuite dans
`columnName()` ; celle qui rend une colonne, en amont, c'est
`relationPivotForeignKey`. Atlas résout les relations par colonne de bout en
bout, donc une seule méthode répond pour les deux — une surcharge doit rendre un
nom de colonne.
:::

```ts
import { BaseEntity, Entity, PrimaryKey, Column, HasManyThrough, HasOneThrough } from '@c9up/atlas'

@Entity('countries')
class Country extends BaseEntity {
  @PrimaryKey() declare id: string

  // country → users → posts
  @HasManyThrough(() => Post, () => User)
  declare posts: Post[]

  // ligne unique via les deux mêmes sauts
  @HasOneThrough(() => Post, () => User)
  declare latestPost: Post
}

@Entity('users')
class User extends BaseEntity {
  @PrimaryKey() declare id: string
  @Column() declare countryId: string
}

@Entity('posts')
class Post extends BaseEntity {
  @PrimaryKey() declare id: string
  @Column() declare userId: string
}
```

Preload ou lazy-load de la même façon :

```ts
const countries = await repo.query().preload('posts').exec()
await country.load('latestPost')
```

> Les relations through sont **en lecture seule**. Lucid n'expose pas de
> persistance sur une relation through — on écrit via le modèle intermédiaire à la
> place. `related(rel).query()` traverse les deux sauts ; `create` / `save` /
> `createMany` / `saveMany` throw à l'exécution et sont typés `Promise<never>`.
> `@HasManyThrough` est en parité Lucid ; `@HasOneThrough` est un ajout atlas
> (Lucid n'a pas cette relation) — la même traversée à deux sauts renvoyant une
> ligne au lieu d'un tableau.

## `loadOnce` — lazy load idempotent

`entity.loadOnce(relationName, callback?)` est comme `load()` mais un no-op quand
la relation est déjà peuplée sur l'instance (AdonisJS Lucid `loadOnce`). Utile
dans les chemins de code partagés où l'on ne sait pas si un appelant a déjà
préchargé la relation. Chaînable.

```ts
await user.loadOnce('profile')   // charge seulement si user.profile est undefined
await user.loadOnce('profile')   // le second appel ne fait rien
```

## `pivotQuery` — accès direct à la table pivot

Au-delà de `attach` / `detach` / `sync`, un proxy `@ManyToMany` expose
`pivotQuery()` — un query builder au niveau connexion sur la **table pivot
elle-même**, déjà scopé sur ce parent (AdonisJS Lucid `pivotQuery`). À utiliser
pour lire ou mettre à jour les lignes pivot directement.

```ts
// lire les lignes pivot de cet utilisateur
const rows = await user.related('roles').pivotQuery().select('*')

// mettre à jour un extra pivot directement
await user.related('roles').pivotQuery()
  .where('role_id', roleId)
  .update({ amount: '2.0' })
```

## Bonnes pratiques

- Nommer explicitement la pivot table en many-to-many.
- Garder des clés FK stables et cohérentes (`user_id`, `role_id`).
- Limiter le preload profond sur les endpoints sensibles perf.
- Préférer `loadOnce` à `load` dans du code réutilisable susceptible de s'exécuter après un preload.
- Traiter les relations through comme des chemins de lecture — persister via le modèle intermédiaire.
