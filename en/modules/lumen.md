# Lumen

`@c9up/lumen` is the terminal output layer: colours, a logger with a fixed
vocabulary, tables, boxes, steps and task reports — and a raw mode that makes
all of it assertable.

It carries no dependencies and nothing framework-specific, so a package that
prints a line does not have to depend on ream to print it the same way.

```bash
pnpm add @c9up/lumen
```

```ts
import { lumen } from '@c9up/lumen'

const ui = lumen()

ui.logger.success('3 migrations applied')
ui.logger.warning('config/mail.ts is missing a sender')
ui.table().head(['Name', 'Batch']).row(['create_users_table', '1']).render()
```

Inside a console command you already have it: `this.logger`, `this.colors` and
`this.ui` are this package — see
[Console commands](/en/guide/console-commands).

## Modes

A UI is in one of three modes, and the decision is made once:

| mode | colours | output |
|---|---|---|
| `normal` | escape codes | the terminal |
| `silent` | none | the terminal |
| `raw` | spelled out — `dim(yellow(2 files))` | memory |

`lumen()` picks between `normal` and `silent` by asking the stream, so nothing
downstream checks the environment again. The order:

1. `FORCE_COLOR` — empty, `true` or `1`–`3` means on, `0` or `false` means off,
   anything else is ignored — then the `--color` / `--no-color` flags (before
   any `--`);
2. `NO_COLOR` turns colour off — a deliberate override beats a default, so it
   only loses to step 1;
3. a stream that is not a terminal gets plain text, even inside CI: `ream cmd >
   out.txt` in a GitHub job writes no escape codes. Set `FORCE_COLOR=1` in the
   workflow for coloured CI logs (Azure Pipelines is recognised on its own);
4. `TERM=dumb`, the known CI services and what the terminal says about itself
   (`TERM`, `COLORTERM`, `TERM_PROGRAM`) decide the rest. A terminal that says
   nothing gets no colour.

stdout and stderr are asked separately, since they are redirected separately.

`raw` is for tests:

```ts
const ui = lumen({ mode: 'raw' })
ui.logger.warning('careful')
expect(ui.getLogs()).toEqual(['[ yellow(warn) ] careful'])
```

`getCapturedLogs()` and `ui.logger.getLogs()` add the stream each line
targeted (`{ message, stream }`); `switchMode('raw')` clears what was captured,
so one test case cannot see the previous one's lines.

Widgets drop their layout in raw mode, so a test asserts content rather than
borders: a table prints its cells joined by `|`, `sticker()` and
`instructions()` print the heading and the lines without the frame, and
`steps()` prints its lines without indent or blank separators.

## Levels

The vocabulary is fixed on purpose — the same word, in the same colour, for the
same meaning, in every package:

```
[ success ] green   [ error ] red     [ warn ] yellow
[ info ] blue       [ debug ] cyan    [ wait ] cyan
```

`warning`, `error` and `fatal` go to **stderr**, so a command's data output
stays pipeable: a warning must not end up inside `ream list --json | jq`.
`debug` always prints: whether detail is wanted is the command's decision,
behind its own `--verbose` flag. `fatal` adds the stack, indented and dimmed
under the message. Every level, `fatal` included, honours `{ silent: true }`.

Each message takes three decorations:

```ts
ui.logger.info('served', { prefix: '%time% ream' })   // dim, %time% → ISO time
ui.logger.success('wrote 3 files', { suffix: 'resources/views' })
ui.logger.success('migrated', { startTime })          // a Date.now(), rendered as elapsed
```

`logger.prefix(…)` and `.suffix(…)` set a sticky one for every message that
follows; a per-message value wins over it.

## Actions

One step, reported once it is over:

```ts
const create = ui.logger.action('creating config/auth.ts')
try {
  await write()
  create.displayDuration().succeeded()
} catch (error) {
  create.failed(error)
}
```

`succeeded()`, `skipped('reason')`, `failed(error)`. The labels are padded to
the same width, so a column of actions lines up whatever the outcome:

```
DONE:    creating config/auth.ts
SKIPPED: creating config/app.ts (already exists)
FAILED:  creating config/db.ts
      Error: permission denied
```

## Widgets

```ts
ui.table()
  .head(['Migration', 'Status'])
  .row(['1590591892626_tenants.ts', ui.colors.green('DONE')])
  .row([{ content: '12', hAlign: 'right' }, 'PENDING'])
  .render()

ui.sticker().add('Server started').add('http://localhost:3333').render()
ui.instructions().add('cd my-app').add('ream dev').render()
ui.steps().add('Install', 'pnpm install').add('Run', 'ream dev').render()

await ui.tasks()
  .add('clone repo', async (task) => {
    task.update('50%')
    return 'Completed'
  })
  .add('install', async (task) => task.error('Network failure'))
  .run()
```

A task sequence is sequential and stops at the first failure — later steps
usually depend on it. `run()` returns every outcome, including the one that
failed. `task.update()` keeps only the last message by default;
`tasks({ verbose: true })` prints each one, which is what a `--verbose` flag
turns on.

