# nova

`@c9up/nova` : les notifications Web Push pour ream : signature VAPID, envoi chiffré aux services push des navigateurs, une route d'abonnement et un service worker prêt à l'emploi. Guide : [Notifications push](/fr/guides/digging-deeper/push/).

## Installation

```bash
pnpm add @c9up/nova
ream configure @c9up/nova
```

`ream configure @c9up/nova` ajoute le provider et la commande `nova:vapid:generate`, les variables `NOVA_STORE` et `NOVA_VAPID_*` dans `.env`, et écrit `config/nova.ts`, la migration `push_subscriptions` et `public/sw.js`. Dépendances pairs facultatives : `@c9up/ream` (provider et routes), `@c9up/atlas` (la connexion du magasin SQL), `@c9up/quasar` (un magasin Redis désigné par nom de connexion).

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/nova` | L'expéditeur `Nova`, `defineConfig`, les fabriques `stores` et les classes de magasin, le contrôleur d'abonnement, la génération de clés VAPID, la classe du provider et la classe d'erreur. |
| `@c9up/nova/provider` | `NovaProvider` (export par défaut). |
| `@c9up/nova/services/main` | L'instance `Nova` de l'application (export par défaut), utilisable une fois le provider démarré. |
| `@c9up/nova/client` | Les assistants navigateur : enregistrer le service worker, s'abonner, se désabonner. |
| `@c9up/nova/configure` | `configure(codemods)`, exécuté par `ream configure @c9up/nova`. |
| `@c9up/nova/commands` | Le chargeur de commandes (`getMetaData`, `getCommand`) pour `nova:vapid:generate`. |
| `@c9up/nova/testing` | `FakeNova`, une doublure de test qui enregistre les envois. |

## Exports

### `@c9up/nova`

| Export | Nature | Description |
|---|---|---|
| `Nova` | classe | Chiffre et envoie des notifications à un abonnement ou à tous les abonnements d'un utilisateur. |
| `PushPayload` | interface | La notification envoyée. |
| `PushOptions` | interface | `ttl`, `urgency`, `topic` par envoi. |
| `PushUrgency` | type | `'very-low' \| 'low' \| 'normal' \| 'high'`. |
| `PushResult` | type | Le résultat d'un envoi. |
| `PushFailureReason` | type | Pourquoi un envoi n'a pas été délivré. |
| `NovaDeliveryOptions` | interface | La façon dont les envois quittent le serveur. |
| `PushTargetPolicy` | interface | Les hôtes vers lesquels un envoi peut partir. |
| `PushHttpClient` | interface | Le client par lequel passent les envois. |
| `DEFAULT_PUSH_SERVICES` | const | Les services push autorisés par défaut. |
| `defineConfig` | fonction | Type la configuration `nova`. |
| `NovaConfig` | interface | La configuration `nova`. |
| `NovaVapidConfig` | interface | L'identité VAPID. |
| `NovaRouteMiddleware` | type | Un middleware pour les routes d'abonnement. |
| `stores` | const | Les fabriques des magasins configurés : `memory`, `file`, `sql`, `redis`. |
| `SubscriptionStoreFactory` | type | `() => SubscriptionStore`. |
| `SubscriptionStore` | interface | Où sont conservés les abonnements. |
| `PushSubscription` | interface | L'abonnement d'un navigateur. |
| `SaveSubscriptionOptions` | interface | `{ maxPerUser?: number }`. |
| `MemorySubscriptionDriver` | classe | Un magasin en mémoire. |
| `FileSubscriptionStore` | classe | Un magasin dans un fichier JSON. |
| `SqlSubscriptionStore` | classe | Un magasin dans la table `push_subscriptions`. |
| `SqlSubscriptionStoreOptions`, `SubscriptionDatabase`, `SubscriptionDatabaseResolver` | type | Les options et la connexion du magasin SQL. |
| `RedisSubscriptionStore` | classe | Un magasin dans Redis. |
| `RedisSubscriptionStoreOptions`, `SubscriptionRedisClient`, `SubscriptionRedisResolver` | type | Les options et le client du magasin Redis. |
| `quasarConnection` | fonction | Une connexion `@c9up/quasar` par son nom, vérifiée pour les commandes qu'émet le magasin Redis. |
| `SubscribeController` | classe | Le gestionnaire derrière les routes d'abonnement. |
| `generateVapidKeys` | fonction | Génère une paire de clés VAPID. |
| `VapidKeyPair` | interface | `{ publicKey: string; privateKey: string }`, en base64url. |
| `NovaProvider` | provider | Aussi l'export par défaut de `@c9up/nova/provider`. |
| `NovaAppContext` | interface | Ce que le provider lit de l'application. |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs) |

### `Nova`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Nova(store: SubscriptionStore, vapidConfig: NovaVapidConfig \| undefined, delivery?: NovaDeliveryOptions)` | |
| `push` | `push(subscription: PushSubscription, payload: PushPayload, options?: PushOptions): Promise<PushResult>` | Envoie une notification. Un endpoint hors des services push autorisés est `refused` ; des clés pour lesquelles rien ne peut être chiffré sont supprimées du magasin ; une charge de plus de 3993 octets une fois sérialisée n'est pas envoyée (`too-large`). Un abonnement que le service push déclare disparu est supprimé (`cleaned: true`). |
| `pushToUser` | `pushToUser(userId: string \| number \| bigint, payload: PushPayload, options?: PushOptions): Promise<PushResult[]>` | Envoie à tous les abonnements de `userId` (un number ou un bigint est cherché sous son texte décimal), au plus `concurrency` à la fois ; un résultat par abonnement, et un appareil en échec n'arrête jamais les autres. |

