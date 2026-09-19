# Nebula — le jeu de composants

`@c9up/nebula` porte l'ensemble shadcn/ui sur [Aurora](/fr/modules/aurora), rangé en design atomique : même balisage, mêmes classes, même comportement, écrits pour un runtime sans étape de build.

Une nébuleuse est la matière d'où naissent les étoiles — celle-ci est la matière d'où naissent les interfaces. Soixante-neuf composants sur quatre couches, plus la couche de comportement sans habillage que Radix fournirait ailleurs.

::: warning Ne pas confondre
Le paquet cache s'est un temps appelé Nebula avant de devenir [Echo](/fr/modules/echo). Ce nom-là désigne aujourd'hui ce paquet-ci, et rien d'autre.
:::

## Installation

```sh
ream add @c9up/nebula --adapter tailwind
```

Le hook `configure()` écrit `config/nebula.ts` et la feuille de style du moteur choisi, puis affiche les paquets à installer et la commande de build à enregistrer. Il n'installe rien lui-même et ne modifie aucun de vos `package.json`.

Changer de moteur plus tard : `ream configure @c9up/nebula --adapter unocss`.

## Deux façons de s'en servir

```ts
// L'importer — le plus rapide pour essayer
import { Button, Card, CardHeader } from '@c9up/nebula'

// Ou en prendre la source — ce à quoi la bibliothèque sert vraiment
// $ ream nebula:add button card
import { Button } from '#pages/atoms/Button.js'
```

`ream nebula:add` copie la source du composant dans votre projet et vous la remet. Pas de version, pas de chemin de mise à jour, pas d'emballage contre lequel se battre quand une maquette demande une classe changée.

### La contrepartie : `ream nebula:diff`

La copie va dans un seul sens. Un correctif publié ici n'atteint jamais un projet
tout seul, et rien ne le signale — ni le lockfile, ni `pnpm update`, ni le
fichier lui-même.

```bash
ream nebula:diff        # quelles copies le paquet a modifiées depuis
```

Il répond avec la *raison* d'une différence. Une copie finit forcément par
diverger de l'amont — c'est ce que posséder la source veut dire — donc
« diffère » tout seul signalerait tout l'arbre et ne voudrait rien dire.
L'empreinte enregistrée au moment de la copie est ce qui sépare une
modification que vous avez faite d'une que vous n'avez pas vue.

Lancez-le à chaque montée de version du paquet. Un `primitives/presence.ts`
copié puis oublié sur plusieurs versions, c'est ainsi qu'un overlay garde un
comportement corrigé en amont : la copie est antérieure au délai borné qui
démonte une surface dont l'`animationend` n'arrive jamais, et les dialogues
fermés restent dans le document en fond plein écran invisible. Ce fichier
appartient à seize composants d'overlay, donc rien dans le symptôme ne le
désigne.

Le prix de cette promesse : un correctif publié ici n'atteint jamais un projet tout seul, et rien ne le signale — les fichiers sont locaux, aucun lockfile ne les mentionne, `pnpm update` n'y touche pas. C'est ce que `ream nebula:diff` rend visible. Il enregistre l'empreinte de ce qu'il a copié, ce qui lui permet de séparer un changement que vous avez fait d'un que vous n'avez pas vu :

| État | Ce que ça veut dire |
|---|---|
| `edited` | votre modification, rien à faire |
| `outdated` | le paquet a bougé, votre copie non — recopier ne perd rien |
| `conflict` | les deux ont bougé |
| `unknown` | copié avant que l'empreinte existe — impossible de dire quel côté a bougé |

```sh
ream nebula:list                    # tout le registre
ream nebula:list --layer organisms
ream nebula:add dialog data-table   # les deux, plus leurs dépendances
ream nebula:diff                    # les copies que le paquet a modifiées depuis
ream nebula:add button --force      # écrase votre copie modifiée
```

Ces commandes sont livrées par le paquet et enregistrées dans `reamrc.commands` par `configure()` — le canal prévu pour ça, que la découverte par répertoire ne peut pas voir. Rien n'est compilé dans le binaire `ream`, donc une nouvelle commande nebula n'attend pas une release de celui-ci.

