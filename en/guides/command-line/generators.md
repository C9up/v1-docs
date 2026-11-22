# Generators

This guide covers creating projects and generating code:

- Creating a Project
- Add a Package
- Code Generation
- The application's own commands

## Creating a Project

`ream new` asks for a template and a database. Each prompt is skipped by
passing its flag, and `--yes` takes the default for whatever is left — so the
command runs in CI, in a container, or from a script, where there is no
terminal to prompt on:

```bash
ream new my-app                                # interactive
ream new my-app --template api --db postgres   # no prompt at all
ream new my-app --yes                          # api + postgres
ream new my-app --template slim --yes          # slim + postgres
```

| Flag | Values | Default |
| --- | --- | --- |
| `--template` | `api`, `web`, `microservice`, `slim` | `api` |
| `--db` | `postgres`, `sqlite` | `postgres` |
| `--yes`, `-y` | — | take the defaults for anything not passed |
| `--pkg` | `pnpm`, `npm`, `yarn` | the one that launched `ream` (`pnpm dlx`, `npx`, `yarn dlx`), else `pnpm` |
| `--git-init` | — | run `git init` in the project before the install |

The destination is a path: `ream new apps/api` creates `apps/api` (and its
parents) and names the package `api`; `ream new .` fills the directory you
stand in. An existing directory is accepted only when empty. `pnpm-workspace.yaml`
is written for pnpm alone.

An unknown value is rejected before any prompt runs, so a typo reports itself
as a command-line error rather than as a missing terminal.

## Add a Package

```bash
ream add @c9up/atlas                                  # install + configure in one step
ream add @c9up/photon --dev                           # devDependency
ream add @c9up/atlas --force                          # overwrite existing config files
ream add @c9up/some-pkg --transports=smtp --queue=redis  # forward flags to configure()
ream add @c9up/atlas @c9up/warden                     # several packages, one install
ream add @c9up/atlas --package-manager npm            # choose the package manager
```

`ream add` installs every package it is given in one command, then runs each configure hook in turn, with the same flags; a hook that fails does not stop the next one, and the command fails at the end naming them. `--package-manager <pnpm|npm|yarn>` skips the detection. Otherwise it auto-detects your package manager from the lockfile (`pnpm-lock.yaml` > `yarn.lock` > `package-lock.json`), runs the install (`<pm> add [-D] <pkg>`), then dispatches to `ream configure <pkg>`. Unknown flags after the package name are forwarded to the package's `configure()` hook, parsed in `command.parsedFlags` and raw as its second argument (`Record<string, string[]>`). A hook may ask questions through `command.prompt`; without a terminal (or under `CI`) a question takes its default, or the command fails with `E_CONSOLE_NOT_INTERACTIVE` — pass the answer as a flag instead. If the package has no configure hook, the install still succeeds and `ream add` exits 0 with a one-line note — see the FAQ in the [installation guide](/en/start/installation#adding-a-ream-package).

If multiple lockfiles coexist (e.g. a stale `package-lock.json` next to `pnpm-lock.yaml`), the precedence wins and a warning naming the ignored lockfile is printed to stderr. If no lockfile is present, `ream add` exits non-zero with a clear error and the manual two-step fallback (`pnpm add <pkg> && ream configure <pkg>`).

Authors: see [Plugin System](/en/guides/concepts/extending) for how to ship a configurable plugin.

## Code Generation

A module generator writes into `app/<module>/`; the rest write into the
directory their kind lives in.

```bash
ream make:controller order Order       # app/order/OrderController.ts
ream make:service order Payment        # app/order/PaymentService.ts
ream make:entity order OrderItem       # app/order/OrderItem.ts       (table: order_items)
ream make:validator order CreateOrder  # app/order/CreateOrderValidator.ts
ream make:module order Order           # the entity, the controller and the validator at once

ream make:provider Stripe              # providers/StripeProvider.ts
ream make:command app:provision        # commands/app-provision.ts
ream make:middleware auth              # app/middleware/auth_middleware.ts
ream make:event orderShipped           # app/events/order_shipped.ts
ream make:listener sendMail --event orderShipped   # app/listeners/send_mail.ts
```

A generator never overwrites: a file that is already there is reported as
skipped and left alone, and `--force` is how you ask for the replacement. Two
more flags are shared by every one of them — `--dry-run` prints what would be
written without writing it, and `--json` reports the outcome as a single JSON
object on the last line of stdout, which is what `@c9up/ream-mcp` reads. When
`--force` does overwrite several files, a failure part-way through restores what
the same run had already written.

