# Évaluer les capacités

Ce guide couvre l'évaluation d'une capacité :

- Abilities
- Les quatre verbes
- AuthorizationResponse
- Policies
- Hooks before / after
- Scope multi-tenant
- Intégration HTTP

## Autorisation (évaluation par le Bouncer)

L'autorisation de Warden tient en deux couches. La couche 1 — la **Résolution
des droits** ci-dessus — répond à *quelles permissions possède cet
utilisateur ?*. La couche 2 — le **Bouncer** — répond à *cet utilisateur a-t-il
le droit de faire ceci ?*, par des abilities autonomes, des policies basées sur des classes avec des hooks
`before` / `after`, les décorateurs `@allowGuest` / `@action`, un type valeur
`AuthorizationResponse`, et les quatre verbes `allows` / `denies` / `authorize`
/ `execute`.

Les exemples d'abilities autonomes ci-dessous écrivent leurs prédicats
directement sur `(user, resource)`. Les deux
couches se connectent via les **policies** : un Bouncer peut porter un scope + un
resolver de couche 1, et une policy lit alors les permissions résolues via
`this.permissions` — voir **Scope multi-tenant** ci-dessous.

### Abilities

Une ability est une vérification nommée unique. `Bouncer.ability` renvoie une
référence opaque utilisable par référence ou enregistrable par nom. Un invité
(un utilisateur `null`) est **refusé par défaut** sans que le callback ne soit
exécuté — passez `{ allowGuest: true }` pour l'autoriser explicitement.

```ts
import { Bouncer } from "@c9up/warden";

const editPost = Bouncer.ability(
  (user, post: { authorId: string }) => user.id === post.authorId,
);

// Autoriser un invité explicitement :
const viewPublic = Bouncer.ability(
  { allowGuest: true },
  (user, post: { published: boolean }) => post.published || user !== null,
);

const bouncer = new Bouncer(currentUser); // currentUser: UserPayload | null
await bouncer.allows(editPost, post); // Promise<boolean>
```

### Les quatre verbes

```ts
await bouncer.allows(editPost, post); // Promise<boolean> — ne lève jamais
await bouncer.denies(editPost, post); // Promise<boolean> — !allows
await bouncer.execute(editPost, post); // Promise<AuthorizationResponse>
await bouncer.authorize(editPost, post); // résout si autorisé, lève si refusé
```

`allows` / `denies` ne lèvent jamais — un refus vaut `false`. `execute` renvoie
la réponse complète `AuthorizationResponse` (`authorized`, `message`, `status`).
`authorize` résout à `void` si autorisé et lève `E_AUTHORIZATION_FAILURE`
(status 403, sauf si le refus en donne un autre) si refusé.

Les abilities peuvent être enregistrées par nom et vérifiées des deux façons —
les deux produisent des résultats identiques :

```ts
const bouncer = new Bouncer(currentUser, { editPost });
await bouncer.allows("editPost", post);
```

### AuthorizationResponse

Un prédicat peut renvoyer un `boolean` (sucre pour allow / deny) ou un
`AuthorizationResponse` explicite portant un message et un statut personnalisés :

```ts
import { AuthorizationResponse } from "@c9up/warden";

AuthorizationResponse.allow(); // { authorized: true }
AuthorizationResponse.deny(); // { authorized: false, status: 403 }
AuthorizationResponse.deny("Post introuvable", 404); // message + statut personnalisés
AuthorizationResponse.deny("Pas à vous").t("errors.post_not_owned", { id: post.id }); // clé i18n
```

`.t(identifier, data)` nomme la traduction du refus. Elle voyage avec l'erreur
levée (`error.response.translation`), et `error.getResponseMessage(ctx)` la
résout via `ctx.i18n` quand la requête en a un.

### Policies

Regroupez les vérifications d'une ressource dans une classe étendant
`BasePolicy`. Les méthodes d'action sont positionnelles `(user, resource)` ;
décorez une méthode avec `@allowGuest()` (≡ `@action({ allowGuest: true })`)
pour qu'un invité puisse l'atteindre.

```ts
import { BasePolicy, allowGuest } from "@c9up/warden";

class PostPolicy extends BasePolicy {
  edit(user, post: Post) {
    return user.id === post.authorId;
  }

  @allowGuest()
  view(user, post: Post) {
    return post.published || user !== null;
  }
}

const bouncer = new Bouncer(currentUser);
await bouncer.with(PostPolicy).allows("edit", post);
await bouncer.with(PostPolicy).authorize("edit", post);
```

`with` accepte la classe de policy directement, ou un nom lorsque les policies
sont enregistrées : `new Bouncer(user, abilities, { Post: PostPolicy })` →
`bouncer.with("Post")`. Une instance de policy fraîche est construite à chaque
vérification.

