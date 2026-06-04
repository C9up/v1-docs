# Nova — Notifications Web Push

Statut : **Actif — abonnement, livraison push, template de migration pour stockage durable, scaffold Service Worker et intégration test `helix.nova.fake` tous livrés (Stories 48.1 → 48.5)**

`@c9up/nova` est le package Web Push de Ream. Il prend en charge trois choses :

1. **Identité VAPID** — génère et persiste la paire de clés ECDH P-256 exigée par tous les services push.
2. **Endpoint d'abonnement** — une route intégrée `POST /api/nova/subscribe`, gardée par Warden, qui persiste le JSON `PushSubscription` dans un `SubscriptionStore` enfichable.
3. **Helpers navigateur** — un petit client `subscribe()` qui orchestre `navigator.serviceWorker.register()` puis `pushManager.subscribe()`.

Nova **n'est pas** un orchestrateur multi-canal. Le mail passe par Rover, le temps réel par Relay, les files par Bay, la persistance par Atlas. Nova ne fait que du Web Push. (Voir ADR-002.)

## Installation

```bash
pnpm add @c9up/nova
ream configure @c9up/nova
```

`ream configure` enregistre le provider dans `reamrc.ts`, écrit un stub `config/nova.ts` et sème trois placeholders dans `.env` : `NOVA_VAPID_PUBLIC_KEY`, `NOVA_VAPID_PRIVATE_KEY`, `NOVA_VAPID_SUBJECT`.

## Génération des clés VAPID

```bash
ream nova:vapid:generate
```

Frappe une paire P-256 via `crypto.generateKeyPairSync('ec')` de Node (sans dépendance `web-push`) et upserte les trois variables `NOVA_VAPID_*` dans `.env`. Remplace `NOVA_VAPID_SUBJECT` par une vraie adresse `mailto:` avant déploiement — les services push s'en servent pour te contacter en cas de souci d'abonnement.

Si `NOVA_VAPID_PRIVATE_KEY` est déjà défini, la commande refuse d'écraser. Passe `--force` pour faire tourner la clé.

## Configuration

```ts
// config/nova.ts
import { defineConfig } from '@c9up/nova'

export default defineConfig({
  routePrefix: '/api/nova', // POST /api/nova/subscribe
  guard: 'jwt',             // n'importe quelle stratégie Warden, ou null pour les tests uniquement
})
```

Pour remplacer le store d'abonnement en mémoire par un driver durable, plug-le via `config.nova.store` (voir la section [Promouvoir vers un stockage durable](#promouvoir-vers-un-stockage-durable) plus bas — Nova reste agnostique du backend). Le provider respecte aussi une liaison préexistante dans le container ; à défaut, il revient sur `MemorySubscriptionDriver` (dev/tests).

## Abonnement côté client

```ts
import { registerServiceWorker, subscribe } from '@c9up/nova/client'

await registerServiceWorker('/sw.js')
const pushSubscription = await subscribe(import.meta.env.VITE_NOVA_VAPID_PUBLIC_KEY)
console.log('abonné :', pushSubscription.endpoint)
```

