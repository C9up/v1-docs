# atlas

`@c9up/atlas` : l'ORM : entités et modèles, repositories, un query builder compilé en SQL par un moteur Rust, migrations, schema builder, seeders, factories et aides de test, sur PostgreSQL, MySQL et SQLite. Guide : [ORM](/fr/guides/database/orm/).

## Installation

```bash
pnpm add @c9up/atlas
```

`ream configure @c9up/atlas` enregistre le provider et les commandes de `@c9up/atlas/commands`, écrit `config/database.ts` et ajoute `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USER` et `DB_PASSWORD` au `.env`. Les factories qui utilisent faker demandent `@faker-js/faker` ; le plugin de test `db()` demande `@c9up/helix` (deux pairs facultatifs).

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/atlas` | Tout ce qui suit sauf les services : modèles, repositories, requêtes, décorateurs, schéma et migrations, seeders, factories, aides de test, commandes, événements, erreurs |
| `@c9up/atlas/provider` | `AtlasProvider` (export par défaut) |
| `@c9up/atlas/services/db` | `db` (export par défaut), le registre des connexions et `createDbService` |
| `@c9up/atlas/orm` | `BaseEntity`, `BaseModel`, `BaseRepository`, les décorateurs d'entité et les hooks |
| `@c9up/atlas/schema` | `Migration` (aussi sous `BaseSchema`), `Schema`, `TableBuilder`, `ColumnBuilder`, `ForeignKeyBuilder`, `AlterViewBuilder`, `SchemaDumper`, `RawSql` |
| `@c9up/atlas/factories` | `factory`, `Factory`, `FactoryBuilder`, `makeFactoryCommand` |
| `@c9up/atlas/seeders` | `BaseSeeder`, `Seeder`, `runSeeders`, `runSeederDirectory`, `dbSeedCommand`, `makeSeederCommand` |
| `@c9up/atlas/testing` | `useTransaction`, `truncateAll`, `testUtils`, `createDbAssertions`, `db` (plugin helix), `Database`, `factory` |
| `@c9up/atlas/types/relations` | Les types de propriété de relation `HasOne`, `BelongsTo`, `HasMany`, `ManyToMany`, `HasOneThrough`, `HasManyThrough` |
| `@c9up/atlas/commands` | Le chargeur de commandes : `getMetaData`, `getCommand`, `primaryConnectionName` |
| `@c9up/atlas/configure` | `configure(codemods)`, lancé par `ream configure` |

## Exports

### `@c9up/atlas`

**Modèles et repositories**

| Export | Nature | Description |
|---|---|---|
| `BaseModel` | classe | Base active record : recherches et écritures statiques sur la connexion du modèle, `save()` / `delete()` sur l'instance. |
| `BaseEntity` | classe | Base d'une entité : suivi des modifications, remplissage et fusion, relations, sérialisation, événements de domaine. |
| `BaseRepository` | classe | Accès data mapper à une classe d'entité sur une connexion donnée. |
| `ModelQuery` | classe | La requête que construit un modèle ou un repository ; rend des instances d'entité. |
| `Paginator` | classe | Une page de résultats : `items`, `meta` (`total`, `perPage`, `currentPage`, `lastPage`, `firstPage`), aides d'URL. |
| `setAtlasStrictMode` | fonction | `setAtlasStrictMode(enabled: boolean): void` : les points d'entrée SQL bruts (`whereRaw`, `joinRaw`…) lèvent une erreur dans le code de l'application. |
| `isAtlasStrictMode` | fonction | `isAtlasStrictMode(): boolean`. |
| `DomainEvent` | type | Un événement enregistré par une entité, diffusé après sa sauvegarde. |
| `CreateOptions` | interface | `{ quiet?: boolean; allowExtraProperties?: boolean }`. |
| `RepositoryOptions` | interface | `{ dialect?: AtlasDialect; scope?: QueryScope }`. |
| `DatabaseConnection` | interface | Ce sur quoi tourne un repository : `dialect?`, `execute`, `query`, `transaction?`. |
| `QueryScope` | type | `(query: ModelQuery<BaseEntity>, table: string) => void`. |
| `ScopedPivot` | interface | Contraintes de pivot d'une requête many-to-many filtrée. |

**Décorateurs et hooks**

| Export | Nature | Description |
|---|---|---|
| `Entity` | fonction | `Entity(tableName: string): ClassDecorator`. |
| `Column` / `column` | fonction | `column(options?: ColumnOptions)`, avec `column.date(options?)`, `column.dateTime(options?)` et `column.json(options?)`. Les colonnes de date s'hydratent en `DateTime` de chronos. |
| `PrimaryKey` | fonction | `PrimaryKey(options?): PropertyDecorator`. |
| `computed` | fonction | `computed(): MethodDecorator` : un accesseur inclus dans la sérialisation. |
| `BelongsTo` / `HasOne` / `HasMany` / `HasOneThrough` / `HasManyThrough` / `ManyToMany` | fonction | Décorateurs de relation ; les formes en minuscules (`belongsTo`…) sont les mêmes fonctions. |
| `SoftDeletes` | fonction | `SoftDeletes(): ClassDecorator` : `delete()` renseigne `deleted_at` ; les requêtes écartent les lignes supprimées. |
| `hasSoftDeletes` | fonction | `hasSoftDeletes(target): boolean`. |
| `scope` | fonction | Déclare une portée de requête réutilisable sur un modèle. |
| `beforeSave`, `afterSave`, `beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`, `beforeDelete`, `afterDelete`, `beforeFind`, `afterFind`, `beforeFetch`, `afterFetch`, `beforePaginate`, `afterPaginate` | fonction | Décorateurs de hooks de cycle de vie : `(): MethodDecorator`. |
| `addHook` / `removeHook` | fonction | Inscrit ou retire un hook sans décorateur. |
| `getEntityMetadata`, `getColumnMetadata`, `getRelationMetadata`, `getPrimaryKey`, `getDateColumnConfig` | fonction | Lisent ce qu'ont enregistré les décorateurs. |
| `ColumnOptions` | interface | `{ type?; nullable?; default?; columnName?; serializeAs?; serialize?; … }`. |
| `DateTimeColumnOptions` / `DateColumnConfig` | interface | `{ autoCreate?: boolean; autoUpdate?: boolean }` et la configuration enregistrée. |
| `JsonColumnOptions` | interface | `ColumnOptions & { type?: 'json' \| 'jsonb' }` ; `jsonb` par défaut. |
| `ColumnAdapter` | interface | `{ consume(raw): T; prepare(value): unknown }` : convertit une colonne entre la base et l'entité. |
| `ManyToManyOptions` | interface | Table pivot, clés et colonnes de pivot d'une relation many-to-many. |
| `ColumnMetadata` / `EntityMetadata` / `RelationMetadata` | interface | Métadonnées enregistrées. |
| `HookEvent` / `HookHandler` / `HookKind` | type | Noms de hooks et signature d'un handler. |
| `ScopeFn` | type | La fonction d'une portée. |

**Requêtes et connexions**

| Export | Nature | Description |
|---|---|---|
| `QueryBuilder` | classe | Un query builder de table compilé par le moteur Rust : `select`, `where`, `whereIn`, `whereNull`, `whereExists`, `orderBy`, `groupBy`, `having`, `limit`, `offset`, `union`, `with`, `paginate`, `toSQL`. |
| `RawSql` | classe | Un fragment SQL brut avec ses liaisons, construit par `db.raw()`. |
| `transaction` | fonction | `transaction<T>(db: DatabaseConnection, callback: (trx: TransactionClient) => Promise<T> \| T, options?: TransactionOptions): Promise<T>`. |
| `createNapiConnection` | fonction | `createNapiConnection(url: string, poolMin = 1, poolMax = 10, pragmas?, retry?: ConnectRetryOptions, observability?: ObservabilityOptions): Promise<AsyncDatabaseConnection>`. |
| `getAtlasDialect` / `setAtlasDialect` | fonction | Le dialecte par défaut du processus. |
| `registerColumnCast` / `registerTableCasts` | fonction | `registerColumnCast(table, column, type)` : convertit une valeur liée vers le type d'une colonne (PostgreSQL). |
| `SQLITE_PROD_PRAGMAS` | constante | `{ journal_mode: 'WAL', synchronous: 'NORMAL' }`. |
| `CamelCaseNamingStrategy` / `defaultNamingStrategy` / `getNamingStrategy` | classe / constante / fonction | La correspondance entre noms de propriété et noms de colonne, et entre relations et clés. |
| `AsyncDatabaseConnection` | interface | `{ dialect; query; execute; runInTransaction(batch); transaction?(); listen?; close(); ping() }`. |
| `TransactionClient` | interface | Une connexion liée à une transaction, avec query builders et points de sauvegarde imbriqués. |
| `TransactionOptions` | interface | `{ isolationLevel?: IsolationLevel; … }`. |
| `IsolationLevel` | type | `'read uncommitted' \| 'read committed' \| 'repeatable read' \| 'serializable'`. |
| `ConnectRetryOptions` / `ObservabilityOptions` / `QueryMeta` | interface | Tentatives de connexion, événements de requête, le modèle auquel appartient une requête. |
| `ListenFn` / `ListenOptions` / `Notification` / `NotificationHandler` / `Unlisten` | type | LISTEN / NOTIFY de PostgreSQL via `db.listen()`. |
| `AtlasDialect` | type | `'sqlite' \| 'postgres' \| 'mysql'`. |
| `WhereOperator` / `WhereClause` / `ExistsClause` / `OrderByClause` / `CteDefinition` / `QueryResult` | type | Formes du query builder. |
| `NamingStrategy` / `RelationKind` | type | |

**Schéma, migrations et seeders**

| Export | Nature | Description |
|---|---|---|
| `Migration` / `BaseSchema` | classe | Base abstraite d'une migration. |
| `MigrationRunner` | classe | Exécute un répertoire de migrations sur un `DatabaseAdapter`. |
| `Schema` | classe | Constructeur de DDL : tables, vues, index, schémas. |
| `TableBuilder` / `ColumnBuilder` | classe | Colonnes, clés, index et contrôles d'une table. |
| `SchemaDumper` | classe | Écrit le schéma réel dans un fichier `.sql` et un manifeste. |
| `readSchemaDumpManifest` / `schemaDumpManifestPath` | fonction | Lit le manifeste à côté d'un dump. |
| `renderPgCreateTable` / `renderPgForeignKeyDdl` | fonction | DDL PostgreSQL d'une table introspectée. |
| `introspectTable` | fonction | `introspectTable(db, dialect, table, schema?): Promise<IntrospectedColumn[] \| null>`. |
| `checkSchema` | fonction | `checkSchema(entities, db, dialect): Promise<SchemaFinding[]>` : compare les colonnes des modèles au schéma réel. |
| `verifySchema` | fonction | Idem, puis lève une erreur (`mode: 'throw'`, par défaut) ou avertit en cas d'écart. |
| `runSchemaCheck` | fonction | Idem, affiché ; rend un code de sortie. |
| `formatSchemaFindings` / `suggestColumn` / `typesCompatible` | fonction | Aides du contrôle de schéma. |
| `BaseSeeder` / `Seeder` | classe | Base abstraite d'un seeder : `run()`, `this.db`, `static environment`. |
| `runSeeders` / `runSeederDirectory` | fonction | Exécute des instances de seeder, ou chaque fichier seeder d'un répertoire. |
| `DatabaseAdapter` | interface | Ce sur quoi tourne `MigrationRunner` ; `runInTransaction(batch)` rend chaque migration atomique. |
| `MigrationRecord` / `MigrationState` / `MigrationStatus` | type | Suivi des migrations. |
| `SchemaFinding` / `SchemaFindingKind` | type | `'missing-table' \| 'missing-in-db' \| 'type-mismatch' \| 'missing-in-model'`. |
| `IntrospectedColumn` / `PgForeignKey` / `SchemaDumperOptions` / `SchemaDumpManifest` / `SchemaDumpResult` | type | |
| `ColumnDefinition` / `ColumnType` / `DefaultValue` / `AlterOperation` / `CheckExpression` / `CheckOperator` / `CheckValue` / `ColumnPosition` / `ForeignKeyReference` / `IndexDefinition` / `ReferentialAction` / `TableConstraintSpec` / `TableOptionsSpec` / `TextVariant` | type | Formes du schema builder. |

**Commandes, factories, tests, événements, erreurs**

| Export | Nature | Description |
|---|---|---|
| `defineConfig` | fonction | `defineConfig(config: AtlasDatabaseConfig): AtlasDatabaseConfig`. |
| `configure` | fonction | Le hook de `ream configure`. |
| `makeMigrationCommand`, `migrationRunCommand`, `migrationRollbackCommand`, `migrationStatusCommand`, `migrationResetCommand`, `migrationRefreshCommand`, `migrationFreshCommand`, `migrationUnlockCommand`, `dbWipeCommand`, `dbSeedCommand`, `makeSeederCommand`, `makeFactoryCommand`, `schemaDumpCommand`, `schemaGenerateCommand`, `schemaCheckCommand` | fonction | Construisent chaque classe de commande avec ses options (voir `@c9up/atlas/commands`). |
| `generateSchemaFile` / `renderSchemaFile` | fonction | Ce qu'écrit `schema:generate`. |
| `argument` / `flag` | fonction | Métadonnées d'argument et d'option de commande. |
| `MigrationCommandOptions` / `SeederCommandOptions` / `FactoryCommandOptions` / `SchemaDumpCommandOptions` / `SchemaGenerateOptions` / `AtlasCommandClass` / `CommandOptions` / `ArgumentMetaData` / `FlagMetaData` | type | |
| `factory` / `Factory` | fonction / constante | Factories de modèles (voir `@c9up/atlas/factories`). |
| `FactoryContext` | interface | Ce que reçoit un callback de factory. |
| `useTransaction` / `truncateAll` | fonction | Isolation des tests (voir `@c9up/atlas/testing`). |
| `TestTransaction` | interface | `{ trx: TransactionClient; rollback: () => Promise<void> }`. |
| `onDbQuery` | fonction | `onDbQuery(listener: DbQueryListener): () => void` : chaque instruction d'une connexion en `debug: true`. |
| `prettyPrintQuery` | fonction | `prettyPrintQuery(event: DbQueryEvent): string`. |
| `onUnsafeStatement` | fonction | `onUnsafeStatement(listener: UnsafeStatementListener): () => void` : chaque instruction refusée par le compilateur Rust. |
| `clearDbQueryListeners` / `clearUnsafeStatementListeners` | fonction | |
| `DbQueryEvent` / `DbQueryListener` / `UnsafeStatementEvent` / `UnsafeStatementListener` | type | |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs) |

### `@c9up/atlas/provider`

| Export | Nature | Description |
|---|---|---|
| `default` (`AtlasProvider`) | provider | Lit `config/database.ts` (clé `database`), ouvre chaque connexion, installe celle par défaut sur `services/db`, vérifie le schéma si `verifySchema` est défini, n'exécute les migrations en attente au démarrage que si `migrations.autoRun` est activé, et ferme les connexions à l'arrêt. |
| `AtlasAppContext` | interface | L'hôte dont le provider a besoin. |
| `ConnectionConfig` / `AtlasDatabaseConfig` | interface | Voir Configuration. |

### `@c9up/atlas/services/db`

| Export | Nature | Description |
|---|---|---|
| `default` (`db`) | constante | Le `DbService` de la connexion par défaut. |
| `createDbService` | fonction | `createDbService(resolve: () => AsyncDatabaseConnection, readOnly?: boolean): DbService`. |
| `setDb` / `getDb` / `clearDb` | fonction | Installe, lit et retire la connexion par défaut. |
| `registerConnection` / `unregisterConnection` / `getConnection` | fonction | Connexions nommées : `registerConnection(name, connection, config?)`. |
| `connectionManager` | fonction | `connectionManager(): ConnectionManager`. |
| `setDatabaseConfig` / `getDatabaseConfig` / `clearDatabaseConfig` / `connectionConfigFor` / `primaryConnectionName` | fonction | La configuration avec laquelle le provider a démarré ; `connectionConfigFor(name?)` fusionne une connexion par-dessus le niveau supérieur. |
| `DbService` | interface | Voir ci-dessous. |
| `DbQueryOptions` | interface | `{ client?: QueryExecutor; mode?: 'read' \| 'write' }`. |
| `ConnectionOptions` | interface | `{ mode?: 'read' \| 'write' }`. |

| Membre de `DbService` | Signature | Description |
|---|---|---|
| `from` / `table` / `query` | `from(table: string): DatabaseQueryBuilder` | Une requête sur une table ; `from()` accepte aussi une sous-requête et un alias. |
| `insertQuery` | `insertQuery(options?: DbQueryOptions): DatabaseQueryBuilder` | Une insertion. |
| `rawQuery` | `rawQuery<T>(sql: string, bindings?: unknown[] \| Record<string, unknown>): RawQueryBuilder<T>` | SQL brut avec liaisons positionnelles ou nommées. |
| `raw` / `ref` | `raw(sql: string, params?): RawSql` | Un fragment brut, une référence de colonne. |
| `modelQuery` | `modelQuery<Q>(model: { query(): Q }): Q` | La requête d'un modèle sur cette connexion. |
| `connection` | `connection(name?: string, options?: ConnectionOptions): DbService` | Une autre connexion, ou un réplica en lecture avec `mode: 'read'`. |
| `execute` | `execute(sql: string, params?: unknown[]): Promise<{ rowsAffected: number }>` | |
| `transaction` / `runInTransaction` | comme sur la connexion | Transaction gérée ou manuelle ; un lot exécuté atomiquement. |
| `listen` | comme sur la connexion | LISTEN / NOTIFY de PostgreSQL. |
| `truncate` / `truncateAllTables` | `truncate(table: string, cascade?: boolean): Promise<void>` | |
| `getAdvisoryLock` / `releaseAdvisoryLock` | `getAdvisoryLock(key: string \| number): Promise<boolean>` | |
| `manager` / `dialect` | accesseurs | |
| `ping` / `close` | `ping(): Promise<void>` | |

### `@c9up/atlas/testing`

| Export | Nature | Description |
|---|---|---|
| `useTransaction` | fonction | `useTransaction(db: AsyncDatabaseConnection): Promise<TestTransaction>` : exécute un test dans une transaction annulée ensuite. |
| `truncateAll` | fonction | `truncateAll(db: AsyncDatabaseConnection, ignoreTables?: readonly string[]): Promise<void>`. |
| `testUtils` | fonction | `testUtils(conn, options?: DbTestUtilsOptions): { db(): DbTestUtils }` : `migrate()`, `truncate()`, `seed(files?)`, `withGlobalTransaction()`. |
| `createDbAssertions` | fonction | `createDbAssertions(conn: DbConnectionLike): DbAssertions` : `assertHas`, `assertMissing`, `assertCount`, `assertEmpty`. |
| `db` | fonction | `db(conn: DbConnectionLike): Plugin` : plugin helix qui place les assertions dans `ctx.db`. |
| `Database` | classe | Une petite base asynchrone pour les tests : `query`, `queryWithParams`, `execute`, `close`, `asAdapter()`. |
| `factory` / `Factory` / `FactoryBuilder` | fonction / constante / interface | Comme dans `@c9up/atlas/factories`. |
| `DbTestUtils` / `DbTestUtilsOptions` | interface | `{ migrationsDir?; seedersDir?; ignoreTables? }`. |
| `DbAssertions` / `DbConnectionLike` | interface | |

### `@c9up/atlas/factories`

| Export | Nature | Description |
|---|---|---|
| `factory` | fonction | `factory<T extends BaseEntity>(entityClass, defaults): FactoryBuilder<T>`. |
| `Factory` | constante | `Factory.define(entityClass, defaults).build()`, et `Factory.stubId(generator?)`. |
| `FactoryBuilder` | interface | `merge`, `mergeRecursive`, `state`, `apply`, `client`, `connection`, `relation`, `with`, `tap`, `newUp`, `pivotAttributes`, `query`, `before`, `after`, `make`, `makeMany`, `makeStubbed`, `makeStubbedMany`, `create(db?)`, `createMany(count, db?)`. |
| `makeFactoryCommand` | fonction | La commande `make:factory`. |

### `@c9up/atlas/commands`

| Commande | Description |
|---|---|
| `migration:run` | Exécute les migrations en attente (`--schema-path` amorce depuis un dump). |
| `migration:rollback` | Annule le dernier lot, ou `--batch=N` ; `--force` en production. |
| `migration:status` | Migrations appliquées et en attente. |
| `migration:reset` | Annule toutes les migrations. |
| `migration:refresh` | Annule toutes les migrations, puis les rejoue. |
| `migration:fresh` | Supprime toutes les tables, puis exécute toutes les migrations. |
| `migration:unlock` | Retire un verrou de migration bloqué. |
| `db:wipe` | Supprime toutes les tables, table des migrations comprise. |
| `db:seed` | Exécute les seeders (`--files=A,B`, `--connection=name`). |
| `make:migration` | Crée une migration horodatée. |
| `make:seeder` | Crée un seeder. |
| `make:factory` | Crée une factory. |
| `schema:dump` | Écrit le schéma dans un fichier `.sql` et un manifeste (`--prune`, `--connection`, `--path`). |
| `schema:generate` | Introspecte la base et génère les classes de modèle. |
| `atlas:check` | Compare les modèles au schéma réel. |

Les commandes qui détruisent des données refusent de tourner en production sans `--force` tant que `migrations.disableRollbacksInProduction` est actif.

### `BaseModel`

| Groupe | Membres |
|---|---|
| Recherche | `find`, `findOrFail`, `findBy`, `findByOrFail`, `findMany`, `findManyBy`, `first`, `firstOrFail`, `all`, `query(options?)` |
| Écriture | `create`, `createMany`, `createQuietly`, `createManyQuietly`, `firstOrCreate`, `firstOrNew`, `updateOrCreate`, `updateOrCreateMany`, `fetchOrCreateMany`, `fetchOrNewUpMany`, `truncate` |
| Connexion | `static connection`, `$connection()`, `$repo(options?)`, `transaction(callback, options?)` ou `transaction(options?)` |
| Instance | `save()`, `saveQuietly()`, `delete()`, `deleteQuietly()`, `useTransaction(trx)`, `useConnection(name)`, `$trx` |

### `BaseEntity`

| Groupe | Membres |
|---|---|
| État | `$isNew`, `$isPersisted`, `$isLocal`, `$isDeleted`, `$isDirty`, `$dirty`, `$primaryKeyValue`, `isDirty(...)` |
| Attributs | `fill(values)`, `merge(values)`, `setExtra` / `getExtra`, `enableForceUpdate()` |
| Relations | `load`, `loadOnce`, `loadCount`, `loadAggregate`, `related(name)`, `associate`, `dissociate`, `attach`, `detach`, `sync` |
| Rechargement | `refresh()`, `fresh()` |
| Sortie | `serialize(options?)`, `toJSON()`, `toObject()` |
| Événements de domaine | `addDomainEvent`, `getDomainEvents`, `hasDomainEvents`, `domainEventCount`, `clearDomainEvents`, `flushDomainEvents` |

### `BaseRepository`

`new BaseRepository(entityClass, db: DatabaseConnection, options?: RepositoryOptions)`.

| Groupe | Membres |
|---|---|
| Requête | `query()`, `find(id)`, `findOrFail(id)`, `findBy(column, value)`, `findByOrFail`, `findMany`, `findManyBy`, `all()`, `allWithTrashed()`, `onlyTrashed()`, `where(column, value)` |
| Écriture | `create(data, options?)`, `createMany(rows)`, `createQuietly`, `createManyQuietly`, `save(entity)`, `saveQuietly`, `saveMany(entities)`, `upsert(data, uniqueBy)`, `firstOrCreate(where, create?)`, `firstOrNew(where, create?)`, `updateOrCreate(where, data)`, `updateOrCreateMany`, `fetchOrCreateMany`, `fetchOrNewUpMany`, `updateById(id, data)`, `updateWhere(column, value, data)` |
| Suppression | `delete(entity)`, `deleteQuietly`, `forceDelete(entity)`, `restore(entity)`, `truncate()` |
| Compteurs | `increment(id, column, amount?)` ou `increment(id, { colA: 1 })` ; `decrement` de même |
| Relations | `loadRelation(entity, name, callback?)`, `relatedProxy(entity, name)`, `loadCount(entity, name, alias?)`, `loadAggregate(entity, name, builder)`, `refresh(entity)`, `fresh(entity)` |
| Bas niveau | `useTransaction(trx)`, `raw(sql, ...params)`, `execute`, `getTableName()`, `getPrimaryKeyColumn()` |

### `ModelQuery`

Un `ModelQuery` est un `PromiseLike` : `await` l'exécute. Chaque méthode `where*` et `having*` a ses formes `and*` et `or*`.

| Groupe | Membres |
|---|---|
| Where | `where`, `whereNot`, `whereNull`, `whereNotNull`, `whereIn`, `whereNotIn`, `whereBetween`, `whereNotBetween`, `whereLike`, `whereILike`, `whereColumn`, `whereNotColumn`, `whereExists`, `whereNotExists`, `whereRaw(sql, bindings)`, `whereExpr(column, operator, value)`, `whereJson`, `whereNotJson`, `whereJsonPath`, `whereJsonSubset` / `whereJsonSuperset` et leurs formes `Of` et `Not` |
| Relations | `preload(relation, callback?)`, `preloadOnce`, `sideload`, `has`, `doesntHave`, `whereHas`, `whereDoesntHave`, `withCount(relation, callback?)`, `withAggregate(relation, callback)` |
| Pivot | `wherePivot`, `whereNotPivot`, `wherePivotIn`, `whereInPivot`, `whereNotInPivot`, `whereNullPivot`, `whereNotNullPivot`, `pivotColumns` |
| Sélection et agrégats | `select`, `distinct`, `distinctOn`, `count`, `countDistinct`, `sum`, `sumDistinct`, `avg`, `avgDistinct`, `min`, `max`, `selectAggregate`, `as(alias)` |
| Jointures | `join`, `innerJoin`, `leftJoin`, `leftOuterJoin`, `rightJoin`, `rightOuterJoin`, `fullOuterJoin`, `crossJoin`, `joinOn(table, left, right)`, `joinRaw(fragment)`, avec `on`, `onVal`, `onIn`, `onNull`, `onBetween`, `onExists` et leurs négations |
| Regroupement | `groupBy`, `groupByRaw`, `having*`, `groupLimit`, `groupOrderBy` |
| Tri et pages | `orderBy`, `orderByRaw`, `limit`, `offset`, `forPage`, `paginate(page, perPage)`, `cursorPaginate({ perPage, cursor, orderBy })` |
| Ensembles et CTE | `union`, `unionAll`, `intersect`, `intersectAll`, `except`, `exceptAll`, `with`, `withRecursive`, `withMaterialized`, `withNotMaterialized` |
| Portées et conditions | `apply(callback)`, `withScopes(callback)`, `if`, `unless`, `ifDialect`, `unlessDialect`, `match` |
| Suppression douce | `withTrashed`, `onlyTrashed`, `restore`, `forceDelete` |
| Verrous | `forUpdate`, `forShare`, `forNoKeyUpdate`, `forKeyShare`, `skipLocked`, `noWait`, `timeout` |
| Exécution | `exec()`, `first()`, `firstOrFail()`, `sole()`, `exists()`, `doesntExist()`, `pluck(column)`, `all()` |
| Écriture | `update(patch, returning?)`, `delete(returning?)`, `increment(column, amount)` ou `increment({ … })`, `decrement` de même |
| Inspection | `toSQL()`, `toQuery()`, `toNative()`, `debug(flag)`, `comment(text)`, `reporterData`, `clone()`, `useTransaction(trx)` |
| Remise à zéro | `clearSelect`, `clearWhere`, `clearOrder`, `clearHaving`, `clearLimit`, `clearOffset` |

Les huit agrégats partagent une signature. Chacun prend une colonne, avec un alias en ligne, en second argument ou en clé d'objet, et renvoie le builder. La valeur revient comme une colonne de la ligne de résultat, dans `$extras` sur le builder de modèle :

```ts
const [row] = await db.from('sales').count('* as total')
Number(row.total)

