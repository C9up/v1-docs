---
layout: home
hero:
  name: REAM
  text: Rust Engine, Agnostic Modules
  image:
    light: /logo-light.svg
    dark: /logo-dark.svg
    alt: REAM
  tagline: Le confort d'un framework complet. La puissance de Rust. La liberté de choisir.
  actions:
    - theme: brand
      text: Démarrer
      link: /fr/start/introduction
    - theme: alt
      text: Installation
      link: /fr/start/installation
    - theme: alt
      text: Voir sur GitHub
      link: https://github.com/C9up/ream-dev
features:
  - title: Rust invisible
    icon:
      src: /images/features/rust.webp
      width: 72
      height: 72
    details: Vous écrivez du TypeScript. Le serveur HTTP et les WebSockets, le bus d'événements, la compilation SQL et l'accès aux bases, le hachage des mots de passe et les JWT tournent en Rust natif, via NAPI.
    link: /fr/start/introduction
    linkText: Comment c'est construit
  - title: Des modules indépendants
    icon:
      src: /images/features/modules.webp
      width: 72
      height: 72
    details: Chaque paquet se publie et s'utilise seul. Framework complet (Ignitor et conventions) ou boîte à outils assemblée à la main, c'est vous qui choisissez.
    link: /fr/start/packages
    linkText: Les paquets
  - title: HTTP et routage
    icon:
      src: /images/features/routing.webp
      width: 72
      height: 72
    details: Routes, groupes, middlewares, contrôleurs résolus par le conteneur, validation, uploads, fichiers statiques et génération d'URL.
    link: /fr/guides/basics/routing
    linkText: Le routage
  - title: Base de données
    icon:
      src: /images/features/database.webp
      width: 72
      height: 72
    details: L'ORM Atlas avec entités, relations, migrations, factories et transactions, Redis par quasar, et les séries temporelles par eon.
    link: /fr/guides/database/orm/
    linkText: L'ORM
  - title: Authentification
    icon:
      src: /images/features/auth.webp
      width: 72
      height: 72
    details: Gardes session, JWT, tokens d'accès et basic auth, MFA, rôles et permissions, SSO fédéré et serveur OAuth 2.1.
    link: /fr/guides/auth/introduction
    linkText: L'authentification
  - title: Frontend
    icon:
      src: /images/features/frontend.webp
      width: 72
      height: 72
    details: Composants Aurora rendus côté serveur et hydratés, templates, Vite et Tailwind, pages partagées entre serveur et navigateur.
    link: /fr/guides/frontend/aurora/
    linkText: Aurora
  - title: Temps réel
    icon:
      src: /images/features/realtime.webp
      width: 72
      height: 72
    details: WebSockets natifs avec middlewares et gardes au handshake, hubs de diffusion avec fan-out Redis, JSON-RPC sur WebSocket.
    link: /fr/guides/realtime/websockets
    linkText: Les WebSockets
  - title: Mobile
    icon:
      src: /images/features/mobile.webp
      width: 72
      height: 72
    details: Les mêmes composants sur le téléphone, en natif et sans React, avec écrans pilotés par le serveur et mises à jour à distance signées.
    link: /fr/guides/mobile/introduction
    linkText: Le mobile
  - title: Tests
    icon:
      src: /images/features/testing.webp
      width: 72
      height: 72
    details: Un runner, des tests HTTP de bout en bout, des helpers d'authentification et des doublures pour les services du framework.
    link: /fr/guides/testing/introduction
    linkText: Les tests
---

## Démarrer en une minute

```bash
npm install -g @c9up/ream-cli
ream new my-app        # api, web, microservice ou slim ; postgres ou sqlite
cd my-app
ream dev
```

## À quoi ça ressemble

Une route renvoie vers un contrôleur, que le conteneur construit avec ses
dépendances à chaque requête :

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

La suite : le [tutoriel](/fr/start/tutorial) construit une application complète,
et la [référence des erreurs](/fr/reference/errors) explique chaque code que le
framework peut lever.
