# Sécurité et tests

Ce guide couvre les limites de sécurité, les erreurs et les tests :

- Sûreté
- Erreurs
- Le moteur
- Tests

## Sûreté

Chaque octet arrivant ici vient d'un upload, et les gardes s'exécutent avant
toute allocation.

**Le format vient du contenu**, jamais d'un nom de fichier ni d'un
`Content-Type` — les deux sont fournis par celui qui a fourni les octets.

**Trois décodeurs, sur liste blanche.** Chaque décodeur compilé est une surface
d'analyse exposée à une entrée hostile. Un format que personne n'a demandé est
un passif, pas une fonctionnalité — un GIF est une image parfaitement valide et
reste refusé.

**Un plafond de pixels, vérifié sur l'en-tête.** Un PNG de 40 Ko peut déclarer
50000x50000, et le décoder demande dix gigaoctets avant que quoi que ce soit ne
proteste. Le produit est calculé en 64 bits : en 32 il déborde vers un petit
nombre pour exactement la plus grande image exprimable, et le test passerait.
Pour l'AVIF, l'en-tête est l'en-tête de séquence AV1, lu sans décoder —
`inspect` reste une lecture d'en-tête — et le décodeur AV1 reçoit le même
plafond comme limite de taille de trame, parce qu'une trame peut déclarer sa
propre taille.

**Le même plafond sur ce qu'une opération construit.** Une cible de
redimensionnement, le côté qu'un redimensionnement déduit des proportions,
l'intermédiaire agrandi d'un `cover`, un calque de filigrane : chacun est
refusé avec `E_PRISM_TOO_MANY_PIXELS` avant d'être alloué. Une allocation qui
échoue arrête le processus au lieu de lever une erreur, donc une taille venue
d'une requête doit être bornée avant d'être demandée. Le texte d'un filigrane
est limité à 1024 caractères, et une largeur, une hauteur ou une qualité qui
n'est pas un entier dans les bornes est refusée, pas tronquée.

**Un filet anti-panique sur chaque frontière.** Une panique qui traverse NAPI
fait tomber le processus Node ; sur un thread libuv elle l'avorte purement.

**Les recouvrements sont gardés comme l'entrée** — un filigrane par locataire
est un upload lui aussi.

**Les métadonnées ne survivent jamais** au passage dans le moteur. Réencoder
depuis des pixels décodés n'emporte ni EXIF, ni GPS, ni XMP, ni profil
colorimétrique. Une photo de vacances porte les coordonnées de la maison :
les supprimer est le bon défaut, pas une option à activer.

## Erreurs

| Code | Levée quand |
|---|---|
| `E_PRISM_EMPTY_INPUT` | rien n'a été passé |
| `E_PRISM_INPUT_TOO_LARGE` | au-delà du plafond d'octets |
| `E_PRISM_TOO_MANY_PIXELS` | l'en-tête déclare, ou une opération construirait, plus de pixels qu'autorisé |
| `E_PRISM_UNKNOWN_FORMAT` | les octets ne sont pas une image |
| `E_PRISM_FORMAT_NOT_ALLOWED` | une vraie image, dans un format absent de `allowedFormats` |
| `E_PRISM_UNSUPPORTED_FORMAT` | un format de sortie que le moteur n'écrit pas (`dds`) |
| `E_PRISM_INVALID_GEOMETRY` | recadrage hors image, rotation hors angles droits, texte de filigrane de plus de 1024 caractères |
| `E_PRISM_INVALID_FONT` | la police du filigrane est illisible |
| `E_PRISM_INVALID_OPERATION` | une opération à laquelle il manque un champ, ou une taille, une qualité ou un effort qui n'est pas un entier dans les bornes |
| `E_PRISM_QR_TOO_LONG` | plus de texte qu'un QR code n'en contient au niveau et à la version choisis |
| `E_PRISM_INVALID_QR_OPTION` | une option de QR code hors bornes, une couleur qui n'est pas de l'hexadécimal strict, ou un style qui ne serait pas lisible |
| `E_PRISM_NATIVE_REQUIRED` | le moteur Rust n'est pas installé pour cette plateforme |

## Le moteur

Rust, chargé comme un `.node` précompilé. Il n'est **pas** optionnel et il n'y
a pas de repli JavaScript : un binaire manquant lève avec les instructions de
compilation plutôt que de se dégrader silencieusement, pour qu'un déploiement
ne puisse pas se comporter différemment d'un autre. Compilation locale par
`pnpm build:napi`.

## Tests

```ts
import { fakeImages } from '@c9up/prism/testing'

const { images, restore } = fakeImages()
afterEach(restore)
```

Le vrai moteur, pas un bouchon — une assertion sur les dimensions d'une
vignette ne vaut que contre le code qui la produit.
