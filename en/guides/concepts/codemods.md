# The Codemods API

This guide covers the codemods a configure hook can run:

- `addProvider(importPath)`
- `addEnvVars(vars, options?)`
- `writeFile(filePath, content, options?)`
- `makeUsingStub(stubsRoot, stubPath, state?, options?)`
- `registerCommand(importPath)`
- `registerMiddleware(importPath, options?)`
- `defineEnvValidations(definition)`
- `addPreloadFile(modulePath, environments?)`

## The `Codemods` API

`await command.createCodemods()` returns the `Codemods`, which change the project. Its methods cover the recurring patterns: register a provider or a preload, seed environment variables and their validation rules, scaffold config or migration files from a stub, register a CLI command, and register HTTP middleware. The live source is at `packages/ream/src/Codemods.ts:4`.

```typescript
interface Codemods {
  addProvider(importPath: string): Promise<void>
  addEnvVars(
    vars: Record<string, string>,
    options?: { omitFromExample?: string[]; overwrite?: boolean },
  ): Promise<void>
  writeFile(filePath: string, content: string, options?: { force?: boolean }): Promise<void>
  makeUsingStub(
    stubsRoot: string,
    stubPath: string,
    state?: Record<string, string | number | boolean>,
    options?: { force?: boolean },
  ): Promise<{ path: string; contents: string }>
  registerCommand(importPath: string): Promise<void>
  registerMiddleware(
    importPath: string,
    options?: { tier?: 'server' | 'router'; position?: 'before' | 'after' },
  ): Promise<void>
  defineEnvValidations(definition: {
    leadingComment?: string
    variables: Record<string, string>
    overwrite?: boolean
  }): Promise<string[]>
  addPreloadFile(
    modulePath: string,
    environments?: Array<'web' | 'console' | 'test' | 'repl'>,
  ): Promise<void>
}
```

### `addProvider(importPath)`

Inserts a `() => import('<importPath>'),` entry into the `providers: [ ... ]` array of `reamrc.ts`. Idempotent — already-registered paths are skipped. The dedup check matches the exact import string wrapped in either single or double quotes (`'@pkg/sub'` or `"@pkg/sub"`).

```typescript
await codemods.addProvider('@community/your-plugin/provider')
```

**Known limitation.** `addProvider` is a regex-based codemod, not a TypeScript AST transform. It works for the canonical `providers: [ ... ]` shape emitted by `ream new` and tolerates comments and whitespace around the array literal. It does NOT handle unusual shapes — providers spread from a const, providers built via a ternary, providers extracted into a separate `const providers = [...]` above the config object — see the JSDoc at `packages/ream/src/Codemods.ts:76`. Document this limitation in your plugin README so users with non-canonical layouts know to edit `reamrc.ts` by hand.

### `addEnvVars(vars, options?)`

Appends `KEY=value` pairs to `.env` (creating the file if missing) and to `.env.example` when the project has one, so a fresh clone learns the variables exist. Idempotent — a key already present at the start of a line is left untouched in either file, so values written by the user or a prior configure run are preserved; `overwrite: true` (or a codemods instance created with `force`) replaces that line in place instead.

Keys listed in `omitFromExample` are written empty (`KEY=`) to `.env.example`, so a secret's development value never reaches the committed file. A value or key holding a line break is refused before anything is written.

```typescript
await codemods.addEnvVars(
  { POSTMARK_API_URL: 'https://api.postmarkapp.com', POSTMARK_API_TOKEN: '<your-postmark-token>' },
  { omitFromExample: ['POSTMARK_API_TOKEN'] },
)
```

Use placeholder values that signal "fill me in" (an empty string, a `<placeholder>` tag, or a development-only fallback). Do NOT commit production secrets through `addEnvVars`.

### `writeFile(filePath, content, options?)`

Writes a file under the project root. The path is resolved relative to the project root and rejected if it escapes the root via `..` or symlinks. Idempotent — existing files are left untouched unless `options.force` is set (forwarded by `ream add --force` / `ream configure --force`).

```typescript
await codemods.writeFile('config/your-plugin.ts', `import { defineConfig } from '@community/your-plugin'

export default defineConfig({
  // ...
})
`)
```

