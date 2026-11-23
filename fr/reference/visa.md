# visa

`@c9up/visa` : un serveur d'autorisation OAuth 2.1 qui délivre des jetons à d'autres applications au nom d'un utilisateur : code d'autorisation avec PKCE, rotation des jetons de rafraîchissement, identifiants client, révocation, introspection et enregistrement de clients, sur un contrat de stockage. Guide : [Serveur OAuth](/fr/guides/oauth-server/introduction).

## Installation

```bash
pnpm add @c9up/visa
```

`ream configure @c9up/visa` enregistre le provider, écrit `config/visa.ts`, ajoute `VISA_ISSUER` aux fichiers d'environnement et écrit les migrations des tables qu'utilise `AtlasStore`. Il n'écrit ni le stockage de production ni la route `/authorize` : les deux vous reviennent.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/visa` | `VisaManager`, les fonctions du protocole, `VisaGuard`, les deux stockages, les erreurs et les types |
| `@c9up/visa/config` | `defineConfig`, `VisaConfigInput` |
| `@c9up/visa/provider` | `VisaProvider` (export par défaut) |
| `@c9up/visa/services/main` | Le `VisaManager` de l'application (export par défaut) |
| `@c9up/visa/configure` | `configure()`, exécuté par `ream configure @c9up/visa` |
| `@c9up/visa/stores/memory` | `MemoryStore` |
| `@c9up/visa/stores/atlas` | `AtlasStore` et ses types de base de données |
| `@c9up/visa/types` | Les types d'enregistrement (`Client`, `AccessToken`, …) |
| `@c9up/visa/testing` | `testVisa()`, un vrai serveur sur un stockage en mémoire avec un client enregistré |

## Exports

### `@c9up/visa`

Le serveur :

| Export | Nature | Description |
|---|---|---|
| `VisaManager` | classe | Le serveur d'autorisation : clients, autorisation, consentement, jetons, introspection, révocation, vérification |
| `VisaConfig` | interface | Options de `VisaManager` (voir Configuration) |
| `AuthorizationOutcome` | type | `{ type: 'redirect'; url } \| { type: 'consent'; request: ValidatedRequest } \| { type: 'error'; error: OAuthError }` |
| `ConsentTicket` | interface | `{ id: string; userId: string; expiresAt: number; request: AuthorizationRequest }`, gardé en session entre la page de consentement et sa réponse |
| `defineConfig` | fonction | Identique à `@c9up/visa/config` |
| `VisaConfigInput` | interface | Identique à `@c9up/visa/config` |
| `visa` | const | Identique à l'export par défaut de `@c9up/visa/services/main` |
| `setVisa` | fonction | `setVisa(manager: VisaManager): void`, installe le gestionnaire derrière `visa` sans le provider |
| `getVisa` | fonction | `getVisa(): VisaManager \| undefined` |
| `clearVisa` | fonction | `clearVisa(): void`, oublie le gestionnaire installé |

Fonctions du protocole, chacune aussi accessible via `VisaManager` :

