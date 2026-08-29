# Atlas - Dump & vérification de schéma

Atlas peut sérialiser la structure d'une base de données en un dump portable,
générer des classes de modèles à partir d'une base existante, et réconcilier vos
modèles avec le schéma réel. Ces trois opérations lisent la **vraie** base via
l'introspection du catalogue — Atlas ne délègue jamais à `pg_dump`/`mysqldump`
(il introspecte la connexion, comme AdonisJS Lucid).

## Commandes console

Les trois sont livrées par le paquet. Le chargeur s'enregistre une fois et
elles sont disponibles — `configure()` écrit la ligne :

```ts
// reamrc.ts
commands: [() => import('@c9up/atlas/commands')]
```

Elles lisent ce dont elles ont besoin dans `config/database.ts` :
`schemaGeneration.outputPath` pour le fichier généré, `migrations.paths` pour le
`--prune` du dump, et `verifySchema.entities` pour les modèles qu'`atlas:check`
réconcilie (Atlas n'a pas de registre global d'entités — vous listez vos
modèles, comme dans Lucid).

| Commande | Rôle |
| --- | --- |
| `schema:dump` | Sérialise le schéma en un dump `.sql` + un manifeste `.meta.json`. Flags : `--prune`, `--connection`, `--path`. |
| `schema:generate` | Introspecte la base et (ré)écrit des classes de schéma `BaseModel`. Flags : `--connection`, `--compact-output`. |
| `atlas:check` | Réconcilie les modèles avec le schéma vivant ; rapporte le drift. Flag : `--warn`. |

Pour un jeu que la config ne sait pas exprimer — le dump d'une seconde source
de migrations, un contrôle sur d'autres modèles que ceux du démarrage — les
fabriques restent exportées :

```ts
// commands/atlas-check-legacy.ts
import { schemaCheckCommand } from '@c9up/atlas'
import { LegacyUser } from '#models/legacy_user'
export default schemaCheckCommand([LegacyUser])

// reamrc.ts → commands: [
//   () => import('@c9up/atlas/commands'),
//   () => import('./commands/atlas-check-legacy.js'),
// ]
```

## `schema:dump` — sérialiser le schéma

`SchemaDumper` écrit deux fichiers : un dump `.sql` du DDL de chaque table plus
les lignes de suivi des migrations, et un manifeste `.meta.json` qui le décrit.
Une base fraîche peut alors être reconstruite depuis le dump
(`migration:run --schema-path`) au lieu de rejouer tout l'historique des
migrations — le runner charge le dump, puis n'applique que les migrations
postérieures.

Le DDL est reconstruit **par dialecte** :

- **SQLite** — lu tel quel depuis `sqlite_master` (les instructions `CREATE`
  exactes).
- **MySQL** — `SHOW CREATE TABLE` (DDL exact, index et contraintes inclus).
- **Postgres** — reconstruit depuis l'introspection du catalogue : `CREATE TABLE`
  (colonnes + clé primaire) + clés étrangères + contraintes `CHECK` + index,
  puis les vues et vues matérialisées du schéma. **Pas de `pg_dump`.**

### Utilisation programmatique

```ts
import { SchemaDumper } from '@c9up/atlas'

const dumper = new SchemaDumper(db, { migrationsDir: 'database/migrations' })
await dumper.run()
if (dumper.error) throw dumper.error

console.log(dumper.result?.dumpPath)   // database/schema/default-schema.sql
console.log(dumper.result?.metaPath)   // database/schema/default-schema.meta.json
console.log(dumper.result?.tableCount) // nombre d'instructions CREATE TABLE
```

Les erreurs sont capturées sur `.error` (parité Lucid) plutôt que levées, pour
qu'une CLI puisse les rapporter proprement ; `.result` contient les chemins de
sortie en cas de succès.

`SchemaDumperOptions` :

| Option | Défaut | Signification |
| --- | --- | --- |
| `connectionName` | `"default"` | Nom logique de connexion, utilisé dans les noms de fichiers par défaut. |
| `dumpPath` | — | Chemin **fichier** explicite du dump SQL (Lucid `--path`) ; prime sur `outputDir`/`connectionName`. |
| `outputDir` | `"database/schema"` | Répertoire pour le `{connection}-schema.sql` par défaut. |
| `migrationsDir` | `""` | Répertoire des migrations ; requis pour `--prune`. |
| `schemaTableName` | `"ream_migrations"` | Nom de la table de suivi des migrations. |
| `prune` | `false` | Après un dump réussi, supprime tous les fichiers de migration et enregistre leurs noms dans le manifeste. |
| `generatedAt` | maintenant | Horodatage du manifeste ; en passer un pour des tests déterministes. |

### Le manifeste

`readSchemaDumpManifest(dumpPath)` lit et valide le sidecar, renvoyant
`undefined` quand il est absent et **levant** une erreur sur un manifeste présent
mais malformé, pour qu'un dump corrompu soit détecté plutôt que mal chargé
silencieusement. `schemaDumpManifestPath(dumpPath)` dérive le chemin `.meta.json`
depuis le chemin `.sql`.

```ts
import { readSchemaDumpManifest } from '@c9up/atlas'

const manifest = await readSchemaDumpManifest('database/schema/default-schema.sql')
// { version: 1, connection, dialect, dumpPath, generatedAt,
//   schemaTableName, schemaVersionsTableName, squashedMigrationNames }
```

