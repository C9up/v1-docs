# What is narrower than shadcn

Every component in shadcn's registry has a counterpart here, and the ~40 simple ones are faithful down to the class strings, the variants and the ARIA attributes. The ones shadcn builds by wrapping a third-party library are reimplementations, and so narrower. Stated plainly, because "complete port" would not be true:

| Component | shadcn | nebula |
|---|---|---|
| [Chart](/en/nebula/components/chart) | Recharts, in full | line, area and bar over one categorical axis |
| [DataTable](/en/nebula/components/data-table) | TanStack Table (column grouping, virtualisation, pinning, faceted filters, server-side) | sort, filter, page, select — in memory |
| [Sidebar](/en/nebula/components/sidebar) | ~15 parts | the parts that are not re-skinned atoms |
| [Carousel](/en/nebula/components/carousel) | embla (loop, autoplay, N slides per view) | scroll-snap, one slide per view, no loop or autoplay |
| [Toaster](/en/nebula/components/toaster) | Base UI's manager (display priority, anchored toasts, typed payload) — or sonner, with six positions | five variants, promise toasts, update and dedup by id, action, `onClose`, pause on hover, four corners |
| [Resizable](/en/nebula/components/resizable) | arbitrary nesting, persisted layouts, collapse-to-zero | two panes, one handle |
| [Combobox](/en/nebula/components/combobox) | single, multi-select and creatable | single-select |
| [ScrollArea](/en/nebula/components/scroll-area) | scrollbars redrawn by Radix | native scrollbars, styled |
| [Calendar](/en/nebula/components/calendar) | react-day-picker, every selection mode | single date and range; no multi-month, no multi-select |
| [Questionnaire](/en/nebula/components/questionnaire) | branching logic, validation schemas | linear steps; single, multiple, freeform, skippable |

Two of shadcn's entries have no direct counterpart on purpose. `DirectionProvider` would be a second source of truth for what the computed style already says — see [right to left](/en/nebula/languages#right-to-left). `Form` has been folded into `Field` upstream; nebula ships both, with `Form` binding Aurora's own form controller.

**The Sidebar deserves its own note**, because porting it part-for-part would have fought the atomic taxonomy rather than following it. `SidebarInput`, `SidebarSeparator` and `SidebarMenuSkeleton` are the existing `Input`, `Separator` and `Skeleton` atoms with a prefix — redeclaring them would break the composition rule the whole library is organised on. `SidebarProvider` is React context, and nebula's sidebar owns its own shared signal instead. `SidebarInset` is the content column beside the rail, which is `AppShell`, a template. What was genuinely missing and has been added: `SidebarMenuSub`, `SidebarMenuSubItem`, `SidebarMenuAction`, a badge slot, and tooltips when the rail is collapsed.

Some components go the other way and have no shadcn counterpart at all: [PieceMap](/en/nebula/components/piece-map), [Image](/en/nebula/components/image) and [Picture](/en/nebula/components/picture).