| Export | Nature | Description |
|---|---|---|
| `validateAuthorizationRequest` | fonction | `validateAuthorizationRequest(request: UntrustedAuthorizationRequest, store: VisaStore, options?: AuthorizeOptions): Promise<ValidatedRequest>` ; lève `UnredirectableError` ou `OAuthError` |
| `issueAuthorizationCode` | fonction | `issueAuthorizationCode(validated: ValidatedRequest, userId: string, store: VisaStore, options?: AuthorizeOptions, now?: Date): Promise<string>` ; le code vit `codeTtlSeconds` (30 s) |
| `successRedirect` | fonction | `successRedirect(validated: ValidatedRequest, code: string): string` |
| `errorRedirect` | fonction | `errorRedirect(redirectUri: string, error: OAuthError, state?: string): string` |
| `token` | fonction | `token(request: TokenRequest, credentials: ClientCredentials, store: VisaStore, options?: TokenOptions, now?: Date): Promise<TokenResponse>` |
| `introspect` | fonction | `introspect(request, credentials, store, now?, issuer?, options?: IntrospectionOptions): Promise<IntrospectionResponse>` |
| `revoke` | fonction | `revoke(request, credentials, store, now?): Promise<void>` |
| `verifyAccessToken` | fonction | `verifyAccessToken(presented: string, store: Pick<VisaStore, 'findAccessToken'>, now?: Date, resource?: string)` : `{ clientId, userId?, scopes, expiresAt, lastUsedAt?, audience? }` ou `null` |
| `validateRegistration` | fonction | `validateRegistration(request: ClientRegistrationRequest, options: RegistrationOptions, presentedToken?: string)` : `redirectUris`, `grantTypes`, `scopes`, `tokenEndpointAuthMethod` et `name` du client |
| `registrationResponse` | fonction | `registrationResponse(client: Client, issuedAt: Date, secret: string \| undefined): ClientRegistrationResponse` |
| `readCredentials` | fonction | `readCredentials(input: { authorization?: string; body: Record<string, unknown> }): ClientCredentials` ; refuse une requête qui utilise deux méthodes |
| `authenticateClient` | fonction | `authenticateClient(credentials: ClientCredentials, load: (id: string) => Promise<Client \| null>, now?: Date): Promise<Client>` ; tout échec donne `invalid_client` |
| `assertGrantAllowed` | fonction | `assertGrantAllowed(client: Client, grant: GrantType): void` |
| `resolveScopes` | fonction | `resolveScopes(requested: string \| undefined, client: Client): string[]` ; absent donne les scopes du client, un scope non enregistré est refusé |
| `redirectUriMatches` | fonction | `redirectUriMatches(candidate: string, registered: readonly string[]): boolean` ; égalité exacte, port libre en loopback |
| `readResourceParameter` | fonction | `readResourceParameter(value: unknown): string[]` |
| `validateResources` | fonction | `validateResources(requested: readonly string[], accepted?: readonly string[]): string[]` ; refuse avec `invalid_target` |
| `narrowResources` | fonction | `narrowResources(requested: readonly string[], granted: readonly string[]): string[]` |
| `audienceAllows` | fonction | `audienceAllows(audience: readonly string[] \| undefined, resource: string \| undefined): boolean` |
| `protectedResourceMetadata` | fonction | `protectedResourceMetadata(options: ProtectedResourceOptions): ProtectedResourceMetadata` |
| `protectedResourceMetadataUrl` | fonction | `protectedResourceMetadataUrl(resource: string): string`, l'URL well-known d'une ressource |
| `wwwAuthenticate` | fonction | `wwwAuthenticate(options?: ChallengeOptions): string`, la valeur `WWW-Authenticate` d'une 401 |
| `assertResourceIdentifier` | fonction | `assertResourceIdentifier(resource: string): void` ; une URI absolue sans fragment |
| `PROTECTED_RESOURCE_PATH` | const | `'/.well-known/oauth-protected-resource'` |
| `randomToken` | fonction | `randomToken(bytes?: number): string`, 32 octets aléatoires en base64url par défaut |
| `sha256` | fonction | `sha256(value: string): string`, en base64url, la transformation PKCE `S256` |
| `hashSecret` | fonction | `hashSecret(secret: string): string`, ce que le stockage garde d'un jeton ou d'un secret |
| `secretMatches` | fonction | `secretMatches(candidate: string, stored: string): boolean`, en temps constant |

Garde, stockages et erreurs :

