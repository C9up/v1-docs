# Nova — Notifications Web Push

Statut : **Actif** — endpoint d'abonnement, livraison des pushs, quatre stores d'abonnements, scaffold du Service Worker et l'intégration de test `helix.nova.fake`.

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

La clé privée signe chaque push que l'application enverra : qui peut la lire peut envoyer des notifications au nom de l'application, à chacun de ses abonnés. Quand la commande crée `.env`, elle le crée en `0600` — propriétaire seul — au lieu de laisser l'umask le rendre lisible par tout le monde. Quand `.env` existe déjà, ses permissions sont la décision du déploiement : la commande n'y touche pas et le signale si le fichier est lisible au-delà de son propriétaire.

## Configuration

```ts
// config/nova.ts
import { defineConfig, stores } from '@c9up/nova'
import env from '#start/env'

export default defineConfig({
  routePrefix: '/api/nova', // POST /api/nova/subscribe
  guard: 'jwt',             // n'importe quelle stratégie Warden, ou null pour les tests uniquement

  // Quel store garde les abonnements. Nommé dans l'environnement, pour qu'un
  // déploiement choisisse son backend sans éditer ce fichier.
  default: env.get('NOVA_STORE', 'memory'),
  stores: {
    memory: stores.memory(),
    file:   stores.file({ path: 'storage/push_subscriptions.json' }),
    sql:    stores.sql({ connection: () => app.container.resolve('db') }),
    redis:  stores.redis({ connection: 'main' }),
  },

  vapid: {
    publicKey: env.get('NOVA_VAPID_PUBLIC_KEY'),
    privateKey: env.get('NOVA_VAPID_PRIVATE_KEY'),
    subject: env.get('NOVA_VAPID_SUBJECT'),
  },
})
```

Les factories sont paresseuses : seul le store que `default` nomme est construit, donc déclarer un store Redis dans une config qui tourne sur le store fichier ne coûte rien.

Un `default` qui nomme un store absent de `stores` est refusé au boot — et un `default` sans bloc `stores` du tout l'est aussi. Ni l'un ni l'autre ne retombe sur le driver en mémoire : une application qui voulait persister ses abonnements et a obtenu la mémoire en silence ne l'apprend qu'au redémarrage qui les a tous perdus.

Le provider respecte aussi une liaison `'SubscriptionStore'` préexistante dans le container, qui l'emporte sur la config. `store: <instance>` est la forme mono-store, gardée pour les configs écrites avec elle.

Seul `guard` décide si `POST /api/nova/subscribe` est authentifié. L'enlever n'est pas la même chose que ne pas l'écrire : omettre la clé garde le défaut `'jwt'`, `guard: null` retire le contrôle et sert aux tests.

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
// Service Worker scaffolded by `ream configure @c9up/nova`.
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

`userVisibleOnly: true` (posé par `subscribe()`) impose au SW d'appeler `showNotification` à chaque push, sinon le navigateur révoque l'abonnement. Le fallback `title = 'Notification'` dans la déstructuration garantit qu'un payload malformé produit quand même une notification (certains navigateurs rejettent `showNotification(undefined, …)`) ; le `try/catch` autour de `event.data.json()` gère les pushs non-JSON de la même façon.

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

`nova.push()` ne lance jamais d'exception sur un échec HTTP par-push — il renvoie `ok: false` pour que les callers traitent chaque abonnement indépendamment. Il LANCE bien `NovaError('E_NOVA_VAPID_NOT_CONFIGURED', ...)` si la config VAPID est absente ou malformée au premier appel (validation paresseuse), et re-lance tout ce qui sort de la surface du protocole Web Push — une panne réseau, un `ttl` ou un `topic` invalide, un payload qui ne se sérialise pas.

### Auto-nettoyage sur 404 / 410

La RFC 8030 §7.3 stipule qu'un endpoint qui renvoie 404 ou 410 est mort. Nova le supprime automatiquement du `SubscriptionStore` configuré (via `store.delete(endpoint)`) avant de renvoyer le résultat `gone`. Le flag `cleaned: true` confirme l'exécution. En cas d'échec du nettoyage (ex : base de données momentanément down), `cleaned` passe à `false` et l'erreur est loguée — le prochain push réessaiera.

## Les stores

`stores.memory()` oublie tout au redémarrage et partitionne par nœud — c'est celui des tests et du travail local. Les trois autres sont durables et prennent la même interface, donc passer de l'un à l'autre est une variable d'environnement.

Quel que soit celui qui est sélectionné, un abonnement est vérifié contre les mêmes règles à l'aller et au retour : un endpoint `https` sous le plafond de stockage de 768 caractères, un `expirationTime` qui vaut `null` ou un nombre, et des `p256dh` / `auth` en base64url aux longueurs qu'un navigateur produit. Un store n'écrit jamais un enregistrement qu'il refuserait de relire, et n'en remet jamais un à la couche push qui échouerait au chiffrement — là où le message ne nomme ni l'enregistrement ni l'endpoint.

### `stores.file({ path })`

Un fichier JSON, réécrit atomiquement, en `0600`. Il contient les endpoints et le secret `auth` que chaque navigateur a émis, ce qui suffit à envoyer des notifications au nom de l'application à tous les abonnés.

