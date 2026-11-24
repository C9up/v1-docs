# Verifying credentials

This guide covers checking credentials safely:

- Timing-safe credential check — `authFinder`
- Password Hashing
- Throttling sign-in — AuthRateLimiter

## Timing-safe credential check — `authFinder`

A sign-in that returns early for an unknown account answers in microseconds; one
that verifies a password hash answers in ~100 ms. That difference alone tells an
anonymous caller which emails are registered. `authFinder` closes it: an unknown
uid runs the same verification a known one does, and every failure throws the
same `E_INVALID_CREDENTIALS` (400).

```ts
import { Hash } from '@c9up/sigil'
import { authFinder } from '@c9up/warden'

const users = authFinder({
  hash: new Hash({ default: 'argon2', drivers: { argon2: { driver: 'argon2' } } }),
  findForAuth: (uid) => User.findBy('email', uid),   // null for none
  passwordColumnName: 'password',                     // the default
})

const user = await users.verifyCredentials(email, password) // or throws E_INVALID_CREDENTIALS
await users.verifyPassword(user, currentPassword)           // boolean
```

- An empty uid or password fails at once — it says nothing about any account.
- An unknown uid verifies the password against a decoy hash, made once by the
  same hasher: the call a real account costs. Then it fails.
- A row without a password hash (an account that signs in through SSO) is a
  failed credential, after the same verification — not a crash that would mark
  the account as existing.
- A password the hasher refuses is a wrong password, on the three branches
  alike: same error, same cost. sigil refuses a password over 1024 bytes, 72
  with bcrypt. Check the length when the password is set (registration,
  password change), not at sign-in.
- A hasher that cannot hash at all (its native binary is missing) is not a
  wrong password: its own error is thrown.

Hand `users.verifyCredentials` to a guard as it is, or wrap it to shape the
payload: a guard reads a thrown `E_INVALID_CREDENTIALS` as a rejection.

---

## Password Hashing

**Warden does not hash passwords.** Use [`@c9up/sigil`](/en/guides/security/hashing) — the canonical password-hashing service for the Ream ecosystem.

| Concern | Where it lives |
|---|---|
| `Hash.make(password)` / `Hash.verify(hash, password)` | `@c9up/sigil` (Rust NAPI: argon2id, bcrypt, scrypt) |
| Session storage after a successful login | `@c9up/warden` `SessionStrategy.login(user, session)` |
| JWT signing / verification | `@c9up/warden` `JwtStrategy` (HMAC-SHA256 via warden NAPI) |
| HMAC + random + constant-time-eq stdlib primitives | `@c9up/ream/crypto` |

The split is deliberate (story 40.1, architecture.md "Hashing authority"). `SessionStrategy.authenticate()` throws on purpose so the design boundary is unmissable: callers verify credentials with Sigil, Warden tracks the session.

The four `NativeWarden.hashPassword*` interface methods (`hashPasswordArgon2`, `verifyPasswordArgon2`, `hashPasswordBcrypt`, `verifyPasswordBcrypt`) were removed from the TS surface in story 40.3 — they were dead code with zero callers in the workspace. The underlying Rust crate (`warden-engine` `argon2_hash` + `bcrypt_hash`) and the four NAPI bindings still ship in the prebuilt `.node` artifact; their cleanup is queued for a follow-up hardening story.

---

## Throttling sign-in — AuthRateLimiter

Count a sign-in attempt **before** checking the password, under the client's IP
and the identifier it tries. On success, clear the identifier's key only:

```ts
import { AuthRateLimiter, RedisAttemptStore } from '@c9up/warden'

const limiter = new AuthRateLimiter({
  maxAttempts: 5,
  windowSeconds: 900,
  // store: new RedisAttemptStore(redis),   // shared across instances
})

const keys = AuthRateLimiter.loginKeys(ctx.request.ip(), email)
const decision = await limiter.attempt(...keys)
if (!decision.allowed) return response.status(429).json({ retryAfter: decision.retryAfterSeconds })
const user = await verify(email, password)
if (user) await limiter.clear(AuthRateLimiter.identifierKey(email))
```

The address's key is not cleared on success: it runs to the end of its window.
If a success cleared it, a client that owns one account could try a password on
a few other accounts, sign in to its own, and start again with a fresh count.
To unblock an address by hand, clear `AuthRateLimiter.ipKey(ip)`.

Counting first is what holds against a burst: each attempt is one atomic
increment, so twenty concurrent guesses cannot all read "not blocked yet". The
identifier is normalized (case, surrounding spaces) and keyed by its SHA-256
digest, so a key has the same size whatever the client posts. `maxAttempts` and
`windowSeconds` must be positive whole numbers. `MfaManager` uses the same
limiter for its lockout.

The keys are counted in order — the IP first — and the first key over the limit
stops the attempt: the keys after it are not counted. An address already
throttled therefore cannot create a window per identifier it invents; it
touches at most `maxAttempts` identifiers per window.

The default `MemoryAttemptStore` counts per process and is bounded (100 000
keys). When it is full and every window is still live, a **new** key is refused
— its attempt is reported over the limit — rather than a live counter dropped to
make room: the keys are chosen by whoever is guessing, and evicting the oldest
would let a flood of invented identifiers erase a victim's lockout. During such
a flood, first attempts under new keys wait until windows expire. In
production, use `RedisAttemptStore`: it is shared by every instance and has no
such bound. Given a resolver (a quasar connection name), it — like
`RedisBlacklistDriver` and `RedisTotpReplayGuard` — drops a connection quasar
retired once its retry strategy gave up (status `end`) and asks again on the
next call, so logins, revocation checks and TOTP codes recover by themselves
once Redis is back.

---
