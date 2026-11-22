# Provider and boot

This guide covers AtlasProvider and what runs at boot:

- Migrations at boot
- An option it does not know

## AtlasProvider

Register `AtlasProvider` in your application's provider list. It reads `config/database.ts`, opens the database connection, and registers the adapter in the container. It runs pending migrations at boot only when `migrations.autoRun` is on (never in development); otherwise `ream migration:run` applies them.

```typescript
// config/app.ts
import AtlasProvider from '@c9up/atlas/AtlasProvider'

export default {
  providers: [AtlasProvider],
}
```

```typescript
// config/database.ts
export default {
  url: 'sqlite:data/app.db',          // or 'postgres://...' or 'mysql://...'
  poolMin: 1,
  poolMax: 10,
  migrations: {
    path: './database/migrations',
  },
}
```

On boot, `AtlasProvider`:
1. Opens a connection pool via Rust `ream-db` (sqlx under the hood — SQLite, PostgreSQL, or MySQL)
2. Detects the dialect from the URL scheme and calls `setAtlasDialect(...)`
3. Registers `db` and `db.connection` in the container
4. Registers the migration source for the `migrate` / `migration:*` commands, and runs pending migrations through `MigrationRunner` only when `migrations.autoRun` is on and the environment is not development (all DDL compiled by `ream-query`)

### Migrations at boot

`migrations.autoRun` migrates when the application boots. It is off by default,
and for a reason: boot also runs under `warmUp()`, so a route listing or a
codegen pass would mutate the schema, and every replica of a rolling deploy
would race the others for the same database.

Turn it on for a host that genuinely owns its database alone — a container that
starts once, an embedded app on a file database:

```ts
migrations: { autoRun: true }
```

**It is ignored in development** (`REAM_ENV`, or else `NODE_ENV`, set to `development`, `develop` or `dev`). The reason to migrate at
boot at all is that a container has no terminal to run a command in; a
development machine has one. And development is the one environment that
restarts constantly, so each restart replayed the migrations while the instance
it replaced still held the lock — two failures per saved file. Run
`ream migrate` there, as every other environment already does.

### An option it does not know

A key under `migrations` that atlas does not recognise is named at boot rather
than ignored. That silence used to be expensive: when `autoRunInProduction`
became `autoRun`, the old key kept being accepted, migrations quietly stopped,
and a deployment came up on an empty schema.

Wrapping the config in `defineConfig()` catches it earlier — at compile time,
where a renamed key is a type error:

```ts
import { defineConfig } from '@c9up/atlas'

export default defineConfig({
  // …
})
```
