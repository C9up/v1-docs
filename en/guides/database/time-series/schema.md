# Schema and migrations

This guide covers the time-series schema and its migrations:

- Schema — decorators & DDL
- Migrations & schema management

## Schema — decorators & DDL

You model a super-table the way you model an Atlas `@Entity` — declaratively. Decorators register metadata; a thin facade compiles that metadata to real TDengine DDL (through the same Rust `eon-query` compiler) and runs it over an `EonConnection`.

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

TDengine has **three** column kinds, so eon adds one decorator Atlas doesn't need:

- `@SuperTable(name)` — marks the class (mirrors `@Entity`).
- `@Timestamp(options?)` — the mandatory **first `TIMESTAMP`** primary column. Exactly one per super-table (the eon analogue of `@PrimaryKey`).
- `@Column(options?)` — a metric column.
- `@Tag(options?)` — a tag, stored in a **separate** registry (TDengine tags have no Atlas analogue).

`type` is a **logical** string (`float`, `int`, `bigint`, `smallint`, `tinyint`, `double`, `bool`, `string`/`varchar`, `nchar`, `varbinary`, `json`, `decimal`, `timestamp`); the compiler maps it to the physical TDengine type. Read schema back through the getters — never `key in instance`, because `@Column() declare x` fields are erased at runtime:

```typescript
getSuperTableMetadata(Meters) // → { name: 'meters' }
getTimestampColumn(Meters)    // → 'ts'
getColumnMetadata(Meters)     // → [{ propertyKey: 'ts', ... }, { propertyKey: 'current', ... }, ...]
getTagMetadata(Meters)        // → [{ propertyKey: 'groupid', ... }, ...]
```

### Type map (logical → TDengine physical)

`timestamp`→`TIMESTAMP`, `int`/`integer`→`INT`, `bigint`→`BIGINT`, `smallint`→`SMALLINT`, `tinyint`→`TINYINT`, `float`→`FLOAT`, `double`→`DOUBLE`, `bool`/`boolean`→`BOOL`, `string`/`varchar`→`VARCHAR(n)`, `nchar`→`NCHAR(n)`, `binary`/`varbinary`→`VARBINARY(n)`, `json`→`JSON`, `decimal`→`DECIMAL(p[, s])`.

### Running DDL

```typescript
import { syncSuperTable, createChildTable, dropSuperTable, childTableName } from '@c9up/eon'

await syncSuperTable(conn, Meters)
// → CREATE STABLE IF NOT EXISTS `meters`
//     (`ts` TIMESTAMP, `current` FLOAT, `voltage` INT)
//     TAGS (`groupid` INT, `location` NCHAR(24))

// Explicit child table for a tag-set (tag values inlined as typed SQL literals)
await createChildTable(conn, { EntityClass: Meters, name: 'd0', tags: [1, 'north'] })
// → CREATE TABLE IF NOT EXISTS `d0` USING `meters` TAGS (1, 'north')

// A deterministic child name for a tag-set (idempotent create + stable routing)
childTableName(Meters, [1, 'north']) // → 't_031da91ff5add6466e2222f61b95a541'

await dropSuperTable(conn, Meters)   // → DROP STABLE IF EXISTS `meters`
```

Child tables also auto-create on first insert (`INSERT INTO d1 USING meters TAGS (2) VALUES (...)`, the compile-boundary form above) — `createChildTable` is the *explicit* form.

#### Child-table names

Every ingest path (STMT, literal SQL, the testing factory) writes a point into the child that `childTableName` names for its tag values. The name is the identity of a series, and a tag value often comes from outside (a device id, a sensor a user named), so it has to be impossible to forge: `t_` followed by the first 128 bits of a SHA-256 over a versioned, length-prefixed encoding of the stable name and each tag value. Finding another tag value that lands on an existing child is out of reach.

