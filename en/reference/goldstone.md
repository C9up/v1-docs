# goldstone

`@c9up/goldstone`: reading mail for ream: IMAP mailboxes (watched in real time with IDLE) and the inbound mail providers post to a webhook, each message parsed as hostile input, its HTML sanitized and its sender checked (DKIM, SPF, DMARC, ARC). Sending stays with [rover](/en/reference/rover).

## Installation

```bash
pnpm add @c9up/goldstone
```

Add `() => import('@c9up/goldstone/provider')` to the providers in `reamrc.ts` and create `config/inbox.ts`. Parsing and the sender checks run on a Rust engine shipped as a prebuilt binary; `@c9up/ream` is an optional peer.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/goldstone` | `defineConfig`, `InboxManager`, `Mailbox`, message parsing (`parseMessage`, `readMessage`), the sender check (`authenticate`), the Mailgun inbound handler and the error classes. |
| `@c9up/goldstone/provider` | `GoldstoneProvider` (default export): binds the `InboxManager` built from `config/inbox.ts`. |
| `@c9up/goldstone/services/main` | The application's `InboxManager` (default export), resolved on first member access. |

## Exports

### `@c9up/goldstone`

| Export | Kind | Description |
|---|---|---|
| `defineConfig` | function | Checks and types `config/inbox.ts`. |
| `InboxConfig` | interface | The `inbox` config. |
| `MailboxConfig` | interface | One IMAP mailbox. |
| `PasswordAuth`, `TokenAuth` | interface | A mailbox's credentials. |
| `InboxManager` | class | The configured mailboxes, by name. |
| `Mailbox` | class | One IMAP mailbox: search, fetch, flag, move, delete, watch. |
| `MailboxOptions` | interface | `limits`, `authenticate`, `remoteContent` for every message read. |
| `SearchCriteria` | type | IMAP search criteria (imapflow's search object). |
| `WatchOptions` | interface | Options of `Mailbox.watch`. |
| `reconnectDelay` | function | The wait before reconnect attempt `n`. |
| `parseMessage` | function | Parses raw message bytes, without DNS. |
| `readMessage` | function | Parses raw message bytes and checks the sender. |
| `ReceivedMessage` | class | A parsed message. |
| `ParseOptions`, `ReadOptions` | interface | Options of `parseMessage` and `readMessage`. |
| `Limits` | interface | Bounds applied while parsing. |
| `Address` | interface | `{ readonly name?: string; readonly address?: string }`. |
| `Header` | interface | `{ readonly name: string; readonly value: string }`, the value as received. |
| `Attachment` | interface | One attachment. |
| `authenticate` | function | Checks who sent raw message bytes. |
| `Authenticity` | interface | The sender verdict. |
| `AuthenticateOptions` | interface | The envelope and bounds of the check. |
| `AuthResult` | type | `'pass' \| 'fail' \| 'softfail' \| 'neutral' \| 'none' \| 'temperror' \| 'permerror'`. |
| `DkimVerdict` | interface | One DKIM signature's verdict. |
| `DmarcPolicy` | type | `'none' \| 'quarantine' \| 'reject' \| 'unspecified'`. |
| `createMailgunInboundHandler` | function | A route handler for Mailgun's inbound mail. |
| `MailgunInboundOptions` | interface | Its options. |
| `InboundMeta` | interface | `{ recipient?: string; sender?: string }`: the SMTP envelope. |
| `InboundHttpContext`, `InboundResponse` | interface | The HTTP context the handler needs. |
| `ReplayGuard` | interface | Where handled delivery tokens are remembered. |
| `MemoryReplayGuard` | class | The in-process `ReplayGuard`. |
| `isNativeAvailable` | function | Whether the Rust engine is loaded. |
| `GoldstoneError` | error | Every failure of goldstone. |
| `GoldstoneNativeRequiredError` | error | The Rust engine is not loaded. |
| `fromEngine` | function | Turns an engine failure into a `GoldstoneError` with its code. |

### `InboxManager`

| Member | Signature | Description |
|---|---|---|
| constructor | `new InboxManager<Mailboxes>(config: InboxConfig<Mailboxes>)` | |
| `mailbox` | `mailbox(name?: keyof Mailboxes & string): Mailbox` | A mailbox by name, the default one without; opens nothing yet. An unknown name throws `E_GOLDSTONE_UNKNOWN_MAILBOX`. |
| `closeAll` | `closeAll(): Promise<void>` | Stops every watch and logs out of every mailbox. |

### `Mailbox`

Every method that takes a `folder` defaults to `'INBOX'`. Messages are read with `readMessage`, under the mailbox's limits.

| Member | Signature | Description |
|---|---|---|
| constructor | `new Mailbox(name: string, config: MailboxConfig, options?: MailboxOptions)` | Refuses a connection without TLS or certificate check (see Configuration). |
| `name` | `readonly name: string` | |
| `folders` | `folders(): Promise<string[]>` | Every folder's path. |
| `search` | `search(criteria: SearchCriteria, folder?: string): Promise<number[]>` | UIDs of the matching messages, sorted. |
| `fetch` | `fetch(uid: number, folder?: string): Promise<ReceivedMessage \| undefined>` | One message, or `undefined` when no message has that UID. A message the server says is over `maxBytes` is refused before download. |
| `markSeen`, `markUnseen` | `(uids: number \| number[], folder?: string): Promise<void>` | Sets or clears `\Seen`. |
| `move` | `move(uids: number \| number[], to: string, folder?: string): Promise<void>` | Moves messages to another folder. |
| `delete` | `delete(uids: number \| number[], folder?: string): Promise<void>` | Deletes messages. |
| `watch` | `watch(handler: (message: ReceivedMessage, meta: { uid: number }) => unknown, options?: WatchOptions): () => Promise<void>` | Calls `handler` for each new message as it arrives, on its own connection; returns the function that stops the watch. A lost connection reopens with a growing wait and nothing is skipped or delivered twice; a handler that throws does not stop the watch. |
| `close` | `close(): Promise<void>` | Stops every watch and logs out. |

| `WatchOptions` field | Type | Default | Description |
|---|---|---|---|
| `folder` | `string` | `'INBOX'` | The folder watched. |
| `afterUid` | `number` | | Deliver messages after this UID; without it, only what arrives once watching started. |
| `onError` | `(error: unknown) => void` | `console.error` | Told about what does not stop the watch: a lost connection, a refused message, a handler that threw, UIDs reset (`E_GOLDSTONE_UIDVALIDITY_CHANGED`). |

| Function | Signature | Description |
|---|---|---|
| `reconnectDelay` | `reconnectDelay(attempt: number): number` | 0.5 s, 1 s, 2 s… up to 30 s, in ms. |

### Parsing

| Function | Signature | Description |
|---|---|---|
| `parseMessage` | `parseMessage(raw: Uint8Array, options?: ParseOptions): Promise<ReceivedMessage>` | Parses raw RFC 5322 bytes off the event loop. No DNS: `authenticity` is absent. |
| `readMessage` | `readMessage(raw: Uint8Array, options?: ReadOptions): Promise<ReceivedMessage>` | Parses and checks the sender from one parse, the verdict on `message.authenticity`. |
| `authenticate` | `authenticate(raw: Uint8Array, options?: AuthenticateOptions): Promise<Authenticity>` | Checks who sent the message. |
| `isNativeAvailable` | `isNativeAvailable(): boolean` | |
| `fromEngine` | `fromEngine(error: unknown): GoldstoneError` | |

| Option | Type | Default | Description |
|---|---|---|---|
| `ParseOptions.limits` | `Limits` | see below | Bounds applied while parsing. |
| `ParseOptions.remoteContent` | `'block' \| 'allow'` | `'block'` | Whether the sanitized `html` may load remote images, backgrounds and posters. `cid:` references and links stay either way. |
| `ReadOptions.authenticate` | `boolean \| AuthenticateOptions` | `true` | Check DKIM, SPF and DMARC. |
| `AuthenticateOptions.ip`, `helo`, `mailFrom` | `string` | | The delivering server's IP, HELO and MAIL FROM: what SPF checks. Without them SPF is `none`. |
| `AuthenticateOptions.maxDkimSignatures` | `number` | `5` | DKIM signatures checked, at most. |
| `AuthenticateOptions.timeoutMs` | `number` | `10000` | For the whole check; past it, `temperror`. |
| `AuthenticateOptions.maxBytes` | `number` | 25 MiB | Size of the raw message, checked first. |

| `Limits` field | Default | Description |
|---|---|---|
| `maxBytes` | 25 MiB | Size of the raw message, checked before parsing. |
| `maxParts` | 1000 | MIME parts, carried messages' parts included. |
| `maxDepth` | 32 | Nesting depth of multiparts and carried messages. |
| `maxHeaders` | 1000 | Header fields in one header block. |
| `maxHeaderBytes` | 1 MiB | Size of one header block. |
| `maxAttachments` | 100 | Number of attachments. |
| `maxAttachmentBytes` | 25 MiB | Size of one decoded attachment. |
| `maxHtmlBytes` | 512 KiB | Size of the HTML body that is sanitized; over it, the message is read without `html`. |

Every limit is a positive integer under 2^32.

### `ReceivedMessage`

| Member | Type | Description |
|---|---|---|
| `messageId`, `subject` | `string \| undefined` | |
| `date` | `Date \| undefined` | |
| `from`, `to`, `cc`, `bcc`, `replyTo` | `readonly Address[]` | |
| `inReplyTo`, `references` | `readonly string[]` | |
| `headers` | `readonly Header[]` | Every header, as received. |
| `text` | `string \| undefined` | The text body. |
| `html` | `string \| undefined` | Sanitized for display: no script, no event handler, no `javascript:` URL, no remote content unless allowed. |
| `htmlError` | `GoldstoneError \| undefined` | Why `html` is absent although the message has an HTML body (`E_GOLDSTONE_HTML_TOO_LARGE`, `…_TOO_DEEP`, `…_TOO_COMPLEX`). |
| `attachments` | `readonly Attachment[]` | |
| `authenticity` | `Authenticity \| undefined` | Present when read with `readMessage`. |
| `header(name)` | `header(name: string): string \| undefined` | The first header of that name, any case. |
| `unsanitizedHtml()` | `unsanitizedHtml(): string \| undefined` | The HTML as the sender wrote it; never render it. |

| `Attachment` field | Type | Description |
|---|---|---|
| `fileName` | `string` | Safe to save under on any system. |
| `originalName` | `string \| undefined` | The name as the sender wrote it, for display only. |
| `contentType` | `string` | |
| `size` | `number` | |
| `content` | `Uint8Array` | |
| `contentId` | `string \| undefined` | |
| `inline` | `boolean` | |

### `Authenticity`

| Field | Type | Description |
|---|---|---|
| `summary` | `'pass' \| 'fail' \| 'none' \| 'temperror'` | `pass` only when DMARC passed for `fromDomain`; `fail` when it failed or the From is ambiguous; `temperror` when a check could not complete. |
| `dkim` | `readonly DkimVerdict[]` | One per signature: `result`, `domain`, `selector`, `reason`. |
| `spf` | `AuthResult` | `none` when no envelope was given. |
| `dmarc` | `AuthResult` | |
| `dmarcPolicy` | `DmarcPolicy` | |
| `dmarcDomain` | `string \| undefined` | The From domain DMARC was evaluated for. |
| `fromDomain` | `string \| undefined` | The domain of the message's one From address; absent when missing or ambiguous. The display name is never authenticated. |
| `arc` | `AuthResult` | |

### Inbound mail

| Function | Signature | Description |
|---|---|---|
| `createMailgunInboundHandler` | `createMailgunInboundHandler(options: MailgunInboundOptions): (ctx: InboundHttpContext, next?: () => Promise<void>) => Promise<void>` | Verifies Mailgun's signature on `timestamp` and `token` and refuses a wrong or stale one (401), reads `body-mime` (422 when missing) with `readMessage`, and calls `onMessage`. A token already handled is acknowledged (204) and not handled again. A message goldstone refuses answers 406 so Mailgun does not retry; when `onMessage` throws, the token is given back and the error propagates, so Mailgun retries; success answers 204. |

| `MailgunInboundOptions` field | Type | Default | Description |
|---|---|---|---|
| `signingKey` | `string` | required | The webhook signing key. |
| `onMessage` | `(message: ReceivedMessage, meta: InboundMeta) => unknown` | required | Handles one message. |
| `maxAgeSeconds` | `number` | `120` | A signed request older than this is refused; an integer from 1 to 86400. |
| `replayGuard` | `ReplayGuard` | `MemoryReplayGuard` | Where handled tokens are kept; share one across instances. |
| `limits` | `Limits` | | |
| `authenticate` | `boolean \| Omit<AuthenticateOptions, 'ip' \| 'helo'>` | `true` | DKIM and DMARC on each message. |
| `remoteContent` | `'block' \| 'allow'` | `'block'` | |

The route must run behind the body parser, with form and multipart limits above the largest message accepted, and the Mailgun route must forward to a URL ending in `mime`.

| Member | Signature | Description |
|---|---|---|
| `ReplayGuard.claim` | `claim(token: string, ttlSeconds: number): boolean \| Promise<boolean>` | Takes the token; `false` when already taken. Must be atomic. |
| `ReplayGuard.release` | `release(token: string): void \| Promise<void>` | Gives a token back. |
| `MemoryReplayGuard` constructor | `new MemoryReplayGuard(capacity?: number)` | Default capacity 100000. |

### `GoldstoneError`

Extends `Error`; `name` is the class name. `GoldstoneNativeRequiredError` extends it with the code `E_GOLDSTONE_NATIVE_REQUIRED`.

| Member | Signature | Description |
|---|---|---|
| `code` | `readonly code: string` | An `E_GOLDSTONE_*` code. |
| constructor | `new GoldstoneError(code: string, message: string, options?: ErrorOptions)` | |

### `@c9up/goldstone/provider`

| Export | Kind | Description |
|---|---|---|
| `GoldstoneProvider` | provider (default) | `register()` builds the `InboxManager` from the `inbox` config (it opens no connection); `shutdown()` closes every mailbox. |

### `@c9up/goldstone/services/main`

| Export | Kind | Description |
|---|---|---|
| `default` | const | The application's `InboxManager`. |

```ts
import inbox from '@c9up/goldstone/services/main'

