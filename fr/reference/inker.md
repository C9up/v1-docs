# inker

`@c9up/inker` : des templates côté serveur dans des fichiers `.inker`, analysés en Rust, rendus avec échappement HTML par défaut. Guide : [Templates](/fr/guides/frontend/templates/).

## Installation

```bash
pnpm add @c9up/inker
```

Enregistrez le provider dans `reamrc.ts` (`providers: [() => import('@c9up/inker/provider')]`) ; le paquet n'a pas de hook configure. `@c9up/rosetta`, dépendance pair optionnelle, fournit le helper `t()`. L'analyseur est un binaire natif : une plateforme qui n'en a pas lève `E_INKER_NAPI_REQUIRED`.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/inker` | `Templates`, `TemplateRenderer`, `SafeString`, `Stacks`, `Processor`, `InkerError`, `errors` et les types. L'export par défaut est le registre de plugins (`plugins`). |
| `@c9up/inker/provider` | `InkerProvider` (export par défaut) et `InkerProviderConfig`. |
| `@c9up/inker/services/main` | L'`InkerRenderer` démarré (export par défaut), plus `setInker`, `getInker`, `clearInker`. Le lire avant le démarrage du provider lève une erreur. |
| `@c9up/inker/testing` | `createTestTemplates`, un moteur sur des templates en mémoire. |

## Exports

### `@c9up/inker`

