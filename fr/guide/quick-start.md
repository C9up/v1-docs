# Démarrage rapide

Construisez une API Tasks fonctionnelle de zéro. À la fin, vous disposerez d'un serveur HTTP avec authentification JWT, un contrôleur CRUD adossé à un service et un routing modulaire — le tout testé avec `curl`.

## Prérequis

```bash
npm install @c9up/ream @c9up/warden reflect-metadata
```

Votre `tsconfig.json` doit activer les décorateurs :

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022"
  }
}
```

---

## 1. Configuration du projet — reamrc.ts

Le fichier `reamrc.ts` est le manifeste du projet. Il déclare les providers, les fichiers preload (middlewares, kernel) et les répertoires de modules depuis lesquels charger les routes automatiquement.

```typescript
// reamrc.ts
import { defineConfig } from '@c9up/ream'

export default defineConfig({
  providers: [
    () => import('./providers/AppProvider.js'),
  ],
  preloads: [
    () => import('./start/kernel.js'),
  ],
  modules: {
    // Charge routes.ts depuis chaque sous-répertoire de app/modules/
    path: './app/modules',
    autoload: ['routes'],
  },
})
```

---

## 2. Fichiers de configuration

Le framework lit chaque fichier dans `config/` au démarrage et stocke chacun sous son nom de fichier (sans extension). `config/auth.ts` est accessible via `app.config.get('auth')` dans les providers.

```typescript
// config/auth.ts
export default {
  defaultStrategy: 'jwt',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me-min-32-chars-long!!!!!',
    expiresInSeconds: 3600,
  },
}
```

```typescript
// config/database.ts
export default {
  connection: 'postgres',
  connections: {
    postgres: {
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_DATABASE ?? 'ream_dev',
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? '',
    },
  },
}
```

```typescript
// config/logger.ts
export default {
  level: process.env.LOG_LEVEL ?? 'info',
  pretty: process.env.NODE_ENV !== 'production',
}
```

---

## 3. Le module Task

### Entité

```typescript
// app/modules/task/entities/Task.ts
import { Entity, Column, PrimaryKey, BaseEntity } from '@c9up/atlas'

@Entity('tasks')
export class Task extends BaseEntity {
  @PrimaryKey()
  id!: string

  @Column()
  title!: string

  @Column()
  done!: boolean

  @Column()
  createdAt!: Date
}
```

### Service

```typescript
// app/modules/task/services/TaskService.ts
import { Service } from '@c9up/ream'
import { Task } from '../entities/Task.js'
import { randomUUID } from 'node:crypto'

@Service({ scope: 'singleton' })
export class TaskService {
  // Stockage en mémoire — remplacez par un repository Atlas adossé à votre base de données
  private store: Task[] = []

  async all(): Promise<Task[]> {
    return this.store
  }

  async find(id: string): Promise<Task | undefined> {
    return this.store.find((t) => t.id === id)
  }

  async create(data: { title: string }): Promise<Task> {
    const task = Object.assign(new Task(), {
      id: randomUUID(),
      title: data.title,
      done: false,
      createdAt: new Date(),
    })
    this.store.push(task)
    return task
  }

  async update(id: string, data: { title?: string; done?: boolean }): Promise<Task | undefined> {
    const task = await this.find(id)
    if (!task) return undefined
    Object.assign(task, data)
    return task
  }

  async delete(id: string): Promise<boolean> {
    const index = this.store.findIndex((t) => t.id === id)
    if (index === -1) return false
    this.store.splice(index, 1)
    return true
  }
}
```

### Contrôleur

```typescript
// app/modules/task/controllers/TasksController.ts
import { inject } from '@c9up/ream'
import type { HttpContext } from '@c9up/ream'
import { TaskService } from '../services/TaskService.js'

@inject()
export default class TasksController {
  constructor(private tasks: TaskService) {}

  // GET /tasks
  async index({ response }: HttpContext) {
    const all = await this.tasks.all()
    response.json({ data: all })
  }

  // POST /tasks
  async store({ request, response }: HttpContext) {
    const title = request.input<string>('title')
    if (!title) {
      response.status(422).json({ error: 'title is required' })
      return
    }
    const task = await this.tasks.create({ title })
    response.status(201).json({ data: task })
  }

