# inker

`@c9up/inker`: server-side templates in `.inker` files, parsed in Rust, rendered with HTML escaping by default. Guide: [Templates](/en/guides/frontend/templates/).

## Installation

```bash
pnpm add @c9up/inker
```

Register the provider in `reamrc.ts` (`providers: [() => import('@c9up/inker/provider')]`); the package has no configure hook. `@c9up/rosetta`, an optional peer dependency, supplies the `t()` helper. The parser is a native binary: a platform without one raises `E_INKER_NAPI_REQUIRED`.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/inker` | `Templates`, `TemplateRenderer`, `SafeString`, `Stacks`, `Processor`, `InkerRenderError` and the types. The default export is the plugin registrar (`plugins`). |
| `@c9up/inker/provider` | `InkerProvider` (default export) and `InkerProviderConfig`. |
| `@c9up/inker/services/main` | The booted `InkerRenderer` (default export), plus `setInker`, `getInker`, `clearInker`. Reading it before the provider has started throws. |
| `@c9up/inker/testing` | `createTestTemplates`, an engine over in-memory templates. |

## Exports

### `@c9up/inker`

| Export | Kind | Description |
|---|---|---|
| `Templates` | class | The engine: disks, rendering, globals, tags, plugins, cache. |
| `TemplateRenderer` | class | A renderer with shared state of its own; `ctx.view` is one. |
| `SafeString` | class | A string emitted without escaping. |
| `Stacks` | class | The store behind `@stack`, `@pushTo` and `@pushOnceTo`. |
| `Processor` | class | Source (`raw`) and output (`output`) transforms; `templates.processor`. |
| `InkerRenderError` | error | Every inker error, with a `code` and a `context`. |
| `plugins` (also the default export) | const | Registrar: plugins pushed here reach every engine the provider builds. |
| `TemplatesOptions` | interface | `{ root: string; cacheMode?: CacheMode; helpers?: ReadonlyMap<string, HelperFn> }`. |
| `InkerPluginFn` | type | `(templates: Templates, firstRun: boolean, options: T \| undefined) => void`. |
| `InkerPluginOptions` | interface | `{ readonly recurring?: boolean }`: run the plugin before every render, not only the first. |
| `InkerSharedRenderer` | interface | `{ render(template: string, data?: Readonly<Record<string, unknown>>): Promise<string> }`, what `plugins.share()` returns. |
| `InkerTag` | interface | A custom tag: `tagName`, `block`, `seekable`, `noNewLine?`, `compile(parser, buffer, token)`. |
| `InkerTagBuffer` | interface | `writeRaw(text)`, `outputExpression(jsExpression, filename, line, shouldEscape)`. |
| `InkerTagToken` | interface | `properties.jsArg` (the argument source), `filename`, `loc`, `renderBody(locals?)`, `evaluate(expression)`. |
| `InkerTagParser` | interface | `{ readonly utils: Readonly<Record<string, never>> }`. |
| `RawProcessorValue` | interface | `{ raw: string; path?: string }`. |
| `OutputProcessorValue` | interface | `{ output: string; template?: string }`. |
| `InkerErrorCode` | type | Union of the `E_INKER_*` codes below. |
| `InkerErrorContext` | interface | `{ templatePath?; templateName?; line?; column?; expression? }`; `line` and `column` are 1-based. |
| `HelperFn` | type | `(...args: readonly unknown[]) => unknown`. |
| `THelper` | type | `(key: string, params?: Record<string, unknown>) => string`. |
| `UrlHelper` | type | `(name: string, params?: Record<string, unknown>) => string`. |
| `AssetHelper` | type | `(name: string) => string`. |
| `CsrfFieldHelper`, `CsrfMetaHelper` | type | `() => SafeString`. |
| `CspNonceHelper` | type | `() => string`. |

### `Templates`

| Member | Signature | Description |
|---|---|---|
| constructor | `new Templates(options: TemplatesOptions)` | `root` is canonicalised and is the containment boundary of every path. |
| `create` | `static create(options: TemplatesOptions): Templates` | Same as the constructor. |
| `render` | `render(name: string, data?: Readonly<Record<string, unknown>>): Promise<string>` | Renders `<root>/<name>.inker` with its layouts, partials and components. |
| `renderSync` | `renderSync(name: string, data?: Readonly<Record<string, unknown>>): string` | Same, synchronously; an `await` in the template raises `E_INKER_ASYNC_NOT_SUPPORTED`. |
| `renderString` / `renderRawSync` | `renderRawSync(source: string, data?: Readonly<Record<string, unknown>>, templatePath?: string): string` | Renders a string. It cannot load other templates: `@layout`, `@include`, `@component` and `{{> body }}` raise `E_INKER_DISK_REQUIRED`; use `render`. `renderString` takes no `templatePath`. |
| `renderRaw` | `renderRaw(source: string, data?: Readonly<Record<string, unknown>>, templatePath?: string): Promise<string>` | Async form of `renderRawSync`. |
| `compile` | `compile(name: string): void` | Parses a template without rendering it; throws `InkerRenderError` with `line` and `column` when it does not parse. |
| `compileRaw` | `compileRaw(source: string, templateName?: string): void` | Same, for a string. |
| `mount` | `mount(dir: string \| URL): void` / `mount(diskName: string, dir: string \| URL): void` | Without a name, re-points the default disk. With one, templates are addressed as `diskName::template`. Re-mounting a name to another directory raises `E_INKER_DISK_COLLISION`. |
| `unmount` | `unmount(diskName: string): void` | No-op when absent. |
| `mounted` | `get mounted(): Readonly<Record<string, string>>` | Disk name to root; `default` is the root in force. |
| `makePath` | `makePath(name: string): string` | The absolute path a name resolves to, without touching the disk. |
| `resolve` | `resolve(name: string): { template: string }` | A template's source; a registered template wins over the disk. |
| `registerTemplate` | `registerTemplate(name: string, contents: { template: string }): void` | An in-memory template, which wins over a file of the same name. A name already registered raises `E_INKER_TEMPLATE_COLLISION`. |
| `removeTemplate` | `removeTemplate(name: string): void` | |
| `templates` | `get templates(): Readonly<Record<string, { template: string }>>` | The registered templates. |
| `listComponents` | `listComponents(): { diskName: string; components: { componentName: string; tagName: string }[] }[]` | Every component reachable as a tag: `components/form/input.inker` is `@form.input`. |
| `registerTag` | `registerTag(tag: InkerTag): void` | Registers `@tagName(...)`. `compile` runs at render time and may be async; a `block` tag reads its rendered body with `token.renderBody()`. Clears the cache. |
| `tags` | `get tags(): ReadonlyMap<string, InkerTag>` | |
| `global` | `global(name: string, value: unknown): void` | A value in every render; render data wins over it. |
| `globals` | `get globals(): ReadonlyMap<string, unknown>` | |
| `use` | `use<T extends InkerPluginOptions>(plugin: InkerPluginFn<T>, options?: T): this` | Queues a plugin, run just before the first render. |
| `createRenderer` | `createRenderer(): TemplateRenderer` | |
| `onRender` | `onRender(callback: (renderer: TemplateRenderer) => void): this` | Runs on every renderer created. |
| `share` | `share(data: Readonly<Record<string, unknown>>): TemplateRenderer` | `createRenderer().share(data)`. |
| `processor` | `readonly processor: Processor` | `processor.process('raw', fn)` or `processor.process('output', fn)`; a `raw` transform clears the cache. |
| `configure` | `configure(options: Readonly<{ cacheMode?: CacheMode }>): void` | Changes the cache mode, dropping the cache. |
| `clearCache` | `clearCache(): void` | Drops every parsed template. |

### `TemplateRenderer`

| Member | Signature | Description |
|---|---|---|
| `share` | `share(data: Readonly<Record<string, unknown>>): this` | Merges `data` into the shared state, deeply. |
| `render` | `render(name: string, data?: Readonly<Record<string, unknown>>): Promise<string>` | |
| `renderSync` | `renderSync(name: string, data?: Readonly<Record<string, unknown>>): string` | |
| `renderString` | `renderString(source: string, data?: Readonly<Record<string, unknown>>): string` | |
| `renderRawSync` / `renderRaw` | `renderRawSync(source: string, data?: Readonly<Record<string, unknown>>, templatePath?: string): string` | `renderRaw` returns a `Promise<string>`. |
| `clone` | `clone(): TemplateRenderer` | A renderer with a copy of the shared state. |
| `getState` | `getState(): Record<string, unknown>` | Engine globals with the shared values on top. |

### `InkerRenderer` (`@c9up/inker/services/main`)

| Member | Signature | Description |
|---|---|---|
| `render` | `render(ctx: InkerHttpContext, name: string, data: Readonly<Record<string, unknown>>): Promise<void>` | Renders and sends the page as `text/html; charset=utf-8`. |
| `renderToString` | `renderToString(ctx: InkerHttpContext, name: string, data: Readonly<Record<string, unknown>>): Promise<string>` | |
| `mount` / `unmount` | `mount(diskName: string, dir: string): void` | On the shared engine, for a package that ships its own templates. |
| `templates` | `get templates(): Templates` | The engine. |

### `plugins`

| Member | Signature | Description |
|---|---|---|
| `use` | `use<T extends InkerPluginOptions>(plugin: InkerPluginFn<T>, options?: T): this` | Queues a plugin for every engine, including one already built. |
| `share` | `share(state: Readonly<Record<string, unknown>>): InkerSharedRenderer` | Renders outside a request, with shared state; raises `E_INKER_ENGINE_MISSING` before the provider has started. |
| `size` | `get size(): number` | Plugins queued. |

### `SafeString`, `Stacks`, `InkerRenderError`

| Member | Signature | Description |
|---|---|---|
| `SafeString` constructor | `new SafeString(value: string)` | Only for markup you wrote or escaped: wrapping user input is an XSS. |
| `SafeString#value` | `readonly value: string` | |
| `Stacks#create` | `create(name: string, context?: InkerErrorContext): string` | A placeholder; a second `@stack` of one name throws. |
| `Stacks#pushTo` / `pushToTop` | `pushTo(name: string, contents: string): this` | |
| `Stacks#pushOnceTo` / `pushOnceToTop` | `pushOnceTo(name: string, sourceId: string, contents: string): this` | Once per `sourceId`. |
| `Stacks#hasSource` | `hasSource(name: string, sourceId: string): boolean` | |
| `Stacks#fillPlaceholders` | `fillPlaceholders(contents: string): string` | |
| `InkerRenderError` constructor | `new InkerRenderError(code: InkerErrorCode, message: string, context?: InkerErrorContext, options?: { cause?: unknown })` | |
| `InkerRenderError#code` / `#context` | `readonly code: InkerErrorCode` | The original error, when there is one, is on `cause`. |

