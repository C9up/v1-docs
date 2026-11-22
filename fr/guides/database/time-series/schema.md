# Schéma et migrations

Ce guide couvre le schéma des séries temporelles et ses migrations :

- Schéma — décorateurs & DDL
- Migrations & gestion du schéma

## Schéma — décorateurs & DDL

On modélise une super-table comme on modélise une `@Entity` Atlas — de façon déclarative. Les décorateurs enregistrent les métadonnées ; une façade fine compile ces métadonnées en vraie DDL TDengine (via le même compilateur Rust `eon-query`) et l'exécute sur une `EonConnection`.

```typescript
import { SuperTable, Timestamp, Column, Tag } from '@c9up/eon'

@SuperTable('meters')
class Meters {
  @Timestamp() declare ts: bigint
  @Column({ type: 'float' }) declare current: number
  @Column({ type: 'int' }) declare voltage: number
  @Tag({ type: 'int' }) declare groupid: number
  @Tag({ type: 'nchar', length: 24 }) declare location: string
}
```

TDengine a **trois** sortes de colonnes, donc eon ajoute un décorateur dont Atlas n'a pas besoin :

- `@SuperTable(name)` — marque la classe (miroir de `@Entity`).
- `@Timestamp(options?)` — la **première colonne `TIMESTAMP`** obligatoire, clé primaire. Exactement une par super-table (l'analogue eon de `@PrimaryKey`).
- `@Column(options?)` — une colonne métrique.
- `@Tag(options?)` — un tag, stocké dans un registre **séparé** (les tags TDengine n'ont pas d'analogue Atlas).

`type` est une chaîne **logique** (`float`, `int`, `bigint`, `smallint`, `tinyint`, `double`, `bool`, `string`/`varchar`, `nchar`, `varbinary`, `json`, `decimal`, `timestamp`) ; le compilateur la mappe vers le type physique TDengine. On relit le schéma via les getters — jamais `key in instance`, car les champs `@Column() declare x` sont effacés à l'exécution :

```typescript
getSuperTableMetadata(Meters) // → { name: 'meters' }
getTimestampColumn(Meters)    // → 'ts'
getColumnMetadata(Meters)     // → [{ propertyKey: 'ts', ... }, { propertyKey: 'current', ... }, ...]
getTagMetadata(Meters)        // → [{ propertyKey: 'groupid', ... }, ...]
```

### Table de types (logique → physique TDengine)

`timestamp`→`TIMESTAMP`, `int`/`integer`→`INT`, `bigint`→`BIGINT`, `smallint`→`SMALLINT`, `tinyint`→`TINYINT`, `float`→`FLOAT`, `double`→`DOUBLE`, `bool`/`boolean`→`BOOL`, `string`/`varchar`→`VARCHAR(n)`, `nchar`→`NCHAR(n)`, `binary`/`varbinary`→`VARBINARY(n)`, `json`→`JSON`, `decimal`→`DECIMAL(p[, s])`.

### Exécuter la DDL

```typescript
import { syncSuperTable, createChildTable, dropSuperTable, childTableName } from '@c9up/eon'

await syncSuperTable(conn, Meters)
// → CREATE STABLE IF NOT EXISTS `meters`
//     (`ts` TIMESTAMP, `current` FLOAT, `voltage` INT)
//     TAGS (`groupid` INT, `location` NCHAR(24))

// Table enfant explicite pour un jeu de tags (valeurs inlinées en littéraux SQL typés)
await createChildTable(conn, { EntityClass: Meters, name: 'd0', tags: [1, 'north'] })
// → CREATE TABLE IF NOT EXISTS `d0` USING `meters` TAGS (1, 'north')

// Un nom d'enfant déterministe pour un jeu de tags (création idempotente + routage stable)
childTableName(Meters, [1, 'north']) // → 't_031da91ff5add6466e2222f61b95a541'

await dropSuperTable(conn, Meters)   // → DROP STABLE IF EXISTS `meters`
```

Les tables enfants s'auto-créent aussi au premier insert (`INSERT INTO d1 USING meters TAGS (2) VALUES (...)`, la forme de la frontière de compilation ci-dessus) — `createChildTable` est la forme *explicite*.

#### Noms des tables enfants

Chaque chemin d'ingestion (STMT, SQL littéral, la factory de test) écrit un point dans l'enfant que `childTableName` nomme pour ses valeurs de tags. Ce nom est l'identité d'une série, et une valeur de tag vient souvent de l'extérieur (l'identifiant d'un appareil, un capteur nommé par un utilisateur) : il doit donc être impossible à forger. C'est `t_` suivi des 128 premiers bits d'un SHA-256 sur un encodage versionné, préfixé par les longueurs, du nom de la stable et de chaque valeur de tag. Trouver une autre valeur de tag qui tombe sur un enfant existant est hors de portée.

Jusqu'à eon 0.2.15 le nom était un FNV-1a 64 bits, qui ne résiste pas aux collisions : une valeur de tag choisie pour atteindre un enfant existant se calculait en une trentaine de secondes, et la forme `USING … TAGS` de TDengine écrit dans un enfant existant en ignorant les TAGS donnés, si bien que ces lignes étaient rangées sous les tags de l'autre série. Le changement donne un nouveau nom à chaque jeu de tags. Une base écrite par une version antérieure garde ses anciens enfants, et la prochaine ingestion ouvre un second enfant pour les mêmes tags. Déplace-les une fois, avant d'ingérer à nouveau :

```typescript
import { migrateChildTableNames } from '@c9up/eon'

const report = await migrateChildTableNames(conn, Meters, { dryRun: true })
// { renamed: [{ from: 't_…', to: 't_…', tags: [1, 'north'] }], current: [...], unmatched: [...] }
await migrateChildTableNames(conn, Meters)
```

Pour chaque enfant dont le nom est l'ancien nom de ses propres tags, il crée le nouvel enfant avec les mêmes tags, copie les lignes (`INSERT … SELECT`) et supprime l'ancien ; TDengine ne sait pas renommer une table enfant. Le relancer après une interruption est sans risque : une ligne copiée deux fois garde son horodatage, que TDengine écrase. Un enfant créé avec un `name` explicite, ou dont les tags se relisent dans un autre type JavaScript que celui ingéré (un `number` pour un tag BIGINT ingéré en `bigint`), figure dans `unmatched` et reste en place. `legacyChildTableName()` donne l'ancien nom d'un jeu de tags si tu déplaces les données toi-même.

`ALTER STABLE` compile une instruction par changement (`addColumn` / `dropColumn` / `modifyColumn` / `addTag` / `dropTag` / `modifyTag` / `renameTag`) :

```typescript
compileStatementNative({
  kind: 'alterStable',
  name: 'meters',
  changes: [{ op: 'addColumn', name: 'power', type: { kind: 'int' } }],
})
// → { statements: ['ALTER STABLE `meters` ADD COLUMN `power` INT'], params: [] }
```

### Règles de schéma (imposées dans le compilateur — erreurs typées, jamais de SQL erroné)

Le compilateur rejette, avec une erreur typée `E_*`, toute super-table qui viole une règle TDengine :

- la première colonne doit être `TIMESTAMP`, et exactement une colonne timestamp — `E_TS_REQUIRED` / `E_TS_DUPLICATE` ;
- au moins un tag — `E_TAGS_REQUIRED` ;
- `VARCHAR` / `NCHAR` / `VARBINARY` exigent une longueur `(n)`, `DECIMAL` une précision — `E_LENGTH_REQUIRED` ;
- `JSON` est **réservé aux tags** et doit être le **seul** tag — `E_JSON_TAG_RULE` ;
- `DECIMAL` ne peut pas être un tag — `E_TYPE_NOT_TAGGABLE` ;
- un nom utilisé à la fois comme colonne et comme tag — `E_NAME_COLLISION`.

`ALTER` ne fait qu'élargir : TDengine ne peut pas réduire une longueur de chaîne, changer un type de base (`INT`→`BIGINT`), ni modifier la clé primaire `TIMESTAMP`.

## Migrations & gestion du schéma

Faites évoluer un schéma de séries temporelles avec la même rigueur suivie que les
migrations atlas. Étendez `Migration`, pilotez le `EonSchema` fluide, puis
exécutez les fichiers via un `EonMigrationRunner`.

```typescript
// database/eon-migrations/0001_create_metrics.ts
import { Migration } from '@c9up/eon'

export default class extends Migration {
  up() {
    // Rétention base de données (KEEP / DURATION / PRECISION). KEEP >= 3 × DURATION.
    this.schema.createDatabase('metrics', {
      keep: '90d',
      duration: '10d',
      precision: 'ms',
    })
    this.schema.createStable('meters', (t) => {
      t.timestamp('ts')
      t.float('current')
      t.int('voltage')
      t.int('groupid').tag()          // `.tag()` reclasse la colonne en TAG
      t.nchar('location', 24).tag()
    }, { keep: '365d' })              // KEEP de STABLE optionnel (3.3.x+)
  }

  down() {
    this.schema.dropStable('meters')
  }
}
```

Le `StableBuilder` est volontairement **plus mince** que le `TableBuilder` d'atlas :
les colonnes TDengine n'ont pas de `DEFAULT`, pas de choix de `PRIMARY KEY` par
colonne (le premier `TIMESTAMP` est toujours la clé), pas de `UNIQUE`, pas de clés
étrangères, pas d'index secondaires SQL — donc `defaultTo` / `primary` / `unique` /
`references` / `increments` **n'ont pas d'équivalent et sont absents**. Méthodes de
colonne : `timestamp` / `int` / `bigInteger` / `float` / `double` / `bool` /
`varchar(n)` / `nchar(n)` / `binary(n)` / `decimal(p, s?)` / `json`, plus `.tag()`.
`alterStable` expose `addColumn(name).<type>()` / `modifyColumn` / `dropColumn` /
`addTag` / `modifyTag` / `dropTag` / `renameTag` ; `createDatabase` / `alterDatabase`
(une option par instruction) / `createTable` (basique, sans tags) / `dropTable` /
`raw(sql)`.

Chaque instruction est compilée en **Rust** (`compileStatementNative`) — les
identifiants via `quote_ident`, les valeurs d'options validées (durées, listes
blanches `PRECISION` / `CACHEMODEL` / `WAL_LEVEL`, `KEEP >= 3 × DURATION`). Le côté
TypeScript ne construit jamais de SQL par concaténation.

