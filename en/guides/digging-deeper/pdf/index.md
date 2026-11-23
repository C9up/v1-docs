# Introduction

This guide covers PDF with vellum:

- Quick Examples
- Installation
- Guardrails
- Errors
- Not yet

Status: **Present (TS + Rust N-API)**.

- Package: `@c9up/vellum`
- Goal: convert PDF pages to images, read what a document holds, and reshape it
  — merge, split, rotate, stamp. It also writes documents from nothing:
  [Generating documents](/en/guides/digging-deeper/pdf/documents).

The work happens in Rust behind N-API, because PDF has no adequate JavaScript
implementation. This is a capability the platform lacks, not an optimisation of
one it has.

## Quick Examples

```ts
import vellum from '@c9up/vellum/services/main'

// A preview of the first page, 1200px wide
const preview = await vellum.render(pdf, { page: 1, width: 1200 })

// Every page as JPEG
const pages = await vellum.renderAll(pdf, { format: 'jpeg', quality: 82 })

// What the document holds
const { pageCount, encrypted } = await vellum.inspect(pdf)
const { title, author, createdAt } = await vellum.metadata(pdf)
const text = await vellum.extractText(pdf, { page: 1 })

// Reshaping it
const dossier = await vellum.merge([contract, annexe])
const extract = await vellum.selectPages(pdf, [1, 3, 4])
const parts = await vellum.split(pdf)
const upright = await vellum.rotate(scan, 90, { pages: [1] })

// Stamping it
const signed = await vellum.stamp(workOrder, signature, {
  page: 1, x: 380, y: 690, width: 140,
})
const marked = await vellum.stampText(invoice, 'PAID', {
  x: 400, y: 80, size: 24, color: '#c00', opacity: 0.6,
})
```

Every method is asynchronous. Rasterising an A4 page is around 30ms of pure
computation, so it runs on the libuv thread pool rather than on the thread
serving requests.

**Pages are numbered from 1** — the number printed on the page, not an array
index.

## Installation

```bash
ream configure @c9up/vellum
```

That registers the provider and writes `config/vellum.ts`:

```ts
import { defineConfig } from '@c9up/vellum'
import env from '#start/env'

export default defineConfig({
  format: env.get('VELLUM_FORMAT', 'png'),
  scale: 1,
  quality: 82,
  background: '#ffffff',
})
```

Every option is a default that any call can override.

The service is also a class, usable without a host:

```ts
import { Vellum } from '@c9up/vellum'

const vellum = new Vellum({ format: 'jpeg', quality: 82 })
```

## Guardrails

Every input is treated as hostile, because these documents come from uploads:

- Engine work runs behind a panic net — a panic on a worker thread would abort
  the whole process.
- The rendered size is bounded; an unbounded `scale` is a memory-exhaustion
  vector.
- A malformed colour is refused rather than falling back to white, which would
  be a wrong render nobody reports.
- Text written onto a page is escaped, so a document title cannot inject content
  stream operators.
- Nesting is bounded wherever the document chooses it: objects, colour spaces,
  functions, the field tree of a form. A stack overflow is not a panic, so no
  net would catch it; a document nested too deep is refused instead.
- What reading one page may cost is bounded, because a document's size says
  nothing about it: a 1 MiB compressed stream inflates to 1 GiB, and forms
  drawing one another ten times per level turn 2 KB into hours of work. A page
  over a budget is refused, never drawn without the part that did not fit.
  `renderAll` and `extractTextAll` also hold the document to a total across its
  pages, since the page count is the document's to choose.
- Every path that parses an existing document — inspecting it, reading its
  fields, editing, stamping, signing, verifying — inflates its object and
  cross-reference streams under a ceiling of 32 MiB for all of them together,
  and builds at most 4 million objects from the document. It refuses a document
  past either, or whose object stream could not be read, rather than reading it
  without the objects it held.

| Option | Default | Bounds |
| --- | --- | --- |
| `maxPixels` | 50 million | The pixels one page may rasterise to. |
| `maxTotalPixels` | 500 million | The pixels `renderAll` may rasterise across every page, checked before the first is drawn. |
| `maxDecodedBytes` | 256 MiB | The decoded stream data one page may need: content, images, fonts. |
| `maxOperations` | 10 million | The content operators and glyphs one page may take to draw, nested forms included. |
| `maxTotalDecodedBytes` | 1 GiB | The decoded stream data `renderAll` and `extractTextAll` may need across every page. |
| `maxTotalOperations` | 10 million | The operators and glyphs `renderAll` and `extractTextAll` may take across every page — and so the text `extractTextAll` hands back. |

Each is set in `config/vellum.ts`, and `render` and `renderAll` take them per
call. Raise one knowingly, for a document you trust.

## Errors

Failures raise a class of the `errors` namespace (`import { errors } from '@c9up/vellum'`), a flare `Exception` carrying a `code`:

| Code | Raised when |
| --- | --- |
| `E_VELLUM_NAPI_REQUIRED` | The native engine is not loadable on this platform |
| `E_VELLUM_INVALID_PDF` | The bytes are not a readable PDF |
| `E_VELLUM_INVALID_PAGE` | A page number below 1, or past 4 294 967 296, the last the engine addresses |
| `E_VELLUM_INVALID_ROTATION` | An angle that is not a whole multiple of 90 |
| `E_VELLUM_RENDER_FAILED` | Rasterising failed |
| `E_VELLUM_EXTRACT_FAILED` | Text extraction failed |
| `E_VELLUM_MERGE_FAILED` · `E_VELLUM_SELECT_FAILED` · `E_VELLUM_SPLIT_FAILED` · `E_VELLUM_ROTATE_FAILED` | The operation failed |
| `E_VELLUM_STAMP_FAILED` · `E_VELLUM_STAMP_TEXT_FAILED` | Stamping failed |
| `E_VELLUM_SIGNED_DOCUMENT` | An edit would rewrite a signed document; see [Signing](/en/guides/digging-deeper/pdf/signing#signing) |

The engine is **not optional**: there is no JavaScript fallback, so a missing
binary is a hard failure with an actionable message rather than a silent
degradation that lets one deployment behave differently from another.

## Not yet

An adapter for a **certified provider** — a short function returning a
`Signer`, which belongs to whoever has the account rather than in an agnostic
package.
