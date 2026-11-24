# Protection CSRF

Ce guide couvre la protection contre la falsification de requêtes entre sites :

- Protection CSRF
- Options CSRF

## Protection CSRF

Validation **double-submit cookie signé** sans état (HMAC-SHA256). Le cookie `XSRF-TOKEN` porte `<random>.<HMAC(secret, random)>`. Une requête qui modifie l'état (`POST`, `PUT`, `PATCH`, `DELETE`) doit renvoyer ce token exact **et** le token doit porter une signature valide. Aucun store côté serveur, donc ça scale horizontalement — chaque instance a juste besoin du même `secret`.

La signature est ce qui en fait un double-submit *signé* (la forme recommandée par l'OWASP) : un double-submit naïf accepte n'importe quelle paire auto-cohérente, donc un attaquant capable de poser un cookie `XSRF-TOKEN` (un sous-domaine frère, un MITM sur un frère HTTP) pourrait en forger un. Un token signé ne peut pas être forgé sans le secret.

**Lié à la session.** Sous le middleware Ream, avec le middleware de session
inscrit avant celui de blackhole, la signature couvre aussi un secret propre à
la session (`csrf-secret`, gardé dans la session) : un token émis pour une
session est refusé pour toute autre, et meurt avec sa session. Le secret est
remplacé chaque fois que la session est régénérée — au login et au logout — :
un token émis avant l'un ou l'autre est refusé après, et la réponse en porte un
nouveau. Les adaptateurs autonomes n'ont pas de session : le token y est signé
mais lié à rien, et c'est le contrôle de l'origine ci-dessous qui arrête un
token rejoué.

`csrf.session` rend le lien obligatoire : une requête qui atteint le contrôle
sans session est refusée avec `E_BLACKHOLE_SESSION_NOT_READY` (500). Le
provider Ream l'active quand l'application a une config de session ; posez
`csrf: { session: false }` pour une application dont les routes protégées par
CSRF tournent sans.

::: warning Nécessite un secret (breaking)
Quand le CSRF est activé, un `secret` est **obligatoire**. `createBlackhole({ csrf: true })` sans secret **throw** — il n'y a aucun fallback silencieux vers un token non signé. Passez `secret: env.get('APP_KEY')` dans `config/blackhole.ts` (le provider retombe aussi sur `process.env.APP_KEY`). `secret` prend une chaîne ou un `Secret`, comme celui que renvoie `Env.schema.secret()` : il est libéré une seule fois, à la construction du filtre, et la config le garde enveloppé. Le secret doit être une valeur stable à haute entropie (utilisez votre `APP_KEY`) et **partagée entre les instances** — un token signé par une instance doit se vérifier sur une autre.
:::

### Fonctionnement

1. **Amorçage** — À chaque requête le middleware s'assure qu'un cookie `XSRF-TOKEN` existe (en générant `<random>.<HMAC>` avec du CSPRNG via `getrandom` s'il est absent), le pose sur la réponse — le token que le client détient repart inchangé, si bien qu'un client incapable de lire son magasin de cookies (une app sur un téléphone) l'apprend de n'importe quelle réponse — et publie le token dans `ctx.request.csrfToken` et dans `ctx.store` (`csrfToken`) pour le templating.
2. **Soumission** — Sur une requête non sûre, le client renvoie le même token, via **l'un** de :
   - le header `X-XSRF-TOKEN` (Axios / Angular `HttpClient` lisent le cookie automatiquement),
   - le header `X-CSRF-TOKEN` (clients SPA manuels),
   - le champ de formulaire `_csrf` (formulaires rendus côté serveur — voir `csrfField()` ci-dessous).
3. **Validation** — Le token soumis doit égaler le cookie (temps constant) **et** porter une signature HMAC valide sous le secret. Une non-correspondance, une valeur forgée/non signée, ou un token manquant est rejeté avec `403 E_BAD_CSRF_TOKEN`.

```
POST /orders                                       → 403 E_BAD_CSRF_TOKEN (pas de token)
POST /orders  cookie: XSRF-TOKEN=a1b2.SIG
              X-XSRF-TOKEN: a1b2.SIG               → 200 OK
POST /orders  cookie: XSRF-TOKEN=a1b2.SIG  X-XSRF-TOKEN: ZZZ      → 403 E_BAD_CSRF_TOKEN
POST /orders  cookie: XSRF-TOKEN=forged   X-XSRF-TOKEN: forged    → 403 E_BAD_CSRF_TOKEN (pas de signature valide)
```

### Contrôle de l'origine

Avant le token, une requête protégée qui porte un `Origin` (ou, à défaut, un
`Referer`) doit venir de la même origine — le même hôte **et le même schéma**
que la requête — ou de l'une des `csrf.trustedOrigins`. Une page servie en
`http://app.test` est une autre origine que `https://app.test` : c'est ce que
contrôle un MITM, elle est donc refusée avec
`403 E_BLACKHOLE_CSRF_ORIGIN_MISMATCH`, même avec un token valide. Le schéma est
celui que le framework hôte a résolu (`request.protocol()` de Ream,
`req.protocol` d'Express, `request.protocol` de Fastify, chacun selon son
réglage de proxy de confiance), tout comme l'hôte (`request.host()` de Ream,
`req.hostname` d'Express, `request.host` de Fastify ; l'option `host` de Hono)
— derrière un proxy qui réécrit `Host`, c'est l'hôte transmis qui est comparé,
pas le nom amont. Une origine de confiance écrite avec un schéma ne correspond
qu'à ce schéma ; sans schéma, à tous. Un `Origin` vide compte comme absent, et
le `Referer` est contrôlé. Une requête sans aucun des deux en-têtes — un client
hors navigateur — passe au contrôle du token. Les deux contrôles dépendent de
l'interrupteur `csrf`.

### Configuration

```ts
// config/blackhole.ts
import env from '#start/env'
import { defineConfig } from '@c9up/blackhole'

export default defineConfig({
  secret: env.get('APP_KEY'),                   // clé HMAC (chaîne ou Secret) — OBLIGATOIRE quand csrf est actif
  csrf: {
    exceptRoutes: ['/webhooks/:provider', '/api/hooks/*'], // motifs de route, ou chemins
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'], // verbes protégés (défaut affiché)
    cookie: { sameSite: 'lax' },                 // attributs du cookie XSRF-TOKEN
  },
})
```

`csrf: true` / `csrf: false` est un raccourci pour activer/désactiver avec les défauts. `GET`, `HEAD` et `OPTIONS` ne sont jamais protégés.

**Méthode surchargée.** Le contrôle regarde la méthode de la ligne de requête,
pas seulement celle qu'annonce un champ `_method` ou un middleware de
surcharge. Une requête est contrôlée dès que l'une des deux figure dans
`methods`. Un `POST` dont le corps dit `_method=GET` reste un `POST` pour le
contrôle : il lui faut un token valide. Un `POST ?_method=DELETE` est contrôlé
aussi, même quand `methods` ne liste que `DELETE`. Sur Ream, la méthode de la
ligne de requête est `request.intended()` ; sur Express, `req.originalMethod`
(posé par `method-override`) ; sur Fastify, `request.raw.method` ; sur Hono,
la méthode reçue par `@hono/node-server`.

**Une valeur `_csrf` qui n'est pas un texte valide.** Un champ `_csrf` qui
contient une moitié de paire UTF-16 isolée compte comme un token absent : une
requête contrôlée est refusée en `403 E_BAD_CSRF_TOKEN`, les autres passent.
Avec `csrf: false`, le corps n'est pas lu du tout.

**Attributs du cookie.** Le cookie `XSRF-TOKEN` est désormais `Secure` par défaut en production (`NODE_ENV === 'production'`) — pas besoin de le poser à la main. Il n'est volontairement **pas** `httpOnly` : le flux double-submit a besoin que le JS du navigateur lise le cookie et le renvoie en `X-XSRF-TOKEN`. Mettre `cookie: { httpOnly: true }` rend le cookie illisible et tout POST non-formulaire fera `403` — blackhole log un avertissement si vous le faites. Ne l'activez que pour une app entièrement rendue côté serveur qui soumet exclusivement via le champ `_csrf`.

> Les routes Bearer/JWT sont immunisées contre le CSRF (le navigateur ne peut pas attacher un header `Authorization` cross-site) : listez vos préfixes d'API token-authed dans `exceptRoutes` et réservez le CSRF aux routes cookie/session.

### Helpers de templating

Les formulaires rendus et les SPA lisent le token via les helpers `@c9up/inker` :

- `{{ csrfField() }}` → `<input type="hidden" name="_csrf" value="…">`
- `{{ csrfMeta() }}` → `<meta name="csrf-token" content="…">` (pour les clients AJAX)

Dans un contrôleur, le token brut est `ctx.request.csrfToken`.

### Signal de fermeture stricte — `request.csrfProtected`

Le middleware publie aussi `ctx.request.csrfProtected : boolean` — `true` **uniquement** lorsque le CSRF était activé, la méthode gardée, la route non exceptée, **et** le token validé. C'est la réponse fiable à « cette requête a-t-elle été vérifiée CSRF ? ». Contrairement à `csrfToken` (semé sur chaque requête qui passe, même un `GET`, une route `csrf: false` ou un chemin excepté), un consommateur qui doit **fermer strictement** — refuser de muter tant que le CSRF n'a pas été réellement appliqué — lit ce flag, jamais la simple présence d'un token :

```ts
if (ctx.request.csrfProtected !== true) {
  // blackhole non câblé, csrf: false, ou route exceptée → refus
  return ctx.response.status(403).send('CSRF requis')
}
```

`@c9up/station` utilise exactement cela pour fermer strictement chaque route d'écriture admin.

## Options CSRF

```ts
csrf: {
  enabled: true,
  enableXsrfCookie: true,                                    // défaut
  exceptRoutes: (ctx) => ctx.request.url().startsWith('/webhooks/'), // ou une liste
  cookieOptions: { sameSite: 'lax' },                        // `cookie` marche aussi
}
```

- **`enableXsrfCookie`** commande le cookie lisible `XSRF-TOKEN`. Une app
  entièrement rendue serveur envoie le jeton dans le champ `_csrf` et n'en a pas
  l'usage — et un cookie qu'on ne pose pas est une chose de moins à fuir. Le
  jeton reste disponible pour le champ de formulaire.
- **`exceptRoutes`** accepte une liste ou un prédicat. Une entrée correspond au
  motif de la route trouvée (`'/webhooks/:provider'`) sous Ream et Fastify, et
  au chemin de la requête — exactement, ou par préfixe avec un `*` final — sur
  tous les adaptateurs (Express et Hono n'ont pas encore de route à ce stade).
  Le prédicat reçoit le contexte de la requête : le contexte HTTP lui-même sous
  Ream ; sur les adaptateurs autonomes,
  `{ request: { method(), url(), header() }, route }`.
- **`cookieOptions`** et `cookie` sont deux noms pour la même option.

### Rejet

Un token refusé répond `403 E_BAD_CSRF_TOKEN`. Sous Ream, le middleware lève
`errors.E_BAD_CSRF_TOKEN` et le gestionnaire d'exceptions la rend à l'intérieur
de la chaîne de middlewares, si bien que la session enregistre toujours le
flash ; votre gestionnaire d'exceptions peut l'intercepter ou la personnaliser
(il faut `@c9up/ream` 0.2.32 ou plus récent). L'erreur se rend elle-même : un
formulaire de navigateur (`Accept: text/html`) est redirigé en arrière avec les champs du
formulaire (sauf `_csrf`, `_method` et les mots de passe) et le message en
flash ; une visite Inertia (`X-Inertia`) reçoit la même redirection sans
re-flasher les champs ; un client JSON reçoit le corps JSON. Quand le contexte a
un `i18n`, le message est traduit sous `errors.E_BAD_CSRF_TOKEN`.
