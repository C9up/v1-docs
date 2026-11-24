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
| `RemoteOptions` | interface | `{ ttlMs?, minRefetchMs?, now? }`: `ttlMs` (default 1 hour) is how long the discovery document and the key set are trusted before they are fetched again; `minRefetchMs` (default 5 minutes) is the shortest interval between two refetches for an unknown key |
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
| `assertResponseSucceeded` | function | `assertResponseSucceeded(response: XmlElement): void`; throws `E_TRANSIT_SAML_REJECTED` unless the status is Success |
| `validateResponse` | function | `validateResponse(response: XmlElement, expected: SamlResponseExpectations): void`; checks the response's own `Destination`, `Issuer` and `InResponseTo` |
| `assertionInside` | function | `assertionInside(signed: XmlElement, response: XmlElement): XmlElement`, the one assertion of the posted response, when the signed element is that assertion or the response itself |
| `SamlIdentity` | interface | `{ nameId, nameIdFormat, attributes: Record<string, string[]>, assertionId, notOnOrAfter, rememberUntil, sessionIndex }` |
| `SamlExpectations` | interface | `{ issuer, audience, recipient, inResponseTo?, clockSkewSeconds?, now? }` |
| `SamlResponseExpectations` | interface | `{ issuer, destination, inResponseTo?, signed }`; `signed` says the signature covers the response itself |
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
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors) |

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
| `issuer` | `string` | — | The issuer URL, as it appears in the tokens. Must be `https`; `http://localhost` is accepted for development |
| `clientId` | `string` | — | Client id |
| `clientSecret` | `string \| (() => string \| Promise<string>)` | — | Secret, or a function called at each token request |
| `callbackUrl` | `string` | — | Redirect URI |
| `scopes` | `string[]` | `['openid', 'profile', 'email']` | `openid` is added when missing |
| `authorizeParams` | `Record<string, string>` | — | `prompt`, `login_hint`, `acr_values`… |
| `userinfo` | `boolean` | `true` | Also call the userinfo endpoint when advertised |
| `leewaySeconds` | `number` | `60` | Clock drift tolerated on the id token |
| `cache` | `RemoteOptions` | — | Caching of the discovery document and signing keys. `ttlMs` is also the longest a key the provider withdrew keeps verifying tokens |

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
| [`E_TRANSIT_NOT_BOOTED`](/en/reference/errors#e-transit-not-booted) | `@c9up/transit/services/main` was read before the provider booted, or before `setTransit()` |
| [`E_TRANSIT_UNKNOWN_PROVIDER`](/en/reference/errors#e-transit-unknown-provider) | No provider of this name is registered. The message names only the provider asked for |
| [`E_TRANSIT_NOT_A_REDIRECT_PROVIDER`](/en/reference/errors#e-transit-not-a-redirect-provider) | `use()` / `begin()` named a directory (LDAP); call `authenticate()` |
| [`E_TRANSIT_NOT_A_DIRECTORY`](/en/reference/errors#e-transit-not-a-directory) | `directory()` / `authenticate()` named a redirect provider; call `begin()` |
| [`E_TRANSIT_BEGIN_UNSUPPORTED`](/en/reference/errors#e-transit-begin-unsupported) | `begin()` on a driver that has no `begin()` |
| [`E_TRANSIT_TOKEN_PROFILE_UNSUPPORTED`](/en/reference/errors#e-transit-token-profile-unsupported) | `userFromToken()` on a driver that cannot read a profile from a token |
| [`E_TRANSIT_USE_BEGIN`](/en/reference/errors#e-transit-use-begin) | `redirectUrl()` on a provider whose redirect needs a round trip (OAuth1, OpenID Connect, SAML); call `begin()` |
| [`E_TRANSIT_NO_AUTHORIZE_PARAMS`](/en/reference/errors#e-transit-no-authorize-params) | A customizer was passed to an OAuth1 or SAML sign-in, which has no per-request scopes or parameters |
| [`E_TRANSIT_STATE_REQUIRED`](/en/reference/errors#e-transit-state-required) | A callback ran without `expectedState` |
| [`E_OAUTH_STATE_MISMATCH`](/en/reference/errors#e-oauth-state-mismatch) | The callback's state is missing or differs from the stored one (possible CSRF): "Unable to verify re-redirect state" |
| [`E_OAUTH_MISSING_CODE`](/en/reference/errors#e-oauth-missing-code) | The callback came back without its grant (`code`, `oauth_verifier` for OAuth1, `SAMLResponse` for SAML), as when the user denied access; nothing is sent to the provider |
| [`E_TRANSIT_MISSING_SECRET`](/en/reference/errors#e-transit-missing-secret) | A flow lacks the secret it needs: the `secret` `begin()` returned (PKCE verifier, OAuth1 request-token secret), or the token secret an OAuth1 access token signs with |
| [`E_TRANSIT_PKCE_REQUIRED`](/en/reference/errors#e-transit-pkce-required) | A provider that requires PKCE got no code verifier |
| [`E_TRANSIT_TOKEN_EXCHANGE_FAILED`](/en/reference/errors#e-transit-token-exchange-failed) | The provider's token endpoint answered an HTTP error |
| [`E_TRANSIT_NO_ACCESS_TOKEN`](/en/reference/errors#e-transit-no-access-token) | The token response carries no access token |
| [`E_TRANSIT_PROFILE_REQUEST_FAILED`](/en/reference/errors#e-transit-profile-request-failed) | The provider's profile or userinfo endpoint answered an HTTP error |
| [`E_TRANSIT_INVALID_RESPONSE`](/en/reference/errors#e-transit-invalid-response) | A provider's response is not JSON, or not a JSON object |
| [`E_TRANSIT_NO_EMAIL`](/en/reference/errors#e-transit-no-email) | LinkedIn returned no email address; the application needs the `r_emailaddress` scope |
| [`E_TRANSIT_CALLBACK_NOT_CONFIRMED`](/en/reference/errors#e-transit-callback-not-confirmed) | An OAuth1 provider did not confirm the callback URL |
| [`E_TRANSIT_NO_REQUEST_TOKEN`](/en/reference/errors#e-transit-no-request-token) | An OAuth1 provider answered without a request token |
| [`E_TRANSIT_DISCOVERY_FAILED`](/en/reference/errors#e-transit-discovery-failed) | OpenID Connect discovery answered an HTTP error |
| [`E_TRANSIT_INSECURE_ISSUER`](/en/reference/errors#e-transit-insecure-issuer) | An OpenID Connect `issuer` is not an `https` URL (`http://localhost` excepted); raised when the driver is built |
| [`E_TRANSIT_INVALID_DISCOVERY`](/en/reference/errors#e-transit-invalid-discovery) | The discovery document lacks a required field, names another issuer, or gives an endpoint that is not `https` |
| [`E_TRANSIT_JWKS_FAILED`](/en/reference/errors#e-transit-jwks-failed) | Fetching the provider's JWKS failed, or it has no `keys` array. Keys older than `cache.ttlMs` are not used in its place |
| [`E_TRANSIT_UNKNOWN_SIGNING_KEY`](/en/reference/errors#e-transit-unknown-signing-key) | The id_token names a signing key the provider did not publish |
| [`E_TRANSIT_UNSUPPORTED_ALGORITHM`](/en/reference/errors#e-transit-unsupported-algorithm) | The provider declares only id_token algorithms transit refuses (asymmetric signatures are required) |
| [`E_TRANSIT_NO_ID_TOKEN`](/en/reference/errors#e-transit-no-id-token) | The token response carries no id_token; check that the `openid` scope is granted |
| [`E_TRANSIT_INVALID_ID_TOKEN`](/en/reference/errors#e-transit-invalid-id-token) | The id_token is refused: malformed, bad signature or algorithm, wrong issuer, audience or nonce, expired |
| [`E_TRANSIT_NO_USERINFO_ENDPOINT`](/en/reference/errors#e-transit-no-userinfo-endpoint) | A profile was asked from a token alone and the provider publishes no userinfo endpoint |
| [`E_TRANSIT_USERINFO_MISMATCH`](/en/reference/errors#e-transit-userinfo-mismatch) | The userinfo response describes another subject than the id_token |
| [`E_TRANSIT_SAML_REJECTED`](/en/reference/errors#e-transit-saml-rejected) | A SAML response or assertion is refused |
| [`E_TRANSIT_INVALID_SIGNATURE`](/en/reference/errors#e-transit-invalid-signature) | An XML signature does not verify, or is not one transit accepts |
| [`E_TRANSIT_INVALID_BER`](/en/reference/errors#e-transit-invalid-ber) | An LDAP message does not encode or decode as BER, or a DN, an attribute or a filter value handed to `LdapConnection` is not a string |
| [`E_TRANSIT_QUASAR_MISSING`](/en/reference/errors#e-transit-quasar-missing) | A Redis replay store names a quasar connection and `@c9up/quasar` is not installed, or its provider has not booted |
| [`E_TRANSIT_INCOMPLETE_CONNECTION`](/en/reference/errors#e-transit-incomplete-connection) | The quasar connection lacks a command the replay store issues |
| [`E_TRANSIT_FAKE_NOT_DECLARED`](/en/reference/errors#e-transit-fake-not-declared) | `FakeTransit` was asked for a provider no `willReturn()` declared |
| [`E_TRANSIT_FAKE_ASSERTION`](/en/reference/errors#e-transit-fake-assertion) | A `FakeTransit` assertion (`assertBegan`, `assertSignedIn`, `assertNobodySignedIn`) failed |
| [`E_TRANSIT_LDAP_ERROR`](/en/reference/errors#e-transit-ldap-error) | A directory refused or could not be reached; `resultCode` is the LDAP result code when the directory answered one (49 for invalid credentials, status 400) |

Each one is a class of the `errors` namespace and a `@c9up/flare` `Exception`, with status 500 except `E_OAUTH_STATE_MISMATCH` (400), `E_TRANSIT_UNKNOWN_PROVIDER` (404), and `E_TRANSIT_LDAP_ERROR` for invalid credentials, an empty login or password, or one that is not a string (400): branch on `error.code` or on `error instanceof errors.E_*`. `E_TRANSIT_PROTECTED_PARAMETER` carries the refused `parameter`.

The errors a visitor meets during a sign-in (`E_OAUTH_MISSING_CODE`, `E_OAUTH_STATE_MISMATCH`, `E_TRANSIT_UNKNOWN_PROVIDER`) extend `errors.HttpResponseException` and render themselves. Each has an `identifier` (`errors.<CODE>`, the translation key read through `ctx.i18n`), `getResponseMessage(error, ctx)` and `handle(error, ctx)`. `handle` negotiates with `request.accepts`: `{ errors: [{ message }] }` for JSON, a JSON:API error object for JSON:API, and otherwise a flash (`error`, and the message under its code) with a redirect back when the request has a session, or the message as text when it has none.

## Migration

- `TransitError` is gone: test `error.code`, or `error instanceof errors.E_TRANSIT_*` with `import { errors } from '@c9up/transit'`.
- `SamlError` becomes `errors.E_TRANSIT_SAML_REJECTED`; `E_TRANSIT_PROTECTED_PARAMETER` moves to `errors.E_TRANSIT_PROTECTED_PARAMETER`.
- `LdapError` becomes `errors.E_TRANSIT_LDAP_ERROR`: its `code` is now `'E_TRANSIT_LDAP_ERROR'`, and the LDAP result code moved to `resultCode` (`error.code === 49` becomes `error.resultCode === 49`).
- `E_TRANSIT_STATE_MISMATCH` is now `E_OAUTH_STATE_MISMATCH`, with the message "Unable to verify re-redirect state".
- A callback without its code raises `E_OAUTH_MISSING_CODE` before anything is sent to the provider, where it used to fail as `E_TRANSIT_TOKEN_EXCHANGE_FAILED`.
- `assertionInside(signed)` now takes the posted response too: call `assertionInside(signed, response)`. It answers the response's one direct `<Assertion>` child, and refuses a signed element that is neither that assertion nor the response.
- A SAML sign-in now refuses a signature that is not a direct child of the element it references, a signed element that is neither the posted `<Response>` nor its one `<Assertion>`, and any SAML element written under a `<ds:Signature>`. Identity providers do not send these shapes.
- `authenticate()` on a directory now refuses a login or a password that is not a string (an array or an object read from a request body) as invalid credentials: `E_TRANSIT_LDAP_ERROR`, `resultCode` 49, status 400. Nothing is sent to the directory. An array or an object used to be sent as an empty password.
- `LdapConnection.bind()` refuses a password that is not a non-empty string (`E_TRANSIT_LDAP_ERROR`), and `LdapConnection` refuses a DN, an attribute or a filter value that is not a string (`E_TRANSIT_INVALID_BER`). Convert the value to a string before you pass it.
- The OpenID Connect signing keys are now fetched again once they are older than `cache.ttlMs` (default 1 hour), where they used to be kept until a token named an unknown key. A key the provider withdrew stops verifying tokens within that time. Lower `cache.ttlMs` to shorten it. If the keys cannot be fetched then, the sign-in fails with `E_TRANSIT_JWKS_FAILED`.
- `oidc()` now refuses an `issuer` that is not `https` with `E_TRANSIT_INSECURE_ISSUER`, when the driver is built (at boot). `http://localhost` is still accepted. For a development provider on another host name, reach it as `http://localhost` (publish its port) or put TLS in front of it.
- A discovery document that gives an `authorization_endpoint`, `token_endpoint`, `jwks_uri` or `userinfo_endpoint` that is not `https` is now refused with `E_TRANSIT_INVALID_DISCOVERY`.
- A signed SAML `<Response>` must now carry a `Destination` equal to `callbackUrl` and an `<Issuer>` equal to `issuer`. On any response, a `Destination`, an `<Issuer>` or an `InResponseTo` that is present and differs is refused. Check that `callbackUrl` is exactly the ACS URL registered at the identity provider.

## See also

- [Social authentication](/en/guides/auth/social/)
- [Providers](/en/guides/auth/social/providers)
- [OpenID Connect](/en/guides/auth/social/oidc)
- [SAML 2.0](/en/guides/auth/social/saml)
- [LDAP and Active Directory](/en/guides/auth/social/ldap)
- [Testing and custom drivers](/en/guides/auth/social/testing)
