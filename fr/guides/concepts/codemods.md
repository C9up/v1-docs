# L’API Codemods

Ce guide couvre les codemods qu’un hook configure peut exécuter :

- `addProvider(importPath)`
- `addEnvVars(vars, options?)`
- `writeFile(filePath, content, options?)`
- `makeUsingStub(stubsRoot, stubPath, state?, options?)`
- `registerCommand(importPath)`
- `registerMiddleware(importPath, options?)`
- `defineEnvValidations(definition)`
- `addPreloadFile(modulePath, environments?)`

## L'API `Codemods`

`await command.createCodemods()` renvoie les `Codemods`, qui modifient le projet. Ses méthodes couvrent les motifs récurrents : enregistrer un provider ou un preload, semer des variables d'environnement et leurs règles de validation, générer des fichiers de configuration ou de migration, enregistrer une commande CLI, et enregistrer un middleware HTTP. La source vivante est en `packages/ream/src/Codemods.ts:4`.

```typescript
interface Codemods {
  addProvider(importPath: string): Promise<void>
  addEnvVars(
    vars: Record<string, string>,
    options?: { omitFromExample?: string[]; overwrite?: boolean },
  ): Promise<void>
  writeFile(filePath: string, content: string, options?: { force?: boolean }): Promise<void>
  makeUsingStub(
    stubsRoot: string,
    stubPath: string,
    state?: Record<string, string | number | boolean>,
    options?: { force?: boolean },
  ): Promise<{ path: string; contents: string }>
  registerCommand(importPath: string): Promise<void>
  registerMiddleware(
    importPath: string,
    options?: { tier?: 'server' | 'router'; position?: 'before' | 'after' },
  ): Promise<void>
  defineEnvValidations(definition: {
    leadingComment?: string
    variables: Record<string, string>
    overwrite?: boolean
  }): Promise<string[]>
  addPreloadFile(
    modulePath: string,
    environments?: Array<'web' | 'console' | 'test' | 'repl'>,
  ): Promise<void>
}
```

### `addProvider(importPath)`

Insère une entrée `() => import('<importPath>'),` dans le tableau `providers: [ ... ]` de `reamrc.ts`. Idempotent — les chemins déjà enregistrés sont ignorés. La déduplication compare la chaîne d'import exacte entourée de guillemets simples ou doubles (`'@pkg/sub'` ou `"@pkg/sub"`).

```typescript
await codemods.addProvider('@community/your-plugin/provider')
```

**Limitation connue.** `addProvider` est un codemod basé sur regex, pas une transformation AST TypeScript. Il fonctionne pour la forme canonique `providers: [ ... ]` émise par `ream new` et tolère les commentaires et l'espace autour du tableau. Il ne gère PAS les formes inhabituelles — providers étalés depuis une const, providers construits via un ternaire, providers extraits dans une `const providers = [...]` séparée au-dessus de l'objet de config — voir le JSDoc en `packages/ream/src/Codemods.ts:76`. Documentez cette limitation dans le README de votre plugin afin que les utilisateurs avec une mise en page non canonique sachent qu'il faut éditer `reamrc.ts` à la main.

### `addEnvVars(vars, options?)`

