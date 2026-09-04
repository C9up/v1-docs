# Helix plugin — the ream ↔ helix bridge

`@c9up/helix-plugin-ream` joins the framework to its test runner. Ream knows nothing about [Helix](/en/modules/helix), Helix knows nothing about Ream: the package that joins them lives here and declares both sides as peers.

That is what lets Helix's CI go green without publishing Ream, and the other way round. Each keeps its own release cycle.

## Install

```sh
pnpm add -D @c9up/helix-plugin-ream @c9up/helix
```

## Inject a test client

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

The server boots once at `configure()` time, is shared across the run, and closes through `api.cleanup` when the run ends.

### Let a suite hook own the server

A unit suite that declares no hook starts no server and pays nothing:

```ts
import { createTestUtils } from '@c9up/ream/testing/utils'

const testUtils = createTestUtils(boot)
await configure({ plugins: [apiClient({ testUtils })] })
```

The plugin then reads the client of the server that hook started, so both point at one server.

## Run the suites declared in the rc file

```ts
import { runTestsFromRcFile } from '@c9up/helix-plugin-ream/runner'
```

This is what `ream test` calls.

## What stays in Ream

`TestClient`, `createTestClient`, `RequestBuilder` and `ApiResponse` live in `@c9up/ream/testing`. They drive a Ream server over HTTP and owe nothing to the runner, so they need no plugin, and a project testing with something else uses them as they are.
