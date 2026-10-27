# Accordion

A stack of sections, each a header that shows or hides the panel under it. One section open at a time by default, several with `type: 'multiple'`.

Choosing one section means closing the others, so the accordion has to know every section at once. The group owns the set of open values and each item asks whether it is in it — that is what the context carries, and why the items are built inside the accordion's `() =>`. Each item then provides a context of its own, so its trigger and its panel share their ids without the value being repeated on each.

The panel animates with a CSS grid whose single row goes from `0fr` to `1fr`: no measured height, nothing stale when the content changes while closed. A closed panel stays in the DOM for that transition, and is made `inert` so it holds no tab stops.

```sh
ream nebula:add accordion
```

Molecule · `molecules/Accordion.ts` · no dependencies

## Usage

```ts
import { html } from '@c9up/aurora'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@c9up/nebula'

Accordion({
  children: () => html`
    ${AccordionItem({ value: 'shipping', children: () => html`
      ${AccordionTrigger({ children: 'Shipping' })}
      ${AccordionContent({ children: 'Two to four working days.' })}
    ` })}
    ${AccordionItem({ value: 'returns', children: () => html`
      ${AccordionTrigger({ children: 'Returns' })}
      ${AccordionContent({ children: 'Thirty days, in the original packaging.' })}
    ` })}
  `,
})
```

Both `Accordion` and `AccordionItem` take their children as `() =>`: each provides a context its parts read — see [composition](/en/nebula/composition).

## Examples

### From data

`faqs` is a signal. The thunk runs once, so the list goes in an accessor inside it: a question added later gets its section, and the items built there still reach the accordion — see [composition](/en/nebula/composition).

```ts
Accordion({
  children: () => html`${() =>
    faqs().map((faq) =>
      AccordionItem({
        value: faq.id,
        children: () => html`
          ${AccordionTrigger({ children: faq.question })}
          ${AccordionContent({ children: faq.answer })}
        `,
      }),
    )}`,
})
```

`value` is the section's key in the open set: keep it stable, an id rather than a position.

### Several open at once

```ts
Accordion({
  type: 'multiple',
  defaultValue: ['shipping', 'returns'],
  onValueChange: (open) => rememberOpen(open),
  children: () => html`
    ${AccordionItem({ value: 'shipping', children: () => html`
      ${AccordionTrigger({ children: 'Shipping' })}
      ${AccordionContent({ children: 'Two to four working days.' })}
    ` })}
    ${AccordionItem({ value: 'returns', children: () => html`
      ${AccordionTrigger({ children: 'Returns' })}
      ${AccordionContent({ children: 'Thirty days, in the original packaging.' })}
    ` })}
  `,
})
```

In `multiple` mode each section opens and closes on its own. `onValueChange` receives the whole open set after every change, in both modes — `[]` when everything is closed.

### One section always open

A single accordion can normally be closed entirely: clicking the open header closes it. `collapsible: false` keeps the last open section open, for a panel where one section must always be showing:

```ts
Accordion({
  collapsible: false,
  defaultValue: 'plan',
  children: () => html`
    ${AccordionItem({ value: 'plan', children: () => html`
      ${AccordionTrigger({ children: 'Plan' })}
      ${AccordionContent({ children: 'Pro, billed yearly.' })}
    ` })}
    ${AccordionItem({ value: 'billing', children: () => html`
      ${AccordionTrigger({ children: 'Billing' })}
      ${AccordionContent({ children: 'Next invoice on 1 March.' })}
    ` })}
  `,
})
```

Give it a `defaultValue` too: `collapsible: false` only stops a section from closing, it does not open one.

### A disabled section

```ts
Accordion({
  children: () => html`
    ${AccordionItem({ value: 'profile', children: () => html`
      ${AccordionTrigger({ children: 'Profile' })}
      ${AccordionContent({ children: 'Name, photo and bio.' })}
    ` })}
    ${AccordionItem({ value: 'export', disabled: true, children: () => html`
      ${AccordionTrigger({ children: 'Export (Pro plan)' })}
      ${AccordionContent({ children: 'CSV and JSON exports.' })}
    ` })}
  `,
})
```

The header stays visible and dimmed; it cannot be clicked and the arrow keys pass over it.

## API

### Accordion

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Parts` | — | The `AccordionItem`s, built in `() =>`. |
| `type` | `'single' \| 'multiple'` | `'single'` | `'single'` closes the open section when another opens. Read once, at setup. |
| `defaultValue` | `string \| readonly string[]` | — | Open at first render: one value, or several for `'multiple'`. Nothing is open without it. |
| `collapsible` | `boolean` | `true` | In `'single'` mode, whether the open section can be closed, leaving none open. |
| `onValueChange` | `(open: readonly string[]) => void` | — | The open set after each change. |
| `class` | `Reactive<string>` | — | Merged into the root's classes. |

The open set lives in the accordion: there is no controlled `value`. `onValueChange` is how the app learns what is open.

### AccordionItem

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | The section's stable key, in the open set and in its ARIA ids. |
| `disabled` | `boolean` | `false` | Disables the header. |
| `class` | `Reactive<string>` | — | Merged into the item's classes. |
| `children` | `Parts` | — | The `AccordionTrigger` and `AccordionContent`, built in `() =>`. |

### AccordionTrigger

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The header's text. A chevron is added after it and turns when the section opens. |
| `class` | `Reactive<string>` | — | Merged into the button's classes. |

### AccordionContent

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Slot` | — | The panel's content. |
| `class` | `Reactive<string>` | — | Merged into the inner box that holds the content (`pt-0 pb-4`), not the animated wrapper. |

## Accessibility

Each header is a `<button>` inside an `<h3>`, with `aria-expanded` and `aria-controls` pointing at its panel; the panel is `role="region"` with `aria-labelledby` pointing back at the header. A closed panel is `inert`: out of the tab order and the accessibility tree while it stays in the DOM. The transition is dropped under `prefers-reduced-motion`. `data-state="open"` or `"closed"` is set on the item, the header and the panel for styling.

The headers are one tab stop, and the arrows move between them:

| Key | Action |
|---|---|
| <kbd>Tab</kbd> | Enters the headers on the one last reached with the arrows — the first, to begin with — then leaves them. |
| <kbd>ArrowDown</kbd> | Next header, wrapping from the last to the first. |
| <kbd>ArrowUp</kbd> | Previous header, wrapping from the first to the last. |
| <kbd>Home</kbd> | First header. |
| <kbd>End</kbd> | Last header. |

Disabled headers are skipped.
