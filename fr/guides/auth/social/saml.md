# SAML 2.0

Ce guide couvre SAML 2.0 :

- Ce qui est vérifié
- Le rejeu, et une deuxième réplique
- L'email affirmé
- Les attributs

## SAML 2.0

Les annuaires d'entreprise — Okta, Entra ID, ADFS, OneLogin, Shibboleth.

```ts
import { defineConfig, saml, replayStores } from '@c9up/transit'

export default defineConfig({
  corp: saml({
    entityId: 'https://acme.test/saml',            // qui est cette application
    callbackUrl: 'https://acme.test/saml/acs',     // où la réponse atterrit
    issuer: 'https://idp.acme.test/metadata',      // qui est le fournisseur
    signOnUrl: 'https://idp.acme.test/sso',
    certificates: [env.get('IDP_CERTIFICATE')],
    replayStore: replayStores.redis({ connection: 'main' }),
  }),
})
```

`certificates` vient des métadonnées du fournisseur et de nulle part ailleurs.
Plusieurs sont acceptés, pour préparer une rotation de clé **avant** qu'elle
arrive plutôt que pendant la panne. Un driver sans aucun refuse d'exister, au
démarrage et non à la première connexion.

**Le callback est un POST**, comme celui d'Apple : le fournisseur poste un
formulaire portant `SAMLResponse` et `RelayState`. Ce sont le `code` et le
`state`, et l'identifiant de requête rendu par `begin()` est le `secret` — le
même contrôleur que partout ailleurs.

```ts
const { url, state, secret } = await transit.begin('corp')
ctx.session.put('transit_state', state)
ctx.session.put('transit_secret', secret)
return ctx.response.redirect(url)

// ... et sur la route ACS, en POST
const { user } = await transit.callback(
  'corp',
  ctx.request.input('SAMLResponse'),
  ctx.request.input('RelayState'),
  ctx.session.pull('transit_state'),
  ctx.session.pull('transit_secret'),
)
```

### Ce qui est vérifié

Une signature valide dit que le fournisseur a écrit ceci. Elle ne dit rien sur
le fait que la déclaration soit destinée à **cette** application, à **ce**
moment, en réponse à **cette** requête — et une réponse authentique mais aucune
de ces trois choses, c'est exactement à quoi ressemble un rejeu ou une connexion
détournée.

| | |
| --- | --- |
| Signature | Contre le certificat des métadonnées, sur l'assertion, avant toute autre lecture. |
| Wrapping | L'élément que la signature couvre est celui qui est lu. Rien n'est recherché dans le document après coup. |
| Issuer | Le fournisseur nommé par la config. |
| Audience | L'entity id de cette application. |
| Recipient | L'URL à laquelle cette application répond. |
| `InResponseTo` | La requête que cette connexion a émise. |
| Fenêtres | Celle de l'assertion et celle de la confirmation bearer, à une minute de dérive près. |
| Rejeu | L'identifiant d'assertion, mémorisé tant que l'assertion pourrait encore être acceptée. |

Les absences sont refusées aussi fermement que les écarts : une assertion qui
ne restreint aucune audience ne dit pas à qui elle s'adresse, une sans expiration
ne cesse jamais d'être utilisable, et une qui répond à une requête que cette
application n'a jamais émise a été obtenue ailleurs.

SHA-1 est refusé, pour les signatures comme pour les empreintes. Les
transformations XPath et XSLT sont refusées — l'une peut déplacer ce que
l'empreinte couvre, l'autre est exécutable.

Une réponse peut être signée sur l'assertion, sur la réponse, ou sur les deux
(le réglage « signer la réponse et l'assertion » d'Entra ID, Okta, Keycloak ou
ADFS). Signée sur les deux, c'est la signature propre de la réponse — celle
enveloppée dans `<samlp:Response>`, qui couvre tout ce qu'elle contient — qui
est vérifiée, et l'unique assertion est lue dans l'élément qu'elle couvre. Toute
autre forme à plusieurs signatures (deux sur la réponse, plusieurs à
l'intérieur sans aucune sur elle) est refusée.

### Le rejeu, et une deuxième réplique

Une assertion est un jeton porteur : capturée une fois et repostée, elle est
valide les deux fois, et aucune condition ne l'en empêche. Son identifiant est
donc mémorisé jusqu'à ce que l'assertion cesse d'être acceptée : sa dernière
échéance — le `NotOnOrAfter` de l'assertion ou celui de la confirmation bearer,
le plus tardif des deux — plus `clockSkewSeconds` (60 par défaut), puisque c'est
avec cette dérive qu'elle a été acceptée. Une assertion validée porte cet
instant dans `rememberUntil`, et c'est jusqu'à lui qu'un store d'anti-rejeu doit
retenir l'identifiant. Le store Redis garde la clé une minute de plus encore,
pour l'écart d'horloge entre la réplique qui l'a stockée et celle où arrive le
rejeu.

Le store en processus mémorise dans la mémoire du processus, ce qui accepte la
même assertion **une fois par réplique**. En production (`NODE_ENV` vaut
`production` ou `prod`), le driver refuse donc de le choisir à votre place : un
fournisseur SAML sans `replayStore` lève à la construction du driver, et
l'application ne démarre pas. Dites quel store vous voulez :

```ts
replayStore: replayStores.redis({ connection: 'main' })  // partagé entre répliques
replayStore: replayStores.memory()                       // un seul processus, délibérément
```

Hors production, le store en processus reste le défaut : un processus de
développement unique est le cas pour lequel il est juste.

Le store Redis échoue fermé tant que Redis est indisponible (l'assertion est
refusée), et se rétablit tout seul à son retour : ni une résolution échouée ni
une connexion retirée par quasar (statut `end`) n'est gardée : la prochaine
connexion SAML redemande la connexion Redis.

### L'email affirmé

Qui administre un fournisseur SAML peut affirmer n'importe quelle adresse pour
n'importe quel utilisateur. Une adresse lue dans une assertion est donc
rapportée `unsupported` par défaut, et seule la config peut dire que le
fournisseur fait autorité sur elle :

```ts
saml({ ...config, trustEmail: true })                     // votre propre fournisseur : toute adresse est vérifiée
saml({ ...config, trustedEmailDomains: ['acme.test'] })   // celui d'un client : les adresses acme.test sont vérifiées, les autres non
```

`trustedEmailDomains` se compare sans tenir compte de la casse à ce qui suit le
dernier `@` de l'adresse, exactement — un sous-domaine se liste à part. Poser
les deux options, ou lister autre chose qu'un domaine (`ada@acme.test`, une
chaîne vide), est refusé à la construction du driver. `trustEmail` ne convient
qu'à un fournisseur qui répond de toutes les adresses qu'il peut affirmer :
avec le fournisseur d'un client, il livre à ce client chaque compte que votre
application rattache par email.

### Les attributs

`user.raw.attributes` porte tous les attributs, valeurs conservées en liste :
les attributs SAML sont multivalués et les aplatir perd les appartenances de
groupe. L'email, le nom et le pseudo sont lus depuis les noms que les
fournisseurs emploient d'habitude ; `claims` les nomme quand un fournisseur
invente les siens :

```ts
saml({ ...config, claims: { email: 'urn:acme:mail' } })
```
