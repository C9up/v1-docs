# warden

`@c9up/warden` : authentification et autorisation : gardes session, JWT, jetons d'accès et HTTP Basic, décorateurs de route, un bouncer avec capacités et policies, rôles et permissions par portée, jetons remember-me et de rafraîchissement, authentification multifacteur (TOTP, codes de secours, codes à usage unique, passkeys) et limitation des tentatives de connexion. Guide : [Authentification](/fr/guides/auth/introduction).

## Installation

```bash
pnpm add @c9up/warden
```

`ream configure @c9up/warden` enregistre le provider, ajoute `JWT_SECRET` (une valeur aléatoire) et `JWT_EXPIRY=3600` aux fichiers d'environnement, et écrit `config/auth.ts` avec une garde JWT dont `findUser` et `verifyCredentials` lèvent une erreur tant que vous ne les avez pas écrites. Les tags de template `@can` / `@cannot` demandent `@c9up/inker` ; les stockages Redis demandent `@c9up/quasar` ou votre propre client. La signature JWT tourne dans le moteur natif du paquet.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/warden` | `AuthManager`, `Authenticator`, les gardes et stratégies, les décorateurs, `Bouncer`, les droits, les jetons d'accès, la MFA, la limitation, les erreurs |
| `@c9up/warden/config` | `defineConfig`, les fabriques de gardes et les types de configuration |
| `@c9up/warden/provider` | `WardenProvider` (export par défaut) |
| `@c9up/warden/services/main` | L'`AuthManager` de l'application (export par défaut) |
| `@c9up/warden/middleware` | `WardenMiddleware` (export par défaut), `wardenMiddleware`, `silentAuth`, `initializeBouncer`, `renderAuthError` |
| `@c9up/warden/silent-auth` | `SilentAuthMiddleware` (export par défaut), `silentAuth` |
| `@c9up/warden/standalone` | `createWarden`, pour Express et les autres hôtes sans conteneur |
| `@c9up/warden/configure` | `configure()`, exécuté par `ream configure @c9up/warden` |

## Exports

### `@c9up/warden`

Configuration et gardes :

| Export | Nature | Description |
|---|---|---|
| `defineConfig` | fonction | `defineConfig(config: WardenConfig): WardenConfig` |
| `sessionGuard` | fonction | `sessionGuard(config: SessionStrategyConfig): GuardFactory` |
| `jwtGuard` | fonction | `jwtGuard(config: JwtConfig): GuardFactory` |
| `apiKeyGuard` | fonction | `apiKeyGuard(config: ApiKeyConfig): GuardFactory`, une garde par jetons d'accès |
| `basicAuthGuard` | fonction | `basicAuthGuard(config: BasicAuthConfig): GuardFactory` |
| `WardenConfig` | interface | `config/auth.ts` (voir Configuration) |
| `GuardFactory` | type | Une `AuthStrategy`, partagée par toutes les requêtes |
| `configure` | fonction | Identique à `@c9up/warden/configure` |
| `SessionStrategy` | classe | `new SessionStrategy(config: SessionStrategyConfig)`, driver `session` |
| `JwtStrategy` | classe | `new JwtStrategy(config: JwtStrategyConfig)`, driver `jwt` : `signToken(user, options?)`, `verify(token)`, `revoke(token)` |
| `ApiKeyStrategy` | classe | `new ApiKeyStrategy(config: ApiKeyConfig)`, driver `access_tokens` : `createToken`, `invalidateToken`, `verify` |
| `BasicAuthStrategy` | classe | `new BasicAuthStrategy(config: BasicAuthConfig)`, driver `basic_auth` ; `challenge` est sa valeur `WWW-Authenticate` |
| `createSessionGuardState` | fonction | Un `SessionGuardState` neuf |
| `generateJwtSecret` | fonction | Un secret JWT aléatoire |
| `basicAuthChallenge` | fonction | `basicAuthChallenge(realm?: string): string` ; realm `Restricted` par défaut |
| `decodeBasicAuth` | fonction | Décode un en-tête `Basic` en identifiant et mot de passe |
| `safeCompare` | fonction | Comparaison de chaînes en temps constant |

Authentification :

