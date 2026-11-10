# Helix — Testing Toolkit

Helix is Ream's unified testing toolkit (`@c9up/helix`): bus / HTTP / DB
fakes, fluent assertions, container overrides, time-travel, and a
test runner CLI. Apps that follow the convention can
drive every cross-module integration test through Helix instead of
hand-rolling fixtures per package.

## Installation

```bash
pnpm ream add -D @c9up/helix
```

## Sub-barrels

| Import path | Purpose |
|---|---|
| `@c9up/helix` | Re-exports the runtime DSL (`test`, `describe`, `expect`, `vi`, lifecycle hooks) and the most-used helpers. |
| `@c9up/helix/bus` | Event bus assertions — captured-event listings, ack-chain matchers. |
| `@c9up/helix/http` | Fluent HTTP `TestClient` with auth + assertion helpers. |
| `@c9up/helix/db` | Factory + `useTransaction` + `truncateAll` + in-memory SQLite. |
| `@c9up/helix/mail` | `MailFake` for `@c9up/rover` capture / assert. |
| `@c9up/helix/nova` | `NovaFake` for `@c9up/nova` capture / assert. |
| `@c9up/helix/queue` | `QueueFake` for `@c9up/bay` capture / assert. |
| `@c9up/helix/relay` | `RelayFake` for `@c9up/relay` broadcast capture. |
| `@c9up/helix/storage` | In-memory `Archive` driver + assertions. |
| `@c9up/helix/logger` | Captured-log assertions for `@c9up/spectrum`. |
| `@c9up/helix/time` | `time.freeze()` / `travel()` over Chronos. |
| `@c9up/helix/runtime` | Standalone runtime DSL when you want it explicitly. |
| `@c9up/helix/container` | `helix.override(token, value)` for per-test IoC stubs. |
| `@c9up/helix/fixtures` | Factories + seeders. |

## TestClient (HTTP)

The fluent client boots an Ignitor on a random port, exposes `port` for
long-lived connections (SSE / WebSocket), and proxies to the real
HyperServer — no in-process mock. Same providers, middleware, NAPI
binaries, and pragmas as production.

```ts
import { TestClient } from '@c9up/ream/testing'
import { Ignitor } from '@c9up/ream'

const client = new TestClient(async (port) => {
  const ignitor = new Ignitor(APP_ROOT, { port }).httpServer()
  const started = await ignitor.start()
  return { port: await started.port(), close: async () => started.stop() }
})

await client.boot()

const res = await client
  .post('/auth/login')
  .json({ email: 'a@b.c', password: 'hunter2-strong-1' })
  .send()

res.expect(200).expectJson({ ok: true })
```

The socket-level inactivity timeout is **30 s** (matches the
`helix test --timeout=60000` per-test budget), so signup → argon2 →
sqlite insert → JWT sign chains have headroom.

## Ream apps: the `@c9up/helix-plugin-ream` bridge

helix knows nothing about Ream, and Ream knows nothing about helix. The plugin
that joins them is published separately:

```sh
pnpm add -D @c9up/helix-plugin-ream
```

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

The bootstrap module **exports** `plugins`, `runnerHooks` and `configureSuite`;
it never calls `configure()` itself. helix imports it and configures each run
with those exports and the name of the suite being run — a `configure()` called
inside the file would run at import time, before any suite exists, so
`functional` would never start its server. `ream new` writes this file.

Only the `functional` suite starts a server, and `ctx.client` carries a
`TestClient` pointed at it:

```ts
test('health', async ({ client }) => {
  await client.get('/health').assertOk()
})
```

`ream test` reads its suites from the rc file through the same package
(`@c9up/helix-plugin-ream/runner`).

## CLI runner (`helix test`)

```sh
helix test                       # run the suite once
helix test app                   # run only the tests under ./app
helix test --watch               # re-run on file change
helix test --coverage            # V8 coverage + LCOV + thresholds
helix test --diff-cov            # diff coverage vs `main`
helix test --tsx=false           # use the parent's loader instead of tsx
```

### What fails a run

