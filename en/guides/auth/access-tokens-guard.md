# Access tokens guard

This guide covers the access tokens guard:

- The guard
- Abilities are not permissions
- Managing a user's tokens

## Access tokens

Opaque bearer tokens for APIs, command-line tools and mobile apps. A token value
looks like `oat_<identifier>.<secret>`. Only `sha256(secret)` is stored, the
comparison is constant-time, and the secret ends with a CRC-32 checksum so a
secret scanner can recognise a leaked token.

```ts
import { AccessTokensProvider, MemoryAccessTokenStore } from '@c9up/warden'
import { apiKeyGuard, defineConfig } from '@c9up/warden/config'

// Implement AccessTokenStore over your own table in production.
const tokens = new AccessTokensProvider({
  store: new MemoryAccessTokenStore(),
  expiresIn: '30 days',               // default lifetime; absent, tokens never expire
})

export default defineConfig({
  default: 'api',
  guards: { api: apiKeyGuard({ tokens, findUser: (id) => User.find(id) }) },
})
```

Minting returns the only object that ever carries the value — hand it to the
client right away, nothing stored can rebuild it:

```ts
const token = await tokens.create(user, ['orders:read'], { name: 'CI', expiresIn: '7 days' })
token.value.release()   // "oat_…"
token.toJSON()          // { type: 'bearer', name, token, abilities, lastUsedAt, expiresAt }
```

`abilities` defaults to `['*']`, every ability. `AccessTokensProvider` takes
`store`, `prefix` (default `oat_`; non-empty, no `.`), `type` (default
`auth_token`, so one table can hold several kinds of token),
`tokenSecretLength` (default 40, at least 32: a shorter secret is guessable) and
`expiresIn` (seconds or a duration string). A value that does not fit is refused
at construction. The identifier is 128 random bits rather than a row id, so a
token cannot be aimed at by enumerating rows.

### The guard

`apiKeyGuard({ tokens, findUser })` builds an `ApiKeyStrategy`, registered as
the `access_tokens` driver. It reads `Authorization: Bearer <token>` or the
`x-api-key` header (`headerName` changes it), and verifies the value through the
provider: a value that is not one of ours, an unknown identifier, a token of
another type, a wrong secret and an expired token are all the same refusal.
Only a verified token has its `lastUsedAt` recorded. The user is then reloaded
through `findUser` on **every** request, so a token whose account was deleted or
disabled stops working the moment `findUser` answers `null`.

A config that still passes `findByKey` instead of `tokens` is refused when the
guard is built, not at the first request.

### Abilities are not permissions

The authenticated user carries the token as `user.currentAccessToken`:

```ts
const token = ctx.auth.user.currentAccessToken
token.abilities               // ['orders:read']
token.allows('orders:read')   // true — '*' allows everything
token.denies('orders:write')  // true
token.authorize('orders:write') // throws E_UNAUTHORIZED_ACCESS
token.isExpired()
token.lastUsedAt
```

A token's abilities are **never** merged into `user.permissions`, which holds
the user's own permissions. What a request made with a token may do is what the
user may do **and** what the token allows: an ability that shares a
permission's name grants nothing the user lacks, and a token restricted to a few
abilities does not carry every permission of its user. `@Permission(...)`,
`hasPermission`, `hasAllPermissions`, `resolvePermissions` and a policy's
`this.permissions` enforce exactly that intersection;
`tokenAllows(user, permission)` is the token half on its own. A user signed in
through a session or a JWT has no `currentAccessToken` and is checked against
their own permissions only.

### Managing a user's tokens

```ts
await tokens.all(user)                 // most recently used first, never-used last
await tokens.find(user, identifier)    // null unless it is this user's
await tokens.delete(user, identifier)  // 0 or 1
await tokens.deleteAll(user)
await tokens.invalidate(new Secret(presentedValue)) // revoke from the value itself
guard.invalidateToken(presentedValue)                // the same, from the strategy

// Per request, through the guard the request authenticated with:
const token = await ctx.auth.use('api').createToken(user, ['orders:read'])
token.value.release()                                // hand it to the client now
await ctx.auth.use('api').invalidateToken()          // sign-out: revokes the token this request came with
```

`ctx.auth.use('api').invalidateToken()` reads the token from the request (the
Bearer token, or the guard's API-key header) and throws `E_UNAUTHORIZED_ACCESS`
when there is none. Calling either on a guard that issues no access tokens throws
`E_WARDEN_STRATEGY_CANNOT_ISSUE`.

`find` and `delete` only touch a token that belongs to the user named.
`invalidate` revokes only when the secret matches: an identifier alone — read
in a log line or a token listing — is not enough to revoke someone else's
token.

`AccessTokenStore` is the table: `create`, `find(identifier)`,
`touch(identifier, lastUsedAt)`, `delete(identifier)` (answers whether a row
went) and `listForUser(userId)`. Timestamps are epoch milliseconds and
`expiresAt` is `null` for a token that never expires. `MemoryAccessTokenStore`
is for tests and single-process tools. An application with its own token scheme
implements `AccessTokensProviderContract` (`create`, `verify`, `invalidate`)
instead of using `AccessTokensProvider`.

---
