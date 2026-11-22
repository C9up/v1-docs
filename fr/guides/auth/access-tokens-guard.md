# Garde par jetons d’accès

Ce guide couvre la garde par jetons d'accès :

- Le garde
- Les capacités ne sont pas des permissions
- Gérer les jetons d'un utilisateur

## Jetons d'accès

Des jetons porteurs opaques pour les API, les outils en ligne de commande et les
applications mobiles. Une valeur de jeton a la forme `oat_<identifiant>.<secret>`.
Seul `sha256(secret)` est stocké, la comparaison se fait en temps constant, et le
secret se termine par une somme de contrôle CRC-32 pour qu'un scanner de secrets
reconnaisse un jeton qui a fuité.

```ts
import { AccessTokensProvider, MemoryAccessTokenStore } from '@c9up/warden'
import { apiKeyGuard, defineConfig } from '@c9up/warden/config'

// En production, implémentez AccessTokenStore sur votre propre table.
const tokens = new AccessTokensProvider({
  store: new MemoryAccessTokenStore(),
  expiresIn: '30 days',               // durée de vie par défaut ; absente, les jetons n'expirent pas
})

export default defineConfig({
  default: 'api',
  guards: { api: apiKeyGuard({ tokens, findUser: (id) => User.find(id) }) },
})
```

L'émission renvoie le seul objet qui porte jamais la valeur — remettez-la au
client tout de suite, rien de ce qui est stocké ne permet de la reconstruire :

```ts
const token = await tokens.create(user, ['orders:read'], { name: 'CI', expiresIn: '7 days' })
token.value.release()   // "oat_…"
token.toJSON()          // { type: 'bearer', name, token, abilities, lastUsedAt, expiresAt }
```

`abilities` vaut `['*']` par défaut, c'est-à-dire toutes les capacités.
`AccessTokensProvider` prend `store`, `prefix` (`oat_` par défaut ; non vide,
sans `.`), `type` (`auth_token` par défaut, pour qu'une même table contienne
plusieurs sortes de jetons), `tokenSecretLength` (40 par défaut, au moins 32 :
un secret plus court se devine) et `expiresIn` (en secondes ou sous forme de
durée). Une valeur qui ne convient pas est refusée à la construction.
L'identifiant est fait de 128 bits aléatoires plutôt que d'un id de ligne : on ne
peut pas viser un jeton en énumérant les lignes.

### Le garde

`apiKeyGuard({ tokens, findUser })` construit une `ApiKeyStrategy`, enregistrée
comme driver `access_tokens`. Elle lit `Authorization: Bearer <jeton>` ou
l'en-tête `x-api-key` (`headerName` le change), et vérifie la valeur auprès du
provider : une valeur qui n'est pas l'un de nos jetons, un identifiant inconnu,
un jeton d'un autre type, un mauvais secret et un jeton expiré donnent tous le
même refus. Seul un jeton vérifié voit son `lastUsedAt` mis à jour.
L'utilisateur est ensuite rechargé via `findUser` à **chaque** requête : un jeton
dont le compte a été supprimé ou désactivé cesse de fonctionner dès que
`findUser` répond `null`.

Une config qui passe encore `findByKey` au lieu de `tokens` est refusée à la
construction du garde, pas à la première requête.

### Les capacités ne sont pas des permissions

L'utilisateur authentifié porte le jeton dans `user.currentAccessToken` :

```ts
const token = ctx.auth.user.currentAccessToken
token.abilities               // ['orders:read']
token.allows('orders:read')   // true — '*' autorise tout
token.denies('orders:write')  // true
token.authorize('orders:write') // lève E_UNAUTHORIZED_ACCESS
token.isExpired()
token.lastUsedAt
```

Les capacités d'un jeton ne sont **jamais** fusionnées dans `user.permissions`,
qui contient les permissions propres de l'utilisateur. Ce qu'une requête faite
avec un jeton peut faire, c'est ce que l'utilisateur peut faire **et** ce que le
jeton autorise : une capacité qui porte le nom d'une permission n'accorde rien
que l'utilisateur n'a pas, et un jeton limité à quelques capacités ne porte pas
toutes les permissions de son utilisateur. `@Permission(...)`, `hasPermission`,
`hasAllPermissions`, `resolvePermissions` et le `this.permissions` d'une policy
appliquent exactement cette intersection ;
`tokenAllows(user, permission)` en est la moitié « jeton », seule. Un
utilisateur connecté par session ou par JWT n'a pas de `currentAccessToken` et
n'est vérifié que sur ses propres permissions.

### Gérer les jetons d'un utilisateur

```ts
await tokens.all(user)                 // les plus récemment utilisés d'abord, jamais utilisés à la fin
await tokens.find(user, identifier)    // null s'il n'est pas à cet utilisateur
await tokens.delete(user, identifier)  // 0 ou 1
await tokens.deleteAll(user)
await tokens.invalidate(new Secret(presentedValue)) // révoque depuis la valeur elle-même
guard.invalidateToken(presentedValue)                // la même chose, depuis la stratégie

// Par requête, via le garde par lequel la requête s'est authentifiée :
const token = await ctx.auth.use('api').createToken(user, ['orders:read'])
token.value.release()                                // à remettre au client tout de suite
await ctx.auth.use('api').invalidateToken()          // déconnexion : révoque le jeton de cette requête
```

`ctx.auth.use('api').invalidateToken()` lit le jeton dans la requête (le jeton
Bearer, ou l'en-tête de clé d'API du garde) et lève `E_UNAUTHORIZED_ACCESS` s'il
n'y en a pas. Appeler l'une ou l'autre sur un garde qui n'émet pas de jetons
d'accès lève `E_WARDEN_STRATEGY_CANNOT_ISSUE`.

`find` et `delete` ne touchent qu'un jeton appartenant à l'utilisateur nommé.
`invalidate` ne révoque que si le secret correspond : un identifiant seul — lu
dans une ligne de log ou une liste de jetons — ne suffit pas à révoquer le jeton
de quelqu'un d'autre.

`AccessTokenStore` est la table : `create`, `find(identifier)`,
`touch(identifier, lastUsedAt)`, `delete(identifier)` (indique si une ligne est
partie) et `listForUser(userId)`. Les horodatages sont en millisecondes depuis
l'epoch et `expiresAt` vaut `null` pour un jeton qui n'expire jamais.
`MemoryAccessTokenStore` sert aux tests et aux outils mono-processus. Une
application qui a son propre schéma de jetons implémente
`AccessTokensProviderContract` (`create`, `verify`, `invalidate`) au lieu
d'utiliser `AccessTokensProvider`.

---
