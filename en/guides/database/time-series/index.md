# Introduction

This guide covers time series with eon and TDengine:

- The compile boundary
- Provider
- Transport / connection
- Pinned versions

Eon is Ream's time-series data layer, backed by [TDengine](https://tdengine.com). Statement descriptions compile to parameterised TDengine SQL through a Rust `eon-query` compiler exposed over NAPI, and the transport is ws-first (eon's own client for taosAdapter, on Node's built-in `WebSocket`).

## The compile boundary

TypeScript never assembles SQL strings itself. It builds a JSON statement description and hands it to the Rust compiler, which returns `{ statements, params }` with:

- **backtick-quoted identifiers** (`` `meters` ``) validated against an injection seam — any table/column/tag name with a backtick, NUL, or a character outside `[A-Za-z0-9_]` is rejected with `E_UNSAFE_IDENTIFIER`, never interpolated;
- **`?` STMT-style placeholders** for every value and tag — no caller value is ever put into the SQL string.

```typescript
import { compileStatementNative } from '@c9up/eon'

// Plain insert
compileStatementNative({
  kind: 'insert',
  table: 'd1001',
  columns: ['ts', 'current'],
  rows: [[1700000000000, 10.3]],
})
// → { statements: ['INSERT INTO `d1001` (`ts`, `current`) VALUES (?, ?)'],
//     params: [1700000000000, 10.3] }

// Child-table auto-create (TDengine `USING <stable> TAGS (...)`) — tag params bind first
compileStatementNative({
  kind: 'insert',
  table: 'd1001',
  using: 'meters',
  tags: ['California.SanFrancisco'],
  columns: ['ts', 'current'],
  rows: [[1700000000000, 10.3]],
})
// → { statements: ['INSERT INTO `d1001` USING `meters` TAGS (?) VALUES (?, ?)'],
//     params: ['California.SanFrancisco', 1700000000000, 10.3] }

// Basic SELECT (FROM / WHERE / LIMIT)
compileStatementNative({
  kind: 'select',
  table: 'meters',
  select: ['ts', 'current'],
  wheres: [{ column: 'groupid', operator: '=', value: 2 }],
  limit: 10,
})
// → { statements: ['SELECT `ts`, `current` FROM `meters` WHERE `groupid` = ? LIMIT 10'],
//     params: [2] }
```

