# Helix plugin — le pont ream ↔ helix

`@c9up/helix-plugin-ream` joint le framework à son lanceur de tests. Ream ne connaît pas [Helix](/fr/modules/helix), Helix ne connaît pas Ream : le paquet qui les relie vit ici et déclare les deux côtés en pairs.

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
`bail`, et `coverage` — cette dernière passée telle quelle à Helix, la
couverture appartenant au runner.

```ts
await runTestsFromRcFile('./reamrc.ts', {
  suites: ['unit'],
  coverage: { enabled: true, include: ['app/**/*.ts'], thresholds: { lines: 80 } },
})
```

## Ce qui reste dans Ream

`TestClient`, `createTestClient`, `RequestBuilder` et `ApiResponse` vivent dans `@c9up/ream/testing`. Ils pilotent un serveur Ream en HTTP et ne doivent rien au lanceur : ils n'ont donc besoin d'aucun plugin, et un projet qui teste avec autre chose les utilise tels quels.
