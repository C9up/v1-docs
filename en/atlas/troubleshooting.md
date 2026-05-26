# Atlas - Troubleshooting

## `ATLAS_NAPI_NOT_FOUND`

Cause: native package not available for current platform/arch.

Actions:

- reinstall dependencies (`pnpm install`)
- verify platform-specific optional dependency resolution
- check Node version and build environment

## `E_INVALID_COLUMN`

Cause: unknown column for entity metadata.

Actions:

- verify `@Column` decorators
- verify naming strategy assumptions (camelCase vs snake_case)
- validate dynamic column whitelist

## `whereRaw()` or `joinRaw()` throws

Cause: Atlas strict mode enabled.

Actions:

- switch to structured query APIs (`whereExpr`, join builders)
- keep raw SQL only where absolutely required

## `cursorPaginate` malformed cursor

Cause: invalid or tampered cursor payload.

Action:

- treat as client input error (`400`)

## `findOrFail` throws

Cause: row not found.

Action:

- use `find` when `null` is acceptable
- map not-found to HTTP `404`

## Migration warning about non-atomic execution

Cause: adapter lacks `runInTransaction`.

Actions:

- implement `runInTransaction(batch)` in adapter
- do not run production migrations without atomic adapter support
