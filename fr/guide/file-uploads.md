# Envoi de fichiers

Ream analyse les requêtes `multipart/form-data` grâce au middleware BodyParser et expose les fichiers envoyés sur l'objet request sous forme d'instances `MultipartFile`. Vous lisez un fichier, le validez contre une liste blanche de taille et d'extensions, puis le déplacez sur le disque.

## Activer le parser

La lecture des fichiers nécessite que le `BodyParserMiddleware` soit enregistré globalement dans `start/kernel.ts` (c'est le comportement par défaut d'une application générée). Sans lui, `request.file()` renvoie toujours `null`.

```typescript
import { BodyParserMiddleware } from '@c9up/ream'

const bodyParser = new BodyParserMiddleware()

router.use([
  // ...autres middlewares globaux
  (ctx, next) => bodyParser.handle(ctx, next),
  // ...
])
```

### Le configurer

```typescript
const bodyParser = new BodyParserMiddleware({
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  json:      { limit: '1mb' },
  form:      { limit: '1mb' },
  raw:       { limit: '1mb' },
  multipart: { limit: '20mb', maxFields: 1000, maxFiles: 1000 },
})
```

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
propre réponse : ton gestionnaire d'exceptions négocie donc la réponse — une app
HTML reçoit une page d'erreur plutôt qu'une enveloppe JSON qu'elle n'a jamais
demandée, et peut surcharger le rendu.

Le serveur natif applique la même `limit` de chaque section — lue dans
`config/bodyparser.ts` — pendant qu'il lit le corps : un `content-length`
au-delà de la limite n'est pas lu du tout, et un corps chunked cesse d'être
gardé dès qu'il la dépasse. Dans les deux cas rien au-delà de la limite n'est
gardé en mémoire, et la requête passe quand même par le routage, sans son
corps. Une URL inconnue répond 404 ; sur une route trouvée, le body parser lève
le 413 ci-dessus, rendu par ton gestionnaire d'exceptions. Une route qui ne lit
jamais le corps n'en paie pas le prix, et une route qui le lit —
`request.raw()`, `body()`, `all()`, `input()` — reçoit le même 413 plutôt qu'un
corps vide pris pour le vrai. Un type de contenu qu'aucune section ne
revendique reçoit la limite `raw`.

Un parser se désactive en ne lui donnant aucun type — il n'y a pas de drapeau
`enabled`, et en passer un échoue bruyamment plutôt que de réactiver en silence
un parser que tu avais coupé :

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
Choisis la destination au moment de stocker le fichier :
`await file.moveToDisk(directory)`.
:::

## Lire les fichiers

Utilisez `request.file(field, options?)` pour un seul fichier et `request.files(field, options?)` pour plusieurs fichiers sous le même champ.

```typescript
const avatar = request.file('avatar')   // MultipartFile | null
const photos = request.files('photos')  // MultipartFile[]
```

`request.file()` renvoie `null` lorsqu'aucun fichier n'a été envoyé pour ce champ, alors protégez-vous toujours avant de l'utiliser.

## MultipartFile

Chaque fichier envoyé est un `MultipartFile` doté des propriétés suivantes :

| Propriété | Description |
|-----------|-------------|
| `clientName` | Le nom de fichier original fourni par le client — **non fiable**. |
| `size` | Taille en octets. |
| `content` | Le contenu du fichier sous forme de `Buffer`. |
| `extname` | L'extension DÉTECTÉE à partir des magic bytes du fichier lorsque c'est possible, sinon dérivée de `clientName`. |
| `detectedType` | Un type MIME fiable déduit des magic bytes, ou `undefined` pour les formats texte qui n'ont pas de signature magique. |
| `mime` | Le mime complet à valider — `image/png`. Lu dans les octets magiques. |
| `type` | Le type mime PRIMAIRE — `image` pour `image/png`. Même source fiable. |
| `subtype` | Le sous-type mime — `png` pour `image/png`. |
| `headers` | Les en-têtes de la partie. Rust ne transmet aujourd'hui que `content-type`. |
| `hasErrors` | L'inverse de `isValid`. |
| `isMultipartFile` | Toujours `true` — distingue un fichier d'un champ ordinaire. |
| `state` | `idle`, `streaming`, `consumed` ou `moved`. |
| `filePath` / `fileName` | Où le fichier a atterri, une fois déplacé. |
| `sizeLimit` / `allowedExtensions` | Règles qu'un `validate()` sans argument appliquera. |
| `fieldName` | Le champ de formulaire sous lequel le fichier a été envoyé. |
| `errors` | Les erreurs de validation collectées pour ce fichier. |
| `isValid` | `true` lorsqu'aucune erreur de validation n'est présente. |

