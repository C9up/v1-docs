# lumen

`@c9up/lumen`: terminal output with no dependencies: colours, a logger with a fixed vocabulary, tables, boxes, steps and task reports, plus a raw mode that makes all of it assertable. Guide: [Terminal output](/en/guides/command-line/terminal-output).

## Installation

```bash
pnpm add @c9up/lumen
```

`@c9up/ream` depends on lumen, and `@c9up/ream/console` re-exports `Ui`, `Logger`, `Action`, `Box`, `Table`, `Tasks` and `TaskContext` for commands.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/lumen` | `lumen()`, `Ui`, the logger, the widgets, the renderers, colours and layout helpers. |
| `@c9up/lumen/colors` | The colour implementations and `supportsColor`, without the widgets and without any `node:` import. |
| `@c9up/lumen/helpers` | Text measurement and layout: `stringWidth`, `terminalWidth`, `justify`, `wrap`, `truncate`, `sanitize`. |

## Exports

### `@c9up/lumen`

| Export | Kind | Description |
|---|---|---|
| `lumen` | function | Builds a `Ui`, detecting the mode when it is not given. |
| `Ui` | class | One object carrying the colours, the logger and the widgets. |
| `UiMode` | type | `"normal" \| "silent" \| "raw"`. |
| `LumenOptions` | interface | `LoggerOptions` plus `mode?: UiMode`. |
| `Logger` | class | The logger: one method per level, actions and spinners. |
| `LoggerOptions` | interface | `dim?: boolean` dims the whole message; `dimLabels?: boolean` dims only the labels (defaults to `dim`). |
| `MessageOptions` | interface | Per-message decoration: `prefix`, `suffix`, `startTime`, `silent`. |
| `Action` | class | A step whose outcome is reported once it is over. |
| `Spinner` | class | A message with animated trailing dots, for work of unknown length. |
| `SpinnerDecorator` | type | `(text: string, options: MessageOptions) => () => string`. |
| `Box` | class | A bordered box, built by `ui.sticker()` and `ui.instructions()`. |
| `BorderPainter` | type | `(character: string, colors: Colors) => string`, called for every border glyph. |
| `Table` | class | A bordered table. |
| `TableCell` | interface | One cell with layout hints: `content`, `hAlign`, `vAlign`, `colSpan`, `rowSpan`. |
| `TableInput` | type | `string \| TableCell`. |
| `TableRow` | type | `readonly TableInput[] \| Record<string, readonly TableInput[]>`. |
| `TableChars` | interface | The border glyphs (`top`, `top-mid`, `left`, `mid-mid`, …). |
| `TableOptions` | interface | `raw?: boolean` prints cells joined by `\|` with no border or colour; `chars?: Partial<TableChars>`. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors). |
| `Steps` | class | A numbered list of things to do next. |
| `Tasks` | class | A sequence of steps run in order, each with its outcome. |
| `Task` | class | One step: its state, and the API its callback uses to report progress. |
| `TaskContext` | class | Alias of `Task`. |
| `TaskCallback` | type | `(task: Task) => Promise<TaskResult> \| TaskResult`. |
| `TaskResult` | type | `string \| Error \| TaskError \| Task \| undefined`: what a task callback may return. |
| `TaskError` | interface | `{ message: string; isError: true }`: a failure reported as a value. |
| `TaskFailure` | type | What `task.error()` returns: the `Error` itself, or a `TaskError` for a string. |
| `TaskOutcome` | interface | `{ title, state: "succeeded" \| "failed", message, duration: string \| null, error?: Error }`. |
| `TaskState` | type | `"idle" \| "running" \| "succeeded" \| "failed"`. |
| `TasksOptions` | interface | `icons?: boolean` marks each outcome with a glyph; `verbose?: boolean` prints every progress message. |
| `Renderer` | interface | Where lines go: `log`, `logError`, `logUpdate`, `logUpdatePersist`, `getLogs`, `flushLogs`. |
| `ConsoleRenderer` | class | Writes to the process streams; keeps nothing. |
| `MemoryRenderer` | class | Keeps every line in memory instead of printing it. |
| `CapturedLog` | interface | `{ message: string; stream: Stream }`. |
| `Stream` | type | `"stdout" \| "stderr"`. |
| `Colors` | interface | A chain of styles that renders text: `colors.dim.yellow("text")`. |
| `ColorStream` | interface | `{ isTTY?: boolean }`: a stream that can be asked about colour support. |
| `StyleName` | type | The name of one style (`bold`, `red`, `bgBlue`, …). |
| `STYLE_NAMES` | const | Every style name, in declaration order. |
| `ansiColors` | function | `ansiColors(): Colors`: escape codes. |
| `silentColors` | function | `silentColors(): Colors`: no transformation. |
| `rawColors` | function | `rawColors(): Colors`: the transformations spelled out, `dim(yellow(2 files))`. |
| `supportsColor` | function | `supportsColor(stream?: ColorStream, env?: Record<string, string \| undefined>, argv?: readonly string[]): boolean`. |
| `stripAnsi` | function | `stripAnsi(text: string): string`: drops every escape sequence. |
| `sanitize` | function | `sanitize(text: string, options?: SanitizeOptions): string`: renders every control character visibly. |
| `SanitizeOptions` | interface | `keepNewlines?: boolean` leaves `\n` alone. |
| `stringWidth` | function | `stringWidth(text: string): number`: terminal columns a string occupies, escape codes excluded. |
| `terminalWidth` | function | `terminalWidth(): number`: columns available, or 80 when the output is not a terminal. |
| `justify` | function | `justify(columns: readonly string[], options: JustifyOptions): string[]`: pads every column to the same width. |
| `JustifyOptions` | interface | `maxWidth: number`, `align?: "left" \| "right"`, `paddingChar?: string` (a space by default). |
| `wrap` | function | `wrap(columns: readonly string[], options: WrapOptions): string[]`: wraps between two columns. |
| `WrapOptions` | interface | `startColumn: number`, `endColumn: number`, `trimStart?: boolean`. |
| `truncate` | function | `truncate(columns: readonly string[], options: TruncateOptions): string[]`: cuts each column to `maxWidth`. |
| `TruncateOptions` | interface | `maxWidth: number`, `truncationChar?: string` (an ellipsis by default), `position?: "start" \| "middle" \| "end"`. |
| `formatDuration` | function | `formatDuration(milliseconds: number): string`: the shortest precise form. |
| `elapsedSince` | function | `elapsedSince(start: StartTime, now?: number): number`: milliseconds elapsed. |
| `StartTime` | type | `number \| bigint \| [number, number]`: `Date.now()`, `process.hrtime.bigint()` or a `process.hrtime()` tuple. |
| `icons` | const | The glyph set for the current platform. |
| `iconsFor` | function | `iconsFor(platform?: string, env?: Record<string, string \| undefined>): Icons`. |
| `Icons` | interface | `tick`, `cross`, `bullet`, `pointer`, `info`, `warning`, `squareSmallFilled` and the six border glyphs. |

### `@c9up/lumen/colors`

`ansiColors`, `silentColors`, `rawColors`, `supportsColor`, `stripAnsi`, `STYLE_NAMES`, and the types `Colors`, `ColorStream`, `StyleName`: the same as above.

### `@c9up/lumen/helpers`

`stringWidth`, `terminalWidth`, `justify`, `wrap`, `truncate`, `sanitize`, and the types `JustifyOptions`, `WrapOptions`, `TruncateOptions`, `SanitizeOptions`: the same as above.

### `lumen()`

```ts
function lumen(options?: LumenOptions): Ui
```

Without `mode`, the stream decides between `normal` and `silent`: `FORCE_COLOR` and the `--color` / `--no-color` flags first, then `NO_COLOR`, then whether the stream is a terminal, then `TERM=dumb` and known CI services. `raw` is never detected; pass it in tests.

| Mode | Colours | Output |
|---|---|---|
| `normal` | escape codes | the terminal |
| `silent` | none | the terminal |
| `raw` | spelled out, `dim(yellow(2 files))` | memory |

### `Ui`

| Member | Signature | Description |
|---|---|---|
| constructor | `new Ui(mode?: UiMode, options?: LoggerOptions)` | |
| `mode` | `get mode(): UiMode` | The current mode. |
| `colors` | `get colors(): Colors` | The colours of the current mode. |
| `logger` | `get logger(): Logger` | The logger. |
| `icons` | `get icons(): Icons` | The glyph set. |
| `switchMode` | `switchMode(mode: UiMode): this` | Swaps the mode, and with it the colours and where lines go. |
| `useRenderer` | `useRenderer(renderer: Renderer): this` | Replaces the renderer every widget writes through. |
| `useColors` | `useColors(colors: Colors): this` | Replaces the colours. |
| `write` | `write(line: string, stream?: Stream): void` | Writes one line through the renderer. |
| `getLogs` | `getLogs(): string[]` | Everything written since raw mode was switched on. |
| `getCapturedLogs` | `getCapturedLogs(): CapturedLog[]` | The same lines, each with its stream. |
| `flushLogs` | `flushLogs(): void` | Empties the captured lines. |
| `getTableRows` | `getTableRows(): string[][]` | Rows of the last table built through this UI, as given. |
| `getTableHead` | `getTableHead(): string[]` | Head cells of that table. |
| `table` | `table(options?: TableOptions): Table` | A new table. |
| `sticker` | `sticker(): Box` | A highlighted block. |
| `instructions` | `instructions(): Box` | The same box, every line marked with a pointer. |
| `steps` | `steps(): Steps` | Numbered steps. |
| `tasks` | `tasks(options?: TasksOptions): Tasks` | A task list. |

In raw mode, widgets drop their layout: a table prints its cells joined by `|`, boxes print the heading and lines without a frame, steps print their lines without indent.

### `Logger`

| Member | Signature | Description |
|---|---|---|
| constructor | `new Logger(colors: Colors, renderer?: Renderer, options?: LoggerOptions)` | |
| `colors` | `get colors(): Colors` | Also `getColors()`. |
| `useColors` | `useColors(colors: Colors): this` | |
| `getRenderer` / `useRenderer` | `getRenderer(): Renderer` / `useRenderer(renderer: Renderer): this` | |
| `getLogs` | `getLogs(): CapturedLog[]` | What was captured, each line with its stream. |
| `flushLogs` | `flushLogs(): void` | |
| `prefix` | `prefix(value: string): this` | Prepends a fixed marker to every later message. |
| `suffix` | `suffix(value: string): this` | Appends a fixed marker to every later message. |
| `child` | `child(options?: LoggerOptions): Logger` | A child sharing the colours and renderer, with its own options. |
| `dummy` | `dummy(): Logger` | A logger that discards everything. |
| `success` | `success(message: string, options?: MessageOptions): void` | `[ success ]`, green, stdout. |
| `info` | `info(message: string, options?: MessageOptions): void` | `[ info ]`, blue, stdout. |
| `warning` | `warning(message: string, options?: MessageOptions): void` | `[ warn ]`, yellow, stderr. |
| `error` | `error(message: string \| Error, options?: MessageOptions): void` | `[ error ]`, red, stderr. |
| `fatal` | `fatal(message: string \| Error, options?: MessageOptions): void` | An error plus its stack, indented and dimmed, stderr. |
| `debug` | `debug(message: string, options?: MessageOptions): void` | `[ debug ]`, cyan. Always prints. |
| `log` | `log(message: string, stream?: Stream): void` | A line with no decoration: the command's own output. |
| `logError` | `logError(message: string): void` | The same, on stderr. |
| `logUpdate` | `logUpdate(message: string): void` | Overwrites the line written last. |
| `logUpdatePersist` | `logUpdatePersist(): void` | Makes the last updated line permanent. |
| `action` | `action(title: string): Action` | A step whose outcome is reported later. |
| `await` | `await(message: string, options?: MessageOptions): Spinner` | `[ wait ]` with animated dots. |
| `prepare` | `prepare(level, message: string, options?: MessageOptions): string` | Builds the line without writing it. Level: `"success" \| "error" \| "fatal" \| "warning" \| "info" \| "debug" \| "await"`. |
| `prepareSuccess` … `prepareDebug` | `prepareSuccess(message, options?): string` | One `prepare` per level: `prepareSuccess`, `prepareInfo`, `prepareWarning`, `prepareError`, `prepareFatal`, `prepareDebug`. |

`MessageOptions`:

| Field | Type | Description |
|---|---|---|
| `prefix` | `string \| number` | Rendered dim ahead of the label; `%time%` becomes the current ISO time. |
| `suffix` | `string \| number` | Rendered dim yellow, in parentheses, after the message. |
| `startTime` | `StartTime` | When the work started; the elapsed time is appended. |
| `silent` | `boolean` | Builds the line but does not write it. |

### `Action`

| Member | Signature | Description |
|---|---|---|
| `displayDuration` | `displayDuration(): this` | Appends how long the action took. |
| `succeeded` | `succeeded(): void` | Writes the `DONE` line. |
| `skipped` | `skipped(reason?: string): void` | Writes the `SKIPPED` line. |
| `failed` | `failed(error: unknown): void` | Writes the `FAILED` line. |
| `prepareSucceeded` / `prepareSkipped` / `prepareFailed` | `(…): string` | The same lines, without writing them. |
| `prepare` | `prepare(label: string, colour: "green" \| "cyan" \| "red"): string` | |

### `Spinner`

| Member | Signature | Description |
|---|---|---|
| `FRAMES` | `static readonly FRAMES: string[]` | The animation frames. |
| `INTERVAL` | `static readonly INTERVAL = 200` | Milliseconds between frames. |
| `start` | `start(): this` | |
| `update` | `update(render: string \| (() => string), options?: MessageOptions): this` | Changes the text, keeping the label and options. |
| `tap` | `tap(writer: (line: string) => void): this` | Writes the animation yourself instead of the renderer. |
| `stop` | `stop(): void` | |

### `Table`

| Member | Signature | Description |
|---|---|---|
| constructor | `new Table(colors: Colors, renderer: Renderer, options?: TableOptions)` | |
| `head` | `head(columns: readonly TableInput[]): this` | |
| `row` | `row(cells: TableRow): this` | |
| `getRows` | `getRows(): string[][]` | The rows as given, unpadded. |
| `getHead` | `getHead(): string[]` | |
| `fullWidth` | `fullWidth(renderFullWidth?: boolean): this` | Stretches to the terminal width; one column absorbs the slack. |
| `fluidColumnIndex` | `fluidColumnIndex(index: number): this` | Which column absorbs the slack (the first by default). |
| `columnWidths` | `columnWidths(widths: readonly number[]): this` | Fixes the column widths, padding included. |
| `prepare` | `prepare(): string[]` | The rendered lines, without writing them. |
| `render` | `render(): void` | |
| `getColors` / `useColors` / `getRenderer` / `useRenderer` | | As on `Logger`. |

Cells are sanitised before they are measured.

### `Box`

| Member | Signature | Description |
|---|---|---|
| constructor | `new Box(colors: Colors, renderer: Renderer, options?: { pointer?: boolean; icons?: boolean; raw?: boolean })` | |
| `heading` | `heading(text: string): this` | |
| `add` | `add(line: string): this` | |
| `fullScreen` | `fullScreen(): this` | Stretches the box to the terminal width. |
| `drawBorder` | `drawBorder(painter: BorderPainter): this` | |
| `prepare` | `prepare(): string[]` | |
| `render` | `render(stream?: "stdout" \| "stderr"): void` | |
| `getColors` / `useColors` / `getRenderer` / `useRenderer` | | As on `Logger`. |

### `Steps`

| Member | Signature | Description |
|---|---|---|
| constructor | `new Steps(colors: Colors, renderer: Renderer, options?: { raw?: boolean })` | |
| `add` | `add(title: string, content?: string): this` | |
| `prepare` | `prepare(): string[]` | |
| `render` | `render(): void` | |
| `getColors` / `useColors` / `getRenderer` / `useRenderer` | | As on `Logger`. |

### `Tasks`

| Member | Signature | Description |
|---|---|---|
| constructor | `new Tasks(colors: Colors, renderer: Renderer, options?: TasksOptions)` | |
| `add` | `add(title: string, work: TaskCallback): this` | |
| `addIf` | `addIf(condition: boolean, title: string, work: TaskCallback): this` | Adds the task only when the condition holds. |
| `addUnless` | `addUnless(condition: boolean, title: string, work: TaskCallback): this` | |
| `tasks` | `tasks(): Task[]` | Every task, in declaration order. |
| `getState` | `getState(): TaskState` | `failed` as soon as one did; `succeeded` once they all have. |
| `outcomes` | `get outcomes(): TaskOutcome[]` | Results in declaration order, including the task that failed. |
| `run` | `run(): Promise<TaskOutcome[]>` | |
| `getColors` / `useColors` / `getRenderer` / `useRenderer` | | As on `Logger`. |

### `Task`

| Member | Signature | Description |
|---|---|---|
| constructor | `new Task(title: string)` | |
| `title` | `get title(): string` | |
| `getState` | `getState(): TaskState` | |
| `getDuration` | `getDuration(): string \| null` | Formatted; `null` until it finishes. |
| `getError` | `getError(): unknown` | |
| `getSuccessMessage` | `getSuccessMessage(): string \| null` | The final message, or the last progress message. |
| `getLastLoggedLine` | `getLastLoggedLine(): string \| null` | |
| `onUpdate` | `onUpdate(listener: (task: Task) => void): this` | Called whenever the task moves. |
| `start` | `start(): this` | |
| `update` | `update(message: string): this` | Reports progress. |
| `markAsSucceeded` | `markAsSucceeded(message?: string): this` | |
| `markAsFailed` | `markAsFailed(error: unknown): this` | |
| `error` | `error(reason: string): TaskError` / `error<T extends Error>(reason: T): T` | Marks the task failed and returns the failure. |

### `ConsoleRenderer`, `MemoryRenderer`

Both implement `Renderer`:

| Member | Signature | Description |
|---|---|---|
| `log` | `log(message: string, stream?: Stream): void` | |
| `logError` | `logError(message: string): void` | |
| `logUpdate` | `logUpdate(message: string): void` | Overwrites the last line; a plain line in memory. |
| `logUpdatePersist` | `logUpdatePersist(): void` | |
| `getLogs` | `getLogs(): CapturedLog[]` | Always empty for `ConsoleRenderer`. |
| `flushLogs` | `flushLogs(): void` | |

## Errors

| Code | Raised when |
|---|---|
| [`E_LUMEN_INVALID_COLUMN`](/en/reference/errors#e-lumen-invalid-column) | `fluidColumnIndex()` or `columnWidths()` gets a negative or fractional value, a `colSpan` / `rowSpan` is not a positive integer, or `fullWidth()` names a fluid column the table does not have. |
| [`E_LUMEN_TASK_NO_RESULT`](/en/reference/errors#e-lumen-task-no-result) | A task callback returned nothing and did not mark the task itself; found on the outcome's `error`, not thrown. |
| [`E_LUMEN_TASK_FAILED`](/en/reference/errors#e-lumen-task-failed) | A task failed with something that is not an `Error` (a string, a thrown value, a returned `{ message, isError: true }`); found on the outcome's `error`, with the original value as `cause`. |
| [`E_LUMEN_INTERNAL`](/en/reference/errors#e-lumen-internal) | An invariant inside lumen broke; a bug to report. |

## Migration

- `InvalidColumnError` is now `errors.E_LUMEN_INVALID_COLUMN`: replace `instanceof InvalidColumnError` with `error.code === 'E_LUMEN_INVALID_COLUMN'` or `instanceof errors.E_LUMEN_INVALID_COLUMN`.
- A task's failure built from a value that is not an `Error` is `errors.E_LUMEN_TASK_FAILED`, and a task that returned nothing is `errors.E_LUMEN_TASK_NO_RESULT`: read `error.code` on the outcome.

## See also

- [Terminal output](/en/guides/command-line/terminal-output)
- [Terminal UI](/en/guides/command-line/terminal-ui)
