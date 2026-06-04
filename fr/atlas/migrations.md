# Atlas - Migrations

## Workflow MigrationRunner

```ts
const runner = new MigrationRunner(db, {
  migrationsDir: 'database/migrations',
  dialect: 'postgres',
})

await runner.init()
await runner.status()
await runner.migrate()
```

## Mapping des commandes

- `migrate()` exécute toutes les migrations en attente.
- `rollback()` annule le dernier batch.
- `reset()` annule tous les batchs.
- `refresh()` = reset puis migrate.
- `fresh()` alias actuel de `refresh()`.
- `dryRun()` retourne le SQL qui serait exécuté.

## Atomicité

Si l'adapter fournit `runInTransaction(batch)`, chaque migration est exécutée de façon atomique avec l'insert/delete de tracking `_migrations` dans la même transaction.

Sinon, Atlas log un warning et bascule en exécution séquentielle.

## Checklist production

- Implémenter `runInTransaction` dans chaque adapter de prod.
- Garder une stricte symétrie `up/down`.
- Conserver des fichiers déterministes et ordonnés.
- Exécuter `dryRun()` en CI avant déploiement.
- Tester les rollbacks sur des snapshots staging.

## Notes de sécurité

- Les noms de fichiers migration sont validés (`assertSafeName`).
- Le dossier de migration est borné à la base configurée (`assertPathInsideBase`).
- Ne jamais concaténer des entrées utilisateur dans le SQL de migration.
