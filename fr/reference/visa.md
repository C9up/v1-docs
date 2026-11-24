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
| `AuthorizationOutcome` | type | `{ type: 'redirect'; url } \| { type: 'consent'; request: ValidatedRequest } \| { type: 'error'; error: errors.E_VISA_OAUTH_ERROR }` |
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
| `validateAuthorizationRequest` | fonction | `validateAuthorizationRequest(request: UntrustedAuthorizationRequest, store: VisaStore, options?: AuthorizeOptions): Promise<ValidatedRequest>` ; lève `errors.E_VISA_UNREDIRECTABLE` ou `errors.E_VISA_OAUTH_ERROR` |
| `issueAuthorizationCode` | fonction | `issueAuthorizationCode(validated: ValidatedRequest, userId: string, store: VisaStore, options?: AuthorizeOptions, now?: Date): Promise<string>` ; le code vit `codeTtlSeconds` (30 s) |
| `successRedirect` | fonction | `successRedirect(validated: ValidatedRequest, code: string, issuer: string): string` ; ajoute `code`, `state` et `iss` (RFC 9207) |
| `errorRedirect` | fonction | `errorRedirect(redirectUri: string, error: errors.E_VISA_OAUTH_ERROR, options: { issuer: string; state?: string }): string` ; ajoute `error`, `error_description`, `state` et `iss` (RFC 9207) |
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
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs) |
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
| `authorize` | `authorize(request: UntrustedAuthorizationRequest, userId: string \| undefined): Promise<AuthorizationOutcome>` | Vérifie une requête d'autorisation et décide : rediriger, demander le consentement ou montrer une erreur. Un consentement mémorisé, ou `trusted`, évite l'écran de consentement, sauf pour un client public dont l'URI de redirection est en loopback, sur `localhost` ou sur un schéma privé : ce client voit l'écran à chaque fois (RFC 8252 §8.6) |
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
| `createToken` | `createToken(user: { id: string } \| string, abilities?: string[], options?: { name?: string; expiresInSeconds?: number }): Promise<VisaAccessToken>` | Émet un jeton pour `user` au nom de `tokenClientId` ; `abilities` vaut `['*']` par défaut ; un `expiresInSeconds` qui n'est pas un nombre entier positif lève `E_VISA_INVALID_TTL` |
| `invalidateToken` | `invalidateToken(presented: string): Promise<boolean>` | Révoque un jeton ; `true` s'il existait |
| `authenticateAsClient` | `authenticateAsClient(user, abilities?, options?): Promise<GuardClientResponse>` | L'en-tête `Authorization` qu'un client de test envoie pour être `user` |
| `challenge` | `challenge(options?: { error?: string; scope?: readonly string[] }): string` | La valeur `WWW-Authenticate` d'une 401 de cette garde |

`VisaAccessToken` porte `clientId`, `userId?`, `abilities`, `name`, `expiresAt`, `lastUsedAt` et `value?` (le jeton en clair, seulement juste après `createToken`), avec `allows(ability)`, `denies(ability)`, `authorize(ability)` (lève `E_UNAUTHORIZED_ACCESS`), `isExpired()` et `toJSON()`. `*` autorise toutes les capacités.

`VisaGuardConfig` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `store` | `GuardStore \| (() => GuardStore)` | — | Où vivent les jetons ; une fonction est lue au besoin |
| `findUser` | `(userId: string) => Promise<GuardUser \| null>` | — | Appelée à chaque requête ; `null` la refuse |
| `findClientSubject` | `(clientId: string) => Promise<GuardUser \| null>` | — | Ce qu'authentifie un jeton d'identifiants client ; sans elle, un tel jeton est refusé |
| `name` | `string` | `'visa'` | Nom de la garde |
| `tokenClientId` | `string` | — | Le client propriétaire auquel appartient un jeton issu de `createToken` |
| `expiresInSeconds` | `number` | `3600` | Durée de vie d'un jeton issu de `createToken` ; un nombre entier positif, sinon `visaGuard()` lève `E_VISA_INVALID_TTL` |
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
| `consumeRefreshToken` | `consumeRefreshToken(tokenHash: string, at: Date): Promise<boolean>` ; atomique, `false` si le jeton est déjà consommé ou révoqué |
| `revokeFamily` | `revokeFamily(familyId: string, at: Date): Promise<void>` ; tous les jetons d'une famille qui existent au moment de l'appel, quand un code ou un jeton de rafraîchissement déjà utilisé revient, ou perd la course pour être utilisé |
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
| `GET /.well-known/oauth-authorization-server{chemin de l'émetteur}` | toujours | Les métadonnées du serveur d'autorisation, avec `authorization_response_iss_parameter_supported: true` |
| `GET /.well-known/oauth-protected-resource[/{chemin de la ressource}]` | `protectedResource` est défini | `ProtectedResourceMetadata` |

