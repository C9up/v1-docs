# rover

`@c9up/rover` : l'envoi d'e-mails pour ream, par SMTP, le mailer de log ou l'API HTTP d'un fournisseur (SES, Mailgun, SendGrid, Resend, Brevo, SparkPost), avec templates, nouvelles tentatives, envoi en file et webhooks de distribution. Guide : [E-mail](/fr/guides/digging-deeper/mail/).

## Installation

```bash
pnpm add @c9up/rover
ream configure @c9up/rover
```

`ream configure @c9up/rover` ajoute le provider, les variables `MAIL_MAILER`, `MAIL_FROM`, `SMTP_HOST` et `SMTP_PORT`, et écrit `config/mail.ts`. Dépendances pairs facultatives : `@c9up/ream` (provider), `@c9up/inker` (vues d'e-mail rendues par inker), `ical-generator` (`icalEvent(callback)`), `@c9up/helix` (le plugin de test `mailFake()`).

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/rover` | `Mail`, `Mailer`, `MessageBuilder`, `BaseMail`, `defineConfig` et `transports`, les classes de transport, les assistants de nouvelle tentative, la classe du provider et la classe d'erreur. Son import enregistre chaque transport fourni. |
| `@c9up/rover/provider` | `RoverProvider` (export par défaut). |
| `@c9up/rover/services/main` | L'instance `Mail` de l'application (export par défaut), utilisable une fois le provider démarré. |
| `@c9up/rover/configure` | `configure(codemods)`, exécuté par `ream configure @c9up/rover`. |
| `@c9up/rover/transports/mailgun` | `MailgunTransport`. |
| `@c9up/rover/transports/sendgrid` | `SendGridTransport`. |
| `@c9up/rover/transports/ses` | `SesTransport`. |
| `@c9up/rover/transports/resend` | `ResendTransport`. |
| `@c9up/rover/transports/brevo` | `BrevoTransport`. |
| `@c9up/rover/transports/sparkpost` | `SparkPostTransport`. |
| `@c9up/rover/testing` | `FakeMail` et le plugin helix `mailFake()`. |
| `@c9up/rover/webhooks/mailgun` | `createMailgunWebhookHandler` et son magasin anti-rejeu. |
| `@c9up/rover/webhooks/sendgrid` | `createSendGridWebhookHandler`. |
| `@c9up/rover/webhooks/resend` | `createResendWebhookHandler`. |

Chaque entrée `transports/*` exporte une classe, aussi exportée par `@c9up/rover` ; l'import du sous-chemin enregistre ce transport sous son nom.

## Exports

### `@c9up/rover`

| Export | Nature | Description |
|---|---|---|
| `Mail` | classe | Le gestionnaire d'e-mails : construit, envoie et met en file les messages via les mailers déclarés. |
| `Mailer` | classe | Un mailer nommé, issu de `mail.use(name)`. |
| `MailResponse` | classe | Ce que résout un envoi. |
| `MessageBuilder` | classe | Le message fluide que remplit un callback d'envoi. |
| `BaseMail` | classe | Base d'un e-mail écrit en classe. |
| `defineConfig` | fonction | Type la configuration `mail`. |
| `transports` | const | Un assistant de descripteur par transport fourni. |
| `registerTransport` | fonction | Enregistre une fabrique de transport personnalisée sous un nom. |
| `SmtpTransport` | classe | SMTP via nodemailer. |
| `LogTransport` | classe | Journalise chaque message au lieu de l'envoyer. |
| `SesTransport`, `MailgunTransport`, `SendGridTransport`, `ResendTransport`, `BrevoTransport`, `SparkPostTransport` | classe | Transports par l'API HTTP d'un fournisseur. |
| `RoverProvider` | provider | Aussi l'export par défaut de `@c9up/rover/provider`. |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs). Chacune est une `Exception` de flare avec un `code` textuel. |
| `DEFAULT_RETRY_CONFIG` | const | `{ maxAttempts: 3, baseDelayMs: 500, factor: 2, maxDelayMs: 10000 }`. |
| `isRetryableError` | fonction | Indique si un échec d'envoi mérite une nouvelle tentative. |
| `RetryConfig` | interface | `{ maxAttempts: number; baseDelayMs: number; factor: number; maxDelayMs?: number }`. |
| `attachmentsFor` | fonction | Les pièces jointes d'un message plus son invitation de calendrier en partie `text/calendar`. |
| `listHeaders` | fonction | Les en-têtes `List-*` d'un message en table d'en-têtes simple. |
| `headersWithList` | fonction | Les en-têtes d'un message plus ses en-têtes `List-*` rendus. |
| `headerValue` | fonction | Une valeur d'en-tête en chaîne ou tableau de chaînes simple. |
| `MailConfig` | interface | La configuration `mail`. |
| `TransportDescriptor` | interface | Les réglages d'un mailer : `{ transport: string; retry?: RetryConfig; [key: string]: unknown }`. |
| `MailTransport` | interface | Ce qu'implémente un transport. |
| `MailTransportFactory` | type | `(config: Record<string, unknown>) => MailTransport`. |
| `MailSendResult`, `MailSendOutcome` | type | Ce que renvoie le `send` d'un transport. |
| `MailMessage` | interface | Un message construit. |
| `MailAttachment` | interface | Une pièce jointe. |
| `MailAddress` | type | `string \| { address: string; name?: string }`. |
| `Recipient`, `RecipientInput`, `RecipientObject` | type | Un destinataire, tel que stocké et tel que l'accepte le builder. |
| `MailEnvelope` | interface | L'enveloppe SMTP : `from`, `to`, `cc`, `bcc`. |
| `MailResponseEnvelope` | type | L'enveloppe que porte une `MailResponse`. |
| `AttachmentOptions`, `EmbedImageOptions` | type | Options des méthodes `attach*` et `embed*`. |
| `ListHeader` | type | `string \| { url: string; comment: string }`. |
| `CalendarEvent`, `CalendarEventMethod`, `CalendarEventOptions` | type | Une invitation de calendrier. |
| `PreparedHeader` | interface | `{ prepared: true; value: string }` : un en-tête transmis sans encodage. |
| `TemplateEngine` | interface | Ce qui rend `htmlView`, `textView` et `watchView`. |
| `MessageBodyTemplates` | interface | Les templates d'où un message a été rendu. |
| `MailHooks` | interface | Les callbacks `onSending`, `onSent`, `onFailed`, `onQueueing`, `onQueued`. |
| `EmitterLike` | interface | `{ emit(event: string, data: unknown): unknown }`. |
| `MailEventBase`, `MailSendingEvent`, `MailSentEvent`, `MailFailedEvent`, `MailQueueEvent` | interface | Les charges des événements `mail:*`. |

### `Mail`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Mail(config: MailConfig, options?: { queue?: BayQueueLike; hooks?: MailHooks; emitter?: EmitterLike })` | Lève `E_MAIL_UNKNOWN_MAILER` si `default` n'est pas un mailer déclaré. |
| `send` | `send(callback: (message: MessageBuilder) => void, transport?: string): Promise<MailResponse>`<br>`send(instance: BaseMail, transport?: string): Promise<MailResponse>` | Construit et envoie via le mailer nommé, ou celui par défaut. |
| `sendLater` | `sendLater(arg: ((message: MessageBuilder) => void) \| BaseMail, options?: { transport?: string; queue?: string }): Promise<string>` | Met l'envoi en file et résout l'id du job. Sans file branchée, un messager en mémoire l'envoie à la microtâche suivante. |
| `sendCompiled` | `sendCompiled(message: MailMessage, transport?: string): Promise<MailResponse>` | Envoie un message déjà construit. |
| `sendLaterCompiled` | `sendLaterCompiled(message: MailMessage, options?: { transport?: string; queue?: string }): Promise<string>` | Met en file un message déjà construit. |
| `dispatchMessage` | `dispatchMessage(message: MailMessage, transportName?: string, overrideRetry?: RetryConfig, views?: MessageBodyTemplates): Promise<MailResponse>` | L'envoi avec nouvelles tentatives, événements et hooks par lequel passent les autres méthodes. |
| `setMessenger` | `setMessenger(messenger: BayQueueLike): this` | Remet une file à `sendLater` après la construction. |
| `use` | `use(name?: string): Mailer` | Le mailer nommé (celui par défaut sans nom), mis en cache par nom. |
| `close` | `close(name?: string): Promise<void>` | Ferme les connexions d'un transport ; un nom inconnu est sans effet. |
| `closeAll` | `closeAll(): Promise<void>` | Ferme chaque transport construit jusqu'ici. |
| `fake` | `fake(): FakeMail` | Capture chaque `send` et `sendLater` au lieu de les délivrer. |
| `restore` | `restore(): void` | Quitte le mode factice. |

Avec un émetteur, un envoi émet `mail:sending`, puis `mail:sent` ou `mail:failed` ; `sendLater` émet `mail:queueing` et `mail:queued`.

### `Mailer`

| Membre | Signature | Description |
|---|---|---|
| `name` | `get name(): string` | Le nom du mailer. |
| `transport` | `get transport(): MailTransport` | Son instance de transport. |
| `send` | `send(arg: ((message: MessageBuilder) => void) \| BaseMail): Promise<MailResponse>` | Envoie via ce mailer. |
| `sendLater` | `sendLater(arg: ((message: MessageBuilder) => void) \| BaseMail, options?: { queue?: string }): Promise<string>` | Met en file pour ce mailer. |
| `sendCompiled` | `sendCompiled(message: MailMessage): Promise<MailResponse>` | |
| `sendLaterCompiled` | `sendLaterCompiled(message: MailMessage, options?: { queue?: string }): Promise<string>` | |
| `close` | `close(): Promise<void>` | Ferme les connexions du transport de ce mailer. |

### `MailResponse`

| Membre | Signature | Description |
|---|---|---|
| `messageId` | `messageId: string` | L'id à rapprocher des webhooks du fournisseur. |
| `envelope` | `envelope: MailResponseEnvelope` | L'enveloppe utilisée. |
| `original` | `original: T` | Le résultat brut du transport. |

### `MessageBuilder`

| Groupe | Signatures |
|---|---|
| Adresses | `from(address: string, name?: string): this`<br>`to(address: string, name?: string): this` / `to(addresses: RecipientInput[]): this`<br>`cc(…)`, `bcc(…)` (mêmes surcharges)<br>`replyTo(address: string, name?: string): this`<br>`envelope(envelope: MailEnvelope): this` |
| Contenu | `subject(text: string): this`<br>`html(content: string): this`, `text(content: string): this`<br>`watch(content: string): this`, `watchHtml(content: string): this` |
| Templates | `htmlView(viewPath: string, data?: Record<string, unknown>): this`<br>`textView(path: string, data?: Record<string, unknown>): this`<br>`watchView(viewPath: string, data?: Record<string, unknown>): this` |
| Pièces jointes | `attach(file: string \| URL, options?: AttachmentOptions): this`<br>`attachData(content: Buffer \| string, options: AttachmentOptions & { filename: string }): this`<br>`embed(file: string \| URL, cid: string, options?: AttachmentOptions): this`<br>`embedData(content: Buffer \| string, cid: string, options?: AttachmentOptions): this` |
| En-têtes | `header(key: string, value: string \| string[]): this`<br>`preparedHeader(key: string, value: string): this`<br>`priority(priority: 'low' \| 'normal' \| 'high'): this`<br>`messageId(messageId: string): this`, `inReplyTo(messageId: string): this`, `references(messageIds: string[]): this`<br>`encoding(encoding: string): this` |
| En-têtes de liste | `addListHeader(key: string, value: ListHeader \| ListHeader[] \| ListHeader[][]): this`<br>`listUnsubscribe(value, options?: { oneClick?: boolean }): this` (une cible en un clic doit être en https)<br>`listSubscribe(value): this`, `listHelp(value): this` |
| Calendrier | `icalEvent(contents: string \| CalendarEventCallback, options?: CalendarEventOptions): this`<br>`icalEventFromFile(file: string \| URL, options?: CalendarEventOptions): this`<br>`icalEventFromUrl(url: string, options?: CalendarEventOptions): this` |
| Inspection | `hasTo`, `hasCc`, `hasBcc`, `hasFrom`, `hasReplyTo`, `hasAnyRecipient` `(address?: string, name?: string): boolean`<br>`hasRecipient(property: 'to' \| 'cc' \| 'bcc' \| 'replyTo', address: string, name?: string): boolean`<br>`hasSubject(subject?: string)`, `hasContent(needle: string)`, `hasHeader(name: string, value?: string)`, `hasListHeader(key: string, url?: string)`, `hasAttachment(match?: string \| URL \| ((attachment: MailAttachment) => boolean))` |
| Assertions | `assertTo`, `assertFrom`, `assertCc`, `assertBcc`, `assertReplyTo`, `assertRecipient` `(address: string): void`<br>`assertSubject(subject: string)`, `assertContent(needle: string)`, `assertHeader(name: string, value?: string)`, `assertAttachment(match)`<br>`assertHtmlIncludes(substring: string)`, `assertTextIncludes(substring: string)`, `assertWatchIncludes(substring: string \| RegExp)` ; chacune lève une `AssertionError` de `node:assert` |
| Sortie | `build(viewsRoot?: string, globals?: Record<string, unknown>): Promise<MailMessage>`<br>`toObject(): Readonly<MailMessage>`, `toJSON(): Readonly<MailMessage>`<br>`get views(): MessageBodyTemplates`, `get contentViews(): MessageBodyTemplates`, `get nodeMailerMessage(): MailMessage` |
| Statique | `static templateEngine: TemplateEngine \| undefined` : le moteur qui rend les vues ; non défini, le moteur `{{ }}` intégré à rover rend les fichiers `.html` sous `viewsRoot`. Le provider pose celui d'inker quand l'app l'utilise. |

### `BaseMail`

Une classe abstraite : un e-mail écrit en classe.

| Membre | Signature | Description |
|---|---|---|
| `message` | `readonly message: MessageBuilder` | Le message que construit cet e-mail. |
| `from`, `replyTo` | `MailAddress` | Appliqués avant `prepare()`. |
| `subject` | `string` | Appliqué avant `prepare()`. |
| `built` | `boolean` | Indique si `build` a déjà tourné ; une seconde construction renvoie le premier message. |
| `prepare` | `abstract prepare(): void \| Promise<void>` | Remplit `this.message`. |
| `send` | `send<R>(mailer: MailSender<R>): Promise<R>` | Envoie cet e-mail via `mailer`. |
| `sendLater` | `sendLater(mailer: MailSender<unknown>): Promise<void>` | Le met en file. |
| `build` | `build(viewsRoot?: string, globals?: Record<string, unknown>): Promise<MailMessage>` | Construit le message et rend ses templates. |
| `buildWithContents` | `buildWithContents(viewsRoot?: string, globals?: Record<string, unknown>): Promise<MailMessage>` | Identique à `build`. |

### Transports

| Fonction | Signature | Description |
|---|---|---|
| `registerTransport` | `registerTransport(name: string, factory: MailTransportFactory): void` | Rend `transport: name` utilisable dans `mailers`. |
| `defineConfig` | `defineConfig(config: MailConfig): MailConfig` | Renvoie la configuration, typée. |
| `isRetryableError` | `isRetryableError(err: unknown): boolean` | Vrai pour un 429 ou un 5xx du fournisseur, un échec SMTP passager, ou une erreur réseau comme `ETIMEDOUT` ou `ECONNRESET`. |

`MailTransport` vaut `{ send(message: MailMessage): Promise<MailSendOutcome>; close?(): Promise<void> }` ; `MailSendResult` vaut `{ providerId?: string; envelope?: MailResponseEnvelope; original?: unknown }`.

`transports` contient `smtp`, `ses`, `mailgun`, `sparkpost`, `resend`, `brevo`, `sendgrid` et `log`, chacun `(config?: Record<string, unknown> & { retry?: RetryConfig }) => TransportDescriptor`.

| Transport | Réglages lus |
|---|---|
| `smtp` | `host` (requis), `port`, `user` et `pass` (les deux ou aucun) ou `auth`, `requireTLS`, `ignoreTLS`, `opportunisticTLS`, `allowInsecureAuth` ; les autres clés vont aux options SMTP de nodemailer. Des identifiants avec TLS désactivé sont refusés sauf avec `allowInsecureAuth: true`. `new SmtpTransport(config, options?: { transporter?: SmtpTransporter })`. |
| `log` | `logBody` (`false` par défaut). |
| `ses` | `accessKeyId`, `secretAccessKey`, `region`. |
| `mailgun` | `apiKey`, `domain`, `region` (`'us'` ou `'eu'`), `baseUrl`. |
| `sendgrid` | `apiKey`, `baseUrl`. |
| `resend` | `apiKey`. |
| `brevo` | `apiKey` (ou `key`), `baseUrl`. |
| `sparkpost` | `apiKey` (ou `key`), `baseUrl`. |

Chaque classe de transport prend `new XTransport(config: Record<string, unknown>)` et implémente `MailTransport`.

### `@c9up/rover/provider`

| Export | Nature | Description |
|---|---|---|
| `RoverProvider` | provider (par défaut) | `register()` lie `Mail` à partir de la configuration `mail`, avec les liaisons `QueueManager` et `Emitter` quand elles existent ; `boot()` rend les vues d'e-mail avec inker quand l'app l'utilise ; `shutdown()` défait cela. |

### `@c9up/rover/services/main`

| Export | Nature | Description |
|---|---|---|
| `default` | const | L'instance `Mail` de l'application. Tout accès à une propriété avant le démarrage du provider lève une erreur. |

```ts
import mail from '@c9up/rover/services/main'

await mail.send((message) => {
  message.to(user.email).subject('Welcome').htmlView('welcome', { user })
})
```

### `@c9up/rover/configure`

| Export | Nature | Description |
|---|---|---|
| `configure` | fonction | `configure(codemods): Promise<void>` : ce qu'exécute `ream configure @c9up/rover`. |

### `@c9up/rover/testing`

| Export | Nature | Description |
|---|---|---|
| `FakeMail` | classe | Capture les messages envoyés et mis en file ; renvoyée par `mail.fake()`. |
| `FakeMailPredicate` | interface | Filtre sur `from`, `to`, `cc`, `bcc`, `replyTo`, `subject` ou `containing`. |
| `FakeMailPredicateArg` | type | Un `FakeMailPredicate` ou `(m: MailMessage) => boolean`. |
| `MailConstructor` | type | Une sous-classe de `BaseMail`, pour la forme par classe des assertions. |
| `FakeableMailer` | interface | `{ fake(): FakeMail; restore(): void }` : ce que prend `mailFake`. |
| `mailFake` | fonction | `mailFake(mailer: FakeableMailer): (api: MailPluginHost) => void` : un plugin helix qui place une `FakeMail` neuve sur le contexte de chaque test sous `ctx.mail` et restaure le mailer après le test. |
| `MailPluginHost` | type | La partie de l'API de plugin de helix qu'il utilise. |

| Membre de `FakeMail` | Signature | Description |
|---|---|---|
| `getSent`, `getQueued` | `(): MailMessage[]` | Ce qui a été capturé. |
| `reset` | `reset(): void` | Oublie tout ce qui a été capturé. |
| `assertSent`, `assertNotSent`, `assertQueued`, `assertNotQueued` | `(predicate: FakeMailPredicateArg): void`<br>`<T extends BaseMail>(mailConstructor: MailConstructor<T>, findFn?: (mail: T) => boolean): void` | Par contenu, ou par la classe `BaseMail` qui l'a construit. |
| `assertSentCount`, `assertQueuedCount` | `(count: number): void`<br>`(mailConstructor: MailConstructor<BaseMail>, count: number): void` | |
| `assertNoneSent`, `assertNoneQueued` | `(): void` | |

Chaque assertion du fake lève une `AssertionError` de `node:assert` quand elle n'est pas vérifiée.

### Webhooks

Chaque gestionnaire est un `WebhookMiddleware`, `(ctx, next) => Promise<void>`, à monter sur une route qui conserve le corps brut. Il vérifie la signature du fournisseur, refuse une signature périmée (300 secondes par défaut), répond 401 ou 400 en cas de refus et 200 sinon, et émet `mail.delivered`, `mail.bounced` ou `mail.failed` sur l'émetteur ; un échec de l'émetteur ne fait jamais échouer la réponse.

| Import | Export | Signature |
|---|---|---|
| `@c9up/rover/webhooks/mailgun` | `createMailgunWebhookHandler` | `(options: MailgunWebhookOptions) => WebhookMiddleware` ; options `signingKey`, `emitter`, `maxAgeSeconds?`, `tokenStore?` |
| `@c9up/rover/webhooks/mailgun` | `MemoryWebhookTokenStore` | `new MemoryWebhookTokenStore(options?: { maxEntries?: number })` (10000 par défaut) : le magasin en processus des jetons de signature utilisés ; `claim(token, ttlSeconds): boolean`, `size` |
| `@c9up/rover/webhooks/mailgun` | `WebhookTokenStore` | `{ claim(token: string, ttlSeconds: number): boolean \| Promise<boolean> }` : passez-en un partagé derrière plusieurs instances |
| `@c9up/rover/webhooks/sendgrid` | `createSendGridWebhookHandler` | `(options: SendGridWebhookOptions) => WebhookMiddleware` ; options `publicKey` (Ed25519, DER base64 ou PEM), `emitter`, `maxAgeSeconds?` |
| `@c9up/rover/webhooks/resend` | `createResendWebhookHandler` | `(options: ResendWebhookOptions) => WebhookMiddleware` ; options `secret` (`whsec_…` ou base64 brut), `emitter`, `maxAgeSeconds?` |

Un jeton de signature Mailgun n'est accepté qu'une fois : un rejeu répond 401.

## Configuration

`config/mail.ts`, écrit par `ream configure @c9up/rover` :

| Option | Type | Défaut | Description |
|---|---|---|---|
| `default` | `string` | requis | Le mailer utilisé quand aucun n'est nommé ; doit être une clé de `mailers`. La configuration générée lit `MAIL_MAILER` sans valeur de repli. |
| `from` | `MailAddress` | requis | L'expéditeur par défaut. |
| `mailers` | `Record<string, TransportDescriptor>` | | Les mailers déclarés, construits avec `transports.*`. `transports` est une ancienne graphie, fusionnée avec `mailers`. |
| `globals` | `Record<string, unknown>` | `{}` | Partagé avec chaque template. |
| `viewsRoot` | `string` | `'resources/views/emails'` | Racine des recherches de `htmlView` pour le moteur intégré. |
| `queue.name` | `string` | `'mail.send'` | Le nom de job que `sendLater` met en file. |
| `queue.maxAttempts` | `number` | `3` | Le nombre de tentatives d'un envoi en file. |
| `retry` | `Partial<RetryConfig>` | `DEFAULT_RETRY_CONFIG` | Les nouvelles tentatives pour tout le processus ; le `retry` propre à un mailer l'emporte. |

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `Mail` | Le singleton `Mail`. |
| `'rover.mail'` | La même instance. |
| `'mail'` | La même instance (nom antérieur, toujours lié). |

Les jetons en chaîne sont déclarés sur `ContainerBindings`.

## Erreurs

Chaque code est une classe de l'espace de noms `errors` (`import { errors } from '@c9up/rover'`) : une `Exception` de flare avec `code`, `status` (500 pour toutes) et, quand l'endroit qui la lève sait comment corriger, `help`. `E_INVALID_CONFIG` et `E_MAIL_TRANSPORT_ERROR` se construisent avec `new errors.E_INVALID_CONFIG(message, { cause })` ; `E_MAIL_TRANSPORT_ERROR` prend aussi `context` et `help` dans cet objet. Quatre d'entre elles portent aussi `context`, un `Record<string, string>` :

| Classe | `context` |
|---|---|
| `E_MAIL_TRANSPORT_ERROR` | `provider`, `upstreamStatus` (statut HTTP ou code de réponse SMTP, `"0"` quand aucun n'est revenu), `providerMessage`, `networkCode` (un errno comme `ECONNRESET`), `retryAfter` (en secondes) et, une fois l'envoi abandonné, `attempts`. |
| `E_MAIL_FIELD_UNSUPPORTED` | `provider`, `field`. |
| `E_MAIL_TEMPLATE_NOT_FOUND` | `path`, `viewsRoot`, et `paths` (les candidats essayés). Vide quand le moteur natif signale un partial manquant. |
| `E_MAIL_TEMPLATE_READ_ERROR` | `path`, `code` (l'errno), `viewsRoot`. |

| Code | Levée quand |
|---|---|
| [`E_MAIL_INVALID_MESSAGE`](/fr/reference/errors#e-mail-invalid-message) | Il manque au message ce que l'envoi exige (une adresse `from`, un destinataire…). |
| [`E_MAIL_INVALID_ADDRESS`](/fr/reference/errors#e-mail-invalid-address) | Une adresse n'est pas une adresse e-mail valide. |
| [`E_MAIL_HEADER_INJECTION`](/fr/reference/errors#e-mail-header-injection) | Une valeur d'en-tête contient un saut de ligne ou un NUL. |
| [`E_INVALID_LIST_HEADER`](/fr/reference/errors#e-invalid-list-header) | Une entrée `List-*` n'est pas une URL (https, http, mailto ou ftp) ou une adresse seule. |
| [`E_MAIL_FIELD_UNSUPPORTED`](/fr/reference/errors#e-mail-field-unsupported) | Le transport ne sait pas poser un champ qu'utilise le message. |
| [`E_ATTACHMENT_UNREADABLE`](/fr/reference/errors#e-attachment-unreadable) | Le fichier d'une pièce jointe ne peut pas être lu. |
| [`E_INVALID_CONFIG`](/fr/reference/errors#e-invalid-config) | Il manque une propriété à la configuration d'un transport, ou l'une d'elles est invalide. |
| [`E_MAIL_TRANSPORT_ERROR`](/fr/reference/errors#e-mail-transport-error) | Le transport n'a pas pu envoyer ; `context` porte le statut ou le code réseau. |
| [`E_MAIL_RETRY_CONFIG`](/fr/reference/errors#e-mail-retry-config) | Un réglage de nouvelle tentative est hors limites. |
| [`E_MAIL_CONFIG_MISSING`](/fr/reference/errors#e-mail-config-missing) | Aucune configuration `mail` n'est enregistrée. |
| [`E_MAIL_UNKNOWN_MAILER`](/fr/reference/errors#e-mail-unknown-mailer) | Un nom de mailer, ou le mailer par défaut, n'est pas déclaré. |
| [`E_MAIL_UNKNOWN_TRANSPORT`](/fr/reference/errors#e-mail-unknown-transport) | Un mailer désigne un transport non enregistré. |
| [`E_MAIL_JOB_MALFORMED`](/fr/reference/errors#e-mail-job-malformed) | La charge d'un job d'e-mail en file est absente ou n'est pas un objet. |
| [`E_MAIL_TEMPLATE_ENGINE`](/fr/reference/errors#e-mail-template-engine) | L'app utilise inker mais rover ne peut pas rendre les vues d'e-mail avec. |
| [`E_MAIL_TEMPLATE_NOT_FOUND`](/fr/reference/errors#e-mail-template-not-found) | Un template d'e-mail est introuvable. |
| [`E_MAIL_TEMPLATE_READ_ERROR`](/fr/reference/errors#e-mail-template-read-error) | Un template d'e-mail ne peut pas être lu. |
| [`E_MAIL_TEMPLATE_SYNTAX`](/fr/reference/errors#e-mail-template-syntax) | Un template d'e-mail contient une erreur de syntaxe. |
| [`E_MAIL_TEMPLATE_RECURSION`](/fr/reference/errors#e-mail-template-recursion) | Des templates d'e-mail s'incluent trop profondément. |
| [`E_MAIL_TEMPLATE_NAPI_REQUIRED`](/fr/reference/errors#e-mail-template-napi-required) | Il n'y a pas de binaire natif rover pour cette plateforme. |
| [`E_ROVER_ICAL_UNAVAILABLE`](/fr/reference/errors#e-rover-ical-unavailable) | `icalEvent(callback)` a besoin d'`ical-generator`, qui n'est pas installé ou ne construit pas de calendrier. |
| [`E_ROVER_UNKNOWN`](/fr/reference/errors#e-rover-unknown) | Un envoi a échoué avec une erreur sans code propre. Seulement le `error.code` d'un événement `mail:failed` : il n'y a pas de classe. |
| [`E_ROVER_NOT_BOOTED`](/fr/reference/errors#e-rover-not-booted) | Le singleton mail de `services/main` a servi avant le boot de `RoverProvider`. |
| [`E_ROVER_FAKE_ACTIVE`](/fr/reference/errors#e-rover-fake-active) | `mail.fake()` a été appelé alors qu'un faux est déjà actif ; appelez d'abord `restore()`. |
| [`E_ROVER_INVALID_PREDICATE`](/fr/reference/errors#e-rover-invalid-predicate) | Une assertion du faux mailer a reçu un `containing` vide, qui correspondrait à tous les messages. |
| [`E_ROVER_ABSTRACT_MAIL`](/fr/reference/errors#e-rover-abstract-mail) | `BaseMail` a été instancié directement au lieu d'une sous-classe. |
| [`E_ROVER_WEBHOOK_KEY_MISSING`](/fr/reference/errors#e-rover-webhook-key-missing) | Un handler de webhook a été créé sans son secret, sa clé publique ou sa clé de signature. |
| [`E_ROVER_WEBHOOK_INVALID_SECRET`](/fr/reference/errors#e-rover-webhook-invalid-secret) | Le secret du webhook Resend n'est pas du base64 valide, ou fait moins de 16 octets une fois décodé. |
| [`E_ROVER_INTERNAL`](/fr/reference/errors#e-rover-internal) | Un invariant interne a été rompu (nodemailer n'a composé aucun message) ; signalez-le comme un bug. |

## Migration

- `RoverError` disparaît. Remplacez `instanceof RoverError` par un test sur `error.code`, ou par `instanceof errors.E_MAIL_TRANSPORT_ERROR` (ou la classe du code attendu), `errors` venant de `@c9up/rover`.
- `error.hint` devient `error.help`.
- `context` ne reste que sur les quatre classes listées sous [Erreurs](#erreurs) ; les autres erreurs n'en ont pas. `context.attempts` n'est posé que sur une `E_MAIL_TRANSPORT_ERROR`.
- `E_MAIL_PROVIDER_ERROR` devient `E_MAIL_TRANSPORT_ERROR`. Elle se construit avec `new errors.E_MAIL_TRANSPORT_ERROR(message, { context, cause, help })` : `context` passe du deuxième argument aux options.
- `E_MAIL_PROVIDER_CONFIG` devient `E_INVALID_CONFIG` pour une configuration de transport incomplète ou invalide ; une clé manquante se lit `Invalid config for "resend" transport. The "apiKey" property is missing`. Un message sans destinataire lève désormais `E_MAIL_INVALID_MESSAGE`, et `icalEvent(callback)` sans `ical-generator` utilisable lève `E_ROVER_ICAL_UNAVAILABLE`.
- `E_ASSERTION_FAILED` disparaît : les assertions sur un message et celles du fake lèvent une `AssertionError` de `node:assert`.
- `docsUrl`, `sourceFile`, `sourceLine` et `pipelineStage` disparaissent : rien ne les renseignait.
- Le `name` d'une erreur ne vaut plus `"RoverError"`.

## Voir aussi

- [Introduction](/fr/guides/digging-deeper/mail/)
- [Messages](/fr/guides/digging-deeper/mail/messages)
- [Transports](/fr/guides/digging-deeper/mail/transports)
- [Files et événements](/fr/guides/digging-deeper/mail/queues-and-events)
- [goldstone](/fr/reference/goldstone), pour lire des e-mails
