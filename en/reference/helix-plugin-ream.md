# helix-plugin-ream

`@c9up/helix-plugin-ream`: the bridge between a ream app and the helix test runner: a plugin that puts an HTTP test client on each test's context, and the runner behind `ream test`. Guide: [HTTP tests](/en/guides/testing/http-tests).

## Installation

```bash
pnpm add -D @c9up/helix-plugin-ream
```

`@c9up/helix` (`^0.2.13`) and `@c9up/ream` (`^0.2.7`) are peer dependencies. The client itself, `TestClient`, lives in [`@c9up/ream/testing`](/en/reference/ream#c9up-ream-testing).

## Entry points

| Import | Contents |
|---|---|
| `@c9up/helix-plugin-ream` | `apiClient()`, `testClient()`, their types, and the `ctx.client` augmentation of helix's `TestContext`. |
| `@c9up/helix-plugin-ream/runner` | `runTests()`, `runTestsFromRcFile()` and their options: run the suites declared in the rc file. |

## Exports

### `@c9up/helix-plugin-ream`

| Export | Kind | Description |
|---|---|---|
| `apiClient` | function | A helix plugin that injects a fresh `TestClient` on every test as `ctx.client`. |
| `testClient` | function | The client the run is using, reachable without a test context. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors). Also exported from `./runner`. |
| `ApiClientConfig` | interface | The options of `apiClient()`. |
| `ClientHost` | type | `Pick<PluginApi, "context" \| "cleanup">`: the part of helix's plugin API the plugin uses. |

Importing the package augments helix's `TestContext` with `client: TestClient`.

```ts
function apiClient(config: ApiClientConfig): (api: ClientHost) => Promise<void>
function testClient(): TestClient
```

`apiClient()` gives each test its own client (headers set with `withHeader()` end with the test) over the server the file booted. With `testUtils`, the server is the one a suite hook starts, and a suite without the hook has no server. With `boot`, the plugin owns the server and starts it on the first request; its cleanup closes it.

`testClient()` returns the current test's `ctx.client` while a test runs, and the client of the file's server outside one (a fixture, a helper module, a runner hook).

`ApiClientConfig`:

| Field | Type | Description |
|---|---|---|
| `testUtils` | `TestUtils` | The utilities whose `httpServer()` a suite hook starts; the plugin reads that server's client. |
| `boot` | `BootServer` | Boots the app directly, on the client's first request. For a project whose suites are not split. |
| `auth` | `AuthStrategy` | The auth strategy for `client.withAuth()` / `asUser()`. |
| `routes` | `RouteManifest` | The named-route manifest (`router.namedManifest()`) for `client.visit()`. |

One of `testUtils` or `boot` is required.

### `@c9up/helix-plugin-ream/runner`

| Export | Kind | Description |
|---|---|---|
| `runTestsFromRcFile` | function | Loads an rc file and runs its suites: the one-liner of a `bin/test.ts`. |
| `runTests` | function | Runs the given `tests` config. Returns the exit code. |
| `workerNodeArgs` | function | The flags the worker processes are spawned with: `options.nodeArgs`, or this process's `execArgv`. |
| `RunTestsOptions` | interface | What a caller may override on top of the rc file. |
| `TestFilters` | interface | `{ suites?, files?, tags?, groups?, tests?: string[] }`: the filters `ream test` forwards. |
| `errors` | namespace | The same namespace as the main entry's. |

```ts
function runTestsFromRcFile(rcPath: string, options?: RunTestsOptions): Promise<number>
function runTests(tests: TestsConfig | undefined, options?: RunTestsOptions): Promise<number>
function workerNodeArgs(options: RunTestsOptions): string[]
```

Both run functions set `NODE_ENV=test` and load the `.env` files of `root` (`.env.test` over `.env`, `.env.local` skipped) before anything else; `runTestsFromRcFile` does it before importing the rc file. `rcPath` is resolved against `root`. Prefer `runTestsFromRcFile`: it passes the rc path as `configModule`, which a suite's `configure` callback needs.

```ts
// bin/test.ts
import { runTestsFromRcFile } from '@c9up/helix-plugin-ream/runner'

process.exitCode = await runTestsFromRcFile('./reamrc.ts', {
  suites: process.argv.slice(2),
})
```

