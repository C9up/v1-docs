# Ream — Core Framework

Ream (`@c9up/ream`) est le noyau du framework: bootstrap applicatif, IoC, providers, serveur HTTP, pipeline middleware, erreurs, lifecycle et orchestration des modules (`atlas`, `rune`, `warden`, `spectrum`, etc.).

> Statut: en evolution active. L'objectif est une DX proche Adonis/Laravel, avec une architecture modulaire agnostique.

## Ce que le core fait vraiment

1. Initialise et configure l'application via `Ignitor`.
2. Charge la configuration et les providers.
3. Monte le router, le kernel HTTP et le serveur.
4. Exécute le lifecycle (`register -> boot -> start -> ready -> shutdown`).
5. Fournit les primitives de framework (container, middleware, exceptions, services).

## Bootstrap minimal

```ts
import { Ignitor } from '@c9up/ream'

await new Ignitor({ port: 3333 })
  .httpServer()
  .routes((router) => {
    router.get('/health', (ctx) => {
      ctx.response.status(200).json({ ok: true })
    })
  })
  .start()
```

## Modes d'execution

- `httpServer()` pour API/web.
- `console()` pour commandes CLI.
- `testMode()` pour scenarios de test.

```ts
const ignitor = new Ignitor({ port: 3333 }).httpServer()
await ignitor.start()
```

## Lifecycle (important)

Ordre d'execution:

1. `register` - bind container, config, providers.
2. `boot` - initialisation dependances externes.
3. `start` - demarrage server / runtime.
4. `ready` - application operationnelle.
5. `shutdown` - fermeture propre.

Regle pratique:

- `register`: pas d'IO bloquant.
- `boot`: connexions DB/bus/cache.
- `shutdown`: close ressources, timeouts, workers.

## Providers (pattern recommande)

```ts
import { Provider } from '@c9up/ream'
import { CacheManager, MemoryDriver } from '@c9up/echo'

export default class AppProvider extends Provider {
  register() {
    this.app.container.singleton('cache', () => {
      return new CacheManager(new MemoryDriver(), { prefix: 'app', ttl: 300 })
    })
  }
}
```

## Container IoC

Le container sert a:

- enregistrer des singletons/services,
- resoudre les dependances des classes,
- remplacer des implementations (tests/env).

Bonnes pratiques:

- binder par token stable (`'cache'`, `'db'`, `'bus'`),
- eviter les side effects dans les factories,
- centraliser les bindings dans les providers.

## Routing et middleware

```ts
await new Ignitor()
  .httpServer()
  .use(async (ctx, next) => {
    const start = Date.now()
    await next()
    ctx.response.header('x-duration-ms', String(Date.now() - start))
  })
  .routes((router) => {
    router.get('/users/:id', async (ctx) => {
      ctx.response.json({ id: ctx.params.id })
    })
  })
  .start()
```

Pipeline recommande:

1. middleware techniques (request-id, timing, body parser),
2. middleware securite (cors, headers, rate limit, shield),
3. middleware auth/acl,
4. logique metier route/controller.

## Gestion des erreurs

Utiliser les exceptions framework (`E_UNAUTHORIZED`, `E_FORBIDDEN`, etc.) et un handler central.

```ts
import { E_UNAUTHORIZED } from '@c9up/ream'

if (!token) {
  throw new E_UNAUTHORIZED('Bearer token required')
}
```

Regles:

- ne pas retourner d'erreur brute interne au client,
- logger le contexte utile sans fuite de secrets,
- mapper les erreurs metier vers des codes HTTP coherents.

## Services exposes par le core

Le core exporte notamment:

- `Ignitor`, `Application`, `Provider`,
- `Router`, `Server`, `HttpContext`, `Request`, `Response`,
- `MiddlewareRegistry`,
- `ReamError` et exceptions HTTP,
- utilitaires lifecycle (`HealthCheck`, graceful shutdown, hot reload).

## Valider une requête

`request.validateUsing(validator)` passe un validateur sur la requête — corps et
query fusionnés, avec `params`, `headers` et `cookies` imbriqués sous leurs
propres clés, pour qu'un champ de formulaire ne puisse jamais renommer un
paramètre de route.

