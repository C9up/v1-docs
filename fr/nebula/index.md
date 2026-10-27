# Nebula — le jeu de composants

`@c9up/nebula` porte l'ensemble shadcn/ui sur [Aurora](/fr/modules/aurora), rangé en design atomique : même balisage, mêmes classes, même comportement, écrits pour un runtime sans étape de build.

Une nébuleuse est la matière d'où naissent les étoiles — celle-ci est la matière d'où naissent les interfaces. Soixante-quinze composants sur quatre couches, plus la couche de comportement sans habillage que Radix fournirait ailleurs.

::: warning Ne pas confondre
Le paquet cache s'est un temps appelé Nebula avant de devenir [Echo](/fr/modules/echo). Ce nom-là désigne aujourd'hui ce paquet-ci, et rien d'autre.
:::

## Deux façons de s'en servir

```ts
// L'importer — le plus rapide pour essayer
import { Button, Card, CardHeader } from '@c9up/nebula'

// Ou en prendre la source — ce à quoi la bibliothèque sert vraiment
// $ ream nebula:add button card
import { Button } from '#pages/atoms/Button.js'
```

`ream nebula:add` copie la source du composant dans votre projet et vous la remet. Pas de version, pas de chemin de mise à jour, pas d'emballage contre lequel se battre quand une maquette demande une classe changée. [Posséder la source](/fr/nebula/owning-the-source) dit ce que ça coûte et comment `ream nebula:diff` garde le tout honnête.

## Par où commencer

- [Installation](/fr/nebula/installation) — `ream add`, le moteur CSS, ce que nebula fait sans aucune dépendance à l'exécution.
- [Posséder la source](/fr/nebula/owning-the-source) — `nebula:add`, `nebula:list`, `nebula:diff`.
- [Composition et réactivité](/fr/nebula/composition) — parties composées, thunks `Parts`, props `Reactive<T>`, pas d'`asChild`.
- [Langues et sens de lecture](/fr/nebula/languages) — chaque libellé intégré en prop, placement de droite à gauche.
- [Ce qui est plus étroit que shadcn](/fr/nebula/scope) — les réimplémentations, dites franchement.

## Design atomique

shadcn est un répertoire `ui/` à plat. nebula trie les mêmes composants en couches, et la couche est une propriété du composant : `nebula:add button` sait que Button est un atome.

```
resources/pages/
├── lib/          cn, cva, icônes, identifiants, props réactives
├── primitives/   la couche sans habillage — focus, renvoi, placement, présence
├── atoms/        un élément, ne compose rien de nebula
├── molecules/    assemble des atomes, ou porte un état sur plusieurs éléments
├── organisms/    ouvre un portail, piège le focus, flotte, ou coordonne des molécules
└── templates/    squelettes de page
```

La règle est la composition, pas la complexité. Slider est un atome bien qu'interactif, parce que c'est une seule entrée. Card est une molécule bien que triviale, parce qu'elle assemble des parties.

## Composants

### Atomes (22)

[AccessibleIcon](/fr/nebula/components/accessible-icon) ·
[AspectRatio](/fr/nebula/components/aspect-ratio) ·
[Avatar](/fr/nebula/components/avatar) ·
[Badge](/fr/nebula/components/badge) ·
[Button](/fr/nebula/components/button) ·
[Checkbox](/fr/nebula/components/checkbox) ·
[Image](/fr/nebula/components/image) ·
[Input](/fr/nebula/components/input) ·
[Kbd](/fr/nebula/components/kbd) ·
[Label](/fr/nebula/components/label) ·
[Marker](/fr/nebula/components/marker) ·
[NativeSelect](/fr/nebula/components/native-select) ·
[Progress](/fr/nebula/components/progress) ·
[ScrollArea](/fr/nebula/components/scroll-area) ·
[Separator](/fr/nebula/components/separator) ·
[Skeleton](/fr/nebula/components/skeleton) ·
[Slider](/fr/nebula/components/slider) ·
[Spinner](/fr/nebula/components/spinner) ·
[Switch](/fr/nebula/components/switch) ·
[Textarea](/fr/nebula/components/textarea) ·
[Toggle](/fr/nebula/components/toggle) ·
[VisuallyHidden](/fr/nebula/components/visually-hidden)

### Molécules (24)

[Accordion](/fr/nebula/components/accordion) ·
[Alert](/fr/nebula/components/alert) ·
[Attachment](/fr/nebula/components/attachment) ·
[Breadcrumb](/fr/nebula/components/breadcrumb) ·
[Bubble](/fr/nebula/components/bubble) ·
[ButtonGroup](/fr/nebula/components/button-group) ·
[Card](/fr/nebula/components/card) ·
[Collapsible](/fr/nebula/components/collapsible) ·
[Empty](/fr/nebula/components/empty) ·
[Field](/fr/nebula/components/field) ·
[InputGroup](/fr/nebula/components/input-group) ·
[InputOTP](/fr/nebula/components/input-otp) ·
[Item](/fr/nebula/components/item) ·
[Message](/fr/nebula/components/message) ·
[Pagination](/fr/nebula/components/pagination) ·
[Picture](/fr/nebula/components/picture) ·
[PieceMap](/fr/nebula/components/piece-map) ·
[RadioGroup](/fr/nebula/components/radio-group) ·
[Resizable](/fr/nebula/components/resizable) ·
[Table](/fr/nebula/components/table) ·
[Tabs](/fr/nebula/components/tabs) ·
[ToggleGroup](/fr/nebula/components/toggle-group) ·
[Toolbar](/fr/nebula/components/toolbar) ·
[Typography](/fr/nebula/components/typography)

### Organismes (26)

[AlertDialog](/fr/nebula/components/alert-dialog) ·
[Calendar](/fr/nebula/components/calendar) ·
[Carousel](/fr/nebula/components/carousel) ·
[Chart](/fr/nebula/components/chart) ·
[Combobox](/fr/nebula/components/combobox) ·
[Command](/fr/nebula/components/command) ·
[CommandDialog](/fr/nebula/components/command-dialog) ·
[ContextMenu](/fr/nebula/components/context-menu) ·
[DataTable](/fr/nebula/components/data-table) ·
[DatePicker](/fr/nebula/components/date-picker) ·
[DateRangePicker](/fr/nebula/components/date-range-picker) ·
[Dialog](/fr/nebula/components/dialog) ·
[Drawer](/fr/nebula/components/drawer) ·
[DropdownMenu](/fr/nebula/components/dropdown-menu) ·
[Form](/fr/nebula/components/form) ·
[HoverCard](/fr/nebula/components/hover-card) ·
[Menubar](/fr/nebula/components/menubar) ·
[MessageScroller](/fr/nebula/components/message-scroller) ·
[NavigationMenu](/fr/nebula/components/navigation-menu) ·
[Popover](/fr/nebula/components/popover) ·
[Questionnaire](/fr/nebula/components/questionnaire) ·
[Select](/fr/nebula/components/select) ·
[Sheet](/fr/nebula/components/sheet) ·
[Sidebar](/fr/nebula/components/sidebar) ·
[Toaster](/fr/nebula/components/toaster) ·
[Tooltip](/fr/nebula/components/tooltip)

### Templates (3)

[AppShell](/fr/nebula/components/app-shell) ·
[AuthLayout](/fr/nebula/components/auth-layout) ·
[SettingsLayout](/fr/nebula/components/settings-layout)
