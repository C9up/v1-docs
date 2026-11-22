# Un exemple complet

Ce guide couvre le hook complet d’un paquet, pas à pas :

- `package.json`
- `src/index.ts`
- `src/configure.ts`
- Ce que voit l'utilisateur

## Exemple complet : transport Postmark pour Rover

Cet exemple parcourt la publication d'un transport Postmark communautaire pour [Rover (Mail)](/fr/guides/digging-deeper/mail/). Le transport implémente `MailTransport` afin que l'utilisateur puisse référencer `transport: 'postmark'` dans `config/mail.ts` après avoir lancé `ream add @community/postmark-rover-transport`.

La structure du paquet :

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

Le hook écrit délibérément un fichier `*-snippet.ts` au lieu de toucher à `config/mail.ts` directement — `ream add` tourne après que l'utilisateur a déjà configuré `@c9up/rover`, donc `config/mail.ts` existe et est activement maintenu. L'écraser supprimerait ses autres transports ; le motif snippet laisse l'étape d'intégration sous le contrôle de l'utilisateur.

Si votre plugin transport ship également une commande CLI (par ex. `mail:send-test`), appelez `await codemods.registerCommand('@community/postmark-rover-transport/commands/send-test.js')` depuis le même hook configure — `registerCommand` bootstrappera le champ `commands: []` dans `reamrc.ts` s'il est absent, puis ajoutera l'entrée de manière idempotente.

### Ce que voit l'utilisateur

```bash
$ pnpm ream add @community/postmark-rover-transport

  Adding @community/postmark-rover-transport with pnpm...
  ...
  Configuring @community/postmark-rover-transport...
  Note: Snippet written to config/mail.postmark-snippet.ts — paste into your config/mail.ts under `transports:`.
  Done! @community/postmark-rover-transport configured.
```

L'utilisateur colle le snippet dans son `config/mail.ts`, remplit `POSTMARK_API_TOKEN` dans `.env`, et utilise `transport: 'postmark'` dans sa configuration mail.
