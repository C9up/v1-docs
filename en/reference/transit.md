# transit

`@c9up/transit`: federated sign-in through an authority the application does not own: OAuth2 and OAuth1 social providers, any OpenID Connect issuer, SAML 2.0 identity providers and LDAP or Active Directory. Guide: [Social authentication](/en/guides/auth/social/).

## Installation

```bash
pnpm add @c9up/transit
```

`ream configure @c9up/transit` registers the provider, writes `config/transit.ts` with a Google entry and adds `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to the environment files. A SAML replay store shared through Redis needs `@c9up/quasar`.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/transit` | `TransitManager`, the drivers, `defineConfig` and the provider factories, the SAML, XML, LDAP and Apple helpers, types |
| `@c9up/transit/config` | `defineConfig`, `socials`, `oidc`, `saml`, `ldap` and the config types |
| `@c9up/transit/provider` | `TransitProvider` (default export) |
| `@c9up/transit/services/main` | The application's `TransitManager` (default export) |
| `@c9up/transit/configure` | `configure()`, run by `ream configure @c9up/transit` |
| `@c9up/transit/testing` | `FakeTransit`, a `TransitManager` that answers sign-ins with declared users |

## Exports

### `@c9up/transit`

Manager and configuration:

| Export | Kind | Description |
|---|---|---|
| `TransitManager` | class | The configured providers, by name |
| `TransitProvider` | provider | Same class as `@c9up/transit/provider` |
| `TransitAppContext` | interface | `{ container, config }`, what the provider needs from the application |
| `defineConfig` | function | `defineConfig<T extends TransitConfig>(config: T): T` |
| `socials` | const | Factories for `apple`, `discord`, `facebook`, `github`, `google`, `linkedin`, `linkedinOpenidConnect`, `spotify`, `twitter` (OAuth1) and `twitterX` (OAuth2) |
| `oidc` | function | `oidc(config: OidcConfig): TransitDriverFactory`, any OpenID Connect provider from its issuer |
| `saml` | function | `saml(config: SamlConfig): TransitDriverFactory`, a SAML 2.0 identity provider |
| `ldap` | function | `ldap(config: LdapConfig): TransitDriverFactory`, an LDAP or Active Directory directory |
| `TransitConfig` | type | `Record<string, TransitProviderEntry>` |
| `TransitProviderEntry` | type | `TransitEntry \| TransitDriverFactory` |
| `TransitDriverFactory` | type | `() => TransitEntry`, built when the manager is |

Drivers:

| Export | Kind | Description |
|---|---|---|
| `Oauth2Driver` | class | Abstract base of the OAuth2 drivers; extend it for a custom provider |
| `Oauth1Driver` | class | Abstract base of the OAuth1 drivers |
| `OidcDriver` | class | `new OidcDriver(config: OidcConfig)`: endpoints and keys come from the issuer's discovery document; PKCE and nonce on every redirect |
| `SamlDriver` | class | `new SamlDriver(config: SamlConfig)`: redirect binding out, signed response posted back |
| `LdapDirectory` | class | `new LdapDirectory(config: LdapConfig)`, a `DirectoryDriver` |
| `AppleDriver` | class | `new AppleDriver(config: AppleConfig)`, Sign in with Apple over OpenID Connect |
| `GoogleDriver`, `GitHubDriver`, `DiscordDriver`, `FacebookDriver`, `SpotifyDriver`, `LinkedInDriver`, `LinkedInOpenidConnectDriver`, `TwitterXDriver` | class | `new …(config: OAuthConfig)`, OAuth2 providers |
| `TwitterDriver` | class | `new TwitterDriver(config: OAuthConfig)`, X over OAuth1; reached through `begin()` |
| `createCodeVerifier` | function | `createCodeVerifier(): string`, a PKCE verifier (32 random bytes, base64url) |
| `AuthorizeRequest` | class | What a `begin()` / `redirect()` customizer edits |
| `AuthorizeCustomizer` | type | `(request: AuthorizeRequest) => void` |
| `assertOAuthState` | function | `assertOAuthState(state: string \| undefined, expectedState: string \| undefined): void`; throws unless both are present and equal (constant time) |
| `isDirectory` | function | `isDirectory(entry: TransitEntry): entry is DirectoryDriver` |

Types:

