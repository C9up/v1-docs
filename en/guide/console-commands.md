# Console commands

Ream's console. A command is a class, its inputs are declared,
and the CLI runs it directly:

```bash
ream provision --email hugo@example.ch --name "Hugo Dubois"
```

No `pnpm exec tsx bin/my-script.ts`: any command `ream` does not define itself
is handed to the application's console kernel.

## Creating a command

```bash
ream make:command provision
```

That writes `commands/provision.ts`. Nothing to register: the `commands/`
directory is discovered automatically, subdirectories included. Files prefixed
with `_` are skipped — they are helpers, not commands.

```ts
import { BaseCommand, args, flags } from '@c9up/ream/console'
import type { CommandOptions } from '@c9up/ream/console'

export default class Provision extends BaseCommand {
  static commandName = 'provision'
  static description = 'Create the owner account'
  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'Owner email address', required: true })
  declare email: string

  @flags.string({ default: 'Owner' })
  declare name: string

  async run(): Promise<void> {
    const users = await this.app.container.resolve('users')
    await users.createOwner({ email: this.email, name: this.name })
    this.logger.success(`Owner created: ${this.email}`)
  }
}
```

## Arguments and flags

The decorators declare the inputs; the kernel parses, types and validates them
before `run()` is called.

| Decorator | Command line |
| --- | --- |
| `@args.string()` | positional: `ream greet Hugo` |
| `@args.spread()` | everything left: `ream greet a b c` (declare it last) |
| `@flags.string()` | `--email x`, `--email=x` |
| `@flags.boolean()` | `--force`, `--no-force`, `-f` |
| `@flags.number()` | `--batch 2` (a non-numeric value is rejected) |
| `@flags.array()` | `--tag a --tag b` → `['a', 'b']` |

Shared options: `argumentName` / `flagName` (the displayed name, defaulting to
the dash-cased property name), `description`, `default`, `required`, `alias` for
single-character shorthands, and `parse` to transform the value.

A boolean is always negatable (`--no-force`); `showNegatedVariantInHelp: true`
only decides whether help mentions it.

Validated for you: missing required argument, missing required flag, a
value-taking flag left without its value, a non-numeric number, and unknown
flags — reported with the list of accepted ones. `--` stops parsing: everything
after it is positional.

## Command options

```ts
static options: CommandOptions = { startApp: true }
```

| Option | Effect |
| --- | --- |
| `startApp` | Boots the application (providers, container, database) before `run()`. **False by default**: a command that only writes files has no reason to open a connection. Reading `this.app` without asking for it raises an error naming the fix. |
| `staysAlive` | Keeps the process alive after `run()` (worker, watcher). |
| `allowUnknownFlags` | Accepts undeclared flags instead of rejecting them. |

## Dependency injection

A command declaring `startApp: true` is built **by the container**. The form
Adonis documents is injection into the lifecycle methods:

```ts
export default class Notify extends BaseCommand {
  static commandName = 'notify'
  static description = 'Notifies the owners'
  static options: CommandOptions = { startApp: true }

  async prepare(@Inject('reporter') reporter: Reporter): Promise<void> {}

  async run(@Inject('users') users: UserService): Promise<void> {
    for (const owner of await users.owners()) {
      this.logger.info(owner.email)
    }
  }
}
```

**A Ream extension, not parity:** constructor injection also works here. Adonis's
examples only ever use method injection, so a command written with an injected
constructor ports *to* Ream, not necessarily the other way round.

```ts
constructor(@Inject('mailer') private mailer: Mailer) {
  super()
}
```

Every execution gets its own instance: two `consoleApp.exec()` calls share no state.

Without `startApp` there is no container: the command is constructed directly
and its methods called as-is. That is the case for a generator, which needs
nothing but the filesystem.

## Output and interaction

`this.logger`: `info`, `success`, `warning`, `error`, `fatal`, `debug` (active
when `DEBUG` is set), `log`. The alert levels write to stderr so data output
stays pipeable.

`this.prompt`: see "Asking questions" below.

