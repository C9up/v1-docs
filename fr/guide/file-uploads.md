# Envoi de fichiers

Ream analyse les requêtes `multipart/form-data` grâce au middleware BodyParser et expose les fichiers envoyés sur l'objet request sous forme d'instances `MultipartFile`. L'API reflète AdonisJS : vous lisez un fichier, le validez contre une liste blanche de taille et d'extensions, puis le déplacez sur le disque.

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
| `type` | L'en-tête `Content-Type` brut — **contrôlé par l'attaquant, ne pas s'y fier**. |
| `fieldName` | Le champ de formulaire sous lequel le fichier a été envoyé. |
| `errors` | Les erreurs de validation collectées pour ce fichier. |
| `isValid` | `true` lorsqu'aucune erreur de validation n'est présente. |

Et des méthodes suivantes :

| Méthode | Description |
|---------|-------------|
| `validate({ size?, extnames? })` | Relance la validation contre les contraintes données. |
| `moveToDisk(directory, name?)` | Enregistre le fichier dans `directory`, éventuellement sous un nouveau nom. |
| `stream()` | Obtient un flux lisible du contenu du fichier. |

## Validation

Passez les contraintes directement à `request.file()` pour valider au moment de la lecture :

```typescript
const avatar = request.file('avatar', { size: '2mb', extnames: ['jpg', 'png'] })
```

`extnames` est validé contre le type DÉTECTÉ à partir des magic bytes, pas contre le nom de fichier du client. Un binaire renommé `evil.png` est donc rejeté — c'est la parité avec AdonisJS, implémentée via la bibliothèque [`file-type`](https://github.com/sindresorhus/file-type).

Le garde-fou canonique dans un contrôleur vérifie les trois modes d'échec :

```typescript
const file = request.file('document', { size: '5mb', extnames: ['pdf', 'docx'] })
if (!file) return response.unprocessableEntity('No file uploaded')
if (file.hasErrors) return response.unprocessableEntity(file.errors)
if (file.size === 0) return response.unprocessableEntity('Uploaded file is empty')
```

::: tip
Rejeter les envois vides (0 octet) est une décision applicative (`422`). Ni Ream ni AdonisJS ne les rejettent automatiquement, alors ajoutez vous-même la vérification `file.size === 0` lorsqu'un fichier vide n'a aucun sens pour votre handler.
:::

## Servir les fichiers envoyés

::: warning Sécurité
N'utilisez jamais le `type` stocké (l'en-tête `Content-Type`) comme `Content-Type` de la réponse, et ne vous y fiez jamais pour la logique applicative — utilisez plutôt `detectedType`.

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

## Étapes suivantes

- [Configuration](/fr/guide/configuration) — enregistrer les middlewares et configurer les chemins
- [Atlas (ORM)](/fr/modules/atlas) — persister les métadonnées de fichier aux côtés de vos entités
