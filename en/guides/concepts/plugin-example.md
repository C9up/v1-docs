# A worked example

This guide covers a complete package hook, step by step:

- `package.json`
- `src/index.ts`
- `src/configure.ts`
- What the user sees

## Worked example: Postmark transport for Rover

This walks through publishing a community Postmark transport for [Rover (Mail)](/en/guides/digging-deeper/mail/). The transport implements `MailTransport` so the user can reference `transport: 'postmark'` in `config/mail.ts` after running `ream add @community/postmark-rover-transport`.

The package layout:

```
@community/postmark-rover-transport/
├── package.json
└── src/
    ├── index.ts       # PostmarkTransport class implementing MailTransport
    └── configure.ts   # configure() hook
```

### `package.json`

```json title="package.json"
{
  "name": "@community/postmark-rover-transport",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./configure": "./src/configure.ts"
  },
  "peerDependencies": {
    "@c9up/ream": "^X.Y.0",
    "@c9up/rover": "^X.Y.0"
  },
  "engines": {
    "node": ">=22.0.0"
  }
}
```

### `src/index.ts`

```typescript title="src/index.ts"
import type { MailMessage, MailSendOutcome, MailTransport } from '@c9up/rover'

interface PostmarkConfig {
  apiToken: string
}

export class PostmarkTransport implements MailTransport {
  readonly #config: PostmarkConfig

  constructor(config: Record<string, unknown>) {
    const apiToken = config.apiToken
    if (typeof apiToken !== 'string' || apiToken.length === 0) {
      throw new Error('[postmark-transport] Missing apiToken in transport config.')
    }
    this.#config = { apiToken }
  }

  async send(message: MailMessage): Promise<MailSendOutcome> {
    if (message.to.length === 0) {
      throw new Error('[postmark-transport] No recipients in message — `to` is empty.')
    }
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': this.#config.apiToken,
      },
      body: JSON.stringify({
        From: message.from,
        To: message.to.join(', '),
        Cc: message.cc.length > 0 ? message.cc.join(', ') : undefined,
        Bcc: message.bcc.length > 0 ? message.bcc.join(', ') : undefined,
        ReplyTo: message.replyTo,
        Subject: message.subject,
        HtmlBody: message.html,
        TextBody: message.text,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`[postmark-transport] Postmark rejected message: ${response.status} ${body}`)
    }

    const payload: unknown = await response.json()
    const providerId =
      payload !== null && typeof payload === 'object' && 'MessageID' in payload && typeof payload.MessageID === 'string'
        ? payload.MessageID
        : undefined

    return providerId !== undefined ? { providerId } : undefined
  }
}
```

### `src/configure.ts`

```typescript title="src/configure.ts"
import type { Codemods } from '@c9up/ream'

const SNIPPET = `// Paste this block into your config/mail.ts under \`transports: { ... }\`:
//
//   postmark: {
//     transport: 'postmark',
//     apiToken: process.env.POSTMARK_API_TOKEN ?? '',
//   }
//
// Then register the transport once at boot (e.g. in a provider's boot() method):
//
//   import { registerTransport } from '@c9up/rover'
//   import { PostmarkTransport } from '@community/postmark-rover-transport'
//   registerTransport('postmark', (config) => new PostmarkTransport(config))
`

export async function configure(codemods: Codemods): Promise<void> {
  await codemods.addEnvVars({
    POSTMARK_API_TOKEN: '<your-postmark-token>',
  })
  await codemods.writeFile('config/mail.postmark-snippet.ts', SNIPPET)
  console.log('  Note: Snippet written to config/mail.postmark-snippet.ts — paste into your config/mail.ts under `transports:`.')
}
```

The hook deliberately writes a `*-snippet.ts` file rather than touching `config/mail.ts` directly — `ream add` runs after the user has already configured `@c9up/rover`, so `config/mail.ts` exists and is actively maintained. Clobbering it would overwrite their other transports; the snippet pattern leaves the integration step under user control.

If your transport plugin also ships a CLI command (e.g. `mail:send-test`), call `await codemods.registerCommand('@community/postmark-rover-transport/commands/send-test.js')` from the same configure hook — `registerCommand` will bootstrap the `commands: []` field in `reamrc.ts` if absent, then add the entry idempotently.

### What the user sees

```bash
$ pnpm ream add @community/postmark-rover-transport

  Adding @community/postmark-rover-transport with pnpm...
  ...
  Configuring @community/postmark-rover-transport...
  Note: Snippet written to config/mail.postmark-snippet.ts — paste into your config/mail.ts under `transports:`.
  Done! @community/postmark-rover-transport configured.
```

The user pastes the snippet into their `config/mail.ts`, fills in `POSTMARK_API_TOKEN` in `.env`, and starts using `transport: 'postmark'` in their mail config.
