# Publication & CI

Les paquets `@c9up/*` de Ream qui embarquent du code Rust natif (bindings NAPI)
livrent des binaires `.node` pré-compilés via GitHub Actions à chaque push sur
`main`. Les consommateurs lancent `pnpm install @c9up/<pkg>` et le binaire de
leur plateforme se résout automatiquement à l'installation — pas de
`cargo build` sur la machine de l'utilisateur.

Ce guide couvre le pipeline CI, l'expérience d'installation côté consommateur,
et la façon de récupérer après une erreur de binaire manquant.

## Plateformes supportées

Le workflow CI de chaque paquet tourne sur les runners natifs ci-dessous. Les
cinq cellules s'exécutent en parallèle ; une release ne sort que lorsque
toutes passent au vert.

| `process.platform` | `process.arch` | Suffixe | Runner GitHub |
| --- | --- | --- | --- |
| `linux` | `x64` (glibc) | `linux-x64-gnu` | `ubuntu-latest` |
| `linux` | `arm64` (glibc) | `linux-arm64-gnu` | `ubuntu-24.04-arm` |
| `darwin` | `x64` | `darwin-x64` | `macos-13` |
| `darwin` | `arm64` | `darwin-arm64` | `macos-14` |
| `win32` | `x64` (MSVC) | `win32-x64-msvc` | `windows-latest` |

La matrix utilise des runners natifs ; aucune chaîne de cross-compilation
n'est impliquée. Chaque runner compile pour sa propre plateforme via
`cargo build --release -p <crate>-napi`, puis un petit script
`scripts/copy-napi.mjs` positionne l'artefact en tant que
`index.<suffixe>.node` à côté du `package.json` du paquet.

Atlas livre **deux** artefacts NAPI (`index.<suffixe>.node` pour
`atlas-query-napi`, `db.<suffixe>.node` pour `atlas-db-napi`). ream lui-même en
livre plusieurs (`index`, `scheduler`, `events`), suivant la même convention
`<nom>.<suffixe>.node`.

Hors périmètre (à ce jour) :

- Linux x64 musl. Ajouter `linux-x64-musl` exigerait une build basée sur
  `cross` ou Docker, en cassant la contrainte « runners natifs uniquement ».
- Linux arm64 musl.
- Support Bun — le workflow utilise `pnpm install` et `pnpm test`.
- Sous-paquets par plateforme via `optionalDependencies` npm. Voir « Avenir »
  ci-dessous.

## Flow CI par paquet

Chaque paquet livrant un binaire NAPI a un workflow à
`packages/<pkg>/.github/workflows/ci.yml` (par sous-module) — sauf
`ream-mcp`, inline dans le repo `ream-dev` et qui utilise un filtre `paths`
pour cibler ses déclencheurs.

