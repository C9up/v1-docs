# Parseur de corps

Ce guide couvre le parseur de corps de requête et ses limites.

## Activer le parser

Le body parser est la seule chose qui lit le corps d'une requête — JSON, formulaires url-encoded, texte et multipart. Enregistrez-le comme middleware routeur dans `start/kernel.ts` (une application `api` ou `web` générée le fait déjà). Sans lui, `request.body()` vaut `{}`, `request.input()` et `request.all()` ne voient que la chaîne de requête, et `request.file()` renvoie toujours `null`.

```typescript
// start/kernel.ts
router.use([
  () => import('@c9up/ream/bodyparser_middleware'),
  // ...autres middlewares routeur
])
```

Un corps JSON n'est analysé que si son Content-Type fait partie de `json.types` (`application/json`, `application/json-patch+json`, `application/vnd.api+json` et `application/csp-report` par défaut). Un corps envoyé sans Content-Type, ou en `text/plain` — ce qu'une page étrangère peut envoyer avec les cookies du visiteur et sans preflight CORS — n'est jamais lu comme du JSON.

Un corps JSON mal formé est refusé avec `400 E_BODYPARSER_INVALID_JSON` avant que votre handler ne s'exécute. Avec `json.strict` (actif par défaut), le corps doit être un objet ou un tableau ; toute autre valeur JSON est refusée avec un 422. Un tableau, ou un scalaire une fois `strict` coupé, est rangé sous `_body`. Une clé `__proto__`, et une clé `constructor` portant un `prototype`, sont retirées au parsing : copier le corps sur un objet avec `Object.assign` ou une fusion profonde ne peut donc pas remplacer le prototype de cet objet.

`trimWhitespaces` et `convertEmptyStringsToNull` sont actifs par défaut pour `json`, `form` et `multipart` : chaque valeur texte est débarrassée de ses espaces de bord, et une valeur vide devient `null`. Les clés restent telles qu'envoyées. Coupez l'un ou l'autre dans la section correspondante de la configuration.

### Le configurer

Enregistré ainsi, le middleware lit ses réglages dans `config/bodyparser.ts` :

```typescript
// config/bodyparser.ts
import { defineConfig } from '@c9up/ream/bodyparser/config'

export default defineConfig({
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  json:      { limit: '1mb' },
  form:      { limit: '1mb' },
  raw:       { limit: '1mb' },
  multipart: { limit: '20mb', maxFields: 1000, maxFiles: 1000 },
})
```

`new BodyParserMiddleware({ ... })` prend le même objet quand vous construisez le middleware vous-même.

`allowedMethods` décide quelles requêtes voient leur corps parsé — il
prend les quatre ci-dessus par défaut, si bien qu'un GET portant un
content-type JSON est laissé intact. Une requête dont le `content-length` dit
qu'il n'y a pas de corps est sautée aussi.

Un corps url-encoded est parsé avec l'imbrication par crochets (`user[name]`,
`tags[]`), et la query string lue par `request.qs()` passe par le même parseur.
Pour les corps de formulaire, ses limites se règlent sous `form.queryString` ; `request.qs()` garde les valeurs par défaut :

| Option | Défaut | Effet |
| --- | --- | --- |
| `depth` | `5` | Au-delà de cette profondeur, le reste devient une clé littérale. |
| `parameterLimit` | `1000` | Les paires au-delà de ce nombre sont ignorées. |
| `arrayLimit` | `20` | Un indice explicite égal ou supérieur devient une clé d'objet, pas une case de tableau : `ids[500]=x` donne `{ ids: { '500': 'x' } }`. Les ajouts (`tags[]`) restent des tableaux. |
| `allowDots` | `true` | `user.name` s'imbrique comme `user[name]`. |

Chaque limite **lève** `E_REQUEST_ENTITY_TOO_LARGE` (413) au lieu d'écrire sa
propre réponse : votre gestionnaire d'exceptions négocie donc la réponse — une app
HTML reçoit une page d'erreur plutôt qu'une enveloppe JSON qu'elle n'a jamais
demandée, et peut surcharger le rendu.

Le serveur natif applique la même `limit` de chaque section — lue dans
`config/bodyparser.ts` — pendant qu'il lit le corps : un `content-length`
au-delà de la limite n'est pas lu du tout, et un corps chunked cesse d'être
gardé dès qu'il la dépasse. Dans les deux cas rien au-delà de la limite n'est
gardé en mémoire, et la requête passe quand même par le routage, sans son
corps. Une URL inconnue répond 404 ; sur une route trouvée, le body parser lève
le 413 ci-dessus, rendu par votre gestionnaire d'exceptions. Une route qui ne lit
jamais le corps n'en paie pas le prix, et une route qui le lit —
`request.raw()`, `body()`, `all()`, `input()` — reçoit le même 413 plutôt qu'un
corps vide pris pour le vrai. Un type de contenu qu'aucune section ne
revendique reçoit la limite `raw`.

Un parser se désactive en ne lui donnant aucun type — il n'y a pas de drapeau
`enabled`, et en passer un échoue bruyamment plutôt que de réactiver en silence
un parser que vous aviez coupé :

```typescript
new BodyParserMiddleware({ raw: { types: [] } })   // aucun parsing raw
```

::: tip Pourquoi maxFiles
Borner un corps multipart par la seule taille totale et le nombre de champs
laisse passer dix mille fichiers d'un octet. `maxFiles` est une borne
anti-déni-de-service, à la même échelle que `maxFields`.
:::

::: warning Pas de `multipart.tmpDir`
Les fichiers envoyés sont gardés en mémoire et ne sont jamais écrits dans un
répertoire temporaire — le parseur multipart Rust rend le corps d'un bloc.
L'option était acceptée et lue par rien : une app la pointant vers un volume
n'obtenait silencieusement rien. Elle est désormais refusée à la construction.
Choisissez la destination au moment de stocker le fichier :
`await file.move(directory)` sur le système de fichiers local, ou
`await file.moveToDisk(key)` dans un disque de stockage (voir plus bas).
:::
