# Spectrum — Logging

Spectrum est le module de logging structuré de Ream. Il supporte plusieurs niveaux de log, des canaux, des overrides par module, et des IDs de corrélation pour le traçage des requêtes.

## Utilisation basique

```typescript
import { Logger, ConsoleChannel } from '@c9up/spectrum'

const logger = new Logger({
  level: 'info',
  channels: [new ConsoleChannel('pretty')],
})

logger.info('Serveur démarré', { port: 3000 })
logger.warn('Requête lente détectée', { duration: 2500 })
logger.error('Connexion échouée', { host: 'db.example.com' })
```

La signature est **message-first** : la string de message vient en premier, l'objet de données structuré en second — `logger.info('user logged in', { userId })`. Un appel se lit de gauche à droite.

### Sérialisation des erreurs

Une `Error` passée en premier argument, ou placée sous `err` (ou `error`) dans
l'objet de données, est sérialisée automatiquement : le nom de son constructeur
en `type`, `message`, `stack`, chaque propriété qu'elle porte (`code`, …), sa
`cause` et les erreurs d'une `AggregateError`. Une référence vers une erreur
déjà en cours d'écriture est coupée en `"[Circular]"` :

```typescript
try {
  await order.save()
} catch (err) {
  logger.error(err, 'save failed')
  // err → { type: 'Error', message: '...', stack: '...', code: '...', cause: {...} }
}
```

## Niveaux de log

Du moins au plus sévère :

| Niveau | Cas d'usage |
|--------|-------------|
| `trace` | Débogage fin |
| `debug` | Diagnostics de développement |
| `info` | Opérations normales |
| `warn` | Inattendu mais récupérable |
| `error` | Erreurs nécessitant attention |
| `fatal` | L'application ne peut pas continuer |

Les messages en dessous du niveau configuré sont silencieusement ignorés :

```typescript
const logger = new Logger({ level: 'warn', channels: [new ConsoleChannel()] })

logger.debug('ignoré')  // Ignoré — debug < warn
logger.warn('loggé')    // Loggé
logger.error('loggé')   // Loggé
```

## Canaux

Un canal détermine où les entrées de log sont écrites. Spectrum inclut `ConsoleChannel` :

### ConsoleChannel

```typescript
import { ConsoleChannel } from '@c9up/spectrum'

// Format pretty (développement)
new ConsoleChannel('pretty')
// Sortie : i 14:32:05 INFO  [app] Serveur démarré {"port":3000}

// Format JSON (production)
new ConsoleChannel('json')
// Sortie : {"level":30,"time":1731000000000,"pid":4242,"hostname":"web-1","module":"app","port":3000,"msg":"Serveur démarré"}
```

Les niveaux `error` et `fatal` écrivent sur `stderr`, tous les autres sur
`stdout` — sauf si le canal reçoit un seul flux pour tous les niveaux :
`new ConsoleChannel('json', { stream: 'stdout' })`.

Le format pretty échappe tout caractère de contrôle qu'un terminal interprète
(CR/LF, retour arrière, ESC, les contrôles C1 sur 8 bits, U+2028/U+2029) dans
le message, le module, l'ID de corrélation et les données : une valeur venue
d'une requête ne peut ni forger une ligne ni piloter le terminal.

### Lignes JSON

Une ligne JSON porte un `level` numérique, `time` en millisecondes epoch, `pid`
et `hostname`, les bindings et champs fusionnés à la racine, et le message sous
`msg`. Chaque partie se règle sur le logger :

```typescript
new Logger({
  messageKey: 'message',              // 'msg' par défaut
  timestamp: 'iso',                   // 'epoch' (défaut), 'iso', 'unix', false, ou une fonction
  base: { service: 'api' },           // { pid, hostname } par défaut ; null pour aucun
  formatters: {
    level: (label) => ({ level: label }),         // {"level":"info"} au lieu de 30
    log: (fields) => ({ ...fields, region: 'eu' }),
  },
})
```

Une donnée que JSON ne sait pas écrire — une référence circulaire, un BigInt —
ne coûte jamais la ligne : le champ est réécrit avec les cycles en
`"[Circular]"`, les BigInt en nombres, ce qui dépasse `depthLimit` (5) en
`"[Object]"`, et au plus `edgeLimit` (100) entrées par objet ou tableau. Un
champ fusionné qui porte le nom du niveau, du temps ou de la clé du message est
écarté : une donnée ne peut pas les forger.

