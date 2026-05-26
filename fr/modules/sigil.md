# Sigil — Hachage de mots de passe

Statut: **Présent (TS + Rust N-API)**.

- Package: `@c9up/sigil`
- Objectif: hachage de mots de passe canonique multi-driver pour l'écosystème Ream (argon2id, bcrypt, scrypt). Implémentation unique, NAPI uniquement, calqué sur `@adonisjs/hash` (v9).

## Exemples rapides

`Hash` est une **classe** — il faut l'instancier avec une config :

```ts
import { Hash } from '@c9up/sigil'

const hash = new Hash({
  default: 'argon2',
  drivers: {
    argon2: { driver: 'argon2' },
  },
})

const hashed = await hash.make('correct horse battery staple')
await hash.verify('correct horse battery staple', hashed) // true
await hash.verify('mauvais-mot-de-passe', hashed)         // false
```

Choisir un driver à la volée :

```ts
const bcryptHashed = await hash.use('bcrypt').make('password')
const scryptHashed = await hash.use('scrypt').make('password')
```

`hash.use(name)` retourne un `HashDriver` dont les méthodes `make` / `verify` ciblent le driver nommé.

Configurer une fois, enregistrer le provider :

```ts
// config/hash.ts
import { defineConfig } from '@c9up/sigil'

export default defineConfig({
  default: 'argon2',
  drivers: {
    argon2: { driver: 'argon2' },
    bcrypt: { driver: 'bcrypt', rounds: 12 },
    scrypt: { driver: 'scrypt', keyLength: 64, saltLength: 32 },
  },
})
```

```ts
// providers.ts
import { SigilProvider } from '@c9up/sigil/provider'
export default [SigilProvider]
```

```ts
// dans un controller / handler
import type { AppContext } from '@c9up/ream'
import { Hash } from '@c9up/sigil'

async function register(app: AppContext) {
  const hash = app.container.resolve<Hash>(Hash)
  const stored = await hash.make(password)
}
```

## Drivers

| Clé driver | Algorithme | Par défaut ? | Quand l'utiliser |
|---|---|---|---|
| `argon2` | argon2id | oui | Nouvelles applications. Recommandé par l'OWASP. Le binding Rust utilise `Argon2::default()` du crate `argon2`, qui sélectionne la variante **argon2id**. |
| `bcrypt` | bcrypt | non | Interopérabilité legacy (Rails / PHP / Java). `rounds` configurable (défaut 12, minimum OWASP 10). |
| `scrypt` | scrypt | non | Memory-hardness avec un espace de paramètres différent. `keyLength` et `saltLength` configurables ; les paramètres de coût utilisent `scrypt::Params::recommended()` du crate Rust `scrypt`. |

Tous les drivers passent par le crate Rust `sigil-engine` (la moitié native de `@c9up/sigil`) — il n'y a **aucun fallback** JavaScript ou TypeScript. Le hachage de mots de passe doit toucher une implémentation native auditée et à temps constant.

### Clés de config honorées

Aujourd'hui seules ces clés par driver sont lues ; toute autre clé est silencieusement ignorée :

- `argon2` — *aucune option par driver pour l'instant* ; le binding Rust utilise `Argon2::default()`. Les paramètres ajustables (`memory`, `iterations`, parallélisme) feront l'objet d'une future story.
- `bcrypt` — `rounds: number`.
- `scrypt` — `keyLength: number`, `saltLength: number`.

## Exigence NAPI

Le binding NAPI de Sigil est obligatoire à l'exécution. Si l'artefact `.node` est absent, le premier appel à `make()` / `verify()` lève :

```text
[SIGIL_NAPI_REQUIRED] The argon2 Rust engine is required but not loaded.
  Fix: cd packages/sigil && pnpm build:napi
```

Le token `argon2` est interpolé avec le nom du driver qui a échoué (`argon2` / `bcrypt` / `scrypt`).

> La story 40.4 a câblé le script `pnpm build:napi` (`cargo build --release -p sigil-engine-napi && node scripts/copy-napi.mjs`) et la matrice GitHub Actions 5-plateformes. Lancer `pnpm build:napi` depuis `packages/sigil` produit le binaire pour votre plateforme locale.

Le pipeline CI build des binaires précompilés sur des runners natifs pour les 5 plateformes supportées (linux-x64-gnu, linux-arm64-gnu, darwin-x64, darwin-arm64, win32-x64-msvc). Voir la section Dépannage ci-dessous pour la table par plateforme.

