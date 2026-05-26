# Providers

Les providers sont la couche d'intégration entre le framework Ream et tout le reste — bases de données, authentification, mail, files d'attente et vos propres services métier. Toute fonctionnalité qui doit être mise en place avant que l'application accepte des requêtes passe par un provider.

## Cycle de vie d'un provider

Un provider est une classe qui étend `Provider` et implémente jusqu'à cinq méthodes de cycle de vie. Ces méthodes sont appelées dans l'ordre au démarrage et dans l'ordre inverse à l'arrêt.

```
register() → boot() → start() → ready() → [en cours d'exécution] → shutdown()
```

```typescript
import { Provider } from '@c9up/ream'

export default class DatabaseProvider extends Provider {
  /** Phase 1 — synchrone. Enregistrer uniquement les liaisons du conteneur. */
  register(): void {
    this.app.container.singleton('db', () => {
      return new DatabaseManager(this.app.config.get('database'))
    })
  }

  /** Phase 2 — async. Vérifier les connexions et préparer le module. */
  async boot(): Promise<void> {
    const db = this.app.container.make('db') as DatabaseManager
    await db.connect()
  }

  /** Phase 3 — async. S'exécute avant le démarrage du serveur HTTP. */
  async start(): Promise<void> {
    // Préchauffer les caches, effectuer des vérifications de santé, enregistrer des routes dynamiques
  }

  /** Phase 4 — async. Le serveur HTTP accepte désormais les requêtes. */
  async ready(): Promise<void> {
    const db = this.app.container.make('db') as DatabaseManager
    console.log(`Database ready — connected to ${db.host}`)
  }

  /** Arrêt — nettoyage dans l'ordre inverse des providers. */
  async shutdown(): Promise<void> {
    const db = this.app.container.make('db') as DatabaseManager
    await db.disconnect()
  }
}
```

### Ce qui appartient à chaque phase

| Phase | Sync/Async | Travail autorisé |
|---|---|---|
| `register()` | Sync | Liaisons du conteneur, rien d'autre |
| `boot()` | Async | Connexion aux services externes, vérification de la config |
| `start()` | Async | Routes dynamiques, préchauffage du cache, vérifications de santé |
| `ready()` | Async | Journaliser la disponibilité, démarrer les workers en arrière-plan |
| `shutdown()` | Async | Fermer les connexions, vider les tampons |

`register()` est la seule méthode synchrone. Toutes les autres peuvent être `async`. Aucune méthode n'est obligatoire — implémentez uniquement celles dont vous avez besoin.

## Enregistrer les providers dans `reamrc.ts`

Listez les providers en tant qu'imports dynamiques dans `reamrc.ts`. Ream importe chacun d'eux durant la phase REGISTER et appelle leurs méthodes de cycle de vie dans l'ordre.

```typescript
// reamrc.ts
import { defineConfig } from '@c9up/ream'

export default defineConfig({
  providers: [
    () => import('@c9up/spectrum/provider'),
    () => import('@c9up/atlas/provider'),
    () => import('@c9up/warden/provider'),
    () => import('./providers/AppProvider.js'),
  ],
  preloads: [() => import('./start/kernel.js')],
  modules: { path: './app/modules' },
})
```

Les providers s'exécutent dans l'ordre listé. L'arrêt inverse cet ordre — le dernier provider enregistré est le premier à être arrêté.

### Providers limités à un environnement

Un provider peut être restreint à des environnements spécifiques en utilisant la forme objet :

```typescript
providers: [
  () => import('@c9up/atlas/provider'),
  {
    file: () => import('./providers/DevToolsProvider.js'),
    environment: ['web'],
  },
]
```

Le champ `environment` est comparé à la valeur définie par `.httpServer()`, `.console()` ou `.testMode()` sur l'Ignitor.

## Providers du framework

Les packages officiels de Ream fournissent chacun leur propre provider. Ajoutez-les dans `reamrc.ts` et ils se configurent automatiquement à partir de votre répertoire `config/`.

### `@c9up/spectrum/provider`

Enregistre la couche HTTP, le pipeline de middleware du serveur et le gestionnaire d'exceptions.

### `@c9up/atlas/provider`

Lit `config/database.ts`, connecte l'ORM et enregistre le gestionnaire de base de données dans le conteneur.

```typescript
// config/database.ts
export default {
  connection: 'pg',
  connections: {
    pg: {
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_NAME ?? 'myapp',
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? '',
    },
  },
}
```

