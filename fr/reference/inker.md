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
| `@c9up/inker` | `Templates`, `TemplateRenderer`, `SafeString`, `Stacks`, `Processor`, `InkerRenderError` et les types. L'export par défaut est le registre de plugins (`plugins`). |
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
| `InkerRenderError` | erreur | Toutes les erreurs d'inker, avec un `code` et un `context`. |
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
| `InkerErrorCode` | type | Union des codes `E_INKER_*` ci-dessous. |
| `InkerErrorContext` | interface | `{ templatePath?; templateName?; line?; column?; expression? }` ; `line` et `column` commencent à 1. |
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
| `compile` | `compile(name: string): void` | Analyse un template sans le rendre ; lève une `InkerRenderError` avec `line` et `column` s'il ne s'analyse pas. |
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

### `SafeString`, `Stacks`, `InkerRenderError`

| Membre | Signature | Description |
|---|---|---|
| constructeur de `SafeString` | `new SafeString(value: string)` | Seulement pour du balisage écrit ou échappé par vous : y envelopper une saisie utilisateur est une faille XSS. |
| `SafeString#value` | `readonly value: string` | |
| `Stacks#create` | `create(name: string, context?: InkerErrorContext): string` | Un emplacement ; un second `@stack` du même nom lève une erreur. |
| `Stacks#pushTo` / `pushToTop` | `pushTo(name: string, contents: string): this` | |
| `Stacks#pushOnceTo` / `pushOnceToTop` | `pushOnceTo(name: string, sourceId: string, contents: string): this` | Une fois par `sourceId`. |
| `Stacks#hasSource` | `hasSource(name: string, sourceId: string): boolean` | |
| `Stacks#fillPlaceholders` | `fillPlaceholders(contents: string): string` | |
| constructeur d'`InkerRenderError` | `new InkerRenderError(code: InkerErrorCode, message: string, context?: InkerErrorContext, options?: { cause?: unknown })` | |
| `InkerRenderError#code` / `#context` | `readonly code: InkerErrorCode` | L'erreur d'origine, s'il y en a une, est sur `cause`. |

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

