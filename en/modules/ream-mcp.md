# Ream MCP — the server for agents

`@c9up/ream-mcp` is Ream's Model Context Protocol server. It turns a project into an agent-readable workspace: an LLM queries grounded documentation, introspects the live project, scaffolds code and navigates traceability, instead of loading hundreds of files into its context.

## Install

```sh
npx --no @c9up/ream-mcp   # launches the stdio server
```

The server finds the project root by walking up from the working directory, checking in order:

1. `reamrc.ts` — the canonical config name
2. `ream.config.ts` — the legacy alias
3. a `package.json` naming `@c9up/ream` in its dependencies

`REAM_PROJECT_ROOT=/path/to/project` overrides it.

`ream mcp install` registers it in the project's `.mcp.json`, a file meant to be
committed, so the entry is the same on every machine: `npx --no @c9up/ream-mcp`,
with no absolute path. `--no` runs the version the project's lockfile pins and
never downloads one, so add the server as a dependency first:

```sh
ream add -D @c9up/ream-mcp
ream mcp install
```

## The tools

Call `tools/list` for the authoritative descriptors — they track the package. The current categories:

| Category | What it exposes |
|---|---|
| `docs` | grounded documentation + hybrid search over the project's docs (see below) |
| `introspect` | routes, providers, decorated services |
| `generate` | controllers, entities, providers, modules… |
| `migrations` | status, run, rollback |
| `security` | security-surface checks |
| `doctor` | environment health checks |
| `inker` | template-engine helpers |
| `station` | admin-panel tooling |
| `scheduler` | scheduled-task inspection |
| `bmad` | BMAD workflow helpers |

## The docs corpus

The `docs` tools index a fixed set of files and nothing else: the root
`README.md`, `docs/**/*.md`, `packages/<name>/README.md` and
`packages/<name>/CORRECTIONS.md`, and `_bmad-output/planning-artifacts/**/*.md`.
Markdown anywhere else — what an app's users upload under `storage/`, a note in
`tmp/` — never reaches the agent as documentation.

## Migration writes

`migration.run` and `migration.rollback` preview by default. Running one for
real (`dryRun: false, confirm: true`) is refused unless the user enabled it
when launching the server — the model calling a tool writes all of its
arguments, so no argument can:

| Launch env | Allows |
|---|---|
| `REAM_MCP_ALLOW_MIGRATIONS=1` | writes to a local database: a sqlite file inside the project, or a loopback / unix-socket server |
| `REAM_MCP_ALLOW_PRODUCTION_MIGRATIONS=1`, with the above | writes to production: `REAM_ENV` / `NODE_ENV` is `production`, or the database URL is anything not provably local |

Set them in the `env` block of the server's `.mcp.json` entry:

```json
{
  "mcpServers": {
    "ream": {
      "command": "npx",
      "args": ["--no", "@c9up/ream-mcp"],
      "env": { "REAM_MCP_ALLOW_MIGRATIONS": "1" }
    }
  }
}
```

A preview is not side-effect free either: to collect the SQL it imports each
migration module and runs its `up()` / `down()` inside the server, so it
executes the project's code.

## Errors

An unknown tool name is a JSON-RPC error (`-32602`). A tool that runs and
fails — including every structured refusal (`{ error, hint }`) — returns a
result with `isError: true`. Messages carry no stack trace and no absolute
path; the full detail goes to the server's `stderr`.

Each tool also declares MCP annotations (`readOnlyHint`, `destructiveHint`),
so a client can ask before the calls that write and let the read-only ones
through.

## Architecture

TypeScript + Rust through NAPI, like [Atom](/en/modules/atom) and the core's events:

```
packages/ream-mcp/
├── src/                    TS server + utilities
├── crates/
│   ├── ream-mcp-core/      pure Rust business logic
│   └── ream-mcp-napi/      thin #[napi] bindings
└── scripts/copy-napi.mjs   cargo cdylib → .node copy
```

**A stdio MCP server must never write to `stdout`** — that would corrupt the JSON-RPC stream. All observability goes through `stderr`, and any tool added here inherits that constraint.

## Generating code

The `generate` tools delegate to [ream-cli](/en/modules/ream-cli) and hand back its JSON output verbatim. They propose first (`plannedFiles`) and write only after confirmation, so an agent can show what it is about to do before doing it.
