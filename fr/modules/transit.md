# Transit — Connexion fédérée

Transit, c'est l'endroit où une personne prouve qui elle est via une autorité
que votre application ne possède pas. Aujourd'hui : OAuth1, OAuth2, et les
fournisseurs qui les parlent.

C'est un paquet à part plutôt qu'un coin de [Warden](/fr/modules/warden) parce
que les deux répondent à des questions différentes. Warden s'occupe des
personnes que vous avez déjà — guards, sessions, jetons, permissions. Transit
s'occupe du moment où quelqu'un arrive d'ailleurs.

## Installation

```bash
pnpm add @c9up/transit
```

```ts
// reamrc.ts
providers: [
  () => import('@c9up/transit/provider'),
]
```

## Configuration

```ts
// config/transit.ts
import { defineConfig, socials } from '@c9up/transit'

export default defineConfig({
  google: socials.google({
    clientId: env.get('GOOGLE_CLIENT_ID'),
    clientSecret: env.get('GOOGLE_CLIENT_SECRET'),
    callbackUrl: 'https://acme.test/auth/google/callback',
  }),
  github: socials.github({
    clientId: env.get('GITHUB_CLIENT_ID'),
    clientSecret: env.get('GITHUB_CLIENT_SECRET'),
    callbackUrl: 'https://acme.test/auth/github/callback',
    scopes: ['user', 'user:email'],
  }),
})
```

Les clés sont les vôtres. Deux entrées peuvent atteindre le même fournisseur
avec des identifiants différents — une connexion `staff` et une `customers`,
toutes deux sur Google — et `use(name)` demande la clé, pas le fournisseur.

Le manager est enregistré sous `TransitManager` et sous l'alias `"transit"`, et
joignable de partout via l'accesseur de service.

## Les fournisseurs

