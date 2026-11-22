# photon

This guide covers the photon configuration and errors:

- PhotonConfig Reference
- Errors

## PhotonConfig Reference

| Property | Type | Default | Description |
|---|---|---|---|
| `framework` | `'react' \| 'vue' \| 'svelte'` | — | Frontend framework to use |
| `entryClient` | `string` | — | Path to the client hydration entry (e.g. `'resources/app.tsx'`) |
| `buildDir` | `string` | `'public/build'` | Where the client build is written, on disk |
| `assetsUrl` | `string` | `'/build'` | URL the client build is served from (a root-relative path or an http(s) URL) |
| `ssrBuildDir` | `string` | `'build/ssr'` | Where the SSR bundle is written; refused inside `buildDir` or `public/` |
| `viteDevUrl` | `string` | `'http://localhost:5173'` | Vite dev server URL (dev only) |
| `dev` | `boolean` | from the environment | Serve through the Vite dev server; unset, only `ream dev` or a development/test `NODE_ENV` turns it on |
| `defaultMeta` | `MetaTags` | — | Application-wide default `<head>` tags (44.2) |
| `ssr.enabled` | `boolean` | `false` | Server-render pages |
| `ssr.entrypoint` | `string` | `'resources/ssr.tsx'` | Path to the SSR render entry |
| `ssr.pages` | `string[] \| (ctx, page) => boolean \| Promise<boolean>` | every page | Which pages to server-render |
| `encryptHistory` | `boolean` | `false` | Encrypt every page's history state; `ctx.photon.encryptHistory(false)` turns it off for one response |
| `assetsVersion` | `string \| number` | manifest fingerprint | A fixed asset version, sent with every page |
| `rootView` | `string \| (ctx) => string \| RootViewRenderer` | Photon's document | The HTML document of a first visit: a template name for `ctx.view`, or a function returning one (or a function that writes the document) |

## Errors

Photon throws `PhotonError` (server, from `@c9up/photon`) and `PhotonClientError` (browser, from `@c9up/photon/client`). Both carry a `code`, an optional `hint`, an optional `context: Record<string, unknown>`, and a `docsUrl` that resolves to the matching anchor in the [Photon error catalog](/en/reference/errors#photon-errors). The `docsUrl` is enumerable on the error instance, so log-shipping pipelines (Sentry, Datadog, vanilla `JSON.stringify`) ship it without extra wiring.

```ts
try {
  await renderer.boot()
} catch (err) {
  if (err instanceof PhotonError) {
    console.error(`[${err.code}] ${err.message}`)
    console.error(`Docs: ${err.docsUrl}`)
  }
  throw err
}
```

See the [full catalog](/en/reference/errors#photon-errors) for cause + fix per code.
