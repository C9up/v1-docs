# Error Codes

Every framework error carries a stable `code` that starts with `E_`. A package's
own codes add the package name (`E_ATLAS_EMPTY_SELECT`, `E_WARDEN_FORBIDDEN`); a
few shared identifiers keep a plain form (`E_ROW_NOT_FOUND`,
`E_UNAUTHORIZED_ACCESS`, `E_VALIDATION_ERROR`). Search for the code below.

The codes of `@c9up/ream` itself come first, then each package's, in
alphabetical order. The **HTTP** column gives the status the error answers
with; `—` means it is not an HTTP answer but an error raised to the caller
(configuration, programming or runtime).

## Error Format

Errors raised by the framework core (`ReamError`) print a diagnostic box in
development:

```
┌──────────────────────────────────────────────┐
│ [E_CONTAINER_NOT_FOUND] No binding found for 'mailer'. Did you mean 'mail'?
│
│ Hint: Register it with container.singleton() or decorate with @inject().
│ Docs: https://docs.ream.dev/errors/E_CONTAINER_NOT_FOUND
└──────────────────────────────────────────────┘
```

An error raised inside the request pipeline adds a `Pipeline: <n>/<total> (<stage>)`
line. In production mode, only the code and message are shown.

An HTTP error answers with `{ "error": { "code": "…", "message": "…" } }` and the
error's `status`.

## Container Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_CONTAINER_NOT_FOUND` | — | No binding found for the requested token. Includes "did you mean?" suggestions for typos. Register it with `container.singleton()` or decorate the class with `@inject()`. |
| `E_CIRCULAR_DEPENDENCY` | — | Circular dependency (or circular alias) detected during resolution. Use explicit factories or decouple via events. |
| `E_CONTAINER_MISSING_METADATA` | — | A class declares constructor parameters but the container finds no dependency metadata for them. Enable decorator metadata, annotate the parameters with `@inject()`, or declare `static containerInjections`. |
| `E_CONTAINER_RESERVED_TOKEN` | — | The token name reads as an `Object.prototype` key (`constructor`, `__proto__`…). Pick another name. |

## Router Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_ROUTE_NOT_FOUND` | 404 | No route matches the requested method and path. |
| `E_DUPLICATE_ROUTE` | — | Two routes declare the same method and path. |
| `E_DUPLICATE_ROUTE_NAME` | — | Two routes carry the same name. |
| `E_MISSING_ROUTE_NAME` | — | A named group prefixes a route that has no name of its own. Name every route of a named group. |
| `E_INVALID_ROUTE_DOMAIN` | — | A route domain has a parameter without a name, or the same parameter twice. |
| `E_UNREGISTERED_CONTROLLER` | — | A route names a controller by string that is not registered. |
| `E_NO_VIEW_ENGINE` | — | `router.on(path).render()` was used and no template engine is installed. |
| `E_VALIDATOR_NOT_FOUND` | — | A route names a validator that is not registered. |

## Pipeline Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_PIPELINE_UNKNOWN_MIDDLEWARE` | — | A route references a named middleware that is not registered. Register it with `middleware.register()`. |
| `E_MIDDLEWARE_NOT_FOUND` | — | A named middleware could not be resolved when the pipeline was built. Register it with `middleware.register()`. |
| `E_MIDDLEWARE_ENTRY` | — | A middleware entry with no declared parameters was read as a lazy import, and it did not resolve to a module with a default export. |
| `E_PIPELINE_DOUBLE_NEXT` | — | A middleware called `next()` more than once. Each middleware should call `next()` at most once. |
| `E_PIPELINE_ERROR` | — | A handler threw an error that carries no framework code. The error keeps the stage position in its context. |
| `E_VALIDATOR_UNUSABLE` | — | A route validator exposes none of `validateResultAsync()`, `validateResult()` or `validate()`. |

## HTTP Errors

Raised by `@c9up/ream`'s exceptions and its native HTTP server. The server's own refusals are answered before any middleware runs.

| Code | HTTP | Description |
|------|------|-------------|
| `E_UNKNOWN` | 500 | The default code of an `Exception` that sets none, and of an error rebuilt from the native layer without a code. |
| `E_RUNTIME_EXCEPTION` | 500 | `RuntimeException`: a failure of the program, not of the request. |
| `E_INVALID_ARGUMENTS` | 500 | `InvalidArgumentsException`: a function was called with arguments it cannot use. |
| `E_HTTP_EXCEPTION` | varies | A generic HTTP error that answers with the status it was built with. |
| `E_HTTP_REQUEST_ABORTED` | 400 | `response.abort()` (or `abortIf` / `abortUnless`) stopped the request; the body given is sent with the status given, 400 by default. |
| `E_UNAUTHORIZED` | 401 | The request is not authenticated. |
| `E_FORBIDDEN` | 403 | The request is authenticated but not allowed. |
| `E_ROW_NOT_FOUND` | 404 | A record that must exist was not found. |
| `E_VALIDATION_ERROR` | 422 | The request data failed validation. The body carries one message per field and rule; a browser form is redirected back with the errors flashed. |
| `E_REQUEST_ENTITY_TOO_LARGE` | 413 | The request body is over the body parser's limit. Reading the raw body of such a request raises it too. |
| `E_HANDLER_FAILURE` | 500 | The exception handler itself threw while rendering an error. |
| `E_HTTP_CONTEXT_NOT_FOUND` | — | `HttpContext.getOrFail()` was called outside a request, or with ambient-context tracking turned off. Pass `ctx` explicitly. |
| `E_RESPONSE_TOO_LARGE` | — | A response body is over the configured ceiling. Bodies are held whole in memory, so a large file should be streamed or served from storage. |
| `E_BODYPARSER_CONFIG` | — | The body parser config uses an option that is no longer supported. |
| `E_BODYPARSER_INVALID_SIZE` | — | A body size limit is neither a number of bytes nor a size such as `'1mb'`. |
| `E_HTTP_REQUEST_TIMEOUT` | 408 | The native server did not receive the request body in time. |
| `E_REQUEST_ABORTED` | 400 | The client closed the connection while the body was being read. |
| `E_BAD_MULTIPART` | 400 | A `multipart/form-data` body is malformed, or its `boundary` parameter is missing. |
| `E_PATH_TRAVERSAL` | 400 | The native server found `..` in the path, raw or percent-encoded. |
| `E_PARAMETER_POLLUTION` | 400 | The native server found a query-string key twice. |
| `E_TOO_MANY_REQUESTS` | 429 | The native server's rate limit refused the request; the body carries `retryAfter`, with `Retry-After` and `X-RateLimit-*` headers. |
| `E_STREAM_UNKNOWN` | 500 | A server-sent event stream id is unknown to the server. |

## Session Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_SESSION_NOT_READY` | 500 | `session.<method>()` needs a session store, and this session was built without one. |
| `E_SESSION_STORE_NOT_CONFIGURED` | 500 | The session config names no store. Set `store`, or `store: 'memory'` for sessions kept in this process only. |
| `E_SESSION_STORE_NOT_CONDITIONAL` | 500 | The store has no `update()`, so it cannot write a session back only while it still exists; a request running across a logout could sign the user in again. |
| `E_SESSION_TAGGING_NOT_SUPPORTED` | 500 | A session tagging method was called on a store that does not support it. Use the memory, redis or database store. |
| `E_SESSION_COOKIE_NOT_HTTP_ONLY` | 500 | The session cookie is configured with `httpOnly: false`. Remove it: a script able to read the cookie turns any XSS into an account takeover. |
| `E_SESSION_TEMPLATE_ENGINE_UNUSABLE` | — | The template engine is installed but the session tags cannot be registered on it. |

## Application Errors

Raised while the application is assembled, configured and started.

| Code | HTTP | Description |
|------|------|-------------|
| `E_INVALID_ENV_VARIABLES` | — | `Env.create()` found environment variables that fail their schema. The message lists each one. |
| `E_MISSING_APP_KEY` | — | Encryption was used and `APP_KEY` is not set (at least 16 characters). |
| `E_INSECURE_APP_KEY` | — | `APP_KEY` is not usable for signing: too short, or a key known from scaffolding or documentation. |
| `E_REAMRC_UNKNOWN_OPTION` | — | `reamrc.ts` `tests` holds an option that does not exist. |
| `E_IGNITOR_ALREADY_STARTED` | — | `warmUp()` was called while the application was already past that phase. |
| `E_IGNITOR_WARMUP_ONLY` | — | An application assembled with `warmUp()` was started. Build a fresh Ignitor to run one. |
| `E_IGNITOR_INVALID_PORT` | — | `PORT` is not an integer between 0 and 65535. |
| `E_IGNITOR_INVALID_HTTP_CONFIG` | — | An `http.<key>` limit is not a whole number in range. |
| `E_IGNITOR_NO_SERVER_FACTORY` | — | `httpServer()` was called with no `serverFactory` in the config. |
| `E_IGNITOR_GRPC_UNSUPPORTED` | — | A gRPC handler is registered, but this server cannot serve gRPC. |
| `E_SERVER_GRPC_ALREADY_SET` | — | A second gRPC handler was registered on the server. |
| `E_SERVER_GRPC_INVALID_LIMIT` | — | A gRPC message size limit is not a whole number of bytes, or `-1` for no limit. |
| `E_REAM_STUB_SYNTAX` | — | A stub template has a syntax error. |

## Console Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_CONSOLE_COMMAND_NOT_FOUND` | — | No command has this name. |
| `E_CONSOLE_MISSING_ARGUMENT` | — | A required argument was not given. |
| `E_CONSOLE_MISSING_ARGUMENT_VALUE` | — | An argument was given with no value. |
| `E_CONSOLE_UNEXPECTED_ARGUMENT` | — | More arguments than the command declares. |
| `E_CONSOLE_UNKNOWN_FLAG` | — | A flag the command does not declare. |
| `E_CONSOLE_MISSING_FLAG` | — | A required flag was not given. |
| `E_CONSOLE_MISSING_FLAG_VALUE` | — | A flag that takes a value was given without one. |
| `E_CONSOLE_INVALID_FLAG_VALUE` | — | A flag value of the wrong type. |
| `E_CONSOLE_INVALID_FLAG_GROUP` | — | Short flags were grouped (`-abc`) with one that cannot be grouped. |
| `E_CONSOLE_NOT_INTERACTIVE` | — | A command asked a question while stdin is not interactive. Pass the value as a flag. |
| `E_CONSOLE_PROMPT_CANCELLED` | — | The user cancelled a prompt. |
| `E_CONSOLE_EMPTY_CHOICES` | — | A choice prompt was asked with no options. |
| `E_CONSOLE_INVALID_TRAP_VALUE` | — | A scripted answer (a prompt trap in a test) was rejected by the prompt's own validation. |
| `E_CONSOLE_TRAP_OUT_OF_RANGE` | — | A prompt trap chose an option that was not offered. |
| `E_CONSOLE_DUPLICATE_COMMAND` | — | Two commands claim the same name. |
| `E_CONSOLE_INVALID_COMMAND` | — | An entry of `reamrc.ts` `commands` is neither a command loader nor a default-exported command class. |
| `E_CONSOLE_INVALID_COMMAND_METADATA` | — | A command loader exported metadata that does not describe a command. |
| `E_CONSOLE_INVALID_ARGUMENT` | — | A command declares its arguments in an order that cannot be parsed: an argument after a spread one, or a required one after an optional one. |
| `E_CONSOLE_INVALID_ALIAS` | — | A command alias expands to nothing. |
| `E_CONSOLE_LATE_GLOBAL_FLAG` | — | A global flag was declared after the kernel started. |
| `E_CONSOLE_LATE_LOADER` | — | A command loader was added after the kernel started. |
| `E_CONSOLE_KERNEL_RUNNING` | — | A command is already running through this kernel. |
| `E_CONSOLE_KERNEL_COMPLETED` | — | The kernel has finished; it cannot run another command line. |
| `E_CONSOLE_NOT_BOOTED` | — | A console application method was called before the commands were loaded. |
| `E_CONSOLE_NO_APP` | — | A command needs the application and the kernel has none. Dispatch through the Ignitor's console kernel. |
| `E_CONSOLE_APP_NOT_STARTED` | — | A command used the application without declaring `startApp: true` in its options. |

