---
layout: home
hero:
  name: REAM
  text: Rust Engine, Agnostic Modules
  image:
    light: /logo-light.svg
    dark: /logo-dark.svg
    alt: REAM
  tagline: The comfort of a full-stack framework. The power of Rust. The freedom to choose.
  actions:
    - theme: brand
      text: Get Started
      link: /en/start/introduction
    - theme: alt
      text: Installation
      link: /en/start/installation
    - theme: alt
      text: View on GitHub
      link: https://github.com/C9up/ream-dev
features:
  - title: Invisible Rust
    icon:
      src: /images/features/rust.webp
      width: 72
      height: 72
    details: You write TypeScript. HTTP and WebSocket serving, the event bus, SQL compilation and database access, password hashing and JWTs run in compiled Rust, through NAPI.
    link: /en/start/introduction
    linkText: How it is built
  - title: Independent modules
    icon:
      src: /images/features/modules.webp
      width: 72
      height: 72
    details: Every package is published and used on its own. A full framework (Ignitor and conventions) or a toolkit you assemble by hand, your choice.
    link: /en/start/packages
    linkText: The packages
  - title: HTTP and routing
    icon:
      src: /images/features/routing.webp
      width: 72
      height: 72
    details: Routes, groups, middleware, controllers resolved by the container, validation, uploads, static files and URL building.
    link: /en/guides/basics/routing
    linkText: Routing
  - title: Database
    icon:
      src: /images/features/database.webp
      width: 72
      height: 72
    details: The Atlas ORM with entities, relations, migrations, factories and transactions, Redis through quasar, and time series through eon.
    link: /en/guides/database/orm/
    linkText: The ORM
  - title: Authentication
    icon:
      src: /images/features/auth.webp
      width: 72
      height: 72
    details: Session, JWT, access-token and basic-auth guards, MFA, roles and permissions, federated SSO and an OAuth 2.1 server.
    link: /en/guides/auth/introduction
    linkText: Authentication
  - title: Frontend
    icon:
      src: /images/features/frontend.webp
      width: 72
      height: 72
    details: Aurora components rendered on the server and hydrated, templates, Vite and Tailwind, pages shared by server and browser.
    link: /en/guides/frontend/aurora/
    linkText: Aurora
  - title: Real time
    icon:
      src: /images/features/realtime.webp
      width: 72
      height: 72
    details: Native WebSockets with middleware and guards on the handshake, broadcast hubs with Redis fan-out, JSON-RPC over WebSocket.
    link: /en/guides/realtime/websockets
    linkText: WebSockets
  - title: Mobile
    icon:
      src: /images/features/mobile.webp
      width: 72
      height: 72
    details: The same components on the phone, native and without React, with server-driven screens and signed over-the-air updates.
    link: /en/guides/mobile/introduction
    linkText: Mobile
  - title: Testing
    icon:
      src: /images/features/testing.webp
      width: 72
      height: 72
    details: A runner, end-to-end HTTP tests, authentication helpers and test doubles for the framework's services.
    link: /en/guides/testing/introduction
    linkText: Testing
---

## Start in a minute

```bash
npm install -g @c9up/ream-cli
ream new my-app        # api, web, microservice or slim; postgres or sqlite
cd my-app
ream dev
```

## What it looks like

A route points at a controller, which the container builds with its
dependencies on every request:

```ts
// start/routes.ts
import router from '@c9up/ream/services/router'
import UsersController from '#app/modules/user/controllers/UsersController.js'

router.get('/users', [UsersController, 'index'])
router.post('/users', [UsersController, 'store'])

router.ws('/chat/:room', ({ socket }) => {
  socket.on('message', (data) => socket.send(data))
})
```

```ts
// app/modules/user/controllers/UsersController.ts
import { inject } from '@c9up/ream'
import type { HttpContext } from '@c9up/ream'
import { UserService } from '../services/UserService.js'

@inject()
export default class UsersController {
  constructor(private userService: UserService) {}

  async index({ response }: HttpContext) {
    response.json({ data: await this.userService.findAll() })
  }

  async store({ request, response }: HttpContext) {
    const user = await this.userService.create(request.all())
    response.status(201).json({ data: user })
  }
}
```

Next: the [tutorial](/en/start/tutorial) builds a whole application, and the
[error reference](/en/reference/errors) explains every code the framework can
raise.
