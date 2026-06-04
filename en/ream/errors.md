# HTTP Exceptions

`@c9up/ream` exports a small family of `Exception` subclasses keyed by an `E_*` code. Each one self-handles into a structured JSON response, so a `throw new E_FORBIDDEN()` inside a handler reaches the client as a 403 with `{ error: { code: 'E_FORBIDDEN', message } }` — no try/catch in your controller.

For framework-specific catalogs (photon, atlas, container, pipeline), see the dedicated [error catalog](/en/errors/).

## Base

### `Exception`

Parent of every built-in HTTP exception. Carries `status` + `code` and exposes optional `handle(error, ctx)` and `report(error, ctx)` hooks for self-handling and custom logging.

```ts
import { Exception } from '@c9up/ream'

class PaymentFailed extends Exception {
  static override status = 402
  static override code = 'E_PAYMENT_FAILED'
}
```

## Built-in codes

| Code | Status | Throws | Notes |
|---|---|---|---|
| `E_HTTP_EXCEPTION` | configurable | `new E_HTTP_EXCEPTION(message, status)` | Generic HTTP error. Prefer a specific subclass when one exists. |
| `E_UNAUTHORIZED` | 401 | `new E_UNAUTHORIZED('Bearer token required')` | Self-handles to `{ error: { code, message } }`. Default message: `Authentication required`. |
| `E_FORBIDDEN` | 403 | `new E_FORBIDDEN('Insufficient permissions', ['admin'])` | Optional `required: string[]` of missing roles/permissions, surfaced in the response body. |
| `E_VALIDATION_ERROR` | 422 | `new E_VALIDATION_ERROR(errors)` | Response body is `{ errors }` directly (not wrapped). `errors: unknown[]` is whatever your validator emits. |
| `E_ROUTE_NOT_FOUND` | 404 | thrown internally by the router when no route matches | Auto-emitted; you usually don't instantiate it. |
| `E_ROW_NOT_FOUND` | 404 | `new E_ROW_NOT_FOUND('User')` | Pair with a service-layer lookup that returns `null`. The optional model name is interpolated into the default message. |
| `E_UNKNOWN` | 500 | fallback for non-Exception throws caught by `ExceptionHandler` | Surfaces as a generic 500. |

## Usage

```ts
import { E_FORBIDDEN, E_UNAUTHORIZED, E_VALIDATION_ERROR } from '@c9up/ream'

router.post('/orders', async ({ auth, request }) => {
  if (!auth.user) throw new E_UNAUTHORIZED()
  if (!auth.user.roles.includes('staff')) {
    throw new E_FORBIDDEN('Staff only', ['staff'])
  }
  const parsed = OrderValidator.validate(await request.body())
  if (!parsed.valid) throw new E_VALIDATION_ERROR(parsed.errors)
  // …
})
```

## Self-handling vs the global `ExceptionHandler`

Built-in exceptions override `handle(error, ctx)` so they bypass the global handler. Your own subclasses can do the same:

```ts
class TenantSuspended extends Exception {
  static override status = 423
  static override code = 'E_TENANT_SUSPENDED'

  override handle(_error: this, ctx: HttpContext): void {
    ctx.response.status(423).json({
      error: { code: this.code, message: this.message, supportUrl: '/help/billing' },
    })
  }
}
```

When an exception does NOT define `handle`, `ExceptionHandler.handle()` (the global one registered via `server.errorHandler(...)`) takes over. It:

1. Detects the wanted response shape via content negotiation (`Accept: application/json` → JSON, else a minimal HTML page).
2. Picks `status` + `code` from the `Exception` instance (or defaults `500` / `E_UNKNOWN`).
3. Includes a stack trace in the JSON body when `debug: true`.

## Reporting

Override `report(error, ctx)` on a custom exception (or on a subclass of `ExceptionHandler`) to send the failure to your monitoring stack. The default reporter logs to `stderr` and skips statuses in `ignoreStatuses` (defaults: `400`, `401`, `404`, `422`).

```ts
class Handler extends ExceptionHandler {
  protected override ignoreStatuses = [400, 404, 422]

  override async report(error: unknown, ctx: HttpContext) {
    if (error instanceof Exception && this.ignoreStatuses.includes(error.status)) return
    sentry.captureException(error, { user: { id: ctx.auth.user?.id } })
  }
}
```

## Conventions

- Never leak internal stack traces in production responses. Set `ExceptionHandler.debug = false` (or check `app.inProduction`).
- Map domain errors to HTTP statuses early — a service that throws `E_ROW_NOT_FOUND` is clearer than one that returns `null` and forces every caller to remember the 404.
- Reserve `E_HTTP_EXCEPTION` for one-off codes you don't plan to type. For anything you throw more than twice, write a named subclass.

## See also

- [Error catalog](/en/errors/) — Container, router, pipeline, photon error codes
- [Middleware](/en/guide/middleware) — Where most exceptions actually originate
- [Quick Start](/en/guide/quick-start) — End-to-end example with auth guard rejections
