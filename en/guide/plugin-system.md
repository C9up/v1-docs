# Plugin System

A Ream plugin is an npm package that ships a `configure()` hook so the maintainer of a Ream application can run `ream add <pkg>` and have the package register itself: provider wired into `reamrc.ts`, environment variables stubbed, config files scaffolded. This page documents the public contract — the `configure()` signature, the `Codemods` API, the required package shape, and the conventions that make a plugin behave the same way the first-party packages (atlas, nova, photon, rover, sigil, spectrum, warden) do.

This page is for **plugin authors**. Application developers consuming plugins should read [Add a Package](/en/cli/ream#add-a-package) and the [installation guide](/en/guide/installation#adding-a-ream-package) instead.

## How `ream add` invokes your hook

When a user runs `pnpm ream add @community/your-plugin`, the CLI:

1. Auto-detects the project package manager from the lockfile (`pnpm-lock.yaml` > `yarn.lock` > `package-lock.json`).
2. Runs `<pm> add [-D] @community/your-plugin` to install the package.
3. Imports your `configure` hook — first from the lightweight `@community/your-plugin/configure` subpath, falling back to the root `@community/your-plugin` if the subpath is not exported.
4. Calls `await configure(codemods, flags)` inside a `node --import @swc-node/register/esm-register` child process.

The subpath form is loaded under `@swc-node/register`, so authoring `configure.ts` directly (no build step) works out of the box per ADR-003 — Package Publish Strategy (source-first).

## The `configure()` hook

```typescript title="src/configure.ts"
import type { Codemods } from '@c9up/ream'

export async function configure(
  codemods: Codemods,
  flags?: Record<string, string[]>,
): Promise<void> {
  // ...
}
```

The hook is async and returns `Promise<void>`. Throw to abort: any error escaping the function exits `ream add` with code 1 (and `ream configure` with code 1). The CLI does not catch and continue — a failed configure leaves the package installed but the project unconfigured.

The hook runs once per `ream add` / `ream configure` invocation. It MUST be idempotent: a user re-running `ream add` after upgrading the package SHOULD see no destructive changes. The five `Codemods` methods below are designed to be safe to re-run — `addProvider`, `addEnvVars`, `writeFile`, and `registerCommand` silently skip already-applied changes; `registerMiddleware` is per-tier idempotent and additionally rejects cross-tier collisions outright (registering the same import path in both `server` AND `router` throws). Any direct file writes you perform outside `Codemods` MUST follow the same convention.

## The `Codemods` API

The `Codemods` interface is the only argument you operate on. Its five methods cover the recurring patterns: register a provider, seed environment variables, scaffold config or migration files, register a CLI command, and register HTTP middleware. The live source is at `packages/ream/src/Codemods.ts:4`.

```typescript
interface Codemods {
  addProvider(importPath: string): Promise<void>
  addEnvVars(vars: Record<string, string>): Promise<void>
  writeFile(filePath: string, content: string, options?: { force?: boolean }): Promise<void>
  registerCommand(importPath: string): Promise<void>
  registerMiddleware(importPath: string, options?: { tier?: 'server' | 'router' }): Promise<void>
}
```

### `addProvider(importPath)`

Inserts a `() => import('<importPath>'),` entry into the `providers: [ ... ]` array of `reamrc.ts` (live implementation at `packages/ream/src/Codemods.ts:86`). Idempotent — already-registered paths are skipped. The dedup check matches the exact import string wrapped in either single or double quotes (`'@pkg/sub'` or `"@pkg/sub"`).

```typescript
await codemods.addProvider('@community/your-plugin/provider')
```

**Known limitation.** `addProvider` is a regex-based codemod, not a TypeScript AST transform. It works for the canonical `providers: [ ... ]` shape emitted by `ream new` and tolerates comments and whitespace around the array literal. It does NOT handle unusual shapes — providers spread from a const, providers built via a ternary, providers extracted into a separate `const providers = [...]` above the config object — see the JSDoc at `packages/ream/src/Codemods.ts:76`. Document this limitation in your plugin README so users with non-canonical layouts know to edit `reamrc.ts` by hand.

### `addEnvVars(vars)`

Appends `KEY=value` pairs to `.env` (creating the file if missing; live implementation at `packages/ream/src/Codemods.ts:119`). Idempotent — keys already present at the start of any line in `.env` are left untouched, so existing values written by the user or a prior configure run are preserved.

```typescript
await codemods.addEnvVars({
  POSTMARK_API_TOKEN: '<your-postmark-token>',
})
```

Use placeholder values that signal "fill me in" (an empty string, a `<placeholder>` tag, or a development-only fallback). Do NOT commit production secrets through `addEnvVars`.

### `writeFile(filePath, content, options?)`

Writes a file under the project root (live implementation at `packages/ream/src/Codemods.ts:135`). The path is resolved relative to the project root and rejected if it escapes the root via `..` or symlinks. Idempotent — existing files are left untouched unless `options.force` is set (forwarded by `ream add --force` / `ream configure --force`).

```typescript
await codemods.writeFile('config/your-plugin.ts', `import { defineConfig } from '@community/your-plugin'

export default defineConfig({
  // ...
})
`)
```

Errors thrown by `writeFile` use the `[configure]` prefix and explain the constraint that was violated (absolute path, symlink escape, write outside root).

### `registerCommand(importPath)`

Inserts a `() => import('<importPath>'),` entry into the `commands: [ ... ]` array of `reamrc.ts` (live implementation at `packages/ream/src/Codemods.ts:196`). Bootstraps a `commands: []` field when absent — inserts immediately after the existing `providers: [...]` block when present, otherwise before the closing `})` of `defineConfig({...})`. Idempotent — already-registered paths are skipped, with the same single/double-quote dedup as `addProvider`.

```typescript
await codemods.registerCommand('@community/your-plugin/commands/my-command.js')
```

The import path must point at a module whose default export matches the `Command` shape in `packages/ream/src/console/CommandRunner.ts:8` (`{ name, description, run }`). The `ConsoleKernel` (`packages/ream/src/Ignitor.ts:566`) auto-loads every `commands[]` entry at boot. Errors raised by `registerCommand` use the `[configure]` prefix — the missing-file and missing-`defineConfig({})` cases each carry the import path in the message so the failure points at the user's config, not the plugin code.

### `registerMiddleware(importPath, options?)`

Inserts a `() => import('<importPath>'),` entry into the appropriate `<tier>.use([ ... ])` array of `start/kernel.ts` (live implementation at `packages/ream/src/Codemods.ts:285`). The `tier` option chooses between `'server'` (runs on every request including 404s — fits security headers, request-id propagation, structured logging) and `'router'` (runs on matched routes only — fits auth, CSRF, route-level concerns). Defaults to `'router'`, the conservative choice that does not interfere with 404 responses.

```typescript
await codemods.registerMiddleware('@community/your-plugin/middleware/headers.js', { tier: 'server' })
```

Idempotent **per tier** — calling `registerMiddleware` twice with the same importPath and tier produces a single entry. Cross-tier collision is rejected: registering the same importPath in both `server` AND `router` is almost always a mistake; the second call throws `[configure] middleware <importPath> is already registered in <other-tier> tier`.

Unlike `registerCommand`, this method does NOT bootstrap a missing `<tier>.use([])` block. The `server.use` and `router.use` calls in `start/kernel.ts` are user-authored idiom (with their own `import server from '@c9up/ream/services/server'` boilerplate), not a config-shape contract — synthesising them is footgun-prone if the user has renamed identifiers. When the targeted block is absent, the codemod errors with `[configure] Could not find '<tier>.use([' in start/kernel.ts` and asks the user to add it manually.

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
| `engines.node` | Recommended | Match `@c9up/ream` (currently `>=22.0.0`). |

### Source-first authoring (ADR-003)

The recommended shape is to ship `.ts` files verbatim and let the consumer's loader (`@swc-node/register`, `tsx`, Bun) compile them — no `dist/` build step. This matches how the first-party packages publish (see ADR-003 — Package Publish Strategy — for the full rationale).

If you prefer to publish a built `dist/` (for example because your runtime depends on tooling not available in TS-aware loaders), point `exports["./configure"]` at the compiled JS. The contract only requires that `<pkg>/configure` resolve to a module exporting a named `configure` function.

## The `flags` parameter

`ream add @community/your-plugin --foo=bar --foo=baz --queue=redis` forwards the unknown flags to your hook as:

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

Throw a regular `Error` (or a subclass) with the `[configure]` prefix when something fails. The first-party `Codemods` implementation uses this prefix consistently (see `packages/ream/src/Codemods.ts:90, 110, 137, 141, 156, 165, 200, 251, 292, 302, 314, 322`), so users see a uniform error shape regardless of which package raised it:

```typescript
if (!flags?.apiToken?.[0]) {
  throw new Error('[configure] Missing required flag --apiToken — pass it via `ream add @community/your-plugin --apiToken=<token>`.')
}
```

`ream add` exits 1 if any throw escapes the hook. The package is left installed (the install step ran first) but the project state is whatever the hook achieved before throwing. Codemods are not transactional — order your calls so that the most likely-to-fail step runs first, and prefer fail-fast validation at the top of the hook over partial side effects.

## Idempotency

The five `Codemods` methods deduplicate by design:

- `addProvider` skips if the exact import path is already present in `reamrc.ts`.
- `addEnvVars` skips keys already present in `.env`.
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

## Worked example: Postmark transport for Rover

This walks through publishing a community Postmark transport for [Rover (Mail)](/en/modules/rover). The transport implements `MailTransport` so the user can reference `transport: 'postmark'` in `config/mail.ts` after running `ream add @community/postmark-rover-transport`.

The package layout:

```
@community/postmark-rover-transport/
├── package.json
└── src/
    ├── index.ts       # PostmarkTransport class implementing MailTransport
    └── configure.ts   # configure() hook
```

### `package.json`

```json title="package.json"
{
  "name": "@community/postmark-rover-transport",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./configure": "./src/configure.ts"
  },
  "peerDependencies": {
    "@c9up/ream": "^X.Y.0",
    "@c9up/rover": "^X.Y.0"
  },
  "engines": {
    "node": ">=22.0.0"
  }
}
```

### `src/index.ts`

```typescript title="src/index.ts"
import type { MailMessage, MailSendOutcome, MailTransport } from '@c9up/rover'

interface PostmarkConfig {
  apiToken: string
}

export class PostmarkTransport implements MailTransport {
  readonly #config: PostmarkConfig

  constructor(config: Record<string, unknown>) {
    const apiToken = config.apiToken
    if (typeof apiToken !== 'string' || apiToken.length === 0) {
      throw new Error('[postmark-transport] Missing apiToken in transport config.')
    }
    this.#config = { apiToken }
  }

  async send(message: MailMessage): Promise<MailSendOutcome> {
    if (message.to.length === 0) {
      throw new Error('[postmark-transport] No recipients in message — `to` is empty.')
    }
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': this.#config.apiToken,
      },
      body: JSON.stringify({
        From: message.from,
        To: message.to.join(', '),
        Cc: message.cc.length > 0 ? message.cc.join(', ') : undefined,
        Bcc: message.bcc.length > 0 ? message.bcc.join(', ') : undefined,
        ReplyTo: message.replyTo,
        Subject: message.subject,
        HtmlBody: message.html,
        TextBody: message.text,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`[postmark-transport] Postmark rejected message: ${response.status} ${body}`)
    }

    const payload: unknown = await response.json()
    const providerId =
      payload !== null && typeof payload === 'object' && 'MessageID' in payload && typeof payload.MessageID === 'string'
        ? payload.MessageID
        : undefined

    return providerId !== undefined ? { providerId } : undefined
  }
}
```

### `src/configure.ts`

```typescript title="src/configure.ts"
import type { Codemods } from '@c9up/ream'

const SNIPPET = `// Paste this block into your config/mail.ts under \`transports: { ... }\`:
//
//   postmark: {
//     transport: 'postmark',
//     apiToken: process.env.POSTMARK_API_TOKEN ?? '',
//   }
//
// Then register the transport once at boot (e.g. in a provider's boot() method):
//
//   import { registerTransport } from '@c9up/rover'
//   import { PostmarkTransport } from '@community/postmark-rover-transport'
//   registerTransport('postmark', (config) => new PostmarkTransport(config))
`

export async function configure(codemods: Codemods): Promise<void> {
  await codemods.addEnvVars({
    POSTMARK_API_TOKEN: '<your-postmark-token>',
  })
  await codemods.writeFile('config/mail.postmark-snippet.ts', SNIPPET)
  console.log('  Note: Snippet written to config/mail.postmark-snippet.ts — paste into your config/mail.ts under `transports:`.')
}
```

The hook deliberately writes a `*-snippet.ts` file rather than touching `config/mail.ts` directly — `ream add` runs after the user has already configured `@c9up/rover`, so `config/mail.ts` exists and is actively maintained. Clobbering it would overwrite their other transports; the snippet pattern leaves the integration step under user control.

If your transport plugin also ships a CLI command (e.g. `mail:send-test`), call `await codemods.registerCommand('@community/postmark-rover-transport/commands/send-test.js')` from the same configure hook — `registerCommand` will bootstrap the `commands: []` field in `reamrc.ts` if absent, then add the entry idempotently.

### What the user sees

```bash
$ pnpm ream add @community/postmark-rover-transport

  Adding @community/postmark-rover-transport with pnpm...
  ...
  Configuring @community/postmark-rover-transport...
  Note: Snippet written to config/mail.postmark-snippet.ts — paste into your config/mail.ts under `transports:`.
  Done! @community/postmark-rover-transport configured.
```

The user pastes the snippet into their `config/mail.ts`, fills in `POSTMARK_API_TOKEN` in `.env`, and starts using `transport: 'postmark'` in their mail config.

## First-party plugin reference implementations

The first-party packages each ship a `configure.ts` you can grep for real-world patterns:

- [Atlas (ORM)](/en/modules/atlas) — `packages/atlas/src/configure.ts` — simplest reference: `addProvider` + `addEnvVars` + one `writeFile` for `config/database.ts`.
- [Nova (Notifications)](/en/modules/nova) — `packages/nova/src/configure.ts` — advanced reference: reads a migration template via `node:fs/promises` + `node:url`, scaffolds a Service Worker, layers multiple `writeFile` calls.
- [Photon (Frontend)](/en/modules/photon) — `packages/photon/src/configure.ts` — moderate reference: inline string templates for `config/photon.ts`.
- [Rover (Mail)](/en/modules/rover) — exposes `registerTransport` for the worked example above.
- [Sigil (Password Hashing)](/en/modules/sigil) — minimal hook with no env vars.
- [Spectrum (Logging)](/en/modules/spectrum) — provider + log-driver config.
- [Warden (Auth)](/en/modules/warden) — JWT secret stubbing + auth config.

## Next Steps

- [Add a Package](/en/cli/ream#add-a-package) — the consumer-side documentation for `ream add`.
- [Installation — Adding a Ream package](/en/guide/installation#adding-a-ream-package) — high-level overview from the application developer's angle.
- [Providers](/en/guide/providers) — what providers do and how they integrate with the framework lifecycle.
