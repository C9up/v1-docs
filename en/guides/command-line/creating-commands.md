# Creating commands

This guide covers writing a console command:

- Creating a command
- Arguments and flags
- Command options
- Dependency injection
- Output and interaction
- Command lifecycle
- Transforming an input: `parse()`
- `this.parsed`
- Global flags
- Long-running commands: `terminate()`
- Command aliases
- A command's long help
- Colour

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
| `drivesMigrations` | This command IS the migration run, so booting must not do it for it. Sets `REAM_SKIP_BOOT_MIGRATE=1` before the application starts, which a data package watches for. Without it, a package that migrates on boot for the convenience of `dev` applies everything a moment before the command runs — leaving `migrate` with nothing to report and `migrate:status`, asked only to look, having changed the schema it reports on. |

## Dependency injection

A command declaring `startApp: true` is built **by the container**. Dependencies
can be injected into the lifecycle methods:

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

Constructor injection works too:

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
    if (this.error) this.logger.error(this.error instanceof Error ? this.error : String(this.error))
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
    recontrol: 'make:controller --force',
  },
})
```

`ream recontrol billing Invoice` then runs `ream make:controller --force billing Invoice`.

The kernel also takes them at runtime — that is what the rc file does, and what
a loader can publish in its metadata:

```ts
kernel.addAlias('recontrol', 'make:controller --force')
kernel.getAliases()                  // ['recontrol']
kernel.getAliasCommand('recontrol')  // make:controller's metadata
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
