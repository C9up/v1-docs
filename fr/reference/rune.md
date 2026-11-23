# rune

`@c9up/rune` : validation : chaînes de règles fluides, schémas d'objets aux types inférés, transformations, règles personnalisées et asynchrones, règles de base de données, contrôles de fichiers, messages d'erreur et sortie JSON Schema, exécutée par un moteur Rust natif. Guide : [Valider les entrées](/fr/guides/basics/validation/).

## Installation

```bash
pnpm add @c9up/rune
```

Le paquet embarque son moteur natif. Un schéma que le moteur sait exécuter est exécuté par lui ou pas du tout (`E_RUNE_NAPI_REQUIRED`) ; les règles personnalisées, un traducteur et un fournisseur de messages tournent en TypeScript.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/rune` | `rune` (export par défaut), `rules`, `schema`, `create`, `compile`, les fabriques de règles, les liaisons globales, les erreurs, les types |
| `@c9up/rune/types` | Les types seuls |
| `@c9up/rune/errors` | Les classes d'erreur, une par code, et `RuneErrorNode` |
| `@c9up/rune/defaults` | Les modèles de messages par défaut |
| `@c9up/rune/testing` | `runRule`, `runRuleAsync`, `fieldContext`, pour tester une règle personnalisée |

## Exports

### `@c9up/rune`

| Export | Nature | Description |
|---|---|---|
| `default` | const | `rune` : chaque fabrique de `rules` plus `schema`, `create`, `compile`, `createRule`, `createAsyncRule`, `group`, les fonctions `bind*` et `set*`, `helpers`, `validate`, `tryValidate`, `withMetaData`, et les propriétés `errorReporter`, `messagesProvider` et `convertEmptyStringsToNull` |
| `rules` | const | Les fabriques de type qui commencent une chaîne (voir plus bas) |
| `schema` | fonction | `schema<S extends Record<string, RuleChain>>(fields: S, rootChain?: RuleChain): ValidationSchema<Infer<S>>` |
| `create` | fonction | `create<S extends Record<string, RuleChain>>(fields: S): ValidationSchema<Infer<S>>`, ou `create<C extends RuleChain>(chain: C): ValidationSchema<OutputOf<C>>` |
| `compile` | fonction | Comme `create` ; renvoie tel quel un `ValidationSchema` reçu |
| `createRule` | fonction | `createRule<Options>(validator: RuleValidator<Options>, options?: CreateRuleOptions): (options: Options) => CompiledRule` ; un validateur `async` ou `{ isAsync: true }` donne une `AsyncCompiledRule` |
| `createAsyncRule` | fonction | `createAsyncRule<Options>(validator: AsyncRuleValidator<Options>, options?): (options: Options) => AsyncCompiledRule` |
| `bindDatabase` | fonction | `bindDatabase(resolver: DatabaseResolver \| null): void`, la recherche derrière `unique()` et `exists()` |
| `bindFileReader` | fonction | `bindFileReader(reader: FileContentReader \| null): void`, comment `verifyContent` lit un envoi |
| `bindHostResolver` | fonction | `bindHostResolver(resolver: HostResolver \| null): void`, le contrôle DNS derrière `activeUrl()` |
| `bindRosetta` | fonction | `bindRosetta(rosetta: { t(key, params?): string }): void`, des messages tirés d'un traducteur |
| `setValidationTranslator` | fonction | `setValidationTranslator(translator?: ValidationTranslator): void` |
| `setGlobalErrorReporter` | fonction | `setGlobalErrorReporter(reporter: ErrorReporterFactory \| ((error: ValidationErrorNode) => void) \| null): void` |
| `setConvertEmptyStringsToNull` | fonction | `setConvertEmptyStringsToNull(enabled: boolean): void` ; `""` se lit alors comme absent |
| `setDateTransform` | fonction | `setDateTransform(fn: ((value: Date) => unknown) \| null): void`, ce que devient une date validée |
| `SimpleMessagesProvider` | classe | `new SimpleMessagesProvider(messages: Record<string, string>, fields?: Record<string, string>)` |
| `SimpleErrorReporter` | classe | `new SimpleErrorReporter()` : recueille chaque échec comme un `ValidationErrorNode`, `{ hasErrors, errors, report(message, rule, field, meta?), createError() }` ; passez `errorReporter: () => new SimpleErrorReporter()` ou étendez-le |
| `ValidationError` | classe | L'exception de validation sous son nom de classe : la même classe que `errors.E_VALIDATION_ERROR` |
| `readHead` | fonction | `readHead(path: string, length?: number): Promise<Uint8Array>`, les premiers octets d'un fichier (32 par défaut), pour les contrôles de contenu |
| `isNativeAvailable` | fonction | `isNativeAvailable(): boolean` |
| `assertNativeAvailable` | fonction | `assertNativeAvailable(): void` ; lève `E_RUNE_NAPI_REQUIRED` |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs) ; le même que `@c9up/rune/errors` |

Types (aussi dans `@c9up/rune/types`) :

| Export | Nature | Description |
|---|---|---|
| `ValidationSchema` | interface | Un validateur (voir plus bas) |
| `RuleChain` | type | Une chaîne de règles (voir plus bas) |
| `Infer` | type | `Infer<S>`, le type de sortie d'une forme |
| `ValidationResult` | type | `{ valid: true; errors; data: T } \| { valid: false; errors; data?: undefined }` |
| `ValidationErrorNode` | interface | `{ field, rule, message, index?, meta? }`, one failure |
| `ValidateOptions` | interface | `{ meta?, messagesProvider?, errorReporter? }` |
| `FieldContext` | interface | Ce que reçoit une règle : `value`, `data`, `parent`, `field`, `meta`, `name`, `wildCardPath`, `isValid`, `isDefined`, `isArrayMember`, `isValidDataType`, `getFieldPath()`, `mutate(value)`, `report(message, rule, field, args?)` |
| `RuleValidator` | type | `(value: unknown, options: Options, field: FieldContext) => void` |
| `AsyncRuleValidator` | type | Idem, renvoyant `void \| Promise<void>` |
| `CompiledRule`, `AsyncCompiledRule` | interface | Ce que renvoie `createRule` ; passées à `use()` / `useAsync()` |
| `CreateRuleOptions` | interface | `{ implicit?, name?, toJSONSchema?, isAsync?, async? }` |
| `ValidationMessageParams` | type | `Record<string, string \| number \| boolean>` |
| `ValidationTranslator` | type | `(key: string, params?) => string \| undefined` |
| `MessagesProviderContract` | interface | `{ getMessage(rawMessage, rule, field: MessageFieldContext, args?): string }` |
| `MessageFieldContext` | interface | Le champ auquel s'adresse un message |
| `DatabaseResolver` | interface | `{ exists(query: DatabaseLookup): Promise<boolean> }` |
| `DatabaseLookup` | interface | `{ table, column, value, where?, whereNot?, … }` |
| `DatabaseRuleOptions` | interface | `{ table, column?, where?, whereNot? }` |
| `FileLike` | interface | `{ size, type?, content?, buffer?, extname?, clientName?, name?, … }` |
| `FileContentReader` | type | `(file: FileLike) => Uint8Array \| null \| Promise<Uint8Array \| null>` |
| `UnionNoMatchCallback` | type | `(value: unknown, field: FieldContext) => void` |
| `RecordKeysCallback` | type | `(keys: string[], field: FieldContext) => void` |
| `DateFormat` | type | `'iso8601' \| 'x' \| 'X' \| string` |
| `AlphaOptions`, `EmailOptions`, `UrlOptions`, `NormalizeEmailOptions`, `NormalizeUrlOptions` | interface | Options de `alpha()`, `email()`, `url()`, `normalizeEmail()`, `normalizeUrl()` |

`@c9up/rune/types` exporte aussi `ConditionalBranch`, `ConditionalGroup`, `ErrorReporterContract`, `ErrorReporterFactory`, `HostResolver`, `JsonSchemaModifier`, `ParseContext`, `RuleDef`, `SchemaIntrospection`, `UnionBranch`, `MessageArgs`, `ValidationFields` et `ValidationMessages`.

### `rules`

| Fabrique | Signature | Commence |
|---|---|---|
| `string` | `string(): RuleChain<string>` | Une chaîne |
| `number` | `number(options?: { strict?: boolean }): RuleChain<number>` | Un nombre ; une chaîne numérique est acceptée sauf `strict` |
| `boolean` | `boolean(options?: { strict?: boolean }): RuleChain<boolean>` | Un booléen ; `'true'`, `'false'`, `'on'`, `'off'`, `'1'`, `'0'`, `1` et `0` sont acceptés sauf `strict` |
| `date` | `date(options?: { formats?: DateFormat[] }): RuleChain<Date>` | Une date |
| `accepted` | `accepted(): RuleChain<true>` | Une case cochée |
| `any` | `any(): RuleChain<unknown>` | N'importe quelle valeur |
| `literal` | `literal(value: string \| number \| boolean): RuleChain<V>` | Exactement `value` |
| `enum` | `enum(values \| ((field) => values) \| nativeEnum): RuleChain` | L'une des valeurs |
| `object` | `object(shape: Record<string, RuleChain>): RuleChain<Infer<Sh>>` | Un objet de cette forme |
| `array` | `array(item?: RuleChain): RuleChain<T[]>` | Un tableau |
| `record` | `record(valueChain: RuleChain): RuleChain<Record<string, T>>` | Un objet aux clés libres |
| `tuple` | `tuple(items: readonly RuleChain[]): RuleChain` | Un tableau de longueur fixe |
| `union` | `union(branches: readonly UnionBranch[]): RuleChain` ; `union.if(predicate, chain)`, `union.else(chain)` | La première branche qui correspond |
| `unionOfTypes` | `unionOfTypes(chains: readonly RuleChain[]): RuleChain` | La branche dont le type correspond |
| `optional` | `optional(): RuleChain<undefined>` | Absent seulement |
| `null` | `null(): RuleChain<null>` | `null` seulement |
| `file` | `file(options?: { size?; extnames?; verifyContent? }): RuleChain<FileLike>` | Un fichier envoyé |
| `nativeFile` | `nativeFile(options?: { minSize?; maxSize?; mimeTypes? }): RuleChain<FileLike>` | Un `File` / `Blob` |

`rune.group(branches)` avec `group.if(predicate, shape)` et `group.else(shape)` ajoute des champs à un objet selon les données.

### `RuleChain`

Chaque méthode renvoie la chaîne. Le guide [Règles](/fr/guides/basics/validation/rules) décrit chacune.

| Groupe | Méthodes |
|---|---|
| Présence | `optional`, `nullable`, `nullish`, `requiredWhen`, `requiredIfExists`, `requiredIfMissing`, `bail` |
| Chaînes | `minLength`, `maxLength`, `fixedLength`, `min`, `max`, `regex`, `email`, `url`, `activeUrl`, `alpha`, `alphaNumeric`, `ascii`, `hexCode`, `uuid`, `ulid`, `jwt`, `ipAddress`, `creditCard`, `iban`, `coordinates`, `passport`, `postalCode`, `mobile`, `vat`, `startsWith`, `endsWith`, `sameAs`, `notSameAs`, `confirmed`, `in`, `notIn` |
| Nombres | `min`, `max`, `range`, `positive`, `negative`, `nonNegative`, `nonPositive`, `decimal`, `withoutDecimals` |
| Dates | `equals`, `after`, `before`, `afterOrEqual`, `beforeOrEqual`, `afterField`, `beforeField`, `afterOrSameAs`, `beforeOrSameAs`, `weekday`, `weekend` |
| Tableaux, records, objets | `minLength`, `maxLength`, `fixedLength`, `notEmpty`, `distinct`, `compact`, `validateKeys`, `allowUnknownProperties`, `denyUnknownProperties`, `merge`, `partial`, `pick`, `omit`, `toCamelCaseKeys`, `getProperties`, `getChoices`, `otherwise` |
| Fichiers | `minSize`, `maxSize`, `mimeTypes`, `verifyContent` |
| Base de données | `unique(options: DatabaseRuleOptions \| callback)`, `exists(options \| callback)` |
| Transformations | `trim`, `escape`, `toLowerCase`, `toUpperCase`, `toCamelCase`, `normalizeEmail`, `normalizeUrl`, `parse`, `transform` |
| Règles personnalisées | `use(rule: CompiledRule)`, `useAsync(rule: AsyncCompiledRule)`, `custom(name: string, validate: (value: unknown) => boolean, message?: string)` |
| Messages et schéma | `message(text)`, `meta(object)`, `clone` |

### `ValidationSchema`

| Membre | Signature | Description |
|---|---|---|
| `validate` | `validate(data: unknown, options?: ValidateOptions): Promise<T>` | Les données validées ; lève `errors.E_VALIDATION_ERROR` |
| `tryValidate` | `tryValidate(data: unknown, options?): Promise<[errors.E_VALIDATION_ERROR, null] \| [null, T]>` | Ne lève jamais sur des données invalides |
| `tryValidateSync` | `tryValidateSync(data: unknown, options?): [errors.E_VALIDATION_ERROR, null] \| [null, T]` | |
| `validateResult` | `validateResult(data: unknown, options?): ValidationResult<T>` | Synchrone ; ne lève que pour un schéma à règles asynchrones (`E_RUNE_ASYNC_RULE_NOT_AWAITED`) |
| `validateResultAsync` | `validateResultAsync(data: unknown, options?): Promise<ValidationResult<T>>` | |
| `validateOrThrow` | `validateOrThrow(data: unknown, options?): T` | Synchrone, lève `errors.E_VALIDATION_ERROR` |
| `validateOrThrowAsync` | `validateOrThrowAsync(data: unknown, options?): Promise<T>` | |
| `fields` | `fields: Record<string, RuleChain>` | La forme |
| `schema` | `schema: RuleChain` | La chaîne objet, pour `partial()`, `pick()`, `omit()` |
| `errorReporter` | `errorReporter: ErrorReporterFactory \| ((error) => void) \| null` | Le rapporteur de ce validateur |
| `messagesProvider` | `messagesProvider: MessagesProviderContract \| null` | Les messages de ce validateur ; une option par appel l'emporte |
| `toJSON` | `toJSON(): { schema: SchemaIntrospection; refs: string[] }` | Introspection |
| `toJSONSchema` | `toJSONSchema(): Record<string, unknown>` | Le JSON Schema de la forme acceptée |
| `~standard` | Standard Schema v1 | Pour les bibliothèques qui acceptent tout Standard Schema |

`rune.validate({ schema, data, ...options })` et `rune.tryValidate(...)` valident une fois sans garder de validateur. `rune.withMetaData<M>(check?)` renvoie `{ create, compile }` dont les validateurs exigent `{ meta }`.

### `@c9up/rune/errors`

| Export | Nature | Description |
|---|---|---|
| `E_VALIDATION_ERROR` | erreur | `new E_VALIDATION_ERROR(messages: RuneErrorNode[], options?: ErrorOptions)` : `code` `E_VALIDATION_ERROR`, `status` 422, `messages` |
| `E_RUNE_*` | erreur | Une classe par code du tableau ci-dessous ; un conseil pour la corriger est sur `help` |
| `RuneErrorNode` | interface | `{ message, rule, field, index?, meta? }` |

### `@c9up/rune/defaults`

| Export | Nature | Description |
|---|---|---|
| `messages` | const | `Record<string, string>`, le modèle par défaut de chaque règle (`'array.minLength'`…), interpolé avec `{{ field }}` et les arguments de la règle |
| `fields` | const | `{ '': 'data' }`, le libellé de la racine |
| `requiredMessage` | const | `'The {{ field }} field must be defined'` |

### `@c9up/rune/testing`

| Export | Nature | Description |
|---|---|---|
| `runRule` | fonction | `runRule(rule: CompiledRule \| AsyncCompiledRule, value: unknown, options?: FieldContextOptions): RuleRunResult` |
| `runRuleAsync` | fonction | `runRuleAsync(rule, value, options?): Promise<RuleRunResult>` |
| `fieldContext` | fonction | `fieldContext(value: unknown, options?: FieldContextOptions): FieldContext` |
| `RuleRunResult` | interface | `{ valid: boolean; errors: ValidationErrorNode[]; value: unknown }` |
| `FieldContextOptions` | interface | `{ path?, data?, parent?, … }` |

```ts
import { runRule } from '@c9up/rune/testing'

