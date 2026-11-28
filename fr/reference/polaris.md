# polaris

`@c9up/polaris` : une seule API pour les modèles de langage, quel que soit le fournisseur. Un gestionnaire de fournisseurs nommés, une même forme de requête et de réponse pour tous, le contrat qu'implémente un driver de fournisseur, et le driver Claude. Guide : [Modèles de langage](/fr/guides/digging-deeper/language-models).

## Installation

```bash
pnpm add @c9up/polaris
```

Dépend de `@c9up/flare`. Dépendances pairs facultatives : `@c9up/ream` (le provider et `services/main`), et `@anthropic-ai/sdk` si vous utilisez `providers.anthropic()`.

Déclarez le provider dans `reamrc.ts` :

```ts
providers: [() => import('@c9up/polaris/provider')]
```

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/polaris` | `defineConfig`, `Polaris`, `PolarisClient`, `providers`, `createResponse`, l'espace de noms `errors` et tous les types ci-dessous. |
| `@c9up/polaris/types` | Les types seuls. C'est le module que l'application augmente avec `ProvidersList`. |
| `@c9up/polaris/provider` | `PolarisProvider`, le provider ream. |
| `@c9up/polaris/services/main` | Le gestionnaire de l'application, lié au démarrage. |

## Configuration

`config/polaris.ts` :

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

| Option | Type | Défaut | Description |
|---|---|---|---|
| `providers` | `Record<string, ProviderFactory>` | obligatoire | Les fournisseurs, par nom. Au moins un. |
| `default` | une clé de `providers` | aucun | Le fournisseur que renvoie `use()` sans nom. |
| `timeout` | `number` | `600000` | Délai d'un appel en ms, streams compris. Au plus `2147483647`. |
| `maxResponseBytes` | `number` | `33554432` (32 Mio) | Taille maximale du corps lu chez un fournisseur, comptée sur les octets reçus. |
| `fetch` | `Transport` | le `fetch` global | Ce par quoi passe chaque appel à un fournisseur. |

## Exports

### `@c9up/polaris`

| Export | Nature | Description |
|---|---|---|
| `defineConfig` | fonction | `defineConfig(config: PolarisConfig<K>): PolarisConfig<K>`. Renvoie la config telle quelle, typée pour que `default` désigne un fournisseur déclaré. |
| `Polaris` | classe | Le gestionnaire de fournisseurs. Voir plus bas. |
| `PolarisClient` | classe | Un fournisseur configuré, tel que `use()` le renvoie. Voir plus bas. |
| `providers` | objet | Une fabrique par driver livré : `providers.anthropic(config)`. |
| `createResponse` | fonction | `createResponse(input: ResponseInput): ChatResponse`. Construit une réponse à partir de son contenu : `text` et `toolCalls` en sont déduits, les compteurs d'usage absents valent 0. Pour qui écrit un driver. |
| `errors` | espace de noms | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs). Chacune est une `Exception` flare avec un `code` textuel. |
| `PolarisService` | type | `Polaris<DeclaredProviders>` : le gestionnaire typé par `ProvidersList`. |
| `DeclaredProviders` | type | Les fournisseurs déclarés dans `ProvidersList`. |
| `CallOptions` | interface | `{ signal?: AbortSignal; apiKey?: string; timeout?: number }`. |
| `AnthropicConfig` | interface | Les options de `providers.anthropic()`, voir [Driver Claude](#driver-claude). |

### `Polaris`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Polaris(config: PolarisConfig<K>)` | Vérifie la config ; lève `E_POLARIS_INVALID_CONFIG`. |
| `use` | `use(name?: keyof K): PolarisClient` | Le fournisseur déclaré sous `name`, ou celui par défaut. Construit à la première utilisation, puis toujours la même instance. |
| `chat` | `chat(request: ChatRequest, options?: CallOptions): Promise<ChatResponse>` | `use().chat()`. |
| `stream` | `stream(request: ChatRequest, options?: CallOptions): AsyncGenerator<StreamEvent>` | `use().stream()`. |
| `embed` | `embed(request: EmbedRequest, options?: CallOptions): Promise<EmbedResponse>` | `use().embed()`. |

