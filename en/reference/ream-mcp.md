# ream-mcp

`@c9up/ream-mcp`: a Model Context Protocol server over stdio that lets a coding agent search the project's docs, introspect its routes and providers, scaffold code, run migrations and scan for security issues. Guide: [AI agents (MCP)](/en/guides/digging-deeper/mcp).

## Installation

```bash
pnpm add -D @c9up/ream-mcp
ream mcp install
```

`ream mcp install` registers the server in the project's `.mcp.json` as `npx --no @c9up/ream-mcp`, which runs the version the lockfile pins and never downloads one. `@c9up/atlas` is an optional peer dependency, needed by the migration tools and by `generate.migration` / `generate.seeder`.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/ream-mcp` | Starts the stdio server when imported or run. Exports nothing. |
| `@c9up/ream-mcp/napi` | `core`: the native indexer and search engine. |
| `@c9up/ream-mcp/util/project-root` | `detectProjectRoot()` and its types. |

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

The root is, in order: `REAM_PROJECT_ROOT`, then the first directory holding `reamrc.ts`, `ream.config.ts`, or a `package.json` that depends on `@c9up/ream`.

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

`tools/list` returns every tool below. Each carries MCP annotations: read-only tools set `readOnlyHint: true`; destructive ones set `destructiveHint: true`. Arguments are checked against the schema before the tool runs; every schema sets `additionalProperties: false`.

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

A preview imports each migration module and runs its `up()` / `down()` in the server process to collect the SQL, so it executes project code. A real run needs `dryRun: false` and `confirm: true`, and is refused unless the server was launched with `REAM_MCP_ALLOW_MIGRATIONS=1`. A production target (`REAM_ENV` or `NODE_ENV` is `production`, or a database URL that is not a sqlite file inside the project or a loopback / unix-socket server) also needs `REAM_MCP_ALLOW_PRODUCTION_MIGRATIONS=1`. No tool argument can enable writes.

### Quality and security

| Tool | Arguments | Description |
|---|---|---|
| `quality.duplicates` | `minTokens?: integer` (minimum 1, default 20); `minLines?: integer` (minimum 1, default 3) | Duplicated fragments across the TypeScript sources, identifiers anonymised, literals kept. |
| `quality.package_report` | `package?: string` (a workspace `package.json` name) | Per package: files, lines of code, public exports, parse errors, circular dependencies, and coverage from `coverage/coverage-summary.json`. Every package when omitted. |
| `quality.dep_graph` | `format?: "json" \| "dot"` (default `json`); `scope?: "package" \| "file"` (default `package`) | The internal dependency graph, with its cycles. |
| `security.scan` | `checks?: string[]`, each one of `sql_interpolation`, `csrf_disabled`, `xss_html_raw_output`, `cookie_missing_flags`, `reflect_metadata_missing`, `missing_guard_on_mutation_route`, `raw_error_not_reamerror` | Static checks; `{ findings: [{ id, severity, check, file, line, excerpt, hint, docsUrl }] }`, by severity then file and line. All seven run when `checks` is empty or absent. |

### Environment and templates

| Tool | Arguments | Description |
|---|---|---|
| `doctor.health` | none | Node and Rust versions, the NAPI binaries built and missing, and whether package versions agree. |
| `doctor.env_check` | none | The documented env vars (`set: bool`, values never echoed) and config files (`exists: bool`, with a hint). |
| `inker.list_templates` | `root?: string` (default `resources/templates`); `lint?: boolean` (default `false`) | Every `.inker` template; with `lint`, the parse errors of each. |
| `inker.render_test` | `template: string` (required, `minLength: 1`); `data?: object`; `root?: string` | Renders one template against `data`, with no runtime helpers (`t`, `csrfField`, `url`, `asset` throw). Returns `{ html }`, or `{ error: { code, message, line, column } }`. A render is cut off after 5 seconds. |

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

An unknown tool name is a JSON-RPC error (`-32602`). A tool that runs and fails, including a refusal (`{ error, hint }`) and arguments that do not fit the schema (`{ error, problems }`), returns a result with `isError: true`; messages carry no stack trace and no absolute path.

| Code | Raised when |
|---|---|
| [`E_INKER_RENDER_TIMEOUT`](/en/reference/errors#e-inker-render-timeout) | `inker.render_test` took longer than 5 seconds. |
| [`E_INKER_UNKNOWN`](/en/reference/errors#e-inker-unknown) | `inker.render_test` failed without an inker code. |
| [`E_INKER_PARSE_ERROR`](/en/reference/errors#e-inker-parse-error) | `inker.list_templates` with `lint` met a template error without an inker code. |

Other inker codes pass through from `@c9up/inker`.

## See also

- [AI agents (MCP)](/en/guides/digging-deeper/mcp)
- [ream-cli](/en/reference/ream-cli)
