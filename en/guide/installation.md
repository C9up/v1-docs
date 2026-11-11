# Installation

## Requirements

- **Node.js 24+** — ream's `engines` floor: the request context runs on `AsyncLocalStorage`, which Node 24 makes cheap by default
- **pnpm** — recommended package manager (npm/yarn also work)
- **@swc/core + @swc-node/register** — for TypeScript decorator metadata support
- No Rust toolchain needed — NAPI binaries are prebuilt

## Create a New Project

The scaffold comes from the CLI, `@c9up/ream-cli`:

```bash
npm install -g @c9up/ream-cli
ream new my-app
cd my-app
ream dev
```

`ream new` asks two questions (or takes `--template` and `--db`), writes the project and installs its dependencies:

1. **Template** — `api` (backend API), `web` (full stack), `microservice` (event driven), `slim` (minimum)
2. **Database** — `postgres` or `sqlite`

## Manual Setup

To set a project up by hand instead:

```bash
mkdir my-app && cd my-app
pnpm init
```

Install the core framework and runtime:

```bash
pnpm add @c9up/ream reflect-metadata
pnpm add -D @swc/core @swc-node/register typescript @c9up/ream-cli @c9up/helix
```

## Adding Modules

Each module is an independent package. Add only what you need:

```bash
# ORM (SQLite, PostgreSQL, MySQL)
pnpm add @c9up/atlas

# Authentication (JWT, guards)
pnpm add @c9up/warden

# Social sign-in (Google, GitHub, ...)
pnpm add @c9up/transit

# Validation
pnpm add @c9up/rune

# Logging
pnpm add @c9up/spectrum
```

> The event bus is part of ream core — no separate install. See
> [Event Bus](/en/ream/events).

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

## Publishing convention: source in development, `dist/` on npm

Inside the Ream monorepo and during development, packages run **straight from their TypeScript source** (`src/**/*.ts`): every `package.json`'s `exports` points at `src/`, so an edit to `packages/*/src` is picked up immediately, with no build step, through `@swc-node/register`. No `--conditions` flag is needed.

At publish time, each package's `publishConfig` redirects `main` / `types` / `exports` to `dist/`: pnpm substitutes those values in the tarball, so consumers without a TypeScript transform receive compiled JavaScript (`dist/*.js` + `.d.ts`), while the committed `package.json` stays source-first. `dist/` is produced by `pnpm build` just before `pnpm publish` (and is never committed — it is in `.gitignore`).

Why both rather than publishing only the source: a Node consumer outside the Ream toolchain (without `@swc-node/register`) could not import a `src/*.ts` package. Why not only `dist/`: the monorepo's dev loop would then pay for a permanent watch build. `publishConfig` covers both needs without forcing one on the other. The `sourceMap` + `declarationMap` the build emits keep consumers' stack traces pointing at the real source lines.

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

A first route — every module's `routes.ts` under `app/modules/` is loaded at start:

```typescript
// app/modules/home/routes.ts
import router from '@c9up/ream/services/router'

router.get('/', async ({ response }) => {
  response.send('Hello from Ream!')
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
    "test": "ream test"
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
