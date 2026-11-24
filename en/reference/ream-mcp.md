# ream-mcp

`@c9up/ream-mcp`: a Model Context Protocol server over stdio that lets a coding agent search the project's docs, introspect its routes and providers, scaffold code, run migrations and scan for security issues. Guide: [AI agents (MCP)](/en/guides/digging-deeper/mcp).

## Installation

```bash
pnpm add -D @c9up/ream-mcp
ream mcp install
```

`ream mcp install` registers the server in the project's `.mcp.json` as `npx --no @c9up/ream-mcp`, which runs the version the lockfile pins and never downloads one. `@c9up/atlas` is an optional peer dependency, needed by the migration tools and by `generate.migration` / `generate.seeder`.

The server's native engine comes as one small package per platform, `@c9up/ream-mcp-<platform>`, for linux x64 and arm64 (glibc), macOS x64 and arm64, and Windows x64. `@c9up/ream-mcp` lists them as optional dependencies, and your package manager installs only the one that matches your machine. No Rust toolchain is needed. Do not install with optional dependencies turned off (`--no-optional`, `--omit=optional`): the engine would be left out. Without the engine, the server stops with `E_REAM_MCP_NATIVE_LOAD_FAILED`, and its message names the package to install, for example `@c9up/ream-mcp-linux-x64-gnu`.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/ream-mcp` | Starts the stdio server when imported or run. Exports nothing. |
| `@c9up/ream-mcp/napi` | `core`: the native indexer and search engine. |
| `@c9up/ream-mcp/util/project-root` | `detectProjectRoot()` and its types. |
| `@c9up/ream-mcp/errors` | The package's errors, one class per code. Importing it does not start the server. |

| Binary | Description |
|---|---|
| `ream-mcp` | The stdio MCP server. Writes nothing to stdout but the JSON-RPC stream; logs go to stderr. |
| `ream-mcp-reindex` | Indexes the docs corpus: incremental by default, `--full` drops and rebuilds, `--download-model` fetches the embeddings model and exits. Exits 0 on success, 1 on failure. |

## Exports

### `@c9up/ream-mcp/util/project-root`

| Export | Kind | Description |
|---|---|---|
| `detectProjectRoot` | function | `detectProjectRoot(cwd?: string): ProjectRoot`: walks up from `cwd` (default `process.cwd()`) to the project root. Throws when none is found. |
| `ProjectRoot` | interface | `{ path: string; source: ProjectRootSource }`. |
| `ProjectRootSource` | type | `"env" \| "reamrc.ts" \| "ream.config.ts" \| "package.json"`. |

The root is, in order: `REAM_PROJECT_ROOT`, then the first directory holding `reamrc.ts`, `ream.config.ts`, or a `package.json` that depends on `@c9up/ream`. A directory found above the working directory is accepted only when the current user owns it and neither group nor others can write to it (git's `safe.directory` rule, POSIX only); otherwise `detectProjectRoot()` throws `E_REAM_MCP_PROJECT_ROOT_NOT_FOUND`, and its message names the refused directory. The working directory itself and `REAM_PROJECT_ROOT` are not checked. A server registered for the user and started with `npx` has the same exposure at the `npx` level, which walks up the same way: register it per project (`ream mcp install`).

### `@c9up/ream-mcp/errors`

| Export | Kind | Description |
|---|---|---|
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors): `import * as errors from '@c9up/ream-mcp/errors'`. |

### `@c9up/ream-mcp/napi`

`core` (typed `ReamMcpCore`) holds the native functions. They take the project root and return JSON-encoded strings:

