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

const mail = app.container.resolve(Mail)
```

## Envoi de mail

Utilisez `Mail.send()` avec l'API fluente `MessageBuilder` :

```typescript
import { Mail } from '@c9up/rover'

const mail = app.container.resolve(Mail)

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
    .attach('facture.pdf', pdfBuffer, 'application/pdf')
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
| `.attach(filename, content, contentType?)` | Joindre un fichier (`Buffer` ou `string`) |
| `.header(key, value)` | Ajouter un header email personnalise |

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