| Export | Nature | Description |
|---|---|---|
| `AuthManager` | classe | Les gardes configurées ; authentifie, vérifie, émet des jetons, résout les droits |
| `Authenticator` | classe | `ctx.auth`, l'état d'authentification d'une requête |
| `GuardAccessor` | classe | `ctx.auth.use(name)`, une garde d'une requête |
| `authFinder` | fonction | `authFinder<User>(options: AuthFinderOptions<User>): AuthFinder<User>` : `verifyCredentials(uid, password)` lève `E_INVALID_CREDENTIALS` pour un compte inconnu comme pour un mauvais mot de passe, après le même travail de hachage |
| `AuthFinder`, `AuthFinderOptions`, `AuthFinderHasher` | interface | `{ hash: { make, verify }, findForAuth(uid), passwordColumnName? }` (colonne `password` par défaut) |
| `extractCredentials` | fonction | Le jeton bearer, la clé d'API, l'en-tête Basic et la session d'une requête |
| `API_KEY_GUARD_NAMES` | const | Les noms de garde lus comme gardes par jetons d'accès : `access_tokens`, `api-key` |
| `authEventPrefix` | fonction | `authEventPrefix(driverName: string \| undefined): string`, l'espace de noms des événements d'un driver |
| `tokenAllows` | fonction | `tokenAllows(user: UserPayload, permission: string): boolean`, indique si le jeton courant de l'utilisateur porte la capacité |
| `AuthStrategy` | interface | `{ name; authenticate(credentials); verify(token, context?); authenticateAsClient?(...) }`, une garde personnalisée |
| `AuthConfig` | interface | `{ default?, guards?, defaultStrategy?, strategies?, rights? }`, options de `new AuthManager()` |
| `AuthResult` | interface | `{ authenticated: boolean; user?: UserPayload; error?: string }` |
| `UserPayload` | interface | `{ id: string; roles?; permissions?; currentAccessToken?; [key: string]: unknown }` |
| `CurrentAccessToken` | interface | `{ abilities; allows(ability); denies(ability); authorize(ability) }` |
| `WardenEmitter` | type | `{ emit(event, data) }` |
| `AuthAttempt`, `ExtractedCredentials` | interface | Ce que lit une tentative de garde |
| `Secret` | classe | Une valeur qui s'affiche `[redacted]` ; `release()` la renvoie |

Décorateurs de route :

| Export | Nature | Description |
|---|---|---|
| `Guard` | décorateur | `@Guard(first: string, ...rest: string[])` : les gardes qui peuvent authentifier la route ; la première qui réussit l'emporte |
| `Permission` | décorateur | `@Permission(...permissions: string[])` : toutes requises |
| `Role` | décorateur | `@Role(...roles: string[])` : tous requis |
| `RequireMfa` | décorateur | `@RequireMfa()` : l'utilisateur doit avoir passé l'étape MFA |
| `getGuardMetadata`, `getPermissionMetadata`, `getRoleMetadata`, `getRequireMfaMetadata` | fonction | Lisent les décorateurs d'un handler |

Autorisation :

| Export | Nature | Description |
|---|---|---|
| `Bouncer` | classe | `ctx.bouncer` : évalue capacités et policies pour un utilisateur |
| `BasePolicy` | classe | Base d'une classe de policy ; hooks `before()` et `after()` facultatifs |
| `AuthorizationResponse` | classe | `AuthorizationResponse.allow()`, `AuthorizationResponse.deny(message?, status?)`, `t(identifier, data?)` |
| `AbilitiesBuilder` | classe | `new AbilitiesBuilder().define(name, authorizer, options?)…abilities` |
| `action` | décorateur | `@action(options: AbilityOptions)` sur une méthode de policy |
| `allowGuest` | décorateur | `@allowGuest()` : la méthode de policy s'exécute aussi pour un invité |
| `getActionMetadata` | fonction | Lit les options de `@action` |
| `PolicyAuthorizer` | type | `bouncer.with(policy)` : `execute`, `allows`, `denies`, `authorize` par nom d'action |
| `Ability`, `AbilityOptions` | interface | Une capacité définie ; `{ allowGuest? }` |
| `AuthorizerResponse` | type | `boolean \| AuthorizationResponse \| Promise<boolean \| AuthorizationResponse>` |
| `BouncerContext`, `BouncerEmitter`, `PolicyContainerResolver` | interface | `{ scope?, resolver?, containerResolver?, emitter? }` |
| `RightsResolver` | classe | `new RightsResolver(store: RightsStore)` ; `resolve(userId, scope)` donne des `EffectivePermissions` |
| `MemoryRightsStore` | classe | `RightsStore` en mémoire, celui par défaut |
| `RightsStore` | interface | `{ rolePermissions(role, scope); userRoles(userId, scope); userGrants(userId, scope) }` |
| `EffectivePermissions` | interface | `{ has, hasAll, hasAny, permissions, roles, scope }` |
| `Scope` | type | `'global' \| { readonly tenant: string }` |
| `scopeKey` | fonction | `scopeKey(scope: Scope): string` (`'global'` ou `'tenant:<id>'`) |

Jetons d'accès :

| Export | Nature | Description |
|---|---|---|
| `AccessTokensProvider` | classe | `new AccessTokensProvider(options: AccessTokensProviderOptions)` : `create(user, abilities?, options?)`, `verify(value)`, `invalidate(value)` |
| `AccessToken` | classe | Un jeton : `identifier`, `tokenableId`, `type`, `name`, `abilities`, `createdAt`, `updatedAt`, `expiresAt`, `lastUsedAt`, `value` (un `Secret`, seulement après création), `allows`, `denies`, `authorize`, `isExpired` |
| `MemoryAccessTokenStore` | classe | `AccessTokenStore` en mémoire |
| `AccessTokensProviderOptions` | interface | `{ store, prefix?, type?, tokenSecretLength?, expiresIn? }` ; le secret fait au moins 32 caractères |
| `AccessTokensProviderContract`, `AccessTokenStore`, `StoredAccessToken`, `AccessTokenAttributes`, `CreateAccessTokenOptions`, `TokenOwner` | interface | Le contrat du fournisseur, son stockage et ses enregistrements ; `CreateAccessTokenOptions` vaut `{ name?, expiresIn? }` |
| `crc32` | fonction | La somme de contrôle intégrée à la valeur d'un jeton |

