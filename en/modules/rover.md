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
| `.attach(file, options?)` | Attach a file by path or `file://` URL, read when the message is built |
| `.attachData(content, { filename })` | Attach bytes you already hold (`Buffer` or `string`) |
| `.embed(file, cid, options?)` | Embed a file inline, referenced by `cid:<cid>` in the HTML |
| `.embedData(content, cid, options?)` | Embed bytes inline under a `cid` |
| `.header(key, value)` | Add a custom email header |
| `.encoding(encoding)` | Body transfer encoding (SMTP only) |
| `.listUnsubscribe(value, { oneClick? })` | `List-Unsubscribe`, plus the RFC 8058 one-click header |
| `.listSubscribe(value)` / `.listHelp(value)` | The other RFC 2369 `List-*` headers |
| `.addListHeader(key, value)` | Any `List-<key>` header (`key` carries no `List-` prefix) |
| `.icalEvent(ics, options?)` | Attach a calendar invitation from ICS text |
| `.icalEventFromFile(file, options?)` | …read from a file |
| `.icalEventFromUrl(url, options?)` | …fetched from a URL (SMTP only) |

> **List-Unsubscribe and deliverability.** Gmail and Yahoo require bulk senders
> to offer one-click unsubscribe. `oneClick: true` emits the RFC 8058
> `List-Unsubscribe-Post` header alongside the URL, and refuses a `mailto:`
> target — it cannot answer a POST.

> **Calendar invitations.** `icalEventFromUrl()` is SMTP-only: nodemailer
> fetches the URL, while a provider HTTP API takes the bytes. The other two
> forms work everywhere — for those transports the invitation is sent as a
> `text/calendar` part, which is how mail clients read it anyway.
>
> Named deviation: upstream also accepts an `ical-generator` builder callback.
> rover carries no such dependency and takes the ICS text instead.

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

## Config

```ts
import { defineConfig, transports } from '@c9up/rover'

export default defineConfig({
  default: 'smtp',
  from: 'noreply@acme.com',
  mailers: {                                    // `transports` also works
    smtp: transports.smtp({ host: env.get('SMTP_HOST') }),
    ses: transports.ses({ region: 'eu-west-1', accessKeyId, secretAccessKey }),
  },
})
```

Every bundled transport registers itself when the package entry loads —
`smtp`, `log`, `ses`, `mailgun`, `sparkpost`, `resend`, `brevo`, `sendgrid`.
There is no `postmark` helper: rover has no such transport, so a config naming
it fails to **compile** rather than at boot.

## Dispatchable mails

```ts
class WelcomeMail extends BaseMail {
  from = 'noreply@acme.com'
  subject = 'Welcome'
  constructor(private user: User) { super() }
  prepare() {
    this.message.to(this.user.email).htmlView('emails/welcome', { user: this.user })
  }
}

await new WelcomeMail(user).send(mail.use('smtp'))
```

`message` is public, which is what lets a test read it:

```ts
mails.assertSent(WelcomeMail, (mail) => mail.message.hasTo(user.email))
```

A mail builds **once**. `build()` returns the message the first call produced, so
inspecting a mail and then sending it — or sending it twice — does not replay
`prepare()`:

```ts
const mail = new WelcomeMail(user)
await mail.buildWithContents()   // read the rendered html
await mail.send(mailer)          // recipients and attachments are not doubled
mail.built                       // true
```

Without that guard `prepare()` ran again against the same builder, adding every
recipient and every attachment a second time — the mail went out twice to the
same address with the attachment doubled.

## Inspecting a message

`has*` answers, `assert*` throws and reports what it actually got:

```ts
message.hasTo('ada@acme.test')
message.hasTo('ada@acme.test', 'Ada')      // both halves must match
message.assertSubject('Welcome')
message.assertHtmlIncludes('Hello')
message.toObject()
```

`hasRecipient` takes the **field first**, as AdonisJS does, and
`hasAnyRecipient` is the any-field question:

```ts
message.hasRecipient('to', 'ada@acme.test')     // one named field
message.hasRecipient('bcc', 'ada@acme.test')    // false — not in that field
message.hasAnyRecipient('ada@acme.test')        // to / cc / bcc
message.hasAnyRecipient()                       // is there a recipient at all
```

Addresses are stored in their display form, so `hasFrom('a@b.c')` matches inside
`"Name" <a@b.c>`. With a display name, the comparison is exact.

## Lifecycle events

Every event carries the AdonisJS triple — the mailer that handled it, the
message, and the templates it was rendered from:

```ts
emitter.on('mail:sent', ({ mailerName, message, views, messageId }) => {
  audit.log({ mailer: mailerName, subject: message.subject, template: views.html?.template })
})
```

Events: `mail:sending`, `mail:sent`, `mail:failed`, `mail:queueing`,
`mail:queued`, plus `queued:mail:error` for a background delivery that failed.

The flattened `to` / `cc` / `bcc` lists and `transportName` are ours and stay: a
listener that only wants the addresses should not have to reach into the
message, and `transportName` is the same string as `mailerName` under the name
rover used first.

A message revived from a queue payload reports an empty `views` bag rather than
a guess — the rendered bodies were serialised, the templates that produced them
were not.

## The watch body and prepared headers

```ts
message.watch('<p>on the wrist</p>')            // Apple Watch body
message.watchView('emails/wrist', { user })     // …from a template
message.assertWatchIncludes(/wrist/i)

message.preparedHeader('X-Signature', 'a=b; c=d')
```

::: warning Named deviation — and an upstream bug
`watch()` writes nodemailer's `watchHtml`. AdonisJS writes a bare `watch` field,
which nodemailer's mail composer never reads (`lib/mail-composer/index.js` only
looks at `watchHtml`), so **upstream's watch body never reaches the wire**.
`watchHtml()` is the same method under the field's own name.
:::

`preparedHeader` marks a value nodemailer must pass through untouched. Normal
headers get folded and MIME-encoded; a value that is already exactly what must
go on the wire — a signature, a pre-encoded id — is corrupted by that. The flag
only means something where MIME encoding happens: the SES transport emits such a
header verbatim, and the provider REST transports, which encode nothing, flatten
it to its string.

## Handing the mailer a queue later

```ts
mail.setMessenger(queue)      // chainable, returns the mailer

await mail.sendCompiled(builtMessage)          // already composed
await mail.sendLaterCompiled(builtMessage)     // …and queued
```

The constructor takes a queue too, but a queue is often resolved later than the
mailer — a provider booting after this one, a test swapping it. The `*Compiled`
pair sends a message that is already built, which is what a queue worker holds:
composed and serialised elsewhere, nothing left to render.

## Text bodies and the envelope

```ts
message.textView('emails/welcome.txt', { user })   // beside htmlView
message.envelope({ from: 'bounces+reader@acme.com' })
```

An HTML-only message scores worse with spam filters and is unreadable in a text
client. The envelope is what mail servers use: a bounce goes to the envelope
sender, not to the visible author.

## Shutting down

```ts
await mail.closeAll()
```

Real on SMTP — it drains nodemailer's pool. A process that exits without it
leaves the server holding sockets until they time out.

Display names and addresses carrying CR, LF or NUL are **rejected**: a line break
cannot be escaped in a header, it ends it, and accepting one is how a contact
form becomes an open relay.
