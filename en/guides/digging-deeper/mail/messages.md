# Messages

This guide covers building a message:

- MessageBuilder API
- Views and the template engine
- Text bodies and the envelope
- The watch body and prepared headers
- Inspecting a message

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
| `.icalEventFromUrl(url, options?)` | …fetched from an `http(s)` URL when the message is built |

> **List-Unsubscribe and deliverability.** Gmail and Yahoo require bulk senders
> to offer one-click unsubscribe. `oneClick: true` emits the RFC 8058
> `List-Unsubscribe-Post` header alongside the URL, and refuses anything but an
> `https:` target (RFC 8058) — a `mailto:` cannot answer a POST.
>
> Every `List-*` entry is one `https:`, `http:`, `mailto:` or `ftp:` URL, or a
> bare address (sent as `mailto:`); a space, an angle bracket or a line break in
> it is refused (`E_INVALID_LIST_HEADER`), so no second target can be slipped
> in. Comments are escaped, and encoded on their own when non-ASCII.

> **Calendar invitations.** All three forms work on every transport.
> `icalEventFromUrl()` fetches the URL when the message is built — `http:` and
> `https:` only, within 30 seconds; anything else or a non-2xx answer fails
> with `E_ATTACHMENT_UNREADABLE`. The built message therefore holds the bytes, and a
> queued one names no URL for the worker to fetch. A provider API receives the
> invitation as a `text/calendar` part, which is how mail clients read it
> anyway.
>
> `icalEvent()` takes either the ICS text or a builder callback:
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

## Views and the template engine

`htmlView()`, `textView()` and `watchView()` render through
`MessageBuilder.templateEngine` when one is registered: an object with
`render(templatePath, sharedState, data)`, which is how an application's own
view engine renders its mails. `sharedState` carries the config's `globals`
and, for the html and watch views, two helpers that embed an image and return
its `cid:` URL:

```ts
import { MessageBuilder } from '@c9up/rover'

MessageBuilder.templateEngine = {
  render: (template, shared, data) => views.share(shared).render(template, data),
}
```

```html
<img src="{{ embedImage(app.makePath('resources/logo.png')) }}">
<img src="{{ embedImageData(chartPng) }}">
```

When the application uses inker, `RoverProvider` registers it at boot, so mail
views are inker templates with nothing to configure; a `@c9up/inker` that
cannot render this way stops the boot with `E_MAIL_TEMPLATE_ENGINE` rather than
falling back to the built-in engine. Rendering before inker's provider has
started rejects with inker's `E_INKER_ENGINE_MISSING`.

With no engine registered, rover's built-in engine renders `.html` files under
`viewsRoot`. It is deliberately small: `{{ value }}` (escaped), `{{{ raw }}}`,
`{{#if}}` and `{{> partial}}` — no loops, expressions or helpers, so no
`embedImage` either. A mail that needs those registers an engine. A partial
that includes itself, directly or through another, throws
`E_MAIL_TEMPLATE_RECURSION` when the cycle is rendered.

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

## The watch body and prepared headers

```ts
message.watch('<p>on the wrist</p>')            // Apple Watch body
message.watchView('emails/wrist', { user })     // …from a template
message.assertWatchIncludes(/wrist/i)

message.preparedHeader('X-Signature', 'a=b; c=d')
```

::: tip `watch()` and `watchHtml()`
`watch()` writes nodemailer's `watchHtml`, the only field its mail composer
reads (`lib/mail-composer/index.js`). `watchHtml()` is the same method under the
field's own name.
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

## Inspecting a message

`has*` answers, `assert*` throws and reports what it actually got:

```ts
message.hasTo('ada@acme.test')
message.hasTo('ada@acme.test', 'Ada')      // both halves must match
message.assertSubject('Welcome')
message.assertHtmlIncludes('Hello')
message.toObject()
```

`hasRecipient` takes the **field first**, and
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
