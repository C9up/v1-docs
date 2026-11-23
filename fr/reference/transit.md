# transit

`@c9up/transit` : connexion fédérée via une autorité que l'application ne possède pas : fournisseurs sociaux OAuth2 et OAuth1, tout émetteur OpenID Connect, fournisseurs d'identité SAML 2.0 et LDAP ou Active Directory. Guide : [Authentification sociale](/fr/guides/auth/social/).

## Installation

```bash
pnpm add @c9up/transit
```

`ream configure @c9up/transit` enregistre le provider, écrit `config/transit.ts` avec une entrée Google et ajoute `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` aux fichiers d'environnement. Un stockage anti-rejeu SAML partagé via Redis demande `@c9up/quasar`.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/transit` | `TransitManager`, les drivers, `defineConfig` et les fabriques de fournisseurs, les utilitaires SAML, XML, LDAP et Apple, les types |
| `@c9up/transit/config` | `defineConfig`, `socials`, `oidc`, `saml`, `ldap` et les types de configuration |
| `@c9up/transit/provider` | `TransitProvider` (export par défaut) |
| `@c9up/transit/services/main` | Le `TransitManager` de l'application (export par défaut) |
| `@c9up/transit/configure` | `configure()`, exécuté par `ream configure @c9up/transit` |
| `@c9up/transit/testing` | `FakeTransit`, un `TransitManager` qui répond aux connexions avec des utilisateurs déclarés |

## Exports

### `@c9up/transit`

Gestionnaire et configuration :

| Export | Nature | Description |
|---|---|---|
| `TransitManager` | classe | Les fournisseurs configurés, par nom |
| `TransitProvider` | provider | Même classe que `@c9up/transit/provider` |
| `TransitAppContext` | interface | `{ container, config }`, ce dont le provider a besoin de l'application |
| `defineConfig` | fonction | `defineConfig<T extends TransitConfig>(config: T): T` |
| `socials` | const | Fabriques pour `apple`, `discord`, `facebook`, `github`, `google`, `linkedin`, `linkedinOpenidConnect`, `spotify`, `twitter` (OAuth1) et `twitterX` (OAuth2) |
| `oidc` | fonction | `oidc(config: OidcConfig): TransitDriverFactory`, tout fournisseur OpenID Connect à partir de son émetteur |
| `saml` | fonction | `saml(config: SamlConfig): TransitDriverFactory`, un fournisseur d'identité SAML 2.0 |
| `ldap` | fonction | `ldap(config: LdapConfig): TransitDriverFactory`, un annuaire LDAP ou Active Directory |
| `TransitConfig` | type | `Record<string, TransitProviderEntry>` |
| `TransitProviderEntry` | type | `TransitEntry \| TransitDriverFactory` |
| `TransitDriverFactory` | type | `() => TransitEntry`, appelée à la construction du gestionnaire |

Drivers :

| Export | Nature | Description |
|---|---|---|
| `Oauth2Driver` | classe | Base abstraite des drivers OAuth2 ; étendez-la pour un fournisseur personnalisé |
| `Oauth1Driver` | classe | Base abstraite des drivers OAuth1 |
| `OidcDriver` | classe | `new OidcDriver(config: OidcConfig)` : endpoints et clés viennent du document de découverte de l'émetteur ; PKCE et nonce à chaque redirection |
| `SamlDriver` | classe | `new SamlDriver(config: SamlConfig)` : redirection à l'aller, réponse signée postée au retour |
| `LdapDirectory` | classe | `new LdapDirectory(config: LdapConfig)`, un `DirectoryDriver` |
| `AppleDriver` | classe | `new AppleDriver(config: AppleConfig)`, Sign in with Apple sur OpenID Connect |
| `GoogleDriver`, `GitHubDriver`, `DiscordDriver`, `FacebookDriver`, `SpotifyDriver`, `LinkedInDriver`, `LinkedInOpenidConnectDriver`, `TwitterXDriver` | classe | `new …(config: OAuthConfig)`, fournisseurs OAuth2 |
| `TwitterDriver` | classe | `new TwitterDriver(config: OAuthConfig)`, X sur OAuth1 ; passe par `begin()` |
| `createCodeVerifier` | fonction | `createCodeVerifier(): string`, un vérificateur PKCE (32 octets aléatoires, base64url) |
| `AuthorizeRequest` | classe | Ce que modifie un callback de personnalisation de `begin()` / `redirect()` |
| `AuthorizeCustomizer` | type | `(request: AuthorizeRequest) => void` |
| `assertOAuthState` | fonction | `assertOAuthState(state: string \| undefined, expectedState: string \| undefined): void` ; lève une erreur sauf si les deux sont présents et égaux (temps constant) |
| `isDirectory` | fonction | `isDirectory(entry: TransitEntry): entry is DirectoryDriver` |

