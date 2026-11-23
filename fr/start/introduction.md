# Introduction

Ce guide couvre ce qu'est ream et comment il est construit :

- Ce qu'est Ream
- Packages du framework
- Concepts clés
- Vue d'ensemble de l'architecture
- Composants Rust
- Décorateurs TypeScript
- Deux modes

Ream est un framework serveur TypeScript pour Node.js avec un coeur HTTP propulsé par Rust. Il repose sur des conventions familières — providers, injection de dépendances, un router fluide, un cycle de vie défini et une architecture modulaire — tout en faisant transiter la couche HTTP par un binaire Rust natif (HyperServer) via NAPI.

![Votre application TypeScript (routes, contrôleurs, middlewares, entités, services) repose sur les liaisons NAPI ; dessous, un cœur Rust compilé fait tourner le HTTP et les WebSockets (hyper et tokio), le bus d'événements, la compilation SQL avec les pilotes PostgreSQL, MySQL et SQLite, le hachage des mots de passe et les JWT. L'analyse des templates, les images, les PDF et le planificateur sont aussi en Rust.](/images/architecture-fr.webp){width=640 height=640 loading=lazy}

## Ce qu'est Ream

**TypeScript en priorité.** Décorateurs, contexte HTTP typé, configuration typée, erreurs typées. Tout transite par des types bien définis plutôt que par des dictionnaires peu typés.

**DX familière.** Les briques sont les briques habituelles : `@inject()`, tuples de contrôleurs, `container.make()`, providers avec un cycle de vie `register/boot/start/ready/shutdown`, `reamrc.ts` pour la configuration du projet.

**Coeur HTTP en Rust.** Le serveur HTTP, le bus d'événements et les primitives de sécurité s'exécutent en Rust via des bindings NAPI, et non dans la boucle d'événements Node.js. Latence réduite, empreinte mémoire plus faible, Argon2id et HMAC-SHA256 natifs sans avoir à embarquer des packages de cryptographie en pur JavaScript.

**Modulaire par conception.** Le code applicatif réside dans des modules de domaine : `app/modules/task/`, `app/modules/user/`. Chaque module embarque ses propres contrôleurs, services, entités, validateurs et un fichier `routes.ts`. Le framework charge automatiquement le `routes.ts` de chaque module — aucun registre de routes central à maintenir.

## Packages du framework

| Package | Rôle |
|---|---|
| `@c9up/ream` | Coeur — Container, Router, HttpKernel, Ignitor, providers, exceptions |
| `@c9up/atlas` | ORM — `@Entity()`, `QueryBuilder`, `BaseRepository` |
| `@c9up/warden` | Auth — `AuthManager`, `JwtStrategy`, décorateurs RBAC |
| `@c9up/transit` | Connexion fédérée — SAML 2.0, LDAP, OpenID Connect, OAuth1 / OAuth2 |
| `@c9up/rune` | Validation — constructeur de schéma fluide, validateurs personnalisés |
| `@c9up/spectrum` | Logging — logger structuré avec niveaux et support de canaux |

## Concepts clés

### Injection de dépendances

Le conteneur construit automatiquement toute classe décorée avec `@inject()` ou `@Service()`. Vous déclarez les dépendances comme paramètres du constructeur — le conteneur les résout.

```typescript
import { inject } from '@c9up/ream'
import { TaskService } from '../services/TaskService.js'

@inject()
export default class TasksController {
  constructor(private tasks: TaskService) {}
}
```

`@inject()` marque une classe pour une résolution transitoire (une instance par appel à `container.make()`). `@Service()` marque une classe comme singleton. Les tokens de type chaîne nommés fonctionnent aussi via `@Inject('token-name')`.

### Tuples de contrôleurs

Les routes référencent les contrôleurs sous forme de tuples `[ControllerClass, 'methodName']`. Le conteneur résout le contrôleur (et toutes ses dépendances) au moment de la requête — aucune instanciation ou liaison explicite n'est nécessaire.

```typescript
router.get('/tasks', [TasksController, 'index'])
router.post('/tasks', [TasksController, 'store'])
```

### Routing modulaire

Chaque module définit ses propres routes en important le service router. Le framework découvre et charge ces fichiers automatiquement :

```typescript
// app/modules/task/routes.ts
import router from '@c9up/ream/services/router'
import TasksController from './controllers/TasksController.js'

router.get('/tasks', [TasksController, 'index'])
router.post('/tasks', [TasksController, 'store'])
router.get('/tasks/:id', [TasksController, 'show'])
router.put('/tasks/:id', [TasksController, 'update'])
router.delete('/tasks/:id', [TasksController, 'destroy'])
```

### Providers

Les providers enregistrent des services dans le conteneur et exécutent du code d'initialisation lors de phases de cycle de vie définies :

```typescript
import { Provider } from '@c9up/ream'

export default class AppProvider extends Provider {
  register() {
    // Synchrone — ajout de liaisons au conteneur
    this.app.container.singleton('mailer', () => new Mailer(
      this.app.config.get('mail')
    ))
  }

  async boot() {
    // Asynchrone — vérification des connexions, validation de la configuration
  }
}
```

