# HTTP Kernel et Routing

Le core compose Router + Middleware + Server pour exécuter les requêtes.

## Exemple

```ts
await new Ignitor()
  .httpServer()
  .use(async (ctx, next) => {
    const start = Date.now()
    await next()
    ctx.response.header('x-duration-ms', String(Date.now() - start))
  })
  .routes((router) => {
    router.get('/users/:id', async (ctx) => {
      ctx.response.json({ id: ctx.params.id })
    })
  })
  .start()
```

## Ordre middleware conseille

1. technique (request id, timing, body parser)
2. sécurité (cors, headers, shield, rate limit)
3. auth/permissions
4. logique métier

## Point d'attention

Éviter les middlewares qui avalent les erreurs sans rethrow/log structuré.
