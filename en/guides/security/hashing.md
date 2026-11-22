# Hashing

This guide covers password hashing with sigil:

- Quick Examples
- Drivers
- NAPI requirement
- When to use Sigil vs `@c9up/ream` vs `@c9up/warden`
- Config file

Status: **Present (TS + Rust N-API)**.

- Package: `@c9up/sigil`
- Goal: canonical multi-driver password hashing for the Ream ecosystem (argon2id, bcrypt, scrypt). Single implementation, NAPI-only.

## Quick Examples

`Hash` is a **class** — instantiate it with a config:

```ts
import { Hash } from '@c9up/sigil'

const hash = new Hash({
  default: 'argon2',
  drivers: {
    argon2: { driver: 'argon2' },
  },
})

const hashed = await hash.make('correct horse battery staple')
await hash.verify(hashed, 'correct horse battery staple') // true
await hash.verify(hashed, 'wrong-password')               // false
```

`verify` takes the **hash first, the plain value second** — `verify(hashedValue, plainValue)`.

Per-call driver override:

```ts
const bcryptHashed = await hash.use('bcrypt').make('password')
const scryptHashed = await hash.use('scrypt').make('password')
```

`hash.use(name)` returns a `HashDriver` whose `make` / `verify` use the named driver.

A name the config does not declare throws `E_SIGIL_UNKNOWN_HASHER`, which lists
the declared ones.

`hash.isValidHash(value)` tells whether `value` is a hash the default driver
could verify — use it to decide whether a value still needs hashing before it
is saved, or to check an imported users table. It parses the whole string, with
no native call: for argon2, the variant, the version (`16`, `19` or none), exactly
`m`, `t` and `p` within the ranges verify accepts, a salt of 8–48 bytes and an
output of 10–64 bytes in canonical base64; for scrypt, exactly `n` (a power of
two), `r` and `p`, a cost and working set verify accepts under the hasher's
`maxMemory`, a salt of 8–1024 bytes and a key of 64–128 bytes. A string that
only starts like a hash (`$argon2id$garbage`) is `false`.

### Transparent re-hashing — `needsReHash`

`hash.needsReHash(storedHash): boolean` returns `true` when a stored hash was produced with an algorithm or parameters that have since drifted from your current config (e.g. you raised bcrypt `rounds`, or switched the default driver). Re-hash on a successful login so credentials migrate to the stronger parameters over time:

```ts
const stored = user.passwordHash

if (await hash.verify(stored, password)) {
  if (hash.needsReHash(stored)) {
    user.passwordHash = await hash.make(password) // re-store with current params
    await user.save()
  }
  // …issue session
}
```

Configure once, register the provider:

```ts
// config/hash.ts
import { defineConfig } from '@c9up/sigil'

export default defineConfig({
  default: 'argon2',
  drivers: {
    argon2: { driver: 'argon2' },
    bcrypt: { driver: 'bcrypt', rounds: 12 },
    scrypt: { driver: 'scrypt', keyLength: 64, saltLength: 32 },
  },
})
```

```ts
// providers.ts
import { SigilProvider } from '@c9up/sigil/provider'
export default [SigilProvider]
```

```ts
// in a controller / handler
import type { AppContext } from '@c9up/ream'
import { Hash } from '@c9up/sigil'

async function register(app: AppContext) {
  const hash = app.container.resolve<Hash>(Hash)
  const stored = await hash.make(password)
}
```

## Drivers

