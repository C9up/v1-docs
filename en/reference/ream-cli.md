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

A new project does not list `reflect-metadata`: `@c9up/ream` depends on it and loads it. Since ream-cli 0.3.23, `ream test`, `ream repl`, `ream inspect` and `ream <command>` load it through `@c9up/ream` too. An older ream-cli imports it from the project, so a project without the dependency fails on these commands until you update the CLI.

What the `api` and `web` templates mount in `start/kernel.ts`:

- `api`: on the server tier, a timing middleware and `@c9up/blackhole/server_middleware`; on the router tier, the body parser and `@c9up/blackhole/middleware`. `config/blackhole.ts` turns on `X-Frame-Options: DENY`, HSTS and `X-Content-Type-Options: nosniff`, turns CSRF and the content security policy off (an API authenticates with tokens and serves no HTML), and sets a CORS policy that allows no origin until you list one in `cors.origin`.
- `web`: on the server tier, `@c9up/blackhole/server_middleware`; on the router tier, the body parser, the session, `@c9up/blackhole/middleware` (signed CSRF) and `@c9up/warden/silent-auth`. Silent auth reads who is signed in and refuses nobody. The refusing middleware is `app/middleware/auth_middleware.ts`, registered as the named `auth` middleware: attach it with `.use(middleware.auth())`, or chain `.guard('session')` on the route.

The server-tier half of blackhole runs on every request, so a response to a path no route matches carries the protective headers too, and the rate limit counts it.

The generated `.gitignore` keeps `.env`, `.env.local`, `.env.*.local`, `robledo.key` and `*.keystore` out of git. `.env.example` and the shared `.env.<NODE_ENV>` files stay committed.

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

`.mcp.json` comes with the repository, so `install` and `uninstall` refuse it when it is a symbolic link or not a regular file, and write nothing.

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

With `mobile.updates` set, the build writes `assets/ream-updates.json` for `@c9up/robledo`: the update server, the public key, the native runtime, `embeddedCreatedAt` (the time of the build, in seconds: an update published before it is refused) and `appId` (`mobile.id`: an update for another app is refused). See [Over-the-air updates](/en/guides/mobile/building#over-the-air-updates).

### `ream android:run`

```sh
ream android:run [--release] [--device <serial>]
```

Builds, installs and starts the app. A debug build loads its JS from Metro, which the command serves. `--release` builds a signed release without Metro; `--device` picks a device by its `adb devices` serial when several are attached.

### `ream android:publish`

```sh
ream android:publish [--key <file>]
```

Bundles, signs and publishes the app's JS as an over-the-air update (`@c9up/robledo`) for its current native runtime. The signing key comes from `REAM_UPDATES_KEY`, else from `--key` (default `robledo.key`). The signed manifest carries `createdAt` (the time of publishing, in seconds) and `appId` (`mobile.id`), which installed apps check.

### `ream generate:update-key`

```sh
ream generate:update-key [--out <file>] [--force]
```

Generates the Ed25519 key pair updates are signed with. `--out` is where the private key goes (default `robledo.key`); `--force` replaces an existing key, after which installed apps refuse updates until rebuilt.

The private key file is readable by its owner only (`0600`), also when `--force` replaces a file that others could read. A destination that is a symbolic link or not a regular file is refused, and nothing is written: a cloned repository decides what `robledo.key` is, and a link would put the key wherever it points.

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

## Migration

- A new `web` app mounts `@c9up/warden/silent-auth` on every route, and `app/middleware/auth_middleware.ts` is now the middleware that refuses a request nobody is signed in to, registered as the named `auth` middleware. In an app made by an older `ream new`, the global `AuthMiddleware` refused nobody, and `.guard('session')` answered 401 to every user, signed in or not. Replace `() => import('#middleware/auth_middleware.js')` in `router.use([...])` with `() => import('@c9up/warden/silent-auth')`, and protect each route with `.guard('session')` or with the named `auth` middleware.
- The `web` and `api` templates mount `@c9up/blackhole/server_middleware` on the server tier. In an app made by an older `ream new`, add `server.use([() => import('@c9up/blackhole/server_middleware')])` to `start/kernel.ts` (for `api`, also add `@c9up/blackhole` to the dependencies, its provider to `reamrc.ts`, `@c9up/blackhole/middleware` after the body parser, and a `config/blackhole.ts`).
- `ream generate:update-key` and `ream mcp install` / `uninstall` refuse a destination that is a symbolic link. Replace the link with a regular file.
- `ream generate:update-key --force` sets the key file to `0600`.
- The Android activity generated by `ream android:*` no longer passes the launch intent's extras to the root component: `run()` receives no launch props. Any app on the phone can start yours with extras of its choosing, so do not read a screen, an address or a switch from them.
- `ream android:build` writes `embeddedCreatedAt` and `appId` into the app, and `ream android:publish` signs `appId` into each update. An app built by an older version has neither, so a store release does not replace an older over-the-air update, and an update signed with the same key for another app is accepted. Rebuild the app and release it to the store. Then publish its updates with this version only: the rebuilt app refuses an update without `appId`.

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