| Export | Nature | Description |
|---|---|---|
| `visaGuard` | fonction | `visaGuard(config: VisaGuardConfig): VisaGuard`, une garde warden qui authentifie les jetons d'accès de visa |
| `VisaGuard` | classe | La garde (voir plus bas) |
| `VisaAccessToken` | classe | Le jeton qu'une garde place sur `user.currentAccessToken` |
| `VisaGuardConfig` | interface | Options de `visaGuard()` |
| `GuardUser` | interface | `{ id: string; roles?; permissions?; currentAccessToken?: VisaAccessToken; [key: string]: unknown }` |
| `GuardResult` | interface | `{ authenticated: boolean; user?: GuardUser; error?: string }` |
| `GuardClientResponse` | interface | `{ headers?: Record<string, string>; session?: Record<string, unknown> }` |
| `GuardStore` | type | `Pick<VisaStore, 'findAccessToken' \| 'touchAccessToken' \| 'saveAccessToken' \| 'revokeAccessToken'>` |
| `VisaStore` | interface | Le contrat de stockage (voir plus bas) |
| `MemoryStore` | classe | Identique à `@c9up/visa/stores/memory` |
| `AtlasStore` | classe | Identique à `@c9up/visa/stores/atlas` |
| `AtlasDb`, `AtlasQuery`, `AtlasStoreTables` | interface | Identiques à `@c9up/visa/stores/atlas` |
| `OAuthError` | erreur | Une erreur du protocole : `code` (`invalid_grant`…), `description`, `status` (401 pour `invalid_client` et `invalid_token`, sinon 400), `challenge`, `toResponse()` |
| `UnredirectableError` | erreur | Un échec d'autorisation à montrer à l'utilisateur, jamais à rediriger ; porte `error: OAuthError` |
| `UnauthorizedAccessError` | erreur | `code` `E_UNAUTHORIZED_ACCESS`, `status` 403 : un jeton n'a pas une capacité |
| `VisaError` | erreur | Une erreur de l'application : `code` (`E_VISA_*`), `hint` |
| `ProtocolErrorCode` | type | Union des quatre types de code ci-dessous |
| `AuthorizationErrorCode` | type | `'invalid_request' \| 'unauthorized_client' \| 'access_denied' \| 'unsupported_response_type' \| 'invalid_scope' \| 'invalid_target' \| 'server_error' \| 'temporarily_unavailable'` |
| `TokenErrorCode` | type | `'invalid_request' \| 'invalid_client' \| 'invalid_grant' \| 'unauthorized_client' \| 'unsupported_grant_type' \| 'invalid_scope' \| 'invalid_target'` |
| `RegistrationErrorCode` | type | `'invalid_redirect_uri' \| 'invalid_client_metadata' \| 'invalid_software_statement' \| 'unapproved_software_statement'` |
| `BearerErrorCode` | type | `'invalid_token'` |

Types de requêtes et d'options :

| Export | Nature | Description |
|---|---|---|
| `AuthorizationRequest` | interface | `{ response_type?, client_id?, redirect_uri?, scope?, state?, code_challenge?, code_challenge_method?, nonce?, prompt?, resource?: string \| string[] }` |
| `UntrustedAuthorizationRequest` | type | Les mêmes clés, chacune `unknown`, telles qu'un analyseur de query les fournit |
| `ValidatedRequest` | interface | `{ client, redirectUri, redirectUriProvided, scopes, state, codeChallenge, codeChallengeMethod, nonce, resources }` |
| `AuthorizeOptions` | interface | `{ codeTtlSeconds?, resourcesSupported?, allowPlainChallenge? }` |
| `TokenOptions` | interface | `{ accessTokenTtlSeconds?, refreshTokenTtlSeconds?, issueRefreshTokens?, resourcesSupported? }` |
| `TokenRequest` | type | `Record<string, unknown>`, le corps d'une requête de jeton |
| `ClientCredentials` | interface | `{ clientId?, clientSecret?, method?: ClientAuthMethod, … }` |
| `IntrospectionOptions` | interface | `{ resourceServers?: readonly string[] }` |
| `RegistrationOptions` | interface | `{ enabled?, initialAccessToken?, scopes?, grantTypes?, secretTtlSeconds? }` |
| `ClientRegistrationRequest` | interface | Le corps d'un enregistrement : `redirect_uris`, `token_endpoint_auth_method`, `grant_types`, `client_name`, `scope`, … |
| `ClientRegistrationResponse` | interface | Le corps de la 201 : `client_id`, `client_secret?`, `client_id_issued_at`, `client_secret_expires_at?`, … |
| `ProtectedResourceOptions` | interface | `{ resource, authorizationServers?, scopesSupported?, bearerMethodsSupported?, resourceName?, resourceDocumentation? }` |
| `ProtectedResourceMetadata` | interface | Le document de métadonnées : `resource`, `authorization_servers?`, `scopes_supported?`, … |
| `ChallengeOptions` | interface | `{ resourceMetadata?, resource?, error?, errorDescription?, scope? }` |
| `Client`, `AuthorizationCode`, `AccessToken`, `RefreshToken`, `Consent`, `AuthorizedApplication`, `TokenResponse`, `IntrospectionResponse`, `ClientAuthMethod`, `GrantType` | type | Identiques à `@c9up/visa/types` |

