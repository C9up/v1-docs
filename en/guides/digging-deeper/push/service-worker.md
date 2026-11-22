# Service worker

This guide covers the service worker:

- Service Worker
- Service Worker hardening checklist

## Service Worker

`ream configure @c9up/nova` writes `public/sw.js` alongside `config/nova.ts` and the migration template. The scaffold is the working push handler the maintainer would otherwise write by hand; `registerServiceWorker('/sw.js')` then resolves against a real file from the very first run.

It is written from the stub the package ships, `stubs/public/sw.stub`:

```js
// Service Worker scaffolded by `ream configure @c9up/nova` (story 48.4).
//
// Lifecycle: `skipWaiting` + `clients.claim` so the first push that arrives
// after subscription is delivered through this SW (not dropped in the
// install→activate race window).
//
// Push handler: parse the JSON payload sent by
// `nova.push(sub, { title, body, icon, url, tag, data })` and display a
// notification. `userVisibleOnly: true` (set by @c9up/nova/client
// `subscribe()`) means we MUST call `showNotification` on every push or
// the browser revokes the subscription — every parse/error path falls back
// to a generic notification rather than throwing out of the listener.
//
// Notificationclick: close the notification, then focus an existing tab
// whose URL matches `data.url` (preferring visible/focused tabs), falling
// back to opening a new window. Only a URL on this origin is followed: the
// notification is shown under the app's name, so a click must not lead to
// another site (phishing, open redirect) or run a `javascript:`/`data:` URL.
// To link elsewhere on purpose, list the origins in ALLOWED_ORIGINS below.
//
// Registered from the app via `registerServiceWorker('/sw.js')` from
// `@c9up/nova/client`. Edit freely — re-running `ream configure @c9up/nova`
// will NOT overwrite this file.

// Origins besides this one a notification click may open, e.g. 'https://docs.example.com'.
const ALLOWED_ORIGINS = []

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  // userVisibleOnly: show a notification on EVERY push — a data-less push must
  // still surface a generic one, or the browser revokes the subscription.
  let payload = {}
  if (event.data) {
    try {
      const parsed = event.data.json()
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        payload = parsed
      }
    } catch {
      try {
        payload = { title: event.data.text() }
      } catch {
        payload = {}
      }
    }
  }
  const { title = 'Notification', body, icon, url, tag, data } = payload
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      tag,
      data: { ...(data ?? {}), ...(url !== undefined ? { url } : {}) },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url
  if (typeof target !== 'string' || target === '') return
  let resolved
  try {
    resolved = new URL(target, self.location.origin)
  } catch {
    return
  }
  // An opaque origin (javascript:, data:, blob:) never matches.
  if (resolved.origin !== self.location.origin && !ALLOWED_ORIGINS.includes(resolved.origin)) {
    return
  }
  const targetURL = resolved.href
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const matches = clients
          .filter((client) => client.url === targetURL)
          .sort((a, b) => {
            const aVisible = a.visibilityState === 'visible' ? 0 : 1
            const bVisible = b.visibilityState === 'visible' ? 0 : 1
            if (aVisible !== bVisible) return aVisible - bVisible
            return (b.focused === true ? 1 : 0) - (a.focused === true ? 1 : 0)
          })
        if (matches.length > 0) {
          return matches[0]
            .focus()
            .catch(() => self.clients.openWindow(targetURL).catch(() => {}))
        }
        return self.clients.openWindow(targetURL).catch(() => {})
      }),
  )
})
```

### Customising the SW

Edit `public/sw.js` directly. Re-running `ream configure @c9up/nova` will NOT overwrite it (the codemods `writeFile` skips existing files unless `force: true` — same idempotency contract as `config/nova.ts` and the migration template).

### Sub-path apps

The default registration is root-scope (`registerServiceWorker('/sw.js', { scope: '/' })`). If the app is mounted at `/admin`, **move** (not copy) the SW after scaffold and update the registration:

```bash
git mv public/sw.js public/admin/sw.js
```

```ts
await registerServiceWorker('/admin/sw.js', { scope: '/admin/' })
```

`git mv` (rather than `cp`) avoids leaving an orphan `public/sw.js` that would still be served at `/sw.js` and could re-register a root-scope SW behind your back if a stale browser tab hits the old URL.

**Scope rule.** A Service Worker file's URL determines the maximum scope the browser will accept. Serving `/sw.js` cannot scope to `/admin/` without sending the `Service-Worker-Allowed: /admin/` HTTP response header from the SW's URL — the simpler workaround (and what this section recommends) is to put the SW file at the deepest URL its scope needs.

The codemods context has no signal about app scope, so the scaffold writes the documented root-scope default; sub-path apps relocate the file the same way they would override any other default.

### `notificationclick` URL convention

The SW reads `event.notification.data.url`. Whatever `url` field you pass to `nova.push(sub, { url: '/inbox/42' })` is what the SW opens on click — focus an existing tab matching that URL, else open a new window. Only a URL on the application's own origin is followed: the notification is shown under the application's name, and `url` often comes from content (a comment link, a redirect target), so a click must not lead to another site or run a `javascript:` or `data:` URL. Origins a click may open besides the application's go in the SW's `ALLOWED_ORIGINS`. Apps with a different routing convention (e.g. a `data.deeplink` field, or `actions[0].action`) edit the SW directly.

### Why `'Notification'` as a default title

`userVisibleOnly: true` (set by `subscribe()`) forces the SW to call `showNotification` on every push or the browser revokes the subscription. The `title = 'Notification'` fallback in the destructuring pattern guarantees that a malformed payload still produces a notification (some browsers reject `showNotification(undefined, …)`); the template's `try/catch` around `event.data.json()` handles non-JSON pushes the same way.

## Service Worker hardening checklist

The scaffolded SW (`stubs/public/sw.stub`) ships with nine hardening invariants. Plugin authors customising the SW (or shipping their own template) MUST preserve all nine — every one of them maps to a real production-bug class caught during the Epic 48 code review. A thrown error inside a push listener tells the browser to revoke the subscription as a "broken endpoint", so the bar for defensiveness is unusually high.

1. **`event.data.json()` result guarded as `typeof === 'object' && !Array.isArray(...)`.** A `null`/array/scalar payload would crash destructuring; the guard falls back to an empty object.
2. **`event.data.text()` wrapped in `try/catch` with a default fallback string.** Non-JSON pushes (or malformed buffers) still surface a notification instead of revoking the subscription.
3. **Every URL comparison uses `new URL(target, self.location.origin).href`.** `client.url` is always absolute; caller-provided `target` may be relative. Direct `===` between possibly-different shapes is dead code.
4. **Sender `data` fields preserved via conditional spreads (don't clobber with defaults).** Use `...(url !== undefined ? { url } : {})` patterns so a real `data.url` from the payload survives the merge.
5. **`install` listener calls `skipWaiting()`.** Without it, the first push can land before the SW is in control of the page.
6. **`activate` listener calls `clients.claim()`.** Pairs with `skipWaiting()` to give the SW immediate control of in-flight clients.
7. **`showNotification`'s title has a fallback (`'Notification'`).** A malformed payload still satisfies `userVisibleOnly: true` instead of triggering revocation.
8. **`notificationclick` handler wraps `clients.openWindow(url)` and `client.focus()` in `.catch(() => {})`.** Both can reject (popup-blocked, closed window) and you don't want that to bubble out of the listener.
9. **`notificationclick` follows only a URL on the SW's origin (or one listed in `ALLOWED_ORIGINS`).** The URL comes from the payload; an opaque origin (`javascript:`, `data:`) never matches.

The reference is `stubs/public/sw.stub`; the package's tests run it against a stand-in worker scope.
