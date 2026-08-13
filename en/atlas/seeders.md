# Atlas - Seeders

Seeders populate the database with default, reference, or test data. Atlas
mirrors Adonis Lucid's seeder API — a base class you extend, a directory runner,
and two console commands (`make:seeder` / `db:seed`).

Atlas has no global config registry (Lucid parity): you always pass your own
paths and connection, so nothing is discovered implicitly.

## Writing a seeder

Extend `BaseSeeder` and implement `run()`. The database connection is injected
through the constructor and exposed as both `this.db` and `this.client` (the
Lucid alias), so you can build repositories inside `run()` without reaching for
globals.

Make the body idempotent — `upsert` keyed on a unique column is the recommended
pattern so a seeder is safe to re-run.

```ts
// database/seeders/1700000000000_CountrySeeder.ts
import { BaseSeeder, BaseRepository } from '@c9up/atlas'
import { Country } from '#models/country'

export default class CountrySeeder extends BaseSeeder {
  async run() {
    const countries = new BaseRepository(Country, this.db)
    // Conflict on isoCode → update name. Safe to re-run.
    await countries.upsert(
      [
        { isoCode: 'FR', name: 'France' },
        { isoCode: 'IN', name: 'India' },
      ],
      ['isoCode'],
      ['name'],
    )
  }
}
```

`run()` may return `void` or a `Promise` — async bodies are awaited.

Every seeder file must `export default` a class extending `BaseSeeder`; the
runner throws `E_SEEDER_INVALID` otherwise.

> `Seeder` is a legacy alias of `BaseSeeder` kept for older code. New seeders
> should extend `BaseSeeder`.

## Environment gating

Set the static `environment` array to restrict a seeder to specific
environments. When the runner is given the current environment, it skips any
seeder whose list excludes it. Leaving `environment` unset runs the seeder
everywhere.

```ts
export default class DemoUsersSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run() {
    // only runs in development / testing
  }
}
```

## Running seeders programmatically

### `runSeeders(seeders)`

Run a pre-built list of seeder **instances** in order. Each `run()` is awaited
sequentially, so ordering is deterministic and one seeder's side effects are
visible to the next.

```ts
import { runSeeders } from '@c9up/atlas'

await runSeeders([
  new CountrySeeder(db),
  new CurrencySeeder(db),
])
```

### `runSeederDirectory(dir, db, options?)`

Discover the `.ts` / `.js` seeder files under `dir`, import them in sorted
order, build an instance of each with `db`, and run them sequentially. Returns
the list of executed seeder names (file names without extension).

```ts
import { runSeederDirectory } from '@c9up/atlas'

const executed = await runSeederDirectory('database/seeders', db)
// → ['1700000000000_CountrySeeder', '1700000000001_CurrencySeeder']
```

Options:

- `files` — run only these seeders, matched by base name (`CountrySeeder`) or by
  a full / relative file path (`database/seeders/CountrySeeder.ts`); the runner
  compares the basename without extension. Mirrors Lucid `--files`.
- `naturalSort` — sort files numerically (`2_x` before `10_x`) instead of the
  default lexicographic order. Mirrors Lucid `naturalSort`.
- `environment` — the current environment; skips any seeder whose static
  `environment` excludes it.

If `dir` does not exist the runner throws `E_SEEDER_DIR_NOT_FOUND`.

```ts
await runSeederDirectory('database/seeders', db, {
  files: ['CountrySeeder'],
  naturalSort: true,
  environment: 'development',
})
```

## Console commands

The commands are Ream-idiomatic classes — the same
shape as the migration commands — registered under `reamrc.commands`. Each
factory takes the `seedersDir` (and, for `db:seed`, optional `naturalSort` /
`environment` defaults).

```ts
export interface SeederCommandOptions {
  seedersDir: string
  naturalSort?: boolean
  environment?: string
}
```

### `make:seeder`

Scaffold a new seeder file in `seedersDir`. The file is prefixed with
`Date.now()` so it keeps creation order under the runner's lexicographic sort
(the same convention as migrations), and it is written with the `wx` flag so an
existing seeder is never overwritten. The name is validated — path separators
and traversal are rejected.

```ts
// commands/make-seeder.ts
import { makeSeederCommand } from '@c9up/atlas'

export default makeSeederCommand({ seedersDir: 'database/seeders' })
```

```sh
node ace make:seeder CountrySeeder
# → Created database/seeders/1700000000000_CountrySeeder.ts
```

The scaffold extends `BaseSeeder` with an empty async `run()` and a commented
`upsert` example to fill in.

### `db:seed`

Run the seeders in `seedersDir`.

```ts
// commands/seed.ts
import { dbSeedCommand } from '@c9up/atlas'

export default dbSeedCommand({ seedersDir: 'database/seeders' })
```

```sh
node ace db:seed
# → Seeded: 1700000000000_CountrySeeder, 1700000000001_CurrencySeeder
```

Flags:

- `--files=A,B` — run only the named seeders (comma-separated). Mirrors Lucid
  `--files`.
- `--connection=name` — run against a specific registered connection instead of
  the default. Mirrors Lucid `--connection`.
- `--environment=name` — override the environment used for `static environment`
  gating; falls back to the factory's `environment`, then `NODE_ENV`.
- `--compact-output` — print a single summary line (`Seeded N seeder(s)`)
  instead of listing each seeder.
- `--interactive` — accepted for Lucid compatibility only. The console kernel is
  non-interactive, so it prints a warning and runs every selected seeder without
  prompting.

```sh
node ace db:seed --files=CountrySeeder,CurrencySeeder --connection=pg
```

If no connection is available (or the named `--connection` is not registered),
`db:seed` prints an error and exits with a non-zero code — check that
`AtlasProvider` is registered.