### `@c9up/inker/testing`

| Export | Kind | Description |
|---|---|---|
| `createTestTemplates` | function | `createTestTemplates(options?: CreateTestTemplatesOptions): TestTemplates`. Templates registered in memory, `cacheMode: 'never'`. |
| `CreateTestTemplatesOptions` | interface | `{ templates?: Readonly<Record<string, string>>; helpers?: ReadonlyMap<string, HelperFn>; globals?: Readonly<Record<string, unknown>> }`. |
| `TestTemplates` | interface | `{ engine: Templates; render(name, data?); renderString(source, data?); dispose() }`. `dispose()` removes the temporary root. |

### Globals and helpers

Every render has the core globals (`camelCase`, `pascalCase`, `snakeCase`, `dashCase`, `capitalCase`, `sentenceCase`, `dotCase`, `noCase`, `titleCase`, `truncate`, `excerpt`, `nl2br`, `pluralize`, `sentence`, `prettyBytes`, `toBytes`, `prettyMs`, `toMs`, `ordinal`, `inspect`, `html.attrs`, `html.classNames`, `html.safe`, `html.escape`, `html.jsonLd`, `js.stringify`). The provider adds `app` and `qs` and the helpers `t`, `url` / `urlFor` / `route`, `signedUrlFor` / `signedRoute`, `routes`, `routesJSON`, `asset`, `config`, `csrfField`, `csrfMeta`, `cspNonce` and `formAttributes`. See [Helpers and custom tags](/en/guides/frontend/templates/extending).

