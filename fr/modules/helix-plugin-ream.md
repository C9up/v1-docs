# Helix plugin — le pont ream ↔ helix

`@c9up/helix-plugin-ream` joint le framework à son lanceur de tests. Ream ne connaît pas [Helix](/fr/modules/helix), Helix ne connaît pas Ream : le paquet qui les relie vit ici et déclare les deux côtés en pairs.

C'est ce qui permet à la CI de Helix d'être verte sans publier Ream, et inversement. Chacun garde son propre cycle de release.

## Installation

```sh
pnpm add -D @c9up/helix-plugin-ream @c9up/helix
```

## Injecter un client de test

```ts
// tests/bootstrap.ts
import { configure } from '@c9up/helix'
import { apiClient } from '@c9up/helix-plugin-ream'

await configure({ plugins: [apiClient({ boot: () => bootApp() })] })
```

```ts
test('health', async ({ client }) => {
  await client.get('/health').assertOk()
})
```

Le serveur démarre une fois au moment du `configure()`, est partagé sur toute la campagne, et se ferme par `api.cleanup` quand elle se termine.

### Laisser un hook de suite posséder le serveur

Une suite unitaire qui ne déclare aucun hook ne démarre aucun serveur et ne paie rien :

```ts
import { createTestUtils } from '@c9up/ream/testing/utils'

const testUtils = createTestUtils(boot)
await configure({ plugins: [apiClient({ testUtils })] })
```

Le plugin lit alors le client du serveur que le hook a démarré, si bien que les deux pointent le même.

## Lancer les suites déclarées dans le fichier rc

```ts
import { runTestsFromRcFile } from '@c9up/helix-plugin-ream/runner'
```

C'est ce que `ream test` appelle.

## Ce qui reste dans Ream

`TestClient`, `createTestClient`, `RequestBuilder` et `ApiResponse` vivent dans `@c9up/ream/testing`. Ils pilotent un serveur Ream en HTTP et ne doivent rien au lanceur : ils n'ont donc besoin d'aucun plugin, et un projet qui teste avec autre chose les utilise tels quels.
