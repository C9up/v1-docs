# ream

`@c9up/ream`: the framework core: the application and its lifecycle, the container, the environment, the HTTP server with its router, request, response, sessions and body parser, events, the scheduler, the console, and the test client. Guide: [Application](/en/guides/concepts/application).

## Installation

```bash
pnpm add @c9up/ream
```

`ream new` creates a project with it. Optional peer dependencies: `@c9up/inker` (template rendering and the session template tags), `@c9up/quasar` (the redis session store and the redis scheduler lock), `@c9up/comet` (the JSON-RPC router).

## Entry points

| Import | Contents |
|---|---|
| `@c9up/ream` | The application, container, env, HTTP layer, router, sessions, events, scheduler, console, errors, and most of what the subpaths below export. |
| `@c9up/ream/types` | `ContainerBindings`, `ContainerBinding`, `Authenticators`, `AuthenticatorName`: the interfaces packages augment. |
| `@c9up/ream/exceptions` | `Exception`, `createError`, the HTTP exceptions and `ExceptionHandler`. |
| `@c9up/ream/env` | `loadEnvFiles`, `envFileNames`. |
| `@c9up/ream/bootstrap` | `createHyperServerFactory`: the native HTTP server factory. |
| `@c9up/ream/hot` | Side-effect module loaded by `ream dev`: swaps changed modules in the running process. |
| `@c9up/ream/dev/hmr` | The browser reload endpoint and script used in development. |
| `@c9up/ream/services/app` | The application instance (default export) and its setters. |
| `@c9up/ream/services/config` | The config store (default export). |
| `@c9up/ream/services/router` | The router (default export) and its setters. |
| `@c9up/ream/services/server` | The server (default export) and its setters. |
| `@c9up/ream/services/logger` | The app logger (default export) and its setters. |
| `@c9up/ream/services/encryption` | The `APP_KEY` signer (default export) and its setters. |
| `@c9up/ream/services/urlBuilder` | `urlFor`, `signedUrlFor`. |
| `@c9up/ream/services/console` | The console application (default export) and its setters. |
| `@c9up/ream/services/dumper` | The dumper (default export) and `dd`. |
| `@c9up/ream/services/repl` | The REPL (default export). |
| `@c9up/ream/dumper` | `Dumper` and its config types. |
| `@c9up/ream/repl` | `Repl` and its types. |
| `@c9up/ream/bodyparser`, `@c9up/ream/bodyparser_middleware` | The body parser middleware (default export) and `BodyParserConfig`. |
| `@c9up/ream/bodyparser/config` | `defineConfig` for `config/bodyparser.ts`. |
| `@c9up/ream/session`, `@c9up/ream/session_middleware` | The session middleware (default export). |
| `@c9up/ream/session/config` | `defineConfig` for `config/session.ts`. |
| `@c9up/ream/events` | The event emitter, `BaseEvent`, `EventsBuffer`, `EventsProvider`, `defineConfig`. |
| `@c9up/ream/events/provider` | `EventsProvider` (default export). |
| `@c9up/ream/events/config` | `defineConfig`, `checkEventsConfig` for `config/events.ts`. |
| `@c9up/ream/events/services/main` | The emitter (default export), `getEmitter`, `setEmitter`. |
| `@c9up/ream/events/configure` | The configure hook that registers the events provider and writes `config/events.ts`. |
| `@c9up/ream/events/testing` | `FakeBus`: an in-memory event bus for tests. |
| `@c9up/ream/events/helix` | Event assertions for tests: `collect`, `fake`, `assertEmitted`, `waitForEvent`, … |
| `@c9up/ream/scheduler/provider` | `ScheduleProvider` (default export). |
| `@c9up/ream/scheduler/config` | `defineConfig` for `config/scheduler.ts` and `locks`. |
| `@c9up/ream/rpc/provider` | `RpcProvider` (default export). |
| `@c9up/ream/rpc/router` | `RpcRouter`: JSON-RPC methods. |
| `@c9up/ream/graphql/provider` | `GraphQLProvider` (default export). |
| `@c9up/ream/openapi/provider` | `OpenApiProvider` (default export). |
| `@c9up/ream/storage/provider` | `StaticProvider` (default export): static files. |
| `@c9up/ream/health` | Health checks: `HealthChecks`, `BaseCheck`, `Result` and the built-in checks. |
| `@c9up/ream/http-client` | `HttpClient` for outbound requests, and `fakeHttp` for tests. |
| `@c9up/ream/console` | The console kernel, `BaseCommand`, decorators, prompts, loaders. |
| `@c9up/ream/commands` | The command loader of the commands ream ships (`migrate`, `schedule:*`). |
| `@c9up/ream/stubs` | The stub template engine and `stubsRoot`. |
| `@c9up/ream/helpers` | String, type-check, fs, base64, timing and type helpers. |
| `@c9up/ream/helpers/string`, `/helpers/is`, `/helpers/base64`, `/helpers/types`, `/helpers/fs` | Each helper group on its own. |
| `@c9up/ream/testing` | `TestClient`, `createTestClient`, `ApiResponse`, `TestWebSocket`. |
| `@c9up/ream/testing/utils` | `createTestUtils`: boots the app for a test suite. |
| `@c9up/ream/tsconfig.app.json`, `/tsconfig.package.json`, `/tsconfig.client.json`, `/swcrc.app.json` | Base compiler configs to extend. |

## Commands

Commands an app gets from ream, run through `ream <name>`:

| Command | Description |
|---|---|
| `list` | Lists the commands (the default command). |
| `help` | Shows a command's help. |
| `make:controller`, `make:service`, `make:entity`, `make:validator`, `make:module` | Generate a class under `app/<module>/`; `make:module` writes entity, controller and validator. |
| `make:provider`, `make:command`, `make:middleware`, `make:event`, `make:listener` | Generate a provider, a command, a middleware, an event or a listener. |
| `eject` | Copies a `make:` stub into `stubs/` to edit it. |
| `migrate` | Runs pending migrations for every registered migration source. |
| `migrate:rollback` | Rolls back the last batch for every source. |
| `migrate:status` | Shows applied and pending migrations for every source. |
| `schedule:list` | Lists every scheduled task, its next run and its stats. |
| `schedule:run` | Runs a scheduled task once, now, bypassing its lock. |

Every `make:` command takes `--force` (`-f`), `--dry-run` and `--json`. The Ignitor registers the `migrate` and `schedule:*` commands of the `@c9up/ream/commands` loader by itself; an application command of the same name replaces one.

## Exports

### `@c9up/ream`

#### Application and configuration

| Export | Kind | Description |
|---|---|---|
| `Ignitor` | class | Boots and wires the framework: rc file, providers, HTTP server, console. |
| `ConsoleKernel` | class | Boots the app in console mode and dispatches a command. |
| `defineConfig` | function | `defineConfig(config: ReamrcConfig): ReamrcConfig`: types `reamrc.ts`. |
| `ReamrcConfig`, `IgnitorConfig`, `TestsConfig`, `TestSuiteConfig`, `MobileConfig`, `HyperServerLike` | interface | The rc file, the Ignitor options, the `tests` and `mobile` blocks, the native server shape. |
| `Application` | class | The application: container, config, paths, environment, lifecycle hooks. |
| `ApplicationOptions`, `ApplicationHook`, `ApplicationImporter`, `ApplicationMode`, `ApplicationState`, `AppEnvironment` | type | Its options and states. `AppEnvironment` is `'web' \| 'console' \| 'test' \| 'repl' \| 'unknown'`; `ApplicationMode` is `'run' \| 'warmup'`. |
| `directories`, `DirectoriesNode` | const / interface | The conventional directory layout. |
| `Provider` | class | Base provider with `register`, `boot`, `start`, `ready`, `shutdown`. |
| `ProviderContract`, `AppContext`, `ConfigReader` | interface | The provider contract and what a provider receives. |
| `ConfigStore` | class | The config built from `config/*.ts`: `get`, `set`, `has`, `all`, `defaults`. |
| `configProvider` | const | `configProvider.create(resolver)`: a config value resolved from the application. |
| `defineModuleConfig` | function | `defineModuleConfig<T>(config: T): T`: types a module's config. |
| `env` | function | `env(key: string)`: reads an environment variable in a config file. |
| `Env` | class | Loads `.env*` files and validates `process.env` against a schema. |
| `SchemaNode`, `RequiredNode`, `SchemaFnOptions`, `StringOptions`, `OptionalCondition` | type | `Env.schema` node types. |
| `Secret` | class | A value that prints as `[redacted]`; `.release()` reads it. |
| `loadEnvFiles` | function | `loadEnvFiles(appRoot: URL, options?: { skipEnvLocal?: boolean }): Promise<void>`. |
| `MigrationRegistry` | class | Where data packages register their migration runners. |
| `MigrationRunnerContract`, `MigrationState`, `MigrationStatusNode`, `RegisteredMigrationSource` | type | Its contracts. |
| `installGracefulShutdown` | function | `installGracefulShutdown(options: ShutdownOptions): ShutdownHandle`: drains on SIGTERM / SIGINT. |
| `ShutdownOptions`, `ShutdownHandle` | interface | |
| `startHotReload`, `HotReloadOptions` | function / interface | Watches TypeScript files and re-registers handlers on change. |
| `VERSION` | const | The package version. |

#### Container

| Export | Kind | Description |
|---|---|---|
| `Container` | class | The IoC container. Resolution is async. |
| `ContainerResolver` | class | A per-request resolver with its own scoped values. |
| `ContextualBindingsBuilder`, `ConditionalBindingsBuilder` | class | Returned by `container.when()` and `container.if()`. |
| `Binding`, `BindingCondition`, `ContainerEmitter`, `ContainerOptions`, `ServiceFactory`, `ServiceScope`, `ServiceToken` | type | Container types. `ServiceToken` is a class, a string or a symbol. |
| `ContainerBindings`, `ContainerBinding` | interface / type | The known string tokens; packages augment it. |
| `Authenticators`, `AuthenticatorName` | interface / type | The guard names; the auth package augments it. |
| `Service` | function | `Service(options?: { scope?: ServiceScope })`: class decorator that registers a service. |
| `inject` | function | `inject(): ClassDecorator & MethodDecorator`: records constructor or method dependencies. |
| `Inject` | function | `Inject(token: ServiceToken): ParameterDecorator`: injects a token into one parameter. |
| `getServiceMetadata`, `getServiceRegistry`, `clearServiceRegistry` | function | Read or reset what `@Service` recorded. |

#### HTTP

| Export | Kind | Description |
|---|---|---|
| `HttpContext` | class | The request context: `request`, `response`, `params`, `session`, `auth`, `logger`, … |
| `Request` | class | The incoming request. |
| `Response` | class | The response builder. |
| `RedirectBuilder` | class | Returned by `response.redirect()`: `toPath`, `toRoute`, `back`, `toIntended`, `withQs`, `status`. |
| `RequestValidator` | class | Validates a request with a validator object. |
| `RequestAwareValidator`, `RequestValidationOptions`, `ValidatableContext`, `ValidationHookContext` | type | Its contracts. |
| `RawRequest`, `RouteInfo`, `AuthState`, `Authorizer` | interface | Parts of the context. |
| `SseStream`, `SseStreamOptions` | class / interface | The stream `response.sse()` opens. |
| `ServerWebSocket` | class | The server side of one WebSocket connection. |
| `WebSocketHub` | class | The sockets of one server. |
| `WebSocketContext` | type | `HttpContext & { socket: ServerWebSocket }`. |
| `isWebSocketContext` | function | `isWebSocketContext(ctx: HttpContext): ctx is WebSocketContext`. |
| `WebSocketBackend`, `WebSocketClose`, `WebSocketEvent`, `WebSocketMessage`, `WebSocketState` | type | WebSocket types. |
| `Server` | class | The HTTP server: global middleware, error handler, trusted proxies, gRPC. |
| `createHttpKernel`, `HttpKernelConfig` | function / interface | Builds the request handler on its own (serverless, tests). |
| `GrpcCall`, `GrpcHandler`, `GrpcReply`, `GrpcLimits`, `NativeGrpcCall`, `NativeGrpcHandler` | type | gRPC on the HTTP port. |
| `ErrorHandlerClass`, `LazyImport`, `MiddlewareClass`, `MiddlewareEntry`, `MiddlewareFunction` | type | Middleware and error handler shapes. |
| `resolveMiddlewareEntry` | function | `resolveMiddlewareEntry(entry: MiddlewareEntry): MiddlewareFunction`. |
| `composeMiddleware` | function | `composeMiddleware(middleware: MiddlewareFunction[]): MiddlewareFunction`. |
| `MiddlewareRegistry` | class | Named middleware. |
| `Macroable`, `MacroFn`, `GetterFn` | class / type | `macro()` and `getter()`, on `HttpContext`, `Request`, `Response`, `Router` and the route builders. |
| `BodyParserMiddleware`, `BodyParserConfig` | class / interface | Parses JSON, form, raw and multipart bodies. |
| `MultipartFile`, `FileValidationOptions`, `MimeType` | class / type | An uploaded file: `validate()`, `errors`, `move()`, `stream()`. |
| `StaticMiddleware`, `StaticConfig`, `DotFilesPolicy`, `defineStaticConfig` | class / type / function | Serves files from `public/`. |
| `StaticProvider`, `StaticProviderOptions` | class / interface | Registers the static middleware. |
| `ApiResource`, `PaginationMeta` | class / interface | Transforms entities into API responses. |

#### Router

| Export | Kind | Description |
|---|---|---|
| `Router` | class | Routes, groups, resources, named routes, URL building. |
| `RouteBuilder` | class | One route, returned by `router.get()` and the other verbs. |
| `GroupBuilder` | class | A group, returned by `router.group()`. |
| `RouteResource` | class | Resourceful routes, returned by `router.resource()`. |
| `OnRouteBuilder` | class | `router.on(path).render(view)` / `.redirect(name)`. |
| `UrlBuilder` | class | Builds a URL for a named route, piece by piece. |
| `matchers` | const | `matchers.number()`, `.uuid()`, `.slug()`: parameter matchers. |
| `RouteDefinition`, `RouteHandler`, `RouteHandlerFunction`, `ControllerAction`, `MatchResult`, `ParamMatcher`, `SignedUrlOptions`, `WebSocketRouteHandler`, `WebSocketRouteHandlerFunction` | type | Route types. |
| `InferRouteParams` | type | The params object a pattern such as `/users/:id` declares. |

#### Sessions

| Export | Kind | Description |
|---|---|---|
| `Session` | class | The request session: values, flash messages, regeneration, tagging. |
| `SessionMiddleware` | class | Loads and commits the session. |
| `SessionCookieDriver`, `SessionFileDriver`, `SessionMemoryDriver`, `SessionRedisDriver`, `SessionDatabaseDriver` | class | The stores. |
| `SessionConfig`, `SessionDriver`, `SessionDriverWithTagging`, `TaggedSession`, `SessionDatabaseDriverOptions`, `SessionDbConnection`, `SessionFileDriverOptions`, `RedisSessionOptions`, `SessionRedisClient`, `SessionRedisClientSource` | type | Config and store contracts. |
| `sessionStoreSupportsTagging` | function | `(driver: SessionDriver): driver is SessionDriverWithTagging`. |
| `ReadOnlyValuesStore`, `ValuePath` | class / type | The flash messages store. |

#### Errors

