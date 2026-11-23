# Structure des dossiers

Ce guide couvre l'organisation des dossiers d'une application ream :

- app/modules/
- app/exceptions/
- app/middleware/
- bin/
- config/
- database/migrations/
- providers/
- start/
- tests/
- reamrc.ts

Une application Ream en mode framework suit cette structure. Chaque répertoire a un rôle unique et bien défini — impossible de se demander où placer un fichier.

![L'arborescence d'une application ream. app/ contient votre code : modules/<module>/, un dossier par domaine (controllers, entities, services, validators, events, listeners, routes.ts), middleware/ et exceptions/handler.ts. Le câblage : bin/server.ts et bin/console.ts, config/ avec un fichier par paquet, providers/AppProvider.ts, start/routes.ts, start/kernel.ts, start/env.ts et reamrc.ts. Données et tests : database/migrations/ et tests/. À la racine, .env, package.json et tsconfig.json.](/images/folder-structure-en.webp){width=640 height=640 loading=lazy}

`ream new` écrit `bin/`, `providers/`, `start/`, `tests/` et `reamrc.ts` (et, avec le
template `web`, `config/` et `app/middleware/`) ; les autres dossiers apparaissent à
mesure que l'application grandit.

---

## app/modules/

Toute la logique applicative réside ici, organisée par domaine plutôt que par couche technique.

**Correct — domaine en premier :**
```
app/modules/task/controllers/TasksController.ts
app/modules/task/services/TaskService.ts
app/modules/task/entities/Task.ts
```

**Incorrect — couche en premier :**
```
app/controllers/TasksController.ts   # Éparpillé, aucune cohésion
app/services/TaskService.ts          # Difficile à déplacer ou à découpler
```

Chaque module est un contexte délimité autonome. Tout le code nécessaire pour comprendre et modifier le domaine `task` se trouve dans `app/modules/task/`.

