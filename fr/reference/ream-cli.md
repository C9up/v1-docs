# ream-cli

`@c9up/ream-cli` : le binaire `ream`, écrit en Rust : il crée les projets, installe et configure les paquets, lance le serveur de développement, construit, teste, et transmet toute autre commande à la console de l'application. Guide : [Introduction](/fr/guides/command-line/introduction).

## Installation

```bash
npm install -g @c9up/ream-cli
```

Le paquet fournit le binaire natif `ream` ; il démarre sans lancer Node.js et ne lance Node que pour les commandes qui exécutent le projet.

## Points d'entrée

| Commande | Description |
|---|---|
| `ream new` | Crée un nouveau projet. |
| `ream template` | Installe un modèle de projet en clonant son dépôt. |
| `ream add` | Installe des paquets et exécute leurs hooks `configure()`. |
| `ream configure` | Exécute le hook `configure()` d'un paquet. |
| `ream dev` | Lance le serveur de développement. |
| `ream start` | Lance le serveur de production. |
| `ream build` | Compile le TypeScript dans `dist/`. |
| `ream test` | Lance les suites de tests déclarées dans `reamrc.ts`. |
| `ream repl` | Ouvre un shell interactif avec l'application démarrée. |
| `ream inspect` | Affiche les routes, les providers et les liaisons du conteneur. |
| `ream list` | Liste toutes les commandes : celles du binaire et celles de l'application. |
| `ream mcp` | Gère l'inscription du serveur MCP dans `.mcp.json`. |
| `ream generate:key` | Écrit une nouvelle `APP_KEY` dans `.env`. |
| `ream doctor` | Vérifie la santé de l'environnement. |
| `ream info` | Affiche les informations de version. |
| `ream android:build` | Construit l'APK ou l'AAB Android de l'app. |
| `ream android:run` | Construit, installe et lance l'app sur un appareil Android. |
| `ream android:publish` | Publie le JS de l'app comme mise à jour à distance signée. |
| `ream generate:update-key` | Génère la paire de clés qui signe les mises à jour à distance. |
| `ream css:compile` | Compile une feuille de style Tailwind en table de styles que lit orbit sur un téléphone. |
| `ream <autre>` | Tout autre nom exécute la commande de console de l'application du même nom, drapeaux intacts (`ream make:controller`, `ream migration:run`, `ream provision --email x`). |

`ream`, `ream --help` et `ream help` affichent la liste des commandes. `ream <commande> --help` affiche la page de cette commande.

## Commandes

Drapeaux globaux, acceptés par toutes les commandes :

| Drapeau | Description |
|---|---|
| `--ansi` | Force la couleur même quand stdout n'est pas un terminal (pose `FORCE_COLOR=1`). |
| `--no-ansi` | Désactive la couleur (pose `NO_COLOR=1`). |
| `--version`, `-V` | Affiche la version. |

Une application peut redéfinir `dev`, `start`, `build`, `test`, `inspect`, `repl` et `list` par une commande de console du même nom ; `ream` exécute alors la commande de l'application avec les arguments d'origine. Les autres commandes ne peuvent pas être redéfinies.

### `ream new`

```sh
ream new <destination> [--template <name>] [--db <name>] [-y] [--pkg <name>] [--git-init]
```

| Argument / drapeau | Description |
|---|---|
| `destination` | Un nom ou un chemin quelconque (`apps/api`, `.`) ; le paquet prend le nom de son dernier dossier. Un dossier existant doit être vide. |
| `--template` | `api`, `web`, `microservice` ou `slim` ; saute la question. |
| `--db` | `postgres` ou `sqlite` ; saute la question. |
| `--yes`, `-y` | Prend la valeur par défaut (`api`, `postgres`) pour tout ce qui n'est pas passé en drapeau ; aucun terminal requis. |
| `--pkg` | Le gestionnaire de paquets qui installe le projet : `pnpm`, `npm` ou `yarn`. Par défaut celui qui a lancé `ream`, sinon `pnpm`. |
| `--git-init` | Initialise un dépôt git dans le nouveau projet. |

Un nouveau projet ne liste pas `reflect-metadata` : `@c9up/ream` en dépend et le charge. Depuis ream-cli 0.3.23, `ream test`, `ream repl`, `ream inspect` et `ream <commande>` le chargent aussi via `@c9up/ream`. Une version plus ancienne de ream-cli l'importe depuis le projet : un projet sans la dépendance échoue alors sur ces commandes, jusqu'à la mise à jour de la CLI.

Ce que les templates `api` et `web` montent dans `start/kernel.ts` :