`RunTestsOptions`:

| Option | Type | Default | Description |
|---|---|---|---|
| `root` | `string` | `process.cwd()` | Project root the suites resolve against. |
| `suites` | `string[]` | every declared suite | Suite names to run, in that order. |
| `threads` | `number` | | Concurrent worker processes. |
| `reporters` | `string[]` | | Reporter names (`["spec", "json"]`). |
| `bail` | `boolean` | | Stops at the first failure. |
| `coverage` | helix's `RunConfig["coverage"]` | | V8 coverage, passed to helix untouched. |
| `configModule` | `string` | set by `runTestsFromRcFile` | The module that declared the suites, re-imported in each worker for `suites[].configure`. |
| `nodeArgs` | `string[]` | `process.execArgv` | Flags the workers are spawned with. |
| `passWithNoTests` | `boolean` | `false` | Exits 0 when the selection finds no test file, or a file declares no test. |
| `filters` | `TestFilters` | | Narrows the run: files, tags (`~@tag` excludes), group titles, test titles; `filters.suites` adds to `suites`. |
| `timeout` | `number` | | Timeout of every test in ms; beats a suite's own and the rc file's. |
| `retries` | `number` | | Extra attempts for every test; beats a suite's own. |
| `failed` | `boolean` | | Runs only the tests that failed during the last run. |
| `watch` | `boolean` | | Watches the files and re-runs on a change. |
| `poll` | `boolean` | | With `watch`: detects changes by polling. |
| `clear` | `boolean` | `true` | With `watch`: clears the terminal before each re-run. |
| `drainGuard` | `boolean` | `false` | When the run finishes but the process stays alive, reports what is still open after a grace period and exits with the run's code. `ream test` turns it on. |

When the rc file sets `tests.forceExit`, the process exits with the run's code as soon as the run ends.

## Errors

| Code | Raised when |
|---|---|
| [`E_HELIX_PLUGIN_REAM_NO_SERVER`](/en/reference/errors#e-helix-plugin-ream-no-server) | `apiClient()` was given neither `testUtils` nor `boot`. |
| [`E_HELIX_PLUGIN_REAM_SERVER_NOT_STARTED`](/en/reference/errors#e-helix-plugin-ream-server-not-started) | A test reads `ctx.client` but no suite hook started the server. |
| [`E_HELIX_PLUGIN_REAM_NO_TEST_CLIENT`](/en/reference/errors#e-helix-plugin-ream-no-test-client) | `testClient()` is called while no `apiClient()` plugin is in play. |
| [`E_HELIX_PLUGIN_REAM_UNKNOWN_SUITE`](/en/reference/errors#e-helix-plugin-ream-unknown-suite) | A suite name was asked for but the rc file does not declare it. |
| [`E_HELIX_PLUGIN_REAM_SUITE_CONFIGURE_UNREACHABLE`](/en/reference/errors#e-helix-plugin-ream-suite-configure-unreachable) | A suite declares `configure` and the runner has no module path to re-import it in each worker. |

Each one is a class of `errors`, a flare `Exception`: read `error.code`, or test `error instanceof errors.E_HELIX_PLUGIN_REAM_UNKNOWN_SUITE`.

## Migration

- `HelixPluginReamError`, `UnknownSuiteError` and `SuiteConfigureUnreachableError` are gone: test `error.code`, or `instanceof` the matching class of `errors` (`errors.E_HELIX_PLUGIN_REAM_UNKNOWN_SUITE`, `errors.E_HELIX_PLUGIN_REAM_SUITE_CONFIGURE_UNREACHABLE`).
- Three codes carry the package prefix now: `E_NO_SERVER` is `E_HELIX_PLUGIN_REAM_NO_SERVER`, `E_SERVER_NOT_STARTED` is `E_HELIX_PLUGIN_REAM_SERVER_NOT_STARTED`, `E_NO_TEST_CLIENT` is `E_HELIX_PLUGIN_REAM_NO_TEST_CLIENT`.

## See also

- [HTTP tests](/en/guides/testing/http-tests)
- [The test runner](/en/guides/testing/runner)
- [Authenticating a test client](/en/guides/testing/auth)
- [helix](/en/reference/helix)
- [ream](/en/reference/ream)
