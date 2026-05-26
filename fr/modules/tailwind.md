# Tailwind CSS

Tailwind n'est pas livré comme package Ream. Comme dans AdonisJS, il se branche dans votre projet via Vite — Photon possède déjà le stack Vite, donc l'intégration tient en deux étapes.

## Installation

```sh
pnpm add -D tailwindcss @tailwindcss/vite
```

## Brancher dans Vite

Ajoutez `@tailwindcss/vite` aux `plugins[]` de votre `vite.config.ts` :

```typescript
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    // ...vos plugins Photon / framework
  ],
})
```

## Importer Tailwind depuis votre entrée CSS

```css
/* resources/css/app.css */
@import "tailwindcss";
```

C'est tout. Aucune commande de configuration framework, aucun plugin à enregistrer côté Ream. Le dev server Tailwind récupère automatiquement les classes utilisées dans vos TSX/JSX/HTML.

Référence : [Tailwind CSS — Install with AdonisJS](https://tailwindcss.com/docs/installation/framework-guides/adonisjs) (le même flow Vite que Ream reflète via Photon).

## À propos de `@c9up/tailwind`

Un package stub `@c9up/tailwind` existait dans le workspace ; il scaffoldait `tailwind.config.ts` + `postcss.config.js` + une entrée `app.css` via `ream configure @c9up/tailwind`. Il n'a jamais été publié sur npm, a été retiré le 2026-05-01 (Epic 41.1, décision : Kill), puis le dossier workspace a été supprimé le 2026-05-01 (Epic 41.5). Il n'y a pas de package Ream de remplacement — la recette ci-dessus est l'installation canonique de Tailwind dans Ream.

Raison : AdonisJS ne ship aucun `@adonisjs/tailwind`, le chemin Adonis ↔ Tailwind c'est `@adonisjs/vite` + `@tailwindcss/vite`, et Photon couvre déjà le côté Vite. Un stub possédé par le framework n'apporte rien de plus que la recette ci-dessus. Survey complet + frame de décision : `_bmad-output/planning-artifacts/architecture.md` → "Tailwind integration decision (Epic 41.1)".
