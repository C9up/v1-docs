# Composition and reactivity

Two rules shape every call in nebula: compound components are assembled from **parts built inside a thunk**, and anything that can change is passed as an **accessor**. Both follow from the same fact about [Aurora](/en/modules/aurora) — a component runs its setup once and never re-renders.

## Compound components take their parts in a thunk

A compound component — `Tabs`, `Dialog`, `Select`, `DropdownMenu` — shares its state with its parts through Aurora's context, the way shadcn's parts share it through React's. The parts are the same, with the same names and the same markup:

```ts
import { html } from '@c9up/aurora'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@c9up/nebula'

Tabs({
  defaultValue: 'account',
  children: () => html`
    ${TabsList({ children: () => html`
      ${TabsTrigger({ value: 'account', children: 'Account' })}
      ${TabsTrigger({ value: 'password', children: 'Password' })}
    ` })}
    ${TabsContent({ value: 'account', children: 'Your profile.' })}
    ${TabsContent({ value: 'password', children: 'Change your password.' })}
  `,
})
```

The `() =>` is not decoration. Context reaches only what the provider builds **during its own setup**, and Aurora evaluates eagerly: a `TabsTrigger` built as a plain value would run before `Tabs` existed and find nothing to register with. A prop typed `Parts` is the signal — write `() =>` there, and a plain value everywhere else:

```ts
Tooltip({ children: TooltipTrigger({ … }) })       // ✗ built too early
Tooltip({ children: () => TooltipTrigger({ … }) }) // ✓ the setup calls it
```

The thunk is called **once**, during setup. What changes goes in an accessor inside it, and parts built there still reach their provider — Aurora calls the accessor with the providers it was written under:

```ts
SelectContent({
  children: () => html`${() => roles().map((role) => SelectItem({ value: role.id, children: role.name }))}`,
})
```

A role added to `roles` shows up in the list, a removed one leaves it and the keyboard, and the trigger keeps showing the chosen one's current name.

A part that has to be **known at setup** is the exception. `DialogTitle` names the panel, and the panel reads whether there is a title before it renders its children, so a title built later in an accessor leaves it unnamed:

```ts
DialogHeader({ children: html`${DialogTitle({ children: 'Edit profile' })}` })       // ✓ a value
DialogHeader({ children: () => html`${DialogTitle({ children: 'Edit profile' })}` }) // ✗ too late
```

Each component page says which of its props are `Parts`.

## Reactive props

Any prop that can change is `Reactive<T>` — pass a constant when it never moves, an accessor when it does:

```ts
Button({ disabled: true })              // static
Button({ disabled: () => !form.valid }) // tracked
```

A signal is an accessor, so it can be passed as it is: `Progress({ value: uploaded })`. What does **not** work is reading it yourself — `Button({ disabled: form.pending() })` hands the button a boolean that was true or false once, at setup, and never again.

Content follows the same rule. `children` typed `Slot` takes a value or an accessor; text that changes is an accessor:

```ts
Badge({ children: () => `${unread()} unread` })
```

Callbacks are the one kind of function prop that is not an accessor: `onClick`, `onValueChange`, `onOpenChange` have their own types and are called, never read.

## No `asChild`

shadcn's `asChild` clones an element to merge props into it, and an Aurora template is compiled markup with nothing to clone. Where shadcn would write a button wrapping a link, nebula exports the variants and you put them on the element yourself — which is what the Slot was doing anyway, with a runtime in between:

```ts
html`<a href="/docs" class="${buttonVariants({ variant: 'outline' })}">Docs</a>`
```

Every component with a visual variant exports its `…Variants` function for this: `buttonVariants`, `badgeVariants`, `toggleVariants`, `alertVariants`…

## Styling hooks

The parts a component renders carry a `data-slot` naming them — `data-slot="button"`, `data-slot="dialog-content"` — as shadcn v4 does. Host CSS and tests can target a part without depending on the utility classes, which are the part you are expected to edit. Every component also takes a `class`, merged last through `cn`, so a conflicting utility you pass wins over the component's own.
