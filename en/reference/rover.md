# rover

`@c9up/rover`: sending mail for ream, through SMTP, the log mailer or a provider's HTTP API (SES, Mailgun, SendGrid, Resend, Brevo, SparkPost), with templates, retries, queued sending and delivery webhooks. Guide: [Mail](/en/guides/digging-deeper/mail/).

## Installation

```bash
pnpm add @c9up/rover
ream configure @c9up/rover
```

`ream configure @c9up/rover` adds the provider, the `MAIL_MAILER`, `MAIL_FROM`, `SMTP_HOST` and `SMTP_PORT` variables, and writes `config/mail.ts`. Optional peers: `@c9up/ream` (provider), `@c9up/inker` (mail views rendered with inker), `ical-generator` (`icalEvent(callback)`), `@c9up/helix` (the `mailFake()` test plugin).

## Entry points

| Import | Contents |
|---|---|
| `@c9up/rover` | `Mail`, `Mailer`, `MessageBuilder`, `BaseMail`, `defineConfig` and `transports`, the transport classes, retry helpers, the provider class and the error class. Importing it registers every bundled transport. |
| `@c9up/rover/provider` | `RoverProvider` (default export). |
| `@c9up/rover/services/main` | The application's `Mail` (default export), usable once the provider booted. |
| `@c9up/rover/configure` | `configure(codemods)`, run by `ream configure @c9up/rover`. |
| `@c9up/rover/transports/mailgun` | `MailgunTransport`. |
| `@c9up/rover/transports/sendgrid` | `SendGridTransport`. |
| `@c9up/rover/transports/ses` | `SesTransport`. |
| `@c9up/rover/transports/resend` | `ResendTransport`. |
| `@c9up/rover/transports/brevo` | `BrevoTransport`. |
| `@c9up/rover/transports/sparkpost` | `SparkPostTransport`. |
| `@c9up/rover/testing` | `FakeMail` and the `mailFake()` helix plugin. |
| `@c9up/rover/webhooks/mailgun` | `createMailgunWebhookHandler` and its replay store. |
| `@c9up/rover/webhooks/sendgrid` | `createSendGridWebhookHandler`. |
| `@c9up/rover/webhooks/resend` | `createResendWebhookHandler`. |

Each `transports/*` entry exports one class, also exported from `@c9up/rover`; importing the subpath registers that transport under its name.

## Exports

### `@c9up/rover`

| Export | Kind | Description |
|---|---|---|
| `Mail` | class | The mail manager: builds, sends and queues messages through the declared mailers. |
| `Mailer` | class | One named mailer, from `mail.use(name)`. |
| `MailResponse` | class | What a send resolves to. |
| `MessageBuilder` | class | The fluent message a send callback fills. |
| `BaseMail` | class | Base of a class-based mail. |
| `defineConfig` | function | Types the `mail` config. |
| `transports` | const | One descriptor helper per bundled transport. |
| `registerTransport` | function | Registers a custom transport factory under a name. |
| `SmtpTransport` | class | SMTP through nodemailer. |
| `LogTransport` | class | Logs each message instead of sending it. |
| `SesTransport`, `MailgunTransport`, `SendGridTransport`, `ResendTransport`, `BrevoTransport`, `SparkPostTransport` | class | Provider HTTP API transports. |
| `RoverProvider` | provider | Also the default export of `@c9up/rover/provider`. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors). Each is a flare `Exception` with a string `code`. |
| `DEFAULT_RETRY_CONFIG` | const | `{ maxAttempts: 3, baseDelayMs: 500, factor: 2, maxDelayMs: 10000 }`. |
| `isRetryableError` | function | Whether a send failure is worth retrying. |
| `RetryConfig` | interface | `{ maxAttempts: number; baseDelayMs: number; factor: number; maxDelayMs?: number }`. |
| `attachmentsFor` | function | A message's attachments plus its calendar invitation as a `text/calendar` part. |
| `listHeaders` | function | A message's `List-*` headers as a plain header map. |
| `headersWithList` | function | A message's headers plus its rendered `List-*` headers. |
| `headerValue` | function | A header value as a plain string or string array. |
| `MailConfig` | interface | The `mail` config. |
| `TransportDescriptor` | interface | One mailer's settings: `{ transport: string; retry?: RetryConfig; [key: string]: unknown }`. |
| `MailTransport` | interface | What a transport implements. |
| `MailTransportFactory` | type | `(config: Record<string, unknown>) => MailTransport`. |
| `MailSendResult`, `MailSendOutcome` | type | What a transport's `send` returns. |
| `MailMessage` | interface | A built message. |
| `MailAttachment` | interface | One attachment. |
| `MailAddress` | type | `string \| { address: string; name?: string }`. |
| `Recipient`, `RecipientInput`, `RecipientObject` | type | A recipient, as stored and as the builder accepts it. |
| `MailEnvelope` | interface | The SMTP envelope: `from`, `to`, `cc`, `bcc`. |
| `MailResponseEnvelope` | type | The envelope a `MailResponse` carries. |
| `AttachmentOptions`, `EmbedImageOptions` | type | Options of the `attach*` and `embed*` methods. |
| `ListHeader` | type | `string \| { url: string; comment: string }`. |
| `CalendarEvent`, `CalendarEventMethod`, `CalendarEventOptions` | type | A calendar invitation. |
| `PreparedHeader` | interface | `{ prepared: true; value: string }`: a header passed through unencoded. |
| `TemplateEngine` | interface | What renders `htmlView`, `textView` and `watchView`. |
| `MessageBodyTemplates` | interface | The templates a message was rendered from. |
| `MailHooks` | interface | `onSending`, `onSent`, `onFailed`, `onQueueing`, `onQueued` callbacks. |
| `EmitterLike` | interface | `{ emit(event: string, data: unknown): unknown }`. |
| `MailEventBase`, `MailSendingEvent`, `MailSentEvent`, `MailFailedEvent`, `MailQueueEvent` | interface | The payloads of the `mail:*` events. |

