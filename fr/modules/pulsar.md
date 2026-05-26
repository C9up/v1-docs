# Pulsar — Event Bus

Pulsar est le bus events Rust au coeur de Ream. Les services communiquent par events — découplés, observables et rapides.

## Utilisation basique

```typescript
import { PulsarBus } from '@c9up/pulsar'

const bus = new PulsarBus()

// S'abonner aux events
bus.subscribe('order.created', (eventJson) => {
  const event = JSON.parse(eventJson)
  console.log(`Commande ${event.data.orderId} créée`)
})

// Émettre un event
bus.emit('order.created', JSON.stringify({ orderId: '123', total: 42.50 }))
```

## Abonnements wildcard

```typescript
// Écouter tous les events order
bus.subscribe('order.*', (eventJson) => {
  const event = JSON.parse(eventJson)
  console.log(`Event order: ${event.name}`)
})

bus.emit('order.created', '{}')    // ✓ correspond
bus.emit('order.paid', '{}')       // ✓ correspond
bus.emit('payment.received', '{}') // ✗ ne correspond pas
```

## Request/Reply

```typescript
// Enregistrer un handler de requête
bus.onRequest('order.validate', (eventJson) => {
  const event = JSON.parse(eventJson)
  return JSON.stringify({ valid: true })
})

// Envoyer une requête et recevoir une réponse
const response = bus.request('order.validate', JSON.stringify({ amount: 42 }))
```

## Structure d'un event

Chaque event porte :

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | UUID unique de l'event |
| `name` | string | Nom de l'event (ex: `order.created`) |
| `data` | string | Payload JSON |
| `correlationId` | string | ID de traçage de chaîne |
| `causationId` | string? | ID de l'event parent |
| `timestamp` | string | Timestamp ISO 8601 |
| `nodeId` | string | Identifiant de noeud (pour la distribution future) |

## Tests avec Helix Helpers

```typescript
import { PulsarBus } from '@c9up/pulsar'
import { collect, fake } from '@c9up/pulsar/tests/helix/helpers'

// Capturer les events émis
const { events } = collect(bus, 'order.created')
bus.emit('order.created', '{}')
// events[0].name === 'order.created'

// Intercepter les events
const faked = fake(bus, 'mail.send')
bus.emit('mail.send', '{}')
// faked.events[0] capturé
```

## Retry avec backoff

Abonnez-vous avec retry automatique en cas d'échec du handler via `subscribe_with_retry` :

```typescript
import { PulsarBus } from '@c9up/pulsar'

const bus = new PulsarBus()

bus.subscribe_with_retry('payment.process', (eventJson) => {
  const event = JSON.parse(eventJson)
  // Traiter le paiement — si ça lève une exception, ce sera réessayé
  processPayment(event.data)
}, {
  max_retries: 3,        // Nombre maximum de tentatives (défaut : 3)
  base_delay_ms: 100,    // Délai initial en millisecondes (défaut : 100)
  max_delay_ms: 5000,    // Plafond du délai en millisecondes (défaut : 5000)
})
```

### Comportement du retry

- Utilise un **backoff exponentiel** : le délai double après chaque tentative (100ms, 200ms, 400ms...)
- Le délai est plafonné à `max_delay_ms`
- En cas d'échec final après épuisement des retries :
  - Un event `service.error` est émis avec les données de l'event original et les détails de l'erreur
  - L'event échoué est envoyé dans une **dead letter queue** pour inspection ou rejeu manuel

### RetryConfig

| Champ | Type | Défaut | Description |
|-------|------|--------|-------------|
| `max_retries` | number | 3 | Nombre maximum de tentatives |
| `base_delay_ms` | number | 100 | Délai initial du backoff (ms) |
| `max_delay_ms` | number | 5000 | Plafond du délai de backoff (ms) |

## waitForChain

Attendre qu'une séquence d'events corrélés se termine :

```typescript
import { PulsarBus, waitForChain } from '@c9up/pulsar'

const bus = new PulsarBus()

// Attendre que tous les events d'une chaîne soient émis
const events = await waitForChain(bus, correlationId, ['order.created', 'payment.charged', 'order.fulfilled'], {
  timeout: 5000,  // Timeout en millisecondes (défaut : 5000)
})

// events contient tous les events correspondants dans l'ordre
```

### Paramètres

| Paramètre | Type | Description |
|-----------|------|-------------|
| `bus` | PulsarBus | L'instance du bus sur laquelle écouter |
| `correlationId` | string | L'ID de corrélation pour filtrer les events |
| `expectedNames` | string[] | Liste ordonnée des noms d'events attendus |
| `options.timeout` | number | Temps d'attente maximum en ms (défaut : 5000) |

Lance `PULSAR_TIMEOUT` si la chaîne ne se termine pas dans le délai imparti.

## Indépendance

Chaque instance `PulsarBus` est indépendante — pas un singleton. Plusieurs instances coexistent sans interférence, ce qui permet l'isolation des tests en parallèle.

```typescript
const bus1 = new PulsarBus()
const bus2 = new PulsarBus()

bus1.subscribe('test', () => { /* ne se déclenche que pour bus1.emit */ })
bus2.emit('test', '{}')  // l'abonné de bus1 ne se déclenche PAS
```

---

## Emitter — Système d'événements typés

L'Emitter fournit un système d'événements compatible AdonisJS, adossé au PulsarBus.

### Classes d'événements

```typescript
// app/modules/task/events/TaskDeclared.ts
import { BaseEvent } from '@c9up/pulsar/events'

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

### Classes de listeners

Les listeners ont une méthode `handle()` et supportent `@inject()` pour l'injection de dépendances :

```typescript
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

### Enregistrement des événements par module

Chaque module a un fichier `events.ts` chargé automatiquement par le framework :

```typescript
// app/modules/task/events.ts
import app from '@c9up/ream/services/app'
import { Emitter } from '@c9up/pulsar/events'
import TaskDeclared from './events/TaskDeclared.js'
import LogTaskEvent from './listeners/LogTaskEvent.js'

const emitter = app.container.make(Emitter)
emitter.on(TaskDeclared, LogTaskEvent)
```

### Dispatch d'événements

```typescript
TaskDeclared.dispatch(taskId, residenceId, declarantId)
```
