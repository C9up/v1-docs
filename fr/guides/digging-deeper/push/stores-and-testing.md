# Stockage et tests

Ce guide couvre le stockage des abonnements et les tests :

- Les stores
- Tests avec `FakeNova`

## Les stores

`stores.memory()` oublie tout au redémarrage et partitionne par nœud — c'est celui des tests et du travail local. Les trois autres sont durables et prennent la même interface, donc passer de l'un à l'autre est une variable d'environnement.

Quel que soit celui qui est sélectionné, un abonnement est vérifié contre les mêmes règles à l'aller et au retour : un endpoint `https` sous le plafond de stockage de 768 caractères, un `expirationTime` qui vaut `null` ou un nombre, un `p256dh` qui est un point de P-256 (65 octets) et un `auth` qui est un secret de 16 octets, tous deux en base64url. Un store n'écrit jamais un enregistrement qu'il refuserait de relire, et n'en remet jamais un à la couche push qui échouerait au chiffrement — là où le message ne nomme ni l'enregistrement ni l'endpoint.

### `stores.file({ path })`

Un fichier JSON, réécrit atomiquement, en `0600`. Il contient les endpoints et le secret `auth` que chaque navigateur a émis, ce qui suffit à envoyer des notifications au nom de l'application à tous les abonnés.

**Un seul processus.** Les écritures sont sérialisées à l'intérieur de l'instance, donc une rafale d'abonnements ne peut pas s'entrelacer — mais rien ne prend un verrou que le système d'exploitation fait respecter, donc deux processus qui écrivent le même fichier s'écrasent. Derrière un cluster, `pm2 -i`, ou plusieurs conteneurs, prends le store SQL ou Redis.

### `stores.sql({ connection, table })`

La table `push_subscriptions` que la migration ci-dessous crée. La connexion est prise structurellement — `execute`, `query`, et le dialecte qu'elle annonce — donc ça marche contre une connexion Atlas sans que Nova dépende d'Atlas.

`connection` prend la connexion elle-même, ou une fonction qui en rend une. La forme fonction est ce dont un fichier de config a besoin : `config/nova.ts` est chargé avant le boot de l'application, donc la connexion n'existe pas encore et ne peut pas y être attendue.

`table` vaut `push_subscriptions` par défaut. Il arrive dans le SQL comme un identifiant, là où un paramètre ne peut pas aller, donc tout ce qui n'est pas un identifiant simple est refusé à la construction.

### `stores.redis({ connection, prefix })`

Une clé par abonnement et un set par utilisateur. `connection` prend un client, une fonction qui en rend un, ou le **nom** d'une connexion `@c9up/quasar` — résolu au runtime, pour que quasar reste un peer optionnel et n'entre jamais dans le graphe de build de Nova. Le store émet trois commandes, `get`, `evalsha` et `script` ; une connexion à qui en manque une est refusée en la nommant, plutôt que d'échouer au premier abonnement. Un client doit répondre à EVALSHA et à SCRIPT LOAD (EVAL seul ne suffit plus) : chaque script tourne par son SHA1 et est chargé la première fois que le serveur répond NOSCRIPT, parce que les scanners de chaîne d'approvisionnement signalent un appel de méthode nommé d'après EVAL comme de l'exécution de code dynamique, et EVALSHA évite de renvoyer le script. Une connexion que quasar retire quand sa stratégie de reconnexion abandonne (statut `end`) n'est plus utilisée : l'appel suivant redemande la connexion, si bien que le Web Push se rétablit tout seul quand Redis revient. Un client passé directement est gardé tel quel.

`prefix` vaut `nova:push` par défaut ; change-le pour faire tourner deux applications sur une même base Redis.

La durabilité est celle du serveur, pas celle du store : un Redis sans persistance perd tous les abonnements au redémarrage. Les navigateurs se réabonnent à leur prochaine visite, donc le coût est une notification manquée et non un compte cassé — mais si ça compte, prends un Redis persistant ou le store SQL.

### Écrire le tien