### `Mail`

| Member | Signature | Description |
|---|---|---|
| constructor | `new Mail(config: MailConfig, options?: { queue?: BayQueueLike; hooks?: MailHooks; emitter?: EmitterLike })` | Throws `E_MAIL_UNKNOWN_MAILER` when `default` is not a declared mailer. |
| `send` | `send(callback: (message: MessageBuilder) => void, transport?: string): Promise<MailResponse>`<br>`send(instance: BaseMail, transport?: string): Promise<MailResponse>` | Builds and sends through the named mailer, or the default one. |
| `sendLater` | `sendLater(arg: ((message: MessageBuilder) => void) \| BaseMail, options?: { transport?: string; queue?: string }): Promise<string>` | Queues the send and resolves the job id. Without a wired queue, an in-memory messenger sends it on the next microtask. |
| `sendCompiled` | `sendCompiled(message: MailMessage, transport?: string): Promise<MailResponse>` | Sends a message already built. |
| `sendLaterCompiled` | `sendLaterCompiled(message: MailMessage, options?: { transport?: string; queue?: string }): Promise<string>` | Queues a message already built. |
| `dispatchMessage` | `dispatchMessage(message: MailMessage, transportName?: string, overrideRetry?: RetryConfig, views?: MessageBodyTemplates): Promise<MailResponse>` | The send with retries, events and hooks that the other methods go through. |
| `setMessenger` | `setMessenger(messenger: BayQueueLike): this` | Hands `sendLater` a queue after construction. |
| `use` | `use(name?: string): Mailer` | The named mailer (the default one without a name), cached per name. |
| `close` | `close(name?: string): Promise<void>` | Closes one transport's connections; an unknown name does nothing. |
| `closeAll` | `closeAll(): Promise<void>` | Closes every transport built so far. |
| `fake` | `fake(): FakeMail` | Captures every `send` and `sendLater` instead of delivering. |
| `restore` | `restore(): void` | Leaves fake mode. |

With an emitter, a send emits `mail:sending`, then `mail:sent` or `mail:failed`; `sendLater` emits `mail:queueing` and `mail:queued`.

### `Mailer`

