# goldstone

`@c9up/goldstone` : la lecture d'e-mails pour ream : des boîtes IMAP (surveillées en temps réel avec IDLE) et le courrier entrant que les fournisseurs postent sur un webhook, chaque message analysé comme une entrée hostile, son HTML assaini et son expéditeur vérifié (DKIM, SPF, DMARC, ARC). L'envoi reste à [rover](/fr/reference/rover).

## Installation

```bash
pnpm add @c9up/goldstone
```

Ajoutez `() => import('@c9up/goldstone/provider')` aux providers de `reamrc.ts` et créez `config/inbox.ts`. L'analyse et la vérification de l'expéditeur tournent sur un moteur Rust livré en binaire précompilé ; `@c9up/ream` est une dépendance pair facultative.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/goldstone` | `defineConfig`, `InboxManager`, `Mailbox`, l'analyse des messages (`parseMessage`, `readMessage`), la vérification de l'expéditeur (`authenticate`), le gestionnaire entrant Mailgun et les classes d'erreur. |
| `@c9up/goldstone/provider` | `GoldstoneProvider` (export par défaut) : lie l'`InboxManager` construit depuis `config/inbox.ts`. |
| `@c9up/goldstone/services/main` | L'`InboxManager` de l'application (export par défaut), résolu au premier accès à un membre. |

## Exports

### `@c9up/goldstone`

| Export | Nature | Description |
|---|---|---|
| `defineConfig` | fonction | Vérifie et type `config/inbox.ts`. |
| `InboxConfig` | interface | La configuration `inbox`. |
| `MailboxConfig` | interface | Une boîte IMAP. |
| `PasswordAuth`, `TokenAuth` | interface | Les identifiants d'une boîte. |
| `InboxManager` | classe | Les boîtes configurées, par nom. |
| `Mailbox` | classe | Une boîte IMAP : rechercher, récupérer, marquer, déplacer, supprimer, surveiller. |
| `MailboxOptions` | interface | `limits`, `authenticate`, `remoteContent` pour chaque message lu. |
| `SearchCriteria` | type | Des critères de recherche IMAP (l'objet de recherche d'imapflow). |
| `WatchOptions` | interface | Options de `Mailbox.watch`. |
| `reconnectDelay` | fonction | L'attente avant la tentative de reconnexion `n`. |
| `parseMessage` | fonction | Analyse les octets bruts d'un message, sans DNS. |
| `readMessage` | fonction | Analyse les octets bruts d'un message et vérifie l'expéditeur. |
| `ReceivedMessage` | classe | Un message analysé. |
| `ParseOptions`, `ReadOptions` | interface | Options de `parseMessage` et `readMessage`. |
| `Limits` | interface | Les bornes appliquées pendant l'analyse. |
| `Address` | interface | `{ readonly name?: string; readonly address?: string }`. |
| `Header` | interface | `{ readonly name: string; readonly value: string }`, la valeur telle que reçue. |
| `Attachment` | interface | Une pièce jointe. |
| `authenticate` | fonction | Vérifie l'expéditeur d'octets bruts. |
| `Authenticity` | interface | Le verdict sur l'expéditeur. |
| `AuthenticateOptions` | interface | L'enveloppe et les bornes de la vérification. |
| `AuthResult` | type | `'pass' \| 'fail' \| 'softfail' \| 'neutral' \| 'none' \| 'temperror' \| 'permerror'`. |
| `DkimVerdict` | interface | Le verdict d'une signature DKIM. |
| `DmarcPolicy` | type | `'none' \| 'quarantine' \| 'reject' \| 'unspecified'`. |
| `createMailgunInboundHandler` | fonction | Un gestionnaire de route pour le courrier entrant de Mailgun. |
| `MailgunInboundOptions` | interface | Ses options. |
| `InboundMeta` | interface | `{ recipient?: string; sender?: string }` : l'enveloppe SMTP. |
| `InboundHttpContext`, `InboundResponse` | interface | Le contexte HTTP dont a besoin le gestionnaire. |
| `ReplayGuard` | interface | Où sont mémorisés les jetons de livraison traités. |
| `MemoryReplayGuard` | classe | Le `ReplayGuard` en processus. |
| `isNativeAvailable` | fonction | Indique si le moteur Rust est chargé. |
| `GoldstoneError` | erreur | Tout échec de goldstone. |
| `GoldstoneNativeRequiredError` | erreur | Le moteur Rust n'est pas chargé. |
| `fromEngine` | fonction | Transforme un échec du moteur en `GoldstoneError` avec son code. |

### `InboxManager`

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new InboxManager<Mailboxes>(config: InboxConfig<Mailboxes>)` | |
| `mailbox` | `mailbox(name?: keyof Mailboxes & string): Mailbox` | Une boîte par son nom, celle par défaut sans nom ; n'ouvre encore rien. Un nom inconnu lève `E_GOLDSTONE_UNKNOWN_MAILBOX`. |
| `closeAll` | `closeAll(): Promise<void>` | Arrête toutes les surveillances et se déconnecte de chaque boîte. |