## Scheduler Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_SCHEDULE_INVALID_CRON` | — | A scheduled task's cron expression could not be registered. |
| `E_SCHEDULE_INVALID_TARGET` | — | `@Schedule` was put on a static method. |
| `E_SCHEDULE_SYMBOL_METHOD` | — | `@Schedule` was put on a symbol-keyed method. |
| `E_SCHEDULE_ANONYMOUS_CLASS` | — | An anonymous class declares `@Schedule`; its task names would collide. |
| `E_SCHEDULE_METHOD_NOT_FOUND` | — | A scheduled method is not callable on the instance the container resolved. |
| `E_SCHEDULE_INVALID_CALLBACK` | — | `Scheduler.register()` was given something other than a function. |
| `E_SCHEDULE_INVALID_TASK_NAME` | — | `Scheduler.register()` was given an empty task name. |
| `E_SCHEDULE_INVALID_LOCK_BACKEND` | — | `lockBackend` does not implement `acquire(name, ttlMs)` and `release(name)`. |
| `E_SCHEDULE_INVALID_LOCK_TTL` | — | `defaultLockTtlMs` is not a finite positive number. |
| `E_SCHEDULE_INVALID_EVENT_SINK` | — | `eventSink` does not implement `emit(event)`. |
| `E_SCHEDULE_INVALID_ERROR_REPORTER` | — | `errorReporter` is not a function. |
| `E_SCHEDULE_TASK_UNKNOWN` | — | `runTaskNow()` named a task that is not registered. |
| `E_SCHEDULE_TASK_TIMEOUT` | — | A task did not complete within its `timeoutMs`; it keeps running in the background. |
| `E_SCHEDULE_PROVIDER_ALREADY_REGISTERED` | — | The scheduler provider was registered twice on the same container. |
| `E_SCHEDULER_NATIVE_ERROR` | — | A call into the native scheduler failed. |

## RPC and GraphQL Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_RPC_INVALID_METHOD_NAME` | — | An RPC method name is empty or not a string. |
| `E_RPC_RESERVED_METHOD_NAME` | — | An RPC method takes a reserved name (`rpc.*`). |
| `E_RPC_UNKNOWN_CONTROLLER_METHOD` | — | An RPC route names a controller method that does not exist. |
| `E_RPC_PROVIDER_ALREADY_REGISTERED` | — | The RPC provider was registered twice on the same container. |
| `E_GRAPHQL_PROVIDER_ALREADY_REGISTERED` | — | The GraphQL provider was registered twice on the same container. |

## HTTP Client Errors

Raised by the outbound HTTP client.

| Code | HTTP | Description |
|------|------|-------------|
| `E_HTTP_CLIENT_INVALID_URL` | — | The URL cannot be parsed, is not http or https, or carries credentials (send them in a header). |
| `E_HTTP_CLIENT_PRIVATE_ADDRESS` | — | The host is, or resolves to, an address that is not public. |
| `E_HTTP_CLIENT_UNREACHABLE` | — | The host could not be reached. |
| `E_HTTP_CLIENT_TIMED_OUT` | — | The request did not complete within its timeout. |
| `E_HTTP_CLIENT_TOO_LARGE` | — | The response body is over the size limit. |
| `E_HTTP_CLIENT_REDIRECT_REFUSED` | — | A redirect was refused: too many of them, from https to http, or to another host. |

## Archive Errors

Raised by `@c9up/archive`. The signed-file route answers its refusals as JSON with the status shown.

| Code | HTTP | Description |
|------|------|-------------|
| `E_ARCHIVE_INVALID_SIGNATURE` | 403 | The signed URL's signature is missing a part, malformed or does not match. |
| `E_ARCHIVE_EXPIRED_SIGNATURE` | 403 | The signed URL has expired. |
| `E_ARCHIVE_ACCESS_DENIED` | 403 | An unsigned request asked for a private file. |
| `E_ARCHIVE_INVALID_KEY` | 403 | The signed route refused the path: a key with traversal or characters keys may not hold. |
| `E_ARCHIVE_NOT_FOUND` | 404 | No file is stored under the key. The signed route answers 404; a driver call throws it. |
| `E_ARCHIVE_PATH_TRAVERSAL_DETECTED` | — | A key resolves outside the disk root. |
| `E_ARCHIVE_UNALLOWED_CHARACTERS` | — | A key holds characters a key may not hold. |
| `E_ARCHIVE_INVALID_EXPIRY` | — | A signed URL expiry is not a positive duration (a number of seconds or a string such as `'30mins'`). |
| `E_ARCHIVE_SIGNING_DISABLED` | — | `getSignedUrl()` was called on a local disk built without a `signingSecret`. |
| `E_ARCHIVE_WEAK_SIGNING_SECRET` | — | The local disk's `signingSecret` is shorter than 16 characters. |
| `E_ARCHIVE_SIGNED_UPLOAD_UNSUPPORTED` | — | The local disk has no presigned upload URL; only cloud disks do. |
| `E_ARCHIVE_INVALID_HEADER_VALUE` | — | A value to sign as a response header holds a control character. |
| `E_ARCHIVE_INVALID_ROUTE_BASE_PATH` | — | The local disk's `routeBasePath` is not an absolute URL path such as `/storage`. |
| `E_ARCHIVE_PREFIX_MISMATCH` | — | `createSignedRouteHandler()` was given a prefix that differs from the disk's `routeBasePath`, so no signed URL could reach it. |
| `E_ARCHIVE_VISIBILITY_CORRUPT` | — | A file's visibility record cannot be read; archive refuses to treat the file as public. |
| `E_ARCHIVE_VISIBILITY_MOVE_FAILED` | — | `move()` moved the file but could not write its visibility at the target. |
| `E_ARCHIVE_INVALID_MOVE_OPTIONS` | — | `moveToDisk()` was given options it cannot use. |
| `E_ARCHIVE_MULTIPART_NOT_MACROABLE` | — | The installed `@c9up/ream` has no macroable `MultipartFile`, so uploads cannot be given `moveToDisk()`. |
| `E_ARCHIVE_REQUEST_TIMEOUT` | — | The storage provider did not answer, or stalled while its body was read, within the idle timeout. |
| `E_ARCHIVE_UNEXPECTED_RESPONSE` | — | The storage provider answered with something archive cannot use. |
| `E_ARCHIVE_UNKNOWN_DISK` | — | A disk name, or the default disk, is not in the config. |
| `E_ARCHIVE_INVALID_DRIVER` | — | `config.driver` is not `'local'`, `'s3'` or `'gcs'`. |
| `E_ARCHIVE_CONFIG_MISSING` | — | The driver is `s3` or `gcs` and its config section is missing. |
| `E_ARCHIVE_PROVIDER_NOT_REGISTERED` | — | `ArchiveProvider.boot()` ran before `register()`. |
| `E_ARCHIVE_TEMPLATE_ENGINE` | — | The app renders with inker, but the template helpers cannot be published on it. |

## Atlas Errors

Atlas normalises its codes: a code that already starts with `E_` is kept, any
other gets the `E_ATLAS_` prefix. See [Atlas error handling](../atlas/error-handling.md)
for the typed subclasses. The query compiler's refusals are plain `Error`s whose
message starts with the code.

