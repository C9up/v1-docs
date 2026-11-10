# Lumen

`@c9up/lumen` est la couche de sortie terminal : couleurs, logger au
vocabulaire figé, tables, boîtes, étapes et rapports de tâches — et un mode
raw qui rend tout ça assertable.

Aucune dépendance, rien de spécifique au framework : un paquet qui affiche une
ligne n'a pas besoin de dépendre de ream pour l'afficher de la même façon.

```bash
pnpm add @c9up/lumen
```

```ts
import { lumen } from '@c9up/lumen'

const ui = lumen()

ui.logger.success('3 migrations appliquées')
ui.logger.warning("config/mail.ts n'a pas d'expéditeur")
ui.table().head(['Nom', 'Lot']).row(['create_users_table', '1']).render()
```

Dans une commande console tu l'as déjà : `this.logger`, `this.colors` et
`this.ui` sont ce paquet — voir
[Commandes console](/fr/guide/console-commands).

## Modes

Une UI est dans l'un de trois modes, et la décision est prise une fois :

| mode | couleurs | sortie |
|---|---|---|
| `normal` | codes d'échappement | le terminal |
| `silent` | aucune | le terminal |
| `raw` | écrites en toutes lettres — `dim(yellow(2 fichiers))` | la mémoire |

`lumen()` choisit entre `normal` et `silent` en interrogeant le flux, donc plus
rien en aval ne relit l'environnement. L'ordre :

1. `FORCE_COLOR` — vide, `true` ou `1`–`3` veut dire oui, `0` ou `false` veut
   dire non, toute autre valeur est ignorée — puis les flags `--color` /
   `--no-color` (avant un éventuel `--`) ;
2. `NO_COLOR` coupe la couleur — une surcharge délibérée l'emporte sur un
   défaut, donc il ne cède qu'à l'étape 1 ;
3. un flux qui n'est pas un terminal reçoit du texte nu, même en CI :
   `ream cmd > out.txt` dans un job GitHub n'écrit aucun code d'échappement.
   Pose `FORCE_COLOR=1` dans le workflow pour des logs de CI en couleur (Azure
   Pipelines est reconnu tout seul) ;
4. `TERM=dumb`, les services de CI connus et ce que le terminal dit de lui-même
   (`TERM`, `COLORTERM`, `TERM_PROGRAM`) tranchent le reste. Un terminal qui ne
   dit rien n'a pas de couleur.

stdout et stderr sont interrogés séparément, puisqu'ils sont redirigés
séparément.

`raw` est pour les tests :

```ts
const ui = lumen({ mode: 'raw' })
ui.logger.warning('attention')
expect(ui.getLogs()).toEqual(['[ yellow(warn) ] attention'])
```

`getCapturedLogs()` et `ui.logger.getLogs()` ajoutent le flux visé par chaque
ligne (`{ message, stream }`) ; `switchMode('raw')` vide ce qui a été capturé,
pour qu'un cas de test ne voie jamais les lignes du précédent.

En mode `raw`, les widgets abandonnent leur mise en page, pour qu'un test
vérifie le contenu et non les bordures : une table affiche ses cellules jointes
par `|`, `sticker()` et `instructions()` affichent le titre et les lignes sans
le cadre, et `steps()` affiche ses lignes sans indentation ni ligne vide.

## Niveaux

Le vocabulaire est figé exprès — le même mot, dans la même couleur, pour le
même sens, dans tous les paquets :

```
[ success ] vert    [ error ] rouge   [ warn ] jaune
[ info ] bleu       [ debug ] cyan    [ wait ] cyan
```

`warning`, `error` et `fatal` partent sur **stderr**, pour que la sortie de
données d'une commande reste pipeable : un avertissement ne doit pas atterrir
dans `ream list --json | jq`. `debug` affiche toujours : vouloir du
détail est une décision de la commande, derrière son propre flag `--verbose`.
`fatal` ajoute la stack, indentée et atténuée sous le message. Chaque niveau,
`fatal` compris, respecte `{ silent: true }`.

Chaque message accepte trois décorations :

```ts
ui.logger.info('servi', { prefix: '%time% ream' })    // dim, %time% → heure ISO
ui.logger.success('3 fichiers écrits', { suffix: 'resources/views' })
ui.logger.success('migré', { startTime })             // un Date.now(), rendu en durée
```

