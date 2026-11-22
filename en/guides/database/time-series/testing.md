# Testing

This guide covers testing time-series code:

- `FakeEonConnection` — in-memory store
- `factory` — time-series points

## Testing

Write fast, deterministic unit tests against `@c9up/eon` with no docker, mirroring
`@c9up/atlas/testing`. Exported from `@c9up/eon/testing`.

### `FakeEonConnection` — in-memory store

A hand-rolled `EonConnection` double (TDengine has no embeddable engine, so unlike
atlas's real in-memory SQLite this is a narrow double, **not** a SQL engine):

```typescript
import { FakeEonConnection } from '@c9up/eon/testing'

const conn = new FakeEonConnection()
await syncSuperTable(conn, Meters)                 // real compiled DDL
conn.statements   // → ['CREATE STABLE IF NOT EXISTS `meters` (…) TAGS (…)']
await conn.query('SELECT `ts`, `current` FROM `t` WHERE `groupid` = 2 LIMIT 10')
conn.reset()
```

- `exec(sql)` **records** every statement (assert against `conn.statements`) and
  updates a per-table row store for recognised `CREATE` / `INSERT` / `DELETE`.
- `query(sql)` answers **only** flat `SELECT [cols] FROM t [WHERE col <op> val]
  [LIMIT n]`. Windowed / aggregate SQL (`INTERVAL` / `FILL` / `PARTITION BY` /
  `avg(...)`) throws `E_EON_FAKE_UNSUPPORTED` — use the docker harness
  (`describeIfTdengine`) for those.
- `ingestColumnar` / `schemaless` need a live connector → `E_EON_FAKE_UNSUPPORTED`.

### `factory` — time-series points

```typescript
import { factory } from '@c9up/eon/testing'

const MeterFactory = factory(Meters, () => ({
  ts: Date.now(),
  current: 10.5,
  groupid: 2,
})).state('spike', (d) => { d.current = 999 })

MeterFactory.make()                       // plain data object
MeterFactory.merge({ groupid: 7 }).apply('spike').makeStubbed()  // instance
await MeterFactory.create(conn)           // persist via a literal INSERT (child-routed)
await MeterFactory.createMany(100, conn)
```

Hydration resolves columns via the decorator metadata getters, never
`key in instance` (the `@Column() declare x` pitfall). `create()` is a test-only
insert routed to the deterministic child table (`childTableName`) — not the
`SuperTableRepository` ingest API.
