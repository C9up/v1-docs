# Nebula — the component set

`@c9up/nebula` ports the shadcn/ui set onto [Aurora](/en/modules/aurora), organised as atomic design: the same markup, the same classes, the same behaviour, written for a runtime with no build step.

A nebula is the matter stars are born from — this one is the matter interfaces are born from. Sixty-nine components across four layers, plus the headless behaviour layer Radix would otherwise provide.

::: warning Not to be confused
The cache package was called Nebula for a while before it became [Echo](/en/modules/echo). That name now means this package, and nothing else.
:::

## Install

```sh
ream add @c9up/nebula --adapter tailwind
```

The `configure()` hook writes `config/nebula.ts` and the stylesheet for the engine you picked, then prints the packages to install and the build command to register. It installs nothing itself and edits no `package.json` of yours.

Changing the engine later: `ream configure @c9up/nebula --adapter unocss`.

## Two ways to use it

```ts
// Import it — quickest to try
import { Button, Card, CardHeader } from '@c9up/nebula'

// Or take the source — what the library is really for
// $ ream nebula:add button card
import { Button } from '#pages/atoms/Button.js'
```

`ream nebula:add` copies the component's source into your project and hands it over. No version, no upgrade path, no wrapper to fight when a design needs one class changed.

The bill for that premise is that a fix released here never reaches a project on its own, and nothing reports it — the files are local, no lockfile mentions them, `pnpm update` does not touch them. `ream nebula:diff` is where that becomes visible. It records the hash of what it copied, so it can separate a change you made from one you have not seen:

| State | What it means |
|---|---|
| `edited` | yours, needs nothing |
| `outdated` | the package moved, your copy did not — re-copying loses nothing |
| `conflict` | both moved |
| `unknown` | copied before the record existed — no way to tell which side moved |

```sh
ream nebula:list                    # everything in the registry
ream nebula:list --layer organisms
ream nebula:add dialog data-table   # both, plus what they depend on
ream nebula:diff                    # which copies the package has since changed
ream nebula:add button --force      # overwrite your edited copy
```

These commands ship with the package and are registered in `reamrc.commands` by `configure()` — the channel provided for exactly this, which directory discovery cannot see. Nothing is compiled into the `ream` binary, so a new nebula command never waits on a release of it.

**JavaScript by default.** An Aurora app serves `resources/pages` to the browser unbuilt — that is the runtime's premise — so TypeScript dropped into that tree does not run. `ream nebula:add` copies the compiled output: valid ESM, `.js` specifiers already correct, every doc comment intact. The language is inferred from what your components directory already holds; `--ts` and `--js` override it.

Copies mirror the package's own layout, so `atoms/Button` finds `../lib/cva.js` for the same reason it does inside nebula. **No import is ever rewritten** — that is where a copy-the-source CLI usually accumulates its edge cases.

## Zero runtime dependencies

shadcn stands on Radix, `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `@floating-ui/dom`, `cmdk`, `sonner`, `recharts`, `@tanstack/react-table` and `react-day-picker`. None are agnostic of the rendering framework.

| What shadcn installs | What nebula does |
|---|---|
| `clsx` + `tailwind-merge` | `cn`, already written from scratch in [Aurora](/en/modules/aurora) |
| `class-variance-authority` | `lib/cva.ts`, reimplemented, running its result through `cn` |
| Radix UI | `primitives/` — focus trap, dismissable layers, roving focus, type-ahead, presence, portals |
| `@floating-ui/dom` | `primitives/floating.ts` — offset, flip, shift, arrow, available height |
| `lucide-react` | `lib/icons.ts` — the eighteen glyphs the set needs, inlined |
| `cmdk` | `organisms/Command.ts` |
| `sonner` | `organisms/Toaster.ts` |
| `react-day-picker` + `date-fns` | `organisms/Calendar.ts` — `Date` and `Intl` |
| `@tanstack/react-table` | `organisms/DataTable.ts` — sort, filter, page, select |
| `recharts` | `organisms/Chart.ts` — line, area and bar, as inline SVG |
| `react-hook-form` | Aurora's `form()`, bound by `organisms/Form.ts` |

Several of these are **narrower** than what they replace. The exact list is below, rather than a reassuring summary.

## Choose your CSS engine

nebula declares **no CSS dependency at all**, not even a peer one. You install the engine you want, `config/nebula.ts` names it, nebula generates the matching files and build command.

```ts
// config/nebula.ts
import { defineConfig } from '@c9up/nebula'