| Code | HTTP | Description |
|------|------|-------------|
| `E_ROW_NOT_FOUND` | 404 | A query that must return a row found none: `findOrFail`, `findByOrFail`, `refresh`, `fresh`, `firstOrFail()`, `sole()`. |
| `E_MASS_ASSIGNMENT` | — | `fill()` / `merge()` (and `create`, `createMany`, `updateOrCreate`) set an attribute outside `fillable`, or listed in `guarded`. |
| `E_EXTRA_PROPERTIES` | — | A fill named a property that is not a declared column. |
| `E_UNKNOWN_COLUMN` | — | A value was assigned to a key that is not a column. Pass `{ allowExtraProperties: true }` to keep unknown keys in `$extras`. |
| `E_INVALID_COLUMN` | — | A query names a column the entity does not declare. |
| `E_INVALID_FIND_VALUE` | — | `find()` was called without a usable primary key value. |
| `E_MODEL_NOT_PERSISTED` | — | An operation that needs a stored row (`delete()`, `refresh()`, `load*()`…) ran on a local instance. |
| `E_MISSING_PRIMARY_KEY` | — | The same operation ran on a persisted projection that holds no primary key. |
| `E_MODEL_DELETED` | — | `save()` was called on a deleted instance. |
| `E_MISSING_OWNER_KEY` | — | `associate()` was given a parent whose key is not set. |
| `E_RELATION_NOT_LOADED` | — | A relation was read before it was loaded. Call `.preload()` on the query or `.load()` on the instance. |
| `E_OPTIMISTIC_LOCK` | — | A save lost an optimistic lock: another transaction modified the row since it was read. |
| `E_STRICT_MODE` | — | Raw SQL refused by strict mode (a repository's `raw()`, or a `db.raw()` value written by a repository). |
| `E_NO_INTERACTIVE_TRANSACTION` | — | The connection has no interactive `transaction()` (a model transaction, or `useTransaction()` in tests). |
| `E_ARRAY_PARAM` | — | A list was bound to a single placeholder. Expand it into one placeholder per element. |
| `E_ATLAS_MISSING_CONNECTION` | — | A model or repository names a connection that is not configured. |
| `E_ATLAS_EMPTY_SELECT` | — | `select()` was called with no columns. Provide at least one column name. |
| `E_ATLAS_INVALID_PAGE` | — | `paginate()` was called with `page < 1`. |
| `E_ATLAS_INVALID_PER_PAGE` | — | `paginate()` was called with `perPage < 1`. |
| `E_ATLAS_INVALID_PAGINATION` | — | A page, page size or row count that is not a finite, non-negative integer. |
| `E_ATLAS_INVALID_CTE_NAME` | — | A CTE name must be a valid identifier (letters, numbers, underscores). |
| `E_ATLAS_INVALID_OPERATOR` | — | A `where()` or `wherePivot()` operator outside the allowed list. |
| `E_ATLAS_INVALID_INCREMENT` | — | `increment()` / `decrement()` was given an amount that is not a finite number. |
| `E_ATLAS_INVALID_DATE_COLUMN_VALUE` | — | A date column was given a value that is not a valid date. |
| `E_ATLAS_UNDEFINED_BINDING` | — | A query value is `undefined`. Validate the input first; use `whereNull()` to match NULL. |
| `E_ATLAS_RAW_BINDINGS` | — | A raw query has placeholders with no binding. |
| `E_ATLAS_RAW_VALUE` | — | `defaultTo(db.raw())` was given bindings, which a column default cannot carry. |
| `E_ATLAS_NON_FINITE_NUMBER` | — | `defaultTo()` was given a number that is not a SQL number (`NaN`, `Infinity`). |
| `E_ATLAS_FACTORY_FAKER_MISSING` | — | A factory uses faker, an optional peer of atlas that is not installed. |
| `E_ATLAS_NAPI_NOT_FOUND` | — | The Rust query compiler is not loaded. A plain `Error` whose message starts with the code. See [Troubleshooting](../atlas/troubleshooting.md). |
| `E_ATLAS_INSECURE_SSLMODE` | — | The connection asks for `sslmode=prefer` or `allow` (URL or `PGSSLMODE`), which fall back to plaintext without saying so. Use `disable` or `verify-full`. See [Encrypted connections](../atlas/connections.md#encrypted-connections-tls). |
| `E_ATLAS_LISTEN_UNSUPPORTED` | — | LISTEN / NOTIFY was used on a connection that is not PostgreSQL. |
| `E_ATLAS_LISTEN_CONNECT` | — | The listener could not open its own PostgreSQL connection. |
| `E_ATLAS_LISTEN_CONNECTION` | — | The listener's connection failed; every subscription is told. |
| `E_ATLAS_LISTEN_CHANNEL` | — | A LISTEN channel name is empty, longer than 63 bytes, or holds a NUL. |
| `E_ATLAS_LISTEN_CLOSED` | — | The listener was closed while a request was pending. |
| `E_ATLAS_LISTEN_EVENT` | — | The native listener reported an event atlas does not define. |
| `E_ATLAS_MIGRATION_INVALID_TABLE_NAME` | — | `migrations.tableName` is not a plain identifier. |
| `E_ATLAS_MIGRATION_NOT_FOUND` | — | A migration to run or roll back has no file in the migrations directory. |
| `E_ATLAS_MIGRATION_INVALID` | — | A migration file does not default-export a class. |
| `E_ATLAS_MIGRATION_DUPLICATE` | — | Two migration files share a name. |
| `E_ATLAS_MIGRATION_COMPILE_EMPTY` | — | A migration compiled to no SQL statement. |
| `E_MIGRATION_LOCKED` | — | Another run holds the migration lock. Wait for it, or clear a stale lock with `migration:unlock`. |
| `E_ROLLBACK_DISABLED_IN_PRODUCTION` | — | A rollback, reset, refresh, fresh or wipe in production without `--force`. |
| `E_ATLAS_DRY_RUN_WRITE` | — | A migration tried to write while running under `dryRun()`. |
| `E_DEFER_REQUIRES_TRANSACTION` | — | A migration uses `this.defer()` on an adapter without an interactive `transaction()`. |
| `E_MYSQL_FK_REQUIRES_TRANSACTION` | — | Suspending MySQL foreign-key checks needs an interactive `transaction()` to restore them. |
| `E_SCHEMA_DUMP_DIALECT_MISMATCH` | — | The schema dump was made for another dialect. |
| `E_SCHEMA_DUMP_TABLE_MISMATCH` | — | The schema dump uses another migrations tracking table. |
| `E_SEEDER_DIR_NOT_FOUND` | — | The seeders directory does not exist. |
| `E_SEEDER_INVALID` | — | A seeder file does not export a seeder class. |
| `E_SEEDER_INVALID_PATH` | — | A seeder path resolves outside the seeders directory. |
| `E_NO_CONNECTION` | — | `schema.<method>()` needs a live connection; it is available inside a migration, not on a standalone `Schema`. |
| `E_ALTER_EMPTY` | — | `schema.alterTable()` declared no operation. |
| `E_ALTER_MISUSE` | — | `.alter()` does not follow a column definition, or an alter-only method was used on a new table. |
| `E_CHECK_EMPTY` | — | A check constraint (or `checkBetween`) was given no value or interval. |
| `E_CHECK_RANGE` | — | `checkBetween` was given an interval that is not `[min, max]`. |
| `E_CONSTRAINT_EMPTY` | — | A constraint lists no columns. |
| `E_ENUM_EMPTY` | — | An enum column declares no values. |
| `E_EMPTY_VIEW_SELECT` | — | A view has no SELECT, or a materialized view was asked of a dialect that has none. |
| `E_SPECIFIC_TYPE_EMPTY` | — | `specificType()` was given an empty type. |
| `E_SQLITE_DECIMAL_PRECISION` | — | A decimal precision SQLite cannot store exactly. |
| `E_UNSUPPORTED` | — | A SQL feature the connection's dialect does not have (`DISTINCT ON` off Postgres, `UNION ALL` variants on SQLite…). |
| `E_UNSAFE_IDENTIFIER` | — | The Rust compiler refused an identifier. |
| `E_UNSAFE_SQL` | — | The Rust compiler refused a SQL fragment. |
| `E_UNSAFE_EXPRESSION` | — | The Rust compiler refused an expression. |
| `E_UNSAFE_LITERAL` | — | The Rust compiler refused a literal value. |
| `E_INJECTION_PATTERN` | — | The Rust compiler refused an input that looks like an injection attempt. |

## Aurora Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_AURORA_ILLEGAL_PAGE_NAME` | — | A page name holds characters a page name may not. |
| `E_AURORA_PAGE_OUTSIDE_ROOT` | — | The resolved page path lands outside the configured pages root. |
| `E_AURORA_PAGE_NOT_FOUND` | — | No file for this page name. |
| `E_AURORA_PAGE_IMPORT_FAILED` | — | The page is on disk and its module graph refused to load. |
| `E_AURORA_PAGE_INVALID_EXPORT` | — | The page module loaded but does not default-export a factory. |
| `E_AURORA_ILLEGAL_ROOT_TAG` | — | `renderPage` was given a root tag that is not a plain element name. |
| `E_AURORA_OUTSIDE_COMPONENT` | — | `onMount` / `onUnmount` was called outside a `component()` setup function. |
| `E_AURORA_MISSING_CONTEXT` | — | `inject` found no provider for the context, and it declared no default. |
| `E_AURORA_NOT_BOOTED` | — | The manager singleton was read before a provider or `setAurora` set it. |
| `E_AURORA_UNKNOWN_ROUTE` | — | `urlFor` was given a name absent from the route manifest. |
| `E_AURORA_MISSING_ROUTE_PARAMS` | — | `urlFor` was given a route whose required params were not all supplied. |
| `E_AURORA_UNKNOWN_LIVE_COMPONENT` | — | A live component was mounted before `registry.define()` named it. |
| `E_AURORA_LIVE_SESSION_LIMIT` | — | A live session was refused: the registry holds `maxSessions` already. |
| `E_AURORA_RELAY_REQUEST_FAILED` | — | A relay request came back with a non-2xx status. |
| `E_AURORA_UNSAFE_URL` | — | A navigation URL failed the same-origin / scheme check. |
| `E_AURORA_SLOT_IN_TAG_NAME` | — | A `${}` landed where a tag name goes. |
| `E_AURORA_SLOT_IN_ATTRIBUTE_NAME` | — | A `${}` landed where an attribute name goes. |
| `E_AURORA_SLOT_IN_RAW_TEXT` | — | A `${}` landed inside `<script>`, `<style>`, `<textarea>`, `<title>`… |
| `E_AURORA_SLOT_IN_COMMENT` | — | A `${}` landed inside a comment, a `<!…>` / `<?…>` or a CDATA section. |
| `E_AURORA_SLOT_IN_EVENT_ATTRIBUTE` | — | A `${}` landed in an `on*` attribute, whose value is JavaScript. |
| `E_AURORA_SLOT_IN_SRCDOC` | — | A `${}` landed in `srcdoc`, which an iframe parses as a whole document. |
| `E_AURORA_SLOT_IN_BASE_URL` | — | A `${}` landed in `<base href>`, which rebases every URL on the page. |
| `E_AURORA_SLOT_IN_SCRIPT_SOURCE` | — | A `${}` landed in the URL a `<script>` loads its code from. |
| `E_AURORA_SLOT_IN_HTML_PROPERTY` | — | A `.prop` binding names a property that parses its value as HTML. |
| `E_AURORA_TEMPLATE_IN_ATTRIBUTE` | — | A nested `html` template reached an attribute value or `.value`. |
| `E_AURORA_FILE_INPUT_VALUE` | — | `.value` was given a non-empty string on an `<input type="file">`. |
| `E_AURORA_DUPLICATE_KEY` | — | Two elements of an `each()` list share a key, which names one row. |
| `E_AURORA_INTERNAL` | — | An invariant inside aurora broke: always a bug in aurora itself. |

## Blackhole Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_BLACKHOLE_RATE_LIMITED` | 429 | Too many requests from this client, with `Retry-After`. Wait and retry. |
| `E_TOO_MANY_REQUESTS` | 429 | A throttle middleware or `limiter.consume()` found the key over its budget. |
| `E_BAD_CSRF_TOKEN` | 403 | Invalid or missing CSRF token. Echo the `XSRF-TOKEN` cookie in the `X-XSRF-TOKEN` header (or the `_csrf` form field). |
| `E_BLACKHOLE_CSRF_ORIGIN_MISMATCH` | 403 | A state-changing request came from another origin — another host, or the same host over another scheme — not listed in `csrf.trustedOrigins`. |
| `E_BLACKHOLE_PATH_TRAVERSAL` | 400 | The path holds `..`, raw or percent-encoded. |
| `E_BLACKHOLE_PARAMETER_POLLUTION` | 400 | A query-string key appears twice (keys ending in `[]` may repeat). |
| `E_BLACKHOLE_MISSING_IP` | 400 | Rate limiting is on and the request has no client address to count it under. |
| `E_BLACKHOLE_SESSION_NOT_READY` | 500 | CSRF tokens are bound to the session (`csrf.session`) and the request reached blackhole without one: register the session middleware before blackhole's. |
| `E_BLACKHOLE_BLOCKED` | varies | A refusal whose body the engine did not supply as a JSON error. |

## Echo Errors

`E_FACTORY_ERROR`, `E_FACTORY_HARD_TIMEOUT`, `E_UNDEFINED_VALUE` and `E_L2_CACHE_ERROR` keep the identifiers cache code already catches on.

| Code | HTTP | Description |
|------|------|-------------|
| `E_FACTORY_ERROR` | — | The factory of `getOrSet()` threw; `cause` holds its error. |
| `E_FACTORY_HARD_TIMEOUT` | — | The factory did not finish within its hard timeout. |
| `E_UNDEFINED_VALUE` | — | A `null` or `undefined` value was written to the cache. |
| `E_L2_CACHE_ERROR` | — | A tiered store's second level failed and the failure is not suppressed. |
| `E_ECHO_LOCK_TIMEOUT` | — | A caller waited too long for another caller's factory of the same key. |
| `E_ECHO_INVALID_ARGUMENT` | — | A method was given an argument it cannot work with. |
| `E_ECHO_INVALID_DURATION` | — | A duration is neither a number of milliseconds nor a readable string. |
| `E_ECHO_INVALID_CONFIG` | — | A config value cannot be read, such as a size that is not bytes or `'10mb'`. |
| `E_ECHO_UNKNOWN_STORE` | — | A store name, or the default store, is not declared in `stores`. |
| `E_ECHO_UNSUPPORTED_DRIVER` | — | The default provider was given a driver it does not build. |
| `E_ECHO_NOT_TAGGABLE` | — | Tag invalidation on a driver (or a tier) that has no tags. |
| `E_ECHO_SCAN_UNSUPPORTED` | — | `flush()` on a Redis client without `scan()`; `KEYS` is not used. |
| `E_ECHO_UNSERIALIZABLE_VALUE` | — | The memory driver stores JSON and the value has no JSON form. Pass `serialize: false` to keep it as is. |
| `E_ECHO_QUASAR_MISSING` | — | A Redis store was configured and `@c9up/quasar` is not installed. |
| `E_ECHO_INCOMPLETE_CONNECTION` | — | The quasar connection lacks what echo needs (`publish()` / `subscribe()`). |
| `E_ECHO_NOT_BOOTED` | — | The cache singleton was used before `EchoProvider.boot()` or `setCache()`. |

## Eclipse Errors

`E_LOCK_NOT_OWNED` and `E_LOCK_STORAGE_ERROR` keep the identifiers lock code already catches on.

| Code | HTTP | Description |
|------|------|-------------|
| `E_LOCK_NOT_OWNED` | — | The lock is not held by this holder: it expired, or another holder has it. Raised when work succeeded but the lease lapsed while it ran. |
| `E_LOCK_STORAGE_ERROR` | — | The lock store failed while saving, reading or deleting. |
| `E_ECLIPSE_INVALID_TTL` | — | A lock TTL is not a finite positive number of milliseconds, or `null`. |
| `E_ECLIPSE_INVALID_DURATION` | — | A duration string cannot be read. |
| `E_ECLIPSE_INVALID_RETRY` | — | A `retry` option is out of range. |
| `E_ECLIPSE_INVALID_CONFIG` | — | The lock config is invalid. |
| `E_ECLIPSE_MISSING_CONFIG` | — | `config/lock.ts` is missing. |
| `E_ECLIPSE_UNKNOWN_STORE` | — | A lock store name is not declared. |
| `E_ECLIPSE_QUASAR_MISSING` | — | A Redis store was configured and `@c9up/quasar` is not installed. |
| `E_ECLIPSE_INCOMPLETE_CONNECTION` | — | The quasar connection lacks what eclipse needs. |

## Eon Errors

Most eon refusals are plain `Error`s whose message starts with `[CODE]`; the query compiler's start with `CODE:`.

| Code | HTTP | Description |
|------|------|-------------|
| `E_EON_MISSING_CONNECTION` | — | A repository has no connection to run on. |
| `E_EON_NOT_A_SUPERTABLE` | — | A class used as a super-table is not decorated with `@SuperTable`. |
| `E_EON_NO_TAGS` | — | A super-table has no `@Tag` column, so a child table cannot be routed. |
| `E_EON_NO_TIMESTAMP` | — | A super-table has no `@Timestamp` column. |
| `E_EON_CHILD_STABLE` | — | `createChildTable()` was given neither `stable` nor `EntityClass`. |
| `E_EON_CHILD_COLLISION` | — | Two distinct tag sets map to the same child table; eon refuses to write mismatched rows under one tag set. |
| `E_EON_BATCH_SIZE` | — | `batchSize` is not a positive integer. |
| `E_EON_DECIMAL_STMT` | — | A super-table with DECIMAL columns went through the columnar STMT path, which cannot bind them. Use `ingestSql()`. |
| `E_EON_TYPE` | — | A column or tag has an unknown or missing type. |
| `E_EON_TS_TYPE` | — | A timestamp is neither a bigint nor a safe-integer number. |
| `E_EON_PARAM_PRECISION` | — | A timestamp number is not a safe integer; pass nanosecond timestamps as bigint. |
| `E_EON_VALUE_TYPE` | — | An integer column was given something other than a safe integer or a bigint. |
| `E_EON_VALUE_RANGE` | — | A value is outside its column type's range; the connector would truncate it silently. |
| `E_EON_TEMPLATE` | — | The compiler returned no statement for the STMT insert template. |
| `E_EON_LITERAL_INSERT` | — | A literal insert for one child table compiled to other than exactly one statement. |
| `E_EON_HYDRATE_BIGINT` | — | A bigint or timestamp column came back with a non-integer value. |
| `E_EON_DECODE` | — | A query returned rows without column metadata, so they cannot be decoded. |
| `E_EON_SCHEMALESS_SCHEMA` | — | A field type has no line-protocol form. |
| `E_EON_SCHEMALESS_FIELD` | — | A line-protocol field value is outside its type's range. |
| `E_EON_SCHEMALESS_TAG` | — | A line-protocol tag value cannot be written. |
| `E_EON_SCHEMALESS_EMPTY_TAG` | — | A line-protocol tag value is empty. |
| `E_EON_SCHEMALESS_NO_FIELDS` | — | A line-protocol point has no field. |
| `E_EON_SCHEMALESS_MEASUREMENT` | — | The super-table (measurement) name is empty. |
| `E_EON_SCHEMALESS_CONTROL_CHAR` | — | A line-protocol name or value holds a line terminator or control character; it is refused, not escaped. |
| `E_EON_INVALID_VALUE` | — | `where()` with one argument takes a callback that fills a group. |
| `E_EON_EMPTY_WHERE_GROUP` | — | A `where(callback)` group added no predicate. |
| `E_EON_INVALID_LIMIT` | — | `limit()` was given a value that is not a non-negative integer. |
| `E_EON_INVALID_OFFSET` | — | `offset()` was given a value that is not a non-negative integer. |
| `E_EON_COMPILE_EMPTY` | — | The compiler returned no SQL statement. |
| `E_EON_UNEXPECTED_PARAMS` | — | A time-series query compiled with bound parameters where literal SQL is expected. |
| `E_EON_INTERNAL` | — | An invariant inside eon broke: always a bug in eon itself. |
| `E_EON_ALTER_DB_ONE_OPTION` | — | `alterDatabase()` takes exactly one option. |
| `E_EON_MIGRATION_INVALID` | — | The migrations tracking table holds an unreadable `executed_at`. |
| `E_EON_MIGRATION_LOCKED` | — | Another run holds the migration lock. |
| `E_EON_FACTORY_STATE` | — | A factory state is not defined. |
| `E_EON_FAKE_UNSUPPORTED` | — | `FakeEonConnection` answers only flat SELECTs; windowed or aggregate SQL needs a live TDengine. |
| `E_EON_TEST_IDENTIFIER` | — | A test cleanup helper was given a name that is not a plain identifier. |
| `E_EON_NAPI_NOT_FOUND` | — | The eon query compiler binary is not found. |
| `E_EON_NAPI_UNSUPPORTED` | — | There is no eon query compiler binary for this platform. |
| `E_EON_INVALID_DURATION` | — | A duration is not a positive integer followed by one unit. |
| `E_EON_INVALID_FILL` | — | A `FILL` mode is not one TDengine knows, or lacks its value. |
| `E_EON_FILL_REQUIRES_INTERVAL` | — | `FILL` was used without `INTERVAL`. |
| `E_EON_SLIDING_REQUIRES_INTERVAL` | — | `SLIDING` was used without `INTERVAL`. |
| `E_EON_OFFSET_REQUIRES_LIMIT` | — | `OFFSET` was used without `LIMIT`. |
| `E_EON_INVALID_ORDER_DIRECTION` | — | An order direction is neither `asc` nor `desc`. |
| `E_EON_INVALID_PSEUDO_COLUMN` | — | A pseudo-column is not one eon allows. |
| `E_EON_INVALID_SELECT` | — | A select expression cannot be compiled. |
| `E_EON_INVALID_SELECT_FUNCTION` | — | A select names a function eon does not allow. |
| `E_EON_INVALID_DB_OPTION` | — | A database option value is invalid. |
| `E_EON_UNKNOWN_DB_OPTION` | — | A database option is not alterable (`KEEP`, `BUFFER`, `WAL_LEVEL`, `CACHEMODEL`, `REPLICA`, `MINROWS`). |
| `E_EON_IMMUTABLE_DB_OPTION` | — | A database option is fixed at CREATE and cannot be altered. |
| `E_EON_INVALID_TTL` | — | A child-table TTL is not a non-negative whole number of days. |
| `E_EON_INVALID_WAL_LEVEL` | — | A `WAL_LEVEL` is not one TDengine accepts. |
| `E_EON_INVALID_CACHEMODEL` | — | A `CACHEMODEL` is not one TDengine accepts. |
| `E_EON_INVALID_PRECISION` | — | A database precision is not `ms`, `us` or `ns`. |
| `E_EON_KEEP_TOO_SMALL` | — | `KEEP` is less than three times `DURATION`. |
| `E_TS_REQUIRED` | — | A super-table's first column is not a TIMESTAMP. |
| `E_TAGS_REQUIRED` | — | A super-table declares no tag. |
| `E_JSON_TAG_RULE` | — | JSON is tag-only and must be the only tag. |
| `E_TYPE_NOT_TAGGABLE` | — | A type that cannot be a tag (DECIMAL) is used as one. |
| `E_LENGTH_REQUIRED` | — | A type that needs a length (`BINARY(n)`, `NCHAR(n)`…) was given none. |
| `E_NAME_COLLISION` | — | A name is listed more than once across the STMT template's tag and value columns. |
| `E_INVALID_CLAUSE_TYPE` | — | A WHERE connector is neither `and` nor `or`. |
| `E_INVALID_WHERE_GROUP` | — | A WHERE group is empty, or also names a column. |
| `E_INVALID_WHERE_VALUE` | — | A WHERE value (or list element) is not a scalar. |
| `E_UNSAFE_IDENTIFIER` | — | The compiler refused an identifier. |
| `E_UNSAFE_LITERAL` | — | The compiler refused a literal value. |
| `E_UNSAFE_OPERATOR` | — | The compiler refused an operator. |

## Ephemeris Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_EPHEMERIS_INVALID_NODE` | — | A structured-data node has no `@type`. |
| `E_EPHEMERIS_INVALID_URL` | — | A URL is not absolute. |
| `E_EPHEMERIS_INVALID_DATE` | — | A date is not ISO 8601. |
| `E_EPHEMERIS_INVALID_VALUE` | — | A value cannot be serialised (an invalid `Date`…). |
| `E_EPHEMERIS_INVALID_PRICE` | — | A price is neither a number nor digits with a decimal point. |
| `E_EPHEMERIS_INVALID_CURRENCY` | — | A currency is not an ISO 4217 code. |
| `E_EPHEMERIS_MISSING_REQUIRED` | — | A type lacks a property search engines require for it. |
| `E_EPHEMERIS_UNSAFE_KEY` | — | A key structured data may not use (such as `__proto__`). |
| `E_EPHEMERIS_ID_TAKEN` | — | An `@id` generated for one node was given to another. |
| `E_EPHEMERIS_SLOT_TAKEN` | — | A node slot is already taken by another node. |
| `E_EPHEMERIS_CYCLE` | — | A node contains itself. |
| `E_EPHEMERIS_TOO_DEEP` | — | The data is nested deeper than the allowed depth. |
| `E_EPHEMERIS_TOO_LONG` | — | A text value is longer than the allowed length. |
| `E_EPHEMERIS_TOO_MANY` | — | A list (a breadcrumb…) has more items than allowed. |

## Goldstone Errors

The mail engine's limits are refused before the message is parsed further.

| Code | HTTP | Description |
|------|------|-------------|
| `E_GOLDSTONE_MESSAGE_TOO_LARGE` | — | A message is over the size limit; refused before download when the server announces its size. |
| `E_GOLDSTONE_NOT_A_MESSAGE` | — | The bytes are not a mail message. |
| `E_GOLDSTONE_TOO_MANY_PARTS` | — | A message has more MIME parts than allowed. |
| `E_GOLDSTONE_TOO_DEEP` | — | MIME parts are nested deeper than allowed. |
| `E_GOLDSTONE_TOO_MANY_HEADERS` | — | A message has more headers than allowed. |
| `E_GOLDSTONE_HEADERS_TOO_LARGE` | — | A message's headers are over the size limit. |
| `E_GOLDSTONE_MISSING_BOUNDARIES` | — | A multipart message declares boundaries that never appear. |
| `E_GOLDSTONE_BOUNDARY_TOO_LONG` | — | A multipart boundary is longer than allowed. |
| `E_GOLDSTONE_TOO_MANY_ATTACHMENTS` | — | A message has more attachments than allowed. |
| `E_GOLDSTONE_ATTACHMENT_TOO_LARGE` | — | An attachment is over the size limit. |
| `E_GOLDSTONE_HTML_TOO_LARGE` | — | An HTML body is over the size limit. |
| `E_GOLDSTONE_HTML_TOO_DEEP` | — | An HTML body is nested deeper than allowed. |
| `E_GOLDSTONE_HTML_TOO_COMPLEX` | — | An HTML body has more elements than allowed. |
| `E_GOLDSTONE_DNS_UNAVAILABLE` | — | An authenticity check needed DNS and DNS failed. |
| `E_GOLDSTONE_INVALID_ENVELOPE` | — | The envelope given to an authenticity check is invalid (an address that is not an IP…). |
| `E_GOLDSTONE_ENGINE` | — | The engine failed without one of the codes above. |
| `E_GOLDSTONE_NATIVE_REQUIRED` | — | The Rust mail engine is not loaded. |
| `E_GOLDSTONE_INVALID_LIMITS` | — | A parsing limit is not a positive integer under 2^32. |
| `E_GOLDSTONE_INVALID_OPTIONS` | — | An authenticity check option is not a positive integer under 2^32. |
| `E_GOLDSTONE_INVALID_CONFIG` | — | The inbox config is invalid (no mailbox declared…). |
| `E_GOLDSTONE_INSECURE_CONNECTION` | — | A mailbox would connect without TLS. Set `starttls: true`, or `allowInsecure` for a local test server. |
| `E_GOLDSTONE_UNKNOWN_MAILBOX` | — | A mailbox name is not configured. |
| `E_GOLDSTONE_UIDVALIDITY_CHANGED` | — | A watched folder renumbered its messages; watching resumes from the newest. |

## Helix Plugin Errors

Raised by `@c9up/helix-plugin-ream` as plain `Error`s whose message starts with `[CODE]`.

| Code | HTTP | Description |
|------|------|-------------|
| `E_NO_SERVER` | — | `apiClient()` was given neither `testUtils` nor `boot`. |
| `E_SERVER_NOT_STARTED` | — | No server is running for the suite. Add the hook that starts it. |
| `E_NO_TEST_CLIENT` | — | No client is in play. Add `apiClient()` to the plugins in `tests/bootstrap.ts`. |

## Inker Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_INKER_TEMPLATE_NOT_FOUND` | — | No template has this name. |
| `E_INKER_PARSE_ERROR` | — | The template cannot be parsed. |
| `E_INKER_UNKNOWN_IDENTIFIER` | — | An expression names an identifier that is not in scope. |
| `E_INKER_INVALID_PATH` | — | A template path is invalid (traversal, absolute path…). |
| `E_INKER_UNCLOSED_INTERPOLATION` | — | A `{{` has no matching `}}`. |
| `E_INKER_UNCLOSED_BLOCK_TAG` | — | A block tag is not closed. |
| `E_INKER_UNCLOSED_BLOCK` | — | A block has no `@end`. |
| `E_INKER_UNMATCHED_BLOCK_END` | — | An `@end` closes no block. |
| `E_INKER_MISMATCHED_BLOCK_END` | — | An `@end` closes another block than the open one. |
| `E_INKER_UNKNOWN_DIRECTIVE` | — | A directive the engine does not know. |
| `E_INKER_UNKNOWN_TAG` | — | No tag is registered under this name. Register it with `templates.registerTag()`. |
| `E_INKER_INVALID_LAYOUT_POSITION` | — | `@layout` is not the first statement of the template. |
| `E_INKER_DUPLICATE_LAYOUT` | — | A template declares more than one layout. |
| `E_INKER_NESTED_LAYOUT_UNSUPPORTED` | — | A layout extends another layout. |
| `E_INKER_LAYOUT_IN_PARTIAL` | — | A partial declares a layout. |
| `E_INKER_CIRCULAR_INCLUDE` | — | Templates include each other in a loop. |
| `E_INKER_MISSING_SLOT` | — | A component requires a slot the caller did not fill. |
| `E_INKER_UNKNOWN_SLOT` | — | The caller fills a slot the component does not declare. |
| `E_INKER_DISK_REQUIRED` | — | A template name needs a disk and none is mounted. |
| `E_INKER_DISK_COLLISION` | — | Two disks are mounted under the same name. |
| `E_INKER_TEMPLATE_COLLISION` | — | Two templates are registered under the same name. |
| `E_INKER_INVALID_EXPRESSION` | — | An expression cannot be evaluated. |
| `E_INKER_INVALID_ITERABLE` | — | `@each` was given something that is not iterable. |
| `E_INKER_HELPER_THROW` | — | A helper threw during the render. |
| `E_INKER_ASYNC_NOT_SUPPORTED` | — | A construct that renders synchronously used `await`. |
| `E_INKER_RENDER_DEPTH` | — | The render nested too deep. |
| `E_INKER_DUMP_DIE` | — | `@dd()` stopped the render and printed its value. |
| `E_INKER_INVALID_JSON_LD` | — | A value given to the JSON-LD helper cannot be held in JSON-LD. |
| `E_INKER_TEMPLATE_ERROR` | — | A template raised an error itself. |
| `E_INKER_ENGINE_MISSING` | — | A template was rendered through the inker singleton before `InkerProvider` built the engine. |
| `E_INKER_NAPI_REQUIRED` | — | There is no native inker binary for this platform. |

## Lumen Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_LUMEN_INVALID_COLUMN` | — | A table was asked for a column shape it does not have. |

## Neutrino Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_NEUTRINO_INVALID_DESCRIPTOR` | — | The bytes are not a valid `FileDescriptorSet`. |
| `E_NEUTRINO_DUPLICATE_TYPE` | — | Two descriptors declare the same type differently. |
| `E_NEUTRINO_UNKNOWN_TYPE` | — | No message or enum type of this name is loaded. |
| `E_NEUTRINO_UNKNOWN_METHOD` | — | No method of this path is loaded. |
| `E_NEUTRINO_INVALID_MESSAGE` | — | The bytes are not a valid message of the type. |
| `E_NEUTRINO_INVALID_METADATA` | — | Binary gRPC metadata is malformed; the server answers INTERNAL. |
| `E_NEUTRINO_GRPC_STATUS` | — | `GrpcError`: a method answers a gRPC status instead of a reply; its message goes to the client as the status details. |
| `E_NEUTRINO_DUPLICATE_SERVICE` | — | A service is registered twice. |
| `E_NEUTRINO_INVALID_IMPLEMENTATION` | — | A method implementation is not a function. |
| `E_NEUTRINO_STREAMING_UNSUPPORTED` | — | A streaming method was registered; only unary methods are served. |
| `E_NEUTRINO_INVALID_OPTION` | — | A size option is not a whole number of bytes, or `-1` for no limit. |
| `E_NEUTRINO_GRPC_UNSUPPORTED` | — | The server has no `grpc()` method. Upgrade `@c9up/ream`. |

## Nova Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_NOVA_INVALID_SUBSCRIPTION` | 400 | The subscribe or unsubscribe body is not a valid `PushSubscription`. |
| `E_NOVA_SUBSCRIPTION_CONFLICT` | 409 | Another request was writing the same endpoint at the same time. Retry the subscribe. |
| `E_NOVA_SUBSCRIPTION_NOT_FOUND` | 404 | The user has no such subscription. |
| `E_NOVA_MISSING_USER` | — | The subscription handler ran without an authenticated user. |
| `E_NOVA_INVALID_USER_ID` | — | The authenticated user has no usable id (a non-empty string or an integer). |
| `E_NOVA_VAPID_NOT_CONFIGURED` | — | A VAPID key or subject is missing. |
| `E_NOVA_HTTP_CLIENT_MISSING` | — | Sending a push needs the outbound HTTP client of `@c9up/ream`. |
| `E_NOVA_UNKNOWN_STORE` | — | The config names a store it does not declare. |
| `E_NOVA_INVALID_TABLE` | — | The SQL store's table name is not a plain identifier. |
| `E_NOVA_INVALID_PREFIX` | — | The Redis store's key prefix contains a space. |
| `E_NOVA_STORE_BUSY` | — | A subscription changed under every attempt to write it. |
| `E_NOVA_STORE_FILE_UNREADABLE` | — | The file store's file is not valid JSON. |
| `E_NOVA_QUASAR_MISSING` | — | A Redis store was configured and `@c9up/quasar` is not installed. |
| `E_NOVA_REDIS_INCOMPLETE` | — | The quasar connection lacks what nova needs. |

## Parsec Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_PARSEC_INVALID_NAME` | — | A metric or label name is not valid. |
| `E_PARSEC_INVALID_INSTRUMENT` | — | An instrument is declared with options it cannot have. |
| `E_PARSEC_INSTRUMENT_CONFLICT` | — | A metric name is already declared with a different type, help or label set. |
| `E_PARSEC_INVALID_MEASUREMENT` | — | A measurement is not a finite number. |
| `E_PARSEC_INVALID_LABEL_VALUE` | — | A label value is neither a string nor a finite number. |
| `E_PARSEC_UNDECLARED_LABEL` | — | A measurement was given a label the metric does not declare. |
| `E_PARSEC_UNKNOWN_EXPORTER` | — | An exporter name is not declared. |
| `E_PARSEC_UNPROTECTED_ENDPOINT` | — | The metrics endpoint would be served without protection. Set a token, or `public: true` deliberately. |
| `E_PARSEC_EMPTY_TOKEN` | — | The metrics endpoint token is empty, which would match a request without credentials. |

## Photon Errors

Server-side errors are thrown from `@c9up/photon` (SSR / renderer); client-side errors are thrown from `@c9up/photon/client` (hydration / SPA-nav). Every code carries a `docsUrl` that resolves to its anchor below — operators can jump from the terminal directly to the recovery instructions.

### E_PHOTON_INVALID_CONFIG

**Cause.** A field in `config/photon.ts` (or the `PhotonConfig` passed to `PhotonRenderer`) fails validation: `buildDir` resolves outside the project root, or `ssr.entrypoint` / `entryClient` contains path-traversal segments or characters outside `[\w./\-@#]`.

**Fix.**
1. Open `config/photon.ts` and verify `buildDir` is a relative path INSIDE your project (e.g. `dist`, NOT `../dist`).
2. Verify `ssr.entrypoint` and `entryClient` are relative paths without `..` segments and end in `.tsx?` / `.jsx?` / `.vue` / `.svelte`.
3. Restart the renderer (`PhotonRenderer.boot()` re-validates).

**Throw site:** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_MANIFEST_MISSING

**Cause.** The Vite manifest at `${buildDir}/manifest.json` is absent when `PhotonRenderer.boot()` runs in production mode. The manifest is a build artefact — its absence almost always means the build never ran for this deployment, or the build output was not shipped.

**Fix.**
1. Run your build script (e.g. `pnpm build`) before starting the server in production.
2. Verify your deployment pipeline copies the build directory (default `public/build/`) into the runtime image.
3. Confirm `PhotonConfig.buildDir` matches where Vite writes its output.

The thrown error's `context` carries `{ manifestPath, buildDir }` for diagnostics.

**Throw site:** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_MANIFEST_INVALID

**Cause.** The Vite manifest is there but cannot be read, is not JSON, or is not a manifest object. Photon used to skip it with a warning and then point every page at a `client.js` the build never wrote, so the server looked healthy and nothing hydrated; it now fails the boot.

**Fix.**
1. Rebuild the client and redeploy the whole build directory — a partial copy is the usual cause.
2. Check the process can read the file.

The thrown error's `context` carries `{ manifestPath }`, and `cause` the read or parse error.

**Throw site:** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_SSR_LOAD_FAILED

**Cause.** The Vite manifest is present, but the SSR entry module fails to load: missing build output for `ssr.entrypoint` (or, in development, no file there at all), syntax error in the bundled SSR file, or an unmet peer dependency at runtime. Distinct from `E_PHOTON_MANIFEST_MISSING` — that code fires when the manifest is absent; this one fires when the manifest is there but `import()` of the SSR entry rejects.

**Fix.**
1. Re-run `ream build` (or your project's build script) and check its output for warnings.
2. Verify the SSR entry file exists at one of the expected paths (`<ssrBuildDir>/ssr.js` or `<ssrBuildDir>/<entryName>.js`, `ssrBuildDir` defaulting to `build/ssr`).
3. If the build runs but the import still fails, inspect the bundled file for missing peer dependencies (e.g. `react-dom/server` for the React adapter).

**Throw site:** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_SSR_RENDER_FAILED

**Cause.** The SSR module loaded successfully, but its `render(pageData)` call threw or returned a non-string value. Common causes: a component throws during render, a `useEffect`-equivalent runs server-side and accesses `window`, or the SSR entry returns `undefined`.

**Fix.**
1. Read `error.cause` (or the `hint`) — it carries the original error message from the SSR module.
2. Audit the page component for browser-only globals (`window`, `document`, `localStorage`) accessed at module top level or in render.
3. Confirm the SSR entry's `render()` export returns a string (React: `renderToString(...)`; Vue: `renderToString(...)` from `@vue/server-renderer`; Svelte: `<App />.render(...).html`).

**Throw site:** `packages/photon/src/PhotonRenderer.ts`.

### E_PHOTON_HYDRATION_NO_DATA

**Cause.** The browser-side `hydrate()` call ran but no `<script id="photon-data" type="application/json">` block was found in the document. Almost always means the page was NOT rendered through `PhotonRenderer.render()` (a hand-rolled HTML response, a static file, or a 404 page).

**Fix.**
1. Confirm the route returning this page goes through `PhotonMiddleware` / `PhotonRenderer.render()`.
2. If you serve an SPA fallback, render it through Photon as well — even an empty shell needs the data block for `hydrate()` to find it.

**Throw site:** `packages/photon/src/client/boot.ts`.

### E_PHOTON_HYDRATION_BAD_DATA

**Cause.** The `<script id="photon-data">` block was found, but its contents are not a JSON object with the expected `{ component, props, url, framework }` shape. Causes: HTML mangling by a CDN / proxy that re-encodes script blocks, double-escaping by middleware that doesn't know the block is meant to be raw JSON, or a manual edit of the SSR template.

**Fix.**
1. Inspect the page source: the block content must round-trip through `JSON.parse` cleanly.
2. Disable any HTML-rewriting middleware (compression, link-rewriting, CSP nonce injection) that touches the body — verify the block remains intact in production.
3. If you customised the SSR template, keep the `<script type="application/json" id="photon-data">…</script>` block exactly as `PhotonRenderer.render()` emits it.

**Throw site:** `packages/photon/src/client/boot.ts`.

### E_PHOTON_HYDRATION_NO_TARGET

**Cause.** The hydrate target selector (default `#app`) matched no DOM node. Usually a custom `target` option that doesn't exist in the SSR HTML, or a stripped `id="app"` from a custom template.

**Fix.**
1. Confirm the SSR HTML contains the element matching `hydrate({ target })`.
2. If you customised the renderer's HTML envelope, keep the `<div id="app">…</div>` (or override `target` to match your wrapper's id).

**Throw site:** `packages/photon/src/client/boot.ts`.

### E_PHOTON_HYDRATION_UNSUPPORTED_FRAMEWORK

**Cause.** The `framework` field in the page-data block is not one of `react`, `vue`, or `svelte`. Either the SSR side wrote an unexpected value, or page-data was hand-crafted with a typo.

**Fix.**
1. Verify `PhotonConfig.framework` on the server is set to a supported value.
2. If you serialise page-data manually (rare), ensure `framework` matches the union literal exactly.

**Throw site:** `packages/photon/src/client/hydrate.ts`.

### E_PHOTON_HYDRATION_ADAPTER_LOAD_FAILED

**Cause.** Photon successfully read the page-data and dispatched to the right adapter, but the dynamic `import()` of the framework runtime rejected. Almost always a missing peer dependency: `react` + `react-dom` for React, `vue` for Vue, `svelte` for Svelte.

**Fix.**
1. Install the framework's runtime: `pnpm add react react-dom` (or `vue`, or `svelte`).
2. The thrown error's `cause` carries the original module-resolution failure — useful when the package is installed but a sub-path is missing (e.g. `react-dom/client` requires React 18+).

**Throw site:** `packages/photon/src/client/hydrate.ts`.

### E_PHOTON_UNKNOWN_ROUTE

**Cause.** A `Link`, a `Form`, `router.visit` or `urlFor` named a route the browser does not know: it is not among the routes handed over with `setRoutes()`, or `setRoutes()` was never called.

**Fix.**
1. Call `setRoutes(router.namedRoutes())` once, before the first page renders; the error's `hint` lists the routes it knows.
2. Check the name against the server's `router.as(...)`.

**Throw site:** `packages/photon/src/client/routes.ts`.

### E_PHOTON_MISSING_ROUTE_PARAMS

**Cause.** A named route has parameters (`/users/:id`) that `routeParams` did not supply. The message names them; `context` carries the route and the params given.

**Fix.** Pass every parameter of the route in `routeParams`.

**Throw site:** `packages/photon/src/client/routes.ts`.

### E_PHOTON_UNKNOWN_PAGE

**Cause.** The `resolve` given to `createPhotonApp` returned nothing for a page name — usually a path built from the name that matches no file of `import.meta.glob`.

**Fix.** Check the path `resolve` builds from the page name against your pages directory; `resolvePageComponent` throws with the path it looked for.

**Throw site:** `packages/photon/src/client/app.ts`.

### A note on hydration mismatches

Hydration mismatches (server-rendered HTML differs from the client's first render) are **not** thrown by Photon. Each framework owns this diagnostic:

- **React**: emits a `console.error` with `Hydration failed because ...`. See https://react.dev/errors/418.
- **Vue**: emits a `[Vue warn]: Hydration ...` console warning.
- **Svelte**: emits an `Error: hydration_failed` from `svelte/internal`.

If you see one, the cause is almost always a **non-deterministic render**: a `Date.now()`, `Math.random()`, `useEffect` that runs only on the client, or a `process.env` check that differs between server and browser. Photon's contract is that `render(component, props)` is pure; ensure your component is too.

## Prism Errors

The image engine reports a stable code with each failure; `/__image` answers its refusals as JSON with the status shown.

| Code | HTTP | Description |
|------|------|-------------|
| `E_PRISM_IMAGE_NO_SOURCE` | 400 | `/__image` was called without `src`. |
| `E_PRISM_IMAGE_WIDTH_NOT_ALLOWED` | 400 | `w` is not one of the configured widths. |
| `E_PRISM_IMAGE_FORMAT_NOT_ALLOWED` | 400 | `f` is not one of the configured formats. |
| `E_PRISM_IMAGE_QUALITY_NOT_ALLOWED` | 400 | `q` is not one of the configured qualities. |
| `E_PRISM_IMAGE_NOT_FOUND` | 404 | No image at `src`. |
| `E_PRISM_IMAGE_UNPROCESSABLE` | 422 | The source is not an image the endpoint can serve. |
| `E_PRISM_IMAGE_BUSY` | 503 | Too many images are being rendered; retry shortly. |
| `E_PRISM_EMPTY_INPUT` | — | The input is empty. |
| `E_PRISM_INPUT_TOO_LARGE` | — | The input is over the byte limit. |
| `E_PRISM_TOO_MANY_PIXELS` | — | The image, or an image an operation would build, is over the pixel ceiling; refused before it is allocated. |
| `E_PRISM_ZERO_DIMENSION` | — | The image has a zero width or height. |
| `E_PRISM_UNKNOWN_FORMAT` | — | The bytes are not an image format prism recognises. |
| `E_PRISM_UNSUPPORTED_FORMAT` | — | The format is recognised but not supported. |
| `E_PRISM_FORMAT_NOT_ALLOWED` | — | A real image, in a format the application chose not to decode. |
| `E_PRISM_UNREADABLE` | — | The image cannot be read. |
| `E_PRISM_DECODE_FAILED` | — | Decoding the image failed. |
| `E_PRISM_ENCODE_FAILED` | — | Encoding the output failed. |
| `E_PRISM_INVALID_GEOMETRY` | — | A geometry the image cannot satisfy: a crop outside its bounds, a target size of zero. |
| `E_PRISM_INVALID_FONT` | — | A font cannot be used. |
| `E_PRISM_COLOUR_SPACE` | — | A colour space that cannot be named, or a conversion the model refuses. |
| `E_PRISM_INVALID_OPERATION` | — | An operation lacks a field it needs, or has one out of range. |
| `E_PRISM_QR_TOO_LONG` | — | More text than a QR code can hold at the chosen level and version. |
| `E_PRISM_INVALID_QR_OPTION` | — | A QR code option out of range, or a colour that is not strict hex. |
| `E_PRISM_INTERNAL_PANIC` | — | The engine panicked; always a bug in prism. |
| `E_PRISM_ENGINE` | — | The engine failed without a known code. |
| `E_PRISM_NATIVE_REQUIRED` | — | The Rust image engine is not loaded. |

## Quasar Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_INVALID_BYTES_VALUE` | 500 | A Redis health check memory threshold cannot be read as a size. |

## Ream MCP Errors

Returned in the result of the MCP server's template tool.

| Code | HTTP | Description |
|------|------|-------------|
| `E_INKER_RENDER_TIMEOUT` | — | A template render took longer than the tool allows. |
| `E_INKER_UNKNOWN` | — | A template render failed without an inker code. |

## Relay Errors

Returned in the JSON body of the relay routes, or as an `error` event on a hub.

| Code | HTTP | Description |
|------|------|-------------|
| `E_RELAY_BAD_REQUEST` | 400 | `subscribe` without a usable `uid` or `channel` (both non-empty strings). |
| `E_RELAY_CHANNEL_TOO_LONG` | 400 | The channel name exceeds 256 characters. |
| `E_RELAY_NOT_CONNECTED` | 400 | No connection has this uid on this instance — it closed, or the request reached another instance (see *Running more than one instance*). |
| `E_RELAY_NOT_OWNER` | 403 | The connection was opened by another user; subscribe, unsubscribe and hub frames must come from the same one. |
| `E_RELAY_CHANNEL_NO_AUTHORIZER` | 403 | No `relay.authorize()` covers the channel, and `allowUnauthorizedChannels` is off. |
| `E_RELAY_CHANNEL_FORBIDDEN` | 403 | The channel's authorizer refused, or threw. |
| `E_RELAY_MAX_CHANNELS` | 429 | The connection holds `maxChannelsPerClient` channels already. |
| `E_RELAY_MAX_CLIENTS` | — | The instance holds `maxClients` connections already; sent as an `error` frame before the stream closes. |
| `E_RELAY_MAX_CLIENTS_PER_OWNER` | — | This user holds the maximum number of connections already; sent as an `error` frame before the stream closes. |
| `E_RELAY_UNKNOWN_CONNECTION` | 400 | A hub request with no valid connection token — call `<path>/negotiate` first. |
| `E_RELAY_MAX_CONNECTIONS` | 503 | A hub already has `maxConnections` open streams. |
| `E_RELAY_MAX_CONNECTIONS_PER_OWNER` | 503 | This client already has the maximum number of open hub streams. |
| `E_RELAY_MAX_PENDING` | 503 | Too many hub connections are negotiated and not yet open. |
| `E_RELAY_SHUT_DOWN` | 503 | The realtime service is shutting down. |
| `E_RELAY_UNAUTHORIZED` | — | A hub invocation needs an authenticated user, or one authenticated through another guard. |
| `E_RELAY_FORBIDDEN` | — | A hub invocation lacks the required role or permission. |
| `E_RELAY_UNKNOWN_EVENT` | — | A hub invocation names no handler. |
| `E_RELAY_HANDLER_ERROR` | — | A hub handler threw. |

## Rover Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_MAIL_INVALID_MESSAGE` | — | A message lacks what sending needs (a `from` address, a recipient…). |
| `E_MAIL_INVALID_ADDRESS` | — | An address is not a valid mail address. |
| `E_MAIL_HEADER_INJECTION` | — | A header value contains a line break or NUL. |
| `E_INVALID_LIST_HEADER` | — | A `List-*` header entry is not one URL (https, http, mailto or ftp) or bare address. |
| `E_MAIL_FIELD_UNSUPPORTED` | — | The transport cannot set a field the message uses (such as the SMTP envelope). |
| `E_ATTACHMENT_UNREADABLE` | — | An attachment's file cannot be read. |
| `E_MAIL_PROVIDER_CONFIG` | — | A transport's config is invalid. |
| `E_MAIL_PROVIDER_ERROR` | — | The transport failed to send; the error carries the provider's status or network code. |
| `E_MAIL_RETRY_CONFIG` | — | A retry setting is out of range. |
| `E_MAIL_CONFIG_MISSING` | — | No `mail` config is registered. Create `config/mail.ts`, or run `ream configure @c9up/rover`. |
| `E_MAIL_UNKNOWN_MAILER` | — | A mailer name, or the default mailer, is not configured. |
| `E_MAIL_UNKNOWN_TRANSPORT` | — | A transport type is unknown. |
| `E_MAIL_JOB_MALFORMED` | — | A queued mail job's payload is missing or not an object. |
| `E_MAIL_TEMPLATE_ENGINE` | — | The app uses inker but rover cannot render mail views with it. |
| `E_MAIL_TEMPLATE_NOT_FOUND` | — | A mail template is not found. |
| `E_MAIL_TEMPLATE_READ_ERROR` | — | A mail template cannot be read. |
| `E_MAIL_TEMPLATE_SYNTAX` | — | A mail template has a syntax error. |
| `E_MAIL_TEMPLATE_RECURSION` | — | Mail templates include each other too deep. |
| `E_MAIL_TEMPLATE_NAPI_REQUIRED` | — | There is no rover native binary for this platform. |
| `E_ASSERTION_FAILED` | — | A fake-mailer assertion on a sent message failed. |
| `E_ROVER_UNKNOWN` | — | A send failed with an error that carries no code of its own. |

## Rune Errors

Rune normalises its codes: a code that already starts with `E_` is kept, any other gets the `E_RUNE_` prefix.

| Code | HTTP | Description |
|------|------|-------------|
| `E_VALIDATION_ERROR` | 422 | `validateOrThrow()` found invalid data. Carries a `messages` array with one entry per field and rule. |
| `E_RUNE_META_REQUIRED` | — | A validator built with `withMetaData()` was called without `{ meta }`. |
| `E_RUNE_NOT_A_REGULAR_FILE` | — | A `file()` value is not a regular file, so it is not an upload. |
| `E_RUNE_INVALID_SIZE` | — | `file()` was given a size it cannot read. |
| `E_RUNE_INVALID_ERROR_REPORTER` | — | `errorReporter` takes no argument and did not return a reporter (`{ report, createError }`). |
| `E_RUNE_INVALID_RULE` | — | `use()` was given something other than a compiled rule; call the factory first. |
| `E_RUNE_NO_RULE` | — | `message()` was called before any rule. |
| `E_RUNE_NOT_AN_OBJECT` | — | `merge()` (or a similar shape method) needs an `object()` shape. |
| `E_RUNE_PARTIAL_NOT_APPLICABLE` | — | `partial()` cannot relax a shape that has groups or `allowUnknownProperties()`. |
| `E_RUNE_NO_TYPE_RULE` | — | A `unionOfTypes()` branch declares no type. |
| `E_RUNE_DUPLICATE_UNION_TYPE` | — | Two `unionOfTypes()` branches declare the same type. |
| `E_RUNE_ASYNC_RULE_NOT_AWAITED` | — | A synchronous run met an async rule. Use the async variant. |
| `E_RUNE_NO_DATABASE_RESOLVER` | — | A database rule (`unique`, `exists`) has no resolver. Call `bindDatabase()` at boot, or pass a callback. |
| `E_RUNE_NO_HOST_RESOLVER` | — | `activeUrl()` needs a host resolver. |
| `E_RUNE_UNSUPPORTED_LOCALE` | — | `mobile()` has no numbering plan for the locale. |
| `E_RUNE_UNSUPPORTED_COUNTRY` | — | A country-specific rule (`postalCode()`…) has no pattern for the country. |
| `E_RUNE_UNSUPPORTED_JSON_SCHEMA_TARGET` | — | A JSON Schema target rune does not emit. |
| `E_RUNE_NO_OUTPUT_SCHEMA` | — | A validator's output cannot be described as JSON Schema: a transform may produce anything. |
| `E_RUNE_NAPI_REQUIRED` | — | The Rust validation engine is not loaded. |
| `E_RUNE_NAPI_NOT_FOUND` | — | The Rust validation engine binary is not found. |
| `E_RUNE_NAPI_REQUEST_REFUSED` | — | The Rust validation engine refused the request. |
| `E_RUNE_NAPI_INVALID_RESPONSE` | — | The Rust validation engine returned an unexpected shape. |

## Sigil Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_SIGIL_UNKNOWN_DRIVER` | — | A hasher names a driver sigil does not know. |
| `E_SIGIL_NAPI_REQUIRED` | — | The driver needs the Rust engine, which is not loaded. |
| `E_SIGIL_NOT_BOOTED` | — | `hash.<member>` was used before `SigilProvider.boot()` ran. |

## Spectrum Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_SPECTRUM_UNKNOWN_LEVEL` | — | A transport target level is not a log level. |
| `E_SPECTRUM_UNSUPPORTED_TARGET` | — | A transport target spectrum does not build. Pass a `LogChannel` to write anywhere else. |
| `E_SPECTRUM_INVALID_FILE_OPTIONS` | — | A file destination is neither a path nor a file descriptor. |
| `E_SPECTRUM_INVALID_LINE_OPTIONS` | — | A JSON-line option is invalid. |
| `E_SPECTRUM_INVALID_REDACT_PATH` | — | A redaction path cannot be parsed. |
| `E_SPECTRUM_INVALID_STRINGIFY_LIMIT` | — | A serialisation limit is not a positive integer. |
| `E_SPECTRUM_UNSUPPORTED_OPTION` | — | A logger option spectrum does not support. |
| `E_SPECTRUM_LOGGER_NOT_BOUND` | — | The container resolved something other than a `Logger` for the `Logger` token. |

## Station Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_STATION_LOGIN_CREDENTIALS_REQUIRED` | 400 | The admin sign-in form was sent without an email or a password. |
| `E_STATION_INVALID_CREDENTIALS` | 401 | Invalid email or password. |
| `E_STATION_TOO_MANY_LOGIN_ATTEMPTS` | 429 | Too many sign-in attempts; try again later. |
| `E_STATION_LOGIN_UNAVAILABLE` | 503 | Sign-in is temporarily unavailable. |
| `E_STATION_CSRF_REQUIRED` | 403 | An admin action requires an active, verified CSRF token. |
| `E_VALIDATION_ERROR` | 422 | An admin form failed validation (JSON clients; a browser is redirected back). |

## Transit Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_TRANSIT_INVALID_XML` | — | A provider answered XML that cannot be parsed, or that uses a construct transit refuses. |

## Vellum Errors

Vellum normalises its codes: a code that already starts with `E_` is kept, any other gets the `E_VELLUM_` prefix.

| Code | HTTP | Description |
|------|------|-------------|
| `E_VELLUM_INVALID_PDF` | — | The bytes are not a PDF vellum can read. |
| `E_VELLUM_SIGNED_DOCUMENT` | — | An edit would invalidate the document's signatures; refused unless the caller says they may go. |
| `E_VELLUM_INVALID_PAGE` | — | A page number is not a whole number from 1. |
| `E_VELLUM_INVALID_ROTATION` | — | A rotation is not a multiple of 90. |
| `E_VELLUM_EMPTY_MERGE` | — | `merge()` was given no document. |
| `E_VELLUM_EMPTY_SELECTION` | — | Selecting needs at least one page. |
| `E_VELLUM_MERGE_FAILED` | — | Merging documents failed. |
| `E_VELLUM_SELECT_FAILED` | — | Selecting pages failed. |
| `E_VELLUM_SPLIT_FAILED` | — | Splitting the document failed. |
| `E_VELLUM_ROTATE_FAILED` | — | Rotating pages failed. |
| `E_VELLUM_STAMP_FAILED` | — | Stamping an image failed. |
| `E_VELLUM_STAMP_TEXT_FAILED` | — | Stamping text failed. |
| `E_VELLUM_FILL_FAILED` | — | Filling the form failed. |
| `E_VELLUM_FLATTEN_FAILED` | — | Flattening the form failed. |
| `E_VELLUM_RENDER_FAILED` | — | Rendering a page to an image failed. |
| `E_VELLUM_EXTRACT_FAILED` | — | Extracting text failed. |
| `E_VELLUM_WRITE_FAILED` | — | Writing the document failed. |
| `E_VELLUM_SIGN_FAILED` | — | Signing the document failed. |
| `E_VELLUM_VERIFY_FAILED` | — | Verifying the signatures failed. |
| `E_VELLUM_UNKNOWN_SIGNER` | — | No signer of this name is configured. |
| `E_VELLUM_SIGNER_INVALID` | — | A signer's key or certificate is empty. |
| `E_VELLUM_TIMESTAMP_FAILED` | — | Building or reading a timestamp failed. |
| `E_VELLUM_TIMESTAMP_UNREACHABLE` | — | The timestamp authority could not be reached. |
| `E_VELLUM_TIMESTAMP_REFUSED` | — | The timestamp authority answered with an error status. |
| `E_VELLUM_FONT_UNREADABLE` | — | A configured font file cannot be read. |
| `E_VELLUM_FILE_NOT_FOUND` | — | A file given by path cannot be read. |
| `E_VELLUM_INVALID_OPTIONS` | — | A document, page, table or drawing option is invalid. |
| `E_VELLUM_INVALID_COLOR` | — | A colour cannot be read. |
| `E_VELLUM_INVALID_IMAGE` | — | An image cannot be used (unreadable, or opened by another document). |
| `E_VELLUM_INVALID_SVG` | — | An SVG cannot be used; pass a file as a URL or as its bytes. |
| `E_VELLUM_UNSUPPORTED_CONTENT` | — | A path holds an operator vellum does not draw. |
| `E_VELLUM_INVALID_STRUCTURE` | — | A structure element was changed after it ended. |
| `E_VELLUM_NO_PAGE` | — | There is no current page; call `addPage()` first. |
| `E_VELLUM_NO_FORM` | — | Form fields were added before `initForm()`. |
| `E_VELLUM_DOCUMENT_ENDED` | — | The document has ended; nothing more can be added to it. |
| `E_VELLUM_NAPI_REQUIRED` | — | The Rust PDF engine is not loaded. |

## Visa Errors

| Code | HTTP | Description |
|------|------|-------------|
| `E_UNAUTHORIZED_ACCESS` | 403 | `currentAccessToken.authorize()` found a token too narrow for the ability asked. 403, not 401: the request is authenticated (`insufficient_scope`). |
| `E_VISA_MISSING_ISSUER` | — | No `issuer` is configured. |
| `E_VISA_INVALID_ISSUER` | — | The `issuer` is not a URL. |
| `E_VISA_INSECURE_ISSUER` | — | The `issuer` is not https (localhost excepted). |
| `E_VISA_NO_REDIRECT_URI` | — | A client was registered without a redirect URI. |
| `E_VISA_INVALID_REDIRECT_URI` | — | A redirect URI is not a complete URL. |
| `E_VISA_INVALID_INITIAL_ACCESS_TOKEN` | — | `registration.initialAccessToken` is empty, which would accept an empty bearer token. |
| `E_VISA_INVALID_SECRET_TTL` | — | `registration.secretTtlSeconds` is not a positive whole number of seconds. |
| `E_VISA_STORE_READ_ONLY` | — | The client store cannot register clients. |

## Warden Errors

Warden normalises its codes: a code that already starts with `E_` is kept, any other gets the `E_WARDEN_` prefix.

| Code | HTTP | Description |
|------|------|-------------|
| `E_UNAUTHORIZED_ACCESS` | 401 | No guard authenticated the request. A guarded route answers with this code. |
| `E_INVALID_CREDENTIALS` | 400 | The error class a login flow throws when the credentials do not match. |
| `E_WARDEN_AUTH_STRATEGY_ERROR` | 500 | Every attempted guard crashed (a database down, a bug): a server incident, distinct from a credential rejection. |
| `E_WARDEN_FORBIDDEN` | 403 | The user lacks a permission or a role a route declares. |
| `E_WARDEN_MFA_REQUIRED` | 403 | The route declares `@RequireMfa` and the user has not passed the step-up. |
| `E_WARDEN_AUTHORIZATION_FAILURE` | 403 | A bouncer ability or policy denied the action (403 unless the policy gives another status). |
| `E_WARDEN_UNAUTHORIZED` | 401 | The standalone `expressMiddleware()` found no token or refused it. |
| `E_WARDEN_AUTH_ERROR` | 500 | The standalone `expressMiddleware()` failed internally. |
| `E_WARDEN_NO_AUTH_CONFIG` | — | `WardenProvider` booted without any guard configured. |
| `E_WARDEN_NAPI_REQUIRED` | — | The Rust JWT engine is not loaded. |
| `E_WARDEN_NOT_BOOTED` | — | The `AuthManager` singleton was used before `WardenProvider.boot()` ran. |
| `E_WARDEN_AUTH_NOT_REGISTERED` | — | `AuthManager` is not in the container; add `WardenProvider` to the providers. |
| `E_WARDEN_INVALID_CONFIG` | — | A guard, token, MFA or rate-limit setting is invalid. |
| `E_WARDEN_STRATEGY_NOT_FOUND` | — | A guard name is not configured. |
| `E_WARDEN_STRATEGY_CANNOT_ISSUE` | — | `issueFor()` on a guard that does not mint tokens. |
| `E_WARDEN_STRATEGY_CANNOT_LOGIN` | — | `login()` / `logout()` on a stateless guard (JWT, API key). |
| `E_WARDEN_STRATEGY_HAS_NO_CLIENT` | — | A guard has no `authenticateAsClient()`, so it cannot forge a client request in tests. |
| `E_WARDEN_USE_LOGIN` | — | The session guard has no credential step. Verify the password yourself, then call `login(user)`. |
| `E_WARDEN_NO_SESSION` | — | A session guard's `login()` / `logout()` ran without `ctx.session`; register the session middleware first. |
| `E_WARDEN_REMEMBER_ME_UNAVAILABLE` | — | Remember-me was asked and no remember-me tokens are configured. |
| `E_WARDEN_TOKEN_TTL_INVALID` | — | A refresh token TTL is not a positive finite number. |
| `E_WARDEN_OTP_STORE_FULL` | — | The in-memory OTP store holds its maximum of pending challenges. |
| `E_WARDEN_OTP_STORE_CONTRACT` | — | The OTP challenge store does not implement `take()`. |
| `E_WARDEN_WEBAUTHN_STORE_FULL` | — | The in-memory WebAuthn challenge store holds its maximum of pending ceremonies. |
| `E_WARDEN_STORE_TTL_INVALID` | — | A challenge store `ttlMs` is not a positive integer. |
| `E_WARDEN_STORE_LIMIT_INVALID` | — | A challenge store `maxEntries` is not a positive integer. |
| `E_WARDEN_WEBAUTHN_CREDENTIAL_EXISTS` | — | The WebAuthn credential id is already registered; registration answers `{ verified: false }`. |
| `E_WARDEN_INVALID_CREDENTIAL` | — | A stored WebAuthn public key is malformed. |
| `E_WARDEN_INVALID_ABILITY` | — | `Bouncer.ability()` was given options without a callback. |
| `E_WARDEN_UNKNOWN_ABILITY` | — | No ability of this name is registered on the bouncer. |
| `E_WARDEN_UNKNOWN_POLICY` | — | No policy of this name is registered on the bouncer. |
| `E_WARDEN_UNKNOWN_POLICY_ACTION` | — | A policy has no method for the action. |
| `E_WARDEN_POLICY_RESOLUTION_FAILED` | — | The container resolved a policy to something that is not an instance of its class. |
| `E_WARDEN_TEMPLATE_ENGINE_UNUSABLE` | — | The template engine is installed but `@can` / `@cannot` cannot be registered on it. |