**Du JavaScript par défaut.** Une application Aurora sert `resources/pages` au navigateur sans build — c'est la promesse du runtime — donc du TypeScript déposé dans cet arbre ne s'exécute pas. `ream nebula:add` copie la sortie compilée : de l'ESM valide, des spécificateurs `.js` déjà corrects, et tous les commentaires de doc intacts. Le langage est déduit de ce que contient déjà votre répertoire de composants ; `--ts` et `--js` forcent la main.

Les copies reprennent la disposition du paquet, si bien que `atoms/Button` trouve `../lib/cva.js` pour la même raison qu'à l'intérieur de nebula. **Aucun import n'est réécrit** — c'est là qu'un outil de copie-la-source accumule d'ordinaire ses cas particuliers.

## Aucune dépendance à l'exécution

shadcn s'appuie sur Radix, `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `@floating-ui/dom`, `cmdk`, `sonner`, `recharts`, `@tanstack/react-table` et `react-day-picker`. Aucun n'est agnostique du framework de rendu.

| Ce que shadcn installe | Ce que nebula fait |
|---|---|
| `clsx` + `tailwind-merge` | `cn`, déjà écrit à la main dans [Aurora](/fr/modules/aurora) |
| `class-variance-authority` | `lib/cva.ts`, réimplémenté, et il passe son résultat dans `cn` |
| Radix UI | `primitives/` — piège à focus, couches renvoyables, focus itinérant, saisie au clavier, présence, portails |
| `@floating-ui/dom` | `primitives/floating.ts` — décalage, retournement, glissement, flèche, hauteur disponible |
| `lucide-react` | `lib/icons.ts` — les dix-huit glyphes nécessaires, en ligne |
| `cmdk` | `organisms/Command.ts` |
| `sonner` | `organisms/Toaster.ts` |
| `react-day-picker` + `date-fns` | `organisms/Calendar.ts` — `Date` et `Intl` |
| `@tanstack/react-table` | `organisms/DataTable.ts` — tri, filtre, pagination, sélection |
| `recharts` | `organisms/Chart.ts` — courbe, aire et barres, en SVG en ligne |
| `react-hook-form` | `form()` d'Aurora, branché par `organisms/Form.ts` |

Plusieurs de ces reprises sont **plus étroites** que ce qu'elles remplacent. La liste exacte est plus bas, plutôt qu'un résumé rassurant.

**Les animations font exception, et c'est délibéré.** Les overlays utilisent les
chaînes de classes de shadcn elles-mêmes — `animate-in`, `fade-out-0`,
`zoom-in-95`, `slide-in-from-right` — qui viennent de `tw-animate-css` sous
Tailwind et de `unocss-preset-animations` sous UnoCSS. La feuille générée
l'importe, et `nebula init` le liste parmi les paquets à installer.

Les réimplémenter a été essayé, et c'est ce qui rendait une feuille manquante
dangereuse plutôt que simplement dépouillée : des keyframes maison atteintes par
une valeur d'animation arbitraire (`animate-[nebula-zoom-out_120ms]`) sont
compilées que les keyframes existent ou non, donc une application qui sautait la
feuille avait des overlays qui ne finissaient jamais de se fermer — ils
restaient dans le document, invisibles, à avaler les clics. Un utilitaire
enregistré dans le thème n'est tout simplement pas émis quand son thème est
absent : la même erreur produit alors une absence d'animation et une fermeture
instantanée.

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

La règle est la composition, pas la complexité. Slider est un atome bien qu'interactif, parce que c'est une entrée. Card est une molécule bien que triviale, parce qu'elle assemble des parties.

**atomes (19)** — AspectRatio, Avatar, Badge, Button, Checkbox, Input, Kbd, Label, Marker, NativeSelect, Progress, ScrollArea, Separator, Skeleton, Slider, Spinner, Switch, Textarea, Toggle

**molécules (21)** — Accordion, Alert, Attachment, Breadcrumb, Bubble, ButtonGroup, Card, Collapsible, Empty, Field, InputGroup, InputOTP, Item, Message, Pagination, RadioGroup, Resizable, Table, Tabs, ToggleGroup, Typography

