# Parsec — Métriques

Parsec est la couche de métriques de l'écosystème Ream (`@c9up/parsec`).

Débit, latence et taux d'erreur — les trois chiffres sans lesquels une application est aveugle.

## Pourquoi

[Spectrum](/fr/modules/spectrum) donne les logs. Un log dit ce qui est arrivé à une requête ; il ne dit pas que la latence p99 a triplé il y a une heure. Sans métriques, un déploiement sans APM n'a pas d'autre réponse à « est-ce que c'est lent ? » que de l'ouvrir.

## Capacités

- compteurs, jauges et histogrammes — les instruments que Prometheus et OpenTelemetry expriment tous les deux
- un exporteur Prometheus sans aucune dépendance, format texte d'exposition écrit à la main
- un exporteur OpenTelemetry qui prend votre propre meter
- un middleware HTTP qui enregistre débit, latence et taux d'erreur par route
- un endpoint de scrape gardé
- l'instrumentation automatique des health checks, sans câblage

## Configurer

```ts
// config/metrics.ts
import { defineConfig, drivers } from '@c9up/parsec'
import env from '#start/env'

export default defineConfig({
  default: env.get('METRICS_EXPORTER', 'prometheus'),

  exporters: {
    prometheus: drivers.prometheus({ maxSeries: 1000 }),
    noop: drivers.noop(),
  },
})
```

```ts
// reamrc.ts
providers: [() => import('@c9up/parsec/provider')]

// start/kernel.ts — débit, latence et taux d'erreur pour chaque requête
//
// `server.use`, PAS `router.use` : un middleware de routeur ne tourne que
// pour les routes APPARIÉES, donc une requête qui n'a rien touché ne
// l'atteint jamais — et un balayage de 404, ce qu'un graphe de taux
// d'erreur doit montrer avant tout, serait invisible.
import { parsecHttpMiddleware } from '@c9up/parsec/http'
server.use([parsecHttpMiddleware])
```

`ream configure @c9up/parsec` écrit l'ensemble, route de scrape comprise.

Une application **sans** fichier de config obtient l'exporteur noop : l'instrumentation peut s'écrire sans condition et ne coûte qu'un appel vide.

## Enregistrer

```ts
import metrics from '@c9up/parsec/services/main'

metrics.counter({ name: 'orders_total', help: 'Orders placed.' }).increment()

const duration = metrics.histogram({
  name: 'checkout_duration_seconds',
  help: 'Time to complete a checkout.',
  labelNames: ['outcome'],
})

await duration.time(() => checkout(cart), { outcome: 'paid' })
```

`time()` enregistre à la sortie dans les deux cas — un handler qui lève a quand même pris du temps, et laisser tomber ces observations est exactement ce qui fait qu'un graphe de latence a l'air sain pendant un incident.

### Exporteurs nommés

```ts
metrics.use('otel').counter({ name: 'orders_total', help: 'Orders placed.' })
```

Scraper **et** pousser, si c'est ce que veut le déploiement.

## Durées

Les durées sont en **secondes**, convention Prometheus, et les buckets d'histogramme suivent par défaut une échelle qui encadre une requête web. ([Eclipse](/fr/modules/eclipse) est en millisecondes parce que Redis prend des millisecondes. Chacun est natif de sa propre couche.)

## Exposer

Délibérément **pas** monté par le provider. Un corps de métriques nomme toutes les routes de l'application, la forme de son trafic et son taux d'erreur ; le publier est une décision, pas un défaut.

```ts
// start/metrics.ts
import router from '@c9up/ream/services/router'
import metrics from '@c9up/parsec/services/main'
import { metricsHandler } from '@c9up/parsec/endpoint'
import env from '#start/env'

router.get(
  '/__metrics',
  metricsHandler(metrics, { token: env.get('METRICS_TOKEN') }),
)
```

Un mauvais jeton reçoit un **404, pas un 401** — un 401 confirme que l'endpoint existe et invite à la requête suivante. La comparaison est à temps constant.

Un exporteur qui pousse au lieu d'être scrapé répond 404 lui aussi : un 200 vide se lirait, côté scraper, comme une cible saine sans métriques — la seule réponse qui trompe activement.

## Cardinalité

