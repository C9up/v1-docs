# Requête

Ce guide couvre l'objet requête.

## La requête

Au-delà de `input()` / `all()` / `qs()`, la requête porte :

```ts
ctx.request.id()            // le x-request-id posé par le proxy, ou undefined
ctx.request.completeUrl()   // protocol://host/chemin, `true` garde la query
ctx.request.parsedUrl()     // { pathname, search, query }
ctx.request.ajax()          // X-Requested-With: xmlhttprequest
ctx.request.pjax()
ctx.request.prefetch()      // une récupération spéculative, pas une navigation
ctx.request.types()         // tous les types acceptés, meilleur en premier
ctx.request.languages()     // …et langues, charsets, encodages
ctx.request.cookiesList()
ctx.request.serialize()     // une vue JSON, pour les logs
```

`body()` renvoie le corps de la requête ; `all()` renvoie le corps **fusionné
avec la query string** — deux choses distinctes.

`id()` ne fabrique pas d'UUID quand l'en-tête est absent : un identifiant de
corrélation que personne d'autre ne connaît ne corrèle rien.

`serialize()` et `toJSON()` omettent délibérément le corps — il peut contenir un
mot de passe, et une ligne de log est le dernier endroit où ça doit atterrir.

`prefetch()` mérite d'être consulté avant tout ce qui a un effet de bord. Un
navigateur peut chercher un lien que l'utilisateur ne cliquera jamais ; le compter
comme visite, ou pire agir dessus, attribue une intention que personne n'a eue.

### D'où vient l'utilisateur

```ts
const back = ctx.request.getPreviousUrl(['admin.example.com'], '/dashboard')
```

L'en-tête `Referer` est **fourni par le client**. Y rediriger sans contrôle est
une redirection ouverte : l'hôte doit donc être celui de la requête ou figurer
dans la liste que vous donnez ; tout le reste tombe sur le repli.

La valeur rendue est le chemin et la query string du référent, jamais son hôte :
`response.redirect().back()` et une redirection vers cette valeur restent sur
votre site. Les barres obliques de tête sont ramenées à une seule :
`http://app.test//evil.com/x` donne `/evil.com/x`, et non `//evil.com/x`, qu'un
navigateur suivrait vers un autre hôte.