```typescript
const data = await request.validateUsing(CreateUser)
```

Il lève `E_VALIDATION_ERROR` en cas d'échec ; `tryValidateUsing` répond plutôt
`[erreur, null]` / `[null, data]`, pour un handler qui réaffiche lui-même le
formulaire.

Deux hooks rendent un validateur conscient de la requête sans que le schéma en
sache quoi que ce soit. Un paquet les installe une fois, au boot :

```typescript
import { RequestValidator } from '@c9up/ream'

RequestValidator.messagesProvider = (ctx) => ctx.i18n.createMessagesProvider()
RequestValidator.errorReporter = (ctx) => ctx.myReporter
```

Une option passée à l'appel l'emporte sur le hook, et rien d'autre dans le
framework ne les lit : un validateur appelé directement garde ce avec quoi il a
été construit.

## URLs signées

`SignedUrl` (depuis `@c9up/ream/security`) émet des URLs signées en
HMAC-SHA256 avec une expiration optionnelle. Le handler récepteur
appelle `verify()` pour redériver la signature et rejeter les liens
tampérés ou expirés.

```ts
import { SignedUrl } from '@c9up/ream/security'

const su = new SignedUrl({ secret: process.env.SIGNING_SECRET! })

// Lien d'1h vers /downloads/<id>
const url = su.make('/downloads/abc-123', { expiresIn: '1h' })

// Côté handler de vérification
if (!su.verify(req.url)) {
  return res.status(403).json({ error: 'E_BAD_SIGNATURE' })
}
```

`expiresIn` accepte un nombre de secondes ou une chaîne suffixée
(`s`/`m`/`h`/`d`). `expiresIn: 0` stampe l'epoch courant comme
expiration — l'URL est valide pour la seconde courante seulement, et
devient invalide dès que l'horloge avance. L'ancienne garde truthy
traitait silencieusement `0` comme « pas d'expiration », ce qui était
un bug de sécurité ; le comportement actuel respecte l'intention de
l'appelant.

`purpose` lie l'URL à un flow nommé :

```ts
const reset = su.make('/auth/reset', { expiresIn: '30m', purpose: 'pwd-reset' })
if (!su.verify(reset, 'pwd-reset')) return /* 403 */
```

Un token émis pour un purpose ne peut pas être rejoué contre un autre.

### Ce que chaque module charge automatiquement

`modules.autoload` nomme ce qui est importé depuis chaque répertoire de module,
et c'est l'import qui enregistre le code à base de décorateurs :

```ts
// reamrc.ts
modules: { path: 'app/modules', autoload: ['routes', 'events', 'services/'] }
```

Une entrée nomme un **fichier** (`routes` → `routes.ts`) ou, **avec une barre
oblique finale**, un **répertoire** (`services/` → tous les `.ts`/`.js` dessous,
récursivement, en une seule passe alphabétique). Les `.d.ts` sont ignorés : ils
déclarent des types et n'exécutent rien.

La barre est obligatoire, jamais déduite. Se rabattre sur un répertoire du même
nom ferait exécuter, à une application dont un module contient `routes/` en
dossier, tous les fichiers qu'il renferme le jour de sa mise à jour — sans
qu'elle ait rien demandé.

C'est la forme répertoire qui rend `@Schedule()` et consorts découvrables. Un
décorateur s'enregistre quand son module est importé, pas avant : une tâche
planifiée dans un fichier que personne n'importe n'est jamais trouvée — et
l'application démarre parfaitement, la tâche simplement absente. Nommer son
répertoire ici, c'est ce qui l'importe ; un préchargement écrit à la main fait
le même travail à la main.

Une entrée qui ne correspond à rien dans **aucun** module est signalée au
démarrage. Un module sans `routes.ts` est normal et reste silencieux ; un nom
qui n'existe nulle part est une faute de frappe dont le seul autre symptôme est
une tâche qui ne se déclenche jamais.

## Fichiers statiques

