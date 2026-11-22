# Issuer and store

This guide covers the issuer and the store:

- The issuer
- The store

## The issuer

It identifies the SERVER, and that is all it does. An access token here is
opaque — a random string with no claims inside — so nothing is bound to an
issuer cryptographically; the only thing that can vouch for such a token is the
server that minted it. That is why `/oauth/introspect` answers with `iss`, and
why the metadata document names it.

Validated at boot rather than at the first request: a URL, `https` (localhost
excepted), no query string, no fragment, and a trailing slash dropped — every
endpoint is built by concatenation, so `https://auth.test/` would otherwise
produce `https://auth.test//oauth/token`.

An issuer may carry a path. The metadata document then lives where RFC 8414
§3.1 puts it, with the well-known segment between the host and the path:
`https://example.com/auth` publishes at
`/.well-known/oauth-authorization-server/auth`, and not at the root, where it
would name an issuer other than the one a client fetching the root expects
(§3.3). The endpoints it lists are the issuer followed by `prefix` —
`https://example.com/auth/oauth/token` — while the application mounts them at
`prefix` alone, so the proxy in front strips `/auth` before passing them on,
and passes the well-known path through unchanged.

## The store

`MemoryStore` is for tests and a single development process: a restart signs
every user out and a second instance sees none of the first one's tokens.
An application running atlas gets one:

```ts
import { AtlasStore } from '@c9up/visa/stores/atlas'

const store = new AtlasStore(db)
```

`ream configure @c9up/visa` writes the migration for its five tables. It is
built on the query builder rather than on SQL text, so dialects stay atlas'
problem, and it takes the `db` service through a structural slice of what it
calls — visa itself imports nothing.

Anything else implements `VisaStore`.

`saveClient` is optional, for clients that live in a table you do not own.
Without it `registerClient` throws, and a server with `registration.enabled`
refuses to boot rather than answering 500 to every registration.

### Upgrading a `visa_clients` table

A client's secret can expire — a `client_secret_expires_at` answered at
registration — and that expiry is enforced at every client authentication from
the `secret_expires_at` column (`null`: the secret does not expire).
`AtlasStore` writes that column on every client, and a `visa_clients` table
created by visa 0.1.3 or earlier does not have it. Run `ream configure
@c9up/visa` again before upgrading: your existing `9000_create_visa_tables` is
left alone, `9001_add_visa_client_secret_expiry` lands beside it, and
`migration:run` adds the column.

Two of its methods, `consumeAuthorizationCode` and `consumeRefreshToken`,
**must be atomic**: two requests racing with the same code must not both
succeed. That single-use guarantee is what the whole replay detection is built
on, so a driver on a real database has to say how it achieves it — the atlas
store does it in one UPDATE guarded on the column still being null, and never
reads first.
