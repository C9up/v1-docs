# Station — Admin

`@c9up/station` est l'échafaudage d'administration de Ream : il transforme une
entité Atlas en une surface d'admin CRUD (list / show / create / edit /
destroy) sous `/admin/*`, avec inférence de formulaire, journal d'audit et une
surface de connexion.

Station est l'un des packages d'intégration de Ream — il ajoute une surface
d'administration par-dessus l'univers Ream, consommant `@c9up/atlas` (données),
`@c9up/warden` (authentification et autorisation) et le routeur de `@c9up/ream`.
Il les consomme tous de façon uniforme via le conteneur IoC (bindings résolus +
peers optionnels), jamais via un import statique en dur, si bien qu'un hôte qui
n'a pas câblé un peer donné se dégrade proprement au lieu d'échouer au
chargement.

## Config

Déclarez la config d'admin avec le helper `defineConfig` dans
`config/station.ts` :

```ts
import { defineConfig } from "@c9up/station";

export default defineConfig({
  requireAuth: true,
  requireRole: "admin",
});
```

| Option             | Par défaut         | Effet                                                                                         |
| ------------------ | ------------------ | --------------------------------------------------------------------------------------------- |
| `requireAuth`      | actif quand Warden est câblé | `false` monte l'admin sans authentification (voir [Sans authentification](#sans-authentification)). |
| `requireRole`      | aucun              | Rôle exigé sur chaque requête, en plus de `accessPermission`.                                 |
| `guard`            | le guard par défaut du manager d'auth | Le guard Warden par lequel passent la connexion, le verrou et la déconnexion (voir [Connexion](#connexion-cookie-de-session-et-deconnexion)). |
| `permissionPrefix` | `"station"`        | Espace de noms des permissions d'admin (`station.users.edit`).                                |
| `accessPermission` | `"station.access"` | Permission requise pour entrer dans `/admin/*` ; `false` retire ce verrou.                    |
| `loginPath`        | `"/admin/login"`   | Destination d'un navigateur non authentifié.                                                  |
| `cookieName`       | `"station_auth"`   | Nom du cookie d'authentification.                                                             |
| `cookieSecure`     | voir [Cookie de session](#cookie-de-session-et-deconnexion) | Force le drapeau `Secure` du cookie dans un sens ou l'autre. |
| `loginRateLimit`   | 5 tentatives / 15 min | Limitation de la connexion ; `{ maxAttempts, windowSeconds }`, `{ limiter }` ou `false`.   |
| `middleware`       | aucun              | Middlewares nommés du routeur attachés à chaque route d'admin.                                |
| `audit`            | aucun              | Destination des événements de connexion, déconnexion et refus (voir [Journal d'audit](#journal-d-audit)). |

## Vues (Inker)

Station rend ses pages d'admin via des templates [`@c9up/inker`](./inker)
livrés à l'intérieur du package, plutôt qu'une couche de vues écrite à la main.
Les templates vivent dans la racine `templates/` du package
(`templates/layout.inker`, la coquille partagée, et des templates par page comme
`templates/errors/404.inker`), résolus depuis l'URL du module afin que le même
chemin soit valide que Station tourne depuis les sources ou depuis son build
publié.

Les vues de package passent par un disque nommé et `namespace::template`.
Station ne construit pas son propre moteur de
vues : il résout le renderer inker **partagé** de l'hôte depuis le conteneur
sous l'alias `"inker"` (celui que `InkerProvider` enregistre), monte son
dossier `templates/` comme un **disque** nommé (`renderer.mount("station", …)`),
et rend `station::errors/404`. À l'intérieur d'un template Station, les
références aux templates voisins sont aussi namespacées — le 404 déclare
`{% layout 'station::layout' %}`.

Comme chaque autre package de l'univers Ream que Station intègre, le moteur est
consommé **purement via le conteneur** — exactement comme `@c9up/warden`. Il n'y
a aucun `import "@c9up/inker"` statique ou dynamique nulle part dans les sources
de Station ; `@c9up/inker` est un **peer optionnel** fourni par l'hôte.

Contrairement à Warden — dont l'absence garde vivant le chemin dev-preview
ouvert — le moteur de vues est une **exigence de rendu stricte** : il n'y a pas
de page d'admin sans lui. Dès qu'une surface d'admin est enregistrée, un
renderer `"inker"` non câblé échoue **bruyamment au démarrage** (`register
@c9up/inker (InkerProvider) to render admin views`) plutôt que de se dégrader
silencieusement ou d'échouer à la première requête. Câblez `InkerProvider` (et
ses peers `@c9up/rosetta` / routeur) avant Station. Un hôte qui n'enregistre
aucune ressource n'en a jamais besoin.

> **La couche de vues d'admin est intégralement rendue via inker.** Chaque page
> d'admin — 404, `list`, `show`, le formulaire `create` / `edit` et `login` —
> est rendue via inker (`templates/list.inker`, `templates/show.inker`,
> `templates/form.inker`, `templates/login.inker`). Chaque handler construit un
> view-model pur et inker prend en charge l'échappement HTML. Les vues formulaire
> et login émettent leur champ CSRF caché via le helper canonique
> `{{ csrfField() }}` d'inker (protégé pour qu'un host sans CSRF continue de
> rendre la page). La couche de vues TS écrite à la main a été **retirée** — il
> ne reste aucune implémentation de vues parallèle, et l'auto-échappement `{{ }}`
> d'inker prend en charge tout l'échappement des vues. Le seul échappeur TS qui
> subsiste est un petit helper local pour les bodies d'erreur 404 / 405 envoyés
> en `text/html` hors du renderer inker ; il échappe les cinq mêmes caractères
> qu'inker.

## Pagination

La vue liste pagine via [`ModelQuery.paginate(page, perPage)`](./atlas) d'atlas
plutôt qu'avec un calcul page/count/`ceil` fait main. Un seul appel
`repo.query().orderBy(pk, "desc").paginate(page, perPage)` exécute le `COUNT(*)`
parallèle + la récupération `LIMIT/OFFSET` et renvoie un `Paginator` dont le
`.meta` = `{ total, perPage, currentPage, lastPage, firstPage }` alimente la
légende du tableau et le pager. Station ne duplique plus le calcul
`lastPage = ceil(total / perPage)` — c'est atlas qui le possède.

Deux fines couches de politique subsistent par-dessus :

- **Plafond `MAX_PER_PAGE` (100).** atlas ramène `perPage` à ≥ 1 mais ne le
  plafonne pas ; Station borne donc toujours `?perPage` à `100` (avertissement
  une seule fois par processus à la première requête au-dessus du plafond).
- **Redirection vers la dernière page.** Demander une page au-delà de la fin
  (`page > meta.lastPage` alors que `meta.total > 0`) redirige en 302 vers
  `/admin/<name>?page=<lastPage>&perPage=<perPage>`, pour que l'appelant ne
  tombe jamais sur une page vide. Une page si grande que son décalage
  dépasserait `Number.MAX_SAFE_INTEGER` est redirigée de la même façon (vers la
  page 1 quand la table est vide) sans atteindre la base.

## Colonnes : ce que montre chaque vue, ce qu'une écriture peut modifier

Une colonne qui contient un secret reste hors de l'admin tant que la ressource
ne la nomme pas. Sont des secrets les colonnes déclarées
`@Column({ serializeAs: null })` et celles dont le nom contient `password`,
`passwd`, `secret`, `token` ou `apikey`.

- **Liste et fiche** affichent toutes les colonnes sauf les secrets.
  `list.columns` et `show.columns` remplacent ce choix par une liste explicite,
  dans l'ordre donné.
- **Création et édition** n'acceptent que les colonnes **modifiables**, qui sont
  aussi les champs du formulaire. Par défaut : toutes les colonnes sauf la clé
  primaire, les horodatages gérés, la colonne de suppression logique, les
  relations, les secrets et les champs que `formFields` marque `hidden`.
  `editable` remplace ce choix par une liste explicite.

```ts
defineResource({
  entity: User,
  list: { columns: ["id", "email", "isAdmin"] },
  show: { columns: ["id", "email", "isAdmin", "createdAt"] },
  editable: ["email", "password"],
});
```

Un champ masqué avec `formFields: { isAdmin: { hidden: true } }` n'est pas
modifiable non plus : un corps qui le porte est ignoré, et un booléen masqué
garde sa valeur à chaque édition. Nommer dans l'une de ces listes une colonne
inconnue, une colonne gérée par le framework ou un champ masqué fait échouer le
démarrage.

Un secret listé dans `editable` est en **écriture seule** : le formulaire
l'affiche vide, et à l'édition un envoi vide conserve la valeur enregistrée. Un
champ dont l'entrée `formFields` pose `inputType: "password"` est lui aussi en
écriture seule, quel que soit le nom de sa colonne : jamais pré-rempli, exclu de
l'ancienne saisie renvoyée en flash après une validation ratée, et masqué dans
les instantanés d'audit.

Station ne parse jamais lui-même le corps d'une requête : il lit
`ctx.request.body()`, qui reste `{}` tant que le body parser de l'hôte n'a pas
traité la requête. Gardez le body parser inscrit dans `start/kernel.ts` (le
défaut généré), avant toute route, sinon chaque envoi de formulaire d'admin —
connexion comprise — arrive vide à Station.

## Autorisation

Station autorise chaque action d'admin exclusivement via la couche
d'autorisation unifiée de Warden. Il n'y a aucun RBAC local à Station : les
décisions du verrou sont `auth.hasPermission(user, "station.access", "global")`
pour entrer dans l'admin, puis
`auth.hasPermission(user, "station.<resource>.<action>", "global")` par action,
résolues par le même `RightsResolver` qui répond à un appel grossier
`auth.hasPermission` et à une politique Bouncer de Warden (le point de
résolution unique).

### Convention de permission par action

Chaque action est protégée derrière une permission nommée
`<prefix>.<resource>.<action>`, où `<prefix>` est `station.permissionPrefix`
(`"station"` par défaut), `<resource>` le slug de la ressource (minuscules,
kebab-case) et `<action>` l'une des cinq actions CRUD :

| Action    | Permission              |
| --------- | ----------------------- |
| `list`    | `station.users.list`    |
| `show`    | `station.users.show`    |
| `create`  | `station.users.create`  |
| `edit`    | `station.users.edit`    |
| `destroy` | `station.users.destroy` |

L'espace de noms sépare les droits d'admin de ceux de l'application : un rôle
qui a reçu `users.edit` pour une fonctionnalité de l'application publique
n'ouvre pas l'admin.

Avant toute action, une requête doit aussi détenir la **permission d'accès**
(`station.access`, ou `<prefix>.access`). Donnez à `station.accessPermission` un
autre nom, ou `false` pour ne s'appuyer que sur les permissions par action.

Le verrou est fail-closed : un utilisateur authentifié sans la permission
requise reçoit un `403` ; une requête sans utilisateur authentifié est refusée
avant l'exécution de l'action.

### Consommé via l'alias `"auth"`

Station n'importe jamais `@c9up/warden`. Il résout l'AuthManager depuis le
conteneur sous l'alias chaîne `"auth"` que `WardenProvider` enregistre
exactement pour cela, et appelle `hasPermission` / `hasRole` dessus.
`@c9up/warden` reste une dépendance peer optionnelle. C'est le même schéma que
Station utilise pour consommer `@c9up/ream` et `@c9up/atlas`.

### Amorcer rôles et permissions

L'autorisation s'exprime via les rôles, permissions et octrois directs de Warden
dans le rights store — jamais via des claims injectés dans le token (un token ne
peut pas s'accorder l'accès à lui-même). Amorcez-les là où vous configurez
Warden :

```ts
import { MemoryRightsStore } from "@c9up/warden";

const store = new MemoryRightsStore();
store.defineRole("admin", [
  "station.access",
  "station.users.list",
  "station.users.show",
  "station.users.create",
  "station.users.edit",
  "station.users.destroy",
]);
store.assignRole(adminUserId, "admin");
// octrois ponctuels optionnels, sans rôle :
store.grant(editorUserId, "station.access");
store.grant(editorUserId, "station.users.edit");

// câbler le store amorcé via config/auth.ts -> rights: { store }
```

Un hôte qui câble Warden sans rien amorcer reçoit un `403` sur chaque requête
d'admin ; Station émet un avertissement de boot unique à ce sujet quand la
couche d'auth est câblée.

### Le verrou global `requireRole`

Définir `station.requireRole` ajoute un verrou grossier devant chaque route
`/admin/*`, en plus de la permission d'accès, résolu via
`auth.hasRole(user, role, "global")`. Un utilisateur
authentifié sans ce rôle reçoit un `403` (pas une redirection) ; une requête
sans token valide reçoit un `401` (JSON) ou une redirection vers la page de
connexion (HTML).

### Sans authentification

Quand `@c9up/warden` n'est pas câblé, l'admin ne peut monter ouvert que dans un
processus dont le `NODE_ENV` vaut `development` ou `test`, ou l'un de leurs
alias `dev`, `develop` et `testing` (en majuscules ou non) : chaque action est
autorisée et Station émet un avertissement de boot bruyant. Dans tout autre
environnement — `production`, `prod`, `staging`, un `NODE_ENV` absent — Station
refuse de démarrer, car un admin ouvert, c'est la création, la modification et
la suppression pour quiconque l'atteint. Définissez `station.requireAuth: false`
pour déclarer qu'un admin sans authentification est voulu ; l'avertissement
nomme alors l'environnement dans lequel il tourne.

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
`E_STATION_CSRF_REQUIRED` (voir [Application du CSRF](#application-du-csrf-fermeture-stricte)).

### Protection contre la force brute

`POST /admin/login` compte chaque tentative sous l'IP du client et sous l'email
soumis (en minuscules) **avant** de vérifier le mot de passe. La sixième
tentative en 15 minutes sur l'une ou l'autre clé est refusée avec `429` et un
en-tête `Retry-After`, sans atteindre la vérification des identifiants ; une
connexion réussie remet les deux compteurs à zéro. Un limiteur en panne (store
indisponible) refuse la tentative avec `503`.

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

## Journal d'audit

Le sink `audit` de chaque ressource reçoit un événement après chaque écriture
réussie : `action`, `resource`, `recordId`, `userId`, les images `before`/`after`,
l'`ip`, le `userAgent` et le `requestId` du client, et `at`.

Les valeurs des colonnes secrètes (au sens de
[Colonnes](#colonnes-ce-que-montre-chaque-vue-ce-qu-une-ecriture-peut-modifier)),
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

## Application du CSRF (fermeture stricte)

Chaque route d'**écriture** admin (`create`, `update`, `destroy`, plus login et
logout) exige un token CSRF actif et **vérifié**. Station l'applique en lisant
`ctx.request.csrfProtected` — le signal fiable publié par le middleware
[`@c9up/blackhole`](./blackhole) de l'hôte, qui vaut `true` uniquement lorsque le
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

## Affectation de masse & validation

Station valide chaque corps de requête **create**/**update** de l'admin contre
un schéma [`@c9up/rune`](./rune) qu'elle dérive — une seule fois, au montage — à
partir des métadonnées `@Column` atlas de l'entité, restreint aux
[colonnes modifiables](#colonnes-ce-que-montre-chaque-vue-ce-qu-une-ecriture-peut-modifier) :
la clé primaire, les horodatages gérés par le framework (`created_at` /
`updated_at` / `deleted_at` et toute colonne `autoCreate`/`autoUpdate`), la
colonne de suppression logique, les relations, les secrets et les champs masqués
sont exclus sauf si `editable` en décide autrement. Comme le schéma ne contient
que ces colonnes, **la protection contre l'affectation de masse est
intrinsèque** — un corps portant une clé inconnue, une colonne masquée ou
secrète, la PK ou un horodatage voit ces clés écartées automatiquement ; elles
n'atteignent jamais le dépôt.

Les envois de formulaire arrivent sous forme de chaînes, et rune **ne** convertit
pas les types : la dérivation ajoute donc la coercition nécessaire. Les colonnes
`number`/`integer` acceptent une chaîne numérique (`"42"` → `42` ; une valeur non
numérique échoue) et les colonnes booléennes sont lues comme des cases à cocher
(case cochée → `true`, case **absente** → `false`, de sorte qu'une case décochée
efface la colonne à l'édition). Seuls les booléens modifiables sont lus ainsi :
un booléen absent du formulaire garde sa valeur. Les autres colonnes valident en tant que chaînes.
Une colonne est requise lorsque le modèle ne déclare ni nullabilité ni valeur par
défaut.

Une entrée invalide **échoue en fermeture stricte avant toute écriture en base**
— aucune ligne créée, aucune entité mutée, aucun événement d'audit émis. La
réponse dépend de la négociation de contenu :

- **JSON / XHR** → `422` avec `{ errors: [{ field, rule, message }] }` (la forme
  du handler `E_VALIDATION_ERROR` de ream).
- **Navigateur (avec session)** → le pattern PRG : l'entrée soumise et les
  erreurs par champ sont flashées dans `ctx.session`, puis `redirect().back()`
  vers le formulaire, qui relit le flash et re-rend avec les valeurs + erreurs.
  Aucun corps re-POSTé au rafraîchissement. (Enregistrez le `SessionMiddleware`
  de ream pour l'activer.)
- **Navigateur (sans session)** → repli gracieux : le formulaire est re-rendu en
  ligne avec un `422` afin que les valeurs + erreurs ne soient jamais perdues
  silencieusement.

`@c9up/rune` est un pair optionnel, consommé via un import dynamique tolérant (le
même point de couture qu'atlas). Lorsqu'un admin avec écriture est monté mais que
rune n'est pas installé, Station **refuse de démarrer** plutôt que d'accepter des
corps non validés — il n'y a aucun repli vers une affectation de masse non
vérifiée.

> **Réserve sur le caractère requis.** Le caractère requis est déduit des seules
> métadonnées du modèle : une colonne dont la valeur par défaut vit côté base (un
> `SERIAL`, un `DEFAULT` SQL) sans défaut déclaré au modèle peut être traitée
> comme requise et rejeter une création qui l'omet légitimement. Déclarez le
> défaut sur le modèle, ou marquez la colonne nullable, pour l'assouplir.

## Note de migration (depuis les callbacks de politique 54.4)

La table de callbacks `defineResource({ policies })` — l'API `PolicyFn`
`(ctx) => boolean` par action et son défaut fail-closed admin en ligne — a été
supprimée.

Les permissions par action sont passées de `<resource>.<action>` à
`station.<resource>.<action>`, et entrer dans l'admin exige désormais
`station.access` : réamorcez les rôles en conséquence, ou réglez
`permissionPrefix` / `accessPermission` pour suivre un schéma existant. Exprimez plutôt l'autorisation via les rôles, permissions et octrois
de Warden (voir l'exemple d'amorçage ci-dessus).

Les vérifications de propriété par ligne (par exemple `user.id === row.ownerId`)
ne sont plus exprimables dans le verrou de permission grossier de Station, qui
n'a pas accès à la ligne chargée. La propriété relève d'une politique Bouncer de
Warden, atteinte par le chemin Bouncer complet plutôt que par le verrou grossier
de Station.

Voir [Warden](./warden) pour la couche d'authentification et d'autorisation que
Station consomme.
