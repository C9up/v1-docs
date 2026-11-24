# Controllers

This guide covers controllers.

## Controllers

Controllers are classes decorated with `@inject()`, which registers them for transient IoC resolution. The container auto-resolves constructor dependencies on every request.

```typescript
// app/modules/user/controllers/UsersController.ts
import { inject } from '@c9up/ream'
import type { HttpContext } from '@c9up/ream'
import { UserService } from '../services/UserService.js'
import { createUser, updateUser } from '../validators/user.js'

@inject()
export default class UsersController {
  constructor(private userService: UserService) {}

  async index({ response }: HttpContext) {
    const users = await this.userService.findAll()
    response.json({ data: users })
  }

  async store({ request, response }: HttpContext) {
    const data = await request.validateUsing(createUser)
    const user = await this.userService.create(data)
    response.status(201).json({ data: user })
  }

  async show({ request, response }: HttpContext) {
    const id = request.param('id')
    const user = id ? await this.userService.findById(id) : null
    if (!user) return response.status(404).json({ error: 'Not found' })
    response.json({ data: user })
  }

  async update({ request, response }: HttpContext) {
    const id = request.param('id')
    if (!id) return response.status(404).json({ error: 'Not found' })
    const data = await request.validateUsing(updateUser)
    const user = await this.userService.update(id, data)
    response.json({ data: user })
  }

  async destroy({ request, response }: HttpContext) {
    const id = request.param('id')
    if (!id) return response.status(404).json({ error: 'Not found' })
    await this.userService.delete(id)
    response.noContent()
  }
}
```

The validators declare the fields a write accepts:

```typescript
// app/modules/user/validators/user.ts
import { rules, schema } from '@c9up/rune'

export const createUser = schema({
  name: rules.string().min(1).max(100).trim(),
  email: rules.string().email(),
})

export const updateUser = schema({
  name: rules.string().min(1).max(100).trim().optional(),
  email: rules.string().email().optional(),
})
```

Never pass `request.all()` to a write. It holds every key of the body and of the
query string, so `?role=admin` or `{"is_admin": true}` would reach the model.
`validateUsing()` returns only the declared fields, and refuses the request with
`E_VALIDATION_ERROR` (422) when they are wrong. See
[Validation](/en/guides/basics/validation/); `request.only(['name', 'email'])`
is the allow-list for a field you do not validate.

### Binding Controllers to Routes

Use the controller tuple syntax `[ControllerClass, 'methodName']`. The container instantiates the controller and resolves its dependencies per request:

```typescript
import router from '@c9up/ream/services/router'
import UsersController from './controllers/UsersController.js'

router.get('/users', [UsersController, 'index'])
router.post('/users', [UsersController, 'store'])
router.get('/users/:id', [UsersController, 'show'])
router.put('/users/:id', [UsersController, 'update'])
router.delete('/users/:id', [UsersController, 'destroy'])
```
