# Configuration

This guide covers configuring the logger:

- SpectrumProvider
- Per-Module Level Overrides
- More options
- Redaction

## SpectrumProvider

`SpectrumProvider` builds the loggers from `config/logger.ts` and binds them in
the container. `ream configure @c9up/spectrum` registers it and writes
`config/logger.ts`; by hand, the provider goes in `reamrc.ts`:

```typescript
// reamrc.ts
providers: [
  () => import('@c9up/spectrum/provider'),
]
```

```typescript
// config/logger.ts
import { defineConfig, logLevel, stdSerializers, targets } from '@c9up/spectrum'

const inProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  default: 'app',
  loggers: {
    app: {
      enabled: true,
      name: 'app',
      // LOG_LEVEL comes from outside the program, so it is checked rather than
      // asserted: unset reads as 'info', and a value that is no level throws.
      level: logLevel(process.env.LOG_LEVEL),
      modules: {
        db: 'debug',
      },
      // A request or a response logged under `req` / `res` is written as its
      // method, url, query, params, status and headers: never its body or its
      // cookie map. Its headers come as they arrived: the session cookie, the
      // bearer token and the cookies set in reply are kept out of the line by
      // the paths below. Anything logged under another key is written as it
      // is: censor it with a path of its own.
      serializers: { req: stdSerializers.req, res: stdSerializers.res },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
        ],
      },
      transport: {
        targets: targets()
          .pushIf(!inProduction, targets.pretty())
          .pushIf(inProduction, targets.file({ destination: 1 }))
          .toArray(),
      },
    },
  },
})
```

`defineConfig` also accepts a single flat logger (`{ level, channels, modules }`),
which it wraps under the name `app`.

A level that is not one of the six (or `silent`) — `ERROR`, `warning`,
`verbose` — throws `E_SPECTRUM_UNKNOWN_LEVEL`, in the config, in a `modules`
entry and in the `level` setter alike.

Once registered, resolve the logger from the container:

```typescript
const logger = await app.container.make('logger')
logger.info('App booted')
```

## Per-Module Level Overrides

Set different minimum levels for different parts of your application:

```typescript
const logger = new Logger({
  level: 'info',
  channels: [new ConsoleChannel('pretty')],
  modules: {
    db:        'debug',   // Verbose SQL logging
    http:      'warn',    // Only warnings from the HTTP layer
    scheduler: 'trace',   // Maximum verbosity for the scheduler
  },
})

const dbLogger = logger.child({ module: 'db' })
dbLogger.debug('Query executed', { sql: '...' })
// Output — 'db' module level is 'debug'

const httpLogger = logger.child({ module: 'http' })
httpLogger.info('Request received')
// Dropped — 'http' module level is 'warn'
```

## More options

```ts
const logger = new Logger({
  level: 'info',
  mixin: () => ({ requestId: als.getStore()?.id }),  // fields on every line
  msgPrefix: '[api] ',
  errorKey: 'error',
  serializers: { req: stdSerializers.req, res: stdSerializers.res },
  redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
  hooks: {
    logMethod(args, method, level) {
      method(...args)  // inspect or rewrite the call's arguments
    },
  },
})

// A child with its own level, redaction, serializers and prefix
const audit = logger.child({ module: 'audit' }, { level: 'warn', msgPrefix: '[audit] ' })
```

`stdSerializers` (`err`, `req`, `res`) and `stdTimeFunctions` (`epochTime`,
`isoTime`, `unixTime`, `nullTime`, for `timestamp`) are exported.
`stdSerializers.req` writes the request's id, method, url, query, params,
remote address and **every header as it came** — `cookie` and `authorization`
included, so the signed session cookie, the CSRF token and a bearer token land
in the line. It never writes the body or the cookie map. `stdSerializers.res`
writes the status and every response header, `set-cookie` included. Censoring
them is `redact`'s job: keep the three paths above wherever these serializers
are wired.

Both read `ctx.request` and `ctx.response` as well as Node's request and
response. On `ctx.request`, `url` is the path and the query string is written
apart under `query`, parsed: `req.query.token` can then censor a token it
carries. Log the request under `req`: `logger.info('login attempt', { req:
ctx.request })`. Under another key no serializer applies, and the request is
written by its `toJSON()`, a full dump with the body and the cookies. Options that
cannot be honoured — `customLevels`, `useOnlyCustomLevels`, `levelComparison`,
`nestedKey`, `crlf`, `hooks.streamWrite`, `transport.pipeline` — throw instead
of being ignored.

## Redaction

`redact` censors fields on their way out, in the paths syntax the ecosystem is
written in:

```typescript
const logger = new Logger({
  level: 'info',
  channels: [new ConsoleChannel('json')],
  redact: {
    paths: [
      'req.headers.authorization',   // a literal path
      'req.headers.cookie',
      '*.password',                  // wherever it turns up, one level down
      'users[*].token',              // every element of a list
      'headers["set-cookie"]',       // a key a dot cannot name
      'creds.*',                     // every value under a key
    ],
    censor: '[Redacted]',
  },
})
```

A path that names nothing leaves the entry exactly as it was, and nothing is
mutated: the objects along a censored path are copied — keeping their
prototype, so a model's `toJSON` still decides what it shows — and the ones
the caller passed in are not. A path runs through getters too. On an object
with a `toJSON()`, a path is applied to what `toJSON()` returns, which is
what the line shows. An object written into the message by `%j`, `%o` or
`%O` is redacted with the same paths.

`censor` may be a function, called with the value and the path it was found at
(`['users', '0', 'card']`); `remove: true` drops matched keys instead. A
malformed path (`'password,token'`, `''`, `'a..b'`, unbalanced brackets) throws
`E_SPECTRUM_INVALID_REDACT_PATH` when the logger is built.
