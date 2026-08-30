# Planification de tâches

Ream exécute le travail récurrent depuis un ticker Rust : TypeScript déclare
*quoi* s'exécute et *quand*, la boucle elle-même vit dans le cœur Rust, et
aucun `setInterval` n'intervient.

## Déclarer une tâche

Décorez une méthode d'un service enregistré avec `@Schedule` et une expression
cron standard à 5 champs (minute, heure, jour du mois, mois, jour de la
semaine) :

```ts
import { Schedule, Service } from '@c9up/ream'

@Service()
export class Invoices {
  @Schedule('0 3 * * *')
  async issueDaily() {
    // ...
  }
}
```

Les expressions sont évaluées en **UTC**. Une tâche qui doit se déclencher à
une heure locale doit être traduite avant d'atteindre le décorateur.

`ScheduleProvider` découvre les méthodes décorées au boot en parcourant le
registre de services de l'IoC. Le service est résolu **au moment de
l'invocation**, pas à l'enregistrement : chaque exécution reçoit donc des
dépendances fraîchement injectées.

Les méthodes statiques, les getters et les setters sont refusés à l'exécution
du décorateur, pas au premier déclenchement.

## Plusieurs instances

Par défaut, le planificateur ne verrouille rien. Sur une instance, c'est
correct. Sur deux, les deux déclenchent la même tâche au même tick : la
facturation quotidienne part en double, le rappel par email arrive en double,
et rien dans les logs ne le dit.

`config/scheduler.ts` nomme le verrou qui comble ça :

```ts
import { defineConfig, locks } from '@c9up/ream/scheduler/config'

export default defineConfig({
  lock: locks.redis({ connection: 'main' }),
})
```

Avant de déclencher une tâche, chaque instance demande le verrou portant son
nom ; exactement une l'obtient, les autres sautent ce tick — en émettant
`schedule.task.skipped` avec la raison `locked`. Le bail est relâché dès que la
tâche rend la main, le tick suivant est donc de nouveau libre.

### Les backends

| Fabrique | Portée |
| --- | --- |
| `locks.memory()` | Ce processus seulement. Deux processus gardent chacun leur table : rien n'est borné entre répliques. |
| `locks.redis({ connection })` | Toutes les instances pointant sur le même Redis. |

`connection` accepte le nom d'une connexion
[`@c9up/quasar`](/fr/modules/quasar) — résolue au premier déclenchement, pas à
la lecture du fichier de config — ou n'importe quel client répondant à `set` et
`eval`.

`prefix` renomme l'espace de clés (par défaut `ream:schedule:lock:`).

### Le bail

```ts
export default defineConfig({
  lock: locks.redis({ connection: 'main' }),
  defaultLockTtlMs: 60_000,
})
```

Un bail expire tout seul après `defaultLockTtlMs` (une minute par défaut).
Cette expiration est ce qui récupère le verrou après un crash : une instance
qui meurt en le tenant ne relâche jamais, et le nom se libère de lui-même.

Réglez-le au-dessus de la durée maximale légitime d'une tâche. Si une tâche
dépasse son bail, une autre instance acquiert le nom et démarre en parallèle —
le relâchement de la première ne fait alors rien, car le verrou vérifie que le
bail lui appartient toujours avant de le supprimer.

## En ligne de commande

```bash
ream schedule:list          # chaque tâche enregistrée et sa prochaine exécution
ream schedule:run <nom>     # en exécuter une immédiatement
```

`schedule:run` est une action explicite d'opérateur : elle contourne le verrou,
et s'exécute même sur une instance qui aurait sauté le tick.

## Observer

Le planificateur émet `schedule.task.started`, `schedule.task.completed`,
`schedule.task.failed` et `schedule.task.skipped`. `getStats()` suit le nombre
d'exécutions et les durées par tâche, qu'un sink soit branché ou non.
