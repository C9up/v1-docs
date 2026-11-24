# helix

`@c9up/helix`: the test runner: a `helix test` CLI that runs each file in its own worker, a `test` / `describe` DSL with an injected test context, `expect` and `assert` assertions, `vi` mocks, container overrides and a frozen clock. Guide: [The test runner](/en/guides/testing/runner).

## Installation

```bash
pnpm add -D @c9up/helix
```

The `helix` binary loads TypeScript test files through `tsx` when it is installed (`--tsx=false` uses the parent's loader instead). A ream app drives helix through [`@c9up/helix-plugin-ream`](/en/reference/helix-plugin-ream) and `ream test`.

`helix test` runs through a Rust engine. The engine comes as one small package per platform, `@c9up/helix-<platform>`, for linux x64 and arm64 (glibc), macOS x64 and arm64, and Windows x64. `@c9up/helix` lists them as optional dependencies, and your package manager installs only the one that matches your machine. No Rust toolchain is needed. Do not install with optional dependencies turned off (`--no-optional`, `--omit=optional`): the engine would be left out.

Without the engine, a plain run throws `E_HELIX_NATIVE_REQUIRED`, and its message names the package to install, for example `@c9up/helix-linux-x64-gnu`. The load error is the exception's `cause`. A run with `--coverage`, `--diff-cov` or `--list-pinned`, or with a `reporterInstance` passed to `run()`, uses the TypeScript pool, which does not load the engine.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/helix` | The DSL (`test`, `describe`, `it`, hooks), `expect`, `vi`, `configure`, the test context, the event emitter, the container facade, and `time`. |
| `@c9up/helix/runtime` | The DSL and the in-worker engine, with the lower-level pieces (`executeRoot`, `equals`, `matchers`, …). |
| `@c9up/helix/runtime/worker` | `runTestFile()`: collects and runs one test file in the current process. |
| `@c9up/helix/container` | The container facade: `useContainer`, `override`, `overrideOn`, `clearActiveContainer`, `spy`. |
| `@c9up/helix/time` | `freeze`, `travel`, `travelTo`, `unfreeze`, `frozenAt`. |
| `@c9up/helix/runner` | The programmatic runner a host framework drives from its own config file. |
| `@c9up/helix/bin/helix.js` | The CLI script, also installed as the `helix` binary. |

## The `helix` binary

```sh
helix test [files...|dirs...|suites...] [flags]
```

Positionals name test files or directories. When every positional matches a suite declared in `helix.config.*`, they name suites instead. With no positional and a config present, every suite runs, in order. `test` is the only subcommand and the default one. `helix` sets `NODE_ENV=test` before reading the config.

A non-boolean flag takes its value after `=` (`--timeout=5000`); `--flag=false` (or `0`, `no`, `off`) turns a boolean off. An unknown flag is an error; `--` ends flag parsing.

| Flag | Value | Description |
|---|---|---|
| `--reporter` | `spec \| dot \| json` | Output format (`spec` by default). |
| `--reporters` | list | Reporters to activate together, comma-separated (`spec,json`). |
| `--threads` | number | Concurrent workers. |
| `--timeout` | ms | Per-test timeout. |
| `--file-timeout` | ms | How long one file may run before its worker is killed (default `600000`). |
| `--retries` | number | Extra attempts on failure (default `0`); `0` is accepted. |
| `--colors` | boolean | ANSI colours. |
| `--tsx` | boolean | Loads workers through `tsx` (default `true`). |
| `--include` | glob, repeatable | Glob patterns to include. |
| `--exclude` | glob, repeatable | Glob patterns to exclude. |
| `--grep` | string | Runs only tests whose full name matches (regex or substring). |
| `--tags` | list | Tag filter (`@fast`, `~@slow` excludes); any tag matches by default. |
| `--match-all` / `--matchAll` | boolean | Requires every `--tags` entry. |
| `--tests` | list | Exact test titles to run. |
| `--groups` | list | Exact group titles to run. |
| `--files` | list | Substrings matched against test file paths. |
| `--suite` | string | Name of the suite these files belong to (`meta.suite`). |
| `--bail` | boolean | Stops at the first failure. |
| `--bail-layer` | `group \| suite \| runner` | How far a bail reaches. |
| `--failed` | boolean | Re-runs only the tests that failed last run. |
| `--list-pinned` | boolean | Prints the tests marked `.pin()` and runs nothing. |
| `--silent` | boolean | Drops what the tests print. |
| `--pass-with-no-tests` | boolean | Exits 0 when no test file or no test is found. |
| `--allow-only` | boolean | Lets `.only` / `.pin()` narrow the run; off under CI unless set. |
| `--force-exit` | boolean | Calls `process.exit()` as soon as the run ends. |
| `--watch` | boolean | Re-runs on file changes. |
| `--poll` | boolean | With `--watch`: detects changes by polling. |
| `--watch-debounce` | ms | Debounce window of watch mode (default 200, max 5000). |
| `--only-changed` | boolean | Accepted; prints a notice and runs full discovery. |
| `--coverage` | boolean | V8 coverage collection. |
| `--coverage-reporters` | list | `text-summary`, `lcov`, `json-summary`. |
| `--coverage-dir` | path | Coverage output directory. |
| `--coverage-thresholds` | JSON | Inline thresholds, `{"lines":80,"functions":75}`. |
| `--diff-cov` | boolean | Diff coverage against a base branch (requires `--coverage`). |
| `--diff-cov-base` | ref | Git ref to diff against (default `origin/main`, then `main`). |
| `--diff-cov-thresholds` | JSON | Inline diff thresholds, `{"lines":80}`. |
| `--help`, `-h` | | Prints the help. |

### Reporter output

An error that carries a `code` keeps it in every reporter. `spec` prints the code in brackets before the message: `[E_HELIX_TIMEOUT] test "slow" exceeded 100ms timeout`. `dot` prints only `F` and `E`.

`json` writes one JSON object per line on stdout:

| `event` | Other field | Content |
|---|---|---|
| `file:start` | `file` | The absolute path of the file. |
| `file:end` | `result` | The file's `FileResult`: `file`, `suites`, `tests`, `totals`, `durationMs`. A failed test's `error` is a `SerializedError`: `name`, `message`, `code` when the error has one, `stack`, and `actual`, `expected`, `operator` for an assertion. |
| `file:error` | `error` | An error of the file outside its tests: `file`, `message`, `code`, `stack`. |
| `summary` | `summary` | `totals`, `files`, `fileErrors`, `durationMs`. |

`code` is absent when the error has none, for example a plain `Error` thrown by a test. A file error raised in the worker keeps the code of what was thrown. A file error the pool finds itself has a helix code: `E_HELIX_TIMEOUT` when the file ran past `--file-timeout`, `E_HELIX_WORKER_FAILED` when the worker failed outside the tests.

## Exports

### `@c9up/helix`

| Export | Kind | Description |
|---|---|---|
| `test`, `it` | function | Declares a test; returns a `TestHandle`. Also `.skip`, `.only`, `.todo`, `.each`, `.group`, `.macro`. |
| `describe` | function | Declares a suite. Also `.skip`, `.only`, `.todo`. |
| `beforeAll`, `afterAll`, `beforeEach`, `afterEach` | function | `(fn: HookFn, timeoutMs?: number) => void`. |
| `Test` | const | `Test.macro(name, fn)`: adds a named method to every `TestHandle`. |
| `expect` | const | `expect(value, message?)`: a chainable assertion (`ExpectStatic`). |
| `createAssert` | function | Builds an `Assert`, the object behind `ctx.assert`. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors) |
| `vi` | const | Mocks, spies, fake timers and system time. |
| `configure` | function | `configure(options: ConfigureOptions): Promise<void>`: installs plugins and runner hooks. |
| `drainRunnerTeardowns` | function | `drainRunnerTeardowns(): Promise<unknown[]>`: runs every registered runner teardown, in reverse order. |
| `TestContext` | class | The context injected into each test: `assert`, `test`, `cleanup()`, plus what plugins add. |
| `TestContextRegistry` | const | `macro`, `getter`, `clear`, `has`: extends `TestContext` at runtime. |
| `buildTestContext` | function | `buildTestContext(test: TestInstance): TestContext`. |
| `getActiveTest` | function | `getActiveTest(): TestInstance \| undefined`: the running test. |
| `getActiveTestOrFail` | function | `getActiveTestOrFail(): TestInstance`: the same, or throws outside a test. |
| `onTestFinished` | function | `onTestFinished(cb: TestCleanup): void`: runs after the current test, whatever its outcome. |
| `onTestFailed` | function | `onTestFailed(cb: TestCleanup): void`: runs only if the current test fails. |
| `Emitter` | class | Typed emitter over `RunnerEvents`: `on`, `once`, `off`, `clear`, `emit`. |
| `emitter` | const | The process-wide emitter. |
| `Runner` | class | The run handed to plugins: `failed`, `bail()`, `onSuite()`, `registerReporter()`, `suites`, `getSummary()`. |
| `time` | namespace | The `@c9up/helix/time` functions. |
| `useContainer`, `override`, `overrideOn`, `clearActiveContainer`, `spy` | function | The container facade, see `@c9up/helix/container`. |
| `Assert` | interface | The `ctx.assert` API. |
| `Assertion`, `ExpectStatic`, `AsymmetricMatcher` | type | The `expect` chain, its static side, and an asymmetric matcher. |
| `MatcherName`, `MatcherResult` | type | A matcher's name; `{ pass: boolean; message(): string }`. |
| `Vi`, `Spy` | type | `typeof vi`; a spy function with its `mock` record. |
| `TestOptions` | interface | Third argument of `test`: `retry`, `timeout`, `tags`, `fails`. |
| `TestHandle`, `DatasetHandle`, `DatasetSource`, `TapHandle`, `TapOptions` | interface / type | The chainable handles of a test and its dataset. |
| `TestInstance` | interface | `ctx.test`: `title`, `fullName`, `options`, `dataset`, `context`, `isPinned`, `resetTimeout()`, `cleanup()`. |
| `Group`, `GroupInstance` | interface | The `test.group()` handle and the instance its hooks receive. |
| `Hook`, `HookFn`, `HookType`, `CleanupFn`, `DoneFn` | type | Lifecycle hook shapes. |
| `ConfigureOptions`, `Plugin`, `PluginApi`, `PluginContext`, `RunnerHook` | type | The `configure()` and plugin API. |
| `CLIArgs` | interface | The run's command-line flags, as seen from a worker (`api.cliArgs`). |
| `RunnerEvents`, `EventHandler` | type | Event names and payloads; a listener for one. |
| `TestStartNode`, `TestEndNode`, `GroupStartNode`, `GroupEndNode`, `SuiteStartNode`, `SuiteEndNode`, `RunnerStartNode`, `RunnerEndNode` | type | Event payloads. |
| `EmittedError`, `EmittedTitle`, `EmittedDataset`, `ErrorPhase` | type | Parts of the event payloads. |
| `RunnerSummary`, `SummaryAggregates` | interface | What `runner.getSummary()` returns. |
| `FileResult`, `SuiteResult`, `TestResult` | interface | Results of one file. |
| `ContainerLike`, `ContainerToken`, `HelixContainer` | type | The container shapes the facade accepts. |

