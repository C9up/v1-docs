# Introduction

Ce guide couvre le panneau d'administration, station :

- Config
- Vues (Inker)
- Pagination
- Colonnes : ce que montre chaque vue, ce qu'une écriture peut modifier
- Note de migration (depuis les callbacks de politique 54.4)

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
| `requireAuth`      | actif quand Warden est câblé | `false` monte l'admin sans authentification (voir [Sans authentification](/fr/guides/digging-deeper/admin/authorization#sans-authentification)). |
| `requireRole`      | aucun              | Rôle exigé sur chaque requête, en plus de `accessPermission`.                                 |
| `guard`            | le guard par défaut du manager d'auth | Le guard Warden par lequel passent la connexion, le verrou et la déconnexion (voir [Connexion](/fr/guides/digging-deeper/admin/sign-in#connexion-cookie-de-session-et-deconnexion)). |
| `permissionPrefix` | `"station"`        | Espace de noms des permissions d'admin (`station.users.edit`).                                |
| `accessPermission` | `"station.access"` | Permission requise pour entrer dans `/admin/*` ; `false` retire ce verrou.                    |
| `loginPath`        | `"/admin/login"`   | Destination d'un navigateur non authentifié.                                                  |
| `cookieName`       | `"station_auth"`   | Nom du cookie d'authentification.                                                             |
| `cookieSecure`     | voir [Cookie de session](/fr/guides/digging-deeper/admin/sign-in#cookie-de-session-et-deconnexion) | Force le drapeau `Secure` du cookie dans un sens ou l'autre. |
| `loginRateLimit`   | 5 tentatives / 15 min | Limitation de la connexion ; `{ maxAttempts, windowSeconds }`, `{ limiter }` ou `false`.   |
| `middleware`       | aucun              | Middlewares nommés du routeur attachés à chaque route d'admin.                                |
| `audit`            | aucun              | Destination des événements de connexion, déconnexion et refus (voir [Journal d'audit](/fr/guides/digging-deeper/admin/sign-in#journal-d-audit)). |

## Vues (Inker)

Station rend ses pages d'admin via des templates [`@c9up/inker`](/fr/guides/frontend/templates/)
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

La vue liste pagine via [`ModelQuery.paginate(page, perPage)`](/fr/guides/database/orm/) d'atlas
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

- **Liste et fiche** affichent toutes les colonnes sauf les secrets et les
  champs que le formulaire rend en saisie de mot de passe
  (`formFields.<col>.inputType: "password"`). `list.columns` et `show.columns`
  remplacent ce choix par une liste explicite, dans l'ordre donné ; y nommer
  une telle colonne est le choix explicite qui l'affiche.
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

Voir [Warden](/fr/guides/auth/introduction) pour la couche d'authentification et d'autorisation que
Station consomme.
