# Ignitor et Bootstrap

`Ignitor` est le point d'entree du core: il configure et demarre l'application.

## Bootstrap minimal

```ts
import { Ignitor } from '@c9up/ream'

await new Ignitor({ port: 3333 })
  .httpServer()
  .routes((router) => {
    router.get('/health', (ctx) => ctx.response.json({ ok: true }))
  })
  .start()
```

## Modes

- `httpServer()` pour API/web
- `console()` pour commandes
- `testMode()` pour scenarios tests

## Points cle

- `useRcFile()` pour charger la config framework
- `provider()` pour ajouter des providers inline
- `use()` / `named()` pour middleware global/nomme
- `onError()` pour brancher un handling transversal
