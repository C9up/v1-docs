# Vellum — Venir de pdfkit

`PdfDocument` reprend les méthodes et les options de pdfkit 0.20, et met le
texte en page comme pdfkit, ligne pour ligne. Un document écrit pour pdfkit
tourne sur vellum une fois son import changé :

```diff
- import PDFDocument from 'pdfkit'
+ import { PdfDocument as PDFDocument } from '@c9up/vellum'
```

Les tests de vellum contiennent trois documents de ce genre — un devis, une
facture portant un QR-bill suisse dessiné par `@c9up/prism/swissqrbill/pdf`, et
un contrat de trois pages (`examples/documents.ts`) — et les rendent avec les
deux bibliothèques : les mêmes mots sur les mêmes lignes des mêmes pages, et
moins de 1 % des pixels d'écart. Ce qui diffère, c'est le dessin des glyphes :
pdfkit laisse Helvetica au lecteur PDF, vellum embarque Liberation Sans à sa
place, aux chasses et au crénage d'Helvetica.

La suite de cette page liste chaque point où vellum se comporte autrement,
chacun avec sa raison.

## Non fourni

| pdfkit | Pourquoi |
| --- | --- |
| `pattern()` | Il prend une chaîne d'opérateurs PDF bruts, qui serait écrite dans la page sans contrôle |
| `Symbol` et `ZapfDingbats` | Aucune police libre ne porte leurs glyphes à leurs codes ; une police qui a les caractères les dessine |
| `pdfVersion: '1.3'`, `'1.7ext3'` | Le moteur écrit de 1.4 à 2.0 ; la version par défaut est 1.7 |
| Chiffrement RC4 et AES-128 | Seul AES-256 est proposé (PDF 2.0) : RC4 est cassé, et PDF 2.0 déprécie les deux |
| Écrire les pages au fur et à mesure | Le document est gardé jusqu'à `end()`, qui l'écrit d'un coup ; `flushPages()` ferme les pages à `switchToPage` et ne libère rien |
| Un export par défaut | vellum n'a que des exports nommés : `import { PdfDocument } from '@c9up/vellum'` |

## Refusé là où pdfkit écrit n'importe quoi

| Quoi | vellum | Pourquoi |
| --- | --- | --- |
| URL des liens | `http`, `https`, `mailto` et `tel` seulement | Un lien `javascript:` ou `file:` exécute du code ou lit le disque du lecteur |
| `addContent` | Opérateurs de tracé (`m l c v y h re`) seulement | Tout autre opérateur contourne les contrôles sur le texte, les images et l'état |
| `annotate` | `Text`, `Highlight`, `Underline`, `StrikeOut`, `Square`, `Circle`, `FreeText` | pdfkit écrit toute clé qu'on lui donne, actions JavaScript comprises |
| `format` d'un champ | Paramètres vérifiés, `AA` brut refusé | pdfkit écrit les paramètres tels quels dans le script du champ |
| Une couleur illisible | Une erreur | pdfkit l'ignore et continue dans la couleur précédente |
| Une longueur illisible (`'12 pt'`) | Une erreur, et un signe est respecté | pdfkit la lit comme 0 |
| `restore()` sans `save()` | Une erreur | pdfkit écrit une restauration déséquilibrée dans la page |
| Images, polices, SVG | Bornés avant d'être lus ; un SVG ne lit aucun fichier ni le réseau | Un fichier envoyé par quelqu'un peut annoncer des gigaoctets, ou nommer un fichier du serveur |
| Sous PDF/A et PDF/UA | Annotations sans apparence et champs de formulaire refusés ; document vérifié contre sa norme à `end()` | pdfkit déclare la norme et ne vérifie rien |

## Sortie différente

| Quoi | vellum | pdfkit |
| --- | --- | --- |
| Polices standard | Embarquées (Liberation Sans, Serif et Mono aux métriques standard) | Référencées, dessinées par le lecteur |
| Texte que WinAnsi ne code pas, dans une police standard | Dessiné avec la police embarquée | Dessiné en glyphes manquants |
| `Ÿ` (`U+0178`) dans une police standard | Mesuré comme `Ÿ` | Mesuré comme `ÿ` |
| Texte de droite à gauche | Mis en page de droite à gauche, texte mixte dans l'ordre bidirectionnel d'Unicode, relu dans l'ordre logique | Dessiné dans l'ordre donné |
| `align` par défaut | À droite pour un paragraphe de droite à gauche | Toujours à gauche |
| Un mot plus large que la ligne | Coupé entre deux graphèmes | Coupé entre deux unités UTF-16, ce qui peut casser un caractère |
| `boundsOfString` | N'ajoute jamais de page ; un paragraphe justifié mesure ce qu'il remplit | Peut ajouter des pages en mesurant |
| `quadraticCurveTo` | Une courbe quadratique | L'opérateur `v` du PDF, une cubique qui s'incurve autrement |
| `image` avec `cover` | Ce qui dépasse de la boîte est coupé | Dessiné hors de la boîte |
| État graphique à un saut de page | Couleurs, opacités et style de trait continuent | Chaque page repart des valeurs par défaut du PDF alors que l'état de pdfkit dit autre chose |
| `addPage(options)` | Fusionnées avec les options du document | Les remplacent : `addPage({ margin: 10 })` perd le format |
| Entrées du sommaire | Ouvrent en `left`, `top` sur leur page | Ouvrent la page entière ; `left` mesuré depuis le bord droit |
| `addNamedDestination(nom, 'XYZ', left, top, zoom)` | Le zoom n'est pas écrit : le lecteur garde le sien | Écrit |
| `lineAnnotation` | Son rectangle est la boîte de la ligne | Le point d'arrivée pris pour une largeur et une hauteur |
| Nom d'un `file()` | Le nom de base du chemin | Le chemin tel quel, avec les répertoires du serveur |
| Options de `file()` | Laissées telles quelles | Modifiées : le nom et la relation y sont ajoutés |
| `borderColor: [255, 0, 0]` d'un tableau | Une couleur | Trois côtés |
| Couleurs de bordure de tableau côté par côté | Respectées | Un seul rectangle dans la couleur du haut quand les quatre épaisseurs sont égales |
| `rowStyles: 30` | La hauteur de chaque ligne | Ignoré |
| Champs de formulaire | Écrits avec leur apparence ; `fillForm` dessine le fond et la bordure du champ sous la valeur | `NeedAppearances`, laissé au lecteur |
| Contenu marqué | Ne s'imbrique pas ; la structure du dernier paragraphe se ferme avec `text()` | S'imbrique ; celle du dernier paragraphe reste ouverte |
| Contenu marqué jamais rattaché à un élément de structure | Dessiné sans balise | Écrit avec un identifiant que la structure ne contient pas |
| Intitulés (`H1`…`H6`) créés par `structType` | Prennent leur titre du texte | Sans titre |