export default defineConfig({
  adapter: 'tailwind',              // 'tailwind' | 'unocss' | 'css'
  paths: {
    components: 'resources/pages',
    css: 'resources/css/app.css',
    output: 'public/app.css',
  },
})
```

| Adapter | What it does | You install |
|---|---|---|
| `tailwind` | Tailwind v4, configured in CSS. What shadcn itself targets. | `tailwindcss @tailwindcss/cli` |
| `unocss` | `presetWind4` — same class syntax, no PostCSS, faster. | `unocss @unocss/cli` |
| `css` | Nothing. nebula ships a prebuilt stylesheet. | — |

All three consume the same class names, which is what lets one set of components serve all of them. See also [Tailwind CSS](/en/modules/tailwind).

**The `css` adapter's limit, stated plainly.** `nebula.css` is compiled at release time and covers the components as published. Edit a copied component to add a utility nebula never used and nothing emits it — the class silently does nothing. Use it when you take the components as they are; use `tailwind` or `unocss` when you intend to retune them.

## Atomic design

shadcn is a flat `ui/` directory. nebula sorts the same components into layers, and the layer is a property of the component: `nebula:add button` knows Button is an atom.

```
resources/pages/
├── lib/          cn, cva, icons, ids, reactive props
├── primitives/   the headless layer — focus, dismissal, placement, presence
├── atoms/        one element, composing nothing from nebula
├── molecules/    assembles atoms, or owns state across several elements
├── organisms/    portals, traps focus, floats, or coordinates molecules
└── templates/    page skeletons
```

The rule is composition, not complexity. Slider is an atom though it is interactive, because it is one input. Card is a molecule though it is trivial, because it assembles parts.

**atoms (19)** — AspectRatio, Avatar, Badge, Button, Checkbox, Input, Kbd, Label, Marker, NativeSelect, Progress, ScrollArea, Separator, Skeleton, Slider, Spinner, Switch, Textarea, Toggle

**molecules (21)** — Accordion, Alert, Attachment, Breadcrumb, Bubble, ButtonGroup, Card, Collapsible, Empty, Field, InputGroup, InputOTP, Item, Message, Pagination, RadioGroup, Resizable, Table, Tabs, ToggleGroup, Typography

**organisms (26)** — AlertDialog, Calendar, Carousel, Chart, Combobox, Command, CommandDialog, ContextMenu, DataTable, DatePicker, DateRangePicker, Dialog, Drawer, DropdownMenu, Form, HoverCard, Menubar, MessageScroller, NavigationMenu, Popover, Questionnaire, Select, Sheet, Sidebar, Toaster, Tooltip

**templates (3)** — AppShell, AuthLayout, SettingsLayout

## Composing without context

Aurora has no context, and the workarounds — a factory returning bound parts, a handle threaded through props — are more machinery for less clarity. So compound components take **data**:

```ts
Tabs({
  defaultValue: 'account',
  items: [
    { value: 'account', label: 'Account', content: html`…` },
    { value: 'password', label: 'Password', content: html`…` },
  ],
})
```

The rendered markup is unchanged, so shadcn's CSS and its examples still read across. Free-form containers take named slots instead:

```ts
Dialog({
  trigger: 'Edit profile',
  title: 'Edit profile',
  children: [TextField({ bind: bind(profile, 'name'), label: 'Name' })],
  footer: SubmitButton({ form: profile, label: 'Save' }),
})
```

There is no `asChild`: that API clones an element to merge props into it, and an Aurora template is compiled markup with nothing to clone. Where shadcn would write a button wrapping a link, nebula exports the variants:

```ts
html`<a href="/docs" class="${buttonVariants({ variant: 'outline' })}">Docs</a>`
```

## Reactive props

Aurora never re-renders. Any prop that can change is `Reactive<T>` — pass a constant when it never moves, an accessor when it does:

```ts
Button({ disabled: true })              // static
Button({ disabled: () => !form.valid }) // tracked
```

## Right to left

The placement engine mirrors itself. Placements are written physically — `"right-start"` for a submenu — because that is what reads clearly at the call site, and `resolvePosition` flips them when the anchor computes to `direction: rtl`. `autoPosition` reads that off the anchor on every update, so no component passes a flag and a language switcher flipped mid-session moves open surfaces with it.

The mirror is not symmetric, which is the part worth knowing: for `left`/`right` the *side* swaps and the alignment is untouched; for `top`/`bottom` the side stays and the *alignment* swaps. Mirroring both halves of `bottom-start` would land it back where it started.

Components use logical properties (`ms-*`, `me-*`, `start-*`, `end-*`) wherever a side is meant relative to the text. Where a side is a genuine layout choice — which edge a `Sheet` enters from, which side a `Sidebar` occupies — it stays physical, because that is what the caller means.

## What is narrower than shadcn

Every component in shadcn's registry has a counterpart here, and the ~40 simple ones are faithful down to the class strings, the variants and the ARIA attributes. The ones shadcn builds by wrapping a third-party library are reimplementations, and so narrower. Stated plainly, because "complete port" would not be true:

| Component | shadcn | nebula |
|---|---|---|
| Chart | Recharts, in full | line, area and bar over one categorical axis |
| DataTable | TanStack Table (column grouping, virtualisation, pinning, faceted filters, server-side) | sort, filter, page, select — in memory |
| Sidebar | ~15 parts | the parts that are not re-skinned atoms |
| Carousel | embla (loop, autoplay, N slides per view) | scroll-snap, one slide per view, no loop or autoplay |
| Toaster | sonner (promise toasts, arbitrary content, multiple positions) | four variants, action, pause on hover |
| Resizable | arbitrary nesting, persisted layouts, collapse-to-zero | two panes, one handle |
| Combobox | single, multi-select and creatable | single-select |
| ScrollArea | scrollbars redrawn by Radix | native scrollbars, styled |
| Calendar | react-day-picker, every selection mode | single date and range; no multi-month, no multi-select |
| Questionnaire | branching logic, validation schemas | linear steps; single, multiple, freeform, skippable |

Two of shadcn's entries have no direct counterpart on purpose. `DirectionProvider` is React context; Aurora has none, and the direction belongs on `<html dir>` — what it was really buying is right-to-left support, handled in the placement engine instead. `Form` has been folded into `Field` upstream; nebula ships both, with `Form` binding Aurora's own form controller.

**The Sidebar deserves its own note**, because porting it part-for-part would have fought the atomic taxonomy rather than following it. `SidebarInput`, `SidebarSeparator` and `SidebarMenuSkeleton` are the existing `Input`, `Separator` and `Skeleton` atoms with a prefix — redeclaring them would break the composition rule the whole library is organised on. `SidebarProvider` is React context, and nebula's sidebar owns its own shared signal instead. `SidebarInset` is the content column beside the rail, which is `AppShell`, a template. What was genuinely missing and has been added: `SidebarMenuSub`, `SidebarMenuSubItem`, `SidebarMenuAction`, a badge slot, and tooltips when the rail is collapsed.

A CSS engine with a different authoring model — Panda's recipes, StyleX — cannot go behind this interface: it would need a second version of every component.
