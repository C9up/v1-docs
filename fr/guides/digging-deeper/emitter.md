# Émetteur

Ce guide couvre l'émetteur d'événements :

- L'Emitter
- Câblage
- Dans un handler — `ctx.events`
- Events de lifecycle du core
- Enregistrer des souscripteurs
- Configuration
- Tests
- Notes

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
await emitter.emit('user:registered', { id: 1 })

// Events à base de classe (typés)
class TaskDeclared extends BaseEvent {
  constructor(public task: Task) { super() }
}
emitter.on(TaskDeclared, [SendNotification])  // classe listener (résolue par DI)
await new TaskDeclared(task).emit()

// Souscriptions wildcard (moteur de pattern Rust)
const unsubscribe = await emitter.onAny('order.*', (name, data) => audit(name, data))

// Request / reply
const user = await emitter.request('query:user.find', { id: 1 })
```

### `emit` se résout quand les écouteurs ont fini

`emit()` renvoie une promesse qui se résout une fois **tous** les écouteurs
terminés — l'attendre, c'est ainsi qu'un handler s'assure que le travail qu'il a
déclenché a bien eu lieu avant de répondre. Les écouteurs tournent en
**parallèle** ; `emitSerial()` les enchaîne, pour quand l'un prépare ce que le
suivant lit.

```ts
await emitter.emit('order:placed', order)        // en parallèle
await emitter.emitSerial('order:placed', order)  // un à la fois
```

Ne pas l'attendre garde la forme « on tire et on oublie ». Un écouteur qui lève
est rapporté sur le canal d'erreur et **n'annule pas** les autres : un abonné
défaillant ne doit pas annuler en silence la réaction à un événement qu'il ne
possède pas.

### Gérer les écouteurs

```ts
emitter.once('boot:ready', run)         // la prochaine occurrence seulement
emitter.off('boot:ready', run)          // en retirer un
emitter.listenIf(config.audit, 'x', fn) // n'enregistre que si le drapeau tient ; rend le désabonnement
emitter.listenerCount('x')              // combien, ou tous sans argument
emitter.clearListeners('x')             // vide un événement
emitter.clearAllListeners()             // vide tout, listeners joker compris
emitter.onError((event, error) => report(event, error))
```

Chacune prend un event string ou une classe d'event
(`emitter.off(UserRegistered, listener)`, `emitter.listenerCount(UserRegistered)`).
Le même listener enregistré deux fois pour un event ne tourne qu'une fois.

### Formes de listener

Les deux sortes d'event acceptent les mêmes listeners :

```ts
const SendVerificationEmail = () => import('#listeners/send_verification_email')

emitter.on(UserRegistered, (event) => audit(event))          // une fonction
emitter.on(UserRegistered, [SendWelcome])                      // une classe, méthode `handle`
emitter.on('user:registered', [SendWelcome, 'onRegistered'])   // une classe et une méthode
emitter.on(UserRegistered, [SendVerificationEmail])            // paresseux : importé au premier emit
emitter.on('user:registered', SendWelcome)                     // raccourci de [SendWelcome]

emitter.listen(UserRegistered, [SendVerificationEmail, AuditLog]) // plusieurs, chacun en [listener, 'handle']
emitter.off(UserRegistered, [SendWelcome, 'onRegistered'])      // un tuple se retrouve par classe et méthode
```

Les **classes** listener sont construites via le container IoC : elles
bénéficient donc de l'injection de dépendances ; sans container elles sont
construites avec `new`. Le module d'un listener paresseux — et ce qu'il importe,
un mailer ou une queue — est chargé au premier emit, pas au boot, puis gardé
pour les suivants ; son export par défaut est la classe listener. Une méthode
absente de l'instance est rapportée comme une erreur. Les listeners fonction
inline marchent toujours, même sans container.

La forme chaîne `'#listeners/x.method'` d'AdonisJS n'est pas acceptée : elle a
besoin de l'importeur de modules de l'application, que l'emitter n'a pas. Un
tuple paresseux dit la même chose.

### Souscriptions joker

`onAny()` rend une fonction de désabonnement ; `offAny()` prend le listener :

```ts
const unsubscribe = await emitter.onAny(audit)              // tous les events
const scoped = await emitter.onAny('order.*', audit)        // un motif

