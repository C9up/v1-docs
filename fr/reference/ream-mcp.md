# ream-mcp

`@c9up/ream-mcp` : un serveur Model Context Protocol sur stdio qui permet à un agent de code de chercher dans la documentation du projet, d'inspecter ses routes et ses providers, de générer du code, de lancer les migrations et de rechercher des failles de sécurité. Guide : [Agents IA (MCP)](/fr/guides/digging-deeper/mcp).

## Installation

```bash
pnpm add -D @c9up/ream-mcp
ream mcp install
```

`ream mcp install` inscrit le serveur dans le `.mcp.json` du projet sous la forme `npx --no @c9up/ream-mcp`, qui lance la version qu'épingle le lockfile et n'en télécharge jamais. `@c9up/atlas` est une dépendance pair optionnelle, requise par les outils de migration et par `generate.migration` / `generate.seeder`.

Le moteur natif du serveur est livré dans un petit paquet par plateforme, `@c9up/ream-mcp-<plateforme>`, pour linux x64 et arm64 (glibc), macOS x64 et arm64, et Windows x64. `@c9up/ream-mcp` les déclare en dépendances optionnelles, et votre gestionnaire de paquets installe seulement celui de votre machine. Vous n'avez pas besoin de toolchain Rust. N'installez pas avec les dépendances optionnelles désactivées (`--no-optional`, `--omit=optional`) : le moteur serait absent. Sans le moteur, le serveur s'arrête sur `E_REAM_MCP_NATIVE_LOAD_FAILED`, et son message nomme le paquet à installer, par exemple `@c9up/ream-mcp-linux-x64-gnu`.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/ream-mcp` | Démarre le serveur stdio quand il est importé ou exécuté. N'exporte rien. |
| `@c9up/ream-mcp/napi` | `core` : l'indexeur et le moteur de recherche natifs. |
| `@c9up/ream-mcp/util/project-root` | `detectProjectRoot()` et ses types. |
| `@c9up/ream-mcp/errors` | Les erreurs du paquet, une classe par code. L'importer ne démarre pas le serveur. |

| Binaire | Description |
|---|---|
| `ream-mcp` | Le serveur MCP stdio. N'écrit rien sur stdout hormis le flux JSON-RPC ; les journaux vont sur stderr. |
| `ream-mcp-reindex` | Indexe le corpus de documentation : incrémental par défaut, `--full` supprime et reconstruit, `--download-model` télécharge le modèle d'embeddings puis sort. Sort avec 0 en cas de succès, 1 en cas d'échec. |

## Exports

### `@c9up/ream-mcp/util/project-root`

| Export | Nature | Description |
|---|---|---|
| `detectProjectRoot` | fonction | `detectProjectRoot(cwd?: string): ProjectRoot` : remonte depuis `cwd` (par défaut `process.cwd()`) jusqu'à la racine du projet. Lève une erreur s'il n'en trouve aucune. |
| `ProjectRoot` | interface | `{ path: string; source: ProjectRootSource }`. |
| `ProjectRootSource` | type | `"env" \| "reamrc.ts" \| "ream.config.ts" \| "package.json"`. |

La racine est, dans l'ordre : `REAM_PROJECT_ROOT`, puis le premier dossier qui contient `reamrc.ts`, `ream.config.ts`, ou un `package.json` qui dépend de `@c9up/ream`. Un dossier trouvé au-dessus du répertoire courant n'est accepté que s'il appartient à l'utilisateur courant et que ni le groupe ni les autres ne peuvent y écrire (la règle `safe.directory` de git, sous POSIX seulement) ; sinon `detectProjectRoot()` lève `E_REAM_MCP_PROJECT_ROOT_NOT_FOUND`, dont le message nomme le dossier refusé. Le répertoire courant et `REAM_PROJECT_ROOT` ne sont pas vérifiés. Un serveur enregistré pour l'utilisateur et lancé par `npx` présente le même risque au niveau de `npx`, qui remonte de la même façon : enregistrez-le par projet (`ream mcp install`).

### `@c9up/ream-mcp/errors`

| Export | Nature | Description |
|---|---|---|
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs) : `import * as errors from '@c9up/ream-mcp/errors'`. |

### `@c9up/ream-mcp/napi`

