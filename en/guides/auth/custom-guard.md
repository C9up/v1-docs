# Custom guard

This guide covers writing a guard of your own.

## Custom Strategies

Implement the `AuthStrategy` interface to add your own strategy:

```typescript
import type { AuthStrategy, AuthResult } from '@c9up/warden'

const apiKeyStrategy: AuthStrategy = {
  name: 'apiKey',

  async authenticate(credentials): Promise<AuthResult> {
    // Not used for API key auth
    return { authenticated: false, error: 'Use verify() with an API key' }
  },

  async verify(key): Promise<AuthResult> {
    const user = await db.apiKeys.findUser(key)
    if (!user) return { authenticated: false, error: 'Invalid API key' }
    return { authenticated: true, user: { id: user.id, roles: user.roles } }
  },
}

auth.registerStrategy('apiKey', apiKeyStrategy)

// Use it on a specific route's middleware or by passing the strategy name:
const result = await auth.verify(apiKey, 'apiKey')
```

---
