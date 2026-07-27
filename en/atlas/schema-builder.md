# Atlas - Schema Builder

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

`createTableLike` copies a table's structure (Lucid/Knex `createTableLike`). Its
optional callback adds columns to the copy as a follow-up `ALTER TABLE`:

```ts
this.schema.createTableLike('users_archive', 'users', (t) => {
  t.timestamp('archived_at')
})
```

> Portability: Postgres copies everything (`INCLUDING ALL`), MySQL uses `LIKE`,
> and SQLite copies **columns only** — no constraints or indexes, the same
> limitation Knex documents.

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

`hasTable` / `hasColumn` run a live catalog query (Lucid/Knex parity), so they
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

`withSchema` qualifies every subsequent table-taking method until changed
(Lucid/Knex parity). It is chainable:

```ts
this.schema
  .withSchema('reporting')
  .createTable('metrics', (t) => { t.increments('id') })
// → "reporting"."metrics"
```

## Indexes

```ts
this.schema.createIndex('users', ['email'], 'idx_users_email', true) // unique
this.schema.dropIndex('idx_users_email')
```

Indexes also compose inside a table callback — see `index` / `uniqueIndex`
below.

---

# TableBuilder

The object passed to the `createTable` / `alterTable` callback.

## Auto-incrementing keys

```ts
t.increments('id')      // 32-bit auto-increment PK (default name 'id')
t.bigIncrements('id')   // 64-bit auto-increment PK
```

The compiler emits the dialect-appropriate identity clause: SQLite
`AUTOINCREMENT`, Postgres `GENERATED … AS IDENTITY`, MySQL `AUTO_INCREMENT`.
Both mark the column primary and not-null.

## Column types

```ts
t.uuid('id')
t.string('email', 320)   // length defaults to 255
t.text('body')           // text(name, 'text' | 'mediumtext' | 'longtext')
t.integer('count')
t.tinyint('flags')       // MySQL TINYINT; pg → SMALLINT; SQLite → INTEGER
t.smallint('rank')       // SMALLINT on pg/mysql; INTEGER on SQLite
t.mediumint('offset')    // MySQL MEDIUMINT; pg/SQLite → INTEGER
t.bigInteger('bytes')
t.decimal('total', 10, 2)         // decimal(name, precision=10, scale=2)
t.float('ratio')                  // float(name, precision?, scale?)
t.double('lat', 10, 6)            // double(name, precision?, scale?)
t.boolean('active')
t.date('born_on')
t.time('opens_at', 3)             // time(name, precision?)
t.timestamp('seen_at', { useTz: true, precision: 6 })
t.dateTime('seen_at')             // alias of timestamp
t.timestamptz('seen_at')          // tz-aware; normalises writers to UTC on pg
t.json('meta')
t.jsonb('meta')                   // JSONB on pg, JSON on MySQL, TEXT on SQLite
t.binary('blob', 1024)            // binary(name, length?)
t.enum('status', ['draft', 'live']) // native ENUM on MySQL; TEXT + CHECK IN elsewhere
```

`float`/`double` precision and scale render `FLOAT(p, s)` / `DOUBLE(p, s)` on
**MySQL only** — Postgres and SQLite have fixed-width floats and ignore them.
`time` / `timestamp` precision renders `TIME(p)` / `TIMESTAMP(p)` and is ignored
on SQLite. `t.enum` requires at least one value.

`specificType` is the escape hatch for a type atlas has no method for:

```ts
t.specificType('location', 'geometry(Point, 4326)')
t.specificType('search', 'tsvector')
```

> Unlike Knex's straight pass-through, the type lands verbatim in DDL, so the
> compiler validates it against a narrow grammar (letters, digits, spaces, `_`,
> and one parenthesised argument list) and rejects anything else with
> `E_UNSAFE_SQL`.

## Column modifiers

```ts
t.string('email').notNullable()
t.string('nick').nullable()
t.string('status', 20).defaultTo('pending')  // JS literal → quoted/escaped
t.integer('qty').unsigned()                   // MySQL UNSIGNED; no-op on pg/sqlite
t.string('code').comment('SKU')               // column comment
t.string('name').collate('utf8mb4_bin')       // column collation
t.string('mi').after('first_name')           // MySQL-only column position
t.string('id_col').first()                    // MySQL-only: place first
```

`defaultTo` quotes/escapes JS literals (Lucid/Knex semantics). For a SQL
expression wrap it in `this.raw(...)` or use `this.now()`:

```ts
t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
t.timestamp('created_at').notNullable().defaultTo(this.now())
```

> `after` / `first` are MySQL-only — Postgres and SQLite always append, and the
> compiler raises `E_UNSUPPORTED` rather than dropping the instruction silently.
>
> `comment` and `collate` here are the **column** modifiers; the table-level
> forms are `tableComment` / `tableCollate` (atlas flattens column modifiers onto
> the table builder, so the two are named apart rather than guessed by context).

## Shortcuts

