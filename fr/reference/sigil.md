# sigil

`@c9up/sigil` : hachage de mots de passe avec argon2, bcrypt et scrypt, exécuté par un moteur Rust natif. Guide : [Hachage](/fr/guides/security/hashing).

## Installation

```bash
pnpm add @c9up/sigil
```

`ream configure @c9up/sigil` enregistre le provider, écrit `config/hash.ts` et ajoute `HASH_DRIVER=argon2` aux fichiers d'environnement. Le moteur natif est livré dans un petit paquet par plateforme, `@c9up/sigil-<plateforme>`, pour linux x64 et arm64 (glibc), macOS x64 et arm64, et Windows x64. `@c9up/sigil` les déclare en dépendances optionnelles, et votre gestionnaire de paquets installe seulement celui de votre machine. Vous n'avez pas besoin de toolchain Rust. N'installez pas avec les dépendances optionnelles désactivées (`--no-optional`, `--omit=optional`) : le moteur serait absent.

Il n'existe pas de repli JavaScript. Sans le moteur, le hachage lève `E_SIGIL_NAPI_REQUIRED`, et son message nomme le paquet à installer, par exemple `@c9up/sigil-linux-x64-gnu`.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/sigil` | `Hash`, `Hasher`, `defineConfig`, `drivers`, les classes d'erreur et les types de configuration |
| `@c9up/sigil/provider` | `SigilProvider` (export par défaut) |
| `@c9up/sigil/services/main` | L'instance `Hash` de l'application (export par défaut) |
| `@c9up/sigil/configure` | `configure()`, exécuté par `ream configure @c9up/sigil` |

## Exports

### `@c9up/sigil`

| Export | Nature | Description |
|---|---|---|
| `Hash` | classe | Gestionnaire de hachage : détient les hashers configurés et délègue à celui par défaut |
| `HashManager` | classe | Autre nom de `Hash` |
| `Hasher` | classe | Un hasher, tel que le renvoie `hash.use(name)` |
| `defineConfig` | fonction | `defineConfig(config: HashConfig): HashConfig`, type `config/hash.ts` |
| `drivers` | const | `drivers.argon2(options?)`, `drivers.bcrypt(options?)`, `drivers.scrypt(options?)` : construisent un `HashDriverConfig` |
| `SigilProvider` | provider | Même classe que `@c9up/sigil/provider` |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs) |
| `HashConfig` | interface | `{ default: string; list?: Record<string, HashDriverConfig>; drivers?: Record<string, HashDriverConfig> }` |
| `HashDriverConfig` | interface | `{ driver: string; [key: string]: unknown }` |
| `HashDriver` | interface | Ce qu'un driver implémente : `isValidHash`, `make`, `verify`, `needsReHash` |
| `Argon2Options` | interface | Options de `drivers.argon2()` |
| `BcryptOptions` | interface | Options de `drivers.bcrypt()` |
| `ScryptOptions` | interface | Options de `drivers.scrypt()` |
| `ReleasableSecret` | interface | `{ release(): string }`, la forme d'un `Secret` d'environnement |

### `Hash`

`new Hash(config: HashConfig)`. Le constructeur valide chaque hasher : un driver inconnu, une option hors limites (`E_SIGIL_INVALID_OPTION`) ou un `default` qui ne nomme aucun hasher échoue ici, au boot.

| Membre | Signature | Description |
|---|---|---|
| `config` | `readonly config: HashConfig` | La configuration, chaque `secret` argon2 enveloppé pour que sa journalisation n'affiche pas le poivre |
| `make` | `make(value: string): Promise<string>` | Hache `value` avec le hasher par défaut |
| `verify` | `verify(hash: string, value: string): Promise<boolean>` | Vérifie `value` contre un `hash` stocké ; le hash vient en premier |
| `isValidHash` | `isValidHash(hash: string): boolean` | Indique si `hash` a le format et les coûts du driver par défaut ; aucune dérivation |
| `needsReHash` | `needsReHash(hash: string): boolean` | Indique si `hash` a été produit par un autre algorithme ou d'autres paramètres que la configuration actuelle |
| `assertEquals` | `assertEquals(hash: string, value: string): Promise<void>` | Lève une `AssertionError` quand `value` ne se vérifie pas ; le message ne contient jamais `value` |
| `assertNotEquals` | `assertNotEquals(hash: string, value: string): Promise<void>` | Lève une `AssertionError` quand `value` se vérifie |
| `use` | `use(name?: string): Hasher` | Le hasher nommé, ou celui par défaut ; lève `E_SIGIL_UNKNOWN_HASHER` pour un nom non déclaré |
| `fake` | `fake(): { [Symbol.dispose](): void }` | Remplace chaque hasher par un faux : `make` renvoie la valeur, `verify` compare les chaînes. `using guard = hash.fake()` restaure en sortie de portée |
| `restore` | `restore(): void` | Quitte le mode factice |