Jetons JWT, de rafraîchissement et remember-me :

| Export | Nature | Description |
|---|---|---|
| `JwtStrategyConfig`, `JwtClaims`, `SignTokenOptions` | interface | Options et claims de `JwtStrategy` ; `SignTokenOptions` vaut `{ mfa? }` |
| `TokenBlacklist` | classe | `new TokenBlacklist(driver: BlacklistDriver)` : `revoke(jti, expiresAt)`, `isRevoked(jti)`, `cleanup()` |
| `MemoryBlacklistDriver`, `RedisBlacklistDriver`, `ResilientBlacklistDriver` | classe | Drivers de liste de révocation ; le résilient enveloppe un driver principal d'un repli en mémoire |
| `BlacklistDriver`, `RedisBlacklistConfig`, `RedisLikeClient`, `ResilientBlacklistConfig`, `BlacklistDegradeEvent` | interface | Leurs contrats et options |
| `mintRefreshToken`, `generateRefreshToken`, `hashRefreshToken` | fonction | Création et hachage des jetons de rafraîchissement |
| `MemoryRefreshTokenDriver` | classe | `RefreshTokenDriver` en mémoire |
| `RefreshTokenDriver`, `MintedRefreshToken`, `StoredRefreshToken` | interface | Stockage des jetons de rafraîchissement |
| `RememberMeToken` | classe | Un jeton remember-me |
| `mintRememberMeToken`, `verifyAndRecycleRememberMeToken` | fonction | Émet un jeton remember-me ; en vérifie un et le remplace |
| `MemoryRememberMeTokenDriver` | classe | `RememberMeTokenDriver` en mémoire |
| `RememberMeTokenDriver`, `MintedRememberMeToken`, `StoredRememberMeToken` | type | Stockage des jetons remember-me |
| `encodeTokenValue`, `decodeTokenValue`, `hashSecret`, `safeCompareHashes`, `DEFAULT_SECRET_LENGTH` | fonction / const | Encodage et hachage des valeurs de jeton |
| `SessionStore`, `SessionStrategyConfig`, `SessionGuardState`, `RememberMeCookieAttributes` | interface | Contrats et options de la garde de session |
| `TokenDuration` | type | Des secondes, ou une durée (`'1h'`, `'7 days'`) |
| `parseDurationSeconds` | fonction | `parseDurationSeconds(value: TokenDuration): number` |

Authentification multifacteur :

| Export | Nature | Description |
|---|---|---|
| `MfaManager` | classe | `new MfaManager(config: MfaManagerConfig)` : `enrollTotp`, `confirmTotp`, `verifyTotp`, `createBackupCodes`, `verifyBackupCode`, `verify(userId, code)`, `isLocked`, `listFactors`, `isEnabled`, `disableFactor` |
| `MfaManagerConfig` | interface | `{ issuer: string; totp?; backupCodes?; store?; rateLimit? }` |
| `MfaRateLimitConfig` | interface | `{ maxAttempts?, windowSeconds?, store? }` |
| `MfaFactor`, `MfaFactorKind`, `MfaFactorStore`, `MfaFactorSummary` | interface / type | Facteurs enrôlés (`'totp' \| 'backup_codes'`) et leur stockage |
| `MemoryMfaFactorStore` | classe | `MfaFactorStore` en mémoire |
| `TotpProvider` | classe | `new TotpProvider(config?: TotpConfig)` : `enroll(account, issuer)`, `uri(secret, account, issuer)`, `generate(secret, atMs?)`, `verify(...)` |
| `MemoryTotpReplayGuard`, `RedisTotpReplayGuard` | classe | Refusent un code TOTP utilisé deux fois |
| `TotpConfig`, `TotpEnrollment`, `TotpAlgorithm`, `TotpReplayGuard`, `ReplayRedisClient` | interface / type | Options et contrats TOTP |
| `BackupCodesProvider` | classe | `new BackupCodesProvider(config?: BackupCodesConfig)` : `generate()`, `verify(hashes, code)` |
| `BackupCodesConfig`, `BackupCodesResult`, `BackupCodeVerification` | interface | |
| `OtpProvider` | classe | `new OtpProvider(config: OtpConfig)` : `start(...)` envoie un code via un canal de livraison, `verify(...)` |
| `MemoryOtpChallengeStore` | classe | `OtpChallengeStore` en mémoire (10 000 défis en attente au plus) |
| `OtpConfig`, `OtpChallenge`, `OtpChallengeStore`, `OtpDeliveryChannel`, `OtpStartResult`, `OtpVerification`, `OtpFailureReason` | interface / type | Options et contrats des codes à usage unique |
| `WebauthnProvider` | classe | `new WebauthnProvider(config: WebauthnConfig)` : `startRegistration`, `finishRegistration`, `startAuthentication`, `finishAuthentication` |
| `MemoryWebauthnChallengeStore`, `MemoryWebauthnCredentialStore` | classe | Stockages en mémoire des cérémonies et des passkeys (cérémonies de 5 minutes) |
| `WebauthnCredentialExistsError` | erreur | L'identifiant de credential est déjà enregistré |
| `WebauthnConfig`, `WebauthnUser`, `StoredPasskey`, `WebauthnChallengeStore`, `WebauthnCredentialStore`, `RegistrationOptionsJSON`, `RegistrationResponseJSON`, `AuthenticationOptionsJSON`, `AuthenticationResponseJSON` | interface | Options des passkeys, enregistrements et JSON du navigateur |

