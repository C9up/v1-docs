# Émetteur et stockage

Ce guide couvre l'émetteur et le stockage :

- L'issuer
- Le store

## L'issuer

Il identifie le SERVEUR, et c'est tout ce qu'il fait. Un jeton d'accès est ici
opaque — une chaîne aléatoire sans aucune claim à l'intérieur — donc rien n'est
lié cryptographiquement à un issuer ; la seule chose qui peut répondre de ce
jeton, c'est le serveur qui l'a frappé. C'est pour ça que
`/oauth/introspect` répond avec `iss`, et que le document de métadonnées le
nomme.

Validé au démarrage et pas à la première requête : une URL, `https` (localhost
excepté), sans query string ni fragment, et le slash final retiré — chaque
endpoint est construit par concaténation, donc `https://auth.test/` produirait
sinon `https://auth.test//oauth/token`.

Un issuer peut porter un chemin. Le document de métadonnées se trouve alors là
où la RFC 8414 §3.1 le place, le segment well-known entre l'hôte et le chemin :
`https://example.com/auth` publie sur
`/.well-known/oauth-authorization-server/auth`, et pas à la racine, où il
nommerait un autre issuer que celui qu'attend un client qui interroge la racine
(§3.3). Les endpoints qu'il liste sont l'issuer suivi de `prefix` —
`https://example.com/auth/oauth/token` — alors que l'application les monte sur
`prefix` seul : le proxy placé devant retire donc `/auth` avant de les
transmettre, et laisse passer le chemin well-known tel quel.

## Le store

`MemoryStore` est fait pour les tests et un process de développement unique :
un redémarrage déconnecte tout le monde et une deuxième instance ne voit aucun
des jetons de la première.

Une application qui tourne sur atlas en a un :

```ts
import { AtlasStore } from '@c9up/visa/stores/atlas'

const store = new AtlasStore(db)
```

`ream configure @c9up/visa` écrit la migration de ses cinq tables. Il est bâti
sur le query builder et non sur du SQL texte, donc les dialectes restent le
problème d'atlas, et il prend le service `db` par une tranche structurelle de
ce qu'il appelle — visa lui-même n'importe rien.

Tout le reste implémente `VisaStore`.

`saveClient` est optionnelle, pour des clients qui vivent dans une table qui ne
t'appartient pas. Sans elle, `registerClient` lève une erreur, et un serveur
avec `registration.enabled` refuse de démarrer plutôt que de répondre 500 à
chaque enregistrement.

### Mettre à jour une table `visa_clients`

Le secret d'un client peut expirer — un `client_secret_expires_at` répondu à
l'enregistrement — et cette expiration est appliquée à chaque authentification
du client, d'après la colonne `secret_expires_at` (`null` : le secret n'expire
pas). `AtlasStore` écrit cette colonne pour chaque client, et une table
`visa_clients` créée par visa 0.1.3 ou antérieur ne l'a pas. Relance
`ream configure @c9up/visa` avant de mettre à jour : ta migration
`9000_create_visa_tables` existante est laissée telle quelle,
`9001_add_visa_client_secret_expiry` arrive à côté, et `migration:run` ajoute la
colonne.

Deux de ses méthodes, `consumeAuthorizationCode` et `consumeRefreshToken`,
**doivent être atomiques** : deux requêtes en course avec le même code ne
doivent pas réussir toutes les deux. C'est cette garantie d'usage unique qui
porte toute la détection de rejeu, donc un driver sur une vraie base doit dire
comment il l'obtient — le store atlas le fait en un seul UPDATE gardé sur la
colonne encore nulle, et ne lit jamais d'abord.
