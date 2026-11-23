# lumen

`@c9up/lumen` : la sortie terminal, sans dépendance : couleurs, un logger au vocabulaire fixe, tableaux, encadrés, étapes et rapports de tâches, plus un mode brut qui rend tout cela vérifiable dans un test. Guide : [Sortie terminal](/fr/guides/command-line/terminal-output).

## Installation

```bash
pnpm add @c9up/lumen
```

`@c9up/ream` dépend de lumen, et `@c9up/ream/console` réexporte `Ui`, `Logger`, `Action`, `Box`, `Table`, `Tasks` et `TaskContext` pour les commandes.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/lumen` | `lumen()`, `Ui`, le logger, les widgets, les renderers, les couleurs et les outils de mise en page. |
| `@c9up/lumen/colors` | Les implémentations des couleurs et `supportsColor`, sans les widgets et sans aucun import `node:`. |
| `@c9up/lumen/helpers` | Mesure et mise en page du texte : `stringWidth`, `terminalWidth`, `justify`, `wrap`, `truncate`, `sanitize`. |

## Exports

### `@c9up/lumen`

| Export | Nature | Description |
|---|---|---|
| `lumen` | fonction | Construit une `Ui`, en détectant le mode s'il n'est pas fourni. |
| `Ui` | classe | Un objet qui porte les couleurs, le logger et les widgets. |
| `UiMode` | type | `"normal" \| "silent" \| "raw"`. |
| `LumenOptions` | interface | `LoggerOptions` plus `mode?: UiMode`. |
| `Logger` | classe | Le logger : une méthode par niveau, les actions et les spinners. |
| `LoggerOptions` | interface | `dim?: boolean` atténue tout le message ; `dimLabels?: boolean` n'atténue que les libellés (vaut `dim` par défaut). |
| `MessageOptions` | interface | La décoration d'un message : `prefix`, `suffix`, `startTime`, `silent`. |
| `Action` | classe | Une étape dont l'issue est annoncée une fois terminée. |
| `Spinner` | classe | Un message suivi de points animés, pour un travail de durée inconnue. |
| `SpinnerDecorator` | type | `(text: string, options: MessageOptions) => () => string`. |
| `Box` | classe | Un encadré, construit par `ui.sticker()` et `ui.instructions()`. |
| `BorderPainter` | type | `(character: string, colors: Colors) => string`, appelé pour chaque glyphe de bordure. |
| `Table` | classe | Un tableau à bordures. |
| `TableCell` | interface | Une cellule avec ses indications de mise en page : `content`, `hAlign`, `vAlign`, `colSpan`, `rowSpan`. |
| `TableInput` | type | `string \| TableCell`. |
| `TableRow` | type | `readonly TableInput[] \| Record<string, readonly TableInput[]>`. |
| `TableChars` | interface | Les glyphes de bordure (`top`, `top-mid`, `left`, `mid-mid`, …). |
| `TableOptions` | interface | `raw?: boolean` imprime les cellules jointes par `\|`, sans bordure ni couleur ; `chars?: Partial<TableChars>`. |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs). |
| `Steps` | classe | Une liste numérotée des choses à faire ensuite. |
| `Tasks` | classe | Une suite d'étapes exécutées dans l'ordre, chacune avec son issue. |
| `Task` | classe | Une étape : son état, et l'API que son callback utilise pour signaler sa progression. |
| `TaskContext` | classe | Alias de `Task`. |
| `TaskCallback` | type | `(task: Task) => Promise<TaskResult> \| TaskResult`. |
| `TaskResult` | type | `string \| Error \| TaskError \| Task \| undefined` : ce qu'un callback de tâche peut renvoyer. |
| `TaskError` | interface | `{ message: string; isError: true }` : un échec signalé comme une valeur. |
| `TaskFailure` | type | Ce que renvoie `task.error()` : l'`Error` elle-même, ou une `TaskError` pour une chaîne. |
| `TaskOutcome` | interface | `{ title, state: "succeeded" \| "failed", message, duration: string \| null, error?: Error }`. |
| `TaskState` | type | `"idle" \| "running" \| "succeeded" \| "failed"`. |
| `TasksOptions` | interface | `icons?: boolean` marque chaque issue d'un glyphe ; `verbose?: boolean` imprime chaque message de progression. |
| `Renderer` | interface | Où vont les lignes : `log`, `logError`, `logUpdate`, `logUpdatePersist`, `getLogs`, `flushLogs`. |
| `ConsoleRenderer` | classe | Écrit sur les flux du processus ; ne garde rien. |
| `MemoryRenderer` | classe | Garde chaque ligne en mémoire au lieu de l'imprimer. |
| `CapturedLog` | interface | `{ message: string; stream: Stream }`. |
| `Stream` | type | `"stdout" \| "stderr"`. |
| `Colors` | interface | Une chaîne de styles qui rend du texte : `colors.dim.yellow("text")`. |
| `ColorStream` | interface | `{ isTTY?: boolean }` : un flux que l'on peut interroger sur la couleur. |
| `StyleName` | type | Le nom d'un style (`bold`, `red`, `bgBlue`, …). |
| `STYLE_NAMES` | const | Tous les noms de styles, dans l'ordre de déclaration. |
| `ansiColors` | fonction | `ansiColors(): Colors` : des codes d'échappement. |
| `silentColors` | fonction | `silentColors(): Colors` : aucune transformation. |
| `rawColors` | fonction | `rawColors(): Colors` : les transformations écrites en toutes lettres, `dim(yellow(2 files))`. |
| `supportsColor` | fonction | `supportsColor(stream?: ColorStream, env?: Record<string, string \| undefined>, argv?: readonly string[]): boolean`. |
| `stripAnsi` | fonction | `stripAnsi(text: string): string` : retire toute séquence d'échappement. |
| `sanitize` | fonction | `sanitize(text: string, options?: SanitizeOptions): string` : rend visible chaque caractère de contrôle. |
| `SanitizeOptions` | interface | `keepNewlines?: boolean` laisse `\n` intact. |
| `stringWidth` | fonction | `stringWidth(text: string): number` : les colonnes de terminal qu'occupe une chaîne, codes d'échappement exclus. |
| `terminalWidth` | fonction | `terminalWidth(): number` : les colonnes disponibles, ou 80 si la sortie n'est pas un terminal. |
| `justify` | fonction | `justify(columns: readonly string[], options: JustifyOptions): string[]` : complète chaque colonne à la même largeur. |
| `JustifyOptions` | interface | `maxWidth: number`, `align?: "left" \| "right"`, `paddingChar?: string` (une espace par défaut). |
| `wrap` | fonction | `wrap(columns: readonly string[], options: WrapOptions): string[]` : coupe les lignes entre deux colonnes. |
| `WrapOptions` | interface | `startColumn: number`, `endColumn: number`, `trimStart?: boolean`. |
| `truncate` | fonction | `truncate(columns: readonly string[], options: TruncateOptions): string[]` : tronque chaque colonne à `maxWidth`. |
| `TruncateOptions` | interface | `maxWidth: number`, `truncationChar?: string` (des points de suspension par défaut), `position?: "start" \| "middle" \| "end"`. |
| `formatDuration` | fonction | `formatDuration(milliseconds: number): string` : la forme la plus courte qui reste précise. |
| `elapsedSince` | fonction | `elapsedSince(start: StartTime, now?: number): number` : les millisecondes écoulées. |
| `StartTime` | type | `number \| bigint \| [number, number]` : `Date.now()`, `process.hrtime.bigint()` ou un tuple `process.hrtime()`. |
| `icons` | const | Le jeu de glyphes de la plateforme courante. |
| `iconsFor` | fonction | `iconsFor(platform?: string, env?: Record<string, string \| undefined>): Icons`. |
| `Icons` | interface | `tick`, `cross`, `bullet`, `pointer`, `info`, `warning`, `squareSmallFilled` et les six glyphes de bordure. |

### `@c9up/lumen/colors`

`ansiColors`, `silentColors`, `rawColors`, `supportsColor`, `stripAnsi`, `STYLE_NAMES`, et les types `Colors`, `ColorStream`, `StyleName` : identiques à ceux ci-dessus.

### `@c9up/lumen/helpers`

`stringWidth`, `terminalWidth`, `justify`, `wrap`, `truncate`, `sanitize`, et les types `JustifyOptions`, `WrapOptions`, `TruncateOptions`, `SanitizeOptions` : identiques à ceux ci-dessus.

### `lumen()`

```ts
function lumen(options?: LumenOptions): Ui
```

Sans `mode`, le flux tranche entre `normal` et `silent` : d'abord `FORCE_COLOR` et les drapeaux `--color` / `--no-color`, puis `NO_COLOR`, puis le fait que le flux soit un terminal, puis `TERM=dumb` et les services de CI connus. `raw` n'est jamais détecté ; passez-le dans les tests.

| Mode | Couleurs | Sortie |
|---|---|---|
| `normal` | codes d'échappement | le terminal |
| `silent` | aucune | le terminal |
| `raw` | en toutes lettres, `dim(yellow(2 files))` | la mémoire |

### `Ui`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Ui(mode?: UiMode, options?: LoggerOptions)` | |
| `mode` | `get mode(): UiMode` | Le mode courant. |
| `colors` | `get colors(): Colors` | Les couleurs du mode courant. |
| `logger` | `get logger(): Logger` | Le logger. |
| `icons` | `get icons(): Icons` | Le jeu de glyphes. |
| `switchMode` | `switchMode(mode: UiMode): this` | Change le mode, et avec lui les couleurs et la destination des lignes. |
| `useRenderer` | `useRenderer(renderer: Renderer): this` | Remplace le renderer par lequel écrit chaque widget. |
| `useColors` | `useColors(colors: Colors): this` | Remplace les couleurs. |
| `write` | `write(line: string, stream?: Stream): void` | Écrit une ligne par le renderer. |
| `getLogs` | `getLogs(): string[]` | Tout ce qui a été écrit depuis le passage en mode brut. |
| `getCapturedLogs` | `getCapturedLogs(): CapturedLog[]` | Les mêmes lignes, chacune avec son flux. |
| `flushLogs` | `flushLogs(): void` | Vide les lignes capturées. |
| `getTableRows` | `getTableRows(): string[][]` | Les lignes du dernier tableau construit par cette UI, telles que fournies. |
| `getTableHead` | `getTableHead(): string[]` | Les cellules d'en-tête de ce tableau. |
| `table` | `table(options?: TableOptions): Table` | Un nouveau tableau. |
| `sticker` | `sticker(): Box` | Un bloc mis en évidence. |
| `instructions` | `instructions(): Box` | Le même encadré, chaque ligne marquée d'un pointeur. |
| `steps` | `steps(): Steps` | Des étapes numérotées. |
| `tasks` | `tasks(options?: TasksOptions): Tasks` | Une liste de tâches. |

