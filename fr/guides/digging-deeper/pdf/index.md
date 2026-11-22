# Introduction

Ce guide couvre le PDF avec vellum :

- Exemples rapides
- Installation
- Garde-fous
- Erreurs
- Pas encore

Statut : **Présent (TS + Rust N-API)**.

- Paquet : `@c9up/vellum`
- Objectif : convertir les pages d'un PDF en images, lire ce que contient un
  document et le remanier — fusionner, découper, pivoter, tamponner. Il écrit
  aussi des documents à partir de rien : [Générer des documents](/fr/guides/digging-deeper/pdf/documents).

Le travail se fait en Rust derrière N-API, parce que le PDF n'a pas
d'implémentation JavaScript satisfaisante. C'est une capacité qui manque à la
plateforme, pas l'optimisation d'une capacité existante.

## Exemples rapides

```ts
import vellum from '@c9up/vellum/services/main'

// Un aperçu de la première page, large de 1200px
const apercu = await vellum.render(pdf, { page: 1, width: 1200 })

// Toutes les pages en JPEG
const pages = await vellum.renderAll(pdf, { format: 'jpeg', quality: 82 })

// Ce que contient le document
const { pageCount, encrypted } = await vellum.inspect(pdf)
const { title, author, createdAt } = await vellum.metadata(pdf)
const texte = await vellum.extractText(pdf, { page: 1 })

// Le remanier
const dossier = await vellum.merge([contrat, annexe])
const extrait = await vellum.selectPages(pdf, [1, 3, 4])
const parts = await vellum.split(pdf)
const droit = await vellum.rotate(scan, 90, { pages: [1] })

// Le tamponner
const signe = await vellum.stamp(bonDeTravail, signature, {
  page: 1, x: 380, y: 690, width: 140,
})
const marque = await vellum.stampText(facture, 'PAYÉ', {
  x: 400, y: 80, size: 24, color: '#c00', opacity: 0.6,
})
```

Toutes les méthodes sont asynchrones. Rasteriser une page A4 représente environ
30 ms de calcul pur : le travail part sur le pool de threads libuv plutôt que de
bloquer le thread qui sert les requêtes.

**Les pages sont numérotées à partir de 1** — le numéro imprimé sur la page, pas
un index de tableau.

## Installation

```bash
ream configure @c9up/vellum
```

La commande enregistre le provider et écrit `config/vellum.ts` :

```ts
import { defineConfig } from '@c9up/vellum'
import env from '#start/env'

export default defineConfig({
  format: env.get('VELLUM_FORMAT', 'png'),
  scale: 1,
  quality: 82,
  background: '#ffffff',
})
```

Chaque option est une valeur par défaut que n'importe quel appel peut remplacer.

Le service est aussi une classe, utilisable sans hôte :

```ts
import { Vellum } from '@c9up/vellum'

const vellum = new Vellum({ format: 'jpeg', quality: 82 })
```

## Garde-fous

Toute entrée est traitée comme hostile, parce que ces documents viennent
d'envois utilisateurs :

- Le travail du moteur tourne derrière un filet anti-panique — une panique sur un
  thread de travail abattrait tout le processus.
- La taille rendue est bornée ; un `scale` non borné est un vecteur d'épuisement
  mémoire.
- Une couleur malformée est refusée plutôt que ramenée au blanc, ce qui donnerait
  un rendu faux que personne ne signale.
- Le texte écrit sur une page est échappé, pour qu'un titre de document ne puisse
  pas injecter d'opérateurs de flux de contenu.
- L'imbrication est bornée partout où le document la choisit : objets, espaces de
  couleur, fonctions, arbre des champs d'un formulaire. Un débordement de pile
  n'est pas une panique, aucun filet ne le rattraperait ; un document imbriqué
  trop profond est refusé à la place.
