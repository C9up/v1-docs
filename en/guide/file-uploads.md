# File uploads

Ream parses `multipart/form-data` requests through the BodyParser middleware and exposes uploaded files on the request object as `MultipartFile` instances. The API mirrors AdonisJS: you read a file, validate it against a size and extension allowlist, then move it to disk.

## Enabling the parser

File reading requires the `BodyParserMiddleware` to be registered globally in `start/kernel.ts` (this is the default in a scaffolded app). Without it, `request.file()` always returns `null`.

```typescript
import { BodyParserMiddleware } from '@c9up/ream'

const bodyParser = new BodyParserMiddleware()

router.use([
  // ...other global middleware
  (ctx, next) => bodyParser.handle(ctx, next),
  // ...
])
```

## Reading files

Use `request.file(field, options?)` for a single upload and `request.files(field, options?)` for multiple uploads under the same field.

```typescript
const avatar = request.file('avatar')   // MultipartFile | null
const photos = request.files('photos')  // MultipartFile[]
```

`request.file()` returns `null` when no file was sent for that field, so always guard before using it.

## MultipartFile

Every uploaded file is a `MultipartFile` with the following properties:

| Property | Description |
|----------|-------------|
| `clientName` | The original filename from the client — **untrusted**. |
| `size` | Size in bytes. |
| `content` | The file contents as a `Buffer`. |
| `extname` | The extension DETECTED from the file's magic bytes when detectable, otherwise derived from `clientName`. |
| `detectedType` | A trustworthy MIME type inferred from the magic bytes, or `undefined` for text formats that have no magic signature. |
| `type` | The raw `Content-Type` header — **attacker-controlled, do not trust**. |
| `fieldName` | The form field the file was sent under. |
| `errors` | Validation errors collected for this file. |
| `isValid` | `true` when no validation errors are present. |

And the following methods:

| Method | Description |
|--------|-------------|
| `validate({ size?, extnames? })` | Re-run validation against the given constraints. |
| `moveToDisk(directory, name?)` | Persist the file to `directory`, optionally under a new name. |
| `stream()` | Get a readable stream of the file contents. |

## Validation

Pass constraints directly to `request.file()` to validate as you read:

```typescript
const avatar = request.file('avatar', { size: '2mb', extnames: ['jpg', 'png'] })
```

`extnames` is validated against the magic-byte-DETECTED type, not the client filename. A binary renamed `evil.png` is therefore caught — this is AdonisJS parity, implemented via the [`file-type`](https://github.com/sindresorhus/file-type) library.

The canonical controller guard checks all three failure modes:

```typescript
const file = request.file('document', { size: '5mb', extnames: ['pdf', 'docx'] })
if (!file) return response.unprocessableEntity('No file uploaded')
if (file.hasErrors) return response.unprocessableEntity(file.errors)
if (file.size === 0) return response.unprocessableEntity('Uploaded file is empty')
```

::: tip
Rejecting empty (0-byte) uploads is an app-level decision (`422`). Neither Ream nor AdonisJS auto-rejects them, so add the `file.size === 0` check yourself when an empty file is meaningless to your handler.
:::

## Serving uploaded files

::: warning Security
Never use the stored `type` (the `Content-Type` header) as the response `Content-Type`, and never trust it for application logic — use `detectedType` instead.

When serving user-uploaded files:

- Always send `X-Content-Type-Options: nosniff` and respond with a MIME type from your own allowlist.
- Remember that SVG is a **text** format: magic-byte detection CANNOT catch a malicious SVG renamed `.png`. Serving such a file inline can execute embedded scripts (SVG-XSS).

Defend at the serving layer with one or more of:

- `Content-Disposition: attachment` to force a download instead of inline rendering,
- a `Content-Security-Policy: sandbox` header on file responses,
- or, strongest, serving user files from a separate origin / sandbox domain.
:::

## Testing uploads

The test `RequestBuilder` from `@c9up/ream/testing` builds multipart requests with `.file()` and `.field()`. `.field()` adds a multipart field and is distinct from `.form()`, which sends a url-encoded body.

```typescript
const res = await client
  .post('/documents')
  .file('document', pngBuffer, { filename: 'a.png', contentType: 'image/png' })
  .field('title', 'Hello')
  .send()
```

`.file(field, Buffer | string, { filename?, contentType? })` attaches the file part; pass a `Buffer` for binary fixtures or a `string` for text.

## Next steps

- [Configuration](/en/guide/configuration) — register middleware and wire paths
- [Atlas (ORM)](/en/modules/atlas) — persist file metadata alongside your entities
