# Atlas — ORM

Atlas est l'ORM Data Mapper de Ream. Les entités sont de pures classes TypeScript décorées avec des métadonnées. Les requêtes sont compilées en SQL via Rust grâce à NAPI. Les événements de domaine s'accumulent sur les entités et sont envoyés au bus d'événements après une sauvegarde réussie.

## Définir des entités

```typescript
import { Entity, Column, PrimaryKey, HasMany, BelongsTo, ManyToMany, BaseEntity } from '@c9up/atlas'

@Entity('orders')
class Order extends BaseEntity {
  @PrimaryKey() id!: string
  @Column() status!: string
  @Column({ type: 'decimal' }) total!: number
  @Column() userId!: string

  @HasMany(() => OrderItem) items!: OrderItem[]
  @BelongsTo(() => User)   user!: User

  markAsPaid() {
    this.status = 'paid'
    this.addDomainEvent('order.paid', { orderId: this.id, total: this.total })
  }
}

@Entity('order_items')
class OrderItem extends BaseEntity {
  @PrimaryKey() id!: string
  @Column() orderId!: string
  @Column() productName!: string
  @Column() quantity!: number
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
total!: number
```

`@ManyToMany` requiert une configuration pivot explicite. Le nom de la table pivot est obligatoire ; les clés étrangères ont pour valeur par défaut `${table_singulière}_id` si omises :

```typescript
@Entity('users')
class User extends BaseEntity {
  @PrimaryKey() id!: string
  @ManyToMany(() => Role, {
    pivotTable: 'user_roles',
    foreignKey: 'user_id',    // optionnel, défaut : "${thisTable}_id"
    otherKey: 'role_id',      // optionnel, défaut : "${relatedTable}_id"
  })
  roles!: Role[]
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

## Repository

`BaseRepository` fournit des opérations CRUD typées, appuyées par une connexion à la base de données. La connexion est résolue depuis le conteneur IoC via `@Inject('db')`.

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

## Query Builder

Le `QueryBuilder` fournit une API fluide. Lorsque vous appelez `toSQL()`, le builder sérialise la requête en JSON et délègue la compilation SQL au crate Rust `ream-query` via NAPI. Les noms de tables, les identifiants de colonnes et les opérateurs sont validés et échappés dans la couche Rust — et non par manipulation de chaînes — ce qui rejette les identifiants malformés avant même qu'une chaîne SQL soit produite.

Les placeholders sont dialect-aware : `?` pour SQLite/MySQL, `$N` pour PostgreSQL. Le quoting d'identifiants suit la même règle (`"col"` pour SQLite/PostgreSQL, `` `col` `` pour MySQL).

```typescript
import { QueryBuilder } from '@c9up/atlas'

const { sql, params } = new QueryBuilder('orders')
  .where('status', 'active')
  .orderBy('createdAt', 'desc')
  .paginate(1, 20)
  .toSQL()

// Sur SQLite (défaut) :
// sql:    SELECT * FROM "orders" WHERE "status" = ? ORDER BY "createdAt" DESC LIMIT 20 OFFSET 0
// params: ['active']
//
// Sur PostgreSQL :
// sql:    SELECT * FROM "orders" WHERE "status" = $1 ORDER BY "createdAt" DESC LIMIT 20 OFFSET 0
```

### Référence complète de l'API

```typescript
const qb = new QueryBuilder('orders')

// Projection
qb.select('id', 'status', 'total')        // SELECT id, status, total
qb.distinct()                              // SELECT DISTINCT

// Filtrage
qb.where('status', 'active')              // WHERE status = $1
qb.where('total', '>', 100)               // WHERE total > $1
qb.orWhere('status', 'pending')           // OR status = $1
qb.whereIn('status', ['a', 'b', 'c'])    // WHERE status IN ($1, $2, $3)
qb.whereNull('deletedAt')                 // WHERE deletedAt IS NULL
qb.whereNotNull('createdAt')              // WHERE createdAt IS NOT NULL
qb.whereExists(subquery)                  // WHERE EXISTS (subquery)

// Regroupement et agrégation
qb.groupBy('status', 'userId')            // GROUP BY status, userId
qb.having('total', '>', 500)              // HAVING total > $1

// Tri et pagination
qb.orderBy('createdAt', 'desc')           // ORDER BY createdAt DESC
qb.limit(10)                              // LIMIT 10
qb.offset(20)                             // OFFSET 20
qb.paginate(2, 20)                        // LIMIT 20 OFFSET 20

// Relations
qb.preload('items')                       // Chargement anticipé d'une relation

// Opérations ensemblistes
qb.union(otherQuery)                      // UNION
qb.unionAll(otherQuery)                   // UNION ALL

