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
| Endpoints | `/oauth/token`, `/oauth/revoke`, `/oauth/introspect`, `/oauth/register`*, `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`* |
| Aussi | RFC 9728 (où s'authentifier), RFC 8707 (pour quel serveur est un jeton), RFC 7591 (clients qui s'enregistrent)* |
| Retirés | `implicit` et `password` — sortis d'OAuth 2.1, et indisponibles sous n'importe quelle option |

\* monté uniquement une fois déclaré dans `config/visa.ts`.

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

Le guard se déclare à côté des autres, dans `config/auth.ts` :

```ts
import { visaGuard } from '@c9up/visa'

export default defineConfig({
  default: 'visa',
  guards: {
    visa: visaGuard({
      store: () => visa.store,
      findUser: (id) => User.find(id),
    }),
  },
})
```

L'utilisateur authentifié porte le jeton qui l'a authentifié :

```ts
const token = ctx.auth.user.currentAccessToken
token.abilities          // les scopes du jeton
token.allows('invoices.read')
token.authorize('invoices.write')   // lève E_UNAUTHORIZED_ACCESS
token.isExpired()
token.lastUsedAt
```

`findUser` est appelé à **chaque** requête, délibérément : un jeton émis pour
un compte désactivé depuis cesse de fonctionner ici, une fois pour toutes, au
lieu de là où chaque application pense à vérifier.

`createToken(user, abilities, { name, expiresInSeconds })` en frappe un
directement pour un client first-party — nommé par `tokenClientId` — et
`invalidateToken(token)` en révoque un.

La forme bas niveau reste disponible pour un serveur de ressources sans guard :

```ts
const grant = await visa.verify(bearerToken, new Date(), 'https://api.example/mcp')
if (!grant) return ctx.response.unauthorized({ error: 'invalid_token' })
```

### Dire à un client où s'authentifier (RFC 9728)

Un 401 sans rien d'autre est une impasse : l'appelant apprend qu'il lui faut un
jeton, et rien sur d'où viennent les jetons. Déclarez la ressource et le
document de métadonnées est servi :

```ts
// config/visa.ts
protectedResource: {
  resource: 'https://api.example/mcp',
  scopesSupported: ['profile'],
}
```

Puis portez le défi sur le refus :

```ts
response.header('www-authenticate', guard.challenge())
// Bearer resource_metadata="https://api.example/.well-known/oauth-protected-resource/mcp"
```

Un client MCP remonte du 401 au document puis à ce serveur tout seul.

### Lier un jeton à un seul serveur (RFC 8707)

Un jeton sans audience déclarée est un jeton pour tout. Un client qui envoie
`resource=https://api.example/mcp` en obtient un qui y est lié, et
`verify(token, now, resource)` refuse celui frappé pour ailleurs. Le endpoint
d'autorisation lie ce que l'utilisateur a vu ; un échange peut rétrécir cette
liste, jamais l'élargir. `resourcesSupported` en config transforme une
ressource inconnue en `invalid_target` au lieu de quelque chose à frapper.

Les jetons émis avant qu'un client ne se mette à demander sont non liés, et
restent acceptés partout.

## Applications connectées

Ce qu'un utilisateur a autorisé, et comment il y met fin :

```ts
const apps = await visa.listAuthorizations(userId)
// [{ clientId, name, scopes, grantedAt, lastUsedAt?, active }]

await visa.revokeAuthorization(userId, clientId)
```

Une ligne par **application**, pas par jeton : une personne a autorisé une
application une fois, et les jetons vont et viennent sous cette décision. Une
application dont tous les jetons ont expiré reste affichée, marquée inactive —
« dernier usage » compte surtout quand plus rien n'est vivant, et la masquer
dirait qu'une application n'a jamais touché aux données alors que si.

Révoquer prend les deux types de jetons puis oublie le consentement, dans cet
ordre : qui révoque en urgence veut d'abord les sessions mortes.

## Les clients qui s'enregistrent (RFC 7591)

Éteint tant que vous ne l'allumez pas. Un client MCP comme claude.ai n'a
personne pour remplir un formulaire à sa place ; un serveur sur l'internet
public avec ça ouvert laisse n'importe qui créer un client.

```ts
// config/visa.ts
registration: {
  enabled: true,
  initialAccessToken: env.get('VISA_REGISTRATION_TOKEN'),
  scopes: ['profile'],
}
```

Ce qu'un client auto-enregistré **peut être** est la décision du serveur, pas
celle de la requête : grants, scopes et méthode d'auth viennent de cette
config, l'id est choisi ici, et une redirect URI doit être en https ou en http
sur une adresse de loopback.

## Ce que `ream configure` écrit

```bash
ream configure @c9up/visa
```

Quatre choses : `VISA_ISSUER` dans `.env`, le provider dans `reamrc.ts`,
`config/visa.ts` avec un `MemoryStore` et un commentaire qui dit de le
remplacer, et la migration des cinq tables que lit le store atlas. La commande
échoue avant de toucher au projet si cette migration est illisible — un
provider enregistré et une config écrite sans tables dessous, c'est pire que
s'arrêter.

Le store et la route `/authorize` restent les tiens — ce
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
des jetons de la première.

Une application qui tourne sur atlas en a un :

```ts
import { AtlasStore } from '@c9up/visa/stores/atlas'

const store = new AtlasStore(db)
```

`ream configure @c9up/visa` écrit la migration de ses cinq tables. Il est bâti
sur le query builder et non sur du SQL texte, donc les dialectes restent le
problème d'atlas, et il prend le service `db` par une tranche structurelle de
ce qu'il appelle — visa lui-même n'importe rien.

Tout le reste implémente `VisaStore`.

Deux de ses méthodes, `consumeAuthorizationCode` et `consumeRefreshToken`,
**doivent être atomiques** : deux requêtes en course avec le même code ne
doivent pas réussir toutes les deux. C'est cette garantie d'usage unique qui
porte toute la détection de rejeu, donc un driver sur une vraie base doit dire
comment il l'obtient — le store atlas le fait en un seul UPDATE gardé sur la
colonne encore nulle, et ne lit jamais d'abord.

## Pas encore là

OpenID Connect — `id_token`, discovery, JWKS, `/userinfo`. Le `nonce` est déjà
transporté dans le code d'autorisation pour ça.
