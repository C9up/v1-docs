# visa

`@c9up/visa`: an OAuth 2.1 authorization server that issues tokens to other applications on a user's behalf: authorization code with PKCE, refresh rotation, client credentials, revocation, introspection and client registration, on a store contract. Guide: [OAuth server](/en/guides/oauth-server/introduction).

## Installation

```bash
pnpm add @c9up/visa
```

`ream configure @c9up/visa` registers the provider, writes `config/visa.ts`, adds `VISA_ISSUER` to the environment files and writes the migrations of the tables `AtlasStore` uses. It writes neither a production store nor the `/authorize` route: both are yours.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/visa` | `VisaManager`, the protocol functions, `VisaGuard`, both stores, errors and types |
| `@c9up/visa/config` | `defineConfig`, `VisaConfigInput` |
| `@c9up/visa/provider` | `VisaProvider` (default export) |
| `@c9up/visa/services/main` | The application's `VisaManager` (default export) |
| `@c9up/visa/configure` | `configure()`, run by `ream configure @c9up/visa` |
| `@c9up/visa/stores/memory` | `MemoryStore` |
| `@c9up/visa/stores/atlas` | `AtlasStore` and its database types |
| `@c9up/visa/types` | The record types (`Client`, `AccessToken`, …) |
| `@c9up/visa/testing` | `testVisa()`, a real server on a memory store with a registered client |

## Exports

### `@c9up/visa`

The server:

| Export | Kind | Description |
|---|---|---|
| `VisaManager` | class | The authorization server: clients, authorize, consent, token, introspection, revocation, verification |
| `VisaConfig` | interface | `VisaManager` options (see Configuration) |
| `AuthorizationOutcome` | type | `{ type: 'redirect'; url } \| { type: 'consent'; request: ValidatedRequest } \| { type: 'error'; error: errors.E_VISA_OAUTH_ERROR }` |
| `ConsentTicket` | interface | `{ id: string; userId: string; expiresAt: number; request: AuthorizationRequest }`, kept in the session between the consent page and its answer |
| `defineConfig` | function | Same as `@c9up/visa/config` |
| `VisaConfigInput` | interface | Same as `@c9up/visa/config` |
| `visa` | const | Same as the default export of `@c9up/visa/services/main` |
| `setVisa` | function | `setVisa(manager: VisaManager): void`, seat the manager behind `visa` without the provider |
| `getVisa` | function | `getVisa(): VisaManager \| undefined` |
| `clearVisa` | function | `clearVisa(): void`, forget the seated manager |

Protocol functions, each also reachable through `VisaManager`:

| Export | Kind | Description |
|---|---|---|
| `validateAuthorizationRequest` | function | `validateAuthorizationRequest(request: UntrustedAuthorizationRequest, store: VisaStore, options?: AuthorizeOptions): Promise<ValidatedRequest>`; throws `errors.E_VISA_UNREDIRECTABLE` or `errors.E_VISA_OAUTH_ERROR` |
| `issueAuthorizationCode` | function | `issueAuthorizationCode(validated: ValidatedRequest, userId: string, store: VisaStore, options?: AuthorizeOptions, now?: Date): Promise<string>`; the code lives `codeTtlSeconds` (30 s) |
| `successRedirect` | function | `successRedirect(validated: ValidatedRequest, code: string): string` |
| `errorRedirect` | function | `errorRedirect(redirectUri: string, error: errors.E_VISA_OAUTH_ERROR, state?: string): string` |
| `token` | function | `token(request: TokenRequest, credentials: ClientCredentials, store: VisaStore, options?: TokenOptions, now?: Date): Promise<TokenResponse>` |
| `introspect` | function | `introspect(request, credentials, store, now?, issuer?, options?: IntrospectionOptions): Promise<IntrospectionResponse>` |
| `revoke` | function | `revoke(request, credentials, store, now?): Promise<void>` |
| `verifyAccessToken` | function | `verifyAccessToken(presented: string, store: Pick<VisaStore, 'findAccessToken'>, now?: Date, resource?: string)`: `{ clientId, userId?, scopes, expiresAt, lastUsedAt?, audience? }` or `null` |
| `validateRegistration` | function | `validateRegistration(request: ClientRegistrationRequest, options: RegistrationOptions, presentedToken?: string)`: the client's `redirectUris`, `grantTypes`, `scopes`, `tokenEndpointAuthMethod` and `name` |
| `registrationResponse` | function | `registrationResponse(client: Client, issuedAt: Date, secret: string \| undefined): ClientRegistrationResponse` |
| `readCredentials` | function | `readCredentials(input: { authorization?: string; body: Record<string, unknown> }): ClientCredentials`; refuses a request using two methods |
| `authenticateClient` | function | `authenticateClient(credentials: ClientCredentials, load: (id: string) => Promise<Client \| null>, now?: Date): Promise<Client>`; every failure is `invalid_client` |
| `assertGrantAllowed` | function | `assertGrantAllowed(client: Client, grant: GrantType): void` |
| `resolveScopes` | function | `resolveScopes(requested: string \| undefined, client: Client): string[]`; absent gives the client's scopes, an unregistered one is refused |
| `redirectUriMatches` | function | `redirectUriMatches(candidate: string, registered: readonly string[]): boolean`; exact match, port free on loopback |
| `readResourceParameter` | function | `readResourceParameter(value: unknown): string[]` |
| `validateResources` | function | `validateResources(requested: readonly string[], accepted?: readonly string[]): string[]`; refuses with `invalid_target` |
| `narrowResources` | function | `narrowResources(requested: readonly string[], granted: readonly string[]): string[]` |
| `audienceAllows` | function | `audienceAllows(audience: readonly string[] \| undefined, resource: string \| undefined): boolean` |
| `protectedResourceMetadata` | function | `protectedResourceMetadata(options: ProtectedResourceOptions): ProtectedResourceMetadata` |
| `protectedResourceMetadataUrl` | function | `protectedResourceMetadataUrl(resource: string): string`, the well-known URL of a resource |
| `wwwAuthenticate` | function | `wwwAuthenticate(options?: ChallengeOptions): string`, the `WWW-Authenticate` value of a 401 |
| `assertResourceIdentifier` | function | `assertResourceIdentifier(resource: string): void`; an absolute URI without fragment |
| `PROTECTED_RESOURCE_PATH` | const | `'/.well-known/oauth-protected-resource'` |
| `randomToken` | function | `randomToken(bytes?: number): string`, 32 random bytes in base64url by default |
| `sha256` | function | `sha256(value: string): string`, base64url, the PKCE `S256` transform |
| `hashSecret` | function | `hashSecret(secret: string): string`, what the store keeps for a token or a secret |
| `secretMatches` | function | `secretMatches(candidate: string, stored: string): boolean`, constant time |

Guard, stores and errors:

| Export | Kind | Description |
|---|---|---|
| `visaGuard` | function | `visaGuard(config: VisaGuardConfig): VisaGuard`, a warden guard that authenticates visa access tokens |
| `VisaGuard` | class | The guard (see below) |
| `VisaAccessToken` | class | The token a guard puts on `user.currentAccessToken` |
| `VisaGuardConfig` | interface | Options of `visaGuard()` |
| `GuardUser` | interface | `{ id: string; roles?; permissions?; currentAccessToken?: VisaAccessToken; [key: string]: unknown }` |
| `GuardResult` | interface | `{ authenticated: boolean; user?: GuardUser; error?: string }` |
| `GuardClientResponse` | interface | `{ headers?: Record<string, string>; session?: Record<string, unknown> }` |
| `GuardStore` | type | `Pick<VisaStore, 'findAccessToken' \| 'touchAccessToken' \| 'saveAccessToken' \| 'revokeAccessToken'>` |
| `VisaStore` | interface | The store contract (see below) |
| `MemoryStore` | class | Same as `@c9up/visa/stores/memory` |
| `AtlasStore` | class | Same as `@c9up/visa/stores/atlas` |
| `AtlasDb`, `AtlasQuery`, `AtlasStoreTables` | interface | Same as `@c9up/visa/stores/atlas` |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors) |
| `ProtocolErrorCode` | type | Union of the four code types below |
| `AuthorizationErrorCode` | type | `'invalid_request' \| 'unauthorized_client' \| 'access_denied' \| 'unsupported_response_type' \| 'invalid_scope' \| 'invalid_target' \| 'server_error' \| 'temporarily_unavailable'` |
| `TokenErrorCode` | type | `'invalid_request' \| 'invalid_client' \| 'invalid_grant' \| 'unauthorized_client' \| 'unsupported_grant_type' \| 'invalid_scope' \| 'invalid_target'` |
| `RegistrationErrorCode` | type | `'invalid_redirect_uri' \| 'invalid_client_metadata' \| 'invalid_software_statement' \| 'unapproved_software_statement'` |
| `BearerErrorCode` | type | `'invalid_token'` |

Request and option types:

| Export | Kind | Description |
|---|---|---|
| `AuthorizationRequest` | interface | `{ response_type?, client_id?, redirect_uri?, scope?, state?, code_challenge?, code_challenge_method?, nonce?, prompt?, resource?: string \| string[] }` |
| `UntrustedAuthorizationRequest` | type | The same keys, each `unknown`, as a query parser hands them |
| `ValidatedRequest` | interface | `{ client, redirectUri, redirectUriProvided, scopes, state, codeChallenge, codeChallengeMethod, nonce, resources }` |
| `AuthorizeOptions` | interface | `{ codeTtlSeconds?, resourcesSupported?, allowPlainChallenge? }` |
| `TokenOptions` | interface | `{ accessTokenTtlSeconds?, refreshTokenTtlSeconds?, issueRefreshTokens?, resourcesSupported? }` |
| `TokenRequest` | type | `Record<string, unknown>`, the token request body |
| `ClientCredentials` | interface | `{ clientId?, clientSecret?, method?: ClientAuthMethod, … }` |
| `IntrospectionOptions` | interface | `{ resourceServers?: readonly string[] }` |
| `RegistrationOptions` | interface | `{ enabled?, initialAccessToken?, scopes?, grantTypes?, secretTtlSeconds? }` |
| `ClientRegistrationRequest` | interface | The registration body: `redirect_uris`, `token_endpoint_auth_method`, `grant_types`, `client_name`, `scope`, … |
| `ClientRegistrationResponse` | interface | The 201 body: `client_id`, `client_secret?`, `client_id_issued_at`, `client_secret_expires_at?`, … |
| `ProtectedResourceOptions` | interface | `{ resource, authorizationServers?, scopesSupported?, bearerMethodsSupported?, resourceName?, resourceDocumentation? }` |
| `ProtectedResourceMetadata` | interface | The metadata document: `resource`, `authorization_servers?`, `scopes_supported?`, … |
| `ChallengeOptions` | interface | `{ resourceMetadata?, resource?, error?, errorDescription?, scope? }` |
| `Client`, `AuthorizationCode`, `AccessToken`, `RefreshToken`, `Consent`, `AuthorizedApplication`, `TokenResponse`, `IntrospectionResponse`, `ClientAuthMethod`, `GrantType` | type | Same as `@c9up/visa/types` |

### `VisaManager`

`new VisaManager(config: VisaConfig)`. The constructor checks the issuer and the registration settings.

| Member | Signature | Description |
|---|---|---|
| `issuer` | `readonly issuer: string` | The issuer, trailing slashes removed |
| `store` | `readonly store: VisaStore` | The configured store |
| `registerClient` | `registerClient(input: { id: string; name: string; redirectUris: string[]; grantTypes?: GrantType[]; scopes?: string[]; tokenEndpointAuthMethod?: ClientAuthMethod; trusted?: boolean; secretExpiresAt?: Date }): Promise<{ client: Client; secret?: string }>` | Register a client; the secret is returned once and only its hash is stored. `none` creates a public client without a secret |
| `register` | `register(request: ClientRegistrationRequest, presentedToken?: string, now?: Date): Promise<ClientRegistrationResponse>` | A client registering itself; refused unless `registration.enabled` |
| `authorize` | `authorize(request: UntrustedAuthorizationRequest, userId: string \| undefined): Promise<AuthorizationOutcome>` | Check an authorization request and decide: redirect, ask consent, or show an error |
| `grant` | `grant(validated: ValidatedRequest, userId: string, now?: Date): Promise<string>` | The user agreed: record the consent, mint the code, return the redirect URL |
| `deny` | `deny(validated: ValidatedRequest): string` | The redirect URL carrying `access_denied` |
| `consentTicket` | `consentTicket(validated: ValidatedRequest, userId: string, now?: Date): ConsentTicket` | A ticket for the consent page, valid `consentTicketTtlSeconds` |
| `redeemConsentTicket` | `redeemConsentTicket(ticket: unknown, presentedId: unknown, userId: string, now?: Date): Promise<ValidatedRequest \| null>` | The request the ticket was shown for, validated again; `null` for anything wrong |
| `token` | `token(body: Record<string, unknown>, credentials: ClientCredentials, now?: Date): Promise<TokenResponse>` | The token endpoint |
| `introspect` | `introspect(body: Record<string, unknown>, credentials: ClientCredentials, now?: Date): Promise<IntrospectionResponse>` | The introspection endpoint; an inactive token is only `{ active: false }` |
| `revoke` | `revoke(body: Record<string, unknown>, credentials: ClientCredentials, now?: Date): Promise<void>` | The revocation endpoint |
| `verify` | `verify(presented: string, now?: Date, resource?: string)` | What a resource server calls per request; same result as `verifyAccessToken` |
| `listAuthorizations` | `listAuthorizations(userId: string, now?: Date): Promise<AuthorizedApplication[]>` | Every application the user authorised, expired ones included |
| `revokeAuthorization` | `revokeAuthorization(userId: string, clientId: string, now?: Date): Promise<void>` | Revoke the application's tokens for the user, then forget the consent |
| `readCredentials` | `readCredentials(input: { authorization?: string; body: Record<string, unknown> }): ClientCredentials` | Client credentials from the `Authorization` header or the body |

### `VisaGuard`

`visaGuard(config)` builds it. It authenticates a bearer access token and never a password.

| Member | Signature | Description |
|---|---|---|
| `name` | `readonly name: string` | Guard name, `'visa'` by default |
| `verify` | `verify(presented: string): Promise<GuardResult>` | Authenticate an access token; the user comes from `findUser`, or `findClientSubject` for a client-credentials token |
| `authenticate` | `authenticate(): Promise<GuardResult>` | Throws: this guard takes no credentials |
| `createToken` | `createToken(user: { id: string } \| string, abilities?: string[], options?: { name?: string; expiresInSeconds?: number }): Promise<VisaAccessToken>` | Mint a token for `user` under `tokenClientId`; `abilities` defaults to `['*']` |
| `invalidateToken` | `invalidateToken(presented: string): Promise<boolean>` | Revoke a token; `true` when it existed |
| `authenticateAsClient` | `authenticateAsClient(user, abilities?, options?): Promise<GuardClientResponse>` | The `Authorization` header a test client sends to be `user` |
| `challenge` | `challenge(options?: { error?: string; scope?: readonly string[] }): string` | The `WWW-Authenticate` value of a 401 from this guard |

`VisaAccessToken` carries `clientId`, `userId?`, `abilities`, `name`, `expiresAt`, `lastUsedAt` and `value?` (the plaintext, only right after `createToken`), with `allows(ability)`, `denies(ability)`, `authorize(ability)` (throws `E_UNAUTHORIZED_ACCESS`), `isExpired()` and `toJSON()`. `*` allows every ability.

`VisaGuardConfig`:

| Option | Type | Default | Description |
|---|---|---|---|
| `store` | `GuardStore \| (() => GuardStore)` | — | Where the tokens live; a function is read when needed |
| `findUser` | `(userId: string) => Promise<GuardUser \| null>` | — | Called on every request; `null` refuses it |
| `findClientSubject` | `(clientId: string) => Promise<GuardUser \| null>` | — | What a client-credentials token authenticates as; without it such a token is refused |
| `name` | `string` | `'visa'` | Guard name |
| `tokenClientId` | `string` | — | The first-party client a token from `createToken` belongs to |
| `expiresInSeconds` | `number` | — | Lifetime of a token from `createToken` |
| `resource` | `string` | — | The protected resource this guard serves; `challenge()` then names its metadata |

### `VisaStore`

Every method that takes a credential takes its hash (`hashSecret`).

| Member | Signature |
|---|---|
| `findClient` | `findClient(id: string): Promise<Client \| null>` |
| `saveClient` (optional) | `saveClient?(client: Client): Promise<void>` |
| `saveAuthorizationCode` | `saveAuthorizationCode(code: AuthorizationCode): Promise<void>` |
| `findAuthorizationCode` | `findAuthorizationCode(codeHash: string): Promise<AuthorizationCode \| null>` |
| `consumeAuthorizationCode` | `consumeAuthorizationCode(codeHash: string, at: Date): Promise<boolean>`; atomic, `false` when already consumed |
| `saveAccessToken` | `saveAccessToken(token: AccessToken): Promise<void>` |
| `findAccessToken` | `findAccessToken(tokenHash: string): Promise<AccessToken \| null>` |
| `revokeAccessToken` | `revokeAccessToken(tokenHash: string, at: Date): Promise<void>` |
| `saveRefreshToken` | `saveRefreshToken(token: RefreshToken): Promise<void>` |
| `findRefreshToken` | `findRefreshToken(tokenHash: string): Promise<RefreshToken \| null>` |
| `consumeRefreshToken` | `consumeRefreshToken(tokenHash: string, at: Date): Promise<boolean>`; atomic |
| `revokeFamily` | `revokeFamily(familyId: string, at: Date): Promise<void>`; every token of a family, when a consumed refresh token comes back |
| `findConsent` | `findConsent(userId: string, clientId: string): Promise<Consent \| null>` |
| `saveConsent` | `saveConsent(consent: Consent): Promise<void>` |
| `listConsents` | `listConsents(userId: string): Promise<Consent[]>` |
| `listAccessTokens` | `listAccessTokens(userId: string): Promise<AccessToken[]>`; expired ones included |
| `revokeAccessFor` | `revokeAccessFor(userId: string, clientId: string, at: Date): Promise<void>` |
| `deleteConsent` | `deleteConsent(userId: string, clientId: string): Promise<void>` |
| `touchAccessToken` (optional) | `touchAccessToken?(tokenHash: string, at: Date): Promise<void>`; records the last use |
| `prune` (optional) | `prune?(now: Date): Promise<void>`; drops what expired |

### `@c9up/visa/config`

| Export | Kind | Description |
|---|---|---|
| `defineConfig` | function | `defineConfig(config: VisaConfigInput): VisaConfigInput` |
| `VisaConfigInput` | interface | `config/visa.ts` options (see Configuration) |

### `@c9up/visa/provider`

| Export | Kind | Description |
|---|---|---|
| `default` | provider | `VisaProvider`: binds the `VisaManager` built from the `visa` config, fills `@c9up/visa/services/main`, mounts the machine endpoints when a router is bound |
| `VisaAppContext` | interface | `{ container, config }`, what the provider needs from the application |

Routes the provider mounts (`prefix` defaults to `/oauth`):

| Method and path | Mounted when | Answers |
|---|---|---|
| `POST {prefix}/token` | always | `TokenResponse`, `cache-control: no-store` |
| `POST {prefix}/introspect` | always | `IntrospectionResponse` |
| `POST {prefix}/revoke` | always | 200 with an empty body |
| `POST {prefix}/register` | `registration.enabled` | 201 with `ClientRegistrationResponse` |
| `GET /.well-known/oauth-authorization-server{issuer path}` | always | The authorization server metadata |
| `GET /.well-known/oauth-protected-resource[/{resource path}]` | `protectedResource` is set | `ProtectedResourceMetadata` |

These endpoints read their parameters from the body only; an OAuth parameter in the query string is refused with `invalid_request`. An `E_VISA_OAUTH_ERROR` becomes its `status` and `toResponse()` body, with `WWW-Authenticate` on a 401. `{prefix}/authorize` is not mounted: build it with `visa.authorize()`, `consentTicket()`, `redeemConsentTicket()`, `grant()` and `deny()`.

### `@c9up/visa/services/main`

| Export | Kind | Description |
|---|---|---|
| `default` | const | `visa: VisaManager`, the application's manager once `VisaProvider` booted; a member read before throws |
| `setVisa`, `getVisa`, `clearVisa` | function | Seat, read and forget the manager behind it |

### `@c9up/visa/configure`

| Export | Kind | Description |
|---|---|---|
| `configure` | function | `configure(codemods): Promise<void>`: adds `VISA_ISSUER`, registers `@c9up/visa/provider`, writes `config/visa.ts` and the migrations `9000_create_visa_tables`, `9001_add_visa_client_secret_expiry` and `9002_add_visa_code_redirect_uri_omitted` |

### `@c9up/visa/stores/memory`

| Export | Kind | Description |
|---|---|---|
| `MemoryStore` | class | `new MemoryStore(clients?: readonly Client[])`, a `VisaStore` in process memory, for tests and a single-process development server |

### `@c9up/visa/stores/atlas`

| Export | Kind | Description |
|---|---|---|
| `AtlasStore` | class | `new AtlasStore(db: AtlasDb, tables?: AtlasStoreTables)`, a `VisaStore` on a database |
| `AtlasDb` | interface | `{ from(table): AtlasQuery; table(table): AtlasQuery }`, what `@c9up/atlas`'s `db` provides |
| `AtlasQuery` | interface | The query builder methods the store calls |
| `AtlasStoreTables` | interface | Table names: `clients` (`visa_clients`), `authorizationCodes` (`visa_authorization_codes`), `accessTokens` (`visa_access_tokens`), `refreshTokens` (`visa_refresh_tokens`), `consents` (`visa_consents`) |

### `@c9up/visa/types`

| Export | Kind | Description |
|---|---|---|
| `Client` | interface | `{ id, name, secretHash?, secretExpiresAt?, redirectUris, grantTypes, scopes, tokenEndpointAuthMethod, trusted? }` |
| `AuthorizationCode` | interface | `{ codeHash, clientId, userId, redirectUri, redirectUriOmitted?, scopes, codeChallenge, codeChallengeMethod, expiresAt, consumedAt?, resources?, nonce? }` |
| `AccessToken` | interface | `{ tokenHash, clientId, userId?, scopes, expiresAt, revokedAt?, lastUsedAt?, audience?, familyId? }` |
| `RefreshToken` | interface | `{ tokenHash, familyId, clientId, userId?, scopes, expiresAt, consumedAt?, revokedAt?, resources? }` |
| `Consent` | interface | `{ userId, clientId, scopes, grantedAt }` |
| `AuthorizedApplication` | interface | `{ clientId, name, scopes, grantedAt, lastUsedAt?, active }` |
| `TokenResponse` | interface | `{ access_token, token_type: 'Bearer', expires_in, refresh_token?, scope? }` |
| `IntrospectionResponse` | interface | `{ active, iss?, scope?, client_id?, username?, sub?, exp?, iat?, token_type?, aud? }` |
| `ClientAuthMethod` | type | `'client_secret_basic' \| 'client_secret_post' \| 'none'` |
| `GrantType` | type | `'authorization_code' \| 'refresh_token' \| 'client_credentials'` |

### `@c9up/visa/testing`

| Export | Kind | Description |
|---|---|---|
| `testVisa` | function | `testVisa(options?: TestVisaOptions): Promise<TestVisa>`, a real `VisaManager` on a `MemoryStore` with one registered client |
| `TestVisa` | interface | `{ visa, store, client, secret, credentials, pkce(): { verifier; challenge }, tokensFor(userId, scope?): Promise<TokenResponse> }` |
| `TestVisaOptions` | interface | `{ issuer?, clientId?, redirectUri?, scopes?, grantTypes?, publicClient?, config? }`; defaults `https://auth.test`, `test-client`, `https://app.test/callback`, `['profile', 'email']` |

