# OpenID Connect

Ce guide couvre OpenID Connect :

- Ce qui est vérifié
- Les clés, et quand elles sont relues
- Les fournisseurs qui n'ont besoin d'aucun driver

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
configurer, et rien à changer quand il fait tourner une clé. Le contrôleur est celui ci-dessus, inchangé.

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
| `iss` | Identique, octet pour octet, à l'issuer configuré — auquel le champ `issuer` du document de découverte doit lui aussi correspondre. |
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

L'issuer est gardé exactement tel qu'il est écrit : aucune barre oblique finale
n'est ajoutée ni retirée avant de le comparer au champ `issuer` du document de
découverte et au `iss` de chaque token. Écrivez-le comme le fournisseur l'écrit
— celui d'Auth0 se termine par une barre oblique (`https://tenant.auth0.com/`),
et l'omettre fait échouer toutes les connexions. Seule l'URL well-known est
construite sans elle.

L'issuer doit être une URL `https`. Tout ce à quoi une connexion se fie est lu
chez lui : les endpoints, puis les clés qui vérifient le token. En HTTP simple,
quiconque se trouve entre votre serveur et le fournisseur peut répondre à sa
place, publier sa propre clé et signer un token pour n'importe quel
utilisateur. Un issuer qui n'est pas en `https` lève `E_TRANSIT_INSECURE_ISSUER`
à la construction du driver : l'application ne démarre pas. Les endpoints
donnés par le document de découverte (`authorization_endpoint`,
`token_endpoint`, `jwks_uri`, `userinfo_endpoint`) doivent aussi être en
`https`, sinon la connexion échoue avec `E_TRANSIT_INVALID_DISCOVERY`.

`http://localhost` est la seule exception, pour un fournisseur que vous lancez
sur votre propre machine. Son document de découverte peut alors donner des
endpoints en `http://localhost`.

### Les clés, et quand elles sont relues

Le document de découverte et les clés de signature sont chacun mis en cache une
heure (`cache.ttlMs`). Passé ce délai, ils sont relus avant d'être utilisés.

Pour les clés, c'est ce qui rend un retrait effectif. Un fournisseur révoque
une clé compromise en cessant de la publier. Une clé qui n'est plus publiée
cesse de vérifier des tokens en moins de `ttlMs`, sans redémarrage. Si les clés
ne peuvent pas être relues une fois le délai passé, la connexion échoue avec
`E_TRANSIT_JWKS_FAILED` : un ancien jeu de clés n'est pas utilisé au motif que
c'est le seul disponible.

Pendant cette heure, un token qui nomme une clé absente déclenche une
relecture : c'est ainsi qu'une rotation est captée tout de suite. Cette
relecture est limitée à une fois toutes les cinq minutes
(`cache.minRefetchMs`), pour qu'un flot de tokens nommant des clés inventées ne
transforme pas votre application en générateur de charge contre le fournisseur.

```ts
oidc({ ...config, cache: { ttlMs: 15 * 60_000 } })   // une clé retirée reste acceptée 15 minutes au plus
```

### Les fournisseurs qui n'ont besoin d'aucun driver

Tout ce qui parle OpenID Connect n'a besoin d'aucun driver dédié — donnez
l'issuer à `oidc()` :

| Fournisseur | Issuer |
| --- | --- |
| Keycloak | `https://<hôte>/realms/<realm>` |
| Auth0 | `https://<tenant>.auth0.com/` (avec la barre oblique) |
| Okta | `https://<tenant>.okta.com` |
| Microsoft Entra ID | `https://login.microsoftonline.com/<tenant>/v2.0` |
| Authentik | `https://<hôte>/application/o/<slug>` |
| Zitadel | `https://<instance>` |
| GitLab | `https://gitlab.com` |

Chacun publie son `/.well-known/openid-configuration`, ce dont le driver a
besoin et rien de plus. Un helper nommé n'existe que là où un fournisseur
s'écarte assez du standard pour en réclamer un.