### `VisaManager`

`new VisaManager(config: VisaConfig)`. Le constructeur vérifie l'émetteur et les réglages d'enregistrement.

| Membre | Signature | Description |
|---|---|---|
| `issuer` | `readonly issuer: string` | L'émetteur, sans barres obliques finales |
| `store` | `readonly store: VisaStore` | Le stockage configuré |
| `registerClient` | `registerClient(input: { id: string; name: string; redirectUris: string[]; grantTypes?: GrantType[]; scopes?: string[]; tokenEndpointAuthMethod?: ClientAuthMethod; trusted?: boolean; secretExpiresAt?: Date }): Promise<{ client: Client; secret?: string }>` | Enregistre un client ; le secret est rendu une seule fois et seul son hash est stocké. `none` crée un client public sans secret |
| `register` | `register(request: ClientRegistrationRequest, presentedToken?: string, now?: Date): Promise<ClientRegistrationResponse>` | Un client qui s'enregistre lui-même ; refusé sauf si `registration.enabled` |
| `authorize` | `authorize(request: UntrustedAuthorizationRequest, userId: string \| undefined): Promise<AuthorizationOutcome>` | Vérifie une requête d'autorisation et décide : rediriger, demander le consentement ou montrer une erreur |
| `grant` | `grant(validated: ValidatedRequest, userId: string, now?: Date): Promise<string>` | L'utilisateur accepte : enregistre le consentement, émet le code, renvoie l'URL de redirection |
| `deny` | `deny(validated: ValidatedRequest): string` | L'URL de redirection portant `access_denied` |
| `consentTicket` | `consentTicket(validated: ValidatedRequest, userId: string, now?: Date): ConsentTicket` | Un ticket pour la page de consentement, valide `consentTicketTtlSeconds` |
| `redeemConsentTicket` | `redeemConsentTicket(ticket: unknown, presentedId: unknown, userId: string, now?: Date): Promise<ValidatedRequest \| null>` | La requête pour laquelle le ticket a été montré, validée à nouveau ; `null` pour tout problème |
| `token` | `token(body: Record<string, unknown>, credentials: ClientCredentials, now?: Date): Promise<TokenResponse>` | L'endpoint de jeton |
| `introspect` | `introspect(body: Record<string, unknown>, credentials: ClientCredentials, now?: Date): Promise<IntrospectionResponse>` | L'endpoint d'introspection ; un jeton inactif ne donne que `{ active: false }` |
| `revoke` | `revoke(body: Record<string, unknown>, credentials: ClientCredentials, now?: Date): Promise<void>` | L'endpoint de révocation |
| `verify` | `verify(presented: string, now?: Date, resource?: string)` | Ce qu'un serveur de ressources appelle à chaque requête ; même résultat que `verifyAccessToken` |
| `listAuthorizations` | `listAuthorizations(userId: string, now?: Date): Promise<AuthorizedApplication[]>` | Toutes les applications autorisées par l'utilisateur, expirées comprises |
| `revokeAuthorization` | `revokeAuthorization(userId: string, clientId: string, now?: Date): Promise<void>` | Révoque les jetons de l'application pour l'utilisateur, puis oublie le consentement |
| `readCredentials` | `readCredentials(input: { authorization?: string; body: Record<string, unknown> }): ClientCredentials` | Identifiants client tirés de l'en-tête `Authorization` ou du corps |

