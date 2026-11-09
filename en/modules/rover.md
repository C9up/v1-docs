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

`send()` and `sendCompiled()` resolve to a `MailResponse`: the `messageId` to
match against provider webhooks, the `envelope` (`{ from, to }`) the servers
were given, and the transport's raw result as `original`. The `mail:sent` event
carries the same object as `response`.

```typescript
const { messageId } = await mail.send((message) => {
  message.to('alice@example.com').subject('Welcome').text('Hi')
})
```

## MessageBuilder API

| Method | Description |
|---|---|
| `.from(address, name?)` | Sender address (overrides config default) |
| `.to(address, name?)` / `.to([...])` | Add a recipient (call multiple times, or pass an array of addresses and `{ address, name }`) |
| `.cc(address, name?)` | Add a CC recipient |
| `.bcc(address, name?)` | Add a BCC recipient |
| `.replyTo(address, name?)` | Add a Reply-To address (each call adds one) |
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
> `icalEvent()` takes either the ICS text or a builder callback, as upstream
> does:
>
> ```ts
> mail.icalEvent((calendar) => {
>   calendar.createEvent({ start, end, summary: 'Sprint review' })
> }, { method: 'REQUEST' })
> ```
>
> The callback runs at `build()` time against a real `ical-generator` calendar.
> That package is an **optional peer**: install it only if you build invitations
> this way — passing the ICS text needs nothing.

## Available Transports

### SMTP

Sends through nodemailer's SMTP client. Every nodemailer SMTP option is passed
through as written (`tls`, `pool`, `maxConnections`, timeouts, `dkim`, an OAuth2
`auth` object, `service`, `name`, `proxy`, `logger`); `user`/`pass` is a
shorthand for `auth: { user, pass }`, and `port` may be a numeric string, as an
environment value is.

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

Credentials never travel before TLS is up. On port 465 (`secure: true`, or
`secure` left out) the connection is TLS from the first byte. On 587 the
transport requires STARTTLS: when the server does not offer it, which is all a
man in the middle has to strip from the greeting, the send fails instead of
carrying on in plaintext and sending `AUTH`. `requireTLS: false`, `ignoreTLS`
and `opportunisticTLS` are refused alongside credentials.

A local development server without TLS (Mailpit, MailHog) is the one place to
opt out, by name:

```typescript
{ transport: 'smtp', host: 'localhost', port: 1025, user: 'dev', pass: 'dev', allowInsecureAuth: true }
```

Every text body (text, HTML, watch, calendar invitation) is sent with CRLF line
ends only: a lone CR or LF is turned into CRLF before it reaches the DATA stream,
so user text interpolated into a mail cannot end the message early and smuggle
SMTP commands after it.

### Log (development)

Prints the recipients and the subject of each message to the console. No network connection is made. Useful during development and in CI environments. The body is left out unless `logBody: true` is set, since a mailer left on `log` by mistake would otherwise copy reset links and one-time codes into the logs; every field is JSON-encoded, so a line break in a subject cannot forge a log line.

```typescript
{
  transport: 'log',
  logBody: true, // optional
}
```

The provider refuses to boot when no `config/mail.ts` is registered (`E_MAIL_CONFIG_MISSING`) rather than falling back to this mailer.

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
// mailers: { resend: { transport: 'resend', apiKey: process.env.RESEND_KEY } }
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

- [Warden (Auth)](/en/modules/warden) — Send password reset or verification emails after auth events
- [Bay (Queue)](/en/modules/bay) — Queue mail jobs for background delivery

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

`transports` is rover's older name for the same map. It still works — a config
written against it needs no change — but new configs declare `mailers`.

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

Addresses are stored structured: a bare address, or `{ address, name }` when a
display name was given. `hasFrom('a@b.c')` matches either form; with a display
name, both halves must match.

Each address argument is exactly one mailbox. A value holding a list, a display
form or a comment (`a@x.test, b@y.test`, `Bob <b@y.test>`) is refused with
`E_MAIL_INVALID_ADDRESS`, and a line break or NUL anywhere, including in array
entries, with `E_MAIL_HEADER_INJECTION`: a contact form passing its fields to
`to(email, name)` cannot be turned into a relay.

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

Untouched does not mean unchecked. `header()`, `preparedHeader()` and
`addListHeader()` refuse a name that is not printable ASCII without spaces or a
colon, and a value holding CR, LF or NUL (`E_MAIL_HEADER_INJECTION`): a prepared
value goes on the wire as written, so a line break in it would start a header,
or a body, of the caller's choosing.

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

The SMTP transport sends `MAIL FROM` / `RCPT TO` from the envelope. A provider
API that cannot set it refuses the message with `E_MAIL_FIELD_UNSUPPORTED`
rather than delivering to the header recipients. Each envelope entry is one
address, checked like a recipient.

## Shutting down

```ts
await mail.closeAll()
```

Real on SMTP — it drains nodemailer's pool. A process that exits without it
leaves the server holding sockets until they time out.

Display names and addresses carrying CR, LF or NUL are **rejected**: a line break
cannot be escaped in a header, it ends it, and accepting one is how a contact
form becomes an open relay.
