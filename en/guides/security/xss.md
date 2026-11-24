# XSS sanitization

This guide covers sanitizing HTML against XSS.

## XSS Sanitization

`sanitizeResponse(body, contentType)` cleans a `text/html` body as untrusted
markup — what to call on user input before storing or echoing it. It always
sanitizes, whatever `xss` says:

```ts
import { createBlackhole } from '@c9up/blackhole'

const filter = createBlackhole({ csrf: false })
const safe = filter.sanitizeResponse(comment.body, 'text/html')
```

The input is bounded, because the HTML parser does not cost the same for
every input of the same size: misnested formatting tags are re-created in
every new block, so a few kilobytes can build megabytes. A `text/html` body
past a bound is refused with an error, never returned as it came:

| Bound | Default | Refusal |
| --- | --- | --- |
| Input length, in UTF-8 bytes (`xss.maxInputBytes`) | 1 MiB | `E_BLACKHOLE_HTML_TOO_LARGE` |
| Element nesting (`xss.maxDepth`) | 512 | `E_BLACKHOLE_HTML_TOO_DEEP` |
| Markup the parser builds | 4 times the input, plus 64 KiB | `E_BLACKHOLE_HTML_TOO_COMPLEX` |

Depth and built markup are measured by the parser itself, as it builds the
tree, so the refusal comes early and costs little. The output is never more
than about four times the input plus 64 KiB. When you sanitize user input,
catch these codes and answer 422 (or 413 for the length):

```ts
import { errors } from '@c9up/blackhole'

try {
  comment.body = filter.sanitizeResponse(input, 'text/html')
} catch (error) {
  if (error instanceof errors.E_BLACKHOLE_HTML_TOO_LARGE) return response.status(413).send('Too long')
  if (error instanceof errors.E_BLACKHOLE_HTML_TOO_DEEP || error instanceof errors.E_BLACKHOLE_HTML_TOO_COMPLEX) {
    return response.status(422).send('Markup too complex')
  }
  throw error
}
```

Raise `maxDepth` with care: the parse slows with the square of the nesting.

It uses [ammonia](https://crates.io/crates/ammonia) (the html5ever parser used by Firefox/Servo), not naive entity escaping:

- `text/html` fragments are parsed and rebuilt from an allow-list: scripts, styles, frames and event handlers go (`<script>`, `on*` handlers, `javascript:` URIs), and so do forms, inputs, buttons, SVG and media; any tag outside the list — custom elements and web components included — is unwrapped, its content kept. Existing entities are never double-encoded.
- Every other content type (`text/plain`, JSON, CSV…) is returned unchanged: with `X-Content-Type-Options: nosniff` (a default header) the browser never reads it as markup, and escaping it would only corrupt it.
- Fragments lose `id`, `is`, `slot`, `part`, `data-*` and `class`: `<a id="config">` shadows `window.config` (DOM clobbering), `is` builds a customized element, client-side frameworks read bindings from `data-*`, `slot`/`part` reach into shadow DOM, and `class` selects every rule of the page's stylesheet — with utility classes, `class="fixed inset-0 z-50"` draws a full-page overlay.
- `style` keeps presentation properties only (colour, font, text, margin, padding, border, width, height). `position`, `top`/`right`/`bottom`/`left`, `z-index` and every property that takes a `url()` are removed.
- Kept on every allowed tag: `style` (filtered as above), `role`, `tabindex`, `title`, `lang`, `dir`, `hidden`, and the attributes each tag needs (`href`, `src`, `alt`…). Links get `rel="noopener noreferrer"`.

`xss: true` runs the same pass over every `text/html` body the application
sends — one that opens like a document (`<!doctype html>`, `<html>`, a comment)
included: those first bytes are written by whoever wrote the content, so an
untrusted comment could otherwise claim to be a page and switch the pass off.
A page the application renders itself is left intact only when the handler
says so for that response:

| Adapter | Mark the response's HTML as the application's own |
| --- | --- |
| Ream | `ctx.store.set('trustedHtml', true)` |
| Express | `res.locals.trustedHtml = true` |
| Fastify | `reply.trustedHtml = true` |
| Hono | `c.set('trustedHtml', true)` |

A page rendered by `ctx.aurora.render()` (aurora 0.1.52 or later) or
`ctx.view.render()` (inker 0.1.24 or later) is marked by the renderer: nothing
to add. Only the literal `true` counts. Mark only bodies whose untrusted parts the
template already escaped. It is **off by default**: the application's own
partials — a form fragment with its `_csrf` field, an `<svg>` icon, a `<video>` —
would lose everything outside the allow-list. Turn it on only where every
fragment may carry untrusted markup. The object form turns it on and opts
attributes back in, for when nothing reads them from untrusted markup:
`xss: { allowAttributes: ['id', 'data-*'] }`. With `class` in that list,
untrusted markup can use every class of your stylesheet, overlays included.

With `xss: true`, a body past a bound is refused too: the request ends in a
500 error and the body is not sent.

Request query strings and bodies are **not** mutated; user input is neutralized where it is stored or rendered, not silently rewritten on the way in.
