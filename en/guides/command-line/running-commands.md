# Running commands

This guide covers discovering, inspecting and running commands:

- Discovering and inspecting
- CLI commands
- Running a command from code
- Commands shipped by a package

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
```

Two *application* commands claiming
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

Middleware files take the `Middleware` suffix; events and listeners take none.

### File conventions — organised by module

Ream's generators are organised **by module**, not by type:
`ream make:controller billing Invoice` writes `app/billing/InvoiceController.ts`.
Module boundaries are structural in Ream.

Artifacts that belong to no module go to fixed locations:
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
  const command = await consoleApp.exec('make:controller', ['billing', 'Invoice'])

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
consoleApp.getAliasCommand('recontrol')       // the command behind an alias
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

`Kernel.commandExecutor` is the build-and-run seam. The default executor
already injects dependencies: the container builds the command and calls its hooks. To replace it:

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

### The framework's own commands

Ream ships some too — `migrate`, `migrate:rollback`, `migrate:status`,
`schedule:list`, `schedule:run` — through the same loader shape, at
`@c9up/ream/commands`. The difference is that nobody registers them: the
Ignitor loads that loader first, before discovery and before `reamrc.commands`.

These were subcommands of the `ream`
binary before they were classes, and an application that upgrades must not
silently lose them. Loading them first also means an application that defines a
command of the same name in `commands/` wins — the later registration replaces
the framework's.
