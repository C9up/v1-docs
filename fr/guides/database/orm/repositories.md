# Repositories

Ce guide couvre les repositories et leurs patterns :

- Repository
- Objectif
- Exemple de repository métier
- Restreindre toutes les requêtes — `scope`
- Bonnes pratiques
- Soft delete

## Repository

`BaseRepository` fournit des opérations CRUD typées, appuyées par une connexion à la base de données. La connexion est résolue depuis le conteneur IoC via `@Inject('db')`. C'est la même surface que celle déléguée par `BaseModel` — utilisez-le directement si vous préférez la séparation Data Mapper.

```typescript
import { inject, Inject } from '@c9up/ream'
import { BaseRepository } from '@c9up/atlas'
import type { DatabaseConnection } from '@c9up/atlas'
import { Order } from '../entities/Order.js'

@inject()
export class OrderService {
  private orders: BaseRepository<Order>

  constructor(@Inject('db') db: DatabaseConnection) {
    this.orders = new BaseRepository(Order, db)
  }
}
```

### Méthodes de recherche

```typescript
// Recherche par clé primaire
const order = this.orders.find('abc-123')         // Order | null
const order = this.orders.findOrFail('abc-123')   // Order (lève une erreur si non trouvé)

// Recherche par colonne quelconque
const user = this.users.findBy('email', 'a@b.com')  // User | null

// Récupérer tous les enregistrements
const all = this.orders.all()                     // Order[]

// Filtre simple
const active = this.orders.where('status', 'active')  // Order[]
```

### Créer / Mettre à jour / Supprimer

```typescript
// Créer depuis des données
const order = this.orders.create({
  id: crypto.randomUUID(),
  status: 'pending',
  total: 42.50,
  createdAt: new Date().toISOString(),
})

// Mettre à jour des colonnes précises par ID
this.orders.updateById(order.id, { status: 'paid', updatedAt: new Date().toISOString() })

// Mettre à jour les colonnes correspondant à une condition
this.orders.updateWhere('status', 'expired', { archivedAt: new Date().toISOString() })

// Sauvegarder (insertion ou mise à jour)
await this.orders.save(order)

// Supprimer
this.orders.delete(order)
```

### ModelQuery — Requêtes fluides exécutables

`repo.query()` renvoie un `ModelQuery` qui sérialise vers un AST et délègue la compilation SQL au crate Rust `ream-query`. Les noms de colonne acceptent `camelCase` ou `snake_case` — ils sont validés contre les métadonnées `@Column` de l'entité et résolus vers la vraie colonne DB avant la construction de l'AST :

```typescript
// Plusieurs where + tri + pagination
// (`residenceId` et `residence_id` fonctionnent tous les deux — même colonne résolue)
const tasks = this.tasks.query()
  .where('residenceId', residenceId)
  .where('status', 'declared')
  .orderBy('createdAt', 'desc')
  .limit(20)
  .exec()                                  // Task[]

// Premier résultat correspondant
const user = this.users.query()
  .where('email', email)
  .first()                                 // User | null

// Premier résultat ou erreur
const user = this.users.query()
  .where('email', email)
  .firstOrFail()                           // User (lève une erreur si non trouvé)

// Opérateurs
this.orders.query().where('total', '>', 100).exec()
this.orders.query().whereNull('deletedAt').exec()
this.orders.query().whereNotNull('shippedAt').exec()
```

Passer un nom de colonne inconnu lève `E_INVALID_COLUMN` avant que la requête n'atteigne Rust : l'injection via le nom de colonne est structurellement impossible.

#### Chargement anticipé des relations avec `.preload()`

Les relations ne sont **jamais chargées automatiquement**. Appelez `.preload(relationName)` pour les charger avec une unique sous-requête batchée (pas de N+1). `@HasMany`, `@BelongsTo` et `@ManyToMany` sont tous supportés :

```typescript
// hasMany + belongsTo
const users = this.users.query()
  .preload('posts')          // @HasMany — ajoute le tableau "posts" à chaque user
  .preload('profile')        // @BelongsTo — définit "profile" sur chaque user
  .exec()

// ManyToMany (via table pivot)
const users = this.users.query()
  .preload('roles')          // @ManyToMany — résolu via la table pivot
  .exec()

// Preload imbriqué — le callback reçoit un sous-ModelQuery sur l'entité liée
const users = this.users.query()
  .preload('posts', (q) => q.preload('comments'))
  .exec()
```