| Member | Signature | Description |
|---|---|---|
| `name` | `get name(): string` | The mailer's name. |
| `transport` | `get transport(): MailTransport` | Its transport instance. |
| `send` | `send(arg: ((message: MessageBuilder) => void) \| BaseMail): Promise<MailResponse>` | Sends through this mailer. |
| `sendLater` | `sendLater(arg: ((message: MessageBuilder) => void) \| BaseMail, options?: { queue?: string }): Promise<string>` | Queues for this mailer. |
| `sendCompiled` | `sendCompiled(message: MailMessage): Promise<MailResponse>` | |
| `sendLaterCompiled` | `sendLaterCompiled(message: MailMessage, options?: { queue?: string }): Promise<string>` | |
| `close` | `close(): Promise<void>` | Closes this mailer's transport connections. |

### `MailResponse`

| Member | Signature | Description |
|---|---|---|
| `messageId` | `messageId: string` | The id to correlate with provider webhooks. |
| `envelope` | `envelope: MailResponseEnvelope` | The envelope used. |
| `original` | `original: T` | The transport's raw result. |

### `MessageBuilder`

| Group | Signatures |
|---|---|
| Addresses | `from(address: string, name?: string): this`<br>`to(address: string, name?: string): this` / `to(addresses: RecipientInput[]): this`<br>`cc(…)`, `bcc(…)` (same overloads)<br>`replyTo(address: string, name?: string): this`<br>`envelope(envelope: MailEnvelope): this` |
| Content | `subject(text: string): this`<br>`html(content: string): this`, `text(content: string): this`<br>`watch(content: string): this`, `watchHtml(content: string): this` |
| Templates | `htmlView(viewPath: string, data?: Record<string, unknown>): this`<br>`textView(path: string, data?: Record<string, unknown>): this`<br>`watchView(viewPath: string, data?: Record<string, unknown>): this` |
| Attachments | `attach(file: string \| URL, options?: AttachmentOptions): this`<br>`attachData(content: Buffer \| string, options: AttachmentOptions & { filename: string }): this`<br>`embed(file: string \| URL, cid: string, options?: AttachmentOptions): this`<br>`embedData(content: Buffer \| string, cid: string, options?: AttachmentOptions): this` |
| Headers | `header(key: string, value: string \| string[]): this`<br>`preparedHeader(key: string, value: string): this`<br>`priority(priority: 'low' \| 'normal' \| 'high'): this`<br>`messageId(messageId: string): this`, `inReplyTo(messageId: string): this`, `references(messageIds: string[]): this`<br>`encoding(encoding: string): this` |
| List headers | `addListHeader(key: string, value: ListHeader \| ListHeader[] \| ListHeader[][]): this`<br>`listUnsubscribe(value, options?: { oneClick?: boolean }): this` (a one-click target must be https)<br>`listSubscribe(value): this`, `listHelp(value): this` |
| Calendar | `icalEvent(contents: string \| CalendarEventCallback, options?: CalendarEventOptions): this`<br>`icalEventFromFile(file: string \| URL, options?: CalendarEventOptions): this`<br>`icalEventFromUrl(url: string, options?: CalendarEventOptions): this` |
| Inspection | `hasTo`, `hasCc`, `hasBcc`, `hasFrom`, `hasReplyTo`, `hasAnyRecipient` `(address?: string, name?: string): boolean`<br>`hasRecipient(property: 'to' \| 'cc' \| 'bcc' \| 'replyTo', address: string, name?: string): boolean`<br>`hasSubject(subject?: string)`, `hasContent(needle: string)`, `hasHeader(name: string, value?: string)`, `hasListHeader(key: string, url?: string)`, `hasAttachment(match?: string \| URL \| ((attachment: MailAttachment) => boolean))` |
| Assertions | `assertTo`, `assertFrom`, `assertCc`, `assertBcc`, `assertReplyTo`, `assertRecipient` `(address: string): void`<br>`assertSubject(subject: string)`, `assertContent(needle: string)`, `assertHeader(name: string, value?: string)`, `assertAttachment(match)`<br>`assertHtmlIncludes(substring: string)`, `assertTextIncludes(substring: string)`, `assertWatchIncludes(substring: string \| RegExp)`; each throws an `AssertionError` from `node:assert` |
| Output | `build(viewsRoot?: string, globals?: Record<string, unknown>): Promise<MailMessage>`<br>`toObject(): Readonly<MailMessage>`, `toJSON(): Readonly<MailMessage>`<br>`get views(): MessageBodyTemplates`, `get contentViews(): MessageBodyTemplates`, `get nodeMailerMessage(): MailMessage` |
| Static | `static templateEngine: TemplateEngine \| undefined`: the engine views render with; unset, rover's built-in `{{ }}` engine renders `.html` files under `viewsRoot`. The provider sets inker's when the app uses it. |

