# Health checks

Ce guide couvre les health checks.

## Sondes de santé

```ts
import {
  HealthChecks, DiskSpaceCheck, MemoryHeapCheck, MemoryRSSCheck,
} from '@c9up/ream/health'
import { safeEqual } from '@c9up/ream/helpers'

const healthChecks = new HealthChecks().register([
  new DiskSpaceCheck().warnWhenExceeds(70).failWhenExceeds(85).cacheFor('1 minute'),
  new MemoryHeapCheck().warnWhenExceedsPercentage(80),
  new MemoryRSSCheck().failWhenExceeds('512 mb'),
])

// Liveness : le process répond. Publique, et ne dit rien d'autre.
router.get('/health/live', ({ response }) => response.status(200).send(''))

// Readiness : le rapport complet, pour votre supervision seulement.
router.get('/health/ready', async ({ request, response }) => {
  if (!safeEqual(request.header('x-monitoring-secret') ?? '', env.get('MONITORING_SECRET'))) {
    return response.status(401).send('')
  }
  const report = await healthChecks.run()
  return response.status(report.isHealthy ? 200 : 503).json(report)
})
```

Le rapport n'est pas destiné au public. Il contient les détails du process
(`pid`, `ppid`, plateforme, uptime, version de Node.js) et, pour chaque sonde
en échec, l'erreur qui l'a fait échouer : pour une base de données arrêtée, son
adresse privée et son port. Servez-le derrière un en-tête secret, comme
ci-dessus, ou derrière un guard ; donnez la route liveness au répartiteur de
charge. Déclarez `MONITORING_SECRET` dans votre schéma d'env pour que
l'application ne démarre pas sans lui.

Un **avertissement ne rend pas l'application malade** : `isHealthy` ne passe à
faux que sur `error`. Un disque à 72 % prévient l'exploitant sans qu'une sonde
de disponibilité sorte le pod de la rotation. `status` vaut quand même
`warning`.

Pour écrire sa propre sonde, on étend `BaseCheck` et on renvoie un `Result` :

```ts
class DatabaseCheck extends BaseCheck {
  name = 'database'

  async run() {
    try {
      await db.rawQuery('select 1')
      return Result.ok('Database is reachable')
    } catch (error) {
      return Result.failed('Database is unreachable', error)
    }
  }
}
```

`cacheFor('1 minute')` réutilise le dernier résultat pendant cette durée, et le
rapport indique `isCached` sonde par sonde — une sonde toutes les secondes ne
doit pas ouvrir une connexion à la base toutes les secondes. Chaque exécution
est publiée sur le canal de diagnostic `ream.health.check`, de sorte qu'un APM
peut chronométrer les sondes sans que l'application ne câble quoi que ce soit.

`DiskSpaceCheck` lit directement le `fs.statfs` de Node — pas de dépendance,
pas de sous-processus.

::: warning `HealthCheck` (au singulier) est l'ancienne API, distincte
`HealthCheck`, exporté à la racine, précède ce module et couvre le même terrain
avec une forme maison — `register(name, fn)`, un délai par sonde et un
`handler()` tout prêt. Il fonctionne toujours et rien n'a été supprimé, mais le
code neuf doit utiliser `HealthChecks` depuis `@c9up/ream/health`.

Une sonde qui lève est rapportée comme `Health check failed`, jamais avec ce
qu'elle a levé ; l'erreur part dans l'option `onError` (stderr par défaut). Une
sonde qui renvoie `{ status: 'error', message }` garde son propre message.
:::
