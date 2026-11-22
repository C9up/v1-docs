# Construction d’URL et URL signées

Ce guide couvre les routes nommées, la construction des URL et leur signature :

- Routes nommées
- URLs signées

## Routes nommées

Nommez une route avec `.as()`, puis construisez les URL depuis le nom avec `urlFor` — sans jamais coder les chemins en dur :

```typescript
router.get('/users/:id', [UsersController, 'show']).as('users.show')

const url = router.urlFor('users.show', { id: '42' })
// → /users/42
```

> `router.makeUrl()` est un alias **déprécié** de `urlFor()`. Préférez `urlFor`.

Les routes de ressource sont nommées automatiquement : `posts.index`, `posts.store`, `posts.show`, `posts.update`, `posts.destroy`.

### Construire une URL morceau par morceau

`urlFor` prend tout d'un coup. Quand les morceaux arrivent séparément — les
params ici, une query string là, un préfixe venu de la config —
`router.builder()` est la forme fluide :

```typescript
router.builder().params({ id: '42' }).qs({ tab: 'posts' }).make('users.show')
// → /users/42?tab=posts

router.builderForDomain('https://acme.test').params({ id: '42' }).make('users.show')
// → https://acme.test/users/42

router.builder().prefixUrl('https://acme.test').makeSigned('invite', { expiresIn: '1h' })
// signée, avec la query string intégrée à la signature

router.builder().disableRouteLookup().make('/un/chemin/litteral')
```

Il s'appuie sur `urlFor` et `makeSignedUrl` : un param manquant échoue de la
même façon quelle que soit l'écriture choisie.

### Inspecter la table de routes

```typescript
router.toJSON()        // { root: [...routes], 'blog.example.com': [...] }
router.usingDomains    // une route est-elle scopée à un domaine ?
router.parsePattern('/posts/:id?')   // [{ name: 'id', optional: true }]
router.commit()        // construire l'index maintenant, pas à la 1re requête
router.commited        // est-il construit ?
```

`toJSON()` groupe par domaine servi, avec `root` pour celles qui répondent
partout — ce que lit une liste de routes, un générateur OpenAPI ou un écran de
debug.

### URL côté navigateur

Pour construire les mêmes URL côté client, sérialisez la map des routes nommées avec `router.namedManifest()` (seules les routes **nommées** sont exposées — les autres restent privées au serveur) et passez-la au rendu de page ; le `urlFor` isomorphe d'Aurora résout dessus. Voir [Aurora → constructeur d'URL](/fr/guides/frontend/aurora/browser#constructeur-d-url-—-urlfor).

```typescript
const routes = router.namedManifest()
// → { 'users.show': '/users/:id', ... }
```

## URLs signées

`SignedUrl` (depuis `@c9up/ream/security`) émet des URLs signées en
HMAC-SHA256 avec une expiration optionnelle. Le handler récepteur
appelle `verify()` pour redériver la signature et rejeter les liens
tampérés ou expirés.

```ts
import { SignedUrl } from '@c9up/ream/security'
import env from '#start/env.js'

// SIGNING_SECRET est déclaré Env.schema.secret() dans start/env.ts : une valeur absente refuse le démarrage
const su = new SignedUrl({ secret: env.get('SIGNING_SECRET').release() })

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

Un token émis pour un purpose ne peut pas être rejoué contre un autre, et la
correspondance est exacte dans les deux sens : une URL avec purpose échoue à un
`verify()` (ou `request.hasValidSignature()`) qui n'en nomme aucun, et une URL
sans purpose échoue à un contrôle qui en nomme un.

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
