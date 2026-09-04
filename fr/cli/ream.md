# ream CLI

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

## Ajouter un paquet

```bash
ream add @c9up/atlas                                  # installation + configure en une étape
ream add @c9up/photon --dev                           # devDependency
ream add @c9up/atlas --force                          # écraser les fichiers de configuration existants
ream add @c9up/some-pkg --transports=smtp --queue=redis  # transmettre des drapeaux à configure()
```

`ream add` détecte automatiquement votre gestionnaire de paquets à partir du lockfile (`pnpm-lock.yaml` > `yarn.lock` > `package-lock.json`), exécute l'installation (`<pm> add [-D] <pkg>`), puis enchaîne sur `ream configure <pkg>`. Les drapeaux inconnus placés après le nom du paquet sont transmis tels quels au hook `configure(codemods, flags)` du paquet sous la forme `Record<string, string[]>`. Si le paquet n'a pas de hook configure, l'installation réussit quand même et `ream add` retourne 0 avec une note d'une ligne — voir la mini-FAQ dans le [guide d'installation](/fr/guide/installation#ajouter-un-paquet-ream).

Si plusieurs lockfiles coexistent (par exemple un `package-lock.json` obsolète à côté d'un `pnpm-lock.yaml`), la précédence l'emporte et un avertissement nommant le lockfile ignoré est affiché sur stderr. En l'absence de tout lockfile, `ream add` retourne un code non-zéro avec une erreur explicite et la procédure manuelle de repli (`pnpm add <pkg> && ream configure <pkg>`).

Auteurs : voir [Système de plugins](/fr/guide/plugin-system) pour publier un plugin configurable.

## Génération de code

Un générateur de module écrit dans `app/<module>/` ; les autres écrivent dans le
répertoire propre à leur type.

```bash
ream make:controller order Order       # app/order/OrderController.ts
ream make:service order Payment        # app/order/PaymentService.ts
ream make:entity order OrderItem       # app/order/OrderItem.ts       (table : order_items)
ream make:validator order CreateOrder  # app/order/CreateOrderValidator.ts
ream make:module order Order           # les quatre ci-dessus, sans le service, plus une migration

ream make:provider Stripe              # providers/StripeProvider.ts
ream make:command app:provision        # commands/app-provision.ts
ream make:middleware auth              # app/middleware/auth_middleware.ts
ream make:event orderShipped           # app/events/order_shipped.ts
ream make:listener sendMail --event orderShipped   # app/listeners/send_mail.ts
```

Deux drapeaux sont communs à tous : `--dry-run` imprime le plan en JSON sans
rien écrire, et `--force` écrase un fichier déjà présent. Un lancement qui
écraserait quelque chose refuse en bloc plutôt que d'écrire à moitié, et un
échec en cours de route restaure ce qui avait déjà été écrit.

`make:middleware` prend `--stack server|named|router` (par défaut `router`), qui
choisit la ligne d'enregistrement que le fichier généré suggère :

```ts
// ream make:middleware auth --stack named
/**
 * Register it in `start/kernel.ts`:
 *   router.named({ auth: () => import('#middleware/auth_middleware.js') })
 */
```

`make:migration`, `make:seeder` et `make:factory` ne sont pas ici : elles
appartiennent au paquet de données, qui sait où vivent les migrations et ce
qu'une migration importe. Atlas les livre — voir
[ses commandes console](/fr/atlas/migrations#commandes-console).

### Personnaliser ce qui est généré

Chaque template `make:` peut être surchargé par projet. Publiez-en un,
modifiez-le, et le générateur utilise votre copie :

```bash
ream stubs:publish --list          # ce qui est publiable, et les variables exposées
ream stubs:publish controller      # écrit stubs/make/controller.stub
ream stubs:publish                 # publie tout
ream stubs:publish controller --force   # écrase un stub déjà publié
```

Un stub est du texte avec des marqueurs `{{ variable }}` :

```
// stubs/make/controller.stub
import type { HttpContext } from '@c9up/ream'

export class {{ className }} {
  async index({ response }: HttpContext) {
    response.status(200).json([])
  }
}
```

Un stub publié EST le template intégré — la même chaîne que le générateur
substitue, pas une copie — donc en publier un ne change rien tant que vous ne
l'éditez pas. Supprimez le fichier pour revenir au comportement par défaut.

`ream stubs:publish --list` nomme les variables que chaque stub substitue, lues
sur le template lui-même. `{{ className }}` et `{{ name }}` sont partout ;
`{{ tableName }}` appartient à l'entité, `{{ fileName }}` est le radical
snake_case sous lequel le fichier est écrit, et `{{ registration }}` la ligne de
middleware ci-dessus.

Un stub peut aussi choisir où il écrit, déclaré en front matter :

```
---
to: src/http/{{ module }}/{{ className }}.ts
---
export class {{ className }} {
}
```

Sans front matter, le chemin par défaut est utilisé. Le chemin déclaré passe par
la même validation que n'importe quel chemin généré — pas de chemin absolu, pas
de `..`.

Un stub est **substitué, pas rendu par un moteur de template** : `{{ name }}`
est remplacé, rien de plus, parce que le générateur est un binaire Rust et
qu'embarquer un moteur JavaScript pour évaluer des conditions et des partiels
coûterait plus que ça ne rapporte. Un marqueur inconnu reste visible au lieu
d'être silencieusement vidé, et un stub mal formé est une erreur plutôt qu'un
repli silencieux sur le template intégré.

## Configuration de paquets

> Pour installer le paquet en même temps, voir [Ajouter un paquet](#ajouter-un-paquet).

```bash
ream configure @c9up/atlas
ream configure @c9up/warden
ream configure @c9up/photon
ream configure @c9up/some-pkg --transports=smtp  # transmettre des drapeaux à configure()
```

> **Tailwind ?** Tailwind n'est pas un package géré par Ream. Installez-le directement dans votre stack Vite : `pnpm add -D tailwindcss @tailwindcss/vite`, puis ajoutez `tailwindcss()` aux plugins de votre `vite.config.ts`. Recette complète : `/fr/modules/tailwind`.

## Migrations

```bash
ream migrate                # Exécute les migrations en attente, pour chaque store enregistré
ream migrate:rollback       # Annule le dernier batch
ream migrate:status         # Montre ce qui a tourné et ce qui reste
ream migrate --only eon     # Un seul store
```

### Tous les stores, pas seulement le relationnel

La sortie est préfixée par le store d'où elle vient :

```
  [atlas] ✓ 001_create_users (batch 1)
  [eon]   ○ 001_create_meters
```

Ream s'attend à plusieurs stores dans une même app — un relationnel, un
temporel, ce qui viendra ensuite — donc la commande n'en nomme aucun : elle
pilote ce qui se trouve dans le registre `migrations`.

Un paquet de données enregistre son runner depuis son provider, sous la liaison
`migrations` de l'app. Deux conséquences à connaître :

- **Livrer un nouveau store ne demande jamais un nouveau CLI.** Le binaire
  `ream` est publié à part des paquets ; tout nom de paquet qu'il connaîtrait
  serait un couplage de version.
- **Une app qui n'a qu'un store temporel peut migrer.** La commande refusait de
  démarrer sans répertoire `database/migrations/`, qui est la convention
  d'atlas. Chaque runner connaît désormais le sien.

Les sources tournent **séquentiellement**, pas en parallèle : deux stores
partageant un serveur se disputeraient les verrous, et une sortie entrelacée
rend un échec impossible à attribuer.

### Écrire un runner pour son propre store

Trois méthodes sont requises — les trois qu'appellent les commandes :

```ts
interface MigrationRunnerContract {
  migrate(): Promise<string[]>              // noms appliqués, dans l'ordre
  rollback(): Promise<string[]>             // noms annulés
  status(): Promise<MigrationStatusNode[]>  // { name, status, batch? }

  reset?(): Promise<string[]>               // le reste est optionnel
  refresh?(): Promise<unknown>
  fresh?(): Promise<unknown>
  dryRun?(): Promise<unknown>
  forceUnlock?(): Promise<boolean>
}
```

Le reste est optionnel à dessein : un store doit pouvoir s'enregistrer avec un
runner qui sait seulement avancer, plutôt que de simuler des méthodes qu'il ne
peut pas honorer.

On l'enregistre depuis son provider, en résolvant la liaison structurellement
pour que le paquet ne dépende pas de `@c9up/ream` :

```ts
const registry = await container.resolve('migrations')
registry.register({
  name: 'mystore',
  directory: 'database/mystore-migrations',
  runner: myRunner,
})
```

Enregistrer deux fois le même nom est refusé, pas remplacé en silence : l'un des
deux providers ne migrerait rien pendant que la commande annoncerait un succès.

::: tip Où vivent ces commandes
`migrate`, `migrate:rollback`, `migrate:status`, `schedule:list` et
`schedule:run` sont des classes de commande de `@c9up/ream`, enregistrées par
le framework lui-même — pas des sous-commandes du binaire. Le binaire transmet
au noyau console de l'application tout nom qu'il ne connaît pas, et c'est aussi
comme ça que les commandes d'un paquet tournent sans une ligne de Rust. Une app
sans paquet de données signale que rien ne s'est enregistré, et sort en 0.
:::

## Créer un projet

`ream new` demande un gabarit et une base de données. Chaque question se saute
en passant son drapeau, et `--yes` prend le défaut pour ce qui reste — la
commande tourne donc en CI, dans un conteneur ou depuis un script, là où il n'y
a aucun terminal pour répondre :

```bash
ream new my-app                                # interactif
ream new my-app --template api --db postgres   # aucune question
ream new my-app --yes                          # api + postgres
ream new my-app --template slim --yes          # slim + postgres
```

| Drapeau | Valeurs | Défaut |
| --- | --- | --- |
| `--template` | `api`, `web`, `microservice`, `slim` | `api` |
| `--db` | `postgres`, `sqlite` | `postgres` |
| `--yes`, `-y` | — | prend les défauts pour ce qui n'est pas passé |

Une valeur inconnue est rejetée **avant** toute question : une faute de frappe
se signale comme une erreur de ligne de commande, pas comme un terminal absent.

## Les commandes de l'application

Tout nom que le binaire ne définit pas est transmis au noyau console de
l'application, drapeaux compris :

```bash
ream provision --email vous@exemple.com   # lance la commande `provision` de l'app
ream list                                 # toutes les commandes, celles du binaire et celles de l'app
ream list make --json                     # un seul espace de noms, en JSON
```

`ream` sans commande vaut `ream list`. Une commande que l'application déclare
sous un nom que le binaire porte aussi — `start`, `build`, `test`, `list`, … —
l'emporte : le listing la marque comme surchargeant la commande intégrée, et la
répartition transmet l'argv d'origine tel quel. Un alias compte comme une
déclaration, et une entrée dans `reamrc.commands` aussi.

```bash
ream make:command app:provision   # commands/app-provision.ts, découverte automatiquement
```

## Lancer et tester

```bash
ream dev            # le serveur et ce qui construit les assets, sous un seul Ctrl-C
ream build          # les assets d'abord, puis TypeScript
ream start          # node dist/bin/server.js
ream test           # les suites déclarées dans reamrc.ts
ream test unit --bail --reporters spec,json --threads 4
ream repl           # un REPL Node avec l'app démarrée : `app`, `container`, `await resolve(token)`
ream inspect        # routes, providers, liaisons du conteneur
```

`ream test` lit ses suites dans le fichier rc et les passe au runner : les noms
de suites et leurs globs vivent donc à un seul endroit, pas dans un script. Un
projet `api` ou `web` frais les a déjà : une suite `unit`, une suite
`functional`, `tests/bootstrap.ts` et un premier test. Seule `functional` démarre
un serveur — c'est ce que fait son hook de suite, donc un fichier unitaire ne le
paie pas.

## Clés et intégrations

```bash
ream generate:key           # une APP_KEY fraîche dans .env
ream generate:key --show    # l'imprimer plutôt, pour un gestionnaire de secrets
ream generate:key --force   # remplacer une clé existante (invalide toutes les sessions)
ream mcp install            # enregistrer le serveur MCP Ream dans .mcp.json
ream mcp status
ream template kitchen-sink  # cloner une app de référence et repartir d'un historique vierge
```

`generate:key` n'imprime jamais la clé qu'elle écrit : stdout finit dans
l'historique du shell, le scrollback et les logs de CI, donc `.env` est le seul
puits. Elle refuse sur une machine qui se déclare en production — sous
`production` comme sous `prod`, parce que le second est ordinaire dans un
Dockerfile et qu'une lecture stricte lèverait la garde.

## Diagnostics

```bash
ream doctor    # Vérification de l'environnement
ream info      # Version + infos environnement
```

`ream doctor` vérifie Node, pnpm, `.env`, `reamrc.ts`, `package.json`,
`tsconfig.json` — et `@swc-node/register`.

Ce dernier compte plus qu'il n'en a l'air. `ream dev`, `build`, `console`,
`test`, `inspect`, `repl`, `migration:*` et `schedule:*` font tous passer ton
TypeScript par ce chargeur, résolu depuis les `node_modules` de **ton** projet :
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

## Publier ream-cli

### Cadence

La publication est manuelle. Les mainteneurs déclenchent une release via l'interface GitHub Actions (Actions → Build & Publish CLI → Run workflow) sur le dépôt ream-cli — pas de publication automatique sur push de tag. Cela suit la règle « trigger-only-via-UI » d'ADR-006 pour qu'un tag local poussé par erreur n'atteigne jamais npm.

### Séquence de bump de version

```bash
# 1) Bump version
cd packages/ream-cli && $EDITOR Cargo.toml   # change version = "X.Y.Z"
git add Cargo.toml && git commit -m "release: ream-cli vX.Y.Z"

# 2) Tag (after the release commit lands on main — via PR if main is protected)
git tag -a vX.Y.Z -m "ream-cli vX.Y.Z"
git push origin vX.Y.Z

# 3) Trigger publish from GHA UI → Actions → Build & Publish CLI → Run workflow
#    Select the vX.Y.Z tag as the ref (NOT main) so gates resolve the right tag.
```

### Règle SemVer

- Ajout de fonctionnalité (nouvelle sous-commande, nouvelle API publique) → bump MINOR.
- Correction de bug sans changement de surface → bump PATCH.
- Refactor interne sans changement visible côté consommateur → pas de bump.

### Override (`confirm_overwrite: YES`)

Le gate de dérive refuse la publication quand la registre npm contient déjà une version supérieure ou égale au `Cargo.toml` local. L'entrée de workflow `confirm_overwrite` (défaut `no`) accepte la chaîne littérale `YES` pour contourner ce garde-fou. À n'utiliser que pour :

- Re-publier la même version après une publication initiale cassée (la registre a une archive tombstoned mais le `Cargo.toml` n'a pas encore été bumpé).
- Rollback délibéré quand la dernière version sur la registre est cassée et que le mainteneur veut livrer un snapshot local antérieur.

Toute autre erreur (pas de tag sur HEAD, mismatch tag-vs-`Cargo.toml`, registre npm injoignable) est fail-closed : aucun override possible.

Voir ADR-006 (artefact de planification interne) pour la justification complète et la sémantique des gates.