| Export | Kind | Description |
|---|---|---|
| `Exception` | class | Base exception (`@c9up/flare`'s, the one every package extends) with `status`, `code`, `help`, and optional `handle()` / `report()`. |
| `createError` | function | `createError<T extends unknown[]>(message: string, code: string, status?: number): ErrorClass<T>`; the class takes the `%s` values as an array: `new E_X([value])`. |
| `ErrorClass`, `ExceptionClass`, `HttpError`, `StatusPageRenderer` | type | |
| `ExceptionHandler` | class | Renders and reports errors; extend it in the app. |
| `RuntimeException`, `InvalidArgumentsException` | error | `E_RUNTIME_EXCEPTION`, `E_INVALID_ARGUMENTS_EXCEPTION`. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors): `error instanceof errors.E_ROUTE_NOT_FOUND`. |
| `createPipelineError`, `validatePipelineConfig`, `PIPELINE_STAGES`, `PipelineStageName` | function / const / type | Pipeline stage errors. |
| `errorDocsUrl`, `DOCS_BASE_URL` | function / const | `errorDocsUrl(code)`: the code's row in the error index. |
| `ErrorBoundary`, `ErrorEvent`, `ErrorEmitter`, `ErrorSeverity` | class / type | The root error boundary. |
| `renderError`, `parseStack`, `prettyPrintError`, `RenderOptions`, `StackFrame` | function / type | Error rendering for the terminal. |
| `didYouMean`, `findClosestMatches`, `levenshtein` | function | Suggestions for a mistyped name. |

#### Security

| Export | Kind | Description |
|---|---|---|
| `CookieSigner` | class | Signs (`sign` / `unsign`) and encrypts (`encrypt` / `decrypt`, AES-256-GCM) values with `APP_KEY` (the `encryption` binding). |
| `SignedUrl`, `SignedUrlConfig` | class / interface | Signed URLs (the `signedUrl` binding). |
| `hmacSign`, `hmacVerify`, `constantTimeEq`, `randomBytesBase64`, `randomHex` | function | Crypto primitives, native when available. |
| `hasNativeCrypto`, `setNapi` | function | Whether the native crypto is loaded; replace it. |

#### Events

| Export | Kind | Description |
|---|---|---|
| `Emitter` | class | The event emitter (the `emitter` binding). |
| `BaseEvent` | class | Base of class-based events: `static dispatch(...args)`, `emit()`. |
| `EventsBuffer`, `BufferedEvent`, `BufferedEventName`, `EventFinder` | class / type | What `emitter.fake()` returns, with its assertions. |
| `ListenerClass`, `EmitterResolver`, `UnsubscribeFunction`, `AsyncUnsubscribeFunction` | type | |
| `defineEventsConfig`, `EventsConfig` | function / interface | `config/events.ts`. |

#### Scheduler

| Export | Kind | Description |
|---|---|---|
| `Scheduler` | class | Cron scheduler on a native ticker: `register`, `unregister`, `start`, `stop`, `listTasks`, `nextRun`, `runTaskNow`, `getStats`. |
| `Schedule` | function | `Schedule(cronExpr: string): MethodDecorator`: runs a method on a cron schedule. |
| `getScheduleMetadata`, `SCHEDULE_METADATA_KEY`, `ScheduleMetadata` | function / const / type | What `@Schedule` recorded. |
| `ScheduleProvider`, `ScheduleProviderOptions` | class / interface | Registers the scheduler. |
| `defineSchedulerConfig`, `SchedulerConfig`, `SchedulerOptions` | function / interface | `config/scheduler.ts` and the `Scheduler` options. |
| `locks`, `MemoryLockBackend`, `RedisLockBackend`, `LockBackend`, `LockBackendFactory`, `LockRedisClient`, `LockRedisResolver` | const / class / type | The lock that keeps one instance of a task running. |
| `StatsTracker`, `TaskInfo`, `TaskStats`, `RunTaskOutcome`, `ScheduleInvocation`, `ErrorReporter` | class / type | Task listing and statistics. |
| `ScheduleEvent`, `ScheduleEventSink`, `ScheduleTaskStartedEvent`, `ScheduleTaskCompletedEvent`, `ScheduleTaskFailedEvent`, `ScheduleTaskSkippedEvent` | type | Task lifecycle events. |

#### APIs

| Export | Kind | Description |
|---|---|---|
| `GraphQLEngine`, `GraphQLConfig`, `ResolverOptions`, `SelectionField` | class / type | A GraphQL engine. |
| `GraphQLProvider`, `GraphQLProviderOptions` | class / interface | Mounts it. |
| `OpenApiGenerator`, `OpenApiConfig` | class / interface | Builds an OpenAPI document from the routes. |
| `OpenApiMiddleware`, `OpenApiMiddlewareConfig` | class / interface | Serves it. |
| `OpenApiProvider`, `OpenApiProviderOptions`, `OpenApiDocsConfig` | class / interface | Registers both. |
| `HealthCheck`, `HealthChecker`, `HealthCheckResult`, `HealthStatus` | class / type | A `/health` endpoint for liveness and readiness probes. |

#### Console

| Export | Kind | Description |
|---|---|---|
| `BaseCommand` | class | Base of a command. |
| `args`, `flags` | const | Decorators: `@args.string()`, `@flags.boolean()`, … |
| `Kernel` | class | The console kernel. |
| `HelpCommand`, `ListCommand` | class | The built-in commands. |
| `IndexGenerator` | class | Writes the commands manifest. |
| `FsLoader`, `ListLoader` | class | Command loaders. |
| `Parser` | class | The argv parser. |
| `Prompt`, `PromptTrap` | class | Prompts, and scripted answers for tests. |
| `ConsoleExceptionHandler` | class | Renders a command's error. |
| `Logger`, `Ui` | class | Terminal output, from `@c9up/lumen`. |
| `ArgumentMetaData`, `FlagMetaData`, `CommandClass`, `CommandInstance`, `CommandOptions` | interface | Command metadata. |

#### Codemods and stubs

| Export | Kind | Description |
|---|---|---|
| `createCodemods` | function | The API a package's `configure()` hook uses to edit the project. |
| `Codemods`, `EnvValidationNode`, `EnvVarsOptions`, `GeneratedStub`, `MiddlewarePosition`, `PreloadEnvironment` | type | Its types. |
| `compileStub`, `renderStub`, `escapeHtml` | function | The stub template engine. |
| `StubState`, `StubValue`, `StubFunction`, `StubBlock`, `TemplateOptions` | type | Its types. |

#### Services and types

| Export | Kind | Description |
|---|---|---|
| `setApp`, `setRouter`, `setServer` | function | Seat the instances behind the `services/*` modules. |
| `AsyncOrSync`, `Constructor`, `Dict`, `ExtractFunctions`, `OneOrMore`, `Opaque`, `Prettify`, `UnwrapOpaque` | type | Type helpers. |

### `Ignitor`

```ts
new Ignitor(appRoot?: URL | IgnitorConfig, config?: IgnitorConfig)
```

| Member | Signature | Description |
|---|---|---|
| `useRcFile` | `useRcFile(reamrc: ReamrcConfig): Ignitor` | Loads `reamrc.ts`. |
| `tap` | `tap(callback: (app: Application) => void): Ignitor` | Reaches the application before start. |
| `setEnvironment` / `getEnvironment` | `setEnvironment(env: AppEnvironment): Ignitor` | |
| `routes` | `routes(callback: (router: Router) => void): Ignitor` | Declares routes inline. |
| `use` | `use(mw: MiddlewareFunction): Ignitor` | Adds a global middleware inline. |
| `named` | `named(name: string, mw: MiddlewareFunction): Ignitor` | Registers a named middleware inline. |
| `provider` | `provider(factory: (app: Application) => ProviderContract): Ignitor` | Registers a provider inline. |
| `configure` | `configure(key: string, value: unknown): Ignitor` | Sets a config value. |
| `onError` | `onError(listener: (event: ErrorEvent) => void): Ignitor` | Listens for error events. |
| `httpServer` | `httpServer(): Ignitor` | HTTP server mode. |
| `console` | `console(): ConsoleKernel` | Console mode. |
| `testMode` | `testMode(): Ignitor` | Test mode. |
| `warmUp` | `warmUp(): Promise<Ignitor>` | Assembles the application without running it. |
| `start` | `start(): Promise<Ignitor>` | Boots and, in HTTP mode, listens. |
| `stop` | `stop(): Promise<void>` | Graceful shutdown; every step runs even when one throws. |
| `port` / `host` | `port(): Promise<number>` / `host(): string \| undefined` | The bound address. |
| `consoleApp` | `consoleApp(): Promise<Console>` | The programmatic console. |
| `getApp`, `getRouter`, `getServer`, `getRcFile`, `getAppRoot`, `getImporter` | | Accessors. |
| `getKernel` | `getKernel(): (request) => Promise<response>` | The request handler, for serverless use and tests. |
| `isStarted`, `isDevMode`, `getPhase` | | State. |

### `Application`

```ts
new Application(options: ApplicationOptions)
```

| Member | Signature | Description |
|---|---|---|
| `container` | `container: Container` | |
| `config` | `config: ConfigStore` | |
| `appRoot` | `appRoot: URL \| undefined` | The project root. |
| `makePath` / `makeURL` | `makePath(...paths: string[]): string` | A path (or URL) inside the project root. |
| `relativePath` | `relativePath(absolutePath: string): string` | |
| `configPath`, `startPath`, `tmpPath`, `publicPath`, `providersPath`, `commandsPath`, `contractsPath`, `migrationsPath`, `seedersPath`, `factoriesPath`, `languageFilesPath`, `viewsPath`, `httpControllersPath`, `modelsPath`, `servicesPath`, `exceptionsPath`, `mailersPath`, `mailsPath`, `middlewarePath`, `policiesPath`, `validatorsPath`, `eventsPath`, `listenersPath`, `transformersPath`, `generatedClientPath`, `generatedServerPath` | `(...paths: string[]): string` | A path inside each conventional directory. |
| `directories` | `directories: DirectoriesNode` | The layout, `reamrc.ts` overrides included. |
| `rcFile` | `rcFile: ReamrcContents` | The parsed rc file. |
| `getEnvironment` / `setEnvironment` | `getEnvironment(): AppEnvironment` | `web`, `console`, `test`, `repl` or `unknown`. |
| `getMode` / `setMode` | `getMode(): ApplicationMode` | `run` or `warmup`; set only before boot. |
| `getState` | `getState(): ApplicationState` | Where the application is in its lifecycle. |
| `nodeEnvironment` | `nodeEnvironment: string` | The normalised `NODE_ENV`, or `'unknown'`. |
| `inProduction`, `inDev`, `inTest`, `managedByPm2` | `boolean` | |
| `isBooted`, `isReady`, `isTerminating`, `isTerminated` | `boolean` | |
| `appName`, `version` | `string \| undefined` | From the app's `package.json`. |
| `usingInker` | `boolean` | Whether `@c9up/inker` is installed. |
| `booting` / `booted` | `booting(callback: () => void \| Promise<void>): void` | Hooks around provider boot. |
| `starting` / `ready` | `starting(handler: ApplicationHook): Application` | Hooks before the server starts, and once it is ready. |
| `terminating` / `onShutdown` | `terminating(callback: () => void \| Promise<void>): void` | Hooks when shutdown begins. |
| `register` | `register(provider: ProviderContract): void` | Registers a provider instance. |
| `boot` | `boot(): Promise<void>` | Boots every provider. |
| `terminate` / `shutdown` | `terminate(): Promise<void>` | Graceful shutdown; providers shut down in reverse order. |
| `providers`, `providerCount` | | The registered providers. |
| `import` | `import(moduleIdentifier: string): Promise<unknown>` | Imports a module through the app's importer. |
| `importDefault` | `importDefault<T>(moduleIdentifier: string): Promise<T>` | Its default export. |
| `listen`, `listenOnce`, `listenIf`, `listenOnceIf` | `listen(signal: Signals, callback: () => void): void` | Process signals. |
| `notify` | `notify(message: unknown, callback?): void` | Tells the process supervisor a state was reached. |
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

| Member | Signature | Description |
|---|---|---|
| `singleton` | `singleton(token: ServiceToken, factory: ServiceFactory): void` | Built once, then cached. |
| `bind` | `bind(token: ServiceToken, factory: ServiceFactory): void` | Built on every resolution. |
| `bindValue` | `bindValue<T>(token: ServiceToken, value: T): void` | An existing value. |
| `alias` | `alias(alias: ServiceToken, target: ServiceToken): void` | |
| `make` / `resolve` | `make<T>(token: ServiceToken, runtimeValues?: unknown[]): Promise<T>` | Resolves or constructs. |
| `call` | `call(instance, method, runtimeValues?): Promise<unknown>` | Calls a method with its dependencies injected. |
| `when` | `when(parent).asksFor(token).provide(factory)` | A contextual binding for one class. |
| `contextualBinding` | `contextualBinding(parent, binding: ServiceToken, factory: ServiceFactory): void` | Same, in one call. |
| `if` / `conditionalBinding` | `if(condition: BindingCondition): ConditionalBindingsBuilder` | A binding for the resolutions where `condition` holds. |
| `resolving` | `resolving(token: ServiceToken, callback: (value) => void \| Promise<void>): void` | Runs each time `token` is constructed. |
| `swap` | `swap(token: ServiceToken, factory: ServiceFactory): void` | Replaces a binding, for tests. |
| `override` | `override<T>(token: ServiceToken, value: T): void` | Replaces a binding with a value, for tests. |
| `restore` / `restoreAll` | `restore(token?: ServiceToken): void` | Undoes swaps. |
| `createResolver` | `createResolver(): ContainerResolver` | A resolver with its own scoped values. |
| `runWithScopedValues` | `runWithScopedValues<T>(values: ReadonlyMap<ServiceToken, unknown>, fn: () => Promise<T>): Promise<T>` | |
| `has` / `hasBinding` / `hasAllBindings` | `has(token: ServiceToken): boolean` | Resolvable / explicitly bound / all of them. |
| `bindings` | `readonly { token, scope, target? }[]` | Every token, sorted. |
| `useEmitter` | `useEmitter(emitter: ContainerEmitter): Container` | Emits `container_binding:resolved` after each resolution. |
| `size` | `number` | |

### `HttpContext`

| Member | Signature | Description |
|---|---|---|
| `request` | `Request` | |
| `response` | `Response` | |
| `params` | `MatchedParams` | Route parameters. |
| `route` | `RouteInfo` | The matched route. |
| `routeKey` | `string` | `METHOD-pattern` of the matched route. |
| `subdomains` | `Record<string, string>` | What the route's domain captured from the host. |
| `id` | `string` | The request id. |
| `auth` | `AuthState` | Set by an auth middleware. |
| `bouncer` | `Authorizer \| undefined` | Set by an authorization middleware. |
| `session` | `Session \| undefined` | Set by `SessionMiddleware`. |
| `events` | `Emitter \| undefined` | When `EventsProvider` is registered. |
| `logger` | `ContextLogger` | The request's logger. |
| `locale` | `string` | From `Accept-Language`. |
| `store` | `Map<string, unknown>` | Per-request values for middleware. |
| `containerResolver` | `ContainerResolver \| undefined` | Per-request resolver. |
| `inspect` | `inspect(): string` | A one-line summary. |
| `HttpContext.get` | `static get(): HttpContext \| null` | The ambient context, or `null` outside a request. |
| `HttpContext.getOrFail` | `static getOrFail(): HttpContext` | Throws `E_HTTP_CONTEXT_NOT_FOUND` outside a request. |
| `HttpContext.run` | `static run<T>(ctx: HttpContext, fn: () => T): T` | |
| `HttpContext.runOutsideContext` | `static runOutsideContext<T>(fn: () => T): T` | |
| `HttpContext.useAsyncLocalStorage` | `static useAsyncLocalStorage(enabled: boolean): void` | Turns ambient tracking on or off. |
| `HttpContext.macro` / `getter` | `static macro(name: string, fn: MacroFn): void` | Extends every context. |

### `Request`

