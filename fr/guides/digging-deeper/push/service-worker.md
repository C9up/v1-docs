# Service worker

Ce guide couvre le service worker :

- Service Worker
- Liste de durcissement Service Worker

## Service Worker

`ream configure @c9up/nova` écrit `public/sw.js` à côté de `config/nova.ts` et du template de migration. Le scaffold est le handler de push opérationnel que la mainteneuse devrait sinon écrire à la main ; `registerServiceWorker('/sw.js')` se résout alors contre un fichier réel dès la première exécution.

Il est écrit depuis le stub que le paquet livre, `stubs/public/sw.stub` :

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

### Personnaliser le SW

Édite `public/sw.js` directement. Re-jouer `ream configure @c9up/nova` ne l'écrasera PAS (le `writeFile` des codemods saute les fichiers existants tant que `force: true` n'est pas passé — même contrat d'idempotence que `config/nova.ts` et le template de migration).

### Apps en sous-chemin

L'enregistrement par défaut se fait à la racine (`registerServiceWorker('/sw.js', { scope: '/' })`). Si l'app est montée sous `/admin`, **déplace** (pas copier) le SW après le scaffold et mets à jour l'enregistrement :

```bash
git mv public/sw.js public/admin/sw.js
```

```ts
await registerServiceWorker('/admin/sw.js', { scope: '/admin/' })
```

`git mv` (plutôt que `cp`) évite de laisser un orphelin `public/sw.js` qui serait toujours servi à `/sw.js` et pourrait ré-enregistrer un SW de scope root dans ton dos si un onglet périmé hit l'ancienne URL.

**Règle de scope.** L'URL d'un Service Worker détermine le scope maximal que le navigateur accepte. Servir `/sw.js` ne peut pas scoper à `/admin/` sans envoyer l'en-tête HTTP `Service-Worker-Allowed: /admin/` depuis l'URL du SW — le workaround simple (et ce que cette section recommande) est de placer le fichier SW à l'URL la plus profonde nécessaire à son scope.

Le contexte des codemods n'expose aucun signal sur le scope de l'app, donc le scaffold écrit le défaut documenté (root-scope) ; les apps en sous-chemin relocalisent le fichier comme elles surchargeraient n'importe quel autre défaut.

### Convention d'URL au `notificationclick`

Le SW lit `event.notification.data.url`. Le champ `url` que tu passes à `nova.push(sub, { url: '/inbox/42' })` est ce que le SW ouvre au clic — focus sur un onglet existant qui matche cette URL, sinon ouverture d'une nouvelle fenêtre. Seule une URL de l'origine de l'application est suivie : la notification s'affiche au nom de l'application, et `url` vient souvent d'un contenu (un lien de commentaire, une cible de redirection), donc un clic ne doit ni mener vers un autre site ni exécuter une URL `javascript:` ou `data:`. Les origines qu'un clic peut ouvrir en plus de celle de l'application vont dans `ALLOWED_ORIGINS`, dans le SW. Les apps avec une autre convention de routing (ex. un champ `data.deeplink` ou `actions[0].action`) éditent directement le SW.

### Pourquoi `'Notification'` comme titre par défaut

`userVisibleOnly: true` (posé par `subscribe()`) impose au SW d'appeler `showNotification` à chaque push, sinon le navigateur révoque l'abonnement. Le fallback `title = 'Notification'` dans la déstructuration garantit qu'un payload malformé produit quand même une notification (certains navigateurs rejettent `showNotification(undefined, …)`) ; le `try/catch` autour de `event.data.json()` gère les pushs non-JSON de la même façon.

## Liste de durcissement Service Worker

Le SW scaffoldé (`stubs/public/sw.stub`) livre avec neuf invariants de durcissement. Les auteurs de plugins qui personnalisent le SW (ou qui livrent leur propre template) DOIVENT préserver les neuf — chacun correspond à une vraie classe de bugs en production attrapée lors de la code review de l'Epic 48. Une exception levée à l'intérieur d'un listener push dit au navigateur de révoquer l'abonnement comme « endpoint cassé », donc la barre de défensivité est inhabituellement haute.

1. **Le résultat de `event.data.json()` est gardé via `typeof === 'object' && !Array.isArray(...)`.** Un payload `null`/tableau/scalaire ferait crasher la déstructuration ; la garde retombe sur un objet vide.
2. **`event.data.text()` est enrobé dans `try/catch` avec un fallback de chaîne par défaut.** Les pushs non-JSON (ou les buffers malformés) produisent quand même une notification au lieu de révoquer l'abonnement.
3. **Toute comparaison d'URL passe par `new URL(target, self.location.origin).href`.** `client.url` est toujours absolu ; le `target` fourni par l'appelant peut être relatif. Un `===` direct entre formes différentes est du code mort.
4. **Les champs `data` de l'expéditeur sont préservés via spreads conditionnels (ne pas écraser avec des défauts).** Utilise des patterns `...(url !== undefined ? { url } : {})` pour qu'un vrai `data.url` du payload survive au merge.
5. **Le listener `install` appelle `skipWaiting()`.** Sans ça, le premier push peut atterrir avant que le SW ait le contrôle de la page.
6. **Le listener `activate` appelle `clients.claim()`.** Va de pair avec `skipWaiting()` pour donner au SW le contrôle immédiat des clients en cours.
7. **Le titre de `showNotification` a un fallback (`'Notification'`).** Un payload malformé satisfait quand même `userVisibleOnly: true` au lieu de déclencher la révocation.
8. **Le handler `notificationclick` enrobe `clients.openWindow(url)` et `client.focus()` dans `.catch(() => {})`.** Les deux peuvent rejeter (popup bloquée, fenêtre fermée) et tu ne veux pas que ça remonte hors du listener.
9. **`notificationclick` ne suit qu'une URL de l'origine du SW (ou listée dans `ALLOWED_ORIGINS`).** L'URL vient du payload ; une origine opaque (`javascript:`, `data:`) ne correspond jamais.

La référence est `stubs/public/sw.stub` ; les tests du paquet l'exécutent contre une portée de worker simulée.