A run that executes nothing is not a pass. `helix test` exits 1 when
discovery finds no test file, when a path, a `--files` filter or a named
suite matches nothing — a selection narrows the run, it never widens to the
whole tree — and when a file declares no test. `--pass-with-no-tests` (or
`passWithNoTests` in `helix.config.ts`) accepts an empty run.

Under CI (`CI` set), a `.only` or a `.pin()` fails the tests it selects
instead of narrowing the run, so one left in a commit cannot turn the build
green. `--allow-only` (or `allowOnly`) lets it narrow anyway;
`--allow-only=false` forbids it everywhere.

An error nobody handled — a floating rejection, a timer that throws — is a
file error reported beside the file's results, on both pools, including one
raised after the file reported. So is a worker that exits with a status its
results do not explain, and a runner teardown (`api.cleanup`) that throws. A
`.resolves` / `.rejects` assertion the test never awaited fails that test.

What a test prints reaches the terminal once its file finishes, under a
`stdout | <file>` or `stderr | <file>` header, so parallel files do not
interleave. `--silent` drops it; with `--reporter=json` it goes to stderr so
stdout stays parseable.

### Timeouts

`--timeout` is per test. From highest to lowest: the test's own timeout,
`--timeout`, the suite's `timeout`, `configure({ timeout })` or a plugin
editing `api.config.timeout`, the config file's `timeout`, then 60 s.
`beforeEach` / `afterEach` hooks and `test.setup` / `test.teardown` run under
their test's deadline and fail that test, named, when they hang.

A separate per-file deadline (`--file-timeout`, `fileTimeout`, 10 minutes by
default) kills a worker stuck where no test timeout reaches, such as a
synchronous loop. Killing a worker kills its whole process group, so what
its tests spawned does not outlive it. A worker whose CLI dies without
cleaning up (SIGKILL, an out-of-memory kill) notices and exits with its
process group too.

`helix test` sets `NODE_ENV=test` before it reads the config or runs the
bootstrap's `runnerHooks`, and the suites resolve their files before
`runnerHooks.setup` runs: a `files` callback that throws leaves nothing set
up.

### package.json scripts

Use the `helix` bin directly — in npm scripts it resolves to
`node_modules/.bin/helix`, which already bootstraps the TS loader. There is **no
need** for the verbose `node --import tsx node_modules/@c9up/helix/bin/helix.js …`
form:

```json
{
  "scripts": {
    "test": "helix test app --threads=1",
    "test:coverage": "helix test app --threads=1 --coverage"
  }
}
```

`app` is the test path (run only `./app`); `--threads=1` runs serially — pick it
when a suite shares process state (e.g. one in-memory SQLite DB, fake timers),
and drop it to parallelise independent suites.

### Diff coverage in monorepos

`diffCoverage.cwd` defaults to `coverage.root` and the runner accepts any
direction where the two paths share ancestry:

- `cwd` is an ancestor of `root` (typical monorepo: `cwd` = git root,
  `root` = `packages/foo/src`)
- `cwd` is a descendant of `root` (single-repo classic)
- `cwd === root`

Only **fully disjoint** trees are refused (silent 0% overlay otherwise).

## Container overrides

```ts
import { helix } from '@c9up/helix'

helix.override(MailManager, new MailFake())
helix.override('logger', captureLogger)
```

Overrides reset per test via `beforeEach` when configured through the
runtime DSL.

## Time-travel

```ts
import { time } from '@c9up/helix'

time.freeze('2026-01-01T12:00:00Z')
time.travel(60_000)         // +1 minute
time.unfreeze()
```

Wraps `@c9up/chronos` so `DateTime.now()` and any Atlas
`created_at` / `updated_at` columns observe the frozen clock.

## Best practices

- Use Helix's fluent assertion shape (`res.expectJson(...)`) instead of
  raw `expect()` so failure messages stay legible.
- Truncate via `truncateAll(db)` in `beforeEach` for parallel-safe DB tests.
- Drive bus / mail / queue / nova assertions through the fakes —
  never assert against production drivers.
- Pin `poolMax: 1` in the test config for SQLite — its writer
  serialization model makes pool reads + recent writes race occasionally
  under fast-fire e2e sequences.
