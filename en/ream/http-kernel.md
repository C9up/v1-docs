# HTTP Kernel and Routing

Core composes Router + Middleware + Server to execute requests.

## Example

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

## Recommended middleware order

1. technical (request id, timing, body parser)
2. security (cors, headers, shield, rate limit)
3. auth/permissions
4. business logic

## Watch-out

Avoid middleware that swallows errors without rethrow/structured logging.