## Quand utiliser Sigil vs `@c9up/ream` vs `@c9up/warden`

Les trois packages couvrent des responsabilités distinctes :

| Besoin | Utiliser | Pourquoi |
|---|---|---|
| Hacher / vérifier un mot de passe | **`@c9up/sigil`** (`new Hash(...)` puis `make` / `verify`) | Autorité canonique de hachage. Implémentation unique, multi-driver, NAPI. |
| HMAC, octets aléatoires, comparaison à temps constant | **`@c9up/ream`** (racine : `hmacSign`, `hmacVerify`, `randomHex`, `randomBytesBase64`, `constantTimeEq`) | Helpers crypto bas niveau NAPI-ou-stdlib. Pas de hachage de mot de passe ici — c'est dans Sigil. |
| Stratégie d'authentification (session, JWT, OAuth, clé d'API) | **`@c9up/warden`** | Orchestration auth. La vérification du mot de passe est à la charge de l'appelant — typiquement via `Hash.verify` de Sigil. |

En cas de doute : mots de passe → Sigil, tokens/HMAC → ream racine, flux de login → Warden.

## API publique

| Export | Type | Rôle |
|---|---|---|
| `Hash` | classe | `new Hash(config)`. Méthodes d'instance : `make(value)`, `verify(value, hash)`, `use(name?)`. |
| `HashDriver` | interface | À implémenter pour brancher un driver custom. Requis : `make`, `verify`. Type de retour de `hash.use(name)`. |
| `HashConfig` | type | `{ default: string; drivers: Record<string, { driver: string; ...}> }`. |
| `defineConfig` | helper | Authoring de config typé. |
| `SigilProvider` | provider | Enregistre `Hash` (et le token `'hash'`) dans le container Ream. Importé via `@c9up/sigil/provider`. |

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
+ const ok = await hash.verify(password, hashed)
```

Dans une application Ream, préférer le `Hash` résolu via le container (cf. Exemples rapides) plutôt que d'en construire un inline.

## Dépannage — `E_SIGIL_NAPI_REQUIRED`

Si cette erreur survient à l'exécution (la classe runtime est `E_SIGIL_NAPI_REQUIRED` extends `Error` ; le préfixe entre crochets `[SIGIL_NAPI_REQUIRED]` est conservé pour le matching par substring dans les tests) :

```
[SIGIL_NAPI_REQUIRED] The <driver> Rust engine is required but not loaded.
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

## Migration depuis le hachage interne de Warden

`@c9up/warden` exposait historiquement `hashPasswordArgon2` / `verifyPasswordArgon2` / `hashPasswordBcrypt` / `verifyPasswordBcrypt` sur son interface `NativeWarden` — elles n'ont jamais été câblées dans `SessionStrategy` (qui délègue la vérification du mot de passe à l'appelant ; cf. `SessionStrategy.ts:33-37`) et n'avaient aucun appelant TS dans le workspace. La story 40.3 les a retirées de la surface TS. Le crate Rust sous-jacent embarque toujours ces fonctions dans l'artefact `.node` prébuild (une story de durcissement à venir trace leur suppression). Si votre application appelait directement ces fonctions, basculez sur la classe `Hash` de Sigil.

## Statut et feuille de route

- **40.1** *(cette story)* — README + docs module EN/FR + décision d'architecture enregistrée. Stubs qui levaient dans `@c9up/ream/security/crypto` supprimés (jamais déployés). Le fallback de `SigilProvider` corrigé de `scrypt` vers `argon2` pour matcher le défaut documenté.
- **40.3** — Warden délègue la vérification de mot de passe à Sigil ; le test d'intégration couvre les trois drivers via `Hash.make` → `Hash.verify` → `Warden.SessionStrategy`.
- **40.4** — Binaires NAPI précompilés en CI pour les 5 plateformes cibles. Détection à l'exécution durcie avec le chemin d'erreur `[SIGIL_NAPI_REQUIRED]` et un script `pnpm build:napi`.

> La story 40.2 (initialement « ream/crypto délègue à Sigil ») est en ré-évaluation : 40.1 a supprimé les stubs au lieu de les convertir en façades. Le chemin argon2 dupliqué dans `@c9up/warden` est indépendant et reste tracé par la story 40.3.
