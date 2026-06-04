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
// Sortie : {"timestamp":"...","level":"info","module":"app","message":"Serveur démarré","data":{"port":3000}}
```

Les niveaux `error` et `fatal` écrivent sur `stderr`. Tous les autres niveaux écrivent sur `stdout`.

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
  level: LogLevel
  channels: LogChannel[]
  modules?: Record<string, LogLevel>  // Overrides par module
}
```

## Étapes suivantes

- [Blackhole (Sécurité)](/fr/modules/blackhole) — Filtrage de sécurité
- [Event bus](/fr/ream/events) — Architecture event-driven
