# Helix — Boîte à outils de tests

Helix est la boîte à outils de tests unifiée de Ream (`@c9up/helix`) :
fakes bus / HTTP / DB, assertions fluides, overrides du container,
voyage dans le temps, et un test-runner CLI compatible Vitest. Les
applis qui suivent la convention pilotent chaque test d'intégration
cross-module via Helix au lieu de bricoler des fixtures par package.

## Installation

```bash
pnpm ream add -D @c9up/helix
```

## Sous-barrels

| Chemin d'import | Rôle |
|---|---|
| `@c9up/helix` | Ré-exporte la DSL runtime (`test`, `describe`, `expect`, `vi`, hooks de cycle) et les helpers les plus utilisés. |
| `@c9up/helix/bus` | Assertions sur le bus Pulsar — events capturés, chaînes d'ack. |
| `@c9up/helix/http` | `TestClient` HTTP fluide avec helpers auth + assertions. |
| `@c9up/helix/db` | Factory + `useTransaction` + `truncateAll` + SQLite en mémoire. |
| `@c9up/helix/mail` | `MailFake` pour capture / assert sur `@c9up/rover`. |
| `@c9up/helix/nova` | `NovaFake` pour capture / assert sur `@c9up/nova`. |
| `@c9up/helix/queue` | `QueueFake` pour capture / assert sur `@c9up/bay`. |
| `@c9up/helix/relay` | `RelayFake` pour capture des broadcasts `@c9up/relay`. |
| `@c9up/helix/storage` | Driver `Archive` en mémoire + assertions. |
| `@c9up/helix/logger` | Assertions sur les logs capturés de `@c9up/spectrum`. |
| `@c9up/helix/time` | `time.freeze()` / `travel()` au-dessus de Chronos. |
| `@c9up/helix/runtime` | DSL Vitest-compatible standalone si vous voulez l'importer explicitement. |
| `@c9up/helix/container` | `helix.override(token, value)` pour stubber l'IoC par test. |
| `@c9up/helix/fixtures` | Factories + seeders. |

## TestClient (HTTP)

Le client fluide boote un Ignitor sur un port aléatoire, expose `port`
pour les connexions longues (SSE / WebSocket), et proxy vers le vrai
HyperServer — pas de mock in-process. Mêmes providers, middlewares,
binaires NAPI et pragmas qu'en prod.

```ts
import { TestClient } from '@c9up/helix'
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

## Runner CLI (`helix test`)

```sh
helix test                       # un run
helix test --watch               # re-run au changement
helix test --coverage            # couverture V8 + LCOV + seuils
helix test --diff-cov            # diff coverage vs `main`
helix test --tsx=false           # utilise le loader du parent (pas tsx)
```

### Diff coverage en monorepo

`diffCoverage.cwd` défaut sur `coverage.root` et le runner accepte
toute direction où les deux chemins partagent une ascendance :

- `cwd` est un ancêtre de `root` (cas monorepo : `cwd` = racine git,
  `root` = `packages/foo/src`)
- `cwd` est un descendant de `root` (cas single-repo classique)
- `cwd === root`

Seuls les arbres **entièrement disjoints** sont refusés (sinon overlay
0 % silencieux).

## Overrides du container

```ts
import { helix } from '@c9up/helix'

helix.override(MailManager, new MailFake())
helix.override('logger', captureLogger)
```

Les overrides se reset par test via `beforeEach` quand configurés via
la DSL runtime.

## Voyage dans le temps

```ts
import { time } from '@c9up/helix'

time.freeze('2026-01-01T12:00:00Z')
time.travel(60_000)         // +1 minute
time.unfreeze()
```

Enveloppe `@c9up/chronos` : `DateTime.now()` et n'importe quelle colonne
Atlas `created_at` / `updated_at` voient l'horloge gelée.

## Bonnes pratiques

- Utilisez les assertions fluides (`res.expectJson(...)`) plutôt que des
  `expect()` bruts — les messages d'échec restent lisibles.
- Truncate via `truncateAll(db)` dans `beforeEach` pour des tests DB
  parallel-safe.
- Pilotez les assertions bus / mail / queue / nova via les fakes — ne
  testez jamais contre les drivers prod.
- Épinglez `poolMax: 1` dans la config de test pour SQLite — son modèle
  de sérialisation des écritures laisse les lectures de pool racer avec
  les writes récents sous séquences e2e rapides.