For a non-zero exit without throwing: `this.exitCode = 1`.

## Command lifecycle

The kernel calls, in this order: `prepare()`, `interact()`, `run()`, then
`completed()`. Only `run()` is required.

```ts
export default class Provision extends BaseCommand {
  static commandName = 'provision'
  static description = 'Create the owner account'

  async prepare(): Promise<void> {
    // before anything else — open a file, prepare state
  }

  async interact(): Promise<void> {
    // interactive questions belong here
  }

  async run(): Promise<void> {}

  async completed(): Promise<boolean> {
    // runs EVEN IF an earlier stage threw: the error is on `this.error`.
    // Returning `true` marks it handled.
    if (this.error) this.logger.error(this.error as Error)
    return true
  }
}
```

## Transforming an input: `parse()`

```ts
@args.string({ parse: (value) => String(value).toUpperCase() })
declare name: string

@flags.number({ parse: (value) => Number(value) * 2 })
declare retries: number
```

The callback receives the **already-typed** value (a number for a number flag)
and is not called for an absent optional input.

## `this.parsed`

Every parsed input, in the parser's shape. `this.parsed` describes **what was typed**;
the command's properties hold the assigned values.

```ts
// ream hire Ada --user-email=ada@example.ch
this.userName            // 'Ada'          ← the declared property
this.parsed.args         // ['Ada']        ← a LIST, in declaration order
this.parsed.flags        // { 'user-email': 'ada@example.ch' }  ← COMMAND-LINE name
```

Also: `this.parsed.unknownFlags` — the *names* of flags passed but not
declared —, `this.parsed.extraArgs` (exposed as `_` as well) —
positionals beyond what the command declared, normally an error and only kept
for an `allowUnknownFlags` command whose whole job is to forward what it is
given — and `this.parsed.nodeArgs`, the arguments node itself was started with.

## Global flags

A flag **every** command accepts, without any of them redeclaring it (the
`kernel.defineFlag`):

```ts
kernel.defineFlag('verbose', { type: 'boolean', description: 'Say everything' })
kernel.on('verbose', (Command, kernel, parsed) => {
  if (parsed.flags.verbose === true) enableDebugLogs()
})
```

`kernel.flags` lists the global flags, and every command's help prints them
under "Global flags". They show up in `this.parsed.flags` but are **not**
assigned to the command's properties: they steer the CLI, not the command. A
command redeclaring the same name keeps its own.

The listener runs only for the command invoked from the command line, before it
is built — returning `true` stops there, without running the command or booting
the application. That is how `--ansi` / `--no-ansi` are implemented, and they
can be written before or after the command name. A command redeclaring the name
owns it end to end: its own flag is parsed, and the global listener is not
called.

`consoleApp.exec()` does **not** accept the global flags: they belong to the
command line. Passing `--no-ansi` to `exec()` means passing a flag the command
does not declare, and being told so is the point.

A global flag declared after a command has already run throws: it could no
longer have any effect.

## Long-running commands: `terminate()`

A `staysAlive: true` command keeps the process alive; `await this.terminate()`
is what hands control back and shuts the application down cleanly.

## Command aliases

A command can carry its own aliases:

```ts
export default class Welcome extends BaseCommand {
  static commandName = 'app:welcome'
  static description = 'Welcomes you'
  static aliases = ['welcome', 'hi']
  async run(): Promise<void> {}
}
```

The application can define more in `reamrc.ts` — `commandsAliases`, and
the form that also takes flags:

```ts
export default defineConfig({
  commandsAliases: {
    resource: 'make:controller --resource',
  },
})
```

`ream resource users` then runs `ream make:controller --resource users`.

The kernel also takes them at runtime — that is what the rc file does, and what
a loader can publish in its metadata:

```ts
kernel.addAlias('resource', 'make:controller --resource')
kernel.getAliases()                  // ['resource']
kernel.getAliasCommand('resource')   // make:controller's metadata
```

## A command's long help

