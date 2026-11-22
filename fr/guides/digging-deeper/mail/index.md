# Introduction

Ce guide couvre l'envoi d'e-mails avec rover :

- Installation
- Configuration
- Configuration
- Enregistrement du provider
- Envoi de mail
- Utilisation autonome

Rover est le module de mail de Ream. Il supporte SMTP, un transport log pour le développement, et des transports personnalises. Rover est autonome — il fonctionne dans toute application Node.js sans requierir Ream.

## Installation

```bash
pnpm add @c9up/rover
```

Pour une application Ream, exécutez la commande de configuration pour générer le fichier de config et enregistrer le provider :

```bash
ream configure @c9up/rover
```

## Configuration

Créez `config/mail.ts` :

```typescript
import { defineConfig } from '@c9up/rover'

export default defineConfig({
  default: 'smtp',
  from: 'noreply@example.com',
  mailers: {
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

`default` doit nommer l'un des `mailers` ; toute autre valeur est refusée au
démarrage de l'application, et non au premier email qu'elle tente d'envoyer.

Le transport de chaque mailer est construit à sa première utilisation, puis
réutilisé. Un mailer par lequel l'application n'envoie jamais, comme une entrée
`smtp` dont `SMTP_HOST` est encore vide, n'empêche pas le démarrage ; son erreur
de configuration est levée à sa première utilisation. `closeAll()` ferme les
transports construits jusque-là.

En développement, utilisez `default: 'log'` pour afficher les emails dans la console sans les envoyer.

## Configuration

```ts
import { defineConfig, transports } from '@c9up/rover'

export default defineConfig({
  default: 'smtp',
  from: 'noreply@acme.com',
  mailers: {
    smtp: transports.smtp({ host: env.get('SMTP_HOST') }),
    ses: transports.ses({ region: 'eu-west-1', accessKeyId, secretAccessKey }),
  },
})
```

Chaque transport livré s'enregistre au chargement de l'entrée du paquet —
`smtp`, `log`, `ses`, `mailgun`, `sparkpost`, `resend`, `brevo`, `sendgrid`.
Il n'y a pas de helper `postmark` : rover n'a pas ce transport, donc une config
qui le nomme échoue à la **compilation** plutôt qu'au démarrage.

Les transports HTTP (`mailgun`, `sparkpost`, `brevo`, `sendgrid`) acceptent un
`baseUrl` pour un proxy placé devant le fournisseur. Chaque requête vers lui
porte la clé d'API : il doit donc être en `https://` — `http://` seulement vers
`localhost`, pour une imitation locale de l'API — sans identifiants, ni
paramètres, ni fragment ; sinon la construction du transport échoue avec
`E_MAIL_PROVIDER_CONFIG`. Omis, c'est l'adresse du fournisseur.

`transports` est l'ancien nom rover de la même table. Il fonctionne toujours —
une config écrite ainsi n'a rien à changer — mais les nouvelles déclarent
`mailers`.

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

L'adresse `from` par défaut de la configuration est appliquée automatiquement. Vous pouvez la surcharger par message :

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

Pour utiliser un transport nomme spécifique au lieu du transport par défaut :

```typescript
await mail.send((message) => {
  message.to('dev@example.com').subject('Test').text('Bonjour')
}, 'log')
```

`send()` et `sendCompiled()` renvoient une `MailResponse` : le `messageId` à
rapprocher des webhooks du fournisseur, l'`envelope` (`{ from, to }`) transmise
aux serveurs, et le résultat brut du transport dans `original`. L'événement
`mail:sent` porte le même objet dans `response`.

```typescript
const { messageId } = await mail.send((message) => {
  message.to('alice@example.com').subject('Bienvenue').text('Bonjour')
})
```

## Utilisation autonome

Rover ne nécessite pas Ream. Instanciez `Mail` directement avec un objet de configuration :

```typescript
import { Mail } from '@c9up/rover'

const mail = new Mail({
  default: 'smtp',
  from: 'noreply@example.com',
  mailers: {
    smtp: { transport: 'smtp', host: 'localhost', port: 1025 },
  },
})

await mail.send((msg) => {
  msg.to('user@example.com').subject('Bonjour').text('Monde')
})
```

## Étapes suivantes
- [Warden (Auth)](/fr/guides/auth/introduction) — Envoyer des emails de réinitialisation de mot de passe ou de vérification
- [Bay (Queue)](/fr/guides/digging-deeper/queues) — Mettre les emails en file d'attente pour un envoi en arrière-plan