Les `routes.ts` et `events.ts` d'un module sont chargés dès que `reamrc.ts` nomme le
dossier des modules (voir [reamrc.ts](#reamrc-ts)). Une app neuve n'en a pas encore et
déclare ses routes dans `start/routes.ts`.

### controllers/

Les classes de contrôleur gèrent les requêtes HTTP. Elles reçoivent un `HttpContext`, appellent des services et écrivent une réponse. Les contrôleurs ne sont jamais instanciés à la main — le conteneur IoC les construit et résout leurs dépendances automatiquement.

```typescript
// app/modules/task/controllers/TasksController.ts
import { inject } from '@c9up/ream'
import type { HttpContext } from '@c9up/ream'
import { TaskService } from '../services/TaskService.js'

@inject()
export default class TasksController {
  constructor(private tasks: TaskService) {}

  async index({ response }: HttpContext) {
    response.json(await this.tasks.all())
  }

  async show({ request, response, params }: HttpContext) {
    const task = await this.tasks.find(params.id)
    response.json(task)
  }
}
```

### services/

La logique métier réside dans les classes de service. Les services sont enregistrés en tant que singletons et injectés dans les contrôleurs (et d'autres services) via le conteneur.

```typescript
// app/modules/task/services/TaskService.ts
import { Service } from '@c9up/ream'

@Service({ scope: 'singleton' })
export class TaskService {
  private tasks: Task[] = []

  async all(): Promise<Task[]> {
    return this.tasks
  }

  async find(id: string): Promise<Task | undefined> {
    return this.tasks.find((t) => t.id === id)
  }
}
```

### entities/

Les classes d'entité Atlas qui correspondent aux tables de la base de données. Décorées avec `@Entity()` et `@Column()`.

```typescript
// app/modules/task/entities/Task.ts
import { Entity, Column, PrimaryKey, BaseEntity } from '@c9up/atlas'

@Entity('tasks')
export class Task extends BaseEntity {
  @PrimaryKey() declare id: string
  @Column() declare title: string
  @Column() declare done: boolean
}
```

### events/

Les classes d'événement du module, une par cas d'usage. Chaque classe étend `BaseEvent` depuis `@c9up/ream/events` et déclare ses données comme propriétés publiques du constructeur.

```typescript
// app/modules/task/events/TaskDeclared.ts
import { BaseEvent } from '@c9up/ream/events'

export default class TaskDeclared extends BaseEvent {
  constructor(
    public taskId: string,
    public residenceId: string,
    public declarantId: string,
  ) {
    super()
  }
}
```

### listeners/

Les classes de listener réagissent aux événements. Chaque listener expose une méthode `handle()` et peut recevoir des dépendances via `@inject()`.

```typescript
// app/modules/task/listeners/LogTaskEvent.ts
import { inject, Inject } from '@c9up/ream'
import type { Logger } from '@c9up/spectrum'
import type TaskDeclared from '../events/TaskDeclared.js'

@inject()
export default class LogTaskEvent {
  constructor(@Inject('logger') private logger: Logger) {}

  async handle(event: TaskDeclared) {
    this.logger.child({ module: 'task' }).info(
      `Task ${event.taskId} declared in residence ${event.residenceId}`,
    )
  }
}
```

### validators/

Les schémas de validation Rune, un par cas d'usage. Gardez-les simples et ciblés — un schéma par formulaire ou par endpoint API.

```typescript
// app/modules/task/validators/CreateTaskValidator.ts
import { rules, schema } from '@c9up/rune'

export const CreateTaskValidator = schema({
  title: rules.string().min(1).max(255).trim(),
  done: rules.boolean().optional(),
})
```

### events.ts

Le fichier d'enregistrement des événements du module. Associe chaque classe d'événement à ses listeners via l'`Emitter`. Ce fichier est chargé automatiquement par le framework au même titre que `routes.ts`.

```typescript
// app/modules/task/events.ts
import app from '@c9up/ream/services/app'
import { Emitter } from '@c9up/ream/events'
import TaskDeclared from './events/TaskDeclared.js'
import LogTaskEvent from './listeners/LogTaskEvent.js'

const emitter = await app.container.make(Emitter)
emitter.on(TaskDeclared, LogTaskEvent)
```

### routes.ts

Les définitions de routes du module. Ce fichier est découvert et chargé automatiquement par le framework durant la phase de démarrage. Importez le service router — ne construisez pas vous-même une instance de `Router`.

```typescript
// app/modules/task/routes.ts
import router from '@c9up/ream/services/router'
import TasksController from './controllers/TasksController.js'

router.get('/tasks', [TasksController, 'index'])
router.post('/tasks', [TasksController, 'store'])
router.get('/tasks/:id', [TasksController, 'show'])
router.put('/tasks/:id', [TasksController, 'update'])
router.delete('/tasks/:id', [TasksController, 'destroy'])
```

---

## app/exceptions/

### handler.ts

Le gestionnaire global d'exceptions. Étendez `ExceptionHandler` depuis `@c9up/ream` et surchargez `handle()` ou `report()`. Le framework appelle ce gestionnaire pour toute exception qui échappe à un contrôleur ou un middleware.

```typescript
// app/exceptions/handler.ts
import { ExceptionHandler } from '@c9up/ream'
import type { HttpContext } from '@c9up/ream'

export default class Handler extends ExceptionHandler {
  protected debug = process.env.NODE_ENV !== 'production'
  protected ignoreStatuses = [400, 401, 404, 422]

  async report(error: unknown, ctx: HttpContext) {
    // Journalisation personnalisée — appelez super pour le comportement par défaut
    await super.report(error, ctx)
  }
}
```

Enregistrez-le dans `start/kernel.ts` via le serveur :

```typescript
import server from '@c9up/ream/services/server'
server.errorHandler(() => import('#app/exceptions/handler.js'))
```

---

## app/middleware/

Les classes middleware qui respectent la forme `{ handle(ctx, next) }`. Enregistrez-les globalement (via `server.use()`) ou comme middleware nommés (via `router.named()`).

```typescript
// app/middleware/log_request_middleware.ts
import type { HttpContext } from '@c9up/ream'

export default class LogRequestMiddleware {
  async handle({ request }: HttpContext, next: () => Promise<void>) {
    const start = Date.now()
    await next()
    console.log(`${request.method()} ${request.url()} — ${Date.now() - start}ms`)
  }
}
```

```typescript
// app/middleware/auth_middleware.ts
import type { HttpContext } from '@c9up/ream'
import auth from '@c9up/warden/services/main'

export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const header = ctx.request.header('authorization') ?? ''
    if (header.startsWith('Bearer ')) {
      // Le jeton est vérifié avant de remplir ctx.auth ; un guard rejette le reste.
      const result = await auth.verify(header.slice(7))
      if (result.authenticated && result.user) {
        ctx.auth = { isAuthenticated: true, user: result.user }
      }
    }
    await next()
  }
}
```

---

## bin/

### server.ts

Le point d'entrée HTTP, le fichier que Node.js exécute. Il construit l'`Ignitor`,
valide l'environnement avant tout démarrage, charge le fichier rc et lance le serveur
HTTP.

```typescript
// bin/server.ts
import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@c9up/ream'
import { createHyperServerFactory } from '@c9up/ream/bootstrap'

const APP_ROOT = new URL('../', import.meta.url)

new Ignitor(APP_ROOT, {
  serverFactory: createHyperServerFactory(),
})
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env.js')
    })
  })
  .useRcFile((await import('../reamrc.js')).default)
  .httpServer()
  .start()
  .then(async (app) => {
    console.log(`\n  ➜ Ream ready on http://${app.host()}:${await app.port()}\n`)
  })
  .catch((err) => {
    prettyPrintError(err)
    process.exit(1)
  })
```

### console.ts

L'entrée de `ream <commande>` : la même application, démarrée en console plutôt qu'en
serveur. Elle valide l'environnement et lit le fichier rc de la même façon.

---

## config/

Un fichier par préoccupation, chacun exportant un objet simple comme export par défaut. Le framework lit chaque fichier de ce répertoire durant la phase d'enregistrement et stocke sa valeur sous le nom de base du fichier. `config/auth.ts` devient `app.config.get('auth')`.

### config/auth.ts

```typescript
// config/auth.ts
import env from '#start/env.js'

export default {
  defaultStrategy: 'jwt',
  jwt: {
    secret: env.get('JWT_SECRET').release(),
    expiresInSeconds: 3600,
  },
}
```

### config/database.ts

```typescript
// config/database.ts
export default {
  connection: 'postgres',
  connections: {
    postgres: {
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_DATABASE ?? 'ream',
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? '',
    },
  },
}
```

### config/logger.ts

```typescript
// config/logger.ts
export default {
  level: process.env.LOG_LEVEL ?? 'info',
  pretty: process.env.NODE_ENV !== 'production',
}
```

---

## database/migrations/

Les fichiers de migration de la base de données. Exécutés par la CLI `ream` (`ream migrate`). Chaque fichier exporte une fonction `up()` et une fonction `down()`.

---

## providers/

Les classes de provider personnalisées pour l'enregistrement des services au niveau applicatif. Un provider reçoit l'`AppContext` (conteneur + store de configuration) et suit le cycle de vie `register → boot → start → ready → shutdown`.

### providers/AppProvider.ts

N'enregistrez ici que les services propres à l'application — clients de base de données, adaptateurs de cache, mailers. Les packages du framework (Atlas, Warden, Spectrum) embarquent leurs propres providers que vous déclarez dans `reamrc.ts`.

```typescript
// providers/AppProvider.ts
import { Provider } from '@c9up/ream'

export default class AppProvider extends Provider {
  register() {
    // Liaison synchrone — pas d'await ici
    this.app.container.singleton('mailer', () => new Mailer(
      this.app.config.get('mail')
    ))
  }

  async boot() {
    // Vérification des connexions, validation des variables d'environnement requises
  }
}
```

---

## start/

Les fichiers dans `start/` sont importés durant la **phase de démarrage** du cycle de vie — après que tous les providers ont démarré, avant que le serveur HTTP commence à écouter. Listez-les dans `reamrc.ts` sous `preloads`.

### start/routes.ts

Les routes de l'application, importées en préchargement. Une app neuve y répond à `/`.

```typescript
// start/routes.ts
import router from '@c9up/ream/services/router'

router.get('/', async ({ response }) => {
  response.status(200).json({ name: 'my-app', status: 'running' })
})
```

### start/kernel.ts

Enregistre les middlewares du serveur et du router. Importez les singletons de service `server` et `router` fournis par `@c9up/ream`.

```typescript
// start/kernel.ts
import server from '@c9up/ream/services/server'
import router from '@c9up/ream/services/router'

// Middleware global du serveur — s'exécute sur chaque requête
server.use([
  () => import('#app/middleware/log_request_middleware.js'),
])

// Middleware nommés — à activer par route
export const middleware = router.named({
  auth: () => import('#app/middleware/auth_middleware.js'),
})

// Gestionnaire d'exceptions personnalisé
server.errorHandler(() => import('#app/exceptions/handler.js'))
```

### start/env.ts

Le schéma de l'environnement. `bin/server.ts` et `bin/console.ts` l'importent dans un
hook `booting`, avant tout provider : une variable manquante ou mal formée arrête
l'application tout de suite, et `env.get('PORT')` est ensuite typé comme un nombre.

```typescript
// start/env.ts
import { Env } from '@c9up/ream'

export default await Env.create(new URL('../', import.meta.url), {
  APP_NAME: Env.schema.string(),
  APP_KEY: Env.schema.secret(),
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  DB_CONNECTION: Env.schema.enum(['postgres', 'sqlite'] as const),
  DB_FILENAME: Env.schema.string(),
})
```

---

## tests/

`tests/bootstrap.ts` démarre l'application pour les suites (sur un port libre, en mode
test) et donne le client HTTP à chaque suite ; `tests/functional/` contient les suites
qui ont besoin du serveur. `ream test` les lance ; voir [Tests](/fr/guides/testing/introduction).

---

## reamrc.ts

Le manifeste du projet. Déclare les providers, les fichiers preload et le chemin du répertoire des modules. `defineConfig()` est un passage typé qui active l'autocomplétion dans l'éditeur.

```typescript
// reamrc.ts
import { defineConfig } from '@c9up/ream'

export default defineConfig({
  providers: [
    () => import('#providers/AppProvider.js'),
  ],
  preloads: [
    () => import('#start/kernel.js'),
  ],
  modules: {
    path: './app/modules',
    autoload: ['routes', 'events'],   // Charge routes.ts et events.ts depuis chaque sous-répertoire du module
  },
})
```

`autoload: ['routes', 'events']` indique au framework d'importer `routes.ts` et `events.ts` (ou leurs équivalents `.js`) depuis chaque sous-répertoire direct de `app/modules/`. Ajouter un nouveau répertoire de module suffit — il n'y a pas d'étape d'enregistrement centrale.
Sans `autoload`, `['routes', 'events']` est la valeur par défaut. Un fichier absent d'un
module est ignoré ; une entrée qui ne correspond à aucun module déclenche un avertissement
au démarrage, car c'est souvent une faute de frappe. Une entrée terminée par une barre
(`'services/'`) charge tous les fichiers de ce dossier dans chaque module.

---

## Prochaines étapes
- [Démarrage rapide](/fr/start/tutorial) — Tout cela assemblé dans une API fonctionnelle
- [Cycle de vie de l'application](/fr/guides/concepts/lifecycle) — Les quatre phases en détail
- [Routing](/fr/guides/basics/routing) — Groupes, guards, routes nommées, matchers de paramètres
- [Providers](/fr/guides/concepts/providers) — Écrire et enregistrer des providers