`core` (de type `ReamMcpCore`) porte les fonctions natives. Elles prennent la racine du projet et renvoient des chaînes JSON :

| Membre | Signature | Description |
|---|---|---|
| `version` | `version(): string` | La version du cœur natif. |
| `embeddingModel` | `embeddingModel(): string` | Le modèle épinglé : `{ name, repo, revision, dir, files: [{ path, url, sha256, bytes }] }`. |
| `indexCorpus` | `indexCorpus(root: string, full: boolean): Promise<string>` | Indexe hors du thread principal ; se résout en `{ files_seen, files_indexed, files_unchanged, files_skipped, chunks_total, elapsed_ms }`. |
| `search` | `search(root: string, query: string, optsJson: string): string` | Recherche hybride ; `""` pour les options par défaut. |
| `getChunk` | `getChunk(root: string, idOrTopic: string, byTopic: boolean): string \| null` | Un fragment par son id, ou le meilleur résultat BM25 sur son chemin de titres. |
| `trace` | `trace(root: string, requirementId: string): string` | Les sites `@implements` : `{ sites: [{ file, line }], truncated }`. |
| `auditDrift` | `auditDrift(root: string): string` | `[{ file, stored_mtime, current_mtime }]`. |

## Outils

`tools/list` renvoie tous les outils ci-dessous. Chacun porte des annotations MCP : les outils en lecture seule posent `readOnlyHint: true` ; les outils destructeurs posent `destructiveHint: true`, comme les deux outils `inker`, qui importent et exécutent le `@c9up/inker` du projet. Les arguments sont vérifiés contre le schéma avant l'exécution de l'outil ; chaque schéma pose `additionalProperties: false`.

### Documentation

| Outil | Arguments | Description |
|---|---|---|
| `docs.search` | `query: string` (obligatoire, `minLength: 1`) ; `package?: string` ; `type?: "Markdown" \| "Readme" \| "Adr" \| "Bmad" \| "Code"` ; `limit?: integer` (1 à 50, 10 par défaut) | Recherche hybride BM25 + cosinus dans la documentation indexée ; fragments classés avec fichier et ligne, et un niveau de confiance. |
| `docs.get` | `id?: string` ; `topic?: string` | Un fragment par son id, ou le meilleur résultat BM25 sur son chemin de titres quand `topic` est fourni. |
| `docs.explain` | `symbol?: string` ; `file?: string` | La déclaration et la signature d'un symbole, ou une recherche limitée aux fragments `Code`. |
| `docs.trace` | `requirement_id: string` (obligatoire, `minLength: 1`) | Les annotations `@implements` des sources du projet : implémentations, tests et manques pour un identifiant d'exigence. Les fichiers de plus de 256 Ko sont ignorés. |
| `docs.audit_drift` | aucun | Les fichiers suivis dont la source a changé après leur indexation. |

Le corpus comprend `README.md`, `docs/**/*.md`, `packages/<name>/README.md`, `CORRECTIONS.md` et `_bmad-output/planning-artifacts/**/*.md`. Il est indexé en arrière-plan au démarrage ; les outils de documentation l'attendent.

### Introspection

| Outil | Arguments | Description |
|---|---|---|
| `list.routes` | aucun | Toutes les routes, groupes aplatis, triées par méthode et chemin. |
| `list.entities` | aucun | Toutes les classes `@Entity` avec leurs colonnes, relations et hooks. |
| `list.events` | aucun | Les abonnés et émetteurs d'événements, groupés par nom d'événement. |
| `list.providers` | aucun | Toutes les classes `*Provider` avec leurs hooks de cycle de vie et leurs liaisons de conteneur. |
| `list.middleware` | aucun | Les middlewares HTTP dans l'ordre du pipeline. |
| `get.config` | `key?: string` (chemin pointé, `app.name`) | Une analyse statique de `config/*.ts`. Les lectures d'env apparaissent comme `{ env, default }`, les autres expressions comme `{ unevaluated, expression }`. |
| `scheduler.list_tasks` | aucun | Les appels `scheduler.register(name, cron, …)` et les décorateurs `@Schedule(cron)`, avec fichier, ligne et un score de confiance. |
| `station.list_resources` | aucun | Les appels `defineResource(...)` : nom, entité, actions, fichier et ligne. |