| Export | Kind | Description |
|---|---|---|
| `TransitDriver` | interface | A redirect provider: `redirectUrl`, `begin?`, `callback`, `userFromToken?` |
| `DirectoryDriver` | interface | `{ authenticate(username: string, password: string): Promise<TransitUser> }` |
| `TransitEntry` | type | `TransitDriver \| DirectoryDriver` |
| `TransitUser` | interface | `{ id, email, name, nickName?, avatarUrl?, emailVerificationState?, raw }` |
| `EmailVerificationState` | type | `'verified' \| 'unverified' \| 'unsupported'`; `unsupported` when absent |
| `OAuthToken` | interface | `{ accessToken, refreshToken?, expiresIn?, tokenSecret? }`; `tokenSecret` for OAuth1 |
| `RedirectRequest` | interface | `{ url: string; state: string; secret?: string }`, what to keep until the callback |
| `OAuthConfig` | interface | `{ clientId, clientSecret, callbackUrl, scopes?, authorizeParams? }` |
| `OidcConfig` | interface | Options of `oidc()` |
| `SamlConfig` | interface | Options of `saml()` |
| `LdapConfig` | interface | Options of `ldap()` |
| `AppleConfig` | interface | `AppleKey & { callbackUrl; scopes?; authorizeParams? }` |
| `OidcMetadata` | interface | The discovery document fields read: `issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`, `userinfo_endpoint?`, … |
| `RemoteOptions` | interface | `{ ttlMs?, minRefetchMs?, now? }`, caching of the discovery document and keys |
| `IdTokenClaims` | interface | `{ iss, sub, aud, exp, iat?, nonce?, azp?, [claim: string]: unknown }` |
| `Jwk` | interface | `{ kty, kid?, alg?, use?, [key: string]: unknown }` |
| `SupportedAlg` | type | `'RS256' \| 'RS384' \| 'RS512' \| 'PS256' \| 'PS384' \| 'PS512' \| 'ES256' \| 'ES384' \| 'ES512'` |

Apple, SAML, XML and LDAP helpers:

| Export | Kind | Description |
|---|---|---|
| `appleClientSecret` | function | `appleClientSecret(key: AppleKey, now?: number): string`, the ES256 JWT Apple takes as client secret (valid 5 minutes) |
| `parseAppleUser` | function | `parseAppleUser(value: unknown): { name: string } \| undefined`, the name Apple posts on the first sign-in only |
| `AppleKey` | interface | `{ clientId, teamId, keyId, privateKey }` |
| `validateAssertion` | function | `validateAssertion(assertion: XmlElement, expected: SamlExpectations): SamlIdentity` |
| `assertResponseSucceeded` | function | `assertResponseSucceeded(response: XmlElement): void`; throws `SamlError` unless the status is Success |
| `assertionInside` | function | `assertionInside(signed: XmlElement): XmlElement`, the assertion a signature covers |
| `SamlIdentity` | interface | `{ nameId, nameIdFormat, attributes: Record<string, string[]>, assertionId, notOnOrAfter, rememberUntil, sessionIndex }` |
| `SamlExpectations` | interface | `{ issuer, audience, recipient, inResponseTo?, clockSkewSeconds?, now? }` |
| `SamlError` | error | A SAML response refused |
| `SAML_PROTOCOL_NS`, `SAML_ASSERTION_NS` | const | The SAML 2.0 protocol and assertion namespaces |
| `AssertionReplayStore` | interface | `{ remember(assertionId: string, expiresAt: number): Promise<boolean> }`; `false` for an assertion already seen |
| `MemoryAssertionReplayStore` | class | Remembers assertions in this process |
| `RedisAssertionReplayStore` | class | `new RedisAssertionReplayStore(client: ReplayRedisResolver, options?: { prefix?: string })`; prefix `transit:saml:assertion:` |
| `replayStores` | const | `replayStores.memory()` and `replayStores.redis({ connection, prefix? })`; `connection` is a client, a resolver, or a `@c9up/quasar` connection name |
| `ReplayRedisClient` | interface | `{ set(key, value, ...args): Promise<unknown> }` |
| `ReplayRedisResolver` | type | `ReplayRedisClient \| (() => ReplayRedisClient \| Promise<ReplayRedisClient>)` |
| `parseXml` | function | `parseXml(source: string, limits?): XmlElement`; refuses a DOCTYPE, entity references other than the predefined and numeric ones, and malformed input with `E_TRANSIT_INVALID_XML` |
| `canonicalize` | function | `canonicalize(element: XmlElement, options?: CanonicalizeOptions): string`, exclusive XML canonicalization |
| `CanonicalizeOptions` | interface | `{ inclusivePrefixes?, withComments?, omit? }` |
| `walk` | function | `walk(element: XmlElement): Generator<XmlElement>` |
| `childrenNamed` | function | `childrenNamed(element: XmlElement, namespaceUri: string, local: string): XmlElement[]` |
| `findByAttribute` | function | `findByAttribute(root: XmlElement, attribute: string, value: string): XmlElement \| undefined` |
| `textOf` | function | `textOf(element: XmlElement): string` |
| `resolvePrefix` | function | `resolvePrefix(element: XmlElement, prefix: string): string \| undefined` |
| `XML_NS` | const | `'http://www.w3.org/XML/1998/namespace'` |
| `XmlElement`, `XmlNode`, `XmlAttribute`, `XmlNamespace` | interface / type | The parsed XML tree |
| `LdapConnection` | class | `new LdapConnection(options: LdapOptions)`: `connect()`, `bind(dn, password)`, `search({ base, filter, attributes?, scope?, sizeLimit? })`, `close()` |
| `LdapOptions` | interface | `{ url, allowInsecure?, timeoutMs?, rejectUnauthorized? }` |
| `LdapFilter` | type | `{ equals: [attribute, value] } \| { present } \| { and } \| { or } \| { not }` |
| `LdapEntry` | interface | `{ dn: string; attributes: Record<string, string[]> }` |
| `LdapError` | error | A directory refusal; `code` is the LDAP result code |
| `E_TRANSIT_PROTECTED_PARAMETER` | error | A customizer touched a parameter the sign-in owns |

