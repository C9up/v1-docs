# Interface terminal

Ce guide couvre l'interface terminal d'une commande :

- Actions
- Tester la sortie
- Déclarer sans décorateurs
- Valeurs vides

## Terminal UI

`this.ui`, `this.colors` et `this.logger` sont [`@c9up/lumen`](/fr/guides/command-line/terminal-output),
que n'importe quel paquet peut utiliser seul — la référence de chaque widget,
des trois modes et des règles de couleur est là-bas. Ce qui suit est ce qu'une
commande utilise.


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
