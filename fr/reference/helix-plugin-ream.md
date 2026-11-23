# helix-plugin-ream

`@c9up/helix-plugin-ream` : le pont entre une app ream et le lanceur de tests helix : un plugin qui place un client de test HTTP sur le contexte de chaque test, et le lanceur derrière `ream test`. Guide : [Tests HTTP](/fr/guides/testing/http-tests).

## Installation

```bash
pnpm add -D @c9up/helix-plugin-ream
```

`@c9up/helix` (`^0.2.13`) et `@c9up/ream` (`^0.2.7`) sont des dépendances pairs. Le client lui-même, `TestClient`, vit dans [`@c9up/ream/testing`](/fr/reference/ream#c9up-ream-testing).

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/helix-plugin-ream` | `apiClient()`, `testClient()`, leurs types, et l'augmentation `ctx.client` du `TestContext` de helix. |
| `@c9up/helix-plugin-ream/runner` | `runTests()`, `runTestsFromRcFile()` et leurs options : lancer les suites déclarées dans le fichier rc. |

## Exports

### `@c9up/helix-plugin-ream`

| Export | Nature | Description |
|---|---|---|
| `apiClient` | fonction | Un plugin helix qui injecte un `TestClient` neuf sur chaque test, en `ctx.client`. |
| `testClient` | fonction | Le client qu'utilise l'exécution, accessible sans contexte de test. |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs). Aussi exporté par `./runner`. |
| `ApiClientConfig` | interface | Les options d'`apiClient()`. |
| `ClientHost` | type | `Pick<PluginApi, "context" \| "cleanup">` : la partie de l'API de plugin de helix qu'utilise le plugin. |

Importer le paquet ajoute `client: TestClient` au `TestContext` de helix.

```ts
function apiClient(config: ApiClientConfig): (api: ClientHost) => Promise<void>
function testClient(): TestClient
```

`apiClient()` donne à chaque test son propre client (les en-têtes posés avec `withHeader()` disparaissent avec le test), au-dessus du serveur que le fichier a démarré. Avec `testUtils`, ce serveur est celui que démarre un hook de suite, et une suite sans ce hook n'a pas de serveur. Avec `boot`, le plugin possède le serveur et le démarre à la première requête ; son nettoyage le ferme.

`testClient()` renvoie le `ctx.client` du test courant pendant un test, et le client du serveur du fichier en dehors (une fixture, un module utilitaire, un hook du lanceur).

`ApiClientConfig` :

| Champ | Type | Description |
|---|---|---|
| `testUtils` | `TestUtils` | Les utilitaires dont un hook de suite démarre `httpServer()` ; le plugin lit le client de ce serveur. |
| `boot` | `BootServer` | Démarre l'app directement, à la première requête du client. Pour un projet dont les suites ne sont pas séparées. |
| `auth` | `AuthStrategy` | La stratégie d'authentification de `client.withAuth()` / `asUser()`. |
| `routes` | `RouteManifest` | Le manifeste des routes nommées (`router.namedManifest()`) pour `client.visit()`. |

`testUtils` ou `boot` est obligatoire.

### `@c9up/helix-plugin-ream/runner`

| Export | Nature | Description |
|---|---|---|
| `runTestsFromRcFile` | fonction | Charge un fichier rc et lance ses suites : la ligne unique d'un `bin/test.ts`. |
| `runTests` | fonction | Lance la configuration `tests` fournie. Renvoie le code de sortie. |
| `workerNodeArgs` | fonction | Les drapeaux de lancement des processus workers : `options.nodeArgs`, ou l'`execArgv` de ce processus. |
| `RunTestsOptions` | interface | Ce qu'un appelant peut surcharger par-dessus le fichier rc. |
| `TestFilters` | interface | `{ suites?, files?, tags?, groups?, tests?: string[] }` : les filtres que transmet `ream test`. |
| `errors` | namespace | Le même namespace que celui de l'entrée principale. |

```ts
function runTestsFromRcFile(rcPath: string, options?: RunTestsOptions): Promise<number>
function runTests(tests: TestsConfig | undefined, options?: RunTestsOptions): Promise<number>
function workerNodeArgs(options: RunTestsOptions): string[]
```

Les deux fonctions de lancement posent `NODE_ENV=test` et chargent les fichiers `.env` de `root` (`.env.test` par-dessus `.env`, `.env.local` ignoré) avant tout le reste ; `runTestsFromRcFile` le fait avant d'importer le fichier rc. `rcPath` se résout par rapport à `root`. Préférez `runTestsFromRcFile` : il passe le chemin du fichier rc en `configModule`, dont a besoin le callback `configure` d'une suite.

```ts
// bin/test.ts
import { runTestsFromRcFile } from '@c9up/helix-plugin-ream/runner'

process.exitCode = await runTestsFromRcFile('./reamrc.ts', {
  suites: process.argv.slice(2),
})
```

`RunTestsOptions` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `root` | `string` | `process.cwd()` | La racine du projet, base de résolution des suites. |
| `suites` | `string[]` | toutes les suites déclarées | Les noms des suites à lancer, dans cet ordre. |
| `threads` | `number` | | Processus workers concurrents. |
| `reporters` | `string[]` | | Noms des reporters (`["spec", "json"]`). |
| `bail` | `boolean` | | S'arrête au premier échec. |
| `coverage` | `RunConfig["coverage"]` de helix | | Couverture V8, transmise telle quelle à helix. |
| `configModule` | `string` | posé par `runTestsFromRcFile` | Le module qui a déclaré les suites, réimporté dans chaque worker pour `suites[].configure`. |
| `nodeArgs` | `string[]` | `process.execArgv` | Les drapeaux de lancement des workers. |
| `passWithNoTests` | `boolean` | `false` | Sort avec 0 quand la sélection ne trouve aucun fichier de test, ou qu'un fichier ne déclare aucun test. |
| `filters` | `TestFilters` | | Restreint l'exécution : fichiers, tags (`~@tag` exclut), titres de groupes, titres de tests ; `filters.suites` s'ajoute à `suites`. |
| `timeout` | `number` | | Délai de chaque test en ms ; l'emporte sur celui de la suite et du fichier rc. |
| `retries` | `number` | | Tentatives supplémentaires pour chaque test ; l'emporte sur celles de la suite. |
| `failed` | `boolean` | | Ne lance que les tests en échec lors de la dernière exécution. |
| `watch` | `boolean` | | Surveille les fichiers et relance à chaque modification. |
| `poll` | `boolean` | | Avec `watch` : détecte les modifications par interrogation périodique. |
| `clear` | `boolean` | `true` | Avec `watch` : efface le terminal avant chaque relance. |
| `drainGuard` | `boolean` | `false` | Quand l'exécution se termine mais que le processus reste vivant, signale après un délai de grâce ce qui reste ouvert et sort avec le code de l'exécution. `ream test` l'active. |

Quand le fichier rc pose `tests.forceExit`, le processus sort avec le code de l'exécution dès qu'elle se termine.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_HELIX_PLUGIN_REAM_NO_SERVER`](/fr/reference/errors#e-helix-plugin-ream-no-server) | `apiClient()` n'a reçu ni `testUtils` ni `boot`. |
| [`E_HELIX_PLUGIN_REAM_SERVER_NOT_STARTED`](/fr/reference/errors#e-helix-plugin-ream-server-not-started) | Un test lit `ctx.client` mais aucun hook de suite n'a démarré le serveur. |
| [`E_HELIX_PLUGIN_REAM_NO_TEST_CLIENT`](/fr/reference/errors#e-helix-plugin-ream-no-test-client) | `testClient()` est appelé alors qu'aucun plugin `apiClient()` n'est actif. |
| [`E_HELIX_PLUGIN_REAM_UNKNOWN_SUITE`](/fr/reference/errors#e-helix-plugin-ream-unknown-suite) | Un nom de suite a été demandé mais le fichier rc ne le déclare pas. |
| [`E_HELIX_PLUGIN_REAM_SUITE_CONFIGURE_UNREACHABLE`](/fr/reference/errors#e-helix-plugin-ream-suite-configure-unreachable) | Une suite déclare `configure` et le lanceur n'a aucun chemin de module pour le réimporter dans chaque worker. |

Chacune est une classe d'`errors`, une `Exception` de flare : lisez `error.code`, ou testez `error instanceof errors.E_HELIX_PLUGIN_REAM_UNKNOWN_SUITE`.

## Migration

- `HelixPluginReamError`, `UnknownSuiteError` et `SuiteConfigureUnreachableError` disparaissent : testez `error.code`, ou `instanceof` la classe correspondante d'`errors` (`errors.E_HELIX_PLUGIN_REAM_UNKNOWN_SUITE`, `errors.E_HELIX_PLUGIN_REAM_SUITE_CONFIGURE_UNREACHABLE`).
- Trois codes portent désormais le préfixe du paquet : `E_NO_SERVER` devient `E_HELIX_PLUGIN_REAM_NO_SERVER`, `E_SERVER_NOT_STARTED` devient `E_HELIX_PLUGIN_REAM_SERVER_NOT_STARTED`, `E_NO_TEST_CLIENT` devient `E_HELIX_PLUGIN_REAM_NO_TEST_CLIENT`.

## Voir aussi

- [Tests HTTP](/fr/guides/testing/http-tests)
- [Le lanceur de tests](/fr/guides/testing/runner)
- [Authentifier un client de test](/fr/guides/testing/auth)
- [helix](/fr/reference/helix)
- [ream](/fr/reference/ream)