### `@c9up/helix/runtime`

Everything above except the container facade and `time`, plus:

| Export | Kind | Description |
|---|---|---|
| `addHook` | function | `addHook(type: HookType, fn: HookFn, timeoutMs?: number): void`. |
| `getRoot`, `resetRoot` | function | The collected suite tree of the current file; a fresh one. |
| `executeRoot` | function | `executeRoot(root: SuiteNode, file: string, options?: ExecuteOptions): Promise<FileResult>`. |
| `equals` | function | `equals(a: unknown, b: unknown, options?: EqualsOptions): boolean`: deep equality (`strict` for `toStrictEqual`). |
| `partialEquals` | function | `partialEquals(actual: unknown, expected: unknown): boolean`. |
| `matchers` | const | The matcher implementations behind `expect`. |
| `isAssertionError` | function | `isAssertionError(value: unknown): value is errors.E_HELIX_ASSERTION_FAILED`. |
| `withViContext` | function | `withViContext<T>(body: () => Promise<T>): Promise<T>`: runs `body` under its own `vi` state. |
| `runTestFile` | function | As in `@c9up/helix/runtime/worker`. |
| `AssertionErrorInit`, `Constructor`, `EqualsOptions`, `Getter`, `SpyLike`, `SerializedError`, `RunMode`, `SuiteNode`, `TestNode`, `TestFn`, `CreateSpyOptions`, `MockCallResult`, `MockInternals`, `SpyOnOptions`, `RunFileOptions` | type | Their supporting types. |