### Le runner

```typescript
import { EonMigrationRunner } from '@c9up/eon'

const runner = new EonMigrationRunner(conn, {
  migrationsDir: 'database/eon-migrations', // défaut
  tableName: 'ream_eon_migrations',         // défaut (ream_ = table système protégée)
})

await runner.migrate()   // exécute les migrations en attente (ordre des noms), enregistre chacune
await runner.status()    // [{ name, state: 'applied' | 'pending', batch? }]
await runner.rollback()  // annule le dernier lot (fichiers en ordre inverse), exécute down()
await runner.reset()     // annule tout
await runner.refresh()   // reset + migrate (alias : fresh)
await runner.dryRun()    // [{ name, sql[] }] — calcule le SQL, n'exécute rien
await runner.forceUnlock() // libère un verrou laissé par un process tué -> boolean
```

Comme atlas, chaque commande mutante s'exécute **sous un verrou de migration** :
deux processus qui démarrent en même temps ne peuvent pas migrer simultanément.
`refresh` tient un seul verrou sur tout le rollback + re-migration, pour qu'aucune
autre exécution ne s'engouffre dans l'intervalle. Ne passez `disableLocks: true`
que là où des exécutions concurrentes sont impossibles par construction.

**Trois déviations TDengine nommées par rapport à atlas :**