`logger.prefix(…)` et `.suffix(…)` en posent un collant pour tous les messages
suivants ; une valeur par message l'emporte dessus.

## Actions

Une étape, rapportée une fois terminée :

```ts
const create = ui.logger.action('création de config/auth.ts')
try {
  await write()
  create.displayDuration().succeeded()
} catch (error) {
  create.failed(error)
}
```

`succeeded()`, `skipped('raison')`, `failed(error)`. Les libellés sont complétés
à la même largeur, donc une colonne d'actions s'aligne quelle que soit l'issue :

```
DONE:    création de config/auth.ts
SKIPPED: création de config/app.ts (existe déjà)
FAILED:  création de config/db.ts
      Error: permission denied
```

## Widgets

```ts
ui.table()
  .head(['Migration', 'Statut'])
  .row(['1590591892626_tenants.ts', ui.colors.green('DONE')])
  .row([{ content: '12', hAlign: 'right' }, 'PENDING'])
  .render()

ui.sticker().add('Serveur démarré').add('http://localhost:3333').render()
ui.instructions().add('cd my-app').add('ream dev').render()
ui.steps().add('Installer', 'pnpm install').add('Lancer', 'ream dev').render()

await ui.tasks()
  .add('cloner le dépôt', async (task) => {
    task.update('50%')
    return 'Terminé'
  })
  .add('installer', async (task) => task.error('Panne réseau'))
  .run()
```

Une séquence de tâches est séquentielle et s'arrête à la première panne — les
étapes suivantes en dépendent en général. `run()` renvoie toutes les issues, y
compris celle qui a échoué. `task.update()` ne garde que le dernier message par
défaut ; `tasks({ verbose: true })` les affiche tous, ce qu'un flag `--verbose`
active.

Un callback réussit en renvoyant son message de succès (ou la tâche qu'il a
marquée lui-même) ; une `Error`, `task.error(…)` ou rien du tout le fait
échouer, pour qu'un `return` oublié ne s'affiche jamais en vert. `run()`
s'exécute une fois : un deuxième appel, concurrent ou non, reçoit les mêmes
issues sans rien réexécuter.

`table.fullWidth()` étire à la largeur du terminal, `fluidColumnIndex(n)`
choisissant la colonne qui absorbe le mou. `sticker().drawBorder((char, colors)
=> colors.red(char))` est ce qui transforme la même boîte en boîte d'erreur.

### Texte non fiable

Chaque widget affiche des données — un nom de fichier, une valeur de base, un
message d'erreur — donc chaque widget montre les caractères de contrôle qu'elles
contiennent au lieu de les laisser agir sur le terminal : `\x1b]52;…` plutôt
qu'une écriture dans le presse-papiers, `\x0d` plutôt qu'un retour chariot qui
réécrit par-dessus `[ error ]`, `\x0a` plutôt qu'une deuxième ligne de log
forgée. Cela couvre le message, le préfixe et le suffixe du logger, la stack
d'une erreur, les titres et raisons des actions, le texte du spinner, les
cellules et l'en-tête des tables, les lignes des boîtes, les titres et contenus
des étapes, et les titres et messages des tâches.

La couleur survit : `ui.colors.green(cellule)` reste vert, et un style que le
texte ouvre sans le fermer est fermé à sa fin, pour qu'il ne déborde pas sur la
ligne suivante. Les hyperliens et toute autre séquence qui n'est pas de la
couleur sont montrés, pas exécutés.

`logger.log()`, `logger.logError()`, `logger.logUpdate()` et `ui.write()` sont
la sortie brute : ils écrivent ce qu'on leur donne, pour une commande qui
imprime ses propres séquences exprès. Ne leur passe jamais de texte non fiable
— fais-le d'abord passer par `sanitize()` :

```ts
import { sanitize } from '@c9up/lumen'

ui.write(`${lien} ${sanitize(nomDeFichier)}`)
```

## Piloter la sortie toi-même