### `BaseMail`

An abstract class: a mail written as a class.

| Member | Signature | Description |
|---|---|---|
| `message` | `readonly message: MessageBuilder` | The message this mail builds. |
| `from`, `replyTo` | `MailAddress` | Applied before `prepare()`. |
| `subject` | `string` | Applied before `prepare()`. |
| `built` | `boolean` | Whether `build` already ran; a second build returns the first message. |
| `prepare` | `abstract prepare(): void \| Promise<void>` | Fills `this.message`. |
| `send` | `send<R>(mailer: MailSender<R>): Promise<R>` | Sends this mail through `mailer`. |
| `sendLater` | `sendLater(mailer: MailSender<unknown>): Promise<void>` | Queues it. |
| `build` | `build(viewsRoot?: string, globals?: Record<string, unknown>): Promise<MailMessage>` | Builds the message and renders its templates. |
| `buildWithContents` | `buildWithContents(viewsRoot?: string, globals?: Record<string, unknown>): Promise<MailMessage>` | The same as `build`. |

### Transports

| Function | Signature | Description |
|---|---|---|
| `registerTransport` | `registerTransport(name: string, factory: MailTransportFactory): void` | Makes `transport: name` usable in `mailers`. |
| `defineConfig` | `defineConfig(config: MailConfig): MailConfig` | Returns the config, typed. |
| `isRetryableError` | `isRetryableError(err: unknown): boolean` | True for a provider 429 or 5xx, a transient SMTP failure, or a network error such as `ETIMEDOUT` or `ECONNRESET`. |

`MailTransport` is `{ send(message: MailMessage): Promise<MailSendOutcome>; close?(): Promise<void> }`; `MailSendResult` is `{ providerId?: string; envelope?: MailResponseEnvelope; original?: unknown }`.

`transports` holds `smtp`, `ses`, `mailgun`, `sparkpost`, `resend`, `brevo`, `sendgrid` and `log`, each `(config?: Record<string, unknown> & { retry?: RetryConfig }) => TransportDescriptor`.

| Transport | Settings it reads |
|---|---|
| `smtp` | `host` (required), `port`, `user` and `pass` (both or neither) or `auth`, `requireTLS`, `ignoreTLS`, `opportunisticTLS`, `allowInsecureAuth`; other keys go to nodemailer's SMTP options. Credentials are refused with TLS off unless `allowInsecureAuth: true`. `new SmtpTransport(config, options?: { transporter?: SmtpTransporter })`. |
| `log` | `logBody` (default `false`). |
| `ses` | `accessKeyId`, `secretAccessKey`, `region`. |
| `mailgun` | `apiKey`, `domain`, `region` (`'us'` or `'eu'`), `baseUrl`. |
| `sendgrid` | `apiKey`, `baseUrl`. |
| `resend` | `apiKey`. |
| `brevo` | `apiKey` (or `key`), `baseUrl`. |
| `sparkpost` | `apiKey` (or `key`), `baseUrl`. |

Every transport class takes `new XTransport(config: Record<string, unknown>)` and implements `MailTransport`.

### `@c9up/rover/provider`

| Export | Kind | Description |
|---|---|---|
| `RoverProvider` | provider (default) | `register()` binds `Mail` from the `mail` config, with the `QueueManager` and `Emitter` bindings when they exist; `boot()` renders mail views with inker when the app uses it; `shutdown()` undoes that. |

### `@c9up/rover/services/main`

| Export | Kind | Description |
|---|---|---|
| `default` | const | The application's `Mail`. Any property access before the provider booted throws. |

```ts
import mail from '@c9up/rover/services/main'

await mail.send((message) => {
  message.to(user.email).subject('Welcome').htmlView('welcome', { user })
})
```

### `@c9up/rover/configure`

| Export | Kind | Description |
|---|---|---|
| `configure` | function | `configure(codemods): Promise<void>`: what `ream configure @c9up/rover` runs. |

