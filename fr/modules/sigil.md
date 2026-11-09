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
await hash.verify(hashed, 'correct horse battery staple') // true
await hash.verify(hashed, 'mauvais-mot-de-passe')         // false
```

`verify` prend le **hash en premier, la valeur en clair en second** — `verify(hashedValue, plainValue)`, aligné sur AdonisJS (`@adonisjs/hash`).

Choisir un driver à la volée :

```ts
const bcryptHashed = await hash.use('bcrypt').make('password')
const scryptHashed = await hash.use('scrypt').make('password')
```

`hash.use(name)` retourne un `HashDriver` dont les méthodes `make` / `verify` ciblent le driver nommé.

### Re-hachage transparent — `needsReHash`

`hash.needsReHash(storedHash): boolean` retourne `true` quand un hash stocké a été produit avec un algorithme ou des paramètres qui ont depuis divergé de votre config actuelle (p. ex. vous avez augmenté les `rounds` de bcrypt, ou changé le driver par défaut). Re-hachez lors d'un login réussi pour que les identifiants migrent vers les paramètres renforcés au fil du temps :

```ts
const stored = user.passwordHash

if (await hash.verify(stored, password)) {
  if (hash.needsReHash(stored)) {
    user.passwordHash = await hash.make(password) // re-stocke avec les params courants
    await user.save()
  }
  // …émettre la session
}
```

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
| `argon2` | argon2id | oui | Nouvelles applications. Recommandé par l'OWASP. Par défaut **argon2id** (version 19), 64 Mio (`memory: 65536`), 3 itérations, 4 voies ; `variant` sélectionne argon2i ou argon2d. |
| `bcrypt` | bcrypt | non | Interopérabilité legacy (Rails / PHP / Java). `rounds` configurable (défaut 12, minimum 10, maximum 16). Écrit la chaîne MCF standard (`$2b$12$…`) ; la vérification lit aussi la forme PHC `$bcrypt$v=98$r=10$<sel>$<empreinte>`. |
| `scrypt` | scrypt | non | Memory-hardness avec un espace de paramètres différent. `cost` (N, défaut 16384), `blockSize` (r, défaut 8), `parallelization` (p, défaut 1), `keyLength`, `saltSize` et `maxMemory` (défaut 32 Mio) sont configurables. Écrit la forme PHC `$scrypt$n=…,r=…,p=…$<sel>$<hash>`. |

Tous les drivers passent par le crate Rust `sigil-engine` (la moitié native de `@c9up/sigil`) — il n'y a **aucun fallback** JavaScript ou TypeScript. Le hachage de mots de passe doit toucher une implémentation native auditée et à temps constant.

### Clés de configuration honorées

Chaque valeur est validée à la construction du driver — au démarrage, quand
`new Hash(...)` ou le provider le construit. Une valeur hors limites, ou du
mauvais type (`rounds: '12'` lu depuis une variable d'environnement), lève une
`TypeError` à ce moment-là plutôt qu'à la première connexion d'un utilisateur,
et n'est jamais remplacée en silence par une valeur par défaut :

- `argon2` — `variant` (`'d'` | `'i'` | `'id'`, défaut `id`), `memory` (KiB,
  alias `memoryKib`, défaut 65536, au moins 8 × `parallelism`), `iterations`
  (défaut 3, au moins 2), `parallelism` (défaut 4), `hashLength` (octets, 10–64,
  défaut 32), `saltSize` (octets, 8–48, défaut 16), `secret` (poivre — non
  stocké dans le hash, et exigé à l'identique à la vérification).
- `bcrypt` — `rounds` (10–16, défaut 12), `version` (code de caractère :
  `97` = `$2a$`, `98` = `$2b$` par défaut, `121` = `$2y$`), `saltSize` (doit
  valoir 16 — bcrypt le fixe, et toute autre valeur produirait un hash
  qu'aucune implémentation ne sait relire).
- `scrypt` — `cost` (N, une puissance de deux, défaut 16384), `blockSize` (r,
  défaut 8), `parallelization` (p, défaut 1), `keyLength` (64–128, défaut 64),
  `saltSize` (alias `saltLength`, 8–1024, défaut 16), `maxMemory` (octets,
  défaut 32 Mio, au moins l'espace de travail `128 × r × (N + p + 2)`).

`secret` accepte une chaîne ou un `Secret` qui en enveloppe une — ce que renvoie
un schéma d'environnement — si bien que
`drivers.argon2({ secret: env.get('APP_KEY') })` fonctionne tel quel.

`verify()` relit la variante et les paramètres depuis la chaîne du hash : un mot
de passe haché en `argon2i` se vérifie quelle que soit la config courante.

### Hacher hors de la boucle d'événements

`make` et `verify` renvoient des Promises, et la dérivation de clé s'exécute sur
le pool de threads de libuv, jamais sur la boucle d'événements : une rafale de
connexions simultanées ralentit ces connexions-là, pas toutes les autres
requêtes que sert le processus. Les dérivations simultanées se partagent les
threads du pool (4 par défaut ; `UV_THREADPOOL_SIZE` le change).

### Plafonds de coût à la vérification

Un hash porte son propre coût : quiconque peut écrire un hash stocké décide du
travail qu'exige sa vérification. `verify` refuse — renvoie `false` sans rien
dériver — un hash stocké qui coûte bien plus que n'importe quelle configuration
réelle :

| Driver | Refusé quand |
|---|---|
| `argon2` | `m × t` (KiB × itérations) dépasse 2^20, environ cinq fois les valeurs par défaut |
| `bcrypt` | le coût dépasse 16 |
| `scrypt` | `N × r × p` dépasse 2^22, ou l'espace de travail `128 × r × (N + p + 2)` dépasse le `maxMemory` configuré |

Les mêmes plafonds s'appliquent à la configuration : un driver configuré
au-delà lève une erreur à sa construction, puisque ses hashs ne se
vérifieraient jamais.

### Hashs bcrypt au format PHC

En plus de la chaîne MCF qu'il écrit (`$2b$12$…`), le driver bcrypt vérifie la
forme PHC `$bcrypt$v=98$r=10$<sel b64>$<empreinte b64>` que stockent d'autres
bibliothèques de hachage Node.js. `needsReHash` répond `true` pour un tel hash :
le re-hachage à la connexion (plus haut) le réécrit en MCF la prochaine fois que
son utilisateur se connecte.

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
| Stratégie d'authentification (session, JWT, OAuth, jetons d'accès) | **`@c9up/warden`** | Orchestration auth. La vérification du mot de passe est à la charge de l'appelant — typiquement via `Hash.verify` de Sigil. |

En cas de doute : mots de passe → Sigil, tokens/HMAC → ream racine, flux de login → Warden.

## API publique

| Export | Type | Rôle |
|---|---|---|
| `Hash` | classe | `new Hash(config)`. Méthodes d'instance : `make(value)`, `verify(hash, value)`, `needsReHash(hash)`, `use(name?)`. |
| `HashDriver` | interface | À implémenter pour brancher un driver custom. Requis : `make`, `verify`, `needsReHash`. Type de retour de `hash.use(name)`. |
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
+ const ok = await hash.verify(hashed, password)
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

## Forme de config AdonisJS

```ts
import { defineConfig, drivers } from '@c9up/sigil'

export default defineConfig({
  default: 'scrypt',
  list: {                                   // `drivers` marche aussi
    scrypt: drivers.scrypt({ cost: 16384, blockSize: 8 }),
    argon: drivers.argon2({ memory: 65536 }),
  },
})
```

> **Les noms sont inversés.** Le `Hash` d'AdonisJS enveloppe UN pilote — sigil
> l'appelle `Hasher` — et son `HashManager` est le multi-pilotes, que sigil
> appelle `Hash`. `HashManager` est exporté en alias pour qu'un
> `import { HashManager }` migré résolve vers la classe qui gère les pilotes.

Déviation nommée : `drivers.*` renvoie un descripteur brut plutôt qu'un
fournisseur de config paresseux. Le site d'appel est identique, et il n'y a rien
à importer paresseusement puisqu'un seul moteur Rust porte tous les pilotes. Les
empreintes sont au format PHC et se vérifient de part et d'autre avec
`@adonisjs/hash` : les mots de passe existants continuent de fonctionner.
