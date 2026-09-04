# Commandes console

La console de Ream. Une commande est une classe, ses entrées
sont déclarées, et le CLI la lance directement :

```bash
ream provision --email hugo@exemple.ch --name "Hugo Dubois"
```

Pas de `pnpm exec tsx bin/mon-script.ts` : toute commande inconnue de `ream`
est transmise au noyau console de l'application.

## Créer une commande

```bash
ream make:command provision
```

Cela écrit `commands/provision.ts`. Rien à enregistrer : le dossier `commands/`
est découvert automatiquement, sous-dossiers compris. Les fichiers préfixés
d'un `_` sont ignorés (ce sont des helpers, pas des commandes).

```ts
import { BaseCommand, args, flags } from '@c9up/ream/console'
import type { CommandOptions } from '@c9up/ream/console'

export default class Provision extends BaseCommand {
  static commandName = 'provision'
  static description = 'Crée le compte propriétaire'
  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'Adresse e-mail du propriétaire', required: true })
  declare email: string

  @flags.string({ default: 'Owner' })
  declare name: string

  async run(): Promise<void> {
    const users = await this.app.container.resolve('users')
    await users.createOwner({ email: this.email, name: this.name })
    this.logger.success(`Propriétaire créé : ${this.email}`)
  }
}
```

## Arguments et flags

Les décorateurs déclarent les entrées ; le noyau parse, type et valide avant
d'appeler `run()`.

| Décorateur | Ligne de commande |
| --- | --- |
| `@args.string()` | positionnel : `ream greet Hugo` |
| `@args.spread()` | tout le reste : `ream greet a b c` (à déclarer en dernier) |
| `@flags.string()` | `--email x`, `--email=x` |
| `@flags.boolean()` | `--force`, `--no-force`, `-f` |
| `@flags.number()` | `--batch 2` (une valeur non numérique est rejetée) |
| `@flags.array()` | `--tag a --tag b` → `['a', 'b']` |

Options communes : `argumentName` / `flagName` (le nom affiché, par défaut le
nom de propriété en tirets), `description`, `default`, `required`, `alias` pour
les raccourcis à une lettre, et `parse` pour transformer la valeur.

Un booléen est toujours négable (`--no-force`) ; `showNegatedVariantInHelp: true`
décide seulement si l'aide le mentionne.

Ce qui est validé pour vous : argument requis manquant, flag requis manquant,
valeur absente après un flag qui en attend une, valeur non numérique, et flag
inconnu — avec la liste des flags acceptés. `--` arrête l'analyse : tout ce qui
suit est positionnel.

## Options de commande

```ts
static options: CommandOptions = { startApp: true }
```

| Option | Effet |
| --- | --- |
| `startApp` | Boote l'application (providers, conteneur, base) avant `run()`. **Faux par défaut** : une commande qui n'écrit que des fichiers n'a pas à ouvrir une connexion. Lire `this.app` sans l'avoir demandé lève une erreur qui nomme le correctif. |
| `staysAlive` | Garde le process en vie après `run()` (worker, watcher). |
| `allowUnknownFlags` | Accepte les flags non déclarés au lieu de les refuser. |
| `drivesMigrations` | Cette commande EST le passage des migrations, donc le boot ne doit pas le faire à sa place. Pose `REAM_SKIP_BOOT_MIGRATE=1` avant le démarrage de l'application, ce qu'un paquet de données guette. Sans ça, un paquet qui migre au boot pour la commodité de `dev` applique tout juste avant que la commande ne tourne — `migrate` n'a plus rien à signaler, et `migrate:status`, à qui on demandait seulement de regarder, a modifié le schéma sur lequel il rapporte. |

## Injection de dépendances

Une commande qui déclare `startApp: true` est construite **par le conteneur**.
La forme documentée par Adonis est l'injection dans les méthodes du cycle de
vie :

```ts
export default class Notify extends BaseCommand {
  static commandName = 'notify'
  static description = 'Prévient les propriétaires'
  static options: CommandOptions = { startApp: true }

  async prepare(@Inject('reporter') reporter: Reporter): Promise<void> {}

  async run(@Inject('users') users: UserService): Promise<void> {
    for (const owner of await users.owners()) {
      this.logger.info(owner.email)
    }
  }
}
```

**Extension Ream, pas parité :** l'injection dans le constructeur fonctionne
aussi ici. Les exemples d'Adonis n'utilisent que l'injection de méthode, donc
une commande écrite avec un constructeur injecté est portable *vers* Ream, pas
nécessairement l'inverse.