## Configuration

`config/inker.ts`, read by the provider:

| Option | Type | Default | Description |
|---|---|---|---|
| `templatesRoot` | `string` | `<appRoot>/resources/templates` | Absolute, or relative to the application root. |
| `cacheMode` | `'auto' \| 'mtime' \| 'never'` | `'auto'` | `auto` is `never` in production, `mtime` elsewhere. Any other value throws at start. |
| `assetManifest` | `Readonly<Record<string, string>>` | `<appRoot>/public/manifest.json` | What `asset()` resolves against. |
| `additionalHelpers` | `Readonly<Record<string, HelperFn>>` | none | Merged over the provider's helpers; overriding one warns once. |

| Cache mode | Behaviour |
|---|---|
| `mtime` | Stats the file on every render and reparses when its mtime moves. |
| `never` | Never re-stats: a template is parsed once and kept until `clearCache()`, `registerTag()` or a `raw` processor. |

The cache belongs to one `Templates`: two engines with different roots share nothing.

## Container bindings

| Token | Resolves to |
|---|---|
| `InkerRenderer` (class), `'inker'` | The `InkerRenderer`. Resolving it before the provider has started throws. |

`'inker'` is declared on `ContainerBindings`. The provider also gives every HTTP context a `view` (`ctx.view: TemplateRenderer`), seeded with the request, and sets `app.usingInker` to `true`.

## Errors

