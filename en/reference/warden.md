# warden

This guide covers the warden types, events and error codes:

- Types
- Auth events
- Error Codes

## Types

```typescript
interface AuthStrategy {
  name: string
  authenticate(credentials: Record<string, unknown>): Promise<AuthResult>
  verify(token: string): Promise<AuthResult>
}

interface AuthResult {
  authenticated: boolean
  user?: UserPayload
  error?: string
}

interface UserPayload {
  id: string
  roles?: string[]
  permissions?: string[]                    // the user's own, never widened by a token
  currentAccessToken?: CurrentAccessToken   // set by a token guard
  [key: string]: unknown
}

interface CurrentAccessToken {
  readonly abilities: readonly string[]
  allows(ability: string): boolean
  denies(ability: string): boolean
  authorize(ability: string): void
}

interface AuthConfig {
  defaultStrategy: string
  strategies: Record<string, AuthStrategy>
}

interface JwtStrategyConfig {
  secret: string
  expiresIn?: number | string
  expiresInSeconds?: number
  verifyCredentials: (email: string, password: string) => Promise<UserPayload | null>
  findUser: (id: string) => Promise<UserPayload | null>
}
```

---

### Checking without throwing

`authenticate()` throws; `check()` answers. The same pair exists for a list of
guards:

```ts
const user = await auth.authenticate()  // the user, or throws E_UNAUTHORIZED_ACCESS
await auth.check()                      // true | false

const sameUser = await auth.authenticateUsing(['web', 'api'])
await auth.checkUsing(['web', 'api'])   // the non-throwing sibling
```

### One guard of the request — `auth.use()`

`auth.use(name)` is a guard of this request; `auth.use()` with no name is the
default guard, which `auth.defaultGuard` names. Each guard answers the same
questions as the authenticator, for itself:

```ts
const web = ctx.auth.use()              // the default guard
ctx.auth.defaultGuard                   // 'web'

await web.authenticate()                // the user, or throws E_UNAUTHORIZED_ACCESS
await web.check()                       // true | false
web.getUserOrFail()                     // the user, or throws E_UNAUTHORIZED_ACCESS
web.authenticationAttempted             // whether this guard was tried this request
await web.authenticateAsClient(user)    // what a test client sends (the strategy's own arguments)

await ctx.auth.use('api').createToken(user, ['orders:read'])
await ctx.auth.use('api').invalidateToken()
```

`createToken` and `invalidateToken` exist on an access-tokens guard only; see
**Managing a user's tokens**.

A handler branching on "is anyone signed in through either of these" had to
write the try/catch itself. A credential rejection is an answer; a **crashed**
strategy still propagates rather than being reported as "not signed in".

`auth.createAuthenticator(ctx)` builds what the HTTP middleware builds per
request, for a console command or a job that has no request around it.

## Auth events

Wire an emitter and every authentication decision is announced. The event name
is namespaced by the guard's **driver** — so an app auditing
session logins is not also told about bearer-token traffic under the same name:

| Driver | Event prefix |
| --- | --- |
| `session` | `session_auth:*` |
| `access_tokens` / `api-key` | `access_tokens_auth:*` |
| `basic_auth` | `basic_auth:*` |
| `jwt` | `jwt_auth:*` |

```ts
auth.setEmitter(emitter)

emitter.on('session_auth:login_succeeded', ({ guardName, user }) => audit(user))
emitter.on('jwt_auth:authentication_failed', ({ guardName, error }) => alert(error))
```

The prefix comes from the strategy's driver, not the guard's config key: a guard
called `web` running a `SessionStrategy` is still the session driver.
`authEventPrefix(driverName)` is exported if you need to build a name
yourself. `jwt` becomes `jwt_auth`.

Events: `login_attempted`, `login_succeeded`, `logged_out` (stateful guards
only), plus `authentication_attempted`, `authentication_succeeded` and
`authentication_failed` on every guard. The success event is named after the
guard that actually answered, not the one asked for first.

A listener that throws never breaks a login — authentication is not an event
bus's business to veto.

## Error Codes

| Code | Thrown when |
|---|---|
| `E_WARDEN_NO_AUTH_CONFIG` | `WardenProvider` finds no guard and no driver block in `config/auth.ts` |
| `E_WARDEN_INVALID_CONFIG` | `defaultStrategy` is not present in `strategies`, or a strategy is configured unusably |
| `E_WARDEN_STRATEGY_NOT_FOUND` | `getStrategy()` or `verify()` called with an unregistered strategy name |

---
