# Attachment

A file carried by a message. Two shapes from one component: an image renders as a thumbnail, anything else as a chip with its extension, its name and its size. The choice is made from the MIME type, which the caller usually has, rather than pushed onto the caller as two components.

The size is in binary units — 1024 bytes to the kilobyte — because that is what a file manager shows for the same file, and "1.2 MB" here beside "1.1 MB" there for one upload reads as a bug. A removable attachment gets a separate remove `<button>` beside the link, never a click handler on the chip: merged, "open" and "delete" would be the same gesture, told apart only by where you land.

```sh
ream nebula:add attachment
```

Molecule · `molecules/Attachment.ts` · no dependencies

## Usage

```ts
import { Attachment } from '@c9up/nebula'

Attachment({ name: 'contract.pdf', size: 248_312, href: '/files/contract.pdf' })
```

## Examples

### A file, an image

```ts
Attachment({ name: 'report.final.pdf', size: 2_048 })                    // "PDF" tile, "2.0 KB"
Attachment({ name: 'photo.jpg', type: 'image/jpeg', href: '/files/photo.jpg' })
Attachment({
  name: 'diagram.png',
  type: 'image/png',
  href: '/files/diagram.png',
  previewSrc: '/files/diagram.thumb.png',
})
```

The tile shows the extension — up to four letters after the last dot, `?` when there is none. An image needs a source to be drawn as a thumbnail: `previewSrc`, or `href` when there is no smaller preview. An image with neither is drawn as a file chip. Without `href` the chip is inert: no link, nothing to open.

### Removable, in a composer

Before a message is sent, its files are a list the user can still edit:

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

A file not yet uploaded has no `href`; its thumbnail comes from `previewSrc`. The object URL is made once, when the file is added, and released when it is removed: made inside the accessor, a new one would be created for every file each time the list changes, and none would ever be freed. Leave `size` out for something whose size is not known yet.

### Under a message

```ts
import { html } from '@c9up/aurora'
import { Attachment, Message } from '@c9up/nebula'

Message({
  author: 'Ada',
  children: 'Both versions attached.',
  attachments: html`
    ${Attachment({ name: 'draft-v1.docx', size: 81_920, href: '/files/1' })}
    ${Attachment({ name: 'draft-v2.docx', size: 90_112, href: '/files/2' })}
  `,
})
```

### formatBytes

The size formatting is exported, for a table of files or an upload limit that must read the same as the chips:

```ts
import { formatBytes } from '@c9up/nebula'

formatBytes(999)                      // "999 B"
formatBytes(1024)                     // "1.0 KB"
formatBytes(9.4 * 1024 * 1024)        // "9.4 MB"
formatBytes(941.3 * 1024 * 1024)      // "941 MB"
formatBytes(-1)                       // ""
```

One decimal below 10, none above — "9.4 MB" is useful, "941.3 MB" is noise. Units stop at TB. The unit names and the decimal point are English ones, whatever the language of the page.

## API

### Attachment

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | — | Required. The file name: the thumbnail's `alt`, and where the extension comes from. |
| `size` | `number` | — | Bytes. Omit for something not uploaded yet. |
| `type` | `string` | — | MIME type. Anything under `image/` renders as a thumbnail. |
| `href` | `string` | — | Opens the file. Without it the chip is inert. |
| `previewSrc` | `string` | `href` | The thumbnail's source, for an image. |
| `onRemove` | `() => void` | — | Shows a remove button, which calls it. |
| `class` | `Reactive<string>` | — | Merged into the root's classes. |

All but `class` are read once, at setup.

### formatBytes

`formatBytes(bytes: number): string` — a byte count in binary units (`B`, `KB`, `MB`, `GB`, `TB`); an empty string for a negative or non-finite value.

## Accessibility

A thumbnail is an `<img>` with the file name as its `alt`, loaded lazily. A chip's extension tile is `aria-hidden`: the name beside it already says it. With `href`, the thumbnail or the chip is a link, reached with <kbd>Tab</kbd> and followed with <kbd>Enter</kbd>.

The remove button is a separate native `<button>` named `"Remove <name>"` — `"Remove contract.pdf"`. That name is built in and no prop replaces it yet.
