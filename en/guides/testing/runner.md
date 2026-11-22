# The test runner

This guide covers the helix test runner:

- What fails a run
- Timeouts
- package.json scripts
- Diff coverage in monorepos

## CLI runner (`helix test`)

```sh
helix test                       # run the suite once
helix test app                   # run only the tests under ./app
helix test --watch               # re-run on file change
helix test --coverage            # V8 coverage + LCOV + thresholds
helix test --diff-cov            # diff coverage vs `main`
helix test --tsx=false           # use the parent's loader instead of tsx
```

### What fails a run

A run that executes nothing is not a pass. `helix test` exits 1 when
discovery finds no test file, when a path, a `--files` filter or a named
suite matches nothing — a selection narrows the run, it never widens to the
whole tree — and when a file declares no test. `--pass-with-no-tests` (or
`passWithNoTests` in `helix.config.ts`) accepts an empty run.

Under CI (`CI` set), a `.only` or a `.pin()` fails the tests it selects
instead of narrowing the run, so one left in a commit cannot turn the build
green. `--allow-only` (or `allowOnly`) lets it narrow anyway;
`--allow-only=false` forbids it everywhere.

An error nobody handled — a floating rejection, a timer that throws — is a
file error reported beside the file's results, on both pools, including one
raised after the file reported. So is a worker that exits with a status its
results do not explain, and a runner teardown (`api.cleanup`) that throws. A
`.resolves` / `.rejects` assertion the test never awaited fails that test.

What a test prints reaches the terminal once its file finishes, under a
`stdout | <file>` or `stderr | <file>` header, so parallel files do not
interleave. `--silent` drops it; with `--reporter=json` it goes to stderr so
stdout stays parseable.

### Timeouts

`--timeout` is per test. From highest to lowest: the test's own timeout,
`--timeout`, the suite's `timeout`, `configure({ timeout })` or a plugin
editing `api.config.timeout`, the config file's `timeout`, then 60 s.
`beforeEach` / `afterEach` hooks and `test.setup` / `test.teardown` run under
their test's deadline and fail that test, named, when they hang.

A separate per-file deadline (`--file-timeout`, `fileTimeout`, 10 minutes by
default) kills a worker stuck where no test timeout reaches, such as a
synchronous loop. Killing a worker kills its whole process group, so what
its tests spawned does not outlive it. A worker whose CLI dies without
cleaning up (SIGKILL, an out-of-memory kill) notices and exits with its
process group too.

`helix test` sets `NODE_ENV=test` before it reads the config or runs the
bootstrap's `runnerHooks`, and the suites resolve their files before
`runnerHooks.setup` runs: a `files` callback that throws leaves nothing set
up.

### package.json scripts

Use the `helix` bin directly — in npm scripts it resolves to
`node_modules/.bin/helix`, which already bootstraps the TS loader. There is **no
need** for the verbose `node --import tsx node_modules/@c9up/helix/bin/helix.js …`
form:

```json
{
  "scripts": {
    "test": "helix test app --threads=1",
    "test:coverage": "helix test app --threads=1 --coverage"
  }
}
```

`app` is the test path (run only `./app`); `--threads=1` runs serially — pick it
when a suite shares process state (e.g. one in-memory SQLite DB, fake timers),
and drop it to parallelise independent suites.

### Diff coverage in monorepos

`diffCoverage.cwd` defaults to `coverage.root` and the runner accepts any
direction where the two paths share ancestry:

- `cwd` is an ancestor of `root` (typical monorepo: `cwd` = git root,
  `root` = `packages/foo/src`)
- `cwd` is a descendant of `root` (single-repo classic)
- `cwd === root`

Only **fully disjoint** trees are refused (silent 0% overlay otherwise).