Types :

| Export | Nature | Description |
|---|---|---|
| `TransitDriver` | interface | Un fournisseur à redirection : `redirectUrl`, `begin?`, `callback`, `userFromToken?` |
| `DirectoryDriver` | interface | `{ authenticate(username: string, password: string): Promise<TransitUser> }` |
| `TransitEntry` | type | `TransitDriver \| DirectoryDriver` |
| `TransitUser` | interface | `{ id, email, name, nickName?, avatarUrl?, emailVerificationState?, raw }` |
| `EmailVerificationState` | type | `'verified' \| 'unverified' \| 'unsupported'` ; `unsupported` en l'absence |
| `OAuthToken` | interface | `{ accessToken, refreshToken?, expiresIn?, tokenSecret? }` ; `tokenSecret` pour OAuth1 |
| `RedirectRequest` | interface | `{ url: string; state: string; secret?: string }`, ce qu'il faut garder jusqu'au retour |
| `OAuthConfig` | interface | `{ clientId, clientSecret, callbackUrl, scopes?, authorizeParams? }` |
| `OidcConfig` | interface | Options de `oidc()` |
| `SamlConfig` | interface | Options de `saml()` |
| `LdapConfig` | interface | Options de `ldap()` |
| `AppleConfig` | interface | `AppleKey & { callbackUrl; scopes?; authorizeParams? }` |
| `OidcMetadata` | interface | Les champs lus du document de découverte : `issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`, `userinfo_endpoint?`, … |
| `RemoteOptions` | interface | `{ ttlMs?, minRefetchMs?, now? }`, cache du document de découverte et des clés |
| `IdTokenClaims` | interface | `{ iss, sub, aud, exp, iat?, nonce?, azp?, [claim: string]: unknown }` |
| `Jwk` | interface | `{ kty, kid?, alg?, use?, [key: string]: unknown }` |
| `SupportedAlg` | type | `'RS256' \| 'RS384' \| 'RS512' \| 'PS256' \| 'PS384' \| 'PS512' \| 'ES256' \| 'ES384' \| 'ES512'` |

Utilitaires Apple, SAML, XML et LDAP :