### `@c9up/rover/testing`

| Export | Kind | Description |
|---|---|---|
| `FakeMail` | class | Captures sent and queued messages; returned by `mail.fake()`. |
| `FakeMailPredicate` | interface | Matches on `from`, `to`, `cc`, `bcc`, `replyTo`, `subject`, or `containing`. |
| `FakeMailPredicateArg` | type | A `FakeMailPredicate` or `(m: MailMessage) => boolean`. |
| `MailConstructor` | type | A `BaseMail` subclass, for the class form of the assertions. |
| `FakeableMailer` | interface | `{ fake(): FakeMail; restore(): void }`: what `mailFake` takes. |
| `mailFake` | function | `mailFake(mailer: FakeableMailer): (api: MailPluginHost) => void`: a helix plugin that puts a fresh `FakeMail` on each test's context as `ctx.mail` and restores the mailer after the test. |
| `MailPluginHost` | type | The part of helix's plugin API it uses. |

| `FakeMail` member | Signature | Description |
|---|---|---|
| `getSent`, `getQueued` | `(): MailMessage[]` | What was captured. |
| `reset` | `reset(): void` | Forgets everything captured. |
| `assertSent`, `assertNotSent`, `assertQueued`, `assertNotQueued` | `(predicate: FakeMailPredicateArg): void`<br>`<T extends BaseMail>(mailConstructor: MailConstructor<T>, findFn?: (mail: T) => boolean): void` | By content, or by the `BaseMail` class that built it. |
| `assertSentCount`, `assertQueuedCount` | `(count: number): void`<br>`(mailConstructor: MailConstructor<BaseMail>, count: number): void` | |
| `assertNoneSent`, `assertNoneQueued` | `(): void` | |

Each assertion of the fake throws an `AssertionError` from `node:assert` when it does not hold.

### Webhooks

Each handler is a `WebhookMiddleware`, `(ctx, next) => Promise<void>`, to mount on a route that keeps the raw body. It verifies the provider's signature, refuses a stale one (default 300 seconds), answers 401 or 400 on a refusal and 200 otherwise, and emits `mail.delivered`, `mail.bounced` or `mail.failed` on the emitter; an emitter failure never fails the answer.

| Import | Export | Signature |
|---|---|---|
| `@c9up/rover/webhooks/mailgun` | `createMailgunWebhookHandler` | `(options: MailgunWebhookOptions) => WebhookMiddleware`; options `signingKey`, `emitter`, `maxAgeSeconds?`, `tokenStore?` |
| `@c9up/rover/webhooks/mailgun` | `MemoryWebhookTokenStore` | `new MemoryWebhookTokenStore(options?: { maxEntries?: number })` (default 10000): the in-process store of used signature tokens; `claim(token, ttlSeconds): boolean`, `size` |
| `@c9up/rover/webhooks/mailgun` | `WebhookTokenStore` | `{ claim(token: string, ttlSeconds: number): boolean \| Promise<boolean> }`: pass a shared one behind several instances |
| `@c9up/rover/webhooks/sendgrid` | `createSendGridWebhookHandler` | `(options: SendGridWebhookOptions) => WebhookMiddleware`; options `publicKey` (Ed25519, base64 DER or PEM), `emitter`, `maxAgeSeconds?` |
| `@c9up/rover/webhooks/resend` | `createResendWebhookHandler` | `(options: ResendWebhookOptions) => WebhookMiddleware`; options `secret` (`whsec_…` or raw base64), `emitter`, `maxAgeSeconds?` |

A Mailgun signature token is accepted once: a replay answers 401.

## Configuration

`config/mail.ts`, written by `ream configure @c9up/rover`:

| Option | Type | Default | Description |
|---|---|---|---|
| `default` | `string` | required | The mailer used when none is named; must be a key of `mailers`. The generated config reads `MAIL_MAILER` with no fallback. |
| `from` | `MailAddress` | required | Default sender. |
| `mailers` | `Record<string, TransportDescriptor>` | | The declared mailers, built with `transports.*`. `transports` is an older spelling, merged with `mailers`. |
| `globals` | `Record<string, unknown>` | `{}` | Shared with every template. |
| `viewsRoot` | `string` | `'resources/views/emails'` | Root of `htmlView` lookups for the built-in engine. |
| `queue.name` | `string` | `'mail.send'` | The queue job name `sendLater` dispatches. |
| `queue.maxAttempts` | `number` | `3` | Attempts of a queued send. |
| `retry` | `Partial<RetryConfig>` | `DEFAULT_RETRY_CONFIG` | Process-wide retry; a mailer's own `retry` overrides it. |

