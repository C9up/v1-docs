# Ream MCP — le serveur pour les agents

`@c9up/ream-mcp` est le serveur Model Context Protocol de Ream. Il transforme un projet en espace de travail lisible par un agent : un LLM interroge une documentation ancrée, inspecte le projet vivant, génère du code et navigue la traçabilité, au lieu de charger des centaines de fichiers dans son contexte.

## Installation

```sh
npx --no @c9up/ream-mcp   # lance le serveur stdio
```

Le serveur détecte la racine du projet en remontant depuis le répertoire courant, dans cet ordre :

1. `reamrc.ts` — le nom de configuration canonique
2. `ream.config.ts` — l'ancien alias
3. un `package.json` qui mentionne `@c9up/ream` dans ses dépendances

`REAM_PROJECT_ROOT=/chemin/du/projet` force la racine.

`ream mcp install` l'enregistre dans le `.mcp.json` du projet, un fichier fait
pour être commité : l'entrée est donc la même sur chaque machine,
`npx --no @c9up/ream-mcp`, sans chemin absolu. `--no` lance la version que le
lockfile du projet fixe et n'en télécharge jamais : ajoutez d'abord le serveur
en dépendance.

```sh
ream add -D @c9up/ream-mcp
ream mcp install
```

## Les outils

Appelez `tools/list` pour les descripteurs faisant foi — ils suivent le paquet. Les catégories actuelles :

| Catégorie | Ce qu'elle expose |
|---|---|
| `docs` | documentation ancrée + recherche hybride sur la doc du projet (voir plus bas) |
| `introspect` | routes, providers, services décorés |
| `generate` | contrôleurs, entités, providers, modules… |
| `migrations` | statut, exécution, retour en arrière |
| `security` | contrôles de la surface de sécurité |
| `doctor` | santé de l'environnement |
| `inker` | aides du moteur de templates |
| `station` | outillage du panneau d'administration |
| `scheduler` | inspection des tâches planifiées |
| `bmad` | aides du flux BMAD |

## Le corpus de documentation

Les outils `docs` indexent un ensemble fixe de fichiers, et rien d'autre : le
`README.md` racine, `docs/**/*.md`, `packages/<nom>/README.md` et
`packages/<nom>/CORRECTIONS.md`, et `_bmad-output/planning-artifacts/**/*.md`.
Le Markdown situé ailleurs — ce que les utilisateurs d'une application déposent
dans `storage/`, une note dans `tmp/` — n'arrive jamais à l'agent comme de la
documentation.

## Écritures de migration

`migration.run` et `migration.rollback` prévisualisent par défaut. Une
exécution réelle (`dryRun: false, confirm: true`) est refusée tant que
l'utilisateur ne l'a pas autorisée au lancement du serveur : le modèle qui
appelle un outil écrit tous ses arguments, donc aucun argument ne le peut.

| Variable au lancement | Autorise |
|---|---|
| `REAM_MCP_ALLOW_MIGRATIONS=1` | l'écriture sur une base locale : un fichier sqlite dans le projet, ou un serveur en boucle locale / socket unix |
| `REAM_MCP_ALLOW_PRODUCTION_MIGRATIONS=1`, en plus de la précédente | l'écriture en production : `REAM_ENV` / `NODE_ENV` vaut `production`, ou l'URL de la base désigne autre chose qu'une cible locale prouvée |

Elles se posent dans le bloc `env` de l'entrée du serveur dans `.mcp.json` :

```json
{
  "mcpServers": {
    "ream": {
      "command": "npx",
      "args": ["--no", "@c9up/ream-mcp"],
      "env": { "REAM_MCP_ALLOW_MIGRATIONS": "1" }
    }
  }
}
```

La prévisualisation n'est pas sans effet non plus : pour obtenir le SQL, elle
importe chaque module de migration et exécute son `up()` / `down()` dans le
serveur, donc elle exécute du code du projet.

## Erreurs

Un nom d'outil inconnu est une erreur JSON-RPC (`-32602`). Un outil qui
s'exécute et échoue — y compris chaque refus structuré (`{ error, hint }`) —
renvoie un résultat avec `isError: true`. Les messages ne portent ni pile
d'appels ni chemin absolu ; le détail complet part sur le `stderr` du serveur.

Chaque outil déclare aussi ses annotations MCP (`readOnlyHint`,
`destructiveHint`) : un client peut demander confirmation avant les appels qui
écrivent et laisser passer ceux en lecture seule.

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