// CTEs
qb.with('recent', subquery)               // WITH recent AS (...)

// Compilation
const { sql, params } = qb.toSQL()
```

### SQL brut

Pour les cas qui sortent du cadre du builder, utilisez le tag `RawSql` :

```typescript
import { RawSql, QueryBuilder } from '@c9up/atlas'

const { sql } = new QueryBuilder('orders')
  .where('status', 'active')
  .with('totals', RawSql.sql`SELECT user_id, SUM(total) AS sum FROM orders GROUP BY user_id`)
  .toSQL()
```

## Schema Builder

Le Schema Builder définit les tables de la base de données dans le code. Il s'utilise à l'intérieur des méthodes `up()` et `down()` d'une migration via `this.schema`.

### Types de colonnes

```typescript
this.schema.createTable('orders', (table) => {
  table.id()                           // Clé primaire UUID (raccourci)
  table.uuid('external_ref')           // UUID
  table.string('status', 50)           // VARCHAR(50)
  table.text('notes')                  // TEXT
  table.integer('quantity')            // INTEGER
  table.bigInteger('views')            // BIGINT
  table.decimal('total', 10, 2)        // DECIMAL(10,2)
  table.boolean('active')              // BOOLEAN
  table.date('birthday')               // DATE
  table.timestamp('published_at')      // TIMESTAMP
  table.json('metadata')               // JSONB (Postgres) / TEXT (SQLite)
  table.binary('avatar')               // BYTEA (Postgres) / BLOB (SQLite)
  table.timestamps()                   // created_at + updated_at (NOT NULL, DEFAULT NOW())
})
```

### Index

```typescript
this.schema.createTable('memberships', (table) => {
  table.uuid('id').primary()
  table.uuid('user_id').notNullable().references('users')
  table.uuid('residence_id').notNullable().references('residences')
  table.string('role', 30).notNullable()

  // Index sur une seule colonne
  table.index('user_id')

  // Index composite
  table.index(['user_id', 'residence_id'])

  // Index unique
  table.uniqueIndex('email')

  // Nom personnalisé
  table.index('status', 'idx_orders_status')
})
```

Opérations d'index autonomes (en dehors de `createTable`) :

```typescript
this.schema.createIndex('orders', ['user_id', 'status'])
this.schema.dropIndex('idx_orders_status')
```

### Modificateurs de colonnes

```typescript
table.string('email', 255)
  .notNullable()                  // NOT NULL
  .unique()                       // Contrainte UNIQUE
  .defaultTo("'pending'")         // DEFAULT 'pending'

table.uuid('user_id')
  .references('users', 'id')      // FOREIGN KEY → users(id)
  .notNullable()
```

### Méthodes raccourcis

| Méthode | Effet |
|---------|-------|
| `table.id()` | Clé primaire UUID avec défaut `gen_random_uuid()` |
| `table.timestamps()` | Ajoute `created_at` et `updated_at` (NOT NULL, DEFAULT NOW()) |

## Système de dialectes

Atlas supporte SQLite, PostgreSQL et MySQL/MariaDB. Les différences de dialecte (quoting d'identifiants, mapping de types, format de placeholders) sont gérées par le crate Rust `ream-query` — il n'y a **aucune implémentation de dialecte côté TypeScript**. Le même code d'entité, de requête et de migration fonctionne sur n'importe quel backend supporté.

### Dialectes supportés

| Dialecte | Identifiant | Placeholders | Notes |
|----------|-------------|--------------|-------|
| `sqlite` | `"col"` | `?` | Mapping de types : TEXT / INTEGER / REAL / BLOB |
| `postgres` | `"col"` | `$N` | Support complet, JSONB, RETURNING |
| `mysql` | `` `col` `` | `?` | VARCHAR, TINYINT(1) pour les booléens, backticks |

`mariadb` est un alias de `mysql`.

### Configuration

Le dialecte est détecté automatiquement à partir du schéma de l'URL de connexion. Vous ne le définissez jamais directement :

```typescript
// config/database.ts
export default {
  // sqlite: → Dialect.Sqlite
  url: 'sqlite:data/app.db',

  // postgres:// → Dialect.Postgres
  // url: 'postgres://user:pass@localhost/mydb',

  // mysql:// → Dialect.Mysql
  // url: 'mysql://user:pass@localhost/mydb',

  poolMin: 1,
  poolMax: 10,
  migrations: { path: './database/migrations' },
}
```

`AtlasProvider` appelle `setAtlasDialect(...)` au démarrage selon le schéma de l'URL. L'état module-level garantit que `BaseRepository`, `ModelQuery`, `QueryBuilder` et `SchemaBuilder` récupèrent tous le bon dialecte sans configuration.

Si vous avez besoin de forcer le dialecte par code (par exemple dans un setup de tests multi-tenant) :

```typescript
import { setAtlasDialect, getAtlasDialect } from '@c9up/atlas'

