# Language models

This guide covers calling a language model from your application:

- Configuring providers
- Sending a request
- Streaming a reply
- Tools and structured output
- A key per call
- Limits and cancellation
- Claude

## Overview

`@c9up/polaris` gives your application one way to call a language model. You
send the same request and read the same reply whatever the provider is.
Changing provider is a change to the config, not to your code.

This version ships the Claude provider. An OpenAI-compatible provider, for
Groq, Cloudflare Workers AI, a local Ollama server and other services that
speak the OpenAI API, is the next one.

Install the package, and the Anthropic SDK for Claude:

```bash
pnpm add @c9up/polaris @anthropic-ai/sdk
```

Register the provider in `reamrc.ts`:

```ts
providers: [() => import('@c9up/polaris/provider')]
```

## Configuring providers

Declare your providers in `config/polaris.ts`. Each one has a name, and one of
them is the default:

```ts
import { defineConfig, type InferProviders, providers } from '@c9up/polaris'
import env from '#start/env'

const polarisConfig = defineConfig({
  default: 'claude',
  providers: {
    claude: providers.anthropic({
      model: 'claude-opus-5-5',
      apiKey: env.get('ANTHROPIC_API_KEY'),
    }),
  },
})

export default polarisConfig

declare module '@c9up/polaris/types' {
  interface ProvidersList extends InferProviders<typeof polarisConfig> {}
}
```

The `declare module` block lets TypeScript check provider names:
`polaris.use('claude')` compiles, and a misspelled name does not.

A provider is built the first time you use it. If its config is wrong, the
error comes at that moment, with the field that is wrong.

## Sending a request

```ts
import polaris from '@c9up/polaris/services/main'

const reply = await polaris.use('claude').chat({
  system: 'Answer in one sentence, in plain language.',
  messages: [{ role: 'user', content: 'What is a cross-border commuter?' }],
})

reply.text // the reply's text
reply.stopReason // 'end' when the reply is complete
reply.usage // input, output and cache tokens
```

`polaris.chat()` without `use()` goes to the default provider.

A conversation is the list of its messages. To continue it, add the reply and
the next question, and send the whole list again:

```ts
const next = await polaris.chat({
  messages: [
    { role: 'user', content: 'What is a cross-border commuter?' },
    reply.message,
    { role: 'user', content: 'Which permit do they need?' },
  ],
})
```

Pass `reply.message` back as it is. Some providers, Claude among them, check
that the history they receive is exactly what they sent; polaris keeps what
they need for that in each part of the reply.

Check `stopReason` before you use a reply:

| `stopReason` | What it means |
|---|---|
| `end` | The reply is complete. |
| `max_tokens` | The reply was cut at the output limit. Raise `maxTokens`, or stream it. |
| `tool_use` | The model asks you to run tools. See below. |
| `refusal` | The provider declined to answer. The text may be empty. |
| `pause` | The provider paused a long turn. Send the reply back to let it go on. |

## Streaming a reply

A stream gives you the reply as it is written:

```ts
for await (const event of polaris.stream({ messages })) {
  if (event.type === 'text') process.stdout.write(event.text)
  if (event.type === 'done') console.log(event.response.usage)
}
```

The stream ends with one `done` event. It holds the whole response, the same
one `chat()` would have returned. If you leave the loop early, polaris cancels
the request to the provider, so you stop paying for a reply nobody reads.

## Tools and structured output

A tool is a function the model may ask you to run. You describe it with a JSON
Schema; when the model wants it, the reply stops with `stopReason: 'tool_use'`
and lists the calls in `toolCalls`:

```ts
const lookup = {
  name: 'canton_rule',
  description: 'Look up a tax rule for a Swiss canton',
  inputSchema: {
    type: 'object',
    properties: { canton: { type: 'string' } },
    required: ['canton'],
  },
}

const first = await polaris.chat({ messages, tools: [lookup] })

for (const call of first.toolCalls) {
  // call.input is what the model wrote: check it before you use it.
  const answer = await findRule(call.input)
  messages.push(first.message, {
    role: 'user',
    content: [{ type: 'tool_result', toolCallId: call.id, content: answer }],
  })
}

const final = await polaris.chat({ messages, tools: [lookup] })
```

To get one JSON value back instead of text, give an output schema:

```ts
const reply = await polaris.chat({
  messages,
  output: {
    name: 'profile',
    schema: {
      type: 'object',
      properties: { canton: { type: 'string' }, borderCommuter: { type: 'boolean' } },
      required: ['canton', 'borderCommuter'],
    },
  },
})

const profile = JSON.parse(reply.text)
```

The model's output is not trusted input: validate `call.input` and the parsed
JSON before you act on them.

If a provider cannot run tools, read images or produce structured output,
polaris refuses the request with `E_POLARIS_UNSUPPORTED` before sending
anything.

## A key per call

When each account of your application brings its own provider key, pass it
with the call:

```ts
await polaris.use('claude').chat(request, { apiKey: account.llmKey })
```

It replaces the configured key for this call only. If the provider's error
mentions the key, polaris replaces the error with `E_POLARIS_PROVIDER_FAILED`:
its message has the key taken out, and the original error is not attached, so
the key does not reach your logs.

## Limits and cancellation

Every call has a deadline, 10 minutes by default, streams included. Change it
in the config with `timeout`, or for one call:

```ts
await polaris.chat(request, { timeout: 30_000 })
```

polaris reads at most 32 MiB from a provider (`maxResponseBytes`). It counts
the bytes it actually receives, so a compressed or chunked reply cannot go past
the limit.

Pass a `signal` to cancel a call yourself:

```ts
await polaris.chat(request, { signal: AbortSignal.timeout(5_000) })
```

A call that runs out of time raises `E_POLARIS_TIMEOUT`. A call you cancelled
rejects with your signal's reason.

When the provider is busy, it is retried before polaris gives up (twice by
default for Claude). The retries stay within the call's deadline. Once they
are spent, you get `E_POLARIS_RATE_LIMITED` or `E_POLARIS_PROVIDER_UNAVAILABLE`.
These two answer HTTP 503 if they reach your exception handler; a refused
provider key (`E_POLARIS_AUTHENTICATION`) answers 502, never 401, because the
problem is your server's key, not the visitor's request.

## Claude

`providers.anthropic()` uses the official Anthropic SDK. Install it next to
polaris; it is loaded the first time the provider is used.

```ts
claude: providers.anthropic({
  model: 'claude-opus-5-5',
  apiKey: env.get('ANTHROPIC_API_KEY'),
  fallbacks: 'default',
})
```

`fallbacks: 'default'` lets the API run a request again on a fallback model
when the model declines it. It is recommended on the current Opus, Sonnet and
Fable models. The other options are in the
[reference](/en/reference/polaris#claude-driver).

Fields polaris does not model can be sent as they are written in the Messages
API, under `providerOptions.anthropic`:

```ts
await polaris.chat({
  messages,
  providerOptions: { anthropic: { thinking: { type: 'adaptive', display: 'summarized' } } },
})
```

Claude's reasoning comes back as `reasoning` parts. Their text may be empty:
Claude does not always show it.

## Next steps

- [polaris reference](/en/reference/polaris): every option, type and error.
- [Errors](/en/reference/errors#polaris-errors): the `E_POLARIS_*` codes.
