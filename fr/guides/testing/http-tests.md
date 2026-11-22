# Tests HTTP

Ce guide couvre le test des endpoints HTTP :

- TestClient (HTTP)
- Applications Ream : le pont `@c9up/helix-plugin-ream`
- Installation
- Injecter un client de test
- Lancer les suites déclarées dans le fichier rc
- Ce qui reste dans Ream

## TestClient (HTTP)

Le client fluide boote un Ignitor sur un port aléatoire, expose `port`
pour les connexions longues (SSE / WebSocket), et proxy vers le vrai
HyperServer — pas de mock in-process. Mêmes providers, middlewares,
binaires NAPI et pragmas qu'en prod.

```ts
import { TestClient } from '@c9up/ream/testing'
import { Ignitor } from '@c9up/ream'

const client = new TestClient(async (port) => {
  const ignitor = new Ignitor(APP_ROOT, { port }).httpServer()
  const started = await ignitor.start()
  return { port: await started.port(), close: async () => started.stop() }
})

await client.boot()

const res = await client
  .post('/auth/login')
  .json({ email: 'a@b.c', password: 'hunter2-strong-1' })
  .send()

res.expect(200).expectJson({ ok: true })
```

Le timeout d'inactivité au niveau socket est de **30 s** (aligné sur
`helix test --timeout=60000`), donc signup → argon2 → insert sqlite →
JWT sign laisse de la marge.

## Applications Ream : le pont `@c9up/helix-plugin-ream`

helix ne connaît pas Ream, et Ream ne connaît pas helix. Le plugin qui les relie
est publié à part :

```sh
pnpm add -D @c9up/helix-plugin-ream
```

```ts
// tests/bootstrap.ts
import type { ConfigureOptions, Plugin, RunnerHook } from '@c9up/helix'
import { apiClient } from '@c9up/helix-plugin-ream'
import { createTestUtils } from '@c9up/ream/testing/utils'

export const testUtils = createTestUtils((port) => bootApp(port))

export const plugins: Plugin[] = [apiClient({ testUtils })]

export const runnerHooks: { setup: RunnerHook[]; teardown: RunnerHook[] } = {
  setup: [],
  teardown: [],
}

export const configureSuite: ConfigureOptions['configureSuite'] = (suite) => {
  if (suite.name === 'functional') {
    return suite.setup(() => testUtils.httpServer().start())
  }
}
```

Le module de bootstrap **exporte** `plugins`, `runnerHooks` et
`configureSuite` ; il n'appelle jamais `configure()` lui-même. helix l'importe
et configure chaque campagne avec ces exports et le nom de la suite lancée — un
`configure()` appelé dans le fichier s'exécuterait à l'import, avant qu'aucune
suite n'existe, et `functional` ne démarrerait jamais son serveur. `ream new`
écrit ce fichier.

Seule la suite `functional` démarre un serveur, et `ctx.client` porte un
`TestClient` qui pointe vers lui :

```ts
test('health', async ({ client }) => {
  await client.get('/health').assertOk()
})
```

`ream test` lit ses suites depuis le fichier rc via ce même paquet
(`@c9up/helix-plugin-ream/runner`).

`@c9up/helix-plugin-ream` joint le framework à son lanceur de tests. Ream ne connaît pas [Helix](/fr/guides/testing/introduction), Helix ne connaît pas Ream : le paquet qui les relie vit ici et déclare les deux côtés en pairs.

C'est ce qui permet à la CI de Helix d'être verte sans publier Ream, et inversement. Chacun garde son propre cycle de release.

## Installation

```sh
pnpm add -D @c9up/helix-plugin-ream @c9up/helix
```

## Injecter un client de test

Le module de bootstrap **exporte** `plugins`, `runnerHooks` et
`configureSuite` ; il n'appelle jamais `configure()` lui-même. helix l'importe
et configure chaque campagne avec ces exports et le nom de la suite lancée — un
`configure()` appelé dans le fichier s'exécuterait à l'import, avant qu'aucune
suite n'existe, et le hook de suite ne verrait jamais `functional`. `ream new`
écrit ce fichier :

