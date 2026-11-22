# Introduction

This guide covers sending mail with rover:

- Installation
- Configuration
- Config
- Provider Registration
- Sending Mail
- Standalone Usage

Rover is Ream's mail module. It supports SMTP, a log transport for development, and pluggable custom transports. Rover is standalone — it works in any Node.js application and does not require Ream.

## Installation

```bash
pnpm add @c9up/rover
```

When used inside a Ream application, run the configure command to scaffold the config file and register the provider:

```bash
ream configure @c9up/rover
```

## Configuration

Create `config/mail.ts`:

```typescript
import { defineConfig } from '@c9up/rover'

export default defineConfig({
  default: 'smtp',
  from: 'noreply@example.com',
  mailers: {
    smtp: {
      transport: 'smtp',
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    log: {
      transport: 'log',
    },
  },
})
```

`default` has to name one of the `mailers`; anything else is refused when the
application boots, rather than on the first email it tries to send.

Each mailer's transport is built the first time it is used, then reused. A
mailer the application never sends through, such as an `smtp` entry whose
`SMTP_HOST` is still empty, does not stop the boot; its configuration error is
raised when it is first used. `closeAll()` closes the transports built so far.

In development, set `default: 'log'` to print emails to the console without sending them.

## Config

```ts
import { defineConfig, transports } from '@c9up/rover'

export default defineConfig({
  default: 'smtp',
  from: 'noreply@acme.com',
  mailers: {
    smtp: transports.smtp({ host: env.get('SMTP_HOST') }),
    ses: transports.ses({ region: 'eu-west-1', accessKeyId, secretAccessKey }),
  },
})
```

Every bundled transport registers itself when the package entry loads —
`smtp`, `log`, `ses`, `mailgun`, `sparkpost`, `resend`, `brevo`, `sendgrid`.
There is no `postmark` helper: rover has no such transport, so a config naming
it fails to **compile** rather than at boot.

The HTTP transports (`mailgun`, `sparkpost`, `brevo`, `sendgrid`) take a
`baseUrl` for a proxy in front of the provider. Every request to it carries the
API key, so it must be `https://` — plain `http://` only to `localhost`, for a
local mock — with no credentials, query or fragment; anything else fails with
`E_MAIL_PROVIDER_CONFIG` when the transport is built. Left out, it is the
provider's own endpoint.

`transports` is rover's older name for the same map. It still works — a config
written against it needs no change — but new configs declare `mailers`.

## Provider Registration

Register the Rover provider from the `@c9up/rover/provider` subpath:

```typescript
// start/providers.ts
import RoverProvider from '@c9up/rover/provider'

export const providers = [RoverProvider]
```

Once registered, the `Mail` instance is available from the IoC container:

```typescript
import { Mail } from '@c9up/rover'

const mail = await app.container.resolve(Mail)
```

## Sending Mail

Use `Mail.send()` with the fluent `MessageBuilder` API:

```typescript
import { Mail } from '@c9up/rover'

const mail = await app.container.resolve(Mail)

await mail.send((message) => {
  message
    .to('alice@example.com')
    .subject('Welcome to Ream')
    .html('<h1>Hello, Alice!</h1>')
})
```

The default `from` address from the config is applied automatically. Override it per message:

```typescript
await mail.send((message) => {
  message
    .from('team@example.com')
    .to('bob@example.com')
    .cc('manager@example.com')
    .bcc('archive@example.com')
    .replyTo('support@example.com')
    .subject('Your invoice')
    .html('<p>Please find your invoice attached.</p>')
    .text('Please find your invoice attached.')
    .attachData(pdfBuffer, { filename: 'invoice.pdf', contentType: 'application/pdf' })
    .header('X-Custom-Header', 'value')
})
```

To use a specific named transport instead of the default:

```typescript
await mail.send((message) => {
  message.to('dev@example.com').subject('Test').text('Hello')
}, 'log')
```

`send()` and `sendCompiled()` resolve to a `MailResponse`: the `messageId` to
match against provider webhooks, the `envelope` (`{ from, to }`) the servers
were given, and the transport's raw result as `original`. The `mail:sent` event
carries the same object as `response`.

```typescript
const { messageId } = await mail.send((message) => {
  message.to('alice@example.com').subject('Welcome').text('Hi')
})
```

## Standalone Usage

Rover does not require Ream. Instantiate `Mail` directly with a config object:

```typescript
import { Mail } from '@c9up/rover'

const mail = new Mail({
  default: 'smtp',
  from: 'noreply@example.com',
  mailers: {
    smtp: { transport: 'smtp', host: 'localhost', port: 1025 },
  },
})

await mail.send((msg) => {
  msg.to('user@example.com').subject('Hello').text('World')
})
```

## Next Steps
- [Warden (Auth)](/en/guides/auth/introduction) — Send password reset or verification emails after auth events
- [Bay (Queue)](/en/guides/digging-deeper/queues) — Queue mail jobs for background delivery