```ts
constructor(@Inject('mailer') private mailer: Mailer) {
  super()
}
```

Chaque exécution obtient sa propre instance : deux `consoleApp.exec()` ne partagent
aucun état.

Sans `startApp`, il n'y a pas de conteneur : la commande est construite
directement et ses méthodes appelées telles quelles. C'est le cas d'un
générateur, qui n'a besoin de rien d'autre que du disque.

## Sortie et interaction

`this.logger` : `info`, `success`, `warning`, `error`, `fatal`, `debug` (actif
si `DEBUG` est défini), `log`. Les niveaux d'alerte écrivent sur stderr pour que
la sortie de données reste redirigeable.

`this.prompt` : voir « Poser des questions » plus bas.

Pour un code de sortie non nul sans lever d'exception : `this.exitCode = 1`.

## Cycle de vie d'une commande

Le noyau appelle, dans cet ordre : `prepare()`, `interact()`, `run()`, puis
`completed()`. Seul `run()` est obligatoire.

```ts
export default class Provision extends BaseCommand {
  static commandName = 'provision'
  static description = 'Crée le compte propriétaire'

  async prepare(): Promise<void> {
    // avant tout le reste — ouvrir un fichier, préparer un état
  }

  async interact(): Promise<void> {
    // les questions interactives vont ici
  }

  async run(): Promise<void> {}

  async completed(): Promise<boolean> {
    // s'exécute MÊME si une étape précédente a levé : l'erreur est dans
    // `this.error`. Retourner `true` la marque comme traitée.
    if (this.error) this.logger.error(this.error as Error)
    return true
  }
}
```

## Transformer une entrée : `parse()`

```ts
@args.string({ parse: (value) => String(value).toUpperCase() })
declare name: string

@flags.number({ parse: (value) => Number(value) * 2 })
declare retries: number
```

Le callback reçoit la valeur **déjà typée** (un nombre pour un flag numérique) et
n'est pas appelé pour une entrée optionnelle absente.

## `this.parsed`

Toutes les entrées analysées, dans la forme du parseur. `this.parsed` décrit **ce qui
a été tapé** ; les propriétés de la commande, elles, portent les valeurs
assignées.

```ts
// ream hire Ada --user-email=ada@example.ch
this.userName            // 'Ada'          ← la propriété déclarée
this.parsed.args         // ['Ada']        ← une LISTE, dans l'ordre de déclaration
this.parsed.flags        // { 'user-email': 'ada@example.ch' }  ← nom de LIGNE DE COMMANDE
```

Également : `this.parsed.unknownFlags` — les *noms* des flags passés mais non
déclarés —, `this.parsed.extraArgs` (aussi exposé sous `_`) — les
positionnels au-delà de ce que la commande déclare, normalement une erreur, et
conservés seulement pour une commande `allowUnknownFlags` dont le rôle est de
faire suivre ce qu'elle reçoit — et `this.parsed.nodeArgs`, les arguments avec
lesquels node lui-même a été lancé.

## Flags globaux

Un flag que **toutes** les commandes acceptent, sans qu'aucune ait à le
redéclarer (`kernel.defineFlag`) :

```ts
kernel.defineFlag('verbose', { type: 'boolean', description: 'Tout dire' })
kernel.on('verbose', (Command, kernel, parsed) => {
  if (parsed.flags.verbose === true) enableDebugLogs()
})
```

`kernel.flags` liste les flags globaux, et l'aide de chaque commande les affiche
sous « Global flags ». Ils apparaissent dans `this.parsed.flags` mais ne sont
**pas** assignés aux propriétés de la commande : ils pilotent le CLI, pas la
commande. Une commande qui redéclare le même nom garde le sien.

Le listener n'est appelé que pour la commande lancée depuis la ligne de commande,
avant qu'elle ne soit construite — renvoyer `true` arrête là, sans exécuter la
commande ni démarrer l'application. C'est ainsi que `--ansi` / `--no-ansi` sont
implémentés, et ils s'écrivent avant ou après le nom de la commande
indifféremment. Une commande qui redéclare le nom garde la main de bout en bout :
son flag est parsé, et le listener global n'est pas appelé.

`consoleApp.exec()` **n'accepte pas** les flags globaux : ils
appartiennent à la ligne de commande. Passer `--no-ansi` à `exec()`, c'est passer
un flag que la commande ne déclare pas, et l'entendre dire est précisément
l'intérêt.