### `@c9up/helix/runtime/worker`

```ts
function runTestFile(absolutePath: string, options?: RunFileOptions): Promise<FileResult>
```

`RunFileOptions` extends `ExecuteOptions` (`timeoutMs`, `retries`, `grep`, `tags`, `matchAll`, `tests`, `groups`, `suite`, `bail`, `bailLayer`, `allowOnly`) with `freshImport?: boolean` (bust the module cache) and `defaultTimeoutMs?: number`.

### `@c9up/helix/container`

| Export | Kind | Signature |
|---|---|---|
| `useContainer` | function | `useContainer(container: HelixContainer): void`: binds the container `override()` acts on. |
| `override` | function | `override(token: ContainerToken, value: unknown): void`: overrides a binding on the active container. After the test, the token resolves as it did before the call: through the swap that was in place (a fake the file installed in `beforeAll`, an outer `override()`), or through its binding. |
| `overrideOn` | function | `overrideOn(container: HelixContainer, token: ContainerToken, value: unknown): void`. |
| `clearActiveContainer` | function | `clearActiveContainer(): void`. |
| `spy` | function | `spy<Fn>(implementation?: Fn): Spy<Fn>`: `vi.fn`. |
| `HelixContainer` | interface | `override(token, value): void` and `restore(token): void`. Optional: `swapped(token): unknown` and `swap(token, factory): void`. With both, the end-of-test cleanup puts the previous swap back; without them it calls `restore(token)`, which removes every swap of the token. `@c9up/ream`'s `Container` has both from the release that adds `swapped()`. |
| `ContainerLike`, `ContainerToken` | type | `ContainerToken` is a class, a string or a symbol. |