| Champ de `PushPayload` | Type | Description |
|---|---|---|
| `title` | `string` | Requis. |
| `body`, `icon`, `url`, `tag` | `string` | Facultatifs. |
| `data` | `Record<string, unknown>` | Facultatif. |

| Champ de `PushOptions` | Type | Défaut | Description |
|---|---|---|---|
| `ttl` | `number` | `60` | Durée de vie, en secondes. |
| `urgency` | `PushUrgency` | `'normal'` | L'indication d'urgence pour le service push. |
| `topic` | `string` | | Remplace une notification non délivrée du même sujet ; au plus 32 caractères base64url. |

```ts
type PushFailureReason = 'refused' | 'gone' | 'rate-limited' | 'too-large' | 'rejected' | 'server-error'

type PushResult =
  | { ok: true; status: number; endpoint: string }
  | { ok: false; status: number; endpoint: string; reason: PushFailureReason; cleaned: boolean; retryAfter?: number }
```

`retryAfter` est le `Retry-After` du service push sur un 429 ou un 503, en secondes, plafonné à un jour.

### `SubscriptionStore`

| Membre | Signature | Description |
|---|---|---|
| `save` | `save(userId: string, subscription: PushSubscription, options?: SaveSubscriptionOptions): Promise<void>` | Enregistre l'abonnement pour `userId`, puis évince les plus anciens de cet utilisateur au-delà de `maxPerUser` (20 par défaut). |
| `listByUser` | `listByUser(userId: string): Promise<PushSubscription[]>` | Les abonnements de l'utilisateur. |
| `delete` | `delete(endpoint: string): Promise<void>` | Oublie `endpoint`, quel qu'en soit le détenteur. |
| `deleteForUser` | `deleteForUser(userId: string, endpoint: string): Promise<boolean>` | Oublie `endpoint` seulement si `userId` le détient, en une étape ; indique s'il l'a fait. |

`PushSubscription` vaut `{ endpoint: string; expirationTime: number | null; keys: { p256dh: string; auth: string } }`.

| Magasin | Constructeur | Remarques |
|---|---|---|
| `MemorySubscriptionDriver` | `new MemorySubscriptionDriver()` | Oublie tout au redémarrage. |
| `FileSubscriptionStore` | `new FileSubscriptionStore(path: string)` | Un fichier JSON, absolu ou relatif au processus ; un seul processus. |
| `SqlSubscriptionStore` | `new SqlSubscriptionStore(db: SubscriptionDatabaseResolver, options?: { table?: string })` | `table` vaut `'push_subscriptions'` par défaut et doit être un identifiant simple. `db` est une connexion avec `execute` et `query` (et `dialect: 'postgres'` pour les marqueurs `$1`), ou une fonction qui en renvoie une. |
| `RedisSubscriptionStore` | `new RedisSubscriptionStore(redis: SubscriptionRedisResolver, options?: { prefix?: string })` | `prefix` vaut `'nova:push'` par défaut et ne peut pas contenir d'espace. Le client doit offrir `get`, `evalsha` et `script`. |