Errors thrown by `writeFile` use the `[configure]` prefix and explain the constraint that was violated (absolute path, symlink escape, write outside root).

### `makeUsingStub(stubsRoot, stubPath, state?, options?)`

**This is how a package generates a file.** `writeFile` still exists, but it is
for content you COMPUTE; anything you template belongs in a stub.

A stub is a plain file shipped with your package. Its front matter names where
it lands, and `{{ name }}` placeholders are filled from `state`:

```
---
to: config/your-plugin.ts
---
import { defineConfig } from '@community/your-plugin'

export default defineConfig({
  adapter: '{{ adapter }}',
})
```

```typescript
// src/stubs.ts — its own module, so a caller can import the root alone
import { join } from 'node:path'
export const stubsRoot = join(import.meta.dirname, '..', 'stubs')
```

```typescript
import { stubsRoot } from './stubs.js'

await codemods.makeUsingStub(stubsRoot, 'config/your-plugin.stub', {
  adapter: 'tailwind',
})
```

Add `"stubs"` to your package's `files` array, or the stubs will not ship.

**The application's copy wins.** A file published to `stubs/<stubPath>` in the
project is used instead of yours — which is what lets someone change the config
your package generates without forking it. It is the same rule the `make:`
generators follow for `stubs/make/`.

The destination is rendered too, so `to: config/{{ name }}.ts` lets one stub
serve several outputs. An unknown placeholder is left alone rather than blanked:
a stub that silently loses a line is worse than one that visibly kept a
`{{ }}`. The destination goes through the same guard as `writeFile` — no
absolute path, no `..`, no symlink out of the project — and a stub with no
`to:` is refused rather than guessed at.

A stub is not limited to placeholders. The full grammar is there:

```
{{! a comment }}
{{#expect name, entity }}
{{#var plural = name + 's' }}
{{#if entity.isModel }}…{{#elif entity.isView }}…{{#else}}…{{/if}}
{{#each methods as method, index }}  {{ method }}()
{{/each}}
```

**No HTML escaping.** `{{ }}` does NOT escape HTML. A stub is a source file, and
turning `"` into `&quot;` there produces code that does not parse — silently.
`{{{ }}}` means the same thing, and `escape` turns escaping back on for anyone
templating markup.

**A stub cannot run code.** The template is read once and interpreted, never
compiled to JavaScript. An expression is the part of JavaScript a stub needs —
names, `a.b`, `a?.b`, `a[i]`, calls, `! - + * / %`, comparisons, `&& || ??`,
`? :`, `[…]` and `{…}` — and it reaches only what it is given: the state's own
properties and the `length` of a string or a list. No prototype
(`constructor`, `__proto__`), no global (`process`, `require`), no method a
value inherits (`name.toUpperCase()` is not a function): a helper is a function
the state passes, `{{ string.pascalCase(name) }}`.

A value a stub reads and the caller did not pass is an error naming it, not a
`{{ missing }}` travelling into the generated file.

**The Rust half.** `ream-cli` renders the `make:` stubs, and it cannot evaluate
the engine's expressions without embedding a runtime. It does the
substitution itself for a stub that only has placeholders — most of them — and
hands anything with a block to Node, so both halves read the same grammar.

### `registerCommand(importPath)`

Inserts a `() => import('<importPath>'),` entry into the `commands: [ ... ]` array of `reamrc.ts`. Bootstraps a `commands: []` field when absent — inserts immediately after the existing `providers: [...]` block when present, otherwise before the closing `})` of `defineConfig({...})`. Idempotent — already-registered paths are skipped, with the same single/double-quote dedup as `addProvider`.

```typescript
await codemods.registerCommand('@community/your-plugin/commands/my-command.js')
```

The import path must point at a module whose default export satisfies the command contract in `packages/ream/src/console/types.ts`: a class carrying `commandName`, `description` and, optionally, `options` / `args` / `flags` as statics. The `ConsoleKernel` (`packages/ream/src/Ignitor.ts`) loads every `commands[]` entry when the console starts. That array is for commands shipped by packages: an application's own commands are discovered automatically in `commands/` and must not be declared there too — registering both ways raises `E_CONSOLE_DUPLICATE_COMMAND`. Errors raised by `registerCommand` use the `[configure]` prefix — the missing-file and missing-`defineConfig({})` cases each carry the import path in the message so the failure points at the user's config, not the plugin code.

