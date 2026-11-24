# rune

`@c9up/rune`: validation: fluent rule chains, object schemas with inferred types, transforms, custom and async rules, database rules, file checks, error messages and JSON Schema output, run by a native Rust engine. Guide: [Validating input](/en/guides/basics/validation/).

## Installation

```bash
pnpm add @c9up/rune
```

The native engine comes as one small package per platform, `@c9up/rune-<platform>`, for linux x64 and arm64 (glibc), macOS x64 and arm64, and Windows x64. `@c9up/rune` lists them as optional dependencies, and your package manager installs only the one that matches your machine. No Rust toolchain is needed. Do not install with optional dependencies turned off (`--no-optional`, `--omit=optional`): the engine would be left out.

A schema the engine can run is run by it or not at all: without the engine, it throws `E_RUNE_NAPI_REQUIRED`, and its message names the package to install, for example `@c9up/rune-linux-x64-gnu`. Custom rules, a translator and a messages provider run in TypeScript.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/rune` | `rune` (default export), `rules`, `schema`, `create`, `compile`, rule factories, global bindings, errors, types |
| `@c9up/rune/types` | The types only |
| `@c9up/rune/errors` | The error classes, one per code, and `RuneErrorNode` |
| `@c9up/rune/defaults` | The default message templates |
| `@c9up/rune/testing` | `runRule`, `runRuleAsync`, `fieldContext`, to test a custom rule |

## Exports

### `@c9up/rune`

| Export | Kind | Description |
|---|---|---|
| `default` | const | `rune`: every `rules` factory plus `schema`, `create`, `compile`, `createRule`, `createAsyncRule`, `group`, the `bind*` and `set*` functions, `helpers`, `validate`, `tryValidate`, `withMetaData`, and the `errorReporter`, `messagesProvider` and `convertEmptyStringsToNull` properties |
| `rules` | const | The type factories that start a chain (see below) |
| `schema` | function | `schema<S extends Record<string, RuleChain>>(fields: S, rootChain?: RuleChain): ValidationSchema<Infer<S>>` |
| `create` | function | `create<S extends Record<string, RuleChain>>(fields: S): ValidationSchema<Infer<S>>`, or `create<C extends RuleChain>(chain: C): ValidationSchema<OutputOf<C>>` |
| `compile` | function | Same as `create`; returns a `ValidationSchema` given one unchanged |
| `createRule` | function | `createRule<Options>(validator: RuleValidator<Options>, options?: CreateRuleOptions): (options: Options) => CompiledRule`; an `async` validator or `{ isAsync: true }` gives an `AsyncCompiledRule` |
| `createAsyncRule` | function | `createAsyncRule<Options>(validator: AsyncRuleValidator<Options>, options?): (options: Options) => AsyncCompiledRule` |
| `bindDatabase` | function | `bindDatabase(resolver: DatabaseResolver \| null): void`, the lookup behind `unique()` and `exists()` |
| `bindFileReader` | function | `bindFileReader(reader: FileContentReader \| null): void`, how `verifyContent` reads an upload |
| `bindHostResolver` | function | `bindHostResolver(resolver: HostResolver \| null): void`, the DNS check behind `activeUrl()` |
| `bindRosetta` | function | `bindRosetta(rosetta: { t(key, params?): string }): void`, messages from a translator |
| `setValidationTranslator` | function | `setValidationTranslator(translator?: ValidationTranslator): void` |
| `setGlobalErrorReporter` | function | `setGlobalErrorReporter(reporter: ErrorReporterFactory \| ((error: ValidationErrorNode) => void) \| null): void` |
| `setConvertEmptyStringsToNull` | function | `setConvertEmptyStringsToNull(enabled: boolean): void`; `""` then reads as absent |
| `setDateTransform` | function | `setDateTransform(fn: ((value: Date) => unknown) \| null): void`, what a validated date becomes |
| `SimpleMessagesProvider` | class | `new SimpleMessagesProvider(messages: Record<string, string>, fields?: Record<string, string>)` |
| `SimpleErrorReporter` | class | `new SimpleErrorReporter()`: collects each failure as a `ValidationErrorNode`, `{ hasErrors, errors, report(message, rule, field, meta?), createError() }`; pass `errorReporter: () => new SimpleErrorReporter()` or extend it |
| `ValidationError` | class | The validation exception under its class name: the same class as `errors.E_VALIDATION_ERROR` |
| `readHead` | function | `readHead(path: string, length?: number): Promise<Uint8Array>`, the first bytes of a file (32 by default), for content checks |
| `isNativeAvailable` | function | `isNativeAvailable(): boolean` |
| `assertNativeAvailable` | function | `assertNativeAvailable(): void`; throws `E_RUNE_NAPI_REQUIRED` |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors); the same as `@c9up/rune/errors` |

Types (also in `@c9up/rune/types`):

| Export | Kind | Description |
|---|---|---|
| `ValidationSchema` | interface | A validator (see below) |
| `RuleChain` | type | A chain of rules (see below) |
| `Infer` | type | `Infer<S>`, the output type of a shape |
| `ValidationResult` | type | `{ valid: true; errors; data: T } \| { valid: false; errors; data?: undefined }` |
| `ValidationErrorNode` | interface | `{ field, rule, message, index?, meta? }`, one failure |
| `ValidateOptions` | interface | `{ meta?, messagesProvider?, errorReporter? }` |
| `FieldContext` | interface | What a rule receives: `value`, `data`, `parent`, `field`, `meta`, `name`, `wildCardPath`, `isValid`, `isDefined`, `isArrayMember`, `isValidDataType`, `getFieldPath()`, `mutate(value)`, `report(message, rule, field, args?)` |
| `RuleValidator` | type | `(value: unknown, options: Options, field: FieldContext) => void` |
| `AsyncRuleValidator` | type | The same, returning `void \| Promise<void>` |
| `CompiledRule`, `AsyncCompiledRule` | interface | What `createRule` returns; passed to `use()` / `useAsync()` |
| `CreateRuleOptions` | interface | `{ implicit?, name?, toJSONSchema?, isAsync?, async? }` |
| `ValidationMessageParams` | type | `Record<string, string \| number \| boolean>` |
| `ValidationTranslator` | type | `(key: string, params?) => string \| undefined` |
| `MessagesProviderContract` | interface | `{ getMessage(rawMessage, rule, field: MessageFieldContext, args?): string }` |
| `MessageFieldContext` | interface | The field a message is for |
| `DatabaseResolver` | interface | `{ exists(query: DatabaseLookup): Promise<boolean> }` |
| `DatabaseLookup` | interface | `{ table, column, value, where?, whereNot?, … }` |
| `DatabaseRuleOptions` | interface | `{ table, column?, where?, whereNot? }` |
| `FileLike` | interface | `{ size, type?, content?, buffer?, extname?, clientName?, name?, … }` |
| `FileContentReader` | type | `(file: FileLike) => Uint8Array \| null \| Promise<Uint8Array \| null>` |
| `UnionNoMatchCallback` | type | `(value: unknown, field: FieldContext) => void` |
| `RecordKeysCallback` | type | `(keys: string[], field: FieldContext) => void` |
| `DateFormat` | type | `'iso8601' \| 'x' \| 'X' \| string` |
| `AlphaOptions`, `EmailOptions`, `UrlOptions`, `NormalizeEmailOptions`, `NormalizeUrlOptions` | interface | Options of `alpha()`, `email()`, `url()`, `normalizeEmail()`, `normalizeUrl()` |

`@c9up/rune/types` also exports `ConditionalBranch`, `ConditionalGroup`, `ErrorReporterContract`, `ErrorReporterFactory`, `HostResolver`, `JsonSchemaModifier`, `ParseContext`, `RuleDef`, `SchemaIntrospection`, `UnionBranch`, `MessageArgs`, `ValidationFields` and `ValidationMessages`.

### `rules`

| Factory | Signature | Starts |
|---|---|---|
| `string` | `string(): RuleChain<string>` | A string |
| `number` | `number(options?: { strict?: boolean }): RuleChain<number>` | A number; a numeric string is accepted unless `strict` |
| `boolean` | `boolean(options?: { strict?: boolean }): RuleChain<boolean>` | A boolean; `'true'`, `'false'`, `'on'`, `'off'`, `'1'`, `'0'`, `1` and `0` are accepted unless `strict` |
| `date` | `date(options?: { formats?: DateFormat[] }): RuleChain<Date>` | A date |
| `accepted` | `accepted(): RuleChain<true>` | A checked checkbox |
| `any` | `any(): RuleChain<unknown>` | Any value |
| `literal` | `literal(value: string \| number \| boolean): RuleChain<V>` | Exactly `value` |
| `enum` | `enum(values \| ((field) => values) \| nativeEnum): RuleChain` | One of the values |
| `object` | `object(shape: Record<string, RuleChain>): RuleChain<Infer<Sh>>` | An object of that shape |
| `array` | `array(item?: RuleChain): RuleChain<T[]>` | An array |
| `record` | `record(valueChain: RuleChain): RuleChain<Record<string, T>>` | An object with any keys |
| `tuple` | `tuple(items: readonly RuleChain[]): RuleChain` | A fixed-length array |
| `union` | `union(branches: readonly UnionBranch[]): RuleChain`; `union.if(predicate, chain)`, `union.else(chain)` | The first branch whose predicate is true, else the `union.else` branch, else the value is refused (`union`) |
| `unionOfTypes` | `unionOfTypes(chains: readonly RuleChain[]): RuleChain` | The branch whose type matches |
| `optional` | `optional(): RuleChain<undefined>` | Absent only |
| `null` | `null(): RuleChain<null>` | `null` only |
| `file` | `file(options?: { size?; extnames?; verifyContent? }): RuleChain<FileLike>` | An uploaded file |
| `nativeFile` | `nativeFile(options?: { minSize?; maxSize?; mimeTypes? }): RuleChain<FileLike>` | A `File` / `Blob` |

`rune.group(branches)` with `group.if(predicate, shape)` and `group.else(shape)` adds fields to an object depending on the data. When no branch applies, the object is refused (`unionGroup`). `group(...).otherwise(callback)` and `union(...).otherwise(callback)` take a `UnionNoMatchCallback` that decides instead.

### `RuleChain`

Every method returns the chain it is called on, except `optional`, `nullable`, `nullish`, `transform` and `clone`, which return a new chain and leave theirs unchanged. A validator keeps its own copy of its chains when it is built. The [Rules](/en/guides/basics/validation/rules) guide describes each method.

| Group | Methods |
|---|---|
| Presence | `optional`, `nullable`, `nullish`, `requiredWhen`, `requiredIfExists`, `requiredIfMissing`, `bail` |
| Strings | `minLength`, `maxLength`, `fixedLength`, `min`, `max`, `regex`, `email`, `url`, `activeUrl`, `alpha`, `alphaNumeric`, `ascii`, `hexCode`, `uuid`, `ulid`, `jwt`, `ipAddress`, `creditCard`, `iban`, `coordinates`, `passport`, `postalCode`, `mobile`, `vat`, `startsWith`, `endsWith`, `sameAs`, `notSameAs`, `confirmed`, `in`, `notIn` |
| Numbers | `min`, `max`, `range`, `positive`, `negative`, `nonNegative`, `nonPositive`, `decimal`, `withoutDecimals` |
| Dates | `equals`, `after`, `before`, `afterOrEqual`, `beforeOrEqual`, `afterField`, `beforeField`, `afterOrSameAs`, `beforeOrSameAs`, `weekday`, `weekend` |
| Arrays, records, objects | `minLength`, `maxLength`, `fixedLength`, `notEmpty`, `distinct`, `compact`, `validateKeys`, `allowUnknownProperties`, `denyUnknownProperties`, `merge`, `partial`, `pick`, `omit`, `toCamelCaseKeys`, `getProperties`, `getChoices`, `otherwise` |
| Files | `minSize`, `maxSize`, `mimeTypes`, `verifyContent` |
| Database | `unique(options: DatabaseRuleOptions \| callback)`, `exists(options \| callback)` |
| Before the rules | `parse` (first, on the raw input), then `trim`, `escape`, `toLowerCase`, `toUpperCase`, `toCamelCase`, `normalizeEmail`, `normalizeUrl` (after the type rule) |
| After the rules | `transform(fn)`: runs last, on the validated value of a valid payload |
| Custom rules | `use(rule: CompiledRule)`, `useAsync(rule: AsyncCompiledRule)`, `custom(name: string, validate: (value: unknown) => boolean, message?: string)` |
| Messages and schema | `message(text)`, `meta(object)`, `clone` |

### `ValidationSchema`

| Member | Signature | Description |
|---|---|---|
| `validate` | `validate(data: unknown, options?: ValidateOptions): Promise<T>` | The validated data; throws `errors.E_VALIDATION_ERROR` |
| `tryValidate` | `tryValidate(data: unknown, options?): Promise<[errors.E_VALIDATION_ERROR, null] \| [null, T]>` | Never throws on invalid data |
| `tryValidateSync` | `tryValidateSync(data: unknown, options?): [errors.E_VALIDATION_ERROR, null] \| [null, T]` | |
| `validateResult` | `validateResult(data: unknown, options?): ValidationResult<T>` | Synchronous; throws only for a schema with async rules (`E_RUNE_ASYNC_RULE_NOT_AWAITED`) |
| `validateResultAsync` | `validateResultAsync(data: unknown, options?): Promise<ValidationResult<T>>` | |
| `validateOrThrow` | `validateOrThrow(data: unknown, options?): T` | Synchronous, throws `errors.E_VALIDATION_ERROR` |
| `validateOrThrowAsync` | `validateOrThrowAsync(data: unknown, options?): Promise<T>` | |
| `fields` | `fields: Record<string, RuleChain>` | The shape the validator was built from |
| `schema` | `schema: RuleChain` | The chain the validator was built from, for `partial()`, `pick()`, `omit()`; changing it does not change the validator |
| `errorReporter` | `errorReporter: ErrorReporterFactory \| ((error) => void) \| null` | This validator's reporter |
| `messagesProvider` | `messagesProvider: MessagesProviderContract \| null` | This validator's messages; a per-call option wins |
| `toJSON` | `toJSON(): { schema: SchemaIntrospection; refs: string[] }` | Introspection |
| `toJSONSchema` | `toJSONSchema(): Record<string, unknown>` | JSON Schema of the accepted shape |
| `~standard` | Standard Schema v1 | For libraries that accept any Standard Schema |

`rune.validate({ schema, data, ...options })` and `rune.tryValidate(...)` validate once without keeping a validator. `rune.withMetaData<M>(check?)` returns `{ create, compile }` whose validators require `{ meta }`.

### `@c9up/rune/errors`

| Export | Kind | Description |
|---|---|---|
| `E_VALIDATION_ERROR` | error | `new E_VALIDATION_ERROR(messages: RuneErrorNode[], options?: ErrorOptions)`: `code` `E_VALIDATION_ERROR`, `status` 422, `messages` |
| `E_RUNE_*` | error | One class per code of the table below; an advice to fix it is on `help` |
| `RuneErrorNode` | interface | `{ message, rule, field, index?, meta? }` |

### `@c9up/rune/defaults`

| Export | Kind | Description |
|---|---|---|
| `messages` | const | `Record<string, string>`, the default template of each rule (`'array.minLength'`…), interpolated with `{{ field }}` and the rule's arguments |
| `fields` | const | `{ '': 'data' }`, the label of the root |
| `requiredMessage` | const | `'The {{ field }} field must be defined'` |

### `@c9up/rune/testing`

| Export | Kind | Description |
|---|---|---|
| `runRule` | function | `runRule(rule: CompiledRule \| AsyncCompiledRule, value: unknown, options?: FieldContextOptions): RuleRunResult` |
| `runRuleAsync` | function | `runRuleAsync(rule, value, options?): Promise<RuleRunResult>` |
| `fieldContext` | function | `fieldContext(value: unknown, options?: FieldContextOptions): FieldContext` |
| `RuleRunResult` | interface | `{ valid: boolean; errors: ValidationErrorNode[]; value: unknown }` |
| `FieldContextOptions` | interface | `{ path?, data?, parent?, … }` |

```ts
import { runRule } from '@c9up/rune/testing'

