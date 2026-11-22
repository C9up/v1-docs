# sigil

Ce guide couvre l'API de sigil, ses notes de migration et son dépannage :

- API publique
- Migration depuis l'ancien `Hash` de `@c9up/ream`
- Migration depuis le hachage interne de Warden
- Dépannage — `E_SIGIL_NAPI_REQUIRED`
- Statut et feuille de route

## API publique

| Export | Type | Rôle |
|---|---|---|
| `Hash` | classe | `new Hash(config)`. Méthodes d'instance : `make(value)`, `verify(hash, value)`, `needsReHash(hash)`, `use(name?)`. |
| `HashDriver` | interface | À implémenter pour brancher un driver custom. Requis : `make`, `verify`, `needsReHash`. Type de retour de `hash.use(name)`. |
| `HashConfig` | type | `{ default: string; drivers: Record<string, { driver: string; ...}> }`. |
| `defineConfig` | helper | Authoring de config typé. |
| `SigilProvider` | provider | Enregistre `Hash` (et le token `'hash'`) dans le container Ream. Importé via `@c9up/sigil/provider`. |
| `SigilError` | classe | Base de toutes les erreurs de sigil ; `error.code` est le nom `E_SIGIL_*` de la sous-classe. |
| `E_SIGIL_NAPI_REQUIRED` | classe | Un driver a tourné sans le moteur natif chargé. |
| `E_SIGIL_UNKNOWN_DRIVER` | classe | Un hasher de la config nomme un driver que sigil n'a pas ; levée à la construction de `Hash`. |
| `E_SIGIL_UNKNOWN_HASHER` | classe | `default` (à la construction de `Hash`) ou `use(name)` nomme un hasher que la config ne déclare pas. |
| `E_SIGIL_NOT_BOOTED` | classe | `@c9up/sigil/services/main` utilisé avant le boot de `SigilProvider`. |

## Migration depuis l'ancien `Hash` de `@c9up/ream`

Les versions précédentes de `@c9up/ream` exposaient une classe `Hash` interne, un `HashProvider` et les helpers bruts `argon2Hash` / `argon2Verify` / `bcryptHash` / `bcryptVerify`. Tout a été supprimé — Sigil est le hasher canonical. Remplacer par la classe `Hash` de Sigil :

```diff
- import { Hash } from '@c9up/ream'
+ import { Hash } from '@c9up/sigil'
```

```diff
- import { argon2Hash, argon2Verify } from '@c9up/ream'
+ import { Hash } from '@c9up/sigil'

- const hashed = await argon2Hash(password)
- const ok = await argon2Verify(password, hashed)
+ const hash = new Hash({ default: 'argon2', drivers: { argon2: { driver: 'argon2' } } })
+ const hashed = await hash.make(password)
+ const ok = await hash.verify(hashed, password)
```

Dans une application Ream, préférer le `Hash` résolu via le container (cf. Exemples rapides) plutôt que d'en construire un inline.

## Migration depuis le hachage interne de Warden

`@c9up/warden` exposait historiquement `hashPasswordArgon2` / `verifyPasswordArgon2` / `hashPasswordBcrypt` / `verifyPasswordBcrypt` sur son interface `NativeWarden` — elles n'ont jamais été câblées dans `SessionStrategy` (qui délègue la vérification du mot de passe à l'appelant ; cf. `SessionStrategy.ts:33-37`) et n'avaient aucun appelant TS dans le workspace. La story 40.3 les a retirées de la surface TS. Le crate Rust sous-jacent embarque toujours ces fonctions dans l'artefact `.node` prébuild (une story de durcissement à venir trace leur suppression). Si votre application appelait directement ces fonctions, basculez sur la classe `Hash` de Sigil.

## Dépannage — `E_SIGIL_NAPI_REQUIRED`

Si cette erreur survient à l'exécution (la classe est `E_SIGIL_NAPI_REQUIRED`, une `SigilError` dont le `code` vaut `'E_SIGIL_NAPI_REQUIRED'` ; testez `error.code`, pas le message) :

```
[E_SIGIL_NAPI_REQUIRED] The <driver> Rust engine is required but not loaded.
  Fix: cd packages/sigil && pnpm build:napi
```

Le placeholder `<driver>` est interpolé au moment du throw avec le nom du driver concerné (`argon2`, `bcrypt`, ou `scrypt`).

Le binaire `.node` prébuild n'a pas été trouvé à `packages/sigil/index.<platform>.node`. Sigil n'a aucun fallback JS/TS — chaque driver (argon2id, bcrypt, scrypt) est porté par Rust NAPI.

**Récupération — développement local :**

```bash
cd packages/sigil
pnpm build:napi
```

Cette commande lance `cargo build --release -p sigil-engine-napi` puis copie la bibliothèque produite vers `index.<platform>.node` (via `scripts/copy-napi.mjs`). La toolchain Rust (`cargo`) est requise.

**Plateformes supportées (prébuild CI) :**

| Suffix | Runner GitHub Actions |
|---|---|
| `linux-x64-gnu` | `ubuntu-latest` |
| `linux-arm64-gnu` | `ubuntu-24.04-arm` |
| `darwin-x64` | `macos-13` |
| `darwin-arm64` | `macos-14` |
| `win32-x64-msvc` | `windows-latest` |

Chacune est buildée via `pnpm build:napi` sur un runner natif (pas de cross-compilation) et uploadée comme artefact de workflow dans le pipeline `sigil-ci`.

**Plateformes non supportées :** si votre plateforme ne figure pas dans la matrice ci-dessus, buildez depuis les sources via `cargo build --release -p sigil-engine-napi` et copiez le `target/release/libsigil_engine_napi.{so,dylib,dll}` produit vers `index.<votre-suffix>.node` à côté de `package.json`. Ouvrez une issue avec votre `${platform}-${arch}` pour que la matrice soit étendue.

## Statut et feuille de route

- **40.1** *(cette story)* — README + docs module EN/FR + décision d'architecture enregistrée. Stubs qui levaient dans `@c9up/ream/security/crypto` supprimés (jamais déployés). Le fallback de `SigilProvider` corrigé de `scrypt` vers `argon2` pour matcher le défaut documenté.
- **40.3** — Warden délègue la vérification de mot de passe à Sigil ; le test d'intégration couvre les trois drivers via `Hash.make` → `Hash.verify` → `Warden.SessionStrategy`.
- **40.4** — Binaires NAPI précompilés en CI pour les 5 plateformes cibles. Détection à l'exécution durcie avec le chemin d'erreur `E_SIGIL_NAPI_REQUIRED` et un script `pnpm build:napi`.

> La story 40.2 (initialement « ream/crypto délègue à Sigil ») est en ré-évaluation : 40.1 a supprimé les stubs au lieu de les convertir en façades. Le chemin argon2 dupliqué dans `@c9up/warden` est indépendant et reste tracé par la story 40.3.