**Un seul processus.** Les écritures sont sérialisées à l'intérieur de l'instance, donc une rafale d'abonnements ne peut pas s'entrelacer — mais rien ne prend un verrou que le système d'exploitation fait respecter, donc deux processus qui écrivent le même fichier s'écrasent. Derrière un cluster, `pm2 -i`, ou plusieurs conteneurs, prends le store SQL ou Redis.

### `stores.sql({ connection, table })`

La table `push_subscriptions` que la migration ci-dessous crée. La connexion est prise structurellement — `execute`, `query`, et le dialecte qu'elle annonce — donc ça marche contre une connexion Atlas sans que Nova dépende d'Atlas.

`connection` prend la connexion elle-même, ou une fonction qui en rend une. La forme fonction est ce dont un fichier de config a besoin : `config/nova.ts` est chargé avant le boot de l'application, donc la connexion n'existe pas encore et ne peut pas y être attendue.

`table` vaut `push_subscriptions` par défaut. Il arrive dans le SQL comme un identifiant, là où un paramètre ne peut pas aller, donc tout ce qui n'est pas un identifiant simple est refusé à la construction.

### `stores.redis({ connection, prefix })`

Une clé par abonnement et un set par utilisateur. `connection` prend un client, une fonction qui en rend un, ou le **nom** d'une connexion `@c9up/quasar` — résolu au runtime, pour que quasar reste un peer optionnel et n'entre jamais dans le graphe de build de Nova. Une connexion à qui manque une des six commandes que le store émet est refusée en la nommant, plutôt que d'échouer au premier abonnement.

`prefix` vaut `nova:push` par défaut ; change-le pour faire tourner deux applications sur une même base Redis.

La durabilité est celle du serveur, pas celle du store : un Redis sans persistance perd tous les abonnements au redémarrage. Les navigateurs se réabonnent à leur prochaine visite, donc le coût est une notification manquée et non un compte cassé — mais si ça compte, prends un Redis persistant ou le store SQL.

### Écrire le tien

`SubscriptionStore`, c'est trois méthodes. Les URL d'endpoint sont globalement uniques par service push, donc `delete(endpoint)` retire l'abonnement quel qu'en soit le propriétaire, et `save()` réattribue un endpoint plutôt que de le laisser attaché à deux comptes — un navigateur réutilisé au fil d'une déconnexion/reconnexion continuerait sinon à livrer les notifications de l'ancien compte au nouvel utilisateur.

```ts
import type { PushSubscription, SubscriptionStore } from '@c9up/nova'

export class MySubscriptionStore implements SubscriptionStore {
  async save(userId: string, subscription: PushSubscription): Promise<void> {}
  async listByUser(userId: string): Promise<PushSubscription[]> { return [] }
  async delete(endpoint: string): Promise<void> {}
}
```

Passe une instance en `store`, ou enveloppe-la dans une factory sous `stores`.

### Migration

`ream configure @c9up/nova` écrit `database/migrations/0048_create_push_subscriptions.ts` (idempotent — sauté s'il existe déjà). Le template livré est aussi consultable à `node_modules/@c9up/nova/migrations/create_push_subscriptions.ts`. Lance ensuite ton workflow de migration habituel (`ream migrations:run`).

```ts
import { Migration } from '@c9up/atlas'

export default class CreatePushSubscriptions extends Migration {
  async up() {
    this.schema.createTable('push_subscriptions', (t) => {
      t.string('endpoint', 768).primary()            // 768 x 4 octets = la limite d'index InnoDB utf8mb4
      t.string('user_id', 255).notNullable()         // shape libre côté app (UUID / bigint-en-string)
      t.index('user_id')
      t.string('p256dh', 100).notNullable()          // base64url(P-256 décompressée), 87 chars
      t.string('auth', 50).notNullable()             // base64url(16 octets), 22 chars
      t.bigInteger('expiration_time').nullable()     // ms epoch ; null = pas d'expiration (typique)
      t.timestamp('created_at').notNullable()        // écrites explicitement à chaque insert
      t.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('push_subscriptions')
  }
}
```

Le plafond de 768 n'est pas décoratif : c'est exactement le budget d'index de clé primaire MySQL InnoDB en utf8mb4, et l'endpoint d'abonnement refuse un endpoint plus long par un 400 plutôt que de le laisser échouer en erreur de longueur propre au dialecte à l'insert. Les vrais endpoints de FCM, Mozilla autopush et Apple font tous moins de 200 caractères. Les colonnes de timestamp ne portent pas de défaut DDL parce que `DEFAULT (NOW())` n'est pas une fonction SQLite ; les stores écrivent les deux colonnes explicitement.

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

## Références

- [RFC 8030 — Web Push protocol](https://www.rfc-editor.org/rfc/rfc8030)
- [RFC 8188 — Encrypted Content-Encoding for HTTP](https://www.rfc-editor.org/rfc/rfc8188)
- [RFC 8291 — Message Encryption for Web Push](https://www.rfc-editor.org/rfc/rfc8291)
- [RFC 8292 — VAPID](https://www.rfc-editor.org/rfc/rfc8292)
- [MDN — Push API](https://developer.mozilla.org/fr/docs/Web/API/Push_API)
- [MDN — PushSubscription](https://developer.mozilla.org/fr/docs/Web/API/PushSubscription)
- [Package npm `web-push`](https://github.com/web-push-libs/web-push)