setAtlasDialect('postgres')
const current = getAtlasDialect() // 'postgres'
```

### Ajouter un nouveau dialecte

Les nouveaux dialectes s'ajoutent en étendant l'enum `Dialect` dans le crate Rust `ream-query` (`crates/ream-query/src/dialect.rs`) — pas en TypeScript. Implémentez `quote_ident`, `placeholder` et `map_column_type` pour le nouveau variant, recompilez le binaire NAPI, et toute la surface TS le prend en charge automatiquement.

## Migrations

### Classe de base Migration

```typescript
import { Migration } from '@c9up/atlas'

export default class CreateOrdersTable extends Migration {
  async up(): Promise<void> {
    this.schema.createTable('orders', (table) => {
      table.id()
      table.string('status', 50).notNullable().defaultTo("'pending'")
      table.decimal('total', 10, 2).notNullable()
      table.uuid('user_id').references('users', 'id').notNullable()
      table.text('notes').nullable()
      table.timestamps()
    })
  }

  async down(): Promise<void> {
    this.schema.dropTable('orders')
  }
}
```

La classe `Migration` expose `this.schema` (une instance de `Schema`) et deux helpers :

```typescript
this.raw('expression')   // Expression SQL brute (pour les valeurs DEFAULT)
this.now()               // Renvoie 'NOW()'
```

### MigrationRunner

```typescript
import { MigrationRunner } from '@c9up/atlas'

const runner = new MigrationRunner(adapter, {
  migrationsDir: 'database/migrations',
  dialect: 'sqlite',      // 'sqlite' | 'postgres' | 'mysql' (défaut : valeur de setAtlasDialect)
})

// Exécuter toutes les migrations en attente
const executed = await runner.migrate()
// ['20260330_create_orders_table', ...]

// Annuler le dernier lot
const rolled = await runner.rollback()