Up to eon 0.2.15 the name was a 64-bit FNV-1a, which is not collision resistant: a chosen tag value reaching an existing child could be computed in about thirty seconds, and TDengine's `USING … TAGS` form writes into an existing child and ignores the TAGS it is given, so those rows were stored under the other series' tags. The change gives every tag set a new name. A database written by an earlier version keeps its old children, and the next ingest opens a second child for the same tags. Move them once, before ingesting again:

```typescript
import { migrateChildTableNames } from '@c9up/eon'

const report = await migrateChildTableNames(conn, Meters, { dryRun: true })
// { renamed: [{ from: 't_…', to: 't_…', tags: [1, 'north'] }], current: [...], unmatched: [...] }
await migrateChildTableNames(conn, Meters)
```

For each child whose name is the former name of its own tags, it creates the new child with the same tags, copies the rows (`INSERT … SELECT`) and drops the old one; TDengine cannot rename a child table. Running it again after an interruption is safe: a row copied twice keeps its timestamp, which TDengine overwrites. A child created with an explicit `name`, or whose tags read back in another JavaScript type than the one ingested (a `number` for a BIGINT tag ingested as `bigint`), is listed in `unmatched` and left alone. `legacyChildTableName()` gives the former name of a tag set if you move data yourself.

`ALTER STABLE` compiles one statement per change (`addColumn` / `dropColumn` / `modifyColumn` / `addTag` / `dropTag` / `modifyTag` / `renameTag`):

```typescript
compileStatementNative({
  kind: 'alterStable',
  name: 'meters',
  changes: [{ op: 'addColumn', name: 'power', type: { kind: 'int' } }],
})
// → { statements: ['ALTER STABLE `meters` ADD COLUMN `power` INT'], params: [] }
```

### Schema rules (enforced in the compiler — typed errors, never wrong SQL)

The compiler rejects, with a typed `E_*` error, every super-table that violates a TDengine rule:

- first column must be `TIMESTAMP`, and exactly one timestamp column — `E_TS_REQUIRED` / `E_TS_DUPLICATE`;
- at least one tag — `E_TAGS_REQUIRED`;
- `VARCHAR` / `NCHAR` / `VARBINARY` need a length `(n)`, `DECIMAL` a precision — `E_LENGTH_REQUIRED`;
- `JSON` is **tag-only** and must be the **sole** tag — `E_JSON_TAG_RULE`;
- `DECIMAL` cannot be a tag — `E_TYPE_NOT_TAGGABLE`;
- a name used as both a column and a tag — `E_NAME_COLLISION`.

`ALTER` widens only: TDengine cannot shrink a string length, change a base type (`INT`→`BIGINT`), or alter the `TIMESTAMP` primary key.

## Migrations & schema management

Evolve a time-series schema the same disciplined, tracked way you run atlas
migrations. Extend `Migration`, drive the fluent `EonSchema`, and run the files
through an `EonMigrationRunner`.

```typescript
// database/eon-migrations/0001_create_metrics.ts
import { Migration } from '@c9up/eon'

export default class extends Migration {
  up() {
    // Database retention (KEEP / DURATION / PRECISION). KEEP >= 3 × DURATION.
    this.schema.createDatabase('metrics', {
      keep: '90d',
      duration: '10d',
      precision: 'ms',
    })
    this.schema.createStable('meters', (t) => {
      t.timestamp('ts')
      t.float('current')
      t.int('voltage')
      t.int('groupid').tag()          // `.tag()` re-homes the column as a TAG
      t.nchar('location', 24).tag()
    }, { keep: '365d' })              // optional STABLE KEEP (3.3.x+)
  }

  down() {
    this.schema.dropStable('meters')
  }
}
```

