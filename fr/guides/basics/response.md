# Réponse

Ce guide couvre l'objet réponse.

## La réponse

```ts
ctx.response.onFinish(() => unlink(fichierTemporaire))   // après l'envoi
await ctx.response.stream(fs.createReadStream(chemin))
ctx.response.attachment(chemin, 'rapport-échéance.pdf')
ctx.response.cookie('prefs', { theme: 'dark' }, { maxAge: '2h' })
```

- **`onFinish`** exécute ce qui doit avoir lieu sans retarder la réponse — un
  fichier temporaire supprimé, une métrique posée. Un rappel qui lève n'arrête
  pas les autres : à ce stade le client a déjà sa réponse.
- **`maxAge`** accepte des secondes ou une durée. `'2h'` arrivait auparavant dans
  l'en-tête sous la forme invalide `Max-Age=2h`, et le cookie était jeté sans un
  mot.
- **Valeurs par défaut des cookies.** Chaque cookie reçoit `Max-Age=7200; Path=/;
  HttpOnly; Secure; SameSite=lax`, sauf si l'appel passe sa propre valeur pour un
  attribut. Changez ces valeurs pour toute l'application dans `config/app.ts` :

  ```ts
  export const http = {
    cookie: { maxAge: '2h', path: '/', httpOnly: true, secure: true, sameSite: 'lax' },
  }
  ```

  Les clés sont `maxAge`, `path`, `domain`, `httpOnly`, `secure`, `sameSite`,
  `partitioned` et `priority` ; toute autre clé, ou une valeur du mauvais type,
  arrête l'application au démarrage avec `E_RESPONSE_INVALID_COOKIE`. Passez
  `maxAge: undefined` à un appel pour un cookie qui finit avec la session du
  navigateur. Chrome et Firefox acceptent un cookie `Secure` venu de
  `http://localhost` ; pour un autre navigateur ou un autre hôte en HTTP simple
  en développement, mettez-y `secure: false`.
- **`path` et `domain`** doivent suivre la grammaire des cookies : un chemin en
  ASCII imprimable sans `;`, un domaine qui est un nom d'hôte (`.app.test`
  compris). Le reste lève `E_RESPONSE_INVALID_COOKIE`.
- **`jsonp()`** envoie `X-Content-Type-Options: nosniff` avec le script qu'il écrit.
- **`plainCookie`** emballe sa valeur en JSON base64url, donc un objet revient un
  objet et un nombre un nombre. Passez `encode: false` pour une valeur qu'un
  script du navigateur doit lire telle quelle, ou déjà protégée. Les valeurs
  sont encodées en pourcentage à l'écriture et décodées à la lecture :
  `request.plainCookie(nom, undefined, { encoded: false })` relit exactement ce
  qui a été écrit, espaces, accents et `;` compris. Un nom n'est jamais encodé
  ni décodé : il doit être en ASCII visible, sans `;` ni `=`, sinon l'appel
  lève `E_RESPONSE_INVALID_COOKIE`. Un cookie envoyé sous le nom `%73ession`
  s'appelle `%73ession`, jamais `session`.
- **`attachment`** échappe le nom de fichier et ajoute la forme étendue RFC 6266,
  pour qu'un nom non-ASCII survive à un en-tête Latin-1 au lieu d'arriver illisible.

`stream()` pousse les morceaux sur la socket à mesure qu'ils sont lus — voir
[l'envoi de fichiers](/fr/guides/basics/file-uploads#servir-des-fichiers) pour le
détail, y compris les cas où un corps est bufferisé et ce qui le borne. La réponse
traverse une frontière NAPI, donc aucun
`ServerResponse` Node n'atteint un rappel `onFinish`.

### Demander à la réponse dans quel état elle est

```ts
ctx.response.isPending      // rien d'envoyé — un middleware peut encore écrire
ctx.response.finished       // la réponse est partie
ctx.response.headersSent    // vrai exactement quand finished, voir ci-dessous
ctx.response.hasContent     // un corps a été posé
ctx.response.hasStream      // le corps est un flux encore en cours
ctx.response.hasLazyBody    // l'un ou l'autre
ctx.response.setRequestId() // renvoie le x-request-id de l'appelant
await ctx.response.finish()  // l'étape terminale — scelle la réponse
```

`headersSent` vaut ici la même chose que `finished` plutôt que de suivre un
drapeau séparé : en-têtes et corps traversent la frontière NAPI ensemble, en une
étape, donc ils partent ensemble.

`finish()` est l'étape terminale :
idempotente, elle pose l'identifiant de requête, et après elle plus rien n'entre
dans la réponse. **Le noyau l'appelle sur chaque réponse**, y compris les
réponses d'erreur, donc un handler n'a presque jamais à le faire. Elle renvoie une
promesse, et elle n'écrit rien. Ream ne possède jamais la socket — la réponse entière traverse la
frontière NAPI et c'est Rust qui l'écrit — donc *finish* signifie ici scellée et
prête à être transmise, pas vidée sur le fil. L'attente concerne un corps encore
en cours de production par `download()` ou un `stream()` bufferisé ; un corps
streamé n'est délibérément pas attendu, puisqu'il alimente la socket après que
la réponse a été transmise.

`setRequestId()` renvoie le `x-request-id` envoyé par l'appelant. C'est ce que
`finish()` appelle, l'écho est donc une propriété du framework et non quelque
chose que chaque handler doit penser à faire. Ream *lisait* déjà
cet en-tête dans `ctx.id`, en validant sa forme et en en générant un s'il
manque, mais ne le renvoyait jamais. Rien n'est renvoyé si le client n'en a pas
envoyé : rendre un identifiant généré nommerait un id que l'appelant n'a jamais
utilisé.
