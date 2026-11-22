# Messages

Ce guide couvre la construction d'un message :

- API MessageBuilder
- Vues et moteur de templates
- Corps texte et enveloppe
- Le corps Apple Watch et les en-têtes préparés
- Inspecter un message

## API MessageBuilder

| Méthode | Description |
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
| `.icalEventFromUrl(url, options?)` | …récupérée depuis une URL `http(s)` à la construction du message |

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

> **Invitations calendrier.** Les trois formes fonctionnent sur tous les
> transports. `icalEventFromUrl()` récupère l'URL à la construction du message
> — `http:` et `https:` uniquement, en 30 secondes au plus, tout le reste ou une
> réponse non 2xx échouant avec `E_ATTACHMENT_UNREADABLE`. Le message
> construit porte donc les octets, et un message mis en file ne nomme aucune URL
> que le worker irait chercher. Une API de fournisseur reçoit l'invitation comme
> partie `text/calendar`, ce qui est de toute façon la façon dont les clients
> mail la lisent.
>
> `icalEvent()` accepte soit le texte ICS, soit un callback de construction :
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

## Vues et moteur de templates

`htmlView()`, `textView()` et `watchView()` passent par
`MessageBuilder.templateEngine` quand un moteur est enregistré : un objet avec
`render(templatePath, sharedState, data)`, ce qui permet à une application de
rendre ses mails avec son propre moteur de vues. `sharedState` porte les
`globals` de la config et, pour les vues html et watch, deux helpers qui
intègrent une image et renvoient son URL `cid:` :

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

Quand l'application utilise inker, `RoverProvider` l'enregistre au démarrage :
les vues de mail sont des templates inker, sans rien à configurer. Un
`@c9up/inker` qui ne permet pas ce rendu arrête le démarrage avec
`E_MAIL_TEMPLATE_ENGINE` au lieu de retomber sur le moteur intégré. Un rendu
lancé avant que le provider d'inker ait démarré est rejeté avec
`E_INKER_ENGINE_MISSING`.

Sans moteur enregistré, le moteur intégré de rover rend les fichiers `.html`
sous `viewsRoot`. Il est volontairement réduit : `{{ value }}` (échappé),
`{{{ raw }}}`, `{{#if}}` et `{{> partial}}` — ni boucles, ni expressions, ni
helpers, donc pas d'`embedImage` non plus. Un mail qui en a besoin enregistre un
moteur. Un partial qui s'inclut lui-même, directement ou par un autre, lève
`E_MAIL_TEMPLATE_RECURSION` quand le cycle est rendu.

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

## Le corps Apple Watch et les en-têtes préparés

```ts
message.watch('<p>au poignet</p>')              // corps Apple Watch
message.watchView('emails/poignet', { user })   // …depuis un template
message.assertWatchIncludes(/poignet/i)

message.preparedHeader('X-Signature', 'a=b; c=d')
```

::: tip `watch()` et `watchHtml()`
`watch()` écrit le `watchHtml` de nodemailer, le seul champ que lit son
compositeur (`lib/mail-composer/index.js`). `watchHtml()` est la même méthode
sous le nom du champ.
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

## Inspecter un message

`has*` répond, `assert*` lève et rapporte ce qu'il a vraiment reçu :

```ts
message.hasTo('ada@acme.test')
message.hasTo('ada@acme.test', 'Ada')      // les deux moitiés doivent coller
message.assertSubject('Bienvenue')
message.assertHtmlIncludes('Bonjour')
message.toObject()
```

`hasRecipient` prend le **champ d'abord**, et `hasAnyRecipient`
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
