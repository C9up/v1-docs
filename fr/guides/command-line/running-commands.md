# Exécuter des commandes

Ce guide couvre la découverte, l'inspection et l'exécution des commandes :

- Découvrir et inspecter
- Commandes du CLI
- Exécuter une commande depuis le code
- Commandes livrées par un paquet

## Découvrir et inspecter

`ream <commande> --help` et `ream help <commande>` mènent au même endroit : la
commande `help`. `--help` est un **flag global** dont le listener la lance —
et il est traité *avant* la validation des entrées, donc l'aide d'une commande
à flag requis s'affiche au lieu de réclamer le flag.

```bash
ream                      # sans commande : équivaut à `ream list`
ream list                 # commandes du CLI et de l'application
ream list make db         # seulement ces namespaces
ream list --json          # la même liste, exploitable par un script
ream help provision       # la même aide, par la commande `help`
ream provision --help     # arguments, flags, valeurs par défaut
```

`list` et `help` sont des **commandes** enregistrées, pas des branches dans le
dispatcher :
`consoleApp.hasCommand('list')` répond vrai, `consoleApp.exec('list', ['--json'])` fonctionne,
`ream help list` donne son aide, et `ream list --bad` est refusé comme n'importe
quel flag inconnu. Une invocation nue (`ream`) exécute cette commande par défaut.

Les commandes que le noyau enregistre pour lui-même sont **remplaçables** : une
application qui écrit son propre `list` dans `commands/` le voit gagner, des
deux côtés (`ream list` comme `bin/console.ts`). Les deux classes sont
exportées, pour en hériter plutôt que repartir de zéro :

```ts
import { HelpCommand, ListCommand } from '@c9up/ream'
```

Deux commandes *applicatives*
réclamant le même nom restent une erreur (`E_CONSOLE_DUPLICATE_COMMAND`) : rien
ne permet de les départager.

`list --json` imprime le contrat complet de chaque commande — le même que
`serialize()` — que la commande vienne du binaire ou de l'application : de quoi
construire une aide, une complétion ou une palette sans cas particulier. Un
namespace que personne ne porte est une **erreur** (code de sortie 1) : une
liste vide se lirait « ce namespace n'a rien » au lieu de « ce namespace
n'existe pas ».

## Commandes du CLI

```bash
ream generate:key                       # écrit un APP_KEY frais dans .env
ream generate:key --show                # l'affiche sans rien écrire (secrets manager)
ream repl                               # shell : `app`, `container`, `await resolve(token)`
ream make:middleware auth               # app/middleware/auth_middleware.ts
ream make:middleware auth --stack=server # server | named | router (défaut)
ream make:event orderShipped            # app/events/order_shipped.ts
ream make:listener sendMail --event=orderShipped  # app/listeners/send_mail.ts, typé
```

`generate:key` refuse d'écrire dans `.env` quand `NODE_ENV=production` — remplacer
la clé y invaliderait toutes les sessions et URLs signées en circulation. Utilisez
`--show` pour un gestionnaire de secrets, ou `--force` en connaissance de cause.

Les fichiers de middleware prennent le suffixe `Middleware` ; les events et
listeners n'en prennent aucun.

### Conventions de fichiers — organisées par module

Les générateurs de Ream sont organisés **par module**, pas par type :
`ream make:controller billing Invoice` écrit `app/billing/InvoiceController.ts`.
Le découpage par module est structurant dans Ream.

Les artefacts qui n'appartiennent à aucun module vont à des emplacements fixes :
`app/middleware/`, `app/events/`, `app/listeners/`,
`providers/`, `database/migrations/`, `database/seeders/`, `commands/`.

### Redéfinir une commande du CLI

Une commande de l'application l'emporte sur celle du binaire. Déclarez
`static commandName = 'build'` dans `commands/build.ts` et `ream build` exécute
la vôtre.

La détection lit le littéral `commandName` dans `commands/` sans démarrer Node —
sinon chaque commande paierait un boot. Conséquence : un nom calculé à
l'exécution reste invisible, et la commande intégrée l'emporte. `ream make:command`
génère toujours un littéral.

