# Dialects

This guide covers the SQL dialects and how one is chosen:

- Supported Dialects
- Configuration
- Connection retry & timeout
- Adding a new dialect

## Dialect System

Atlas supports SQLite, PostgreSQL, and MySQL/MariaDB. Dialect differences (identifier quoting, column type mapping, placeholder format) are owned by the Rust `ream-query` crate — there is **no dialect implementation in TypeScript**. The same entity, query, and migration code works against any supported backend.

### Supported Dialects

| Dialect | Identifier | Placeholders | Notes |
|---------|-----------|-------------|-------|
| `sqlite` | `"col"` | `?` | Type mapping: TEXT / INTEGER / REAL / BLOB |
| `postgres` | `"col"` | `$N` | Full support, JSONB, RETURNING |
| `mysql` | `` `col` `` | `?` | VARCHAR, TINYINT(1) for booleans, backtick identifiers |

`mariadb` is an alias for `mysql`.

### Configuration

The dialect is auto-detected from the connection URL scheme. You never set it directly:

```typescript
// config/database.ts
export default {
  // sqlite: → Dialect.Sqlite
  url: 'sqlite:data/app.db',

  // postgres:// → Dialect.Postgres
  // url: 'postgres://user:pass@localhost/mydb',

  // mysql:// → Dialect.Mysql
  // url: 'mysql://user:pass@localhost/mydb',

  poolMin: 1,
  poolMax: 10,
  migrations: { path: './database/migrations' },
}
```

`AtlasProvider` calls `setAtlasDialect(...)` at boot based on the URL scheme. Module-level state means `BaseRepository`, `ModelQuery`, `QueryBuilder`, and `SchemaBuilder` all pick up the right dialect without configuration.

If you need to override the dialect programmatically (for example in a multi-tenant test setup):

```typescript
import { setAtlasDialect, getAtlasDialect } from '@c9up/atlas'

setAtlasDialect('postgres')
const current = getAtlasDialect() // 'postgres'
```

### Connection retry & timeout

By default the initial connection is a **single attempt**: if the DB is unreachable
at boot, atlas fails immediately. Three opt-in knobs let you retry — useful when the
database starts a moment after the app (docker-compose / k8s) or for a transient
boot blip:

```typescript
// config/database.ts
export default {
  url: 'postgres://user:pass@db/mydb',
  poolMin: 1,
  poolMax: 10,

  connectRetries: 5,       // extra attempts if the first connect fails (default 0)
  connectBackoffMs: 500,   // base backoff between attempts — exponential, capped 30s (default 200)
  connectTimeoutMs: 2000,  // per-attempt acquire timeout (see note) — unset ⇒ sqlx default (~30s)
}
```

With the above, atlas tries up to 6 times, each attempt giving up after 2s, waiting
500ms → 1s → 2s → … between them.

> **Why `connectTimeoutMs` matters.** sqlx already retries connection
> *establishment* internally for the duration of its acquire timeout (~30s by
> default). So without `connectTimeoutMs`, each of your `connectRetries` attempts
> can block for ~30s before giving up — `connectRetries: 5` would mean ~150s.
> Lowering `connectTimeoutMs` makes each attempt fail fast, so retries poll at the
> cadence you actually want.

The same knobs are available per named connection (under `connections.<name>`) and
on the low-level `createNapiConnection(url, poolMin, poolMax, pragmas, { retries, backoffMs, timeoutMs })`.

### Adding a new dialect

New dialects are added by extending the `Dialect` enum in the Rust `ream-query` crate (`crates/ream-query/src/dialect.rs`) — not in TypeScript. Implement `quote_ident`, `placeholder`, and `map_column_type` for the new variant, rebuild the NAPI binary, and the entire TS surface picks it up automatically.
