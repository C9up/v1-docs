# Configuration

Ream charge la configuration depuis un répertoire `config/` à la racine de votre projet. Chaque fichier de ce répertoire exporte un objet par défaut simple et est chargé automatiquement par l'Ignitor avant l'enregistrement du moindre provider.

## Fonctionnement

Pendant la phase `register`, l'Ignitor parcourt chaque fichier `.ts` / `.js` du répertoire `config/`, importe son export par défaut et le stocke dans le store de configuration de l'application sous le nom de base du fichier (sans extension).

```
config/database.ts  →  app.config.get('database')
config/auth.ts      →  app.config.get('auth')
config/logger.ts    →  app.config.get('logger')
```

Cela se produit avant l'exécution des providers, donc tout provider qui appelle `app.config.get()` dans sa méthode `boot()` trouvera toujours les valeurs dont il a besoin.

## Format d'un fichier de config

Chaque fichier de config est un simple module TypeScript qui exporte un objet par défaut. Il n'y a pas de wrapper obligatoire — exportez simplement ce dont vous avez besoin.

### config/database.ts

Lisez les variables d'environnement via `#start/env` et construisez les chemins du système de fichiers avec les helpers de chemin de `app` — jamais `process.env` ni `dirname(fileURLToPath(import.meta.url))` directement (voir ci-dessous).

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

## Variables d'environnement

Définissez et **validez** votre environnement dans `start/env.ts` avec `Env.create`, puis lisez les variables n'importe où via le `env.get()` typé. Cela reflète AdonisJS : le schéma charge les fichiers `.env*` au moment de l'import et refuse de démarrer si une variable requise est absente ou mal formée, de sorte qu'une faute de frappe apparaît immédiatement plutôt que sous la forme d'un `undefined` à l'exécution.

```typescript
// start/env.ts
import { Env } from '@c9up/ream'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  JWT_SECRET: Env.schema.string(),
  // Optionnel avec `.optional()` — `env.get` renvoie alors `T | undefined`.
  DB_PATH: Env.schema.string.optional(),
  REDIS_URL: Env.schema.string({ format: 'url' }).optional(),
})
```

Types du schéma : `string({ format?: 'host' | 'url' | 'email' })`, `number()`, `boolean()`, `enum([...] as const)`, chacun avec une variante `.optional()`. Les échecs de validation lèvent `E_INVALID_ENV_VARIABLES` accompagné d'une liste agrégée.

Lisez les variables dans les **fichiers de config** via `#start/env` — c'est son import qui charge `.env` avant l'évaluation de la config, dans tous les flux (serveur, console, tests) :

```typescript
import env from '#start/env.js'

const port = env.get('PORT')                      // typé `number`
const secret = env.get('JWT_SECRET')              // typé `string`
const dbPath = env.get('DB_PATH', '/tmp/app.db')  // valeur par défaut
```

::: warning
Ne lisez pas `process.env` directement dans les fichiers de config, les services ou les contrôleurs — faites transiter chaque variable par `start/env.ts` afin que l'application dispose d'une source de vérité unique et validée. `process.env` n'appartient qu'aux points d'entrée d'amorçage (`bin/*.ts`, `start/env.ts`).
:::

Un fichier `.env` à la racine du projet contient les valeurs locales (`.env.test`, `.env.production` sont pris en compte selon `NODE_ENV`) :

```env
NODE_ENV=development
PORT=3000
HOST=localhost
JWT_SECRET=change-me-at-least-32-characters-long
```

## Chemins du système de fichiers

Utilisez les helpers de chemin de `app` au lieu de recalculer `dirname(fileURLToPath(import.meta.url))` dans chaque fichier. Ils se résolvent par rapport à la racine du projet avec laquelle l'Ignitor a été construit.

```typescript
import app from '@c9up/ream/services/app'

app.makePath('data', 'app.db')   // <root>/data/app.db
app.configPath('database.ts')    // <root>/config/database.ts
app.migrationsPath()             // <root>/database/migrations
app.tmpPath('uploads')           // <root>/tmp/uploads
app.publicPath('style.css')      // <root>/public/style.css
```

## Accéder à la config

Partout où vous avez accès à l'instance de l'application, appelez `app.config.get<T>()` avec la clé de config et un argument de type générique optionnel pour la sûreté de typage.

### Dans un provider

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

### Dans un service

```typescript
import { app } from '@c9up/ream'

const logLevel = app.config.get<{ level: string }>('logger')?.level ?? 'info'
```

`get<T>()` renvoie `T | undefined`, donc protégez-vous toujours contre le cas `undefined` lorsque la clé de config peut être absente.

## Alias de chemins

Les projets Ream utilisent les [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) de Node.js pour garder des instructions d'import courtes. Les alias sont déclarés dans `package.json` sous le champ `"imports"`, puis recopiés dans `tsconfig.json` pour que TypeScript les résolve également.

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

Ces alias fonctionnent dans tous les fichiers que Node.js ou le compilateur TypeScript résout — fichiers de routes, providers, tests, `reamrc.ts`, etc.

```typescript
// Sans alias
import { UserService } from '../../../app/modules/user/services/UserService.js'

// Avec alias
import { UserService } from '#modules/user/services/UserService.js'
```

## Étapes suivantes

- [Providers](/fr/guide/providers) — consommer la config dans le cycle de vie de boot
- [Atlas (ORM)](/fr/modules/atlas) — configuration de la base de données et migrations