**organismes (26)** — AlertDialog, Calendar, Carousel, Chart, Combobox, Command, CommandDialog, ContextMenu, DataTable, DatePicker, DateRangePicker, Dialog, Drawer, DropdownMenu, Form, HoverCard, Menubar, MessageScroller, NavigationMenu, Popover, Questionnaire, Select, Sheet, Sidebar, Toaster, Tooltip

**templates (3)** — AppShell, AuthLayout, SettingsLayout

## Composer sans contexte

Aurora n'a pas de contexte, et les contournements — une fabrique qui renvoie des parties liées, une poignée passée de props en props — font plus de machinerie pour moins de clarté. Les composants composés prennent donc **des données** :

```ts
Tabs({
  defaultValue: 'account',
  items: [
    { value: 'account', label: 'Compte', content: html`…` },
    { value: 'password', label: 'Mot de passe', content: html`…` },
  ],
})
```

Le balisage rendu est inchangé, donc le CSS de shadcn et ses exemples restent lisibles tels quels. Les conteneurs libres prennent des emplacements nommés :

```ts
Dialog({
  trigger: 'Modifier le profil',
  title: 'Modifier le profil',
  children: [TextField({ bind: bind(profile, 'name'), label: 'Nom' })],
  footer: SubmitButton({ form: profile, label: 'Enregistrer' }),
})
```

Il n'y a pas d'`asChild` : cette API clone un élément pour y fusionner des props, et un template Aurora est du balisage compilé, sans élément à cloner. Là où shadcn écrirait un bouton enveloppant un lien, nebula exporte les variantes :

```ts
html`<a href="/docs" class="${buttonVariants({ variant: 'outline' })}">Docs</a>`
```

## Props réactives

Aurora ne re-rend jamais. Toute prop susceptible de changer est `Reactive<T>` — passez une constante quand elle ne bouge pas, un accesseur quand elle bouge :

```ts
Button({ disabled: true })              // statique
Button({ disabled: () => !form.valid }) // suivi
```

## Images responsives

`Image` écrit les attributs qui rendent une `<img>` rapide, et que personne n'écrit à la main : un `srcset` d'une douzaine de largeurs, un `sizes` qui va avec, `width`/`height` pour que la page ne saute pas, et `loading`/`decoding`.

```ts
Image({ src: '/photos/hero.jpg', alt: "L'atelier à l'aube", width: 1200, height: 800 })
```

```html
<img src="/__image?src=%2Fphotos%2Fhero.jpg&w=1200&f=webp"
     srcset="/__image?src=…&w=640&f=webp 640w, … /__image?src=…&w=2400&f=webp 2400w"
     sizes="(min-width: 1200px) 1200px, 100vw"
     width="1200" height="800" loading="lazy" decoding="async"
     alt="L'atelier à l'aube" class="h-auto max-w-full">
```

`alt` est obligatoire dans le type, et ce n'est pas un geste de principe : une `<img>` sans `alt` est annoncée par un lecteur d'écran sous son nom de fichier. Une image décorative passe `alt: ''` — la chaîne vide est le balisage qui dit « ignore-moi », elle doit donc être écrite et non oubliée.

### Dispositions

`layout` est la seule prop à choisir délibérément. Elle décide des largeurs proposées et de ce que `sizes` en dit.

| Disposition | Comportement | Propose |
|---|---|---|
| `constrained` *(défaut)* | se réduit pour tenir, jamais au-delà de `width` | 1x, 2x, et les largeurs d'échelle intermédiaires |
| `full-width` | toujours la largeur de son conteneur | toute l'échelle d'appareils |
| `fixed` | la taille déclarée, quel que soit l'écran | 1x et 2x |
| `none` | ni `srcset` ni `sizes` | rien |

