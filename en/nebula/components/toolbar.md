# Toolbar

A row of controls that behaves as one tab stop. A `<div class="flex gap-2">` full of buttons looks the same and is not navigable: eleven buttons in a formatting bar are eleven presses of <kbd>Tab</kbd> to get past, and a keyboard user heading for the content below pays for every one. A toolbar is one stop, and the arrows move inside it.

The items are whatever you put in — [Button](/en/nebula/components/button), [Toggle](/en/nebula/components/toggle), a `Select` trigger, a plain `<a href>` — found by the same tabbable selector the focus trap uses. There is no marker attribute to remember: a control a keyboard could reach on its own is a control the arrows reach here.

```sh
ream nebula:add toolbar
```

Molecule · `molecules/Toolbar.ts` · [button](/en/nebula/components/button), [separator](/en/nebula/components/separator)

## Usage

```ts
import { html } from '@c9up/aurora'
import { Toolbar, ToolbarButton, ToolbarSeparator } from '@c9up/nebula'

Toolbar({
  label: 'Formatting',
  children: html`
    ${ToolbarButton({ children: 'Bold', onClick: () => format('bold') })}
    ${ToolbarButton({ children: 'Italic', onClick: () => format('italic') })}
    ${ToolbarSeparator({})}
    ${ToolbarButton({ children: 'Link', onClick: () => format('link') })}
  `,
})
```

`Toolbar` provides no context, so its children are a plain value. `ToolbarButton` is a `Button` that defaults to `ghost` and `sm`, so a row of them reads as a bar rather than as several primary actions competing for attention.

## Examples

### Any control

```ts
import { signal } from '@c9up/aurora'
import { Button, Toggle } from '@c9up/nebula'

const bold = signal(false)

Toolbar({
  label: 'Editor',
  children: html`
    ${ToolbarButton({ children: 'Undo', disabled: () => !canUndo(), onClick: () => undo() })}
    ${ToolbarButton({ children: 'Redo', onClick: () => redo() })}
    ${ToolbarSeparator({})}
    ${Toggle({ pressed: bold, onPressedChange: bold, size: 'sm', label: 'Bold', children: 'B' })}
    ${Button({ size: 'sm', children: 'Publish' })}
  `,
})
```

The toggle and the plain button are reached by the arrows like the toolbar buttons. The items are looked up on every key press, not registered once, so the arrows also reach a control that appears, or is enabled, after the bar mounts. The tab stops are set only at mount, though: such a control keeps a <kbd>Tab</kbd> stop of its own as well.

### Vertical, without wrapping

```ts
Toolbar({
  label: 'Tools',
  orientation: 'vertical',
  loop: false,
  children: html`
    ${ToolbarButton({ children: 'Select' })}
    ${ToolbarButton({ children: 'Draw' })}
    ${ToolbarButton({ children: 'Erase' })}
  `,
})
```

A vertical toolbar stacks its controls and moves with <kbd>ArrowUp</kbd> and <kbd>ArrowDown</kbd>. `loop: false` stops at the ends instead of wrapping round.

### Two toolbars on a page

`label` is what tells them apart. A screen reader announces "Formatting toolbar" and "Tools toolbar"; without a name, both are just "toolbar".

## API

### Toolbar

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The controls, and separators between groups of them. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Which arrows move focus, and the direction of the row. Read once, at setup. |
| `loop` | `boolean` | `true` | Wrap from the last control back to the first, and the other way. |
| `label` | `Reactive<string>` | — | The announced name (`aria-label`). |
| `class` | `Reactive<string>` | — | Merged into the bar's classes. |

### ToolbarButton

A [Button](/en/nebula/components/button) with a toolbar's defaults; it takes every `Button` prop.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The content: text, an icon, or both. |
| `variant` | `Reactive<'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link'>` | `'ghost'` | The look. |
| `size` | `Reactive<'default' \| 'sm' \| 'lg' \| 'icon'>` | `'sm'` | `icon` is a square sized for one glyph. |
| `type` | `Reactive<'button' \| 'submit' \| 'reset'>` | `'button'` | The native `type`. |
| `disabled` | `Reactive<boolean>` | `false` | Sets the native `disabled`. |
| `label` | `Reactive<string \| undefined>` | — | Sets `aria-label`. Required in practice for an icon alone. |
| `id` | `string` | — | The element's `id`. |
| `class` | `Reactive<string>` | — | Merged last, so a conflicting utility wins. |
| `onClick` | `(event: MouseEvent) => void` | — | Click handler. |

### ToolbarSeparator

| Prop | Type | Default | Description |
|---|---|---|---|
| `class` | `Reactive<string>` | — | Merged into the separator's classes (`mx-1 h-6`). |

A vertical rule, 24 px high, between two groups of controls.

## Accessibility

The bar is `role="toolbar"` with `aria-orientation` and the `label` as its `aria-label`. `ToolbarSeparator` is a real `role="separator"` with `aria-orientation="vertical"`, so a screen reader hears where one group of controls ends — unlike a decorative [Separator](/en/nebula/components/separator), which is silent.

The bar is one tab stop, and the arrows move inside it:

| Key | Action |
|---|---|
| <kbd>Tab</kbd> | Enters the bar on the control last reached with the arrows — the first, to begin with — then leaves it. |
| <kbd>ArrowRight</kbd> / <kbd>ArrowLeft</kbd> | Next / previous control, when horizontal. Mirrored in a right-to-left page. |
| <kbd>ArrowDown</kbd> / <kbd>ArrowUp</kbd> | Next / previous control, when vertical. |
| <kbd>Home</kbd> / <kbd>End</kbd> | First / last control. |

The arrows wrap at the ends unless `loop: false`. A key pressed with <kbd>Alt</kbd>, <kbd>Ctrl</kbd> or <kbd>Meta</kbd> is left to the browser. The direction is read from the page's computed style — see [right to left](/en/nebula/languages#right-to-left).
