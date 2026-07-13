# Conteneur IoC

Le conteneur IoC (Inversion of Control) est la colonne vertébrale d'une application Ream. Il construit les classes automatiquement, gère la durée de vie des dépendances et fournit un point de substitution pour les tests via les swaps. La conception est compatible avec AdonisJS Fold.

## Construction automatique avec `make()`

Le point d'entrée principal est `container.make(Class)`. Passez n'importe quelle classe — décorée ou non — et le conteneur la construit en résolvant automatiquement chaque paramètre de constructeur.

```typescript
import { Container } from '@c9up/ream'

const container = new Container()

class UserService {
  findAll() {
    return [{ id: 1, name: 'Alice' }]
  }
}

// Aucun enregistrement nécessaire — le conteneur la construit automatiquement
const service = await container.make(UserService)
```

`make()` et `resolve()` sont **asynchrones** — ils retournent `Promise<T>` et doivent être `await`és (parité AdonisJS Fold). Oublier le `await` vous rend une `Promise` en attente, et non l'instance ; l'appel de méthode suivant échoue avec `X is not a function`. Passez un argument de type — `make<T>()` — au lieu de caster le résultat avec `as T`.

`make()` est un alias de `resolve()`. Les deux sont interchangeables.

## Liaisons explicites

Utilisez les liaisons explicites lorsque vous devez contrôler la façon dont une instance est créée — par exemple, pour passer des valeurs de configuration depuis un provider.

### `singleton(token, factory)`

La factory s'exécute une seule fois. Chaque appel suivant retourne la même instance mise en cache. La factory reçoit un `resolver` (parité AdonisJS Fold) et peut être `async` — le conteneur l'`await`e. Lorsqu'une factory résout une autre liaison, rendez-la `async` et `await`ez le `make()` imbriqué.

```typescript
container.singleton('db', () => {
  return new DatabaseManager(config.get('database'))
})

// Une factory qui dépend d'une autre liaison doit être async et l'awaiter :
container.singleton('reporting', async (resolver) => {
  const db = await resolver.make('db')
  return new ReportingService(db)
})

const db1 = await container.make('db')
const db2 = await container.make('db')
// db1 === db2
```

### `bind(token, factory)`

La factory s'exécute à chaque résolution, produisant une nouvelle instance à chaque fois (portée transiente).

```typescript
container.bind('requestLogger', () => {
  return new Logger()
})

const logger1 = await container.make('requestLogger')
const logger2 = await container.make('requestLogger')
// logger1 !== logger2
```

### `bindValue(token, value)`

Enregistre une valeur préexistante. Stockée immédiatement comme un singleton — aucune factory impliquée.

```typescript
const pool = await createConnectionPool(config)
container.bindValue('pool', pool)

// N'importe où ensuite :
const p = await container.make('pool') // exactement le même objet pool
```

## `@Service()` — singleton par défaut

Décorez une classe avec `@Service()` pour que le conteneur puisse la découvrir et la résoudre automatiquement. La portée par défaut est `singleton`.

```typescript
import { Service } from '@c9up/ream'

@Service()
export class UserRepository {
  findAll() {
    return db.query('SELECT * FROM users')
  }
}
```

Le conteneur résout `UserRepository` par référence de classe :

```typescript
const repo = await container.make(UserRepository)
```

Surchargez la portée ou enregistrez sous un token de chaîne personnalisé avec `as` :

```typescript
@Service({ scope: 'transient' })
export class RequestContext { /* ... */ }

@Service({ as: 'PaymentGateway' })
export class StripeGateway implements PaymentGateway { /* ... */ }
```

## `@inject()` — contrôleurs transients

`@inject()` est un raccourci pour `@Service({ scope: 'transient' })`. Utilisez-le sur les contrôleurs pour que le conteneur construise une nouvelle instance à chaque requête, en injectant automatiquement les dépendances du constructeur.

```typescript
import { inject } from '@c9up/ream'
import type { HttpContext } from '@c9up/ream'
import { UserService } from '../services/UserService.js'

@inject()
export default class UsersController {
  constructor(protected userService: UserService) {}

  async index({ response }: HttpContext) {
    response.json({ data: this.userService.findAll() })
  }
}
```

`UserService` lui-même doit être décoré avec `@Service()` pour que le conteneur sache comment le construire :

```typescript
import { Service } from '@c9up/ream'

@Service()
export class UserService {
  findAll() {
    return [{ id: 1, name: 'Alice' }]
  }
}
```

## `@Inject(token)` — injection par paramètre nommé

Lorsqu'un paramètre de constructeur est une interface (sans représentation à l'exécution), utilisez `@Inject(token)` pour indiquer au conteneur quelle liaison nommée résoudre pour cette position.

```typescript
import { Service, Inject } from '@c9up/ream'

interface PaymentGateway {
  charge(amount: number): Promise<void>
}

// Enregistre l'implémentation sous un token de chaîne
container.singleton('PaymentGateway', () => new StripeGateway())

@Service()
export class OrderService {
  constructor(
    @Inject('PaymentGateway') private payment: PaymentGateway,
  ) {}

  async placeOrder(amount: number) {
    await this.payment.charge(amount)
  }
}
```

## `@Lazy()` — résoudre les dépendances circulaires

Lorsque deux services dépendent l'un de l'autre, le conteneur lève une erreur `CIRCULAR_DEPENDENCY`. Utilisez `@Lazy()` sur l'un des paramètres du constructeur pour différer la résolution jusqu'au premier accès.

