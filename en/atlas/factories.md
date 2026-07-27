# Atlas - Model Factories

Factories generate test data — Lucid-compatible. They build model instances from
a defaults callback, layer on named states, override fields ad-hoc, and (on the
persistence path) create related rows. `faker` is wired in for fake data.

## Defining a factory

Two equivalent entry points. The one-call `factory(Model, defaults)` shorthand,
or the `Factory.define(Model, defaults).build()` form (AdonisJS Lucid parity):

```ts
import { factory, Factory } from '@c9up/atlas'
import { User } from '#models/user'

// Shorthand — returns the builder directly.
const UserFactory = factory(User, ({ faker }) => ({
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: 'member',
}))

// Lucid `define().build()` form — identical result.
const UserFactory2 = Factory.define(User, ({ faker }) => ({
  email: faker.internet.email(),
})).build()
```

The defaults callback receives a `FactoryContext` — `{ faker, isStubbed, $trx }`
— and returns the row shape. It is re-evaluated per row on `makeMany`/`createMany`
so `faker` produces distinct values each time.

## `make` vs `create` vs `makeStubbed`

| Method | Persists? | Primary key | `$isPersisted` |
| --- | --- | --- | --- |
| `make()` | No | none | `false` |
| `makeStubbed()` | No | stub id (process-unique) | `true` |
| `create()` | Yes (INSERT) | real DB id | `true` |

- `make()` builds a plain un-persisted instance — no DB round trip, no PK. Use it
  to exercise model logic (computed properties, validation).
- `makeStubbed()` builds an un-persisted instance that *looks* saved: it is marked
  persisted and gets a process-unique **stub id** (unless the build already set the
  PK), so relations and serialization work without touching the DB.
- `create()` persists through the repository, firing the model's lifecycle hooks,
  and returns the row with its real database id.

Each has a `*Many` variant: `makeMany(n)`, `makeStubbedMany(n)`, `createMany(n, db)`.

## define + create + createMany + state

```ts
const UserFactory = factory(User, ({ faker }) => ({
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: 'member',
}))
  .state('admin', (user) => { user.role = 'admin' })
  .state('suspended', (user) => { user.suspendedAt = new Date() })

// One persisted row.
const user = await UserFactory.create(db)

// Ten rows, distinct faker values per row.
const members = await UserFactory.createMany(10, db)

// Activate a named state for the next build.
const admin = await UserFactory.apply('admin').create(db)

// States compose — multiple applies all fire, in order.
const banned = await UserFactory.apply('admin', 'suspended').create(db)
```

## States

`state(name, fn)` declares a named variation; the callback receives the built
**instance** and the context. `apply(...names)` activates one or more states for
the **next** build only (the pending set resets after each make/create). An
undefined state name throws.

```ts
const factory = UserFactory
  .state('verified', (user, { faker }) => {
    user.verifiedAt = faker.date.past()
  })

const u = factory.apply('verified').makeStubbed()
```

## Overriding fields — `merge` / `mergeRecursive`

`merge()` overrides fields for the next call only (reset after consumption). It
accepts three shapes:

```ts
// Object — shallow-merge onto the resolved attributes.
UserFactory.merge({ name: 'Alice' }).create(db)

// Callback — mutate the built instance imperatively (Lucid `merge`).
UserFactory.merge((user, attributes) => { user.name = attributes.name }).make()

// Array — per-row override on makeMany/createMany (index i → row i).
UserFactory.merge([{ role: 'admin' }, { role: 'member' }]).createMany(2, db)
```

`mergeRecursive()` deep-merges nested plain objects key by key instead of
replacing them wholesale (Lucid `mergeRecursive`); arrays and non-plain values
still replace. On a `.with()` graph, a recursive merge cascades onto every related
factory.

## Stub ids

Every `makeStubbed*` build with no explicit PK gets the next value of a
process-wide counter — stable, distinct, DB-free identifiers. For models with
non-integer primary keys (uuid, etc.), override the generator globally:

