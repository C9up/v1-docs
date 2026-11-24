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
- Atom Errors
- Aurora Errors
- Bay Errors
- Blackhole Errors
- Chronos Errors
- Comet Errors
- Echo Errors
- Eclipse Errors
- Eon Errors
- Ephemeris Errors
- Flare Errors
- Goldstone Errors
- Helix Errors
- Helix Plugin Errors
- Inker Errors
- Lumen Errors
- Nebula Errors
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
- Rosetta Errors
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
own codes add the package name (`E_ATLAS_EMPTY_SELECT`, `E_WARDEN_MFA_REQUIRED`); a
few shared identifiers keep a plain form (`E_ROW_NOT_FOUND`,
`E_UNAUTHORIZED_ACCESS`, `E_VALIDATION_ERROR`). Search for the code below: each
one has its own anchor, the code in lower case with `-` for `_`
(`#e-atlas-empty-select`), and that is where an error's `docsUrl` points.

The codes of `@c9up/ream` itself come first, then each package's, in
alphabetical order. The **HTTP** column gives the status the error answers
with; `—` means it is not an HTTP answer but an error raised to the caller
(configuration, programming or runtime).

## Error Format

Errors raised by the framework core print a diagnostic box in
development:

```
┌──────────────────────────────────────────────┐
│ [E_CONTAINER_NOT_FOUND] No binding found for 'mailer'. Did you mean 'mail'?
│
│ Hint: Register it with container.singleton() or decorate with @inject().
│ Docs: https://reamjs.com/en/reference/errors#e-container-not-found
└──────────────────────────────────────────────┘
```

An error raised inside the request pipeline adds a `Pipeline: <n>/<total> (<stage>)`
line. In production mode, only the code and message are shown.

An HTTP error answers with `{ "error": { "code": "…", "message": "…" } }` and the
error's `status`.

## Container Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-container-not-found"></span>`E_CONTAINER_NOT_FOUND` | 500 | No binding found for the requested token. Includes "did you mean?" suggestions for typos. Register it with `container.singleton()` or decorate the class with `@inject()`. |
| <span id="e-circular-dependency"></span>`E_CIRCULAR_DEPENDENCY` | 500 | Circular dependency (or circular alias) detected during resolution. Use explicit factories or decouple via events. |
| <span id="e-container-missing-metadata"></span>`E_CONTAINER_MISSING_METADATA` | 500 | A class declares constructor parameters but the container finds no dependency metadata for them. Enable decorator metadata, annotate the parameters with `@inject()`, or declare `static containerInjections`. |
| <span id="e-container-reserved-token"></span>`E_CONTAINER_RESERVED_TOKEN` | 500 | The token name reads as an `Object.prototype` key (`constructor`, `__proto__`…). Pick another name. |
| <span id="e-container-missing-asks-for"></span>`E_CONTAINER_MISSING_ASKS_FOR` | 500 | `container.when(...).provide()` was called before `asksFor()`: the contextual binding does not say which dependency it replaces. |
| <span id="e-container-method-not-callable"></span>`E_CONTAINER_METHOD_NOT_CALLABLE` | 500 | `container.call()` named a member of the instance that is not a method. |
| <span id="e-container-invalid-decorator-target"></span>`E_CONTAINER_INVALID_DECORATOR_TARGET` | 500 | `@Service()` or `@inject()` was put on something that is not a class (or, for `@inject()`, one of its methods). |

## Router Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-route-not-found"></span>`E_ROUTE_NOT_FOUND` | 404 | No route matches the requested method and path. The message is `Cannot GET:/path`. |
| <span id="e-duplicate-route"></span>`E_DUPLICATE_ROUTE` | 500 | Two routes declare the same method and path. |
| <span id="e-duplicate-route-name"></span>`E_DUPLICATE_ROUTE_NAME` | 500 | Two routes carry the same name. |
| <span id="e-missing-route-name"></span>`E_MISSING_ROUTE_NAME` | 500 | A named group prefixes a route that has no name of its own. Name every route of a named group. |
| <span id="e-invalid-route-domain"></span>`E_INVALID_ROUTE_DOMAIN` | 500 | A route domain has a parameter without a name, or the same parameter twice. |
| <span id="e-unregistered-controller"></span>`E_UNREGISTERED_CONTROLLER` | 500 | A route names a controller by string that is not registered. |
| <span id="e-no-view-engine"></span>`E_NO_VIEW_ENGINE` | 500 | `router.on(path).render()` was used and no template engine is installed. |
| <span id="e-validator-not-found"></span>`E_VALIDATOR_NOT_FOUND` | 500 | A route names a validator that is not registered. |
| <span id="e-invalid-controller-reference"></span>`E_INVALID_CONTROLLER_REFERENCE` | 500 | A route handler string is not of the form `'Controller.method'`. |
| <span id="e-invalid-resource-name"></span>`E_INVALID_RESOURCE_NAME` | 500 | `router.resource()` was given an empty name. |
| <span id="e-controller-method-not-found"></span>`E_CONTROLLER_METHOD_NOT_FOUND` | 500 | The controller a route names has no such method. Answered with 500. |
| <span id="e-missing-route-params"></span>`E_MISSING_ROUTE_PARAMS` | 500 | A URL was built for a route without one of its required parameters. |
| <span id="e-cannot-lookup-route"></span>`E_CANNOT_LOOKUP_ROUTE` | 500 | `urlFor()`, `findOrFail()` or the test client's `visit()` named a route that does not exist. |
| <span id="e-empty-gate-requirement"></span>`E_EMPTY_GATE_REQUIREMENT` | 500 | `.guard()`, `.role()` or `.permission()` was called with nothing, or a route group, an RPC group, `config/rpc.ts`, `config/openapi.ts` or a GraphQL resolver was given an empty `guards`, `roles` or `permissions` list. An empty requirement would protect nothing. Raised where the route, method or resolver is declared; for a controller action whose `@Role()`, `@Permission()` or `@Guard()` names nothing, on each request to it. |

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
| <span id="e-websocket-register"></span>`E_WEBSOCKET_REGISTER` | 500 | The native server refused a fresh socket id. |
| <span id="e-websocket-context"></span>`E_WEBSOCKET_CONTEXT` | 500 | A WebSocket route's handler ran without its socket (called outside the kernel). |
| <span id="e-websocket-close-code"></span>`E_WEBSOCKET_CLOSE_CODE` | 500 | `socket.close()` with a code a close frame may not carry (RFC 6455 §7.4). |
| <span id="e-websocket-close-reason"></span>`E_WEBSOCKET_CLOSE_REASON` | 500 | A close reason over 123 bytes. |
| <span id="e-invalid-websocket-config"></span>`E_INVALID_WEBSOCKET_CONFIG` | 500 | A native WebSocket limit of 0 bytes. |
| <span id="e-test-client-websocket-refused"></span>`E_TEST_CLIENT_WEBSOCKET_REFUSED` | 500 | The test client's WebSocket handshake was refused (`WebSocketRefused` carries the `status`) or failed. |

## Pipeline Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-pipeline-unknown-middleware"></span>`E_PIPELINE_UNKNOWN_MIDDLEWARE` | 500 | A route references a named middleware that is not registered. Register it with `middleware.register()`. |
| <span id="e-middleware-not-found"></span>`E_MIDDLEWARE_NOT_FOUND` | 500 | A route, an RPC method or a GraphQL resolver names a middleware nothing declared. Declare it with `router.named()` (or `middleware.register()`). An HTTP route's names are checked when the kernel is built: the application stops at boot, and the message names the route. |
| <span id="e-middleware-entry"></span>`E_MIDDLEWARE_ENTRY` | 500 | A middleware entry with no declared parameters was read as a lazy import, and it did not resolve to a module with a default export. |
| <span id="e-pipeline-double-next"></span>`E_PIPELINE_DOUBLE_NEXT` | 500 | A middleware called `next()` more than once. Each middleware should call `next()` at most once. |
| <span id="e-pipeline-error"></span>`E_PIPELINE_ERROR` | 500 | A handler threw an error that carries no framework code. The error keeps the stage position in its context. |
| <span id="e-validator-unusable"></span>`E_VALIDATOR_UNUSABLE` | 500 | A route validator exposes none of `validateResultAsync()`, `validateResult()` or `validate()`. |

## HTTP Errors

Raised by `@c9up/ream`'s exceptions and its native HTTP server. The server's own refusals are answered before any middleware runs.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-unknown"></span>`E_UNKNOWN` | 500 | The default code of an `Exception` that sets none, and of an error rebuilt from the native layer without a code. |
| <span id="e-http-exception"></span>`E_HTTP_EXCEPTION` | 500 | A generic HTTP error carrying the response `body`. `E_HTTP_EXCEPTION.invoke(body, status, code?)` builds one: the message is a string body, or the `message` of an object body. |
| <span id="e-http-request-aborted"></span>`E_HTTP_REQUEST_ABORTED` | 400 | The class `response.abort()` (or `abortIf` / `abortUnless`) throws; the body given is sent with the status given, 400 by default. It extends `E_HTTP_EXCEPTION` and carries its code. |
| <span id="e-validation-error"></span>`E_VALIDATION_ERROR` | 422 | The request data failed validation. The message is `Validation failure`, `messages` carries one entry per field and rule; a browser form is redirected back with the errors flashed. |
| <span id="e-request-entity-too-large"></span>`E_REQUEST_ENTITY_TOO_LARGE` | 413 | The request body is over the body parser's limit. Reading the raw body of such a request raises it too. |
| <span id="e-handler-failure"></span>`E_HANDLER_FAILURE` | 500 | The exception handler itself threw while rendering an error. |
| <span id="e-http-context-not-found"></span>`E_HTTP_CONTEXT_NOT_FOUND` | 500 | `HttpContext.getOrFail()` was called outside a request, or with ambient-context tracking turned off. Pass `ctx` explicitly. |
| <span id="e-response-too-large"></span>`E_RESPONSE_TOO_LARGE` | 500 | A response body is over the configured ceiling. Bodies are held whole in memory, so a large file should be streamed or served from storage. |
| <span id="e-bodyparser-config"></span>`E_BODYPARSER_CONFIG` | 500 | The body parser config uses an option that is no longer supported. |
| <span id="e-bodyparser-invalid-size"></span>`E_BODYPARSER_INVALID_SIZE` | 500 | A body size limit is neither a number of bytes nor a size such as `'1mb'`. |
| <span id="e-bodyparser-invalid-json"></span>`E_BODYPARSER_INVALID_JSON` | 400 | A JSON body is malformed (400), or under `json.strict` is neither an object nor an array (422). |
| <span id="e-http-request-timeout"></span>`E_HTTP_REQUEST_TIMEOUT` | 408 | The native server did not receive the request body in time. |
| <span id="e-request-aborted"></span>`E_REQUEST_ABORTED` | 400 | The client closed the connection while the body was being read. |
| <span id="e-path-traversal"></span>`E_PATH_TRAVERSAL` | 400 | The native server found `..` in the path, raw or percent-encoded. |
| <span id="e-parameter-pollution"></span>`E_PARAMETER_POLLUTION` | 400 | The native server found a query-string key twice. |
| <span id="e-too-many-requests"></span>`E_TOO_MANY_REQUESTS` | 429 | The native server's rate limit refused the request; the body carries `retryAfter`, with `Retry-After` and `X-RateLimit-*` headers. |
| <span id="e-stream-unknown"></span>`E_STREAM_UNKNOWN` | 500 | A server-sent event stream id is unknown to the server. |
| <span id="e-response-invalid-header"></span>`E_RESPONSE_INVALID_HEADER` | 500 | A header name or value carries CR, LF or NUL, which would split the response. |
| <span id="e-response-invalid-cookie"></span>`E_RESPONSE_INVALID_COOKIE` | 500 | A cookie a browser would reject or misread: a name outside the cookie token grammar, a `path` or `domain` outside the attribute grammar, `sameSite: true`, `SameSite=None` or `partitioned` without `secure`, an invalid `expires` date, or an `http.cookie` block with an unknown key or a value of the wrong type. |
| <span id="e-response-no-context"></span>`E_RESPONSE_NO_CONTEXT` | 500 | `response.redirect()` on a response built outside a request. |
| <span id="e-response-sse-unsupported"></span>`E_RESPONSE_SSE_UNSUPPORTED` | 500 | `response.sse()` on a server that has no stream backend. |
| <span id="e-redirect-no-router"></span>`E_REDIRECT_NO_ROUTER` | 500 | `redirect().toRoute()` with no route URL resolver wired. |
| <span id="e-stream-register"></span>`E_STREAM_REGISTER` | 500 | The server refused a fresh server-sent event stream id. |
| <span id="e-multipart-unsafe-file-name"></span>`E_MULTIPART_UNSAFE_FILE_NAME` | 500 | `file.move()` was given, or derived from the client's file name, a name that is not a plain file name. |
| <span id="e-multipart-file-exists"></span>`E_MULTIPART_FILE_EXISTS` | 500 | `file.move()` found a file at the destination and `overwrite` is off. |
| <span id="e-test-client-no-route-manifest"></span>`E_TEST_CLIENT_NO_ROUTE_MANIFEST` | 500 | The test client's `visit()` needs `routes: router.namedManifest()` in the client options. |
| <span id="e-test-client-timeout"></span>`E_TEST_CLIENT_TIMEOUT` | 500 | A test client request, or a test WebSocket message, did not arrive within its timeout. |
| <span id="e-test-client-missing-csrf-token"></span>`E_TEST_CLIENT_MISSING_CSRF_TOKEN` | 500 | `withCsrf()` was called with no token and no CSRF cookie set. |
| <span id="e-test-client-no-auth-strategy"></span>`E_TEST_CLIENT_NO_AUTH_STRATEGY` | 500 | `withAuth()` or `asUser()` was used without an `auth` strategy in the client options. |
| <span id="e-test-client-no-session-seeder"></span>`E_TEST_CLIENT_NO_SESSION_SEEDER` | 500 | `loginAs()` with a session guard, and no `sessionSeeder` in the client options. |
| <span id="e-test-client-unknown-serializer"></span>`E_TEST_CLIENT_UNKNOWN_SERIALIZER` | 500 | `serialize()` named a serializer that is not registered. |
| <span id="e-test-client-assertion-failed"></span>`E_TEST_CLIENT_ASSERTION_FAILED` | 500 | An assertion of the test client's response failed |
| <span id="e-unauthorized-access-ream"></span>`E_UNAUTHORIZED_ACCESS` | 403 | A route's `.auth()` guard refused the request, or `.role()` / `.permission()` found no authenticated user. The same code, status, message (`Unauthorized access`) and rendering (`handle`) as `@c9up/warden`'s. |
| <span id="e-authorization-failure-ream"></span>`E_AUTHORIZATION_FAILURE` | 403 | A route's `.role()` or `.permission()` refused an authenticated user. The same code, status, message (`Access denied`) and rendering (`handle`) as `@c9up/warden`'s; the roles and permissions asked for are not sent. |
| <span id="e-encoding-unsupported"></span>`E_ENCODING_UNSUPPORTED` | 415 | A JSON, form or text body arrives with a `Content-Encoding` other than `identity`. The body parser does not inflate bodies, gzip and deflate included. |
| <span id="e-invalid-multipart-request"></span>`E_INVALID_MULTIPART_REQUEST` | 400 | A `multipart/form-data` body is malformed, or its `boundary` parameter is missing. |
| <span id="e-server-invalid-port"></span>`E_SERVER_INVALID_PORT` | 500 | The native server was given a port above 65535. |
| <span id="e-server-invalid-host"></span>`E_SERVER_INVALID_HOST` | 500 | The native server's bind address is not an IPv4 or IPv6 address, nor `localhost`. |
| <span id="e-server-invalid-trusted-proxy"></span>`E_SERVER_INVALID_TRUSTED_PROXY` | 500 | A `trustedProxies()` entry is not an address, a CIDR range, a netmask range, a named range or `*`. The server refuses to start. |
| <span id="e-server-invalid-body-limit"></span>`E_SERVER_INVALID_BODY_LIMIT` | 500 | A body limit handed to the native server is not a byte count or a part count of zero or more. |
| <span id="e-server-bind-failed"></span>`E_SERVER_BIND_FAILED` | 500 | The native server could not bind its address: the port is taken, or the address is not on this machine. |
| <span id="e-server-no-handler"></span>`E_SERVER_NO_HANDLER` | 500 | The native server was started before a request handler was registered. |
| <span id="e-server-not-started"></span>`E_SERVER_NOT_STARTED` | 500 | The native server's port was read before the server started. |
| <span id="e-server-lock-poisoned"></span>`E_SERVER_LOCK_POISONED` | 500 | A lock of the native server was left poisoned by a panic. This is a bug in Ream. |
| <span id="e-crypto-failed"></span>`E_CRYPTO_FAILED` | 500 | A native crypto call (`hmacSign()`, `randomHex()`…) failed in the engine. |
| <span id="e-warden-mfa-required-ream"></span>`E_WARDEN_MFA_REQUIRED` | 403 | The route gate reached a controller action carrying `@RequireMfa()` with a credential that did not complete the MFA step-up (`ctx.auth.user.mfa` is not `true`). The same code, status, message and body as `@c9up/warden`'s middleware: `403 { error: { code, message } }`. |

## Session Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-session-not-ready"></span>`E_SESSION_NOT_READY` | 500 | `session.<method>()` needs a session store, and this session was built without one. |
| <span id="e-session-store-not-configured"></span>`E_SESSION_STORE_NOT_CONFIGURED` | 500 | The session config names no store. Set `store`, or `store: 'memory'` for sessions kept in this process only. |
| <span id="e-session-store-not-conditional"></span>`E_SESSION_STORE_NOT_CONDITIONAL` | 500 | The store has no `update()`, so it cannot write a session back only while it still exists; a request running across a logout could sign the user in again. |
| <span id="e-session-tagging-not-supported"></span>`E_SESSION_TAGGING_NOT_SUPPORTED` | 500 | A session tagging method was called on a store that does not support it. Use the memory, redis or database store. |
| <span id="e-session-cookie-not-http-only"></span>`E_SESSION_COOKIE_NOT_HTTP_ONLY` | 500 | The session cookie is configured with `httpOnly: false`. Remove it: a script able to read the cookie turns any XSS into an account takeover. |
| <span id="e-session-template-engine-unusable"></span>`E_SESSION_TEMPLATE_ENGINE_UNUSABLE` | 500 | The template engine is installed but the session tags cannot be registered on it. |
| <span id="e-session-missing-secret"></span>`E_SESSION_MISSING_SECRET` | 500 | The cookie session store has no secret. |
| <span id="e-session-missing-location"></span>`E_SESSION_MISSING_LOCATION` | 500 | The file session store has no `location`. |
| <span id="e-session-invalid-connection"></span>`E_SESSION_INVALID_CONNECTION` | 500 | The database session store's `connection` lacks `query()` and `execute()`. |
| <span id="e-session-unknown-driver"></span>`E_SESSION_UNKNOWN_DRIVER` | 500 | The session config names a driver that does not exist. |
| <span id="e-session-invalid-gc-probability"></span>`E_SESSION_INVALID_GC_PROBABILITY` | 500 | `gcProbability` is not a percentage between 0 and 100. |
| <span id="e-session-invalid-table-name"></span>`E_SESSION_INVALID_TABLE_NAME` | 500 | The session table name is not a plain identifier. |
| <span id="e-session-file-locked"></span>`E_SESSION_FILE_LOCKED` | 500 | Another request kept the session file locked longer than the store waits. |
| <span id="e-session-quasar-missing"></span>`E_SESSION_QUASAR_MISSING` | 500 | A Redis session store names a quasar connection and `@c9up/quasar` is not installed. |
| <span id="e-session-incomplete-connection"></span>`E_SESSION_INCOMPLETE_CONNECTION` | 500 | The quasar connection lacks the commands a session store sends. |

## Application Errors

