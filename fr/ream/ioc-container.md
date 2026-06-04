# Container IoC

Le container est le backbone d'injection du core.

## Pattern recommande

```ts
import { Provider } from '@c9up/ream'
import { CacheManager, MemoryDriver } from '@c9up/echo'

export default class AppProvider extends Provider {
  register() {
    this.app.container.singleton('cache', () => new CacheManager(new MemoryDriver()))
  }
}
```

## Bonnes pratiques

- utiliser des tokens stables (`db`, `cache`, `bus`)
- centraliser les bindings dans les providers
- eviter les side effects irreversibles dans les factories
- sur tests, preferer override/local binding par suite