const result = runRule(isEven(), 3)
result.valid             // false
result.errors[0]?.rule   // 'isEven'
```

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_VALIDATION_ERROR`](/fr/reference/errors#e-validation-error-rune) | Les données sont invalides (422) |
| [`E_RUNE_META_REQUIRED`](/fr/reference/errors#e-rune-meta-required) | Un validateur `withMetaData()` a été appelé sans `{ meta }` |
| [`E_RUNE_NOT_A_REGULAR_FILE`](/fr/reference/errors#e-rune-not-a-regular-file) | Une valeur `file()` n'est pas un fichier ordinaire |
| [`E_RUNE_INVALID_SIZE`](/fr/reference/errors#e-rune-invalid-size) | Une option de taille de fichier ne se lit pas |
| [`E_RUNE_INVALID_ERROR_REPORTER`](/fr/reference/errors#e-rune-invalid-error-reporter) | Une fabrique `errorReporter` n'a pas renvoyé de rapporteur |
| [`E_RUNE_INVALID_RULE`](/fr/reference/errors#e-rune-invalid-rule) | `use()` a reçu autre chose qu'une règle compilée |
| [`E_RUNE_NO_RULE`](/fr/reference/errors#e-rune-no-rule) | `message()` a été appelé avant toute règle |
| [`E_RUNE_NOT_AN_OBJECT`](/fr/reference/errors#e-rune-not-an-object) | `merge()` ou une autre méthode de forme a été appelée sur une chaîne qui n'est pas un `object()` |
| [`E_RUNE_PARTIAL_NOT_APPLICABLE`](/fr/reference/errors#e-rune-partial-not-applicable) | `partial()` sur une forme avec des groupes ou `allowUnknownProperties()` |
| [`E_RUNE_NO_TYPE_RULE`](/fr/reference/errors#e-rune-no-type-rule) | Une branche de `unionOfTypes()` ne déclare pas de type |
| [`E_RUNE_DUPLICATE_UNION_TYPE`](/fr/reference/errors#e-rune-duplicate-union-type) | Deux branches de `unionOfTypes()` déclarent le même type |
| [`E_RUNE_ASYNC_RULE_NOT_AWAITED`](/fr/reference/errors#e-rune-async-rule-not-awaited) | Une méthode synchrone a rencontré une règle asynchrone |
| [`E_RUNE_NO_DATABASE_RESOLVER`](/fr/reference/errors#e-rune-no-database-resolver) | `unique()` ou `exists()` a tourné sans résolveur lié ni callback |
| [`E_RUNE_NO_HOST_RESOLVER`](/fr/reference/errors#e-rune-no-host-resolver) | `activeUrl()` a tourné sans résolveur d'hôte lié |
| [`E_RUNE_UNSUPPORTED_LOCALE`](/fr/reference/errors#e-rune-unsupported-locale) | `mobile()` n'a pas de plan de numérotation pour la locale |
| [`E_RUNE_UNSUPPORTED_COUNTRY`](/fr/reference/errors#e-rune-unsupported-country) | `postalCode()`, `passport()` ou `vat()` n'a pas de motif pour le pays |
| [`E_RUNE_CONFLICTING_URL_OPTIONS`](/fr/reference/errors#e-rune-conflicting-url-options) | `normalizeUrl()` a reçu à la fois `forceHttp` et `forceHttps` |
| [`E_RUNE_UNSUPPORTED_JSON_SCHEMA_TARGET`](/fr/reference/errors#e-rune-unsupported-json-schema-target) | Une cible JSON Schema que rune n'émet pas |
| [`E_RUNE_NO_OUTPUT_SCHEMA`](/fr/reference/errors#e-rune-no-output-schema) | La forme de sortie ne peut être décrite : une transformation peut produire n'importe quoi |
| [`E_RUNE_NAPI_REQUIRED`](/fr/reference/errors#e-rune-napi-required) | Le moteur natif n'est pas chargé |
| [`E_RUNE_NAPI_NOT_FOUND`](/fr/reference/errors#e-rune-napi-not-found) | Le binaire du moteur natif est introuvable |
| [`E_RUNE_NAPI_REQUEST_REFUSED`](/fr/reference/errors#e-rune-napi-request-refused) | Le moteur natif a refusé la requête |
| [`E_RUNE_NAPI_INVALID_RESPONSE`](/fr/reference/errors#e-rune-napi-invalid-response) | Le moteur natif a répondu une forme inattendue |

Chacune est une classe d'`errors`, une `Exception` de flare : lisez `error.code`, ou testez `error instanceof errors.E_VALIDATION_ERROR`.

## Migration

- `RuneValidationError` devient `errors.E_VALIDATION_ERROR`, qui existait déjà comme alias : remplacez `instanceof RuneValidationError` par `instanceof errors.E_VALIDATION_ERROR`. Son `name` vaut désormais `E_VALIDATION_ERROR`.
- `RuneError` disparaît : chaque code `E_RUNE_*` a sa propre classe. Testez `error.code`, ou `instanceof errors.E_RUNE_UNSUPPORTED_COUNTRY` et consorts.
- `RuneNativeRequiredError` devient `errors.E_RUNE_NAPI_REQUIRED`.
- Le conseil qu'une erreur portait dans `hint` est sur `help`.
- L'interface `ValidationError` (`{ field, rule, message, index?, meta? }`) devient `ValidationErrorNode` : `ValidationError` est la classe d'exception, la même que `errors.E_VALIDATION_ERROR`. Remplacez `import type { ValidationError }` par `ValidationErrorNode` là où il typait un nœud d'échec.
- `SimpleErrorReporter` est nouveau.

## Voir aussi

- [Valider les entrées](/fr/guides/basics/validation/)
- [Règles](/fr/guides/basics/validation/rules)
- [Règles personnalisées](/fr/guides/basics/validation/custom-rules)
- [Validation asynchrone](/fr/guides/basics/validation/async)
- [Messages d'erreur et i18n](/fr/guides/basics/validation/messages)
- [JSON Schema](/fr/guides/basics/validation/json-schema)
