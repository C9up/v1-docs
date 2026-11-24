# Protecting resources

This guide covers protecting a resource with tokens:

- Protecting a resource
- Connected applications

## Protecting a resource

Declare the guard beside the others in `config/auth.ts`:

```ts
import { visaGuard } from '@c9up/visa'

export default defineConfig({
  default: 'visa',
  guards: {
    visa: visaGuard({
      store: () => visa.store,
      findUser: (id) => User.find(id),
    }),
  },
})
```

The authenticated user carries the token it was authenticated with:

```ts
const token = ctx.auth.user.currentAccessToken
token.abilities          // the token's scopes
token.allows('invoices.read')
token.authorize('invoices.write')   // throws E_UNAUTHORIZED_ACCESS
token.isExpired()
token.lastUsedAt
```

**A scope is not a permission.** The guard puts the token's scopes on
`currentAccessToken` and leaves `user.permissions` as `findUser` returned it. A
scope is chosen by the client and granted by consent, and consent never checks
the user's own rights — so a route that needs both checks both. Warden's
`@Permission` and `hasPermission` do: on a request made with a token they
require the user's permission **and** the token's scope (see
[Warden — abilities are not permissions](/en/guides/auth/access-tokens-guard#abilities-are-not-permissions)).

`findUser` runs on **every** request, deliberately: a token issued to an
account that has since been disabled stops working here, once, instead of
wherever each application remembers to check.

`createToken(user, abilities, { name, expiresInSeconds })` mints one directly
for a first-party client — name it with `tokenClientId` — and
`invalidateToken(token)` revokes one. `expiresInSeconds`, in the guard config or
per call, is a positive whole number of seconds; any other value throws
`E_VISA_INVALID_TTL`.

The lower-level form is still there for a resource server with no guard:

```ts
const grant = await visa.verify(bearerToken, new Date(), 'https://api.example/mcp')
if (!grant) return ctx.response.unauthorized({ error: 'invalid_token' })
```

### A resource server in another process (RFC 7662)

`verify()` reads the store. A resource server that does not share it asks
`/oauth/introspect` instead — as a client of its own, and only once it is
named:

```ts
// config/visa.ts
introspection: {
  resourceServers: ['api'],   // client ids, registered with a secret
}
```

Left out, introspection answers only the client a token was issued to, and
`{ active: false }` to everyone else — the same answer as for a token that does
not exist. A named resource server gets the real answer for any access token,
`aud` included, so it can refuse one minted for another resource (RFC 8707). Two
limits hold even for it: a public client never counts, since it authenticates
with nothing and naming it would open introspection to anyone who knows its id;
and refresh tokens stay with their own client, since one is never sent to a
resource server (RFC 6749 §1.5). Names come from this config only, so a client
that registered itself never gains it.

`token_type_hint` decides which table is read first, never which one is read:
a token sent with the wrong hint is still found (RFC 7662 §2.1).

### Telling a client where to authenticate (RFC 9728)

A 401 with nothing else in it is a dead end: the caller learns it needs a token
and nothing about where tokens come from. Declare the resource and the metadata
document is served:

```ts
// config/visa.ts
protectedResource: {
  resource: 'https://api.example/mcp',
  scopesSupported: ['profile'],
}
```

Then carry the challenge on the refusal:

```ts
response.header('www-authenticate', guard.challenge())
// Bearer resource_metadata="https://api.example/.well-known/oauth-protected-resource/mcp"
```

An MCP client walks from the 401 to that document to this server on its own.

### Binding a token to one server (RFC 8707)

A token with no stated audience is a token for everything. A client that sends
`resource=https://api.example/mcp` gets one bound to it, and
`verify(token, now, resource)` refuses one minted for somewhere else. The
authorization endpoint binds what the user was shown; an exchange may narrow
that list, never widen it. `resourcesSupported` in config turns an unknown
resource into `invalid_target` instead of something to mint for.

Tokens issued before a client started asking are unbound, and stay accepted
everywhere.

## Connected applications

What a user has authorised, and how they end it:

```ts
const apps = await visa.listAuthorizations(userId)
// [{ clientId, name, scopes, grantedAt, lastUsedAt?, active }]

await visa.revokeAuthorization(userId, clientId)
```

One row per **application**, not per token: a person authorised an application
once, and tokens come and go under that decision. An application whose tokens
have all expired still shows, marked inactive — "last used" matters most when
nothing is live, and hiding it would say an application never touched their
data when it did.

Revoking takes both kinds of token and then forgets the consent, in that order:
someone revoking in a hurry wants the sessions dead first.