Enregistre le provider et `public/` est servi — c'est toute l'installation.

```ts
// reamrc.ts
providers: [() => import('@c9up/ream/storage/provider')]
```

`public/logo.png` répond alors à `GET /logo.png`. Aucune route n'est déclarée
pour lui, et une requête qui ne correspond à aucun fichier passe au routeur sans
être touchée.

Les défauts, réglables dans `config/static.ts` :

```ts
import { defineStaticConfig } from '@c9up/ream'

export default defineStaticConfig({
  maxAge: 86_400_000,   // millisecondes ; `Cache-Control: max-age` est en secondes
  immutable: true,      // honoré uniquement avec un maxAge
})
```

| Option | Défaut | Rôle |
| --- | --- | --- |
| `enabled` | `true` | `false` fait tout passer au suivant |
| `root` | `public/` | Répertoire servi |
| `acceptRanges` | `true` | `206` sur `Range`, pour se déplacer dans un audio ou une vidéo |
| `cacheControl` | `true` | Émet `Cache-Control` ; `false` ignore `maxAge` et `immutable` |
| `dotFiles` | `'ignore'` | `'deny'` répond 403, `'allow'` les sert |
| `etag` | `true` | `ETag` et `If-None-Match` |
| `extensions` | aucune | Liste de **repli** : `['html']` fait servir `about.html` sur `/about` |
| `immutable` | `false` | Ajoute `immutable` au `Cache-Control` |
| `index` | `'index.html'` | Fichier d'index d'un répertoire ; `false` désactive |
| `lastModified` | `true` | `Last-Modified` et `If-Modified-Since` |
| `maxAge` | `0` | Millisecondes |
| `prefix` | aucun | Ne servir que sous un préfixe d'URL |

`extensions` est une liste de repli, pas une liste blanche — il n'y a pas de
liste blanche et toutes les extensions sont servies. Ce qui garde un fichier
privé, c'est de ne pas le publier ici.

### Ce qui est inatteignable

Une requête ne peut pas sortir de la racine. La traversée est normalisée avant
toute ouverture, formes encodées comprises (`%2e%2e%2f`), et une séquence
malformée est refusée plutôt que levée. Un lien symbolique placé dans la racine
et pointant dehors est refusé, fichier comme répertoire, de même qu'un
répertoire voisin qui partage seulement un préfixe de nom avec la racine.

Le fichier est ouvert avec `O_NOFOLLOW` et ses métadonnées lues sur le
descripteur plutôt que relues par chemin : les octets servis sont donc ceux qui
ont passé les contrôles — un lien substitué après coup fait échouer l'ouverture
au lieu de détourner la lecture.

Les fichiers cachés sont ignorés par défaut, donc un `.env` qui atterrit dans le
répertoire servi n'est pas publié par accident. Un fichier sans point initial
l'est : le répertoire est le répertoire public.

## Integration modules

Le core est l'orchestrateur. Les modules restent utilisables seuls, mais Ream simplifie leur composition:

- `atlas` pour ORM,
- le bus d'événements (core),
- `warden` pour auth,
- `rune` pour validation,
- `spectrum` pour logging,
- `echo` pour cache,
- `bay` pour queue/jobs.

## Checklist production

1. `NODE_ENV=production`.
2. Security middleware actif (shield/rate limit/cors configure).
3. Exception handling centralise et non verbeux.
4. Graceful shutdown verifie (SIGTERM/SIGINT).
5. Timeouts explicites (DB, HTTP externes, jobs).
6. Correlation ID present dans logs et erreurs.
7. Endpoints health/readiness utilises en orchestration.

## Limites actuelles connues

- surface API encore en evolution,
- certaines zones de doc restent moins profondes que la cible,
- convergence continue vers des conventions plus strictes type Adonis.

## Liens utiles

- Guide lifecycle: `/fr/guide/lifecycle`
- Guide providers: `/fr/guide/providers`
- Guide routing: `/fr/guide/routing`
- Guide middleware: `/fr/guide/middleware`
- Corrections package ream: `/fr/corrections/ream`
