# Signature

Ce guide couvre la signature d'un PDF :

- Avec une clé que vous détenez
- Les adapters
- Horodatage
- La vérifier
- La confiance
- La révocation

## Signature

Une signature PDF couvre une plage d'octets **du document où elle se trouve**,
ce qui interdit l'ordre habituel : la valeur ne peut pas être calculée puis le
document assemblé, puisque l'assembler changerait ce qu'elle couvre. Le
document est écrit avec un trou à l'emplacement de la valeur, le `/ByteRange`
enregistre tout sauf le trou, et la valeur est déposée dans l'espace réservé
sans déplacer un seul autre octet.

Pour la même raison, une modification après la signature la casserait :
tamponner, écrire du texte, pivoter, sélectionner, découper, fusionner, remplir
et aplatir réécrivent tous le fichier. Un document signé est donc refusé avec
`E_VELLUM_SIGNED_DOCUMENT`, plutôt que rendu avec bonne mine et plus signé ;
dessinez sur un document avant de le signer. `{ discardSignatures: true }` le
modifie quand même, pour qui le veut vraiment.

C'est aussi ce qui rend interchangeables une clé que vous détenez et une clé
détenue par un prestataire certifié — **un signataire ne voit jamais le
document, seulement son empreinte**. Lequel signe devient donc une ligne de
configuration :

```ts
// config/vellum.ts
export default defineConfig({
  signers: {
    interne:   monSignataireLocal,
    qualifiee: monSignataireDistant,
  },
})

const signe = await vellum.sign(mandat, {
  signer: 'qualifiee',
  reason: 'Mandat de prévoyance',
  name: 'Amélie Durand',
})
```

Un `Signer` est n'importe quoi qui expose `sign(digest: Buffer): Promise<Buffer>`
et rend le CMS `SignedData`. Signer par le réseau appartient à cet endroit-là,
et non au moteur, qui ne fait aucune entrée-sortie.

La signature est ajoutée en **révision incrémentale** : les octets d'origine
sont conservés à l'identique. Réécrire le fichier invaliderait toute signature
déjà présente et détruirait l'historique qu'une signature existe pour établir.
Signer un document déjà signé le contresigne : la nouvelle signature reçoit son
propre champ (`Signature2`, et ainsi de suite), et la précédente correspond
toujours à ce qu'elle a signé.

Une signature *visible* — tracée, en image — est une autre affaire : la
tamponner d'abord avec `stamp`, puis signer.

### Avec une clé que vous détenez

`pkcs8Signer` est le seul signataire livré, parce que c'est le seul qui n'a
aucun prestataire derrière lui :

```ts
signers: {
  interne: pkcs8Signer({
    key: readFileSync(app.makePath('storage/signing.key.der')),
    certificate: readFileSync(app.makePath('storage/signing.crt.der')),
  }),
}
```

Il construit un `SignedData` CAdES dont les attributs signés portent le type de
contenu, l'empreinte du document, l'instant de signature et — comme PAdES
l'exige — `signing-certificate-v2`. Ce dernier n'est pas décoratif : sans lui,
une signature est liée à une clé mais pas à une identité.

Du PKCS#8 et du DER plutôt qu'un `.p12` ;
`openssl pkcs12 -in bundle.p12 -nodes` vous y amène en une commande.

C'est une signature **avancée** : elle prouve que le document n'a pas changé
depuis qu'une clé donnée l'a signé. Là où la loi exige une signature
*qualifiée*, la clé doit vivre chez un prestataire certifié — et c'est un
adapter, pas ceci.

### Les adapters

Un prestataire est un `Signer`, rien de plus : un adapter est donc une courte
fonction qui en retourne un. Aucun n'est livré ici — nommer un fournisseur
lierait un paquet agnostique à celui-là, et un client HTTP n'est pas une
dépendance qu'il devrait porter.

### Horodatage

`timestamped` enveloppe n'importe quel signataire, le local comme celui d'un
prestataire :

```ts
signers: {
  interne: timestamped(pkcs8Signer({ key, certificate }), {
    url: 'https://freetsa.org/tsr',
  }),
}
```

Une signature prouve que le document n'a pas changé depuis qu'une clé l'a
signé, pas **quand**. Une fois le certificat expiré, un vérificateur ne peut
plus distinguer une signature faite pendant sa validité d'une contrefaçon
postérieure, et cesse de l'accepter. Pour un document conservé des années,
c'est ce qui le maintient vérifiable.

