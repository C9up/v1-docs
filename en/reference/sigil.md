# sigil

This guide covers the sigil API, migration notes and troubleshooting:

- Public API
- Migration from `@c9up/ream`'s removed `Hash`
- Migration from `@c9up/warden`'s internal hash
- Troubleshooting — `E_SIGIL_NAPI_REQUIRED`
- Status & roadmap

## Public API

| Export | Type | Purpose |
|---|---|---|
| `Hash` | class | `new Hash(config)`. Instance methods: `make(value)`, `verify(hash, value)`, `needsReHash(hash)`, `use(name?)`. |
| `HashDriver` | interface | Implement to plug a custom driver. Required: `make`, `verify`, `needsReHash`. Also the return type of `hash.use(name)`. |
| `HashConfig` | type | `{ default: string; drivers: Record<string, { driver: string; ...}> }`. |
| `defineConfig` | helper | Type-safe config authoring. |
| `SigilProvider` | provider | Registers `Hash` (and the `'hash'` token) in the Ream container. Imported via `@c9up/sigil/provider`. |
| `SigilError` | class | Base of every error sigil raises; `error.code` is the `E_SIGIL_*` name of the subclass. |
| `E_SIGIL_NAPI_REQUIRED` | class | A driver ran without the native engine loaded. |
| `E_SIGIL_UNKNOWN_DRIVER` | class | A hasher in the config names a driver sigil does not have; thrown when `Hash` is built. |
| `E_SIGIL_UNKNOWN_HASHER` | class | `default` (when `Hash` is built) or `use(name)` names a hasher the config does not declare. |
| `E_SIGIL_NOT_BOOTED` | class | `@c9up/sigil/services/main` used before `SigilProvider` booted. |

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
+ const ok = await hash.verify(hashed, password)
```

In a Ream application, prefer the container-resolved `Hash` (see Quick Examples) over constructing one inline.

## Migration from `@c9up/warden`'s internal hash

`@c9up/warden` historically exposed `hashPasswordArgon2` / `verifyPasswordArgon2` / `hashPasswordBcrypt` / `verifyPasswordBcrypt` on its `NativeWarden` interface — they were never wired into `SessionStrategy` (which delegates password verification to the caller; see `SessionStrategy.ts:33-37`) and had zero TS callers in the workspace. Story 40.3 removed them from the TS surface. The underlying Rust crate still ships those functions in the prebuilt `.node` artefact (a follow-up hardening story tracks their removal). If your application ever called them directly, switch to Sigil's `Hash` class.

## Troubleshooting — `E_SIGIL_NAPI_REQUIRED`

If you see this error at runtime (the class is `E_SIGIL_NAPI_REQUIRED`, a `SigilError` whose `code` is `'E_SIGIL_NAPI_REQUIRED'`; branch on `error.code`, not on the message):

```
[E_SIGIL_NAPI_REQUIRED] The <driver> Rust engine is required but not loaded.
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

## Status & roadmap

- **40.1** *(this story)* — README + EN/FR module docs + architecture decision recorded. Throwing stubs in `@c9up/ream/security/crypto` removed (never deployed). `SigilProvider` fallback corrected from `scrypt` to `argon2` to match the documented default.
- **40.3** — Warden delegates password verification to Sigil; integration test covers all three drivers via `Hash.make` → `Hash.verify` → `Warden.SessionStrategy`.
- **40.4** — Prebuilt NAPI binaries in CI for the 5 target platforms. Hardened runtime detection with the `E_SIGIL_NAPI_REQUIRED` error path + a `pnpm build:napi` script.

> Story 40.2 (originally scoped as "ream/crypto delegates to Sigil") is being re-evaluated: 40.1 deleted the stubs outright instead of converting them to facades. The duplicate argon2 path in `@c9up/warden` is independent and is still tracked by story 40.3.
