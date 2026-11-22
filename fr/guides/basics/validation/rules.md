# Règles

Ce guide couvre les règles dont un schéma est fait :

- Règles
- Formats liés à un pays ou à une locale
- Normaliser une valeur
- Ce qu'acceptent un booléen, un nombre et une case à cocher
- Les clés que la forme ne déclare pas
- Transformations

## Règles

### Règles de type

```typescript
rules.string()    // Doit être une string
rules.number()    // Doit être un nombre (NaN rejeté)
rules.boolean()   // Doit être un booléen
rules.any()       // Pas de vérification de type — chaîne vide
```

### Règles string

```typescript
rules.string()
  .min(3)         // Longueur minimale
  .max(100)       // Longueur maximale
  .email()        // Doit être un email valide
  .uuid()         // N'importe quelle version — .uuid({ version: 4 }) en fixe une
  .url()          // Doit être une URL
  .regex(/…/)     // Doit correspondre au motif
  .in(['a'])      // Doit faire partie de ces valeurs
  .trim()         // Supprimer les espaces (transformation)
```

`uuid()` accepte une version, ou une liste : `uuid({ version: [4, 7] })`. Sans
précision, toutes les versions passent.

### Règles number

```typescript
rules.number()
  .min(0)         // Valeur minimale
  .max(1000)      // Valeur maximale
  .positive()     // Doit être > 0
```

### Règles array et record

```typescript
rules.array(rules.string())
  .minLength(1)   // Au moins un élément
  .maxLength(5)   // Au plus cinq éléments
  .notEmpty()     // Comme minLength(1)

rules.record(rules.number())
  .minLength(1)   // Au moins une clé
```

Sur un tableau ou un record, `min()` et `max()` valent `minLength()` et
`maxLength()` : la taille qu'ils bornent est le nombre d'éléments, ou de clés.
L'erreur nomme la règle exécutée : `array.minLength`, `record.maxLength`.

### Champs optionnels

```typescript
const s = schema({
  name: rules.string().min(1),
  nickname: rules.string().optional(),  // undefined/null accepté
})

s.validateResult({ name: 'Alice' })  // valid — nickname est optionnel
```

### Fichiers

```typescript
const s = schema({
  avatar: rules.file({ size: '2mb', extnames: ['jpg', 'png'] }),
  report: rules.nativeFile({ maxSize: '10mb', mimeTypes: ['application/pdf'] }),
})

const form = await request.formData() // une Request web
const result = await s.validateResultAsync({
  avatar: ctx.request.file('avatar'),
  report: form.get('report'),
})
```

- `rules.file({ size, extnames, verifyContent })` accepte tout objet qui porte
  un `size` et un nom ou une extension — l'upload du body parser, ou n'importe
  quelle autre représentation. Les `extnames` se comparent en minuscules, sans
  le point.
- `rules.nativeFile({ minSize, maxSize, mimeTypes })` est pour le `File` de la
  plateforme (ce que renvoie `formData()`) : tout le reste, y compris un objet
  JSON qui a la forme d'un fichier, échoue avec `nativeFile`. Elle ajoute une
  borne basse et une liste de types MIME ; `.minSize()`, `.maxSize()` et `.mimeTypes()`
  chaînent les mêmes contrôles.
- Une taille est un nombre d'octets ou une écriture comme `'512kb'`, `'2mb'`,
  `'1gb'` (`b`, `kb`, `mb`, `gb`, `tb`, puissances de 1024). Une écriture que
  rune ne sait pas lire lève `E_RUNE_INVALID_SIZE` à la construction du schéma,
  au lieu de laisser le champ sans plafond.

Le nom, l'extension et le type annoncé viennent tous de l'expéditeur : un
`.exe` renommé `.png` les satisfait tous. Déclarer `extnames` ou `mimeTypes` lit
donc aussi les premiers octets du fichier et refuse un contenu qui ne
correspond pas à la déclaration (règle `verifyContent`). `.verifyContent()` arme
le même contrôle sur une chaîne qui ne déclare ni l'un ni l'autre. Le contrôle
est asynchrone : un schéma qui le porte passe par `validate()` /
`validateResultAsync()`.

