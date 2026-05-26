# Cycle de vie de l'application

Ream suit une séquence de démarrage en quatre phases inspirée d'AdonisJS. Chaque provider, fichier de préchargement et fichier de routes de module dispose d'un moment précis où il s'exécute. Comprendre cette séquence vous indique exactement où placer le code d'initialisation.

```
REGISTER → BOOT → START → READY → [en cours d'exécution] → SHUTDOWN
```

## `bin/server.ts` — le point d'entrée

Le point d'entrée canonique pour un serveur HTTP Ream :

```typescript
// bin/server.ts
import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@c9up/ream'

const APP_ROOT = new URL('../', import.meta.url)

new Ignitor(APP_ROOT, { port: 3000 })
  .tap((app) => {
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .useRcFile((await import('../reamrc.js')).default)
  .httpServer()
  .start()
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })
```

`import 'reflect-metadata'` doit être la première instruction du fichier. Elle active les métadonnées de décorateurs TypeScript pour l'injection par constructeur.

## Constructeur de l'Ignitor

```typescript
new Ignitor(APP_ROOT, config)
```

| Paramètre | Type | Description |
|---|---|---|
| `APP_ROOT` | `URL` | `new URL('../', import.meta.url)` depuis `bin/server.ts` |
| `config.port` | `number` | Port d'écoute (par défaut `3000`) |
| `config.serverFactory` | `(port: number) => HyperServerLike` | Factory qui crée l'instance du serveur HTTP |
| `config.importer` | `(filePath: string) => Promise<unknown>` | Chargeur de module personnalisé (optionnel) |
| `config.watchDirs` | `string[]` | Répertoires à surveiller pour le rechargement à chaud en mode dev |

Le constructeur enregistre immédiatement les services du framework dans le conteneur (`'router'`, `'server'`, `'middleware'`, `'app'`) et initialise les singletons de service afin que les fichiers de routes puissent les importer.

## Méthodes du builder

L'Ignitor utilise une API de type builder fluide. Toutes les méthodes sauf `.start()` retournent `this`.

### `.tap(callback)`

Accédez à l'instance `Application` avant le démarrage du cycle de vie. Utilisez-la pour les gestionnaires de signaux et les hooks booting/booted.

```typescript
.tap((app) => {
  app.listen('SIGTERM', () => app.terminate())
  app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())

  app.booting(async () => {
    // s'exécute au début de la phase BOOT, avant le démarrage des providers
  })

  app.booted(async () => {
    // s'exécute après que tous les providers ont démarré
  })
})
```

### `.useRcFile(reamrc)`

Charge la configuration de l'application. Passez l'export par défaut de `reamrc.ts`.

```typescript
.useRcFile((await import('../reamrc.js')).default)
```

### `.httpServer()`

Définit l'environnement à `'web'`. Requis avant `.start()` lors de l'exécution d'un serveur HTTP. Vérifie qu'un `serverFactory` a été fourni.

### `.start()`

Exécute les quatre phases du cycle de vie dans l'ordre. Retourne `Promise<Ignitor>`. Chaînez `.catch(prettyPrintError)` pour gérer les erreurs au démarrage de manière appropriée.

## Phase 1 — REGISTER

Ce qui se passe, dans l'ordre :

1. L'Ignitor parcourt le répertoire `config/` et importe chaque fichier `.ts` / `.js` qu'il trouve. L'export par défaut de chaque fichier est stocké dans `app.config` sous son nom de fichier (ex. `config/database.ts` → `app.config.get('database')`).
2. Chaque provider listé dans `reamrc.providers` est importé et instancié.
3. `provider.register()` est appelé de façon synchrone sur chaque provider dans l'ordre de la liste.

`register()` est la seule méthode de cycle de vie synchrone. N'effectuez pas de travail asynchrone ici. Ne résolvez pas de services qui dépendent d'autres providers — ces providers peuvent ne pas encore s'être enregistrés.

