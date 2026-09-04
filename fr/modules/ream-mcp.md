# Ream MCP — le serveur pour les agents

`@c9up/ream-mcp` est le serveur Model Context Protocol de Ream. Il transforme un projet en espace de travail lisible par un agent : un LLM interroge une documentation ancrée, inspecte le projet vivant, génère du code et navigue la traçabilité, au lieu de charger des centaines de fichiers dans son contexte.

## Installation

```sh
npx @c9up/ream-mcp        # lance le serveur stdio
```

Le serveur détecte la racine du projet en remontant depuis le répertoire courant, dans cet ordre :

1. `reamrc.ts` — le nom de configuration canonique
2. `ream.config.ts` — l'ancien alias
3. un `package.json` qui mentionne `@c9up/ream` dans ses dépendances

`REAM_PROJECT_ROOT=/chemin/du/projet` force la racine.

## Les outils

Appelez `tools/list` pour les descripteurs faisant foi — ils suivent le paquet. Les catégories actuelles :

| Catégorie | Ce qu'elle expose |
|---|---|
| `docs` | documentation ancrée + recherche hybride sur la doc de Ream |
| `introspect` | routes, providers, services décorés |
| `generate` | contrôleurs, entités, providers, modules… |
| `migrations` | statut, exécution, retour en arrière |
| `security` | contrôles de la surface de sécurité |
| `doctor` | santé de l'environnement |
| `inker` | aides du moteur de templates |
| `station` | outillage du panneau d'administration |
| `scheduler` | inspection des tâches planifiées |
| `bmad` | aides du flux BMAD |

## Architecture

TypeScript + Rust via NAPI, comme [Atom](/fr/modules/atom) et les événements du core :

```
packages/ream-mcp/
├── src/                    serveur TS + utilitaires
├── crates/
│   ├── ream-mcp-core/      logique métier, Rust pur
│   └── ream-mcp-napi/      liaisons #[napi], minces
└── scripts/copy-napi.mjs   cargo cdylib → copie du .node
```

**Un serveur MCP en stdio ne doit jamais écrire sur `stdout`** : cela corromprait le flux JSON-RPC. Toute l'observabilité passe par `stderr`, et tout outil ajouté ici hérite de cette contrainte.

## Générer du code

Les outils `generate` délèguent à [ream-cli](/fr/modules/ream-cli) et lui rendent sa sortie JSON telle quelle. Ils proposent d'abord (`plannedFiles`) et n'écrivent qu'après confirmation, pour qu'un agent puisse montrer ce qu'il s'apprête à faire avant de le faire.
