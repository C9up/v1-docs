# Echo — Cache

Echo est la couche cache de l'ecosysteme Ream (`@c9up/echo`).

> Statut: en evolution active. Le module converge vers une semantique plus stricte et une observabilite etendue.

## Capacites

- get/set/delete
- getOrSet (récupère-ou-calcule)
- clear
- namespaces
- tags
- drivers interchangeables (`Memory`, `Redis`)

## API principale

```ts
import { CacheManager, MemoryDriver } from '@c9up/echo'

const cache = new CacheManager(new MemoryDriver())
```

### Operations de base

```ts
await cache.set('user:1', { id: 1, name: 'Ada' }, 300)

const user = await cache.get<{ id: number; name: string }>('user:1')
const hasUser = await cache.has('user:1')

await cache.delete('user:1')
await cache.clear()
```

`clear()` vide tout le cache. Sur une vue de namespace, il ne vide que ce namespace.

### `getOrSet()` (récupère-ou-calcule, single-flight)

`getOrSet` retourne la valeur en cache, ou la calcule via la factory en cas de miss puis la stocke. Les miss concurrents sur la même clé partagent une seule promesse in-flight (pas de travail dupliqué).

```ts
const profile = await cache.getOrSet('profile:42', 60, async () => {
  return await fetchProfileFromDb(42)
})
```

`lockTimeout` borne l'attente d'un appelant sur la factory d'un autre appelant pour la même clé. Au-delà, la valeur périmée est renvoyée s'il y en a une (grace), et une `LockTimeoutError` (`E_ECHO_LOCK_TIMEOUT`) est levée sinon. `hardTimeout` borne la factory elle-même. Un timeout `Infinity` signifie aucun ; au-delà de 24,8 jours il est ramené à cette limite ; `NaN` ou une valeur négative est refusé.

### Namespaces

`namespace(ns)` retourne une vue du cache scopée sous un préfixe de clé supplémentaire. Chaque opération sur la vue est préfixée de façon transparente :

```ts
const users = cache.namespace('users')
await users.set('42', { id: 42 })
await users.get('42') // lit la clé sous-jacente `users:42`
```

### Prefix et TTL par defaut

```ts
const cache = new CacheManager(driver, {
  prefix: 'app',
  ttl: 3600,
})
```

Un TTL est un nombre de secondes ou une durée (`'500ms'`, `'10m'`) :

| TTL | Sens |
| --- | --- |
| absent | le défaut du store |
| `null`, `0`, `Infinity` | n'expire jamais |
| positif | expire après cette durée |
| négatif | déjà expiré : rien n'est stocké, et la valeur précédente de la clé est supprimée (avec une grace, une copie périmée est gardée le temps de la grace) |
| `NaN` | refusé avec `E_ECHO_INVALID_DURATION` |

Les entrées passées se relisent `undefined` — un miss — et sont purgées par
le balayeur du driver.

## Drivers

- `MemoryDriver`: rapide, local
- `RedisDriver`: partage multi-instance

### Driver mémoire

```ts
drivers.memory({ maxItems: 1000, maxSize: '50mb', maxEntrySize: '1mb' })
```

- **Borné par défaut** : 1000 entrées sauf `maxItems` contraire (`0` ou `Infinity` pour aucun plafond). Au-delà, l'entrée la moins récemment **utilisée** part — une lecture compte comme une utilisation.
- `maxSize` borne la taille totale des valeurs stockées et `maxEntrySize` celle d'une seule, en octets ou sous la forme `'10mb'`. Une valeur au-delà de `maxEntrySize` n'est pas stockée, et la valeur précédente de la clé est supprimée.
- **Les valeurs sont des copies** : elles sont stockées en JSON, comme le driver Redis les stocke, donc modifier une valeur lue ne change jamais ce que reçoit le lecteur suivant, et une valeur se relit pareil en développement et en production. `serialize: false` garde les références — plus rapide, et les instances de classe survivent, mais un lecteur qui modifie sa valeur la change pour tout le monde. Les bornes en octets exigent la sérialisation.

### Driver Redis

Les valeurs vivent sous `<prefix>v:<clé>`, les ensembles de tags sous `<prefix>t:<tag>` et les index de tags par clé sous `<prefix>m:<clé>` : aucune clé de cache ne peut atteindre cette comptabilité. Un `prefix` vide retombe sur le défaut `cache:`. Les TTL sont écrits en millisecondes, donc `'500ms'` fonctionne. Une valeur sous le préfixe qu'echo n'a pas écrite se lit comme un miss.

### Deux couches, et une panne de L2