## Container bindings

| Token | Resolves to |
|---|---|
| `Mail` | The `Mail` singleton. |
| `'rover.mail'` | The same instance. |
| `'mail'` | The same instance (earlier name, still bound). |

The string tokens are declared on `ContainerBindings`.

## Errors

Each code is a class of the `errors` namespace (`import { errors } from '@c9up/rover'`): a flare `Exception` with `code`, `status` (500 for all of them) and, when the place that raises it knows how to fix it, `help`. `E_INVALID_CONFIG` and `E_MAIL_TRANSPORT_ERROR` are built as `new errors.E_INVALID_CONFIG(message, { cause })`; `E_MAIL_TRANSPORT_ERROR` also takes `context` and `help` in that object. Four of them also carry `context`, a `Record<string, string>`:

| Class | `context` |
|---|---|
| `E_MAIL_TRANSPORT_ERROR` | `provider`, `upstreamStatus` (HTTP status or SMTP reply code, `"0"` when none came back), `providerMessage`, `networkCode` (an errno such as `ECONNRESET`), `retryAfter` (seconds) and, once the send gave up, `attempts`. |
| `E_MAIL_FIELD_UNSUPPORTED` | `provider`, `field`. |
| `E_MAIL_TEMPLATE_NOT_FOUND` | `path`, `viewsRoot`, and `paths` (the candidates looked at). Empty when the native engine reports a missing partial. |
| `E_MAIL_TEMPLATE_READ_ERROR` | `path`, `code` (the errno), `viewsRoot`. |