const result = runRule(isEven(), 3)
result.valid             // false
result.errors[0]?.rule   // 'isEven'
```

## Errors

| Code | Raised when |
|---|---|
| [`E_VALIDATION_ERROR`](/en/reference/errors#e-validation-error-rune) | The data is invalid (422) |
| [`E_RUNE_META_REQUIRED`](/en/reference/errors#e-rune-meta-required) | A `withMetaData()` validator was called without `{ meta }` |
| [`E_RUNE_NOT_A_REGULAR_FILE`](/en/reference/errors#e-rune-not-a-regular-file) | A `file()` value is not a regular file |
| [`E_RUNE_INVALID_SIZE`](/en/reference/errors#e-rune-invalid-size) | A file size option cannot be read |
| [`E_RUNE_INVALID_ERROR_REPORTER`](/en/reference/errors#e-rune-invalid-error-reporter) | An `errorReporter` factory did not return a reporter |
| [`E_RUNE_INVALID_RULE`](/en/reference/errors#e-rune-invalid-rule) | `use()` got something other than a compiled rule |
| [`E_RUNE_NO_RULE`](/en/reference/errors#e-rune-no-rule) | `message()` was called before any rule |
| [`E_RUNE_NOT_AN_OBJECT`](/en/reference/errors#e-rune-not-an-object) | `merge()` or another shape method was called on a chain that is not an `object()` |
| [`E_RUNE_PARTIAL_NOT_APPLICABLE`](/en/reference/errors#e-rune-partial-not-applicable) | `partial()` on a shape with groups or `allowUnknownProperties()` |
| [`E_RUNE_NO_TYPE_RULE`](/en/reference/errors#e-rune-no-type-rule) | A `unionOfTypes()` branch declares no type |
| [`E_RUNE_DUPLICATE_UNION_TYPE`](/en/reference/errors#e-rune-duplicate-union-type) | Two `unionOfTypes()` branches declare the same type |
| [`E_RUNE_ASYNC_RULE_NOT_AWAITED`](/en/reference/errors#e-rune-async-rule-not-awaited) | A synchronous method met an async rule |
| [`E_RUNE_NO_DATABASE_RESOLVER`](/en/reference/errors#e-rune-no-database-resolver) | `unique()` or `exists()` ran with no resolver bound and no callback |
| [`E_RUNE_NO_HOST_RESOLVER`](/en/reference/errors#e-rune-no-host-resolver) | `activeUrl()` ran with no host resolver bound |
| [`E_RUNE_UNSUPPORTED_LOCALE`](/en/reference/errors#e-rune-unsupported-locale) | `mobile()` has no numbering plan for the locale |
| [`E_RUNE_UNSUPPORTED_COUNTRY`](/en/reference/errors#e-rune-unsupported-country) | `postalCode()`, `passport()` or `vat()` has no pattern for the country |
| [`E_RUNE_CONFLICTING_URL_OPTIONS`](/en/reference/errors#e-rune-conflicting-url-options) | `normalizeUrl()` was given both `forceHttp` and `forceHttps` |
| [`E_RUNE_UNSUPPORTED_JSON_SCHEMA_TARGET`](/en/reference/errors#e-rune-unsupported-json-schema-target) | A JSON Schema target rune does not emit |
| [`E_RUNE_NO_OUTPUT_SCHEMA`](/en/reference/errors#e-rune-no-output-schema) | The output shape cannot be described: a transform may produce anything |
| [`E_RUNE_NAPI_REQUIRED`](/en/reference/errors#e-rune-napi-required) | The native engine is not loaded. The message names the package to install |
| [`E_RUNE_NAPI_NOT_FOUND`](/en/reference/errors#e-rune-napi-not-found) | The native engine binary is not found. The message names the package to install |
| [`E_RUNE_NAPI_REQUEST_REFUSED`](/en/reference/errors#e-rune-napi-request-refused) | The native engine refused the request. A validator does not raise it: it validates that payload in TypeScript |
| [`E_RUNE_NAPI_INVALID_RESPONSE`](/en/reference/errors#e-rune-napi-invalid-response) | The native engine answered an unexpected shape |

Each one is a class of `errors`, a flare `Exception`: read `error.code`, or test `error instanceof errors.E_VALIDATION_ERROR`.

## Migration

- `RuneValidationError` is `errors.E_VALIDATION_ERROR`, which already existed as its alias: replace `instanceof RuneValidationError` with `instanceof errors.E_VALIDATION_ERROR`. Its `name` is now `E_VALIDATION_ERROR`.
- `RuneError` is gone: each `E_RUNE_*` code is its own class. Test `error.code`, or `instanceof errors.E_RUNE_UNSUPPORTED_COUNTRY` and the like.
- `RuneNativeRequiredError` is `errors.E_RUNE_NAPI_REQUIRED`.
- The advice an error carried as `hint` is on `help`.
- The `ValidationError` interface (`{ field, rule, message, index?, meta? }`) is now `ValidationErrorNode`: `ValidationError` is the exception class, the same as `errors.E_VALIDATION_ERROR`. Replace `import type { ValidationError }` with `ValidationErrorNode` where it typed a failure node.
- `SimpleErrorReporter` is new.
- `url()` and `helpers.isURL()` now refuse a value whose scheme is not in `protocols` even when no `//` follows it: `javascript:…@host`, `myapp:host`. The host is checked as validator.js checks it: its TLD must be two letters or more (`http://example.c1` is now refused), and `http://[::1]` is now accepted. To accept another scheme, list it: `url({ protocols: ['https', 'myapp'] })`.
- `transform()` now runs after the rules, on a valid payload, instead of before them. A rule no longer judges what the callback returns: `number().max(100).transform((n) => n / 100)` now refuses `5000`. If you used `transform()` to prepare a value for the rules, use `parse()` instead: it runs before them.
- `optional()`, `nullable()` and `nullish()` now return a new chain instead of changing the one they are called on. Use what they return: write `const nickname = name.optional()`, not `name.optional()` on a line of its own.
- A validator now keeps its own copy of its chains when it is built. A rule added to a chain after `create()` or `schema()` no longer reaches that validator: build the validator after the chain is complete.
- A `union` built with `union.if()` now refuses a value when no predicate is true and there is no `union.else` branch; it no longer tries the branches whose predicate was false. A `group` with no matching branch now refuses the object with `unionGroup`. Add a `union.else(chain)` or `group.else(shape)` branch, or an `.otherwise(callback)`, to accept the other cases.
- The items of an array, the values of a record, the positions of a tuple and the properties of an object are no longer validated when the container fails one of its own rules: the errors then list the container's rule only. Call `.bail(false)` on the container to validate them anyway.
- `requiredWhen(field, '<' | '>' | '<=' | '>=', n)` now compares a numeric string as a number: the field becomes required for `"17" < 18`, as it already was for `17`.
- `decimal()` now refuses a number that JavaScript prints with an exponent (`1e-7`, `1e21`).
- On a `number()` or `boolean()` chain, `sameAs()`, `notSameAs()` and `confirmed()` now coerce the other field before comparing: `"7"` and `7` are the same value. `distinct()` does the same for the items of `array(number())`, and `distinct('id')` holds `"7"` and `7` as one value.

## See also

- [Validating input](/en/guides/basics/validation/)
- [Rules](/en/guides/basics/validation/rules)
- [Custom rules](/en/guides/basics/validation/custom-rules)
- [Async validation](/en/guides/basics/validation/async)
- [Error messages and i18n](/en/guides/basics/validation/messages)
- [JSON Schema](/en/guides/basics/validation/json-schema)
