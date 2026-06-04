# Ignitor and Bootstrap

`Ignitor` is the core entry point: it configures and starts the application.

## Minimal bootstrap

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

- `httpServer()` for web/API
- `console()` for commands
- `testMode()` for test scenarios

## Key points

- `useRcFile()` to load framework config
- `provider()` for inline providers
- `use()` / `named()` for global/named middleware
- `onError()` for cross-cutting error handling
