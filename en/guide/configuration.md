# Configuration

Ream loads configuration from a `config/` directory at your project root. Each file in that directory exports a plain default object and is auto-loaded by Ignitor before any provider is registered.

## How it works

During the `register` phase, Ignitor scans every `.ts` / `.js` file inside `config/`, imports its default export, and stores it in the application config store under the file's base name (without extension).

```
config/database.ts  →  app.config.get('database')
config/auth.ts      →  app.config.get('auth')
config/logger.ts    →  app.config.get('logger')
```

This happens before providers run, so any provider that calls `app.config.get()` in its `boot()` method will always find the values it needs.

## Config file format

Each config file is a plain TypeScript module that exports a default object. There is no required wrapper — just export what you need.

### config/database.ts

Read environment variables through `#start/env` and build filesystem paths with the `app` path helpers — never `process.env` or `dirname(fileURLToPath(import.meta.url))` directly (see below).

```typescript
import app from '@c9up/ream/services/app'
import env from '#start/env.js'

export default {
  client: 'sqlite' as const,
  connection: {
    filename: env.get('DB_PATH', app.makePath('data', 'app.db')),
  },
  migrations: {
    path: app.migrationsPath(),
  },
}
```

### config/auth.ts

```typescript
import env from '#start/env.js'

export default {
  defaultStrategy: 'jwt',
  jwt: {
    secret: env.get('JWT_SECRET'),
    expiresInSeconds: 86400,
  },
}
```

## Environment variables

Define and **validate** your environment in `start/env.ts` with `Env.create`, then read variables anywhere through the typed `env.get()`. This mirrors AdonisJS: the schema loads the `.env*` files at import time and refuses to boot if a required variable is missing or malformed, so a typo surfaces immediately instead of as a runtime `undefined`.

```typescript
// start/env.ts
import { Env } from '@c9up/ream'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  JWT_SECRET: Env.schema.string(),
  // Optional with `.optional()` — `env.get` then returns `T | undefined`.
  DB_PATH: Env.schema.string.optional(),
  REDIS_URL: Env.schema.string({ format: 'url' }).optional(),
})
```

Schema types: `string({ format?: 'host' | 'url' | 'email' })`, `number()`, `boolean()`, `enum([...] as const)`, each with an `.optional()` variant. Validation failures throw `E_INVALID_ENV_VARIABLES` with an aggregated list.

Read variables in **config files** via `#start/env` — importing it is what loads `.env` before the config is evaluated, in every flow (server, console, tests):

```typescript
import env from '#start/env.js'

const port = env.get('PORT')                      // typed `number`
const secret = env.get('JWT_SECRET')              // typed `string`
const dbPath = env.get('DB_PATH', '/tmp/app.db')  // fallback
```

::: warning
Do not read `process.env` directly in config files, services, or controllers — funnel every variable through `start/env.ts` so the app has a single, validated source of truth. `process.env` belongs only to the bootstrap entry points (`bin/*.ts`, `start/env.ts`).
:::

A `.env` file at the project root holds local values (`.env.test`, `.env.production` are picked up by `NODE_ENV`):

```env
NODE_ENV=development
PORT=3000
HOST=localhost
JWT_SECRET=change-me-at-least-32-characters-long
```

## Filesystem paths

Use the `app` path helpers instead of recomputing `dirname(fileURLToPath(import.meta.url))` in every file. They resolve against the project root the Ignitor was constructed with.

```typescript
import app from '@c9up/ream/services/app'

app.makePath('data', 'app.db')   // <root>/data/app.db
app.configPath('database.ts')    // <root>/config/database.ts
app.migrationsPath()             // <root>/database/migrations
app.tmpPath('uploads')           // <root>/tmp/uploads
app.publicPath('style.css')      // <root>/public/style.css
```

There is one helper per conventional directory, the AdonisJS layout directory
for directory:

```typescript
app.httpControllersPath()   // app/controllers      app.modelsPath()        // app/models
app.servicesPath()          // app/services         app.middlewarePath()    // app/middleware
app.policiesPath()          // app/policies         app.validatorsPath()    // app/validators
app.exceptionsPath()        // app/exceptions       app.eventsPath()        // app/events
app.listenersPath()         // app/listeners        app.transformersPath()  // app/transformers
app.mailersPath()           // app/mailers          app.mailsPath()         // app/mails
app.startPath()             // start                app.commandsPath()      // commands
app.providersPath()         // providers            app.contractsPath()     // contracts
app.viewsPath()             // resources/views      app.languageFilesPath() // resources/lang
app.seedersPath()           // database/seeders     app.factoriesPath()     // database/factories
app.generatedClientPath()   // .ream/client         app.generatedServerPath() // .ream/server
```

Plus `app.makeURL(...)`, which gives a URL where `makePath` gives a path — what
an importer wants — and `app.relativePath(absolute)`, its inverse.

### Moving a directory

The layout is not hardcoded. Name the directories that moved in `reamrc.ts` and
every helper follows:

```typescript
export default defineConfig({
  directories: {
    httpControllers: 'app/http/controllers',
    models: 'src/entities',
  },
})
```

Only what you name changes; the rest keep their defaults. The overrides reach
the application as soon as the rc file loads, so a provider calling a path
helper from `register()` already sees them.

::: tip `.ream/`, not `.adonisjs/`
`generatedClientPath()` and `generatedServerPath()` write under `.ream/`. A
dot-directory in your project is product identity, so this is one of the few
places Ream deliberately does not copy the upstream name.
:::

## Accessing config

Anywhere you have access to the application instance, call `app.config.get<T>()` with the config key and an optional generic type argument for type safety.

### In a provider

```typescript
import { Provider } from '@c9up/ream'
import type { AtlasDatabaseConfig } from '@c9up/atlas'

export default class AppProvider extends Provider {
  async boot() {
    const db = this.app.config.get<AtlasDatabaseConfig>('database')
    // db.client, db.connection.filename, etc.
  }
}
```

### In a service

```typescript
import { app } from '@c9up/ream'

const logLevel = app.config.get<{ level: string }>('logger')?.level ?? 'info'
```

`get<T>()` returns `T | undefined`, so always guard against the undefined case when the config key may not be present.

## Path aliases

Ream projects use Node.js [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) to keep import statements short. Aliases are declared in `package.json` under the `"imports"` field, then mirrored in `tsconfig.json` so TypeScript resolves them too.

### package.json

```json
{
  "imports": {
    "#modules/*": "./app/modules/*",
    "#config/*": "./config/*",
    "#middleware/*": "./app/middleware/*",
    "#exceptions/*": "./app/exceptions/*",
    "#providers/*": "./providers/*",
    "#start/*": "./start/*"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "paths": {
      "#modules/*": ["./app/modules/*"],
      "#config/*": ["./config/*"],
      "#middleware/*": ["./app/middleware/*"],
      "#exceptions/*": ["./app/exceptions/*"],
      "#providers/*": ["./providers/*"],
      "#start/*": ["./start/*"]
    }
  }
}
```

These aliases work in all files that Node.js or the TypeScript compiler resolves — route files, providers, tests, `reamrc.ts`, and so on.

```typescript
// Without alias
import { UserService } from '../../../app/modules/user/services/UserService.js'

// With alias
import { UserService } from '#modules/user/services/UserService.js'
```

## Next steps

- [Providers](/en/guide/providers) — consume config in the boot lifecycle
- [Atlas (ORM)](/en/modules/atlas) — database configuration and migrations
