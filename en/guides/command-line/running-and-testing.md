# Running and testing

This guide covers running and testing an application from the CLI:

- What `ream build` does
- Running the build output
- Filtering a run
- Coverage

## Running and testing

```bash
ream dev            # server + whatever builds the assets, under one Ctrl-C
ream build          # assets first, then TypeScript
ream build --ignore-ts-errors           # keep and finish the output despite type errors
ream build --tsconfig tsconfig.build.json
ream start          # node dist/bin/server.js
ream test           # the suites declared in reamrc.ts
ream test unit --bail --reporters spec,json --threads 4
ream repl           # a Node REPL with the app booted: `app`, `container`, `await resolve(token)`
ream inspect        # routes, providers, container bindings
```

### What `ream build` does

The output directory is emptied, the assets pipeline named in `reamrc.ts` runs,
the project's own `tsc` compiles (`node_modules/.bin`, up to a workspace root,
then `PATH` — never a download), and the manifest, the lockfile and whatever `metaFiles` names
are copied in beside the output. That last step is not a convenience:
`dist/reamrc.js` imports `#providers/AppProvider.js`, and Node resolves a `#`
specifier against the `package.json` governing the importing file — without one
in `dist/` it reaches the project's, whose map points at the TypeScript sources.

Emptied **first**, because `tsc` overwrites what it emits and never removes what
it no longer emits: a renamed or deleted module left its old `.js` behind, and
the next `ream start` went on importing it. A build that fails type-checking
takes its own output with it, so there is nothing half-compiled to start by
mistake — unless `--ignore-ts-errors` says to keep it.

Nothing is stripped. The development-only surface — the reload client, the
debug toolbar, the profiler routes — is gated on `NODE_ENV` at runtime, not at
build time, so what decides is how the process is started, not how it was
built. A built application run with `NODE_ENV=development` shows the toolbar;
with `NODE_ENV` unset or anything else, the response is byte-for-byte what the
handler produced.

### Running the build output

The build output is an application root of its own, and that is the folder a
deployment ships. Standing in it, `ream start` runs its `bin/server.js`, and any
other command goes to its compiled `bin/console.js` through plain `node` — no
TypeScript loader, which a production install does not have:

```bash
cd dist
ream start              # node bin/server.js
ream migration:status   # node bin/console.js migration:status
```

On Linux and macOS, `ream` does not stay between you and node: `start`, an
application command, `test`, `repl` and `inspect` hand the process over to node
(`exec`). A `docker stop`, a `kill -TERM`, a `timeout 600 ream test` or a
closed terminal therefore reaches the server, the queue worker or the test run
itself, which shuts down through its own hooks, and `ream` ends with node's
exit code. On Windows node runs as a child, as before.

`ream test` reads its suites from the rc file and hands them to the runner, so
the suite names and their globs live in one place rather than in a script. A new
`api` or `web` project already has them: a `unit` suite and a `functional` one,
`tests/bootstrap.ts`, and a first test. Only `functional` starts a server —
that is what its suite hook does, so a unit file pays nothing for it.

### Filtering a run

```bash
ream test --files=tests/functional/root.test.ts
ream test --tests="renders the home page" --groups=Users
ream test --tags=@slow --tags=~@flaky
ream test --failed                    # only what failed last time
ream test unit --timeout=5000 --retries=2
ream test --watch                     # re-run on change; --poll, --no-clear
```

`--files`, `--tests`, `--groups` and `--tags` are repeated for several values;
a value is never split on its commas, so a test title can hold one.

### Coverage

```bash
ream test --coverage
ream test unit --coverage --coverage-reporters=text-summary,lcov --coverage-dir=coverage
ream test --coverage --coverage-thresholds='{"lines":80,"functions":75}'
ream test --coverage --coverage-include='app/**/*.ts' --coverage-exclude='app/**/*.stub.ts'
```

Coverage belongs to the runner; the CLI only names the flags and carries the
values across, the same way it carries `--threads`. V8 records what the run
executed, so nothing has to be instrumented first.

What is measured, when the run names nothing, is the application layout —
`app/`, `start/`, `config/`, `commands/`, `database/`, plus `src/` for a package
driven by the same command. The runner's own default is `src/` alone, which an
application does not have: left at that, every run would print a report over
zero files. `--coverage-include` replaces that list rather than adding to it.

`--coverage-thresholds` takes a JSON object and fails the run when a metric
falls under it — the exit code is the run's, so CI needs no extra step. A
`--coverage-*` flag given without `--coverage` is refused rather than ignored:
it would collect nothing, and a green run with an empty report is the failure
mode worth naming.
