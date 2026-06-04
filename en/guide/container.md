# IoC Container

The IoC (Inversion of Control) container is the backbone of a Ream application. It auto-constructs classes, manages dependency lifetimes, and provides a testing seam via swaps. The design is AdonisJS Fold-compatible.

## Auto-construction with `make()`

The primary entry point is `container.make(Class)`. Pass any class — decorated or plain — and the container constructs it, resolving every constructor parameter automatically.

```typescript
import { Container } from '@c9up/ream'

const container = new Container()

class UserService {
  findAll() {
    return [{ id: 1, name: 'Alice' }]
  }
}

// No registration needed — the container auto-constructs it
const service = container.make(UserService)
```

`make()` is an alias for `resolve()`. Both are interchangeable.

## Explicit bindings

Use explicit bindings when you need to control how an instance is created — for example, to pass config values from a provider.

### `singleton(token, factory)`

The factory runs once. Every subsequent call returns the same cached instance.

```typescript
container.singleton('db', () => {
  return new DatabaseManager(config.get('database'))
})

const db1 = container.make('db')
const db2 = container.make('db')
// db1 === db2
```

### `bind(token, factory)`

The factory runs on every resolution, producing a fresh instance each time (transient scope).

```typescript
container.bind('requestLogger', () => {
  return new Logger()
})

const logger1 = container.make('requestLogger')
const logger2 = container.make('requestLogger')
// logger1 !== logger2
```

### `bindValue(token, value)`

Registers a pre-existing value. Stored immediately as a singleton — no factory involved.

```typescript
const pool = await createConnectionPool(config)
container.bindValue('pool', pool)

// Anywhere later:
const p = container.make('pool') // the exact same pool object
```

## `@Service()` — singleton by default

Decorate a class with `@Service()` so the container can discover and auto-resolve it. The default scope is `singleton`.

```typescript
import { Service } from '@c9up/ream'

@Service()
export class UserRepository {
  findAll() {
    return db.query('SELECT * FROM users')
  }
}
```

The container resolves `UserRepository` by class reference:

```typescript
const repo = container.make(UserRepository)
```

Override the scope or register under a custom string token with `as`:

```typescript
@Service({ scope: 'transient' })
export class RequestContext { /* ... */ }

@Service({ as: 'PaymentGateway' })
export class StripeGateway implements PaymentGateway { /* ... */ }
```

## `@inject()` — transient controllers

`@inject()` is shorthand for `@Service({ scope: 'transient' })`. Use it on controllers so the container builds a fresh instance per request, injecting constructor dependencies automatically.

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

`UserService` itself should be decorated with `@Service()` so the container knows how to build it:

```typescript
import { Service } from '@c9up/ream'

@Service()
export class UserService {
  findAll() {
    return [{ id: 1, name: 'Alice' }]
  }
}
```

## `@Inject(token)` — named parameter injection

When a constructor parameter is an interface (no runtime representation), use `@Inject(token)` to tell the container which named binding to resolve for that position.

```typescript
import { Service, Inject } from '@c9up/ream'

interface PaymentGateway {
  charge(amount: number): Promise<void>
}

// Register the implementation under a string token
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

## `@Lazy()` — breaking circular dependencies

When two services depend on each other, the container throws a `CIRCULAR_DEPENDENCY` error. Use `@Lazy()` on one constructor parameter to defer resolution until first use.

```typescript
import { Service, Lazy } from '@c9up/ream'

@Service()
class OrderService {
  constructor(
    @Lazy() private paymentService: PaymentService,
  ) {}

  processOrder() {
    // paymentService is resolved here on first access, not at construction time
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

`@Lazy()` wraps the dependency in a `Proxy`. The real instance is not resolved until a property or method on the proxy is accessed. Once resolved, the instance is cached.

| Approach | Use case |
|---|---|
| `@Lazy()` | Two services that legitimately need each other |
| Restructure the graph | Preferred when one direction of the dependency can be removed |
| Events | Full decoupling across module boundaries |

## `Container.call()` — method injection

`container.call(instance, 'methodName')` resolves the method's parameter types and invokes it with injected arguments. Useful for middleware, command handlers, or route handlers where you do not control construction.

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
// ReportService and MailService are resolved automatically
```

Pass extra runtime values that take precedence over injected ones:

```typescript
await container.call(handler, 'handle', [mySpecificReportService])
// position 0 uses mySpecificReportService; position 1 is still injected
```

## `static containerInjections` — without `emitDecoratorMetadata`

Runtimes that do not emit TypeScript decorator metadata (Bun native, esbuild without the plugin, some ESM environments) cannot use `Reflect.getMetadata('design:paramtypes', ...)`. Declare a static `containerInjections` property as a fallback — the container reads it with priority.

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

The shape must match `{ _constructor: { dependencies: ServiceToken[] } }`. This is the AdonisJS Fold convention and works in any runtime.

## Testing — `swap()` and `restore()`

`container.swap(token, factory)` replaces a binding for the duration of a test. The cached singleton is cleared so the fake factory runs fresh.

```typescript
import { beforeEach, afterEach, test, expect } from 'vitest'
import { container } from '@c9up/ream/services/app'

beforeEach(() => {
  container.swap('PaymentGateway', () => ({
    charge: async () => { /* no-op */ },
  }))
})

afterEach(() => {
  container.restore('PaymentGateway')
})

test('places an order without real payment', async () => {
  const orders = container.make(OrderService)
  await orders.placeOrder(100)
  // assert side-effects without hitting Stripe
})
```

Calling `container.restore()` with no argument clears all active swaps at once.

## Scopes reference

| Scope | Lifetime | Decorator |
|---|---|---|
| `singleton` | One instance for the process | `@Service()` (default) |
| `transient` | New instance per `make()` call | `@Service({ scope: 'transient' })` or `@inject()` |

## Complete controller + service example

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

The container auto-resolves `UserService` from the `UsersController` constructor because `UserService` is decorated with `@Service()` and `UsersController` is decorated with `@inject()`.

## Next steps

- [Providers](/en/guide/providers) — Register bindings during the boot phase
- [Lifecycle](/en/guide/lifecycle) — Understand when the container is available
- [Routing](/en/guide/routing) — Wire controllers to HTTP routes
