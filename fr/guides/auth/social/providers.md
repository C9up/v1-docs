# Fournisseurs

Ce guide couvre les fournisseurs OAuth :

- Les fournisseurs
- PKCE, et OAuth1
- Sign in with Apple

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

Les deux peuvent changer le temps d'une redirection : `begin()` et `redirect()`
prennent un callback qui reçoit un `AuthorizeRequest`, parti des scopes et
paramètres configurés — pour ne demander un scope que quand une fonctionnalité
en a besoin, ou passer un `login_hint` à une seule connexion :

```ts
const { url, state, secret } = await transit.begin('github', (request) => {
  request.mergeScopes(['repo']).param('prompt', 'consent')
})
// avec votre propre state : transit.begin('github', state, (request) => …)
// hors ligne : transit.redirect('github', state, secret, (request) => …)
```

`scopes()` remplace, `mergeScopes()` ajoute, `clearScopes()` vide (un
fournisseur OpenID Connect reçoit tout de même `openid`), `transformScopes()`
réécrit ce que les deux suivantes reçoivent ; `param()` et `clearParam()`
posent et retirent des paramètres, `getScopes()` / `getParams()` les relisent.
Ce sur quoi repose la sécurité du flux — `state`, `nonce`, `code_challenge`,
`code_challenge_method`, `client_id`, `redirect_uri`, `response_type` — ne
peut être ni posé ni retiré là (`E_TRANSIT_PROTECTED_PARAMETER`), ni via
`authorizeParams` ; les scopes passent par les méthodes de scope. Les
fournisseurs OAuth1 et SAML refusent un callback plutôt que de l'ignorer.
`FakeTransit` note ce que le callback a demandé dans `begun[i].authorize`.

Deux entrées LinkedIn parce que LinkedIn a deux flux. **Une application récente
veut `linkedinOpenidConnect`** — LinkedIn n'accorde plus `r_liteprofile` aux
nouvelles applications. `linkedin` est l'API membre, pour une application qui
détient déjà ces scopes ; elle lit l'adresse sur un second endpoint.

Deux entrées X pour la même raison : deux protocoles. Une application récente
veut `twitterX` ; `twitter` est le seul dont l'appel profil renvoie l'adresse.

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
// { name: 'Ada Lovelace' } — ou undefined
```

Stockez-le quand il est là. `undefined` est le cas normal d'un utilisateur qui
revient, pas une erreur.

Seul le nom est lu dans ce champ. Il contient aussi un `email`, mais le champ
est une simple donnée de formulaire, signée par rien : la personne qui se
connecte peut y mettre n'importe quelle adresse avant que le navigateur ne
l'envoie, et son id_token reste valide. L'adresse est le `user.email` du
callback — celle de l'id_token, avec `emailVerificationState` — jamais celle de
ce champ.

L'adresse peut être un relais privé (`is_private_email` dans `user.raw`), qui
fait suivre et que la personne peut couper à tout moment. Apple envoie ses
booléens sous forme de chaînes `"true"` / `"false"` ; le driver les lit, donc
`emailVerificationState` vaut bien `verified` quand Apple l'affirme.