```typescript
export default class AtlasProvider extends Provider {
  register(): void {
    this.app.container.singleton('db', () => {
      return new DatabaseManager(this.app.config.get('database'))
    })
  }
}
```

## Phase 2 — BOOT

Ce qui se passe, dans l'ordre :

1. Les hooks `app.booting()` s'exécutent (enregistrés via `.tap()`).
2. `provider.boot()` est appelé sur chaque provider dans l'ordre de la liste.
3. Les hooks `app.booted()` s'exécutent.

Au moment où `boot()` s'exécute, chaque provider a déjà enregistré ses liaisons. Il est sûr de résoudre d'autres services ici.

```typescript
export default class AtlasProvider extends Provider {
  async boot(): Promise<void> {
    const db = this.app.container.make('db') as DatabaseManager
    await db.connect()
    await db.query('SELECT 1') // vérifier la connexion
  }
}
```

## Phase 3 — START

Ce qui se passe, dans l'ordre :

1. Les fichiers de préchargement issus de `reamrc.preloads` sont importés. C'est à ce moment que `start/kernel.ts` s'exécute et configure le middleware du serveur.
2. Les routes des modules sont chargées automatiquement. L'Ignitor lit `reamrc.modules.path`, parcourt chaque sous-répertoire et importe tout fichier nommé `routes.ts` (ou les noms de fichiers listés dans `reamrc.modules.autoload`).
3. `provider.start()` est appelé sur chaque provider.

Le serveur HTTP n'accepte pas encore de requêtes durant cette phase. C'est le bon moment pour définir les routes, enregistrer les middlewares nommés et préchauffer les caches.

```typescript
// start/kernel.ts
import server from '@c9up/ream/services/server'
import router from '@c9up/ream/services/router'

server.errorHandler(() => import('../app/exceptions/Handler.js'))
server.use([() => import('../app/middleware/RequestId.js')])

router.use([() => import('../app/middleware/Auth.js')])
```

```typescript
// app/modules/users/routes.ts
import router from '@c9up/ream/services/router'
import UsersController from './UsersController.js'

router.get('/users', [UsersController, 'index'])
router.get('/users/:id', [UsersController, 'show'])
router.post('/users', [UsersController, 'store'])
```

## Phase 4 — READY

Ce qui se passe, dans l'ordre :

1. L'instance `Server` est démarrée (résout le gestionnaire d'erreurs différé).
2. Le serveur HTTP est lancé — `serverFactory` est appelé, `onRequest` est connecté au kernel, et `listen()` est attendu.
3. Le gestionnaire d'erreurs global est installé (intercepte les rejets non gérés et les `uncaughtException`).
4. `provider.ready()` est appelé sur chaque provider.
5. Le watcher de rechargement à chaud démarre en mode dev.

Après le retour de `ready()`, l'application est entièrement opérationnelle. Affichez votre message de disponibilité ici.

```typescript
export default class AppProvider extends Provider {
  async ready(): Promise<void> {
    console.log('Application ready — accepting requests')
  }
}
```

## Arrêt

L'arrêt est déclenché par `app.terminate()` (appelé depuis les gestionnaires de signaux) ou par `ignitor.stop()`. La séquence est :

1. Le watcher de rechargement à chaud est arrêté.
2. Le serveur HTTP est fermé (aucune nouvelle connexion acceptée, les requêtes en cours se terminent).
3. Le gestionnaire d'erreurs global est désinstallé.
4. `provider.shutdown()` est appelé sur les providers dans l'ordre d'enregistrement **inversé**.

```typescript
export default class AtlasProvider extends Provider {
  async shutdown(): Promise<void> {
    const db = this.app.container.make('db') as DatabaseManager
    await db.disconnect()
  }
}
```

## Hooks de l'application

Enregistrez les hooks dans `.tap()` avant d'appeler `.start()`.