En interne, chaque preload émet au plus un `SELECT ... WHERE fk IN (...)` par niveau de relation. `@ManyToMany` en émet deux (lookup pivot + chargement des entités liées).

### Événements de domaine après la sauvegarde

```typescript
repo.onDomainEvents = async (events) => {
  for (const event of events) {
    bus.emit(event.name, JSON.stringify(event))
  }
}

const order = new Order()
order.id = crypto.randomUUID()
order.markAsPaid()

await repo.save(order)
// Les événements de domaine sont envoyés, puis supprimés de l'entité
```

## Objectif

Encapsuler la logique d'accès aux données dans des repositories explicites.

## Exemple de repository métier

```ts
import { BaseRepository } from '@c9up/atlas'
import type { DatabaseConnection } from '@c9up/atlas'

export class UserRepository {
  private repo: BaseRepository<User>

  constructor(db: DatabaseConnection) {
    this.repo = new BaseRepository(User, db)
  }

  findActiveByEmail(email: string) {
    return this.repo.query()
      .where('email', email)
      .where('status', 'active')
      .first()
  }

  listRecent(limit = 20) {
    return this.repo.query()
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .exec()
  }
}
```

## Restreindre toutes les requêtes — `scope`

Un repository peut porter une contrainte que reçoit chacune de ses requêtes —
c'est la place d'un filtre par tenant :

```ts
import { BaseRepository } from '@c9up/atlas'

const TENANT_TABLES = new Set(['invoices', 'invoice_lines', 'customers'])

const invoices = new BaseRepository(Invoice, db, {
  scope: (q, table) => {
    if (TENANT_TABLES.has(table)) q.where('company_id', currentCompanyId())
  },
})
```

Le scope s'applique aux finders du repository, à `query()` et à ses écritures
par id ou par colonne — `updateById`, `updateWhere`, `increment`, `decrement`,
`upsert`. Sur PostgreSQL et SQLite, `upsert` laisse intacte une ligne en conflit
hors du scope (`DO UPDATE … WHERE <scope>`). Le `ON DUPLICATE KEY UPDATE` de
MySQL n'accepte pas de condition : un `upsert` qui met à jour des colonnes y est
refusé avec `E_UNSUPPORTED`. Sans `updateColumns` (`INSERT IGNORE`), il s'exécute.
Il est transmis à toutes les requêtes que lancent ses relations :

- les preloads, imbriqués compris ;
- la table pivot d'un many-to-many et la table intermédiaire d'une relation
  through ;
- les sous-requêtes de `whereHas` / `withCount` ;
- `load()` / `related()` sur les entités que le repository a hydratées ;
- la copie que renvoie `useTransaction(trx)`.

La fonction reçoit chaque requête avec la table qu'elle lit, et y ajoute des
contraintes `WHERE` ; tout autre réglage est ignoré. Une table qui ne la
concerne pas passe telle quelle si elle n'ajoute rien. Ses contraintes sont
combinées en ET, dans leurs propres parenthèses, avec celles de la requête : un
`orWhere` chaîné par l'appelant ne peut pas les contourner. Elle s'exécute à
chaque compilation d'une requête, donc lit l'état de ce moment-là (un tenant
porté par le contexte asynchrone), et peut lever une erreur pour refuser une
requête d'emblée.

Les écritures sur une entité (`save`, `delete`) ne sont pas filtrées : l'entité
provient d'une lecture déjà restreinte.

## Bonnes pratiques

- exposer des méthodes métier, pas uniquement CRUD générique
- éviter de laisser la couche HTTP composer du SQL/requêtes complexes
- centraliser les colonnes dynamiques derrière des whitelists

## Soft delete

Atlas gère les scopes soft delete selon la config de l'entité:

- défaut: exclut les supprimés
- `withTrashed()` inclut tout
- `onlyTrashed()` ne garde que les supprimés

Le filtre est combiné par `AND` aux clauses de la requête prises en un groupe,
comme le scope : `where('email', login).orWhere('username', login)` ne trouve pas
un compte supprimé. Il s'applique aux lectures, à `paginate()` (total et page),
aux écritures en masse, aux preloads et aux sous-requêtes de `whereHas` /
`withCount`.
