# Bay — Queue / Jobs

Bay est le module de file de jobs de l'ecosysteme Ream (`@c9up/bay`).

> Statut: en evolution active. L'API continue d'etre durcie (retry/backoff/robustesse) pour converger vers une DX de reference.

## Cas d'usage

- traitement asynchrone de taches lourdes
- retries avec strategie configurable
- drivers interchangeables (`Memory`, `Redis`)

## API principale

```ts
import { QueueManager, MemoryDriver } from '@c9up/bay'

const queue = new QueueManager(new MemoryDriver())
```

### Enregistrer un handler et dispatcher

```ts
queue.register('mail.send', {
  async handle(payload) {
    const { to } = payload as { to: string }
    // envoyer mail
  },
})

const jobId = await queue.dispatch('mail.send', { to: 'user@example.com' }, { maxAttempts: 5 })
```

### Lancer un worker

```ts
// boucle de traitement continue
queue.work(500) // poll toutes les 500ms

// arret gracieux
queue.stop()
```

## Config

Declarez la config de file avec le helper `defineConfig` dans `config/queue.ts` (parite avec le config-helper AdonisJS):

```ts
import { defineConfig, MemoryDriver } from '@c9up/bay'

export default defineConfig({
  driver: new MemoryDriver(),
})
```

## Drivers

- `MemoryDriver`: dev/tests
- `RedisDriver`: environnement distribue

## Modele de job

Chaque job contient:

- `id`, `name`, `payload`
- `attempts`, `maxAttempts`
- `status` (`pending`, `processing`, `completed`, `failed`)
- `error?`, `createdAt`, `processedAt?`

## Retry actuel

- si `handle()` echoue et `attempts < maxAttempts`, le job repasse en `pending`
- sinon il passe en `failed` et est conserve en echec
- tu peux lire les echecs via `failedJobs()`

```ts
const failed = await queue.failedJobs()
```

## Limites actuelles (importantes)

- pas de scheduler/cron natif dans Bay
- pas encore de backoff/jitter configurable integre au `QueueManager`
- en mode Memory, aucune durabilite inter-process

## Checklist prod

- utiliser `RedisDriver` en production
- rendre les handlers idempotents
- suivre `failedJobs()` et ajouter une strategie de replay
- definir des `maxAttempts` par type de job

## Bonnes pratiques

- rendre les handlers idempotents
- gerer explicitement les erreurs metier vs erreurs techniques
- monitorer retries et jobs en echec

## Redis via Quasar

Une queue peut nommer une connexion [Quasar](/fr/modules/quasar) au lieu de recevoir un client :

```ts
import { RedisDriver, quasarConnection } from '@c9up/bay'

new RedisDriver(quasarConnection('jobs'), { visibilityTimeoutMs: 30_000 })
```

Le client est résolu à la première commande : déclarer une queue redis n'ouvre donc jamais de connexion à elle seule. Passer un client directement fonctionne toujours : `@c9up/quasar` est une peer **optionnelle**.

La garde LMOVE reste active — elle avertit lorsque le serveur est antérieur à Redis 6.2 et que `pop()` dégrade la livraison d'at-least-once à at-most-once.