### `PolarisClient`

| Membre | Signature | Description |
|---|---|---|
| `name` | `readonly name: string` | Le nom dans la config. |
| `provider` | `readonly provider: string` | Le fournisseur derrière, tel que son driver se nomme (`anthropic`). |
| `features` | `{ tools; structuredOutput; images; streaming; embeddings }` | Ce que le fournisseur sait faire, chacun un `boolean`. |
| `chat` | `chat(request: ChatRequest, options?: CallOptions): Promise<ChatResponse>` | Envoie la requête et attend la réponse entière. |
| `stream` | `stream(request: ChatRequest, options?: CallOptions): AsyncGenerator<StreamEvent>` | La réponse au fil de son écriture, terminée par un seul événement `done`. Quitter la boucle avant la fin annule la requête au fournisseur. |
| `embed` | `embed(request: EmbedRequest, options?: CallOptions): Promise<EmbedResponse>` | Un vecteur par entrée, dans l'ordre des entrées. |

Avant tout envoi, la requête est vérifiée : au moins un message, un `maxTokens` entier positif, des outils aux noms distincts. Les outils, la sortie structurée, les images, le streaming et les embeddings sont refusés avec `E_POLARIS_UNSUPPORTED` quand le fournisseur ne les gère pas. Une `apiKey` passée à l'appel doit faire au moins 8 caractères, sans espaces autour.

### Requêtes et réponses

| Type | Forme |
|---|---|
| `ChatRequest` | `{ messages: Message[]; model?: string; system?: string; maxTokens?: number; tools?: ToolDefinition[]; toolChoice?: 'auto' \| 'none'; output?: OutputFormat; stopSequences?: string[]; effort?: Effort; providerOptions?: { [provider: string]: unknown } }` |
| `Message` | `UserMessage \| AssistantMessage`. `content` est un texte ou un tableau de parties. |
| `UserMessage` | `{ role: 'user'; content: string \| (TextPart \| ImagePart \| ToolResultPart)[] }` |
| `AssistantMessage` | `{ role: 'assistant'; content: string \| (TextPart \| ReasoningPart \| ToolCallPart \| ProviderPart)[] }` |
| `TextPart` | `{ type: 'text'; text: string; origin?: Origin }` |
| `ImagePart` | `{ type: 'image'; mediaType: 'image/png' \| 'image/jpeg' \| 'image/gif' \| 'image/webp'; data: string }`. `data` est en base64, sans préfixe `data:`. |
| `ReasoningPart` | `{ type: 'reasoning'; text: string; origin?: Origin }`. `text` peut être vide. |
| `ToolCallPart` | `{ type: 'tool_call'; id: string; name: string; input: unknown; origin?: Origin }`. `input` est du JSON analysé, non validé. |
| `ToolResultPart` | `{ type: 'tool_result'; toolCallId: string; content: string; isError?: boolean }` |
| `ProviderPart` | `{ type: 'provider'; origin: Origin }`. Un bloc sans équivalent neutre, comme le résultat d'un outil côté serveur. |
| `Origin` | `{ provider: string; block: unknown }`. Le bloc d'où vient une partie. Un driver renvoie tel quel, sans le modifier, le bloc d'une partie venue de son propre fournisseur. |
| `ToolDefinition` | `{ name: string; description: string; inputSchema: JsonSchema }` |
| `OutputFormat` | `{ name: string; schema: JsonSchema; description?: string }`. Demande une réponse qui soit une seule valeur JSON conforme à `schema`. |
| `Effort` | `'low' \| 'medium' \| 'high' \| 'xhigh' \| 'max'` |
| `ChatResponse` | `{ id; provider; model; message: AssistantMessage; text: string; toolCalls: ToolCallPart[]; stopReason: StopReason; usage: Usage }` |
| `StopReason` | `'end' \| 'max_tokens' \| 'tool_use' \| 'stop_sequence' \| 'refusal' \| 'pause' \| 'content_filter' \| 'other'` |
| `Usage` | `{ inputTokens; outputTokens; cacheReadTokens; cacheWriteTokens }`, chacun un `number`, 0 quand le fournisseur ne le donne pas. |
| `StreamEvent` | `{ type: 'text'; text } \| { type: 'reasoning'; text } \| { type: 'tool_call'; call: ToolCallPart } \| { type: 'done'; response: ChatResponse }` |
| `EmbedRequest` | `{ inputs: string[]; model?: string; dimensions?: number }` |
| `EmbedResponse` | `{ provider; model; dimensions: number; vectors: Float32Array[]; usage: { inputTokens: number } }` |

