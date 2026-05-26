# Configuration

Ream utilise des fichiers de configuration par module avec `defineConfig()` typé, suivant le pattern AdonisJS.

## Fichiers de config

Chaque module a son propre fichier de config dans `config/` :

```typescript
// config/atlas.ts
import { defineConfig, env } from '@c9up/ream'

export default defineConfig({
  connection: env('DB_CONNECTION', 'postgres'),
  connections: {
    postgres: {
      host: env('DB_HOST', 'localhost'),
      port: Number(env('DB_PORT', '5432')),
      database: env('DB_DATABASE', 'ream'),
      user: env('DB_USER', 'postgres'),
      password: env('DB_PASSWORD'),
    },
    sqlite: {
      filename: env('DB_FILENAME', './data/dev.sqlite'),
    },
  },
})
```

## Variables d'environnement

Utilisez le helper `env()` pour lire les fichiers `.env` :

```typescript
import { env } from '@c9up/ream'

env('DB_HOST')                 // Retourne la valeur ou undefined
env('DB_HOST', 'localhost')    // Retourne la valeur ou la valeur par défaut
env('DB_PORT', '5432')         // Retourne toujours une string
```

### Fichier `.env`

```env
APP_NAME=my-ream-app
NODE_ENV=development

DB_CONNECTION=postgres
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=ream
DB_USER=postgres
DB_PASSWORD=secret

REDIS_HOST=localhost
REDIS_PORT=6379
```

### Environnement typé (`env.ts`)

Ream scaffold un fichier `env.ts` typé à la racine du projet. Il déclare la forme de vos variables d'environnement et augmente `process.env` pour l'autocomplétion :

```typescript
// env.ts
export interface Env {
  APP_NAME: string
  NODE_ENV: 'development' | 'production' | 'test'
  PORT: string
  DB_CONNECTION: 'postgres' | 'sqlite'
  DB_HOST: string
  DB_PORT: string
  DB_DATABASE: string
  DB_USER: string
  DB_PASSWORD: string
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Env {}
  }
}
```

Avec ce fichier, `process.env.DB_HOST` est typé comme `string` et votre IDE fournit l'autocomplétion pour toutes les variables d'environnement.

## Alias de chemins

Ream utilise les [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) de Node.js pour éliminer les chemins relatifs profonds. Les alias sont déclarés dans `package.json` :

```json
{
  "imports": {
    "#modules/*": "./app/modules/*",
    "#config/*": "./config/*",
    "#providers/*": "./providers/*",
    "#start/*": "./start/*"
  }
}
```

Et dupliqués dans `tsconfig.json` pour TypeScript :

```json
{
  "compilerOptions": {
    "paths": {
      "#modules/*": ["./app/modules/*"],
      "#config/*": ["./config/*"],
      "#providers/*": ["./providers/*"],
      "#start/*": ["./start/*"]
    }
  }
}
```

Utilisez-les partout :

```typescript
// Au lieu de
import { OrderService } from '../../../app/modules/order/services/OrderService.js'

// Écrivez
import { OrderService } from '#modules/order/services/OrderService.js'
```

Fonctionne dans `reamrc.ts`, les fichiers de routes, les tests — partout où TypeScript ou Node.js résout les imports.

## `defineConfig()`

Configuration type-safe — votre IDE fournit l'autocomplétion :

```typescript
import { defineConfig } from '@c9up/ream'

export default defineConfig({
  host: 'localhost',   // TS sait que c'est une string
  port: 3000,          // TS sait que c'est un number
})
```

## Accéder à la config

Dans un provider :

```typescript
export default class AppProvider extends Provider {
  register() {
    const dbHost = this.app.config.get('database.host')
    // ...
  }
}
```

## Config Store

Le `SimpleConfigStore` gère toute la configuration :

```typescript
import { SimpleConfigStore } from '@c9up/ream'

const config = new SimpleConfigStore()
config.set('app.name', 'My App')
config.get('app.name')  // 'My App'

// Charger depuis un objet
config.loadFromObject({
  'database.host': 'localhost',
  'database.port': 5432,
})
```

## Étapes suivantes

- [Providers](/fr/guide/providers) — Accéder à la config dans les providers
- [Atlas (ORM)](/fr/modules/atlas) — Configuration de la base de données