`static help` is printed under the usage line. `{{ binaryName }}` is substituted
with the binary's name, so an example stays runnable:

```ts
static help = ['Example: {{ binaryName }} provision --email a@b.ch']
```

## Colour

`--ansi` forces colour, `--no-ansi` disables it. They are **global flags**: every command accepts them, before or after the command
name, and they are never assigned to your command's properties (they stay
readable in `this.parsed.flags`). `NO_COLOR` and `FORCE_COLOR` are honoured too.

## Terminal UI

`this.ui` and `this.colors` complete `this.logger`.

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

## Asking questions

`this.prompt` covers the whole prompt surface:

```ts
await this.prompt.ask('Model name', { default: 'User' })
await this.prompt.secure('Password', {
  // masked input — one asterisk per character typed
  validate: (value) => (value.length < 6 ? 'At least 6 characters' : true),
})
await this.prompt.confirm('Continue?')
await this.prompt.toggle('Delete everything?', ['Yup', 'Nope'])
await this.prompt.choice('Database', [
  { name: 'pg', message: 'PostgreSQL' },
  { name: 'sqlite', message: 'SQLite' },
])
await this.prompt.multiple('Drivers', ['sqlite', 'mysql', 'pg'])
await this.prompt.autocomplete('Your city', cities, { limit: 10 })
```

Shared options: `default`, `name`, `hint`, `validate` (returns `true` or the
error message), `result` (transforms the returned value), and `format`.

`format` **does not change the returned value**: it only affects
display. Use `result` to transform. (Live echo formatting needs raw mode, so
here `format` only shapes the default that is shown.)

For `choice`, `multiple` and `autocomplete`, `default` is an **index** (or a
list of indexes), as in Adonis — an empty answer selects that option, and the
label shows its name.

`multiple()` receives the **whole selection** in `validate` and `result`, not
each item: the prompt's value *is* the array, and a rule like "at least two"
would otherwise be inexpressible.

```ts
await this.prompt.multiple('Drivers', ['sqlite', 'mysql', 'pg'], {
  validate: (values) => (values.length >= 2 ? true : 'Pick at least two'),
  result: (values) => values.join('+'),
})
```

`result` applies to `confirm` and `toggle` too: the return type follows what the
function returns.

On a non-interactive stdin — CI — a prompt **fails immediately** instead of
waiting for a keypress that will never come.

### Testing an interactive command

Hand the prompt to the kernel and script the answers. Without this, a command
that asks a question is not testable: it would wait on a terminal that is not
there.

```ts
const prompt = new Prompt()
prompt.trap('thing-name').replyWith('Widget')
prompt.trap('overwrite').accept()

const kernel = new Kernel({ prompt }).register(MakeThing)
const command = await kernel.exec('make:thing')

command.exitCode // 0
```

`trap(name)` targets `options.name`, or the message when you give none.
`replyWith`, `accept`, `reject`, `chooseOption(index)`, `chooseOptions([...])`.

A scripted answer goes through the **same validation** as a typed one. If it
fails, the prompt throws: there is nobody to re-ask, and a test injecting a
value the real prompt would refuse gives unearned confidence.

**A deliberate difference:** selection prompts are answered by typing a number,
not with arrow keys. Keyboard navigation means raw mode, cursor control and
redrawing — a widget library, which is what enquirer is. Everything else —
method names, options, traps — is there.

## Discovering and inspecting

`ream <command> --help` and `ream help <command>` reach the same place: the
`help` command. `--help` is a **global flag** whose listener runs it — and it
runs *before* the inputs are validated, so the help of a command with a required
flag is printed instead of a complaint about the flag.

```bash
ream                      # no command: same as `ream list`
ream list                 # CLI and application commands
ream list make db         # only those namespaces
ream list --json          # the same list, for scripts
ream help provision       # the same help, through the `help` command
ream provision --help     # arguments, flags, defaults
```

