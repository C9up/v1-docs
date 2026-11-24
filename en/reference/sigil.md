# sigil

`@c9up/sigil`: password hashing with argon2, bcrypt and scrypt, run by a native Rust engine. Guide: [Hashing](/en/guides/security/hashing).

## Installation

```bash
pnpm add @c9up/sigil
```

`ream configure @c9up/sigil` registers the provider, writes `config/hash.ts` and adds `HASH_DRIVER=argon2` to the environment files. The native engine comes as one small package per platform, `@c9up/sigil-<platform>`, for linux x64 and arm64 (glibc), macOS x64 and arm64, and Windows x64. `@c9up/sigil` lists them as optional dependencies, and your package manager installs only the one that matches your machine. No Rust toolchain is needed. Do not install with optional dependencies turned off (`--no-optional`, `--omit=optional`): the engine would be left out.

There is no JavaScript fallback. Without the engine, hashing throws `E_SIGIL_NAPI_REQUIRED`, and its message names the package to install, for example `@c9up/sigil-linux-x64-gnu`.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/sigil` | `Hash`, `Hasher`, `defineConfig`, `drivers`, the error classes and the config types |
| `@c9up/sigil/provider` | `SigilProvider` (default export) |
| `@c9up/sigil/services/main` | The application's `Hash` instance (default export) |
| `@c9up/sigil/configure` | `configure()`, run by `ream configure @c9up/sigil` |

## Exports

### `@c9up/sigil`

| Export | Kind | Description |
|---|---|---|
| `Hash` | class | Hash manager: holds the configured hashers and delegates to the default one |
| `HashManager` | class | Another name for `Hash` |
| `Hasher` | class | One hasher, as returned by `hash.use(name)` |
| `defineConfig` | function | `defineConfig(config: HashConfig): HashConfig`, types `config/hash.ts` |
| `drivers` | const | `drivers.argon2(options?)`, `drivers.bcrypt(options?)`, `drivers.scrypt(options?)`: build a `HashDriverConfig` |
| `SigilProvider` | provider | Same class as `@c9up/sigil/provider` |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors) |
| `HashConfig` | interface | `{ default: string; list?: Record<string, HashDriverConfig>; drivers?: Record<string, HashDriverConfig> }` |
| `HashDriverConfig` | interface | `{ driver: string; [key: string]: unknown }` |
| `HashDriver` | interface | What a driver implements: `isValidHash`, `make`, `verify`, `needsReHash` |
| `Argon2Options` | interface | Options of `drivers.argon2()` |
| `BcryptOptions` | interface | Options of `drivers.bcrypt()` |
| `ScryptOptions` | interface | Options of `drivers.scrypt()` |
| `ReleasableSecret` | interface | `{ release(): string }`, the shape of an environment `Secret` |

### `Hash`

`new Hash(config: HashConfig)`. The constructor validates every hasher: an unknown driver, an option out of range (`E_SIGIL_INVALID_OPTION`) or a `default` that names no hasher fails here, at boot.

| Member | Signature | Description |
|---|---|---|
| `config` | `readonly config: HashConfig` | The configuration, with every argon2 `secret` wrapped so logging it does not print the pepper |
| `make` | `make(value: string): Promise<string>` | Hash `value` with the default hasher |
| `verify` | `verify(hash: string, value: string): Promise<boolean>` | Check `value` against a stored `hash`; the hash comes first |
| `isValidHash` | `isValidHash(hash: string): boolean` | Whether `hash` has the default driver's format and costs; no derivation |
| `needsReHash` | `needsReHash(hash: string): boolean` | Whether `hash` was made by another algorithm or other parameters than the current config |
| `assertEquals` | `assertEquals(hash: string, value: string): Promise<void>` | Throws an `AssertionError` when `value` does not verify; the message never contains `value` |
| `assertNotEquals` | `assertNotEquals(hash: string, value: string): Promise<void>` | Throws an `AssertionError` when `value` verifies |
| `use` | `use(name?: string): Hasher` | The named hasher, or the default one; throws `E_SIGIL_UNKNOWN_HASHER` for an undeclared name |
| `fake` | `fake(): { [Symbol.dispose](): void }` | Replace every hasher with a fake: `make` returns the value, `verify` compares strings. `using guard = hash.fake()` restores at scope exit |
| `restore` | `restore(): void` | Leave fake mode |

### `Hasher`

`new Hasher(driver: HashDriver)`. It has the same `isValidHash`, `make`, `verify`, `needsReHash`, `assertEquals` and `assertNotEquals` members as `Hash`, run against its own driver.

`make` and `verify` run the derivation on the libuv thread pool (4 threads unless `UV_THREADPOOL_SIZE` says otherwise), never on the event loop. `make` throws for a value longer than 1024 bytes. bcrypt's `make` throws for a value longer than 72 bytes rather than truncate it, and its `verify` answers `false`.

`verify` returns `false` without deriving when a stored hash costs more than any real configuration: argon2 `memory × iterations` above 2^20, a bcrypt cost above 16, a scrypt `N × r × p` above 2^22 or a working set `128 × r × (N + p + 2)` above `maxMemory`. A configuration above these limits throws when the driver is built.

### `@c9up/sigil/provider`

| Export | Kind | Description |
|---|---|---|
| `default` | provider | `SigilProvider`: binds `Hash` from the `hash` config and fills `@c9up/sigil/services/main` at boot |
| `SigilAppContext` | interface | `{ container, config }`, what the provider needs from the application |

### `@c9up/sigil/services/main`

| Export | Kind | Description |
|---|---|---|
| `default` | const | `hash: Hash`, the application's `Hash` once `SigilProvider` booted; any member read before throws `E_SIGIL_NOT_BOOTED` |

```ts
import hash from '@c9up/sigil/services/main'

