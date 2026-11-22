# spectrum

Ce guide couvre les types de spectrum et l’observation de chaque ligne :

- Types
- Observer chaque ligne

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
