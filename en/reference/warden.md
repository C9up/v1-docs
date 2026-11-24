# warden

`@c9up/warden`: authentication and authorization: session, JWT, access-token and HTTP Basic guards, route decorators, a bouncer with abilities and policies, scoped roles and permissions, remember-me and refresh tokens, multi-factor authentication (TOTP, backup codes, one-time codes, passkeys) and login rate limiting. Guide: [Authentication](/en/guides/auth/introduction).

## Installation

```bash
pnpm add @c9up/warden
```

`ream configure @c9up/warden` registers the provider, adds `JWT_SECRET` (a random value) and `JWT_EXPIRY=3600` to the environment files, and writes `config/auth.ts` with a JWT guard whose `findUser` and `verifyCredentials` throw until you write them. The `@can` / `@cannot` template tags need `@c9up/inker`; the Redis stores need `@c9up/quasar` or a client of your own. JWT signing runs in a native Rust engine.

The native engine comes as one small package per platform, `@c9up/warden-<platform>`, for linux x64 and arm64 (glibc), macOS x64 and arm64, and Windows x64. `@c9up/warden` lists them as optional dependencies, and your package manager installs only the one that matches your machine. No Rust toolchain is needed. Do not install with optional dependencies turned off (`--no-optional`, `--omit=optional`): the engine would be left out.

