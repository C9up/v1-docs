# Connexion, CSRF et audit

Ce guide couvre la connexion, le CSRF et la piste d'audit :

- Connexion, cookie de session et déconnexion
- Application du CSRF (fermeture stricte)
- Journal d'audit

## Connexion, cookie de session et déconnexion

La connexion, le verrou de l'admin et la déconnexion passent par un seul guard
Warden : `station.guard`, ou le guard par défaut du manager d'auth quand il
n'est pas défini. Station garde dans son cookie le jeton bearer qu'émet le
guard : le guard doit donc en émettre un (le guard JWT de Warden). Le boot
refuse un nom de guard inconnu, ou un guard sans `signToken` comme le guard
session de Warden, avec un message qui renvoie à `station.guard`.

```ts
export default defineConfig({
  guard: "jwt", // le guard par défaut de l'application peut rester `web` (session)
});
```

### Connexions refusées

Un `POST /admin/login` refusé affiche la page de connexion avec un message
fixe — jamais le texte d'erreur du backend d'auth. Un appelant JSON (`Accept:
application/json`) ou XHR (`X-Requested-With: XMLHttpRequest`) reçoit à la
place `{ error, code }` :

| Statut | `code` | Quand |
| ------ | ------ | ----- |
| `400`  | `E_STATION_LOGIN_CREDENTIALS_REQUIRED` | L'email ou le mot de passe est vide. |
| `401`  | `E_STATION_INVALID_CREDENTIALS` | Identifiants faux. |
| `429`  | `E_STATION_TOO_MANY_LOGIN_ATTEMPTS` | La limite de débit a refusé la tentative ; `Retry-After` est posé. |
| `503`  | `E_STATION_LOGIN_UNAVAILABLE` | Le limiteur a échoué, ou le backend d'auth a planté (journalisé pour l'opérateur, aucun `login_failed` enregistré). |

Une écriture refusée faute de token CSRF vérifié répond à un appelant JSON avec
`E_STATION_CSRF_REQUIRED` (voir [Application du CSRF](/fr/guides/digging-deeper/admin/sign-in#application-du-csrf-fermeture-stricte)).

### Protection contre la force brute

`POST /admin/login` compte chaque tentative sous l'IP du client et sous l'email
soumis (en minuscules, sous son empreinte SHA-256) **avant** de vérifier le mot
de passe. La sixième tentative en 15 minutes sur l'une ou l'autre clé est
refusée avec `429` et un en-tête `Retry-After`, sans atteindre la vérification
des identifiants ; une connexion réussie remet les deux compteurs à zéro. Un
limiteur en panne (store indisponible) refuse la tentative avec `503`.

L'IP est comptée d'abord, et une tentative refusée sur elle ne compte pas
l'email : une adresse déjà limitée ne peut pas remplir le store d'identifiants
inventés et bloquer tous les autres administrateurs. Un email de plus de 254
caractères (RFC 5321) est refusé avec `400` avant d'atteindre le limiteur.

Les compteurs vivent par défaut dans la mémoire du processus. En cluster,
passez un limiteur partagé — l'`AuthRateLimiter` de Warden sur un
`RedisAttemptStore` a la forme attendue et utilise les mêmes clés :

```ts
import { AuthRateLimiter, RedisAttemptStore } from "@c9up/warden";

export default defineConfig({
  loginRateLimit: {
    limiter: new AuthRateLimiter({ store: new RedisAttemptStore(redis) }),
  },
  // ou réglez celui en mémoire : { maxAttempts: 10, windowSeconds: 600 }
});
```

`station.middleware` attache des middlewares nommés du routeur à chaque route
d'admin, pour une application qui applique sa propre limitation ou ses propres
en-têtes.

### Cookie de session et déconnexion

Le cookie d'authentification est `HttpOnly`, `SameSite=Lax`, limité à `/admin`
(le token n'est jamais envoyé au reste de l'application) et vit le temps de la
session du navigateur. Il est `Secure` partout sauf dans un processus
`development`/`test` servi en HTTP simple ; `station.cookieSecure` force le
drapeau dans un sens ou l'autre.

La déconnexion révoque le token qu'elle portait via le `revoke(token)` du guard
d'authentification avant d'effacer le cookie : une copie prise plus tôt est
refusée ensuite. Avec le guard JWT de Warden, il faut une `blacklist` ; sans
elle, Station avertit une fois que les tokens déconnectés restent valides
jusqu'à leur expiration.

La page de connexion n'affiche que des messages produits par Station ; elle ne
lit jamais de message d'erreur dans la query string.

## Application du CSRF (fermeture stricte)

Chaque route d'**écriture** admin (`create`, `update`, `destroy`, plus login et
logout) exige un token CSRF actif et **vérifié**. Station l'applique en lisant
`ctx.request.csrfProtected` — le signal fiable publié par le middleware
[`@c9up/blackhole`](/fr/guides/security/securing-ssr) de l'hôte, qui vaut `true` uniquement lorsque le
CSRF était activé, la méthode gardée, la route non exceptée et le token validé.
Une requête non vérifiée CSRF est refusée avec `403` **avant** toute autorisation
ou travail base de données — une requête forgée n'atteint jamais le dépôt.

Station n'implémente **aucune** logique CSRF propre : le `{{ csrfField() }}`
d'inker émet le champ token, blackhole vérifie le double-submit, ream transporte
le signal `csrfProtected`, et Station l'applique. Pour le câbler, enregistrez le
middleware blackhole avec `csrf: true` dans `start/kernel.ts` et gardez `/admin/*`
hors de `csrf.exceptRoutes` (l'hôte par défaut fait déjà les deux). Si la
vérification manque — middleware non câblé, `csrf: false`, ou `/admin/*` excepté —
les écritures renvoient `403` et Station journalise un diagnostic pointant la
mauvaise configuration.

## Journal d'audit

Le sink `audit` de chaque ressource reçoit un événement après chaque écriture
réussie : `action`, `resource`, `recordId`, `userId`, les images `before`/`after`,
l'`ip`, le `userAgent` et le `requestId` du client, et `at`.

Les valeurs des colonnes secrètes (au sens de
[Colonnes](/fr/guides/digging-deeper/admin/#colonnes-ce-que-montre-chaque-vue-ce-qu-une-ecriture-peut-modifier)),
et celles des champs `inputType: "password"`, sont remplacées par `"[redacted]"` dans `before` et `after`. Une édition qui en
modifie une le signale tout de même : `redactedChanges` liste les colonnes
secrètes dont la valeur a changé. `defineResource({ auditSecrets: true })`
transmet les valeurs brutes au sink.

`station.audit` reçoit les événements de sécurité de la surface d'admin :

| `action`          | Quand                                                       |
| ----------------- | ----------------------------------------------------------- |
| `login`           | Une connexion réussie (`userId`, `identifier`).             |
| `login_failed`    | Des identifiants erronés (`identifier`).                    |
| `login_throttled` | Une connexion refusée par la limitation (`identifier`).     |
| `logout`          | Une déconnexion (`userId`).                                 |
| `denied`          | Un rôle ou une permission manquant (`permission`, et `resource` / `resourceAction` pour une action). |
| `csrf_denied`     | Une écriture refusée faute de CSRF vérifié.                 |

Chacun porte `path`, `ip`, `userAgent`, `requestId` et `at`. Un sink qui lève
une erreur est journalisé et ne change jamais la réponse.

```ts
export default defineConfig({
  audit: (event) => logger.info({ event }, "admin security event"),
});
```