En mode brut, les widgets abandonnent leur mise en page : un tableau imprime ses cellules jointes par `|`, les encadrés impriment le titre et les lignes sans cadre, les étapes impriment leurs lignes sans retrait.

### `Logger`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Logger(colors: Colors, renderer?: Renderer, options?: LoggerOptions)` | |
| `colors` | `get colors(): Colors` | Aussi `getColors()`. |
| `useColors` | `useColors(colors: Colors): this` | |
| `getRenderer` / `useRenderer` | `getRenderer(): Renderer` / `useRenderer(renderer: Renderer): this` | |
| `getLogs` | `getLogs(): CapturedLog[]` | Ce qui a été capturé, chaque ligne avec son flux. |
| `flushLogs` | `flushLogs(): void` | |
| `prefix` | `prefix(value: string): this` | Ajoute un marqueur fixe devant chaque message suivant. |
| `suffix` | `suffix(value: string): this` | Ajoute un marqueur fixe après chaque message suivant. |
| `child` | `child(options?: LoggerOptions): Logger` | Un enfant qui partage les couleurs et le renderer, avec ses propres options. |
| `dummy` | `dummy(): Logger` | Un logger qui jette tout. |
| `success` | `success(message: string, options?: MessageOptions): void` | `[ success ]`, vert, stdout. |
| `info` | `info(message: string, options?: MessageOptions): void` | `[ info ]`, bleu, stdout. |
| `warning` | `warning(message: string, options?: MessageOptions): void` | `[ warn ]`, jaune, stderr. |
| `error` | `error(message: string \| Error, options?: MessageOptions): void` | `[ error ]`, rouge, stderr. |
| `fatal` | `fatal(message: string \| Error, options?: MessageOptions): void` | Une erreur et sa pile, en retrait et atténuée, stderr. |
| `debug` | `debug(message: string, options?: MessageOptions): void` | `[ debug ]`, cyan. Imprime toujours. |
| `log` | `log(message: string, stream?: Stream): void` | Une ligne sans décoration : la sortie propre de la commande. |
| `logError` | `logError(message: string): void` | La même, sur stderr. |
| `logUpdate` | `logUpdate(message: string): void` | Réécrit la dernière ligne écrite. |
| `logUpdatePersist` | `logUpdatePersist(): void` | Rend définitive la dernière ligne réécrite. |
| `action` | `action(title: string): Action` | Une étape dont l'issue est annoncée plus tard. |
| `await` | `await(message: string, options?: MessageOptions): Spinner` | `[ wait ]` avec des points animés. |
| `prepare` | `prepare(level, message: string, options?: MessageOptions): string` | Construit la ligne sans l'écrire. Niveau : `"success" \| "error" \| "fatal" \| "warning" \| "info" \| "debug" \| "await"`. |
| `prepareSuccess` … `prepareDebug` | `prepareSuccess(message, options?): string` | Un `prepare` par niveau : `prepareSuccess`, `prepareInfo`, `prepareWarning`, `prepareError`, `prepareFatal`, `prepareDebug`. |