### `VisaGuard`

`visaGuard(config)` la construit. Elle authentifie un jeton d'accès bearer, jamais un mot de passe.

| Membre | Signature | Description |
|---|---|---|
| `name` | `readonly name: string` | Nom de la garde, `'visa'` par défaut |
| `verify` | `verify(presented: string): Promise<GuardResult>` | Authentifie un jeton d'accès ; l'utilisateur vient de `findUser`, ou de `findClientSubject` pour un jeton d'identifiants client |
| `authenticate` | `authenticate(): Promise<GuardResult>` | Lève une erreur : cette garde ne prend pas d'identifiants |
| `createToken` | `createToken(user: { id: string } \| string, abilities?: string[], options?: { name?: string; expiresInSeconds?: number }): Promise<VisaAccessToken>` | Émet un jeton pour `user` au nom de `tokenClientId` ; `abilities` vaut `['*']` par défaut |
| `invalidateToken` | `invalidateToken(presented: string): Promise<boolean>` | Révoque un jeton ; `true` s'il existait |
| `authenticateAsClient` | `authenticateAsClient(user, abilities?, options?): Promise<GuardClientResponse>` | L'en-tête `Authorization` qu'un client de test envoie pour être `user` |
| `challenge` | `challenge(options?: { error?: string; scope?: readonly string[] }): string` | La valeur `WWW-Authenticate` d'une 401 de cette garde |

`VisaAccessToken` porte `clientId`, `userId?`, `abilities`, `name`, `expiresAt`, `lastUsedAt` et `value?` (le jeton en clair, seulement juste après `createToken`), avec `allows(ability)`, `denies(ability)`, `authorize(ability)` (lève `UnauthorizedAccessError`), `isExpired()` et `toJSON()`. `*` autorise toutes les capacités.

`VisaGuardConfig` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `store` | `GuardStore \| (() => GuardStore)` | — | Où vivent les jetons ; une fonction est lue au besoin |
| `findUser` | `(userId: string) => Promise<GuardUser \| null>` | — | Appelée à chaque requête ; `null` la refuse |
| `findClientSubject` | `(clientId: string) => Promise<GuardUser \| null>` | — | Ce qu'authentifie un jeton d'identifiants client ; sans elle, un tel jeton est refusé |
| `name` | `string` | `'visa'` | Nom de la garde |
| `tokenClientId` | `string` | — | Le client propriétaire auquel appartient un jeton issu de `createToken` |
| `expiresInSeconds` | `number` | — | Durée de vie d'un jeton issu de `createToken` |
| `resource` | `string` | — | La ressource protégée que sert cette garde ; `challenge()` nomme alors ses métadonnées |

### `VisaStore`

Chaque méthode qui reçoit un identifiant secret en reçoit le hash (`hashSecret`).