Toutes les largeurs proposées sortent d'une liste fixe — une petite échelle pour les éléments qui ne font pas la largeur d'un écran (avatars, icônes, vignettes) et une échelle d'appareils au-dessus. **La largeur déclarée n'est jamais émise telle quelle.** `width: 1200` demandant 1200 et 2400, ce serait deux largeurs qu'aucune liste blanche ne contient — et mettre sur liste blanche ce qu'un auteur tape au clavier n'est pas une liste blanche. On arrondit *vers le haut*, aux barreaux qui les couvrent — 1280 et 2560 — parce qu'arrondir vers le bas est la façon dont un écran dense reçoit moins de pixels qu'il ne peut en afficher.

Cette liste et le `widths` de [Prism](/fr/modules/prism) sont la même liste, et c'est la seule chose qui ne peut pas changer d'un seul côté. Une largeur que l'endpoint ne sert pas est une entrée de `srcset` qui répond 400, et une page qui retombe silencieusement sur son unique `src`.

L'échelle d'appareils est faite de vraies largeurs d'appareils, pas de nombres ronds — 828 est un iPhone XR, 1668 un iPad. C'est sa densité qui rend l'arrondi vers le haut peu coûteux : le barreau au-dessus de 2400 est 2560, six pour cent plus haut. `breakpoints` la remplace, et `LIMITED_RESOLUTIONS` est la même échelle sans les tailles que seul un écran de bureau réclame.

Passe `originalWidth` quand la largeur de la source est connue. Ce n'est qu'un raffinement : l'endpoint refuse d'agrandir quoi que ce soit, donc l'omettre coûte une URL en double servant les mêmes octets, jamais un agrandissement flou.

### Au-dessus de la ligne de flottaison

`priority` pose `loading="eager"`, `decoding="sync"` et `fetchpriority="high"` ensemble. N'en poser qu'un sur les trois est la raison habituelle pour laquelle une image de héros n'est toujours pas la première chose peinte.

```ts
Image({ src: '/photos/hero.jpg', alt: '…', layout: 'full-width', priority: true })
```

### Plusieurs formats

`Picture` propose la même image dans plusieurs formats et laisse le navigateur prendre le premier qu'il sait lire. C'est la seule façon sûre de livrer de l'AVIF, encore plus petit que le WebP et toujours pas universel :

```ts
Picture({ src: '/photos/hero.jpg', alt: '…', width: 1200, height: 800 })
```

```html
<picture>
  <source type="image/avif" srcset="…" sizes="…">
  <source type="image/webp" srcset="…" sizes="…">
  <img src="…" width="1200" height="800" loading="lazy" decoding="async" alt="…">
</picture>
```

L'ordre de `formats` est tout le contrat — un navigateur prend le premier `type` qu'il gère sans comparer les tailles, donc lister WebP avant AVIF signifie que personne ne reçoit jamais le fichier le plus petit. L'`<img>` en dessous est `Image` elle-même avec toutes les props transmises : une `<source>` ne peut donc pas finir par proposer une échelle différente de l'image qu'elle surmonte. Son format suit l'extension de la source, à défaut le JPEG : un PNG transparent aplati en JPEG arrive avec un fond noir, et précisément sur le chemin emprunté par les navigateurs qu'on vérifie le moins.

### D'où viennent les octets

Aucun des deux composants ne le sait. Ils demandent une URL à un résolveur, et celui par défaut pointe sur `/__image` — l'endpoint que [Prism](/fr/modules/prism) enregistre.