`subscribe()` attend le Service Worker actif, appelle `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, puis POST le résultat sur `/api/nova/subscribe` avec `credentials: 'include'` pour transporter automatiquement le cookie/JWT.

Le sous-chemin `@c9up/nova/client` est strictement navigateur — sa source ne contient aucun import `node:` — il s'empaquette donc proprement via Vite/Rollup, sans polyfill.

## Service Worker

`ream configure @c9up/nova` écrit `public/sw.js` à côté de `config/nova.ts` et du template de migration. Le scaffold est le handler de push opérationnel que la mainteneuse devrait sinon écrire à la main ; `registerServiceWorker('/sw.js')` se résout alors contre un fichier réel dès la première exécution.

Le template livré est byte-for-byte équivalent à la constante `SW_TEMPLATE` inlinée dans `packages/nova/src/configure.ts` :

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
// back to opening a new window. URL comparison normalises the inbound
// path against the SW origin.
//
// Registered from the app via `registerServiceWorker('/sw.js')` from
// `@c9up/nova/client`. Edit freely — re-running `ream configure @c9up/nova`
// will NOT overwrite this file.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload = {}
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
  if (!target) return
  const targetURL = new URL(target, self.location.origin).href
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

Le SW lit `event.notification.data.url`. Le champ `url` que tu passes à `nova.push(sub, { url: '/inbox/42' })` est ce que le SW ouvre au clic — focus sur un onglet existant qui matche cette URL, sinon ouverture d'une nouvelle fenêtre. Les apps avec une autre convention de routing (ex. un champ `data.deeplink` ou `actions[0].action`) éditent directement le template SW.

### Pourquoi `'Notification'` comme titre par défaut

`userVisibleOnly: true` (posé par le `subscribe()` de 48.1) impose au SW d'appeler `showNotification` à chaque push, sinon le navigateur révoque l'abonnement. Le fallback `title = 'Notification'` dans la déstructuration garantit qu'un payload malformé produit quand même une notification (certains navigateurs rejettent `showNotification(undefined, …)`) ; le `try/catch` autour de `event.data.json()` gère les pushs non-JSON de la même façon.

## Liste de durcissement Service Worker

Le `SW_TEMPLATE` par défaut dans `packages/nova/src/configure.ts` livre avec huit invariants de durcissement. Les auteurs de plugins qui personnalisent le SW (ou qui livrent leur propre template) DOIVENT préserver les huit — chacun correspond à une vraie classe de bugs en production attrapée lors de la code review de l'Epic 48. Une exception levée à l'intérieur d'un listener push dit au navigateur de révoquer l'abonnement comme « endpoint cassé », donc la barre de défensivité est inhabituellement haute.

1. **Le résultat de `event.data.json()` est gardé via `typeof === 'object' && !Array.isArray(...)`.** Un payload `null`/tableau/scalaire ferait crasher la déstructuration ; la garde retombe sur un objet vide.
2. **`event.data.text()` est enrobé dans `try/catch` avec un fallback de chaîne par défaut.** Les pushs non-JSON (ou les buffers malformés) produisent quand même une notification au lieu de révoquer l'abonnement.
3. **Toute comparaison d'URL passe par `new URL(target, self.location.origin).href`.** `client.url` est toujours absolu ; le `target` fourni par l'appelant peut être relatif. Un `===` direct entre formes différentes est du code mort.
4. **Les champs `data` de l'expéditeur sont préservés via spreads conditionnels (ne pas écraser avec des défauts).** Utilise des patterns `...(url !== undefined ? { url } : {})` pour qu'un vrai `data.url` du payload survive au merge.
5. **Le listener `install` appelle `skipWaiting()`.** Sans ça, le premier push peut atterrir avant que le SW ait le contrôle de la page.
6. **Le listener `activate` appelle `clients.claim()`.** Va de pair avec `skipWaiting()` pour donner au SW le contrôle immédiat des clients en cours.
7. **Le titre de `showNotification` a un fallback (`'Notification'`).** Un payload malformé satisfait quand même `userVisibleOnly: true` au lieu de déclencher la révocation.
8. **Le handler `notificationclick` enrobe `clients.openWindow(url)` et `client.focus()` dans `.catch(() => {})`.** Les deux peuvent rejeter (popup bloquée, fenêtre fermée) et tu ne veux pas que ça remonte hors du listener.

Le template de référence vit dans `packages/nova/src/configure.ts::SW_TEMPLATE`. Des tests de parité byte-pour-byte gardent cette liste et le template en synchro.

## Envoyer un push

Récupère l'instance `Nova` depuis le container (ou importe-la directement) et appelle `push(subscription, payload, options?)` :

```ts
import { Nova } from '@c9up/nova'

const nova = app.container.resolve<Nova>('nova')

const result = await nova.push(subscription, {
  title: 'Nouveau message',
  body: 'Tu as un fil non lu',
  icon: '/icons/notification.png',
  url: '/inbox/42',
})