| Export | Nature | Description |
|---|---|---|
| `appleClientSecret` | fonction | `appleClientSecret(key: AppleKey, now?: number): string`, le JWT ES256 qu'Apple prend comme secret client (valide 5 minutes) |
| `parseAppleUser` | fonction | `parseAppleUser(value: unknown): { name: string } \| undefined`, le nom qu'Apple poste à la première connexion seulement |
| `AppleKey` | interface | `{ clientId, teamId, keyId, privateKey }` |
| `validateAssertion` | fonction | `validateAssertion(assertion: XmlElement, expected: SamlExpectations): SamlIdentity` |
| `assertResponseSucceeded` | fonction | `assertResponseSucceeded(response: XmlElement): void` ; lève `SamlError` sauf si le statut est Success |
| `assertionInside` | fonction | `assertionInside(signed: XmlElement): XmlElement`, l'assertion que couvre une signature |
| `SamlIdentity` | interface | `{ nameId, nameIdFormat, attributes: Record<string, string[]>, assertionId, notOnOrAfter, rememberUntil, sessionIndex }` |
| `SamlExpectations` | interface | `{ issuer, audience, recipient, inResponseTo?, clockSkewSeconds?, now? }` |
| `SamlError` | erreur | Une réponse SAML refusée |
| `SAML_PROTOCOL_NS`, `SAML_ASSERTION_NS` | const | Les espaces de noms protocole et assertion de SAML 2.0 |
| `AssertionReplayStore` | interface | `{ remember(assertionId: string, expiresAt: number): Promise<boolean> }` ; `false` pour une assertion déjà vue |
| `MemoryAssertionReplayStore` | classe | Retient les assertions dans ce processus |
| `RedisAssertionReplayStore` | classe | `new RedisAssertionReplayStore(client: ReplayRedisResolver, options?: { prefix?: string })` ; préfixe `transit:saml:assertion:` |
| `replayStores` | const | `replayStores.memory()` et `replayStores.redis({ connection, prefix? })` ; `connection` est un client, un résolveur ou un nom de connexion `@c9up/quasar` |
| `ReplayRedisClient` | interface | `{ set(key, value, ...args): Promise<unknown> }` |
| `ReplayRedisResolver` | type | `ReplayRedisClient \| (() => ReplayRedisClient \| Promise<ReplayRedisClient>)` |
| `parseXml` | fonction | `parseXml(source: string, limits?): XmlElement` ; refuse un DOCTYPE, les références d'entité autres que les prédéfinies et numériques, et une entrée malformée, avec `E_TRANSIT_INVALID_XML` |
| `canonicalize` | fonction | `canonicalize(element: XmlElement, options?: CanonicalizeOptions): string`, canonicalisation XML exclusive |
| `CanonicalizeOptions` | interface | `{ inclusivePrefixes?, withComments?, omit? }` |
| `walk` | fonction | `walk(element: XmlElement): Generator<XmlElement>` |
| `childrenNamed` | fonction | `childrenNamed(element: XmlElement, namespaceUri: string, local: string): XmlElement[]` |
| `findByAttribute` | fonction | `findByAttribute(root: XmlElement, attribute: string, value: string): XmlElement \| undefined` |
| `textOf` | fonction | `textOf(element: XmlElement): string` |
| `resolvePrefix` | fonction | `resolvePrefix(element: XmlElement, prefix: string): string \| undefined` |
| `XML_NS` | const | `'http://www.w3.org/XML/1998/namespace'` |
| `XmlElement`, `XmlNode`, `XmlAttribute`, `XmlNamespace` | interface / type | L'arbre XML analysé |
| `LdapConnection` | classe | `new LdapConnection(options: LdapOptions)` : `connect()`, `bind(dn, password)`, `search({ base, filter, attributes?, scope?, sizeLimit? })`, `close()` |
| `LdapOptions` | interface | `{ url, allowInsecure?, timeoutMs?, rejectUnauthorized? }` |
| `LdapFilter` | type | `{ equals: [attribute, value] } \| { present } \| { and } \| { or } \| { not }` |
| `LdapEntry` | interface | `{ dn: string; attributes: Record<string, string[]> }` |
| `LdapError` | erreur | Un refus de l'annuaire ; `code` est le code de résultat LDAP |
| `E_TRANSIT_PROTECTED_PARAMETER` | erreur | Un callback de personnalisation a touché un paramètre que la connexion possède |

### `TransitManager`