Chaque ligne peut être construite sans être écrite — `logger.prepareInfo(msg)`,
`logger.prepareFatal(error)`, `action.prepareSucceeded()`, `table.prepare()`,
`box.prepare()`, `steps.prepare()` — ce qui permet de poser une ligne décorée
ailleurs, ou d'écrire une assertion dessus. `spinner.tap(line => …)` remet les
frames à un appelant qui possède déjà une région du terminal, et
`logger.dummy()` avale la sortie d'un passage qui atterrirait au milieu de la
frame de quelqu'un d'autre.

Une exécution de tâches est aussi une donnée, pas seulement une sortie :

```ts
const tasks = ui.tasks()
tasks.add('sync', async (task) => {
  task.update('42 fichiers')
  return 'terminé'
})
tasks.tasks()[0].onUpdate((task) => report(task.getState(), task.getDuration()))
await tasks.run()
tasks.getState()   // 'idle' | 'running' | 'succeeded' | 'failed'
```

`addIf(condition, …)` et `addUnless(…)` déclarent une étape derrière un flag.
Chaque `Task` porte `getState()`, `getDuration()`, `getError()`,
`getSuccessMessage()` et `getLastLoggedLine()`, et un callback rapporte via
`update()`, `markAsSucceeded()`, `markAsFailed()` ou en renvoyant
`task.error(raison)`.

`table.columnWidths([10, 20])` fixe les largeurs au lieu de les mesurer, et une
largeur plus petite que le contenu est respectée — l'appelant a demandé une
forme.

DÉVIATION NOMMÉE — en amont un widget se construit nu (`new Table()`) puis on
lui branche les couleurs et le renderer après coup, ce qui fait d'un oubli une
panne silencieuse. Ici `ui.table()` les fournit à la construction ;
`useColors()` et `useRenderer()` les remplacent toujours sur un widget
construit à la main.

## Les couleurs seules

`@c9up/lumen/colors` ne porte aucun widget ni rien de `node:` :

```ts
import { ansiColors, silentColors, rawColors, supportsColor } from '@c9up/lumen/colors'

const colors = ansiColors()
colors.dim.yellow('2 fichiers')     // chaîne par propriété
colors.dim().yellow('2 fichiers')   // chaîne par appel — pareil
```

Chaque style se ferme avec **son propre** code et non un reset global, donc un
appel imbriqué restaure ce que l'appel extérieur tenait encore :

```ts
colors.red(`a ${colors.dim('b')} c`)
// \u001B[31ma \u001B[2mb\u001B[22m c\u001B[39m — toujours rouge après le b
```

## Mise en page

`@c9up/lumen/helpers` porte les primitives sur lesquelles les widgets sont
construits :

```ts
import { stringWidth, justify, wrap, truncate, terminalWidth } from '@c9up/lumen/helpers'
```

`stringWidth` ignore les codes d'échappement (hyperliens et déplacements de
curseur compris), ne donne aucune largeur à un accent combinant et compte un
idéogramme CJK ou un emoji pour deux colonnes.
Elle mesure par graphème, contre la table Unicode East Asian Width complète :
`✅`, un 👍🏽 avec teinte de peau ou une famille ZWJ est un seul glyphe large.
Mesurer avec `String.length`, c'est ainsi qu'une table avec un seul emoji
devient bancale pour toutes les lignes en dessous.

`justify` complète un ensemble de colonnes à une largeur, `wrap` réenroule un
texte entre deux colonnes et indente les lignes de continuation, `truncate`
coupe au début, au milieu ou à la fin sans jamais scinder un glyphe en deux,
et garde la couleur de ce qu'elle coupe : `truncate([red('hello world')],
{ maxWidth: 6 })` donne un `hello…` rouge.

## La moitié Rust

Le binaire `ream` est en Rust et ne peut pas importer ce paquet : il porte donc
une seconde implémentation du même contrat dans `ream-cli/src/ui.rs`. Ce qui est
partagé, c'est le vocabulaire — les libellés, les couleurs, les règles
d'environnement, la mesure de largeur visible — pas le code : chaque paquet vit
dans son propre dépôt, et une dépendance `path` compilerait dans le monorepo
pour casser chez qui n'a cloné que l'un d'eux.

Les flags `--ansi` / `--no-ansi` du binaire exportent `FORCE_COLOR` / `NO_COLOR`
avant que quoi que ce soit ne tourne, pour que le binaire et le process Node
qu'il lance prennent la même décision.
