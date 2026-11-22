# Files et événements

Ce guide couvre les e-mails en file, les événements et l'arrêt :

- Mails dépêchables
- Donner une file au mailer plus tard
- Événements de cycle de vie
- Arrêt

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

## Événements de cycle de vie

Chaque événement porte trois choses — le mailer qui l'a traité, le
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

## Arrêt

```ts
await mail.closeAll()
```

Réel sur SMTP — cela draine le pool de nodemailer. Un processus qui sort sans ça
laisse le serveur tenir des sockets jusqu'à expiration.

Les noms d'affichage et adresses portant CR, LF ou NUL sont **refusés** : un saut
de ligne ne peut pas être échappé dans un en-tête, il le termine, et l'accepter
est ainsi qu'un formulaire de contact devient un relais ouvert.