### `@c9up/helix/time`

| Export | Kind | Signature |
|---|---|---|
| `freeze` | function | `freeze(input: TimeInput): void`: pins `Date.now()` and `new Date()`. |
| `travel` | function | `travel(amount: number, unit?: TimeUnit): void`: advances the clock. |
| `travelTo` | function | `travelTo(target: TimeInput): void`: same as `freeze(target)`. |
| `unfreeze` | function | `unfreeze(): void`: restores the real clock. |
| `frozenAt` | function | `frozenAt(): number \| null`: the frozen epoch, or `null`. |
| `TimeUnit` | type | `"ms" \| "second" \| "minute" \| "hour" \| "day" \| "week" \| "month" \| "year"`. |

`TimeInput` is `string | number | Date | { toMillis(): number }`.

### `@c9up/helix/runner`

| Export | Kind | Description |
|---|---|---|
| `run` | function | `run(config: RunConfig): Promise<RunOutcome>`: one run over discovered or given files. |
| `runSuites` | function | `runSuites(suites: readonly SuiteRun[], base: RunConfig): Promise<RunOutcome>`: suites one after another. |
| `noTestFiles` | function | `noTestFiles(passWithNoTests: boolean, detail?: string): RunOutcome`. |
| `discover` | function | `discover(root: string, options?: DiscoveryOptions): Promise<string[]>`: finds test files. |
| `filterByFileFilters` | function | `filterByFileFilters(files: readonly string[], filters: readonly string[] \| undefined): string[]`: the `--files` rule. |
| `loadHelixConfig` | function | `loadHelixConfig(root: string): Promise<HelixConfig>`: `helix.config.*`, or `{}`. |
| `resolveSuiteFiles` | function | `resolveSuiteFiles(suite: SuiteDefinition, root: string, discovery: DiscoveryOptions \| undefined): Promise<string[]>`. |
| `selectSuites` | function | `selectSuites(config: HelixConfig, positionals: string[]): SuiteDefinition[] \| undefined`. |
| `resolveBootstrap` | function | `resolveBootstrap(root: string, configured?: string): string \| undefined`. |
| `BOOTSTRAP_FILENAMES` | const | `tests/bootstrap.ts`, `tests/bootstrap.js`, `tests/bootstrap.mjs`. |
| `runGlobalHooks` | function | `runGlobalHooks(bootstrap: string \| undefined): Promise<() => Promise<void>>`: runs `runnerHooks.setup` once and returns the teardown. |
| `readFailedCache` | function | `readFailedCache(root: string): Promise<string[]>`: titles that failed last run. |
| `makeReporters` | function | `makeReporters(names: readonly string[] \| undefined, useColors: boolean): Reporter`. |
| `makeReportersFrom` | function | `makeReportersFrom(reporters: readonly Reporter[]): Reporter`. |
| `armDrainGuard` | function | `armDrainGuard(code: number, write?: (message: string) => void): void`: reports what keeps a finished run alive. |
| `DRAIN_GRACE_MS` | const | `2000`. |
| `encodeEnvList` | function | `encodeEnvList(values: readonly string[]): string`: encodes a list for the workers' environment. |
| `RunConfig`, `RunOutcome`, `SuiteRun`, `WatchOptions` | type | Run input and output. |
| `HelixConfig`, `SuiteDefinition`, `SuiteFiles` | type | The config file shape. |
| `Reporter`, `Summary` | type | `onFileStart`, `onFileResult`, `onFileError`, `onSummary`; the run totals. |