Les octets viennent du `content` / `buffer` en mémoire de l'upload, d'un
`Blob`, ou du lecteur qu'un hôte lie avec `rune.bindFileReader()`. Un chemin
porté par la valeur n'est jamais ouvert — un corps JSON peut construire un
objet en forme de fichier, et un chemin dedans deviendrait la lecture de
n'importe quel fichier que le processus peut ouvrir. Sans source d'octets, le
contrôle échoue au lieu de passer.

`rules.file({ extnames, verifyContent: false })` coupe le contrôle de contenu.
La liste d'extensions ne repose alors que sur la parole de l'expéditeur ;
gardez cette exception pour des fichiers dont les octets sont vérifiés
ailleurs.

## Formats liés à un pays ou à une locale

Quatre règles valident une valeur contre une table par pays ou par locale :
codes postaux (71 pays), plans de numérotation mobile (169 locales), numéros de
passeport (61 pays) et numéros de TVA (69 pays).

```typescript
schema({
  zip:      rules.string().postalCode({ countryCode: 'CH' }),
  phone:    rules.string().mobile({ locale: ['fr-CH', 'de-CH'] }),
  passport: rules.string().passport({ countryCode: ['CH', 'FR'] }),
  vat:      rules.string().vat({ countryCode: 'CH' }),
})
```

Chaque option accepte aussi un rappel recevant le champ : une liste qui dépend
de la requête — les pays avec lesquels ce locataire commerce — se calcule à
chaque validation plutôt que d'être figée à l'import.

**Un pays ou une locale sans table lève une erreur, il ne passe pas.** Une
valeur qui se déclare « valide » parce que rien ne l'a vérifiée est exactement
la défaillance que ce paquet existe pour empêcher : la règle refuse d'être
construite.

```typescript
rules.string().postalCode({ countryCode: 'ZZ' })
// RuneError: postalCode(): no pattern for country 'ZZ'.
```

`mobile()` sans `locale` accepte un numéro correspondant à **n'importe quel**
plan connu, ou un numéro E.164 bien formé pour un pays qu'aucun plan ne couvre.
`mobile({ strictMode: true })` exige en plus le `+` et l'indicatif.

`vat()` vérifie le FORMAT pour tous les pays de la table, et vérifie en plus la
clé de contrôle pour les pays qui en définissent une courte et bien établie —
Belgique, Allemagne, Pays-Bas, Italie, Portugal, Luxembourg, Suisse et
Australie. Un numéro bien formé mais impossible est refusé.

## Normaliser une valeur

Deux transformations réécrivent une valeur sous la forme que son destinataire
utilise vraiment, pour que deux écritures de la même adresse se comparent.

### `normalizeEmail()`

Les règles par fournisseur sont **actives par défaut** — normaliser est ce que
vous avez demandé, et une option sert à en désactiver une.

```typescript
rules.string().email().normalizeEmail()
// 'A.D.A+news@GMail.com'  ->  'ada@gmail.com'
// 'A.B@googlemail.com'    ->  'ab@gmail.com'
// 'Ada-Lovelace-news@yahoo.com' -> 'ada-lovelace@yahoo.com'

rules.string().email().normalizeEmail({ gmail_remove_dots: false })
// 'a.d.a+news@gmail.com'  ->  'a.d.a@gmail.com'
```

Gmail, Outlook.com, Yahoo, Yandex et iCloud ont chacun leurs règles :
`all_lowercase`, `gmail_lowercase`, `gmail_remove_dots`,
`gmail_remove_subaddress`, `gmail_convert_googlemaildotcom`,
`outlookdotcom_lowercase`, `outlookdotcom_remove_subaddress`, `yahoo_lowercase`,
`yahoo_remove_subaddress`, `yandex_lowercase`, `yandex_convert_yandexru`,
`icloud_lowercase`, `icloud_remove_subaddress`. Un point doublé est conservé :
pour Gmail, `a..b` est une autre boîte.

### `normalizeUrl()`

Par défaut : `www.` retiré, paramètres `utm_*` supprimés, requête triée, slashes
répétés fusionnés et slash final retiré.

```typescript
rules.string().url().normalizeUrl()
// 'www.acme.test/?utm_source=x&b=2&a=1'  ->  'http://acme.test/?a=1&b=2'

rules.string().url().normalizeUrl({ stripWWW: false, sortQueryParameters: false })
```

