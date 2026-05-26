# Installation

## Prérequis

- **Node.js 22+** (LTS) — requis pour le support `require(esm)` et la stabilité NAPI
- **pnpm** — gestionnaire de paquets recommandé (npm/yarn fonctionnent aussi)
- Pas besoin de toolchain Rust — les binaires NAPI sont précompilés

## Créer un nouveau projet

```bash
npm init ream@latest my-app
cd my-app
pnpm install
```

Le scaffold pose deux questions :

1. **Template** — `api` (backend API), `web` (full-stack), `microservice` (event-driven), `slim` (minimum)
2. **Base de données** — `PostgreSQL` ou `SQLite`

## Installation manuelle

Si vous préférez configurer manuellement :

```bash
mkdir my-app && cd my-app
pnpm init
pnpm add @c9up/ream
```

Créez le point d'entrée :

```typescript
// app.ts
import { Ignitor } from '@c9up/ream'

const app = new Ignitor({ port: 3000 })
  .httpServer()
  .routes((router) => {
    router.get('/', async (ctx) => {
      ctx.response!.body = 'Hello from Ream!'
    })
  })

await app.start()
```

Lancez-le :

```bash
npx tsx app.ts
```

## Ajouter des modules

Chaque module est un package npm indépendant avec son propre [dépôt](https://github.com/C9up). Ajoutez seulement ce dont vous avez besoin :

```bash
# Event bus
pnpm add @c9up/pulsar

# ORM
pnpm add @c9up/atlas

# Validation
pnpm add @c9up/rune

# Authentification
pnpm add @c9up/warden

# Logging
pnpm add @c9up/spectrum
```

::: tip Configuration automatique
Apres avoir installe un module, lancez `ream configure` pour configurer automatiquement son provider, son fichier de configuration et ses variables d'environnement :

```bash
pnpm add @c9up/atlas
ream configure @c9up/atlas  # auto-setup : config, env, provider
```

Voir [ream CLI](/fr/cli/ream) pour plus de details.
:::

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

## Convention de publication source-first

Les paquets Ream publient leur source TypeScript (`src/**/*.ts`) directement — ils ne livrent PAS un dossier `dist/` pré-construit. Votre projet les compile via `@swc-node/register` (déjà requis pour les métadonnées de décorateurs, voir [Prérequis](#prérequis)).

Il s'agit d'une convention délibérée du framework. Elle garde les stack traces en production pointant sur de vrais numéros de lignes du code source, évite une classe de bugs où un `dist/` publié dérive de sa source, et vous permet de patcher une dépendance sur place pendant le développement en éditant les fichiers dans `node_modules/@c9up/<pkg>/src/`. La contrepartie : les consommateurs paient le coût de compilation SWC ; en pratique c'est négligeable car `@swc-node/register` met en cache et les projets utilisant des décorateurs paient déjà ce coût.

La seule exception est `@c9up/ream-mcp`, qui publie un `dist/` construit car c'est un outil de développement lancé hors du contexte d'exécution du framework — ses consommateurs (agents d'éditeur, clients MCP) ne tournent pas sous `@swc-node/register` et ont besoin d'un artefact autonome.

## Configuration TypeScript

Ream requiert le mode strict TypeScript et les décorateurs expérimentaux :

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Compatibilité Bun

Ream cible Node.js 22+ comme runtime principal. Bun est supporté au mieux via sa couche de compatibilité NAPI. La plupart des fonctionnalités marchent, mais certains cas limites peuvent différer.

## Étapes suivantes

- [Démarrage rapide](/fr/guide/quick-start) — Construire une API en 5 minutes
- [Structure du projet](/fr/guide/folder-structure) — Comprendre l'organisation du projet