## Exécuter une commande depuis le code

La façade programmatique. Utile pour tester une commande sans
lancer de process, ou en déclencher une depuis l'application.

```ts
import consoleApp from '@c9up/ream/services/console'

await consoleApp.boot()

if (consoleApp.hasCommand('make:controller')) {
  const command = await consoleApp.exec('make:controller', ['billing', 'Invoice'])

  command.exitCode  // 0 si tout s'est bien passé, 1 sur un échec non traité
  command.result    // ce que run() a retourné
  command.error     // l'erreur, si elle a survécu à completed()
}
```

`exec()` **rejette** quand la commande échoue : l'erreur est
enregistrée sur la commande (`error`, `exitCode` à 1) *puis* relancée, pour
qu'un appelant ne puisse pas prendre un échec pour un succès en oubliant de
regarder. Le code de sortie du process n'est pas touché — seule la ligne de
commande en dispose.

Pour inspecter une commande qui échoue au lieu d'attraper l'erreur, deux
chemins : `kernel.create(Commande, argv)` construit
l'instance sans la jouer (analysée, injectée, hydratée) et vous la pilotez ; ou
`handle()` puis `kernel.getMainCommand()`.

Lèvent aussi, avant même l'exécution : nom inconnu
(`E_CONSOLE_COMMAND_NOT_FOUND`), argument requis manquant, flag inconnu.

`hasCommand()` est **synchrone** : appelez `await consoleApp.boot()`
d'abord. Une version asynchrone renverrait une Promise, toujours vraie, et
`if (consoleApp.hasCommand(x))` prendrait toutes les branches.

`consoleApp.getCommands()` renvoie les **métadonnées** (`serialize()`, alias du fichier
rc compris), pas les classes : c'est la surface d'introspection, et distribuer
les constructeurs inviterait à instancier une commande hors du noyau, là où rien
n'injecte ses dépendances ni ne joue son cycle de vie. `kernel.find(nom)` donne
la classe quand elle est réellement nécessaire.

Le reste de l'introspection est là, sur la façade comme sur le noyau :

```ts
consoleApp.getCommand('make:controller')      // métadonnées, ou null
consoleApp.getNamespaceCommands('make')       // les commandes d'un namespace
consoleApp.getNamespaceCommands()             // celles qui n'en ont pas
consoleApp.getNamespaces()                    // ['db', 'make', …]
consoleApp.getAliases()                       // les noms d'alias enregistrés
consoleApp.getAliasCommand('recontrol')       // la commande derrière un alias
consoleApp.getCommandAliases('make:controller')
consoleApp.getCommandSuggestions('make:contoller')  // les noms proches
consoleApp.getNamespaceSuggestions('mak')
```

Toutes lisent le registre, donc toutes exigent `boot()` : répondre depuis un
registre vide rendrait « commande inconnue » et « commandes pas encore
chargées » indistinguables.

### Cycle de vie du noyau

`kernel.getState()` renvoie `idle` → `booted` → `running` → `completed`. Deux
règles en découlent : un flag global ou un loader ne s'ajoute qu'à l'état
`idle` — après, les commandes sont chargées et les options du parseur
construites, l'ajout ne servirait à rien —, et une fois la commande de la ligne
de commande terminée, le noyau est `completed` et refuse d'en exécuter d'autres
(créez-en un neuf).

`kernel.getDefaultCommand()` donne la commande jouée sans nom (`list`, ou celle
de l'application si elle l'a remplacée) et `kernel.getMainCommand()` l'instance
lancée depuis la ligne de commande, une fois construite. Un noyau ne pilote
**qu'une** ligne de commande : un second `handle()` lève.

La commande par défaut se remplace par sous-classement :

```ts
class MonNoyau extends Kernel {
  static defaultCommand = Welcome
}
```

### Erreurs et exécuteur

`handle()` ne relance pas : la ligne de commande possède le process, il n'y a
personne à qui donner l'erreur. Elle est **rendue** par `kernel.errorHandler`,
`kernel.exitCode` et `process.exitCode` passent à 1.