### `registerMiddleware(importPath, options?)`

Inserts a `() => import('<importPath>'),` entry into the appropriate `<tier>.use([ ... ])` array of `start/kernel.ts`. The `tier` option chooses between `'server'` (runs on every request including 404s — fits security headers, request-id propagation, structured logging) and `'router'` (runs on matched routes only — fits auth, CSRF, route-level concerns). Defaults to `'router'`, the conservative choice that does not interfere with 404 responses.

The entry is **appended** to the array by default (`position: 'after'`), so it runs after the middleware already there. Pass `position: 'before'` to prepend it, for a middleware the others depend on — a session store that a CSRF check reads, for instance. Any other value throws `[configure] Invalid middleware position`.

```typescript
await codemods.registerMiddleware('@community/your-plugin/middleware/headers.js', { tier: 'server' })
await codemods.registerMiddleware('@community/your-plugin/middleware/session.js', { position: 'before' })
```

Idempotent **per tier** — calling `registerMiddleware` twice with the same importPath and tier produces a single entry. Cross-tier collision is rejected: registering the same importPath in both `server` AND `router` is almost always a mistake; the second call throws `[configure] middleware <importPath> is already registered in <other-tier> tier`.

Unlike `registerCommand`, this method does NOT bootstrap a missing `<tier>.use([])` block. The `server.use` and `router.use` calls in `start/kernel.ts` are user-authored idiom (with their own `import server from '@c9up/ream/services/server'` boilerplate), not a config-shape contract — synthesising them is footgun-prone if the user has renamed identifiers. When the targeted block is absent, the codemod errors with `[configure] Could not find '<tier>.use([' in start/kernel.ts` and asks the user to add it manually.

### `defineEnvValidations(definition)`

Adds validation rules to the schema object `start/env.ts` passes to `Env.create`, so the variables your hook writes with `addEnvVars` are checked at boot like the application's own. Each key of `variables` is a variable name; each value is the rule's source code.

```typescript
const kept = await codemods.defineEnvValidations({
  leadingComment: 'Variables for @community/your-plugin',
  variables: {
    YOUR_PLUGIN_HOST: "Env.schema.string({ format: 'host' })",
    YOUR_PLUGIN_PORT: 'Env.schema.number()',
  },
})
```

The rules are appended at the end of the schema object, under a banner comment built from `leadingComment` (a blank line only when there is none). The banner is written only when none of the variables already existed in the file. A variable the schema already declares is left as it is, since the user may have tightened its rule: the method resolves to the names kept that way with a rule different from the one requested, so your hook can tell the user. Pass `overwrite: true` (typically your `--force` flag) to replace them instead.

A variable name must match `[A-Za-z_][A-Za-z0-9_]*`, a rule must be one complete expression (balanced brackets, closed strings, no top-level comma, no `//` comment) and the comment must be one line without `*/`; anything else throws a `[configure]` error before the file is touched. A missing `start/env.ts`, a file without an `Env.create(...)` call, or a schema that is not an object literal (a variable, a spread) also throws: add the rules by hand in those cases.

### `addPreloadFile(modulePath, environments?)`

Registers a file in the `preloads` array of `reamrc.ts`. A package whose configure hook writes a `start/*.ts` file needs this: a preload that is not listed is never loaded.

```typescript
await codemods.makeUsingStub(stubsRoot, 'start/your-plugin.stub')
await codemods.addPreloadFile('#start/your-plugin.js')
await codemods.addPreloadFile('#start/your-plugin-dev.js', ['web'])
```

The entry is appended at the end of the array, which is created when absent. With `environments` listing some of `web`, `console`, `test` and `repl`, the entry is `{ file: () => import('…'), environment: [...] }`; without it, or with all four, it is a plain `() => import('…')`. A module the array already imports, in either form, is left untouched. The module path cannot contain quotes, a backslash or a line break, and an unknown environment is refused, both with a `[configure]` error. `reamrc.ts` must export a `defineConfig({ ... })` call or an object literal, and an existing `preloads` must be an array literal.
