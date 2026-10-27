# Languages and direction

## Labels in your language

Every text a component writes on its own can be replaced, and most are read only by a screen reader: a close cross, a page arrow, a landmark's name. Left in English, a screen reader switches language in the middle of a French page for exactly the users who cannot see it. Each one is a prop whose default is the English upstream writes:

| Component | Props |
|---|---|
| `DialogContent`, `SheetContent`, `Sidebar` (mobile sheet) | `closeLabel` |
| `DialogFooter` (`showCloseButton`) | `closeLabel` |
| `SidebarTrigger`, `SidebarRail` | `label` |
| `Pagination`, `Breadcrumb` | `aria-label` |
| `PaginationPrevious`, `PaginationNext` | `aria-label`, and `children` for the visible word — the arrow stays |
| `PaginationEllipsis`, `BreadcrumbEllipsis` | `label` |
| `DataTable` | `selectAllLabel`, `selectRowLabel(row)`, `paginationLabels`, `filterLabel` |
| `Calendar` | `labels: { previousMonth, nextMonth }` |
| `DatePicker`, `DateRangePicker` | `labels: { dialog, previousMonth, nextMonth }` |
| `Carousel` | `label`, `roleDescription` |
| `CarouselItem` | `roleDescription`, `label(position, count)` |
| `CarouselPrevious`, `CarouselNext` | `label` |
| `InputOTP` | `slotLabel(position, length)` |
| `ResizableHandle` | `label` |
| `Questionnaire` | `progressLabel`, `counterLabel(position, total)` |
| `SettingsLayout` | `navLabel` |
| `Toaster` | `closeButtonAriaLabel` |
| `Sidebar` (desktop landmark and mobile sheet title) | `label` |
| `Spinner` | `label` (`"Loading"`) |
| `Bubble` | `expandLabel`, `collapseLabel` |
| `MessageScroller` | `label`, `jumpLabel` |
| `Questionnaire` (buttons) | `backLabel`, `nextLabel`, `skipLabel`, `submitLabel` |
| `SelectTrigger` | `label`, or an `id` a `FieldLabel` points at |

Month and weekday names need none of this: `Calendar` formats them with `Intl` in its `locale`. Labels are props rather than a setting given once, because a server rendering pages for two visitors in two languages has no single setting to give.

## Right to left

There is no `DirectionProvider`. The direction is already on the page — `<html dir="rtl">`, a `dir` attribute on one panel, a stylesheet setting `direction` — and every one of them is answered by the computed style. A provider would be a second source of truth that silently disagrees with the first, so nebula reads the computed style wherever it needs to know which way is forward. The left and right arrows of `Tabs`, `Toolbar` and `Accordion` follow it, and the native controls — a `RadioGroup`, a `Slider` — are mirrored by the browser itself. Not yet: the submenu and menubar arrows, `Calendar`, `InputOTP` and `Carousel` read <kbd>ArrowLeft</kbd> and <kbd>ArrowRight</kbd> physically.

The placement engine mirrors itself the same way. Placements are written physically — `"right-start"` for a submenu — because that is what reads clearly at the call site, and `resolvePosition` flips them when the anchor computes to `direction: rtl`. `autoPosition` reads that off the anchor on every update, so no component passes a flag and a language switcher flipped mid-session moves open surfaces with it.

The mirror is not symmetric, which is the part worth knowing: for `left`/`right` the *side* swaps and the alignment is untouched; for `top`/`bottom` the side stays and the *alignment* swaps. Mirroring both halves of `bottom-start` would land it back where it started.

Components use logical properties (`ms-*`, `me-*`, `start-*`, `end-*`) wherever a side is meant relative to the text. Where a side is a genuine layout choice — which edge a `Sheet` enters from, which side a `Sidebar` occupies — it stays physical, because that is what the caller means.
