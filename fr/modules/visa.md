# Visa

`@c9up/visa` est un serveur d'autorisation OAuth 2.1 : il délivre des jetons à
**d'autres** applications au nom d'un utilisateur.

Il n'authentifie personne — ça reste le travail de [warden](/fr/modules/warden).
Visa demande à ton application qui est connecté, et s'occupe de tout le reste.
Son image miroir est [transit](/fr/modules/transit), qui *consomme* un
fournisseur ; visa en *est* un.

Aucune dépendance : `node:crypto` seulement. Un paquet posé sur le chemin qui
frappe et compare des identifiants est un paquet qui peut les remplacer.

```bash
ream configure @c9up/visa
```

## Ce qui est implémenté

| | |
|---|---|
| Grants | `authorization_code` (PKCE obligatoire), `refresh_token`, `client_credentials` |
| Endpoints | `/oauth/token`, `/oauth/revoke`, `/oauth/introspect`, `/.well-known/oauth-authorization-server` |
| Retirés | `implicit` et `password` — sortis d'OAuth 2.1, et indisponibles sous n'importe quelle option |

`/authorize` n'est **pas** monté, et c'est une décision, pas un oubli : il lui
faut un utilisateur connecté et un écran de consentement, qui appartiennent
tous les deux à ton application. Une route qui devinerait l'un ou l'autre
serait fausse d'une manière difficile à voir — un serveur qui n'affiche aucun
écran de consentement accorde en silence.

## Les décisions, et ce que chacune empêche

- **PKCE sur tous les clients**, confidentiels compris : un code sur le canal
  avant est interceptable quel que soit celui qui l'a demandé.
- **`S256` uniquement.** `plain` met le vérifieur dans la requête
  d'autorisation : tout ce qui peut lire cette requête — un log, un referrer,
  un proxy — peut alors terminer l'échange, ce qui est précisément ce que PKCE
  existe pour empêcher. `allowPlainChallenge: true` le réactive.
