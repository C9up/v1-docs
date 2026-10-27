# Nebula — the component set

`@c9up/nebula` ports the shadcn/ui set onto [Aurora](/en/modules/aurora), organised as atomic design: the same markup, the same classes, the same behaviour, written for a runtime with no build step.

A nebula is the matter stars are born from — this one is the matter interfaces are born from. Seventy-five components across four layers, plus the headless behaviour layer Radix would otherwise provide.

::: warning Not to be confused
The cache package was called Nebula for a while before it became [Echo](/en/modules/echo). That name now means this package, and nothing else.
:::

## Two ways to use it

```ts
// Import it — quickest to try
import { Button, Card, CardHeader } from '@c9up/nebula'

// Or take the source — what the library is really for
// $ ream nebula:add button card
import { Button } from '#pages/atoms/Button.js'
```

`ream nebula:add` copies the component's source into your project and hands it over. No version, no upgrade path, no wrapper to fight when a design needs one class changed. [Owning the source](/en/nebula/owning-the-source) covers what that costs and how `ream nebula:diff` keeps it honest.

## Where to start

- [Installation](/en/nebula/installation) — `ream add`, the CSS engine, what nebula does without any runtime dependency.
- [Owning the source](/en/nebula/owning-the-source) — `nebula:add`, `nebula:list`, `nebula:diff`.
- [Composition and reactivity](/en/nebula/composition) — compound parts, `Parts` thunks, `Reactive<T>` props, no `asChild`.
- [Languages and direction](/en/nebula/languages) — every built-in label as a prop, right-to-left placement.
- [What is narrower than shadcn](/en/nebula/scope) — the reimplementations, stated plainly.

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

## Components

### Atoms (22)

[AccessibleIcon](/en/nebula/components/accessible-icon) ·
[AspectRatio](/en/nebula/components/aspect-ratio) ·
[Avatar](/en/nebula/components/avatar) ·
[Badge](/en/nebula/components/badge) ·
[Button](/en/nebula/components/button) ·
[Checkbox](/en/nebula/components/checkbox) ·
[Image](/en/nebula/components/image) ·
[Input](/en/nebula/components/input) ·
[Kbd](/en/nebula/components/kbd) ·
[Label](/en/nebula/components/label) ·
[Marker](/en/nebula/components/marker) ·
[NativeSelect](/en/nebula/components/native-select) ·
[Progress](/en/nebula/components/progress) ·
[ScrollArea](/en/nebula/components/scroll-area) ·
[Separator](/en/nebula/components/separator) ·
[Skeleton](/en/nebula/components/skeleton) ·
[Slider](/en/nebula/components/slider) ·
[Spinner](/en/nebula/components/spinner) ·
[Switch](/en/nebula/components/switch) ·
[Textarea](/en/nebula/components/textarea) ·
[Toggle](/en/nebula/components/toggle) ·
[VisuallyHidden](/en/nebula/components/visually-hidden)

### Molecules (24)

[Accordion](/en/nebula/components/accordion) ·
[Alert](/en/nebula/components/alert) ·
[Attachment](/en/nebula/components/attachment) ·
[Breadcrumb](/en/nebula/components/breadcrumb) ·
[Bubble](/en/nebula/components/bubble) ·
[ButtonGroup](/en/nebula/components/button-group) ·
[Card](/en/nebula/components/card) ·
[Collapsible](/en/nebula/components/collapsible) ·
[Empty](/en/nebula/components/empty) ·
[Field](/en/nebula/components/field) ·
[InputGroup](/en/nebula/components/input-group) ·
[InputOTP](/en/nebula/components/input-otp) ·
[Item](/en/nebula/components/item) ·
[Message](/en/nebula/components/message) ·
[Pagination](/en/nebula/components/pagination) ·
[Picture](/en/nebula/components/picture) ·
[PieceMap](/en/nebula/components/piece-map) ·
[RadioGroup](/en/nebula/components/radio-group) ·
[Resizable](/en/nebula/components/resizable) ·
[Table](/en/nebula/components/table) ·
[Tabs](/en/nebula/components/tabs) ·
[ToggleGroup](/en/nebula/components/toggle-group) ·
[Toolbar](/en/nebula/components/toolbar) ·
[Typography](/en/nebula/components/typography)

### Organisms (26)

[AlertDialog](/en/nebula/components/alert-dialog) ·
[Calendar](/en/nebula/components/calendar) ·
[Carousel](/en/nebula/components/carousel) ·
[Chart](/en/nebula/components/chart) ·
[Combobox](/en/nebula/components/combobox) ·
[Command](/en/nebula/components/command) ·
[CommandDialog](/en/nebula/components/command-dialog) ·
[ContextMenu](/en/nebula/components/context-menu) ·
[DataTable](/en/nebula/components/data-table) ·
[DatePicker](/en/nebula/components/date-picker) ·
[DateRangePicker](/en/nebula/components/date-range-picker) ·
[Dialog](/en/nebula/components/dialog) ·
[Drawer](/en/nebula/components/drawer) ·
[DropdownMenu](/en/nebula/components/dropdown-menu) ·
[Form](/en/nebula/components/form) ·
[HoverCard](/en/nebula/components/hover-card) ·
[Menubar](/en/nebula/components/menubar) ·
[MessageScroller](/en/nebula/components/message-scroller) ·
[NavigationMenu](/en/nebula/components/navigation-menu) ·
[Popover](/en/nebula/components/popover) ·
[Questionnaire](/en/nebula/components/questionnaire) ·
[Select](/en/nebula/components/select) ·
[Sheet](/en/nebula/components/sheet) ·
[Sidebar](/en/nebula/components/sidebar) ·
[Toaster](/en/nebula/components/toaster) ·
[Tooltip](/en/nebula/components/tooltip)

### Templates (3)

[AppShell](/en/nebula/components/app-shell) ·
[AuthLayout](/en/nebula/components/auth-layout) ·
[SettingsLayout](/en/nebula/components/settings-layout)
