# Atlas - Schema Dump & Verification

Atlas can serialise a live database's structure to a portable dump, generate
model classes from an existing database, and reconcile your models against the
real schema. All three read the **actual** database via catalog introspection —
Atlas never shells out to `pg_dump`/`mysqldump` (it introspects the connection,
like AdonisJS Lucid).

## Console commands

Atlas commands are plain `{ name, description, run }` objects. Register them in
`reamrc.commands` and dispatch them through the console kernel (Atlas has no
global entity registry — you list your models, as in Lucid).

| Command | What it does |
| --- | --- |
| `schema:dump` | Serialise the schema to a `.sql` dump + `.meta.json` manifest. Flags: `--prune`, `--connection`, `--path`. |
| `schema:generate` | Introspect the database and (re)write `BaseModel` schema classes. Flags: `--connection`, `--compact-output`. |
| `atlas:check` | Reconcile models against the live schema; report drift. Flag: `--warn`. |

```ts
// commands/schema-dump.ts
import { schemaDumpCommand } from '@c9up/atlas'
export default schemaDumpCommand({ migrationsDir: 'database/migrations' })

// commands/schema-generate.ts
import { schemaGenerateCommand } from '@c9up/atlas'
export default schemaGenerateCommand({ outputPath: 'database/schema.ts' })

// commands/atlas-check.ts
import { schemaCheckCommand } from '@c9up/atlas'
import { User } from '#models/user'
export default schemaCheckCommand([User])

// reamrc.ts → commands: [
//   () => import('./commands/schema-dump.js'),
//   () => import('./commands/schema-generate.js'),
//   () => import('./commands/atlas-check.js'),
// ]
```

## `schema:dump` — serialise the schema

`SchemaDumper` writes two files: a `.sql` dump of every table's DDL plus the
migration bookkeeping rows, and a `.meta.json` manifest describing it. A fresh
database can then be rebuilt from the dump (`migration:run --schema-path`)
instead of replaying the whole migration history — the runner loads the dump,
then applies only the migrations that postdate it.

The DDL is reconstructed **per dialect**:

- **SQLite** — read verbatim from `sqlite_master` (the exact `CREATE` statements).
- **MySQL** — `SHOW CREATE TABLE` (exact DDL, indexes and constraints included).
- **Postgres** — reconstructed from catalog introspection: `CREATE TABLE`
  (columns + primary key) + foreign keys + `CHECK` constraints + indexes, then
  the schema's views and materialized views. **No `pg_dump`.**

### Running it programmatically

```ts
import { SchemaDumper } from '@c9up/atlas'

const dumper = new SchemaDumper(db, { migrationsDir: 'database/migrations' })
await dumper.run()
if (dumper.error) throw dumper.error

console.log(dumper.result?.dumpPath)   // database/schema/default-schema.sql
console.log(dumper.result?.metaPath)   // database/schema/default-schema.meta.json
console.log(dumper.result?.tableCount) // number of CREATE TABLE statements
```

Errors are captured on `.error` (Lucid parity) rather than thrown, so a CLI can
report cleanly; `.result` holds the output paths on success.

`SchemaDumperOptions`:

| Option | Default | Meaning |
| --- | --- | --- |
| `connectionName` | `"default"` | Logical connection name, used in the default file names. |
| `dumpPath` | — | Explicit SQL dump **file** path (Lucid `--path`); wins over `outputDir`/`connectionName`. |
| `outputDir` | `"database/schema"` | Directory for the default `{connection}-schema.sql`. |
| `migrationsDir` | `""` | Migration directory; required for `--prune`. |
| `schemaTableName` | `"ream_migrations"` | Migration bookkeeping table name. |
| `prune` | `false` | After a successful dump, delete every migration file and record their names in the manifest. |
| `generatedAt` | now | Manifest timestamp; pass one for deterministic tests. |

### The manifest

`readSchemaDumpManifest(dumpPath)` reads and validates the sidecar, returning
`undefined` when it is absent and **throwing** on a present-but-malformed one, so
a corrupt dump is caught rather than silently mis-loaded.
`schemaDumpManifestPath(dumpPath)` derives the `.meta.json` path from the `.sql`
path.