`tokensFor(userId)` goes through authorize, consent and the code exchange.

## Configuration

`config/visa.ts`, read under the `visa` key. The provider refuses to build the manager without it.

```ts
import { defineConfig } from '@c9up/visa/config'
import { AtlasStore } from '@c9up/visa/stores/atlas'
import db from '@c9up/atlas/services/db'
import env from '#start/env'

export default defineConfig({
  issuer: env.get('VISA_ISSUER'),
  store: new AtlasStore(db),
  accessTokenTtlSeconds: 3600,
})
```

| Option | Type | Default | Description |
|---|---|---|---|
| `issuer` | `string` | — | Public URL of this server, the `iss` of every token; https unless the host is `localhost`, no query, no fragment |
| `store` | `VisaStore` | — | Where clients, codes, tokens and consents live |
| `accessTokenTtlSeconds` | `number` | `3600` | Access token lifetime |
| `refreshTokenTtlSeconds` | `number` | 30 days | Refresh token lifetime |
| `codeTtlSeconds` | `number` | `30` | Authorization code lifetime |
| `issueRefreshTokens` | `boolean` | `true` | Issue refresh tokens |
| `allowPlainChallenge` | `boolean` | `false` | Accept the `plain` PKCE method; only `S256` otherwise |
| `prefix` | `string` | `'/oauth'` | Where the endpoints are mounted |
| `resourcesSupported` | `string[]` | — | Resources tokens may be issued for; set, any other is refused with `invalid_target` |
| `registration` | `RegistrationOptions` | — | Client self-registration (see below) |
| `introspection.resourceServers` | `string[]` | — | Confidential clients allowed to introspect any access token; otherwise only the token's own client |
| `protectedResource` | `{ resource: string; scopesSupported?: string[]; resourceName?: string; resourceDocumentation?: string }` | — | The protected resource; set, its metadata document is served |
| `consentTicketTtlSeconds` | `number` | `600` | How long a consent ticket stays valid (a `VisaConfig` option) |