### `Mailbox`

Chaque méthode qui prend un `folder` vaut `'INBOX'` par défaut. Les messages sont lus avec `readMessage`, sous les bornes de la boîte.

| Membre | Signature | Description |
|---|---|---|
| constructeur | `new Mailbox(name: string, config: MailboxConfig, options?: MailboxOptions)` | Refuse une connexion sans TLS ou sans vérification du certificat (voir Configuration). |
| `name` | `readonly name: string` | |
| `folders` | `folders(): Promise<string[]>` | Le chemin de chaque dossier. |
| `search` | `search(criteria: SearchCriteria, folder?: string): Promise<number[]>` | Les UID des messages correspondants, triés. |
| `fetch` | `fetch(uid: number, folder?: string): Promise<ReceivedMessage \| undefined>` | Un message, ou `undefined` si aucun message n'a cet UID. Un message que le serveur annonce au-delà de `maxBytes` est refusé avant téléchargement. |
| `markSeen`, `markUnseen` | `(uids: number \| number[], folder?: string): Promise<void>` | Pose ou retire `\Seen`. |
| `move` | `move(uids: number \| number[], to: string, folder?: string): Promise<void>` | Déplace des messages vers un autre dossier. |
| `delete` | `delete(uids: number \| number[], folder?: string): Promise<void>` | Supprime des messages. |
| `watch` | `watch(handler: (message: ReceivedMessage, meta: { uid: number }) => unknown, options?: WatchOptions): () => Promise<void>` | Appelle `handler` pour chaque nouveau message dès son arrivée, sur une connexion dédiée ; renvoie la fonction qui arrête la surveillance. Une connexion perdue se rouvre avec une attente croissante, sans rien sauter ni livrer deux fois ; un gestionnaire qui lève une erreur n'arrête pas la surveillance. |
| `close` | `close(): Promise<void>` | Arrête toutes les surveillances et se déconnecte. |

| Champ de `WatchOptions` | Type | Défaut | Description |
|---|---|---|---|
| `folder` | `string` | `'INBOX'` | Le dossier surveillé. |
| `afterUid` | `number` | | Livrer les messages après cet UID ; sans lui, seulement ce qui arrive une fois la surveillance lancée. |
| `onError` | `(error: unknown) => void` | `console.error` | Informé de ce qui n'arrête pas la surveillance : une connexion perdue, un message refusé, un gestionnaire en erreur, des UID réinitialisés (`E_GOLDSTONE_UIDVALIDITY_CHANGED`). |

| Fonction | Signature | Description |
|---|---|---|
| `reconnectDelay` | `reconnectDelay(attempt: number): number` | 0,5 s, 1 s, 2 s… jusqu'à 30 s, en ms. |

### Analyse

