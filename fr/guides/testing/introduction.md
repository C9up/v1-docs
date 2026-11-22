# Introduction

Ce guide couvre les tests avec helix :

- Installation
- Points d'entrée
- Bonnes pratiques

Helix est la boîte à outils de tests unifiée de Ream (`@c9up/helix`) : un
test-runner CLI, des assertions fluides, les overrides du container, le voyage
dans le temps, et le contrat de plugin par lequel chaque paquet livre ses
propres fakes. Les
applis qui suivent la convention pilotent chaque test d'intégration
cross-module via Helix au lieu de bricoler des fixtures par package.

## Installation

```bash
pnpm ream add -D @c9up/helix
```

## Points d'entrée

| Chemin d'import | Rôle |
|---|---|
| `@c9up/helix` | La DSL runtime (`test`, `describe`, `it`, `expect`, `vi`, hooks de cycle, `configure`), la façade du container et `time`. |
| `@c9up/helix/runtime` | La DSL runtime seule. |
| `@c9up/helix/container` | La façade du container seule : `override`, `overrideOn`, `useContainer`, `spy`. |
| `@c9up/helix/time` | `freeze`, `travel`, `travelTo`, `unfreeze`, `frozenAt` — l'horloge figée par `vi.setSystemTime`. |
| `@c9up/helix/runner` | Le runner programmatique qu'un framework hôte pilote depuis son propre fichier de configuration. |

helix ne simule rien de l'écosystème : chaque paquet livre ses fakes et ses
helpers sous sa propre entrée `/testing`, comme plugins pour
`configure({ plugins })`.

| Chemin d'import | Ce qu'il apporte à un test |
|---|---|
| `@c9up/ream/testing` | `TestClient`, le client HTTP fluide (ci-dessous). |
| `@c9up/atlas/testing` | `factory`, `useTransaction`, `truncateAll`. |
| `@c9up/rover/testing` | `FakeMail`, `mailFake`. |
| `@c9up/nova/testing` | `FakeNova`. |
| `@c9up/bay/testing` | `FakeQueue`. |
| `@c9up/relay/testing` | `FakeRelay`. |
| `@c9up/archive/testing` | `FakeStorage`, `driveFake`. |
| `@c9up/spectrum/testing` | `FakeLogger`. |

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
