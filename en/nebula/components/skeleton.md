# Skeleton

A placeholder block while content loads: a pulsing shape where the text, the picture or the row will be, so the page keeps its layout instead of jumping when the data lands.

It is `aria-hidden`, with no live region, on purpose. A pulsing grey box carries no information, and announcing one per row of a loading table is worse than silence. The region around the skeletons carries `aria-busy` instead, which says the same thing once.

```sh
ream nebula:add skeleton
```

Atom · `atoms/Skeleton.ts` · no dependencies

## Usage

```ts
import { Skeleton } from '@c9up/nebula'

Skeleton({ class: 'h-4 w-48' })
```

A skeleton has no size of its own: `class` gives it the shape of what it stands for.

## Examples

### A card while it loads

```ts
import { html } from '@c9up/aurora'
import { Skeleton } from '@c9up/nebula'

html`<div class="flex items-center gap-4">
  ${Skeleton({ class: 'size-12 rounded-full' })}
  <div class="space-y-2">
    ${Skeleton({ class: 'h-4 w-64' })}
    ${Skeleton({ class: 'h-4 w-48' })}
  </div>
</div>`
```

### The region says it is busy

```ts
import { html } from '@c9up/aurora'

html`<ul aria-busy="${() => (loading() ? 'true' : 'false')}" class="space-y-3">
  ${() =>
    loading()
      ? [1, 2, 3].map(() => html`<li>${Skeleton({ class: 'h-10 w-full' })}</li>`)
      : rows().map((row) => html`<li>${row.name}</li>`)}
</ul>`
```

## API

### Skeleton

| Prop | Type | Default | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | The shape: a height, a width, a radius. Merged last, so `rounded-full` replaces the default `rounded-md`. |

## Accessibility

`aria-hidden="true"`: a skeleton is invisible to assistive technology. Put `aria-busy="true"` on the region it fills while it loads, and the content in its place once it has. The pulse is `animate-pulse`; it does not stop under reduced motion unless you add `motion-reduce:animate-none` to `class`.