| Fonction | Signature | Description |
|---|---|---|
| `parseMessage` | `parseMessage(raw: Uint8Array, options?: ParseOptions): Promise<ReceivedMessage>` | Analyse des octets RFC 5322 bruts hors de la boucle d'événements. Sans DNS : `authenticity` est absent. |
| `readMessage` | `readMessage(raw: Uint8Array, options?: ReadOptions): Promise<ReceivedMessage>` | Analyse et vérifie l'expéditeur à partir d'une seule analyse, le verdict dans `message.authenticity`. |
| `authenticate` | `authenticate(raw: Uint8Array, options?: AuthenticateOptions): Promise<Authenticity>` | Vérifie qui a envoyé le message. |
| `isNativeAvailable` | `isNativeAvailable(): boolean` | |
| `fromEngine` | `fromEngine(error: unknown): GoldstoneError` | |

| Option | Type | Défaut | Description |
|---|---|---|---|
| `ParseOptions.limits` | `Limits` | voir ci-dessous | Les bornes appliquées pendant l'analyse. |
| `ParseOptions.remoteContent` | `'block' \| 'allow'` | `'block'` | Indique si le `html` assaini peut charger des images, fonds et affiches distants. Les références `cid:` et les liens restent dans les deux cas. |
| `ReadOptions.authenticate` | `boolean \| AuthenticateOptions` | `true` | Vérifier DKIM, SPF et DMARC. |
| `AuthenticateOptions.ip`, `helo`, `mailFrom` | `string` | | L'IP, le HELO et le MAIL FROM du serveur qui a livré : ce que vérifie SPF. Sans eux, SPF vaut `none`. |
| `AuthenticateOptions.maxDkimSignatures` | `number` | `5` | Le nombre maximal de signatures DKIM vérifiées. |
| `AuthenticateOptions.timeoutMs` | `number` | `10000` | Pour toute la vérification ; au-delà, `temperror`. |
| `AuthenticateOptions.maxBytes` | `number` | 25 Mio | Taille du message brut, vérifiée en premier. |

| Champ de `Limits` | Défaut | Description |
|---|---|---|
| `maxBytes` | 25 Mio | Taille du message brut, vérifiée avant l'analyse. |
| `maxParts` | 1000 | Les parties MIME, y compris celles des messages transportés. |
| `maxDepth` | 32 | La profondeur d'imbrication des multiparts et des messages transportés. |
| `maxHeaders` | 1000 | Les champs d'un bloc d'en-têtes. |
| `maxHeaderBytes` | 1 Mio | Taille d'un bloc d'en-têtes. |
| `maxAttachments` | 100 | Le nombre de pièces jointes. |
| `maxAttachmentBytes` | 25 Mio | Taille d'une pièce jointe décodée. |
| `maxHtmlBytes` | 512 Kio | Taille du corps HTML assaini ; au-delà, le message est lu sans `html`. |

Chaque borne est un entier positif inférieur à 2^32.

### `ReceivedMessage`

| Membre | Type | Description |
|---|---|---|
| `messageId`, `subject` | `string \| undefined` | |
| `date` | `Date \| undefined` | |
| `from`, `to`, `cc`, `bcc`, `replyTo` | `readonly Address[]` | |
| `inReplyTo`, `references` | `readonly string[]` | |
| `headers` | `readonly Header[]` | Tous les en-têtes, tels que reçus. |
| `text` | `string \| undefined` | Le corps texte. |
| `html` | `string \| undefined` | Assaini pour l'affichage : ni script, ni gestionnaire d'événement, ni URL `javascript:`, ni contenu distant sauf autorisation. |
| `htmlError` | `GoldstoneError \| undefined` | Pourquoi `html` est absent alors que le message a un corps HTML (`E_GOLDSTONE_HTML_TOO_LARGE`, `…_TOO_DEEP`, `…_TOO_COMPLEX`). |
| `attachments` | `readonly Attachment[]` | |
| `authenticity` | `Authenticity \| undefined` | Présent quand le message est lu avec `readMessage`. |
| `header(name)` | `header(name: string): string \| undefined` | Le premier en-tête de ce nom, sans tenir compte de la casse. |
| `unsanitizedHtml()` | `unsanitizedHtml(): string \| undefined` | Le HTML tel que l'expéditeur l'a écrit ; ne le rendez jamais. |

