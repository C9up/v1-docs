# JWT guard

This guide covers the JWT guard:

- JwtStrategy
- JWT blacklist on Redis

## JwtStrategy

`JwtStrategy` is the built-in JWT implementation using HMAC-SHA256 (HS256). It handles token signing, verification, and user lookup.

### Configuration

```typescript
import { authFinder, JwtStrategy } from '@c9up/warden'
import env from '#start/env.js'

const users = authFinder({
  hash, // a @c9up/sigil Hash
  findForAuth: (email) => db.users.findByEmail(email),
  passwordColumnName: 'passwordHash',
})

const jwt = new JwtStrategy({
  // Required: minimum 32 characters, throws at construction if shorter
  secret: env.get('JWT_SECRET'),

  // Optional: token lifetime in seconds (default: 3600)
  expiresIn: '2h',

  // Called by authenticate() — verify email/password. Built on authFinder (see
  // "Timing-safe credential check"): an unknown email costs the same hash as a
  // wrong password, and both throw E_INVALID_CREDENTIALS, which the guard reads
  // as a rejection.
  verifyCredentials: async (email, password) => {
    const user = await users.verifyCredentials(email, password)
    return { id: user.id, roles: user.roles, permissions: user.permissions }
  },

  // Called by verify() — load user by ID from the token's `sub` claim
  findUser: async (id) => {
    const user = await db.users.findById(id)
    if (!user) return null
    return { id: user.id, roles: user.roles, permissions: user.permissions }
  },
})
```

### signToken()

Sign a token for an existing `UserPayload` without going through `authenticate()`. Useful for impersonation, refresh tokens, or test helpers.

```typescript
const token = jwt.signToken({
  id: 'user-1',
  roles: ['admin'],
  permissions: ['posts.create'],
})
// 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Token Payload

The JWT payload always includes:

| Claim | Description |
|---|---|
| `sub` | User ID (`user.id`) |
| `roles` | Role array (optional) |
| `permissions` | Permission array (optional) |
| `iat` | Issued-at timestamp (Unix seconds) |
| `exp` | Expiry timestamp (Unix seconds) |

### generateJwtSecret()

Generate a cryptographically random 48-byte secret encoded as base64url — safe to store in `.env`:

```typescript
import { generateJwtSecret } from '@c9up/warden'

console.log(generateJwtSecret())
// 'wX3hK2qP9rZmYnLsVbTuCjEoAiDfGkNpQeRwXyZa1B2C3...'
```

---

## JWT blacklist on Redis

Token revocation can live on a [Quasar](/en/guides/database/redis) connection rather than in memory:

```ts
import { RedisBlacklistDriver, quasarConnection } from '@c9up/warden'

new RedisBlacklistDriver(quasarConnection())
```

The connection resolves on the first revocation check, so an app whose blacklist is never consulted opens no socket for it. Passing a client directly still works: `@c9up/quasar` is an **optional** peer.

### Surviving a Redis outage — `ResilientBlacklistDriver`

```ts
import { MemoryBlacklistDriver, RedisBlacklistDriver, ResilientBlacklistDriver, TokenBlacklist } from '@c9up/warden'

new TokenBlacklist(new ResilientBlacklistDriver(
  new RedisBlacklistDriver(quasarConnection()),
  new MemoryBlacklistDriver(),          // the default
  { onDegrade: (event) => log.warn(event) },
))
```

A revocation is written to both stores, always, so this instance knows what it
revoked without a round trip. A check asks the local record first, then Redis.
When Redis cannot answer and the local record does not know the credential, the
check **fails closed**: the error is thrown, and the guard treats it as a crashed
strategy — a 500, or a guest under silent auth — never as "not revoked". The
same blacklist backs session logouts and JWTs issued for days, so answering
"not revoked" during an outage would accept every sign-in revoked elsewhere.

`{ failOpen: true }` lets such credentials through instead. It suits a
deployment whose only consumer is a JWT guard with a short `expiresIn`, where
staying available through an outage is worth more than a revocation missed for
at most one token lifetime. `onDegrade` is called on every fallback; the default
reports the first failure of an operation, then a periodic count.