Limitation et stockages :

| Export | Nature | Description |
|---|---|---|
| `AuthRateLimiter` | classe | `new AuthRateLimiter(config?: AuthRateLimiterConfig)` : `attempt(...keys)`, `isBlocked(...keys)`, `clear(...keys)`, `AuthRateLimiter.loginKeys(ip, identifier)` |
| `AuthRateLimiterConfig` | interface | `{ maxAttempts?, windowSeconds?, store? }` |
| `AttemptDecision` | interface | `{ allowed, remaining, retryAfterSeconds }` |
| `MemoryAttemptStore`, `RedisAttemptStore` | classe | Compteurs de tentatives |
| `AttemptStore`, `AttemptCount`, `AttemptRedisClient`, `AttemptRedisSource` | interface / type | Leurs contrats |
| `quasarConnection` | fonction | Une connexion `@c9up/quasar` vérifiée pour les commandes qu'émettent les stockages Redis de warden |

Erreurs :

| Export | Nature | Description |
|---|---|---|
| `WardenError` | erreur | `code` (un code sans `E_` reçoit `E_WARDEN_`), `hint`, `status` |
| `E_UNAUTHORIZED_ACCESS` | erreur | 401 ; `guardDriverName`, `redirectTo`, `challenge` |
| `E_INVALID_CREDENTIALS` | erreur | 400 |
| `E_AUTHORIZATION_FAILURE` | erreur | 403 sauf si le refus donne un autre statut ; le refus sur `error.response` |

### `AuthManager`

`new AuthManager(config: AuthConfig)`.

| Membre | Signature | Description |
|---|---|---|
| `authenticate` | `authenticate(credentials: Record<string, unknown>, strategyName?: string): Promise<AuthResult>` | Vérifie des identifiants avec une garde |
| `verify` | `verify(token: string, strategyName?: string, context?: Record<string, unknown>): Promise<AuthResult>` | Vérifie un jeton avec une garde |
| `issueFor` | `issueFor(user: UserPayload, strategyName?: string, options?: { mfa?: boolean }): string` | Émet un jeton via une garde qui en émet |
| `login` | `login(user: UserPayload, session: SessionStore, strategyName?: string, state?: SessionGuardState): Promise<void>` | Installe un utilisateur dans une session (gardes de session) |
| `logout` | `logout(session: SessionStore, strategyName?: string, state?: SessionGuardState): Promise<void>` | |
| `authenticateViaRememberMeToken` | `authenticateViaRememberMeToken(cookieValue: unknown, strategyName?: string, state?): Promise<{ user; cookieValue } \| null>` | |
| `resolvePermissions` | `resolvePermissions(user: UserPayload, scope?: Scope): Promise<EffectivePermissions>` | Rôles et permissions de l'utilisateur dans une portée (`'global'` par défaut) |
| `hasRole` / `hasPermission` | `hasRole(user: UserPayload, role: string, scope?: Scope): Promise<boolean>` | |
| `hasAllPermissions` | `hasAllPermissions(user: UserPayload, permissions: readonly string[], scope?: Scope): Promise<boolean>` | |
| `createAuthenticator` | `createAuthenticator(ctx: WardenContext): Authenticator` | Ce que construit le middleware à chaque requête, pour une commande ou une tâche |
| `createAuthenticatorClient` | `createAuthenticatorClient(): { use(guard?) }` | Le point d'entrée des tests : `use(guard).authenticateAsClient(...)` |
| `getStrategy` | `getStrategy(name?: string): AuthStrategy` | |
| `registerStrategy` | `registerStrategy(name: string, strategy: AuthStrategy): void` | |
| `getStrategyNames` | `getStrategyNames(): string[]` | |
| `defaultStrategyName` | `readonly defaultStrategyName: string` | |
| `setEmitter` | `setEmitter(emitter: WardenEmitter): this` | Annonce les événements d'authentification |
| `eventPrefixFor` | `eventPrefixFor(guardName?: string): string` | |

### `Authenticator`

`ctx.auth`. Construit par le middleware, ou par `auth.createAuthenticator(ctx)`.