| Driver key | Algorithm | Default? | When to choose |
|---|---|---|---|
| `argon2` | argon2id | yes | New applications. OWASP-recommended. Defaults to **argon2id** (version 19), 64 MiB (`memory: 65536`), 3 iterations, 4 lanes; `variant` selects argon2i or argon2d. |
| `bcrypt` | bcrypt | no | Legacy interop (Rails / PHP / Java). `rounds` configurable (default 12, minimum 10, maximum 16). Writes the standard MCF string (`$2b$12$…`); verify also reads the PHC form `$bcrypt$v=98$r=10$<salt>$<digest>`. |
| `scrypt` | scrypt | no | Memory-hardness with a different parameter space. `cost` (N, default 16384), `blockSize` (r, default 8), `parallelization` (p, default 1), `keyLength`, `saltSize` and `maxMemory` (default 32 MiB) are configurable. Writes the PHC form `$scrypt$n=…,r=…,p=…$<salt>$<hash>`. |

All drivers run through the `sigil-engine` Rust crate (the native half of `@c9up/sigil`) — there is no JavaScript or TypeScript fallback. Password hashing must hit a vetted, constant-time native implementation.

### Honored config keys

Every value is validated when the driver is built — at boot, when `new Hash(...)`
or the provider constructs it. A value out of range, or of the wrong type
(`rounds: '12'` read from an environment variable), throws a `TypeError` there
rather than on a user's first login, and is never quietly replaced by a default:

- `argon2` — `variant` (`'d'` | `'i'` | `'id'`, default `id`), `memory` (KiB,
  alias `memoryKib`, default 65536, at least 8 × `parallelism`), `iterations`
  (default 3, at least 2), `parallelism` (default 4), `hashLength` (bytes, 10–64,
  default 32), `saltSize` (bytes, 8–48, default 16), `secret` (pepper — not
  stored in the hash, and required identically at verify).
- `bcrypt` — `rounds` (10–16, default 12), `version` (char code: `97` = `$2a$`,
  `98` = `$2b$` default, `121` = `$2y$`), `saltSize` (must be 16 — bcrypt fixes
  it, and any other value would produce a hash no implementation can read).
- `scrypt` — `cost` (N, a power of two, default 16384), `blockSize` (r, default
  8), `parallelization` (p, default 1), `keyLength` (64–128, default 64),
  `saltSize` (alias `saltLength`, 8–1024, default 16), `maxMemory` (bytes,
  default 32 MiB, at least the working set `128 × r × (N + p + 2)`).

A hasher whose `driver` is not `argon2`, `bcrypt` or `scrypt` (a typo such as
`'argon'`) throws `E_SIGIL_UNKNOWN_DRIVER` when `Hash` is built, so the
application fails at boot rather than at its first sign-up.

So does a `default` that names none of the declared hashers — typically
`default: env.get('HASH_DRIVER')` set to a driver the `list` does not declare:
`new Hash(...)` throws `E_SIGIL_UNKNOWN_HASHER`.

`secret` takes a string or a `Secret` wrapping one — what an environment schema
returns — so `drivers.argon2({ secret: env.get('APP_KEY') })` works as is.

`hash.config` is a copy of the configuration with every `secret` replaced by a
wrapper that prints `[redacted]` through `JSON.stringify`, `String()` and
`util.inspect`, so logging or serialising the hasher never writes the pepper.
The object you passed in is left as it was.

`verify()` reads the variant and the parameters back out of the hash string, so
a password hashed with `argon2i` verifies whatever the current config says.

### Input length limits

`make()` refuses a value it cannot hash safely, and throws — it does not return
`false` — so a sign-up or password-change form bounds the field and maps the
error to a 4xx:

| Driver | `make()` throws when the value exceeds | Message |
|---|---|---|
| every driver | 1024 UTF-8 bytes | `Password exceeds maximum length of 1024 bytes` |
| `bcrypt` | 72 UTF-8 bytes | `Bcrypt cannot hash inputs longer than 72 bytes (got <n>); use argon2id for long passphrases` |

The limits count bytes, not characters: an accented or non-Latin passphrase
reaches 72 bytes well before 72 characters. bcrypt reads only the first 72
bytes, so two long passwords sharing that prefix would hash alike; sigil
refuses rather than truncate. Both are plain `Error`s, not `SigilError`s.
`verify()` with a value past bcrypt's 72 bytes answers `false`, since no hash
`make()` wrote can match it.

