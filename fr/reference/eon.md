# eon

`@c9up/eon` : la couche séries temporelles sur TDengine : entités super-tables, ingestion colonnaire, constructeur de requêtes fenêtrées, migrations, abonnements aux changements et aides de test, sur une connexion WebSocket à taosAdapter. Guide : [Séries temporelles](/fr/guides/database/time-series/).

## Installation

```bash
pnpm add @c9up/eon
```

`ream configure @c9up/eon` enregistre le provider, écrit `config/timeseries.ts` et ajoute `TDENGINE_URL`, `TDENGINE_USER`, `TDENGINE_PASSWORD` et `TDENGINE_DATABASE` au `.env` avec leurs règles de validation. `@c9up/eon/testing/vitest` demande `vitest` (pair facultatif).

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/eon` | Décorateurs, `SuperTableRepository`, `TimeSeriesQuery`, aides d'ingestion, schéma et migrations, la connexion, le consommateur, `EonProvider`, les types |
| `@c9up/eon/provider` | `EonProvider` (export par défaut) |
| `@c9up/eon/services/connection` | La connexion par défaut (export par défaut), `setConnection`, `getConnection`, `clearConnection` |
| `@c9up/eon/schema` | `EonSchema`, les constructeurs, `Migration`, `EonMigrationRunner`, `migrateChildTableNames`, les types de spécification, `TYPE_KIND_MAP` |
| `@c9up/eon/tmq` | `connectWsConsumer`, `EonConsumer` et ses types, `EonConsumerError` |
| `@c9up/eon/health` | `EonConnectionCheck`, `EonHealthResult` |
| `@c9up/eon/testing` | `FakeEonConnection`, `FakeEonConsumer`, `factory`, les aides de base de test |
| `@c9up/eon/testing/vitest` | `describeIfTdengine` |
| `@c9up/eon/configure` | `configure(codemods)`, lancé par `ream configure` |

## Exports

### `@c9up/eon`

La racine réexporte aussi tout `@c9up/eon/schema`, `@c9up/eon/tmq` et `@c9up/eon/health`, décrits plus bas.

| Export | Nature | Description |
|---|---|---|
| `SuperTable` | fonction | `SuperTable(name: string): ClassDecorator` : la classe est une super-table. |
| `Timestamp` | fonction | `Timestamp(options?: EonColumnOptions): PropertyDecorator` : la colonne d'horodatage. |
| `Column` | fonction | `Column(options?: EonColumnOptions): PropertyDecorator` : une colonne de mesure. |
| `Tag` | fonction | `Tag(options?: EonTagOptions): PropertyDecorator` : un tag ; les valeurs des tags dirigent un point vers sa table enfant. |
| `getSuperTableMetadata` | fonction | `getSuperTableMetadata(target: object): SuperTableMetadata \| undefined`. |
| `getTimestampColumn` | fonction | `getTimestampColumn(target: object): string \| undefined`. |
| `getColumnMetadata` | fonction | `getColumnMetadata(target: object): EonColumnMetadata[]`. |
| `getTagMetadata` | fonction | `getTagMetadata(target: object): EonTagMetadata[]`. |
| `SuperTableRepository` | classe | Ingestion et requêtes sur une super-table. |
| `TimeSeriesQuery` | classe | Constructeur de requêtes fenêtrées ; l'attendre l'exécute. |
| `TimeSeriesWhere` | classe | La partie WHERE d'une requête, le type d'un groupe `where(callback)`. |
| `syncSuperTable` | fonction | `syncSuperTable(conn: EonConnection, EntityClass: SuperTableClass): Promise<void>` : crée la super-table d'une classe si elle manque. |
| `dropSuperTable` | fonction | `dropSuperTable(conn: EonConnection, EntityClass: SuperTableClass): Promise<void>`. |
| `createChildTable` | fonction | `createChildTable(conn: EonConnection, options: CreateChildTableOptions): Promise<void>`. |
| `childTableName` | fonction | `childTableName(stableOrEntity: string \| SuperTableClass, tagValues: unknown[]): string` : le nom déterministe de la table enfant d'un jeu de tags. |
| `legacyChildTableName` | fonction | Même signature : le nom que dérivaient les versions précédentes, pour `migrateChildTableNames`. |
| `compileCreateStableSpec` | fonction | `compileCreateStableSpec(EntityClass: SuperTableClass): CreateStableSpec`. |
| `requireSuperTableName` | fonction | `requireSuperTableName(EntityClass: SuperTableClass): string` ; lève `E_EON_NOT_A_SUPERTABLE`. |
| `buildColumnarIngest` | fonction | `buildColumnarIngest(plan: ColumnarPlan, points: readonly IngestPoint[]): EonColumnarIngest`. |
| `compileStmtTemplate` | fonction | `compileStmtTemplate(stable: string, tagColumns: readonly string[], columns: readonly string[]): string`. |
| `groupByChild` | fonction | `groupByChild(stable: string, tagProperties: readonly string[], points: readonly IngestPoint[])` : les points groupés par table enfant. |
| `toBindKind` | fonction | `toBindKind(logicalType: string \| undefined, property: string): EonBindKind`. |
| `buildLiteralInserts` | fonction | `buildLiteralInserts(plan: ColumnarPlan, points: readonly IngestPoint[]): string[]` : un `INSERT … USING … TAGS … VALUES` par table enfant. |
| `toLineProtocol` | fonction | `toLineProtocol(plan: ColumnarPlan, points: readonly IngestPoint[]): string[]`. |
| `DEFAULT_BATCH_SIZE` | constante | `4096` lignes par enfant et par liaison. |
| `compileStatementNative` | fonction | `compileStatementNative(spec: object, dialect?: EonDialect): CompiledStatement` : le compilateur Rust. |
| `quoteIdentNative` | fonction | `quoteIdentNative(name: string): string`. |
| `connectWsEon` | fonction | `connectWsEon(config: EonConnectionConfig): Promise<EonConnection>` : ouvre une connexion WebSocket, en réessayant la première connexion selon la configuration. |
| `destroyEonConnector` | fonction | `destroyEonConnector(): Promise<void>` : conservée sans effet ; chaque connexion libère sa socket à `close()`. |
| `ensureDatabase` | fonction | `ensureDatabase(config: EonConnectionConfig, connect: EonConnector): Promise<void>` : crée `config.database` selon `createDatabase`. |
| `defineConfig` | fonction | `defineConfig(config: EonConfig): EonConfig`. |
| `EonProvider` | provider | La même classe que `@c9up/eon/provider`. |
| `EonConnectionError` | erreur | Une panne de connexion ou du serveur ; `code` porte le code numérique de TDengine quand il y en a un. |
| `EonConnection` | interface | `{ transport; exec(sql); query<T>(sql); ping(); ingestColumnar(request); schemaless(lines, options?); close() }`. |
| `EonConfig` | interface | `EonConnectionConfig & { default?; connections?; migrationsDir? }`. |
| `EonConnectionConfig` | interface | Les réglages d'une connexion (voir Configuration). |
| `EonColumnOptions` | interface | `{ type?: string; length?: number; precision?: number; scale?: number; nullable?: boolean }`. |
| `EonTagOptions` | type | `EonColumnOptions` sans `nullable`. |
| `EonColumnMetadata` / `EonTagMetadata` / `SuperTableMetadata` | interface | Ce qu'enregistrent les décorateurs. |
| `SuperTableClass` | type | Un constructeur décoré par `@SuperTable`. |
| `SuperTableRepositoryOptions` | interface | `{ batchSize?: number }`. |
| `IngestPoint` | type | `Record<string, unknown>`. |
| `ColumnarPlan` / `PlanColumn` | interface | Le plan d'ingestion d'une super-table. |
| `EonColumnarIngest` / `EonChildBatch` / `EonBoundColumn` / `EonBindKind` | interface / type | La requête colonnaire que lie une connexion. |
| `EonLineProtocol` | type | `'influxdb' \| 'opentsdb-telnet' \| 'opentsdb-json'`. |
| `EonSchemalessPrecision` | type | `'hours' \| 'minutes' \| 'seconds' \| 'milliseconds' \| 'microseconds' \| 'nanoseconds'`. |
| `EonSchemalessOptions` | interface | `{ protocol?: EonLineProtocol; precision?: EonSchemalessPrecision; ttl?: number }` ; par défaut `influxdb`, `milliseconds`, `0`. |
| `CompiledStatement` | interface | `{ statements: string[]; params: unknown[] }`. |
| `EonDialect` | type | `'tdengine'`. |
| `EonScalar` | type | `string \| number \| bigint \| boolean \| null`. |
| `EonWhereValue` | type | `EonScalar \| readonly EonScalar[]`. |
| `EonWhereOperator` | type | `=`, `!=`, `<>`, `>`, `>=`, `<`, `<=`, `LIKE`, `NOT LIKE`, `IN`, `NOT IN`, `IS NULL`, `IS NOT NULL`. |
| `EonWhereCallback` | type | `(query: TimeSeriesWhere) => void`. |
| `EonFillMode` | type | `'none' \| 'null' \| 'prev' \| 'next' \| 'linear' \| 'value'`. |
| `EonOrderDirection` | type | `'asc' \| 'desc'`. |
| `EonSelectItem` | type | `string \| EonFunctionSelect \| EonPseudoSelect`. |
| `EonFunctionSelect` | interface | `{ fn: string; column: string; as?: string }` ; `fn` vaut `avg`, `sum`, `min`, `max`, `count`, `first`, `last`, `last_row`, `spread` ou `twa`. |
| `EonPseudoSelect` | interface | `{ pseudo: string; as?: string }` ; `_wstart`, `_wend`, `_wduration` ou `tbname`. |
| `CreateChildTableOptions` | interface | `{ stable?: string; EntityClass?: SuperTableClass; name: string; tags: unknown[]; ifNotExists?: boolean }`. |
| `EonAppContext` | interface | L'hôte dont le provider a besoin. |
| `EonConnector` | type | `(config: EonConnectionConfig) => Promise<EonConnection>`. |
| `EonService` | interface | `{ compile(spec: object, dialect?: EonDialect): CompiledStatement }`, lié sous `eon.compiler`. |
| `EonDatabaseOptions` | interface | `{ keep?; duration?; precision?: EonPrecision; buffer?; walLevel?: 1 \| 2; cachemodel?: EonCacheModel }`. |
| `EonAlterDatabaseOptions` | interface | `{ keep?; buffer?; walLevel?; cachemodel?; replica?; minrows? }`. |
| `EonPrecision` | type | `'ms' \| 'us' \| 'ns'`. |
| `EonCacheModel` | type | `'none' \| 'last_row' \| 'last_value' \| 'both'`. |
| `EonLogicalType` | type | Les types de colonne qu'acceptent un décorateur ou un constructeur (`timestamp`, `int`, `bigint`, `float`, `double`, `bool`, `varchar`, `nchar`, `binary`, `varbinary`, `json`, `decimal`…). |
| `EonColumnSpec` | interface | `{ name; kind; length; precision; scale }`. |
| `CreateStableSpec` / `AlterStableSpec` / `DropStableSpec` / `CreateChildTableSpec` / `CreateDatabaseSpec` / `AlterDatabaseSpec` / `CreateTableSpec` / `DropTableSpec` / `AlterChange` | interface / type | Les spécifications d'instruction que prend le compilateur. |
| `AlterTypeSetter` / `StableColumnHandle` | interface | Rendus par les constructeurs de modification et de création. |

### `@c9up/eon/provider`

| Export | Nature | Description |
|---|---|---|
| `default` (`EonProvider`) | provider | `new EonProvider(app: EonAppContext, connect?: EonConnector)`. `register()` lie les jetons ; `boot()` lit `config/timeseries.ts` (ou la clé `eon`), crée la base si demandé, ouvre chaque connexion, installe celle par défaut sur `services/connection` et inscrit le runner de migrations d'eon dans le registre `migrations` de ream ; rien n'est ouvert quand l'application tourne en mode inspection. `shutdown()` ferme chaque connexion. |

### `@c9up/eon/services/connection`

| Export | Nature | Description |
|---|---|---|
| `default` | constante | L'`EonConnection` par défaut ; lire un membre avant le démarrage lève une erreur. |
| `setConnection` | fonction | `setConnection(connection: EonConnection): void`. |
| `getConnection` | fonction | `getConnection(): EonConnection \| undefined`. |
| `clearConnection` | fonction | `clearConnection(connection: EonConnection): void` : la retire s'il s'agit de celle-ci. |

### `@c9up/eon/schema`

| Export | Nature | Description |
|---|---|---|
| `EonSchema` | classe | Recueille le DDL : `createStable`, `alterStable`, `dropStable`, `createDatabase`, `alterDatabase`, `createTable`, `dropTable`, `raw`, puis `toSQL()`. |
| `StableBuilder` | classe | Colonnes et tags d'une super-table. |
| `BasicTableBuilder` | classe | Colonnes d'une table simple. |
| `AlterStableBuilder` | classe | `addColumn`, `modifyColumn`, `dropColumn`, `addTag`, `modifyTag`, `dropTag`, `renameTag`. |
| `Migration` | classe | Base abstraite d'une migration : `up()`, `down()`, `this.schema`, `raw(sql)`. |
| `EonMigrationRunner` | classe | Exécute les migrations d'un répertoire sur une connexion. |
| `migrateChildTableNames` | fonction | `migrateChildTableNames(conn: EonConnection, EntityClass: SuperTableClass, options?: MigrateChildTableNamesOptions): Promise<ChildTableMigrationReport>` : renomme les tables enfants nommées à l'ancienne façon. |
| `TYPE_KIND_MAP` | constante | Du nom de type logique vers la nature du compilateur. |
| `EonMigrationOptions` | interface | `{ migrationsDir?: string; tableName?: string; disableLocks?: boolean }`. |
| `MigrationState` | type | `'applied' \| 'pending'`. |
| `MigrationStatus` | interface | `{ name: string; status: MigrationState; batch?: number }`. |
| `ChildTableRename` | interface | `{ from: string; to: string; tags: readonly unknown[] }`. |
| `ChildTableMigrationReport` | interface | `{ renamed: readonly ChildTableRename[]; current: readonly string[]; unmatched: readonly string[] }`. |
| `MigrateChildTableNamesOptions` | interface | `{ dryRun?: boolean }`. |
| `CreateStableSpec` / `CreateTableSpec` | interface | Spécifications, comme à la racine. |

### `@c9up/eon/tmq`

| Export | Nature | Description |
|---|---|---|
| `connectWsConsumer` | fonction | `connectWsConsumer(config: EonConsumerConfig): Promise<EonConsumer>` : un consommateur d'abonnements sur WebSocket. |
| `EonConsumer` | interface | `subscribe(topics)`, `subscription()`, `poll<T>(timeoutMs): Promise<EonMessage<T>[]>`, `commit()`, `assignment(topics?)`, `seek(partition)`, `unsubscribe()`, `close()`. |
| `EonConsumerConfig` | interface | `{ url; groupId; clientId?; user?; password?; token?; offsetReset?: EonOffsetReset; autoCommit?; autoCommitIntervalMs?; withTableName? }`. |
| `EonMessage` | interface | `{ topic: string; rows: T[] }`. |
| `EonTopicPartition` | interface | `{ topic: string; vgroupId: number; offset?: bigint; begin?: bigint; end?: bigint }`. |
| `EonOffsetReset` | type | `'earliest' \| 'latest' \| 'none'`. |
| `EonConsumerError` | erreur | Une panne du consommateur ; `code` porte le code numérique de TDengine quand il y en a un. |

### `@c9up/eon/health`

| Export | Nature | Description |
|---|---|---|
| `EonConnectionCheck` | classe | `new EonConnectionCheck(conn: EonConnection)`, nommé `TDengine connection check` : `as(name)`, `cacheFor(seconds)`, `warnWhenSlowerThan(milliseconds)`, `run(): Promise<EonHealthResult>`. |
| `EonHealthResult` | interface | `{ message; status: 'ok' \| 'warning' \| 'error'; finishedAt: Date; meta? }`. |

### `@c9up/eon/testing`

| Export | Nature | Description |
|---|---|---|
| `FakeEonConnection` | classe | Une `EonConnection` en mémoire : enregistre `statements`, garde les lignes ingérées (`rows(table)`), répond aux SELECT simples ; `reset()`. `new FakeEonConnection(options?: { precision?: EonPrecision })`. |
| `FakeEonConsumer` | classe | Un `EonConsumer` en mémoire : `push(...messages)`, `committedCount`, `isClosed`. |
| `factory` | fonction | `factory<T>(EntityClass, defaults: () => Record<string, unknown>): FactoryBuilder<T>`. |
| `FactoryBuilder` | interface | `merge`, `state`, `apply`, `make`, `makeMany`, `makeStubbed`, `create(conn)`, `createMany(count, conn)`. |
| `hasTestServer` | fonction | `hasTestServer(): boolean` : `EON_TEST_URL` est défini. |
| `connectTestEon` | fonction | `connectTestEon(overrides?: Partial<EonConnectionConfig>): Promise<EonConnection>` : se connecte à `EON_TEST_URL`. |
| `resetDatabase` | fonction | `resetDatabase(conn: EonConnection, db: string): Promise<void>` : supprime puis recrée une base. |
| `createTestDatabase` | fonction | `createTestDatabase(conn, database, options?: { keepMs?: number }): Promise<void>`. |
| `dropTestDatabase` | fonction | `dropTestDatabase(conn, database): Promise<void>`. |
| `dropTestTopic` | fonction | `dropTestTopic(conn, topic, options?: { retries?: number; delayMs?: number }): Promise<void>`. |
| `withTestDatabase` | fonction | `withTestDatabase<T>(conn, database, body: () => Promise<T>): Promise<T>` : crée, exécute, supprime. |
| `FakeEonConnectionOptions` | interface | `{ precision?: EonPrecision }`, `ms` par défaut. |

### `@c9up/eon/testing/vitest`

| Export | Nature | Description |
|---|---|---|
| `describeIfTdengine` | fonction | `describeIfTdengine(name: string, factory: () => void): void` : une suite qui ne tourne que si `EON_TEST_URL` est défini. |

### `SuperTableRepository`

`new SuperTableRepository(entityClass: SuperTableClass, conn: EonConnection, options?: SuperTableRepositoryOptions)`.

| Membre | Signature | Description |
|---|---|---|
| `query` | `query(): TimeSeriesQuery<Record<string, unknown>>` ou `query<E>(mapPoint: (row) => E): TimeSeriesQuery<E>` | Une requête sur la super-table. |
| `ingest` | `ingest(point: IngestPoint): Promise<void>` | Un point. |
| `ingestMany` | `ingestMany(points: readonly IngestPoint[]): Promise<{ rowsAffected: number }>` | Ingestion STMT colonnaire, groupée par table enfant : le chemin par défaut en masse. |
| `ingestSql` | `ingestSql(points: readonly IngestPoint[]): Promise<{ rowsAffected: number }>` | Instructions `INSERT` littérales. |
| `ingestSchemaless` | `ingestSchemaless(points: readonly IngestPoint[], options?: EonSchemalessOptions): Promise<void>` | Line protocol ; plus lent qu'`ingestMany`. |

### `TimeSeriesQuery`

| Membre | Signature | Description |
|---|---|---|
| `where` / `andWhere` / `orWhere` | `where(column: string, operator: EonWhereOperator, value: EonWhereValue): this` | Aussi `(column, value)` et `(callback)` pour un groupe. |
| `whereNull` / `whereNotNull` | `whereNull(column: string): this` | |
| `whereBetween` | `whereBetween(column: string, range: readonly [EonScalar, EonScalar]): this` | |
| `select` | `select(items: readonly EonSelectItem[]): this` | Colonnes, fonctions permises, pseudo-colonnes. |
| `interval` | `interval(value: string, offset?: string): this` | Taille de fenêtre (`'1m'`, `'1h'`). |
| `sliding` | `sliding(value: string): this` | Demande `interval`. |
| `fill` | `fill(mode: EonFillMode, ...values: readonly EonScalar[]): this` | Demande `interval`. |
| `partitionBy` | `partitionBy(...columns: readonly string[]): this` | |
| `orderBy` | `orderBy(column: string, direction?: EonOrderDirection): this` | `asc` par défaut. |
| `limit` / `offset` | `limit(n: number): this` | `offset` demande `limit`. |
| `toSQL` | `toSQL(): { sql: string; params: unknown[] }` | |
| `exec` / `all` | `exec(): Promise<TPoint[]>` | Exécutée aussi par `await`. |
| `first` | `first(): Promise<TPoint \| null>` | |

### `EonMigrationRunner`

`new EonMigrationRunner(conn: EonConnection, options?: EonMigrationOptions)` ; répertoire `database/eon-migrations` et table `ream_eon_migrations` par défaut.

| Membre | Signature | Description |
|---|---|---|
| `init` | `init(): Promise<void>` | Crée la table de suivi. |
| `status` | `status(): Promise<MigrationStatus[]>` | |
| `migrate` | `migrate(): Promise<string[]>` | Exécute les migrations en attente. |
| `rollback` | `rollback(): Promise<string[]>` | Annule le dernier lot. |
| `reset` | `reset(): Promise<string[]>` | Annule tout. |
| `refresh` / `fresh` | `refresh(): Promise<{ rolled: string[]; executed: string[] }>` | Annule tout, puis migre. |
| `dryRun` | `dryRun(): Promise<Array<{ name: string; sql: string[] }>>` | Le SQL qu'exécuteraient les migrations en attente. |
| `forceUnlock` | `forceUnlock(): Promise<boolean>` | Retire un verrou de migration resté en place. |

## Configuration

`config/timeseries.ts`, lu sous la clé `timeseries` (la clé `eon` est lue en son absence).

| Option | Type | Défaut | Description |
|---|---|---|---|
| `url` | `string` | — | URL WebSocket de taosAdapter, `ws://localhost:6041`. |
| `user` / `password` | `string` | — | Identifiants. |
| `token` | `string` | — | Jeton bearer, à la place de l'utilisateur et du mot de passe. |
| `database` | `string` | — | Base à sélectionner (`USE`) à la connexion. |
| `createDatabase` | `boolean \| EonDatabaseOptions` | non défini | Crée `database` avant que la première connexion la sélectionne. La configuration générée passe `{ precision: 'ms' }`. |
| `timeoutMs` | `number` | `60000` | Délai par requête, et délai de connexion. |
| `connectRetries` | `number` | `0` | Tentatives supplémentaires de la première connexion. |
| `connectBackoffMs` | `number` | `200` | Base de l'attente exponentielle entre elles, plafonnée à 30 s. |
| `default` | `string` | `'primary'` | Connexion par défaut quand `connections` est défini. |
| `connections` | `Record<string, EonConnectionConfig>` | — | Connexions nommées. |
| `migrationsDir` | `string` | `'database/eon-migrations'` | Les migrations d'eon, à part de celles d'atlas. |

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `'eon'` | L'`EonConnection` par défaut, une fois ouverte par `boot()` |
| `'eon.connection'` | La même connexion |
| `'eon:<nom>'` | Une connexion nommée |
| `'eon.compiler'` | `EonService` |

