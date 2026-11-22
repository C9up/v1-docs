# Client HTTP

Ce guide couvre les requêtes HTTP sortantes.

## HTTP sortant

`@c9up/ream/http-client` appelle des URL que le serveur ne maîtrise pas
entièrement — le domaine d'un client, la cible d'un webhook — sans les laisser
diriger le serveur vers son propre réseau.

```ts
import { HttpClient } from '@c9up/ream/http-client'

const http = new HttpClient({ userAgent: 'my-app/1.0', timeout: 5000 })
const response = await http.get(`https://${site.domain}/api/posts`)
if (response.ok) render(response.json())
```

Seules les adresses publiques sont atteintes. Le contrôle a lieu à la connexion
du socket, dans la résolution DNS propre au client : un nom qui résout vers
`10.0.0.5`, `127.0.0.1` ou `169.254.169.254` — ou dont la réponse DNS change
après un premier contrôle — est refusé. Une adresse écrite dans l'URL est
contrôlée à chaque redirection.

| Option | Défaut | |
| --- | --- | --- |
| `timeout` | `10000` | Un seul délai en ms pour tout l'échange, redirections comprises. |
| `maxResponseBytes` | 5 Mio | Un corps plus gros échoue, annoncé ou reçu en flux. |
| `maxRedirects` | `3` | `0` renvoie la réponse 3xx elle-même. |
| `crossHostRedirects` | `false` | Suivre une redirection vers un autre hôte ; les identifiants sont retirés au passage. |
| `userAgent` | `@c9up/ream` | |
| `headers` | aucun | Envoyés avec chaque requête. |
| `allowHosts` | aucun | `host` ou `host:port` exemptés de la règle d'adresse, par exemple `localhost:4399` en développement. |

Une redirection de https vers http est refusée. Chaque échec est une
`HttpClientError` (une `ReamError`) avec une `reason` et un code : `invalidUrl`
(`E_HTTP_CLIENT_INVALID_URL`), `privateAddress` (`E_HTTP_CLIENT_PRIVATE_ADDRESS`),
`unreachable` (`E_HTTP_CLIENT_UNREACHABLE`), `timedOut`
(`E_HTTP_CLIENT_TIMED_OUT`), `tooLarge` (`E_HTTP_CLIENT_TOO_LARGE`) et `redirect`
(`E_HTTP_CLIENT_REDIRECT_REFUSED`). Un statut hors 2xx est une réponse, pas une
erreur.

En test, `fakeHttp()` renvoie un client dont le transport est remplacé par des
réponses préparées ; les règles d'URL, d'adresse, de taille et de redirection
s'appliquent toujours.

```ts
import { fakeHttp } from '@c9up/ream/http-client'

const http = fakeHttp()
http.on('GET', 'https://cms.example.com/api/posts', { json: [{ id: 1 }] })
await new CmsReader(http).posts()
expect(http.requests).toHaveLength(1)
```