`defaultProtocol`, `normalizeProtocol`, `forceHttp`, `forceHttps`,
`stripAuthentication`, `stripHash`, `stripTextFragment`, `stripWWW`,
`stripProtocol`, `removeQueryParameters`, `keepQueryParameters`,
`removeTrailingSlash`, `removeSingleSlash`, `removeDirectoryIndex`,
`removeExplicitPort`, `sortQueryParameters`, `removePath`, `transformPath`,
`emptyQueryValue` et `customProtocols` sont tous acceptés. Une URL non
analysable est rendue telle quelle, pour que `url()` la signale plutôt que la
transformation ne lève.

## Ce qu'acceptent un booléen, un nombre et une case à cocher

Les listes sont courtes et exactes — ni trim, ni normalisation de casse :

```ts
rules.boolean()   // "true" "on" "1" 1 true  →  true
                  // "false" "0" 0 false     →  false
                  // "TRUE", " true ", "off", "yes"  →  refusés

rules.accepted()  // "on" "1" "yes" "true" true 1  →  true
                  // "YES", "On", "off"            →  refusés
```

Élargir l'une de ces listes reviendrait à laisser une case de consentement
accepter en silence une écriture que personne n'a voulu envoyer.

`rules.number()` refuse une chaîne vide ou blanche au lieu de la lire comme
`0` — un champ texte laissé intact ne doit pas devenir une quantité de zéro.
Utilisez `.optional()` pour un champ qui peut être omis.

`rules.number()` et `rules.boolean()` convertissent le texte que porte un
formulaire ou une query string (`"32"` → `32`, les listes ci-dessus → un
booléen). `rules.number({ strict: true })` et `rules.boolean({ strict: true })`
refusent tout ce qui n'est pas déjà un nombre ou un booléen — le choix d'une API
JSON où `"1"` est un bug du client.

`rune.convertEmptyStringsToNull = true` lit chaque `""` comme `null` avant
l'exécution des règles, pour tous les schémas du processus. Un champ vide
compte alors comme absent : `.optional()` l'accepte, un champ requis le refuse
comme manquant, et une règle string ne voit jamais `""`. C'est désactivé par
défaut ; activez-le une fois, au démarrage, pas par requête.

`rules.enum()` accepte une liste, un callback, ou un **enum TypeScript natif** :

```ts
enum Role { Admin = 'admin', User = 'user' }
schema({ role: rules.enum(Role) })
```

Un enum numérique accepte aussi les noms de ses membres, parce que c'est ce que
le mapping inverse de TypeScript met dans l'objet.

## Les clés que la forme ne déclare pas

Une clé non déclarée est **retirée**, et la charge est valide :

```ts
schema({ user: rules.object({ email: rules.string().email() }) })
  .validateResult({ user: { email: 'a@b.co', extra: 1 } })
// valide, data.user === { email: 'a@b.co' }
```

C'est ce qui rend une charge validée sûre à passer directement à une
affectation en masse, et c'est ce que fait l'écosystème dont rune reprend la
forme.

Deux options explicites changent ça :

| | |
| --- | --- |
| `.allowUnknownProperties()` | garder la clé dans la sortie, telle quelle |
| `.denyUnknownProperties()` | faire échouer la charge, en nommant la clé |

`allowUnknownProperties()` ne garde que les clés que la forme ne déclare pas,
telles qu'elles ont été envoyées : `toCamelCase()` renomme les clés déclarées,
pas celles-là. Un champ déclaré apparaît une seule fois, sous son nom de
sortie, avec sa valeur validée — jamais sa valeur brute à côté, et une clé
inconnue écrite comme le nom de sortie d'un champ déclaré (`userBio` à côté
d'un `user_bio` déclaré) ne la remplace pas.

`denyUnknownProperties()` est pour une API dont le contrat est de refuser ce
qu'elle ne comprend pas. Un client qui envoie `emial` se le voit dire, au lieu
d'être ignoré en silence et de se demander pourquoi l'adresse n'a jamais
changé :

```
unknown field `emial`, expected one of email, password
```

Toutes les clés non déclarées sont rapportées, pas seulement la première, et
les clés déclarées sont validées par ailleurs.

## Transformations

Les transformations modifient la valeur **avant** l'exécution des règles de validation :

```typescript
const s = schema({
  name: rules.string().trim().min(3),
})

s.validateResult({ name: '  Al  ' })
// Trim vers 'Al', puis min(3) échoue
// errors: [{ field: 'name', rule: 'min',
//            message: 'The name field must be at least 3', meta: { min: 3 } }]
```
