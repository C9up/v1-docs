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

## Bonnes pratiques

- Nommer explicitement la pivot table en many-to-many.
- Garder des clés FK stables et cohérentes (`user_id`, `role_id`).
- Limiter le preload profond sur les endpoints sensibles perf.
