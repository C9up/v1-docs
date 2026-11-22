# Gestes et mouvement

Ce guide couvre les gestes et le mouvement :

- Gestes
- Animation

## Gestes

Chaque toucher passe par le reconnaisseur d'orbit-host avant toute vue : le
retour visuel d'un appui démarre même quand le fil JS est occupé, et le JS
reçoit le résultat dès qu'il peut.

- `@click` : sur le relâchement, si le doigt est resté à moins de 10 dp et que
  rien n'a pris le relais. Une ondulation, limitée à la boîte arrondie, part de
  l'endroit du doigt — tout de suite, ou après 100 ms dans une vue de
  défilement, pour qu'un défilement commencé sur une ligne ne la fasse pas
  clignoter.
- `@longpress` : après 500 ms d'appui ; le relâchement ne déclenche alors pas
  de clic.
- `@pan` : dès que le doigt dépasse le seuil, `{ phase, dx, dy, vx, vy }` (dp,
  dp/s) au `start`, à chaque `move`, puis `end` ou `cancel`.
- `@swipe` : un relâchement plus rapide que 500 dp/s, `{ direction, vx, vy }`.

## Animation

Une `MotionValue` — celle d'aurora, la même dans le navigateur (voir
[valeurs animées](/fr/guides/frontend/aurora/signals#valeurs-animees-—-motionvalue-motion-scroll-y)) —
vit dans l'hôte et s'anime sur le fil d'affichage : le JS déclare valeurs,
courbes et liaisons une fois, et un fil JS bloqué n'en arrête aucune.

```ts
import { MotionValue } from '@c9up/aurora/core'

const x = new MotionValue(0)
const fade = x.interpolate([0, 200], [1, 0.2])

html`<div motion=${{ translateX: x, opacity: fade }}>…</div>`

x.timing(200, { duration: 300 })               // interpolation adoucie
x.spring(0, { stiffness: 180, damping: 12 })   // ressort physique
x.set(40)                                      // immédiat
```

`scroll-y=${value}` alimente une valeur avec la position d'une vue de
défilement (un en-tête qui rétrécit quand la liste défile). `visible` cache
une vue à 0,5 ou moins : toujours mise en page, mais ni dessinée ni touchable —
contrairement à `opacity: 0`, dessinée transparente et qui reçoit les
touchers, comme sur le web. `dispose()` libère une valeur créée pour une vue
qui disparaît pour de bon.