```ts
// tests/bootstrap.ts
import type { ConfigureOptions, Plugin, RunnerHook } from '@c9up/helix'
import { apiClient } from '@c9up/helix-plugin-ream'
import { createTestUtils } from '@c9up/ream/testing/utils'

export const testUtils = createTestUtils((port) => bootApp(port))

export const plugins: Plugin[] = [apiClient({ testUtils })]

export const runnerHooks: { setup: RunnerHook[]; teardown: RunnerHook[] } = {
  setup: [],
  teardown: [],
}

export const configureSuite: ConfigureOptions['configureSuite'] = (suite) => {
  if (suite.name === 'functional') {
    return suite.setup(() => testUtils.httpServer().start())
  }
}
```

```ts
test('health', async ({ client }) => {
  await client.get('/health').assertOk()
})
```

Avec `testUtils`, c'est le hook de suite qui possède le serveur : le plugin lit
le client du serveur que ce hook a démarré, si bien que les deux pointent le
même, et une suite unitaire qui ne déclare aucun hook ne démarre aucun serveur
et ne paie rien. Le teardown du hook le ferme.

Chaque test reçoit son propre `ctx.client` sur ce serveur unique : un en-tête
qu'un test pose avec `withHeader()` — un `authorization` avec lequel il se
connecte — s'arrête avec le test et n'atteint jamais le suivant. `testClient()`
renvoie le client du test en cours, et hors d'un test le client du serveur
lui-même, pour une fixture ou un hook de runner.

### Laisser le client démarrer l'application

Pour un projet dont les suites ne sont pas encore séparées, `boot` laisse le
client posséder son propre serveur :

```ts
export const plugins: Plugin[] = [apiClient({ boot: (port) => bootApp(port) })]
```

Le serveur démarre à la **première requête** du client, si bien qu'un fichier de
test qui n'en émet aucune ne paie rien, et il se ferme par `api.cleanup` à la fin
de la campagne. Préférez `testUtils`.

## Lancer les suites déclarées dans le fichier rc

```ts
import { runTestsFromRcFile } from '@c9up/helix-plugin-ream/runner'
```

C'est ce que `ream test` appelle.

Les options écrasent ce que dit le fichier rc : `suites`, `threads`, `reporters`,
`bail`, `passWithNoTests`, et `coverage` — cette dernière passée telle quelle à
Helix, la couverture appartenant au runner.

Les flags de `ream test` arrivent avec le reste des options, et chacun restreint
ou règle le run :

| Option | Flag de `ream test` | Effet |
| --- | --- | --- |
| `filters.files` | `--files` | Garde les fichiers de test correspondants (`user`, `unit/*`, une fin de chemin) |
| `filters.tags` | `--tags` | Garde les tests portant un tag ; `~@tag` exclut |
| `filters.groups` | `--groups` | Garde les tests des groupes nommés |
| `filters.tests` | `--tests` | Garde les tests de ces titres exacts, virgules comprises |
| `timeout` | `--timeout` | Timeout de chaque test, qui l'emporte sur celui de la suite et du fichier rc |
| `retries` | `--retries` | Tentatives supplémentaires pour chaque test d'une suite qui n'en déclare pas |
| `failed` | `--failed` | Ne lance que les tests en échec au run précédent |
| `watch`, `poll`, `clear` | `--watch`, `--poll`, `--no-clear` | Relance à chaque changement ; sonde au lieu des événements du système de fichiers ; garde la sortie précédente au lieu d'effacer l'écran |

Un filtre de fichiers qui vide une suite nommée n'est pas une erreur ; un run
sans aucun fichier sort toujours en 1.

`NODE_ENV=test` est fixé et les fichiers `.env` chargés (`.env.test` avant
`.env`) avant l'import du fichier rc. Un run qui ne trouve aucun fichier de test
sort en 1, tout comme une suite nommée dans `suites` qui ne désigne rien, sauf
si `passWithNoTests` est posé. Le `tests.timeout` du fichier rc est la valeur
par défaut qu'un `configure({ timeout })` de plugin peut remplacer ; le
`timeout` propre d'une suite l'emporte sur les deux.

```ts
await runTestsFromRcFile('./reamrc.ts', {
  suites: ['unit'],
  coverage: { enabled: true, include: ['app/**/*.ts'], thresholds: { lines: 80 } },
})
```

## Ce qui reste dans Ream

`TestClient`, `createTestClient`, `RequestBuilder` et `ApiResponse` vivent dans `@c9up/ream/testing`. Ils pilotent un serveur Ream en HTTP et ne doivent rien au lanceur : ils n'ont donc besoin d'aucun plugin, et un projet qui teste avec autre chose les utilise tels quels.
