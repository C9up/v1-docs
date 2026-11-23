# ream-cli

`@c9up/ream-cli`: the `ream` binary, written in Rust: it creates projects, installs and configures packages, runs the dev server, builds, tests, and forwards every other command to the application's console. Guide: [Introduction](/en/guides/command-line/introduction).

## Installation

```bash
npm install -g @c9up/ream-cli
```

The package ships the native `ream` binary; it starts without booting Node.js and spawns Node only for the commands that run the project.

## Entry points

| Command | Description |
|---|---|
| `ream new` | Creates a new project. |
| `ream template` | Installs a project template by cloning its repository. |
| `ream add` | Installs packages and runs their `configure()` hooks. |
| `ream configure` | Runs a package's `configure()` hook. |
| `ream dev` | Starts the development server. |
| `ream start` | Starts the production server. |
| `ream build` | Builds TypeScript into `dist/`. |
| `ream test` | Runs the test suites declared in `reamrc.ts`. |
| `ream repl` | Opens an interactive shell with the application booted. |
| `ream inspect` | Shows the registered routes, providers and container bindings. |
| `ream list` | Lists every command: the binary's and the application's. |
| `ream mcp` | Manages the MCP server registration in `.mcp.json`. |
| `ream generate:key` | Writes a fresh `APP_KEY` into `.env`. |
| `ream doctor` | Runs environment health checks. |
| `ream info` | Shows version information. |
| `ream android:build` | Builds the app's Android APK or AAB. |
| `ream android:run` | Builds, installs and starts the app on an Android device. |
| `ream android:publish` | Publishes the app's JS as a signed over-the-air update. |
| `ream generate:update-key` | Generates the key pair over-the-air updates are signed with. |
| `ream css:compile` | Compiles a Tailwind stylesheet into the style table orbit reads on a phone. |
| `ream <other>` | Any other name runs the application's console command of that name, flags intact (`ream make:controller`, `ream migration:run`, `ream provision --email x`). |

`ream`, `ream --help` and `ream help` print the command list. `ream <command> --help` prints that command's page.

## Commands

Global flags, accepted by every command:

| Flag | Description |
|---|---|
| `--ansi` | Forces coloured output even when stdout is not a terminal (sets `FORCE_COLOR=1`). |
| `--no-ansi` | Disables coloured output (sets `NO_COLOR=1`). |
| `--version`, `-V` | Prints the version. |

An application may redefine `dev`, `start`, `build`, `test`, `inspect`, `repl` and `list` with a console command of the same name; `ream` then runs the application's command with the original arguments. The other commands cannot be redefined.

### `ream new`

```sh
ream new <destination> [--template <name>] [--db <name>] [-y] [--pkg <name>] [--git-init]
```

| Argument / flag | Description |
|---|---|
| `destination` | A name or any path (`apps/api`, `.`); the package is named after its last directory. An existing directory must be empty. |
| `--template` | `api`, `web`, `microservice` or `slim`; skips the prompt. |
| `--db` | `postgres` or `sqlite`; skips the prompt. |
| `--yes`, `-y` | Takes the default (`api`, `postgres`) for anything not passed as a flag; no terminal needed. |
| `--pkg` | The package manager that installs the project: `pnpm`, `npm` or `yarn`. Defaults to the one that launched `ream`, else `pnpm`. |
| `--git-init` | Initialises a git repository in the new project. |

### `ream template`

```sh
ream template <name> [destination]
```

Clones a template's repository. `destination` defaults to the template name. Available template: `kitchen-sink`.

### `ream add`

```sh
ream add <packages...> [configure flags] [-D] [--force] [--package-manager <name>]
```

| Argument / flag | Description |
|---|---|
| `packages` | Package names (`@c9up/atlas @c9up/warden`), then any flags for their `configure()` hooks. |
| `--dev`, `-D` | Installs as devDependencies. |
| `--force` | Passes `--force` to the configure step (overwrites existing config files). |
| `--package-manager` | `pnpm`, `npm` or `yarn` instead of the lockfile's. |