Le rendu par défaut est la classe `ExceptionHandler`. Elle distingue deux
familles : une **erreur d'appel** — flag manquant, commande inconnue, valeur
invalide — est reportée sur une ligne, sans pile (la pile du parseur n'apprend
rien à qui s'est trompé de frappe) ; tout le reste est imprimé en entier.
Étendez-la pour n'en changer qu'une étape :

```ts
// Depuis la racine du paquet, elle s'appelle `ConsoleExceptionHandler` : Ream
// exporte déjà un `ExceptionHandler` HTTP.
import { ExceptionHandler } from '@c9up/ream/console'

class MonHandler extends ExceptionHandler {
  override async render(error: unknown, kernel: Kernel) {
    monRapporteur.capture(error)
    await super.render(error, kernel)
  }
}

kernel.errorHandler = new MonHandler()
```

`knownErrorCodes` ajoute vos propres codes à la famille « une ligne », et
`debug = false` remplace la pile complète par un résumé.

C'est `exec()`, le chemin programmatique, qui rejette.

`Kernel.commandExecutor` est le seam de construction et d'exécution.
L'exécuteur par défaut injecte déjà les dépendances : le conteneur construit la
commande et appelle ses hooks. Pour le remplacer :

```ts
class MonNoyau extends Kernel {
  static commandExecutor = {
    create: (Command, parsed, kernel, context) => kernel.buildCommand(Command, parsed, context),
    run: (command, kernel) => kernel.runLifecycle(command),
  }
}
```

`run()` couvre `prepare`, `interact` et `run` ; `completed` reste au noyau, qui
doit l'appeler même quand le reste a levé.

`kernel.info` est ce que le CLI dit de lui-même — nom du binaire, versions —
imprimé au-dessus de la liste des commandes :

```ts
kernel.info.set('binary', 'ream')
kernel.info.set('Framework version', '0.1.13')
```

### Loaders

D'où viennent les commandes. Ream en enregistre un pour vous — le dossier
`commands/` et `reamrc.commands` —, et `kernel.boot()` est le moment unique où
tout entre dans le registre :

```ts
import { FsLoader, ListLoader } from '@c9up/ream'

kernel.addLoader(new ListLoader([MyCommand, AnotherCommand]))  // des classes
kernel.addLoader(new FsLoader('./commands'))                   // un dossier
kernel.addLoader({                                             // le vôtre
  getMetaData: async () => [MyCommand.serialize()],
  getCommand: async (metadata) => (metadata.commandName === 'my:cmd' ? MyCommand : null),
})
await kernel.boot()
```

Les alias annoncés dans la metadata d'un loader sont enregistrés au boot : un
loader-manifeste peut les publier sans que la classe les répète dans
`static aliases`. Un loader peut aussi être une fonction asynchrone qui le
construit à la demande.

Le chargement est **paresseux** : `boot()` ne lit que les
métadonnées. Lister les commandes, en décrire une, répondre à `hasCommand()` —
tout se fait sans importer quoi que ce soit. `getCommand()` n'est appelé que
quand `find()` a besoin de la classe, c'est-à-dire quand la commande est
réellement demandée, et une seule fois. (Le loader du dossier `commands/`
importe les fichiers pour en lire les métadonnées : sans manifeste il n'y a pas
d'autre moyen — c'est aussi ce que fait le `FsLoader`.)

### Manifeste de commandes

Scanner un dossier veut dire importer chaque fichier. `IndexGenerator` écrit un
manifeste à côté des commandes compilées pour l'éviter :

```ts
import { IndexGenerator } from '@c9up/ream'

await new IndexGenerator('./dist/commands').generate()
// écrit commands.json, main.js et main.d.ts
```

`main.js` est un loader : `kernel.addLoader(await import('./dist/commands/main.js'))`.
Lister les commandes ne lit plus qu'un JSON, et une commande n'est importée que
lorsqu'on l'exécute.

Autour, le noyau expose aussi `Parser`, `commandExec` (canal
`diagnostics_channel` tracé à chaque exécution), et les utilitaires
`validateCommand`, `validateCommandMetaData`, `renderErrorWithSuggestions`,
`sortAlphabetically` — ce dont un loader maison a besoin.

### Hooks

```ts
kernel.finding((commandName) => {})   // avant de résoudre un nom
kernel.loading((metadata) => {})      // avant de charger la classe
kernel.loaded((command) => {})        // après
kernel.executing((command, isMain) => {})  // avant l'exécution
kernel.executed((command, isMain) => {})   // après, succès ou échec
```

`isMain` distingue la commande de la ligne de commande des autres. Les hooks
d'exécution reçoivent l'**instance**, dont le type est le contrat structurel :
le nom se lit sur sa classe.

Tous les chemins passent par `find()` — `ream <commande>`, `ream` nu et
`consoleApp.exec()` —, donc un outil à l'écoute les voit tous. `loading` / `loaded` se
déclenchent quand la commande est **trouvée**, pas au boot : démarrer ne fait
que lire ce que les loaders proposent. `executed` ne part **pas** quand la
commande a échoué : ce hook compte des exécutions terminées.

### `find()` et l'UI d'un `exec()`

`kernel.find(nom)` est **asynchrone et lève** quand rien ne correspond ;
les alias y sont résolus. `exec()` accepte une UI :

```ts
const ui = new Ui()
ui.switchMode('raw')
await consoleApp.exec('report', [], { ui })   // sortie capturée, celle du noyau intacte
```

Les commandes sont chargées à la première utilisation, une seule fois, même si
plusieurs appels partent en parallèle. `exec()` s'en charge ; `await consoleApp.boot()`
le force explicitement.

La façade est aussi dans le conteneur (`await container.resolve('console')`), et
`ignitor.consoleApp()` la construit hors de tout contexte de service.

## Commandes livrées par un paquet

**C'est le seul moyen pour un paquet d'ajouter une commande.** Un paquet ne
touche jamais au binaire `ream` : la CLI transmet au noyau console de
l'application tout nom qu'elle ne possède pas, donc une commande enregistrée
ici s'appelle `ream <nom>` sans publier autre chose que le paquet.

La découverte ne voit que le dossier `commands/` de l'application. Une commande
distribuée dans un paquet se déclare dans `reamrc.ts` :

```ts
export default defineConfig({
  commands: [() => import('@c9up/mon-paquet/commands/ma-commande.js')],
})
```

Un paquet qui en livre PLUSIEURS fournit un chargeur, et reste une seule ligne
dans le fichier rc. `getMetaData()` répond la liste, `getCommand()` n'importe
une classe qu'au moment de l'exécuter — `ream list` ne coûte donc aucun
import :

```ts
// @c9up/mon-paquet/commands
export async function getMetaData() {
  return [{ commandName: 'mon:build', description: 'Construire la chose' }]
}

export async function getCommand(metadata) {
  if (metadata.commandName === 'mon:build') return (await import('./build.js')).default
  return null
}
```

```ts
commands: [() => import('@c9up/mon-paquet/commands')],
```

Le `configure()` du paquet doit ajouter cette ligne lui-même, avec
`codemods.registerCommand('@c9up/mon-paquet/commands')`, pour que l'utilisateur
n'ait qu'à installer le paquet.

Ne déclarez pas ici une commande déjà présente dans `commands/` : elle serait
enregistrée deux fois, et le noyau lève `E_CONSOLE_DUPLICATE_COMMAND`.

### Les commandes du framework lui-même

Ream en livre aussi — `migrate`, `migrate:rollback`, `migrate:status`,
`schedule:list`, `schedule:run` — via la même forme de chargeur, sur
`@c9up/ream/commands`. La différence : personne ne les enregistre. L'Ignitor
charge ce chargeur en premier, avant la découverte et avant `reamrc.commands`.

Ces commandes étaient des sous-commandes du binaire `ream`
avant d'être des classes, et une application qui monte de version ne doit pas
les perdre en silence. Les charger en premier signifie aussi qu'une application
qui définit le même nom dans `commands/` l'emporte — l'enregistrement suivant
remplace celui du framework.
