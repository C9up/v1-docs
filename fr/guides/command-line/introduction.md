# Introduction

Ce guide couvre la ligne de commande ream :

- Installation
- Gestion de projet
- Configuration de paquets
- Diagnostics
- Construit en Rust
- Capacités
- Exemple
- Templates
- Notes

Outil en ligne de commande Rust natif pour le framework Ream. Démarrage instantané (<10 ms), pas de pénalité de boot Node.js.

## Installation

```bash
npm install -g @c9up/ream-cli
```

## Gestion de projet

```bash
ream new my-app           # Créer un nouveau projet (interactif)
ream new my-app --yes     # …en prenant les défauts, sans terminal
ream dev                   # Demarrer le serveur de dev
ream build                 # Compiler TypeScript
ream start                 # Lancer en production
```

## Configuration de paquets

> Pour installer le paquet en même temps, voir [Ajouter un paquet](/fr/guides/command-line/generators#ajouter-un-paquet).

```bash
ream configure @c9up/atlas
ream configure @c9up/warden
ream configure @c9up/photon
ream configure @c9up/some-pkg --transports=smtp  # transmettre des drapeaux à configure()
```

> **Tailwind ?** Tailwind n'est pas un package géré par Ream. Installez-le directement dans votre stack Vite : `pnpm add -D tailwindcss @tailwindcss/vite`, puis ajoutez `tailwindcss()` aux plugins de votre `vite.config.ts`. Recette complète : `/fr/guides/frontend/tailwind`.

## Diagnostics

```bash
ream doctor    # Vérification de l'environnement
ream info      # Version + infos environnement
```

`ream doctor` vérifie Node, pnpm, `.env`, `reamrc.ts`, `package.json`,
`tsconfig.json` — et `@swc-node/register`.

Ce dernier compte plus qu'il n'en a l'air. `ream dev`, `build`, `console`,
`test`, `inspect`, `repl`, `migration:*` et `schedule:*` font tous passer votre
TypeScript par ce chargeur, résolu depuis les `node_modules` de **votre** projet :
le CLI est un binaire Rust et n'embarque aucune dépendance JavaScript. Sans lui
ces commandes s'arrêtent alors que les générateurs continuent de marcher — un
projet peut donc paraître sain pendant que les deux tiers du CLI sont
inutilisables.

`ream new` l'inscrit dans le `package.json` généré. Pour un projet créé avant,
`doctor` nomme le correctif, et chaque commande concernée refuse en amont plutôt
que de mourir sur un `ERR_MODULE_NOT_FOUND` de Node :

```
[XX] @swc-node/register: missing — `ream dev`, `build`, `console`, `test`,
     `inspect`, `repl`, `migration:*` and `schedule:*` cannot run
     Fix: Run `pnpm add -D @swc-node/register`
```

Déclaré dans `package.json` mais absent de `node_modules`, c'est une autre
phrase — le manifeste est juste, c'est l'arbre qui est périmé, donc il dit
`pnpm install` et non `pnpm add`.

## Construit en Rust

Le binaire `ream` est un exécutable Rust compilé. La génération de code, la création de projet, la configuration et les diagnostics tournent en Rust pur, sans surcharge Node.js. Seuls `ream dev`, `ream start`, `ream build`, `ream test`, `ream repl`, `ream inspect` et la répartition vers les commandes de l'application lancent un processus Node.js.

Taille du binaire : ~700KB.

`@c9up/ream-cli` est la CLI native (Rust) de l'écosystème.

## Capacités

- création de projet (`new`, `template`)
- dev/build/start/test, et un `repl` avec l'application démarrée
- les commandes de l'application : tout nom que le binaire ne définit pas est
  transmis à son noyau console, et `list` montre les deux ensembles comme un
  seul. Les générateurs `make:*` et `eject` passent aussi par là — ce sont des
  commandes de `@c9up/ream`, pas de ce binaire
- diagnostics (`doctor`, `info`, `inspect`)
- installation de paquets (`add`, `configure`), génération de clé
  (`generate:key`), enregistrement MCP (`mcp`)

## Exemple

```bash
ream new my-app
ream dev
ream make:controller order Order
ream doctor
```

## Templates

`ream new` demande un template. `web` et `api` diffèrent désormais réellement :

- **`api`** — minimal : point d'entrée serveur, une route racine, un kernel de timing. Pas d'auth.
- **`web`** — le squelette api plus un kit d'auth session/cookie pré-câblé. Une app `web` fraîche démarre authentifiée par cookie d'emblée :
  - un kernel enchaînant body parser → `SessionMiddleware` cookie → blackhole (CSRF signé + en-têtes de sécurité) → middleware d'auth. L'ordre est porteur : blackhole passe après le body parser parce qu'un formulaire envoie son token CSRF dans le corps, et après la session parce que le token lui est lié (avec une config de session, blackhole avant la session refuse chaque requête avec `E_BLACKHOLE_SESSION_NOT_READY`) ; la session passe avant l'auth pour que `ctx.session` soit peuplé quand le guard session résout l'utilisateur ;
  - `config/auth.ts` par défaut sur la stratégie session (`defaultStrategy: 'session'`, avec un `findUser` en stub TODO) ;
  - `config/blackhole.ts` avec le CSRF signé activé (`secret` lu depuis `APP_KEY`) ;
  - `app/middleware/auth_middleware.ts` qui peuple `ctx.auth` depuis `ctx.session` ;
  - les providers reamrc sigil + warden + blackhole ;
  - une `APP_KEY` fraîchement générée dans `.env` — chaque app créée reçoit la sienne, jamais un placeholder partagé — et un alias d'import `#middleware/*`.
- **`microservice`** / **`slim`** — légers, sans kit HTTP d'auth.

## Notes

- démarrage très rapide (binaire natif)
- la surface complète et toujours à jour est `ream --help` ; la référence est
  [la page CLI](/fr/guides/command-line/introduction)