Raised while the application is assembled, configured and started.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-invalid-env-variables"></span>`E_INVALID_ENV_VARIABLES` | 500 | `Env.create()` found environment variables that fail their schema. The message is `Validation failed for one or more environment variables`; `help` lists each one on a `- ` line, and `failures` holds them. |
| <span id="e-reamrc-unknown-option"></span>`E_REAMRC_UNKNOWN_OPTION` | 500 | `reamrc.ts` `tests` holds an option that does not exist. |
| <span id="e-ignitor-already-started"></span>`E_IGNITOR_ALREADY_STARTED` | 500 | `warmUp()` was called while the application was already past that phase. |
| <span id="e-ignitor-warmup-only"></span>`E_IGNITOR_WARMUP_ONLY` | 500 | An application assembled with `warmUp()` was started. Build a fresh Ignitor to run one. |
| <span id="e-ignitor-invalid-port"></span>`E_IGNITOR_INVALID_PORT` | 500 | `PORT` is not an integer between 0 and 65535. |
| <span id="e-ignitor-invalid-http-config"></span>`E_IGNITOR_INVALID_HTTP_CONFIG` | 500 | An `http.<key>` limit is not a whole number in range. |
| <span id="e-ignitor-no-server-factory"></span>`E_IGNITOR_NO_SERVER_FACTORY` | 500 | `httpServer()` was called with no `serverFactory` in the config. |
| <span id="e-ignitor-grpc-unsupported"></span>`E_IGNITOR_GRPC_UNSUPPORTED` | 500 | A gRPC handler is registered, but this server cannot serve gRPC. |
| <span id="e-server-grpc-already-set"></span>`E_SERVER_GRPC_ALREADY_SET` | 500 | A second gRPC handler was registered on the server. |
| <span id="e-server-grpc-invalid-limit"></span>`E_SERVER_GRPC_INVALID_LIMIT` | 500 | A gRPC message size limit is not a whole number of bytes, or `-1` for no limit. |
| <span id="e-ream-stub-syntax"></span>`E_REAM_STUB_SYNTAX` | 500 | A stub template has a syntax error. |
| <span id="e-env-file-not-found"></span>`E_ENV_FILE_NOT_FOUND` | 500 | A `.env` value `file:<path>` names a file that does not exist. The message names the variable and the path. |
| <span id="e-env-circular-reference"></span>`E_ENV_CIRCULAR_REFERENCE` | 500 | `.env` values reference each other in a loop (`A=$B`, `B=$A`). |
| <span id="e-identifier-already-defined"></span>`E_IDENTIFIER_ALREADY_DEFINED` | 500 | `Env.defineIdentifier()` was given a name already registered (`file` is built in). Use `defineIdentifierIfMissing()` or remove the identifier first. |
| <span id="e-app-missing-importer"></span>`E_APP_MISSING_IMPORTER` | 500 | `app.import()` / `app.importDefault(id)` was called on an application built without an `importer`. |
| <span id="e-dump-die-exception"></span>`E_DUMP_DIE_EXCEPTION` | 500 | `dd()` stopped the request (answered with an HTML dump) or the command (printed the dump). Never reported. |
| <span id="e-app-already-booted"></span>`E_APP_ALREADY_BOOTED` | 500 | `app.setMode()` or `app.setEnvironment()` was called after the application booted. |
| <span id="e-app-root-not-set"></span>`E_APP_ROOT_NOT_SET` | 500 | `app.makePath()` (or another path helper) on an application with no root. |
| <span id="e-app-missing-default-export"></span>`E_APP_MISSING_DEFAULT_EXPORT` | 500 | A lazily imported module (`app.importDefault()`, a lazy listener, a route's lazy controller) has no default export. |
| <span id="e-app-shutdown-failed"></span>`E_APP_SHUTDOWN_FAILED` | 500 | Several terminating or shutdown hooks failed; the error holds each failure in `errors`. |
| <span id="e-service-not-booted"></span>`E_SERVICE_NOT_BOOTED` | 500 | A `@c9up/ream/services/*` accessor, `urlFor()` or `signedUrlFor()` was used before the application booted it. |
| <span id="e-env-path-no-file"></span>`E_ENV_PATH_NO_FILE` | 500 | `ENV_PATH` names a directory that holds none of the `.env` files. |
| <span id="e-migration-source-conflict"></span>`E_MIGRATION_SOURCE_CONFLICT` | 500 | Two providers registered a migration source under the same name. |
| <span id="e-invalid-duration"></span>`E_INVALID_DURATION` | 500 | A duration (a session age, a cookie `maxAge`, a signed URL expiry…) is neither a number nor a string such as `'30m'`. |
| <span id="e-base64-malformed"></span>`E_BASE64_MALFORMED` | 500 | `base64.decode()` or `base64.urlDecode()` in strict mode met a malformed value. |
| <span id="e-health-invalid-threshold"></span>`E_HEALTH_INVALID_THRESHOLD` | 500 | A memory health check threshold is not a byte size, or not a percentage between 0 and 100. |
| <span id="e-ream-stub-not-found"></span>`E_REAM_STUB_NOT_FOUND` | 500 | No stub at the given path. |
| <span id="e-ream-stub-unsafe-path"></span>`E_REAM_STUB_UNSAFE_PATH` | 500 | A stub path, or the destination a stub declares, is absolute or leaves its root, or a generator's destination is a symbolic link leading outside the project or to nothing. |
| <span id="e-ream-stub-no-destination"></span>`E_REAM_STUB_NO_DESTINATION` | 500 | A stub declares no destination (no `to:` front-matter line), or an empty one. |
| <span id="e-ream-stub-forbidden-key"></span>`E_REAM_STUB_FORBIDDEN_KEY` | 500 | A stub template reads or sets a key it may not reach (`constructor`, `__proto__`…). |
| <span id="e-ream-stub-evaluation"></span>`E_REAM_STUB_EVALUATION` | 500 | A stub template failed while rendering: an unknown name, a property of nothing, a call to what is not a function, `{{#each}}` over what is not a list. |
| <span id="e-codemods-file-not-found"></span>`E_CODEMODS_FILE_NOT_FOUND` | 500 | A codemod needs `reamrc.ts`, `start/kernel.ts` or `start/env.ts` and the file does not exist. |
| <span id="e-codemods-unrecognized-source"></span>`E_CODEMODS_UNRECOGNIZED_SOURCE` | 500 | A codemod could not find what it edits in the file (`providers: [`, `defineConfig({ ... })`, `router.use([`, `Env.create(...)`…). Make the change by hand. |
| <span id="e-codemods-unsafe-path"></span>`E_CODEMODS_UNSAFE_PATH` | 500 | A codemod was asked to write outside the project: an absolute path, `..`, a symlink that resolves outside, or an unsafe module path. |
| <span id="e-codemods-invalid-option"></span>`E_CODEMODS_INVALID_OPTION` | 500 | A codemod option is out of range: a middleware `position` or `tier`, a preload environment. |
| <span id="e-codemods-invalid-env-variable"></span>`E_CODEMODS_INVALID_ENV_VARIABLE` | 500 | An environment variable name is not an identifier, or its value holds a line break. |
| <span id="e-codemods-invalid-env-validation"></span>`E_CODEMODS_INVALID_ENV_VALIDATION` | 500 | `defineEnvValidations()` was given a comment over one line, or a rule that is not one complete expression. |
| <span id="e-codemods-middleware-conflict"></span>`E_CODEMODS_MIDDLEWARE_CONFLICT` | 500 | A middleware is already registered in the other tier of `start/kernel.ts`. |
| <span id="e-ream-internal"></span>`E_REAM_INTERNAL` | 500 | An invariant inside `@c9up/ream` broke; a bug to report. |
| <span id="e-ream-napi-unsupported-platform"></span>`E_REAM_NAPI_UNSUPPORTED_PLATFORM` | 500 | No prebuilt native binary (scheduler, event bus, GraphQL) exists for this platform and architecture. |
| <span id="e-ream-napi-load-failed"></span>`E_REAM_NAPI_LOAD_FAILED` | 500 | A native binary of ream exists but cannot be loaded (wrong platform, Node ABI or a corrupt file); `cause` is the loader's error. |
| <span id="e-ream-napi-not-found"></span>`E_REAM_NAPI_NOT_FOUND` | 500 | A native binary of ream is not found. On Alpine/musl: the prebuilt Linux binaries target glibc. |
| <span id="e-missing-encrypter-key"></span>`E_MISSING_ENCRYPTER_KEY` | 500 | Encryption, a signed cookie or a signed URL was used and `APP_KEY` is not set. `help` names what needed it. |
| <span id="e-insecure-encrypter-key"></span>`E_INSECURE_ENCRYPTER_KEY` | 500 | `APP_KEY` is shorter than 16 characters, or is a key known from scaffolding or documentation. |
| <span id="e-missing-provider-file"></span>`E_MISSING_PROVIDER_FILE` | 500 | A `reamrc.ts` `providers` entry has no `file`. |
| <span id="e-invalid-provider"></span>`E_INVALID_PROVIDER` | 500 | A `reamrc.ts` `providers` entry has a `file` that is not a function. A provider module with no default export, or whose default export is not a class, raises `E_RUNTIME_EXCEPTION`. |
| <span id="e-missing-preload-file"></span>`E_MISSING_PRELOAD_FILE` | 500 | A `reamrc.ts` `preloads` entry has no `file`. |
| <span id="e-invalid-preload-file"></span>`E_INVALID_PRELOAD_FILE` | 500 | A `reamrc.ts` `preloads` entry has a `file` that is not a function. |
| <span id="e-native-callback-failed"></span>`E_NATIVE_CALLBACK_FAILED` | 500 | A JavaScript callback the native binding could not hold: napi refused to wrap it. napi's own status is in the message. |
| <span id="e-native-panic"></span>`E_NATIVE_PANIC` | 500 | A Rust panic in a native binding, caught before it could stop the process. This is a bug in Ream. The scheduler reports it as `E_SCHEDULER_NATIVE_ERROR`. |

## Console Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-console-command-not-found"></span>`E_CONSOLE_COMMAND_NOT_FOUND` | 500 | No command has this name. |
| <span id="e-console-missing-argument"></span>`E_CONSOLE_MISSING_ARGUMENT` | 500 | A required argument was not given. |
| <span id="e-console-missing-argument-value"></span>`E_CONSOLE_MISSING_ARGUMENT_VALUE` | 500 | An argument was given with no value. |
| <span id="e-console-unexpected-argument"></span>`E_CONSOLE_UNEXPECTED_ARGUMENT` | 500 | More arguments than the command declares. |
| <span id="e-console-unknown-flag"></span>`E_CONSOLE_UNKNOWN_FLAG` | 500 | A flag the command does not declare. |
| <span id="e-console-missing-flag"></span>`E_CONSOLE_MISSING_FLAG` | 500 | A required flag was not given. |
| <span id="e-console-missing-flag-value"></span>`E_CONSOLE_MISSING_FLAG_VALUE` | 500 | A flag that takes a value was given without one. |
| <span id="e-console-invalid-flag-value"></span>`E_CONSOLE_INVALID_FLAG_VALUE` | 500 | A flag value of the wrong type. |
| <span id="e-console-invalid-flag-group"></span>`E_CONSOLE_INVALID_FLAG_GROUP` | 500 | Short flags were grouped (`-abc`) with one that cannot be grouped. |
| <span id="e-console-not-interactive"></span>`E_CONSOLE_NOT_INTERACTIVE` | 500 | A command asked a question while stdin is not interactive. Pass the value as a flag. |
| <span id="e-console-prompt-cancelled"></span>`E_CONSOLE_PROMPT_CANCELLED` | 500 | The user cancelled a prompt. |
| <span id="e-console-empty-choices"></span>`E_CONSOLE_EMPTY_CHOICES` | 500 | A choice prompt was asked with no options. |
| <span id="e-console-invalid-trap-value"></span>`E_CONSOLE_INVALID_TRAP_VALUE` | 500 | A scripted answer (a prompt trap in a test) was rejected by the prompt's own validation. |
| <span id="e-console-trap-out-of-range"></span>`E_CONSOLE_TRAP_OUT_OF_RANGE` | 500 | A prompt trap chose an option that was not offered. |
| <span id="e-console-duplicate-command"></span>`E_CONSOLE_DUPLICATE_COMMAND` | 500 | Two commands claim the same name. |
| <span id="e-console-invalid-command"></span>`E_CONSOLE_INVALID_COMMAND` | 500 | An entry of `reamrc.ts` `commands` is neither a command loader nor a default-exported command class. |
| <span id="e-console-invalid-command-metadata"></span>`E_CONSOLE_INVALID_COMMAND_METADATA` | 500 | A command loader exported metadata that does not describe a command. |
| <span id="e-console-invalid-argument"></span>`E_CONSOLE_INVALID_ARGUMENT` | 500 | A command declares its arguments in an order that cannot be parsed: an argument after a spread one, or a required one after an optional one. |
| <span id="e-console-invalid-alias"></span>`E_CONSOLE_INVALID_ALIAS` | 500 | A command alias expands to nothing. |
| <span id="e-console-late-global-flag"></span>`E_CONSOLE_LATE_GLOBAL_FLAG` | 500 | A global flag was declared after the kernel started. |
| <span id="e-console-late-loader"></span>`E_CONSOLE_LATE_LOADER` | 500 | A command loader was added after the kernel started. |
| <span id="e-console-kernel-running"></span>`E_CONSOLE_KERNEL_RUNNING` | 500 | A command is already running through this kernel. |
| <span id="e-console-kernel-completed"></span>`E_CONSOLE_KERNEL_COMPLETED` | 500 | The kernel has finished; it cannot run another command line. |
| <span id="e-console-not-booted"></span>`E_CONSOLE_NOT_BOOTED` | 500 | A console application method was called before the commands were loaded. |
| <span id="e-console-no-app"></span>`E_CONSOLE_NO_APP` | 500 | A command needs the application and the kernel has none. Dispatch through the Ignitor's console kernel. |
| <span id="e-console-app-not-started"></span>`E_CONSOLE_APP_NOT_STARTED` | 500 | A command used the application without declaring `startApp: true` in its options. |
| <span id="e-console-assertion-failed"></span>`E_CONSOLE_ASSERTION_FAILED` | 500 | An assertion on a command run in a test failed (`assertSucceeded()`, `assertLog()`, `assertTableRows()`…). |

## Scheduler Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-schedule-invalid-cron"></span>`E_SCHEDULE_INVALID_CRON` | 500 | A scheduled task's cron expression could not be registered. |
| <span id="e-schedule-invalid-target"></span>`E_SCHEDULE_INVALID_TARGET` | 500 | `@Schedule` was put on a static method. |
| <span id="e-schedule-symbol-method"></span>`E_SCHEDULE_SYMBOL_METHOD` | 500 | `@Schedule` was put on a symbol-keyed method. |
| <span id="e-schedule-anonymous-class"></span>`E_SCHEDULE_ANONYMOUS_CLASS` | 500 | An anonymous class declares `@Schedule`; its task names would collide. |
| <span id="e-schedule-method-not-found"></span>`E_SCHEDULE_METHOD_NOT_FOUND` | 500 | A scheduled method is not callable on the instance the container resolved. |
| <span id="e-schedule-invalid-callback"></span>`E_SCHEDULE_INVALID_CALLBACK` | 500 | `Scheduler.register()` was given something other than a function. |
| <span id="e-schedule-invalid-task-name"></span>`E_SCHEDULE_INVALID_TASK_NAME` | 500 | `Scheduler.register()` was given an empty task name. |
| <span id="e-schedule-invalid-lock-backend"></span>`E_SCHEDULE_INVALID_LOCK_BACKEND` | 500 | `lockBackend` does not implement `acquire(name, ttlMs)` and `release(name)`. |
| <span id="e-schedule-invalid-lock-ttl"></span>`E_SCHEDULE_INVALID_LOCK_TTL` | 500 | `defaultLockTtlMs` is not a finite positive number. |
| <span id="e-schedule-invalid-event-sink"></span>`E_SCHEDULE_INVALID_EVENT_SINK` | 500 | `eventSink` does not implement `emit(event)`. |
| <span id="e-schedule-invalid-error-reporter"></span>`E_SCHEDULE_INVALID_ERROR_REPORTER` | 500 | `errorReporter` is not a function. |
| <span id="e-schedule-task-unknown"></span>`E_SCHEDULE_TASK_UNKNOWN` | 500 | `runTaskNow()` named a task that is not registered. |
| <span id="e-schedule-task-timeout"></span>`E_SCHEDULE_TASK_TIMEOUT` | 500 | A task did not complete within its `timeoutMs`; it keeps running in the background. |
| <span id="e-schedule-provider-already-registered"></span>`E_SCHEDULE_PROVIDER_ALREADY_REGISTERED` | 500 | The scheduler provider was registered twice on the same container. |
| <span id="e-scheduler-native-error"></span>`E_SCHEDULER_NATIVE_ERROR` | 500 | A call into the native scheduler failed. |
| <span id="e-schedule-quasar-missing"></span>`E_SCHEDULE_QUASAR_MISSING` | 500 | The scheduler lock names a quasar connection and `@c9up/quasar` is not installed. |
| <span id="e-schedule-incomplete-connection"></span>`E_SCHEDULE_INCOMPLETE_CONNECTION` | 500 | The quasar connection lacks the commands a scheduler lock sends. |
| <span id="e-scheduler-invalid-cron"></span>`E_SCHEDULER_INVALID_CRON` | 500 | The native scheduler refused a cron expression (Rust `INVALID_CRON`). `help` says what a cron expression looks like. |
| <span id="e-scheduler-cron-no-fire"></span>`E_SCHEDULER_CRON_NO_FIRE` | 500 | The native scheduler refused a cron expression that never fires (Rust `CRON_NO_FIRE`). |
| <span id="e-scheduler-duplicate-task"></span>`E_SCHEDULER_DUPLICATE_TASK` | 500 | The native scheduler already has a task of that name (Rust `DUPLICATE_TASK`). |

## Event Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-events-unsupported-store"></span>`E_EVENTS_UNSUPPORTED_STORE` | 500 | `config/events.ts` names a `store` other than `'memory'`, the only one this build has. |
| <span id="e-events-unsupported-option"></span>`E_EVENTS_UNSUPPORTED_OPTION` | 500 | `config/events.ts` holds an option nothing reads (`retries` included), or is not an object. |
| <span id="e-events-missing-listener-method"></span>`E_EVENTS_MISSING_LISTENER_METHOD` | 500 | A listener class has no method of the name the listener was registered with. |
| <span id="e-events-invalid-argument"></span>`E_EVENTS_INVALID_ARGUMENT` | 500 | `onAny()` without a listener, or `waitForChain()` with no event names. |
| <span id="e-events-assertion-failed"></span>`E_EVENTS_ASSERTION_FAILED` | 500 | An event assertion failed (`assertEmitted()`, `assertNotEmitted()`, on the helpers or the `FakeBus`). |
| <span id="e-events-timeout"></span>`E_EVENTS_TIMEOUT` | 500 | An awaited event, event chain or fake request reply did not arrive within its timeout. |
| <span id="e-events-duplicate-request-handler"></span>`E_EVENTS_DUPLICATE_REQUEST_HANDLER` | 500 | `FakeBus.onRequest()` was given a second handler for the same name. |
| <span id="e-events-no-request-handler"></span>`E_EVENTS_NO_REQUEST_HANDLER` | 500 | `emitter.request()` or `FakeBus.request()` named a request no handler answers. |
| <span id="e-events-handler-failed"></span>`E_EVENTS_HANDLER_FAILED` | 500 | A request handler panicked, or refused the request with an error of its own. |
| <span id="e-events-bus-failed"></span>`E_EVENTS_BUS_FAILED` | 500 | The native event bus failed: its task panicked or was cancelled, or an event could not be serialized. |

## RPC and GraphQL Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-rpc-invalid-method-name"></span>`E_RPC_INVALID_METHOD_NAME` | 500 | An RPC method name is empty or not a string. |
| <span id="e-rpc-reserved-method-name"></span>`E_RPC_RESERVED_METHOD_NAME` | 500 | An RPC method takes a reserved name (`rpc.*`). |
| <span id="e-rpc-unknown-controller-method"></span>`E_RPC_UNKNOWN_CONTROLLER_METHOD` | 500 | An RPC route names a controller method that does not exist. |
| <span id="e-rpc-provider-already-registered"></span>`E_RPC_PROVIDER_ALREADY_REGISTERED` | 500 | The RPC provider was registered twice on the same container. |
| <span id="e-graphql-provider-already-registered"></span>`E_GRAPHQL_PROVIDER_ALREADY_REGISTERED` | 500 | The GraphQL provider was registered twice on the same container. |
| <span id="e-graphql-schema-not-found"></span>`E_GRAPHQL_SCHEMA_NOT_FOUND` | 500 | The GraphQL `schemaPath` names a file that does not exist. |
| <span id="e-graphql-invalid-schema"></span>`E_GRAPHQL_INVALID_SCHEMA` | 500 | The GraphQL schema does not parse, declares a type twice, or names a type it does not declare. Every query is then refused with `GraphQL schema could not be read`, and the reason is logged. |
| <span id="e-graphql-serialize-failed"></span>`E_GRAPHQL_SERIALIZE_FAILED` | 500 | The native GraphQL parser could not serialize its result. |
| <span id="e-graphql-invalid-result"></span>`E_GRAPHQL_INVALID_RESULT` | 500 | A GraphQL resolver returned a value its field's declared type cannot hold: an object under a `String`, something that is not a list under `[Task]`, a value of an interface or union whose object type is not known. The field fails; the client reads `Internal server error` outside debug. |

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
| <span id="e-archive-access-denied"></span>`E_ARCHIVE_ACCESS_DENIED` | 403 | An unsigned request asked for anything but a stored public file: a private file, a name that is not stored, any file of a private disk. |
| <span id="e-archive-invalid-key"></span>`E_ARCHIVE_INVALID_KEY` | 500 | The signed route refused the path: a key with traversal or characters keys may not hold. |
| <span id="e-archive-not-found"></span>`E_ARCHIVE_NOT_FOUND` | 404 | No file is stored under the key. The signed route answers 404; a driver call throws it. |
| <span id="e-archive-path-traversal-detected"></span>`E_ARCHIVE_PATH_TRAVERSAL_DETECTED` | 500 | A key resolves outside the disk root. |
| <span id="e-archive-invalid-expiry"></span>`E_ARCHIVE_INVALID_EXPIRY` | 500 | A signed URL expiry is not a positive duration (a number of seconds or a string such as `'30mins'`). |
| <span id="e-archive-signing-disabled"></span>`E_ARCHIVE_SIGNING_DISABLED` | 500 | `getSignedUrl()` was called on a local disk built without a `signingSecret`. |
| <span id="e-archive-weak-signing-secret"></span>`E_ARCHIVE_WEAK_SIGNING_SECRET` | 500 | The local disk's `signingSecret` is shorter than 16 characters. |
| <span id="e-archive-signed-upload-unsupported"></span>`E_ARCHIVE_SIGNED_UPLOAD_UNSUPPORTED` | 500 | The local disk has no presigned upload URL; only cloud disks do. |
| <span id="e-archive-invalid-header-value"></span>`E_ARCHIVE_INVALID_HEADER_VALUE` | 500 | A value to sign as a response header holds a control character. |
| <span id="e-archive-invalid-route-base-path"></span>`E_ARCHIVE_INVALID_ROUTE_BASE_PATH` | 500 | The local disk's `routeBasePath` is not an absolute URL path such as `/storage`. |
| <span id="e-archive-prefix-mismatch"></span>`E_ARCHIVE_PREFIX_MISMATCH` | 500 | `createSignedRouteHandler()` was given a prefix that differs from the disk's `routeBasePath`, so no signed URL could reach it. |
| <span id="e-archive-visibility-corrupt"></span>`E_ARCHIVE_VISIBILITY_CORRUPT` | 500 | A file's visibility record cannot be read; archive refuses to treat the file as public. |
| <span id="e-archive-visibility-move-failed"></span>`E_ARCHIVE_VISIBILITY_MOVE_FAILED` | 500 | `move()` moved the file but could not write its visibility at the target. |
| <span id="e-archive-invalid-move-options"></span>`E_ARCHIVE_INVALID_MOVE_OPTIONS` | 500 | `moveToDisk()` was given options it cannot use. |
| <span id="e-archive-multipart-not-macroable"></span>`E_ARCHIVE_MULTIPART_NOT_MACROABLE` | 500 | The installed `@c9up/ream` has no macroable `MultipartFile`, so uploads cannot be given `moveToDisk()`. |
| <span id="e-archive-request-timeout"></span>`E_ARCHIVE_REQUEST_TIMEOUT` | 500 | The storage provider did not answer, or stalled while its body was read, within the idle timeout. |
| <span id="e-archive-unexpected-response"></span>`E_ARCHIVE_UNEXPECTED_RESPONSE` | 500 | The storage provider answered with something archive cannot use. |
| <span id="e-archive-unknown-disk"></span>`E_ARCHIVE_UNKNOWN_DISK` | 500 | A disk name, or the default disk, is not in the config. |
| <span id="e-archive-invalid-driver"></span>`E_ARCHIVE_INVALID_DRIVER` | 500 | `config.driver` is not `'local'`, `'s3'` or `'gcs'`. |
| <span id="e-archive-config-missing"></span>`E_ARCHIVE_CONFIG_MISSING` | 500 | The driver is `s3` or `gcs` and its config section is missing. |
| <span id="e-archive-provider-not-registered"></span>`E_ARCHIVE_PROVIDER_NOT_REGISTERED` | 500 | `ArchiveProvider.boot()` ran before `register()`. |
| <span id="e-archive-template-engine"></span>`E_ARCHIVE_TEMPLATE_ENGINE` | 500 | The app renders with inker, but the template helpers cannot be published on it. |
| <span id="e-archive-remote-failed"></span>`E_ARCHIVE_REMOTE_FAILED` | 500 | S3 or GCS refused a request or reported a failure. The provider's HTTP status is in `providerStatus`. |
| <span id="e-archive-invalid-driver-config"></span>`E_ARCHIVE_INVALID_DRIVER_CONFIG` | 500 | `S3Driver` got neither `region` nor `endpoint`, `GcsDriver` lacks `bucket` or the service account's `client_email` / `private_key`, or a local disk's `visibility` is neither `'public'` nor `'private'`. |
| <span id="e-archive-content-length-exceeded"></span>`E_ARCHIVE_CONTENT_LENGTH_EXCEEDED` | 500 | `putStream()` read more bytes than its declared `contentLength`. |
| <span id="e-archive-invalid-static-prefix"></span>`E_ARCHIVE_INVALID_STATIC_PREFIX` | 500 | `StaticMiddleware` was given an empty `prefix`. |
| <span id="e-archive-not-booted"></span>`E_ARCHIVE_NOT_BOOTED` | 500 | The `storage` service was read before `ArchiveProvider` booted. |
| <span id="e-archive-invalid-predicate"></span>`E_ARCHIVE_INVALID_PREDICATE` | 500 | A storage fake assertion got an empty `contentContaining`, which would match every file. |
| <span id="e-archive-internal"></span>`E_ARCHIVE_INTERNAL` | 500 | An internal invariant of archive broke: a bug in the package. |
| <span id="e-unallowed-characters"></span>`E_UNALLOWED_CHARACTERS` | 500 | A key holds a control character, a backslash or an encoded separator. |
| <span id="e-path-traversal-detected"></span>`E_PATH_TRAVERSAL_DETECTED` | 500 | A key has a dot-only segment such as `..`, plain or percent-encoded. |
| <span id="e-invalid-key"></span>`E_INVALID_KEY` | 500 | A key is empty, or only separators, once normalised. |
| <span id="e-cannot-write-file"></span>`E_CANNOT_WRITE_FILE` | 500 | A disk's `put`, `putStream`, `copyFromFs` or `moveFromFs` could not write the file; the driver's error is the `cause`. |
| <span id="e-cannot-read-file"></span>`E_CANNOT_READ_FILE` | 500 | A disk's `get`, `getBytes`, `getArrayBuffer` or `getStream` could not read the file, an absent one included (`cause`: `E_ARCHIVE_NOT_FOUND`); `get` answers `null` for an absent file instead. |
| <span id="e-cannot-delete-file"></span>`E_CANNOT_DELETE_FILE` | 500 | A disk's `delete` failed; the driver's error is the `cause`. |
| <span id="e-cannot-delete-directory"></span>`E_CANNOT_DELETE_DIRECTORY` | 500 | A disk's `deleteAll` failed; the driver's error is the `cause`. |
| <span id="e-cannot-copy-file"></span>`E_CANNOT_COPY_FILE` | 500 | A disk's `copy` failed, a missing source included; the driver's error is the `cause`. |
| <span id="e-cannot-move-file"></span>`E_CANNOT_MOVE_FILE` | 500 | A disk's `move` failed, a missing source included; the driver's error is the `cause`. |
| <span id="e-cannot-check-file-existence"></span>`E_CANNOT_CHECK_FILE_EXISTENCE` | 500 | A disk's `exists` could not tell; an absent file answers `false` instead. |
| <span id="e-cannot-get-metadata"></span>`E_CANNOT_GET_METADATA` | 500 | A disk's `getMetadata` / `getMetaData` or `getVisibility` failed, an absent file included (`cause`: `E_ARCHIVE_NOT_FOUND`). |
| <span id="e-cannot-set-visibility"></span>`E_CANNOT_SET_VISIBILITY` | 500 | A disk's `setVisibility` failed; the driver's error is the `cause`. |
| <span id="e-cannot-generate-url"></span>`E_CANNOT_GENERATE_URL` | 500 | A disk's `url` / `getUrl`, `publicUrl`, `getSignedUrl` or `getSignedUploadUrl` could not build the URL (`cause`: `E_ARCHIVE_SIGNING_DISABLED`, `E_ARCHIVE_SIGNED_UPLOAD_UNSUPPORTED`, `E_ARCHIVE_INVALID_EXPIRY`, …). |
| <span id="e-cannot-serve-file"></span>`E_CANNOT_SERVE_FILE` | 500 | The archive signed-URL route could not serve a file for a reason other than its absence (which answers 404); the failure is the `cause`. |

## Atlas Errors

Each code is a class of atlas's `errors` namespace, named like the code. See
[Atlas error handling](/en/guides/database/orm/error-handling) for the classes
that carry data. The Rust query compiler's and driver's own refusals
(`E_UNSAFE_*`, `E_INJECTION_PATTERN`, `E_UNSUPPORTED`…) are rethrown as their
class too, with `error.code` set and the native error as `cause`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-row-not-found"></span>`E_ROW_NOT_FOUND` | 404 | A query that must return a row found none: `findOrFail`, `findByOrFail`, `refresh`, `fresh`, `firstOrFail()`, `sole()`. |
| <span id="e-mass-assignment"></span>`E_MASS_ASSIGNMENT` | 500 | `fill()` / `merge()` (and `create`, `createMany`, `updateOrCreate`) set an attribute outside `fillable`, or listed in `guarded`. |
| <span id="e-extra-properties"></span>`E_EXTRA_PROPERTIES` | 500 | A fill named a property that is not a declared column. |
| <span id="e-unknown-column"></span>`E_UNKNOWN_COLUMN` | 500 | A value was assigned to a key that is not a column. Pass `{ allowExtraProperties: true }` to keep unknown keys in `$extras`. |
| <span id="e-invalid-column"></span>`E_INVALID_COLUMN` | 500 | A query names a column the entity does not declare. |
| <span id="e-invalid-find-value"></span>`E_INVALID_FIND_VALUE` | 500 | `find()` was called without a usable primary key value. |
| <span id="e-model-not-persisted"></span>`E_MODEL_NOT_PERSISTED` | 500 | An operation that needs a stored row (`delete()`, `refresh()`, `load*()`…) ran on a local instance. |
| <span id="e-missing-primary-key"></span>`E_MISSING_PRIMARY_KEY` | 500 | The same operation ran on a persisted projection that holds no primary key. |
| <span id="e-model-deleted"></span>`E_MODEL_DELETED` | 500 | `save()` was called on a deleted instance. |
| <span id="e-missing-owner-key"></span>`E_MISSING_OWNER_KEY` | 500 | `associate()` was given a parent whose key is not set. |
| <span id="e-relation-not-loaded"></span>`E_RELATION_NOT_LOADED` | 500 | A relation was read before it was loaded. Call `.preload()` on the query or `.load()` on the instance. |
| <span id="e-optimistic-lock"></span>`E_OPTIMISTIC_LOCK` | 500 | A save lost an optimistic lock: another transaction modified the row since it was read. |
| <span id="e-strict-mode"></span>`E_STRICT_MODE` | 500 | Raw SQL refused by strict mode: a repository's `raw()`, a `db.raw()` value written by a repository, or `whereRaw()`, `havingRaw()`, `joinRaw()`. |
| <span id="e-no-interactive-transaction"></span>`E_NO_INTERACTIVE_TRANSACTION` | 500 | The connection has no interactive `transaction()` (a model transaction, or `useTransaction()` in tests). |
| <span id="e-array-param"></span>`E_ARRAY_PARAM` | — | A list was bound to a single placeholder. Expand it into one placeholder per element. |
| <span id="e-atlas-missing-connection"></span>`E_ATLAS_MISSING_CONNECTION` | 500 | No connection to use at all: no default one (atlas has not booted), a `default` the config does not declare, or a repository built without a connection. |
| <span id="e-atlas-empty-select"></span>`E_ATLAS_EMPTY_SELECT` | 500 | `select()` was called with no columns. Provide at least one column name. |
| <span id="e-atlas-invalid-page"></span>`E_ATLAS_INVALID_PAGE` | 500 | `paginate()` was called with `page < 1`. |
| <span id="e-atlas-invalid-per-page"></span>`E_ATLAS_INVALID_PER_PAGE` | 500 | `paginate()` was called with `perPage < 1`. |
| <span id="e-atlas-invalid-pagination"></span>`E_ATLAS_INVALID_PAGINATION` | 500 | A page, page size or row count that is not a finite, non-negative integer. |
| <span id="e-atlas-invalid-cte-name"></span>`E_ATLAS_INVALID_CTE_NAME` | 500 | A CTE name must be a valid identifier (letters, numbers, underscores). |
| <span id="e-atlas-invalid-operator"></span>`E_ATLAS_INVALID_OPERATOR` | 500 | A `where()` or `wherePivot()` operator outside the allowed list. |
| <span id="e-atlas-invalid-increment"></span>`E_ATLAS_INVALID_INCREMENT` | 500 | `increment()` / `decrement()` was given an amount that is not a finite number. |
| <span id="e-atlas-undefined-binding"></span>`E_ATLAS_UNDEFINED_BINDING` | 500 | A query value is `undefined`. Validate the input first; use `whereNull()` to match NULL. |
| <span id="e-atlas-dialect-mismatch"></span>`E_ATLAS_DIALECT_MISMATCH` | 500 | `useTransaction(trx)` was given a transaction of another dialect than the query was built for. Start the transaction on the query's connection, or build the query from the transaction. |
| <span id="e-atlas-raw-bindings"></span>`E_ATLAS_RAW_BINDINGS` | 500 | A raw fragment's placeholders and bindings do not match: a placeholder with no binding, a binding no placeholder uses, `?` mixed with `$N` or with named bindings, or a `??` binding that is not a string. |
| <span id="e-atlas-raw-value"></span>`E_ATLAS_RAW_VALUE` | 500 | A `db.raw()` was used where it cannot go: `defaultTo(db.raw())` with bindings, or a raw value compared with an operator that takes none (`IS NULL`, `BETWEEN`). |
| <span id="e-atlas-non-finite-number"></span>`E_ATLAS_NON_FINITE_NUMBER` | 500 | `defaultTo()` was given a number that is not a SQL number (`NaN`, `Infinity`). |
| <span id="e-atlas-factory-faker-missing"></span>`E_ATLAS_FACTORY_FAKER_MISSING` | 500 | A factory uses faker, an optional peer of atlas that is not installed. |
| <span id="e-atlas-factory-invalid"></span>`E_ATLAS_FACTORY_INVALID` | 500 | `make:factory` got a model name that would leave the factories folder (a path separator, a quote, a backtick or `..`). |
| <span id="e-atlas-seeder-invalid"></span>`E_ATLAS_SEEDER_INVALID` | 500 | `make:seeder` got a name that would leave the seeders folder (a path separator, a quote, a backtick or `..`). |
| <span id="e-atlas-napi-not-found"></span>`E_ATLAS_NAPI_NOT_FOUND` | 500 | The Rust query compiler is not loaded: the native package for your platform is missing. See [Troubleshooting](/en/guides/database/orm/troubleshooting). |
| <span id="e-atlas-insecure-sslmode"></span>`E_ATLAS_INSECURE_SSLMODE` | 500 | The connection asks for `sslmode=prefer` or `allow` (URL or `PGSSLMODE`), which fall back to plaintext without saying so. Use `disable` or `verify-full`. See [Encrypted connections](/en/guides/database/orm/connections#encrypted-connections-tls). |
| <span id="e-atlas-listen-unsupported"></span>`E_ATLAS_LISTEN_UNSUPPORTED` | 500 | LISTEN / NOTIFY was used on a connection that is not PostgreSQL. |
| <span id="e-atlas-listen-connect"></span>`E_ATLAS_LISTEN_CONNECT` | 500 | The listener could not open its own PostgreSQL connection. |
| <span id="e-atlas-listen-connection"></span>`E_ATLAS_LISTEN_CONNECTION` | 500 | The listener's connection failed; every subscription is told. |
| <span id="e-atlas-listen-channel"></span>`E_ATLAS_LISTEN_CHANNEL` | 500 | A LISTEN channel name is empty, longer than 63 bytes, or holds a NUL. |
| <span id="e-atlas-listen-closed"></span>`E_ATLAS_LISTEN_CLOSED` | 500 | The listener was closed while a request was pending. |
| <span id="e-atlas-listen-event"></span>`E_ATLAS_LISTEN_EVENT` | 500 | The native listener reported an event atlas does not define. |
| <span id="e-atlas-migration-invalid-table-name"></span>`E_ATLAS_MIGRATION_INVALID_TABLE_NAME` | 500 | `migrations.tableName` is not a plain identifier. |
| <span id="e-atlas-migration-invalid"></span>`E_ATLAS_MIGRATION_INVALID` | 500 | A migration file does not default-export a class. |
| <span id="e-atlas-migration-duplicate"></span>`E_ATLAS_MIGRATION_DUPLICATE` | 500 | Two migration files share a name. |
| <span id="e-atlas-migration-compile-empty"></span>`E_ATLAS_MIGRATION_COMPILE_EMPTY` | 500 | A migration compiled to no SQL statement. |
| <span id="e-rollback-disabled-in-production"></span>`E_ROLLBACK_DISABLED_IN_PRODUCTION` | 500 | A rollback, reset, refresh, fresh or wipe in production without `--force`. |
| <span id="e-atlas-dry-run-write"></span>`E_ATLAS_DRY_RUN_WRITE` | 500 | A migration tried to write while running under `dryRun()`. |
| <span id="e-defer-requires-transaction"></span>`E_DEFER_REQUIRES_TRANSACTION` | 500 | A migration uses `this.defer()` on an adapter without an interactive `transaction()`. |
| <span id="e-mysql-fk-requires-transaction"></span>`E_MYSQL_FK_REQUIRES_TRANSACTION` | 500 | Suspending MySQL foreign-key checks needs an interactive `transaction()` to restore them. |
| <span id="e-schema-dump-dialect-mismatch"></span>`E_SCHEMA_DUMP_DIALECT_MISMATCH` | 500 | The schema dump was made for another dialect. |
| <span id="e-schema-dump-table-mismatch"></span>`E_SCHEMA_DUMP_TABLE_MISMATCH` | 500 | The schema dump uses another migrations tracking table. |
| <span id="e-seeder-dir-not-found"></span>`E_SEEDER_DIR_NOT_FOUND` | 500 | The seeders directory does not exist. |
| <span id="e-seeder-invalid"></span>`E_SEEDER_INVALID` | 500 | A seeder file does not export a seeder class. |
| <span id="e-seeder-invalid-path"></span>`E_SEEDER_INVALID_PATH` | 500 | A seeder path resolves outside the seeders directory. |
| <span id="e-no-connection"></span>`E_NO_CONNECTION` | 500 | `schema.<method>()` needs a live connection; it is available inside a migration, not on a standalone `Schema`. |
| <span id="e-alter-empty"></span>`E_ALTER_EMPTY` | 500 | `schema.alterTable()` declared no operation. |
| <span id="e-alter-misuse"></span>`E_ALTER_MISUSE` | 500 | `.alter()` does not follow a column definition, or an alter-only method was used on a new table. |
| <span id="e-check-empty"></span>`E_CHECK_EMPTY` | 500 | A check constraint (or `checkBetween`) was given no value or interval. |
| <span id="e-check-range"></span>`E_CHECK_RANGE` | 500 | `checkBetween` was given an interval that is not `[min, max]`. |
| <span id="e-constraint-empty"></span>`E_CONSTRAINT_EMPTY` | 500 | A constraint lists no columns. |
| <span id="e-enum-empty"></span>`E_ENUM_EMPTY` | 500 | An enum column declares no values. |
| <span id="e-empty-view-select"></span>`E_EMPTY_VIEW_SELECT` | 500 | A view has no SELECT, or a materialized view was asked of a dialect that has none. |
| <span id="e-specific-type-empty"></span>`E_SPECIFIC_TYPE_EMPTY` | 500 | `specificType()` was given an empty type. |
| <span id="e-sqlite-decimal-precision"></span>`E_SQLITE_DECIMAL_PRECISION` | 500 | A decimal precision SQLite cannot store exactly. |
| <span id="e-unsupported"></span>`E_UNSUPPORTED` | 500 | A SQL feature the connection's dialect does not have (`DISTINCT ON` off Postgres, `UNION ALL` variants on SQLite, advisory locks on SQLite…). |
| <span id="e-unsafe-identifier"></span>`E_UNSAFE_IDENTIFIER` | 500 | An identifier (table, column, alias) is not a plain SQL name. Atlas checks it before compiling, and the Rust compiler checks it again. |
| <span id="e-unsafe-sql"></span>`E_UNSAFE_SQL` | 500 | The Rust compiler refused a SQL fragment, or a keyword outside its allowed list (set operation, ORDER BY direction, lock mode, referential action…). |
| <span id="e-unsafe-expression"></span>`E_UNSAFE_EXPRESSION` | 500 | The Rust compiler refused an expression. |
| <span id="e-unsafe-literal"></span>`E_UNSAFE_LITERAL` | 500 | The Rust compiler refused a literal value. |
| <span id="e-injection-pattern"></span>`E_INJECTION_PATTERN` | 500 | The Rust compiler refused an input that looks like an injection attempt. |
| <span id="e-atlas-no-url"></span>`E_ATLAS_NO_URL` | 500 | A connection config has no `url` (or `connection`), or the database config has neither a top-level `url` nor `connections`. |
| <span id="e-atlas-not-booted"></span>`E_ATLAS_NOT_BOOTED` | 500 | The `db` service (`@c9up/atlas/services/db`) was used before `AtlasProvider.boot()` ran. |
| <span id="e-atlas-connection-unavailable"></span>`E_ATLAS_CONNECTION_UNAVAILABLE` | 500 | A container connection token was resolved before boot opened it, or after shutdown closed it. |
| <span id="e-atlas-boot-failed"></span>`E_ATLAS_BOOT_FAILED` | 500 | `AtlasProvider.boot()` could not open one or more configured connections; `cause` holds the first failure. |
| <span id="e-atlas-read-only"></span>`E_ATLAS_READ_ONLY` | 500 | A write ran on a query builder scoped to a connection opened with `{ mode: 'read' }`. |
| <span id="e-atlas-invalid-pragma"></span>`E_ATLAS_INVALID_PRAGMA` | 500 | A SQLite pragma key or value is outside `[A-Za-z0-9_]`. |
| <span id="e-atlas-db-driver-not-found"></span>`E_ATLAS_DB_DRIVER_NOT_FOUND` | 500 | The Rust database driver could not be loaded, or the loaded binary is stale; `cause` holds the load failure. |
| <span id="e-atlas-no-repository"></span>`E_ATLAS_NO_REPOSITORY` | 500 | `refresh()`, `fresh()`, `load()`, `loadCount()`, `loadAggregate()` or `related()` was called on an entity no repository hydrated. |
| <span id="e-atlas-fillable-and-guarded"></span>`E_ATLAS_FILLABLE_AND_GUARDED` | 500 | A model declares both `static fillable` and `static guarded`. |
| <span id="e-atlas-invalid-entity-class"></span>`E_ATLAS_INVALID_ENTITY_CLASS` | 500 | A relation's target (or through model) does not resolve to a `BaseEntity` subclass. |
| <span id="e-atlas-invalid-hook"></span>`E_ATLAS_INVALID_HOOK` | 500 | A hook decorator is not on a static method, or `addHook()` was given something other than a function. |
| <span id="e-atlas-invalid-decorator"></span>`E_ATLAS_INVALID_DECORATOR` | 500 | A date column decorator was applied to something other than a class property. |
| <span id="e-atlas-invalid-relation"></span>`E_ATLAS_INVALID_RELATION` | 500 | Relation metadata lacks what its kind needs: a `@ManyToMany` without pivot options, a through relation without a through model. |
| <span id="e-atlas-relation-unsupported-operation"></span>`E_ATLAS_RELATION_UNSUPPORTED_OPERATION` | 500 | `related()` was asked for an operation its relation does not have: a write on `@BelongsTo` other than `associate()` / `dissociate()`, a write on a read-only through relation, a bulk write on `@HasOne`. |
| <span id="e-atlas-associate-null"></span>`E_ATLAS_ASSOCIATE_NULL` | 500 | `associate()` was given `null` or `undefined`; use `dissociate()`. |
| <span id="e-atlas-pivot-key-collision"></span>`E_ATLAS_PIVOT_KEY_COLLISION` | 500 | `attach()` / `sync()` extras name a pivot key column or a pivot timestamp column. |
| <span id="e-atlas-column-adapter"></span>`E_ATLAS_COLUMN_ADAPTER` | 500 | A `@Column` `prepare` / `consume` adapter threw (`cause` holds its error) or returned a Promise. |
| <span id="e-atlas-has-one-multiple-rows"></span>`E_ATLAS_HAS_ONE_MULTIPLE_ROWS` | 500 | A `@HasOne` preload found more than one related row for a parent. |
| <span id="e-atlas-through-key-not-unique"></span>`E_ATLAS_THROUGH_KEY_NOT_UNIQUE` | 500 | A through relation's `secondLocalKey` maps to several parents. |
| <span id="e-atlas-multiple-rows"></span>`E_ATLAS_MULTIPLE_ROWS` | 500 | `sole()` matched more than one row. |
| <span id="e-atlas-subquery-alias"></span>`E_ATLAS_SUBQUERY_ALIAS` | 500 | `select()` was given a subquery not named with `.as()`. |
| <span id="e-atlas-invalid-alias"></span>`E_ATLAS_INVALID_ALIAS` | 500 | An alias is not a bare identifier. |
| <span id="e-atlas-invalid-expression"></span>`E_ATLAS_INVALID_EXPRESSION` | 500 | A `whereExpr()` extra expression holds forbidden characters, unbalanced parentheses, a SQL keyword, or a function outside the allowed list. |
| <span id="e-atlas-invalid-json-path"></span>`E_ATLAS_INVALID_JSON_PATH` | 500 | A `whereJsonPath()` path does not start with `$`. |
| <span id="e-atlas-invalid-group-limit"></span>`E_ATLAS_INVALID_GROUP_LIMIT` | 500 | `groupLimit()` was given a value that is not a non-negative integer. |
| <span id="e-atlas-invalid-lock"></span>`E_ATLAS_INVALID_LOCK` | 500 | `skipLocked()` / `noWait()` was used without a base row lock. |
| <span id="e-atlas-invalid-comment"></span>`E_ATLAS_INVALID_COMMENT` | 500 | `comment()` text contains `*/`. |
| <span id="e-atlas-invalid-join"></span>`E_ATLAS_INVALID_JOIN` | 500 | A string-form `join()` is missing its right operand. |
| <span id="e-atlas-invalid-aggregate"></span>`E_ATLAS_INVALID_AGGREGATE` | 500 | A `withAggregate()` callback set no aggregate. |
| <span id="e-atlas-invalid-pluck"></span>`E_ATLAS_INVALID_PLUCK` | 500 | `pluck()` read a column whose value is an object or a relation. |
| <span id="e-atlas-unknown-scope"></span>`E_ATLAS_UNKNOWN_SCOPE` | 500 | `apply()` reached a scope the model does not declare, or a model with no `static scopes`. |
| <span id="e-atlas-cursor-order-required"></span>`E_ATLAS_CURSOR_ORDER_REQUIRED` | 500 | `cursorPaginate()` was called without an order column. |
| <span id="e-atlas-invalid-cursor"></span>`E_ATLAS_INVALID_CURSOR` | 500 | A `cursorPaginate()` cursor does not decode, or its tuple length does not match the order columns. |
| <span id="e-atlas-empty-update"></span>`E_ATLAS_EMPTY_UPDATE` | 500 | An update was given an empty payload: a model query's `update()`, or an UPDATE with no SET assignment that reached the compiler. |
| <span id="e-atlas-query-timeout"></span>`E_ATLAS_QUERY_TIMEOUT` | 500 | A query ran longer than its `timeout(ms)`. |
| <span id="e-atlas-compile-empty"></span>`E_ATLAS_COMPILE_EMPTY` | 500 | The query compiler returned no statement. |
| <span id="e-atlas-schema-mismatch"></span>`E_ATLAS_SCHEMA_MISMATCH` | 500 | `verifySchema()` in `throw` mode found drift between the models and the database; the message lists the findings. |
| <span id="e-atlas-schema-dump-manifest"></span>`E_ATLAS_SCHEMA_DUMP_MANIFEST` | 500 | A schema-dump manifest (`.meta.json`) is not version 1 with a `schemaTableName`. |
| <span id="e-atlas-schema-dump-sequence"></span>`E_ATLAS_SCHEMA_DUMP_SEQUENCE` | 500 | `schema:dump` read a sequence parameter from the catalog that is not an integer. |
| <span id="e-atlas-schema-dump-prune"></span>`E_ATLAS_SCHEMA_DUMP_PRUNE` | 500 | `schema:dump --prune` ran without a `migrationsDir`. |
| <span id="e-atlas-schema-generate-identifier"></span>`E_ATLAS_SCHEMA_GENERATE_IDENTIFIER` | 500 | `schema:generate` read a table or column name that does not make a TypeScript identifier. |
| <span id="e-atlas-db-assertion"></span>`E_ATLAS_DB_ASSERTION` | 500 | A database assertion (`assertHas`, `assertMissing`, `assertCount`, `assertEmpty`) does not hold. |
| <span id="e-atlas-factory-no-connection"></span>`E_ATLAS_FACTORY_NO_CONNECTION` | 500 | A factory's `create()` has no connection: none passed and none bound with `.client()` / `.connection()`. |
| <span id="e-atlas-factory-state"></span>`E_ATLAS_FACTORY_STATE` | 500 | A factory state is not defined. |
| <span id="e-atlas-factory-unknown-relation"></span>`E_ATLAS_FACTORY_UNKNOWN_RELATION` | 500 | A factory's `with()` names a relation the model does not declare, or one with no related factory. |
| <span id="e-atlas-factory-pivot-length"></span>`E_ATLAS_FACTORY_PIVOT_LENGTH` | 500 | A factory's `pivotAttributes` array length differs from the related-row count. |
| <span id="e-atlas-factory-unsupported-relation"></span>`E_ATLAS_FACTORY_UNSUPPORTED_RELATION` | 500 | A factory's `with()` names a relation kind it cannot build (a through relation). |
| <span id="e-atlas-seeder-dir-required"></span>`E_ATLAS_SEEDER_DIR_REQUIRED` | 500 | `testUtils().db().seed()` ran without a `seedersDir`. |
| <span id="e-atlas-internal"></span>`E_ATLAS_INTERNAL` | 500 | An invariant inside atlas broke, or the Rust compiler panicked or could not serialize what it compiled: always a bug in atlas itself. |
| <span id="e-invalid-date-column-value"></span>`E_INVALID_DATE_COLUMN_VALUE` | 500 | A date column was given a value that is not a valid date: a JavaScript `Date`, which carries no zone, or a datetime string without an offset. |
| <span id="e-undefined-relationship"></span>`E_UNDEFINED_RELATIONSHIP` | 500 | A relation name the model does not declare (`load()`, `withCount()`, `whereHas()`…). |
| <span id="e-unable-acquire-lock"></span>`E_UNABLE_ACQUIRE_LOCK` | 500 | Another run holds the migration lock. Wait for it, or clear a stale lock with `migration:unlock`. |
| <span id="e-unable-release-lock"></span>`E_UNABLE_RELEASE_LOCK` | 500 | A migration run succeeded, but its lock had been cleared under it (`migration:unlock` during the run), so another run may have migrated at the same time. |
| <span id="e-missing-schema-files"></span>`E_MISSING_SCHEMA_FILES` | 500 | A migration recorded as applied has no file in the migrations directory, so it cannot be rolled back. |
| <span id="e-unmanaged-db-connection"></span>`E_UNMANAGED_DB_CONNECTION` | 500 | A connection name that is not registered: a model's `static connection`, `db.connection(name)`, a factory's `connection(name)`, `manager.connect(name)`. |
| <span id="e-atlas-invalid-spec"></span>`E_ATLAS_INVALID_SPEC` | 500 | The statement the Rust compiler received is malformed: a clause misses a field, a field has the wrong shape, or the spec does not parse. Atlas builds every spec itself, so this points at an atlas bug or at a spec built by hand. |
| <span id="e-atlas-empty-insert"></span>`E_ATLAS_EMPTY_INSERT` | 500 | An INSERT or an upsert has no row (`insert([])`, `multiInsert([])`), or has several rows that set no column: only one row can take every column's default. |
| <span id="e-atlas-empty-table"></span>`E_ATLAS_EMPTY_TABLE` | 500 | `schema.createTable()` declared no column. |
| <span id="e-unsupported-client"></span>`E_UNSUPPORTED_CLIENT` | 500 | The connection names a dialect atlas does not know. Atlas compiles for `sqlite`, `postgres` (or `postgresql`) and `mysql` (or `mariadb`). |

## Atom Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-atom-invalid-input"></span>`E_ATOM_INVALID_INPUT` | 500 | A value given as a decimal is not a string, number, bigint or `Decimal`. |
| <span id="e-atom-invalid-decimal"></span>`E_ATOM_INVALID_DECIMAL` | 500 | A string or number does not read as a decimal (`parseLocale` included). |
| <span id="e-atom-unsafe-integer"></span>`E_ATOM_UNSAFE_INTEGER` | 500 | A JavaScript number is an integer past `Number.MAX_SAFE_INTEGER`; pass a string or a bigint. |
| <span id="e-atom-invalid-integer"></span>`E_ATOM_INVALID_INTEGER` | 500 | Minor units are not a whole number. |
| <span id="e-atom-decimal-too-large"></span>`E_ATOM_DECIMAL_TOO_LARGE` | 500 | A value or a result is past the `maxDigits` significant-digit bound, or a scientific literal's exponent is past `maxExponent`. |
| <span id="e-atom-invalid-scale"></span>`E_ATOM_INVALID_SCALE` | 500 | A scale or a precision is not a whole number from 0 to `maxScale` (10 000 by default). |
| <span id="e-atom-invalid-exponent"></span>`E_ATOM_INVALID_EXPONENT` | 500 | A `pow` exponent is not a whole number in range. |
| <span id="e-atom-invalid-rounding-mode"></span>`E_ATOM_INVALID_ROUNDING_MODE` | 500 | A rounding mode is not one atom knows. |
| <span id="e-atom-invalid-range"></span>`E_ATOM_INVALID_RANGE` | 500 | `clamp` / `between` got a minimum greater than the maximum. |
| <span id="e-atom-invalid-step"></span>`E_ATOM_INVALID_STEP` | 500 | A `quantize` step is not greater than zero. |
| <span id="e-atom-invalid-ratios"></span>`E_ATOM_INVALID_RATIOS` | 500 | `allocate` got no ratio, a negative one, or none positive. |
| <span id="e-atom-precision-loss"></span>`E_ATOM_PRECISION_LOSS` | 500 | `toMinorUnits` (and an exact `Money`) would lose digits at that scale. |
| <span id="e-atom-length-mismatch"></span>`E_ATOM_LENGTH_MISMATCH` | 500 | `Decimal.dot` got two lists of different lengths. |
| <span id="e-atom-division-by-zero"></span>`E_ATOM_DIVISION_BY_ZERO` | 500 | A division or a modulo by zero, on the TypeScript engine (the native engine answers with its own error). |
| <span id="e-atom-negative-sqrt"></span>`E_ATOM_NEGATIVE_SQRT` | 500 | `sqrt` of a negative value, on the TypeScript engine (the native engine answers with its own error). |
| <span id="e-atom-empty-input"></span>`E_ATOM_EMPTY_INPUT` | 500 | `avg`, `min`, `max`, `median` or `stddev` got no value. |
| <span id="e-atom-too-few-values"></span>`E_ATOM_TOO_FEW_VALUES` | 500 | A sample `stddev` got fewer than two values. |
| <span id="e-atom-invalid-context"></span>`E_ATOM_INVALID_CONTEXT` | 500 | `configureAtomContext` / `withAtomContext` got a setting that is not valid. |
| <span id="e-atom-invalid-currency"></span>`E_ATOM_INVALID_CURRENCY` | 500 | A currency code is not three letters. |
| <span id="e-atom-currency-mismatch"></span>`E_ATOM_CURRENCY_MISMATCH` | 500 | Two `Money` values of different currencies or scales were combined. |
| <span id="e-atom-invalid-column-value"></span>`E_ATOM_INVALID_COLUMN_VALUE` | 500 | The Atlas adapter got a column value of the wrong type. |
| <span id="e-atom-null-column-value"></span>`E_ATOM_NULL_COLUMN_VALUE` | 500 | A non-nullable `decimalColumn` got `null`. |
| <span id="e-atom-engine-not-found"></span>`E_ATOM_ENGINE_NOT_FOUND` | 500 | `nativeAtom()` found no native engine (N-API, WASM or the phone's JSI module). |
| <span id="e-atom-napi-disabled"></span>`E_ATOM_NAPI_DISABLED` | 500 | `nativeAtom()` ran while a test disabled the native engine. |
| <span id="e-atom-internal"></span>`E_ATOM_INTERNAL` | 500 | An internal invariant broke (a bug in atom). |
| <span id="e-atom-bulk-not-run"></span>`E_ATOM_BULK_NOT_RUN` | 500 | A planned value was read before `run()`. |
| <span id="e-atom-bulk-no-output"></span>`E_ATOM_BULK_NO_OUTPUT` | 500 | `run()` got no value to compute. |
| <span id="e-atom-bulk-bad-output"></span>`E_ATOM_BULK_BAD_OUTPUT` | 500 | `run()` got something that is not a planned value. |
| <span id="e-atom-bulk-length-mismatch"></span>`E_ATOM_BULK_LENGTH_MISMATCH` | 500 | A plan's columns have different lengths. |
| <span id="e-atom-bulk-empty-column"></span>`E_ATOM_BULK_EMPTY_COLUMN` | 500 | A column has no value. |
| <span id="e-atom-bulk-bad-index"></span>`E_ATOM_BULK_BAD_INDEX` | 500 | `at()` is outside the column. |
| <span id="e-atom-bulk-bad-percentile"></span>`E_ATOM_BULK_BAD_PERCENTILE` | 500 | A percentile is not a fraction between 0 and 1. |
| <span id="e-atom-bulk-bad-exponent"></span>`E_ATOM_BULK_BAD_EXPONENT` | 500 | A planned `pow` exponent is not a whole number in range. |
| <span id="e-atom-bulk-bad-precision"></span>`E_ATOM_BULK_BAD_PRECISION` | 500 | A planned precision is not a whole number from 0 to `maxScale` (10 000 by default). |
| <span id="e-atom-bulk-bad-scale"></span>`E_ATOM_BULK_BAD_SCALE` | 500 | `minorUnits()` got a scale that is not one. |
| <span id="e-atom-bulk-not-minor-units"></span>`E_ATOM_BULK_NOT_MINOR_UNITS` | 500 | `minorUnits()` got a value that is not a whole number of minor units. |
| <span id="e-atom-bulk-too-short"></span>`E_ATOM_BULK_TOO_SHORT` | 500 | A planned sample standard deviation has fewer than two values. |
| <span id="e-atom-bulk-no-length"></span>`E_ATOM_BULK_NO_LENGTH` | 500 | A column was built with no source (a bug in atom). |
| <span id="e-atom-bulk-bad-program"></span>`E_ATOM_BULK_BAD_PROGRAM` | 500 | The TypeScript evaluator met a malformed plan (a bug in atom). |
| <span id="e-atom-bulk-lost-output"></span>`E_ATOM_BULK_LOST_OUTPUT` | 500 | A run returned fewer values than it was asked for (a bug in atom). |
| <span id="e-atom-bulk-overflow"></span>`E_ATOM_BULK_OVERFLOW` | — | Internal: the Rust bulk engine overflowed 128 bits; atom catches it and reruns the program with exact BigInt arithmetic, so it never reaches you. |
| <span id="e-atom-bulk-foreign-column"></span>`E_ATOM_BULK_FOREIGN_COLUMN` | 500 | `run()` / `runAsync()` got a planned value that reads a column loaded on another `Bulk`. |

## Aurora Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-aurora-illegal-page-name"></span>`E_AURORA_ILLEGAL_PAGE_NAME` | 500 | A page name holds characters a page name may not. |
| <span id="e-aurora-page-outside-root"></span>`E_AURORA_PAGE_OUTSIDE_ROOT` | 500 | The resolved page path lands outside the configured pages root. |
| <span id="e-aurora-page-not-found"></span>`E_AURORA_PAGE_NOT_FOUND` | 500 | No file for this page name. |
| <span id="e-aurora-page-import-failed"></span>`E_AURORA_PAGE_IMPORT_FAILED` | 500 | The page is on disk and its module graph refused to load. |
| <span id="e-aurora-page-invalid-export"></span>`E_AURORA_PAGE_INVALID_EXPORT` | 500 | The page module loaded but does not default-export a factory. |
| <span id="e-aurora-illegal-root-tag"></span>`E_AURORA_ILLEGAL_ROOT_TAG` | 500 | `renderPage` was given a root tag that is not a plain element name. |
| <span id="e-aurora-outside-component"></span>`E_AURORA_OUTSIDE_COMPONENT` | 500 | `onMount` / `onUnmount` was called outside a `component()` setup function. |
| <span id="e-aurora-missing-context"></span>`E_AURORA_MISSING_CONTEXT` | 500 | `inject` found no provider for the context, and it declared no default. |
| <span id="e-aurora-not-booted"></span>`E_AURORA_NOT_BOOTED` | 500 | The manager singleton was read before a provider or `setAurora` set it. |
| <span id="e-aurora-unknown-route"></span>`E_AURORA_UNKNOWN_ROUTE` | 500 | `urlFor` was given a name absent from the route manifest. |
| <span id="e-aurora-missing-route-params"></span>`E_AURORA_MISSING_ROUTE_PARAMS` | 500 | `urlFor` was given a route whose required params were not all supplied. |
| <span id="e-aurora-unknown-live-component"></span>`E_AURORA_UNKNOWN_LIVE_COMPONENT` | 500 | A live component was mounted before `registry.define()` named it. |
| <span id="e-aurora-live-session-limit"></span>`E_AURORA_LIVE_SESSION_LIMIT` | 503 | A live session was refused: the registry holds `maxSessions` already, and every one is in use (claimed and seen within half of `idleTimeoutMs`). |
| <span id="e-aurora-relay-request-failed"></span>`E_AURORA_RELAY_REQUEST_FAILED` | 500 | A relay request came back with a non-2xx status. |
| <span id="e-aurora-unsafe-url"></span>`E_AURORA_UNSAFE_URL` | 500 | A navigation URL failed the same-origin / scheme check. |
| <span id="e-aurora-slot-in-tag-name"></span>`E_AURORA_SLOT_IN_TAG_NAME` | 500 | A `${}` landed where a tag name goes. |
| <span id="e-aurora-slot-in-attribute-name"></span>`E_AURORA_SLOT_IN_ATTRIBUTE_NAME` | 500 | A `${}` landed where an attribute name goes. |
| <span id="e-aurora-slot-in-raw-text"></span>`E_AURORA_SLOT_IN_RAW_TEXT` | 500 | A `${}` landed inside `<script>`, `<style>`, `<textarea>`, `<title>`… |
| <span id="e-aurora-slot-in-comment"></span>`E_AURORA_SLOT_IN_COMMENT` | 500 | A `${}` landed inside a comment, a `<!…>` / `<?…>` or a CDATA section. |
| <span id="e-aurora-slot-in-event-attribute"></span>`E_AURORA_SLOT_IN_EVENT_ATTRIBUTE` | 500 | A `${}` landed in an `on*` attribute, whose value is JavaScript. |
| <span id="e-aurora-slot-in-srcdoc"></span>`E_AURORA_SLOT_IN_SRCDOC` | 500 | A `${}` landed in `srcdoc`, which an iframe parses as a whole document. |
| <span id="e-aurora-slot-in-base-url"></span>`E_AURORA_SLOT_IN_BASE_URL` | 500 | A `${}` landed in `<base href>`, which rebases every URL on the page. |
| <span id="e-aurora-slot-in-script-source"></span>`E_AURORA_SLOT_IN_SCRIPT_SOURCE` | 500 | A `${}` landed in the URL a `<script>` loads its code from. |
| <span id="e-aurora-slot-in-html-property"></span>`E_AURORA_SLOT_IN_HTML_PROPERTY` | 500 | A `.prop` binding names a property that parses its value as HTML. |
| <span id="e-aurora-template-in-attribute"></span>`E_AURORA_TEMPLATE_IN_ATTRIBUTE` | 500 | A nested `html` template reached an attribute value or `.value`. |
| <span id="e-aurora-file-input-value"></span>`E_AURORA_FILE_INPUT_VALUE` | 500 | `.value` was given a non-empty string on an `<input type="file">`. |
| <span id="e-aurora-duplicate-key"></span>`E_AURORA_DUPLICATE_KEY` | 500 | Two elements of an `each()` list share a key, which names one row. |
| <span id="e-aurora-invalid-lazy"></span>`E_AURORA_INVALID_LAZY` | 500 | `each(…, { lazy })` was given an `estimate` that is not a positive length, or an `overscan` that is negative or not a number. |
| <span id="e-aurora-visits-need-photon"></span>`E_AURORA_VISITS_NEED_PHOTON` | 500 | `visits` is on but `@c9up/photon` is not installed, or too old (0.1.25 and later speak the protocol for aurora). |
| <span id="e-aurora-visit-props"></span>`E_AURORA_VISIT_PROPS` | 500 | With `visits` on, a page's props (shared ones merged in) were not an object, as the protocol's `page.props` must be. |
| <span id="e-aurora-invalid-motion"></span>`E_AURORA_INVALID_MOTION` | 500 | `motion=${…}` was not an object of motion values, or named a property motion cannot drive (rotation, colour). |
| <span id="e-aurora-reactive-cycle"></span>`E_AURORA_REACTIVE_CYCLE` | 500 | Effects kept re-running each other in one update: one writes what it, or an effect it triggers, reads. |
| <span id="e-aurora-internal"></span>`E_AURORA_INTERNAL` | 500 | An invariant inside aurora broke: always a bug in aurora itself. |
| <span id="e-aurora-visit-no-page-data"></span>`E_AURORA_VISIT_NO_PAGE_DATA` | 500 | With `visits` on, the page carries no usable page data script (`script[data-aurora-page][type="application/json"]`) to boot from. |
| <span id="e-aurora-visit-async-first-page"></span>`E_AURORA_VISIT_ASYNC_FIRST_PAGE` | 500 | With `visits` on, the first page's factory is async: a hydrated page renders synchronously. |
| <span id="e-aurora-invalid-live-limit"></span>`E_AURORA_INVALID_LIVE_LIMIT` | 500 | A live registry limit (`maxSessions`, `maxPerOwner`, `claimTimeoutMs`, `idleTimeoutMs`) is not a positive number. |
| <span id="e-aurora-browser-entry-outside-dist"></span>`E_AURORA_BROWSER_ENTRY_OUTSIDE_DIST` | 500 | A browser package declares its entry outside the `dist/` aurora serves for it. |
| <span id="e-aurora-browser-entry-at-root"></span>`E_AURORA_BROWSER_ENTRY_AT_ROOT` | 500 | A browser package has its entry at the package root: serving it would publish the whole package. |
| <span id="e-aurora-browser-package-clash"></span>`E_AURORA_BROWSER_PACKAGE_CLASH` | 500 | Two browser packages would mount on the same asset path. |
| <span id="e-aurora-http-request-failed"></span>`E_AURORA_HTTP_REQUEST_FAILED` | 500 | An `HttpClient` request came back with a non-2xx status (the error carries that `status`). |
| <span id="e-aurora-visit-cross-origin-module"></span>`E_AURORA_VISIT_CROSS_ORIGIN_MODULE` | 500 | With `visits` on, a page module's URL (the page data's `modules` pattern, `{name}` filled in) is not on the page's own origin and scheme, or its path starts with `//`. Nothing is imported. Serve page modules from your own origin. |

## Bay Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-bay-invalid-adapter"></span>`E_BAY_INVALID_ADAPTER` | 500 | An adapter factory did not build a queue driver. |
| <span id="e-bay-unsupported-driver"></span>`E_BAY_UNSUPPORTED_DRIVER` | 500 | The `driver` key names a driver; declare it under `adapters` instead. |
| <span id="e-bay-invalid-binding"></span>`E_BAY_INVALID_BINDING` | 500 | The container answers something other than a `QueueManager` for the `QueueManager` token. |
| <span id="e-bay-quasar-missing"></span>`E_BAY_QUASAR_MISSING` | 500 | A Redis adapter names a quasar connection and `@c9up/quasar` is not installed, or its manager is not available yet. |
| <span id="e-bay-incomplete-connection"></span>`E_BAY_INCOMPLETE_CONNECTION` | 500 | The Redis connection lacks a command the driver issues (EVALSHA, SCRIPT LOAD, …). |
| <span id="e-bay-unexpected-reply"></span>`E_BAY_UNEXPECTED_REPLY` | 500 | A Redis script answered with a reply the driver cannot read. |
| <span id="e-bay-invalid-job-options"></span>`E_BAY_INVALID_JOB_OPTIONS` | 500 | A job class declares an option it cannot run with; the specific refusal is in `cause`. |
| <span id="e-bay-invalid-job-name"></span>`E_BAY_INVALID_JOB_NAME` | 500 | A job's `options.name` is empty, or `make:job` is given a name that cannot become a file and a class. |
| <span id="e-bay-duplicate-job"></span>`E_BAY_DUPLICATE_JOB` | 500 | Two job classes answer to the same name. |
| <span id="e-bay-invalid-attempts"></span>`E_BAY_INVALID_ATTEMPTS` | 500 | `maxAttempts` / `maxRetries` is not a whole number >= 1, or a backoff is asked for an attempt below 1. |
| <span id="e-bay-invalid-priority"></span>`E_BAY_INVALID_PRIORITY` | 500 | A priority is not a whole number from 1 to 10. |
| <span id="e-bay-invalid-retention"></span>`E_BAY_INVALID_RETENTION` | 500 | `removeOnComplete` / `removeOnFail` is not a boolean or a valid `{ age?, count? }`. |
| <span id="e-bay-invalid-dedup"></span>`E_BAY_INVALID_DEDUP` | 500 | A `dedup` has an empty id, a ttl that is not a whole number from 1, or `extend` without a ttl. |
| <span id="e-bay-invalid-worker-options"></span>`E_BAY_INVALID_WORKER_OPTIONS` | 500 | A worker option is out of range: `idleDelay`, `stalledInterval`, `concurrency`, `unknownJobRetries` or `queues`. |
| <span id="e-bay-unsupported-operation"></span>`E_BAY_UNSUPPORTED_OPERATION` | 500 | The queue driver has no `getJob()` or `sizeOf()` for the lookup asked. |
| <span id="e-bay-invalid-job-factory"></span>`E_BAY_INVALID_JOB_FACTORY` | 500 | The job factory built something that is not the job class, or a handler without `handle()`; the attempt fails with it. |
| <span id="e-bay-unserializable-job"></span>`E_BAY_UNSERIALIZABLE_JOB` | 500 | A job record cannot be stored as JSON the way Redis would carry it. |
| <span id="e-bay-jobs-directory-unreadable"></span>`E_BAY_JOBS_DIRECTORY_UNREADABLE` | 500 | A declared jobs directory exists but cannot be read. |
| <span id="e-bay-no-jobs-found"></span>`E_BAY_NO_JOBS_FOUND` | 500 | Job files were scanned and none yielded a `Job` subclass. |
| <span id="e-bay-duplicate-job-id"></span>`E_BAY_DUPLICATE_JOB_ID` | 500 | `FakeQueue.push()` is given a job id it already holds. |
| <span id="e-job-timeout"></span>`E_JOB_TIMEOUT` | 500 | An attempt ran past its `timeout`; carries `job` (its name) and `timeout` (ms). What `failOnTimeout` looks for. |
| <span id="e-worker-already-running"></span>`E_WORKER_ALREADY_RUNNING` | 500 | `work()` is called while the manager's worker is already running. |
| <span id="e-invalid-timeout"></span>`E_INVALID_TIMEOUT` | 500 | A job `timeout` is not `0` or a whole number of milliseconds `setTimeout` can hold (1 to 2147483647). |
| <span id="e-configuration-error"></span>`E_CONFIGURATION_ERROR` | 500 | bay: `config.queue` is not what `defineConfig` returns, declares adapters without a `default`, its `default` names an adapter it does not declare, a backoff names an unknown strategy, or a `RedisDriver` option (`visibilityTimeoutMs`, `maxStalledCount`, `maxFailedJobs`) is out of range. |
| <span id="e-queue-not-initialized"></span>`E_QUEUE_NOT_INITIALIZED` | 500 | The queue is used before `BayProvider` booted or `setQueue()` was called (service accessor, `Job.dispatch()`, `queue:work`), or `ready()` ran before `boot()`. |
| <span id="e-invalid-duration-expression"></span>`E_INVALID_DURATION_EXPRESSION` | 500 | A bay duration is neither a non-negative number of milliseconds nor a string like `'10s'`. The message names the value; `help` names the option that held it. |
| <span id="e-bay-fake-job-not-found"></span>`E_BAY_FAKE_JOB_NOT_FOUND` | 500 | `FakeQueue` is asked to complete, fail or retry a job it does not hold. |
| <span id="e-adapter-init-error"></span>`E_ADAPTER_INIT_ERROR` | 500 | The selected queue adapter's factory threw while building its driver; its error is the `cause`. |
| <span id="e-invalid-base-delay"></span>`E_INVALID_BASE_DELAY` | 500 | A backoff `baseDelay` is not above zero. |
| <span id="e-invalid-max-delay"></span>`E_INVALID_MAX_DELAY` | 500 | A backoff `maxDelay` is not above zero, or not above `baseDelay`. |
| <span id="e-invalid-multiplier"></span>`E_INVALID_MULTIPLIER` | 500 | A backoff `multiplier` is not above zero, or is below 1 for the exponential strategy. |
| <span id="e-job-not-found"></span>`E_JOB_NOT_FOUND` | 500 | A job no handler or job class answers to stays unknown past `unknownJobRetries`; the failed record keeps its message. |
| <span id="e-job-max-attempts-reached"></span>`E_JOB_MAX_ATTEMPTS_REACHED` | 500 | Handed to a job's `failed()` hook once its retries ran out; the last attempt's error is the `cause`. |
| <span id="e-job-stalled"></span>`E_JOB_STALLED` | 500 | The Redis queue driver files a job reclaimed from a dead worker more than `maxStalledCount` times as failed; the failed record keeps its message. |

## Blackhole Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-too-many-requests-blackhole"></span>`E_TOO_MANY_REQUESTS` | 429 | Blackhole's global rate limit refused the request (with `Retry-After`), or a throttle middleware or `limiter.consume()` found the key over its budget. Wait and retry. |
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
| <span id="e-blackhole-invalid-csp"></span>`E_BLACKHOLE_INVALID_CSP` | 500 | The Content-Security-Policy is invalid: a bad directive name or value, an unquoted keyword, a directive given twice, no `default-src`, a line break, or both `directives` and `policy`. |
| <span id="e-blackhole-removed-option"></span>`E_BLACKHOLE_REMOVED_OPTION` | 500 | The config still sets an option that was removed (`securityHeaders`); the message names its replacement. |
| <span id="e-blackhole-unknown-option"></span>`E_BLACKHOLE_UNKNOWN_OPTION` | 500 | A header or CORS option names a key it does not have. |
| <span id="e-blackhole-invalid-header-value"></span>`E_BLACKHOLE_INVALID_HEADER_VALUE` | 500 | An option's value cannot be written as a header value (empty, or a control or non-ASCII character). |
| <span id="e-blackhole-invalid-xframe"></span>`E_BLACKHOLE_INVALID_XFRAME` | 500 | `xFrame.action` is not DENY, SAMEORIGIN or ALLOW-FROM, or ALLOW-FROM has no `domain`. |
| <span id="e-blackhole-invalid-cors"></span>`E_BLACKHOLE_INVALID_CORS` | 500 | CORS combines a wildcard origin with `credentials: true`, or its origin list holds something other than non-empty strings. |
| <span id="e-blackhole-invalid-duration"></span>`E_BLACKHOLE_INVALID_DURATION` | 500 | A duration (HSTS `maxAge`, a limiter duration) is negative or unreadable. |
| <span id="e-blackhole-invalid-rate-limit"></span>`E_BLACKHOLE_INVALID_RATE_LIMIT` | 500 | A rate limit or limiter is given a request count or duration that is not a positive whole number. |
| <span id="e-blackhole-secret-missing"></span>`E_BLACKHOLE_SECRET_MISSING` | — | CSRF is enabled and no `secret` was given. |
| <span id="e-blackhole-weak-secret"></span>`E_BLACKHOLE_WEAK_SECRET` | 500 | The CSRF `secret` is the scaffolding placeholder, or shorter than 16 characters. |
| <span id="e-blackhole-invalid-secret"></span>`E_BLACKHOLE_INVALID_SECRET` | 500 | The CSRF `secret` is neither a string nor a `Secret` wrapping one. |
| <span id="e-blackhole-napi-required"></span>`E_BLACKHOLE_NAPI_REQUIRED` | — | The blackhole native engine is not loaded for this platform; `cause` carries the load failure. |
| <span id="e-blackhole-not-registered"></span>`E_BLACKHOLE_NOT_REGISTERED` | 500 | The middleware ran without a Blackhole instance: `BlackholeProvider` is not registered, or the host exposes no `ctx.containerResolver`. |
| <span id="e-blackhole-rate-limit-store-missing"></span>`E_BLACKHOLE_RATE_LIMIT_STORE_MISSING` | 500 | `checkRateLimit()` was called without a configured `rateLimit.store`. |
| <span id="e-blackhole-empty-rate-limit-key"></span>`E_BLACKHOLE_EMPTY_RATE_LIMIT_KEY` | 500 | `checkRateLimit()` was given an empty key, which would count every request in one bucket. |
| <span id="e-blackhole-unknown-store"></span>`E_BLACKHOLE_UNKNOWN_STORE` | 500 | A limiter or `rateLimit` names a store that is not declared in `stores`. |
| <span id="e-blackhole-no-default-store"></span>`E_BLACKHOLE_NO_DEFAULT_STORE` | — | `rateLimit` declares `stores` but no `default` naming the one that counts. |
| <span id="e-blackhole-limiter-options-missing"></span>`E_BLACKHOLE_LIMITER_OPTIONS_MISSING` | 500 | `limiter.use()` or `limiter.multi()` was called without the requests and duration of its limiter(s). |
| <span id="e-blackhole-incomplete-throttle"></span>`E_BLACKHOLE_INCOMPLETE_THROTTLE` | 500 | A throttle middleware ran on a limiter without `allowRequests()` and `every()`. |
| <span id="e-blackhole-invalid-table-name"></span>`E_BLACKHOLE_INVALID_TABLE_NAME` | 500 | The database limiter store's `tableName` is not a table name. |
| <span id="e-blackhole-quasar-missing"></span>`E_BLACKHOLE_QUASAR_MISSING` | 500 | A Redis store names a connection and `@c9up/quasar` is not installed. |
| <span id="e-blackhole-incomplete-connection"></span>`E_BLACKHOLE_INCOMPLETE_CONNECTION` | 500 | The named quasar connection lacks the commands the counter issues. |
| <span id="e-blackhole-invalid-xss-attribute"></span>`E_BLACKHOLE_INVALID_XSS_ATTRIBUTE` | 500 | `xss.allowAttributes` names an attribute outside the opt-in list (`id`, `is`, `slot`, `part`, `data-*`, `class`); the native engine refuses it. |
| <span id="e-blackhole-unknown-check"></span>`E_BLACKHOLE_UNKNOWN_CHECK` | 500 | `check()` was asked for a check the engine does not have (only `rateLimit`, `shield` and `csrf` exist). |
| <span id="e-blackhole-invalid-headers"></span>`E_BLACKHOLE_INVALID_HEADERS` | 500 | `check()` was given request headers that are not an object of strings. |
| <span id="e-blackhole-internal-panic"></span>`E_BLACKHOLE_INTERNAL_PANIC` | 500 | The native engine panicked while checking a request; `cause` carries the native error. |
| <span id="e-blackhole-invalid-xss-limit"></span>`E_BLACKHOLE_INVALID_XSS_LIMIT` | 500 | `xss.maxInputBytes` or `xss.maxDepth` is not a positive whole number. |
| <span id="e-blackhole-html-too-large"></span>`E_BLACKHOLE_HTML_TOO_LARGE` | 500 | `sanitizeResponse()` (or the `xss` pass) was given a `text/html` body longer than `xss.maxInputBytes` (1 MiB by default). |
| <span id="e-blackhole-html-too-deep"></span>`E_BLACKHOLE_HTML_TOO_DEEP` | 500 | The HTML to sanitize nests elements deeper than `xss.maxDepth` (512 by default), measured on the tree the parser builds. |
| <span id="e-blackhole-html-too-complex"></span>`E_BLACKHOLE_HTML_TOO_COMPLEX` | 500 | The HTML to sanitize builds more than four times its size plus 64 KiB (misnested formatting tags re-created in every block). |

## Chronos Errors

Every refusal, from the TypeScript side or from the Rust engine, carries its code in `error.code`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-chronos-invalid-year"></span>`E_CHRONOS_INVALID_YEAR` | 500 | `easterDate` / `holidays` got a year that is not an integer in 1583-9999 (the Gregorian computus). |
| <span id="e-chronos-unknown-country"></span>`E_CHRONOS_UNKNOWN_COUNTRY` | 500 | `holidays` / `isHoliday` got a country with no holiday calendar (known: `CH`, `FR`). |
| <span id="e-chronos-unknown-region"></span>`E_CHRONOS_UNKNOWN_REGION` | 500 | The region is not a Swiss canton's two-letter code, or a region was given for `FR`. |
| <span id="e-chronos-invalid-date"></span>`E_CHRONOS_INVALID_DATE` | 500 | A date that does not exist: `isHoliday` got a string that is not a calendar date `YYYY-MM-DD`, or a `DateTime` was built from an invalid JavaScript `Date`. |
| <span id="e-chronos-engine-required"></span>`E_CHRONOS_ENGINE_REQUIRED` | — | The Chronos engine (the NAPI binary in Node, the WASM build in a browser) did not load. |
| <span id="e-chronos-invalid-argument"></span>`E_CHRONOS_INVALID_ARGUMENT` | 500 | An argument has the wrong type (`fromMillis("12")`, `fromFormat` without a string, `expandRRule(rule, options)` without the rule text), or `toRelative` got an unknown `rounding`. |
| <span id="e-chronos-out-of-range"></span>`E_CHRONOS_OUT_OF_RANGE` | 500 | A value or a `plus`/`minus` result falls outside years 0000-9999. |
| <span id="e-chronos-conflicting-fields"></span>`E_CHRONOS_CONFLICTING_FIELDS` | 500 | A format mixes fields that contradict each other: a meridiem with a 24-hour hour, week fields with year/month/day, an ordinal with month/day. |
| <span id="e-chronos-unsupported-unit"></span>`E_CHRONOS_UNSUPPORTED_UNIT` | 500 | A unit chronos does not know (`fortnight`) was given to `plus`, `diff`, `toRelative`, `Duration` or an `Interval` method. |
| <span id="e-chronos-missing-unit"></span>`E_CHRONOS_MISSING_UNIT` | 500 | `plus(amount)` / `minus(amount)` without a unit, or `diff` / `toRelative` with an empty unit list. |
| <span id="e-chronos-invalid-unit-value"></span>`E_CHRONOS_INVALID_UNIT_VALUE` | 500 | A unit amount is not a finite number (`NaN`, `Infinity`, a string). |
| <span id="e-chronos-invalid-duration"></span>`E_CHRONOS_INVALID_DURATION` | 500 | A duration that cannot be read or used: an ISO 8601 duration that does not parse, a value that is not an object of units, a non-positive `splitBy` step. |
| <span id="e-chronos-invalid-interval"></span>`E_CHRONOS_INVALID_INTERVAL` | 500 | An `Interval` whose start is after its end, or an ISO 8601 interval that does not parse. |
| <span id="e-chronos-invalid-range"></span>`E_CHRONOS_INVALID_RANGE` | 500 | A `DateRange` given to `inRange`, `containsRange`, `overlapsRange` or `analyzeRange` starts after it ends. |
| <span id="e-chronos-invalid-locale"></span>`E_CHRONOS_INVALID_LOCALE` | 500 | `setLocale` got a tag `Intl` does not accept. |
| <span id="e-chronos-invalid-rrule"></span>`E_CHRONOS_INVALID_RRULE` | 500 | `toRRuleString` (or `expandRRule` with a structured rule) got a field it cannot write into the rule text. |
| <span id="e-chronos-invalid-rrule-limit"></span>`E_CHRONOS_INVALID_RRULE_LIMIT` | 500 | The `expandRRule` limit is not a positive integer. |
| <span id="e-chronos-rrule-limit-exceeded"></span>`E_CHRONOS_RRULE_LIMIT_EXCEEDED` | 500 | The `expandRRule` limit is above the 10,000 cap. |
| <span id="e-chronos-invalid-column-value"></span>`E_CHRONOS_INVALID_COLUMN_VALUE` | 500 | The atlas `DateTime` column adapter read a database value of an unexpected type, or was asked to store something other than a `DateTime`. |
| <span id="e-chronos-internal"></span>`E_CHRONOS_INTERNAL` | 500 | The engine answered something chronos does not expect (a bug in chronos, not in your code). |
| <span id="e-chronos-unknown-zone"></span>`E_CHRONOS_UNKNOWN_ZONE` | 500 | A zone the tz database does not know: `new DateTime(input, zone)`, `DateTime.now(zone)`, `setZone`, `fromSQL`, the `tzid` of `expandRRule` or a `TZID` in its text. |
| <span id="e-chronos-unreadable-rrule"></span>`E_CHRONOS_UNREADABLE_RRULE` | 500 | `expandRRule` got rule text the engine cannot read or expand: an unknown or repeated property, a value out of range, no start, a rule over the size limit. |

## Comet Errors

Raised by the WebSocket transport (`createWebSocketTransport()`), with one of the codes below: the call failed without a JSON-RPC answer. A JSON-RPC error the server answered keeps its numeric code.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-comet-connection-failed"></span>`E_COMET_CONNECTION_FAILED` | 500 | The socket could not be opened: refused handshake, bad URL or network. |
| <span id="e-comet-connection-closed"></span>`E_COMET_CONNECTION_CLOSED` | 500 | The socket closed while the call waited, or stays closed (`reconnect: false`). |
| <span id="e-comet-transport-closed"></span>`E_COMET_TRANSPORT_CLOSED` | 500 | `close()` was called on the transport; calls made afterwards fail the same way. |
| <span id="e-comet-timeout"></span>`E_COMET_TIMEOUT` | 500 | No answer within the timeout. |
| <span id="e-comet-message-too-large"></span>`E_COMET_MESSAGE_TOO_LARGE` | 500 | A message over `maxMessageBytes`, sent or received. |
| <span id="e-comet-backpressure"></span>`E_COMET_BACKPRESSURE` | 500 | More than `maxBufferedBytes` already wait to be sent. |
| <span id="e-comet-protocol-error"></span>`E_COMET_PROTOCOL_ERROR` | 500 | The peer sent what no JSON-RPC server answers, so the socket was closed. |
| <span id="e-comet-invalid-message"></span>`E_COMET_INVALID_MESSAGE` | 500 | The client handed over something that is not a JSON-RPC message, or not JSON. |
| <span id="e-comet-invalid-option"></span>`E_COMET_INVALID_OPTION` | 500 | `createWebSocketTransport()` was given a `timeout`, `maxMessageBytes` or `maxBufferedBytes` that is not a positive number, or a `timeout` past what a timer can wait. |

## Echo Errors

`E_FACTORY_ERROR`, `E_FACTORY_HARD_TIMEOUT`, `E_UNDEFINED_VALUE` and `E_L2_CACHE_ERROR` keep the identifiers cache code already catches on.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-factory-error"></span>`E_FACTORY_ERROR` | 500 | The factory of `getOrSet()` threw; `cause` holds its error. |
| <span id="e-factory-hard-timeout"></span>`E_FACTORY_HARD_TIMEOUT` | 500 | The factory did not finish within its hard timeout. |
| <span id="e-undefined-value"></span>`E_UNDEFINED_VALUE` | 500 | A `null` or `undefined` value was written to the cache. |
| <span id="e-l2-cache-error"></span>`E_L2_CACHE_ERROR` | 500 | A tiered store's second level failed and the failure is not suppressed. |
| <span id="e-echo-lock-timeout"></span>`E_ECHO_LOCK_TIMEOUT` | 500 | A caller waited too long for another caller's factory of the same key. |
| <span id="e-echo-invalid-argument"></span>`E_ECHO_INVALID_ARGUMENT` | 500 | A method was given an argument it cannot work with. |
| <span id="e-echo-invalid-duration"></span>`E_ECHO_INVALID_DURATION` | 500 | A duration is neither a number of milliseconds nor a readable string. |
| <span id="e-echo-invalid-config"></span>`E_ECHO_INVALID_CONFIG` | 500 | A config value cannot be read, such as a size that is not bytes or `'10mb'`, or a Redis connection's `keyPrefix` is not a string when `clear()` needs it. |
| <span id="e-echo-unknown-store"></span>`E_ECHO_UNKNOWN_STORE` | 500 | A store name, or the default store, is not declared in `stores`. |
| <span id="e-echo-unsupported-driver"></span>`E_ECHO_UNSUPPORTED_DRIVER` | — | The default provider was given a driver it does not build. |
| <span id="e-echo-not-taggable"></span>`E_ECHO_NOT_TAGGABLE` | 500 | Tag invalidation on a driver (or a tier) that has no tags. |
| <span id="e-echo-scan-unsupported"></span>`E_ECHO_SCAN_UNSUPPORTED` | — | `flush()` on a Redis client, or on a cluster master, without `scan()`; `KEYS` is not used. |
| <span id="e-echo-unserializable-value"></span>`E_ECHO_UNSERIALIZABLE_VALUE` | — | The memory driver stores JSON and the value has no JSON form. Pass `serialize: false` to keep it as is. |
| <span id="e-echo-quasar-missing"></span>`E_ECHO_QUASAR_MISSING` | 500 | A Redis store was configured and `@c9up/quasar` is not installed. |
| <span id="e-echo-incomplete-connection"></span>`E_ECHO_INCOMPLETE_CONNECTION` | 500 | The quasar connection lacks what echo needs (`publish()` / `subscribe()`). |
| <span id="e-echo-not-booted"></span>`E_ECHO_NOT_BOOTED` | — | The cache singleton was used before `EchoProvider.boot()` or `setCache()`. |
| <span id="e-echo-bus-subscribe-failed"></span>`E_ECHO_BUS_SUBSCRIBE_FAILED` | 500 | The quasar cache bus reported a subscribe failure that is not an `Error`; `cause` holds what it reported. |
| <span id="e-factory-soft-timeout"></span>`E_FACTORY_SOFT_TIMEOUT` | 500 | Not raised by echo: at the soft timeout the stale value is served. Exported on `errors` for code that tests it. |

## Eclipse Errors

`E_LOCK_NOT_OWNED` and `E_LOCK_STORAGE_ERROR` keep the identifiers lock code already catches on.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-lock-not-owned"></span>`E_LOCK_NOT_OWNED` | 500 | The lock is not held by this holder: it expired, or another holder has it. Raised when work succeeded but the lease lapsed while it ran. |
| <span id="e-lock-storage-error"></span>`E_LOCK_STORAGE_ERROR` | 500 | The lock store failed while saving, reading or deleting. |
| <span id="e-eclipse-invalid-ttl"></span>`E_ECLIPSE_INVALID_TTL` | 500 | A lock TTL is not a finite positive number of milliseconds, or `null`. |
| <span id="e-eclipse-invalid-duration"></span>`E_ECLIPSE_INVALID_DURATION` | 500 | A duration string cannot be read. |
| <span id="e-eclipse-invalid-retry"></span>`E_ECLIPSE_INVALID_RETRY` | 500 | A `retry` option is out of range. |
| <span id="e-eclipse-invalid-config"></span>`E_ECLIPSE_INVALID_CONFIG` | 500 | The lock config is invalid. |
| <span id="e-eclipse-missing-config"></span>`E_ECLIPSE_MISSING_CONFIG` | 500 | `config/lock.ts` is missing. |
| <span id="e-eclipse-unknown-store"></span>`E_ECLIPSE_UNKNOWN_STORE` | 500 | A lock store name is not declared. |
| <span id="e-eclipse-quasar-missing"></span>`E_ECLIPSE_QUASAR_MISSING` | 500 | A Redis store was configured and `@c9up/quasar` is not installed. |
| <span id="e-eclipse-incomplete-connection"></span>`E_ECLIPSE_INCOMPLETE_CONNECTION` | 500 | The quasar connection lacks what eclipse needs. |
| <span id="e-eclipse-database-unavailable"></span>`E_ECLIPSE_DATABASE_UNAVAILABLE` | 500 | A database lock store asks for atlas, which is not installed or has not booted. |
| <span id="e-eclipse-unsupported-database"></span>`E_ECLIPSE_UNSUPPORTED_DATABASE` | 500 | A database lock store was given a dialect other than PostgreSQL, MySQL or SQLite. |
| <span id="e-eclipse-not-booted"></span>`E_ECLIPSE_NOT_BOOTED` | 500 | The lock manager singleton was used before `EclipseProvider.boot()` or `setLocks()`. |
| <span id="e-eclipse-invalid-binding"></span>`E_ECLIPSE_INVALID_BINDING` | 500 | The container resolved the `LockManager` token to something that is not a `LockManager`. |

## Eon Errors

Every refusal, the query compiler's included, carries its code in `error.code`. TDengine's own numeric error code is in `taosCode`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-eon-missing-connection"></span>`E_EON_MISSING_CONNECTION` | 500 | A repository has no connection to run on. |
| <span id="e-eon-not-a-supertable"></span>`E_EON_NOT_A_SUPERTABLE` | 500 | A class used as a super-table is not decorated with `@SuperTable`. |
| <span id="e-eon-no-tags"></span>`E_EON_NO_TAGS` | 500 | A super-table has no `@Tag` column, so a child table cannot be routed. |
| <span id="e-eon-no-timestamp"></span>`E_EON_NO_TIMESTAMP` | 500 | A super-table has no `@Timestamp` column. |
| <span id="e-eon-child-stable"></span>`E_EON_CHILD_STABLE` | 500 | `createChildTable()` was given neither `stable` nor `EntityClass`. |
| <span id="e-eon-child-collision"></span>`E_EON_CHILD_COLLISION` | 500 | Two distinct tag sets map to the same child table; eon refuses to write mismatched rows under one tag set. |
| <span id="e-eon-child-migration"></span>`E_EON_CHILD_MIGRATION` | 500 | `migrateChildTableNames()` read a child listing row without a table name. |
| <span id="e-eon-batch-size"></span>`E_EON_BATCH_SIZE` | 500 | `batchSize` is not a positive integer. |
| <span id="e-eon-bind"></span>`E_EON_BIND` | 500 | A value cannot be written to its STMT placeholder as given: the wrong type, or a decimal the column cannot hold exactly. |
| <span id="e-eon-server-version"></span>`E_EON_SERVER_VERSION` | 500 | The columnar STMT path needs TDengine 3.3.6.0 or later (stmt2). |
| <span id="e-eon-type"></span>`E_EON_TYPE` | 500 | A column or tag has an unknown or missing type. |
| <span id="e-eon-ts-type"></span>`E_EON_TS_TYPE` | 500 | A timestamp is neither a bigint nor a safe-integer number. |
| <span id="e-eon-param-precision"></span>`E_EON_PARAM_PRECISION` | 500 | A timestamp number is not a safe integer; pass nanosecond timestamps as bigint. |
| <span id="e-eon-value-type"></span>`E_EON_VALUE_TYPE` | 500 | An integer column was given something other than a safe integer or a bigint. |
| <span id="e-eon-value-range"></span>`E_EON_VALUE_RANGE` | 500 | A value is outside its column type's range; the connector would truncate it silently. |
| <span id="e-eon-template"></span>`E_EON_TEMPLATE` | 500 | The compiler returned no statement for the STMT insert template. |
| <span id="e-eon-literal-insert"></span>`E_EON_LITERAL_INSERT` | 500 | A literal insert for one child table compiled to other than exactly one statement. |
| <span id="e-eon-hydrate-bigint"></span>`E_EON_HYDRATE_BIGINT` | 500 | A bigint or timestamp column came back with a non-integer value. |
| <span id="e-eon-decode"></span>`E_EON_DECODE` | 500 | A server reply or result block does not match the protocol (truncated, unknown type, rows without column metadata); a frame that cannot be trusted closes the connection. |
| <span id="e-eon-timeout"></span>`E_EON_TIMEOUT` | 500 | A request to TDengine got no reply within `timeoutMs`. |
| <span id="e-eon-closed"></span>`E_EON_CLOSED` | 500 | The TDengine connection closed while a request was waiting, or a request was sent on a closed one. |
| <span id="e-eon-connect"></span>`E_EON_CONNECT` | 500 | The WebSocket to taosAdapter could not be opened: a bad URL, a refused connection, or no handshake within the deadline. |
| <span id="e-eon-schemaless-schema"></span>`E_EON_SCHEMALESS_SCHEMA` | 500 | A field type has no line-protocol form. |
| <span id="e-eon-schemaless-field"></span>`E_EON_SCHEMALESS_FIELD` | 500 | A line-protocol field value is outside its type's range. |
| <span id="e-eon-schemaless-tag"></span>`E_EON_SCHEMALESS_TAG` | 500 | A line-protocol tag value cannot be written. |
| <span id="e-eon-schemaless-empty-tag"></span>`E_EON_SCHEMALESS_EMPTY_TAG` | 500 | A line-protocol tag value is empty. |
| <span id="e-eon-schemaless-no-fields"></span>`E_EON_SCHEMALESS_NO_FIELDS` | 500 | A line-protocol point has no field. |
| <span id="e-eon-schemaless-measurement"></span>`E_EON_SCHEMALESS_MEASUREMENT` | 500 | The super-table (measurement) name is empty. |
| <span id="e-eon-schemaless-control-char"></span>`E_EON_SCHEMALESS_CONTROL_CHAR` | 500 | A line-protocol name or value holds a line terminator or control character; it is refused, not escaped. |
| <span id="e-eon-invalid-value"></span>`E_EON_INVALID_VALUE` | 500 | `where()` with one argument takes a callback that fills a group. |
| <span id="e-eon-empty-where-group"></span>`E_EON_EMPTY_WHERE_GROUP` | 500 | A `where(callback)` group added no predicate. |
| <span id="e-eon-invalid-limit"></span>`E_EON_INVALID_LIMIT` | 500 | `limit()` was given a value that is not a non-negative integer. |
| <span id="e-eon-invalid-offset"></span>`E_EON_INVALID_OFFSET` | 500 | `offset()` was given a value that is not a non-negative integer. |
| <span id="e-eon-compile-empty"></span>`E_EON_COMPILE_EMPTY` | 500 | The compiler returned no SQL statement. |
| <span id="e-eon-unexpected-params"></span>`E_EON_UNEXPECTED_PARAMS` | 500 | A time-series query compiled with bound parameters where literal SQL is expected. |
| <span id="e-eon-internal"></span>`E_EON_INTERNAL` | 500 | An invariant inside eon broke, or the Rust compiler panicked or could not serialize what it compiled: always a bug in eon itself. |
| <span id="e-eon-alter-db-one-option"></span>`E_EON_ALTER_DB_ONE_OPTION` | 500 | `alterDatabase()` takes exactly one option. |
| <span id="e-eon-migration-invalid"></span>`E_EON_MIGRATION_INVALID` | 500 | The migrations tracking table holds an unreadable `executed_at`. |
| <span id="e-eon-migration-locked"></span>`E_EON_MIGRATION_LOCKED` | 500 | Another run holds the migration lock. |
| <span id="e-eon-factory-state"></span>`E_EON_FACTORY_STATE` | 500 | A factory state is not defined. |
| <span id="e-eon-fake-unsupported"></span>`E_EON_FAKE_UNSUPPORTED` | 500 | `FakeEonConnection` answers only flat SELECTs; windowed or aggregate SQL needs a live TDengine. |
| <span id="e-eon-test-identifier"></span>`E_EON_TEST_IDENTIFIER` | 500 | A test cleanup helper was given a name that is not a plain identifier. |
| <span id="e-eon-napi-not-found"></span>`E_EON_NAPI_NOT_FOUND` | 500 | The eon query compiler binary is not found. |
| <span id="e-eon-napi-unsupported"></span>`E_EON_NAPI_UNSUPPORTED` | 500 | There is no eon query compiler binary for this platform. |
| <span id="e-eon-invalid-duration"></span>`E_EON_INVALID_DURATION` | 500 | A duration is not a positive integer followed by one unit. |
| <span id="e-eon-invalid-fill"></span>`E_EON_INVALID_FILL` | 500 | A `FILL` mode is not one TDengine knows, or lacks its value. |
| <span id="e-eon-fill-requires-interval"></span>`E_EON_FILL_REQUIRES_INTERVAL` | 500 | `FILL` was used without `INTERVAL`. |
| <span id="e-eon-sliding-requires-interval"></span>`E_EON_SLIDING_REQUIRES_INTERVAL` | 500 | `SLIDING` was used without `INTERVAL`. |
| <span id="e-eon-offset-requires-limit"></span>`E_EON_OFFSET_REQUIRES_LIMIT` | 500 | `OFFSET` was used without `LIMIT`. |
| <span id="e-eon-invalid-order-direction"></span>`E_EON_INVALID_ORDER_DIRECTION` | 500 | An order direction is neither `asc` nor `desc`. |
| <span id="e-eon-invalid-pseudo-column"></span>`E_EON_INVALID_PSEUDO_COLUMN` | 500 | A pseudo-column is not one eon allows. |
| <span id="e-eon-invalid-select"></span>`E_EON_INVALID_SELECT` | 500 | A select expression cannot be compiled. |
| <span id="e-eon-invalid-select-function"></span>`E_EON_INVALID_SELECT_FUNCTION` | 500 | A select names a function eon does not allow. |
| <span id="e-eon-invalid-db-option"></span>`E_EON_INVALID_DB_OPTION` | 500 | A database option value is invalid. |
| <span id="e-eon-unknown-db-option"></span>`E_EON_UNKNOWN_DB_OPTION` | 500 | A database option is not alterable (`KEEP`, `BUFFER`, `WAL_LEVEL`, `CACHEMODEL`, `REPLICA`, `MINROWS`). |
| <span id="e-eon-immutable-db-option"></span>`E_EON_IMMUTABLE_DB_OPTION` | 500 | A database option is fixed at CREATE and cannot be altered. |
| <span id="e-eon-invalid-ttl"></span>`E_EON_INVALID_TTL` | 500 | A child-table TTL is not a non-negative whole number of days. |
| <span id="e-eon-invalid-wal-level"></span>`E_EON_INVALID_WAL_LEVEL` | 500 | A `WAL_LEVEL` is not one TDengine accepts. |
| <span id="e-eon-invalid-cachemodel"></span>`E_EON_INVALID_CACHEMODEL` | 500 | A `CACHEMODEL` is not one TDengine accepts. |
| <span id="e-eon-invalid-precision"></span>`E_EON_INVALID_PRECISION` | 500 | A database precision is not `ms`, `us` or `ns`. |
| <span id="e-eon-keep-too-small"></span>`E_EON_KEEP_TOO_SMALL` | 500 | `KEEP` is less than three times `DURATION`. |
| <span id="e-ts-required"></span>`E_TS_REQUIRED` | 500 | A super-table's first column is not a TIMESTAMP. |
| <span id="e-tags-required"></span>`E_TAGS_REQUIRED` | 500 | A super-table declares no tag, or an INSERT that auto-creates a child table (`using`), or its STMT template, has no tag. |
| <span id="e-json-tag-rule"></span>`E_JSON_TAG_RULE` | 500 | JSON is tag-only and must be the only tag. |
| <span id="e-type-not-taggable"></span>`E_TYPE_NOT_TAGGABLE` | 500 | A type that cannot be a tag (DECIMAL) is used as one. |
| <span id="e-length-required"></span>`E_LENGTH_REQUIRED` | 500 | A type that needs a length (`BINARY(n)`, `NCHAR(n)`…) was given none. |
| <span id="e-name-collision"></span>`E_NAME_COLLISION` | 500 | A name is listed more than once across the STMT template's tag and value columns. |
| <span id="e-invalid-clause-type"></span>`E_INVALID_CLAUSE_TYPE` | 500 | A WHERE connector is neither `and` nor `or`. |
| <span id="e-invalid-where-group"></span>`E_INVALID_WHERE_GROUP` | 500 | A WHERE group is empty, or also names a column. |
| <span id="e-invalid-where-value"></span>`E_INVALID_WHERE_VALUE` | 500 | A WHERE value (or list element) is not a scalar, or an `IN` value is not a list. |
| <span id="e-unsafe-identifier-eon"></span>`E_UNSAFE_IDENTIFIER` | 500 | The compiler refused an identifier. |
| <span id="e-unsafe-literal-eon"></span>`E_UNSAFE_LITERAL` | 500 | The compiler refused a literal value. |
| <span id="e-unsafe-operator"></span>`E_UNSAFE_OPERATOR` | 500 | The compiler refused an operator. |
| <span id="e-eon-not-booted"></span>`E_EON_NOT_BOOTED` | 500 | An eon connection (the `eon` token, `eon:<name>`, or `@c9up/eon/services/connection`) was used before `EonProvider.boot()` opened it. |
| <span id="e-eon-already-booted"></span>`E_EON_ALREADY_BOOTED` | 500 | `EonProvider.boot()` ran a second time while its connections are open; call `shutdown()` first. |
| <span id="e-eon-boot-failed"></span>`E_EON_BOOT_FAILED` | 500 | `EonProvider.boot()` could not open one or more configured connections; `cause` holds the first failure. |
| <span id="e-eon-unknown-connection"></span>`E_EON_UNKNOWN_CONNECTION` | 500 | The default connection named in `config/timeseries.ts` is not among its `connections`. |
| <span id="e-eon-no-database"></span>`E_EON_NO_DATABASE` | 500 | `createDatabase` is set but no `database` is configured. |
| <span id="e-eon-test-url"></span>`E_EON_TEST_URL` | 500 | `connectTestEon()` was called without `EON_TEST_URL`. |
| <span id="e-eon-server-error"></span>`E_EON_SERVER_ERROR` | 500 | The TDengine server refused a request (a bad statement, a missing table, bad credentials); `taosCode` holds TDengine's numeric error code. |
| <span id="e-eon-no-topic"></span>`E_EON_NO_TOPIC` | 500 | `subscribe()` was given no topic; the server would accept it and deliver nothing. |
| <span id="e-eon-seek-no-offset"></span>`E_EON_SEEK_NO_OFFSET` | 500 | `seek()` was given a partition without an `offset`. |
| <span id="e-eon-invalid-insert"></span>`E_EON_INVALID_INSERT` | 500 | An INSERT reached the compiler with no column, no row, a row whose width differs from the column list, or `tags` without `using`. |
| <span id="e-eon-alter-empty"></span>`E_EON_ALTER_EMPTY` | 500 | An ALTER STABLE reached the compiler with no change. |
| <span id="e-unsupported-client-eon"></span>`E_UNSUPPORTED_CLIENT` | 500 | The compiler was asked for a dialect other than `tdengine`. |
| <span id="e-eon-invalid-spec"></span>`E_EON_INVALID_SPEC` | 500 | The statement the compiler received does not parse. Eon builds every spec itself, so this points at an eon bug or at a spec built by hand. |

## Ephemeris Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-ephemeris-invalid-node"></span>`E_EPHEMERIS_INVALID_NODE` | 500 | A structured-data node has no `@type`. |
| <span id="e-ephemeris-invalid-url"></span>`E_EPHEMERIS_INVALID_URL` | 500 | A URL is not absolute. |
| <span id="e-ephemeris-invalid-date"></span>`E_EPHEMERIS_INVALID_DATE` | 500 | A date is not ISO 8601. |
| <span id="e-ephemeris-invalid-value"></span>`E_EPHEMERIS_INVALID_VALUE` | 500 | A value cannot be serialised (an invalid `Date`…). |
| <span id="e-ephemeris-invalid-price"></span>`E_EPHEMERIS_INVALID_PRICE` | 500 | A price is neither a number nor digits with a decimal point. |
| <span id="e-ephemeris-invalid-currency"></span>`E_EPHEMERIS_INVALID_CURRENCY` | 500 | A currency is not an ISO 4217 code. |
| <span id="e-ephemeris-missing-required"></span>`E_EPHEMERIS_MISSING_REQUIRED` | 500 | A type lacks a property search engines require for it. |
| <span id="e-ephemeris-unsafe-key"></span>`E_EPHEMERIS_UNSAFE_KEY` | 500 | A key structured data may not use (such as `__proto__`). |
| <span id="e-ephemeris-id-taken"></span>`E_EPHEMERIS_ID_TAKEN` | 500 | An `@id` generated for one node was given to another. |
| <span id="e-ephemeris-slot-taken"></span>`E_EPHEMERIS_SLOT_TAKEN` | 500 | A node slot is already taken by another node. |
| <span id="e-ephemeris-cycle"></span>`E_EPHEMERIS_CYCLE` | 500 | A node contains itself. |
| <span id="e-ephemeris-too-deep"></span>`E_EPHEMERIS_TOO_DEEP` | 500 | The data is nested deeper than the allowed depth. |
| <span id="e-ephemeris-too-long"></span>`E_EPHEMERIS_TOO_LONG` | 500 | A text value is longer than the allowed length. |
| <span id="e-ephemeris-too-many"></span>`E_EPHEMERIS_TOO_MANY` | 500 | A list (a breadcrumb…) has more items than allowed. |

## Flare Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-runtime-exception"></span>`E_RUNTIME_EXCEPTION` | 500 | `RuntimeException`: a failure at run time that no more specific error describes. |
| <span id="e-invalid-arguments-exception"></span>`E_INVALID_ARGUMENTS_EXCEPTION` | 500 | `InvalidArgumentsException`: a function received arguments it cannot work with. |

## Goldstone Errors

The mail engine's limits are refused before the message is parsed further.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-goldstone-message-too-large"></span>`E_GOLDSTONE_MESSAGE_TOO_LARGE` | 422 | A message is over the size limit; refused before download when the server announces its size. |
| <span id="e-goldstone-not-a-message"></span>`E_GOLDSTONE_NOT_A_MESSAGE` | 422 | The bytes are not a mail message. |
| <span id="e-goldstone-too-many-parts"></span>`E_GOLDSTONE_TOO_MANY_PARTS` | 422 | A message has more MIME parts than allowed. |
| <span id="e-goldstone-too-deep"></span>`E_GOLDSTONE_TOO_DEEP` | 422 | MIME parts are nested deeper than allowed. |
| <span id="e-goldstone-too-many-headers"></span>`E_GOLDSTONE_TOO_MANY_HEADERS` | 422 | A message has more headers than allowed. |
| <span id="e-goldstone-headers-too-large"></span>`E_GOLDSTONE_HEADERS_TOO_LARGE` | 422 | A header block is over `maxHeaderBytes`, or the header blocks of a message's parts are over `maxPartHeaderBytes` together. |
| <span id="e-goldstone-missing-boundaries"></span>`E_GOLDSTONE_MISSING_BOUNDARIES` | 422 | A multipart message declares boundaries that never appear. |
| <span id="e-goldstone-boundary-too-long"></span>`E_GOLDSTONE_BOUNDARY_TOO_LONG` | 422 | A multipart boundary is longer than allowed. |
| <span id="e-goldstone-too-many-attachments"></span>`E_GOLDSTONE_TOO_MANY_ATTACHMENTS` | 422 | A message has more attachments than allowed. |
| <span id="e-goldstone-attachment-too-large"></span>`E_GOLDSTONE_ATTACHMENT_TOO_LARGE` | 422 | An attachment is over the size limit. |
| <span id="e-goldstone-html-too-large"></span>`E_GOLDSTONE_HTML_TOO_LARGE` | 422 | An HTML body is over the size limit. |
| <span id="e-goldstone-html-too-deep"></span>`E_GOLDSTONE_HTML_TOO_DEEP` | 422 | An HTML body nests more than 1000 elements deep, measured on the tree the HTML parser builds. |
| <span id="e-goldstone-html-too-complex"></span>`E_GOLDSTONE_HTML_TOO_COMPLEX` | 422 | An HTML body builds a tree out of proportion to its markup: too many nodes, or too much work to place them. |
| <span id="e-goldstone-dns-unavailable"></span>`E_GOLDSTONE_DNS_UNAVAILABLE` | 500 | An authenticity check needed DNS and DNS failed. |
| <span id="e-goldstone-invalid-envelope"></span>`E_GOLDSTONE_INVALID_ENVELOPE` | 500 | The envelope given to an authenticity check is invalid (an address that is not an IP…). |
| <span id="e-goldstone-engine"></span>`E_GOLDSTONE_ENGINE` | 500 | The engine failed without one of the codes above. |
| <span id="e-goldstone-native-required"></span>`E_GOLDSTONE_NATIVE_REQUIRED` | 500 | The Rust mail engine is not loaded. |
| <span id="e-goldstone-invalid-limits"></span>`E_GOLDSTONE_INVALID_LIMITS` | 500 | A parsing limit is not a positive integer under 2^32. |
| <span id="e-goldstone-invalid-options"></span>`E_GOLDSTONE_INVALID_OPTIONS` | 500 | An authenticity check option is not a positive integer under 2^32. |
| <span id="e-goldstone-invalid-config"></span>`E_GOLDSTONE_INVALID_CONFIG` | 500 | The inbox config is invalid (no mailbox declared…). |
| <span id="e-goldstone-insecure-connection"></span>`E_GOLDSTONE_INSECURE_CONNECTION` | 500 | A mailbox would connect without TLS. Set `starttls: true`, or `allowInsecure` for a local test server. |
| <span id="e-goldstone-unknown-mailbox"></span>`E_GOLDSTONE_UNKNOWN_MAILBOX` | 500 | A mailbox name is not configured. |
| <span id="e-goldstone-uidvalidity-changed"></span>`E_GOLDSTONE_UIDVALIDITY_CHANGED` | 500 | A watched folder renumbered its messages; watching resumes from the newest. |
| <span id="e-goldstone-missing-config"></span>`E_GOLDSTONE_MISSING_CONFIG` | 500 | `GoldstoneProvider` registered with no `config/inbox.ts`. |
| <span id="e-goldstone-not-booted"></span>`E_GOLDSTONE_NOT_BOOTED` | 500 | The `services/main` inbox was used before `GoldstoneProvider` registered or `setInbox()` was called. |
| <span id="e-goldstone-too-many-addresses"></span>`E_GOLDSTONE_TOO_MANY_ADDRESSES` | 422 | A message's address headers hold more addresses than `maxAddresses`, counted before the message is parsed. |

## Helix Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-helix-assertion-failed"></span>`E_HELIX_ASSERTION_FAILED` | 500 | An `expect()` or `assert` check failed (`AssertionError`). |
| <span id="e-helix-timeout"></span>`E_HELIX_TIMEOUT` | 500 | A test or hook did not settle within its timeout. Also the code of a file error when the file exceeds `--file-timeout`. |
| <span id="e-helix-test-aborted"></span>`E_HELIX_TEST_ABORTED` | 500 | The running test called `meta.abort(message)`. |
| <span id="e-helix-no-active-test"></span>`E_HELIX_NO_ACTIVE_TEST` | 500 | A test-only helper (`getActiveTestOrFail()`, `time.freeze`/`travel`, `override()`, a `test.macro` function) was called outside a running test. |
| <span id="e-helix-no-active-container"></span>`E_HELIX_NO_ACTIVE_CONTAINER` | 500 | `override()` was called before `useContainer()`. |
| <span id="e-helix-async-describe"></span>`E_HELIX_ASYNC_DESCRIBE` | 500 | A `describe` body returned a Promise; await the setup in `beforeAll` instead. |
| <span id="e-helix-nested-group"></span>`E_HELIX_NESTED_GROUP` | 500 | A `test.group()` was declared inside another group. |
| <span id="e-helix-invalid-time"></span>`E_HELIX_INVALID_TIME` | 500 | A time value cannot be used: a non-finite or out-of-range epoch, an unreadable date, a fractional month or year, an unknown unit, or a negative `advanceTimersByTime`. |
| <span id="e-helix-fake-timers-not-installed"></span>`E_HELIX_FAKE_TIMERS_NOT_INSTALLED` | 500 | A `vi` timer control was called before `vi.useFakeTimers()`. |
| <span id="e-helix-timer-loop"></span>`E_HELIX_TIMER_LOOP` | 500 | Draining fake timers exceeded its iteration cap: a timer keeps rescheduling itself. |
| <span id="e-helix-spy-no-property"></span>`E_HELIX_SPY_NO_PROPERTY` | 500 | `vi.spyOn()` targets a property the object does not have. |
| <span id="e-helix-spy-not-function"></span>`E_HELIX_SPY_NOT_FUNCTION` | 500 | `vi.spyOn()` targets a value that is not a function; pass `{ accessor }` for a getter or setter. |
| <span id="e-helix-spy-no-accessor"></span>`E_HELIX_SPY_NO_ACCESSOR` | 500 | `vi.spyOn()` asked for a getter or setter the property does not define. |
| <span id="e-helix-already-spied"></span>`E_HELIX_ALREADY_SPIED` | 500 | `vi.spyOn()` targets a method that is already a spy; call `mockRestore()` first. |
| <span id="e-helix-runner-not-drivable"></span>`E_HELIX_RUNNER_NOT_DRIVABLE` | 500 | A plugin called `runner.add/start/exec/end()`: the CLI owns discovery and execution. |
| <span id="e-helix-relative-path"></span>`E_HELIX_RELATIVE_PATH` | 500 | `runTestFile()` was given a relative path. |
| <span id="e-helix-invalid-glob"></span>`E_HELIX_INVALID_GLOB` | 500 | An include or exclude glob has an unclosed `{`, `(` or `[`; `cause` holds the regex error. |
| <span id="e-helix-invalid-threads"></span>`E_HELIX_INVALID_THREADS` | 500 | The thread count is not a finite number. |
| <span id="e-helix-invalid-coverage-threshold"></span>`E_HELIX_INVALID_COVERAGE_THRESHOLD` | 500 | A coverage threshold is not a number from 0 to 100, or a diff-coverage threshold names `functions` or `branches` (diff coverage is line-only). |
| <span id="e-helix-invalid-diff-coverage"></span>`E_HELIX_INVALID_DIFF_COVERAGE` | 500 | Diff coverage is enabled without coverage, or its `cwd` and `coverage.root` are disjoint. |
| <span id="e-helix-invalid-watch-options"></span>`E_HELIX_INVALID_WATCH_OPTIONS` | 500 | Watch mode got an empty `include` or a `debounceMs` out of range. |
| <span id="e-helix-watch-failed"></span>`E_HELIX_WATCH_FAILED` | 500 | Watch mode could not watch its root directory; `cause` holds the `fs.watch` error. |
| <span id="e-helix-native-required"></span>`E_HELIX_NATIVE_REQUIRED` | 500 | The helix native binary is missing, failed to load, or is stale, or the platform has none. |
| <span id="e-helix-internal"></span>`E_HELIX_INTERNAL` | 500 | An internal invariant of helix broke: a bug in helix, worth reporting. The native engine's refusals arrive under this code. |
| <span id="e-helix-worker-failed"></span>`E_HELIX_WORKER_FAILED` | 500 | Not thrown: the `code` of a file error when the worker could not start, sent a broken frame, exited without a result, or exited in a way its result does not explain. |
| <span id="e-helix-unexpected-only"></span>`E_HELIX_UNEXPECTED_ONLY` | 500 | Not thrown: the `code` of the error of a test that a `.only` or a `.pin()` selects in a run that does not allow them (under CI, or with `--allow-only=false`). |
| <span id="e-helix-no-test-suite"></span>`E_HELIX_NO_TEST_SUITE` | 500 | The `code` of the file error for a file that declares no test, unless `--pass-with-no-tests` is set. |

## Helix Plugin Errors

Raised by `@c9up/helix-plugin-ream`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-helix-plugin-ream-unknown-suite"></span>`E_HELIX_PLUGIN_REAM_UNKNOWN_SUITE` | 500 | A suite name was asked for but the rc file does not declare it. |
| <span id="e-helix-plugin-ream-suite-configure-unreachable"></span>`E_HELIX_PLUGIN_REAM_SUITE_CONFIGURE_UNREACHABLE` | 500 | A suite declares `configure` and the runner has no module path to re-import it in each worker. |
| <span id="e-helix-plugin-ream-no-server"></span>`E_HELIX_PLUGIN_REAM_NO_SERVER` | — | `apiClient()` was given neither `testUtils` nor `boot`. |
| <span id="e-helix-plugin-ream-server-not-started"></span>`E_HELIX_PLUGIN_REAM_SERVER_NOT_STARTED` | — | No server is running for the suite. Add the hook that starts it. |
| <span id="e-helix-plugin-ream-no-test-client"></span>`E_HELIX_PLUGIN_REAM_NO_TEST_CLIENT` | — | No client is in play. Add `apiClient()` to the plugins in `tests/bootstrap.ts`. |

## Inker Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-inker-template-not-found"></span>`E_INKER_TEMPLATE_NOT_FOUND` | 500 | No template has this name. |
| <span id="e-inker-parse-error"></span>`E_INKER_PARSE_ERROR` | — | The template cannot be parsed. |
| <span id="e-inker-unknown-identifier"></span>`E_INKER_UNKNOWN_IDENTIFIER` | — | An expression names an identifier that is not in scope. |
| <span id="e-inker-invalid-path"></span>`E_INKER_INVALID_PATH` | 500 | A template path is invalid (traversal, absolute path…). |
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
| <span id="e-inker-disk-collision"></span>`E_INKER_DISK_COLLISION` | 500 | Two disks are mounted under the same name. |
| <span id="e-inker-template-collision"></span>`E_INKER_TEMPLATE_COLLISION` | 500 | Two templates are registered under the same name. |
| <span id="e-inker-invalid-expression"></span>`E_INKER_INVALID_EXPRESSION` | 500 | An expression cannot be evaluated. |
| <span id="e-inker-invalid-iterable"></span>`E_INKER_INVALID_ITERABLE` | — | `@each` was given something that is not iterable. |
| <span id="e-inker-helper-throw"></span>`E_INKER_HELPER_THROW` | 500 | A helper threw during the render. |
| <span id="e-inker-async-not-supported"></span>`E_INKER_ASYNC_NOT_SUPPORTED` | — | A construct that renders synchronously used `await`. |
| <span id="e-inker-render-depth"></span>`E_INKER_RENDER_DEPTH` | — | The render nested too deep. |
| <span id="e-inker-dump-die"></span>`E_INKER_DUMP_DIE` | — | `@dd()` stopped the render and printed its value. |
| <span id="e-inker-invalid-json-ld"></span>`E_INKER_INVALID_JSON_LD` | 500 | A value given to the JSON-LD helper cannot be held in JSON-LD. |
| <span id="e-inker-template-error"></span>`E_INKER_TEMPLATE_ERROR` | — | A template raised an error itself. |
| <span id="e-inker-engine-missing"></span>`E_INKER_ENGINE_MISSING` | 500 | A template was rendered through the inker singleton before `InkerProvider` built the engine. |
| <span id="e-inker-napi-required"></span>`E_INKER_NAPI_REQUIRED` | 500 | The native inker engine is missing or cannot be loaded; the message names the platform package to install. |
| <span id="e-inker-not-booted"></span>`E_INKER_NOT_BOOTED` | 500 | The renderer (`@c9up/inker/services/main`, or the container's `InkerRenderer`) was used before `InkerProvider.start()` ran or `setInker()` seated one. |
| <span id="e-inker-invalid-config"></span>`E_INKER_INVALID_CONFIG` | 500 | `config.inker` holds a value the provider cannot use: a `cacheMode` other than `mtime`, `never` or `auto`, or an `additionalHelpers` entry that is not a function. |
| <span id="e-inker-invalid-helper-argument"></span>`E_INKER_INVALID_HELPER_ARGUMENT` | 500 | A view helper (`t`, `url`, `route`, `signedRoute`, `config`, `formAttributes`, `asset`) got an argument it cannot use: a name or key that is not a string, or route params that are not a plain object of finite, non-null primitives. |
| <span id="e-inker-outside-render"></span>`E_INKER_OUTSIDE_RENDER` | 500 | A helper that reads the request was called outside `inker.render()`. |

## Lumen Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-lumen-invalid-column"></span>`E_LUMEN_INVALID_COLUMN` | 500 | A table was asked for a column shape it does not have. |
| <span id="e-lumen-task-no-result"></span>`E_LUMEN_TASK_NO_RESULT` | 500 | A task callback returned nothing and did not mark the task itself. Found on the outcome's `error`, not thrown. |
| <span id="e-lumen-task-failed"></span>`E_LUMEN_TASK_FAILED` | 500 | A task failed with something that is not an `Error` (a string, a thrown value, a returned `{ message, isError: true }`); `cause` holds the original value. |
| <span id="e-lumen-internal"></span>`E_LUMEN_INTERNAL` | 500 | An invariant inside lumen broke; a bug to report. |

## Nebula Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-nebula-invalid-config"></span>`E_NEBULA_INVALID_CONFIG` | 500 | `config/nebula.ts` has no default export, or a `paths` / `language` entry of the wrong shape. |
| <span id="e-nebula-sources-not-built"></span>`E_NEBULA_SOURCES_NOT_BUILT` | 500 | `nebula add` was asked for a language whose sources the package has not built (`dist/` for JavaScript). |
| <span id="e-nebula-invalid-registry"></span>`E_NEBULA_INVALID_REGISTRY` | 500 | The installed package's `registry.json` is not a nebula registry. |
| <span id="e-nebula-unknown-component"></span>`E_NEBULA_UNKNOWN_COMPONENT` | 500 | `nebula add` was given a component the registry does not hold. |
| <span id="e-nebula-unknown-adapter"></span>`E_NEBULA_UNKNOWN_ADAPTER` | 500 | `configure --adapter` named an adapter other than `tailwind`, `unocss` or `css`. |

## Neutrino Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-neutrino-invalid-descriptor"></span>`E_NEUTRINO_INVALID_DESCRIPTOR` | 500 | The bytes are not a valid `FileDescriptorSet`. |
| <span id="e-neutrino-duplicate-type"></span>`E_NEUTRINO_DUPLICATE_TYPE` | 500 | Two descriptors declare the same type differently. |
| <span id="e-neutrino-unknown-type"></span>`E_NEUTRINO_UNKNOWN_TYPE` | 500 | No message or enum type of this name is loaded. |
| <span id="e-neutrino-unknown-method"></span>`E_NEUTRINO_UNKNOWN_METHOD` | 500 | No method of this path is loaded. |
| <span id="e-neutrino-invalid-message"></span>`E_NEUTRINO_INVALID_MESSAGE` | 400 | The bytes are not a valid message of the type. |
| <span id="e-neutrino-invalid-metadata"></span>`E_NEUTRINO_INVALID_METADATA` | 500 | Binary gRPC metadata is malformed; the server answers INTERNAL. |
| <span id="e-neutrino-grpc-status"></span>`E_NEUTRINO_GRPC_STATUS` | 500 | A method answers a gRPC status instead of a reply; its message goes to the client as the status details. |
| <span id="e-neutrino-duplicate-service"></span>`E_NEUTRINO_DUPLICATE_SERVICE` | 500 | A service is registered twice. |
| <span id="e-neutrino-invalid-implementation"></span>`E_NEUTRINO_INVALID_IMPLEMENTATION` | 500 | A method implementation is not a function. |
| <span id="e-neutrino-streaming-unsupported"></span>`E_NEUTRINO_STREAMING_UNSUPPORTED` | 500 | A streaming method was registered; only unary methods are served. |
| <span id="e-neutrino-invalid-option"></span>`E_NEUTRINO_INVALID_OPTION` | 500 | A size option is not a whole number of bytes, or `-1` for no limit. |
| <span id="e-neutrino-grpc-unsupported"></span>`E_NEUTRINO_GRPC_UNSUPPORTED` | 500 | The server has no `grpc()` method. Upgrade `@c9up/ream`. |
| <span id="e-neutrino-invalid-config"></span>`E_NEUTRINO_INVALID_CONFIG` | 500 | `defineConfig` loads no schema, or `config/protobuf.ts` does not export `defineConfig`'s shape. |
| <span id="e-neutrino-missing-config"></span>`E_NEUTRINO_MISSING_CONFIG` | 500 | `config/protobuf.ts` is missing at boot. |
| <span id="e-neutrino-invalid-binding"></span>`E_NEUTRINO_INVALID_BINDING` | 500 | The container returned something else for the `Protobuf` or `GrpcServices` token. |
| <span id="e-neutrino-not-booted"></span>`E_NEUTRINO_NOT_BOOTED` | 500 | `@c9up/neutrino/services/main` or `services/grpc` was used before `NeutrinoProvider` booted. |
| <span id="e-neutrino-invalid-reply"></span>`E_NEUTRINO_INVALID_REPLY` | 500 | A method, or an interceptor, returned something other than a message object; the call is answered `INTERNAL` and the error goes to `onError`. |
| <span id="e-neutrino-next-called-twice"></span>`E_NEUTRINO_NEXT_CALLED_TWICE` | 500 | An interceptor called `next()` more than once; the call is answered `INTERNAL`. |
| <span id="e-neutrino-verifier-failed"></span>`E_NEUTRINO_VERIFIER_FAILED` | 500 | The `bearerAuth` token verifier itself failed; the call is answered `INTERNAL`. |

## Nova Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-nova-invalid-subscription"></span>`E_NOVA_INVALID_SUBSCRIPTION` | 400 | The subscribe or unsubscribe body is not a valid `PushSubscription`. |
| <span id="e-nova-subscription-conflict"></span>`E_NOVA_SUBSCRIPTION_CONFLICT` | 409 | Another request was writing the same endpoint at the same time. Retry the subscribe. |
| <span id="e-nova-subscription-not-found"></span>`E_NOVA_SUBSCRIPTION_NOT_FOUND` | 404 | The user has no such subscription. |
| <span id="e-nova-missing-user"></span>`E_NOVA_MISSING_USER` | 500 | The subscription handler ran without an authenticated user. |
| <span id="e-nova-invalid-user-id"></span>`E_NOVA_INVALID_USER_ID` | 500 | The authenticated user has no usable id (a non-empty string or an integer), or `pushToUser` received an id that is not one. |
| <span id="e-nova-vapid-not-configured"></span>`E_NOVA_VAPID_NOT_CONFIGURED` | 500 | A VAPID key or subject is missing. |
| <span id="e-nova-http-client-missing"></span>`E_NOVA_HTTP_CLIENT_MISSING` | 500 | Sending a push needs the outbound HTTP client of `@c9up/ream`. |
| <span id="e-nova-unknown-store"></span>`E_NOVA_UNKNOWN_STORE` | 500 | The config names a store it does not declare. |
| <span id="e-nova-invalid-table"></span>`E_NOVA_INVALID_TABLE` | 500 | The SQL store's table name is not a plain identifier. |
| <span id="e-nova-invalid-prefix"></span>`E_NOVA_INVALID_PREFIX` | 500 | The Redis store's key prefix contains a space. |
| <span id="e-nova-store-busy"></span>`E_NOVA_STORE_BUSY` | 500 | A subscription changed under every attempt to write it. |
| <span id="e-nova-store-file-unreadable"></span>`E_NOVA_STORE_FILE_UNREADABLE` | 500 | The file store's file is not valid JSON. |
| <span id="e-nova-quasar-missing"></span>`E_NOVA_QUASAR_MISSING` | 500 | A Redis store was configured and `@c9up/quasar` is not installed. |
| <span id="e-nova-redis-incomplete"></span>`E_NOVA_REDIS_INCOMPLETE` | 500 | The quasar connection lacks what nova needs. |
| <span id="e-nova-not-booted"></span>`E_NOVA_NOT_BOOTED` | 500 | `@c9up/nova/services/main` was used before `NovaProvider.boot()` ran. |
| <span id="e-nova-invalid-option"></span>`E_NOVA_INVALID_OPTION` | 500 | A delivery or store option is out of range: `concurrency`, `timeout`, a `pushServices` or `allowHosts` entry, `maxSubscriptionsPerUser`, `maxPerUser`, or a push's `ttl` or `topic`. |
| <span id="e-nova-assertion-failed"></span>`E_NOVA_ASSERTION_FAILED` | 500 | `FakeNova.assertPushed()` or `assertNotPushed()` does not hold. |
| <span id="e-nova-invalid-predicate"></span>`E_NOVA_INVALID_PREDICATE` | 500 | A `FakeNova` assertion was given an empty `containing`, which would match every push. |
| <span id="e-nova-internal"></span>`E_NOVA_INTERNAL` | 500 | An invariant of nova broke (the VAPID key pair Node generated has an unexpected shape). A bug: report it. |
| <span id="e-nova-service-worker-unsupported"></span>`E_NOVA_SERVICE_WORKER_UNSUPPORTED` | 500 | `@c9up/nova/client` ran where there is no `navigator.serviceWorker`. |
| <span id="e-nova-push-subscribe-failed"></span>`E_NOVA_PUSH_SUBSCRIBE_FAILED` | 500 | The browser refused `pushManager.subscribe()`; its error is the `cause`. |
| <span id="e-nova-endpoint-rejected"></span>`E_NOVA_ENDPOINT_REJECTED` | 500 | The subscription route refused `subscribe()` or `unsubscribe()`; `status` and `responseBody` hold its answer. |

## Orbit Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-orbit-no-host"></span>`E_ORBIT_NO_HOST` | 500 | `mount` ran before `useHost` gave orbit a native host, or the module is not orbit's. |
| <span id="e-orbit-commit-failed"></span>`E_ORBIT_COMMIT_FAILED` | 500 | The native host refused a commit; the message carries its report. What the commit carried is sent again with the next one; a scheduled commit's refusal goes to `mount`'s `onError`. |
| <span id="e-orbit-unsupported-element"></span>`E_ORBIT_UNSUPPORTED_ELEMENT` | 500 | An element with no native mapping (`select`, `canvas`, or `text` / a gradient inside an `svg`). |
| <span id="e-orbit-block-in-text"></span>`E_ORBIT_BLOCK_IN_TEXT` | 500 | A block element inside text: native text holds only inline runs. |
| <span id="e-orbit-invalid-motion"></span>`E_ORBIT_INVALID_MOTION` | 500 | `motion=${…}` was not an object of motion values. |
| <span id="e-orbit-invalid-scroll-binding"></span>`E_ORBIT_INVALID_SCROLL_BINDING` | 500 | `scroll-y=${…}` was not a motion value. |
| <span id="e-orbit-invalid-color"></span>`E_ORBIT_INVALID_COLOR` | 500 | A colour orbit cannot read. |
| <span id="e-orbit-insecure-image-url"></span>`E_ORBIT_INSECURE_IMAGE_URL` | 500 | `<img src>` over plain http: images are fetched over https only. Thrown for an address written in the template; for one from data, that image shows nothing and the error goes to `mount`'s `onError`. |
| <span id="e-orbit-image-source"></span>`E_ORBIT_IMAGE_SOURCE` | 500 | `<img src>` with a scheme that is not an image source (`data:`, `javascript:`…), with no scheme (`//host/a.png`) or a `file:` URL that does not decode. Thrown or reported as `E_ORBIT_INSECURE_IMAGE_URL` is. |
| <span id="e-orbit-duplicate-key"></span>`E_ORBIT_DUPLICATE_KEY` | 500 | Two elements of an `each` list share a key. |
| <span id="e-orbit-no-screen"></span>`E_ORBIT_NO_SCREEN` | 500 | `useScreen()` in a component no screen of a stack built. |
| <span id="e-orbit-stack-shown"></span>`E_ORBIT_STACK_SHOWN` | 500 | One stack put in two places: a stack is shown once. |
| <span id="e-orbit-style-table"></span>`E_ORBIT_STYLE_TABLE` | 500 | `useStyles` got something other than a table `ream css:compile` wrote. |
| <span id="e-orbit-insecure-server"></span>`E_ORBIT_INSECURE_SERVER` | 500 | `serverPages({ server })` over plain http to a host that is neither this machine nor the emulator's. |
| <span id="e-orbit-unknown-page"></span>`E_ORBIT_UNKNOWN_PAGE` | 500 | The server named a page the app does not have (`serverPages({ pages })`). |
| <span id="e-orbit-foreign-origin"></span>`E_ORBIT_FOREIGN_ORIGIN` | 500 | A server connection was asked for a path that resolves to another origin. |
| <span id="e-orbit-server-request-failed"></span>`E_ORBIT_SERVER_REQUEST_FAILED` | 500 | The server answered a `json` request with an empty non-2xx response. |
| <span id="e-orbit-no-xhr"></span>`E_ORBIT_NO_XHR` | 500 | Server events need an `XMLHttpRequest`, and the platform has none. |
| <span id="e-orbit-object-url-unavailable"></span>`E_ORBIT_OBJECT_URL_UNAVAILABLE` | 500 | `URL.createObjectURL` was called with no platform `URL` to make blob URLs. A `TypeError`, as the native API raises. |
| <span id="e-orbit-invalid-url"></span>`E_ORBIT_INVALID_URL` | 500 | The standard `URL` was given a URL, or a base, that does not parse. A `TypeError`, as the native API raises. |
| <span id="e-orbit-unsupported-encoding"></span>`E_ORBIT_UNSUPPORTED_ENCODING` | 500 | The standard `TextDecoder` was given an encoding label other than UTF-8's. A `RangeError`, as the native API raises. |
| <span id="e-orbit-invalid-decoder-input"></span>`E_ORBIT_INVALID_DECODER_INPUT` | 500 | `TextDecoder.decode` was given something that is not an `ArrayBuffer` or a view on one. A `TypeError`, as the native API raises. |
| <span id="e-orbit-invalid-encoded-data"></span>`E_ORBIT_INVALID_ENCODED_DATA` | 500 | A `fatal` `TextDecoder` met bytes that are not valid UTF-8. A `TypeError`, as the native API raises. |
| <span id="e-orbit-internal"></span>`E_ORBIT_INTERNAL` | 500 | An invariant inside orbit broke: a bug in orbit. |
| <span id="e-orbit-tree-too-deep"></span>`E_ORBIT_TREE_TOO_DEEP` | 500 | The views nest more than 100 levels deep: the host lays the tree out on the JS thread's stack, so it refuses the commit before layout. What the commit carried is sent again with the next one. |
| <span id="e-orbit-svg-value"></span>`E_ORBIT_SVG_VALUE` | 500 | A value of an `<svg>` the host cannot read (a `NaN` length, unreadable path data, `points` or `transform`). That shape is left out and the rest drawn; reported to `mount`'s `onError`, never thrown. |

## Orbit Clipboard Errors

Raised by `@c9up/orbit-clipboard`, the same in the browser and on a phone.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-orbit-clipboard-unavailable"></span>`E_ORBIT_CLIPBOARD_UNAVAILABLE` | 500 | No clipboard to reach: the server, an insecure page, or an app built without the native module. |
| <span id="e-orbit-clipboard-denied"></span>`E_ORBIT_CLIPBOARD_DENIED` | 500 | The platform refused: no permission, or the page or app was not in focus. |

## Orbit Secure Store Errors

Raised by `@c9up/orbit-secure-store`. A cancelled biometric check is not a failed one.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-orbit-secure-store-unavailable"></span>`E_ORBIT_SECURE_STORE_UNAVAILABLE` | 500 | No secure store here: the browser, the server, or an app built without the module. |
| <span id="e-orbit-secure-store-invalid-key"></span>`E_ORBIT_SECURE_STORE_INVALID_KEY` | 500 | A key that is not 1 to 128 of `A-Z a-z 0-9 . _ -`. |
| <span id="e-orbit-secure-store-no-biometrics"></span>`E_ORBIT_SECURE_STORE_NO_BIOMETRICS` | 500 | `requireAuthentication` on a phone with no strong biometric enrolled. |
| <span id="e-orbit-secure-store-auth-cancelled"></span>`E_ORBIT_SECURE_STORE_AUTH_CANCELLED` | 500 | The user dismissed the biometric prompt. |
| <span id="e-orbit-secure-store-auth-failed"></span>`E_ORBIT_SECURE_STORE_AUTH_FAILED` | 500 | The biometric check failed for good: too many attempts, a lockout, a hardware error. |
| <span id="e-orbit-secure-store-invalidated"></span>`E_ORBIT_SECURE_STORE_INVALIDATED` | 500 | The key behind the value is gone (a new biometric enrolled, the app's data restored), and the value with it. |
| <span id="e-orbit-secure-store-failed"></span>`E_ORBIT_SECURE_STORE_FAILED` | 500 | Anything else the platform reported; the error never carries the value. |

## Parsec Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-parsec-invalid-name"></span>`E_PARSEC_INVALID_NAME` | 500 | A metric or label name is not valid. |
| <span id="e-parsec-invalid-instrument"></span>`E_PARSEC_INVALID_INSTRUMENT` | 500 | An instrument is declared with options it cannot have. |
| <span id="e-parsec-instrument-conflict"></span>`E_PARSEC_INSTRUMENT_CONFLICT` | 500 | A metric name is already declared with a different type, help or label set. |
| <span id="e-parsec-invalid-measurement"></span>`E_PARSEC_INVALID_MEASUREMENT` | 500 | A measurement is not a finite number. |
| <span id="e-parsec-invalid-label-value"></span>`E_PARSEC_INVALID_LABEL_VALUE` | 500 | A label value is neither a string nor a finite number. |
| <span id="e-parsec-undeclared-label"></span>`E_PARSEC_UNDECLARED_LABEL` | 500 | A measurement was given a label the metric does not declare. |
| <span id="e-parsec-unknown-exporter"></span>`E_PARSEC_UNKNOWN_EXPORTER` | 500 | An exporter name is not declared. |
| <span id="e-parsec-unprotected-endpoint"></span>`E_PARSEC_UNPROTECTED_ENDPOINT` | 500 | The metrics endpoint would be served without protection. Set a token, or `public: true` deliberately. |
| <span id="e-parsec-empty-token"></span>`E_PARSEC_EMPTY_TOKEN` | 500 | The metrics endpoint token is empty, which would match a request without credentials. |
| <span id="e-parsec-invalid-config"></span>`E_PARSEC_INVALID_CONFIG` | 500 | `config/metrics.ts` does not export `defineConfig({ default, exporters })`. |
| <span id="e-parsec-invalid-binding"></span>`E_PARSEC_INVALID_BINDING` | 500 | The container answers something other than a `MetricsManager` for the `MetricsManager` token. |
| <span id="e-parsec-not-booted"></span>`E_PARSEC_NOT_BOOTED` | 500 | The `metrics` service or the HTTP middleware was used before `ParsecProvider` bound the manager, or before `setMetrics()`. |

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

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-photon-missing-config"></span>`E_PHOTON_MISSING_CONFIG` | — | The container resolved `PhotonRenderer` and there is no `config/photon.ts`. |
| <span id="e-photon-invalid-duration"></span>`E_PHOTON_INVALID_DURATION` | — | A `once()` prop's `expiresIn` is neither milliseconds nor a duration like `30s`, `5m`, `7d`. |
| <span id="e-photon-scroll-cursor-underivable"></span>`E_PHOTON_SCROLL_CURSOR_UNDERIVABLE` | — | `scroll()` was given a value that is not an offset paginator and no cursor callback; pass one as its second argument. |
| <span id="e-photon-invalid-page-module"></span>`E_PHOTON_INVALID_PAGE_MODULE` | — | `resolvePageComponent` loaded a module with no default export. |
| <span id="e-photon-invalid-page-response"></span>`E_PHOTON_INVALID_PAGE_RESPONSE` | — | The first page requested from the server answered an error status, or something other than a JSON page object. |
| <span id="e-photon-no-router-host"></span>`E_PHOTON_NO_ROUTER_HOST` | — | The client router ran with no host: no browser document, and none given to `bootPage`. |
| <span id="e-photon-no-page"></span>`E_PHOTON_NO_PAGE` | — | `usePage()` was called outside a Photon page (on the server, outside `<PhotonPage>`). |
| <span id="e-photon-unknown-scroll-prop"></span>`E_PHOTON_UNKNOWN_SCROLL_PROP` | — | An infinite scroll names a prop the page object has no scroll prop for. |
| <span id="e-photon-invalid-deferred"></span>`E_PHOTON_INVALID_DEFERRED` | — | `<Deferred>` is missing its `data` prop or its fallback. |
| <span id="e-photon-form-data-missing"></span>`E_PHOTON_FORM_DATA_MISSING` | — | `useForm(rememberKey)` was called without the form data. |
| <span id="e-photon-form-defaults-unsupported"></span>`E_PHOTON_FORM_DEFAULTS_UNSUPPORTED` | — | `setDefaults()` was called on a form whose data is a function. |
| <span id="e-photon-invalid-svelte-root"></span>`E_PHOTON_INVALID_SVELTE_ROOT` | — | The `svelteRoot` given to the Svelte adapter does not export `setPage()`; pass the root from `@c9up/photon/svelte`. |
| <span id="e-photon-invalid-ssr-setup"></span>`E_PHOTON_INVALID_SSR_SETUP` | — | Svelte's `createPhotonApp` rendered on the server without a `setup`, or its `setup` did not return `render(App, { props })` from `svelte/server`. |
| <span id="e-photon-deferred-props-missing"></span>`E_PHOTON_DEFERRED_PROPS_MISSING` | — | The answer to a deferred group did not carry the props asked for; reported on the router's `exception` event (`photon:exception`), not thrown, and not asked for again on that visit. |

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
| <span id="e-prism-empty-input"></span>`E_PRISM_EMPTY_INPUT` | 422 | The input is empty. |
| <span id="e-prism-input-too-large"></span>`E_PRISM_INPUT_TOO_LARGE` | 422 | The input is over the byte limit. |
| <span id="e-prism-too-many-pixels"></span>`E_PRISM_TOO_MANY_PIXELS` | 422 | The image (its header, or any GIF frame), or an image an operation would build, is over the pixel ceiling; refused before it is allocated. |
| <span id="e-prism-zero-dimension"></span>`E_PRISM_ZERO_DIMENSION` | 422 | The image has a zero width or height. |
| <span id="e-prism-unknown-format"></span>`E_PRISM_UNKNOWN_FORMAT` | 422 | The bytes are not an image format prism recognises. |
| <span id="e-prism-unsupported-format"></span>`E_PRISM_UNSUPPORTED_FORMAT` | 422 | The format is recognised but not supported. |
| <span id="e-prism-format-not-allowed"></span>`E_PRISM_FORMAT_NOT_ALLOWED` | 422 | A real image, in a format the application chose not to decode. |
| <span id="e-prism-unreadable"></span>`E_PRISM_UNREADABLE` | 422 | The image cannot be read: corrupt, a WebP bitstream whose size is not its frame's, an AVIF item located in more bytes than the file holds. |
| <span id="e-prism-decode-failed"></span>`E_PRISM_DECODE_FAILED` | 422 | Decoding the image failed. |
| <span id="e-prism-encode-failed"></span>`E_PRISM_ENCODE_FAILED` | 500 | Encoding the output failed. |
| <span id="e-prism-invalid-geometry"></span>`E_PRISM_INVALID_GEOMETRY` | 500 | A geometry the image cannot satisfy: a crop outside its bounds, a target size of zero. |
| <span id="e-prism-invalid-font"></span>`E_PRISM_INVALID_FONT` | 500 | A font cannot be used. |
| <span id="e-prism-colour-space"></span>`E_PRISM_COLOUR_SPACE` | 500 | A colour space that cannot be named, or a conversion the model refuses. |
| <span id="e-prism-invalid-operation"></span>`E_PRISM_INVALID_OPERATION` | 500 | An operation lacks a field it needs, or has one out of range. |
| <span id="e-prism-qr-too-long"></span>`E_PRISM_QR_TOO_LONG` | 500 | More text than a QR code can hold at the chosen level and version. |
| <span id="e-prism-invalid-qr-option"></span>`E_PRISM_INVALID_QR_OPTION` | 500 | A QR code option out of range, or a colour that is not strict hex. |
| <span id="e-prism-internal-panic"></span>`E_PRISM_INTERNAL_PANIC` | 500 | The engine panicked; always a bug in prism. |
| <span id="e-prism-engine"></span>`E_PRISM_ENGINE` | 500 | The engine failed without a known code. |
| <span id="e-prism-native-required"></span>`E_PRISM_NATIVE_REQUIRED` | 500 | The Rust image engine is not loaded. |
| <span id="e-prism-not-booted"></span>`E_PRISM_NOT_BOOTED` | — | The `services/main` engine was used before `PrismProvider` booted or `setPrism()` was called. |
| <span id="e-prism-invalid-config"></span>`E_PRISM_INVALID_CONFIG` | 500 | `config/images.ts` does not export a `defineConfig({ ... })` config. |
| <span id="e-prism-invalid-serve-config"></span>`E_PRISM_INVALID_SERVE_CONFIG` | 500 | `images.serve` declares no roots, one of its counts (`concurrency`, `queueLimit`, `effort`, `memoryCacheBytes`, `maxCacheBytes`…) is out of range, or `cacheControl` is not `'public'`, `'private'` or `false`. |
| <span id="e-prism-invalid-binding"></span>`E_PRISM_INVALID_BINDING` | 500 | The container resolved something other than a `Prism` for the `Prism` token, or other than a router for `router`. |
| <span id="e-prism-memory-limit"></span>`E_PRISM_MEMORY_LIMIT` | 422 | A step of the pipeline (the decoded image, a resize's float intermediate, an encoder's copy) would hold more than `limits.maxMemory` bytes; refused before it is allocated. |

## Quasar Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-invalid-bytes-value"></span>`E_INVALID_BYTES_VALUE` | 500 | A Redis health check memory threshold cannot be read as a size. |
| <span id="e-quasar-missing-config"></span>`E_QUASAR_MISSING_CONFIG` | 500 | `QuasarProvider` registers and `config/redis.ts` does not exist. |
| <span id="e-quasar-invalid-config"></span>`E_QUASAR_INVALID_CONFIG` | 500 | `defineConfig` declares no connection, or names a default connection it does not declare. |
| <span id="e-quasar-invalid-port"></span>`E_QUASAR_INVALID_PORT` | 500 | A connection's `port` is not a whole number between 0 and 65535. |
| <span id="e-quasar-unknown-connection"></span>`E_QUASAR_UNKNOWN_CONNECTION` | 500 | `connection(name)` names a connection the config does not declare. |
| <span id="e-quasar-unknown-command"></span>`E_QUASAR_UNKNOWN_COMMAND` | 500 | `runCommand()` names a command never defined with `defineCommand()`, or the connection lacks a forwarded command. |
| <span id="e-quasar-not-a-cluster"></span>`E_QUASAR_NOT_A_CLUSTER` | 500 | `nodes()` is called on a standalone connection. |
| <span id="e-quasar-invalid-duration"></span>`E_QUASAR_INVALID_DURATION` | 500 | `cacheFor()` on a health check is given a duration it cannot read. |
| <span id="e-quasar-not-booted"></span>`E_QUASAR_NOT_BOOTED` | 500 | A member of `services/main` was read before `QuasarProvider` seated a manager, or before `setQuasar()`. |

## Ream MCP Errors

Returned in the result of the MCP server's template tool.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-inker-render-timeout"></span>`E_INKER_RENDER_TIMEOUT` | — | A template render took longer than the tool allows. |
| <span id="e-inker-unknown"></span>`E_INKER_UNKNOWN` | — | A template render failed without an inker code. |
| <span id="e-ream-mcp-invalid-argument"></span>`E_REAM_MCP_INVALID_ARGUMENT` | 500 | A tool or helper was called without a required argument (`docs.get`, `docs.explain`, an empty string) or with an out-of-range duplicate-detection threshold. |
| <span id="e-ream-mcp-project-root-not-found"></span>`E_REAM_MCP_PROJECT_ROOT_NOT_FOUND` | — | No Ream project root was found walking up from the working directory, or the one found above it is owned by another user or writable by group or others; set `REAM_PROJECT_ROOT`. |
| <span id="e-ream-mcp-native-unavailable"></span>`E_REAM_MCP_NATIVE_UNAVAILABLE` | 500 | The native core did not report a version at startup: the binary is missing or incompatible. |
| <span id="e-ream-mcp-native-mismatch"></span>`E_REAM_MCP_NATIVE_MISMATCH` | 500 | The native core answered something the server does not expect (trace, index statistics, model manifest): the binary is stale or from another version. |
| <span id="e-ream-mcp-path-escape"></span>`E_REAM_MCP_PATH_ESCAPE` | 500 | A migration file name or a model file path resolves outside its directory. |
| <span id="e-ream-mcp-invalid-migration"></span>`E_REAM_MCP_INVALID_MIGRATION` | 500 | A migration's default export is not a migration class, or its `getDownSQL()` does not return a list of strings. |
| <span id="e-ream-mcp-model-download-failed"></span>`E_REAM_MCP_MODEL_DOWNLOAD_FAILED` | 500 | Downloading an embeddings model file answered an HTTP error or no body. |
| <span id="e-ream-mcp-model-integrity"></span>`E_REAM_MCP_MODEL_INTEGRITY` | 500 | A downloaded model file does not match its pinned size or SHA-256; nothing is kept. |
| <span id="e-ream-mcp-shell-disallowed"></span>`E_REAM_MCP_SHELL_DISALLOWED` | 500 | `REAM_MCP_NO_SHELL=1` forbids spawning the `ream` binary. |
| <span id="e-ream-mcp-cli-not-found"></span>`E_REAM_MCP_CLI_NOT_FOUND` | — | The `ream` binary is neither at `$REAM_BIN` nor in the project's `node_modules/.bin`. |
| <span id="e-ream-mcp-cli-output-invalid"></span>`E_REAM_MCP_CLI_OUTPUT_INVALID` | 500 | The last line of the `ream` CLI's output is not a JSON object. |
| <span id="e-ream-mcp-already-connected"></span>`E_REAM_MCP_ALREADY_CONNECTED` | 500 | `McpServer.connect()` was called on a server that is already connected. |
| <span id="e-ream-mcp-internal"></span>`E_REAM_MCP_INTERNAL` | 500 | An internal invariant broke (an unknown tool kind reached a dispatcher); report it as a bug. |
| <span id="e-ream-mcp-index-failed"></span>`E_REAM_MCP_INDEX_FAILED` | 500 | The native corpus index could not be built, opened or read (`docs.*` tools, startup reindex, `ream-mcp-reindex`); `cause` is the native error. |
| <span id="e-ream-mcp-invalid-json"></span>`E_REAM_MCP_INVALID_JSON` | 500 | The native core could not read the JSON it was given (search options) or write its answer as JSON; `cause` is the native error. |
| <span id="e-ream-mcp-unsupported-platform"></span>`E_REAM_MCP_UNSUPPORTED_PLATFORM` | 500 | Importing `@c9up/ream-mcp/napi` on a platform with no native binary (supported: linux-x64, linux-arm64 on glibc, darwin-x64, darwin-arm64, win32-x64). |
| <span id="e-ream-mcp-native-load-failed"></span>`E_REAM_MCP_NATIVE_LOAD_FAILED` | 500 | The native binary of `@c9up/ream-mcp/napi` is missing or cannot be loaded; the message names the platform package to install, `cause` is Node's error. |

## Relay Errors

Returned in the JSON body of the relay routes, or as an `error` event on a hub.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-relay-bad-request"></span>`E_RELAY_BAD_REQUEST` | 400 | `subscribe` without a usable `uid` or `channel` (both non-empty strings). |
| <span id="e-relay-channel-too-long"></span>`E_RELAY_CHANNEL_TOO_LONG` | 400 | The channel name exceeds 256 characters. |
| <span id="e-relay-not-connected"></span>`E_RELAY_NOT_CONNECTED` | 400 | No connection has this uid on this instance and no bus is configured to relay the request to the instance holding it — or the connection closed. Also a hub POST for a connection that has no open stream. |
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
| <span id="e-relay-unauthorized"></span>`E_RELAY_UNAUTHORIZED` | 401 | A guarded hub needs an authenticated user, or one authenticated through another guard. Answered at negotiate, at the stream and at the WebSocket handshake; sent as an `error` event, before the connection closes, when an invocation is refused. |
| <span id="e-relay-forbidden"></span>`E_RELAY_FORBIDDEN` | 403 | The user lacks the role or the permissions a hub's guards require. Answered at negotiate, at the stream and at the WebSocket handshake; sent as an `error` event, before the connection closes, when an invocation is refused. |
| <span id="e-relay-unknown-event"></span>`E_RELAY_UNKNOWN_EVENT` | — | A hub invocation names no handler. |
| <span id="e-relay-handler-error"></span>`E_RELAY_HANDLER_ERROR` | — | A hub handler threw. |
| <span id="e-relay-invalid-channel-pattern"></span>`E_RELAY_INVALID_CHANNEL_PATTERN` | 500 | `authorize()` was given a channel pattern that could never match. |
| <span id="e-relay-invalid-ping-interval"></span>`E_RELAY_INVALID_PING_INTERVAL` | 500 | `pingInterval` is neither milliseconds nor a duration like `'30s'`. |
| <span id="e-relay-hub-path-taken"></span>`E_RELAY_HUB_PATH_TAKEN` | 500 | `relay.hub()` names a path where a hub is already mounted. |
| <span id="e-relay-hub-already-mounted"></span>`E_RELAY_HUB_ALREADY_MOUNTED` | 500 | One hub instance is mounted a second time; give each mount its own instance. |
| <span id="e-relay-duplicate-handler"></span>`E_RELAY_DUPLICATE_HANDLER` | 500 | Two handlers of a hub differ only by case, so they answer the same invocation. |
| <span id="e-relay-invalid-hub"></span>`E_RELAY_INVALID_HUB` | 500 | The object mounted with `relay.hub()` does not extend `Hub`. |
| <span id="e-relay-invalid-adapter"></span>`E_RELAY_INVALID_ADAPTER` | 500 | The adapter given to `relay.hub()` is not a `SignalRAdapter`. |
| <span id="e-relay-transport-not-started"></span>`E_RELAY_TRANSPORT_NOT_STARTED` | 500 | `whenTransportReady()` was called before `startTransport()`. |
| <span id="e-relay-transport-superseded"></span>`E_RELAY_TRANSPORT_SUPERSEDED` | 500 | A `startTransport()` was overtaken by a shutdown or a newer start before it subscribed. |
| <span id="e-relay-transport-unreleased"></span>`E_RELAY_TRANSPORT_UNRELEASED` | 500 | `startTransport()` could not release the previous bus subscription, so it refuses to subscribe again; `cause` is the bus's error. |
| <span id="e-relay-quasar-missing"></span>`E_RELAY_QUASAR_MISSING` | 500 | A Redis bus names a quasar connection and `@c9up/quasar` is not installed, or its provider has not booted. |
| <span id="e-relay-redis-incomplete"></span>`E_RELAY_REDIS_INCOMPLETE` | 500 | The quasar connection lacks a command the bus issues. |
| <span id="e-relay-assertion-failed"></span>`E_RELAY_ASSERTION_FAILED` | 500 | `FakeRelay.assertSent()` or `assertNotSent()` does not hold. |
| <span id="e-relay-internal"></span>`E_RELAY_INTERNAL` | 500 | An invariant of relay broke. A bug: report it. |
| <span id="e-relay-subscribe-failed"></span>`E_RELAY_SUBSCRIBE_FAILED` | 500 | The bus client's subscribe failed with something other than an `Error`; `cause` holds what it threw. |
| <span id="e-relay-max-queued"></span>`E_RELAY_MAX_QUEUED` | 429 | A hub connection already has `maxQueuedMessages` messages waiting for the hub; the POST is refused and nothing of it runs. A WebSocket in the same state is closed with code `1013`. |

## Robledo Errors

Raised by `@c9up/robledo`.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-robledo-invalid-prefix"></span>`E_ROBLEDO_INVALID_PREFIX` | 500 | The routes' prefix does not start with `/`, or ends with one. |
| <span id="e-robledo-not-booted"></span>`E_ROBLEDO_NOT_BOOTED` | 500 | `services/main` was used before the provider booted. |
| <span id="e-robledo-no-native-module"></span>`E_ROBLEDO_NO_NATIVE_MODULE` | 500 | The app has no native robledo module: it was not built with robledo installed. |
| <span id="e-robledo-bad-response"></span>`E_ROBLEDO_BAD_RESPONSE` | 500 | The server answered an update check, or a file download, with something other than an update: an error status, no manifest, a `latest` answer over 1 MiB, or a file larger than its signed size. |
| <span id="e-robledo-refused"></span>`E_ROBLEDO_REFUSED` | 500 | The phone refused an update: bad signature (checked before any file is fetched), altered file, wrong runtime, another app's update… |
| <span id="e-robledo-not-newer"></span>`E_ROBLEDO_NOT_NEWER` | 500 | The phone refused an update that is not newer (by its signed `createdAt`) than the newest it accepted, or than the bundle inside the app: an old, validly signed update served again. A deliberate rollback is published as a new update. |

## Rosetta Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-rosetta-not-booted"></span>`E_ROSETTA_NOT_BOOTED` | — | The `services/main` singleton was used before `RosettaProvider` booted, or before `setI18n()`. |
| <span id="e-rosetta-config-missing"></span>`E_ROSETTA_CONFIG_MISSING` | 500 | `config/i18n` exports no config built with `defineConfig()`. |
| <span id="e-rosetta-invalid-config"></span>`E_ROSETTA_INVALID_CONFIG` | 500 | The i18n config has no `formatter`. |
| <span id="e-rosetta-invalid-argument"></span>`E_ROSETTA_INVALID_ARGUMENT` | 500 | A constructor or method got an argument of the wrong shape (an emitter, a manager, a locale, a `FileSystemLoader` without `location` or `rootDir`, an empty format key). |
| <span id="e-rosetta-unsafe-key"></span>`E_ROSETTA_UNSAFE_KEY` | 500 | A catalog key or an ICU custom format key is one that would reach the prototype (`__proto__`, `constructor`, `prototype`). |
| <span id="e-rosetta-duplicate-key"></span>`E_ROSETTA_DUPLICATE_KEY` | 500 | A catalog defines the same key twice: a YAML key, or a nested and a dotted key that flatten to one. |
| <span id="e-rosetta-invalid-catalog"></span>`E_ROSETTA_INVALID_CATALOG` | 500 | A catalog file does not parse (unsupported YAML) or holds a value that is neither a mapping nor a scalar message. |
| <span id="e-rosetta-catalog-limit-exceeded"></span>`E_ROSETTA_CATALOG_LIMIT_EXCEEDED` | 500 | A catalog is too deep, has too many keys, or a catalog file is too large. |
| <span id="e-rosetta-unsafe-path"></span>`E_ROSETTA_UNSAFE_PATH` | 500 | A translation directory or file is a symbolic link, or resolves outside the loader's root. |
| <span id="e-rosetta-invalid-path"></span>`E_ROSETTA_INVALID_PATH` | 500 | A translation path is not a directory, or not a file, where one is expected. |
| <span id="e-rosetta-unsupported-runtime"></span>`E_ROSETTA_UNSUPPORTED_RUNTIME` | 500 | `FileSystemLoader` was used from the browser build, which has no filesystem. |
| <span id="e-rosetta-invalid-icu-message"></span>`E_ROSETTA_INVALID_ICU_MESSAGE` | 500 | An ICU message does not parse, or uses a style, skeleton or option Rosetta or `Intl` does not support. |
| <span id="e-rosetta-icu-limit-exceeded"></span>`E_ROSETTA_ICU_LIMIT_EXCEEDED` | 500 | An ICU message is too long, too deeply nested, or has too many nodes. |
| <span id="e-rosetta-missing-variable"></span>`E_ROSETTA_MISSING_VARIABLE` | 500 | An ICU message uses a variable the call did not provide. |
| <span id="e-rosetta-invalid-date"></span>`E_ROSETTA_INVALID_DATE` | 500 | An ICU date or time value is not a `Date`, a timestamp, an ISO string or a Luxon-like `DateTime`, or names an impossible date. |
| <span id="e-rosetta-catalog-mismatch"></span>`E_ROSETTA_CATALOG_MISMATCH` | 500 | `verifyCatalogs({ mode: 'throw' })` found catalogs that disagree; the message is the report. |
| <span id="e-rosetta-internal"></span>`E_ROSETTA_INTERNAL` | 500 | An internal invariant broke (an unknown ICU node, a parser state); report it as a bug. |

## Rover Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-mail-invalid-message"></span>`E_MAIL_INVALID_MESSAGE` | 500 | A message lacks what sending needs (a `from` address, a recipient…). |
| <span id="e-mail-invalid-address"></span>`E_MAIL_INVALID_ADDRESS` | 500 | An address is not a valid mail address. |
| <span id="e-mail-header-injection"></span>`E_MAIL_HEADER_INJECTION` | 500 | A header value contains a line break or NUL. |
| <span id="e-invalid-list-header"></span>`E_INVALID_LIST_HEADER` | 500 | A `List-*` header entry is not one URL (https, http, mailto or ftp) or bare address. |
| <span id="e-mail-field-unsupported"></span>`E_MAIL_FIELD_UNSUPPORTED` | 500 | The transport cannot set a field the message uses (such as the SMTP envelope). |
| <span id="e-attachment-unreadable"></span>`E_ATTACHMENT_UNREADABLE` | 500 | An attachment's file cannot be read. |
| <span id="e-mail-retry-config"></span>`E_MAIL_RETRY_CONFIG` | 500 | A retry setting is out of range. |
| <span id="e-mail-config-missing"></span>`E_MAIL_CONFIG_MISSING` | 500 | No `mail` config is registered. Create `config/mail.ts`, or run `ream configure @c9up/rover`. |
| <span id="e-mail-unknown-mailer"></span>`E_MAIL_UNKNOWN_MAILER` | 500 | A mailer name, or the default mailer, is not configured. |
| <span id="e-mail-unknown-transport"></span>`E_MAIL_UNKNOWN_TRANSPORT` | 500 | A transport type is unknown. |
| <span id="e-mail-job-malformed"></span>`E_MAIL_JOB_MALFORMED` | 500 | A queued mail job's payload is missing or not an object. |
| <span id="e-mail-template-engine"></span>`E_MAIL_TEMPLATE_ENGINE` | 500 | The app uses inker but rover cannot render mail views with it. |
| <span id="e-mail-template-not-found"></span>`E_MAIL_TEMPLATE_NOT_FOUND` | 500 | A mail template is not found. |
| <span id="e-mail-template-read-error"></span>`E_MAIL_TEMPLATE_READ_ERROR` | 500 | A mail template cannot be read. |
| <span id="e-mail-template-syntax"></span>`E_MAIL_TEMPLATE_SYNTAX` | 500 | A mail template has a syntax error. |
| <span id="e-mail-template-recursion"></span>`E_MAIL_TEMPLATE_RECURSION` | 500 | Mail templates include each other too deep. |
| <span id="e-mail-template-napi-required"></span>`E_MAIL_TEMPLATE_NAPI_REQUIRED` | 500 | The native rover engine is missing or cannot be loaded; the message names the platform package to install. |
| <span id="e-rover-unknown"></span>`E_ROVER_UNKNOWN` | — | A send failed with an error that carries no code of its own. |
| <span id="e-rover-not-booted"></span>`E_ROVER_NOT_BOOTED` | 500 | The `services/main` mail singleton was used before `RoverProvider` booted. |
| <span id="e-rover-fake-active"></span>`E_ROVER_FAKE_ACTIVE` | 500 | `mail.fake()` was called while a fake is already active; call `restore()` first. |
| <span id="e-rover-invalid-predicate"></span>`E_ROVER_INVALID_PREDICATE` | 500 | A fake-mailer assertion got an empty `containing` needle, which would match every message. |
| <span id="e-rover-abstract-mail"></span>`E_ROVER_ABSTRACT_MAIL` | 500 | `BaseMail` was instantiated directly instead of through a subclass. |
| <span id="e-rover-webhook-key-missing"></span>`E_ROVER_WEBHOOK_KEY_MISSING` | 500 | A webhook handler was created without its secret, public key or signing key. |
| <span id="e-rover-webhook-invalid-secret"></span>`E_ROVER_WEBHOOK_INVALID_SECRET` | 500 | The Resend webhook secret is not valid base64, or decodes to fewer than 16 bytes. |
| <span id="e-rover-internal"></span>`E_ROVER_INTERNAL` | 500 | An internal invariant broke (nodemailer composed no message); report it as a bug. |
| <span id="e-mail-transport-error"></span>`E_MAIL_TRANSPORT_ERROR` | 500 | The mail transport failed to send. Its `context` carries the provider's status or network code; built as `new E_MAIL_TRANSPORT_ERROR(message, { context, cause, help })`. |
| <span id="e-invalid-config"></span>`E_INVALID_CONFIG` | 500 | A mail transport's config is missing a property or holds an invalid one (`Invalid config for "resend" transport. The "apiKey" property is missing`). A message without recipients raises `E_MAIL_INVALID_MESSAGE` instead. |
| <span id="e-rover-ical-unavailable"></span>`E_ROVER_ICAL_UNAVAILABLE` | 500 | `icalEvent(callback)` needs `ical-generator`, which is not installed or does not build a calendar. |
| <span id="e-rover-webhook-invalid-key"></span>`E_ROVER_WEBHOOK_INVALID_KEY` | 500 | The SendGrid webhook `publicKey` is not a public key, or not the ECDSA P-256 key SendGrid signs its event webhook with. |

## Rune Errors

Rune normalises its codes: a code that already starts with `E_` is kept, any other gets the `E_RUNE_` prefix.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-validation-error-rune"></span>`E_VALIDATION_ERROR` | 422 | `validateOrThrow()` found invalid data. Carries a `messages` array with one entry per field and rule. |
| <span id="e-rune-meta-required"></span>`E_RUNE_META_REQUIRED` | 500 | A validator built with `withMetaData()` was called without `{ meta }`. |
| <span id="e-rune-not-a-regular-file"></span>`E_RUNE_NOT_A_REGULAR_FILE` | 500 | A `file()` value is not a regular file, so it is not an upload. |
| <span id="e-rune-invalid-size"></span>`E_RUNE_INVALID_SIZE` | 500 | `file()` was given a size it cannot read. |
| <span id="e-rune-invalid-error-reporter"></span>`E_RUNE_INVALID_ERROR_REPORTER` | 500 | `errorReporter` takes no argument and did not return a reporter (`{ report, createError }`). |
| <span id="e-rune-invalid-rule"></span>`E_RUNE_INVALID_RULE` | 500 | `use()` was given something other than a compiled rule; call the factory first. |
| <span id="e-rune-no-rule"></span>`E_RUNE_NO_RULE` | 500 | `message()` was called before any rule. |
| <span id="e-rune-not-an-object"></span>`E_RUNE_NOT_AN_OBJECT` | 500 | `merge()` (or a similar shape method) needs an `object()` shape. |
| <span id="e-rune-partial-not-applicable"></span>`E_RUNE_PARTIAL_NOT_APPLICABLE` | 500 | `partial()` cannot relax a shape that has groups or `allowUnknownProperties()`. |
| <span id="e-rune-no-type-rule"></span>`E_RUNE_NO_TYPE_RULE` | 500 | A `unionOfTypes()` branch declares no type. |
| <span id="e-rune-duplicate-union-type"></span>`E_RUNE_DUPLICATE_UNION_TYPE` | 500 | Two `unionOfTypes()` branches declare the same type. |
| <span id="e-rune-async-rule-not-awaited"></span>`E_RUNE_ASYNC_RULE_NOT_AWAITED` | 500 | A synchronous run met an async rule. Use the async variant. |
| <span id="e-rune-no-database-resolver"></span>`E_RUNE_NO_DATABASE_RESOLVER` | 500 | A database rule (`unique`, `exists`) has no resolver. Call `bindDatabase()` at boot, or pass a callback. |
| <span id="e-rune-no-host-resolver"></span>`E_RUNE_NO_HOST_RESOLVER` | 500 | `activeUrl()` needs a host resolver. |
| <span id="e-rune-unsupported-locale"></span>`E_RUNE_UNSUPPORTED_LOCALE` | 500 | `mobile()` has no numbering plan for the locale. |
| <span id="e-rune-unsupported-country"></span>`E_RUNE_UNSUPPORTED_COUNTRY` | 500 | A country-specific rule (`postalCode()`…) has no pattern for the country. |
| <span id="e-rune-unsupported-json-schema-target"></span>`E_RUNE_UNSUPPORTED_JSON_SCHEMA_TARGET` | 500 | A JSON Schema target rune does not emit. |
| <span id="e-rune-no-output-schema"></span>`E_RUNE_NO_OUTPUT_SCHEMA` | 500 | A validator's output cannot be described as JSON Schema: a transform may produce anything. |
| <span id="e-rune-napi-required"></span>`E_RUNE_NAPI_REQUIRED` | 500 | The Rust validation engine is missing or cannot be loaded; the message names the platform package to install. |
| <span id="e-rune-napi-not-found"></span>`E_RUNE_NAPI_NOT_FOUND` | 500 | The Rust validation engine binary is not found; the message names the platform package to install. |
| <span id="e-rune-napi-request-refused"></span>`E_RUNE_NAPI_REQUEST_REFUSED` | 500 | The Rust validation engine refused the request. |
| <span id="e-rune-napi-invalid-response"></span>`E_RUNE_NAPI_INVALID_RESPONSE` | 500 | The Rust validation engine returned an unexpected shape. |
| <span id="e-rune-conflicting-url-options"></span>`E_RUNE_CONFLICTING_URL_OPTIONS` | 500 | `normalizeUrl()` was given both `forceHttp` and `forceHttps`. |

## Sigil Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-sigil-unknown-driver"></span>`E_SIGIL_UNKNOWN_DRIVER` | 500 | A hasher names a driver sigil does not know. |
| <span id="e-sigil-napi-required"></span>`E_SIGIL_NAPI_REQUIRED` | — | The driver needs the Rust engine, which is not loaded. |
| <span id="e-sigil-not-booted"></span>`E_SIGIL_NOT_BOOTED` | — | `hash.<member>` was used before `SigilProvider.boot()` ran. |
| <span id="e-sigil-unknown-hasher"></span>`E_SIGIL_UNKNOWN_HASHER` | 500 | `hash.use(name)` (or the config's `default`) names a hasher the hash config does not declare. |
| <span id="e-sigil-invalid-option"></span>`E_SIGIL_INVALID_OPTION` | 500 | A hash driver option is not an integer, out of range, not an allowed value, or the options together cost more than `verify` accepts. |
| <span id="e-sigil-password-too-long"></span>`E_SIGIL_PASSWORD_TOO_LONG` | 500 | `make` received a password longer than the driver accepts (the shared byte cap, or 72 bytes for bcrypt). |

## Spectrum Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-spectrum-unknown-level"></span>`E_SPECTRUM_UNKNOWN_LEVEL` | 500 | A transport target level is not a log level. |
| <span id="e-spectrum-unsupported-target"></span>`E_SPECTRUM_UNSUPPORTED_TARGET` | 500 | A transport target spectrum does not build. Pass a `LogChannel` to write anywhere else. |
| <span id="e-spectrum-invalid-file-options"></span>`E_SPECTRUM_INVALID_FILE_OPTIONS` | 500 | A file destination is neither a path nor a file descriptor. |
| <span id="e-spectrum-invalid-line-options"></span>`E_SPECTRUM_INVALID_LINE_OPTIONS` | 500 | A JSON-line option is invalid. |
| <span id="e-spectrum-invalid-redact-path"></span>`E_SPECTRUM_INVALID_REDACT_PATH` | 500 | A redaction path cannot be parsed. |
| <span id="e-spectrum-invalid-stringify-limit"></span>`E_SPECTRUM_INVALID_STRINGIFY_LIMIT` | 500 | A serialisation limit is not a positive integer. |
| <span id="e-spectrum-unsupported-option"></span>`E_SPECTRUM_UNSUPPORTED_OPTION` | 500 | A logger option spectrum does not support. |
| <span id="e-spectrum-logger-not-bound"></span>`E_SPECTRUM_LOGGER_NOT_BOUND` | 500 | The container resolved something other than a `Logger` for the `Logger` token. |
| <span id="e-spectrum-missing-default-logger"></span>`E_SPECTRUM_MISSING_DEFAULT_LOGGER` | 500 | A multi-logger config (`{ default, loggers }`) names no `default` logger. |
| <span id="e-spectrum-unknown-default-logger"></span>`E_SPECTRUM_UNKNOWN_DEFAULT_LOGGER` | 500 | The `default` logger is not declared in `loggers`. |
| <span id="e-spectrum-unknown-logger"></span>`E_SPECTRUM_UNKNOWN_LOGGER` | 500 | `logger.use(name)` names a logger that is not in `loggers`. |
| <span id="e-spectrum-not-booted"></span>`E_SPECTRUM_NOT_BOOTED` | — | The `services/main` logger was used before `SpectrumProvider` booted. |
| <span id="e-spectrum-assertion-failed"></span>`E_SPECTRUM_ASSERTION_FAILED` | 500 | `FakeLogger.assertLogged` / `assertNotLogged` failed: the captured entries do not match. |
| <span id="e-spectrum-invalid-predicate"></span>`E_SPECTRUM_INVALID_PREDICATE` | 500 | A `FakeLogger` assertion was given an empty `containing`, which would match every entry. |

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
| <span id="e-station-not-booted"></span>`E_STATION_NOT_BOOTED` | — | The `services/main` registry was used before `StationProvider` booted, or before `setStation()`. |
| <span id="e-station-invalid-resource"></span>`E_STATION_INVALID_RESOURCE` | 500 | `defineResource()` was given an invalid declaration (entity, name, actions, column lists, `formFields`, `audit`, `onAuditError`). |
| <span id="e-station-duplicate-resource"></span>`E_STATION_DUPLICATE_RESOURCE` | 500 | Two resources were registered under the same name. |
| <span id="e-station-unknown-resource"></span>`E_STATION_UNKNOWN_RESOURCE` | 500 | `getOrThrow()` named a resource that is not registered. |
| <span id="e-station-unknown-column"></span>`E_STATION_UNKNOWN_COLUMN` | 500 | A resource's `list.columns`, `show.columns` or `editable` names a property that is not a column of the entity. |
| <span id="e-station-column-not-editable"></span>`E_STATION_COLUMN_NOT_EDITABLE` | 500 | `editable` names a column the framework manages (primary key, timestamp, relation, soft delete) or one `formFields` hides. |
| <span id="e-station-primary-key-missing"></span>`E_STATION_PRIMARY_KEY_MISSING` | 500 | An admin entity declares no `@PrimaryKey()` column. |
| <span id="e-station-invalid-config"></span>`E_STATION_INVALID_CONFIG` | 500 | A `station` option is invalid (`audit`, `permissionPrefix`, `guard`, `loginRateLimit`). |
| <span id="e-station-unknown-guard"></span>`E_STATION_UNKNOWN_GUARD` | 500 | `station.guard` names a guard warden does not know. |
| <span id="e-station-guard-not-jwt"></span>`E_STATION_GUARD_NOT_JWT` | — | The admin guard does not issue a bearer token; Station needs a JWT guard. |
| <span id="e-station-auth-required"></span>`E_STATION_AUTH_REQUIRED` | 500 | No working `auth` binding is registered while `requireAuth: true` is set, or outside development and test. |
| <span id="e-station-database-required"></span>`E_STATION_DATABASE_REQUIRED` | 500 | No `db` connection is registered for the admin (register `@c9up/atlas/provider`). |
| <span id="e-station-rune-required"></span>`E_STATION_RUNE_REQUIRED` | 500 | A resource with write forms needs `@c9up/rune`, which is not installed. |
| <span id="e-station-inker-required"></span>`E_STATION_INKER_REQUIRED` | 500 | No `@c9up/inker` view engine is registered to render the admin. |
| <span id="e-station-inker-unusable"></span>`E_STATION_INKER_UNUSABLE` | 500 | `@c9up/inker` is registered but does not resolve to a usable view renderer; see `cause`. |
| <span id="e-station-route-middleware-unsupported"></span>`E_STATION_ROUTE_MIDDLEWARE_UNSUPPORTED` | 500 | `station.middleware` is set but the router's routes have no `middleware()` method. |
| <span id="e-station-internal"></span>`E_STATION_INTERNAL` | 500 | An internal invariant broke (the view engine was not initialised); report it as a bug. |

## Transit Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-transit-invalid-xml"></span>`E_TRANSIT_INVALID_XML` | 500 | A provider answered XML that cannot be parsed, or that uses a construct transit refuses. |
| <span id="e-transit-protected-parameter"></span>`E_TRANSIT_PROTECTED_PARAMETER` | 500 | A per-request `begin()`/`redirect()` callback tried to set or clear a parameter the sign-in owns (`state`, `nonce`, the PKCE challenge, `client_id`, `redirect_uri`, `response_type`), or `scope` through `param()` instead of the scope methods. |
| <span id="e-transit-not-booted"></span>`E_TRANSIT_NOT_BOOTED` | 500 | `@c9up/transit/services/main` was read before the provider booted, or before `setTransit()`. |
| <span id="e-transit-unknown-provider"></span>`E_TRANSIT_UNKNOWN_PROVIDER` | 404 | No provider of this name is registered. The message names only the provider asked for. |
| <span id="e-transit-not-a-redirect-provider"></span>`E_TRANSIT_NOT_A_REDIRECT_PROVIDER` | 500 | `use()` / `begin()` named a directory (LDAP); call `authenticate()`. |
| <span id="e-transit-not-a-directory"></span>`E_TRANSIT_NOT_A_DIRECTORY` | 500 | `directory()` / `authenticate()` named a redirect provider; call `begin()`. |
| <span id="e-transit-begin-unsupported"></span>`E_TRANSIT_BEGIN_UNSUPPORTED` | 500 | `begin()` on a driver that has no `begin()`. |
| <span id="e-transit-token-profile-unsupported"></span>`E_TRANSIT_TOKEN_PROFILE_UNSUPPORTED` | 500 | `userFromToken()` on a driver that cannot read a profile from a token. |
| <span id="e-transit-use-begin"></span>`E_TRANSIT_USE_BEGIN` | 500 | `redirectUrl()` on a provider whose redirect needs a round trip (OAuth1, OpenID Connect, SAML); call `begin()`. |
| <span id="e-transit-no-authorize-params"></span>`E_TRANSIT_NO_AUTHORIZE_PARAMS` | 500 | A customizer was passed to an OAuth1 or SAML sign-in, which has no per-request scopes or parameters. |
| <span id="e-transit-state-required"></span>`E_TRANSIT_STATE_REQUIRED` | 500 | A callback ran without `expectedState`. |
| <span id="e-transit-missing-secret"></span>`E_TRANSIT_MISSING_SECRET` | 500 | A flow lacks the secret it needs: the `secret` `begin()` returned (PKCE verifier, OAuth1 request-token secret), or the token secret an OAuth1 access token signs with. |
| <span id="e-transit-pkce-required"></span>`E_TRANSIT_PKCE_REQUIRED` | 500 | A provider that requires PKCE got no code verifier. |
| <span id="e-transit-token-exchange-failed"></span>`E_TRANSIT_TOKEN_EXCHANGE_FAILED` | 500 | The provider's token endpoint answered an HTTP error. |
| <span id="e-transit-no-access-token"></span>`E_TRANSIT_NO_ACCESS_TOKEN` | 500 | The token response carries no access token. |
| <span id="e-transit-profile-request-failed"></span>`E_TRANSIT_PROFILE_REQUEST_FAILED` | 500 | The provider's profile or userinfo endpoint answered an HTTP error. |
| <span id="e-transit-invalid-response"></span>`E_TRANSIT_INVALID_RESPONSE` | 500 | A provider's response is not JSON, or not a JSON object. |
| <span id="e-transit-no-email"></span>`E_TRANSIT_NO_EMAIL` | 500 | LinkedIn returned no email address; the application needs the `r_emailaddress` scope. |
| <span id="e-transit-callback-not-confirmed"></span>`E_TRANSIT_CALLBACK_NOT_CONFIRMED` | 500 | An OAuth1 provider did not confirm the callback URL. |
| <span id="e-transit-no-request-token"></span>`E_TRANSIT_NO_REQUEST_TOKEN` | 500 | An OAuth1 provider answered without a request token. |
| <span id="e-transit-discovery-failed"></span>`E_TRANSIT_DISCOVERY_FAILED` | 500 | OpenID Connect discovery answered an HTTP error. |
| <span id="e-transit-invalid-discovery"></span>`E_TRANSIT_INVALID_DISCOVERY` | 500 | The discovery document lacks a required field, names another issuer, or gives an endpoint that is not `https`. |
| <span id="e-transit-jwks-failed"></span>`E_TRANSIT_JWKS_FAILED` | 500 | Fetching the provider's JWKS failed, or it has no `keys` array. Keys older than `cache.ttlMs` are not used in its place. |
| <span id="e-transit-unknown-signing-key"></span>`E_TRANSIT_UNKNOWN_SIGNING_KEY` | 500 | The id_token names a signing key the provider did not publish. |
| <span id="e-transit-unsupported-algorithm"></span>`E_TRANSIT_UNSUPPORTED_ALGORITHM` | 500 | The provider declares only id_token algorithms transit refuses (asymmetric signatures are required). |
| <span id="e-transit-no-id-token"></span>`E_TRANSIT_NO_ID_TOKEN` | 500 | The token response carries no id_token; check that the `openid` scope is granted. |
| <span id="e-transit-invalid-id-token"></span>`E_TRANSIT_INVALID_ID_TOKEN` | 500 | The id_token is refused: malformed, bad signature or algorithm, wrong issuer, audience or nonce, expired. |
| <span id="e-transit-no-userinfo-endpoint"></span>`E_TRANSIT_NO_USERINFO_ENDPOINT` | 500 | A profile was asked from a token alone and the provider publishes no userinfo endpoint. |
| <span id="e-transit-userinfo-mismatch"></span>`E_TRANSIT_USERINFO_MISMATCH` | 500 | The userinfo response describes another subject than the id_token. |
| <span id="e-transit-saml-rejected"></span>`E_TRANSIT_SAML_REJECTED` | 500 | A SAML response or assertion is refused. |
| <span id="e-transit-invalid-signature"></span>`E_TRANSIT_INVALID_SIGNATURE` | 500 | An XML signature does not verify, or is not one transit accepts. |
| <span id="e-transit-invalid-ber"></span>`E_TRANSIT_INVALID_BER` | 500 | An LDAP message does not encode or decode as BER, or a DN, an attribute or a filter value handed to `LdapConnection` is not a string. |
| <span id="e-transit-quasar-missing"></span>`E_TRANSIT_QUASAR_MISSING` | 500 | A Redis replay store names a quasar connection and `@c9up/quasar` is not installed, or its provider has not booted. |
| <span id="e-transit-incomplete-connection"></span>`E_TRANSIT_INCOMPLETE_CONNECTION` | 500 | The quasar connection lacks a command the replay store issues. |
| <span id="e-transit-fake-not-declared"></span>`E_TRANSIT_FAKE_NOT_DECLARED` | 500 | `FakeTransit` was asked for a provider no `willReturn()` declared. |
| <span id="e-transit-fake-assertion"></span>`E_TRANSIT_FAKE_ASSERTION` | 500 | A `FakeTransit` assertion (`assertBegan`, `assertSignedIn`, `assertNobodySignedIn`) failed. |
| <span id="e-transit-ldap-error"></span>`E_TRANSIT_LDAP_ERROR` | 500 | A directory refused or could not be reached. `resultCode` holds the LDAP result code when the directory answered one; 400 for invalid credentials (49), for an empty login or password, and for one that is not a string (reported as 49). |
| <span id="e-oauth-state-mismatch"></span>`E_OAUTH_STATE_MISMATCH` | 400 | Unable to verify re-redirect state: the OAuth callback's state is missing or differs from the one stored at redirect time (possible CSRF). Start the sign-in again. |
| <span id="e-oauth-missing-code"></span>`E_OAUTH_MISSING_CODE` | 500 | The OAuth callback came back without its grant (`code`, `oauth_verifier` for OAuth1, `SAMLResponse` for SAML), as when the user denied access. Nothing was sent to the provider. |
| <span id="e-transit-insecure-issuer"></span>`E_TRANSIT_INSECURE_ISSUER` | 500 | An OpenID Connect `issuer` is not an `https` URL (`http://localhost` excepted). Raised when the driver is built. |

## Vellum Errors

Vellum normalises its codes: a code that already starts with `E_` is kept, any other gets the `E_VELLUM_` prefix.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-vellum-invalid-pdf"></span>`E_VELLUM_INVALID_PDF` | 422 | The bytes are not a PDF vellum can read. |
| <span id="e-vellum-signed-document"></span>`E_VELLUM_SIGNED_DOCUMENT` | 500 | An edit would invalidate the document's signatures; refused unless the caller says they may go. |
| <span id="e-vellum-invalid-page"></span>`E_VELLUM_INVALID_PAGE` | 500 | A page number is not a whole number from 1. |
| <span id="e-vellum-invalid-rotation"></span>`E_VELLUM_INVALID_ROTATION` | 500 | A rotation is not a multiple of 90. |
| <span id="e-vellum-empty-merge"></span>`E_VELLUM_EMPTY_MERGE` | 500 | `merge()` was given no document. |
| <span id="e-vellum-empty-selection"></span>`E_VELLUM_EMPTY_SELECTION` | 500 | Selecting needs at least one page. |
| <span id="e-vellum-merge-failed"></span>`E_VELLUM_MERGE_FAILED` | 500 | Merging documents failed. |
| <span id="e-vellum-select-failed"></span>`E_VELLUM_SELECT_FAILED` | 500 | Selecting pages failed. |
| <span id="e-vellum-split-failed"></span>`E_VELLUM_SPLIT_FAILED` | 500 | Splitting the document failed. |
| <span id="e-vellum-rotate-failed"></span>`E_VELLUM_ROTATE_FAILED` | 500 | Rotating pages failed. |
| <span id="e-vellum-stamp-failed"></span>`E_VELLUM_STAMP_FAILED` | 500 | Stamping an image failed. |
| <span id="e-vellum-stamp-text-failed"></span>`E_VELLUM_STAMP_TEXT_FAILED` | 500 | Stamping text failed. |
| <span id="e-vellum-fill-failed"></span>`E_VELLUM_FILL_FAILED` | 500 | Filling the form failed. |
| <span id="e-vellum-flatten-failed"></span>`E_VELLUM_FLATTEN_FAILED` | 500 | Flattening the form failed. |
| <span id="e-vellum-render-failed"></span>`E_VELLUM_RENDER_FAILED` | 500 | Rendering a page to an image failed. |
| <span id="e-vellum-extract-failed"></span>`E_VELLUM_EXTRACT_FAILED` | 500 | Extracting text failed. |
| <span id="e-vellum-write-failed"></span>`E_VELLUM_WRITE_FAILED` | 500 | Writing the document failed. |
| <span id="e-vellum-sign-failed"></span>`E_VELLUM_SIGN_FAILED` | 500 | Signing the document failed. |
| <span id="e-vellum-verify-failed"></span>`E_VELLUM_VERIFY_FAILED` | 500 | Verifying the signatures failed. |
| <span id="e-vellum-unknown-signer"></span>`E_VELLUM_UNKNOWN_SIGNER` | 500 | No signer of this name is configured. |
| <span id="e-vellum-signer-invalid"></span>`E_VELLUM_SIGNER_INVALID` | 500 | A signer's key or certificate is empty. |
| <span id="e-vellum-timestamp-failed"></span>`E_VELLUM_TIMESTAMP_FAILED` | 500 | Building or reading a timestamp failed. |
| <span id="e-vellum-timestamp-unreachable"></span>`E_VELLUM_TIMESTAMP_UNREACHABLE` | 500 | The timestamp authority could not be reached. |
| <span id="e-vellum-timestamp-refused"></span>`E_VELLUM_TIMESTAMP_REFUSED` | 500 | The timestamp authority answered with an error status. |
| <span id="e-vellum-font-unreadable"></span>`E_VELLUM_FONT_UNREADABLE` | 500 | A configured font file cannot be read. |
| <span id="e-vellum-file-not-found"></span>`E_VELLUM_FILE_NOT_FOUND` | 500 | A file given by path cannot be read. |
| <span id="e-vellum-invalid-options"></span>`E_VELLUM_INVALID_OPTIONS` | 500 | A document, page, table or drawing option, or a ceiling, is invalid, or `config/vellum.ts` asks for a `format` other than `"png"` or `"jpeg"`. |
| <span id="e-vellum-invalid-color"></span>`E_VELLUM_INVALID_COLOR` | 500 | A colour cannot be read. |
| <span id="e-vellum-invalid-image"></span>`E_VELLUM_INVALID_IMAGE` | 500 | An image cannot be used (unreadable, or opened by another document). |
| <span id="e-vellum-invalid-svg"></span>`E_VELLUM_INVALID_SVG` | 500 | An SVG cannot be used; pass a file as a URL or as its bytes. |
| <span id="e-vellum-unsupported-content"></span>`E_VELLUM_UNSUPPORTED_CONTENT` | 500 | A path holds an operator vellum does not draw. |
| <span id="e-vellum-invalid-structure"></span>`E_VELLUM_INVALID_STRUCTURE` | 500 | A structure element was changed after it ended. |
| <span id="e-vellum-no-page"></span>`E_VELLUM_NO_PAGE` | 500 | There is no current page; call `addPage()` first. |
| <span id="e-vellum-no-form"></span>`E_VELLUM_NO_FORM` | 500 | Form fields were added before `initForm()`. |
| <span id="e-vellum-document-ended"></span>`E_VELLUM_DOCUMENT_ENDED` | 500 | The document has ended; nothing more can be added to it. |
| <span id="e-vellum-napi-required"></span>`E_VELLUM_NAPI_REQUIRED` | 500 | The Rust PDF engine is not loaded. |
| <span id="e-vellum-not-booted"></span>`E_VELLUM_NOT_BOOTED` | — | The `services/main` service was used before `VellumProvider` booted. |
| <span id="e-vellum-table-ended"></span>`E_VELLUM_TABLE_ENDED` | 500 | A row was added to a table after `lastRow` ended it. |
| <span id="e-vellum-invalid-link"></span>`E_VELLUM_INVALID_LINK` | 500 | A link or a named destination cannot be used. |
| <span id="e-vellum-invalid-outline"></span>`E_VELLUM_INVALID_OUTLINE` | 500 | An outline entry cannot be used. |
| <span id="e-vellum-invalid-font"></span>`E_VELLUM_INVALID_FONT` | 500 | A font cannot be used. |
| <span id="e-vellum-no-font"></span>`E_VELLUM_NO_FONT` | 500 | Text was written before a font was selected. |
| <span id="e-vellum-page-out-of-range"></span>`E_VELLUM_PAGE_OUT_OF_RANGE` | 500 | A page index names no page of the document. |
| <span id="e-vellum-unbalanced-restore"></span>`E_VELLUM_UNBALANCED_RESTORE` | 500 | `restore()` was called without a matching `save()`. |
| <span id="e-vellum-nothing-to-resume"></span>`E_VELLUM_NOTHING_TO_RESUME` | 500 | No text is waiting for a page. |
| <span id="e-vellum-validation"></span>`E_VELLUM_VALIDATION` | 500 | The document does not meet its `subset` (PDF/A, PDF/UA), or a form field or an annotation breaks a PDF rule. |
| <span id="e-vellum-document-broken"></span>`E_VELLUM_DOCUMENT_BROKEN` | 500 | An earlier call failed inside the engine; start a new document. |
| <span id="e-vellum-internal"></span>`E_VELLUM_INTERNAL` | 500 | The engine panicked. |

## Visa Errors

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-unauthorized-access"></span>`E_UNAUTHORIZED_ACCESS` | 403 | `currentAccessToken.authorize()` found a token too narrow for the ability asked. 403, not 401: the request is authenticated (`insufficient_scope`). |
| <span id="e-visa-missing-issuer"></span>`E_VISA_MISSING_ISSUER` | 500 | No `issuer` is configured. |
| <span id="e-visa-invalid-issuer"></span>`E_VISA_INVALID_ISSUER` | 500 | The `issuer` is not a URL. |
| <span id="e-visa-insecure-issuer"></span>`E_VISA_INSECURE_ISSUER` | 500 | The `issuer` is not https (localhost excepted). |
| <span id="e-visa-no-redirect-uri"></span>`E_VISA_NO_REDIRECT_URI` | 500 | A client was registered without a redirect URI. |
| <span id="e-visa-invalid-redirect-uri"></span>`E_VISA_INVALID_REDIRECT_URI` | 500 | A redirect URI is not a complete URL. |
| <span id="e-visa-invalid-initial-access-token"></span>`E_VISA_INVALID_INITIAL_ACCESS_TOKEN` | 500 | `registration.initialAccessToken` is empty, which would accept an empty bearer token. |
| <span id="e-visa-invalid-secret-ttl"></span>`E_VISA_INVALID_SECRET_TTL` | 500 | `registration.secretTtlSeconds` is not a positive whole number of seconds. |
| <span id="e-visa-store-read-only"></span>`E_VISA_STORE_READ_ONLY` | 500 | The client store cannot register clients. |
| <span id="e-visa-missing-config"></span>`E_VISA_MISSING_CONFIG` | 500 | `VisaProvider` found no `config/visa.ts`; run `ream configure @c9up/visa`. |
| <span id="e-visa-not-booted"></span>`E_VISA_NOT_BOOTED` | 500 | `@c9up/visa/services/main` was read before `VisaProvider` booted, or before `setVisa()`. |
| <span id="e-visa-credentials-unsupported"></span>`E_VISA_CREDENTIALS_UNSUPPORTED` | 500 | `authenticate()` with credentials on the visa guard, which only verifies a bearer token. |
| <span id="e-visa-no-token-client"></span>`E_VISA_NO_TOKEN_CLIENT` | 500 | The guard's `createToken()` ran without `tokenClientId`: a token is always issued to a client. |
| <span id="e-visa-invalid-resource"></span>`E_VISA_INVALID_RESOURCE` | 500 | A protected-resource identifier is not an absolute URI, or carries a fragment (RFC 8707 §2). |
| <span id="e-visa-invalid-challenge-parameter"></span>`E_VISA_INVALID_CHALLENGE_PARAMETER` | 500 | A `WWW-Authenticate` parameter holds a quote, a backslash or a control character, so it cannot be a quoted string. |
| <span id="e-visa-corrupt-row"></span>`E_VISA_CORRUPT_ROW` | 500 | The Atlas store read a column it cannot decode: a list, a date, a string or a client auth method that is not one of the three. |
| <span id="e-visa-test-authorize-failed"></span>`E_VISA_TEST_AUTHORIZE_FAILED` | 500 | The `@c9up/visa/testing` helper's authorization request was refused; the message carries the OAuth error. |
| <span id="e-visa-internal"></span>`E_VISA_INTERNAL` | 500 | An internal invariant broke: a bug in visa, to report. |
| <span id="e-visa-oauth-error"></span>`E_VISA_OAUTH_ERROR` | 400 | A client's mistake, answered on the wire: `oauthCode` holds the protocol string (`invalid_grant`, `invalid_client`…). 401 for `invalid_client` and `invalid_token`, else 400. |
| <span id="e-visa-unredirectable"></span>`E_VISA_UNREDIRECTABLE` | 400 | An authorization failure that cannot be redirected (unknown client or redirect URI): show `error` to the user. |
| <span id="e-visa-invalid-ttl"></span>`E_VISA_INVALID_TTL` | 500 | A lifetime is not a positive whole number of seconds: `accessTokenTtlSeconds`, `refreshTokenTtlSeconds`, `codeTtlSeconds` or `consentTicketTtlSeconds` (checked when the `VisaManager` is built, and by `token()` and `issueAuthorizationCode()` when called directly), or the guard's `expiresInSeconds` (checked by `visaGuard()` and on each `createToken()`). |

## Warden Errors

Warden normalises its codes: a code that already starts with `E_` is kept, any other gets the `E_WARDEN_` prefix.

| Code | HTTP | Description |
|------|------|-------------|
| <span id="e-unauthorized-access-warden"></span>`E_UNAUTHORIZED_ACCESS` | 403 | No guard authenticated the request. A guarded route answers with this code. |
| <span id="e-invalid-credentials"></span>`E_INVALID_CREDENTIALS` | 400 | The credentials do not match. `authFinder().verifyCredentials` throws it for an unknown account and a wrong password alike, after the same hash work. |
| <span id="e-warden-auth-strategy-error"></span>`E_WARDEN_AUTH_STRATEGY_ERROR` | 500 | Every attempted guard crashed (a database down, a bug): a server incident, distinct from a credential rejection. |
| <span id="e-warden-mfa-required"></span>`E_WARDEN_MFA_REQUIRED` | 403 | The route declares `@RequireMfa` and the user has not passed the step-up. |
| <span id="e-authorization-failure"></span>`E_AUTHORIZATION_FAILURE` | 403 | A bouncer ability or policy denied the action (403 unless the denial gives another status). The exported class carries the denial as `error.response`, translation included. |
| <span id="e-warden-unauthorized"></span>`E_WARDEN_UNAUTHORIZED` | 401 | The standalone `expressMiddleware()` found no token or refused it. |
| <span id="e-warden-auth-error"></span>`E_WARDEN_AUTH_ERROR` | 500 | The standalone `expressMiddleware()` failed internally. |
| <span id="e-warden-no-auth-config"></span>`E_WARDEN_NO_AUTH_CONFIG` | 500 | `WardenProvider` booted without any guard configured. |
| <span id="e-warden-napi-required"></span>`E_WARDEN_NAPI_REQUIRED` | 500 | The Rust JWT engine is not loaded. |
| <span id="e-warden-not-booted"></span>`E_WARDEN_NOT_BOOTED` | 500 | The `AuthManager` singleton was used before `WardenProvider.boot()` ran. |
| <span id="e-warden-auth-not-registered"></span>`E_WARDEN_AUTH_NOT_REGISTERED` | 500 | `AuthManager` is not in the container; add `WardenProvider` to the providers. |
| <span id="e-warden-invalid-config"></span>`E_WARDEN_INVALID_CONFIG` | 500 | A guard, token, MFA or rate-limit setting is invalid. |
| <span id="e-warden-strategy-not-found"></span>`E_WARDEN_STRATEGY_NOT_FOUND` | 500 | A guard name is not configured. |
| <span id="e-warden-strategy-cannot-issue"></span>`E_WARDEN_STRATEGY_CANNOT_ISSUE` | 500 | `issueFor()` on a guard that does not mint tokens. |
| <span id="e-warden-strategy-cannot-login"></span>`E_WARDEN_STRATEGY_CANNOT_LOGIN` | 500 | `login()` / `logout()` on a stateless guard (JWT, API key). |
| <span id="e-warden-strategy-has-no-client"></span>`E_WARDEN_STRATEGY_HAS_NO_CLIENT` | 500 | A guard has no `authenticateAsClient()`, so it cannot forge a client request in tests. |
| <span id="e-warden-use-login"></span>`E_WARDEN_USE_LOGIN` | 500 | The session guard has no credential step. Verify the password yourself, then call `login(user)`. |
| <span id="e-warden-no-session"></span>`E_WARDEN_NO_SESSION` | 500 | A session guard's `login()` / `logout()` ran without `ctx.session`; register the session middleware first. |
| <span id="e-warden-remember-me-unavailable"></span>`E_WARDEN_REMEMBER_ME_UNAVAILABLE` | 500 | Remember-me was asked and no remember-me tokens are configured. |
| <span id="e-warden-token-ttl-invalid"></span>`E_WARDEN_TOKEN_TTL_INVALID` | 500 | A token lifetime (a refresh token's TTL, an access token's lifetime) is not a positive finite number; a token lifetime must also be whole seconds. |
| <span id="e-warden-otp-store-full"></span>`E_WARDEN_OTP_STORE_FULL` | 500 | The in-memory OTP store holds its maximum of pending challenges. |
| <span id="e-warden-otp-store-contract"></span>`E_WARDEN_OTP_STORE_CONTRACT` | 500 | The OTP challenge store does not implement `take()`. |
| <span id="e-warden-webauthn-store-full"></span>`E_WARDEN_WEBAUTHN_STORE_FULL` | 500 | The in-memory WebAuthn challenge store holds its maximum of pending ceremonies. |
| <span id="e-warden-store-ttl-invalid"></span>`E_WARDEN_STORE_TTL_INVALID` | 500 | A challenge store `ttlMs` is not a positive integer. |
| <span id="e-warden-store-limit-invalid"></span>`E_WARDEN_STORE_LIMIT_INVALID` | 500 | A challenge store `maxEntries` is not a positive integer. |
| <span id="e-warden-webauthn-credential-exists"></span>`E_WARDEN_WEBAUTHN_CREDENTIAL_EXISTS` | 500 | The WebAuthn credential id is already registered; registration answers `{ verified: false }`. |
| <span id="e-warden-invalid-credential"></span>`E_WARDEN_INVALID_CREDENTIAL` | 500 | A stored WebAuthn public key is malformed. |
| <span id="e-warden-invalid-ability"></span>`E_WARDEN_INVALID_ABILITY` | 500 | `Bouncer.ability()` was given options without a callback. |
| <span id="e-warden-unknown-ability"></span>`E_WARDEN_UNKNOWN_ABILITY` | 500 | No ability of this name is registered on the bouncer. |
| <span id="e-warden-unknown-policy"></span>`E_WARDEN_UNKNOWN_POLICY` | 500 | No policy of this name is registered on the bouncer. |
| <span id="e-warden-unknown-policy-action"></span>`E_WARDEN_UNKNOWN_POLICY_ACTION` | 500 | A policy has no method for the action. |
| <span id="e-warden-policy-resolution-failed"></span>`E_WARDEN_POLICY_RESOLUTION_FAILED` | 500 | The container resolved a policy to something that is not an instance of its class. |
| <span id="e-warden-template-engine-unusable"></span>`E_WARDEN_TEMPLATE_ENGINE_UNUSABLE` | 500 | The template engine is installed but `@can` / `@cannot` cannot be registered on it. |
| <span id="e-warden-invalid-duration"></span>`E_WARDEN_INVALID_DURATION` | 500 | A duration string does not parse, or names an unknown unit. |
| <span id="e-warden-invalid-totp-secret"></span>`E_WARDEN_INVALID_TOTP_SECRET` | 500 | The secret given to `TotpProvider.generate()` / `verify()` is not base32. |
| <span id="e-warden-blacklist-required"></span>`E_WARDEN_BLACKLIST_REQUIRED` | 500 | `JwtStrategy.revoke()` on a guard built without a `blacklist`. |
| <span id="e-warden-strategy-cannot-authenticate"></span>`E_WARDEN_STRATEGY_CANNOT_AUTHENTICATE` | 500 | `authenticate()` with credentials on an API key guard; the token goes to `verify()`. |
| <span id="e-warden-quasar-missing"></span>`E_WARDEN_QUASAR_MISSING` | 500 | A Redis token blacklist names a quasar connection and `@c9up/quasar` is not installed, or its provider has not booted. |
| <span id="e-warden-incomplete-connection"></span>`E_WARDEN_INCOMPLETE_CONNECTION` | 500 | The quasar connection lacks a command the token blacklist issues (`set`, `exists`). |
| <span id="e-warden-refresh-store-contract"></span>`E_WARDEN_REFRESH_STORE_CONTRACT` | 500 | The refresh token driver given to `rotateRefreshToken` has no `consume()` or no `revokeFamily()`. `consume(familyId, presentedHash, successor)` must replace the family's hash only if it is still the one presented, in one indivisible operation (an `UPDATE … WHERE family_id = ? AND hash = ?` and its affected row count, or a Lua script on Redis). |
| <span id="e-warden-empty-gate-requirement"></span>`E_WARDEN_EMPTY_GATE_REQUIREMENT` | 500 | `@Guard()`, `@Role()` or `@Permission()` names nothing to require (no argument, or only empty names, such as an empty list read from configuration). Thrown when the decorator is applied, at class load, and by warden's middleware for an action whose metadata names nothing, so the action is never read as public. Name at least one guard, role or permission, or remove the decorator. |
