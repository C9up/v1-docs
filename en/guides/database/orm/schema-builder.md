# Schema builder

This guide covers the schema builder:

- Table lifecycle
- Altering a table
- Existence checks
- Views
- Postgres schemas
- MySQL table options

The schema builder is the DDL surface used inside migrations. Every method
appends compiled statements (via the Rust compiler — no SQL strings are built in
TS) that the migration runner flushes to the database. Inside a migration it is
reached through `this.schema`, and the per-column callback receives a
`TableBuilder`:

```ts
import { BaseSchema } from '@c9up/atlas'

export default class CreateOrders extends BaseSchema {
  async up() {
    this.schema.createTable('orders', (table) => {
      table.increments('id')
      table.string('status', 50).notNullable().defaultTo('pending')
      table.decimal('total', 10, 2).notNullable()
      table.timestamps()
    })
  }

  async down() {
    this.schema.dropTable('orders')
  }
}
```

This page is the reference for everything beyond a plain `createTable`.

## Table lifecycle

```ts
this.schema.createTable('users', (t) => { t.increments('id') })
this.schema.createTableIfNotExists('users', (t) => { t.increments('id') })
this.schema.renameTable('users', 'accounts')
this.schema.dropTable('accounts')          // errors if missing
this.schema.dropTableIfExists('accounts')  // no-op when missing
```

`createTableLike` copies a table's structure. Its
optional callback adds columns to the copy as a follow-up `ALTER TABLE`:

```ts
this.schema.createTableLike('users_archive', 'users', (t) => {
  t.timestamp('archived_at')
})
```

> Portability: Postgres copies everything (`INCLUDING ALL`), MySQL uses `LIKE`,
> and SQLite copies **columns only** — no constraints or indexes.

## Altering a table

`alterTable` (aliased `table`) opens the builder in `alter` mode. A column-type
method becomes an `ADD COLUMN`; `.alter()` turns the pending add into a type
change; the drop/rename/nullability helpers do what they say. Operations compile
in call order.

```ts
this.schema.alterTable('users', (t) => {
  t.string('nickname', 40)              // ADD COLUMN
  t.string('email', 320).notNullable().alter()  // change the type
  t.renameColumn('bio', 'about')
  t.dropColumn('legacy_flag')
  t.dropColumns('col_a', 'col_b')       // dropped in call order
})
```

An `alterTable` with an empty callback throws `E_ALTER_EMPTY` — a no-op `ALTER`
is a caller bug, not a silent skip.

### Nullability

```ts
this.schema.alterTable('users', (t) => {
  t.setNullable('middle_name')   // DROP NOT NULL
  t.dropNullable('email')        // SET NOT NULL
})
```

> `setNullable` / `dropNullable` are **Postgres-only** — Postgres is the one
> dialect whose syntax needs no column type, and atlas compiles SQL
> synchronously with no round-trip to recover it. On MySQL restate the type with
> `t.<type>('col').nullable().alter()`; SQLite cannot alter a column in place at
> all. Both raise `E_UNSUPPORTED` with the alternative spelled out.
>
> `.alter()` on SQLite is likewise rejected with `E_UNSUPPORTED` rather than
> rewriting the table behind your back.

`.alter()` moves nullability only if `.nullable()` / `.notNullable()` was called
on the same column — a bare `t.string('x').alter()` changes the type and leaves
the `NOT NULL` constraint exactly as it is.

The alter-only helpers (`alter`, `dropColumn(s)`, `renameColumn`,
`setNullable`, `dropNullable`, `dropPrimary`, `dropUnique`, `dropForeign`,
`dropChecks`, `dropTimestamps`) throw `E_ALTER_MISUSE` if called inside
`createTable` — a new table has nothing to alter.

## Existence checks

`hasTable` / `hasColumn` run a live catalog query, so they
reflect migrations already applied. They are `async` and need the connection the
runner binds inside a migration — calling them on a standalone `Schema` throws
`E_NO_CONNECTION`.

```ts
async up() {
  if (!(await this.schema.hasColumn('users', 'timezone'))) {
    this.schema.alterTable('users', (t) => t.string('timezone', 64))
  }
}
```

> They see the live catalog, **not** statements this same migration has only
> buffered — those run after `up()` returns.

## Views

```ts
this.schema.createView('active_users', 'SELECT * FROM users WHERE active = true')
this.schema.createView('u', 'SELECT id, email FROM users', { columns: ['id', 'email'] })
this.schema.createViewOrReplace('active_users', 'SELECT * FROM users WHERE active')
this.schema.dropView('active_users')          // errors if missing
this.schema.dropViewIfExists('active_users')  // no-op when missing
this.schema.renameView('active_users', 'live_users')
```

The `select` is raw, developer-authored SQL embedded verbatim — the same trust
level as `raw`, so never build it from user input. The view name and column
list are validated and quoted by the compiler.

`createViewOrReplace` is rejected on SQLite. `alterView` (aliased `view`) renames
a view's columns and is **Postgres-only** — elsewhere drop and re-create:

```ts
this.schema.alterView('active_users', (v) => {
  v.column('id').rename('user_id')
})
```

### Materialized views (Postgres-only)

```ts
this.schema.createMaterializedView('sales_by_day',
  'SELECT date, SUM(total) AS total FROM orders GROUP BY date')
this.schema.refreshMaterializedView('sales_by_day')
this.schema.refreshMaterializedView('sales_by_day', true) // CONCURRENTLY
this.schema.dropMaterializedView('sales_by_day')
this.schema.dropMaterializedViewIfExists('sales_by_day')
```

## Postgres schemas

```ts
this.schema.createSchema('reporting')
this.schema.createSchemaIfNotExists('reporting')
this.schema.dropSchema('reporting')            // dropSchema(name, cascade?)
this.schema.dropSchema('reporting', true)      // DROP SCHEMA … CASCADE (pg-only)
this.schema.dropSchemaIfExists('reporting', true)
```

`CREATE SCHEMA` targets Postgres and MySQL (where a schema is a database); it is
rejected on SQLite, which has no schemas. `CASCADE` is Postgres-only.

`withSchema` qualifies every subsequent table-taking method until changed.
It is chainable:

```ts
this.schema
  .withSchema('reporting')
  .createTable('metrics', (t) => { t.increments('id') })
// → "reporting"."metrics"
```

## MySQL table options

Ignored on Postgres and SQLite:

```ts
this.schema.createTable('events', (t) => {
  t.increments('id')
  t.engine('InnoDB')
  t.charset('utf8mb4')
  t.collate('utf8mb4_unicode_ci')
  t.comment('append-only event log')
})
```

`collate` / `comment` on the **table** builder are the table options; the same
names on a **column** builder (`t.string('x').comment(...)`) are the column
modifiers.
