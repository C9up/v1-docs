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
`config/station.ts` (parité avec le config-helper AdonisJS) :

```ts
import { defineConfig } from "@c9up/station";

export default defineConfig({
  requireAuth: true,
  requireRole: "admin",
});
```

## Vues (Inker)

Station rend ses pages d'admin via des templates [`@c9up/inker`](./inker)
livrés à l'intérieur du package, plutôt qu'une couche de vues écrite à la main.
Les templates vivent dans la racine `templates/` du package
(`templates/layout.inker`, la coquille partagée, et des templates par page comme
`templates/errors/404.inker`), résolus depuis l'URL du module afin que le même
chemin soit valide que Station tourne depuis les sources ou depuis son build
publié.

Cela suit le **pattern des vues de package AdonisJS** (Edge `edge.mount(name,
dir)` + `namespace::template`). Station ne construit pas son propre moteur de
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
  tombe jamais sur une page vide.

## Autorisation

Station autorise chaque action d'admin exclusivement via la couche
d'autorisation unifiée de Warden. Il n'y a aucun RBAC local à Station : la seule
décision du verrou est `auth.hasPermission(user, "<resource>.<action>",
"global")`, résolue par le même `RightsResolver` qui répond à un appel grossier
`auth.hasPermission` et à une politique Bouncer de Warden (le point de
résolution unique).

### Convention de permission par action

Chaque action est protégée derrière une permission nommée
`<resource>.<action>`, où `<resource>` est le slug de la ressource (minuscules,
kebab-case) et `<action>` l'une des cinq actions CRUD :

| Action    | Permission      |
| --------- | --------------- |
| `list`    | `users.list`    |
| `show`    | `users.show`    |
| `create`  | `users.create`  |
| `edit`    | `users.edit`    |
| `destroy` | `users.destroy` |

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
  "users.list",
  "users.show",
  "users.create",
  "users.edit",
  "users.destroy",
]);
store.assignRole(adminUserId, "admin");
// octroi ponctuel optionnel, sans rôle :
store.grant(editorUserId, "users.edit");

// câbler le store amorcé via config/auth.ts -> rights: { store }
```

Un hôte qui câble Warden sans rien amorcer reçoit un `403` sur chaque requête
d'admin ; Station émet un avertissement de boot unique à ce sujet quand la
couche d'auth est câblée.

### Le verrou global `requireRole`

Définir `station.requireRole` ajoute un verrou grossier devant chaque route
`/admin/*`, résolu via `auth.hasRole(user, role, "global")`. Un utilisateur
authentifié sans ce rôle reçoit un `403` (pas une redirection) ; une requête
sans token valide reçoit un `401` (JSON) ou une redirection vers la page de
connexion (HTML).

### Aperçu dev (sans auth)

Quand `@c9up/warden` n'est pas câblé (ou `station.requireAuth: false`), le verrou
tourne en mode aperçu-dev ouvert : chaque action est autorisée et Station émet
un avertissement de boot bruyant indiquant que l'admin est monté sans auth. Ce
mode est réservé au développement local — jamais à la production.

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

## Note de migration (depuis les callbacks de politique 54.4)

La table de callbacks `defineResource({ policies })` — l'API `PolicyFn`
`(ctx) => boolean` par action et son défaut fail-closed admin en ligne — a été
supprimée. Exprimez plutôt l'autorisation via les rôles, permissions et octrois
de Warden (voir l'exemple d'amorçage ci-dessus).

Les vérifications de propriété par ligne (par exemple `user.id === row.ownerId`)
ne sont plus exprimables dans le verrou de permission grossier de Station, qui
n'a pas accès à la ligne chargée. La propriété relève d'une politique Bouncer de
Warden, atteinte par le chemin Bouncer complet plutôt que par le verrou grossier
de Station.

Voir [Warden](./warden) pour la couche d'authentification et d'autorisation que
Station consomme.