`MessageOptions` :

| Champ | Type | Description |
|---|---|---|
| `prefix` | `string \| number` | Atténué, devant le libellé ; `%time%` devient l'heure ISO courante. |
| `suffix` | `string \| number` | Jaune atténué, entre parenthèses, après le message. |
| `startTime` | `StartTime` | Le début du travail ; la durée écoulée est ajoutée. |
| `silent` | `boolean` | Construit la ligne sans l'écrire. |

### `Action`

| Membre | Signature | Description |
|---|---|---|
| `displayDuration` | `displayDuration(): this` | Ajoute la durée de l'action. |
| `succeeded` | `succeeded(): void` | Écrit la ligne `DONE`. |
| `skipped` | `skipped(reason?: string): void` | Écrit la ligne `SKIPPED`. |
| `failed` | `failed(error: unknown): void` | Écrit la ligne `FAILED`. |
| `prepareSucceeded` / `prepareSkipped` / `prepareFailed` | `(…): string` | Les mêmes lignes, sans les écrire. |
| `prepare` | `prepare(label: string, colour: "green" \| "cyan" \| "red"): string` | |

### `Spinner`

| Membre | Signature | Description |
|---|---|---|
| `FRAMES` | `static readonly FRAMES: string[]` | Les images de l'animation. |
| `INTERVAL` | `static readonly INTERVAL = 200` | Millisecondes entre deux images. |
| `start` | `start(): this` | |
| `update` | `update(render: string \| (() => string), options?: MessageOptions): this` | Change le texte en gardant le libellé et les options. |
| `tap` | `tap(writer: (line: string) => void): this` | Vous écrivez l'animation vous-même, à la place du renderer. |
| `stop` | `stop(): void` | |

