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

`lumen()` choisit entre `normal` et `silent` en interrogeant le flux.
`NO_COLOR`, `FORCE_COLOR`, `TERM=dumb` et la détection de CI sont résolus là,
donc plus rien en aval ne relit l'environnement.

`FORCE_COLOR` l'emporte sur `NO_COLOR` — l'un est une surcharge délibérée,
l'autre un défaut — et `FORCE_COLOR=0` veut dire non : une variable posée à une
valeur fausse ne doit pas signifier « oui » du simple fait d'exister. Une CI que
la liste ne connaît pas n'a pas de couleur : `[32m` sur chaque ligne d'un
visualiseur de logs est pire qu'une transcription nue.

`raw` est pour les tests :

```ts
const ui = lumen({ mode: 'raw' })
ui.logger.warning('attention')
expect(ui.getLogs()).toEqual(['[ yellow(warn) ] attention'])
```

`getCapturedLogs()` ajoute le flux visé par chaque ligne ; `switchMode('raw')`
vide ce qui a été capturé, pour qu'un cas de test ne voie jamais les lignes du
précédent.

## Niveaux

Le vocabulaire est figé exprès — le même mot, dans la même couleur, pour le
même sens, dans tous les paquets :

```
[ success ] vert    [ error ] rouge   [ warn ] jaune
[ info ] bleu       [ debug ] cyan    [ wait ] cyan
```

`warning`, `error` et `fatal` partent sur **stderr**, pour que la sortie de
données d'une commande reste pipeable : un avertissement ne doit pas atterrir
dans `ream list --json | jq`. `debug` n'affiche que si `DEBUG` est posé.
`fatal` ajoute la stack, indentée et atténuée sous le message.

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

`table.fullWidth()` étire à la largeur du terminal, `fluidColumnIndex(n)`
choisissant la colonne qui absorbe le mou. `sticker().drawBorder((char, colors)
=> colors.red(char))` est ce qui transforme la même boîte en boîte d'erreur.

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

`stringWidth` ignore les codes d'échappement, ne donne aucune largeur à un
accent combinant et compte un idéogramme CJK ou un emoji pour deux colonnes.
Mesurer avec `String.length`, c'est ainsi qu'une table avec un seul emoji
devient bancale pour toutes les lignes en dessous.

`justify` complète un ensemble de colonnes à une largeur, `wrap` réenroule un
texte entre deux colonnes et indente les lignes de continuation, `truncate`
coupe au début, au milieu ou à la fin sans jamais scinder un glyphe en deux.

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
