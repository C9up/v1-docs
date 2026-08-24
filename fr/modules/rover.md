# Rover — Transport de mail

Rover est le module de mail de Ream. Il supporte SMTP, un transport log pour le developpement, et des transports personnalises. Rover est autonome — il fonctionne dans toute application Node.js sans requierir Ream.

## Installation

```bash
pnpm add @c9up/rover
```

Pour une application Ream, executez la commande de configuration pour generer le fichier de config et enregistrer le provider :

```bash
ream configure @c9up/rover
```

## Configuration

Creez `config/mail.ts` :

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

En developpement, utilisez `default: 'log'` pour afficher les emails dans la console sans les envoyer.

## Enregistrement du provider

Enregistrez le provider Rover depuis le sous-chemin `@c9up/rover/provider` :

```typescript
// start/providers.ts
import RoverProvider from '@c9up/rover/provider'

export const providers = [RoverProvider]
```

Une fois enregistre, l'instance `Mail` est disponible depuis le conteneur IoC :

```typescript
import { Mail } from '@c9up/rover'

const mail = await app.container.resolve(Mail)
```

## Envoi de mail

Utilisez `Mail.send()` avec l'API fluente `MessageBuilder` :

```typescript
import { Mail } from '@c9up/rover'

const mail = await app.container.resolve(Mail)

await mail.send((message) => {
  message
    .to('alice@example.com')
    .subject('Bienvenue sur Ream')
    .html('<h1>Bonjour, Alice !</h1>')
})
```

L'adresse `from` par defaut de la configuration est appliquee automatiquement. Vous pouvez la surcharger par message :

```typescript
await mail.send((message) => {
  message
    .from('equipe@example.com')
    .to('bob@example.com')
    .cc('manager@example.com')
    .bcc('archive@example.com')
    .replyTo('support@example.com')
    .subject('Votre facture')
    .html('<p>Veuillez trouver votre facture en piece jointe.</p>')
    .text('Veuillez trouver votre facture en piece jointe.')
    .attachData(pdfBuffer, { filename: 'facture.pdf', contentType: 'application/pdf' })
    .header('X-Custom-Header', 'valeur')
})
```

Pour utiliser un transport nomme specifique au lieu du transport par defaut :

```typescript
await mail.send((message) => {
  message.to('dev@example.com').subject('Test').text('Bonjour')
}, 'log')
```

## API MessageBuilder

| Methode | Description |
|---|---|
| `.from(address)` | Adresse expediteur (surcharge le defaut de la config) |
| `.to(address)` | Ajouter un destinataire (appel multiple pour plusieurs destinataires) |
| `.cc(address)` | Ajouter un destinataire en copie |
| `.bcc(address)` | Ajouter un destinataire en copie cachee |
| `.replyTo(address)` | Definir l'adresse de reponse |
| `.subject(text)` | Objet de l'email |
| `.html(content)` | Corps HTML |
| `.text(content)` | Corps en texte brut |
| `.attach(file, options?)` | Joindre un fichier par chemin ou URL `file://`, lu à la construction du message |
| `.attachData(content, { filename })` | Joindre des octets déjà en main (`Buffer` ou `string`) |
| `.embed(file, cid, options?)` | Intégrer un fichier en ligne, référencé par `cid:<cid>` dans le HTML |
| `.embedData(content, cid, options?)` | Intégrer des octets en ligne sous un `cid` |
| `.header(key, value)` | Ajouter un en-tête personnalisé |
| `.encoding(encoding)` | Encodage de transfert du corps (SMTP uniquement) |
| `.listUnsubscribe(value, { oneClick? })` | `List-Unsubscribe`, plus l'en-tête one-click RFC 8058 |
| `.listSubscribe(value)` / `.listHelp(value)` | Les autres en-têtes `List-*` de la RFC 2369 |
| `.addListHeader(key, value)` | N'importe quel `List-<key>` (`key` sans le préfixe `List-`) |
| `.icalEvent(ics, options?)` | Joindre une invitation calendrier depuis du texte ICS |
| `.icalEventFromFile(file, options?)` | …lue depuis un fichier |
| `.icalEventFromUrl(url, options?)` | …récupérée depuis une URL (SMTP uniquement) |

> **List-Unsubscribe et délivrabilité.** Gmail et Yahoo exigent des expéditeurs
> en masse une désinscription en un clic. `oneClick: true` émet l'en-tête RFC
> 8058 `List-Unsubscribe-Post` à côté de l'URL, et refuse une cible `mailto:` —
> elle ne peut pas répondre à un POST.