### `Hasher`

`new Hasher(driver: HashDriver)`. Il a les mêmes membres `isValidHash`, `make`, `verify`, `needsReHash`, `assertEquals` et `assertNotEquals` que `Hash`, exécutés sur son propre driver.

`make` et `verify` exécutent la dérivation sur le pool de threads de libuv (4 threads sauf si `UV_THREADPOOL_SIZE` en décide autrement), jamais sur la boucle d'événements. `make` lève une erreur pour une valeur de plus de 1024 octets. Le `make` de bcrypt lève une erreur pour une valeur de plus de 72 octets plutôt que de la tronquer, et son `verify` répond `false`.

`verify` répond `false` sans dériver quand un hash stocké coûte plus que toute configuration réelle : `memory × iterations` argon2 au-delà de 2^20, un coût bcrypt au-delà de 16, un `N × r × p` scrypt au-delà de 2^22 ou un espace de travail `128 × r × (N + p + 2)` au-delà de `maxMemory`. Une configuration au-delà de ces limites lève une erreur à la construction du driver.

### `@c9up/sigil/provider`

| Export | Nature | Description |
|---|---|---|
| `default` | provider | `SigilProvider` : lie `Hash` depuis la configuration `hash` et remplit `@c9up/sigil/services/main` au boot |
| `SigilAppContext` | interface | `{ container, config }`, ce dont le provider a besoin de l'application |

### `@c9up/sigil/services/main`

| Export | Nature | Description |
|---|---|---|
| `default` | const | `hash: Hash`, le `Hash` de l'application une fois `SigilProvider` démarré ; toute lecture d'un membre avant lève `E_SIGIL_NOT_BOOTED` |

```ts
import hash from '@c9up/sigil/services/main'

const digest = await hash.make(password)
if (await hash.verify(digest, password) && hash.needsReHash(digest)) {
  user.password = await hash.make(password)
}
```

### `@c9up/sigil/configure`

| Export | Nature | Description |
|---|---|---|
| `configure` | fonction | `configure(codemods): Promise<void>` : ajoute `HASH_DRIVER`, enregistre `@c9up/sigil/provider`, écrit `config/hash.ts` |

## Configuration

`config/hash.ts`, lu sous la clé `hash`. Sans lui, le provider utilise `{ default: 'argon2', list: { argon2: { driver: 'argon2' } } }`.

```ts
import { defineConfig, drivers } from '@c9up/sigil'
import env from '#start/env'

export default defineConfig({
  default: env.get('HASH_DRIVER', 'argon2'),
  list: {
    argon2: drivers.argon2({ secret: env.get('APP_KEY') }),
    bcrypt: drivers.bcrypt({ rounds: 12 }),
  },
})
```

| Option | Type | Défaut | Description |
|---|---|---|---|
| `default` | `string` | — | Nom du hasher qu'utilisent `make`, `verify` et `use()` |
| `list` | `Record<string, HashDriverConfig>` | — | Les hashers, par nom |
| `drivers` | `Record<string, HashDriverConfig>` | — | Ancien nom de `list` ; les deux sont lus, `list` l'emporte sur une clé commune |

`drivers.argon2(options)` (driver argon2) :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `variant` | `'d' \| 'i' \| 'id'` | `'id'` | Variante d'argon2 |
| `memory` | `number` | `65536` | Mémoire en Kio, au moins `8 × parallelism` ; `memoryKib` est lu comme alias |
| `iterations` | `number` | `3` | Passes, au moins 2 |
| `parallelism` | `number` | `4` | Voies |
| `saltSize` | `number` | `16` | Octets de sel, de 8 à 48 |
| `hashLength` | `number` | `32` | Octets de sortie, de 10 à 64 |
| `secret` | `string \| ReleasableSecret` | — | Poivre mêlé à chaque hash et non stocké dedans ; la vérification exige le même secret |

