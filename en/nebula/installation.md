# Installation

```sh
ream add @c9up/nebula --adapter tailwind
```

The `configure()` hook writes `config/nebula.ts` and the stylesheet for the engine you picked, then prints the packages to install and the build command to register. It installs nothing itself and edits no `package.json` of yours.

Changing the engine later: `ream configure @c9up/nebula --adapter unocss`.

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

A CSS engine with a different authoring model — Panda's recipes, StyleX — cannot go behind this interface: it would need a second version of every component.

## Zero runtime dependencies

shadcn stands on Radix, `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `@floating-ui/dom`, `cmdk`, `sonner`, `recharts`, `@tanstack/react-table` and `react-day-picker`. None are agnostic of the rendering framework.

| What shadcn installs | What nebula does |
|---|---|
| `clsx` + `tailwind-merge` | `cn`, already written from scratch in [Aurora](/en/modules/aurora) |
| `class-variance-authority` | `lib/cva.ts`, reimplemented, running its result through `cn` |
| Radix UI | `primitives/` — focus trap, dismissable layers, roving focus, type-ahead, presence, portals |
| `@floating-ui/dom` | `primitives/floating.ts` — offset, flip, shift, arrow, available height |
| `lucide-react` | `lib/icons.ts` — the glyphs the set needs, inlined |
| `cmdk` | `organisms/Command.ts` |
| `sonner` | `organisms/Toaster.ts` |
| `react-day-picker` + `date-fns` | `organisms/Calendar.ts` — `Date` and `Intl` |
| `@tanstack/react-table` | `organisms/DataTable.ts` — sort, filter, page, select |
| `recharts` | `organisms/Chart.ts` — line, area and bar, as inline SVG |
| `react-hook-form` | Aurora's `form()`, bound by `organisms/Form.ts` |

Several of these are **narrower** than what they replace. [The exact list](/en/nebula/scope) is stated, rather than a reassuring summary.

**Animations are the exception, and deliberately so.** Overlays use shadcn's own
class strings — `animate-in`, `fade-out-0`, `zoom-in-95`, `slide-in-from-right`
— which come from `tw-animate-css` under Tailwind and `unocss-preset-animations`
under UnoCSS. The generated stylesheet imports it and `configure()` lists it
among the packages to install.

Reimplementing them was tried and is what made a missing stylesheet dangerous
rather than merely plain: bespoke keyframes referenced through an arbitrary
animation value (`animate-[nebula-zoom-out_120ms]`) compile whether or not the
keyframes exist, so an app that skipped the stylesheet had overlays that never
finished closing — they stayed in the document, invisible, swallowing clicks.
A theme-registered utility is simply not emitted when its theme is absent, so
the same mistake produces no animation and an instant close.
