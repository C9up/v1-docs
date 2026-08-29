# Atlas - Migrations

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

### Where the paths come from

The connection's own config, the way Lucid keeps it — so a command reads what
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

::: tip `factories.path` is not a Lucid key
Lucid resolves the factories directory from the application layout. Atlas does
not depend on the framework, so the directory is configured here — defaulting
to the same `database/factories`.
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
- `dryRun()` returns SQL that would be executed.

## Atomicity

If adapter provides `runInTransaction(batch)`, each migration is run atomically with its `_migrations` tracking insert/delete in the same transaction.

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