```ts
import { setImageResolver } from '@c9up/nebula'

setImageResolver((src, { width, format, quality }) =>
  `https://cdn.example.com/${src}?w=${width}&fm=${format}&q=${quality}`
)
```

Installe-le une fois au démarrage, depuis un module que le serveur et le navigateur exécutent tous les deux. Ils doivent être d'accord : un `src` qui diffère entre les deux fait jeter au navigateur l'image que le serveur avait déjà commencé à charger, pour en demander une autre.

On demande à un résolveur une largeur, un format et une qualité, jamais une hauteur ni un recadrage. Ce sont les deux axes qu'un endpoint ne peut pas borner, et aucun n'est nécessaire — `fit` et `position` sont `object-fit` et `object-position`, appliqués en CSS sur l'élément, où un recadrage ne coûte rien.

## De droite à gauche

Le moteur de placement se reflète tout seul. Les placements s'écrivent physiquement — `"right-start"` pour un sous-menu — parce que c'est ce qui se lit clairement à l'appel, et `resolvePosition` les retourne quand l'ancre calcule `direction: rtl`. `autoPosition` le relit à chaque mise à jour, donc aucun composant ne passe de drapeau et un changement de langue en cours de session déplace les surfaces ouvertes avec lui.

Le miroir n'est pas symétrique, et c'est la part qu'il faut connaître : pour `left`/`right` c'est le **côté** qui permute et l'alignement ne bouge pas ; pour `top`/`bottom` le côté reste et c'est l'**alignement** qui permute. Refléter les deux moitiés de `bottom-start` le ramènerait à son point de départ.

Les composants utilisent les propriétés logiques (`ms-*`, `me-*`, `start-*`, `end-*`) partout où un côté s'entend relativement au texte. Là où un côté est un vrai choix de mise en page — par quel bord un `Sheet` entre, quel côté un `Sidebar` occupe — il reste physique, parce que c'est ce que le code appelant veut dire.

## Ce qui est plus étroit que shadcn

Chaque composant du registre de shadcn a une contrepartie ici, et la quarantaine de composants simples sont fidèles jusqu'aux chaînes de classes, aux variantes et aux attributs ARIA. Ceux que shadcn construit en enveloppant une bibliothèque tierce sont des réimplémentations, donc plus étroites. Dit franchement, parce que « portage complet » serait faux :

| Composant | shadcn | nebula |
|---|---|---|
| Chart | Recharts, en entier | courbe, aire et barres sur un axe catégoriel |
| DataTable | TanStack Table (groupes de colonnes, virtualisation, épinglage, filtres à facettes, côté serveur) | tri, filtre, pagination, sélection — en mémoire |
| Sidebar | ~15 parties | les parties qui ne sont pas des atomes re-habillés |
| Carousel | embla (boucle, défilement auto, N vues) | scroll-snap, une vue, ni boucle ni défilement auto |
| Toaster | sonner (toasts sur promesse, contenu arbitraire, positions multiples) | quatre variantes, action, pause au survol |
| Resizable | imbrication libre, dispositions persistées, repli à zéro | deux volets, une poignée |
| Combobox | simple, multi-sélection et création | sélection simple |
| ScrollArea | barres redessinées par Radix | barres natives, stylées |
| Calendar | react-day-picker, tous les modes | date simple et intervalle ; ni multi-mois ni multi-sélection |
| Questionnaire | logique de branchement, schémas de validation | étapes linéaires ; simple, multiple, libre, sautable |

Deux entrées de shadcn n'ont volontairement pas de contrepartie directe. `DirectionProvider` est du contexte React ; Aurora n'en a pas, et la direction appartient à `<html dir>` — ce qu'il achetait vraiment, c'est le support de droite à gauche, traité dans le moteur de placement. `Form` a été fondu dans `Field` en amont ; nebula livre les deux, `Form` branchant le contrôleur de formulaires d'Aurora.

**Le Sidebar mérite sa note**, parce que le porter partie par partie aurait combattu la taxonomie atomique au lieu de la suivre. `SidebarInput`, `SidebarSeparator` et `SidebarMenuSkeleton` sont les atomes `Input`, `Separator` et `Skeleton` avec un préfixe — les redéclarer casserait la règle de composition sur laquelle toute la bibliothèque est rangée. `SidebarProvider` est du contexte React, et le sidebar de nebula possède son propre signal partagé. `SidebarInset` est la colonne de contenu à côté du rail, c'est-à-dire `AppShell`, un template. Ce qui manquait vraiment et a été ajouté : `SidebarMenuSub`, `SidebarMenuSubItem`, `SidebarMenuAction`, un emplacement de badge, et les infobulles quand le rail est replié.

Un moteur CSS au modèle d'écriture différent — les recettes de Panda, StyleX — ne peut pas passer derrière cette interface : il demanderait une seconde version de chaque composant.
