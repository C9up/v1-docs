# Installation

## Requirements

- **Node.js 22+** (LTS) — required for NAPI stability
- **pnpm** — recommended package manager (npm/yarn also work)
- **@swc/core + @swc-node/register** — for TypeScript decorator metadata support
- No Rust toolchain needed — NAPI binaries are prebuilt

## Create a New Project

```bash
mkdir my-app && cd my-app
pnpm init
```

Install the core framework and runtime:

```bash
pnpm add @c9up/ream reflect-metadata
pnpm add -D @swc/core @swc-node/register typescript
```

## Adding Modules

Each module is an independent package. Add only what you need:

```bash
# ORM (SQLite/PostgreSQL)
pnpm add @c9up/atlas better-sqlite3
pnpm add -D @types/better-sqlite3

# Authentication (JWT, guards)
pnpm add @c9up/warden

# Validation
pnpm add @c9up/rune

# Logging
pnpm add @c9up/spectrum

# Event bus (Rust-powered)
pnpm add @c9up/pulsar
```

### Adding a Ream package

Once you have a Ream project (`ream new my-app`), the canonical one-step way to add a first-party package is:

```bash
pnpm ream add @c9up/atlas
```

This installs `@c9up/atlas` with your project's package manager (auto-detected from the lockfile — pnpm > yarn > npm) AND runs `ream configure @c9up/atlas` to wire the provider into `reamrc.ts`, populate the `.env` placeholders, and scaffold any config / migration files. Pass `--dev` to install as a devDependency and `--force` to overwrite existing config files. Unknown trailing flags are forwarded to the package's `configure()` hook:

```bash
pnpm ream add @c9up/photon --dev
pnpm ream add @c9up/some-pkg --transports=smtp --transports=resend --queue=redis
```

The manual two-step alternative is `pnpm add @c9up/atlas && pnpm ream configure @c9up/atlas` — useful if you want to install with a specific version pin or workspace flag that `ream add` doesn't expose.

#### Why doesn't `ream add` fail if the package has no configure hook?

Some packages (typically community ones) ship without a `configure` export. In that case `ream add` still completes the install, prints a `Note: <pkg> has no configure() hook` line, and exits 0. The package is installed and ready to import; any wiring is documented in the package's own README. (`ream configure <pkg>` on the same package would exit 1, since "configure" is the explicit ask and "no hook" is a hard failure for that command.)

Authors: see [Plugin System](./plugin-system) for how to ship a configurable plugin.

## Source-first publishing convention

Ream packages publish their TypeScript source (`src/**/*.ts`) directly — they do NOT ship a pre-built `dist/` directory. Your project compiles them via `@swc-node/register` (already required for decorator metadata, see [Requirements](#requirements)).

This is a deliberate framework convention. It keeps stack traces in production pointing at real source line numbers, avoids a stale-artifact class of bug where a published `dist/` drifts from its source, and lets you patch a dependency in-place during development by editing files inside `node_modules/@c9up/<pkg>/src/`. The trade-off is that consumers carry the SWC compile cost; in practice this is negligible because `@swc-node/register` caches and decorator-using projects already pay it.

The single exception is `@c9up/ream-mcp`, which publishes a built `dist/` because it's a developer tool spawned outside the framework's runtime context — its consumers (editor agents, MCP clients) don't run under `@swc-node/register` and need a self-contained artifact.

## Project Setup

Create the framework configuration:

```typescript
// reamrc.ts
import { defineConfig } from '@c9up/ream'

export default defineConfig({
  providers: [
    () => import('@c9up/spectrum/provider'),
    () => import('@c9up/atlas/provider'),
    () => import('@c9up/warden/provider'),
    () => import('./providers/AppProvider.ts'),
  ],
  preloads: [
    () => import('./start/kernel.ts'),
  ],
  modules: {
    path: './app/modules',
  },
})
```

Create the server entry point:

```typescript
// bin/server.ts
import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@c9up/ream'

const APP_ROOT = new URL('../', import.meta.url)

new Ignitor(APP_ROOT, { port: 3000 })
  .tap((app) => {
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .useRcFile((await import('../reamrc.js')).default)
  .httpServer()
  .start()
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })
```

## SWC Configuration

Create `.swcrc` at the project root for decorator metadata support:

```json
{
  "jsc": {
    "parser": { "syntax": "typescript", "decorators": true },
    "transform": { "legacyDecorator": true, "decoratorMetadata": true },
    "target": "es2022"
  },
  "module": { "type": "es6" }
}
```

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true
  }
}
```

## Package Scripts

```json
{
  "scripts": {
    "dev": "node --import @swc-node/register/esm-register --watch bin/server.ts",
    "start": "node --import @swc-node/register/esm-register bin/server.ts",
    "build": "tsc",
    "test": "vitest run"
  }
}
```

## Run

```bash
pnpm dev
```

## Next Steps

- [Quick Start](/en/guide/quick-start) — Build an API in 5 minutes
- [Folder Structure](/en/guide/folder-structure) — Understand the project layout
