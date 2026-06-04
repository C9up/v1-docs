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

## Best practices

- use stable tokens (`db`, `cache`, `bus`)
- centralize bindings in providers
- avoid irreversible side effects in factories
- in tests, prefer suite-scoped overrides