### `stores`

| Fabrique | Signature |
|---|---|
| `stores.memory` | `memory(): SubscriptionStoreFactory` |
| `stores.file` | `file(options: { path: string }): SubscriptionStoreFactory` |
| `stores.sql` | `sql(options: { connection: SubscriptionDatabaseResolver; table?: string }): SubscriptionStoreFactory` |
| `stores.redis` | `redis(options: { connection: SubscriptionRedisResolver \| string; prefix?: string }): SubscriptionStoreFactory` |

Les fabriques sont paresseuses : seul le magasin sélectionné est construit. Une `connection` en chaîne pour `redis` désigne une connexion `@c9up/quasar`.

| Fonction | Signature | Description |
|---|---|---|
| `quasarConnection` | `quasarConnection(name?: string): Promise<SubscriptionRedisClient>` | La connexion nommée, une fois vérifié qu'elle offre `get`, `evalsha` et `script`. |
| `generateVapidKeys` | `generateVapidKeys(): VapidKeyPair` | Une paire de clés P-256 : la clé publique en point non compressé, la clé privée en scalaire brut de 32 octets, toutes deux en base64url. |
| `defineConfig` | `defineConfig(config: NovaConfig): NovaConfig` | Renvoie la configuration, typée. |

### `SubscribeController`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new SubscribeController(store: SubscriptionStore, options?: SubscribeOptions)` | `options` prend les champs de `PushTargetPolicy` et `maxSubscriptionsPerUser` (20 par défaut). |
| `handle` | `handle(ctx: SubscribeContext): Promise<void>` | Valide le corps `PushSubscription` et l'enregistre pour `ctx.auth.user.id` ; répond 201. |
| `unsubscribe` | `unsubscribe(ctx: SubscribeContext): Promise<void>` | Supprime l'abonnement de l'appelant désigné par `{ endpoint }` ; répond 200, ou 404 si l'utilisateur n'a pas cet abonnement. |

### `@c9up/nova/provider`