| Champ de `Attachment` | Type | Description |
|---|---|---|
| `fileName` | `string` | Sûr comme nom d'enregistrement sur tout système. |
| `originalName` | `string \| undefined` | Le nom tel que l'expéditeur l'a écrit, pour l'affichage seulement. |
| `contentType` | `string` | |
| `size` | `number` | |
| `content` | `Uint8Array` | |
| `contentId` | `string \| undefined` | |
| `inline` | `boolean` | |

### `Authenticity`

| Champ | Type | Description |
|---|---|---|
| `summary` | `'pass' \| 'fail' \| 'none' \| 'temperror'` | `pass` seulement si DMARC a réussi pour `fromDomain` ; `fail` s'il a échoué ou si le From est ambigu ; `temperror` si une vérification n'a pas pu aboutir. |
| `dkim` | `readonly DkimVerdict[]` | Un par signature : `result`, `domain`, `selector`, `reason`. |
| `spf` | `AuthResult` | `none` si aucune enveloppe n'est fournie. |
| `dmarc` | `AuthResult` | |
| `dmarcPolicy` | `DmarcPolicy` | |
| `dmarcDomain` | `string \| undefined` | Le domaine From pour lequel DMARC a été évalué. |
| `fromDomain` | `string \| undefined` | Le domaine de l'unique adresse From du message ; absent s'il manque ou s'il est ambigu. Le nom affiché n'est jamais authentifié. |
| `arc` | `AuthResult` | |

### Courrier entrant

