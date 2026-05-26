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
