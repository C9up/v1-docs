# Errors

This guide covers every error code:

- Error Format
- Container Errors
- Router Errors
- WebSocket Errors
- Pipeline Errors
- HTTP Errors
- Session Errors
- Application Errors
- Console Errors
- Scheduler Errors
- Event Errors
- RPC and GraphQL Errors
- HTTP Client Errors
- Archive Errors
- Atlas Errors
- Aurora Errors
- Blackhole Errors
- Chronos Errors
- Comet Errors
- Echo Errors
- Eclipse Errors
- Eon Errors
- Ephemeris Errors
- Goldstone Errors
- Helix Plugin Errors
- Inker Errors
- Lumen Errors
- Neutrino Errors
- Nova Errors
- Orbit Errors
- Orbit Clipboard Errors
- Orbit Secure Store Errors
- Parsec Errors
- Photon Errors
- Prism Errors
- Quasar Errors
- Ream MCP Errors
- Relay Errors
- Robledo Errors
- Rover Errors
- Rune Errors
- Sigil Errors
- Spectrum Errors
- Station Errors
- Transit Errors
- Vellum Errors
- Visa Errors
- Warden Errors

Every framework error carries a stable `code` that starts with `E_`. A package's
own codes add the package name (`E_ATLAS_EMPTY_SELECT`, `E_WARDEN_FORBIDDEN`); a
few shared identifiers keep a plain form (`E_ROW_NOT_FOUND`,
`E_UNAUTHORIZED_ACCESS`, `E_VALIDATION_ERROR`). Search for the code below: each
one has its own anchor, the code in lower case with `-` for `_`
(`#e-atlas-empty-select`), and that is where an error's `docsUrl` points.

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
│ Docs: https://r-eam.com/en/reference/errors#e-container-not-found
└──────────────────────────────────────────────┘
```

An error raised inside the request pipeline adds a `Pipeline: <n>/<total> (<stage>)`
line. In production mode, only the code and message are shown.

An HTTP error answers with `{ "error": { "code": "…", "message": "…" } }` and the
error's `status`.

## Container Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-container-not-found"></span>`E_CONTAINER_NOT_FOUND` | — | No binding found for the requested token. Includes "did you mean?" suggestions for typos. Register it with `container.singleton()` or decorate the class with `@inject()`. |
| <span id="e-circular-dependency"></span>`E_CIRCULAR_DEPENDENCY` | — | Circular dependency (or circular alias) detected during resolution. Use explicit factories or decouple via events. |
| <span id="e-container-missing-metadata"></span>`E_CONTAINER_MISSING_METADATA` | — | A class declares constructor parameters but the container finds no dependency metadata for them. Enable decorator metadata, annotate the parameters with `@inject()`, or declare `static containerInjections`. |
| <span id="e-container-reserved-token"></span>`E_CONTAINER_RESERVED_TOKEN` | — | The token name reads as an `Object.prototype` key (`constructor`, `__proto__`…). Pick another name. |

## Router Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-route-not-found"></span>`E_ROUTE_NOT_FOUND` | 404 | No route matches the requested method and path. |
| <span id="e-duplicate-route"></span>`E_DUPLICATE_ROUTE` | — | Two routes declare the same method and path. |
| <span id="e-duplicate-route-name"></span>`E_DUPLICATE_ROUTE_NAME` | — | Two routes carry the same name. |
| <span id="e-missing-route-name"></span>`E_MISSING_ROUTE_NAME` | — | A named group prefixes a route that has no name of its own. Name every route of a named group. |
| <span id="e-invalid-route-domain"></span>`E_INVALID_ROUTE_DOMAIN` | — | A route domain has a parameter without a name, or the same parameter twice. |
| <span id="e-unregistered-controller"></span>`E_UNREGISTERED_CONTROLLER` | — | A route names a controller by string that is not registered. |
| <span id="e-no-view-engine"></span>`E_NO_VIEW_ENGINE` | — | `router.on(path).render()` was used and no template engine is installed. |
| <span id="e-validator-not-found"></span>`E_VALIDATOR_NOT_FOUND` | — | A route names a validator that is not registered. |

## WebSocket Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-websocket-upgrade-required"></span>`E_WEBSOCKET_UPGRADE_REQUIRED` | 426 | A plain request reached a WebSocket route. |
| <span id="e-websocket-unsupported"></span>`E_WEBSOCKET_UNSUPPORTED` | 501 | A WebSocket route was reached on a server that cannot hold WebSockets. |
| <span id="e-websocket-bad-handshake"></span>`E_WEBSOCKET_BAD_HANDSHAKE` | 400 | The handshake is not an HTTP/1.1 GET, lacks `Connection: upgrade`, or its `Sec-WebSocket-Key` is not 16 bytes. Answered by the server, before routing. |
| <span id="e-websocket-version"></span>`E_WEBSOCKET_VERSION` | 426 | A WebSocket version other than 13. Answered with `Sec-WebSocket-Version: 13`, before routing. |
| <span id="e-websocket-origin"></span>`E_WEBSOCKET_ORIGIN` | 403 | A browser origin that `http.webSocket.allowedOrigins` does not allow (same origin by default). Answered before routing. |
| <span id="e-websocket-protocol"></span>`E_WEBSOCKET_PROTOCOL` | 500 | `socket.acceptProtocol()` named a subprotocol the client did not offer. |
| <span id="e-websocket-not-registered"></span>`E_WEBSOCKET_NOT_REGISTERED` | 500 | A response was `101` without a registered socket. |
| <span id="e-websocket-not-upgrade"></span>`E_WEBSOCKET_NOT_UPGRADE` | 500 | A `101` answered a request that was not a WebSocket handshake. |
| <span id="e-websocket-register"></span>`E_WEBSOCKET_REGISTER` | — | The native server refused a fresh socket id. |
| <span id="e-websocket-context"></span>`E_WEBSOCKET_CONTEXT` | — | A WebSocket route's handler ran without its socket (called outside the kernel). |
| <span id="e-websocket-close-code"></span>`E_WEBSOCKET_CLOSE_CODE` | — | `socket.close()` with a code a close frame may not carry (RFC 6455 §7.4). |
| <span id="e-websocket-close-reason"></span>`E_WEBSOCKET_CLOSE_REASON` | — | A close reason over 123 bytes. |
| <span id="e-invalid-websocket-config"></span>`E_INVALID_WEBSOCKET_CONFIG` | — | A native WebSocket limit of 0 bytes. |

## Pipeline Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-pipeline-unknown-middleware"></span>`E_PIPELINE_UNKNOWN_MIDDLEWARE` | — | A route references a named middleware that is not registered. Register it with `middleware.register()`. |
| <span id="e-middleware-not-found"></span>`E_MIDDLEWARE_NOT_FOUND` | — | A named middleware could not be resolved when the pipeline was built. Register it with `middleware.register()`. |
| <span id="e-middleware-entry"></span>`E_MIDDLEWARE_ENTRY` | — | A middleware entry with no declared parameters was read as a lazy import, and it did not resolve to a module with a default export. |
| <span id="e-pipeline-double-next"></span>`E_PIPELINE_DOUBLE_NEXT` | — | A middleware called `next()` more than once. Each middleware should call `next()` at most once. |
| <span id="e-pipeline-error"></span>`E_PIPELINE_ERROR` | — | A handler threw an error that carries no framework code. The error keeps the stage position in its context. |
| <span id="e-validator-unusable"></span>`E_VALIDATOR_UNUSABLE` | — | A route validator exposes none of `validateResultAsync()`, `validateResult()` or `validate()`. |

## HTTP Errors

Raised by `@c9up/ream`'s exceptions and its native HTTP server. The server's own refusals are answered before any middleware runs.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-unknown"></span>`E_UNKNOWN` | 500 | The default code of an `Exception` that sets none, and of an error rebuilt from the native layer without a code. |
| <span id="e-runtime-exception"></span>`E_RUNTIME_EXCEPTION` | 500 | `RuntimeException`: a failure of the program, not of the request. |
| <span id="e-invalid-arguments"></span>`E_INVALID_ARGUMENTS` | 500 | `InvalidArgumentsException`: a function was called with arguments it cannot use. |
| <span id="e-http-exception"></span>`E_HTTP_EXCEPTION` | varies | A generic HTTP error that answers with the status it was built with. |
| <span id="e-http-request-aborted"></span>`E_HTTP_REQUEST_ABORTED` | 400 | `response.abort()` (or `abortIf` / `abortUnless`) stopped the request; the body given is sent with the status given, 400 by default. |
| <span id="e-unauthorized"></span>`E_UNAUTHORIZED` | 401 | The request is not authenticated. |
| <span id="e-forbidden"></span>`E_FORBIDDEN` | 403 | The request is authenticated but not allowed. |
| <span id="e-row-not-found"></span>`E_ROW_NOT_FOUND` | 404 | A record that must exist was not found. |
| <span id="e-validation-error"></span>`E_VALIDATION_ERROR` | 422 | The request data failed validation. The body carries one message per field and rule; a browser form is redirected back with the errors flashed. |
| <span id="e-request-entity-too-large"></span>`E_REQUEST_ENTITY_TOO_LARGE` | 413 | The request body is over the body parser's limit. Reading the raw body of such a request raises it too. |
| <span id="e-handler-failure"></span>`E_HANDLER_FAILURE` | 500 | The exception handler itself threw while rendering an error. |
| <span id="e-http-context-not-found"></span>`E_HTTP_CONTEXT_NOT_FOUND` | — | `HttpContext.getOrFail()` was called outside a request, or with ambient-context tracking turned off. Pass `ctx` explicitly. |
| <span id="e-response-too-large"></span>`E_RESPONSE_TOO_LARGE` | — | A response body is over the configured ceiling. Bodies are held whole in memory, so a large file should be streamed or served from storage. |
| <span id="e-bodyparser-config"></span>`E_BODYPARSER_CONFIG` | — | The body parser config uses an option that is no longer supported. |
| <span id="e-bodyparser-invalid-size"></span>`E_BODYPARSER_INVALID_SIZE` | — | A body size limit is neither a number of bytes nor a size such as `'1mb'`. |
| <span id="e-bodyparser-invalid-json"></span>`E_BODYPARSER_INVALID_JSON` | 400 / 422 | A JSON body is malformed (400), or under `json.strict` is neither an object nor an array (422). |
| <span id="e-http-request-timeout"></span>`E_HTTP_REQUEST_TIMEOUT` | 408 | The native server did not receive the request body in time. |
| <span id="e-request-aborted"></span>`E_REQUEST_ABORTED` | 400 | The client closed the connection while the body was being read. |
| <span id="e-bad-multipart"></span>`E_BAD_MULTIPART` | 400 | A `multipart/form-data` body is malformed, or its `boundary` parameter is missing. |
| <span id="e-path-traversal"></span>`E_PATH_TRAVERSAL` | 400 | The native server found `..` in the path, raw or percent-encoded. |
| <span id="e-parameter-pollution"></span>`E_PARAMETER_POLLUTION` | 400 | The native server found a query-string key twice. |
| <span id="e-too-many-requests"></span>`E_TOO_MANY_REQUESTS` | 429 | The native server's rate limit refused the request; the body carries `retryAfter`, with `Retry-After` and `X-RateLimit-*` headers. |
| <span id="e-stream-unknown"></span>`E_STREAM_UNKNOWN` | 500 | A server-sent event stream id is unknown to the server. |

## Session Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-session-not-ready"></span>`E_SESSION_NOT_READY` | 500 | `session.<method>()` needs a session store, and this session was built without one. |
| <span id="e-session-store-not-configured"></span>`E_SESSION_STORE_NOT_CONFIGURED` | 500 | The session config names no store. Set `store`, or `store: 'memory'` for sessions kept in this process only. |
| <span id="e-session-store-not-conditional"></span>`E_SESSION_STORE_NOT_CONDITIONAL` | 500 | The store has no `update()`, so it cannot write a session back only while it still exists; a request running across a logout could sign the user in again. |
| <span id="e-session-tagging-not-supported"></span>`E_SESSION_TAGGING_NOT_SUPPORTED` | 500 | A session tagging method was called on a store that does not support it. Use the memory, redis or database store. |
| <span id="e-session-cookie-not-http-only"></span>`E_SESSION_COOKIE_NOT_HTTP_ONLY` | 500 | The session cookie is configured with `httpOnly: false`. Remove it: a script able to read the cookie turns any XSS into an account takeover. |
| <span id="e-session-template-engine-unusable"></span>`E_SESSION_TEMPLATE_ENGINE_UNUSABLE` | — | The template engine is installed but the session tags cannot be registered on it. |

## Application Errors

Raised while the application is assembled, configured and started.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-invalid-env-variables"></span>`E_INVALID_ENV_VARIABLES` | — | `Env.create()` found environment variables that fail their schema. The message lists each one. |
| <span id="e-missing-app-key"></span>`E_MISSING_APP_KEY` | — | Encryption was used and `APP_KEY` is not set (at least 16 characters). |
| <span id="e-insecure-app-key"></span>`E_INSECURE_APP_KEY` | — | `APP_KEY` is not usable for signing: too short, or a key known from scaffolding or documentation. |
| <span id="e-reamrc-unknown-option"></span>`E_REAMRC_UNKNOWN_OPTION` | — | `reamrc.ts` `tests` holds an option that does not exist. |
| <span id="e-ignitor-already-started"></span>`E_IGNITOR_ALREADY_STARTED` | — | `warmUp()` was called while the application was already past that phase. |
| <span id="e-ignitor-warmup-only"></span>`E_IGNITOR_WARMUP_ONLY` | — | An application assembled with `warmUp()` was started. Build a fresh Ignitor to run one. |
| <span id="e-ignitor-invalid-port"></span>`E_IGNITOR_INVALID_PORT` | — | `PORT` is not an integer between 0 and 65535. |
| <span id="e-ignitor-invalid-http-config"></span>`E_IGNITOR_INVALID_HTTP_CONFIG` | — | An `http.<key>` limit is not a whole number in range. |
| <span id="e-ignitor-no-server-factory"></span>`E_IGNITOR_NO_SERVER_FACTORY` | — | `httpServer()` was called with no `serverFactory` in the config. |
| <span id="e-ignitor-grpc-unsupported"></span>`E_IGNITOR_GRPC_UNSUPPORTED` | — | A gRPC handler is registered, but this server cannot serve gRPC. |
| <span id="e-server-grpc-already-set"></span>`E_SERVER_GRPC_ALREADY_SET` | — | A second gRPC handler was registered on the server. |
| <span id="e-server-grpc-invalid-limit"></span>`E_SERVER_GRPC_INVALID_LIMIT` | — | A gRPC message size limit is not a whole number of bytes, or `-1` for no limit. |
| <span id="e-ream-stub-syntax"></span>`E_REAM_STUB_SYNTAX` | — | A stub template has a syntax error. |
| <span id="e-env-file-not-found"></span>`E_ENV_FILE_NOT_FOUND` | — | A `.env` value `file:<path>` names a file that does not exist. The message names the variable and the path. |
| <span id="e-env-circular-reference"></span>`E_ENV_CIRCULAR_REFERENCE` | — | `.env` values reference each other in a loop (`A=$B`, `B=$A`). |
| <span id="e-identifier-already-defined"></span>`E_IDENTIFIER_ALREADY_DEFINED` | — | `Env.defineIdentifier()` was given a name already registered (`file` is built in). Use `defineIdentifierIfMissing()` or remove the identifier first. |
| <span id="e-app-missing-importer"></span>`E_APP_MISSING_IMPORTER` | — | `app.import()` / `app.importDefault(id)` was called on an application built without an `importer`. |
| <span id="e-dump-die-exception"></span>`E_DUMP_DIE_EXCEPTION` | 500 | `dd()` stopped the request (answered with an HTML dump) or the command (printed the dump). Never reported. |

## Console Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-console-command-not-found"></span>`E_CONSOLE_COMMAND_NOT_FOUND` | — | No command has this name. |
| <span id="e-console-missing-argument"></span>`E_CONSOLE_MISSING_ARGUMENT` | — | A required argument was not given. |
| <span id="e-console-missing-argument-value"></span>`E_CONSOLE_MISSING_ARGUMENT_VALUE` | — | An argument was given with no value. |
| <span id="e-console-unexpected-argument"></span>`E_CONSOLE_UNEXPECTED_ARGUMENT` | — | More arguments than the command declares. |
| <span id="e-console-unknown-flag"></span>`E_CONSOLE_UNKNOWN_FLAG` | — | A flag the command does not declare. |
| <span id="e-console-missing-flag"></span>`E_CONSOLE_MISSING_FLAG` | — | A required flag was not given. |
| <span id="e-console-missing-flag-value"></span>`E_CONSOLE_MISSING_FLAG_VALUE` | — | A flag that takes a value was given without one. |
| <span id="e-console-invalid-flag-value"></span>`E_CONSOLE_INVALID_FLAG_VALUE` | — | A flag value of the wrong type. |
| <span id="e-console-invalid-flag-group"></span>`E_CONSOLE_INVALID_FLAG_GROUP` | — | Short flags were grouped (`-abc`) with one that cannot be grouped. |
| <span id="e-console-not-interactive"></span>`E_CONSOLE_NOT_INTERACTIVE` | — | A command asked a question while stdin is not interactive. Pass the value as a flag. |
| <span id="e-console-prompt-cancelled"></span>`E_CONSOLE_PROMPT_CANCELLED` | — | The user cancelled a prompt. |
| <span id="e-console-empty-choices"></span>`E_CONSOLE_EMPTY_CHOICES` | — | A choice prompt was asked with no options. |
| <span id="e-console-invalid-trap-value"></span>`E_CONSOLE_INVALID_TRAP_VALUE` | — | A scripted answer (a prompt trap in a test) was rejected by the prompt's own validation. |
| <span id="e-console-trap-out-of-range"></span>`E_CONSOLE_TRAP_OUT_OF_RANGE` | — | A prompt trap chose an option that was not offered. |
| <span id="e-console-duplicate-command"></span>`E_CONSOLE_DUPLICATE_COMMAND` | — | Two commands claim the same name. |
| <span id="e-console-invalid-command"></span>`E_CONSOLE_INVALID_COMMAND` | — | An entry of `reamrc.ts` `commands` is neither a command loader nor a default-exported command class. |
| <span id="e-console-invalid-command-metadata"></span>`E_CONSOLE_INVALID_COMMAND_METADATA` | — | A command loader exported metadata that does not describe a command. |
| <span id="e-console-invalid-argument"></span>`E_CONSOLE_INVALID_ARGUMENT` | — | A command declares its arguments in an order that cannot be parsed: an argument after a spread one, or a required one after an optional one. |
| <span id="e-console-invalid-alias"></span>`E_CONSOLE_INVALID_ALIAS` | — | A command alias expands to nothing. |
| <span id="e-console-late-global-flag"></span>`E_CONSOLE_LATE_GLOBAL_FLAG` | — | A global flag was declared after the kernel started. |
| <span id="e-console-late-loader"></span>`E_CONSOLE_LATE_LOADER` | — | A command loader was added after the kernel started. |
| <span id="e-console-kernel-running"></span>`E_CONSOLE_KERNEL_RUNNING` | — | A command is already running through this kernel. |
| <span id="e-console-kernel-completed"></span>`E_CONSOLE_KERNEL_COMPLETED` | — | The kernel has finished; it cannot run another command line. |
| <span id="e-console-not-booted"></span>`E_CONSOLE_NOT_BOOTED` | — | A console application method was called before the commands were loaded. |
| <span id="e-console-no-app"></span>`E_CONSOLE_NO_APP` | — | A command needs the application and the kernel has none. Dispatch through the Ignitor's console kernel. |
| <span id="e-console-app-not-started"></span>`E_CONSOLE_APP_NOT_STARTED` | — | A command used the application without declaring `startApp: true` in its options. |

## Scheduler Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-schedule-invalid-cron"></span>`E_SCHEDULE_INVALID_CRON` | — | A scheduled task's cron expression could not be registered. |
| <span id="e-schedule-invalid-target"></span>`E_SCHEDULE_INVALID_TARGET` | — | `@Schedule` was put on a static method. |
| <span id="e-schedule-symbol-method"></span>`E_SCHEDULE_SYMBOL_METHOD` | — | `@Schedule` was put on a symbol-keyed method. |
| <span id="e-schedule-anonymous-class"></span>`E_SCHEDULE_ANONYMOUS_CLASS` | — | An anonymous class declares `@Schedule`; its task names would collide. |
| <span id="e-schedule-method-not-found"></span>`E_SCHEDULE_METHOD_NOT_FOUND` | — | A scheduled method is not callable on the instance the container resolved. |
| <span id="e-schedule-invalid-callback"></span>`E_SCHEDULE_INVALID_CALLBACK` | — | `Scheduler.register()` was given something other than a function. |
| <span id="e-schedule-invalid-task-name"></span>`E_SCHEDULE_INVALID_TASK_NAME` | — | `Scheduler.register()` was given an empty task name. |
| <span id="e-schedule-invalid-lock-backend"></span>`E_SCHEDULE_INVALID_LOCK_BACKEND` | — | `lockBackend` does not implement `acquire(name, ttlMs)` and `release(name)`. |
| <span id="e-schedule-invalid-lock-ttl"></span>`E_SCHEDULE_INVALID_LOCK_TTL` | — | `defaultLockTtlMs` is not a finite positive number. |
| <span id="e-schedule-invalid-event-sink"></span>`E_SCHEDULE_INVALID_EVENT_SINK` | — | `eventSink` does not implement `emit(event)`. |
| <span id="e-schedule-invalid-error-reporter"></span>`E_SCHEDULE_INVALID_ERROR_REPORTER` | — | `errorReporter` is not a function. |
| <span id="e-schedule-task-unknown"></span>`E_SCHEDULE_TASK_UNKNOWN` | — | `runTaskNow()` named a task that is not registered. |
| <span id="e-schedule-task-timeout"></span>`E_SCHEDULE_TASK_TIMEOUT` | — | A task did not complete within its `timeoutMs`; it keeps running in the background. |
| <span id="e-schedule-provider-already-registered"></span>`E_SCHEDULE_PROVIDER_ALREADY_REGISTERED` | — | The scheduler provider was registered twice on the same container. |
| <span id="e-scheduler-native-error"></span>`E_SCHEDULER_NATIVE_ERROR` | — | A call into the native scheduler failed. |

## Event Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-events-unsupported-store"></span>`E_EVENTS_UNSUPPORTED_STORE` | — | `config/events.ts` names a `store` other than `'memory'`, the only one this build has. |
| <span id="e-events-unsupported-option"></span>`E_EVENTS_UNSUPPORTED_OPTION` | — | `config/events.ts` holds an option nothing reads (`retries` included), or is not an object. |

## RPC and GraphQL Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-rpc-invalid-method-name"></span>`E_RPC_INVALID_METHOD_NAME` | — | An RPC method name is empty or not a string. |
| <span id="e-rpc-reserved-method-name"></span>`E_RPC_RESERVED_METHOD_NAME` | — | An RPC method takes a reserved name (`rpc.*`). |
| <span id="e-rpc-unknown-controller-method"></span>`E_RPC_UNKNOWN_CONTROLLER_METHOD` | — | An RPC route names a controller method that does not exist. |
| <span id="e-rpc-provider-already-registered"></span>`E_RPC_PROVIDER_ALREADY_REGISTERED` | — | The RPC provider was registered twice on the same container. |
| <span id="e-graphql-provider-already-registered"></span>`E_GRAPHQL_PROVIDER_ALREADY_REGISTERED` | — | The GraphQL provider was registered twice on the same container. |

## HTTP Client Errors

Raised by the outbound HTTP client.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-http-client-invalid-url"></span>`E_HTTP_CLIENT_INVALID_URL` | — | The URL cannot be parsed, is not http or https, or carries credentials (send them in a header). |
| <span id="e-http-client-private-address"></span>`E_HTTP_CLIENT_PRIVATE_ADDRESS` | — | The host is, or resolves to, an address that is not public. |
| <span id="e-http-client-unreachable"></span>`E_HTTP_CLIENT_UNREACHABLE` | — | The host could not be reached. |
| <span id="e-http-client-timed-out"></span>`E_HTTP_CLIENT_TIMED_OUT` | — | The request did not complete within its timeout. |
| <span id="e-http-client-too-large"></span>`E_HTTP_CLIENT_TOO_LARGE` | — | The response body is over the size limit. |
| <span id="e-http-client-redirect-refused"></span>`E_HTTP_CLIENT_REDIRECT_REFUSED` | — | A redirect was refused: too many of them, from https to http, or to another host. |

## Archive Errors

Raised by `@c9up/archive`. The signed-file route answers its refusals as JSON with the status shown.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-archive-invalid-signature"></span>`E_ARCHIVE_INVALID_SIGNATURE` | 403 | The signed URL's signature is missing a part, malformed or does not match. |
| <span id="e-archive-expired-signature"></span>`E_ARCHIVE_EXPIRED_SIGNATURE` | 403 | The signed URL has expired. |
| <span id="e-archive-access-denied"></span>`E_ARCHIVE_ACCESS_DENIED` | 403 | An unsigned request asked for a private file. |
| <span id="e-archive-invalid-key"></span>`E_ARCHIVE_INVALID_KEY` | 403 | The signed route refused the path: a key with traversal or characters keys may not hold. |
| <span id="e-archive-not-found"></span>`E_ARCHIVE_NOT_FOUND` | 404 | No file is stored under the key. The signed route answers 404; a driver call throws it. |
| <span id="e-archive-path-traversal-detected"></span>`E_ARCHIVE_PATH_TRAVERSAL_DETECTED` | — | A key resolves outside the disk root. |
| <span id="e-archive-unallowed-characters"></span>`E_ARCHIVE_UNALLOWED_CHARACTERS` | — | A key holds characters a key may not hold. |
| <span id="e-archive-invalid-expiry"></span>`E_ARCHIVE_INVALID_EXPIRY` | — | A signed URL expiry is not a positive duration (a number of seconds or a string such as `'30mins'`). |
| <span id="e-archive-signing-disabled"></span>`E_ARCHIVE_SIGNING_DISABLED` | — | `getSignedUrl()` was called on a local disk built without a `signingSecret`. |
| <span id="e-archive-weak-signing-secret"></span>`E_ARCHIVE_WEAK_SIGNING_SECRET` | — | The local disk's `signingSecret` is shorter than 16 characters. |
| <span id="e-archive-signed-upload-unsupported"></span>`E_ARCHIVE_SIGNED_UPLOAD_UNSUPPORTED` | — | The local disk has no presigned upload URL; only cloud disks do. |
| <span id="e-archive-invalid-header-value"></span>`E_ARCHIVE_INVALID_HEADER_VALUE` | — | A value to sign as a response header holds a control character. |
| <span id="e-archive-invalid-route-base-path"></span>`E_ARCHIVE_INVALID_ROUTE_BASE_PATH` | — | The local disk's `routeBasePath` is not an absolute URL path such as `/storage`. |
| <span id="e-archive-prefix-mismatch"></span>`E_ARCHIVE_PREFIX_MISMATCH` | — | `createSignedRouteHandler()` was given a prefix that differs from the disk's `routeBasePath`, so no signed URL could reach it. |
| <span id="e-archive-visibility-corrupt"></span>`E_ARCHIVE_VISIBILITY_CORRUPT` | — | A file's visibility record cannot be read; archive refuses to treat the file as public. |
| <span id="e-archive-visibility-move-failed"></span>`E_ARCHIVE_VISIBILITY_MOVE_FAILED` | — | `move()` moved the file but could not write its visibility at the target. |
| <span id="e-archive-invalid-move-options"></span>`E_ARCHIVE_INVALID_MOVE_OPTIONS` | — | `moveToDisk()` was given options it cannot use. |
| <span id="e-archive-multipart-not-macroable"></span>`E_ARCHIVE_MULTIPART_NOT_MACROABLE` | — | The installed `@c9up/ream` has no macroable `MultipartFile`, so uploads cannot be given `moveToDisk()`. |
| <span id="e-archive-request-timeout"></span>`E_ARCHIVE_REQUEST_TIMEOUT` | — | The storage provider did not answer, or stalled while its body was read, within the idle timeout. |
| <span id="e-archive-unexpected-response"></span>`E_ARCHIVE_UNEXPECTED_RESPONSE` | — | The storage provider answered with something archive cannot use. |
| <span id="e-archive-unknown-disk"></span>`E_ARCHIVE_UNKNOWN_DISK` | — | A disk name, or the default disk, is not in the config. |
| <span id="e-archive-invalid-driver"></span>`E_ARCHIVE_INVALID_DRIVER` | — | `config.driver` is not `'local'`, `'s3'` or `'gcs'`. |
| <span id="e-archive-config-missing"></span>`E_ARCHIVE_CONFIG_MISSING` | — | The driver is `s3` or `gcs` and its config section is missing. |
| <span id="e-archive-provider-not-registered"></span>`E_ARCHIVE_PROVIDER_NOT_REGISTERED` | — | `ArchiveProvider.boot()` ran before `register()`. |
| <span id="e-archive-template-engine"></span>`E_ARCHIVE_TEMPLATE_ENGINE` | — | The app renders with inker, but the template helpers cannot be published on it. |

## Atlas Errors

Atlas normalises its codes: a code that already starts with `E_` is kept, any
other gets the `E_ATLAS_` prefix. See [Atlas error handling](/en/guides/database/orm/error-handling)
for the typed subclasses. The query compiler's refusals are plain `Error`s whose
message starts with the code.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-row-not-found-atlas"></span>`E_ROW_NOT_FOUND` | 404 | A query that must return a row found none: `findOrFail`, `findByOrFail`, `refresh`, `fresh`, `firstOrFail()`, `sole()`. |
| <span id="e-mass-assignment"></span>`E_MASS_ASSIGNMENT` | — | `fill()` / `merge()` (and `create`, `createMany`, `updateOrCreate`) set an attribute outside `fillable`, or listed in `guarded`. |
| <span id="e-extra-properties"></span>`E_EXTRA_PROPERTIES` | — | A fill named a property that is not a declared column. |
| <span id="e-unknown-column"></span>`E_UNKNOWN_COLUMN` | — | A value was assigned to a key that is not a column. Pass `{ allowExtraProperties: true }` to keep unknown keys in `$extras`. |
| <span id="e-invalid-column"></span>`E_INVALID_COLUMN` | — | A query names a column the entity does not declare. |
| <span id="e-invalid-find-value"></span>`E_INVALID_FIND_VALUE` | — | `find()` was called without a usable primary key value. |
| <span id="e-model-not-persisted"></span>`E_MODEL_NOT_PERSISTED` | — | An operation that needs a stored row (`delete()`, `refresh()`, `load*()`…) ran on a local instance. |
| <span id="e-missing-primary-key"></span>`E_MISSING_PRIMARY_KEY` | — | The same operation ran on a persisted projection that holds no primary key. |
| <span id="e-model-deleted"></span>`E_MODEL_DELETED` | — | `save()` was called on a deleted instance. |
| <span id="e-missing-owner-key"></span>`E_MISSING_OWNER_KEY` | — | `associate()` was given a parent whose key is not set. |
| <span id="e-relation-not-loaded"></span>`E_RELATION_NOT_LOADED` | — | A relation was read before it was loaded. Call `.preload()` on the query or `.load()` on the instance. |
| <span id="e-optimistic-lock"></span>`E_OPTIMISTIC_LOCK` | — | A save lost an optimistic lock: another transaction modified the row since it was read. |
| <span id="e-strict-mode"></span>`E_STRICT_MODE` | — | Raw SQL refused by strict mode (a repository's `raw()`, or a `db.raw()` value written by a repository). |
| <span id="e-no-interactive-transaction"></span>`E_NO_INTERACTIVE_TRANSACTION` | — | The connection has no interactive `transaction()` (a model transaction, or `useTransaction()` in tests). |
| <span id="e-array-param"></span>`E_ARRAY_PARAM` | — | A list was bound to a single placeholder. Expand it into one placeholder per element. |
| <span id="e-atlas-missing-connection"></span>`E_ATLAS_MISSING_CONNECTION` | — | A model or repository names a connection that is not configured. |
| <span id="e-atlas-empty-select"></span>`E_ATLAS_EMPTY_SELECT` | — | `select()` was called with no columns. Provide at least one column name. |
| <span id="e-atlas-invalid-page"></span>`E_ATLAS_INVALID_PAGE` | — | `paginate()` was called with `page < 1`. |
| <span id="e-atlas-invalid-per-page"></span>`E_ATLAS_INVALID_PER_PAGE` | — | `paginate()` was called with `perPage < 1`. |
| <span id="e-atlas-invalid-pagination"></span>`E_ATLAS_INVALID_PAGINATION` | — | A page, page size or row count that is not a finite, non-negative integer. |
| <span id="e-atlas-invalid-cte-name"></span>`E_ATLAS_INVALID_CTE_NAME` | — | A CTE name must be a valid identifier (letters, numbers, underscores). |
| <span id="e-atlas-invalid-operator"></span>`E_ATLAS_INVALID_OPERATOR` | — | A `where()` or `wherePivot()` operator outside the allowed list. |
| <span id="e-atlas-invalid-increment"></span>`E_ATLAS_INVALID_INCREMENT` | — | `increment()` / `decrement()` was given an amount that is not a finite number. |
| <span id="e-atlas-invalid-date-column-value"></span>`E_ATLAS_INVALID_DATE_COLUMN_VALUE` | — | A date column was given a value that is not a valid date. |
| <span id="e-atlas-undefined-binding"></span>`E_ATLAS_UNDEFINED_BINDING` | — | A query value is `undefined`. Validate the input first; use `whereNull()` to match NULL. |
| <span id="e-atlas-dialect-mismatch"></span>`E_ATLAS_DIALECT_MISMATCH` | — | `useTransaction(trx)` was given a transaction of another dialect than the query was built for. Start the transaction on the query's connection, or build the query from the transaction. |
| <span id="e-atlas-raw-bindings"></span>`E_ATLAS_RAW_BINDINGS` | — | A raw query has placeholders with no binding. |
| <span id="e-atlas-raw-value"></span>`E_ATLAS_RAW_VALUE` | — | `defaultTo(db.raw())` was given bindings, which a column default cannot carry. |
| <span id="e-atlas-non-finite-number"></span>`E_ATLAS_NON_FINITE_NUMBER` | — | `defaultTo()` was given a number that is not a SQL number (`NaN`, `Infinity`). |
| <span id="e-atlas-factory-faker-missing"></span>`E_ATLAS_FACTORY_FAKER_MISSING` | — | A factory uses faker, an optional peer of atlas that is not installed. |
| <span id="e-atlas-factory-invalid"></span>`E_ATLAS_FACTORY_INVALID` | — | `make:factory` got a model name that would leave the factories folder (a path separator, a quote, a backtick or `..`). |
| <span id="e-atlas-seeder-invalid"></span>`E_ATLAS_SEEDER_INVALID` | — | `make:seeder` got a name that would leave the seeders folder (a path separator, a quote, a backtick or `..`). |
| <span id="e-atlas-napi-not-found"></span>`E_ATLAS_NAPI_NOT_FOUND` | — | The Rust query compiler is not loaded. A plain `Error` whose message starts with the code. See [Troubleshooting](/en/guides/database/orm/troubleshooting). |
| <span id="e-atlas-insecure-sslmode"></span>`E_ATLAS_INSECURE_SSLMODE` | — | The connection asks for `sslmode=prefer` or `allow` (URL or `PGSSLMODE`), which fall back to plaintext without saying so. Use `disable` or `verify-full`. See [Encrypted connections](/en/guides/database/orm/connections#encrypted-connections-tls). |
| <span id="e-atlas-listen-unsupported"></span>`E_ATLAS_LISTEN_UNSUPPORTED` | — | LISTEN / NOTIFY was used on a connection that is not PostgreSQL. |
| <span id="e-atlas-listen-connect"></span>`E_ATLAS_LISTEN_CONNECT` | — | The listener could not open its own PostgreSQL connection. |
| <span id="e-atlas-listen-connection"></span>`E_ATLAS_LISTEN_CONNECTION` | — | The listener's connection failed; every subscription is told. |
| <span id="e-atlas-listen-channel"></span>`E_ATLAS_LISTEN_CHANNEL` | — | A LISTEN channel name is empty, longer than 63 bytes, or holds a NUL. |
| <span id="e-atlas-listen-closed"></span>`E_ATLAS_LISTEN_CLOSED` | — | The listener was closed while a request was pending. |
| <span id="e-atlas-listen-event"></span>`E_ATLAS_LISTEN_EVENT` | — | The native listener reported an event atlas does not define. |
| <span id="e-atlas-migration-invalid-table-name"></span>`E_ATLAS_MIGRATION_INVALID_TABLE_NAME` | — | `migrations.tableName` is not a plain identifier. |
| <span id="e-atlas-migration-not-found"></span>`E_ATLAS_MIGRATION_NOT_FOUND` | — | A migration to run or roll back has no file in the migrations directory. |
| <span id="e-atlas-migration-invalid"></span>`E_ATLAS_MIGRATION_INVALID` | — | A migration file does not default-export a class. |
| <span id="e-atlas-migration-duplicate"></span>`E_ATLAS_MIGRATION_DUPLICATE` | — | Two migration files share a name. |
| <span id="e-atlas-migration-compile-empty"></span>`E_ATLAS_MIGRATION_COMPILE_EMPTY` | — | A migration compiled to no SQL statement. |
| <span id="e-migration-locked"></span>`E_MIGRATION_LOCKED` | — | Another run holds the migration lock. Wait for it, or clear a stale lock with `migration:unlock`. |
| <span id="e-rollback-disabled-in-production"></span>`E_ROLLBACK_DISABLED_IN_PRODUCTION` | — | A rollback, reset, refresh, fresh or wipe in production without `--force`. |
| <span id="e-atlas-dry-run-write"></span>`E_ATLAS_DRY_RUN_WRITE` | — | A migration tried to write while running under `dryRun()`. |
| <span id="e-defer-requires-transaction"></span>`E_DEFER_REQUIRES_TRANSACTION` | — | A migration uses `this.defer()` on an adapter without an interactive `transaction()`. |
| <span id="e-mysql-fk-requires-transaction"></span>`E_MYSQL_FK_REQUIRES_TRANSACTION` | — | Suspending MySQL foreign-key checks needs an interactive `transaction()` to restore them. |
| <span id="e-schema-dump-dialect-mismatch"></span>`E_SCHEMA_DUMP_DIALECT_MISMATCH` | — | The schema dump was made for another dialect. |
| <span id="e-schema-dump-table-mismatch"></span>`E_SCHEMA_DUMP_TABLE_MISMATCH` | — | The schema dump uses another migrations tracking table. |
| <span id="e-seeder-dir-not-found"></span>`E_SEEDER_DIR_NOT_FOUND` | — | The seeders directory does not exist. |
| <span id="e-seeder-invalid"></span>`E_SEEDER_INVALID` | — | A seeder file does not export a seeder class. |
| <span id="e-seeder-invalid-path"></span>`E_SEEDER_INVALID_PATH` | — | A seeder path resolves outside the seeders directory. |
| <span id="e-no-connection"></span>`E_NO_CONNECTION` | — | `schema.<method>()` needs a live connection; it is available inside a migration, not on a standalone `Schema`. |
| <span id="e-alter-empty"></span>`E_ALTER_EMPTY` | — | `schema.alterTable()` declared no operation. |
| <span id="e-alter-misuse"></span>`E_ALTER_MISUSE` | — | `.alter()` does not follow a column definition, or an alter-only method was used on a new table. |
| <span id="e-check-empty"></span>`E_CHECK_EMPTY` | — | A check constraint (or `checkBetween`) was given no value or interval. |
| <span id="e-check-range"></span>`E_CHECK_RANGE` | — | `checkBetween` was given an interval that is not `[min, max]`. |
| <span id="e-constraint-empty"></span>`E_CONSTRAINT_EMPTY` | — | A constraint lists no columns. |
| <span id="e-enum-empty"></span>`E_ENUM_EMPTY` | — | An enum column declares no values. |
| <span id="e-empty-view-select"></span>`E_EMPTY_VIEW_SELECT` | — | A view has no SELECT, or a materialized view was asked of a dialect that has none. |
| <span id="e-specific-type-empty"></span>`E_SPECIFIC_TYPE_EMPTY` | — | `specificType()` was given an empty type. |
| <span id="e-sqlite-decimal-precision"></span>`E_SQLITE_DECIMAL_PRECISION` | — | A decimal precision SQLite cannot store exactly. |
| <span id="e-unsupported"></span>`E_UNSUPPORTED` | — | A SQL feature the connection's dialect does not have (`DISTINCT ON` off Postgres, `UNION ALL` variants on SQLite…). |
| <span id="e-unsafe-identifier"></span>`E_UNSAFE_IDENTIFIER` | — | The Rust compiler refused an identifier. |
| <span id="e-unsafe-sql"></span>`E_UNSAFE_SQL` | — | The Rust compiler refused a SQL fragment. |
| <span id="e-unsafe-expression"></span>`E_UNSAFE_EXPRESSION` | — | The Rust compiler refused an expression. |
| <span id="e-unsafe-literal"></span>`E_UNSAFE_LITERAL` | — | The Rust compiler refused a literal value. |
| <span id="e-injection-pattern"></span>`E_INJECTION_PATTERN` | — | The Rust compiler refused an input that looks like an injection attempt. |

## Aurora Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-aurora-illegal-page-name"></span>`E_AURORA_ILLEGAL_PAGE_NAME` | — | A page name holds characters a page name may not. |
| <span id="e-aurora-page-outside-root"></span>`E_AURORA_PAGE_OUTSIDE_ROOT` | — | The resolved page path lands outside the configured pages root. |
| <span id="e-aurora-page-not-found"></span>`E_AURORA_PAGE_NOT_FOUND` | — | No file for this page name. |
| <span id="e-aurora-page-import-failed"></span>`E_AURORA_PAGE_IMPORT_FAILED` | — | The page is on disk and its module graph refused to load. |
| <span id="e-aurora-page-invalid-export"></span>`E_AURORA_PAGE_INVALID_EXPORT` | — | The page module loaded but does not default-export a factory. |
| <span id="e-aurora-illegal-root-tag"></span>`E_AURORA_ILLEGAL_ROOT_TAG` | — | `renderPage` was given a root tag that is not a plain element name. |
| <span id="e-aurora-outside-component"></span>`E_AURORA_OUTSIDE_COMPONENT` | — | `onMount` / `onUnmount` was called outside a `component()` setup function. |
| <span id="e-aurora-missing-context"></span>`E_AURORA_MISSING_CONTEXT` | — | `inject` found no provider for the context, and it declared no default. |
| <span id="e-aurora-not-booted"></span>`E_AURORA_NOT_BOOTED` | — | The manager singleton was read before a provider or `setAurora` set it. |
| <span id="e-aurora-unknown-route"></span>`E_AURORA_UNKNOWN_ROUTE` | — | `urlFor` was given a name absent from the route manifest. |
| <span id="e-aurora-missing-route-params"></span>`E_AURORA_MISSING_ROUTE_PARAMS` | — | `urlFor` was given a route whose required params were not all supplied. |
| <span id="e-aurora-unknown-live-component"></span>`E_AURORA_UNKNOWN_LIVE_COMPONENT` | — | A live component was mounted before `registry.define()` named it. |
| <span id="e-aurora-live-session-limit"></span>`E_AURORA_LIVE_SESSION_LIMIT` | — | A live session was refused: the registry holds `maxSessions` already. |
| <span id="e-aurora-relay-request-failed"></span>`E_AURORA_RELAY_REQUEST_FAILED` | — | A relay request came back with a non-2xx status. |
| <span id="e-aurora-unsafe-url"></span>`E_AURORA_UNSAFE_URL` | — | A navigation URL failed the same-origin / scheme check. |
| <span id="e-aurora-slot-in-tag-name"></span>`E_AURORA_SLOT_IN_TAG_NAME` | — | A `${}` landed where a tag name goes. |
| <span id="e-aurora-slot-in-attribute-name"></span>`E_AURORA_SLOT_IN_ATTRIBUTE_NAME` | — | A `${}` landed where an attribute name goes. |
| <span id="e-aurora-slot-in-raw-text"></span>`E_AURORA_SLOT_IN_RAW_TEXT` | — | A `${}` landed inside `<script>`, `<style>`, `<textarea>`, `<title>`… |
| <span id="e-aurora-slot-in-comment"></span>`E_AURORA_SLOT_IN_COMMENT` | — | A `${}` landed inside a comment, a `<!…>` / `<?…>` or a CDATA section. |
| <span id="e-aurora-slot-in-event-attribute"></span>`E_AURORA_SLOT_IN_EVENT_ATTRIBUTE` | — | A `${}` landed in an `on*` attribute, whose value is JavaScript. |
| <span id="e-aurora-slot-in-srcdoc"></span>`E_AURORA_SLOT_IN_SRCDOC` | — | A `${}` landed in `srcdoc`, which an iframe parses as a whole document. |
| <span id="e-aurora-slot-in-base-url"></span>`E_AURORA_SLOT_IN_BASE_URL` | — | A `${}` landed in `<base href>`, which rebases every URL on the page. |
| <span id="e-aurora-slot-in-script-source"></span>`E_AURORA_SLOT_IN_SCRIPT_SOURCE` | — | A `${}` landed in the URL a `<script>` loads its code from. |
| <span id="e-aurora-slot-in-html-property"></span>`E_AURORA_SLOT_IN_HTML_PROPERTY` | — | A `.prop` binding names a property that parses its value as HTML. |
| <span id="e-aurora-template-in-attribute"></span>`E_AURORA_TEMPLATE_IN_ATTRIBUTE` | — | A nested `html` template reached an attribute value or `.value`. |
| <span id="e-aurora-file-input-value"></span>`E_AURORA_FILE_INPUT_VALUE` | — | `.value` was given a non-empty string on an `<input type="file">`. |
| <span id="e-aurora-duplicate-key"></span>`E_AURORA_DUPLICATE_KEY` | — | Two elements of an `each()` list share a key, which names one row. |
| <span id="e-aurora-invalid-lazy"></span>`E_AURORA_INVALID_LAZY` | — | `each(…, { lazy })` was given an `estimate` that is not a positive length, or an `overscan` that is negative or not a number. |
| <span id="e-aurora-visits-need-photon"></span>`E_AURORA_VISITS_NEED_PHOTON` | — | `visits` is on but `@c9up/photon` is not installed, or too old (0.1.25 and later speak the protocol for aurora). |
| <span id="e-aurora-visit-props"></span>`E_AURORA_VISIT_PROPS` | — | With `visits` on, a page's props (shared ones merged in) were not an object, as the protocol's `page.props` must be. |
| <span id="e-aurora-invalid-motion"></span>`E_AURORA_INVALID_MOTION` | — | `motion=${…}` was not an object of motion values, or named a property motion cannot drive (rotation, colour). |
| <span id="e-aurora-reactive-cycle"></span>`E_AURORA_REACTIVE_CYCLE` | — | Effects kept re-running each other in one update: one writes what it, or an effect it triggers, reads. |
| <span id="e-aurora-internal"></span>`E_AURORA_INTERNAL` | — | An invariant inside aurora broke: always a bug in aurora itself. |

## Blackhole Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-blackhole-rate-limited"></span>`E_BLACKHOLE_RATE_LIMITED` | 429 | Too many requests from this client, with `Retry-After`. Wait and retry. |
| <span id="e-too-many-requests-blackhole"></span>`E_TOO_MANY_REQUESTS` | 429 | A throttle middleware or `limiter.consume()` found the key over its budget. |
| <span id="e-bad-csrf-token"></span>`E_BAD_CSRF_TOKEN` | 403 | Invalid or missing CSRF token. Echo the `XSRF-TOKEN` cookie in the `X-XSRF-TOKEN` header (or the `_csrf` form field). |
| <span id="e-blackhole-csrf-origin-mismatch"></span>`E_BLACKHOLE_CSRF_ORIGIN_MISMATCH` | 403 | A state-changing request came from another origin — another host, or the same host over another scheme — not listed in `csrf.trustedOrigins`. |
| <span id="e-blackhole-path-traversal"></span>`E_BLACKHOLE_PATH_TRAVERSAL` | 400 | The path holds `..`, raw or percent-encoded. |
| <span id="e-blackhole-parameter-pollution"></span>`E_BLACKHOLE_PARAMETER_POLLUTION` | 400 | A query-string key appears twice (keys ending in `[]` may repeat). |
| <span id="e-blackhole-missing-ip"></span>`E_BLACKHOLE_MISSING_IP` | 400 | Rate limiting is on and the request has no client address to count it under. |
| <span id="e-blackhole-session-not-ready"></span>`E_BLACKHOLE_SESSION_NOT_READY` | 500 | CSRF tokens are bound to the session (`csrf.session`) and the request reached blackhole without one: register the session middleware before blackhole's. |
| <span id="e-blackhole-unknown-csp-keyword"></span>`E_BLACKHOLE_UNKNOWN_CSP_KEYWORD` | 500 | The CSP names an `@keyword` no resolver is registered for (`cspKeywords.register`), or a keyword was registered under an invalid name. Raised when the filter is created. |
| <span id="e-blackhole-invalid-csp-keyword-value"></span>`E_BLACKHOLE_INVALID_CSP_KEYWORD_VALUE` | 500 | A CSP keyword's resolver answered a value with `;`, `,` or a line break, which would end the directive. |
| <span id="e-blackhole-database-unavailable"></span>`E_BLACKHOLE_DATABASE_UNAVAILABLE` | 500 | The database limiter store has nothing to count in: `@c9up/atlas` is not installed, not booted, or the named connection is not one. Pass a client as `connection`, or set atlas up. |
| <span id="e-blackhole-unsupported-database"></span>`E_BLACKHOLE_UNSUPPORTED_DATABASE` | 500 | The database limiter store was given a database other than PostgreSQL, MySQL or SQLite. |
| <span id="e-blackhole-blocked"></span>`E_BLACKHOLE_BLOCKED` | varies | A refusal whose body the engine did not supply as a JSON error. |

## Chronos Errors

Thrown as plain `Error`s (`RangeError` for a year rejected before the engine) whose message starts with `CODE:`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-chronos-invalid-year"></span>`E_CHRONOS_INVALID_YEAR` | — | `easterDate` / `holidays` got a year that is not an integer in 1583-9999 (the Gregorian computus). |
| <span id="e-chronos-unknown-country"></span>`E_CHRONOS_UNKNOWN_COUNTRY` | — | `holidays` / `isHoliday` got a country with no holiday calendar (known: `CH`, `FR`). |
| <span id="e-chronos-unknown-region"></span>`E_CHRONOS_UNKNOWN_REGION` | — | The region is not a Swiss canton's two-letter code, or a region was given for `FR`. |
| <span id="e-chronos-invalid-date"></span>`E_CHRONOS_INVALID_DATE` | — | `isHoliday` got a string that is not a calendar date `YYYY-MM-DD`. |

## Comet Errors

Raised by the WebSocket transport (`createWebSocketTransport()`) as an `RpcTransportError`: the call failed without a JSON-RPC answer. A JSON-RPC error the server answered keeps its numeric code.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-comet-connection-failed"></span>`E_COMET_CONNECTION_FAILED` | — | The socket could not be opened: refused handshake, bad URL or network. |
| <span id="e-comet-connection-closed"></span>`E_COMET_CONNECTION_CLOSED` | — | The socket closed while the call waited, or stays closed (`reconnect: false`). |
| <span id="e-comet-transport-closed"></span>`E_COMET_TRANSPORT_CLOSED` | — | `close()` was called on the transport; calls made afterwards fail the same way. |
| <span id="e-comet-timeout"></span>`E_COMET_TIMEOUT` | — | No answer within the timeout. |
| <span id="e-comet-message-too-large"></span>`E_COMET_MESSAGE_TOO_LARGE` | — | A message over `maxMessageBytes`, sent or received. |
| <span id="e-comet-backpressure"></span>`E_COMET_BACKPRESSURE` | — | More than `maxBufferedBytes` already wait to be sent. |
| <span id="e-comet-protocol-error"></span>`E_COMET_PROTOCOL_ERROR` | — | The peer sent what no JSON-RPC server answers, so the socket was closed. |
| <span id="e-comet-invalid-message"></span>`E_COMET_INVALID_MESSAGE` | — | The client handed over something that is not a JSON-RPC message, or not JSON. |

## Echo Errors

`E_FACTORY_ERROR`, `E_FACTORY_HARD_TIMEOUT`, `E_UNDEFINED_VALUE` and `E_L2_CACHE_ERROR` keep the identifiers cache code already catches on.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-factory-error"></span>`E_FACTORY_ERROR` | — | The factory of `getOrSet()` threw; `cause` holds its error. |
| <span id="e-factory-hard-timeout"></span>`E_FACTORY_HARD_TIMEOUT` | — | The factory did not finish within its hard timeout. |
| <span id="e-undefined-value"></span>`E_UNDEFINED_VALUE` | — | A `null` or `undefined` value was written to the cache. |
| <span id="e-l2-cache-error"></span>`E_L2_CACHE_ERROR` | — | A tiered store's second level failed and the failure is not suppressed. |
| <span id="e-echo-lock-timeout"></span>`E_ECHO_LOCK_TIMEOUT` | — | A caller waited too long for another caller's factory of the same key. |
| <span id="e-echo-invalid-argument"></span>`E_ECHO_INVALID_ARGUMENT` | — | A method was given an argument it cannot work with. |
| <span id="e-echo-invalid-duration"></span>`E_ECHO_INVALID_DURATION` | — | A duration is neither a number of milliseconds nor a readable string. |
| <span id="e-echo-invalid-config"></span>`E_ECHO_INVALID_CONFIG` | — | A config value cannot be read, such as a size that is not bytes or `'10mb'`. |
| <span id="e-echo-unknown-store"></span>`E_ECHO_UNKNOWN_STORE` | — | A store name, or the default store, is not declared in `stores`. |
| <span id="e-echo-unsupported-driver"></span>`E_ECHO_UNSUPPORTED_DRIVER` | — | The default provider was given a driver it does not build. |
| <span id="e-echo-not-taggable"></span>`E_ECHO_NOT_TAGGABLE` | — | Tag invalidation on a driver (or a tier) that has no tags. |
| <span id="e-echo-scan-unsupported"></span>`E_ECHO_SCAN_UNSUPPORTED` | — | `flush()` on a Redis client without `scan()`; `KEYS` is not used. |
| <span id="e-echo-unserializable-value"></span>`E_ECHO_UNSERIALIZABLE_VALUE` | — | The memory driver stores JSON and the value has no JSON form. Pass `serialize: false` to keep it as is. |
| <span id="e-echo-quasar-missing"></span>`E_ECHO_QUASAR_MISSING` | — | A Redis store was configured and `@c9up/quasar` is not installed. |
| <span id="e-echo-incomplete-connection"></span>`E_ECHO_INCOMPLETE_CONNECTION` | — | The quasar connection lacks what echo needs (`publish()` / `subscribe()`). |
| <span id="e-echo-not-booted"></span>`E_ECHO_NOT_BOOTED` | — | The cache singleton was used before `EchoProvider.boot()` or `setCache()`. |

## Eclipse Errors

`E_LOCK_NOT_OWNED` and `E_LOCK_STORAGE_ERROR` keep the identifiers lock code already catches on.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-lock-not-owned"></span>`E_LOCK_NOT_OWNED` | — | The lock is not held by this holder: it expired, or another holder has it. Raised when work succeeded but the lease lapsed while it ran. |
| <span id="e-lock-storage-error"></span>`E_LOCK_STORAGE_ERROR` | — | The lock store failed while saving, reading or deleting. |
| <span id="e-eclipse-invalid-ttl"></span>`E_ECLIPSE_INVALID_TTL` | — | A lock TTL is not a finite positive number of milliseconds, or `null`. |
| <span id="e-eclipse-invalid-duration"></span>`E_ECLIPSE_INVALID_DURATION` | — | A duration string cannot be read. |
| <span id="e-eclipse-invalid-retry"></span>`E_ECLIPSE_INVALID_RETRY` | — | A `retry` option is out of range. |
| <span id="e-eclipse-invalid-config"></span>`E_ECLIPSE_INVALID_CONFIG` | — | The lock config is invalid. |
| <span id="e-eclipse-missing-config"></span>`E_ECLIPSE_MISSING_CONFIG` | — | `config/lock.ts` is missing. |
| <span id="e-eclipse-unknown-store"></span>`E_ECLIPSE_UNKNOWN_STORE` | — | A lock store name is not declared. |
| <span id="e-eclipse-quasar-missing"></span>`E_ECLIPSE_QUASAR_MISSING` | — | A Redis store was configured and `@c9up/quasar` is not installed. |
| <span id="e-eclipse-incomplete-connection"></span>`E_ECLIPSE_INCOMPLETE_CONNECTION` | — | The quasar connection lacks what eclipse needs. |
| <span id="e-eclipse-database-unavailable"></span>`E_ECLIPSE_DATABASE_UNAVAILABLE` | — | A database lock store asks for atlas, which is not installed or has not booted. |
| <span id="e-eclipse-unsupported-database"></span>`E_ECLIPSE_UNSUPPORTED_DATABASE` | — | A database lock store was given a dialect other than PostgreSQL, MySQL or SQLite. |

## Eon Errors

Most eon refusals are plain `Error`s whose message starts with `[CODE]`; the query compiler's start with `CODE:`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-eon-missing-connection"></span>`E_EON_MISSING_CONNECTION` | — | A repository has no connection to run on. |
| <span id="e-eon-not-a-supertable"></span>`E_EON_NOT_A_SUPERTABLE` | — | A class used as a super-table is not decorated with `@SuperTable`. |
| <span id="e-eon-no-tags"></span>`E_EON_NO_TAGS` | — | A super-table has no `@Tag` column, so a child table cannot be routed. |
| <span id="e-eon-no-timestamp"></span>`E_EON_NO_TIMESTAMP` | — | A super-table has no `@Timestamp` column. |
| <span id="e-eon-child-stable"></span>`E_EON_CHILD_STABLE` | — | `createChildTable()` was given neither `stable` nor `EntityClass`. |
| <span id="e-eon-child-collision"></span>`E_EON_CHILD_COLLISION` | — | Two distinct tag sets map to the same child table; eon refuses to write mismatched rows under one tag set. |
| <span id="e-eon-child-migration"></span>`E_EON_CHILD_MIGRATION` | — | `migrateChildTableNames()` read a child listing row without a table name. |
| <span id="e-eon-batch-size"></span>`E_EON_BATCH_SIZE` | — | `batchSize` is not a positive integer. |
| <span id="e-eon-bind"></span>`E_EON_BIND` | — | A value cannot be written to its STMT placeholder as given: the wrong type, or a decimal the column cannot hold exactly. |
| <span id="e-eon-server-version"></span>`E_EON_SERVER_VERSION` | — | The columnar STMT path needs TDengine 3.3.6.0 or later (stmt2). |
| <span id="e-eon-type"></span>`E_EON_TYPE` | — | A column or tag has an unknown or missing type. |
| <span id="e-eon-ts-type"></span>`E_EON_TS_TYPE` | — | A timestamp is neither a bigint nor a safe-integer number. |
| <span id="e-eon-param-precision"></span>`E_EON_PARAM_PRECISION` | — | A timestamp number is not a safe integer; pass nanosecond timestamps as bigint. |
| <span id="e-eon-value-type"></span>`E_EON_VALUE_TYPE` | — | An integer column was given something other than a safe integer or a bigint. |
| <span id="e-eon-value-range"></span>`E_EON_VALUE_RANGE` | — | A value is outside its column type's range; the connector would truncate it silently. |
| <span id="e-eon-template"></span>`E_EON_TEMPLATE` | — | The compiler returned no statement for the STMT insert template. |
| <span id="e-eon-literal-insert"></span>`E_EON_LITERAL_INSERT` | — | A literal insert for one child table compiled to other than exactly one statement. |
| <span id="e-eon-hydrate-bigint"></span>`E_EON_HYDRATE_BIGINT` | — | A bigint or timestamp column came back with a non-integer value. |
| <span id="e-eon-decode"></span>`E_EON_DECODE` | — | A server reply or result block does not match the protocol (truncated, unknown type, rows without column metadata); a frame that cannot be trusted closes the connection. |
| <span id="e-eon-timeout"></span>`E_EON_TIMEOUT` | — | A request to TDengine got no reply within `timeoutMs`. |
| <span id="e-eon-closed"></span>`E_EON_CLOSED` | — | The TDengine connection closed while a request was waiting, or a request was sent on a closed one. |
| <span id="e-eon-connect"></span>`E_EON_CONNECT` | — | The WebSocket to taosAdapter could not be opened: a bad URL, a refused connection, or no handshake within the deadline. |
| <span id="e-eon-schemaless-schema"></span>`E_EON_SCHEMALESS_SCHEMA` | — | A field type has no line-protocol form. |
| <span id="e-eon-schemaless-field"></span>`E_EON_SCHEMALESS_FIELD` | — | A line-protocol field value is outside its type's range. |
| <span id="e-eon-schemaless-tag"></span>`E_EON_SCHEMALESS_TAG` | — | A line-protocol tag value cannot be written. |
| <span id="e-eon-schemaless-empty-tag"></span>`E_EON_SCHEMALESS_EMPTY_TAG` | — | A line-protocol tag value is empty. |
| <span id="e-eon-schemaless-no-fields"></span>`E_EON_SCHEMALESS_NO_FIELDS` | — | A line-protocol point has no field. |
| <span id="e-eon-schemaless-measurement"></span>`E_EON_SCHEMALESS_MEASUREMENT` | — | The super-table (measurement) name is empty. |
| <span id="e-eon-schemaless-control-char"></span>`E_EON_SCHEMALESS_CONTROL_CHAR` | — | A line-protocol name or value holds a line terminator or control character; it is refused, not escaped. |
| <span id="e-eon-invalid-value"></span>`E_EON_INVALID_VALUE` | — | `where()` with one argument takes a callback that fills a group. |
| <span id="e-eon-empty-where-group"></span>`E_EON_EMPTY_WHERE_GROUP` | — | A `where(callback)` group added no predicate. |
| <span id="e-eon-invalid-limit"></span>`E_EON_INVALID_LIMIT` | — | `limit()` was given a value that is not a non-negative integer. |
| <span id="e-eon-invalid-offset"></span>`E_EON_INVALID_OFFSET` | — | `offset()` was given a value that is not a non-negative integer. |
| <span id="e-eon-compile-empty"></span>`E_EON_COMPILE_EMPTY` | — | The compiler returned no SQL statement. |
| <span id="e-eon-unexpected-params"></span>`E_EON_UNEXPECTED_PARAMS` | — | A time-series query compiled with bound parameters where literal SQL is expected. |
| <span id="e-eon-internal"></span>`E_EON_INTERNAL` | — | An invariant inside eon broke: always a bug in eon itself. |
| <span id="e-eon-alter-db-one-option"></span>`E_EON_ALTER_DB_ONE_OPTION` | — | `alterDatabase()` takes exactly one option. |
| <span id="e-eon-migration-invalid"></span>`E_EON_MIGRATION_INVALID` | — | The migrations tracking table holds an unreadable `executed_at`. |
| <span id="e-eon-migration-locked"></span>`E_EON_MIGRATION_LOCKED` | — | Another run holds the migration lock. |
| <span id="e-eon-factory-state"></span>`E_EON_FACTORY_STATE` | — | A factory state is not defined. |
| <span id="e-eon-fake-unsupported"></span>`E_EON_FAKE_UNSUPPORTED` | — | `FakeEonConnection` answers only flat SELECTs; windowed or aggregate SQL needs a live TDengine. |
| <span id="e-eon-test-identifier"></span>`E_EON_TEST_IDENTIFIER` | — | A test cleanup helper was given a name that is not a plain identifier. |
| <span id="e-eon-napi-not-found"></span>`E_EON_NAPI_NOT_FOUND` | — | The eon query compiler binary is not found. |
| <span id="e-eon-napi-unsupported"></span>`E_EON_NAPI_UNSUPPORTED` | — | There is no eon query compiler binary for this platform. |
| <span id="e-eon-invalid-duration"></span>`E_EON_INVALID_DURATION` | — | A duration is not a positive integer followed by one unit. |
| <span id="e-eon-invalid-fill"></span>`E_EON_INVALID_FILL` | — | A `FILL` mode is not one TDengine knows, or lacks its value. |
| <span id="e-eon-fill-requires-interval"></span>`E_EON_FILL_REQUIRES_INTERVAL` | — | `FILL` was used without `INTERVAL`. |
| <span id="e-eon-sliding-requires-interval"></span>`E_EON_SLIDING_REQUIRES_INTERVAL` | — | `SLIDING` was used without `INTERVAL`. |
| <span id="e-eon-offset-requires-limit"></span>`E_EON_OFFSET_REQUIRES_LIMIT` | — | `OFFSET` was used without `LIMIT`. |
| <span id="e-eon-invalid-order-direction"></span>`E_EON_INVALID_ORDER_DIRECTION` | — | An order direction is neither `asc` nor `desc`. |
| <span id="e-eon-invalid-pseudo-column"></span>`E_EON_INVALID_PSEUDO_COLUMN` | — | A pseudo-column is not one eon allows. |
| <span id="e-eon-invalid-select"></span>`E_EON_INVALID_SELECT` | — | A select expression cannot be compiled. |
| <span id="e-eon-invalid-select-function"></span>`E_EON_INVALID_SELECT_FUNCTION` | — | A select names a function eon does not allow. |
| <span id="e-eon-invalid-db-option"></span>`E_EON_INVALID_DB_OPTION` | — | A database option value is invalid. |
| <span id="e-eon-unknown-db-option"></span>`E_EON_UNKNOWN_DB_OPTION` | — | A database option is not alterable (`KEEP`, `BUFFER`, `WAL_LEVEL`, `CACHEMODEL`, `REPLICA`, `MINROWS`). |
| <span id="e-eon-immutable-db-option"></span>`E_EON_IMMUTABLE_DB_OPTION` | — | A database option is fixed at CREATE and cannot be altered. |
| <span id="e-eon-invalid-ttl"></span>`E_EON_INVALID_TTL` | — | A child-table TTL is not a non-negative whole number of days. |
| <span id="e-eon-invalid-wal-level"></span>`E_EON_INVALID_WAL_LEVEL` | — | A `WAL_LEVEL` is not one TDengine accepts. |
| <span id="e-eon-invalid-cachemodel"></span>`E_EON_INVALID_CACHEMODEL` | — | A `CACHEMODEL` is not one TDengine accepts. |
| <span id="e-eon-invalid-precision"></span>`E_EON_INVALID_PRECISION` | — | A database precision is not `ms`, `us` or `ns`. |
| <span id="e-eon-keep-too-small"></span>`E_EON_KEEP_TOO_SMALL` | — | `KEEP` is less than three times `DURATION`. |
| <span id="e-ts-required"></span>`E_TS_REQUIRED` | — | A super-table's first column is not a TIMESTAMP. |
| <span id="e-tags-required"></span>`E_TAGS_REQUIRED` | — | A super-table declares no tag. |
| <span id="e-json-tag-rule"></span>`E_JSON_TAG_RULE` | — | JSON is tag-only and must be the only tag. |
| <span id="e-type-not-taggable"></span>`E_TYPE_NOT_TAGGABLE` | — | A type that cannot be a tag (DECIMAL) is used as one. |
| <span id="e-length-required"></span>`E_LENGTH_REQUIRED` | — | A type that needs a length (`BINARY(n)`, `NCHAR(n)`…) was given none. |
| <span id="e-name-collision"></span>`E_NAME_COLLISION` | — | A name is listed more than once across the STMT template's tag and value columns. |
| <span id="e-invalid-clause-type"></span>`E_INVALID_CLAUSE_TYPE` | — | A WHERE connector is neither `and` nor `or`. |
| <span id="e-invalid-where-group"></span>`E_INVALID_WHERE_GROUP` | — | A WHERE group is empty, or also names a column. |
| <span id="e-invalid-where-value"></span>`E_INVALID_WHERE_VALUE` | — | A WHERE value (or list element) is not a scalar. |
| <span id="e-unsafe-identifier-eon"></span>`E_UNSAFE_IDENTIFIER` | — | The compiler refused an identifier. |
| <span id="e-unsafe-literal-eon"></span>`E_UNSAFE_LITERAL` | — | The compiler refused a literal value. |
| <span id="e-unsafe-operator"></span>`E_UNSAFE_OPERATOR` | — | The compiler refused an operator. |

## Ephemeris Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-ephemeris-invalid-node"></span>`E_EPHEMERIS_INVALID_NODE` | — | A structured-data node has no `@type`. |
| <span id="e-ephemeris-invalid-url"></span>`E_EPHEMERIS_INVALID_URL` | — | A URL is not absolute. |
| <span id="e-ephemeris-invalid-date"></span>`E_EPHEMERIS_INVALID_DATE` | — | A date is not ISO 8601. |
| <span id="e-ephemeris-invalid-value"></span>`E_EPHEMERIS_INVALID_VALUE` | — | A value cannot be serialised (an invalid `Date`…). |
| <span id="e-ephemeris-invalid-price"></span>`E_EPHEMERIS_INVALID_PRICE` | — | A price is neither a number nor digits with a decimal point. |
| <span id="e-ephemeris-invalid-currency"></span>`E_EPHEMERIS_INVALID_CURRENCY` | — | A currency is not an ISO 4217 code. |
| <span id="e-ephemeris-missing-required"></span>`E_EPHEMERIS_MISSING_REQUIRED` | — | A type lacks a property search engines require for it. |
| <span id="e-ephemeris-unsafe-key"></span>`E_EPHEMERIS_UNSAFE_KEY` | — | A key structured data may not use (such as `__proto__`). |
| <span id="e-ephemeris-id-taken"></span>`E_EPHEMERIS_ID_TAKEN` | — | An `@id` generated for one node was given to another. |
| <span id="e-ephemeris-slot-taken"></span>`E_EPHEMERIS_SLOT_TAKEN` | — | A node slot is already taken by another node. |
| <span id="e-ephemeris-cycle"></span>`E_EPHEMERIS_CYCLE` | — | A node contains itself. |
| <span id="e-ephemeris-too-deep"></span>`E_EPHEMERIS_TOO_DEEP` | — | The data is nested deeper than the allowed depth. |
| <span id="e-ephemeris-too-long"></span>`E_EPHEMERIS_TOO_LONG` | — | A text value is longer than the allowed length. |
| <span id="e-ephemeris-too-many"></span>`E_EPHEMERIS_TOO_MANY` | — | A list (a breadcrumb…) has more items than allowed. |

## Goldstone Errors

The mail engine's limits are refused before the message is parsed further.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-goldstone-message-too-large"></span>`E_GOLDSTONE_MESSAGE_TOO_LARGE` | — | A message is over the size limit; refused before download when the server announces its size. |
| <span id="e-goldstone-not-a-message"></span>`E_GOLDSTONE_NOT_A_MESSAGE` | — | The bytes are not a mail message. |
| <span id="e-goldstone-too-many-parts"></span>`E_GOLDSTONE_TOO_MANY_PARTS` | — | A message has more MIME parts than allowed. |
| <span id="e-goldstone-too-deep"></span>`E_GOLDSTONE_TOO_DEEP` | — | MIME parts are nested deeper than allowed. |
| <span id="e-goldstone-too-many-headers"></span>`E_GOLDSTONE_TOO_MANY_HEADERS` | — | A message has more headers than allowed. |
| <span id="e-goldstone-headers-too-large"></span>`E_GOLDSTONE_HEADERS_TOO_LARGE` | — | A message's headers are over the size limit. |
| <span id="e-goldstone-missing-boundaries"></span>`E_GOLDSTONE_MISSING_BOUNDARIES` | — | A multipart message declares boundaries that never appear. |
| <span id="e-goldstone-boundary-too-long"></span>`E_GOLDSTONE_BOUNDARY_TOO_LONG` | — | A multipart boundary is longer than allowed. |
| <span id="e-goldstone-too-many-attachments"></span>`E_GOLDSTONE_TOO_MANY_ATTACHMENTS` | — | A message has more attachments than allowed. |
| <span id="e-goldstone-attachment-too-large"></span>`E_GOLDSTONE_ATTACHMENT_TOO_LARGE` | — | An attachment is over the size limit. |
| <span id="e-goldstone-html-too-large"></span>`E_GOLDSTONE_HTML_TOO_LARGE` | — | An HTML body is over the size limit. |
| <span id="e-goldstone-html-too-deep"></span>`E_GOLDSTONE_HTML_TOO_DEEP` | — | An HTML body is nested deeper than allowed. |
| <span id="e-goldstone-html-too-complex"></span>`E_GOLDSTONE_HTML_TOO_COMPLEX` | — | An HTML body has more elements than allowed. |
| <span id="e-goldstone-dns-unavailable"></span>`E_GOLDSTONE_DNS_UNAVAILABLE` | — | An authenticity check needed DNS and DNS failed. |
| <span id="e-goldstone-invalid-envelope"></span>`E_GOLDSTONE_INVALID_ENVELOPE` | — | The envelope given to an authenticity check is invalid (an address that is not an IP…). |
| <span id="e-goldstone-engine"></span>`E_GOLDSTONE_ENGINE` | — | The engine failed without one of the codes above. |
| <span id="e-goldstone-native-required"></span>`E_GOLDSTONE_NATIVE_REQUIRED` | — | The Rust mail engine is not loaded. |
| <span id="e-goldstone-invalid-limits"></span>`E_GOLDSTONE_INVALID_LIMITS` | — | A parsing limit is not a positive integer under 2^32. |
| <span id="e-goldstone-invalid-options"></span>`E_GOLDSTONE_INVALID_OPTIONS` | — | An authenticity check option is not a positive integer under 2^32. |
| <span id="e-goldstone-invalid-config"></span>`E_GOLDSTONE_INVALID_CONFIG` | — | The inbox config is invalid (no mailbox declared…). |
| <span id="e-goldstone-insecure-connection"></span>`E_GOLDSTONE_INSECURE_CONNECTION` | — | A mailbox would connect without TLS. Set `starttls: true`, or `allowInsecure` for a local test server. |
| <span id="e-goldstone-unknown-mailbox"></span>`E_GOLDSTONE_UNKNOWN_MAILBOX` | — | A mailbox name is not configured. |
| <span id="e-goldstone-uidvalidity-changed"></span>`E_GOLDSTONE_UIDVALIDITY_CHANGED` | — | A watched folder renumbered its messages; watching resumes from the newest. |

## Helix Plugin Errors

Raised by `@c9up/helix-plugin-ream` as plain `Error`s whose message starts with `[CODE]`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-no-server"></span>`E_NO_SERVER` | — | `apiClient()` was given neither `testUtils` nor `boot`. |
| <span id="e-server-not-started"></span>`E_SERVER_NOT_STARTED` | — | No server is running for the suite. Add the hook that starts it. |
| <span id="e-no-test-client"></span>`E_NO_TEST_CLIENT` | — | No client is in play. Add `apiClient()` to the plugins in `tests/bootstrap.ts`. |

## Inker Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-inker-template-not-found"></span>`E_INKER_TEMPLATE_NOT_FOUND` | — | No template has this name. |
| <span id="e-inker-parse-error"></span>`E_INKER_PARSE_ERROR` | — | The template cannot be parsed. |
| <span id="e-inker-unknown-identifier"></span>`E_INKER_UNKNOWN_IDENTIFIER` | — | An expression names an identifier that is not in scope. |
| <span id="e-inker-invalid-path"></span>`E_INKER_INVALID_PATH` | — | A template path is invalid (traversal, absolute path…). |
| <span id="e-inker-unclosed-interpolation"></span>`E_INKER_UNCLOSED_INTERPOLATION` | — | A `{{` has no matching `}}`. |
| <span id="e-inker-unclosed-block-tag"></span>`E_INKER_UNCLOSED_BLOCK_TAG` | — | A block tag is not closed. |
| <span id="e-inker-unclosed-block"></span>`E_INKER_UNCLOSED_BLOCK` | — | A block has no `@end`. |
| <span id="e-inker-unmatched-block-end"></span>`E_INKER_UNMATCHED_BLOCK_END` | — | An `@end` closes no block. |
| <span id="e-inker-mismatched-block-end"></span>`E_INKER_MISMATCHED_BLOCK_END` | — | An `@end` closes another block than the open one. |
| <span id="e-inker-unknown-directive"></span>`E_INKER_UNKNOWN_DIRECTIVE` | — | A directive the engine does not know. |
| <span id="e-inker-unknown-tag"></span>`E_INKER_UNKNOWN_TAG` | — | No tag is registered under this name. Register it with `templates.registerTag()`. |
| <span id="e-inker-invalid-layout-position"></span>`E_INKER_INVALID_LAYOUT_POSITION` | — | `@layout` is not the first statement of the template. |
| <span id="e-inker-duplicate-layout"></span>`E_INKER_DUPLICATE_LAYOUT` | — | A template declares more than one layout. |
| <span id="e-inker-nested-layout-unsupported"></span>`E_INKER_NESTED_LAYOUT_UNSUPPORTED` | — | A layout extends another layout. |
| <span id="e-inker-layout-in-partial"></span>`E_INKER_LAYOUT_IN_PARTIAL` | — | A partial declares a layout. |
| <span id="e-inker-circular-include"></span>`E_INKER_CIRCULAR_INCLUDE` | — | Templates include each other in a loop. |
| <span id="e-inker-missing-slot"></span>`E_INKER_MISSING_SLOT` | — | A component requires a slot the caller did not fill. |
| <span id="e-inker-unknown-slot"></span>`E_INKER_UNKNOWN_SLOT` | — | The caller fills a slot the component does not declare. |
| <span id="e-inker-disk-required"></span>`E_INKER_DISK_REQUIRED` | — | A template rendered from a string (`renderString`, `renderRaw`) uses `@layout`, `@include`, `@component` or `{{> name }}`, which need template files: render it by name with `render(name, data)`. |
| <span id="e-inker-disk-collision"></span>`E_INKER_DISK_COLLISION` | — | Two disks are mounted under the same name. |
| <span id="e-inker-template-collision"></span>`E_INKER_TEMPLATE_COLLISION` | — | Two templates are registered under the same name. |
| <span id="e-inker-invalid-expression"></span>`E_INKER_INVALID_EXPRESSION` | — | An expression cannot be evaluated. |
| <span id="e-inker-invalid-iterable"></span>`E_INKER_INVALID_ITERABLE` | — | `@each` was given something that is not iterable. |
| <span id="e-inker-helper-throw"></span>`E_INKER_HELPER_THROW` | — | A helper threw during the render. |
| <span id="e-inker-async-not-supported"></span>`E_INKER_ASYNC_NOT_SUPPORTED` | — | A construct that renders synchronously used `await`. |
| <span id="e-inker-render-depth"></span>`E_INKER_RENDER_DEPTH` | — | The render nested too deep. |
| <span id="e-inker-dump-die"></span>`E_INKER_DUMP_DIE` | — | `@dd()` stopped the render and printed its value. |
| <span id="e-inker-invalid-json-ld"></span>`E_INKER_INVALID_JSON_LD` | — | A value given to the JSON-LD helper cannot be held in JSON-LD. |
| <span id="e-inker-template-error"></span>`E_INKER_TEMPLATE_ERROR` | — | A template raised an error itself. |
| <span id="e-inker-engine-missing"></span>`E_INKER_ENGINE_MISSING` | — | A template was rendered through the inker singleton before `InkerProvider` built the engine. |
| <span id="e-inker-napi-required"></span>`E_INKER_NAPI_REQUIRED` | — | There is no native inker binary for this platform. |

## Lumen Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-lumen-invalid-column"></span>`E_LUMEN_INVALID_COLUMN` | — | A table was asked for a column shape it does not have. |

## Neutrino Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-neutrino-invalid-descriptor"></span>`E_NEUTRINO_INVALID_DESCRIPTOR` | — | The bytes are not a valid `FileDescriptorSet`. |
| <span id="e-neutrino-duplicate-type"></span>`E_NEUTRINO_DUPLICATE_TYPE` | — | Two descriptors declare the same type differently. |
| <span id="e-neutrino-unknown-type"></span>`E_NEUTRINO_UNKNOWN_TYPE` | — | No message or enum type of this name is loaded. |
| <span id="e-neutrino-unknown-method"></span>`E_NEUTRINO_UNKNOWN_METHOD` | — | No method of this path is loaded. |
| <span id="e-neutrino-invalid-message"></span>`E_NEUTRINO_INVALID_MESSAGE` | — | The bytes are not a valid message of the type. |
| <span id="e-neutrino-invalid-metadata"></span>`E_NEUTRINO_INVALID_METADATA` | — | Binary gRPC metadata is malformed; the server answers INTERNAL. |
| <span id="e-neutrino-grpc-status"></span>`E_NEUTRINO_GRPC_STATUS` | — | `GrpcError`: a method answers a gRPC status instead of a reply; its message goes to the client as the status details. |
| <span id="e-neutrino-duplicate-service"></span>`E_NEUTRINO_DUPLICATE_SERVICE` | — | A service is registered twice. |
| <span id="e-neutrino-invalid-implementation"></span>`E_NEUTRINO_INVALID_IMPLEMENTATION` | — | A method implementation is not a function. |
| <span id="e-neutrino-streaming-unsupported"></span>`E_NEUTRINO_STREAMING_UNSUPPORTED` | — | A streaming method was registered; only unary methods are served. |
| <span id="e-neutrino-invalid-option"></span>`E_NEUTRINO_INVALID_OPTION` | — | A size option is not a whole number of bytes, or `-1` for no limit. |
| <span id="e-neutrino-grpc-unsupported"></span>`E_NEUTRINO_GRPC_UNSUPPORTED` | — | The server has no `grpc()` method. Upgrade `@c9up/ream`. |

## Nova Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-nova-invalid-subscription"></span>`E_NOVA_INVALID_SUBSCRIPTION` | 400 | The subscribe or unsubscribe body is not a valid `PushSubscription`. |
| <span id="e-nova-subscription-conflict"></span>`E_NOVA_SUBSCRIPTION_CONFLICT` | 409 | Another request was writing the same endpoint at the same time. Retry the subscribe. |
| <span id="e-nova-subscription-not-found"></span>`E_NOVA_SUBSCRIPTION_NOT_FOUND` | 404 | The user has no such subscription. |
| <span id="e-nova-missing-user"></span>`E_NOVA_MISSING_USER` | — | The subscription handler ran without an authenticated user. |
| <span id="e-nova-invalid-user-id"></span>`E_NOVA_INVALID_USER_ID` | — | The authenticated user has no usable id (a non-empty string or an integer). |
| <span id="e-nova-vapid-not-configured"></span>`E_NOVA_VAPID_NOT_CONFIGURED` | — | A VAPID key or subject is missing. |
| <span id="e-nova-http-client-missing"></span>`E_NOVA_HTTP_CLIENT_MISSING` | — | Sending a push needs the outbound HTTP client of `@c9up/ream`. |
| <span id="e-nova-unknown-store"></span>`E_NOVA_UNKNOWN_STORE` | — | The config names a store it does not declare. |
| <span id="e-nova-invalid-table"></span>`E_NOVA_INVALID_TABLE` | — | The SQL store's table name is not a plain identifier. |
| <span id="e-nova-invalid-prefix"></span>`E_NOVA_INVALID_PREFIX` | — | The Redis store's key prefix contains a space. |
| <span id="e-nova-store-busy"></span>`E_NOVA_STORE_BUSY` | — | A subscription changed under every attempt to write it. |
| <span id="e-nova-store-file-unreadable"></span>`E_NOVA_STORE_FILE_UNREADABLE` | — | The file store's file is not valid JSON. |
| <span id="e-nova-quasar-missing"></span>`E_NOVA_QUASAR_MISSING` | — | A Redis store was configured and `@c9up/quasar` is not installed. |
| <span id="e-nova-redis-incomplete"></span>`E_NOVA_REDIS_INCOMPLETE` | — | The quasar connection lacks what nova needs. |

## Orbit Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-orbit-no-host"></span>`E_ORBIT_NO_HOST` | — | `mount` ran before `useHost` gave orbit a native host, or the module is not orbit's. |
| <span id="e-orbit-commit-failed"></span>`E_ORBIT_COMMIT_FAILED` | — | The native host refused a commit; the message carries its report. |
| <span id="e-orbit-unsupported-element"></span>`E_ORBIT_UNSUPPORTED_ELEMENT` | — | An element with no native mapping (`select`, `canvas`, or `text` / a gradient inside an `svg`). |
| <span id="e-orbit-block-in-text"></span>`E_ORBIT_BLOCK_IN_TEXT` | — | A block element inside text: native text holds only inline runs. |
| <span id="e-orbit-invalid-motion"></span>`E_ORBIT_INVALID_MOTION` | — | `motion=${…}` was not an object of motion values. |
| <span id="e-orbit-invalid-scroll-binding"></span>`E_ORBIT_INVALID_SCROLL_BINDING` | — | `scroll-y=${…}` was not a motion value. |
| <span id="e-orbit-invalid-color"></span>`E_ORBIT_INVALID_COLOR` | — | A colour orbit cannot read. |
| <span id="e-orbit-insecure-image-url"></span>`E_ORBIT_INSECURE_IMAGE_URL` | — | `<img src>` over plain http: images are fetched over https only. |
| <span id="e-orbit-image-source"></span>`E_ORBIT_IMAGE_SOURCE` | — | `<img src>` with a scheme that is not an image source (`data:`, `javascript:`…). |
| <span id="e-orbit-duplicate-key"></span>`E_ORBIT_DUPLICATE_KEY` | — | Two elements of an `each` list share a key. |
| <span id="e-orbit-no-screen"></span>`E_ORBIT_NO_SCREEN` | — | `useScreen()` in a component no screen of a stack built. |
| <span id="e-orbit-stack-shown"></span>`E_ORBIT_STACK_SHOWN` | — | One stack put in two places: a stack is shown once. |
| <span id="e-orbit-style-table"></span>`E_ORBIT_STYLE_TABLE` | — | `useStyles` got something other than a table `ream css:compile` wrote. |
| <span id="e-orbit-insecure-server"></span>`E_ORBIT_INSECURE_SERVER` | — | `serverPages({ server })` over plain http to a host that is neither this machine nor the emulator's. |
| <span id="e-orbit-unknown-page"></span>`E_ORBIT_UNKNOWN_PAGE` | — | The server named a page the app does not have (`serverPages({ pages })`). |

## Orbit Clipboard Errors

Raised by `@c9up/orbit-clipboard` as an `OrbitClipboardError`, the same in the browser and on a phone.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-orbit-clipboard-unavailable"></span>`E_ORBIT_CLIPBOARD_UNAVAILABLE` | — | No clipboard to reach: the server, an insecure page, or an app built without the native module. |
| <span id="e-orbit-clipboard-denied"></span>`E_ORBIT_CLIPBOARD_DENIED` | — | The platform refused: no permission, or the page or app was not in focus. |

## Orbit Secure Store Errors

Raised by `@c9up/orbit-secure-store` as an `OrbitSecureStoreError`. A cancelled biometric check is not a failed one.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-orbit-secure-store-unavailable"></span>`E_ORBIT_SECURE_STORE_UNAVAILABLE` | — | No secure store here: the browser, the server, or an app built without the module. |
| <span id="e-orbit-secure-store-invalid-key"></span>`E_ORBIT_SECURE_STORE_INVALID_KEY` | — | A key that is not 1 to 128 of `A-Z a-z 0-9 . _ -`. |
| <span id="e-orbit-secure-store-no-biometrics"></span>`E_ORBIT_SECURE_STORE_NO_BIOMETRICS` | — | `requireAuthentication` on a phone with no strong biometric enrolled. |
| <span id="e-orbit-secure-store-auth-cancelled"></span>`E_ORBIT_SECURE_STORE_AUTH_CANCELLED` | — | The user dismissed the biometric prompt. |
| <span id="e-orbit-secure-store-auth-failed"></span>`E_ORBIT_SECURE_STORE_AUTH_FAILED` | — | The biometric check failed for good: too many attempts, a lockout, a hardware error. |
| <span id="e-orbit-secure-store-invalidated"></span>`E_ORBIT_SECURE_STORE_INVALIDATED` | — | The key behind the value is gone (a new biometric enrolled, the app's data restored), and the value with it. |
| <span id="e-orbit-secure-store-failed"></span>`E_ORBIT_SECURE_STORE_FAILED` | — | Anything else the platform reported; the error never carries the value. |

## Parsec Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-parsec-invalid-name"></span>`E_PARSEC_INVALID_NAME` | — | A metric or label name is not valid. |
| <span id="e-parsec-invalid-instrument"></span>`E_PARSEC_INVALID_INSTRUMENT` | — | An instrument is declared with options it cannot have. |
| <span id="e-parsec-instrument-conflict"></span>`E_PARSEC_INSTRUMENT_CONFLICT` | — | A metric name is already declared with a different type, help or label set. |
| <span id="e-parsec-invalid-measurement"></span>`E_PARSEC_INVALID_MEASUREMENT` | — | A measurement is not a finite number. |
| <span id="e-parsec-invalid-label-value"></span>`E_PARSEC_INVALID_LABEL_VALUE` | — | A label value is neither a string nor a finite number. |
| <span id="e-parsec-undeclared-label"></span>`E_PARSEC_UNDECLARED_LABEL` | — | A measurement was given a label the metric does not declare. |
| <span id="e-parsec-unknown-exporter"></span>`E_PARSEC_UNKNOWN_EXPORTER` | — | An exporter name is not declared. |
| <span id="e-parsec-unprotected-endpoint"></span>`E_PARSEC_UNPROTECTED_ENDPOINT` | — | The metrics endpoint would be served without protection. Set a token, or `public: true` deliberately. |
| <span id="e-parsec-empty-token"></span>`E_PARSEC_EMPTY_TOKEN` | — | The metrics endpoint token is empty, which would match a request without credentials. |

## Photon Errors

Server-side errors are thrown from `@c9up/photon` (SSR / renderer); client-side errors are thrown from `@c9up/photon/client` (hydration / SPA-nav). Every code carries a `docsUrl` that resolves to its anchor below — operators can jump from the terminal directly to the recovery instructions.

### E_PHOTON_INVALID_CONFIG

**Cause.** A field in `config/photon.ts` (or the `PhotonConfig` passed to `PhotonRenderer`) fails validation: `buildDir` resolves outside the project root, or `ssr.entrypoint` / `entryClient` contains path-traversal segments or characters outside `[\w./\-@#]`.

**Fix.**
1. Open `config/photon.ts` and verify `buildDir` is a relative path INSIDE your project (e.g. `dist`, NOT `../dist`).
2. Verify `ssr.entrypoint` and `entryClient` are relative paths without `..` segments and end in `.tsx?` / `.jsx?` / `.vue` / `.svelte`.
3. Restart the renderer (`PhotonRenderer.boot()` re-validates).

Also thrown at render time when `rootView` names a template but the request has no view engine (`ctx.view`): install one (`@c9up/inker` sets it), or make `rootView` return a function that writes the document.

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
| <span id="e-prism-image-no-source"></span>`E_PRISM_IMAGE_NO_SOURCE` | 400 | `/__image` was called without `src`. |
| <span id="e-prism-image-width-not-allowed"></span>`E_PRISM_IMAGE_WIDTH_NOT_ALLOWED` | 400 | `w` is not one of the configured widths. |
| <span id="e-prism-image-format-not-allowed"></span>`E_PRISM_IMAGE_FORMAT_NOT_ALLOWED` | 400 | `f` is not one of the configured formats. |
| <span id="e-prism-image-quality-not-allowed"></span>`E_PRISM_IMAGE_QUALITY_NOT_ALLOWED` | 400 | `q` is not one of the configured qualities. |
| <span id="e-prism-image-not-found"></span>`E_PRISM_IMAGE_NOT_FOUND` | 404 | No image at `src`. |
| <span id="e-prism-image-unprocessable"></span>`E_PRISM_IMAGE_UNPROCESSABLE` | 422 | The source is not an image the endpoint can serve. |
| <span id="e-prism-image-busy"></span>`E_PRISM_IMAGE_BUSY` | 503 | Too many images are being rendered; retry shortly. |
| <span id="e-prism-empty-input"></span>`E_PRISM_EMPTY_INPUT` | — | The input is empty. |
| <span id="e-prism-input-too-large"></span>`E_PRISM_INPUT_TOO_LARGE` | — | The input is over the byte limit. |
| <span id="e-prism-too-many-pixels"></span>`E_PRISM_TOO_MANY_PIXELS` | — | The image, or an image an operation would build, is over the pixel ceiling; refused before it is allocated. |
| <span id="e-prism-zero-dimension"></span>`E_PRISM_ZERO_DIMENSION` | — | The image has a zero width or height. |
| <span id="e-prism-unknown-format"></span>`E_PRISM_UNKNOWN_FORMAT` | — | The bytes are not an image format prism recognises. |
| <span id="e-prism-unsupported-format"></span>`E_PRISM_UNSUPPORTED_FORMAT` | — | The format is recognised but not supported. |
| <span id="e-prism-format-not-allowed"></span>`E_PRISM_FORMAT_NOT_ALLOWED` | — | A real image, in a format the application chose not to decode. |
| <span id="e-prism-unreadable"></span>`E_PRISM_UNREADABLE` | — | The image cannot be read. |
| <span id="e-prism-decode-failed"></span>`E_PRISM_DECODE_FAILED` | — | Decoding the image failed. |
| <span id="e-prism-encode-failed"></span>`E_PRISM_ENCODE_FAILED` | — | Encoding the output failed. |
| <span id="e-prism-invalid-geometry"></span>`E_PRISM_INVALID_GEOMETRY` | — | A geometry the image cannot satisfy: a crop outside its bounds, a target size of zero. |
| <span id="e-prism-invalid-font"></span>`E_PRISM_INVALID_FONT` | — | A font cannot be used. |
| <span id="e-prism-colour-space"></span>`E_PRISM_COLOUR_SPACE` | — | A colour space that cannot be named, or a conversion the model refuses. |
| <span id="e-prism-invalid-operation"></span>`E_PRISM_INVALID_OPERATION` | — | An operation lacks a field it needs, or has one out of range. |
| <span id="e-prism-qr-too-long"></span>`E_PRISM_QR_TOO_LONG` | — | More text than a QR code can hold at the chosen level and version. |
| <span id="e-prism-invalid-qr-option"></span>`E_PRISM_INVALID_QR_OPTION` | — | A QR code option out of range, or a colour that is not strict hex. |
| <span id="e-prism-internal-panic"></span>`E_PRISM_INTERNAL_PANIC` | — | The engine panicked; always a bug in prism. |
| <span id="e-prism-engine"></span>`E_PRISM_ENGINE` | — | The engine failed without a known code. |
| <span id="e-prism-native-required"></span>`E_PRISM_NATIVE_REQUIRED` | — | The Rust image engine is not loaded. |

## Quasar Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-invalid-bytes-value"></span>`E_INVALID_BYTES_VALUE` | 500 | A Redis health check memory threshold cannot be read as a size. |

## Ream MCP Errors

Returned in the result of the MCP server's template tool.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-inker-render-timeout"></span>`E_INKER_RENDER_TIMEOUT` | — | A template render took longer than the tool allows. |
| <span id="e-inker-unknown"></span>`E_INKER_UNKNOWN` | — | A template render failed without an inker code. |

## Relay Errors

Returned in the JSON body of the relay routes, or as an `error` event on a hub.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-relay-bad-request"></span>`E_RELAY_BAD_REQUEST` | 400 | `subscribe` without a usable `uid` or `channel` (both non-empty strings). |
| <span id="e-relay-channel-too-long"></span>`E_RELAY_CHANNEL_TOO_LONG` | 400 | The channel name exceeds 256 characters. |
| <span id="e-relay-not-connected"></span>`E_RELAY_NOT_CONNECTED` | 400 | No connection has this uid on this instance and no bus is configured to relay the request to the instance holding it — or the connection closed. |
| <span id="e-relay-bus-unavailable"></span>`E_RELAY_BUS_UNAVAILABLE` | 503 | The subscription had to be relayed to the instance holding the stream, and the bus refused the message. |
| <span id="e-relay-not-owner"></span>`E_RELAY_NOT_OWNER` | 403 | The connection was opened by another user; subscribe, unsubscribe and hub frames must come from the same one. |
| <span id="e-relay-channel-no-authorizer"></span>`E_RELAY_CHANNEL_NO_AUTHORIZER` | 403 | No `relay.authorize()` covers the channel, and `allowUnauthorizedChannels` is off. |
| <span id="e-relay-channel-forbidden"></span>`E_RELAY_CHANNEL_FORBIDDEN` | 403 | The channel's authorizer refused, or threw. |
| <span id="e-relay-max-channels"></span>`E_RELAY_MAX_CHANNELS` | 429 | The connection holds `maxChannelsPerClient` channels already. |
| <span id="e-relay-max-clients"></span>`E_RELAY_MAX_CLIENTS` | — | The instance holds `maxClients` connections already; sent as an `error` frame before the stream closes. |
| <span id="e-relay-max-clients-per-owner"></span>`E_RELAY_MAX_CLIENTS_PER_OWNER` | — | This user holds the maximum number of connections already; sent as an `error` frame before the stream closes. |
| <span id="e-relay-unknown-connection"></span>`E_RELAY_UNKNOWN_CONNECTION` | 400 | A hub request with no valid connection token — call `<path>/negotiate` first. |
| <span id="e-relay-max-connections"></span>`E_RELAY_MAX_CONNECTIONS` | 503 | A hub already has `maxConnections` open streams. |
| <span id="e-relay-max-connections-per-owner"></span>`E_RELAY_MAX_CONNECTIONS_PER_OWNER` | 503 | This client already has the maximum number of open hub streams. |
| <span id="e-relay-max-pending"></span>`E_RELAY_MAX_PENDING` | 503 | Too many hub connections are negotiated and not yet open. |
| <span id="e-relay-shut-down"></span>`E_RELAY_SHUT_DOWN` | 503 | The realtime service is shutting down. |
| <span id="e-relay-unauthorized"></span>`E_RELAY_UNAUTHORIZED` | — | A hub invocation needs an authenticated user, or one authenticated through another guard. |
| <span id="e-relay-forbidden"></span>`E_RELAY_FORBIDDEN` | — | A hub invocation lacks the required role or permission. |
| <span id="e-relay-unknown-event"></span>`E_RELAY_UNKNOWN_EVENT` | — | A hub invocation names no handler. |
| <span id="e-relay-handler-error"></span>`E_RELAY_HANDLER_ERROR` | — | A hub handler threw. |

## Robledo Errors

Raised by `@c9up/robledo` as a `RobledoError`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-robledo-invalid-prefix"></span>`E_ROBLEDO_INVALID_PREFIX` | — | The routes' prefix does not start with `/`, or ends with one. |
| <span id="e-robledo-not-booted"></span>`E_ROBLEDO_NOT_BOOTED` | — | `services/main` was used before the provider booted. |
| <span id="e-robledo-no-native-module"></span>`E_ROBLEDO_NO_NATIVE_MODULE` | — | The app has no native robledo module: it was not built with robledo installed. |
| <span id="e-robledo-bad-response"></span>`E_ROBLEDO_BAD_RESPONSE` | — | The server answered an update check with something other than an update. |
| <span id="e-robledo-refused"></span>`E_ROBLEDO_REFUSED` | — | The phone refused an update: bad signature, altered file, wrong runtime… |

## Rover Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-mail-invalid-message"></span>`E_MAIL_INVALID_MESSAGE` | — | A message lacks what sending needs (a `from` address, a recipient…). |
| <span id="e-mail-invalid-address"></span>`E_MAIL_INVALID_ADDRESS` | — | An address is not a valid mail address. |
| <span id="e-mail-header-injection"></span>`E_MAIL_HEADER_INJECTION` | — | A header value contains a line break or NUL. |
| <span id="e-invalid-list-header"></span>`E_INVALID_LIST_HEADER` | — | A `List-*` header entry is not one URL (https, http, mailto or ftp) or bare address. |
| <span id="e-mail-field-unsupported"></span>`E_MAIL_FIELD_UNSUPPORTED` | — | The transport cannot set a field the message uses (such as the SMTP envelope). |
| <span id="e-attachment-unreadable"></span>`E_ATTACHMENT_UNREADABLE` | — | An attachment's file cannot be read. |
| <span id="e-mail-provider-config"></span>`E_MAIL_PROVIDER_CONFIG` | — | A transport's config is invalid. |
| <span id="e-mail-provider-error"></span>`E_MAIL_PROVIDER_ERROR` | — | The transport failed to send; the error carries the provider's status or network code. |
| <span id="e-mail-retry-config"></span>`E_MAIL_RETRY_CONFIG` | — | A retry setting is out of range. |
| <span id="e-mail-config-missing"></span>`E_MAIL_CONFIG_MISSING` | — | No `mail` config is registered. Create `config/mail.ts`, or run `ream configure @c9up/rover`. |
| <span id="e-mail-unknown-mailer"></span>`E_MAIL_UNKNOWN_MAILER` | — | A mailer name, or the default mailer, is not configured. |
| <span id="e-mail-unknown-transport"></span>`E_MAIL_UNKNOWN_TRANSPORT` | — | A transport type is unknown. |
| <span id="e-mail-job-malformed"></span>`E_MAIL_JOB_MALFORMED` | — | A queued mail job's payload is missing or not an object. |
| <span id="e-mail-template-engine"></span>`E_MAIL_TEMPLATE_ENGINE` | — | The app uses inker but rover cannot render mail views with it. |
| <span id="e-mail-template-not-found"></span>`E_MAIL_TEMPLATE_NOT_FOUND` | — | A mail template is not found. |
| <span id="e-mail-template-read-error"></span>`E_MAIL_TEMPLATE_READ_ERROR` | — | A mail template cannot be read. |
| <span id="e-mail-template-syntax"></span>`E_MAIL_TEMPLATE_SYNTAX` | — | A mail template has a syntax error. |
| <span id="e-mail-template-recursion"></span>`E_MAIL_TEMPLATE_RECURSION` | — | Mail templates include each other too deep. |
| <span id="e-mail-template-napi-required"></span>`E_MAIL_TEMPLATE_NAPI_REQUIRED` | — | There is no rover native binary for this platform. |
| <span id="e-assertion-failed"></span>`E_ASSERTION_FAILED` | — | A fake-mailer assertion on a sent message failed. |
| <span id="e-rover-unknown"></span>`E_ROVER_UNKNOWN` | — | A send failed with an error that carries no code of its own. |

## Rune Errors

Rune normalises its codes: a code that already starts with `E_` is kept, any other gets the `E_RUNE_` prefix.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-validation-error-rune"></span>`E_VALIDATION_ERROR` | 422 | `validateOrThrow()` found invalid data. Carries a `messages` array with one entry per field and rule. |
| <span id="e-rune-meta-required"></span>`E_RUNE_META_REQUIRED` | — | A validator built with `withMetaData()` was called without `{ meta }`. |
| <span id="e-rune-not-a-regular-file"></span>`E_RUNE_NOT_A_REGULAR_FILE` | — | A `file()` value is not a regular file, so it is not an upload. |
| <span id="e-rune-invalid-size"></span>`E_RUNE_INVALID_SIZE` | — | `file()` was given a size it cannot read. |
| <span id="e-rune-invalid-error-reporter"></span>`E_RUNE_INVALID_ERROR_REPORTER` | — | `errorReporter` takes no argument and did not return a reporter (`{ report, createError }`). |
| <span id="e-rune-invalid-rule"></span>`E_RUNE_INVALID_RULE` | — | `use()` was given something other than a compiled rule; call the factory first. |
| <span id="e-rune-no-rule"></span>`E_RUNE_NO_RULE` | — | `message()` was called before any rule. |
| <span id="e-rune-not-an-object"></span>`E_RUNE_NOT_AN_OBJECT` | — | `merge()` (or a similar shape method) needs an `object()` shape. |
| <span id="e-rune-partial-not-applicable"></span>`E_RUNE_PARTIAL_NOT_APPLICABLE` | — | `partial()` cannot relax a shape that has groups or `allowUnknownProperties()`. |
| <span id="e-rune-no-type-rule"></span>`E_RUNE_NO_TYPE_RULE` | — | A `unionOfTypes()` branch declares no type. |
| <span id="e-rune-duplicate-union-type"></span>`E_RUNE_DUPLICATE_UNION_TYPE` | — | Two `unionOfTypes()` branches declare the same type. |
| <span id="e-rune-async-rule-not-awaited"></span>`E_RUNE_ASYNC_RULE_NOT_AWAITED` | — | A synchronous run met an async rule. Use the async variant. |
| <span id="e-rune-no-database-resolver"></span>`E_RUNE_NO_DATABASE_RESOLVER` | — | A database rule (`unique`, `exists`) has no resolver. Call `bindDatabase()` at boot, or pass a callback. |
| <span id="e-rune-no-host-resolver"></span>`E_RUNE_NO_HOST_RESOLVER` | — | `activeUrl()` needs a host resolver. |
| <span id="e-rune-unsupported-locale"></span>`E_RUNE_UNSUPPORTED_LOCALE` | — | `mobile()` has no numbering plan for the locale. |
| <span id="e-rune-unsupported-country"></span>`E_RUNE_UNSUPPORTED_COUNTRY` | — | A country-specific rule (`postalCode()`…) has no pattern for the country. |
| <span id="e-rune-unsupported-json-schema-target"></span>`E_RUNE_UNSUPPORTED_JSON_SCHEMA_TARGET` | — | A JSON Schema target rune does not emit. |
| <span id="e-rune-no-output-schema"></span>`E_RUNE_NO_OUTPUT_SCHEMA` | — | A validator's output cannot be described as JSON Schema: a transform may produce anything. |
| <span id="e-rune-napi-required"></span>`E_RUNE_NAPI_REQUIRED` | — | The Rust validation engine is not loaded. |
| <span id="e-rune-napi-not-found"></span>`E_RUNE_NAPI_NOT_FOUND` | — | The Rust validation engine binary is not found. |
| <span id="e-rune-napi-request-refused"></span>`E_RUNE_NAPI_REQUEST_REFUSED` | — | The Rust validation engine refused the request. |
| <span id="e-rune-napi-invalid-response"></span>`E_RUNE_NAPI_INVALID_RESPONSE` | — | The Rust validation engine returned an unexpected shape. |

## Sigil Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-sigil-unknown-driver"></span>`E_SIGIL_UNKNOWN_DRIVER` | — | A hasher names a driver sigil does not know. |
| <span id="e-sigil-napi-required"></span>`E_SIGIL_NAPI_REQUIRED` | — | The driver needs the Rust engine, which is not loaded. |
| <span id="e-sigil-not-booted"></span>`E_SIGIL_NOT_BOOTED` | — | `hash.<member>` was used before `SigilProvider.boot()` ran. |
| <span id="e-sigil-unknown-hasher"></span>`E_SIGIL_UNKNOWN_HASHER` | — | `hash.use(name)` (or the config's `default`) names a hasher the hash config does not declare. |

## Spectrum Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-spectrum-unknown-level"></span>`E_SPECTRUM_UNKNOWN_LEVEL` | — | A transport target level is not a log level. |
| <span id="e-spectrum-unsupported-target"></span>`E_SPECTRUM_UNSUPPORTED_TARGET` | — | A transport target spectrum does not build. Pass a `LogChannel` to write anywhere else. |
| <span id="e-spectrum-invalid-file-options"></span>`E_SPECTRUM_INVALID_FILE_OPTIONS` | — | A file destination is neither a path nor a file descriptor. |
| <span id="e-spectrum-invalid-line-options"></span>`E_SPECTRUM_INVALID_LINE_OPTIONS` | — | A JSON-line option is invalid. |
| <span id="e-spectrum-invalid-redact-path"></span>`E_SPECTRUM_INVALID_REDACT_PATH` | — | A redaction path cannot be parsed. |
| <span id="e-spectrum-invalid-stringify-limit"></span>`E_SPECTRUM_INVALID_STRINGIFY_LIMIT` | — | A serialisation limit is not a positive integer. |
| <span id="e-spectrum-unsupported-option"></span>`E_SPECTRUM_UNSUPPORTED_OPTION` | — | A logger option spectrum does not support. |
| <span id="e-spectrum-logger-not-bound"></span>`E_SPECTRUM_LOGGER_NOT_BOUND` | — | The container resolved something other than a `Logger` for the `Logger` token. |

## Station Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-station-login-credentials-required"></span>`E_STATION_LOGIN_CREDENTIALS_REQUIRED` | 400 | The admin sign-in form was sent without an email or a password. |
| <span id="e-station-login-identifier-too-long"></span>`E_STATION_LOGIN_IDENTIFIER_TOO_LONG` | 400 | The admin sign-in email is longer than 254 characters (RFC 5321); refused before the rate limiter. |
| <span id="e-station-invalid-credentials"></span>`E_STATION_INVALID_CREDENTIALS` | 401 | Invalid email or password. |
| <span id="e-station-too-many-login-attempts"></span>`E_STATION_TOO_MANY_LOGIN_ATTEMPTS` | 429 | Too many sign-in attempts; try again later. |
| <span id="e-station-login-unavailable"></span>`E_STATION_LOGIN_UNAVAILABLE` | 503 | Sign-in is temporarily unavailable. |
| <span id="e-station-csrf-required"></span>`E_STATION_CSRF_REQUIRED` | 403 | An admin action requires an active, verified CSRF token. |
| <span id="e-validation-error-station"></span>`E_VALIDATION_ERROR` | 422 | An admin form failed validation (JSON clients; a browser is redirected back). |

## Transit Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-transit-invalid-xml"></span>`E_TRANSIT_INVALID_XML` | — | A provider answered XML that cannot be parsed, or that uses a construct transit refuses. |
| <span id="e-transit-protected-parameter"></span>`E_TRANSIT_PROTECTED_PARAMETER` | — | A per-request `begin()`/`redirect()` callback tried to set or clear a parameter the sign-in owns (`state`, `nonce`, the PKCE challenge, `client_id`, `redirect_uri`, `response_type`), or `scope` through `param()` instead of the scope methods. |

## Vellum Errors

Vellum normalises its codes: a code that already starts with `E_` is kept, any other gets the `E_VELLUM_` prefix.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-vellum-invalid-pdf"></span>`E_VELLUM_INVALID_PDF` | — | The bytes are not a PDF vellum can read. |
| <span id="e-vellum-signed-document"></span>`E_VELLUM_SIGNED_DOCUMENT` | — | An edit would invalidate the document's signatures; refused unless the caller says they may go. |
| <span id="e-vellum-invalid-page"></span>`E_VELLUM_INVALID_PAGE` | — | A page number is not a whole number from 1. |
| <span id="e-vellum-invalid-rotation"></span>`E_VELLUM_INVALID_ROTATION` | — | A rotation is not a multiple of 90. |
| <span id="e-vellum-empty-merge"></span>`E_VELLUM_EMPTY_MERGE` | — | `merge()` was given no document. |
| <span id="e-vellum-empty-selection"></span>`E_VELLUM_EMPTY_SELECTION` | — | Selecting needs at least one page. |
| <span id="e-vellum-merge-failed"></span>`E_VELLUM_MERGE_FAILED` | — | Merging documents failed. |
| <span id="e-vellum-select-failed"></span>`E_VELLUM_SELECT_FAILED` | — | Selecting pages failed. |
| <span id="e-vellum-split-failed"></span>`E_VELLUM_SPLIT_FAILED` | — | Splitting the document failed. |
| <span id="e-vellum-rotate-failed"></span>`E_VELLUM_ROTATE_FAILED` | — | Rotating pages failed. |
| <span id="e-vellum-stamp-failed"></span>`E_VELLUM_STAMP_FAILED` | — | Stamping an image failed. |
| <span id="e-vellum-stamp-text-failed"></span>`E_VELLUM_STAMP_TEXT_FAILED` | — | Stamping text failed. |
| <span id="e-vellum-fill-failed"></span>`E_VELLUM_FILL_FAILED` | — | Filling the form failed. |
| <span id="e-vellum-flatten-failed"></span>`E_VELLUM_FLATTEN_FAILED` | — | Flattening the form failed. |
| <span id="e-vellum-render-failed"></span>`E_VELLUM_RENDER_FAILED` | — | Rendering a page to an image failed. |
| <span id="e-vellum-extract-failed"></span>`E_VELLUM_EXTRACT_FAILED` | — | Extracting text failed. |
| <span id="e-vellum-write-failed"></span>`E_VELLUM_WRITE_FAILED` | — | Writing the document failed. |
| <span id="e-vellum-sign-failed"></span>`E_VELLUM_SIGN_FAILED` | — | Signing the document failed. |
| <span id="e-vellum-verify-failed"></span>`E_VELLUM_VERIFY_FAILED` | — | Verifying the signatures failed. |
| <span id="e-vellum-unknown-signer"></span>`E_VELLUM_UNKNOWN_SIGNER` | — | No signer of this name is configured. |
| <span id="e-vellum-signer-invalid"></span>`E_VELLUM_SIGNER_INVALID` | — | A signer's key or certificate is empty. |
| <span id="e-vellum-timestamp-failed"></span>`E_VELLUM_TIMESTAMP_FAILED` | — | Building or reading a timestamp failed. |
| <span id="e-vellum-timestamp-unreachable"></span>`E_VELLUM_TIMESTAMP_UNREACHABLE` | — | The timestamp authority could not be reached. |
| <span id="e-vellum-timestamp-refused"></span>`E_VELLUM_TIMESTAMP_REFUSED` | — | The timestamp authority answered with an error status. |
| <span id="e-vellum-font-unreadable"></span>`E_VELLUM_FONT_UNREADABLE` | — | A configured font file cannot be read. |
| <span id="e-vellum-file-not-found"></span>`E_VELLUM_FILE_NOT_FOUND` | — | A file given by path cannot be read. |
| <span id="e-vellum-invalid-options"></span>`E_VELLUM_INVALID_OPTIONS` | — | A document, page, table or drawing option is invalid. |
| <span id="e-vellum-invalid-color"></span>`E_VELLUM_INVALID_COLOR` | — | A colour cannot be read. |
| <span id="e-vellum-invalid-image"></span>`E_VELLUM_INVALID_IMAGE` | — | An image cannot be used (unreadable, or opened by another document). |
| <span id="e-vellum-invalid-svg"></span>`E_VELLUM_INVALID_SVG` | — | An SVG cannot be used; pass a file as a URL or as its bytes. |
| <span id="e-vellum-unsupported-content"></span>`E_VELLUM_UNSUPPORTED_CONTENT` | — | A path holds an operator vellum does not draw. |
| <span id="e-vellum-invalid-structure"></span>`E_VELLUM_INVALID_STRUCTURE` | — | A structure element was changed after it ended. |
| <span id="e-vellum-no-page"></span>`E_VELLUM_NO_PAGE` | — | There is no current page; call `addPage()` first. |
| <span id="e-vellum-no-form"></span>`E_VELLUM_NO_FORM` | — | Form fields were added before `initForm()`. |
| <span id="e-vellum-document-ended"></span>`E_VELLUM_DOCUMENT_ENDED` | — | The document has ended; nothing more can be added to it. |
| <span id="e-vellum-napi-required"></span>`E_VELLUM_NAPI_REQUIRED` | — | The Rust PDF engine is not loaded. |

## Visa Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-unauthorized-access"></span>`E_UNAUTHORIZED_ACCESS` | 403 | `currentAccessToken.authorize()` found a token too narrow for the ability asked. 403, not 401: the request is authenticated (`insufficient_scope`). |
| <span id="e-visa-missing-issuer"></span>`E_VISA_MISSING_ISSUER` | — | No `issuer` is configured. |
| <span id="e-visa-invalid-issuer"></span>`E_VISA_INVALID_ISSUER` | — | The `issuer` is not a URL. |
| <span id="e-visa-insecure-issuer"></span>`E_VISA_INSECURE_ISSUER` | — | The `issuer` is not https (localhost excepted). |
| <span id="e-visa-no-redirect-uri"></span>`E_VISA_NO_REDIRECT_URI` | — | A client was registered without a redirect URI. |
| <span id="e-visa-invalid-redirect-uri"></span>`E_VISA_INVALID_REDIRECT_URI` | — | A redirect URI is not a complete URL. |
| <span id="e-visa-invalid-initial-access-token"></span>`E_VISA_INVALID_INITIAL_ACCESS_TOKEN` | — | `registration.initialAccessToken` is empty, which would accept an empty bearer token. |
| <span id="e-visa-invalid-secret-ttl"></span>`E_VISA_INVALID_SECRET_TTL` | — | `registration.secretTtlSeconds` is not a positive whole number of seconds. |
| <span id="e-visa-store-read-only"></span>`E_VISA_STORE_READ_ONLY` | — | The client store cannot register clients. |

## Warden Errors

Warden normalises its codes: a code that already starts with `E_` is kept, any other gets the `E_WARDEN_` prefix.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-unauthorized-access-warden"></span>`E_UNAUTHORIZED_ACCESS` | 401 | No guard authenticated the request. A guarded route answers with this code. |
| <span id="e-invalid-credentials"></span>`E_INVALID_CREDENTIALS` | 400 | The credentials do not match. `authFinder().verifyCredentials` throws it for an unknown account and a wrong password alike, after the same hash work. |
| <span id="e-warden-auth-strategy-error"></span>`E_WARDEN_AUTH_STRATEGY_ERROR` | 500 | Every attempted guard crashed (a database down, a bug): a server incident, distinct from a credential rejection. |
| <span id="e-warden-forbidden"></span>`E_WARDEN_FORBIDDEN` | 403 | The user lacks a permission or a role a route declares. |
| <span id="e-warden-mfa-required"></span>`E_WARDEN_MFA_REQUIRED` | 403 | The route declares `@RequireMfa` and the user has not passed the step-up. |
| <span id="e-authorization-failure"></span>`E_AUTHORIZATION_FAILURE` | 403 | A bouncer ability or policy denied the action (403 unless the denial gives another status). The exported class carries the denial as `error.response`, translation included. |
| <span id="e-warden-unauthorized"></span>`E_WARDEN_UNAUTHORIZED` | 401 | The standalone `expressMiddleware()` found no token or refused it. |
| <span id="e-warden-auth-error"></span>`E_WARDEN_AUTH_ERROR` | 500 | The standalone `expressMiddleware()` failed internally. |
| <span id="e-warden-no-auth-config"></span>`E_WARDEN_NO_AUTH_CONFIG` | — | `WardenProvider` booted without any guard configured. |
| <span id="e-warden-napi-required"></span>`E_WARDEN_NAPI_REQUIRED` | — | The Rust JWT engine is not loaded. |
| <span id="e-warden-not-booted"></span>`E_WARDEN_NOT_BOOTED` | — | The `AuthManager` singleton was used before `WardenProvider.boot()` ran. |
| <span id="e-warden-auth-not-registered"></span>`E_WARDEN_AUTH_NOT_REGISTERED` | — | `AuthManager` is not in the container; add `WardenProvider` to the providers. |
| <span id="e-warden-invalid-config"></span>`E_WARDEN_INVALID_CONFIG` | — | A guard, token, MFA or rate-limit setting is invalid. |
| <span id="e-warden-strategy-not-found"></span>`E_WARDEN_STRATEGY_NOT_FOUND` | — | A guard name is not configured. |
| <span id="e-warden-strategy-cannot-issue"></span>`E_WARDEN_STRATEGY_CANNOT_ISSUE` | — | `issueFor()` on a guard that does not mint tokens. |
| <span id="e-warden-strategy-cannot-login"></span>`E_WARDEN_STRATEGY_CANNOT_LOGIN` | — | `login()` / `logout()` on a stateless guard (JWT, API key). |
| <span id="e-warden-strategy-has-no-client"></span>`E_WARDEN_STRATEGY_HAS_NO_CLIENT` | — | A guard has no `authenticateAsClient()`, so it cannot forge a client request in tests. |
| <span id="e-warden-use-login"></span>`E_WARDEN_USE_LOGIN` | — | The session guard has no credential step. Verify the password yourself, then call `login(user)`. |
| <span id="e-warden-no-session"></span>`E_WARDEN_NO_SESSION` | — | A session guard's `login()` / `logout()` ran without `ctx.session`; register the session middleware first. |
| <span id="e-warden-remember-me-unavailable"></span>`E_WARDEN_REMEMBER_ME_UNAVAILABLE` | — | Remember-me was asked and no remember-me tokens are configured. |
| <span id="e-warden-token-ttl-invalid"></span>`E_WARDEN_TOKEN_TTL_INVALID` | — | A refresh token TTL is not a positive finite number. |
| <span id="e-warden-otp-store-full"></span>`E_WARDEN_OTP_STORE_FULL` | — | The in-memory OTP store holds its maximum of pending challenges. |
| <span id="e-warden-otp-store-contract"></span>`E_WARDEN_OTP_STORE_CONTRACT` | — | The OTP challenge store does not implement `take()`. |
| <span id="e-warden-webauthn-store-full"></span>`E_WARDEN_WEBAUTHN_STORE_FULL` | — | The in-memory WebAuthn challenge store holds its maximum of pending ceremonies. |
| <span id="e-warden-store-ttl-invalid"></span>`E_WARDEN_STORE_TTL_INVALID` | — | A challenge store `ttlMs` is not a positive integer. |
| <span id="e-warden-store-limit-invalid"></span>`E_WARDEN_STORE_LIMIT_INVALID` | — | A challenge store `maxEntries` is not a positive integer. |
| <span id="e-warden-webauthn-credential-exists"></span>`E_WARDEN_WEBAUTHN_CREDENTIAL_EXISTS` | — | The WebAuthn credential id is already registered; registration answers `{ verified: false }`. |
| <span id="e-warden-invalid-credential"></span>`E_WARDEN_INVALID_CREDENTIAL` | — | A stored WebAuthn public key is malformed. |
| <span id="e-warden-invalid-ability"></span>`E_WARDEN_INVALID_ABILITY` | — | `Bouncer.ability()` was given options without a callback. |
| <span id="e-warden-unknown-ability"></span>`E_WARDEN_UNKNOWN_ABILITY` | — | No ability of this name is registered on the bouncer. |
| <span id="e-warden-unknown-policy"></span>`E_WARDEN_UNKNOWN_POLICY` | — | No policy of this name is registered on the bouncer. |
| <span id="e-warden-unknown-policy-action"></span>`E_WARDEN_UNKNOWN_POLICY_ACTION` | — | A policy has no method for the action. |
| <span id="e-warden-policy-resolution-failed"></span>`E_WARDEN_POLICY_RESOLUTION_FAILED` | — | The container resolved a policy to something that is not an instance of its class. |
| <span id="e-warden-template-engine-unusable"></span>`E_WARDEN_TEMPLATE_ENGINE_UNUSABLE` | — | The template engine is installed but `@can` / `@cannot` cannot be registered on it. |