const unread = await inbox.mailbox().search({ seen: false })
```

## Configuration

`config/inbox.ts`, returned through `defineConfig`. `defineConfig` refuses, at boot, a config with no mailbox, a default that is not declared, and a mailbox that would connect without TLS or without checking the server's certificate.

| Option | Type | Default | Description |
|---|---|---|---|
| `mailbox` | `string` | required | The mailbox `inbox.mailbox()` returns with no argument. |
| `mailboxes` | `Record<string, MailboxConfig>` | required | The mailboxes, by name. |
| `limits` | `Limits` | | Bounds on every message read. |
| `authenticate` | `boolean` | `true` | Check DKIM, SPF and DMARC on every message read. |
| `remoteContent` | `'block' \| 'allow'` | `'block'` | Remote content in `message.html`. |

| `MailboxConfig` field | Type | Default | Description |
|---|---|---|---|
| `host` | `string` | required | |
| `port` | `number` | 993, or 143 with `starttls` | |
| `secure` | `boolean` | `true` unless `starttls` | TLS from the first byte. |
| `starttls` | `boolean` | | Upgrade a plaintext connection, and refuse to go on when the server does not offer it. Not with `secure: true`. |
| `allowInsecure` | `boolean` | | Allow no TLS or no certificate check: a local test server only. |
| `tls` | `{ ca?: string \| Buffer; servername?: string; rejectUnauthorized?: boolean }` | | Passed to Node's TLS. |
| `auth` | `PasswordAuth \| TokenAuth` | required | `{ user, pass }`, or `{ user, accessToken }` for XOAUTH2, where `accessToken` is a string or a function called on every connection. |

## Container bindings

| Token | Resolves to |
|---|---|
| `InboxManager` | The `InboxManager` singleton. |
| `'goldstone.inbox'` | The same instance. |
| `'inbox'` | The same instance. |

The string tokens are declared on `ContainerBindings`.

## Errors

| Code | Raised when |
|---|---|
| [`E_GOLDSTONE_MESSAGE_TOO_LARGE`](/en/reference/errors#e-goldstone-message-too-large) | A message is over `maxBytes`; refused before download when the server announces its size. |
| [`E_GOLDSTONE_NOT_A_MESSAGE`](/en/reference/errors#e-goldstone-not-a-message) | The bytes are not a mail message. |
| [`E_GOLDSTONE_TOO_MANY_PARTS`](/en/reference/errors#e-goldstone-too-many-parts) | A message has more MIME parts than allowed. |
| [`E_GOLDSTONE_TOO_DEEP`](/en/reference/errors#e-goldstone-too-deep) | MIME parts are nested deeper than allowed. |
| [`E_GOLDSTONE_TOO_MANY_HEADERS`](/en/reference/errors#e-goldstone-too-many-headers) | A header block has more fields than allowed. |
| [`E_GOLDSTONE_HEADERS_TOO_LARGE`](/en/reference/errors#e-goldstone-headers-too-large) | A header block is over the size limit. |
| [`E_GOLDSTONE_MISSING_BOUNDARIES`](/en/reference/errors#e-goldstone-missing-boundaries) | A multipart message declares boundaries that never appear. |
| [`E_GOLDSTONE_BOUNDARY_TOO_LONG`](/en/reference/errors#e-goldstone-boundary-too-long) | A multipart boundary is too long. |
| [`E_GOLDSTONE_TOO_MANY_ATTACHMENTS`](/en/reference/errors#e-goldstone-too-many-attachments) | A message has more attachments than allowed. |
| [`E_GOLDSTONE_ATTACHMENT_TOO_LARGE`](/en/reference/errors#e-goldstone-attachment-too-large) | An attachment is over the size limit. |
| [`E_GOLDSTONE_HTML_TOO_LARGE`](/en/reference/errors#e-goldstone-html-too-large) | The HTML body is over `maxHtmlBytes` (on `htmlError`). |
| [`E_GOLDSTONE_HTML_TOO_DEEP`](/en/reference/errors#e-goldstone-html-too-deep) | The HTML body is nested too deep (on `htmlError`). |
| [`E_GOLDSTONE_HTML_TOO_COMPLEX`](/en/reference/errors#e-goldstone-html-too-complex) | The HTML body has too many elements (on `htmlError`). |
| [`E_GOLDSTONE_DNS_UNAVAILABLE`](/en/reference/errors#e-goldstone-dns-unavailable) | A sender check needed DNS and DNS failed. |
| [`E_GOLDSTONE_INVALID_ENVELOPE`](/en/reference/errors#e-goldstone-invalid-envelope) | The envelope given to a sender check is invalid. |
| [`E_GOLDSTONE_ENGINE`](/en/reference/errors#e-goldstone-engine) | The engine failed without one of the codes above. |
| [`E_GOLDSTONE_NATIVE_REQUIRED`](/en/reference/errors#e-goldstone-native-required) | The Rust mail engine is not loaded. |
| [`E_GOLDSTONE_INVALID_LIMITS`](/en/reference/errors#e-goldstone-invalid-limits) | A parsing limit is not a positive integer under 2^32. |
| [`E_GOLDSTONE_INVALID_OPTIONS`](/en/reference/errors#e-goldstone-invalid-options) | A sender check option, `remoteContent` or a replay TTL is invalid. |
| [`E_GOLDSTONE_INVALID_CONFIG`](/en/reference/errors#e-goldstone-invalid-config) | The inbox config or the inbound handler's options are invalid. |
| [`E_GOLDSTONE_INSECURE_CONNECTION`](/en/reference/errors#e-goldstone-insecure-connection) | A mailbox would connect without TLS or without checking the certificate. |
| [`E_GOLDSTONE_UNKNOWN_MAILBOX`](/en/reference/errors#e-goldstone-unknown-mailbox) | A mailbox name is not configured. |
| [`E_GOLDSTONE_UIDVALIDITY_CHANGED`](/en/reference/errors#e-goldstone-uidvalidity-changed) | A watched folder renumbered its messages; watching resumes from the newest. |

## See also

- [rover](/en/reference/rover), for sending mail
- [Mail](/en/guides/digging-deeper/mail/)
