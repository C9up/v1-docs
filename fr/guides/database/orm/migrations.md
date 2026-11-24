# Migrations

Ce guide couvre l'exécution des migrations :

- Workflow MigrationRunner
- Quand les migrations tournent
- Commandes console
- Mapping des commandes
- Atomicité
- Checklist production
- Notes de sécurité
- Migrations
- Liste de vérification pour rédiger un template de migration

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

## Quand les migrations tournent

Démarrer une application ne la migre pas. `migration:run` le fait, et rien
d'autre, pour deux raisons qui ne sont pas de la
cérémonie : le chemin de démarrage tourne aussi lors d'une inspection
(`ream inspect`, un listing de routes, une passe de codegen), donc une commande
en lecture seule mutait le schéma ; et toutes les répliques d'un déploiement
progressif démarrent en même temps, donc elles se couraient dessus sur la même
base.

Un hôte qui possède réellement sa base à lui seul — un conteneur qui démarre une
fois, une application embarquée sur une base fichier — peut demander que les
migrations en attente s'exécutent au démarrage :

```ts
// config/database.ts
migrations: { paths: ['database/migrations'], autoRun: true }
```

C'est désactivé sauf demande explicite, dans tous les environnements, et ignoré
en développement (`REAM_ENV`, ou à défaut `NODE_ENV`, valant `development`,
`develop` ou `dev`) : une machine de développement a un terminal
pour lancer la commande, et un serveur de dev qui redémarre à chaque sauvegarde
disputerait le verrou de migration à son instance précédente. Une
commande de migration l'emporte quand même, donc démarrer l'application pour
`migration:run` ne migre jamais deux fois.

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

En production, `migration:run` demande confirmation avant d'appliquer quoi que
ce soit ; `--force` évite la question. Un run qui ne peut pas poser la question
(pas de terminal) ou dont la réponse est non n'applique rien.

La production se lit dans l'application quand la console la fournit, sinon dans
`REAM_ENV` et `NODE_ENV` : l'une ou l'autre à `production` (ou `prod`) active
cette question et la garde des `migration:rollback`, `reset`, `refresh`, `fresh`
et `db:wipe`.

### D'où viennent les chemins

De la config de la connexion — la commande lit donc ce
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

::: tip D'où vient `factories.path`
Atlas ne dépend pas de l'arborescence de l'application du framework : le dossier
des factories se configure ici, avec `database/factories` par défaut.
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
- `dryRun()` retourne le SQL qui serait exécuté. Il n'écrit jamais : pendant
  chaque `up()`, toute écriture tentée par n'importe quelle connexion (query
  builder, instruction brute, `execute`, transaction) échoue avec
  `E_ATLAS_DRY_RUN_WRITE` ; les lectures du catalogue comme
  `this.schema.hasTable()` fonctionnent toujours. Tester `this.dryRun` dans `up()`
  pour sauter ces effets de bord.

## Atomicité

Si l'adapter fournit `runInTransaction(batch)`, chaque migration est exécutée de façon atomique avec l'insert/delete de tracking `ream_migrations` dans la même transaction.

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

## Migrations

### Classe de base Migration

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

La classe `Migration` expose `this.schema` (une instance de `Schema`) et deux helpers :

```typescript
this.raw('expression')   // Expression SQL brute (pour les valeurs DEFAULT)
this.now()               // CURRENT_TIMESTAMP en SQLite, NOW() en Postgres et MySQL
```

### MigrationRunner

