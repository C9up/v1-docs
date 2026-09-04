# Ream MCP — the server for agents

`@c9up/ream-mcp` is Ream's Model Context Protocol server. It turns a project into an agent-readable workspace: an LLM queries grounded documentation, introspects the live project, scaffolds code and navigates traceability, instead of loading hundreds of files into its context.

## Install

```sh
npx @c9up/ream-mcp        # launches the stdio server
```

The server finds the project root by walking up from the working directory, checking in order:

1. `reamrc.ts` — the canonical config name
2. `ream.config.ts` — the legacy alias
3. a `package.json` naming `@c9up/ream` in its dependencies

`REAM_PROJECT_ROOT=/path/to/project` overrides it.

## The tools

Call `tools/list` for the authoritative descriptors — they track the package. The current categories:

| Category | What it exposes |
|---|---|
| `docs` | grounded documentation + hybrid search over Ream's docs |
| `introspect` | routes, providers, decorated services |
| `generate` | controllers, entities, providers, modules… |
| `migrations` | status, run, rollback |
| `security` | security-surface checks |
| `doctor` | environment health checks |
| `inker` | template-engine helpers |
| `station` | admin-panel tooling |
| `scheduler` | scheduled-task inspection |
| `bmad` | BMAD workflow helpers |

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
