# Atlas — ORM

Atlas is Ream's Data Mapper ORM. Entities are pure TypeScript classes decorated with metadata. Queries compile to SQL through Rust via NAPI. Domain events accumulate on entities and dispatch through the event bus after a successful save.

## Defining Entities

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

### Decorators

| Decorator | Purpose |
|-----------|---------|
| `@Entity('table')` | Marks a class as a mapped entity for the given table |
| `@PrimaryKey()` | Marks the primary key column (also registers as `@Column`) |
| `@Column(options?)` | Maps a property to a database column |
| `@HasMany(() => Related)` | One-to-many relation |
| `@BelongsTo(() => Related)` | Many-to-one relation |
| `@ManyToMany(() => Related, { pivotTable, foreignKey?, otherKey? })` | Many-to-many relation through a pivot table |

`@Column` accepts an optional options object:

```typescript
@Column({ type: 'decimal', nullable: true, default: 0 })
declare total: number
```

By default a property maps to its `snake_case` column (`userId` → `user_id`).
Override that per-column for legacy/non-conventional schemas with `columnName`
(AdonisJS Lucid parity) — reads, writes, `where`/`orderBy` and hydration all
honor it:

```typescript
@Column({ columnName: 'USR_MAIL' }) declare email: string
```

### Date columns

`@column.date()` / `@column.dateTime()` hydrate to a **`@c9up/chronos` `DateTime`** — the Ream date engine, exactly as AdonisJS Lucid hydrates date columns to a Luxon `DateTime`. Reads return a `DateTime`, writes lower it back to an ISO 8601 string, and `autoCreate` / `autoUpdate` stamp `DateTime.now()`:

```typescript
import { DateTime } from '@c9up/chronos'

class Meeting extends BaseModel {
  @column.dateTime() declare startsAt: DateTime | null
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime | null
}

const m = await Meeting.create({ startsAt: new DateTime('2026-06-09T12:34:56Z') })
m.startsAt.toISO()          // '2026-06-09T12:34:56Z'
```

`@ManyToMany` requires explicit pivot configuration. The pivot table name is mandatory; foreign keys default to `${singular_table}_id` when omitted:

```typescript
@Entity('users')
class User extends BaseEntity {
  @PrimaryKey() declare id: string
  @ManyToMany(() => Role, {
    pivotTable: 'user_roles',
    foreignKey: 'user_id',    // optional, defaults to "${thisTable}_id"
    otherKey: 'role_id',      // optional, defaults to "${relatedTable}_id"
  })
  declare roles: Role[]
}
```

## BaseEntity

All entity classes extend `BaseEntity`, which provides domain event accumulation:

```typescript
// Accumulate a domain event — dispatched after save()
this.addDomainEvent('order.paid', { orderId: this.id })

// Read pending events without clearing
const events = entity.getDomainEvents()   // readonly DomainEvent[]

// Get and clear atomically (used internally by save)
const events = entity.flushDomainEvents() // DomainEvent[]

// Check if events are pending
entity.hasDomainEvents() // boolean

// Clear without reading
entity.clearDomainEvents()
```

## BaseModel — Active Record (AdonisJS Lucid parity)

Extend `BaseModel` (instead of `BaseEntity`) for the Lucid-style Active Record API: static finders/creators and `instance.save()` / `instance.delete()` that delegate to a per-connection repository. `@Entity('table')` is **optional** — the table name is inferred from the class name (`User` → `users`); override with `static table`.

```typescript
import { BaseModel, Column, PrimaryKey } from '@c9up/atlas'

class User extends BaseModel {
  @PrimaryKey() declare id: number
  @Column() declare email: string
  @Column() declare role: string

  static table = 'app_users'      // optional — inferred otherwise
  static connection = 'analytics' // optional named connection
}

// Static finders
const user  = await User.find(1)
const admin = await User.findBy({ role: 'admin' })   // object clause
const users = await User.findManyBy({ role: 'user' })
const first = await User.first()
const rows  = await User.query().where('role', 'admin').exec()

// Static creators
const u = await User.create({ email: 'a@b.co', role: 'user' })
await User.updateOrCreate({ email: 'a@b.co' }, { role: 'admin' })
await User.updateOrCreateMany('email', batch)   // bulk, keyed, transactional

// Instance persistence
if (user) {
  user.email = 'new@b.co'
  await user.save()    // UPDATE the dirty columns (INSERT if new)
  await user.delete()  // DELETE the row; sets $isDeleted
}
```

