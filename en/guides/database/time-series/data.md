# Writing and reading

This guide covers ingesting data and querying it back:

- Ingestion
- Reading values back
- Time-series queries

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

Each field carries its type suffix (`i8`/`i16`/`i32`/`i64`, `f32`/`f64`, `"…"` for VARCHAR, `L"…"` for NCHAR), so the points match the super-table the entity describes. The line protocol imposes a schema of its own: the timestamp column is `_ts`, every tag is NCHAR, and VARBINARY, JSON, DECIMAL and secondary TIMESTAMP columns have no line-protocol form. An entity outside these rules is refused up front with `E_EON_SCHEMALESS_SCHEMA`; write it with `ingestMany` or `ingestSql`.

```typescript
@SuperTable('readings')
class Reading {
  @Timestamp() declare _ts: bigint
  @Column({ type: 'double' }) declare value: number
  @Tag({ type: 'nchar', length: 32 }) declare site: string
}
```

### Literal SQL INSERT

`ingestSql` runs one literal `INSERT … USING … TAGS … VALUES` per child table through `exec` — a convenience/fallback. Every value literal is rendered by the Rust compiler's literal mode (reusing the single `render_literal` escaping seam); eon never string-interpolates a value in TypeScript.

```typescript
await repo.ingestSql(points)   // → { rowsAffected }
```

## Reading values back

### Null cells

A SQL `NULL` comes back as `null` for every column type, text and binary
included: eon reads the result's null bitmap, so an empty `VARCHAR` is `null`
and a cell holding the four characters `NULL` stays the string `"NULL"`.

```ts
const row = await repo.query().where('ts', t).first()   // repo: the prices super-table
row?.amount   // null, not "NULL"
```

### Numbers keep their digits

`FLOAT` reads back as the shortest decimal that is the same binary32 value
(`0.1`, not `0.10000000149011612`), `DOUBLE` as stored, and `DECIMAL` as an
exact string at the column's scale (`'61.9900000000'` for `DECIMAL(20,10)`).

### Ingesting a decimal

A `DECIMAL` column round-trips exactly through all three paths. `ingestMany()`
binds each value as an exact integer at the column's scale, read from the
server's schema; a value it cannot hold exactly — more fractional digits than
the scale, more digits than the precision, an exponent — is refused with
`E_EON_BIND` rather than rounded. Pass decimals as strings (`'61.99'`): a
`number` has already been rounded to binary by the time eon sees it.

## Time-series queries

`SuperTableRepository.query()` returns a fluent `TimeSeriesQuery` — a builder for windowed reads, mirroring the Atlas `ModelQuery` subset. It compiles through the same Rust `eon-query` core and runs over the injected connection.

```typescript
const rows = await repo.query()
  .select([
    { pseudo: '_wstart' },
    { fn: 'avg', column: 'voltage', as: 'avgV' },
    { fn: 'last_row', column: 'current' },
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

- **Filters** — `where(col, value)` / `where(col, op, value)`, `andWhere` / `orWhere`, `whereNull` / `whereNotNull`, `whereBetween(col, [lo, hi])` (the idiomatic time-range helper). `where(col, null)` folds to `IS NULL`. A callback groups predicates in parentheses, so an `orWhere` cannot escape the filters around it: `.where('tenant_id', 42).where((q) => q.where('level', 'alarm').orWhere('sensor', 7))` compiles to `` `tenant_id` = 42 AND (`level` = 'alarm' OR `sensor` = 7) ``. `andWhere` / `orWhere` take a callback too, groups nest, and an empty group is refused (`E_EON_EMPTY_WHERE_GROUP`).
- **Projection** — bare columns (`'ts'`), aggregate/selector functions (`{ fn, column, as? }` — `avg` / `last` / `last_row` / `first` / `count` / `min` / `max` / `sum` / `spread` / `twa`), and window pseudo-columns (`{ pseudo: '_wstart' }`). Every name is allowlisted and quoted in Rust — no raw passthrough.
- **Window** — `interval(val, offset?)`, `sliding(val)`, `fill(mode, ...values)`, `partitionBy(...cols)`. TDengine's canonical clause order (`WHERE` → `PARTITION BY` → `INTERVAL(SLIDING)(FILL)` → `ORDER BY` → `LIMIT/OFFSET`) is emitted verbatim; `sliding` / `fill` without `interval`, or `offset` without `limit`, are typed errors.
- **Terminals** — `exec()` / `all()` (all rows, memoised), `first()` (row-or-null), `toSQL()` (`{ sql, params }`); the builder is **thenable**, so `await query` runs `exec()`.

### Literal-render reads (the crux)

`EonConnection.query(sql)` takes literal SQL only — TDengine binds `?` placeholders exclusively through the STMT (write) path. So a builder SELECT compiles **param-free**: `WHERE` values, `IN (…)` lists and `FILL(VALUE, …)` constants are rendered as safe SQL literals **in Rust** (`render_literal` — strings single-quote-escaped, NUL and out-of-`i64` bigints rejected), never interpolated in TypeScript. `CompiledStatement.params` comes back empty for a builder query.

### Typed rows

Rows hydrate to `Record<string, unknown>` with `TIMESTAMP` / `BIGINT` columns revived as `bigint` (resolved from column metadata, never `key in instance`) and window aliases (`_wstart`, `avgV`) attached raw. Pass a mapper to project into a typed shape — it runs on top of the reviving hydrator, so no `as` cast is needed:

```typescript
const series = await repo
  .query((row) => ({ start: row._wstart, avg: Number(row.avgV) }))
  .select([{ pseudo: '_wstart' }, { fn: 'avg', column: 'voltage', as: 'avgV' }])
  .interval('1m')
```
