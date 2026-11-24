# Tutoriel

Ce guide couvre la construction d'une première application, pas à pas :

- Prérequis
- 1. Configuration du projet — reamrc.ts
- 2. Fichiers de configuration
- 3. Le module Task
- 4. Middleware d'authentification
- 5. Le kernel — start/kernel.ts
- 6. Le point d'entrée du serveur — bin/server.ts
- 7. Démarrage et tests
- Ce qui s'est passé sous le capot

Construisez une API Tasks fonctionnelle de zéro. À la fin, vous disposerez d'un serveur HTTP avec authentification JWT, un contrôleur CRUD adossé à un service et un routing modulaire — le tout testé avec `curl`.

## Prérequis

Créez le projet avec le template `api` (voir [Installation](/fr/start/installation#creer-un-nouveau-projet)), puis ajoutez le logger :

```bash
npm install -g @c9up/ream-cli
ream new tasks --template api --db sqlite
cd tasks
ream configure @c9up/spectrum
```

`ream new` installe `@c9up/ream`, `@c9up/warden`, `@c9up/atlas` et `@c9up/spectrum`. Il écrit aussi `tsconfig.json` avec les décorateurs activés, les alias d'import `#app/*`, `#middleware/*`, `#providers/*` et `#start/*` de `package.json`, `start/env.ts`, `.env` et `bin/server.ts`. `ream configure @c9up/spectrum` enregistre le provider du logger et écrit `config/logger.ts`.

L'API signe ses jetons avec `JWT_SECRET`. Déclarez-le dans `start/env.ts`, à côté des variables écrites par `ream new` :

```typescript
// start/env.ts — ajoutez cette ligne au schéma
  JWT_SECRET: Env.schema.secret(),
```

Donnez-lui ensuite une valeur dans `.env` : au moins 32 caractères aléatoires, par exemple la sortie de `openssl rand -hex 32`.

```bash
# .env
JWT_SECRET=<la sortie de openssl rand -hex 32>
```

---

## 1. Configuration du projet — reamrc.ts

Le fichier `reamrc.ts` est le manifeste du projet. Il déclare les providers, les fichiers preload (routes, kernel) et les répertoires de modules depuis lesquels charger les routes automatiquement. Remplacez celui qui a été généré :

```typescript
// reamrc.ts
import { defineConfig } from '@c9up/ream'

export default defineConfig({
  providers: [
    () => import('@c9up/spectrum/provider'),
    () => import('@c9up/warden/provider'),
    () => import('@c9up/blackhole/provider'),
    () => import('@c9up/ream/events/provider'),
    () => import('#providers/AppProvider.js'),
  ],
  preloads: [
    () => import('#start/routes.js'),
    () => import('#start/kernel.js'),
  ],
  modules: {
    // Charge routes.ts et events.ts depuis chaque sous-répertoire de app/modules/
    path: './app/modules',
    autoload: ['routes', 'events'],
  },
  tests: {
    suites: [
      { name: 'unit', files: ['tests/unit/**/*.test.ts'], timeout: 2000 },
      { name: 'functional', files: ['tests/functional/**/*.test.ts'], timeout: 30000 },
    ],
  },
})
```

---

## 2. Fichiers de configuration

Le framework lit chaque fichier dans `config/` au démarrage et stocke chacun sous son nom de fichier (sans extension). Le provider de Warden lit `config/auth.ts` via `app.config.get('auth')` et en construit ses guards :

```typescript
// config/auth.ts
import { defineConfig, jwtGuard } from '@c9up/warden'
import env from '#start/env.js'

// Le seul utilisateur de ce démarrage rapide. Remplacez les deux recherches par
// votre modèle d'utilisateur, et verifyCredentials par authFinder({ hash,
// findForAuth }) de @c9up/warden : il vérifie un hachage de mot de passe, et en
// paie un pour un email inconnu aussi, donc le temps de réponse ne révèle pas
// quels comptes existent.
const admin = {
  id: 'user-1',
  email: 'admin@example.com',
  roles: ['admin'],
  permissions: ['tasks.create'],
}

export default defineConfig({
  default: 'jwt',
  guards: {
    jwt: jwtGuard({
      // Pas de valeur de repli : start/env.ts refuse de démarrer sans JWT_SECRET.
      secret: env.get('JWT_SECRET').release(),
      expiresIn: '1h',
      verifyCredentials: async (email, password) =>
        email === admin.email && password === 'secret' ? admin : null,
      findUser: async (id) => (id === admin.id ? admin : null),
    }),
  },
})
```

`JWT_SECRET` est déclaré `Env.schema.secret()` dans `start/env.ts` (voir [Configuration](/fr/start/configuration#variables-d-environnement)), donc `env.get()` rend une valeur qui s'affiche `[redacted]` et que `.release()` lit. N'écrivez jamais de valeur de repli comme `process.env.JWT_SECRET ?? '…'` : `config/auth.ts` est commité, la valeur de repli est donc un secret que tout le monde peut lire, et un environnement qui oublie la variable signerait chaque jeton avec — n'importe qui pourrait alors fabriquer un jeton pour n'importe quel utilisateur.

Les autres fichiers de `config/` restent tels que `ream new` et `ream configure` les ont écrits.

---

## 3. Le module Task

### Entité

```typescript
// app/modules/task/entities/Task.ts
import { Entity, Column, PrimaryKey, BaseEntity } from '@c9up/atlas'

@Entity('tasks')
export class Task extends BaseEntity {
  @PrimaryKey()
  declare id: string

  @Column()
  declare title: string

  @Column()
  declare done: boolean

  @Column()
  declare createdAt: Date
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
    // Seulement ce que la requête a envoyé : un champ absent garde sa valeur.
    if (data.title !== undefined) task.title = data.title
    if (data.done !== undefined) task.done = data.done
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
  async show({ request, response }: HttpContext) {
    // La route porte toujours un id : la valeur par défaut ne sert qu'au type.
    const task = await this.tasks.find(request.param('id', ''))
    if (!task) {
      response.status(404).json({ error: 'Task not found' })
      return
    }
    response.json({ data: task })
  }

  // PUT /tasks/:id
  async update({ request, response }: HttpContext) {
    const task = await this.tasks.update(request.param('id', ''), {
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
  async destroy({ request, response }: HttpContext) {
    const deleted = await this.tasks.delete(request.param('id', ''))
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

router
  .group(() => {
    router.get('/api/tasks', [TasksController, 'index'])
    router.post('/api/tasks', [TasksController, 'store'])
    router.get('/api/tasks/:id', [TasksController, 'show'])
    router.put('/api/tasks/:id', [TasksController, 'update'])
    router.delete('/api/tasks/:id', [TasksController, 'destroy'])
  })
  .middleware('auth')
  .guard('jwt')
```

Le groupe protège ses cinq routes. `.middleware('auth')` exécute le middleware nommé `auth` (section 4, déclaré dans `start/kernel.ts`) : il refuse avec un 401 une requête où personne n'est connecté. `.guard('jwt')` exige ensuite que ce soit le guard `jwt` qui ait authentifié la requête.

### Route de connexion

Le jeton qu'attendent les routes guardées vient d'une route de connexion. `auth.authenticate()` appelle le `verifyCredentials` du guard par défaut, défini dans `config/auth.ts` :

```typescript
// app/modules/auth/routes.ts
import router from '@c9up/ream/services/router'
import auth from '@c9up/warden/services/main'

router.post('/api/login', async ({ request, response }) => {
  const result = await auth.authenticate(request.only(['email', 'password']))
  if (result.strategyCrash) return response.status(503).json({ error: 'Try again later' })
  if (!result.authenticated || !result.user) {
    return response.unauthorized({ error: 'Invalid credentials' })
  }
  // La stratégie JWT rend le jeton signé sur l'utilisateur qu'elle a authentifié.
  response.json({ data: { token: result.user.token } })
})
```

### Événements du module

Quand une tâche est créée, vous pouvez émettre un événement typé. Ajoutez une classe d'événement, un listener et un fichier de câblage `events.ts` à côté des routes.

```typescript
// app/modules/task/events/TaskCreated.ts
import { BaseEvent } from '@c9up/ream/events'

export default class TaskCreated extends BaseEvent {
  constructor(
    public taskId: string,
    public title: string,
  ) {
    super()
  }
}
```

```typescript
// app/modules/task/listeners/LogTaskCreated.ts
import { inject, Inject } from '@c9up/ream'
import { Logger } from '@c9up/spectrum'
import type TaskCreated from '../events/TaskCreated.js'

@inject()
export default class LogTaskCreated {
  constructor(@Inject('logger') private logger: Logger) {}

  async handle(event: TaskCreated) {
    this.logger.info(`Task created: ${event.taskId} — "${event.title}"`)
  }
}
```

```typescript
// app/modules/task/events.ts
import emitter from '@c9up/ream/events/services/main'
import TaskCreated from './events/TaskCreated.js'
import LogTaskCreated from './listeners/LogTaskCreated.js'

emitter.on(TaskCreated, [LogTaskCreated])
```

Puis émettez-le depuis `TaskService.create()` :

```typescript
// En haut de TaskService.ts
import TaskCreated from '../events/TaskCreated.js'

// Dans TaskService.create()
this.store.push(task)
TaskCreated.dispatch(task.id, task.title)
return task
```

---

## 4. Middleware d'authentification

Deux middlewares se partagent le travail, comme dans un projet créé avec `ream new --template web` :

- `@c9up/warden/silent-auth` s'exécute sur chaque requête routée (section 5). Il lit le jeton Bearer et, quand le jeton est valide, connecte l'utilisateur sur `ctx.auth` en notant le guard qui a authentifié la requête. Il ne refuse jamais personne : une route publique peut donc lire `ctx.auth.user?.id`.
- Le middleware `auth` ci-dessous refuse une requête où personne n'est connecté. Les routes l'utilisent par son nom, `.middleware('auth')`.

```typescript
// app/middleware/auth_middleware.ts
import type { HttpContext } from '@c9up/ream'
import { errors } from '@c9up/ream'

export default class AuthMiddleware {
  async handle(
    ctx: HttpContext,
    next: () => Promise<void>,
    options: { guards?: string[] } = {},
  ) {
    // Sans l'authenticator de Warden sur ctx.auth, personne ne peut être connecté.
    if (typeof ctx.auth.authenticateUsing !== 'function') {
      throw new errors.E_UNAUTHORIZED_ACCESS()
    }
    // Lève E_UNAUTHORIZED_ACCESS (401) quand aucun guard n'authentifie la requête.
    await ctx.auth.authenticateUsing(options.guards)
    await next()
  }
}
```

Ne remplissez pas `ctx.auth` à la main : l'authenticator de Warden note le guard qui a authentifié la requête (`authenticatedViaGuard`), et `.guard('jwt')` répond 401 sans lui. Pour passer les guards, utilisez la forme fabrique, `.use(middleware.auth({ guards: ['jwt'] }))`.

À l'intérieur d'un contrôleur guardé, le middleware a déjà rejeté les requêtes anonymes, mais `auth.user` reste optionnel dans le type : réduisez-le une fois et la suite du handler le lit comme présent :

```typescript
async store({ request, response, auth }: HttpContext) {
  const user = auth.user
  if (!user) return response.unauthorized({ error: 'Unauthorized' }) // inatteignable derrière .guard('jwt')
  const userId = user.id
  // …
}
```

---

## 5. Le kernel — start/kernel.ts

Remplacez le kernel généré :

```typescript
// start/kernel.ts
import router from '@c9up/ream/services/router'
import server from '@c9up/ream/services/server'

// S'exécute sur chaque requête, même celle qu'aucune route ne reconnaît.
server.use([
  () => import('@c9up/blackhole/server_middleware'),
])

// S'exécute sur chaque requête dont une route est reconnue. Silent auth lit qui
// est connecté et ne refuse jamais personne.
router.use([
  () => import('@c9up/ream/bodyparser_middleware'),
  () => import('@c9up/blackhole/middleware'),
  () => import('@c9up/warden/silent-auth'),
])

// Attaché par son nom aux routes qui en ont besoin : `.middleware('auth')`.
export const middleware = router.named({
  auth: () => import('#middleware/auth_middleware.js'),
})
```

Le body parser lit les corps de requête : sans lui, chaque POST JSON se lit `{}`. Blackhole ajoute les en-têtes de protection et la limite de débit. Un nom donné à `.middleware()` doit être déclaré dans `router.named()` : un `.middleware('auht')` mal orthographié arrête le serveur au démarrage avec `E_MIDDLEWARE_NOT_FOUND`.

---

## 6. Le point d'entrée du serveur — bin/server.ts

`ream new` a écrit `bin/server.ts` : gardez-le. Il charge d'abord `start/env.ts` (un `JWT_SECRET` manquant l'arrête là), lit `reamrc.ts` et démarre le serveur HTTP sur `PORT`.

---

## 7. Démarrage et tests

Démarrez le serveur :

```bash
node --import @swc-node/register/esm-register bin/server.ts
#   ➜ Ream ready on http://localhost:3000
```

`npm run dev` fait la même chose et redémarre à chaque modification.

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
    "code": "E_UNAUTHORIZED_ACCESS",
    "message": "Unauthorized access"
  }
}
```

---

## Ce qui s'est passé sous le capot

1. `bin/server.ts` a construit un `Ignitor` avec le manifeste `reamrc.ts`, et vérifié `.env` d'après `start/env.ts`.
2. La phase **register** de l'Ignitor a chargé chaque fichier de `config/` dans `app.config`. Le provider de Warden a construit le guard `jwt` depuis `config/auth.ts` et lié `AuthManager` dans le conteneur ; celui de Spectrum a lié le logger.
3. La phase **boot** a rendu utilisable `@c9up/warden/services/main`, qu'appelle la route de connexion.
4. La phase **start** a importé `start/routes.ts` et `start/kernel.ts` (les middlewares du routeur et le middleware nommé `auth`), puis chargé automatiquement `app/modules/auth/routes.ts` (la route de connexion), `app/modules/task/routes.ts` (les cinq routes de tâches) et `app/modules/task/events.ts` (reliant `TaskCreated` à `LogTaskCreated`).
5. La phase **ready** a construit le kernel HTTP, en vérifiant que chaque nom donné à `.middleware()` est déclaré, puis démarré le HyperServer. Chaque requête transite par le pipeline de middlewares : Blackhole → le body parser, Blackhole et silent auth → le middleware `auth` → le `.guard('jwt')` du groupe (routes protégées seulement) → contrôleur.
6. Le conteneur a résolu `TasksController` par requête, injectant automatiquement son singleton `TaskService`.

---

## Prochaines étapes
- [Structure des dossiers](/fr/start/folder-structure) — Chaque répertoire et fichier expliqué
- [Routing](/fr/guides/basics/routing) — Groupes de routes, guards, matchers de paramètres, routes nommées
- [Protéger les routes](/fr/guides/auth/protecting-routes) — Guards, rôles, permissions et middleware d'authentification
- [Warden](/fr/guides/auth/introduction) — Auth multi-stratégies, RBAC, détails JWT
- [Atlas](/fr/guides/database/orm/) — Remplacer le stockage en mémoire par une vraie base de données
- [Bus d'événements](/fr/guides/digging-deeper/emitter) — Système d'événements typé complet avec Emitter et BaseEvent
