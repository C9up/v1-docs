# Tailwind CSS

Tailwind is not shipped as a Ream package. Like in AdonisJS, you wire it into your project through Vite — Photon already owns the Vite stack, so the integration is two steps.

## Install

```sh
pnpm add -D tailwindcss @tailwindcss/vite
```

## Wire it into Vite

Add `@tailwindcss/vite` to the `plugins[]` of your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    // ...your Photon / framework plugins
  ],
})
```

## Import Tailwind in your CSS entry

```css
/* resources/css/app.css */
@import "tailwindcss";
```

That's it. No framework configuration command, no plugin to register on the Ream side. The Tailwind dev server picks up class usage from your TSX/JSX/HTML automatically.

Reference: [Tailwind CSS — Install with AdonisJS](https://tailwindcss.com/docs/installation/framework-guides/adonisjs) (the same Vite-based flow Ream mirrors via Photon).

## About `@c9up/tailwind`

A `@c9up/tailwind` stub package used to live in the workspace; it scaffolded `tailwind.config.ts` + `postcss.config.js` + an `app.css` entry via `ream configure @c9up/tailwind`. It was never published to npm, was retired on 2026-05-01 (Epic 41.1, decision: Kill), and the workspace folder was deleted on 2026-05-01 (Epic 41.5). There is no replacement Ream package — the recipe above is the canonical Tailwind-in-Ream setup.

Reasoning: AdonisJS ships no `@adonisjs/tailwind`, the Adonis ↔ Tailwind path is `@adonisjs/vite` + `@tailwindcss/vite`, and Photon already covers the Vite side. A framework-owned stub adds no value over the recipe above. Full survey + decision frame: `_bmad-output/planning-artifacts/architecture.md` → "Tailwind integration decision (Epic 41.1)".