### Déclencheurs

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:
```

`workflow_dispatch` est le déclencheur manuel utilisé pour lancer une
publication (voir plus bas).

### Jobs

1. **`build-and-test`** — matrix 5 plateformes (`fail-fast: false`). Chaque
   cellule exécute `pnpm install` → `pnpm build:napi` →
   `pnpm test --reporter=json`. Une garde de fumée basée sur `jq` vérifie
   qu'aucun test n'est skippé, puis `actions/upload-artifact@v4` uploade
   `index.<suffixe>.node` (avec `if-no-files-found: error` pour qu'un
   artefact manquant inattendu fasse échouer le CI).

2. **`cargo-tests`** — mono-plateforme `ubuntu-latest`. Lance
   `cargo test --workspace`. La logique Rust est indépendante de la
   plateforme, donc la matrix ne ferait que brûler des cycles.

3. **`publish`** — mono-plateforme `ubuntu-latest`,
   `if: github.event_name == 'workflow_dispatch'`,
   `needs: [build-and-test, cargo-tests]`. Vérifie `NPM_TOKEN`, télécharge
   les 5 artefacts plateforme via `actions/download-artifact@v4`, lance
   `pnpm publish --access public --no-git-checks`.

   Actuellement **activé uniquement sur `@c9up/sigil`** comme canary de
   publication. Les 8 autres paquets du sweep livrent le job publish en
   commentaire jusqu'à ce que la stratégie de synchronisation des versions
   ream-cli npm soit tranchée (Story 52.4 Décision C).

## Comment publier

Le flow de publication est **manuel à dessein**. Les publications
déclenchées par tag peuvent partir sur des tags poussés localement par
accident ; `workflow_dispatch` exige un clic UI délibéré par paquet, par
release.

1. Ouvre le repo GitHub du paquet (ex. `github.com/C9up/sigil`).
2. Va dans **Actions** → **`<pkg>`-ci** → **Run workflow**.
3. Choisis `main` et clique **Run workflow**.
4. La matrix tourne (build-and-test sur 5 runners, cargo-tests sur 1,
   publish sur 1 une fois les deux gates vertes).
5. La nouvelle version apparaît sur npm ; les consommateurs qui lancent
   `pnpm install @c9up/<pkg>` résolvent le nouveau tarball.

Le secret de repo `NPM_TOKEN` doit être défini dans les paramètres GitHub
du repo avant que le job publish ne tourne. Le job émet une erreur claire
s'il est absent.

## Installation côté consommateur

```bash
pnpm install @c9up/sigil
```

Le tableau `files` du `package.json` inclut `index.*.node`, donc le tarball
publié embarque **les 5 binaires plateforme** dans un seul paquet
(~5 Mo de surcoût par paquet ; acceptable pour l'itération actuelle). Le
`index.js` du paquet charge le bon binaire au runtime en lisant
`process.platform` + `process.arch` et en faisant
`require()` sur `./index.<suffixe>.node`.

Si ta plateforme n'est pas dans la matrix ci-dessus, tu peux compiler depuis
les sources :

```bash
git clone <repo-du-paquet>
cd <pkg>
pnpm install
pnpm build:napi   # cargo build --release -p <crate>-napi + copy-napi.mjs
```

Puis `npm link` ton checkout local dans ton projet.

## Dépannage — `E_<PKG>_NAPI_REQUIRED`

Si un module Ream lève une erreur du type :

```
[SIGIL_NAPI_REQUIRED] argon2 driver requires the prebuilt NAPI binary at
packages/sigil/index.<platform>.node. To build it locally:
  cd packages/sigil && pnpm build:napi
```

…le binaire pré-compilé n'a pas pu être chargé pour ta plateforme. C'est
généralement parce que :

- Tu es sur une plateforme hors des 5 supportées (cas arch rare — compile
  depuis les sources comme montré plus haut).
- Le paquet a été installé d'une façon qui n'a pas embarqué le binaire (ex.
  dist vendoré, copier-coller de `src/`). Réinstalle via `pnpm install`.
- Le module natif est désaligné avec ton ABI Node. Recompile :
  `pnpm --filter @c9up/<pkg> build:napi`.

Chaque paquet livrant du NAPI porte sa propre section de dépannage dans sa
doc module :

- [`@c9up/sigil`](/fr/modules/sigil#dépannage-e-sigil-napi-required)

Les autres paquets gagneront des sections équivalentes au fur et à mesure
qu'ils adopteront le pattern `E_<PKG>_NAPI_REQUIRED`.

## Avenir

L'approche actuelle « livrer les 5 binaires dans le tarball principal » est
simple mais inefficace : un utilisateur `darwin-arm64` paie pour les quatre
binaires qu'il n'utilise pas. Le pattern npm propre, ce sont les
**sous-paquets par plateforme** avec `optionalDependencies` :

- `@c9up/sigil` (paquet principal) déclare `@c9up/sigil-linux-x64-gnu`,
  `@c9up/sigil-darwin-arm64`, etc., en `optionalDependencies`.
- Chaque variante plateforme est un paquet publié à part avec un seul
  binaire.
- npm ne résout que le sous-paquet de la plateforme correspondante à
  l'installation.

Cette migration est un epic distinct (Epic 53+) ; elle dépend de la
résolution de la stratégie de synchronisation des versions ream-cli npm
(Story 52.4 Décision C).