| Export | Nature | Description |
|---|---|---|
| `NovaProvider` | provider (par défaut) | `register()` lie le magasin (une liaison existante l'emporte, puis le magasin configuré, puis celui en mémoire) et l'expéditeur `Nova` ; `boot()` publie le service ; `start()` monte `POST` et `DELETE {routePrefix}/subscribe`, avec le guard et les middlewares configurés. |

### `@c9up/nova/services/main`

| Export | Nature | Description |
|---|---|---|
| `default` | const | L'instance `Nova` de l'application. Tout accès à une propriété avant le démarrage du provider lève une erreur. |

```ts
import push from '@c9up/nova/services/main'

await push.pushToUser(user.id, { title: 'New task', body: task.title })
```

### `@c9up/nova/client`

| Export | Nature | Description |
|---|---|---|
| `registerServiceWorker` | fonction | Enregistre le service worker. |
| `subscribe` | fonction | Abonne le navigateur et envoie l'abonnement au serveur. |
| `unsubscribe` | fonction | Détache le navigateur du compte connecté. |
| `urlBase64ToUint8Array` | fonction | Une clé publique VAPID base64url sous la forme `Uint8Array` que prend `applicationServerKey`. |
| `SubscribeOptions` | interface | Options de `subscribe` et `unsubscribe`. |
| `RegisterServiceWorkerOptions` | interface | `{ scope?: string }`, `'/'` par défaut. |
| `errors` | namespace | Les erreurs du client, une classe par code, voir [Erreurs](#erreurs) |

| Fonction | Signature | Description |
|---|---|---|
| `registerServiceWorker` | `registerServiceWorker(path?: string, options?: RegisterServiceWorkerOptions): Promise<ServiceWorkerRegistration>` | `path` vaut `'/sw.js'` par défaut. |
| `subscribe` | `subscribe(vapidPublicKey: string, options?: SubscribeOptions): Promise<PushSubscription>` | Attend le service worker actif, s'abonne avec `userVisibleOnly`, et envoie l'abonnement par POST ; lève `E_NOVA_ENDPOINT_REJECTED` sur une réponse hors 2xx. |
| `unsubscribe` | `unsubscribe(options?: SubscribeOptions): Promise<boolean>` | Supprime l'abonnement sur le serveur par DELETE, puis l'abandonne dans le navigateur même si le serveur a échoué ; `false` si le navigateur n'en avait pas. Appelez-la à la déconnexion. |
| `urlBase64ToUint8Array` | `urlBase64ToUint8Array(base64url: string): Uint8Array` | |

| Champ de `SubscribeOptions` | Type | Défaut | Description |
|---|---|---|---|
| `endpoint` | `string` | `'/api/nova/subscribe'` | La route d'abonnement. |
| `credentials` | `RequestCredentials` | `'include'` | Les credentials de fetch. |
| `headers` | `HeadersInit` | | Des en-têtes supplémentaires, fusionnés par-dessus `content-type: application/json`. |
| `accessToken` | `string` | | Raccourci pour `Authorization: Bearer <accessToken>` ; ignoré si `headers` contient déjà un `authorization`. |

`E_NOVA_ENDPOINT_REJECTED` porte la réponse de la route dans `status` et `responseBody`.

### `@c9up/nova/configure`

| Export | Nature | Description |
|---|---|---|
| `configure` | fonction | `configure(codemods): Promise<void>` : ce qu'exécute `ream configure @c9up/nova`. |

### `@c9up/nova/commands`

| Commande | Description |
|---|---|
| `nova:vapid:generate` | Génère une paire de clés VAPID et écrit les variables `NOVA_VAPID_*` dans `.env`. Refuse de remplacer une clé privée existante sans `--force` ; un `.env` qu'elle crée n'est lisible que par son propriétaire. |

### `@c9up/nova/testing`

| Export | Nature | Description |
|---|---|---|
| `FakeNova` | classe | Enregistre les appels à `push` et `pushToUser` ; n'envoie, ne chiffre et ne stocke rien. |
| `CapturedPush` | type | Un appel enregistré : `kind: 'single'` (avec `subscription`) ou `kind: 'fan-out'` (avec `userId`), plus `payload`, `options`, `timestamp`. |
| `FakeNovaPredicate` | interface | Filtre sur `userId`, `endpoint`, `title`, `body`, `urgency`, `topic`, ou `containing` (une sous-chaîne de la charge en JSON). |
| `FakeNovaPredicateArg` | type | Un `FakeNovaPredicate` ou `(captured: CapturedPush) => boolean`. |

| Membre de `FakeNova` | Signature | Description |
|---|---|---|
| `push` | `push(subscription, payload, options?): Promise<PushResult>` | Enregistre l'appel ; répond `{ ok: true, status: 201 }`. |
| `pushToUser` | `pushToUser(userId, payload, options?): Promise<PushResult[]>` | Enregistre l'appel ; répond `[]`. Refuse un id que `Nova` refuse. |
| `getPushed` | `getPushed(): CapturedPush[]` | Une copie de ce qui a été enregistré. |
| `reset` | `reset(): void` | Oublie ce qui a été enregistré. |
| `assertPushed` | `assertPushed(predicate: FakeNovaPredicateArg): void` | Lève une erreur si aucun envoi enregistré ne correspond. |
| `assertNotPushed` | `assertNotPushed(predicate: FakeNovaPredicateArg): void` | Lève une erreur si un envoi enregistré correspond. |

## Configuration

`config/nova.ts`, écrit par `ream configure @c9up/nova` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `routePrefix` | `string` | `'/api/nova'` | Préfixe des routes d'abonnement. |
| `guard` | `string \| null` | `'jwt'` | Le guard warden sur les routes ; `null` les monte sans guard (tests uniquement). |
| `default` | `string` | | Le nom du magasin à utiliser, une clé de `stores`. La configuration générée lit `NOVA_STORE` (`memory` par défaut). |
| `stores` | `Record<string, SubscriptionStoreFactory>` | | Les magasins que l'app peut utiliser, par nom. |
| `store` | `SubscriptionStore` | en mémoire | Un magasin déjà construit ; utilisé quand `stores` ne désigne pas celui sélectionné. |
| `vapid` | `NovaVapidConfig` | | `publicKey`, `privateKey` (base64url) et `subject` (`mailto:` ou `https://`). Requis pour envoyer ; les routes fonctionnent sans. |
| `delivery.timeout` | `number` | `10000` | Délai d'une requête d'envoi, en ms ; au-delà, le résultat est `server-error` avec le statut 0. |
| `delivery.concurrency` | `number` | `10` | Le nombre de requêtes que `pushToUser` garde en vol à la fois. |
| `delivery.http` | `PushHttpClient` | `HttpClient` de `@c9up/ream/http-client` | Le client par lequel passent les envois ; celui par défaut refuse les adresses non publiques. |
| `delivery.pushServices` | `readonly string[]` | `DEFAULT_PUSH_SERVICES` | Les hôtes vers lesquels un envoi peut partir, chacun avec ses sous-domaines. Vérifié à l'arrivée d'un abonnement et avant chaque envoi. |
| `delivery.allowHosts` | `readonly string[]` | `[]` | Des exemptions exactes `host` ou `host:port`, pour un service push voisin de l'app en développement. |
| `maxSubscriptionsPerUser` | `number` | `20` | Le nombre d'abonnements qu'un utilisateur peut détenir ; les plus anciens partent au-delà. |
| `middleware` | `NovaRouteMiddleware[]` | `[]` | Des middlewares exécutés avant le gestionnaire des routes d'abonnement, comme une limite de débit. |

`DEFAULT_PUSH_SERVICES` vaut `fcm.googleapis.com`, `push.services.mozilla.com`, `notify.windows.com`, `push.apple.com`.

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `'nova.push'` | L'expéditeur `Nova`. |
| `'nova.subscriptions'` | Le `SubscriptionStore`. |
| `'nova'` | Le même `Nova` (nom antérieur, toujours lié). |
| `'SubscriptionStore'` | Le même magasin (nom antérieur, toujours lié). |

Les jetons sont déclarés sur `ContainerBindings` : `container.resolve('nova.push')` est typé.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_NOVA_INVALID_SUBSCRIPTION`](/fr/reference/errors#e-nova-invalid-subscription) | Le corps d'abonnement ou de désabonnement n'est pas un `PushSubscription` valide (HTTP 400). |
| [`E_NOVA_SUBSCRIPTION_CONFLICT`](/fr/reference/errors#e-nova-subscription-conflict) | Une autre requête écrivait le même endpoint au même moment (HTTP 409). |
| [`E_NOVA_SUBSCRIPTION_NOT_FOUND`](/fr/reference/errors#e-nova-subscription-not-found) | L'utilisateur n'a pas cet abonnement (HTTP 404). |
| [`E_NOVA_MISSING_USER`](/fr/reference/errors#e-nova-missing-user) | Le gestionnaire d'abonnement s'est exécuté sans utilisateur authentifié. |
| [`E_NOVA_INVALID_USER_ID`](/fr/reference/errors#e-nova-invalid-user-id) | L'utilisateur n'a pas d'id utilisable (une chaîne non vide ou un entier), ou `pushToUser` en a reçu un qui n'en est pas un. |
| [`E_NOVA_VAPID_NOT_CONFIGURED`](/fr/reference/errors#e-nova-vapid-not-configured) | Un envoi a lieu sans clé ou sujet VAPID. |
| [`E_NOVA_HTTP_CLIENT_MISSING`](/fr/reference/errors#e-nova-http-client-missing) | L'envoi a besoin du client HTTP sortant de `@c9up/ream` et aucun n'est fourni. |
| [`E_NOVA_UNKNOWN_STORE`](/fr/reference/errors#e-nova-unknown-store) | `default` désigne un magasin que `stores` ne déclare pas, ou `stores` n'a pas de `default`. |
| [`E_NOVA_INVALID_TABLE`](/fr/reference/errors#e-nova-invalid-table) | Le nom de table du magasin SQL n'est pas un identifiant simple. |
| [`E_NOVA_INVALID_PREFIX`](/fr/reference/errors#e-nova-invalid-prefix) | Le préfixe de clés du magasin Redis contient une espace. |
| [`E_NOVA_STORE_BUSY`](/fr/reference/errors#e-nova-store-busy) | Un abonnement a changé à chaque tentative d'écriture. |
| [`E_NOVA_STORE_FILE_UNREADABLE`](/fr/reference/errors#e-nova-store-file-unreadable) | Le fichier du magasin fichier n'est pas du JSON valide. |
| [`E_NOVA_QUASAR_MISSING`](/fr/reference/errors#e-nova-quasar-missing) | Un magasin Redis désigne une connexion et `@c9up/quasar` n'est pas installé. |
| [`E_NOVA_REDIS_INCOMPLETE`](/fr/reference/errors#e-nova-redis-incomplete) | La connexion quasar n'offre pas une commande qu'émet le magasin. |
| [`E_NOVA_NOT_BOOTED`](/fr/reference/errors#e-nova-not-booted) | `@c9up/nova/services/main` a servi avant l'exécution de `NovaProvider.boot()`. |
| [`E_NOVA_INVALID_OPTION`](/fr/reference/errors#e-nova-invalid-option) | Une option d'envoi ou de magasin sort de ses limites : `concurrency`, `timeout`, une entrée de `pushServices` ou `allowHosts`, `maxSubscriptionsPerUser`, `maxPerUser`, ou le `ttl` ou le `topic` d'un envoi. |
| [`E_NOVA_ASSERTION_FAILED`](/fr/reference/errors#e-nova-assertion-failed) | `FakeNova.assertPushed()` ou `assertNotPushed()` n'est pas vérifiée. |
| [`E_NOVA_INVALID_PREDICATE`](/fr/reference/errors#e-nova-invalid-predicate) | Une assertion de `FakeNova` a reçu un `containing` vide, qui correspondrait à tout envoi. |
| [`E_NOVA_INTERNAL`](/fr/reference/errors#e-nova-internal) | Un invariant de nova a cédé (la paire de clés VAPID générée par Node a une forme inattendue). Un bug : signalez-le. |

Levées par `@c9up/nova/client`, exportées depuis son propre `errors` :

| Code | Levée quand |
|---|---|
| [`E_NOVA_SERVICE_WORKER_UNSUPPORTED`](/fr/reference/errors#e-nova-service-worker-unsupported) | L'environnement n'a pas de `navigator.serviceWorker`. |
| [`E_NOVA_PUSH_SUBSCRIBE_FAILED`](/fr/reference/errors#e-nova-push-subscribe-failed) | Le navigateur a refusé `pushManager.subscribe()` ; l'erreur du navigateur est la `cause`. |
| [`E_NOVA_ENDPOINT_REJECTED`](/fr/reference/errors#e-nova-endpoint-rejected) | La route d'abonnement a répondu à `subscribe()` autre chose que 201, ou à `unsubscribe()` une erreur autre que 404. `status` et `responseBody` gardent la réponse. |

## Migration

- Nova exige maintenant `@c9up/ream` 0.2.32 ou plus récent : il reconnaît les échecs du client HTTP à leur code `E_HTTP_CLIENT_*`. Mettez les deux paquets à jour ensemble.
- `NovaError` et `NovaTypeError` disparaissent : testez `error.code`, ou `error instanceof errors.E_NOVA_*` avec `import { errors } from '@c9up/nova'`. `E_NOVA_INVALID_OPTION` et `E_NOVA_INVALID_USER_ID` ne sont plus des `TypeError`.
- `error.hint` devient `error.help`.
- `NovaClientError` disparaît : `import { errors } from '@c9up/nova/client'` et testez `E_NOVA_SERVICE_WORKER_UNSUPPORTED`, `E_NOVA_PUSH_SUBSCRIBE_FAILED` ou `E_NOVA_ENDPOINT_REJECTED` ; ce dernier garde `status` et `responseBody`.

## Voir aussi

- [Introduction](/fr/guides/digging-deeper/push/)
- [S'abonner et envoyer](/fr/guides/digging-deeper/push/sending)
- [Service worker](/fr/guides/digging-deeper/push/service-worker)
- [Stockage et tests](/fr/guides/digging-deeper/push/stores-and-testing)