### `test` and `TestHandle`

```ts
test(name: string, fn?: TestFn, options?: TestOptions | number): TestHandle
type TestFn = (ctx: TestContext, done: DoneFn) => unknown
```

A test without `fn` is a `todo`.

| Member | Signature | Description |
|---|---|---|
| `test.skip` | `skip(name: string, fn?: TestFn): void` | |
| `test.only` | `only(name: string, fn: TestFn, options?): TestHandle` | |
| `test.todo` | `todo(name: string): void` | |
| `test.each` | `each(rows)(name, fn: (row) => unknown): void` | One test per row. |
| `test.group` | `group(name: string, fn: (group: Group) => void): Group` | A group with `setup`, `teardown`, `each.{setup,teardown,timeout,disableTimeout,retry}`, `tap`. |
| `test.macro` | `macro(callback: (test: TestInstance, ...args) => R): (...args) => R` | A resource macro. |
| `.retry` | `retry(n: number): TestHandle` | |
| `.timeout` / `.disableTimeout` | `timeout(ms: number): TestHandle` | |
| `.tags` | `tags(tags: string \| string[], strategy?: "replace" \| "append" \| "prepend"): TestHandle` | |
| `.fails` | `fails(reason?: string): TestHandle` | The test is expected to throw. |
| `.setup` / `.teardown` | `setup(fn: HookFn): TestHandle` | Hooks for this test only. |
| `.pin` | `pin(): TestHandle` | When any test is pinned, only pinned tests run. |
| `.skip` | `skip(condition?: boolean \| (() => boolean \| Promise<boolean>), reason?: string): TestHandle` | |
| `.waitForDone` | `waitForDone(): TestHandle` | Completes once the body calls `done()`. |
| `.with` | `with<Row>(rows: DatasetSource<Row>): DatasetHandle<Row>` | A dataset; `.run((ctx, row) => …)` gives the body. |

### `expect`

Matchers, each available under `.not`, `.resolves` and `.rejects`: `toBe`, `toEqual`, `toStrictEqual`, `toMatchObject`, `toBeDefined`, `toBeUndefined`, `toBeNull`, `toBeNaN`, `toBeTruthy`, `toBeFalsy`, `toBeGreaterThan`, `toBeGreaterThanOrEqual`, `toBeLessThan`, `toBeLessThanOrEqual`, `toBeCloseTo`, `toBeInstanceOf`, `toContain`, `toHaveLength`, `toHaveProperty`, `toMatch`, `toThrow`, `toHaveBeenCalled`, `toHaveBeenCalledOnce`, `toHaveBeenCalledTimes`, `toHaveBeenCalledWith`, `toHaveBeenLastCalledWith`, `toHaveBeenNthCalledWith`.

Static members: `objectContaining`, `arrayContaining`, `stringContaining`, `stringMatching`, `any`, `anything`, `assertions(n)`, `hasAssertions()`.

### `Assert`

