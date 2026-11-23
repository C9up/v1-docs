# Garde de session

Ce guide couvre la garde de session :

- login() / logout() / verifyWithContext()
- Révoquer une connexion — `blacklist`
- Se souvenir de moi
- Savoir COMMENT l'utilisateur est arrivé là

## SessionStrategy

`SessionStrategy` est la stratégie cookie/session intégrée. Elle stocke l'`id` de l'utilisateur authentifié dans un store de session **après** que l'appelant ait vérifié le mot de passe — Warden ne hash et ne vérifie jamais de mot de passe lui-même.

```typescript
import { SessionStrategy } from '@c9up/warden'

const strategy = new SessionStrategy({
  // Optionnel : clé de session (défaut : 'auth_user_id')
  sessionKey: 'auth_user_id',

  // Appelée par verifyWithContext() — charge l'utilisateur via l'id en session.
  // `id` est `string | number` (le type stocké au moment du login).
  findUser: async (id: string | number) => {
    const user = await db.users.findById(String(id))
    if (!user) return null
    return { id: user.id, roles: user.roles, permissions: user.permissions }
  },
})
```

Configurez-la depuis `config/auth.ts` avec un bloc `session` — fournissez `findUser` et le `WardenProvider` enregistre la stratégie sous le nom `session` :

```typescript
// config/auth.ts
export default {
  defaultStrategy: 'session',          // session-first (app web)
  session: {
    findUser: async (id) => /* résout votre utilisateur via l'id stocké */ null,
  },
}
```

Sans bloc `session`, la stratégie n'est pas enregistrée et `@Guard('session')` lève une erreur.

### login() / logout() / verifyWithContext()

`SessionStrategy.authenticate()` est volontairement un no-op — elle lève une erreur pour rendre le contrat explicite. Appelez `login(user, session)` après avoir vérifié le mot de passe vous-même, puis `verifyWithContext(unused, { session })` sur les requêtes suivantes. `login()` **fait tourner l'id de session** (`session.regenerate()`) avant de stocker l'id utilisateur — la défense standard contre la fixation de session (CWE-384) :

```typescript
import { Hash } from '@c9up/sigil'
import { authFinder } from '@c9up/warden'

const hash = new Hash({
  default: 'argon2',
  drivers: { argon2: { driver: 'argon2' } },
})
const users = authFinder({
  hash,
  findForAuth: (email) => db.users.findByEmail(email),
  passwordColumnName: 'passwordHash',
})

// Flux de login — l'appelant vérifie le mot de passe, Warden mintie la session.
// Lève E_INVALID_CREDENTIALS (400) pour un email inconnu comme pour un mauvais
// mot de passe, après le même travail de hachage.
const user = await users.verifyCredentials(email, password)

await strategy.login({ id: user.id, roles: user.roles }, ctx.session)

// Requêtes suivantes
const result = await strategy.verifyWithContext('unused', { session: ctx.session })
if (result.authenticated && result.user) {
  const { user } = result
  ctx.auth = { isAuthenticated: true, user, roles: user.roles ?? [], permissions: user.permissions ?? [] }
}

// Logout
await strategy.logout(ctx.session)
```

`logout()` oublie l'id utilisateur et **fait aussi tourner l'id de session**.
Une requête encore en cours au moment de la déconnexion tient l'ancien id ;
son entrée ayant disparu, le stockage de session de Ream n'y réécrit rien : la
requête ne peut pas reconnecter l'utilisateur, et une copie de l'ancien id non
plus.

### Révoquer une connexion — `blacklist`

Avec le stockage de session cookie, la session vit dans le navigateur, et le
serveur n'a rien à supprimer à la déconnexion : un cookie copié avant, ou
renvoyé par une requête en cours pendant la déconnexion, resterait connecté.
Donnez au guard une `blacklist`, la même `TokenBlacklist` qui révoque les jetons
de `JwtStrategy` :

```typescript
import { RedisBlacklistDriver, SessionStrategy, TokenBlacklist } from '@c9up/warden'

new SessionStrategy({
  findUser,
  blacklist: new TokenBlacklist(new RedisBlacklistDriver(client)),
})
```

Sans elle, `login()` sur une telle session lève `E_WARDEN_INVALID_CONFIG` : une
application sur le stockage cookie s'en aperçoit à sa première connexion, pas
après un vol de cookie.

