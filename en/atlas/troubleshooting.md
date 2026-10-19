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

## `E_ATLAS_INSECURE_SSLMODE`

Cause: the connection asks for `sslmode=prefer` or `allow`, in its URL or
through `PGSSLMODE`. Both fall back to plaintext when TLS fails, without
saying so.

Actions:

- `sslmode=disable` for a database on a network you control
- `sslmode=verify-full` with `sslrootcert` otherwise (see
  [Encrypted connections](./connections.md#encrypted-connections-tls))

## TLS connection refused

The message says which side refused:

- `not valid for name "…"`: the server's certificate does not name the host
  of the URL. Connect with a name the certificate holds.
- `UnknownIssuer`: the server's certificate is not signed by `sslrootcert`.
- `requires a valid client certificate` or `UnknownCA`: the server wants a
  client certificate (`sslcert`, `sslkey`) signed by the authority it trusts.
- `Cannot read the TLS …`, `… is not a PEM file`: the named file is missing
  or unreadable by the process.
- a key that `is encrypted`: decrypt it with the `openssl pkey` command the
  message gives.

## `pool timed out while waiting for an open connection`

Cause: the pool could not open its `pool.min` connections in time. The
server kept refusing them, or did not answer. PostgreSQL at
`max_connections`, or a proxy at its own session limit, refuses with
`too many connections` and the pool retries until the timeout.

Actions:

- lower `pool.min` / `pool.max`, or raise the server's limit
- count the sessions every instance of the app opens: each pool connection
  holds one
