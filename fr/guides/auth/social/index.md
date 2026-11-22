# Introduction

Ce guide couvre la connexion par un autre fournisseur d'identité :

- Installation
- Configuration
- L'aller-retour
- Ce qui revient
- Un jeton déjà en main

Transit, c'est l'endroit où une personne prouve qui elle est via une autorité
que votre application ne possède pas : SAML 2.0, OpenID Connect, Sign in with
Apple, OAuth1 et OAuth2, et les annuaires qui répondent en LDAP.

Tout est écrit ici, sans aucune dépendance à aucune couche — jusqu'au lecteur
XML sur lequel une signature est canonicalisée, et au BER dans lequel un
annuaire est interrogé.

C'est un paquet à part plutôt qu'un coin de [Warden](/fr/guides/auth/introduction) parce
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

| Point d'entrée | |
| --- | --- |
| `@c9up/transit` | toute l'API |
| `@c9up/transit/config` | `defineConfig`, `socials`, `oidc`, `saml`, `ldap` |
| `@c9up/transit/provider` | le provider Ream |
| `@c9up/transit/services/main` | le manager, depuis n'importe où |
| `@c9up/transit/testing` | `FakeTransit` |

## Configuration

```ts
// config/transit.ts
import { defineConfig, ldap, oidc, saml, socials } from '@c9up/transit'

export default defineConfig({
  google: socials.google({
    clientId: env.get('GOOGLE_CLIENT_ID'),
    clientSecret: env.get('GOOGLE_CLIENT_SECRET'),
    callbackUrl: 'https://acme.test/auth/google/callback',
  }),
  work: oidc({ issuer: 'https://id.acme.com', /* ... */ }),
  corp: saml({ issuer: 'https://idp.acme.test/metadata', /* ... */ }),
  staff: ldap({ url: 'ldaps://directory.acme.test', /* ... */ }),
})
```

Chaque protocole vit dans la même table, et chacun a sa section plus bas.

Les clés sont les vôtres. Deux entrées peuvent atteindre le même fournisseur
avec des identifiants différents — une connexion `staff` et une `customers`,
toutes deux sur Google — et `use(name)` demande la clé, pas le fournisseur.

Le manager est enregistré sous `TransitManager` et sous l'alias `"transit"`, et
joignable de partout via l'accesseur de service.

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

`begin()` est le chemin pour tout fournisseur vers lequel un navigateur est
envoyé — OAuth2, OAuth1, OpenID Connect, Apple, SAML. Il génère le state,
effectue l'aller-retour préalable que le protocole exige, et rend ce qui doit
survivre jusqu'au retour de l'utilisateur.

`secret` est ce qui change, et l'appelant n'a jamais à savoir lequel :

| | |
| --- | --- |
| OAuth2 simple | `undefined` |
| OAuth2 avec PKCE | le vérificateur |
| OpenID Connect | le vérificateur et le nonce |
| OAuth1 | le secret du jeton de requête |
| SAML | l'identifiant de requête auquel la réponse doit répondre |

Le stocker et le rendre sans condition permet à un seul contrôleur de tous les
servir. Un annuaire fait exception, puisque rien n'est redirigé — voir
[LDAP](/fr/guides/auth/social/ldap#ldap-et-active-directory).

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

## Un jeton déjà en main

```ts
const user = await transit.userFromToken('google', accessToken)
```

Aucun code à échanger — pour un jeton rafraîchi, ou obtenu par un client mobile
lui-même. Un fournisseur OAuth1 réclame aussi le secret :
`userFromToken('twitter', accessToken, tokenSecret)`.

## Étapes suivantes
- [Warden (Auth)](/fr/guides/auth/introduction) — transformer l'utilisateur rendu en session
- [Quasar (Redis)](/fr/guides/database/redis) — la connexion qu'un store d'anti-rejeu nomme
