# Session guard

This guide covers the session guard:

- login() / logout() / verifyWithContext()
- Revoking a sign-in — `blacklist`
- Remember me
- Knowing HOW the user got here

## SessionStrategy

`SessionStrategy` is the built-in cookie/session-based strategy. It stores the authenticated user's id in a session store after the caller has verified the password — Warden itself never hashes or verifies passwords.

```typescript
import { SessionStrategy } from '@c9up/warden'

const strategy = new SessionStrategy({
  // Optional: session key (default: 'auth_user_id')
  sessionKey: 'auth_user_id',

  // Called by verifyWithContext() — load user by id stored in session.
  // `id` is `string | number` (the type stored at login time).
  findUser: async (id: string | number) => {
    const user = await db.users.findById(String(id))
    if (!user) return null
    return { id: user.id, roles: user.roles, permissions: user.permissions }
  },
})
```

Configure it from `config/auth.ts` with a `session` block — supply `findUser` and the `WardenProvider` wires the strategy under the name `session`:

```typescript
// config/auth.ts
export default {
  defaultStrategy: 'session',          // session-first (web app)
  session: {
    findUser: async (id) => /* resolve your user by the stored id */ null,
  },
}
```

Without a `session` block the strategy is unregistered and `@Guard('session')` throws.

### login() / logout() / verifyWithContext()

`SessionStrategy.authenticate()` is a deliberate no-op — it throws to make the contract explicit. Call `login(user, session)` after you've verified the password yourself, then `verifyWithContext(unused, { session })` on subsequent requests. `login()` **rotates the session id** (`session.regenerate()`) before storing the user id — the standard session-fixation defence (CWE-384):

```typescript
import { Hash } from '@c9up/sigil'
import { authFinder } from '@c9up/warden'

const hash = new Hash({
  default: 'argon2',
  drivers: { argon2: { driver: 'argon2' } },
})
const users = authFinder({
  hash,
  findForAuth: (email) => db.users.findByEmail(email),
  passwordColumnName: 'passwordHash',
})

// Login flow — the caller verifies the password, Warden mints the session.
// Throws E_INVALID_CREDENTIALS (400) for an unknown email and a wrong password
// alike, after the same hash work.
const user = await users.verifyCredentials(email, password)

await strategy.login({ id: user.id, roles: user.roles }, ctx.session)

// Subsequent requests
const result = await strategy.verifyWithContext('unused', { session: ctx.session })
if (result.authenticated && result.user) {
  const { user } = result
  ctx.auth = { isAuthenticated: true, user, roles: user.roles ?? [], permissions: user.permissions ?? [] }
}

// Logout
await strategy.logout(ctx.session)
```

`logout()` forgets the user id and **rotates the session id** too. A request
that was still running when the user logged out holds the old id; with its
entry gone, Ream's session store writes nothing back, so that request cannot
sign the user in again, and neither can a copy of the old id.

### Revoking a sign-in — `blacklist`

Under the cookie session store the session lives in the browser, and the
server has nothing to delete at logout: a cookie copied before it, or re-sent
by a request running across it, would still be signed in. Give the guard a
`blacklist` — the same `TokenBlacklist` `JwtStrategy` revokes tokens with:

```typescript
import { RedisBlacklistDriver, SessionStrategy, TokenBlacklist } from '@c9up/warden'

new SessionStrategy({
  findUser,
  blacklist: new TokenBlacklist(new RedisBlacklistDriver(client)),
})
```

Without one, `login()` on such a session throws `E_WARDEN_INVALID_CONFIG`: an
application on the cookie store finds out at its first sign-in, not after a
stolen cookie.

Every sign-in then gets an id, stored in the session beside the user id
(`auth_user_id_sid`). `logout()` lists it for twice the session's lifetime, so
the listing outlives every copy of the cookie: Ream counts a re-issued cookie's
lifetime from when its request read the session, so even a request running
across the logout hands back nothing that lives past one lifetime after it. A session that carries a listed
id is signed out, and the keys are forgotten so the cookie sent back carries
nothing. Another sign-in of the same user, on another device, is not affected.

Once a `blacklist` is set, a session with no sign-in id is refused, as
`JwtStrategy` refuses a token with no `jti`: it could never be revoked. Users
signed in before the change sign in again once.

The lifetime is read from Ream's session (`session.config.ttl`). Another
session store can pass `sessionAge` (seconds) instead; the default is two hours.
`MemoryBlacklistDriver` works for one process; several instances need a shared
store such as `RedisBlacklistDriver`.

The `SessionStore` interface is intentionally minimal — `get(key)`, `put(key, value)`, `forget(key)`, `regenerate()`. The method names match Ream's **`Session` API** (`put`, not `set`), so Ream's `Session` — exposed on `ctx.session` by `SessionMiddleware` — satisfies the contract structurally with no adapter. (If you hand-rolled a `SessionStore` against the old `set()` name, rename it to `put()`.)

> **`ctx.session`.** The request session lives on `ctx.session`, populated by Ream's `SessionMiddleware`. Register that middleware **before** the auth middleware so `ctx.session` is set when the session strategy resolves the user.

### Remember me

"Keep me signed in" — a credential that outlives the session cookie. Wiring
a token driver **is** the opt-in:

```ts
import { MemoryRememberMeTokenDriver, SessionStrategy } from '@c9up/warden'

new SessionStrategy({
  findUser: (id) => User.find(id),
  rememberMeTokens: new MemoryRememberMeTokenDriver(), // your own driver in production
  rememberMeAge: 63_072_000,                           // seconds; 2 years, the default
  rememberMeCookieName: 'remember_web',                // `remember_<guard>`
  rememberMeCookie: { sameSite: 'strict' },            // optional overrides, see below
})
```

`ctx.auth.use('web').login(user, true)` writes the cookie for you, encrypted,
`HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` in production — a credential
that lives for years never leaves over plain HTTP or rides a cross-site request.
`rememberMeCookie` overrides `path`, `domain`, `sameSite` and `secure`; `HttpOnly`
stays. `rememberMeAge` must be a positive whole number of seconds.

At login, mint one and set it as an **httpOnly** cookie; on a request without a
session, try it; at logout, revoke it:

```ts
const value = await guard.issueRememberMeToken(user)
if (value) response.cookie(guard.rememberMeCookieName, value, { httpOnly: true, maxAge: 63_072_000 })

const revived = await guard.authenticateViaRememberMeToken(request.cookie(guard.rememberMeCookieName))
if (revived) {
  await guard.login(revived.user, session)
  // The token was RECYCLED — the browser must take the new value.
  response.cookie(guard.rememberMeCookieName, revived.cookieValue, { httpOnly: true })
}

await guard.revokeRememberMeToken(request.cookie(guard.rememberMeCookieName))
```

What makes this safe, and why each part matters:

- **Only `sha256(secret)` is stored.** A dump of the tokens table does not let
  anyone sign in — the secret exists solely in the user's cookie.
- **Every use recycles the secret, once.** The value the browser held stops
  working the moment it is used, so a stolen cookie dies as soon as the real
  user comes back. The rotation is a compare-and-set: of two requests presenting
  the same cookie at the same time, only one gets through. That is why the
  caller must write the returned `cookieValue`.
- **The user is re-read, never trusted from the token.** A token outlives the
  row it points at; a deleted or disabled account cannot walk back in.
- **Hashes are compared in constant time**, and a bad secret, an unknown
  identifier and an expired token are indistinguishable from the outside — a
  distinguishable "unknown identifier" would let an attacker enumerate them.
- **One token per login**, so signing out on one device leaves the others alone.
- **Logging out ends it.** `ctx.auth.use('web').logout()` clears the cookie and
  deletes the stored token the cookie names, whatever its secret — a cookie
  whose secret no longer matches is one a stolen copy already recycled. The
  cookie is cleared first, so a store that fails to delete the row never leaves
  the browser holding the credential; that failure is still thrown, once the
  session has ended.

`MemoryRememberMeTokenDriver` is for tests and single-process apps; a cluster
needs a shared store implementing `RememberMeTokenDriver` (`create` / `find` /
`update` / `delete` / `deleteAllForUser`). `update(identifier, previousHash,
hash, expiresAt)` must replace the row **only if its hash is still
`previousHash`** — `UPDATE … WHERE identifier = ? AND hash = ?` — and return
whether it did.

### Knowing HOW the user got here

```ts
guard.viaRemember           // revived from the cookie, not from a password
guard.attemptedViaRemember  // a token was tried, whether or not it worked
guard.isLoggedOut           // logout() ran on this guard
guard.sessionKeyName        // 'auth_user_id'
guard.rememberMeKeyName     // 'remember_web'
```

`viaRemember` is the one that matters. A session restored from a cookie used to
look exactly like one where the user had just typed their password, so an app
could not demand it again before something sensitive:

```ts
if (guard.viaRemember) {
  return response.redirect().toRoute('auth.confirm_password')
}
await deleteAccount(user)
```

A real login clears the flag, so the prompt stops firing once the password has
actually been given.

#### The `RememberMeToken` class

For code that handles tokens directly — a custom driver, a migration, an admin
screen — the `RememberMeToken` class is exported alongside the functions the guard uses.
Both sit on the same encoding and the same hashing, so they cannot disagree
about what a token is:

```ts
import { RememberMeToken, Secret } from '@c9up/warden'

const decoded = RememberMeToken.decode(cookieValue)   // null when malformed
decoded?.identifier                                    // the public half
decoded?.secret                                        // Secret<string>

const { secret, hash } = RememberMeToken.seed()
const transient = RememberMeToken.createTransientToken(user.id, 40, 63_072_000)

const token = RememberMeToken.fromStored(row)
token.isExpired()
token.verify(decoded.secret)                           // constant-time
token.toStored()                                       // back to the driver shape
```

Secrets come back wrapped in `Secret`, so one cannot
reach a log by being interpolated into a string:

```ts
`${decoded.secret}`          // '[redacted]'
JSON.stringify(decoded)      // {"secret":"[redacted]", ...}
decoded.secret.release()     // the real value, deliberately
```

`expiresIn` takes either seconds or a duration string — `3600`, `'1h'`,
`'7 days'`. A
bare number is always **seconds**, as everywhere else in this module. The
seconds-only `expiresInSeconds` warden shipped first still works; when a config
sets both, `expiresIn` wins. A lifetime is a whole number of seconds: `'500ms'`
is refused, since a token's `exp` cannot hold a fraction.

::: tip Why warden has its own `Secret`
warden ships its own `Secret` rather than importing `@c9up/ream`: it has no
runtime dependencies and a standalone entry point, so a peer import would break
the framework-free mode.
:::

---
