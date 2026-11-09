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
- des valeurs calculées au moment du scrape, la suppression de séries et un socle processus optionnel
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

`ream configure @c9up/parsec` écrit l'ensemble : la config, le provider, le middleware sur le niveau serveur, la route de scrape dans `start/metrics.ts` enregistrée en preload, un `METRICS_TOKEN` aléatoire dans `.env`, et la validation des deux variables dans `start/env.ts` (le jeton en tant que secret).

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

Les valeurs d'étiquette sont des chaînes ou des nombres finis — `{ status: 200 }` et `{ status: '200' }` sont une seule série. Tout le reste (`undefined`, un objet) lève à l'appel, de sorte qu'une seule mauvaise valeur ne peut jamais casser un scrape ultérieur.

### Valeurs lues au moment du scrape

Une profondeur de file ou une taille de pool se lit, elle ne se pousse pas. Donnez à l'instrument un callback `collect` : il tourne avant chaque scrape (et à chaque collecte sous OpenTelemetry) et enregistre par l'instrument comme d'habitude.

```ts
metrics.gauge({
  name: 'queue_depth',
  help: 'Jobs waiting.',
  labelNames: ['queue'],
  collect: async (gauge) => gauge.set(await mailQueue.size(), { queue: 'mail' }),
})
```

Un callback qui lève, ou qui dépasse `collectTimeout` (5000 ms par défaut, réglé sur `drivers.prometheus()`), garde ses valeurs précédentes et est compté dans `parsec_collect_failures_total{metric="..."}` ; toutes les autres métriques sont servies normalement. `collect` existe sur les compteurs et les jauges.

### Supprimer des séries

```ts
jobs.remove({ job: 'nightly-import' })   // un jeu d'étiquettes
jobs.reset()                             // tous
```

Une série que plus rien ne mettra à jour — un job terminé, un tenant parti — occupe sinon l'une des places `maxSeries` de l'instrument jusqu'au redémarrage du processus.

### Chronomètres

```ts
const end = importDuration.startTimer({ job: 'import' })
// ...
end({ outcome: 'ok' })   // observe les secondes écoulées, étiquettes fusionnées
```

Sur une jauge, `startTimer()` règle plutôt la jauge sur les secondes écoulées.

### Socle processus

```ts
import { collectDefaultMetrics } from '@c9up/parsec'

const stop = collectDefaultMetrics(metrics)   // { prefix: 'app_' } pour préfixer chaque nom
```

Temps CPU, mémoire résidente, tas, latence de la boucle d'événements (courante et min/max/mean/stddev/p50/p90/p99), ressources actives, descripteurs de fichiers ouverts et maximum (Linux), durée du GC par type et version de Node, sous les noms qu'utilisent déjà les tableaux de bord Prometheus pour Node (`process_cpu_seconds_total`, `nodejs_heap_size_used_bytes`, `nodejs_eventloop_lag_p99_seconds`, ...). Optionnel, sans dépendance, lu au moment du scrape. `stop()` libère le moniteur de boucle d'événements et l'observateur du GC.

### Exporteurs nommés

```ts
metrics.use('otel').counter({ name: 'orders_total', help: 'Orders placed.' })
```

Scraper **et** pousser, si c'est ce que veut le déploiement.

## Durées

Les durées sont en **secondes**, convention Prometheus, et les buckets d'histogramme suivent par défaut une échelle qui encadre une requête web. Les bornes de bucket doivent être des nombres finis ; une borne `+Infinity` est le bucket `+Inf` que tout histogramme a déjà. `le` est réservé aux buckets et ne peut pas être une étiquette d'histogramme. Les observations d'histogramme, comme les incréments de compteur, doivent être positives ou nulles.

Un instrument peut déclarer son `unit` (`'s'`, `'By'`, `'1'`), que l'exporteur OpenTelemetry transporte. Un histogramme sur les buckets par défaut est en `'s'` ; un histogramme avec ses propres buckets déclare sa propre unité ou n'en a pas. Le format texte Prometheus n'a pas de ligne d'unité — mettez l'unité dans le nom (`_seconds`, `_bytes`). ([Eclipse](/fr/modules/eclipse) est en millisecondes parce que Redis prend des millisecondes. Chacun est natif de sa propre couche.)

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

Un mauvais jeton reçoit un **404, pas un 401** — un 401 confirme que l'endpoint existe et invite à la requête suivante. La comparaison est à temps constant, et le schéma `Bearer` est reconnu sans tenir compte de la casse.

Le handler refuse d'être construit sans jeton, et avec un jeton vide ou blanc : un `METRICS_TOKEN` absent arrête le démarrage au lieu d'ouvrir l'endpoint. Le jeton peut être une chaîne ou le secret que renvoie `Env.schema.secret()`. Une route que seul votre propre réseau peut atteindre le dit explicitement :

```ts
router.get('/__metrics', metricsHandler(metrics, { public: true }))
```

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

Le plafond et le compteur sont les mêmes sur tous les exporteurs, OpenTelemetry compris. Visible sur le tableau de bord plutôt qu'invisible jusqu'à la mort du conteneur. Le compteur est étiqueté par *nom* de métrique — l'étiqueter par la *valeur* fautive recréerait l'ensemble non borné qu'il existe pour signaler.

