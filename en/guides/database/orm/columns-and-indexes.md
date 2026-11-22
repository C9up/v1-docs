# Columns and indexes

This guide covers column types, modifiers and indexes:

- Column types
- Column modifiers
- Shortcuts
- Auto-incrementing keys
- Indexes
- Indexes
- Schema Builder

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
t.json('meta')                    // JSON on pg (key order kept), JSON on MySQL, TEXT on SQLite
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

> The type lands verbatim in DDL, so the
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

`defaultTo` quotes/escapes JS literals. For a SQL
expression wrap it in `this.raw(...)` or use `this.now()`:

```ts
t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
t.timestamp('created_at').notNullable().defaultTo(this.now())
```

> `after` / `first` are MySQL-only — Postgres and SQLite always append, and the
> compiler raises `E_UNSUPPORTED` rather than dropping the instruction silently.
>
> `comment` and `collate` here are the **column** modifiers, reached off the
> column builder a type method hands back. The table-level forms carry the same
> names on the table builder — `t.comment(...)`, `t.collate(...)`: the receiver
> tells them apart.

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

## Auto-incrementing keys

```ts
t.increments('id')      // 32-bit auto-increment PK (default name 'id')
t.bigIncrements('id')   // 64-bit auto-increment PK
```

The compiler emits the dialect-appropriate identity clause: SQLite
`AUTOINCREMENT`, Postgres `GENERATED … AS IDENTITY`, MySQL `AUTO_INCREMENT`.
Both mark the column primary and not-null.

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

## Indexes

```ts
t.index('email')                       // idx_<table>_email
t.index(['tenant_id', 'created_at'], 'idx_tenant_recent')
t.uniqueIndex('email')                 // CREATE UNIQUE INDEX idx_<table>_email_unique
```

Inside `alterTable`, an index added alongside column ops compiles to its own
`CREATE INDEX`, appended in declaration order.

## Schema Builder

The Schema Builder defines database tables in code. It is used inside migration `up()` and `down()` methods through `this.schema`.

### Column Types

```typescript
this.schema.createTable('orders', (table) => {
  table.id()                           // UUID primary key (shortcut)
  table.uuid('external_ref')           // UUID
  table.string('status', 50)           // VARCHAR(50)
  table.text('notes')                  // TEXT
  table.integer('quantity')            // INTEGER
  table.bigInteger('views')            // BIGINT
  table.decimal('total', 10, 2)        // DECIMAL(10,2)
  table.boolean('active')              // BOOLEAN
  table.date('birthday')               // DATE
  table.timestamp('published_at')      // TIMESTAMP (no tz — UTC only when written via atlas)
  table.timestamptz('occurred_at')     // TIMESTAMPTZ (Postgres) — UTC-normalised for ALL writers
  table.json('metadata')               // JSON (Postgres) / TEXT (SQLite)
  table.jsonb('settings')              // JSONB (Postgres) / TEXT (SQLite)
  table.binary('avatar')               // BYTEA (Postgres) / BLOB (SQLite)
  table.timestamps()                   // created_at + updated_at (NOT NULL, DEFAULT CURRENT_TIMESTAMP)
})
```

> **`timestamp` vs `timestamptz`.** `timestamp` (without time zone) only round-trips
> as UTC for values atlas itself wrote; a DB-side `DEFAULT now()`, raw SQL, or a seed
> stores the server's local wall-clock, which then reads back drifted on a non-UTC
> host. **`timestamptz` normalises every writer to UTC**, so use it for any value you
> compare exactly or any column with a DB-side default. It pairs with
> `@column.dateTime()` unchanged (the decorator is decoupled from the SQL type). On
> MySQL/SQLite (no real tz type) `timestamptz` degrades to the plain timestamp mapping.

### Indexes

```typescript
this.schema.createTable('memberships', (table) => {
  table.uuid('id').primary()
  table.uuid('user_id').notNullable().references('users')
  table.uuid('residence_id').notNullable().references('residences')
  table.string('role', 30).notNullable()

  // Single column index
  table.index('user_id')

  // Composite index
  table.index(['user_id', 'residence_id'])

  // Unique index
  table.uniqueIndex('email')

  // Custom name
  table.index('status', 'idx_orders_status')
})
```

Inside an `alterTable`, an index is dropped the way it was created — by
columns, so a `down()` undoes an `up()` without naming anything:

```typescript
this.schema.alterTable('orders', (table) => {
  table.index(['user_id', 'status'])
})

this.schema.alterTable('orders', (table) => {
  table.dropIndex(['user_id', 'status'])
  table.dropIndex('status', 'a_custom_name')   // or by explicit name
})
```

An index is not a table constraint, so `dropIndex` is not `dropUnique`: a
`uniqueIndex()` carries a different default name, and dropping one means passing
that name.

Standalone index operations, outside any table:

```typescript
this.schema.createIndex('orders', ['user_id', 'status'])
this.schema.dropIndex('idx_orders_status')
this.schema.dropIndex('idx_orders_status', 'orders')   // MySQL needs the table
```

MySQL has no standalone `DROP INDEX` and no `IF EXISTS` on it — an index is
dropped through its table there. Pass the table name, or use the `alterTable`
form above, which knows it by construction.

### Column Modifiers

```typescript
table.string('email', 255)
  .notNullable()                  // NOT NULL
  .unique()                       // UNIQUE constraint
  .defaultTo('pending')           // DEFAULT 'pending'

table.timestamp('seen_at')
  .defaultTo(this.now())          // DEFAULT CURRENT_TIMESTAMP (SQLite) / NOW()

table.uuid('user_id')
  .references('users', 'id')      // FOREIGN KEY → users(id)
  .notNullable()
```

`defaultTo()` quotes and escapes a JavaScript value for you: pass `'pending'`, not
`"'pending'"`, or the stored default is the text `'pending'` with its quotes. A SQL
expression goes through `this.raw('...')` (emitted verbatim) or `this.now()`.

### Shortcut Methods

| Method | Effect |
|--------|--------|
| `table.id()` | UUID primary key with `gen_random_uuid()` default |
| `table.timestamps()` | Adds `created_at` and `updated_at` (NOT NULL, DEFAULT CURRENT_TIMESTAMP, valid on every dialect) |