### Générateurs

Par défaut, tous les générateurs planifient sans écrire.

| Outil | Arguments | Écrit |
|---|---|---|
| `generate.module` | `module`, `name` (obligatoires) | Entité, contrôleur, validateur et migration sous `app/<module>/`. |
| `generate.controller` | `module`, `name` (obligatoires) | `app/<module>/<Name>Controller.ts` avec des méthodes CRUD vides. |
| `generate.entity` | `module`, `name` (obligatoires) | `app/<module>/<Name>.ts`, une classe `@Entity`. |
| `generate.validator` | `module`, `name` (obligatoires) | `app/<module>/<Name>Validator.ts`. |
| `generate.migration` | `name` (obligatoire) | Une migration par `make:migration` d'atlas, dans `migrations.paths` (`database/migrations` par défaut). |
| `generate.seeder` | `name` (obligatoire) | Un seeder par `make:seeder` d'atlas, dans `seeders.paths` (`database/seeders` par défaut). |

| Argument | Schéma | Description |
|---|---|---|
| `module` | `string`, motif `^[a-z][a-z0-9-]*$` | Dossier en kebab-case sous `app/`. |
| `name` | `string`, motif `^[A-Z][A-Za-z0-9]*$` | Nom de classe en PascalCase ; le nom d'une migration passe en snake_case dans le nom de fichier. |
| `dryRun` | `boolean`, `true` par défaut | Renvoie `plannedFiles[]` sans écrire. |
| `confirm` | `boolean`, `false` par défaut | Équivaut à `dryRun: false` : écrit les fichiers. |
| `force` | `boolean`, `false` par défaut | Autorise l'écrasement ; obligatoire quand un fichier prévu existe déjà. |

### Migrations

| Outil | Arguments | Description |
|---|---|---|
| `migration.status` | aucun | `{ applied: [{ id, name, ranAt }], pending: [{ id, name, file }], currentBatch }`. Ne crée jamais la table de suivi. |
| `migration.run` | `dryRun?: boolean` (`true` par défaut) ; `confirm?: boolean` (`false` par défaut) | Lance les migrations en attente ; un essai à blanc renvoie `{ wouldRun: [{ id, name, sql }] }`. |
| `migration.rollback` | `step?: integer` (1 au minimum, 1 par défaut) ; `dryRun?: boolean` (`true` par défaut) ; `confirm?: boolean` (`false` par défaut) | Annule les `step` derniers lots, plafonné au nombre appliqué ; un essai à blanc renvoie le SQL inverse. |

Un aperçu importe chaque module de migration et exécute son `up()` / `down()` dans le processus du serveur pour collecter le SQL : il exécute donc du code du projet. Une exécution réelle exige `dryRun: false` et `confirm: true`, et elle est refusée si le serveur n'a pas été lancé avec `REAM_MCP_ALLOW_MIGRATIONS=1`. Une cible de production (`REAM_ENV` ou `NODE_ENV` vaut `production`, ou une URL de base qui n'est ni un fichier sqlite dans le projet ni un serveur en loopback ou sur socket unix, jugée sur l'adresse que le pilote contacte : pour PostgreSQL le dernier `host` et le dernier `hostaddr` de l'URL, puis `PGHOST` et `PGHOSTADDR`, un `hostaddr` l'emportant sur l'hôte sauf si une socket est choisie ; pour MySQL l'hôte de l'URL ou son `socket`. Un paramètre que le pilote ignore (`socket` pour PostgreSQL, `host` pour MySQL) ne prouve rien, et une adresse qui n'est pas une IP n'est pas locale) exige en plus `REAM_MCP_ALLOW_PRODUCTION_MIGRATIONS=1`. Aucun argument d'outil ne peut activer l'écriture.

### Qualité et sécurité

