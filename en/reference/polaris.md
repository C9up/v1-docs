# polaris

`@c9up/polaris`: one API for language models, whatever the provider. A manager of named providers, one request and response shape for all of them, the contract a provider driver implements, and the Claude driver. Guide: [Language models](/en/guides/digging-deeper/language-models).

## Installation

```bash
pnpm add @c9up/polaris
```

Depends on `@c9up/flare`. Optional peers: `@c9up/ream` (the provider and `services/main`), and `@anthropic-ai/sdk` when you use `providers.anthropic()`.

Register the provider in `reamrc.ts`:

```ts
providers: [() => import('@c9up/polaris/provider')]
```

## Entry points

| Import | Contents |
|---|---|
| `@c9up/polaris` | `defineConfig`, `Polaris`, `PolarisClient`, `providers`, `createResponse`, the `errors` namespace and every type below. |
| `@c9up/polaris/types` | The types only. The module an application augments with `ProvidersList`. |
| `@c9up/polaris/provider` | `PolarisProvider`, the ream provider. |
| `@c9up/polaris/services/main` | The application's manager, bound at boot. |

## Configuration

`config/polaris.ts`:

```ts
import { defineConfig, type InferProviders, providers } from '@c9up/polaris'

const polarisConfig = defineConfig({
  default: 'claude',
  providers: {
    claude: providers.anthropic({ model: 'claude-opus-5-5', apiKey: env.get('ANTHROPIC_API_KEY') }),
  },
})

export default polarisConfig

declare module '@c9up/polaris/types' {
  interface ProvidersList extends InferProviders<typeof polarisConfig> {}
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `providers` | `Record<string, ProviderFactory>` | required | The providers, by name. At least one. |
| `default` | a key of `providers` | none | The provider `use()` returns when given no name. |
| `timeout` | `number` | `600000` | Deadline of one call in ms, streams included. At most `2147483647`. |
| `maxResponseBytes` | `number` | `33554432` (32 MiB) | Largest response body read from a provider, counted on the bytes received. |
| `fetch` | `Transport` | the global `fetch` | What every provider call goes through. |

## Exports

### `@c9up/polaris`

| Export | Kind | Description |
|---|---|---|
| `defineConfig` | function | `defineConfig(config: PolarisConfig<K>): PolarisConfig<K>`. Returns the config as it is, typed so `default` must name a provider. |
| `Polaris` | class | The provider manager. See below. |
| `PolarisClient` | class | One configured provider, as `use()` returns it. See below. |
| `providers` | object | One factory helper per shipped driver: `providers.anthropic(config)`. |
| `createResponse` | function | `createResponse(input: ResponseInput): ChatResponse`. Builds a response from its content: `text` and `toolCalls` are derived, missing usage counts are 0. For driver authors. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors). Each is a flare `Exception` with a string `code`. |
| `PolarisService` | type | `Polaris<DeclaredProviders>`: the manager typed by `ProvidersList`. |
| `DeclaredProviders` | type | The providers declared in `ProvidersList`. |
| `CallOptions` | interface | `{ signal?: AbortSignal; apiKey?: string; timeout?: number }`. |
| `AnthropicConfig` | interface | The options of `providers.anthropic()`, see [Claude driver](#claude-driver). |

### `Polaris`

| Member | Signature | Description |
|---|---|---|
| constructor | `new Polaris(config: PolarisConfig<K>)` | Checks the config; throws `E_POLARIS_INVALID_CONFIG`. |
| `use` | `use(name?: keyof K): PolarisClient` | The provider declared under `name`, or the default one. Built on first use, then the same instance. |
| `chat` | `chat(request: ChatRequest, options?: CallOptions): Promise<ChatResponse>` | `use().chat()`. |
| `stream` | `stream(request: ChatRequest, options?: CallOptions): AsyncGenerator<StreamEvent>` | `use().stream()`. |
| `embed` | `embed(request: EmbedRequest, options?: CallOptions): Promise<EmbedResponse>` | `use().embed()`. |

### `PolarisClient`

| Member | Signature | Description |
|---|---|---|
| `name` | `readonly name: string` | The name in the config. |
| `provider` | `readonly provider: string` | The provider behind it, as its driver names itself (`anthropic`). |
| `features` | `{ tools; structuredOutput; images; streaming; embeddings }` | What the provider supports, each a `boolean`. |
| `chat` | `chat(request: ChatRequest, options?: CallOptions): Promise<ChatResponse>` | Sends the request and waits for the whole reply. |
| `stream` | `stream(request: ChatRequest, options?: CallOptions): AsyncGenerator<StreamEvent>` | The reply as it is written, ending with one `done` event. Leaving the loop early cancels the provider request. |
| `embed` | `embed(request: EmbedRequest, options?: CallOptions): Promise<EmbedResponse>` | One vector per input, in input order. |

Before anything is sent, a request is checked: it needs at least one message, a positive integer `maxTokens`, and tools with distinct names. Tools, structured output, images, streaming and embeddings are refused with `E_POLARIS_UNSUPPORTED` when the provider does not support them. A per-call `apiKey` must be at least 8 characters, without surrounding spaces.

### Requests and responses

| Type | Shape |
|---|---|
| `ChatRequest` | `{ messages: Message[]; model?: string; system?: string; maxTokens?: number; tools?: ToolDefinition[]; toolChoice?: 'auto' \| 'none'; output?: OutputFormat; stopSequences?: string[]; effort?: Effort; providerOptions?: { [provider: string]: unknown } }` |
| `Message` | `UserMessage \| AssistantMessage`. `content` is a string or an array of parts. |
| `UserMessage` | `{ role: 'user'; content: string \| (TextPart \| ImagePart \| ToolResultPart)[] }` |
| `AssistantMessage` | `{ role: 'assistant'; content: string \| (TextPart \| ReasoningPart \| ToolCallPart \| ProviderPart)[] }` |
| `TextPart` | `{ type: 'text'; text: string; origin?: Origin }` |
| `ImagePart` | `{ type: 'image'; mediaType: 'image/png' \| 'image/jpeg' \| 'image/gif' \| 'image/webp'; data: string }`. `data` is base64, without a `data:` prefix. |
| `ReasoningPart` | `{ type: 'reasoning'; text: string; origin?: Origin }`. `text` may be empty. |
| `ToolCallPart` | `{ type: 'tool_call'; id: string; name: string; input: unknown; origin?: Origin }`. `input` is parsed JSON, not validated. |
| `ToolResultPart` | `{ type: 'tool_result'; toolCallId: string; content: string; isError?: boolean }` |
| `ProviderPart` | `{ type: 'provider'; origin: Origin }`. A block with no neutral equivalent, such as a server-side tool's result. |
| `Origin` | `{ provider: string; block: unknown }`. The block a part was read from. A driver sends a part whose origin is its own provider back as this block, unchanged. |
| `ToolDefinition` | `{ name: string; description: string; inputSchema: JsonSchema }` |
| `OutputFormat` | `{ name: string; schema: JsonSchema; description?: string }`. Asks for a reply that is one JSON value matching `schema`. |
| `Effort` | `'low' \| 'medium' \| 'high' \| 'xhigh' \| 'max'` |
| `ChatResponse` | `{ id; provider; model; message: AssistantMessage; text: string; toolCalls: ToolCallPart[]; stopReason: StopReason; usage: Usage }` |
| `StopReason` | `'end' \| 'max_tokens' \| 'tool_use' \| 'stop_sequence' \| 'refusal' \| 'pause' \| 'content_filter' \| 'other'` |
| `Usage` | `{ inputTokens; outputTokens; cacheReadTokens; cacheWriteTokens }`, each a `number`, 0 when the provider does not report it. |
| `StreamEvent` | `{ type: 'text'; text } \| { type: 'reasoning'; text } \| { type: 'tool_call'; call: ToolCallPart } \| { type: 'done'; response: ChatResponse }` |
| `EmbedRequest` | `{ inputs: string[]; model?: string; dimensions?: number }` |
| `EmbedResponse` | `{ provider; model; dimensions: number; vectors: Float32Array[]; usage: { inputTokens: number } }` |

`StopReason`: `end`, the reply is finished; `max_tokens`, it hit the output limit; `tool_use`, it waits for tool results; `stop_sequence`, it wrote a stop sequence; `refusal`, the provider declined; `pause`, the provider paused a long turn, send the reply back to resume it; `content_filter`, the provider filtered the content; `other`, a reason polaris does not know.

### Driver contract

| Type | Shape |
|---|---|
| `PolarisDriver` | `{ provider: string; features: DriverFeatures; chat(request, call): Promise<ChatResponse>; stream?(request, call): AsyncIterable<StreamEvent>; embed?(request, call): Promise<EmbedResponse> }` |
| `DriverFeatures` | `{ tools: boolean; structuredOutput: boolean; images: boolean }` |
| `DriverCall` | `{ fetch: Transport; signal: AbortSignal; apiKey: string \| undefined }` |
| `ProviderFactory` | `() => PolarisDriver` |
| `Transport` | The `fetch` signature. |
| `ProvidersList` | An empty interface the application augments. |
| `InferProviders` | `InferProviders<typeof config>`: the providers a config declares. |

A driver sends every HTTP request through `call.fetch` with `call.signal`: that is how the deadline, the size bound and cancellation reach the network. It uses `call.apiKey` when it is set.

### Claude driver

`providers.anthropic(config: AnthropicConfig): ProviderFactory` talks to Claude through `@anthropic-ai/sdk`, loaded the first time the provider is used.

| `AnthropicConfig` | Type | Default | Description |
|---|---|---|---|
| `model` | `string` | required | The model of every request that names none. |
| `apiKey` | `string` | the SDK's own lookup (`ANTHROPIC_API_KEY`) | A per-call key overrides it. |
| `baseURL` | `string` | the Anthropic API | Another endpoint speaking the Anthropic API. |
| `maxTokens` | `number` | `16000`, `64000` for a stream | Output limit of a request that sets none. |
| `maxRetries` | `number` | `2` | Retries of a 408, 409, 429 or 5xx (529 included), following `retry-after`, within the call's deadline. |
| `fallbacks` | `'default' \| { model: string }[]` | none | Server-side fallback when the model declines a request. Turns on the `server-side-fallback-2026-07-01` beta. |
| `betas` | `string[]` | none | Further `anthropic-beta` flags. |

`providerOptions.anthropic` holds raw Messages API fields, sent as they are (`thinking`, `metadata`…). Reasoning comes back as `reasoning` parts; blocks with no neutral equivalent as `provider` parts; every part keeps its block in `origin`. Reasoning without an Anthropic origin and parts from another provider are left out of what is sent.

Stop reasons: `end_turn` is `end`; `max_tokens` and `model_context_window_exceeded` are `max_tokens`; `pause_turn` and `compaction` are `pause`; `stop_sequence`, `tool_use` and `refusal` keep their name.

## Errors

| Code | Raised when |
|---|---|
| [`E_POLARIS_MISSING_CONFIG`](/en/reference/errors#e-polaris-missing-config) | The application has no `polaris` config. |
| [`E_POLARIS_INVALID_CONFIG`](/en/reference/errors#e-polaris-invalid-config) | A config value or a call option is out of range, a factory built no driver, or a driver's SDK is not installed. |
| [`E_POLARIS_NO_DEFAULT_PROVIDER`](/en/reference/errors#e-polaris-no-default-provider) | `use()` without a name, and no `default`. |
| [`E_POLARIS_UNKNOWN_PROVIDER`](/en/reference/errors#e-polaris-unknown-provider) | `use(name)` names an undeclared provider. |
| [`E_POLARIS_INVALID_REQUEST`](/en/reference/errors#e-polaris-invalid-request) | No messages, a bad token limit, two tools with one name, a tool schema that is not an object… |
| [`E_POLARIS_UNSUPPORTED`](/en/reference/errors#e-polaris-unsupported) | The provider cannot serve what the request asks for. Nothing was sent. |
| [`E_POLARIS_TIMEOUT`](/en/reference/errors#e-polaris-timeout) | The call ran past its deadline. |
| [`E_POLARIS_RESPONSE_TOO_LARGE`](/en/reference/errors#e-polaris-response-too-large) | The provider sent more than `maxResponseBytes`. |
| [`E_POLARIS_STREAM_INCOMPLETE`](/en/reference/errors#e-polaris-stream-incomplete) | A stream ended without its final response. |
| [`E_POLARIS_INVALID_RESPONSE`](/en/reference/errors#e-polaris-invalid-response) | A driver broke the contract (an event after `done`, the wrong number of vectors…). |
| [`E_POLARIS_AUTHENTICATION`](/en/reference/errors#e-polaris-authentication) | The provider refused the credentials (401, 403). |
| [`E_POLARIS_RATE_LIMITED`](/en/reference/errors#e-polaris-rate-limited) | The provider is rate limiting, after the retries. |
| [`E_POLARIS_PROVIDER_UNAVAILABLE`](/en/reference/errors#e-polaris-provider-unavailable) | The provider is overloaded or failing (5xx, 529), after the retries. |
| [`E_POLARIS_PROVIDER_REJECTED`](/en/reference/errors#e-polaris-provider-rejected) | The provider rejected the request itself (400, 404, 413, 422…). |
| [`E_POLARIS_PROVIDER_UNREACHABLE`](/en/reference/errors#e-polaris-provider-unreachable) | The provider could not be reached. |
| [`E_POLARIS_PROVIDER_FAILED`](/en/reference/errors#e-polaris-provider-failed) | A provider error mentioned the call's own key: the key is removed from the message and the original error is not attached. |
| [`E_POLARIS_NOT_BOOTED`](/en/reference/errors#e-polaris-not-booted) | `services/main` was used before the provider booted. |

A call cancelled by your own `signal` rejects with that signal's reason, not with a polaris error.

## See also

- [Language models](/en/guides/digging-deeper/language-models)
- [HTTP client](/en/guides/digging-deeper/http-client)