A callback succeeds by returning its success message (or the task it marked
itself); an `Error`, `task.error(…)` or nothing at all fails it, so a
forgotten `return` never reports green. `run()` runs once: a second or
concurrent call gets the same outcomes back without executing anything again.

`table.fullWidth()` stretches to the terminal width, `fluidColumnIndex(n)`
choosing which column absorbs the slack. `sticker().drawBorder((char, colors)
=> colors.red(char))` is how the same box becomes an error box.

### Untrusted text

Every widget prints data — a file name, a database value, an error message —
so every widget shows the controls in it instead of letting them act on the
terminal: `\x1b]52;…` rather than a clipboard write, `\x0d` rather than a
carriage return rewinding over `[ error ]`, `\x0a` rather than a forged second
log line. That covers the logger's message, prefix and suffix, an error's
stack, action titles and reasons, spinner text, table cells and head, box
lines, step titles and content, and task titles and messages.

Colour survives: `ui.colors.green(cell)` stays green, and a style the text opens
without closing is closed at its end, so it cannot spill onto the next line.
Hyperlinks and every other non-colour sequence are shown, not run.

`logger.log()`, `logger.logError()`, `logger.logUpdate()` and `ui.write()` are
the raw escape hatch: they write what they are given, for a command printing
its own escape sequences on purpose. Never hand them untrusted text — pass it
through `sanitize()` first:

```ts
import { sanitize } from '@c9up/lumen'

ui.write(`${link} ${sanitize(fileName)}`)
```

## Driving the output yourself

Every line can be built without being written — `logger.prepareInfo(msg)`,
`logger.prepareFatal(error)`, `action.prepareSucceeded()`, `table.prepare()`,
`box.prepare()`, `steps.prepare()` — which is what lets a caller put a
decorated line somewhere else, or assert on it. `spinner.tap(line => …)` hands
the frames over to a caller that already owns a region of the terminal, and
`logger.dummy()` swallows the output of a stretch that would land in the middle
of someone else's frame.

A task run is data as well as output:

```ts
const tasks = ui.tasks()
tasks.add('sync', async (task) => {
  task.update('42 files')
  return 'done'
})
tasks.tasks()[0].onUpdate((task) => report(task.getState(), task.getDuration()))
await tasks.run()
tasks.getState()   // 'idle' | 'running' | 'succeeded' | 'failed'
```

`addIf(condition, …)` and `addUnless(…)` declare a step behind a flag. Each
`Task` carries `getState()`, `getDuration()`, `getError()`,
`getSuccessMessage()` and `getLastLoggedLine()`, and a callback reports through
`update()`, `markAsSucceeded()`, `markAsFailed()` or by returning
`task.error(reason)`.

`table.columnWidths([10, 20])` fixes the widths instead of measuring, and a
width smaller than the content is honoured — the caller asked for a shape.

`ui.table()` hands the colours and the renderer over at construction, so
forgetting either cannot fail silently;
`useColors()` and `useRenderer()` still swap them on a widget built by hand.

## Colours on their own

`@c9up/lumen/colors` carries no widget and nothing from `node:`:

```ts
import { ansiColors, silentColors, rawColors, supportsColor } from '@c9up/lumen/colors'

const colors = ansiColors()
colors.dim.yellow('2 files')     // property chain
colors.dim().yellow('2 files')   // call chain — same thing
```

Each style closes with **its own** code rather than a blanket reset, so a
nested call restores what the outer one was holding:

```ts
colors.red(`a ${colors.dim('b')} c`)
// \u001B[31ma \u001B[2mb\u001B[22m c\u001B[39m — still red after the b
```

## Layout

`@c9up/lumen/helpers` has the primitives the widgets are built on:

```ts
import { stringWidth, justify, wrap, truncate, terminalWidth } from '@c9up/lumen/helpers'
```

`stringWidth` ignores escape codes (hyperlinks and cursor moves included),
gives a combining accent no width and counts a CJK glyph or an emoji as two
columns. It measures per grapheme against the full Unicode East Asian Width
table, so `✅`, a skin-toned 👍🏽 or a ZWJ family is one wide glyph. Measuring
with `String.length` is how a table with one emoji in it becomes ragged for
every row below.

`justify` pads a set of columns to one width, `wrap` re-flows text between two
columns and indents the continuation lines, `truncate` cuts at the start, the
middle or the end without ever splitting a glyph in half, and keeps the colour
of what it cut: `truncate([red('hello world')], { maxWidth: 6 })` is a red
`hello…`.

## The Rust half

The `ream` binary is Rust and cannot import this package, so it carries a
second implementation of the same contract in `ream-cli/src/ui.rs`. What is
shared is the vocabulary — the labels, the colours, the environment rules, the
visible-width measurement — not the code: each package lives in its own
repository, and a `path` dependency would build in the monorepo and break for
anyone who cloned one alone.

The binary's `--ansi` / `--no-ansi` flags export `FORCE_COLOR` / `NO_COLOR`
before anything runs, so the binary and the Node process it spawns reach the
same decision.
