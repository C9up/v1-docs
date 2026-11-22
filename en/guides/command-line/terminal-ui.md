# Terminal UI

This guide covers the terminal UI of a command:

- Actions
- Testing the output
- Declaring without decorators
- Empty values

## Terminal UI

`this.ui`, `this.colors` and `this.logger` are [`@c9up/lumen`](/en/guides/command-line/terminal-output),
which any package can use on its own — the reference for every widget, the
three modes and the colour rules is there. What follows is what a command
reaches for.


```ts
this.ui.table()
  .head(['Migration', 'Status'])
  .row(['1590591892626_tenants.ts', this.colors.green('DONE')])
  .render()

this.ui.sticker()
  .add('Server started')
  .add(`Address: ${this.colors.cyan('http://localhost:3333')}`)
  .render()

this.ui.instructions()
  .add('cd my-app')
  .add('ream dev')
  .render()

await this.ui.tasks()
  .add('clone repo', async (task) => {
    task.update('50%')
    return 'Completed'
  })
  .add('install', async (task) => task.error('Network failure'))
  .run()
```

Columns align on **visible** width: a coloured cell carries ANSI codes that must
not shift the table. A cell may be an object `{ content, hAlign: 'right' |
'center' }`, and `table.fullWidth()` stretches the table to the terminal width
(the first column absorbs the slack).

A task sequence stops at the first failure — later steps usually depend on it.
`run()` returns each task's outcome. By default `task.update()` prints nothing
and only the last message shows on the final line; `this.ui.tasks({ verbose:
true })` prints every step — what a `--verbose` flag turns on.

`this.logger.info(msg, { prefix, suffix })` decorates one message, and
`this.logger.await('installing', { suffix: 'npm i' })` returns an animation
(`start()`, `update()`, `stop()`) that only animates on a real terminal.

### Actions

```ts
const create = this.logger.action('creating config/auth.ts')
try {
  await write()
  create.displayDuration().succeeded()
} catch (error) {
  create.failed(error)
}
```

`succeeded()`, `skipped('reason')`, `failed(error)`. `this.logger.prefix(...)`
and `.suffix(...)` wrap every message.

### Testing the output

```ts
kernel.ui.switchMode('raw')
const command = await kernel.exec('report')

kernel.ui.getLogs() // ['bold(Name)', '──────────', 'green(Ada)']
```

In `raw` mode nothing reaches the terminal and every line is kept. Colours are
written `green(Ada)` rather than as escape sequences, so a test expectation
stays readable and diffable.

The command carries the assertions:

```ts
command.assertSucceeded()          // or assertFailed() / assertExitCode(2)
command.assertLog('[ blue(info) ] Hello world')
command.assertLog('[ yellow(warn) ] careful', 'stderr')
command.assertLogMatches(/Hello/)
command.assertTableRows([['Ada', 'ada@example.ch']])
```

An optional `@args.spread()` left unfilled is `undefined`, not an empty array
a command distinguishing "no target given" from "an empty list of
targets" cannot do it against a silent `[]`.

`assertTableRows` compares **data**, not layout: a column growing wider does not
break the test. The check is an *inclusion* — every expected row must
be present, in any order — and the header counts as a row, so restating it is
optional:

```ts
command.assertTableRows([
  ['Name', 'Email'],          // the header, if you want to check it
  ['Ada', 'ada@example.ch'],
])
```

On failure the message prints the real output, with the stream each line went
to. Also available: `assertNotExitCode(code)`.

### Declaring without decorators

```ts
Provision.defineFlag('email', { type: 'string', required: true })
Provision.defineArgument('name')
Provision.serialize()   // metadata as plain data
```

Useful for a command built at runtime, or in a package that must not import the
framework's decorators. `this.isMain` tells whether the command was invoked from
the command line rather than through `consoleApp.exec()`.

`serialize()` describes the **contract** (name, `namespace`, description, help,
aliases, options, inputs) and stays JSON-safe: the `parse` callbacks are
stripped. It is also what `ream list --json` prints.

The rest of the static surface is there:

```ts
Provision.boot()               // give THIS class its own declarations
Provision.getParserOptions()   // { flagsParserOptions, argumentsParserOptions }
Provision.validate({ args: ['Ada'], unknownFlags: [] })
```

`boot()` is called by everything that reads or writes those statics: without it
`Child.args.push(...)` would append to the array the parent declared, and the
whole hierarchy would share one list. `validate()` applies the rules the parser
already applies while parsing — required arguments, required flags, missing
value, invalid number, unknown flag — its purpose being the hand-built input
that never went through a parser.

`defineArgument()` refuses two impossible orders: an argument after
a `spread` one (which consumes the tail, so nothing behind it is reachable) and
a required argument behind an optional one (calling it required would promise
something the command line cannot deliver). The decorators enforce the same
rules — it is the same check.

### Empty values

An empty value is **refused** by default: `ream note "$MSG"` with
`MSG` unset is almost always a shell variable that did not expand, not an empty
note. `allowEmptyValue` says otherwise when empty means something:

```ts
@args.string({ allowEmptyValue: true })
declare body: string

@flags.string({ allowEmptyValue: true })
declare tag: string
```

The rule is enforced by the parser **and** by `validate()`: `--tag` on its own
then yields the empty string instead of throwing.

On the instance: `this.hydrate()` — which assigns **by declaration**, so
positionals are accepted as a list (the parsed shape) or keyed by property name (what
`this.parsed.args` holds), and flags by either flag or property name; idempotent,
called by the kernel before `run()` — `this.exec()` — which hydrates, runs `run()` and **rethrows**, unlike
the kernel which records the failure on the command — and the `this.commandName`,
`this.options`, `this.args`, `this.flags` getters.

`command.toJSON()` describes one **execution**: `args` (the positionals, as a
list), `flags`, `result`, `error`, `exitCode`.

The assertions and `toJSON()` are attached by the kernel to **every** command it
runs, including a class declared without `BaseCommand` — so the return type of
`exec()` promises nothing that would be missing at runtime.