await unsubscribe()
await emitter.offAny(audit)                                 // ou par listener
```

Un listener joker reçoit le nom de l'event et la valeur émise, une fois par
event qui correspond, et tourne avec l'identifiant de corrélation actif là où
l'event a été émis (`emitter.getCorrelationId()`). L'identifiant voyage sur
l'enveloppe de l'event natif, pas dans le payload. Un listener qui lève ou
rejette est rapporté via `onError` comme tout autre listener ; il ne peut pas
faire tomber le process.

La valeur traverse le bus natif en JSON : un listener joker en reçoit une copie.
Un event de classe arrive comme un objet simple sous son `eventName`, une `Date`
comme sa chaîne ISO. Les listeners enregistrés avec `on()` reçoivent la valeur
elle-même.

::: tip Pourquoi des promesses
Les deux sont des promesses, et la fonction de désabonnement est
`() => Promise<void>` plutôt que `() => void`. S'abonner et se désabonner
traversent la frontière NAPI vers le bus Rust, et rendre la main avant que
l'appel n'atterrisse perdrait des events. Elle reste assignable partout où
un `() => void` est attendu — attendez-la quand l'assertion suivante
dépend de la souscription réellement disparue.
:::

## Câblage

`EventsProvider` binde le bus dans le container. Enregistrez-le (il fait partie du
set de providers recommandé), puis résolvez l'emitter via le token `events`.

```ts
// providers de reamrc.ts
() => import('@c9up/ream/events/provider')
```

```ts
const emitter = await app.container.make('events')   // ou 'emitter'
```

Le provider binde trois tokens vers le même emitter — `events` (principal),
`emitter` (un alias), et `bus` (le `EventBus` natif bas niveau).

Un listener ne garde pas le process en vie : une commande console se termine
quand son travail est fini, même avec un `onAny` ou un `onRequest` enregistré au
preload. Un serveur reste debout grâce à sa socket. À l'arrêt, le provider retire
tous les listeners, souscriptions joker et handlers de requête que le bus garde.

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
les events sont câblés). Souscrivez-y comme à n'importe quel event :

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
const SendWelcome = () => import('#listeners/send_welcome')

emitter.on('user:created', [SendWelcome])   // importé au premier 'user:created'
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
  store: 'memory',   // le défaut, et le seul store de ce build
})
```

Le store est en mémoire. La crate native a un store Redis durable derrière la
feature cargo `redis-store` et une boucle de relivraison, mais aucun des deux
n'est encore atteignable depuis JavaScript : le provider les refuse au boot
plutôt que de les ignorer. Un `store` autre que `'memory'` échoue avec
`E_EVENTS_UNSUPPORTED_STORE`, toute autre option (`retries` comprise) avec
`E_EVENTS_UNSUPPORTED_OPTION`.

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

### Simuler des events

`fake()` empêche les events nommés d'atteindre leurs écouteurs **et** le bus, et
les collecte à la place — un test vérifie donc ce qu'une action a annoncé sans
exécuter toute la réaction qui s'ensuit :

```ts
const events = emitter.fake(['user:registered'])

await register(payload)

events.assertEmitted('user:registered')
events.assertEmittedCount('user:registered', 1)
events.assertNotEmitted('user:deleted')

emitter.restore()
```

Sans argument, tous les events sont simulés. Rappeler `fake()` abandonne le
tampon précédent et en démarre un neuf.

Le tampon restaure l'emitter en sortant d'un bloc `using` : un test qui lève au
milieu ne peut pas laisser les events simulés pour le suivant.

```ts
{
  using events = emitter.fake()
  await register(payload)
  events.assertEmitted('user:registered')
}
// la livraison est de nouveau active ici, quelle que soit la sortie du bloc
```

Les events à base de classe se simulent par leur classe :

```ts
const events = emitter.fake([TaskDeclared])
await new TaskDeclared(task).emit()
events.assertEmitted(TaskDeclared)
```

Surface complète du tampon : `all()`, `size()`, `exists()`, `find()`,
`assertEmitted()`, `assertEmittedCount()`, `assertNotEmitted()`,
`assertNoneEmitted()`, `flush()`. `exists()`, `find()`, `assertEmitted()` et
`assertNotEmitted()` prennent un chercheur optionnel pour viser une émission
parmi plusieurs du même event :

```ts
events.assertEmitted<{ total: number }>('order:placed', ({ data }) => data.total === 99)
```

## Notes

- `import '@c9up/ream'` expose `Emitter` et `BaseEvent` **sans** charger le
  binaire natif (référencés via `import type`). Le `EventsProvider` et le
  `EventBus` (qui chargent le natif) vivent sur le sous-chemin
  `@c9up/ream/events`.
- Les listeners string et classe qui throw sont isolés ; les échecs remontent
  sur le canal `emitter:error` (ou stderr si aucun n'est câblé). Le `bus.emit`
  cross-service part quand même — l'event de domaine a déjà eu lieu.
