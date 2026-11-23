# Introduction

Ce guide couvre les apps natives avec orbit :

- Installation
- Brancher une app
- Correspondances
- Limites
- Erreurs

Orbit rend les composants [aurora](/fr/guides/frontend/aurora/) en vues natives sur un
téléphone. Un composant écrit avec `html`, `component`, des signaux et des
classes Tailwind tourne sans changement sur Android : orbit garde un arbre de
nœuds natifs que les signaux d'aurora modifient, le transmet à un hôte Rust
(orbit-host) qui le met en page avec taffy, calcule les différences et confie
les opérations de montage aux vues de la plateforme. Gestes, animations et
valeurs pilotées par le défilement tournent sur le fil d'affichage : un fil JS
occupé ne fige pas l'écran.

React Native fournit le moteur JS (Hermes), le registre des modules et
l'activité ; React lui-même n'est pas utilisé.

![Le côté mobile. Sur le téléphone : votre composant aurora (le même que celui des pages web) tourne dans orbit sur le thread JS, où les signaux mettent à jour un arbre de nœuds natifs ; orbit-host, en Rust, le met en page avec taffy et calcule les différences ; les vues Android natives l'affichent, avec les gestes et les animations sur le thread UI. React Native fournit Hermes ; React n'est pas utilisé. Mises à jour à distance : ream android:publish regroupe le JS et le signe avec robledo.key ; votre serveur ream sert la mise à jour sur /__robledo ; le téléphone vérifie que la signature et le runtime natif correspondent ; une mise à jour qui plante avant son premier écran est annulée au lancement suivant.](/images/mobile-fr.webp){width=640 height=640 loading=lazy}

## Installation

```bash
pnpm add @c9up/orbit @c9up/aurora react-native
pnpm add -D tailwindcss @tailwindcss/cli @react-native-community/cli @react-native/metro-config
```

L'app est construite par `ream android:*` à partir du bloc `mobile` de
`reamrc.ts` — voir [Applications mobiles](/fr/guides/mobile/building#applications-mobiles)
dans la référence de la CLI.

## Brancher une app

```ts
// mobile/index.ts — mobile.entry dans reamrc.ts
import { run } from '@c9up/orbit/react-native'
import { App } from './App.js'

run(App)
```

```ts
// mobile/App.ts
import { component, html, signal } from '@c9up/aurora/core'

export const App = component(() => {
  const count = signal(0)
  return html`<div class="flex-1 items-center justify-center gap-4 bg-background">
    <p class="text-2xl font-semibold">${() => count()}</p>
    <button class="rounded-md bg-primary px-4 py-2 text-primary-foreground" @click=${() => count(count() + 1)}>
      Ajouter un
    </button>
  </div>`
})
```

`run` enregistre l'app sous le nom que l'activité générée démarre, donne à
orbit son hôte natif et la table de styles de l'app, branche le bouton retour
d'Android, puis monte le composant racine avec les props de lancement (les
extras de l'intent). Hors d'une app construite par ream, `useHost(host)` et
`mount(App(), { viewport })` font la même chose à la main.

## Correspondances

| Template | Natif |
|---|---|
| éléments bloc (`div`, `section`, `button`, …) | une vue |
| `p`, `h1`–`h6`, `label` | un texte |
| éléments en ligne (`span`, `strong`, `em`, …) | un passage dans le texte qui l'entoure |
| texte posé dans une vue | enveloppé dans un texte anonyme, comme le fait CSS |
| `class="…"` | le build Tailwind de l'app (voir Styles) ; les styles de texte se transmettent |
| un conteneur `flex` | chaque enfant est un élément ; `flex` est une ligne, comme sur le web |
| `overflow-y-auto` | une vue de défilement native autour d'une vue de contenu |
| `overflow-hidden` | enfants découpés à la boîte et à ses coins arrondis |
| `shadow-*` | une ombre portée, dessinée par le parent hors de la boîte (Android 8+) |
| `backdrop-blur-*` | ce qui est derrière la vue, flouté (Android 12+) |
| `@click`, `@longpress`, `@pan`, `@swipe` | des gestes reconnus nativement (voir Gestes) |
| `motion=${{ opacity, translateX, translateY, scale, visible }}` | animation sur le fil d'affichage (voir Animation) |
| `scroll-y=${value}` | le défilement alimente une `MotionValue` |
| `input`, `textarea` | le champ de texte de la plateforme : la saisie n'attend jamais le JS |
| `@input`, `@change`, `@focus`, `@blur`, Entrée en `@keydown` | les événements du champ, avec le texte dans `event.target.value` |
| `img` | une vue d'image, décodée hors du fil d'affichage à la taille affichée |
| `svg` | une vue vectorielle : chemins, formes simples et `g` (voir Dessins vectoriels) |
| `each(items, key, render)` | une ligne par clé : une ligne gardée garde ses vues et se déplace |
| `each(…, { lazy })` | seules les lignes dans la zone visible de la vue de défilement existent |

La racine se met en page dans la zone sûre : barre d'état, barre de navigation,
encoche et, quand il est ouvert, clavier.

## Limites

- Pas encore pris en charge : `select`, `canvas` ; dans un `svg`, `text`,
  `use`, dégradés et masques.
- Connus de la feuille mais sans effet : `:has()`, pseudo-classes de position
  (`first:`, `last:`), `::before` / `::after`, transformations, transitions,
  dégradés, `line-clamp` ; `grid` se pose en colonne ; une seule ombre est
  dessinée (la première visible) et les coins partagent un même rayon.
- L'accessibilité et iOS restent à venir.

## Erreurs

| Code | Cause |
|---|---|
| `E_ORBIT_NO_HOST` | `mount` a tourné avant que `useHost` donne à orbit un hôte natif, ou le module n'est pas celui d'orbit. |
| `E_ORBIT_COMMIT_FAILED` | L'hôte natif a refusé une transmission ; le message porte son rapport. |
| `E_ORBIT_UNSUPPORTED_ELEMENT` | Un élément sans correspondance native (`select`, `canvas`, ou `text` / un dégradé dans un `svg`). |
| `E_ORBIT_BLOCK_IN_TEXT` | Un élément bloc dans du texte : un texte natif ne contient que des passages en ligne. |
| `E_ORBIT_INVALID_MOTION` | `motion=${…}` n'était pas un objet de valeurs animées. |
| `E_ORBIT_INVALID_SCROLL_BINDING` | `scroll-y=${…}` n'était pas une valeur animée. |
| `E_ORBIT_INVALID_COLOR` | Une couleur qu'orbit ne sait pas lire. |
| `E_ORBIT_INSECURE_IMAGE_URL` | `<img src>` en http simple : les images ne se chargent qu'en https. |
| `E_ORBIT_IMAGE_SOURCE` | `<img src>` avec un schéma qui n'est pas une source d'image (`data:`, `javascript:`…). |
| `E_ORBIT_DUPLICATE_KEY` | Deux éléments d'une liste `each` partagent une clé. |
| `E_ORBIT_NO_SCREEN` | `useScreen()` dans un composant qu'aucun écran d'une pile n'a construit. |
| `E_ORBIT_STACK_SHOWN` | Une même pile placée à deux endroits : une pile s'affiche une fois. |
| `E_ORBIT_STYLE_TABLE` | `useStyles` a reçu autre chose qu'une table écrite par `ream css:compile`. |
| `E_ORBIT_INSECURE_SERVER` | `serverPages({ server })` en http simple vers un hôte qui n'est ni cette machine ni celui de l'émulateur. |
| `E_ORBIT_UNKNOWN_PAGE` | Le serveur a nommé une page absente des `pages` de l'app. |
