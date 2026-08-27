# ream CLI

Rust-native command-line tool for the Ream framework. Instant startup (<10ms), no Node.js boot penalty.

## Install

```bash
npm install -g @c9up/ream-cli
```

## Project Management

```bash
ream new my-app           # Create a new project (interactive)
ream new my-app --yes     # …taking the defaults, with no terminal needed
ream dev                   # Start development server
ream build                 # Compile TypeScript
ream start                 # Run production server
```

## Add a Package

```bash
ream add @c9up/atlas                                  # install + configure in one step
ream add @c9up/photon --dev                           # devDependency
ream add @c9up/atlas --force                          # overwrite existing config files
ream add @c9up/some-pkg --transports=smtp --queue=redis  # forward flags to configure()
```

`ream add` auto-detects your package manager from the lockfile (`pnpm-lock.yaml` > `yarn.lock` > `package-lock.json`), runs the install (`<pm> add [-D] <pkg>`), then dispatches to `ream configure <pkg>`. Unknown flags after the package name are forwarded verbatim to the package's `configure(codemods, flags)` hook as `Record<string, string[]>`. If the package has no configure hook, the install still succeeds and `ream add` exits 0 with a one-line note — see the FAQ in the [installation guide](/en/guide/installation#adding-a-ream-package).

If multiple lockfiles coexist (e.g. a stale `package-lock.json` next to `pnpm-lock.yaml`), the precedence wins and a warning naming the ignored lockfile is printed to stderr. If no lockfile is present, `ream add` exits non-zero with a clear error and the manual two-step fallback (`pnpm add <pkg> && ream configure <pkg>`).

Authors: see [Plugin System](/en/guide/plugin-system) for how to ship a configurable plugin.

## Code Generation

```bash
ream make:controller order Order     # app/modules/order/controllers/OrderController.ts
ream make:service order Payment      # app/modules/order/services/PaymentService.ts
ream make:entity order OrderItem     # app/modules/order/entities/OrderItem.ts
ream make:validator order CreateOrder
ream make:provider Stripe
ream make:migration create_orders_table
```

### Customising what gets generated

Every `make:` template can be overridden per project, the way AdonisJS lets an
app publish and edit its stubs. Publish one, edit it, and the generator uses
your copy from then on:

```bash
ream stubs:publish --list          # what can be published, and the variables each exposes
ream stubs:publish controller      # writes stubs/make/controller.stub
ream stubs:publish                 # publishes every one
ream stubs:publish controller --force   # overwrite a stub you already published
```

A stub is plain text with `{{ variable }}` placeholders:

```
// stubs/make/controller.stub
import type { HttpContext } from '@c9up/ream'

export class {{ className }} {
  async index({ response }: HttpContext) {
    response.status(200).json([])
  }
}
```

A published stub is generated FROM the built-in template, so it starts as an
exact copy of what you already get. Delete the file to go back to the default.

A stub can also choose where it writes, the way an Adonis stub opens with
`{{{ exports({ to: … }) }}}`. That line is JavaScript, which a Rust binary
cannot evaluate, so the same declaration is written as front matter:

```
---
to: src/http/{{ module }}/{{ className }}.ts
---
export class {{ className }} {
}
```

Omit the front matter and the default path is used. The declared path goes
through the same validation as any generated path — no absolute paths, no `..`
— which is what `app.httpControllersPath()` enforces on the Adonis side.

**One named deviation from AdonisJS**, because this generator is a Rust binary
rather than a Node process: stubs are **substituted, not rendered by a template
engine**. Adonis runs them through tempura (`{{#var}}`, conditionals, partials);
here `{{ name }}` is replaced and nothing else. An unknown placeholder is left
visible rather than silently emptied, and a malformed stub is an error rather
than a silent fallback to the built-in.

## Package Configuration

