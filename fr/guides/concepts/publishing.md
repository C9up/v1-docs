# Publier des paquets

Ce guide couvre la publication d’un paquet à code natif :

- Plateformes supportées
- Comment les binaires sont livrés
- Flow CI par paquet
- Comment publier
- Installation côté consommateur
- Dépannage — `E_<PKG>_NAPI_REQUIRED`

Les paquets `@c9up/*` de Ream qui embarquent du code Rust natif (bindings NAPI)
livrent des binaires `.node` pré-compilés par GitHub Actions. Vous lancez
`pnpm install @c9up/<pkg>` et vous recevez le binaire de votre plateforme à
l'installation. Vous ne lancez jamais `cargo build` sur votre machine.

Ce guide couvre le pipeline CI, l'installation côté consommateur, et la façon
de vous en sortir après une erreur de binaire manquant.

## Plateformes supportées

Le workflow CI de chaque paquet compile les cinq cibles ci-dessous en
parallèle. Une release ne sort que lorsque toutes passent au vert.

| `process.platform` | `process.arch` | Suffixe | Runner GitHub |
| --- | --- | --- | --- |
| `linux` | `x64` (glibc) | `linux-x64-gnu` | `ubuntu-latest` |
| `linux` | `arm64` (glibc) | `linux-arm64-gnu` | `ubuntu-24.04-arm` |
| `darwin` | `x64` | `darwin-x64` | `macos-15` (compilé depuis arm64) |
| `darwin` | `arm64` | `darwin-arm64` | `macos-15` |
| `win32` | `x64` (MSVC) | `win32-x64-msvc` | `windows-latest` |

Chaque runner compile avec `cargo build --release -p <crate>-napi`. Puis
`scripts/copy-napi.mjs` copie le résultat en `index.<suffixe>.node` à côté du
`package.json` du paquet.

Hors périmètre (à ce jour) :

- Linux musl (Alpine), x64 ou arm64. Les binaires Linux ciblent glibc.
- Bun. Les workflows utilisent `pnpm install` et `pnpm test`.

## Comment les binaires sont livrés

Le paquet principal ne contient aucun binaire. Chaque plateforme a son propre
paquet npm, nommé d'après le paquet principal et le suffixe :
`@c9up/<pkg>-<suffixe>`. Pour `@c9up/sigil`, cela donne
`@c9up/sigil-linux-x64-gnu`, `@c9up/sigil-darwin-arm64`, etc.

