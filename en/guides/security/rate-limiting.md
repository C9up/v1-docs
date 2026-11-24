# Rate limiting

This guide covers rate limiting:

- Rate Limiting
- Per-route limits
- Batch endpoints: GraphQL and JSON-RPC

## Rate Limiting

Tracks requests per client within a sliding time window. The in-process counter
keeps two counters per key — the current window and the previous one, weighted
by how much of it still overlaps — so its memory does not grow with `max`. The
default key is the client IP; an IPv6 client counts under its /64, since one
host holds the whole /64. `keyFor(ctx)` picks another key.

```ts
rateLimit: { max: 100, windowSeconds: 60 } // 100 requests / 60s
```

When the limit is exceeded:

```json
{ "error": { "code": "E_TOO_MANY_REQUESTS", "message": "Too many requests" } }
```

HTTP status: `429 Too Many Requests`

The rate limiter:
- Buckets per resolved client IP — a request with **no** resolvable IP is rejected (`400 E_BLACKHOLE_MISSING_IP`) rather than sharing a global bucket (which would let one client DoS everyone). IP resolution (trusted proxies) is the host framework's job.
- Requires `max` and `windowSeconds` to be positive whole numbers: `createBlackhole` throws otherwise, rather than run a limit of 0 or a window of 0 that would let every request through
- Admits a request when the sliding count is below `max` (no burst of twice the limit across a window boundary)
- Periodically evicts stale entries, and caps the number of keys held

## Per-route limits

A limit defined once by name, attached to the routes it belongs to:

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

The key is `<name>_<usingKey>`, or `<name>_ip_<client IP>` (IPv6 by /64). Over
the limit the middleware throws `errors.E_TOO_MANY_REQUESTS` (`ThrottleException`,
`429`), rendered with `X-RateLimit-*` and `Retry-After` as text, JSON or
JSON:API depending on `Accept`, its message translated under
`errors.E_TOO_MANY_REQUESTS` when the context has an `i18n`.
`limitExceeded((error) => error.setMessage(…))` adjusts it first; a builder
returning `limiter.noLimit()` lets the request through uncounted. A passing
response carries `X-RateLimit-Limit` and `X-RateLimit-Remaining`.

By hand:

```ts
const login = limiter.use({ requests: 5, duration: '1 minute', blockDuration: '20 mins' })

// Count failures only: a wrong password costs an attempt, a right one clears them.
const [error, user] = await login.penalize(`login_${email}`, () => verify(email, password))

await login.attempt(key, () => sendResetMail()) // runs only while there is budget
await login.consume(key)                        // throws once over
```

`penalize` counts the attempt before the callback runs, and clears the count
when the callback succeeds. So requests sent at the same moment cannot all see
"attempts left": with `requests: 5`, at most 5 passwords are checked for one
key, however many requests arrive together. An attempt refused this way stays
counted.

`Limiter` also has `increment`, `decrement`, `get`, `set`, `block`, `delete`,
`remaining`, `availableIn`, `isBlocked` and `clear`. Counting is a fixed window
per key, opened by its first request. Each budget has its own counter: two
limiters given the same key (5 a minute and 100 a day) never share a count,
in any store.

Several limits at once — each limiter on its own key, in the default store or
a named one (`limiter.multi('redis', [...])`):

```ts
const multi = limiter.multi([
  { key: `login_${ip}`, requests: 5, duration: '1 minute' },
  { key: `login_${ip}`, requests: 100, duration: '1 day', blockDuration: '1 hour' },
])

await multi.consume()                          // throws the first E_TOO_MANY_REQUESTS
const [error, user] = await multi.penalize(() => verify(email, password))
```

`MultiLimiter` has `consume`, `attempt`, `penalize`, `increment`, `decrement`,
`get`, `set`, `delete` and `list`. `consume` counts in order: the limiters
before the one that throws have counted. `penalize` counts the attempt on
every limiter before the callback runs, as above.

`limiter.clear()` empties every store — Redis's keys under its prefix, the
database's table, the memory of the limiters handed out — even from a process
that has not used it yet (a fresh test run, a second instance);
`limiter.clear(['redis'])` only the named stores.

The stores live under `limiter` in `config/blackhole.ts` (default: one memory
store):

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

The Redis store's `clear()` deletes its own keys (by prefix), not the database, also on a quasar connection with a `keyPrefix`, and on every master of a cluster. A connection quasar retires once its retry strategy gives up (status `end`) is not used again: the next request asks for the connection again, so rate limiting recovers by itself once Redis is back. A client passed directly is kept as it is.

The database store counts in a SQL table (PostgreSQL, MySQL, SQLite), for an
application without Redis. `connection` takes atlas' `db` (or any client with
`dialect` and `rawQuery(sql, bindings)`), a function answering one, or the name
of an atlas connection; left out, atlas' default connection, loaded on first
use — blackhole does not depend on atlas. Each count is one atomic
upsert-and-increment; expired rows are deleted as counting goes; a key longer
than 255 characters is stored as its SHA-256. Its `clear()` empties the table,
so give the limiter a table of its own. The table:

```ts
// database/migrations/9100_create_rate_limits.ts
// (stubs/database/migrations/9100_create_rate_limits.stub in the package)
this.schema.createTable('rate_limits', (t) => {
  t.string('key', 255).primary()
  t.integer('points').notNullable().defaultTo(0)
  t.bigInteger('expire').nullable() // epoch milliseconds
  t.index('expire')
})
```

atlas missing or not booted raises `E_BLACKHOLE_DATABASE_UNAVAILABLE` on the
first count; another database, `E_BLACKHOLE_UNSUPPORTED_DATABASE`.

## Batch endpoints: GraphQL and JSON-RPC

A limit on the `/graphql` or `/rpc` route counts HTTP requests. One request to
these endpoints can run a handler several times: a GraphQL query repeats a
field under aliases, a JSON-RPC batch holds up to 50 calls. Five requests a
minute is then not five login attempts a minute.

Count calls, not requests. Put the named limit on the resolver or on the RPC
method: it runs before each call.

```ts
const registry = await app.container.make('middleware')
registry.register('loginThrottle', loginThrottle) // from limiter.define()

// GraphQL: once per alias of the field
gql.resolver('Mutation', 'login', AuthResolver, 'login', { middleware: ['loginThrottle'] })

// JSON-RPC: once per call of a batch
rpc.method('auth.login', loginHandler).middleware('loginThrottle')
```

Or count failures only, inside the handler:

```ts
class AuthResolver {
  async login(_parent: unknown, args: { email: string; password: string }) {
    const login = limiter.use({ requests: 5, duration: '1 minute', blockDuration: '20 mins' })
    // A wrong password costs an attempt; over the limit this throws 429.
    const [error, user] = await login.penalize(`login_${args.email}`, () =>
      verify(args.email, args.password),
    )
    if (error) throw error
    return user
  }
}
```

GraphQL also bounds how many times one request may select the same root
field: 10 for a query, 1 for a mutation by default. See
[GraphQL limits](/en/guides/apis/graphql#limits).
