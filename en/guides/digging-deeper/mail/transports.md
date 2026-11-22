# Transports

This guide covers the transports:

- Available Transports
- One mailer by name

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

### Provider APIs

Mailgun, SparkPost and SES receive the message as nodemailer composes it for
SMTP (Mailgun `messages.mime`, SparkPost `email_rfc822`, SES `SendRawEmail`):
display names encoded on their own, bodies transfer-encoded, threading headers,
priority, `List-*`, inline `cid:` images and the watch body arrive exactly as
they would over SMTP, and bcc recipients are delivered without a `Bcc` header.

Resend, SendGrid and Brevo take JSON. Rover hands them `Message-ID`,
`In-Reply-To`, `References`, the priority headers and `List-*` as custom
headers, and addresses as `{ email, name }`. An `embed()` image goes inline
(`content_id`) on Resend and SendGrid; Brevo has no inline parts and receives
it as a regular attachment. These three APIs have no watch body.

The envelope: SES sends it as `Source` and `Destinations`, SparkPost as
`return_path` and the recipient list, Mailgun accepts envelope recipients but
not an envelope sender, and the JSON APIs refuse it (`E_MAIL_FIELD_UNSUPPORTED`).

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
  readonly #config: Record<string, unknown>

  constructor(config: Record<string, unknown>) {
    this.#config = config
  }

  async send(message: MailMessage): Promise<void> {
    // call Resend API using this.#config.apiKey
  }
}

registerTransport('resend', (config) => new ResendTransport(config))

// Now you can reference `transport: 'resend'` in your mail config:
// mailers: { resend: { transport: 'resend', apiKey: process.env.RESEND_KEY } }
```

A config that names a transport nobody registered fails when `Mail` is
constructed (`E_MAIL_UNKNOWN_TRANSPORT`), with a hint to call `registerTransport()` first: register it before
the provider builds the mailers (at the top of a preload file, for instance).

## One mailer by name

```ts
mail.use()                                   // the `default` mailer
const ses = mail.use('ses')
await ses.send((m) => m.to(user.email).subject('Hi').text('…'))
await ses.sendCompiled(builtMessage)
await ses.sendLaterCompiled(builtMessage, { queue: 'mail' })
await ses.close()                            // that transport's connections only
```

`use()` without a name is the mailer `default` names. The `Mailer` it returns
carries the per-message methods, each bound to its own transport. The queue
stays one per `Mail`: `setMessenger()` is on the manager, not on a `Mailer`.
