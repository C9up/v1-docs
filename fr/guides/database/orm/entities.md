# Entités

Ce guide couvre la définition des entités et de leurs colonnes :

- Définir des entités
- BaseEntity

## Définir des entités

```typescript
import { Entity, Column, PrimaryKey, HasMany, BelongsTo, ManyToMany, BaseEntity } from '@c9up/atlas'

@Entity('orders')
class Order extends BaseEntity {
  @PrimaryKey() declare id: string
  @Column() declare status: string
  @Column({ type: 'decimal' }) declare total: number
  @Column() declare userId: string

  @HasMany(() => OrderItem) declare items: OrderItem[]
  @BelongsTo(() => User)   declare user: User

  markAsPaid() {
    this.status = 'paid'
    this.addDomainEvent('order.paid', { orderId: this.id, total: this.total })
  }
}

@Entity('order_items')
class OrderItem extends BaseEntity {
  @PrimaryKey() declare id: string
  @Column() declare orderId: string
  @Column() declare productName: string
  @Column() declare quantity: number
}
```

### Décorateurs

| Décorateur | Rôle |
|------------|------|
| `@Entity('table')` | Marque une classe comme entité mappée pour la table indiquée |
| `@PrimaryKey()` | Marque la colonne de clé primaire (également enregistrée comme `@Column`) |
| `@Column(options?)` | Associe une propriété à une colonne de la base de données |
| `@HasMany(() => Related)` | Relation un-à-plusieurs |
| `@BelongsTo(() => Related)` | Relation plusieurs-à-un |
| `@ManyToMany(() => Related, { pivotTable, foreignKey?, otherKey? })` | Relation plusieurs-à-plusieurs via une table pivot |

`@Column` accepte un objet d'options facultatif :

```typescript
@Column({ type: 'decimal', nullable: true, default: 0 })
declare total: number
```

Par défaut une propriété est mappée sur sa colonne `snake_case` (`userId` →
`user_id`). Surcharge ce nom par colonne pour les schémas legacy/non-conventionnels
via `columnName` — lectures, écritures, `where`/`orderBy`
et hydratation le respectent tous :

```typescript
@Column({ columnName: 'USR_MAIL' }) declare email: string
```

### Colonnes date

`@column.date()` / `@column.dateTime()` hydratent vers un **`DateTime` de `@c9up/chronos`** — le moteur date de Ream. Les lectures renvoient un `DateTime`, les écritures le ramènent à une chaîne ISO 8601, et `autoCreate` / `autoUpdate` posent `DateTime.now()` :

```typescript
import { DateTime } from '@c9up/chronos'

class Meeting extends BaseModel {
  @column.dateTime() declare startsAt: DateTime | null
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime | null
}

const m = await Meeting.create({ startsAt: new DateTime('2026-06-09T12:34:56Z') })
m.startsAt.toISO()          // '2026-06-09T12:34:56Z'
```

`@ManyToMany` requiert une configuration pivot explicite. Le nom de la table pivot est obligatoire ; les clés étrangères ont pour valeur par défaut `${table_singulière}_id` si omises :

```typescript
@Entity('users')
class User extends BaseEntity {
  @PrimaryKey() declare id: string
  @ManyToMany(() => Role, {
    pivotTable: 'user_roles',
    foreignKey: 'user_id',    // optionnel, défaut : "${thisTable}_id"
    otherKey: 'role_id',      // optionnel, défaut : "${relatedTable}_id"
  })
  declare roles: Role[]
}
```

## BaseEntity

Toutes les classes d'entité étendent `BaseEntity`, qui fournit l'accumulation des événements de domaine :

```typescript
// Accumuler un événement de domaine — envoyé après save()
this.addDomainEvent('order.paid', { orderId: this.id })

// Lire les événements en attente sans les effacer
const events = entity.getDomainEvents()   // readonly DomainEvent[]

// Lire et effacer de manière atomique (utilisé en interne par save)
const events = entity.flushDomainEvents() // DomainEvent[]

// Vérifier si des événements sont en attente
entity.hasDomainEvents() // boolean

// Effacer sans lire
entity.clearDomainEvents()
```