const digest = await hash.make(password)
if (await hash.verify(digest, password) && hash.needsReHash(digest)) {
  user.password = await hash.make(password)
}
```

### `@c9up/sigil/configure`

| Export | Kind | Description |
|---|---|---|
| `configure` | function | `configure(codemods): Promise<void>`: adds `HASH_DRIVER`, registers `@c9up/sigil/provider`, writes `config/hash.ts` |

## Configuration

`config/hash.ts`, read under the `hash` key. Without it, the provider uses `{ default: 'argon2', list: { argon2: { driver: 'argon2' } } }`.

```ts
import { defineConfig, drivers } from '@c9up/sigil'
import env from '#start/env'

export default defineConfig({
  default: env.get('HASH_DRIVER', 'argon2'),
  list: {
    argon2: drivers.argon2({ secret: env.get('APP_KEY') }),
    bcrypt: drivers.bcrypt({ rounds: 12 }),
  },
})
```

| Option | Type | Default | Description |
|---|---|---|---|
| `default` | `string` | — | Name of the hasher `make`, `verify` and `use()` use |
| `list` | `Record<string, HashDriverConfig>` | — | The hashers, by name |
| `drivers` | `Record<string, HashDriverConfig>` | — | Older name of `list`; both are read, `list` wins on a shared key |

`drivers.argon2(options)` (argon2 driver):

| Option | Type | Default | Description |
|---|---|---|---|
| `variant` | `'d' \| 'i' \| 'id'` | `'id'` | Argon2 variant |
| `memory` | `number` | `65536` | Memory in KiB, at least `8 × parallelism`; `memoryKib` is read as an alias |
| `iterations` | `number` | `3` | Passes, at least 2 |
| `parallelism` | `number` | `4` | Lanes |
| `saltSize` | `number` | `16` | Salt bytes, 8 to 48 |
| `hashLength` | `number` | `32` | Output bytes, 10 to 64 |
| `secret` | `string \| ReleasableSecret` | — | Pepper mixed into every hash and not stored in it; verifying needs the same secret |

`drivers.bcrypt(options)` (bcrypt driver):

| Option | Type | Default | Description |
|---|---|---|---|
| `rounds` | `number` | `12` | Cost, 10 to 16 |
| `version` | `number` | `98` | `97` writes `$2a$`, `98` writes `$2b$`, `121` writes `$2y$` |
| `saltSize` | `number` | `16` | Only 16 is accepted |

`drivers.scrypt(options)` (scrypt driver):

| Option | Type | Default | Description |
|---|---|---|---|
| `cost` | `number` | `16384` | N, a power of two |
| `blockSize` | `number` | `8` | r |
| `parallelization` | `number` | `1` | p |
| `keyLength` | `number` | `64` | Key bytes, 64 to 128 |
| `saltSize` | `number` | `16` | Salt bytes, 8 to 1024; `saltLength` is read as an alias |
| `maxMemory` | `number` | `33554432` | Bytes, at least the working set `128 × r × (N + p + 2)`; bounds `verify` too |

bcrypt writes the MCF form (`$2b$12$…`) and also verifies the PHC form `$bcrypt$v=98$r=…$…$…`, for which `needsReHash` answers `true`. scrypt writes the PHC form `$scrypt$n=…,r=…,p=…$<salt>$<hash>`.

## Container bindings

| Token | Resolves to |
|---|---|
| `Hash` (class) | The `Hash` built from the `hash` config |
| `'sigil.hash'` | The same `Hash` |
| `'hash'` | The same `Hash` |

`'sigil.hash'` and `'hash'` are declared in `ContainerBindings`, so `container.make('sigil.hash')` is typed.

## Errors

| Code | Raised when |
|---|---|
| [`E_SIGIL_UNKNOWN_DRIVER`](/en/reference/errors#e-sigil-unknown-driver) | A hasher in the config names a driver other than `argon2`, `bcrypt` or `scrypt`; thrown by the `Hash` constructor |
| [`E_SIGIL_UNKNOWN_HASHER`](/en/reference/errors#e-sigil-unknown-hasher) | `default` (in the constructor) or `use(name)` names a hasher the config does not declare |
| [`E_SIGIL_NAPI_REQUIRED`](/en/reference/errors#e-sigil-napi-required) | `make` or `verify` ran without the native engine loaded |
| [`E_SIGIL_NOT_BOOTED`](/en/reference/errors#e-sigil-not-booted) | `@c9up/sigil/services/main` was read before `SigilProvider.boot()` |
| [`E_SIGIL_INVALID_OPTION`](/en/reference/errors#e-sigil-invalid-option) | A driver option is not an integer, out of range, not an allowed value, a scrypt `cost` that is not a power of two, or a combination costing more than `verify` accepts; thrown when the driver is built |
| [`E_SIGIL_PASSWORD_TOO_LONG`](/en/reference/errors#e-sigil-password-too-long) | `make` received a password longer than the shared byte cap, or longer than 72 bytes for bcrypt |

Each one is a class of the `errors` namespace and a `@c9up/flare` `Exception` with status 500: branch on `error.code` or on `error instanceof errors.E_SIGIL_*`.

## Migration

- `SigilError` is gone: test `error.code`, or `error instanceof errors.E_SIGIL_*` with `import { errors } from '@c9up/sigil'`.
- The error classes are no longer exported one by one: `E_SIGIL_NAPI_REQUIRED` becomes `errors.E_SIGIL_NAPI_REQUIRED`, and so on.
- `E_SIGIL_INVALID_OPTION` is no longer a `TypeError`: replace `instanceof TypeError` with `error.code === 'E_SIGIL_INVALID_OPTION'`.
- `error.name` is no longer the code: read `error.code`.

## See also

- [Hashing](/en/guides/security/hashing)
- [Verifying credentials](/en/guides/auth/verifying-credentials)
