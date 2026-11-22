# Constraints

This guide covers constraints, foreign keys and CHECK:

- Constraints
- CHECK constraints
- Dropping constraints (alter mode)

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

t.uuid('author_id').references('users.id')  // dotted shorthand
```

A single argument without a dot is the table name (column defaults to `id`).

### Foreign keys — composite chain

`foreign(...)` returns a chainable that reads foreign columns, referenced columns, table, then actions:

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
> connection registers a `regexp` function.

## Dropping constraints (alter mode)

```ts
this.schema.alterTable('accounts', (t) => {
  t.dropPrimary()                                  // Postgres default name <table>_pkey
  t.dropUnique(['tenant_id', 'slug'])              // by columns (default name)
  t.dropUnique(['tenant_id', 'slug'], 'named_uq')  // or by explicit name
  t.dropForeign(['author_id'])                     // by columns or explicit name
})
```

Dropping by column list uses the `<table>_<columns>_<suffix>` naming
convention, so `unique([...])` / `dropUnique([...])` (and the foreign pair) agree
without naming anything.
