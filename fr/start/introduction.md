# Introduction

Ream est un framework pour construire des applications web et des API en TypeScript, sur Node.js. Vous écrivez votre application en TypeScript. Les parties qui demandent de la vitesse, comme le serveur HTTP, sont écrites en Rust et livrées déjà compilées : vous n'écrivez jamais de Rust.

Cette page présente les idées de base. Pour construire tout de suite une première application, suivez le [tutoriel](/fr/start/tutorial).

![Votre application TypeScript (routes, contrôleurs, middlewares, entités, services) repose sur les liaisons NAPI ; dessous, un cœur Rust compilé fait tourner le HTTP et les WebSockets (hyper et tokio), le bus d'événements, la compilation SQL avec les pilotes PostgreSQL, MySQL et SQLite, le hachage des mots de passe et les JWT. L'analyse des templates, les images, les PDF et le planificateur sont aussi en Rust.](/images/architecture-fr.webp){width=640 height=640 loading=lazy}

## À quoi ressemble une application

Une route associe une URL à une méthode de contrôleur :

```typescript
// app/modules/task/routes.ts
import router from '@c9up/ream/services/router'
import TasksController from './controllers/TasksController.js'

router.get('/tasks', [TasksController, 'index'])
router.post('/tasks', [TasksController, 'store'])
router.get('/tasks/:id', [TasksController, 'show'])
```

Le contrôleur reçoit la requête et renvoie une réponse. Les services dont il a besoin arrivent par son constructeur :

```typescript
// app/modules/task/controllers/TasksController.ts
import { inject } from '@c9up/ream'
import type { HttpContext } from '@c9up/ream'
import { TaskService } from '../services/TaskService.js'

@inject()
export default class TasksController {
  constructor(private tasks: TaskService) {}

  async index({ response }: HttpContext) {
    response.json({ data: await this.tasks.findAll() })
  }
}
```

Vous ne créez jamais le contrôleur vous-même. À chaque requête, ream le construit avec un `TaskService` tout prêt.

## Ce que ream vous apporte

**Tout est typé.** La requête, la configuration et les erreurs ont des types TypeScript. Votre éditeur complète le code et signale une faute avant l'exécution.

**Votre code est rangé par domaine.** Chaque fonctionnalité de l'application vit dans son propre dossier, son module : `app/modules/task/`, `app/modules/user/`. Un module contient ses contrôleurs, ses services, ses entités, ses validateurs et son fichier `routes.ts`. Ream charge tout seul le `routes.ts` de chaque module : vous n'avez pas de liste centrale de routes à tenir à jour.

**Rust travaille pour vous.** Le serveur HTTP, le bus d'événements, le hachage des mots de passe et la signature des JWT tournent en Rust. Ils ne bloquent donc pas la boucle d'événements de Node.js, et votre application n'embarque aucune bibliothèque de cryptographie écrite en JavaScript.

**Chaque paquet est indépendant.** Ream est découpé en paquets : la base de données, l'authentification, la validation, les e-mails, etc. Vous n'installez que ceux dont vous avez besoin.

## Les paquets principaux

| Paquet | À quoi il sert |
|---|---|
| `@c9up/ream` | Le cœur : le conteneur, le router, le serveur HTTP, le démarrage de l'application |
| `@c9up/atlas` | Lire et écrire dans la base de données (ORM) |
| `@c9up/warden` | Identifier les utilisateurs et contrôler leurs droits |
| `@c9up/transit` | Se connecter avec un compte externe (SAML 2.0, LDAP, OpenID Connect, OAuth 1 et 2) |
| `@c9up/rune` | Valider les données reçues |
| `@c9up/spectrum` | Écrire des logs |

La [liste complète des paquets](/fr/start/packages) les range par domaine.

## Quatre idées à connaître

### Le conteneur construit vos classes

Le conteneur est l'objet qui crée les instances de vos classes. Il lit les paramètres du constructeur et fournit ce qu'il faut. C'est ce qu'on appelle l'injection de dépendances.

- `@inject()` : le conteneur crée une nouvelle instance à chaque fois qu'on la demande (`container.make()`). On l'utilise pour les contrôleurs.
- `@Service()` : le conteneur crée une seule instance et la réutilise partout (un singleton).
- `@Inject('nom')` : le conteneur fournit ce qui a été enregistré sous ce nom.

### Une route pointe vers un contrôleur

Une route s'écrit avec la classe du contrôleur et le nom de sa méthode : `[TasksController, 'index']`. Au moment de la requête, le conteneur construit le contrôleur avec ses dépendances, puis appelle la méthode.

### Les providers préparent les services

Un provider est une classe qui prépare un service au démarrage : il l'enregistre dans le conteneur, ouvre une connexion, vérifie une configuration.

```typescript
import { Provider } from '@c9up/ream'

export default class AppProvider extends Provider {
  register() {
    // Synchrone : enregistrer des services dans le conteneur
    this.app.container.singleton('mailer', () => new Mailer(
      this.app.config.get('mail')
    ))
  }

  async boot() {
    // Asynchrone : vérifier une connexion, valider la configuration
  }
}
```

