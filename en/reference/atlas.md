# atlas

`@c9up/atlas`: the ORM: entities and models, repositories, a query builder compiled to SQL by a Rust engine, migrations, a schema builder, seeders, factories and test helpers, on PostgreSQL, MySQL and SQLite. Guide: [ORM](/en/guides/database/orm/).

## Installation

```bash
pnpm add @c9up/atlas
```

`ream configure @c9up/atlas` registers the provider and the `@c9up/atlas/commands` commands, writes `config/database.ts` and adds `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USER` and `DB_PASSWORD` to `.env`. Factories that use faker need `@faker-js/faker`; the `db()` test plugin needs `@c9up/helix` (both optional peers).

Atlas runs on two Rust binaries: the query compiler and the database driver. Both come in one small package per platform, `@c9up/atlas-<platform>`, for linux x64 and arm64 (glibc), macOS x64 and arm64, and Windows x64. `@c9up/atlas` lists them as optional dependencies, and your package manager installs only the one that matches your machine. No Rust toolchain is needed. Do not install with optional dependencies turned off (`--no-optional`, `--omit=optional`): the binaries would be left out.

There is no JavaScript fallback. Without the binaries, the first query throws `E_ATLAS_NAPI_NOT_FOUND` and the first connection throws `E_ATLAS_DB_DRIVER_NOT_FOUND`. Both messages name the package to install, for example `@c9up/atlas-linux-x64-gnu`.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/atlas` | Everything below except the services: models, repositories, queries, decorators, schema and migrations, seeders, factories, test helpers, commands, events, errors |
| `@c9up/atlas/provider` | `AtlasProvider` (default export) |
| `@c9up/atlas/services/db` | `db` (default export), the connection registry and `createDbService` |
| `@c9up/atlas/orm` | `BaseEntity`, `BaseModel`, `BaseRepository`, the entity decorators and the hooks |
| `@c9up/atlas/schema` | `Migration` (also as `BaseSchema`), `Schema`, `TableBuilder`, `ColumnBuilder`, `ForeignKeyBuilder`, `AlterViewBuilder`, `SchemaDumper`, `RawSql` |
| `@c9up/atlas/factories` | `factory`, `Factory`, `FactoryBuilder`, `makeFactoryCommand` |
| `@c9up/atlas/seeders` | `BaseSeeder`, `Seeder`, `runSeeders`, `runSeederDirectory`, `dbSeedCommand`, `makeSeederCommand` |
| `@c9up/atlas/testing` | `useTransaction`, `truncateAll`, `testUtils`, `createDbAssertions`, `db` (helix plugin), `Database`, `factory` |
| `@c9up/atlas/types/relations` | The relation property types `HasOne`, `BelongsTo`, `HasMany`, `ManyToMany`, `HasOneThrough`, `HasManyThrough` |
| `@c9up/atlas/commands` | The command loader: `getMetaData`, `getCommand`, `primaryConnectionName` |
| `@c9up/atlas/configure` | `configure(codemods)`, run by `ream configure` |

## Exports

### `@c9up/atlas`

**Models and repositories**

| Export | Kind | Description |
|---|---|---|
| `BaseModel` | class | Active-record base: static finders and writers on the model's connection, instance `save()` / `delete()`. |
| `BaseEntity` | class | Base of an entity: dirty tracking, fill and merge, relations, serialization, domain events. |
| `BaseRepository` | class | Data-mapper access to one entity class on a given connection. |
| `ModelQuery` | class | The query a model or repository builds; resolves to entity instances. |
| `Paginator` | class | A page of results: `items`, `meta` (`total`, `perPage`, `currentPage`, `lastPage`, `firstPage`), URL helpers. |
| `setAtlasStrictMode` | function | `setAtlasStrictMode(enabled: boolean): void`: raw SQL entry points (`whereRaw`, `joinRaw`…) throw in application code. |
| `isAtlasStrictMode` | function | `isAtlasStrictMode(): boolean`. |
| `DomainEvent` | type | An event an entity records, flushed after it is saved. |
| `CreateOptions` | interface | `{ quiet?: boolean; allowExtraProperties?: boolean }`. |
| `RepositoryOptions` | interface | `{ dialect?: AtlasDialect; scope?: QueryScope }`. |
| `DatabaseConnection` | interface | What a repository runs on: `dialect?`, `execute`, `query`, `transaction?`. |
| `QueryScope` | type | `(query: ModelQuery<BaseEntity>, table: string) => void`. |
| `ScopedPivot` | interface | Pivot constraints of a scoped many-to-many query. |

**Decorators and hooks**

| Export | Kind | Description |
|---|---|---|
| `Entity` | function | `Entity(tableName: string): ClassDecorator`. |
| `Column` / `column` | function | `column(options?: ColumnOptions)`, with `column.date(options?)`, `column.dateTime(options?)` and `column.json(options?)`. Date columns hydrate to a chronos `DateTime`. |
| `PrimaryKey` | function | `PrimaryKey(options?): PropertyDecorator`. |
| `computed` | function | `computed(): MethodDecorator`: a getter included in serialization. |
| `BelongsTo` / `HasOne` / `HasMany` / `HasOneThrough` / `HasManyThrough` / `ManyToMany` | function | Relation decorators; the lower-case forms (`belongsTo`…) are the same functions. |
| `SoftDeletes` | function | `SoftDeletes(): ClassDecorator`: `delete()` sets `deleted_at`; queries leave deleted rows out, the filter ANDed with the query's clauses as one group. |
| `hasSoftDeletes` | function | `hasSoftDeletes(target): boolean`. |
| `scope` | function | Declare a reusable query scope on a model. |
| `beforeSave`, `afterSave`, `beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`, `beforeDelete`, `afterDelete`, `beforeFind`, `afterFind`, `beforeFetch`, `afterFetch`, `beforePaginate`, `afterPaginate` | function | Lifecycle hook decorators: `(): MethodDecorator`. |
| `addHook` / `removeHook` | function | Register or drop a hook without a decorator. |
| `getEntityMetadata`, `getColumnMetadata`, `getRelationMetadata`, `getPrimaryKey`, `getDateColumnConfig` | function | Read what the decorators recorded. |
| `ColumnOptions` | interface | `{ type?; nullable?; default?; columnName?; serializeAs?; serialize?; … }`. |
| `DateTimeColumnOptions` / `DateColumnConfig` | interface | `{ autoCreate?: boolean; autoUpdate?: boolean }` and the recorded config. |
| `JsonColumnOptions` | interface | `ColumnOptions & { type?: 'json' \| 'jsonb' }`; `jsonb` by default. |
| `ColumnAdapter` | interface | `{ consume(raw): T; prepare(value): unknown }`: converts a column between the database and the entity. |
| `ManyToManyOptions` | interface | Pivot table, keys and pivot columns of a many-to-many relation. |
| `ColumnMetadata` / `EntityMetadata` / `RelationMetadata` | interface | Recorded metadata. |
| `HookEvent` / `HookHandler` / `HookKind` | type | Hook names and handler signature. |
| `ScopeFn` | type | A scope's function. |

**Queries and connections**

| Export | Kind | Description |
|---|---|---|
| `QueryBuilder` | class | A table query builder compiled by the Rust engine: `select`, `where`, `whereIn`, `whereNull`, `whereExists`, `orderBy`, `groupBy`, `having`, `limit`, `offset`, `union`, `with`, `paginate`, `toSQL`. |
| `RawSql` | class | A raw SQL fragment with its bindings, built by `db.raw()`. |
| `transaction` | function | `transaction<T>(db: DatabaseConnection, callback: (trx: TransactionClient) => Promise<T> \| T, options?: TransactionOptions): Promise<T>`. |
| `createNapiConnection` | function | `createNapiConnection(url: string, poolMin = 1, poolMax = 10, pragmas?, retry?: ConnectRetryOptions, observability?: ObservabilityOptions): Promise<AsyncDatabaseConnection>`. |
| `getAtlasDialect` / `setAtlasDialect` | function | The process-wide default dialect. |
| `registerColumnCast` / `registerTableCasts` | function | `registerColumnCast(table, column, type)`: cast a bound value to a column type (PostgreSQL). |
| `SQLITE_PROD_PRAGMAS` | const | `{ journal_mode: 'WAL', synchronous: 'NORMAL' }`. |
| `CamelCaseNamingStrategy` / `defaultNamingStrategy` / `getNamingStrategy` | class / const / function | How property names map to column names, and relations to keys. |
| `AsyncDatabaseConnection` | interface | `{ dialect; query; execute; runInTransaction(batch); transaction?(); listen?; close(); ping() }`. |
| `TransactionClient` | interface | A connection bound to one transaction, with query builders and nested savepoints. |
| `TransactionOptions` | interface | `{ isolationLevel?: IsolationLevel; … }`. |
| `IsolationLevel` | type | `'read uncommitted' \| 'read committed' \| 'repeatable read' \| 'serializable'`. |
| `ConnectRetryOptions` / `ObservabilityOptions` / `QueryMeta` | interface | Connect retries, query events, the model a query belongs to. |
| `ListenFn` / `ListenOptions` / `Notification` / `NotificationHandler` / `Unlisten` | type | PostgreSQL LISTEN / NOTIFY through `db.listen()`. |
| `AtlasDialect` | type | `'sqlite' \| 'postgres' \| 'mysql'`. |
| `WhereOperator` / `WhereClause` / `ExistsClause` / `OrderByClause` / `CteDefinition` / `QueryResult` | type | Query builder shapes. |
| `NamingStrategy` / `RelationKind` | type | |

**Schema, migrations and seeders**

| Export | Kind | Description |
|---|---|---|
| `Migration` / `BaseSchema` | class | Abstract base of a migration. |
| `MigrationRunner` | class | Runs a directory of migrations on a `DatabaseAdapter`. |
| `Schema` | class | DDL builder: tables, views, indexes, schemas. |
| `TableBuilder` / `ColumnBuilder` | class | Columns, keys, indexes and checks of one table. |
| `SchemaDumper` | class | Writes the live schema to a `.sql` file and a manifest. |
| `readSchemaDumpManifest` / `schemaDumpManifestPath` | function | Read the manifest next to a dump. |
| `renderPgCreateTable` / `renderPgForeignKeyDdl` | function | PostgreSQL DDL of an introspected table. |
| `introspectTable` | function | `introspectTable(db, dialect, table, schema?): Promise<IntrospectedColumn[] \| null>`. |
| `checkSchema` | function | `checkSchema(entities, db, dialect): Promise<SchemaFinding[]>`: compare models' columns with the live schema. |
| `verifySchema` | function | Same, then throw (`mode: 'throw'`, default) or warn on drift. |
| `runSchemaCheck` | function | Same, printed; resolves to an exit code. |
| `formatSchemaFindings` / `suggestColumn` / `typesCompatible` | function | Helpers of the schema check. |
| `BaseSeeder` / `Seeder` | class | Abstract base of a seeder: `run()`, `this.db`, `static environment`. |
| `runSeeders` / `runSeederDirectory` | function | Run seeder instances, or every seeder file of a directory. |
| `DatabaseAdapter` | interface | What `MigrationRunner` runs on; `runInTransaction(batch)` makes each migration atomic. |
| `MigrationRecord` / `MigrationState` / `MigrationStatus` | type | Migration tracking. |
| `SchemaFinding` / `SchemaFindingKind` | type | `'missing-table' \| 'missing-in-db' \| 'type-mismatch' \| 'missing-in-model'`. |
| `IntrospectedColumn` / `PgForeignKey` / `SchemaDumperOptions` / `SchemaDumpManifest` / `SchemaDumpResult` | type | |
| `ColumnDefinition` / `ColumnType` / `DefaultValue` / `AlterOperation` / `CheckExpression` / `CheckOperator` / `CheckValue` / `ColumnPosition` / `ForeignKeyReference` / `IndexDefinition` / `ReferentialAction` / `TableConstraintSpec` / `TableOptionsSpec` / `TextVariant` | type | Schema builder shapes. |

**Commands, factories, testing, events, errors**

| Export | Kind | Description |
|---|---|---|
| `defineConfig` | function | `defineConfig(config: AtlasDatabaseConfig): AtlasDatabaseConfig`. |
| `configure` | function | The `ream configure` hook. |
| `makeMigrationCommand`, `migrationRunCommand`, `migrationRollbackCommand`, `migrationStatusCommand`, `migrationResetCommand`, `migrationRefreshCommand`, `migrationFreshCommand`, `migrationUnlockCommand`, `dbWipeCommand`, `dbSeedCommand`, `makeSeederCommand`, `makeFactoryCommand`, `schemaDumpCommand`, `schemaGenerateCommand`, `schemaCheckCommand` | function | Build each command class with its options (see `@c9up/atlas/commands`). |
| `generateSchemaFile` / `renderSchemaFile` | function | What `schema:generate` writes. |
| `argument` / `flag` | function | Command argument and flag metadata. |
| `MigrationCommandOptions` / `SeederCommandOptions` / `FactoryCommandOptions` / `SchemaDumpCommandOptions` / `SchemaGenerateOptions` / `AtlasCommandClass` / `CommandOptions` / `ArgumentMetaData` / `FlagMetaData` | type | |
| `factory` / `Factory` | function / const | Model factories (see `@c9up/atlas/factories`). |
| `FactoryContext` | interface | What a factory callback receives. |
| `useTransaction` / `truncateAll` | function | Test isolation (see `@c9up/atlas/testing`). |
| `TestTransaction` | interface | `{ trx: TransactionClient; rollback: () => Promise<void> }`. |
| `onDbQuery` | function | `onDbQuery(listener: DbQueryListener): () => void`: every statement of a connection with `debug: true`. |
| `prettyPrintQuery` | function | `prettyPrintQuery(event: DbQueryEvent): string`. |
| `onUnsafeStatement` | function | `onUnsafeStatement(listener: UnsafeStatementListener): () => void`: every statement the Rust compiler refused. |
| `clearDbQueryListeners` / `clearUnsafeStatementListeners` | function | |
| `DbQueryEvent` / `DbQueryListener` / `UnsafeStatementEvent` / `UnsafeStatementListener` | type | |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors) |

### `@c9up/atlas/provider`

| Export | Kind | Description |
|---|---|---|
| `default` (`AtlasProvider`) | provider | Reads `config/database.ts` (the `database` key), opens every connection, seats the default one on `services/db`, verifies the schema when `verifySchema` is set, runs pending migrations at boot only when `migrations.autoRun` is on, and closes the connections on shutdown. |
| `AtlasAppContext` | interface | The host the provider needs. |
| `ConnectionConfig` / `AtlasDatabaseConfig` | interface | See Configuration. |

### `@c9up/atlas/services/db`

| Export | Kind | Description |
|---|---|---|
| `default` (`db`) | const | The `DbService` of the default connection. |
| `createDbService` | function | `createDbService(resolve: () => AsyncDatabaseConnection, readOnly?: boolean): DbService`. |
| `setDb` / `getDb` / `clearDb` | function | Seat, read and drop the default connection. |
| `registerConnection` / `unregisterConnection` / `getConnection` | function | Named connections: `registerConnection(name, connection, config?)`. |
| `connectionManager` | function | `connectionManager(): ConnectionManager`. |
| `setDatabaseConfig` / `getDatabaseConfig` / `clearDatabaseConfig` / `connectionConfigFor` / `primaryConnectionName` | function | The config the provider booted with; `connectionConfigFor(name?)` merges a connection over the top level. |
| `DbService` | interface | See below. |
| `DbQueryOptions` | interface | `{ client?: QueryExecutor; mode?: 'read' \| 'write' }`. |
| `ConnectionOptions` | interface | `{ mode?: 'read' \| 'write' }`. |

| Member of `DbService` | Signature | Description |
|---|---|---|
| `from` / `table` / `query` | `from(table: string): DatabaseQueryBuilder` | A table query; `from()` also takes a subquery and an alias. |
| `insertQuery` | `insertQuery(options?: DbQueryOptions): DatabaseQueryBuilder` | An insert. |
| `rawQuery` | `rawQuery<T>(sql: string, bindings?: unknown[] \| Record<string, unknown>): RawQueryBuilder<T>` | Raw SQL with positional or named bindings. |
| `raw` / `ref` | `raw(sql: string, params?): RawSql` | A raw fragment, a column reference. |
| `modelQuery` | `modelQuery<Q>(model: { query(): Q }): Q` | A model's query on this connection. |
| `connection` | `connection(name?: string, options?: ConnectionOptions): DbService` | Another connection, or a read replica with `mode: 'read'`. |
| `execute` | `execute(sql: string, params?: unknown[]): Promise<{ rowsAffected: number }>` | |
| `transaction` / `runInTransaction` | as on the connection | Managed or manual transaction; a batch run atomically. |
| `listen` | as on the connection | PostgreSQL LISTEN / NOTIFY. |
| `truncate` / `truncateAllTables` | `truncate(table: string, cascade?: boolean): Promise<void>` | |
| `getAdvisoryLock` / `releaseAdvisoryLock` | `getAdvisoryLock(key: string \| number): Promise<boolean>` | |
| `manager` / `dialect` | getters | |
| `ping` / `close` | `ping(): Promise<void>` | |

### `@c9up/atlas/testing`

| Export | Kind | Description |
|---|---|---|
| `useTransaction` | function | `useTransaction(db: AsyncDatabaseConnection): Promise<TestTransaction>`: run a test inside a transaction rolled back after it. |
| `truncateAll` | function | `truncateAll(db: AsyncDatabaseConnection, ignoreTables?: readonly string[]): Promise<void>`. |
| `testUtils` | function | `testUtils(conn, options?: DbTestUtilsOptions): { db(): DbTestUtils }`: `migrate()`, `truncate()`, `seed(files?)`, `withGlobalTransaction()`. |
| `createDbAssertions` | function | `createDbAssertions(conn: DbConnectionLike): DbAssertions`: `assertHas`, `assertMissing`, `assertCount`, `assertEmpty`. |
| `db` | function | `db(conn: DbConnectionLike): Plugin`: helix plugin setting `ctx.db` to the assertions. |
| `Database` | class | A small async database for tests: `query`, `queryWithParams`, `execute`, `close`, `asAdapter()`. |
| `factory` / `Factory` / `FactoryBuilder` | function / const / interface | As in `@c9up/atlas/factories`. |
| `DbTestUtils` / `DbTestUtilsOptions` | interface | `{ migrationsDir?; seedersDir?; ignoreTables? }`. |
| `DbAssertions` / `DbConnectionLike` | interface | |

### `@c9up/atlas/factories`

| Export | Kind | Description |
|---|---|---|
| `factory` | function | `factory<T extends BaseEntity>(entityClass, defaults): FactoryBuilder<T>`. |
| `Factory` | const | `Factory.define(entityClass, defaults).build()`, and `Factory.stubId(generator?)`. |
| `FactoryBuilder` | interface | `merge`, `mergeRecursive`, `state`, `apply`, `client`, `connection`, `relation`, `with`, `tap`, `newUp`, `pivotAttributes`, `query`, `before`, `after`, `make`, `makeMany`, `makeStubbed`, `makeStubbedMany`, `create(db?)`, `createMany(count, db?)`. |
| `makeFactoryCommand` | function | The `make:factory` command. |

### `@c9up/atlas/commands`

| Command | Description |
|---|---|
| `migration:run` | Run pending migrations (`--schema-path` bootstraps from a dump). |
| `migration:rollback` | Roll back the latest batch, or `--batch=N`; `--force` in production. |
| `migration:status` | Applied and pending migrations. |
| `migration:reset` | Roll back every migration. |
| `migration:refresh` | Roll back every migration, then run them again. |
| `migration:fresh` | Drop every table, then run every migration. |
| `migration:unlock` | Clear a stuck migration lock. |
| `db:wipe` | Drop every table, the migrations table included. |
| `db:seed` | Run seeders (`--files=A,B`, `--connection=name`). |
| `make:migration` | Scaffold a timestamped migration. |
| `make:seeder` | Scaffold a seeder. |
| `make:factory` | Scaffold a factory. |
| `schema:dump` | Dump the schema to a `.sql` file and a manifest (`--prune`, `--connection`, `--path`). |
| `schema:generate` | Introspect the database and generate model classes. |
| `atlas:check` | Compare the models with the live schema. |

Commands that destroy data refuse to run in production without `--force` while `migrations.disableRollbacksInProduction` is on. With the option off, `db:wipe`, `migration:fresh`, `migration:rollback`, `migration:reset` and `migration:refresh` ask for confirmation in production, as `migration:run` does; a missing or failed prompt counts as no.

### `BaseModel`

| Group | Members |
|---|---|
| Find | `find`, `findOrFail`, `findBy`, `findByOrFail`, `findMany`, `findManyBy`, `first`, `firstOrFail`, `all`, `query(options?)` |
| Write | `create`, `createMany`, `createQuietly`, `createManyQuietly`, `firstOrCreate`, `firstOrNew`, `updateOrCreate`, `updateOrCreateMany`, `fetchOrCreateMany`, `fetchOrNewUpMany`, `truncate` |
| Connection | `static connection`, `$connection()`, `$repo(options?)`, `transaction(callback, options?)` or `transaction(options?)` |
| Instance | `save()`, `saveQuietly()`, `delete()`, `deleteQuietly()`, `useTransaction(trx)`, `useConnection(name)`, `$trx` |

### `BaseEntity`

| Group | Members |
|---|---|
| State | `$isNew`, `$isPersisted`, `$isLocal`, `$isDeleted`, `$isDirty`, `$dirty`, `$primaryKeyValue`, `isDirty(...)` |
| Attributes | `fill(values)`, `merge(values)`, `setExtra` / `getExtra`, `enableForceUpdate()` |
| Relations | `load`, `loadOnce`, `loadCount`, `loadAggregate`, `related(name)`, `associate`, `dissociate`, `attach`, `detach`, `sync` |
| Reload | `refresh()`, `fresh()` |
| Output | `serialize(options?)`, `toJSON()`, `toObject()` |
| Domain events | `addDomainEvent`, `getDomainEvents`, `hasDomainEvents`, `domainEventCount`, `clearDomainEvents`, `flushDomainEvents` |

### `BaseRepository`

`new BaseRepository(entityClass, db: DatabaseConnection, options?: RepositoryOptions)`.

| Group | Members |
|---|---|
| Query | `query()`, `find(id)`, `findOrFail(id)`, `findBy(column, value)`, `findByOrFail`, `findMany`, `findManyBy`, `all()`, `allWithTrashed()`, `onlyTrashed()`, `where(column, value)` |
| Write | `create(data, options?)`, `createMany(rows)`, `createQuietly`, `createManyQuietly`, `save(entity)`, `saveQuietly`, `saveMany(entities)`, `upsert(data, uniqueBy)`, `firstOrCreate(where, create?)`, `firstOrNew(where, create?)`, `updateOrCreate(where, data, options?)`, `updateOrCreateMany(key, rows, options?)`, `fetchOrCreateMany`, `fetchOrNewUpMany`, `updateById(id, data)`, `updateWhere(column, value, data)` |
| Delete | `delete(entity)`, `deleteQuietly`, `forceDelete(entity)`, `restore(entity)`, `truncate()` |
| Counters | `increment(id, column, amount?)` or `increment(id, { colA: 1 })`; `decrement` likewise |
| Relations | `loadRelation(entity, name, callback?)`, `relatedProxy(entity, name)`, `loadCount(entity, name, alias?)`, `loadAggregate(entity, name, builder)`, `refresh(entity)`, `fresh(entity)` |
| Low level | `useTransaction(trx)`, `raw(sql, ...params)`, `execute`, `getTableName()`, `getPrimaryKeyColumn()` |

### `ModelQuery`

A `ModelQuery` is `PromiseLike`: `await` runs it. Every `where*` and `having*` method has `and*` and `or*` forms.

| Group | Members |
|---|---|
| Where | `where`, `whereNot`, `whereNull`, `whereNotNull`, `whereIn`, `whereNotIn`, `whereBetween`, `whereNotBetween`, `whereLike`, `whereILike`, `whereColumn`, `whereNotColumn`, `whereExists`, `whereNotExists`, `whereRaw(sql, bindings)`, `whereExpr(column, operator, value)`, `whereJson`, `whereNotJson`, `whereJsonPath`, `whereJsonSubset` / `whereJsonSuperset` and their `Of` and `Not` forms |
| Relations | `preload(relation, callback?)`, `preloadOnce`, `sideload`, `has`, `doesntHave`, `whereHas`, `whereDoesntHave`, `withCount(relation, callback?)`, `withAggregate(relation, callback)` |
| Pivot | `wherePivot`, `whereNotPivot`, `wherePivotIn`, `whereInPivot`, `whereNotInPivot`, `whereNullPivot`, `whereNotNullPivot`, `pivotColumns` |
| Select and aggregates | `select`, `distinct`, `distinctOn`, `count`, `countDistinct`, `sum`, `sumDistinct`, `avg`, `avgDistinct`, `min`, `max`, `selectAggregate`, `as(alias)` |
| Joins | `join`, `innerJoin`, `leftJoin`, `leftOuterJoin`, `rightJoin`, `rightOuterJoin`, `fullOuterJoin`, `crossJoin`, `joinOn(table, left, right)`, `joinRaw(fragment)`, with `on`, `onVal`, `onIn`, `onNull`, `onBetween`, `onExists` and their negations |
| Grouping | `groupBy`, `groupByRaw`, `having*`, `groupLimit`, `groupOrderBy` |
| Order and pages | `orderBy`, `orderByRaw`, `limit`, `offset`, `forPage`, `paginate(page, perPage)`, `cursorPaginate({ perPage, cursor, orderBy })` |
| Sets and CTEs | `union`, `unionAll`, `intersect`, `intersectAll`, `except`, `exceptAll`, `with`, `withRecursive`, `withMaterialized`, `withNotMaterialized` |
| Scopes and conditions | `apply(callback)`, `withScopes(callback)`, `if`, `unless`, `ifDialect`, `unlessDialect`, `match` |
| Soft deletes | `withTrashed`, `onlyTrashed`, `restore`, `forceDelete` |
| Locking | `forUpdate`, `forShare`, `forNoKeyUpdate`, `forKeyShare`, `skipLocked`, `noWait`, `timeout` |
| Run | `exec()`, `first()`, `firstOrFail()`, `sole()`, `exists()`, `doesntExist()`, `pluck(column)`, `all()` |
| Write | `update(patch, returning?)`, `delete(returning?)`, `increment(column, amount)` or `increment({ … })`, `decrement` likewise |
| Inspect | `toSQL()`, `toQuery()`, `toNative()`, `debug(flag)`, `comment(text)`, `reporterData`, `clone()`, `useTransaction(trx)` |
| Clear | `clearSelect`, `clearWhere` (the relation key, scope and soft-delete filter stay), `clearOrder`, `clearHaving`, `clearLimit`, `clearOffset` |
| Group | `wrapExisting()`: close the clauses chained so far into one group |

The eight aggregates share one signature. Each takes a column, with an alias inline, as a second argument, or as the key of an object, and returns the builder. The value comes back as a column of the result row, in `$extras` on the model builder:

```ts
const [row] = await db.from('sales').count('* as total')
Number(row.total)