### FileChannel

```typescript
import { FileChannel } from '@c9up/spectrum'

new FileChannel({
  path: './storage/logs/app.log',
  maxSizeBytes: 10 * 1024 * 1024, // rotation avant que le fichier dépasse cette taille
  maxFiles: 5,                    // fichiers conservés, le fichier courant compris
  maxBufferBytes: 16 * 1024 * 1024,
  append: true,                   // false repart d'un fichier vide
})
```

`write()` n'attend jamais le disque : les lignes sont mises en file et écrites
dans l'ordre par un seul écrivain asynchrone. Les lignes encore en file quand
le processus se termine — un `fatal()` juste avant `process.exit()` — sont
écrites de façon synchrone sur `exit`. Si la destination ne suit plus, la file
s'arrête à `maxBufferBytes` : les lignes suivantes sont abandonnées et
comptées, et une ligne `FileChannel dropped N line(s)` est écrite une fois la
file vidée. `{ fd }` au lieu de `path` écrit dans un descripteur déjà ouvert,
jamais tourné et laissé ouvert à la fermeture. Des tailles invalides lèvent
`E_SPECTRUM_INVALID_FILE_OPTIONS`.

### Canaux custom

Implémentez l'interface `LogChannel` :

```typescript
import type { LogChannel, LogEntry } from '@c9up/spectrum'

class FileChannel implements LogChannel {
  name = 'file'

  write(entry: LogEntry): void {
    fs.appendFileSync('app.log', JSON.stringify(entry) + '\n')
  }
}

const logger = new Logger({
  level: 'info',
  channels: [new ConsoleChannel('pretty'), new FileChannel()],
})
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

## Loggers enfants

Créez des loggers scopés avec `child()` :

```typescript
const requestLogger = logger.child({
  module: 'http',
  correlationId: ctx.id,
})

requestLogger.info('Requête reçue', { method: 'GET', path: '/orders' })
// La sortie inclut le correlationId pour le traçage
```

## ID de corrélation

Suivez une requête à travers plusieurs entrées de log :

```typescript
// Par requête : créer un enfant (préféré — immutable)
const reqLogger = logger.child({ correlationId: 'abc-123' })
reqLogger.info('Traitement de la commande')
// i 14:32:05 INFO  [app] Traitement de la commande cid=abc-123

// Ou muter l'instance (à utiliser avec précaution)
logger.setCorrelationId('abc-123')
```

## Types

```typescript
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  level: LogLevel
  message: string
  module: string
  correlationId?: string
  timestamp: string
  data?: Record<string, unknown>
}

interface LogChannel {
  name: string
  write(entry: LogEntry): void
}

interface LogConfig {
  enabled?: boolean          // true par défaut
  name?: string              // émis sur chaque entrée
  level?: LogLevel | 'silent'
  channels?: LogChannel[]
  destination?: string | number | { write(line: string): unknown }
  transport?: { targets?: TransportTargetOptions[] } | TransportTargetOptions
  modules?: Record<string, LogLevel | 'silent'>  // Overrides par module
  redact?: string[] | { paths: string[]; censor?: string | ((value, path) => unknown); remove?: boolean }
  serializers?: Record<string, (value: unknown) => unknown>
  messageKey?: string        // 'msg' par défaut
  errorKey?: string          // 'err' par défaut
  timestamp?: 'epoch' | 'iso' | 'unix' | boolean | (() => string)
  base?: Record<string, unknown> | null
  formatters?: { level?: (label, number) => object; log?: (fields) => object }
  msgPrefix?: string
  mixin?: (mergeObject, level, logger) => Record<string, unknown>
  mixinMergeStrategy?: (mergeObject, mixinObject) => Record<string, unknown>
  hooks?: { logMethod?: (args, method, level) => void }
  onChild?: (child) => void
  depthLimit?: number        // 5 par défaut
  edgeLimit?: number         // 100 par défaut
}

interface LoggerManagerConfig {
  default: string
  loggers: Record<string, LogConfig>
}
```

## Configuration

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

## Pont de logs Rust

Le pont réachemine les lignes que les crates natives écrivent sur stderr vers
le même flux que le code applicatif.

```typescript
import { ConsoleChannel, createRustLogBridge, Logger, parseRustLog } from '@c9up/spectrum'