| Outil | Arguments | Description |
|---|---|---|
| `quality.duplicates` | `minTokens?: integer` (1 au minimum, 20 par défaut) ; `minLines?: integer` (1 au minimum, 3 par défaut) | Les fragments dupliqués des sources TypeScript, identifiants anonymisés, littéraux conservés. |
| `quality.package_report` | `package?: string` (le nom d'un `package.json` du workspace) | Par paquet : fichiers, lignes de code, exports publics, erreurs d'analyse, dépendances circulaires, et la couverture de `coverage/coverage-summary.json`. Tous les paquets s'il est omis. |
| `quality.dep_graph` | `format?: "json" \| "dot"` (`json` par défaut) ; `scope?: "package" \| "file"` (`package` par défaut) | Le graphe des dépendances internes, avec ses cycles. |
| `security.scan` | `checks?: string[]`, chacun parmi `sql_interpolation`, `csrf_disabled`, `xss_html_raw_output`, `cookie_missing_flags`, `missing_guard_on_mutation_route`, `raw_error_not_reamerror` | Vérifications statiques du TypeScript et des templates `.inker` d'une application Ream ; `{ findings: [{ id, severity, check, file, line, excerpt, hint, docsUrl }], scanned: { files, templates, directories, skipped }, confidence, knownGaps }`. Les résultats sont triés par gravité puis fichier et ligne. `scanned` dit ce qui a été lu : les fichiers analysés, les templates lus, les dossiers de premier niveau d'où ils viennent et les dossiers laissés de côté. `knownGaps` liste ce qu'une vérification n'a pas pu trancher ou n'a rien trouvé à lire. `confidence` ne vaut `high` que si quelque chose a été lu et que `knownGaps` est vide. Les six s'exécutent quand `checks` est vide ou absent. Voir [Vérifications de sécurité](#verifications-de-securite). |

#### Vérifications de sécurité

L'analyse lit toute la racine du projet (`app/`, `start/`, `config/`, `providers/`, `bin/`, un dossier `src/`, les paquets qu'elle contient), et `resources/templates/**/*.inker`. `node_modules`, `dist`, `build`, `out`, `coverage`, `target`, `tmp`, `tests`, `test`, `__tests__`, `spec`, `e2e` et `fixtures` sont ignorés seulement au premier niveau de la racine et de chaque paquet (un dossier qui a un `package.json`) : plus bas, `app/modules/build/` est du code de l'application et il est lu. Les dossiers cachés et `node_modules` sont ignorés partout, et un dossier ignoré dans le code de l'application donne une entrée de `knownGaps`. Une vérification qui n'a rien à lire le dit dans `knownGaps` : `missing_guard_on_mutation_route` quand aucun fichier ne déclare de routes, `csrf_disabled` quand `@c9up/blackhole` est une dépendance et qu'aucune configuration blackhole n'a été lue. Deux verdicts dépendent de la version de ream, lue dans `node_modules/@c9up/ream/package.json`, sinon dans la plage de `package.json` : quand aucun des deux ne la donne, `knownGaps` le dit.

| Vérification | Gravité | Signale |
|---|---|---|
| `sql_interpolation` | high | Une valeur écrite dans le SQL de `rawQuery`, `raw`, `execute`, `query` ou d'une méthode `*Raw` d'atlas (`whereRaw`, `orderByRaw`…), par un `${}` ou un `+`, au lieu d'être passée en binding. |
| `csrf_disabled` | high | Une config blackhole qui coupe le CSRF : `csrf: false`, `csrf: { enabled: false }`, ou une entrée de `csrf.exceptRoutes` qui couvre tous les chemins (`'*'`, `'/*'`). Lue dans `defineConfig` importé de `@c9up/blackhole` ou de `@c9up/blackhole/config` (ce qu'écrit `ream new --template web`), dans l'export par défaut de `config/blackhole.ts`, dans `createBlackhole` et dans les adaptateurs Express, Fastify et Hono. Une valeur qui n'est pas littérale (`csrf: settings`, `enabled: flag`, un `exceptRoutes` fonction, une décomposition) part dans `knownGaps`. |
| `missing_guard_on_mutation_route` | high | Une route `post`, `put`, `patch`, `delete`, `any` ou `route()`, ou le `store` / `update` / `destroy` d'une ressource, que rien n'authentifie : ni `.guard()`, `.role()` ou `.permission()` qui nomme au moins un guard, un rôle ou une permission, ni middleware d'auth sur la route ou son `router.group()` (reconnu par son nom : `'auth'`, `middleware.auth()`, l'import différé d'un fichier `auth_middleware` ; `authorAudit` n'en est pas un), ni `@Guard`, `@Role` ou `@Permission` de warden qui nomme quelque chose sur l'action du contrôleur (lus à travers `extends`, comme warden les lit). Une garde qui ne nomme rien ne protège rien : ream la refuse au démarrage à partir de 0.2.32. Un `@RequireMfa()` seul compte à partir de ream 0.2.32, dont la garde de route répond 401 à une requête anonyme. Partent dans `knownGaps` : un contrôleur que l'analyse ne sait pas suivre, par exemple importé d'un paquet, des `guards` / `roles` / `permissions` / `middleware` de groupe qui ne sont pas une liste littérale, une garde qui décompose une liste illisible, et un `@RequireMfa()` seul quand la version de ream est inconnue. Une route publique exprès (connexion, webhook signé) est quand même listée. |
| `xss_html_raw_output` | medium | La sortie brute `{{{ }}}` d'inker dans un template, et `new SafeString(valeur)` ou `html.safe(valeur)` autour d'une valeur qui n'est ni un littéral ni un `html.escape(...)`. |
| `cookie_missing_flags` | low | Un `response.cookie()`, `plainCookie()` ou `encryptedCookie()` qui finit sans `Secure`, `SameSite` ou `HttpOnly`. À partir de ream 0.2.32, chaque cookie reçoit `Secure`, `SameSite=lax` et `HttpOnly` par défaut, réglés pour l'application sous `http.cookie` dans `config/app.ts` : un appel qui ne les donne pas convient, et `secure: false`, `sameSite: false`, `httpOnly: false` (ou `undefined`, qui retire la valeur par défaut) sur un appel, ou `false` dans `http.cookie`, est signalé. Avant 0.2.32, ream n'ajoute que `HttpOnly`, et un appel sans `secure` ou sans `sameSite` est signalé. |
| `raw_error_not_reamerror` | low | `new Error()` dans un contrôleur (un dossier `controllers/`, ou un fichier `*_controller.ts` / `*Controller.ts`) au lieu d'une erreur déclarée avec `createError()` ou comme une `Exception`. |

### Environnement et templates

| Outil | Arguments | Description |
|---|---|---|
| `doctor.health` | aucun | Les versions de Node et de Rust, les binaires NAPI construits et manquants, et la cohérence des versions des paquets. |
| `doctor.env_check` | aucun | Les variables d'env documentées (`set: bool`, valeurs jamais renvoyées) et les fichiers de configuration (`exists: bool`, avec une indication). |
| `inker.list_templates` | `root?: string` (`resources/templates` par défaut) ; `lint?: boolean` (`false` par défaut) | Tous les templates `.inker` ; avec `lint`, les erreurs d'analyse de chacun, données par le `@c9up/inker` du projet, importé et exécuté dans le processus du serveur. Un lint qui ne peut pas le charger en donne la raison dans `knownGaps`. |
| `inker.render_test` | `template: string` (obligatoire, `minLength: 1`) ; `data?: object` ; `root?: string` | Rend un template avec `data` par le `@c9up/inker` du projet, importé et exécuté dans le processus du serveur, avec les expressions du template ; sans les helpers d'exécution (`t`, `csrfField`, `url`, `asset` lèvent une erreur). Renvoie `{ html }`, ou `{ error: { code, message, line, column } }`. Un rendu est interrompu au bout de 5 secondes. |

### BMAD

| Outil | Arguments | Description |
|---|---|---|
| `bmad.locate` | aucun | La racine BMAD : `bmadRoot` dans `reamrc.ts`, `REAM_BMAD_ROOT`, `_bmad-output/`, `ream-legacy/_bmad-output/`, `.bmad/` ; la première qui existe, avec la trace des candidats. |
| `bmad.list_epics` | aucun | Tous les epics avec leurs stories, statut fusionné depuis `sprint-status.yaml`. |
| `bmad.get_story` | `id: string` (obligatoire, motif `^\d+\.\d+$`) | Le contenu complet d'une story. |
| `bmad.trace` | `requirement_id: string` (obligatoire, `minLength: 1`) | Les epics, stories, fichiers de code et de test qui citent l'identifiant (texte brut). |
| `bmad.gap_report` | aucun | Exigences sans story, stories sans code, stories sans test. |
| `bmad.next_story` | `epic?: string` | La première story qui n'est pas `done`. |
| `bmad.update_status` | `id: string` (obligatoire, motif `^[a-z0-9][a-z0-9-]+$`) ; `status` (obligatoire) : `backlog \| ready-for-dev \| in-progress \| review \| done` ; `dryRun?: boolean` (`true` par défaut) ; `confirm?: boolean` (`false` par défaut) | Change un statut dans `sprint-status.yaml` ; un essai à blanc renvoie le diff. Écrit de façon atomique. |

## Configuration

Le serveur lit son environnement au lancement ; posez ces variables dans le bloc `env` de son entrée `.mcp.json`.

| Variable | Défaut | Description |
|---|---|---|
| `REAM_PROJECT_ROOT` | détectée | La racine du projet, sans détection. |
| `REAM_MCP_ALLOW_MIGRATIONS` | désactivé | `1` autorise l'écriture des migrations sur une base locale. |
| `REAM_MCP_ALLOW_PRODUCTION_MIGRATIONS` | désactivé | `1`, avec la précédente, autorise l'écriture sur une base de production. |
| `REAM_MCP_EMBEDDINGS` | désactivé | `1` charge le modèle d'embeddings téléchargé ; sinon la recherche est BM25 seule. |
| `ORT_DYLIB_PATH` | | Chemin absolu de la bibliothèque ONNX Runtime (1.24 ou plus récente) ; obligatoire avec les embeddings. |
| `REAM_MCP_DISABLE_EMBEDDINGS` | désactivé | Force la désactivation des embeddings. |
| `REAM_DATABASE_URL`, `DATABASE_URL` | `reamrc.ts` | La base qu'utilisent les outils de migration, dans cet ordre. |
| `REAM_MIGRATIONS_DIR` | `database/migrations` | Le dossier des migrations. |
| `REAM_MIGRATIONS_TABLE` | depuis `config/database.ts`, sinon `ream_migrations` | La table de suivi des migrations. |
| `REAM_BMAD_ROOT` | | La racine BMAD, après le `bmadRoot` de `reamrc.ts`. |
| `REAM_BIN` | le `ream` du projet | Le binaire `ream` que lancent les générateurs ; ignoré hors de la racine du projet et du dossier temporaire. |
| `REAM_MCP_NO_SHELL` | désactivé | `1` refuse de lancer le binaire `ream`. |

Le serveur ne télécharge jamais le modèle : `ream-mcp-reindex --download-model` le récupère une fois, vérifie chaque fichier contre le SHA-256 épinglé dans le cœur natif, et supprime tout fichier qui ne correspond pas.

## Erreurs

Un nom d'outil inconnu est une erreur JSON-RPC (`-32602`). Un outil qui s'exécute et échoue, y compris un refus (`{ error, hint }`) et des arguments hors schéma (`{ error, problems }`), renvoie un résultat avec `isError: true` ; les messages ne portent ni pile d'appels ni chemin absolu. Chaque refus du serveur lui-même est une classe du namespace `errors` et une `Exception` de `@c9up/flare` de statut 500 : testez `error.code` ou `error instanceof errors.E_REAM_MCP_*`. Importer `@c9up/ream-mcp/napi` lève `E_REAM_MCP_UNSUPPORTED_PLATFORM` ou `E_REAM_MCP_NATIVE_LOAD_FAILED` quand le binaire natif ne peut pas être chargé. Son `core` lève les erreurs du binding, sans code ; le serveur les convertit en `E_REAM_MCP_INDEX_FAILED` ou `E_REAM_MCP_INVALID_JSON`.

| Code | Levée quand |
|---|---|
| [`E_INKER_RENDER_TIMEOUT`](/fr/reference/errors#e-inker-render-timeout) | `inker.render_test` a duré plus de 5 secondes. |
| [`E_INKER_UNKNOWN`](/fr/reference/errors#e-inker-unknown) | `inker.render_test` a échoué sans code inker. |
| [`E_INKER_PARSE_ERROR`](/fr/reference/errors#e-inker-parse-error) | `inker.list_templates` avec `lint` a rencontré une erreur de template sans code inker. |
| [`E_REAM_MCP_INVALID_ARGUMENT`](/fr/reference/errors#e-ream-mcp-invalid-argument) | Un outil ou une fonction a été appelé sans un argument requis (`docs.get`, `docs.explain`, une chaîne vide) ou avec un seuil de détection de doublons hors limites. |
| [`E_REAM_MCP_PROJECT_ROOT_NOT_FOUND`](/fr/reference/errors#e-ream-mcp-project-root-not-found) | Aucune racine de projet Ream n'a été trouvée en remontant depuis le répertoire courant, ou celle trouvée au-dessus appartient à un autre utilisateur ou est accessible en écriture au groupe ou aux autres ; définissez `REAM_PROJECT_ROOT`. |
| [`E_REAM_MCP_UNSUPPORTED_PLATFORM`](/fr/reference/errors#e-ream-mcp-unsupported-platform) | Import de `@c9up/ream-mcp/napi` sur une plateforme sans binaire natif (prises en charge : linux-x64, linux-arm64 sous glibc, darwin-x64, darwin-arm64, win32-x64). |
| [`E_REAM_MCP_NATIVE_LOAD_FAILED`](/fr/reference/errors#e-ream-mcp-native-load-failed) | Le binaire natif est absent ou ne se charge pas ; le message nomme le fichier ou le paquet de plateforme, le code d'erreur de Node et la correction (installer le paquet de plateforme, ou reconstruire une build locale cassée), `cause` est l'erreur de Node. |
| [`E_REAM_MCP_NATIVE_UNAVAILABLE`](/fr/reference/errors#e-ream-mcp-native-unavailable) | Le cœur natif n'a pas donné de version au démarrage : le binaire est absent ou incompatible. |
| [`E_REAM_MCP_NATIVE_MISMATCH`](/fr/reference/errors#e-ream-mcp-native-mismatch) | Le cœur natif a répondu quelque chose que le serveur n'attend pas (trace, statistiques d'index, manifeste du modèle) : le binaire est périmé ou d'une autre version. |
| [`E_REAM_MCP_PATH_ESCAPE`](/fr/reference/errors#e-ream-mcp-path-escape) | Un nom de fichier de migration ou un chemin de fichier du modèle sort de son répertoire. |
| [`E_REAM_MCP_INVALID_MIGRATION`](/fr/reference/errors#e-ream-mcp-invalid-migration) | L'export par défaut d'une migration n'est pas une classe de migration, ou son `getDownSQL()` ne renvoie pas une liste de chaînes. |
| [`E_REAM_MCP_MODEL_DOWNLOAD_FAILED`](/fr/reference/errors#e-ream-mcp-model-download-failed) | Le téléchargement d'un fichier du modèle d'embeddings a répondu une erreur HTTP ou aucun corps. |
| [`E_REAM_MCP_MODEL_INTEGRITY`](/fr/reference/errors#e-ream-mcp-model-integrity) | Un fichier du modèle téléchargé ne correspond pas à sa taille ou à son SHA-256 épinglés ; rien n'est conservé. |
| [`E_REAM_MCP_SHELL_DISALLOWED`](/fr/reference/errors#e-ream-mcp-shell-disallowed) | `REAM_MCP_NO_SHELL=1` interdit de lancer le binaire `ream`. |
| [`E_REAM_MCP_CLI_NOT_FOUND`](/fr/reference/errors#e-ream-mcp-cli-not-found) | Le binaire `ream` n'est ni à `$REAM_BIN` ni dans le `node_modules/.bin` du projet. |
| [`E_REAM_MCP_CLI_OUTPUT_INVALID`](/fr/reference/errors#e-ream-mcp-cli-output-invalid) | La dernière ligne de la sortie de la CLI `ream` n'est pas un objet JSON. |
| [`E_REAM_MCP_ALREADY_CONNECTED`](/fr/reference/errors#e-ream-mcp-already-connected) | `McpServer.connect()` a été appelé sur un serveur déjà connecté. |
| [`E_REAM_MCP_INDEX_FAILED`](/fr/reference/errors#e-ream-mcp-index-failed) | L'index natif du corpus n'a pas pu être construit, ouvert ou lu (outils `docs.*`, réindexation au démarrage, `ream-mcp-reindex`) ; `cause` est l'erreur native. |
| [`E_REAM_MCP_INVALID_JSON`](/fr/reference/errors#e-ream-mcp-invalid-json) | Le cœur natif n'a pas pu lire le JSON qu'il a reçu (options de recherche) ou écrire sa réponse en JSON ; `cause` est l'erreur native. |
| [`E_REAM_MCP_INTERNAL`](/fr/reference/errors#e-ream-mcp-internal) | Un invariant interne a été rompu (un type d'outil inconnu a atteint un aiguilleur) ; signalez-le comme un bug. |

Les autres codes inker proviennent tels quels de `@c9up/inker`.

## Migration

- `security.scan` n'a plus de vérification `reflect_metadata_missing` : `@c9up/ream` importe lui-même `reflect-metadata`, avant que ses décorateurs ne s'exécutent, donc l'application n'a rien à ajouter. La passer dans `checks` donne maintenant un refus `unknown check`.
- `security.scan` renvoie une nouvelle clé `scanned` et lit toute la racine du projet, y compris un dossier `src/` et les paquets qu'elle contient ; un dossier nommé `build`, `test`, `fixtures`… sous le premier niveau est maintenant lu. `confidence` ne vaut plus `high` pour une analyse qui n'a rien lu, ni quand une vérification n'avait rien à lire (`knownGaps` dit laquelle). Attendez-vous à des résultats et à des lacunes sur du code qui était ignoré.
- `missing_guard_on_mutation_route` ne compte plus un `.guard()`, `.role()`, `.permission()` ou un décorateur warden qui ne nomme rien, ni un middleware dont le nom contient seulement `auth` : nommez le guard (`.guard('web')`) et attachez le middleware d'auth par son nom (`.middleware('auth')`). Une config de groupe qui n'est pas une liste littérale part maintenant dans `knownGaps`.
- `cookie_missing_flags` suit les valeurs par défaut des cookies de ream 0.2.32 (`Secure`, `SameSite=lax`, `HttpOnly`, réglées sous `http.cookie` dans `config/app.ts`) : un appel qui ne donne pas ces attributs n'est plus signalé à partir de 0.2.32 ; un `false` dans `http.cookie` l'est.
- `inker.list_templates` et `inker.render_test` sont annotés `readOnlyHint: false`, `destructiveHint: true` : un client qui demande confirmation pour ces appels la demande maintenant pour eux. Ils chargent le vrai `@c9up/inker` (une carte d'exports avec la seule condition `import`), ce qu'ils ne savaient pas faire.
- `detectProjectRoot()`, et donc le serveur, refusent une racine trouvée au-dessus du répertoire courant qui appartient à un autre utilisateur ou dans laquelle le groupe ou les autres peuvent écrire (`E_REAM_MCP_PROJECT_ROOT_NOT_FOUND`) : lancez le serveur dans le projet, ou définissez `REAM_PROJECT_ROOT`. `E_REAM_MCP_PROJECT_ROOT_NOT_FOUND` prend maintenant deux arguments, le répertoire courant et la raison.
- Une écriture de migration vers une URL PostgreSQL avec `hostaddr`, un `host` répété, ou sans hôte alors que `PGHOST` / `PGHOSTADDR` désignent un autre serveur, vers une URL PostgreSQL dont le seul signe local est `?socket=`, ou vers une URL MySQL dont le seul signe local est `?host=`, exige maintenant `REAM_MCP_ALLOW_PRODUCTION_MIGRATIONS=1`, sauf si l'adresse que le pilote contacte est en loopback ou une socket unix.
- Importer `@c9up/ream-mcp/napi` ne lève plus une simple `Error` : testez `error.code` pour `E_REAM_MCP_UNSUPPORTED_PLATFORM` ou `E_REAM_MCP_NATIVE_LOAD_FAILED`.
- `detectProjectRoot()` ne lève plus une simple `Error` : testez `error.code === 'E_REAM_MCP_PROJECT_ROOT_NOT_FOUND'`, ou `error instanceof errors.E_REAM_MCP_PROJECT_ROOT_NOT_FOUND` avec `import * as errors from '@c9up/ream-mcp/errors'`.

## Voir aussi

- [Agents IA (MCP)](/fr/guides/digging-deeper/mcp)
- [ream-cli](/fr/reference/ream-cli)
