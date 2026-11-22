# Head, SEO and CSP

This guide covers the document head, SEO and security headers:

- SEO & Head Management
- Security headers and CSP

## SEO & Head Management

Photon ships per-route control over `<title>`, `<meta>` description, Open Graph, Twitter Cards, canonical URLs and arbitrary custom tags. Tags are merged from four layers (right-most wins per leaf field): `defaultMeta` → `@Meta` decorator → `ctx.photon.meta()` → explicit `render(comp, props, meta)` argument.

### Imperative API — `ctx.photon.meta()`

Inside a route handler, accumulate tags before rendering:

```ts
router.get('/articles/:slug', async ({ params, photon }) => {
  const article = await loadArticle(params.slug)
  photon.meta({
    title: article.title,
    description: article.summary,
    canonical: `https://example.com/articles/${article.slug}`,
    og: {
      title: article.title,
      description: article.summary,
      image: article.coverUrl,
      type: 'article',
    },
    twitter: { card: 'summary_large_image' },
  })
  return photon.render('ArticleShow', { article })
})
```

Multiple `meta()` calls deep-merge. `og` and `twitter` sub-objects are merged field-by-field (NOT object-replace).

### Decorator — `@Meta()`

`@Meta()` attaches metadata declaratively to a controller method. The middleware reads it from `ctx.route` (controller prototype + action name) and seeds the accumulator before the handler runs.

```ts
import { Meta } from '@c9up/photon'

class HomeController {
  @Meta({ title: 'Home', description: 'Welcome' })
  async index({ photon }) {
    return photon.render('Home', {})
  }

  // Factory form — receives the request context.
  @Meta((ctx) => ({ title: `Profile — ${ctx.params.user}` }))
  async show({ photon }) {
    return photon.render('Profile', {})
  }
}
```

Imperative `ctx.photon.meta()` calls inside the handler still take precedence over decorator values.

### Application-wide defaults — `defaultMeta`

In `config/photon.ts`:

```ts
import { defineConfig } from '@c9up/photon'

export default defineConfig({
  framework: 'react',
  entryClient: 'resources/app.tsx',
  defaultMeta: {
    og: { siteName: 'Example', locale: 'en_US' },
    twitter: { site: '@example' },
    robots: 'index,follow',
  },
})
```

Per-route values merge on top of these defaults.

### Structured data (JSON-LD)

`jsonLd` describes the page to search engines in schema.org JSON-LD: one node,
several, or a whole `{ "@context", "@graph" }` document — what
`@c9up/ephemeris` builds, or any plain object of that shape.
Photon depends on the shape only.

```ts
import { product, SchemaGraph } from '@c9up/ephemeris'

ctx.photon.meta({
  jsonLd: new SchemaGraph({ url: request.completeUrl() })
    .mainEntity(product({ '@type': 'Product', name: anvil.name, offers }))
    .toJsonLd(),
})
```

It is written in `<head>` as one `<script type="application/ld+json">`, with
the request's CSP nonce, and replaced on every SPA navigation — a page without
any leaves none of the previous page's behind. `<`, `>`, `&`, U+2028 and
U+2029 are written as `\u` escapes, so no value can end the script. Layers
merge by `@id`: `defaultMeta` can declare the site's identity and a page add
to it — the types are united and what the page sets wins; nodes without an
`@id` follow in order.

### Precedence

Layers, lowest to highest:

| Layer | Source | When |
|---|---|---|
| 1 | `config.defaultMeta` | App-wide defaults |
| 2 | `@Meta(...)` decorator | Per-controller-method |
| 3 | `ctx.photon.meta(...)` | Imperative, multiple calls deep-merge |
| 4 | `render(comp, props, meta)` | Explicit override on the render call |

`og` / `twitter` sub-objects merge field-by-field; `keywords` and `custom` arrays concatenate then de-dup.

### XSS safety

Every text value (`title`, `description`, og:*, twitter:*, custom `content`) passes through an HTML-attribute escaper that replaces `&`, `<`, `>`, `"`, `'`. A user-controlled title containing `<script>...</script>` is rendered safely as `&lt;script&gt;...&lt;/script&gt;`. **Never** disable this — there is no opt-out, by design.

## Security headers and CSP

The protective headers belong to [Blackhole](/en/guides/security/securing-ssr): the
Content-Security-Policy (enforced or report-only), `X-Frame-Options` and
`X-Content-Type-Options`. Blackhole records the set it applied in the request
store (`securityHeaders`), and a page Photon renders then adds none of its own:
the policy, its nonce, its `report-to` and a `DENY` reach the browser as
configured, and a header Blackhole was told to leave out stays out.

Without that record, Photon fills each protection the response lacks with its
minimal set: `default-src 'self'; script-src 'self'; object-src 'none'` (with
the Vite origin in development), `X-Frame-Options: SAMEORIGIN` and `nosniff`.
A header already on the response is kept, and a report-only policy counts as
the policy, so a lone `X-Frame-Options: DENY` set by hand still gets a policy
and `nosniff` beside it.

When the request has a nonce (`response.nonce`, which Blackhole seeds for a
policy naming `@nonce`, or `cspNonce` in the request store), Photon writes it
on every `<script>` of the page, so a strict policy works as is in production:

```ts
// config/blackhole.ts
export default defineConfig({
  csp: { directives: { 'script-src': ['@nonce', "'strict-dynamic'"] } },
})
```

In development the scripts come from the Vite server, another origin. Under a
nonce and `'strict-dynamic'` they load with the nonce; under a policy that
lists origins, add Vite's to `script-src`. Either way, hot reload opens a
WebSocket to Vite, which `connect-src` (or `default-src`) must allow — in
development only:

```ts
const vite = app.inDev ? ['http://localhost:5173', 'ws://localhost:5173'] : []

export default defineConfig({
  csp: {
    directives: {
      'script-src': ["'self'", ...vite],
      'connect-src': ["'self'", ...vite],
    },
  },
})
```
