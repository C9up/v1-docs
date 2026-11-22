# Canaux et transports

Ce guide couvre les canaux, les cibles de transport et le pont Rust :

- Canaux
- Cibles de transport
- Pont de logs Rust

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