> **Invitations calendrier.** `icalEventFromUrl()` est réservé au SMTP :
> nodemailer récupère l'URL, alors qu'une API HTTP de fournisseur attend les
> octets. Les deux autres formes fonctionnent partout — pour ces transports,
> l'invitation part comme partie `text/calendar`, ce qui est de toute façon la
> façon dont les clients mail la lisent.
>
> Déviation nommée : en amont, un callback de construction `ical-generator` est
> aussi accepté. rover ne porte pas cette dépendance et prend le texte ICS.

## Transports disponibles

### SMTP

Envoi via une connexion SMTP brute avec TLS et AUTH LOGIN optionnels.

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

### Log (developpement)

Affiche les details de l'email dans la console. Aucune connexion reseau n'est etablie. Utile en developpement et dans les environnements CI.

```typescript
{
  transport: 'log',
}
```

### Transports personnalises

Implementez l'interface `MailTransport` :

```typescript
import type { MailTransport, MailMessage } from '@c9up/rover'

class ResendTransport implements MailTransport {
  async send(message: MailMessage): Promise<void> {
    // appel API Resend
  }
}
```

## Utilisation autonome

Rover ne necessite pas Ream. Instanciez `Mail` directement avec un objet de configuration :

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
  msg.to('user@example.com').subject('Bonjour').text('Monde')
})
```

## Etapes suivantes

- [Warden (Auth)](/fr/modules/warden) — Envoyer des emails de reinitialisation de mot de passe ou de verification
- [Bay (Queue)](/fr/modules/bay) — Mettre les emails en file d'attente pour un envoi en arriere-plan

## Configuration

```ts
import { defineConfig, transports } from '@c9up/rover'

export default defineConfig({
  default: 'smtp',
  from: 'noreply@acme.com',
  mailers: {                                    // `transports` marche aussi
    smtp: transports.smtp({ host: env.get('SMTP_HOST') }),
    ses: transports.ses({ region: 'eu-west-1', accessKeyId, secretAccessKey }),
  },
})
```

Chaque transport livré s'enregistre au chargement de l'entrée du paquet —
`smtp`, `log`, `ses`, `mailgun`, `sparkpost`, `resend`, `brevo`, `sendgrid`.
Il n'y a pas de helper `postmark` : rover n'a pas ce transport, donc une config
qui le nomme échoue à la **compilation** plutôt qu'au démarrage.

## Mails dépêchables

```ts
class WelcomeMail extends BaseMail {
  from = 'noreply@acme.com'
  subject = 'Bienvenue'
  constructor(private user: User) { super() }
  prepare() {
    this.message.to(this.user.email).htmlView('emails/welcome', { user: this.user })
  }
}

await new WelcomeMail(user).send(mail.use('smtp'))
```

`message` est public, ce qui permet à un test de le lire :

```ts
mails.assertSent(WelcomeMail, (mail) => mail.message.hasTo(user.email))
```

## Inspecter un message

`has*` répond, `assert*` lève et rapporte ce qu'il a vraiment reçu :

```ts
message.hasTo('ada@acme.test')
message.assertSubject('Bienvenue')
message.assertHtmlIncludes('Bonjour')
message.toObject()
```

Les adresses sont stockées sous leur forme d'affichage, donc `hasFrom('a@b.c')`
retrouve l'adresse à l'intérieur de `"Nom" <a@b.c>`.

## Corps texte et enveloppe

```ts
message.textView('emails/welcome.txt', { user })   // à côté de htmlView
message.envelope({ from: 'bounces+reader@acme.com' })
```

Un message HTML seul passe moins bien les filtres anti-spam et est illisible en
client texte. L'enveloppe est ce qu'utilisent les serveurs : un retour en erreur
part vers l'expéditeur d'enveloppe, pas vers l'auteur visible.

## Arrêt

```ts
await mail.closeAll()
```

Réel sur SMTP — cela draine le pool de nodemailer. Un processus qui sort sans ça
laisse le serveur tenir des sockets jusqu'à expiration.

Les noms d'affichage et adresses portant CR, LF ou NUL sont **refusés** : un saut
de ligne ne peut pas être échappé dans un en-tête, il le termine, et l'accepter
est ainsi qu'un formulaire de contact devient un relais ouvert.