Le jeton entre comme attribut **non signé**, ce qui permet de l'ajouter sans
toucher à la signature. Au moment où il est attaché, la réponse de l'autorité
est contrôlée : son statut, le fait qu'elle a bien horodaté la signature
envoyée, et qu'elle répond à **cette** demande et ne rejoue pas une réponse
ancienne — lu dans la structure du jeton, pas cherché dans ses octets. Une
réponse illisible est refusée, ce qui échoue fermé.

Non signé, l'attribut est aussi à la portée de quiconque pour l'ajouter ou le
remplacer une fois le document parti : un vérificateur ne croit donc un jeton
qu'après l'avoir contrôlé à nouveau, comme le décrit
[La confiance](/fr/guides/digging-deeper/pdf/signing#la-confiance).

La signature grossit de quelques kilo-octets : un document préparé avec une
`capacity` juste peut en demander une plus grande.

### La vérifier

```ts
for (const signature of await vellum.verifySignatures(mandat)) {
  if (!signature.coversWholeDocument) refuser('du contenu ajouté après signature')
  if (!signature.digestMatches) refuser('le document a changé')
  if (!signature.signatureVerifies) refuser('la signature ne correspond pas')
}
```

`coversWholeDocument` attrape le piège que tout le monde rencontre en premier :
**du contenu ajouté après une signature n'est pas couvert par elle**, et le
calcul sur la partie couverte reste juste. Une visionneuse qui ne vérifie que
l'empreinte déclarera ce document signé. Il vaut aussi `false` quand la seule
zone que la signature laisse de côté est autre chose que sa propre valeur,
l'entrée `/Contents` de son propre dictionnaire de signature : toute autre zone
serait faite d'octets que personne n'a signés.

Le rapport nomme aussi le signataire, l'instant qu'il a déclaré (`signedAt`,
affiché et jamais utilisé pour juger quoi que ce soit), et dit si un
horodatage qui se vérifie atteste du moment (`timestamped`).
`signatureVerifies` porte sur le certificat que la signature désigne — par
émetteur et numéro de série, ou identifiant de clé — et non sur le premier que
liste le document, et un attribut `signing-certificate-v2` qui en désigne un
autre est signalé et rend la signature non fiable. Les signatures sont
vérifiées en RSA PKCS#1 v1.5 sur SHA-256, -384 ou -512, partout — le document,
chaque maillon de certificat, une réponse OCSP, un horodatage ; tout autre
algorithme est signalé comme invérifiable plutôt que présumé, et une clé RSA de
moins de 2048 bits n'est pas crue. Ce qui n'a pas pu être vérifié, ou s'est
révélé faux, est listé dans `problems`. Un document sans signature n'en
rapporte aucune — c'est une réponse, pas un échec.

### La confiance

Vérifier qu'une signature correspond au certificat qu'elle porte ne dit rien de
l'identité de ce certificat : n'importe qui peut en fabriquer un. La confiance
vient d'un chemin jusqu'à une ancre que vous avez décidé d'accepter.

```ts
// config/vellum.ts
export default defineConfig({
  trustedAnchors: [readFileSync(app.makePath('storage/anchors/autorite.pem'))],
})
```

Fournissez les racines que publie votre autorité de contrôle — elles sont
diffusées sous forme de listes de confiance au format ETSI TS 119 612 — ou
celles de votre propre autorité, et `trusted` dit si un chemin a été trouvé.
DER ou PEM. N'en fournir aucune est aussi une position : toute signature
revient alors non fiable, ce qui est la réponse honnête plutôt que la réponse
confortable.

Le chemin est jugé **maintenant** — `momentAt` donne l'instant, en secondes
depuis l'epoch — sauf si un horodatage prouve que la signature existait plus
tôt. Il est alors jugé à l'instant de l'autorité, et un certificat valable
alors et expiré ou révoqué depuis n'a pas rétroactivement dé-signé quoi que ce
soit. C'est la raison concrète pour laquelle l'horodatage vaut son aller-retour.
Un horodatage n'est cru que si la signature de l'autorité sur lui se vérifie
avec le certificat qu'il désigne, que ce certificat est marqué pour
l'horodatage, qu'il était valable au moment du tampon et qu'il remonte
aujourd'hui à vos ancres, et que le jeton horodate bien cette signature-ci ;
sinon le rapport dit pourquoi et la signature est jugée maintenant. L'instant
que le signataire a écrit dans sa propre signature est affiché et jamais
utilisé : le détenteur d'un certificat échu pourrait y écrire n'importe quelle
date. `moment` dit quel cas s'est appliqué — `"timestamp"`, ou `"claimed"` /
`"unknown"`, tous deux jugés maintenant.

Chaque maillon est contrôlé : la signature de chaque certificat se vérifie avec
la clé de celui du dessus, chaque émetteur déclare être une autorité (`cA` dans
ses contraintes de base) et, quand son usage de clé est restreint, qu'il peut
signer des certificats, la longueur de chemin et les contraintes de nom données
à une autorité sont respectées, et le certificat signataire a bien le droit de
signer. Un certificat ordinaire qui en émet un sous son propre nom ne fait pas
exception : son titulaire choisirait sinon une nouvelle clé, un nouveau
répondeur et de nouveaux usages, sous le nom que l'autorité a certifié. Une ancre est
reconnue par le certificat entier ou par son nom et sa clé — jamais par un nom
et un numéro de série, que n'importe qui peut copier. Un certificat qui s'est
signé lui-même et n'est pas une ancre termine le chemin, et un chemin de plus
de huit maillons est traité comme une boucle.

### La révocation

Un certificat peut être valable en apparence et sans valeur en fait. Seul
l'émetteur le sait, et seulement si on le lui demande :

```ts
const signatures = await vellum.verifySignatures(mandat, { checkRevocation: true })
// signatures[0].revocation → { status: 'good' | 'revoked' | 'unknown', detail? }
```

C'est un appel réseau par certificat signataire, vers le répondeur qu'il
nomme : c'est donc désactivé sauf demande. Seule une signature `trusted` est
vérifiée : hors d'un chemin de confiance, son « émetteur » peut être n'importe
qui, et la réponse qu'il signe aussi ; la réponse est donc `unknown`. Les signatures qui partagent un
certificat partagent une question ; quatre au plus sont posées à la fois, et
pas plus de seize certificats par appel — les autres répondent `unknown` sans
que rien ne soit demandé, puisque c'est le document qui choisit les répondeurs.

La réponse a **trois** valeurs, pas deux. `unknown` couvre tout le reste —
répondeur injoignable, réponse portant sur un autre certificat, réponse que
personne d'habilité n'a signée. La replier sur l'une des deux autres est
l'erreur à éviter : en « bon », elle laisse passer un certificat retiré ; en
« révoqué », elle rejette des documents dès qu'un serveur tombe. **C'est votre
politique**, elle est donc rapportée et non décidée.

Une réponse n'est lue que si l'émetteur l'a signée, ou un délégué dont
l'émetteur a signé le propre certificat, encore valable et marqué pour
répondre — le délégué voyage dans la réponse, donc son nom et son usage seuls
ne prouvent rien. Elle doit être à jour : au-delà de son `nextUpdate`, datée
après l'horloge locale, ou, sans `nextUpdate`, vieille de plus d'un jour, elle
vaut `unknown`. Et elle est lue à `momentAt` : un certificat retiré après
l'instant d'un horodatage vérifié n'entache pas la signature, alors qu'un
certificat retiré avant maintenant l'entache, quel que soit l'instant déclaré
par le signataire.

L'adresse du répondeur sort du certificat, c'est-à-dire de qui a envoyé le
document. Seules les adresses publiques sont interrogées, jugées sur l'adresse à
laquelle la connexion aboutit plutôt que sur l'écriture de l'URL : un nom qui se
résout vers votre propre réseau est refusé lui aussi. Une redirection n'est pas
suivie, et une réponse est lue jusqu'à 64 Kio. La requête passe par
`HttpClient` de `@c9up/ream/http-client` ; passez `httpClient` pour en utiliser
un autre, ou son faux de test.

Une autorité sur votre propre réseau se nomme dans `allowedResponders`, par un
hôte (`ocsp.internal`, sur les ports par défaut) ou une origine
(`https://ocsp.internal:8443`) :

```ts
// config/vellum.ts
export default defineConfig({
  allowedResponders: ['https://ocsp.internal:8443'],
})
```
