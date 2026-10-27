# Installation

```sh
ream add @c9up/nebula --adapter tailwind
```

Le hook `configure()` écrit `config/nebula.ts` et la feuille de style du moteur choisi, puis affiche les paquets à installer et la commande de build à enregistrer. Il n'installe rien lui-même et ne modifie aucun de vos `package.json`.

Changer de moteur plus tard : `ream configure @c9up/nebula --adapter unocss`.

## Choisir son moteur CSS

nebula ne déclare **aucune dépendance CSS**, pas même en pair. Vous installez le moteur voulu, `config/nebula.ts` le nomme, nebula produit les fichiers et la commande de build correspondants.

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

| Adaptateur | Ce qu'il fait | Ce que vous installez |
|---|---|---|
| `tailwind` | Tailwind v4, configuré en CSS. Ce que shadcn vise lui-même. | `tailwindcss @tailwindcss/cli` |
| `unocss` | `presetWind4` — même syntaxe de classes, sans PostCSS, plus rapide. | `unocss @unocss/cli` |
| `css` | Rien. nebula livre une feuille précompilée. | — |

Les trois consomment les mêmes noms de classes, ce qui permet à un seul jeu de composants de les servir tous. Voir aussi la page [Tailwind CSS](/fr/modules/tailwind).

**La limite de l'adaptateur `css`, dite franchement.** `nebula.css` est compilé au moment de la release et couvre les composants tels que publiés. Modifiez un composant copié pour y ajouter une utilitaire que nebula n'a jamais employée et rien ne l'émet : la classe ne fait silencieusement rien. Prenez-le quand vous prenez les composants tels quels ; prenez `tailwind` ou `unocss` quand vous comptez les retoucher.

Un moteur CSS au modèle d'écriture différent — les recettes de Panda, StyleX — ne peut pas passer derrière cette interface : il demanderait une seconde version de chaque composant.

## Aucune dépendance à l'exécution

shadcn s'appuie sur Radix, `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `@floating-ui/dom`, `cmdk`, `sonner`, `recharts`, `@tanstack/react-table` et `react-day-picker`. Aucun n'est agnostique du framework de rendu.

| Ce que shadcn installe | Ce que nebula fait |
|---|---|
| `clsx` + `tailwind-merge` | `cn`, déjà écrit à la main dans [Aurora](/fr/modules/aurora) |
| `class-variance-authority` | `lib/cva.ts`, réimplémenté, et il passe son résultat dans `cn` |
| Radix UI | `primitives/` — piège à focus, couches renvoyables, focus itinérant, saisie au clavier, présence, portails |
| `@floating-ui/dom` | `primitives/floating.ts` — décalage, retournement, glissement, flèche, hauteur disponible |
| `lucide-react` | `lib/icons.ts` — les glyphes dont le jeu a besoin, en ligne |
| `cmdk` | `organisms/Command.ts` |
| `sonner` | `organisms/Toaster.ts` |
| `react-day-picker` + `date-fns` | `organisms/Calendar.ts` — `Date` et `Intl` |
| `@tanstack/react-table` | `organisms/DataTable.ts` — tri, filtre, pagination, sélection |
| `recharts` | `organisms/Chart.ts` — courbe, aire et barres, en SVG en ligne |
| `react-hook-form` | `form()` d'Aurora, branché par `organisms/Form.ts` |

Plusieurs de ces reprises sont **plus étroites** que ce qu'elles remplacent. [La liste exacte](/fr/nebula/scope) est donnée, plutôt qu'un résumé rassurant.

**Les animations font exception, et c'est délibéré.** Les overlays utilisent les
chaînes de classes de shadcn elles-mêmes — `animate-in`, `fade-out-0`,
`zoom-in-95`, `slide-in-from-right` — qui viennent de `tw-animate-css` sous
Tailwind et de `unocss-preset-animations` sous UnoCSS. La feuille générée
l'importe, et `configure()` le liste parmi les paquets à installer.

Les réimplémenter a été essayé, et c'est ce qui rendait une feuille manquante
dangereuse plutôt que simplement dépouillée : des keyframes maison atteintes par
une valeur d'animation arbitraire (`animate-[nebula-zoom-out_120ms]`) sont
compilées que les keyframes existent ou non, donc une application qui sautait la
feuille avait des overlays qui ne finissaient jamais de se fermer — ils
restaient dans le document, invisibles, à avaler les clics. Un utilitaire
enregistré dans le thème n'est tout simplement pas émis quand son thème est
absent : la même erreur produit alors une absence d'animation et une fermeture
instantanée.
