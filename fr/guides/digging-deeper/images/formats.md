# Formats et couleur

Ce guide couvre les formats, la couleur et la profondeur :

- Formats
- Couleur
- Profondeur de bits

## Formats

Quinze décodeurs sont compilés — `jpeg png webp gif bmp ico tiff tga qoi pnm
dds farbfeld hdr openexr avif` — et quatorze savent encoder (`image` ne livre
pas d'encodeur DDS, donc le nommer en sortie est refusé d'emblée).

**Lesquels une application accepte est une décision d'exécution, et le défaut
est de trois.** Chaque décodeur est une surface d'analyse atteignable depuis ce
qu'un formulaire d'upload reçoit, donc élargir se fait délibérément :

```ts
export default defineConfig({
  limits: { allowedFormats: ['jpeg', 'png', 'webp', 'gif'] },
})
```

Un nom inconnu lève au lieu d'être ignoré — une coquille qui rétrécirait
silencieusement la liste se manifesterait par des uploads refusés en production
sans raison visible.

### Un qui s'écrit mais ne se relit pas

Prism identifie par le CONTENU, jamais par un nom de fichier, et ça a un prix :
un format dont les octets ne portent pas de signature en tête ne peut pas être
reconnu.

**TGA** place son identifiant dans un *pied de fichier* : il n'est pas reconnu
du tout. Il s'écrit sans jamais pouvoir être accepté en upload — mettre `tga`
dans `allowedFormats` ne rend pas un TGA téléversable.

AVIF était dans ce paragraphe. Il fait l'aller-retour désormais, et c'est
pourquoi ce paquet prend une dépendance système — voir plus bas.

### Le WebP est avec perte par défaut

Un WebP sans perte pèse plusieurs fois le poids d'un WebP avec perte, et le
poids est toute la raison d'utiliser ce format. `image` ne livre pas
d'encodeur avec perte, donc ce chemin passe par libwebp. `quality: 100`
sélectionne le sans-perte — la seule valeur qui ne peut pas vouloir dire
« compresse un peu ».

### L'AVIF prend un effort

```ts
await images.edit(photo).toBuffer({ format: 'avif', quality: 60, effort: 2 })
```

`quality` est respectée comme pour tout format avec perte, et `effort` va de 0
(le plus rapide) à 9 (le plus lent), 4 par défaut. Un encodeur AVIF échange
beaucoup de CPU contre peu d'octets : sur une image de 1600 px, l'effort 4 a
pris quatre fois plus de temps que l'effort 1 pour un fichier à un pour cent
près. Seul l'AVIF a ce réglage.

### Ce qu'il faut pour l'installer : rien

Les binaires publiés embarquent leurs codecs. libwebp est vendorisée, et
libdav1d — le *décodeur* AVIF, sans lequel un AVIF s'écrirait sans jamais
pouvoir se relire — est compilée depuis les sources et liée statiquement par le
workflow de release. `ldd` sur un binaire publié ne liste que libc, libm et
libgcc, et c'est tout.

### Ce qu'il faut pour le compiler depuis les sources

Seulement si aucun binaire précompilé ne correspond à la plateforme, ou pour
travailler sur la crate elle-même. libwebp ne coûte toujours qu'un compilateur
C. libdav1d est celle qui demande quelque chose, et il y a deux façons de la
lui donner :

- **une libdav1d système** — `libdav1d-dev` sur Debian, `dav1d` sur Homebrew,
  le paquet vcpkg sur Windows. `dav1d-sys` la trouve via pkg-config. Le binaire
  produit *dépend* alors de cette bibliothèque à l'exécution, ce qui convient à
  une compilation locale et explique pourquoi ce n'est pas ainsi qu'on publie.
- **`SYSTEM_DEPS_DAV1D_BUILD_INTERNAL=auto`**, avec `meson`, `ninja` et (sur
  x86) `nasm` dans le PATH. `dav1d-sys` clone dav1d et la compile en statique.
  C'est ce que fait la CI.

Un piège à connaître si une compilation part de travers : `dav1d-sys` lance
meson par un appel qui vérifie que le processus a pu *démarrer*, pas qu'il a
réussi. Sans `nasm`, meson échoue, rien n'est signalé, et l'édition de liens
retombe silencieusement sur ce qu'elle trouve d'autre sur le système. Vérifiez
que les trois outils répondent avant d'accuser la crate.

### Le poids du binaire

Les quinze formats font passer le binaire natif d'environ 2,3 Mo à 11 Mo, le
codec AVIF pour l'essentiel. Multiplié par les plateformes précompilées, c'est
le coût dominant du paquet : une application qui ne traite que du jpeg, png et
webp paie douze codecs qu'elle n'autorisera jamais. Rendre le jeu configurable
à la compilation autant qu'à l'exécution corrigerait ça, et n'a pas été fait.

## Couleur

```ts
await images.edit(photo).convertColorSpace({ to: 'display-p3' }).toFormat('png')
```

Les échantillons sont *transformés* — primaires et fonction de transfert
appliquées — et non réinterprétés. `inspect()` rapporte ce que le fichier
déclare dans `colorSpace`.

Cinq espaces : `srgb`, `linear-srgb`, `display-p3`, `dci-p3`, `rec709`. La
liste est courte parce qu'elle a été **prouvée** et non supposée : `rec2020` et
les deux transferts HDR ont été implémentés, essayés contre la bibliothèque,
trouvés en échec (« not supported » pour les primaires BT.2020) et retirés. Un
nom qui ne peut qu'échouer est pire qu'un nom absent.

**Deux choses impossibles ici**, par le modèle et non par le code :

- **`image` ne lit aucun profil ICC.** Un JPEG portant un profil Adobe RGB est
  décodé comme du sRGB, parce que le profil n'est jamais vu. Passez `from`
  quand vous en savez plus — il écrase ce que prétend le fichier au lieu de
  convertir : `convertColorSpace({ to: 'srgb', from: 'display-p3' })`.
- **Adobe RGB n'a aucun point de code CICP**, donc personne ne peut le nommer
  ici. Un travail qui en dépend demande une chaîne ICC, c'est-à-dire une autre
  dépendance.

## Profondeur de bits

```ts
await images.edit(scan).toBuffer({ format: 'png', depth: 16 })
```

Seuls PNG et TIFF portent seize bits. Ailleurs l'encodeur redescend à huit au
lieu de refuser — un pipeline qui règle `depth` une fois ne doit pas casser
quand son format de sortie change.