if (result.ok) {
  console.log('livré :', result.status, result.endpoint)
} else if (result.reason === 'gone') {
  // L'abonnement a déjà été nettoyé du store.
  console.log('abonnement obsolète :', result.endpoint)
} else {
  console.warn(`push échoué : ${result.status} ${result.reason}`)
}
```

Pour les utilisateurs multi-appareils, utilise `pushToUser` :

```ts
const results = await nova.pushToUser(userId, {
  title: 'Bon retour',
  body: 'Dernière sync : il y a 5 min',
})
const livres = results.filter((r) => r.ok).length
const nettoyes = results.filter((r) => !r.ok && r.reason === 'gone').length
console.log(`${livres} livrés, ${nettoyes} abonnements obsolètes nettoyés`)
```

### Options

| Option | Type | Défaut | Notes |
|---|---|---|---|
| `ttl` | `number` (secondes) | `60` | Durée de rétention par le push service si l'appareil est offline. |
| `urgency` | `'very-low' \| 'low' \| 'normal' \| 'high'` | `'normal'` | RFC 8030 §5.3. `high` pour les alertes prioritaires. |
| `topic` | `string` (≤ 32 chars base64url) | — | Remplace les notifications non livrées du même topic (RFC 8030 §5.4). |

### Forme de `PushResult`

```ts
type PushResult =
  | { ok: true; status: number; endpoint: string }
  | {
      ok: false
      status: number
      endpoint: string
      reason: 'gone' | 'rate-limited' | 'too-large' | 'rejected' | 'server-error'
      cleaned: boolean // true uniquement si le store a été appelé (404/410)
    }
```

`nova.push()` ne lance jamais d'exception sur un échec HTTP par-push — il renvoie `ok: false` pour que les callers traitent chaque abonnement indépendamment. Il LANCE bien `ReamError('NOVA_VAPID_NOT_CONFIGURED', ...)` si la config VAPID est absente au premier appel (validation paresseuse), et re-lance les erreurs réseau non gérées.

### Auto-nettoyage sur 404 / 410

La RFC 8030 §7.3 stipule qu'un endpoint qui renvoie 404 ou 410 est mort. Nova le supprime automatiquement du `SubscriptionStore` configuré (via `store.delete(endpoint)`) avant de renvoyer le résultat `gone`. Le flag `cleaned: true` confirme l'exécution. En cas d'échec du nettoyage (ex : base de données momentanément down), `cleaned` passe à `false` et l'erreur est loguée — le prochain push réessaiera.

## Promouvoir vers un stockage durable

`MemorySubscriptionDriver` (le défaut) convient pour le dev local mais s'évapore au redémarrage et partitionne par nœud. Pour la prod multi-nœud, plug un `SubscriptionStore` durable. **Nova n'embarque aucun couplage avec une base précise** — le package reste agnostique. Ce que livre 48.3 :

1. L'interface `SubscriptionStore` (déjà en 48.1).
2. Un template de migration `push_subscriptions` (saveur Atlas) copiable — `ream configure @c9up/nova` l'écrit dans tes `database/migrations/`.
3. Le snippet de driver Atlas ci-dessous — copie-le dans ton app, plug-le via `config.nova.store`.

### Migration

`ream configure @c9up/nova` écrit `database/migrations/0048_create_push_subscriptions.ts` (idempotent — sauté s'il existe déjà). Le template livré est aussi consultable à `node_modules/@c9up/nova/migrations/create_push_subscriptions.ts`. Lance ensuite ton workflow de migration habituel (`ream migrations:run`).

Le schéma :

```ts
import { Migration } from '@c9up/atlas'

export default class CreatePushSubscriptions extends Migration {
  async up() {
    this.schema.createTable('push_subscriptions', (t) => {
      t.string('endpoint', 2048).primary()              // RFC 8030 : globalement unique
      t.string('user_id', 255).notNullable().index()    // shape libre côté app
      t.string('p256dh', 100).notNullable()             // base64url(P-256 décompressée), 87 chars
      t.string('auth', 50).notNullable()                // base64url(16 octets), 22 chars
      t.bigInteger('expiration_time').nullable()        // ms epoch ; null = pas d'expiration (typique)
      t.timestamps()
    })
  }

  async down() {
    this.schema.dropTable('push_subscriptions')
  }
}
```

### Driver (à copier dans ton app)

Nova n'embarque PAS ce driver — ça forcerait toute install Nova à peer-dépendre d'Atlas. Copie ces ~30 lignes dans `app/services/AtlasSubscriptionDriver.ts` (ou ailleurs selon ton organisation), et plug-le via `config.nova.store` :

```ts
// app/services/AtlasSubscriptionDriver.ts
import type { AsyncDatabaseConnection } from '@c9up/atlas'
import type { PushSubscription, SubscriptionStore } from '@c9up/nova'