### `TransitManager`

| Member | Signature | Description |
|---|---|---|
| `begin` | `begin(name: string, customize?: AuthorizeCustomizer): Promise<RedirectRequest>`<br>`begin(name: string, state?: string, customize?: AuthorizeCustomizer): Promise<RedirectRequest>` | Start a sign-in through any redirect provider: mints the state, fetches a request token where needed, returns the `secret` to keep |
| `redirect` | `redirect(name: string, state?: string, secret?: string, customize?: AuthorizeCustomizer): string` | The redirect URL, for a provider that can build it offline; OpenID Connect, SAML and OAuth1 throw |
| `callback` | `callback(name: string, code: string, state?: string, expectedState?: string, secret?: string): Promise<{ user: TransitUser; token: OAuthToken }>` | Finish a sign-in; throws without `expectedState` or when `state` differs |
| `authenticate` | `authenticate(name: string, username: string, password: string): Promise<TransitUser>` | Verify a login against a directory |
| `userFromToken` | `userFromToken(name: string, accessToken: string, tokenSecret?: string): Promise<TransitUser>` | Read the profile behind a token already held |
| `use` | `use(name: string): TransitDriver` | The redirect provider under `name`; throws for a directory or an unknown name |
| `directory` | `directory(name: string): DirectoryDriver` | The directory under `name` |
| `register` | `register(name: string, driver: TransitEntry): void` | Add a provider |
| `registeredDrivers` | `readonly registeredDrivers: string[]` | The configured names |

```ts
const { url, state, secret } = await transit.begin('github', (request) => request.mergeScopes(['repo']))
// keep state and secret in the session, redirect to url; then, on the callback:
const { user } = await transit.callback('github', code, queryState, state, secret)
```

### `AuthorizeRequest`

| Member | Signature | Description |
|---|---|---|
| `scopes` | `scopes(scopes: string[]): this` | Ask for exactly these scopes |
| `mergeScopes` | `mergeScopes(scopes: string[]): this` | Ask for these scopes as well |
| `clearScopes` | `clearScopes(): this` | Ask for no scope; OpenID Connect still sends `openid` |
| `transformScopes` | `transformScopes(callback: (scopes: string[]) => string[]): this` | Transform the scopes later passed to `scopes()` and `mergeScopes()` |
| `param` | `param(key: string, value: string \| number \| boolean): this` | Add or replace an authorize parameter |
| `clearParam` | `clearParam(key: string): this` | Drop an authorize parameter |
| `getScopes` | `getScopes(): string[]` | Scopes this redirect asks for |
| `getParams` | `getParams(): Record<string, string>` | Parameters set so far |

`param()` and `clearParam()` throw `E_TRANSIT_PROTECTED_PARAMETER` for `scope`, `state`, `nonce`, `code_challenge`, `code_challenge_method`, `client_id`, `redirect_uri` and `response_type`. A customizer works on OAuth2 and OpenID Connect providers; the others refuse it.

### `TransitDriver`

