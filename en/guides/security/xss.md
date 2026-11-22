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

It uses [ammonia](https://crates.io/crates/ammonia) (the html5ever parser used by Firefox/Servo), not naive entity escaping:

- `text/html` fragments are parsed and rebuilt from an allow-list: scripts, styles, frames and event handlers go (`<script>`, `on*` handlers, `javascript:` URIs), and so do forms, inputs, buttons, SVG and media; any tag outside the list — custom elements and web components included — is unwrapped, its content kept. Existing entities are never double-encoded.
- Every other content type (`text/plain`, JSON, CSV…) is returned unchanged: with `X-Content-Type-Options: nosniff` (a default header) the browser never reads it as markup, and escaping it would only corrupt it.
- Fragments lose `id`, `is`, `slot`, `part` and `data-*`: `<a id="config">` shadows `window.config` (DOM clobbering), `is` builds a customized element, client-side frameworks read bindings from `data-*`, and `slot`/`part` reach into shadow DOM.

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
`xss: { allowAttributes: ['id', 'data-*'] }`.

Request query strings and bodies are **not** mutated; user input is neutralized where it is stored or rendered, not silently rewritten on the way in.