- **Comparaison exacte de la redirect URI**, avec l'unique exception que la
  spec nomme (le port d'une boucle locale, une application native ne pouvant
  pas savoir quel port l'OS lui donnera). Une comparaison par préfixe, c'est
  ainsi qu'un open redirect sur le domaine du client devient un code volé.
- **Une erreur n'est jamais redirigée vers une URI non vérifiée.** Une
  `redirect_uri` invalide est montrée à l'utilisateur ; la renvoyer
  apprendrait à un attaquant que le client existe et chargerait une page de
  son choix dans la session de l'utilisateur.
- **Tout est haché au repos** — codes, jetons d'accès, jetons de
  rafraîchissement, secrets clients. Une copie de la base n'est pas un jeu
  d'identifiants fonctionnels.
- **Rotation des refresh tokens avec détection de rejeu.** Chaque usage en
  frappe un nouveau ; un jeton déjà consommé qui revient prouve une fuite, et
  comme rien ne distingue le voleur de la victime, toute la famille est
  révoquée et les deux sont déconnectés.
- **Un code d'autorisation rejoué révoque ce qu'il a acheté.** L'échange
  légitime a déjà eu lieu : les jetons en vol sont ceux de l'attaquant.
- **Une seule phrase par échec.** « code inconnu », « expiré », « déjà
  utilisé » et « mauvais client » donnent tous `invalid_grant: The code is not
  valid.` — les distinguer, c'est ainsi qu'on sonde un espace de codes.

## Câbler `/authorize`

La décision est celle de visa ; la page est la tienne.

```ts
// start/routes.ts
import visa from '@c9up/visa/services/main'

router.get('/oauth/authorize', async (ctx) => {
  const outcome = await visa.authorize(ctx.request.qs(), ctx.auth.user?.id)

  if (outcome.type === 'redirect') return ctx.response.redirect(outcome.url)
  if (outcome.type === 'error') {
    // PAS une redirection : c'est la redirect URI qui a échoué à la validation.
    return ctx.view.render('oauth/error', { error: outcome.error.toResponse() })
  }
  if (!ctx.auth.user) {
    return ctx.response.redirect(`/login?next=${encodeURIComponent(ctx.request.url(true))}`)
  }
  return ctx.view.render('oauth/consent', {
    client: outcome.request.client,
    scopes: outcome.request.scopes,
  })
})

router.post('/oauth/consent', async (ctx) => {
  const outcome = await visa.authorize(ctx.request.all(), ctx.auth.user.id)
  if (outcome.type !== 'consent') return ctx.response.redirect('/')
  const url = ctx.request.input('approve')
    ? await visa.grant(outcome.request, ctx.auth.user.id)
    : visa.deny(outcome.request)
  return ctx.response.redirect(url)
})
```

## Les clients

```ts
const { client, secret } = await visa.registerClient({
  id: 'invoices',
  name: 'Factures',
  redirectUris: ['https://invoices.example.com/callback'],
  scopes: ['profile', 'invoices:read'],
})
```

`secret` n'est renvoyé qu'une fois et n'est stocké que haché ; un client qui le
perd en reçoit un nouveau. Un client public — une SPA, une application native
— s'enregistre avec `tokenEndpointAuthMethod: 'none'`, n'a pas de secret, et ne
peut pas utiliser `client_credentials` : « le client lui-même » ne veut rien
dire quand n'importe qui peut lire son id dans un navigateur.

Le `tokenEndpointAuthMethod` qu'un client enregistre est le **seul** accepté :
un client déclaré `client_secret_basic` qui envoie son secret dans le body est
refusé, et inversement. Accepter les deux rendrait la méthode enregistrée
décorative — et le body est lisible par ce qui ne pouvait pas lire l'en-tête.

Un scope pour lequel le client n'est pas enregistré est **refusé**, jamais
silencieusement retiré — accorder moins que demandé, c'est ainsi qu'un client
finit par croire qu'il détient une permission qu'il n'a pas.

## Protéger une ressource

```ts
const grant = await visa.verify(bearerToken)
if (!grant) return ctx.response.unauthorized({ error: 'invalid_token' })
if (!grant.scopes.includes('invoices:read')) {
  return ctx.response.forbidden({ error: 'insufficient_scope' })
}
```

## Ce que `ream configure` écrit

```bash
ream configure @c9up/visa
```

Trois choses, et rien d'autre : `VISA_ISSUER` dans `.env`, le provider dans
`reamrc.ts`, et `config/visa.ts` avec un `MemoryStore` et un commentaire qui
dit de le remplacer. Le store et la route `/authorize` restent les tiens — ce
sont des décisions, pas du boilerplate, et une supposition générée pour l'un ou
l'autre est fausse d'une manière qui n'apparaît qu'en production.

Une fois le provider enregistré, le manager se résout par token et il est typé :

```ts
const visa = await container.make('visa')   // VisaManager, pas unknown
```

## Les tests

`@c9up/visa/testing` te donne le VRAI serveur sur un store mémoire, avec un
client déjà enregistré :

```ts
import { testVisa } from '@c9up/visa/testing'

const t = await testVisa({ scopes: ['profile', 'invoices:read'] })
const tokens = await t.tokensFor('user-7', 'invoices:read')

// Un test de ressource a maintenant un jeton qui se vérifie vraiment.
const grant = await t.visa.verify(tokens.access_token)
```

`tokensFor()` parcourt tout le chemin — autorisation, consentement, code,
échange — au lieu de frapper un jeton directement. Ce n'est délibérément pas un
double permissif : un helper qui accorderait tout ce qu'on lui demande
apprendrait aux applications à livrer un écran de consentement que personne n'a
jamais vu refuser, et un test qui passe contre un stub est un incident de
production avec une pastille verte.

## L'issuer

Il identifie le SERVEUR, et c'est tout ce qu'il fait. Un jeton d'accès est ici
opaque — une chaîne aléatoire sans aucune claim à l'intérieur — donc rien n'est
lié cryptographiquement à un issuer ; la seule chose qui peut répondre de ce
jeton, c'est le serveur qui l'a frappé. C'est pour ça que
`/oauth/introspect` répond avec `iss`, et que le document de métadonnées le
nomme.

Validé au démarrage et pas à la première requête : une URL, `https` (localhost
excepté), sans query string ni fragment, et le slash final retiré — chaque
endpoint est construit par concaténation, donc `https://auth.test/` produirait
sinon `https://auth.test//oauth/token`.

## Le store

`MemoryStore` est fait pour les tests et un process de développement unique :
un redémarrage déconnecte tout le monde et une deuxième instance ne voit aucun
des jetons de la première. Tout le reste implémente `VisaStore` — douze
méthodes.

Deux d'entre elles, `consumeAuthorizationCode` et `consumeRefreshToken`,
**doivent être atomiques** : deux requêtes en course avec le même code ne
doivent pas réussir toutes les deux. C'est cette garantie d'usage unique qui
porte toute la détection de rejeu, donc un driver sur une vraie base doit dire
comment il l'obtient.

## Pas encore là

OpenID Connect — `id_token`, discovery, JWKS, `/userinfo`. Le `nonce` est déjà
transporté dans le code d'autorisation pour ça.