### Hashing off the event loop

`make` and `verify` return Promises, and the key derivation runs on the libuv
thread pool, never on the event loop: a burst of concurrent logins slows those
logins down, not every other request the process is serving. Concurrent
derivations share the pool's threads (4 by default; `UV_THREADPOOL_SIZE`
changes it).

### Verify cost limits

A hash carries its own cost, so whoever can write a stored hash decides how much
work verifying it takes. `verify` refuses — returns `false` without deriving
anything — a stored hash that costs far more than any real configuration:

| Driver | Refused when |
|---|---|
| `argon2` | `m × t` (KiB × iterations) exceeds 2^20, about five times the defaults |
| `bcrypt` | the cost exceeds 16 |
| `scrypt` | `N × r × p` exceeds 2^22, or the working set `128 × r × (N + p + 2)` exceeds the configured `maxMemory` |

The same limits apply to the configuration: a driver configured above them
throws when it is built, since its hashes would never verify.

### bcrypt hashes in PHC form

Besides the MCF string it writes (`$2b$12$…`), the bcrypt driver verifies the PHC
form `$bcrypt$v=98$r=10$<b64 salt>$<b64 digest>` that other Node.js hashing
libraries store. `needsReHash` answers `true` for such a hash, so the re-hash on
login (above) rewrites it as MCF the next time its user signs in.

## NAPI requirement

Sigil's NAPI binding is mandatory at runtime. If the `.node` artifact is missing, the first call to `make()` / `verify()` throws:

```text
[E_SIGIL_NAPI_REQUIRED] The argon2 Rust engine is required but not loaded.
  Fix: cd packages/sigil && pnpm build:napi
```

The `argon2` token is interpolated with the failing driver name (`argon2` / `bcrypt` / `scrypt`).

> Story 40.4 wired the `pnpm build:napi` script (`cargo build --release -p sigil-engine-napi && node scripts/copy-napi.mjs`) and the 5-platform GitHub Actions matrix. Run `pnpm build:napi` from `packages/sigil` to produce the binary for your local platform.

The CI workflow builds prebuilt binaries on native runners for the 5 supported platforms (linux-x64-gnu, linux-arm64-gnu, darwin-x64, darwin-arm64, win32-x64-msvc). See the Troubleshooting section below for the per-platform table.

## When to use Sigil vs `@c9up/ream` vs `@c9up/warden`

The three packages own distinct concerns:

| Need | Use | Why |
|---|---|---|
| Hash a password / verify a password | **`@c9up/sigil`** (`new Hash(...)` then `make` / `verify`) | Canonical hashing authority. Single implementation, multi-driver, NAPI-backed. |
| HMAC, random bytes, constant-time string compare | **`@c9up/ream`** (root: `hmacSign`, `hmacVerify`, `randomHex`, `randomBytesBase64`, `constantTimeEq`) | Low-level NAPI-or-stdlib crypto helpers. No password hashing here — that lives in Sigil. |
| Auth strategy (session, JWT, OAuth, access tokens) | **`@c9up/warden`** | Auth orchestration. Password verification is the caller's responsibility — typically via Sigil's `Hash.verify`. |

When in doubt: passwords → Sigil, tokens/HMAC → ream root, login flows → Warden.

## Config file

```ts
import { defineConfig, drivers } from '@c9up/sigil'

export default defineConfig({
  default: 'scrypt',
  list: {                                   // `drivers` also works
    scrypt: drivers.scrypt({ cost: 16384, blockSize: 8 }),
    argon: drivers.argon2({ memory: 65536 }),
  },
})
```

> **`Hash` and `Hasher`.** A `Hasher` wraps ONE driver; `Hash` manages several.
> `HashManager` is exported as an alias of `Hash`.

`drivers.*` returns a plain descriptor: there is nothing to import lazily, since
one Rust engine holds every driver. Hashes are standard PHC strings.
