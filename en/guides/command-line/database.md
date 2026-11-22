# Database commands

This guide covers the database commands:

- Every store, not just the relational one
- Writing a runner for your own store

## Migrations

```bash
ream migrate                # Run pending migrations, for every registered store
ream migrate:rollback       # Rollback the last batch
ream migrate:status         # Show what has run and what has not
ream migrate --only eon     # Just one store
```

### Every store, not just the relational one

Output is prefixed by the store it came from:

```
  [atlas] ✓ 001_create_users (batch 1)
  [eon]   ○ 001_create_meters
```

Ream expects several stores in one app — a relational one, a time-series one,
whatever comes next — so the command names none of them: it drives whatever is
in the `migrations` registry.

A data package registers its runner from its provider, under the app's
`migrations` binding. Two consequences worth knowing:

- **Shipping a new store never requires a new CLI.** The `ream` binary is
  published apart from the packages; anything it knew about a package name
  would be a version coupling.
- **An app with only a time-series store can migrate.** The command used to
  refuse to start without a `database/migrations/` directory, which is atlas's
  convention. Each runner now knows its own directory.

Sources run **sequentially**, not in parallel: two stores sharing a database
server would contend on locks, and interleaved output makes a failure
impossible to attribute.

### Writing a runner for your own store

Three methods are required — the three the commands call:

```ts
interface MigrationRunnerContract {
  migrate(): Promise<string[]>              // names applied, in order
  rollback(): Promise<string[]>             // names rolled back
  status(): Promise<MigrationStatusNode[]>  // { name, status, batch? }

  reset?(): Promise<string[]>               // the rest are optional
  refresh?(): Promise<unknown>
  fresh?(): Promise<unknown>
  dryRun?(): Promise<unknown>
  forceUnlock?(): Promise<boolean>
}
```

The rest are optional on purpose: a store must be able to register a runner
that only knows how to go forward, rather than stub methods it cannot honour.

Register it from your provider, resolving the binding structurally so your
package does not depend on `@c9up/ream`:

```ts
const registry = await container.resolve('migrations')
registry.register({
  name: 'mystore',
  directory: 'database/mystore-migrations',
  runner: myRunner,
})
```

Registering a name twice is refused rather than silently replaced — one of the
two providers would migrate nothing while the run still reported success.

::: tip Where these commands live
`migrate`, `migrate:rollback`, `migrate:status`, `schedule:list` and
`schedule:run` are command classes in `@c9up/ream`, registered by the framework
itself — not subcommands of the binary. The binary dispatches any name it does
not own to the application's console kernel, which is also how a package's own
commands run without a line of Rust. An application with no data package
reports that nothing registered, and exits 0.
:::
