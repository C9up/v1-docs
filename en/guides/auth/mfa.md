# Multi-factor authentication

This guide covers multi-factor authentication:

- MfaManager — enrollment lifecycle
- @RequireMfa — gating routes
- Email / SMS OTP and WebAuthn

## Multi-Factor Authentication (MFA)

Warden ships four MFA providers, all implemented on `node:crypto` with **zero third-party dependency** — WebAuthn included (the CBOR / COSE / attestation parsing is in-house). Every provider and the `MfaManager` take pluggable stores that default to in-memory; supply persistent stores (Atlas, KeyDB…) in production.

| Provider | Purpose |
|---|---|
| `TotpProvider` | RFC 6238 authenticator-app codes (Google Authenticator, 1Password…) |
| `BackupCodesProvider` | single-use recovery codes, salted-hashed at rest |
| `OtpProvider` | delivered email / SMS one-time codes (pluggable channel) |
| `WebauthnProvider` | passkeys / FIDO2 (no third-party WebAuthn library) |

### MfaManager — enrollment lifecycle

`MfaManager` orchestrates the stateful "enable 2FA" flow for TOTP + backup codes, with per-user brute-force protection on `verify()`.

```typescript
import { MfaManager, TotpProvider, BackupCodesProvider } from '@c9up/warden'

const mfa = new MfaManager({
  issuer: 'Fluveo',
  totp: new TotpProvider(),
  backupCodes: new BackupCodesProvider(),
  // store: new AtlasMfaFactorStore(db),   // persistent factors in production
  rateLimit: { maxAttempts: 5, windowSeconds: 900 }, // + store: new RedisAttemptStore(redis) on a cluster
})

// Did this request pass the step-up? Required to change the factors of an
// account that already has MFA; the first enrolment does not need it.
const stepUp = ctx.auth.user?.mfa === true

// 1. Enroll — render `uri` as a QR code (with @c9up/prism: `await qrcode.toString(uri)`)
const { factorId, uri } = await mfa.enrollTotp({ id: user.id, name: user.email }, { stepUp })
// 2. Confirm with a first code from the authenticator app
await mfa.confirmTotp(user.id, factorId, code, { stepUp }) // → true once confirmed
// 3. Recovery codes — display ONCE
const codes = await mfa.createBackupCodes(user.id, { stepUp })

// Sign-in step-up — a TOTP code OR a backup code, rate-limited per user
if (await mfa.verify(user.id, submitted)) {
  // JWT: a token that carries the step-up
  const token = auth.issueFor(user, 'jwt', { mfa: true })
  // session: record it on this session
  ctx.auth.use('web').markMfaVerified()
}
```

Status helpers: `isEnabled(userId)`, `listFactors(userId)` (never leaks secret material), `disableFactor(userId, factorId, { stepUp })`, `await isLocked(userId)`.

Once an account has a confirmed factor, `enrollTotp`, `confirmTotp`,
`createBackupCodes` and `disableFactor` need `{ stepUp: true }`, and throw
**403 `E_WARDEN_MFA_REQUIRED`** without it. Pass `ctx.auth.user.mfa === true`:
the guard sets it from the credential, so only a request that passed the
second factor can add, replace or remove one. Without this, someone who knows
only the password could sign in, generate new recovery codes or remove the
authenticator, and the second factor would protect nothing. Before the first
factor is confirmed there is nothing to step up with, so the first enrolment
works without it. A refused call changes nothing and spends no attempt.

Factor operations name the owner beside the factor id and refuse a factor that
belongs to someone else: a factor id travels through requests, and one leaked
through a log or a support tool must not let another account act on it.
`disableFactor` answers `true` when it removed the factor, `false` for an
unknown id or another user's factor, which is left in place. `confirmTotp`
answers `false` in the same case, and its attempts count against the same
lockout as `verify()`, so a first code cannot be guessed without limit.

Each code works once, even when two requests present it at the same instant:
the TOTP replay guard claims a code atomically (`claim(key, ttlMs)`, set-if-absent),
and a backup code is consumed by `MfaFactorStore.consumeBackupHash(factorId,
hash)`, which must remove the hash only if it is still there. An attempt is
counted **before** the code is checked, so a burst of concurrent guesses cannot
all reach the providers. On several instances, share the counts and the replay
guard: `rateLimit.store: new RedisAttemptStore(redis)` and
`new TotpProvider({ replayGuard: new RedisTotpReplayGuard(redis) })`. The numbers
are checked at construction: TOTP `digits` 6–8, `period` 1–3600 s, `window` 0–10;
backup-code `count` 1–100, `length` 8–64.

### @RequireMfa — gating routes

