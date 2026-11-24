# Publishing packages

This guide covers publishing a package with native code:

- Supported platforms
- How the binaries ship
- CI flow per package
- How to publish
- Consumer install
- Troubleshooting — `E_<PKG>_NAPI_REQUIRED`

Ream's `@c9up/*` packages with native Rust code (NAPI bindings) ship pre-compiled
`.node` binaries built by GitHub Actions. Consumers run
`pnpm install @c9up/<pkg>` and get the binary for their platform at install
time. Nobody runs `cargo build` on their own machine.

This guide covers the CI pipeline, the consumer install experience, and how to
recover from a missing-binary error.

## Supported platforms

Each package's CI workflow builds the five targets below in parallel. A
release ships only when every target goes green.

| `process.platform` | `process.arch` | Suffix | GitHub runner |
| --- | --- | --- | --- |
| `linux` | `x64` (glibc) | `linux-x64-gnu` | `ubuntu-latest` |
| `linux` | `arm64` (glibc) | `linux-arm64-gnu` | `ubuntu-24.04-arm` |
| `darwin` | `x64` | `darwin-x64` | `macos-15` (cross-compiled from arm64) |
| `darwin` | `arm64` | `darwin-arm64` | `macos-15` |
| `win32` | `x64` (MSVC) | `win32-x64-msvc` | `windows-latest` |

Each runner builds with `cargo build --release -p <crate>-napi`. Then
`scripts/copy-napi.mjs` copies the result to `index.<suffix>.node` next to the
package's `package.json`.

Out of scope (today):

- Linux musl (Alpine), x64 or arm64. The Linux binaries target glibc.
- Bun. The workflows use `pnpm install` and `pnpm test`.

## How the binaries ship

The main package carries no binary. Each platform has its own npm package,
named after the main package and the suffix: `@c9up/<pkg>-<suffix>`. For
`@c9up/sigil` that gives `@c9up/sigil-linux-x64-gnu`,
`@c9up/sigil-darwin-arm64`, and so on.