```ts
import { Factory } from '@c9up/atlas'
import { randomUUID } from 'node:crypto'

Factory.stubId((counter, model) => randomUUID())

// Restore the default incrementing integer.
Factory.stubId(null)
```

The callback receives the running counter and the instance and returns the id to
assign.

## Building relations — `relation` + `with`

Declare which factory builds a relation, then queue related rows with `with()`.
`with()` runs on the **persistence path only** — `make`/`makeStubbed` ignore it.

```ts
const PostFactory = factory(Post, ({ faker }) => ({
  title: faker.lorem.sentence(),
}))

const UserFactory = factory(User, ({ faker }) => ({
  email: faker.internet.email(),
}))
  .relation('posts', () => PostFactory)

// Create a user with 3 posts (atomic — see below).
const user = await UserFactory.with('posts', 3).create(db)
```

`relation(name, resolver)` — `name` must match a relation property declared with
`@HasMany` / `@HasOne` / `@BelongsTo` / `@ManyToMany`. `with(name, count?, callback?)`
queues `count` (default 1) related rows; the callback receives the related factory
to customize it — `merge` / `apply`, `.pivotAttributes()`, and its own nested
`.with()` (arbitrarily deep):

```ts
const user = await UserFactory
  .with('posts', 3, (post) => {
    post.merge({ published: true }).with('comments', 5)
  })
  .create(db)
```

When a `.with()` graph is present the whole graph runs in a managed transaction:
if a related write fails, the parent INSERT rolls back too. A relation name with
no registered factory, or an undeclared relation, throws.

### Pivot attributes (many-to-many)

Inside a `.with()` callback on a many-to-many relation, `pivotAttributes()` sets
columns written on the pivot row alongside the link. A single object applies to
every linked row; an array sets per-row values (its length must match the
related-row count, else it throws):

```ts
const user = await UserFactory
  .with('roles', 2, (role) => {
    role.pivotAttributes([{ scope: 'read' }, { scope: 'write' }])
  })
  .create(db)
```

## Lifecycle hooks — `before` / `after` / `tap`

`before(event, cb)` and `after(event, cb)` register **persistent** hooks (declared
once, fire on every build). The callback receives the factory, the model instance,
and the context.

```ts
const UserFactory = factory(User, ({ faker }) => ({ email: faker.internet.email() }))
  .before('create', (_factory, user) => { user.slug = user.email.split('@')[0] })
  .after('create', (_factory, user) => { /* row is inserted here */ })
```

- `before`: `'create'` fires before the INSERT; `'makeStubbed'` fires before the
  stub id is finalised (so a hook can assign the PK).
- `after`: `'create'` fires after the INSERT; `'makeStubbed'` after the stub is
  built; `'make'` after an un-persisted `make`/`makeMany` instance is built.

`tap(fn)` is **transient** (reset after consumption) and runs on the built instance
on every instance-producing path (`make`/`makeMany`/`create`/`createMany`/
`makeStubbed*`). It receives the model, the context, and the builder:

```ts
UserFactory.tap((user, { faker }) => { user.token = faker.string.uuid() }).make()
```

## Custom instantiation — `newUp`

Replace the default `new Model()` + property assignment (Lucid `.newUp`). The
callback receives the resolved attributes and the context and returns the instance
to use for every subsequent build:

```ts
UserFactory.newUp((attributes) => {
  const user = new User()
  user.merge(attributes)
  return user
})
```

## Binding a connection

`create`/`createMany` take an explicit `db` argument, or you can bind one so calls
that omit it use the binding (ideal for test isolation with a transaction):

```ts
// Bind a transaction/connection directly (Lucid `.client`).
UserFactory.client(trx).create()

// Resolve a registered connection by name (Lucid `.connection`).
UserFactory.connection('primary').create()

// Options-object sugar (Lucid `.query({ client }) / .query({ connection })`);
// `client` wins over `connection`.
UserFactory.query({ client: trx }).createMany(5)
```

The explicit `db` passed to `create()`/`createMany()` always wins over the bound
connection. With no connection at all, `create`/`createMany` throw.
