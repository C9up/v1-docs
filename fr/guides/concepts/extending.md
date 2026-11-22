# Étendre ream

Ce guide couvre l'écriture d'un paquet qui se branche sur ream :

- Comment `ream add` invoque votre hook
- Le hook `configure()`
- Forme du paquet
- Le paramètre `flags`
- Conventions de gestion d'erreurs
- Idempotence
- Conventions d'extension de fichier
- Implémentations de référence first-party

Un plugin Ream est un paquet npm qui expose un hook `configure()` permettant au mainteneur d'une application Ream d'exécuter `ream add <pkg>` et de voir le paquet s'auto-câbler : provider inscrit dans `reamrc.ts`, variables d'environnement esquissées, fichiers de configuration générés. Cette page documente le contrat public — la signature de `configure()`, l'API `Codemods`, la forme de paquet attendue, et les conventions qui font qu'un plugin se comporte comme les paquets first-party (atlas, nova, photon, rover, sigil, spectrum, warden).

Cette page s'adresse aux **auteurs de plugins**. Les développeurs d'application qui consomment des plugins doivent plutôt lire [Ajouter un paquet](/fr/guides/command-line/generators#ajouter-un-paquet) et le [guide d'installation](/fr/start/installation#ajouter-un-paquet-ream).

## Comment `ream add` invoque votre hook

Quand un utilisateur exécute `pnpm ream add @community/your-plugin`, la CLI :

1. Auto-détecte le gestionnaire de paquets du projet à partir du lockfile (`pnpm-lock.yaml` > `yarn.lock` > `package-lock.json`).
2. Lance `<pm> add [-D] @community/your-plugin` pour installer le paquet.
3. Importe votre hook `configure` — d'abord depuis le sous-chemin léger `@community/your-plugin/configure`, puis fallback sur la racine `@community/your-plugin` si le sous-chemin n'est pas exporté.
4. Appelle `await configure(command, flags)` dans un processus enfant `node --import @swc-node/register/esm-register`.

Le sous-chemin est chargé via `@swc-node/register`, donc un `configure.ts` se charge sans étape de build pendant le développement du plugin (voir [Publication : la source en développement, `dist/` sur npm](/fr/guides/concepts/extending#publication-la-source-en-developpement-dist-sur-npm)).

## Le hook `configure()`

```typescript title="src/configure.ts"
import type { Codemods, Prompt } from '@c9up/ream'

interface ConfigureCommand {
  name: string
  force: boolean
  parsedFlags: Record<string, string | number | boolean | Array<string | number | boolean>>
  parsedArgs: string[]
  prompt: Prompt
  logger: { success(m: string): void; info(m: string): void; warning(m: string): void; error(m: string): void }
  exitCode?: number
  stubsRoot?: string
  createCodemods(): Promise<Codemods>
}

export async function configure(command: ConfigureCommand): Promise<void> {
  const codemods = await command.createCodemods()
  // ...
}
```

Le premier argument est la commande qui exécute le hook. Elle expose aussi directement chaque méthode de `Codemods`, et les drapeaux bruts arrivent en second argument (voir [Le paramètre `flags`](/fr/guides/concepts/extending#le-parametre-flags)) : un hook écrit `configure(codemods, flags)` continue de fonctionner.

| Propriété | Contenu |
|---|---|
| `name` | Le paquet configuré. |
| `force` | `true` sous `--force` ; les codemods écrasent alors les fichiers existants. |
| `parsedFlags` | Les drapeaux inconnus, analysés : `--store=redis` → `'redis'`, `--ssl` → `true`, `--no-ssl` → `ssl: false`, `--retries=3` → `3`, un drapeau répété → un tableau. `force` y figure quand il a été passé. |
| `parsedArgs` | Toujours `[]` : les arguments positionnels sont refusés avant le hook. |
| `prompt` | Interroge l'utilisateur : `ask`, `secure`, `confirm`, `toggle`, `choice`, `multiple`, `autocomplete`. |
| `logger`, `ui`, `colors` | La sortie terminal. |
| `exitCode` | Une valeur non nulle fait échouer la commande sans lever d'exception. |
| `stubsRoot` | Le `stubsRoot` exporté par votre module, s'il y en a un. |
| `createCodemods()` | Les codemods, liés au projet et à `--force`. |

### Interroger l'utilisateur

Lisez d'abord le drapeau, et ne posez la question que s'il manque : le même hook fonctionne ainsi dans un terminal comme dans un script.

```typescript
let store = command.parsedFlags.store
if (!store) {
  store = await command.prompt.choice('Select the lock store', ['redis', 'memory'], { default: 0 })
}
if (store !== 'redis' && store !== 'memory') {
  command.logger.error(`Invalid lock store "${store}"`)
  command.exitCode = 1
  return
}
```

Une exécution sans terminal sur l'entrée standard, ou avec `CI` défini, n'attend jamais de réponse. Une question qui a un `default` le renvoie (en passant par son `validate` et son `result`) ; une question sans valeur par défaut échoue aussitôt avec `E_CONSOLE_NOT_INTERACTIVE`, en citant la question. Pour `choice`, `autocomplete` et `multiple`, la valeur par défaut est un index (un tableau d'index pour `multiple`).

Le hook est asynchrone et retourne `Promise<void>`. Lever une exception interrompt l'opération : toute erreur qui s'échappe de la fonction sort `ream add` avec le code 1 (et `ream configure` avec le code 1). La CLI ne capture pas pour continuer — un configure raté laisse le paquet installé mais le projet non configuré.

Le hook s'exécute une fois par invocation de `ream add` / `ream configure`. Il DOIT être idempotent : un utilisateur qui relance `ream add` après avoir mis à jour le paquet NE DOIT PAS voir de modifications destructrices. Les méthodes de `Codemods` ci-dessous sont conçues pour être sûres à ré-exécuter — `addProvider`, `addEnvVars`, `writeFile`, `registerCommand`, `defineEnvValidations` et `addPreloadFile` ignorent silencieusement les changements déjà appliqués ; `registerMiddleware` est idempotent par tier et rejette d'emblée les collisions cross-tier (enregistrer le même chemin d'import dans `server` ET `router` lève une erreur). Toute écriture de fichier directe que vous effectuez en dehors de `Codemods` DOIT suivre la même convention.

## Forme du paquet

Un plugin est un paquet TypeScript ESM-only. Le `package.json` minimal :

```json title="package.json"
{
  "name": "@community/your-plugin",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./configure": "./src/configure.ts"
  },
  "peerDependencies": {
    "@c9up/ream": "^X.Y.0"
  },
  "engines": {
    "node": ">=22.0.0"
  }
}
```

| Champ | Statut | Notes |
|---|---|---|
| `type: "module"` | Requis | Les plugins sont ESM-only — `ream-cli` les charge via un `import()` dynamique. |
| `exports["./configure"]` | Recommandé | Permet à `ream-cli` de charger le hook sans tirer votre runtime. Fallback sur l'export racine si absent. |
| `peerDependencies["@c9up/ream"]` | Recommandé | L'interface `Codemods` est son contrat public. Épinglez une plage SemVer pour la version majeure supportée. |
| `engines.node` | Recommandé | Aligné sur `@c9up/ream` (actuellement `>=24.0.0`). |

### Publication : la source en développement, `dist/` sur npm

Les paquets first-party s'exécutent depuis leur source TypeScript pendant le développement — les `exports` versionnés pointent sur `src/` — et publient du JavaScript compilé : leur `publishConfig` redirige `main` / `types` / `exports` vers `dist/`, si bien que le tarball contient `dist/*.js` + `.d.ts`, construits juste avant `pnpm publish`. Un consommateur sans loader TypeScript peut les importer.

Faites de même pour un plugin : développez contre `src/`, et publiez avec un `publishConfig` qui pointe `exports["./configure"]` (et le reste) vers le JS compilé. Le contrat exige seulement que `<pkg>/configure` résolve vers un module exportant une fonction nommée `configure`.

## Le paramètre `flags`

Le second argument du hook porte les drapeaux inconnus non analysés ; `command.parsedFlags` contient les mêmes, analysés (voir plus haut). `ream add @community/your-plugin --foo=bar --foo=baz --queue=redis` les transmet sous la forme :

```typescript
flags = {
  foo: ['bar', 'baz'],
  queue: ['redis'],
}
```

Les drapeaux réservés `--dev` et `--force` sont consommés par `ream-cli` lui-même et n'apparaissent jamais dans `flags`. Les noms de drapeaux doivent matcher `^[a-zA-Z][a-zA-Z0-9_-]*$` — toute autre forme est rejetée par la CLI avant que le hook ne s'exécute. Les valeurs vides (`--foo=`) sont aussi rejetées.

À l'intérieur du hook, traitez `flags` comme une entrée non fiable — validez les clés et valeurs lues :

```typescript
const transports = flags?.transports ?? []
if (transports.length === 0) {
  // comportement par défaut
}
```

Documentez les drapeaux acceptés par votre hook dans le README de votre plugin afin que les consommateurs sachent quoi passer.

## Conventions de gestion d'erreurs

Levez une `Error` standard (ou une sous-classe) avec le préfixe `[configure]` quand quelque chose échoue. L'implémentation `Codemods` first-party utilise ce préfixe systématiquement, donc les utilisateurs voient une forme d'erreur uniforme indépendamment du paquet qui l'a levée :

```typescript
if (!flags?.apiToken?.[0]) {
  throw new Error('[configure] Missing required flag --apiToken — pass it via `ream add @community/your-plugin --apiToken=<token>`.')
}
```

`ream add` sort 1 si une exception s'échappe du hook. Le paquet reste installé (l'étape d'installation a tourné en premier) mais l'état du projet est ce que le hook a accompli avant de lever. Les codemods ne sont pas transactionnels — ordonnez vos appels pour que l'étape la plus susceptible d'échouer s'exécute en premier, et privilégiez la validation fail-fast en tête de hook plutôt que des effets de bord partiels.

## Idempotence

Les cinq méthodes de `Codemods` dédupliquent par construction :

- `addProvider` saute si le chemin d'import exact est déjà présent dans `reamrc.ts`.
- `addEnvVars` saute les clés déjà présentes dans `.env` / `.env.example` (sauf `overwrite`).
- `writeFile` saute les fichiers existants à moins que `force` ne soit défini.
- `registerCommand` saute si le chemin d'import exact est déjà présent dans `reamrc.ts`.
- `registerMiddleware` saute si le chemin d'import exact est déjà présent dans le bloc `<tier>.use([...])` ciblé, et rejette d'emblée les collisions cross-tier.

Si vous écrivez des fichiers en dehors de `Codemods`, suivez la même convention. Pour les fichiers que l'utilisateur est censé intégrer dans une configuration existante (plutôt que consommer tels quels), préférez le motif snippet ci-dessous au lieu d'écrire directement.

## Conventions d'extension de fichier

Quand `writeFile` créerait un fichier que l'utilisateur maintient activement (l'exemple canonique : `config/mail.ts` après que l'utilisateur a déjà configuré un transport), N'écrasez PAS — écrivez plutôt un fichier **snippet** :

```typescript
await codemods.writeFile(
  'config/mail.your-plugin-snippet.ts',
  '// Paste this block into your config/mail.ts under `transports: { ... }`.\n// ...',
)
```

Nommage recommandé :

| Cas d'usage | Chemin | Notes |
|---|---|---|
| Config standalone | `config/<plugin>.ts` | Sûr dans un projet vierge — aucun fichier existant à ce chemin. |
| Snippet pour config maintenue par l'utilisateur | `config/<plugin>-snippet.ts` | Suffixe `.snippet` ou nom descriptif évite l'import accidentel. |
| Fichier de migration | `database/migrations/<NNNN>_<name>.ts` | Idempotent sur le chemin exact ; l'utilisateur lance `ream migrate` ensuite. |

## Implémentations de référence first-party

Les paquets first-party livrent chacun un `configure.ts` que vous pouvez consulter pour des motifs réels :

- [Atlas (ORM)](/fr/guides/database/orm/) — `packages/atlas/src/configure.ts` — référence la plus simple : `addProvider` + `addEnvVars` + un `writeFile` pour `config/database.ts`.
- [Nova (Notifications)](/fr/guides/digging-deeper/push/) — `packages/nova/src/configure.ts` — référence avancée : lit un template de migration via `node:fs/promises` + `node:url`, scaffolde un Service Worker, empile plusieurs appels `writeFile`.
- [Photon (Frontend)](/fr/guides/frontend/photon/) — `packages/photon/src/configure.ts` — référence intermédiaire : templates string inline pour `config/photon.ts`.
- [Rover (Mail)](/fr/guides/digging-deeper/mail/) — expose `registerTransport` pour l'exemple complet ci-dessus.
- [Sigil (Hachage)](/fr/guides/security/hashing) — hook minimal sans variables d'env.
- [Spectrum (Logging)](/fr/guides/digging-deeper/logger/) — provider + config de driver de log.
- [Warden (Auth)](/fr/guides/auth/introduction) — ébauche de secret JWT + config d'auth.

## Étapes suivantes
- [Ajouter un paquet](/fr/guides/command-line/generators#ajouter-un-paquet) — la documentation côté consommateur de `ream add`.
- [Installation — Ajouter un paquet Ream](/fr/start/installation#ajouter-un-paquet-ream) — vue d'ensemble haut-niveau côté développeur d'application.
- [Providers](/fr/guides/concepts/providers) — ce que font les providers et comment ils s'intègrent au cycle de vie du framework.