| Member | Signature | Description |
|---|---|---|
| `method` | `method(): string` | Honours `_method` spoofing when enabled. |
| `intended` | `intended(): string` | The real method. |
| `url` | `url(includeQs?: boolean): string` | The pathname, with the query string on request. |
| `completeUrl` | `completeUrl(includeQueryString?: boolean): string` | `protocol://host/path`. |
| `path` | `path(): string` | |
| `parsedUrl` | `parsedUrl(): { pathname, search, query }` | |
| `ip` / `ips` | `ip(): string` / `ips(): string[]` | Client address, through trusted proxies. |
| `protocol` / `secure` | `protocol(): string` / `secure(): boolean` | |
| `host`, `hostname`, `authority`, `subdomains` | `host(): string \| null` | |
| `header` | `header(key: string, defaultValue?: string): string \| undefined` | |
| `headers` | `headers(): Readonly<Dict>` | |
| `id` | `id(): string \| undefined` | `x-request-id`. |
| `param` / `params` | `param(key: string, defaultValue?: string): string \| undefined` | Route parameters. |
| `qs` | `qs(): Dict<unknown>` | The parsed query string. |
| `body` | `body(): unknown` | The parsed body. |
| `all` | `all(): Dict<unknown>` | Query string merged with body. |
| `input` | `input<T>(key: string, defaultValue?: T): T` | One input value, dot notation accepted. |
| `only` / `except` | `only(keys: string[]): Dict<unknown>` | |
| `original` | `original(): Dict<unknown>` | The input as received. |
| `raw` / `rawBuffer` | `raw(): string` / `rawBuffer(): Buffer` | The raw body. |
| `hasBody` | `hasBody(): boolean` | |
| `updateBody`, `updateQs`, `updateRawBody` | `updateBody(body: Dict<unknown>): void` | Replace the input, for a middleware. |
| `validateUsing` | `validateUsing<T>(validator: RequestAwareValidator<T>, options?): Promise<T>` | Throws `E_VALIDATION_ERROR` on failure. |
| `tryValidateUsing` | `tryValidateUsing<T>(validator, options?): Promise<[unknown, null] \| [null, T]>` | |
| `validated` | `validated(): unknown` | What the route's `.validate()` produced. |
| `file` | `file(key: string, options?: FileValidationOptions): MultipartFile \| null` | One upload. |
| `files` | `files(key: string, options?: FileValidationOptions): MultipartFile[]` | Every upload under a key. |
| `allFiles` | `allFiles(): Record<string, unknown>` | |
| `cookie` | `cookie(name: string, defaultValue?: string): string \| null` | A signed cookie. |
| `plainCookie` | `plainCookie<T>(name: string, defaultValue?: T, options?: { encoded?: boolean }): T \| null` | |
| `encryptedCookie` | `encryptedCookie(name: string, defaultValue?: string): string \| null` | |
| `cookies` / `cookiesList` | `cookies(): Dict` | |
| `hasValidSignature` | `hasValidSignature(purpose?: string): boolean` | Verifies a signed URL. |
| `is` | `is(types: string[]): string \| null` | Matches the content type. |
| `accepts`, `language`, `charset`, `encoding` | `accepts<T extends string>(types: T[]): T \| null` | Content negotiation. |
| `types`, `languages`, `charsets`, `encodings` | `types(): string[]` | Everything the client accepts, best first. |
| `fresh` / `stale` | `fresh(): boolean` | Whether the client's cached copy is still fresh. |
| `ajax`, `pjax`, `prefetch` | `ajax(): boolean` | |
| `matchesRoute` | `matchesRoute(identifier: string \| string[]): boolean` | By route name, pattern or controller reference. |
| `upgradesToWebSocket` | `upgradesToWebSocket(): boolean` | |
| `getPreviousUrl` | `getPreviousUrl(allowedHosts?: string[], fallback?: string): string` | The `Referer`, when it is an allowed host. |
| `csrfToken`, `csrfProtected` | | Set by the CSRF middleware. |
| `serialize` / `toJSON` / `serializeSafe` | `serialize(): Record<string, unknown>` | A JSON view; `serializeSafe` is fit for logs. |

### `Response`

| Member | Signature | Description |
|---|---|---|
| `status` / `safeStatus` | `status(code: number): Response` | `safeStatus` sets it only if still 200. |
| `header`, `append`, `safeHeader`, `removeHeader` | `header(key: string, value: string): Response` | |
| `vary` | `vary(field: string \| string[]): Response` | |
| `type` | `type(type: string, charset?: string): Response` | |
| `location` | `location(url: string): Response` | |
| `send` | `send(data: unknown): void` | The content type is detected when unset. |
| `json` | `json(data: unknown): void` | |
| `jsonp` | `jsonp(body: unknown, callbackName?: string): void` | |
| `sendBuffer` | `sendBuffer(buffer: Buffer): void` | |
| `stream` | `stream(body: ReadableStream, errorCallback?): Promise<void>` | |
| `download` | `download(filePath: string, generateEtag?: boolean, errorCallback?): void` | |
| `attachment` | `attachment(filePath: string, name?: string, disposition?: string, generateEtag?: boolean): void` | With `Content-Disposition`. |
| `sse` | `sse(options?: SseStreamOptions): Promise<SseStream>` | Opens a server-sent events stream. |
| `redirect` | `redirect(): RedirectBuilder` / `redirect(path: string, forwardQueryString?: boolean, statusCode?: number): void` | |
| `cookie` | `cookie(name: string, value: string, options?: CookieOptions): Response` | Signed. |
| `plainCookie` | `plainCookie(name: string, value: unknown, options?): Response` | Unsigned. |
| `encryptedCookie` | `encryptedCookie(name: string, value: string, options?): Response` | AES-256-GCM. |
| `clearCookie` | `clearCookie(name: string, options?): Response` | |
| `setEtag` | `setEtag(body: string \| Buffer, weak?: boolean): Response` | |
| `fresh` | `fresh(): boolean` | |
| `abort` | `abort(body: unknown, status?: number): never` | Throws `E_HTTP_REQUEST_ABORTED` (400 by default), built by `E_HTTP_EXCEPTION.invoke()`: its `code` is `E_HTTP_EXCEPTION`. |
| `abortIf` / `abortUnless` | `abortIf(condition: unknown, body: unknown, status?: number)` | |
| `setRequestId` | `setRequestId(): Response` | Echoes `x-request-id`. |
| `onFinish` | `onFinish(callback: (err: Error \| null) => void): void` | |
| `noContent`, `continue`, `switchingProtocols` | `(): void` | 204, 100, 101. |
| `ok`, `created`, `accepted`, `nonAuthoritativeInformation`, `resetContent`, `partialContent` | `(body?: unknown): void` | 200 to 206. |
| `multipleChoices`, `movedPermanently`, `movedTemporarily`, `seeOther`, `notModified`, `useProxy`, `temporaryRedirect` | `(body?: unknown): void` | 300 to 307. |
| `badRequest`, `unauthorized`, `paymentRequired`, `forbidden`, `notFound`, `methodNotAllowed`, `notAcceptable`, `proxyAuthenticationRequired`, `requestTimeout`, `conflict`, `gone`, `lengthRequired`, `preconditionFailed`, `requestEntityTooLarge`, `requestUriTooLong`, `unsupportedMediaType`, `requestedRangeNotSatisfiable`, `expectationFailed`, `unprocessableEntity`, `tooManyRequests` | `(body?: unknown): void` | 400 to 429. |
| `internalServerError`, `notImplemented`, `badGateway`, `serviceUnavailable`, `gatewayTimeout`, `httpVersionNotSupported` | `(body?: unknown): void` | 500 to 505. |
| `getStatus`, `getHeaders`, `getHeader`, `getBody` | | Read what was set. |
| `finished`, `headersSent`, `isPending`, `hasContent`, `hasStream`, `hasLazyBody` | `boolean` | |
| `nonce` | `string \| undefined` | The CSP nonce of the request. |

### `Router`

| Member | Signature | Description |
|---|---|---|
| `get`, `post`, `put`, `patch`, `delete`, `head`, `options` | `get(path: string, handler: RouteHandler): RouteBuilder` | |
| `any` | `any(path: string, handler: RouteHandler): RouteBuilder` | Every method. |
| `route` | `route(pattern: string, methods: string \| string[], handler: RouteHandler): RouteBuilder` | |
| `ws` | `ws(path: string, handler: WebSocketRouteHandler): RouteBuilder` | A WebSocket route. |
| `resource` / `shallowResource` | `resource(path: string, controller): RouteResource` | |
| `group` | `group(callback: () => void): GroupBuilder` | Also `group(config, callback)`. |
| `on` | `on(path: string): OnRouteBuilder` | |
| `where` | `where(param: string, matcher: string \| ParamMatcher): Router` | A matcher for every route. |
| `matchers` | `{ number(), uuid(), slug() }` | |
| `use` | `use(middleware: LazyImport<MiddlewareClassConstructor>[]): Router` | Router middleware: runs on matched routes. |
| `named` | `named(collection: Record<string, MiddlewareEntry>): Record<string, (args?) => MiddlewareFunction>` | Named middleware. |
| `controllers` | `controllers(map: Record<string, LazyControllerImport>): Router` | Controllers referenced by string. |
| `urlFor` / `makeUrl` | `urlFor(name: string, params?: Record<string, string>): string` | |
| `makeSignedUrl` | `makeSignedUrl(name: string, params?, options?: SignedUrlOptions): string` | |
| `builder` / `urlBuilder` / `builderForDomain` | `builder(): UrlBuilder` | |
| `namedManifest` | `namedManifest(): Record<string, string>` | Name to pattern, for clients. |
| `namedRoutes` | `namedRoutes(): Record<string, { path; methods }>` | |
| `generateTypes` | `generateTypes(): string` | TypeScript types of the named routes. |
| `find` / `findOrFail` / `has` | `find(identifier: string): RouteDefinition \| null` | By name or pattern. |
| `match` | `match(method: string, path: string, host?: string, options?): MatchResult \| undefined` | |
| `getRoutes` | `getRoutes(): RouteDefinition[]` | |
| `parsePattern` | `parsePattern(pattern: string): { name; optional }[]` | |
| `commit` / `commited` | `commit(): void` | Freezes the table and builds the index. |
| `toJSON`, `usingDomains`, `routeCount`, `clear` | | |

### `RouteBuilder`

| Member | Signature | Description |
|---|---|---|
| `as` | `as(name: string): RouteBuilder` | Names the route. |
| `prefix` | `prefix(prefix: string): RouteBuilder` | |
| `middleware` | `middleware(...names: string[]): RouteBuilder` | Named middleware. |
| `use` | `use(...mw: MiddlewareFunction[]): RouteBuilder` | Inline middleware. |
| `guard` | `guard(...guards: string[]): RouteBuilder` | Authentication guards. |
| `role` / `permission` | `role(...roles: string[]): RouteBuilder` | |
| `where` | `where(param: string, matcher: string \| ParamMatcher): RouteBuilder` | |
| `validate` | `validate(validator: string): RouteBuilder` | Validates the body with a named validator. |
| `domain` | `domain(d: string): RouteBuilder` | |
| `version` | `version(v: string): RouteBuilder` | |
| `deprecates` | `deprecates(version: string, options?: { sunset?: string }): RouteBuilder` | |
| `getName`, `getPattern`, `setPattern`, `getHandler`, `getMiddleware`, `getDefinition`, `markAsDeleted`, `isDeleted`, `toJSON` | | |

### `GroupBuilder`

`prefix(p)`, `as(namePrefix)`, `middleware(...names)`, `use(...mw)`, `guard(...guards)`, `domain(d)`, `where(param, matcher)`, each returning the group; `routes` lists its routes.

### `RouteResource`

`only(actions)`, `except(actions)`, `apiOnly()`, `where(key, matcher)`, `params(resources)`, `use(actions, middleware)` (alias `middleware`), `as(name, normalizeName?)`, `tap(callback)` / `tap(actions, callback)`, each returning the resource; `routes` lists the generated `RouteBuilder`s.

### `Server`

| Member | Signature | Description |
|---|---|---|
| `use` | `use(middleware: MiddlewareEntry[]): Server` | Global middleware. |
| `errorHandler` | `errorHandler(handler: LazyImport<ErrorHandlerClass>): Server` | |
| `trustedProxies` | `trustedProxies(cidrs: string[]): Server` | |
| `grpc` | `grpc(handler: GrpcHandler, limits?: GrpcLimits): Server` | Serves gRPC on the HTTP port. |
| `supportsWebSockets` | `supportsWebSockets(): boolean` | |
| `getRouter`, `getErrorHandler`, `getServerMiddleware`, `getTrustedProxies`, `getGrpcHandler`, `getGrpcLimits` | | |

### `Session`

| Member | Signature | Description |
|---|---|---|
| `get` | `get<T>(key: string, defaultValue?: T): T` | |
| `put` | `put(key: string, value: unknown): void` | |
| `has`, `all`, `forget`, `pull`, `clear` | | |
| `increment` / `decrement` | `increment(key: string, amount?: number): void` | |
| `flash` | `flash(key: string \| Record<string, unknown>, value?: unknown): void` | For the next request only. |
| `flashAll`, `flashOnly`, `flashExcept` | `flashOnly(keys: string[]): void` | Flash the request input. |
| `flashErrors` | `flashErrors(errors: Record<string, string \| string[]>): void` | |
| `flashValidationErrors` | `flashValidationErrors(error, withInput?: boolean): void` | |
| `reflash`, `reflashOnly`, `reflashExcept` | | Keep the previous flash data. |
| `flashMessages` | `ReadOnlyValuesStore` | What the previous request flashed. |
| `old` | `old<T>(key: string, defaultValue?: T): T` | One previous flash value. |
| `regenerate` | `regenerate(): void` | Rotates the id, keeping the data. |
| `sessionId`, `fresh`, `isEmpty`, `readonly`, `revocable` | | |
| `setIntendedUrl`, `getIntendedUrl`, `pullIntendedUrl`, `clearIntendedUrl` | | Where the user was heading. |
| `supportsTagging` | `supportsTagging(): boolean` | |
| `tag` / `untag` | `tag(userId: string \| number): Promise<void>` | Links the session to a user. |

### `Env`

| Member | Signature | Description |
|---|---|---|
| `Env.create` | `static create(appRoot: URL, schema): Promise<Env<…>>` | Loads `.env*`, validates, and returns a typed reader. Throws `E_INVALID_ENV_VARIABLES`. |
| `Env.schema` | `string`, `number`, `boolean`, `enum`, `secret` | Each with `.optional()` and `.optionalWhen(condition)`. `string` takes `{ format: 'host' \| 'url' \| 'email' \| 'uuid' }`. |
| `Env.rules` | `static rules(schema): { validate(values) }` | A reusable validator. |
| `Env.defineIdentifier` / `defineIdentifierIfMissing` / `removeIdentifier` | `static defineIdentifier(name: string, resolver): void` | Interpolation identifiers such as `file:`. |
| `get` | `get(key, fallback?)` | Typed by the schema. |
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

`handle(error, ctx)`, `report(error, ctx)`, and the renderers it picks by content negotiation: `renderError`, `renderErrorAsJSON`, `renderErrorAsJSONAPI`, `renderErrorAsHTML`, `renderValidationError`, `renderValidationErrorAsJSON`, `renderValidationErrorAsJSONAPI`, `renderValidationErrorAsHTML`.

### `Emitter`