const [order] = await Order.query().sum('amount as spent').countDistinct('sku', 'items')
Number(order.$extras.spent)
```

Aucun n'exécute la requête à lui seul.

Le `DatabaseQueryBuilder` que rend `db.from()` a les mêmes méthodes de filtre, de jointure, de regroupement, d'ensemble et de verrou, plus `insert`, `multiInsert`, `returning`, `onConflict(...).ignore()` / `.merge()`, `update`, `delete` / `del`, `increment`, `decrement`, `withSchema` et `paginate`.

### `Migration`

| Membre | Signature | Description |
|---|---|---|
| `up` / `down` | `abstract up(): Promise<void> \| void` | Le changement et son inverse. |
| `schema` | `readonly schema: Schema` | Le constructeur de DDL. |
| `defer` | `defer(callback: (db) => Promise<void> \| void): void` | Exécute du code sur la connexion après les instructions de schéma, dans la transaction de la migration. |
| `raw` | `raw(expression: string): RawSql` | Une expression SQL brute pour la valeur par défaut d'une colonne, écrite telle quelle. |
| `now` | `now(): RawSql` | `CURRENT_TIMESTAMP` sur SQLite, `NOW()` ailleurs, pour la valeur par défaut d'une colonne. |
| `disableTransactions` | `static disableTransactions = false` | Exécute cette migration hors transaction. |
| `dryRun` | `dryRun = false` | Positionné quand le runner collecte le SQL sans écrire. |
| `getUpSQL` / `getDownSQL` | `getUpSQL(): Promise<string[]>` | Les instructions compilées. |

### `MigrationRunner`

`new MigrationRunner(db: DatabaseAdapter, options?: { migrationsDir?; dialect?; tableName?; … })` ; `database/migrations` et la table `ream_migrations` par défaut.

| Membre | Signature | Description |
|---|---|---|
| `init` | `init(): Promise<void>` | Crée la table de suivi. |
| `status` | `status(): Promise<MigrationStatus[]>` | |
| `migrate` | `migrate(options?: { schemaPath?: string }): Promise<string[]>` | Exécute les migrations en attente, chacune atomiquement quand l'adaptateur a `runInTransaction`. |
| `rollback` | `rollback(options?: { batch?: number; force?: boolean }): Promise<string[]>` | Le dernier lot, ou le lot `N`. |
| `reset` / `refresh` | `refresh(): Promise<{ rolled: string[]; executed: string[] }>` | Annule tout ; `refresh` migre ensuite à nouveau. |
| `fresh` | `fresh(options?: { force?: boolean; schemaPath?: string }): Promise<{ rolled: string[]; executed: string[] }>` | Supprime toutes les tables, puis migre. |
| `wipe` | `wipe(options?: { force?: boolean }): Promise<void>` | Supprime toutes les tables. |
| `dryRun` | `dryRun()` | Le SQL qu'exécuteraient les migrations en attente, sans écrire. |
| `loadDump` | `loadDump(sqlPath: string): Promise<void>` | Exécute les instructions d'un dump de schéma. |
| `forceUnlock` | `forceUnlock(): Promise<boolean>` | Retire un verrou resté en place. |

### `Schema` et `TableBuilder`

| Constructeur | Membres |
|---|---|
| `Schema` | `createTable`, `createTableIfNotExists`, `createTableLike`, `alterTable` / `table`, `renameTable`, `dropTable`, `dropTableIfExists`, `hasTable`, `hasColumn`, `createIndex`, `dropIndex`, `createView`, `createViewOrReplace`, `alterView`, `renameView`, `dropView`, `dropViewIfExists`, `createMaterializedView`, `refreshMaterializedView`, `dropMaterializedView`, `dropMaterializedViewIfExists`, `createSchema`, `createSchemaIfNotExists`, `dropSchema`, `dropSchemaIfExists`, `withSchema`, `raw`, `toSQL`, `reset` |
| `TableBuilder` colonnes | `increments`, `bigIncrements`, `id`, `integer`, `bigInteger`, `smallint`, `tinyint`, `mediumint`, `float`, `double`, `decimal`, `boolean`, `string`, `text`, `binary`, `uuid`, `enum`, `json`, `jsonb`, `date`, `time`, `dateTime`, `timestamp`, `timestamptz`, `timestamps`, `specificType` |
| `TableBuilder` clés et contraintes | `primary`, `unique`, `uniqueIndex`, `index`, `foreign`, `check`, `checkBetween`, `checkIn`, `checkNotIn`, `checkLength`, `checkPositive`, `checkNegative`, `checkRegex` |
| `TableBuilder` modifications | `renameColumn`, `dropColumn`, `dropColumns`, `dropPrimary`, `dropUnique`, `dropIndex`, `dropForeign`, `dropChecks`, `dropTimestamps`, `setNullable`, `dropNullable`, `engine`, `charset`, `collate`, `comment` |
| `ColumnBuilder` | `notNullable`, `nullable`, `defaultTo`, `unsigned`, `primary`, `unique`, `index`, `references`, `inTable`, `onDelete`, `onUpdate`, `comment`, `first`, `after`, `alter`, `check*` |

## Configuration

`config/database.ts`, lu sous la clé `database`.

| Option | Type | Défaut | Description |
|---|---|---|---|
| `connection` | `string` | `'primary'` | La connexion par défaut quand `connections` est défini (`default` est accepté comme ancien alias). |
| `connections` | `Record<string, ConnectionConfig>` | — | Connexions nommées. |
| `verifySchema` | `{ entities; mode?: 'throw' \| 'warn' }` | non défini | Compare ces modèles au schéma réel après le démarrage ; `throw` par défaut. |
| `prettyPrintDebugQueries` | `boolean` | `false` | Affiche chaque instruction d'une connexion en `debug`. |
| `<connexion>.url` / `.connection` | `string` | — | `sqlite:data/app.db`, `postgres://…`, `mysql://…`. `url` l'emporte. |
| `<connexion>.pool` | `{ min?: number; max?: number }` | `{ min: 1, max: 10 }` | Taille du pool (`poolMin` / `poolMax` sont acceptés aussi). |
| `<connexion>.debug` | `boolean` | `false` | Émet un événement `db:query` par instruction. |
| `<connexion>.pragmas` | `Record<string, string \| number>` | — | Pragmas SQLite, comme `SQLITE_PROD_PRAGMAS`. |
| `<connexion>.connectRetries` | `number` | `0` | Tentatives supplémentaires de la première connexion. |
| `<connexion>.connectBackoffMs` | `number` | `200` | Base de l'attente exponentielle, plafonnée à 30 s. |
| `<connexion>.connectTimeoutMs` | `number` | — | Délai d'acquisition par tentative. |
| `<connexion>.migrations.paths` | `string[]` | `['database/migrations']` | Répertoires de migrations. |
| `<connexion>.migrations.tableName` | `string` | `'ream_migrations'` | Table de suivi ; un identifiant simple. |
| `<connexion>.migrations.disableRollbacksInProduction` | `boolean` | `true` | Refuse rollback, reset, refresh, fresh et wipe en production sans `--force`. |
| `<connexion>.migrations.autoRun` | `boolean` | `false` | Exécute les migrations en attente au démarrage ; ignoré en développement. |
| `<connexion>.migrations.naturalSort` | `boolean` | `false` | Trie `2_x` avant `10_x`. |
| `<connexion>.migrations.disableTransactions` | `boolean` | `false` | Exécute chaque migration hors transaction. |
| `<connexion>.seeders.paths` | `string[]` | `['database/seeders']` | Répertoire des seeders (le premier est utilisé). |
| `<connexion>.seeders.naturalSort` | `boolean` | `false` | |
| `<connexion>.factories.path` | `string` | `'database/factories'` | Où écrit `make:factory`. |
| `<connexion>.schemaGeneration` | `SchemaGenerateOptions` | — | `outputPath` et options de `schema:generate`. |

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `'atlas.db'` / `'db'` | L'`AsyncDatabaseConnection` par défaut |
| `'atlas.db.connection'` / `'db.connection'` | La même connexion |
| `'atlas.db:<nom>'` / `'db:<nom>'` | Une connexion nommée |

