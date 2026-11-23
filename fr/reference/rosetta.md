# rosetta

`@c9up/rosetta` : internationalisation : catalogues de traduction avec messages ICU, négociation de la locale et replis, mise en forme `Intl` des nombres, dates et listes, détection de la locale de la requête et clés de traduction typées. Guide : [I18n](/fr/guides/digging-deeper/i18n).

## Installation

```bash
pnpm add @c9up/rosetta
```

`ream configure @c9up/rosetta` enregistre le provider, écrit `config/i18n.ts` et `app/middleware/detect_user_locale_middleware.ts`, enregistre ce middleware sur le routeur et ajoute `resources/lang/**/*.{json,yaml,yml}` aux fichiers que le build copie. Les globales de template demandent `@c9up/inker`.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/rosetta` | `Rosetta`, `RosettaLocale`, `defineConfig`, `formatters`, `loaders`, les classes de formateur et de chargeur, les outils de catalogue et les types. Dans un build navigateur, `FileSystemLoader` lève une erreur à la construction |
| `@c9up/rosetta/types` | Identique à `@c9up/rosetta` |
| `@c9up/rosetta/provider` | `RosettaProvider` (export par défaut) |
| `@c9up/rosetta/i18n_provider` | Identique à `@c9up/rosetta/provider` ; le chemin qu'enregistre `ream configure` |
| `@c9up/rosetta/services/main` | Le `Rosetta` de l'application (export par défaut) |
| `@c9up/rosetta/middleware` | `DetectUserLocaleMiddleware` (export par défaut) |
| `@c9up/rosetta/factories` | `I18nManagerFactory`, pour les tests |
| `@c9up/rosetta/plugins/inker` | `inkerPluginI18n`, les globales de template |
| `@c9up/rosetta/repl` | `registerReplBindings` |
| `@c9up/rosetta/configure` | `configure()`, exécuté par `ream configure @c9up/rosetta` |

## Exports

### `@c9up/rosetta`

| Export | Nature | Description |
|---|---|---|
| `Rosetta` | classe | Le gestionnaire : catalogues, locales, replis, mise en forme |
| `I18nManager` | classe | Autre nom de `Rosetta` |
| `RosettaLocale` | classe | Une instance liée à une locale, telle que la porte `ctx.i18n` |
| `I18n` | classe | Autre nom de `RosettaLocale` |
| `I18nMessagesProvider` | classe | Messages de validation lus dans le catalogue, pour `@c9up/rune` |
| `defineConfig` | fonction | Type `config/i18n.ts` ; `defaultLocale` vaut `'en'` par défaut, `formatter` est obligatoire |
| `formatters` | const | `formatters.icu()`, la fabrique du formateur ICU |
| `loaders` | const | `loaders.fs({ location \| rootDir })`, la fabrique du chargeur sur le système de fichiers |
| `IcuFormatter` | classe | Formateur ICU MessageFormat, celui par défaut |
| `Formatter` | classe | Mise en forme `Intl` pour une locale ; base de `RosettaLocale` |
| `FileSystemLoader` | classe | `new FileSystemLoader(options: FileSystemLoaderOptions)`, lit des catalogues `json`, `yaml` et `yml` |
| `FsLoader` | classe | Autre nom de `FileSystemLoader` |
| `extractMessageParams` | fonction | `extractMessageParams(message: string): MessageParam[]`, les variables d'un message ICU |
| `checkCatalogs` | fonction | `checkCatalogs(translations: Translations, opts?: CheckCatalogsOptions): CatalogFinding[]`, compare chaque locale à une référence |
| `verifyCatalogs` | fonction | `verifyCatalogs(translations, opts?: CheckCatalogsOptions & { mode?: 'throw' \| 'warn' }): CatalogFinding[]` ; `mode` vaut `'warn'` par défaut |
| `runCatalogCheck` | fonction | `runCatalogCheck(translations, opts?): number`, affiche le rapport et renvoie un code de sortie (`0` ou `1`) |
| `formatCatalogFindings` | fonction | `formatCatalogFindings(findings: CatalogFinding[]): string` |
| `suggestKey` | fonction | `suggestKey(name: string, candidates: string[]): string \| undefined`, la clé la plus proche |
| `generateCatalogTypes` | fonction | `generateCatalogTypes(translations: Translations, opts?: GenerateCatalogTypesOptions): string`, l'augmentation `TranslationKeys` d'un catalogue |
| `configure` | fonction | Identique à `@c9up/rosetta/configure` |
| `registerReplBindings` | fonction | Identique à `@c9up/rosetta/repl` |
| `stubsRoot` | const | Dossier des stubs du paquet (absent du build navigateur) |

Types :

| Export | Nature | Description |
|---|---|---|
| `RosettaOptions` | interface | Options de `new Rosetta()` (voir Configuration) |
| `I18nManagerConfig` | interface | `RosettaOptions` avec `defaultLocale`, `formatter: FormatterFactory` et `loaders: LoaderFactory[]` obligatoires |
| `BaseI18nConfig` | interface | `{ defaultLocale, supportedLocales?, fallbackLocales?, fallback? }` |
| `RosettaProviderConfig` | interface | `RosettaOptions & { rootDir?: string }` |
| `TranslationKeys` | interface | Vide ; augmentez-la (voir `generateCatalogTypes`) et `t()` vérifie clés et variables |
| `TranslationKey` | type | Toute chaîne tant que `TranslationKeys` n'est pas augmentée, puis ses clés |
| `ParamsFor` | type | `ParamsFor<K>`, les variables qu'exige une clé |
| `TranslationParams` | type | `Record<string, unknown>` |
| `TranslateOptions` | interface | `{ locale?, defaultValue?, fallbackLocale? }` |
| `MessageTree`, `MessageTreeList`, `MessageCatalog`, `Translations` | type | Catalogue imbriqué, liste dans un catalogue, catalogue à plat (`Record<string, string>`), catalogues par locale |
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
| `CurrencyFormatOptions` | type | `Intl.NumberFormatOptions` sans `style`, `unit`, `unitDisplay`, avec `currency: string` obligatoire |
| `DateTimeValue` | type | `Date \| number \| string \| { toJSDate(): Date } \| { toMillis(): number }` |
| `NumberFormatOptions`, `TimeFormatOptions` | type | Options de `IcuFormatter.addFormatFor` |
| `MessageParam` | interface | `{ name, kind: MessageParamKind, options? }` |
| `MessageParamKind` | type | `'text' \| 'number' \| 'date' \| 'time' \| 'plural' \| 'selectordinal' \| 'select'` |
| `ValidationFieldContext` | interface | `{ name: string \| number; wildCardPath: string }` |
| `CatalogFinding` | interface | `{ locale, key, kind, detail, suggestion? }` |
| `CatalogFindingKind` | type | `'missing-in-locale' \| 'orphan-key' \| 'param-mismatch' \| 'invalid-message'` |
| `CheckCatalogsOptions` | interface | `{ referenceLocale? }` |
| `GenerateCatalogTypesOptions` | interface | `{ referenceLocale?, moduleName? }` ; `moduleName` vaut `'@c9up/rosetta'` par défaut |
| `FileSystemLoaderOptions`, `FsLoaderOptions` | interface | `{ rootDir?: string; location?: string \| URL }` |
| `ResolvableConfig` | interface | `{ resolver(app): Promise<T> }` |
| `DefinedI18nConfig` | type | Ce que renvoie `defineConfig` |
| `I18nHttpContext`, `RequestValidatorLike` | interface | Identiques à `@c9up/rosetta/middleware` |
| `I18nReplContext`, `I18nReplLike` | interface | Identiques à `@c9up/rosetta/repl` |

### `Rosetta`

`new Rosetta(options?: RosettaOptions)`, ou `new Rosetta(emitter: MissingTranslationEmitter, config: I18nManagerConfig)`.

| Membre | Signature | Description |
|---|---|---|
| `boot` | `boot(): Promise<void>` | Charge les catalogues de chaque chargeur |
| `locale` | `locale(locale?: string): RosettaLocale` | Une instance pour `locale` (la locale par défaut sans argument) |
| `t` | `t(key: string, params?: TranslationParams, options?: TranslateOptions): string` | Traduit dans la locale courante ; une clé absente partout donne `fallback(key, locale)`, sinon `translation missing: <locale>, <key>` |
| `has` | `has(key: string, locale?: string): boolean` | Indique si la clé se résout dans la locale ou ses replis |
| `formatRawMessage` | `formatRawMessage(message: string, locale?: string, data?: TranslationParams): string` | Met en forme un message ICU hors catalogue |
| `loadMessages` | `loadMessages(locale: string, messages: MessageTree \| MessageCatalog): this` | Ajoute un catalogue dans le code ; conservé par-dessus les chargeurs au rechargement |
| `loadLocale` | `loadLocale(locale: string): Promise<this>` | Charge une locale via les chargeurs |
| `loadTranslations` | `loadTranslations(): Promise<void>` | Charge les catalogues une fois |
| `reloadTranslations` | `reloadTranslations(): Promise<void>` | Relit les chargeurs |
| `getTranslations` | `getTranslations(): Record<string, MessageCatalog>` | Tous les catalogues à plat |
| `getTranslationsFor` | `getTranslationsFor(locale: string): MessageCatalog` | Le catalogue d'une locale |
| `hasCachedTranslations` | `readonly hasCachedTranslations: boolean` | Indique si les catalogues ont été chargés |
| `setLocale` / `getLocale` | `setLocale(locale: string): this` / `getLocale(): string` | La locale courante |
| `runWithLocale` | `runWithLocale<T>(locale: string, callback: () => T): T` | Exécute `callback` avec `locale` comme locale courante |
| `defaultLocale` | `readonly defaultLocale: string` | La locale par défaut |
| `setDefaultLocale` / `getDefaultLocale` | `setDefaultLocale(locale: string): this` / `getDefaultLocale(): string` | |
| `supportedLocales` | `supportedLocales(): string[]` | Les locales configurées, ou celles déduites de la locale par défaut, des replis et des catalogues chargés |
| `setSupportedLocales` / `getSupportedLocales` | `setSupportedLocales(locales: string[]): this` / `getSupportedLocales(): string[] \| undefined` | La liste configurée seulement |
| `resolveLocale` | `resolveLocale(input: string \| LocaleResolverInput): string` | Négocie une locale prise en charge depuis un en-tête `Accept-Language` ou une liste ; répond toujours une locale |
| `getSupportedLocaleFor` | `getSupportedLocaleFor(userLanguage: string \| string[]): string \| null` | La meilleure locale prise en charge, ou `null` |
| `getFallbackLocaleFor` | `getFallbackLocaleFor(locale: string): string` | Le repli d'une locale |
| `setFallbackLocale` / `getFallbackLocale` | `setFallbackLocale(locale: string): this` / `getFallbackLocale(): string` | La locale de repli globale |
| `setFallbackLocales` / `getFallbackLocales` | `setFallbackLocales(locales: Record<string, string>): this` / `getFallbackLocales(): Record<string, string>` | Repli par locale |
| `setFallback` | `setFallback(fallback: ((identifier: string, locale: string) => string) \| undefined): this` | Ce que renvoie `t()` pour une clé absente partout |
| `getFallbackMessage` | `getFallbackMessage(identifier: string, locale: string): string \| undefined` | |
| `onMissingTranslation` | `onMissingTranslation(handler: MissingTranslationHandler): () => void` | Ajoute un gestionnaire ; renvoie la fonction qui le retire |
| `setOnMissingTranslation` | `setOnMissingTranslation(handler: MissingTranslationHandler \| undefined): this` | Remplace les gestionnaires |
| `getFormatter` | `getFormatter(): TranslationsFormatterContract` | Le formateur de messages |
| `formatNumber` | `formatNumber(value: string \| number \| bigint, options?: Intl.NumberFormatOptions): string` | Dans la locale courante |
| `formatCurrency` | `formatCurrency(value: string \| number \| bigint, options: CurrencyFormatOptions, locale?: string): string` | Aussi `formatCurrency(value, currency, options?, locale?)` |
| `formatDate` / `formatTime` | `formatDate(value: DateTimeValue, options?: Intl.DateTimeFormatOptions): string` | |
| `formatRelativeTime` | `formatRelativeTime(value: DateTimeValue, unit: Intl.RelativeTimeFormatUnit \| 'auto', options?): string` | |
| `formatPlural` | `formatPlural(value: number \| string, options?: Intl.PluralRulesOptions): string` | La catégorie de pluriel |
| `formatList` | `formatList(list: Iterable<string>, options?: Intl.ListFormatOptions): string` | |
| `formatDisplayNames` | `formatDisplayNames(code: string, options: Intl.DisplayNamesOptions): string \| undefined` | |
| `getNumberFormatData` | `getNumberFormatData(locale?: string): NumberFormatData` | Séparateurs d'une locale, à travers ses replis |
| `formatNumberString` | `formatNumberString(value: string, options?: Intl.NumberFormatOptions): string` | Met en forme une chaîne décimale sans passer par un flottant |
| `config` | `readonly config: RosettaOptions` | Les options de construction |

### `RosettaLocale`

`manager.locale(locale)` la construit. Elle a les méthodes de `Formatter` (`formatNumber`, `formatCurrency`, `formatDate`, `formatTime`, `formatRelativeTime`, `formatPlural`, `formatList`, `formatDisplayNames`) dans sa locale, et :

| Membre | Signature | Description |
|---|---|---|
| `t` | `t<K extends TranslationKey>(key: K, ...rest: TranslateArgs<K>): string` | Traduit ; `rest` contient les variables, puis un message de repli ou `{ defaultValue }`. Une clé déclarée exige ses variables |
| `formatMessage` | `formatMessage<K extends TranslationKey>(identifier: K, ...rest: TranslateArgs<K>): string` | Identique à `t` |
| `formatRawMessage` | `formatRawMessage(message: string, data?: TranslationParams): string` | |
| `has` | `has(key: string): boolean` | |
| `hasMessage` / `hasFallbackMessage` | `hasMessage(identifier: string): boolean` | Dans cette locale, ou dans son repli |
| `resolveIdentifier` | `resolveIdentifier(identifier: string): { message: string; isFallback: boolean } \| null` | |
| `locale` | `readonly locale: string` | |
| `getLocale` | `getLocale(): string` | |
| `switchLocale` | `switchLocale(locale: string): void` | Change la locale de cette instance |
| `fallbackLocale` | `fallbackLocale: string` | |
| `localeTranslations` / `fallbackTranslations` | `readonly localeTranslations: MessageCatalog` | Catalogue de la locale et de son repli |
| `createMessagesProvider` | `createMessagesProvider(prefix?: string): I18nMessagesProvider` | Messages de validation sous `prefix` (par défaut `'validator.shared'`) |
| `getNumberFormatData` | `getNumberFormatData(): NumberFormatData` | |
| `formatNumberString` | `formatNumberString(value: string, options?: Intl.NumberFormatOptions): string` | |

`I18nMessagesProvider` (`new I18nMessagesProvider(prefix: string, i18n: RosettaLocale)`) répond à `getMessage(defaultMessage, rule, field, meta?)` depuis `<prefix>.messages.<field>.<rule>`, puis `<prefix>.messages.<rule>`, sinon `defaultMessage` ; `translateField(name)` lit `<prefix>.fields.<name>`.

`IcuFormatter.addFormatFor(type: 'number' \| 'date' \| 'time', key: string, options)` enregistre un format nommé utilisable dans les messages.

### `@c9up/rosetta/provider`

| Export | Nature | Description |
|---|---|---|
| `default` | provider | `RosettaProvider` : construit `Rosetta` depuis la configuration `i18n`, le démarre, remplit `@c9up/rosetta/services/main`, transmet les traductions manquantes à la liaison `emitter` sous `i18n:missing:translation`, installe le fournisseur de messages de validation sur `requestValidator`, les globales de template quand `@c9up/inker` est utilisé et la liaison REPL `i18n` |
| `RosettaAppContext` | interface | `{ container, config, usingInker? }` |
| `RosettaProviderConfig` | interface | `RosettaOptions & { rootDir?: string }` ; `rootDir` ajoute un `FileSystemLoader` |

### `@c9up/rosetta/services/main`

| Export | Nature | Description |
|---|---|---|
| `default` | const | `i18n: Rosetta`, le gestionnaire de l'application une fois `RosettaProvider` démarré ; lire un membre avant lève une erreur |
| `setI18n` | fonction | `setI18n(value: Rosetta): void`, installe un gestionnaire construit hors du provider |
| `getI18n` | fonction | `getI18n(): Rosetta \| undefined` |
| `clearI18n` | fonction | `clearI18n(value?: Rosetta): void` |

### `@c9up/rosetta/middleware`

| Export | Nature | Description |
|---|---|---|
| `default` | classe | `DetectUserLocaleMiddleware` |
| `I18nHttpContext` | interface | Ce que le middleware lit et fixe sur le contexte : `request`, `i18n`, `locale`, `view`, `containerResolver` |
| `RequestValidatorLike` | interface | `{ messagesProvider?(context): I18nMessagesProvider \| undefined }` |

`new DetectUserLocaleMiddleware(manager?: Rosetta)` (le `Rosetta` de l'application par défaut). `handle(context, next)` choisit la locale de la requête depuis `request.language()`, l'en-tête `Accept-Language` ou `request.languages()`, sinon la locale par défaut ; fixe `ctx.i18n` et `ctx.locale`, lie `RosettaLocale` sur le conteneur de la requête, partage `i18n` avec la vue et exécute `next` avec cette locale courante. Surchargez `getRequestLocale(context): string` pour choisir autrement. `DetectUserLocaleMiddleware.messagesProvider(context)` et `registerMessagesProvider(validator)` sont statiques.

### `@c9up/rosetta/factories`

| Export | Nature | Description |
|---|---|---|
| `I18nManagerFactory` | classe | `merge(options: I18nManagerFactoryOptions): this`, `create(): Rosetta`, `createMiddleware(): DetectUserLocaleMiddleware` ; par défaut `en`, ICU, catalogues dans `./resources/lang` |
| `I18nManagerFactoryOptions` | interface | `{ config?: Partial<I18nManagerConfig>; emitter?: MissingTranslationEmitter }` |

### `@c9up/rosetta/plugins/inker`

| Export | Nature | Description |
|---|---|---|
| `inkerPluginI18n` | fonction | `inkerPluginI18n(manager: Rosetta): (engine) => void` : publie les globales `i18n` (dans la locale de la requête), `t`, `getDefaultLocale` et `getSupportedLocales` |

### `@c9up/rosetta/repl`

| Export | Nature | Description |
|---|---|---|
| `registerReplBindings` | fonction | `registerReplBindings(repl: I18nReplLike, manager: Rosetta): void`, lie `i18n` et ajoute une méthode `loadI18n` |
| `I18nReplLike` | interface | `{ addBinding?, addMethod?, server?, notify? }` |
| `I18nReplContext` | interface | `{ i18n?: Rosetta }` |

### `@c9up/rosetta/configure`

| Export | Nature | Description |
|---|---|---|
| `configure` | fonction | `configure(codemods): Promise<void>` : enregistre `@c9up/rosetta/i18n_provider`, ajoute les catalogues au build, écrit `config/i18n.ts` et le middleware de locale, et l'enregistre sur le routeur |

## Configuration

`config/i18n.ts`, lu sous la clé `i18n`. Le provider refuse de construire `Rosetta` sans lui.

```ts
import { defineConfig, formatters, loaders } from '@c9up/rosetta'