`StopReason` : `end`, la réponse est terminée ; `max_tokens`, elle a atteint la limite de sortie ; `tool_use`, elle attend des résultats d'outils ; `stop_sequence`, elle a écrit une séquence d'arrêt ; `refusal`, le fournisseur a refusé ; `pause`, le fournisseur a mis en pause un long tour, renvoyez la réponse pour le reprendre ; `content_filter`, le fournisseur a filtré le contenu ; `other`, une raison que polaris ne connaît pas.

### Contrat de driver

| Type | Forme |
|---|---|
| `PolarisDriver` | `{ provider: string; features: DriverFeatures; chat(request, call): Promise<ChatResponse>; stream?(request, call): AsyncIterable<StreamEvent>; embed?(request, call): Promise<EmbedResponse> }` |
| `DriverFeatures` | `{ tools: boolean; structuredOutput: boolean; images: boolean }` |
| `DriverCall` | `{ fetch: Transport; signal: AbortSignal; apiKey: string \| undefined }` |
| `ProviderFactory` | `() => PolarisDriver` |
| `Transport` | La signature de `fetch`. |
| `ProvidersList` | Une interface vide que l'application augmente. |
| `InferProviders` | `InferProviders<typeof config>` : les fournisseurs que déclare une config. |

Un driver envoie chaque requête HTTP par `call.fetch` avec `call.signal` : c'est ainsi que le délai, la taille maximale et l'annulation atteignent le réseau. Il utilise `call.apiKey` quand elle est fournie.

### Driver Claude

`providers.anthropic(config: AnthropicConfig): ProviderFactory` parle à Claude par `@anthropic-ai/sdk`, chargé à la première utilisation du fournisseur.

| `AnthropicConfig` | Type | Défaut | Description |
|---|---|---|---|
| `model` | `string` | obligatoire | Le modèle de toute requête qui n'en nomme pas. |
| `apiKey` | `string` | la recherche propre au SDK (`ANTHROPIC_API_KEY`) | Une clé passée à l'appel la remplace. |
| `baseURL` | `string` | l'API Anthropic | Un autre point d'accès qui parle l'API Anthropic. |
| `maxTokens` | `number` | `16000`, `64000` pour un stream | Limite de sortie d'une requête qui n'en fixe pas. |
| `maxRetries` | `number` | `2` | Nouvelles tentatives sur un 408, 409, 429 ou 5xx (529 compris), en suivant `retry-after`, dans le délai de l'appel. |
| `fallbacks` | `'default' \| { model: string }[]` | aucun | Repli côté serveur quand le modèle refuse une requête. Active la beta `server-side-fallback-2026-07-01`. |
| `betas` | `string[]` | aucune | D'autres options `anthropic-beta`. |

`providerOptions.anthropic` contient des champs bruts de l'API Messages, envoyés tels quels (`thinking`, `metadata`…). Le raisonnement revient en parties `reasoning`, les blocs sans équivalent neutre en parties `provider`, et chaque partie garde son bloc dans `origin`. Un raisonnement sans origine Anthropic et les parties d'un autre fournisseur ne sont pas envoyés.

