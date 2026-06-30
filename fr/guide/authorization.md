# Autorisation

Ream répond à deux questions distinctes sur une requête. *Qui es-tu ?* relève de
l'**authentification** — gérée par les stratégies de Warden (JWT, session, clé
API). *Que peux-tu faire ?* relève de l'**autorisation** — le sujet de ce guide.

Avant ce modèle, « que peux-tu faire ? » était traité par trois mécanismes sans
lien : les guards de route `@Role` / `@Permission`, la table de callbacks
`defineResource({ policies })` de Station, et des checks d'ownership ad hoc dans
les contrôleurs. Ils ont divergé et lisaient chacun les permissions
différemment. La couche unifiée remplace les trois par **un seul modèle** — RBAC,
ACL, ownership et multi-tenant en sont des *facettes*, pas des moteurs séparés.

## Le modèle — deux couches et un scope

```
Couche 1 — DONNÉES DE DROITS (résolution)
  users → rôles → permissions          (RBAC)
  + grants directs user → permission    (ACL)
  le tout clé par scope : global | tenant:X (multi-tenant)
  resolve(user, scope) → permissions effectives   ← le point d'unification unique

Couche 2 — ÉVALUATION (façon Bouncer, consulte la Couche 1)
  ability(user, ...args) / Policy.method(user, resource)
      resolved(user, scope).has("post.edit")   // données : rôle ∪ grant direct
   || user.id === resource.authorId             // ownership
   && this.sameTenant(resource)                 // isolation tenant
```

Une requête circule de haut en bas :

1. **Authn** — une stratégie Warden vérifie le credential et produit un
   `UserPayload` (ou `null` pour un invité).
2. **Résolution des droits (Couche 1)** — `RightsResolver.resolve(user, scope)`
   lit le rights store et renvoie les **permissions effectives** de l'utilisateur
   pour le scope actif : permissions dérivées des rôles ∪ grants directs, les
   droits `global` étant hérités dans chaque tenant. C'est le point unique que
   l'epic appelle `user.permissions` — un claim `user.permissions` porté par le
   token n'est **pas** une entrée.
3. **Évaluation (Couche 2)** — un `Bouncer` exécute une ability ou une méthode de
   policy. Le prédicat décide à partir des permissions résolues
   (`this.permissions`), de l'ownership (`user.id === resource.authorId`) et de
   l'isolation tenant (`this.sameTenant(resource)`) — librement combinés.
4. **Intégration HTTP** — le middleware `initializeBouncer` construit un
   `ctx.bouncer` par requête ; un refus lève `WARDEN_AUTHORIZATION_FAILURE`, que
   Ream mappe sur un **403**.

La couche d'évaluation est fidèle à AdonisJS Bouncer — le contrat est familier —
mais c'est une implémentation Ream indépendante, **sans dépendance
`@adonisjs/bouncer`**.

