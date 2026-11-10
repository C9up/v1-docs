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

La résolution est asynchrone : `container.make()` et `container.resolve()` retournent une `Promise<T>` et doivent être attendus avec `await`. Préférer le générique `make<T>()` plutôt qu'un cast `as` :

```ts
const cache = await this.app.container.make<CacheManager>('cache')
```

Quand une factory depend d'un autre binding, la rendre `async` et await le `resolver` fourni par le container :

```ts
this.app.container.singleton('cache', async (resolver) => {
  const driver = await resolver.make<MemoryDriver>('driver')
  return new CacheManager(driver)
})
```

## Bonnes pratiques

- utiliser des tokens stables (`db`, `cache`, `bus`)
- centraliser les bindings dans les providers
- eviter les side effects irreversibles dans les factories
- sur tests, preferer override/local binding par suite
