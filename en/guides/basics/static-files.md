# Static files

This guide covers serving static files.

## Static files

Register the provider and `public/` is served — that is the whole setup.

```ts
// reamrc.ts
providers: [() => import('@c9up/ream/storage/provider')]
```

`public/logo.png` is then `GET /logo.png`. No route is declared for it, and a
request that matches no file falls through to the router untouched.

Defaults, tuned in `config/static.ts`:

```ts
import { defineStaticConfig } from '@c9up/ream'

export default defineStaticConfig({
  maxAge: 86_400_000,   // milliseconds; `Cache-Control: max-age` is seconds
  immutable: true,      // only honoured alongside a maxAge
})
```

| Option | Default | What it does |
| --- | --- | --- |
| `enabled` | `true` | `false` makes every request fall through |
| `root` | `public/` | Directory served |
| `acceptRanges` | `true` | `206` for `Range`, so a client can seek in audio and video |
| `cacheControl` | `true` | Emit `Cache-Control`; `false` ignores `maxAge` and `immutable` |
| `dotFiles` | `'ignore'` | `'deny'` answers 403, `'allow'` serves them |
| `etag` | `true` | `ETag` and `If-None-Match` |
| `extensions` | none | **Fallback** list: `['html']` makes `/about` serve `about.html` |
| `immutable` | `false` | Adds `immutable` to `Cache-Control` |
| `index` | `'index.html'` | Index file for a directory request; `false` disables |
| `lastModified` | `true` | `Last-Modified` and `If-Modified-Since` |
| `maxAge` | `0` | Milliseconds |
| `prefix` | none | Serve only under a URL prefix |

`extensions` is a fallback list, not an allowlist — there is no allowlist, and
every extension is served. What keeps a file private is not publishing it here.

### What cannot be reached

A request cannot leave the root. Traversal is normalised away before anything
is opened, percent-encoded forms included (`%2e%2e%2f`), and a malformed
sequence is refused rather than raised. A symlink planted inside the root that
points outside it is refused, whether it is a file or a directory, and so is a
sibling directory that merely shares a name prefix with the root.

The file is opened with `O_NOFOLLOW` and its metadata read from the descriptor
rather than re-read by path, so the bytes served are the ones that passed the
checks — a symlink swapped in after the check fails the open instead of
redirecting the read.

Dotfiles are ignored by default, so an `.env` that ends up in the served
directory is not published by accident. The rule applies to the decoded path,
so `/%2eenv` is the same dotfile as `/.env`. A file without a leading dot is: the
directory is the public one.