### `Table`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Table(colors: Colors, renderer: Renderer, options?: TableOptions)` | |
| `head` | `head(columns: readonly TableInput[]): this` | |
| `row` | `row(cells: TableRow): this` | |
| `getRows` | `getRows(): string[][]` | Les lignes telles que fournies, sans remplissage. |
| `getHead` | `getHead(): string[]` | |
| `fullWidth` | `fullWidth(renderFullWidth?: boolean): this` | Étire le tableau à la largeur du terminal ; une colonne absorbe l'espace restant. |
| `fluidColumnIndex` | `fluidColumnIndex(index: number): this` | La colonne qui absorbe l'espace restant (la première par défaut). |
| `columnWidths` | `columnWidths(widths: readonly number[]): this` | Fixe la largeur des colonnes, marges comprises. |
| `prepare` | `prepare(): string[]` | Les lignes rendues, sans les écrire. |
| `render` | `render(): void` | |
| `getColors` / `useColors` / `getRenderer` / `useRenderer` | | Comme sur `Logger`. |

Les cellules sont assainies avant d'être mesurées.

### `Box`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Box(colors: Colors, renderer: Renderer, options?: { pointer?: boolean; icons?: boolean; raw?: boolean })` | |
| `heading` | `heading(text: string): this` | |
| `add` | `add(line: string): this` | |
| `fullScreen` | `fullScreen(): this` | Étire l'encadré à la largeur du terminal. |
| `drawBorder` | `drawBorder(painter: BorderPainter): this` | |
| `prepare` | `prepare(): string[]` | |
| `render` | `render(stream?: "stdout" \| "stderr"): void` | |
| `getColors` / `useColors` / `getRenderer` / `useRenderer` | | Comme sur `Logger`. |

### `Steps`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Steps(colors: Colors, renderer: Renderer, options?: { raw?: boolean })` | |
| `add` | `add(title: string, content?: string): this` | |
| `prepare` | `prepare(): string[]` | |
| `render` | `render(): void` | |
| `getColors` / `useColors` / `getRenderer` / `useRenderer` | | Comme sur `Logger`. |

