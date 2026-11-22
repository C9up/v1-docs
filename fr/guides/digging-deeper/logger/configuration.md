# Configuration

Ce guide couvre la configuration du logger :

- SpectrumProvider
- Overrides par module
- Autres options
- Masquage

## SpectrumProvider

`SpectrumProvider` construit les loggers depuis `config/logger.ts` et les lie
dans le conteneur. `ream configure @c9up/spectrum` l'enregistre et écrit
`config/logger.ts` ; à la main, le provider se déclare dans `reamrc.ts` :

```typescript
// reamrc.ts
providers: [
  () => import('@c9up/spectrum/provider'),
]
```

```typescript
// config/logger.ts
import { defineConfig, logLevel, targets } from '@c9up/spectrum'

const inProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  default: 'app',
  loggers: {
    app: {
      enabled: true,
      name: 'app',
      // LOG_LEVEL vient de l'extérieur du programme : il est vérifié plutôt
      // qu'affirmé — absent, il se lit 'info' ; une valeur qui n'est pas un niveau lève.
      level: logLevel(process.env.LOG_LEVEL),
      modules: {
        db: 'debug',
      },
      // Une requête ou une réponse journalisée porte chaque en-tête tel qu'il
      // est arrivé : le cookie de session, le jeton bearer et les cookies posés
      // en réponse sont tenus hors de la ligne ici.
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

`defineConfig` accepte aussi un logger unique à plat (`{ level, channels,
modules }`), qu'il enveloppe sous le nom `app`.

Un niveau qui n'est pas l'un des six (ou `silent`) — `ERROR`, `warning`,
`verbose` — lève `E_SPECTRUM_UNKNOWN_LEVEL`, dans la config, dans une entrée de
`modules` comme dans le setter `level`.

Une fois enregistré, résolvez le logger depuis le conteneur :

```typescript
const logger = await app.container.make('logger')
logger.info('App booted')
```

## Overrides par module

Définissez des niveaux de log différents pour différents modules :

```typescript
const logger = new Logger({
  level: 'info',
  channels: [new ConsoleChannel('pretty')],
  modules: {
    'db': 'debug',      // Logging DB verbeux
    'http': 'warn',     // Seulement les warnings de la couche HTTP
    'scheduler': 'trace',
  },
})

const dbLogger = logger.child({ module: 'db' })
dbLogger.debug('Requête exécutée')  // Loggé — le niveau du module 'db' est 'debug'

const httpLogger = logger.child({ module: 'http' })
httpLogger.info('Requête reçue')  // Ignoré — le niveau du module 'http' est 'warn'
```

## Autres options

```ts
const logger = new Logger({
  level: 'info',
  mixin: () => ({ requestId: als.getStore()?.id }),  // champs sur chaque ligne
  msgPrefix: '[api] ',
  errorKey: 'error',
  serializers: { req: stdSerializers.req, res: stdSerializers.res },
  redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
  hooks: {
    logMethod(args, method, level) {
      method(...args)  // inspecter ou réécrire les arguments de l'appel
    },
  },
})

// Un enfant avec son propre niveau, masquage, sérialiseurs et préfixe
const audit = logger.child({ module: 'audit' }, { level: 'warn', msgPrefix: '[audit] ' })
```

`stdSerializers` (`err`, `req`, `res`) et `stdTimeFunctions` (`epochTime`,
`isoTime`, `unixTime`, `nullTime`, pour `timestamp`) sont exportés.
`stdSerializers.req` écrit l'id, la méthode, l'url, la query, les params et
l'adresse distante de la requête, et **chaque en-tête tel qu'il est arrivé** —
`cookie` et `authorization` compris : le cookie de session signé, le jeton CSRF
et un jeton bearer arrivent dans la ligne. `stdSerializers.res` écrit le statut
et chaque en-tête de réponse, `set-cookie` compris. Les censurer est le travail
de `redact` : gardez les trois chemins ci-dessus partout où ces sérialiseurs
sont branchés. Les options
qui ne peuvent pas être honorées — `customLevels`, `useOnlyCustomLevels`,
`levelComparison`, `nestedKey`, `crlf`, `hooks.streamWrite`,
`transport.pipeline` — lèvent au lieu d'être ignorées.

## Masquage

`redact` censure des champs à la sortie, dans la syntaxe de chemins que
l'écosystème emploie :

```typescript
const logger = new Logger({
  level: 'info',
  channels: [new ConsoleChannel('json')],
  redact: {
    paths: [
      'req.headers.authorization',   // un chemin littéral
      'req.headers.cookie',
      '*.password',                  // partout où il apparaît, un niveau plus bas
      'users[*].token',              // chaque élément d'une liste
      'headers["set-cookie"]',       // une clé qu'un point ne peut pas nommer
      'creds.*',                     // chaque valeur sous une clé
    ],
    censor: '[Redacted]',
  },
})
```

Un chemin qui ne désigne rien laisse l'entrée telle quelle, et rien n'est muté :
les objets le long d'un chemin censuré sont copiés — en gardant leur prototype,
donc le `toJSON` d'un modèle décide toujours de ce qu'il montre — et ceux que
l'appelant a passés ne le sont pas. Un chemin traverse aussi les getters.

`censor` peut être une fonction, appelée avec la valeur et le chemin où elle a
été trouvée (`['users', '0', 'card']`) ; `remove: true` supprime les clés
trouvées au lieu de les censurer. Un chemin mal formé (`'password,token'`,
`''`, `'a..b'`, crochets déséquilibrés) lève `E_SPECTRUM_INVALID_REDACT_PATH`
à la construction du logger.