Time-window clauses (`INTERVAL` / `SLIDING` / `FILL` / `PARTITION BY`), selector functions, and the `_wstart` / `_wend` / `_wduration` pseudo-columns compile too — you rarely build these specs by hand; see [Time-series queries](/en/guides/database/time-series/data#time-series-queries) for the fluent builder that produces them.

## Provider

`EonProvider` is an agnostic leaf: it consumes the host container structurally and never imports `@c9up/ream`. On boot it opens the configured connection(s) and registers them under `eon` (the default), `eon.connection` (alias), and `eon:<name>` (per named connection), plus the module-level `@c9up/eon/services/connection` singleton. The transport-independent compiler is registered under `eon.compiler`. `shutdown()` closes every connection (fail-open — one stuck close never blocks the rest) and releases the singletons.

## Transport / connection

Eon is **ws-first**: it talks to TDengine through taosAdapter's WebSocket API with a client of its own, built on Node's built-in `WebSocket` (Node 24 or later) — no driver package, no `libtaos`, no native FFI, no install script, and nothing that touches the process (no signal handlers, no log files). A future native `taos` transport is deferred behind the same seam, not descoped.

The client bounds what the server can do to it: every request has a deadline (`timeoutMs`, 60 s by default), a frame over 256 MiB or one that does not decode closes the connection, and closing it — from either side — rejects whatever is still waiting. Those failures carry `E_EON_TIMEOUT`, `E_EON_DECODE`, `E_EON_CLOSED` or `E_EON_CONNECT`; a refusal from the server is `E_EON_SERVER_ERROR`, with the server's numeric code on `taosCode`.

### Configuration

Config lives under the `timeseries` key (falling back to `eon`), authored with `defineConfig`:

```typescript
// config/timeseries.ts
import { defineConfig } from '@c9up/eon'
import env from '#start/env'

export default defineConfig({
  url: env.get('TDENGINE_URL'), // taosAdapter WebSocket URL, e.g. ws://localhost:6041
  user: env.get('TDENGINE_USER'),
  password: env.get('TDENGINE_PASSWORD'),
  database: env.get('TDENGINE_DATABASE'), // optional default database
  timeoutMs: 30_000,
  connectRetries: 5,            // retry the INITIAL connect (cold-server race)
  connectBackoffMs: 200,        // exponential, capped at 30s
})
```

`ream configure @c9up/eon` writes this file, declares the four variables in `start/env.ts` (the password is optional, for token auth) and seeds `.env` with `TDENGINE_PASSWORD=change-me`: a placeholder that authenticates nowhere. Set the real password before the first run; never keep TDengine's factory `taosdata`, which every image ships with. The config has no fallback values, so a deployment missing a variable fails at boot instead of connecting to localhost.

Put credentials in `user` / `password` / `token`: the user and password go in the connection request, the token in the URL's query, as taosAdapter expects. They are also accepted in the URL (`ws://user:pass@host`, `?token=`, a database as the path); eon masks the password and every query value of the URL in its error messages. There is no connection pool — eon holds a single long-lived connection; `connectRetries` covers the initial-connect race (docker/k8s cold start), not per-query reconnection.

### The `EonConnection` seam

Every transport satisfies one small interface — the ws implementation today, a native `taos` implementation later. The columnar bulk-ingest STMT method and the schemaless helper live on this same connection (only the transport owns the live STMT handle, so ingest never touches a ws-specific type):

```typescript
interface EonConnection {
  readonly transport: 'websocket'                                // future: 'native'
  exec(sql: string): Promise<{ rowsAffected: number }>           // literal DDL/DML
  query<T = Record<string, unknown>>(sql: string): Promise<T[]>  // literal SELECT
  ping(): Promise<void>
  ingestColumnar(request: EonColumnarIngest): Promise<{ rowsAffected: number }>
  schemaless(lines: readonly string[], options?: EonSchemalessOptions): Promise<void>
  close(): Promise<void>
}
```

### Shutting down

`close()` closes the connection's socket, and that is everything a connection
holds: once every connection and consumer is closed, the process can exit.
`destroyEonConnector()` is still exported for code that calls it; it does
nothing.

`exec` / `query` take **literal SQL only**. TDengine binds positional `?` placeholders exclusively through the STMT path (the bulk-ingest work), so the compiler's `params` array is not threaded through `exec` — a param-free compiled statement runs as literal SQL.

### Timestamps are `BigInt`

`query()` maps each row to an object keyed by column name and keeps values connector-native. A `TIMESTAMP` (and any `BIGINT`) comes back as a **`BigInt`** epoch value — epoch-milliseconds at `PRECISION 'ms'` — never a `Date`. The coercion is left to the consuming layer, so nothing is silently narrowed to a lossy double.

### Why ws-first, native deferred

The 58-0 spike measured native STMT ingest at ~2× the ws path on loopback, clearing the go-bar — yet ws-first stands. Production runs the app and TDengine as separate containers on a single CapRover host, so the link is loopback (native's edge doesn't amplify without a cross-machine hop), and ws maximises maintainability (pure JS, no `libtaos`, no Rust in CI, no glibc/musl lock) while already reaching ~2.8M rows/s. A native `taos` transport drops in behind the `EonConnection` seam unchanged if ingest ever becomes a proven bottleneck or TDengine moves off-host.

## Pinned versions

- TDengine server: `3.3.6.13` (tested); `ingestMany` uses stmt2 and needs `3.3.6.0` or later — on an older server it fails with `E_EON_SERVER_VERSION`, while `ingestSql` and `ingestSchemaless` still work.
- Node: `24` or later (built-in `WebSocket`).
