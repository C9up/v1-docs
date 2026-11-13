# Eclipse — Verrous distribués

Eclipse est la couche de verrous distribués de l'écosystème Ream (`@c9up/eclipse`).

Un nom, un détenteur. Tout le reste n'est qu'un détail de store.

## Pourquoi

Sans verrou partagé, chaque instance de l'application fait tout : la facturation nocturne part N fois, un défaut de cache recalcule N fois, un job est traité N fois. Et rien dans les logs ne le dit.

## Capacités

- prendre un bail, immédiatement ou en attendant le détenteur courant
- exécuter un callback sous bail et le relâcher automatiquement
- prolonger un bail que le travail dépasse
- transmettre un bail détenu à un autre processus (`serialize` / `restoreLock`)
- relâchement vérifié par propriétaire : un détenteur ne peut pas libérer le bail d'un autre
- stores enfichables (`Memory`, `Redis`)

## Configurer

```ts
// config/lock.ts
import { defineConfig, stores } from '@c9up/eclipse'
import env from '#start/env'

export default defineConfig({
  default: env.get('LOCK_STORE'),

  stores: {
    memory: stores.memory(),
    redis: stores.redis({ connection: 'main' }),
  },
})
```

```ts
// reamrc.ts
providers: [() => import('@c9up/eclipse/provider')]
```

`ream configure @c9up/eclipse` écrit les deux fichiers, pose `LOCK_STORE=redis` et déclare sa validation dans `start/env.ts` (`redis` ou `memory`) : une faute de frappe échoue à la validation de l'environnement plutôt qu'au démarrage.

Il n'y a pas de repli en mémoire : le provider refuse de démarrer sans `config/lock.ts` (`E_ECLIPSE_MISSING_CONFIG`), et `defineConfig` refuse une config dont le `default` est absent ou ne nomme aucun store déclaré. Une application qui tourne vraiment dans un seul processus le dit avec `LOCK_STORE=memory`.

## API principale

```ts
import locks from '@c9up/eclipse/services/main'
```

### Exécuter une seule fois sur l'ensemble des répliques

`runImmediately` rend la main au lieu d'attendre : l'instance qui perd la course ne fait rien du tout.

```ts
const [ran, invoices] = await locks
  .createLock('invoices:nightly', '5m')
  .runImmediately(async () => generateInvoices())
```

### Attendre le détenteur, puis continuer

`run` bloque tant qu'un autre détient le bail. C'est la forme qu'exige un cache stampede : celui qui perd la course veut attendre le gagnant puis lire ce qu'il a écrit, pas échouer.

```ts
const [, user] = await locks
  .createLock(`user:${id}`, '30s')
  .run(async () => loadAndCacheUser(id))
```

Les deux rendent `[true, résultat]` ou `[false, null]` : « a tourné et a rendu `undefined` » reste distinguable de « n'a jamais tourné ».

### Contrôle manuel

```ts
const lock = locks.createLock('import', '30s')

if (await lock.acquireImmediately()) {
  try {
    for (const batch of batches) {
      await process(batch)
      await lock.extend('30s')
    }
  } finally {
    await lock.release()
  }
}
```

Préférer un bail court plus `extend()` à un bail long. Un bail dimensionné pour le pire cas, c'est aussi la durée pendant laquelle la clé reste bloquée après un crash.

### Attente bornée

```ts
const taken = await lock.acquire({
  retry: { attempts: 10, delay: '100ms', timeout: '2s' },
})
```

`acquire()` sans options attend indéfiniment. `timeout: 0` signifie « ne pas attendre », et `timeout: null` « pas d'échéance ».

Les options sont vérifiées avant toute question au store (`E_ECLIPSE_INVALID_RETRY`) : `attempts` est un entier positif ou `Infinity`, `delay` une durée de 0 à environ 24,8 jours, `timeout` une durée finie de 0 ou plus (`Infinity` est refusé : « pas d'échéance » s'écrit `null`). Sinon, un `NaN` venu d'une variable d'environnement absente supprimerait l'échéance et interrogerait le store à chaque milliseconde.

### D'un processus à l'autre

```ts
const payload = lock.serialize()            // pris par la requête
const restored = locks.restoreLock(payload) // relâché par le worker
await restored.release()
```

### Stores nommés

```ts
await locks.use('redis').createLock('k', '1m').acquireImmediately()
```

## Durées

Un nombre nu, ce sont des **millisecondes**. Les chaînes acceptent les unités usuelles : `'500ms'`, `'30s'`, `'5m'`, `'2h'`. `null` n'expire jamais — et un bail qui n'expire jamais demande `forceRelease()` pour se remettre d'un crash.

Des millisecondes parce qu'un bail se mesure sur l'horloge murale et que Redis prend `PX` en millisecondes. `@c9up/echo` est natif en secondes pour la raison inverse : ses drivers le sont. Chacun est natif de sa propre couche.