The `StableBuilder` is deliberately **thinner** than atlas's `TableBuilder`:
TDengine columns have no `DEFAULT`, no per-column `PRIMARY KEY` choice (the first
`TIMESTAMP` is always the key), no `UNIQUE`, no foreign keys, no SQL secondary
indexes — so `defaultTo` / `primary` / `unique` / `references` / `increments` have
**no analogue and are absent**. Column methods: `timestamp` / `int` /
`bigInteger` / `float` / `double` / `bool` / `varchar(n)` / `nchar(n)` /
`binary(n)` / `decimal(p, s?)` / `json`, plus `.tag()`. `alterStable` exposes
`addColumn(name).<type>()` / `modifyColumn` / `dropColumn` / `addTag` / `modifyTag`
/ `dropTag` / `renameTag`; `createDatabase` / `alterDatabase` (one option per
statement) / `createTable` (basic, no tags) / `dropTable` / `raw(sql)`.

Every statement is compiled in **Rust** (`compileStatementNative`) — identifiers
through `quote_ident`, option values validated (durations, `PRECISION` /
`CACHEMODEL` / `WAL_LEVEL` allowlists, `KEEP >= 3 × DURATION`). The TypeScript side
never string-builds SQL.

### The runner

```typescript
import { EonMigrationRunner } from '@c9up/eon'

const runner = new EonMigrationRunner(conn, {
  migrationsDir: 'database/eon-migrations', // default
  tableName: 'ream_eon_migrations',         // default (ream_ = protected system table)
})

await runner.migrate()   // run pending (filename order), record each
await runner.status()    // [{ name, state: 'applied' | 'pending', batch? }]
await runner.rollback()  // reverse the last batch (files in reverse), run down()
await runner.reset()     // roll back everything
await runner.refresh()   // reset + migrate (alias: fresh)
await runner.dryRun()    // [{ name, sql[] }] — compute SQL, execute nothing
await runner.forceUnlock() // clear a lock left by a killed process -> boolean
```

Like atlas, every mutating command runs **under a migration lock**, so two
processes booting at once cannot migrate concurrently. `refresh` holds a single
lock across the whole rollback + re-migrate, so no other run slips into the gap.
Pass `disableLocks: true` only where concurrent runs are impossible by
construction.

**Three named TDengine deviations from atlas:**

1. **No transactions / no engine rollback.** TDengine DDL is non-transactional, so
   a batch cannot be applied atomically. The runner executes statements
   **sequentially**; a mid-migration failure leaves earlier statements applied.
   The mitigation is idempotent DDL — `createStable` / `createDatabase` /
   `createTable` default to `IF NOT EXISTS`, drops to `IF EXISTS` — so a re-run
   converges. `down()` is best-effort: some operations (a `MODIFY` length
   extension, a dropped column's data) are irreversible.
2. **No `UNIQUE`, no auto-increment.** The tracking table is a basic table
   `ream_eon_migrations(executed_at TIMESTAMP, name VARCHAR(255), batch INT)`; the
   applied set is de-duped **by name in JS**, and each record is written with a
   strictly-increasing `executed_at` so rollback can delete it by that unique
   timestamp key (TDengine only allows a `DELETE` predicate on the primary
   timestamp column).
3. **The lock is a table's existence, not a row's value.** atlas serialises runners with a conditional `UPDATE … WHERE is_locked = 0`.
   TDengine has no conditional `UPDATE`, so that exact shape is impossible — but
   the guarantee is not. `CREATE TABLE` **without** `IF NOT EXISTS` is an atomic
   compare-and-swap: the mnode serialises metadata, so of N concurrent creators
   exactly one succeeds and the rest get error `1539`. Creating
   `ream_eon_migrations_lock` **is** taking the lock; dropping it releases it,
   and `forceUnlock()` clears a stale one via the symmetric `DROP` without
   `IF EXISTS` (`9731` = nothing was held). Verified against a live TDengine
   3.3.5.0: eight concurrent runners, exactly one migrates. The API is atlas's
   (`disableLocks`, `forceUnlock`) — only the primitive underneath differs.

> Out of scope: schema auto-diff / `db push` (atlas's `checkSchema` territory) —
> this is versioned `up()`/`down()` migrations only.