  // GET /tasks/:id
  async show({ params, response }: HttpContext) {
    const task = await this.tasks.find(params.id)
    if (!task) {
      response.status(404).json({ error: 'Task not found' })
      return
    }
    response.json({ data: task })
  }

  // PUT /tasks/:id
  async update({ params, request, response }: HttpContext) {
    const task = await this.tasks.update(params.id, {
      title: request.input<string>('title'),
      done: request.input<boolean>('done'),
    })
    if (!task) {
      response.status(404).json({ error: 'Task not found' })
      return
    }
    response.json({ data: task })
  }

  // DELETE /tasks/:id
  async destroy({ params, response }: HttpContext) {
    const deleted = await this.tasks.delete(params.id)
    if (!deleted) {
      response.status(404).json({ error: 'Task not found' })
      return
    }
    response.noContent()
  }
}
```

### Routes du module

```typescript
// app/modules/task/routes.ts
import router from '@c9up/ream/services/router'
import TasksController from './controllers/TasksController.js'

router.get('/api/tasks', [TasksController, 'index']).guard('jwt')
router.post('/api/tasks', [TasksController, 'store']).guard('jwt')
router.get('/api/tasks/:id', [TasksController, 'show']).guard('jwt')
router.put('/api/tasks/:id', [TasksController, 'update']).guard('jwt')
router.delete('/api/tasks/:id', [TasksController, 'destroy']).guard('jwt')
```

Les routes nécessitant une authentification appellent `.guard('jwt')`. Le guard s'appuie sur l'`AuthMiddleware` global (enregistré dans `start/kernel.ts`) qui peuple `ctx.auth` au mieux — le guard lui-même contrôle `ctx.auth.authenticated === true` et émet un 401 quand il manque.

---

## 4. Middleware d'authentification

Le middleware ne fait **qu'une seule chose** — peupler `ctx.auth` quand un token Bearer valide est présent. Il ne rejette jamais ; le rejet est le rôle du guard de route (`.guard('jwt')`). Cette séparation permet aux routes publiques de lire `ctx.auth.user?.id` de manière défensive sans payer le coût d'un 401.

```typescript
// app/middleware/auth_middleware.ts
import type { HttpContext } from '@c9up/ream'
import auth from '@c9up/warden/services/main'

export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const header = ctx.request.header('authorization') ?? ''
    if (header.startsWith('Bearer ')) {
      const token = header.slice(7)
      const result = await auth.verify(token)
      if (result.authenticated && result.user) {
        ctx.auth = {
          authenticated: true,
          user: result.user,
          roles: result.user.roles ?? [],
          permissions: result.user.permissions ?? [],
        }
      }
    }
    await next()
  }
}
```

À l'intérieur d'un contrôleur guardé, on peut déréférencer `auth.user!.id` directement — le guard a déjà rejeté les requêtes anonymes :

```typescript
async store({ request, response, auth }: HttpContext) {
  const userId = auth.user!.id as string
  // …
}
```

---

## 5. Le kernel — start/kernel.ts

```typescript
// start/kernel.ts
import router from '@c9up/ream/services/router'
import server from '@c9up/ream/services/server'

// Gestionnaire d'erreurs personnalisé
server.errorHandler(() => import('#app/exceptions/handler.js'))

// Middleware global — s'exécute sur chaque requête routée.
// AuthMiddleware peuple `ctx.auth` au mieux pour que les routes
// guardées (et tout contrôleur qui lit `ctx.auth.user?.id`) fonctionnent
// uniformément.
router.use([
  () => import('#app/middleware/auth_middleware.js'),
])
```

Il n'y a plus de "middleware nommés" séparés — `.guard('jwt')` sur la route suffit. Le guard lit `ctx.auth` posé par le middleware global.

---

## 6. AppProvider — providers/AppProvider.ts

Le provider enregistre l'`AuthManager` de Warden avec une `JwtStrategy` connectée à votre store d'utilisateurs. Pour ce démarrage rapide, la recherche d'utilisateur est un stub codé en dur — remplacez-le par une vraie requête en base de données.

```typescript
// providers/AppProvider.ts
import { Provider } from '@c9up/ream'
import { AuthManager } from '@c9up/warden'
import { JwtStrategy } from '@c9up/warden'

