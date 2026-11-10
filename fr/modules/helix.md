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
| `@c9up/helix/bus` | Assertions sur le bus d'événements — events capturés, chaînes d'ack. |
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
est publié à part — la même séparation qu'AdonisJS applique entre son propre
lanceur de tests et le framework :

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

## Runner CLI (`helix test`)

```sh
helix test                       # un run
helix test app                   # ne lance que les tests sous ./app
helix test --watch               # re-run au changement
helix test --coverage            # couverture V8 + LCOV + seuils
helix test --diff-cov            # diff coverage vs `main`
helix test --tsx=false           # utilise le loader du parent (pas tsx)
```

### Ce qui fait échouer un run

Un run qui n'exécute rien n'est pas un succès. `helix test` sort en 1 quand
la découverte ne trouve aucun fichier de test, quand un chemin, un filtre
`--files` ou une suite nommée ne désigne rien — une sélection restreint le
run, elle ne s'élargit jamais à tout l'arbre — et quand un fichier ne déclare
aucun test. `--pass-with-no-tests` (ou `passWithNoTests` dans
`helix.config.ts`) accepte un run vide.

En CI (`CI` défini), un `.only` ou un `.pin()` fait échouer les tests qu'il
sélectionne au lieu de restreindre le run : oublié dans un commit, il ne peut
pas rendre le build vert. `--allow-only` (ou `allowOnly`) le laisse
restreindre malgré tout ; `--allow-only=false` l'interdit partout.

Une erreur que personne ne gère — une rejection flottante, un timer qui
lève — est une erreur de fichier, rapportée à côté des résultats du fichier,
sur les deux pools, y compris quand elle survient après que le fichier a
rendu son résultat. De même pour un worker qui sort avec un code que ses
résultats n'expliquent pas, et pour un teardown de runner (`api.cleanup`) qui
lève. Une assertion `.resolves` / `.rejects` que le test n'a pas attendue
fait échouer ce test.

Ce qu'un test affiche arrive au terminal quand son fichier se termine, sous
un en-tête `stdout | <fichier>` ou `stderr | <fichier>`, pour que des
fichiers en parallèle ne s'entremêlent pas. `--silent` le supprime ; avec
`--reporter=json`, il part sur stderr pour que stdout reste lisible en JSON.

### Timeouts

`--timeout` s'applique par test. Du plus fort au plus faible : le timeout du
test lui-même, `--timeout`, le `timeout` de la suite, `configure({ timeout })`
ou un plugin qui modifie `api.config.timeout`, le `timeout` du fichier de
config, puis 60 s. Les hooks `beforeEach` / `afterEach` et `test.setup` /
`test.teardown` tournent sous l'échéance de leur test et le font échouer, en
se nommant, s'ils restent bloqués.

Une échéance par fichier, distincte (`--file-timeout`, `fileTimeout`,
10 minutes par défaut), tue un worker bloqué là où aucun timeout de test
n'arrive, comme une boucle synchrone. Tuer un worker tue tout son groupe de
processus : ce que ses tests ont lancé ne lui survit pas. Un worker dont la CLI
meurt sans pouvoir nettoyer (SIGKILL, manque de mémoire) le remarque et sort
lui aussi avec son groupe de processus.

`helix test` fixe `NODE_ENV=test` avant de lire la config ou de lancer les
`runnerHooks` du bootstrap, et les suites résolvent leurs fichiers avant que
`runnerHooks.setup` ne tourne : un callback `files` qui lève ne laisse rien
d'installé.

### Scripts package.json

Utilise le bin `helix` directement — dans les scripts npm il résout vers
`node_modules/.bin/helix`, qui amorce déjà le loader TS. **Inutile** d'écrire la
forme verbeuse `node --import tsx node_modules/@c9up/helix/bin/helix.js …` :

```json
{
  "scripts": {
    "test": "helix test app --threads=1",
    "test:coverage": "helix test app --threads=1 --coverage"
  }
}
```

`app` est le chemin des tests (ne lance que `./app`) ; `--threads=1` exécute en
série — à choisir quand une suite partage de l'état de process (ex. une seule DB
SQLite en mémoire, fake timers), à retirer pour paralléliser des suites indépendantes.

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