### Model state (Lucid parity)

```typescript
user.$isPersisted     // true once the row is in the DB (after save/fetch)
user.$isNew           // never persisted
user.$isLocal         // created in memory (vs fetched from the DB)
user.$isDeleted       // set after delete()
user.$primaryKeyValue // the PK column's value
user.isDirty('email')
```

### Mass-assignment protection

`static fillable` / `static guarded` are enforced on `create`, `createMany` and `updateOrCreate` — not only on `fill()` — so a `guarded` column can't be set from a plain payload:

```typescript
class User extends BaseModel {
  static guarded = ['role'] // never mass-assignable
}
await User.create({ email: 'a@b.co', role: 'admin' }) // throws MassAssignmentError
```

### Serialization visibility

```typescript
class User extends BaseModel {
  static hidden = ['password'] // class-level allowlist
}
user.makeVisible('password').toJSON() // reveal on THIS instance
user.makeHidden('email').toJSON()     // hide on THIS instance
```

`toJSON()` delegates to three overridable hooks — override just the layer you
need (AdonisJS Lucid `serializeAttributes` / `serializeRelations` / `serializeComputed`):

```typescript
class Account extends BaseModel {
  @Column() declare balance: number
  // Customize only the attribute layer; relations/computed keep default behavior.
  protected override serializeAttributes() {
    return { ...super.serializeAttributes(), balance: Math.round(this.balance) }
  }
}
```

The full static surface: `find`, `findOrFail`, `findBy`, `findByOrFail`, `findMany`, `findManyBy`, `all`, `first`, `firstOrFail`, `query`, `create`, `createMany`, `firstOrCreate`, `firstOrNew`, `updateOrCreate`, `updateOrCreateMany`, `fetchOrCreateMany`, `fetchOrNewUpMany`, `truncate`, plus the hook-muting `createQuietly` / `createManyQuietly`.

Instances add `saveQuietly()` / `deleteQuietly()` — persist/remove without firing lifecycle hooks (AdonisJS Lucid parity, handy for seeders/backfills). `save()` throws once the instance is deleted (`$isDeleted`), and `$isDirty` reports unsaved changes.

## Repository

`BaseRepository` provides typed CRUD operations backed by a database connection. The connection is resolved from the IoC container via `@Inject('db')`. It is the same surface `BaseModel` delegates to — use it directly when you prefer Data Mapper separation.

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

### Finders

```typescript
// Find by primary key
const order = this.orders.find('abc-123')         // Order | null
const order = this.orders.findOrFail('abc-123')   // Order (throws if not found)

// Find by any column
const user = this.users.findBy('email', 'a@b.com')  // User | null

// Get all
const all = this.orders.all()                     // Order[]

// Simple where
const active = this.orders.where('status', 'active')  // Order[]
```

### Create / Update / Delete

```typescript
// Create from data
const order = this.orders.create({
  id: crypto.randomUUID(),
  status: 'pending',
  total: 42.50,
  createdAt: new Date().toISOString(),
})

// Update specific columns by ID
this.orders.updateById(order.id, { status: 'paid', updatedAt: new Date().toISOString() })

// Update columns matching a condition
this.orders.updateWhere('status', 'expired', { archivedAt: new Date().toISOString() })

// Save (insert or update)
await this.orders.save(order)

// Delete
this.orders.delete(order)
```

### ModelQuery — Fluent Executable Queries

`repo.query()` returns a `ModelQuery` that serializes to an AST and delegates SQL compilation to the Rust `ream-query` crate. Column names accept either `camelCase` or `snake_case` — they are validated against the entity's `@Column` metadata and resolved to the actual DB column before the AST is built:

```typescript
// Multiple where + ordering + pagination
// (both `residenceId` and `residence_id` work — they resolve to the same column)
const tasks = this.tasks.query()
  .where('residenceId', residenceId)
  .where('status', 'declared')
  .orderBy('createdAt', 'desc')
  .limit(20)
  .exec()                                  // Task[]

// First match
const user = this.users.query()
  .where('email', email)
  .first()                                 // User | null

// First or throw
const user = this.users.query()
  .where('email', email)
  .firstOrFail()                           // User (throws if not found)

// Operators
this.orders.query().where('total', '>', 100).exec()
this.orders.query().whereNull('deletedAt').exec()
this.orders.query().whereNotNull('shippedAt').exec()
```

Passing an unknown column name throws `E_INVALID_COLUMN` before the query is sent to Rust, so injection through column names is structurally impossible.

#### Eager relation loading with `.preload()`

Relations are **never loaded automatically**. Call `.preload(relationName)` to load them with a single batched subquery (no N+1). `@HasMany`, `@BelongsTo`, and `@ManyToMany` are all supported:

```typescript
// hasMany + belongsTo
const users = this.users.query()
  .preload('posts')          // @HasMany — adds "posts" array to each user
  .preload('profile')        // @BelongsTo — sets "profile" on each user
  .exec()

// ManyToMany (via pivot table)
const users = this.users.query()
  .preload('roles')          // @ManyToMany — resolves through the pivot table
  .exec()

// Nested preload — the callback receives a sub-ModelQuery on the related entity
const users = this.users.query()
  .preload('posts', (q) => q.preload('comments'))
  .exec()
```

Internally, each preload issues at most one `SELECT ... WHERE fk IN (...)` per relation level. `@ManyToMany` issues two (pivot lookup + related load).

### Domain Events After Save

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
// Domain events dispatched, then cleared from entity
```

## Query Builder

The `QueryBuilder` provides a fluent API. When you call `toSQL()`, the builder serializes to JSON and delegates SQL compilation to the Rust `ream-query` crate via NAPI. Table names, column identifiers, and operators are validated and quoted at the Rust layer — not through string manipulation — which rejects malformed identifiers before a query string is produced.

Placeholders are dialect-aware: `?` for SQLite/MySQL, `$N` for PostgreSQL. Identifier quoting follows the same rule (`"col"` for SQLite/PostgreSQL, `` `col` `` for MySQL).

```typescript
import { QueryBuilder } from '@c9up/atlas'

const { sql, params } = new QueryBuilder('orders')
  .where('status', 'active')
  .orderBy('createdAt', 'desc')
  .paginate(1, 20)
  .toSQL()

// On SQLite (default):
// sql:    SELECT * FROM "orders" WHERE "status" = ? ORDER BY "createdAt" DESC LIMIT 20 OFFSET 0
// params: ['active']
//
// On PostgreSQL:
// sql:    SELECT * FROM "orders" WHERE "status" = $1 ORDER BY "createdAt" DESC LIMIT 20 OFFSET 0
```

### Full API Reference

```typescript
const qb = new QueryBuilder('orders')

// Projection
qb.select('id', 'status', 'total')        // SELECT id, status, total
qb.distinct()                              // SELECT DISTINCT

// Filtering
qb.where('status', 'active')              // WHERE status = $1
qb.where('total', '>', 100)               // WHERE total > $1
qb.orWhere('status', 'pending')           // OR status = $1
qb.whereIn('status', ['a', 'b', 'c'])    // WHERE status IN ($1, $2, $3)
qb.whereNull('deletedAt')                 // WHERE deletedAt IS NULL
qb.whereNotNull('createdAt')              // WHERE createdAt IS NOT NULL
qb.whereExists(subquery)                  // WHERE EXISTS (subquery)

// Grouping and aggregation
qb.groupBy('status', 'userId')            // GROUP BY status, userId
qb.having('total', '>', 500)              // HAVING total > $1