const [order] = await Order.query().sum('amount as spent').countDistinct('sku', 'items')
Number(order.$extras.spent)
```

None of them runs the query on its own. On `db.from()`, the argument is a column or `*`: an expression is refused with `E_UNSAFE_IDENTIFIER`; give it to `select()` instead (`select('sum(price * quantity) as total')`).

The `DatabaseQueryBuilder` that `db.from()` returns has the same filtering, join, grouping, set and locking methods, plus `insert`, `multiInsert`, `returning`, `onConflict(...).ignore()` / `.merge()`, `update`, `delete` / `del`, `increment`, `decrement`, `withSchema` and `paginate`.

`insert()` takes one row or an array of rows; an array works like `multiInsert()`. A row with no column inserts one row of defaults: `INSERT INTO "t" DEFAULT VALUES` on Postgres and SQLite, ``INSERT INTO `t` () VALUES ()`` on MySQL. An empty array has no row, so `insert([])` and `multiInsert([])` fail with `E_ATLAS_EMPTY_INSERT`. Several rows that set no column fail the same way: only one row can take every default. On SQLite, an upsert (`onConflict()`) of a row with no column fails with `E_UNSUPPORTED`, because SQLite takes no `ON CONFLICT` after `DEFAULT VALUES`.

`onConflict()` with no column means any unique constraint. With `ignore()`, it compiles `ON CONFLICT DO NOTHING` on Postgres and SQLite, and `INSERT IGNORE` on MySQL. With `merge()`, it compiles `ON CONFLICT DO UPDATE` on SQLite and `ON DUPLICATE KEY UPDATE` on MySQL. Postgres needs the conflict columns to update a row, so `onConflict().merge()` fails there with `E_UNSUPPORTED`: name the columns, as in `onConflict('email').merge()`.

### `Migration`

| Member | Signature | Description |
|---|---|---|
| `up` / `down` | `abstract up(): Promise<void> \| void` | The change and its reverse. |
| `schema` | `readonly schema: Schema` | The DDL builder. |
| `defer` | `defer(callback: (db) => Promise<void> \| void): void` | Run code against the connection after the schema statements, in the migration's transaction. |
| `raw` | `raw(expression: string): RawSql` | A raw SQL expression for a column default, written as is. |
| `now` | `now(): RawSql` | `CURRENT_TIMESTAMP` on SQLite, `NOW()` elsewhere, for a column default. |
| `disableTransactions` | `static disableTransactions = false` | Run this migration outside a transaction. |
| `dryRun` | `dryRun = false` | Set while the runner collects SQL without writing. |
| `getUpSQL` / `getDownSQL` | `getUpSQL(): Promise<string[]>` | The compiled statements. |

### `MigrationRunner`

`new MigrationRunner(db: DatabaseAdapter, options?: { migrationsDir?; dialect?; tableName?; … })`; `database/migrations` and table `ream_migrations` by default.

| Member | Signature | Description |
|---|---|---|
| `init` | `init(): Promise<void>` | Create the tracking table. |
| `status` | `status(): Promise<MigrationStatus[]>` | |
| `migrate` | `migrate(options?: { schemaPath?: string }): Promise<string[]>` | Run pending migrations, each atomically when the adapter has `runInTransaction`. |
| `rollback` | `rollback(options?: { batch?: number; force?: boolean }): Promise<string[]>` | The last batch, or batch `N`. |
| `reset` / `refresh` | `refresh(): Promise<{ rolled: string[]; executed: string[] }>` | Roll back everything; `refresh` then migrates again. |
| `fresh` | `fresh(options?: { force?: boolean; schemaPath?: string }): Promise<{ rolled: string[]; executed: string[] }>` | Drop every table, then migrate. |
| `wipe` | `wipe(options?: { force?: boolean }): Promise<void>` | Drop every table. |
| `dryRun` | `dryRun()` | The SQL pending migrations would run, without writing. |
| `loadDump` | `loadDump(sqlPath: string): Promise<void>` | Run the statements of a schema dump. |
| `forceUnlock` | `forceUnlock(): Promise<boolean>` | Clear a stale lock. |

### `Schema` and `TableBuilder`

| Builder | Members |
|---|---|
| `Schema` | `createTable`, `createTableIfNotExists`, `createTableLike`, `alterTable` / `table`, `renameTable`, `dropTable`, `dropTableIfExists`, `hasTable`, `hasColumn`, `createIndex`, `dropIndex`, `createView`, `createViewOrReplace`, `alterView`, `renameView`, `dropView`, `dropViewIfExists`, `createMaterializedView`, `refreshMaterializedView`, `dropMaterializedView`, `dropMaterializedViewIfExists`, `createSchema`, `createSchemaIfNotExists`, `dropSchema`, `dropSchemaIfExists`, `withSchema`, `raw`, `toSQL`, `reset` |
| `TableBuilder` columns | `increments`, `bigIncrements`, `id`, `integer`, `bigInteger`, `smallint`, `tinyint`, `mediumint`, `float`, `double`, `decimal`, `boolean`, `string`, `text`, `binary`, `uuid`, `enum`, `json`, `jsonb`, `date`, `time`, `dateTime`, `timestamp`, `timestamptz`, `timestamps`, `specificType` |
| `TableBuilder` keys and constraints | `primary`, `unique`, `uniqueIndex`, `index`, `foreign`, `check`, `checkBetween`, `checkIn`, `checkNotIn`, `checkLength`, `checkPositive`, `checkNegative`, `checkRegex` |
| `TableBuilder` alterations | `renameColumn`, `dropColumn`, `dropColumns`, `dropPrimary`, `dropUnique`, `dropIndex`, `dropForeign`, `dropChecks`, `dropTimestamps`, `setNullable`, `dropNullable`, `engine`, `charset`, `collate`, `comment` |
| `ColumnBuilder` | `notNullable`, `nullable`, `defaultTo`, `unsigned`, `primary`, `unique`, `index`, `references`, `inTable`, `onDelete`, `onUpdate`, `comment`, `first`, `after`, `alter`, `check*` |

## Configuration

`config/database.ts`, read under the `database` key.

| Option | Type | Default | Description |
|---|---|---|---|
| `connection` | `string` | `'primary'` | The default connection when `connections` is set (`default` is accepted as an older alias). |
| `connections` | `Record<string, ConnectionConfig>` | — | Named connections. |
| `verifySchema` | `{ entities; mode?: 'throw' \| 'warn' }` | unset | Compare these models with the live schema after boot; `throw` by default. |
| `prettyPrintDebugQueries` | `boolean` | `false` | Print each statement of a `debug` connection. |
| `<connection>.url` / `.connection` | `string` | — | `sqlite:data/app.db`, `postgres://…`, `mysql://…`. `url` wins. |
| `<connection>.pool` | `{ min?: number; max?: number }` | `{ min: 1, max: 10 }` | Pool size (`poolMin` / `poolMax` are accepted too). |
| `<connection>.debug` | `boolean` | `false` | Emit a `db:query` event per statement. |
| `<connection>.pragmas` | `Record<string, string \| number>` | — | SQLite pragmas, such as `SQLITE_PROD_PRAGMAS`. |
| `<connection>.connectRetries` | `number` | `0` | Extra attempts of the first connection. |
| `<connection>.connectBackoffMs` | `number` | `200` | Base of the exponential backoff, capped at 30 s. |
| `<connection>.connectTimeoutMs` | `number` | — | Per-attempt acquire timeout. |
| `<connection>.migrations.paths` | `string[]` | `['database/migrations']` | Migration directories. |
| `<connection>.migrations.tableName` | `string` | `'ream_migrations'` | Tracking table; a plain identifier. |
| `<connection>.migrations.disableRollbacksInProduction` | `boolean` | `true` | Refuse rollback, reset, refresh, fresh and wipe in production without `--force`. |
| `<connection>.migrations.autoRun` | `boolean` | `false` | Run pending migrations at boot; ignored in development. |
| `<connection>.migrations.naturalSort` | `boolean` | `false` | Sort `2_x` before `10_x`. |
| `<connection>.migrations.disableTransactions` | `boolean` | `false` | Run every migration outside a transaction. |
| `<connection>.seeders.paths` | `string[]` | `['database/seeders']` | Seeder directory (the first is used). |
| `<connection>.seeders.naturalSort` | `boolean` | `false` | |
| `<connection>.factories.path` | `string` | `'database/factories'` | Where `make:factory` writes. |
| `<connection>.schemaGeneration` | `SchemaGenerateOptions` | — | `outputPath` and options of `schema:generate`. |