- Un paquet de plateforme contient les binaires d'une plateforme, la licence
  et les [avis de licence](#avis-de-licence) des crates qu'ils contiennent.
  La plupart des paquets ont un seul binaire, `index.<suffixe>.node`.
  Certains en ont plusieurs : atlas livre `index` et `db`, ream livre `index`,
  `scheduler` et `events`. Chacun s'appelle `<nom>.<suffixe>.node`.
- Un paquet de plateforme déclare `os`, `cpu` et, sous Linux,
  `libc: ["glibc"]`. Votre gestionnaire de paquets s'en sert pour n'installer
  que le paquet de votre machine.
- Le paquet principal liste chaque paquet de plateforme dans
  `optionalDependencies`, épinglé à sa propre version exacte (`"0.1.21"`,
  jamais `"^0.1.21"`). Un binaire d'une autre version, c'est un autre code
  Rust : les versions ne se mélangent jamais.

Les manifestes de plateforme sont dans `npm/<suffixe>/package.json`. Ils sont
commités, et personne ne les modifie à la main : `scripts/platform-packages.mjs`
les écrit, avec les `optionalDependencies` du paquet principal. Lancez-le après
chaque changement de version :

```bash
pnpm platforms:sync    # node scripts/platform-packages.mjs
pnpm platforms:check   # échoue si un manifeste ou une version épinglée est périmé
```

### Où un paquet cherche son binaire

Le chargeur cherche à deux endroits, dans cet ordre :

1. **La build locale**, à la racine du paquet. Dans un checkout,
   `pnpm build:napi` y dépose le binaire : vous exécutez toujours le Rust que
   vous venez de compiler.
2. **Le paquet de plateforme** `@c9up/<pkg>-<suffixe>`, installé avec le paquet
   principal.

Le chargeur ne demande le paquet de plateforme que s'il n'y a aucun fichier
local. Un fichier local présent qui ne se charge pas, c'est une build cassée :
le chargeur la signale, avec l'erreur de chargement en `cause`. Il n'exécute
pas en silence le binaire installé à la place.

## Avis de licence

Un binaire `.node` contient le code de chaque crate Rust dont il dépend. La
plupart de ces crates sont sous licence MIT, BSD ou ISC. Ces licences
demandent que leur mention de copyright et leur texte accompagnent chaque copie
du code, binaires compris.

Chaque paquet natif livre donc un fichier `THIRD-PARTY-NOTICES.md`. Il donne :

- chaque crate compilée dans les binaires, avec sa version et la licence
  qu'elle déclare ;
- le code C que certaines crates compilent avec elles, par exemple libwebp et
  dav1d dans prism, ou SQLite dans atlas ;
- le texte complet de chaque licence, avec les crates qu'il couvre.

Le fichier est dans le paquet principal et dans chaque paquet de plateforme.
ream-cli le place à côté de son exécutable `ream`, dans chacun de ses paquets
npm.

### Comment le fichier est produit

`scripts/third-party-notices.mjs` écrit le fichier avec
[cargo-about](https://github.com/EmbarkStudios/cargo-about). Il lit
`Cargo.lock` et ne garde que les crates compilées dans les binaires que le
paquet livre, pour les plateformes que la CI construit. Les outils de test et
de build sont exclus.

Ne modifiez pas le fichier à la main. Relancez le script après avoir changé une
dépendance Rust, et commitez le résultat :

```bash
node scripts/third-party-notices.mjs          # réécrit le fichier
node scripts/third-party-notices.mjs --check  # échoue si le fichier est périmé
```

Depuis la racine de ream-dev, une seule commande traite tous les paquets :

```bash
pnpm notices:sync    # réécrit chaque THIRD-PARTY-NOTICES.md
pnpm notices:check   # échoue si l'un d'eux est périmé
```

Le script demande cargo-about 0.9.3, exactement. Il refuse toute autre
version, car une autre version peut lire les fichiers de licence autrement :

```bash
cargo install cargo-about --locked --version 0.9.3 --features cli
```

### Licences acceptées

`about.toml`, à la racine de chaque paquet, liste les licences qu'une crate
peut porter : MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, Zlib et
Unicode-3.0. Une crate sous une autre licence arrête le script avec une
erreur. Une crate dont la licence est illisible l'arrête aussi. Les licences
copyleft comme GPL, LGPL et AGPL ne sont pas acceptées : ne les ajoutez pas.

Quelques crates ont une licence acceptée pour elles seules :

- MPL-2.0 pour `cssparser` et `dtoa-short` (blackhole, goldstone) et pour
  `mp4parse` (prism). La MPL-2.0 s'applique fichier par fichier. Un binaire
  peut contenir ces fichiers sous une autre licence, à condition d'indiquer où
  se trouve leur code source. Le fichier d'avis donne cette adresse pour chacune
  de ces crates.
- CDLA-Permissive-2.0 pour `webpki-roots` (atlas). C'est une licence permissive
  pour des données, ici les certificats racine.

Pour accepter une licence pour une seule crate, ajoutez dans `about.toml` une
section au nom de la crate, sous un commentaire qui dit pourquoi :

```toml
# MPL-2.0 applies file by file: the binary may carry these files under any
# licence, as long as the notices say where their source is (they do).
[mp4parse]
accepted = ["MPL-2.0"]
```

N'ajoutez une licence à la liste globale `accepted` que si elle est permissive
et que vous l'acceptez pour toutes les crates.

Certaines crates `-sys` compilent du code C que Cargo ne décrit pas. La liste
`BUNDLED` du script nomme ce code et l'endroit où se trouve le texte de sa
licence.

### La vérification en CI

Le job `audit` installe cargo-about 0.9.3 et lance
`node scripts/third-party-notices.mjs --check`. Le job échoue quand le fichier
ne correspond plus à `Cargo.lock`, ou quand une crate porte une licence que
`about.toml` n'accepte pas. Le job de publication l'attend, puis copie le
fichier dans chaque paquet de plateforme. `scripts/check-publish-gates.mjs`, à
la racine de ream-dev, vérifie que chaque paquet garde ces étapes.

## Flow CI par paquet

Chaque paquet à code natif a son workflow dans
`packages/<pkg>/.github/workflows/<pkg>-ci.yml`.

### Déclencheurs

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:
```

Sur un push, la matrix des cinq plateformes ne tourne que si la version de
`package.json` a changé. `workflow_dispatch` est le déclencheur manuel qui
publie (voir plus bas).

### Jobs

1. **`quality`** : vérification des types, lint, et
   `node scripts/platform-packages.mjs --check`. Un changement de version sans
   le script échoue ici.
2. **`build-and-test`** : la matrix des cinq plateformes (`fail-fast: false`).
   Chaque cellule compile son binaire, lance les tests et vérifie qu'aucun test
   n'a été sauté. Elle envoie ensuite ses fichiers `.node` comme artefact. Un
   fichier manquant fait échouer le job.
3. **`cargo-tests`**, les tests TypeScript et les audits de vulnérabilités
   tournent une seule fois, sous Linux. Le job `audit` vérifie aussi
   `THIRD-PARTY-NOTICES.md`.
4. **`publish`** ne tourne que sur `workflow_dispatch`, une fois tous les autres
   jobs au vert.

### Le job de publication, étape par étape

1. Il vérifie que le secret `NPM_TOKEN` existe et qu'un tag `v<version>` est
   posé sur `HEAD` avec la version de `package.json`.
2. Il compare la version avec npm. Une version que npm a déjà est refusée. Une
   version plus basse aussi, sauf si vous confirmez un backport : elle part
   alors sous le dist-tag `backport`.
3. Il télécharge les binaires de la matrix dans `artifacts/`. Il vérifie que les
   manifestes sont à jour et que chaque binaire de chaque plateforme est là,
   avant de déplacer quoi que ce soit. Puis il déplace chaque binaire dans
   `npm/<suffixe>/` et copie à côté la licence et `THIRD-PARTY-NOTICES.md`. Il refuse un fichier `.node`
   resté à la racine du paquet.
4. Il lance `npm publish --dry-run` sur chaque paquet. npm publie un paquet à la
   fois : un paquet que npm refuserait arrête donc le job avant que rien ne
   parte.
5. Il publie d'abord les paquets de plateforme, avec `npm publish` depuis chaque
   `npm/<suffixe>/`. Il saute un paquet que npm a déjà dans cette version : vous
   pouvez relancer le job après un échec partiel.
6. Il publie le paquet principal en dernier. Ses versions épinglées pointent
   alors vers des paquets qui existent déjà.
7. Il crée la release GitHub.

## Comment publier

La publication est **manuelle à dessein**. Une publication déclenchée par tag
peut partir sur un tag poussé par accident ; `workflow_dispatch` exige un clic
délibéré par paquet et par release.

1. Changez la version dans `package.json`, puis lancez `pnpm platforms:sync`.
   Commitez les deux, posez le tag `v<version>` et poussez.
2. Ouvrez le dépôt GitHub du paquet (par exemple `github.com/C9up/sigil`).
3. Allez dans **Actions** → **`<pkg>`-ci** → **Run workflow**.
4. Choisissez `main` et cliquez sur **Run workflow**.
5. Quand le job est vert, la nouvelle version est sur npm : le paquet principal
   et ses cinq paquets de plateforme.

Le secret de dépôt `NPM_TOKEN` doit exister avant que le job de publication ne
tourne. Le job s'arrête avec une erreur claire s'il manque.

### Première publication d'un nouveau paquet de plateforme

La publication de confiance npm (trusted publishing) ne se configure que sur un
paquet qui existe déjà. La première publication de chaque nouveau nom
(`@c9up/<pkg>-<suffixe>`) demande donc un `NPM_TOKEN` autorisé à créer des
paquets dans le scope `@c9up`.

Après cette première publication, configurez la publication de confiance sur
chaque nouveau paquet sur npmjs.com, comme sur le paquet principal : ce dépôt,
le fichier de workflow `<pkg>-ci.yml` et l'environnement `npm`. Cinq nouveaux
paquets par paquet natif, cela fait cinq réglages à remplir.

La provenance npm demande aussi `repository.url` dans chaque manifeste.
`scripts/platform-packages.mjs` l'écrit, avec le `directory` du paquet de
plateforme.

## Installation côté consommateur

```bash
pnpm install @c9up/sigil
```

Votre gestionnaire de paquets installe `@c9up/sigil` et le seul paquet de
plateforme qui correspond à votre machine. Vous téléchargez les binaires d'une
plateforme, pas de cinq, et vous n'avez besoin d'aucune toolchain Rust.

::: warning N'omettez pas les dépendances optionnelles
Les binaires sont des dépendances optionnelles. Une installation avec
`--omit=optional` (npm), `--no-optional` (npm, pnpm) ou
`npm ci --omit=optional` dans un Dockerfile les saute, et le paquet n'a alors
aucun binaire.
:::

Installez sur la machine, ou dans l'image, qui exécute l'application. Un
`node_modules` copié depuis macOS dans une image Linux contient le binaire
macOS, pas celui de Linux.

Si votre plateforme n'est pas dans le tableau ci-dessus, compilez depuis les
sources :

```bash
git clone <repo-du-paquet>
cd <pkg>
pnpm install
pnpm build:napi   # cargo build --release -p <crate>-napi + copy-napi.mjs
```

Puis faites un `npm link` de votre checkout local dans votre projet. Le
chargeur trouve le binaire à la racine du paquet avant de chercher un paquet de
plateforme.

## Dépannage — `E_<PKG>_NAPI_REQUIRED`

Si un module Ream lève une erreur du type :

```
[E_SIGIL_NAPI_REQUIRED] The argon2 Rust engine is required but not loaded.
  Fix: install @c9up/sigil-linux-x64-gnu at the exact version of @c9up/sigil: …
```

…le binaire de votre plateforme n'a pas pu être chargé. Le message nomme le
paquet de plateforme à installer, et l'erreur de chargement est la `cause` de
l'erreur. Les raisons habituelles :

- L'installation a sauté les dépendances optionnelles (`--omit=optional`,
  `--no-optional`). Réinstallez sans cette option.
- `node_modules` vient d'une autre plateforme (copié d'un portable dans une
  image Docker). Installez dans l'image.
- Vous êtes sous Alpine/musl. Les binaires Linux ciblent glibc.
- Votre plateforme n'est pas parmi les cinq supportées. Compilez depuis les
  sources comme montré plus haut.
- Dans un checkout, la build locale est périmée ou compilée pour une autre ABI
  Node. Recompilez-la : `pnpm --filter @c9up/<pkg> build:napi`.

Les codes changent d'un paquet à l'autre : `E_SIGIL_NAPI_REQUIRED`,
`E_ATLAS_NAPI_NOT_FOUND`, `E_REAM_NAPI_NOT_FOUND`… La page de référence de
chaque paquet liste les siens. Par exemple :

- [`@c9up/sigil`](/fr/reference/errors#e-sigil-napi-required)
- [`@c9up/ream`](/fr/reference/errors#e-ream-napi-not-found)
