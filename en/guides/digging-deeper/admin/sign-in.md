# Sign-in, CSRF and audit

This guide covers signing in, CSRF and the audit trail:

- Sign-in, session cookie and logout
- CSRF enforcement (fail-closed)
- Audit trail

## Sign-in, session cookie and logout

Sign-in, the admin gate and logout go through one Warden guard: `station.guard`,
or the auth manager's default guard when it is unset. Station keeps the bearer
token the guard issues in its cookie, so the guard must issue one (Warden's JWT
guard): boot refuses an unknown guard name, or a guard without `signToken` such
as Warden's session guard, with a message pointing at `station.guard`.

```ts
export default defineConfig({
  guard: "jwt", // the application's default guard can stay `web` (session)
});
```

### Refused sign-ins

A refused `POST /admin/login` renders the sign-in page with a fixed message —
never the auth backend's own error text. A JSON caller (`Accept:
application/json`) or an XHR one (`X-Requested-With: XMLHttpRequest`) gets
`{ error, code }` instead:

| Status | `code` | When |
| ------ | ------ | ---- |
| `400`  | `E_STATION_LOGIN_CREDENTIALS_REQUIRED` | The email or the password is empty. |
| `401`  | `E_STATION_INVALID_CREDENTIALS` | Wrong credentials. |
| `429`  | `E_STATION_TOO_MANY_LOGIN_ATTEMPTS` | The rate limit refused the attempt; `Retry-After` is set. |
| `503`  | `E_STATION_LOGIN_UNAVAILABLE` | The limiter failed, or the auth backend crashed (logged for the operator, no `login_failed` recorded). |

A write refused for want of a verified CSRF token answers a JSON caller with
`E_STATION_CSRF_REQUIRED` (see [CSRF enforcement](/en/guides/digging-deeper/admin/sign-in#csrf-enforcement-fail-closed)).

### Brute-force protection

`POST /admin/login` counts every attempt under the client IP and under the
submitted email (lower-cased, keyed by its SHA-256 digest) **before** checking
the password. The sixth attempt in 15 minutes on either key is refused with
`429` and a `Retry-After` header, without reaching the credential check. A
successful sign-in clears the email's counter only: the IP's keeps counting
until its window ends, so a client that owns one admin account cannot reset
its limit by signing in between guesses at other accounts. A limiter that
fails (a store outage) refuses the attempt with `503`.

The IP is counted first, and an attempt refused on it does not count the email:
an address already throttled cannot fill the store with invented identifiers
and lock every other administrator out. An email longer than 254 characters
(RFC 5321) is refused with `400` before it reaches the limiter.

The counters live in the process's memory by default. In a cluster, pass a
shared limiter — Warden's `AuthRateLimiter` over a `RedisAttemptStore` has the
expected shape and uses the same keys:

```ts
import { AuthRateLimiter, RedisAttemptStore } from "@c9up/warden";

export default defineConfig({
  loginRateLimit: {
    limiter: new AuthRateLimiter({ store: new RedisAttemptStore(redis) }),
  },
  // or tune the in-memory one: { maxAttempts: 10, windowSeconds: 600 }
});
```

`station.middleware` attaches named router middleware to every admin route,
for an application that applies its own throttling or headers.

### Session cookie and logout

The auth cookie is `HttpOnly`, `SameSite=Lax`, scoped to `/admin` (the token
is never sent to the rest of the application) and lives as long as the browser
session. It is `Secure` everywhere except a `development`/`test` process served
over plain HTTP; `station.cookieSecure` forces the flag either way.

Logout revokes the token it carried through the auth guard's `revoke(token)`
before clearing the cookie, so a copy taken earlier is refused afterwards.
With Warden's JWT guard this needs a `blacklist`; without one, Station warns
once that logged-out tokens stay valid until they expire.

The sign-in page only displays messages Station produced; it never reads an
error message from the query string.

## CSRF enforcement (fail-closed)

Every admin **write** route (`create`, `update`, `destroy`, plus login and
logout) requires an active, **verified** CSRF token. Station enforces this by
reading `ctx.request.csrfProtected` — the trustworthy signal published by the
host's [`@c9up/blackhole`](/en/guides/security/securing-ssr) middleware, which is `true` only when
CSRF was enabled, the method guarded, the route not excepted, and the token
validated. A request that is not CSRF-verified is refused with `403` **before**
any authorization or database work — a forged request never touches the repo.

Station hand-rolls **no** CSRF logic of its own: inker's `{{ csrfField() }}`
emits the token field, blackhole verifies the double-submit, ream carries the
`csrfProtected` signal, and Station enforces it. To wire it, register the
blackhole middleware with `csrf: true` in `start/kernel.ts` and keep `/admin/*`
out of `csrf.exceptRoutes` (the default host already does both). If the check is
missing — middleware unwired, `csrf: false`, or `/admin/*` excepted — writes
return `403` and Station logs one diagnostic pointing at the misconfiguration.

## Audit trail

Each resource's `audit` sink receives an event after every successful write:
`action`, `resource`, `recordId`, `userId`, the `before`/`after` images, the
client `ip`, `userAgent` and `requestId`, and `at`.

Secret column values (as defined in [Columns](/en/guides/digging-deeper/admin/#columns-what-each-view-shows-and-what-a-write-may-set)),
and those of fields with `inputType: "password"`, are replaced with `"[redacted]"` in `before` and `after`. An edit that changes
one still says so: `redactedChanges` lists the secret columns whose value
changed. `defineResource({ auditSecrets: true })` hands the raw values to the
sink instead.

`station.audit` receives the security events of the admin surface:

| `action`          | When                                                  |
| ----------------- | ----------------------------------------------------- |
| `login`           | A successful sign-in (`userId`, `identifier`).        |
| `login_failed`    | Wrong credentials (`identifier`).                     |
| `login_throttled` | A sign-in refused by the rate limit (`identifier`).   |
| `logout`          | A logout (`userId`).                                  |
| `denied`          | A missing role or permission (`permission`, and `resource` / `resourceAction` for an action). |
| `csrf_denied`     | A write refused because CSRF was not verified.        |

Each carries `path`, `ip`, `userAgent`, `requestId` and `at`. A sink that throws
is logged and never changes the response.

```ts
export default defineConfig({
  audit: (event) => logger.info({ event }, "admin security event"),
});
```
