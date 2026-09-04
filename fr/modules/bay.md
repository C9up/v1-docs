# Bay — File de jobs

Bay est le module de file de jobs de l'écosystème Ream (`@c9up/bay`).

## Cas d'usage

- traitement asynchrone de tâches lourdes
- retries, délais et timeouts par job
- files nommées, pour qu'une file lente n'affame pas une file rapide
- drivers interchangeables (`Memory`, `Redis`)

## Un job est une classe

```bash
ream make:job SendEmail            # app/jobs/send_email.ts
ream make:job emails/SendInvoice   # app/jobs/emails/send_invoice.ts
```

```ts
import { Job } from '@c9up/bay'
import type { JobOptions } from '@c9up/bay'

export default class SendEmail extends Job<{ to: string }> {
  static options: JobOptions = {
    queue: 'emails',   // la file où il attend            (défaut : 'default')
    maxRetries: 5,     // combien de fois le handler peut tourner  (défaut : 3)
    delay: '10s',      // le retenir avant qu'un worker le prenne
    timeout: '1m',     // le temps accordé au handler
  }

  async execute() {
    await mail.send(this.payload.to)
  }

  async failed(error: Error) {
    // Une fois la DERNIÈRE tentative échouée — l'alerte ou le nettoyage,
    // pas le retry.
  }
}
```

```ts
import queue from '@c9up/bay/services/main'

await queue.dispatch(SendEmail, { to: 'user@example.com' })
await queue.dispatch(SendEmail, { to: '…' }, { queue: 'critical' })  // surcharge
```

`execute()` ne prend aucun argument : la charge est sur l'instance, typée par le
paramètre de la classe — un champ que le handler lit ne peut donc pas être un
champ que l'appelant n'a jamais envoyé.

L'enregistrement par nom fonctionne toujours, et c'est ce qu'il faut à un job
dont le nom est calculé à l'exécution :

```ts
queue.register('mail.send', {
  async handle(payload) { /* … */ },
})
await queue.dispatch('mail.send', { to: '…' }, { maxAttempts: 5 })
```

## Workers

```bash
ream queue:work                             # la file par défaut, un job à la fois
ream queue:work --queue=critical,default    # dans cet ordre de préférence
ream queue:work --concurrency=10            # dix en vol
```

```ts
await queue.work({ queues: ['emails'], concurrency: 4 })
await queue.stop()   // arrêt gracieux : le job en vol se termine
```

Nommer les files est ce qui empêche une file lente d'affamer une file rapide —
un worker pour `emails`, un autre pour `default`, plutôt qu'un seul qui prend ce
qui vient. `concurrency` vaut `1` par défaut : sûr, et mauvais pour tout ce qui
attend le réseau.

Un `timeout` fait échouer la tentative ; il ne **tue pas** le handler, parce que
rien dans Node n'interrompt une promesse en cours. Ce qu'il achète, c'est que le
*worker* cesse d'attendre — sinon un seul job coincé coûte le worker entier, qui
ne reprend plus jamais rien.

## Config

```ts
// config/queue.ts
import { defineConfig, drivers } from '@c9up/bay'
import env from '#start/env'

export default defineConfig({
  default: env.get('QUEUE_DRIVER', 'memory'),

  adapters: {
    memory: drivers.memory(),
    redis: drivers.redis({ connection: 'main' }),
  },

  worker: {
    idleDelay: 2_000,
    stalledInterval: 30_000,
    concurrency: 1,
    // queues: ['critical', 'default'],
  },

  // Où vivent les classes de job.
  locations: ['app/jobs'],
})
```

`locations` est ce qui permet à un process **worker** de résoudre un
enregistrement mis en file par un process **HTTP** : chaque module en dessous est
importé au boot, et un export par défaut qui est une classe de job est
enregistré sous son propre nom. Sans ça, la liste d'enregistrement est un
répertoire tenu à jour à la main, et le job que personne n'y a ajouté échoue en
« no handler registered ».

## Drivers

- `MemoryDriver` : dev et tests
- `RedisDriver` : environnement distribué

## L'enregistrement mis en file

Ce qu'un driver stocke, sous le nom `JobRecord` :

- `id`, `name`, `payload`
- `attempts`, `maxAttempts`
- `status` (`pending`, `processing`, `completed`, `failed`)
- `error?`, `createdAt`, `processedAt?`
- `queue` — la file nommée où il attend ; absent d'un enregistrement écrit avant
  les files nommées, et lu comme `default`
- `runAt?` — le moment où un `delay` autorise sa prise
- `timeout?` — le temps accordé au handler

La classe s'appelle `Job`, l'enregistrement `JobRecord`. Les deux partageaient
le même nom.

## Retry actuel

- si la tentative échoue et que `attempts < maxAttempts`, le job repasse en `pending`
- sinon il passe en `failed`, `failed()` est appelé une fois, et il est conservé
- tu peux lire les échecs via `failedJobs()`

```ts
const failed = await queue.failedJobs()
```

## Limites actuelles (importantes)

- pas de scheduler/cron natif dans Bay — un job récurrent est une tâche planifiée
  qui en dispatche un
- pas de backoff entre les tentatives : un retry est repris dès qu'un worker
  l'atteint
- en mode Memory, aucune durabilité inter-process
- les jobs différés sur Redis demandent un client avec les commandes de sorted
  set (ioredis les a). Sans `ZADD`, `push` refuse un job porteur d'un `delay`
  plutôt que de le lancer tout de suite — la seule chose qu'un délai existe pour
  empêcher.

## Checklist prod

- utiliser `RedisDriver` en production
- rendre les handlers idempotents
- suivre `failedJobs()` et définir une stratégie de rejeu
- définir `maxRetries` par type de job

## Bonnes pratiques

- rendre les handlers idempotents
- distinguer explicitement erreurs métier et erreurs techniques
- surveiller les retries et les jobs en échec

## Redis via Quasar

Une queue peut nommer une connexion [Quasar](/fr/modules/quasar) au lieu de recevoir un client :

```ts
import { RedisDriver, quasarConnection } from '@c9up/bay'

new RedisDriver(quasarConnection('jobs'), { visibilityTimeoutMs: 30_000 })
```

Le client est résolu à la première commande : déclarer une queue redis n'ouvre donc jamais de connexion à elle seule. Passer un client directement fonctionne toujours : `@c9up/quasar` est une peer **optionnelle**.

La garde LMOVE reste active — elle avertit lorsque le serveur est antérieur à Redis 6.2 et que `pop()` dégrade la livraison d'at-least-once à at-most-once.