| Member | Signature | Description |
|---|---|---|
| `on` | `on(event: string \| EventClass, listener): UnsubscribeFunction` | |
| `once` | `once(event, listener): void` | |
| `listenIf` | `listenIf(condition: boolean \| (() => boolean), event, listener): UnsubscribeFunction` | |
| `listen` | `listen(event, listeners: (ListenerClass \| LazyListenerImport)[]): void` | Several listener classes. |
| `emit` | `emit(event: string, data: unknown): Promise<void>` | |
| `emitSerial` | `emitSerial(event: string, data: unknown): Promise<void>` | Listeners one at a time. |
| `dispatchEvent` | `dispatchEvent<T extends object>(event: T): Promise<void>` | A class-based event. |
| `onAny` / `offAny` | `onAny(pattern?: string, listener): Promise<AsyncUnsubscribeFunction>` | Wildcard subscription. |
| `tap` | `tap(observer: (event: string, data: unknown) => void): UnsubscribeFunction` | Watches every emission. |
| `off`, `clearListener`, `clearListeners`, `clearAllListeners` | | |
| `listenerCount`, `hasListeners`, `eventsListeners` | | |
| `onError` | `onError(listener: (event: string, error: unknown) => void): void` | Listener failures. |
| `fake` / `restore` | `fake(events?: BufferedEventName[]): EventsBuffer` | Captures events instead of delivering them. |
| `request` / `onRequest` | `request<T>(name: string, data: unknown, timeoutMs?: number): Promise<T>` | Request and reply over the bus. |
| `setCorrelationId`, `getCorrelationId`, `clearCorrelationId` | | Correlation id of the current async context. |

### `BaseCommand`

| Member | Signature | Description |
|---|---|---|
| `commandName` | `static commandName: string` | |
| `description` | `static description: string` | |
| `aliases` | `static aliases: readonly string[]` | |
| `help` | `static help?: string \| string[]` | |
| `options` | `static options: CommandOptions` | `startApp`, `staysAlive`, `allowUnknownFlags`, … |
| `defineArgument` / `defineFlag` | `static defineArgument(name: string, options?): void` | Without a decorator. |
| `run` | `run(...args): unknown` | The command body. |
| `prepare`, `interact`, `completed` | | Lifecycle hooks around `run()`. |
| `terminate` | `terminate(): Promise<void>` | Ends a `staysAlive` command. |
| `logger`, `ui`, `colors`, `prompt` | | Output and prompts. |
| `app` | `Application` | With `startApp: true`. |
| `kernel`, `parsed`, `isMain` | | |
| `exitCode` | `number \| undefined` | A non-zero exit without throwing. |
| `result`, `error` | | Filled after the run. |
| `exec` | `exec(): Promise<unknown>` | Hydrates, then runs. |
| `assertSucceeded`, `assertFailed`, `assertExitCode`, `assertNotExitCode`, `assertLog`, `assertLogMatches`, `assertTableRows` | | Assertions for tests. |

### `@c9up/ream/types`

| Export | Kind | Description |
|---|---|---|
| `ContainerBindings` | interface | The string tokens the container resolves, with their types. A package adds its own by augmenting it. |
| `ContainerBinding` | type | `keyof ContainerBindings`. |
| `Authenticators` | interface | The guards of the application, augmented by the auth config. |
| `AuthenticatorName` | type | `keyof Authenticators`. |

### `@c9up/ream/exceptions`

`Exception`, `createError`, `ErrorClass`, `RuntimeException`, `InvalidArgumentsException`, `E_ROUTE_NOT_FOUND`, `E_UNAUTHORIZED_ACCESS`, `E_AUTHORIZATION_FAILURE`, `E_VALIDATION_ERROR`, `E_HTTP_EXCEPTION`, `E_HTTP_REQUEST_ABORTED`, `HttpError`, `StatusPageRenderer`, `ExceptionClass`, `ExceptionHandler`: the same as in `@c9up/ream`.

### `@c9up/ream/env`

| Export | Kind | Description |
|---|---|---|
| `loadEnvFiles` | function | `loadEnvFiles(appRoot: URL, options?: { skipEnvLocal?: boolean }): Promise<void>`: loads the `.env*` files into `process.env`; an existing key is never overwritten. |
| `envFileNames` | function | `envFileNames(options?: { skipEnvLocal?: boolean }): string[]`: the files read, most specific first. |

### `@c9up/ream/bootstrap`

| Export | Kind | Description |
|---|---|---|
| `createHyperServerFactory` | function | `createHyperServerFactory(): ((port: number, host?: string) => HyperServerLike) \| undefined`: the native server for this platform, or `undefined` when no binary is available. |

### `@c9up/ream/hot` and `@c9up/ream/dev/hmr`

`@c9up/ream/hot` exports nothing: `ream dev` loads it with `--import` before `bin/server.ts`. It watches the import graph and swaps a changed module in the running process.

| Export (`dev/hmr`) | Kind | Description |
|---|---|---|
| `HMR_PATH` | const | `"/__ream/hmr"`. |
| `hmrEndpoint` | function | The middleware that answers the browser's reload stream. |
| `hmrClientScript` | function | `hmrClientScript(nonce?: string): string`: the script injected into HTML pages in development. |
| `hmrToken` | function | `hmrToken(): string`: changes on a restart and on a hot swap. |
| `hotReloadCount` | function | `hotReloadCount(): number`. |
| `hotReloadHappened` | function | `hotReloadHappened(): void`: called when a module was swapped. |

### `@c9up/ream/services/*`

Each module's default export is the live instance of the running application, through a proxy that throws when it is used before the application seats it.

| Import | Default export | Other exports |
|---|---|---|
| `services/app` | `Application` | `setApp`, `clearApp`, `getApp` |
| `services/config` | `ConfigStore` | |
| `services/router` | `Router` | `setRouter`, `clearRouter`, `getRouter` |
| `services/server` | `Server` | `setServer`, `clearServer`, `getServer` |
| `services/logger` | the app logger | `setLogger`, `clearLogger`, `getLogger` |
| `services/encryption` | `CookieSigner` | `setEncryption`, `clearEncryption`, `getEncryption` |
| `services/console` | `Console` | `setConsole`, `clearConsole` |
| `services/dumper` | `Dumper` | `dd(value: unknown): never` |
| `services/repl` | `Repl` | |
| `services/urlBuilder` | | `urlFor(name, params?)`, `signedUrlFor(name, params?, options?)` |
| `events/services/main` | `Emitter` | `setEmitter`, `getEmitter` |

### `@c9up/ream/dumper`

| Export | Kind | Description |
|---|---|---|
| `Dumper` | class | `dumpToAnsi(value, options?)`, `dumpToHtml(value, options?)`, `getHeadElements(cspNonce?)`, `dd(value)`, `configureAnsiOutput(config)`, `configureHtmlOutput(config)`. |
| `ConsoleDumpConfig`, `HTMLDumpConfig`, `DumpSource` | interface | Rendering options; where a dump was written. |
| `errors` | namespace | `E_DUMP_DIE_EXCEPTION`. |

`dd()` stops a request with an HTML dump, or a command with a printed one.

### `@c9up/ream/repl`

| Export | Kind | Description |
|---|---|---|
| `Repl` | class | `start(context?)`, `addMethod(name, handler, options?)`, `ready(callback)`, `useCompiler(compiler)`, `notify(message)`, `getMethods()`, `describeMethods()`, `server`. |
| `ReplConstructorOptions`, `MethodCallback`, `MethodOptions`, `Compiler` | type | |

### `@c9up/ream/bodyparser`, `@c9up/ream/bodyparser_middleware`, `@c9up/ream/bodyparser/config`