## Stores

- `MemoryStore` — correct tant que l'application tourne dans **un seul** processus. Deux répliques gardent chacune sa propre table et prendront toutes les deux la même clé. Ce n'est pas un verrou distribué.
- `RedisStore` — ce dont une deuxième réplique a besoin.

### Redis via Quasar

Un store peut nommer une connexion [Quasar](/fr/modules/quasar) au lieu de recevoir un client :

```ts
stores: {
  redis: stores.redis({ connection: 'main' }),
}
```

Le client est résolu au premier verrou, pas à la lecture de la config. `stores.redis({ client })` reste possible : `@c9up/quasar` est un pair **optionnel** et eclipse tourne sans lui.

## Sûreté

Chaque bail porte un jeton de propriétaire aléatoire, et le relâchement comme la prolongation le comparent **dans** le store — côté Redis, dans un script Lua, pour que la vérification et la suppression ne fassent qu'une étape atomique.

Sans cela, un travail qui dépasse son propre TTL supprime le bail qu'une *autre* instance a pris entre-temps, libérant le nom alors qu'un travail tourne encore dessous.

La perte d'un bail est signalée par `E_LOCK_NOT_OWNED`, uniformément quel que soit le store — que la clé ait disparu ou qu'un autre la détienne, l'appelant ne détient plus ce qu'il croyait détenir.

`run` et `runImmediately` la lèvent quand le callback a réussi mais que le bail a expiré pendant qu'il tournait : un autre détenteur a pu tourner en même temps, et un `[true, résultat]` propre le cacherait. Quand le callback lui-même a levé une erreur, c'est elle qui ressort, inchangée, et un relâchement raté (bail perdu ou panne du store) ne la remplace pas.

## Avec le scheduler

```ts
// config/scheduler.ts
import { defineConfig } from '@c9up/ream/scheduler/config'
import locks from '@c9up/eclipse/services/main'
import { schedulerBackend } from '@c9up/eclipse/scheduler'

export default defineConfig({ lock: schedulerBackend(() => locks) })
```

`@c9up/ream` ne dépend pas d'eclipse. Le scheduler déclare un contrat étroit à deux méthodes qu'eclipse satisfait, donc le cœur fonctionne sans aucun paquet de verrous installé. C'est pour l'application qui veut **une seule** couche de verrous derrière son planificateur et son propre code, plutôt que deux qui expirent indépendamment.

Le bail est renouvelé tous les tiers de son TTL tant que la tâche tourne : une tâche plus longue que le TTL ne tourne jamais sur deux instances à la fois. Le TTL ne borne alors que la durée pendant laquelle le nom reste pris après la mort d'une instance qui le détenait.

```ts
schedulerBackend(() => locks, {
  ttl: '2m', // remplace le TTL unique que le scheduler passe pour toutes les tâches
  onLeaseLost: (name, error) => logger.error({ err: error }, `bail perdu : ${name}`),
})
```

`onLeaseLost` est appelé quand le bail d'une tâche en cours se révèle détenu par un autre ; sans lui, la perte est émise comme avertissement du processus.

## Erreurs

| Code | Levée quand |
|---|---|
| `E_LOCK_NOT_OWNED` | relâchement ou prolongation par ce qui ne détient plus le bail |
| `E_LOCK_STORAGE_ERROR` | le store a échoué à l'écriture, la lecture ou la suppression |
| `E_ECLIPSE_INVALID_TTL` | un TTL qui n'est pas un nombre positif de millisecondes jusqu'à `Number.MAX_SAFE_INTEGER` |
| `E_ECLIPSE_INVALID_RETRY` | un `attempts`, `delay` ou `timeout` de retry qui ne peut pas borner l'attente |
| `E_ECLIPSE_UNKNOWN_STORE` | une config ou un `use()` nommant un store non déclaré |
| `E_ECLIPSE_INVALID_CONFIG` | une config de verrous sans `stores` ou sans `default` |
| `E_ECLIPSE_MISSING_CONFIG` | le provider est enregistré mais `config/lock.ts` manque |

## Tests

```ts
import { fakeLocks } from '@c9up/eclipse/testing'

const restore = fakeLocks(app.container)
afterEach(restore)
```

Le teardown remet en place le manager que le fake a remplacé. Avec le conteneur, le fake se place aussi derrière ses liaisons `LockManager`, `lock` et `eclipse.lock` : le code qui résout le manager depuis le conteneur le reçoit aussi.

## Checklist de production

- nommer le store Redis dans tout environnement à plus d'une réplique — un store mémoire n'y verrouille rien, silencieusement
- dimensionner les TTL sur le temps de reprise après crash, pas sur la durée du travail ; utiliser `extend()` pour le reste
- borner `acquire()` avec `retry.timeout` partout où une requête attend dessus
- réserver `forceRelease()` à l'exploitation, pas au flux normal
