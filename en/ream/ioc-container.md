# IoC Container

The container is the core injection backbone.

## Recommended pattern

```ts
import { Provider } from '@c9up/ream'
import { CacheManager, MemoryDriver } from '@c9up/echo'

export default class AppProvider extends Provider {
  register() {
    this.app.container.singleton('cache', () => new CacheManager(new MemoryDriver()))
  }
}
```

Resolving is asynchronous: `container.make()` and `container.resolve()` return a `Promise<T>` and must be awaited (AdonisJS v6 parity). Prefer the `make<T>()` generic over an `as` cast:

```ts
const cache = await this.app.container.make<CacheManager>('cache')
```

When a factory depends on another binding, make it `async` and await the `resolver` the container passes in:

```ts
this.app.container.singleton('cache', async (resolver) => {
  const driver = await resolver.make<MemoryDriver>('driver')
  return new CacheManager(driver)
})
```

## Best practices

- use stable tokens (`db`, `cache`, `bus`)
- centralize bindings in providers
- avoid irreversible side effects in factories
- in tests, prefer suite-scoped overrides