// Lister l'état des migrations
const status = await runner.status()
// [{ name: '20260330_create_orders_table', status: 'applied', batch: 1 }]
```

`MigrationRunner` requiert un `DatabaseAdapter` avec les méthodes `execute(sql, params?)` et `query(sql, params?)`. L'adaptateur renvoyé par `createNapiConnection()` (Rust `ream-db`) implémente cette interface, et tout le DDL/DML est compilé via `ream-query` — il n'y a aucune concaténation SQL brute dans le runner.

### Nom personnalisé pour la table de suivi

Par défaut Atlas suit les migrations appliquées dans une table nommée `_migrations`. Vous pouvez la renommer via `database.migrations.table` (ou l'option `tableName` du constructeur `MigrationRunner`) lorsque vous partagez la base avec un autre framework qui possède déjà `_migrations`, ou lorsqu'une convention de nommage impose `schema_versions`, `flyway_schema_history`, etc.

```typescript
// reamrc.ts
export default {
  database: {
    default: 'primary',
    connections: {
      primary: { url: 'postgres://localhost/myapp' },
    },
    migrations: {
      path: 'database/migrations',
      table: 'schema_versions',   // ← custom tracking-table
    },
  },
}
```

Le pont MCP (outils `ream-mcp migration.*`) lit la même clé. Vous pouvez aussi surcharger à l'exécution via la variable d'environnement `REAM_MIGRATIONS_TABLE`.

`table` doit correspondre à `/^[A-Za-z_][A-Za-z0-9_]*$/` — lettres, chiffres et underscores uniquement, sans commencer par un chiffre. Les noms invalides lèvent `AtlasError("MIGRATION_INVALID_TABLE_NAME")` synchrone­ment depuis le constructeur `MigrationRunner` ; le compilateur de requêtes Rust applique la même forme en seconde ligne de défense.

**Couplage avec le helper de nettoyage.** `DatabaseCleanup.truncateAll` ignore les tables dont le nom commence par `_`. Le défaut `_migrations` est donc protégé d'office. Un nom personnalisé comme `schema_versions` ne commence PAS par `_` : `truncateAll` le supprimera — c'est voulu (opt-out de l'exclusion automatique). Choisissez un nom personnalisé préfixé par `_` (par exemple `_my_migrations`) si vous souhaitez conserver l'exclusion.

## Liste de vérification pour rédiger un template de migration

Lorsqu'un package du framework (ou votre propre librairie) embarque un template
de migration qui sera copié dans les applications utilisateurs, ce template
doit fonctionner sur chaque dialecte Atlas (SQLite, Postgres, MySQL). L'API
des helpers d'Atlas est agnostique au niveau du type, mais pas toujours au
niveau du SQL — certains helpers émettent du DDL que certains dialectes
rejettent silencieusement ou bruyamment. Cette liste recense les pièges connus.

1. **Tester le DDL émis par dialecte.** Écrire un test d'intégration qui
   importe le module de migration, l'instancie sous chaque `AtlasDialect`,
   capture `getUpSQL()` et vérifie la sortie octet-par-octet face à des
   fixtures versionnées. Voir `packages/nova/tests/integration/migration-template-ddl-output.test.ts`
   pour le pattern canonique.

2. **Éviter `t.timestamps()` et `t.id()` dans les templates embarqués.** Les
   deux émettent des `DEFAULT` non portables : `t.timestamps()` écrit
   `DEFAULT NOW()` (valide sur Postgres + MySQL, invalide en SQLite — pas
   de fonction `NOW()`), et `t.id()` écrit `DEFAULT gen_random_uuid()`
   (valide sur Postgres 13+, invalide en SQLite + MySQL — pas de fonction
   `gen_random_uuid()`). La migration crashe lors du `migrations:run` sur
   le dialecte qui n'a pas la fonction. Écrire les colonnes explicitement
   à la place :

   ```typescript
   // ✗ DO NOT in shipped templates
   t.id()
   t.timestamps()

   // ✓ Portable equivalent
   t.uuid('id').primary()                  // no DEFAULT
   t.timestamp('created_at').notNullable() // no DEFAULT
   t.timestamp('updated_at').notNullable()
   // Supply the values at INSERT/UPSERT time.
   ```

3. **Calculer le budget octets MySQL InnoDB pour les colonnes VARCHAR PK/UNIQUE.**
   Sur utf8mb4 (le défaut moderne de MySQL 8) avec le format de ligne DYNAMIC,
   chaque `VARCHAR(N)` participant à un index `PRIMARY KEY` ou `UNIQUE` doit
   satisfaire `N * 4 ≤ 3072` (4 octets par caractère × N caractères ≤ limite
   d'index de 3072 octets). Le helper `assertInnodbPkBudget` dans
   `packages/atlas/tests/unit/migration-portability.ts` parse les `CREATE
   TABLE` et lève en cas de violation — branchez-le dans la passe MySQL de
   votre test de sortie DDL.

4. **Lancer des tests end-to-end cross-dialect quand c'est possible.** Les
   fixtures DDL compile-time attrapent les régressions de sortie des helpers
   ci-dessus. Pour vérifier que la migration s'applique réellement sur chaque
   backend, positionner `ATLAS_TEST_PG_URL` et `ATLAS_TEST_MYSQL_URL` et
   lancer le harness env-gated à
   `packages/atlas/tests/integration/cross-dialect.test.ts`.

L'audit est appliqué par :

- `packages/atlas/tests/unit/no-non-portable-helpers-in-templates.test.ts`
  (grep-bannit les helpers non-portables dans chaque template embarqué —
  CI rouge si réintroduits)
- `packages/atlas/AUDIT-migration-templates.md` (inventaire re-jouable de
  chaque template embarqué + les règles ci-dessus)

## AtlasProvider

Enregistrez `AtlasProvider` dans la liste des providers de votre application. Il lit `config/database.ts`, ouvre la connexion à la base de données, enregistre l'adaptateur dans le conteneur et exécute automatiquement les migrations en attente au démarrage.

```typescript
// config/app.ts
import AtlasProvider from '@c9up/atlas/AtlasProvider'

export default {
  providers: [AtlasProvider],
}
```

```typescript
// config/database.ts
export default {
  url: 'sqlite:data/app.db',          // ou 'postgres://...' ou 'mysql://...'
  poolMin: 1,
  poolMax: 10,
  migrations: {
    path: './database/migrations',
  },
}
```

Au démarrage, `AtlasProvider` :
1. Ouvre un pool de connexions via le crate Rust `ream-db` (sqlx en interne — SQLite, PostgreSQL ou MySQL)
2. Détecte le dialecte à partir du schéma de l'URL et appelle `setAtlasDialect(...)`
3. Enregistre `db` et `db.connection` dans le conteneur
4. Exécute les migrations en attente via `MigrationRunner` (tout le DDL compilé par `ream-query`)

## Prochaines étapes

- [Rune (Validation)](/fr/modules/rune) — Valider les entrées avant de sauvegarder les entités
- [Event bus](/fr/ream/events) — Envoyer les événements de domaine après la sauvegarde