// Ordering and pagination
qb.orderBy('createdAt', 'desc')           // ORDER BY createdAt DESC
qb.limit(10)                              // LIMIT 10
qb.offset(20)                             // OFFSET 20
qb.paginate(2, 20)                        // LIMIT 20 OFFSET 20

// Relations
qb.preload('items')                       // Eager-load a relation

// Set operations
qb.union(otherQuery)                      // UNION
qb.unionAll(otherQuery)                   // UNION ALL

// CTEs
qb.with('recent', subquery)               // WITH recent AS (...)

// Compile
const { sql, params } = qb.toSQL()
```

### Raw SQL

For cases that fall outside the builder, use tagged `RawSql`:

```typescript
import { RawSql, QueryBuilder } from '@c9up/atlas'

const { sql } = new QueryBuilder('orders')
  .where('status', 'active')
  .with('totals', RawSql.sql`SELECT user_id, SUM(total) AS sum FROM orders GROUP BY user_id`)
  .toSQL()
```

## Schema Builder

The Schema Builder defines database tables in code. It is used inside migration `up()` and `down()` methods through `this.schema`.

### Column Types

```typescript
this.schema.createTable('orders', (table) => {
  table.id()                           // UUID primary key (shortcut)
  table.uuid('external_ref')           // UUID
  table.string('status', 50)           // VARCHAR(50)
  table.text('notes')                  // TEXT
  table.integer('quantity')            // INTEGER
  table.bigInteger('views')            // BIGINT
  table.decimal('total', 10, 2)        // DECIMAL(10,2)
  table.boolean('active')              // BOOLEAN
  table.date('birthday')               // DATE
  table.timestamp('published_at')      // TIMESTAMP (no tz — UTC only when written via atlas)
  table.timestamptz('occurred_at')     // TIMESTAMPTZ (Postgres) — UTC-normalised for ALL writers
  table.json('metadata')               // JSONB (Postgres) / TEXT (SQLite)
  table.binary('avatar')               // BYTEA (Postgres) / BLOB (SQLite)
  table.timestamps()                   // created_at + updated_at (NOT NULL, DEFAULT NOW())
})
```

> **`timestamp` vs `timestamptz`.** `timestamp` (without time zone) only round-trips
> as UTC for values atlas itself wrote; a DB-side `DEFAULT now()`, raw SQL, or a seed
> stores the server's local wall-clock, which then reads back drifted on a non-UTC
> host. **`timestamptz` normalises every writer to UTC**, so use it for any value you
> compare exactly or any column with a DB-side default. It pairs with
> `@column.dateTime()` unchanged (the decorator is decoupled from the SQL type). On
> MySQL/SQLite (no real tz type) `timestamptz` degrades to the plain timestamp mapping.

### Indexes

```typescript
this.schema.createTable('memberships', (table) => {
  table.uuid('id').primary()
  table.uuid('user_id').notNullable().references('users')
  table.uuid('residence_id').notNullable().references('residences')
  table.string('role', 30).notNullable()

  // Single column index
  table.index('user_id')

  // Composite index
  table.index(['user_id', 'residence_id'])

  // Unique index
  table.uniqueIndex('email')

  // Custom name
  table.index('status', 'idx_orders_status')
})
```

Standalone index operations (outside `createTable`):

```typescript
this.schema.createIndex('orders', ['user_id', 'status'])
this.schema.dropIndex('idx_orders_status')
```

### Column Modifiers

```typescript
table.string('email', 255)
  .notNullable()                  // NOT NULL
  .unique()                       // UNIQUE constraint
  .defaultTo("'pending'")         // DEFAULT 'pending'

table.uuid('user_id')
  .references('users', 'id')      // FOREIGN KEY → users(id)
  .notNullable()
