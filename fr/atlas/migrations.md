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

## Commandes console

Toutes les commandes de migration, de seed et de schéma d'Atlas viennent du
paquet lui-même. Le chargeur s'enregistre une fois — `configure()` écrit cette
ligne :

```ts
// reamrc.ts
commands: [() => import('@c9up/atlas/commands')]
```

C'est tout l'enregistrement. Rien n'est ajouté au binaire `ream` : il transmet
au noyau console de l'application tout nom qu'il ne connaît pas, et c'est ce
qui permet à Atlas de livrer une commande sur son propre cycle de publication.

```sh
ream migration:run          # applique les migrations en attente
ream migration:rollback     # annule le dernier batch (--batch=N, --force)
ream migration:status       # ce qui a tourné et ce qui reste
ream migration:reset        # annule tout
ream migration:refresh      # reset, puis rejoue
ream migration:fresh        # supprime toutes les tables, puis rejoue
ream migration:unlock       # libère un verrou laissé par un run interrompu
ream make:migration <nom>   # génère une migration horodatée
ream db:wipe                # supprime toutes les tables, table de suivi comprise
ream db:seed                # exécute les seeders
ream make:seeder <nom>
ream make:factory <Model>
ream schema:dump            # exporte le schéma en .sql + manifeste
ream schema:generate        # génère les classes de schéma depuis la base
ream atlas:check            # vérifie les modèles face au schéma réel
```

### D'où viennent les chemins

De la config de la connexion, là où Lucid les garde — la commande lit donc ce
avec quoi l'application a démarré, et il n'y a rien à répéter :

```ts
// config/database.ts
export default defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      url: process.env.DATABASE_URL,
      migrations: {
        paths: ['database/migrations'],
        tableName: 'ream_migrations',      // où les runs sont suivis
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

Une clé posée au niveau supérieur s'applique à toutes les connexions ; une
connexion qui pose la même clé l'emporte, et les deux fusionnent d'un niveau —
nommer ses chemins par connexion ne fait donc pas perdre un `tableName` posé à
côté.

`atlas:check` lit sa liste de modèles dans `verifySchema.entities`, la même que
celle de la vérification au démarrage. Sans modèle listé, la commande le dit et
sort en erreur plutôt que d'annoncer un contrôle qu'elle n'a pas fait.

::: tip `factories.path` n'est pas une clé Lucid
Lucid résout le dossier des factories depuis l'arborescence de l'application.
Atlas ne dépend pas du framework : le dossier se configure ici, avec le même
`database/factories` par défaut.
:::

### Une commande avec d'autres options

Les fabriques restent exportées pour ce que la config ne sait pas exprimer —
une seconde source de migrations, un contrôle sur un autre jeu de modèles :

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
