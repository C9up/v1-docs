# Exception handling

This guide covers errors, their codes and how they are reported:

- Base
- Built-in codes
- Usage
- Self-handling vs the global `ExceptionHandler`
- Reporting
- Conventions
- Error handling
- `prettyPrintError(error)`
- Catching an error by its code

`@c9up/ream` exports its errors as one `errors` bag: one `Exception` class per `E_*` code. Each carries its `status` and `code`, and the exception handler turns it into a response, so a `throw new errors.E_AUTHORIZATION_FAILURE()` inside a handler reaches a JSON client as a 403 with `{ error: { code: 'E_AUTHORIZATION_FAILURE', message: 'Access denied' } }` — no try/catch in your controller.

For framework-specific catalogs (photon, atlas, container, pipeline), see the dedicated [error catalog](/en/reference/errors).

## Base

### `Exception`

Parent of every error of the framework and of its packages (it comes from `@c9up/flare`). Carries `status` + `code` (and `help`, an advice to fix the error), and the handler calls optional `handle(error, ctx)` and `report(error, ctx)` hooks for self-handling and custom logging.

```ts
import { createError, Exception } from '@c9up/ream'

class PaymentFailed extends Exception {
  static override status = 402
  static override code = 'E_PAYMENT_FAILED'
}

// The same, in one line; the `%s` values are passed as an array.
const E_PLAN_LIMIT = createError<[string]>('The %s plan has no more seats', 'E_PLAN_LIMIT', 402)
throw new E_PLAN_LIMIT(['starter'])
```

## Built-in codes

| Code | Status | Throws | Notes |
|---|---|---|---|
| `E_HTTP_EXCEPTION` | configurable | `E_HTTP_EXCEPTION.invoke(body, status)` | Generic HTTP error carrying the response `body`. The message is a string body, or the `message` of an object body. Prefer a specific subclass when one exists. |
| `E_HTTP_REQUEST_ABORTED` | configurable (400) | `response.abort(body, status?)` | Extends `E_HTTP_EXCEPTION` and carries its code. Self-handles: sends `body` with `status`. |
| `E_UNAUTHORIZED_ACCESS` | 401 | `new E_UNAUTHORIZED_ACCESS()` | Raised by a route's `.auth()` guard. Message: `Unauthorized access`, as `@c9up/warden` raises it. Renders itself (`handle`) as warden's does: `401 { error: { code, message } }`. |
| `E_AUTHORIZATION_FAILURE` | 403 | `new E_AUTHORIZATION_FAILURE()` | Raised by a route's `.role()` / `.permission()`. Message: `Access denied`, as `@c9up/warden` raises it. Renders itself (`handle`) as warden's does: `{ errors: [{ message }] }` for JSON, the message as text for HTML, a denied form redirected back with a flash. The roles and permissions asked for are not sent. |
| `E_VALIDATION_ERROR` | 422 | `new E_VALIDATION_ERROR(messages)` | Message `Validation failure`. Response body is `{ errors: messages }` directly (not wrapped). `messages: unknown[]` is whatever your validator emits. |
| `E_ROUTE_NOT_FOUND` | 404 | thrown internally when no route matches | Message `Cannot GET:/path`. Auto-emitted; you usually don't instantiate it. |
| `E_ROW_NOT_FOUND` | 404 | `new errors.E_ROW_NOT_FOUND(User)` (from `@c9up/atlas`) | Pair with a service-layer lookup that returns `null`. The model class is on `model`; the message stays `Row not found`, so what was searched for never reaches the client. |
| `E_UNKNOWN` | 500 | fallback for non-Exception throws caught by `ExceptionHandler` | Surfaces as a generic 500. |

## Usage

```ts
import { errors } from '@c9up/ream'

router.post('/orders', async ({ auth, request }) => {
  if (!auth.user) throw new errors.E_UNAUTHORIZED_ACCESS()
  if (!auth.user.roles.includes('staff')) {
    throw new errors.E_AUTHORIZATION_FAILURE()
  }
  const parsed = OrderValidator.validate(await request.body())
  if (!parsed.valid) throw new errors.E_VALIDATION_ERROR(parsed.errors)
  // …
})
```

## Self-handling vs the global `ExceptionHandler`

An exception that defines `handle(error, ctx)` bypasses the global handler: `E_HTTP_REQUEST_ABORTED` does, to send the body given to `response.abort()`. Your own subclasses can do the same:

```ts
class TenantSuspended extends Exception {
  static override status = 423
  static override code = 'E_TENANT_SUSPENDED'

  handle(_error: this, ctx: HttpContext): void {
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
4. Outside debug mode, shows the error's message only when it was written for clients: an error with a status below 500, or an error carrying `expose: true`. Everything else answers `An internal error occurred`, even when it carries a `code`: a driver error, a Node system error such as `ECONNREFUSED`, a plain `Error`, and an `Exception` of status 500. Being an `Exception` is not enough, because every package raises `Exception`s, status 500 by default, and their messages name hosts, paths and queries. The thrown error keeps its message for `report()`.

### Where the error is handled

The handler runs where the error is thrown, inside the middleware chain, not after the whole chain has unwound. The middleware around it then finish normally: the session middleware saves the session, so a `handle()` that flashes a message and redirects back works as expected, and a header set after `await next()` is added to the error response.

### Showing the message of a 5xx error

To show the message of a 5xx error to the client, set `expose = true` on it:

```ts
class ProviderDown extends Exception {
  static override status = 503
  static override code = 'E_PROVIDER_DOWN'
  expose = true
}

throw new ProviderDown('Payments are paused, retry in a few minutes')
```

Only do it for a message you wrote for clients: it is shown as is.

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

## Error handling

Use framework exceptions (`E_UNAUTHORIZED_ACCESS`, `E_AUTHORIZATION_FAILURE`, etc.) and a central handler.

```ts
import { errors } from '@c9up/ream'

if (!token) {
  throw new errors.E_UNAUTHORIZED_ACCESS('Bearer token required')
}
```

Rules:

- never return raw internal errors to clients,
- log actionable context without leaking secrets,
- map business errors to coherent HTTP status codes.

## `prettyPrintError(error)`

Formats a boot-time error for the terminal and writes it to `stderr`. A framework error (one of `errors`) prints in a box with its code, its advice (`help`) and the link to its documentation. Any other error prints the message and stack trace.

```typescript
.start()
.catch((error) => {
  process.exitCode = 1
  prettyPrintError(error)
})
```

## Catching an error by its code

Every error of the framework and of its packages is an `Exception` class named
by its code, in the package's `errors`. Test the class, or the code:

```typescript
import { errors } from '@c9up/ream'
import consoleApp from '@c9up/ream/services/console'

try {
  await consoleApp.exec('provision')
} catch (error) {
  if (
    error instanceof errors.E_CONSOLE_MISSING_FLAG ||
    error instanceof errors.E_CONSOLE_MISSING_ARGUMENT
  ) {
    console.error(error.help)
    return
  }
  throw error
}
```

`instanceof` narrows `error`, so `help` and the error's own fields are typed.
`error.code` is the same string as the class name: test it where you do not want
to import the package that raised the error.

## See also
- [Error catalog](/en/reference/errors) — Container, router, pipeline, photon error codes
- [Middleware](/en/guides/basics/middleware) — Where most exceptions actually originate
- [Quick Start](/en/start/tutorial) — End-to-end example with auth guard rejections