Raisons d'arrêt : `end_turn` devient `end` ; `max_tokens` et `model_context_window_exceeded` deviennent `max_tokens` ; `pause_turn` et `compaction` deviennent `pause` ; `stop_sequence`, `tool_use` et `refusal` gardent leur nom.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_POLARIS_MISSING_CONFIG`](/fr/reference/errors#e-polaris-missing-config) | L'application n'a pas de config `polaris`. |
| [`E_POLARIS_INVALID_CONFIG`](/fr/reference/errors#e-polaris-invalid-config) | Une valeur de config ou une option d'appel est hors limites, une fabrique n'a construit aucun driver, ou le SDK d'un driver n'est pas installé. |
| [`E_POLARIS_NO_DEFAULT_PROVIDER`](/fr/reference/errors#e-polaris-no-default-provider) | `use()` sans nom, et aucun `default`. |
| [`E_POLARIS_UNKNOWN_PROVIDER`](/fr/reference/errors#e-polaris-unknown-provider) | `use(nom)` désigne un fournisseur non déclaré. |
| [`E_POLARIS_INVALID_REQUEST`](/fr/reference/errors#e-polaris-invalid-request) | Aucun message, une limite de jetons invalide, deux outils du même nom, un schéma d'outil qui n'est pas un objet… |
| [`E_POLARIS_UNSUPPORTED`](/fr/reference/errors#e-polaris-unsupported) | Le fournisseur ne sait pas servir ce que demande la requête. Rien n'a été envoyé. |
| [`E_POLARIS_TIMEOUT`](/fr/reference/errors#e-polaris-timeout) | L'appel a dépassé son délai. |
| [`E_POLARIS_RESPONSE_TOO_LARGE`](/fr/reference/errors#e-polaris-response-too-large) | Le fournisseur a envoyé plus que `maxResponseBytes`. |
| [`E_POLARIS_STREAM_INCOMPLETE`](/fr/reference/errors#e-polaris-stream-incomplete) | Un stream s'est terminé sans sa réponse finale. |
| [`E_POLARIS_INVALID_RESPONSE`](/fr/reference/errors#e-polaris-invalid-response) | Un driver n'a pas respecté le contrat (un événement après `done`, un mauvais nombre de vecteurs…). |
| [`E_POLARIS_AUTHENTICATION`](/fr/reference/errors#e-polaris-authentication) | Le fournisseur a refusé les identifiants (401, 403). |
| [`E_POLARIS_RATE_LIMITED`](/fr/reference/errors#e-polaris-rate-limited) | Le fournisseur limite le débit, après les nouvelles tentatives. |
| [`E_POLARIS_PROVIDER_UNAVAILABLE`](/fr/reference/errors#e-polaris-provider-unavailable) | Le fournisseur est surchargé ou en panne (5xx, 529), après les nouvelles tentatives. |
| [`E_POLARIS_PROVIDER_REJECTED`](/fr/reference/errors#e-polaris-provider-rejected) | Le fournisseur a rejeté la requête elle-même (400, 404, 413, 422…). |
| [`E_POLARIS_PROVIDER_UNREACHABLE`](/fr/reference/errors#e-polaris-provider-unreachable) | Le fournisseur n'a pas pu être joint. |
| [`E_POLARIS_PROVIDER_FAILED`](/fr/reference/errors#e-polaris-provider-failed) | Une erreur du fournisseur mentionnait la clé propre à l'appel : la clé est retirée du message et l'erreur d'origine n'est pas jointe. |
| [`E_POLARIS_NOT_BOOTED`](/fr/reference/errors#e-polaris-not-booted) | `services/main` a été utilisé avant le démarrage du provider. |

Un appel que vous annulez avec votre propre `signal` est rejeté avec la raison de ce signal, pas avec une erreur polaris.

## Voir aussi

- [Modèles de langage](/fr/guides/digging-deeper/language-models)
- [Client HTTP](/fr/guides/digging-deeper/http-client)