### `ream configure`

```sh
ream configure <package> [--force] [flags...]
```

Runs the `configure()` hook the package exports from its entry point or its `./configure` subpath. `--force` overwrites existing files; any other flag is forwarded to the hook. Fails when the package is not installed or exports no hook. The package module is loaded with a 10-second timeout (`REAM_PROBE_TIMEOUT_SECS` changes it); the hook itself runs without one.

### `ream dev`

```sh
ream dev [--no-clear] [--no-assets] [--assets-args <arg>...]
```

Starts `bin/server.ts` with `@c9up/ream/hot`, which swaps a changed module inside the running process, alongside the assets command declared in `reamrc.ts`, under one Ctrl-C.

| Flag | Description |
|---|---|
| `--no-clear` | Keeps the previous logs on screen after a change. |
| `--no-assets` | Leaves the assets command out of this run. |
| `--assets-args` | An argument appended to the assets command; repeat for several. |

### `ream start`

Starts the production server (spawns `node`). No arguments.

### `ream build`

```sh
ream build [--ignore-ts-errors] [--tsconfig <path>] [--no-assets] [--assets-args <arg>...]
```

Runs the assets command, then compiles TypeScript into `dist/`.

| Flag | Description |
|---|---|
| `--ignore-ts-errors` | Keeps the output and finishes the build when TypeScript reports errors. |
| `--tsconfig` | The tsconfig file to compile with (default `tsconfig.json`). |
| `--no-assets`, `--assets-args` | As for `ream dev`. |

### `ream test`

```sh
ream test [suites...] [flags]
```

Runs the suites of the `tests` block of `reamrc.ts` through [`@c9up/helix-plugin-ream`](/en/reference/helix-plugin-ream). Without a suite name, every declared suite runs, in order.

| Flag | Description |
|---|---|
| `--threads <n>` | Concurrent worker processes. |
| `--reporters <list>` | Comma-separated reporters (`spec,json`). |
| `--bail` | Stops at the first failure. |
| `--files <file>` | Filters by file name; repeat for several. |
| `--tags <tag>` | Filters by tag; repeat for several. |
| `--groups <title>` | Filters by parent group title; repeat for several. |
| `--tests <title>` | Filters by test title; repeat for several. |
| `--timeout <ms>` | Default timeout of every test. |
| `--retries <n>` | Default retries of every test. |
| `--failed` | Runs only the tests that failed during the last run. |
| `--watch` | Re-runs the tests on file changes. |
| `--poll` | With `--watch`: detects changes by polling. |
| `--no-clear` | With `--watch`: keeps the previous output on screen. |
| `--coverage` | Collects V8 coverage. |
| `--coverage-reporters <list>` | Comma-separated coverage reporters (`text-summary,lcov`). |
| `--coverage-dir <dir>` | Where the coverage reports are written. |
| `--coverage-thresholds <json>` | Inline thresholds, `{"lines":80,"functions":75}`. |
| `--coverage-include <globs>` | Comma-separated globs to measure, overriding the app layout. |
| `--coverage-exclude <globs>` | Comma-separated globs to leave out. |

### `ream repl`, `ream inspect`, `ream doctor`, `ream info`

No arguments. `repl` opens a Node REPL with the application booted; `inspect` prints the registered routes, providers and container bindings; `doctor` runs environment health checks; `info` prints version information.

### `ream list`

```sh
ream list [namespaces...] [--json]
```

| Argument / flag | Description |
|---|---|
| `namespaces` | Shows only the commands in these namespaces (`make`, `db`, …). |
| `--json` | Emits JSON instead of the grouped table, with each command's arguments and flags. |

### `ream mcp`

```sh
ream mcp install | uninstall | status
```