`list` and `help` are registered **commands**, not branches in the dispatcher:
`consoleApp.hasCommand('list')` is true, `consoleApp.exec('list', ['--json'])` works,
`ream help list` prints its help, and `ream list --bad` is rejected like any
other unknown flag. A bare invocation (`ream`) runs it as the default command.

The commands the kernel registers for itself are **replaceable**: an
application writing its own `list` under `commands/` wins, on both sides
(`ream list` as well as `bin/console.ts`). Both classes are exported, so you can
extend one instead of starting over:

```ts
import { HelpCommand, ListCommand } from '@c9up/ream'
``` Two *application* commands claiming
one name is still an error (`E_CONSOLE_DUPLICATE_COMMAND`): nothing can
arbitrate between them.

`list --json` prints each command's full contract — the same one `serialize()`
returns — whether it comes from the binary or from the application: enough to
build help, completions or a command palette with no special case. A namespace
nothing matches is an **error** (exit code 1): an empty list would read as "this
namespace holds nothing" rather than "no such namespace".

## CLI commands

```bash
ream generate:key                       # writes a fresh APP_KEY into .env
ream generate:key --show                # prints one, writes nothing (secrets manager)
ream repl                               # shell: `app`, `container`, `await resolve(token)`
ream make:middleware auth               # app/middleware/auth_middleware.ts
ream make:middleware auth --stack=server # server | named | router (default)
ream make:event orderShipped            # app/events/order_shipped.ts
ream make:listener sendMail --event=orderShipped  # app/listeners/send_mail.ts, typed
```

`generate:key` refuses to write `.env` when `NODE_ENV=production` — replacing the
key there invalidates every session and signed URL in circulation. Use `--show`
for a secrets manager, or `--force` deliberately.

Suffixes follow Adonis: `Middleware` for middleware (which they document), none
for events and listeners.

### File conventions — a deliberate difference from Adonis

Ream's generators are organised **by module**, not by type:
`ream make:controller billing Invoice` writes `app/billing/InvoiceController.ts`,
where Adonis would write `app/controllers/invoices_controller.ts`. That is a
deliberate choice: module boundaries are structural in Ream, and matching Adonis
would break existing projects.

Artifacts that belong to no module do follow Adonis's locations:
`app/middleware/`, `app/events/`, `app/listeners/`, `providers/`,
`database/migrations/`, `database/seeders/`, `commands/`.

### Overriding a CLI command

An application command wins over the binary's. Declare
`static commandName = 'build'` in `commands/build.ts` and `ream build` runs yours.

Detection reads the `commandName` literal across `commands/` without starting
Node — otherwise every command would pay a boot. The trade-off: a name computed
at runtime stays invisible and the built-in wins. `ream make:command` always
emits a literal.

## Running a command from code

The programmatic façade. Useful to test a command without
spawning a process, or to trigger one from the application.

```ts
import consoleApp from '@c9up/ream/services/console'

await consoleApp.boot()

if (consoleApp.hasCommand('make:controller')) {
  const command = await consoleApp.exec('make:controller', ['user', '--resource'])

  command.exitCode  // 0 on success, 1 on an unhandled failure
  command.result    // whatever run() returned
  command.error     // the error, if it survived completed()
}
```

`exec()` **rejects** when the command fails: the error is recorded
on the command (`error`, `exitCode` 1) and *then* rethrown, so a caller cannot
mistake a failure for a success by forgetting to look. The process exit code is
left alone — only the command line owns it.

To inspect a failing command rather than catch, two paths:
`kernel.create(Command, argv)` builds the instance without running it (parsed,
injected, hydrated) and you drive it; or `handle()` then
`kernel.getMainCommand()`.

These also throw, before execution even starts: unknown name
(`E_CONSOLE_COMMAND_NOT_FOUND`), missing required argument, unknown flag.

`hasCommand()` is **synchronous**: call `await consoleApp.boot()` first. An
async version would return a Promise — always truthy — so
`if (consoleApp.hasCommand(x))` would take every branch.

