# Migrations

This guide covers running migrations:

- MigrationRunner workflow
- When migrations run
- Console commands
- Commands mapping
- Atomicity
- Production checklist
- Safety notes
- Migrations
- Migration template authoring checklist

## MigrationRunner workflow

```ts
const runner = new MigrationRunner(db, {
  migrationsDir: 'database/migrations',
  dialect: 'postgres',
})

await runner.init()
await runner.status()
await runner.migrate()
```

## When migrations run

Booting an application does not migrate it. `migration:run` does, and nothing
else, for two reasons that are not ceremony:
the boot path also runs under an inspection (`ream inspect`, a route listing, a
codegen pass), so a read-only command mutated the schema; and every replica of a
rolling deploy boots at once, so they raced each other over the same database.

A host that genuinely owns its database alone — a container that starts once, an
embedded app on a file database — can ask for pending migrations to run at boot:

```ts
// config/database.ts
migrations: { paths: ['database/migrations'], autoRun: true }
```

It stays off unless asked for, in every environment, and it is ignored in
development (`REAM_ENV`, or else `NODE_ENV`, set to `development`, `develop` or
`dev`): a development machine has a terminal to run the
command in, and a dev server that restarts on every save would race its previous
instance for the migration lock. A migration command still wins over it, so booting the app for `migration:run` never migrates twice.

## Console commands

Every migration, seeder and schema command Atlas provides comes from the
package itself. Register the loader once — `configure()` writes this line:

```ts
// reamrc.ts
commands: [() => import('@c9up/atlas/commands')]
```

That is the whole registration. Nothing is added to the `ream` binary: it
dispatches any name it does not own to the application's console kernel, which
is what lets Atlas ship a command on its own release cycle.

```sh
ream migration:run          # apply every pending migration
ream migration:rollback     # undo the last batch (--batch=N, --force)
ream migration:status       # what has run and what has not
ream migration:reset        # roll everything back
ream migration:refresh      # reset, then re-run
ream migration:fresh        # drop every table, then re-run
ream migration:unlock       # clear a lock a crashed run left behind
ream make:migration <name>  # scaffold a timestamped migration
ream db:wipe                # drop every table, migrations table included
ream db:seed                # run the seeders
ream make:seeder <name>
ream make:factory <Model>
ream schema:dump            # dump the schema to .sql + manifest
ream schema:generate        # generate schema classes from the live database
ream atlas:check            # verify the models against the live schema
```

In production, `migration:run` asks for confirmation before applying anything;
`--force` skips the question. A run that cannot ask (no terminal) or whose
question is declined applies nothing.

Production is read from the application when the console provides it, else
from `REAM_ENV` and `NODE_ENV`: either one set to `production` (or `prod`) turns
on this question and the rollback guard of `migration:rollback`, `reset`,
`refresh`, `fresh` and `db:wipe`.

### Where the paths come from

The connection's own config — so a command reads what
the application booted with, and there is nothing to repeat:

```ts
// config/database.ts
export default defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      url: process.env.DATABASE_URL,
      migrations: {
        paths: ['database/migrations'],
        tableName: 'ream_migrations',      // where the runs are tracked
        naturalSort: false,
        disableTransactions: false,
        disableRollbacksInProduction: true,
      },
      seeders: { paths: ['database/seeders'] },
      factories: { path: 'database/factories' },
      schemaGeneration: { outputPath: 'app/schema.ts' },
    },
  },
})
```

A key set at the top level applies to every connection; a connection that sets
the same key wins, and the two are merged one level deep — so naming your paths
per connection does not drop a `tableName` set beside them.

`atlas:check` reads its model list from `verifySchema.entities`, the same list
the boot-time check uses. With no models listed it says so and exits non-zero
rather than reporting a clean run it never performed.

::: tip Where `factories.path` comes from
Atlas does not depend on the framework's application layout, so the factories
directory is configured here — defaulting to `database/factories`.
:::

### Commands with different options

The factories are still exported for the cases the config cannot express — a
second migration source, a check over a different model set:

```ts
// commands/legacy-migrate.ts
import { migrationRunCommand } from '@c9up/atlas'

export default migrationRunCommand({ migrationsDir: 'database/legacy' })
```

```ts
// reamrc.ts
commands: [
  () => import('@c9up/atlas/commands'),
  () => import('./commands/legacy-migrate.js'),
]
```

## Commands mapping

- `migrate()` executes all pending migrations.
- `rollback()` rolls back the latest batch.
- `reset()` rolls back all batches.
- `refresh()` = reset then migrate.
- `fresh()` currently aliases `refresh()`.
- `dryRun()` returns SQL that would be executed. It never writes: while each
  `up()` runs, any write it attempts through any connection (a query builder,
  a raw statement, `execute`, a transaction) fails with `E_ATLAS_DRY_RUN_WRITE`;
  catalog reads such as `this.schema.hasTable()` still work. Check `this.dryRun`
  in `up()` to skip such side effects.

## Atomicity

If adapter provides `runInTransaction(batch)`, each migration is run atomically with its `ream_migrations` tracking insert/delete in the same transaction.

If adapter does not provide it, Atlas logs a warning and falls back to sequential execution.

