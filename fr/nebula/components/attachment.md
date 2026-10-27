# Attachment

Un fichier porté par un message. Deux formes pour un seul composant : une image s'affiche en vignette, tout le reste en pastille avec son extension, son nom et sa taille. Le choix se fait d'après le type MIME, que l'appelant a en général sous la main, plutôt que de lui faire choisir entre deux composants.

La taille est en unités binaires — 1024 octets au kilo — parce que c'est ce qu'affiche un gestionnaire de fichiers pour le même fichier, et qu'un « 1.2 MB » ici à côté d'un « 1.1 MB » là-bas pour un même envoi ressemble à un bug. Une pièce jointe supprimable reçoit un `<button>` de suppression distinct, à côté du lien, jamais un gestionnaire de clic sur la pastille : fusionnés, « ouvrir » et « supprimer » deviendraient le même geste, distingués seulement par l'endroit où l'on clique.

```sh
ream nebula:add attachment
```

Molécule · `molecules/Attachment.ts` · aucune dépendance

## Utilisation

```ts
import { Attachment } from '@c9up/nebula'

Attachment({ name: 'contrat.pdf', size: 248_312, href: '/files/contrat.pdf' })
```

## Exemples

### Un fichier, une image

```ts
Attachment({ name: 'rapport.final.pdf', size: 2_048 })                   // tuile "PDF", "2.0 KB"
Attachment({ name: 'photo.jpg', type: 'image/jpeg', href: '/files/photo.jpg' })
Attachment({
  name: 'schema.png',
  type: 'image/png',
  href: '/files/schema.png',
  previewSrc: '/files/schema.thumb.png',
})
```

La tuile affiche l'extension — jusqu'à quatre lettres après le dernier point, `?` s'il n'y en a pas. Une image a besoin d'une source pour être dessinée en vignette : `previewSrc`, ou `href` faute d'aperçu plus petit. Une image sans l'un ni l'autre est dessinée en pastille de fichier. Sans `href`, la pastille est inerte : pas de lien, rien à ouvrir.

### Supprimable, dans un champ de saisie

Avant l'envoi d'un message, ses fichiers forment une liste que l'utilisateur peut encore modifier :

```ts
import { html, signal } from '@c9up/aurora'
import { Attachment } from '@c9up/nebula'

interface Pending { file: File; preview?: string }

const pending = signal<readonly Pending[]>([])

function add(file: File): void {
  const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
  pending([...pending(), { file, preview }])
}

function remove(item: Pending): void {
  if (item.preview !== undefined) URL.revokeObjectURL(item.preview)
  pending(pending().filter((other) => other !== item))
}

html`<div class="flex flex-wrap gap-2">
  ${() =>
    pending().map((item) =>
      Attachment({
        name: item.file.name,
        size: item.file.size,
        type: item.file.type,
        previewSrc: item.preview,
        onRemove: () => remove(item),
      }),
    )}
</div>`
```

Un fichier pas encore envoyé n'a pas de `href` ; sa vignette vient de `previewSrc`. L'URL d'objet est créée une fois, à l'ajout du fichier, et libérée à son retrait : créée dans l'accesseur, une nouvelle serait fabriquée pour chaque fichier à chaque changement de la liste, et aucune ne serait jamais libérée. Omettez `size` pour un fichier dont la taille n'est pas encore connue.

### Sous un message

```ts
import { html } from '@c9up/aurora'
import { Attachment, Message } from '@c9up/nebula'

Message({
  author: 'Ada',
  children: 'Les deux versions sont jointes.',
  attachments: html`
    ${Attachment({ name: 'brouillon-v1.docx', size: 81_920, href: '/files/1' })}
    ${Attachment({ name: 'brouillon-v2.docx', size: 90_112, href: '/files/2' })}
  `,
})
```

### formatBytes

La mise en forme des tailles est exportée, pour un tableau de fichiers ou une limite d'envoi qui doivent se lire comme les pastilles :

```ts
import { formatBytes } from '@c9up/nebula'

formatBytes(999)                      // "999 B"
formatBytes(1024)                     // "1.0 KB"
formatBytes(9.4 * 1024 * 1024)        // "9.4 MB"
formatBytes(941.3 * 1024 * 1024)      // "941 MB"
formatBytes(-1)                       // ""
```

Une décimale sous 10, aucune au-dessus — « 9.4 MB » est utile, « 941.3 MB » est du bruit. Les unités s'arrêtent au TB. Les unités et le séparateur décimal sont ceux de l'anglais, quelle que soit la langue de la page.

## API

### Attachment

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `name` | `string` | — | Obligatoire. Le nom du fichier : l'`alt` de la vignette, et la source de l'extension. |
| `size` | `number` | — | En octets. À omettre pour un fichier pas encore envoyé. |
| `type` | `string` | — | Le type MIME. Tout ce qui commence par `image/` s'affiche en vignette. |
| `href` | `string` | — | Ouvre le fichier. Sans lui, la pastille est inerte. |
| `previewSrc` | `string` | `href` | La source de la vignette, pour une image. |
| `onRemove` | `() => void` | — | Affiche un bouton de suppression, qui l'appelle. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la racine. |

Toutes sauf `class` sont lues une seule fois, à la construction.

### formatBytes

`formatBytes(bytes: number): string` — un nombre d'octets en unités binaires (`B`, `KB`, `MB`, `GB`, `TB`) ; une chaîne vide pour une valeur négative ou non finie.

## Accessibilité

Une vignette est un `<img>` dont l'`alt` est le nom du fichier, chargé paresseusement. La tuile d'extension d'une pastille est `aria-hidden` : le nom à côté le dit déjà. Avec `href`, la vignette ou la pastille est un lien, atteint avec <kbd>Tab</kbd> et suivi avec <kbd>Entrée</kbd>.

Le bouton de suppression est un `<button>` natif distinct, nommé `"Remove <name>"` — `"Remove contrat.pdf"`. Ce nom est intégré et aucune prop ne le remplace encore.