::: danger `type` a changé de sens
Il portait `image/png` en entier ; il porte désormais `image`, avec
`subtype` à côté. TypeScript ne peut rien y faire : une
comparaison telle que `file.type === 'image/png'` ne casse pas à la
compilation, elle cesse simplement de correspondre.
Cherche-la dans ton code, et utilise **`file.mime`** pour une liste blanche.

Une app a vécu exactement ça : `if (!ALLOWED_MIME.has(file.type)) reject()`
compilait, ne correspondait plus, et tous les téléversements d'avatar sont morts
en silence parce qu'aucun test ne couvrait le cas qui doit PASSER. Une porte de
validation sans test du cas passant est une porte qui peut se fermer toute
seule.
:::

::: tip Ces champs lisent les octets, pas l'en-tête
`mime`, `type` et `subtype` sont dérivés des octets magiques du fichier, avec
repli sur l'en-tête `Content-Type` seulement pour un contenu sans signature (les
formats texte). C'est cette précédence qui compte :
l'en-tête est écrit par le client, donc un `.exe` annoncé `image/png` passerait
sinon une liste blanche de mimes. Un fichier renommé rapporte ce qu'il est
vraiment. L'en-tête tel qu'envoyé reste sur `file.headers['content-type']`.
:::

Et des méthodes suivantes :

| Méthode | Description |
|---------|-------------|
| `validate({ size?, extnames? })` | Relance la validation contre les contraintes données. |
| `move(location, { name?, overwrite? })` | Écrit le fichier dans `location`. Crée le répertoire, écrase par défaut. |
| `moveToDisk(directory, name?)` | La même chose, en renvoyant le chemin écrit. |
| `markAsMoved(fileName, filePath)` | Enregistrer un déplacement fait soi-même. |
| `stream()` | Obtient un flux lisible du contenu du fichier. |

`move()` refuse tout `name` qui n'est pas un nom de fichier simple — pas de
séparateur, pas de `.` ni `..`. Le piège qu'il couvre est
`await file.move(dir, { name: file.clientName })`, où un nom client
`../../etc/passwd` sortirait du répertoire.

::: tip Pas de fichier temporaire
Ream garde les octets en mémoire — `multipart.tmpDir` est refusé à la construction —
donc `move()` écrit le tampon. Il n'y a pas de `E_MISSING_FILE_TMP_PATH` ici :
il n'y a aucun fichier temporaire qui pourrait manquer.
:::

## Validation

Passez les contraintes directement à `request.file()` pour valider au moment de la lecture :

```typescript
const avatar = request.file('avatar', { size: '2mb', extnames: ['jpg', 'png'] })
```