| Member | Signature | Description |
|---|---|---|
| `redirectUrl` | `redirectUrl(state?: string, secret?: string, customize?: AuthorizeCustomizer): string` | The redirect URL; `secret` is the PKCE verifier for a provider that requires one |
| `begin` | `begin?(state?: string, customize?: AuthorizeCustomizer): Promise<RedirectRequest>` | The redirect URL plus the state and secret to keep |
| `callback` | `callback(code: string, state?: string, expectedState?: string, secret?: string): Promise<{ user: TransitUser; token: OAuthToken }>` | Exchange the code; checks the state round trip |
| `userFromToken` | `userFromToken?(accessToken: string, tokenSecret?: string): Promise<TransitUser>` | The profile behind a held token |

A custom OAuth2 driver extends `Oauth2Driver` and sets `provider`, `authorizeUrl`, `accessTokenUrl`, `userInfoUrl`, `defaultScopes` and `mapUser(raw)`; `requiresPkce`, `tokenAuth` (`'body'` or `'basic'`), `authorizeParams()` and `userInfoParams()` are optional. A custom OAuth1 driver extends `Oauth1Driver` and sets `provider`, `requestTokenUrl`, `authorizeUrl`, `accessTokenUrl`, `userInfoUrl` and `mapUser(raw)`.

### `@c9up/transit/config`

| Export | Kind | Description |
|---|---|---|
| `defineConfig`, `socials`, `oidc`, `saml`, `ldap` | function / const | Same as in `@c9up/transit` |
| `TransitConfig`, `TransitDriverFactory`, `TransitProviderEntry` | type | Same as in `@c9up/transit` |

### `@c9up/transit/provider`

| Export | Kind | Description |
|---|---|---|
| `default` | provider | `TransitProvider`: builds a `TransitManager` from the `transit` config (calling each factory) and fills `@c9up/transit/services/main` |
| `TransitAppContext` | interface | `{ container, config }` |

### `@c9up/transit/services/main`

| Export | Kind | Description |
|---|---|---|
| `default` | const | `transit: TransitManager`, the application's manager once `TransitProvider` booted; a member read before throws |

### `@c9up/transit/configure`

| Export | Kind | Description |
|---|---|---|
| `configure` | function | `configure(codemods): Promise<void>`: adds the Google environment variables, registers `@c9up/transit/provider`, writes `config/transit.ts` |

### `@c9up/transit/testing`

| Export | Kind | Description |
|---|---|---|
| `FakeTransit` | class | A `TransitManager` that answers with declared users; the state and secret round trips are enforced |
| `FakeIdentity` | interface | `Partial<TransitUser>`, what a test declares |
| `BegunSignIn` | interface | `{ name, state, secret, authorize? }` |
| `CompletedSignIn` | interface | `{ name, user }` |

| Member | Signature | Description |
|---|---|---|
| `willReturn` | `willReturn(name: string, identity?: FakeIdentity, token?: OAuthToken): this` | Declare who comes back from `name`; missing fields are filled in |
| `willAccept` | `willAccept(name: string, username: string, password: string): this` | Declare the credentials a directory accepts; without it any pair is accepted |
| `begun` | `readonly begun: BegunSignIn[]` | Every `begin()`, oldest first |
| `signedIn` | `readonly signedIn: CompletedSignIn[]` | Every completed sign-in |
| `assertBegan` | `assertBegan(name: string): void` | A sign-in through `name` started |
| `assertSignedIn` | `assertSignedIn(name: string): void` | A sign-in through `name` completed |
| `assertNobodySignedIn` | `assertNobodySignedIn(): void` | No sign-in completed |
| `lastUser` | `lastUser(): TransitUser \| undefined` | The user of the last completed sign-in |
| `reset` | `reset(): void` | Forget the record, keep the declarations |

## Configuration

`config/transit.ts`, read under the `transit` key. Each key is a name of your choice; `use(name)` and `begin(name)` take that key.

```ts
import { defineConfig, oidc, socials } from '@c9up/transit'
import env from '#start/env'

export default defineConfig({
  google: socials.google({
    clientId: env.get('GOOGLE_CLIENT_ID'),
    clientSecret: env.get('GOOGLE_CLIENT_SECRET'),
    callbackUrl: 'https://acme.test/auth/google/callback',
  }),
  work: oidc({
    issuer: 'https://id.acme.com',
    clientId: env.get('OIDC_CLIENT_ID'),
    clientSecret: env.get('OIDC_CLIENT_SECRET'),
    callbackUrl: 'https://acme.test/auth/work/callback',
  }),
})
```

`OAuthConfig` (social providers):