There is no JavaScript fallback. Without the engine, signing or verifying a JWT throws `E_WARDEN_NAPI_REQUIRED`, and its message names the package to install, for example `@c9up/warden-linux-x64-gnu`.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/warden` | `AuthManager`, `Authenticator`, the guards and strategies, decorators, `Bouncer`, rights, access tokens, MFA, rate limiting, errors |
| `@c9up/warden/config` | `defineConfig`, the guard factories and the config types |
| `@c9up/warden/provider` | `WardenProvider` (default export) |
| `@c9up/warden/services/main` | The application's `AuthManager` (default export) |
| `@c9up/warden/middleware` | `WardenMiddleware` (default export), `wardenMiddleware`, `silentAuth`, `initializeBouncer`, `renderAuthError` |
| `@c9up/warden/silent-auth` | `SilentAuthMiddleware` (default export), `silentAuth` |
| `@c9up/warden/standalone` | `createWarden`, for Express and other hosts without a container |
| `@c9up/warden/configure` | `configure()`, run by `ream configure @c9up/warden` |

## Exports

### `@c9up/warden`

Configuration and guards:

| Export | Kind | Description |
|---|---|---|
| `defineConfig` | function | `defineConfig(config: WardenConfig): WardenConfig` |
| `sessionGuard` | function | `sessionGuard(config: SessionStrategyConfig): GuardFactory` |
| `jwtGuard` | function | `jwtGuard(config: JwtConfig): GuardFactory` |
| `apiKeyGuard` | function | `apiKeyGuard(config: ApiKeyConfig): GuardFactory`, an access-tokens guard |
| `basicAuthGuard` | function | `basicAuthGuard(config: BasicAuthConfig): GuardFactory` |
| `WardenConfig` | interface | `config/auth.ts` (see Configuration) |
| `GuardFactory` | type | An `AuthStrategy`, shared by every request |
| `configure` | function | Same as `@c9up/warden/configure` |
| `SessionStrategy` | class | `new SessionStrategy(config: SessionStrategyConfig)`, driver `session` |
| `JwtStrategy` | class | `new JwtStrategy(config: JwtStrategyConfig)`, driver `jwt`: `signToken(user, options?)`, `verify(token)`, `revoke(token)` |
| `ApiKeyStrategy` | class | `new ApiKeyStrategy(config: ApiKeyConfig)`, driver `access_tokens`: `createToken`, `invalidateToken`, `verify` |
| `BasicAuthStrategy` | class | `new BasicAuthStrategy(config: BasicAuthConfig)`, driver `basic_auth`; `challenge` is its `WWW-Authenticate` value |
| `createSessionGuardState` | function | A fresh `SessionGuardState` |
| `generateJwtSecret` | function | A random JWT secret |
| `basicAuthChallenge` | function | `basicAuthChallenge(realm?: string): string`; realm `Restricted` by default |
| `decodeBasicAuth` | function | Decode a `Basic` header into its user id and password |
| `safeCompare` | function | Constant-time string comparison |

Authentication:

| Export | Kind | Description |
|---|---|---|
| `AuthManager` | class | The configured guards; authenticates, verifies, issues tokens, resolves rights |
| `Authenticator` | class | `ctx.auth`, one request's authentication state |
| `GuardAccessor` | class | `ctx.auth.use(name)`, one guard of one request |
| `authFinder` | function | `authFinder<User>(options: AuthFinderOptions<User>): AuthFinder<User>`: `verifyCredentials(uid, password)` throws `E_INVALID_CREDENTIALS` for an unknown account, a wrong password and a password the hasher refuses alike, after the same hash work |
| `AuthFinder`, `AuthFinderOptions`, `AuthFinderHasher` | interface | `{ hash: { make, verify }, findForAuth(uid), passwordColumnName? }` (default column `password`) |
| `extractCredentials` | function | The bearer token, API key, Basic header and session of a request |
| `API_KEY_GUARD_NAMES` | const | The guard names read as access-token guards: `access_tokens`, `api-key` |
| `authEventPrefix` | function | `authEventPrefix(driverName: string \| undefined): string`, the event namespace of a driver |
| `tokenAllows` | function | `tokenAllows(user: UserPayload, permission: string): boolean`, whether the user's current token carries the ability |
| `AuthStrategy` | interface | `{ name; authenticate(credentials); verify(token, context?); authenticateAsClient?(...) }`, a custom guard |
| `AuthConfig` | interface | `{ default?, guards?, defaultStrategy?, strategies?, rights? }`, options of `new AuthManager()` |
| `AuthResult` | interface | `{ authenticated: boolean; user?: UserPayload; error?: string }` |
| `UserPayload` | interface | `{ id: string; roles?; permissions?; currentAccessToken?; [key: string]: unknown }` |
| `CurrentAccessToken` | interface | `{ abilities; allows(ability); denies(ability); authorize(ability) }` |
| `WardenEmitter` | type | `{ emit(event, data) }` |
| `AuthAttempt`, `ExtractedCredentials` | interface | What a guard attempt reads |
| `Secret` | class | A value that prints as `[redacted]`; `release()` returns it |

Route decorators:

| Export | Kind | Description |
|---|---|---|
| `Guard` | decorator | `@Guard(first: string, ...rest: string[])`: the guards that may authenticate the route; the first that succeeds wins |
| `Permission` | decorator | `@Permission(...permissions: string[])`: every one required; at least one name |
| `Role` | decorator | `@Role(...roles: string[])`: every one required; at least one name |
| `RequireMfa` | decorator | `@RequireMfa()`: the user must have passed the MFA step-up |
| `getGuardMetadata`, `getPermissionMetadata`, `getRoleMetadata`, `getRequireMfaMetadata` | function | Read the decorators of a handler |

Authorization:

| Export | Kind | Description |
|---|---|---|
| `Bouncer` | class | `ctx.bouncer`: evaluates abilities and policies for a user |
| `BasePolicy` | class | Base of a policy class; optional `before()` and `after()` hooks |
| `AuthorizationResponse` | class | `AuthorizationResponse.allow()`, `AuthorizationResponse.deny(message?, status?)`, `t(identifier, data?)` |
| `AbilitiesBuilder` | class | `new AbilitiesBuilder().define(name, authorizer, options?)…abilities` |
| `action` | decorator | `@action(options: AbilityOptions)` on a policy method |
| `allowGuest` | decorator | `@allowGuest()`: the policy method runs for a guest too |
| `getActionMetadata` | function | Read `@action` options |
| `PolicyAuthorizer` | type | `bouncer.with(policy)`: `execute`, `allows`, `denies`, `authorize` by action name |
| `Ability`, `AbilityOptions` | interface | A defined ability; `{ allowGuest? }` |
| `AuthorizerResponse` | type | `boolean \| AuthorizationResponse \| Promise<boolean \| AuthorizationResponse>` |
| `BouncerContext`, `BouncerEmitter`, `PolicyContainerResolver` | interface | `{ scope?, resolver?, containerResolver?, emitter? }` |
| `RightsResolver` | class | `new RightsResolver(store: RightsStore)`; `resolve(userId, scope)` gives `EffectivePermissions` |
| `MemoryRightsStore` | class | In-memory `RightsStore`, the default |
| `RightsStore` | interface | `{ rolePermissions(role, scope); userRoles(userId, scope); userGrants(userId, scope) }` |
| `EffectivePermissions` | interface | `{ has, hasAll, hasAny, permissions, roles, scope }` |
| `Scope` | type | `'global' \| { readonly tenant: string }` |
| `scopeKey` | function | `scopeKey(scope: Scope): string` (`'global'` or `'tenant:<id>'`) |

Access tokens:

| Export | Kind | Description |
|---|---|---|
| `AccessTokensProvider` | class | `new AccessTokensProvider(options: AccessTokensProviderOptions)`: `create(user, abilities?, options?)`, `verify(value)`, `invalidate(value)` |
| `AccessToken` | class | A token: `identifier`, `tokenableId`, `type`, `name`, `abilities`, `createdAt`, `updatedAt`, `expiresAt`, `lastUsedAt`, `value` (a `Secret`, only after creation), `allows`, `denies`, `authorize`, `isExpired` |
| `MemoryAccessTokenStore` | class | In-memory `AccessTokenStore` |
| `AccessTokensProviderOptions` | interface | `{ store, prefix?, type?, tokenSecretLength?, expiresIn? }`; the secret is at least 32 characters |
| `AccessTokensProviderContract`, `AccessTokenStore`, `StoredAccessToken`, `AccessTokenAttributes`, `CreateAccessTokenOptions`, `TokenOwner` | interface | The provider contract, its store and records; `CreateAccessTokenOptions` is `{ name?, expiresIn? }` |
| `crc32` | function | The checksum embedded in a token value |

JWT, refresh and remember-me tokens:

| Export | Kind | Description |
|---|---|---|
| `JwtStrategyConfig`, `JwtClaims`, `SignTokenOptions` | interface | Options and claims of `JwtStrategy`; `SignTokenOptions` is `{ mfa? }` |
| `TokenBlacklist` | class | `new TokenBlacklist(driver: BlacklistDriver)`: `revoke(jti, expiresAt)`, `isRevoked(jti)`, `cleanup()` |
| `MemoryBlacklistDriver`, `RedisBlacklistDriver`, `ResilientBlacklistDriver` | class | Revocation list drivers; the resilient one wraps a primary driver with an in-memory fallback |
| `BlacklistDriver`, `RedisBlacklistConfig`, `RedisLikeClient`, `ResilientBlacklistConfig`, `BlacklistDegradeEvent` | interface | Their contracts and options |
| `mintRefreshToken`, `rotateRefreshToken`, `decodeRefreshToken` | function | Open a token family at sign-in; spend a refresh token for its successor; split a presented value into its family and the hash of its secret. See [Refresh tokens](#refresh-tokens) |
| `MemoryRefreshTokenDriver` | class | In-memory `RefreshTokenDriver` |
| `RefreshTokenDriver`, `MintedRefreshToken`, `StoredRefreshToken`, `RefreshTokenSuccessor`, `RefreshTokenRotation` | interface / type | Refresh token storage, one row per family, and the answer of a rotation |
| `RememberMeToken` | class | A remember-me token |
| `mintRememberMeToken`, `verifyAndRecycleRememberMeToken` | function | Issue a remember-me token; verify one and replace it |
| `MemoryRememberMeTokenDriver` | class | In-memory `RememberMeTokenDriver` |
| `RememberMeTokenDriver`, `MintedRememberMeToken`, `StoredRememberMeToken` | type | Remember-me token storage |
| `encodeTokenValue`, `decodeTokenValue`, `hashSecret`, `safeCompareHashes`, `DEFAULT_SECRET_LENGTH` | function / const | Token value encoding and hashing |
| `SessionStore`, `SessionStrategyConfig`, `SessionGuardState`, `RememberMeCookieAttributes` | interface | Session guard contracts and options |
| `TokenDuration` | type | Seconds, or a duration string (`'1h'`, `'7 days'`) |
| `parseDurationSeconds` | function | `parseDurationSeconds(value: TokenDuration): number` |

Multi-factor authentication:

| Export | Kind | Description |
|---|---|---|
| `MfaManager` | class | `new MfaManager(config: MfaManagerConfig)`: `enrollTotp`, `confirmTotp`, `verifyTotp`, `createBackupCodes`, `verifyBackupCode`, `verify(userId, code)`, `isLocked`, `listFactors`, `isEnabled`, `disableFactor`; `enrollTotp`, `confirmTotp`, `createBackupCodes` and `disableFactor` take `{ stepUp }` and need it once the account has MFA |
| `MfaManagerConfig` | interface | `{ issuer: string; totp?; backupCodes?; store?; rateLimit? }` |
| `MfaChangeOptions`, `MfaEnrollOptions` | interface | `{ stepUp? }`, `{ stepUp?, label? }`: the options of a factor change |
| `MfaRateLimitConfig` | interface | `{ maxAttempts?, windowSeconds?, store? }` |
| `MfaFactor`, `MfaFactorKind`, `MfaFactorStore`, `MfaFactorSummary` | interface / type | Enrolled factors (`'totp' \| 'backup_codes'`) and their store |
| `MemoryMfaFactorStore` | class | In-memory `MfaFactorStore` |
| `TotpProvider` | class | `new TotpProvider(config?: TotpConfig)`: `enroll(account, issuer)`, `uri(secret, account, issuer)`, `generate(secret, atMs?)`, `verify(...)` |
| `MemoryTotpReplayGuard`, `RedisTotpReplayGuard` | class | Refuse a TOTP code used twice |
| `TotpConfig`, `TotpEnrollment`, `TotpAlgorithm`, `TotpReplayGuard`, `ReplayRedisClient` | interface / type | TOTP options and contracts |
| `BackupCodesProvider` | class | `new BackupCodesProvider(config?: BackupCodesConfig)`: `generate()`, `verify(hashes, code)` |
| `BackupCodesConfig`, `BackupCodesResult`, `BackupCodeVerification` | interface | |
| `OtpProvider` | class | `new OtpProvider(config: OtpConfig)`: `start(recipient)` sends a code through a delivery channel, `verify(challengeId, recipient, code)` checks it for that recipient only |
| `MemoryOtpChallengeStore` | class | In-memory `OtpChallengeStore` (10 000 pending challenges at most) |
| `OtpConfig`, `OtpChallenge`, `OtpChallengeStore`, `OtpDeliveryChannel`, `OtpStartResult`, `OtpVerification`, `OtpFailureReason` | interface / type | One-time code options and contracts |
| `WebauthnProvider` | class | `new WebauthnProvider(config: WebauthnConfig)`: `startRegistration`, `finishRegistration`, `startAuthentication`, `finishAuthentication` |
| `MemoryWebauthnChallengeStore`, `MemoryWebauthnCredentialStore` | class | In-memory ceremony and passkey stores (5-minute ceremonies) |
| `WebauthnConfig`, `WebauthnUser`, `StoredPasskey`, `WebauthnChallengeStore`, `WebauthnCredentialStore`, `RegistrationOptionsJSON`, `RegistrationResponseJSON`, `AuthenticationOptionsJSON`, `AuthenticationResponseJSON` | interface | Passkey options, records and browser JSON |

Rate limiting and stores:

| Export | Kind | Description |
|---|---|---|
| `AuthRateLimiter` | class | `new AuthRateLimiter(config?: AuthRateLimiterConfig)`: `attempt(...keys)`, `isBlocked(...keys)`, `clear(...keys)`, `AuthRateLimiter.loginKeys(ip, identifier)`, `AuthRateLimiter.ipKey(ip)`, `AuthRateLimiter.identifierKey(identifier)`. Reset on success: `clear(AuthRateLimiter.identifierKey(email))` only |
| `AuthRateLimiterConfig` | interface | `{ maxAttempts?, windowSeconds?, store? }` |
| `AttemptDecision` | interface | `{ allowed, remaining, retryAfterSeconds }` |
| `MemoryAttemptStore`, `RedisAttemptStore` | class | Attempt counters |
| `AttemptStore`, `AttemptCount`, `AttemptRedisClient`, `AttemptRedisSource` | interface / type | Their contracts |
| `quasarConnection` | function | A `@c9up/quasar` connection checked for the commands warden's Redis stores issue |

Errors:

| Export | Kind | Description |
|---|---|---|
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors). Among them `errors.E_UNAUTHORIZED_ACCESS` (401; `guardDriverName`, `redirectTo`, `challenge`), `errors.E_INVALID_CREDENTIALS` (400) and `errors.E_AUTHORIZATION_FAILURE` (403 unless the denial gives another status; the denial on `error.response`) |

### `AuthManager`

`new AuthManager(config: AuthConfig)`.

| Member | Signature | Description |
|---|---|---|
| `authenticate` | `authenticate(credentials: Record<string, unknown>, strategyName?: string): Promise<AuthResult>` | Check credentials with a guard |
| `verify` | `verify(token: string, strategyName?: string, context?: Record<string, unknown>): Promise<AuthResult>` | Check a token with a guard |
| `issueFor` | `issueFor(user: UserPayload, strategyName?: string, options?: { mfa?: boolean }): string` | Mint a token through a token-issuing guard |
| `login` | `login(user: UserPayload, session: SessionStore, strategyName?: string, state?: SessionGuardState): Promise<void>` | Seat a user in a session (session guards) |
| `logout` | `logout(session: SessionStore, strategyName?: string, state?: SessionGuardState): Promise<void>` | |
| `authenticateViaRememberMeToken` | `authenticateViaRememberMeToken(cookieValue: unknown, strategyName?: string, state?): Promise<{ user; cookieValue } \| null>` | |
| `resolvePermissions` | `resolvePermissions(user: UserPayload, scope?: Scope): Promise<EffectivePermissions>` | Roles and permissions of the user in a scope (`'global'` by default) |
| `hasRole` / `hasPermission` | `hasRole(user: UserPayload, role: string, scope?: Scope): Promise<boolean>` | |
| `hasAllPermissions` | `hasAllPermissions(user: UserPayload, permissions: readonly string[], scope?: Scope): Promise<boolean>` | |
| `createAuthenticator` | `createAuthenticator(ctx: WardenContext): Authenticator` | What the middleware builds per request, for a command or a job |
| `createAuthenticatorClient` | `createAuthenticatorClient(): { use(guard?) }` | The test seam: `use(guard).authenticateAsClient(...)` |
| `getStrategy` | `getStrategy(name?: string): AuthStrategy` | |
| `registerStrategy` | `registerStrategy(name: string, strategy: AuthStrategy): void` | |
| `getStrategyNames` | `getStrategyNames(): string[]` | |
| `defaultStrategyName` | `readonly defaultStrategyName: string` | |
| `setEmitter` | `setEmitter(emitter: WardenEmitter): this` | Announce authentication events |
| `eventPrefixFor` | `eventPrefixFor(guardName?: string): string` | |

### `Authenticator`

`ctx.auth`. Built by the middleware, or by `auth.createAuthenticator(ctx)`.

| Member | Signature | Description |
|---|---|---|
| `authenticate` | `authenticate(): Promise<UserPayload>` | The user through the default guard; throws `E_UNAUTHORIZED_ACCESS` |
| `check` | `check(): Promise<boolean>` | The same, answering instead of throwing |
| `authenticateUsing` | `authenticateUsing(guards?: string[], options?: { loginRoute?: string }): Promise<UserPayload>` | The first guard of the list that authenticates |
| `checkUsing` | `checkUsing(guards?: string[], options?): Promise<boolean>` | |
| `use` | `use(name?: string): GuardAccessor` | One guard of this request; the default guard without a name |
| `user` | `readonly user: UserPayload \| undefined` | |
| `getUserOrFail` | `getUserOrFail(): UserPayload` | Throws `E_UNAUTHORIZED_ACCESS` |
| `isAuthenticated` / `authenticationAttempted` | `readonly isAuthenticated: boolean` | |
| `authenticatedViaGuard` | `readonly authenticatedViaGuard: string \| undefined` | |
| `attemptedVia` | `attemptedVia(name: string): boolean` | |
| `defaultGuard` | `readonly defaultGuard: string` | |
| `roles` / `permissions` | `readonly roles: string[] \| undefined` | |
| `hasPermission` | `hasPermission(permission: string, scope?: Scope): Promise<boolean>` | |
| `hasAllPermissions` | `hasAllPermissions(permissions: readonly string[], scope?: Scope): Promise<boolean>` | |

A credential rejection is an answer; a guard that crashes propagates (`E_WARDEN_AUTH_STRATEGY_ERROR`) rather than reading as "not signed in".

### `GuardAccessor`

| Member | Signature | Description |
|---|---|---|
| `authenticate` / `check` | `authenticate(): Promise<UserPayload>` / `check(): Promise<boolean>` | This guard only |
| `user`, `isAuthenticated`, `authenticationAttempted` | getters | |
| `getUserOrFail` | `getUserOrFail(): UserPayload` | |
| `login` | `login(user: UserPayload, remember?: boolean): Promise<void>` | Session guards; `remember` issues a remember-me cookie |
| `logout` | `logout(): Promise<void>` | Session guards |
| `viaRemember`, `attemptedViaRemember`, `isLoggedOut` | getters | Session guard state for this request |
| `authenticateViaRememberMeToken` | `authenticateViaRememberMeToken(cookieValue: unknown): Promise<{ user; cookieValue } \| null>` | |
| `markMfaVerified` | `markMfaVerified(): void` | Record a passed MFA step-up in the session |
| `createToken` | `createToken(user: TokenOwner, abilities?: string[], options?: CreateAccessTokenOptions): Promise<AccessToken>` | Access-token guards |
| `invalidateToken` | `invalidateToken(): Promise<boolean>` | Revoke the token of this request |
| `authenticateAsClient` | `authenticateAsClient(...args): Promise<AuthClientResponse>` | What a test client sends (headers, session, cookies) |

### `Bouncer`

`new Bouncer(user, abilities?, policies?, context?)`; `initializeBouncer` puts one on `ctx.bouncer` for every request.

| Member | Signature | Description |
|---|---|---|
| `allows` | `allows(ability: string \| Ability, ...args): Promise<boolean>` | |
| `denies` | `denies(ability: string \| Ability, ...args): Promise<boolean>` | |
| `authorize` | `authorize(ability: string \| Ability, ...args): Promise<void>` | Throws `E_AUTHORIZATION_FAILURE` |
| `execute` | `execute(ability: string \| Ability, ...args): Promise<AuthorizationResponse>` | |
| `with` | `with(policy: (new () => BasePolicy) \| string): PolicyAuthorizer` | A policy, by class or by registered name |
| `deny` | `deny(message?: string, status?: number): AuthorizationResponse` | |
| `scope` | `readonly scope: Scope` | |
| `setContainerResolver` | `setContainerResolver(containerResolver?): this` | Resolve policies through the container |
| `Bouncer.ability` | `static ability(callback)` / `static ability(options: AbilityOptions, callback)` | Define an ability |
| `Bouncer.define` | `static define(name, authorizer, options?): AbilitiesBuilder` | |

Every evaluation emits `authorization:finished` when an emitter is wired.

### `@c9up/warden/config`

| Export | Kind | Description |
|---|---|---|
| `defineConfig`, `sessionGuard`, `jwtGuard`, `apiKeyGuard`, `basicAuthGuard` | function | Same as in `@c9up/warden` |
| `WardenConfig`, `GuardFactory` | type | Same as in `@c9up/warden` |
| `JwtConfig` | interface | Options of `jwtGuard()` |
| `ScopeRequestContext` | interface | `{ request: { headers }, auth? }`, what `resolveScope` receives |

### `@c9up/warden/provider`

| Export | Kind | Description |
|---|---|---|
| `default` | provider | `WardenProvider`: builds the guards and the `AuthManager` from the `auth` config, the rights resolver and the bouncer registry, fills `@c9up/warden/services/main`, and registers `@can` / `@cannot` when `@c9up/inker` is used |
| `WardenAppContext` | interface | `{ container, config, usingInker? }` |

### `@c9up/warden/services/main`

| Export | Kind | Description |
|---|---|---|
| `default` | const | `auth: AuthManager`, the application's manager once `WardenProvider` booted; a member read before throws `E_WARDEN_NOT_BOOTED` |

### `@c9up/warden/middleware`

| Export | Kind | Description |
|---|---|---|
| `default` | class | `WardenMiddleware`, `handle(ctx, next)`: enforces the route's `@Guard`, `@Role`, `@Permission` and `@RequireMfa`; fails closed without an `AuthManager` |
| `wardenMiddleware` | function | `wardenMiddleware(ctx: WardenContext, next): Promise<void>` |
| `silentAuth` | function | `silentAuth(ctx: WardenContext, next): Promise<void>`: sets `ctx.auth` through the default guard, never answers 401 |
| `initializeBouncer` | function | `initializeBouncer(ctx: WardenContext, next): Promise<void>`: sets `ctx.bouncer` on every request |
| `renderAuthError` | function | `renderAuthError(ctx: WardenContext, error: E_UNAUTHORIZED_ACCESS): void`: what `E_UNAUTHORIZED_ACCESS.handle` writes; redirects an HTML request of a session guard to the login route, else answers 401 JSON |
| `WardenContext` | interface | The slice of the HTTP context the middleware reads |
| `BouncerRegistry` | interface | `{ abilities, policies, resolveScope? }` |

### `@c9up/warden/silent-auth`

| Export | Kind | Description |
|---|---|---|
| `default` | class | `SilentAuthMiddleware`, `handle(ctx, next)`; register it before the enforcing middleware |
| `silentAuth` | function | Same as in `@c9up/warden/middleware` |

### `@c9up/warden/standalone`

| Export | Kind | Description |
|---|---|---|
| `createWarden` | function | `createWarden(config: WardenConfig): Warden` |
| `Warden` | interface | `verify(token, strategy?)`, `authenticate(credentials, strategy?)`, `generateToken(user, guard?)`, `manager`, `expressMiddleware()` (bearer token in, `req.auth` and `req.user` out) |
| `StandaloneRequest`, `StandaloneResponse` | interface | The Express-style request and response the middleware reads |

### `@c9up/warden/configure`

| Export | Kind | Description |
|---|---|---|
| `configure` | function | `configure(codemods): Promise<void>`: registers the provider, adds `JWT_SECRET` and `JWT_EXPIRY`, writes `config/auth.ts` |

## Auth events

With an emitter set (`auth.setEmitter(emitter)`), each authentication decision is announced under a prefix taken from the guard's driver:

| Driver | Event prefix |
|---|---|
| `session` | `session_auth:` |
| `access_tokens` | `access_tokens_auth:` |
| `basic_auth` | `basic_auth:` |
| `jwt` | `jwt_auth:` |

Events: `login_attempted`, `login_succeeded` and `logged_out` (session guards), `authentication_attempted`, `authentication_succeeded` and `authentication_failed` (every guard). A listener that throws never breaks a login.

## Refresh tokens

A sign-in opens a token family: one row that holds the hash of the one refresh token that is valid now. A refresh spends that token and puts its successor in the same row. The token value is `base64url(familyId).base64url(secret)`; only `sha256(secret)` is stored.

```ts
import { MemoryRefreshTokenDriver, mintRefreshToken, rotateRefreshToken } from '@c9up/warden'