```ts
import { readSchemaDumpManifest } from '@c9up/atlas'

const manifest = await readSchemaDumpManifest('database/schema/default-schema.sql')
// { version: 1, connection, dialect, dumpPath, generatedAt,
//   schemaTableName, schemaVersionsTableName, squashedMigrationNames }
```

> `--prune` squashes the migration history into the dump: it deletes every file
> in `migrationsDir` and records their names in `squashedMigrationNames`, so the
> runner can tell a deliberately-squashed migration from a missing file.

## `schema:generate` — database-first codegen

Introspect the live database and write a `schema.ts` with one `BaseModel`
subclass per table (Lucid `schema:generate` parity). Manual edits to the output
are lost on regeneration.

```ts
import { generateSchemaFile } from '@c9up/atlas'

const count = await generateSchemaFile(db, { outputPath: 'database/schema.ts' })
```

`renderSchemaFile(tables, rules?, compact?)` is the pure renderer behind it
(no DB access) if you already hold introspected columns.

`SchemaGenerateOptions`:

| Option | Meaning |
| --- | --- |
| `outputPath` | File the generated classes are written to (required). |
| `excludeTables` | Extra tables to skip (framework tables are always skipped). |
| `enabled` | `false` disables the command **and** post-migration regeneration. |
| `rulesPaths` | Rule modules that customise how columns are emitted; deep-merged, later paths win. |
| `compact` | Emit a denser file (no blank line between `$columns` and declarations). |
| `schemas` | Postgres only — restrict generation to these schemas. |

Per-column output is customisable through the rule modules named by
`rulesPaths`. Each module default-exports a rules object; atlas deep-merges
them (later paths win). Resolution is most-specific-first:
`tables[table].columns[col]` > `columns[col]` > `types[rawType]`. Each rule can
force the `tsType`, the `decorator`, and the `imports` the generated file needs.

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

## Schema verification

`checkSchema` reconciles each model's `@Column` metadata against the **live**
database schema (via `introspectTable`) and reports drift before it bites at
runtime — something pure-JS ORMs structurally cannot do. It is dialect-agnostic;
only `introspectTable` is dialect-aware (SQLite `pragma_table_info`,
Postgres/MySQL `information_schema`).

### Drift kinds

| `kind` | Meaning |
| --- | --- |
| `missing-table` | The model's table does not exist — run your migrations. |
| `missing-in-db` | A model property maps to a non-existent DB column (typo → `did you mean`). |
| `type-mismatch` | A declared `@Column({ type })` clashes with the DB column's type. |
| `missing-in-model` | A `NOT NULL` DB column with no default that no model property maps to — inserts will fail. |

`type-mismatch` is deliberately conservative: only a clear numeric↔text clash is
flagged; storage-dependent types (date/time, binary, blob) are never flagged, so
the check has no false positives.

### Running a check

```ts
import { checkSchema, formatSchemaFindings } from '@c9up/atlas'
import { User } from '#models/user'

const findings = await checkSchema([User], db, 'postgres')
console.log(formatSchemaFindings(findings))
```

`SchemaFinding` fields: `entity`, `table`, `kind`, `column`, `detail`, and an
optional `suggestion` (a close DB column name for typo diagnostics). An empty
array means the models and schema agree. `formatSchemaFindings` renders a
didactic, Adonis-style diff grouped per table:

```
[atlas:check] 2 schema issue(s) found:

  users (User)
    ✗ eamil: model property `email` maps to column `eamil`, which does not exist — did you mean `email`?
    ✗ created_at: column `created_at` is NOT NULL with no default but no model property maps to it — inserts will fail
```

`runSchemaCheck(entities, db, dialect)` is the CLI body: it runs the check,
prints the report, and returns the process exit code (`0` = match, `1` = drift).
It backs the `atlas:check` command, whose `--warn` flag downgrades drift to
advisory (exit `0`) for a non-blocking CI step.

### Boot guard

`verifySchema` is the boot-time guard: it runs `checkSchema` and either throws
(fail-fast) or warns, then returns the findings. `mode` defaults to `"throw"` —
a schema mismatch is a misconfiguration that should stop the boot before
requests serve stale assumptions.

```ts
import { verifySchema } from '@c9up/atlas'

// fail-fast on boot (default)
await verifySchema([User, Post], db, 'postgres')

// non-blocking — log the drift and continue
await verifySchema([User, Post], db, 'postgres', { mode: 'warn' })
```