### Le cycle de vie

Toute application Ream démarre en quatre phases séquentielles :

1. **register** — Tous les providers appellent `register()`. Les liaisons sont ajoutées au conteneur. Aucun travail asynchrone.
2. **boot** — Les providers appellent `boot()`. Les connexions à la base de données s'ouvrent, la configuration est validée.
3. **start** — Les fichiers preload sont importés (`start/kernel.ts`, les fichiers `routes.ts` des modules). Le serveur HTTP n'écoute pas encore.
4. **ready** — Le serveur HTTP commence à accepter les connexions. Les providers appellent `ready()`.

L'arrêt inverse l'ordre : les providers appellent `shutdown()` dans l'ordre d'enregistrement inverse.

## Vue d'ensemble de l'architecture

![Le trajet d'une requête dans ream. Le serveur natif en Rust lit HTTP/1.1 et HTTP/2 et applique les limites de corps, le handshake WebSocket et les origines autorisées. Puis, en TypeScript : les middlewares serveur sur chaque requête (server.use dans start/kernel.ts) ; la correspondance de route, avec un 404 E_ROUTE_NOT_FOUND si aucune ne correspond ; les middlewares routeur sur les routes trouvées (router.use) ; les middlewares nommés et en ligne de la route ; les guards (.guard, .role, .permission, qui répondent 401 ou 403) ; la validation (.validate, qui répond 422 E_VALIDATION_ERROR) ; le contrôleur. Toute erreur va au gestionnaire d'exceptions, qui la signale puis répond avec le statut et le code de l'erreur.](/images/request-fr.webp){width=640 height=640 loading=lazy}

L'`HttpKernel` est une fonction TypeScript : le serveur natif lui passe chaque requête et renvoie la réponse qu'elle construit. La frontière de transport reste minimale, et votre logique applicative reste en TypeScript.

## Composants Rust

### HyperServer

Construit sur [Hyper](https://hyper.rs/), une bibliothèque HTTP Rust de qualité production. Il expose un unique binding NAPI — `onRequest(callback)` — que l'`HttpKernel` TypeScript vient brancher.

### Bus d'événements

Partie du core ream ([`@c9up/ream/events`](/fr/guides/digging-deeper/emitter)) : un bus d'événements publish/subscribe typé, adossé à un coeur Rust. La couche Rust gère la boucle de dispatch ; TypeScript s'abonne et émet avec une inférence de types complète.

### Primitives de sécurité

Le hachage de mots de passe (Argon2id par défaut, bcrypt et scrypt aussi) est implémenté dans la crate Rust `sigil-engine` et exposé via `@c9up/sigil` ; la signature et la vérification JWT vivent dans la crate `warden-engine` derrière `@c9up/warden`. Cela garantit des comparaisons en temps constant et un hachage résistant en mémoire sans bibliothèques de cryptographie en pur JavaScript.

## Décorateurs TypeScript

Ream nécessite les décorateurs expérimentaux et `reflect-metadata`. Ces options sont configurées dans le template de démarrage :

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

| Décorateur | Package | Rôle |
|---|---|---|
| `@inject()` | `@c9up/ream` | Résolution IoC transitoire pour les contrôleurs |
| `@Service()` | `@c9up/ream` | Enregistrement de service singleton |
| `@Inject('token')` | `@c9up/ream` | Injection de paramètre constructeur nommé |
| `@Lazy()` | `@c9up/ream` | Résoudre les cycles de dépendances circulaires |
| `@Entity()` | `@c9up/atlas` | Marquer une classe comme entité de base de données |
| `@Guard('jwt')` | `@c9up/warden` | Exiger une stratégie d'auth sur une méthode de route |
| `@Role('admin')` | `@c9up/warden` | Exiger un rôle |
| `@Permission('x')` | `@c9up/warden` | Exiger une chaîne de permission |

## Deux modes

Le **mode framework** utilise `reamrc.ts`, les providers, les routes de modules auto-chargées et le cycle de vie complet :

```typescript
// bin/server.ts
import { Ignitor, defineConfig } from '@c9up/ream'

new Ignitor(new URL('../', import.meta.url), {
  importer: (path) => import(path),
  port: 3000,

})
  .httpServer()
  .useRcFile(defineConfig({
    providers: [() => import('#providers/AppProvider.js')],
    preloads: [() => import('#start/kernel.js')],
    modules: { path: './app/modules', autoload: ['routes'] },
  }))
  .start()
```

Le **mode toolkit** ignore toutes les conventions. Vous câblez le router, les middlewares et le kernel manuellement — utile pour les microservices ou pour embarquer Ream dans une application Node.js existante.

## Prochaines étapes
- [Démarrage rapide](/fr/start/tutorial) — Construire une API Tasks fonctionnelle de zéro
- [Structure des dossiers](/fr/start/folder-structure) — Où chaque fichier appartient et pourquoi
- [Cycle de vie de l'application](/fr/guides/concepts/lifecycle) — Le processus de démarrage en quatre phases en détail
- [Conteneur](/fr/guides/concepts/dependency-injection) — Patterns d'injection de dépendances et tests
