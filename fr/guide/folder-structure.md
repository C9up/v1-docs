# Structure des dossiers

Une application Ream en mode framework suit cette structure. Chaque répertoire a un rôle unique et bien défini — impossible de se demander où placer un fichier.

```
my-app/
├── app/
│   ├── exceptions/
│   │   └── handler.ts              # Gestionnaire global d'exceptions
│   ├── middleware/
│   │   ├── auth_middleware.ts      # Classe middleware d'authentification JWT
│   │   └── log_request_middleware.ts
│   └── modules/
│       ├── task/
│       │   ├── controllers/
│       │   │   └── TasksController.ts
│       │   ├── entities/
│       │   │   └── Task.ts
│       │   ├── events/
│       │   │   └── TaskDeclared.ts
│       │   ├── listeners/
│       │   │   └── LogTaskEvent.ts
│       │   ├── services/
│       │   │   └── TaskService.ts
│       │   ├── validators/
│       │   │   └── CreateTaskValidator.ts
│       │   ├── events.ts           # Enregistrement des événements du module
│       │   └── routes.ts           # Chargé automatiquement par le framework
│       └── user/
│           ├── controllers/
│           │   └── UsersController.ts
│           ├── entities/
│           │   └── User.ts
│           ├── services/
│           │   └── UserService.ts
│           ├── validators/
│           │   └── RegisterValidator.ts
│           └── routes.ts
├── bin/
│   └── server.ts                   # Point d'entrée du serveur HTTP
├── config/
│   ├── auth.ts                     # Configuration de l'authentification
│   ├── database.ts                 # Configuration de la base de données
│   └── logger.ts                   # Configuration du logger
├── database/
│   └── migrations/
│       └── 001_create_users.ts
├── providers/
│   └── AppProvider.ts              # Enregistrement des services de l'application
├── start/
│   └── kernel.ts                   # Enregistrement des middlewares
├── reamrc.ts                       # Configuration du framework
├── .env
├── package.json
└── tsconfig.json
```

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
  @PrimaryKey() id!: string
  @Column() title!: string
  @Column() done!: boolean
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
import { E_UNAUTHORIZED } from '@c9up/ream'

export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const token = ctx.request.header('authorization')?.replace('Bearer ', '')
    if (!token) throw new E_UNAUTHORIZED()

    // Vérification et population de ctx.auth
    ctx.auth = { authenticated: true, user: { id: 'user-1' } }
    await next()
  }
}
```

---

## bin/

### server.ts

Le point d'entrée du serveur HTTP. Construit l'`Ignitor`, charge le fichier rc et démarre le serveur. C'est le fichier que Node.js exécute directement.

```typescript
// bin/server.ts
import { Ignitor, defineConfig } from '@c9up/ream'

new Ignitor(new URL('../', import.meta.url), {
  importer: (path) => import(path),
  port: Number(process.env.PORT) || 3000,

})
  .httpServer()
  .tap((app) => {
    app.listen('SIGTERM', () => app.terminate())
    app.listen('SIGINT', () => app.terminate())
  })
  .useRcFile(await import('../reamrc.js').then((m) => m.default))
  .start()
```

---

## config/

Un fichier par préoccupation, chacun exportant un objet simple comme export par défaut. Le framework lit chaque fichier de ce répertoire durant la phase d'enregistrement et stocke sa valeur sous le nom de base du fichier. `config/auth.ts` devient `app.config.get('auth')`.

### config/auth.ts

```typescript
// config/auth.ts
export default {
  defaultStrategy: 'jwt',
  jwt: {
    secret: process.env.JWT_SECRET!,
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

---

## Prochaines étapes

- [Démarrage rapide](/fr/guide/quick-start) — Tout cela assemblé dans une API fonctionnelle
- [Cycle de vie de l'application](/fr/guide/lifecycle) — Les quatre phases en détail
- [Routing](/fr/guide/routing) — Groupes, guards, routes nommées, matchers de paramètres
- [Providers](/fr/guide/providers) — Écrire et enregistrer des providers