- Ce que coûte la lecture d'une page est borné, parce que la taille d'un document
  n'en dit rien : un flux compressé de 1 Mio se décompresse en 1 Gio, et des
  formulaires qui se dessinent dix fois l'un l'autre à chaque niveau font de 2 Ko
  des heures de travail. Une page qui dépasse un budget est refusée, jamais
  dessinée sans la partie qui n'y tenait pas. `renderAll` et `extractTextAll`
  tiennent aussi le document à un total sur toutes ses pages, puisque le nombre
  de pages est au choix du document.
- Chaque chemin qui analyse un document existant — l'inspecter, lire ses
  champs, l'éditer, le tamponner, le signer, vérifier ses signatures —
  décompresse ses flux d'objets et de références croisées sous un plafond de
  32 Mio pour tous ensemble, et construit au plus 4 millions d'objets à partir
  du document. Il refuse un document qui dépasse l'un ou l'autre, ou dont un
  flux d'objets n'a pas pu être lu, plutôt que de le lire sans les objets qu'il
  contenait.

| Option | Par défaut | Borne |
| --- | --- | --- |
| `maxPixels` | 50 millions | Les pixels qu'une page peut produire au rendu. |
| `maxTotalPixels` | 500 millions | Les pixels que `renderAll` peut produire sur toutes les pages, vérifiés avant de dessiner la première. |
| `maxDecodedBytes` | 256 Mio | Les données de flux décodées dont une page peut avoir besoin : contenu, images, polices. |
| `maxOperations` | 10 millions | Les opérateurs de contenu et glyphes que le dessin d'une page peut demander, formulaires imbriqués compris. |
| `maxTotalDecodedBytes` | 1 Gio | Les données de flux décodées dont `renderAll` et `extractTextAll` peuvent avoir besoin sur toutes les pages. |
| `maxTotalOperations` | 10 millions | Les opérateurs et glyphes que `renderAll` et `extractTextAll` peuvent demander sur toutes les pages — et donc le texte que rend `extractTextAll`. |

Chacune se règle dans `config/vellum.ts`, et `render` comme `renderAll` les
acceptent à l'appel. N'en relever une qu'en connaissance de cause, pour un
document de confiance.

## Erreurs

Les échecs lèvent une `VellumError`, porteuse d'un `code` :

| Code | Levée quand |
| --- | --- |
| `E_VELLUM_NAPI_REQUIRED` | Le moteur natif n'est pas chargeable sur cette plateforme |
| `E_VELLUM_INVALID_PDF` | Les octets ne forment pas un PDF lisible |
| `E_VELLUM_INVALID_PAGE` | Un numéro de page inférieur à 1, ou au-delà de 4 294 967 296, le dernier que le moteur adresse |
| `E_VELLUM_INVALID_ROTATION` | Un angle qui n'est pas un multiple entier de 90 |
| `E_VELLUM_RENDER_FAILED` | La rasterisation a échoué |
| `E_VELLUM_EXTRACT_FAILED` | L'extraction de texte a échoué |
| `E_VELLUM_MERGE_FAILED` · `E_VELLUM_SELECT_FAILED` · `E_VELLUM_SPLIT_FAILED` · `E_VELLUM_ROTATE_FAILED` | L'opération a échoué |
| `E_VELLUM_STAMP_FAILED` · `E_VELLUM_STAMP_TEXT_FAILED` | Le tamponnage a échoué |
| `E_VELLUM_SIGNED_DOCUMENT` | Une modification réécrirait un document signé ; voir [Signature](/fr/guides/digging-deeper/pdf/signing#signature) |

Le moteur n'est **pas optionnel** : il n'existe aucun repli JavaScript, donc un
binaire absent est un échec franc avec un message actionnable, plutôt qu'une
dégradation silencieuse qui ferait diverger deux déploiements du même code.

## Pas encore

Un adapter pour un **prestataire certifié** — une courte fonction qui retourne
un `Signer`, et qui appartient à qui possède le compte plutôt qu'à un paquet
agnostique.