Chaque connexion reçoit alors un id, rangé dans la session à côté de l'id
utilisateur (`auth_user_id_sid`). `logout()` l'inscrit pour deux fois la durée
de la session, si bien que l'inscription survit à toutes les copies du cookie :
Ream compte la durée d'un cookie réémis depuis le moment où sa requête a lu la
session, si bien que même une requête en cours pendant la déconnexion ne rend
rien qui vive plus d'une durée après elle.
Une session qui porte un id inscrit est déconnectée, et ses clés sont oubliées :
le cookie renvoyé ne porte plus rien. Une autre connexion du même utilisateur,
sur un autre appareil, n'est pas touchée.

Dès qu'une `blacklist` est posée, une session sans id de connexion est refusée,
comme `JwtStrategy` refuse un jeton sans `jti` : elle ne pourrait jamais être
révoquée. Les utilisateurs connectés avant le changement se reconnectent une
fois.

La durée se lit sur la session de Ream (`session.config.ttl`). Un autre
stockage de session peut passer `sessionAge` (en secondes) à la place ; le
défaut est de deux heures. `MemoryBlacklistDriver` suffit pour un seul
processus ; plusieurs instances demandent un stockage partagé comme
`RedisBlacklistDriver`.

L'interface `SessionStore` est volontairement minimale — `get(key)`, `put(key, value)`, `forget(key)`, `regenerate()`. Les noms de méthodes épousent l'**API `Session` de Ream** (`put`, pas `set`), si bien que la `Session` de Ream — exposée sur `ctx.session` par `SessionMiddleware` — satisfait le contrat structurellement, sans adaptateur. (Si vous aviez écrit un `SessionStore` maison contre l'ancien `set()`, renommez-le en `put()`.)

> **`ctx.session`.** La session de requête vit sur `ctx.session`, peuplée par le `SessionMiddleware` de Ream. Enregistrez ce middleware **avant** le middleware d'auth pour que `ctx.session` soit posé quand la stratégie session résout l'utilisateur.

### Se souvenir de moi

« Rester connecté » — un identifiant qui survit au cookie de session. Câbler
un driver de tokens **est** l'activation :

```ts
import { MemoryRememberMeTokenDriver, SessionStrategy } from '@c9up/warden'

new SessionStrategy({
  findUser: (id) => User.find(id),
  rememberMeTokens: new MemoryRememberMeTokenDriver(), // votre propre driver en production
  rememberMeAge: 63_072_000,                           // secondes ; 2 ans, la valeur par défaut
  rememberMeCookieName: 'remember_web',                // `remember_<guard>`
  rememberMeCookie: { sameSite: 'strict' },            // surcharges facultatives, voir plus bas
})
```

`ctx.auth.use('web').login(user, true)` écrit le cookie pour vous : chiffré,
`HttpOnly`, `SameSite=Lax`, `Path=/`, et `Secure` en production — un credential
qui vit des années ne part jamais en HTTP clair ni dans une requête cross-site.
`rememberMeCookie` surcharge `path`, `domain`, `sameSite` et `secure` ; `HttpOnly`
reste. `rememberMeAge` doit être un nombre entier positif de secondes.

À la connexion, émettez-en un et posez-le en cookie **httpOnly** ; sur une
requête sans session, essayez-le ; à la déconnexion, révoquez-le :

```ts
const value = await guard.issueRememberMeToken(user)
if (value) response.cookie(guard.rememberMeCookieName, value, { httpOnly: true, maxAge: 63_072_000 })

const revived = await guard.authenticateViaRememberMeToken(request.cookie(guard.rememberMeCookieName))
if (revived) {
  await guard.login(revived.user, session)
  // Le token a été RECYCLÉ — le navigateur doit prendre la nouvelle valeur.
  response.cookie(guard.rememberMeCookieName, revived.cookieValue, { httpOnly: true })
}

await guard.revokeRememberMeToken(request.cookie(guard.rememberMeCookieName))
```

Ce qui rend le mécanisme sûr, et pourquoi chaque point compte :

- **Seul `sha256(secret)` est stocké.** Une fuite de la table ne permet à
  personne de se connecter : le secret n'existe que dans le cookie.
- **Chaque usage recycle le secret, une seule fois.** La valeur que détenait le
  navigateur cesse de fonctionner dès qu'elle sert, donc un cookie volé meurt au
  retour du véritable utilisateur. La rotation est un compare-and-set : de deux
  requêtes présentant le même cookie au même instant, une seule passe. C'est
  pourquoi l'appelant doit écrire le `cookieValue` renvoyé.
- **L'utilisateur est relu, jamais déduit du token.** Un token survit à la
  ligne qu'il désigne ; un compte supprimé ou désactivé ne doit pas revenir.
- **Les empreintes sont comparées en temps constant**, et un mauvais secret, un
  identifiant inconnu et un token expiré sont indiscernables de l'extérieur —
  un « identifiant inconnu » distinguable permettrait de les énumérer.
- **Un token par connexion**, pour qu'une déconnexion sur un appareil laisse les
  autres tranquilles.
- **La déconnexion y met fin.** `ctx.auth.use('web').logout()` efface le cookie
  et supprime le token stocké que le cookie désigne, quel que soit son secret —
  un cookie dont le secret ne correspond plus est un cookie qu'une copie volée a
  déjà recyclé. Le cookie est effacé en premier : un stockage qui échoue à
  supprimer la ligne ne laisse jamais le navigateur en possession du
  credential ; cet échec est tout de même levé, une fois la session terminée.

`MemoryRememberMeTokenDriver` convient aux tests et aux applications
mono-process ; un cluster a besoin d'un stockage partagé implémentant
`RememberMeTokenDriver` (`create` / `find` / `update` / `delete` /
`deleteAllForUser`). `update(identifier, previousHash, hash, expiresAt)` ne doit
remplacer la ligne **que si son empreinte vaut encore `previousHash`** —
`UPDATE … WHERE identifier = ? AND hash = ?` — et dire s'il l'a fait.

### Savoir COMMENT l'utilisateur est arrivé là

```ts
guard.viaRemember           // ressuscité depuis le cookie, pas depuis un mot de passe
guard.attemptedViaRemember  // un jeton a été tenté, qu'il ait marché ou non
guard.isLoggedOut           // logout() a tourné sur ce garde
guard.sessionKeyName        // 'auth_user_id'
guard.rememberMeKeyName     // 'remember_web'
```

`viaRemember` est celui qui compte. Une session restaurée depuis un cookie
ressemblait exactement à une où l'utilisateur venait de taper son mot de passe :
impossible pour une app de le redemander avant une action sensible.

```ts
if (guard.viaRemember) {
  return response.redirect().toRoute('auth.confirm_password')
}
await deleteAccount(user)
```

Une vraie connexion remet le drapeau à zéro : la demande cesse dès que le mot de
passe a réellement été fourni.

#### La classe `RememberMeToken`

Pour du code qui manipule les jetons directement — un driver maison, une
migration, un écran d'admin — la classe `RememberMeToken` est exportée à côté des
fonctions qu'utilise le garde. Les deux reposent sur le même encodage et le même
hachage : elles ne peuvent pas diverger sur ce qu'est un jeton.

```ts
import { RememberMeToken, Secret } from '@c9up/warden'

const decoded = RememberMeToken.decode(cookieValue)   // null si malformé
decoded?.identifier                                    // la moitié publique
decoded?.secret                                        // Secret<string>

const { secret, hash } = RememberMeToken.seed()
const transient = RememberMeToken.createTransientToken(user.id, 40, 63_072_000)

const token = RememberMeToken.fromStored(row)
token.isExpired()
token.verify(decoded.secret)                           // temps constant
token.toStored()                                       // retour à la forme du driver
```

Les secrets reviennent enveloppés dans un `Secret`, pour qu'aucun
ne finisse dans un log en étant interpolé dans une chaîne :

```ts
`${decoded.secret}`          // '[redacted]'
JSON.stringify(decoded)      // {"secret":"[redacted]", ...}
decoded.secret.release()     // la vraie valeur, délibérément
```

`expiresIn` accepte soit des secondes, soit une chaîne de durée — `3600`,
`'1h'`, `'7 days'`. Un nombre nu vaut toujours des **secondes**, comme partout
ailleurs dans ce module. Le `expiresInSeconds` livré au départ fonctionne
encore ; si une config pose les deux, `expiresIn` l'emporte. Une durée est un
nombre entier de secondes : `'500ms'` est refusé, car le `exp` d'un jeton ne
peut pas contenir de fraction.

::: tip Pourquoi warden a son propre `Secret`
warden embarque son propre `Secret` plutôt que d'importer `@c9up/ream` : il n'a
aucune dépendance runtime et expose un point d'entrée autonome, un import de
pair casserait le mode sans framework.
:::

---
