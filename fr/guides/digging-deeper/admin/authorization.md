# Autorisation et écritures

Ce guide couvre qui peut voir et modifier quoi :

- Autorisation
- Affectation de masse & validation

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

## Affectation de masse & validation

Station valide chaque corps de requête **create**/**update** de l'admin contre
un schéma [`@c9up/rune`](/fr/guides/basics/validation/) qu'elle dérive — une seule fois, au montage — à
partir des métadonnées `@Column` atlas de l'entité, restreint aux
[colonnes modifiables](/fr/guides/digging-deeper/admin/#colonnes-ce-que-montre-chaque-vue-ce-qu-une-ecriture-peut-modifier) :
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
