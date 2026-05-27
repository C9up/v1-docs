# Système de plugins

Un plugin Ream est un paquet npm qui expose un hook `configure()` permettant au mainteneur d'une application Ream d'exécuter `ream add <pkg>` et de voir le paquet s'auto-câbler : provider inscrit dans `reamrc.ts`, variables d'environnement esquissées, fichiers de configuration générés. Cette page documente le contrat public — la signature de `configure()`, l'API `Codemods`, la forme de paquet attendue, et les conventions qui font qu'un plugin se comporte comme les paquets first-party (atlas, nova, photon, rover, sigil, spectrum, warden).

Cette page s'adresse aux **auteurs de plugins**. Les développeurs d'application qui consomment des plugins doivent plutôt lire [Ajouter un paquet](/fr/cli/ream#ajouter-un-paquet) et le [guide d'installation](/fr/guide/installation#ajouter-un-paquet-ream).

## Comment `ream add` invoque votre hook

Quand un utilisateur exécute `pnpm ream add @community/your-plugin`, la CLI :

1. Auto-détecte le gestionnaire de paquets du projet à partir du lockfile (`pnpm-lock.yaml` > `yarn.lock` > `package-lock.json`).
2. Lance `<pm> add [-D] @community/your-plugin` pour installer le paquet.
3. Importe votre hook `configure` — d'abord depuis le sous-chemin léger `@community/your-plugin/configure`, puis fallback sur la racine `@community/your-plugin` si le sous-chemin n'est pas exporté.
4. Appelle `await configure(codemods, flags)` dans un processus enfant `node --import @swc-node/register/esm-register`.

Le sous-chemin est chargé via `@swc-node/register`, donc écrire `configure.ts` directement (sans étape de build) fonctionne d'emblée conformément à ADR-003 — Stratégie de publication des paquets (source-first).

## Le hook `configure()`

```typescript title="src/configure.ts"
import type { Codemods } from '@c9up/ream'

export async function configure(
  codemods: Codemods,
  flags?: Record<string, string[]>,
): Promise<void> {
  // ...
}
```

Le hook est asynchrone et retourne `Promise<void>`. Lever une exception interrompt l'opération : toute erreur qui s'échappe de la fonction sort `ream add` avec le code 1 (et `ream configure` avec le code 1). La CLI ne capture pas pour continuer — un configure raté laisse le paquet installé mais le projet non configuré.

Le hook s'exécute une fois par invocation de `ream add` / `ream configure`. Il DOIT être idempotent : un utilisateur qui relance `ream add` après avoir mis à jour le paquet NE DOIT PAS voir de modifications destructrices. Les cinq méthodes de `Codemods` ci-dessous sont conçues pour être sûres à ré-exécuter — `addProvider`, `addEnvVars`, `writeFile` et `registerCommand` ignorent silencieusement les changements déjà appliqués ; `registerMiddleware` est idempotent par tier et rejette d'emblée les collisions cross-tier (enregistrer le même chemin d'import dans `server` ET `router` lève une erreur). Toute écriture de fichier directe que vous effectuez en dehors de `Codemods` DOIT suivre la même convention.

## L'API `Codemods`

L'interface `Codemods` est le seul argument sur lequel vous opérez. Ses cinq méthodes couvrent les motifs récurrents : enregistrer un provider, semer des variables d'environnement, générer des fichiers de configuration ou de migration, enregistrer une commande CLI, et enregistrer un middleware HTTP. La source vivante est en `packages/ream/src/Codemods.ts:4`.

```typescript
interface Codemods {
  addProvider(importPath: string): Promise<void>
  addEnvVars(vars: Record<string, string>): Promise<void>
  writeFile(filePath: string, content: string, options?: { force?: boolean }): Promise<void>
  registerCommand(importPath: string): Promise<void>
  registerMiddleware(importPath: string, options?: { tier?: 'server' | 'router' }): Promise<void>
}
```

### `addProvider(importPath)`

Insère une entrée `() => import('<importPath>'),` dans le tableau `providers: [ ... ]` de `reamrc.ts` (implémentation vivante en `packages/ream/src/Codemods.ts:86`). Idempotent — les chemins déjà enregistrés sont ignorés. La déduplication compare la chaîne d'import exacte entourée de guillemets simples ou doubles (`'@pkg/sub'` ou `"@pkg/sub"`).

```typescript
await codemods.addProvider('@community/your-plugin/provider')
```

**Limitation connue.** `addProvider` est un codemod basé sur regex, pas une transformation AST TypeScript. Il fonctionne pour la forme canonique `providers: [ ... ]` émise par `ream new` et tolère les commentaires et l'espace autour du tableau. Il ne gère PAS les formes inhabituelles — providers étalés depuis une const, providers construits via un ternaire, providers extraits dans une `const providers = [...]` séparée au-dessus de l'objet de config — voir le JSDoc en `packages/ream/src/Codemods.ts:76`. Documentez cette limitation dans le README de votre plugin afin que les utilisateurs avec une mise en page non canonique sachent qu'il faut éditer `reamrc.ts` à la main.

### `addEnvVars(vars)`

Ajoute des paires `KEY=value` à `.env` (créant le fichier s'il manque ; implémentation vivante en `packages/ream/src/Codemods.ts:123`). Idempotent — les clés déjà présentes en début de ligne dans `.env` sont laissées intactes, donc les valeurs existantes écrites par l'utilisateur ou un précédent `configure` sont préservées.

```typescript
await codemods.addEnvVars({
  POSTMARK_API_TOKEN: '<your-postmark-token>',
})
```

Utilisez des valeurs placeholder qui signalent « à remplir » (chaîne vide, balise `<placeholder>`, ou fallback dev-only). N'engagez PAS de secrets de production via `addEnvVars`.

### `writeFile(filePath, content, options?)`

Écrit un fichier sous la racine du projet (implémentation vivante en `packages/ream/src/Codemods.ts:141`). Le chemin est résolu relativement à la racine et rejeté s'il s'échappe via `..` ou un lien symbolique. Idempotent — les fichiers existants sont laissés intacts à moins que `options.force` ne soit défini (transmis par `ream add --force` / `ream configure --force`).

```typescript
await codemods.writeFile('config/your-plugin.ts', `import { defineConfig } from '@community/your-plugin'

export default defineConfig({
  // ...
})
`)
```

Les erreurs levées par `writeFile` utilisent le préfixe `[configure]` et expliquent la contrainte violée (chemin absolu, échappement par lien symbolique, écriture hors racine).

### `registerCommand(importPath)`

Insère une entrée `() => import('<importPath>'),` dans le tableau `commands: [ ... ]` de `reamrc.ts` (implémentation vivante en `packages/ream/src/Codemods.ts:202`). Bootstrappe un champ `commands: []` quand il est absent — l'insère immédiatement après le bloc `providers: [...]` existant s'il est présent, sinon avant la fermeture `})` de `defineConfig({...})`. Idempotent — les chemins déjà enregistrés sont ignorés, avec la même déduplication par guillemets simples/doubles que `addProvider`.

```typescript
await codemods.registerCommand('@community/your-plugin/commands/my-command.js')
```

Le chemin d'import doit pointer vers un module dont l'export par défaut respecte la forme `Command` de `packages/ream/src/console/CommandRunner.ts:8` (`{ name, description, run }`). Le `ConsoleKernel` (`packages/ream/src/Ignitor.ts:566`) charge automatiquement chaque entrée `commands[]` au boot. Les erreurs levées par `registerCommand` utilisent le préfixe `[configure]` — les cas fichier-manquant et `defineConfig({})`-manquant portent chacun le chemin d'import dans le message afin que l'échec pointe sur la config de l'utilisateur, pas sur le code du plugin.

### `registerMiddleware(importPath, options?)`

Insère une entrée `() => import('<importPath>'),` dans le tableau `<tier>.use([ ... ])` approprié de `start/kernel.ts` (implémentation vivante en `packages/ream/src/Codemods.ts:291`). L'option `tier` choisit entre `'server'` (s'exécute sur chaque requête y compris les 404 — convient aux en-têtes de sécurité, à la propagation de request-id, à la journalisation structurée) et `'router'` (s'exécute uniquement sur les routes matchées — convient à l'authentification, au CSRF, aux concerns route-level). Par défaut `'router'`, le choix conservateur qui n'interfère pas avec les réponses 404.

```typescript
await codemods.registerMiddleware('@community/your-plugin/middleware/headers.js', { tier: 'server' })
```

Idempotent **par tier** — appeler `registerMiddleware` deux fois avec le même importPath et le même tier produit une seule entrée. La collision cross-tier est rejetée : enregistrer le même importPath dans `server` ET `router` est presque toujours une erreur ; le second appel lève `[configure] middleware <importPath> is already registered in <other-tier> tier`.

Contrairement à `registerCommand`, cette méthode ne bootstrappe PAS un bloc `<tier>.use([])` manquant. Les appels `server.use` et `router.use` dans `start/kernel.ts` sont du code idiomatique écrit par l'utilisateur (avec leur propre boilerplate `import server from '@c9up/ream/services/server'`), pas un contrat de forme de config — les synthétiser serait piégeux si l'utilisateur a renommé des identifiants. Quand le bloc ciblé est absent, le codemod échoue avec `[configure] Could not find '<tier>.use([' in start/kernel.ts` et demande à l'utilisateur de l'ajouter à la main.

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
| `engines.node` | Recommandé | Aligné sur `@c9up/ream` (actuellement `>=22.0.0`). |

### Authoring source-first (ADR-003)

La forme recommandée est de publier les fichiers `.ts` tels quels et de laisser le loader du consommateur (`@swc-node/register`, `tsx`, Bun) les compiler — pas d'étape de build `dist/`. Cela correspond à la manière dont les paquets first-party publient (voir ADR-003 — Stratégie de publication des paquets — pour la justification complète).

Si vous préférez publier un `dist/` compilé (par exemple parce que votre runtime dépend d'outils non disponibles dans les loaders TS-aware), pointez `exports["./configure"]` vers le JS compilé. Le contrat exige seulement que `<pkg>/configure` résolve vers un module exportant une fonction nommée `configure`.

## Le paramètre `flags`

`ream add @community/your-plugin --foo=bar --foo=baz --queue=redis` transmet les drapeaux non reconnus à votre hook sous la forme :

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

Levez une `Error` standard (ou une sous-classe) avec le préfixe `[configure]` quand quelque chose échoue. L'implémentation `Codemods` first-party utilise ce préfixe systématiquement (voir `packages/ream/src/Codemods.ts:90, 114, 143, 147, 162, 171, 206, 257, 298, 308, 320, 328`), donc les utilisateurs voient une forme d'erreur uniforme indépendamment du paquet qui l'a levée :

```typescript
if (!flags?.apiToken?.[0]) {
  throw new Error('[configure] Missing required flag --apiToken — pass it via `ream add @community/your-plugin --apiToken=<token>`.')
}
```

`ream add` sort 1 si une exception s'échappe du hook. Le paquet reste installé (l'étape d'installation a tourné en premier) mais l'état du projet est ce que le hook a accompli avant de lever. Les codemods ne sont pas transactionnels — ordonnez vos appels pour que l'étape la plus susceptible d'échouer s'exécute en premier, et privilégiez la validation fail-fast en tête de hook plutôt que des effets de bord partiels.

## Idempotence

Les cinq méthodes de `Codemods` dédupliquent par construction :

- `addProvider` saute si le chemin d'import exact est déjà présent dans `reamrc.ts`.
- `addEnvVars` saute les clés déjà présentes dans `.env`.
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

## Exemple complet : transport Postmark pour Rover

Cet exemple parcourt la publication d'un transport Postmark communautaire pour [Rover (Mail)](/fr/modules/rover). Le transport implémente `MailTransport` afin que l'utilisateur puisse référencer `transport: 'postmark'` dans `config/mail.ts` après avoir lancé `ream add @community/postmark-rover-transport`.

La structure du paquet :

```
@community/postmark-rover-transport/
├── package.json
└── src/
    ├── index.ts       # PostmarkTransport class implementing MailTransport
    └── configure.ts   # configure() hook
```

### `package.json`

```json title="package.json"
{
  "name": "@community/postmark-rover-transport",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./configure": "./src/configure.ts"
  },
  "peerDependencies": {
    "@c9up/ream": "^X.Y.0",
    "@c9up/rover": "^X.Y.0"
  },
  "engines": {
    "node": ">=22.0.0"
  }
}
```

### `src/index.ts`

```typescript title="src/index.ts"
import type { MailMessage, MailSendOutcome, MailTransport } from '@c9up/rover'

interface PostmarkConfig {
  apiToken: string
}

export class PostmarkTransport implements MailTransport {
  readonly #config: PostmarkConfig

  constructor(config: Record<string, unknown>) {
    const apiToken = config.apiToken
    if (typeof apiToken !== 'string' || apiToken.length === 0) {
      throw new Error('[postmark-transport] Missing apiToken in transport config.')
    }
    this.#config = { apiToken }
  }

  async send(message: MailMessage): Promise<MailSendOutcome> {
    if (message.to.length === 0) {
      throw new Error('[postmark-transport] No recipients in message — `to` is empty.')
    }
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': this.#config.apiToken,
      },
      body: JSON.stringify({
        From: message.from,
        To: message.to.join(', '),
        Cc: message.cc.length > 0 ? message.cc.join(', ') : undefined,
        Bcc: message.bcc.length > 0 ? message.bcc.join(', ') : undefined,
        ReplyTo: message.replyTo,
        Subject: message.subject,
        HtmlBody: message.html,
        TextBody: message.text,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`[postmark-transport] Postmark rejected message: ${response.status} ${body}`)
    }

    const payload: unknown = await response.json()
    const providerId =
      payload !== null && typeof payload === 'object' && 'MessageID' in payload && typeof payload.MessageID === 'string'
        ? payload.MessageID
        : undefined

    return providerId !== undefined ? { providerId } : undefined
  }
}
```

### `src/configure.ts`

```typescript title="src/configure.ts"
import type { Codemods } from '@c9up/ream'

const SNIPPET = `// Paste this block into your config/mail.ts under \`transports: { ... }\`:
//
//   postmark: {
//     transport: 'postmark',
//     apiToken: process.env.POSTMARK_API_TOKEN ?? '',
//   }
//
// Then register the transport once at boot (e.g. in a provider's boot() method):
//
//   import { registerTransport } from '@c9up/rover'
//   import { PostmarkTransport } from '@community/postmark-rover-transport'
//   registerTransport('postmark', (config) => new PostmarkTransport(config))
`

export async function configure(codemods: Codemods): Promise<void> {
  await codemods.addEnvVars({
    POSTMARK_API_TOKEN: '<your-postmark-token>',
  })
  await codemods.writeFile('config/mail.postmark-snippet.ts', SNIPPET)
  console.log('  Note: Snippet written to config/mail.postmark-snippet.ts — paste into your config/mail.ts under `transports:`.')
}
```

Le hook écrit délibérément un fichier `*-snippet.ts` au lieu de toucher à `config/mail.ts` directement — `ream add` tourne après que l'utilisateur a déjà configuré `@c9up/rover`, donc `config/mail.ts` existe et est activement maintenu. L'écraser supprimerait ses autres transports ; le motif snippet laisse l'étape d'intégration sous le contrôle de l'utilisateur.

Si votre plugin transport ship également une commande CLI (par ex. `mail:send-test`), appelez `await codemods.registerCommand('@community/postmark-rover-transport/commands/send-test.js')` depuis le même hook configure — `registerCommand` bootstrappera le champ `commands: []` dans `reamrc.ts` s'il est absent, puis ajoutera l'entrée de manière idempotente.

### Ce que voit l'utilisateur

```bash
$ pnpm ream add @community/postmark-rover-transport

  Adding @community/postmark-rover-transport with pnpm...
  ...
  Configuring @community/postmark-rover-transport...
  Note: Snippet written to config/mail.postmark-snippet.ts — paste into your config/mail.ts under `transports:`.
  Done! @community/postmark-rover-transport configured.
```

L'utilisateur colle le snippet dans son `config/mail.ts`, remplit `POSTMARK_API_TOKEN` dans `.env`, et utilise `transport: 'postmark'` dans sa configuration mail.

## Implémentations de référence first-party

Les paquets first-party livrent chacun un `configure.ts` que vous pouvez consulter pour des motifs réels :

- [Atlas (ORM)](/fr/modules/atlas) — `packages/atlas/src/configure.ts` — référence la plus simple : `addProvider` + `addEnvVars` + un `writeFile` pour `config/database.ts`.
- [Nova (Notifications)](/fr/modules/nova) — `packages/nova/src/configure.ts` — référence avancée : lit un template de migration via `node:fs/promises` + `node:url`, scaffolde un Service Worker, empile plusieurs appels `writeFile`.
- [Photon (Frontend)](/fr/modules/photon) — `packages/photon/src/configure.ts` — référence intermédiaire : templates string inline pour `config/photon.ts`.
- [Rover (Mail)](/fr/modules/rover) — expose `registerTransport` pour l'exemple complet ci-dessus.
- [Sigil (Hachage)](/fr/modules/sigil) — hook minimal sans variables d'env.
- [Spectrum (Logging)](/fr/modules/spectrum) — provider + config de driver de log.
- [Warden (Auth)](/fr/modules/warden) — ébauche de secret JWT + config d'auth.

## Étapes suivantes

- [Ajouter un paquet](/fr/cli/ream#ajouter-un-paquet) — la documentation côté consommateur de `ream add`.
- [Installation — Ajouter un paquet Ream](/fr/guide/installation#ajouter-un-paquet-ream) — vue d'ensemble haut-niveau côté développeur d'application.
- [Providers](/fr/guide/providers) — ce que font les providers et comment ils s'intègrent au cycle de vie du framework.