`SubscriptionStore`, c'est trois méthodes. Les URL d'endpoint sont globalement uniques par service push, donc `delete(endpoint)` retire l'abonnement quel qu'en soit le propriétaire, et `save()` réattribue un endpoint plutôt que de le laisser attaché à deux comptes — un navigateur réutilisé au fil d'une déconnexion/reconnexion continuerait sinon à livrer les notifications de l'ancien compte au nouvel utilisateur. Il ne le réattribue que si le nouveau propriétaire poste les mêmes `p256dh` et `auth` que ceux stockés : le navigateur qui détient l'abonnement le fait, quelqu'un qui a seulement appris l'endpoint non. Sinon `save()` lance `NovaError('E_NOVA_SUBSCRIPTION_CONFLICT')`, que la route d'abonnement traduit en `409`. `listByUser()` liste du plus ancien au plus récent : le plafond par utilisateur retire par le début.

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

Le plafond de 768 n'est pas décoratif : c'est exactement le budget d'index de clé primaire MySQL InnoDB en utf8mb4, et l'endpoint d'abonnement refuse un endpoint plus long par un 400 plutôt que de le laisser échouer en erreur de longueur propre au dialecte à l'insert. Les vrais endpoints de FCM, Mozilla autopush et Apple font tous moins de 200 caractères. Les colonnes de timestamp ne portent pas de défaut DDL : les stores écrivent les deux colonnes explicitement.

## Tests avec `FakeNova`

Remplace l'instance `Nova` réelle par un collecteur en mémoire pendant un test. `FakeNova` (depuis `@c9up/nova/testing`) capture chaque appel `push` / `pushToUser` et porte lui-même les assertions — pas de chiffrement, pas de réseau, pas de consultation de `SubscriptionStore`.

```ts
import { FakeNova } from '@c9up/nova/testing'
import { override, test, useContainer } from '@c9up/helix'

test('subscribe + welcome push', async () => {
  useContainer(container)        // le container de ton app
  const fake = new FakeNova()
  override('nova.push', fake)    // le token que lie le provider nova

  await runYourSubscribeFlow()   // le code testé y appelle pushToUser(...)

  fake.assertPushed({ userId: 'user-A', title: 'Welcome' })
})
```

Le provider lie la même instance sous `'nova.push'` et `'nova'` : override le nom que résout le code testé (les deux, s'il utilise les deux). L'`override` de helix lève hors d'un test et s'annule de lui-même à la fin du test, par la queue de cleanup per-test de helix.

### Formes de prédicat

`fake.assertPushed(predicate)` accepte deux formes :

**Prédicat objet** — tous les champs présents doivent matcher (combinés en AND) :

| Champ | Match | Notes |
|---|---|---|
| `userId` | Appels `pushToUser` uniquement | `kind === 'fan-out'` |
| `endpoint` | Appels `push` (single) uniquement | `kind === 'single'` |
| `title` / `body` | `payload.title` / `payload.body` exact | |
| `urgency` / `topic` | `options.urgency` / `options.topic` | |
| `containing` | `JSON.stringify(payload).includes(needle)` | La chaîne vide est rejetée (matcherait tous les pushes) |

**Prédicat fonction** — `(captured: CapturedPush) => boolean`. Invoqué une fois par capture ; premier `true` → match.

`fake.assertNotPushed(predicate)` est l'inverse.

### Les méthodes du fake

| Méthode | Effet |
|---|---|
| `assertPushed(predicate)` | Lève, en listant les captures, quand aucun appel capturé ne correspond |
| `assertNotPushed(predicate)` | Lève quand un appel capturé correspond |
| `getPushed()` | Renvoie une copie de chaque appel capturé |
| `reset()` | Oublie les appels capturés |

### Pourquoi `pushToUser` retourne `[]` sous le fake

`FakeNova.pushToUser` ne consulte PAS le `SubscriptionStore` ; il capture l'appel (userId + payload + options) et retourne `[]`. L'assertion porte sur l'**intention** d'appel, pas sur la livraison par device. Si ton test a besoin du fan-out réel par device (plusieurs entrées `PushResult`, cleanup 410 contre un vrai store), construis un vrai `Nova` avec un `MemorySubscriptionDriver` pré-chargé avec des fixtures — ce chemin exécute la vraie logique de livraison.