Le mode de défaillance d'un système de métriques n'est pas un chiffre faux. C'est un processus qui épuise sa mémoire parce qu'une étiquette a été alimentée par une requête. Parsec rend cela difficile exprès.

**Les étiquettes se déclarent d'avance.** Une étiquette non déclarée lève au lieu d'être enregistrée silencieusement — c'est presque toujours la valeur issue de la requête qui aurait rendu l'instrument non borné.

```ts
metrics.counter({
  name: 'orders_total',
  help: 'Orders placed.',
  labelNames: ['region'],          // 'userId' lèverait désormais
})
```

**Chaque instrument a un plafond de séries.** Au-delà de `maxSeries` (1000 par défaut), les nouvelles combinaisons d'étiquettes sont refusées et comptées :

```
parsec_series_dropped_total{metric="orders_total"} 42
```

Visible sur le tableau de bord plutôt qu'invisible jusqu'à la mort du conteneur. Le compteur est étiqueté par *nom* de métrique — l'étiqueter par la *valeur* fautive recréerait l'ensemble non borné qu'il existe pour signaler.

**Le middleware HTTP étiquette par motif de route apparié**, jamais par l'URL : `/users/1` et `/users/2` sont une seule série, et un balayage de 404 ne peut rien faire gonfler. Une requête qui n'a apparié aucune route reçoit la constante `<unmatched>`. Les méthodes HTTP inconnues sont repliées sur `OTHER`.

Le middleware enregistre :

| Métrique | Type | Étiquettes |
|---|---|---|
| `http_server_requests_total` | compteur | `method`, `route`, `status` |
| `http_server_request_duration_seconds` | histogramme | `method`, `route`, `status` |
| `http_server_requests_in_flight` | jauge | `method` |

Une requête dont le handler a levé est quand même enregistrée, avec le statut que le gestionnaire d'erreurs a posé.

## OpenTelemetry

```ts
import { metrics as otel } from '@opentelemetry/api'

drivers.otel({ meter: otel.getMeter('my-app') })
```

Parsec n'importe jamais `@opentelemetry/api` — passez votre propre meter, déjà configuré avec l'exporteur et les attributs de ressource que vous avez mis en place. Une application qui ne veut qu'un endpoint de scrape n'installe rien de plus, et c'est pourquoi le paquet n'a aucune dépendance OTel.

## Health checks, gratuitement

Le module health de Ream publie chaque exécution de check sur le canal de diagnostics `ream.health.check`. `ParsecProvider.ready()` s'y abonne, donc ceci apparaît sans aucun câblage :

- `health_check_duration_seconds{check="..."}`
- `health_check_failures_total{check="..."}`

Aucun des deux paquets n'importe l'autre.

## Erreurs

| Code | Levée quand |
|---|---|
| `E_PARSEC_INVALID_NAME` | un nom de métrique ou d'étiquette que le format d'exposition ne peut pas porter |
| `E_PARSEC_INVALID_MEASUREMENT` | une valeur non finie, ou un incrément de compteur négatif |
| `E_PARSEC_UNDECLARED_LABEL` | une étiquette que l'instrument n'a jamais déclarée |
| `E_PARSEC_INSTRUMENT_CONFLICT` | un même nom déclaré deux fois avec un type ou un jeu d'étiquettes différent |
| `E_PARSEC_UNKNOWN_EXPORTER` | une config nommant un exporteur non déclaré |

Les noms sont validés à la **déclaration**. Un seul nom invalide accepté produirait un corps de scrape que le scraper rejette en bloc, emportant avec lui toutes les autres métriques du processus.

## Tests

```ts
import { fakeMetrics } from '@c9up/parsec/testing'

const { metrics, restore } = fakeMetrics()
afterEach(restore)

expect(await metrics.scrape()).toContain('orders_total 1')
```

## Checklist de production

- garder `/__metrics` derrière un jeton, ou derrière le réseau — le laisser ouvert publie votre table de routes
- ne jamais étiqueter avec une valeur venue d'une requête : pas d'identifiant utilisateur, pas de chemin brut, pas d'user agent
- alerter sur `parsec_series_dropped_total` — c'est le signal précoce d'une étiquette qui n'a rien à faire là
- fixer `maxSeries` d'après ce que la table de routes peut réellement produire, pas d'après un chiffre rond
