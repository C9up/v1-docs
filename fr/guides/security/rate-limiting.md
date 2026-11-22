# Limitation de débit

Ce guide couvre la limitation de débit :

- Rate Limiting
- Limites par route

## Rate Limiting

Suit les requêtes par client dans une fenêtre de temps glissante. Le compteur
en processus garde deux compteurs par clé — la fenêtre courante et la
précédente, pondérée par la part qui chevauche encore — si bien que sa mémoire
ne grandit pas avec `max`. La clé par défaut est l'IP du client ; un client
IPv6 est compté par son /64, un même hôte détenant le /64 entier. `keyFor(ctx)`
choisit une autre clé.

```ts
rateLimit: { max: 100, windowSeconds: 60 } // 100 requêtes / 60s
```

Quand la limite est dépassée, la requête est rejetée avec :

```json
{ "error": { "code": "E_BLACKHOLE_RATE_LIMITED", "message": "Too many requests" } }
```

Statut HTTP : `429 Too Many Requests`

Le rate limiter :
- Bucket par IP client résolue — une requête **sans** IP résolvable est rejetée (`400 E_BLACKHOLE_MISSING_IP`) plutôt que de partager un bucket global (ce qui laisserait un client DoS tout le monde). La résolution d'IP (proxies de confiance) est le rôle du framework hôte.
- Exige que `max` et `windowSeconds` soient des entiers strictement positifs : `createBlackhole` lève une erreur sinon, plutôt que d'appliquer une limite ou une fenêtre de 0 qui laisserait tout passer
- Admet une requête tant que le compte glissant est sous `max` (pas de rafale du double de la limite à la frontière d'une fenêtre)
- Purge périodiquement les entrées obsolètes, et plafonne le nombre de clés gardées

## Limites par route

Une limite définie une fois, par nom, attachée aux routes qu'elle concerne :

```ts
// start/limiter.ts
import limiter from '@c9up/blackhole/services/limiter'

export const throttle = limiter.define('api', (ctx) =>
  limiter.allowRequests(60).every('1 minute').usingKey(ctx.auth?.user?.id),
)

export const loginThrottle = limiter.define('login', () =>
  limiter.allowRequests(5).every('1 minute').blockFor('20 mins'),
)

// start/routes.ts
router.post('/login', [AuthController, 'login']).use(loginThrottle)
```

La clé est `<nom>_<usingKey>`, ou `<nom>_ip_<IP client>` (IPv6 par /64). Au-delà
de la limite, le middleware lève `ThrottleException` (`E_TOO_MANY_REQUESTS`,
`429`), rendue avec `X-RateLimit-*` et `Retry-After` en texte, JSON ou JSON:API
selon `Accept`, son message traduit sous `errors.E_TOO_MANY_REQUESTS` quand le
contexte a un `i18n`. `limitExceeded((error) => error.setMessage(…))`
l'ajuste avant ; un builder qui renvoie `limiter.noLimit()` laisse passer la
requête sans la compter. Une réponse qui passe porte `X-RateLimit-Limit` et
`X-RateLimit-Remaining`.

À la main :

```ts
const login = limiter.use({ requests: 5, duration: '1 minute', blockDuration: '20 mins' })

// Ne compter que les échecs : un mauvais mot de passe coûte un essai, un bon les efface.
const [error, user] = await login.penalize(`login_${email}`, () => verify(email, password))

await login.attempt(key, () => sendResetMail()) // ne s'exécute que tant qu'il reste du budget
await login.consume(key)                        // lève une erreur une fois au-delà
```

`Limiter` a aussi `increment`, `decrement`, `get`, `set`, `block`, `delete`,
`remaining`, `availableIn`, `isBlocked` et `clear`. Le comptage est une fenêtre
fixe par clé, ouverte par sa première requête.

Plusieurs limites à la fois — chaque limiteur sur sa propre clé, dans le store
par défaut ou dans un store nommé (`limiter.multi('redis', [...])`) :

```ts
const multi = limiter.multi([
  { key: `login_${ip}`, requests: 5, duration: '1 minute' },
  { key: `login_${ip}`, requests: 100, duration: '1 day', blockDuration: '1 hour' },
])

await multi.consume()                          // lève la première ThrottleException
const [error, user] = await multi.penalize(() => verify(email, password))
```

`MultiLimiter` a `consume`, `attempt`, `penalize`, `increment`, `decrement`,
`get`, `set`, `delete` et `list`. `consume` compte dans l'ordre : les limiteurs
placés avant celui qui lève ont compté.

`limiter.clear()` vide chaque store — les clés Redis sous son préfixe, la table
de la base, la mémoire des limiteurs distribués — même depuis un processus qui
ne s'en est pas encore servi (une nouvelle exécution des tests, une seconde
instance) ; `limiter.clear(['redis'])` seulement les stores nommés.

Les stores se déclarent sous `limiter` dans `config/blackhole.ts` (par défaut :
un store en mémoire) :

```ts
import { defineConfig, limiterStores } from '@c9up/blackhole'

export default defineConfig({
  limiter: {
    default: env.get('LIMITER_STORE', 'memory'),
    stores: {
      memory: limiterStores.memory(),
      redis: limiterStores.redis({ connection: 'main' }),
      database: limiterStores.database({ tableName: 'rate_limits' }),
    },
  },
})
```

Le `clear()` du store Redis supprime ses propres clés (par préfixe), pas la base. Une connexion que quasar retire quand sa stratégie de reconnexion abandonne (statut `end`) n'est plus utilisée : la requête suivant redemande la connexion, si bien que la limitation se rétablit tout seul quand Redis revient. Un client passé directement est gardé tel quel.

Le store base de données compte dans une table SQL (PostgreSQL, MySQL, SQLite),
pour une application sans Redis. `connection` prend le `db` d'atlas (ou tout
client doté de `dialect` et de `rawQuery(sql, bindings)`), une fonction qui en
renvoie un, ou le nom d'une connexion atlas ; omis, la connexion par défaut
d'atlas, chargée au premier comptage — blackhole ne dépend pas d'atlas. Chaque
comptage est un seul upsert-incrément atomique ; les lignes expirées sont
supprimées au fil du comptage ; une clé de plus de 255 caractères est stockée
sous son SHA-256. Son `clear()` vide la table : donne au limiteur une table à
lui. La table :

```ts
// database/migrations/9100_create_rate_limits.ts
// (stubs/database/migrations/9100_create_rate_limits.stub dans le paquet)
this.schema.createTable('rate_limits', (t) => {
  t.string('key', 255).primary()
  t.integer('points').notNullable().defaultTo(0)
  t.bigInteger('expire').nullable() // millisecondes epoch
  t.index('expire')
})
```

atlas absent ou pas encore démarré lève `E_BLACKHOLE_DATABASE_UNAVAILABLE` au
premier comptage ; une autre base, `E_BLACKHOLE_UNSUPPORTED_DATABASE`.
