# helix

`@c9up/helix` : le lanceur de tests : une CLI `helix test` qui exécute chaque fichier dans son propre worker, un DSL `test` / `describe` avec un contexte de test injecté, les assertions `expect` et `assert`, les mocks `vi`, la surcharge du conteneur et une horloge figée. Guide : [Le lanceur de tests](/fr/guides/testing/runner).

## Installation

```bash
pnpm add -D @c9up/helix
```

Le binaire `helix` charge les fichiers de test TypeScript avec `tsx` s'il est installé (`--tsx=false` utilise à la place le loader du processus parent). Une app ream pilote helix par [`@c9up/helix-plugin-ream`](/fr/reference/helix-plugin-ream) et `ream test`.

`helix test` s'exécute par un moteur Rust. Ce moteur est livré dans un petit paquet par plateforme, `@c9up/helix-<plateforme>`, pour linux x64 et arm64 (glibc), macOS x64 et arm64, et Windows x64. `@c9up/helix` les déclare en dépendances optionnelles, et votre gestionnaire de paquets installe seulement celui de votre machine. Vous n'avez pas besoin de toolchain Rust. N'installez pas avec les dépendances optionnelles désactivées (`--no-optional`, `--omit=optional`) : le moteur serait absent.

Sans le moteur, une exécution simple lève `E_HELIX_NATIVE_REQUIRED`, et son message nomme le paquet à installer, par exemple `@c9up/helix-linux-x64-gnu`. L'erreur de chargement est la `cause` de l'exception. Une exécution avec `--coverage`, `--diff-cov` ou `--list-pinned`, ou avec un `reporterInstance` passé à `run()`, passe par le pool TypeScript, qui ne charge pas le moteur.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/helix` | Le DSL (`test`, `describe`, `it`, hooks), `expect`, `vi`, `configure`, le contexte de test, l'émetteur d'événements, la façade du conteneur, et `time`. |
| `@c9up/helix/runtime` | Le DSL et le moteur côté worker, avec les pièces de plus bas niveau (`executeRoot`, `equals`, `matchers`, …). |
| `@c9up/helix/runtime/worker` | `runTestFile()` : collecte et exécute un fichier de test dans le processus courant. |
| `@c9up/helix/container` | La façade du conteneur : `useContainer`, `override`, `overrideOn`, `clearActiveContainer`, `spy`. |
| `@c9up/helix/time` | `freeze`, `travel`, `travelTo`, `unfreeze`, `frozenAt`. |
| `@c9up/helix/runner` | Le lanceur programmatique qu'un framework hôte pilote depuis son propre fichier de configuration. |
| `@c9up/helix/bin/helix.js` | Le script de la CLI, aussi installé comme binaire `helix`. |

## Le binaire `helix`

```sh
helix test [files...|dirs...|suites...] [flags]
```

Les arguments positionnels désignent des fichiers ou des dossiers de test. Quand chacun d'eux correspond à une suite déclarée dans `helix.config.*`, ils désignent des suites. Sans argument positionnel et avec une configuration, toutes les suites s'exécutent, dans l'ordre. `test` est la seule sous-commande, et celle par défaut. `helix` pose `NODE_ENV=test` avant de lire la configuration.

Un drapeau non booléen prend sa valeur après `=` (`--timeout=5000`) ; `--flag=false` (ou `0`, `no`, `off`) désactive un booléen. Un drapeau inconnu est une erreur ; `--` termine la lecture des drapeaux.

| Drapeau | Valeur | Description |
|---|---|---|
| `--reporter` | `spec \| dot \| json` | Format de sortie (`spec` par défaut). |
| `--reporters` | liste | Reporters à activer ensemble, séparés par des virgules (`spec,json`). |
| `--threads` | nombre | Workers concurrents. |
| `--timeout` | ms | Délai par test. |
| `--file-timeout` | ms | Durée maximale d'un fichier avant que son worker soit tué (`600000` par défaut). |
| `--retries` | nombre | Tentatives supplémentaires en cas d'échec (`0` par défaut) ; `0` est accepté. |
| `--colors` | booléen | Couleurs ANSI. |
| `--tsx` | booléen | Charge les workers avec `tsx` (`true` par défaut). |
| `--include` | glob, répétable | Motifs glob à inclure. |
| `--exclude` | glob, répétable | Motifs glob à exclure. |
| `--grep` | chaîne | N'exécute que les tests dont le nom complet correspond (regex ou sous-chaîne). |
| `--tags` | liste | Filtre par tags (`@fast`, `~@slow` exclut) ; un seul tag suffit par défaut. |
| `--match-all` / `--matchAll` | booléen | Exige tous les tags de `--tags`. |
| `--tests` | liste | Titres exacts des tests à exécuter. |
| `--groups` | liste | Titres exacts des groupes à exécuter. |
| `--files` | liste | Sous-chaînes comparées aux chemins des fichiers de test. |
| `--suite` | chaîne | Nom de la suite à laquelle appartiennent ces fichiers (`meta.suite`). |
| `--bail` | booléen | S'arrête au premier échec. |
| `--bail-layer` | `group \| suite \| runner` | La portée d'un arrêt. |
| `--failed` | booléen | Ne relance que les tests en échec lors de la dernière exécution. |
| `--list-pinned` | booléen | Affiche les tests marqués `.pin()` et n'exécute rien. |
| `--silent` | booléen | Jette ce qu'impriment les tests. |
| `--pass-with-no-tests` | booléen | Sort avec 0 quand aucun fichier ni aucun test n'est trouvé. |
| `--allow-only` | booléen | Laisse `.only` / `.pin()` restreindre l'exécution ; désactivé sous CI sauf si posé. |
| `--force-exit` | booléen | Appelle `process.exit()` dès la fin de l'exécution. |
| `--watch` | booléen | Relance à chaque modification de fichier. |
| `--poll` | booléen | Avec `--watch` : détecte les modifications par interrogation périodique. |
| `--watch-debounce` | ms | Fenêtre d'anti-rebond du mode watch (200 par défaut, 5000 au plus). |
| `--only-changed` | booléen | Accepté ; affiche un avertissement et parcourt tous les fichiers. |
| `--coverage` | booléen | Collecte de la couverture V8. |
| `--coverage-reporters` | liste | `text-summary`, `lcov`, `json-summary`. |
| `--coverage-dir` | chemin | Dossier de sortie de la couverture. |
| `--coverage-thresholds` | JSON | Seuils en ligne, `{"lines":80,"functions":75}`. |
| `--diff-cov` | booléen | Couverture du diff par rapport à une branche de base (exige `--coverage`). |
| `--diff-cov-base` | ref | Ref git de comparaison (`origin/main` par défaut, puis `main`). |
| `--diff-cov-thresholds` | JSON | Seuils du diff en ligne, `{"lines":80}`. |
| `--help`, `-h` | | Affiche l'aide. |

### Sortie des rapporteurs

Une erreur qui porte un `code` le garde dans chaque rapporteur. `spec` affiche le code entre crochets avant le message : `[E_HELIX_TIMEOUT] test "slow" exceeded 100ms timeout`. `dot` n'affiche que `F` et `E`.

`json` écrit un objet JSON par ligne sur stdout :

| `event` | Autre champ | Contenu |
|---|---|---|
| `file:start` | `file` | Le chemin absolu du fichier. |
| `file:end` | `result` | Le `FileResult` du fichier : `file`, `suites`, `tests`, `totals`, `durationMs`. L'`error` d'un test en échec est une `SerializedError` : `name`, `message`, `code` quand l'erreur en a un, `stack`, et `actual`, `expected`, `operator` pour une assertion. |
| `file:error` | `error` | Une erreur du fichier hors de ses tests : `file`, `message`, `code`, `stack`. |
| `summary` | `summary` | `totals`, `files`, `fileErrors`, `durationMs`. |

`code` est absent quand l'erreur n'en a pas, par exemple une `Error` simple levée par un test. Une erreur de fichier levée dans le worker garde le code de ce qui a été levé. Une erreur de fichier que le pool constate lui-même porte un code de helix : `E_HELIX_TIMEOUT` quand le fichier a dépassé `--file-timeout`, `E_HELIX_WORKER_FAILED` quand le worker a échoué en dehors des tests.

## Exports

### `@c9up/helix`

| Export | Nature | Description |
|---|---|---|
| `test`, `it` | fonction | Déclare un test ; renvoie un `TestHandle`. Aussi `.skip`, `.only`, `.todo`, `.each`, `.group`, `.macro`. |
| `describe` | fonction | Déclare une suite. Aussi `.skip`, `.only`, `.todo`. |
| `beforeAll`, `afterAll`, `beforeEach`, `afterEach` | fonction | `(fn: HookFn, timeoutMs?: number) => void`. |
| `Test` | const | `Test.macro(name, fn)` : ajoute une méthode nommée à chaque `TestHandle`. |
| `expect` | const | `expect(value, message?)` : une assertion chaînable (`ExpectStatic`). |
| `createAssert` | fonction | Construit un `Assert`, l'objet derrière `ctx.assert`. |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs) |
| `vi` | const | Mocks, espions, faux timers et heure système. |
| `configure` | fonction | `configure(options: ConfigureOptions): Promise<void>` : installe les plugins et les hooks du lanceur. |
| `drainRunnerTeardowns` | fonction | `drainRunnerTeardowns(): Promise<unknown[]>` : exécute chaque teardown du lanceur enregistré, en ordre inverse. |
| `TestContext` | classe | Le contexte injecté dans chaque test : `assert`, `test`, `cleanup()`, plus ce qu'ajoutent les plugins. |
| `TestContextRegistry` | const | `macro`, `getter`, `clear`, `has` : étend `TestContext` à l'exécution. |
| `buildTestContext` | fonction | `buildTestContext(test: TestInstance): TestContext`. |
| `getActiveTest` | fonction | `getActiveTest(): TestInstance \| undefined` : le test en cours. |
| `getActiveTestOrFail` | fonction | `getActiveTestOrFail(): TestInstance` : le même, ou lève une erreur hors d'un test. |
| `onTestFinished` | fonction | `onTestFinished(cb: TestCleanup): void` : s'exécute après le test courant, quelle que soit son issue. |
| `onTestFailed` | fonction | `onTestFailed(cb: TestCleanup): void` : ne s'exécute que si le test courant échoue. |
| `Emitter` | classe | Émetteur typé sur `RunnerEvents` : `on`, `once`, `off`, `clear`, `emit`. |
| `emitter` | const | L'émetteur du processus. |
| `Runner` | classe | L'exécution remise aux plugins : `failed`, `bail()`, `onSuite()`, `registerReporter()`, `suites`, `getSummary()`. |
| `time` | namespace | Les fonctions de `@c9up/helix/time`. |
| `useContainer`, `override`, `overrideOn`, `clearActiveContainer`, `spy` | fonction | La façade du conteneur, voir `@c9up/helix/container`. |
| `Assert` | interface | L'API de `ctx.assert`. |
| `Assertion`, `ExpectStatic`, `AsymmetricMatcher` | type | La chaîne `expect`, sa partie statique, et un matcher asymétrique. |
| `MatcherName`, `MatcherResult` | type | Le nom d'un matcher ; `{ pass: boolean; message(): string }`. |
| `Vi`, `Spy` | type | `typeof vi` ; une fonction espion avec son enregistrement `mock`. |
| `TestOptions` | interface | Troisième argument de `test` : `retry`, `timeout`, `tags`, `fails`. |
| `TestHandle`, `DatasetHandle`, `DatasetSource`, `TapHandle`, `TapOptions` | interface / type | Les handles chaînables d'un test et de son jeu de données. |
| `TestInstance` | interface | `ctx.test` : `title`, `fullName`, `options`, `dataset`, `context`, `isPinned`, `resetTimeout()`, `cleanup()`. |
| `Group`, `GroupInstance` | interface | Le handle de `test.group()` et l'instance que reçoivent ses hooks. |
| `Hook`, `HookFn`, `HookType`, `CleanupFn`, `DoneFn` | type | Les formes des hooks du cycle de vie. |
| `ConfigureOptions`, `Plugin`, `PluginApi`, `PluginContext`, `RunnerHook` | type | L'API de `configure()` et des plugins. |
| `CLIArgs` | interface | Les drapeaux de la ligne de commande, vus depuis un worker (`api.cliArgs`). |
| `RunnerEvents`, `EventHandler` | type | Noms et charges des événements ; un écouteur pour l'un d'eux. |
| `TestStartNode`, `TestEndNode`, `GroupStartNode`, `GroupEndNode`, `SuiteStartNode`, `SuiteEndNode`, `RunnerStartNode`, `RunnerEndNode` | type | Les charges des événements. |
| `EmittedError`, `EmittedTitle`, `EmittedDataset`, `ErrorPhase` | type | Les parties des charges d'événements. |
| `RunnerSummary`, `SummaryAggregates` | interface | Ce que renvoie `runner.getSummary()`. |
| `FileResult`, `SuiteResult`, `TestResult` | interface | Les résultats d'un fichier. |
| `ContainerLike`, `ContainerToken`, `HelixContainer` | type | Les formes de conteneur qu'accepte la façade. |

### `@c9up/helix/runtime`

Tout ce qui précède sauf la façade du conteneur et `time`, plus :

| Export | Nature | Description |
|---|---|---|
| `addHook` | fonction | `addHook(type: HookType, fn: HookFn, timeoutMs?: number): void`. |
| `getRoot`, `resetRoot` | fonction | L'arbre des suites collecté pour le fichier courant ; un arbre neuf. |
| `executeRoot` | fonction | `executeRoot(root: SuiteNode, file: string, options?: ExecuteOptions): Promise<FileResult>`. |
| `equals` | fonction | `equals(a: unknown, b: unknown, options?: EqualsOptions): boolean` : égalité profonde (`strict` pour `toStrictEqual`). |
| `partialEquals` | fonction | `partialEquals(actual: unknown, expected: unknown): boolean`. |
| `matchers` | const | Les implémentations des matchers derrière `expect`. |
| `isAssertionError` | fonction | `isAssertionError(value: unknown): value is errors.E_HELIX_ASSERTION_FAILED`. |
| `withViContext` | fonction | `withViContext<T>(body: () => Promise<T>): Promise<T>` : exécute `body` avec son propre état `vi`. |
| `runTestFile` | fonction | Comme dans `@c9up/helix/runtime/worker`. |
| `AssertionErrorInit`, `Constructor`, `EqualsOptions`, `Getter`, `SpyLike`, `SerializedError`, `RunMode`, `SuiteNode`, `TestNode`, `TestFn`, `CreateSpyOptions`, `MockCallResult`, `MockInternals`, `SpyOnOptions`, `RunFileOptions` | type | Leurs types associés. |

### `@c9up/helix/runtime/worker`

```ts
function runTestFile(absolutePath: string, options?: RunFileOptions): Promise<FileResult>
```

`RunFileOptions` étend `ExecuteOptions` (`timeoutMs`, `retries`, `grep`, `tags`, `matchAll`, `tests`, `groups`, `suite`, `bail`, `bailLayer`, `allowOnly`) avec `freshImport?: boolean` (contourne le cache des modules) et `defaultTimeoutMs?: number`.

### `@c9up/helix/container`

| Export | Nature | Signature |
|---|---|---|
| `useContainer` | fonction | `useContainer(container: HelixContainer): void` : lie le conteneur sur lequel agit `override()`. |
| `override` | fonction | `override(token: ContainerToken, value: unknown): void` : surcharge une liaison du conteneur actif. Après le test, le token se résout comme avant l'appel : par le swap qui était en place (un faux que le fichier a installé dans `beforeAll`, un `override()` extérieur), ou par sa liaison. |
| `overrideOn` | fonction | `overrideOn(container: HelixContainer, token: ContainerToken, value: unknown): void`. |
| `clearActiveContainer` | fonction | `clearActiveContainer(): void`. |
| `spy` | fonction | `spy<Fn>(implementation?: Fn): Spy<Fn>` : `vi.fn`. |
| `HelixContainer` | interface | `override(token, value): void` et `restore(token): void`. En option : `swapped(token): unknown` et `swap(token, factory): void`. Avec les deux, le nettoyage de fin de test remet le swap précédent ; sans eux, il appelle `restore(token)`, qui retire tous les swaps du token. Le `Container` de `@c9up/ream` a les deux à partir de la version qui ajoute `swapped()`. |
| `ContainerLike`, `ContainerToken` | type | `ContainerToken` est une classe, une chaîne ou un symbole. |

### `@c9up/helix/time`

| Export | Nature | Signature |
|---|---|---|
| `freeze` | fonction | `freeze(input: TimeInput): void` : fige `Date.now()` et `new Date()`. |
| `travel` | fonction | `travel(amount: number, unit?: TimeUnit): void` : avance l'horloge. |
| `travelTo` | fonction | `travelTo(target: TimeInput): void` : équivaut à `freeze(target)`. |
| `unfreeze` | fonction | `unfreeze(): void` : rétablit l'horloge réelle. |
| `frozenAt` | fonction | `frozenAt(): number \| null` : l'instant figé, ou `null`. |
| `TimeUnit` | type | `"ms" \| "second" \| "minute" \| "hour" \| "day" \| "week" \| "month" \| "year"`. |

`TimeInput` vaut `string | number | Date | { toMillis(): number }`.

### `@c9up/helix/runner`

| Export | Nature | Description |
|---|---|---|
| `run` | fonction | `run(config: RunConfig): Promise<RunOutcome>` : une exécution sur des fichiers découverts ou fournis. |
| `runSuites` | fonction | `runSuites(suites: readonly SuiteRun[], base: RunConfig): Promise<RunOutcome>` : les suites l'une après l'autre. |
| `noTestFiles` | fonction | `noTestFiles(passWithNoTests: boolean, detail?: string): RunOutcome`. |
| `discover` | fonction | `discover(root: string, options?: DiscoveryOptions): Promise<string[]>` : trouve les fichiers de test. |
| `filterByFileFilters` | fonction | `filterByFileFilters(files: readonly string[], filters: readonly string[] \| undefined): string[]` : la règle de `--files`. |
| `loadHelixConfig` | fonction | `loadHelixConfig(root: string): Promise<HelixConfig>` : `helix.config.*`, ou `{}`. |
| `resolveSuiteFiles` | fonction | `resolveSuiteFiles(suite: SuiteDefinition, root: string, discovery: DiscoveryOptions \| undefined): Promise<string[]>`. |
| `selectSuites` | fonction | `selectSuites(config: HelixConfig, positionals: string[]): SuiteDefinition[] \| undefined`. |
| `resolveBootstrap` | fonction | `resolveBootstrap(root: string, configured?: string): string \| undefined`. |
| `BOOTSTRAP_FILENAMES` | const | `tests/bootstrap.ts`, `tests/bootstrap.js`, `tests/bootstrap.mjs`. |
| `runGlobalHooks` | fonction | `runGlobalHooks(bootstrap: string \| undefined): Promise<() => Promise<void>>` : exécute une fois `runnerHooks.setup` et renvoie le teardown. |
| `readFailedCache` | fonction | `readFailedCache(root: string): Promise<string[]>` : les titres en échec lors de la dernière exécution. |
| `makeReporters` | fonction | `makeReporters(names: readonly string[] \| undefined, useColors: boolean): Reporter`. |
| `makeReportersFrom` | fonction | `makeReportersFrom(reporters: readonly Reporter[]): Reporter`. |
| `armDrainGuard` | fonction | `armDrainGuard(code: number, write?: (message: string) => void): void` : signale ce qui garde en vie une exécution terminée. |
| `DRAIN_GRACE_MS` | const | `2000`. |
| `encodeEnvList` | fonction | `encodeEnvList(values: readonly string[]): string` : encode une liste pour l'environnement des workers. |
| `RunConfig`, `RunOutcome`, `SuiteRun`, `WatchOptions` | type | Entrée et sortie d'une exécution. |
| `HelixConfig`, `SuiteDefinition`, `SuiteFiles` | type | La forme du fichier de configuration. |
| `Reporter`, `Summary` | type | `onFileStart`, `onFileResult`, `onFileError`, `onSummary` ; les totaux de l'exécution. |

### `test` et `TestHandle`

```ts
test(name: string, fn?: TestFn, options?: TestOptions | number): TestHandle
type TestFn = (ctx: TestContext, done: DoneFn) => unknown
```

Un test sans `fn` est un `todo`.

| Membre | Signature | Description |
|---|---|---|
| `test.skip` | `skip(name: string, fn?: TestFn): void` | |
| `test.only` | `only(name: string, fn: TestFn, options?): TestHandle` | |
| `test.todo` | `todo(name: string): void` | |
| `test.each` | `each(rows)(name, fn: (row) => unknown): void` | Un test par ligne. |
| `test.group` | `group(name: string, fn: (group: Group) => void): Group` | Un groupe avec `setup`, `teardown`, `each.{setup,teardown,timeout,disableTimeout,retry}`, `tap`. |
| `test.macro` | `macro(callback: (test: TestInstance, ...args) => R): (...args) => R` | Une macro de ressource. |
| `.retry` | `retry(n: number): TestHandle` | |
| `.timeout` / `.disableTimeout` | `timeout(ms: number): TestHandle` | |
| `.tags` | `tags(tags: string \| string[], strategy?: "replace" \| "append" \| "prepend"): TestHandle` | |
| `.fails` | `fails(reason?: string): TestHandle` | Le test doit lever une erreur. |
| `.setup` / `.teardown` | `setup(fn: HookFn): TestHandle` | Des hooks propres à ce test. |
| `.pin` | `pin(): TestHandle` | Dès qu'un test est épinglé, seuls les tests épinglés s'exécutent. |
| `.skip` | `skip(condition?: boolean \| (() => boolean \| Promise<boolean>), reason?: string): TestHandle` | |
| `.waitForDone` | `waitForDone(): TestHandle` | Se termine quand le corps appelle `done()`. |
| `.with` | `with<Row>(rows: DatasetSource<Row>): DatasetHandle<Row>` | Un jeu de données ; `.run((ctx, row) => …)` fournit le corps. |

### `expect`

Matchers, chacun disponible sous `.not`, `.resolves` et `.rejects` : `toBe`, `toEqual`, `toStrictEqual`, `toMatchObject`, `toBeDefined`, `toBeUndefined`, `toBeNull`, `toBeNaN`, `toBeTruthy`, `toBeFalsy`, `toBeGreaterThan`, `toBeGreaterThanOrEqual`, `toBeLessThan`, `toBeLessThanOrEqual`, `toBeCloseTo`, `toBeInstanceOf`, `toContain`, `toHaveLength`, `toHaveProperty`, `toMatch`, `toThrow`, `toHaveBeenCalled`, `toHaveBeenCalledOnce`, `toHaveBeenCalledTimes`, `toHaveBeenCalledWith`, `toHaveBeenLastCalledWith`, `toHaveBeenNthCalledWith`.

Membres statiques : `objectContaining`, `arrayContaining`, `stringContaining`, `stringMatching`, `any`, `anything`, `assertions(n)`, `hasAssertions()`.

### `Assert`

Méthodes de `ctx.assert` : `plan`, `fail`, `ok`, `notOk`, `isOk`, `isNotOk`, `equal`, `notEqual`, `strictEqual`, `notStrictEqual`, `deepEqual`, `notDeepEqual`, `exists`, `notExists`, `isTrue`, `isNotTrue`, `isFalse`, `isNotFalse`, `isNull`, `isNotNull`, `isUndefined`, `isDefined`, `isNaN`, `isNotNaN`, `isFinite`, `isString`, `isNotString`, `isNumber`, `isNotNumber`, `isBoolean`, `isNotBoolean`, `isFunction`, `isNotFunction`, `isObject`, `isNotObject`, `isArray`, `isNotArray`, `typeOf`, `notTypeOf`, `instanceOf`, `notInstanceOf`, `isAbove`, `isAtLeast`, `isBelow`, `isAtMost`, `closeTo`, `approximately`, `oneOf`, `match`, `notMatch`, `include`, `notInclude`, `deepInclude`, `notDeepInclude`, `lengthOf`, `notLengthOf`, `empty`, `notEmpty`, `isEmpty`, `isNotEmpty`, `property`, `notProperty`, `propertyVal`, `notPropertyVal`, `deepPropertyVal`, `notDeepPropertyVal`, `properties`, `anyProperties`, `onlyProperties`, `notAllProperties`, `notAnyProperties`, `containsSubset`, `containSubset`, `notContainsSubset`, `doesNotContainSubset`, `sameMembers`, `notSameMembers`, `sameDeepMembers`, `notSameDeepMembers`, `sameOrderedMembers`, `notSameOrderedMembers`, `sameDeepOrderedMembers`, `notSameDeepOrderedMembers`, `includeMembers`, `notIncludeMembers`, `includeDeepMembers`, `notIncludeDeepMembers`, `includeOrderedMembers`, `notIncludeOrderedMembers`, `includeDeepOrderedMembers`, `notIncludeDeepOrderedMembers`, `frozen`, `notFrozen`, `isFrozen`, `isNotFrozen`, `sealed`, `notSealed`, `isSealed`, `isNotSealed`, `throws`, `doesNotThrow`, `doesNotThrows`, `rejects`, `doesNotReject`, `doesNotRejects`.

### `vi`

| Membre | Signature | Description |
|---|---|---|
| `fn` | `fn<Fn>(implementation?: Fn): Spy<Fn>` | Une fonction mock. |
| `spyOn` | `spyOn(obj, key, options?: { accessor?: "get" \| "set" }): Spy` | Remplace `obj[key]` par un espion qui appelle l'original. |
| `isMockFunction` | `(value: unknown) => value is Spy` | |
| `clearAllMocks` / `resetAllMocks` / `restoreAllMocks` | `(): typeof vi` | |
| `useFakeTimers` | `useFakeTimers(options?: { now?: number \| Date }): typeof vi` | |
| `useRealTimers` | `(): typeof vi` | |
| `advanceTimersByTime` | `(ms: number): typeof vi` | |
| `runAllTimers` / `runOnlyPendingTimers` / `clearAllTimers` | `(): typeof vi` | |
| `getTimerCount` | `(): number` | |
| `setSystemTime` | `(time: Date \| number) => typeof vi` | |
| `getMockedSystemTime` | `() => number \| null` | |
| `useRealSystemTime` | `() => typeof vi` | Efface l'heure système figée. |

Un `Spy` enregistre `mock.calls`, `mock.results`, `mock.lastCall`, `calls` et `callCount`, et offre `mockImplementation`, `mockImplementationOnce`, `mockReturnValue`, `mockReturnValueOnce`, `mockResolvedValue`, `mockResolvedValueOnce`, `mockRejectedValue`, `mockRejectedValueOnce`, `mockClear`, `mockReset`, `mockRestore`.

### `PluginApi`

```ts
type Plugin = (api: PluginApi) => unknown
```

| Membre | Type | Description |
|---|---|---|
| `config` | `ConfigureOptions` | Les options de cette exécution ; un plugin peut les modifier. |
| `cliArgs` | `CLIArgs` | Les drapeaux que la CLI a transmis à ce worker. |
| `runner` | `Runner` | L'état et le résumé de l'exécution. |
| `emitter` | `Emitter` | Les événements du cycle de vie (`test:start`, `group:end`, …). |
| `context` | `PluginContext` | `macro(name, value)` et `getter(name, fn)` : étendent le contexte de test. |
| `cleanup` | `cleanup(fn: RunnerHook): void` | Un teardown exécuté une fois après tous les tests. |

## Configuration

`helix.config.ts` (ou `.js`, `.mjs`) à la racine du projet :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `suites` | `SuiteDefinition[]` | | Les suites nommées ; `helix test <name>` en sélectionne une. |
| `bootstrap` | `string` | le premier fichier existant de `BOOTSTRAP_FILENAMES` | Chemin du module de bootstrap. |
| `timeout` | `number` | `60000` | Délai par défaut de chaque test, en ms. |
| `fileTimeout` | `number` | `600000` | Durée maximale d'un fichier avant que son worker soit tué, en ms. |
| `forceExit` | `boolean` | `false` | `process.exit()` dès la fin de l'exécution. |
| `allowOnly` | `boolean` | hors CI | Si `.only` / `.pin()` peuvent restreindre l'exécution. |
| `passWithNoTests` | `boolean` | `false` | Sort avec 0 quand il n'y a rien à exécuter. |

`SuiteDefinition` : `name: string`, `files: string | string[] | (() => URL[] | Promise<URL[]>)`, `timeout?: number`, `retries?: number`, `configure?: (suite: SuiteHandle) => void`.

Le module de bootstrap (`tests/bootstrap.ts`) peut exporter `plugins: Plugin[]`, `runnerHooks: { setup?: RunnerHook[]; teardown?: RunnerHook[] }` (exécutés une fois pour toute l'exécution, dans le processus de la CLI), `configureSuite(suite: SuiteHandle)`, `filters: ConfigureFilters` et `importer: (file: URL) => unknown`.

`ConfigureOptions`, passé à `configure()` ou modifié par un plugin via `api.config` :

| Option | Type | Description |
|---|---|---|
| `plugins` | `Plugin[]` | Les plugins à installer. |
| `configureSuite` | `(suite: SuiteHandle) => unknown` | Configure la suite avant son exécution. |
| `setup` / `teardown` | `RunnerHook[]` | Exécutés une fois avant / après les tests. |
| `timeout` | `number` | Délai par défaut des tests de ce fichier, en ms. |
| `retries` | `number` | Tentatives supplémentaires par défaut en cas d'échec. |
| `filters` | `ConfigureFilters` | `files`, `suites`, `tags`, `groups`, `tests`, `matchAll`. |
| `importer` | `(file: URL) => unknown` | La façon d'importer un fichier de test. |
| `forceExit` | `boolean` | |
| `suite` | `string` | La suite à laquelle appartiennent ces tests. |
| `cwd`, `reporters`, `exclude`, `refiner` | | Renseignés par le lanceur. |

## Erreurs

Chaque code est une classe du namespace `errors` et une `Exception` de `@c9up/flare` de statut 500 : testez `error.code` ou `error instanceof errors.E_HELIX_*`.

| Code | Levée quand |
|---|---|
| [`E_HELIX_ASSERTION_FAILED`](/fr/reference/errors#e-helix-assertion-failed) | Une vérification `expect()` ou `assert` a échoué ; porte `actual`, `expected`, `operator`, `showDiff`, et garde le nom `AssertionError` que reconnaissent les rapporteurs. |
| [`E_HELIX_TIMEOUT`](/fr/reference/errors#e-helix-timeout) | Un test ou un hook ne s'est pas terminé dans son délai. C'est aussi le `code` de l'erreur de fichier quand un fichier dépasse `--file-timeout`. |
| [`E_HELIX_TEST_ABORTED`](/fr/reference/errors#e-helix-test-aborted) | Le test en cours a appelé `meta.abort(message)`. |
| [`E_HELIX_UNEXPECTED_ONLY`](/fr/reference/errors#e-helix-unexpected-only) | Jamais levée : le `code` de l'erreur d'un test qu'un `.only` ou un `.pin()` sélectionne dans un run qui ne les permet pas (en CI, ou avec `--allow-only=false`). |
| [`E_HELIX_NO_TEST_SUITE`](/fr/reference/errors#e-helix-no-test-suite) | Le `code` de l'erreur de fichier pour un fichier qui ne déclare aucun test, sauf avec `--pass-with-no-tests`. |
| [`E_HELIX_NO_ACTIVE_TEST`](/fr/reference/errors#e-helix-no-active-test) | Une aide réservée aux tests (`getActiveTestOrFail()`, `time.freeze`/`travel`, `override()`, une fonction de `test.macro`) a été appelée hors d'un test en cours. |
| [`E_HELIX_NO_ACTIVE_CONTAINER`](/fr/reference/errors#e-helix-no-active-container) | `override()` a été appelé avant `useContainer()`. |
| [`E_HELIX_ASYNC_DESCRIBE`](/fr/reference/errors#e-helix-async-describe) | Le corps d'un `describe` a renvoyé une Promise ; attendez la mise en place dans `beforeAll` à la place. |
| [`E_HELIX_NESTED_GROUP`](/fr/reference/errors#e-helix-nested-group) | Un `test.group()` a été déclaré dans un autre groupe. |
| [`E_HELIX_INVALID_TIME`](/fr/reference/errors#e-helix-invalid-time) | Une valeur de temps est inutilisable : epoch non fini ou hors plage, date illisible, mois ou année fractionnaire, unité inconnue, ou `advanceTimersByTime` négatif. |
| [`E_HELIX_FAKE_TIMERS_NOT_INSTALLED`](/fr/reference/errors#e-helix-fake-timers-not-installed) | Un contrôle de timers de `vi` a été appelé avant `vi.useFakeTimers()`. |
| [`E_HELIX_TIMER_LOOP`](/fr/reference/errors#e-helix-timer-loop) | Vider les faux timers a dépassé sa limite d'itérations : un timer se reprogramme sans fin. |
| [`E_HELIX_SPY_NO_PROPERTY`](/fr/reference/errors#e-helix-spy-no-property) | `vi.spyOn()` vise une propriété que l'objet n'a pas. |
| [`E_HELIX_SPY_NOT_FUNCTION`](/fr/reference/errors#e-helix-spy-not-function) | `vi.spyOn()` vise une valeur qui n'est pas une fonction ; passez `{ accessor }` pour un getter ou un setter. |
| [`E_HELIX_SPY_NO_ACCESSOR`](/fr/reference/errors#e-helix-spy-no-accessor) | `vi.spyOn()` demande un getter ou un setter que la propriété ne définit pas. |
| [`E_HELIX_ALREADY_SPIED`](/fr/reference/errors#e-helix-already-spied) | `vi.spyOn()` vise une méthode déjà espionnée ; appelez d'abord `mockRestore()`. |
| [`E_HELIX_RUNNER_NOT_DRIVABLE`](/fr/reference/errors#e-helix-runner-not-drivable) | Un plugin a appelé `runner.add/start/exec/end()` : la découverte et l'exécution appartiennent à la CLI. |
| [`E_HELIX_RELATIVE_PATH`](/fr/reference/errors#e-helix-relative-path) | `runTestFile()` a reçu un chemin relatif. |
| [`E_HELIX_INVALID_GLOB`](/fr/reference/errors#e-helix-invalid-glob) | Un glob d'inclusion ou d'exclusion a un `{`, `(` ou `[` non fermé ; `cause` contient l'erreur de regex. |
| [`E_HELIX_INVALID_THREADS`](/fr/reference/errors#e-helix-invalid-threads) | Le nombre de threads n'est pas un nombre fini. |
| [`E_HELIX_INVALID_COVERAGE_THRESHOLD`](/fr/reference/errors#e-helix-invalid-coverage-threshold) | Un seuil de couverture n'est pas un nombre de 0 à 100, ou un seuil de couverture de diff nomme `functions` ou `branches` (la couverture de diff ne compte que les lignes). |
| [`E_HELIX_INVALID_DIFF_COVERAGE`](/fr/reference/errors#e-helix-invalid-diff-coverage) | La couverture de diff est activée sans la couverture, ou son `cwd` et `coverage.root` sont disjoints. |
| [`E_HELIX_INVALID_WATCH_OPTIONS`](/fr/reference/errors#e-helix-invalid-watch-options) | Le mode watch a reçu un `include` vide ou un `debounceMs` hors plage. |
| [`E_HELIX_WATCH_FAILED`](/fr/reference/errors#e-helix-watch-failed) | Le mode watch n'a pas pu surveiller son dossier racine ; `cause` contient l'erreur de `fs.watch`. |
| [`E_HELIX_WORKER_FAILED`](/fr/reference/errors#e-helix-worker-failed) | Jamais levée : le `code` d'une erreur de fichier quand le worker n'a pas pu démarrer, a envoyé une trame illisible, est sorti sans résultat, ou est sorti d'une façon que son résultat n'explique pas. |
| [`E_HELIX_NATIVE_REQUIRED`](/fr/reference/errors#e-helix-native-required) | Le binaire natif de helix manque, n'a pas pu se charger ou est périmé, ou la plateforme n'en a pas. |
| [`E_HELIX_INTERNAL`](/fr/reference/errors#e-helix-internal) | Un invariant interne de helix est rompu : un bug de helix, à signaler. Les refus du moteur natif arrivent sous ce code. |

## Migration

- `HelixError` disparaît : testez `error.code`, ou `error instanceof errors.E_HELIX_*` avec `import { errors } from '@c9up/helix'`.
- `AssertionError` devient `errors.E_HELIX_ASSERTION_FAILED`, avec les mêmes champs ; `error.name` vaut toujours `'AssertionError'`, et `isAssertionError()` ne change pas.
- `RunnerNotDrivableError` devient `errors.E_HELIX_RUNNER_NOT_DRIVABLE`.

## Voir aussi

- [Le lanceur de tests](/fr/guides/testing/runner)
- [Introduction aux tests](/fr/guides/testing/introduction)
- [Doublures et temps](/fr/guides/testing/test-doubles)
- [helix-plugin-ream](/fr/reference/helix-plugin-ream)