| Helper | Scopes par défaut |
| --- | --- |
| `socials.apple` | `name`, `email` *(voir plus bas — pas de client secret)* |
| `socials.discord` | `identify`, `email` |
| `socials.facebook` | `email` |
| `socials.github` | `read:user`, `user:email` |
| `socials.google` | `openid`, `email`, `profile` |
| `socials.linkedin` | `r_liteprofile`, `r_emailaddress` |
| `socials.linkedinOpenidConnect` | `openid`, `profile`, `email` |
| `socials.spotify` | `user-read-email` |
| `socials.twitter` | *(OAuth1 — X n'a pas de scopes)* |
| `socials.twitterX` | `tweet.read`, `users.read`, `users.email` |

`scopes` remplace les valeurs par défaut. `authorizeParams` ajoute tout ce que
le fournisseur accepte d'autre sur son URL d'autorisation — `prompt`,
`display`, `show_dialog`, `guild_id` — sans un type de config par fournisseur :

```ts
socials.discord({ ...identifiants, authorizeParams: { prompt: 'none' } })
```

Deux entrées LinkedIn parce que LinkedIn a deux flux. **Une application récente
veut `linkedinOpenidConnect`** — LinkedIn n'accorde plus `r_liteprofile` aux
nouvelles applications. `linkedin` est l'API membre, pour une application qui
détient déjà ces scopes ; elle lit l'adresse sur un second endpoint.

Deux entrées X pour la même raison : deux protocoles. Une application récente
veut `twitterX` ; `twitter` est le seul dont l'appel profil renvoie l'adresse.

## OpenID Connect

Un seul driver pour tout fournisseur conforme — Keycloak, Auth0, Okta,
Entra ID, Authentik, Zitadel, Ping, Google. Donnez-lui un issuer, il lit le
reste.

```ts
import { defineConfig, oidc } from '@c9up/transit'

export default defineConfig({
  work: oidc({
    issuer: 'https://id.acme.com',
    clientId: env.get('OIDC_CLIENT_ID'),
    clientSecret: env.get('OIDC_CLIENT_SECRET'),
    callbackUrl: 'https://acme.test/auth/work/callback',
  }),
})
```

Les endpoints, les clés de signature et les algorithmes viennent du
`/.well-known/openid-configuration` du fournisseur : il n'y a rien d'autre à
configurer, et rien à changer quand il fait tourner une clé. Le contrôleur est
celui ci-dessous, inchangé.

`scopes` vaut `openid profile email` par défaut, et `openid` est réajouté si une
config l'oublie — sans lui, le fournisseur exécute un OAuth2 ordinaire et ne
renvoie aucun `id_token`. `authorizeParams` porte `prompt`, `login_hint`,
`acr_values`. `userinfo: false` supprime l'appel de profil supplémentaire quand
les claims du token suffisent. `leewaySeconds` (60 par défaut) est la dérive
d'horloge tolérée vis-à-vis du fournisseur.

### Ce qui est vérifié

Un fournisseur OpenID Connect ne rend pas seulement un jeton pour aller
demander : il rend une **déclaration signée sur l'identité de la personne**.
Cette déclaration ne vaut rien tant qu'elle n'est pas contrôlée, donc tout ceci
est exigé avant qu'un utilisateur soit rendu :

| | |
| --- | --- |
| Signature | Contre la clé publiée par le fournisseur, lue sur son JWKS. |
| Algorithme | Choisi parmi ce que le fournisseur **a déclaré signer** — jamais lu dans le token. |
| Clé | Doit être du type sur lequel l'algorithme est défini, et sur la bonne courbe. |
| `iss` | L'issuer configuré, confronté au document de découverte. |
| `aud` | Doit nommer ce client. Avec plusieurs audiences, `azp` doit le nommer aussi. |
| `exp` / `iat` | Non expiré, non émis dans le futur. |
| `nonce` | Celui que cette connexion a envoyé. |
| `sub` | La réponse userinfo doit décrire la même personne que le token. |

Deux de ces lignes méritent une phrase. Prendre l'algorithme dans l'en-tête du
token, c'est ce qui fait marcher `alg: none`, et ce qui permet de rejouer une
clé publique RS256 comme un secret partagé HS256 — l'en-tête ne peut donc que
*choisir* dans un ensemble calculé à l'avance, jamais en introduire un. Et le
`nonce` est ce qui empêche un token capturé lors d'une connexion antérieure du
même utilisateur d'être rejoué dans une session neuve ; il voyage dans `secret`,
d'où la demande de `begin()` de le conserver.

Seules les signatures asymétriques sont acceptées. La famille `HS*` signe avec
le secret client : toute copie de la config — et toute ligne de log qui l'a
laissé fuiter — pourrait forger un token pour n'importe quel utilisateur.

### Les clés, et quand elles sont relues

Le document de découverte est mis en cache une heure ; les clés de signature le
sont jusqu'à ce qu'un token en nomme une absente, ce qui est la façon dont une
rotation est captée. Cette relecture est limitée à une fois toutes les cinq
minutes, pour qu'un flot de tokens nommant des clés inventées ne transforme pas
votre application en générateur de charge contre le fournisseur. Les deux se
règlent via `cache`.

## Sign in with Apple

Obligatoire sur iOS dès qu'une application propose une autre connexion sociale.
Apple parle OpenID Connect, donc le flux est celui ci-dessus — mais il diffère
en trois points, et chacun est un endroit où une implémentation se fait piéger.

```ts
import { defineConfig, socials } from '@c9up/transit'

export default defineConfig({
  apple: socials.apple({
    clientId: 'com.acme.web',          // le Services ID
    teamId: env.get('APPLE_TEAM_ID'),
    keyId: env.get('APPLE_KEY_ID'),
    privateKey: env.get('APPLE_PRIVATE_KEY'),   // le contenu du .p8
    callbackUrl: 'https://acme.test/auth/apple/callback',
  }),
})
```

**Il n'y a pas de client secret.** Apple accepte un JWT de courte durée signé
avec le `.p8`, généré à chaque requête. Rien à stocker, rien à faire tourner —
et rien à rater, alors qu'une signature encodée en DER se transforme
habituellement en un `invalid_client` peu bavard.

**Le callback est un POST.** Demander un nom ou une adresse impose
`response_mode=form_post` : la route de callback doit donc accepter `POST` et
lire `code` et `state` dans le corps, pas dans la query string.

**Le nom n'est envoyé qu'une fois**, dans ce premier POST de consentement, dans
un champ `user`. Jamais dans un token, jamais lors d'une connexion suivante :

```ts
import { parseAppleUser } from '@c9up/transit'

const identity = parseAppleUser(ctx.request.input('user'))
// { name: 'Ada Lovelace', email: 'ada@privaterelay.appleid.com' } — ou undefined
```

Stockez-le quand il est là. `undefined` est le cas normal d'un utilisateur qui
revient, pas une erreur.

L'adresse peut être un relais privé (`is_private_email` dans `user.raw`), qui
fait suivre et que la personne peut couper à tout moment. Apple envoie ses
booléens sous forme de chaînes `"true"` / `"false"` ; le driver les lit, donc
`emailVerificationState` vaut bien `verified` quand Apple l'affirme.

## L'aller-retour

```ts
import transit from '@c9up/transit/services/main'

// Envoyer l'utilisateur
const { url, state, secret } = await transit.begin('google')
ctx.session.put('transit_state', state)
ctx.session.put('transit_secret', secret)
return ctx.response.redirect(url)

// ... et le recevoir au retour
const { user, token } = await transit.callback(
  'google',
  ctx.request.input('code'),
  ctx.request.input('state'),
  ctx.session.pull('transit_state'),
  ctx.session.pull('transit_secret'),
)
```

`begin()` est le chemin qui fonctionne pour tous les fournisseurs : il génère le
state, demande un jeton de requête au fournisseur quand le protocole l'exige, et
rend tout ce qui doit survivre jusqu'au retour de l'utilisateur.

`secret` vaut `undefined` pour un OAuth2 simple, le vérificateur PKCE pour un
fournisseur qui l'impose, et le secret du jeton de requête pour OAuth1. Le
stocker et le rendre sans condition permet à un seul contrôleur de servir les
trois.

`transit.redirect(name, state)` reste disponible pour un OAuth2 simple dont
l'URL se construit hors ligne. Un fournisseur OAuth1 y lève une erreur et
renvoie vers `begin()`.

Le `state` n'est pas optionnel. Le callback **refuse** de s'exécuter sans valeur
attendue à comparer : un callback OAuth qui fait confiance au code qui arrive
laisse un attaquant rattacher son propre compte fournisseur à la session d'une
victime connectée. Ce contrôle ne peut pas être désactivé.

## Ce qui revient

`user` porte `id`, `email`, `name`, le `nickName` du fournisseur (un login, un
pseudo, un nom affiché), un `avatarUrl` optionnel, un `emailVerificationState`
et la charge brute. `token` porte `accessToken` et, quand le fournisseur les
émet, `refreshToken` et `expiresIn` — plus `tokenSecret` pour OAuth1, dont le
jeton d'accès ne signe rien tout seul.

### Avant de rattacher un compte par email

```ts
if (user.emailVerificationState !== 'verified') {
  // Faire confirmer l'adresse plutôt que de rattacher dessus.
}
```

`unverified` signifie que quiconque a pu saisir cette adresse chez le
fournisseur la détient désormais — rattacher sur cette base lui remet le compte.
`unsupported` signifie que le fournisseur ne dit rien, ce qui n'est pas un oui ;
Spotify, X et l'API membre LinkedIn sont dans ce cas.

GitHub mérite une note : la plupart des comptes gardent leur adresse privée, le
profil n'en renvoie donc aucune. Le driver lit alors `/user/emails`, préfère
l'adresse principale vérifiée, et rapporte ce que GitHub en dit. Un compte ayant
refusé `user:email` se connecte quand même — sans adresse.

## PKCE, et OAuth1

Le contrôleur ci-dessus gère déjà les deux. Seul le contenu de `secret` change.

**X en OAuth2** (`twitterX`) impose PKCE. `begin()` génère le vérificateur ;
`redirect()` refuserait de construire une URL sans lui, plutôt que d'envoyer
l'utilisateur là où X le rejettera. Seule l'empreinte du vérificateur circule
dans l'URL — le vérificateur lui-même n'est envoyé qu'une fois, à l'échange du
code, ce qui rend un code d'autorisation intercepté inutilisable pour celui qui
l'a intercepté. Générez-en un avec `createCodeVerifier()` si vous n'utilisez pas
`begin()`.

**X en OAuth1** (`twitter`) est un autre protocole, pas une variante. Sa
redirection ne peut pas être construite hors ligne : l'URL porte un jeton de
requête que seul X peut émettre, d'où l'aller-retour que `begin()` effectue. Son
callback porte un `oauth_token` et un `oauth_verifier` plutôt qu'un code, et ils
arrivent dans les mêmes arguments — le vérificateur est le code, le jeton rendu
est le state, et le comparer à celui qu'on a émis **est** le contrôle CSRF.

## Un jeton déjà en main

```ts
const user = await transit.userFromToken('google', accessToken)
```

Aucun code à échanger — pour un jeton rafraîchi, ou obtenu par un client mobile
lui-même. Un fournisseur OAuth1 réclame aussi le secret :
`userFromToken('twitter', accessToken, tokenSecret)`.

## Tester une connexion

Une connexion ne peut pas être exercée contre un vrai fournisseur dans un test,
donc Transit livre une doublure du manager.

```ts
import { TransitManager } from '@c9up/transit'
import { FakeTransit } from '@c9up/transit/testing'

const transit = new FakeTransit().willReturn('google', {
  email: 'ada@acme.test',
})
container.singleton(TransitManager, () => transit)

// ... le code testé exécute sa connexion

transit.assertSignedIn('google')
expect(transit.lastUser()?.email).toBe('ada@acme.test')
```

`willReturn` complète ce que le test ne dit pas : un test sur les rôles n'a pas
à inventer un avatar. `assertBegan`, `assertSignedIn` et `assertNobodySignedIn`
couvrent ce qui s'est passé ; `reset()` efface l'enregistrement et conserve ce
qui a été déclaré.

Elle n'est délibérément **pas** permissive. L'aller-retour du state et la valeur
que `begin()` demande de conserver sont exigés exactement comme les vrais
drivers les exigent :

```ts
const { state, secret } = await transit.begin('google')

// Un contrôleur qui a oublié de stocker le state échoue ici.
await transit.callback('google', code, state, undefined, secret)
// → requires expectedState for CSRF protection
```

Une doublure qui laisserait passer ça apprendrait aux applications à livrer un
contrôleur qui ne vérifie jamais le state — en production c'est une fixation de
session, dans un test c'est une ligne rouge.

## Les fournisseurs que vous avez déjà

Tout ce qui parle OpenID Connect n'a besoin d'aucun driver dédié — donnez
l'issuer à `oidc()` :

| Fournisseur | Issuer |
| --- | --- |
| Keycloak | `https://<hôte>/realms/<realm>` |
| Auth0 | `https://<tenant>.auth0.com` |
| Okta | `https://<tenant>.okta.com` |
| Microsoft Entra ID | `https://login.microsoftonline.com/<tenant>/v2.0` |
| Authentik | `https://<hôte>/application/o/<slug>` |
| Zitadel | `https://<instance>` |
| GitLab | `https://gitlab.com` |

Chacun publie son `/.well-known/openid-configuration`, ce dont le driver a
besoin et rien de plus. Un helper nommé n'existe que là où un fournisseur
s'écarte assez du standard pour en réclamer un.

## Un autre fournisseur

Étendez `Oauth2Driver` et vous n'écrivez que ce qui fait le fournisseur : les
trois URLs, ses scopes par défaut, et la lecture de sa charge utile.

```ts
import { Oauth2Driver, type TransitUser } from '@c9up/transit'

class GitLabDriver extends Oauth2Driver {
  protected readonly provider = 'GitLab'
  protected readonly authorizeUrl = 'https://gitlab.com/oauth/authorize'
  protected readonly accessTokenUrl = 'https://gitlab.com/oauth/token'
  protected readonly userInfoUrl = 'https://gitlab.com/api/v4/user'
  protected readonly defaultScopes = ['read_user'] as const

  protected mapUser(raw: Record<string, unknown>): TransitUser {
    return {
      id: String(raw.id ?? ''),
      email: String(raw.email ?? ''),
      name: String(raw.name ?? ''),
      avatarUrl: raw.avatar_url as string | undefined,
      raw,
    }
  }
}

export default defineConfig({
  gitlab: new GitLabDriver({ clientId, clientSecret, callbackUrl }),
})
```

Redéfinissez `tokenAuth = 'basic'` quand le fournisseur veut ses identifiants en
HTTP Basic, `requiresPkce = true` quand il impose PKCE, `authorizeParams()` et
`userInfoParams()` pour ses propres paramètres, et `fetchUser()` quand l'adresse
demande un second appel.

Pour un fournisseur OAuth1, étendez plutôt `Oauth1Driver` : quatre URLs — jeton
de requête, autorisation, jeton d'accès, profil — et le même `mapUser`. La
signature est prise en charge.

Tout ce qui répond à `redirectUrl(state, secret?)` et
`callback(code, state, expected, secret?)` fonctionne aussi, sans aucune des
deux bases. Validez l'aller-retour du state avec
`assertOAuthState(state, expected)` — il est exporté exactement pour ça, et il
échoue fermé sur une valeur attendue absente.

## Étapes suivantes

- [Warden (Auth)](/fr/modules/warden) — transformer l'utilisateur rendu en session
