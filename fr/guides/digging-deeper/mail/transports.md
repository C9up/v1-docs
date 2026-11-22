# Transports

Ce guide couvre les transports :

- Transports disponibles
- Un mailer par son nom

## Transports disponibles

### SMTP

Envoi par le client SMTP de nodemailer. Chaque option SMTP de nodemailer est
transmise telle quelle (`tls`, `pool`, `maxConnections`, délais, `dkim`, un
objet `auth` OAuth2, `service`, `name`, `proxy`, `logger`) ; `user`/`pass` est
un raccourci pour `auth: { user, pass }`, et `port` accepte une chaîne
numérique, comme une variable d'environnement.

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

Les identifiants ne partent jamais avant que TLS soit établi. Sur le port 465
(`secure: true`, ou `secure` omis) la connexion est chiffrée dès le premier
octet. Sur 587 le transport exige STARTTLS : si le serveur ne le propose pas, ce
qu'un intermédiaire malveillant obtient en le retirant de la réponse EHLO,
l'envoi échoue au lieu de continuer en clair et d'envoyer `AUTH`.
`requireTLS: false`, `ignoreTLS` et `opportunisticTLS` sont refusés avec des
identifiants.

Un serveur de développement local sans TLS (Mailpit, MailHog) est le seul cas
où s'en passer, explicitement :

```typescript
{ transport: 'smtp', host: 'localhost', port: 1025, user: 'dev', pass: 'dev', allowInsecureAuth: true }
```

Chaque corps texte (texte, HTML, watch, invitation calendrier) part avec des fins
de ligne CRLF uniquement : un CR ou un LF isolé devient CRLF avant d'atteindre le
flux DATA, si bien qu'un texte utilisateur inséré dans un mail ne peut pas
terminer le message trop tôt et faire passer des commandes SMTP derrière.

### API des fournisseurs

Mailgun, SparkPost et SES reçoivent le message tel que nodemailer le compose
pour le SMTP (Mailgun `messages.mime`, SparkPost `email_rfc822`, SES
`SendRawEmail`) : noms d'affichage encodés à part, corps encodés pour le
transfert, en-têtes de fil, priorité, `List-*`, images `cid:` en ligne et corps
watch arrivent comme en SMTP, et les destinataires en copie cachée sont servis
sans en-tête `Bcc`.

Resend, SendGrid et Brevo prennent du JSON. Rover leur transmet `Message-ID`,
`In-Reply-To`, `References`, les en-têtes de priorité et `List-*` en en-têtes
personnalisés, et les adresses en `{ email, name }`. Une image `embed()` part en
ligne (`content_id`) chez Resend et SendGrid ; Brevo n'a pas de parties en ligne
et la reçoit en pièce jointe ordinaire. Ces trois API n'ont pas de corps watch.

L'enveloppe : SES la transmet en `Source` et `Destinations`, SparkPost en
`return_path` et liste de destinataires, Mailgun accepte les destinataires
d'enveloppe mais pas l'expéditeur d'enveloppe, et les API JSON la refusent
(`E_MAIL_FIELD_UNSUPPORTED`).

### Log (développement)

Affiche les destinataires et le sujet de chaque message dans la console. Aucune connexion réseau n'est établie. Utile en développement et dans les environnements CI. Le corps n'est pas affiché sauf avec `logBody: true` : un mailer laissé sur `log` par erreur copierait sinon les liens de réinitialisation et les codes à usage unique dans les journaux. Chaque champ est encodé en JSON, si bien qu'un saut de ligne dans un sujet ne peut pas forger une ligne de journal.

```typescript
{
  transport: 'log',
  logBody: true, // facultatif
}
```

Le provider refuse de démarrer quand aucun `config/mail.ts` n'est enregistré (`E_MAIL_CONFIG_MISSING`) au lieu de se rabattre sur ce mailer.

### Transports personnalises

Implémentez l'interface `MailTransport` et enregistrez une factory via `registerTransport()` :

```typescript
import { registerTransport } from '@c9up/rover'
import type { MailTransport, MailMessage } from '@c9up/rover'

class ResendTransport implements MailTransport {
  readonly #config: Record<string, unknown>

  constructor(config: Record<string, unknown>) {
    this.#config = config
  }

  async send(message: MailMessage): Promise<void> {
    // appel API Resend avec this.#config.apiKey
  }
}

registerTransport('resend', (config) => new ResendTransport(config))

// `transport: 'resend'` peut maintenant figurer dans la config mail :
// mailers: { resend: { transport: 'resend', apiKey: process.env.RESEND_KEY } }
```

Une config qui nomme un transport que personne n'a enregistré échoue à la
construction de `Mail` (`E_MAIL_UNKNOWN_TRANSPORT`), avec une indication d'appeler `registerTransport()`
d'abord : enregistrez-le avant que le provider construise les mailers (en tête
d'un fichier de preload, par exemple).

## Un mailer par son nom

```ts
mail.use()                                   // le mailer `default`
const ses = mail.use('ses')
await ses.send((m) => m.to(user.email).subject('Bonjour').text('…'))
await ses.sendCompiled(messageConstruit)
await ses.sendLaterCompiled(messageConstruit, { queue: 'mail' })
await ses.close()                            // les connexions de ce transport seulement
```

`use()` sans nom rend le mailer que nomme `default`. Le `Mailer` rendu porte
les méthodes par message, chacune liée à son propre transport. La file reste
unique par `Mail` : `setMessenger()` est sur le gestionnaire, pas sur un
`Mailer`.
