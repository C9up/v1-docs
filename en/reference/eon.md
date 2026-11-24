# eon

`@c9up/eon`: the time-series layer on TDengine: super-table entities, columnar ingest, a windowed query builder, migrations, change-data subscriptions and test helpers, over a WebSocket connection to taosAdapter. Guide: [Time series](/en/guides/database/time-series/).

## Installation

```bash
pnpm add @c9up/eon
```

`ream configure @c9up/eon` registers the provider, writes `config/timeseries.ts` and adds `TDENGINE_URL`, `TDENGINE_USER`, `TDENGINE_PASSWORD` and `TDENGINE_DATABASE` to `.env` with their validation rules. `@c9up/eon/testing/vitest` needs `vitest` (an optional peer).

The native query compiler comes as one small package per platform, `@c9up/eon-<platform>`, for linux x64 and arm64 (glibc), macOS x64 and arm64, and Windows x64. `@c9up/eon` lists them as optional dependencies, and your package manager installs only the one that matches your machine. No Rust toolchain is needed. Do not install with optional dependencies turned off (`--no-optional`, `--omit=optional`): the compiler would be left out.

There is no JavaScript fallback. Without the compiler, the first statement eon compiles throws `E_EON_NAPI_NOT_FOUND`, and its message names the package to install, for example `@c9up/eon-linux-x64-gnu`.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/eon` | Decorators, `SuperTableRepository`, `TimeSeriesQuery`, ingest helpers, schema and migrations, the connection, the consumer, `EonProvider`, types |
| `@c9up/eon/provider` | `EonProvider` (default export) |
| `@c9up/eon/services/connection` | The default connection (default export), `setConnection`, `getConnection`, `clearConnection` |
| `@c9up/eon/schema` | `EonSchema`, the builders, `Migration`, `EonMigrationRunner`, `migrateChildTableNames`, spec types, `TYPE_KIND_MAP` |
| `@c9up/eon/tmq` | `connectWsConsumer`, `EonConsumer` and its types, `errors` |
| `@c9up/eon/health` | `EonConnectionCheck`, `EonHealthResult` |
| `@c9up/eon/testing` | `FakeEonConnection`, `FakeEonConsumer`, `factory`, test database helpers |
| `@c9up/eon/testing/vitest` | `describeIfTdengine` |
| `@c9up/eon/configure` | `configure(codemods)`, run by `ream configure` |

## Exports

### `@c9up/eon`

The root also re-exports everything of `@c9up/eon/schema`, `@c9up/eon/tmq` and `@c9up/eon/health`, documented below.

| Export | Kind | Description |
|---|---|---|
| `SuperTable` | function | `SuperTable(name: string): ClassDecorator`: the class is a super-table. |
| `Timestamp` | function | `Timestamp(options?: EonColumnOptions): PropertyDecorator`: the timestamp column. |
| `Column` | function | `Column(options?: EonColumnOptions): PropertyDecorator`: a metric column. |
| `Tag` | function | `Tag(options?: EonTagOptions): PropertyDecorator`: a tag; the tag values route a point to its child table. |
| `getSuperTableMetadata` | function | `getSuperTableMetadata(target: object): SuperTableMetadata \| undefined`. |
| `getTimestampColumn` | function | `getTimestampColumn(target: object): string \| undefined`. |
| `getColumnMetadata` | function | `getColumnMetadata(target: object): EonColumnMetadata[]`. |
| `getTagMetadata` | function | `getTagMetadata(target: object): EonTagMetadata[]`. |
| `SuperTableRepository` | class | Ingest and query one super-table. |
| `TimeSeriesQuery` | class | Windowed query builder; awaiting it runs it. |
| `TimeSeriesWhere` | class | The WHERE part of a query, the type of a `where(callback)` group. |
| `syncSuperTable` | function | `syncSuperTable(conn: EonConnection, EntityClass: SuperTableClass): Promise<void>`: create the super-table of a class if missing. |
| `dropSuperTable` | function | `dropSuperTable(conn: EonConnection, EntityClass: SuperTableClass): Promise<void>`. |
| `createChildTable` | function | `createChildTable(conn: EonConnection, options: CreateChildTableOptions): Promise<void>`. |
| `childTableName` | function | `childTableName(stableOrEntity: string \| SuperTableClass, tagValues: unknown[]): string`: the deterministic child-table name of a tag set. |
| `legacyChildTableName` | function | Same signature: the name earlier versions derived, for `migrateChildTableNames`. |
| `compileCreateStableSpec` | function | `compileCreateStableSpec(EntityClass: SuperTableClass): CreateStableSpec`. |
| `requireSuperTableName` | function | `requireSuperTableName(EntityClass: SuperTableClass): string`; throws `E_EON_NOT_A_SUPERTABLE`. |
| `buildColumnarIngest` | function | `buildColumnarIngest(plan: ColumnarPlan, points: readonly IngestPoint[]): EonColumnarIngest`. |
| `compileStmtTemplate` | function | `compileStmtTemplate(stable: string, tagColumns: readonly string[], columns: readonly string[]): string`. |
| `groupByChild` | function | `groupByChild(stable: string, tagProperties: readonly string[], points: readonly IngestPoint[])`: points grouped by child table. |
| `toBindKind` | function | `toBindKind(logicalType: string \| undefined, property: string): EonBindKind`. |
| `buildLiteralInserts` | function | `buildLiteralInserts(plan: ColumnarPlan, points: readonly IngestPoint[]): string[]`: one `INSERT … USING … TAGS … VALUES` per child table. |
| `toLineProtocol` | function | `toLineProtocol(plan: ColumnarPlan, points: readonly IngestPoint[]): string[]`. |
| `DEFAULT_BATCH_SIZE` | const | `4096` rows per child per bind. |
| `compileStatementNative` | function | `compileStatementNative(spec: object, dialect?: EonDialect): CompiledStatement`: the Rust compiler. |
| `quoteIdentNative` | function | `quoteIdentNative(name: string): string`. |
| `connectWsEon` | function | `connectWsEon(config: EonConnectionConfig): Promise<EonConnection>`: open a WebSocket connection, retrying the first connect as configured. |
| `destroyEonConnector` | function | `destroyEonConnector(): Promise<void>`: kept as a no-op; each connection releases its own socket on `close()`. |
| `ensureDatabase` | function | `ensureDatabase(config: EonConnectionConfig, connect: EonConnector): Promise<void>`: create `config.database` per `createDatabase`. |
| `defineConfig` | function | `defineConfig(config: EonConfig): EonConfig`. |
| `EonProvider` | provider | Same class as `@c9up/eon/provider`. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors). Each is a flare `Exception` with a string `code`. |
| `EonConnection` | interface | `{ transport; exec(sql); query<T>(sql); ping(); ingestColumnar(request); schemaless(lines, options?); close() }`. |
| `EonConfig` | interface | `EonConnectionConfig & { default?; connections?; migrationsDir? }`. |
| `EonConnectionConfig` | interface | One connection's settings (see Configuration). |
| `EonColumnOptions` | interface | `{ type?: string; length?: number; precision?: number; scale?: number; nullable?: boolean }`. |
| `EonTagOptions` | type | `EonColumnOptions` without `nullable`. |
| `EonColumnMetadata` / `EonTagMetadata` / `SuperTableMetadata` | interface | What the decorators record. |
| `SuperTableClass` | type | A constructor decorated with `@SuperTable`. |
| `SuperTableRepositoryOptions` | interface | `{ batchSize?: number }`. |
| `IngestPoint` | type | `Record<string, unknown>`. |
| `ColumnarPlan` / `PlanColumn` | interface | The ingest plan of a super-table. |
| `EonColumnarIngest` / `EonChildBatch` / `EonBoundColumn` / `EonBindKind` | interface / type | The columnar request a connection binds. |
| `EonLineProtocol` | type | `'influxdb' \| 'opentsdb-telnet' \| 'opentsdb-json'`. |
| `EonSchemalessPrecision` | type | `'hours' \| 'minutes' \| 'seconds' \| 'milliseconds' \| 'microseconds' \| 'nanoseconds'`. |
| `EonSchemalessOptions` | interface | `{ protocol?: EonLineProtocol; precision?: EonSchemalessPrecision; ttl?: number }`; defaults `influxdb`, `milliseconds`, `0`. |
| `CompiledStatement` | interface | `{ statements: string[]; params: unknown[] }`. |
| `EonDialect` | type | `'tdengine'`. |
| `EonScalar` | type | `string \| number \| bigint \| boolean \| null`. |
| `EonWhereValue` | type | `EonScalar \| readonly EonScalar[]`. |
| `EonWhereOperator` | type | `=`, `!=`, `<>`, `>`, `>=`, `<`, `<=`, `LIKE`, `NOT LIKE`, `IN`, `NOT IN`, `IS NULL`, `IS NOT NULL`. |
| `EonWhereCallback` | type | `(query: TimeSeriesWhere) => void`. |
| `EonFillMode` | type | `'none' \| 'null' \| 'prev' \| 'next' \| 'linear' \| 'value'`. |
| `EonOrderDirection` | type | `'asc' \| 'desc'`. |
| `EonSelectItem` | type | `string \| EonFunctionSelect \| EonPseudoSelect`. |
| `EonFunctionSelect` | interface | `{ fn: string; column: string; as?: string }`; `fn` is one of `avg`, `sum`, `min`, `max`, `count`, `first`, `last`, `last_row`, `spread`, `twa`. |
| `EonPseudoSelect` | interface | `{ pseudo: string; as?: string }`; `_wstart`, `_wend`, `_wduration` or `tbname`. |
| `CreateChildTableOptions` | interface | `{ stable?: string; EntityClass?: SuperTableClass; name: string; tags: unknown[]; ifNotExists?: boolean }`. |
| `EonAppContext` | interface | The host the provider needs. |
| `EonConnector` | type | `(config: EonConnectionConfig) => Promise<EonConnection>`. |
| `EonService` | interface | `{ compile(spec: object, dialect?: EonDialect): CompiledStatement }`, bound as `eon.compiler`. |
| `EonDatabaseOptions` | interface | `{ keep?; duration?; precision?: EonPrecision; buffer?; walLevel?: 1 \| 2; cachemodel?: EonCacheModel }`. |
| `EonAlterDatabaseOptions` | interface | `{ keep?; buffer?; walLevel?; cachemodel?; replica?; minrows? }`. |
| `EonPrecision` | type | `'ms' \| 'us' \| 'ns'`. |
| `EonCacheModel` | type | `'none' \| 'last_row' \| 'last_value' \| 'both'`. |
| `EonLogicalType` | type | The column types a decorator or builder accepts (`timestamp`, `int`, `bigint`, `float`, `double`, `bool`, `varchar`, `nchar`, `binary`, `varbinary`, `json`, `decimal`…). |
| `EonColumnSpec` | interface | `{ name; kind; length; precision; scale }`. |
| `CreateStableSpec` / `AlterStableSpec` / `DropStableSpec` / `CreateChildTableSpec` / `CreateDatabaseSpec` / `AlterDatabaseSpec` / `CreateTableSpec` / `DropTableSpec` / `AlterChange` | interface / type | The statement specs the compiler takes. |
| `AlterTypeSetter` / `StableColumnHandle` | interface | Returned by the alter and create builders. |

### `@c9up/eon/provider`

| Export | Kind | Description |
|---|---|---|
| `default` (`EonProvider`) | provider | `new EonProvider(app: EonAppContext, connect?: EonConnector)`. `register()` binds the tokens; `boot()` reads `config/timeseries.ts` (or the `eon` key), creates the database when asked, opens every connection, seats the default one on `services/connection` and registers eon's migration runner with ream's `migrations` registry; nothing is opened when the app runs in inspection mode. `shutdown()` closes every connection. |

### `@c9up/eon/services/connection`

| Export | Kind | Description |
|---|---|---|
| `default` | const | The default `EonConnection`; a member read before boot throws. |
| `setConnection` | function | `setConnection(connection: EonConnection): void`. |
| `getConnection` | function | `getConnection(): EonConnection \| undefined`. |
| `clearConnection` | function | `clearConnection(connection: EonConnection): void`: clears it if it is this one. |

### `@c9up/eon/schema`

| Export | Kind | Description |
|---|---|---|
| `EonSchema` | class | Collects DDL: `createStable`, `alterStable`, `dropStable`, `createDatabase`, `alterDatabase`, `createTable`, `dropTable`, `raw`, then `toSQL()`. |
| `StableBuilder` | class | Columns and tags of a super-table. |
| `BasicTableBuilder` | class | Columns of a plain table. |
| `AlterStableBuilder` | class | `addColumn`, `modifyColumn`, `dropColumn`, `addTag`, `modifyTag`, `dropTag`, `renameTag`. |
| `Migration` | class | Abstract base of a migration: `up()`, `down()`, `this.schema`, `raw(sql)`. |
| `EonMigrationRunner` | class | Runs the migrations of a directory against one connection. |
| `migrateChildTableNames` | function | `migrateChildTableNames(conn: EonConnection, EntityClass: SuperTableClass, options?: MigrateChildTableNamesOptions): Promise<ChildTableMigrationReport>`: rename child tables named the earlier way. |
| `TYPE_KIND_MAP` | const | Logical type name to compiler kind. |
| `EonMigrationOptions` | interface | `{ migrationsDir?: string; tableName?: string; disableLocks?: boolean }`. |
| `MigrationState` | type | `'applied' \| 'pending'`. |
| `MigrationStatus` | interface | `{ name: string; status: MigrationState; batch?: number }`. |
| `ChildTableRename` | interface | `{ from: string; to: string; tags: readonly unknown[] }`. |
| `ChildTableMigrationReport` | interface | `{ renamed: readonly ChildTableRename[]; current: readonly string[]; unmatched: readonly string[] }`. |
| `MigrateChildTableNamesOptions` | interface | `{ dryRun?: boolean }`. |
| `CreateStableSpec` / `CreateTableSpec` | interface | Specs, as on the root. |

### `@c9up/eon/tmq`

| Export | Kind | Description |
|---|---|---|
| `connectWsConsumer` | function | `connectWsConsumer(config: EonConsumerConfig): Promise<EonConsumer>`: a subscription consumer over WebSocket. |
| `EonConsumer` | interface | `subscribe(topics)`, `subscription()`, `poll<T>(timeoutMs): Promise<EonMessage<T>[]>`, `commit()`, `assignment(topics?)`, `seek(partition)`, `unsubscribe()`, `close()`. |
| `EonConsumerConfig` | interface | `{ url; groupId; clientId?; user?; password?; token?; offsetReset?: EonOffsetReset; autoCommit?; autoCommitIntervalMs?; withTableName? }`. |
| `EonMessage` | interface | `{ topic: string; rows: T[] }`. |
| `EonTopicPartition` | interface | `{ topic: string; vgroupId: number; offset?: bigint; begin?: bigint; end?: bigint }`. |
| `EonOffsetReset` | type | `'earliest' \| 'latest' \| 'none'`. |
| `errors` | namespace | The same `errors` namespace as `@c9up/eon`. |

### `@c9up/eon/health`

| Export | Kind | Description |
|---|---|---|
| `EonConnectionCheck` | class | `new EonConnectionCheck(conn: EonConnection)`, named `TDengine connection check`: `as(name)`, `cacheFor(seconds)`, `warnWhenSlowerThan(milliseconds)`, `run(): Promise<EonHealthResult>`. |
| `EonHealthResult` | interface | `{ message; status: 'ok' \| 'warning' \| 'error'; finishedAt: Date; meta? }`. |

### `@c9up/eon/testing`

| Export | Kind | Description |
|---|---|---|
| `FakeEonConnection` | class | An in-memory `EonConnection`: records `statements`, stores ingested rows (`rows(table)`), answers flat SELECTs; `reset()`. `new FakeEonConnection(options?: { precision?: EonPrecision })`. |
| `FakeEonConsumer` | class | An in-memory `EonConsumer`: `push(...messages)`, `committedCount`, `isClosed`. |
| `factory` | function | `factory<T>(EntityClass, defaults: () => Record<string, unknown>): FactoryBuilder<T>`. |
| `FactoryBuilder` | interface | `merge`, `state`, `apply`, `make`, `makeMany`, `makeStubbed`, `create(conn)`, `createMany(count, conn)`. |
| `hasTestServer` | function | `hasTestServer(): boolean`: `EON_TEST_URL` is set. |
| `connectTestEon` | function | `connectTestEon(overrides?: Partial<EonConnectionConfig>): Promise<EonConnection>`: connect to `EON_TEST_URL`. |
| `resetDatabase` | function | `resetDatabase(conn: EonConnection, db: string): Promise<void>`: drop and recreate a database. |
| `createTestDatabase` | function | `createTestDatabase(conn, database, options?: { keepMs?: number }): Promise<void>`. |
| `dropTestDatabase` | function | `dropTestDatabase(conn, database): Promise<void>`. |
| `dropTestTopic` | function | `dropTestTopic(conn, topic, options?: { retries?: number; delayMs?: number }): Promise<void>`. |
| `withTestDatabase` | function | `withTestDatabase<T>(conn, database, body: () => Promise<T>): Promise<T>`: create, run, drop. |
| `FakeEonConnectionOptions` | interface | `{ precision?: EonPrecision }`, `ms` by default. |

### `@c9up/eon/testing/vitest`

| Export | Kind | Description |
|---|---|---|
| `describeIfTdengine` | function | `describeIfTdengine(name: string, factory: () => void): void`: a suite that runs only when `EON_TEST_URL` is set. |

### `SuperTableRepository`

`new SuperTableRepository(entityClass: SuperTableClass, conn: EonConnection, options?: SuperTableRepositoryOptions)`.

| Member | Signature | Description |
|---|---|---|
| `query` | `query(): TimeSeriesQuery<Record<string, unknown>>` or `query<E>(mapPoint: (row) => E): TimeSeriesQuery<E>` | A query on the super-table. |
| `ingest` | `ingest(point: IngestPoint): Promise<void>` | One point. |
| `ingestMany` | `ingestMany(points: readonly IngestPoint[]): Promise<{ rowsAffected: number }>` | Columnar STMT ingest, grouped by child table: the default bulk path. |
| `ingestSql` | `ingestSql(points: readonly IngestPoint[]): Promise<{ rowsAffected: number }>` | Literal `INSERT` statements. |
| `ingestSchemaless` | `ingestSchemaless(points: readonly IngestPoint[], options?: EonSchemalessOptions): Promise<void>` | Line protocol; slower than `ingestMany`. |

### `TimeSeriesQuery`

| Member | Signature | Description |
|---|---|---|
| `where` / `andWhere` / `orWhere` | `where(column: string, operator: EonWhereOperator, value: EonWhereValue): this` | Also `(column, value)` and `(callback)` for a group. |
| `whereNull` / `whereNotNull` | `whereNull(column: string): this` | |
| `whereBetween` | `whereBetween(column: string, range: readonly [EonScalar, EonScalar]): this` | |
| `select` | `select(items: readonly EonSelectItem[]): this` | Columns, allowed functions, pseudo-columns. |
| `interval` | `interval(value: string, offset?: string): this` | Window size (`'1m'`, `'1h'`). |
| `sliding` | `sliding(value: string): this` | Needs `interval`. |
| `fill` | `fill(mode: EonFillMode, ...values: readonly EonScalar[]): this` | Needs `interval`. |
| `partitionBy` | `partitionBy(...columns: readonly string[]): this` | |
| `orderBy` | `orderBy(column: string, direction?: EonOrderDirection): this` | `asc` by default. |
| `limit` / `offset` | `limit(n: number): this` | `offset` needs `limit`. |
| `toSQL` | `toSQL(): { sql: string; params: unknown[] }` | |
| `exec` / `all` | `exec(): Promise<TPoint[]>` | Also run by `await`. |
| `first` | `first(): Promise<TPoint \| null>` | |

### `EonMigrationRunner`

`new EonMigrationRunner(conn: EonConnection, options?: EonMigrationOptions)`; directory `database/eon-migrations` and table `ream_eon_migrations` by default.

| Member | Signature | Description |
|---|---|---|
| `init` | `init(): Promise<void>` | Create the tracking table. |
| `status` | `status(): Promise<MigrationStatus[]>` | |
| `migrate` | `migrate(): Promise<string[]>` | Run pending migrations. |
| `rollback` | `rollback(): Promise<string[]>` | Roll back the last batch. |
| `reset` | `reset(): Promise<string[]>` | Roll back everything. |
| `refresh` / `fresh` | `refresh(): Promise<{ rolled: string[]; executed: string[] }>` | Reset, then migrate. |
| `dryRun` | `dryRun(): Promise<Array<{ name: string; sql: string[] }>>` | The SQL pending migrations would run. |
| `forceUnlock` | `forceUnlock(): Promise<boolean>` | Clear a stale migration lock. |

## Configuration

`config/timeseries.ts`, read under the `timeseries` key (`eon` is read when it is absent).

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | — | taosAdapter WebSocket URL, `ws://localhost:6041`. |
| `user` / `password` | `string` | — | Credentials. |
| `token` | `string` | — | Bearer token, instead of user and password. |
| `database` | `string` | — | Database to `USE` on connect. |
| `createDatabase` | `boolean \| EonDatabaseOptions` | unset | Create `database` before the first connection selects it. The generated config passes `{ precision: 'ms' }`. |
| `timeoutMs` | `number` | `60000` | Per-request timeout, also the connect deadline. |
| `connectRetries` | `number` | `0` | Extra attempts of the first connection. |
| `connectBackoffMs` | `number` | `200` | Base of the exponential backoff between them, capped at 30 s. |
| `default` | `string` | `'primary'` | Default connection when `connections` is set. |
| `connections` | `Record<string, EonConnectionConfig>` | — | Named connections. |
| `migrationsDir` | `string` | `'database/eon-migrations'` | eon's migrations, apart from atlas's. |