| Export | Nature | Description |
|---|---|---|
| `Templates` | classe | Le moteur : disques, rendu, globales, tags, plugins, cache. |
| `TemplateRenderer` | classe | Un renderer avec son propre état partagé ; `ctx.view` en est un. |
| `SafeString` | classe | Une chaîne émise sans échappement. |
| `Stacks` | classe | Le stockage derrière `@stack`, `@pushTo` et `@pushOnceTo`. |
| `Processor` | classe | Transformations de la source (`raw`) et de la sortie (`output`) ; `templates.processor`. |
| `InkerError` | classe | L'erreur d'un template, à une position de celui-ci ; voir [`InkerError`, `errors`](#inkererror-errors). |
| `errors` | namespace | Les erreurs qu'un appel lève hors de tout template, une classe flare par code ; voir [`InkerError`, `errors`](#inkererror-errors). |
| `plugins` (aussi l'export par défaut) | const | Registre : les plugins poussés ici atteignent chaque moteur que construit le provider. |
| `TemplatesOptions` | interface | `{ root: string; cacheMode?: CacheMode; helpers?: ReadonlyMap<string, HelperFn> }`. |
| `InkerPluginFn` | type | `(templates: Templates, firstRun: boolean, options: T \| undefined) => void`. |
| `InkerPluginOptions` | interface | `{ readonly recurring?: boolean }` : exécuter le plugin avant chaque rendu, pas seulement le premier. |
| `InkerSharedRenderer` | interface | `{ render(template: string, data?: Readonly<Record<string, unknown>>): Promise<string> }`, ce que renvoie `plugins.share()`. |
| `InkerTag` | interface | Un tag personnalisé : `tagName`, `block`, `seekable`, `noNewLine?`, `compile(parser, buffer, token)`. |
| `InkerTagBuffer` | interface | `writeRaw(text)`, `outputExpression(jsExpression, filename, line, shouldEscape)`. |
| `InkerTagToken` | interface | `properties.jsArg` (la source de l'argument), `filename`, `loc`, `renderBody(locals?)`, `evaluate(expression)`. |
| `InkerTagParser` | interface | `{ readonly utils: Readonly<Record<string, never>> }`. |
| `RawProcessorValue` | interface | `{ raw: string; path?: string }`. |
| `OutputProcessorValue` | interface | `{ output: string; template?: string }`. |
| `InkerErrorCode` | type | Union des codes que porte une `InkerError`. |
| `InkerErrorPosition` | interface | `{ line: number; col: number; filename: string }`, le troisième argument de `new InkerError()`. |
| `HelperFn` | type | `(...args: readonly unknown[]) => unknown`. |
| `THelper` | type | `(key: string, params?: Record<string, unknown>) => string`. |
| `UrlHelper` | type | `(name: string, params?: Record<string, unknown>) => string`. |
| `AssetHelper` | type | `(name: string) => string`. |
| `CsrfFieldHelper`, `CsrfMetaHelper` | type | `() => SafeString`. |
| `CspNonceHelper` | type | `() => string`. |

### `Templates`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Templates(options: TemplatesOptions)` | `root` est canonicalisée et sert de frontière de confinement à tous les chemins. |
| `create` | `static create(options: TemplatesOptions): Templates` | Identique au constructeur. |
| `render` | `render(name: string, data?: Readonly<Record<string, unknown>>): Promise<string>` | Rend `<root>/<name>.inker` avec ses layouts, partials et composants. |
| `renderSync` | `renderSync(name: string, data?: Readonly<Record<string, unknown>>): string` | Pareil, de façon synchrone ; un `await` dans le template lève `E_INKER_ASYNC_NOT_SUPPORTED`. |
| `renderString` / `renderRawSync` | `renderRawSync(source: string, data?: Readonly<Record<string, unknown>>, templatePath?: string): string` | Rend une chaîne. Elle ne peut charger aucun autre template : `@layout`, `@include`, `@component` et `{{> body }}` lèvent `E_INKER_DISK_REQUIRED` ; utilisez `render`. `renderString` ne prend pas de `templatePath`. |
| `renderRaw` | `renderRaw(source: string, data?: Readonly<Record<string, unknown>>, templatePath?: string): Promise<string>` | Forme asynchrone de `renderRawSync`. |
| `compile` | `compile(name: string): void` | Analyse un template sans le rendre ; lève une `InkerError` avec son `filename`, sa `line` et sa `col` s'il ne s'analyse pas. |
| `compileRaw` | `compileRaw(source: string, templateName?: string): void` | Pareil, pour une chaîne. |
| `mount` | `mount(dir: string \| URL): void` / `mount(diskName: string, dir: string \| URL): void` | Sans nom, redirige le disque par défaut. Avec un nom, les templates s'adressent en `diskName::template`. Remonter un nom sur un autre dossier lève `E_INKER_DISK_COLLISION`. |
| `unmount` | `unmount(diskName: string): void` | Sans effet en son absence. |
| `mounted` | `get mounted(): Readonly<Record<string, string>>` | Nom de disque vers racine ; `default` est la racine en vigueur. |
| `makePath` | `makePath(name: string): string` | Le chemin absolu vers lequel résout un nom, sans toucher au disque. |
| `resolve` | `resolve(name: string): { template: string }` | La source d'un template ; un template enregistré l'emporte sur le disque. |
| `registerTemplate` | `registerTemplate(name: string, contents: { template: string }): void` | Un template en mémoire, qui l'emporte sur un fichier du même nom. Un nom déjà enregistré lève `E_INKER_TEMPLATE_COLLISION`. |
| `removeTemplate` | `removeTemplate(name: string): void` | |
| `templates` | `get templates(): Readonly<Record<string, { template: string }>>` | Les templates enregistrés. |
| `listComponents` | `listComponents(): { diskName: string; components: { componentName: string; tagName: string }[] }[]` | Chaque composant accessible comme tag : `components/form/input.inker` est `@form.input`. |
| `registerTag` | `registerTag(tag: InkerTag): void` | Enregistre `@tagName(...)`. `compile` s'exécute au rendu et peut être asynchrone ; un tag `block` lit son corps rendu avec `token.renderBody()`. Vide le cache. |
| `tags` | `get tags(): ReadonlyMap<string, InkerTag>` | |
| `global` | `global(name: string, value: unknown): void` | Une valeur présente dans chaque rendu ; les données du rendu l'emportent. |
| `globals` | `get globals(): ReadonlyMap<string, unknown>` | |
| `use` | `use<T extends InkerPluginOptions>(plugin: InkerPluginFn<T>, options?: T): this` | Met un plugin en file, exécuté juste avant le premier rendu. |
| `createRenderer` | `createRenderer(): TemplateRenderer` | |
| `onRender` | `onRender(callback: (renderer: TemplateRenderer) => void): this` | S'exécute sur chaque renderer créé. |
| `share` | `share(data: Readonly<Record<string, unknown>>): TemplateRenderer` | `createRenderer().share(data)`. |
| `processor` | `readonly processor: Processor` | `processor.process('raw', fn)` ou `processor.process('output', fn)` ; une transformation `raw` vide le cache. |
| `configure` | `configure(options: Readonly<{ cacheMode?: CacheMode }>): void` | Change le mode de cache, en vidant le cache. |
| `clearCache` | `clearCache(): void` | Oublie tous les templates analysés. |

### `TemplateRenderer`

| Membre | Signature | Description |
|---|---|---|
| `share` | `share(data: Readonly<Record<string, unknown>>): this` | Fusionne `data` dans l'état partagé, en profondeur. |
| `render` | `render(name: string, data?: Readonly<Record<string, unknown>>): Promise<string>` | |
| `renderSync` | `renderSync(name: string, data?: Readonly<Record<string, unknown>>): string` | |
| `renderString` | `renderString(source: string, data?: Readonly<Record<string, unknown>>): string` | |
| `renderRawSync` / `renderRaw` | `renderRawSync(source: string, data?: Readonly<Record<string, unknown>>, templatePath?: string): string` | `renderRaw` renvoie une `Promise<string>`. |
| `clone` | `clone(): TemplateRenderer` | Un renderer avec une copie de l'état partagé. |
| `getState` | `getState(): Record<string, unknown>` | Les globales du moteur, recouvertes par les valeurs partagées. |

### `InkerRenderer` (`@c9up/inker/services/main`)

| Membre | Signature | Description |
|---|---|---|
| `render` | `render(ctx: InkerHttpContext, name: string, data: Readonly<Record<string, unknown>>): Promise<void>` | Rend et envoie la page en `text/html; charset=utf-8`. |
| `renderToString` | `renderToString(ctx: InkerHttpContext, name: string, data: Readonly<Record<string, unknown>>): Promise<string>` | |
| `mount` / `unmount` | `mount(diskName: string, dir: string): void` | Sur le moteur partagé, pour un paquet qui livre ses propres templates. |
| `templates` | `get templates(): Templates` | Le moteur. |

### `plugins`

| Membre | Signature | Description |
|---|---|---|
| `use` | `use<T extends InkerPluginOptions>(plugin: InkerPluginFn<T>, options?: T): this` | Met un plugin en file pour chaque moteur, y compris un moteur déjà construit. |
| `share` | `share(state: Readonly<Record<string, unknown>>): InkerSharedRenderer` | Rend hors d'une requête, avec un état partagé ; lève `E_INKER_ENGINE_MISSING` avant le démarrage du provider. |
| `size` | `get size(): number` | Plugins en file. |

### `SafeString`, `Stacks`

| Membre | Signature | Description |
|---|---|---|
| constructeur de `SafeString` | `new SafeString(value: string)` | Seulement pour du balisage écrit ou échappé par vous : y envelopper une saisie utilisateur est une faille XSS. |
| `SafeString#value` | `readonly value: string` | |
| `Stacks#create` | `create(name: string, position?: InkerErrorPosition): string` | Un emplacement ; un second `@stack` du même nom lève une `InkerError` à `position`, ou `errors.E_INKER_INVALID_EXPRESSION` sans elle. |
| `Stacks#pushTo` / `pushToTop` | `pushTo(name: string, contents: string): this` | |
| `Stacks#pushOnceTo` / `pushOnceToTop` | `pushOnceTo(name: string, sourceId: string, contents: string): this` | Une fois par `sourceId`. |
| `Stacks#hasSource` | `hasSource(name: string, sourceId: string): boolean` | |
| `Stacks#fillPlaceholders` | `fillPlaceholders(contents: string): string` | |

### `InkerError`, `errors`

Une erreur à une position d'un template (il ne se parse pas, une expression échoue, un layout ou un slot est mal employé) est une `InkerError`. Une erreur qu'un appel lève hors de tout template (une racine ou un nom refusé, un provider non démarré, un helper qui reçoit un argument inutilisable) est une classe du namespace `errors`, une classe flare par code. Certains codes arrivent des deux façons, voir [Erreurs](#erreurs) : testez `error.code` pour couvrir les deux, ou `instanceof`. Une exception d'`errors` qu'un helper lève pendant un rendu parvient telle quelle à l'appelant, sans position.

| Membre | Signature | Description |
|---|---|---|
| constructeur d'`InkerError` | `new InkerError(message: string, code: InkerErrorCode, options: InkerErrorPosition, errorOptions?: ErrorOptions)` | L'erreur d'origine, s'il y en a une, est sur `cause`. |
| `#code` | `code: InkerErrorCode` | |
| `#line` / `#col` | `line: number`, `col: number` | Commencent à 1 ; 0 quand l'échec n'a pas de ligne propre. |
| `#filename` | `filename: string` | Le nom du template (`pages/home`, `admin::dashboard`), ou le libellé passé à `renderRaw` / `compileRaw` ; vide pour une source sans libellé. |
| `#stack` | `stack: string` | Sa deuxième ligne est `    at anonymous (<filename>:<line>:<col>)`, qui désigne le template. |
| `#status` | `status: number` | 500. `InkerError` étend l'`Exception` de flare : le gestionnaire d'exceptions la traite comme toute erreur de ream. |
| constructeur d'`errors.E_INKER_*` | `new errors.E_INKER_NOT_BOOTED([message], options?: ErrorOptions)` | Le même pour chaque classe du namespace : le `createError` de flare, avec `code` et `status` 500. |

### `@c9up/inker/testing`

| Export | Nature | Description |
|---|---|---|
| `createTestTemplates` | fonction | `createTestTemplates(options?: CreateTestTemplatesOptions): TestTemplates`. Templates enregistrés en mémoire, `cacheMode: 'never'`. |
| `CreateTestTemplatesOptions` | interface | `{ templates?: Readonly<Record<string, string>>; helpers?: ReadonlyMap<string, HelperFn>; globals?: Readonly<Record<string, unknown>> }`. |
| `TestTemplates` | interface | `{ engine: Templates; render(name, data?); renderString(source, data?); dispose() }`. `dispose()` supprime la racine temporaire. |

### Globales et helpers

Chaque rendu a les globales de base (`camelCase`, `pascalCase`, `snakeCase`, `dashCase`, `capitalCase`, `sentenceCase`, `dotCase`, `noCase`, `titleCase`, `truncate`, `excerpt`, `nl2br`, `pluralize`, `sentence`, `prettyBytes`, `toBytes`, `prettyMs`, `toMs`, `ordinal`, `inspect`, `html.attrs`, `html.classNames`, `html.safe`, `html.escape`, `html.jsonLd`, `js.stringify`). Le provider ajoute `app` et `qs` et les helpers `t`, `url` / `urlFor` / `route`, `signedUrlFor` / `signedRoute`, `routes`, `routesJSON`, `asset`, `config`, `csrfField`, `csrfMeta`, `cspNonce` et `formAttributes`. Voir [Helpers et tags personnalisés](/fr/guides/frontend/templates/extending).

## Configuration

`config/inker.ts`, lu par le provider :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `templatesRoot` | `string` | `<appRoot>/resources/templates` | Absolu, ou relatif à la racine de l'application. |
| `cacheMode` | `'auto' \| 'mtime' \| 'never'` | `'auto'` | `auto` vaut `never` en production, `mtime` ailleurs. Toute autre valeur lève une erreur au démarrage. |
| `assetManifest` | `Readonly<Record<string, string>>` | `<appRoot>/public/manifest.json` | Ce que résout `asset()`. |
| `additionalHelpers` | `Readonly<Record<string, HelperFn>>` | aucun | Fusionnés par-dessus les helpers du provider ; en remplacer un avertit une fois. |

| Mode de cache | Comportement |
|---|---|
| `mtime` | Consulte le fichier à chaque rendu et réanalyse quand son mtime change. |
| `never` | Ne consulte plus jamais le fichier : un template est analysé une fois et gardé jusqu'à `clearCache()`, `registerTag()` ou un processor `raw`. |

Le cache appartient à un `Templates` : deux moteurs aux racines différentes ne partagent rien.

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `InkerRenderer` (classe), `'inker'` | L'`InkerRenderer`. Le résoudre avant le démarrage du provider lève une erreur. |

`'inker'` est déclaré sur `ContainerBindings`. Le provider donne aussi à chaque contexte HTTP une `view` (`ctx.view: TemplateRenderer`), amorcée avec la requête, et met `app.usingInker` à `true`.

## Erreurs

*Classe* indique comment un code est levé : en `InkerError` (avec une position dans un template), en classe d'`errors` (par un appel, sans position), ou les deux, quand un appel comme un template peuvent échouer ainsi (`E_INKER_INVALID_PATH` : une racine passée à un appel, ou un nom qu'un template inclut).

| Code | Classe | Levée quand |
|---|---|---|
| [`E_INKER_TEMPLATE_NOT_FOUND`](/fr/reference/errors#e-inker-template-not-found) | les deux | Aucun template ne porte ce nom ; l'`ENOENT` est sur `cause`. |
| [`E_INKER_PARSE_ERROR`](/fr/reference/errors#e-inker-parse-error) | `InkerError` | Le template ne s'analyse pas. |
| [`E_INKER_UNKNOWN_IDENTIFIER`](/fr/reference/errors#e-inker-unknown-identifier) | `InkerError` | Une expression nomme ce qui n'est pas dans la portée, ou lit une propriété de `null` / `undefined`. |
| [`E_INKER_INVALID_PATH`](/fr/reference/errors#e-inker-invalid-path) | les deux | Une racine, un nom de template, un nom de disque, une définition de tag ou un plugin invalide. |
| [`E_INKER_UNCLOSED_INTERPOLATION`](/fr/reference/errors#e-inker-unclosed-interpolation) | `InkerError` | Un `{{` n'a pas de `}}` correspondant. |
| [`E_INKER_UNCLOSED_BLOCK_TAG`](/fr/reference/errors#e-inker-unclosed-block-tag) | `InkerError` | Un tag de bloc n'est pas fermé. |
| [`E_INKER_UNCLOSED_BLOCK`](/fr/reference/errors#e-inker-unclosed-block) | `InkerError` | Un bloc n'a pas de `@end`. |
| [`E_INKER_UNMATCHED_BLOCK_END`](/fr/reference/errors#e-inker-unmatched-block-end) | `InkerError` | Un `@end` ne ferme aucun bloc. |
| [`E_INKER_MISMATCHED_BLOCK_END`](/fr/reference/errors#e-inker-mismatched-block-end) | `InkerError` | Un `@end` ferme un autre bloc que celui ouvert. |
| [`E_INKER_UNKNOWN_DIRECTIVE`](/fr/reference/errors#e-inker-unknown-directive) | `InkerError` | Une directive inconnue du moteur. |
| [`E_INKER_UNKNOWN_TAG`](/fr/reference/errors#e-inker-unknown-tag) | `InkerError` | Aucun tag n'est enregistré sous ce nom. |
| [`E_INKER_INVALID_LAYOUT_POSITION`](/fr/reference/errors#e-inker-invalid-layout-position) | `InkerError` | `@layout` n'est pas la première instruction. |
| [`E_INKER_DUPLICATE_LAYOUT`](/fr/reference/errors#e-inker-duplicate-layout) | `InkerError` | Un template déclare plus d'un layout. |
| [`E_INKER_NESTED_LAYOUT_UNSUPPORTED`](/fr/reference/errors#e-inker-nested-layout-unsupported) | `InkerError` | Un layout en étend un autre. |
| [`E_INKER_LAYOUT_IN_PARTIAL`](/fr/reference/errors#e-inker-layout-in-partial) | `InkerError` | Un partial déclare un layout. |
| [`E_INKER_CIRCULAR_INCLUDE`](/fr/reference/errors#e-inker-circular-include) | `InkerError` | Des templates s'incluent en boucle. |
| [`E_INKER_MISSING_SLOT`](/fr/reference/errors#e-inker-missing-slot) | `InkerError` | Un composant exige un slot que l'appelant n'a pas rempli. |
| [`E_INKER_UNKNOWN_SLOT`](/fr/reference/errors#e-inker-unknown-slot) | `InkerError` | L'appelant remplit un slot que le composant ne déclare pas. |
| [`E_INKER_DISK_REQUIRED`](/fr/reference/errors#e-inker-disk-required) | `InkerError` | Un rendu de chaîne (`renderString`, `renderRaw`) utilise `@layout`, `@include`, `@component` ou `{{> body }}`. |
| [`E_INKER_DISK_COLLISION`](/fr/reference/errors#e-inker-disk-collision) | `errors` | Un nom de disque est remonté sur un autre dossier. |
| [`E_INKER_TEMPLATE_COLLISION`](/fr/reference/errors#e-inker-template-collision) | `errors` | `registerTemplate` a reçu un nom déjà enregistré. |
| [`E_INKER_INVALID_EXPRESSION`](/fr/reference/errors#e-inker-invalid-expression) | les deux | Une expression ne s'évalue pas, ou `SafeString` a reçu autre chose qu'une chaîne. |
| [`E_INKER_INVALID_ITERABLE`](/fr/reference/errors#e-inker-invalid-iterable) | `InkerError` | `@each` a reçu autre chose qu'un itérable. |
| [`E_INKER_HELPER_THROW`](/fr/reference/errors#e-inker-helper-throw) | les deux | Un helper a levé une erreur pendant le rendu. |
| [`E_INKER_ASYNC_NOT_SUPPORTED`](/fr/reference/errors#e-inker-async-not-supported) | `InkerError` | `await` dans un rendu synchrone. |
| [`E_INKER_RENDER_DEPTH`](/fr/reference/errors#e-inker-render-depth) | `InkerError` | Partials ou composants imbriqués trop profondément, ou un helper a fait déborder la pile. |
| [`E_INKER_DUMP_DIE`](/fr/reference/errors#e-inker-dump-die) | `InkerError` | `@dd()` a arrêté le rendu. |
| [`E_INKER_INVALID_JSON_LD`](/fr/reference/errors#e-inker-invalid-json-ld) | `errors` | `html.jsonLd` a reçu une valeur que JSON-LD ne peut pas contenir. |
| [`E_INKER_TEMPLATE_ERROR`](/fr/reference/errors#e-inker-template-error) | `InkerError` | Un template a levé une erreur lui-même. |
| [`E_INKER_ENGINE_MISSING`](/fr/reference/errors#e-inker-engine-missing) | `errors` | Le singleton `plugins` a rendu avant que le provider ait construit un moteur. |
| [`E_INKER_NAPI_REQUIRED`](/fr/reference/errors#e-inker-napi-required) | les deux | Il n'y a pas de binaire natif d'inker pour cette plateforme. |
| [`E_INKER_NOT_BOOTED`](/fr/reference/errors#e-inker-not-booted) | `errors` | Le moteur de rendu (`@c9up/inker/services/main`, ou l'`InkerRenderer` du conteneur) a servi avant l'exécution de `InkerProvider.start()` ou avant que `setInker()` en installe un. |
| [`E_INKER_INVALID_CONFIG`](/fr/reference/errors#e-inker-invalid-config) | `errors` | `config.inker` contient une valeur que le provider ne peut pas utiliser : un `cacheMode` autre que `mtime`, `never` ou `auto`, ou une entrée d'`additionalHelpers` qui n'est pas une fonction. |
| [`E_INKER_INVALID_HELPER_ARGUMENT`](/fr/reference/errors#e-inker-invalid-helper-argument) | `errors` | Un helper de vue (`t`, `url`, `route`, `signedRoute`, `config`, `formAttributes`, `asset`) a reçu un argument inutilisable : un nom ou une clé qui n'est pas une chaîne, ou des paramètres de route qui ne sont pas un objet simple de primitives finies et non nulles. |
| [`E_INKER_OUTSIDE_RENDER`](/fr/reference/errors#e-inker-outside-render) | `errors` | Un helper qui lit la requête a été appelé hors de `inker.render()`. |

## Migration

- `InkerRenderError` disparaît. Une erreur à une position d'un template est une `InkerError` (`import { InkerError } from '@c9up/inker'`), avec `code`, `line`, `col` et `filename` en propriétés : `error.context.line` devient `error.line`, `error.context.column` devient `error.col`, et `error.context.templateName` devient `error.filename`. `templatePath` et `expression` disparaissent ; un template introuvable donne son chemin dans son message.
- Une erreur qu'un appel lève hors de tout template est une classe d'`errors` (`import { errors } from '@c9up/inker'`), testée par `error instanceof errors.E_INKER_NOT_BOOTED` ou par `error.code`. Elle n'a pas de position.
- `error.code` garde toutes ses valeurs.
- Pour en construire une vous-même, `new InkerRenderError('E_INKER_PARSE_ERROR', message, { line, column, templateName })` devient `new InkerError(message, 'E_INKER_PARSE_ERROR', { line, col: column, filename: templateName })`.

## Voir aussi

- [Templates](/fr/guides/frontend/templates/)
- [Layouts et composants](/fr/guides/frontend/templates/layouts)
- [Helpers et tags personnalisés](/fr/guides/frontend/templates/extending)
- [Panneau d'administration](/fr/guides/digging-deeper/admin/) : un paquet qui monte ses propres templates.
