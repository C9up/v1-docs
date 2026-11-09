# Helix plugin — the ream ↔ helix bridge

`@c9up/helix-plugin-ream` joins the framework to its test runner. Ream knows nothing about [Helix](/en/modules/helix), Helix knows nothing about Ream: the package that joins them lives here and declares both sides as peers.

That is what lets Helix's CI go green without publishing Ream, and the other way round. Each keeps its own release cycle.

## Install

```sh
pnpm add -D @c9up/helix-plugin-ream @c9up/helix
```

## Inject a test client

The bootstrap module **exports** `plugins`, `runnerHooks` and `configureSuite`;
it never calls `configure()` itself. helix imports it and configures each run
with those exports and the name of the suite being run — a `configure()` called
inside the file would run at import time, before any suite exists, so the suite
hook would never see `functional`. `ream new` writes this file:

```ts
// tests/bootstrap.ts
import type { ConfigureOptions, Plugin, RunnerHook } from '@c9up/helix'
import { apiClient } from '@c9up/helix-plugin-ream'
import { createTestUtils } from '@c9up/ream/testing/utils'

export const testUtils = createTestUtils((port) => bootApp(port))

export const plugins: Plugin[] = [apiClient({ testUtils })]

export const runnerHooks: { setup: RunnerHook[]; teardown: RunnerHook[] } = {
  setup: [],
  teardown: [],
}

export const configureSuite: ConfigureOptions['configureSuite'] = (suite) => {
  if (suite.name === 'functional') {
    return suite.setup(() => testUtils.httpServer().start())
  }
}
```

```ts
test('health', async ({ client }) => {
  await client.get('/health').assertOk()
})
```

With `testUtils`, the suite hook owns the server: the plugin reads the client of
the server that hook started, so both point at one server, and a unit suite that
declares no hook starts no server and pays nothing. The hook's own teardown
closes it.

Each test gets its own `ctx.client` over that one server: a header a test sets
with `withHeader()` — an `authorization` it logs in with — ends with the test
and never reaches the next. `testClient()` returns the running test's client,
and outside a test the client of the server itself, for a fixture or a runner
hook.

### Let the client boot the app

For a project whose suites are not split yet, `boot` lets the client own its
server instead:

```ts
export const plugins: Plugin[] = [apiClient({ boot: (port) => bootApp(port) })]
```

The server starts on the client's **first request**, so a test file that issues
none pays nothing, and it closes through `api.cleanup` when the run ends.
Prefer `testUtils`.

## Run the suites declared in the rc file

```ts
import { runTestsFromRcFile } from '@c9up/helix-plugin-ream/runner'
```

This is what `ream test` calls.

Options are overrides on top of the rc file: `suites`, `threads`, `reporters`,
`bail`, `passWithNoTests`, and `coverage` — the last one handed to Helix
untouched, since coverage is the runner's.

`NODE_ENV=test` is set and the `.env` files are loaded (`.env.test` over
`.env`) before the rc file is imported. A run that finds no test file exits 1,
and so does a suite named in `suites` that matches nothing, unless
`passWithNoTests` is set. The rc file's `tests.timeout` is the default a
plugin's `configure({ timeout })` can override; a suite's own `timeout` beats
both.

```ts
await runTestsFromRcFile('./reamrc.ts', {
  suites: ['unit'],
  coverage: { enabled: true, include: ['app/**/*.ts'], thresholds: { lines: 80 } },
})
```

## What stays in Ream

`TestClient`, `createTestClient`, `RequestBuilder` and `ApiResponse` live in `@c9up/ream/testing`. They drive a Ream server over HTTP and owe nothing to the runner, so they need no plugin, and a project testing with something else uses them as they are.