The middleware class is the default export; `BodyParserConfig` is its config type; `bodyparser/config` exports `defineConfig(config: BodyParserConfig): BodyParserConfig`. Options under [Configuration](#configuration).

### `@c9up/ream/session`, `@c9up/ream/session_middleware`, `@c9up/ream/session/config`

The session middleware class is the default export. `session/config` exports `defineConfig(config: SessionConfigInput): SessionConfigInput`, which validates the config, and `SessionConfigInput` (`SessionConfig` plus `secret`, required by the cookie store).

### `@c9up/ream/events` and its subpaths

| Import | Exports |
|---|---|
| `events` | `Emitter`, `BaseEvent`, `EventsBuffer`, `EventsProvider`, `defineConfig`, `EventsConfig`, `ListenerClass`, `BufferedEvent`, `BufferedEventName`, `EventFinder`, `UnsubscribeFunction`, `AsyncUnsubscribeFunction`, `ContainerResolver` (the resolver shape listeners are built with), `EventBus`, `EventsAppContext`. |
| `events/provider` | `EventsProvider` (default): builds the bus and binds `emitter`. |
| `events/config` | `defineConfig`, `checkEventsConfig(config: unknown): EventsConfig`, `EventsConfig`. |
| `events/configure` | `configure(codemods)`: registers `@c9up/ream/events/provider` and writes `config/events.ts`. |
| `events/testing` | `FakeBus`: captures emits and requests (`CapturedEmit`, `CapturedRequest`, `FakeBusPredicate`, `FakeBusPredicateArg`, `FakeBusRequestHandler`). |
| `events/helix` | `collect(bus, pattern)`, `fake(bus, pattern)`, `assertEmitted(events, name, payload?)`, `assertNotEmitted(events, name)`, `waitForEvent(events, name, options?)`, `waitForChain(events, correlationId, names, options?)`, and `CollectedEvent`, `CollectResult`, `WaitForEventOptions`, `WaitForChainOptions`. |

### `@c9up/ream/scheduler/provider`, `@c9up/ream/scheduler/config`

`ScheduleProvider` (default export) registers the `Scheduler` and the `@Schedule` methods; `ScheduleProviderOptions` takes a `scheduler` to inject. `scheduler/config` exports `defineConfig(config: SchedulerConfig): SchedulerConfig`, `SchedulerConfig`, `LockBackend`, `LockBackendFactory`, and `locks`:

```ts
locks.memory(): LockBackendFactory
locks.redis(options: { connection: string | LockRedisResolver; prefix?: string }): LockBackendFactory
```

### `@c9up/ream/rpc/provider`, `@c9up/ream/rpc/router`

`RpcProvider` (default export) mounts the JSON-RPC endpoint. `RpcProviderOptions`: `path` (default `/rpc`), `guards`, `contentTypes`, `router`; `RpcConfig`: `webSocket?: boolean | RpcWebSocketOptions` serves the methods over a WebSocket on the same path.

| `RpcRouter` member | Signature | Description |
|---|---|---|
| `method` | `method(name: string, handler: RpcHandler): RpcMethodBuilder` | Names starting with `rpc.` are reserved. |
| `namespace` | `namespace<T>(prefix: string, controller, methods: readonly ControllerMethodName<T>[]): void` | Registers controller methods as `<prefix>.<method>`. |
| `group` | `group(config: { guard?; guards?; middleware? }, callback: (rpc: RpcRouter) => void): void` | |
| `handle` | `handle(ctx: HttpContext): Promise<void>` | Answers one JSON-RPC request or batch. |
| `webSocket` | `webSocket(options?: RpcWebSocketOptions): (ctx: WebSocketContext) => void` | `maxInFlight`, `maxQueued`. |
| `useContainer` | `useContainer(container): void` | Resolves namespace controllers. |
| `getMethods` / `getMethod` | `getMethods(): string[]` | |

`RpcMethodBuilder`: `guard`, `role`, `permission`, `validate`, `middleware`. Also exported: `RpcHandler`, `RpcMethodDefinition`, `RpcRouterOptions`, `RpcWebSocketOptions`, `ControllerMethodName`.

### `@c9up/ream/graphql/provider`, `@c9up/ream/openapi/provider`, `@c9up/ream/storage/provider`

| Provider | Options |
|---|---|
| `GraphQLProvider` (default) | `GraphQLProviderOptions`: `engine` to inject. |
| `OpenApiProvider` (default) | `OpenApiDocsConfig`: `enabled` (default `true`), `specPath` (default `/api-docs`), `docsPath` (Swagger UI, default `/docs`), `title` (default `'API'`), `version` (default `'1.0.0'`). `OpenApiProviderOptions`: `generator` to inject. |
| `StaticProvider` (default) | `StaticProviderOptions`: `middleware` to inject. |

### `@c9up/ream/health`

| Export | Kind | Description |
|---|---|---|
| `HealthChecks` | class | `register(checks)`, `append(checks)`, `run(): Promise<HealthCheckReport>`: runs every check concurrently. |
| `BaseCheck` | class | The base of a check. |
| `DiskSpaceCheck`, `MemoryHeapCheck`, `MemoryRSSCheck` | class | Built-in checks. |
| `Result` | class | Builds a check result. |
| `HealthCheckContract`, `HealthCheckReport`, `HealthCheckResult`, `HealthCheckTracingData` | type | A report's `isHealthy` is false as soon as one check reports `error`. |
| `tracingChannels` | namespace | Diagnostics channels around each check. |

### `@c9up/ream/http-client`

| Export | Kind | Description |
|---|---|---|
| `HttpClient` | class | `get`, `post`, `put`, `patch`, `delete`, `request(input, options?)`, `close()`. Refuses non-public addresses. |
| `HttpResponse` | class | `status`, `headers`, `url`, `body`, `ok`, `header(name)`, `text()`, `json()`. |
| `HttpClientOptions`, `HttpRequestOptions`, `OutgoingRequest` | interface | |
| `fakeHttp` | function | `fakeHttp(options?: HttpClientOptions): FakeHttpClient`. |
| `FakeHttpClient` | class | `on(method, match, response)`, `onAny(match, response)`, `requests`, `reset()`. |
| `FakeMatcher`, `FakeResponse`, `RecordedRequest` | type | |
| `isPublicAddress` | function | `isPublicAddress(address: string): boolean`. |

A failed request throws one of `errors.E_HTTP_CLIENT_INVALID_URL`, `E_HTTP_CLIENT_PRIVATE_ADDRESS`, `E_HTTP_CLIENT_UNREACHABLE`, `E_HTTP_CLIENT_TIMED_OUT`, `E_HTTP_CLIENT_TOO_LARGE` or `E_HTTP_CLIENT_REDIRECT_REFUSED` (`errors` of `@c9up/ream`); each carries `url`, the URL asked for without its query string.

`HttpClientOptions`: `timeout` (ms, default `10000`, redirects included), `maxResponseBytes` (default 5 MiB), `maxRedirects` (default `3`), `crossHostRedirects` (default `false`), `userAgent` (default `@c9up/ream`), `headers`, `allowHosts` (hosts exempt from the public-address rule). `HttpRequestOptions`: `method`, `headers`, `body`, `json`, `signal`, `timeout`, `maxResponseBytes`.

### `@c9up/ream/console`

Everything under Console above, plus: `Console`, `ConsoleOptions`, `ExceptionHandler` (the console one), `TaskContext`, `Tasks`, `Table`, `Box`, `Action`, `Colors`, `StyleName`, `TaskOutcome` (from `@c9up/lumen`), `ArgumentOptions`, `FlagOptions`, `CommandsManifest`, `CommandExecutor`, `CommandLoader`, `ErrorRenderer`, `GlobalFlagListener`, `HandleResult`, `KernelOptions`, `KernelState`, `serializeCommand`, `ParseOptions`, `parseArgv`, `PromptOptions`, `BooleanPromptOptions`, `MultiplePromptOptions`, `SelectPromptOptions`, `PromptChoice`, `commandExec` (tracing channel), `ExecutedCommand`, `ParsedInput`, `isCommandClass`, `renderErrorWithSuggestions`, `sortAlphabetically`, `validateCommand`, `validateCommandMetaData`.

### `@c9up/ream/commands`

A command loader: `getMetaData(): Promise<SerializedCommand[]>` and `getCommand(metadata): Promise<CommandClass | null>`, over `migrate`, `migrate:rollback`, `migrate:status`, `schedule:list` and `schedule:run`.

### `@c9up/ream/stubs`

| Export | Kind | Description |
|---|---|---|
| `stubsRoot` | const | `<package>/stubs`: the `make:` stubs. |
| `compile` | function | `compile(input: string, options?: TemplateOptions): (state: StubState) => string`. |
| `render` | function | `render(input: string, state?: StubState, options?: TemplateOptions): string`. |
| `escapeHtml` | function | `escapeHtml(value: unknown): string`. |
| `StubValue`, `StubFunction`, `StubState`, `StubBlock`, `TemplateOptions` | type | |

### `@c9up/ream/helpers`

| Export | Kind | Description |
|---|---|---|
| `string` | const | String helpers (below), plus `bytes`, `milliseconds` and `seconds`. |
| `is` | const | Type checks (below). |
| `base64` | const | `encode`, `decode`, `urlEncode`, `urlDecode`; a decode returns `null` on bad input. |
| `Secret` | class | A value that prints as `[redacted]`. |
| `safeEqual` | function | `safeEqual(a: string \| Buffer, b: string \| Buffer): boolean`: constant-time comparison. |
| `safeTiming` | function | `safeTiming<T>(minimumMs: number, callback: (timing: { returnEarly(): void }) => Promise<T>): Promise<T>`: never returns before `minimumMs`. |
| `compose` | function | `compose(superclass, ...mixins)`: applies mixins to a base class. |
| `defineStaticProperty` | function | `defineStaticProperty<T>(target, propertyName, { initialValue, strategy: 'inherit' \| 'define' \| ((value: T) => T) })`: gives a subclass its own copy of an inherited static. |
| `milliseconds`, `seconds` | const | `parse(duration: string \| number): number` and `format(value: number, long?: boolean): string`. |
| `MessageBuilder` | class | Builds and verifies a message envelope with a purpose and an expiry. |
| `VerificationToken` | class | Abstract base of single-use tokens (`<identifier>.<secret>`, only the SHA-256 of the secret stored); subclass it to add persistence. |
| `fsReadAll`, `fsImportAll`, `ReadAllFilesOptions`, `ImportAllFilesOptions` | function / type | Read or import every file of a directory. |
| `isString`, `isNumber`, … `hasProperty` | function | The `is` functions, also exported one by one. |
| the type helpers | type | As in `helpers/types`. |

`@c9up/ream/helpers/string` (also the default export): `camelCase`, `snakeCase`, `pascalCase`, `dashCase`, `dotCase`, `noCase`, `titleCase`, `capitalCase`, `sentenceCase`, `sentence`, `toSentence`, `wordWrap`, `justify`, `truncate`, `excerpt`, `condenseWhitespace`, `slug`, `plural`, `pluralize`, `singular`, `isPlural`, `isSingular`, `ordinal`, `ordinalize`, `humanize`, `htmlEscape`, `escapeHTML`, `encodeSymbols`, `interpolate`, `isEmpty`, `uuid`, `random`, `generateRandom`, `prettyHrTime`, `toUnixSlash`.

`@c9up/ream/helpers/is` (also the default export): `isString`, `isNumber`, `isBoolean`, `isFunction`, `isObject`, `isPlainObject`, `isArray`, `isPromise`, `isNull`, `isUndefined`, `isNullOrUndefined`, `isBuffer`, `isDate`, `isRegExp`, `isError`, `isEmpty`, `isNonEmptyString`, `isNonEmptyArray`, `isInteger`, `isPositive`, `hasProperty`.

`@c9up/ream/helpers/types`: `InferRouteParams`, `OneOrMore`, `Opaque`, `UnwrapOpaque`, `AsyncOrSync`, `Constructor`, `AbstractConstructor`, `ExtractFunctions`, `Prettify`, `ExtractUndefined`, `ExtractDefined`, `LazyImport`, `UnWrapLazyImport`, `UnwrapPromise`, `MakeOptional`, `MakeRequired`, `MakeNullable`, `DeepPartial`, `DeepRequired`, `DeepReadonly`, `EmptyObject`, `ExtractKeysOfType`, `AllOf`, `NoneOf`, `TypeGuard`, `Brand`.

`@c9up/ream/helpers/base64`: `base64`. `@c9up/ream/helpers/fs`: `fsReadAll`, `fsImportAll`, `ReadAllPathType`, `ReadAllFilesOptions`, `ImportAllFilesOptions`.

### `@c9up/ream/testing`

| Export | Kind | Description |
|---|---|---|
| `TestClient` | class | An HTTP client over the app booted on a random port. |
| `createTestClient` | function | `createTestClient(bootFn, options?: { auth?: AuthStrategy }): Promise<TestClient>`: creates and boots one. |
| `RequestBuilder` | class | One request: awaitable, with chained assertions. |
| `ApiResponse` | class | The response, with assertions. |
| `TestWebSocket`, `TestWebSocketOptions`, `TestWebSocketClose` | class / type | `client.ws(path)`. |
| `AuthStrategy`, `AuthSubject` | interface | How `withAuth()` / `asUser()` authenticate. |
| `RouteManifest`, `RouteEntry`, `resolveNamedRoute` | type / function | Named routes for `visit()`. |
| `HttpMethod`, `HttpSender`, `QueryParams`, `TestResponse` | type | |
| `parseHttpResponse` | function | `parseHttpResponse(raw: string \| Buffer): TestResponse`. |
| `partialMatch` | function | `partialMatch(actual: unknown, expected: unknown): boolean`. |

| `TestClient` member | Signature | Description |
|---|---|---|
| constructor | `new TestClient(bootFn: (port: number) => Promise<{ port; close }>, options?: { auth?: AuthStrategy; routes?: RouteManifest })` | |
| `boot` / `close` | `boot(): Promise<void>` | Idempotent. |
| `booted`, `port` | | |
| `get`, `post`, `put`, `patch`, `delete`, `head`, `options` | `get(path: string): RequestBuilder` | |
| `request` / `fluent` | `request(path: string, method?: HttpMethod): RequestBuilder` | |
| `visit` | `visit(name: string, params?: Record<string, string>): RequestBuilder` | GETs a named route. |
| `withHeader` | `withHeader(name: string, value: string): TestClient` | A default header. |
| `ws` | `ws(path: string, options?: TestWebSocketOptions): Promise<TestWebSocket>` | |

`RequestBuilder`: body and headers (`json`, `form`, `body`, `field`, `fields`, `file`, `header`, `headers`, `cookie`, `cookies`, `qs`, `type`, `accept`, `bearerToken`, `basicAuth`, `unsafeJson`, `unsafeForm`, `unsafeQs`, `serialize`), behaviour (`timeout`, `redirects`), auth (`withAuth`, `asUser`, `loginAs`, `withCsrf` / `withCsrfToken`), debugging (`dump`, `dumpBody`, `dumpHeaders`, `dumpCookies`), `send()`, and the assertions below. `RequestBuilder.addSerializer(name, fn)` and `addParser(contentType, fn)` register body codecs.

`ApiResponse`: `status()`, `statusType()`, `headers()`, `header(name)`, `text()`, `body()`, `json<T>()`, `method()`, `type()`, `charset()`, `cookies()`, `cookie(name)`, `redirects()`, `links()`, `files()`, `hasBody()`, `hasError()`, `hasFatalError()`, `error()`, the `dump*()` methods, `assertAgainstApiSpec()`, and the assertions below.

Assertions, on both: `assertStatus`, `assertHeader`, `assertHeaderMissing`, `assertCookie`, `assertCookieMissing`, `assertBody`, `assertBodyContains`, `assertBodyNotContains`, `assertTextIncludes`, `assertRedirectsTo`, and one per status: `assertOk`, `assertCreated`, `assertAccepted`, `assertNoContent`, `assertMovedPermanently`, `assertFound`, `assertBadRequest`, `assertUnauthorized`, `assertPaymentRequired`, `assertForbidden`, `assertNotFound`, `assertMethodNotAllowed`, `assertNotAcceptable`, `assertRequestTimeout`, `assertConflict`, `assertGone`, `assertLengthRequired`, `assertPreconditionFailed`, `assertPayloadTooLarge`, `assertURITooLong`, `assertUnsupportedMediaType`, `assertRangeNotSatisfiable`, `assertImATeapot`, `assertUnprocessableEntity`, `assertLocked`, `assertTooManyRequests`, `assertInternalServerError`. `RequestBuilder` also has `expectStatus`, `expectHeader`, `expectCookie`, `expectJson`.

### `@c9up/ream/testing/utils`

| Export | Kind | Description |
|---|---|---|
| `createTestUtils` | function | `createTestUtils(boot: BootServer): TestUtils`. |
| `TestUtils` | class | `httpServer(): HttpServerUtils`, `client(): TestClient \| undefined`. |
| `HttpServerUtils` | class | `start(): Promise<() => Promise<void>>`: starts the server and returns its close function. |
| `BootServer` | type | `(port: number) => Promise<{ port: number; close: () => Promise<void> \| void }>`. |

## Configuration

### `reamrc.ts`

`defineConfig(config: ReamrcConfig)` from `@c9up/ream`:

| Option | Type | Default | Description |
|---|---|---|---|
| `providers` | `(() => Promise<{ default: Provider }> \| { file; environment?: string[] })[]` | | Providers, optionally limited to environments. |
| `preloads` | `(() => Promise<unknown> \| { file; environment?: string[] })[]` | | Modules imported at boot (`start/routes.ts`, `start/kernel.ts`). |
| `commands` | `(() => Promise<unknown>)[]` | | Command loaders. |
| `commandsAliases` | `Record<string, string>` | | Shorthands: `{ resource: 'make:controller --resource' }`. |
| `directories` | `Partial<DirectoriesNode>` | the conventional layout | Overrides, merged over the defaults. |
| `modules` | `{ path?: string; autoload?: string[] }` | `./app/modules`, `['routes', 'events']` | What to load from each module directory; a trailing `/` names a directory. |
| `tests` | `TestsConfig` | | `suites` (`name`, `files`, `timeout`, `retries`, `configure`), `timeout`, `forceExit`, `bootstrap`. Read by `ream test`. |
| `assets` | `{ devServer?: { command; args? }; build?: { command; args? } }` | | The asset command `ream dev` and `ream build` run beside the app. |
| `metaFiles` | `{ pattern: string; reloadServer: boolean }[]` | | Non-module files of the app; `reloadServer` restarts the dev server when one changes. |
| `mobile` | `MobileConfig` | | The phone app `ream android:*` builds: `name`, `id`, `entry`, `version` (default `1.0.0`), `build`, `icon`, `css`, `android` (`permissions`, `abis`, `signing`), `updates` (`url`, `publicKey`, `directory`). |

### `Ignitor` options

`new Ignitor(appRoot, config?: IgnitorConfig)`:

| Option | Type | Default | Description |
|---|---|---|---|
| `port` | `number` | `PORT`, then `3000` | |
| `host` | `string` | `HOST`, then `0.0.0.0` in production and `localhost` otherwise | |
| `serverFactory` | `(port: number, host: string) => HyperServerLike` | | The HTTP server; `createHyperServerFactory()` gives the native one. |
| `importer` | `(filePath: string) => Promise<unknown>` | | How the app's modules are imported. |
| `watchDirs` | `string[]` | | Directories watched for hot reload. |
| `gracefulShutdown` | `boolean` | `true` | Drains the server on SIGTERM / SIGINT (web mode). |

### `config/app.ts`: `http`

Read by the native server. Timeouts are in milliseconds; `0` disables a bound.

| Option | Default | Description |
|---|---|---|
| `http.headersTimeout` | `60000` | Time to receive the request headers. |
| `http.requestTimeout` | `300000` | Time to receive the whole request. |
| `http.keepAliveTimeout` | `5000` | Idle time of a kept-alive connection. |
| `http.maxConnections` | `10000` | Open connections; `0` for no cap. |
| `http.webSocket.maxFrameSize` | 1 MiB | Bytes, or a size such as `'1mb'`. |
| `http.webSocket.maxMessageSize` | 1 MiB | |
| `http.webSocket.maxBufferedBytes` | 4 MiB | Outgoing backlog per connection. |
| `http.webSocket.idleTimeout` | `60000` | `0` never closes. |
| `http.webSocket.allowedOrigins` | same origin | Browser origins allowed to connect, or `['*']`. |

### `config/bodyparser.ts`

`defineConfig` from `@c9up/ream/bodyparser/config`. The native server enforces each `limit` while reading the body.

| Option | Default | Description |
|---|---|---|
| `allowedMethods` | `['POST', 'PUT', 'PATCH', 'DELETE']` | Methods whose body is parsed. |
| `json.limit` | `'1mb'` | A size string or a number of bytes. |
| `json.types` | `application/json`, `application/json-patch+json`, `application/vnd.api+json`, `application/csp-report` | |
| `json.strict` | `true` | Only objects and arrays. |
| `json.convertEmptyStringsToNull`, `json.trimWhitespaces` | `true` | |
| `form.limit` | `'1mb'` | |
| `form.types` | `application/x-www-form-urlencoded` | |
| `form.convertEmptyStringsToNull`, `form.trimWhitespaces` | `true` | |
| `form.queryString` | `{}` | Query-string parser options. |
| `raw.limit` | `'1mb'` | |
| `raw.types` | `text/*` | |
| `multipart.limit` | `'20mb'` | |
| `multipart.maxFiles`, `multipart.maxFields` | `1000` | |
| `multipart.types` | `multipart/form-data` | |
| `multipart.convertEmptyStringsToNull`, `multipart.trimWhitespaces` | `true` | |

### `config/session.ts`

`defineConfig` from `@c9up/ream/session/config`:

| Option | Default | Description |
|---|---|---|
| `store` | none: required | A key of `stores`, or a driver name (`cookie`, `memory`, `file`, `redis`, `database`). |
| `stores` | | Named stores: `{ driver, ...options }`. |
| `secret` | | Signs the session cookie; required by the cookie store. |
| `cookieName` | `'ream_session'` | |
| `age` | 7200 seconds | A number of seconds or a duration such as `'2h'`. |
| `clearWithBrowser` | `false` | A cookie without expiry. |
| `rolling` | `false` | Re-sends the cookie on every response. |
| `cookie` | `{ path: '/', httpOnly: true, sameSite: 'lax' }`, `secure` in production | `httpOnly: false` is refused. |
| `location` | | `file` store: the directory. |
| `dbConnection`, `tableName`, `gcProbability` | `tableName: 'sessions'` | `database` store. |
| `connection`, `client`, `prefix` | `prefix: 'ream:session:'` | `redis` store. |

### `config/events.ts`

`defineConfig` from `@c9up/ream/events/config`: `store: 'memory'` (the default and only store). Any other option is refused.

### `config/scheduler.ts`

`defineConfig` from `@c9up/ream/scheduler/config`:

| Option | Default | Description |
|---|---|---|
| `lock` | none: every instance runs every task | `locks.memory()` or `locks.redis({ connection })`. |
| `defaultLockTtlMs` | `60000` | How long a lease lasts. |

### Static files

`defineStaticConfig(config?: Partial<StaticConfig>)`:

| Option | Default | Description |
|---|---|---|
| `root` | | The directory served. |
| `enabled` | `true` | |
| `prefix` | | Serve only under this URL prefix. |
| `index` | `'index.html'` | `false` disables. |
| `extensions` | | Fallback extensions tried when the path has none. |
| `dotFiles` | `'ignore'` | `'ignore'`, `'deny'` (403) or `'allow'`. |
| `etag`, `lastModified`, `cacheControl`, `acceptRanges` | `true` | |
| `maxAge` | `0` | `Cache-Control: max-age`, in milliseconds. |
| `immutable` | `false` | Needs `maxAge`. |
| `headers` | | `(filePath, stat) => Record<string, string>`: extra headers per file. |

## Container bindings

| Token | Resolves to |
|---|---|
| `app` | `Application` |
| `appRoot` | `string`: the absolute project root |
| `config` | `ConfigStore` |
| `router` | `Router` |
| `server` | `Server` |
| `middleware` | `MiddlewareRegistry` |
| `HttpContext` | the `HttpContext` class |
| `encryption` | `CookieSigner` |
| `signedUrl` | `SignedUrl` |
| `emitter` | `Emitter` |
| `migrations` | `MigrationRegistry` |
| `console` | `Console` |
| `consoleKernel` | `Kernel` |

Other packages add theirs (`logger`, `auth`, `db`, …) by augmenting `ContainerBindings` from `@c9up/ream/types`.

## Errors

Each code links to its row in the [error index](/en/reference/errors).

### Container

| Code | Raised when |
|---|---|
| [`E_CONTAINER_NOT_FOUND`](/en/reference/errors#e-container-not-found) | No binding found for the requested token. Includes "did you mean?" suggestions for typos. Register it with `container.singleton()` or decorate the class with `@inject()`. |
| [`E_CIRCULAR_DEPENDENCY`](/en/reference/errors#e-circular-dependency) | Circular dependency (or circular alias) detected during resolution. Use explicit factories or decouple via events. |
| [`E_CONTAINER_MISSING_METADATA`](/en/reference/errors#e-container-missing-metadata) | A class declares constructor parameters but the container finds no dependency metadata for them. Enable decorator metadata, annotate the parameters with `@inject()`, or declare `static containerInjections`. |
| [`E_CONTAINER_RESERVED_TOKEN`](/en/reference/errors#e-container-reserved-token) | The token name reads as an `Object.prototype` key (`constructor`, `__proto__`…). Pick another name. |
| [`E_CONTAINER_MISSING_ASKS_FOR`](/en/reference/errors#e-container-missing-asks-for) | `container.when(...).provide()` was called before `asksFor()`: the contextual binding does not say which dependency it replaces. |
| [`E_CONTAINER_METHOD_NOT_CALLABLE`](/en/reference/errors#e-container-method-not-callable) | `container.call()` named a member of the instance that is not a method. |
| [`E_CONTAINER_INVALID_DECORATOR_TARGET`](/en/reference/errors#e-container-invalid-decorator-target) | `@Service()` or `@inject()` was put on something that is not a class (or, for `@inject()`, one of its methods). |

### Router

| Code | Raised when |
|---|---|
| [`E_ROUTE_NOT_FOUND`](/en/reference/errors#e-route-not-found) (404) | No route matches the requested method and path. The message is `Cannot GET:/path`. |
| [`E_DUPLICATE_ROUTE`](/en/reference/errors#e-duplicate-route) | Two routes declare the same method and path. |
| [`E_DUPLICATE_ROUTE_NAME`](/en/reference/errors#e-duplicate-route-name) | Two routes carry the same name. |
| [`E_MISSING_ROUTE_NAME`](/en/reference/errors#e-missing-route-name) | A named group prefixes a route that has no name of its own. Name every route of a named group. |
| [`E_INVALID_ROUTE_DOMAIN`](/en/reference/errors#e-invalid-route-domain) | A route domain has a parameter without a name, or the same parameter twice. |
| [`E_UNREGISTERED_CONTROLLER`](/en/reference/errors#e-unregistered-controller) | A route names a controller by string that is not registered. |
| [`E_NO_VIEW_ENGINE`](/en/reference/errors#e-no-view-engine) | `router.on(path).render()` was used and no template engine is installed. |
| [`E_VALIDATOR_NOT_FOUND`](/en/reference/errors#e-validator-not-found) | A route names a validator that is not registered. |
| [`E_INVALID_CONTROLLER_REFERENCE`](/en/reference/errors#e-invalid-controller-reference) | A route handler string is not of the form `'Controller.method'`. |
| [`E_INVALID_RESOURCE_NAME`](/en/reference/errors#e-invalid-resource-name) | `router.resource()` was given an empty name. |
| [`E_CONTROLLER_METHOD_NOT_FOUND`](/en/reference/errors#e-controller-method-not-found) | The controller a route names has no such method. Answered with 500. |
| [`E_CANNOT_LOOKUP_ROUTE`](/en/reference/errors#e-cannot-lookup-route) (500) | `urlFor()`, `findOrFail()` or the test client's `visit()` named a route that does not exist. |
| [`E_MISSING_ROUTE_PARAMS`](/en/reference/errors#e-missing-route-params) | A URL was built for a route without one of its required parameters. |

### WebSocket

| Code | Raised when |
|---|---|
| [`E_WEBSOCKET_UPGRADE_REQUIRED`](/en/reference/errors#e-websocket-upgrade-required) (426) | A plain request reached a WebSocket route. |
| [`E_WEBSOCKET_UNSUPPORTED`](/en/reference/errors#e-websocket-unsupported) (501) | A WebSocket route was reached on a server that cannot hold WebSockets. |
| [`E_WEBSOCKET_BAD_HANDSHAKE`](/en/reference/errors#e-websocket-bad-handshake) (400) | The handshake is not an HTTP/1.1 GET, lacks `Connection: upgrade`, or its `Sec-WebSocket-Key` is not 16 bytes. Answered by the server, before routing. |
| [`E_WEBSOCKET_VERSION`](/en/reference/errors#e-websocket-version) (426) | A WebSocket version other than 13. Answered with `Sec-WebSocket-Version: 13`, before routing. |
| [`E_WEBSOCKET_ORIGIN`](/en/reference/errors#e-websocket-origin) (403) | A browser origin that `http.webSocket.allowedOrigins` does not allow (same origin by default). Answered before routing. |
| [`E_WEBSOCKET_PROTOCOL`](/en/reference/errors#e-websocket-protocol) (500) | `socket.acceptProtocol()` named a subprotocol the client did not offer. |
| [`E_WEBSOCKET_NOT_REGISTERED`](/en/reference/errors#e-websocket-not-registered) (500) | A response was `101` without a registered socket. |
| [`E_WEBSOCKET_NOT_UPGRADE`](/en/reference/errors#e-websocket-not-upgrade) (500) | A `101` answered a request that was not a WebSocket handshake. |
| [`E_WEBSOCKET_REGISTER`](/en/reference/errors#e-websocket-register) | The native server refused a fresh socket id. |
| [`E_WEBSOCKET_CONTEXT`](/en/reference/errors#e-websocket-context) | A WebSocket route's handler ran without its socket (called outside the kernel). |
| [`E_WEBSOCKET_CLOSE_CODE`](/en/reference/errors#e-websocket-close-code) | `socket.close()` with a code a close frame may not carry (RFC 6455 §7.4). |
| [`E_WEBSOCKET_CLOSE_REASON`](/en/reference/errors#e-websocket-close-reason) | A close reason over 123 bytes. |
| [`E_INVALID_WEBSOCKET_CONFIG`](/en/reference/errors#e-invalid-websocket-config) | A native WebSocket limit of 0 bytes. |
| [`E_TEST_CLIENT_WEBSOCKET_REFUSED`](/en/reference/errors#e-test-client-websocket-refused) | The test client's WebSocket handshake was refused (its `status` and `body` are the application's answer) or failed. |

### Middleware pipeline

| Code | Raised when |
|---|---|
| [`E_PIPELINE_UNKNOWN_MIDDLEWARE`](/en/reference/errors#e-pipeline-unknown-middleware) | A route references a named middleware that is not registered. Register it with `middleware.register()`. |
| [`E_MIDDLEWARE_NOT_FOUND`](/en/reference/errors#e-middleware-not-found) | A named middleware could not be resolved when the pipeline was built. Register it with `middleware.register()`. |
| [`E_MIDDLEWARE_ENTRY`](/en/reference/errors#e-middleware-entry) | A middleware entry with no declared parameters was read as a lazy import, and it did not resolve to a module with a default export. |
| [`E_PIPELINE_DOUBLE_NEXT`](/en/reference/errors#e-pipeline-double-next) | A middleware called `next()` more than once. Each middleware should call `next()` at most once. |
| [`E_PIPELINE_ERROR`](/en/reference/errors#e-pipeline-error) | A handler threw an error that carries no framework code. The error keeps the stage position in its context. |
| [`E_VALIDATOR_UNUSABLE`](/en/reference/errors#e-validator-unusable) | A route validator exposes none of `validateResultAsync()`, `validateResult()` or `validate()`. |

### HTTP

| Code | Raised when |
|---|---|
| [`E_UNKNOWN`](/en/reference/errors#e-unknown) (500) | The code the exception handler reports for a thrown value that carries none. |
| [`E_RUNTIME_EXCEPTION`](/en/reference/errors#e-runtime-exception) (500) | `RuntimeException`: a failure of the program, not of the request. |
| [`E_INVALID_ARGUMENTS_EXCEPTION`](/en/reference/errors#e-invalid-arguments-exception) (500) | `InvalidArgumentsException`: a function was called with arguments it cannot use. |
| [`E_HTTP_EXCEPTION`](/en/reference/errors#e-http-exception) (varies) | A generic HTTP error carrying the response `body`. `E_HTTP_EXCEPTION.invoke(body, status, code?)` builds one: the message is a string body, or the `message` of an object body. |
| [`E_HTTP_REQUEST_ABORTED`](/en/reference/errors#e-http-request-aborted) (400) | The class `response.abort()` (or `abortIf` / `abortUnless`) throws; the body given is sent with the status given, 400 by default. It extends `E_HTTP_EXCEPTION` and carries its code. |
| [`E_UNAUTHORIZED_ACCESS`](/en/reference/errors#e-unauthorized-access-ream) (401) | A route's `.auth()` guard refused the request, or `.role()` / `.permission()` found no authenticated user. The same code, status, message (`Unauthorized access`), `identifier`, `getResponseMessage` and `handle` as `@c9up/warden`'s: it renders itself as `401 { "error": { "code", "message" } }`. |
| [`E_AUTHORIZATION_FAILURE`](/en/reference/errors#e-authorization-failure-ream) (403) | A route's `.role()` or `.permission()` refused an authenticated user. The same code, status, message (`Access denied`), `identifier`, `getResponseMessage` and `handle` as `@c9up/warden`'s: it renders itself by content negotiation, `{ "errors": [{ "message" }] }` for JSON, a JSON:API error object, the message as text for HTML, a denied form submission with a session redirected back with the message flashed. The roles and permissions asked for are not sent. |
| [`E_VALIDATION_ERROR`](/en/reference/errors#e-validation-error) (422) | The request data failed validation. The message is `Validation failure`, `messages` carries one entry per field and rule; a browser form is redirected back with the errors flashed. |
| [`E_REQUEST_ENTITY_TOO_LARGE`](/en/reference/errors#e-request-entity-too-large) (413) | The request body is over the body parser's limit. Reading the raw body of such a request raises it too. |
| [`E_HANDLER_FAILURE`](/en/reference/errors#e-handler-failure) (500) | The exception handler itself threw while rendering an error. |
| [`E_HTTP_CONTEXT_NOT_FOUND`](/en/reference/errors#e-http-context-not-found) | `HttpContext.getOrFail()` was called outside a request, or with ambient-context tracking turned off. Pass `ctx` explicitly. |
| [`E_RESPONSE_TOO_LARGE`](/en/reference/errors#e-response-too-large) | A response body is over the configured ceiling. Bodies are held whole in memory, so a large file should be streamed or served from storage. |
| [`E_BODYPARSER_CONFIG`](/en/reference/errors#e-bodyparser-config) | The body parser config uses an option that is no longer supported. |
| [`E_BODYPARSER_INVALID_SIZE`](/en/reference/errors#e-bodyparser-invalid-size) | A body size limit is neither a number of bytes nor a size such as `'1mb'`. |
| [`E_ENCODING_UNSUPPORTED`](/en/reference/errors#e-encoding-unsupported) (415) | A JSON, form or text body arrives with a `Content-Encoding` other than `identity`. The body parser does not inflate bodies, gzip and deflate included. |
| [`E_BODYPARSER_INVALID_JSON`](/en/reference/errors#e-bodyparser-invalid-json) (400 / 422) | A JSON body is malformed (400), or under `json.strict` is neither an object nor an array (422). |
| [`E_HTTP_REQUEST_TIMEOUT`](/en/reference/errors#e-http-request-timeout) (408) | The native server did not receive the request body in time. |
| [`E_REQUEST_ABORTED`](/en/reference/errors#e-request-aborted) (400) | The client closed the connection while the body was being read. |
| [`E_INVALID_MULTIPART_REQUEST`](/en/reference/errors#e-invalid-multipart-request) (400) | A `multipart/form-data` body is malformed, or its `boundary` parameter is missing. |
| [`E_PATH_TRAVERSAL`](/en/reference/errors#e-path-traversal) (400) | The native server found `..` in the path, raw or percent-encoded. |
| [`E_PARAMETER_POLLUTION`](/en/reference/errors#e-parameter-pollution) (400) | The native server found a query-string key twice. |
| [`E_TOO_MANY_REQUESTS`](/en/reference/errors#e-too-many-requests) (429) | The native server's rate limit refused the request; the body carries `retryAfter`, with `Retry-After` and `X-RateLimit-*` headers. |
| [`E_STREAM_UNKNOWN`](/en/reference/errors#e-stream-unknown) (500) | A server-sent event stream id is unknown to the server. |
| [`E_RESPONSE_INVALID_HEADER`](/en/reference/errors#e-response-invalid-header) | A header name or value carries CR, LF or NUL, which would split the response. |
| [`E_RESPONSE_INVALID_COOKIE`](/en/reference/errors#e-response-invalid-cookie) | Cookie options a browser rejects: `sameSite: true`, `SameSite=None` or `partitioned` without `secure`, or an invalid `expires` date. |
| [`E_RESPONSE_NO_CONTEXT`](/en/reference/errors#e-response-no-context) | `response.redirect()` on a response built outside a request. |
| [`E_RESPONSE_SSE_UNSUPPORTED`](/en/reference/errors#e-response-sse-unsupported) | `response.sse()` on a server that has no stream backend. |
| [`E_REDIRECT_NO_ROUTER`](/en/reference/errors#e-redirect-no-router) | `redirect().toRoute()` with no route URL resolver wired. |
| [`E_STREAM_REGISTER`](/en/reference/errors#e-stream-register) | The server refused a fresh server-sent event stream id. |
| [`E_MULTIPART_UNSAFE_FILE_NAME`](/en/reference/errors#e-multipart-unsafe-file-name) | `file.move()` was given, or derived from the client's file name, a name that is not a plain file name. |
| [`E_MULTIPART_FILE_EXISTS`](/en/reference/errors#e-multipart-file-exists) | `file.move()` found a file at the destination and `overwrite` is off. |
| [`E_TEST_CLIENT_NO_ROUTE_MANIFEST`](/en/reference/errors#e-test-client-no-route-manifest) | The test client's `visit()` needs `routes: router.namedManifest()` in the client options. |
| [`E_TEST_CLIENT_TIMEOUT`](/en/reference/errors#e-test-client-timeout) | A test client request, or a test WebSocket message, did not arrive within its timeout. |
| [`E_TEST_CLIENT_MISSING_CSRF_TOKEN`](/en/reference/errors#e-test-client-missing-csrf-token) | `withCsrf()` was called with no token and no CSRF cookie set. |
| [`E_TEST_CLIENT_NO_AUTH_STRATEGY`](/en/reference/errors#e-test-client-no-auth-strategy) | `withAuth()` or `asUser()` was used without an `auth` strategy in the client options. |
| [`E_TEST_CLIENT_NO_SESSION_SEEDER`](/en/reference/errors#e-test-client-no-session-seeder) | `loginAs()` with a session guard, and no `sessionSeeder` in the client options. |
| [`E_TEST_CLIENT_UNKNOWN_SERIALIZER`](/en/reference/errors#e-test-client-unknown-serializer) | `serialize()` named a serializer that is not registered. |
| [`E_TEST_CLIENT_ASSERTION_FAILED`](/en/reference/errors#e-test-client-assertion-failed) | An assertion of the test client's response failed. |

### Sessions

| Code | Raised when |
|---|---|
| [`E_SESSION_NOT_READY`](/en/reference/errors#e-session-not-ready) (500) | `session.<method>()` needs a session store, and this session was built without one. |
| [`E_SESSION_STORE_NOT_CONFIGURED`](/en/reference/errors#e-session-store-not-configured) (500) | The session config names no store. Set `store`, or `store: 'memory'` for sessions kept in this process only. |
| [`E_SESSION_STORE_NOT_CONDITIONAL`](/en/reference/errors#e-session-store-not-conditional) (500) | The store has no `update()`, so it cannot write a session back only while it still exists; a request running across a logout could sign the user in again. |
| [`E_SESSION_TAGGING_NOT_SUPPORTED`](/en/reference/errors#e-session-tagging-not-supported) (500) | A session tagging method was called on a store that does not support it. Use the memory, redis or database store. |
| [`E_SESSION_COOKIE_NOT_HTTP_ONLY`](/en/reference/errors#e-session-cookie-not-http-only) (500) | The session cookie is configured with `httpOnly: false`. Remove it: a script able to read the cookie turns any XSS into an account takeover. |
| [`E_SESSION_TEMPLATE_ENGINE_UNUSABLE`](/en/reference/errors#e-session-template-engine-unusable) | The template engine is installed but the session tags cannot be registered on it. |
| [`E_SESSION_MISSING_SECRET`](/en/reference/errors#e-session-missing-secret) | The cookie session store has no secret. |
| [`E_SESSION_MISSING_LOCATION`](/en/reference/errors#e-session-missing-location) | The file session store has no `location`. |
| [`E_SESSION_INVALID_CONNECTION`](/en/reference/errors#e-session-invalid-connection) | The database session store's `connection` lacks `query()` and `execute()`. |
| [`E_SESSION_UNKNOWN_DRIVER`](/en/reference/errors#e-session-unknown-driver) | The session config names a driver that does not exist. |
| [`E_SESSION_INVALID_GC_PROBABILITY`](/en/reference/errors#e-session-invalid-gc-probability) | `gcProbability` is not a percentage between 0 and 100. |
| [`E_SESSION_INVALID_TABLE_NAME`](/en/reference/errors#e-session-invalid-table-name) | The session table name is not a plain identifier. |
| [`E_SESSION_FILE_LOCKED`](/en/reference/errors#e-session-file-locked) | Another request kept the session file locked longer than the store waits. |
| [`E_SESSION_QUASAR_MISSING`](/en/reference/errors#e-session-quasar-missing) | A Redis session store names a quasar connection and `@c9up/quasar` is not installed. |
| [`E_SESSION_INCOMPLETE_CONNECTION`](/en/reference/errors#e-session-incomplete-connection) | The quasar connection lacks the commands a session store sends. |

### Application, env and Ignitor

| Code | Raised when |
|---|---|
| [`E_INVALID_ENV_VARIABLES`](/en/reference/errors#e-invalid-env-variables) | `Env.create()` found environment variables that fail their schema. The message is `Validation failed for one or more environment variables`; `help` lists each one on a `- ` line, and `failures` holds them. |
| [`E_MISSING_ENCRYPTER_KEY`](/en/reference/errors#e-missing-encrypter-key) | Encryption, a signed cookie or a signed URL was used and `APP_KEY` is not set. `help` names what needed it. |
| [`E_INSECURE_ENCRYPTER_KEY`](/en/reference/errors#e-insecure-encrypter-key) | `APP_KEY` is shorter than 16 characters, or is a key known from scaffolding or documentation. |
| [`E_REAMRC_UNKNOWN_OPTION`](/en/reference/errors#e-reamrc-unknown-option) | `reamrc.ts` `tests` holds an option that does not exist. |
| [`E_MISSING_PROVIDER_FILE`](/en/reference/errors#e-missing-provider-file) | A `reamrc.ts` `providers` entry has no `file`. |
| [`E_INVALID_PROVIDER`](/en/reference/errors#e-invalid-provider) | A `reamrc.ts` `providers` entry has a `file` that is not a function. A provider module with no default export, or whose default export is not a class, raises `E_RUNTIME_EXCEPTION`. |
| [`E_MISSING_PRELOAD_FILE`](/en/reference/errors#e-missing-preload-file) | A `reamrc.ts` `preloads` entry has no `file`. |
| [`E_INVALID_PRELOAD_FILE`](/en/reference/errors#e-invalid-preload-file) | A `reamrc.ts` `preloads` entry has a `file` that is not a function. |
| [`E_IGNITOR_ALREADY_STARTED`](/en/reference/errors#e-ignitor-already-started) | `warmUp()` was called while the application was already past that phase. |
| [`E_IGNITOR_WARMUP_ONLY`](/en/reference/errors#e-ignitor-warmup-only) | An application assembled with `warmUp()` was started. Build a fresh Ignitor to run one. |
| [`E_IGNITOR_INVALID_PORT`](/en/reference/errors#e-ignitor-invalid-port) | `PORT` is not an integer between 0 and 65535. |
| [`E_IGNITOR_INVALID_HTTP_CONFIG`](/en/reference/errors#e-ignitor-invalid-http-config) | An `http.<key>` limit is not a whole number in range. |
| [`E_IGNITOR_NO_SERVER_FACTORY`](/en/reference/errors#e-ignitor-no-server-factory) | `httpServer()` was called with no `serverFactory` in the config. |
| [`E_IGNITOR_GRPC_UNSUPPORTED`](/en/reference/errors#e-ignitor-grpc-unsupported) | A gRPC handler is registered, but this server cannot serve gRPC. |
| [`E_SERVER_GRPC_ALREADY_SET`](/en/reference/errors#e-server-grpc-already-set) | A second gRPC handler was registered on the server. |
| [`E_SERVER_GRPC_INVALID_LIMIT`](/en/reference/errors#e-server-grpc-invalid-limit) | A gRPC message size limit is not a whole number of bytes, or `-1` for no limit. |
| [`E_REAM_STUB_SYNTAX`](/en/reference/errors#e-ream-stub-syntax) | A stub template has a syntax error. |
| [`E_ENV_FILE_NOT_FOUND`](/en/reference/errors#e-env-file-not-found) | A `.env` value `file:<path>` names a file that does not exist. The message names the variable and the path. |
| [`E_ENV_CIRCULAR_REFERENCE`](/en/reference/errors#e-env-circular-reference) | `.env` values reference each other in a loop (`A=$B`, `B=$A`). |
| [`E_IDENTIFIER_ALREADY_DEFINED`](/en/reference/errors#e-identifier-already-defined) (500) | `Env.defineIdentifier()` was given a name already registered (`file` is built in). Use `defineIdentifierIfMissing()` or remove the identifier first. |
| [`E_APP_MISSING_IMPORTER`](/en/reference/errors#e-app-missing-importer) | `app.import()` / `app.importDefault(id)` was called on an application built without an `importer`. |
| [`E_DUMP_DIE_EXCEPTION`](/en/reference/errors#e-dump-die-exception) (500) | `dd()` stopped the request (answered with an HTML dump) or the command (printed the dump). Never reported. |
| [`E_APP_ALREADY_BOOTED`](/en/reference/errors#e-app-already-booted) | `app.setMode()` or `app.setEnvironment()` was called after the application booted. |
| [`E_APP_ROOT_NOT_SET`](/en/reference/errors#e-app-root-not-set) | `app.makePath()` (or another path helper) on an application with no root. |
| [`E_APP_MISSING_DEFAULT_EXPORT`](/en/reference/errors#e-app-missing-default-export) | A lazily imported module (`app.importDefault()`, a lazy listener) has no default export. |
| [`E_APP_SHUTDOWN_FAILED`](/en/reference/errors#e-app-shutdown-failed) | Several terminating or shutdown hooks failed; `errors` holds each failure. |
| [`E_SERVICE_NOT_BOOTED`](/en/reference/errors#e-service-not-booted) | A `@c9up/ream/services/*` accessor, `urlFor()` or `signedUrlFor()` was used before the application booted it. |
| [`E_ENV_PATH_NO_FILE`](/en/reference/errors#e-env-path-no-file) | `ENV_PATH` names a directory that holds none of the `.env` files. |
| [`E_MIGRATION_SOURCE_CONFLICT`](/en/reference/errors#e-migration-source-conflict) | Two providers registered a migration source under the same name. |
| [`E_INVALID_DURATION`](/en/reference/errors#e-invalid-duration) | A duration (a session age, a cookie `maxAge`, a signed URL expiry…) is neither a number nor a string such as `'30m'`. |
| [`E_BASE64_MALFORMED`](/en/reference/errors#e-base64-malformed) | `base64.decode()` or `base64.urlDecode()` in strict mode met a malformed value. |
| [`E_HEALTH_INVALID_THRESHOLD`](/en/reference/errors#e-health-invalid-threshold) | A memory health check threshold is not a byte size, or not a percentage between 0 and 100. |
| [`E_REAM_STUB_NOT_FOUND`](/en/reference/errors#e-ream-stub-not-found) | No stub at the given path. |
| [`E_REAM_STUB_UNSAFE_PATH`](/en/reference/errors#e-ream-stub-unsafe-path) | A stub path, or the destination a stub declares, is absolute or leaves its root. |
| [`E_REAM_STUB_NO_DESTINATION`](/en/reference/errors#e-ream-stub-no-destination) | A stub declares no destination (no `to:` front-matter line), or an empty one. |
| [`E_REAM_STUB_FORBIDDEN_KEY`](/en/reference/errors#e-ream-stub-forbidden-key) | A stub template reads or sets a key it may not reach (`constructor`, `__proto__`…). A `TypeError`. |
| [`E_REAM_STUB_EVALUATION`](/en/reference/errors#e-ream-stub-evaluation) | A stub template failed while rendering: an unknown name, a property of nothing, a call to what is not a function, `{{#each}}` over what is not a list. A `TypeError` or a `ReferenceError`. |
| [`E_CODEMODS_FILE_NOT_FOUND`](/en/reference/errors#e-codemods-file-not-found) | A codemod needs `reamrc.ts`, `start/kernel.ts` or `start/env.ts` and the file does not exist. |
| [`E_CODEMODS_UNRECOGNIZED_SOURCE`](/en/reference/errors#e-codemods-unrecognized-source) | A codemod could not find what it edits in the file (`providers: [`, `defineConfig({ ... })`, `router.use([`, `Env.create(...)`…). Make the change by hand. |
| [`E_CODEMODS_UNSAFE_PATH`](/en/reference/errors#e-codemods-unsafe-path) | A codemod was asked to write outside the project: an absolute path, `..`, a symlink that resolves outside, or an unsafe module path. |
| [`E_CODEMODS_INVALID_OPTION`](/en/reference/errors#e-codemods-invalid-option) | A codemod option is out of range: a middleware `position` or `tier`, a preload environment. |
| [`E_CODEMODS_INVALID_ENV_VARIABLE`](/en/reference/errors#e-codemods-invalid-env-variable) | An environment variable name is not an identifier, or its value holds a line break. |
| [`E_CODEMODS_INVALID_ENV_VALIDATION`](/en/reference/errors#e-codemods-invalid-env-validation) | `defineEnvValidations()` was given a comment over one line, or a rule that is not one complete expression. |
| [`E_CODEMODS_MIDDLEWARE_CONFLICT`](/en/reference/errors#e-codemods-middleware-conflict) | A middleware is already registered in the other tier of `start/kernel.ts`. |
| [`E_REAM_INTERNAL`](/en/reference/errors#e-ream-internal) | An invariant inside `@c9up/ream` broke; a bug to report. |
| [`E_REAM_NAPI_UNSUPPORTED_PLATFORM`](/en/reference/errors#e-ream-napi-unsupported-platform) | No prebuilt native binary (scheduler, event bus, GraphQL) exists for this platform. |
| [`E_REAM_NAPI_LOAD_FAILED`](/en/reference/errors#e-ream-napi-load-failed) | A native binary exists but cannot be loaded; `cause` is the loader's error. |
| [`E_REAM_NAPI_NOT_FOUND`](/en/reference/errors#e-ream-napi-not-found) | A native binary is not found. |

### Console

| Code | Raised when |
|---|---|
| [`E_CONSOLE_COMMAND_NOT_FOUND`](/en/reference/errors#e-console-command-not-found) | No command has this name. |
| [`E_CONSOLE_MISSING_ARGUMENT`](/en/reference/errors#e-console-missing-argument) | A required argument was not given. |
| [`E_CONSOLE_MISSING_ARGUMENT_VALUE`](/en/reference/errors#e-console-missing-argument-value) | An argument was given with no value. |
| [`E_CONSOLE_UNEXPECTED_ARGUMENT`](/en/reference/errors#e-console-unexpected-argument) | More arguments than the command declares. |
| [`E_CONSOLE_UNKNOWN_FLAG`](/en/reference/errors#e-console-unknown-flag) | A flag the command does not declare. |
| [`E_CONSOLE_MISSING_FLAG`](/en/reference/errors#e-console-missing-flag) | A required flag was not given. |
| [`E_CONSOLE_MISSING_FLAG_VALUE`](/en/reference/errors#e-console-missing-flag-value) | A flag that takes a value was given without one. |
| [`E_CONSOLE_INVALID_FLAG_VALUE`](/en/reference/errors#e-console-invalid-flag-value) | A flag value of the wrong type. |
| [`E_CONSOLE_INVALID_FLAG_GROUP`](/en/reference/errors#e-console-invalid-flag-group) | Short flags were grouped (`-abc`) with one that cannot be grouped. |
| [`E_CONSOLE_NOT_INTERACTIVE`](/en/reference/errors#e-console-not-interactive) | A command asked a question while stdin is not interactive. Pass the value as a flag. |
| [`E_CONSOLE_PROMPT_CANCELLED`](/en/reference/errors#e-console-prompt-cancelled) | The user cancelled a prompt. |
| [`E_CONSOLE_EMPTY_CHOICES`](/en/reference/errors#e-console-empty-choices) | A choice prompt was asked with no options. |
| [`E_CONSOLE_INVALID_TRAP_VALUE`](/en/reference/errors#e-console-invalid-trap-value) | A scripted answer (a prompt trap in a test) was rejected by the prompt's own validation. |
| [`E_CONSOLE_TRAP_OUT_OF_RANGE`](/en/reference/errors#e-console-trap-out-of-range) | A prompt trap chose an option that was not offered. |
| [`E_CONSOLE_DUPLICATE_COMMAND`](/en/reference/errors#e-console-duplicate-command) | Two commands claim the same name. |
| [`E_CONSOLE_INVALID_COMMAND`](/en/reference/errors#e-console-invalid-command) | An entry of `reamrc.ts` `commands` is neither a command loader nor a default-exported command class. |
| [`E_CONSOLE_INVALID_COMMAND_METADATA`](/en/reference/errors#e-console-invalid-command-metadata) | A command loader exported metadata that does not describe a command. |
| [`E_CONSOLE_INVALID_ARGUMENT`](/en/reference/errors#e-console-invalid-argument) | A command declares its arguments in an order that cannot be parsed: an argument after a spread one, or a required one after an optional one. |
| [`E_CONSOLE_INVALID_ALIAS`](/en/reference/errors#e-console-invalid-alias) | A command alias expands to nothing. |
| [`E_CONSOLE_LATE_GLOBAL_FLAG`](/en/reference/errors#e-console-late-global-flag) | A global flag was declared after the kernel started. |
| [`E_CONSOLE_LATE_LOADER`](/en/reference/errors#e-console-late-loader) | A command loader was added after the kernel started. |
| [`E_CONSOLE_KERNEL_RUNNING`](/en/reference/errors#e-console-kernel-running) | A command is already running through this kernel. |
| [`E_CONSOLE_KERNEL_COMPLETED`](/en/reference/errors#e-console-kernel-completed) | The kernel has finished; it cannot run another command line. |
| [`E_CONSOLE_NOT_BOOTED`](/en/reference/errors#e-console-not-booted) | A console application method was called before the commands were loaded. |
| [`E_CONSOLE_NO_APP`](/en/reference/errors#e-console-no-app) | A command needs the application and the kernel has none. Dispatch through the Ignitor's console kernel. |
| [`E_CONSOLE_APP_NOT_STARTED`](/en/reference/errors#e-console-app-not-started) | A command used the application without declaring `startApp: true` in its options. |
| [`E_CONSOLE_ASSERTION_FAILED`](/en/reference/errors#e-console-assertion-failed) | An assertion on a command run in a test failed (`assertSucceeded()`, `assertLog()`, `assertTableRows()`…). |

### Scheduler

| Code | Raised when |
|---|---|
| [`E_SCHEDULE_INVALID_CRON`](/en/reference/errors#e-schedule-invalid-cron) | A scheduled task's cron expression could not be registered. |
| [`E_SCHEDULE_INVALID_TARGET`](/en/reference/errors#e-schedule-invalid-target) | `@Schedule` was put on a static method. |
| [`E_SCHEDULE_SYMBOL_METHOD`](/en/reference/errors#e-schedule-symbol-method) | `@Schedule` was put on a symbol-keyed method. |
| [`E_SCHEDULE_ANONYMOUS_CLASS`](/en/reference/errors#e-schedule-anonymous-class) | An anonymous class declares `@Schedule`; its task names would collide. |
| [`E_SCHEDULE_METHOD_NOT_FOUND`](/en/reference/errors#e-schedule-method-not-found) | A scheduled method is not callable on the instance the container resolved. |
| [`E_SCHEDULE_INVALID_CALLBACK`](/en/reference/errors#e-schedule-invalid-callback) | `Scheduler.register()` was given something other than a function. |
| [`E_SCHEDULE_INVALID_TASK_NAME`](/en/reference/errors#e-schedule-invalid-task-name) | `Scheduler.register()` was given an empty task name. |
| [`E_SCHEDULE_INVALID_LOCK_BACKEND`](/en/reference/errors#e-schedule-invalid-lock-backend) | `lockBackend` does not implement `acquire(name, ttlMs)` and `release(name)`. |
| [`E_SCHEDULE_INVALID_LOCK_TTL`](/en/reference/errors#e-schedule-invalid-lock-ttl) | `defaultLockTtlMs` is not a finite positive number. |
| [`E_SCHEDULE_INVALID_EVENT_SINK`](/en/reference/errors#e-schedule-invalid-event-sink) | `eventSink` does not implement `emit(event)`. |
| [`E_SCHEDULE_INVALID_ERROR_REPORTER`](/en/reference/errors#e-schedule-invalid-error-reporter) | `errorReporter` is not a function. |
| [`E_SCHEDULE_TASK_UNKNOWN`](/en/reference/errors#e-schedule-task-unknown) | `runTaskNow()` named a task that is not registered. |
| [`E_SCHEDULE_TASK_TIMEOUT`](/en/reference/errors#e-schedule-task-timeout) | A task did not complete within its `timeoutMs`; it keeps running in the background. |
| [`E_SCHEDULE_PROVIDER_ALREADY_REGISTERED`](/en/reference/errors#e-schedule-provider-already-registered) | The scheduler provider was registered twice on the same container. |
| [`E_SCHEDULER_NATIVE_ERROR`](/en/reference/errors#e-scheduler-native-error) | A call into the native scheduler failed. |
| [`E_SCHEDULER_INVALID_CRON`](/en/reference/errors#e-scheduler-invalid-cron) | The native scheduler refused a cron expression. |
| [`E_SCHEDULER_CRON_NO_FIRE`](/en/reference/errors#e-scheduler-cron-no-fire) | The native scheduler refused a cron expression that never fires. |
| [`E_SCHEDULER_DUPLICATE_TASK`](/en/reference/errors#e-scheduler-duplicate-task) | The native scheduler already has a task of that name. |
| [`E_SCHEDULE_QUASAR_MISSING`](/en/reference/errors#e-schedule-quasar-missing) | The scheduler lock names a quasar connection and `@c9up/quasar` is not installed. |
| [`E_SCHEDULE_INCOMPLETE_CONNECTION`](/en/reference/errors#e-schedule-incomplete-connection) | The quasar connection lacks the commands a scheduler lock sends. |

### Events

| Code | Raised when |
|---|---|
| [`E_EVENTS_UNSUPPORTED_STORE`](/en/reference/errors#e-events-unsupported-store) | `config/events.ts` names a `store` other than `'memory'`, the only one this build has. |
| [`E_EVENTS_UNSUPPORTED_OPTION`](/en/reference/errors#e-events-unsupported-option) | `config/events.ts` holds an option nothing reads (`retries` included), or is not an object. |
| [`E_EVENTS_MISSING_LISTENER_METHOD`](/en/reference/errors#e-events-missing-listener-method) | A listener class has no method of the name the listener was registered with. |
| [`E_EVENTS_INVALID_ARGUMENT`](/en/reference/errors#e-events-invalid-argument) | `onAny()` without a listener, or `waitForChain()` with no event names. |
| [`E_EVENTS_ASSERTION_FAILED`](/en/reference/errors#e-events-assertion-failed) | An event assertion failed (`assertEmitted()`, `assertNotEmitted()`, on the helpers or the `FakeBus`). |
| [`E_EVENTS_TIMEOUT`](/en/reference/errors#e-events-timeout) | An awaited event, event chain or fake request reply did not arrive within its timeout. |
| [`E_EVENTS_DUPLICATE_REQUEST_HANDLER`](/en/reference/errors#e-events-duplicate-request-handler) | `FakeBus.onRequest()` was given a second handler for the same name. |
| [`E_EVENTS_NO_REQUEST_HANDLER`](/en/reference/errors#e-events-no-request-handler) | `FakeBus.request()` named a request no handler answers. |

### RPC and GraphQL

| Code | Raised when |
|---|---|
| [`E_RPC_INVALID_METHOD_NAME`](/en/reference/errors#e-rpc-invalid-method-name) | An RPC method name is empty or not a string. |
| [`E_RPC_RESERVED_METHOD_NAME`](/en/reference/errors#e-rpc-reserved-method-name) | An RPC method takes a reserved name (`rpc.*`). |
| [`E_RPC_UNKNOWN_CONTROLLER_METHOD`](/en/reference/errors#e-rpc-unknown-controller-method) | An RPC route names a controller method that does not exist. |
| [`E_RPC_PROVIDER_ALREADY_REGISTERED`](/en/reference/errors#e-rpc-provider-already-registered) | The RPC provider was registered twice on the same container. |
| [`E_GRAPHQL_PROVIDER_ALREADY_REGISTERED`](/en/reference/errors#e-graphql-provider-already-registered) | The GraphQL provider was registered twice on the same container. |
| [`E_GRAPHQL_SCHEMA_NOT_FOUND`](/en/reference/errors#e-graphql-schema-not-found) | The GraphQL `schemaPath` names a file that does not exist. |

### HTTP client

| Code | Raised when |
|---|---|
| [`E_HTTP_CLIENT_INVALID_URL`](/en/reference/errors#e-http-client-invalid-url) | The URL cannot be parsed, is not http or https, or carries credentials (send them in a header). |
| [`E_HTTP_CLIENT_PRIVATE_ADDRESS`](/en/reference/errors#e-http-client-private-address) | The host is, or resolves to, an address that is not public. |
| [`E_HTTP_CLIENT_UNREACHABLE`](/en/reference/errors#e-http-client-unreachable) | The host could not be reached. |
| [`E_HTTP_CLIENT_TIMED_OUT`](/en/reference/errors#e-http-client-timed-out) | The request did not complete within its timeout. |
| [`E_HTTP_CLIENT_TOO_LARGE`](/en/reference/errors#e-http-client-too-large) | The response body is over the size limit. |
| [`E_HTTP_CLIENT_REDIRECT_REFUSED`](/en/reference/errors#e-http-client-redirect-refused) | A redirect was refused: too many of them, from https to http, or to another host. |

Each one is a class of `errors`, a flare `Exception`: read `error.code`, or test `error instanceof errors.E_ROUTE_NOT_FOUND`. An error that says how to fix it carries the advice in `help`.

## Migration

- `ReamError`, `isReamError` and the module errors (`AtlasError`, `ContainerError`, `EventsError`, `ForgeError`, `PipelineError`, `RouterError`, `RuneError`, `WardenError`) are gone. Replace `isReamError(error, 'E_X')` and `instanceof ReamError` with `error instanceof errors.E_X` or a test on `error.code`. The advice that was in `hint` is in `help`; the data that was in `context` is on named fields (`E_CIRCULAR_DEPENDENCY.chain`, `E_RESPONSE_TOO_LARGE.bytes` and `ceiling`, `E_SCHEDULE_INVALID_CRON.task` and `cronExpr`…). `error.docsUrl` is `errorDocsUrl(error.code)`.
- The error classes are no longer exported one by one from `@c9up/ream`: `import { E_ROUTE_NOT_FOUND } from '@c9up/ream'` becomes `import { errors } from '@c9up/ream'` and `errors.E_ROUTE_NOT_FOUND`. `@c9up/ream/exceptions` still exports the HTTP exceptions by name.
- Renamed classes: `ShutdownError` is `errors.E_APP_SHUTDOWN_FAILED` (an `Exception` with `errors`, no longer an `AggregateError`); `EnvValidationException` and `EnvVarError` are `errors.E_INVALID_ENV_VARIABLES` (`failures` lists each variable); `HttpClientError` is one class per code, `errors.E_HTTP_CLIENT_*`, and `reason` is gone: read `error.code`; `WebSocketRefused` is `errors.E_TEST_CLIENT_WEBSOCKET_REFUSED`; `ExpectationError` is `errors.E_TEST_CLIENT_ASSERTION_FAILED`; `StubSyntaxError`, `StubTypeError` and `StubReferenceError` are `errors.E_REAM_STUB_SYNTAX`, `E_REAM_STUB_FORBIDDEN_KEY` and `E_REAM_STUB_EVALUATION`, and no longer extend `TypeError` or `ReferenceError`.
- `Exception`, `createError`, `RuntimeException` and `InvalidArgumentsException` are `@c9up/flare`'s. A `createError` class takes its placeholder values as an array: `new E_X('a', 'b')` becomes `new E_X(['a', 'b'])`. `InvalidArgumentsException` has the code `E_INVALID_ARGUMENTS_EXCEPTION` (was `E_INVALID_ARGUMENTS`) and no longer extends `RuntimeException`.
- Outside debug mode, the exception handler shows the message of a 5xx error only when it is flagged `expose: true`; being an `Exception` is no longer enough.
- The route guards raise the codes `@c9up/warden` raises: `E_UNAUTHORIZED` is now `E_UNAUTHORIZED_ACCESS` (401, `Unauthorized access`) and `E_FORBIDDEN` is now `E_AUTHORIZATION_FAILURE` (403, `Access denied`, without the `required` list). Both render themselves (`handle`), exactly as warden's errors of the same code do, so a refusal answers the same bytes whether a route guard or warden raised it: `401 { "error": { "code", "message" } }` for `E_UNAUTHORIZED_ACCESS`; for `E_AUTHORIZATION_FAILURE`, `{ "errors": [{ "message" }] }` for JSON, a JSON:API error object, the message as text for HTML, and a denied form submission with a session redirected back with the message flashed. Both carry an `identifier` (`errors.<CODE>`) through which `ctx.i18n` translates the message. `E_ROW_NOT_FOUND` is removed from `errors`: nothing in ream raised it; `@c9up/atlas` raises its own.
- `E_UNKNOWN_ROUTE` is now `E_CANNOT_LOOKUP_ROUTE` (500, `Cannot lookup route "<name>"`). The test client lists the manifest's names in `help`; `urlFor()` no longer lists the registered names.
- `E_ROUTE_NOT_FOUND` is a `createError` class: `new errors.E_ROUTE_NOT_FOUND([method, url])`, message `Cannot GET:/path`.
- `E_HTTP_EXCEPTION` carries `body` and is built with `E_HTTP_EXCEPTION.invoke(body, status, code?)`. `E_HTTP_REQUEST_ABORTED` extends it, and the error `response.abort()` throws has the code `E_HTTP_EXCEPTION`: test `error instanceof errors.E_HTTP_REQUEST_ABORTED` rather than its code.
- `E_MISSING_APP_KEY` is now `E_MISSING_ENCRYPTER_KEY` and `E_INSECURE_APP_KEY` is now `E_INSECURE_ENCRYPTER_KEY`. Their message is fixed; what needed the key is in `help`.
- `E_BAD_MULTIPART` is now `E_INVALID_MULTIPART_REQUEST`.
- The exception handler runs where an error is thrown, inside the middleware chain: the `next()` of the outer middleware returns normally, so their code after `await next()` runs (the session is saved, a flashed message survives). A `try { await next() } catch` around an inner layer no longer sees its errors.
- `E_INVALID_ENV_VARIABLES` has the message `Validation failed for one or more environment variables`; the failures are in `help`, one `- ` line each. `E_IDENTIFIER_ALREADY_DEFINED` is a `createError` class (`new E_IDENTIFIER_ALREADY_DEFINED([name])`) with status 500, and has no `identifier` field.
- A compressed JSON, form or text body (`Content-Encoding` other than `identity`) is refused with `E_ENCODING_UNSUPPORTED` (415) instead of being parsed as text.
- The native scheduler's codes carry the namespace: `INVALID_CRON` is `E_SCHEDULER_INVALID_CRON`, `CRON_NO_FIRE` is `E_SCHEDULER_CRON_NO_FIRE`, `DUPLICATE_TASK` is `E_SCHEDULER_DUPLICATE_TASK`; the native loader's `<PREFIX>_NAPI_NOT_FOUND`, `<PREFIX>_NAPI_LOAD_FAILED` and `<PREFIX>_UNSUPPORTED_PLATFORM` are `E_REAM_NAPI_NOT_FOUND`, `E_REAM_NAPI_LOAD_FAILED` and `E_REAM_NAPI_UNSUPPORTED_PLATFORM`.

## See also

- [Application](/en/guides/concepts/application)
- [Application lifecycle](/en/guides/concepts/lifecycle)
- [Dependency injection](/en/guides/concepts/dependency-injection)
- [Providers](/en/guides/concepts/providers)
- [The Codemods API](/en/guides/concepts/codemods)
- [Routing](/en/guides/basics/routing)
- [HTTP context](/en/guides/basics/http-context)
- [Request](/en/guides/basics/request)
- [Response](/en/guides/basics/response)
- [Middleware](/en/guides/basics/middleware)
- [Body parser](/en/guides/basics/body-parser)
- [File uploads](/en/guides/basics/file-uploads)
- [Exception handling](/en/guides/basics/exception-handling)
- [Static files](/en/guides/basics/static-files)
- [URL builder and signed URLs](/en/guides/basics/url-builder)
- [Encryption](/en/guides/security/encryption)
- [WebSockets](/en/guides/realtime/websockets)
- [JSON-RPC](/en/guides/apis/json-rpc)
- [GraphQL](/en/guides/apis/graphql)
- [OpenAPI](/en/guides/apis/openapi)
- [API resources](/en/guides/apis/resources)
- [Emitter](/en/guides/digging-deeper/emitter)
- [Scheduling](/en/guides/digging-deeper/scheduling)
- [Health checks](/en/guides/digging-deeper/health-checks)
- [HTTP client](/en/guides/digging-deeper/http-client)
- [Protobuf and gRPC](/en/guides/digging-deeper/grpc)
- [Creating commands](/en/guides/command-line/creating-commands)
- [HTTP tests](/en/guides/testing/http-tests)
- [ream-cli](/en/reference/ream-cli)
- [lumen](/en/reference/lumen)
- [Error index](/en/reference/errors)
