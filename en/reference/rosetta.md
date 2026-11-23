# rosetta

`@c9up/rosetta`: internationalization: translation catalogs with ICU messages, locale negotiation and fallbacks, `Intl` number, date and list formatting, request locale detection and typed translation keys. Guide: [I18n](/en/guides/digging-deeper/i18n).

## Installation

```bash
pnpm add @c9up/rosetta
```

`ream configure @c9up/rosetta` registers the provider, writes `config/i18n.ts` and `app/middleware/detect_user_locale_middleware.ts`, registers that middleware on the router and adds `resources/lang/**/*.{json,yaml,yml}` to the files the build copies. The template globals need `@c9up/inker`.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/rosetta` | `Rosetta`, `RosettaLocale`, `defineConfig`, `formatters`, `loaders`, the formatter and loader classes, catalog tools and types. In a browser build, `FileSystemLoader` throws when built |
| `@c9up/rosetta/types` | Same as `@c9up/rosetta` |
| `@c9up/rosetta/provider` | `RosettaProvider` (default export) |
| `@c9up/rosetta/i18n_provider` | Same as `@c9up/rosetta/provider`; the path `ream configure` registers |
| `@c9up/rosetta/services/main` | The application's `Rosetta` (default export) |
| `@c9up/rosetta/middleware` | `DetectUserLocaleMiddleware` (default export) |
| `@c9up/rosetta/factories` | `I18nManagerFactory`, for tests |
| `@c9up/rosetta/plugins/inker` | `inkerPluginI18n`, the template globals |
| `@c9up/rosetta/repl` | `registerReplBindings` |
| `@c9up/rosetta/configure` | `configure()`, run by `ream configure @c9up/rosetta` |

## Exports

### `@c9up/rosetta`

| Export | Kind | Description |
|---|---|---|
| `Rosetta` | class | The manager: catalogs, locales, fallbacks, formatting |
| `I18nManager` | class | Another name for `Rosetta` |
| `RosettaLocale` | class | A locale-scoped instance, as `ctx.i18n` holds it |
| `I18n` | class | Another name for `RosettaLocale` |
| `I18nMessagesProvider` | class | Validation messages read from the catalog, for `@c9up/rune` |
| `defineConfig` | function | Types `config/i18n.ts`; `defaultLocale` defaults to `'en'`, `formatter` is required |
| `formatters` | const | `formatters.icu()`, the ICU formatter factory |
| `loaders` | const | `loaders.fs({ location \| rootDir })`, the file system loader factory |
| `IcuFormatter` | class | ICU MessageFormat formatter, the default |
| `Formatter` | class | `Intl` formatting for one locale; base of `RosettaLocale` |
| `FileSystemLoader` | class | `new FileSystemLoader(options: FileSystemLoaderOptions)`, reads `json`, `yaml` and `yml` catalogs |
| `FsLoader` | class | Another name for `FileSystemLoader` |
| `extractMessageParams` | function | `extractMessageParams(message: string): MessageParam[]`, the variables of an ICU message |
| `checkCatalogs` | function | `checkCatalogs(translations: Translations, opts?: CheckCatalogsOptions): CatalogFinding[]`, compares every locale to a reference |
| `verifyCatalogs` | function | `verifyCatalogs(translations, opts?: CheckCatalogsOptions & { mode?: 'throw' \| 'warn' }): CatalogFinding[]`; `mode` defaults to `'warn'` |
| `runCatalogCheck` | function | `runCatalogCheck(translations, opts?): number`, prints the report and returns an exit code (`0` or `1`) |
| `formatCatalogFindings` | function | `formatCatalogFindings(findings: CatalogFinding[]): string` |
| `suggestKey` | function | `suggestKey(name: string, candidates: string[]): string \| undefined`, the closest key |
| `generateCatalogTypes` | function | `generateCatalogTypes(translations: Translations, opts?: GenerateCatalogTypesOptions): string`, the `TranslationKeys` augmentation for a catalog |
| `configure` | function | Same as `@c9up/rosetta/configure` |
| `registerReplBindings` | function | Same as `@c9up/rosetta/repl` |
| `stubsRoot` | const | Directory of the package's stubs (not in the browser build) |

Types:

| Export | Kind | Description |
|---|---|---|
| `RosettaOptions` | interface | Options of `new Rosetta()` (see Configuration) |
| `I18nManagerConfig` | interface | `RosettaOptions` with `defaultLocale`, `formatter: FormatterFactory` and `loaders: LoaderFactory[]` required |
| `BaseI18nConfig` | interface | `{ defaultLocale, supportedLocales?, fallbackLocales?, fallback? }` |
| `RosettaProviderConfig` | interface | `RosettaOptions & { rootDir?: string }` |
| `TranslationKeys` | interface | Empty; augment it (see `generateCatalogTypes`) and `t()` checks keys and variables |
| `TranslationKey` | type | Every string until `TranslationKeys` is augmented, then its keys |
| `ParamsFor` | type | `ParamsFor<K>`, the variables a key needs |
| `TranslationParams` | type | `Record<string, unknown>` |
| `TranslateOptions` | interface | `{ locale?, defaultValue?, fallbackLocale? }` |
| `MessageTree`, `MessageTreeList`, `MessageCatalog`, `Translations` | type | Nested catalog, list in a catalog, flat catalog (`Record<string, string>`), catalogs by locale |
| `Loader` | type | `RosettaLoader \| TranslationsLoaderContract` |
| `RosettaLoader` | interface | `{ load(locale: string): Promise<MessageTree \| MessageCatalog \| null \| undefined> }` |
| `TranslationsLoaderContract` | interface | `{ load(): Promise<Record<string, MessageTree \| MessageCatalog>>; loadAll?() }` |
| `LoaderFactory` | type | `(config: RosettaOptions) => Loader` |
| `FormatterFactory` | type | `(config: RosettaOptions) => TranslationsFormatterContract` |
| `TranslationsFormatterContract` | interface | `{ readonly name: string; format(message: string, locale: string, data?): string }` |
| `MissingTranslationHandler` | type | `(payload: MissingTranslationEventPayload) => void` |
| `MissingTranslationEventPayload` | interface | `{ locale: string; identifier: string; hasFallback: boolean }` |
| `MissingTranslationEmitter` | interface | `{ emit(event: 'i18n:missing:translation', payload): unknown }` |
| `I18nEvents` | interface | `{ 'i18n:missing:translation': MissingTranslationEventPayload }` |
| `LocaleResolverInput` | interface | `{ header?: string \| null; accepted?: string[] }` |
| `NumberFormatData` | interface | `{ decimal, group, minus, plusSign }` |
| `CurrencyFormatOptions` | type | `Intl.NumberFormatOptions` without `style`, `unit`, `unitDisplay`, with `currency: string` required |
| `DateTimeValue` | type | `Date \| number \| string \| { toJSDate(): Date } \| { toMillis(): number }` |
| `NumberFormatOptions`, `TimeFormatOptions` | type | Options of `IcuFormatter.addFormatFor` |
| `MessageParam` | interface | `{ name, kind: MessageParamKind, options? }` |
| `MessageParamKind` | type | `'text' \| 'number' \| 'date' \| 'time' \| 'plural' \| 'selectordinal' \| 'select'` |
| `ValidationFieldContext` | interface | `{ name: string \| number; wildCardPath: string }` |
| `CatalogFinding` | interface | `{ locale, key, kind, detail, suggestion? }` |
| `CatalogFindingKind` | type | `'missing-in-locale' \| 'orphan-key' \| 'param-mismatch' \| 'invalid-message'` |
| `CheckCatalogsOptions` | interface | `{ referenceLocale? }` |
| `GenerateCatalogTypesOptions` | interface | `{ referenceLocale?, moduleName? }`; `moduleName` defaults to `'@c9up/rosetta'` |
| `FileSystemLoaderOptions`, `FsLoaderOptions` | interface | `{ rootDir?: string; location?: string \| URL }` |
| `ResolvableConfig` | interface | `{ resolver(app): Promise<T> }` |
| `DefinedI18nConfig` | type | What `defineConfig` returns |
| `I18nHttpContext`, `RequestValidatorLike` | interface | Same as `@c9up/rosetta/middleware` |
| `I18nReplContext`, `I18nReplLike` | interface | Same as `@c9up/rosetta/repl` |

### `Rosetta`

`new Rosetta(options?: RosettaOptions)`, or `new Rosetta(emitter: MissingTranslationEmitter, config: I18nManagerConfig)`.

| Member | Signature | Description |
|---|---|---|
| `boot` | `boot(): Promise<void>` | Load every loader's catalogs |
| `locale` | `locale(locale?: string): RosettaLocale` | An instance for `locale` (the default locale without one) |
| `t` | `t(key: string, params?: TranslationParams, options?: TranslateOptions): string` | Translate in the current locale; a key missing everywhere gives `fallback(key, locale)`, else `translation missing: <locale>, <key>` |
| `has` | `has(key: string, locale?: string): boolean` | Whether the key resolves in the locale or its fallbacks |
| `formatRawMessage` | `formatRawMessage(message: string, locale?: string, data?: TranslationParams): string` | Format an ICU message not in a catalog |
| `loadMessages` | `loadMessages(locale: string, messages: MessageTree \| MessageCatalog): this` | Add a catalog in code; kept over the loaders on reload |
| `loadLocale` | `loadLocale(locale: string): Promise<this>` | Load one locale through the loaders |
| `loadTranslations` | `loadTranslations(): Promise<void>` | Load the catalogs once |
| `reloadTranslations` | `reloadTranslations(): Promise<void>` | Read the loaders again |
| `getTranslations` | `getTranslations(): Record<string, MessageCatalog>` | Every flattened catalog |
| `getTranslationsFor` | `getTranslationsFor(locale: string): MessageCatalog` | One locale's catalog |
| `hasCachedTranslations` | `readonly hasCachedTranslations: boolean` | Whether the catalogs were loaded |
| `setLocale` / `getLocale` | `setLocale(locale: string): this` / `getLocale(): string` | The current locale |
| `runWithLocale` | `runWithLocale<T>(locale: string, callback: () => T): T` | Run `callback` with `locale` as the current locale |
| `defaultLocale` | `readonly defaultLocale: string` | The default locale |
| `setDefaultLocale` / `getDefaultLocale` | `setDefaultLocale(locale: string): this` / `getDefaultLocale(): string` | |
| `supportedLocales` | `supportedLocales(): string[]` | The configured locales, or those inferred from the default, the fallbacks and the loaded catalogs |
| `setSupportedLocales` / `getSupportedLocales` | `setSupportedLocales(locales: string[]): this` / `getSupportedLocales(): string[] \| undefined` | The configured list only |
| `resolveLocale` | `resolveLocale(input: string \| LocaleResolverInput): string` | Negotiate a supported locale from an `Accept-Language` header or a list; always answers one |
| `getSupportedLocaleFor` | `getSupportedLocaleFor(userLanguage: string \| string[]): string \| null` | The best supported locale, or `null` |
| `getFallbackLocaleFor` | `getFallbackLocaleFor(locale: string): string` | A locale's fallback |
| `setFallbackLocale` / `getFallbackLocale` | `setFallbackLocale(locale: string): this` / `getFallbackLocale(): string` | The global fallback locale |
| `setFallbackLocales` / `getFallbackLocales` | `setFallbackLocales(locales: Record<string, string>): this` / `getFallbackLocales(): Record<string, string>` | Fallback per locale |
| `setFallback` | `setFallback(fallback: ((identifier: string, locale: string) => string) \| undefined): this` | What `t()` returns for a key missing everywhere |
| `getFallbackMessage` | `getFallbackMessage(identifier: string, locale: string): string \| undefined` | |
| `onMissingTranslation` | `onMissingTranslation(handler: MissingTranslationHandler): () => void` | Add a handler; returns the remover |
| `setOnMissingTranslation` | `setOnMissingTranslation(handler: MissingTranslationHandler \| undefined): this` | Replace the handlers |
| `getFormatter` | `getFormatter(): TranslationsFormatterContract` | The message formatter |
| `formatNumber` | `formatNumber(value: string \| number \| bigint, options?: Intl.NumberFormatOptions): string` | In the current locale |
| `formatCurrency` | `formatCurrency(value: string \| number \| bigint, options: CurrencyFormatOptions, locale?: string): string` | Also `formatCurrency(value, currency, options?, locale?)` |
| `formatDate` / `formatTime` | `formatDate(value: DateTimeValue, options?: Intl.DateTimeFormatOptions): string` | |
| `formatRelativeTime` | `formatRelativeTime(value: DateTimeValue, unit: Intl.RelativeTimeFormatUnit \| 'auto', options?): string` | |
| `formatPlural` | `formatPlural(value: number \| string, options?: Intl.PluralRulesOptions): string` | The plural category |
| `formatList` | `formatList(list: Iterable<string>, options?: Intl.ListFormatOptions): string` | |
| `formatDisplayNames` | `formatDisplayNames(code: string, options: Intl.DisplayNamesOptions): string \| undefined` | |
| `getNumberFormatData` | `getNumberFormatData(locale?: string): NumberFormatData` | Separators of a locale, through its fallbacks |
| `formatNumberString` | `formatNumberString(value: string, options?: Intl.NumberFormatOptions): string` | Format a decimal string without going through a float |
| `config` | `readonly config: RosettaOptions` | The options it was built with |

### `RosettaLocale`

`manager.locale(locale)` builds it. It has the `Formatter` methods (`formatNumber`, `formatCurrency`, `formatDate`, `formatTime`, `formatRelativeTime`, `formatPlural`, `formatList`, `formatDisplayNames`) in its locale, and:

| Member | Signature | Description |
|---|---|---|
| `t` | `t<K extends TranslationKey>(key: K, ...rest: TranslateArgs<K>): string` | Translate; `rest` is the variables, then a fallback message or `{ defaultValue }`. A declared key requires its variables |
| `formatMessage` | `formatMessage<K extends TranslationKey>(identifier: K, ...rest: TranslateArgs<K>): string` | Same as `t` |
| `formatRawMessage` | `formatRawMessage(message: string, data?: TranslationParams): string` | |
| `has` | `has(key: string): boolean` | |
| `hasMessage` / `hasFallbackMessage` | `hasMessage(identifier: string): boolean` | In this locale, or in its fallback |
| `resolveIdentifier` | `resolveIdentifier(identifier: string): { message: string; isFallback: boolean } \| null` | |
| `locale` | `readonly locale: string` | |
| `getLocale` | `getLocale(): string` | |
| `switchLocale` | `switchLocale(locale: string): void` | Change this instance's locale |
| `fallbackLocale` | `fallbackLocale: string` | |
| `localeTranslations` / `fallbackTranslations` | `readonly localeTranslations: MessageCatalog` | Catalog of the locale and of its fallback |
| `createMessagesProvider` | `createMessagesProvider(prefix?: string): I18nMessagesProvider` | Validation messages under `prefix` (default `'validator.shared'`) |
| `getNumberFormatData` | `getNumberFormatData(): NumberFormatData` | |
| `formatNumberString` | `formatNumberString(value: string, options?: Intl.NumberFormatOptions): string` | |

`I18nMessagesProvider` (`new I18nMessagesProvider(prefix: string, i18n: RosettaLocale)`) answers `getMessage(defaultMessage, rule, field, meta?)` from `<prefix>.messages.<field>.<rule>`, then `<prefix>.messages.<rule>`, else `defaultMessage`; `translateField(name)` reads `<prefix>.fields.<name>`.

`IcuFormatter.addFormatFor(type: 'number' \| 'date' \| 'time', key: string, options)` registers a named format usable in messages.

### `@c9up/rosetta/provider`

| Export | Kind | Description |
|---|---|---|
| `default` | provider | `RosettaProvider`: builds `Rosetta` from the `i18n` config, boots it, fills `@c9up/rosetta/services/main`, forwards missing translations to the `emitter` binding as `i18n:missing:translation`, installs the validator messages provider on `requestValidator`, the template globals when `@c9up/inker` is used and the `i18n` REPL binding |
| `RosettaAppContext` | interface | `{ container, config, usingInker? }` |
| `RosettaProviderConfig` | interface | `RosettaOptions & { rootDir?: string }`; `rootDir` appends a `FileSystemLoader` |

### `@c9up/rosetta/services/main`

| Export | Kind | Description |
|---|---|---|
| `default` | const | `i18n: Rosetta`, the application's manager once `RosettaProvider` booted; a member read before throws |
| `setI18n` | function | `setI18n(value: Rosetta): void`, seat a manager built outside the provider |
| `getI18n` | function | `getI18n(): Rosetta \| undefined` |
| `clearI18n` | function | `clearI18n(value?: Rosetta): void` |

### `@c9up/rosetta/middleware`

| Export | Kind | Description |
|---|---|---|
| `default` | class | `DetectUserLocaleMiddleware` |
| `I18nHttpContext` | interface | What the middleware reads and sets on the context: `request`, `i18n`, `locale`, `view`, `containerResolver` |
| `RequestValidatorLike` | interface | `{ messagesProvider?(context): I18nMessagesProvider \| undefined }` |

`new DetectUserLocaleMiddleware(manager?: Rosetta)` (the application's `Rosetta` by default). `handle(context, next)` picks the request locale from `request.language()`, the `Accept-Language` header or `request.languages()`, else the default locale; sets `ctx.i18n` and `ctx.locale`, binds `RosettaLocale` on the request container, shares `i18n` with the view, and runs `next` with that locale current. Override `getRequestLocale(context): string` to choose otherwise. `DetectUserLocaleMiddleware.messagesProvider(context)` and `registerMessagesProvider(validator)` are static.

### `@c9up/rosetta/factories`

| Export | Kind | Description |
|---|---|---|
| `I18nManagerFactory` | class | `merge(options: I18nManagerFactoryOptions): this`, `create(): Rosetta`, `createMiddleware(): DetectUserLocaleMiddleware`; defaults to `en`, ICU, catalogs in `./resources/lang` |
| `I18nManagerFactoryOptions` | interface | `{ config?: Partial<I18nManagerConfig>; emitter?: MissingTranslationEmitter }` |

### `@c9up/rosetta/plugins/inker`

| Export | Kind | Description |
|---|---|---|
| `inkerPluginI18n` | function | `inkerPluginI18n(manager: Rosetta): (engine) => void`: publishes the globals `i18n` (in the request's locale), `t`, `getDefaultLocale` and `getSupportedLocales` |

### `@c9up/rosetta/repl`

| Export | Kind | Description |
|---|---|---|
| `registerReplBindings` | function | `registerReplBindings(repl: I18nReplLike, manager: Rosetta): void`, binds `i18n` and adds a `loadI18n` method |
| `I18nReplLike` | interface | `{ addBinding?, addMethod?, server?, notify? }` |
| `I18nReplContext` | interface | `{ i18n?: Rosetta }` |

### `@c9up/rosetta/configure`

| Export | Kind | Description |
|---|---|---|
| `configure` | function | `configure(codemods): Promise<void>`: registers `@c9up/rosetta/i18n_provider`, adds the catalogs to the build, writes `config/i18n.ts` and the locale middleware, and registers it on the router |

## Configuration

`config/i18n.ts`, read under the `i18n` key. The provider refuses to build `Rosetta` without it.

```ts
import { defineConfig, formatters, loaders } from '@c9up/rosetta'