| Option | Type | Default | Description |
|---|---|---|---|
| `clientId` | `string` | — | The application's client id at the provider |
| `clientSecret` | `string` | — | Its secret |
| `callbackUrl` | `string` | — | Where the provider sends the user back |
| `scopes` | `string[]` | per provider | Google `openid email profile`, GitHub `read:user user:email`, Discord `identify email`, Facebook `email`, Spotify `user-read-email`, LinkedIn `r_liteprofile r_emailaddress`, LinkedIn OpenID Connect `openid profile email`, X (OAuth2) `tweet.read users.read users.email` |
| `authorizeParams` | `Record<string, string>` | — | Extra authorize URL parameters, applied after the driver's |

`OidcConfig`:

| Option | Type | Default | Description |
|---|---|---|---|
| `issuer` | `string` | — | The issuer URL, as it appears in the tokens |
| `clientId` | `string` | — | Client id |
| `clientSecret` | `string \| (() => string \| Promise<string>)` | — | Secret, or a function called at each token request |
| `callbackUrl` | `string` | — | Redirect URI |
| `scopes` | `string[]` | `['openid', 'profile', 'email']` | `openid` is added when missing |
| `authorizeParams` | `Record<string, string>` | — | `prompt`, `login_hint`, `acr_values`… |
| `userinfo` | `boolean` | `true` | Also call the userinfo endpoint when advertised |
| `leewaySeconds` | `number` | `60` | Clock drift tolerated on the id token |
| `cache` | `RemoteOptions` | — | Caching of the discovery document and signing keys |

`SamlConfig`:

| Option | Type | Default | Description |
|---|---|---|---|
| `entityId` | `string` | — | This application's entity id |
| `callbackUrl` | `string` | — | This application's ACS URL |
| `issuer` | `string` | — | The identity provider's entity id |
| `signOnUrl` | `string` | — | The identity provider's sign-on endpoint |
| `certificates` | `string[]` | — | The identity provider's signing certificates, from its metadata |
| `nameIdFormat` | `string` | — | Name identifier format to ask for |
| `clockSkewSeconds` | `number` | `60` | Clock drift tolerated |
| `replayStore` | `AssertionReplayStore \| (() => AssertionReplayStore)` | memory | Where used assertions are remembered; in production one must be set |
| `claims` | `{ email?; name?; nickName? }` | — | Attribute names when not the usual ones |
| `trustEmail` | `boolean` | `false` | Mark every asserted address `verified` |
| `trustedEmailDomains` | `string[]` | — | Domains whose addresses are `verified`; others are `unverified` |

`LdapConfig`:

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | — | `ldaps://…` |
| `baseDn` | `string` | — | Where to search from |
| `loginAttribute` | `string` | — | `uid`, `sAMAccountName`, `userPrincipalName`… |
| `bindDn`, `bindPassword` | `string` | — | The account the search runs as; omitted, the search is anonymous |
| `filter` | `LdapFilter` | — | Extra conditions, ANDed with the login attribute |
| `attributes` | `string[]` | the mapped ones | Attributes to read |
| `claims` | `{ email?; name?; nickName? }` | — | Attribute names when not the usual ones |
| `allowInsecure` | `boolean` | `false` | Allow a plaintext connection |
| `rejectUnauthorized` | `boolean` | `true` | Refuse a server certificate that does not check out |
| `timeoutMs` | `number` | `10000` | Wait for the connection and for each reply |

`AppleConfig` takes `clientId`, `teamId`, `keyId`, `privateKey` (the `.p8` contents), `callbackUrl`, `scopes` (default `['name', 'email']`) and `authorizeParams`.

## Container bindings

| Token | Resolves to |
|---|---|
| `TransitManager` (class) | The manager built from the `transit` config |
| `'transit'` | The same `TransitManager` |

`'transit'` is declared in `ContainerBindings`.

## Errors

| Code | Raised when |
|---|---|
| [`E_TRANSIT_INVALID_XML`](/en/reference/errors#e-transit-invalid-xml) | A provider answered XML that cannot be parsed or uses a refused construct (a DOCTYPE, an entity reference) |
| [`E_TRANSIT_PROTECTED_PARAMETER`](/en/reference/errors#e-transit-protected-parameter) | A customizer set or cleared a parameter the sign-in owns, or `scope` through `param()` |

A refused SAML response throws `SamlError`, a directory refusal `LdapError`, and a state mismatch, an unknown provider name or a missing `expectedState` a plain `Error`.

## See also

- [Social authentication](/en/guides/auth/social/)
- [Providers](/en/guides/auth/social/providers)
- [OpenID Connect](/en/guides/auth/social/oidc)
- [SAML 2.0](/en/guides/auth/social/saml)
- [LDAP and Active Directory](/en/guides/auth/social/ldap)
- [Testing and custom drivers](/en/guides/auth/social/testing)