| Code | Levée quand |
|---|---|
| [`E_INKER_TEMPLATE_NOT_FOUND`](/fr/reference/errors#e-inker-template-not-found) | Aucun template ne porte ce nom ; l'`ENOENT` est sur `cause`. |
| [`E_INKER_PARSE_ERROR`](/fr/reference/errors#e-inker-parse-error) | Le template ne s'analyse pas. |
| [`E_INKER_UNKNOWN_IDENTIFIER`](/fr/reference/errors#e-inker-unknown-identifier) | Une expression nomme ce qui n'est pas dans la portée, ou lit une propriété de `null` / `undefined`. |
| [`E_INKER_INVALID_PATH`](/fr/reference/errors#e-inker-invalid-path) | Une racine, un nom de template, un nom de disque, une définition de tag ou un plugin invalide. |
| [`E_INKER_UNCLOSED_INTERPOLATION`](/fr/reference/errors#e-inker-unclosed-interpolation) | Un `{{` n'a pas de `}}` correspondant. |
| [`E_INKER_UNCLOSED_BLOCK_TAG`](/fr/reference/errors#e-inker-unclosed-block-tag) | Un tag de bloc n'est pas fermé. |
| [`E_INKER_UNCLOSED_BLOCK`](/fr/reference/errors#e-inker-unclosed-block) | Un bloc n'a pas de `@end`. |
| [`E_INKER_UNMATCHED_BLOCK_END`](/fr/reference/errors#e-inker-unmatched-block-end) | Un `@end` ne ferme aucun bloc. |
| [`E_INKER_MISMATCHED_BLOCK_END`](/fr/reference/errors#e-inker-mismatched-block-end) | Un `@end` ferme un autre bloc que celui ouvert. |
| [`E_INKER_UNKNOWN_DIRECTIVE`](/fr/reference/errors#e-inker-unknown-directive) | Une directive inconnue du moteur. |
| [`E_INKER_UNKNOWN_TAG`](/fr/reference/errors#e-inker-unknown-tag) | Aucun tag n'est enregistré sous ce nom. |
| [`E_INKER_INVALID_LAYOUT_POSITION`](/fr/reference/errors#e-inker-invalid-layout-position) | `@layout` n'est pas la première instruction. |
| [`E_INKER_DUPLICATE_LAYOUT`](/fr/reference/errors#e-inker-duplicate-layout) | Un template déclare plus d'un layout. |
| [`E_INKER_NESTED_LAYOUT_UNSUPPORTED`](/fr/reference/errors#e-inker-nested-layout-unsupported) | Un layout en étend un autre. |
| [`E_INKER_LAYOUT_IN_PARTIAL`](/fr/reference/errors#e-inker-layout-in-partial) | Un partial déclare un layout. |
| [`E_INKER_CIRCULAR_INCLUDE`](/fr/reference/errors#e-inker-circular-include) | Des templates s'incluent en boucle. |
| [`E_INKER_MISSING_SLOT`](/fr/reference/errors#e-inker-missing-slot) | Un composant exige un slot que l'appelant n'a pas rempli. |
| [`E_INKER_UNKNOWN_SLOT`](/fr/reference/errors#e-inker-unknown-slot) | L'appelant remplit un slot que le composant ne déclare pas. |
| [`E_INKER_DISK_REQUIRED`](/fr/reference/errors#e-inker-disk-required) | Un rendu de chaîne (`renderString`, `renderRaw`) utilise `@layout`, `@include`, `@component` ou `{{> body }}`. |
| [`E_INKER_DISK_COLLISION`](/fr/reference/errors#e-inker-disk-collision) | Un nom de disque est remonté sur un autre dossier. |
| [`E_INKER_TEMPLATE_COLLISION`](/fr/reference/errors#e-inker-template-collision) | `registerTemplate` a reçu un nom déjà enregistré. |
| [`E_INKER_INVALID_EXPRESSION`](/fr/reference/errors#e-inker-invalid-expression) | Une expression ne s'évalue pas, ou `SafeString` a reçu autre chose qu'une chaîne. |
| [`E_INKER_INVALID_ITERABLE`](/fr/reference/errors#e-inker-invalid-iterable) | `@each` a reçu autre chose qu'un itérable. |
| [`E_INKER_HELPER_THROW`](/fr/reference/errors#e-inker-helper-throw) | Un helper a levé une erreur pendant le rendu. |
| [`E_INKER_ASYNC_NOT_SUPPORTED`](/fr/reference/errors#e-inker-async-not-supported) | `await` dans un rendu synchrone. |
| [`E_INKER_RENDER_DEPTH`](/fr/reference/errors#e-inker-render-depth) | Partials ou composants imbriqués trop profondément, ou un helper a fait déborder la pile. |
| [`E_INKER_DUMP_DIE`](/fr/reference/errors#e-inker-dump-die) | `@dd()` a arrêté le rendu. |
| [`E_INKER_INVALID_JSON_LD`](/fr/reference/errors#e-inker-invalid-json-ld) | `html.jsonLd` a reçu une valeur que JSON-LD ne peut pas contenir. |
| [`E_INKER_TEMPLATE_ERROR`](/fr/reference/errors#e-inker-template-error) | Un template a levé une erreur lui-même. |
| [`E_INKER_ENGINE_MISSING`](/fr/reference/errors#e-inker-engine-missing) | Le singleton `plugins` a rendu avant que le provider ait construit un moteur. |
| [`E_INKER_NAPI_REQUIRED`](/fr/reference/errors#e-inker-napi-required) | Il n'y a pas de binaire natif d'inker pour cette plateforme. |

## Voir aussi

- [Templates](/fr/guides/frontend/templates/)
- [Layouts et composants](/fr/guides/frontend/templates/layouts)
- [Helpers et tags personnalisés](/fr/guides/frontend/templates/extending)
- [Panneau d'administration](/fr/guides/digging-deeper/admin/) : un paquet qui monte ses propres templates.