## Production checklist

- Implement `runInTransaction` in every production adapter.
- Keep `up/down` strictly symmetric.
- Keep migration files deterministic and ordered.
- Run `dryRun()` in CI before production deployment.
- Test rollback paths on staging data snapshots.

## Safety notes

- Migration filenames are validated (`assertSafeName`).
- Migration directory is constrained to configured base (`assertPathInsideBase`).
- Do not concatenate user input into migration SQL.

## Migrations

### Migration Base Class

```typescript
import { Migration } from '@c9up/atlas'

export default class CreateOrdersTable extends Migration {
  async up(): Promise<void> {
    this.schema.createTable('orders', (table) => {
      table.id()
      table.string('status', 50).notNullable().defaultTo('pending')
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
this.now()               // CURRENT_TIMESTAMP on SQLite, NOW() on Postgres and MySQL
```

### MigrationRunner

```typescript
import { MigrationRunner } from '@c9up/atlas'

const runner = new MigrationRunner(adapter, {
  migrationsDir: 'database/migrations',
  dialect: 'postgres',    // 'sqlite' | 'postgres' | 'mysql' — defaults to 'sqlite': pass the connection's dialect
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

The runner does not read the module dialect set by `setAtlasDialect()`: without `dialect` it compiles every statement for SQLite (type map, `?` placeholders, lock table), whatever database the adapter talks to. Always pass the connection's dialect when you build one by hand; the `migration:*` commands pass it for you.

### Runner safety options

| Option | Default | Effect |
|--------|---------|--------|
| `disableRollbacksInProduction` | `true` | `rollback()`, `reset()`, `refresh()`, `fresh()` and `wipe()` throw `E_ROLLBACK_DISABLED_IN_PRODUCTION` when `REAM_ENV` or `NODE_ENV` says production, unless called with `{ force: true }` (`--force` on the matching command). Set to `false`, the commands ask for confirmation in production instead (no `--force`). Config key `migrations.disableRollbacksInProduction`. |
| `disableLocks` | `false` | Skips the `<tableName>_lock` table that stops two runs from migrating one database at once. Constructor option only; leave it off wherever two processes can migrate. |
| `disableTransactions` | `false` | Runs every migration outside a transaction, so a failure leaves a half-applied migration behind. A single migration can opt out alone with `static disableTransactions = true`. Config key `migrations.disableTransactions`. |

`migration:run` itself asks for confirmation in production, unless given `--force`.

### Custom tracking-table name

By default Atlas tracks applied migrations in a table called `ream_migrations`. You can rename it with `migrations.tableName` in `config/database.ts` (or the `tableName` option of the `MigrationRunner` constructor) when sharing a database with another application that already owns that name, or when a naming convention mandates `schema_versions`, `flyway_schema_history`, etc.

```typescript
// config/database.ts
import { defineConfig } from '@c9up/atlas'

export default defineConfig({
  connection: 'primary',
  connections: {
    primary: {
      url: 'postgres://localhost/myapp',
      migrations: {
        paths: ['database/migrations'],
        tableName: 'schema_versions',   // ← custom tracking table
      },
    },
  },
})
```

The `migration:*` commands and `AtlasProvider` read the same key, so they all see one history.

`tableName` must match `/^[A-Za-z_][A-Za-z0-9_]*$/` — letters, digits, and underscores only, and must not start with a digit. An invalid name throws `errors.E_ATLAS_MIGRATION_INVALID_TABLE_NAME` synchronously from the `MigrationRunner` constructor; the Rust query compiler enforces the same shape as a second defense layer.

Renaming does not move the history: the runner creates the new table empty, sees no applied migration and replays every one. Copy the rows first (`INSERT INTO schema_versions SELECT * FROM ream_migrations`), then switch.

**Cleanup-helper coupling.** `truncateAll(db, ignoreTables?)` (from `@c9up/atlas/testing`) empties every user table and skips the framework tables, whose name starts with `ream_`. The default `ream_migrations` and its `ream_migrations_lock` are therefore protected out of the box. A custom name without that prefix, like `schema_versions`, is a user table to `truncateAll`, which empties it and forces every migration to replay on the next run. Keep the `ream_` prefix (e.g. `ream_schema_versions`), or pass the name in `ignoreTables`: `truncateAll(db, ['schema_versions', 'schema_versions_lock'])`.

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

2. **Avoid `t.id()` in shipped templates.** It writes
   `DEFAULT gen_random_uuid()`, valid on Postgres 13+ and invalid on SQLite
   and MySQL, which have no such function: the migration crashes at
   `migration:run` there. Write the column explicitly and supply the UUID at
   insert time. `t.timestamps()` is portable — its `DEFAULT CURRENT_TIMESTAMP`
   is understood by every dialect — and so is `this.now()`.

   ```typescript
   // ✗ DO NOT in shipped templates
   t.id()

   // ✓ Portable equivalent
   t.uuid('id').primary()                  // no DEFAULT — supply it at INSERT time
   t.timestamps()                          // CURRENT_TIMESTAMP on every dialect
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
  (grep-bans the listed helpers in every shipped template — fails CI if
  reintroduced)
