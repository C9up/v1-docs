# LDAP et Active Directory

Ce guide couvre LDAP et Active Directory :

- Un mot de passe vide est refusé
- Un identifiant ne peut pas devenir un filtre
- La connexion
- Ce qu'un annuaire rend

## LDAP et Active Directory

Un annuaire a une forme différente de tout ce qui précède : rien n'est
redirigé. L'application détient déjà les identifiants, et l'annuaire est
l'autorité qui dit s'ils sont justes.

```ts
import { defineConfig, ldap } from '@c9up/transit'

export default defineConfig({
  staff: ldap({
    url: 'ldaps://directory.acme.test',
    baseDn: 'dc=acme,dc=test',
    loginAttribute: 'uid',              // `sAMAccountName` sur Active Directory
    bindDn: 'cn=reader,dc=acme,dc=test',
    bindPassword: env.get('LDAP_PASSWORD'),
  }),
})
```

Il se joint avec `authenticate`, et il n'a pas de `begin()` :

```ts
const user = await transit.authenticate('staff', username, password)
```

Demander un annuaire via `begin()` — ou un fournisseur à redirection via
`authenticate()` — dit lequel des deux c'est, plutôt que d'échouer sur une
méthode absente.

### Un mot de passe vide est refusé

Un bind simple **sans mot de passe est un bind anonyme, et l'annuaire répond
succès**. Un formulaire de connexion qui laisse passer un mot de passe vide
connecte donc en tant que la personne nommée. C'est le plus vieux bug de
l'authentification LDAP, et il est refusé ici avant même l'ouverture d'une
socket.

### Un identifiant ne peut pas devenir un filtre

Il n'y a pas de filtre sous forme de chaîne dans cette API. Un filtre est une
structure, et ses valeurs sont écrites en octets préfixés par leur longueur —
un login `*)(uid=admin` est donc un login contenant ces caractères, et ne peut
pas devenir de la syntaxe. L'injection n'est pas échappée : elle est
inexprimable.

Les conditions supplémentaires sont combinées en ET avec le login :

```ts
ldap({ ...config, filter: { equals: ['objectClass', 'person'] } })
```

### La connexion

`ldaps://` sauf si `allowInsecure` est posé, parce qu'un bind simple envoie le
mot de passe exactement tel qu'il a été saisi. Les certificats serveur sont
vérifiés sauf si `rejectUnauthorized: false` en décide autrement.

Deux connexions par ouverture de session : une pour trouver le DN de la
personne, liée avec le compte autorisé à chercher, et une pour se lier **en
tant que** cette personne — c'est cela qui vérifie le mot de passe. La seconde
est fermée immédiatement, car une connexion porte l'identité de ce qui s'y est
lié en dernier.

La recherche ignore les références de continuation — les renvois vers d'autres
serveurs qu'Active Directory renvoie pour toute recherche depuis la racine d'un
domaine. Elles ne comptent pas comme des entrées et ne sont jamais suivies :
en suivre une enverrait le bind suivant là où pointait la réponse. Toute autre
réponse que la recherche ne sait pas lire fait échouer la connexion.

Une réponse impossible à découper ou à décoder — BER mal formé, longueur
indéfinie, message annoncé à plus de 8 Mio — fait échouer les opérations en
attente sur cette connexion avec une `LdapError` et la ferme. Elle ne sort
jamais du socket : une mauvaise réponse d'un annuaire n'arrête pas le processus.

### Ce qu'un annuaire rend

`user.id` est le DN, la seule valeur qu'un annuaire garantit unique et stable.
L'adresse, le nom et le pseudo sont lus depuis les attributs que les annuaires
emploient d'habitude ; `claims` les nomme quand le vôtre fait autrement, et
`user.raw.attributes` porte tout — appartenances de groupe comprises, toutes
leurs valeurs conservées.

Une adresse lue dans l'annuaire est rapportée `verified` : l'annuaire est celui
que vous avez configuré et que vous exploitez. Quand il appartient à quelqu'un
d'autre — l'annuaire d'un client —, ses adresses n'engagent que ce client, et
rattacher des comptes par email d'un tenant à l'autre sur cette base n'est pas
sûr.