```typescript
import { MigrationRunner } from '@c9up/atlas'

const runner = new MigrationRunner(adapter, {
  migrationsDir: 'database/migrations',
  dialect: 'postgres',    // 'sqlite' | 'postgres' | 'mysql' — défaut 'sqlite' : passez le dialecte de la connexion
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

Le runner ne lit pas le dialecte du module fixé par `setAtlasDialect()` : sans `dialect`, il compile chaque instruction pour SQLite (mapping de types, placeholders `?`, table de verrou), quelle que soit la base à laquelle parle l'adaptateur. Passez toujours le dialecte de la connexion quand vous en construisez un à la main ; les commandes `migration:*` le passent pour vous.

### Options de sécurité du runner

| Option | Défaut | Effet |
|--------|--------|-------|
| `disableRollbacksInProduction` | `true` | `rollback()`, `reset()`, `refresh()`, `fresh()` et `wipe()` lèvent `E_ROLLBACK_DISABLED_IN_PRODUCTION` quand `REAM_ENV` ou `NODE_ENV` indique la production, sauf appel avec `{ force: true }` (`--force` sur la commande correspondante). À `false`, les commandes demandent une confirmation en production (sans `--force`). Clé de configuration `migrations.disableRollbacksInProduction`. |
| `disableLocks` | `false` | Saute la table `<tableName>_lock` qui empêche deux exécutions de migrer la même base en même temps. Option du constructeur uniquement ; laissez-la désactivée partout où deux processus peuvent migrer. |
| `disableTransactions` | `false` | Exécute chaque migration hors transaction, si bien qu'un échec laisse une migration à moitié appliquée. Une migration seule peut s'en exclure avec `static disableTransactions = true`. Clé de configuration `migrations.disableTransactions`. |

`migration:run` lui-même demande une confirmation en production, sauf avec `--force`.

### Nom personnalisé pour la table de suivi

Par défaut Atlas suit les migrations appliquées dans une table nommée `ream_migrations`. Vous pouvez la renommer avec `migrations.tableName` dans `config/database.ts` (ou l'option `tableName` du constructeur `MigrationRunner`) lorsque vous partagez la base avec une autre application qui possède déjà ce nom, ou lorsqu'une convention de nommage impose `schema_versions`, `flyway_schema_history`, etc.

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
        tableName: 'schema_versions',   // ← table de suivi personnalisée
      },
    },
  },
})
```

Les commandes `migration:*` et `AtlasProvider` lisent la même clé : tous voient le même historique.

`tableName` doit correspondre à `/^[A-Za-z_][A-Za-z0-9_]*$/` — lettres, chiffres et underscores uniquement, sans commencer par un chiffre. Un nom invalide lève `errors.E_ATLAS_MIGRATION_INVALID_TABLE_NAME`, de façon synchrone, depuis le constructeur `MigrationRunner` ; le compilateur de requêtes Rust applique la même forme en seconde ligne de défense.

Renommer ne déplace pas l'historique : le runner crée la nouvelle table vide, n'y voit aucune migration appliquée et les rejoue toutes. Copiez d'abord les lignes (`INSERT INTO schema_versions SELECT * FROM ream_migrations`), puis basculez.

**Couplage avec le helper de nettoyage.** `truncateAll(db, ignoreTables?)` (de `@c9up/atlas/testing`) vide toutes les tables utilisateur et ignore les tables du framework, dont le nom commence par `ream_`. Le défaut `ream_migrations` et sa `ream_migrations_lock` sont donc protégées d'office. Un nom personnalisé sans ce préfixe, comme `schema_versions`, est une table utilisateur pour `truncateAll`, qui la vide et oblige à rejouer toutes les migrations à l'exécution suivante. Gardez le préfixe `ream_` (par exemple `ream_schema_versions`), ou passez le nom dans `ignoreTables` : `truncateAll(db, ['schema_versions', 'schema_versions_lock'])`.

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

2. **Éviter `t.id()` dans les templates embarqués.** Il écrit
   `DEFAULT gen_random_uuid()`, valide sur Postgres 13+ et invalide en SQLite
   et MySQL, qui n'ont pas cette fonction : la migration crashe lors du
   `migration:run` sur ces dialectes. Écrire la colonne explicitement et
   fournir l'UUID à l'insertion. `t.timestamps()` est portable — son
   `DEFAULT CURRENT_TIMESTAMP` est compris par tous les dialectes — tout comme
   `this.now()`.

   ```typescript
   // ✗ À NE PAS FAIRE dans les templates embarqués
   t.id()

   // ✓ Équivalent portable
   t.uuid('id').primary()                  // pas de DEFAULT — à fournir à l'INSERT
   t.timestamps()                          // CURRENT_TIMESTAMP sur tous les dialectes
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
  (grep-bannit les helpers listés dans chaque template embarqué — CI rouge
  si réintroduits)