- A platform package holds the binaries of one platform, the licence and the
  [licence notices](#licence-notices) of the crates they contain. Most
  packages have one binary, `index.<suffix>.node`. Some have more: atlas ships
  `index` and `db`, ream ships `index`, `scheduler` and `events`. Each one is
  named `<stem>.<suffix>.node`.
- A platform package declares `os`, `cpu` and, on Linux, `libc: ["glibc"]`.
  The package manager uses them to install only the package that matches the
  machine.
- The main package lists every platform package in `optionalDependencies`,
  pinned to its own exact version (`"0.1.21"`, never `"^0.1.21"`). A binary
  from another version is other Rust, so the versions never mix.

The platform manifests live in `npm/<suffix>/package.json`. They are committed,
and nobody edits them by hand: `scripts/platform-packages.mjs` writes them,
together with the main package's `optionalDependencies`. Run it after every
version bump:

```bash
pnpm platforms:sync    # node scripts/platform-packages.mjs
pnpm platforms:check   # fails if a manifest or a pin is stale
```

### Where a package looks for its binary

The loader looks in two places, in this order:

1. **The local build**, at the package root. In a checkout, `pnpm build:napi`
   puts the binary there, so you always run the Rust you just built.
2. **The platform package** `@c9up/<pkg>-<suffix>`, installed with the main
   package.

The loader asks for the platform package only when there is no local file. A
local file that exists but fails to load is a broken build: the loader reports
it with the load error as `cause`. It does not quietly run the installed binary
instead.

## Licence notices

A `.node` binary contains the code of every Rust crate it depends on. Most of
these crates are under MIT, BSD or ISC. These licences require their copyright
notice and licence text to come with every copy of the code, binaries
included.

So each native package ships a `THIRD-PARTY-NOTICES.md` file. It lists:

- every crate compiled into the binaries, with its version and its declared
  licence;
- the C code that some crates compile in, for example libwebp and dav1d in
  prism, or SQLite in atlas;
- the full text of each licence, with the crates it covers.

The file is in the main package and in every platform package. ream-cli puts
it next to its `ream` executable, in each of its npm packages.

### How the file is made

`scripts/third-party-notices.mjs` writes the file with
[cargo-about](https://github.com/EmbarkStudios/cargo-about). It reads
`Cargo.lock` and keeps only the crates compiled into the binaries the package
ships, for the platforms CI builds. Test and build tools are left out.

Do not edit the file by hand. Run the script again after you change a Rust
dependency, and commit the result:

```bash
node scripts/third-party-notices.mjs          # rewrite the file
node scripts/third-party-notices.mjs --check  # fail if the file is stale
```

From the ream-dev root, one command handles every package:

```bash
pnpm notices:sync    # rewrite every THIRD-PARTY-NOTICES.md
pnpm notices:check   # fail if one of them is stale
```

The script needs cargo-about 0.9.3 exactly. It refuses any other version,
because another version can read licence files differently:

```bash
cargo install cargo-about --locked --version 0.9.3 --features cli
```

### Accepted licences

`about.toml`, at the root of each package, lists the licences a crate may
carry: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, Zlib and Unicode-3.0.
A crate under any other licence stops the script with an error. A crate whose
licence cannot be read stops it too. Copyleft licences such as GPL, LGPL and
AGPL are not accepted: do not add them.

Some crates have a licence that is accepted for them alone:

- MPL-2.0 for `cssparser` and `dtoa-short` (blackhole, goldstone) and for
  `mp4parse` (prism). MPL-2.0 applies file by file. A binary can carry these
  files under another licence, as long as it says where their source code is.
  The notices file gives that address for each of these crates.
- CDLA-Permissive-2.0 for `webpki-roots` (atlas). It is a permissive licence
  for data, here the root certificates.

To accept a licence for one crate, add a section named after the crate in
`about.toml`, under a comment that says why:

```toml
# MPL-2.0 applies file by file: the binary may carry these files under any
# licence, as long as the notices say where their source is (they do).
[mp4parse]
accepted = ["MPL-2.0"]
```

Add a licence to the global `accepted` list only if it is permissive and you
accept it for every crate.

Some `-sys` crates compile C code that Cargo does not describe. The `BUNDLED`
list in the script names that code and where its licence text is.

### The check in CI

The `audit` job installs cargo-about 0.9.3 and runs
`node scripts/third-party-notices.mjs --check`. The job fails when the file no
longer matches `Cargo.lock`, or when a crate carries a licence `about.toml`
does not accept. The publish job waits for it, then copies the file into each
platform package. `scripts/check-publish-gates.mjs`, at the ream-dev root,
checks that every package keeps these steps.

## CI flow per package

Each package with native code has its workflow at
`packages/<pkg>/.github/workflows/<pkg>-ci.yml`.

### Triggers

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:
```

On a push, the five-platform matrix runs only when the version in
`package.json` changed. `workflow_dispatch` is the manual trigger that
publishes (see below).

### Jobs

1. **`quality`**: typecheck, lint, and `node scripts/platform-packages.mjs --check`.
   A bump without the script fails here.
2. **`build-and-test`**: the five-platform matrix (`fail-fast: false`). Each
   cell builds its binary, runs the tests and checks that no test was skipped.
   It then uploads its `.node` files as an artefact. A missing file fails the
   job.
3. **`cargo-tests`**, the TypeScript tests and the advisory audits run once,
   on Linux. The `audit` job also checks `THIRD-PARTY-NOTICES.md`.
4. **`publish`** runs only on `workflow_dispatch`, after every other job is
   green.

### The publish job, step by step

1. It checks that the `NPM_TOKEN` secret is set and that a `v<version>` tag
   sits at `HEAD` with the version of `package.json`.
2. It compares the version with npm. A version npm already holds is refused. A
   lower version is refused too, unless you confirm a backport: it then goes
   out under the `backport` dist-tag.
3. It downloads the matrix's binaries into `artifacts/`. It checks that the
   manifests are up to date and that every binary of every platform is there,
   before it moves anything. Then it moves each binary into `npm/<suffix>/` and
   copies the licence and `THIRD-PARTY-NOTICES.md` next to it. It refuses a `.node` file left at the package
   root.
4. It runs `npm publish --dry-run` on every package. npm publishes one package
   at a time, so a package npm would refuse stops the job before anything is
   out.
5. It publishes the platform packages first, with `npm publish` from each
   `npm/<suffix>/`. It skips a package npm already holds at this version, so
   you can rerun the job after a partial failure.
6. It publishes the main package last. Its exact pins then point at packages
   that already exist.
7. It creates the GitHub release.

## How to publish

The publish is **manual on purpose**. A tag-triggered publish can fire on a tag
pushed by accident; `workflow_dispatch` needs a deliberate click per package
and per release.

1. Bump the version in `package.json`, then run `pnpm platforms:sync`. Commit
   both, tag `v<version>` and push.
2. Open the package's GitHub repository (for example `github.com/C9up/sigil`).
3. Go to **Actions** → **`<pkg>`-ci** → **Run workflow**.
4. Pick `main` and click **Run workflow**.
5. When the job is green, the new version is on npm: the main package and its
   five platform packages.

The `NPM_TOKEN` repository secret must be set before the publish job runs. The
job stops with a clear error if it is missing.

### First publish of a new platform package

npm trusted publishing can only be set up on a package that already exists. So
the first publish of each new name (`@c9up/<pkg>-<suffix>`) needs an
`NPM_TOKEN` that is allowed to create packages in the `@c9up` scope.

After that first publish, set up trusted publishing on each new package on
npmjs.com, as on the main package: this repository, the workflow file
`<pkg>-ci.yml` and the `npm` environment. Five new packages per native package
means five settings to fill in.

npm provenance also needs `repository.url` in each manifest.
`scripts/platform-packages.mjs` writes it, with the `directory` of the platform
package.

## Consumer install

```bash
pnpm install @c9up/sigil
```

The package manager installs `@c9up/sigil` and the one platform package that
matches the machine. You download one platform's binaries, not five, and you
need no Rust toolchain.

::: warning Do not omit optional dependencies
The binaries are optional dependencies. An install with `--omit=optional`
(npm), `--no-optional` (npm, pnpm) or `npm ci --omit=optional` in a Dockerfile
skips them, and the package then has no binary.
:::

Install on the machine, or in the image, that runs the app. A `node_modules`
copied from macOS into a Linux image holds the macOS binary, not the Linux one.

If your platform is not in the table above, build from source:

```bash
git clone <package-repo>
cd <pkg>
pnpm install
pnpm build:napi   # cargo build --release -p <crate>-napi + copy-napi.mjs
```

Then `npm link` the local checkout into your project. The loader finds the
binary at the package root before it looks for a platform package.

## Troubleshooting — `E_<PKG>_NAPI_REQUIRED`

If a Ream module throws an error like:

```
[E_SIGIL_NAPI_REQUIRED] The argon2 Rust engine is required but not loaded.
  Fix: install @c9up/sigil-linux-x64-gnu at the exact version of @c9up/sigil: …
```

…the binary for your platform could not be loaded. The message names the
platform package to install, and the load error is the error's `cause`. Common
reasons:

- The install skipped optional dependencies (`--omit=optional`,
  `--no-optional`). Reinstall without the flag.
- `node_modules` came from another platform (copied from a laptop into a Docker
  image). Install inside the image.
- You run Alpine/musl. The Linux binaries target glibc.
- Your platform is outside the five supported ones. Build from source as shown
  above.
- In a checkout, the local build is stale or built for another Node ABI.
  Rebuild it: `pnpm --filter @c9up/<pkg> build:napi`.

The codes differ per package: `E_SIGIL_NAPI_REQUIRED`, `E_ATLAS_NAPI_NOT_FOUND`,
`E_REAM_NAPI_NOT_FOUND`… Each package's reference page lists its own. For
example:

- [`@c9up/sigil`](/en/reference/errors#e-sigil-napi-required)
- [`@c9up/ream`](/en/reference/errors#e-ream-napi-not-found)