> If you also want to install the package in one step, see [Add a Package](#add-a-package).

```bash
ream configure @c9up/atlas     # DB config, provider, env vars
ream configure @c9up/warden    # JWT config, provider
ream configure @c9up/photon    # frontend rendering config
ream configure @c9up/some-pkg --transports=smtp  # forward flags to configure()
```

> **Tailwind?** Tailwind is not a Ream-managed package. Install it directly into your Vite stack: `pnpm add -D tailwindcss @tailwindcss/vite`, then add `tailwindcss()` to your `vite.config.ts` plugins. See `/en/modules/tailwind` for the full recipe.

## Migrations

```bash
ream migrate                # Run pending migrations, for every registered store
ream migrate:rollback       # Rollback the last batch
ream migrate:status         # Show what has run and what has not
ream migrate --only eon     # Just one store
```

### Every store, not just the relational one

Output is prefixed by the store it came from:

```
  [atlas] ✓ 001_create_users (batch 1)
  [eon]   ○ 001_create_meters
```

**This is one of the places Ream deliberately does better than AdonisJS.**
Upstream has no equivalent, and does not need one: Lucid is its only migration
source, so `node ace migration:run` can name it. Ream expects several stores in
one app — a relational one, a time-series one, whatever comes next — so the CLI
names none of them.

A data package registers its runner from its provider, under the app's
`migrations` binding. Two consequences worth knowing:

- **Shipping a new store never requires a new CLI.** The `ream` binary is
  published apart from the packages; anything it knew about a package name
  would be a version coupling.
- **An app with only a time-series store can migrate.** The command used to
  refuse to start without a `database/migrations/` directory, which is atlas's
  convention. Each runner now knows its own directory.

Sources run **sequentially**, not in parallel: two stores sharing a database
server would contend on locks, and interleaved output makes a failure
impossible to attribute.

### Writing a runner for your own store

Three methods are required — the three the commands call:

```ts
interface MigrationRunnerContract {
  migrate(): Promise<string[]>              // names applied, in order
  rollback(): Promise<string[]>             // names rolled back
  status(): Promise<MigrationStatusNode[]>  // { name, status, batch? }

  reset?(): Promise<string[]>               // the rest are optional
  refresh?(): Promise<unknown>
  fresh?(): Promise<unknown>
  dryRun?(): Promise<unknown>
  forceUnlock?(): Promise<boolean>
}
```

The rest are optional on purpose: a store must be able to register a runner
that only knows how to go forward, rather than stub methods it cannot honour.

Register it from your provider, resolving the binding structurally so your
package does not depend on `@c9up/ream`:

```ts
const registry = await container.resolve('migrations')
registry.register({
  name: 'mystore',
  directory: 'database/mystore-migrations',
  runner: myRunner,
})
```

Registering a name twice is refused rather than silently replaced — one of the
two providers would migrate nothing while the run still reported success.

::: warning Upgrading from an older ream
`ream migrate` needs the `migrations` binding, which `@c9up/ream` provides from
0.2.0 on. Against an older app the command says so and exits 1, rather than
failing on a token you have never heard of. An app with the binding but no data
package is a different case — it reports that nothing registered, and exits 0.
:::

## Creating a Project

`ream new` asks for a template and a database. Each prompt is skipped by
passing its flag, and `--yes` takes the default for whatever is left — so the
command runs in CI, in a container, or from a script, where there is no
terminal to prompt on:

```bash
ream new my-app                                # interactive
ream new my-app --template api --db postgres   # no prompt at all
ream new my-app --yes                          # api + postgres
ream new my-app --template slim --yes          # slim + postgres
```

| Flag | Values | Default |
| --- | --- | --- |
| `--template` | `api`, `web`, `microservice`, `slim` | `api` |
| `--db` | `postgres`, `sqlite` | `postgres` |
| `--yes`, `-y` | — | take the defaults for anything not passed |

An unknown value is rejected before any prompt runs, so a typo reports itself
as a command-line error rather than as a missing terminal.

## Diagnostics

```bash
ream doctor    # Environment health checks
ream info      # Version + environment info
```

`ream doctor` checks Node, pnpm, `.env`, `reamrc.ts`, `package.json`,
`tsconfig.json` — and `@swc-node/register`.

That last one matters more than it looks. `ream dev`, `build`, `console`,
`test`, `inspect`, `repl`, `migration:*` and `schedule:*` all run your
TypeScript through that loader, resolved from **your** project's
`node_modules`: the CLI is a Rust binary and ships no JavaScript dependencies
of its own. Without it those commands stop, while the generators keep working
— so a project can look healthy while two thirds of the CLI is unusable.

`ream new` puts it in the generated `package.json`. For a project created
before, `doctor` names the fix, and each affected command refuses up front
rather than dying on Node's `ERR_MODULE_NOT_FOUND`:

```
[XX] @swc-node/register: missing — `ream dev`, `build`, `console`, `test`,
     `inspect`, `repl`, `migration:*` and `schedule:*` cannot run
     Fix: Run `pnpm add -D @swc-node/register`
```

Declared in `package.json` but absent from `node_modules` is a different
sentence — the manifest is right and the tree is stale, so it says
`pnpm install` rather than `pnpm add`.

## Built with Rust

The `ream` binary is a compiled Rust executable. Code generation, scaffolding, configuration, and diagnostics run in pure Rust with no Node.js overhead. Only `ream dev`, `ream start`, and `ream build` spawn Node.js processes.

Binary size: ~700KB.

## Releasing ream-cli

### Cadence

Publishing is manual. Maintainers trigger a release via the GitHub Actions UI (Actions → Build & Publish CLI → Run workflow) on the ream-cli repository — no tag-push auto-publish. This matches ADR-006's "trigger-only-via-UI" gate so a stray local tag push never reaches npm.

### Version-bump sequence

```bash
# 1) Bump version
cd packages/ream-cli && $EDITOR Cargo.toml   # change version = "X.Y.Z"
git add Cargo.toml && git commit -m "release: ream-cli vX.Y.Z"

# 2) Tag (after the release commit lands on main — via PR if main is protected)
git tag -a vX.Y.Z -m "ream-cli vX.Y.Z"
git push origin vX.Y.Z

# 3) Trigger publish from GHA UI → Actions → Build & Publish CLI → Run workflow
#    Select the vX.Y.Z tag as the ref (NOT main) so gates resolve the right tag.
```

### SemVer rule

- Feature addition (new subcommand, new public API surface) → MINOR bump.
- Bug fix with no surface change → PATCH bump.
- Internal-only refactor with no consumer-visible change → no bump.

### Override (`confirm_overwrite: YES`)

The drift gate refuses to publish when the npm registry already has a version greater than or equal to the local `Cargo.toml`. The `confirm_overwrite` workflow input (default `no`) accepts the literal string `YES` to bypass this guard. Use it only for:

- Re-publishing the same version after a broken initial publish (registry has a tombstoned tarball but `Cargo.toml` was not yet bumped).
- Deliberate rollback when the latest registry version is broken and the maintainer wants to ship an older local snapshot.

Any other failure (no tag on HEAD, tag-vs-`Cargo.toml` mismatch, npm registry unreachable) is fail-closed: there is no override.

See ADR-006 (internal planning artifact) for the full rationale and gate semantics.