| Membre | Signature | Description |
|---|---|---|
| `authenticate` | `authenticate(): Promise<UserPayload>` | L'utilisateur via la garde par défaut ; lève `E_UNAUTHORIZED_ACCESS` |
| `check` | `check(): Promise<boolean>` | Idem, en répondant au lieu de lever une erreur |
| `authenticateUsing` | `authenticateUsing(guards?: string[], options?: { loginRoute?: string }): Promise<UserPayload>` | La première garde de la liste qui authentifie |
| `checkUsing` | `checkUsing(guards?: string[], options?): Promise<boolean>` | |
| `use` | `use(name?: string): GuardAccessor` | Une garde de cette requête ; la garde par défaut sans nom |
| `user` | `readonly user: UserPayload \| undefined` | |
| `getUserOrFail` | `getUserOrFail(): UserPayload` | Lève `E_UNAUTHORIZED_ACCESS` |
| `isAuthenticated` / `authenticationAttempted` | `readonly isAuthenticated: boolean` | |
| `authenticatedViaGuard` | `readonly authenticatedViaGuard: string \| undefined` | |
| `attemptedVia` | `attemptedVia(name: string): boolean` | |
| `defaultGuard` | `readonly defaultGuard: string` | |
| `roles` / `permissions` | `readonly roles: string[] \| undefined` | |
| `hasPermission` | `hasPermission(permission: string, scope?: Scope): Promise<boolean>` | |
| `hasAllPermissions` | `hasAllPermissions(permissions: readonly string[], scope?: Scope): Promise<boolean>` | |

Un refus d'identifiants est une réponse ; une garde qui plante se propage (`E_WARDEN_AUTH_STRATEGY_ERROR`) au lieu de se lire comme « non connecté ».

### `GuardAccessor`

| Membre | Signature | Description |
|---|---|---|
| `authenticate` / `check` | `authenticate(): Promise<UserPayload>` / `check(): Promise<boolean>` | Cette garde seulement |
| `user`, `isAuthenticated`, `authenticationAttempted` | accesseurs | |
| `getUserOrFail` | `getUserOrFail(): UserPayload` | |
| `login` | `login(user: UserPayload, remember?: boolean): Promise<void>` | Gardes de session ; `remember` émet un cookie remember-me |
| `logout` | `logout(): Promise<void>` | Gardes de session |
| `viaRemember`, `attemptedViaRemember`, `isLoggedOut` | accesseurs | État de la garde de session pour cette requête |
| `authenticateViaRememberMeToken` | `authenticateViaRememberMeToken(cookieValue: unknown): Promise<{ user; cookieValue } \| null>` | |
| `markMfaVerified` | `markMfaVerified(): void` | Enregistre dans la session une étape MFA réussie |
| `createToken` | `createToken(user: TokenOwner, abilities?: string[], options?: CreateAccessTokenOptions): Promise<AccessToken>` | Gardes par jetons d'accès |
| `invalidateToken` | `invalidateToken(): Promise<boolean>` | Révoque le jeton de cette requête |
| `authenticateAsClient` | `authenticateAsClient(...args): Promise<AuthClientResponse>` | Ce qu'envoie un client de test (en-têtes, session, cookies) |

### `Bouncer`

`new Bouncer(user, abilities?, policies?, context?)` ; `initializeBouncer` en place un sur `ctx.bouncer` à chaque requête.

| Membre | Signature | Description |
|---|---|---|
| `allows` | `allows(ability: string \| Ability, ...args): Promise<boolean>` | |
| `denies` | `denies(ability: string \| Ability, ...args): Promise<boolean>` | |
| `authorize` | `authorize(ability: string \| Ability, ...args): Promise<void>` | Lève `E_AUTHORIZATION_FAILURE` |
| `execute` | `execute(ability: string \| Ability, ...args): Promise<AuthorizationResponse>` | |
| `with` | `with(policy: (new () => BasePolicy) \| string): PolicyAuthorizer` | Une policy, par classe ou par nom enregistré |
| `deny` | `deny(message?: string, status?: number): AuthorizationResponse` | |
| `scope` | `readonly scope: Scope` | |
| `setContainerResolver` | `setContainerResolver(containerResolver?): this` | Résout les policies via le conteneur |
| `Bouncer.ability` | `static ability(callback)` / `static ability(options: AbilityOptions, callback)` | Définit une capacité |
| `Bouncer.define` | `static define(name, authorizer, options?): AbilitiesBuilder` | |

Chaque évaluation émet `authorization:finished` quand un émetteur est branché.

### `@c9up/warden/config`

| Export | Nature | Description |
|---|---|---|
| `defineConfig`, `sessionGuard`, `jwtGuard`, `apiKeyGuard`, `basicAuthGuard` | fonction | Identiques à ceux de `@c9up/warden` |
| `WardenConfig`, `GuardFactory` | type | Identiques à ceux de `@c9up/warden` |
| `JwtConfig` | interface | Options de `jwtGuard()` |
| `ScopeRequestContext` | interface | `{ request: { headers }, auth? }`, ce que reçoit `resolveScope` |

### `@c9up/warden/provider`

| Export | Nature | Description |
|---|---|---|
| `default` | provider | `WardenProvider` : construit les gardes et l'`AuthManager` depuis la configuration `auth`, le résolveur de droits et le registre du bouncer, remplit `@c9up/warden/services/main`, et enregistre `@can` / `@cannot` quand `@c9up/inker` est utilisé |
| `WardenAppContext` | interface | `{ container, config, usingInker? }` |