| Subcommand | Description |
|---|---|
| `install` | Registers `@c9up/ream-mcp` in the project's `.mcp.json` as `npx --no @c9up/ream-mcp`. |
| `uninstall` | Removes the entry. |
| `status` | Shows whether the server is registered. |

### `ream generate:key`

```sh
ream generate:key [--force] [--show]
```

| Flag | Description |
|---|---|
| `--force` | Replaces an existing `APP_KEY`, which invalidates cookies, sessions and signed URLs. |
| `--show` | Prints a key instead of writing it to `.env`. |

### `ream android:build`

```sh
ream android:build [--release] [--aab]
```

Builds from the `mobile` block of `reamrc.ts`. `--release` signs with the app's keystore (a debug build otherwise); `--aab` builds an Android App Bundle for the Play Store and implies `--release`.

### `ream android:run`

```sh
ream android:run [--release] [--device <serial>]
```

Builds, installs and starts the app. A debug build loads its JS from Metro, which the command serves. `--release` builds a signed release without Metro; `--device` picks a device by its `adb devices` serial when several are attached.

### `ream android:publish`

```sh
ream android:publish [--key <file>]
```

Bundles, signs and publishes the app's JS as an over-the-air update (`@c9up/robledo`) for its current native runtime. The signing key comes from `REAM_UPDATES_KEY`, else from `--key` (default `robledo.key`).

### `ream generate:update-key`

```sh
ream generate:update-key [--out <file>] [--force]
```

Generates the Ed25519 key pair updates are signed with. `--out` is where the private key goes (default `robledo.key`); `--force` replaces an existing key, after which installed apps refuse updates until rebuilt.

### `ream css:compile`

```sh
ream css:compile <input> [--out <file>]
```

Reads Tailwind's compiled CSS and writes the JSON style table orbit reads, to `--out` (`-o`) or stdout.

## Configuration

| Variable | Description |
|---|---|
| `FORCE_COLOR`, `NO_COLOR` | Colour, as set by `--ansi` / `--no-ansi`; passed on to the Node side. |
| `REAM_PROBE_TIMEOUT_SECS` | Seconds `ream configure` / `ream add` wait for a package module to load (default 10). |
| `REAM_UPDATES_KEY` | The signing key of `ream android:publish`. |

## Releasing

For maintainers of ream-cli. Publishing is manual: Actions, `ream-cli-ci`, Run workflow, on the ream-cli repository, with the release tag selected as the ref. A tag push alone publishes nothing.

```bash
# 1) Bump version = "X.Y.Z" in packages/ream-cli/Cargo.toml and commit it
git commit -am "release: ream-cli vX.Y.Z"
# 2) Tag the release commit once it is on main
git tag -a vX.Y.Z -m "ream-cli vX.Y.Z"
git push origin vX.Y.Z
# 3) Run ream-cli-ci from the Actions UI with the vX.Y.Z tag as the ref
```

A new subcommand or public surface is a minor bump; a fix with no surface change is a patch; an internal refactor needs no bump.

The drift gate compares `Cargo.toml` with npm. A higher version publishes under `latest`. An equal version is refused: npm never accepts a version twice, so bump it. A lower version is refused unless the `confirm_overwrite` input is the literal `YES`; it then publishes under the `backport` dist-tag, so `latest` does not move. Any other failure (no tag on HEAD, tag and `Cargo.toml` disagreeing, registry unreachable) stops the run, with no override.

## See also

- [The command line](/en/guides/command-line/introduction)
- [Development server](/en/guides/command-line/dev-server)
- [Running and testing](/en/guides/command-line/running-and-testing)
- [Generators](/en/guides/command-line/generators)
- [Keys and integrations](/en/guides/command-line/keys)
- [Building the app](/en/guides/mobile/building)
- [ream](/en/reference/ream)
- [ream-mcp](/en/reference/ream-mcp)
- [helix-plugin-ream](/en/reference/helix-plugin-ream)