### Hooks before / after

Les hooks optionnels `before` et `after` s'exécutent autour de chaque action
dans cet ordre — **before → refus-invité → action → after** :

- `before(user, action, ...args)` s'exécute en premier. Un retour
  non-`undefined` court-circuite l'action (c'est ainsi que fonctionnent un
  bypass de modérateur, ou un `deny("introuvable", 404)` précoce — y compris
  pour un invité).
- la règle de refus-invité ne s'applique que si `before` n'a rien renvoyé.
- `after(user, action, response)` s'exécute en dernier. Un retour non-`undefined`
  remplace la réponse ; `undefined` la conserve.

```ts
class PostPolicy extends BasePolicy {
  before(user) {
    if (user?.roles?.includes("admin")) return true; // les modérateurs bypassent
    return undefined;
  }

  delete(user, post: Post) {
    return user.id === post.authorId;
  }
}
```

### Scope multi-tenant

Un Bouncer porte un **scope** actif — `"global"` (le défaut implicite
mono-tenant) ou `{ tenant: string }`. Passez-le, avec un resolver de couche 1
optionnel, comme 4ᵉ argument du constructeur :

```ts
import { Bouncer, RightsResolver } from "@c9up/warden";

const resolver = new RightsResolver(store); // store: RightsStore
const bouncer = new Bouncer(currentUser, abilities, policies, {
  scope: { tenant: "acme" },
  resolver,
});

bouncer.scope; // { tenant: "acme" }
```

À l'intérieur d'une policy, deux membres protégés exposent le contexte actif :