### `@c9up/warden/services/main`

| Export | Nature | Description |
|---|---|---|
| `default` | const | `auth: AuthManager`, le gestionnaire de l'application une fois `WardenProvider` démarré ; lire un membre avant lève `E_WARDEN_NOT_BOOTED` |

### `@c9up/warden/middleware`

| Export | Nature | Description |
|---|---|---|
| `default` | classe | `WardenMiddleware`, `handle(ctx, next)` : applique les `@Guard`, `@Role`, `@Permission` et `@RequireMfa` de la route ; refuse tout sans `AuthManager` |
| `wardenMiddleware` | fonction | `wardenMiddleware(ctx: WardenContext, next): Promise<void>` |
| `silentAuth` | fonction | `silentAuth(ctx: WardenContext, next): Promise<void>` : fixe `ctx.auth` via la garde par défaut, ne répond jamais 401 |
| `initializeBouncer` | fonction | `initializeBouncer(ctx: WardenContext, next): Promise<void>` : fixe `ctx.bouncer` sur chaque requête |
| `renderAuthError` | fonction | `renderAuthError(ctx: WardenContext, error: E_UNAUTHORIZED_ACCESS): void` : redirige une requête HTML d'une garde de session vers la route de connexion, sinon répond 401 en JSON |
| `WardenContext` | interface | La partie du contexte HTTP que lit le middleware |
| `BouncerRegistry` | interface | `{ abilities, policies, resolveScope? }` |

### `@c9up/warden/silent-auth`

| Export | Nature | Description |
|---|---|---|
| `default` | classe | `SilentAuthMiddleware`, `handle(ctx, next)` ; enregistrez-le avant le middleware qui applique les gardes |
| `silentAuth` | fonction | Identique à celle de `@c9up/warden/middleware` |

### `@c9up/warden/standalone`

| Export | Nature | Description |
|---|---|---|
| `createWarden` | fonction | `createWarden(config: WardenConfig): Warden` |
| `Warden` | interface | `verify(token, strategy?)`, `authenticate(credentials, strategy?)`, `generateToken(user, guard?)`, `manager`, `expressMiddleware()` (jeton bearer en entrée, `req.auth` et `req.user` en sortie) |
| `StandaloneRequest`, `StandaloneResponse` | interface | La requête et la réponse de style Express que lit le middleware |

### `@c9up/warden/configure`

| Export | Nature | Description |
|---|---|---|
| `configure` | fonction | `configure(codemods): Promise<void>` : enregistre le provider, ajoute `JWT_SECRET` et `JWT_EXPIRY`, écrit `config/auth.ts` |

## Événements d'authentification

Avec un émetteur (`auth.setEmitter(emitter)`), chaque décision d'authentification est annoncée sous un préfixe tiré du driver de la garde :

| Driver | Préfixe d'événement |
|---|---|
| `session` | `session_auth:` |
| `access_tokens` | `access_tokens_auth:` |
| `basic_auth` | `basic_auth:` |
| `jwt` | `jwt_auth:` |

Événements : `login_attempted`, `login_succeeded` et `logged_out` (gardes de session), `authentication_attempted`, `authentication_succeeded` et `authentication_failed` (toutes les gardes). Un écouteur qui lève une erreur ne casse jamais une connexion.

## Configuration

`config/auth.ts`, lu sous la clé `auth`. Le provider lève `E_WARDEN_NO_AUTH_CONFIG` sans aucune garde.

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

| Option | Type | Défaut | Description |
|---|---|---|---|
| `guards` | `Record<string, GuardFactory>` | — | Les gardes, par nom |
| `default` | `string` | la première garde | Garde utilisée quand aucune n'est nommée |
| `loginRoute` | `string` | — | Où rediriger une requête HTML non authentifiée d'une garde de session ; sinon 401 en JSON |
| `jwt`, `session`, `apiKey` | `JwtConfig`, `SessionStrategyConfig`, `ApiKeyConfig` | — | Ancienne forme : une garde par driver, nommées `jwt`, `session` et `access_tokens` / `api-key` ; ignorée quand `guards` est défini |
| `defaultStrategy` | `string` | — | Ancien nom de `default` |
| `rights.store` | `RightsStore` | `MemoryRightsStore` | D'où viennent rôles et attributions |
| `abilities` | `Record<string, Ability>` | `{}` | Capacités que le bouncer connaît par nom |
| `policies` | `Record<string, new () => BasePolicy>` | `{}` | Policies que le bouncer connaît par nom |
| `resolveScope` | `(ctx: ScopeRequestContext) => Scope \| Promise<Scope>` | `'global'` | La portée d'autorisation d'une requête |
| `mfa.manager` | `MfaManager` | — | Lie le gestionnaire MFA ; nécessaire à `@RequireMfa` |