A route decorated with `@RequireMfa()` is reachable only when the credential the request came with completed an MFA step-up: a JWT signed with `{ mfa: true }`, or a session on which `markMfaVerified()` ran. Otherwise the request is refused with **403 `E_WARDEN_MFA_REQUIRED`**. Two gates enforce it, and either one is enough: Ream's route gate, on every route whose handler is a controller action, and Warden's auth middleware (`router.use([() => import('@c9up/warden/middleware')])`), which also authenticates the request. With the route gate alone, something must fill `ctx.auth` first: Warden's middleware, `@c9up/warden/silent-auth`, or your own auth middleware. `@RequireMfa()` without `@Guard` still requires an authenticated request: an anonymous one gets a 401. `user.mfa` is set by the guard from that credential, never from what `findUser` returns — an account with MFA *enabled* has not stepped up. A credential with no step-up notion — an access token, a Basic credential, a session revived from a remember-me cookie — always carries `mfa: false`, whatever the user row holds. A new sign-in and a logout clear the session's step-up.

```typescript
import { Guard, RequireMfa } from '@c9up/warden'

class TransferController {
  @Guard('jwt')
  @RequireMfa()
  async transfer() { /* only reachable after MFA step-up */ }
}
```

Register the manager via config so it lands in the container as `MfaManager` / `"mfa"`:

```typescript
// config/auth.ts
import { defineConfig } from '@c9up/warden/config'
export default defineConfig({ jwt: { /* … */ }, mfa: { manager: mfa } })
```

### Email / SMS OTP and WebAuthn

`OtpProvider` and `WebauthnProvider` are used directly — their flows are challenge / ceremony based, not an enrollment lifecycle:

```typescript
import { OtpProvider, WebauthnProvider } from '@c9up/warden'

// Delivered OTP — you supply the email/SMS channel
const otp = new OtpProvider({ channel: { send: (to, code) => mailer.send(to, code) } })
const { challengeId } = await otp.start(user.email)
await otp.verify(challengeId, user.email, submitted) // single-use, TTL + attempt budget

// Passkeys — attestation is trust-on-registration (request attestation: 'none')
const webauthn = new WebauthnProvider({ rpName: 'Fluveo', rpID: 'fluveo.ch', origin: 'https://fluveo.ch' })
const reg = await webauthn.startRegistration({ id: user.id, name: user.email })
// … browser ceremony … then:
await webauthn.finishRegistration(reg.state, user.id, browserResponse)
```

A code is bound to the recipient it was sent to. `verify()` takes that
recipient as the application knows it for the sign-in in progress — the
pending user's email, never a value read from the request. A challenge started
for another recipient answers `{ ok: false, reason: 'not_found' }` and stays
intact for its owner. Keep the `challengeId` on the server between the two
requests (in the session, or in a signed pending-sign-in token), next to the
pending user.

#### Writing your own challenge store

The default stores keep challenges in memory, which is right for one process
and wrong for several: a code minted by one instance cannot be verified by
another. A shared store is a Redis or SQL implementation of
`OtpChallengeStore`.

It owes one operation the others do not imply:

```typescript
interface OtpChallengeStore {
  save(challenge: OtpChallenge): Promise<void>
  find(id: string): Promise<OtpChallenge | null>
  delete(id: string): Promise<void>
  /** Remove the challenge AND return it, indivisibly. */
  take(id: string): Promise<OtpChallenge | null>
}
```

**`take` has to be atomic.** It is what makes a one-time code one-time: at most
one concurrent caller may be handed a given challenge, every other gets `null`.
Read it and delete it as two operations and two requests carrying the same
correct code are both accepted — a stolen code stays spendable for as long as
its owner has not spent it. The attempt budget goes the same way: concurrent
wrong guesses each read the same count and write the same increment, so twenty
of them cost one attempt.

Use the primitive your backend already has:

```
SQL     DELETE FROM otp_challenges WHERE id = $1 RETURNING *
Redis   GETDEL, or a Lua script when the value needs decoding
other   a compare-and-set on a version column
```

A store that cannot do this atomically is not safe to use for MFA, and one that
does not implement `take` at all is refused when the provider is constructed
rather than at the first verification.

> **Breaking in 0.2.0.** `take` was added to the interface, so a store written
> against 0.1.x no longer satisfies it. On a `0.x` version the minor is the
> breaking position and a caret does not cross it, so nothing upgrades into this
> by accident — but a deliberate upgrade needs the method.

Memory stores sweep expired challenges as new ones arrive, so an abandoned
login — a code requested and never submitted — does not accumulate. They also
hold a ceiling (10 000 by default, `new MemoryOtpChallengeStore(max)`): sweeping
only removes what has EXPIRED, so a flood of still-valid challenges would
otherwise grow without one.

Full, they **refuse** a new challenge rather than evicting an old one. Making
room by dropping someone else's pending challenge is how a flood locks a real
user out; refusing puts the failure on whoever is flooding. Rate-limit the
endpoint that mints codes, or use a persistent store with a TTL on the row.

> **Persistence.** The default stores are in-memory — factors and passkeys are lost on restart. In production, implement `MfaFactorStore` / `WebauthnCredentialStore` over your database (Atlas) and the challenge stores over a fast cache (KeyDB).

---