| Membre | Signature | Description |
|---|---|---|
| `begin` | `begin(name: string, customize?: AuthorizeCustomizer): Promise<RedirectRequest>`<br>`begin(name: string, state?: string, customize?: AuthorizeCustomizer): Promise<RedirectRequest>` | Commence une connexion via tout fournisseur à redirection : crée le state, obtient un request token si besoin, renvoie le `secret` à garder |
| `redirect` | `redirect(name: string, state?: string, secret?: string, customize?: AuthorizeCustomizer): string` | L'URL de redirection, pour un fournisseur qui peut la construire hors ligne ; OpenID Connect, SAML et OAuth1 lèvent une erreur |
| `callback` | `callback(name: string, code: string, state?: string, expectedState?: string, secret?: string): Promise<{ user: TransitUser; token: OAuthToken }>` | Termine une connexion ; lève une erreur sans `expectedState` ou si `state` diffère |
| `authenticate` | `authenticate(name: string, username: string, password: string): Promise<TransitUser>` | Vérifie une connexion auprès d'un annuaire |
| `userFromToken` | `userFromToken(name: string, accessToken: string, tokenSecret?: string): Promise<TransitUser>` | Lit le profil derrière un jeton déjà détenu |
| `use` | `use(name: string): TransitDriver` | Le fournisseur à redirection sous `name` ; lève une erreur pour un annuaire ou un nom inconnu |
| `directory` | `directory(name: string): DirectoryDriver` | L'annuaire sous `name` |
| `register` | `register(name: string, driver: TransitEntry): void` | Ajoute un fournisseur |
| `registeredDrivers` | `readonly registeredDrivers: string[]` | Les noms configurés |

```ts
const { url, state, secret } = await transit.begin('github', (request) => request.mergeScopes(['repo']))
// gardez state et secret en session, redirigez vers url ; puis, au retour :
const { user } = await transit.callback('github', code, queryState, state, secret)
```

### `AuthorizeRequest`

| Membre | Signature | Description |
|---|---|---|
| `scopes` | `scopes(scopes: string[]): this` | Demande exactement ces scopes |
| `mergeScopes` | `mergeScopes(scopes: string[]): this` | Demande aussi ces scopes |
| `clearScopes` | `clearScopes(): this` | Ne demande aucun scope ; OpenID Connect envoie toujours `openid` |
| `transformScopes` | `transformScopes(callback: (scopes: string[]) => string[]): this` | Transforme les scopes passés ensuite à `scopes()` et `mergeScopes()` |
| `param` | `param(key: string, value: string \| number \| boolean): this` | Ajoute ou remplace un paramètre d'autorisation |
| `clearParam` | `clearParam(key: string): this` | Retire un paramètre d'autorisation |
| `getScopes` | `getScopes(): string[]` | Scopes demandés par cette redirection |
| `getParams` | `getParams(): Record<string, string>` | Paramètres fixés jusqu'ici |

`param()` et `clearParam()` lèvent `E_TRANSIT_PROTECTED_PARAMETER` pour `scope`, `state`, `nonce`, `code_challenge`, `code_challenge_method`, `client_id`, `redirect_uri` et `response_type`. Un callback de personnalisation fonctionne avec les fournisseurs OAuth2 et OpenID Connect ; les autres le refusent.

### `TransitDriver`

| Membre | Signature | Description |
|---|---|---|
| `redirectUrl` | `redirectUrl(state?: string, secret?: string, customize?: AuthorizeCustomizer): string` | L'URL de redirection ; `secret` est le vérificateur PKCE pour un fournisseur qui l'exige |
| `begin` | `begin?(state?: string, customize?: AuthorizeCustomizer): Promise<RedirectRequest>` | L'URL de redirection plus le state et le secret à garder |
| `callback` | `callback(code: string, state?: string, expectedState?: string, secret?: string): Promise<{ user: TransitUser; token: OAuthToken }>` | Échange le code ; vérifie l'aller-retour du state |
| `userFromToken` | `userFromToken?(accessToken: string, tokenSecret?: string): Promise<TransitUser>` | Le profil derrière un jeton détenu |

Un driver OAuth2 personnalisé étend `Oauth2Driver` et définit `provider`, `authorizeUrl`, `accessTokenUrl`, `userInfoUrl`, `defaultScopes` et `mapUser(raw)` ; `requiresPkce`, `tokenAuth` (`'body'` ou `'basic'`), `authorizeParams()` et `userInfoParams()` sont facultatifs. Un driver OAuth1 personnalisé étend `Oauth1Driver` et définit `provider`, `requestTokenUrl`, `authorizeUrl`, `accessTokenUrl`, `userInfoUrl` et `mapUser(raw)`.

### `@c9up/transit/config`

| Export | Nature | Description |
|---|---|---|
| `defineConfig`, `socials`, `oidc`, `saml`, `ldap` | fonction / const | Identiques à ceux de `@c9up/transit` |
| `TransitConfig`, `TransitDriverFactory`, `TransitProviderEntry` | type | Identiques à ceux de `@c9up/transit` |

