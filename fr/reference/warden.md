# warden

Ce guide couvre les types, événements et codes d’erreur de warden :

- Types
- Événements d'authentification
- Codes d'erreur

## Types

```typescript
interface AuthStrategy {
  name: string
  authenticate(credentials: Record<string, unknown>): Promise<AuthResult>
  verify(token: string): Promise<AuthResult>
}

interface AuthResult {
  authenticated: boolean
  user?: UserPayload
  error?: string
}

interface UserPayload {
  id: string
  roles?: string[]
  permissions?: string[]                    // celles de l'utilisateur, jamais élargies par un jeton
  currentAccessToken?: CurrentAccessToken   // posé par un garde à jetons
  [key: string]: unknown
}

interface CurrentAccessToken {
  readonly abilities: readonly string[]
  allows(ability: string): boolean
  denies(ability: string): boolean
  authorize(ability: string): void
}

interface AuthConfig {
  defaultStrategy: string
  strategies: Record<string, AuthStrategy>
}

interface JwtStrategyConfig {
  secret: string
  expiresIn?: number | string
  expiresInSeconds?: number
  verifyCredentials: (email: string, password: string) => Promise<UserPayload | null>
  findUser: (id: string) => Promise<UserPayload | null>
}
```

---

### Vérifier sans lever

`authenticate()` lève ; `check()` répond. La même paire existe pour une liste de
gardes :

```ts
const user = await auth.authenticate()  // l'utilisateur, ou lève E_UNAUTHORIZED_ACCESS
await auth.check()                      // true | false

const sameUser = await auth.authenticateUsing(['web', 'api'])
await auth.checkUsing(['web', 'api'])   // le pendant qui ne lève pas
```

### Un garde de la requête — `auth.use()`

`auth.use(name)` est un garde de cette requête ; `auth.use()` sans nom est le
garde par défaut, que nomme `auth.defaultGuard`. Chaque garde répond aux mêmes
questions que l'authenticator, pour lui-même :

```ts
const web = ctx.auth.use()              // le garde par défaut
ctx.auth.defaultGuard                   // 'web'

await web.authenticate()                // l'utilisateur, ou lève E_UNAUTHORIZED_ACCESS
await web.check()                       // true | false
web.getUserOrFail()                     // l'utilisateur, ou lève E_UNAUTHORIZED_ACCESS
web.authenticationAttempted             // si ce garde a été essayé pendant la requête
await web.authenticateAsClient(user)    // ce qu'envoie un client de test (arguments propres à la stratégie)

await ctx.auth.use('api').createToken(user, ['orders:read'])
await ctx.auth.use('api').invalidateToken()
```

`createToken` et `invalidateToken` n'existent que sur un garde à jetons d'accès ;
voir **Gérer les jetons d'un utilisateur**.

Un handler qui se demande « quelqu'un est-il connecté via l'un des deux » devait
écrire le try/catch lui-même. Un refus d'identifiants est une réponse ; une
stratégie **plantée** se propage toujours, plutôt que d'être rapportée comme
« pas connecté ».

`auth.createAuthenticator(ctx)` construit ce que le middleware HTTP construit
par requête, pour une commande console ou un job sans requête autour.

## Événements d'authentification

Branche un emitter et chaque décision d'authentification est annoncée. Le nom de
l'événement est préfixé par le **pilote** du garde — une app
qui audite les connexions de session n'entend donc pas parler du trafic par
jeton porteur sous le même nom :

| Pilote | Préfixe d'événement |
| --- | --- |
| `session` | `session_auth:*` |
| `access_tokens` / `api-key` | `access_tokens_auth:*` |
| `basic_auth` | `basic_auth:*` |
| `jwt` | `jwt_auth:*` |

```ts
auth.setEmitter(emitter)

emitter.on('session_auth:login_succeeded', ({ guardName, user }) => audit(user))
emitter.on('jwt_auth:authentication_failed', ({ guardName, error }) => alert(error))
```

Le préfixe vient du pilote de la stratégie, pas de la clé de config du garde : un
garde nommé `web` portant une `SessionStrategy` reste le pilote session.
`authEventPrefix(driverName)` est exporté si tu as
besoin de construire un nom toi-même. `jwt` devient `jwt_auth`.

Événements : `login_attempted`, `login_succeeded`, `logged_out` (gardes avec état
seulement), plus `authentication_attempted`, `authentication_succeeded` et
`authentication_failed` sur chaque garde. L'événement de succès porte le nom du
garde qui a réellement répondu, pas de celui demandé en premier.

Un écouteur qui lève ne casse jamais une connexion — ce n'est pas au bus
d'événements de mettre son veto à une authentification.

## Codes d'erreur

| Code | Levé quand |
|---|---|
| `E_WARDEN_NO_AUTH_CONFIG` | `WardenProvider` ne trouve ni guard ni bloc de driver dans `config/auth.ts` |
| `E_WARDEN_INVALID_CONFIG` | `defaultStrategy` n'est pas présent dans `strategies`, ou une stratégie est configurée de façon inutilisable |
| `E_WARDEN_STRATEGY_NOT_FOUND` | `getStrategy()` ou `verify()` appelé avec un nom de stratégie non enregistré |

---