```

### Shortcut Methods

| Method | Effect |
|--------|--------|
| `table.id()` | UUID primary key with `gen_random_uuid()` default |
| `table.timestamps()` | Adds `created_at` and `updated_at` (NOT NULL, DEFAULT NOW()) |

## Dialect System

Atlas supports SQLite, PostgreSQL, and MySQL/MariaDB. Dialect differences (identifier quoting, column type mapping, placeholder format) are owned by the Rust `ream-query` crate — there is **no dialect implementation in TypeScript**. The same entity, query, and migration code works against any supported backend.

### Supported Dialects

| Dialect | Identifier | Placeholders | Notes |
|---------|-----------|-------------|-------|
| `sqlite` | `"col"` | `?` | Type mapping: TEXT / INTEGER / REAL / BLOB |
| `postgres` | `"col"` | `$N` | Full support, JSONB, RETURNING |
| `mysql` | `` `col` `` | `?` | VARCHAR, TINYINT(1) for booleans, backtick identifiers |

`mariadb` is an alias for `mysql`.

### Configuration

The dialect is auto-detected from the connection URL scheme. You never set it directly:

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

`AtlasProvider` calls `setAtlasDialect(...)` at boot based on the URL scheme. Module-level state means `BaseRepository`, `ModelQuery`, `QueryBuilder`, and `SchemaBuilder` all pick up the right dialect without configuration.

If you need to override the dialect programmatically (for example in a multi-tenant test setup):

```typescript
import { setAtlasDialect, getAtlasDialect } from '@c9up/atlas'

setAtlasDialect('postgres')
const current = getAtlasDialect() // 'postgres'
```

### Connection retry & timeout

By default the initial connection is a **single attempt**: if the DB is unreachable
at boot, atlas fails immediately. Three opt-in knobs let you retry — useful when the
database starts a moment after the app (docker-compose / k8s) or for a transient
boot blip:

```typescript
// config/database.ts
export default {
  url: 'postgres://user:pass@db/mydb',
  poolMin: 1,
  poolMax: 10,

  connectRetries: 5,       // extra attempts if the first connect fails (default 0)
  connectBackoffMs: 500,   // base backoff between attempts — exponential, capped 30s (default 200)
  connectTimeoutMs: 2000,  // per-attempt acquire timeout (see note) — unset ⇒ sqlx default (~30s)
}
```

With the above, atlas tries up to 6 times, each attempt giving up after 2s, waiting
500ms → 1s → 2s → … between them.

> **Why `connectTimeoutMs` matters.** sqlx already retries connection
> *establishment* internally for the duration of its acquire timeout (~30s by
> default). So without `connectTimeoutMs`, each of your `connectRetries` attempts
> can block for ~30s before giving up — `connectRetries: 5` would mean ~150s.
> Lowering `connectTimeoutMs` makes each attempt fail fast, so retries poll at the
> cadence you actually want.

The same knobs are available per named connection (under `connections.<name>`) and
on the low-level `createNapiConnection(url, poolMin, poolMax, pragmas, { retries, backoffMs, timeoutMs })`.

### Adding a new dialect

New dialects are added by extending the `Dialect` enum in the Rust `ream-query` crate (`crates/ream-query/src/dialect.rs`) — not in TypeScript. Implement `quote_ident`, `placeholder`, and `map_column_type` for the new variant, rebuild the NAPI binary, and the entire TS surface picks it up automatically.

## Migrations

### Migration Base Class

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

The `Migration` class exposes `this.schema` (a `Schema` instance) and two helpers:

```typescript
this.raw('expression')   // Raw SQL expression string (for DEFAULT values)
this.now()               // Returns 'NOW()'
```

### MigrationRunner

```typescript
import { MigrationRunner } from '@c9up/atlas'

const runner = new MigrationRunner(adapter, {
  migrationsDir: 'database/migrations',
  dialect: 'sqlite',      // 'sqlite' | 'postgres' | 'mysql' (defaults to the value set via setAtlasDialect)
})

// Run all pending migrations
const executed = await runner.migrate()
// ['20260330_create_orders_table', ...]

// Rollback the last batch
const rolled = await runner.rollback()