`eon`, `eon.connection` et `eon.compiler` sont typés sur `ContainerBindings` dès que `@c9up/eon` est importé.

## Erreurs

La plupart des refus sont des `Error` simples dont le message commence par `[CODE]` ; ceux du compilateur de requêtes commencent par `CODE:`. Les pannes de connexion et du consommateur sont des `EonConnectionError` et des `EonConsumerError`.

| Code | Levée quand |
|---|---|
| [`E_EON_MISSING_CONNECTION`](/fr/reference/errors#e-eon-missing-connection) | Un repository n'a pas de connexion sur laquelle tourner. |
| [`E_EON_NOT_A_SUPERTABLE`](/fr/reference/errors#e-eon-not-a-supertable) | Une classe utilisée comme super-table n'est pas décorée avec `@SuperTable`. |
| [`E_EON_NO_TAGS`](/fr/reference/errors#e-eon-no-tags) | Une super-table n'a pas de colonne `@Tag` : une table enfant ne peut pas être routée. |
| [`E_EON_NO_TIMESTAMP`](/fr/reference/errors#e-eon-no-timestamp) | Une super-table n'a pas de colonne `@Timestamp`. |
| [`E_EON_CHILD_STABLE`](/fr/reference/errors#e-eon-child-stable) | `createChildTable()` n'a reçu ni `stable` ni `EntityClass`. |
| [`E_EON_CHILD_COLLISION`](/fr/reference/errors#e-eon-child-collision) | Deux jeux de tags distincts mènent à la même table enfant ; eon refuse d'écrire des lignes discordantes sous un seul jeu de tags. |
| [`E_EON_CHILD_MIGRATION`](/fr/reference/errors#e-eon-child-migration) | `migrateChildTableNames()` a lu une ligne de la liste des enfants sans nom de table. |
| [`E_EON_BATCH_SIZE`](/fr/reference/errors#e-eon-batch-size) | `batchSize` n'est pas un entier positif. |
| [`E_EON_BIND`](/fr/reference/errors#e-eon-bind) | Une valeur ne peut pas être écrite telle quelle dans son paramètre STMT : mauvais type, ou décimal que la colonne ne peut pas tenir exactement. |
| [`E_EON_SERVER_VERSION`](/fr/reference/errors#e-eon-server-version) | Le chemin STMT en colonnes demande TDengine 3.3.6.0 ou plus récent (stmt2). |
| [`E_EON_TYPE`](/fr/reference/errors#e-eon-type) | Une colonne ou un tag a un type inconnu ou absent. |
| [`E_EON_TS_TYPE`](/fr/reference/errors#e-eon-ts-type) | Un timestamp n'est ni un bigint ni un nombre entier sûr. |
| [`E_EON_PARAM_PRECISION`](/fr/reference/errors#e-eon-param-precision) | Un timestamp numérique n'est pas un entier sûr ; passez les timestamps en nanosecondes en bigint. |
| [`E_EON_VALUE_TYPE`](/fr/reference/errors#e-eon-value-type) | Une colonne entière a reçu autre chose qu'un entier sûr ou un bigint. |
| [`E_EON_VALUE_RANGE`](/fr/reference/errors#e-eon-value-range) | Une valeur sort de la plage du type de sa colonne ; le connecteur la tronquerait sans le dire. |
| [`E_EON_TEMPLATE`](/fr/reference/errors#e-eon-template) | Le compilateur n'a rendu aucune instruction pour le template d'insertion STMT. |
| [`E_EON_LITERAL_INSERT`](/fr/reference/errors#e-eon-literal-insert) | Une insertion littérale pour une table enfant s'est compilée en autre chose qu'une seule instruction. |
| [`E_EON_HYDRATE_BIGINT`](/fr/reference/errors#e-eon-hydrate-bigint) | Une colonne bigint ou timestamp est revenue avec une valeur non entière. |
| [`E_EON_DECODE`](/fr/reference/errors#e-eon-decode) | Une réponse du serveur ou un bloc de résultat ne suit pas le protocole (tronqué, type inconnu, lignes sans métadonnées de colonnes) ; une trame qui ne peut plus être crue ferme la connexion. |
| [`E_EON_TIMEOUT`](/fr/reference/errors#e-eon-timeout) | Une requête à TDengine n'a pas eu de réponse dans le délai `timeoutMs`. |
| [`E_EON_CLOSED`](/fr/reference/errors#e-eon-closed) | La connexion TDengine s'est fermée alors qu'une requête attendait, ou une requête a été envoyée sur une connexion fermée. |
| [`E_EON_CONNECT`](/fr/reference/errors#e-eon-connect) | Le WebSocket vers taosAdapter n'a pas pu s'ouvrir : URL invalide, connexion refusée, ou pas de handshake dans le délai. |
| [`E_EON_SCHEMALESS_SCHEMA`](/fr/reference/errors#e-eon-schemaless-schema) | Un type de champ n'a pas de forme line-protocol. |
| [`E_EON_SCHEMALESS_FIELD`](/fr/reference/errors#e-eon-schemaless-field) | Une valeur de champ line-protocol sort de la plage de son type. |
| [`E_EON_SCHEMALESS_TAG`](/fr/reference/errors#e-eon-schemaless-tag) | Une valeur de tag line-protocol ne peut pas être écrite. |
| [`E_EON_SCHEMALESS_EMPTY_TAG`](/fr/reference/errors#e-eon-schemaless-empty-tag) | Une valeur de tag line-protocol est vide. |
| [`E_EON_SCHEMALESS_NO_FIELDS`](/fr/reference/errors#e-eon-schemaless-no-fields) | Un point line-protocol n'a aucun champ. |
| [`E_EON_SCHEMALESS_MEASUREMENT`](/fr/reference/errors#e-eon-schemaless-measurement) | Le nom de la super-table (measurement) est vide. |
| [`E_EON_SCHEMALESS_CONTROL_CHAR`](/fr/reference/errors#e-eon-schemaless-control-char) | Un nom ou une valeur line-protocol contient une fin de ligne ou un caractère de contrôle ; il est refusé, pas échappé. |
| [`E_EON_INVALID_VALUE`](/fr/reference/errors#e-eon-invalid-value) | `where()` à un argument prend un callback qui remplit un groupe. |
| [`E_EON_EMPTY_WHERE_GROUP`](/fr/reference/errors#e-eon-empty-where-group) | Un groupe `where(callback)` n'a ajouté aucun prédicat. |
| [`E_EON_INVALID_LIMIT`](/fr/reference/errors#e-eon-invalid-limit) | `limit()` a reçu une valeur qui n'est pas un entier positif ou nul. |
| [`E_EON_INVALID_OFFSET`](/fr/reference/errors#e-eon-invalid-offset) | `offset()` a reçu une valeur qui n'est pas un entier positif ou nul. |
| [`E_EON_COMPILE_EMPTY`](/fr/reference/errors#e-eon-compile-empty) | Le compilateur n'a rendu aucune instruction SQL. |
| [`E_EON_UNEXPECTED_PARAMS`](/fr/reference/errors#e-eon-unexpected-params) | Une requête temporelle s'est compilée avec des paramètres liés là où du SQL littéral est attendu. |
| [`E_EON_INTERNAL`](/fr/reference/errors#e-eon-internal) | Un invariant interne d'eon a cassé : toujours un bug d'eon. |
| [`E_EON_ALTER_DB_ONE_OPTION`](/fr/reference/errors#e-eon-alter-db-one-option) | `alterDatabase()` prend exactement une option. |
| [`E_EON_MIGRATION_INVALID`](/fr/reference/errors#e-eon-migration-invalid) | La table de suivi des migrations contient un `executed_at` illisible. |
| [`E_EON_MIGRATION_LOCKED`](/fr/reference/errors#e-eon-migration-locked) | Une autre exécution tient le verrou de migration. |
| [`E_EON_FACTORY_STATE`](/fr/reference/errors#e-eon-factory-state) | Un état de factory n'est pas défini. |
| [`E_EON_FAKE_UNSUPPORTED`](/fr/reference/errors#e-eon-fake-unsupported) | `FakeEonConnection` ne répond qu'aux SELECT simples ; le SQL fenêtré ou agrégé exige un TDengine réel. |
| [`E_EON_TEST_IDENTIFIER`](/fr/reference/errors#e-eon-test-identifier) | Un helper de nettoyage de test a reçu un nom qui n'est pas un identifiant simple. |
| [`E_EON_NAPI_NOT_FOUND`](/fr/reference/errors#e-eon-napi-not-found) | Le binaire du compilateur de requêtes eon est introuvable. |
| [`E_EON_NAPI_UNSUPPORTED`](/fr/reference/errors#e-eon-napi-unsupported) | Il n'existe pas de binaire du compilateur de requêtes eon pour cette plateforme. |
| [`E_EON_INVALID_DURATION`](/fr/reference/errors#e-eon-invalid-duration) | Une durée n'est pas un entier positif suivi d'une unité. |
| [`E_EON_INVALID_FILL`](/fr/reference/errors#e-eon-invalid-fill) | Un mode `FILL` n'est pas connu de TDengine, ou il lui manque sa valeur. |
| [`E_EON_FILL_REQUIRES_INTERVAL`](/fr/reference/errors#e-eon-fill-requires-interval) | `FILL` a été utilisé sans `INTERVAL`. |
| [`E_EON_SLIDING_REQUIRES_INTERVAL`](/fr/reference/errors#e-eon-sliding-requires-interval) | `SLIDING` a été utilisé sans `INTERVAL`. |
| [`E_EON_OFFSET_REQUIRES_LIMIT`](/fr/reference/errors#e-eon-offset-requires-limit) | `OFFSET` a été utilisé sans `LIMIT`. |
| [`E_EON_INVALID_ORDER_DIRECTION`](/fr/reference/errors#e-eon-invalid-order-direction) | Une direction de tri n'est ni `asc` ni `desc`. |
| [`E_EON_INVALID_PSEUDO_COLUMN`](/fr/reference/errors#e-eon-invalid-pseudo-column) | Une pseudo-colonne n'est pas de celles qu'eon autorise. |
| [`E_EON_INVALID_SELECT`](/fr/reference/errors#e-eon-invalid-select) | Une expression de sélection ne peut pas être compilée. |
| [`E_EON_INVALID_SELECT_FUNCTION`](/fr/reference/errors#e-eon-invalid-select-function) | Une sélection nomme une fonction qu'eon n'autorise pas. |
| [`E_EON_INVALID_DB_OPTION`](/fr/reference/errors#e-eon-invalid-db-option) | Une valeur d'option de base est invalide. |
| [`E_EON_UNKNOWN_DB_OPTION`](/fr/reference/errors#e-eon-unknown-db-option) | Une option de base n'est pas modifiable (`KEEP`, `BUFFER`, `WAL_LEVEL`, `CACHEMODEL`, `REPLICA`, `MINROWS`). |
| [`E_EON_IMMUTABLE_DB_OPTION`](/fr/reference/errors#e-eon-immutable-db-option) | Une option de base est fixée au CREATE et ne peut pas être modifiée. |
| [`E_EON_INVALID_TTL`](/fr/reference/errors#e-eon-invalid-ttl) | Le TTL d'une table enfant n'est pas un nombre entier de jours positif ou nul. |
| [`E_EON_INVALID_WAL_LEVEL`](/fr/reference/errors#e-eon-invalid-wal-level) | Un `WAL_LEVEL` n'est pas accepté par TDengine. |
| [`E_EON_INVALID_CACHEMODEL`](/fr/reference/errors#e-eon-invalid-cachemodel) | Un `CACHEMODEL` n'est pas accepté par TDengine. |
| [`E_EON_INVALID_PRECISION`](/fr/reference/errors#e-eon-invalid-precision) | Une précision de base n'est ni `ms`, ni `us`, ni `ns`. |
| [`E_EON_KEEP_TOO_SMALL`](/fr/reference/errors#e-eon-keep-too-small) | `KEEP` est inférieur à trois fois `DURATION`. |
| [`E_TS_REQUIRED`](/fr/reference/errors#e-ts-required) | La première colonne d'une super-table n'est pas un TIMESTAMP. |
| [`E_TAGS_REQUIRED`](/fr/reference/errors#e-tags-required) | Une super-table ne déclare aucun tag. |
| [`E_JSON_TAG_RULE`](/fr/reference/errors#e-json-tag-rule) | JSON est réservé aux tags et doit être le seul tag. |
| [`E_TYPE_NOT_TAGGABLE`](/fr/reference/errors#e-type-not-taggable) | Un type qui ne peut pas être un tag (DECIMAL) est utilisé comme tag. |
| [`E_LENGTH_REQUIRED`](/fr/reference/errors#e-length-required) | Un type qui exige une longueur (`BINARY(n)`, `NCHAR(n)`…) n'en a pas reçu. |
| [`E_NAME_COLLISION`](/fr/reference/errors#e-name-collision) | Un nom figure plusieurs fois parmi les colonnes de tags et de valeurs du template STMT. |
| [`E_INVALID_CLAUSE_TYPE`](/fr/reference/errors#e-invalid-clause-type) | Un connecteur WHERE n'est ni `and` ni `or`. |
| [`E_INVALID_WHERE_GROUP`](/fr/reference/errors#e-invalid-where-group) | Un groupe WHERE est vide, ou nomme aussi une colonne. |
| [`E_INVALID_WHERE_VALUE`](/fr/reference/errors#e-invalid-where-value) | Une valeur WHERE (ou un élément de liste) n'est pas un scalaire. |
| [`E_UNSAFE_IDENTIFIER`](/fr/reference/errors#e-unsafe-identifier) | Le compilateur a refusé un identifiant. |
| [`E_UNSAFE_LITERAL`](/fr/reference/errors#e-unsafe-literal) | Le compilateur a refusé une valeur littérale. |
| [`E_UNSAFE_OPERATOR`](/fr/reference/errors#e-unsafe-operator) | Le compilateur a refusé un opérateur. |

## Voir aussi

- [Séries temporelles](/fr/guides/database/time-series/)
- [Schéma et migrations](/fr/guides/database/time-series/schema)
- [Écrire et lire](/fr/guides/database/time-series/data)
- [Tests](/fr/guides/database/time-series/testing)
