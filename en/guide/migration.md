# Migrations

Atlas tracks schema changes through migration files. Each migration is a TypeScript class that describes how to apply (`up`) and reverse (`down`) a set of database changes using a fluent schema builder API.

## How migrations run

When `AtlasProvider` boots, it checks whether a `migrations.path` is set in your `config/database.ts`. If it is, Atlas:

1. Creates a `_migrations` table in the database if it does not already exist.
2. Reads all `.ts` / `.js` files in the migrations directory, sorted alphabetically.
3. Skips any file whose name already appears in `_migrations`.
4. Calls `up()` on each pending migration and records its name in `_migrations`.

Rolling back is not automatic — you call `down()` manually or through a CLI command.

## Config wiring

```typescript
// config/database.ts
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default {
  client: 'sqlite' as const,
  connection: {
    filename: join(__dirname, '..', 'data', 'app.db'),
  },
  migrations: {
    path: join(__dirname, '..', 'database', 'migrations'),
  },
}
```

## File naming

Name migration files with a zero-padded numeric prefix so they sort and run in the correct order:

```
database/migrations/
  001_create_users.ts
  002_create_posts.ts
  003_create_comments.ts
```

## Writing a migration

Extend `Migration` from `@c9up/atlas` and implement `up()` and `down()`. The `this.schema` property gives you access to the full schema builder API.

```typescript
import { Migration } from '@c9up/atlas'

export default class CreateUsers extends Migration {
  up() {
    this.schema.createTable('users', (t) => {
      t.uuid('id').primary()
      t.string('email', 255).notNullable().unique()
      t.string('first_name', 100).notNullable()
      t.string('last_name', 100).notNullable()
      t.string('phone', 30).nullable()
      t.string('password_hash', 255).notNullable()
      t.timestamps()
    })
  }

  down() {
    this.schema.dropTable('users')
  }
}
```

A second migration that references the first:

```typescript
import { Migration } from '@c9up/atlas'

export default class CreatePosts extends Migration {
  up() {
    this.schema.createTable('posts', (t) => {
      t.uuid('id').primary()
      t.uuid('user_id').notNullable().references('users', 'id')
      t.string('title', 255).notNullable()
      t.text('body').notNullable()
      t.boolean('published').notNullable().defaultTo('0')
      t.timestamps()
    })
  }

  down() {
    this.schema.dropTable('posts')
  }
}
```

## Schema builder API

### Table operations

| Method | Description |
|--------|-------------|
| `schema.createTable(name, callback)` | Create a new table. The callback receives a `TableBuilder`. |
| `schema.dropTable(name)` | Drop the table (generates `DROP TABLE IF EXISTS`). |
| `schema.createIndex(table, columns, name?, unique?)` | Create a standalone index. |
| `schema.dropIndex(name)` | Drop an index. |
| `schema.raw(sql)` | Append a raw SQL statement to the current migration. |

### Column types

All column methods are called on the `TableBuilder` instance passed to the `createTable` callback. Every method returns `this` so modifiers can be chained.

| Method | SQL type (Postgres / SQLite) |
|--------|------------------------------|
| `id()` | Shortcut: `uuid('id').primary().defaultTo('gen_random_uuid()')` |
| `uuid(name)` | `UUID` / `TEXT` |
| `string(name, length?)` | `VARCHAR(n)` / `TEXT` — default length 255 |
| `text(name)` | `TEXT` / `TEXT` |
| `integer(name)` | `INTEGER` / `INTEGER` |
| `bigInteger(name)` | `BIGINT` / `INTEGER` |
| `decimal(name, precision?, scale?)` | `DECIMAL(p, s)` / `REAL` — defaults 10, 2 |
| `boolean(name)` | `BOOLEAN` / `INTEGER` |
| `date(name)` | `DATE` / `TEXT` |
| `timestamp(name)` | `TIMESTAMP` / `TEXT` |
| `timestamps()` | Shortcut: `created_at` + `updated_at` both `NOT NULL DEFAULT NOW()` |
| `json(name)` | `JSONB` / `TEXT` |
| `binary(name)` | `BYTEA` / `BLOB` |

### Column modifiers

Modifiers apply to the column defined by the most recent column call.

| Modifier | Effect |
|----------|--------|
| `.primary()` | Marks the column as `PRIMARY KEY` |
| `.notNullable()` | Adds `NOT NULL` constraint |
| `.nullable()` | Removes `NOT NULL` (columns are nullable by default) |
| `.unique()` | Adds `UNIQUE` constraint |
| `.defaultTo(value)` | Sets a raw SQL default expression |
| `.references(table, column?)` | Adds a foreign key reference — `column` defaults to `'id'` |

`defaultTo()` accepts a raw SQL string, not a JavaScript value. Use SQL literals or functions:

```typescript
t.boolean('active').notNullable().defaultTo('true')       // Postgres
t.boolean('active').notNullable().defaultTo('1')          // SQLite
t.timestamp('expires_at').defaultTo('NOW()')
t.string('role', 50).notNullable().defaultTo("'member'")
```

## Indexes

Add indexes inside `createTable`:

```typescript
this.schema.createTable('memberships', (t) => {
  t.uuid('id').primary()
  t.uuid('user_id').notNullable().references('users')
  t.uuid('residence_id').notNullable().references('residences')

  t.index('user_id')                           // single column
  t.index(['user_id', 'residence_id'])          // composite
  t.uniqueIndex('email')                        // unique
  t.index('status', 'idx_custom_name')          // custom name
})
```

Or as standalone operations:

```typescript
this.schema.createIndex('orders', ['user_id', 'status'])
this.schema.dropIndex('idx_orders_status')
```

## Dialect support

The same migration code works across PostgreSQL, SQLite, MySQL, and MariaDB. The dialect is determined by `config/database.ts`:

```typescript
export default {
  client: 'mysql',  // 'postgres' | 'sqlite' | 'mysql' | 'mariadb'
  // ...
}
```

See [Atlas — Dialect System](/en/modules/atlas#dialect-system) for details.

## Complete example

```typescript
import { Migration } from '@c9up/atlas'

export default class CreateMemberships extends Migration {
  up() {
    this.schema.createTable('memberships', (t) => {
      t.uuid('id').primary()
      t.uuid('user_id').notNullable().references('users', 'id')
      t.uuid('residence_id').notNullable().references('residences', 'id')
      t.string('role', 50).notNullable().defaultTo("'member'")
      t.boolean('active').notNullable().defaultTo('1')
      t.json('permissions').nullable()
      t.timestamps()
    })
  }

  down() {
    this.schema.dropTable('memberships')
  }
}
```

## Migration tracking

Atlas uses a `_migrations` table to record which files have been applied:

```sql
CREATE TABLE "_migrations" (
  "name"        TEXT PRIMARY KEY,
  "executed_at" TEXT NOT NULL DEFAULT (datetime('now'))
);
```

The `name` column stores the file name without extension (e.g. `001_create_users`). A migration is skipped on the next boot if its name already exists in this table.

## Next steps

- [Atlas (ORM)](/en/modules/atlas) — entities, repositories, and the query builder
- [Configuration](/en/guide/configuration) — wiring the database config
- [Providers](/en/guide/providers) — how `AtlasProvider` fits into the boot lifecycle