export class AtlasSubscriptionDriver implements SubscriptionStore {
  // `tableName` est interpolé brut dans les identifiants SQL — passe une
  // constante (ou une valeur que tu contrôles), JAMAIS d'input utilisateur.
  constructor(
    private readonly db: AsyncDatabaseConnection,
    private readonly tableName = 'push_subscriptions',
  ) {}

  async save(userId: string, subscription: PushSubscription): Promise<void> {
    const { endpoint, expirationTime, keys } = subscription
    const ph = (n: number) => (this.db.dialect === 'postgres' ? `$${n}` : '?')
    if (this.db.dialect === 'mysql') {
      await this.db.execute(
        `INSERT INTO ${this.tableName}
           (endpoint, user_id, p256dh, auth, expiration_time, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           user_id = VALUES(user_id),
           p256dh = VALUES(p256dh),
           auth = VALUES(auth),
           expiration_time = VALUES(expiration_time),
           updated_at = NOW()`,
        [endpoint, userId, keys.p256dh, keys.auth, expirationTime],
      )
      return
    }
    // sqlite + postgres — `ON CONFLICT(endpoint) DO UPDATE`
    await this.db.execute(
      `INSERT INTO ${this.tableName}
         (endpoint, user_id, p256dh, auth, expiration_time, created_at, updated_at)
       VALUES (${ph(1)}, ${ph(2)}, ${ph(3)}, ${ph(4)}, ${ph(5)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(endpoint) DO UPDATE SET
         user_id = excluded.user_id,
         p256dh = excluded.p256dh,
         auth = excluded.auth,
         expiration_time = excluded.expiration_time,
         updated_at = CURRENT_TIMESTAMP`,
      [endpoint, userId, keys.p256dh, keys.auth, expirationTime],
    )
  }

  async listByUser(userId: string): Promise<PushSubscription[]> {
    const ph = this.db.dialect === 'postgres' ? '$1' : '?'
    const rows = await this.db.query<{
      endpoint: string
      expiration_time: number | string | null
      p256dh: string
      auth: string
    }>(
      `SELECT endpoint, expiration_time, p256dh, auth
       FROM ${this.tableName}
       WHERE user_id = ${ph}
       ORDER BY created_at ASC`,
      [userId],
    )
    return rows.map((row) => ({
      endpoint: row.endpoint,
      expirationTime:
        row.expiration_time === null
          ? null
          : Number.isFinite(Number(row.expiration_time))
            ? Number(row.expiration_time)
            : null,
      keys: { p256dh: row.p256dh, auth: row.auth },
    }))
  }

  async delete(endpoint: string): Promise<void> {
    const ph = this.db.dialect === 'postgres' ? '$1' : '?'
    await this.db.execute(
      `DELETE FROM ${this.tableName} WHERE endpoint = ${ph}`,
      [endpoint],
    )
  }
}
```

Branche-le dans `config/nova.ts` — **garde le `routePrefix` et le `guard`** générés par configure ; cet exemple ajoute juste la clé `store`. Supprimer `guard: 'jwt'` exposerait `POST /api/nova/subscribe` sans authentification.

```ts
import { defineConfig } from '@c9up/nova'
import env from '#start/env'
import database from '#config/database'
import { AtlasSubscriptionDriver } from '#services/AtlasSubscriptionDriver'

export default defineConfig({
  routePrefix: '/api/nova',
  guard: 'jwt',
  store: new AtlasSubscriptionDriver(database.connection),
  vapid: {
    publicKey: env.get('NOVA_VAPID_PUBLIC_KEY'),
    privateKey: env.get('NOVA_VAPID_PRIVATE_KEY'),
    subject: env.get('NOVA_VAPID_SUBJECT'),
  },
})
```

### Autres backends (Redis, KV, hébergé)

Le même pattern s'applique à n'importe quel backend. Implémente `save`, `listByUser`, `delete` contre ton store de choix et passe l'instance à `config.nova.store`. Nova ne sort jamais de l'interface ; il ignore quel moteur tourne derrière.

## Tests avec `helix.nova.fake`

Remplace l'instance `Nova` réelle par un collecteur en mémoire pendant un test. Le fake capture chaque appel `push` / `pushToUser` et expose des helpers d'assertion — pas de `web-push`, pas de réseau, pas de consultation de `SubscriptionStore`.

```ts
import { FakeNova } from '@c9up/nova/testing'
import { nova, useContainer } from '@c9up/helix'
import { test } from '@c9up/helix'

