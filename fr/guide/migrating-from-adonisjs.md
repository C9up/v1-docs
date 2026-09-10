# Migrer depuis AdonisJS

Ream suit le SDK AdonisJS v7, mais n'en est pas un remplacement direct. Cette
page est la liste complète de ce qu'une migration doit savoir : partout où Ream
répond délibérément autrement, pourquoi, et ce que vous devez changer.

Tout ce qui n'est pas listé ici est censé se comporter comme en amont. Si ce
n'est pas le cas, c'est un bug — signalez-le.

## Ça déconnecte vos utilisateurs une fois

**Chiffrement.** Les cookies sont chiffrés en AES-256-GCM, ce qu'AdonisJS
configure par défaut aujourd'hui ; la construction CBC + HMAC y survit sous le
nom de driver `legacy`. Un cookie écrit par une application utilisant cet ancien
format ne peut pas être déchiffré ici : chaque utilisateur connecté est
déconnecté une fois, au déploiement. Prévoyez la bascule à une heure creuse.

## Ça change ce que votre code doit écrire

**`query.pojo()` doit terminer la chaîne.** En amont, `pojo()` est un drapeau
sur le builder, qui reste donc disponible ensuite. Ici il rend une vue
terminale : attendable pour les lignes, et chaînable vers `first()`. Déplacez
`.pojo()` à la fin — `query.where(...).orderBy(...).pojo()`. Une chaîne dans
l'ancien ordre ne compile pas, donc rien ne change en silence.

**Une stratégie de nommage personnalisée rend l'ATTRIBUT.**
`relationForeignKey` répond avec la propriété du modèle (`userId`), et Atlas en
dérive la colonne via le `columnName()` de la même stratégie — la forme utilisée
en amont. Une stratégie reprise d'amont ne demande aucun changement ; une écrite
contre une version antérieure de Ream, qui rendait `user_id`, si.

**`number()` refuse une chaîne vide.** En amont, elle passe par `Number("")`,
soit `0` : un champ texte jamais touché devient silencieusement une quantité
nulle, et aucune règle suivante ne peut la distinguer d'un « 0 » tapé.
Utilisez `.optional()` pour accepter l'absence du champ.

**Inker compile une balise personnalisée au rendu.** Edge émet du JavaScript et
exécute `compile` une fois ; Inker analyse en Rust et rend en parcourant l'AST,
donc `compile` s'exécute à chaque rendu. Le modèle d'écriture est le même. Seules
les balises inline (`block: false`) sont supportées pour l'instant.

**Certaines capacités sont des peers optionnels.** Ne les installez que si vous
utilisez la fonctionnalité : `vite` pour le rendu serveur en développement
(Photon), `ical-generator` pour `icalEvent(callback)` (Rover). Sans eux, la
fonctionnalité est éteinte, pas cassée.

## Ça diffère de type, pas de comportement

**`subscribe` / `psubscribe` répondent `Promise<void>`,** là où l'amont déclare
`void`. Du code écrit à la manière d'amont — sans `await`, réagissant via
`onSubscription` — se comporte à l'identique. Ce que la promesse ajoute, c'est la
garantie que l'abonnement est vivant à la ligne suivante, ce dont cet écosystème
dépend avant de publier.

**`request.cookie(name, fallback)` conserve la chaîne vide.** En amont, le repli
se fait avec `||` : un cookie délibérément écrit `""` se relit comme le
fallback. Une préférence effacée est une valeur que quelqu'un a écrite. Le
doc-comment d'amont sur cette ligne décrit d'ailleurs `??`, ce que fait ceci.

## Ça refuse ce que l'amont accepte

Chacun de ces refus est délibéré.

- **Rune** refuse une clé `__proto__`. Le compilateur amont émet une copie
  `for…in` qui assigne directement dans la sortie, remplaçant son prototype.
- **Relay** refuse un abonnement par défaut ; vous l'autorisez par canal.
- **Inker** masque les globales de template qui laissent un template atteindre
  le processus.
- **Un upload qui écraserait un fichier existant échoue atomiquement.** L'amont
  teste puis renomme : deux uploads sur le même nom peuvent tous deux réussir,
  l'un écrasant l'autre en silence.

## Frontières NAPI

La couche HTTP tourne en Rust, et deux choses en découlent :

- **Les uploads multipart sont gardés en mémoire.** Il n'y a pas de fichier
  temporaire, donc `multipart.tmpDir` est refusé à la construction et il n'y a
  pas de `E_MISSING_FILE_TMP_PATH` — rien ne peut manquer.
- **`onFinish` ne reçoit pas de `ServerResponse`.** L'objet réponse ne traverse
  jamais la frontière.

## Paquets sans équivalent amont

`atom`, `chronos`, `comet`, `eon`, `nebula`, `nova`, `photon`, `ream-mcp`,
`station`, `transit` et `vellum` n'ont pas d'équivalent AdonisJS un-pour-un. Ils
sortent entièrement de la comparaison de parité : rien ici n'est mesuré contre
un paquet amont qui n'existe pas.
