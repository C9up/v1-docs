# API resources

This guide covers serializing models for an API:

- API Resources (serializers)
- Notes

## API Resources (serializers)

`ApiResource<T>` is a base class for transforming entities into API responses
with explicit field selection — shared across REST, JSON-RPC, and GraphQL.

```ts
import { ApiResource } from '@c9up/ream'

class UserResource extends ApiResource<User> {
  serialize(user: User): Record<string, unknown> {
    return { id: user.id, name: user.name } // never leak password, etc.
  }
}
```

## Notes

- All providers are **lean**: `register()` binds, `boot()` mounts. They don't
  guard token ownership — register one of each.
- JSON-RPC and GraphQL run the same guard/middleware pipeline as REST routes.