`sessionGuard(config)` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `findUser` | `(id: string \| number) => Promise<UserPayload \| null>` | — | |
| `sessionKey` | `string` | `'auth_user_id'` | Clé de session de l'identifiant utilisateur |
| `rememberMeTokens` | `RememberMeTokenDriver` | — | Active le remember-me |
| `rememberMeAge` | `number` | 2 ans | En secondes |
| `rememberMeCookieName` | `string` | `'remember_web'` | |
| `rememberMeCookie` | `RememberMeCookieAttributes` | — | `{ path?, domain?, sameSite?, secure? }` |
| `blacklist` | `TokenBlacklist` | — | Révoque la connexion à la déconnexion |
| `sessionAge` | `number` | — | En secondes, quand le stockage de session n'en donne pas |

`jwtGuard(config)` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `secret` | `string` | — | Secret de signature |
| `expiresIn` | `TokenDuration` | `3600` | Durée de vie du jeton ; `expiresInSeconds` est l'ancienne écriture |
| `findUser` | `(id: string) => Promise<UserPayload \| null>` | — | |
| `verifyCredentials` | `(email: string, password: string) => Promise<UserPayload \| null>` | — | |
| `blacklist` | `TokenBlacklist` | — | Active `revoke()` |

`JwtStrategyConfig` accepte aussi `previousSecrets: readonly string[]`, des secrets encore acceptés à la vérification.

`apiKeyGuard(config)` : `tokens: AccessTokensProviderContract`, `findUser(id)`, `headerName` (par défaut `x-api-key` ; un jeton bearer est lu aussi). `basicAuthGuard(config)` : `verifyCredentials(uid, password)`, `realm` (par défaut `Restricted`).

## Liaisons du conteneur

| Token | Résout vers |
|---|---|
| `AuthManager` (classe) | Le gestionnaire construit depuis la configuration `auth` |
| `'warden.auth'` | Le même `AuthManager` |
| `'auth'` | Le même `AuthManager` |
| `JwtStrategy`, `SessionStrategy`, `ApiKeyStrategy` (classes) | La garde configurée de ce driver |
| `RightsResolver` (classe) | Le résolveur de droits |
| `MemoryRightsStore` (classe) | Le stockage de droits par défaut, quand aucun `rights.store` n'est défini |
| `'bouncer:registry'` | `{ abilities, policies, resolveScope }` |
| `'warden:loginRoute'` | `loginRoute` |
| `MfaManager` (classe), `'warden.mfa'`, `'mfa'` | `mfa.manager`, s'il est défini |