`extnames` est validé contre le type DÉTECTÉ à partir des magic bytes, pas contre le nom de fichier du client. Un binaire renommé `evil.png` est donc rejeté — la détection passe par la bibliothèque [`file-type`](https://github.com/sindresorhus/file-type).

Le garde-fou canonique dans un contrôleur vérifie les trois modes d'échec :

```typescript
const file = request.file('document', { size: '5mb', extnames: ['pdf', 'docx'] })
if (!file) return response.unprocessableEntity('No file uploaded')
if (file.hasErrors) return response.unprocessableEntity(file.errors)
if (file.size === 0) return response.unprocessableEntity('Uploaded file is empty')
```

::: tip
Rejeter les envois vides (0 octet) est une décision applicative (`422`). Ream ne les rejette pas automatiquement, alors ajoutez vous-même la vérification `file.size === 0` lorsqu'un fichier vide n'a aucun sens pour votre handler.
:::

## Servir les fichiers envoyés

::: warning Sécurité
N'utilisez jamais l'en-tête envoyé par le client (`file.headers['content-type']`) comme `Content-Type` de la réponse, et ne vous y fiez jamais pour la logique applicative — `file.mime` (lu dans les octets) est la valeur de confiance, et `file.typeSource === 'detected'` indique que les octets ont bien été reconnus.

Lorsque vous servez des fichiers envoyés par les utilisateurs :

- Envoyez toujours `X-Content-Type-Options: nosniff` et répondez avec un type MIME issu de votre propre liste blanche.
- Souvenez-vous que SVG est un format **texte** : la détection par magic bytes NE PEUT PAS attraper un SVG malveillant renommé `.png`. Servir un tel fichier en inline peut exécuter des scripts embarqués (SVG-XSS).

Défendez-vous au niveau de la couche de service avec une ou plusieurs des options suivantes :

- `Content-Disposition: attachment` pour forcer un téléchargement au lieu d'un rendu inline,
- un en-tête `Content-Security-Policy: sandbox` sur les réponses de fichiers,
- ou, le plus robuste, servir les fichiers utilisateurs depuis une origine / un domaine sandbox séparé.
:::

## Tester les envois

Le `RequestBuilder` de test issu de `@c9up/ream/testing` construit des requêtes multipart avec `.file()` et `.field()`. `.field()` ajoute un champ multipart et se distingue de `.form()`, qui envoie un corps url-encodé.

```typescript
const res = await client
  .post('/documents')
  .file('document', pngBuffer, { filename: 'a.png', contentType: 'image/png' })
  .field('title', 'Hello')
  .send()
```

`.file(field, Buffer | string, { filename?, contentType? })` attache la partie fichier ; passez un `Buffer` pour les fixtures binaires ou une `string` pour du texte.

## Servir des fichiers

`response.download(chemin)` et `response.attachment(chemin, nom)` envoient un
fichier, `response.stream(readable)` envoie tout ce qui se streame.

Les morceaux partent sur la socket **à mesure qu'ils sont lus** — rien de plus
gros qu'un morceau n'est jamais retenu, la taille d'un fichier cesse donc d'être
le plafond mémoire du process :

```typescript
router.get('/exports/:id', async ({ response, params }) => {
  response.header('content-type', 'text/csv')
  await response.stream(createReadStream(exportPath(params.id)))
})

router.get('/invoices/:id', ({ response, params }) => {
  response.attachment(invoicePath(params.id), 'facture.pdf')
})
```

Un fichier absent répond toujours **404** : `download()` fait un `stat` avant
qu'un seul en-tête ne parte, car une fois le flux démarré il n'y a plus de
statut à changer. Demander un ETag (`download(chemin, true)`) bufferise à la
place — un hachage exige le fichier entier — donc à éviter sur du volumineux.

Si le client se déconnecte, la lecture de la source s'arrête : on ne pompe pas
un fichier entier dans une socket que plus personne ne lit.

### Le plafond du corps bufferisé

Certains corps ne sont pas streamés : `response.send(buffer)`, une charge JSON,
un téléchargement avec ETag, ou un `stream()` sur un hôte sans backend de
streaming (un test unitaire, un serveur simulé). Ceux-là sont gardés entiers en
mémoire et encodés en base64 au passage de la frontière NAPI — environ **2,3×
leur taille** en mémoire transitoire.

Au-delà du plafond ils lèvent `E_RESPONSE_TOO_LARGE` au lieu de grossir jusqu'à
ce que le process meure :

```typescript
// 100 Mo par défaut.
{ maxResponseBytes: 100 * 1024 * 1024 }
```

Un corps **streamé** ne s'assemble jamais : le plafond ne le concerne pas.

::: tip Ou court-circuiter le serveur
Pour des fichiers qu'une app ne fait que stocker puis resservir, une **URL
signée** via `@c9up/archive` vaut mieux que les deux : le client va les chercher
directement dans le stockage, et les octets ne passent jamais par le serveur.
:::

## Étapes suivantes

- [Configuration](/fr/guide/configuration) — enregistrer les middlewares et configurer les chemins
- [Atlas (ORM)](/fr/modules/atlas) — persister les métadonnées de fichier aux côtés de vos entités