| Code | Raised when |
|---|---|
| [`E_INKER_TEMPLATE_NOT_FOUND`](/en/reference/errors#e-inker-template-not-found) | No template has this name; the `ENOENT` is on `cause`. |
| [`E_INKER_PARSE_ERROR`](/en/reference/errors#e-inker-parse-error) | The template cannot be parsed. |
| [`E_INKER_UNKNOWN_IDENTIFIER`](/en/reference/errors#e-inker-unknown-identifier) | An expression names something not in scope, or reads a property of `null` / `undefined`. |
| [`E_INKER_INVALID_PATH`](/en/reference/errors#e-inker-invalid-path) | An invalid root, template name, disk name, tag definition or plugin. |
| [`E_INKER_UNCLOSED_INTERPOLATION`](/en/reference/errors#e-inker-unclosed-interpolation) | A `{{` has no matching `}}`. |
| [`E_INKER_UNCLOSED_BLOCK_TAG`](/en/reference/errors#e-inker-unclosed-block-tag) | A block tag is not closed. |
| [`E_INKER_UNCLOSED_BLOCK`](/en/reference/errors#e-inker-unclosed-block) | A block has no `@end`. |
| [`E_INKER_UNMATCHED_BLOCK_END`](/en/reference/errors#e-inker-unmatched-block-end) | An `@end` closes no block. |
| [`E_INKER_MISMATCHED_BLOCK_END`](/en/reference/errors#e-inker-mismatched-block-end) | An `@end` closes another block than the open one. |
| [`E_INKER_UNKNOWN_DIRECTIVE`](/en/reference/errors#e-inker-unknown-directive) | A directive the engine does not know. |
| [`E_INKER_UNKNOWN_TAG`](/en/reference/errors#e-inker-unknown-tag) | No tag is registered under this name. |
| [`E_INKER_INVALID_LAYOUT_POSITION`](/en/reference/errors#e-inker-invalid-layout-position) | `@layout` is not the first statement. |
| [`E_INKER_DUPLICATE_LAYOUT`](/en/reference/errors#e-inker-duplicate-layout) | A template declares more than one layout. |
| [`E_INKER_NESTED_LAYOUT_UNSUPPORTED`](/en/reference/errors#e-inker-nested-layout-unsupported) | A layout extends another layout. |
| [`E_INKER_LAYOUT_IN_PARTIAL`](/en/reference/errors#e-inker-layout-in-partial) | A partial declares a layout. |
| [`E_INKER_CIRCULAR_INCLUDE`](/en/reference/errors#e-inker-circular-include) | Templates include each other in a loop. |
| [`E_INKER_MISSING_SLOT`](/en/reference/errors#e-inker-missing-slot) | A component requires a slot the caller did not fill. |
| [`E_INKER_UNKNOWN_SLOT`](/en/reference/errors#e-inker-unknown-slot) | The caller fills a slot the component does not declare. |
| [`E_INKER_DISK_REQUIRED`](/en/reference/errors#e-inker-disk-required) | A string render (`renderString`, `renderRaw`) uses `@layout`, `@include`, `@component` or `{{> body }}`. |
| [`E_INKER_DISK_COLLISION`](/en/reference/errors#e-inker-disk-collision) | A disk name is mounted again on another directory. |
| [`E_INKER_TEMPLATE_COLLISION`](/en/reference/errors#e-inker-template-collision) | `registerTemplate` was given a name already registered. |
| [`E_INKER_INVALID_EXPRESSION`](/en/reference/errors#e-inker-invalid-expression) | An expression cannot be evaluated, or `SafeString` was given a non-string. |
| [`E_INKER_INVALID_ITERABLE`](/en/reference/errors#e-inker-invalid-iterable) | `@each` was given something that is not iterable. |
| [`E_INKER_HELPER_THROW`](/en/reference/errors#e-inker-helper-throw) | A helper threw during the render. |
| [`E_INKER_ASYNC_NOT_SUPPORTED`](/en/reference/errors#e-inker-async-not-supported) | `await` in a synchronous render. |
| [`E_INKER_RENDER_DEPTH`](/en/reference/errors#e-inker-render-depth) | Partials or components nested too deep, or a helper overflowed the stack. |
| [`E_INKER_DUMP_DIE`](/en/reference/errors#e-inker-dump-die) | `@dd()` stopped the render. |
| [`E_INKER_INVALID_JSON_LD`](/en/reference/errors#e-inker-invalid-json-ld) | `html.jsonLd` was given a value JSON-LD cannot hold. |
| [`E_INKER_TEMPLATE_ERROR`](/en/reference/errors#e-inker-template-error) | A template raised an error itself. |
| [`E_INKER_ENGINE_MISSING`](/en/reference/errors#e-inker-engine-missing) | The `plugins` singleton rendered before the provider built an engine. |
| [`E_INKER_NAPI_REQUIRED`](/en/reference/errors#e-inker-napi-required) | There is no native inker binary for this platform. |

## See also

- [Templates](/en/guides/frontend/templates/)
- [Layouts and components](/en/guides/frontend/templates/layouts)
- [Helpers and custom tags](/en/guides/frontend/templates/extending)
- [Admin panel](/en/guides/digging-deeper/admin/): a package that mounts its own templates.