Tous sont typés sur `ContainerBindings` dès que `@c9up/atlas` est importé.

## Erreurs

Chaque code est une classe de l'espace de noms `errors` (`import { errors } from '@c9up/atlas'`) et une `Exception` de `@c9up/flare` : testez `error.code` ou `error instanceof errors.E_…`. Le statut est 500, sauf `E_ROW_NOT_FOUND` (404) ; `help`, quand il est présent, dit comment corriger la cause. Les refus du compilateur de requêtes et du pilote Rust (`E_UNSAFE_*`, `E_INJECTION_PATTERN`, `E_UNSUPPORTED`, `E_ATLAS_INSECURE_SSLMODE`…) sont relancés eux aussi en leur classe, l'erreur native en `cause`. Voir [Gestion des erreurs](/fr/guides/database/orm/error-handling) pour les classes qui portent des données.

| Code | Levée quand |
|---|---|
| [`E_ROW_NOT_FOUND`](/fr/reference/errors#e-row-not-found) | Une requête qui doit rendre une ligne n'en a trouvé aucune : `findOrFail`, `findByOrFail`, `refresh`, `fresh`, `firstOrFail()`, `sole()`. |
| [`E_MASS_ASSIGNMENT`](/fr/reference/errors#e-mass-assignment) | `fill()` / `merge()` (et `create`, `createMany`, `updateOrCreate`) ont affecté un attribut hors de `fillable`, ou listé dans `guarded`. |
| [`E_EXTRA_PROPERTIES`](/fr/reference/errors#e-extra-properties) | Un remplissage a nommé une propriété qui n'est pas une colonne déclarée. |
| [`E_UNKNOWN_COLUMN`](/fr/reference/errors#e-unknown-column) | Une valeur a été affectée à une clé qui n'est pas une colonne. Passez `{ allowExtraProperties: true }` pour garder les clés inconnues dans `$extras`. |
| [`E_INVALID_COLUMN`](/fr/reference/errors#e-invalid-column) | Une requête nomme une colonne que l'entité ne déclare pas. |
| [`E_INVALID_FIND_VALUE`](/fr/reference/errors#e-invalid-find-value) | `find()` a été appelé sans valeur de clé primaire utilisable. |
| [`E_MODEL_NOT_PERSISTED`](/fr/reference/errors#e-model-not-persisted) | Une opération qui exige une ligne stockée (`delete()`, `refresh()`, `load*()`…) a tourné sur une instance locale. |
| [`E_MISSING_PRIMARY_KEY`](/fr/reference/errors#e-missing-primary-key) | La même opération a tourné sur une projection persistée qui ne contient pas la clé primaire. |
| [`E_MODEL_DELETED`](/fr/reference/errors#e-model-deleted) | `save()` a été appelé sur une instance supprimée. |
| [`E_MISSING_OWNER_KEY`](/fr/reference/errors#e-missing-owner-key) | `associate()` a reçu un parent dont la clé n'est pas renseignée. |
| [`E_RELATION_NOT_LOADED`](/fr/reference/errors#e-relation-not-loaded) | Une relation a été lue avant d'être chargée. Appelez `.preload()` sur la requête ou `.load()` sur l'instance. |
| [`E_OPTIMISTIC_LOCK`](/fr/reference/errors#e-optimistic-lock) | Une sauvegarde a perdu un verrou optimiste : une autre transaction a modifié la ligne depuis sa lecture. |
| [`E_STRICT_MODE`](/fr/reference/errors#e-strict-mode) | SQL brut refusé par le mode strict (le `raw()` d'un repository, une valeur `db.raw()` écrite par un repository, ou `whereRaw()` / `havingRaw()` / `joinRaw()` sur une requête de modèle). |
| [`E_NO_INTERACTIVE_TRANSACTION`](/fr/reference/errors#e-no-interactive-transaction) | La connexion n'a pas de `transaction()` interactive (transaction de modèle, ou `useTransaction()` en test). |
| [`E_ARRAY_PARAM`](/fr/reference/errors#e-array-param) | Une liste a été liée à un seul paramètre. Développez-la en un paramètre par élément. |
| [`E_UNMANAGED_DB_CONNECTION`](/fr/reference/errors#e-unmanaged-db-connection) | Un nom de connexion non enregistré : le `static connection` d'un modèle, `db.connection(name)`, le `connection(name)` d'une factory, `manager.connect(name)`. |
| [`E_ATLAS_MISSING_CONNECTION`](/fr/reference/errors#e-atlas-missing-connection) | Aucune connexion utilisable : pas de connexion par défaut (atlas n'a pas démarré), un `default` que la config ne déclare pas, ou un repository construit sans connexion. |
| [`E_ATLAS_EMPTY_SELECT`](/fr/reference/errors#e-atlas-empty-select) | `select()` a été appelé sans colonnes. Fournissez au moins un nom de colonne. |
| [`E_ATLAS_INVALID_PAGE`](/fr/reference/errors#e-atlas-invalid-page) | `paginate()` a été appelé avec `page < 1`. |
| [`E_ATLAS_INVALID_PER_PAGE`](/fr/reference/errors#e-atlas-invalid-per-page) | `paginate()` a été appelé avec `perPage < 1`. |
| [`E_ATLAS_INVALID_PAGINATION`](/fr/reference/errors#e-atlas-invalid-pagination) | Une page, une taille de page ou un nombre de lignes qui n'est pas un entier fini et positif ou nul. |
| [`E_ATLAS_INVALID_CTE_NAME`](/fr/reference/errors#e-atlas-invalid-cte-name) | Un nom de CTE doit être un identifiant valide (lettres, chiffres, underscores). |
| [`E_ATLAS_INVALID_OPERATOR`](/fr/reference/errors#e-atlas-invalid-operator) | Un opérateur de `where()` ou `wherePivot()` hors de la liste autorisée. |
| [`E_ATLAS_INVALID_INCREMENT`](/fr/reference/errors#e-atlas-invalid-increment) | `increment()` / `decrement()` a reçu une quantité qui n'est pas un nombre fini. |
| [`E_INVALID_DATE_COLUMN_VALUE`](/fr/reference/errors#e-invalid-date-column-value) | Une colonne de date a reçu une valeur qui n'est pas une date valide. |
| [`E_ATLAS_UNDEFINED_BINDING`](/fr/reference/errors#e-atlas-undefined-binding) | Une valeur de requête vaut `undefined`. Validez l'entrée avant ; utilisez `whereNull()` pour chercher NULL. |
| [`E_ATLAS_DIALECT_MISMATCH`](/fr/reference/errors#e-atlas-dialect-mismatch) | `useTransaction(trx)` a reçu une transaction d'un autre dialecte que celui pour lequel la requête a été construite. Ouvrez la transaction sur la connexion de la requête, ou construisez la requête depuis la transaction. |
| [`E_ATLAS_RAW_BINDINGS`](/fr/reference/errors#e-atlas-raw-bindings) | Une requête brute a des paramètres sans valeur liée. |
| [`E_ATLAS_RAW_VALUE`](/fr/reference/errors#e-atlas-raw-value) | `defaultTo(db.raw())` a reçu des valeurs liées, qu'un défaut de colonne ne peut pas porter. |
| [`E_ATLAS_NON_FINITE_NUMBER`](/fr/reference/errors#e-atlas-non-finite-number) | `defaultTo()` a reçu un nombre qui n'est pas un nombre SQL (`NaN`, `Infinity`). |
| [`E_ATLAS_FACTORY_FAKER_MISSING`](/fr/reference/errors#e-atlas-factory-faker-missing) | Une factory utilise faker, dépendance pair optionnelle d'atlas, non installée. |
| [`E_ATLAS_NAPI_NOT_FOUND`](/fr/reference/errors#e-atlas-napi-not-found) | Le compilateur de requêtes Rust n'est pas chargé ; `cause` porte l'échec du chargement. Voir [Dépannage](/fr/guides/database/orm/troubleshooting). |
| [`E_ATLAS_INSECURE_SSLMODE`](/fr/reference/errors#e-atlas-insecure-sslmode) | La connexion demande `sslmode=prefer` ou `allow` (URL ou `PGSSLMODE`), qui repassent en clair sans le dire. Utilisez `disable` ou `verify-full`. Voir [Connexions chiffrées](/fr/guides/database/orm/connections#connexions-chiffrees-tls). |
| [`E_ATLAS_LISTEN_UNSUPPORTED`](/fr/reference/errors#e-atlas-listen-unsupported) | LISTEN / NOTIFY a été utilisé sur une connexion qui n'est pas PostgreSQL. |
| [`E_ATLAS_LISTEN_CONNECT`](/fr/reference/errors#e-atlas-listen-connect) | Le listener n'a pas pu ouvrir sa propre connexion PostgreSQL. |
| [`E_ATLAS_LISTEN_CONNECTION`](/fr/reference/errors#e-atlas-listen-connection) | La connexion du listener a échoué ; chaque abonnement en est informé. |
| [`E_ATLAS_LISTEN_CHANNEL`](/fr/reference/errors#e-atlas-listen-channel) | Un nom de canal LISTEN est vide, dépasse 63 octets, ou contient un NUL. |
| [`E_ATLAS_LISTEN_CLOSED`](/fr/reference/errors#e-atlas-listen-closed) | Le listener a été fermé pendant qu'une demande était en cours. |
| [`E_ATLAS_LISTEN_EVENT`](/fr/reference/errors#e-atlas-listen-event) | Le listener natif a signalé un événement qu'atlas ne définit pas. |
| [`E_ATLAS_MIGRATION_INVALID_TABLE_NAME`](/fr/reference/errors#e-atlas-migration-invalid-table-name) | `migrations.tableName` n'est pas un identifiant simple. |
| [`E_MISSING_SCHEMA_FILES`](/fr/reference/errors#e-missing-schema-files) | Une migration enregistrée comme appliquée n'a pas de fichier dans le répertoire de migrations : elle ne peut pas être annulée. |
| [`E_ATLAS_MIGRATION_INVALID`](/fr/reference/errors#e-atlas-migration-invalid) | Un fichier de migration n'exporte pas de classe par défaut. |
| [`E_ATLAS_MIGRATION_DUPLICATE`](/fr/reference/errors#e-atlas-migration-duplicate) | Deux fichiers de migration partagent un nom. |
| [`E_ATLAS_MIGRATION_COMPILE_EMPTY`](/fr/reference/errors#e-atlas-migration-compile-empty) | Une migration s'est compilée en aucune instruction SQL. |
| [`E_UNABLE_ACQUIRE_LOCK`](/fr/reference/errors#e-unable-acquire-lock) | Une autre exécution tient le verrou de migration. Attendez-la, ou libérez un verrou resté bloqué avec `migration:unlock`. |
| [`E_UNABLE_RELEASE_LOCK`](/fr/reference/errors#e-unable-release-lock) | L'exécution a réussi, mais son verrou de migration a été libéré pendant qu'elle le tenait (`migration:unlock` en cours d'exécution) : une autre exécution a pu migrer en même temps. |
| [`E_ROLLBACK_DISABLED_IN_PRODUCTION`](/fr/reference/errors#e-rollback-disabled-in-production) | Un rollback, reset, refresh, fresh ou wipe en production sans `--force`. |
| [`E_ATLAS_DRY_RUN_WRITE`](/fr/reference/errors#e-atlas-dry-run-write) | Une migration a tenté d'écrire pendant un `dryRun()`. |
| [`E_DEFER_REQUIRES_TRANSACTION`](/fr/reference/errors#e-defer-requires-transaction) | Une migration utilise `this.defer()` sur un adaptateur sans `transaction()` interactive. |
| [`E_MYSQL_FK_REQUIRES_TRANSACTION`](/fr/reference/errors#e-mysql-fk-requires-transaction) | Suspendre les contrôles de clés étrangères MySQL exige une `transaction()` interactive pour les rétablir. |
| [`E_SCHEMA_DUMP_DIALECT_MISMATCH`](/fr/reference/errors#e-schema-dump-dialect-mismatch) | Le dump de schéma a été fait pour un autre dialecte. |
| [`E_SCHEMA_DUMP_TABLE_MISMATCH`](/fr/reference/errors#e-schema-dump-table-mismatch) | Le dump de schéma utilise une autre table de suivi des migrations. |
| [`E_SEEDER_DIR_NOT_FOUND`](/fr/reference/errors#e-seeder-dir-not-found) | Le répertoire des seeders n'existe pas. |
| [`E_SEEDER_INVALID`](/fr/reference/errors#e-seeder-invalid) | Un fichier de seeder n'exporte pas de classe de seeder. |
| [`E_SEEDER_INVALID_PATH`](/fr/reference/errors#e-seeder-invalid-path) | Un chemin de seeder se résout hors du répertoire des seeders. |
| [`E_NO_CONNECTION`](/fr/reference/errors#e-no-connection) | `schema.<méthode>()` exige une connexion active ; elle existe dans une migration, pas sur un `Schema` isolé. |
| [`E_ALTER_EMPTY`](/fr/reference/errors#e-alter-empty) | `schema.alterTable()` n'a déclaré aucune opération. |
| [`E_ALTER_MISUSE`](/fr/reference/errors#e-alter-misuse) | `.alter()` ne suit pas une définition de colonne, ou une méthode réservée à la modification a servi sur une nouvelle table. |
| [`E_CHECK_EMPTY`](/fr/reference/errors#e-check-empty) | Une contrainte check (ou `checkBetween`) n'a reçu aucune valeur ni intervalle. |
| [`E_CHECK_RANGE`](/fr/reference/errors#e-check-range) | `checkBetween` a reçu un intervalle qui n'est pas `[min, max]`. |
| [`E_CONSTRAINT_EMPTY`](/fr/reference/errors#e-constraint-empty) | Une contrainte ne liste aucune colonne. |
| [`E_ENUM_EMPTY`](/fr/reference/errors#e-enum-empty) | Une colonne enum ne déclare aucune valeur. |
| [`E_EMPTY_VIEW_SELECT`](/fr/reference/errors#e-empty-view-select) | Une vue n'a pas de SELECT, ou une vue matérialisée a été demandée à un dialecte qui n'en a pas. |
| [`E_SPECIFIC_TYPE_EMPTY`](/fr/reference/errors#e-specific-type-empty) | `specificType()` a reçu un type vide. |
| [`E_SQLITE_DECIMAL_PRECISION`](/fr/reference/errors#e-sqlite-decimal-precision) | Une précision décimale que SQLite ne peut pas stocker exactement. |
| [`E_UNSUPPORTED`](/fr/reference/errors#e-unsupported) | Une fonctionnalité SQL que le dialecte de la connexion n'a pas (`DISTINCT ON` hors Postgres, variantes `ALL` sur SQLite, verrous consultatifs sur SQLite…). |
| [`E_UNSAFE_IDENTIFIER`](/fr/reference/errors#e-unsafe-identifier) | Un identifiant n'est pas un nom simple : refusé par les contrôles d'atlas ou par le compilateur Rust. |
| [`E_UNSAFE_SQL`](/fr/reference/errors#e-unsafe-sql) | Le compilateur Rust a refusé un fragment SQL. |
| [`E_UNSAFE_EXPRESSION`](/fr/reference/errors#e-unsafe-expression) | Le compilateur Rust a refusé une expression. |
| [`E_UNSAFE_LITERAL`](/fr/reference/errors#e-unsafe-literal) | Le compilateur Rust a refusé une valeur littérale. |
| [`E_INJECTION_PATTERN`](/fr/reference/errors#e-injection-pattern) | Le compilateur Rust a refusé une entrée qui ressemble à une tentative d'injection. |
| [`E_ATLAS_FACTORY_INVALID`](/fr/reference/errors#e-atlas-factory-invalid) | `make:factory` a reçu un nom qui n'est pas un nom de fichier sûr. |
| [`E_ATLAS_SEEDER_INVALID`](/fr/reference/errors#e-atlas-seeder-invalid) | `make:seeder` a reçu un nom qui n'est pas un nom de fichier sûr. |
| [`E_ATLAS_NO_URL`](/fr/reference/errors#e-atlas-no-url) | Une configuration de connexion n'a pas d'`url` (ni de `connection`), ou la configuration de base n'a ni `url` de premier niveau ni `connections`. |
| [`E_ATLAS_NOT_BOOTED`](/fr/reference/errors#e-atlas-not-booted) | Le service `db` (`@c9up/atlas/services/db`) a servi avant que `AtlasProvider.boot()` ne tourne. |
| [`E_ATLAS_CONNECTION_UNAVAILABLE`](/fr/reference/errors#e-atlas-connection-unavailable) | Un jeton de connexion du conteneur a été résolu avant que le boot ne l'ouvre, ou après que l'arrêt l'a fermé. |
| [`E_ATLAS_BOOT_FAILED`](/fr/reference/errors#e-atlas-boot-failed) | `AtlasProvider.boot()` n'a pas pu ouvrir une ou plusieurs des connexions configurées ; `cause` porte le premier échec. |
| [`E_ATLAS_READ_ONLY`](/fr/reference/errors#e-atlas-read-only) | Une écriture a tourné sur un query builder lié à une connexion ouverte avec `{ mode: 'read' }`. |
| [`E_ATLAS_INVALID_PRAGMA`](/fr/reference/errors#e-atlas-invalid-pragma) | Une clé ou une valeur de pragma SQLite sort de `[A-Za-z0-9_]`. |
| [`E_ATLAS_DB_DRIVER_NOT_FOUND`](/fr/reference/errors#e-atlas-db-driver-not-found) | Le driver de base Rust n'a pas pu être chargé, ou le binaire chargé est périmé ; `cause` porte l'échec du chargement. |
| [`E_ATLAS_NO_REPOSITORY`](/fr/reference/errors#e-atlas-no-repository) | `refresh()`, `fresh()`, `load()`, `loadCount()`, `loadAggregate()` ou `related()` a été appelé sur une entité qu'aucun repository n'a hydratée. |
| [`E_ATLAS_FILLABLE_AND_GUARDED`](/fr/reference/errors#e-atlas-fillable-and-guarded) | Un modèle déclare à la fois `static fillable` et `static guarded`. |
| [`E_ATLAS_INVALID_ENTITY_CLASS`](/fr/reference/errors#e-atlas-invalid-entity-class) | La cible d'une relation (ou son modèle intermédiaire) ne se résout pas en une sous-classe de `BaseEntity`. |
| [`E_ATLAS_INVALID_HOOK`](/fr/reference/errors#e-atlas-invalid-hook) | Un décorateur de hook n'est pas posé sur une méthode statique, ou `addHook()` a reçu autre chose qu'une fonction. |
| [`E_ATLAS_INVALID_DECORATOR`](/fr/reference/errors#e-atlas-invalid-decorator) | Un décorateur de colonne date a été posé ailleurs que sur une propriété de classe. |
| [`E_UNDEFINED_RELATIONSHIP`](/fr/reference/errors#e-undefined-relationship) | Un nom de relation que le modèle ne déclare pas (`load()`, `withCount()`, `whereHas()`…). |
| [`E_ATLAS_INVALID_RELATION`](/fr/reference/errors#e-atlas-invalid-relation) | Les métadonnées d'une relation n'ont pas ce que leur type exige : un `@ManyToMany` sans options de pivot, une relation through sans modèle intermédiaire. |
| [`E_ATLAS_RELATION_UNSUPPORTED_OPERATION`](/fr/reference/errors#e-atlas-relation-unsupported-operation) | `related()` a reçu une opération que sa relation n'a pas : une écriture sur `@BelongsTo` autre que `associate()` / `dissociate()`, une écriture sur une relation through (en lecture seule), une écriture groupée sur `@HasOne`. |
| [`E_ATLAS_ASSOCIATE_NULL`](/fr/reference/errors#e-atlas-associate-null) | `associate()` a reçu `null` ou `undefined` ; utilisez `dissociate()`. |
| [`E_ATLAS_PIVOT_KEY_COLLISION`](/fr/reference/errors#e-atlas-pivot-key-collision) | Les colonnes supplémentaires d'`attach()` / `sync()` nomment une clé du pivot ou une colonne d'horodatage du pivot. |
| [`E_ATLAS_COLUMN_ADAPTER`](/fr/reference/errors#e-atlas-column-adapter) | Un adaptateur `prepare` / `consume` de `@Column` a levé une erreur (`cause` la porte) ou a rendu une Promise. |
| [`E_ATLAS_HAS_ONE_MULTIPLE_ROWS`](/fr/reference/errors#e-atlas-has-one-multiple-rows) | Un preload `@HasOne` a trouvé plus d'une ligne liée pour un parent. |
| [`E_ATLAS_THROUGH_KEY_NOT_UNIQUE`](/fr/reference/errors#e-atlas-through-key-not-unique) | Le `secondLocalKey` d'une relation through correspond à plusieurs parents. |
| [`E_ATLAS_MULTIPLE_ROWS`](/fr/reference/errors#e-atlas-multiple-rows) | `sole()` a trouvé plus d'une ligne. |
| [`E_ATLAS_SUBQUERY_ALIAS`](/fr/reference/errors#e-atlas-subquery-alias) | `select()` a reçu une sous-requête non nommée avec `.as()`. |
| [`E_ATLAS_INVALID_ALIAS`](/fr/reference/errors#e-atlas-invalid-alias) | Un alias n'est pas un identifiant simple. |
| [`E_ATLAS_INVALID_EXPRESSION`](/fr/reference/errors#e-atlas-invalid-expression) | L'expression supplémentaire de `whereExpr()` contient des caractères interdits, des parenthèses déséquilibrées, un mot-clé SQL ou une fonction hors de la liste autorisée. |
| [`E_ATLAS_INVALID_JSON_PATH`](/fr/reference/errors#e-atlas-invalid-json-path) | Un chemin de `whereJsonPath()` ne commence pas par `$`. |
| [`E_ATLAS_INVALID_GROUP_LIMIT`](/fr/reference/errors#e-atlas-invalid-group-limit) | `groupLimit()` a reçu une valeur qui n'est pas un entier positif ou nul. |
| [`E_ATLAS_INVALID_LOCK`](/fr/reference/errors#e-atlas-invalid-lock) | `skipLocked()` / `noWait()` a été utilisé sans verrou de ligne de base. |
| [`E_ATLAS_INVALID_COMMENT`](/fr/reference/errors#e-atlas-invalid-comment) | Le texte de `comment()` contient `*/`. |
| [`E_ATLAS_INVALID_JOIN`](/fr/reference/errors#e-atlas-invalid-join) | Un `join()` sous forme de chaînes n'a pas d'opérande droite. |
| [`E_ATLAS_INVALID_AGGREGATE`](/fr/reference/errors#e-atlas-invalid-aggregate) | Un callback de `withAggregate()` n'a défini aucun agrégat. |
| [`E_ATLAS_INVALID_PLUCK`](/fr/reference/errors#e-atlas-invalid-pluck) | `pluck()` a lu une colonne dont la valeur est un objet ou une relation. |
| [`E_ATLAS_UNKNOWN_SCOPE`](/fr/reference/errors#e-atlas-unknown-scope) | `apply()` a atteint un scope que le modèle ne déclare pas, ou un modèle sans `static scopes`. |
| [`E_ATLAS_CURSOR_ORDER_REQUIRED`](/fr/reference/errors#e-atlas-cursor-order-required) | `cursorPaginate()` a été appelé sans colonne de tri. |
| [`E_ATLAS_INVALID_CURSOR`](/fr/reference/errors#e-atlas-invalid-cursor) | Un curseur de `cursorPaginate()` ne se décode pas, ou la longueur de son tuple ne correspond pas aux colonnes de tri. |
| [`E_ATLAS_EMPTY_UPDATE`](/fr/reference/errors#e-atlas-empty-update) | Le `update()` d'une requête de modèle a reçu un contenu vide. |
| [`E_ATLAS_QUERY_TIMEOUT`](/fr/reference/errors#e-atlas-query-timeout) | Une requête a duré plus longtemps que son `timeout(ms)`. |
| [`E_ATLAS_COMPILE_EMPTY`](/fr/reference/errors#e-atlas-compile-empty) | Le compilateur de requêtes n'a rendu aucune instruction. |
| [`E_ATLAS_SCHEMA_MISMATCH`](/fr/reference/errors#e-atlas-schema-mismatch) | `verifySchema()` en mode `throw` a trouvé un écart entre les modèles et la base ; le message liste les constats. |
| [`E_ATLAS_SCHEMA_DUMP_MANIFEST`](/fr/reference/errors#e-atlas-schema-dump-manifest) | Un manifeste de dump de schéma (`.meta.json`) n'est pas en version 1 avec un `schemaTableName`. |
| [`E_ATLAS_SCHEMA_DUMP_SEQUENCE`](/fr/reference/errors#e-atlas-schema-dump-sequence) | `schema:dump` a lu dans le catalogue un paramètre de séquence qui n'est pas un entier. |
| [`E_ATLAS_SCHEMA_DUMP_PRUNE`](/fr/reference/errors#e-atlas-schema-dump-prune) | `schema:dump --prune` a tourné sans `migrationsDir`. |
| [`E_ATLAS_SCHEMA_GENERATE_IDENTIFIER`](/fr/reference/errors#e-atlas-schema-generate-identifier) | `schema:generate` a lu un nom de table ou de colonne qui ne donne pas un identifiant TypeScript. |
| [`E_ATLAS_DB_ASSERTION`](/fr/reference/errors#e-atlas-db-assertion) | Une assertion de base (`assertHas`, `assertMissing`, `assertCount`, `assertEmpty`) n'est pas vérifiée. |
| [`E_ATLAS_FACTORY_NO_CONNECTION`](/fr/reference/errors#e-atlas-factory-no-connection) | Le `create()` d'une factory n'a pas de connexion : aucune passée, aucune liée avec `.client()` / `.connection()`. |
| [`E_ATLAS_FACTORY_STATE`](/fr/reference/errors#e-atlas-factory-state) | Un état de factory n'est pas défini. |
| [`E_ATLAS_FACTORY_UNKNOWN_RELATION`](/fr/reference/errors#e-atlas-factory-unknown-relation) | Le `with()` d'une factory nomme une relation que le modèle ne déclare pas, ou une relation sans factory liée. |
| [`E_ATLAS_FACTORY_PIVOT_LENGTH`](/fr/reference/errors#e-atlas-factory-pivot-length) | La longueur du tableau `pivotAttributes` d'une factory diffère du nombre de lignes liées. |
| [`E_ATLAS_FACTORY_UNSUPPORTED_RELATION`](/fr/reference/errors#e-atlas-factory-unsupported-relation) | Le `with()` d'une factory nomme un type de relation qu'elle ne sait pas construire (une relation through). |
| [`E_ATLAS_SEEDER_DIR_REQUIRED`](/fr/reference/errors#e-atlas-seeder-dir-required) | `testUtils().db().seed()` a tourné sans `seedersDir`. |
| [`E_ATLAS_INTERNAL`](/fr/reference/errors#e-atlas-internal) | Un invariant interne d'atlas a cassé : toujours un bug d'atlas. |

## Migration

- `AtlasError` disparaît : testez `error.code`, ou `error instanceof errors.E_…` avec `import { errors } from '@c9up/atlas'`. Son `hint` devient `help`.
- `EntityNotFoundError` devient `errors.E_ROW_NOT_FOUND`, `MassAssignmentError` devient `errors.E_MASS_ASSIGNMENT`, `OptimisticLockError` devient `errors.E_OPTIMISTIC_LOCK` et `RelationNotLoadedError` devient `errors.E_RELATION_NOT_LOADED` ; leurs champs ne changent pas, sauf ceux d'`E_ROW_NOT_FOUND` (ci-dessous).
- Un refus du compilateur Rust (`E_UNSAFE_*`, `E_INJECTION_PATTERN`, `E_UNSUPPORTED`…) porte désormais son code dans `error.code` ; son message ne commence plus par le code : testez `error.code` plutôt que le message.
- `error.name` est désormais le nom de la classe (`Exception` pour la plupart des codes), plus `AtlasError`.
- `E_ATLAS_INVALID_DATE_COLUMN_VALUE` devient `E_INVALID_DATE_COLUMN_VALUE`, `E_ATLAS_UNKNOWN_RELATION` devient `E_UNDEFINED_RELATIONSHIP`, `E_MIGRATION_LOCKED` devient `E_UNABLE_ACQUIRE_LOCK` et `E_ATLAS_MIGRATION_NOT_FOUND` devient `E_MISSING_SCHEMA_FILES`.
- Un nom de connexion non enregistré lève désormais `E_UNMANAGED_DB_CONNECTION` (« Cannot connect to unregistered connection `<nom>` ») ; `E_ATLAS_MISSING_CONNECTION` reste pour une connexion par défaut absente et un repository construit sans connexion.
- `E_ROW_NOT_FOUND` porte la classe du modèle dans `model` (c'était le nom de la classe dans `entityClass`), et son message est toujours « Row not found » : le critère de recherche reste dans `criteria` et n'atteint jamais le message, qu'un gestionnaire d'exceptions envoie au client.
- `E_MODEL_DELETED` dit « Cannot mutate delete model instance », et une migration réussie dont le verrou a été libéré pendant l'exécution échoue désormais avec `E_UNABLE_RELEASE_LOCK`.

## Voir aussi

- [Introduction à l'ORM](/fr/guides/database/orm/)
- [Entités](/fr/guides/database/orm/entities)
- [Query builder](/fr/guides/database/orm/query-builder)
- [Repositories](/fr/guides/database/orm/repositories)
- [Relations](/fr/guides/database/orm/relations)
- [Migrations](/fr/guides/database/orm/migrations)
- [Schema builder](/fr/guides/database/orm/schema-builder)
- [Seeders](/fr/guides/database/orm/seeders)
- [Factories](/fr/guides/database/orm/factories)
- [Transactions et verrous](/fr/guides/database/orm/transactions-and-locks)
- [Sécurité SQL](/fr/guides/database/orm/security)
- [Commandes de base de données](/fr/guides/command-line/database)