`consoleApp.getCommands()` returns the **metadata** (`serialize()`, rc-file aliases
included), not the classes: this is the introspection surface, and handing out
the constructors invites instantiating a command outside the kernel, where
nothing injects its dependencies or runs its lifecycle. `kernel.find(name)`
gives the class when one is genuinely needed.

The rest of the introspection is there too, on the façade and on the kernel:

```ts
consoleApp.getCommand('make:controller')      // metadata, or null
consoleApp.getNamespaceCommands('make')       // the commands of a namespace
consoleApp.getNamespaceCommands()             // the ones without a namespace
consoleApp.getNamespaces()                    // ['db', 'make', …]
consoleApp.getAliases()                       // the registered alias names
consoleApp.getAliasCommand('resource')        // the command behind an alias
consoleApp.getCommandAliases('make:controller')
consoleApp.getCommandSuggestions('make:contoller')  // close names
consoleApp.getNamespaceSuggestions('mak')
```

All of them read the registry, so all of them need `boot()`: answering from an
empty registry would make "unknown command" and "commands not loaded yet"
indistinguishable.

### Kernel lifecycle

`kernel.getState()` returns `idle` → `booted` → `running` → `completed`. Two
rules follow: a global flag or a loader can only be added while `idle` — later,
the commands are loaded and the parser options built, so adding one would do
nothing — and once the command line's command has finished, the kernel is
`completed` and refuses to run any more (make a fresh one).

