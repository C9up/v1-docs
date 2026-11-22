# Garde personnalisée

Ce guide couvre l'écriture de sa propre garde.

## Stratégies personnalisées

Implémentez l'interface `AuthStrategy` pour ajouter votre propre stratégie :

```typescript
import type { AuthStrategy, AuthResult } from '@c9up/warden'

const apiKeyStrategy: AuthStrategy = {
  name: 'apiKey',

  async authenticate(credentials): Promise<AuthResult> {
    // Non utilisé pour l'auth par clé API
    return { authenticated: false, error: 'Use verify() with an API key' }
  },

  async verify(key): Promise<AuthResult> {
    const user = await db.apiKeys.findUser(key)
    if (!user) return { authenticated: false, error: 'Invalid API key' }
    return { authenticated: true, user: { id: user.id, roles: user.roles } }
  },
}

auth.registerStrategy('apiKey', apiKeyStrategy)

// Utilisez-la sur le middleware d'une route spécifique ou en passant le nom de la stratégie :
const result = await auth.verify(apiKey, 'apiKey')
```

---
