# Sigil — Password Hashing

Status: **Present (TS + Rust N-API)**.

- Package: `@c9up/sigil`
- Goal: canonical multi-driver password hashing for the Ream ecosystem (argon2id, bcrypt, scrypt). Single implementation, NAPI-only, modeled after `@adonisjs/hash` (v9).

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
await hash.verify('correct horse battery staple', hashed) // true
await hash.verify('wrong-password', hashed)               // false
```

Per-call driver override:

```ts
const bcryptHashed = await hash.use('bcrypt').make('password')
const scryptHashed = await hash.use('scrypt').make('password')
```

`hash.use(name)` returns a `HashDriver` whose `make` / `verify` use the named driver.

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
| `argon2` | argon2id | yes | New applications. OWASP-recommended. The Rust binding uses `Argon2::default()` from the `argon2` crate, which selects the **argon2id** variant. |
| `bcrypt` | bcrypt | no | Legacy interop (Rails / PHP / Java). `rounds` configurable (default 12, OWASP minimum 10). |
| `scrypt` | scrypt | no | Memory-hardness with a different parameter space. `keyLength` and `saltLength` configurable; cost parameters use `scrypt::Params::recommended()` from the Rust `scrypt` crate. |

All drivers run through the `sigil-engine` Rust crate (the native half of `@c9up/sigil`) — there is no JavaScript or TypeScript fallback. Password hashing must hit a vetted, constant-time native implementation.

### Honored config keys

Today, only these per-driver keys are read; anything else is silently dropped:

- `argon2` — *no per-driver options yet*; the Rust binding uses `Argon2::default()`. Tunable parameters (`memory`, `iterations`, parallelism) are a future story.
- `bcrypt` — `rounds: number`.
- `scrypt` — `keyLength: number`, `saltLength: number`.

## NAPI requirement

Sigil's NAPI binding is mandatory at runtime. If the `.node` artifact is missing, the first call to `make()` / `verify()` throws:

```text
[SIGIL_NAPI_REQUIRED] The argon2 Rust engine is required but not loaded.
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
| Auth strategy (session, JWT, OAuth, API key) | **`@c9up/warden`** | Auth orchestration. Password verification is the caller's responsibility — typically via Sigil's `Hash.verify`. |

When in doubt: passwords → Sigil, tokens/HMAC → ream root, login flows → Warden.

## Public API

| Export | Type | Purpose |
|---|---|---|
| `Hash` | class | `new Hash(config)`. Instance methods: `make(value)`, `verify(value, hash)`, `use(name?)`. |
| `HashDriver` | interface | Implement to plug a custom driver. Required: `make`, `verify`. Also the return type of `hash.use(name)`. |
| `HashConfig` | type | `{ default: string; drivers: Record<string, { driver: string; ...}> }`. |
| `defineConfig` | helper | Type-safe config authoring. |
| `SigilProvider` | provider | Registers `Hash` (and the `'hash'` token) in the Ream container. Imported via `@c9up/sigil/provider`. |

## Migration from `@c9up/ream`'s removed `Hash`

Earlier versions of `@c9up/ream` shipped an internal `Hash` class, a `HashProvider`, and raw `argon2Hash` / `argon2Verify` / `bcryptHash` / `bcryptVerify` helpers. All of them have been removed — Sigil is the canonical hasher. Replace with Sigil's `Hash` class:

```diff
- import { Hash } from '@c9up/ream'
+ import { Hash } from '@c9up/sigil'
```

```diff
- import { argon2Hash, argon2Verify } from '@c9up/ream'
+ import { Hash } from '@c9up/sigil'

- const hashed = await argon2Hash(password)
- const ok = await argon2Verify(password, hashed)
+ const hash = new Hash({ default: 'argon2', drivers: { argon2: { driver: 'argon2' } } })
+ const hashed = await hash.make(password)
+ const ok = await hash.verify(password, hashed)
```

In a Ream application, prefer the container-resolved `Hash` (see Quick Examples) over constructing one inline.

## Troubleshooting — `E_SIGIL_NAPI_REQUIRED`

If you see this error at runtime (the runtime class is `E_SIGIL_NAPI_REQUIRED` extends `Error`; the message bracket prefix `[SIGIL_NAPI_REQUIRED]` is preserved for substring-matching tests):

```
[SIGIL_NAPI_REQUIRED] The <driver> Rust engine is required but not loaded.
  Fix: cd packages/sigil && pnpm build:napi
```

The `<driver>` placeholder is interpolated at throw time with the actual driver name (`argon2`, `bcrypt`, or `scrypt`).

The prebuilt `.node` binary was not found at `packages/sigil/index.<platform>.node`. Sigil has no JS/TS fallback — every driver (argon2id, bcrypt, scrypt) is backed by Rust NAPI.

**Recovery — local development:**

```bash
cd packages/sigil
pnpm build:napi
```

This runs `cargo build --release -p sigil-engine-napi` and copies the produced library to `index.<platform>.node` (via `scripts/copy-napi.mjs`). You need the Rust toolchain (`cargo`) installed.

**Supported platforms (CI-prebuilt):**

| Suffix | GitHub Actions runner |
|---|---|
| `linux-x64-gnu` | `ubuntu-latest` |
| `linux-arm64-gnu` | `ubuntu-24.04-arm` |
| `darwin-x64` | `macos-13` |
| `darwin-arm64` | `macos-14` |
| `win32-x64-msvc` | `windows-latest` |

Each is built via `pnpm build:napi` on a native runner (no cross-compilation) and uploaded as a workflow artefact in the `sigil-ci` workflow.

**Unsupported platforms:** if your platform is not in the matrix above, build from source via `cargo build --release -p sigil-engine-napi` and copy the resulting `target/release/libsigil_engine_napi.{so,dylib,dll}` to `index.<your-platform-suffix>.node` next to `package.json`. Open an issue with your `${platform}-${arch}` so the matrix can be extended.

## Migration from `@c9up/warden`'s internal hash

`@c9up/warden` historically exposed `hashPasswordArgon2` / `verifyPasswordArgon2` / `hashPasswordBcrypt` / `verifyPasswordBcrypt` on its `NativeWarden` interface — they were never wired into `SessionStrategy` (which delegates password verification to the caller; see `SessionStrategy.ts:33-37`) and had zero TS callers in the workspace. Story 40.3 removed them from the TS surface. The underlying Rust crate still ships those functions in the prebuilt `.node` artefact (a follow-up hardening story tracks their removal). If your application ever called them directly, switch to Sigil's `Hash` class.

## Status & roadmap

- **40.1** *(this story)* — README + EN/FR module docs + architecture decision recorded. Throwing stubs in `@c9up/ream/security/crypto` removed (never deployed). `SigilProvider` fallback corrected from `scrypt` to `argon2` to match the documented default.
- **40.3** — Warden delegates password verification to Sigil; integration test covers all three drivers via `Hash.make` → `Hash.verify` → `Warden.SessionStrategy`.
- **40.4** — Prebuilt NAPI binaries in CI for the 5 target platforms. Hardened runtime detection with the `[SIGIL_NAPI_REQUIRED]` error path + a `pnpm build:napi` script.

> Story 40.2 (originally scoped as "ream/crypto delegates to Sigil") is being re-evaluated: 40.1 deleted the stubs outright instead of converting them to facades. The duplicate argon2 path in `@c9up/warden` is independent and is still tracked by story 40.3.