`kernel.getDefaultCommand()` gives the command run when none is named (`list`,
or the application's own if it replaced it) and `kernel.getMainCommand()` the
instance invoked from the command line, once built. One kernel drives **one**
command line: a second `handle()` throws.

The default command is replaced by subclassing:

```ts
class MyKernel extends Kernel {
  static defaultCommand = Welcome
}
```

### Errors and the executor

`handle()` does not rethrow: the command line owns the process, and there is
nobody to hand the error to. It is **rendered** by `kernel.errorHandler`, and
both `kernel.exitCode` and `process.exitCode` become 1.

The default renderer is the `ExceptionHandler` class. It tells two families
apart: a **call error** — missing flag, unknown command, invalid value — is
reported as one line, without a stack (the parser's stack teaches nothing to
someone who mistyped); everything else is printed in full. Extend it to change
one step:

```ts
// From the package root it is called `ConsoleExceptionHandler`: Ream already
// exports an HTTP `ExceptionHandler`.
import { ExceptionHandler } from '@c9up/ream/console'

class MyHandler extends ExceptionHandler {
  override async render(error: unknown, kernel: Kernel) {
    myReporter.capture(error)
    await super.render(error, kernel)
  }
}

kernel.errorHandler = new MyHandler()
```

`knownErrorCodes` adds your own codes to the one-line family, and `debug = false`
replaces the full stack with a summary.

`exec()`, the programmatic path, is the one that rejects.

`Kernel.commandExecutor` is the build-and-run seam — the very one AdonisJS
replaces to add dependency injection. In Ream the default executor already does
it: the container builds the command and calls its hooks. To replace it:

```ts
class MyKernel extends Kernel {
  static commandExecutor = {
    create: (Command, parsed, kernel, context) => kernel.buildCommand(Command, parsed, context),
    run: (command, kernel) => kernel.runLifecycle(command),
  }
}
```

`run()` covers `prepare`, `interact` and `run`; `completed` stays with the
kernel, which must call it even when the rest threw.

`kernel.info` is what the CLI says about itself — binary name, versions —
printed above the command listing:

```ts
kernel.info.set('binary', 'ream')
kernel.info.set('Framework version', '0.1.13')
```

### Loaders

Where commands come from. Ream registers one for you — the `commands/`
directory and `reamrc.commands` — and `kernel.boot()` is the single moment
everything enters the registry:

```ts
import { FsLoader, ListLoader } from '@c9up/ream'

kernel.addLoader(new ListLoader([MyCommand, AnotherCommand]))  // classes
kernel.addLoader(new FsLoader('./commands'))                   // a directory
kernel.addLoader({                                             // your own
  getMetaData: async () => [MyCommand.serialize()],
  getCommand: async (metadata) => (metadata.commandName === 'my:cmd' ? MyCommand : null),
})
await kernel.boot()
```

The aliases a loader announces in its metadata are registered at boot: a
manifest-style loader can publish them without the class repeating them in
`static aliases`. A loader can also be an async function building it on
demand.

Loading is **lazy**: `boot()` reads metadata only. Listing the
commands, describing one, answering `hasCommand()` — all of it works without
importing anything. `getCommand()` is called when `find()` needs the class,
that is when the command is actually asked for, and once. (The `commands/`
loader imports the files to read their metadata: without a manifest there is no
other way — the `FsLoader` does the same.)

### Commands manifest

Scanning a directory means importing every file in it. `IndexGenerator` writes a
manifest next to the built commands to avoid that:

```ts
import { IndexGenerator } from '@c9up/ream'

await new IndexGenerator('./dist/commands').generate()
// writes commands.json, main.js and main.d.ts
```

`main.js` is a loader: `kernel.addLoader(await import('./dist/commands/main.js'))`.
Listing the commands then reads one JSON, and a command is imported only when it
runs.

Around it, the kernel also exposes `Parser`, `commandExec` (a
`diagnostics_channel` traced on every run), and the `validateCommand`,
`validateCommandMetaData`, `renderErrorWithSuggestions`, `sortAlphabetically`
helpers — what a hand-written loader needs.

### Hooks

```ts
kernel.finding((commandName) => {})   // before a name is resolved
kernel.loading((metadata) => {})      // before the class is loaded
kernel.loaded((command) => {})        // after
kernel.executing((command, isMain) => {})  // before it runs
kernel.executed((command, isMain) => {})   // after, success or failure
```

`isMain` tells the command line's command from the others. The execution hooks
carry the **instance**, whose type is the structural contract: the name lives
on its class.

All paths go through `find()` — `ream <command>`, bare `ream` and `consoleApp.exec()` —
so a listening tool sees them all. `loading` / `loaded` fire when a command is
**found**, not at boot: booting only reads what the loaders offer. `executed`
does **not** fire when the command failed: that hook counts finished runs.

### `find()` and a per-`exec()` UI

`kernel.find(name)` is **async and throws** when nothing matches; aliases
are resolved. `exec()` takes a UI:

```ts
const ui = new Ui()
ui.switchMode('raw')
await consoleApp.exec('report', [], { ui })   // output captured, the kernel's own untouched
```

Commands are loaded on first use, once, even under concurrent calls. `exec()`
does it for you; `await consoleApp.boot()` forces it explicitly.

The façade is also in the container (`await container.resolve('console')`), and
`ignitor.consoleApp()` builds it outside any service context.

## Commands shipped by a package

**This is the only way a package adds a command.** A package never touches the
`ream` binary: the CLI dispatches any name it does not own to the application's
console kernel, so a command registered here is reachable as `ream <name>`
with no release of anything but the package.

Discovery only sees the application's `commands/` directory. A command
distributed inside a package is declared in `reamrc.ts`:

```ts
export default defineConfig({
  commands: [() => import('@c9up/my-package/commands/my-command.js')],
})
```

A package with SEVERAL commands ships one loader instead, and stays one line
in the rc file. `getMetaData()` answers with the list, `getCommand()` imports a
class only when it is about to run — so `ream list` costs no imports:

```ts
// @c9up/my-package/commands
export async function getMetaData() {
  return [{ commandName: 'my:build', description: 'Build the thing' }]
}

export async function getCommand(metadata) {
  if (metadata.commandName === 'my:build') return (await import('./build.js')).default
  return null
}
```

```ts
commands: [() => import('@c9up/my-package/commands')],
```

The package's `configure()` should add that line itself, with
`codemods.registerCommand('@c9up/my-package/commands')`, so installing the
package is all a user does.

Do not declare a command that already lives in `commands/`: it would be
registered twice, and the kernel raises `E_CONSOLE_DUPLICATE_COMMAND`.
