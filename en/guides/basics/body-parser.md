# Body parser

This guide covers the body parser and its limits.

## Enabling the parser

The body parser is the only thing that reads a request body — JSON, url-encoded forms, text and multipart alike. Register it as router middleware in `start/kernel.ts` (a scaffolded `api` or `web` app already does). Without it `request.body()` is `{}`, `request.input()` and `request.all()` see only the query string, and `request.file()` always returns `null`.

```typescript
// start/kernel.ts
router.use([
  () => import('@c9up/ream/bodyparser_middleware'),
  // ...other router middleware
])
```

A JSON body is parsed only when its Content-Type is one of `json.types` (`application/json`, `application/json-patch+json`, `application/vnd.api+json` and `application/csp-report` by default). A body sent with no Content-Type, or as `text/plain` — what a foreign page can send with the visitor's cookies and no CORS preflight — is never read as JSON.

A malformed JSON body is refused with `400 E_BODYPARSER_INVALID_JSON` before your handler runs. Under `json.strict` (on by default) the body must be an object or an array; any other JSON value is refused with a 422. An array, or a scalar once `strict` is off, is kept under `_body`. A `__proto__` key, and a `constructor` key holding a `prototype`, are removed while parsing, so copying the body onto an object with `Object.assign` or a deep merge cannot replace that object's prototype.

`trimWhitespaces` and `convertEmptyStringsToNull` are on by default for `json`, `form` and `multipart`: every string value is trimmed, and an empty one becomes `null`. Keys are left as sent. Turn either off in that section of the config.

### Configuring it

Registered that way, the middleware reads its settings from `config/bodyparser.ts`:

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

`new BodyParserMiddleware({ ... })` takes the same object when you build the middleware yourself.

`allowedMethods` decides which requests get a body parsed at all — it
defaults to the four above, so a GET carrying a JSON content-type is left
untouched. A request whose `content-length` says there is no body is skipped too.

A url-encoded body is parsed with bracket nesting (`user[name]`, `tags[]`), and
the query string read by `request.qs()` goes through the same parser. Its limits
for form bodies live under `form.queryString`; `request.qs()` uses the defaults:

| Option | Default | Effect |
| --- | --- | --- |
| `depth` | `5` | Nesting past this depth stays a literal key. |
| `parameterLimit` | `1000` | Pairs past this count are ignored. |
| `arrayLimit` | `20` | An explicit index at or above it is an object key, not an array slot: `ids[500]=x` gives `{ ids: { '500': 'x' } }`. Appends (`tags[]`) stay arrays. |
| `allowDots` | `true` | `user.name` nests like `user[name]`. |

Every limit **throws** `E_REQUEST_ENTITY_TOO_LARGE` (413) rather than writing its
own response, so your exception handler negotiates the reply: an HTML app gets an
error page instead of a JSON envelope it never asked for, and can override the
rendering.

The native server applies the same `limit` of each section — read from
`config/bodyparser.ts` — while it reads the body: a `content-length` over the
limit is not read at all, and a chunked body stops being kept the moment it
passes it. Either way nothing past the limit is held in memory, and the
request still goes through routing without its body. An unknown URL answers
404; on a matched route the body parser throws the 413 above, rendered by your
exception handler. A route that never reads the body is not charged for it,
and one that does — `request.raw()`, `body()`, `all()`, `input()` — gets the
same 413 rather than an empty body mistaken for the real one. A content type
no section claims gets the `raw` limit.

A parser is turned off by giving it no types — there is no `enabled` flag, and
passing one fails loudly rather than quietly re-enabling a parser you switched
off:

```typescript
new BodyParserMiddleware({ raw: { types: [] } })   // no raw parsing
```

::: tip Why maxFiles
A bound on total size and field count alone lets ten thousand one-byte files
through. `maxFiles` is a denial-of-service bound at the same scale as
`maxFields`.
:::

::: warning No `multipart.tmpDir`
Uploaded files are held in memory and never written to a temporary directory —
the Rust multipart parser hands the body over whole. The option was accepted and
read by nothing, so an app pointing it at a volume was silently getting nothing;
it is now refused at construction. Choose the destination when you store the
file: `await file.move(directory)` on the local filesystem, or
`await file.moveToDisk(key)` into a storage disk (see below).
:::
