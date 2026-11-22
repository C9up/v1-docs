# Controllers

This guide covers controllers.

## Controllers

Controllers are classes decorated with `@inject()`, which registers them for transient IoC resolution. The container auto-resolves constructor dependencies on every request.

```typescript
// app/modules/user/controllers/UsersController.ts
import { inject } from '@c9up/ream'
import type { HttpContext } from '@c9up/ream'
import { UserService } from '../services/UserService.js'

@inject()
export default class UsersController {
  constructor(private userService: UserService) {}

  async index({ response }: HttpContext) {
    const users = await this.userService.findAll()
    response.json({ data: users })
  }

  async store({ request, response }: HttpContext) {
    const data = request.all()
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
    const user = await this.userService.update(id, request.all())
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
