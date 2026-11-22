# Introduction

Ce guide couvre le serveur OAuth 2.1 :

- Ce qui est implémenté
- Les décisions, et ce que chacune empêche
- Ce que `ream configure` écrit
- Pas encore là

`@c9up/visa` est un serveur d'autorisation OAuth 2.1 : il délivre des jetons à
**d'autres** applications au nom d'un utilisateur.

Il n'authentifie personne — ça reste le travail de [warden](/fr/guides/auth/introduction).
Visa demande à ton application qui est connecté, et s'occupe de tout le reste.
Son image miroir est [transit](/fr/guides/auth/social/), qui *consomme* un
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
- **Les paramètres dans le corps uniquement.** `/oauth/token`,
  `/oauth/introspect`, `/oauth/revoke` et `/oauth/register` ne lisent que le
  corps de la requête, et répondent `invalid_request` à une requête qui place
  un paramètre OAuth (`client_secret`, `code`, `token`, `refresh_token`, les
  métadonnées d'enregistrement sur `/oauth/register`…) dans la query string :
  un secret, un code ou un jeton dans une URL finit dans les logs d'accès, les
  proxys et les traces. Les autres paramètres de query sont ignorés.
- **Un scope n'est pas une permission.** Voir
  [Protéger une ressource](/fr/guides/oauth-server/resources#proteger-une-ressource).
- **Une seule phrase par échec.** « code inconnu », « expiré », « déjà
  utilisé » et « mauvais client » donnent tous `invalid_grant: The code is not
  valid.` — les distinguer, c'est ainsi qu'on sonde un espace de codes.

### Durées de vie

Combien de temps un identifiant qui a fuité reste utilisable est une affaire de
configuration, en secondes :

| Clé | Défaut | Ce qu'elle borne |
|---|---|---|
| `accessTokenTtlSeconds` | `3600` (une heure) | Un jeton d'accès, et l'`expires_in` de la réponse. `ream configure` l'écrit explicitement. |
| `refreshTokenTtlSeconds` | `2592000` (30 jours) | Un refresh token. La rotation en frappe un nouveau à chaque usage. |
| `codeTtlSeconds` | `30` | Un code d'autorisation : il s'échange en quelques millisecondes. |
| `issueRefreshTokens` | `true` | Si des refresh tokens existent tout court. À `false`, chaque session se termine avec son jeton d'accès. |

Un refresh token n'est émis qu'à un client dont les `grantTypes` contiennent
`refresh_token`, et jamais sur le grant `client_credentials`, où aucun
utilisateur n'a consenti à quoi que ce soit.

## Ce que `ream configure` écrit

```bash
ream configure @c9up/visa
```

Quatre choses : `VISA_ISSUER` dans `.env`, le provider dans `reamrc.ts`,
`config/visa.ts` avec un `MemoryStore` et un commentaire qui dit de le
remplacer, et les migrations des cinq tables que lit le store atlas —
`9000_create_visa_tables` et `9001_add_visa_client_secret_expiry`. Une
migration déjà présente dans le projet est laissée telle quelle. La commande
échoue avant de toucher au projet si ces migrations sont illisibles — un
provider enregistré et une config écrite sans tables dessous, c'est pire que
s'arrêter.

Le store et la route `/authorize` restent les tiens — ce
sont des décisions, pas du boilerplate, et une supposition générée pour l'un ou
l'autre est fausse d'une manière qui n'apparaît qu'en production.

Une fois le provider enregistré, le manager se résout par token et il est typé :

```ts
const visa = await container.make('visa')   // VisaManager, pas unknown
```

## Pas encore là

OpenID Connect — `id_token`, discovery, JWKS, `/userinfo`. Le `nonce` est déjà
transporté dans le code d'autorisation pour ça.