```typescript
new Ignitor(APP_ROOT, config)
  .tap((app) => {
    // S'exécute au début de BOOT, avant le démarrage des providers
    app.booting(async () => {
      await import('./start/env.js') // valider les variables d'environnement
    })

    // S'exécute après que tous les providers ont démarré
    app.booted(async () => {
      console.log('All providers booted')
    })

    // Gérer les signaux OS pour un arrêt gracieux
    app.listen('SIGTERM', () => app.terminate())

    // N'attacher le gestionnaire SIGINT que lorsque géré par PM2
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
```

### `app.listen(signal, callback)`

Attache un écouteur `process.on(signal, callback)`.

### `app.listenIf(condition, signal, callback)`

Identique à `app.listen()`, mais ne s'attache que si `condition` est `true`. Utilisé avec `app.managedByPm2` pour éviter d'intercepter `SIGINT` (Ctrl+C) en développement local.

### `app.terminate()`

Appelle `app.shutdown()` (tous les providers dans l'ordre inverse) puis `process.exit(0)`.

### `app.booting(callback)`

Enregistre un callback qui s'exécute au début de la phase BOOT, avant la méthode `boot()` de tout provider.

### `app.booted(callback)`

Enregistre un callback qui s'exécute après que tous les providers ont démarré. S'il est appelé après que l'application a déjà démarré, le callback s'exécute immédiatement.

## Propriétés d'environnement

```typescript
app.inProduction  // process.env.NODE_ENV === 'production'
app.inDev         // NODE_ENV n'est ni 'production' ni 'test'
app.inTest        // process.env.NODE_ENV === 'test'
app.managedByPm2  // 'PM2_HOME' ou 'pm_id' est dans process.env
```

## `prettyPrintError(error)`

Formate une erreur survenue au démarrage pour le terminal et l'écrit dans `stderr`. Les instances de `ReamError` incluent un message structuré avec un indice et du contexte. Les instances `Error` ordinaires affichent le message et la trace de la pile.

```typescript
.start()
.catch((error) => {
  process.exitCode = 1
  prettyPrintError(error)
})
```

## Singletons de service

Trois proxies singleton sont initialisés par l'Ignitor avant l'exécution de tout fichier de préchargement. Importez-les dans les fichiers de routes, les fichiers kernel et les providers.

### `@c9up/ream/services/app`

```typescript
import app from '@c9up/ream/services/app'

app.container.make(MyService)
app.config.get('database')
app.inProduction
```

### `@c9up/ream/services/router`

```typescript
import router from '@c9up/ream/services/router'

router.get('/health', ({ response }) => response.json({ status: 'ok' }))
router.group('/api/v1', () => {
  router.get('/users', [UsersController, 'index'])
})
```

### `@c9up/ream/services/server`

```typescript
import server from '@c9up/ream/services/server'

server.errorHandler(() => import('../app/exceptions/Handler.js'))
server.use([() => import('../app/middleware/RequestId.js')])
```

Ces trois objets sont des `Proxy` qui délèguent à l'instance sous-jacente. Y accéder avant que l'Ignitor les construise lève une erreur descriptive.

## Récapitulatif du cycle de vie

| Phase | Déclenchée par | Async | Rôle |
|---|---|---|---|
| REGISTER | `phaseRegister()` | Non (register) | Chargement auto de la config, enregistrement des liaisons dans le conteneur |
| BOOT | `phaseBoot()` | Oui | Connexion des services, exécution des hooks booting/booted |
| START | `phaseStart()` | Oui | Import des préchargements, chargement auto des routes de modules, appel de start() |
| READY | `phaseReady()` | Oui | Démarrage du serveur HTTP, appel de ready() |
| SHUTDOWN | `stop()` / `terminate()` | Oui | Nettoyage des providers dans l'ordre inverse |

## Étapes suivantes

- [Providers](/fr/guide/providers) — Écrire des providers pour chaque phase du cycle de vie
- [Conteneur IoC](/fr/guide/container) — Injection de dépendances et résolution de services
- [Routage](/fr/guide/routing) — Définir les routes dans les fichiers de routes de modules
