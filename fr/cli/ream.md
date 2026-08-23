# ream CLI

Outil en ligne de commande Rust natif pour le framework Ream. Demarrage instantane (<10ms), pas de penalite de boot Node.js.

## Installation

```bash
npm install -g @c9up/ream-cli
```

## Gestion de projet

```bash
ream new my-app           # Creer un nouveau projet (interactif)
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

## Generation de code

```bash
ream make:controller order Order
ream make:service order Payment
ream make:entity order OrderItem
ream make:validator order CreateOrder
ream make:provider Stripe
ream make:migration create_orders_table
```

### Personnaliser ce qui est généré

Chaque template `make:` peut être surchargé par projet, comme AdonisJS permet à
une application de publier puis d'éditer ses stubs. Publiez-en un, modifiez-le,
et le générateur utilise votre copie :

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

Un stub publié est généré À PARTIR du template intégré : il démarre donc comme
une copie exacte de ce que vous obtenez déjà. Supprimez le fichier pour revenir
au comportement par défaut.

**Deux déviations nommées par rapport à AdonisJS**, toutes deux dues au fait que
ce générateur est un binaire Rust et non un process Node :

- Les stubs sont **substitués, pas rendus par un moteur de template**. Ceux
  d'Adonis passent par tempura (`{{#var}}`, conditions, partiels) ; ici
  `{{ name }}` est remplacé, rien de plus. Un marqueur inconnu reste visible au
  lieu d'être silencieusement vidé.
- **Le stub ne choisit pas sa destination.** Un stub Adonis appelle
  `exports({ to: … })` et nomme son chemin. Le nôtre ne fournit que le contenu :
  le CLI continue de calculer et de valider le chemin, pour qu'un fichier
  éditable ne puisse pas rediriger une écriture.

## Configuration de packages

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
ream migrate                # Executer toutes les migrations en attente
ream migrate:rollback       # Annuler le dernier batch de migrations
ream migrate:status         # Afficher le statut de toutes les migrations (appliquees / en attente)
```

## Diagnostics

```bash
ream doctor    # Verification de l'environnement
ream info      # Version + infos environnement
```

## Construit en Rust

Le binaire `ream` est un executable Rust compile. La generation de code, le scaffolding, la configuration et les diagnostics tournent en Rust pur sans surcharge Node.js. Seuls `ream dev`, `ream start` et `ream build` lancent des processus Node.js.

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