```typescript
import { Service, Lazy } from '@c9up/ream'

@Service()
class OrderService {
  constructor(
    @Lazy() private paymentService: PaymentService,
  ) {}

  processOrder() {
    // paymentService est résolu ici au premier accès, pas à la construction
    this.paymentService.charge(100)
  }
}

@Service()
class PaymentService {
  constructor(
    @Lazy() private orderService: OrderService,
  ) {}

  refund(orderId: string) {
    return this.orderService.findById(orderId)
  }
}
```

`@Lazy()` enveloppe la dépendance dans un `Proxy`. La vraie instance n'est pas résolue tant qu'une propriété ou méthode du proxy n'est pas accédée. Une fois résolue, l'instance est mise en cache.

| Approche | Cas d'usage |
|---|---|
| `@Lazy()` | Deux services qui ont légitimement besoin l'un de l'autre |
| Restructurer le graphe | À préférer lorsqu'une direction de la dépendance peut être supprimée |
| Événements | Découplage complet au-delà des frontières de module |

## `Container.call()` — injection de méthode

`container.call(instance, 'methodName')` résout les types de paramètres de la méthode et l'invoque avec les arguments injectés. Utile pour les middlewares, les gestionnaires de commandes ou les gestionnaires de routes lorsque vous ne contrôlez pas la construction.

```typescript
import { Container } from '@c9up/ream'

class ReportHandler {
  async handle(reportService: ReportService, mailer: MailService) {
    const report = await reportService.generate()
    await mailer.send('admin@example.com', report)
  }
}

const handler = new ReportHandler()
await container.call(handler, 'handle')
// ReportService et MailService sont résolus automatiquement
```

Passez des valeurs d'exécution supplémentaires qui ont la priorité sur les valeurs injectées :

```typescript
await container.call(handler, 'handle', [mySpecificReportService])
// la position 0 utilise mySpecificReportService ; la position 1 est toujours injectée
```

## `static containerInjections` — sans `emitDecoratorMetadata`

Les environnements d'exécution qui n'émettent pas les métadonnées de décorateurs TypeScript (Bun natif, esbuild sans le plugin, certains environnements ESM) ne peuvent pas utiliser `Reflect.getMetadata('design:paramtypes', ...)`. Déclarez une propriété statique `containerInjections` comme solution de repli — le conteneur la lit en priorité.

```typescript
import { inject } from '@c9up/ream'
import { UserService } from '../services/UserService.js'

@inject()
export default class UsersController {
  static containerInjections = {
    _constructor: {
      dependencies: [UserService],
    },
  }

  constructor(protected userService: UserService) {}

  async index({ response }: HttpContext) {
    response.json({ data: this.userService.findAll() })
  }
}
```

La structure doit correspondre à `{ _constructor: { dependencies: ServiceToken[] } }`. C'est la convention AdonisJS Fold et elle fonctionne dans n'importe quel environnement d'exécution.

## Tests — `swap()` et `restore()`

`container.swap(token, factory)` remplace une liaison pour la durée d'un test. Le singleton mis en cache est effacé afin que la factory fictive s'exécute à neuf.

```typescript
import { beforeEach, afterEach, test, expect } from 'vitest'
import { container } from '@c9up/ream/services/app'

beforeEach(() => {
  container.swap('PaymentGateway', () => ({
    charge: async () => { /* aucune opération */ },
  }))
})

afterEach(() => {
  container.restore('PaymentGateway')
})

test('places an order without real payment', async () => {
  const orders = await container.make(OrderService)
  await orders.placeOrder(100)
  // vérifier les effets de bord sans passer par Stripe
})
```

Appeler `container.restore()` sans argument supprime tous les swaps actifs en une seule fois.

## Référence des portées

| Portée | Durée de vie | Décorateur |
|---|---|---|
| `singleton` | Une instance pour tout le processus | `@Service()` (par défaut) |
| `transient` | Nouvelle instance à chaque appel `make()` | `@Service({ scope: 'transient' })` ou `@inject()` |

## Exemple complet contrôleur + service

```typescript
// app/services/UserService.ts
import { Service } from '@c9up/ream'

@Service()
export class UserService {
  findAll() {
    return [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]
  }

  findById(id: number) {
    return this.findAll().find(u => u.id === id) ?? null
  }
}
```

```typescript
// app/controllers/UsersController.ts
import { inject } from '@c9up/ream'
import type { HttpContext } from '@c9up/ream'
import { UserService } from '../services/UserService.js'

@inject()
export default class UsersController {
  constructor(protected userService: UserService) {}

  async index({ response }: HttpContext) {
    response.json({ data: this.userService.findAll() })
  }

  async show({ params, response }: HttpContext) {
    const user = this.userService.findById(Number(params.id))
    if (!user) return response.status(404).json({ error: 'Not found' })
    response.json({ data: user })
  }
}
```

```typescript
// start/routes.ts
import router from '@c9up/ream/services/router'
import UsersController from '../app/controllers/UsersController.js'

router.get('/users', [UsersController, 'index'])
router.get('/users/:id', [UsersController, 'show'])
```

Le conteneur résout automatiquement `UserService` depuis le constructeur de `UsersController` parce que `UserService` est décoré avec `@Service()` et `UsersController` est décoré avec `@inject()`.

## Étapes suivantes

- [Providers](/fr/guide/providers) — Enregistrer les liaisons pendant la phase de démarrage
- [Cycle de vie](/fr/guide/lifecycle) — Comprendre quand le conteneur est disponible
- [Routage](/fr/guide/routing) — Associer les contrôleurs aux routes HTTP