// List migration status
const status = await runner.status()
// [{ name: '20260330_create_orders_table', status: 'applied', batch: 1 }]
```

`MigrationRunner` requires a `DatabaseAdapter` with `execute(sql, params?)` and `query(sql, params?)` methods. The adapter returned by `createNapiConnection()` (Rust `ream-db`) implements this interface, and all DDL/DML is compiled through `ream-query` — there is no raw SQL concatenation in the runner.

### Custom tracking-table name

By default Atlas tracks applied migrations in a table called `_migrations`. You can rename it via `database.migrations.table` (or the `tableName` ctor option on `MigrationRunner`) when sharing a database with another framework that already owns `_migrations`, or when a naming convention mandates `schema_versions`, `flyway_schema_history`, etc.

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

The MCP bridge (`ream-mcp migration.*` tools) reads the same key. You can also override at runtime via the `REAM_MIGRATIONS_TABLE` environment variable.

`table` must match `/^[A-Za-z_][A-Za-z0-9_]*$/` — letters, digits, and underscores only, and must not start with a digit. Invalid names throw `AtlasError("MIGRATION_INVALID_TABLE_NAME")` synchronously from the `MigrationRunner` constructor; the Rust query compiler enforces the same shape as a second defense layer.

**Cleanup-helper coupling.** `DatabaseCleanup.truncateAll` skips tables whose name starts with `_`. The default `_migrations` is therefore protected from `truncateAll` out of the box. A custom name like `schema_versions` does NOT start with `_`, so `truncateAll` will wipe it — that is by design (opt-out of auto-exclusion). Pick an `_`-prefixed custom name (e.g. `_my_migrations`) if you want to keep the exclusion.

## Migration template authoring checklist

When a framework package (or your own library) ships a migration template that
will be copied into user applications, the template must work on every Atlas
dialect (SQLite, Postgres, MySQL). Atlas's helper API is dialect-agnostic at
the type level but not always at the SQL level — a handful of helpers emit
DDL that some dialects reject silently or loudly. This checklist captures the
known pitfalls.

1. **Test the emitted DDL per dialect.** Author an integration test that
   imports the migration module, instantiates it under each `AtlasDialect`,
   captures `getUpSQL()`, and asserts the output byte-for-byte against
   committed fixtures. See `packages/nova/tests/integration/migration-template-ddl-output.test.ts`
   for the canonical pattern.

2. **Avoid `t.timestamps()` and `t.id()` in shipped templates.** Both emit
   non-portable DDL defaults: `t.timestamps()` writes `DEFAULT NOW()` (valid
   on Postgres + MySQL, invalid on SQLite — no `NOW()` function), and
   `t.id()` writes `DEFAULT gen_random_uuid()` (valid on Postgres 13+,
   invalid on SQLite + MySQL — no `gen_random_uuid()` function). The
   migration crashes at `migrations:run` on the dialect that lacks the
   function. Write explicit columns instead:

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

3. **Compute the MySQL InnoDB byte budget for VARCHAR PK/UNIQUE columns.** On
   utf8mb4 (the modern MySQL 8 default) using DYNAMIC row format, every
   `VARCHAR(N)` that participates in a `PRIMARY KEY` or `UNIQUE` index must
   satisfy `N * 4 ≤ 3072` (4 bytes per char × N chars ≤ 3072-byte index
   limit). The helper `assertInnodbPkBudget` at
   `packages/atlas/tests/unit/migration-portability.ts` parses CREATE TABLE
   statements and throws on violations — wire it into the MySQL pass of your
   DDL-output test.

4. **Run end-to-end cross-dialect tests when possible.** Compile-time DDL
   fixtures catch the helper-output regressions above. To verify the
   migration actually applies on each backend, set `ATLAS_TEST_PG_URL` and
   `ATLAS_TEST_MYSQL_URL` and run the env-gated harness at
   `packages/atlas/tests/integration/cross-dialect.test.ts`.

The audit is enforced by:

- `packages/atlas/tests/unit/no-non-portable-helpers-in-templates.test.ts`
  (grep-bans the non-portable helpers in every shipped template — fails CI
  if reintroduced)
- `packages/atlas/AUDIT-migration-templates.md` (re-runnable inventory of
  every shipped template + the rules above)

## Schema verification

Atlas can reconcile your models against the **live** database schema — something a pure-JS ORM cannot do, because atlas's driver introspects the real database (SQLite via `pragma_table_info`, Postgres/MySQL via `information_schema`). Four kinds of drift are caught **before** they bite at runtime:

- **`missing-table`** — the model's table does not exist (migrations not run);
- **`missing-in-db`** — a model column maps to a non-existent column (typo → `did you mean`);
- **`type-mismatch`** — a declared `@Column({ type })` clashes with the column's type (conservative: only clear numeric↔text clashes, no false positives);
- **`missing-in-model`** — a `NOT NULL` column with no default that no model maps to → inserts will fail.

### Boot-time guard

Enable it in `config/database.ts`. Atlas has no global entity registry by design (like Lucid, where `ace` is pointed at your models) — list your models.

```typescript
import { defineConfig } from '@c9up/atlas'
import { User } from '#models/user'
import { Post } from '#models/post'

