# Introduction

This guide covers testing with helix:

- Installation
- Entry points
- Best practices

Helix is Ream's unified testing toolkit (`@c9up/helix`): a test runner CLI,
fluent assertions, container overrides, time-travel, and the plugin contract
through which each package ships its own fakes. Apps that follow the convention can
drive every cross-module integration test through Helix instead of
hand-rolling fixtures per package.

## Installation

```bash
pnpm ream add -D @c9up/helix
```

## Entry points

| Import path | Purpose |
|---|---|
| `@c9up/helix` | The runtime DSL (`test`, `describe`, `it`, `expect`, `vi`, lifecycle hooks, `configure`), the container facade and `time`. |
| `@c9up/helix/runtime` | The runtime DSL alone. |
| `@c9up/helix/container` | The container facade alone: `override`, `overrideOn`, `useContainer`, `spy`. |
| `@c9up/helix/time` | `freeze`, `travel`, `travelTo`, `unfreeze`, `frozenAt` — the clock pinned through `vi.setSystemTime`. |
| `@c9up/helix/runner` | The programmatic runner a host framework drives from its own config file. |

helix itself fakes nothing from the ecosystem: each package ships its fakes and
helpers under its own `/testing` entry, as plugins for `configure({ plugins })`.

| Import path | What it gives a test |
|---|---|
| `@c9up/ream/testing` | `TestClient`, the fluent HTTP client (below). |
| `@c9up/atlas/testing` | `factory`, `useTransaction`, `truncateAll`. |
| `@c9up/rover/testing` | `FakeMail`, `mailFake`. |
| `@c9up/nova/testing` | `FakeNova`. |
| `@c9up/bay/testing` | `FakeQueue`. |
| `@c9up/relay/testing` | `FakeRelay`. |
| `@c9up/archive/testing` | `FakeStorage`, `driveFake`. |
| `@c9up/spectrum/testing` | `FakeLogger`. |

## Best practices

- Use Helix's fluent assertion shape (`res.expectJson(...)`) instead of
  raw `expect()` so failure messages stay legible.
- Truncate via `truncateAll(db)` in `beforeEach` for parallel-safe DB tests.
- Drive bus / mail / queue / nova assertions through the fakes —
  never assert against production drivers.
- Pin `poolMax: 1` in the test config for SQLite — its writer
  serialization model makes pool reads + recent writes race occasionally
  under fast-fire e2e sequences.
