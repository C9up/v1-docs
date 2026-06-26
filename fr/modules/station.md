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