export default class AppProvider extends Provider {
  register() {
    this.app.container.singleton(AuthManager, () => {
      const authConfig = this.app.config.get<{
        defaultStrategy: string
        jwt: { secret: string; expiresInSeconds: number }
      }>('auth')!

      const jwtStrategy = new JwtStrategy({
        secret: authConfig.jwt.secret,
        expiresInSeconds: authConfig.jwt.expiresInSeconds,
        verifyCredentials: async (email, password) => {
          // Remplacez par une vraie recherche en base de données + vérification du mot de passe
          if (email === 'admin@example.com' && password === 'secret') {
            return { id: 'user-1', email, roles: ['admin'], permissions: ['tasks.create'] }
          }
          return null
        },
        findUser: async (id) => {
          if (id === 'user-1') {
            return { id, email: 'admin@example.com', roles: ['admin'], permissions: ['tasks.create'] }
          }
          return null
        },
      })

      return new AuthManager({
        defaultStrategy: authConfig.defaultStrategy,
        strategies: { jwt: jwtStrategy },
      })
    })
  }
}
```

---

## 7. Le point d'entrée du serveur — bin/server.ts

```typescript
// bin/server.ts
import 'reflect-metadata'
import { Ignitor } from '@c9up/ream'
import reamrc from '../reamrc.js'

new Ignitor(new URL('../', import.meta.url), {
  importer: (path) => import(path),
  port: Number(process.env.PORT) || 3000,

})
  .httpServer()
  .tap((app) => {
    app.listen('SIGTERM', () => app.terminate())
    app.listen('SIGINT', () => app.terminate())
  })
  .useRcFile(reamrc)
  .start()
  .then(async (ignitor) => {
    const port = await ignitor.port()
    console.log(`Ream listening on http://localhost:${port}`)
  })
```

---

## 8. Démarrage et tests

Démarrez le serveur :

```bash
node --loader ts-node/esm bin/server.ts
# Ream listening on http://localhost:3000
```

**S'authentifier et obtenir un token :**

```bash
curl -s -X POST http://localhost:3000/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"secret"}' | jq .
```

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Créer une tâche :**

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -s -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Write docs"}' | jq .
```

```json
{
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "title": "Write docs",
    "done": false,
    "createdAt": "2026-04-03T10:00:00.000Z"
  }
}
```

**Lister toutes les tâches :**

```bash
curl -s http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Obtenir une tâche spécifique :**

```bash
curl -s http://localhost:3000/api/tasks/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Marquer une tâche comme terminée :**

```bash
curl -s -X PUT http://localhost:3000/api/tasks/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"done":true}' | jq .
```

**Supprimer une tâche :**

```bash
curl -s -X DELETE http://localhost:3000/api/tasks/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Authorization: Bearer $TOKEN"
# HTTP 204 No Content
```

**Requête sans token — attendez-vous à un 401 :**

```bash
curl -s http://localhost:3000/api/tasks | jq .
```

```json
{
  "error": {
    "code": "E_UNAUTHORIZED",
    "message": "Bearer token required"
  }
}
```

---

## Ce qui s'est passé sous le capot

1. `bin/server.ts` a construit un `Ignitor` avec le manifeste `reamrc.ts`.
2. La phase **register** de l'Ignitor a chargé `config/auth.ts`, `config/database.ts`, `config/logger.ts` dans `app.config`, puis appelé `AppProvider.register()` — liant `AuthManager` dans le conteneur.
3. La phase **boot** a appelé `AppProvider.boot()`.
4. La phase **start** a importé `start/kernel.ts` (enregistrant le middleware nommé `auth`) puis chargé automatiquement `app/modules/task/routes.ts` (enregistrant les cinq routes de tâches).
5. La phase **ready** a démarré le HyperServer. Chaque requête transite par le pipeline de middlewares : `LogRequestMiddleware` → middlewares nommés (`AuthMiddleware` pour les routes protégées) → contrôleur.
6. Le conteneur a résolu `TasksController` par requête, injectant automatiquement son singleton `TaskService`.

---

## Prochaines étapes

- [Structure des dossiers](/fr/guide/folder-structure) — Chaque répertoire et fichier expliqué
- [Routing](/fr/guide/routing) — Groupes de routes, guards, matchers de paramètres, routes nommées
- [Warden](/fr/modules/warden) — Auth multi-stratégies, RBAC, détails JWT
- [Atlas](/fr/modules/atlas) — Remplacer le stockage en mémoire par une vraie base de données
