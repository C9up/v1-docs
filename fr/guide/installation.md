# Installation

## Prérequis

- **Node.js 24+** — le plancher `engines` de ream : le contexte de requête repose sur `AsyncLocalStorage`, que Node 24 rend peu coûteux par défaut
- **pnpm** — gestionnaire de paquets recommandé (npm/yarn fonctionnent aussi)
- **@swc/core + @swc-node/register** — pour les métadonnées de décorateurs TypeScript
- Pas besoin de toolchain Rust — les binaires NAPI sont précompilés

## Créer un nouveau projet

Le squelette vient de la CLI, `@c9up/ream-cli` :

```bash
npm install -g @c9up/ream-cli
ream new my-app
cd my-app
ream dev
```

`ream new` pose deux questions (ou prend `--template` et `--db`), écrit le projet et installe ses dépendances :

1. **Template** — `api` (backend API), `web` (full stack), `microservice` (orienté événements), `slim` (minimum)
2. **Base de données** — `postgres` ou `sqlite`

## Installation manuelle

Pour monter un projet à la main :

```bash
mkdir my-app && cd my-app
pnpm init
```

Installez le framework et son environnement d'exécution :

```bash
pnpm add @c9up/ream reflect-metadata
pnpm add -D @swc/core @swc-node/register typescript @c9up/ream-cli @c9up/helix
```

## Ajouter des modules

Chaque module est un paquet indépendant. Ajoutez seulement ce dont vous avez besoin :

```bash
# ORM (SQLite, PostgreSQL, MySQL)
pnpm add @c9up/atlas

# Authentification (JWT, guards)
pnpm add @c9up/warden

# Connexion sociale (Google, GitHub, ...)
pnpm add @c9up/transit

# Validation
pnpm add @c9up/rune

# Logging
pnpm add @c9up/spectrum
```

> Le bus d'événements fait partie du cœur de ream — rien à installer. Voir
> [Bus d'événements](/fr/ream/events).

### Ajouter un paquet Ream

Une fois votre projet Ream créé (`ream new my-app`), la manière canonique en une seule étape pour ajouter un paquet first-party est :

```bash
pnpm ream add @c9up/atlas
```

Cette commande installe `@c9up/atlas` avec le gestionnaire de paquets de votre projet (auto-détecté depuis le lockfile — pnpm > yarn > npm) ET lance `ream configure @c9up/atlas` pour câbler le provider dans `reamrc.ts`, alimenter les variables `.env` et générer les fichiers de configuration / migration nécessaires. Passez `--dev` pour installer en devDependency et `--force` pour écraser les fichiers de configuration existants. Les drapeaux non reconnus sont transmis au hook `configure()` du paquet :

```bash
pnpm ream add @c9up/photon --dev
pnpm ream add @c9up/some-pkg --transports=smtp --transports=resend --queue=redis
```

L'alternative manuelle en deux étapes reste `pnpm add @c9up/atlas && pnpm ream configure @c9up/atlas` — utile si vous voulez installer avec une version épinglée précise ou un drapeau workspace que `ream add` n'expose pas.

#### Pourquoi `ream add` ne renvoie-t-il pas d'erreur quand le paquet n'a pas de hook configure ?

Certains paquets (typiquement ceux de la communauté) sont publiés sans export `configure`. Dans ce cas, `ream add` finit quand même l'installation, affiche une ligne `Note: <pkg> has no configure() hook` et retourne 0. Le paquet est installé et prêt à être importé ; tout câblage manuel est documenté dans le README du paquet. (`ream configure <pkg>` sur le même paquet retournerait 1, car « configure » est la demande explicite et « pas de hook » en est l'échec naturel.)

Auteurs : voir [Système de plugins](./plugin-system) pour publier un plugin configurable.

## Convention de publication : source en dev, `dist/` au publish

Dans le monorepo Ream et pendant le développement, les paquets s'exécutent **directement depuis leur source TypeScript** (`src/**/*.ts`) : le champ `exports` de chaque `package.json` pointe sur `src/`, donc éditer `packages/*/src` est pris en compte immédiatement, sans étape de build, via `@swc-node/register`. Aucun drapeau `--conditions` n'est requis.

Au moment de la publication sur npm, le champ `publishConfig` de chaque paquet redirige `main` / `types` / `exports` vers `dist/` : pnpm substitue ces valeurs dans le tarball, si bien que les consommateurs qui n'ont pas de transformation TypeScript reçoivent du JavaScript compilé (`dist/*.js` + `.d.ts`), tandis que le `package.json` versionné reste source-first. Le `dist/` est généré par `pnpm build` juste avant `pnpm publish` (et n'est jamais committé — il est dans `.gitignore`).

Pourquoi ce double mode plutôt que publier uniquement la source : un consommateur Node hors écosystème Ream (sans `@swc-node/register`) ne pourrait pas importer un paquet `src/*.ts`. Pourquoi ne pas publier uniquement `dist/` : on garderait alors le coût d'un build watch permanent dans le dev loop du monorepo. Le `publishConfig` capture les deux besoins sans imposer l'un à l'autre. Les `sourceMap` + `declarationMap` émis par le build préservent les stack traces vers les vraies lignes source côté consommateur.

## Mise en place du projet

Créez la configuration du framework :

```typescript
// reamrc.ts
import { defineConfig } from '@c9up/ream'

export default defineConfig({
  providers: [
    () => import('@c9up/spectrum/provider'),
    () => import('@c9up/atlas/provider'),
    () => import('@c9up/warden/provider'),
    () => import('./providers/AppProvider.ts'),
  ],
  preloads: [
    () => import('./start/kernel.ts'),
  ],
  modules: {
    path: './app/modules',
  },
})
```

Créez le point d'entrée du serveur :

```typescript
// bin/server.ts
import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@c9up/ream'

const APP_ROOT = new URL('../', import.meta.url)

new Ignitor(APP_ROOT, { port: 3000 })
  .tap((app) => {
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .useRcFile((await import('../reamrc.js')).default)
  .httpServer()
  .start()
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })
```

Une première route — le `routes.ts` de chaque module sous `app/modules/` est chargé au démarrage :

```typescript
// app/modules/home/routes.ts
import router from '@c9up/ream/services/router'

router.get('/', async ({ response }) => {
  response.send('Hello from Ream!')
})
```

## Configuration SWC

Créez `.swcrc` à la racine du projet pour les métadonnées de décorateurs :

```json
{
  "jsc": {
    "parser": { "syntax": "typescript", "decorators": true },
    "transform": { "legacyDecorator": true, "decoratorMetadata": true },
    "target": "es2022"
  },
  "module": { "type": "es6" }
}
```

## Configuration TypeScript

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true
  }
}
```

## Scripts du paquet

```json
{
  "scripts": {
    "dev": "node --import @swc-node/register/esm-register --watch bin/server.ts",
    "start": "node --import @swc-node/register/esm-register bin/server.ts",
    "build": "tsc",
    "test": "ream test"
  }
}
```

## Lancer

```bash
pnpm dev
```

## Étapes suivantes

- [Démarrage rapide](/fr/guide/quick-start) — Construire une API en 5 minutes
- [Structure du projet](/fr/guide/folder-structure) — Comprendre l'organisation du projet
