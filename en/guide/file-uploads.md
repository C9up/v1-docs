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

### Configuring it

```typescript
const bodyParser = new BodyParserMiddleware({
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  json:      { limit: '1mb' },
  form:      { limit: '1mb' },
  raw:       { limit: '1mb' },
  multipart: { limit: '20mb', maxFields: 1000, maxFiles: 1000 },
})
```

`allowedMethods` decides which requests get a body parsed at all — AdonisJS
defaults to the four above, so a GET carrying a JSON content-type is left
untouched. A request whose `content-length` says there is no body is skipped too.

Every limit **throws** `E_REQUEST_ENTITY_TOO_LARGE` (413) rather than writing its
own response, so your exception handler negotiates the reply: an HTML app gets an
error page instead of a JSON envelope it never asked for, and can override the
rendering.

A parser is turned off by giving it no types — there is no `enabled` flag, and
passing one fails loudly rather than quietly re-enabling a parser you switched
off:

```typescript
new BodyParserMiddleware({ raw: { types: [] } })   // no raw parsing
```

::: tip maxFiles is ours
AdonisJS bounds a multipart body by total size and field count only, so ten
thousand one-byte files pass. `maxFiles` is a denial-of-service bound at the same
scale as `maxFields`, so it never rejects an upload AdonisJS would have accepted.
:::

::: warning No `multipart.tmpDir`
Uploaded files are held in memory and never written to a temporary directory —
the Rust multipart parser hands the body over whole. The option was accepted and
read by nothing, so an app pointing it at a volume was silently getting nothing;
it is now refused at construction. Choose the destination when you store the
file: `await file.moveToDisk(directory)`.
:::

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
| `type` | The PRIMARY mime type — `image` for `image/png`. **Attacker-controlled, do not trust.** |
| `subtype` | The mime subtype — `png` for `image/png`. Equally untrusted. |
| `headers` | The part's headers. Rust forwards only `content-type` today. |
| `fieldName` | The form field the file was sent under. |
| `errors` | Validation errors collected for this file. |
| `isValid` | `true` when no validation errors are present. |
| `hasErrors` | The inverse of `isValid`. |
| `isMultipartFile` | Always `true` — tells a file apart from a plain field. |
| `state` | `idle`, `streaming`, `consumed` or `moved`. |
| `filePath` / `fileName` | Where the file went, once it has been moved. |
| `sizeLimit` / `allowedExtensions` | Rules a bare `validate()` will apply. |

::: danger `type` changed meaning
It used to hold the whole `image/png`; it now holds `image`, matching AdonisJS,
with `subtype` alongside. TypeScript cannot catch this — a comparison like
`file.type === 'image/png'` does not fail to compile, it simply never matches
again. Search your code for it. The full header is still on
`file.headers['content-type']`, and `detectedType` remains the one you should
actually be branching on.
:::

And the following methods:

| Method | Description |
|--------|-------------|
| `validate({ size?, extnames? })` | Re-run validation. Called bare, it uses `sizeLimit` / `allowedExtensions`. |
| `move(location, { name?, overwrite? })` | Persist the file to `location`. Creates the directory, overwrites by default. |
| `moveToDisk(directory, name?)` | The same thing, returning the path it wrote. |
| `markAsMoved(fileName, filePath)` | Record a move you performed yourself. |
| `stream()` | Get a readable stream of the file contents. |

`move()` refuses any `name` that is not a plain filename — no separators, no
`.` or `..`. The footgun it exists for is `await file.move(dir, { name:
file.clientName })`, where a client name of `../../etc/passwd` would otherwise
walk out of the directory.

::: tip No temporary file
AdonisJS streams an upload to a temporary path and `move()` renames it. Ream
holds the bytes in memory — `multipart.tmpDir` is refused at construction — so
`move()` writes the buffer. There is no `E_MISSING_FILE_TMP_PATH` here: there
is no temporary file to be missing.
:::

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

## Sending files

`response.download(path)` and `response.attachment(path, name)` send a file, and
`response.stream(readable)` sends anything else that streams.

Chunks go to the socket **as they are read** — nothing bigger than one chunk is
ever held, so a file's size stops being the process's memory ceiling:

```typescript
router.get('/exports/:id', async ({ response, params }) => {
  response.header('content-type', 'text/csv')
  await response.stream(createReadStream(exportPath(params.id)))
})

router.get('/invoices/:id', ({ response, params }) => {
  response.attachment(invoicePath(params.id), 'invoice.pdf')
})
```

A missing file still answers **404**: `download()` stats it before a single
header goes out, because once a stream starts there is no status left to change.
Asking for an ETag (`download(path, true)`) buffers instead — a hash needs the
whole file — so leave it off for anything large.

If the client disconnects, the source stops being read: a whole file is not
pumped into a socket nobody is on.

### The ceiling on a buffered body

Some bodies are not streamed: `response.send(buffer)`, a JSON payload, an
ETag'd download, or a `stream()` on a host with no streaming backend (a unit
test, a mock server). Those are held whole in memory and base64-encoded on the
way across the NAPI boundary — roughly **2.3x their size** in transient memory.

Over the ceiling they throw `E_RESPONSE_TOO_LARGE` rather than growing until the
process dies:

```typescript
// 100MB by default — the same the Rust layer caps an INCOMING body at.
{ maxResponseBytes: 100 * 1024 * 1024 }
```

A **streamed** body never assembles, so the ceiling does not apply to it.

::: tip Or skip the server entirely
For files an app merely stores and serves back, a **signed URL** from
`@c9up/archive` is better than either path: the client fetches straight from
storage and the bytes never pass through the server at all.
:::

## Next steps

- [Configuration](/en/guide/configuration) — register middleware and wire paths
- [Atlas (ORM)](/en/modules/atlas) — persist file metadata alongside your entities
