# Générateurs

Ce guide couvre la création de projets et la génération de code :

- Créer un projet
- Ajouter un paquet
- Génération de code
- Les commandes de l'application

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
| `--pkg` | `pnpm`, `npm`, `yarn` | celui qui a lancé `ream` (`pnpm dlx`, `npx`, `yarn dlx`), sinon `pnpm` |
| `--git-init` | — | lance `git init` dans le projet avant l'installation |

La destination est un chemin : `ream new apps/api` crée `apps/api` (et ses
parents) et nomme le paquet `api` ; `ream new .` remplit le dossier où vous
êtes. Un dossier existant n'est accepté que vide. `pnpm-workspace.yaml` n'est
écrit que pour pnpm.

Une valeur inconnue est rejetée **avant** toute question : une faute de frappe
se signale comme une erreur de ligne de commande, pas comme un terminal absent.

## Ajouter un paquet

```bash
ream add @c9up/atlas                                  # installation + configure en une étape
ream add @c9up/photon --dev                           # devDependency
ream add @c9up/atlas --force                          # écraser les fichiers de configuration existants
ream add @c9up/some-pkg --transports=smtp --queue=redis  # transmettre des drapeaux à configure()
ream add @c9up/atlas @c9up/warden                     # plusieurs paquets, une installation
ream add @c9up/atlas --package-manager npm            # choisir le gestionnaire de paquets
```