const refreshTokens = new MemoryRefreshTokenDriver() // your own driver in production

// Sign-in: open a family.
const minted = mintRefreshToken(user.id, 30 * 24 * 3600)
await refreshTokens.store(minted.stored)
// Send minted.value to the client, with an access token.

// POST /auth/refresh
const rotation = await rotateRefreshToken(refreshTokens, body.refreshToken, 30 * 24 * 3600)
if (!rotation.rotated) {
  // 'invalid' and 'reused' get the same 401. On 'reused', the family is
  // already revoked; you can also warn the user or end every session:
  // if (rotation.reason === 'reused') await refreshTokens.revokeAllForUser(rotation.userId)
  return response.status(401).json({ error: 'invalid_grant' })
}
// Send rotation.value to the client, with a new access token for rotation.userId.
```

`rotateRefreshToken` answers:

| Answer | When |
|---|---|
| `{ rotated: true, userId, familyId, value, expiresAt }` | The token was the current one. `value` is its successor; the presented token no longer works. |
| `{ rotated: false, reason: 'invalid' }` | Not a refresh token, an unknown or revoked family, or an expired one (its row is removed). |
| `{ rotated: false, reason: 'reused', userId, familyId }` | A token of a live family that is not the current one: a token already spent, or the loser of two requests that present the same token at the same time. The family is revoked, so the successor the other request received stops working too. |

The second case is how a stolen token is caught: the thief and the owner hold tokens of the same sign-in, and the first spent token that comes back ends the family for both.

### Writing a driver

A driver stores one row per family, keyed by `familyId`: `{ familyId, hash, userId, expiresAt, createdAt }`.

| Method | What it must do |
|---|---|
| `store(row)` | Insert the row of a new family |
| `find(familyId)` | The row, or `null` |
| `consume(familyId, presentedHash, successor)` | Replace `hash` and `expiresAt` with `successor` ONLY if the row's hash is still `presentedHash`, in one indivisible operation, and answer whether THIS call did it |
| `revokeFamily(familyId)` | Delete the row |
| `revokeAllForUser(userId)` | Delete every row of the user; compare ids as strings |
| `cleanup()` | Delete expired rows |

`consume` is a compare-and-set. In SQL, one statement and its affected row count:

```sql
UPDATE refresh_tokens SET hash = :next_hash, expires_at = :next_expires_at
WHERE family_id = :family_id AND hash = :presented_hash
-- consume() answers: affected rows === 1
```

On Redis, a Lua script that compares the hash and writes in the same call. A `find` followed by a separate write is not a consume: two requests with the same token both read the same hash and both write. A driver without `consume()` or `revokeFamily()` is refused with `E_WARDEN_REFRESH_STORE_CONTRACT`.

## Configuration

`config/auth.ts`, read under the `auth` key. The provider throws `E_WARDEN_NO_AUTH_CONFIG` without any guard.

```ts
import { defineConfig, sessionGuard, apiKeyGuard, AccessTokensProvider } from '@c9up/warden'

