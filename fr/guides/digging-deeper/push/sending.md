# S’abonner et envoyer

Ce guide couvre l'abonnement d'un navigateur et l'envoi d'un push :

- Abonnement côté client
- Envoyer un push

## Abonnement côté client

```ts
import { registerServiceWorker, subscribe } from '@c9up/nova/client'

await registerServiceWorker('/sw.js')
const pushSubscription = await subscribe(import.meta.env.VITE_NOVA_VAPID_PUBLIC_KEY)
console.log('abonné :', pushSubscription.endpoint)
```

`subscribe()` attend le Service Worker actif, appelle `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, puis POST le résultat sur `/api/nova/subscribe` avec `credentials: 'include'` pour transporter automatiquement le cookie/JWT.

À la déconnexion, appelez `unsubscribe()` (mêmes options) avant que la session se termine. Elle envoie `DELETE /api/nova/subscribe` avec l'endpoint du navigateur, puis appelle `PushSubscription.unsubscribe()` — même si le serveur a refusé, car un endpoint mort reçoit `410` et sa ligne est supprimée au push suivant. Elle renvoie `false` quand le navigateur ne détenait aucun abonnement.

```ts
import { unsubscribe } from '@c9up/nova/client'

await unsubscribe()
await logout()
```

Le sous-chemin `@c9up/nova/client` est strictement navigateur — sa source ne contient aucun import `node:` — il s'empaquette donc proprement via Vite/Rollup, sans polyfill.

## Envoyer un push

Récupérez l'instance `Nova` depuis le container (ou importez-la directement) et appelez `push(subscription, payload, options?)` :

```ts
const nova = await app.container.resolve('nova.push') // typé Nova ; 'nova' est un alias de compatibilité

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

Pour les utilisateurs multi-appareils, utilisez `pushToUser` :

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
      reason: 'refused' | 'gone' | 'rate-limited' | 'too-large' | 'rejected' | 'server-error'
      cleaned: boolean // true si l'abonnement a été supprimé du store
      retryAfter?: number // secondes, depuis Retry-After sur un 429 ou un 503 (plafonné à un jour)
    }
```

| `reason` | `status` | Quand |
|---|---|---|
| `refused` | `0` | Pas envoyé : l'endpoint n'est pas dans `delivery.pushServices`, ou se résout vers une adresse non publique. |
| `gone` | `404` / `410` | Le service push a abandonné l'abonnement ; il est supprimé du store. |
| `gone` | `0` | Pas envoyé : les clés stockées ne sont pas un point P-256 et un secret de 16 octets, rien ne pourra jamais être chiffré pour elles ; l'abonnement est supprimé du store. |
| `too-large` | `413` / `0` | Le service push a refusé la taille, ou le JSON du payload dépasse 3993 octets et n'a pas été envoyé. |
| `rate-limited` | `429` | Attendez `retryAfter` secondes, s'il est présent, avant de repousser vers cet endpoint. |
| `rejected` | `400` / `401` / `403` | Le service push a refusé la requête (souvent une clé VAPID qui ne correspond pas). |
| `server-error` | `5xx`, autre, ou `0` | Le service push a échoué, n'a pas répondu à temps, ou a répondu avec plus de 16 Kio. |

Un payload est chiffré en un seul enregistrement (RFC 8291 §4), qui contient au plus 3993 octets en clair : gardez son JSON en dessous, et envoyez un identifiant avec lequel le service worker récupère le reste.

`nova.push()` ne lance jamais d'exception sur ce que fait l'endpoint — un statut HTTP, pas de réponse à temps, une connexion qui échoue — il renvoie `ok: false` pour que les callers traitent chaque abonnement indépendamment. Il LANCE bien `NovaError('E_NOVA_VAPID_NOT_CONFIGURED', ...)` si la config VAPID est absente ou malformée au premier appel (validation paresseuse), et lance sur un mauvais usage : un `ttl` ou un `topic` invalide, un payload qui ne se sérialise pas. `pushToUser()` transforme une exception sur un abonnement en résultat `server-error`, pour qu'un appareil n'arrête pas les autres.

### Auto-nettoyage sur 404 / 410

La RFC 8030 §7.3 stipule qu'un endpoint qui renvoie 404 ou 410 est mort. Nova le supprime automatiquement du `SubscriptionStore` configuré (via `store.delete(endpoint)`) avant de renvoyer le résultat `gone`. Le flag `cleaned: true` confirme l'exécution. En cas d'échec du nettoyage (ex : base de données momentanément down), `cleaned` passe à `false` et l'erreur est loguée — le prochain push réessaiera.