## Container bindings

| Token | Resolves to |
|---|---|
| `'atlas.db'` / `'db'` | The default `AsyncDatabaseConnection` |
| `'atlas.db.connection'` / `'db.connection'` | The same connection |
| `'atlas.db:<name>'` / `'db:<name>'` | A named connection |

All are typed on `ContainerBindings` once `@c9up/atlas` is imported.

## Errors

Each code is a class of the `errors` namespace (`import { errors } from '@c9up/atlas'`) and a `@c9up/flare` `Exception`: branch on `error.code` or on `error instanceof errors.E_…`. The status is 500, except `E_ROW_NOT_FOUND` (404); `help`, when set, says how to fix the cause. The Rust query compiler's and driver's refusals (`E_UNSAFE_*`, `E_INJECTION_PATTERN`, `E_UNSUPPORTED`, `E_ATLAS_INSECURE_SSLMODE`…) are rethrown as their class too, with the native error as `cause`. Every compiler refusal carries a code, a malformed spec (`E_ATLAS_INVALID_SPEC`) and a compiler panic (`E_ATLAS_INTERNAL`) included. See [Error handling](/en/guides/database/orm/error-handling) for the classes that carry data.

| Code | Raised when |
|---|---|
| [`E_ROW_NOT_FOUND`](/en/reference/errors#e-row-not-found) | A query that must return a row found none: `findOrFail`, `findByOrFail`, `refresh`, `fresh`, `firstOrFail()`, `sole()`. |
| [`E_MASS_ASSIGNMENT`](/en/reference/errors#e-mass-assignment) | `fill()` / `merge()` (and `create`, `createMany`, `updateOrCreate`) set an attribute outside `fillable`, or listed in `guarded`. |
| [`E_EXTRA_PROPERTIES`](/en/reference/errors#e-extra-properties) | `fill()` / `merge()`, or `updateOrCreate` / `updateOrCreateMany` on a found row, named a property that is not a declared column. |
| [`E_UNKNOWN_COLUMN`](/en/reference/errors#e-unknown-column) | A value was assigned to a key that is not a column. Pass `{ allowExtraProperties: true }` to keep unknown keys in `$extras`. |
| [`E_INVALID_COLUMN`](/en/reference/errors#e-invalid-column) | A query names a column the entity does not declare. |
| [`E_INVALID_FIND_VALUE`](/en/reference/errors#e-invalid-find-value) | `find()` was called without a usable primary key value. |
| [`E_MODEL_NOT_PERSISTED`](/en/reference/errors#e-model-not-persisted) | An operation that needs a stored row (`delete()`, `refresh()`, `load*()`…) ran on a local instance. |
| [`E_MISSING_PRIMARY_KEY`](/en/reference/errors#e-missing-primary-key) | The same operation ran on a persisted projection that holds no primary key. |
| [`E_MODEL_DELETED`](/en/reference/errors#e-model-deleted) | `save()` was called on a deleted instance. |
| [`E_MISSING_OWNER_KEY`](/en/reference/errors#e-missing-owner-key) | `associate()` was given a parent whose key is not set. |
| [`E_RELATION_NOT_LOADED`](/en/reference/errors#e-relation-not-loaded) | A relation was read before it was loaded. Call `.preload()` on the query or `.load()` on the instance. |
| [`E_OPTIMISTIC_LOCK`](/en/reference/errors#e-optimistic-lock) | A save lost an optimistic lock: another transaction modified the row since it was read. |
| [`E_STRICT_MODE`](/en/reference/errors#e-strict-mode) | Raw SQL refused by strict mode (a repository's `raw()`, a `db.raw()` value written by a repository, or `whereRaw()` / `havingRaw()` / `joinRaw()` on a model query). |
| [`E_NO_INTERACTIVE_TRANSACTION`](/en/reference/errors#e-no-interactive-transaction) | The connection has no interactive `transaction()` (a model transaction, or `useTransaction()` in tests). |
| [`E_ARRAY_PARAM`](/en/reference/errors#e-array-param) | A list was bound to a single placeholder. Expand it into one placeholder per element. |
| [`E_UNMANAGED_DB_CONNECTION`](/en/reference/errors#e-unmanaged-db-connection) | A connection name that is not registered: a model's `static connection`, `db.connection(name)`, a factory's `connection(name)`, `manager.connect(name)`. |
| [`E_ATLAS_MISSING_CONNECTION`](/en/reference/errors#e-atlas-missing-connection) | No connection to use at all: no default one (atlas has not booted), a `default` the config does not declare, or a repository built without a connection. |
| [`E_ATLAS_EMPTY_SELECT`](/en/reference/errors#e-atlas-empty-select) | `select()` was called with no columns. Provide at least one column name. |
| [`E_ATLAS_INVALID_PAGE`](/en/reference/errors#e-atlas-invalid-page) | `paginate()` was called with `page < 1`. |
| [`E_ATLAS_INVALID_PER_PAGE`](/en/reference/errors#e-atlas-invalid-per-page) | `paginate()` was called with `perPage < 1`. |
| [`E_ATLAS_INVALID_PAGINATION`](/en/reference/errors#e-atlas-invalid-pagination) | A page, page size or row count that is not a finite, non-negative integer. |
| [`E_ATLAS_INVALID_CTE_NAME`](/en/reference/errors#e-atlas-invalid-cte-name) | A CTE name must be a valid identifier (letters, numbers, underscores). |
| [`E_ATLAS_INVALID_OPERATOR`](/en/reference/errors#e-atlas-invalid-operator) | A `where()` or `wherePivot()` operator outside the allowed list. |
| [`E_ATLAS_INVALID_INCREMENT`](/en/reference/errors#e-atlas-invalid-increment) | `increment()` / `decrement()` was given an amount that is not a finite number. |
| [`E_INVALID_DATE_COLUMN_VALUE`](/en/reference/errors#e-invalid-date-column-value) | A date column was given a value that is not a valid date. |
| [`E_ATLAS_UNDEFINED_BINDING`](/en/reference/errors#e-atlas-undefined-binding) | A query value is `undefined`. Validate the input first; use `whereNull()` to match NULL. |
| [`E_ATLAS_DIALECT_MISMATCH`](/en/reference/errors#e-atlas-dialect-mismatch) | `useTransaction(trx)` was given a transaction of another dialect than the query was built for. Start the transaction on the query's connection, or build the query from the transaction. |
| [`E_ATLAS_RAW_BINDINGS`](/en/reference/errors#e-atlas-raw-bindings) | A raw fragment's placeholders and bindings do not match: a placeholder with no binding, a binding no placeholder uses, `?` mixed with `$N` or with named bindings, or a `??` binding that is not a string. |
| [`E_ATLAS_RAW_VALUE`](/en/reference/errors#e-atlas-raw-value) | A `db.raw()` was used where it cannot go: `defaultTo(db.raw())` with bindings, or a raw value compared with an operator that takes none (`IS NULL`, `BETWEEN`). |
| [`E_ATLAS_NON_FINITE_NUMBER`](/en/reference/errors#e-atlas-non-finite-number) | `defaultTo()` was given a number that is not a SQL number (`NaN`, `Infinity`). |
| [`E_ATLAS_FACTORY_FAKER_MISSING`](/en/reference/errors#e-atlas-factory-faker-missing) | A factory uses faker, an optional peer of atlas that is not installed. |
| [`E_ATLAS_NAPI_NOT_FOUND`](/en/reference/errors#e-atlas-napi-not-found) | The Rust query compiler is not loaded. The message names the platform package to install; `cause` holds the load failure. See [Troubleshooting](/en/guides/database/orm/troubleshooting). |
| [`E_ATLAS_INSECURE_SSLMODE`](/en/reference/errors#e-atlas-insecure-sslmode) | The connection asks for `sslmode=prefer` or `allow` (URL or `PGSSLMODE`), which fall back to plaintext without saying so. Use `disable` or `verify-full`. See [Encrypted connections](/en/guides/database/orm/connections#encrypted-connections-tls). |
| [`E_ATLAS_LISTEN_UNSUPPORTED`](/en/reference/errors#e-atlas-listen-unsupported) | LISTEN / NOTIFY was used on a connection that is not PostgreSQL. |
| [`E_ATLAS_LISTEN_CONNECT`](/en/reference/errors#e-atlas-listen-connect) | The listener could not open its own PostgreSQL connection. |
| [`E_ATLAS_LISTEN_CONNECTION`](/en/reference/errors#e-atlas-listen-connection) | The listener's connection failed; every subscription is told. |
| [`E_ATLAS_LISTEN_CHANNEL`](/en/reference/errors#e-atlas-listen-channel) | A LISTEN channel name is empty, longer than 63 bytes, or holds a NUL. |
| [`E_ATLAS_LISTEN_CLOSED`](/en/reference/errors#e-atlas-listen-closed) | The listener was closed while a request was pending. |
| [`E_ATLAS_LISTEN_EVENT`](/en/reference/errors#e-atlas-listen-event) | The native listener reported an event atlas does not define. |
| [`E_ATLAS_MIGRATION_INVALID_TABLE_NAME`](/en/reference/errors#e-atlas-migration-invalid-table-name) | `migrations.tableName` is not a plain identifier. |
| [`E_MISSING_SCHEMA_FILES`](/en/reference/errors#e-missing-schema-files) | A migration recorded as applied has no file in the migrations directory, so it cannot be rolled back. |
| [`E_ATLAS_MIGRATION_INVALID`](/en/reference/errors#e-atlas-migration-invalid) | A migration file does not default-export a class. |
| [`E_ATLAS_MIGRATION_DUPLICATE`](/en/reference/errors#e-atlas-migration-duplicate) | Two migration files share a name. |
| [`E_ATLAS_MIGRATION_COMPILE_EMPTY`](/en/reference/errors#e-atlas-migration-compile-empty) | A migration compiled to no SQL statement. |
| [`E_UNABLE_ACQUIRE_LOCK`](/en/reference/errors#e-unable-acquire-lock) | Another run holds the migration lock. Wait for it, or clear a stale lock with `migration:unlock`. |
| [`E_UNABLE_RELEASE_LOCK`](/en/reference/errors#e-unable-release-lock) | The run succeeded, but its migration lock had been cleared under it (`migration:unlock` during the run), so another run may have migrated at the same time. |
| [`E_ROLLBACK_DISABLED_IN_PRODUCTION`](/en/reference/errors#e-rollback-disabled-in-production) | A rollback, reset, refresh, fresh or wipe in production without `--force`. |
| [`E_ATLAS_DRY_RUN_WRITE`](/en/reference/errors#e-atlas-dry-run-write) | A migration tried to write while running under `dryRun()`. |
| [`E_DEFER_REQUIRES_TRANSACTION`](/en/reference/errors#e-defer-requires-transaction) | A migration uses `this.defer()` on an adapter without an interactive `transaction()`. |
| [`E_MYSQL_FK_REQUIRES_TRANSACTION`](/en/reference/errors#e-mysql-fk-requires-transaction) | Suspending MySQL foreign-key checks needs an interactive `transaction()` to restore them. |
| [`E_SCHEMA_DUMP_DIALECT_MISMATCH`](/en/reference/errors#e-schema-dump-dialect-mismatch) | The schema dump was made for another dialect. |
| [`E_SCHEMA_DUMP_TABLE_MISMATCH`](/en/reference/errors#e-schema-dump-table-mismatch) | The schema dump uses another migrations tracking table. |
| [`E_SEEDER_DIR_NOT_FOUND`](/en/reference/errors#e-seeder-dir-not-found) | The seeders directory does not exist. |
| [`E_SEEDER_INVALID`](/en/reference/errors#e-seeder-invalid) | A seeder file does not export a seeder class. |
| [`E_SEEDER_INVALID_PATH`](/en/reference/errors#e-seeder-invalid-path) | A seeder path resolves outside the seeders directory. |
| [`E_NO_CONNECTION`](/en/reference/errors#e-no-connection) | `schema.<method>()` needs a live connection; it is available inside a migration, not on a standalone `Schema`. |
| [`E_ALTER_EMPTY`](/en/reference/errors#e-alter-empty) | `schema.alterTable()` declared no operation. |
| [`E_ATLAS_EMPTY_TABLE`](/en/reference/errors#e-atlas-empty-table) | `schema.createTable()` declared no column. |
| [`E_ALTER_MISUSE`](/en/reference/errors#e-alter-misuse) | `.alter()` does not follow a column definition, or an alter-only method was used on a new table. |
| [`E_CHECK_EMPTY`](/en/reference/errors#e-check-empty) | A check constraint (or `checkBetween`) was given no value or interval. |
| [`E_CHECK_RANGE`](/en/reference/errors#e-check-range) | `checkBetween` was given an interval that is not `[min, max]`. |
| [`E_CONSTRAINT_EMPTY`](/en/reference/errors#e-constraint-empty) | A constraint lists no columns. |
| [`E_ENUM_EMPTY`](/en/reference/errors#e-enum-empty) | An enum column declares no values. |
| [`E_EMPTY_VIEW_SELECT`](/en/reference/errors#e-empty-view-select) | A view has no SELECT, or a materialized view was asked of a dialect that has none. |
| [`E_SPECIFIC_TYPE_EMPTY`](/en/reference/errors#e-specific-type-empty) | `specificType()` was given an empty type. |
| [`E_SQLITE_DECIMAL_PRECISION`](/en/reference/errors#e-sqlite-decimal-precision) | A decimal precision SQLite cannot store exactly. |
| [`E_UNSUPPORTED`](/en/reference/errors#e-unsupported) | A SQL feature the connection's dialect does not have (`DISTINCT ON` off Postgres, `UNION ALL` variants on SQLite, advisory locks on SQLite, an upsert of a row with no column on SQLite, `onConflict().merge()` with no column on Postgres…). |
| [`E_UNSAFE_IDENTIFIER`](/en/reference/errors#e-unsafe-identifier) | An identifier is not a plain name: refused by atlas's own checks or by the Rust compiler. |
| [`E_UNSAFE_SQL`](/en/reference/errors#e-unsafe-sql) | The Rust compiler refused a SQL fragment, or a keyword outside its allowed list (set operation, ORDER BY direction, lock mode, referential action…). |
| [`E_UNSAFE_EXPRESSION`](/en/reference/errors#e-unsafe-expression) | The Rust compiler refused an expression. |
| [`E_UNSAFE_LITERAL`](/en/reference/errors#e-unsafe-literal) | The Rust compiler refused a literal value. |
| [`E_INJECTION_PATTERN`](/en/reference/errors#e-injection-pattern) | The Rust compiler refused an input that looks like an injection attempt. |
| [`E_ATLAS_INVALID_SPEC`](/en/reference/errors#e-atlas-invalid-spec) | The statement the Rust compiler received is malformed: a clause misses a field, a field has the wrong shape, or the spec does not parse. Atlas builds every spec itself, so this points at an atlas bug or at a spec built by hand. |
| [`E_ATLAS_EMPTY_INSERT`](/en/reference/errors#e-atlas-empty-insert) | An INSERT or an upsert has no row (`insert([])`, `multiInsert([])`), or has several rows that set no column. |
| [`E_UNSUPPORTED_CLIENT`](/en/reference/errors#e-unsupported-client) | The connection names a dialect atlas does not know. Atlas compiles for `sqlite`, `postgres` (or `postgresql`) and `mysql` (or `mariadb`). |
| [`E_ATLAS_FACTORY_INVALID`](/en/reference/errors#e-atlas-factory-invalid) | `make:factory` was given a name that is not a safe file name. |
| [`E_ATLAS_SEEDER_INVALID`](/en/reference/errors#e-atlas-seeder-invalid) | `make:seeder` was given a name that is not a safe file name. |
| [`E_ATLAS_NO_URL`](/en/reference/errors#e-atlas-no-url) | A connection config has no `url` (or `connection`), or the database config has neither a top-level `url` nor `connections`. |
| [`E_ATLAS_NOT_BOOTED`](/en/reference/errors#e-atlas-not-booted) | The `db` service (`@c9up/atlas/services/db`) was used before `AtlasProvider.boot()` ran. |
| [`E_ATLAS_CONNECTION_UNAVAILABLE`](/en/reference/errors#e-atlas-connection-unavailable) | A container connection token was resolved before boot opened it, or after shutdown closed it. |
| [`E_ATLAS_BOOT_FAILED`](/en/reference/errors#e-atlas-boot-failed) | `AtlasProvider.boot()` could not open one or more configured connections; `cause` holds the first failure. |
| [`E_ATLAS_READ_ONLY`](/en/reference/errors#e-atlas-read-only) | A write ran on a query builder scoped to a connection opened with `{ mode: 'read' }`. |
| [`E_ATLAS_INVALID_PRAGMA`](/en/reference/errors#e-atlas-invalid-pragma) | A SQLite pragma key or value is outside `[A-Za-z0-9_]`. |
| [`E_ATLAS_DB_DRIVER_NOT_FOUND`](/en/reference/errors#e-atlas-db-driver-not-found) | The Rust database driver could not be loaded, or the loaded binary is stale. The message names the platform package to install; `cause` holds the load failure. |
| [`E_ATLAS_NO_REPOSITORY`](/en/reference/errors#e-atlas-no-repository) | `refresh()`, `fresh()`, `load()`, `loadCount()`, `loadAggregate()` or `related()` was called on an entity no repository hydrated. |
| [`E_ATLAS_FILLABLE_AND_GUARDED`](/en/reference/errors#e-atlas-fillable-and-guarded) | A model declares both `static fillable` and `static guarded`. |
| [`E_ATLAS_INVALID_ENTITY_CLASS`](/en/reference/errors#e-atlas-invalid-entity-class) | A relation's target (or through model) does not resolve to a `BaseEntity` subclass. |
| [`E_ATLAS_INVALID_HOOK`](/en/reference/errors#e-atlas-invalid-hook) | A hook decorator is not on a static method, or `addHook()` was given something other than a function. |
| [`E_ATLAS_INVALID_DECORATOR`](/en/reference/errors#e-atlas-invalid-decorator) | A date column decorator was applied to something other than a class property. |
| [`E_UNDEFINED_RELATIONSHIP`](/en/reference/errors#e-undefined-relationship) | A relation name the model does not declare (`load()`, `withCount()`, `whereHas()`…). |
| [`E_ATLAS_INVALID_RELATION`](/en/reference/errors#e-atlas-invalid-relation) | Relation metadata lacks what its kind needs: a `@ManyToMany` without pivot options, a through relation without a through model. |
| [`E_ATLAS_RELATION_UNSUPPORTED_OPERATION`](/en/reference/errors#e-atlas-relation-unsupported-operation) | `related()` was asked for an operation its relation does not have: a write on `@BelongsTo` other than `associate()` / `dissociate()`, a write on a read-only through relation, a bulk write on `@HasOne`. |
| [`E_ATLAS_ASSOCIATE_NULL`](/en/reference/errors#e-atlas-associate-null) | `associate()` was given `null` or `undefined`; use `dissociate()`. |
| [`E_ATLAS_PIVOT_KEY_COLLISION`](/en/reference/errors#e-atlas-pivot-key-collision) | `attach()` / `sync()` extras name a pivot key column or a pivot timestamp column. |
| [`E_ATLAS_COLUMN_ADAPTER`](/en/reference/errors#e-atlas-column-adapter) | A `@Column` `prepare` / `consume` adapter threw (`cause` holds its error) or returned a Promise. |
| [`E_ATLAS_HAS_ONE_MULTIPLE_ROWS`](/en/reference/errors#e-atlas-has-one-multiple-rows) | A `@HasOne` preload found more than one related row for a parent. |
| [`E_ATLAS_THROUGH_KEY_NOT_UNIQUE`](/en/reference/errors#e-atlas-through-key-not-unique) | A through relation's `secondLocalKey` maps to several parents. |
| [`E_ATLAS_MULTIPLE_ROWS`](/en/reference/errors#e-atlas-multiple-rows) | `sole()` matched more than one row. |
| [`E_ATLAS_SUBQUERY_ALIAS`](/en/reference/errors#e-atlas-subquery-alias) | `select()` was given a subquery not named with `.as()`. |
| [`E_ATLAS_INVALID_ALIAS`](/en/reference/errors#e-atlas-invalid-alias) | An alias is not a bare identifier. |
| [`E_ATLAS_INVALID_EXPRESSION`](/en/reference/errors#e-atlas-invalid-expression) | A `whereExpr()` extra expression is not a tail of arithmetic: it holds a comment or another forbidden character, unbalanced parentheses, a SQL keyword, or a function outside the allowed list. |
| [`E_ATLAS_INVALID_JSON_PATH`](/en/reference/errors#e-atlas-invalid-json-path) | A `whereJsonPath()` path does not start with `$`. |
| [`E_ATLAS_INVALID_GROUP_LIMIT`](/en/reference/errors#e-atlas-invalid-group-limit) | `groupLimit()` was given a value that is not a non-negative integer. |
| [`E_ATLAS_INVALID_LOCK`](/en/reference/errors#e-atlas-invalid-lock) | `skipLocked()` / `noWait()` was used without a base row lock. |
| [`E_ATLAS_INVALID_COMMENT`](/en/reference/errors#e-atlas-invalid-comment) | `comment()` text contains `*/`. |
| [`E_ATLAS_INVALID_JOIN`](/en/reference/errors#e-atlas-invalid-join) | A string-form `join()` is missing its right operand. |
| [`E_ATLAS_INVALID_AGGREGATE`](/en/reference/errors#e-atlas-invalid-aggregate) | A `withAggregate()` callback set no aggregate. |
| [`E_ATLAS_INVALID_PLUCK`](/en/reference/errors#e-atlas-invalid-pluck) | `pluck()` read a column whose value is an object or a relation. |
| [`E_ATLAS_UNKNOWN_SCOPE`](/en/reference/errors#e-atlas-unknown-scope) | `apply()` reached a scope the model does not declare, or a model with no `static scopes`. |
| [`E_ATLAS_CURSOR_ORDER_REQUIRED`](/en/reference/errors#e-atlas-cursor-order-required) | `cursorPaginate()` was called without an order column. |
| [`E_ATLAS_INVALID_CURSOR`](/en/reference/errors#e-atlas-invalid-cursor) | A `cursorPaginate()` cursor does not decode, or its tuple length does not match the order columns. |
| [`E_ATLAS_EMPTY_UPDATE`](/en/reference/errors#e-atlas-empty-update) | An update was given an empty payload: a model query's `update()`, or an UPDATE with no SET assignment that reached the compiler. |
| [`E_ATLAS_QUERY_TIMEOUT`](/en/reference/errors#e-atlas-query-timeout) | A query ran longer than its `timeout(ms)`. |
| [`E_ATLAS_COMPILE_EMPTY`](/en/reference/errors#e-atlas-compile-empty) | The query compiler returned no statement. |
| [`E_ATLAS_SCHEMA_MISMATCH`](/en/reference/errors#e-atlas-schema-mismatch) | `verifySchema()` in `throw` mode found drift between the models and the database; the message lists the findings. |
| [`E_ATLAS_SCHEMA_DUMP_MANIFEST`](/en/reference/errors#e-atlas-schema-dump-manifest) | A schema-dump manifest (`.meta.json`) is not version 1 with a `schemaTableName`. |
| [`E_ATLAS_SCHEMA_DUMP_SEQUENCE`](/en/reference/errors#e-atlas-schema-dump-sequence) | `schema:dump` read a sequence parameter from the catalog that is not an integer. |
| [`E_ATLAS_SCHEMA_DUMP_PRUNE`](/en/reference/errors#e-atlas-schema-dump-prune) | `schema:dump --prune` ran without a `migrationsDir`. |
| [`E_ATLAS_SCHEMA_GENERATE_IDENTIFIER`](/en/reference/errors#e-atlas-schema-generate-identifier) | `schema:generate` read a table or column name that does not make a TypeScript identifier. |
| [`E_ATLAS_DB_ASSERTION`](/en/reference/errors#e-atlas-db-assertion) | A database assertion (`assertHas`, `assertMissing`, `assertCount`, `assertEmpty`) does not hold. |
| [`E_ATLAS_FACTORY_NO_CONNECTION`](/en/reference/errors#e-atlas-factory-no-connection) | A factory's `create()` has no connection: none passed and none bound with `.client()` / `.connection()`. |
| [`E_ATLAS_FACTORY_STATE`](/en/reference/errors#e-atlas-factory-state) | A factory state is not defined. |
| [`E_ATLAS_FACTORY_UNKNOWN_RELATION`](/en/reference/errors#e-atlas-factory-unknown-relation) | A factory's `with()` names a relation the model does not declare, or one with no related factory. |
| [`E_ATLAS_FACTORY_PIVOT_LENGTH`](/en/reference/errors#e-atlas-factory-pivot-length) | A factory's `pivotAttributes` array length differs from the related-row count. |
| [`E_ATLAS_FACTORY_UNSUPPORTED_RELATION`](/en/reference/errors#e-atlas-factory-unsupported-relation) | A factory's `with()` names a relation kind it cannot build (a through relation). |
| [`E_ATLAS_SEEDER_DIR_REQUIRED`](/en/reference/errors#e-atlas-seeder-dir-required) | `testUtils().db().seed()` ran without a `seedersDir`. |
| [`E_ATLAS_INTERNAL`](/en/reference/errors#e-atlas-internal) | An invariant inside atlas broke, or the Rust compiler panicked or could not serialize what it compiled: always a bug in atlas itself. |

## Migration

- `AtlasError` is gone: test `error.code`, or `error instanceof errors.E_…` with `import { errors } from '@c9up/atlas'`. Its `hint` is now `help`.
- `EntityNotFoundError` becomes `errors.E_ROW_NOT_FOUND`, `MassAssignmentError` becomes `errors.E_MASS_ASSIGNMENT`, `OptimisticLockError` becomes `errors.E_OPTIMISTIC_LOCK` and `RelationNotLoadedError` becomes `errors.E_RELATION_NOT_LOADED`; their fields are unchanged, except those of `E_ROW_NOT_FOUND` (below).
- A Rust compiler refusal (`E_UNSAFE_*`, `E_INJECTION_PATTERN`, `E_UNSUPPORTED`…) now carries its code in `error.code`; its message no longer starts with the code, so match `error.code` instead of the message.
- `error.name` is now the class name (`Exception` for most codes), not `AtlasError`.
- `insert({})` now inserts a row of defaults. It used to resolve `[]` without running anything. A model saved with nothing set now inserts its row too: it used to be marked persisted with no row in the table.
- `insert([])` and `multiInsert([])` now fail with `E_ATLAS_EMPTY_INSERT`. They used to resolve `[]`.
- `E_ATLAS_INVALID_DATE_COLUMN_VALUE` is now `E_INVALID_DATE_COLUMN_VALUE`, `E_ATLAS_UNKNOWN_RELATION` is now `E_UNDEFINED_RELATIONSHIP`, `E_MIGRATION_LOCKED` is now `E_UNABLE_ACQUIRE_LOCK` and `E_ATLAS_MIGRATION_NOT_FOUND` is now `E_MISSING_SCHEMA_FILES`.
- A connection name that is not registered is now `E_UNMANAGED_DB_CONNECTION` ("Cannot connect to unregistered connection `<name>`"); `E_ATLAS_MISSING_CONNECTION` stays for a missing default connection and a repository built without one.
- `E_ROW_NOT_FOUND` carries the model class on `model` (it was the class name on `entityClass`), and its message is always "Row not found": the lookup criteria stay on `criteria` and never reach the message, which an exception handler sends to the client.
- `E_MODEL_DELETED` reads "Cannot mutate delete model instance", and a successful migration run whose lock was cleared under it now fails with `E_UNABLE_RELEASE_LOCK`.
- `whereExpr()`'s extra expression must now be a tail of arithmetic that starts with `+`, `-`, `*` or `/`. A comment (`--`, `/*`, `*/`), `current_date` and the like, a qualified name or a fragment that opens with a parenthesis is refused with `E_ATLAS_INVALID_EXPRESSION`; use `whereRaw()` with bindings instead.
- A `select()` / `having()` expression is now parsed against a grammar. `IS DISTINCT FROM`, a row constructor `(a, b)`, `WITHIN GROUP`, `exists(…)`, a cast to an unlisted type and a bare `current_user` / `session_user` are refused with `E_UNSAFE_EXPRESSION`; give `select()` or `having()` a `db.raw()` fragment for those, and write `"current_user"` quoted for a column of that name.
- On `db.from()`, `count()`, `sum()`, `avg()`, `min()`, `max()` and their `Distinct` forms now refuse anything but a column or `*` with `E_UNSAFE_IDENTIFIER`; move an expression to `select('sum(price * quantity) as total')`.
- `groupBy()` on `db.from()` and on `QueryBuilder` now refuses a value that is not a column name with `E_UNSAFE_IDENTIFIER`. An object `{ raw: '…' }` used to be compiled as SQL; call `groupByRaw(sql, bindings)` or pass `db.raw(sql, bindings)` instead.
- The constraint a relation adds (the key of `related().query()`, the correlation of `whereHas()` / `withCount()` / `withAggregate()`, the parent keys of a preload) and the `@SoftDeletes` filter are now ANDed with your clauses taken as one group. `where(a).orWhere(b)` on such a query used to return, update and delete rows of other parents, and deleted rows; it now stays inside the relation and the live rows. Queries without `orWhere()` are unchanged.
- `update()`, `delete()`, `increment()` and `decrement()` on a many-to-many `related().query()` now change only the related rows linked to the parent. They used to ignore the pivot and reach every row of the related table.
- `clearWhere()` on a `related().query()` now keeps the relation's key; it used to drop it and return the rows of every parent.
- `whereHas()`, `withCount()` and `withAggregate()` on a `@SoftDeletes` related model now leave the deleted rows out; call `withTrashed()` in the callback to count them.
- Bulk `restore()` now applies the repository scope and the key of a `related().query()`; it used to restore matching rows of every tenant.
- `updateOrCreate()`, `updateOrCreateMany()` and `related().updateOrCreate()` now apply the payload of a found row with `merge()`: a key that is not a declared property or its column name throws `E_EXTRA_PROPERTIES` (it used to be written, `{ IsAdmin: 1 }` past `guarded`, `{ Id: … }` onto the primary key). Pass `{ allowExtraProperties: true }` to keep such keys in `$extras`; on the new-row branch an unknown key throws `E_UNKNOWN_COLUMN`, as `create()` does.
- `upsert()` on a repository with a `scope` no longer updates a conflicting row outside the scope (PostgreSQL, SQLite: that row is left as it is). On MySQL an `upsert()` with `updateColumns` on such a repository now fails with `E_UNSUPPORTED`; check that the rows belong to the tenant, then upsert through an unscoped repository.
- `cursorPaginate()` now fires `beforeFetch` on its query and `afterFetch` on the page's items; `exists()` and `doesntExist()` now fire `beforeFind`. A filter a hook adds now applies to them.
- `db:seed` without `--environment` now gates `static environment` on the application's environment, else `REAM_ENV` / `NODE_ENV` through the alias table (production when either says so). With neither variable set, a seeder that lists environments no longer runs; set `NODE_ENV` or pass `--environment`. `prod`, `dev` and `test` now match `production`, `development` and `testing` in the list.
- With `migrations.disableRollbacksInProduction: false`, `db:wipe`, `migration:fresh`, `migration:rollback`, `migration:reset` and `migration:refresh` now ask for confirmation in production; without an answer (a non-interactive run) they do nothing. Pass `--force` in a deploy script.
- `save()` now writes declared columns only; an undeclared property set on the instance is no longer turned into a column name.
- A `beforeFind`, `beforeFetch` or `beforePaginate` hook now receives the query with the caller's clauses closed into one group (`wrapExisting()`), so a filter it adds guards every `orWhere()` branch.

## See also

- [ORM introduction](/en/guides/database/orm/)
- [Entities](/en/guides/database/orm/entities)
- [Query builder](/en/guides/database/orm/query-builder)
- [Repositories](/en/guides/database/orm/repositories)
- [Relations](/en/guides/database/orm/relations)
- [Migrations](/en/guides/database/orm/migrations)
- [Schema builder](/en/guides/database/orm/schema-builder)
- [Seeders](/en/guides/database/orm/seeders)
- [Factories](/en/guides/database/orm/factories)
- [Transactions and locks](/en/guides/database/orm/transactions-and-locks)
- [SQL security](/en/guides/database/orm/security)
- [Database commands](/en/guides/command-line/database)