### `@c9up/transit/provider`

| Export | Nature | Description |
|---|---|---|
| `default` | provider | `TransitProvider` : construit un `TransitManager` depuis la configuration `transit` (en appelant chaque fabrique) et remplit `@c9up/transit/services/main` |
| `TransitAppContext` | interface | `{ container, config }` |

### `@c9up/transit/services/main`

| Export | Nature | Description |
|---|---|---|
| `default` | const | `transit: TransitManager`, le gestionnaire de l'application une fois `TransitProvider` démarré ; lire un membre avant lève une erreur |

### `@c9up/transit/configure`

| Export | Nature | Description |
|---|---|---|
| `configure` | fonction | `configure(codemods): Promise<void>` : ajoute les variables d'environnement Google, enregistre `@c9up/transit/provider`, écrit `config/transit.ts` |

### `@c9up/transit/testing`

| Export | Nature | Description |
|---|---|---|
| `FakeTransit` | classe | Un `TransitManager` qui répond avec des utilisateurs déclarés ; les allers-retours du state et du secret sont contrôlés |
| `FakeIdentity` | interface | `Partial<TransitUser>`, ce que déclare un test |
| `BegunSignIn` | interface | `{ name, state, secret, authorize? }` |
| `CompletedSignIn` | interface | `{ name, user }` |

| Membre | Signature | Description |
|---|---|---|
| `willReturn` | `willReturn(name: string, identity?: FakeIdentity, token?: OAuthToken): this` | Déclare qui revient de `name` ; les champs manquants sont complétés |
| `willAccept` | `willAccept(name: string, username: string, password: string): this` | Déclare les identifiants qu'un annuaire accepte ; sans cela, toute paire est acceptée |
| `begun` | `readonly begun: BegunSignIn[]` | Chaque `begin()`, du plus ancien au plus récent |
| `signedIn` | `readonly signedIn: CompletedSignIn[]` | Chaque connexion terminée |
| `assertBegan` | `assertBegan(name: string): void` | Une connexion via `name` a commencé |
| `assertSignedIn` | `assertSignedIn(name: string): void` | Une connexion via `name` s'est terminée |
| `assertNobodySignedIn` | `assertNobodySignedIn(): void` | Aucune connexion terminée |
| `lastUser` | `lastUser(): TransitUser \| undefined` | L'utilisateur de la dernière connexion terminée |
| `reset` | `reset(): void` | Oublie l'historique, garde les déclarations |

## Configuration

`config/transit.ts`, lu sous la clé `transit`. Chaque clé est un nom de votre choix ; `use(name)` et `begin(name)` prennent cette clé.

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

`OAuthConfig` (fournisseurs sociaux) :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `clientId` | `string` | — | L'identifiant client de l'application chez le fournisseur |
| `clientSecret` | `string` | — | Son secret |
| `callbackUrl` | `string` | — | Où le fournisseur renvoie l'utilisateur |
| `scopes` | `string[]` | selon le fournisseur | Google `openid email profile`, GitHub `read:user user:email`, Discord `identify email`, Facebook `email`, Spotify `user-read-email`, LinkedIn `r_liteprofile r_emailaddress`, LinkedIn OpenID Connect `openid profile email`, X (OAuth2) `tweet.read users.read users.email` |
| `authorizeParams` | `Record<string, string>` | — | Paramètres supplémentaires de l'URL d'autorisation, appliqués après ceux du driver |

`OidcConfig` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `issuer` | `string` | — | L'URL de l'émetteur, telle qu'elle figure dans les jetons |
| `clientId` | `string` | — | Identifiant client |
| `clientSecret` | `string \| (() => string \| Promise<string>)` | — | Secret, ou fonction appelée à chaque requête de jeton |
| `callbackUrl` | `string` | — | URI de redirection |
| `scopes` | `string[]` | `['openid', 'profile', 'email']` | `openid` est ajouté s'il manque |
| `authorizeParams` | `Record<string, string>` | — | `prompt`, `login_hint`, `acr_values`… |
| `userinfo` | `boolean` | `true` | Appelle aussi l'endpoint userinfo quand il est annoncé |
| `leewaySeconds` | `number` | `60` | Dérive d'horloge tolérée sur l'id token |
| `cache` | `RemoteOptions` | — | Cache du document de découverte et des clés de signature |

