# warden

`@c9up/warden` : authentification et autorisation : gardes session, JWT, jetons d'accès et HTTP Basic, décorateurs de route, un bouncer avec capacités et policies, rôles et permissions par portée, jetons remember-me et de rafraîchissement, authentification multifacteur (TOTP, codes de secours, codes à usage unique, passkeys) et limitation des tentatives de connexion. Guide : [Authentification](/fr/guides/auth/introduction).

## Installation

```bash
pnpm add @c9up/warden
```

`ream configure @c9up/warden` enregistre le provider, ajoute `JWT_SECRET` (une valeur aléatoire) et `JWT_EXPIRY=3600` aux fichiers d'environnement, et écrit `config/auth.ts` avec une garde JWT dont `findUser` et `verifyCredentials` lèvent une erreur tant que vous ne les avez pas écrites. Les tags de template `@can` / `@cannot` demandent `@c9up/inker` ; les stockages Redis demandent `@c9up/quasar` ou votre propre client. La signature JWT tourne dans un moteur Rust natif.

Le moteur natif est livré dans un petit paquet par plateforme, `@c9up/warden-<plateforme>`, pour linux x64 et arm64 (glibc), macOS x64 et arm64, et Windows x64. `@c9up/warden` les déclare en dépendances optionnelles, et votre gestionnaire de paquets installe seulement celui de votre machine. Vous n'avez pas besoin de toolchain Rust. N'installez pas avec les dépendances optionnelles désactivées (`--no-optional`, `--omit=optional`) : le moteur serait absent.