test('subscribe + welcome push', async () => {
  useContainer(container)        // le container de ton app
  nova.fake(FakeNova)            // override du token 'nova' dans le container

  await runYourSubscribeFlow()   // le code testé appelle nova.pushToUser(...)

  nova.assertPushed({ userId: 'user-A', title: 'Welcome' })
})
```

Le fake est auto-nettoyé à la fin du test via la queue de cleanup per-test de Helix (même cycle de vie que `helix.mail.fake`).

### Formes de prédicat

`nova.assertPushed(predicate)` accepte deux formes :

**Prédicat objet** — tous les champs présents doivent matcher (combinés en AND) :

| Champ | Match | Notes |
|---|---|---|
| `userId` | Appels `pushToUser` uniquement | `kind === 'fan-out'` |
| `endpoint` | Appels `push` (single) uniquement | `kind === 'single'` |
| `title` / `body` | `payload.title` / `payload.body` exact | |
| `urgency` / `topic` | `options.urgency` / `options.topic` | |
| `containing` | `JSON.stringify(payload).includes(needle)` | La chaîne vide est rejetée (matcherait tous les pushes) |

**Prédicat fonction** — `(captured: CapturedPush) => boolean`. Invoqué une fois par capture ; premier `true` → match.

`nova.assertNotPushed(predicate)` est l'inverse.

### Forwarders

| Helper | Comportement sans fake actif |
|---|---|
| `nova.fake(FakeNova)` | Throw si appelé hors d'un test frame |
| `nova.assertPushed` / `nova.assertNotPushed` | Throw "no active fake" |
| `nova.getPushed` | Throw "no active fake" |
| `nova.current()` | Retourne `null` |
| `nova.reset()` | No-op (safe à appeler depuis un teardown) |

### Pourquoi `pushToUser` retourne `[]` sous le fake

`FakeNova.pushToUser` ne consulte PAS le `SubscriptionStore` ; il capture l'appel (userId + payload + options) et retourne `[]`. L'assertion porte sur l'**intention** d'appel, pas sur la livraison par device. Si ton test a besoin du fan-out réel par device (plusieurs entrées `PushResult`, cleanup 410 contre un vrai store), construis un vrai `Nova` avec un `MemorySubscriptionDriver` pré-chargé avec des fixtures — ce chemin exécute la vraie logique de livraison.

## Ce qui livre par story

| Capacité | Story | Statut |
|---|---|---|
| Génération VAPID + CLI | 48.1 | Actif |
| Route `POST /api/nova/subscribe` + interface `SubscriptionStore` + `MemorySubscriptionDriver` | 48.1 | Actif |
| `subscribe()` + `registerServiceWorker()` côté navigateur | 48.1 | Actif |
| Livraison `nova.push(subscription, payload)` + `nova.pushToUser(userId, payload)` Web Push (AES-128-GCM via `web-push`) | 48.2 | Actif |
| Template de migration `push_subscriptions` + snippet driver Atlas dans la doc (sans peerDep) | 48.3 | Actif |
| `helix.nova.fake(FakeNova)` + `nova.assertPushed` / `nova.assertNotPushed` (test integration) | 48.5 | Actif |
| Scaffold du Service Worker (`public/sw.js`) + handlers push/notificationclick | 48.4 | Actif |

## Références

- [RFC 8030 — Web Push protocol](https://www.rfc-editor.org/rfc/rfc8030)
- [RFC 8188 — Encrypted Content-Encoding for HTTP](https://www.rfc-editor.org/rfc/rfc8188)
- [RFC 8291 — Message Encryption for Web Push](https://www.rfc-editor.org/rfc/rfc8291)
- [RFC 8292 — VAPID](https://www.rfc-editor.org/rfc/rfc8292)
- [MDN — Push API](https://developer.mozilla.org/fr/docs/Web/API/Push_API)
- [MDN — PushSubscription](https://developer.mozilla.org/fr/docs/Web/API/PushSubscription)
- [Package npm `web-push`](https://github.com/web-push-libs/web-push)