### L'application démarre en quatre étapes

1. **register** : chaque provider enregistre ses services dans le conteneur. Rien d'asynchrone ici.
2. **boot** : chaque provider prépare ses services. Les connexions à la base de données s'ouvrent et la configuration est vérifiée.
3. **start** : ream importe les fichiers de démarrage (`start/kernel.ts`) et le `routes.ts` de chaque module. Le serveur n'accepte pas encore de requêtes.
4. **ready** : le serveur accepte les requêtes, puis chaque provider exécute sa méthode `ready()`.

À l'arrêt, chaque provider exécute sa méthode `shutdown()`, en commençant par le dernier enregistré.

## Le trajet d'une requête

![Le trajet d'une requête dans ream. Le serveur natif en Rust lit HTTP/1.1 et HTTP/2 et applique les limites de corps, le handshake WebSocket et les origines autorisées. Puis, en TypeScript : les middlewares serveur sur chaque requête (server.use dans start/kernel.ts) ; la correspondance de route, avec un 404 E_ROUTE_NOT_FOUND si aucune ne correspond ; les middlewares routeur sur les routes trouvées (router.use) ; les middlewares nommés et en ligne de la route ; les guards (.guard, .role, .permission, qui répondent 401 ou 403) ; la validation (.validate, qui répond 422 E_VALIDATION_ERROR) ; le contrôleur. Toute erreur va au gestionnaire d'exceptions, qui la signale puis répond avec le statut et le code de l'erreur.](/images/request-fr.webp){width=640 height=640 loading=lazy}

Le serveur Rust reçoit la requête et la passe à l'`HttpKernel`, une fonction TypeScript. Elle exécute les middlewares, trouve la route et appelle votre contrôleur. Le serveur Rust renvoie ensuite la réponse au client. Toute la logique de votre application reste donc en TypeScript.

## Les parties écrites en Rust

- **Le serveur HTTP** est construit sur [Hyper](https://hyper.rs/), une bibliothèque HTTP éprouvée en Rust. Il transmet chaque requête à l'`HttpKernel` par une seule fonction, `onRequest(callback)`.
- **Le bus d'événements** ([`@c9up/ream/events`](/fr/guides/digging-deeper/emitter)) envoie les événements en Rust. Vous émettez des événements et vous vous y abonnez en TypeScript, avec des types complets.
- **Le hachage des mots de passe** (Argon2id par défaut, bcrypt et scrypt aussi) est fait en Rust par [`@c9up/sigil`](/fr/reference/sigil). **Les JWT** sont signés et vérifiés en Rust par [`@c9up/warden`](/fr/reference/warden). Les comparaisons se font en temps constant : leur durée ne révèle rien du secret.

## Les décorateurs

Ream utilise les décorateurs TypeScript, les annotations en `@` placées devant une classe ou une méthode. Le projet créé par `ream new` active déjà les deux options nécessaires :

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

| Décorateur | Paquet | Ce qu'il fait |
|---|---|---|
| `@inject()` | `@c9up/ream` | Le conteneur construit une nouvelle instance à chaque demande (contrôleurs) |
| `@Service()` | `@c9up/ream` | Le conteneur construit une seule instance, partagée (singleton) |
| `@Inject('token')` | `@c9up/ream` | Injecte ce qui a été enregistré sous ce nom |
| `@Lazy()` | `@c9up/ream` | Résout deux classes qui dépendent l'une de l'autre |
| `@Entity()` | `@c9up/atlas` | Fait d'une classe une table de la base de données |
| `@Guard('jwt')` | `@c9up/warden` | Exige un utilisateur connecté (ici par JWT) pour cette méthode |
| `@Role('admin')` | `@c9up/warden` | Exige un rôle |
| `@Permission('x')` | `@c9up/warden` | Exige une permission |

## Framework complet ou boîte à outils

Vous pouvez utiliser ream de deux façons.

**Le framework complet** : ream suit ses conventions. Il lit `reamrc.ts`, démarre les providers, charge les routes des modules et suit les quatre étapes du démarrage. C'est ce que crée `ream new` :

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

**La boîte à outils** : vous prenez seulement les pièces qui vous intéressent, et vous branchez vous-même le router, les middlewares et le kernel. C'est utile pour un petit microservice, ou pour ajouter ream à une application Node.js existante.

## Et ensuite

- [Le tutoriel](/fr/start/tutorial) : construire une API de tâches complète, pas à pas
- [La structure des dossiers](/fr/start/folder-structure) : où va chaque fichier, et pourquoi
- [Le cycle de vie](/fr/guides/concepts/lifecycle) : les quatre étapes du démarrage en détail
- [Le conteneur](/fr/guides/concepts/dependency-injection) : l'injection de dépendances, et comment la remplacer dans les tests