| Membre | Signature |
|---|---|
| `findClient` | `findClient(id: string): Promise<Client \| null>` |
| `saveClient` (optionnel) | `saveClient?(client: Client): Promise<void>` |
| `saveAuthorizationCode` | `saveAuthorizationCode(code: AuthorizationCode): Promise<void>` |
| `findAuthorizationCode` | `findAuthorizationCode(codeHash: string): Promise<AuthorizationCode \| null>` |
| `consumeAuthorizationCode` | `consumeAuthorizationCode(codeHash: string, at: Date): Promise<boolean>` ; atomique, `false` si déjà consommé |
| `saveAccessToken` | `saveAccessToken(token: AccessToken): Promise<void>` |
| `findAccessToken` | `findAccessToken(tokenHash: string): Promise<AccessToken \| null>` |
| `revokeAccessToken` | `revokeAccessToken(tokenHash: string, at: Date): Promise<void>` |
| `saveRefreshToken` | `saveRefreshToken(token: RefreshToken): Promise<void>` |
| `findRefreshToken` | `findRefreshToken(tokenHash: string): Promise<RefreshToken \| null>` |
| `consumeRefreshToken` | `consumeRefreshToken(tokenHash: string, at: Date): Promise<boolean>` ; atomique |
| `revokeFamily` | `revokeFamily(familyId: string, at: Date): Promise<void>` ; tous les jetons d'une famille, quand un jeton de rafraîchissement consommé revient |
| `findConsent` | `findConsent(userId: string, clientId: string): Promise<Consent \| null>` |
| `saveConsent` | `saveConsent(consent: Consent): Promise<void>` |
| `listConsents` | `listConsents(userId: string): Promise<Consent[]>` |
| `listAccessTokens` | `listAccessTokens(userId: string): Promise<AccessToken[]>` ; expirés compris |
| `revokeAccessFor` | `revokeAccessFor(userId: string, clientId: string, at: Date): Promise<void>` |
| `deleteConsent` | `deleteConsent(userId: string, clientId: string): Promise<void>` |
| `touchAccessToken` (optionnel) | `touchAccessToken?(tokenHash: string, at: Date): Promise<void>` ; enregistre la dernière utilisation |
| `prune` (optionnel) | `prune?(now: Date): Promise<void>` ; supprime ce qui a expiré |

### `@c9up/visa/config`

| Export | Nature | Description |
|---|---|---|
| `defineConfig` | fonction | `defineConfig(config: VisaConfigInput): VisaConfigInput` |
| `VisaConfigInput` | interface | Options de `config/visa.ts` (voir Configuration) |

### `@c9up/visa/provider`

| Export | Nature | Description |
|---|---|---|
| `default` | provider | `VisaProvider` : lie le `VisaManager` construit depuis la configuration `visa`, remplit `@c9up/visa/services/main`, monte les endpoints machine quand un routeur est lié |
| `VisaAppContext` | interface | `{ container, config }`, ce dont le provider a besoin de l'application |

Routes montées par le provider (`prefix` vaut `/oauth` par défaut) :

| Méthode et chemin | Monté quand | Répond |
|---|---|---|
| `POST {prefix}/token` | toujours | `TokenResponse`, `cache-control: no-store` |
| `POST {prefix}/introspect` | toujours | `IntrospectionResponse` |
| `POST {prefix}/revoke` | toujours | 200 avec un corps vide |
| `POST {prefix}/register` | `registration.enabled` | 201 avec `ClientRegistrationResponse` |
| `GET /.well-known/oauth-authorization-server{chemin de l'émetteur}` | toujours | Les métadonnées du serveur d'autorisation |
| `GET /.well-known/oauth-protected-resource[/{chemin de la ressource}]` | `protectedResource` est défini | `ProtectedResourceMetadata` |

Ces endpoints lisent leurs paramètres dans le corps uniquement ; un paramètre OAuth dans la query string est refusé avec `invalid_request`. Une `OAuthError` devient son `status` et le corps `toResponse()`, avec `WWW-Authenticate` sur une 401. `{prefix}/authorize` n'est pas monté : construisez-le avec `visa.authorize()`, `consentTicket()`, `redeemConsentTicket()`, `grant()` et `deny()`.

### `@c9up/visa/services/main`

| Export | Nature | Description |
|---|---|---|
| `default` | const | `visa: VisaManager`, le gestionnaire de l'application une fois `VisaProvider` démarré ; lire un membre avant lève une erreur |
| `setVisa`, `getVisa`, `clearVisa` | fonction | Installent, lisent et oublient le gestionnaire qu'il sert |

### `@c9up/visa/configure`