La référence de chaque pièce vit dans la page du module Warden :
[Résolution des droits](/fr/modules/warden#resolution-des-droits-rbac-acl),
[Autorisation](/fr/modules/warden#autorisation-evaluation-facon-bouncer) et
[Intégration HTTP](/fr/modules/warden#integration-http).

## Un exemple complet

Un petit blog avec des éditeurs, de l'ownership par post, un grant de
publication et de l'isolation tenant — chaque facette dans une seule app.

**1. Seeder le modèle de droits.** Les rôles et grants vivent dans un
`RightsStore`. Le driver en mémoire est livré avec Warden ; un driver adossé à
une base est un [adaptateur à copier-coller](/fr/modules/warden#adapter-base-de-donnees).

```ts
import { MemoryRightsStore } from "@c9up/warden"

export const rights = new MemoryRightsStore()
  // RBAC : le rôle editor accorde post.edit (global)
  .defineRole("editor", ["post.edit"], "global")
  .assignRole("alice", "editor", "global")
  // ACL : un seul grant direct, sans rôle
  .grant("bob", "post.publish", "global")
  // Scopé tenant : un manager peut archiver, mais seulement dans acme
  .defineRole("manager", ["post.archive"], { tenant: "acme" })
  .assignRole("carol", "manager", { tenant: "acme" })
```

**2. Écrire une policy** qui combine les facettes. Dans une policy,
`this.permissions` est l'ensemble résolu et `this.sameTenant` applique
l'isolation.

```ts
import { BasePolicy } from "@c9up/warden"

interface Post {
  authorId: string
  tenantId?: string | null
}

export class PostPolicy extends BasePolicy {
  // RBAC / ACL — les deux se replient dans le même ensemble résolu
  edit(user: { id: string }, post: Post) {
    return this.permissions.has("post.edit") || user.id === post.authorId // + ownership
  }

  publish() {
    return this.permissions.has("post.publish")
  }

  // permission scopée tenant avec isolation explicite
  archive(_user: { id: string }, post: Post) {
    return this.sameTenant(post) && this.permissions.has("post.archive")
  }
}
```

**3. Câbler** dans `config/auth.ts` — enregistrez la policy, les abilities, et la
façon dont le scope tenant d'une requête est dérivé :

```ts
import { defineConfig } from "@c9up/warden/config"
import { PostPolicy } from "#app/policies/post_policy.js"
import { rights } from "#app/rights.js"

export default defineConfig({
  // ...config jwt...
  rights: { store: rights },
  policies: { PostPolicy },
  resolveScope: (ctx) =>
    ctx.request.headers["x-tenant"]
      ? { tenant: ctx.request.headers["x-tenant"] }
      : "global",
})
```

Puis enregistrez `initializeBouncer` comme middleware global (après le middleware
d'authentification) pour que `ctx.bouncer` soit construit par requête — voir
[Intégration HTTP](/fr/modules/warden#integration-http).

**4. Autoriser dans un handler :**

```ts
class PostController {
  async update(ctx) {
    const post = await Post.find(ctx.params.id)
    await ctx.bouncer.with("PostPolicy").authorize("edit", post) // 403 en cas de refus
  }
}
```

`alice` passe `edit` via son rôle editor ; l'auteur du post le passe via
l'ownership ; `bob` peut `publish` via son grant direct ; `carol` peut `archive`
un post acme mais pas un post globex. Aucun token n'a besoin de porter quoi que
ce soit — tout se résout depuis le rights store.

## Migration

Avant 56, l'autorisation était éparpillée sur trois mécanismes. Chacun se mappe
proprement sur la couche unifiée — et **aucun shim de compatibilité n'a été
conservé** (remplacement net).

### RBAC des guards — `@Role` / `@Permission` / `hasRole` / `hasPermission`

Ils existent toujours, mais sont désormais **adossés au resolver** : `@Role` et
`@Permission` sur une route, ainsi que les helpers `hasRole` / `hasPermission`,
lisent tous le même ensemble `RightsResolver.resolve(user, scope)` au lieu de
leur propre logique.

- **Ce qui ne change pas** — les noms des décorateurs et des helpers, et la
  sémantique de gate ET (un utilisateur doit satisfaire chaque rôle *et* chaque
  permission requis).
- **Ce qui change** — les helpers sont maintenant **async** (la résolution peut
  toucher une base). Un claim `user.permissions` porté par le token n'est **plus**
  une entrée d'autorisation ; seedez plutôt les permissions dans le rights store.

### Station — callbacks `defineResource({ policies })`

La table de callbacks `PolicyFn` par action de Station est **supprimée**. L'accès
grossier est désormais un gate de permission `${resource}.${action}` résolu via
Warden, et l'ownership par ligne migre dans une **policy** Bouncer Warden (où
`this.permissions` et la ressource sont tous deux disponibles). Voir la
[section Autorisation de Station](/fr/modules/station#autorisation) pour la note
sur l'ownership. Ce gate grossier résout les permissions au **scope global** —
un grant limité à un seul tenant ne garde pas une action admin Station, la
surface admin étant une préoccupation globale.

```ts
// avant (54.4) : une table PolicyFn sur la ressource
defineResource({ policies: { update: (user, row) => user.id === row.ownerId } })

// après : un gate de permission grossier + une policy Bouncer pour l'ownership par ligne
class ArticlePolicy extends BasePolicy {
  update(user: { id: string }, row: { ownerId: string }) {
    return this.permissions.has("article.update") && user.id === row.ownerId
  }
}
```

### Le stopgap admin fail-closed

Le stopgap fail-closed de l'Epic 54 (qui refusait d'emblée les actions admin
jusqu'à l'existence d'une vraie policy) est **supprimé**. Accordez plutôt les
permissions `<resource>.<action>` correspondantes dans le rights store :

```ts
rights
  .defineRole("admin", ["user.create", "user.delete", "article.update"], "global")
  .assignRole("root", "admin", "global")
```

### Rights store adossé à une base

Le store livré est en mémoire. En production, copiez-collez un adaptateur
`RightsStore` adossé à votre base — il n'y a **aucune dépendance dure** à une
base. Le snippet `AtlasRightsStore` complet est dans la référence du module :
[adaptateur adossé à une base](/fr/modules/warden#adapter-base-de-donnees).

### Aucun shim

Les trois anciens mécanismes ont été remplacés, pas enveloppés. Il n'existe ni
`checkPolicy`, ni `PolicyFn`, ni alias `@deprecated` de repli — la couche unifiée
est le seul chemin, et un test de forme du package fait échouer le build si l'un
d'eux réapparaît.
