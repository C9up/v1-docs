# Event bus

Ream embarque un event bus comme **primitive du core** — au même titre que le
router, la couche HTTP et le scheduler, il fait partie de `@c9up/ream` lui-même
(adossé à une crate Rust native). Un emitter in-process de base fonctionne avec
**zéro infrastructure externe** ; un store durable adossé à Redis est une option
de build pour la production.

## L'Emitter

`Emitter` supporte à la fois les events nommés (string) et les events à base de
classe, plus les souscriptions wildcard et le request/reply — le tout via la
même instance.

```ts
import { Emitter } from '@c9up/ream'

// Events string
emitter.on('user:registered', (user) => sendWelcome(user))
emitter.emit('user:registered', { id: 1 })

// Events à base de classe (typés)
class TaskDeclared extends BaseEvent {
  constructor(public task: Task) { super() }
}
emitter.on(TaskDeclared, SendNotification)   // classe listener (résolue par DI)
await new TaskDeclared(task).emit()

// Souscriptions wildcard (moteur de pattern Rust)
await emitter.onAny('order.*', (name, data) => audit(name, data))

// Request / reply
const user = await emitter.request('query:user.find', { id: 1 })
```

Les **classes** listener sont résolues via le container IoC : elles bénéficient
donc de l'injection de dépendances. Les listeners fonction inline marchent
toujours, même sans container.

## Câblage

`EventsProvider` binde le bus dans le container. Enregistre-le (il fait partie du
set de providers recommandé), puis résous l'emitter via le token `events`.

```ts
// providers de reamrc.ts
() => import('@c9up/ream/events/provider')
```

```ts
const emitter = app.container.make('events')   // ou 'emitter'
```

Le provider binde trois tokens vers le même emitter — `events` (principal),
`emitter` (style AdonisJS), et `bus` (le `EventBus` natif bas niveau).

## Dans un handler — `ctx.events`

Quand `EventsProvider` est enregistré, l'emitter est attaché à chaque
`HttpContext` : un handler peut émettre sans passer par le container :

```ts
router.post('/users', async (ctx) => {
  const user = await createUser(ctx.request.body())
  ctx.events?.emit('user:created', user)   // undefined si events non câblés
  ctx.response.json(user)
})
```

`ctx.events` est `undefined` quand aucun `EventsProvider` n'est enregistré — les
apps sans events ne paient rien (le bus natif n'est même pas chargé).

## Events de lifecycle du core

Le core ream émet lui-même quelques events de domaine via le bus (uniquement si
les events sont câblés). Souscris-y comme à n'importe quel event :

| Event | Quand | Payload |
|---|---|---|
| `app:ready` | une fois, après le `ready()` de chaque provider | `{ environment }` |
| `exception` | un handler a throw (chemin d'erreur uniquement) | `{ id, method, path, error }` |

Les events `http:request` / `http:response` par-requête ne sont **pas** émis par
défaut (ils taxeraient le hot path) ; ils pourront devenir un opt-in.

## Enregistrer des souscripteurs

Un souscripteur c'est juste du code qui appelle `emitter.on(...)`. On le câble au
boot en **preloadant** un fichier depuis `reamrc.ts` (le même mécanisme que les
routes) :

```ts
// start/events.ts
import emitter from '@c9up/ream/events/services/main'
import { SendWelcome } from '#listeners/send_welcome'

emitter.on('user:created', SendWelcome)
emitter.on('app:ready', () => console.log('booted'))
```

```ts
// reamrc.ts
export default defineConfig({
  providers: [() => import('@c9up/ream/events/provider')],
  preloads: [() => import('./start/events.js')],
})
```

## Configuration

```ts
// config/events.ts
import { defineConfig } from '@c9up/ream/events/config'

export default defineConfig({
  store: 'memory',   // défaut — zéro infra externe
  retries: 3,
})
```

Le store par défaut est en mémoire (`MemoryStore`). Un store Redis durable et
distribué est disponible quand la crate native est compilée avec la feature
cargo `redis-store` — opt-in, donc une app simple ne tire jamais de dépendance
Redis.

## Tests

`FakeBus` est un bus en mémoire drop-in pour les tests — aucun binding natif
requis :

```ts
import { FakeBus } from '@c9up/ream/events/testing'

const bus = new FakeBus()
const emitter = new Emitter(bus)
emitter.emit('order.created', { id: 42 })
expect(bus.getEmitted()[0].name).toBe('order.created')
```

Pour des assertions contre le vrai bus Rust, `@c9up/helix` expose des helpers
observateurs (`collect`, `waitForEvent`, `assertEmitted`) via
`@c9up/ream/events/helix`.

## Notes

- `import '@c9up/ream'` expose `Emitter` et `BaseEvent` **sans** charger le
  binaire natif (référencés via `import type`). Le `EventsProvider` et le
  `EventBus` (qui chargent le natif) vivent sur le sous-chemin
  `@c9up/ream/events`.
- Les listeners string et classe qui throw sont isolés ; les échecs remontent
  sur le canal `emitter:error` (ou stderr si aucun n'est câblé). Le `bus.emit`
  cross-service part quand même — l'event de domaine a déjà eu lieu.