| Export | Nature | Description |
|---|---|---|
| `configure` | fonction | `configure(codemods): Promise<void>` : ajoute `VISA_ISSUER`, enregistre `@c9up/visa/provider`, écrit `config/visa.ts` et les migrations `9000_create_visa_tables`, `9001_add_visa_client_secret_expiry` et `9002_add_visa_code_redirect_uri_omitted` |

### `@c9up/visa/stores/memory`

| Export | Nature | Description |
|---|---|---|
| `MemoryStore` | classe | `new MemoryStore(clients?: readonly Client[])`, un `VisaStore` en mémoire du processus, pour les tests et un serveur de développement à processus unique |

### `@c9up/visa/stores/atlas`

| Export | Nature | Description |
|---|---|---|
| `AtlasStore` | classe | `new AtlasStore(db: AtlasDb, tables?: AtlasStoreTables)`, un `VisaStore` sur une base de données |
| `AtlasDb` | interface | `{ from(table): AtlasQuery; table(table): AtlasQuery }`, ce que fournit le `db` de `@c9up/atlas` |
| `AtlasQuery` | interface | Les méthodes du query builder qu'appelle le stockage |
| `AtlasStoreTables` | interface | Noms des tables : `clients` (`visa_clients`), `authorizationCodes` (`visa_authorization_codes`), `accessTokens` (`visa_access_tokens`), `refreshTokens` (`visa_refresh_tokens`), `consents` (`visa_consents`) |

### `@c9up/visa/types`

| Export | Nature | Description |
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

| Export | Nature | Description |
|---|---|---|
| `testVisa` | fonction | `testVisa(options?: TestVisaOptions): Promise<TestVisa>`, un vrai `VisaManager` sur un `MemoryStore` avec un client enregistré |
| `TestVisa` | interface | `{ visa, store, client, secret, credentials, pkce(): { verifier; challenge }, tokensFor(userId, scope?): Promise<TokenResponse> }` |
| `TestVisaOptions` | interface | `{ issuer?, clientId?, redirectUri?, scopes?, grantTypes?, publicClient?, config? }` ; par défaut `https://auth.test`, `test-client`, `https://app.test/callback`, `['profile', 'email']` |

`tokensFor(userId)` passe par l'autorisation, le consentement et l'échange du code.

## Configuration

`config/visa.ts`, lu sous la clé `visa`. Le provider refuse de construire le gestionnaire sans lui.

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

| Option | Type | Défaut | Description |
|---|---|---|---|
| `issuer` | `string` | — | URL publique de ce serveur, l'`iss` de chaque jeton ; https sauf pour l'hôte `localhost`, sans query ni fragment |
| `store` | `VisaStore` | — | Où vivent clients, codes, jetons et consentements |
| `accessTokenTtlSeconds` | `number` | `3600` | Durée de vie d'un jeton d'accès |
| `refreshTokenTtlSeconds` | `number` | 30 jours | Durée de vie d'un jeton de rafraîchissement |
| `codeTtlSeconds` | `number` | `30` | Durée de vie d'un code d'autorisation |
| `issueRefreshTokens` | `boolean` | `true` | Délivre des jetons de rafraîchissement |
| `allowPlainChallenge` | `boolean` | `false` | Accepte la méthode PKCE `plain` ; sinon `S256` seulement |
| `prefix` | `string` | `'/oauth'` | Où sont montés les endpoints |
| `resourcesSupported` | `string[]` | — | Ressources pour lesquelles des jetons peuvent être délivrés ; définie, toute autre est refusée avec `invalid_target` |
| `registration` | `RegistrationOptions` | — | Enregistrement des clients par eux-mêmes (voir plus bas) |
| `introspection.resourceServers` | `string[]` | — | Clients confidentiels autorisés à introspecter tout jeton d'accès ; sinon seul le client du jeton |
| `protectedResource` | `{ resource: string; scopesSupported?: string[]; resourceName?: string; resourceDocumentation?: string }` | — | La ressource protégée ; définie, son document de métadonnées est servi |
| `consentTicketTtlSeconds` | `number` | `600` | Durée de validité d'un ticket de consentement (une option de `VisaConfig`) |