Un flag global déclaré après qu'une commande a déjà tourné lève : il n'aurait
plus servi à rien.

## Commandes longues : `terminate()`

Une commande `staysAlive: true` garde le process en vie ; `await this.terminate()`
est ce qui rend la main et arrête l'application proprement.

## Alias de commandes

Une commande peut porter ses propres alias :

```ts
export default class Welcome extends BaseCommand {
  static commandName = 'app:welcome'
  static description = 'Souhaite la bienvenue'
  static aliases = ['welcome', 'hi']
  async run(): Promise<void> {}
}
```

Et l'application peut en définir dans `reamrc.ts` — `commandsAliases`,
et la forme qui accepte des flags :

```ts
export default defineConfig({
  commandsAliases: {
    resource: 'make:controller --resource',
  },
})
```

`ream resource users` exécute alors `ream make:controller --resource users`.

Le noyau les accepte aussi à chaud — c'est ce que fait le fichier rc, et ce
qu'un loader peut publier dans ses métadonnées :

```ts
kernel.addAlias('resource', 'make:controller --resource')
kernel.getAliases()                  // ['resource']
kernel.getAliasCommand('resource')   // les métadonnées de make:controller
```

## Aide longue d'une commande

`static help` s'affiche sous la ligne d'usage. `{{ binaryName }}` y est remplacé
par le nom du binaire, pour donner un exemple exécutable :

```ts
static help = ['Exemple : {{ binaryName }} provision --email a@b.ch']
```

## Couleurs

`--ansi` force la couleur, `--no-ansi` la désactive ; ce sont des **flags
globaux**, donc acceptés par toutes les commandes, avant ou après le nom, et
jamais assignés aux propriétés de la vôtre (ils restent lisibles dans
`this.parsed.flags`). `NO_COLOR` et `FORCE_COLOR` sont également respectés.

## Terminal UI

`this.ui` et `this.colors` complètent `this.logger`.

```ts
this.ui.table()
  .head(['Migration', 'Statut'])
  .row(['1590591892626_tenants.ts', this.colors.green('DONE')])
  .render()

this.ui.sticker()
  .add('Serveur démarré')
  .add(`Adresse : ${this.colors.cyan('http://localhost:3333')}`)
  .render()

this.ui.instructions()
  .add('cd mon-app')
  .add('ream dev')
  .render()

await this.ui.tasks()
  .add('cloner le dépôt', async (task) => {
    task.update('50%')
    return 'Terminé'
  })
  .add('installer', async (task) => task.error('Échec du réseau'))
  .run()
```