Il n'existe pas de repli JavaScript. Sans le moteur, signer ou vérifier un JWT lève `E_WARDEN_NAPI_REQUIRED`, et son message nomme le paquet à installer, par exemple `@c9up/warden-linux-x64-gnu`.

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
| `authFinder` | fonction | `authFinder<User>(options: AuthFinderOptions<User>): AuthFinder<User>` : `verifyCredentials(uid, password)` lève `E_INVALID_CREDENTIALS` pour un compte inconnu, un mauvais mot de passe et un mot de passe que le hasher refuse, après le même travail de hachage |
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
| `Permission` | décorateur | `@Permission(...permissions: string[])` : toutes requises ; au moins un nom |
| `Role` | décorateur | `@Role(...roles: string[])` : tous requis ; au moins un nom |
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
| `mintRefreshToken`, `rotateRefreshToken`, `decodeRefreshToken` | fonction | Ouvre une famille de jetons à la connexion ; échange un jeton de rafraîchissement contre son successeur ; découpe une valeur présentée en sa famille et le hachage de son secret. Voir [Jetons de rafraîchissement](#jetons-de-rafraichissement) |
| `MemoryRefreshTokenDriver` | classe | `RefreshTokenDriver` en mémoire |
| `RefreshTokenDriver`, `MintedRefreshToken`, `StoredRefreshToken`, `RefreshTokenSuccessor`, `RefreshTokenRotation` | interface / type | Stockage des jetons de rafraîchissement, une ligne par famille, et la réponse d'une rotation |
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
| `MfaManager` | classe | `new MfaManager(config: MfaManagerConfig)` : `enrollTotp`, `confirmTotp`, `verifyTotp`, `createBackupCodes`, `verifyBackupCode`, `verify(userId, code)`, `isLocked`, `listFactors`, `isEnabled`, `disableFactor` ; `enrollTotp`, `confirmTotp`, `createBackupCodes` et `disableFactor` prennent `{ stepUp }` et l'exigent dès que le compte a la MFA |
| `MfaManagerConfig` | interface | `{ issuer: string; totp?; backupCodes?; store?; rateLimit? }` |
| `MfaChangeOptions`, `MfaEnrollOptions` | interface | `{ stepUp? }`, `{ stepUp?, label? }` : les options d'une modification de facteur |
| `MfaRateLimitConfig` | interface | `{ maxAttempts?, windowSeconds?, store? }` |
| `MfaFactor`, `MfaFactorKind`, `MfaFactorStore`, `MfaFactorSummary` | interface / type | Facteurs enrôlés (`'totp' \| 'backup_codes'`) et leur stockage |
| `MemoryMfaFactorStore` | classe | `MfaFactorStore` en mémoire |
| `TotpProvider` | classe | `new TotpProvider(config?: TotpConfig)` : `enroll(account, issuer)`, `uri(secret, account, issuer)`, `generate(secret, atMs?)`, `verify(...)` |
| `MemoryTotpReplayGuard`, `RedisTotpReplayGuard` | classe | Refusent un code TOTP utilisé deux fois |
| `TotpConfig`, `TotpEnrollment`, `TotpAlgorithm`, `TotpReplayGuard`, `ReplayRedisClient` | interface / type | Options et contrats TOTP |
| `BackupCodesProvider` | classe | `new BackupCodesProvider(config?: BackupCodesConfig)` : `generate()`, `verify(hashes, code)` |
| `BackupCodesConfig`, `BackupCodesResult`, `BackupCodeVerification` | interface | |
| `OtpProvider` | classe | `new OtpProvider(config: OtpConfig)` : `start(recipient)` envoie un code via un canal de livraison, `verify(challengeId, recipient, code)` le vérifie pour ce destinataire seulement |
| `MemoryOtpChallengeStore` | classe | `OtpChallengeStore` en mémoire (10 000 défis en attente au plus) |
| `OtpConfig`, `OtpChallenge`, `OtpChallengeStore`, `OtpDeliveryChannel`, `OtpStartResult`, `OtpVerification`, `OtpFailureReason` | interface / type | Options et contrats des codes à usage unique |
| `WebauthnProvider` | classe | `new WebauthnProvider(config: WebauthnConfig)` : `startRegistration`, `finishRegistration`, `startAuthentication`, `finishAuthentication` |
| `MemoryWebauthnChallengeStore`, `MemoryWebauthnCredentialStore` | classe | Stockages en mémoire des cérémonies et des passkeys (cérémonies de 5 minutes) |
| `WebauthnConfig`, `WebauthnUser`, `StoredPasskey`, `WebauthnChallengeStore`, `WebauthnCredentialStore`, `RegistrationOptionsJSON`, `RegistrationResponseJSON`, `AuthenticationOptionsJSON`, `AuthenticationResponseJSON` | interface | Options des passkeys, enregistrements et JSON du navigateur |

Limitation et stockages :

| Export | Nature | Description |
|---|---|---|
| `AuthRateLimiter` | classe | `new AuthRateLimiter(config?: AuthRateLimiterConfig)` : `attempt(...keys)`, `isBlocked(...keys)`, `clear(...keys)`, `AuthRateLimiter.loginKeys(ip, identifier)`, `AuthRateLimiter.ipKey(ip)`, `AuthRateLimiter.identifierKey(identifier)`. En cas de succès : `clear(AuthRateLimiter.identifierKey(email))` seulement |
| `AuthRateLimiterConfig` | interface | `{ maxAttempts?, windowSeconds?, store? }` |
| `AttemptDecision` | interface | `{ allowed, remaining, retryAfterSeconds }` |
| `MemoryAttemptStore`, `RedisAttemptStore` | classe | Compteurs de tentatives |
| `AttemptStore`, `AttemptCount`, `AttemptRedisClient`, `AttemptRedisSource` | interface / type | Leurs contrats |
| `quasarConnection` | fonction | Une connexion `@c9up/quasar` vérifiée pour les commandes qu'émettent les stockages Redis de warden |

Erreurs :

| Export | Nature | Description |
|---|---|---|
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs). Parmi elles `errors.E_UNAUTHORIZED_ACCESS` (401 ; `guardDriverName`, `redirectTo`, `challenge`), `errors.E_INVALID_CREDENTIALS` (400) et `errors.E_AUTHORIZATION_FAILURE` (403 sauf si le refus donne un autre statut ; le refus sur `error.response`) |

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
| `renderAuthError` | fonction | `renderAuthError(ctx: WardenContext, error: E_UNAUTHORIZED_ACCESS): void` : ce qu'écrit `E_UNAUTHORIZED_ACCESS.handle` ; redirige une requête HTML d'une garde de session vers la route de connexion, sinon répond 401 en JSON |
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

