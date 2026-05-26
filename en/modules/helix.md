# Helix — Testing Toolkit

Helix is Ream's unified testing toolkit (`@c9up/helix`): bus / HTTP / DB
fakes, fluent assertions, container overrides, time-travel, and a
Vitest-compatible test runner CLI. Apps that follow the convention can
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
| `@c9up/helix/bus` | Pulsar bus assertions — captured-event listings, ack-chain matchers. |
| `@c9up/helix/http` | Fluent HTTP `TestClient` with auth + assertion helpers. |
| `@c9up/helix/db` | Factory + `useTransaction` + `truncateAll` + in-memory SQLite. |
| `@c9up/helix/mail` | `MailFake` for `@c9up/rover` capture / assert. |
| `@c9up/helix/nova` | `NovaFake` for `@c9up/nova` capture / assert. |
| `@c9up/helix/queue` | `QueueFake` for `@c9up/bay` capture / assert. |
| `@c9up/helix/relay` | `RelayFake` for `@c9up/relay` broadcast capture. |
| `@c9up/helix/storage` | In-memory `Archive` driver + assertions. |
| `@c9up/helix/logger` | Captured-log assertions for `@c9up/spectrum`. |
| `@c9up/helix/time` | `time.freeze()` / `travel()` over Chronos. |
| `@c9up/helix/runtime` | Standalone Vitest-compatible DSL when you want it explicitly. |
| `@c9up/helix/container` | `helix.override(token, value)` for per-test IoC stubs. |
| `@c9up/helix/fixtures` | Factories + seeders. |

## TestClient (HTTP)

The fluent client boots an Ignitor on a random port, exposes `port` for
long-lived connections (SSE / WebSocket), and proxies to the real
HyperServer — no in-process mock. Same providers, middleware, NAPI
binaries, and pragmas as production.

```ts
import { TestClient } from '@c9up/helix'
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

## CLI runner (`helix test`)

```sh
helix test                       # run the suite once
helix test --watch               # re-run on file change
helix test --coverage            # V8 coverage + LCOV + thresholds
helix test --diff-cov            # diff coverage vs `main`
helix test --tsx=false           # use the parent's loader instead of tsx
```

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