### `Tasks`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Tasks(colors: Colors, renderer: Renderer, options?: TasksOptions)` | |
| `add` | `add(title: string, work: TaskCallback): this` | |
| `addIf` | `addIf(condition: boolean, title: string, work: TaskCallback): this` | N'ajoute la tâche que si la condition est vraie. |
| `addUnless` | `addUnless(condition: boolean, title: string, work: TaskCallback): this` | |
| `tasks` | `tasks(): Task[]` | Toutes les tâches, dans l'ordre de déclaration. |
| `getState` | `getState(): TaskState` | `failed` dès qu'une a échoué ; `succeeded` une fois toutes réussies. |
| `outcomes` | `get outcomes(): TaskOutcome[]` | Les résultats dans l'ordre de déclaration, y compris la tâche en échec. |
| `run` | `run(): Promise<TaskOutcome[]>` | |
| `getColors` / `useColors` / `getRenderer` / `useRenderer` | | Comme sur `Logger`. |

### `Task`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Task(title: string)` | |
| `title` | `get title(): string` | |
| `getState` | `getState(): TaskState` | |
| `getDuration` | `getDuration(): string \| null` | Formatée ; `null` tant qu'elle n'est pas finie. |
| `getError` | `getError(): unknown` | |
| `getSuccessMessage` | `getSuccessMessage(): string \| null` | Le message final, ou le dernier message de progression. |
| `getLastLoggedLine` | `getLastLoggedLine(): string \| null` | |
| `onUpdate` | `onUpdate(listener: (task: Task) => void): this` | Appelé à chaque changement de la tâche. |
| `start` | `start(): this` | |
| `update` | `update(message: string): this` | Signale une progression. |
| `markAsSucceeded` | `markAsSucceeded(message?: string): this` | |
| `markAsFailed` | `markAsFailed(error: unknown): this` | |
| `error` | `error(reason: string): TaskError` / `error<T extends Error>(reason: T): T` | Marque la tâche en échec et renvoie l'échec. |

### `ConsoleRenderer`, `MemoryRenderer`

Tous deux implémentent `Renderer` :

| Membre | Signature | Description |
|---|---|---|
| `log` | `log(message: string, stream?: Stream): void` | |
| `logError` | `logError(message: string): void` | |
| `logUpdate` | `logUpdate(message: string): void` | Réécrit la dernière ligne ; une ligne ordinaire en mémoire. |
| `logUpdatePersist` | `logUpdatePersist(): void` | |
| `getLogs` | `getLogs(): CapturedLog[]` | Toujours vide pour `ConsoleRenderer`. |
| `flushLogs` | `flushLogs(): void` | |

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_LUMEN_INVALID_COLUMN`](/fr/reference/errors#e-lumen-invalid-column) | `fluidColumnIndex()` ou `columnWidths()` reçoit une valeur négative ou non entière, un `colSpan` / `rowSpan` n'est pas un entier positif, ou `fullWidth()` désigne une colonne fluide que le tableau n'a pas. |
| [`E_LUMEN_TASK_NO_RESULT`](/fr/reference/errors#e-lumen-task-no-result) | Le callback d'une tâche n'a rien renvoyé sans marquer la tâche lui-même ; se lit sur l'`error` du résultat, n'est pas levée. |
| [`E_LUMEN_TASK_FAILED`](/fr/reference/errors#e-lumen-task-failed) | Une tâche a échoué avec autre chose qu'une `Error` (une chaîne, une valeur levée, un `{ message, isError: true }` renvoyé) ; se lit sur l'`error` du résultat, avec la valeur d'origine en `cause`. |
| [`E_LUMEN_INTERNAL`](/fr/reference/errors#e-lumen-internal) | Un invariant interne de lumen a cédé ; un bogue à signaler. |

## Migration

- `InvalidColumnError` devient `errors.E_LUMEN_INVALID_COLUMN` : remplacez `instanceof InvalidColumnError` par `error.code === 'E_LUMEN_INVALID_COLUMN'` ou `instanceof errors.E_LUMEN_INVALID_COLUMN`.
- L'échec d'une tâche bâti sur une valeur qui n'est pas une `Error` est `errors.E_LUMEN_TASK_FAILED`, et une tâche qui n'a rien renvoyé est `errors.E_LUMEN_TASK_NO_RESULT` : lisez `error.code` sur le résultat.

## Voir aussi

- [Sortie terminal](/fr/guides/command-line/terminal-output)
- [Interface terminal](/fr/guides/command-line/terminal-ui)
