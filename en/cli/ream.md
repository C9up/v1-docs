# ream CLI

Rust-native command-line tool for the Ream framework. Instant startup (<10ms), no Node.js boot penalty.

## Install

```bash
npm install -g @c9up/ream-cli
```

## Project Management

```bash
ream new my-app           # Create a new project (interactive)
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
ream migrate                # Run all pending migrations
ream migrate:rollback       # Rollback the last batch of migrations
ream migrate:status         # Show the status of all migrations (applied / pending)
```

## Diagnostics

```bash
ream doctor    # Environment health checks
ream info      # Version + environment info
```

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

See [ADR-006](../../../_bmad-output/planning-artifacts/adr-006-ream-cli-versioning.md) for the full rationale and gate semantics.