## Jetons de rafraîchissement

Une connexion ouvre une famille de jetons : une ligne qui contient le hachage du seul jeton de rafraîchissement valide à cet instant. Un rafraîchissement consomme ce jeton et met son successeur dans la même ligne. La valeur du jeton est `base64url(familyId).base64url(secret)` ; seul `sha256(secret)` est stocké.

```ts
import { MemoryRefreshTokenDriver, mintRefreshToken, rotateRefreshToken } from '@c9up/warden'

const refreshTokens = new MemoryRefreshTokenDriver() // votre propre driver en production

// Connexion : ouvrez une famille.
const minted = mintRefreshToken(user.id, 30 * 24 * 3600)
await refreshTokens.store(minted.stored)
// Envoyez minted.value au client, avec un jeton d'accès.

// POST /auth/refresh
const rotation = await rotateRefreshToken(refreshTokens, body.refreshToken, 30 * 24 * 3600)
if (!rotation.rotated) {
  // 'invalid' et 'reused' reçoivent le même 401. Sur 'reused', la famille est
  // déjà révoquée ; vous pouvez aussi prévenir l'utilisateur ou fermer toutes
  // ses sessions :
  // if (rotation.reason === 'reused') await refreshTokens.revokeAllForUser(rotation.userId)
  return response.status(401).json({ error: 'invalid_grant' })
}
// Envoyez rotation.value au client, avec un nouveau jeton d'accès pour rotation.userId.
```

`rotateRefreshToken` répond :

| Réponse | Quand |
|---|---|
| `{ rotated: true, userId, familyId, value, expiresAt }` | Le jeton était le jeton courant. `value` est son successeur ; le jeton présenté ne fonctionne plus. |
| `{ rotated: false, reason: 'invalid' }` | Ce n'est pas un jeton de rafraîchissement, ou sa famille est inconnue, révoquée ou expirée (sa ligne est supprimée). |
| `{ rotated: false, reason: 'reused', userId, familyId }` | Un jeton d'une famille vivante qui n'est pas le jeton courant : un jeton déjà consommé, ou le perdant de deux requêtes qui présentent le même jeton au même moment. La famille est révoquée : le successeur reçu par l'autre requête ne fonctionne plus non plus. |

Le second cas attrape un jeton volé : le voleur et le propriétaire tiennent des jetons de la même connexion, et le premier jeton consommé qui revient ferme la famille pour les deux.

### Écrire un driver

Un driver stocke une ligne par famille, indexée par `familyId` : `{ familyId, hash, userId, expiresAt, createdAt }`.

| Méthode | Ce qu'elle doit faire |
|---|---|
| `store(row)` | Insérer la ligne d'une nouvelle famille |
| `find(familyId)` | La ligne, ou `null` |
| `consume(familyId, presentedHash, successor)` | Remplacer `hash` et `expiresAt` par `successor` SEULEMENT si le hachage de la ligne est encore `presentedHash`, en une seule opération indivisible, et répondre si CET appel l'a fait |
| `revokeFamily(familyId)` | Supprimer la ligne |
| `revokeAllForUser(userId)` | Supprimer toutes les lignes de l'utilisateur ; comparer les identifiants comme des chaînes |
| `cleanup()` | Supprimer les lignes expirées |

`consume` est un compare-and-set. En SQL, une seule requête et son nombre de lignes modifiées :

