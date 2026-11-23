# Introduction

This guide covers the OAuth 2.1 server:

- What it implements
- The decisions, and what each one prevents
- What `ream configure` writes
- Not here yet

`@c9up/visa` is an OAuth 2.1 authorization server: it issues tokens to **other**
applications on a user's behalf.

It authenticates nobody — that stays [warden](/en/guides/auth/introduction)'s job. Visa
asks your application who is signed in, and owns everything after that. Its
mirror image is [transit](/en/guides/auth/social/), which *consumes* a provider;
visa *is* one.

No dependencies: `node:crypto` only. A package sitting in the path that mints
and compares credentials is a package that can replace them.

```bash
ream configure @c9up/visa
```

![The OAuth 2.1 authorization code flow with PKCE. 1. The client app redirects the user's browser with a code_challenge (S256). 2. The browser requests GET /oauth/authorize from your ream app, where visa.authorize() checks the client and the exact redirect URI. 3. Your app has the user sign in, then shows your consent page, which is CSRF-protected and cannot be framed. 4. The browser posts the consent to POST /oauth/consent with a single-use ticket. 5. Your app redirects to the client's redirect_uri with a code. 6. The client app posts the code and its code_verifier to POST /oauth/token and receives an access token and a refresh token. Every refresh mints a new token; a spent refresh token coming back revokes the whole family; codes, tokens and secrets are hashed at rest.](/images/oauth-en.webp){width=640 height=640 loading=lazy}

## What it implements

| | |
|---|---|
| Grants | `authorization_code` (PKCE required), `refresh_token`, `client_credentials` |
| Endpoints | `/oauth/token`, `/oauth/revoke`, `/oauth/introspect`, `/oauth/register`*, `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`* |
| Also | RFC 9728 (where to authenticate), RFC 8707 (which server a token is for), RFC 7591 (clients that register themselves)* |
| Removed | `implicit` and `password` — gone from OAuth 2.1, and unavailable under any option |

\* mounted only once declared in `config/visa.ts`.

`/authorize` is **not** mounted, and that is a decision rather than an
omission: it needs a signed-in user and a consent screen, and both belong to
your application. A route that guessed either would be wrong in a way that is
hard to notice — a server showing no consent screen grants silently.

## The decisions, and what each one prevents

- **PKCE on every client**, confidential ones included: a code on the front
  channel is interceptable whoever asked for it.
- **`S256` only.** `plain` puts the verifier in the authorization request, so
  anything that can read that request — a log, a referrer, a proxy — can
  complete the exchange, which is exactly what PKCE exists to stop.
  `allowPlainChallenge: true` brings it back.
- **Exact redirect URI matching**, with the single exception the spec names (a
  loopback port, since a native app cannot know which port the OS will hand
  it). A prefix match is how an open redirect on the client's own domain
  becomes a stolen authorization code.
- **An error is never redirected to an unverified URI.** A bad `redirect_uri`
  is shown to the user; bouncing it would tell an attacker the client exists
  and load a page of their choosing in the user's session.
- **Everything is hashed at rest** — codes, access tokens, refresh tokens,
  client secrets. A database dump is not a set of working credentials.
- **Refresh rotation with replay detection.** Every use mints a new token; a
  spent one coming back proves a leak, and since there is no telling the thief
  from the victim, the whole family is revoked and both are signed out.
- **A replayed authorization code revokes what it bought.** The legitimate
  exchange already happened, so the tokens in flight are the attacker's.
- **Parameters in the body only.** `/oauth/token`, `/oauth/introspect`,
  `/oauth/revoke` and `/oauth/register` read the request body only, and answer
  `invalid_request` to a request that puts an OAuth parameter
  (`client_secret`, `code`, `token`, `refresh_token`, registration metadata on
  `/oauth/register`…) in the query string: a secret, a code or a token in a URL
  ends up in access logs, proxies and traces. Other query parameters are
  ignored.
- **A scope is not a permission.** See
  [Protecting a resource](/en/guides/oauth-server/resources#protecting-a-resource).
- **One sentence per failure.** "No such code", "expired", "already used" and
  "wrong client" all read `invalid_grant: The code is not valid.` — telling
  them apart is how a code space gets probed.

### Lifetimes

How long a leaked credential stays usable is configuration, in seconds:

| Key | Default | What it bounds |
|---|---|---|
| `accessTokenTtlSeconds` | `3600` (an hour) | An access token, and the `expires_in` the token response carries. `ream configure` writes it explicitly. |
| `refreshTokenTtlSeconds` | `2592000` (30 days) | A refresh token. Rotation mints a new one on every use. |
| `codeTtlSeconds` | `30` | An authorization code: it is exchanged in milliseconds. |
| `issueRefreshTokens` | `true` | Whether refresh tokens exist at all. `false` and every session ends with its access token. |

A refresh token is issued only to a client whose `grantTypes` include
`refresh_token`, and never on the `client_credentials` grant, where no user
consented to anything.

## What `ream configure` writes

```bash
ream configure @c9up/visa
```

Four things: `VISA_ISSUER` in `.env`, the provider in `reamrc.ts`,
`config/visa.ts` with a `MemoryStore` and a comment saying to replace it, and
the migrations for the five tables the atlas store reads —
`9000_create_visa_tables` and `9001_add_visa_client_secret_expiry`. A migration
already in the project is left alone. It fails before touching the project if
those migrations cannot be read — a provider registered and a config written
with no tables underneath is worse than stopping.

The store and the `/authorize` route stay yours — both are
decisions rather than boilerplate, and a generated guess at either is wrong in
a way that only shows up in production.

Once the provider is registered, the manager resolves by token and is typed:

```ts
const visa = await container.make('visa')   // VisaManager, not unknown
```

## Not here yet

OpenID Connect — `id_token`, discovery, JWKS, `/userinfo`. The `nonce` is
already carried through the authorization code for it.