| Member | Signature | Description |
|---|---|---|
| `version` | `version(): string` | The native core's version. |
| `embeddingModel` | `embeddingModel(): string` | The pinned model: `{ name, repo, revision, dir, files: [{ path, url, sha256, bytes }] }`. |
| `indexCorpus` | `indexCorpus(root: string, full: boolean): Promise<string>` | Indexes off the main thread; resolves to `{ files_seen, files_indexed, files_unchanged, files_skipped, chunks_total, elapsed_ms }`. |
| `search` | `search(root: string, query: string, optsJson: string): string` | Hybrid search; `""` for default options. |
| `getChunk` | `getChunk(root: string, idOrTopic: string, byTopic: boolean): string \| null` | One chunk by id, or the best BM25 hit on its heading path. |
| `trace` | `trace(root: string, requirementId: string): string` | `@implements` sites: `{ sites: [{ file, line }], truncated }`. |
| `auditDrift` | `auditDrift(root: string): string` | `[{ file, stored_mtime, current_mtime }]`. |

## Tools

`tools/list` returns every tool below. Each carries MCP annotations: read-only tools set `readOnlyHint: true`; destructive ones set `destructiveHint: true`, and so do the two `inker` tools, which import and run the project's own `@c9up/inker`. Arguments are checked against the schema before the tool runs; every schema sets `additionalProperties: false`.

### Docs

| Tool | Arguments | Description |
|---|---|---|
| `docs.search` | `query: string` (required, `minLength: 1`); `package?: string`; `type?: "Markdown" \| "Readme" \| "Adr" \| "Bmad" \| "Code"`; `limit?: integer` (1 to 50, default 10) | Hybrid BM25 + cosine search over the indexed docs; ranked chunks with file and line, and a confidence label. |
| `docs.get` | `id?: string`; `topic?: string` | One chunk by id, or the top BM25 hit on its heading path when `topic` is given. |
| `docs.explain` | `symbol?: string`; `file?: string` | A symbol's declaration and signature, or a search restricted to `Code` chunks. |
| `docs.trace` | `requirement_id: string` (required, `minLength: 1`) | `@implements` annotations in the project's sources: implementations, tests and gaps for a requirement id. Files over 256 KB are skipped. |
| `docs.audit_drift` | none | Tracked files whose source changed after they were indexed. |

The corpus is `README.md`, `docs/**/*.md`, `packages/<name>/README.md`, `CORRECTIONS.md` and `_bmad-output/planning-artifacts/**/*.md`. It is indexed in the background at startup; the docs tools wait for it.

### Introspection

| Tool | Arguments | Description |
|---|---|---|
| `list.routes` | none | Every route, groups flattened, sorted by method and path. |
| `list.entities` | none | Every `@Entity` class with columns, relations and hooks. |
| `list.events` | none | Event subscribers and emitters, grouped by event name. |
| `list.providers` | none | Every `*Provider` class with its lifecycle hooks and container bindings. |
| `list.middleware` | none | HTTP middleware in pipeline order. |
| `get.config` | `key?: string` (dotted path, `app.name`) | A static parse of `config/*.ts`. Env reads appear as `{ env, default }`, other expressions as `{ unevaluated, expression }`. |
| `scheduler.list_tasks` | none | `scheduler.register(name, cron, …)` calls and `@Schedule(cron)` decorators, with file, line and a confidence score. |
| `station.list_resources` | none | `defineResource(...)` calls: name, entity, actions, file and line. |

### Generators

All generators plan without writing by default.

| Tool | Arguments | Writes |
|---|---|---|
| `generate.module` | `module`, `name` (required) | Entity, controller, validator and migration under `app/<module>/`. |
| `generate.controller` | `module`, `name` (required) | `app/<module>/<Name>Controller.ts` with CRUD stubs. |
| `generate.entity` | `module`, `name` (required) | `app/<module>/<Name>.ts`, an `@Entity` class. |
| `generate.validator` | `module`, `name` (required) | `app/<module>/<Name>Validator.ts`. |
| `generate.migration` | `name` (required) | A migration through atlas's `make:migration`, in `migrations.paths` (default `database/migrations`). |
| `generate.seeder` | `name` (required) | A seeder through atlas's `make:seeder`, in `seeders.paths` (default `database/seeders`). |

