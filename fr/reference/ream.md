# ream

`@c9up/ream` : le cœur du framework : l'application et son cycle de vie, le conteneur, l'environnement, le serveur HTTP avec son routeur, la requête, la réponse, les sessions et le parseur de corps, les événements, le planificateur, la console et le client de test. Guide : [Application](/fr/guides/concepts/application).

## Installation

```bash
pnpm add @c9up/ream
```

`ream new` crée un projet qui l'utilise. Dépendances peer optionnelles : `@c9up/inker` (le rendu des templates et les tags de template de session), `@c9up/quasar` (le store de session redis et le verrou redis du planificateur), `@c9up/comet` (le routeur JSON-RPC).

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/ream` | L'application, le conteneur, l'env, la couche HTTP, le routeur, les sessions, les événements, le planificateur, la console, les erreurs, et la plupart de ce qu'exportent les sous-chemins ci-dessous. |
| `@c9up/ream/types` | `ContainerBindings`, `ContainerBinding`, `Authenticators`, `AuthenticatorName` : les interfaces qu'augmentent les paquets. |
| `@c9up/ream/exceptions` | `Exception`, `createError`, les exceptions HTTP et `ExceptionHandler`. |
| `@c9up/ream/env` | `loadEnvFiles`, `envFileNames`. |
| `@c9up/ream/bootstrap` | `createHyperServerFactory` : la factory du serveur HTTP natif. |
| `@c9up/ream/hot` | Module à effet de bord chargé par `ream dev` : remplace les modules modifiés dans le processus en cours. |
| `@c9up/ream/dev/hmr` | L'endpoint et le script de rechargement du navigateur utilisés en développement. |
| `@c9up/ream/services/app` | L'instance de l'application (export par défaut) et ses setters. |
| `@c9up/ream/services/config` | Le store de configuration (export par défaut). |
| `@c9up/ream/services/router` | Le routeur (export par défaut) et ses setters. |
| `@c9up/ream/services/server` | Le serveur (export par défaut) et ses setters. |
| `@c9up/ream/services/logger` | Le logger de l'app (export par défaut) et ses setters. |
| `@c9up/ream/services/encryption` | Le signataire `APP_KEY` (export par défaut) et ses setters. |
| `@c9up/ream/services/urlBuilder` | `urlFor`, `signedUrlFor`. |
| `@c9up/ream/services/console` | L'application console (export par défaut) et ses setters. |
| `@c9up/ream/services/dumper` | Le dumper (export par défaut) et `dd`. |
| `@c9up/ream/services/repl` | Le REPL (export par défaut). |
| `@c9up/ream/dumper` | `Dumper` et ses types de configuration. |
| `@c9up/ream/repl` | `Repl` et ses types. |
| `@c9up/ream/bodyparser`, `@c9up/ream/bodyparser_middleware` | Le middleware du parseur de corps (export par défaut) et `BodyParserConfig`. |
| `@c9up/ream/bodyparser/config` | `defineConfig` pour `config/bodyparser.ts`. |
| `@c9up/ream/session`, `@c9up/ream/session_middleware` | Le middleware de session (export par défaut). |
| `@c9up/ream/session/config` | `defineConfig` pour `config/session.ts`. |
| `@c9up/ream/events` | L'émetteur d'événements, `BaseEvent`, `EventsBuffer`, `EventsProvider`, `defineConfig`. |
| `@c9up/ream/events/provider` | `EventsProvider` (export par défaut). |
| `@c9up/ream/events/config` | `defineConfig`, `checkEventsConfig` pour `config/events.ts`. |
| `@c9up/ream/events/services/main` | L'émetteur (export par défaut), `getEmitter`, `setEmitter`. |
| `@c9up/ream/events/configure` | Le hook configure qui enregistre le provider d'événements et écrit `config/events.ts`. |
| `@c9up/ream/events/testing` | `FakeBus` : un bus d'événements en mémoire pour les tests. |
| `@c9up/ream/events/helix` | Des assertions d'événements pour les tests : `collect`, `fake`, `assertEmitted`, `waitForEvent`, … |
| `@c9up/ream/scheduler/provider` | `ScheduleProvider` (export par défaut). |
| `@c9up/ream/scheduler/config` | `defineConfig` pour `config/scheduler.ts`, et `locks`. |
| `@c9up/ream/rpc/provider` | `RpcProvider` (export par défaut). |
| `@c9up/ream/rpc/router` | `RpcRouter` : les méthodes JSON-RPC. |
| `@c9up/ream/graphql/provider` | `GraphQLProvider` (export par défaut). |
| `@c9up/ream/openapi/provider` | `OpenApiProvider` (export par défaut). |
| `@c9up/ream/storage/provider` | `StaticProvider` (export par défaut) : les fichiers statiques. |
| `@c9up/ream/health` | Les health checks : `HealthChecks`, `BaseCheck`, `Result` et les checks intégrés. |
| `@c9up/ream/http-client` | `HttpClient` pour les requêtes sortantes, et `fakeHttp` pour les tests. |
| `@c9up/ream/console` | Le kernel de la console, `BaseCommand`, les décorateurs, les questions, les loaders. |
| `@c9up/ream/commands` | Le loader des commandes que livre ream (`migrate`, `schedule:*`). |
| `@c9up/ream/stubs` | Le moteur de templates des stubs et `stubsRoot`. |
| `@c9up/ream/helpers` | Des helpers de chaînes, de vérification de types, de fs, de base64, de timing et de types. |
| `@c9up/ream/helpers/string`, `/helpers/is`, `/helpers/base64`, `/helpers/types`, `/helpers/fs` | Chaque groupe de helpers à part. |
| `@c9up/ream/testing` | `TestClient`, `createTestClient`, `ApiResponse`, `TestWebSocket`. |
| `@c9up/ream/testing/utils` | `createTestUtils` : démarre l'app pour une suite de tests. |
| `@c9up/ream/tsconfig.app.json`, `/tsconfig.package.json`, `/tsconfig.client.json`, `/swcrc.app.json` | Des configurations de compilateur de base à étendre. |

## Commandes

Les commandes qu'une app reçoit de ream, lancées par `ream <name>` :

| Commande | Description |
|---|---|
| `list` | Liste les commandes (la commande par défaut). |
| `help` | Affiche l'aide d'une commande. |
| `make:controller`, `make:service`, `make:entity`, `make:validator`, `make:module` | Génèrent une classe sous `app/<module>/` ; `make:module` écrit l'entité, le contrôleur et le validateur. |
| `make:provider`, `make:command`, `make:middleware`, `make:event`, `make:listener` | Génèrent un provider, une commande, un middleware, un événement ou un listener. |
| `eject` | Copie un stub `make:` dans `stubs/` pour le modifier. |
| `migrate` | Exécute les migrations en attente de chaque source de migrations enregistrée. |
| `migrate:rollback` | Annule le dernier lot de chaque source. |
| `migrate:status` | Affiche les migrations appliquées et en attente de chaque source. |
| `schedule:list` | Liste chaque tâche planifiée, sa prochaine exécution et ses statistiques. |
| `schedule:run` | Exécute une tâche planifiée une fois, tout de suite, sans tenir compte de son verrou. |

Chaque commande `make:` accepte `--force` (`-f`), `--dry-run` et `--json`. L'Ignitor enregistre de lui-même les commandes `migrate` et `schedule:*` du loader `@c9up/ream/commands` ; une commande de l'application du même nom la remplace.

## Exports

### `@c9up/ream`

#### Application et configuration

| Export | Nature | Description |
|---|---|---|
| `Ignitor` | classe | Démarre et câble le framework : fichier rc, providers, serveur HTTP, console. |
| `ConsoleKernel` | classe | Démarre l'app en mode console et lance une commande. |
| `defineConfig` | fonction | `defineConfig(config: ReamrcConfig): ReamrcConfig` : type `reamrc.ts`. |
| `ReamrcConfig`, `IgnitorConfig`, `TestsConfig`, `TestSuiteConfig`, `MobileConfig`, `HyperServerLike` | interface | Le fichier rc, les options de l'Ignitor, les blocs `tests` et `mobile`, la forme du serveur natif. |
| `Application` | classe | L'application : conteneur, configuration, chemins, environnement, hooks du cycle de vie. |
| `ApplicationOptions`, `ApplicationHook`, `ApplicationImporter`, `ApplicationMode`, `ApplicationState`, `AppEnvironment` | type | Ses options et ses états. `AppEnvironment` vaut `'web' \| 'console' \| 'test' \| 'repl' \| 'unknown'` ; `ApplicationMode` vaut `'run' \| 'warmup'`. |
| `directories`, `DirectoriesNode` | const / interface | L'arborescence conventionnelle des dossiers. |
| `Provider` | classe | Provider de base avec `register`, `boot`, `start`, `ready`, `shutdown`. |
| `ProviderContract`, `AppContext`, `ConfigReader` | interface | Le contrat d'un provider et ce qu'il reçoit. |
| `ConfigStore` | classe | La configuration construite depuis `config/*.ts` : `get`, `set`, `has`, `all`, `defaults`. |
| `configProvider` | const | `configProvider.create(resolver)` : une valeur de configuration résolue depuis l'application. |
| `defineModuleConfig` | fonction | `defineModuleConfig<T>(config: T): T` : type la configuration d'un module. |
| `env` | fonction | `env(key: string)` : lit une variable d'environnement dans un fichier de configuration. |
| `Env` | classe | Charge les fichiers `.env*` et valide `process.env` selon un schéma. |
| `SchemaNode`, `RequiredNode`, `SchemaFnOptions`, `StringOptions`, `OptionalCondition` | type | Les types des nœuds de `Env.schema`. |
| `Secret` | classe | Une valeur qui s'imprime `[redacted]` ; `.release()` la lit. |
| `loadEnvFiles` | fonction | `loadEnvFiles(appRoot: URL, options?: { skipEnvLocal?: boolean }): Promise<void>`. |
| `MigrationRegistry` | classe | Là où les paquets de données enregistrent leurs exécuteurs de migrations. |
| `MigrationRunnerContract`, `MigrationState`, `MigrationStatusNode`, `RegisteredMigrationSource` | type | Ses contrats. |
| `installGracefulShutdown` | fonction | `installGracefulShutdown(options: ShutdownOptions): ShutdownHandle` : laisse finir les requêtes en cours sur SIGTERM / SIGINT. |
| `ShutdownOptions`, `ShutdownHandle` | interface | |
| `startHotReload`, `HotReloadOptions` | fonction / interface | Surveille les fichiers TypeScript et réenregistre les handlers à chaque modification. |
| `VERSION` | const | La version du paquet. |

#### Conteneur

| Export | Nature | Description |
|---|---|---|
| `Container` | classe | Le conteneur IoC. La résolution est asynchrone. |
| `ContainerResolver` | classe | Un résolveur par requête, avec ses propres valeurs de portée. |
| `ContextualBindingsBuilder`, `ConditionalBindingsBuilder` | classe | Renvoyés par `container.when()` et `container.if()`. |
| `Binding`, `BindingCondition`, `ContainerEmitter`, `ContainerOptions`, `ServiceFactory`, `ServiceScope`, `ServiceToken` | type | Les types du conteneur. `ServiceToken` est une classe, une chaîne ou un symbole. |
| `ContainerBindings`, `ContainerBinding` | interface / type | Les jetons chaîne connus ; les paquets l'augmentent. |
| `Authenticators`, `AuthenticatorName` | interface / type | Les noms des guards ; le paquet d'authentification l'augmente. |
| `Service` | fonction | `Service(options?: { scope?: ServiceScope })` : décorateur de classe qui enregistre un service. |
| `inject` | fonction | `inject(): ClassDecorator & MethodDecorator` : enregistre les dépendances du constructeur ou d'une méthode. |
| `Inject` | fonction | `Inject(token: ServiceToken): ParameterDecorator` : injecte un jeton dans un paramètre. |
| `getServiceMetadata`, `getServiceRegistry`, `clearServiceRegistry` | fonction | Lisent ou réinitialisent ce que `@Service` a enregistré. |

#### HTTP

| Export | Nature | Description |
|---|---|---|
| `HttpContext` | classe | Le contexte de la requête : `request`, `response`, `params`, `session`, `auth`, `logger`, … |
| `Request` | classe | La requête entrante. |
| `Response` | classe | Le constructeur de la réponse. |
| `RedirectBuilder` | classe | Renvoyé par `response.redirect()` : `toPath`, `toRoute`, `back`, `toIntended`, `withQs`, `status`. |
| `RequestValidator` | classe | Valide une requête avec un objet validateur. |
| `RequestAwareValidator`, `RequestValidationOptions`, `ValidatableContext`, `ValidationHookContext` | type | Ses contrats. |
| `RawRequest`, `RouteInfo`, `AuthState`, `Authorizer` | interface | Des parties du contexte. |
| `SseStream`, `SseStreamOptions` | classe / interface | Le flux qu'ouvre `response.sse()`. |
| `ServerWebSocket` | classe | Le côté serveur d'une connexion WebSocket. |
| `WebSocketHub` | classe | Les sockets d'un serveur. |
| `WebSocketContext` | type | `HttpContext & { socket: ServerWebSocket }`. |
| `isWebSocketContext` | fonction | `isWebSocketContext(ctx: HttpContext): ctx is WebSocketContext`. |
| `WebSocketBackend`, `WebSocketClose`, `WebSocketEvent`, `WebSocketMessage`, `WebSocketState` | type | Les types WebSocket. |
| `Server` | classe | Le serveur HTTP : middleware global, gestionnaire d'erreurs, proxys de confiance, gRPC. |
| `createHttpKernel`, `HttpKernelConfig` | fonction / interface | Construit le gestionnaire de requêtes seul (serverless, tests). |
| `GrpcCall`, `GrpcHandler`, `GrpcReply`, `GrpcLimits`, `NativeGrpcCall`, `NativeGrpcHandler` | type | gRPC sur le port HTTP. |
| `ErrorHandlerClass`, `LazyImport`, `MiddlewareClass`, `MiddlewareEntry`, `MiddlewareFunction` | type | Les formes des middlewares et du gestionnaire d'erreurs. |
| `resolveMiddlewareEntry` | fonction | `resolveMiddlewareEntry(entry: MiddlewareEntry): MiddlewareFunction`. |
| `composeMiddleware` | fonction | `composeMiddleware(middleware: MiddlewareFunction[]): MiddlewareFunction`. |
| `MiddlewareRegistry` | classe | Les middlewares nommés. |
| `Macroable`, `MacroFn`, `GetterFn` | classe / type | `macro()` et `getter()`, sur `HttpContext`, `Request`, `Response`, `Router` et les builders de routes. |
| `BodyParserMiddleware`, `BodyParserConfig` | classe / interface | Analyse les corps JSON, formulaire, bruts et multipart. |
| `MultipartFile`, `FileValidationOptions`, `MimeType` | classe / type | Un fichier envoyé : `validate()`, `errors`, `move()`, `stream()`. |
| `StaticMiddleware`, `StaticConfig`, `DotFilesPolicy`, `defineStaticConfig` | classe / type / fonction | Sert les fichiers de `public/`. |
| `StaticProvider`, `StaticProviderOptions` | classe / interface | Enregistre le middleware des fichiers statiques. |
| `ApiResource`, `PaginationMeta` | classe / interface | Transforme des entités en réponses d'API. |

#### Routeur

| Export | Nature | Description |
|---|---|---|
| `Router` | classe | Routes, groupes, ressources, routes nommées, construction d'URL. |
| `RouteBuilder` | classe | Une route, renvoyée par `router.get()` et les autres verbes. |
| `GroupBuilder` | classe | Un groupe, renvoyé par `router.group()`. |
| `RouteResource` | classe | Des routes de ressource, renvoyées par `router.resource()`. |
| `OnRouteBuilder` | classe | `router.on(path).render(view)` / `.redirect(name)`. |
| `UrlBuilder` | classe | Construit l'URL d'une route nommée, pièce par pièce. |
| `matchers` | const | `matchers.number()`, `.uuid()`, `.slug()` : des matchers de paramètres. |
| `RouteDefinition`, `RouteHandler`, `RouteHandlerFunction`, `ControllerAction`, `MatchResult`, `ParamMatcher`, `SignedUrlOptions`, `WebSocketRouteHandler`, `WebSocketRouteHandlerFunction` | type | Les types des routes. |
| `InferRouteParams` | type | L'objet de paramètres que déclare un motif comme `/users/:id`. |

#### Sessions

| Export | Nature | Description |
|---|---|---|
| `Session` | classe | La session de la requête : valeurs, messages flash, régénération, étiquetage. |
| `SessionMiddleware` | classe | Charge la session et enregistre ses changements. |
| `SessionCookieDriver`, `SessionFileDriver`, `SessionMemoryDriver`, `SessionRedisDriver`, `SessionDatabaseDriver` | classe | Les stores. |
| `SessionConfig`, `SessionDriver`, `SessionDriverWithTagging`, `TaggedSession`, `SessionDatabaseDriverOptions`, `SessionDbConnection`, `SessionFileDriverOptions`, `RedisSessionOptions`, `SessionRedisClient`, `SessionRedisClientSource` | type | Les contrats de la configuration et des stores. |
| `sessionStoreSupportsTagging` | fonction | `(driver: SessionDriver): driver is SessionDriverWithTagging`. |
| `ReadOnlyValuesStore`, `ValuePath` | classe / type | Le store des messages flash. |

#### Erreurs

| Export | Nature | Description |
|---|---|---|
| `Exception` | classe | Exception de base (celle de `@c9up/flare`, que chaque paquet étend) avec `status`, `code`, `help`, et `handle()` / `report()` facultatifs. |
| `createError` | fonction | `createError<T extends unknown[]>(message: string, code: string, status?: number): ErrorClass<T>` ; la classe reçoit les valeurs des `%s` en tableau : `new E_X([valeur])`. |
| `ErrorClass`, `ExceptionClass`, `HttpError`, `StatusPageRenderer` | type | |
| `ExceptionHandler` | classe | Rend et rapporte les erreurs ; étendez-le dans l'app. |
| `RuntimeException`, `InvalidArgumentsException` | erreur | `E_RUNTIME_EXCEPTION`, `E_INVALID_ARGUMENTS_EXCEPTION`. |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs) : `error instanceof errors.E_ROUTE_NOT_FOUND`. |
| `createPipelineError`, `validatePipelineConfig`, `PIPELINE_STAGES`, `PipelineStageName` | fonction / const / type | Les erreurs des étapes du pipeline. |
| `errorDocsUrl`, `DOCS_BASE_URL` | fonction / const | `errorDocsUrl(code)` : la ligne du code dans l'index des erreurs. |
| `ErrorBoundary`, `ErrorEvent`, `ErrorEmitter`, `ErrorSeverity` | classe / type | La frontière d'erreurs racine. |
| `renderError`, `parseStack`, `prettyPrintError`, `RenderOptions`, `StackFrame` | fonction / type | Le rendu des erreurs dans le terminal. |
| `didYouMean`, `findClosestMatches`, `levenshtein` | fonction | Des suggestions pour un nom mal tapé. |

#### Sécurité

| Export | Nature | Description |
|---|---|---|
| `CookieSigner` | classe | Signe (`sign` / `unsign`) et chiffre (`encrypt` / `decrypt`, AES-256-GCM) des valeurs avec `APP_KEY` (la liaison `encryption`). |
| `SignedUrl`, `SignedUrlConfig` | classe / interface | Les URL signées (la liaison `signedUrl`). |
| `hmacSign`, `hmacVerify`, `constantTimeEq`, `randomBytesBase64`, `randomHex` | fonction | Des primitives cryptographiques, natives quand elles sont disponibles. |
| `hasNativeCrypto`, `setNapi` | fonction | Indique si la cryptographie native est chargée ; la remplace. |

#### Événements

| Export | Nature | Description |
|---|---|---|
| `Emitter` | classe | L'émetteur d'événements (la liaison `emitter`). |
| `BaseEvent` | classe | Base des événements sous forme de classe : `static dispatch(...args)`, `emit()`. |
| `EventsBuffer`, `BufferedEvent`, `BufferedEventName`, `EventFinder` | classe / type | Ce que renvoie `emitter.fake()`, avec ses assertions. |
| `ListenerClass`, `EmitterResolver`, `UnsubscribeFunction`, `AsyncUnsubscribeFunction` | type | |
| `defineEventsConfig`, `EventsConfig` | fonction / interface | `config/events.ts`. |

#### Planificateur

| Export | Nature | Description |
|---|---|---|
| `Scheduler` | classe | Planificateur cron sur un ticker natif : `register`, `unregister`, `start`, `stop`, `listTasks`, `nextRun`, `runTaskNow`, `getStats`. |
| `Schedule` | fonction | `Schedule(cronExpr: string): MethodDecorator` : exécute une méthode selon une expression cron. |
| `getScheduleMetadata`, `SCHEDULE_METADATA_KEY`, `ScheduleMetadata` | fonction / const / type | Ce que `@Schedule` a enregistré. |
| `ScheduleProvider`, `ScheduleProviderOptions` | classe / interface | Enregistre le planificateur. |
| `defineSchedulerConfig`, `SchedulerConfig`, `SchedulerOptions` | fonction / interface | `config/scheduler.ts` et les options de `Scheduler`. |
| `locks`, `MemoryLockBackend`, `RedisLockBackend`, `LockBackend`, `LockBackendFactory`, `LockRedisClient`, `LockRedisResolver` | const / classe / type | Le verrou qui ne laisse tourner qu'une instance d'une tâche. |
| `StatsTracker`, `TaskInfo`, `TaskStats`, `RunTaskOutcome`, `ScheduleInvocation`, `ErrorReporter` | classe / type | La liste et les statistiques des tâches. |
| `ScheduleEvent`, `ScheduleEventSink`, `ScheduleTaskStartedEvent`, `ScheduleTaskCompletedEvent`, `ScheduleTaskFailedEvent`, `ScheduleTaskSkippedEvent` | type | Les événements du cycle de vie d'une tâche. |

#### API

| Export | Nature | Description |
|---|---|---|
| `GraphQLEngine`, `GraphQLConfig`, `ResolverOptions`, `SelectionField` | classe / type | Un moteur GraphQL. |
| `GraphQLProvider`, `GraphQLProviderOptions` | classe / interface | Le monte. |
| `OpenApiGenerator`, `OpenApiConfig` | classe / interface | Construit un document OpenAPI à partir des routes. |
| `OpenApiMiddleware`, `OpenApiMiddlewareConfig` | classe / interface | Le sert. |
| `OpenApiProvider`, `OpenApiProviderOptions`, `OpenApiDocsConfig` | classe / interface | Enregistre les deux. |
| `HealthCheck`, `HealthChecker`, `HealthCheckResult`, `HealthStatus` | classe / type | Un endpoint `/health` pour les sondes de liveness et de readiness. |

#### Console

| Export | Nature | Description |
|---|---|---|
| `BaseCommand` | classe | La base d'une commande. |
| `args`, `flags` | const | Des décorateurs : `@args.string()`, `@flags.boolean()`, … |
| `Kernel` | classe | Le kernel de la console. |
| `HelpCommand`, `ListCommand` | classe | Les commandes intégrées. |
| `IndexGenerator` | classe | Écrit le manifeste des commandes. |
| `FsLoader`, `ListLoader` | classe | Des loaders de commandes. |
| `Parser` | classe | L'analyseur d'argv. |
| `Prompt`, `PromptTrap` | classe | Les questions, et des réponses scriptées pour les tests. |
| `ConsoleExceptionHandler` | classe | Rend l'erreur d'une commande. |
| `Logger`, `Ui` | classe | La sortie terminal, depuis `@c9up/lumen`. |
| `ArgumentMetaData`, `FlagMetaData`, `CommandClass`, `CommandInstance`, `CommandOptions` | interface | Les métadonnées des commandes. |

#### Codemods et stubs

| Export | Nature | Description |
|---|---|---|
| `createCodemods` | fonction | L'API qu'utilise le hook `configure()` d'un paquet pour modifier le projet. |
| `Codemods`, `EnvValidationNode`, `EnvVarsOptions`, `GeneratedStub`, `MiddlewarePosition`, `PreloadEnvironment` | type | Ses types. |
| `compileStub`, `renderStub`, `escapeHtml` | fonction | Le moteur de templates des stubs. |
| `StubState`, `StubValue`, `StubFunction`, `StubBlock`, `TemplateOptions` | type | Ses types. |

#### Services et types

| Export | Nature | Description |
|---|---|---|
| `setApp`, `setRouter`, `setServer` | fonction | Installent les instances derrière les modules `services/*`. |
| `AsyncOrSync`, `Constructor`, `Dict`, `ExtractFunctions`, `OneOrMore`, `Opaque`, `Prettify`, `UnwrapOpaque` | type | Des helpers de types. |

### `Ignitor`

```ts
new Ignitor(appRoot?: URL | IgnitorConfig, config?: IgnitorConfig)
```

| Membre | Signature | Description |
|---|---|---|
| `useRcFile` | `useRcFile(reamrc: ReamrcConfig): Ignitor` | Charge `reamrc.ts`. |
| `tap` | `tap(callback: (app: Application) => void): Ignitor` | Accède à l'application avant le démarrage. |
| `setEnvironment` / `getEnvironment` | `setEnvironment(env: AppEnvironment): Ignitor` | |
| `routes` | `routes(callback: (router: Router) => void): Ignitor` | Déclare des routes en ligne. |
| `use` | `use(mw: MiddlewareFunction): Ignitor` | Ajoute un middleware global en ligne. |
| `named` | `named(name: string, mw: MiddlewareFunction): Ignitor` | Enregistre un middleware nommé en ligne. |
| `provider` | `provider(factory: (app: Application) => ProviderContract): Ignitor` | Enregistre un provider en ligne. |
| `configure` | `configure(key: string, value: unknown): Ignitor` | Fixe une valeur de configuration. |
| `onError` | `onError(listener: (event: ErrorEvent) => void): Ignitor` | Écoute les événements d'erreur. |
| `httpServer` | `httpServer(): Ignitor` | Mode serveur HTTP. |
| `console` | `console(): ConsoleKernel` | Mode console. |
| `testMode` | `testMode(): Ignitor` | Mode test. |
| `warmUp` | `warmUp(): Promise<Ignitor>` | Assemble l'application sans la lancer. |
| `start` | `start(): Promise<Ignitor>` | Démarre et, en mode HTTP, écoute. |
| `stop` | `stop(): Promise<void>` | Arrêt propre ; chaque étape s'exécute même quand l'une d'elles lève une erreur. |
| `port` / `host` | `port(): Promise<number>` / `host(): string \| undefined` | L'adresse d'écoute. |
| `consoleApp` | `consoleApp(): Promise<Console>` | La console programmatique. |
| `getApp`, `getRouter`, `getServer`, `getRcFile`, `getAppRoot`, `getImporter` | | Des accesseurs. |
| `getKernel` | `getKernel(): (request) => Promise<response>` | Le gestionnaire de requêtes, pour le serverless et les tests. |
| `isStarted`, `isDevMode`, `getPhase` | | L'état. |

### `Application`

```ts
new Application(options: ApplicationOptions)
```

| Membre | Signature | Description |
|---|---|---|
| `container` | `container: Container` | |
| `config` | `config: ConfigStore` | |
| `appRoot` | `appRoot: URL \| undefined` | La racine du projet. |
| `makePath` / `makeURL` | `makePath(...paths: string[]): string` | Un chemin (ou une URL) dans la racine du projet. |
| `relativePath` | `relativePath(absolutePath: string): string` | |
| `configPath`, `startPath`, `tmpPath`, `publicPath`, `providersPath`, `commandsPath`, `contractsPath`, `migrationsPath`, `seedersPath`, `factoriesPath`, `languageFilesPath`, `viewsPath`, `httpControllersPath`, `modelsPath`, `servicesPath`, `exceptionsPath`, `mailersPath`, `mailsPath`, `middlewarePath`, `policiesPath`, `validatorsPath`, `eventsPath`, `listenersPath`, `transformersPath`, `generatedClientPath`, `generatedServerPath` | `(...paths: string[]): string` | Un chemin dans chaque dossier conventionnel. |
| `directories` | `directories: DirectoriesNode` | L'arborescence, surcharges de `reamrc.ts` comprises. |
| `rcFile` | `rcFile: ReamrcContents` | Le fichier rc analysé. |
| `getEnvironment` / `setEnvironment` | `getEnvironment(): AppEnvironment` | `web`, `console`, `test`, `repl` ou `unknown`. |
| `getMode` / `setMode` | `getMode(): ApplicationMode` | `run` ou `warmup` ; à fixer seulement avant le démarrage. |
| `getState` | `getState(): ApplicationState` | L'étape du cycle de vie où en est l'application. |
| `nodeEnvironment` | `nodeEnvironment: string` | Le `NODE_ENV` normalisé, ou `'unknown'`. |
| `inProduction`, `inDev`, `inTest`, `managedByPm2` | `boolean` | |
| `isBooted`, `isReady`, `isTerminating`, `isTerminated` | `boolean` | |
| `appName`, `version` | `string \| undefined` | Depuis le `package.json` de l'app. |
| `usingInker` | `boolean` | Indique si `@c9up/inker` est installé. |
| `booting` / `booted` | `booting(callback: () => void \| Promise<void>): void` | Des hooks autour du démarrage des providers. |
| `starting` / `ready` | `starting(handler: ApplicationHook): Application` | Des hooks avant le démarrage du serveur, et une fois qu'il est prêt. |
| `terminating` / `onShutdown` | `terminating(callback: () => void \| Promise<void>): void` | Des hooks au début de l'arrêt. |
| `register` | `register(provider: ProviderContract): void` | Enregistre une instance de provider. |
| `boot` | `boot(): Promise<void>` | Démarre chaque provider. |
| `terminate` / `shutdown` | `terminate(): Promise<void>` | Arrêt propre ; les providers s'arrêtent dans l'ordre inverse. |
| `providers`, `providerCount` | | Les providers enregistrés. |
| `import` | `import(moduleIdentifier: string): Promise<unknown>` | Importe un module par l'importer de l'app. |
| `importDefault` | `importDefault<T>(moduleIdentifier: string): Promise<T>` | Son export par défaut. |
| `listen`, `listenOnce`, `listenIf`, `listenOnceIf` | `listen(signal: Signals, callback: () => void): void` | Les signaux du processus. |
| `notify` | `notify(message: unknown, callback?): void` | Signale au superviseur du processus qu'un état est atteint. |
| `toJSON` | `toJSON()` | `{ appName, version, environment, nodeEnvironment, state, isReady, isTerminating }`. |

### `Provider`

```ts
class Provider {
  constructor(app: AppContext)
  register(): void           // bind into the container (synchronous)
  boot(): Promise<void>      // set the framework up
  start(): Promise<void>     // before the HTTP server starts
  ready(): Promise<void>     // once the server is listening
  shutdown(): Promise<void>  // in reverse order
}
```

### `Container`

```ts
new Container(options?: ContainerOptions)
```

| Membre | Signature | Description |
|---|---|---|
| `singleton` | `singleton(token: ServiceToken, factory: ServiceFactory): void` | Construit une fois, puis mis en cache. |
| `bind` | `bind(token: ServiceToken, factory: ServiceFactory): void` | Construit à chaque résolution. |
| `bindValue` | `bindValue<T>(token: ServiceToken, value: T): void` | Une valeur existante. |
| `alias` | `alias(alias: ServiceToken, target: ServiceToken): void` | |
| `make` / `resolve` | `make<T>(token: ServiceToken, runtimeValues?: unknown[]): Promise<T>` | Résout ou construit. |
| `call` | `call(instance, method, runtimeValues?): Promise<unknown>` | Appelle une méthode en injectant ses dépendances. |
| `when` | `when(parent).asksFor(token).provide(factory)` | Une liaison contextuelle pour une classe. |
| `contextualBinding` | `contextualBinding(parent, binding: ServiceToken, factory: ServiceFactory): void` | La même chose, en un appel. |
| `if` / `conditionalBinding` | `if(condition: BindingCondition): ConditionalBindingsBuilder` | Une liaison pour les résolutions où `condition` est vraie. |
| `resolving` | `resolving(token: ServiceToken, callback: (value) => void \| Promise<void>): void` | S'exécute à chaque construction de `token`. |
| `swap` | `swap(token: ServiceToken, factory: ServiceFactory): void` | Remplace une liaison, pour les tests. |
| `override` | `override<T>(token: ServiceToken, value: T): void` | Remplace une liaison par une valeur, pour les tests. |
| `restore` / `restoreAll` | `restore(token?: ServiceToken): void` | Annule les remplacements. |
| `createResolver` | `createResolver(): ContainerResolver` | Un résolveur avec ses propres valeurs de portée. |
| `runWithScopedValues` | `runWithScopedValues<T>(values: ReadonlyMap<ServiceToken, unknown>, fn: () => Promise<T>): Promise<T>` | |
| `has` / `hasBinding` / `hasAllBindings` | `has(token: ServiceToken): boolean` | Résolvable / lié explicitement / tous liés. |
| `bindings` | `readonly { token, scope, target? }[]` | Chaque jeton, trié. |
| `useEmitter` | `useEmitter(emitter: ContainerEmitter): Container` | Émet `container_binding:resolved` après chaque résolution. |
| `size` | `number` | |

### `HttpContext`

| Membre | Signature | Description |
|---|---|---|
| `request` | `Request` | |
| `response` | `Response` | |
| `params` | `MatchedParams` | Les paramètres de la route. |
| `route` | `RouteInfo` | La route trouvée. |
| `routeKey` | `string` | `METHOD-pattern` de la route trouvée. |
| `subdomains` | `Record<string, string>` | Ce que le domaine de la route a capturé dans l'hôte. |
| `id` | `string` | L'identifiant de la requête. |
| `auth` | `AuthState` | Fixé par un middleware d'authentification. |
| `bouncer` | `Authorizer \| undefined` | Fixé par un middleware d'autorisation. |
| `session` | `Session \| undefined` | Fixé par `SessionMiddleware`. |
| `events` | `Emitter \| undefined` | Quand `EventsProvider` est enregistré. |
| `logger` | `ContextLogger` | Le logger de la requête. |
| `locale` | `string` | Depuis `Accept-Language`. |
| `store` | `Map<string, unknown>` | Des valeurs par requête pour les middlewares. |
| `containerResolver` | `ContainerResolver \| undefined` | Le résolveur de la requête. |
| `inspect` | `inspect(): string` | Un résumé sur une ligne. |
| `HttpContext.get` | `static get(): HttpContext \| null` | Le contexte ambiant, ou `null` hors d'une requête. |
| `HttpContext.getOrFail` | `static getOrFail(): HttpContext` | Lève `E_HTTP_CONTEXT_NOT_FOUND` hors d'une requête. |
| `HttpContext.run` | `static run<T>(ctx: HttpContext, fn: () => T): T` | |
| `HttpContext.runOutsideContext` | `static runOutsideContext<T>(fn: () => T): T` | |
| `HttpContext.useAsyncLocalStorage` | `static useAsyncLocalStorage(enabled: boolean): void` | Active ou désactive le suivi du contexte ambiant. |
| `HttpContext.macro` / `getter` | `static macro(name: string, fn: MacroFn): void` | Étend chaque contexte. |

### `Request`

| Membre | Signature | Description |
|---|---|---|
| `method` | `method(): string` | Tient compte de l'usurpation par `_method` quand elle est activée. |
| `intended` | `intended(): string` | La méthode réelle. |
| `url` | `url(includeQs?: boolean): string` | Le chemin, avec la query string sur demande. |
| `completeUrl` | `completeUrl(includeQueryString?: boolean): string` | `protocol://host/path`. |
| `path` | `path(): string` | |
| `parsedUrl` | `parsedUrl(): { pathname, search, query }` | |
| `ip` / `ips` | `ip(): string` / `ips(): string[]` | L'adresse du client, à travers les proxys de confiance. |
| `protocol` / `secure` | `protocol(): string` / `secure(): boolean` | |
| `host`, `hostname`, `authority`, `subdomains` | `host(): string \| null` | |
| `header` | `header(key: string, defaultValue?: string): string \| undefined` | |
| `headers` | `headers(): Readonly<Dict>` | |
| `id` | `id(): string \| undefined` | `x-request-id`. |
| `param` / `params` | `param(key: string, defaultValue?: string): string \| undefined` | Les paramètres de la route. |
| `qs` | `qs(): Dict<unknown>` | La query string analysée. |
| `body` | `body(): unknown` | Le corps analysé. |
| `all` | `all(): Dict<unknown>` | La query string fusionnée avec le corps. |
| `input` | `input<T>(key: string, defaultValue?: T): T` | Une valeur d'entrée ; la notation pointée est acceptée. |
| `only` / `except` | `only(keys: string[]): Dict<unknown>` | |
| `original` | `original(): Dict<unknown>` | L'entrée telle que reçue. |
| `raw` / `rawBuffer` | `raw(): string` / `rawBuffer(): Buffer` | Le corps brut. |
| `hasBody` | `hasBody(): boolean` | |
| `updateBody`, `updateQs`, `updateRawBody` | `updateBody(body: Dict<unknown>): void` | Remplacent l'entrée, pour un middleware. |
| `validateUsing` | `validateUsing<T>(validator: RequestAwareValidator<T>, options?): Promise<T>` | Lève `E_VALIDATION_ERROR` en cas d'échec. |
| `tryValidateUsing` | `tryValidateUsing<T>(validator, options?): Promise<[unknown, null] \| [null, T]>` | |
| `validated` | `validated(): unknown` | Ce qu'a produit le `.validate()` de la route. |
| `file` | `file(key: string, options?: FileValidationOptions): MultipartFile \| null` | Un fichier envoyé. |
| `files` | `files(key: string, options?: FileValidationOptions): MultipartFile[]` | Tous les fichiers envoyés sous une clé. |
| `allFiles` | `allFiles(): Record<string, unknown>` | |
| `cookie` | `cookie(name: string, defaultValue?: string): string \| null` | Un cookie signé. |
| `plainCookie` | `plainCookie<T>(name: string, defaultValue?: T, options?: { encoded?: boolean }): T \| null` | |
| `encryptedCookie` | `encryptedCookie(name: string, defaultValue?: string): string \| null` | |
| `cookies` / `cookiesList` | `cookies(): Dict` | |
| `hasValidSignature` | `hasValidSignature(purpose?: string): boolean` | Vérifie une URL signée. |
| `is` | `is(types: string[]): string \| null` | Compare le type de contenu. |
| `accepts`, `language`, `charset`, `encoding` | `accepts<T extends string>(types: T[]): T \| null` | La négociation de contenu. |
| `types`, `languages`, `charsets`, `encodings` | `types(): string[]` | Tout ce que le client accepte, le meilleur d'abord. |
| `fresh` / `stale` | `fresh(): boolean` | Indique si la copie en cache du client est encore fraîche. |
| `ajax`, `pjax`, `prefetch` | `ajax(): boolean` | |
| `matchesRoute` | `matchesRoute(identifier: string \| string[]): boolean` | Par nom de route, motif ou référence de contrôleur. |
| `upgradesToWebSocket` | `upgradesToWebSocket(): boolean` | |
| `getPreviousUrl` | `getPreviousUrl(allowedHosts?: string[], fallback?: string): string` | Le `Referer`, quand son hôte est autorisé. |
| `csrfToken`, `csrfProtected` | | Fixés par le middleware CSRF. |
| `serialize` / `toJSON` / `serializeSafe` | `serialize(): Record<string, unknown>` | Une vue JSON ; `serializeSafe` convient aux logs. |

### `Response`

| Membre | Signature | Description |
|---|---|---|
| `status` / `safeStatus` | `status(code: number): Response` | `safeStatus` ne le fixe que s'il vaut encore 200. |
| `header`, `append`, `safeHeader`, `removeHeader` | `header(key: string, value: string): Response` | |
| `vary` | `vary(field: string \| string[]): Response` | |
| `type` | `type(type: string, charset?: string): Response` | |
| `location` | `location(url: string): Response` | |
| `send` | `send(data: unknown): void` | Le type de contenu est détecté s'il n'est pas fixé. |
| `json` | `json(data: unknown): void` | |
| `jsonp` | `jsonp(body: unknown, callbackName?: string): void` | |
| `sendBuffer` | `sendBuffer(buffer: Buffer): void` | |
| `stream` | `stream(body: ReadableStream, errorCallback?): Promise<void>` | |
| `download` | `download(filePath: string, generateEtag?: boolean, errorCallback?): void` | |
| `attachment` | `attachment(filePath: string, name?: string, disposition?: string, generateEtag?: boolean): void` | Avec `Content-Disposition`. |
| `sse` | `sse(options?: SseStreamOptions): Promise<SseStream>` | Ouvre un flux server-sent events. |
| `redirect` | `redirect(): RedirectBuilder` / `redirect(path: string, forwardQueryString?: boolean, statusCode?: number): void` | |
| `cookie` | `cookie(name: string, value: string, options?: CookieOptions): Response` | Signé. |
| `plainCookie` | `plainCookie(name: string, value: unknown, options?): Response` | Non signé. |
| `encryptedCookie` | `encryptedCookie(name: string, value: string, options?): Response` | AES-256-GCM. |
| `clearCookie` | `clearCookie(name: string, options?): Response` | |
| `setEtag` | `setEtag(body: string \| Buffer, weak?: boolean): Response` | |
| `fresh` | `fresh(): boolean` | |
| `abort` | `abort(body: unknown, status?: number): never` | Lève `E_HTTP_REQUEST_ABORTED` (400 par défaut), construite par `E_HTTP_EXCEPTION.invoke()` : son `code` est `E_HTTP_EXCEPTION`. |
| `abortIf` / `abortUnless` | `abortIf(condition: unknown, body: unknown, status?: number)` | |
| `setRequestId` | `setRequestId(): Response` | Renvoie `x-request-id`. |
| `onFinish` | `onFinish(callback: (err: Error \| null) => void): void` | |
| `noContent`, `continue`, `switchingProtocols` | `(): void` | 204, 100, 101. |
| `ok`, `created`, `accepted`, `nonAuthoritativeInformation`, `resetContent`, `partialContent` | `(body?: unknown): void` | 200 à 206. |
| `multipleChoices`, `movedPermanently`, `movedTemporarily`, `seeOther`, `notModified`, `useProxy`, `temporaryRedirect` | `(body?: unknown): void` | 300 à 307. |
| `badRequest`, `unauthorized`, `paymentRequired`, `forbidden`, `notFound`, `methodNotAllowed`, `notAcceptable`, `proxyAuthenticationRequired`, `requestTimeout`, `conflict`, `gone`, `lengthRequired`, `preconditionFailed`, `requestEntityTooLarge`, `requestUriTooLong`, `unsupportedMediaType`, `requestedRangeNotSatisfiable`, `expectationFailed`, `unprocessableEntity`, `tooManyRequests` | `(body?: unknown): void` | 400 à 429. |
| `internalServerError`, `notImplemented`, `badGateway`, `serviceUnavailable`, `gatewayTimeout`, `httpVersionNotSupported` | `(body?: unknown): void` | 500 à 505. |
| `getStatus`, `getHeaders`, `getHeader`, `getBody` | | Lisent ce qui a été fixé. |
| `finished`, `headersSent`, `isPending`, `hasContent`, `hasStream`, `hasLazyBody` | `boolean` | |
| `nonce` | `string \| undefined` | Le nonce CSP de la requête. |

### `Router`

| Membre | Signature | Description |
|---|---|---|
| `get`, `post`, `put`, `patch`, `delete`, `head`, `options` | `get(path: string, handler: RouteHandler): RouteBuilder` | |
| `any` | `any(path: string, handler: RouteHandler): RouteBuilder` | Toutes les méthodes. |
| `route` | `route(pattern: string, methods: string \| string[], handler: RouteHandler): RouteBuilder` | |
| `ws` | `ws(path: string, handler: WebSocketRouteHandler): RouteBuilder` | Une route WebSocket. |
| `resource` / `shallowResource` | `resource(path: string, controller): RouteResource` | |
| `group` | `group(callback: () => void): GroupBuilder` | Aussi `group(config, callback)`. |
| `on` | `on(path: string): OnRouteBuilder` | |
| `where` | `where(param: string, matcher: string \| ParamMatcher): Router` | Un matcher pour toutes les routes. |
| `matchers` | `{ number(), uuid(), slug() }` | |
| `use` | `use(middleware: LazyImport<MiddlewareClassConstructor>[]): Router` | Le middleware du routeur : s'exécute sur les routes trouvées. |
| `named` | `named(collection: Record<string, MiddlewareEntry>): Record<string, (args?) => MiddlewareFunction>` | Les middlewares nommés. |
| `controllers` | `controllers(map: Record<string, LazyControllerImport>): Router` | Les contrôleurs référencés par une chaîne. |
| `urlFor` / `makeUrl` | `urlFor(name: string, params?: Record<string, string>): string` | |
| `makeSignedUrl` | `makeSignedUrl(name: string, params?, options?: SignedUrlOptions): string` | |
| `builder` / `urlBuilder` / `builderForDomain` | `builder(): UrlBuilder` | |
| `namedManifest` | `namedManifest(): Record<string, string>` | Le motif de chaque nom, pour les clients. |
| `namedRoutes` | `namedRoutes(): Record<string, { path; methods }>` | |
| `generateTypes` | `generateTypes(): string` | Les types TypeScript des routes nommées. |
| `find` / `findOrFail` / `has` | `find(identifier: string): RouteDefinition \| null` | Par nom ou par motif. |
| `match` | `match(method: string, path: string, host?: string, options?): MatchResult \| undefined` | |
| `getRoutes` | `getRoutes(): RouteDefinition[]` | |
| `parsePattern` | `parsePattern(pattern: string): { name; optional }[]` | |
| `commit` / `commited` | `commit(): void` | Fige la table et construit l'index. |
| `toJSON`, `usingDomains`, `routeCount`, `clear` | | |

### `RouteBuilder`

| Membre | Signature | Description |
|---|---|---|
| `as` | `as(name: string): RouteBuilder` | Nomme la route. |
| `prefix` | `prefix(prefix: string): RouteBuilder` | |
| `middleware` | `middleware(...names: string[]): RouteBuilder` | Des middlewares nommés. |
| `use` | `use(...mw: MiddlewareFunction[]): RouteBuilder` | Des middlewares en ligne. |
| `guard` | `guard(...guards: string[]): RouteBuilder` | Les guards d'authentification. |
| `role` / `permission` | `role(...roles: string[]): RouteBuilder` | |
| `where` | `where(param: string, matcher: string \| ParamMatcher): RouteBuilder` | |
| `validate` | `validate(validator: string): RouteBuilder` | Valide le corps avec un validateur nommé. |
| `domain` | `domain(d: string): RouteBuilder` | |
| `version` | `version(v: string): RouteBuilder` | |
| `deprecates` | `deprecates(version: string, options?: { sunset?: string }): RouteBuilder` | |
| `getName`, `getPattern`, `setPattern`, `getHandler`, `getMiddleware`, `getDefinition`, `markAsDeleted`, `isDeleted`, `toJSON` | | |

### `GroupBuilder`

`prefix(p)`, `as(namePrefix)`, `middleware(...names)`, `use(...mw)`, `guard(...guards)`, `domain(d)`, `where(param, matcher)`, chacune renvoyant le groupe ; `routes` liste ses routes.

### `RouteResource`

`only(actions)`, `except(actions)`, `apiOnly()`, `where(key, matcher)`, `params(resources)`, `use(actions, middleware)` (alias `middleware`), `as(name, normalizeName?)`, `tap(callback)` / `tap(actions, callback)`, chacune renvoyant la ressource ; `routes` liste les `RouteBuilder` générés.

### `Server`

| Membre | Signature | Description |
|---|---|---|
| `use` | `use(middleware: MiddlewareEntry[]): Server` | Le middleware global. |
| `errorHandler` | `errorHandler(handler: LazyImport<ErrorHandlerClass>): Server` | |
| `trustedProxies` | `trustedProxies(cidrs: string[]): Server` | |
| `grpc` | `grpc(handler: GrpcHandler, limits?: GrpcLimits): Server` | Sert gRPC sur le port HTTP. |
| `supportsWebSockets` | `supportsWebSockets(): boolean` | |
| `getRouter`, `getErrorHandler`, `getServerMiddleware`, `getTrustedProxies`, `getGrpcHandler`, `getGrpcLimits` | | |

### `Session`

| Membre | Signature | Description |
|---|---|---|
| `get` | `get<T>(key: string, defaultValue?: T): T` | |
| `put` | `put(key: string, value: unknown): void` | |
| `has`, `all`, `forget`, `pull`, `clear` | | |
| `increment` / `decrement` | `increment(key: string, amount?: number): void` | |
| `flash` | `flash(key: string \| Record<string, unknown>, value?: unknown): void` | Pour la requête suivante seulement. |
| `flashAll`, `flashOnly`, `flashExcept` | `flashOnly(keys: string[]): void` | Mettent en flash l'entrée de la requête. |
| `flashErrors` | `flashErrors(errors: Record<string, string \| string[]>): void` | |
| `flashValidationErrors` | `flashValidationErrors(error, withInput?: boolean): void` | |
| `reflash`, `reflashOnly`, `reflashExcept` | | Gardent les données flash précédentes. |
| `flashMessages` | `ReadOnlyValuesStore` | Ce que la requête précédente a mis en flash. |
| `old` | `old<T>(key: string, defaultValue?: T): T` | Une valeur flash précédente. |
| `regenerate` | `regenerate(): void` | Change l'identifiant en gardant les données. |
| `sessionId`, `fresh`, `isEmpty`, `readonly`, `revocable` | | |
| `setIntendedUrl`, `getIntendedUrl`, `pullIntendedUrl`, `clearIntendedUrl` | | Là où l'utilisateur voulait aller. |
| `supportsTagging` | `supportsTagging(): boolean` | |
| `tag` / `untag` | `tag(userId: string \| number): Promise<void>` | Lie la session à un utilisateur. |

### `Env`

| Membre | Signature | Description |
|---|---|---|
| `Env.create` | `static create(appRoot: URL, schema): Promise<Env<…>>` | Charge `.env*`, valide, et renvoie un lecteur typé. Lève `E_INVALID_ENV_VARIABLES`. |
| `Env.schema` | `string`, `number`, `boolean`, `enum`, `secret` | Chacun avec `.optional()` et `.optionalWhen(condition)`. `string` accepte `{ format: 'host' \| 'url' \| 'email' \| 'uuid' }`. |
| `Env.rules` | `static rules(schema): { validate(values) }` | Un validateur réutilisable. |
| `Env.defineIdentifier` / `defineIdentifierIfMissing` / `removeIdentifier` | `static defineIdentifier(name: string, resolver): void` | Des identifiants d'interpolation comme `file:`. |
| `get` | `get(key, fallback?)` | Typé par le schéma. |
| `set` | `set(key, value): void` | |

### `Exception`

```ts
class Exception extends Error {
  constructor(message: string, options?: { status?: number; code?: string })
  static status: number
  static code: string
  static help?: string
  status: number
  code: string
  help?: string
  handle?(error: Exception, ctx: HttpContext): void | Promise<void>
  report?(error: Exception, ctx: HttpContext): void | Promise<void>
}
```

### `ExceptionHandler`

```ts
new ExceptionHandler(debug: boolean)
```

`handle(error, ctx)`, `report(error, ctx)`, et les renderers qu'il choisit par négociation de contenu : `renderError`, `renderErrorAsJSON`, `renderErrorAsJSONAPI`, `renderErrorAsHTML`, `renderValidationError`, `renderValidationErrorAsJSON`, `renderValidationErrorAsJSONAPI`, `renderValidationErrorAsHTML`.

### `Emitter`

| Membre | Signature | Description |
|---|---|---|
| `on` | `on(event: string \| EventClass, listener): UnsubscribeFunction` | |
| `once` | `once(event, listener): void` | |
| `listenIf` | `listenIf(condition: boolean \| (() => boolean), event, listener): UnsubscribeFunction` | |
| `listen` | `listen(event, listeners: (ListenerClass \| LazyListenerImport)[]): void` | Plusieurs classes de listeners. |
| `emit` | `emit(event: string, data: unknown): Promise<void>` | |
| `emitSerial` | `emitSerial(event: string, data: unknown): Promise<void>` | Les listeners un par un. |
| `dispatchEvent` | `dispatchEvent<T extends object>(event: T): Promise<void>` | Un événement sous forme de classe. |
| `onAny` / `offAny` | `onAny(pattern?: string, listener): Promise<AsyncUnsubscribeFunction>` | Un abonnement avec joker. |
| `tap` | `tap(observer: (event: string, data: unknown) => void): UnsubscribeFunction` | Observe chaque émission. |
| `off`, `clearListener`, `clearListeners`, `clearAllListeners` | | |
| `listenerCount`, `hasListeners`, `eventsListeners` | | |
| `onError` | `onError(listener: (event: string, error: unknown) => void): void` | Les échecs des listeners. |
| `fake` / `restore` | `fake(events?: BufferedEventName[]): EventsBuffer` | Capture les événements au lieu de les livrer. |
| `request` / `onRequest` | `request<T>(name: string, data: unknown, timeoutMs?: number): Promise<T>` | Requête et réponse sur le bus. |
| `setCorrelationId`, `getCorrelationId`, `clearCorrelationId` | | L'identifiant de corrélation du contexte asynchrone courant. |

### `BaseCommand`

| Membre | Signature | Description |
|---|---|---|
| `commandName` | `static commandName: string` | |
| `description` | `static description: string` | |
| `aliases` | `static aliases: readonly string[]` | |
| `help` | `static help?: string \| string[]` | |
| `options` | `static options: CommandOptions` | `startApp`, `staysAlive`, `allowUnknownFlags`, … |
| `defineArgument` / `defineFlag` | `static defineArgument(name: string, options?): void` | Sans décorateur. |
| `run` | `run(...args): unknown` | Le corps de la commande. |
| `prepare`, `interact`, `completed` | | Des hooks du cycle de vie autour de `run()`. |
| `terminate` | `terminate(): Promise<void>` | Termine une commande `staysAlive`. |
| `logger`, `ui`, `colors`, `prompt` | | La sortie et les questions. |
| `app` | `Application` | Avec `startApp: true`. |
| `kernel`, `parsed`, `isMain` | | |
| `exitCode` | `number \| undefined` | Une sortie non nulle sans lever d'erreur. |
| `result`, `error` | | Remplis après l'exécution. |
| `exec` | `exec(): Promise<unknown>` | Hydrate, puis exécute. |
| `assertSucceeded`, `assertFailed`, `assertExitCode`, `assertNotExitCode`, `assertLog`, `assertLogMatches`, `assertTableRows` | | Des assertions pour les tests. |

### `@c9up/ream/types`

| Export | Nature | Description |
|---|---|---|
| `ContainerBindings` | interface | Les jetons chaîne que résout le conteneur, avec leurs types. Un paquet ajoute les siens en l'augmentant. |
| `ContainerBinding` | type | `keyof ContainerBindings`. |
| `Authenticators` | interface | Les guards de l'application, augmentée par la configuration d'authentification. |
| `AuthenticatorName` | type | `keyof Authenticators`. |

### `@c9up/ream/exceptions`

`Exception`, `createError`, `ErrorClass`, `RuntimeException`, `InvalidArgumentsException`, `E_ROUTE_NOT_FOUND`, `E_UNAUTHORIZED_ACCESS`, `E_AUTHORIZATION_FAILURE`, `E_VALIDATION_ERROR`, `E_HTTP_EXCEPTION`, `E_HTTP_REQUEST_ABORTED`, `HttpError`, `StatusPageRenderer`, `ExceptionClass`, `ExceptionHandler` : identiques à ceux de `@c9up/ream`.

### `@c9up/ream/env`

| Export | Nature | Description |
|---|---|---|
| `loadEnvFiles` | fonction | `loadEnvFiles(appRoot: URL, options?: { skipEnvLocal?: boolean }): Promise<void>` : charge les fichiers `.env*` dans `process.env` ; une clé existante n'est jamais écrasée. |
| `envFileNames` | fonction | `envFileNames(options?: { skipEnvLocal?: boolean }): string[]` : les fichiers lus, le plus spécifique d'abord. |

### `@c9up/ream/bootstrap`

| Export | Nature | Description |
|---|---|---|
| `createHyperServerFactory` | fonction | `createHyperServerFactory(): ((port: number, host?: string) => HyperServerLike) \| undefined` : le serveur natif de cette plateforme, ou `undefined` quand aucun binaire n'est disponible. |

### `@c9up/ream/hot` et `@c9up/ream/dev/hmr`

`@c9up/ream/hot` n'exporte rien : `ream dev` le charge avec `--import` avant `bin/server.ts`. Il surveille le graphe d'imports et remplace un module modifié dans le processus en cours.

| Export (`dev/hmr`) | Nature | Description |
|---|---|---|
| `HMR_PATH` | const | `"/__ream/hmr"`. |
| `hmrEndpoint` | fonction | Le middleware qui répond au flux de rechargement du navigateur. |
| `hmrClientScript` | fonction | `hmrClientScript(nonce?: string): string` : le script injecté dans les pages HTML en développement. |
| `hmrToken` | fonction | `hmrToken(): string` : change à chaque redémarrage et à chaque remplacement à chaud. |
| `hotReloadCount` | fonction | `hotReloadCount(): number`. |
| `hotReloadHappened` | fonction | `hotReloadHappened(): void` : appelé quand un module a été remplacé. |

### `@c9up/ream/services/*`

L'export par défaut de chaque module est l'instance vivante de l'application en cours, à travers un proxy qui lève une erreur s'il est utilisé avant que l'application ne l'installe.

| Import | Export par défaut | Autres exports |
|---|---|---|
| `services/app` | `Application` | `setApp`, `clearApp`, `getApp` |
| `services/config` | `ConfigStore` | |
| `services/router` | `Router` | `setRouter`, `clearRouter`, `getRouter` |
| `services/server` | `Server` | `setServer`, `clearServer`, `getServer` |
| `services/logger` | le logger de l'app | `setLogger`, `clearLogger`, `getLogger` |
| `services/encryption` | `CookieSigner` | `setEncryption`, `clearEncryption`, `getEncryption` |
| `services/console` | `Console` | `setConsole`, `clearConsole` |
| `services/dumper` | `Dumper` | `dd(value: unknown): never` |
| `services/repl` | `Repl` | |
| `services/urlBuilder` | | `urlFor(name, params?)`, `signedUrlFor(name, params?, options?)` |
| `events/services/main` | `Emitter` | `setEmitter`, `getEmitter` |

### `@c9up/ream/dumper`

| Export | Nature | Description |
|---|---|---|
| `Dumper` | classe | `dumpToAnsi(value, options?)`, `dumpToHtml(value, options?)`, `getHeadElements(cspNonce?)`, `dd(value)`, `configureAnsiOutput(config)`, `configureHtmlOutput(config)`. |
| `ConsoleDumpConfig`, `HTMLDumpConfig`, `DumpSource` | interface | Les options de rendu ; l'endroit où un dump a été écrit. |
| `errors` | namespace | `E_DUMP_DIE_EXCEPTION`. |

`dd()` arrête une requête avec un dump HTML, ou une commande avec un dump imprimé.

### `@c9up/ream/repl`

| Export | Nature | Description |
|---|---|---|
| `Repl` | classe | `start(context?)`, `addMethod(name, handler, options?)`, `ready(callback)`, `useCompiler(compiler)`, `notify(message)`, `getMethods()`, `describeMethods()`, `server`. |
| `ReplConstructorOptions`, `MethodCallback`, `MethodOptions`, `Compiler` | type | |

### `@c9up/ream/bodyparser`, `@c9up/ream/bodyparser_middleware`, `@c9up/ream/bodyparser/config`

La classe du middleware est l'export par défaut ; `BodyParserConfig` est son type de configuration ; `bodyparser/config` exporte `defineConfig(config: BodyParserConfig): BodyParserConfig`. Les options sont sous [Configuration](#configuration).

### `@c9up/ream/session`, `@c9up/ream/session_middleware`, `@c9up/ream/session/config`

La classe du middleware de session est l'export par défaut. `session/config` exporte `defineConfig(config: SessionConfigInput): SessionConfigInput`, qui valide la configuration, et `SessionConfigInput` (`SessionConfig` plus `secret`, exigé par le store cookie).

### `@c9up/ream/events` et ses sous-chemins

| Import | Exports |
|---|---|
| `events` | `Emitter`, `BaseEvent`, `EventsBuffer`, `EventsProvider`, `defineConfig`, `EventsConfig`, `ListenerClass`, `BufferedEvent`, `BufferedEventName`, `EventFinder`, `UnsubscribeFunction`, `AsyncUnsubscribeFunction`, `ContainerResolver` (la forme de résolveur avec laquelle les listeners sont construits), `EventBus`, `EventsAppContext`. |
| `events/provider` | `EventsProvider` (par défaut) : construit le bus et lie `emitter`. |
| `events/config` | `defineConfig`, `checkEventsConfig(config: unknown): EventsConfig`, `EventsConfig`. |
| `events/configure` | `configure(codemods)` : enregistre `@c9up/ream/events/provider` et écrit `config/events.ts`. |
| `events/testing` | `FakeBus` : capture les émissions et les requêtes (`CapturedEmit`, `CapturedRequest`, `FakeBusPredicate`, `FakeBusPredicateArg`, `FakeBusRequestHandler`). |
| `events/helix` | `collect(bus, pattern)`, `fake(bus, pattern)`, `assertEmitted(events, name, payload?)`, `assertNotEmitted(events, name)`, `waitForEvent(events, name, options?)`, `waitForChain(events, correlationId, names, options?)`, et `CollectedEvent`, `CollectResult`, `WaitForEventOptions`, `WaitForChainOptions`. |

### `@c9up/ream/scheduler/provider`, `@c9up/ream/scheduler/config`

`ScheduleProvider` (export par défaut) enregistre le `Scheduler` et les méthodes `@Schedule` ; `ScheduleProviderOptions` accepte un `scheduler` à injecter. `scheduler/config` exporte `defineConfig(config: SchedulerConfig): SchedulerConfig`, `SchedulerConfig`, `LockBackend`, `LockBackendFactory` et `locks` :

```ts
locks.memory(): LockBackendFactory
locks.redis(options: { connection: string | LockRedisResolver; prefix?: string }): LockBackendFactory
```

### `@c9up/ream/rpc/provider`, `@c9up/ream/rpc/router`

`RpcProvider` (export par défaut) monte l'endpoint JSON-RPC. `RpcProviderOptions` : `path` (`/rpc` par défaut), `guards`, `contentTypes`, `router` ; `RpcConfig` : `webSocket?: boolean | RpcWebSocketOptions` sert les méthodes sur un WebSocket au même chemin.

| Membre de `RpcRouter` | Signature | Description |
|---|---|---|
| `method` | `method(name: string, handler: RpcHandler): RpcMethodBuilder` | Les noms qui commencent par `rpc.` sont réservés. |
| `namespace` | `namespace<T>(prefix: string, controller, methods: readonly ControllerMethodName<T>[]): void` | Enregistre des méthodes de contrôleur sous `<prefix>.<method>`. |
| `group` | `group(config: { guard?; guards?; middleware? }, callback: (rpc: RpcRouter) => void): void` | |
| `handle` | `handle(ctx: HttpContext): Promise<void>` | Répond à une requête ou à un lot JSON-RPC. |
| `webSocket` | `webSocket(options?: RpcWebSocketOptions): (ctx: WebSocketContext) => void` | `maxInFlight`, `maxQueued`. |
| `useContainer` | `useContainer(container): void` | Résout les contrôleurs des namespaces. |
| `getMethods` / `getMethod` | `getMethods(): string[]` | |

`RpcMethodBuilder` : `guard`, `role`, `permission`, `validate`, `middleware`. Également exportés : `RpcHandler`, `RpcMethodDefinition`, `RpcRouterOptions`, `RpcWebSocketOptions`, `ControllerMethodName`.

### `@c9up/ream/graphql/provider`, `@c9up/ream/openapi/provider`, `@c9up/ream/storage/provider`

| Provider | Options |
|---|---|
| `GraphQLProvider` (par défaut) | `GraphQLProviderOptions` : `engine` à injecter. |
| `OpenApiProvider` (par défaut) | `OpenApiDocsConfig` : `enabled` (`true` par défaut), `specPath` (`/api-docs` par défaut), `docsPath` (Swagger UI, `/docs` par défaut), `title` (`'API'` par défaut), `version` (`'1.0.0'` par défaut). `OpenApiProviderOptions` : `generator` à injecter. |
| `StaticProvider` (par défaut) | `StaticProviderOptions` : `middleware` à injecter. |

### `@c9up/ream/health`

| Export | Nature | Description |
|---|---|---|
| `HealthChecks` | classe | `register(checks)`, `append(checks)`, `run(): Promise<HealthCheckReport>` : exécute tous les checks en parallèle. |
| `BaseCheck` | classe | La base d'un check. |
| `DiskSpaceCheck`, `MemoryHeapCheck`, `MemoryRSSCheck` | classe | Les checks intégrés. |
| `Result` | classe | Construit le résultat d'un check. |
| `HealthCheckContract`, `HealthCheckReport`, `HealthCheckResult`, `HealthCheckTracingData` | type | Le `isHealthy` d'un rapport est faux dès qu'un check signale `error`. |
| `tracingChannels` | namespace | Les canaux de diagnostic autour de chaque check. |

### `@c9up/ream/http-client`

| Export | Nature | Description |
|---|---|---|
| `HttpClient` | classe | `get`, `post`, `put`, `patch`, `delete`, `request(input, options?)`, `close()`. Refuse les adresses non publiques. |
| `HttpResponse` | classe | `status`, `headers`, `url`, `body`, `ok`, `header(name)`, `text()`, `json()`. |
| `HttpClientOptions`, `HttpRequestOptions`, `OutgoingRequest` | interface | |
| `fakeHttp` | fonction | `fakeHttp(options?: HttpClientOptions): FakeHttpClient`. |
| `FakeHttpClient` | classe | `on(method, match, response)`, `onAny(match, response)`, `requests`, `reset()`. |
| `FakeMatcher`, `FakeResponse`, `RecordedRequest` | type | |
| `isPublicAddress` | fonction | `isPublicAddress(address: string): boolean`. |

Une requête en échec lève l'une des erreurs `errors.E_HTTP_CLIENT_INVALID_URL`, `E_HTTP_CLIENT_PRIVATE_ADDRESS`, `E_HTTP_CLIENT_UNREACHABLE`, `E_HTTP_CLIENT_TIMED_OUT`, `E_HTTP_CLIENT_TOO_LARGE` ou `E_HTTP_CLIENT_REDIRECT_REFUSED` (`errors` de `@c9up/ream`) ; chacune porte `url`, l'URL demandée sans sa chaîne de requête.

`HttpClientOptions` : `timeout` (ms, `10000` par défaut, redirections comprises), `maxResponseBytes` (5 MiB par défaut), `maxRedirects` (`3` par défaut), `crossHostRedirects` (`false` par défaut), `userAgent` (`@c9up/ream` par défaut), `headers`, `allowHosts` (des hôtes exemptés de la règle des adresses publiques). `HttpRequestOptions` : `method`, `headers`, `body`, `json`, `signal`, `timeout`, `maxResponseBytes`.

### `@c9up/ream/console`

Tout ce qui figure sous Console ci-dessus, plus : `Console`, `ConsoleOptions`, `ExceptionHandler` (celui de la console), `TaskContext`, `Tasks`, `Table`, `Box`, `Action`, `Colors`, `StyleName`, `TaskOutcome` (depuis `@c9up/lumen`), `ArgumentOptions`, `FlagOptions`, `CommandsManifest`, `CommandExecutor`, `CommandLoader`, `ErrorRenderer`, `GlobalFlagListener`, `HandleResult`, `KernelOptions`, `KernelState`, `serializeCommand`, `ParseOptions`, `parseArgv`, `PromptOptions`, `BooleanPromptOptions`, `MultiplePromptOptions`, `SelectPromptOptions`, `PromptChoice`, `commandExec` (canal de traçage), `ExecutedCommand`, `ParsedInput`, `isCommandClass`, `renderErrorWithSuggestions`, `sortAlphabetically`, `validateCommand`, `validateCommandMetaData`.

### `@c9up/ream/commands`

Un loader de commandes : `getMetaData(): Promise<SerializedCommand[]>` et `getCommand(metadata): Promise<CommandClass | null>`, sur `migrate`, `migrate:rollback`, `migrate:status`, `schedule:list` et `schedule:run`.

### `@c9up/ream/stubs`

| Export | Nature | Description |
|---|---|---|
| `stubsRoot` | const | `<package>/stubs` : les stubs des commandes `make:`. |
| `compile` | fonction | `compile(input: string, options?: TemplateOptions): (state: StubState) => string`. |
| `render` | fonction | `render(input: string, state?: StubState, options?: TemplateOptions): string`. |
| `escapeHtml` | fonction | `escapeHtml(value: unknown): string`. |
| `StubValue`, `StubFunction`, `StubState`, `StubBlock`, `TemplateOptions` | type | |

### `@c9up/ream/helpers`

| Export | Nature | Description |
|---|---|---|
| `string` | const | Les helpers de chaînes (ci-dessous), plus `bytes`, `milliseconds` et `seconds`. |
| `is` | const | Les vérifications de types (ci-dessous). |
| `base64` | const | `encode`, `decode`, `urlEncode`, `urlDecode` ; un décodage renvoie `null` sur une entrée invalide. |
| `Secret` | classe | Une valeur qui s'imprime `[redacted]`. |
| `safeEqual` | fonction | `safeEqual(a: string \| Buffer, b: string \| Buffer): boolean` : une comparaison en temps constant. |
| `safeTiming` | fonction | `safeTiming<T>(minimumMs: number, callback: (timing: { returnEarly(): void }) => Promise<T>): Promise<T>` : ne rend jamais la main avant `minimumMs`. |
| `compose` | fonction | `compose(superclass, ...mixins)` : applique des mixins à une classe de base. |
| `defineStaticProperty` | fonction | `defineStaticProperty<T>(target, propertyName, { initialValue, strategy: 'inherit' \| 'define' \| ((value: T) => T) })` : donne à une sous-classe sa propre copie d'une propriété statique héritée. |
| `milliseconds`, `seconds` | const | `parse(duration: string \| number): number` et `format(value: number, long?: boolean): string`. |
| `MessageBuilder` | classe | Construit et vérifie l'enveloppe d'un message, avec un usage et une expiration. |
| `VerificationToken` | classe | La base abstraite des jetons à usage unique (`<identifier>.<secret>`, seul le SHA-256 du secret est stocké) ; étendez-la pour ajouter la persistance. |
| `fsReadAll`, `fsImportAll`, `ReadAllFilesOptions`, `ImportAllFilesOptions` | fonction / type | Lisent ou importent chaque fichier d'un dossier. |
| `isString`, `isNumber`, … `hasProperty` | fonction | Les fonctions de `is`, aussi exportées une par une. |
| les helpers de types | type | Comme dans `helpers/types`. |

`@c9up/ream/helpers/string` (aussi l'export par défaut) : `camelCase`, `snakeCase`, `pascalCase`, `dashCase`, `dotCase`, `noCase`, `titleCase`, `capitalCase`, `sentenceCase`, `sentence`, `toSentence`, `wordWrap`, `justify`, `truncate`, `excerpt`, `condenseWhitespace`, `slug`, `plural`, `pluralize`, `singular`, `isPlural`, `isSingular`, `ordinal`, `ordinalize`, `humanize`, `htmlEscape`, `escapeHTML`, `encodeSymbols`, `interpolate`, `isEmpty`, `uuid`, `random`, `generateRandom`, `prettyHrTime`, `toUnixSlash`.

`@c9up/ream/helpers/is` (aussi l'export par défaut) : `isString`, `isNumber`, `isBoolean`, `isFunction`, `isObject`, `isPlainObject`, `isArray`, `isPromise`, `isNull`, `isUndefined`, `isNullOrUndefined`, `isBuffer`, `isDate`, `isRegExp`, `isError`, `isEmpty`, `isNonEmptyString`, `isNonEmptyArray`, `isInteger`, `isPositive`, `hasProperty`.

`@c9up/ream/helpers/types` : `InferRouteParams`, `OneOrMore`, `Opaque`, `UnwrapOpaque`, `AsyncOrSync`, `Constructor`, `AbstractConstructor`, `ExtractFunctions`, `Prettify`, `ExtractUndefined`, `ExtractDefined`, `LazyImport`, `UnWrapLazyImport`, `UnwrapPromise`, `MakeOptional`, `MakeRequired`, `MakeNullable`, `DeepPartial`, `DeepRequired`, `DeepReadonly`, `EmptyObject`, `ExtractKeysOfType`, `AllOf`, `NoneOf`, `TypeGuard`, `Brand`.

`@c9up/ream/helpers/base64` : `base64`. `@c9up/ream/helpers/fs` : `fsReadAll`, `fsImportAll`, `ReadAllPathType`, `ReadAllFilesOptions`, `ImportAllFilesOptions`.

### `@c9up/ream/testing`

| Export | Nature | Description |
|---|---|---|
| `TestClient` | classe | Un client HTTP sur l'app démarrée sur un port aléatoire. |
| `createTestClient` | fonction | `createTestClient(bootFn, options?: { auth?: AuthStrategy }): Promise<TestClient>` : en crée un et le démarre. |
| `RequestBuilder` | classe | Une requête : awaitable, avec des assertions chaînées. |
| `ApiResponse` | classe | La réponse, avec ses assertions. |
| `TestWebSocket`, `TestWebSocketOptions`, `TestWebSocketClose` | classe / type | `client.ws(path)`. |
| `AuthStrategy`, `AuthSubject` | interface | La façon dont `withAuth()` / `asUser()` authentifient. |
| `RouteManifest`, `RouteEntry`, `resolveNamedRoute` | type / fonction | Les routes nommées pour `visit()`. |
| `HttpMethod`, `HttpSender`, `QueryParams`, `TestResponse` | type | |
| `parseHttpResponse` | fonction | `parseHttpResponse(raw: string \| Buffer): TestResponse`. |
| `partialMatch` | fonction | `partialMatch(actual: unknown, expected: unknown): boolean`. |

| Membre de `TestClient` | Signature | Description |
|---|---|---|
| constructeur | `new TestClient(bootFn: (port: number) => Promise<{ port; close }>, options?: { auth?: AuthStrategy; routes?: RouteManifest })` | |
| `boot` / `close` | `boot(): Promise<void>` | Idempotent. |
| `booted`, `port` | | |
| `get`, `post`, `put`, `patch`, `delete`, `head`, `options` | `get(path: string): RequestBuilder` | |
| `request` / `fluent` | `request(path: string, method?: HttpMethod): RequestBuilder` | |
| `visit` | `visit(name: string, params?: Record<string, string>): RequestBuilder` | Envoie un GET à une route nommée. |
| `withHeader` | `withHeader(name: string, value: string): TestClient` | Un header par défaut. |
| `ws` | `ws(path: string, options?: TestWebSocketOptions): Promise<TestWebSocket>` | |

`RequestBuilder` : le corps et les headers (`json`, `form`, `body`, `field`, `fields`, `file`, `header`, `headers`, `cookie`, `cookies`, `qs`, `type`, `accept`, `bearerToken`, `basicAuth`, `unsafeJson`, `unsafeForm`, `unsafeQs`, `serialize`), le comportement (`timeout`, `redirects`), l'authentification (`withAuth`, `asUser`, `loginAs`, `withCsrf` / `withCsrfToken`), le débogage (`dump`, `dumpBody`, `dumpHeaders`, `dumpCookies`), `send()`, et les assertions ci-dessous. `RequestBuilder.addSerializer(name, fn)` et `addParser(contentType, fn)` enregistrent des codecs de corps.

`ApiResponse` : `status()`, `statusType()`, `headers()`, `header(name)`, `text()`, `body()`, `json<T>()`, `method()`, `type()`, `charset()`, `cookies()`, `cookie(name)`, `redirects()`, `links()`, `files()`, `hasBody()`, `hasError()`, `hasFatalError()`, `error()`, les méthodes `dump*()`, `assertAgainstApiSpec()`, et les assertions ci-dessous.

Les assertions, sur les deux : `assertStatus`, `assertHeader`, `assertHeaderMissing`, `assertCookie`, `assertCookieMissing`, `assertBody`, `assertBodyContains`, `assertBodyNotContains`, `assertTextIncludes`, `assertRedirectsTo`, et une par statut : `assertOk`, `assertCreated`, `assertAccepted`, `assertNoContent`, `assertMovedPermanently`, `assertFound`, `assertBadRequest`, `assertUnauthorized`, `assertPaymentRequired`, `assertForbidden`, `assertNotFound`, `assertMethodNotAllowed`, `assertNotAcceptable`, `assertRequestTimeout`, `assertConflict`, `assertGone`, `assertLengthRequired`, `assertPreconditionFailed`, `assertPayloadTooLarge`, `assertURITooLong`, `assertUnsupportedMediaType`, `assertRangeNotSatisfiable`, `assertImATeapot`, `assertUnprocessableEntity`, `assertLocked`, `assertTooManyRequests`, `assertInternalServerError`. `RequestBuilder` a aussi `expectStatus`, `expectHeader`, `expectCookie`, `expectJson`.

### `@c9up/ream/testing/utils`

| Export | Nature | Description |
|---|---|---|
| `createTestUtils` | fonction | `createTestUtils(boot: BootServer): TestUtils`. |
| `TestUtils` | classe | `httpServer(): HttpServerUtils`, `client(): TestClient \| undefined`. |
| `HttpServerUtils` | classe | `start(): Promise<() => Promise<void>>` : démarre le serveur et renvoie sa fonction de fermeture. |
| `BootServer` | type | `(port: number) => Promise<{ port: number; close: () => Promise<void> \| void }>`. |

## Configuration

### `reamrc.ts`

`defineConfig(config: ReamrcConfig)` depuis `@c9up/ream` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `providers` | `(() => Promise<{ default: Provider }> \| { file; environment?: string[] })[]` | | Les providers, éventuellement limités à certains environnements. |
| `preloads` | `(() => Promise<unknown> \| { file; environment?: string[] })[]` | | Les modules importés au démarrage (`start/routes.ts`, `start/kernel.ts`). |
| `commands` | `(() => Promise<unknown>)[]` | | Les loaders de commandes. |
| `commandsAliases` | `Record<string, string>` | | Des raccourcis : `{ resource: 'make:controller --resource' }`. |
| `directories` | `Partial<DirectoriesNode>` | l'arborescence conventionnelle | Des surcharges, fusionnées sur les valeurs par défaut. |
| `modules` | `{ path?: string; autoload?: string[] }` | `./app/modules`, `['routes', 'events']` | Ce qui est chargé depuis chaque dossier de module ; un `/` final désigne un dossier. |
| `tests` | `TestsConfig` | | `suites` (`name`, `files`, `timeout`, `retries`, `configure`), `timeout`, `forceExit`, `bootstrap`. Lu par `ream test`. |
| `assets` | `{ devServer?: { command; args? }; build?: { command; args? } }` | | La commande d'assets que `ream dev` et `ream build` lancent à côté de l'app. |
| `metaFiles` | `{ pattern: string; reloadServer: boolean }[]` | | Les fichiers de l'app qui ne sont pas des modules ; `reloadServer` redémarre le serveur de développement quand l'un d'eux change. |
| `mobile` | `MobileConfig` | | L'app mobile que construit `ream android:*` : `name`, `id`, `entry`, `version` (`1.0.0` par défaut), `build`, `icon`, `css`, `android` (`permissions`, `abis`, `signing`), `updates` (`url`, `publicKey`, `directory`). |

### Options de `Ignitor`

`new Ignitor(appRoot, config?: IgnitorConfig)` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `port` | `number` | `PORT`, puis `3000` | |
| `host` | `string` | `HOST`, puis `0.0.0.0` en production et `localhost` sinon | |
| `serverFactory` | `(port: number, host: string) => HyperServerLike` | | Le serveur HTTP ; `createHyperServerFactory()` donne le serveur natif. |
| `importer` | `(filePath: string) => Promise<unknown>` | | La façon d'importer les modules de l'app. |
| `watchDirs` | `string[]` | | Les dossiers surveillés pour le rechargement à chaud. |
| `gracefulShutdown` | `boolean` | `true` | Laisse finir les requêtes en cours sur SIGTERM / SIGINT (mode web). |

### `config/app.ts` : `http`

Lu par le serveur natif. Les délais sont en millisecondes ; `0` désactive une borne.

| Option | Défaut | Description |
|---|---|---|
| `http.headersTimeout` | `60000` | Le délai pour recevoir les headers de la requête. |
| `http.requestTimeout` | `300000` | Le délai pour recevoir toute la requête. |
| `http.keepAliveTimeout` | `5000` | Le temps d'inactivité d'une connexion keep-alive. |
| `http.maxConnections` | `10000` | Les connexions ouvertes ; `0` pour aucune limite. |
| `http.webSocket.maxFrameSize` | 1 MiB | En octets, ou une taille comme `'1mb'`. |
| `http.webSocket.maxMessageSize` | 1 MiB | |
| `http.webSocket.maxBufferedBytes` | 4 MiB | Le volume sortant en attente par connexion. |
| `http.webSocket.idleTimeout` | `60000` | `0` ne ferme jamais. |
| `http.webSocket.allowedOrigins` | même origine | Les origines de navigateur autorisées à se connecter, ou `['*']`. |

### `config/bodyparser.ts`

`defineConfig` depuis `@c9up/ream/bodyparser/config`. Le serveur natif applique chaque `limit` pendant la lecture du corps.

| Option | Défaut | Description |
|---|---|---|
| `allowedMethods` | `['POST', 'PUT', 'PATCH', 'DELETE']` | Les méthodes dont le corps est analysé. |
| `json.limit` | `'1mb'` | Une taille en chaîne ou un nombre d'octets. |
| `json.types` | `application/json`, `application/json-patch+json`, `application/vnd.api+json`, `application/csp-report` | |
| `json.strict` | `true` | Seulement des objets et des tableaux. |
| `json.convertEmptyStringsToNull`, `json.trimWhitespaces` | `true` | |
| `form.limit` | `'1mb'` | |
| `form.types` | `application/x-www-form-urlencoded` | |
| `form.convertEmptyStringsToNull`, `form.trimWhitespaces` | `true` | |
| `form.queryString` | `{}` | Les options de l'analyseur de query string. |
| `raw.limit` | `'1mb'` | |
| `raw.types` | `text/*` | |
| `multipart.limit` | `'20mb'` | |
| `multipart.maxFiles`, `multipart.maxFields` | `1000` | |
| `multipart.types` | `multipart/form-data` | |
| `multipart.convertEmptyStringsToNull`, `multipart.trimWhitespaces` | `true` | |

### `config/session.ts`

`defineConfig` depuis `@c9up/ream/session/config` :

| Option | Défaut | Description |
|---|---|---|
| `store` | aucun : obligatoire | Une clé de `stores`, ou un nom de driver (`cookie`, `memory`, `file`, `redis`, `database`). |
| `stores` | | Les stores nommés : `{ driver, ...options }`. |
| `secret` | | Signe le cookie de session ; exigé par le store cookie. |
| `cookieName` | `'ream_session'` | |
| `age` | 7200 secondes | Un nombre de secondes ou une durée comme `'2h'`. |
| `clearWithBrowser` | `false` | Un cookie sans expiration. |
| `rolling` | `false` | Renvoie le cookie avec chaque réponse. |
| `cookie` | `{ path: '/', httpOnly: true, sameSite: 'lax' }`, `secure` en production | `httpOnly: false` est refusé. |
| `location` | | Store `file` : le dossier. |
| `dbConnection`, `tableName`, `gcProbability` | `tableName: 'sessions'` | Store `database`. |
| `connection`, `client`, `prefix` | `prefix: 'ream:session:'` | Store `redis`. |

### `config/events.ts`

`defineConfig` depuis `@c9up/ream/events/config` : `store: 'memory'` (le store par défaut et le seul). Toute autre option est refusée.

### `config/scheduler.ts`

`defineConfig` depuis `@c9up/ream/scheduler/config` :

| Option | Défaut | Description |
|---|---|---|
| `lock` | aucun : chaque instance exécute chaque tâche | `locks.memory()` ou `locks.redis({ connection })`. |
| `defaultLockTtlMs` | `60000` | La durée d'un bail. |

### Fichiers statiques

`defineStaticConfig(config?: Partial<StaticConfig>)` :

| Option | Défaut | Description |
|---|---|---|
| `root` | | Le dossier servi. |
| `enabled` | `true` | |
| `prefix` | | Ne sert que sous ce préfixe d'URL. |
| `index` | `'index.html'` | `false` le désactive. |
| `extensions` | | Les extensions essayées quand le chemin n'en a pas. |
| `dotFiles` | `'ignore'` | `'ignore'`, `'deny'` (403) ou `'allow'`. |
| `etag`, `lastModified`, `cacheControl`, `acceptRanges` | `true` | |
| `maxAge` | `0` | `Cache-Control: max-age`, en millisecondes. |
| `immutable` | `false` | Exige `maxAge`. |
| `headers` | | `(filePath, stat) => Record<string, string>` : des headers supplémentaires par fichier. |

## Liaisons du conteneur

| Jeton | Se résout en |
|---|---|
| `app` | `Application` |
| `appRoot` | `string` : la racine absolue du projet |
| `config` | `ConfigStore` |
| `router` | `Router` |
| `server` | `Server` |
| `middleware` | `MiddlewareRegistry` |
| `HttpContext` | la classe `HttpContext` |
| `encryption` | `CookieSigner` |
| `signedUrl` | `SignedUrl` |
| `emitter` | `Emitter` |
| `migrations` | `MigrationRegistry` |
| `console` | `Console` |
| `consoleKernel` | `Kernel` |

Les autres paquets ajoutent les leurs (`logger`, `auth`, `db`, …) en augmentant `ContainerBindings` depuis `@c9up/ream/types`.

## Erreurs

Chaque code renvoie à sa ligne dans l'[index des erreurs](/fr/reference/errors).

### Conteneur

| Code | Levée quand |
|---|---|
| [`E_CONTAINER_NOT_FOUND`](/fr/reference/errors#e-container-not-found) | Aucun binding trouvé pour le token demandé. Inclut des suggestions « vouliez-vous dire ? » pour les fautes de frappe. Enregistrez-le avec `container.singleton()` ou décorez la classe avec `@inject()`. |
| [`E_CIRCULAR_DEPENDENCY`](/fr/reference/errors#e-circular-dependency) | Dépendance circulaire (ou alias circulaire) détectée pendant la résolution. Utilisez des factories explicites ou découplez via des événements. |
| [`E_CONTAINER_MISSING_METADATA`](/fr/reference/errors#e-container-missing-metadata) | Une classe déclare des paramètres de constructeur mais le conteneur ne trouve aucune métadonnée de dépendance pour eux. Activez les métadonnées de décorateurs, annotez les paramètres avec `@inject()`, ou déclarez `static containerInjections`. |
| [`E_CONTAINER_RESERVED_TOKEN`](/fr/reference/errors#e-container-reserved-token) | Le nom du token se lit comme une clé d'`Object.prototype` (`constructor`, `__proto__`…). Choisissez un autre nom. |
| [`E_CONTAINER_MISSING_ASKS_FOR`](/fr/reference/errors#e-container-missing-asks-for) | `container.when(...).provide()` a été appelé avant `asksFor()` : la liaison contextuelle ne dit pas quelle dépendance elle remplace. |
| [`E_CONTAINER_METHOD_NOT_CALLABLE`](/fr/reference/errors#e-container-method-not-callable) | `container.call()` a nommé un membre de l'instance qui n'est pas une méthode. |
| [`E_CONTAINER_INVALID_DECORATOR_TARGET`](/fr/reference/errors#e-container-invalid-decorator-target) | `@Service()` ou `@inject()` a été posé sur autre chose qu'une classe (ou, pour `@inject()`, l'une de ses méthodes). |

### Routeur

| Code | Levée quand |
|---|---|
| [`E_ROUTE_NOT_FOUND`](/fr/reference/errors#e-route-not-found) (404) | Aucune route ne correspond à la méthode et au chemin demandés. Le message est `Cannot GET:/chemin`. |
| [`E_DUPLICATE_ROUTE`](/fr/reference/errors#e-duplicate-route) | Deux routes déclarent la même méthode et le même chemin. |
| [`E_DUPLICATE_ROUTE_NAME`](/fr/reference/errors#e-duplicate-route-name) | Deux routes portent le même nom. |
| [`E_MISSING_ROUTE_NAME`](/fr/reference/errors#e-missing-route-name) | Un groupe nommé préfixe une route qui n'a pas de nom. Nommez chaque route d'un groupe nommé. |
| [`E_INVALID_ROUTE_DOMAIN`](/fr/reference/errors#e-invalid-route-domain) | Un domaine de route a un paramètre sans nom, ou deux fois le même paramètre. |
| [`E_UNREGISTERED_CONTROLLER`](/fr/reference/errors#e-unregistered-controller) | Une route nomme par une chaîne un contrôleur qui n'est pas enregistré. |
| [`E_NO_VIEW_ENGINE`](/fr/reference/errors#e-no-view-engine) | `router.on(path).render()` est utilisé alors qu'aucun moteur de templates n'est installé. |
| [`E_VALIDATOR_NOT_FOUND`](/fr/reference/errors#e-validator-not-found) | Une route nomme un validateur qui n'est pas enregistré. |
| [`E_INVALID_CONTROLLER_REFERENCE`](/fr/reference/errors#e-invalid-controller-reference) | Une chaîne de handler de route n'a pas la forme `'Controller.method'`. |
| [`E_INVALID_RESOURCE_NAME`](/fr/reference/errors#e-invalid-resource-name) | `router.resource()` a reçu un nom vide. |
| [`E_CONTROLLER_METHOD_NOT_FOUND`](/fr/reference/errors#e-controller-method-not-found) | Le contrôleur que nomme une route n'a pas cette méthode. Répond 500. |
| [`E_CANNOT_LOOKUP_ROUTE`](/fr/reference/errors#e-cannot-lookup-route) (500) | `urlFor()`, `findOrFail()` ou le `visit()` du client de test a nommé une route qui n'existe pas. |
| [`E_MISSING_ROUTE_PARAMS`](/fr/reference/errors#e-missing-route-params) | Une URL a été construite pour une route sans l'un de ses paramètres requis. |

### WebSocket

| Code | Levée quand |
|---|---|
| [`E_WEBSOCKET_UPGRADE_REQUIRED`](/fr/reference/errors#e-websocket-upgrade-required) (426) | Une requête ordinaire a atteint une route WebSocket. |
| [`E_WEBSOCKET_UNSUPPORTED`](/fr/reference/errors#e-websocket-unsupported) (501) | Une route WebSocket a été atteinte sur un serveur qui ne sait pas tenir de WebSocket. |
| [`E_WEBSOCKET_BAD_HANDSHAKE`](/fr/reference/errors#e-websocket-bad-handshake) (400) | La poignée de main n'est pas un GET HTTP/1.1, n'a pas `Connection: upgrade`, ou sa `Sec-WebSocket-Key` ne fait pas 16 octets. Répondu par le serveur, avant le routage. |
| [`E_WEBSOCKET_VERSION`](/fr/reference/errors#e-websocket-version) (426) | Une version de WebSocket autre que 13. Répondu avec `Sec-WebSocket-Version: 13`, avant le routage. |
| [`E_WEBSOCKET_ORIGIN`](/fr/reference/errors#e-websocket-origin) (403) | Une origine de navigateur que `http.webSocket.allowedOrigins` n'autorise pas (même origine par défaut). Répondu avant le routage. |
| [`E_WEBSOCKET_PROTOCOL`](/fr/reference/errors#e-websocket-protocol) (500) | `socket.acceptProtocol()` a nommé un sous-protocole que le client n'a pas proposé. |
| [`E_WEBSOCKET_NOT_REGISTERED`](/fr/reference/errors#e-websocket-not-registered) (500) | Une réponse `101` sans socket enregistré. |
| [`E_WEBSOCKET_NOT_UPGRADE`](/fr/reference/errors#e-websocket-not-upgrade) (500) | Un `101` en réponse à une requête qui n'était pas une poignée de main WebSocket. |
| [`E_WEBSOCKET_REGISTER`](/fr/reference/errors#e-websocket-register) | Le serveur natif a refusé un nouvel identifiant de socket. |
| [`E_WEBSOCKET_CONTEXT`](/fr/reference/errors#e-websocket-context) | Le handler d'une route WebSocket a tourné sans son socket (appelé hors du kernel). |
| [`E_WEBSOCKET_CLOSE_CODE`](/fr/reference/errors#e-websocket-close-code) | `socket.close()` avec un code qu'une trame de fermeture ne peut pas porter (RFC 6455 §7.4). |
| [`E_WEBSOCKET_CLOSE_REASON`](/fr/reference/errors#e-websocket-close-reason) | Une raison de fermeture de plus de 123 octets. |
| [`E_INVALID_WEBSOCKET_CONFIG`](/fr/reference/errors#e-invalid-websocket-config) | Une limite WebSocket native de 0 octet. |
| [`E_TEST_CLIENT_WEBSOCKET_REFUSED`](/fr/reference/errors#e-test-client-websocket-refused) | La poignée de main WebSocket du client de test a été refusée (son `status` et son `body` sont la réponse de l'application) ou a échoué. |

### Pipeline de middleware

| Code | Levée quand |
|---|---|
| [`E_PIPELINE_UNKNOWN_MIDDLEWARE`](/fr/reference/errors#e-pipeline-unknown-middleware) | Une route référence un middleware nommé non enregistré. Enregistrez-le avec `middleware.register()`. |
| [`E_MIDDLEWARE_NOT_FOUND`](/fr/reference/errors#e-middleware-not-found) | Un middleware nommé n'a pas pu être résolu à la construction du pipeline. Enregistrez-le avec `middleware.register()`. |
| [`E_MIDDLEWARE_ENTRY`](/fr/reference/errors#e-middleware-entry) | Une entrée de middleware sans paramètre déclaré a été lue comme un import différé, et elle ne mène pas à un module avec un export par défaut. |
| [`E_PIPELINE_DOUBLE_NEXT`](/fr/reference/errors#e-pipeline-double-next) | Un middleware a appelé `next()` plus d'une fois. Chaque middleware doit appeler `next()` au plus une fois. |
| [`E_PIPELINE_ERROR`](/fr/reference/errors#e-pipeline-error) | Un handler a levé une erreur qui ne porte aucun code du framework. L'erreur garde la position de l'étape dans son contexte. |
| [`E_VALIDATOR_UNUSABLE`](/fr/reference/errors#e-validator-unusable) | Un validateur de route n'expose ni `validateResultAsync()`, ni `validateResult()`, ni `validate()`. |

### HTTP

| Code | Levée quand |
|---|---|
| [`E_UNKNOWN`](/fr/reference/errors#e-unknown) (500) | Le code que le gestionnaire d'exceptions rapporte pour une valeur levée qui n'en porte aucun. |
| [`E_RUNTIME_EXCEPTION`](/fr/reference/errors#e-runtime-exception) (500) | `RuntimeException` : une défaillance du programme, pas de la requête. |
| [`E_INVALID_ARGUMENTS_EXCEPTION`](/fr/reference/errors#e-invalid-arguments-exception) (500) | `InvalidArgumentsException` : une fonction a été appelée avec des arguments inutilisables. |
| [`E_HTTP_EXCEPTION`](/fr/reference/errors#e-http-exception) (variable) | Une erreur HTTP générique qui porte le `body` de la réponse. `E_HTTP_EXCEPTION.invoke(body, status, code?)` en construit une : le message est le corps s'il est une chaîne, ou le `message` d'un corps objet. |
| [`E_HTTP_REQUEST_ABORTED`](/fr/reference/errors#e-http-request-aborted) (400) | La classe que lève `response.abort()` (ou `abortIf` / `abortUnless`) ; le corps donné part avec le statut donné, 400 par défaut. Elle étend `E_HTTP_EXCEPTION` et en porte le code. |
| [`E_UNAUTHORIZED_ACCESS`](/fr/reference/errors#e-unauthorized-access-ream) (401) | Le garde `.auth()` d'une route a refusé la requête, ou `.role()` / `.permission()` n'a trouvé aucun utilisateur authentifié. Mêmes code, statut, message (`Unauthorized access`), `identifier`, `getResponseMessage` et `handle` que celle de `@c9up/warden` : elle se rend elle-même en `401 { "error": { "code", "message" } }`. |
| [`E_AUTHORIZATION_FAILURE`](/fr/reference/errors#e-authorization-failure-ream) (403) | Le `.role()` ou le `.permission()` d'une route a refusé un utilisateur authentifié. Mêmes code, statut, message (`Access denied`), `identifier`, `getResponseMessage` et `handle` que celle de `@c9up/warden` : elle se rend elle-même en négociant le contenu, `{ "errors": [{ "message" }] }` en JSON, un objet d'erreur JSON:API, le message en texte pour du HTML, une soumission de formulaire refusée avec une session redirigée vers la page précédente avec le message en flash. Les rôles et permissions demandés ne sont pas envoyés. |
| [`E_VALIDATION_ERROR`](/fr/reference/errors#e-validation-error) (422) | Les données de la requête n'ont pas passé la validation. Le message est `Validation failure`, `messages` porte une entrée par champ et par règle ; un formulaire de navigateur est renvoyé en arrière avec les erreurs en flash. |
| [`E_REQUEST_ENTITY_TOO_LARGE`](/fr/reference/errors#e-request-entity-too-large) (413) | Le corps de la requête dépasse la limite du body parser. Lire le corps brut d'une telle requête la lève aussi. |
| [`E_HANDLER_FAILURE`](/fr/reference/errors#e-handler-failure) (500) | Le gestionnaire d'exceptions a lui-même levé une erreur en rendant une erreur. |
| [`E_HTTP_CONTEXT_NOT_FOUND`](/fr/reference/errors#e-http-context-not-found) | `HttpContext.getOrFail()` a été appelé hors d'une requête, ou avec le suivi du contexte ambiant désactivé. Passez `ctx` explicitement. |
| [`E_RESPONSE_TOO_LARGE`](/fr/reference/errors#e-response-too-large) | Un corps de réponse dépasse le plafond configuré. Les corps sont gardés entiers en mémoire : servez un gros fichier en flux ou depuis le stockage. |
| [`E_BODYPARSER_CONFIG`](/fr/reference/errors#e-bodyparser-config) | La configuration du body parser utilise une option qui n'est plus prise en charge. |
| [`E_BODYPARSER_INVALID_SIZE`](/fr/reference/errors#e-bodyparser-invalid-size) | Une limite de taille de corps n'est ni un nombre d'octets ni une taille comme `'1mb'`. |
| [`E_ENCODING_UNSUPPORTED`](/fr/reference/errors#e-encoding-unsupported) (415) | Un corps JSON, formulaire ou texte arrive avec un `Content-Encoding` autre que `identity`. Le parseur de corps ne décompresse pas les corps, gzip et deflate compris. |
| [`E_BODYPARSER_INVALID_JSON`](/fr/reference/errors#e-bodyparser-invalid-json) (400 / 422) | Un corps JSON est mal formé (400), ou, avec `json.strict`, n'est ni un objet ni un tableau (422). |
| [`E_HTTP_REQUEST_TIMEOUT`](/fr/reference/errors#e-http-request-timeout) (408) | Le serveur natif n'a pas reçu le corps de la requête à temps. |
| [`E_REQUEST_ABORTED`](/fr/reference/errors#e-request-aborted) (400) | Le client a fermé la connexion pendant la lecture du corps. |
| [`E_INVALID_MULTIPART_REQUEST`](/fr/reference/errors#e-invalid-multipart-request) (400) | Un corps `multipart/form-data` est mal formé, ou son paramètre `boundary` manque. |
| [`E_PATH_TRAVERSAL`](/fr/reference/errors#e-path-traversal) (400) | Le serveur natif a trouvé `..` dans le chemin, brut ou encodé en pourcentage. |
| [`E_PARAMETER_POLLUTION`](/fr/reference/errors#e-parameter-pollution) (400) | Le serveur natif a trouvé deux fois la même clé dans la query string. |
| [`E_TOO_MANY_REQUESTS`](/fr/reference/errors#e-too-many-requests) (429) | La limite de débit du serveur natif a refusé la requête ; le corps porte `retryAfter`, avec les headers `Retry-After` et `X-RateLimit-*`. |
| [`E_STREAM_UNKNOWN`](/fr/reference/errors#e-stream-unknown) (500) | Un identifiant de flux server-sent events est inconnu du serveur. |
| [`E_RESPONSE_INVALID_HEADER`](/fr/reference/errors#e-response-invalid-header) | Un nom ou une valeur d'en-tête contient CR, LF ou NUL, ce qui scinderait la réponse. |
| [`E_RESPONSE_INVALID_COOKIE`](/fr/reference/errors#e-response-invalid-cookie) | Des options de cookie qu'un navigateur rejette : `sameSite: true`, `SameSite=None` ou `partitioned` sans `secure`, ou une date `expires` invalide. |
| [`E_RESPONSE_NO_CONTEXT`](/fr/reference/errors#e-response-no-context) | `response.redirect()` sur une réponse construite hors d'une requête. |
| [`E_RESPONSE_SSE_UNSUPPORTED`](/fr/reference/errors#e-response-sse-unsupported) | `response.sse()` sur un serveur qui n'a pas de backend de flux. |
| [`E_REDIRECT_NO_ROUTER`](/fr/reference/errors#e-redirect-no-router) | `redirect().toRoute()` sans résolveur d'URL de route branché. |
| [`E_STREAM_REGISTER`](/fr/reference/errors#e-stream-register) | Le serveur a refusé un nouvel identifiant de flux d'événements serveur. |
| [`E_MULTIPART_UNSAFE_FILE_NAME`](/fr/reference/errors#e-multipart-unsafe-file-name) | `file.move()` a reçu, ou a tiré du nom de fichier du client, un nom qui n'est pas un simple nom de fichier. |
| [`E_MULTIPART_FILE_EXISTS`](/fr/reference/errors#e-multipart-file-exists) | `file.move()` a trouvé un fichier à la destination et `overwrite` est désactivé. |
| [`E_TEST_CLIENT_NO_ROUTE_MANIFEST`](/fr/reference/errors#e-test-client-no-route-manifest) | Le `visit()` du client de test exige `routes: router.namedManifest()` dans les options du client. |
| [`E_TEST_CLIENT_TIMEOUT`](/fr/reference/errors#e-test-client-timeout) | Une requête du client de test, ou un message WebSocket de test, n'est pas arrivé dans son délai. |
| [`E_TEST_CLIENT_MISSING_CSRF_TOKEN`](/fr/reference/errors#e-test-client-missing-csrf-token) | `withCsrf()` a été appelé sans token et sans cookie CSRF posé. |
| [`E_TEST_CLIENT_NO_AUTH_STRATEGY`](/fr/reference/errors#e-test-client-no-auth-strategy) | `withAuth()` ou `asUser()` a servi sans stratégie `auth` dans les options du client. |
| [`E_TEST_CLIENT_NO_SESSION_SEEDER`](/fr/reference/errors#e-test-client-no-session-seeder) | `loginAs()` avec un guard de session, et aucun `sessionSeeder` dans les options du client. |
| [`E_TEST_CLIENT_UNKNOWN_SERIALIZER`](/fr/reference/errors#e-test-client-unknown-serializer) | `serialize()` a nommé un sérialiseur qui n'est pas enregistré. |
| [`E_TEST_CLIENT_ASSERTION_FAILED`](/fr/reference/errors#e-test-client-assertion-failed) | Une assertion sur la réponse du client de test a échoué. |

### Sessions

| Code | Levée quand |
|---|---|
| [`E_SESSION_NOT_READY`](/fr/reference/errors#e-session-not-ready) (500) | `session.<method>()` exige un store de session, et cette session a été construite sans. |
| [`E_SESSION_STORE_NOT_CONFIGURED`](/fr/reference/errors#e-session-store-not-configured) (500) | La configuration de session ne nomme aucun store. Fixez `store`, ou `store: 'memory'` pour des sessions gardées dans ce seul processus. |
| [`E_SESSION_STORE_NOT_CONDITIONAL`](/fr/reference/errors#e-session-store-not-conditional) (500) | Le store n'a pas d'`update()` : il ne peut pas réécrire une session seulement tant qu'elle existe, et une requête qui chevauche une déconnexion pourrait reconnecter l'utilisateur. |
| [`E_SESSION_TAGGING_NOT_SUPPORTED`](/fr/reference/errors#e-session-tagging-not-supported) (500) | Une méthode d'étiquetage de session a été appelée sur un store qui ne la prend pas en charge. Utilisez le store memory, redis ou database. |
| [`E_SESSION_COOKIE_NOT_HTTP_ONLY`](/fr/reference/errors#e-session-cookie-not-http-only) (500) | Le cookie de session est configuré avec `httpOnly: false`. Retirez-le : un script capable de lire le cookie change toute XSS en prise de compte. |
| [`E_SESSION_TEMPLATE_ENGINE_UNUSABLE`](/fr/reference/errors#e-session-template-engine-unusable) | Le moteur de templates est installé mais les tags de session ne peuvent pas y être enregistrés. |
| [`E_SESSION_MISSING_SECRET`](/fr/reference/errors#e-session-missing-secret) | Le store de session cookie n'a pas de secret. |
| [`E_SESSION_MISSING_LOCATION`](/fr/reference/errors#e-session-missing-location) | Le store de session fichier n'a pas de `location`. |
| [`E_SESSION_INVALID_CONNECTION`](/fr/reference/errors#e-session-invalid-connection) | La `connection` du store de session base de données n'a pas `query()` et `execute()`. |
| [`E_SESSION_UNKNOWN_DRIVER`](/fr/reference/errors#e-session-unknown-driver) | La configuration de session nomme un driver qui n'existe pas. |
| [`E_SESSION_INVALID_GC_PROBABILITY`](/fr/reference/errors#e-session-invalid-gc-probability) | `gcProbability` n'est pas un pourcentage entre 0 et 100. |
| [`E_SESSION_INVALID_TABLE_NAME`](/fr/reference/errors#e-session-invalid-table-name) | Le nom de la table de session n'est pas un simple identifiant. |
| [`E_SESSION_FILE_LOCKED`](/fr/reference/errors#e-session-file-locked) | Une autre requête a gardé le fichier de session verrouillé plus longtemps que le store n'attend. |
| [`E_SESSION_QUASAR_MISSING`](/fr/reference/errors#e-session-quasar-missing) | Un store de session Redis nomme une connexion quasar et `@c9up/quasar` n'est pas installé. |
| [`E_SESSION_INCOMPLETE_CONNECTION`](/fr/reference/errors#e-session-incomplete-connection) | La connexion quasar n'a pas les commandes qu'envoie un store de session. |

### Application, env et Ignitor

| Code | Levée quand |
|---|---|
| [`E_INVALID_ENV_VARIABLES`](/fr/reference/errors#e-invalid-env-variables) | `Env.create()` a trouvé des variables d'environnement qui ne respectent pas leur schéma. Le message est `Validation failed for one or more environment variables` ; `help` les liste une par ligne `- `, et `failures` les contient. |
| [`E_MISSING_ENCRYPTER_KEY`](/fr/reference/errors#e-missing-encrypter-key) | Le chiffrement, un cookie signé ou une URL signée a été utilisé et `APP_KEY` n'est pas défini. `help` nomme ce qui en avait besoin. |
| [`E_INSECURE_ENCRYPTER_KEY`](/fr/reference/errors#e-insecure-encrypter-key) | `APP_KEY` fait moins de 16 caractères, ou est une clé connue de la génération de projet ou de la documentation. |
| [`E_REAMRC_UNKNOWN_OPTION`](/fr/reference/errors#e-reamrc-unknown-option) | `tests` dans `reamrc.ts` contient une option qui n'existe pas. |
| [`E_MISSING_PROVIDER_FILE`](/fr/reference/errors#e-missing-provider-file) | Une entrée `providers` de `reamrc.ts` n'a pas de `file`. |
| [`E_INVALID_PROVIDER`](/fr/reference/errors#e-invalid-provider) | Une entrée `providers` de `reamrc.ts` a un `file` qui n'est pas une fonction. Un module de provider sans export par défaut, ou dont l'export par défaut n'est pas une classe, lève `E_RUNTIME_EXCEPTION`. |
| [`E_MISSING_PRELOAD_FILE`](/fr/reference/errors#e-missing-preload-file) | Une entrée `preloads` de `reamrc.ts` n'a pas de `file`. |
| [`E_INVALID_PRELOAD_FILE`](/fr/reference/errors#e-invalid-preload-file) | Une entrée `preloads` de `reamrc.ts` a un `file` qui n'est pas une fonction. |
| [`E_IGNITOR_ALREADY_STARTED`](/fr/reference/errors#e-ignitor-already-started) | `warmUp()` a été appelé alors que l'application avait déjà dépassé cette phase. |
| [`E_IGNITOR_WARMUP_ONLY`](/fr/reference/errors#e-ignitor-warmup-only) | Une application assemblée par `warmUp()` a été démarrée. Construisez un nouvel Ignitor pour en lancer une. |
| [`E_IGNITOR_INVALID_PORT`](/fr/reference/errors#e-ignitor-invalid-port) | `PORT` n'est pas un entier entre 0 et 65535. |
| [`E_IGNITOR_INVALID_HTTP_CONFIG`](/fr/reference/errors#e-ignitor-invalid-http-config) | Une limite `http.<clé>` n'est pas un nombre entier dans les bornes. |
| [`E_IGNITOR_NO_SERVER_FACTORY`](/fr/reference/errors#e-ignitor-no-server-factory) | `httpServer()` a été appelé sans `serverFactory` dans la configuration. |
| [`E_IGNITOR_GRPC_UNSUPPORTED`](/fr/reference/errors#e-ignitor-grpc-unsupported) | Un handler gRPC est enregistré, mais ce serveur ne sait pas servir gRPC. |
| [`E_SERVER_GRPC_ALREADY_SET`](/fr/reference/errors#e-server-grpc-already-set) | Un second handler gRPC a été enregistré sur le serveur. |
| [`E_SERVER_GRPC_INVALID_LIMIT`](/fr/reference/errors#e-server-grpc-invalid-limit) | Une limite de taille de message gRPC n'est ni un nombre entier d'octets, ni `-1` pour aucune limite. |
| [`E_REAM_STUB_SYNTAX`](/fr/reference/errors#e-ream-stub-syntax) | Un template de stub a une erreur de syntaxe. |
| [`E_ENV_FILE_NOT_FOUND`](/fr/reference/errors#e-env-file-not-found) | Une valeur `.env` `file:<chemin>` désigne un fichier qui n'existe pas. Le message nomme la variable et le chemin. |
| [`E_ENV_CIRCULAR_REFERENCE`](/fr/reference/errors#e-env-circular-reference) | Des valeurs `.env` se citent en boucle (`A=$B`, `B=$A`). |
| [`E_IDENTIFIER_ALREADY_DEFINED`](/fr/reference/errors#e-identifier-already-defined) (500) | `Env.defineIdentifier()` a reçu un nom déjà enregistré (`file` est fourni). Utilisez `defineIdentifierIfMissing()` ou retirez d'abord l'identifiant. |
| [`E_APP_MISSING_IMPORTER`](/fr/reference/errors#e-app-missing-importer) | `app.import()` / `app.importDefault(id)` a été appelé sur une application construite sans `importer`. |
| [`E_DUMP_DIE_EXCEPTION`](/fr/reference/errors#e-dump-die-exception) (500) | `dd()` a arrêté la requête (réponse avec un dump HTML) ou la commande (dump affiché). Jamais rapporté. |
| [`E_APP_ALREADY_BOOTED`](/fr/reference/errors#e-app-already-booted) | `app.setMode()` ou `app.setEnvironment()` a été appelé après le boot de l'application. |
| [`E_APP_ROOT_NOT_SET`](/fr/reference/errors#e-app-root-not-set) | `app.makePath()` (ou un autre helper de chemin) sur une application sans racine. |
| [`E_APP_MISSING_DEFAULT_EXPORT`](/fr/reference/errors#e-app-missing-default-export) | Un module importé paresseusement (`app.importDefault()`, un listener paresseux) n'a pas d'export par défaut. |
| [`E_APP_SHUTDOWN_FAILED`](/fr/reference/errors#e-app-shutdown-failed) | Plusieurs hooks d'arrêt ont échoué ; `errors` porte chaque échec. |
| [`E_SERVICE_NOT_BOOTED`](/fr/reference/errors#e-service-not-booted) | Un accesseur `@c9up/ream/services/*`, `urlFor()` ou `signedUrlFor()` a servi avant que l'application ne le démarre. |
| [`E_ENV_PATH_NO_FILE`](/fr/reference/errors#e-env-path-no-file) | `ENV_PATH` désigne un dossier qui ne contient aucun des fichiers `.env`. |
| [`E_MIGRATION_SOURCE_CONFLICT`](/fr/reference/errors#e-migration-source-conflict) | Deux providers ont enregistré une source de migrations sous le même nom. |
| [`E_INVALID_DURATION`](/fr/reference/errors#e-invalid-duration) | Une durée (âge de session, `maxAge` de cookie, expiration d'URL signée…) n'est ni un nombre ni une chaîne comme `'30m'`. |
| [`E_BASE64_MALFORMED`](/fr/reference/errors#e-base64-malformed) | `base64.decode()` ou `base64.urlDecode()` en mode strict a rencontré une valeur malformée. |
| [`E_HEALTH_INVALID_THRESHOLD`](/fr/reference/errors#e-health-invalid-threshold) | Un seuil de vérification de santé mémoire n'est pas une taille en octets, ou pas un pourcentage entre 0 et 100. |
| [`E_REAM_STUB_NOT_FOUND`](/fr/reference/errors#e-ream-stub-not-found) | Aucun stub au chemin donné. |
| [`E_REAM_STUB_UNSAFE_PATH`](/fr/reference/errors#e-ream-stub-unsafe-path) | Le chemin d'un stub, ou la destination qu'il déclare, est absolu ou sort de sa racine. |
| [`E_REAM_STUB_NO_DESTINATION`](/fr/reference/errors#e-ream-stub-no-destination) | Un stub ne déclare aucune destination (pas de ligne `to:` en front matter), ou une destination vide. |
| [`E_REAM_STUB_FORBIDDEN_KEY`](/fr/reference/errors#e-ream-stub-forbidden-key) | Un template de stub lit ou écrit une clé qui lui est interdite (`constructor`, `__proto__`…). Une `TypeError`. |
| [`E_REAM_STUB_EVALUATION`](/fr/reference/errors#e-ream-stub-evaluation) | Un template de stub a échoué au rendu : un nom inconnu, une propriété de rien, un appel à ce qui n'est pas une fonction, `{{#each}}` sur ce qui n'est pas une liste. Une `TypeError` ou une `ReferenceError`. |
| [`E_CODEMODS_FILE_NOT_FOUND`](/fr/reference/errors#e-codemods-file-not-found) | Un codemod a besoin de `reamrc.ts`, `start/kernel.ts` ou `start/env.ts` et le fichier n'existe pas. |
| [`E_CODEMODS_UNRECOGNIZED_SOURCE`](/fr/reference/errors#e-codemods-unrecognized-source) | Un codemod n'a pas trouvé ce qu'il modifie dans le fichier (`providers: [`, `defineConfig({ ... })`, `router.use([`, `Env.create(...)`…). Faites la modification à la main. |
| [`E_CODEMODS_UNSAFE_PATH`](/fr/reference/errors#e-codemods-unsafe-path) | Un codemod devait écrire hors du projet : un chemin absolu, `..`, un lien symbolique qui pointe dehors, ou un chemin de module dangereux. |
| [`E_CODEMODS_INVALID_OPTION`](/fr/reference/errors#e-codemods-invalid-option) | Une option de codemod est hors domaine : la `position` ou le `tier` d'un middleware, l'environnement d'un preload. |
| [`E_CODEMODS_INVALID_ENV_VARIABLE`](/fr/reference/errors#e-codemods-invalid-env-variable) | Un nom de variable d'environnement n'est pas un identifiant, ou sa valeur contient un saut de ligne. |
| [`E_CODEMODS_INVALID_ENV_VALIDATION`](/fr/reference/errors#e-codemods-invalid-env-validation) | `defineEnvValidations()` a reçu un commentaire sur plusieurs lignes, ou une règle qui n'est pas une expression complète. |
| [`E_CODEMODS_MIDDLEWARE_CONFLICT`](/fr/reference/errors#e-codemods-middleware-conflict) | Un middleware est déjà enregistré dans l'autre tier de `start/kernel.ts`. |
| [`E_REAM_INTERNAL`](/fr/reference/errors#e-ream-internal) | Un invariant interne de `@c9up/ream` a cédé ; un bogue à signaler. |
| [`E_REAM_NAPI_UNSUPPORTED_PLATFORM`](/fr/reference/errors#e-ream-napi-unsupported-platform) | Aucun binaire natif précompilé (scheduler, bus d'événements, GraphQL) n'existe pour cette plateforme. |
| [`E_REAM_NAPI_LOAD_FAILED`](/fr/reference/errors#e-ream-napi-load-failed) | Un binaire natif existe mais ne se charge pas ; `cause` est l'erreur du chargeur. |
| [`E_REAM_NAPI_NOT_FOUND`](/fr/reference/errors#e-ream-napi-not-found) | Un binaire natif est introuvable. |

### Console

| Code | Levée quand |
|---|---|
| [`E_CONSOLE_COMMAND_NOT_FOUND`](/fr/reference/errors#e-console-command-not-found) | Aucune commande ne porte ce nom. |
| [`E_CONSOLE_MISSING_ARGUMENT`](/fr/reference/errors#e-console-missing-argument) | Un argument obligatoire n'a pas été donné. |
| [`E_CONSOLE_MISSING_ARGUMENT_VALUE`](/fr/reference/errors#e-console-missing-argument-value) | Un argument a été donné sans valeur. |
| [`E_CONSOLE_UNEXPECTED_ARGUMENT`](/fr/reference/errors#e-console-unexpected-argument) | Plus d'arguments que la commande n'en déclare. |
| [`E_CONSOLE_UNKNOWN_FLAG`](/fr/reference/errors#e-console-unknown-flag) | Un flag que la commande ne déclare pas. |
| [`E_CONSOLE_MISSING_FLAG`](/fr/reference/errors#e-console-missing-flag) | Un flag obligatoire n'a pas été donné. |
| [`E_CONSOLE_MISSING_FLAG_VALUE`](/fr/reference/errors#e-console-missing-flag-value) | Un flag qui attend une valeur a été donné sans. |
| [`E_CONSOLE_INVALID_FLAG_VALUE`](/fr/reference/errors#e-console-invalid-flag-value) | Une valeur de flag du mauvais type. |
| [`E_CONSOLE_INVALID_FLAG_GROUP`](/fr/reference/errors#e-console-invalid-flag-group) | Des flags courts ont été groupés (`-abc`) avec un flag qui ne peut pas l'être. |
| [`E_CONSOLE_NOT_INTERACTIVE`](/fr/reference/errors#e-console-not-interactive) | Une commande a posé une question alors que stdin n'est pas interactif. Passez la valeur en flag. |
| [`E_CONSOLE_PROMPT_CANCELLED`](/fr/reference/errors#e-console-prompt-cancelled) | L'utilisateur a annulé une question. |
| [`E_CONSOLE_EMPTY_CHOICES`](/fr/reference/errors#e-console-empty-choices) | Une question à choix a été posée sans aucune option. |
| [`E_CONSOLE_INVALID_TRAP_VALUE`](/fr/reference/errors#e-console-invalid-trap-value) | Une réponse scriptée (un piège de question en test) a été rejetée par la validation de la question. |
| [`E_CONSOLE_TRAP_OUT_OF_RANGE`](/fr/reference/errors#e-console-trap-out-of-range) | Un piège de question a choisi une option qui n'était pas proposée. |
| [`E_CONSOLE_DUPLICATE_COMMAND`](/fr/reference/errors#e-console-duplicate-command) | Deux commandes revendiquent le même nom. |
| [`E_CONSOLE_INVALID_COMMAND`](/fr/reference/errors#e-console-invalid-command) | Une entrée de `commands` dans `reamrc.ts` n'est ni un chargeur de commandes ni une classe de commande exportée par défaut. |
| [`E_CONSOLE_INVALID_COMMAND_METADATA`](/fr/reference/errors#e-console-invalid-command-metadata) | Un chargeur de commandes a exporté des métadonnées qui ne décrivent pas une commande. |
| [`E_CONSOLE_INVALID_ARGUMENT`](/fr/reference/errors#e-console-invalid-argument) | Une commande déclare ses arguments dans un ordre impossible à analyser : un argument après un argument spread, ou un obligatoire après un optionnel. |
| [`E_CONSOLE_INVALID_ALIAS`](/fr/reference/errors#e-console-invalid-alias) | Un alias de commande ne se développe en rien. |
| [`E_CONSOLE_LATE_GLOBAL_FLAG`](/fr/reference/errors#e-console-late-global-flag) | Un flag global a été déclaré après le démarrage du kernel. |
| [`E_CONSOLE_LATE_LOADER`](/fr/reference/errors#e-console-late-loader) | Un chargeur de commandes a été ajouté après le démarrage du kernel. |
| [`E_CONSOLE_KERNEL_RUNNING`](/fr/reference/errors#e-console-kernel-running) | Une commande tourne déjà dans ce kernel. |
| [`E_CONSOLE_KERNEL_COMPLETED`](/fr/reference/errors#e-console-kernel-completed) | Le kernel a terminé ; il ne peut pas exécuter une autre ligne de commande. |
| [`E_CONSOLE_NOT_BOOTED`](/fr/reference/errors#e-console-not-booted) | Une méthode de l'application console a été appelée avant le chargement des commandes. |
| [`E_CONSOLE_NO_APP`](/fr/reference/errors#e-console-no-app) | Une commande a besoin de l'application et le kernel n'en a pas. Passez par le kernel console de l'Ignitor. |
| [`E_CONSOLE_APP_NOT_STARTED`](/fr/reference/errors#e-console-app-not-started) | Une commande a utilisé l'application sans déclarer `startApp: true` dans ses options. |
| [`E_CONSOLE_ASSERTION_FAILED`](/fr/reference/errors#e-console-assertion-failed) | Une assertion sur une commande lancée dans un test a échoué (`assertSucceeded()`, `assertLog()`, `assertTableRows()`…). |

### Planificateur

| Code | Levée quand |
|---|---|
| [`E_SCHEDULE_INVALID_CRON`](/fr/reference/errors#e-schedule-invalid-cron) | L'expression cron d'une tâche planifiée n'a pas pu être enregistrée. |
| [`E_SCHEDULE_INVALID_TARGET`](/fr/reference/errors#e-schedule-invalid-target) | `@Schedule` a été posé sur une méthode statique. |
| [`E_SCHEDULE_SYMBOL_METHOD`](/fr/reference/errors#e-schedule-symbol-method) | `@Schedule` a été posé sur une méthode à clé symbole. |
| [`E_SCHEDULE_ANONYMOUS_CLASS`](/fr/reference/errors#e-schedule-anonymous-class) | Une classe anonyme déclare `@Schedule` ; ses noms de tâches entreraient en collision. |
| [`E_SCHEDULE_METHOD_NOT_FOUND`](/fr/reference/errors#e-schedule-method-not-found) | Une méthode planifiée n'est pas appelable sur l'instance résolue par le conteneur. |
| [`E_SCHEDULE_INVALID_CALLBACK`](/fr/reference/errors#e-schedule-invalid-callback) | `Scheduler.register()` a reçu autre chose qu'une fonction. |
| [`E_SCHEDULE_INVALID_TASK_NAME`](/fr/reference/errors#e-schedule-invalid-task-name) | `Scheduler.register()` a reçu un nom de tâche vide. |
| [`E_SCHEDULE_INVALID_LOCK_BACKEND`](/fr/reference/errors#e-schedule-invalid-lock-backend) | `lockBackend` n'implémente pas `acquire(name, ttlMs)` et `release(name)`. |
| [`E_SCHEDULE_INVALID_LOCK_TTL`](/fr/reference/errors#e-schedule-invalid-lock-ttl) | `defaultLockTtlMs` n'est pas un nombre fini et positif. |
| [`E_SCHEDULE_INVALID_EVENT_SINK`](/fr/reference/errors#e-schedule-invalid-event-sink) | `eventSink` n'implémente pas `emit(event)`. |
| [`E_SCHEDULE_INVALID_ERROR_REPORTER`](/fr/reference/errors#e-schedule-invalid-error-reporter) | `errorReporter` n'est pas une fonction. |
| [`E_SCHEDULE_TASK_UNKNOWN`](/fr/reference/errors#e-schedule-task-unknown) | `runTaskNow()` a nommé une tâche non enregistrée. |
| [`E_SCHEDULE_TASK_TIMEOUT`](/fr/reference/errors#e-schedule-task-timeout) | Une tâche n'a pas fini dans son `timeoutMs` ; elle continue en arrière-plan. |
| [`E_SCHEDULE_PROVIDER_ALREADY_REGISTERED`](/fr/reference/errors#e-schedule-provider-already-registered) | Le provider du scheduler a été enregistré deux fois sur le même conteneur. |
| [`E_SCHEDULER_NATIVE_ERROR`](/fr/reference/errors#e-scheduler-native-error) | Un appel au scheduler natif a échoué. |
| [`E_SCHEDULER_INVALID_CRON`](/fr/reference/errors#e-scheduler-invalid-cron) | Le scheduler natif a refusé une expression cron. |
| [`E_SCHEDULER_CRON_NO_FIRE`](/fr/reference/errors#e-scheduler-cron-no-fire) | Le scheduler natif a refusé une expression cron qui ne se déclenche jamais. |
| [`E_SCHEDULER_DUPLICATE_TASK`](/fr/reference/errors#e-scheduler-duplicate-task) | Le scheduler natif a déjà une tâche de ce nom. |
| [`E_SCHEDULE_QUASAR_MISSING`](/fr/reference/errors#e-schedule-quasar-missing) | Le verrou du planificateur nomme une connexion quasar et `@c9up/quasar` n'est pas installé. |
| [`E_SCHEDULE_INCOMPLETE_CONNECTION`](/fr/reference/errors#e-schedule-incomplete-connection) | La connexion quasar n'a pas les commandes qu'envoie un verrou du planificateur. |

### Événements

| Code | Levée quand |
|---|---|
| [`E_EVENTS_UNSUPPORTED_STORE`](/fr/reference/errors#e-events-unsupported-store) | `config/events.ts` nomme un `store` autre que `'memory'`, le seul de ce build. |
| [`E_EVENTS_UNSUPPORTED_OPTION`](/fr/reference/errors#e-events-unsupported-option) | `config/events.ts` contient une option que rien ne lit (`retries` compris), ou n'est pas un objet. |
| [`E_EVENTS_MISSING_LISTENER_METHOD`](/fr/reference/errors#e-events-missing-listener-method) | Une classe listener n'a pas de méthode du nom sous lequel le listener a été enregistré. |
| [`E_EVENTS_INVALID_ARGUMENT`](/fr/reference/errors#e-events-invalid-argument) | `onAny()` sans listener, ou `waitForChain()` sans noms d'événements. |
| [`E_EVENTS_ASSERTION_FAILED`](/fr/reference/errors#e-events-assertion-failed) | Une assertion sur les événements a échoué (`assertEmitted()`, `assertNotEmitted()`, sur les helpers ou le `FakeBus`). |
| [`E_EVENTS_TIMEOUT`](/fr/reference/errors#e-events-timeout) | Un événement, une chaîne d'événements ou la réponse à une requête factice attendus ne sont pas arrivés dans leur délai. |
| [`E_EVENTS_DUPLICATE_REQUEST_HANDLER`](/fr/reference/errors#e-events-duplicate-request-handler) | `FakeBus.onRequest()` a reçu un second handler pour le même nom. |
| [`E_EVENTS_NO_REQUEST_HANDLER`](/fr/reference/errors#e-events-no-request-handler) | `FakeBus.request()` a nommé une requête à laquelle aucun handler ne répond. |

### RPC et GraphQL

| Code | Levée quand |
|---|---|
| [`E_RPC_INVALID_METHOD_NAME`](/fr/reference/errors#e-rpc-invalid-method-name) | Un nom de méthode RPC est vide ou n'est pas une chaîne. |
| [`E_RPC_RESERVED_METHOD_NAME`](/fr/reference/errors#e-rpc-reserved-method-name) | Une méthode RPC prend un nom réservé (`rpc.*`). |
| [`E_RPC_UNKNOWN_CONTROLLER_METHOD`](/fr/reference/errors#e-rpc-unknown-controller-method) | Une route RPC nomme une méthode de contrôleur qui n'existe pas. |
| [`E_RPC_PROVIDER_ALREADY_REGISTERED`](/fr/reference/errors#e-rpc-provider-already-registered) | Le provider RPC a été enregistré deux fois sur le même conteneur. |
| [`E_GRAPHQL_PROVIDER_ALREADY_REGISTERED`](/fr/reference/errors#e-graphql-provider-already-registered) | Le provider GraphQL a été enregistré deux fois sur le même conteneur. |
| [`E_GRAPHQL_SCHEMA_NOT_FOUND`](/fr/reference/errors#e-graphql-schema-not-found) | Le `schemaPath` GraphQL désigne un fichier qui n'existe pas. |

### Client HTTP

| Code | Levée quand |
|---|---|
| [`E_HTTP_CLIENT_INVALID_URL`](/fr/reference/errors#e-http-client-invalid-url) | L'URL ne peut pas être analysée, n'est ni http ni https, ou porte des identifiants (envoyez-les dans un header). |
| [`E_HTTP_CLIENT_PRIVATE_ADDRESS`](/fr/reference/errors#e-http-client-private-address) | L'hôte est, ou se résout en, une adresse qui n'est pas publique. |
| [`E_HTTP_CLIENT_UNREACHABLE`](/fr/reference/errors#e-http-client-unreachable) | L'hôte n'a pas pu être joint. |
| [`E_HTTP_CLIENT_TIMED_OUT`](/fr/reference/errors#e-http-client-timed-out) | La requête n'a pas abouti dans son délai. |
| [`E_HTTP_CLIENT_TOO_LARGE`](/fr/reference/errors#e-http-client-too-large) | Le corps de la réponse dépasse la limite de taille. |
| [`E_HTTP_CLIENT_REDIRECT_REFUSED`](/fr/reference/errors#e-http-client-redirect-refused) | Une redirection a été refusée : trop nombreuses, de https vers http, ou vers un autre hôte. |

Chacune est une classe d'`errors`, une `Exception` de flare : lisez `error.code`, ou testez `error instanceof errors.E_ROUTE_NOT_FOUND`. Une erreur qui sait comment la corriger porte ce conseil dans `help`.

## Migration

- `ReamError`, `isReamError` et les erreurs de module (`AtlasError`, `ContainerError`, `EventsError`, `ForgeError`, `PipelineError`, `RouterError`, `RuneError`, `WardenError`) disparaissent. Remplacez `isReamError(error, 'E_X')` et `instanceof ReamError` par `error instanceof errors.E_X` ou un test sur `error.code`. Le conseil qui était dans `hint` est dans `help` ; les données qui étaient dans `context` sont sur des champs nommés (`E_CIRCULAR_DEPENDENCY.chain`, `E_RESPONSE_TOO_LARGE.bytes` et `ceiling`, `E_SCHEDULE_INVALID_CRON.task` et `cronExpr`…). `error.docsUrl` devient `errorDocsUrl(error.code)`.
- Les classes d'erreur ne sont plus exportées une à une par `@c9up/ream` : `import { E_ROUTE_NOT_FOUND } from '@c9up/ream'` devient `import { errors } from '@c9up/ream'` puis `errors.E_ROUTE_NOT_FOUND`. `@c9up/ream/exceptions` exporte toujours les exceptions HTTP par leur nom.
- Classes renommées : `ShutdownError` devient `errors.E_APP_SHUTDOWN_FAILED` (une `Exception` avec `errors`, plus une `AggregateError`) ; `EnvValidationException` et `EnvVarError` deviennent `errors.E_INVALID_ENV_VARIABLES` (`failures` liste chaque variable) ; `HttpClientError` devient une classe par code, `errors.E_HTTP_CLIENT_*`, et `reason` disparaît : lisez `error.code` ; `WebSocketRefused` devient `errors.E_TEST_CLIENT_WEBSOCKET_REFUSED` ; `ExpectationError` devient `errors.E_TEST_CLIENT_ASSERTION_FAILED` ; `StubSyntaxError`, `StubTypeError` et `StubReferenceError` deviennent `errors.E_REAM_STUB_SYNTAX`, `E_REAM_STUB_FORBIDDEN_KEY` et `E_REAM_STUB_EVALUATION`, et n'étendent plus `TypeError` ni `ReferenceError`.
- `Exception`, `createError`, `RuntimeException` et `InvalidArgumentsException` sont ceux de `@c9up/flare`. Une classe de `createError` reçoit les valeurs de ses marqueurs en tableau : `new E_X('a', 'b')` devient `new E_X(['a', 'b'])`. `InvalidArgumentsException` a pour code `E_INVALID_ARGUMENTS_EXCEPTION` (au lieu de `E_INVALID_ARGUMENTS`) et n'étend plus `RuntimeException`.
- Hors mode debug, le gestionnaire d'exceptions n'affiche le message d'une erreur 5xx que si elle est marquée `expose: true` ; être une `Exception` ne suffit plus.
- Les gardes de route lèvent les codes que lève `@c9up/warden` : `E_UNAUTHORIZED` devient `E_UNAUTHORIZED_ACCESS` (401, `Unauthorized access`) et `E_FORBIDDEN` devient `E_AUTHORIZATION_FAILURE` (403, `Access denied`, sans la liste `required`). Les deux se rendent elles-mêmes (`handle`), exactement comme les erreurs de warden du même code : un refus répond les mêmes octets, qu'un garde de route ou warden l'ait levé. `401 { "error": { "code", "message" } }` pour `E_UNAUTHORIZED_ACCESS` ; pour `E_AUTHORIZATION_FAILURE`, `{ "errors": [{ "message" }] }` en JSON, un objet d'erreur JSON:API, le message en texte pour du HTML, et une soumission de formulaire refusée avec une session redirigée vers la page précédente avec le message en flash. Les deux portent un `identifier` (`errors.<CODE>`) sous lequel `ctx.i18n` traduit le message. `E_ROW_NOT_FOUND` est retiré d'`errors` : rien dans ream ne le levait ; `@c9up/atlas` lève le sien.
- `E_UNKNOWN_ROUTE` devient `E_CANNOT_LOOKUP_ROUTE` (500, `Cannot lookup route "<nom>"`). Le client de test liste les noms du manifeste dans `help` ; `urlFor()` ne liste plus les noms enregistrés.
- `E_ROUTE_NOT_FOUND` est une classe de `createError` : `new errors.E_ROUTE_NOT_FOUND([method, url])`, message `Cannot GET:/chemin`.
- `E_HTTP_EXCEPTION` porte `body` et se construit avec `E_HTTP_EXCEPTION.invoke(body, status, code?)`. `E_HTTP_REQUEST_ABORTED` l'étend, et l'erreur que lève `response.abort()` a pour code `E_HTTP_EXCEPTION` : testez `error instanceof errors.E_HTTP_REQUEST_ABORTED` plutôt que son code.
- `E_MISSING_APP_KEY` devient `E_MISSING_ENCRYPTER_KEY` et `E_INSECURE_APP_KEY` devient `E_INSECURE_ENCRYPTER_KEY`. Leur message est fixe ; ce qui avait besoin de la clé est dans `help`.
- `E_BAD_MULTIPART` devient `E_INVALID_MULTIPART_REQUEST`.
- Le gestionnaire d'exceptions s'exécute là où une erreur est levée, dans la chaîne de middlewares : le `next()` des middlewares extérieurs rend la main normalement, et leur code après `await next()` s'exécute (la session est enregistrée, un message en flash survit). Un `try { await next() } catch` autour d'une couche intérieure ne voit plus ses erreurs.
- `E_INVALID_ENV_VARIABLES` a pour message `Validation failed for one or more environment variables` ; les échecs sont dans `help`, une ligne `- ` chacun. `E_IDENTIFIER_ALREADY_DEFINED` est une classe de `createError` (`new E_IDENTIFIER_ALREADY_DEFINED([name])`) de statut 500, sans champ `identifier`.
- Un corps JSON, formulaire ou texte compressé (`Content-Encoding` autre que `identity`) est refusé avec `E_ENCODING_UNSUPPORTED` (415) au lieu d'être lu comme du texte.
- Les codes du scheduler natif portent l'espace de noms : `INVALID_CRON` devient `E_SCHEDULER_INVALID_CRON`, `CRON_NO_FIRE` devient `E_SCHEDULER_CRON_NO_FIRE`, `DUPLICATE_TASK` devient `E_SCHEDULER_DUPLICATE_TASK` ; les codes `<PREFIX>_NAPI_NOT_FOUND`, `<PREFIX>_NAPI_LOAD_FAILED` et `<PREFIX>_UNSUPPORTED_PLATFORM` du chargeur natif deviennent `E_REAM_NAPI_NOT_FOUND`, `E_REAM_NAPI_LOAD_FAILED` et `E_REAM_NAPI_UNSUPPORTED_PLATFORM`.

## Voir aussi

- [Application](/fr/guides/concepts/application)
- [Cycle de vie de l’application](/fr/guides/concepts/lifecycle)
- [Injection de dépendances](/fr/guides/concepts/dependency-injection)
- [Providers](/fr/guides/concepts/providers)
- [L’API Codemods](/fr/guides/concepts/codemods)
- [Routage](/fr/guides/basics/routing)
- [Contexte HTTP](/fr/guides/basics/http-context)
- [Requête](/fr/guides/basics/request)
- [Réponse](/fr/guides/basics/response)
- [Middlewares](/fr/guides/basics/middleware)
- [Parseur de corps](/fr/guides/basics/body-parser)
- [Envoi de fichiers](/fr/guides/basics/file-uploads)
- [Gestion des exceptions](/fr/guides/basics/exception-handling)
- [Fichiers statiques](/fr/guides/basics/static-files)
- [Construction d’URL et URL signées](/fr/guides/basics/url-builder)
- [Chiffrement](/fr/guides/security/encryption)
- [WebSockets](/fr/guides/realtime/websockets)
- [JSON-RPC](/fr/guides/apis/json-rpc)
- [GraphQL](/fr/guides/apis/graphql)
- [OpenAPI](/fr/guides/apis/openapi)
- [Ressources d’API](/fr/guides/apis/resources)
- [Émetteur](/fr/guides/digging-deeper/emitter)
- [Planification](/fr/guides/digging-deeper/scheduling)
- [Health checks](/fr/guides/digging-deeper/health-checks)
- [Client HTTP](/fr/guides/digging-deeper/http-client)
- [Protobuf et gRPC](/fr/guides/digging-deeper/grpc)
- [Créer des commandes](/fr/guides/command-line/creating-commands)
- [Tests HTTP](/fr/guides/testing/http-tests)
- [ream-cli](/fr/reference/ream-cli)
- [lumen](/fr/reference/lumen)
- [Index des erreurs](/fr/reference/errors)