export default defineConfig({
  defaultLocale: 'en',
  supportedLocales: ['en', 'fr'],
  formatter: formatters.icu(),
  loaders: [loaders.fs({ location: new URL('../resources/lang/', import.meta.url) })],
})
```

| Option | Type | Défaut | Description |
|---|---|---|---|
| `defaultLocale` | `string` | `'en'` | Locale utilisée quand aucune n'est demandée |
| `supportedLocales` | `string[]` | déduites | Locales que sert l'application ; sans elle, la locale par défaut, les clés de repli et les catalogues chargés |
| `fallbackLocale` | `string` | `defaultLocale` | Repli global |
| `fallbackLocales` | `Record<string, string>` | `{}` | Repli par locale (`{ 'fr-CA': 'fr' }`) |
| `messages` | `Record<string, MessageTree \| MessageCatalog>` | — | Catalogues fournis dans le code |
| `loaders` | `Array<Loader \| LoaderFactory>` | `[]` | D'où viennent les catalogues |
| `formatter` | `TranslationsFormatterContract \| FormatterFactory` | `IcuFormatter` | Formateur de messages ; `defineConfig` l'exige |
| `onMissingTranslation` | `MissingTranslationHandler` | — | Appelé quand une clé ne se résout pas dans la locale demandée |
| `fallback` | `(identifier: string, locale: string) => string` | — | Ce que renvoie `t()` pour une clé absente partout |
| `rootDir` | `string` | — | Provider seulement : ajoute un `FileSystemLoader` sur ce dossier |

`FileSystemLoader` lit `<locale>.json|yaml|yml` et chaque fichier sous `<locale>/`, dont les clés sont préfixées par le chemin du fichier (`resources/lang/fr/messages.json` donne `messages.*`).

## Liaisons du conteneur

| Token | Résout vers |
|---|---|
| `Rosetta` (classe) | Le gestionnaire construit depuis la configuration `i18n` |
| `'rosetta.i18n'` | Le même `Rosetta` |
| `'i18n'` | Le même `Rosetta` |
| `'rosetta'` | Le même `Rosetta` |
| `RosettaLocale` (classe, conteneur de la requête) | Le `ctx.i18n` de la requête, lié par le middleware |

`'rosetta.i18n'`, `'i18n'` et `'rosetta'` sont déclarés dans `ContainerBindings`.

## Erreurs

Rosetta ne lève aucune erreur codée. Une configuration absente, un chargeur sans `location` ni `rootDir` (`TypeError`), une clé de catalogue ou une locale dangereuse et une clé à plat en double lèvent des erreurs simples ; `verifyCatalogs({ mode: 'throw' })` lève une erreur quand les catalogues divergent.

## Voir aussi

- [I18n](/fr/guides/digging-deeper/i18n)
- [Messages d'erreur et i18n](/fr/guides/basics/validation/messages)
- [Décimaux et monnaie](/fr/guides/digging-deeper/decimals)