Ajoute des paires `KEY=value` à `.env` (créant le fichier s'il manque) et à `.env.example` quand le projet en a un, pour qu'un clone neuf apprenne que les variables existent. Idempotent — une clé déjà présente en début de ligne est laissée intacte dans l'un comme l'autre fichier, donc les valeurs écrites par l'utilisateur ou un précédent `configure` sont préservées ; `overwrite: true` (ou des codemods créés avec `force`) remplace plutôt cette ligne sur place.

Les clés listées dans `omitFromExample` sont écrites vides (`KEY=`) dans `.env.example`, pour que la valeur de développement d'un secret n'atteigne jamais le fichier commité. Une valeur ou une clé contenant un saut de ligne est refusée avant toute écriture.

```typescript
await codemods.addEnvVars(
  { POSTMARK_API_URL: 'https://api.postmarkapp.com', POSTMARK_API_TOKEN: '<your-postmark-token>' },
  { omitFromExample: ['POSTMARK_API_TOKEN'] },
)
```

Utilisez des valeurs placeholder qui signalent « à remplir » (chaîne vide, balise `<placeholder>`, ou fallback dev-only). N'engagez PAS de secrets de production via `addEnvVars`.

### `writeFile(filePath, content, options?)`

Écrit un fichier sous la racine du projet. Le chemin est résolu relativement à la racine et rejeté s'il s'échappe via `..` ou un lien symbolique. Idempotent — les fichiers existants sont laissés intacts à moins que `options.force` ne soit défini (transmis par `ream add --force` / `ream configure --force`).

```typescript
await codemods.writeFile('config/your-plugin.ts', `import { defineConfig } from '@community/your-plugin'

export default defineConfig({
  // ...
})
`)
```

Les erreurs levées par `writeFile` utilisent le préfixe `[configure]` et expliquent la contrainte violée (chemin absolu, échappement par lien symbolique, écriture hors racine).

### `makeUsingStub(stubsRoot, stubPath, state?, options?)`

**C'est ainsi qu'un paquet génère un fichier.** `writeFile` existe toujours,
mais il est fait pour du contenu que vous CALCULEZ ; tout ce que vous templatez
appartient à un stub.

Un stub est un fichier ordinaire livré avec votre paquet. Son front matter nomme
sa destination, et les placeholders `{{ nom }}` sont remplis depuis `state` :

```
---
to: config/your-plugin.ts
---
import { defineConfig } from '@community/your-plugin'

export default defineConfig({
  adapter: '{{ adapter }}',
})
```

```typescript
// src/stubs.ts — son propre module, pour qu'un appelant importe la racine seule
import { join } from 'node:path'
export const stubsRoot = join(import.meta.dirname, '..', 'stubs')
```

```typescript
import { stubsRoot } from './stubs.js'

await codemods.makeUsingStub(stubsRoot, 'config/your-plugin.stub', {
  adapter: 'tailwind',
})
```

Ajoutez `"stubs"` au tableau `files` de votre package.json, sinon les stubs ne
seront pas livrés.

**La copie de l'application l'emporte.** Un fichier publié dans
`stubs/<stubPath>` du projet est utilisé à la place du vôtre — c'est ce qui
permet à quelqu'un de changer la config que votre paquet génère sans forker le
paquet. C'est la règle que les générateurs `make:` suivent déjà pour
`stubs/make/`.

La destination est rendue elle aussi : `to: config/{{ name }}.ts` permet à un
seul stub de servir plusieurs sorties. Un placeholder inconnu est laissé tel
quel plutôt que vidé — un stub qui perd une ligne en silence est pire qu'un
stub qui a visiblement gardé un `{{ }}`. La destination passe par la même garde
que `writeFile` — pas de chemin absolu, pas de `..`, pas de lien symbolique
hors du projet — et un stub sans `to:` est refusé plutôt que deviné.

Un stub ne se limite pas aux placeholders. La grammaire complète est là :

```
{{! un commentaire }}
{{#expect name, entity }}
{{#var plural = name + 's' }}
{{#if entity.isModel }}…{{#elif entity.isView }}…{{#else}}…{{/if}}
{{#each methods as method, index }}  {{ method }}()
{{/each}}
```

**Pas d'échappement HTML.** `{{ }}` n'échappe PAS le HTML. Un stub est un
fichier source, et y transformer `"` en `&quot;` produit du code qui ne compile
pas — en silence. `{{{ }}}` veut dire la même chose, et l'option `escape`
réactive l'échappement pour qui template du markup.

**Un stub ne peut pas exécuter de code.** Le template est lu une fois puis
interprété, jamais compilé en JavaScript. Une expression est la part de
JavaScript dont un stub a besoin — noms, `a.b`, `a?.b`, `a[i]`, appels,
`! - + * / %`, comparaisons, `&& || ??`, `? :`, `[…]` et `{…}` — et elle
n'atteint que ce qu'on lui donne : les propriétés propres de l'état et la
`length` d'une chaîne ou d'une liste. Aucun prototype (`constructor`,
`__proto__`), aucune globale (`process`, `require`), aucune méthode héritée
(`name.toUpperCase()` n'est pas une fonction) : un helper est une fonction que
l'état passe, `{{ string.pascalCase(name) }}`.

Une valeur qu'un stub lit et que l'appelant n'a pas passée est une erreur qui la
nomme, pas un `{{ missing }}` qui voyage dans le fichier généré.

**La moitié Rust.** `ream-cli` rend les stubs `make:`, et il ne peut pas évaluer
les expressions du moteur sans embarquer un runtime. Il fait
la substitution lui-même pour un stub qui n'a que des placeholders — la plupart
— et confie à Node tout ce qui porte un bloc : les deux moitiés lisent la même
grammaire.

### `registerCommand(importPath)`

Insère une entrée `() => import('<importPath>'),` dans le tableau `commands: [ ... ]` de `reamrc.ts`. Bootstrappe un champ `commands: []` quand il est absent — l'insère immédiatement après le bloc `providers: [...]` existant s'il est présent, sinon avant la fermeture `})` de `defineConfig({...})`. Idempotent — les chemins déjà enregistrés sont ignorés, avec la même déduplication par guillemets simples/doubles que `addProvider`.

```typescript
await codemods.registerCommand('@community/your-plugin/commands/my-command.js')
```

Le chemin d'import doit pointer vers un module dont l'export par défaut respecte le contrat de commande de `packages/ream/src/console/types.ts` : une classe portant `commandName`, `description` et, optionnellement, `options` / `args` / `flags` en statiques. Le `ConsoleKernel` (`packages/ream/src/Ignitor.ts`) charge chaque entrée `commands[]` au démarrage de la console. Ce tableau est réservé aux commandes livrées par des paquets : les commandes de l'application, elles, sont découvertes automatiquement dans `commands/` et n'ont pas à y être déclarées — les inscrire aux deux endroits produit une erreur `E_CONSOLE_DUPLICATE_COMMAND`. Les erreurs levées par `registerCommand` utilisent le préfixe `[configure]` — les cas fichier-manquant et `defineConfig({})`-manquant portent chacun le chemin d'import dans le message afin que l'échec pointe sur la config de l'utilisateur, pas sur le code du plugin.

### `registerMiddleware(importPath, options?)`

Insère une entrée `() => import('<importPath>'),` dans le tableau `<tier>.use([ ... ])` approprié de `start/kernel.ts`. L'option `tier` choisit entre `'server'` (s'exécute sur chaque requête y compris les 404 — convient aux en-têtes de sécurité, à la propagation de request-id, à la journalisation structurée) et `'router'` (s'exécute uniquement sur les routes matchées — convient à l'authentification, au CSRF, aux concerns route-level). Par défaut `'router'`, le choix conservateur qui n'interfère pas avec les réponses 404.

L'entrée est **ajoutée en fin** de tableau par défaut (`position: 'after'`), elle s'exécute donc après les middlewares déjà présents. Passez `position: 'before'` pour la placer en tête, pour un middleware dont les autres dépendent — un store de session que lit une vérification CSRF, par exemple. Toute autre valeur lève `[configure] Invalid middleware position`.

```typescript
await codemods.registerMiddleware('@community/your-plugin/middleware/headers.js', { tier: 'server' })
await codemods.registerMiddleware('@community/your-plugin/middleware/session.js', { position: 'before' })
```

Idempotent **par tier** — appeler `registerMiddleware` deux fois avec le même importPath et le même tier produit une seule entrée. La collision cross-tier est rejetée : enregistrer le même importPath dans `server` ET `router` est presque toujours une erreur ; le second appel lève `[configure] middleware <importPath> is already registered in <other-tier> tier`.

Contrairement à `registerCommand`, cette méthode ne bootstrappe PAS un bloc `<tier>.use([])` manquant. Les appels `server.use` et `router.use` dans `start/kernel.ts` sont du code idiomatique écrit par l'utilisateur (avec leur propre boilerplate `import server from '@c9up/ream/services/server'`), pas un contrat de forme de config — les synthétiser serait piégeux si l'utilisateur a renommé des identifiants. Quand le bloc ciblé est absent, le codemod échoue avec `[configure] Could not find '<tier>.use([' in start/kernel.ts` et demande à l'utilisateur de l'ajouter à la main.

### `defineEnvValidations(definition)`

Ajoute des règles de validation à l'objet de schéma que `start/env.ts` passe à `Env.create`, pour que les variables que votre hook écrit avec `addEnvVars` soient vérifiées au démarrage comme celles de l'application. Chaque clé de `variables` est un nom de variable ; chaque valeur est le code source de la règle.

```typescript
const kept = await codemods.defineEnvValidations({
  leadingComment: 'Variables for @community/your-plugin',
  variables: {
    YOUR_PLUGIN_HOST: "Env.schema.string({ format: 'host' })",
    YOUR_PLUGIN_PORT: 'Env.schema.number()',
  },
})
```

Les règles sont ajoutées à la fin de l'objet de schéma, sous un commentaire bannière construit à partir de `leadingComment` (une simple ligne vide s'il n'y en a pas). La bannière n'est écrite que si aucune des variables n'existait déjà dans le fichier. Une variable que le schéma déclare déjà est laissée telle quelle, puisque l'utilisateur a pu durcir sa règle : la méthode renvoie les noms conservés ainsi avec une règle différente de celle demandée, pour que votre hook puisse le signaler. Passez `overwrite: true` (en général votre option `--force`) pour les remplacer.

Un nom de variable doit correspondre à `[A-Za-z_][A-Za-z0-9_]*`, une règle doit être une expression complète (crochets équilibrés, chaînes fermées, pas de virgule de premier niveau, pas de commentaire `//`) et le commentaire doit tenir sur une ligne sans `*/` ; sinon une erreur `[configure]` est levée avant que le fichier soit touché. Un `start/env.ts` absent, un fichier sans appel `Env.create(...)` ou un schéma qui n'est pas un objet littéral (une variable, un spread) lèvent aussi une erreur : ajoutez alors les règles à la main.

### `addPreloadFile(modulePath, environments?)`

Enregistre un fichier dans le tableau `preloads` de `reamrc.ts`. Un paquet dont le hook de configuration écrit un fichier `start/*.ts` en a besoin : un preload qui n'est pas listé n'est jamais chargé.

```typescript
await codemods.makeUsingStub(stubsRoot, 'start/your-plugin.stub')
await codemods.addPreloadFile('#start/your-plugin.js')
await codemods.addPreloadFile('#start/your-plugin-dev.js', ['web'])
```

L'entrée est ajoutée à la fin du tableau, créé s'il est absent. Quand `environments` liste une partie de `web`, `console`, `test` et `repl`, l'entrée est `{ file: () => import('…'), environment: [...] }` ; sans lui, ou avec les quatre, c'est un simple `() => import('…')`. Un module que le tableau importe déjà, sous l'une ou l'autre forme, est laissé tel quel. Le chemin du module ne peut contenir ni guillemet, ni barre oblique inverse, ni saut de ligne, et un environnement inconnu est refusé, tous deux avec une erreur `[configure]`. `reamrc.ts` doit exporter un appel `defineConfig({ ... })` ou un objet littéral, et un `preloads` existant doit être un tableau littéral.
