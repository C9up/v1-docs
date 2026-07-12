# Eon — Time-Series

Eon is Ream's time-series data layer, backed by [TDengine](https://tdengine.com). Statement descriptions compile to parameterised TDengine SQL through a Rust `eon-query` compiler exposed over NAPI, and the transport is ws-first (over `@tdengine/websocket`).

## The compile boundary

TypeScript never assembles SQL strings itself. It builds a JSON statement description and hands it to the Rust compiler, which returns `{ statements, params }` with:

- **backtick-quoted identifiers** (`` `meters` ``) validated against an injection seam — any table/column/tag name with a backtick, NUL, or a character outside `[A-Za-z0-9_]` is rejected with `E_UNSAFE_IDENTIFIER`, never interpolated;
- **`?` STMT-style placeholders** for every value and tag — no caller value is ever put into the SQL string.

```typescript
import { compileStatementNative } from '@c9up/eon'

// Plain insert
compileStatementNative({
  kind: 'insert',
  table: 'd1001',
  columns: ['ts', 'current'],
  rows: [[1700000000000, 10.3]],
})
// → { statements: ['INSERT INTO `d1001` (`ts`, `current`) VALUES (?, ?)'],
//     params: [1700000000000, 10.3] }

// Child-table auto-create (TDengine `USING <stable> TAGS (...)`) — tag params bind first
compileStatementNative({
  kind: 'insert',
  table: 'd1001',
  using: 'meters',
  tags: ['California.SanFrancisco'],
  columns: ['ts', 'current'],
  rows: [[1700000000000, 10.3]],
})
// → { statements: ['INSERT INTO `d1001` USING `meters` TAGS (?) VALUES (?, ?)'],
//     params: ['California.SanFrancisco', 1700000000000, 10.3] }

// Basic SELECT (FROM / WHERE / LIMIT)
compileStatementNative({
  kind: 'select',
  table: 'meters',
  select: ['ts', 'current'],
  wheres: [{ column: 'groupid', operator: '=', value: 2 }],
  limit: 10,
})
// → { statements: ['SELECT `ts`, `current` FROM `meters` WHERE `groupid` = ? LIMIT 10'],
//     params: [2] }
```

