# Request

This guide covers the request object.

## The request

Beyond `input()` / `all()` / `qs()`, the request carries:

```ts
ctx.request.id()            // the x-request-id the proxy set, or undefined
ctx.request.completeUrl()   // protocol://host/path, `true` to keep the query
ctx.request.parsedUrl()     // { pathname, search, query }
ctx.request.ajax()          // X-Requested-With: xmlhttprequest
ctx.request.pjax()
ctx.request.prefetch()      // a speculative fetch, not a real navigation
ctx.request.types()         // every accepted media type, best first
ctx.request.languages()     // …and languages, charsets, encodings
ctx.request.cookiesList()
ctx.request.serialize()     // a JSON-safe view, for logs
```

`body()` returns the request body; `all()` returns the body **merged with the
query string** — two different things.

`id()` does not invent a UUID when the header is absent: a correlation id nobody
else knows correlates nothing.

`serialize()` and `toJSON()` deliberately omit the body — it may hold
credentials, and a log line is the last place they should land.

`prefetch()` is worth checking before anything with a side effect. A browser may
fetch a link the user never clicks; counting that as a visit, or acting on it,
attributes an intention nobody had.

### Where the user came from

```ts
const back = ctx.request.getPreviousUrl(['admin.example.com'], '/dashboard')
```

The `Referer` header is **supplied by the client**. Redirecting back to it
unchecked is an open redirect, so the host must be this request's own or one of
the hosts you list; anything else falls back.

What comes back is the referrer's path and query string, never its host, so
`response.redirect().back()` and a redirect to this value stay on your site.
Leading slashes are collapsed to one: `http://app.test//evil.com/x` gives
`/evil.com/x`, not the protocol-relative `//evil.com/x` a browser would follow
to another host.
