# URL builder and signed URLs

This guide covers named routes, building URLs and signing them:

- Named Routes
- Signed URLs

## Named Routes

Name a route with `.as()`, then build URLs from the name with `urlFor` — never hard-code paths:

```typescript
router.get('/users/:id', [UsersController, 'show']).as('users.show')

const url = router.urlFor('users.show', { id: '42' })
// → /users/42
```

> `router.makeUrl()` is a **deprecated** alias of `urlFor()`. Prefer `urlFor`.

Resource routes are named automatically: `posts.index`, `posts.store`, `posts.show`, `posts.update`, `posts.destroy`.

### Building a URL piece by piece

`urlFor` takes everything at once. When the pieces arrive separately — params
here, a query string there, a prefix from config — `router.builder()` is the
fluent form:

```typescript
router.builder().params({ id: '42' }).qs({ tab: 'posts' }).make('users.show')
// → /users/42?tab=posts

router.builderForDomain('https://acme.test').params({ id: '42' }).make('users.show')
// → https://acme.test/users/42

router.builder().prefixUrl('https://acme.test').makeSigned('invite', { expiresIn: '1h' })
// signed, with the query string folded into the signature

router.builder().disableRouteLookup().make('/a/literal/path')
```

It defers to `urlFor` and `makeSignedUrl`, so a missing param fails the same way
whichever spelling you used.

### Inspecting the route table

```typescript
router.toJSON()        // { root: [...routes], 'blog.example.com': [...] }
router.usingDomains    // is any route domain-scoped?
router.parsePattern('/posts/:id?')   // [{ name: 'id', optional: true }]
router.commit()        // build the lookup index now, not on the first request
router.commited        // has it been built?
```

`toJSON()` groups by the domain a route answers on, with `root` for the ones
that answer everywhere — what a route list, an OpenAPI generator or a debug
screen reads.

### URLs in the browser

To build the same URLs client-side, serialize the named-route map with `router.namedManifest()` (only **named** routes are exposed — unnamed routes stay private to the server) and hand it to your page renderer; Aurora's isomorphic `urlFor` resolves against it. See [Aurora → URL builder](/en/guides/frontend/aurora/browser#url-builder-—-urlfor).

```typescript
const routes = router.namedManifest()
// → { 'users.show': '/users/:id', ... }
```

## Signed URLs

`SignedUrl` (from `@c9up/ream/security`) emits HMAC-SHA256-signed URLs
with an optional expiry. The receiving handler calls `verify()` to
re-derive the signature and reject tampered or expired links.

```ts
import { SignedUrl } from '@c9up/ream/security'
import env from '#start/env.js'

// SIGNING_SECRET is declared Env.schema.secret() in start/env.ts: a missing value refuses to boot
const su = new SignedUrl({ secret: env.get('SIGNING_SECRET').release() })

// 1-hour link to /downloads/<id>
const url = su.make('/downloads/abc-123', { expiresIn: '1h' })

// Verifier handler
if (!su.verify(req.url)) {
  return res.status(403).json({ error: 'E_BAD_SIGNATURE' })
}
```

`expiresIn` accepts a numeric seconds value or a suffixed string
(`s`/`m`/`h`/`d`). `expiresIn: 0` stamps the current epoch as the
expiry — the URL is valid for the current second only and becomes
invalid as soon as the wall clock advances. The previous truthy guard
silently treated `0` as "no expiry", which was a security bug; the
current behaviour matches caller intent.

`purpose` binds the URL to a named flow:

```ts
const reset = su.make('/auth/reset', { expiresIn: '30m', purpose: 'pwd-reset' })
if (!su.verify(reset, 'pwd-reset')) return /* 403 */
```

A token issued for one purpose can't be replayed against another, and the
match is exact both ways: a purposed URL fails a `verify()` (or
`request.hasValidSignature()`) that names no purpose, and a purpose-less URL
fails one that names a purpose.

### What each module auto-loads

`modules.autoload` names what is imported from every module directory, and
importing is what registers decorator-based code:

```ts
// reamrc.ts
modules: { path: 'app/modules', autoload: ['routes', 'events', 'services/'] }
```

An entry names a **file** (`routes` → `routes.ts`) or, **with a trailing
slash**, a **directory** (`services/` → every `.ts`/`.js` under it,
recursively, in one alphabetical pass). `.d.ts` files are skipped: they declare
types and execute nothing.

The slash is required, not inferred. Falling back to a directory of the same
name would make an application whose module holds `routes/` as a directory
execute every file in it the day it upgraded, having asked for nothing.

The directory form is what makes `@Schedule()` and friends discoverable. A
decorator registers when its module is imported and not before, so a scheduled
task in a file nobody imports is never found — and the application starts
perfectly, with the task simply absent. Naming its directory here is what
imports it; a hand-written preload does the same job by hand.

An entry that matches nothing in **any** module is reported at boot. A single
module without `routes.ts` is normal and stays silent; a name that exists
nowhere is a typo whose only other symptom is a task that never runs.
