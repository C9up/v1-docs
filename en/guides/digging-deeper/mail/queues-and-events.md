# Queues and events

This guide covers queued mail, events and shutdown:

- Dispatchable mails
- Handing the mailer a queue later
- Lifecycle events
- Shutting down

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

## Lifecycle events

Every event carries three things — the mailer that handled it, the
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

## Shutting down

```ts
await mail.closeAll()
```

Real on SMTP — it drains nodemailer's pool. A process that exits without it
leaves the server holding sockets until they time out.

Display names and addresses carrying CR, LF or NUL are **rejected**: a line break
cannot be escaped in a header, it ends it, and accepting one is how a contact
form becomes an open relay.