| Argument | Schema | Description |
|---|---|---|
| `module` | `string`, pattern `^[a-z][a-z0-9-]*$` | Kebab-case folder under `app/`. |
| `name` | `string`, pattern `^[A-Z][A-Za-z0-9]*$` | PascalCase class name; a migration name is snake-cased in the file name. |
| `dryRun` | `boolean`, default `true` | Returns `plannedFiles[]` without writing. |
| `confirm` | `boolean`, default `false` | Same as `dryRun: false`: writes the files. |
| `force` | `boolean`, default `false` | Allows overwriting; required when a planned file exists. |

### Migrations

| Tool | Arguments | Description |
|---|---|---|
| `migration.status` | none | `{ applied: [{ id, name, ranAt }], pending: [{ id, name, file }], currentBatch }`. Never creates the tracking table. |
| `migration.run` | `dryRun?: boolean` (default `true`); `confirm?: boolean` (default `false`) | Runs pending migrations; a dry run returns `{ wouldRun: [{ id, name, sql }] }`. |
| `migration.rollback` | `step?: integer` (minimum 1, default 1); `dryRun?: boolean` (default `true`); `confirm?: boolean` (default `false`) | Rolls back the last `step` batches, capped at the applied count; a dry run returns the reverse SQL. |

A preview imports each migration module and runs its `up()` / `down()` in the server process to collect the SQL, so it executes project code. A real run needs `dryRun: false` and `confirm: true`, and is refused unless the server was launched with `REAM_MCP_ALLOW_MIGRATIONS=1`. A production target (`REAM_ENV` or `NODE_ENV` is `production`, or a database URL that is not a sqlite file inside the project or a loopback / unix-socket server, judged on the address the driver dials: for PostgreSQL the last `host` and `hostaddr` of the URL, then `PGHOST` and `PGHOSTADDR`, a `hostaddr` winning over the host unless a socket is selected; for MySQL the URL's host or its `socket`. A parameter the driver ignores (`socket` on PostgreSQL, `host` on MySQL) proves nothing, and an address that is not an IP is not local) also needs `REAM_MCP_ALLOW_PRODUCTION_MIGRATIONS=1`. No tool argument can enable writes.

### Quality and security

| Tool | Arguments | Description |
|---|---|---|
| `quality.duplicates` | `minTokens?: integer` (minimum 1, default 20); `minLines?: integer` (minimum 1, default 3) | Duplicated fragments across the TypeScript sources, identifiers anonymised, literals kept. |
| `quality.package_report` | `package?: string` (a workspace `package.json` name) | Per package: files, lines of code, public exports, parse errors, circular dependencies, and coverage from `coverage/coverage-summary.json`. Every package when omitted. |
| `quality.dep_graph` | `format?: "json" \| "dot"` (default `json`); `scope?: "package" \| "file"` (default `package`) | The internal dependency graph, with its cycles. |
| `security.scan` | `checks?: string[]`, each one of `sql_interpolation`, `csrf_disabled`, `xss_html_raw_output`, `cookie_missing_flags`, `missing_guard_on_mutation_route`, `raw_error_not_reamerror` | Static checks of a Ream application's TypeScript and `.inker` templates; `{ findings: [{ id, severity, check, file, line, excerpt, hint, docsUrl }], scanned: { files, templates, directories, skipped }, confidence, knownGaps }`. Findings come by severity then file and line. `scanned` says what was read: the files parsed, the templates read, the top-level directories they came from and the directories left unread. `knownGaps` lists what a check could not decide or had nothing to read. `confidence` is `high` only when something was read and `knownGaps` is empty. All six run when `checks` is empty or absent. See [Security checks](#security-checks). |

#### Security checks

The scan reads the whole project root (`app/`, `start/`, `config/`, `providers/`, `bin/`, a `src/` directory, the packages it holds), and `resources/templates/**/*.inker`. `node_modules`, `dist`, `build`, `out`, `coverage`, `target`, `tmp`, `tests`, `test`, `__tests__`, `spec`, `e2e` and `fixtures` are skipped at the top of the root and of each package (a directory with a `package.json`) only: deeper down, `app/modules/build/` is application code and is read. Dot directories and `node_modules` are skipped everywhere, and one skipped inside the application's code is a `knownGaps` entry. A check with nothing to read says so in `knownGaps`: `missing_guard_on_mutation_route` when no file declares routes, `csrf_disabled` when `@c9up/blackhole` is a dependency and no blackhole configuration was read. Two verdicts depend on the ream version, read from `node_modules/@c9up/ream/package.json`, else from the range in `package.json`: when neither gives it, `knownGaps` says so.

| Check | Severity | Flags |
|---|---|---|
| `sql_interpolation` | high | A value written into the SQL of atlas's `rawQuery`, `raw`, `execute`, `query` or a `*Raw` builder method (`whereRaw`, `orderByRaw`…), by a `${}` or a `+`, instead of passed as a binding. |
| `csrf_disabled` | high | A blackhole config that turns CSRF off: `csrf: false`, `csrf: { enabled: false }`, or a `csrf.exceptRoutes` entry that matches every path (`'*'`, `'/*'`). Read in `defineConfig` imported from `@c9up/blackhole` or `@c9up/blackhole/config` (what `ream new --template web` writes), in the default export of `config/blackhole.ts`, in `createBlackhole` and in the Express, Fastify and Hono adapters. A value that is not a literal (`csrf: settings`, `enabled: flag`, a predicate `exceptRoutes`, a spread) goes to `knownGaps`. |
| `missing_guard_on_mutation_route` | high | A `post`, `put`, `patch`, `delete`, `any` or `route()` route, or a resource's `store` / `update` / `destroy`, that nothing authenticates: no `.guard()`, `.role()` or `.permission()` naming at least one guard, role or permission, no auth middleware on the route or its `router.group()` (matched by name: `'auth'`, `middleware.auth()`, a lazy import of an `auth_middleware` file; `authorAudit` is not it), and no warden `@Guard`, `@Role` or `@Permission` naming something on the controller action (read through `extends`, as warden reads it). A gate that names nothing protects nothing: ream refuses it at boot from 0.2.32. A lone `@RequireMfa()` counts from ream 0.2.32, whose route gate answers 401 to an anonymous request for it. A controller the scan cannot follow, such as one imported from a package, a group's `guards` / `roles` / `permissions` / `middleware` that is not a literal list, a gate that spreads a list it cannot read, and a lone `@RequireMfa()` when the ream version is unknown go to `knownGaps`. A route public on purpose (login, a signed webhook) is still listed. |
| `xss_html_raw_output` | medium | inker's raw output `{{{ }}}` in a template, and `new SafeString(value)` or `html.safe(value)` around a value that is not a literal or `html.escape(...)`. |
| `cookie_missing_flags` | low | A `response.cookie()`, `plainCookie()` or `encryptedCookie()` that ends up without `Secure`, `SameSite` or `HttpOnly`. From ream 0.2.32 every cookie gets `Secure`, `SameSite=lax` and `HttpOnly` by default, set for the application under `http.cookie` in `config/app.ts`: a call that leaves them out is fine, and `secure: false`, `sameSite: false`, `httpOnly: false` (or `undefined`, which drops the default) on a call, or `false` in `http.cookie`, is flagged. Before 0.2.32 ream adds only `HttpOnly`, and a call without `secure` or `sameSite` is flagged. |
| `raw_error_not_reamerror` | low | `new Error()` in a controller (a `controllers/` folder, or a `*_controller.ts` / `*Controller.ts` file) instead of an error declared with `createError()` or as an `Exception`. |

### Environment and templates

| Tool | Arguments | Description |
|---|---|---|
| `doctor.health` | none | Node and Rust versions, the NAPI binaries built and missing, and whether package versions agree. |
| `doctor.env_check` | none | The documented env vars (`set: bool`, values never echoed) and config files (`exists: bool`, with a hint). |
| `inker.list_templates` | `root?: string` (default `resources/templates`); `lint?: boolean` (default `false`) | Every `.inker` template; with `lint`, the parse errors of each, from the project's own `@c9up/inker`, imported and run in the server process. A lint that cannot load it says why in `knownGaps`. |
| `inker.render_test` | `template: string` (required, `minLength: 1`); `data?: object`; `root?: string` | Renders one template against `data` with the project's own `@c9up/inker`, imported and run in the server process, along with the template's expressions; no runtime helpers (`t`, `csrfField`, `url`, `asset` throw). Returns `{ html }`, or `{ error: { code, message, line, column } }`. A render is cut off after 5 seconds. |

### BMAD

| Tool | Arguments | Description |
|---|---|---|
| `bmad.locate` | none | The BMAD root: `bmadRoot` in `reamrc.ts`, `REAM_BMAD_ROOT`, `_bmad-output/`, `ream-legacy/_bmad-output/`, `.bmad/`; first that exists, with the candidate trace. |
| `bmad.list_epics` | none | Every epic with its stories, status merged from `sprint-status.yaml`. |
| `bmad.get_story` | `id: string` (required, pattern `^\d+\.\d+$`) | A story's full body. |
| `bmad.trace` | `requirement_id: string` (required, `minLength: 1`) | Epics, stories, code and test files that mention the id (plain text). |
| `bmad.gap_report` | none | Requirements without stories, stories without code, stories without tests. |
| `bmad.next_story` | `epic?: string` | The first story not `done`. |
| `bmad.update_status` | `id: string` (required, pattern `^[a-z0-9][a-z0-9-]+$`); `status` (required): `backlog \| ready-for-dev \| in-progress \| review \| done`; `dryRun?: boolean` (default `true`); `confirm?: boolean` (default `false`) | Changes a status in `sprint-status.yaml`; a dry run returns the diff. Writes atomically. |

## Configuration

The server reads its environment at launch; set these in the `env` block of its `.mcp.json` entry.

| Variable | Default | Description |
|---|---|---|
| `REAM_PROJECT_ROOT` | detected | The project root, skipping detection. |
| `REAM_MCP_ALLOW_MIGRATIONS` | off | `1` allows migration writes to a local database. |
| `REAM_MCP_ALLOW_PRODUCTION_MIGRATIONS` | off | `1`, with the above, allows writes to a production database. |
| `REAM_MCP_EMBEDDINGS` | off | `1` loads the downloaded embeddings model; otherwise search is BM25 only. |
| `ORT_DYLIB_PATH` | | Absolute path to the ONNX Runtime library (1.24 or newer); required with embeddings. |
| `REAM_MCP_DISABLE_EMBEDDINGS` | off | Forces embeddings off. |
| `REAM_DATABASE_URL`, `DATABASE_URL` | `reamrc.ts` | The database the migration tools use, in that order. |
| `REAM_MIGRATIONS_DIR` | `database/migrations` | The migrations directory. |
| `REAM_MIGRATIONS_TABLE` | from `config/database.ts`, else `ream_migrations` | The migrations tracking table. |
| `REAM_BMAD_ROOT` | | The BMAD root, after `reamrc.ts`'s `bmadRoot`. |
| `REAM_BIN` | the project's `ream` | The `ream` binary the generators spawn; ignored outside the project root and the temp directory. |
| `REAM_MCP_NO_SHELL` | off | `1` refuses to spawn the `ream` binary. |

The server never downloads the model: `ream-mcp-reindex --download-model` fetches it once, checks every file against the SHA-256 pinned in the native core, and deletes any file that does not match.

## Errors

An unknown tool name is a JSON-RPC error (`-32602`). A tool that runs and fails, including a refusal (`{ error, hint }`) and arguments that do not fit the schema (`{ error, problems }`), returns a result with `isError: true`; messages carry no stack trace and no absolute path. Each of the server's own refusals is a class of the `errors` namespace and a `@c9up/flare` `Exception` with status 500: branch on `error.code` or on `error instanceof errors.E_REAM_MCP_*`. Importing `@c9up/ream-mcp/napi` throws `E_REAM_MCP_UNSUPPORTED_PLATFORM` or `E_REAM_MCP_NATIVE_LOAD_FAILED` when the native binary cannot be loaded. Its `core` throws the binding's own errors, without a code; the server turns them into `E_REAM_MCP_INDEX_FAILED` or `E_REAM_MCP_INVALID_JSON`.

| Code | Raised when |
|---|---|
| [`E_INKER_RENDER_TIMEOUT`](/en/reference/errors#e-inker-render-timeout) | `inker.render_test` took longer than 5 seconds. |
| [`E_INKER_UNKNOWN`](/en/reference/errors#e-inker-unknown) | `inker.render_test` failed without an inker code. |
| [`E_INKER_PARSE_ERROR`](/en/reference/errors#e-inker-parse-error) | `inker.list_templates` with `lint` met a template error without an inker code. |
| [`E_REAM_MCP_INVALID_ARGUMENT`](/en/reference/errors#e-ream-mcp-invalid-argument) | A tool or helper was called without a required argument (`docs.get`, `docs.explain`, an empty string) or with an out-of-range duplicate-detection threshold. |
| [`E_REAM_MCP_PROJECT_ROOT_NOT_FOUND`](/en/reference/errors#e-ream-mcp-project-root-not-found) | No Ream project root was found walking up from the working directory, or the one found above it is owned by another user or writable by group or others; set `REAM_PROJECT_ROOT`. |
| [`E_REAM_MCP_UNSUPPORTED_PLATFORM`](/en/reference/errors#e-ream-mcp-unsupported-platform) | Importing `@c9up/ream-mcp/napi` on a platform with no native binary (supported: linux-x64, linux-arm64 on glibc, darwin-x64, darwin-arm64, win32-x64). |
| [`E_REAM_MCP_NATIVE_LOAD_FAILED`](/en/reference/errors#e-ream-mcp-native-load-failed) | The native binary is missing or cannot be loaded; the message names the file or the platform package, Node's error code and the fix (install the platform package, or rebuild a broken local build), `cause` is Node's error. |
| [`E_REAM_MCP_NATIVE_UNAVAILABLE`](/en/reference/errors#e-ream-mcp-native-unavailable) | The native core did not report a version at startup: the binary is missing or incompatible. |
| [`E_REAM_MCP_NATIVE_MISMATCH`](/en/reference/errors#e-ream-mcp-native-mismatch) | The native core answered something the server does not expect (trace, index statistics, model manifest): the binary is stale or from another version. |
| [`E_REAM_MCP_PATH_ESCAPE`](/en/reference/errors#e-ream-mcp-path-escape) | A migration file name or a model file path resolves outside its directory. |
| [`E_REAM_MCP_INVALID_MIGRATION`](/en/reference/errors#e-ream-mcp-invalid-migration) | A migration's default export is not a migration class, or its `getDownSQL()` does not return a list of strings. |
| [`E_REAM_MCP_MODEL_DOWNLOAD_FAILED`](/en/reference/errors#e-ream-mcp-model-download-failed) | Downloading an embeddings model file answered an HTTP error or no body. |
| [`E_REAM_MCP_MODEL_INTEGRITY`](/en/reference/errors#e-ream-mcp-model-integrity) | A downloaded model file does not match its pinned size or SHA-256; nothing is kept. |
| [`E_REAM_MCP_SHELL_DISALLOWED`](/en/reference/errors#e-ream-mcp-shell-disallowed) | `REAM_MCP_NO_SHELL=1` forbids spawning the `ream` binary. |
| [`E_REAM_MCP_CLI_NOT_FOUND`](/en/reference/errors#e-ream-mcp-cli-not-found) | The `ream` binary is neither at `$REAM_BIN` nor in the project's `node_modules/.bin`. |
| [`E_REAM_MCP_CLI_OUTPUT_INVALID`](/en/reference/errors#e-ream-mcp-cli-output-invalid) | The last line of the `ream` CLI's output is not a JSON object. |
| [`E_REAM_MCP_ALREADY_CONNECTED`](/en/reference/errors#e-ream-mcp-already-connected) | `McpServer.connect()` was called on a server that is already connected. |
| [`E_REAM_MCP_INDEX_FAILED`](/en/reference/errors#e-ream-mcp-index-failed) | The native corpus index could not be built, opened or read (`docs.*` tools, startup reindex, `ream-mcp-reindex`); `cause` is the native error. |
| [`E_REAM_MCP_INVALID_JSON`](/en/reference/errors#e-ream-mcp-invalid-json) | The native core could not read the JSON it was given (search options) or write its answer as JSON; `cause` is the native error. |
| [`E_REAM_MCP_INTERNAL`](/en/reference/errors#e-ream-mcp-internal) | An internal invariant broke (an unknown tool kind reached a dispatcher); report it as a bug. |

Other inker codes pass through from `@c9up/inker`.

## Migration

- `security.scan` no longer has a `reflect_metadata_missing` check: `@c9up/ream` imports `reflect-metadata` itself, before any of its decorators can run, so an application has nothing to add. Passing it in `checks` is now an `unknown check` refusal.
- `security.scan` answers a new `scanned` key and reads the whole project root, including a `src/` directory and the packages it holds; a directory named `build`, `test`, `fixtures`… below the top level is now read. `confidence` is no longer `high` for a scan that read nothing, nor when a check had nothing to read (`knownGaps` says which). Expect findings and gaps on code that was skipped before.
- `missing_guard_on_mutation_route` no longer counts `.guard()`, `.role()`, `.permission()` or a warden decorator that names nothing, nor a middleware whose name merely contains `auth`: name the guard (`.guard('web')`) and attach the auth middleware by its name (`.middleware('auth')`). A group config that is not a literal list now goes to `knownGaps`.
- `cookie_missing_flags` follows the cookie defaults of ream 0.2.32 (`Secure`, `SameSite=lax`, `HttpOnly`, set under `http.cookie` in `config/app.ts`): a call that leaves the flags out is no longer flagged on 0.2.32 and later; a `false` in `http.cookie` is.
- `inker.list_templates` and `inker.render_test` are annotated `readOnlyHint: false`, `destructiveHint: true`: a client that asks before such calls now asks for them. They load the real `@c9up/inker` (an export map with an `import` condition only), which they could not before.
- `detectProjectRoot()`, and so the server, refuse a root found above the working directory that another user owns or that group or others can write to (`E_REAM_MCP_PROJECT_ROOT_NOT_FOUND`): start the server in the project, or set `REAM_PROJECT_ROOT`. `E_REAM_MCP_PROJECT_ROOT_NOT_FOUND` now takes two arguments, the working directory and the reason.
- A migration write to a PostgreSQL URL with `hostaddr`, a repeated `host`, or no host while `PGHOST` / `PGHOSTADDR` name another server, to a PostgreSQL URL whose only local sign is `?socket=`, or to a MySQL URL whose only local sign is `?host=`, now needs `REAM_MCP_ALLOW_PRODUCTION_MIGRATIONS=1` unless the address the driver dials is loopback or a unix socket.
- Importing `@c9up/ream-mcp/napi` no longer throws a plain `Error`: test `error.code` for `E_REAM_MCP_UNSUPPORTED_PLATFORM` or `E_REAM_MCP_NATIVE_LOAD_FAILED`.
- `detectProjectRoot()` no longer throws a plain `Error`: test `error.code === 'E_REAM_MCP_PROJECT_ROOT_NOT_FOUND'`, or `error instanceof errors.E_REAM_MCP_PROJECT_ROOT_NOT_FOUND` with `import * as errors from '@c9up/ream-mcp/errors'`.

## See also

- [AI agents (MCP)](/en/guides/digging-deeper/mcp)
- [ream-cli](/en/reference/ream-cli)