`ctx.assert` methods: `plan`, `fail`, `ok`, `notOk`, `isOk`, `isNotOk`, `equal`, `notEqual`, `strictEqual`, `notStrictEqual`, `deepEqual`, `notDeepEqual`, `exists`, `notExists`, `isTrue`, `isNotTrue`, `isFalse`, `isNotFalse`, `isNull`, `isNotNull`, `isUndefined`, `isDefined`, `isNaN`, `isNotNaN`, `isFinite`, `isString`, `isNotString`, `isNumber`, `isNotNumber`, `isBoolean`, `isNotBoolean`, `isFunction`, `isNotFunction`, `isObject`, `isNotObject`, `isArray`, `isNotArray`, `typeOf`, `notTypeOf`, `instanceOf`, `notInstanceOf`, `isAbove`, `isAtLeast`, `isBelow`, `isAtMost`, `closeTo`, `approximately`, `oneOf`, `match`, `notMatch`, `include`, `notInclude`, `deepInclude`, `notDeepInclude`, `lengthOf`, `notLengthOf`, `empty`, `notEmpty`, `isEmpty`, `isNotEmpty`, `property`, `notProperty`, `propertyVal`, `notPropertyVal`, `deepPropertyVal`, `notDeepPropertyVal`, `properties`, `anyProperties`, `onlyProperties`, `notAllProperties`, `notAnyProperties`, `containsSubset`, `containSubset`, `notContainsSubset`, `doesNotContainSubset`, `sameMembers`, `notSameMembers`, `sameDeepMembers`, `notSameDeepMembers`, `sameOrderedMembers`, `notSameOrderedMembers`, `sameDeepOrderedMembers`, `notSameDeepOrderedMembers`, `includeMembers`, `notIncludeMembers`, `includeDeepMembers`, `notIncludeDeepMembers`, `includeOrderedMembers`, `notIncludeOrderedMembers`, `includeDeepOrderedMembers`, `notIncludeDeepOrderedMembers`, `frozen`, `notFrozen`, `isFrozen`, `isNotFrozen`, `sealed`, `notSealed`, `isSealed`, `isNotSealed`, `throws`, `doesNotThrow`, `doesNotThrows`, `rejects`, `doesNotReject`, `doesNotRejects`.

### `vi`

| Member | Signature | Description |
|---|---|---|
| `fn` | `fn<Fn>(implementation?: Fn): Spy<Fn>` | A mock function. |
| `spyOn` | `spyOn(obj, key, options?: { accessor?: "get" \| "set" }): Spy` | Replaces `obj[key]` with a spy that calls through. |
| `isMockFunction` | `(value: unknown) => value is Spy` | |
| `clearAllMocks` / `resetAllMocks` / `restoreAllMocks` | `(): typeof vi` | |
| `useFakeTimers` | `useFakeTimers(options?: { now?: number \| Date }): typeof vi` | |
| `useRealTimers` | `(): typeof vi` | |
| `advanceTimersByTime` | `(ms: number): typeof vi` | |
| `runAllTimers` / `runOnlyPendingTimers` / `clearAllTimers` | `(): typeof vi` | |
| `getTimerCount` | `(): number` | |
| `setSystemTime` | `(time: Date \| number) => typeof vi` | |
| `getMockedSystemTime` | `() => number \| null` | |
| `useRealSystemTime` | `() => typeof vi` | Clears the pinned system time. |

A `Spy` records `mock.calls`, `mock.results`, `mock.lastCall`, `calls` and `callCount`, and has `mockImplementation`, `mockImplementationOnce`, `mockReturnValue`, `mockReturnValueOnce`, `mockResolvedValue`, `mockResolvedValueOnce`, `mockRejectedValue`, `mockRejectedValueOnce`, `mockClear`, `mockReset`, `mockRestore`.

### `PluginApi`

```ts
type Plugin = (api: PluginApi) => unknown
```

| Member | Type | Description |
|---|---|---|
| `config` | `ConfigureOptions` | The options of this run; a plugin may edit them. |
| `cliArgs` | `CLIArgs` | The flags the CLI forwarded to this worker. |
| `runner` | `Runner` | Run-level state and summary. |
| `emitter` | `Emitter` | Lifecycle events (`test:start`, `group:end`, …). |
| `context` | `PluginContext` | `macro(name, value)` and `getter(name, fn)`: extend the test context. |
| `cleanup` | `cleanup(fn: RunnerHook): void` | A teardown run once after all tests. |

## Configuration

`helix.config.ts` (or `.js`, `.mjs`) at the project root:

| Option | Type | Default | Description |
|---|---|---|---|
| `suites` | `SuiteDefinition[]` | | Named suites; `helix test <name>` selects one. |
| `bootstrap` | `string` | the first of `BOOTSTRAP_FILENAMES` that exists | Path to the bootstrap module. |
| `timeout` | `number` | `60000` | Default per-test timeout in ms. |
| `fileTimeout` | `number` | `600000` | How long one file may run before its worker is killed, in ms. |
| `forceExit` | `boolean` | `false` | `process.exit()` once the run ends. |
| `allowOnly` | `boolean` | not under CI | Whether `.only` / `.pin()` may narrow the run. |
| `passWithNoTests` | `boolean` | `false` | Exits 0 when nothing is found to run. |

`SuiteDefinition`: `name: string`, `files: string | string[] | (() => URL[] | Promise<URL[]>)`, `timeout?: number`, `retries?: number`, `configure?: (suite: SuiteHandle) => void`.

The bootstrap module (`tests/bootstrap.ts`) may export `plugins: Plugin[]`, `runnerHooks: { setup?: RunnerHook[]; teardown?: RunnerHook[] }` (run once for the whole run, in the CLI process), `configureSuite(suite: SuiteHandle)`, `filters: ConfigureFilters` and `importer: (file: URL) => unknown`.

`ConfigureOptions`, passed to `configure()` or edited by a plugin through `api.config`:

| Option | Type | Description |
|---|---|---|
| `plugins` | `Plugin[]` | Plugins to install. |
| `configureSuite` | `(suite: SuiteHandle) => unknown` | Configures the suite before it runs. |
| `setup` / `teardown` | `RunnerHook[]` | Run once before / after the tests. |
| `timeout` | `number` | Default per-test timeout of this file's tests, in ms. |
| `retries` | `number` | Default extra attempts on failure. |
| `filters` | `ConfigureFilters` | `files`, `suites`, `tags`, `groups`, `tests`, `matchAll`. |
| `importer` | `(file: URL) => unknown` | How a test file is imported. |
| `forceExit` | `boolean` | |
| `suite` | `string` | The suite these tests belong to. |
| `cwd`, `reporters`, `exclude`, `refiner` | | Filled in by the runner. |

## Errors

Each code is a class of the `errors` namespace and a `@c9up/flare` `Exception` with status 500: branch on `error.code` or on `error instanceof errors.E_HELIX_*`.

