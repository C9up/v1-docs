# Extending ream

This guide covers writing a package that plugs into ream:

- How `ream add` invokes your hook
- The `configure()` hook
- Package shape
- The `flags` parameter
- Error handling conventions
- Idempotency
- File extension conventions
- First-party plugin reference implementations

A Ream plugin is an npm package that ships a `configure()` hook so the maintainer of a Ream application can run `ream add <pkg>` and have the package register itself: provider wired into `reamrc.ts`, environment variables stubbed, config files scaffolded. This page documents the public contract — the `configure()` signature, the `Codemods` API, the required package shape, and the conventions that make a plugin behave the same way the first-party packages (atlas, nova, photon, rover, sigil, spectrum, warden) do.

This page is for **plugin authors**. Application developers consuming plugins should read [Add a Package](/en/guides/command-line/generators#add-a-package) and the [installation guide](/en/start/installation#adding-a-ream-package) instead.

## How `ream add` invokes your hook

When a user runs `pnpm ream add @community/your-plugin`, the CLI:

1. Auto-detects the project package manager from the lockfile (`pnpm-lock.yaml` > `yarn.lock` > `package-lock.json`).
2. Runs `<pm> add [-D] @community/your-plugin` to install the package.
3. Imports your `configure` hook — first from the lightweight `@community/your-plugin/configure` subpath, falling back to the root `@community/your-plugin` if the subpath is not exported.
4. Calls `await configure(command, flags)` inside a `node --import @swc-node/register/esm-register` child process.

The subpath form is loaded under `@swc-node/register`, so a `configure.ts` loads without a build step while you develop the plugin (see [Publishing: source in development, `dist/` on npm](/en/guides/concepts/extending#publishing-source-in-development-dist-on-npm)).

## The `configure()` hook

```typescript title="src/configure.ts"
import type { Codemods, Prompt } from '@c9up/ream'

interface ConfigureCommand {
  name: string
  force: boolean
  parsedFlags: Record<string, string | number | boolean | Array<string | number | boolean>>
  parsedArgs: string[]
  prompt: Prompt
  logger: { success(m: string): void; info(m: string): void; warning(m: string): void; error(m: string): void }
  exitCode?: number
  stubsRoot?: string
  createCodemods(): Promise<Codemods>
}

export async function configure(command: ConfigureCommand): Promise<void> {
  const codemods = await command.createCodemods()
  // ...
}
```

The first argument is the command running the hook. It also exposes every `Codemods` method directly, and the raw flags arrive as the second argument (see [The `flags` parameter](/en/guides/concepts/extending#the-flags-parameter)), so a hook written as `configure(codemods, flags)` keeps working.

| Property | What it holds |
|---|---|
| `name` | The package being configured. |
| `force` | `true` under `--force`; the codemods then overwrite existing files. |
| `parsedFlags` | The unknown flags, parsed: `--store=redis` → `'redis'`, `--ssl` → `true`, `--no-ssl` → `ssl: false`, `--retries=3` → `3`, a repeated flag → an array. `force` is present when it was passed. |
| `parsedArgs` | Always `[]`: positionals are refused before the hook runs. |
| `prompt` | Asks the user: `ask`, `secure`, `confirm`, `toggle`, `choice`, `multiple`, `autocomplete`. |
| `logger`, `ui`, `colors` | Terminal output. |
| `exitCode` | Set it to a non-zero value to make the command fail without throwing. |
| `stubsRoot` | The `stubsRoot` your module exports, if any. |
| `createCodemods()` | The codemods, bound to the project and to `--force`. |

### Asking the user

Read the flag first, and prompt only when it is absent, so the same hook works in a terminal and in a script:

```typescript
let store = command.parsedFlags.store
if (!store) {
  store = await command.prompt.choice('Select the lock store', ['redis', 'memory'], { default: 0 })
}
if (store !== 'redis' && store !== 'memory') {
  command.logger.error(`Invalid lock store "${store}"`)
  command.exitCode = 1
  return
}
```

A run without a terminal on stdin, or with `CI` set, never waits for an answer. A prompt that has a `default` returns it (through its `validate` and `result`), and one without a default fails at once with `E_CONSOLE_NOT_INTERACTIVE`, naming the question. For `choice`, `autocomplete` and `multiple` the default is an index (an array of indexes for `multiple`).

The hook is async and returns `Promise<void>`. Throw to abort: any error escaping the function exits `ream add` with code 1 (and `ream configure` with code 1). The CLI does not catch and continue — a failed configure leaves the package installed but the project unconfigured.

The hook runs once per `ream add` / `ream configure` invocation. It MUST be idempotent: a user re-running `ream add` after upgrading the package SHOULD see no destructive changes. The `Codemods` methods below are designed to be safe to re-run — `addProvider`, `addEnvVars`, `writeFile`, `registerCommand`, `defineEnvValidations` and `addPreloadFile` silently skip already-applied changes; `registerMiddleware` is per-tier idempotent and additionally rejects cross-tier collisions outright (registering the same import path in both `server` AND `router` throws). Any direct file writes you perform outside `Codemods` MUST follow the same convention.

## Package shape

A plugin is an ESM-only TypeScript package. The minimum `package.json`:

```json title="package.json"
{
  "name": "@community/your-plugin",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./configure": "./src/configure.ts"
  },
  "peerDependencies": {
    "@c9up/ream": "^X.Y.0"
  },
  "engines": {
    "node": ">=22.0.0"
  }
}
```

| Field | Required | Notes |
|---|---|---|
| `type: "module"` | Required | Plugins are ESM-only — `ream-cli` loads them via dynamic `import()`. |
| `exports["./configure"]` | Recommended | Lets `ream-cli` load the hook without pulling in your runtime. Falls back to the root export if absent. |
| `peerDependencies["@c9up/ream"]` | Recommended | The `Codemods` interface is its public contract. Pin a SemVer range for the major version you support. |
| `engines.node` | Recommended | Match `@c9up/ream` (currently `>=24.0.0`). |

### Publishing: source in development, `dist/` on npm

The first-party packages run from their TypeScript source while they are developed — the committed `exports` point at `src/` — and publish compiled JavaScript: their `publishConfig` redirects `main` / `types` / `exports` to `dist/`, so the tarball carries `dist/*.js` + `.d.ts` built just before `pnpm publish`. A consumer without a TypeScript loader can import them.

Do the same for a plugin: develop against `src/`, and publish with `publishConfig` pointing `exports["./configure"]` (and the rest) at the compiled JS. The contract only requires that `<pkg>/configure` resolve to a module exporting a named `configure` function.

## The `flags` parameter

The hook's second argument carries the unknown flags unparsed. `command.parsedFlags` holds the same flags parsed (see above). `ream add @community/your-plugin --foo=bar --foo=baz --queue=redis` forwards them as:

```typescript
flags = {
  foo: ['bar', 'baz'],
  queue: ['redis'],
}
```

The reserved flags `--dev` and `--force` are consumed by `ream-cli` itself and never appear in `flags`. Flag names must match `^[a-zA-Z][a-zA-Z0-9_-]*$` — anything else is rejected by the CLI before the hook runs. Empty values (`--foo=`) are also rejected.

Inside the hook, treat `flags` as untrusted input — validate the keys and values you read:

```typescript
const transports = flags?.transports ?? []
if (transports.length === 0) {
  // default behaviour
}
```

Document the flags your hook accepts in your plugin README so consumers know what to pass.

## Error handling conventions

Throw a regular `Error` (or a subclass) with the `[configure]` prefix when something fails. The first-party `Codemods` implementation uses this prefix consistently, so users see a uniform error shape regardless of which package raised it:

```typescript
if (!flags?.apiToken?.[0]) {
  throw new Error('[configure] Missing required flag --apiToken — pass it via `ream add @community/your-plugin --apiToken=<token>`.')
}
```

`ream add` exits 1 if any throw escapes the hook. The package is left installed (the install step ran first) but the project state is whatever the hook achieved before throwing. Codemods are not transactional — order your calls so that the most likely-to-fail step runs first, and prefer fail-fast validation at the top of the hook over partial side effects.

## Idempotency

The five `Codemods` methods deduplicate by design:

- `addProvider` skips if the exact import path is already present in `reamrc.ts`.
- `addEnvVars` skips keys already present in `.env` / `.env.example` (unless `overwrite`).
- `writeFile` skips existing files unless `force` is set.
- `registerCommand` skips if the exact import path is already present in `reamrc.ts`.
- `registerMiddleware` skips if the exact import path is already present in the targeted tier's `<tier>.use([...])` block, and rejects cross-tier collisions outright.

If you write files outside `Codemods`, follow the same convention. For files the user is expected to integrate into existing config (rather than consume verbatim), prefer the snippet pattern below instead of writing directly.

## File extension conventions

When `writeFile` would create a file the user actively maintains (the canonical example: `config/mail.ts` after the user has already configured a transport), do NOT clobber it — write a **snippet** file instead:

```typescript
await codemods.writeFile(
  'config/mail.your-plugin-snippet.ts',
  '// Paste this block into your config/mail.ts under `transports: { ... }`.\n// ...',
)
```

Recommended naming:

| Use case | Path | Notes |
|---|---|---|
| Standalone config | `config/<plugin>.ts` | Safe in a fresh project — no existing file at that path. |
| Snippet for user-maintained config | `config/<plugin>-snippet.ts` | `.snippet` suffix or descriptive name avoids accidental import. |
| Migration file | `database/migrations/<NNNN>_<name>.ts` | Idempotent on the exact path; user runs `ream migrate` afterward. |

## First-party plugin reference implementations

The first-party packages each ship a `configure.ts` you can grep for real-world patterns:

- [Atlas (ORM)](/en/guides/database/orm/) — `packages/atlas/src/configure.ts` — simplest reference: `addProvider` + `addEnvVars` + one `writeFile` for `config/database.ts`.
- [Nova (Notifications)](/en/guides/digging-deeper/push/) — `packages/nova/src/configure.ts` — advanced reference: reads a migration template via `node:fs/promises` + `node:url`, scaffolds a Service Worker, layers multiple `writeFile` calls.
- [Photon (Frontend)](/en/guides/frontend/photon/) — `packages/photon/src/configure.ts` — moderate reference: inline string templates for `config/photon.ts`.
- [Rover (Mail)](/en/guides/digging-deeper/mail/) — exposes `registerTransport` for the worked example above.
- [Sigil (Password Hashing)](/en/guides/security/hashing) — minimal hook with no env vars.
- [Spectrum (Logging)](/en/guides/digging-deeper/logger/) — provider + log-driver config.
- [Warden (Auth)](/en/guides/auth/introduction) — JWT secret stubbing + auth config.

## Next Steps
- [Add a Package](/en/guides/command-line/generators#add-a-package) — the consumer-side documentation for `ream add`.
- [Installation — Adding a Ream package](/en/start/installation#adding-a-ream-package) — high-level overview from the application developer's angle.
- [Providers](/en/guides/concepts/providers) — what providers do and how they integrate with the framework lifecycle.