const logger = new Logger({ level: 'info', channels: [new ConsoleChannel('pretty')] })

const bridge = createRustLogBridge(logger)
bridge.start()
// ... les crates natives émettent sur stderr
bridge.stop()

const entry = parseRustLog('[INFO ream_query] compiled query in 0.3ms')
// { level: 'info', module: 'ream-query', message: 'compiled query in 0.3ms' }
```

Une ligne n'est prise que si elle a la forme `[NIVEAU module] message` ET que
son module (`_` lu comme `-`) correspond à la liste autorisée — `/^ream-/` par
défaut, élargie avec `createRustLogBridge(logger, { modules: /^(ream|atlas)-/ })`.
Elle passe alors par le logger, donc son niveau, son drapeau `enabled` et le
masquage s'appliquent, et elle porte `source: 'rust'`. Tout le reste — y compris
une ligne `[FATAL auth] …` qu'un autre code a renvoyée sur stderr — est
retransmis comme texte, dans son ordre d'origine. Le pont remplace
`process.stderr.write` pour tout le processus et un seul peut être actif à la
fois, donc il se démarre explicitement — `SpectrumProvider` ne l'attache pas.

## Cibles de transport

Un `config/logger.ts` peut déclarer sa sortie en cibles de transport :

```ts
transport: {
  targets: targets()
    .pushIf(!app.inProduction, targets.pretty())
    .pushIf(app.inProduction, targets.file({ destination: 1 }))
    .toArray(),
}
```

Une cible est une **description** réalisée en canal à la construction :

- `pino-pretty` est la console lisible (`destination: 1` ou `2` envoie tous les
  niveaux sur ce flux) ;
- `pino/file` avec un chemin est un `FileChannel` (`append`, `maxSizeBytes`,
  `maxFiles`, `maxBufferBytes`) ; avec un descripteur, c'est du JSON vers ce
  descripteur pour tous les niveaux — `destination: 1` est stdout, ce qu'une
  app conteneurisée envoie à son collecteur, et sans destination c'est 1 ;
- un `LogChannel` comme `target` branche n'importe quelle autre destination,
  avec le niveau propre à la cible.

Tout autre nom de cible lève `E_SPECTRUM_UNSUPPORTED_TARGET` plutôt que
d'écrire ailleurs en silence. La forme unique `transport: { target, options }`
est acceptée aussi, et `destination` sur le logger (un chemin, un descripteur
ou tout objet doté d'une méthode `write(line)`) l'emporte sur `transport`. Une
liste `channels` explicite l'emporte sur les deux.

## Observer chaque ligne

`onLog` vous donne chaque entrée telle qu'un canal la voit — après les
sérialiseurs et après le masquage, jamais le sac brut :

```ts
import { onLog } from '@c9up/spectrum'

const off = onLog((entry) => {
  if (entry.level === 'error') report(entry)
})
```

Il retourne une fonction de désinscription. Un listener qui lève est avalé :
observer un log ne doit jamais changer le fait que le log soit écrit.

`SpectrumProvider` s'abonne pour vous dès que le conteneur expose un émetteur
`events`, et relaie chaque entrée en `log:line` :

```ts
emitter.on('log:line', (entry) => { /* … */ })
```

C'est ce qui alimente le panneau des logs de la barre de debug du framework, et
c'est le même montage qu'atlas utilise pour `db:query` — un paquet qui ne peut
pas importer l'émetteur du framework possède un petit registre, et le provider
fait le pont.

## Autres options

```ts
const logger = new Logger({
  level: 'info',
  mixin: () => ({ requestId: als.getStore()?.id }),  // champs sur chaque ligne
  msgPrefix: '[api] ',
  errorKey: 'error',
  serializers: { req: stdSerializers.req, res: stdSerializers.res },
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
`isoTime`, `unixTime`, `nullTime`, pour `timestamp`) sont exportés. Les options
qui ne peuvent pas être honorées — `customLevels`, `useOnlyCustomLevels`,
`levelComparison`, `nestedKey`, `crlf`, `hooks.streamWrite`,
`transport.pipeline` — lèvent au lieu d'être ignorées.

## Étapes suivantes

- [Blackhole (Sécurité)](/fr/modules/blackhole) — Filtrage de sécurité
- [Event bus](/fr/ream/events) — Architecture event-driven
