# Atlas - Getting Started

## Install

```bash
pnpm add @c9up/atlas
```

## Define an entity

```ts
import { BaseEntity, Entity, PrimaryKey, Column } from '@c9up/atlas'

@Entity('users')
export class User extends BaseEntity {
  @PrimaryKey() declare id: string
  @Column() declare email: string
  @Column() declare status: string
}
```

## Wire a repository

```ts
import { BaseRepository } from '@c9up/atlas'
import type { DatabaseConnection } from '@c9up/atlas'

export class UserService {
  constructor(private db: DatabaseConnection) {}

  repo() {
    return new BaseRepository(User, this.db)
  }
}
```

## Basic CRUD

```ts
const users = service.repo()

const created = await users.create({
  id: crypto.randomUUID(),
  email: 'a@b.com',
  status: 'active',
})

await users.save(created)

const one = users.findOrFail(created.id)
users.updateById(created.id, { status: 'disabled' })
users.delete(created)
```

## Notes

- Validate business inputs before `save`.
- Prefer typed repository methods over ad-hoc SQL.
- For dynamic columns, use explicit whitelists.

## Configuration

### The `configure` hook

Atlas ships a `configure` entrypoint that the framework runs when you add the
package to a project. It wires the provider, seeds the database env vars, and
writes a starter `config/database.ts`:

```ts
import { configure } from '@c9up/atlas'
```

You don't call it by hand — the framework's configure command invokes it and
passes the codemods it needs. After it runs you'll have:

- `@c9up/atlas/provider` registered.
- `DB_HOST` / `DB_PORT` / `DB_DATABASE` / `DB_USER` / `DB_PASSWORD` added to your env.
- A `config/database.ts` with a Postgres connection built from `DATABASE_URL`
  (or the individual `DB_*` vars).

### SQLite production pragmas

For SQLite in production, spread `SQLITE_PROD_PRAGMAS` into your connection's
`pragmas`. It's the canonical WAL recipe — `journal_mode = WAL` (writers don't
block readers) plus `synchronous = NORMAL` (one fsync per commit), which drops
INSERT latency by roughly 5–10x versus SQLite's defaults without sacrificing
crash durability:

```ts
import { defineConfig, SQLITE_PROD_PRAGMAS } from '@c9up/atlas'

export default defineConfig({
  default: 'sqlite',
  connections: {
    sqlite: {
      url: 'sqlite:data/app.db',
      pragmas: { ...SQLITE_PROD_PRAGMAS, foreign_keys: 'ON' },
    },
  },
})
```

The constant is frozen, so spread it — app-specific overrides (like
`foreign_keys`) stay literal alongside it.

### Naming strategy

By default Atlas maps camelCase TS properties to snake_case DB columns, pluralises
table names, and derives `<parent>_<pk>` foreign keys. That behaviour lives in
`CamelCaseNamingStrategy`, exposed as the `defaultNamingStrategy` singleton and
applied to every entity that doesn't opt out.

To adapt Atlas to a legacy schema (PascalCase columns, prefixed tables, custom
pivot names), implement the `NamingStrategy` interface and attach it to an entity
with a static `namingStrategy` field:

```ts
import { BaseEntity, Entity, CamelCaseNamingStrategy } from '@c9up/atlas'
import type { NamingStrategy } from '@c9up/atlas'

class LegacyStrategy extends CamelCaseNamingStrategy implements NamingStrategy {
  // Legacy tables are singular and PascalCase: "AppUser", not "app_users".
  tableName(className: string): string {
    return className
  }
}

@Entity()
export class AppUser extends BaseEntity {
  static namingStrategy = new LegacyStrategy()
}
```

The `NamingStrategy` interface covers the full surface:

- `tableName(className)` — table name for an entity class.
- `columnName(propertyName)` — DB column for a TS property (`userId` → `user_id`).
- `propertyName(columnName)` — reverse mapping, used when hydrating rows.
- `serializedName(propertyName)` — field name emitted by `toJSON()`.
- `relationLocalKey(kind, parentPk)` — local key for a relation.
- `relationForeignKey(kind, parentClass, parentPk)` — foreign key on the owning side.
- `relationPivotTable(aClass, bClass)` — default pivot table for a `manyToMany`.
- `paginationMetaKeys?()` — optional remap of `Paginator.toJSON()` meta keys.

Extend `CamelCaseNamingStrategy` and override only the hooks you need — the rest
keep the default behaviour.

Resolution walks the prototype chain, so a subclass inherits its parent's
strategy unless it declares its own. `getNamingStrategy(entityClass)` returns the
strategy in effect for a given class, falling back to `defaultNamingStrategy`:

```ts
import { getNamingStrategy } from '@c9up/atlas'

const strategy = getNamingStrategy(AppUser)
strategy.tableName('AppUser') // 'AppUser'
```