| Code | Raised when |
|---|---|
| [`E_MAIL_INVALID_MESSAGE`](/en/reference/errors#e-mail-invalid-message) | A message lacks what sending needs (a `from` address, a recipient…). |
| [`E_MAIL_INVALID_ADDRESS`](/en/reference/errors#e-mail-invalid-address) | An address is not a valid mail address. |
| [`E_MAIL_HEADER_INJECTION`](/en/reference/errors#e-mail-header-injection) | A header value contains a line break or NUL. |
| [`E_INVALID_LIST_HEADER`](/en/reference/errors#e-invalid-list-header) | A `List-*` entry is not one URL (https, http, mailto or ftp) or bare address. |
| [`E_MAIL_FIELD_UNSUPPORTED`](/en/reference/errors#e-mail-field-unsupported) | The transport cannot set a field the message uses. |
| [`E_ATTACHMENT_UNREADABLE`](/en/reference/errors#e-attachment-unreadable) | An attachment's file cannot be read. |
| [`E_INVALID_CONFIG`](/en/reference/errors#e-invalid-config) | A transport's config is missing a property or holds an invalid one. |
| [`E_MAIL_TRANSPORT_ERROR`](/en/reference/errors#e-mail-transport-error) | The transport failed to send; `context` carries the status or network code. |
| [`E_MAIL_RETRY_CONFIG`](/en/reference/errors#e-mail-retry-config) | A retry setting is out of range. |
| [`E_MAIL_CONFIG_MISSING`](/en/reference/errors#e-mail-config-missing) | No `mail` config is registered. |
| [`E_MAIL_UNKNOWN_MAILER`](/en/reference/errors#e-mail-unknown-mailer) | A mailer name, or the default mailer, is not declared. |
| [`E_MAIL_UNKNOWN_TRANSPORT`](/en/reference/errors#e-mail-unknown-transport) | A mailer names a transport that is not registered. |
| [`E_MAIL_JOB_MALFORMED`](/en/reference/errors#e-mail-job-malformed) | A queued mail job's payload is missing or not an object. |
| [`E_MAIL_TEMPLATE_ENGINE`](/en/reference/errors#e-mail-template-engine) | The app uses inker but rover cannot render mail views with it. |
| [`E_MAIL_TEMPLATE_NOT_FOUND`](/en/reference/errors#e-mail-template-not-found) | A mail template is not found. |
| [`E_MAIL_TEMPLATE_READ_ERROR`](/en/reference/errors#e-mail-template-read-error) | A mail template cannot be read. |
| [`E_MAIL_TEMPLATE_SYNTAX`](/en/reference/errors#e-mail-template-syntax) | A mail template has a syntax error. |
| [`E_MAIL_TEMPLATE_RECURSION`](/en/reference/errors#e-mail-template-recursion) | Mail templates include each other too deep. |
| [`E_MAIL_TEMPLATE_NAPI_REQUIRED`](/en/reference/errors#e-mail-template-napi-required) | There is no rover native binary for this platform. |
| [`E_ROVER_ICAL_UNAVAILABLE`](/en/reference/errors#e-rover-ical-unavailable) | `icalEvent(callback)` needs `ical-generator`, which is not installed or does not build a calendar. |
| [`E_ROVER_UNKNOWN`](/en/reference/errors#e-rover-unknown) | A send failed with an error that carries no code of its own. Only the `error.code` of a `mail:failed` event: there is no class. |
| [`E_ROVER_NOT_BOOTED`](/en/reference/errors#e-rover-not-booted) | The `services/main` mail singleton was used before `RoverProvider` booted. |
| [`E_ROVER_FAKE_ACTIVE`](/en/reference/errors#e-rover-fake-active) | `mail.fake()` was called while a fake is already active; call `restore()` first. |
| [`E_ROVER_INVALID_PREDICATE`](/en/reference/errors#e-rover-invalid-predicate) | A fake-mailer assertion got an empty `containing` needle, which would match every message. |
| [`E_ROVER_ABSTRACT_MAIL`](/en/reference/errors#e-rover-abstract-mail) | `BaseMail` was instantiated directly instead of through a subclass. |
| [`E_ROVER_WEBHOOK_KEY_MISSING`](/en/reference/errors#e-rover-webhook-key-missing) | A webhook handler was created without its secret, public key or signing key. |
| [`E_ROVER_WEBHOOK_INVALID_SECRET`](/en/reference/errors#e-rover-webhook-invalid-secret) | The Resend webhook secret is not valid base64, or decodes to fewer than 16 bytes. |
| [`E_ROVER_INTERNAL`](/en/reference/errors#e-rover-internal) | An internal invariant broke (nodemailer composed no message); report it as a bug. |

## Migration

- `RoverError` is gone. Replace `instanceof RoverError` with a test on `error.code`, or with `instanceof errors.E_MAIL_TRANSPORT_ERROR` (or the class of the code you expect), `errors` coming from `@c9up/rover`.
- `error.hint` is now `error.help`.
- `context` stays on the four classes listed under [Errors](#errors) only; the other errors have none. `context.attempts` is set on an `E_MAIL_TRANSPORT_ERROR` only.
- `E_MAIL_PROVIDER_ERROR` is now `E_MAIL_TRANSPORT_ERROR`. It is built as `new errors.E_MAIL_TRANSPORT_ERROR(message, { context, cause, help })`: `context` moved from the second argument into the options.
- `E_MAIL_PROVIDER_CONFIG` is now `E_INVALID_CONFIG` for a transport config that is missing or invalid; a missing key reads `Invalid config for "resend" transport. The "apiKey" property is missing`. A message without recipients now raises `E_MAIL_INVALID_MESSAGE`, and `icalEvent(callback)` without a usable `ical-generator` raises `E_ROVER_ICAL_UNAVAILABLE`.
- `E_ASSERTION_FAILED` is gone: the message assertions and the fake mailer's assertions throw an `AssertionError` from `node:assert`.
- `docsUrl`, `sourceFile`, `sourceLine` and `pipelineStage` are gone: nothing set them.
- The `name` of an error is no longer `"RoverError"`.

## See also

- [Introduction](/en/guides/digging-deeper/mail/)
- [Messages](/en/guides/digging-deeper/mail/messages)
- [Transports](/en/guides/digging-deeper/mail/transports)
- [Queues and events](/en/guides/digging-deeper/mail/queues-and-events)
- [goldstone](/en/reference/goldstone), for reading mail