```sql
UPDATE refresh_tokens SET hash = :next_hash, expires_at = :next_expires_at
WHERE family_id = :family_id AND hash = :presented_hash
-- consume() répond : lignes modifiées === 1
```

Sur Redis, un script Lua qui compare le hachage et écrit dans le même appel. Un `find` suivi d'une écriture séparée n'est pas une consommation : deux requêtes avec le même jeton lisent le même hachage et écrivent toutes les deux. Un driver sans `consume()` ou sans `revokeFamily()` est refusé avec `E_WARDEN_REFRESH_STORE_CONTRACT`.

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
| [`E_INVALID_CREDENTIALS`](/fr/reference/errors#e-invalid-credentials) | `authFinder().verifyCredentials()` n'a trouvé aucun compte, un mauvais mot de passe, ou un mot de passe que le hasher refuse (400) |
| [`E_AUTHORIZATION_FAILURE`](/fr/reference/errors#e-authorization-failure) | Une capacité ou une policy du bouncer a refusé l'action, ou l'utilisateur n'a pas un rôle ou une permission que déclare la route (403) |
| [`E_WARDEN_MFA_REQUIRED`](/fr/reference/errors#e-warden-mfa-required) | La route déclare `@RequireMfa` et l'étape MFA n'a pas été passée, ou un appel à `MfaManager` modifie les facteurs d'un compte qui a la MFA sans `{ stepUp: true }` (403) |
| [`E_WARDEN_AUTH_STRATEGY_ERROR`](/fr/reference/errors#e-warden-auth-strategy-error) | Chaque garde tentée a planté (500) |
| [`E_WARDEN_UNAUTHORIZED`](/fr/reference/errors#e-warden-unauthorized) | L'`expressMiddleware()` autonome n'a trouvé aucun jeton ou l'a refusé (401) |
| [`E_WARDEN_AUTH_ERROR`](/fr/reference/errors#e-warden-auth-error) | L'`expressMiddleware()` autonome a échoué (500) |
| [`E_WARDEN_NO_AUTH_CONFIG`](/fr/reference/errors#e-warden-no-auth-config) | Le provider n'a trouvé aucune garde dans `config/auth.ts` |
| [`E_WARDEN_EMPTY_GATE_REQUIREMENT`](/fr/reference/errors#e-warden-empty-gate-requirement) | `@Guard()`, `@Role()` ou `@Permission()` ne nomme rien à exiger ; levée quand le décorateur est appliqué, et par le middleware pour des métadonnées qui ne nomment rien |
| [`E_WARDEN_INVALID_CONFIG`](/fr/reference/errors#e-warden-invalid-config) | Un réglage de garde, de jeton, de MFA ou de limitation est invalide |
| [`E_WARDEN_NAPI_REQUIRED`](/fr/reference/errors#e-warden-napi-required) | La signature ou la vérification JWT a tourné sans le moteur natif |
| [`E_WARDEN_NOT_BOOTED`](/fr/reference/errors#e-warden-not-booted) | `@c9up/warden/services/main` a été lu avant le boot du provider |
| [`E_WARDEN_AUTH_NOT_REGISTERED`](/fr/reference/errors#e-warden-auth-not-registered) | Le middleware n'a trouvé aucun `AuthManager` dans le conteneur |
| [`E_WARDEN_STRATEGY_NOT_FOUND`](/fr/reference/errors#e-warden-strategy-not-found) | Un nom de garde n'est pas configuré |
| [`E_WARDEN_STRATEGY_CANNOT_ISSUE`](/fr/reference/errors#e-warden-strategy-cannot-issue) | `issueFor()` / `generateToken()` sur une garde qui n'émet pas de jetons |
| [`E_WARDEN_STRATEGY_CANNOT_LOGIN`](/fr/reference/errors#e-warden-strategy-cannot-login) | `login()` / `logout()` sur une garde sans état |
| [`E_WARDEN_STRATEGY_HAS_NO_CLIENT`](/fr/reference/errors#e-warden-strategy-has-no-client) | Une garde n'a pas d'`authenticateAsClient()` |
| [`E_WARDEN_USE_LOGIN`](/fr/reference/errors#e-warden-use-login) | `authenticate()` avec des identifiants sur une garde de session ; vérifiez le mot de passe, puis `login(user)` |
| [`E_WARDEN_NO_SESSION`](/fr/reference/errors#e-warden-no-session) | Le `login()` / `logout()` d'une garde de session a tourné sans `ctx.session` |
| [`E_WARDEN_REMEMBER_ME_UNAVAILABLE`](/fr/reference/errors#e-warden-remember-me-unavailable) | Le remember-me a été demandé et aucun jeton remember-me n'est configuré |
| [`E_WARDEN_TOKEN_TTL_INVALID`](/fr/reference/errors#e-warden-token-ttl-invalid) | Le TTL d'un jeton de rafraîchissement, ou la durée de vie d'un jeton, n'est pas un nombre fini positif (une durée de vie de jeton doit aussi tomber en secondes entières) |
| [`E_WARDEN_OTP_STORE_FULL`](/fr/reference/errors#e-warden-otp-store-full) | Le stockage OTP en mémoire contient son maximum de défis en attente |
| [`E_WARDEN_OTP_STORE_CONTRACT`](/fr/reference/errors#e-warden-otp-store-contract) | Le stockage des défis OTP n'a pas de `take()` |
| [`E_WARDEN_REFRESH_STORE_CONTRACT`](/fr/reference/errors#e-warden-refresh-store-contract) | Le driver de jetons de rafraîchissement passé à `rotateRefreshToken` n'a pas de `consume()` ou pas de `revokeFamily()` |
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
| [`E_WARDEN_INVALID_DURATION`](/fr/reference/errors#e-warden-invalid-duration) | Une chaîne de durée ne se lit pas, ou nomme une unité inconnue |
| [`E_WARDEN_INVALID_TOTP_SECRET`](/fr/reference/errors#e-warden-invalid-totp-secret) | Le secret passé à `TotpProvider.generate()` / `verify()` n'est pas du base32 |
| [`E_WARDEN_BLACKLIST_REQUIRED`](/fr/reference/errors#e-warden-blacklist-required) | `JwtStrategy.revoke()` sur une garde construite sans `blacklist` |
| [`E_WARDEN_STRATEGY_CANNOT_AUTHENTICATE`](/fr/reference/errors#e-warden-strategy-cannot-authenticate) | `authenticate()` avec des identifiants sur une garde de clé d'API ; envoyez le jeton à `verify()` |
| [`E_WARDEN_QUASAR_MISSING`](/fr/reference/errors#e-warden-quasar-missing) | Une liste noire Redis nomme une connexion quasar et `@c9up/quasar` n'est pas installé, ou son provider n'a pas démarré |
| [`E_WARDEN_INCOMPLETE_CONNECTION`](/fr/reference/errors#e-warden-incomplete-connection) | La connexion quasar n'a pas une commande qu'émet la liste noire des jetons (`set`, `exists`) |

Chacune est une classe du namespace `errors` et une `Exception` de `@c9up/flare`, de statut 500 sauf `E_UNAUTHORIZED_ACCESS` (401), `E_INVALID_CREDENTIALS` (400) et `E_AUTHORIZATION_FAILURE` (403, ou le statut du refus) : testez `error.code` ou `error instanceof errors.E_*`. Le conseil d'une erreur de configuration est dans `help`.

`E_UNAUTHORIZED_ACCESS`, `E_INVALID_CREDENTIALS` et `E_AUTHORIZATION_FAILURE` se rendent elles-mêmes : le middleware de warden les lève, comme un handler (`await ctx.auth.authenticate()`, `await bouncer.authorize(...)`), et le gestionnaire d'exceptions de l'hôte appelle leur `handle` ; un même échec reçoit donc une même réponse, quel que soit celui qui le lève. Chacune a un `identifier` (`errors.<CODE>`, la clé de traduction lue par `ctx.i18n`), `getResponseMessage` et `handle(error, ctx)` :

- `E_UNAUTHORIZED_ACCESS` : une requête HTML sur une garde de session qui a un `redirectTo` est redirigée vers la route de connexion ; sinon le challenge `WWW-Authenticate` de la garde quand elle en a un, et `401 { "error": { "code", "message" } }`.
- `E_INVALID_CREDENTIALS` négocie avec `request.accepts` : `{ "errors": [{ "message" }] }` en JSON, un objet d'erreur JSON:API, et pour un navigateur avec une session le formulaire remis en flash (sans `_csrf`, `_method` ni les mots de passe), le message en flash sous `error` et sous le code, puis une redirection vers la page précédente ; sans session, le message en texte.
- `E_AUTHORIZATION_FAILURE` négocie de la même façon avec le statut du refus ; seule une soumission de formulaire (`POST`, `PUT`, `PATCH`, `DELETE`) est redirigée vers la page précédente avec un flash, toute autre requête HTML reçoit le message en texte.

## Migration

- `WardenError` et `WardenTypeError` disparaissent : testez `error.code`, ou `error instanceof errors.E_*` avec `import { errors } from '@c9up/warden'`. Leur `hint` devient `help`. Une durée ou une durée de vie de jeton illisible n'est plus une `TypeError` : testez `E_WARDEN_INVALID_DURATION` / `E_WARDEN_TOKEN_TTL_INVALID`.
- `E_UNAUTHORIZED_ACCESS`, `E_INVALID_CREDENTIALS` et `E_AUTHORIZATION_FAILURE` ne sont plus exportées une à une : importez `errors` et utilisez `errors.E_UNAUTHORIZED_ACCESS`, et ainsi de suite. Leurs codes et leurs statuts ne changent pas.
- `E_INVALID_CREDENTIALS` et `E_AUTHORIZATION_FAILURE` se rendent désormais elles-mêmes au lieu de passer par la page d'erreur par défaut de l'hôte : un client JSON reçoit `{ "errors": [{ "message" }] }`, et un navigateur avec une session est redirigé vers la page précédente avec le message en flash (pour `E_AUTHORIZATION_FAILURE`, sur une soumission de formulaire seulement).
- `WebauthnCredentialExistsError` devient `errors.E_WARDEN_WEBAUTHN_CREDENTIAL_EXISTS`, et un stockage la lève avec l'identifiant dans un tableau : `throw new errors.E_WARDEN_WEBAUTHN_CREDENTIAL_EXISTS([credentialId])`.
- Une stratégie qui levait une `WardenError` pour qu'elle soit relancée lève à la place une des classes d'`errors` ; toute autre erreur reste signalée comme un plantage de stratégie.
- `E_WARDEN_FORBIDDEN` disparaît : un utilisateur à qui manque un rôle ou une permission que déclare la route (`@Role`, `@Permission`) reçoit `E_AUTHORIZATION_FAILURE`, le code d'un `authorize()` refusé et du `.role()` / `.permission()` du gate de route. Le message est traduit sous `errors.E_AUTHORIZATION_FAILURE` quand le contexte a un `i18n` ; les rôles et permissions manquants ne sont pas envoyés.
- Le middleware n'écrit plus lui-même un refus : une requête sans identifiants valides et un utilisateur à qui manque un rôle ou une permission déclarés sont LEVÉS (`errors.E_UNAUTHORIZED_ACCESS`, `errors.E_AUTHORIZATION_FAILURE`), et le `handle` de l'erreur écrit la réponse. Un `@Role` / `@Permission` refusé répond donc comme un `authorize()` refusé : `403 { "errors": [{ "message": "Access denied" }] }` en JSON, un objet d'erreur JSON:API, le message en texte pour du HTML, et une soumission de formulaire d'un navigateur avec une session redirigée vers la page précédente avec le message en flash. Le 401 ne change pas. Un `try { await next() } catch` autour du middleware de warden voit désormais ces erreurs.
- warden demande `@c9up/ream` 0.2.32 ou plus récent, dont le gestionnaire d'exceptions rend une erreur à l'intérieur de la chaîne de middlewares (ce qu'un refus met en flash est donc enregistré avec la session).
- `authFinder().verifyCredentials()` lève désormais `E_INVALID_CREDENTIALS` (400) pour un mot de passe que le hasher refuse (plus de 1024 octets avec sigil, 72 avec bcrypt), là où un compte inconnu laissait passer l'erreur du hasher en 500 ; `verifyPassword()` répond `false` dans ce cas. Vérifiez la longueur d'un mot de passe quand il est défini, pas à la connexion. Un `hash` personnalisé est désormais appelé autrement pour un compte inconnu ou une ligne sans hachage : `make()` une fois, sur une valeur aléatoire, puis `verify()` à chaque connexion, à la place de `make(password)`.
- Les jetons de rafraîchissement vont désormais par familles, une ligne par connexion. `RefreshTokenDriver` est indexé par `familyId` et demande `consume(familyId, presentedHash, successor)` (un compare-and-set atomique) et `revokeFamily(familyId)` à la place de `revoke(hash)` ; `StoredRefreshToken` gagne `familyId`. `generateRefreshToken` et `hashRefreshToken` disparaissent : ouvrez une famille avec `mintRefreshToken`, et écrivez la route de rafraîchissement avec `rotateRefreshToken` (voir [Jetons de rafraîchissement](#jetons-de-rafraichissement)) au lieu de `find` puis `revoke`. Ajoutez une clé `family_id` à votre table. Les jetons émis avant ce changement ne rafraîchissent plus : ces clients se reconnectent.
- Après une connexion réussie, effacez seulement la clé de l'identifiant : remplacez `limiter.clear(...keys)` par `limiter.clear(AuthRateLimiter.identifierKey(email))`. Effacer aussi la clé de l'adresse permettait à un client qui possède un compte de remettre à zéro, à volonté, la limite de son adresse.
- Sur un compte qui a un facteur confirmé, `MfaManager.enrollTotp()`, `confirmTotp()`, `createBackupCodes()` et `disableFactor()` lèvent désormais `E_WARDEN_MFA_REQUIRED` (403), sauf si vous passez `{ stepUp: ctx.auth.user.mfa === true }` et qu'il vaut `true`. Le libellé passe dans les mêmes options : `enrollTotp(user, { label })`, `createBackupCodes(userId, { label })` à la place d'un second argument chaîne.
- Une aptitude, une action de politique ou un hook `before` / `after` qui rend autre chose qu'un booléen ou une `AuthorizationResponse` n'accorde plus l'accès quand la valeur est vraie : une aptitude ou une action refuse, et un hook est ignoré. Rendez un vrai booléen (`return user.isAdmin === true`).
- `@Guard()`, `@Role()` et `@Permission()` sans nom (ou avec seulement des noms vides, comme une liste lue dans la configuration et qui est vide) lèvent désormais `E_WARDEN_EMPTY_GATE_REQUIREMENT` au chargement de la classe ; avant, ils n'ajoutaient aucune exigence et laissaient l'action publique sous le middleware de Warden. Nommez-en au moins un, ou retirez le décorateur.
- `OtpProvider.verify()` prend désormais le destinataire : `verify(challengeId, recipient, code)`, avec l'adresse passée à `start()` pour cette connexion. Un challenge ouvert pour un autre destinataire répond `not_found`. Un appel avec seulement l'identifiant et le code lève `E_WARDEN_INVALID_CONFIG`.

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
