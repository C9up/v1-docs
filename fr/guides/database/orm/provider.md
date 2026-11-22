# Provider et démarrage

Ce guide couvre AtlasProvider et ce qui s’exécute au démarrage :

- Migrations au démarrage
- Une option qu'il ne connaît pas

## AtlasProvider

Enregistrez `AtlasProvider` dans la liste des providers de votre application. Il lit `config/database.ts`, ouvre la connexion à la base de données, et enregistre l'adaptateur dans le conteneur. Il n'exécute les migrations en attente au démarrage que si `migrations.autoRun` est activé (jamais en développement) ; sinon `ream migration:run` les applique.

```typescript
// config/app.ts
import AtlasProvider from '@c9up/atlas/AtlasProvider'

export default {
  providers: [AtlasProvider],
}
```

```typescript
// config/database.ts
export default {
  url: 'sqlite:data/app.db',          // ou 'postgres://...' ou 'mysql://...'
  poolMin: 1,
  poolMax: 10,
  migrations: {
    path: './database/migrations',
  },
}
```

Au démarrage, `AtlasProvider` :
1. Ouvre un pool de connexions via le crate Rust `ream-db` (sqlx en interne — SQLite, PostgreSQL ou MySQL)
2. Détecte le dialecte à partir du schéma de l'URL et appelle `setAtlasDialect(...)`
3. Enregistre `db` et `db.connection` dans le conteneur
4. Enregistre la source de migrations pour les commandes `migrate` / `migration:*`, et n'exécute les migrations en attente via `MigrationRunner` que si `migrations.autoRun` est activé et que l'environnement n'est pas le développement (tout le DDL compilé par `ream-query`)

### Migrations au démarrage

`migrations.autoRun` migre quand l'application démarre. C'est désactivé par
défaut, et pour une raison : le démarrage a aussi lieu sous `warmUp()`, donc un
listing de routes ou une passe de génération mutait le schéma, et chaque
réplique d'un déploiement progressif courait après la même base.

Activez-le pour un hôte qui possède vraiment sa base à lui seul — un conteneur
qui démarre une fois, une application embarquée sur une base fichier :

```ts
migrations: { autoRun: true }
```

**Il est ignoré en développement** (`REAM_ENV`, ou à défaut `NODE_ENV`, valant `development`, `develop` ou `dev`). Si l'on migre au
démarrage, c'est parce qu'un conteneur n'a pas de terminal où lancer une
commande ; une machine de développement en a un. Et le développement est le seul
environnement qui redémarre en permanence, donc chaque redémarrage rejouait les
migrations pendant que l'instance remplacée tenait encore le verrou — deux
échecs par fichier sauvegardé. Lancez `ream migrate` là-bas, comme partout
ailleurs.

### Une option qu'il ne connaît pas

Une clé sous `migrations` qu'atlas ne reconnaît pas est nommée au démarrage, au
lieu d'être ignorée. Ce silence a coûté cher : quand `autoRunInProduction` est
devenu `autoRun`, l'ancienne clé a continué d'être acceptée, les migrations se
sont arrêtées sans un mot, et un déploiement est parti sur un schéma vide.

Passer la config par `defineConfig()` l'attrape plus tôt — à la compilation, où
une clé renommée est une erreur de type :

```ts
import { defineConfig } from '@c9up/atlas'

export default defineConfig({
  // …
})
```