`registration`:

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `false` | Mount `{prefix}/register` |
| `initialAccessToken` | `string` | — | Bearer token a registration must carry; left out, registration is open |
| `scopes` | `string[]` | `[]` | Scopes a self-registered client may ask for |
| `grantTypes` | `GrantType[]` | `['authorization_code', 'refresh_token']` | Grants it may use |
| `secretTtlSeconds` | `number` | — | Seconds until an issued secret expires; left out, it does not |

## Container bindings

| Token | Resolves to |
|---|---|
| `VisaManager` (class) | The manager built from the `visa` config |
| `'visa'` | The same `VisaManager` |

`'visa'` is declared in `ContainerBindings`.

## Errors

| Code | Raised when |
|---|---|
| [`E_VISA_MISSING_ISSUER`](/en/reference/errors#e-visa-missing-issuer) | No `issuer` is configured |
| [`E_VISA_INVALID_ISSUER`](/en/reference/errors#e-visa-invalid-issuer) | The `issuer` is not a URL, or carries a query or a fragment |
| [`E_VISA_INSECURE_ISSUER`](/en/reference/errors#e-visa-insecure-issuer) | The `issuer` is not https and not `localhost` |
| [`E_VISA_NO_REDIRECT_URI`](/en/reference/errors#e-visa-no-redirect-uri) | `registerClient()` got no redirect URI |
| [`E_VISA_INVALID_REDIRECT_URI`](/en/reference/errors#e-visa-invalid-redirect-uri) | A redirect URI given to `registerClient()` is not a complete URL |
| [`E_VISA_INVALID_INITIAL_ACCESS_TOKEN`](/en/reference/errors#e-visa-invalid-initial-access-token) | `registration.initialAccessToken` is the empty string |
| [`E_VISA_INVALID_SECRET_TTL`](/en/reference/errors#e-visa-invalid-secret-ttl) | `registration.secretTtlSeconds` is not a positive whole number |
| [`E_VISA_STORE_READ_ONLY`](/en/reference/errors#e-visa-store-read-only) | The store has no `saveClient`, and `registerClient()` was called or registration is enabled |
| [`E_VISA_MISSING_CONFIG`](/en/reference/errors#e-visa-missing-config) | `VisaProvider` found no `config/visa.ts` |
| [`E_VISA_NOT_BOOTED`](/en/reference/errors#e-visa-not-booted) | `@c9up/visa/services/main` was read before the provider booted, or before `setVisa()` |
| [`E_VISA_CREDENTIALS_UNSUPPORTED`](/en/reference/errors#e-visa-credentials-unsupported) | `authenticate()` with credentials on the visa guard; send the bearer token to `verify()` |
| [`E_VISA_NO_TOKEN_CLIENT`](/en/reference/errors#e-visa-no-token-client) | `createToken()` on a guard built without `tokenClientId` |
| [`E_VISA_INVALID_RESOURCE`](/en/reference/errors#e-visa-invalid-resource) | A resource identifier is not an absolute URI, or carries a fragment |
| [`E_VISA_INVALID_CHALLENGE_PARAMETER`](/en/reference/errors#e-visa-invalid-challenge-parameter) | A `wwwAuthenticate()` parameter holds a quote, a backslash or a control character |
| [`E_VISA_CORRUPT_ROW`](/en/reference/errors#e-visa-corrupt-row) | The Atlas store read a column it cannot decode (a list, a date, a string, an auth method) |
| [`E_VISA_TEST_AUTHORIZE_FAILED`](/en/reference/errors#e-visa-test-authorize-failed) | The testing helper's authorization request was refused; the message carries the OAuth error |
| [`E_VISA_INTERNAL`](/en/reference/errors#e-visa-internal) | An internal invariant broke (a bug in visa) |
| [`E_UNAUTHORIZED_ACCESS`](/en/reference/errors#e-unauthorized-access) | `currentAccessToken.authorize(ability)` on a token without that ability (403) |
| [`E_VISA_OAUTH_ERROR`](/en/reference/errors#e-visa-oauth-error) | A client's mistake, answered on the wire: `oauthCode` is the protocol string (`invalid_grant`, `invalid_client`…), with `description`, `challenge` and `toResponse()`; `status` 401 for `invalid_client` and `invalid_token`, else 400 |
| [`E_VISA_UNREDIRECTABLE`](/en/reference/errors#e-visa-unredirectable) | An authorization failure to show the user, never to redirect (unknown client or redirect URI); `error` is the `E_VISA_OAUTH_ERROR` to show (400) |

Each one is a class of the `errors` namespace and a `@c9up/flare` `Exception`, with status 500 unless stated: branch on `error.code` or on `error instanceof errors.E_VISA_*`. A configuration mistake's advice is in `help`.

## Migration

- `VisaError` is gone: test `error.code`, or `error instanceof errors.E_VISA_*` with `import { errors } from '@c9up/visa'`. Its `hint` is now `help`.
- `OAuthError` becomes `errors.E_VISA_OAUTH_ERROR`: its `code` is now `'E_VISA_OAUTH_ERROR'`, and the protocol string moved to `oauthCode` (`error.code === 'invalid_grant'` becomes `error.oauthCode === 'invalid_grant'`). The constructor, `description`, `status`, `challenge` and `toResponse()` are unchanged.
- `UnredirectableError` becomes `errors.E_VISA_UNREDIRECTABLE`, still carrying `error`.
- `UnauthorizedAccessError` becomes `errors.E_UNAUTHORIZED_ACCESS`; its `code` and status 403 are unchanged.


An application on `AtlasStore` whose tables came from an earlier version runs `ream configure @c9up/visa` again before upgrading, then its migrations. The existing `9000_create_visa_tables` is left alone; the command adds `9001_add_visa_client_secret_expiry` (the `secret_expires_at` column of `visa_clients`, missing up to 0.1.3) and `9002_add_visa_code_redirect_uri_omitted` (the `redirect_uri_omitted` column of `visa_authorization_codes`).

## See also

- [Introduction](/en/guides/oauth-server/introduction)
- [Issuer and store](/en/guides/oauth-server/issuer-and-store)
- [Authorization endpoint and clients](/en/guides/oauth-server/authorize)
- [Protecting resources](/en/guides/oauth-server/resources)
- [Testing](/en/guides/oauth-server/testing)