| Code | Raised when |
|---|---|
| [`E_HELIX_ASSERTION_FAILED`](/en/reference/errors#e-helix-assertion-failed) | An `expect()` or `assert` check failed; carries `actual`, `expected`, `operator`, `showDiff`, and keeps the name `AssertionError` that reporters recognise. |
| [`E_HELIX_TIMEOUT`](/en/reference/errors#e-helix-timeout) | A test or hook did not settle within its timeout. Also the `code` of the file error for a file that ran past `--file-timeout`. |
| [`E_HELIX_TEST_ABORTED`](/en/reference/errors#e-helix-test-aborted) | The running test called `meta.abort(message)`. |
| [`E_HELIX_UNEXPECTED_ONLY`](/en/reference/errors#e-helix-unexpected-only) | Not thrown: the `code` of the error of a test that a `.only` or a `.pin()` selects in a run that does not allow them (under CI, or with `--allow-only=false`). |
| [`E_HELIX_NO_TEST_SUITE`](/en/reference/errors#e-helix-no-test-suite) | The `code` of the file error for a file that declares no test, unless `--pass-with-no-tests` is set. |
| [`E_HELIX_NO_ACTIVE_TEST`](/en/reference/errors#e-helix-no-active-test) | A test-only helper (`getActiveTestOrFail()`, `time.freeze`/`travel`, `override()`, a `test.macro` function) was called outside a running test. |
| [`E_HELIX_NO_ACTIVE_CONTAINER`](/en/reference/errors#e-helix-no-active-container) | `override()` was called before `useContainer()`. |
| [`E_HELIX_ASYNC_DESCRIBE`](/en/reference/errors#e-helix-async-describe) | A `describe` body returned a Promise; await the setup in `beforeAll` instead. |
| [`E_HELIX_NESTED_GROUP`](/en/reference/errors#e-helix-nested-group) | A `test.group()` was declared inside another group. |
| [`E_HELIX_INVALID_TIME`](/en/reference/errors#e-helix-invalid-time) | A time value cannot be used: a non-finite or out-of-range epoch, an unreadable date, a fractional month or year, an unknown unit, or a negative `advanceTimersByTime`. |
| [`E_HELIX_FAKE_TIMERS_NOT_INSTALLED`](/en/reference/errors#e-helix-fake-timers-not-installed) | A `vi` timer control was called before `vi.useFakeTimers()`. |
| [`E_HELIX_TIMER_LOOP`](/en/reference/errors#e-helix-timer-loop) | Draining fake timers exceeded its iteration cap: a timer keeps rescheduling itself. |
| [`E_HELIX_SPY_NO_PROPERTY`](/en/reference/errors#e-helix-spy-no-property) | `vi.spyOn()` targets a property the object does not have. |
| [`E_HELIX_SPY_NOT_FUNCTION`](/en/reference/errors#e-helix-spy-not-function) | `vi.spyOn()` targets a value that is not a function; pass `{ accessor }` for a getter or setter. |
| [`E_HELIX_SPY_NO_ACCESSOR`](/en/reference/errors#e-helix-spy-no-accessor) | `vi.spyOn()` asked for a getter or setter the property does not define. |
| [`E_HELIX_ALREADY_SPIED`](/en/reference/errors#e-helix-already-spied) | `vi.spyOn()` targets a method that is already a spy; call `mockRestore()` first. |
| [`E_HELIX_RUNNER_NOT_DRIVABLE`](/en/reference/errors#e-helix-runner-not-drivable) | A plugin called `runner.add/start/exec/end()`: the CLI owns discovery and execution. |
| [`E_HELIX_RELATIVE_PATH`](/en/reference/errors#e-helix-relative-path) | `runTestFile()` was given a relative path. |
| [`E_HELIX_INVALID_GLOB`](/en/reference/errors#e-helix-invalid-glob) | An include or exclude glob has an unclosed `{`, `(` or `[`; `cause` holds the regex error. |
| [`E_HELIX_INVALID_THREADS`](/en/reference/errors#e-helix-invalid-threads) | The thread count is not a finite number. |
| [`E_HELIX_INVALID_COVERAGE_THRESHOLD`](/en/reference/errors#e-helix-invalid-coverage-threshold) | A coverage threshold is not a number from 0 to 100, or a diff-coverage threshold names `functions` or `branches` (diff coverage is line-only). |
| [`E_HELIX_INVALID_DIFF_COVERAGE`](/en/reference/errors#e-helix-invalid-diff-coverage) | Diff coverage is enabled without coverage, or its `cwd` and `coverage.root` are disjoint. |
| [`E_HELIX_INVALID_WATCH_OPTIONS`](/en/reference/errors#e-helix-invalid-watch-options) | Watch mode got an empty `include` or a `debounceMs` out of range. |
| [`E_HELIX_WATCH_FAILED`](/en/reference/errors#e-helix-watch-failed) | Watch mode could not watch its root directory; `cause` holds the `fs.watch` error. |
| [`E_HELIX_WORKER_FAILED`](/en/reference/errors#e-helix-worker-failed) | Not thrown: the `code` of a file error when the worker could not start, sent a broken frame, exited without a result, or exited in a way its result does not explain. |
| [`E_HELIX_NATIVE_REQUIRED`](/en/reference/errors#e-helix-native-required) | The helix native binary is missing, failed to load, or is stale, or the platform has none. |
| [`E_HELIX_INTERNAL`](/en/reference/errors#e-helix-internal) | An internal invariant of helix broke: a bug in helix, worth reporting. The native engine's refusals arrive under this code. |

## Migration

- `HelixError` is gone: test `error.code`, or `error instanceof errors.E_HELIX_*` with `import { errors } from '@c9up/helix'`.
- `AssertionError` becomes `errors.E_HELIX_ASSERTION_FAILED`, with the same fields; `error.name` is still `'AssertionError'`, and `isAssertionError()` is unchanged.
- `RunnerNotDrivableError` becomes `errors.E_HELIX_RUNNER_NOT_DRIVABLE`.

## See also

- [The test runner](/en/guides/testing/runner)
- [Introduction to testing](/en/guides/testing/introduction)
- [Test doubles and time](/en/guides/testing/test-doubles)
- [helix-plugin-ream](/en/reference/helix-plugin-ream)