- `this.scope` — le scope du Bouncer (`"global"` si aucun n'a été fourni).
- `this.permissions` — les `EffectivePermissions` résolues pour `(user, scope)`
  (dérivées des rôles ∪ grants ACL, avec héritage global→tenant via la couche 1).
  Résolues **une seule fois par Bouncer** et partagées sur chaque vérification.
  Un invité, ou un Bouncer sans resolver, obtient un ensemble vide. Quand la
  requête est arrivée avec un jeton d'accès, l'ensemble est restreint par les
  capacités du jeton exactement comme `ctx.auth.hasPermission()` :
  `this.permissions.has('orders:delete')` vaut `false` pour un jeton émis avec
  `['orders:read']`, quoi que l'utilisateur détienne. `hasAll`, `hasAny` et
  `permissions` sont restreints de la même façon ; `roles` reste celui de
  l'utilisateur.

`this.sameTenant(resource)` applique l'isolation tenant explicitement — elle
renvoie `true` sous `global` (aucune frontière) et
`resource.tenantId === scope.tenant` sous un scope tenant :

```ts
class PostPolicy extends BasePolicy {
  edit(user, post: { tenantId?: string | null; authorId: string }) {
    if (!this.sameTenant(post)) return false; // inter-tenant ⇒ refus
    return this.permissions.has("post.edit") || user.id === post.authorId;
  }
}

await new Bouncer(user, {}, {}, { scope: { tenant: "acme" }, resolver })
  .with(PostPolicy)
  .allows("edit", post);
```

**Les apps mono-tenant ne demandent aucune config** — omettez le 4ᵉ argument et
le Bouncer se comporte exactement comme avant : `scope === "global"`,
`this.permissions` vide, et `sameTenant` toujours `true`.

L'isolation est *applicable, pas automatique* — une policy décide où appeler
`sameTenant` ; le Bouncer ne refuse jamais automatiquement sur une discordance
de tenant.

Les helpers grossiers `hasRole` / `hasPermission` (et le gate `@Permission` /
`@Role` du middleware) sont ré-exprimés sur ce même ensemble résolu — voir
[Helpers RBAC](/fr/guides/auth/introduction#helpers-rbac).

### Intégration HTTP

Dans une app HTTP Ream, vous ne construisez jamais un `Bouncer` à la main. Le
middleware global `initializeBouncer` en construit un **par requête** et
l'attache comme `ctx.bouncer`. Enregistrez-le dans `start/kernel.ts` comme
middleware global, après le middleware d'authentification qui peuple `ctx.auth` :

```ts
// start/kernel.ts
import router from "@c9up/ream/services/router"
import { initializeBouncer } from "@c9up/warden/middleware"

// 1. Middleware auth — peuple ctx.auth depuis les décorateurs @Guard/@Role/
//    @Permission de la route. La forme lazy utilise le default export de warden :
router.use([() => import("@c9up/warden/middleware")])
//    (forme directe équivalente : import { wardenMiddleware }; router.use([wardenMiddleware]))

// 2. Bouncer — construit ctx.bouncer par requête (invités compris). À enregistrer
//    APRÈS l'auth. C'est un export nommé → enregistre la fonction directement (PAS
//    `() => initializeBouncer`, que Ream essaierait de `new`) :
router.use([initializeBouncer])
```

Il construit `ctx.bouncer` à partir de trois choses, toutes enregistrées par
`WardenProvider` depuis votre `config/auth.ts` :

- l'utilisateur authentifié — `ctx.auth?.user`, ou `null` pour un invité. Il est
  lu au moment de la première vérification, pas au passage du middleware : un
  handler qui appelle `await ctx.auth.authenticate()` puis autorise est jugé en
  tant que l'utilisateur qu'il vient de connecter ;
- le `RightsResolver` partagé (Layer 1), pour que `this.permissions` dans une
  policy se résolve sur le rights store ;
- le `bouncer:registry` — les tables `abilities` / `policies` et le hook optionnel
  `resolveScope(ctx)` qui dérive le scope tenant de la requête.

Vous déclarez tout cela dans `config/auth.ts` :

```ts
// config/auth.ts
import { defineConfig } from "@c9up/warden/config"
import { Bouncer } from "@c9up/warden"
import { PostPolicy } from "#app/policies/post_policy.js"

export default defineConfig({
  // ...config jwt / session...
  abilities: {
    "post.edit": Bouncer.ability((user, post: { ownerId: string }) =>
      user.id === post.ownerId,
    ),
  },
  policies: { PostPolicy },
  // dérive un scope tenant depuis un header / sous-domaine (omis ⇒ toujours "global")
  resolveScope: (ctx) =>
    ctx.request.headers["x-tenant"]
      ? { tenant: ctx.request.headers["x-tenant"] }
      : "global",
})
```

Si la couche de droits n'est pas câblée, `initializeBouncer` attache quand même
un Bouncer vide plutôt que de planter — `ctx.bouncer` est toujours défini.

Dans un handler, autorisez avec les quatre mêmes verbes, désormais à l'échelle de
la requête :

```ts
class PostController {
  async update(ctx) {
    const post = await Post.find(ctx.params.id)
    // lève E_AUTHORIZATION_FAILURE (status 403) en cas de refus
    await ctx.bouncer.authorize("post.edit", post)
    // ...ou branchez sans lever
    if (await ctx.bouncer.allows("post.publish", post)) { /* ... */ }
    // policy basée sur une classe, par nom enregistré
    await ctx.bouncer.with("PostPolicy").authorize("archive", post)
  }
}
```

Quand `authorize()` refuse, il lève `E_AUTHORIZATION_FAILURE` — une classe du
namespace `errors` de warden dont le `code` est `"E_AUTHORIZATION_FAILURE"`,
portant `status` (403 sauf si le refus en donne un autre), le message du refus
(« Access denied » s'il n'en a pas) et l'`AuthorizationResponse` elle-même dans
`error.response`. L'erreur se rend elle-même : le gestionnaire d'exceptions de
l'hôte appelle son `handle`, qui répond avec le statut du refus en négociant le
contenu. Un client JSON reçoit :

```json
{ "errors": [{ "message": "Access denied" }] }
```

Un client JSON:API reçoit `{ "errors": [{ "code": "E_AUTHORIZATION_FAILURE", "title": "Access denied" }] }`,
une requête HTML le message en texte, et une soumission de formulaire (`POST`,
`PUT`, `PATCH`, `DELETE`) d'un navigateur avec une session est redirigée vers la
page précédente avec le message en flash. Un `@Role` / `@Permission` refusé par
le middleware de warden, et le `.role()` / `.permission()` d'une route, répondent
de la même façon.

Un gestionnaire d'exceptions qui veut la traduction du refus la lit sur
l'erreur :

```ts
import { errors } from "@c9up/warden"

if (error instanceof errors.E_AUTHORIZATION_FAILURE) {
  error.response.translation    // { identifier, data } posé par .t()
  error.getResponseMessage(ctx) // ctx.i18n.t(identifier, data, { defaultValue: message })
}
```

`getResponseMessage` se rabat sur l'identifiant `errors.E_AUTHORIZATION_FAILURE`
quand le refus ne pose aucune traduction, et sur le message brut quand le
contexte n'a pas d'`i18n`.

Un `deny(message, status)` personnalisé — ou un `before` de policy renvoyant
`deny("not found", 404)` — propage **son propre** status jusqu'à la réponse,
permettant à une policy de répondre 404 plutôt que de révéler l'existence d'une
ressource.

Le Bouncer par requête résout les permissions d'un utilisateur **une seule fois
par requête** et partage le résultat entre tous les checks de cette requête
(mémoïsé sur l'instance).

---