Un store avec un L1 et un L2 continue de servir depuis le L1 et la factory quand le L2 échoue : une lecture L2 en échec est un miss, une écriture L2 en échec est sautée (et aucun pair n'est prévenu de jeter sa copie).

```ts
store({ suppressL2Errors: true, l2CircuitBreakerDuration: '10s' })
  .useL1Layer(drivers.memory())
  .useL2Layer(drivers.redis({ connection: 'main' }))
```

- `suppressL2Errors` (défaut `true`) : `false` remonte chaque échec du L2 en `L2CacheError` (`E_L2_CACHE_ERROR`, l'erreur d'origine en `cause`).
- `l2CircuitBreakerDuration` : après un échec, sauter le L2 pendant cette durée au lieu d'attendre un serveur mort à chaque appel.
- `delete`, `clear` et `deleteByTag` signalent toujours un L2 en échec, disjoncteur ouvert ou non : une suppression qui n'a pas atteint la couche partagée laisse la valeur servie à toutes les autres instances, et l'appelant doit le savoir.

Les messages du bus portent le nom du store : des stores qui partagent un canal laissent le L1 des autres tranquille, et un message qui n'est pas une invalidation bien formée est ignoré.

## Tags

Les drivers exposent `setWithTags/flushTags` (via capacites driver):

```ts
await cache.setWithTags('product:10', { id: 10 }, ['products', 'shop'], 120)
await cache.flushTags(['products'])
```

Les deux methodes levent une erreur si le driver configure ne supporte pas l'invalidation par tags.

Les tags appartiennent au namespace qui les a écrits : `tenantA.deleteByTag(['user:1'])` laisse tranquilles les entrées de `tenantB` taguées `user:1`, et un `deleteByTag` à la racine n'atteint pas les namespaces.

## Limites actuelles

- `flush()` Redis parcourt un curseur `SCAN` sur le préfixe — jamais `KEYS`, qui bloque le serveur. Il touche quand même toutes les clés préfixées, donc reste une opération lourde sur un gros jeu de données ; il lève une erreur sur un client sans `scan` plutôt que de retomber sur `KEYS`
- les capacites tags dependent du driver concret

## Erreurs

Chaque erreur porte un `code` :

| Code | Levée quand |
| --- | --- |
| `E_FACTORY_ERROR` | une factory de `getOrSet` a levé (`FactoryError`, passée à `onFactoryError`) |
| `E_FACTORY_HARD_TIMEOUT` | une factory a dépassé `hardTimeout` (`TimeoutError`) |
| `E_UNDEFINED_VALUE` | mise en cache de `null` ou `undefined` |
| `E_L2_CACHE_ERROR` | un échec du L2 non supprimé |
| `E_ECHO_LOCK_TIMEOUT` | `lockTimeout` dépassé sans valeur périmée |
| `E_ECHO_INVALID_DURATION` | une durée qui ne veut rien dire (`NaN`, `'5 fortnights'`) |
| `E_ECHO_INVALID_CONFIG` | une option de store ou de driver qui ne peut pas fonctionner |
| `E_ECHO_UNKNOWN_STORE` | `use()` nomme un store non configuré |
| `E_ECHO_NOT_TAGGABLE` | des tags sur un driver qui ne les gère pas |
| `E_ECHO_UNSERIALIZABLE_VALUE` | une valeur sans forme JSON sur un driver mémoire qui sérialise |
| `E_ECHO_SCAN_UNSUPPORTED` | vider Redis via un client sans `SCAN` |
| `E_ECHO_NOT_BOOTED` | `services/main` lu avant le boot du provider |
| `E_ECHO_QUASAR_MISSING`, `E_ECHO_INCOMPLETE_CONNECTION` | une connexion Redis nommée inutilisable |

`errors` associe `E_FACTORY_ERROR`, `E_FACTORY_HARD_TIMEOUT`, `E_UNDEFINED_VALUE` et `E_L2_CACHE_ERROR` à leurs classes.

## Commandes

`ream configure @c9up/echo` enregistre `@c9up/echo/commands` :

```sh
ream cache:clear                       # le store par défaut
ream cache:clear redis --namespace=users
ream cache:clear --tags=products --tags=shop
ream cache:delete user:42 [store]
ream cache:prune [store]
```

`--namespace` et `--tags` ne se combinent pas. En production chaque commande demande confirmation ; `cache:clear --force` saute la question.

## Checklist prod

- definir conventions de cles (`domain:entity:id`)
- imposer des TTL explicites sur les cles chaudes
- utiliser invalidation par tags pour coherence metier
- monitorer hit/miss et latence driver

## Bonnes pratiques

- definir une politique TTL explicite
- eviter de mettre en cache des objets tres volumineux sans compression
- invalider par tags sur les domaines critiques

## Redis via Quasar

Un store peut nommer une connexion [Quasar](/fr/modules/quasar) au lieu de recevoir un client — la forme AdonisJS, où le module Redis possède le socket :

```ts
stores: {
  redis: { driver: drivers.redis({ connection: 'cache' }) },
}
```

Le client est résolu à la première commande, pas pendant la lecture de la config : déclarer un store n'ouvre donc jamais de connexion à lui seul. `drivers.redis({ client })` fonctionne toujours : `@c9up/quasar` est une peer **optionnelle**, et echo tourne sans elle.

## Écouter le cache

```ts
cache.on('cache:miss', ({ key, store }) => metrics.miss(store, key))
cache.once('cache:hit', logFirstHit)
cache.off('cache:miss', handler)
```

Enregistré sur le gestionnaire de magasins, un écouteur atteint aussi les
magasins construits **ensuite** — ils sont paresseux, donc un écouteur posé au
démarrage manquerait sinon tout magasin pas encore touché. Un écouteur qui lève
est avalé : il observe l'opération, il n'a pas le droit de la faire échouer.

## Purger et déconnecter

```ts
await cache.prune()          // retire maintenant les entrées expirées connues
await cache.disconnectAll()  // depuis un crochet d'arrêt
```

Un pilote bâti sur un client **injecté** ne le déconnecte délibérément pas :
echo n'a pas ouvert cette connexion, et quasar la possède.