`make:middleware` takes `--stack server|named|router` (default `router`), which
picks the registration line the generated file suggests:

```ts
// ream make:middleware auth --stack named
/**
 * Register it in `start/kernel.ts`:
 *   router.named({ auth: () => import('#middleware/auth_middleware.js') })
 */
```

`make:migration`, `make:seeder` and `make:factory` are not here: they belong to
the data package, which knows where migrations live and what a migration
imports. Atlas ships them — see [its console commands](/en/guides/database/orm/migrations#console-commands).
That is also why `make:module` stops at three files: the migration it would
write is atlas' format and atlas' directory.

The generators themselves are console commands, not subcommands of the `ream`
binary. `ream make:controller …` is forwarded to the application's console the
same way `ream provision` is, so a project can replace any of them with its own
command of the same name.

### Customising what gets generated

Every `make:` template can be overridden per project. Eject one, edit it, and
the generator uses your copy from then on:

```bash
ream eject --list                     # what can be ejected, and the variables each stub reads
ream eject make/controller.stub       # writes stubs/make/controller.stub
ream eject make                       # the whole directory
ream eject                            # every stub the package ships
ream eject make/controller.stub --force   # replace a stub you already ejected
ream eject config/database.stub --pkg @c9up/atlas   # another package's stubs
```

A stub that is already there is left alone, so re-running `eject` never costs
you an edit.

A stub is plain text with `{{ variable }}` placeholders:

```
// stubs/make/controller.stub
import type { HttpContext } from '@c9up/ream'

export class {{ className }} {
  async index({ response }: HttpContext) {
    response.status(200).json([])
  }
}
```

An ejected stub IS the built-in template — the same string the generator
renders, not a copy of it — so ejecting one changes nothing until you edit it.
Delete the file to go back to the default.

`ream eject --list` names the variables each stub can read, taken from the
template itself. `{{ className }}` and `{{ name }}` are everywhere;
`{{ tableName }}` is the entity's, `{{ fileName }}` the snake_case stem a file
is written under, and `{{ registration }}` the middleware line above.

A stub can also choose where it writes, declared as front matter:

```
---
to: src/http/{{ module }}/{{ className }}.ts
---
export class {{ className }} {
}
```

Omit the front matter and the default path is used. The declared path goes
through the same validation as any generated path — no absolute paths, no `..`.

A stub is a template, not a substitution: besides `{{ expression }}` it takes
`{{#if}}` / `{{#elif}}` / `{{#else}}`, `{{#each list as item, index}}`,
`{{#var x = …}}`, `{{#expect a, b}}` and `{{! a comment }}`. It is the engine
`codemods.makeUsingStub()` uses for package configs, so there is one stub
dialect in the framework and one thing that renders it. A malformed stub is an
error rather than a silent fallback to the built-in.

**A stub cannot run code.** The template is read once and interpreted, never
compiled to JavaScript. An expression is the part of JavaScript a stub needs —
names, `a.b`, `a?.b`, `a[i]`, calls, `! - + * / %`, comparisons, `&& || ??`,
`? :`, `[…]` and `{…}` — and it reaches only what it is given: the state's own
properties and the `length` of a string or a list. No prototype
(`constructor`, `__proto__`), no global (`process`, `require`), no method a
value inherits (`name.toUpperCase()` is not a function): a helper is a function
the state passes, `{{ string.pascalCase(name) }}`.

`{{ }}` does not escape HTML, and `{{{ }}}` means the same thing — a stub
generates source files, not a web page, and escaping a `<T>` in a generated
type would be a bug rather than a protection.

## The application's own commands

Any name the binary does not define is dispatched to the application's console
kernel, with its flags intact:

```bash
ream provision --email you@example.com   # runs the app's `provision` command
ream list                                # every command, the binary's and the app's
ream list make --json                    # one namespace, as JSON
```

`ream` with no command, like `ream --help`, lists the binary's own commands and
runs nothing from the directory it is typed in: reading the application's
commands means executing its console entry, which only an explicit `ream list`
does. Inspecting a repository you just cloned is safe.

A command the app declares under a name the binary also uses — `dev`, `start`,
`build`, `test`, `repl`, `inspect`, `list` — wins: the listing marks it as
overriding the built-in, and dispatch sends the original argv straight through.
Those commands run the project anyway. `doctor`, `info` and `generate:key`
cannot be redefined: a file in `commands/` must not be able to answer a
diagnostic or receive the key it was asked to write. An alias counts as a
declaration, and so does an entry in `reamrc.commands`.

```bash
ream make:command app:provision   # commands/app-provision.ts, discovered automatically
```