`registration` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `enabled` | `boolean` | `false` | Monte `{prefix}/register` |
| `initialAccessToken` | `string` | — | Jeton bearer qu'un enregistrement doit porter ; absent, l'enregistrement est ouvert |
| `scopes` | `string[]` | `[]` | Scopes qu'un client auto-enregistré peut demander |
| `grantTypes` | `GrantType[]` | `['authorization_code', 'refresh_token']` | Grants qu'il peut utiliser |
| `secretTtlSeconds` | `number` | — | Secondes avant l'expiration d'un secret délivré ; absent, il n'expire pas |

## Liaisons du conteneur

| Token | Résout vers |
|---|---|
| `VisaManager` (classe) | Le gestionnaire construit depuis la configuration `visa` |
| `'visa'` | Le même `VisaManager` |

`'visa'` est déclaré dans `ContainerBindings`.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_VISA_MISSING_ISSUER`](/fr/reference/errors#e-visa-missing-issuer) | Aucun `issuer` n'est configuré |
| [`E_VISA_INVALID_ISSUER`](/fr/reference/errors#e-visa-invalid-issuer) | L'`issuer` n'est pas une URL, ou porte une query ou un fragment |
| [`E_VISA_INSECURE_ISSUER`](/fr/reference/errors#e-visa-insecure-issuer) | L'`issuer` n'est pas en https et n'est pas `localhost` |
| [`E_VISA_NO_REDIRECT_URI`](/fr/reference/errors#e-visa-no-redirect-uri) | `registerClient()` n'a reçu aucune URI de redirection |
| [`E_VISA_INVALID_REDIRECT_URI`](/fr/reference/errors#e-visa-invalid-redirect-uri) | Une URI de redirection passée à `registerClient()` n'est pas une URL complète |
| [`E_VISA_INVALID_INITIAL_ACCESS_TOKEN`](/fr/reference/errors#e-visa-invalid-initial-access-token) | `registration.initialAccessToken` est la chaîne vide |
| [`E_VISA_INVALID_SECRET_TTL`](/fr/reference/errors#e-visa-invalid-secret-ttl) | `registration.secretTtlSeconds` n'est pas un nombre entier positif |
| [`E_VISA_STORE_READ_ONLY`](/fr/reference/errors#e-visa-store-read-only) | Le stockage n'a pas de `saveClient`, et `registerClient()` a été appelé ou l'enregistrement est activé |
| [`E_UNAUTHORIZED_ACCESS`](/fr/reference/errors#e-unauthorized-access) | `currentAccessToken.authorize(ability)` sur un jeton sans cette capacité (403) |

Ce sont des `VisaError`, levées vers l'application. Une erreur du client est une `OAuthError` dont le `code` est la chaîne du protocole (`invalid_grant`, `invalid_client`…), renvoyée comme réponse de l'endpoint.

## Migration

Une application sur `AtlasStore` dont les tables viennent d'une version antérieure relance `ream configure @c9up/visa` avant la mise à jour, puis ses migrations. Le `9000_create_visa_tables` existant reste intact ; la commande ajoute `9001_add_visa_client_secret_expiry` (la colonne `secret_expires_at` de `visa_clients`, absente jusqu'à 0.1.3) et `9002_add_visa_code_redirect_uri_omitted` (la colonne `redirect_uri_omitted` de `visa_authorization_codes`).

## Voir aussi

- [Introduction](/fr/guides/oauth-server/introduction)
- [Émetteur et stockage](/fr/guides/oauth-server/issuer-and-store)
- [Endpoint d'autorisation et clients](/fr/guides/oauth-server/authorize)
- [Protéger des ressources](/fr/guides/oauth-server/resources)
- [Tests](/fr/guides/oauth-server/testing)