`ream add` installe tous les paquets donnés en une commande, puis exécute chaque hook configure à tour de rôle, avec les mêmes drapeaux ; un hook qui échoue n'arrête pas le suivant, et la commande échoue à la fin en les nommant. `--package-manager <pnpm|npm|yarn>` saute la détection. Sinon, il détecte automatiquement votre gestionnaire de paquets à partir du lockfile (`pnpm-lock.yaml` > `yarn.lock` > `package-lock.json`), exécute l'installation (`<pm> add [-D] <pkg>`), puis enchaîne sur `ream configure <pkg>`. Les drapeaux inconnus placés après le nom du paquet sont transmis au hook `configure()` du paquet, analysés dans `command.parsedFlags` et bruts en second argument (`Record<string, string[]>`). Un hook peut poser des questions avec `command.prompt` ; sans terminal (ou sous `CI`), une question prend sa valeur par défaut, sinon la commande échoue avec `E_CONSOLE_NOT_INTERACTIVE` — passez alors la réponse en drapeau. Si le paquet n'a pas de hook configure, l'installation réussit quand même et `ream add` retourne 0 avec une note d'une ligne — voir la mini-FAQ dans le [guide d'installation](/fr/start/installation#ajouter-un-paquet-ream).

Si plusieurs lockfiles coexistent (par exemple un `package-lock.json` obsolète à côté d'un `pnpm-lock.yaml`), la précédence l'emporte et un avertissement nommant le lockfile ignoré est affiché sur stderr. En l'absence de tout lockfile, `ream add` retourne un code non-zéro avec une erreur explicite et la procédure manuelle de repli (`pnpm add <pkg> && ream configure <pkg>`).

Auteurs : voir [Système de plugins](/fr/guides/concepts/extending) pour publier un plugin configurable.

## Génération de code

Un générateur de module écrit dans `app/<module>/` ; les autres écrivent dans le
répertoire propre à leur type.

```bash
ream make:controller order Order       # app/order/OrderController.ts
ream make:service order Payment        # app/order/PaymentService.ts
ream make:entity order OrderItem       # app/order/OrderItem.ts       (table : order_items)
ream make:validator order CreateOrder  # app/order/CreateOrderValidator.ts
ream make:module order Order           # l'entité, le contrôleur et le validateur d'un coup

ream make:provider Stripe              # providers/StripeProvider.ts
ream make:command app:provision        # commands/app-provision.ts
ream make:middleware auth              # app/middleware/auth_middleware.ts
ream make:event orderShipped           # app/events/order_shipped.ts
ream make:listener sendMail --event orderShipped   # app/listeners/send_mail.ts
```

Un générateur n'écrase jamais : un fichier déjà présent est signalé comme
ignoré et laissé tel quel, et `--force` est la façon de demander le
remplacement. Deux autres drapeaux sont communs à tous — `--dry-run` imprime ce
qui serait écrit sans rien écrire, et `--json` rapporte le résultat en un seul
objet JSON sur la dernière ligne de stdout, ce que lit `@c9up/ream-mcp`. Quand
`--force` écrase effectivement plusieurs fichiers, un échec en cours de route
restaure ce que le même lancement avait déjà écrit.

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
[ses commandes console](/fr/guides/database/orm/migrations#commandes-console). C'est aussi
pourquoi `make:module` s'arrête à trois fichiers : la migration qu'il écrirait
est au format d'atlas, dans le répertoire d'atlas.

Les générateurs sont eux-mêmes des commandes console, pas des sous-commandes du
binaire `ream`. `ream make:controller …` est transmis au console de
l'application exactement comme `ream provision`, si bien qu'un projet peut
remplacer n'importe laquelle par une commande du même nom.

### Personnaliser ce qui est généré

Chaque template `make:` peut être surchargé par projet. Éjectez-en un,
modifiez-le, et le générateur utilise votre copie :

```bash
ream eject --list                     # ce qui est éjectable, et les variables lues par chaque stub
ream eject make/controller.stub       # écrit stubs/make/controller.stub
ream eject make                       # le répertoire entier
ream eject                            # tous les stubs livrés par le paquet
ream eject make/controller.stub --force   # remplace un stub déjà éjecté
ream eject config/database.stub --pkg @c9up/atlas   # les stubs d'un autre paquet
```

Un stub déjà présent est laissé tel quel : relancer `eject` ne vous coûte
jamais une modification.

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

Un stub éjecté EST le template intégré — la même chaîne que le générateur
rend, pas une copie — donc en éjecter un ne change rien tant que vous ne
l'éditez pas. Supprimez le fichier pour revenir au comportement par défaut.

`ream eject --list` nomme les variables que chaque stub peut lire, prises sur le
template lui-même. `{{ className }}` et `{{ name }}` sont partout ;
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

Un stub est un template, pas une substitution : en plus de
`{{ expression }}`, il accepte `{{#if}}` / `{{#elif}}` / `{{#else}}`,
`{{#each liste as item, index}}`, `{{#var x = …}}`, `{{#expect a, b}}` et
`{{! un commentaire }}`. C'est le moteur qu'utilise `codemods.makeUsingStub()`
pour la configuration des paquets : un seul dialecte de stub dans le framework,
une seule chose qui le rend. Un stub mal formé est une erreur plutôt qu'un repli
silencieux sur le template intégré.

**Un stub ne peut pas exécuter de code.** Le template est lu une fois puis
interprété, jamais compilé en JavaScript. Une expression est la part de
JavaScript dont un stub a besoin — noms, `a.b`, `a?.b`, `a[i]`, appels,
`! - + * / %`, comparaisons, `&& || ??`, `? :`, `[…]` et `{…}` — et elle
n'atteint que ce qu'on lui donne : les propriétés propres de l'état et la
`length` d'une chaîne ou d'une liste. Aucun prototype (`constructor`,
`__proto__`), aucune globale (`process`, `require`), aucune méthode héritée
(`name.toUpperCase()` n'est pas une fonction) : un helper est une fonction que
l'état passe, `{{ string.pascalCase(name) }}`.

`{{ }}` n'échappe pas le HTML, et `{{{ }}}` veut dire la même chose — un stub
génère des fichiers source, pas une page web, et échapper un `<T>` dans un type
généré serait un bug plutôt qu'une protection.

## Les commandes de l'application

Tout nom que le binaire ne définit pas est transmis au noyau console de
l'application, drapeaux compris :

```bash
ream provision --email vous@exemple.com   # lance la commande `provision` de l'app
ream list                                 # toutes les commandes, celles du binaire et celles de l'app
ream list make --json                     # un seul espace de noms, en JSON
```

`ream` sans commande, comme `ream --help`, liste les commandes du binaire et
n'exécute rien du dossier où il est tapé : lire les commandes de l'application
revient à exécuter son point d'entrée console, ce que seul un `ream list`
explicite fait. Inspecter un dépôt tout juste cloné est donc sans risque.

Une commande que l'application déclare sous un nom que le binaire porte aussi —
`dev`, `start`, `build`, `test`, `repl`, `inspect`, `list` — l'emporte : le
listing la marque comme surchargeant la commande intégrée, et la répartition
transmet l'argv d'origine tel quel. Ces commandes exécutent le projet de toute
façon. `doctor`, `info` et `generate:key` ne peuvent pas être redéfinies : un
fichier de `commands/` ne doit pas pouvoir répondre à un diagnostic, ni recevoir
la clé qu'on lui a demandé d'écrire. Un alias compte comme une déclaration, et
une entrée dans `reamrc.commands` aussi.

```bash
ream make:command app:provision   # commands/app-provision.ts, découverte automatiquement
```
