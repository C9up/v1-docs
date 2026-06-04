# Publishing & CI

Ream's `@c9up/*` packages with native Rust code (NAPI bindings) ship pre-compiled
`.node` binaries via GitHub Actions on each push to `main`. Consumers do
`pnpm install @c9up/<pkg>` and the binary for their platform resolves automatically
at install time — no `cargo build` on the user's machine.

This guide covers the CI pipeline, the consumer install experience, and how to
recover from a missing-binary error.

## Supported platforms

Each package's CI workflow runs on the following native runners. All five build
in parallel; a release ships only when every cell goes green.

| `process.platform` | `process.arch` | Suffix | GitHub runner |
| --- | --- | --- | --- |
| `linux` | `x64` (glibc) | `linux-x64-gnu` | `ubuntu-latest` |
| `linux` | `arm64` (glibc) | `linux-arm64-gnu` | `ubuntu-24.04-arm` |
| `darwin` | `x64` | `darwin-x64` | `macos-13` |
| `darwin` | `arm64` | `darwin-arm64` | `macos-14` |
| `win32` | `x64` (MSVC) | `win32-x64-msvc` | `windows-latest` |

The matrix uses native runners; no cross-compilation toolchain is involved. Each
runner builds for its own platform via `cargo build --release -p <crate>-napi`,
then a small `scripts/copy-napi.mjs` script positions the artefact as
`index.<suffix>.node` next to the package's `package.json`.

Atlas ships **two** NAPI artefacts (`index.<suffix>.node` for `atlas-query-napi`,
`db.<suffix>.node` for `atlas-db-napi`). ream itself ships several
(`index`, `scheduler`, `events`), each following the same
`<name>.<suffix>.node` convention.

Out of scope (today):

- Linux x64 musl. Adding `linux-x64-musl` would require a `cross`-based or
  Docker-based build, breaking the native-runners-only constraint.
- Linux arm64 musl.
- Bun support — the workflow uses `pnpm install` and `pnpm test`.
- Per-platform subpackages via npm `optionalDependencies`. See "Future" below.

## CI flow per package

Each NAPI-shipping package has a workflow at
`packages/<pkg>/.github/workflows/ci.yml` (per-submodule) — except `ream-mcp`,
which is inline in the `ream-dev` repo and uses a `paths` filter to scope its
triggers.

### Triggers

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:
```

`workflow_dispatch` is the manual trigger used to run a publish (see below).

### Jobs

1. **`build-and-test`** — 5-platform matrix (`fail-fast: false`). Each cell
   runs `pnpm install` → `pnpm build:napi` → `pnpm test --reporter=json`.
   A jq-based smoke gate asserts zero skipped tests, then
   `actions/upload-artifact@v4` uploads `index.<suffix>.node` (with
   `if-no-files-found: error` so an unexpected missing artefact fails CI).

2. **`cargo-tests`** — single-platform `ubuntu-latest`. Runs
   `cargo test --workspace`. Rust logic is platform-independent, so the
   matrix would only burn cycles.

3. **`publish`** — single-platform `ubuntu-latest`,
   `if: github.event_name == 'workflow_dispatch'`,
   `needs: [build-and-test, cargo-tests]`. Validates `NPM_TOKEN`, downloads
   all 5 platform artefacts via `actions/download-artifact@v4`, runs
   `pnpm publish --access public --no-git-checks`.

   Currently **enabled only on `@c9up/sigil`** as the publish canary. The
   other 8 sweep packages ship the publish job commented-out until the
   ream-cli npm version sync strategy clears (Story 52.4 Decision C).

## How to publish

The publish flow is **manual on purpose**. Tag-triggered publishes can fire
on accidentally-pushed local tags; `workflow_dispatch` requires a deliberate
UI click per package per release.

1. Open the package's GitHub repo (e.g. `github.com/C9up/sigil`).
2. Go to **Actions** → **`<pkg>`-ci** → **Run workflow**.
3. Pick `main` and click **Run workflow**.
4. The matrix runs (build-and-test on 5 runners, cargo-tests on 1, publish on
   1 once both gates are green).
5. The new version appears on npm; consumers running `pnpm install @c9up/<pkg>`
   resolve the new tarball.

The `NPM_TOKEN` repository secret must be set in the GitHub repo settings
before the publish job runs. The job emits a clear error if it's absent.

## Consumer install

```bash
pnpm install @c9up/sigil
```

The `package.json` `files` array includes `index.*.node`, so the published
tarball ships **all 5 platform binaries** in one package (~5MB overhead per
package; acceptable for the current iteration). The package's `index.js`
loads the right binary at runtime by reading `process.platform` +
`process.arch` and `require()`-ing `./index.<suffix>.node`.

If your platform isn't in the matrix above, you can build from source:

```bash
git clone <package-repo>
cd <pkg>
pnpm install
pnpm build:napi   # cargo build --release -p <crate>-napi + copy-napi.mjs
```

Then `npm link` the local checkout into your project.

## Troubleshooting — `E_<PKG>_NAPI_REQUIRED`

If a Ream module throws an error like:

```
[SIGIL_NAPI_REQUIRED] argon2 driver requires the prebuilt NAPI binary at
packages/sigil/index.<platform>.node. To build it locally:
  cd packages/sigil && pnpm build:napi
```

…the prebuilt binary couldn't be loaded for your platform. This usually means
either:

- You're on a platform outside the 5-supported set (rare-arch case — build
  from source as shown above).
- The package was installed in a way that didn't bundle the binary (e.g.
  vendored dist, copy-paste of `src/`). Reinstall via `pnpm install`.
- The native module is out of date with your Node ABI. Rebuild:
  `pnpm --filter @c9up/<pkg> build:napi`.

Each NAPI-shipping package carries its own troubleshooting section in its
module doc:

- [`@c9up/sigil`](/en/modules/sigil#troubleshooting-sigil-napi-required)

The other packages will gain equivalent sections as they adopt the
`E_<PKG>_NAPI_REQUIRED` pattern.

## Future

The current "ship all 5 binaries in the main tarball" approach is simple
but inefficient: a `darwin-arm64` user pays for the four binaries they don't
need. The proper npm pattern is **per-platform subpackages** with
`optionalDependencies`:

- `@c9up/sigil` (main package) declares `@c9up/sigil-linux-x64-gnu`,
  `@c9up/sigil-darwin-arm64`, etc., as `optionalDependencies`.
- Each platform variant is its own published package with one binary.
- npm resolves only the matching platform's subpackage at install time.

That migration is a separate epic (Epic 53+); it depends on the ream-cli
npm version sync strategy clearing (Story 52.4 Decision C).