En interne, Atlas lit cette configuration via `this.app.config.get('database')`. Vous n'appelez jamais `this.app.config.set(...)` manuellement — l'Ignitor parcourt le répertoire `config/` automatiquement durant REGISTER.

### `@c9up/warden/provider`

Lit `config/auth.ts`, enregistre les guards et configure le gestionnaire d'authentification.

```typescript
// config/auth.ts
export default {
  guard: 'jwt',
  guards: {
    jwt: {
      driver: 'jwt',
      secret: process.env.JWT_SECRET ?? 'change-me',
    },
  },
}
```

## Comment fonctionne le chargement automatique de la config

Durant la Phase 1 (REGISTER), l'Ignitor parcourt le répertoire `config/` à la racine de votre projet et importe chaque fichier `.ts` / `.js` qu'il trouve. L'export par défaut de chaque fichier est stocké dans `app.config` sous le nom du fichier (sans extension).

```
config/
  database.ts   → app.config.get('database')
  auth.ts       → app.config.get('auth')
  mail.ts       → app.config.get('mail')
```

Cela se produit avant l'exécution de la méthode `register()` de tout provider, de sorte que la config est toujours disponible à l'intérieur des providers.

Les fichiers sont triés par ordre alphabétique avant l'import. Il n'y a pas d'étape d'enregistrement manuel — déposer un fichier dans `config/` suffit.

## Providers au niveau de l'application

Créez `providers/AppProvider.ts` pour vos propres services métier. C'est l'endroit approprié pour enregistrer les singletons spécifiques à l'application qui n'appartiennent pas à un module du framework.

```typescript
// providers/AppProvider.ts
import { Provider } from '@c9up/ream'
import { UserRepository } from '../app/repositories/UserRepository.js'
import { MailService } from '../app/services/MailService.js'

export default class AppProvider extends Provider {
  register(): void {
    // Enregistrer les services applicatifs dans le conteneur
    this.app.container.singleton('mail', () => {
      const config = this.app.config.get<{ apiKey: string }>('mail')
      return new MailService(config!.apiKey)
    })
  }

  async boot(): Promise<void> {
    // Vérifier que le service mail peut se connecter
    const mail = this.app.container.make<MailService>('mail')
    await mail.verify()
  }

  async shutdown(): Promise<void> {
    const mail = this.app.container.make<MailService>('mail')
    await mail.drain()
  }
}
```

Si vos services sont décorés avec `@Service()`, vous n'avez pas besoin de les enregistrer dans un provider — le conteneur les découvre automatiquement. Les providers sont destinés aux services qui nécessitent une configuration asynchrone ou un contrôle explicite de la factory.

## Lire la config dans un provider

```typescript
import { Provider } from '@c9up/ream'

interface RedisConfig {
  host: string
  port: number
  password?: string
}

export default class CacheProvider extends Provider {
  register(): void {
    this.app.container.singleton('cache', () => {
      const config = this.app.config.get<RedisConfig>('redis')!
      return new RedisCache(config)
    })
  }

  async boot(): Promise<void> {
    const cache = this.app.container.make<RedisCache>('cache')
    await cache.ping()
  }
}
```

`this.app.config.get(key)` retourne l'export par défaut de `config/<key>.ts`. Le paramètre de type générique est optionnel mais recommandé.

## Récapitulatif de l'ordre d'exécution

Avec ce `reamrc.ts` :

```typescript
providers: [
  () => import('@c9up/atlas/provider'),    // AtlasProvider
  () => import('@c9up/warden/provider'),   // WardenProvider
  () => import('./providers/AppProvider.js'), // AppProvider
]
```

La séquence d'appels est :

```
AtlasProvider.register()
WardenProvider.register()
AppProvider.register()

AtlasProvider.boot()
WardenProvider.boot()
AppProvider.boot()

AtlasProvider.start()
WardenProvider.start()
AppProvider.start()

AtlasProvider.ready()
WardenProvider.ready()
AppProvider.ready()

--- application en cours d'exécution ---

AppProvider.shutdown()
WardenProvider.shutdown()
AtlasProvider.shutdown()   ← ordre inversé
```

## Étapes suivantes

- [Cycle de vie](/fr/guide/lifecycle) — Séquence de démarrage complète de l'Ignitor et hooks de l'application
- [Conteneur IoC](/fr/guide/container) — Enregistrement et résolution des dépendances
- [Configuration](/fr/guide/configuration) — Config typée avec `defineModuleConfig`
