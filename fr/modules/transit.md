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