`SamlConfig` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `entityId` | `string` | — | L'entity id de cette application |
| `callbackUrl` | `string` | — | L'URL ACS de cette application |
| `issuer` | `string` | — | L'entity id du fournisseur d'identité |
| `signOnUrl` | `string` | — | L'endpoint de connexion du fournisseur d'identité |
| `certificates` | `string[]` | — | Les certificats de signature du fournisseur, tirés de ses métadonnées |
| `nameIdFormat` | `string` | — | Format d'identifiant de nom à demander |
| `clockSkewSeconds` | `number` | `60` | Dérive d'horloge tolérée |
| `replayStore` | `AssertionReplayStore \| (() => AssertionReplayStore)` | mémoire | Où sont retenues les assertions utilisées ; en production, il faut en définir un |
| `claims` | `{ email?; name?; nickName? }` | — | Noms d'attributs quand ce ne sont pas les habituels |
| `trustEmail` | `boolean` | `false` | Marque chaque adresse assertée `verified` |
| `trustedEmailDomains` | `string[]` | — | Domaines dont les adresses sont `verified` ; les autres sont `unverified` |

`LdapConfig` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `url` | `string` | — | `ldaps://…` |
| `baseDn` | `string` | — | Point de départ de la recherche |
| `loginAttribute` | `string` | — | `uid`, `sAMAccountName`, `userPrincipalName`… |
| `bindDn`, `bindPassword` | `string` | — | Le compte sous lequel tourne la recherche ; absent, la recherche est anonyme |
| `filter` | `LdapFilter` | — | Conditions supplémentaires, combinées en ET avec l'attribut de connexion |
| `attributes` | `string[]` | ceux du mappage | Attributs à lire |
| `claims` | `{ email?; name?; nickName? }` | — | Noms d'attributs quand ce ne sont pas les habituels |
| `allowInsecure` | `boolean` | `false` | Autorise une connexion en clair |
| `rejectUnauthorized` | `boolean` | `true` | Refuse un certificat serveur invalide |
| `timeoutMs` | `number` | `10000` | Attente de la connexion et de chaque réponse |

`AppleConfig` prend `clientId`, `teamId`, `keyId`, `privateKey` (le contenu du `.p8`), `callbackUrl`, `scopes` (par défaut `['name', 'email']`) et `authorizeParams`.

## Liaisons du conteneur

| Token | Résout vers |
|---|---|
| `TransitManager` (classe) | Le gestionnaire construit depuis la configuration `transit` |
| `'transit'` | Le même `TransitManager` |

`'transit'` est déclaré dans `ContainerBindings`.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_TRANSIT_INVALID_XML`](/fr/reference/errors#e-transit-invalid-xml) | Un fournisseur a répondu un XML illisible ou qui utilise une construction refusée (un DOCTYPE, une référence d'entité) |
| [`E_TRANSIT_PROTECTED_PARAMETER`](/fr/reference/errors#e-transit-protected-parameter) | Un callback de personnalisation a fixé ou retiré un paramètre que la connexion possède, ou `scope` via `param()` |

Une réponse SAML refusée lève `SamlError`, un refus de l'annuaire `LdapError`, et un state différent, un nom de fournisseur inconnu ou un `expectedState` manquant une `Error` simple.

## Voir aussi

- [Authentification sociale](/fr/guides/auth/social/)
- [Fournisseurs](/fr/guides/auth/social/providers)
- [OpenID Connect](/fr/guides/auth/social/oidc)
- [SAML 2.0](/fr/guides/auth/social/saml)
- [LDAP et Active Directory](/fr/guides/auth/social/ldap)
- [Tests et drivers personnalisés](/fr/guides/auth/social/testing)
