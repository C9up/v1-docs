# Introduction

Ce guide couvre les logs avec spectrum :

- Utilisation basique
- Niveaux de log
- Loggers enfants
- ID de corrélation

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

## Étapes suivantes
- [Blackhole (Sécurité)](/fr/guides/security/securing-ssr) — Filtrage de sécurité
- [Event bus](/fr/guides/digging-deeper/emitter) — Architecture event-driven