export default defineConfig({
  // ...connections...
  verifySchema: {
    entities: [User, Post],
    mode: 'throw', // default: fail the boot on drift; 'warn' = non-blocking log
  },
})
```

Didactic output on drift:

```
[atlas:check] 3 schema issue(s) found:

  users (User)
    ✗ emial: model property `emial` maps to column `emial`, which does not exist — did you mean `email`?
    ✗ age: declared `string` but column is `INTEGER`
    ✗ created_at: column `created_at` is NOT NULL with no default but no model property maps to it — inserts will fail
```

### CLI command (`atlas:check`)

Atlas ships a command for Ream's console kernel (the AdonisJS `ace` equivalent). List your models, register the command in `reamrc.ts`, and run it through your console entry.

```typescript
// commands/atlas-check.ts
import { schemaCheckCommand } from '@c9up/atlas'
import { User } from '#models/user'
import { Post } from '#models/post'
export default schemaCheckCommand([User, Post])

// reamrc.ts
export default defineConfig({
  // ...providers...
  commands: [() => import('./commands/atlas-check.js')],
})

// bin/console.ts — console entry (boots in console mode: DB open, no HTTP server)
import { Ignitor } from '@c9up/ream'
new Ignitor(APP_ROOT, { importer })
  .useRcFile((await import('../reamrc.js')).default)
  .console()
  .handle(process.argv.slice(2))
```

Then:

```bash
node bin/console.ts atlas:check         # exit 1 on drift — ideal in CI
node bin/console.ts atlas:check --warn  # non-blocking report (exit 0)
```

### Programmatic API

For a CI command / script:

```typescript
import { checkSchema, formatSchemaFindings } from '@c9up/atlas'
import db from '@c9up/atlas/services/db'

const findings = await checkSchema([User, Post], db, 'postgres')
if (findings.length > 0) {
  console.error(formatSchemaFindings(findings))
  process.exit(1)
}
```

`verifySchema(entities, db, dialect, { mode })` wraps `checkSchema` + formatting + throw/warn. `introspectTable(db, dialect, table)` returns a table's real shape (or `null` when absent).

## AtlasProvider

Register `AtlasProvider` in your application's provider list. It reads `config/database.ts`, opens the database connection, registers the adapter in the container, and runs pending migrations automatically on boot.

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
  url: 'sqlite:data/app.db',          // or 'postgres://...' or 'mysql://...'
  poolMin: 1,
  poolMax: 10,
  migrations: {
    path: './database/migrations',
  },
}
```

On boot, `AtlasProvider`:
1. Opens a connection pool via Rust `ream-db` (sqlx under the hood — SQLite, PostgreSQL, or MySQL)
2. Detects the dialect from the URL scheme and calls `setAtlasDialect(...)`
3. Registers `db` and `db.connection` in the container
4. Runs pending migrations through `MigrationRunner` (all DDL compiled by `ream-query`)

## Next Steps

- [Rune (Validation)](/en/modules/rune) — Validate input before saving entities
- [Event Bus](/en/ream/events) — Dispatch domain events after save
