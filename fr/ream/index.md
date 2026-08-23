# Ream Core

Cette section documente le noyau `@c9up/ream` en mode reference pratique.

## Parcours recommande

1. [Ignitor et bootstrap](/fr/ream/ignitor)
2. [Lifecycle applicatif](/fr/ream/lifecycle)
3. [Container IoC](/fr/ream/ioc-container)
4. [HTTP kernel et routing](/fr/ream/http-kernel)
5. [Erreurs et exception handling](/fr/ream/errors)
6. [Securite et operations](/fr/ream/security-ops)

## Positionnement

- Ream orchestre les modules agnostiques.
- Le core fixe les conventions framework (providers, lifecycle, middleware).
- La surface reste en evolution, avec convergence vers une DX type Adonis/Laravel.

## Contexte HTTP

### Logger par requête — `ctx.logger`

Chaque contexte de requête porte `ctx.logger`, un logger scopé à cette requête. Il
résout le binding `'logger'` du container (un logger `@c9up/spectrum`) en tant
qu'enfant scopé à l'id de la requête, si bien que chaque ligne est corrélée à la
requête ; en l'absence de logger enregistré, il retombe sur `console`. La signature
est **message-first** :

```ts
router.get('/orders/:id', async (ctx) => {
  ctx.logger.info('saved', { id: ctx.params.id })
})
```

### Accès ambiant — `HttpContext.get()` / `getOrFail()`

`HttpContext` expose le contexte de requête courant via `AsyncLocalStorage`, si bien
que n'importe quel code, n'importe où dans la pile d'appels, peut l'atteindre sans
faire transiter `ctx` à travers chaque fonction (parité AdonisJS).

```ts
import { HttpContext } from '@c9up/ream'

const ctx = HttpContext.get()        // contexte courant, ou undefined hors requête
const ctx2 = HttpContext.getOrFail() // lève si appelé hors d'une requête
```

`get()` retourne `undefined` hors d'une requête ; `getOrFail()` lève — à utiliser
quand un contexte de requête est requis.

### Session de requête — `ctx.session`

Quand `SessionMiddleware` est enregistré, la session de requête est exposée en
propriété top-level `ctx.session` (parité AdonisJS) — `ctx.session.get()` /
`.put()` / `.forget()` / `.regenerate()`. Elle est top-level pour que les
consommateurs et la session guard de Warden lisent `ctx.session` directement
plutôt que de la pêcher dans `ctx.store`. Vaut `undefined` si aucun middleware de
session n'a tourné.

### Drivers de session

Cinq drivers sont livrés avec ream :

| driver | où vit la session | notes |
|---|---|---|
| `cookie` | dans le cookie signé lui-même | aucun état serveur ; un payload de plus de ~4 Ko ne rentre pas |
| `memory` | dans le process | suffisant pour une instance, perdu au redémarrage ; plafonné à 10 000 sessions vivantes |
| `file` | un fichier par session sur disque | survit à un redémarrage sans Redis ; une seule machine |
| `database` | une table `sessions` | partagé entre instances qui partagent une base |
| `redis` | sur un serveur Redis | partagé entre instances, survit aux redémarrages |

Le driver `file` reçoit le répertoire où écrire ; le driver `database` reçoit une
connexion exposant `query()` / `execute()` et, optionnellement, le nom de table :

```ts
// config/session.ts
export default { driver: 'file', location: app.tmpPath('sessions') }

// ou
export default {
  driver: 'database',
  dbConnection: db.connection(),
  tableName: 'sessions',   // défaut
}
```

La table `database` est `id` (varchar, clé primaire), `data` (text) et
`expires_at` (bigint, epoch ms). Rien ne la purge tout seul — appelez
`driver.prune()` depuis une tâche planifiée.

### Configuration de session

Les deux orthographes sont acceptées, donc un `config/session.ts` AdonisJS tourne
sans modification :

```ts
export default defineConfig({
  store: 'redis',                          // AdonisJS ; `driver` marche aussi
  stores: { redis: { driver: 'redis' } },  // le magasin nommé fournit le driver
  age: '2h',                               // AdonisJS ; `maxAge: 7200` marche aussi
})
```

`age` accepte des secondes ou une durée (`30m`, `2h`, `7d`). Une valeur illisible
lève à la construction plutôt que de devenir `NaN` — ce qui expirerait toutes les
sessions d'un coup.

### Messages flash

`flashAll()` ne prend **aucun argument** : il lit l'input de la requête, ce qui
repeuple un formulaire après un retour.

```ts
session.flashAll()                       // tout l'input
session.flashOnly(['email'])             // seulement ces clés
session.flashExcept(['password'])        // tout sauf celles-ci
session.flash({ notice: 'Enregistré' })  // une paire ou un objet
session.flashErrors({ email: 'Pris' })   // dans `errorsBag`
session.flashValidationErrors(error)     // inputErrorsBag + errorsBag + input
```

`reflash()` / `reflashOnly(clés)` / `reflashExcept(clés)` conservent le flash du
tour PRÉCÉDENT pour un tour de plus — ce qu'il faut à une chaîne de redirections
pour qu'un message survive.

Les templates lisent les mêmes données via `flashMessages`, `old()` et les tags
`@error` / `@errors` / `@inputError` / `@flashMessage`.

### URL intentionnelle

Retenez où allait l'utilisateur avant de l'envoyer vers la page de connexion,
puis relisez-la après :

```ts
session.setIntendedUrl(ctx.request.url(true))
// …après une connexion réussie
return response.redirect(session.pullIntendedUrl() ?? '/dashboard')
```

`getIntendedUrl()` lit sans consommer ; `clearIntendedUrl()` l'efface.

Le driver `redis` reçoit un client, ou nomme une connexion [Quasar](/fr/modules/quasar) :

```ts
// config/session.ts
export default {
  driver: 'redis',
  connection: 'sessions',   // une connexion quasar ; omettez-la pour la connexion par défaut
  prefix: 'ream:session:',
}
```

Rien n'est ouvert pendant la lecture de la config : la connexion est résolue à la première requête qui touche une session. `@c9up/quasar` est une peer **optionnelle** — les sessions cookie et memory n'y touchent jamais. Une application qui détient déjà un client peut le passer directement via `client` au lieu de nommer une connexion.