- `api` : au niveau serveur, un middleware de mesure du temps et `@c9up/blackhole/server_middleware` ; au niveau routeur, le body parser et `@c9up/blackhole/middleware`. `config/blackhole.ts` active `X-Frame-Options: DENY`, HSTS et `X-Content-Type-Options: nosniff`. Il désactive le CSRF et la politique de sécurité du contenu (une API s'authentifie par jeton et ne sert pas de HTML). Sa politique CORS n'autorise aucune origine tant que vous n'en listez pas dans `cors.origin`.
- `web` : au niveau serveur, `@c9up/blackhole/server_middleware` ; au niveau routeur, le body parser, la session, `@c9up/blackhole/middleware` (CSRF signé) et `@c9up/warden/silent-auth`. L'authentification silencieuse lit qui est connecté et ne refuse personne. Le middleware qui refuse est `app/middleware/auth_middleware.ts`, inscrit comme middleware nommé `auth` : attachez-le avec `.use(middleware.auth())`, ou chaînez `.guard('session')` sur la route.

La moitié serveur de blackhole s'exécute pour chaque requête : une réponse à un chemin qu'aucune route ne connaît porte aussi les en-têtes de protection, et la limite de débit la compte.

Le `.gitignore` généré exclut de git `.env`, `.env.local`, `.env.*.local`, `robledo.key` et `*.keystore`. `.env.example` et les fichiers partagés `.env.<NODE_ENV>` restent committés.

### `ream template`

```sh
ream template <name> [destination]
```

Clone le dépôt d'un modèle. `destination` vaut par défaut le nom du modèle. Modèle disponible : `kitchen-sink`.

### `ream add`

```sh
ream add <packages...> [configure flags] [-D] [--force] [--package-manager <name>]
```

| Argument / drapeau | Description |
|---|---|
| `packages` | Les noms des paquets (`@c9up/atlas @c9up/warden`), puis les drapeaux de leurs hooks `configure()`. |
| `--dev`, `-D` | Installe en devDependencies. |
| `--force` | Passe `--force` à l'étape de configuration (écrase les fichiers de configuration existants). |
| `--package-manager` | `pnpm`, `npm` ou `yarn` au lieu de celui du lockfile. |

### `ream configure`

```sh
ream configure <package> [--force] [flags...]
```

Exécute le hook `configure()` que le paquet exporte depuis son point d'entrée ou son sous-chemin `./configure`. `--force` écrase les fichiers existants ; tout autre drapeau est transmis au hook. Échoue si le paquet n'est pas installé ou n'exporte pas de hook. Le module du paquet est chargé avec un délai de 10 secondes (`REAM_PROBE_TIMEOUT_SECS` le modifie) ; le hook lui-même s'exécute sans délai.

### `ream dev`

```sh
ream dev [--no-clear] [--no-assets] [--assets-args <arg>...]
```

Lance `bin/server.ts` avec `@c9up/ream/hot`, qui remplace un module modifié dans le processus en cours, avec la commande d'assets déclarée dans `reamrc.ts`, sous un seul Ctrl-C.

| Drapeau | Description |
|---|---|
| `--no-clear` | Garde les journaux précédents à l'écran après une modification. |
| `--no-assets` | Exclut la commande d'assets de cette exécution. |
| `--assets-args` | Un argument ajouté à la commande d'assets ; répétez-le pour en passer plusieurs. |

### `ream start`

Lance le serveur de production (lance `node`). Aucun argument.

### `ream build`

```sh
ream build [--ignore-ts-errors] [--tsconfig <path>] [--no-assets] [--assets-args <arg>...]
```

Exécute la commande d'assets, puis compile le TypeScript dans `dist/`.

| Drapeau | Description |
|---|---|
| `--ignore-ts-errors` | Garde la sortie et termine la construction quand TypeScript signale des erreurs. |
| `--tsconfig` | Le fichier tsconfig à utiliser (`tsconfig.json` par défaut). |
| `--no-assets`, `--assets-args` | Comme pour `ream dev`. |

### `ream test`

```sh
ream test [suites...] [flags]
```

Lance les suites du bloc `tests` de `reamrc.ts` par [`@c9up/helix-plugin-ream`](/fr/reference/helix-plugin-ream). Sans nom de suite, toutes les suites déclarées s'exécutent, dans l'ordre.

| Drapeau | Description |
|---|---|
| `--threads <n>` | Processus workers concurrents. |
| `--reporters <list>` | Reporters séparés par des virgules (`spec,json`). |
| `--bail` | S'arrête au premier échec. |
| `--files <file>` | Filtre par nom de fichier ; répétez-le pour en passer plusieurs. |
| `--tags <tag>` | Filtre par tag ; répétez-le pour en passer plusieurs. |
| `--groups <title>` | Filtre par titre de groupe parent ; répétez-le pour en passer plusieurs. |
| `--tests <title>` | Filtre par titre de test ; répétez-le pour en passer plusieurs. |
| `--timeout <ms>` | Délai par défaut de chaque test. |
| `--retries <n>` | Nombre de nouvelles tentatives par défaut de chaque test. |
| `--failed` | Ne lance que les tests en échec lors de la dernière exécution. |
| `--watch` | Relance les tests à chaque modification de fichier. |
| `--poll` | Avec `--watch` : détecte les modifications par interrogation périodique. |
| `--no-clear` | Avec `--watch` : garde la sortie précédente à l'écran. |
| `--coverage` | Collecte la couverture V8. |
| `--coverage-reporters <list>` | Reporters de couverture séparés par des virgules (`text-summary,lcov`). |
| `--coverage-dir <dir>` | Le dossier où écrire les rapports de couverture. |
| `--coverage-thresholds <json>` | Seuils en ligne, `{"lines":80,"functions":75}`. |
| `--coverage-include <globs>` | Globs à mesurer, séparés par des virgules, à la place de la structure de l'app. |
| `--coverage-exclude <globs>` | Globs à exclure, séparés par des virgules. |

### `ream repl`, `ream inspect`, `ream doctor`, `ream info`

Aucun argument. `repl` ouvre un REPL Node avec l'application démarrée ; `inspect` affiche les routes, les providers et les liaisons du conteneur ; `doctor` vérifie la santé de l'environnement ; `info` affiche les informations de version.

### `ream list`

```sh
ream list [namespaces...] [--json]
```

| Argument / drapeau | Description |
|---|---|
| `namespaces` | N'affiche que les commandes de ces espaces de noms (`make`, `db`, …). |
| `--json` | Produit du JSON au lieu du tableau groupé, avec les arguments et drapeaux de chaque commande. |

### `ream mcp`

```sh
ream mcp install | uninstall | status
```

| Sous-commande | Description |
|---|---|
| `install` | Inscrit `@c9up/ream-mcp` dans le `.mcp.json` du projet sous la forme `npx --no @c9up/ream-mcp`. |
| `uninstall` | Retire l'entrée. |
| `status` | Indique si le serveur est inscrit. |

`.mcp.json` vient avec le dépôt : `install` et `uninstall` le refusent s'il est un lien symbolique ou pas un fichier ordinaire, et n'écrivent rien.

### `ream generate:key`

```sh
ream generate:key [--force] [--show]
```

| Drapeau | Description |
|---|---|
| `--force` | Remplace une `APP_KEY` existante, ce qui invalide les cookies, les sessions et les URL signées. |
| `--show` | Affiche une clé au lieu de l'écrire dans `.env`. |

### `ream android:build`

```sh
ream android:build [--release] [--aab]
```

Construit à partir du bloc `mobile` de `reamrc.ts`. `--release` signe avec le keystore de l'app (une version de debug sinon) ; `--aab` construit un Android App Bundle pour le Play Store et implique `--release`.

Quand `mobile.updates` est défini, le build écrit `assets/ream-updates.json` pour `@c9up/robledo` : le serveur de mises à jour, la clé publique, la version native, `embeddedCreatedAt` (l'heure du build, en secondes : une mise à jour publiée avant est refusée) et `appId` (`mobile.id` : une mise à jour pour une autre app est refusée). Voir [Mises à jour à distance](/fr/guides/mobile/building#mises-a-jour-a-distance).

### `ream android:run`

```sh
ream android:run [--release] [--device <serial>]
```

Construit, installe et lance l'app. Une version de debug charge son JS depuis Metro, que la commande sert. `--release` construit une version signée sans Metro ; `--device` choisit un appareil par son numéro de série `adb devices` quand plusieurs sont branchés.

### `ream android:publish`

```sh
ream android:publish [--key <file>]
```

Empaquette, signe et publie le JS de l'app comme mise à jour à distance (`@c9up/robledo`) pour son runtime natif actuel. La clé de signature vient de `REAM_UPDATES_KEY`, sinon de `--key` (`robledo.key` par défaut). Le manifeste signé porte `createdAt` (l'heure de publication, en secondes) et `appId` (`mobile.id`), que les apps installées vérifient.

### `ream generate:update-key`

```sh
ream generate:update-key [--out <file>] [--force]
```

Génère la paire de clés Ed25519 qui signe les mises à jour. `--out` désigne le fichier de la clé privée (`robledo.key` par défaut) ; `--force` remplace une clé existante, après quoi les apps installées refusent les mises à jour jusqu'à leur reconstruction.

Le fichier de la clé privée n'est lisible que par vous (`0600`), y compris quand `--force` remplace un fichier que d'autres pouvaient lire. Une destination qui est un lien symbolique ou pas un fichier ordinaire est refusée, et rien n'est écrit : un dépôt cloné décide de ce qu'est `robledo.key`, et un lien mettrait la clé là où il pointe.

### `ream css:compile`

```sh
ream css:compile <input> [--out <file>]
```

Lit le CSS compilé par Tailwind et écrit la table de styles JSON que lit orbit, dans `--out` (`-o`) ou sur stdout.

## Configuration

| Variable | Description |
|---|---|
| `FORCE_COLOR`, `NO_COLOR` | La couleur, telle que la posent `--ansi` / `--no-ansi` ; transmise au côté Node. |
| `REAM_PROBE_TIMEOUT_SECS` | Les secondes pendant lesquelles `ream configure` / `ream add` attendent le chargement du module d'un paquet (10 par défaut). |
| `REAM_UPDATES_KEY` | La clé de signature de `ream android:publish`. |

## Migration

- Une nouvelle app `web` monte `@c9up/warden/silent-auth` sur chaque route, et `app/middleware/auth_middleware.ts` est désormais le middleware qui refuse une requête sans utilisateur connecté, inscrit comme middleware nommé `auth`. Dans une app créée par un `ream new` plus ancien, le `AuthMiddleware` global ne refusait personne, et `.guard('session')` répondait 401 à tout le monde, connecté ou non. Remplacez `() => import('#middleware/auth_middleware.js')` dans `router.use([...])` par `() => import('@c9up/warden/silent-auth')`, et protégez chaque route avec `.guard('session')` ou avec le middleware nommé `auth`.
- Les templates `web` et `api` montent `@c9up/blackhole/server_middleware` au niveau serveur. Dans une app créée par un `ream new` plus ancien, ajoutez `server.use([() => import('@c9up/blackhole/server_middleware')])` à `start/kernel.ts` (pour `api`, ajoutez aussi `@c9up/blackhole` aux dépendances, son provider à `reamrc.ts`, `@c9up/blackhole/middleware` après le body parser, et un `config/blackhole.ts`).
- `ream generate:update-key` et `ream mcp install` / `uninstall` refusent une destination qui est un lien symbolique. Remplacez le lien par un fichier ordinaire.
- `ream generate:update-key --force` met le fichier de la clé en `0600`.
- L'activité Android générée par `ream android:*` ne passe plus les extras de l'intent de lancement au composant racine : `run()` ne reçoit plus de props de lancement. N'importe quelle app du téléphone peut démarrer la vôtre avec les extras de son choix : n'y lisez donc ni écran, ni adresse, ni option.
- `ream android:build` inscrit `embeddedCreatedAt` et `appId` dans l'app, et `ream android:publish` signe `appId` dans chaque mise à jour. Une app construite par une version plus ancienne n'a ni l'un ni l'autre. Une version du store n'y remplace donc pas une mise à jour à distance plus ancienne, et une mise à jour signée avec la même clé pour une autre app est acceptée. Reconstruisez l'app et publiez-la sur le store. Publiez ensuite ses mises à jour avec cette version seulement : l'app reconstruite refuse une mise à jour sans `appId`.

## Publication

Pour les mainteneurs de ream-cli. La publication est manuelle : Actions, `ream-cli-ci`, Run workflow, sur le dépôt ream-cli, avec le tag de version choisi comme ref. Pousser un tag seul ne publie rien.

```bash
# 1) Passez version = "X.Y.Z" dans packages/ream-cli/Cargo.toml et committez
git commit -am "release: ream-cli vX.Y.Z"
# 2) Taguez le commit de version une fois sur main
git tag -a vX.Y.Z -m "ream-cli vX.Y.Z"
git push origin vX.Y.Z
# 3) Lancez ream-cli-ci depuis l'interface Actions avec le tag vX.Y.Z comme ref
```

Une nouvelle sous-commande ou une nouvelle surface publique est une version mineure ; un correctif sans changement de surface est un patch ; une refonte interne ne demande pas de nouvelle version.

Le contrôle de dérive compare `Cargo.toml` à npm. Une version supérieure est publiée sous `latest`. Une version égale est refusée : npm n'accepte jamais deux fois la même version, montez-la donc. Une version inférieure est refusée, sauf si l'entrée `confirm_overwrite` vaut littéralement `YES` ; elle est alors publiée sous le dist-tag `backport`, si bien que `latest` ne bouge pas. Tout autre échec (pas de tag sur HEAD, tag et `Cargo.toml` en désaccord, registre injoignable) arrête l'exécution, sans dérogation possible.

## Voir aussi

- [La ligne de commande](/fr/guides/command-line/introduction)
- [Serveur de développement](/fr/guides/command-line/dev-server)
- [Lancer et tester](/fr/guides/command-line/running-and-testing)
- [Générateurs](/fr/guides/command-line/generators)
- [Clés et intégrations](/fr/guides/command-line/keys)
- [Construire l'app](/fr/guides/mobile/building)
- [ream](/fr/reference/ream)
- [ream-mcp](/fr/reference/ream-mcp)
- [helix-plugin-ream](/fr/reference/helix-plugin-ream)
