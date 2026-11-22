# Ressources d’API

Ce guide couvre la sérialisation des modèles pour une API :

- API Resources (sérialiseurs)
- Notes

## API Resources (sérialiseurs)

`ApiResource<T>` est une classe de base pour transformer des entités en réponses API
avec sélection de champs explicite — partagée entre REST, JSON-RPC et GraphQL.

```ts
import { ApiResource } from '@c9up/ream'

class UserResource extends ApiResource<User> {
  serialize(user: User): Record<string, unknown> {
    return { id: user.id, name: user.name } // ne jamais fuiter password, etc.
  }
}
```

## Notes

- Tous les providers sont **lean** : `register()` binde, `boot()` monte. Ils ne
  gardent pas la propriété du token — enregistre-en un seul de chaque.
- JSON-RPC et GraphQL passent par le même pipeline guard/middleware que les routes REST.