`'warden.auth'`, `'auth'`, `'warden.mfa'` et `'mfa'` sont déclarés dans `ContainerBindings`, et `ctx.auth.use(name)` est typé `GuardAccessor`.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_UNAUTHORIZED_ACCESS`](/fr/reference/errors#e-unauthorized-access-warden) | Aucune garde n'a authentifié la requête (401), ou un jeton n'a pas la capacité que demande `currentAccessToken.authorize()` (403) |
| [`E_INVALID_CREDENTIALS`](/fr/reference/errors#e-invalid-credentials) | `authFinder().verifyCredentials()` n'a trouvé aucun compte ou un mauvais mot de passe (400) |
| [`E_AUTHORIZATION_FAILURE`](/fr/reference/errors#e-authorization-failure) | Une capacité ou une policy du bouncer a refusé l'action (403) |
| [`E_WARDEN_FORBIDDEN`](/fr/reference/errors#e-warden-forbidden) | L'utilisateur n'a pas un rôle ou une permission que déclare la route (403) |
| [`E_WARDEN_MFA_REQUIRED`](/fr/reference/errors#e-warden-mfa-required) | La route déclare `@RequireMfa` et l'étape MFA n'a pas été passée (403) |
| [`E_WARDEN_AUTH_STRATEGY_ERROR`](/fr/reference/errors#e-warden-auth-strategy-error) | Chaque garde tentée a planté (500) |
| [`E_WARDEN_UNAUTHORIZED`](/fr/reference/errors#e-warden-unauthorized) | L'`expressMiddleware()` autonome n'a trouvé aucun jeton ou l'a refusé (401) |
| [`E_WARDEN_AUTH_ERROR`](/fr/reference/errors#e-warden-auth-error) | L'`expressMiddleware()` autonome a échoué (500) |
| [`E_WARDEN_NO_AUTH_CONFIG`](/fr/reference/errors#e-warden-no-auth-config) | Le provider n'a trouvé aucune garde dans `config/auth.ts` |
| [`E_WARDEN_INVALID_CONFIG`](/fr/reference/errors#e-warden-invalid-config) | Un réglage de garde, de jeton, de MFA ou de limitation est invalide |
| [`E_WARDEN_NAPI_REQUIRED`](/fr/reference/errors#e-warden-napi-required) | La signature JWT a tourné sans le moteur natif |
| [`E_WARDEN_NOT_BOOTED`](/fr/reference/errors#e-warden-not-booted) | `@c9up/warden/services/main` a été lu avant le boot du provider |
| [`E_WARDEN_AUTH_NOT_REGISTERED`](/fr/reference/errors#e-warden-auth-not-registered) | Le middleware n'a trouvé aucun `AuthManager` dans le conteneur |
| [`E_WARDEN_STRATEGY_NOT_FOUND`](/fr/reference/errors#e-warden-strategy-not-found) | Un nom de garde n'est pas configuré |
| [`E_WARDEN_STRATEGY_CANNOT_ISSUE`](/fr/reference/errors#e-warden-strategy-cannot-issue) | `issueFor()` / `generateToken()` sur une garde qui n'émet pas de jetons |
| [`E_WARDEN_STRATEGY_CANNOT_LOGIN`](/fr/reference/errors#e-warden-strategy-cannot-login) | `login()` / `logout()` sur une garde sans état |
| [`E_WARDEN_STRATEGY_HAS_NO_CLIENT`](/fr/reference/errors#e-warden-strategy-has-no-client) | Une garde n'a pas d'`authenticateAsClient()` |
| [`E_WARDEN_USE_LOGIN`](/fr/reference/errors#e-warden-use-login) | `authenticate()` avec des identifiants sur une garde de session ; vérifiez le mot de passe, puis `login(user)` |
| [`E_WARDEN_NO_SESSION`](/fr/reference/errors#e-warden-no-session) | Le `login()` / `logout()` d'une garde de session a tourné sans `ctx.session` |
| [`E_WARDEN_REMEMBER_ME_UNAVAILABLE`](/fr/reference/errors#e-warden-remember-me-unavailable) | Le remember-me a été demandé et aucun jeton remember-me n'est configuré |
| [`E_WARDEN_TOKEN_TTL_INVALID`](/fr/reference/errors#e-warden-token-ttl-invalid) | Le TTL d'un jeton de rafraîchissement n'est pas un nombre fini positif |
| [`E_WARDEN_OTP_STORE_FULL`](/fr/reference/errors#e-warden-otp-store-full) | Le stockage OTP en mémoire contient son maximum de défis en attente |
| [`E_WARDEN_OTP_STORE_CONTRACT`](/fr/reference/errors#e-warden-otp-store-contract) | Le stockage des défis OTP n'a pas de `take()` |
| [`E_WARDEN_WEBAUTHN_STORE_FULL`](/fr/reference/errors#e-warden-webauthn-store-full) | Le stockage WebAuthn en mémoire contient son maximum de cérémonies en attente |
| [`E_WARDEN_STORE_TTL_INVALID`](/fr/reference/errors#e-warden-store-ttl-invalid) | Le `ttlMs` d'un stockage de défis n'est pas un entier positif |
| [`E_WARDEN_STORE_LIMIT_INVALID`](/fr/reference/errors#e-warden-store-limit-invalid) | Le `maxEntries` d'un stockage de défis n'est pas un entier positif |
| [`E_WARDEN_WEBAUTHN_CREDENTIAL_EXISTS`](/fr/reference/errors#e-warden-webauthn-credential-exists) | L'identifiant de credential de la passkey est déjà enregistré |
| [`E_WARDEN_INVALID_CREDENTIAL`](/fr/reference/errors#e-warden-invalid-credential) | La clé publique d'une passkey stockée est malformée |
| [`E_WARDEN_INVALID_ABILITY`](/fr/reference/errors#e-warden-invalid-ability) | `Bouncer.ability()` a reçu des options sans callback |
| [`E_WARDEN_UNKNOWN_ABILITY`](/fr/reference/errors#e-warden-unknown-ability) | Aucune capacité de ce nom n'est enregistrée |
| [`E_WARDEN_UNKNOWN_POLICY`](/fr/reference/errors#e-warden-unknown-policy) | Aucune policy de ce nom n'est enregistrée |
| [`E_WARDEN_UNKNOWN_POLICY_ACTION`](/fr/reference/errors#e-warden-unknown-policy-action) | Une policy n'a pas de méthode pour l'action |
| [`E_WARDEN_POLICY_RESOLUTION_FAILED`](/fr/reference/errors#e-warden-policy-resolution-failed) | Le conteneur a résolu une policy en autre chose qu'une instance de sa classe |
| [`E_WARDEN_TEMPLATE_ENGINE_UNUSABLE`](/fr/reference/errors#e-warden-template-engine-unusable) | `@c9up/inker` est utilisé mais `@can` / `@cannot` ne peuvent pas y être enregistrés |

## Voir aussi

- [Authentification](/fr/guides/auth/introduction)
- [Garde de session](/fr/guides/auth/session-guard)
- [Garde par jetons d'accès](/fr/guides/auth/access-tokens-guard)
- [Garde JWT](/fr/guides/auth/jwt-guard)
- [Garde Basic auth](/fr/guides/auth/basic-auth-guard)
- [Garde personnalisée](/fr/guides/auth/custom-guard)
- [Protéger les routes](/fr/guides/auth/protecting-routes)
- [Vérifier des identifiants](/fr/guides/auth/verifying-credentials)
- [Authentification multifacteur](/fr/guides/auth/mfa)
- [Autorisation](/fr/guides/auth/authorization/)
- [Évaluer les capacités](/fr/guides/auth/authorization/bouncer)
- [Droits (RBAC et ACL)](/fr/guides/auth/authorization/rights)
