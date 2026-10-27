# Avatar

A user's picture, with a fallback when there is none. It has three states, not two: an image that has not loaded *yet* does not show the fallback — swapping initials in and a photo over them a moment later is the flicker this component exists to avoid. The fallback appears only once the image has actually failed, or when there is no `AvatarImage` at all.

That is what the parts share through `Avatar`: the image reports its own load state, the fallback reads it, and neither knows the other exists. Around them, a status dot for the corner and a group that stacks several faces.

```sh
ream nebula:add avatar
```

Atom · `atoms/Avatar.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { Avatar, AvatarFallback, AvatarImage } from '@c9up/nebula'

Avatar({
  children: () => html`
    ${AvatarImage({ src: user.photo, alt: user.name })}
    ${AvatarFallback({ children: user.initials })}
  `,
})
```

`children` is typed `Parts`: the `() =>` is what lets the image and the fallback find their `Avatar` — see [composition](/en/nebula/composition). An `AvatarImage` or an `AvatarFallback` used outside an `Avatar` throws.

## Examples

### Initials only

An avatar with no `AvatarImage` shows its fallback straight away, without waiting for a load that will never happen. An `AvatarImage` whose `src` is `undefined` or `''` counts as no image:

```ts
Avatar({ children: () => AvatarFallback({ children: 'AB' }) })
```

### Sizes

```ts
Avatar({ size: 'sm', children: () => AvatarFallback({ children: 'AB' }) })  // 24 px
Avatar({ children: () => AvatarFallback({ children: 'AB' }) })               // 32 px
Avatar({ size: 'lg', children: () => AvatarFallback({ children: 'AB' }) })  // 40 px
```

The fallback's text and the badge follow the avatar's size.

### A status dot

`AvatarBadge` sits in the bottom-right corner, ringed in the background colour so it reads against the photo. An icon inside it is sized to the dot, and hidden at `sm`, where there is no room for one.

```ts
import { html } from '@c9up/aurora'
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@c9up/nebula'

Avatar({
  children: () => html`
    ${AvatarImage({ src: user.photo, alt: user.name })}
    ${AvatarFallback({ children: user.initials })}
    ${() => (online() ? AvatarBadge({ class: 'bg-green-600' }) : null)}
  `,
})
```

### A group

`AvatarGroup` overlaps its avatars and rings each one, so the stack reads as separate faces. `AvatarGroupCount` closes it with the number left out, and takes the size of the avatars around it.

```ts
import { html } from '@c9up/aurora'
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from '@c9up/nebula'

AvatarGroup({
  children: html`
    ${team.slice(0, 3).map((member) =>
      Avatar({
        children: () => html`
          ${AvatarImage({ src: member.photo, alt: member.name })}
          ${AvatarFallback({ children: member.initials })}
        `,
      }),
    )}
    ${AvatarGroupCount({ children: `+${team.length - 3}` })}
  `,
})
```

`AvatarGroup` provides nothing, so its `children` is a plain value; each `Avatar` inside keeps its own thunk.

### Another person

An `AvatarImage` reports its state when it is built, and a failed image stays failed. To show someone else, build a new avatar rather than handing the same one a new `src`:

```ts
html`${() => {
  const person = current()
  return Avatar({
    children: () => html`
      ${AvatarImage({ src: person.photo, alt: person.name })}
      ${AvatarFallback({ children: person.initials })}
    `,
  })
}}`
```

## API

### Avatar

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | An `AvatarImage`, an `AvatarFallback`, an `AvatarBadge`. |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | 24, 32 or 40 px. Set once. |
| `class` | `Reactive<string>` | — | Merged into the root's classes. |

### AvatarImage

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | `Reactive<string \| undefined>` | — | `undefined` or `''` is no image: the fallback shows at once. |
| `alt` | `Reactive<string>` | `''` | The person's name. Left empty, the image is decorative. |
| `class` | `Reactive<string>` | — | Merged into the `<img>`'s classes. |

### AvatarFallback

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | Initials, an icon. |
| `class` | `Reactive<string>` | — | Merged into the fallback's classes. |

### AvatarBadge

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | An optional icon; hidden at `size: 'sm'`. |
| `class` | `Reactive<string>` | — | Its colour, typically. |

### AvatarGroup

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The `Avatar`s, then an `AvatarGroupCount`. |
| `class` | `Reactive<string>` | — | Merged into the group's classes. |

### AvatarGroupCount

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | `"+3"`, or an icon. |
| `class` | `Reactive<string>` | — | Merged into the count's classes. |

## Accessibility

The image is a native `<img>` and its `alt` is what a screen reader says. It defaults to `''`, which makes the photo decorative — right when the person's name is written beside it, wrong when the avatar stands alone, so give `alt` the name there. The fallback is plain text and is read as written: initials alone say little, so a standalone avatar is better served by an image `alt` or by a name next to it. `AvatarBadge` has no text of its own; if the status it shows matters, say it in words nearby. Nothing here is focusable.