| Fonction | Signature | Description |
|---|---|---|
| `createMailgunInboundHandler` | `createMailgunInboundHandler(options: MailgunInboundOptions): (ctx: InboundHttpContext, next?: () => Promise<void>) => Promise<void>` | Vérifie la signature de Mailgun sur `timestamp` et `token` et refuse une signature fausse ou périmée (401), lit `body-mime` (422 s'il manque) avec `readMessage`, et appelle `onMessage`. Un jeton déjà traité est acquitté (204) sans être retraité. Un message que goldstone refuse répond 406 pour que Mailgun ne réessaie pas ; quand `onMessage` lève une erreur, le jeton est rendu et l'erreur se propage, pour que Mailgun réessaie ; un succès répond 204. |

| Champ de `MailgunInboundOptions` | Type | Défaut | Description |
|---|---|---|---|
| `signingKey` | `string` | requis | La clé de signature des webhooks. |
| `onMessage` | `(message: ReceivedMessage, meta: InboundMeta) => unknown` | requis | Traite un message. |
| `maxAgeSeconds` | `number` | `120` | Une requête signée plus ancienne est refusée ; un entier de 1 à 86400. |
| `replayGuard` | `ReplayGuard` | `MemoryReplayGuard` | Où sont gardés les jetons traités ; partagez-en un entre instances. |
| `limits` | `Limits` | | |
| `authenticate` | `boolean \| Omit<AuthenticateOptions, 'ip' \| 'helo'>` | `true` | DKIM et DMARC sur chaque message. |
| `remoteContent` | `'block' \| 'allow'` | `'block'` | |

La route doit passer par le body parser, avec des limites de formulaire et de multipart supérieures au plus gros message accepté, et la route Mailgun doit transférer vers une URL qui se termine par `mime`.

| Membre | Signature | Description |
|---|---|---|
| `ReplayGuard.claim` | `claim(token: string, ttlSeconds: number): boolean \| Promise<boolean>` | Prend le jeton ; `false` s'il est déjà pris. Doit être atomique. |
| `ReplayGuard.release` | `release(token: string): void \| Promise<void>` | Rend un jeton. |
| constructeur de `MemoryReplayGuard` | `new MemoryReplayGuard(capacity?: number)` | Capacité par défaut : 100000. |

### `GoldstoneError`

Étend `Error` ; `name` vaut le nom de la classe. `GoldstoneNativeRequiredError` l'étend avec le code `E_GOLDSTONE_NATIVE_REQUIRED`.

| Membre | Signature | Description |
|---|---|---|
| `code` | `readonly code: string` | Un code `E_GOLDSTONE_*`. |
| constructeur | `new GoldstoneError(code: string, message: string, options?: ErrorOptions)` | |

### `@c9up/goldstone/provider`

| Export | Nature | Description |
|---|---|---|
| `GoldstoneProvider` | provider (par défaut) | `register()` construit l'`InboxManager` depuis la configuration `inbox` (sans ouvrir de connexion) ; `shutdown()` ferme chaque boîte. |

### `@c9up/goldstone/services/main`

| Export | Nature | Description |
|---|---|---|
| `default` | const | L'`InboxManager` de l'application. |

```ts
import inbox from '@c9up/goldstone/services/main'

const unread = await inbox.mailbox().search({ seen: false })
```

## Configuration

`config/inbox.ts`, renvoyé par `defineConfig`. `defineConfig` refuse, au démarrage, une configuration sans boîte, une boîte par défaut non déclarée, et une boîte qui se connecterait sans TLS ou sans vérifier le certificat du serveur.

| Option | Type | Défaut | Description |
|---|---|---|---|
| `mailbox` | `string` | requis | La boîte que renvoie `inbox.mailbox()` sans argument. |
| `mailboxes` | `Record<string, MailboxConfig>` | requis | Les boîtes, par nom. |
| `limits` | `Limits` | | Les bornes sur chaque message lu. |
| `authenticate` | `boolean` | `true` | Vérifier DKIM, SPF et DMARC sur chaque message lu. |
| `remoteContent` | `'block' \| 'allow'` | `'block'` | Le contenu distant dans `message.html`. |

| Champ de `MailboxConfig` | Type | Défaut | Description |
|---|---|---|---|
| `host` | `string` | requis | |
| `port` | `number` | 993, ou 143 avec `starttls` | |
| `secure` | `boolean` | `true` sauf avec `starttls` | TLS dès le premier octet. |
| `starttls` | `boolean` | | Chiffrer une connexion en clair, et refuser de continuer si le serveur ne le propose pas. Pas avec `secure: true`. |
| `allowInsecure` | `boolean` | | Autoriser l'absence de TLS ou de vérification du certificat : un serveur de test local uniquement. |
| `tls` | `{ ca?: string \| Buffer; servername?: string; rejectUnauthorized?: boolean }` | | Transmis au TLS de Node. |
| `auth` | `PasswordAuth \| TokenAuth` | requis | `{ user, pass }`, ou `{ user, accessToken }` pour XOAUTH2, où `accessToken` est une chaîne ou une fonction appelée à chaque connexion. |

## Liaisons du conteneur

| Jeton | Résout vers |
|---|---|
| `InboxManager` | Le singleton `InboxManager`. |
| `'goldstone.inbox'` | La même instance. |
| `'inbox'` | La même instance. |

Les jetons en chaîne sont déclarés sur `ContainerBindings`.

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_GOLDSTONE_MESSAGE_TOO_LARGE`](/fr/reference/errors#e-goldstone-message-too-large) | Un message dépasse `maxBytes` ; refusé avant téléchargement quand le serveur annonce sa taille. |
| [`E_GOLDSTONE_NOT_A_MESSAGE`](/fr/reference/errors#e-goldstone-not-a-message) | Les octets ne sont pas un e-mail. |
| [`E_GOLDSTONE_TOO_MANY_PARTS`](/fr/reference/errors#e-goldstone-too-many-parts) | Un message compte plus de parties MIME qu'autorisé. |
| [`E_GOLDSTONE_TOO_DEEP`](/fr/reference/errors#e-goldstone-too-deep) | Des parties MIME sont imbriquées plus profondément qu'autorisé. |
| [`E_GOLDSTONE_TOO_MANY_HEADERS`](/fr/reference/errors#e-goldstone-too-many-headers) | Un bloc d'en-têtes compte plus de champs qu'autorisé. |
| [`E_GOLDSTONE_HEADERS_TOO_LARGE`](/fr/reference/errors#e-goldstone-headers-too-large) | Un bloc d'en-têtes dépasse la taille autorisée. |
| [`E_GOLDSTONE_MISSING_BOUNDARIES`](/fr/reference/errors#e-goldstone-missing-boundaries) | Un message multipart déclare des délimiteurs qui n'apparaissent jamais. |
| [`E_GOLDSTONE_BOUNDARY_TOO_LONG`](/fr/reference/errors#e-goldstone-boundary-too-long) | Un délimiteur multipart est trop long. |
| [`E_GOLDSTONE_TOO_MANY_ATTACHMENTS`](/fr/reference/errors#e-goldstone-too-many-attachments) | Un message compte plus de pièces jointes qu'autorisé. |
| [`E_GOLDSTONE_ATTACHMENT_TOO_LARGE`](/fr/reference/errors#e-goldstone-attachment-too-large) | Une pièce jointe dépasse la taille autorisée. |
| [`E_GOLDSTONE_HTML_TOO_LARGE`](/fr/reference/errors#e-goldstone-html-too-large) | Le corps HTML dépasse `maxHtmlBytes` (dans `htmlError`). |
| [`E_GOLDSTONE_HTML_TOO_DEEP`](/fr/reference/errors#e-goldstone-html-too-deep) | Le corps HTML est imbriqué trop profondément (dans `htmlError`). |
| [`E_GOLDSTONE_HTML_TOO_COMPLEX`](/fr/reference/errors#e-goldstone-html-too-complex) | Le corps HTML compte trop d'éléments (dans `htmlError`). |
| [`E_GOLDSTONE_DNS_UNAVAILABLE`](/fr/reference/errors#e-goldstone-dns-unavailable) | Une vérification de l'expéditeur avait besoin du DNS et le DNS a échoué. |
| [`E_GOLDSTONE_INVALID_ENVELOPE`](/fr/reference/errors#e-goldstone-invalid-envelope) | L'enveloppe donnée à une vérification de l'expéditeur est invalide. |
| [`E_GOLDSTONE_ENGINE`](/fr/reference/errors#e-goldstone-engine) | Le moteur a échoué sans l'un des codes ci-dessus. |
| [`E_GOLDSTONE_NATIVE_REQUIRED`](/fr/reference/errors#e-goldstone-native-required) | Le moteur e-mail Rust n'est pas chargé. |
| [`E_GOLDSTONE_INVALID_LIMITS`](/fr/reference/errors#e-goldstone-invalid-limits) | Une borne d'analyse n'est pas un entier positif inférieur à 2^32. |
| [`E_GOLDSTONE_INVALID_OPTIONS`](/fr/reference/errors#e-goldstone-invalid-options) | Une option de vérification de l'expéditeur, `remoteContent` ou une durée anti-rejeu est invalide. |
| [`E_GOLDSTONE_INVALID_CONFIG`](/fr/reference/errors#e-goldstone-invalid-config) | La configuration inbox ou les options du gestionnaire entrant sont invalides. |
| [`E_GOLDSTONE_INSECURE_CONNECTION`](/fr/reference/errors#e-goldstone-insecure-connection) | Une boîte se connecterait sans TLS ou sans vérifier le certificat. |
| [`E_GOLDSTONE_UNKNOWN_MAILBOX`](/fr/reference/errors#e-goldstone-unknown-mailbox) | Un nom de boîte n'est pas configuré. |
| [`E_GOLDSTONE_UIDVALIDITY_CHANGED`](/fr/reference/errors#e-goldstone-uidvalidity-changed) | Un dossier surveillé a renuméroté ses messages ; la surveillance reprend au plus récent. |

## Voir aussi

- [rover](/fr/reference/rover), pour envoyer des e-mails
- [E-mail](/fr/guides/digging-deeper/mail/)