export default defineConfig({
  default: 'web',
  guards: {
    web: sessionGuard({ findUser: (id) => User.find(id) }),
    api: apiKeyGuard({ tokens: new AccessTokensProvider({ store }), findUser: (id) => User.find(id) }),
  },
  loginRoute: '/login',
})
```

| Option | Type | Default | Description |
|---|---|---|---|
| `guards` | `Record<string, GuardFactory>` | — | Guards by name |
| `default` | `string` | the first guard | Guard used when none is named |
| `loginRoute` | `string` | — | Where an HTML request of a session guard is redirected when unauthenticated; else 401 JSON |
| `jwt`, `session`, `apiKey` | `JwtConfig`, `SessionStrategyConfig`, `ApiKeyConfig` | — | Older form: one guard per driver, named `jwt`, `session` and `access_tokens` / `api-key`; ignored when `guards` is set |
| `defaultStrategy` | `string` | — | Older name of `default` |
| `rights.store` | `RightsStore` | `MemoryRightsStore` | Where roles and grants come from |
| `abilities` | `Record<string, Ability>` | `{}` | Abilities the bouncer knows by name |
| `policies` | `Record<string, new () => BasePolicy>` | `{}` | Policies the bouncer knows by name |
| `resolveScope` | `(ctx: ScopeRequestContext) => Scope \| Promise<Scope>` | `'global'` | The authorization scope of a request |
| `mfa.manager` | `MfaManager` | — | Binds the MFA manager; needed by `@RequireMfa` |

`sessionGuard(config)`:

| Option | Type | Default | Description |
|---|---|---|---|
| `findUser` | `(id: string \| number) => Promise<UserPayload \| null>` | — | |
| `sessionKey` | `string` | `'auth_user_id'` | Session key of the user id |
| `rememberMeTokens` | `RememberMeTokenDriver` | — | Enables remember-me |
| `rememberMeAge` | `number` | 2 years | Seconds |
| `rememberMeCookieName` | `string` | `'remember_web'` | |
| `rememberMeCookie` | `RememberMeCookieAttributes` | — | `{ path?, domain?, sameSite?, secure? }` |
| `blacklist` | `TokenBlacklist` | — | Revokes the sign-in on logout |
| `sessionAge` | `number` | — | Seconds, when the session store gives none |

`jwtGuard(config)`:

| Option | Type | Default | Description |
|---|---|---|---|
| `secret` | `string` | — | Signing secret |
| `expiresIn` | `TokenDuration` | `3600` | Token lifetime; `expiresInSeconds` is the older spelling |
| `findUser` | `(id: string) => Promise<UserPayload \| null>` | — | |
| `verifyCredentials` | `(email: string, password: string) => Promise<UserPayload \| null>` | — | |
| `blacklist` | `TokenBlacklist` | — | Enables `revoke()` |

`JwtStrategyConfig` also takes `previousSecrets: readonly string[]`, secrets still accepted for verification.

`apiKeyGuard(config)`: `tokens: AccessTokensProviderContract`, `findUser(id)`, `headerName` (default `x-api-key`; a bearer token is read too). `basicAuthGuard(config)`: `verifyCredentials(uid, password)`, `realm` (default `Restricted`).

## Container bindings

| Token | Resolves to |
|---|---|
| `AuthManager` (class) | The manager built from the `auth` config |
| `'warden.auth'` | The same `AuthManager` |
| `'auth'` | The same `AuthManager` |
| `JwtStrategy`, `SessionStrategy`, `ApiKeyStrategy` (classes) | The configured guard of that driver |
| `RightsResolver` (class) | The rights resolver |
| `MemoryRightsStore` (class) | The default rights store, when no `rights.store` is set |
| `'bouncer:registry'` | `{ abilities, policies, resolveScope }` |
| `'warden:loginRoute'` | `loginRoute` |
| `MfaManager` (class), `'warden.mfa'`, `'mfa'` | `mfa.manager`, when set |

`'warden.auth'`, `'auth'`, `'warden.mfa'` and `'mfa'` are declared in `ContainerBindings`, and `ctx.auth.use(name)` is typed as `GuardAccessor`.

## Errors

| Code | Raised when |
|---|---|
| [`E_UNAUTHORIZED_ACCESS`](/en/reference/errors#e-unauthorized-access-warden) | No guard authenticated the request (401), or a token lacks the ability `currentAccessToken.authorize()` asks for (403) |
| [`E_INVALID_CREDENTIALS`](/en/reference/errors#e-invalid-credentials) | `authFinder().verifyCredentials()` found no account, a wrong password, or a password the hasher refuses (400) |
| [`E_AUTHORIZATION_FAILURE`](/en/reference/errors#e-authorization-failure) | A bouncer ability or policy denied the action, or the user lacks a role or permission the route declares (403) |
| [`E_WARDEN_MFA_REQUIRED`](/en/reference/errors#e-warden-mfa-required) | The route declares `@RequireMfa` and the step-up was not passed, or an `MfaManager` call changes the factors of an account that has MFA without `{ stepUp: true }` (403) |
| [`E_WARDEN_AUTH_STRATEGY_ERROR`](/en/reference/errors#e-warden-auth-strategy-error) | Every attempted guard crashed (500) |
| [`E_WARDEN_UNAUTHORIZED`](/en/reference/errors#e-warden-unauthorized) | The standalone `expressMiddleware()` found no token or refused it (401) |
| [`E_WARDEN_AUTH_ERROR`](/en/reference/errors#e-warden-auth-error) | The standalone `expressMiddleware()` failed (500) |
| [`E_WARDEN_NO_AUTH_CONFIG`](/en/reference/errors#e-warden-no-auth-config) | The provider found no guard in `config/auth.ts` |
| [`E_WARDEN_EMPTY_GATE_REQUIREMENT`](/en/reference/errors#e-warden-empty-gate-requirement) | `@Guard()`, `@Role()` or `@Permission()` names nothing to require; thrown when the decorator is applied, and by the middleware for metadata that names nothing |
| [`E_WARDEN_INVALID_CONFIG`](/en/reference/errors#e-warden-invalid-config) | A guard, token, MFA or rate-limit setting is invalid |
| [`E_WARDEN_NAPI_REQUIRED`](/en/reference/errors#e-warden-napi-required) | JWT signing or verification ran without the native engine |
| [`E_WARDEN_NOT_BOOTED`](/en/reference/errors#e-warden-not-booted) | `@c9up/warden/services/main` was read before the provider booted |
| [`E_WARDEN_AUTH_NOT_REGISTERED`](/en/reference/errors#e-warden-auth-not-registered) | The middleware found no `AuthManager` in the container |
| [`E_WARDEN_STRATEGY_NOT_FOUND`](/en/reference/errors#e-warden-strategy-not-found) | A guard name is not configured |
| [`E_WARDEN_STRATEGY_CANNOT_ISSUE`](/en/reference/errors#e-warden-strategy-cannot-issue) | `issueFor()` / `generateToken()` on a guard that mints no tokens |
| [`E_WARDEN_STRATEGY_CANNOT_LOGIN`](/en/reference/errors#e-warden-strategy-cannot-login) | `login()` / `logout()` on a stateless guard |
| [`E_WARDEN_STRATEGY_HAS_NO_CLIENT`](/en/reference/errors#e-warden-strategy-has-no-client) | A guard has no `authenticateAsClient()` |
| [`E_WARDEN_USE_LOGIN`](/en/reference/errors#e-warden-use-login) | `authenticate()` with credentials on a session guard; verify the password, then `login(user)` |
| [`E_WARDEN_NO_SESSION`](/en/reference/errors#e-warden-no-session) | A session guard's `login()` / `logout()` ran without `ctx.session` |
| [`E_WARDEN_REMEMBER_ME_UNAVAILABLE`](/en/reference/errors#e-warden-remember-me-unavailable) | Remember-me was asked and no remember-me tokens are configured |
| [`E_WARDEN_TOKEN_TTL_INVALID`](/en/reference/errors#e-warden-token-ttl-invalid) | A refresh token TTL, or a token lifetime, is not a positive finite number (a token lifetime must also be whole seconds) |
| [`E_WARDEN_OTP_STORE_FULL`](/en/reference/errors#e-warden-otp-store-full) | The in-memory OTP store holds its maximum of pending challenges |
| [`E_WARDEN_OTP_STORE_CONTRACT`](/en/reference/errors#e-warden-otp-store-contract) | The OTP challenge store has no `take()` |
| [`E_WARDEN_REFRESH_STORE_CONTRACT`](/en/reference/errors#e-warden-refresh-store-contract) | The refresh token driver given to `rotateRefreshToken` has no `consume()` or no `revokeFamily()` |
| [`E_WARDEN_WEBAUTHN_STORE_FULL`](/en/reference/errors#e-warden-webauthn-store-full) | The in-memory WebAuthn store holds its maximum of pending ceremonies |
| [`E_WARDEN_STORE_TTL_INVALID`](/en/reference/errors#e-warden-store-ttl-invalid) | A challenge store `ttlMs` is not a positive integer |
| [`E_WARDEN_STORE_LIMIT_INVALID`](/en/reference/errors#e-warden-store-limit-invalid) | A challenge store `maxEntries` is not a positive integer |
| [`E_WARDEN_WEBAUTHN_CREDENTIAL_EXISTS`](/en/reference/errors#e-warden-webauthn-credential-exists) | The passkey's credential id is already registered |
| [`E_WARDEN_INVALID_CREDENTIAL`](/en/reference/errors#e-warden-invalid-credential) | A stored passkey public key is malformed |
| [`E_WARDEN_INVALID_ABILITY`](/en/reference/errors#e-warden-invalid-ability) | `Bouncer.ability()` got options without a callback |
| [`E_WARDEN_UNKNOWN_ABILITY`](/en/reference/errors#e-warden-unknown-ability) | No ability of this name is registered |
| [`E_WARDEN_UNKNOWN_POLICY`](/en/reference/errors#e-warden-unknown-policy) | No policy of this name is registered |
| [`E_WARDEN_UNKNOWN_POLICY_ACTION`](/en/reference/errors#e-warden-unknown-policy-action) | A policy has no method for the action |
| [`E_WARDEN_POLICY_RESOLUTION_FAILED`](/en/reference/errors#e-warden-policy-resolution-failed) | The container resolved a policy to something else than its class |
| [`E_WARDEN_TEMPLATE_ENGINE_UNUSABLE`](/en/reference/errors#e-warden-template-engine-unusable) | `@c9up/inker` is used but `@can` / `@cannot` cannot be registered on it |
| [`E_WARDEN_INVALID_DURATION`](/en/reference/errors#e-warden-invalid-duration) | A duration string does not parse, or names an unknown unit |
| [`E_WARDEN_INVALID_TOTP_SECRET`](/en/reference/errors#e-warden-invalid-totp-secret) | The secret given to `TotpProvider.generate()` / `verify()` is not base32 |
| [`E_WARDEN_BLACKLIST_REQUIRED`](/en/reference/errors#e-warden-blacklist-required) | `JwtStrategy.revoke()` on a guard built without a `blacklist` |
| [`E_WARDEN_STRATEGY_CANNOT_AUTHENTICATE`](/en/reference/errors#e-warden-strategy-cannot-authenticate) | `authenticate()` with credentials on an API key guard; send the token to `verify()` |
| [`E_WARDEN_QUASAR_MISSING`](/en/reference/errors#e-warden-quasar-missing) | A Redis blacklist names a quasar connection and `@c9up/quasar` is not installed, or its provider has not booted |
| [`E_WARDEN_INCOMPLETE_CONNECTION`](/en/reference/errors#e-warden-incomplete-connection) | The quasar connection lacks a command the token blacklist issues (`set`, `exists`) |

Each one is a class of the `errors` namespace and a `@c9up/flare` `Exception`, with status 500 except `E_UNAUTHORIZED_ACCESS` (401), `E_INVALID_CREDENTIALS` (400) and `E_AUTHORIZATION_FAILURE` (403, or the denial's status): branch on `error.code` or on `error instanceof errors.E_*`. A configuration mistake's advice is in `help`.

`E_UNAUTHORIZED_ACCESS`, `E_INVALID_CREDENTIALS` and `E_AUTHORIZATION_FAILURE` render themselves: warden's middleware throws them, as a handler does (`await ctx.auth.authenticate()`, `await bouncer.authorize(...)`), and the host's exception handler calls their `handle`, so one failure gets one response whoever raised it. Each has an `identifier` (`errors.<CODE>`, the translation key read through `ctx.i18n`), `getResponseMessage` and `handle(error, ctx)`:

- `E_UNAUTHORIZED_ACCESS`: an HTML request against a session guard with a `redirectTo` is redirected to the login route; otherwise the guard's `WWW-Authenticate` challenge when it has one, and `401 { "error": { "code", "message" } }`.
- `E_INVALID_CREDENTIALS` negotiates with `request.accepts`: `{ "errors": [{ "message" }] }` for JSON, a JSON:API error object, and for a browser with a session the form flashed back (without `_csrf`, `_method` and passwords), the message flashed under `error` and under the code, and a redirect back; without a session, the message as text.
- `E_AUTHORIZATION_FAILURE` negotiates the same way with the denial's status; only a form submission (`POST`, `PUT`, `PATCH`, `DELETE`) is redirected back with a flash, any other HTML request gets the message as text.

## Migration

- `WardenError` and `WardenTypeError` are gone: test `error.code`, or `error instanceof errors.E_*` with `import { errors } from '@c9up/warden'`. Their `hint` is now `help`. A duration or a token lifetime that does not read is no longer a `TypeError`: test `E_WARDEN_INVALID_DURATION` / `E_WARDEN_TOKEN_TTL_INVALID`.
- `E_UNAUTHORIZED_ACCESS`, `E_INVALID_CREDENTIALS` and `E_AUTHORIZATION_FAILURE` are no longer exported one by one: import `errors` and use `errors.E_UNAUTHORIZED_ACCESS` and so on. Their codes and statuses are unchanged.
- `E_INVALID_CREDENTIALS` and `E_AUTHORIZATION_FAILURE` now render themselves instead of going through the host's default error page: a JSON client receives `{ "errors": [{ "message" }] }`, and a browser with a session is redirected back with the message flashed (for `E_AUTHORIZATION_FAILURE`, on a form submission only).
- `WebauthnCredentialExistsError` becomes `errors.E_WARDEN_WEBAUTHN_CREDENTIAL_EXISTS`, and a store throws it with the id in an array: `throw new errors.E_WARDEN_WEBAUTHN_CREDENTIAL_EXISTS([credentialId])`.
- A strategy that threw a `WardenError` to have it rethrown throws one of `errors` instead; any other error is still reported as a strategy crash.
- `E_WARDEN_FORBIDDEN` is gone: a user who lacks a role or permission the route declares (`@Role`, `@Permission`) gets `E_AUTHORIZATION_FAILURE`, the code of a denied `authorize()` and of the route gate's `.role()` / `.permission()`. The message is translated under `errors.E_AUTHORIZATION_FAILURE` when the context has an `i18n`; the missing roles and permissions are not sent.
- The middleware no longer writes a refusal itself: a request without valid credentials and a user who lacks a declared role or permission are THROWN (`errors.E_UNAUTHORIZED_ACCESS`, `errors.E_AUTHORIZATION_FAILURE`), and the error's own `handle` writes the response. A refused `@Role` / `@Permission` therefore answers as a denied `authorize()` does: `403 { "errors": [{ "message": "Access denied" }] }` for JSON, a JSON:API error object, the message as text for HTML, and a form submission from a browser with a session redirected back with the message flashed. The 401 is unchanged. A `try { await next() } catch` around warden's middleware now sees these errors.
- warden needs `@c9up/ream` 0.2.32 or later, whose exception handler renders an error inside the middleware chain (so what a refusal flashes is saved with the session).
- `authFinder().verifyCredentials()` now throws `E_INVALID_CREDENTIALS` (400) for a password the hasher refuses (over 1024 bytes with sigil, 72 with bcrypt), where an unknown account used to let the hasher's own error through as a 500; `verifyPassword()` answers `false` for it. Check a password's length when it is set, not at sign-in. A custom `hash` is now called differently for an unknown account or a row without a hash: `make()` once, on a random value, then `verify()` at each sign-in, in place of `make(password)`.
- Refresh tokens now come in families, one row per sign-in. `RefreshTokenDriver` is keyed by `familyId` and needs `consume(familyId, presentedHash, successor)` (an atomic compare-and-set) and `revokeFamily(familyId)` in place of `revoke(hash)`; `StoredRefreshToken` gains `familyId`. `generateRefreshToken` and `hashRefreshToken` are gone: open a family with `mintRefreshToken`, and write the refresh endpoint with `rotateRefreshToken` (see [Refresh tokens](#refresh-tokens)) instead of `find` then `revoke`. Add a `family_id` key to your table. Refresh tokens issued before the change no longer refresh: those clients sign in again.
- After a successful sign-in, clear the identifier's key only: replace `limiter.clear(...keys)` with `limiter.clear(AuthRateLimiter.identifierKey(email))`. Clearing the address's key too let a client that owns one account reset its per-address limit at will.
- On an account that has a confirmed factor, `MfaManager.enrollTotp()`, `confirmTotp()`, `createBackupCodes()` and `disableFactor()` now throw `E_WARDEN_MFA_REQUIRED` (403) unless you pass `{ stepUp: ctx.auth.user.mfa === true }` and it is `true`. The label moves into the same options: `enrollTotp(user, { label })`, `createBackupCodes(userId, { label })` in place of a second string argument.
- An ability, a policy action or a `before` / `after` hook that returns something other than a boolean or an `AuthorizationResponse` no longer grants when the value is truthy: an ability or an action denies, and a hook is ignored. Return a real boolean (`return user.isAdmin === true`).
- `@Guard()`, `@Role()` and `@Permission()` with no name (or only empty names, such as a list read from configuration that is empty) now throw `E_WARDEN_EMPTY_GATE_REQUIREMENT` when the class loads, where they used to add no requirement and leave the action public under Warden's middleware. Name at least one, or remove the decorator.
- `OtpProvider.verify()` now takes the recipient: `verify(challengeId, recipient, code)`, with the address you passed to `start()` for this sign-in. A challenge started for another recipient answers `not_found`. A call with only the id and the code throws `E_WARDEN_INVALID_CONFIG`.

## See also

- [Authentication](/en/guides/auth/introduction)
- [Session guard](/en/guides/auth/session-guard)
- [Access tokens guard](/en/guides/auth/access-tokens-guard)
- [JWT guard](/en/guides/auth/jwt-guard)
- [Basic auth guard](/en/guides/auth/basic-auth-guard)
- [Custom guard](/en/guides/auth/custom-guard)
- [Protecting routes](/en/guides/auth/protecting-routes)
- [Verifying credentials](/en/guides/auth/verifying-credentials)
- [Multi-factor authentication](/en/guides/auth/mfa)
- [Authorization](/en/guides/auth/authorization/)
- [Evaluating abilities](/en/guides/auth/authorization/bouncer)
- [Rights (RBAC and ACL)](/en/guides/auth/authorization/rights)