Ces endpoints lisent leurs paramètres dans le corps uniquement ; un paramètre OAuth dans la query string est refusé avec `invalid_request`. Une `E_VISA_OAUTH_ERROR` devient son `status` et le corps `toResponse()`, avec `WWW-Authenticate` sur une 401. `{prefix}/authorize` n'est pas monté : construisez-le avec `visa.authorize()`, `consentTicket()`, `redeemConsentTicket()`, `grant()` et `deny()`.

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
| `consentTicketTtlSeconds` | `number` | `600` | Combien de temps une page de consentement peut rester ouverte avant que sa réponse soit refusée |
| `issueRefreshTokens` | `boolean` | `true` | Délivre des jetons de rafraîchissement |
| `allowPlainChallenge` | `boolean` | `false` | Accepte la méthode PKCE `plain` ; sinon `S256` seulement |
| `prefix` | `string` | `'/oauth'` | Où sont montés les endpoints |
| `resourcesSupported` | `string[]` | — | Ressources pour lesquelles des jetons peuvent être délivrés ; définie, toute autre est refusée avec `invalid_target` |
| `registration` | `RegistrationOptions` | — | Enregistrement des clients par eux-mêmes (voir plus bas) |
| `introspection.resourceServers` | `string[]` | — | Clients confidentiels autorisés à introspecter tout jeton d'accès ; sinon seul le client du jeton |
| `protectedResource` | `{ resource: string; scopesSupported?: string[]; resourceName?: string; resourceDocumentation?: string }` | — | La ressource protégée ; définie, son document de métadonnées est servi |

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
| [`E_VISA_INVALID_TTL`](/fr/reference/errors#e-visa-invalid-ttl) | `accessTokenTtlSeconds`, `refreshTokenTtlSeconds`, `codeTtlSeconds` ou `consentTicketTtlSeconds` n'est pas un nombre entier positif ; vérifié à la construction du `VisaManager`, et par `token()` et `issueAuthorizationCode()` appelées directement. Aussi l'`expiresInSeconds` de la garde, vérifié par `visaGuard()` et à chaque `createToken()` |
| [`E_VISA_INVALID_SECRET_TTL`](/fr/reference/errors#e-visa-invalid-secret-ttl) | `registration.secretTtlSeconds` n'est pas un nombre entier positif |
| [`E_VISA_STORE_READ_ONLY`](/fr/reference/errors#e-visa-store-read-only) | Le stockage n'a pas de `saveClient`, et `registerClient()` a été appelé ou l'enregistrement est activé |
| [`E_VISA_MISSING_CONFIG`](/fr/reference/errors#e-visa-missing-config) | `VisaProvider` n'a trouvé aucun `config/visa.ts` |
| [`E_VISA_NOT_BOOTED`](/fr/reference/errors#e-visa-not-booted) | `@c9up/visa/services/main` a été lu avant le boot du provider, ou avant `setVisa()` |
| [`E_VISA_CREDENTIALS_UNSUPPORTED`](/fr/reference/errors#e-visa-credentials-unsupported) | `authenticate()` avec des identifiants sur la garde visa ; envoyez le jeton bearer à `verify()` |
| [`E_VISA_NO_TOKEN_CLIENT`](/fr/reference/errors#e-visa-no-token-client) | `createToken()` sur une garde construite sans `tokenClientId` |
| [`E_VISA_INVALID_RESOURCE`](/fr/reference/errors#e-visa-invalid-resource) | Un identifiant de ressource n'est pas une URI absolue, ou porte un fragment |
| [`E_VISA_INVALID_CHALLENGE_PARAMETER`](/fr/reference/errors#e-visa-invalid-challenge-parameter) | Un paramètre de `wwwAuthenticate()` contient un guillemet, une barre oblique inverse ou un caractère de contrôle |
| [`E_VISA_CORRUPT_ROW`](/fr/reference/errors#e-visa-corrupt-row) | Le stockage Atlas a lu une colonne qu'il ne sait pas décoder (une liste, une date, une chaîne, une méthode d'authentification) |
| [`E_VISA_TEST_AUTHORIZE_FAILED`](/fr/reference/errors#e-visa-test-authorize-failed) | La requête d'autorisation de l'aide de test a été refusée ; le message porte l'erreur OAuth |
| [`E_VISA_INTERNAL`](/fr/reference/errors#e-visa-internal) | Un invariant interne a été rompu (un bug de visa) |
| [`E_UNAUTHORIZED_ACCESS`](/fr/reference/errors#e-unauthorized-access) | `currentAccessToken.authorize(ability)` sur un jeton sans cette capacité (403) |
| [`E_VISA_OAUTH_ERROR`](/fr/reference/errors#e-visa-oauth-error) | Une erreur du client, renvoyée sur le fil : `oauthCode` est la chaîne du protocole (`invalid_grant`, `invalid_client`…), avec `description`, `challenge` et `toResponse()` ; `status` 401 pour `invalid_client` et `invalid_token`, sinon 400 |
| [`E_VISA_UNREDIRECTABLE`](/fr/reference/errors#e-visa-unredirectable) | Un échec d'autorisation à montrer à l'utilisateur, jamais à rediriger (client ou URI de redirection inconnus) ; `error` est l'`E_VISA_OAUTH_ERROR` à montrer (400) |

Chacune est une classe du namespace `errors` et une `Exception` de `@c9up/flare`, de statut 500 sauf mention : testez `error.code` ou `error instanceof errors.E_VISA_*`. Le conseil d'une erreur de configuration est dans `help`.

## Migration

- Un client public (`tokenEndpointAuthMethod: 'none'`) dont l'URI de redirection est une adresse de loopback, `localhost` ou un schéma privé (`com.example.app:/callback`) voit désormais l'écran de consentement à chaque autorisation. Un consentement mémorisé et `trusted: true` ne l'évitent plus : n'importe quel autre programme de la machine peut présenter l'identifiant de ce client, donc rien ne prouve que la requête vient de votre application. Gardez votre page de consentement accessible pour ces clients. Un client confidentiel, ou un client public sur une URI de redirection `https`, garde le chemin sans écran.
- `successRedirect(validated, code)` devient `successRedirect(validated, code, issuer)`, et `errorRedirect(uri, error, state)` devient `errorRedirect(uri, error, { issuer, state })`. Passez `visa.issuer`. Chaque réponse d'autorisation, succès ou erreur, porte désormais `iss` (RFC 9207), et les métadonnées annoncent `authorization_response_iss_parameter_supported: true`. Un client qui lit les métadonnées refuse alors une réponse sans `iss`.
- L'`expiresInSeconds` de la garde doit être un nombre entier positif de secondes. Toute autre valeur fait désormais lever `E_VISA_INVALID_TTL` à `visaGuard()`, et `createToken()` est rejeté avec ce code. Jusqu'ici, `NaN` ou `Infinity` donnaient des jetons qui n'expiraient jamais.
- Un code ou un jeton de rafraîchissement présenté deux fois en même temps termine désormais toute sa famille, y compris les nouveaux jetons du gagnant. Jusqu'ici, seule une présentation arrivée après la première le faisait. Un client ne doit pas envoyer le même jeton de rafraîchissement en parallèle : envoyez un seul rafraîchissement, et faites attendre son résultat aux autres requêtes.
- Un store que vous avez écrit vous-même : `consumeRefreshToken` doit aussi répondre `false` pour un jeton révoqué, dans la même écriture atomique (`… WHERE consumed_at IS NULL AND revoked_at IS NULL`). L'endpoint de jeton enregistre désormais la nouvelle paire avant d'appeler `consumeRefreshToken` ou `consumeAuthorizationCode`, et appelle `revokeFamily` quand la consommation répond `false`.
- `accessTokenTtlSeconds`, `refreshTokenTtlSeconds`, `codeTtlSeconds` et `consentTicketTtlSeconds` doivent être des nombres entiers positifs de secondes. Toute autre valeur arrête désormais le démarrage avec `E_VISA_INVALID_TTL`. Jusqu'ici, `NaN` ou `Infinity` donnaient des codes et des jetons qui n'expiraient jamais, et `0` ou une fraction étaient pris tels quels.
- `VisaError` disparaît : testez `error.code`, ou `error instanceof errors.E_VISA_*` avec `import { errors } from '@c9up/visa'`. Son `hint` devient `help`.
- `OAuthError` devient `errors.E_VISA_OAUTH_ERROR` : son `code` vaut désormais `'E_VISA_OAUTH_ERROR'`, et la chaîne du protocole passe dans `oauthCode` (`error.code === 'invalid_grant'` devient `error.oauthCode === 'invalid_grant'`). Le constructeur, `description`, `status`, `challenge` et `toResponse()` ne changent pas.
- `UnredirectableError` devient `errors.E_VISA_UNREDIRECTABLE`, qui porte toujours `error`.
- `UnauthorizedAccessError` devient `errors.E_UNAUTHORIZED_ACCESS` ; son `code` et son statut 403 ne changent pas.


Une application sur `AtlasStore` dont les tables viennent d'une version antérieure relance `ream configure @c9up/visa` avant la mise à jour, puis ses migrations. Le `9000_create_visa_tables` existant reste intact ; la commande ajoute `9001_add_visa_client_secret_expiry` (la colonne `secret_expires_at` de `visa_clients`, absente jusqu'à 0.1.3) et `9002_add_visa_code_redirect_uri_omitted` (la colonne `redirect_uri_omitted` de `visa_authorization_codes`).

## Voir aussi

- [Introduction](/fr/guides/oauth-server/introduction)
- [Émetteur et stockage](/fr/guides/oauth-server/issuer-and-store)
- [Endpoint d'autorisation et clients](/fr/guides/oauth-server/authorize)
- [Protéger des ressources](/fr/guides/oauth-server/resources)
- [Tests](/fr/guides/oauth-server/testing)
