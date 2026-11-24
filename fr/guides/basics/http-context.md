# Contexte HTTP

Ce guide couvre le contexte HTTP que reçoit un handler :

- Le HttpContext
- Contexte HTTP

## Le HttpContext

Chaque gestionnaire et middleware reçoit une instance `HttpContext`. Déstructurez uniquement ce dont vous avez besoin :

```typescript
router.get('/example', async ({ request, response, params, auth, id }: HttpContext) => {
  // request  — Request typé (method, path, params, body, headers, qs)
  // response — builder Response typé (json, send, status, header, redirect, noContent)
  // params   — paramètres de route extraits du modèle d'URL { id: '...' }
  // auth     — { isAuthenticated, user?, roles?, permissions? }
  // id       — identifiant de corrélation (depuis l'en-tête x-request-id ou UUID auto-généré)
  // subdomains — ce que le domaine de la route a capturé { tenant: 'acme' } (voir Domaines)
})
```

### API Request

```typescript
request.method()            // 'GET' | 'POST' | ...
request.path()              // '/users/42'
request.url()               // '/users/42?page=1'
request.param('id')         // Paramètre de route
request.qs()                // Chaîne de requête analysée en objet
request.input('name')       // Valeur unique depuis le corps ou la qs
request.all()               // Corps + qs fusionnés
request.only(['name', 'email'])
request.except(['password'])
request.header('authorization')
request.ip()
request.is(['json'])        // Vérification du Content-type
request.accepts(['json'])   // Négociation de l'en-tête Accept
```