export default defineConfig({
  defaultLocale: 'en',
  supportedLocales: ['en', 'fr'],
  formatter: formatters.icu(),
  loaders: [loaders.fs({ location: new URL('../resources/lang/', import.meta.url) })],
})
```

| Option | Type | Default | Description |
|---|---|---|---|
| `defaultLocale` | `string` | `'en'` | Locale used when none is asked |
| `supportedLocales` | `string[]` | inferred | Locales the application serves; without it, the default, the fallback keys and the loaded catalogs |
| `fallbackLocale` | `string` | `defaultLocale` | Global fallback |
| `fallbackLocales` | `Record<string, string>` | `{}` | Fallback per locale (`{ 'fr-CA': 'fr' }`) |
| `messages` | `Record<string, MessageTree \| MessageCatalog>` | — | Catalogs given in code |
| `loaders` | `Array<Loader \| LoaderFactory>` | `[]` | Where catalogs come from |
| `formatter` | `TranslationsFormatterContract \| FormatterFactory` | `IcuFormatter` | Message formatter; `defineConfig` requires it |
| `onMissingTranslation` | `MissingTranslationHandler` | — | Called when a key does not resolve in the requested locale |
| `fallback` | `(identifier: string, locale: string) => string` | — | What `t()` returns for a key missing everywhere |
| `rootDir` | `string` | — | Provider only: appends a `FileSystemLoader` on this directory |

`FileSystemLoader` reads `<locale>.json|yaml|yml` and every file under `<locale>/`, whose keys are prefixed with the file's path (`resources/lang/fr/messages.json` gives `messages.*`).

## Container bindings

| Token | Resolves to |
|---|---|
| `Rosetta` (class) | The manager built from the `i18n` config |
| `'rosetta.i18n'` | The same `Rosetta` |
| `'i18n'` | The same `Rosetta` |
| `'rosetta'` | The same `Rosetta` |
| `RosettaLocale` (class, request container) | The request's `ctx.i18n`, bound by the middleware |

`'rosetta.i18n'`, `'i18n'` and `'rosetta'` are declared in `ContainerBindings`.

## Errors

Rosetta raises no coded error. A missing config, a loader without `location` or `rootDir` (`TypeError`), an unsafe catalog key or locale and a duplicate flattened key throw plain errors; `verifyCatalogs({ mode: 'throw' })` throws when the catalogs disagree.

## See also

- [I18n](/en/guides/digging-deeper/i18n)
- [Error messages and i18n](/en/guides/basics/validation/messages)
- [Decimals and money](/en/guides/digging-deeper/decimals)