## Container bindings

| Token | Resolves to |
|---|---|
| `'eon'` | The default `EonConnection`, once `boot()` opened it |
| `'eon.connection'` | The same connection |
| `'eon:<name>'` | A named connection |
| `'eon.compiler'` | `EonService` |

`eon`, `eon.connection` and `eon.compiler` are typed on `ContainerBindings` once `@c9up/eon` is imported.

## Errors

Every code is on `error.code`, and each code is a class of the `errors` namespace: `error instanceof errors.E_EON_NO_TIMESTAMP`, with `import { errors } from '@c9up/eon'`. Each is a flare `Exception`. A refusal from the TDengine server is `E_EON_SERVER_ERROR`, with TDengine's numeric code on `taosCode`. The query compiler's refusals arrive with the same codes: eon reads the compiler's message back into the matching error and keeps the compiler's own error as `cause`.

| Code | Raised when |
|---|---|
| [`E_EON_MISSING_CONNECTION`](/en/reference/errors#e-eon-missing-connection) | A repository has no connection to run on. |
| [`E_EON_NOT_A_SUPERTABLE`](/en/reference/errors#e-eon-not-a-supertable) | A class used as a super-table is not decorated with `@SuperTable`. |
| [`E_EON_NO_TAGS`](/en/reference/errors#e-eon-no-tags) | A super-table has no `@Tag` column, so a child table cannot be routed. |
| [`E_EON_NO_TIMESTAMP`](/en/reference/errors#e-eon-no-timestamp) | A super-table has no `@Timestamp` column. |
| [`E_EON_CHILD_STABLE`](/en/reference/errors#e-eon-child-stable) | `createChildTable()` was given neither `stable` nor `EntityClass`. |
| [`E_EON_CHILD_COLLISION`](/en/reference/errors#e-eon-child-collision) | Two distinct tag sets map to the same child table; eon refuses to write mismatched rows under one tag set. |
| [`E_EON_CHILD_MIGRATION`](/en/reference/errors#e-eon-child-migration) | `migrateChildTableNames()` read a child listing row without a table name. |
| [`E_EON_BATCH_SIZE`](/en/reference/errors#e-eon-batch-size) | `batchSize` is not a positive integer. |
| [`E_EON_BIND`](/en/reference/errors#e-eon-bind) | A value cannot be written to its STMT placeholder as given: the wrong type, or a decimal the column cannot hold exactly. |
| [`E_EON_SERVER_VERSION`](/en/reference/errors#e-eon-server-version) | The columnar STMT path needs TDengine 3.3.6.0 or later (stmt2). |
| [`E_EON_TYPE`](/en/reference/errors#e-eon-type) | A column or tag has an unknown or missing type. |
| [`E_EON_TS_TYPE`](/en/reference/errors#e-eon-ts-type) | A timestamp is neither a bigint nor a safe-integer number. |
| [`E_EON_PARAM_PRECISION`](/en/reference/errors#e-eon-param-precision) | A timestamp number is not a safe integer; pass nanosecond timestamps as bigint. |
| [`E_EON_VALUE_TYPE`](/en/reference/errors#e-eon-value-type) | An integer column was given something other than a safe integer or a bigint. |
| [`E_EON_VALUE_RANGE`](/en/reference/errors#e-eon-value-range) | A value is outside its column type's range; the connector would truncate it silently. |
| [`E_EON_TEMPLATE`](/en/reference/errors#e-eon-template) | The compiler returned no statement for the STMT insert template. |
| [`E_EON_LITERAL_INSERT`](/en/reference/errors#e-eon-literal-insert) | A literal insert for one child table compiled to other than exactly one statement. |
| [`E_EON_HYDRATE_BIGINT`](/en/reference/errors#e-eon-hydrate-bigint) | A bigint or timestamp column came back with a non-integer value. |
| [`E_EON_DECODE`](/en/reference/errors#e-eon-decode) | A server reply or result block does not match the protocol (truncated, unknown type, rows without column metadata); a frame that cannot be trusted closes the connection. |
| [`E_EON_TIMEOUT`](/en/reference/errors#e-eon-timeout) | A request to TDengine got no reply within `timeoutMs`. |
| [`E_EON_CLOSED`](/en/reference/errors#e-eon-closed) | The TDengine connection closed while a request was waiting, or a request was sent on a closed one. |
| [`E_EON_CONNECT`](/en/reference/errors#e-eon-connect) | The WebSocket to taosAdapter could not be opened: a bad URL, a refused connection, or no handshake within the deadline. A URL that does not parse is not attached as the `cause`. |
| [`E_EON_SERVER_ERROR`](/en/reference/errors#e-eon-server-error) | The TDengine server refused a request (a bad statement, a missing table, bad credentials); `taosCode` holds TDengine's numeric error code. |
| [`E_EON_NO_TOPIC`](/en/reference/errors#e-eon-no-topic) | `subscribe()` was given no topic; the server would accept it and deliver nothing. |
| [`E_EON_SEEK_NO_OFFSET`](/en/reference/errors#e-eon-seek-no-offset) | `seek()` was given a partition without an `offset`. |
| [`E_EON_SCHEMALESS_SCHEMA`](/en/reference/errors#e-eon-schemaless-schema) | A field type has no line-protocol form. |
| [`E_EON_SCHEMALESS_FIELD`](/en/reference/errors#e-eon-schemaless-field) | A line-protocol field value is outside its type's range. |
| [`E_EON_SCHEMALESS_TAG`](/en/reference/errors#e-eon-schemaless-tag) | A line-protocol tag value cannot be written. |
| [`E_EON_SCHEMALESS_EMPTY_TAG`](/en/reference/errors#e-eon-schemaless-empty-tag) | A line-protocol tag value is empty. |
| [`E_EON_SCHEMALESS_NO_FIELDS`](/en/reference/errors#e-eon-schemaless-no-fields) | A line-protocol point has no field. |
| [`E_EON_SCHEMALESS_MEASUREMENT`](/en/reference/errors#e-eon-schemaless-measurement) | The super-table (measurement) name is empty. |
| [`E_EON_SCHEMALESS_CONTROL_CHAR`](/en/reference/errors#e-eon-schemaless-control-char) | A line-protocol name or value holds a line terminator or control character; it is refused, not escaped. |
| [`E_EON_INVALID_VALUE`](/en/reference/errors#e-eon-invalid-value) | `where()` with one argument takes a callback that fills a group. |
| [`E_EON_EMPTY_WHERE_GROUP`](/en/reference/errors#e-eon-empty-where-group) | A `where(callback)` group added no predicate. |
| [`E_EON_INVALID_LIMIT`](/en/reference/errors#e-eon-invalid-limit) | `limit()` was given a value that is not a non-negative integer. |
| [`E_EON_INVALID_OFFSET`](/en/reference/errors#e-eon-invalid-offset) | `offset()` was given a value that is not a non-negative integer. |
| [`E_EON_COMPILE_EMPTY`](/en/reference/errors#e-eon-compile-empty) | The compiler returned no SQL statement. |
| [`E_EON_UNEXPECTED_PARAMS`](/en/reference/errors#e-eon-unexpected-params) | A time-series query compiled with bound parameters where literal SQL is expected. |
| [`E_EON_INTERNAL`](/en/reference/errors#e-eon-internal) | An invariant inside eon broke, or the Rust compiler panicked or could not serialize what it compiled: always a bug in eon itself. |
| [`E_EON_ALTER_DB_ONE_OPTION`](/en/reference/errors#e-eon-alter-db-one-option) | `alterDatabase()` takes exactly one option. |
| [`E_EON_MIGRATION_INVALID`](/en/reference/errors#e-eon-migration-invalid) | The migrations tracking table holds an unreadable `executed_at`. |
| [`E_EON_MIGRATION_LOCKED`](/en/reference/errors#e-eon-migration-locked) | Another run holds the migration lock. |
| [`E_EON_FACTORY_STATE`](/en/reference/errors#e-eon-factory-state) | A factory state is not defined. |
| [`E_EON_FAKE_UNSUPPORTED`](/en/reference/errors#e-eon-fake-unsupported) | `FakeEonConnection` answers only flat SELECTs; windowed or aggregate SQL needs a live TDengine. |
| [`E_EON_TEST_IDENTIFIER`](/en/reference/errors#e-eon-test-identifier) | A test cleanup helper was given a name that is not a plain identifier. |
| [`E_EON_NOT_BOOTED`](/en/reference/errors#e-eon-not-booted) | An eon connection (the `eon` token, `eon:<name>`, or `@c9up/eon/services/connection`) was used before `EonProvider.boot()` opened it. |
| [`E_EON_ALREADY_BOOTED`](/en/reference/errors#e-eon-already-booted) | `EonProvider.boot()` ran a second time while its connections are open; call `shutdown()` first. |
| [`E_EON_BOOT_FAILED`](/en/reference/errors#e-eon-boot-failed) | `EonProvider.boot()` could not open one or more configured connections; `cause` holds the first failure. |
| [`E_EON_UNKNOWN_CONNECTION`](/en/reference/errors#e-eon-unknown-connection) | The default connection named in `config/timeseries.ts` is not among its `connections`. |
| [`E_EON_NO_DATABASE`](/en/reference/errors#e-eon-no-database) | `createDatabase` is set but no `database` is configured. |
| [`E_EON_TEST_URL`](/en/reference/errors#e-eon-test-url) | `connectTestEon()` was called without `EON_TEST_URL`. |
| [`E_EON_NAPI_NOT_FOUND`](/en/reference/errors#e-eon-napi-not-found) | The eon query compiler binary is not found. |
| [`E_EON_NAPI_UNSUPPORTED`](/en/reference/errors#e-eon-napi-unsupported) | There is no eon query compiler binary for this platform. |
| [`E_EON_INVALID_DURATION`](/en/reference/errors#e-eon-invalid-duration) | A duration is not a positive integer followed by one unit. |
| [`E_EON_INVALID_FILL`](/en/reference/errors#e-eon-invalid-fill) | A `FILL` mode is not one TDengine knows, or lacks its value. |
| [`E_EON_FILL_REQUIRES_INTERVAL`](/en/reference/errors#e-eon-fill-requires-interval) | `FILL` was used without `INTERVAL`. |
| [`E_EON_SLIDING_REQUIRES_INTERVAL`](/en/reference/errors#e-eon-sliding-requires-interval) | `SLIDING` was used without `INTERVAL`. |
| [`E_EON_OFFSET_REQUIRES_LIMIT`](/en/reference/errors#e-eon-offset-requires-limit) | `OFFSET` was used without `LIMIT`. |
| [`E_EON_INVALID_ORDER_DIRECTION`](/en/reference/errors#e-eon-invalid-order-direction) | An order direction is neither `asc` nor `desc`. |
| [`E_EON_INVALID_PSEUDO_COLUMN`](/en/reference/errors#e-eon-invalid-pseudo-column) | A pseudo-column is not one eon allows. |
| [`E_EON_INVALID_SELECT`](/en/reference/errors#e-eon-invalid-select) | A select expression cannot be compiled. |
| [`E_EON_INVALID_SELECT_FUNCTION`](/en/reference/errors#e-eon-invalid-select-function) | A select names a function eon does not allow. |
| [`E_EON_INVALID_DB_OPTION`](/en/reference/errors#e-eon-invalid-db-option) | A database option value is invalid. |
| [`E_EON_UNKNOWN_DB_OPTION`](/en/reference/errors#e-eon-unknown-db-option) | A database option is not alterable (`KEEP`, `BUFFER`, `WAL_LEVEL`, `CACHEMODEL`, `REPLICA`, `MINROWS`). |
| [`E_EON_IMMUTABLE_DB_OPTION`](/en/reference/errors#e-eon-immutable-db-option) | A database option is fixed at CREATE and cannot be altered. |
| [`E_EON_INVALID_TTL`](/en/reference/errors#e-eon-invalid-ttl) | A child-table TTL is not a non-negative whole number of days. |
| [`E_EON_INVALID_WAL_LEVEL`](/en/reference/errors#e-eon-invalid-wal-level) | A `WAL_LEVEL` is not one TDengine accepts. |
| [`E_EON_INVALID_CACHEMODEL`](/en/reference/errors#e-eon-invalid-cachemodel) | A `CACHEMODEL` is not one TDengine accepts. |
| [`E_EON_INVALID_PRECISION`](/en/reference/errors#e-eon-invalid-precision) | A database precision is not `ms`, `us` or `ns`. |
| [`E_EON_KEEP_TOO_SMALL`](/en/reference/errors#e-eon-keep-too-small) | `KEEP` is less than three times `DURATION`. |
| [`E_TS_REQUIRED`](/en/reference/errors#e-ts-required) | A super-table's first column is not a TIMESTAMP. |
| [`E_TAGS_REQUIRED`](/en/reference/errors#e-tags-required) | A super-table declares no tag, or an INSERT that auto-creates a child table (`using`), or its STMT template, has no tag. |
| [`E_JSON_TAG_RULE`](/en/reference/errors#e-json-tag-rule) | JSON is tag-only and must be the only tag. |
| [`E_TYPE_NOT_TAGGABLE`](/en/reference/errors#e-type-not-taggable) | A type that cannot be a tag (DECIMAL) is used as one. |
| [`E_LENGTH_REQUIRED`](/en/reference/errors#e-length-required) | A type that needs a length (`BINARY(n)`, `NCHAR(n)`…) was given none. |
| [`E_NAME_COLLISION`](/en/reference/errors#e-name-collision) | A name is listed more than once across the STMT template's tag and value columns. |
| [`E_INVALID_CLAUSE_TYPE`](/en/reference/errors#e-invalid-clause-type) | A WHERE connector is neither `and` nor `or`. |
| [`E_INVALID_WHERE_GROUP`](/en/reference/errors#e-invalid-where-group) | A WHERE group is empty, or also names a column. |
| [`E_INVALID_WHERE_VALUE`](/en/reference/errors#e-invalid-where-value) | A WHERE value (or list element) is not a scalar, or an `IN` value is not a list. |
| [`E_UNSAFE_IDENTIFIER`](/en/reference/errors#e-unsafe-identifier-eon) | The compiler refused an identifier. |
| [`E_UNSAFE_LITERAL`](/en/reference/errors#e-unsafe-literal-eon) | The compiler refused a literal value. |
| [`E_UNSAFE_OPERATOR`](/en/reference/errors#e-unsafe-operator) | The compiler refused an operator. |
| [`E_EON_INVALID_INSERT`](/en/reference/errors#e-eon-invalid-insert) | An INSERT reached the compiler with no column, no row, a row whose width differs from the column list, or `tags` without `using`. |
| [`E_EON_ALTER_EMPTY`](/en/reference/errors#e-eon-alter-empty) | An ALTER STABLE reached the compiler with no change. |
| [`E_UNSUPPORTED_CLIENT`](/en/reference/errors#e-unsupported-client-eon) | The compiler was asked for a dialect other than `tdengine`. |
| [`E_EON_INVALID_SPEC`](/en/reference/errors#e-eon-invalid-spec) | The statement the compiler received does not parse. Eon builds every spec itself, so this points at an eon bug or at a spec built by hand. |

## Migration

- `EonError`, `EonConnectionError` and `EonConsumerError` are gone: each code is its own class of the `errors` namespace. Replace `instanceof EonError` with a test on `error.code`, or with `instanceof errors.E_EON_...`, `errors` coming from `@c9up/eon` (or `@c9up/eon/tmq`).
- A refusal from the TDengine server is `errors.E_EON_SERVER_ERROR`: its `code` is the string `'E_EON_SERVER_ERROR'`, and TDengine's numeric code moved to `taosCode`. `error.code === 9731` becomes `error instanceof errors.E_EON_SERVER_ERROR && error.taosCode === 9731`.
- A client-side failure carries its code on `error.code` (`E_EON_TIMEOUT`, `E_EON_CLOSED`, `E_EON_DECODE`, `E_EON_CONNECT`, `E_EON_BIND`, `E_EON_SERVER_VERSION`), no longer as a `[E_EON_…]` tag at the start of the message.
- A query compiler refusal carries its code on `error.code` (`E_UNSAFE_IDENTIFIER`, `E_EON_INVALID_FILL`…), no longer as `CODE:` at the start of the message.
- `E_EON_CONNECT` for a URL that does not parse no longer carries Node's `TypeError` as its `cause`: that error held the whole URL, password included. Read the message instead.

## See also

- [Time series](/en/guides/database/time-series/)
- [Schema and migrations](/en/guides/database/time-series/schema)
- [Writing and reading](/en/guides/database/time-series/data)
- [Testing](/en/guides/database/time-series/testing)