Le corps derrière `input()`, `all()`, `only()`, `except()` et `body()` est ce que le body parser a produit : enregistrez `@c9up/ream/bodyparser_middleware` (voir [Envoi de fichiers](/fr/guides/basics/body-parser#activer-le-parser)), sinon ces méthodes ne voient que `{}` plus la chaîne de requête.

#### Derrière un reverse proxy

`request.ip()`, `request.ips()`, `request.protocol()` / `request.secure()` et
`request.host()` ne croient `X-Forwarded-For`, `X-Forwarded-Proto` et
`X-Forwarded-Host` que si la connexion vient d'un proxy déclaré avec
`server.trustedProxies()`. La liste est vide par défaut : les en-têtes sont
ignorés, et un client qui atteint directement le port de l'app ne peut pas les
choisir.

```typescript
// start/kernel.ts
server.trustedProxies(['10.0.0.0/8'])   // ou 'loopback', 'uniquelocal', '*'
```

`request.ips()` est la chaîne de confiance, du saut le plus proche au plus
lointain : le proxy qui s'est connecté, puis chaque adresse transmise dont un
proxy de confiance s'est porté garant. Sa dernière entrée est `request.ip()`.
Une connexion TLS est toujours `https`. Ce qui compte, c'est le pair qui s'est
connecté : le `X-Forwarded-Proto` et le `X-Forwarded-Host` d'un proxy de
confiance sont pris en compte, qu'il envoie aussi `X-Forwarded-For` ou non.

### API Response

```typescript
response.json({ data })             // Définit le content-type et sérialise
response.send('Hello')              // Détecte automatiquement le content-type
response.status(201).json({ data }) // Status chaînable
response.noContent()                // 204 No Content
response.header('x-trace', id)      // Définir un en-tête
response.type('application/xml')    // Définir le content-type
response.cookie('remember_device', token, { maxAge: '30d' })
response.redirect().toPath('/login')
response.redirect().status(301).toPath('/new')
response.redirect().toRoute('users.show', { id: '1' })
```

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
faire transiter `ctx` à travers chaque fonction.

```ts
import { HttpContext } from '@c9up/ream'

const ctx = HttpContext.get()        // contexte courant, ou null hors requête
const ctx2 = HttpContext.getOrFail() // lève si appelé hors d'une requête
```

`get()` retourne `null` hors d'une requête : testez-le avec `=== null`.
`getOrFail()` lève à la place ; à utiliser quand un contexte de requête est
requis.

`runOutsideContext()` exécute une callback avec le contexte ambiant effacé, pour
qu'un travail de fond n'hérite pas du contexte de la requête et ne le retienne
pas.

### Couper le suivi ambiant

`usingAsyncLocalStorage` dit si le suivi est actif, et `useAsyncLocalStorage()`
le bascule :

```ts
HttpContext.usingAsyncLocalStorage      // true
HttpContext.useAsyncLocalStorage(false) // get() répond désormais toujours null
```

::: tip Actif par défaut
Le suivi est **actif par défaut**. Nos propres middlewares et accesseurs de services lisent le contexte ambiant : le couper par défaut
casserait le câblage du framework lui-même, pas seulement celui d'une app.
L'interrupteur existe pour un benchmark ou un process worker qui veut récupérer
le coût.
:::

### Session de requête — `ctx.session`

Quand `SessionMiddleware` est enregistré, la session de requête est exposée en
propriété top-level `ctx.session` — `ctx.session.get()` /
`.put()` / `.forget()` / `.regenerate()`. Elle est top-level pour que les
consommateurs et la session guard de Warden lisent `ctx.session` directement
plutôt que de la pêcher dans `ctx.store`. Vaut `undefined` si aucun middleware de
session n'a tourné.

### Nettoyage des sessions expirées

Le store **database** balaie les lignes expirées sur une fraction de ses
écritures (`gcProbability`, un pourcentage, défaut `2`).
Rien d'autre ne les ramasse : un `read()` ne supprime que la ligne qu'il
regarde, donc une session dont le propriétaire ne revient jamais resterait
indéfiniment en table.

```typescript
{ store: 'database', gcProbability: 2 }  // 0 le désactive
```

Un balayage en échec ne fait jamais échouer la requête qui l'a tiré — la
session a été écrite, c'est ce dont la requête avait besoin, et la prochaine
écriture tirée réessaiera. Mettre `gcProbability: 0` et appeler `driver.prune()`
depuis une tâche planifiée si vous préférez contrôler le moment du DELETE.

### Cycle de vie de la session

`SessionMiddleware` le pilote par deux méthodes :
`session.initiate()` charge la session depuis son store (idempotent — un second
appel ne fait rien), `session.commit()` la persiste. `commit()` écrit une
session modifiée, touche une session existante non modifiée pour faire glisser
son expiration, n'écrit rien pour une session neuve et intacte, et — si le
handler a appelé `regenerate()` — écrit sous le nouvel identifiant avant de
supprimer l'ancien, pour qu'un crash entre les deux laisse une session valide plutôt qu'aucune.

Une session modifiée qui existait à l'arrivée de la requête ne s'écrit que
par-dessus son entrée : si cette entrée a disparu entre-temps (l'utilisateur
s'est déconnecté dans un autre onglet, ou toutes ses sessions ont été
détruites), rien ne s'écrit et la réponse n'envoie aucun cookie de session.
Une requête lente qui avait lu la session connectée avant une déconnexion ne
peut donc pas la remettre après.

### Le stockage cookie

Avec `store: 'cookie'`, la session vit dans le navigateur, chiffrée. La valeur
est scellée avec son échéance, l'`age` de la session, que le serveur vérifie :
une copie du cookie cesse de fonctionner quand la session aurait pris fin, quoi
que fasse le navigateur du `maxAge`. Chaque réémission (chaque réponse en
`rolling: true`) repousse cette échéance à un `age` après le moment où la
requête a LU la session, et non après sa réponse : une requête qui dure une
heure ne peut pas rendre les données lues avec une durée neuve, et celle qui a
survécu à la session ne renvoie aucun cookie. Une session régénérée pendant la
requête (une connexion) compte depuis la réponse. Elle est aussi scellée pour le
nom du cookie : une valeur chiffrée pour un autre cookie avec la même clé est
refusée.

Ce que le stockage cookie ne sait pas faire seul, c'est révoquer : une
déconnexion remplace le cookie de ce navigateur, et rien sur le serveur ne peut
supprimer une copie ; `ctx.session.revocable` vaut `false`. Le guard de session
de Warden refuse d'y connecter qui que ce soit sans `blacklist` (voir
[SessionStrategy](/fr/guides/auth/session-guard#sessionstrategy)) ; l'autre choix est un
stockage côté serveur, `database` ou `redis`.

::: warning Une reconnexion
Un cookie écrit avant ce changement ne porte pas d'échéance et il est refusé :
les utilisateurs d'une application sur le stockage cookie se reconnectent une
fois, après la mise à jour.
:::

### Écrire un stockage de session

Un stockage implémente `read` / `write` / `update` / `destroy` / `touch`. `read()` répond
`null` quand il ne détient rien pour cet identifiant, et l'enregistrement quand
il détient quelque chose :

```typescript
class MyStore implements SessionDriver {
  async read(id: string): Promise<Record<string, unknown> | null> {
    const row = await lookup(id)
    return row ?? null      // PAS {}
  }
  async write(id: string, data: Record<string, unknown>, ttl: number) { /* … */ }
  // N'écrire que par-dessus une entrée encore là, en une étape.
  async update(id: string, data: Record<string, unknown>, ttl: number): Promise<boolean> { /* … */ }
  async destroy(id: string) { /* … */ }
  async touch(id: string, ttl: number) { /* … */ }
}
```

`update()` répond `false` quand l'entrée a disparu, et n'écrit rien. Les
stockages mémoire, redis (`SET … XX`) et base de données (un seul `UPDATE`) le
font en une étape ; le stockage fichier, qui n'a pas d'écriture
conditionnelle, prend un verrou par session (un dossier créé à côté de son
fichier) autour de chaque modification, si bien qu'un `destroy()` ne peut pas
tomber entre sa vérification et son écriture. Un stockage sans `update()` est
refusé dès qu'on le branche (`E_SESSION_STORE_NOT_CONDITIONAL`) : une lecture
suivie d'une écriture laisserait la course ouverte.

::: warning Cassant pour les stockages maison
`read()` rendait un enregistrement nu : un stockage devait donc répondre `{}`
aussi bien pour « aucune session ici » que pour « une session qui se trouve être
vide ». La différence porte : un cookie peut survivre à la ligne qu'il désigne,
et cette session paraissait vivante — `commit()` allait alors toucher une ligne
absente. Renvoyez `null` pour une entrée absente, expirée, détruite ou illisible.
:::

Le stockage fait autorité sur l'existence : `initiate()` marque donc une session
**fraîche** quand le stockage n'a rien pour son identifiant, quel que soit l'âge
du cookie.
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

L'ordre des appels dans la requête n'a pas d'importance. À la connexion,
l'identifiant de session est neuf ou vient d'être régénéré : sa ligne n'existe
pas encore. L'association est gardée et écrite avec la ligne quand la session
est enregistrée, à la fin de la requête. Une session sans aucune donnée n'est
pas enregistrée, ni associée.

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
sessions. Le store redis tient un set par utilisateur et élague
les membres dont la clé de session a expiré, Redis ne sachant pas faire expirer
les membres d'un set individuellement.

### État de la session

```ts
ctx.session.fresh                  // aucune ligne stockée à la lecture
ctx.session.isEmpty                // rien de stocké, données flash comprises
ctx.session.hasBeenModified        // équivaut à isDirty()
ctx.session.hasRegeneratedSession  // regenerate() a tourné sur cette requête
ctx.session.readonly               // toujours false — pas de mode lecture seule
ctx.session.flashKey               // où vit le sac flash dans la charge utile
ctx.session.responseFlashMessages  // ce qui est flashé pour la PROCHAINE requête
ctx.session.config                 // { fresh, ttl }
```

`hasRegeneratedSession` compte quand quelque chose en dehors de la session
détient l'identifiant — un cookie déjà écrit, un stockage externe qui s'y
indexe. C'était suivi en interne et jamais exposé : seule la session pouvait en
tenir compte.

### Drivers de session

Cinq drivers sont livrés avec ream :

| driver | où vit la session | notes |
|---|---|---|
| `cookie` | dans le cookie signé lui-même | aucun état serveur ; un payload de plus de ~4 Ko ne rentre pas |
| `memory` | dans le process | suffisant pour une instance, perdu au redémarrage ; plafonné à 10 000 sessions vivantes, la moins récemment utilisée part la première |
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

La table `database` est `id` (varchar, clé primaire), `data` (text),
`expires_at` (bigint, epoch ms) et `user_id` (varchar, nullable — posée à la
connexion par `session.tag()`). Les lignes expirées sont balayées selon
`gcProbability` (voir [Nettoyage des sessions expirées](/fr/guides/basics/http-context#nettoyage-des-sessions-expirees)).

### Configuration de session

Les deux orthographes sont acceptées :

```ts
export default defineConfig({
  store: 'redis',                          // `driver` marche aussi
  stores: { redis: { driver: 'redis' } },  // le magasin nommé fournit le driver
  age: '2h',                               // `maxAge: 7200` marche aussi
})
```

`age` accepte des secondes ou une durée (`30m`, `2h`, `7d`). Une valeur illisible
lève à la construction plutôt que de devenir `NaN` — ce qui expirerait toutes les
sessions d'un coup.

Un stockage doit être choisi, dans tous les environnements : sans `store` ni
`driver`, `defineConfig` et `SessionMiddleware` lèvent
`E_SESSION_STORE_NOT_CONFIGURED` au lieu de se rabattre sur le stockage mémoire,
qu'un redémarrage, une seconde instance ou assez de trafic anonyme vident.
`store: 'memory'` est accepté quand il est écrit — en test, ou pour une seule
instance de développement.

`cookie` règle les attributs du cookie de session, pour tous les stockages :

```ts
export default defineConfig({
  store: 'redis',
  cookie: {
    sameSite: 'strict',      // défaut 'lax'
    domain: 'example.com',   // défaut : aucun (hôte seul)
    path: '/',               // défaut '/'
    secure: true,            // défaut : actif quand NODE_ENV vaut production
  },
})
```

La durée de vie du cookie vient toujours de `age` et `clearWithBrowser`. Le
cookie est toujours `HttpOnly` : `httpOnly: false` lève
`E_SESSION_COOKIE_NOT_HTTP_ONLY`.

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

`flashValidationErrors()` flashe la saisie sans `password`,
`password_confirmation`, `passwordConfirmation`, `_csrf` ni `_method` : un mot
de passe ne doit pas rester en clair dans le store de session. `flashAll()`
flashe tout ; utilisez `flashExcept()` quand le formulaire a un champ secret.

Les données flash vivent exactement une requête de plus. Cette requête les sort
de la session et réécrit la session sans elles, même si elle ne fait que lire :
un message, ses erreurs de validation et la saisie flashée ne reviennent donc
pas sur la page suivante.

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

Le constructeur de redirection fait les deux étapes via la session de la
requête :

```ts
// dans un middleware d'authentification, sur une page qui exige une connexion
return ctx.response.redirect().withIntendedUrl().toPath('/login')
// …après une connexion réussie
return ctx.response.redirect().toIntended('/dashboard')
```

`withIntendedUrl()` ne retient l'URL que pour un GET qui n'est pas un XHR et qui
a trouvé une route. `toIntended(repli)` et `toIntendedRoute(nom, params)` la
consomment, et tombent sur le repli quand elle manque ou pointe hors du site.

Le driver `redis` reçoit un client, ou nomme une connexion [Quasar](/fr/guides/database/redis) :

```ts
// config/session.ts
export default {
  driver: 'redis',
  connection: 'sessions',   // une connexion quasar ; omettez-la pour la connexion par défaut
  prefix: 'ream:session:',
}
```

Rien n'est ouvert pendant la lecture de la config : la connexion est résolue à la première requête qui touche une session. `@c9up/quasar` est une peer **optionnelle** — les sessions cookie et memory n'y touchent jamais. Une application qui détient déjà un client peut le passer directement via `client` au lieu de nommer une connexion.
