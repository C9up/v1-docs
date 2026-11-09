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

`send()` et `sendCompiled()` renvoient une `MailResponse` : le `messageId` à
rapprocher des webhooks du fournisseur, l'`envelope` (`{ from, to }`) transmise
aux serveurs, et le résultat brut du transport dans `original`. L'événement
`mail:sent` porte le même objet dans `response`.

```typescript
const { messageId } = await mail.send((message) => {
  message.to('alice@example.com').subject('Bienvenue').text('Bonjour')
})
```

## API MessageBuilder

| Methode | Description |
|---|---|
| `.from(address, name?)` | Adresse expéditeur (surcharge le défaut de la config) |
| `.to(address, name?)` / `.to([...])` | Ajouter un destinataire (appel multiple, ou un tableau d'adresses et de `{ address, name }`) |
| `.cc(address, name?)` | Ajouter un destinataire en copie |
| `.bcc(address, name?)` | Ajouter un destinataire en copie cachée |
| `.replyTo(address, name?)` | Ajouter une adresse de réponse (chaque appel en ajoute une) |
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
> 8058 `List-Unsubscribe-Post` à côté de l'URL, et refuse toute cible autre
> qu'`https:` (RFC 8058) — un `mailto:` ne peut pas répondre à un POST.
>
> Chaque entrée `List-*` est une seule URL `https:`, `http:`, `mailto:` ou
> `ftp:`, ou une adresse seule (envoyée en `mailto:`) ; un espace, un chevron ou
> un saut de ligne y est refusé (`E_INVALID_LIST_HEADER`), si bien qu'aucune
> seconde cible ne peut s'y glisser. Les commentaires sont échappés, et encodés à
> part quand ils ne sont pas en ASCII.

> **Invitations calendrier.** `icalEventFromUrl()` est réservé au SMTP :
> nodemailer récupère l'URL, alors qu'une API HTTP de fournisseur attend les
> octets. Les deux autres formes fonctionnent partout — pour ces transports,
> l'invitation part comme partie `text/calendar`, ce qui est de toute façon la
> façon dont les clients mail la lisent.
>
> `icalEvent()` accepte soit le texte ICS, soit un callback de construction,
> comme en amont :
>
> ```ts
> mail.icalEvent((calendar) => {
>   calendar.createEvent({ start, end, summary: 'Revue de sprint' })
> }, { method: 'REQUEST' })
> ```
>
> Le callback s'exécute au moment du `build()`, contre un vrai calendrier
> `ical-generator`. Ce paquet est un **peer optionnel** : installez-le seulement
> si vous construisez vos invitations ainsi — passer le texte ICS n'exige rien.

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

### Log (developpement)

Affiche les destinataires et le sujet de chaque message dans la console. Aucune connexion réseau n'est établie. Utile en développement et dans les environnements CI. Le corps n'est pas affiché sauf avec `logBody: true` : un mailer laissé sur `log` par erreur copierait sinon les liens de réinitialisation et les codes à usage unique dans les journaux. Chaque champ est encodé en JSON, si bien qu'un saut de ligne dans un sujet ne peut pas forger une ligne de journal.

```typescript
{
  transport: 'log',
  logBody: true, // facultatif
}
```

Le provider refuse de démarrer quand aucun `config/mail.ts` n'est enregistré (`E_MAIL_CONFIG_MISSING`) au lieu de se rabattre sur ce mailer.

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
  mailers: {
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

`transports` est l'ancien nom rover de la même table. Il fonctionne toujours —
une config écrite ainsi n'a rien à changer — mais les nouvelles déclarent
`mailers`.

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

Un mail se construit **une fois**. `build()` rend le message produit par le
premier appel : inspecter un mail puis l'envoyer — ou l'envoyer deux fois — ne
rejoue pas `prepare()` :

```ts
const mail = new WelcomeMail(user)
await mail.buildWithContents()   // lire le html rendu
await mail.send(mailer)          // destinataires et pièces jointes non doublés
mail.built                       // true
```

Sans cette garde, `prepare()` repassait sur le même constructeur et ajoutait
chaque destinataire et chaque pièce jointe une seconde fois — le mail partait
deux fois à la même adresse, pièce jointe doublée.

## Inspecter un message

`has*` répond, `assert*` lève et rapporte ce qu'il a vraiment reçu :

```ts
message.hasTo('ada@acme.test')
message.hasTo('ada@acme.test', 'Ada')      // les deux moitiés doivent coller
message.assertSubject('Bienvenue')
message.assertHtmlIncludes('Bonjour')
message.toObject()
```

`hasRecipient` prend le **champ d'abord**, comme AdonisJS, et `hasAnyRecipient`
pose la question « n'importe quel champ » :

```ts
message.hasRecipient('to', 'ada@acme.test')     // un champ nommé
message.hasRecipient('bcc', 'ada@acme.test')    // false — pas dans ce champ
message.hasAnyRecipient('ada@acme.test')        // to / cc / bcc
message.hasAnyRecipient()                       // y a-t-il un destinataire
```

Les adresses sont stockées structurées : une adresse seule, ou
`{ address, name }` quand un nom d'affichage est donné. `hasFrom('a@b.c')`
reconnaît les deux formes ; avec un nom d'affichage, les deux moitiés doivent
correspondre.

Chaque argument d'adresse est une seule boîte. Une valeur contenant une liste,
une forme d'affichage ou un commentaire (`a@x.test, b@y.test`, `Bob <b@y.test>`)
est refusée avec `E_MAIL_INVALID_ADDRESS`, et un saut de ligne ou un NUL, y
compris dans les entrées d'un tableau, avec `E_MAIL_HEADER_INJECTION` : un
formulaire de contact qui passe ses champs à `to(email, name)` ne peut pas
servir de relais.

## Événements de cycle de vie

Chaque événement porte le triplet d'AdonisJS — le mailer qui l'a traité, le
message, et les templates dont il a été rendu :

```ts
emitter.on('mail:sent', ({ mailerName, message, views, messageId }) => {
  audit.log({ mailer: mailerName, subject: message.subject, template: views.html?.template })
})
```

Événements : `mail:sending`, `mail:sent`, `mail:failed`, `mail:queueing`,
`mail:queued`, plus `queued:mail:error` pour une livraison de fond qui a échoué.

Les listes aplaties `to` / `cc` / `bcc` et `transportName` sont à nous et
restent : un écouteur qui ne veut que les adresses n'a pas à aller les chercher
dans le message, et `transportName` est la même chaîne que `mailerName` sous le
nom que rover a utilisé en premier.

Un message ressuscité depuis une charge utile de file rapporte un sac `views`
vide plutôt qu'une supposition — les corps rendus ont été sérialisés, pas les
templates qui les ont produits.

## Le corps Apple Watch et les en-têtes préparés

```ts
message.watch('<p>au poignet</p>')              // corps Apple Watch
message.watchView('emails/poignet', { user })   // …depuis un template
message.assertWatchIncludes(/poignet/i)

message.preparedHeader('X-Signature', 'a=b; c=d')
```

::: warning Écart nommé — et un bug amont
`watch()` écrit le `watchHtml` de nodemailer. AdonisJS écrit un champ `watch`
nu, que le compositeur de nodemailer ne lit jamais
(`lib/mail-composer/index.js` ne regarde que `watchHtml`) : **le corps Apple
Watch d'AdonisJS ne part donc jamais**. `watchHtml()` est la même méthode sous
le nom du champ.
:::

`preparedHeader` marque une valeur que nodemailer doit laisser intacte. Les
en-têtes normaux sont repliés et encodés en MIME ; une valeur qui est déjà
exactement ce qui doit passer sur le fil — une signature, un identifiant
pré-encodé — s'en trouve corrompue. Le drapeau ne veut dire quelque chose que là
où il y a encodage MIME : le transport SES émet un tel en-tête tel quel, et les
transports REST, qui n'encodent rien, l'aplatissent en chaîne.

Intacte ne veut pas dire non vérifiée. `header()`, `preparedHeader()` et
`addListHeader()` refusent un nom qui n'est pas de l'ASCII imprimable sans
espace ni deux-points, et une valeur contenant CR, LF ou NUL
(`E_MAIL_HEADER_INJECTION`) : une valeur préparée part sur le fil telle
qu'écrite, donc un saut de ligne y ouvrirait un en-tête, ou un corps, au choix de
l'appelant.

## Donner une file au mailer plus tard

```ts
mail.setMessenger(queue)      // chaînable, rend le mailer

await mail.sendCompiled(messageConstruit)        // déjà composé
await mail.sendLaterCompiled(messageConstruit)   // …et mis en file
```

Le constructeur prend aussi une file, mais une file est souvent résolue plus
tard que le mailer — un provider qui démarre après celui-ci, un test qui
l'échange. La paire `*Compiled` envoie un message déjà construit, ce que tient
un worker de file : composé et sérialisé ailleurs, plus rien à rendre.

## Corps texte et enveloppe

```ts
message.textView('emails/welcome.txt', { user })   // à côté de htmlView
message.envelope({ from: 'bounces+reader@acme.com' })
```

Un message HTML seul passe moins bien les filtres anti-spam et est illisible en
client texte. L'enveloppe est ce qu'utilisent les serveurs : un retour en erreur
part vers l'expéditeur d'enveloppe, pas vers l'auteur visible.

Le transport SMTP envoie `MAIL FROM` / `RCPT TO` d'après l'enveloppe. Une API de
fournisseur qui ne sait pas la fixer refuse le message avec
`E_MAIL_FIELD_UNSUPPORTED` au lieu de le livrer aux destinataires des en-têtes.
Chaque entrée de l'enveloppe est une seule adresse, vérifiée comme un
destinataire.

## Arrêt

```ts
await mail.closeAll()
```

Réel sur SMTP — cela draine le pool de nodemailer. Un processus qui sort sans ça
laisse le serveur tenir des sockets jusqu'à expiration.

Les noms d'affichage et adresses portant CR, LF ou NUL sont **refusés** : un saut
de ligne ne peut pas être échappé dans un en-tête, il le termine, et l'accepter
est ainsi qu'un formulaire de contact devient un relais ouvert.