`drivers.bcrypt(options)` (driver bcrypt) :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `rounds` | `number` | `12` | Coût, de 10 à 16 |
| `version` | `number` | `98` | `97` écrit `$2a$`, `98` écrit `$2b$`, `121` écrit `$2y$` |
| `saltSize` | `number` | `16` | Seul 16 est accepté |

`drivers.scrypt(options)` (driver scrypt) :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `cost` | `number` | `16384` | N, une puissance de deux |
| `blockSize` | `number` | `8` | r |
| `parallelization` | `number` | `1` | p |
| `keyLength` | `number` | `64` | Octets de clé, de 64 à 128 |
| `saltSize` | `number` | `16` | Octets de sel, de 8 à 1024 ; `saltLength` est lu comme alias |
| `maxMemory` | `number` | `33554432` | Octets, au moins l'espace de travail `128 × r × (N + p + 2)` ; borne aussi `verify` |

bcrypt écrit la forme MCF (`$2b$12$…`) et vérifie aussi la forme PHC `$bcrypt$v=98$r=…$…$…`, pour laquelle `needsReHash` répond `true`. scrypt écrit la forme PHC `$scrypt$n=…,r=…,p=…$<salt>$<hash>`.

## Liaisons du conteneur

| Token | Résout vers |
|---|---|
| `Hash` (classe) | Le `Hash` construit depuis la configuration `hash` |
| `'sigil.hash'` | Le même `Hash` |
| `'hash'` | Le même `Hash` |

`'sigil.hash'` et `'hash'` sont déclarés dans `ContainerBindings` : `container.make('sigil.hash')` est typé.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_SIGIL_UNKNOWN_DRIVER`](/fr/reference/errors#e-sigil-unknown-driver) | Un hasher de la configuration nomme un driver autre que `argon2`, `bcrypt` ou `scrypt` ; levée par le constructeur de `Hash` |
| [`E_SIGIL_UNKNOWN_HASHER`](/fr/reference/errors#e-sigil-unknown-hasher) | `default` (dans le constructeur) ou `use(name)` nomme un hasher que la configuration ne déclare pas |
| [`E_SIGIL_NAPI_REQUIRED`](/fr/reference/errors#e-sigil-napi-required) | `make` ou `verify` a tourné sans le moteur natif chargé |
| [`E_SIGIL_NOT_BOOTED`](/fr/reference/errors#e-sigil-not-booted) | `@c9up/sigil/services/main` a été lu avant `SigilProvider.boot()` |
| [`E_SIGIL_INVALID_OPTION`](/fr/reference/errors#e-sigil-invalid-option) | Une option de driver n'est pas un entier, sort de ses limites, n'est pas une valeur permise, un `cost` scrypt n'est pas une puissance de deux, ou une combinaison coûte plus que ce qu'accepte `verify` ; levée à la construction du driver |
| [`E_SIGIL_PASSWORD_TOO_LONG`](/fr/reference/errors#e-sigil-password-too-long) | `make` a reçu un mot de passe plus long que le plafond commun en octets, ou plus long que 72 octets pour bcrypt |

Chacune est une classe du namespace `errors` et une `Exception` de `@c9up/flare` de statut 500 : testez `error.code` ou `error instanceof errors.E_SIGIL_*`.

## Migration

- `SigilError` disparaît : testez `error.code`, ou `error instanceof errors.E_SIGIL_*` avec `import { errors } from '@c9up/sigil'`.
- Les classes d'erreur ne sont plus exportées une à une : `E_SIGIL_NAPI_REQUIRED` devient `errors.E_SIGIL_NAPI_REQUIRED`, et ainsi de suite.
- `E_SIGIL_INVALID_OPTION` n'est plus une `TypeError` : remplacez `instanceof TypeError` par `error.code === 'E_SIGIL_INVALID_OPTION'`.
- `error.name` ne vaut plus le code : lisez `error.code`.

## Voir aussi

- [Hachage](/fr/guides/security/hashing)
- [Vérifier des identifiants](/fr/guides/auth/verifying-credentials)