1. **Pas de transactions / pas de rollback moteur.** La DDL TDengine n'est pas
   transactionnelle, un lot ne peut donc pas être appliqué atomiquement. Le runner
   exécute les instructions **séquentiellement** ; un échec en cours de migration
   laisse les instructions précédentes appliquées. La mitigation est une DDL
   idempotente — `createStable` / `createDatabase` / `createTable` sont en
   `IF NOT EXISTS` par défaut, les drops en `IF EXISTS` — pour qu'une ré-exécution
   converge. `down()` est au mieux : certaines opérations (une extension de
   longueur `MODIFY`, les données d'une colonne supprimée) sont irréversibles.
2. **Pas de `UNIQUE`, pas d'auto-incrément.** La table de suivi est une table
   basique `ream_eon_migrations(executed_at TIMESTAMP, name VARCHAR(255), batch INT)` ;
   l'ensemble appliqué est dédupliqué **par nom en JS**, et chaque enregistrement
   est écrit avec un `executed_at` strictement croissant afin que le rollback puisse
   le supprimer par cette clé temporelle unique (TDengine n'autorise un prédicat
   `DELETE` que sur la colonne timestamp primaire).
3. **Le verrou est l'existence d'une table, pas la valeur d'une ligne.** atlas
   sérialise les runners avec un `UPDATE … WHERE is_locked = 0`
   conditionnel. TDengine n'a pas d'`UPDATE` conditionnel : cette forme exacte est
   impossible — mais la garantie, elle, ne l'est pas. `CREATE TABLE` **sans**
   `IF NOT EXISTS` est un compare-and-swap atomique : le mnode sérialise les
   métadonnées, donc sur N créateurs concurrents exactement un réussit et les
   autres reçoivent l'erreur `1539`. Créer `ream_eon_migrations_lock`, **c'est**
   prendre le verrou ; le supprimer le relâche, et `forceUnlock()` nettoie un
   verrou bloqué via le `DROP` symétrique sans `IF EXISTS` (`9731` = rien n'était
   tenu). Vérifié contre un TDengine 3.3.5.0 réel : huit runners concurrents,
   exactement un migre. L'API reste celle d'atlas (`disableLocks`, `forceUnlock`)
   — seul le primitif sous-jacent diffère.

> Hors périmètre : auto-diff de schéma / `db push` (le territoire `checkSchema`
> d'atlas) — il s'agit uniquement de migrations `up()`/`down()` versionnées.
