# Hachage

Ce guide couvre le hachage des mots de passe avec sigil :

- Exemples rapides
- Drivers
- Exigence NAPI
- Quand utiliser Sigil vs `@c9up/ream` vs `@c9up/warden`
- Fichier de config

`@c9up/sigil` hache les mots de passe avec argon2id, bcrypt ou scrypt, dans une seule implémentation native partagée par tous les paquets qui en ont besoin.

## Exemples rapides

`Hash` est une **classe** — il faut l'instancier avec une config :

```ts
import { Hash } from '@c9up/sigil'

const hash = new Hash({
  default: 'argon2',
  list: {
    argon2: { driver: 'argon2' },
  },
})

const hashed = await hash.make('correct horse battery staple')
await hash.verify(hashed, 'correct horse battery staple') // true
await hash.verify(hashed, 'mauvais-mot-de-passe')         // false
```

`verify` prend le **hash en premier, la valeur en clair en second** — `verify(hashedValue, plainValue)`.

Choisir un driver à la volée :

```ts
const bcryptHashed = await hash.use('bcrypt').make('password')
const scryptHashed = await hash.use('scrypt').make('password')
```

`hash.use(name)` retourne un `HashDriver` dont les méthodes `make` / `verify` ciblent le driver nommé.

Un nom que la config ne déclare pas lève `E_SIGIL_UNKNOWN_HASHER`, qui liste les
noms déclarés.

`hash.isValidHash(value)` dit si `value` est un hash que le driver par défaut
pourrait vérifier — pour décider si une valeur doit encore être hachée avant
d'être enregistrée, ou pour contrôler une table d'utilisateurs importée. La
chaîne est analysée en entier, sans appel natif : pour argon2, la variante, la
version (`16`, `19` ou absente), exactement `m`, `t` et `p` dans les plages
qu'accepte verify, un sel de 8 à 48 octets et une sortie de 10 à 64 octets en
base64 canonique ; pour scrypt, exactement `n` (une puissance de deux), `r` et
`p`, un coût et un espace de travail qu'accepte verify sous le `maxMemory` du
hasher, un sel de 8 à 1024 octets et une clé de 64 à 128 octets. Une chaîne qui
ne fait que commencer comme un hash (`$argon2id$garbage`) donne `false`.

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
  list: {
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
mauvais type (`rounds: '12'` lu depuis une variable d'environnement), lève
`E_SIGIL_INVALID_OPTION` à ce moment-là plutôt qu'à la première connexion d'un utilisateur,
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

Un hasher dont le `driver` n'est ni `argon2`, ni `bcrypt`, ni `scrypt` (une
faute de frappe comme `'argon'`) lève `E_SIGIL_UNKNOWN_DRIVER` à la
construction de `Hash` : l'application échoue au démarrage plutôt qu'à sa
première inscription.

De même pour un `default` qui ne nomme aucun des hashers déclarés — typiquement
`default: env.get('HASH_DRIVER')` réglé sur un driver que `list` ne déclare pas :
`new Hash(...)` lève `E_SIGIL_UNKNOWN_HASHER`.

`secret` accepte une chaîne ou un `Secret` qui en enveloppe une — ce que renvoie
un schéma d'environnement — si bien que
`drivers.argon2({ secret: env.get('APP_KEY') })` fonctionne tel quel.

`hash.config` est une copie de la configuration où chaque `secret` est remplacé
par une enveloppe qui s'affiche `[redacted]` via `JSON.stringify`, `String()` et
`util.inspect` : journaliser ou sérialiser le hasher n'écrit jamais le poivre.
L'objet passé reste tel quel.

`verify()` relit la variante et les paramètres depuis la chaîne du hash : un mot
de passe haché en `argon2i` se vérifie quelle que soit la config courante.

### Limites de longueur de l'entrée

`make()` refuse une valeur qu'il ne peut pas hacher sans risque, et lève — il ne
renvoie pas `false` — : un formulaire d'inscription ou de changement de mot de
passe borne le champ et traduit l'erreur en 4xx :

| Driver | `make()` lève quand la valeur dépasse | Message |
|---|---|---|
| tous les drivers | 1024 octets UTF-8 | `Password exceeds maximum length of 1024 bytes` |
| `bcrypt` | 72 octets UTF-8 | `Bcrypt cannot hash inputs longer than 72 bytes (got <n>); use argon2id for long passphrases` |

Les limites comptent des octets, pas des caractères : une phrase de passe
accentuée ou non latine atteint 72 octets bien avant 72 caractères. bcrypt ne
lit que les 72 premiers octets, si bien que deux mots de passe longs partageant
ce préfixe auraient le même hash ; sigil refuse plutôt que de tronquer. Les deux
lèvent `E_SIGIL_PASSWORD_TOO_LONG`. `verify()` avec une valeur
au-delà des 72 octets de bcrypt répond `false`, puisqu'aucun hash écrit par
`make()` ne peut lui correspondre.

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
[E_SIGIL_NAPI_REQUIRED] The argon2 Rust engine is required but not loaded.
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

## Fichier de config

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

> **`Hash` et `Hasher`.** Un `Hasher` enveloppe UN pilote ; `Hash` en gère
> plusieurs. `HashManager` est exporté en alias de `Hash`.

`drivers.*` renvoie un descripteur brut : il n'y a rien à importer
paresseusement, puisqu'un seul moteur Rust porte tous les pilotes. Les
empreintes sont des chaînes PHC standard.
