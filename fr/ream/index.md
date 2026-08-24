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

### Cycle de vie de la session

`SessionMiddleware` le pilote, et les deux méthodes sont celles d'AdonisJS :
`session.initiate()` charge la session depuis son store (idempotent — un second
appel ne fait rien), `session.commit()` la persiste. `commit()` écrit une
session modifiée, touche une session existante non modifiée pour faire glisser
son expiration, n'écrit rien pour une session neuve et intacte, et — si le
handler a appelé `regenerate()` — écrit sous le nouvel identifiant avant de
supprimer l'ancien, pour qu'un crash entre les deux laisse une session valide
plutôt qu'aucune.

### Associer une session à un utilisateur

`session.tag(userId)` associe la session à un utilisateur, ce qui permet de
retrouver ensuite toutes les sessions qu'il détient — c'est sur ça que reposent
« me déconnecter de tous mes appareils » et « vos sessions actives ». On associe
à la connexion, on dissocie à la déconnexion :

```typescript
await ctx.session.tag(String(user.id))   // connexion
await ctx.session.untag(String(user.id)) // déconnexion
```

Pour fermer toutes les sessions d'un utilisateur, on les liste depuis le store
et on détruit chacune :

```typescript
for (const { id } of await store.tagged(user.id)) {
  await store.destroy(id)
}
```

Seuls les stores qui tiennent un index interrogeable savent répondre :
**memory**, **redis** et **database**. `session.supportsTagging()` indique si
celui configuré en fait partie ; appeler `tag()` sur un store qui ne peut pas
lève une erreur au lieu de ne rien faire — une connexion qui croit avoir associé
la session laisserait la fonctionnalité ne déconnecter personne, en silence.

Le store database utilise une colonne `user_id` nullable sur la table des
sessions, comme AdonisJS. Le store redis tient un set par utilisateur et élague
les membres dont la clé de session a expiré, Redis ne sachant pas faire expirer
les membres d'un set individuellement.

### État de la session

`session.fresh` (créée pendant cette requête), `session.isEmpty` (rien de
stocké, données flash comprises), `session.hasBeenModified` (l'écriture AdonisJS
de `isDirty()`), et `session.readonly` — toujours `false`, ream n'ayant pas de
mode session en lecture seule.

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

## La requête

Au-delà de `input()` / `all()` / `qs()`, la requête porte ce que porte celle
d'AdonisJS :

```ts
ctx.request.id()            // le x-request-id posé par le proxy, ou undefined
ctx.request.completeUrl()   // protocol://host/chemin, `true` garde la query
ctx.request.parsedUrl()     // { pathname, search, query }
ctx.request.ajax()          // X-Requested-With: xmlhttprequest
ctx.request.pjax()
ctx.request.prefetch()      // une récupération spéculative, pas une navigation
ctx.request.types()         // tous les types acceptés, meilleur en premier
ctx.request.languages()     // …et langues, charsets, encodages
ctx.request.cookiesList()
ctx.request.serialize()     // une vue JSON, pour les logs
```

`body()` renvoie le corps de la requête ; `all()` renvoie le corps **fusionné
avec la query string** — deux choses distinctes, comme en amont.

`id()` ne fabrique pas d'UUID quand l'en-tête est absent : un identifiant de
corrélation que personne d'autre ne connaît ne corrèle rien.

`serialize()` et `toJSON()` omettent délibérément le corps — il peut contenir un
mot de passe, et une ligne de log est le dernier endroit où ça doit atterrir.

`prefetch()` mérite d'être consulté avant tout ce qui a un effet de bord. Un
navigateur peut chercher un lien que l'utilisateur ne cliquera jamais ; le compter
comme visite, ou pire agir dessus, attribue une intention que personne n'a eue.

### D'où vient l'utilisateur

```ts
const back = ctx.request.getPreviousUrl(['admin.example.com'], '/dashboard')
```

L'en-tête `Referer` est **fourni par le client**. Y rediriger sans contrôle est
une redirection ouverte : l'hôte doit donc être celui de la requête ou figurer
dans la liste que vous donnez ; tout le reste tombe sur le repli.

## La réponse

```ts
ctx.response.onFinish(() => unlink(fichierTemporaire))   // après l'envoi
await ctx.response.stream(fs.createReadStream(chemin))
ctx.response.attachment(chemin, 'rapport-échéance.pdf')
ctx.response.cookie('prefs', { theme: 'dark' }, { maxAge: '2h' })
```

- **`onFinish`** exécute ce qui doit avoir lieu sans retarder la réponse — un
  fichier temporaire supprimé, une métrique posée. Un rappel qui lève n'arrête
  pas les autres : à ce stade le client a déjà sa réponse.
- **`maxAge`** accepte des secondes ou une durée. `'2h'` arrivait auparavant dans
  l'en-tête sous la forme invalide `Max-Age=2h`, et le cookie était jeté sans un
  mot.
- **`plainCookie`** emballe sa valeur en JSON base64url, donc un objet revient un
  objet et un nombre un nombre. Passez `encode: false` pour une valeur qu'un
  script du navigateur doit lire telle quelle, ou déjà protégée.
- **`attachment`** échappe le nom de fichier et ajoute la forme étendue RFC 6266,
  pour qu'un nom non-ASCII survive à un en-tête Latin-1 au lieu d'arriver illisible.

Deux déviations nommées sur `stream()` : la réponse traverse une frontière NAPI,
donc le flux est **consommé** plutôt que tuyauté, et aucun `ServerResponse` Node
n'atteint un rappel `onFinish`. Pour du vrai streaming, utilisez `response.sse()`.

## Chiffrement

```ts
const token = encryption.encrypt(userId, 3_600_000, 'password-reset')
encryption.decrypt(token, 'password-reset')   // l'id
encryption.decrypt(token, 'session')          // null
```

`purpose` est ce qui empêche une valeur scellée pour un usage d'être rejouée
ailleurs — un jeton de réinitialisation présenté comme cookie de session échoue
ici au lieu d'être honoré. `expiresIn` est en millisecondes. Les deux valent
aussi pour `sign()` / `unsign()`.

L'APP_KEY est validée à la construction : absente elle lève `E_MISSING_APP_KEY`,
plus courte que 16 caractères `E_INSECURE_APP_KEY`.

> **Déviation nommée.** Ream chiffre en **aes-256-gcm**, où l'authentification
> fait partie du chiffre. AdonisJS utilise `aes-256-cbc` plus un HMAC assemblé à
> la main — un encrypt-then-MAC monté à la main est une source connue de failles
> subtiles, et rien ne justifie de le reproduire. La conséquence, dite
> franchement : un cookie chiffré par une app AdonisJS **ne peut pas être
> déchiffré ici**. Migrer invalide les cookies chiffrés déjà présents dans les
> navigateurs — les utilisateurs sont déconnectés une fois, au déploiement. Tout
> ce que l'app *appelle* se comporte pareil.

## Mode de l'application

```ts
async start() {
  if (this.app.getMode() !== 'run') return
  await startQueueWorkers()
}
```

`getMode()` vaut `run` ou `warmup`. Une commande de génération ou d'inspection
pose `warmup`, ce qui permet à un provider de sauter ses **effets de bord** —
démarrer des workers, ouvrir une connexion — tout en enregistrant tous ses
bindings. Il ne doit jamais changer *quels* bindings existent : l'app inspectée
doit être identique à l'app qui tourne, sinon les types générés décrivent autre
chose. `setMode()` refuse après le boot.