**Le middleware HTTP étiquette par motif de route apparié**, jamais par l'URL : `/users/1` et `/users/2` sont une seule série, et un balayage de 404 ne peut rien faire gonfler. Une requête qui n'a apparié aucune route reçoit la constante `<unmatched>`. Les méthodes HTTP inconnues sont repliées sur `OTHER`.

Le middleware enregistre :

| Métrique | Type | Étiquettes |
|---|---|---|
| `http_server_requests_total` | compteur | `method`, `route`, `status` |
| `http_server_request_duration_seconds` | histogramme | `method`, `route`, `status` |
| `http_server_requests_in_flight` | jauge | `method` |

Une requête dont le handler a levé est quand même enregistrée, avec le statut que le client a réellement reçu : l'enregistrement a lieu une fois la réponse définitive, après le passage du gestionnaire d'exceptions. Un 500, un 403 ou un 404 est compté comme tel, jamais comme le 200 que portait la réponse avant que l'erreur soit traitée.

## OpenTelemetry

```ts
import { metrics as otel } from '@opentelemetry/api'

drivers.otel({ meter: otel.getMeter('my-app') })
```

Parsec n'importe jamais `@opentelemetry/api` — passez votre propre meter, déjà configuré avec l'exporteur et les attributs de ressource que vous avez mis en place. Une application qui ne veut qu'un endpoint de scrape n'installe rien de plus, et c'est pourquoi le paquet n'a aucune dépendance OTel.

Le contrat des instruments est le même qu'avec Prometheus : noms, étiquettes déclarées, valeurs d'étiquette, mesures finies et positives, conflits de type et plafond `maxSeries` sont tous vérifiés avant que le meter ne voie quoi que ce soit, donc changer `METRICS_EXPORTER` ne change jamais ce que votre code a le droit d'enregistrer. Un instrument avec `collect` devient un instrument observable, lu à chaque collecte. `remove()` et `reset()` libèrent l'état propre à parsec (la place sous le plafond, la dernière valeur d'une jauge) ; un flux déjà agrégé par le SDK reste au SDK.

Parsec ne couvre que les métriques. Il ne démarre pas le SDK OpenTelemetry et n'exporte pas de traces.

## Health checks, gratuitement

Le module health de Ream publie chaque exécution de check sur le canal de diagnostics `ream.health.check`. `ParsecProvider.ready()` s'y abonne, donc ceci apparaît sans aucun câblage :

- `health_check_duration_seconds{check="..."}`
- `health_check_failures_total{check="..."}`

Aucun des deux paquets n'importe l'autre.

## Erreurs

| Code | Levée quand |
|---|---|
| `E_PARSEC_INVALID_NAME` | un nom de métrique ou d'étiquette que le format d'exposition ne peut pas porter, une étiquette déclarée deux fois, ou `le` sur un histogramme |
| `E_PARSEC_INVALID_INSTRUMENT` | une aide absente, une borne de bucket qui n'est pas un nombre fini, une unité invalide, un `collect` qui n'est pas une fonction |
| `E_PARSEC_INVALID_MEASUREMENT` | une valeur non finie, ou un incrément de compteur ou une observation d'histogramme négatifs |
| `E_PARSEC_INVALID_LABEL_VALUE` | une valeur d'étiquette qui n'est ni une chaîne ni un nombre fini |
| `E_PARSEC_UNDECLARED_LABEL` | une étiquette que l'instrument n'a jamais déclarée |
| `E_PARSEC_INSTRUMENT_CONFLICT` | un même nom déclaré deux fois avec un type ou un jeu d'étiquettes différent |
| `E_PARSEC_UNKNOWN_EXPORTER` | une config nommant un exporteur non déclaré |
| `E_PARSEC_UNPROTECTED_ENDPOINT` | un endpoint de scrape construit sans jeton ni `public: true` |
| `E_PARSEC_EMPTY_TOKEN` | un endpoint de scrape doté d'un jeton vide ou blanc |

Les noms sont validés à la **déclaration**. Un seul nom invalide accepté produirait un corps de scrape que le scraper rejette en bloc, emportant avec lui toutes les autres métriques du processus.

## Tests

```ts
import { fakeMetrics } from '@c9up/parsec/testing'

const { metrics, restore } = fakeMetrics()
afterEach(restore)

expect(await metrics.scrape()).toContain('orders_total 1')
```

## Checklist de production

- garder `/__metrics` derrière un jeton, ou derrière le réseau avec un `public: true` explicite — le laisser ouvert publie votre table de routes
- ne jamais étiqueter avec une valeur venue d'une requête : pas d'identifiant utilisateur, pas de chemin brut, pas d'user agent
- alerter sur `parsec_series_dropped_total` — c'est le signal précoce d'une étiquette qui n'a rien à faire là
- alerter sur `parsec_collect_failures_total` — une jauge lue au scrape qui échoue sans cesse affiche une valeur périmée
- fixer `maxSeries` d'après ce que la table de routes peut réellement produire, pas d'après un chiffre rond