Time-window clauses (`INTERVAL` / `SLIDING` / `FILL` / `PARTITION BY`), selector functions, and the `_wstart` / `_wend` / `_wduration` pseudo-columns compile too — you rarely build these specs by hand; see [Time-series queries](#time-series-queries) for the fluent builder that produces them.

## Provider

`EonProvider` is an agnostic leaf: it consumes the host container structurally and never imports `@c9up/ream`. On boot it opens the configured connection(s) and registers them under `eon` (the default), `eon.connection` (alias), and `eon:<name>` (per named connection), plus the module-level `@c9up/eon/services/connection` singleton. The transport-independent compiler is registered under `eon.compiler`. `shutdown()` closes every connection (fail-open — one stuck close never blocks the rest) and releases the singletons.

## Transport / connection

Eon is **ws-first**: it talks to TDengine over the official `@tdengine/websocket` connector — ws-only via taosAdapter, no `libtaos`, no native FFI. A future native `taos` transport is deferred behind the same seam, not descoped.

### Configuration

Config lives under the `timeseries` key (falling back to `eon`), authored with `defineConfig`:

```typescript
// config/timeseries.ts
import { defineConfig } from '@c9up/eon'

export default defineConfig({
  url: 'ws://localhost:6041',   // taosAdapter WebSocket port
  user: 'root',
  password: 'taosdata',
  database: 'demo',             // optional default database
  timeoutMs: 30_000,
  connectRetries: 5,            // retry the INITIAL connect (cold-server race)
  connectBackoffMs: 200,        // exponential, capped at 30s
})
```

Credentials go through the connector's setters, never embedded in the URL. There is no connection pool — eon holds a single long-lived connection (the connector has none); `connectRetries` covers the initial-connect race (docker/k8s cold start), not per-query reconnection.

### The `EonConnection` seam

Every transport satisfies one small interface — the ws implementation today, a native `taos` implementation later. The columnar bulk-ingest STMT method and the schemaless helper live on this same connection (only the transport owns the live STMT handle, so ingest never touches a ws-specific type):

```typescript
interface EonConnection {
  readonly transport: 'websocket'                                // future: 'native'
  exec(sql: string): Promise<{ rowsAffected: number }>           // literal DDL/DML
  query<T = Record<string, unknown>>(sql: string): Promise<T[]>  // literal SELECT
  ping(): Promise<void>
  ingestColumnar(request: EonColumnarIngest): Promise<{ rowsAffected: number }>
  schemaless(lines: readonly string[], options?: EonSchemalessOptions): Promise<void>
  close(): Promise<void>
}
```

`exec` / `query` take **literal SQL only**. TDengine binds positional `?` placeholders exclusively through the STMT path (the bulk-ingest work), so the compiler's `params` array is not threaded through `exec` — a param-free compiled statement runs as literal SQL.

### Timestamps are `BigInt`

`query()` maps each row to an object keyed by column name and keeps values connector-native. A `TIMESTAMP` (and any `BIGINT`) comes back as a **`BigInt`** epoch value — epoch-milliseconds at `PRECISION 'ms'` — never a `Date`. The coercion is left to the consuming layer, so nothing is silently narrowed to a lossy double.

### Why ws-first, native deferred

The 58-0 spike measured native STMT ingest at ~2× the ws path on loopback, clearing the go-bar — yet ws-first stands. Production runs the app and TDengine as separate containers on a single CapRover host, so the link is loopback (native's edge doesn't amplify without a cross-machine hop), and ws maximises maintainability (pure JS, no `libtaos`, no Rust in CI, no glibc/musl lock) while already reaching ~2.8M rows/s. A native `taos` transport drops in behind the `EonConnection` seam unchanged if ingest ever becomes a proven bottleneck or TDengine moves off-host.

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
childTableName(Meters, [1, 'north']) // → 't_<fnv1a-hex>'

await dropSuperTable(conn, Meters)   // → DROP STABLE IF EXISTS `meters`
```

Child tables also auto-create on first insert (`INSERT INTO d1 USING meters TAGS (2) VALUES (...)`, the compile-boundary form above) — `createChildTable` is the *explicit* form.

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

## Ingestion

`SuperTableRepository` is the Atlas-shaped write API, mirroring `BaseRepository` naming: `ingest` (≙ `create`) and `ingestMany` (≙ `createMany`, the bulk primitive). It resolves the super-table, timestamp, columns and tags from the decorator metadata (never `key in instance`) and injects the connection structurally.

```typescript
import { SuperTableRepository } from '@c9up/eon'

const repo = new SuperTableRepository(Meters, conn)

await repo.ingest({ ts: 1700000000000n, current: 10.3, voltage: 219, groupid: 1, location: 'north' })
await repo.ingestMany([/* … many points … */])   // → { rowsAffected }
```

TDengine writes are **append / last-write-wins** by the caller-supplied timestamp. There is deliberately no `save` / `upsert` / `firstOrCreate`, no `useTransaction` / BEGIN-COMMIT, no `RETURNING`, and no DB-generated-PK hydrate-back — TDengine has no analogue.

### STMT columnar — the default bulk path

`ingestMany` is the high-throughput, injection-safe path. It groups points by their deterministic child table (same tags → same child), accumulates **struct-of-arrays** typed columns per child (one whole-column array per column, never an array of row objects), chunks each child at `batchSize` (default **4096**, override via `new SuperTableRepository(E, conn, { batchSize })`), and binds **once per batch** through the connector's STMT2 API. Child tables **auto-create on first insert** (`INSERT INTO ? USING <stable> (…) TAGS (?) VALUES (?)`, table filled by `setTableName`). Timestamps are carried as `bigint`; an unsafe-integer `number` is rejected (`E_EON_PARAM_PRECISION`) rather than bound with lost precision. The prepare template is produced by the Rust compiler — the injection seam stays in Rust, never a hand-built string.

### Schemaless — line protocol

`ingestSchemaless` renders points to **InfluxDB line protocol** and inserts them through the connector's schemaless endpoint (OpenTSDB telnet/JSON via the `protocol` option; precision defaults to milliseconds). This is **~8–10× slower** than STMT and must not be the default bulk path.

```typescript
await repo.ingestSchemaless(points, { protocol: 'influxdb', precision: 'milliseconds', ttl: 0 })
```

### Literal SQL INSERT

`ingestSql` runs one literal `INSERT … USING … TAGS … VALUES` per child table through `exec` — a convenience/fallback. Every value literal is rendered by the Rust compiler's literal mode (reusing the single `render_literal` escaping seam); eon never string-interpolates a value in TypeScript.

```typescript
await repo.ingestSql(points)   // → { rowsAffected }
```

## Time-series queries

`SuperTableRepository.query()` returns a fluent `TimeSeriesQuery` — a Lucid-shaped builder for windowed reads, mirroring the Atlas `ModelQuery` subset. It compiles through the same Rust `eon-query` core and runs over the injected connection.

```typescript
const rows = await repo.query()
  .select([
    { pseudo: '_wstart' },
    { function: 'avg', column: 'voltage', alias: 'avgV' },
    { function: 'last_row', column: 'current' },
  ])
  .where('groupid', 2)
  .whereBetween('ts', [start, end])
  .partitionBy('groupid')
  .interval('1m')          // window
  .sliding('30s')          // optional overlap
  .fill('prev')            // NONE | NULL | PREV | NEXT | LINEAR | VALUE
  .orderBy('_wstart', 'asc')
  .limit(100)
```

- **Filters** — `where(col, value)` / `where(col, op, value)`, `andWhere` / `orWhere`, `whereNull` / `whereNotNull`, `whereBetween(col, [lo, hi])` (the idiomatic time-range helper). `where(col, null)` folds to `IS NULL` (Knex/Lucid parity).
- **Projection** — bare columns (`'ts'`), aggregate/selector functions (`{ function, column, alias? }` — `avg` / `last` / `last_row` / `first` / `count` / `min` / `max` / `sum` / `spread` / `twa`), and window pseudo-columns (`{ pseudo: '_wstart' }`). Every name is allowlisted and quoted in Rust — no raw passthrough.
- **Window** — `interval(val, offset?)`, `sliding(val)`, `fill(mode, ...values)`, `partitionBy(...cols)`. TDengine's canonical clause order (`WHERE` → `PARTITION BY` → `INTERVAL(SLIDING)(FILL)` → `ORDER BY` → `LIMIT/OFFSET`) is emitted verbatim; `sliding` / `fill` without `interval`, or `offset` without `limit`, are typed errors.
- **Terminals** — `exec()` / `all()` (all rows, memoised), `first()` (row-or-null), `toSQL()` (`{ sql, params }`); the builder is **thenable**, so `await query` runs `exec()`.

### Literal-render reads (the crux)

`EonConnection.query(sql)` takes literal SQL only — TDengine binds `?` placeholders exclusively through the STMT (write) path. So a builder SELECT compiles **param-free**: `WHERE` values, `IN (…)` lists and `FILL(VALUE, …)` constants are rendered as safe SQL literals **in Rust** (`render_literal` — strings single-quote-escaped, NUL and out-of-`i64` bigints rejected), never interpolated in TypeScript. `CompiledStatement.params` comes back empty for a builder query.

### Typed rows

Rows hydrate to `Record<string, unknown>` with `TIMESTAMP` / `BIGINT` columns revived as `bigint` (resolved from column metadata, never `key in instance`) and window aliases (`_wstart`, `avgV`) attached raw. Pass a mapper to project into a typed shape — it runs on top of the reviving hydrator, so no `as` cast is needed:

```typescript
const series = await repo
  .query((row) => ({ start: row._wstart, avg: Number(row.avgV) }))
  .select([{ pseudo: '_wstart' }, { function: 'avg', column: 'voltage', alias: 'avgV' }])
  .interval('1m')
```

## Pinned versions

- TDengine server: `3.3.6.13`
- `@tdengine/websocket`: `3.5.0`
