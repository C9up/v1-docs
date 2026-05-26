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

```typescript
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default {
  client: 'sqlite' as const,
  connection: {
    filename: join(__dirname, '..', 'data', 'app.db'),
  },
  migrations: {
    path: join(__dirname, '..', 'database', 'migrations'),
  },
}
```

### config/auth.ts

```typescript
export default {
  defaultStrategy: 'jwt',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me-in-production',
    expiresInSeconds: 86400,
  },
}
```

### config/logger.ts

```typescript
export default {
  level: process.env.LOG_LEVEL ?? 'info',
}
```

## Environment variables

Use `process.env` directly in config files. Because config is loaded at boot time (not at import time), the values are read once when the application starts.

```typescript
export default {
  secret: process.env.APP_SECRET,
  debug: process.env.NODE_ENV !== 'production',
  port: Number(process.env.PORT ?? 3000),
}
```

A `.env` file at the project root is the conventional place to define local values:

```env
NODE_ENV=development
LOG_LEVEL=debug
JWT_SECRET=change-me-at-least-32-characters-long
PORT=3000
```

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