```ts
t.timestamps()              // created_at + updated_at, NOT NULL DEFAULT CURRENT_TIMESTAMP
t.timestamps(true, false)   // timestamps(useTimestamps?, defaultToNow?)
t.dropTimestamps()          // drop created_at + updated_at (alter mode)
```

`timestamps()` uses `CURRENT_TIMESTAMP`, which every dialect understands, so it
ports unchanged. `useTimestamps: false` uses `dateTime`; `defaultToNow: false`
leaves the columns nullable with no default.

> The `id()` and (Postgres-defaulted) shortcut helpers exist for user-app
> migrations where the target dialect is known to be Postgres. `id()` defaults to
> `gen_random_uuid()`, which SQLite and MySQL do not provide — do **not** use it
> in migrations meant to run on any dialect. Write the column explicitly and
> supply the UUID at insert time instead.

## Constraints

`primary` / `unique` with no argument mark the current column; with a column list
they declare a composite table constraint:

```ts
t.uuid('id').primary()
t.string('email').unique()

t.primary(['tenant_id', 'user_id'])
t.unique(['tenant_id', 'slug'], 'accounts_tenant_slug_unique')
```

> `unique([...])` is a real `UNIQUE` **constraint**, distinct from `uniqueIndex`,
> which emits a separate `CREATE UNIQUE INDEX`.

### Foreign keys — single column

Declared as column modifiers, following `references`:

```ts
t.uuid('author_id')
  .references('users', 'id')       // atlas form: (table, column='id')
  .onDelete('cascade')
  .onUpdate('restrict')

t.uuid('author_id').references('users.id')  // Lucid/Knex dotted shorthand
```

A single argument without a dot is the table name (column defaults to `id`).

### Foreign keys — composite chain

`foreign(...)` returns a chainable that reads in Knex order:

```ts
t.foreign(['tenant_id', 'user_id'])
  .references(['tenant_id', 'id'])
  .inTable('members')
  .onDelete('cascade')
  .onUpdate('cascade')
```

`onDelete` / `onUpdate` take a referential action
(`cascade` | `restrict` | `set null` | `no action` | `set default`).

## CHECK constraints

Each `check*` helper follows a column definition and pins a predicate on it.
Values are quoted, never interpolated raw:

```ts
t.integer('qty').checkPositive()               // CHECK (qty > 0)
t.integer('delta').checkNegative()             // CHECK (delta < 0)
t.string('role').checkIn(['admin', 'user'])    // CHECK (role IN (...))
t.string('tier').checkNotIn(['banned'])
t.integer('age').checkBetween([18, 120])       // CHECK (age BETWEEN 18 AND 120)
t.integer('score').checkBetween([[0, 40], [60, 100]]) // several intervals OR'd
t.string('code').checkLength('=', 8)           // CHECK (LENGTH(code) = 8)
t.string('slug').checkRegex('^[a-z-]+$')       // CHECK (slug ~ 'pattern')
```

Each accepts an optional trailing constraint name. `checkLength`'s operator is
allow-listed by the compiler. `check(predicate, name?)` is the free-form escape
hatch — the predicate is emitted **verbatim** (as trusted as `raw`), so prefer
the typed helpers, which are safe by construction:

```ts
t.check('price >= cost', 'chk_margin')
```

Drop named checks in `alter` mode:

```ts
this.schema.alterTable('products', (t) => t.dropChecks('chk_margin'))
```

> `checkRegex` is `~` on Postgres and `REGEXP` on MySQL/SQLite. SQLite parses
> `REGEXP` but ships no implementation — the constraint only works if the
> connection registers a `regexp` function (same as Knex).

## Dropping constraints (alter mode)

```ts
this.schema.alterTable('accounts', (t) => {
  t.dropPrimary()                                  // Postgres default name <table>_pkey
  t.dropUnique(['tenant_id', 'slug'])              // by columns (default name)
  t.dropUnique(['tenant_id', 'slug'], 'named_uq')  // or by explicit name
  t.dropForeign(['author_id'])                     // by columns or explicit name
})
```

Dropping by column list uses Knex's `<table>_<columns>_<suffix>` naming
convention, so `unique([...])` / `dropUnique([...])` (and the foreign pair) agree
without naming anything.

## Indexes

```ts
t.index('email')                       // idx_<table>_email
t.index(['tenant_id', 'created_at'], 'idx_tenant_recent')
t.uniqueIndex('email')                 // CREATE UNIQUE INDEX idx_<table>_email_unique
```

Inside `alterTable`, an index added alongside column ops compiles to its own
`CREATE INDEX`, appended in declaration order.

## MySQL table options

Ignored on Postgres and SQLite:

```ts
this.schema.createTable('events', (t) => {
  t.increments('id')
  t.engine('InnoDB')
  t.charset('utf8mb4')
  t.tableCollate('utf8mb4_unicode_ci')
  t.tableComment('append-only event log')
})
```

`tableCollate` / `tableComment` are named apart from the `collate` / `comment`
**column** modifiers because atlas flattens column modifiers onto the same
builder.