> `--prune` compresse l'historique des migrations dans le dump : il supprime tous
> les fichiers de `migrationsDir` et enregistre leurs noms dans
> `squashedMigrationNames`, pour que le runner distingue une migration
> volontairement compressée d'un fichier manquant.

## `schema:generate` — codegen database-first

Introspecte la base vivante et écrit un `schema.ts` avec une sous-classe
`BaseModel` par table (parité Lucid `schema:generate`). Les modifications
manuelles de la sortie sont perdues à la régénération.

```ts
import { generateSchemaFile } from '@c9up/atlas'

const count = await generateSchemaFile(db, { outputPath: 'database/schema.ts' })
```

`renderSchemaFile(tables, rules?, compact?)` est le renderer pur sous-jacent
(sans accès DB) si vous détenez déjà les colonnes introspectées.

`SchemaGenerateOptions` :

| Option | Signification |
| --- | --- |
| `outputPath` | Fichier où écrire les classes générées (requis). |
| `excludeTables` | Tables supplémentaires à ignorer (les tables framework le sont toujours). |
| `enabled` | `false` désactive la commande **et** la régénération post-migration. |
| `rulesPaths` | Modules de règles personnalisant l'émission des colonnes ; deep-mergés, les derniers chemins gagnent. |
| `compact` | Émet un fichier plus dense (pas de ligne vide entre `$columns` et les déclarations). |
| `schemas` | Postgres uniquement — restreint la génération à ces schémas. |

La sortie par colonne est personnalisable via les modules de règles nommés par
`rulesPaths`. Chaque module exporte par défaut un objet de règles ; atlas les
deep-merge (les derniers chemins gagnent). La résolution va du plus spécifique au
moins spécifique : `tables[table].columns[col]` > `columns[col]` >
`types[rawType]`. Chaque règle peut forcer le `tsType`, le `decorator`, et les
`imports` dont le fichier généré a besoin.

```ts
// database/schema-rules.ts
const rules = {
  columns: {
    status: {
      tsType: 'UserStatus',
      decorator: '@Column()',
      imports: [{ source: '#types/user', namedImports: ['UserStatus'] }],
    },
  },
}
export default rules
```

## Vérification de schéma

`checkSchema` réconcilie les métadonnées `@Column` de chaque modèle avec le
schéma de base **vivant** (via `introspectTable`) et rapporte le drift avant
qu'il ne morde à l'exécution — ce qu'un ORM pur-JS ne peut structurellement pas
faire. La vérification est agnostique au dialecte ; seul `introspectTable` est
spécifique au dialecte (SQLite `pragma_table_info`, Postgres/MySQL
`information_schema`).

### Types de drift

| `kind` | Signification |
| --- | --- |
| `missing-table` | La table du modèle n'existe pas — exécutez vos migrations. |
| `missing-in-db` | Une propriété du modèle mappe vers une colonne DB inexistante (typo → `did you mean`). |
| `type-mismatch` | Un `@Column({ type })` déclaré entre en conflit avec le type de la colonne DB. |
| `missing-in-model` | Une colonne DB `NOT NULL` sans défaut qu'aucune propriété du modèle ne mappe — les insertions échoueront. |

`type-mismatch` est délibérément conservateur : seul un conflit clair
numérique↔texte est signalé ; les types dépendants du stockage (date/heure,
binaire, blob) ne le sont jamais, pour que la vérification n'ait aucun faux
positif.

### Lancer une vérification

```ts
import { checkSchema, formatSchemaFindings } from '@c9up/atlas'
import { User } from '#models/user'

const findings = await checkSchema([User], db, 'postgres')
console.log(formatSchemaFindings(findings))
```

Champs de `SchemaFinding` : `entity`, `table`, `kind`, `column`, `detail`, et un
`suggestion` optionnel (un nom de colonne DB proche pour le diagnostic de typo).
Un tableau vide signifie que les modèles et le schéma concordent.
`formatSchemaFindings` rend un diff didactique de style Adonis groupé par table :

```
[atlas:check] 2 schema issue(s) found:

  users (User)
    ✗ eamil: model property `email` maps to column `eamil`, which does not exist — did you mean `email`?
    ✗ created_at: column `created_at` is NOT NULL with no default but no model property maps to it — inserts will fail
```

`runSchemaCheck(entities, db, dialect)` est le corps CLI : il lance la
vérification, imprime le rapport, et renvoie le code de sortie du processus
(`0` = concordance, `1` = drift). Il alimente la commande `atlas:check`, dont le
flag `--warn` rétrograde le drift en avertissement (sortie `0`) pour une étape CI
non bloquante.

### Garde au boot

`verifySchema` est la garde au démarrage : elle lance `checkSchema` et soit lève
(fail-fast), soit avertit, puis renvoie les findings. `mode` vaut `"throw"` par
défaut — un décalage de schéma est une mauvaise configuration qui devrait stopper
le boot avant que les requêtes ne servent des hypothèses périmées.

```ts
import { verifySchema } from '@c9up/atlas'

// fail-fast au boot (défaut)
await verifySchema([User, Post], db, 'postgres')

// non bloquant — logue le drift et continue
await verifySchema([User, Post], db, 'postgres', { mode: 'warn' })
```
