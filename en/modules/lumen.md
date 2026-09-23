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

`lumen()` picks between `normal` and `silent` by asking the stream. `NO_COLOR`,
`FORCE_COLOR`, `TERM=dumb` and CI detection are all resolved there, so nothing
downstream checks the environment again.

`FORCE_COLOR` wins over `NO_COLOR` — one is a deliberate override, the other a
default — and `FORCE_COLOR=0` means off, because a variable set to a falsy
value must not read as "on" merely by existing. A CI the list does not know
gets no colour: `[32m` on every line of a log viewer is worse than a plain
transcript.

`raw` is for tests:

```ts
const ui = lumen({ mode: 'raw' })
ui.logger.warning('careful')
expect(ui.getLogs()).toEqual(['[ yellow(warn) ] careful'])
```

`getCapturedLogs()` adds the stream each line targeted; `switchMode('raw')`
clears what was captured, so one test case cannot see the previous one's lines.

## Levels

The vocabulary is fixed on purpose — the same word, in the same colour, for the
same meaning, in every package:

```
[ success ] green   [ error ] red     [ warn ] yellow
[ info ] blue       [ debug ] cyan    [ wait ] cyan
```

`warning`, `error` and `fatal` go to **stderr**, so a command's data output
stays pipeable: a warning must not end up inside `ream list --json | jq`.
`debug` only prints when `DEBUG` is set. `fatal` adds the stack, indented and
dimmed under the message.

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

`table.fullWidth()` stretches to the terminal width, `fluidColumnIndex(n)`
choosing which column absorbs the slack. `sticker().drawBorder((char, colors)
=> colors.red(char))` is how the same box becomes an error box.

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

`stringWidth` ignores escape codes, gives a combining accent no width and
counts a CJK glyph or an emoji as two columns. Measuring with `String.length`
is how a table with one emoji in it becomes ragged for every row below.

`justify` pads a set of columns to one width, `wrap` re-flows text between two
columns and indents the continuation lines, `truncate` cuts at the start, the
middle or the end without ever splitting a glyph in half.

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
