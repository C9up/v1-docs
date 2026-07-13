# Rover — Mail Transport

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
  transports: {
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

In development, set `default: 'log'` to print emails to the console without sending them.

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
    .attach('invoice.pdf', pdfBuffer, 'application/pdf')
    .header('X-Custom-Header', 'value')
})
```

To use a specific named transport instead of the default:

```typescript
await mail.send((message) => {
  message.to('dev@example.com').subject('Test').text('Hello')
}, 'log')
```

## MessageBuilder API

| Method | Description |
|---|---|
| `.from(address)` | Sender address (overrides config default) |
| `.to(address)` | Add a recipient (call multiple times for multiple recipients) |
| `.cc(address)` | Add a CC recipient |
| `.bcc(address)` | Add a BCC recipient |
| `.replyTo(address)` | Set the Reply-To address |
| `.subject(text)` | Email subject |
| `.html(content)` | HTML body |
| `.text(content)` | Plain text body |
| `.attach(filename, content, contentType?)` | Attach a file (`Buffer` or `string`) |
| `.header(key, value)` | Add a custom email header |

## Available Transports

### SMTP

Sends via a raw SMTP connection with TLS and AUTH LOGIN support. Credentials **require** `secure: true` (SMTPS on 465) — the transport refuses to send `AUTH LOGIN` over plaintext.

```typescript
{
  transport: 'smtp',
  host: 'smtp.example.com',
  port: 465,
  secure: true,
  user: 'user@example.com',
  pass: 'secret',
}
```

For servers that only accept port 587 with STARTTLS, negotiate TLS before passing credentials or use a transport that handles STARTTLS natively.

### Log (development)

Prints email details to the console. No network connection is made. Useful during development and in CI environments.

```typescript
{
  transport: 'log',
}
```

### Custom transports

Implement the `MailTransport` interface and register a factory via `registerTransport()`:

```typescript
import { registerTransport } from '@c9up/rover'
import type { MailTransport, MailMessage } from '@c9up/rover'

class ResendTransport implements MailTransport {
  constructor(private config: Record<string, unknown>) {}

  async send(message: MailMessage): Promise<void> {
    // call Resend API using this.config.apiKey
  }
}

registerTransport('resend', (config) => new ResendTransport(config))

// Now you can reference `transport: 'resend'` in your mail config:
// transports: { resend: { transport: 'resend', apiKey: process.env.RESEND_KEY } }
```

## Standalone Usage

Rover does not require Ream. Instantiate `Mail` directly with a config object:

```typescript
import { Mail } from '@c9up/rover'

const mail = new Mail({
  default: 'smtp',
  from: 'noreply@example.com',
  transports: {
    smtp: { transport: 'smtp', host: 'localhost', port: 1025 },
  },
})

await mail.send((msg) => {
  msg.to('user@example.com').subject('Hello').text('World')
})
```

## Next Steps

- [Warden (Auth)](/en/modules/warden) — Send password reset or verification emails after auth events
- [Bay (Queue)](/en/modules/bay) — Queue mail jobs for background delivery
