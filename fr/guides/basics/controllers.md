# Contrôleurs

Ce guide couvre les contrôleurs.

## Contrôleurs

Les contrôleurs sont des classes décorées avec `@inject()`, ce qui les enregistre pour une résolution IoC transiente. Le conteneur résout automatiquement les dépendances du constructeur à chaque requête.

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

Les validateurs déclarent les champs qu'une écriture accepte :

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

Ne passez jamais `request.all()` à une écriture. Il contient toutes les clés du
corps et de la query string : `?role=admin` ou `{"is_admin": true}` atteindrait
le modèle. `validateUsing()` ne rend que les champs déclarés, et refuse la
requête avec `E_VALIDATION_ERROR` (422) quand ils sont faux. Voir
[Validation](/fr/guides/basics/validation/) ; `request.only(['name', 'email'])`
est la liste blanche pour un champ que vous ne validez pas.

### Associer les contrôleurs aux routes

Utilisez la syntaxe tuple `[ControllerClass, 'methodName']`. Le conteneur instancie le contrôleur et résout ses dépendances à chaque requête :

```typescript
import router from '@c9up/ream/services/router'
import UsersController from './controllers/UsersController.js'

router.get('/users', [UsersController, 'index'])
router.post('/users', [UsersController, 'store'])
router.get('/users/:id', [UsersController, 'show'])
router.put('/users/:id', [UsersController, 'update'])
router.delete('/users/:id', [UsersController, 'destroy'])
```