Les colonnes s'alignent sur la largeur **visible** : une cellule colorée porte
des codes ANSI qui ne doivent pas décaler le tableau. Une cellule peut être un
objet `{ content, hAlign: 'right' | 'center' }`, et `table.fullWidth()` étire la
table à la largeur du terminal (la première colonne absorbe l'espace).

Une séquence de tâches s'arrête à la première qui échoue — les suivantes en
dépendent généralement. `run()` retourne l'état de chacune. Par défaut
`task.update()` n'imprime rien et seul le dernier message apparaît sur la ligne
finale ; `this.ui.tasks({ verbose: true })` imprime chaque étape — c'est ce qu'un
flag `--verbose` active.

`this.logger.info(msg, { prefix, suffix })` décore un message précis, et
`this.logger.await('installation', { suffix: 'npm i' })` renvoie une animation
(`start()`, `update()`, `stop()`) qui ne s'anime que sur un vrai terminal.

### Actions

```ts
const create = this.logger.action('création de config/auth.ts')
try {
  await write()
  create.displayDuration().succeeded()
} catch (error) {
  create.failed(error)
}
```

`succeeded()`, `skipped('raison')`, `failed(error)`. `this.logger.prefix(...)` et
`.suffix(...)` encadrent tous les messages.

### Tester la sortie

```ts
kernel.ui.switchMode('raw')
const command = await kernel.exec('report')

kernel.ui.getLogs() // ['bold(Nom)', '──────────', 'green(Ada)']
```

En mode `raw`, rien n'atteint le terminal et chaque ligne est conservée. Les
couleurs y sont écrites `green(Ada)` plutôt qu'en séquences d'échappement : une
attente de test reste lisible et comparable.

La commande porte les assertions :

```ts
command.assertSucceeded()          // ou assertFailed() / assertExitCode(2)
command.assertLog('[ blue(info) ] Hello world')
command.assertLog('[ yellow(warn) ] careful', 'stderr')
command.assertLogMatches(/Hello/)
command.assertTableRows([['Ada', 'ada@example.ch']])
```

Un `@args.spread()` optionnel qu'on ne renseigne pas vaut `undefined`, pas un
tableau vide : une commande qui distingue « aucune cible donnée » de « une
liste vide de cibles » ne le peut pas contre un `[]` silencieux.

`assertTableRows` compare les **données**, pas la mise en page : une colonne qui
s'élargit ne casse pas le test. La vérification est une
*inclusion* — chaque ligne attendue doit être présente, dans n'importe quel
ordre — et l'en-tête compte comme une ligne, donc le restituer est optionnel :

```ts
command.assertTableRows([
  ['Name', 'Email'],          // l'en-tête, si vous voulez le vérifier
  ['Ada', 'ada@example.ch'],
])
```

En cas d'échec, le message affiche la sortie réelle avec le flux de chaque
ligne. Également disponibles : `assertNotExitCode(code)`.

### Déclarer sans décorateurs

```ts
Provision.defineFlag('email', { type: 'string', required: true })
Provision.defineArgument('name')
Provision.serialize()   // métadonnées en données pures
```

Utile pour une commande construite à l'exécution, ou dans un paquet qui ne doit
pas importer les décorateurs du framework. `this.isMain` indique si la commande
a été appelée depuis la ligne de commande plutôt que par `consoleApp.exec()`.

`serialize()` décrit le **contrat** (nom, `namespace`, description, help, alias,
options, entrées) et reste sérialisable en JSON : les fonctions `parse` en sont
retirées. C'est aussi ce que `ream list --json` imprime.

Le reste de la surface statique est là :

```ts
Provision.boot()               // donne à CETTE classe ses propres déclarations
Provision.getParserOptions()   // { flagsParserOptions, argumentsParserOptions }
Provision.validate({ args: ['Ada'], unknownFlags: [] })
```

`boot()` est appelé par tout ce qui lit ou écrit ces statiques : sans lui,
`Enfant.args.push(...)` alimenterait le tableau déclaré par le parent, et toute
la hiérarchie partagerait une seule liste. `validate()` applique les règles que
le parseur applique déjà en parsant — arguments requis, flags requis, valeur
manquante, nombre invalide, flag inconnu — son intérêt étant l'entrée construite
à la main, jamais passée par un parseur.

`defineArgument()` refuse deux ordres impossibles : un argument après
un `spread` (qui consomme la fin, donc rien derrière lui n'est atteignable) et
un argument requis derrière un optionnel (le rendre requis serait une promesse
que la ligne de commande ne peut pas tenir). Les décorateurs appliquent les
mêmes règles — c'est le même contrôle.

### Valeurs vides

Une valeur vide est **refusée** par défaut : `ream note "$MSG"`
avec `MSG` non défini est presque toujours une variable de shell qui n'a pas été
substituée, pas une note vide. `allowEmptyValue` dit le contraire quand le vide
a un sens :

```ts
@args.string({ allowEmptyValue: true })
declare body: string

@flags.string({ allowEmptyValue: true })
declare tag: string
```

La règle est appliquée par le parseur **et** par `validate()` : `--tag` seul vaut
alors la chaîne vide au lieu de lever.

Côté instance : `this.hydrate()` — qui assigne **par déclaration**, donc les
positionnels y sont acceptés sous forme de liste (la forme analysée) ou indexés par
propriété (ce que contient `this.parsed.args`), et les flags par nom de flag ou
de propriété ; idempotent, appelé par le noyau avant `run()` —
`this.exec()` — qui hydrate, exécute `run()` et **relance** l'erreur, à la
différence du noyau qui la consigne sur la commande — et les accesseurs
`this.commandName`, `this.options`, `this.args`, `this.flags`.

`command.toJSON()` décrit une **exécution** : `args` (les positionnels, sous
forme de liste), `flags`, `result`, `error`, `exitCode`.

Les assertions et `toJSON()` sont attachées par le noyau à **toute** commande
qu'il exécute, y compris une classe déclarée sans `BaseCommand` — le type de
retour d'`exec()` ne promet donc rien qui manquerait à l'exécution.

## Poser des questions

`this.prompt` couvre toute la surface de prompt :

```ts
await this.prompt.ask('Nom du modèle', { default: 'User' })
await this.prompt.secure('Mot de passe', {
  // saisie masquée — une astérisque par caractère tapé
  validate: (value) => (value.length < 6 ? 'Au moins 6 caractères' : true),
})
await this.prompt.confirm('Continuer ?')
await this.prompt.toggle('Tout supprimer ?', ['Oui', 'Non'])
await this.prompt.choice('Base de données', [
  { name: 'pg', message: 'PostgreSQL' },
  { name: 'sqlite', message: 'SQLite' },
])
await this.prompt.multiple('Drivers', ['sqlite', 'mysql', 'pg'])
await this.prompt.autocomplete('Votre ville', villes, { limit: 10 })
```

Options communes : `default`, `name`, `hint`, `validate` (retourne `true` ou le
message d'erreur), `result` (transforme la valeur retournée), et `format`.

`format` **ne change pas la valeur retournée** : il ne concerne
que l'affichage. Utilisez `result` pour transformer. (Le formatage à la frappe
demande le mode raw ; ici `format` ne s'applique donc qu'au défaut affiché.)

Pour `choice`, `multiple` et `autocomplete`, `default` est un **index** (ou une
liste d'index), comme chez Adonis — une saisie vide sélectionne cette option, et
le libellé affiche son nom.

`multiple()` reçoit la **sélection entière** dans `validate` et `result`, pas
chaque élément : la valeur du prompt *est* le tableau, et une règle du type
« au moins deux » serait sinon inexprimable.

```ts
await this.prompt.multiple('Drivers', ['sqlite', 'mysql', 'pg'], {
  validate: (values) => (values.length >= 2 ? true : 'Choisissez-en au moins deux'),
  result: (values) => values.join('+'),
})
```

`result` s'applique aussi à `confirm` et `toggle` : le type de retour suit ce
que la fonction renvoie.

Sur une entrée non interactive — CI — un prompt **échoue immédiatement** au lieu
d'attendre une frappe qui ne viendra pas.

### Tester une commande interactive

Fournissez le prompt au noyau et scriptez les réponses. Sans ça, une commande
qui pose une question n'est pas testable : elle attendrait un terminal absent.

```ts
const prompt = new Prompt()
prompt.trap('thing-name').replyWith('Widget')
prompt.trap('overwrite').accept()

const kernel = new Kernel({ prompt }).register(MakeThing)
const command = await kernel.exec('make:thing')

command.exitCode // 0
```

`trap(name)` cible `options.name`, ou le message si vous n'en donnez pas.
`replyWith`, `accept`, `reject`, `chooseOption(index)`, `chooseOptions([...])`.

Une réponse scriptée passe par la **même validation** qu'une réponse tapée. Si
elle échoue, le prompt lève : il n'y a personne à qui redemander, et un test qui
injecte une valeur que le vrai prompt refuserait donne une confiance imméritée.

**Écart assumé :** les prompts de sélection se répondent en tapant un numéro,
pas avec les flèches. La navigation clavier suppose le mode raw, la gestion du
curseur et le redessin — une bibliothèque de widgets, ce qu'est enquirer. Le
reste — noms de méthodes, options, traps — est là.

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
``` Deux commandes *applicatives*
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

Le suffixe suit Adonis : `Middleware` pour les middlewares (documenté chez eux),
aucun pour les events et listeners.

### Conventions de fichiers — écart assumé avec Adonis

Les générateurs de Ream sont organisés **par module**, pas par type :
`ream make:controller billing Invoice` écrit `app/billing/InvoiceController.ts`,
là où Adonis écrirait `app/controllers/invoices_controller.ts`. C'est un choix
délibéré : le découpage par module est structurant dans Ream, et s'aligner sur
Adonis casserait les projets existants.

Les artefacts qui n'appartiennent à aucun module suivent en revanche les mêmes
emplacements qu'Adonis : `app/middleware/`, `app/events/`, `app/listeners/`,
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
  const command = await consoleApp.exec('make:controller', ['user', '--resource'])

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
consoleApp.getAliasCommand('resource')        // la commande derrière un alias
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

`Kernel.commandExecutor` est le seam de construction et d'exécution — celui
qu'AdonisJS remplace justement pour ajouter l'injection de dépendances. Chez
Ream elle est déjà dans l'exécuteur par défaut : le conteneur construit la
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

C'est un écart avec AdonisJS, où le starter kit liste `@adonisjs/core/commands`
dans le fichier rc. Ces commandes étaient des sous-commandes du binaire `ream`
avant d'être des classes, et une application qui monte de version ne doit pas
les perdre en silence. Les charger en premier signifie aussi qu'une application
qui définit le même nom dans `commands/` l'emporte — l'enregistrement suivant
remplace celui du framework.
